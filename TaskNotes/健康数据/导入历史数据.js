const HEALTH_DATA_PATH = 'TaskNotes/健康数据';

async function ensureHealthFolder() {
  const folder = app.vault.getAbstractFileByPath(HEALTH_DATA_PATH);
  if (!folder) {
    await app.vault.createFolder(HEALTH_DATA_PATH);
  }
}

function parseDurationHours(str) {
  if (!str || str === '-') return 0;
  const hoursMatch = str.match(/(\d+)小时/);
  const minsMatch = str.match(/(\d+)分钟/);
  let hours = hoursMatch ? parseFloat(hoursMatch[1]) : 0;
  let mins = minsMatch ? parseFloat(minsMatch[1]) : 0;
  return hours + mins / 60;
}

function parseDurationMinutes(str) {
  if (!str || str === '-') return 0;
  const hoursMatch = str.match(/(\d+)小时/);
  const minsMatch = str.match(/(\d+)分钟/);
  let hours = hoursMatch ? parseFloat(hoursMatch[1]) : 0;
  let mins = minsMatch ? parseFloat(minsMatch[1]) : 0;
  return hours * 60 + mins;
}

async function readHealthFile(date) {
  const filePath = `${HEALTH_DATA_PATH}/${date}.md`;
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!file) return null;
  
  const content = await app.vault.read(file);
  try {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const yaml = frontmatterMatch[1];
      const data = {};
      yaml.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          let value = valueParts.join(':').trim();
          if (value.startsWith('[') || value.startsWith('{')) {
            try { value = JSON.parse(value); } catch(e) {}
          } else if (!isNaN(value) && value !== '') {
            value = parseFloat(value);
          }
          data[key.trim()] = value;
        }
      });
      return data;
    }
  } catch(e) {}
  return null;
}

async function writeHealthFile(date, data) {
  await ensureHealthFolder();
  const filePath = `${HEALTH_DATA_PATH}/${date}.md`;
  const file = app.vault.getAbstractFileByPath(filePath);
  
  let yamlContent = `date: ${date}\n`;
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'object') {
      yamlContent += `${key}: ${JSON.stringify(value)}\n`;
    } else {
      yamlContent += `${key}: ${value}\n`;
    }
  });
  
  const fileContent = `---
${yamlContent}---

# 📅 ${date} 健康记录

## 数据详情

- 睡眠时长：${data.sleepDuration ? data.sleepDuration.toFixed(1) : '--'} 小时
- 睡眠质量：${data.sleepQuality || '--'}
- 喝水杯数：${data.waterCount || 0}
- 今日心情：${data.mood || '--'}
- 当前体重：${data.weight || '--'} kg

## 运动记录

${data.exercises && data.exercises.length > 0 ? 
  data.exercises.map(e => `- ${e.type}: ${e.duration}分钟，消耗${e.calories}千卡`).join('\n') : 
  '暂无运动记录'}

## 饮食记录

${data.meals && data.meals.length > 0 ? 
  data.meals.map(m => `- ${m.mealType}: ${m.content}（${m.calories}千卡）`).join('\n') : 
  '暂无饮食记录'}

## 健康习惯

${data.habits && data.habits.length > 0 ? 
  data.habits.map(h => `- [${h.completed ? 'x' : ' '}] ${h.name}`).join('\n') : 
  '暂无习惯打卡'}
`;

  if (file) {
    await app.vault.modify(file, fileContent);
  } else {
    await app.vault.create(filePath, fileContent);
  }
}

async function importSleepData() {
  const sleepFile = app.vault.getAbstractFileByPath('TaskNotes/健康数据/睡眠数据汇总.md');
  if (!sleepFile) {
    console.log('睡眠数据汇总文件不存在');
    return;
  }
  
  const content = await app.vault.read(sleepFile);
  const lines = content.split('\n');
  
  let inTable = false;
  const sleepRecords = {};
  
  for (const line of lines) {
    if (line.includes('| 日期 |')) {
      inTable = true;
      continue;
    }
    if (!inTable || !line.startsWith('|')) continue;
    
    const parts = line.split('|').map(p => p.trim()).filter(p => p);
    if (parts.length < 12) continue;
    
    const date = parts[0];
    const sleepDuration = parseDurationHours(parts[3]);
    const deepSleep = parseDurationHours(parts[4]);
    const shallowSleep = parseDurationHours(parts[5]);
    const remSleep = parseDurationHours(parts[6]);
    const awake = parseDurationHours(parts[7]);
    const efficiency = parts[8].replace('%', '');
    const avgHeartRate = parts[9] === '-' ? null : parseFloat(parts[9]);
    const avgSpO2 = parts[10];
    const awakenings = parts[11] === '-' ? null : parseInt(parts[11]);
    
    if (!sleepRecords[date]) {
      sleepRecords[date] = {
        totalDuration: 0,
        records: []
      };
    }
    
    sleepRecords[date].totalDuration += sleepDuration;
    sleepRecords[date].records.push({
      bedtime: parts[1],
      wakeTime: parts[2],
      duration: sleepDuration,
      deepSleep,
      shallowSleep,
      remSleep,
      awake,
      efficiency,
      avgHeartRate,
      avgSpO2,
      awakenings
    });
  }
  
  let count = 0;
  for (const [date, data] of Object.entries(sleepRecords)) {
    if (data.totalDuration < 0.5) continue;
    
    const existingData = await readHealthFile(date) || {};
    
    if (existingData.sleepDuration && existingData.sleepDuration >= data.totalDuration) {
      continue;
    }
    
    existingData.date = date;
    existingData.sleepDuration = parseFloat(data.totalDuration.toFixed(1));
    
    const mainRecord = data.records.reduce((prev, curr) => curr.duration > prev.duration ? curr : curr);
    if (mainRecord.efficiency && mainRecord.efficiency !== '-') {
      const eff = parseInt(mainRecord.efficiency);
      if (eff >= 95) existingData.sleepQuality = 5;
      else if (eff >= 90) existingData.sleepQuality = 4;
      else if (eff >= 85) existingData.sleepQuality = 3;
      else if (eff >= 80) existingData.sleepQuality = 2;
      else existingData.sleepQuality = 1;
    }
    
    if (mainRecord.avgHeartRate) existingData.sleepAvgHeartRate = mainRecord.avgHeartRate;
    if (mainRecord.avgSpO2) existingData.sleepAvgSpO2 = mainRecord.avgSpO2;
    if (mainRecord.awakenings) existingData.sleepAwakenings = mainRecord.awakenings;
    
    await writeHealthFile(date, existingData);
    count++;
  }
  
  console.log(`导入睡眠数据完成，共 ${count} 条记录`);
  return count;
}

async function importExerciseData() {
  const exerciseFile = app.vault.getAbstractFileByPath('TaskNotes/健康数据/运动数据汇总.md');
  if (!exerciseFile) {
    console.log('运动数据汇总文件不存在');
    return;
  }
  
  const content = await app.vault.read(exerciseFile);
  const lines = content.split('\n');
  
  let currentType = '';
  let inTable = false;
  const exerciseRecords = {};
  
  for (const line of lines) {
    if (line.startsWith('## ')) {
      currentType = line.replace('## ', '').trim();
      inTable = false;
      continue;
    }
    
    if (line.includes('| 日期 |')) {
      inTable = true;
      continue;
    }
    
    if (!inTable || !line.startsWith('|')) continue;
    
    const parts = line.split('|').map(p => p.trim()).filter(p => p);
    if (parts.length < 8) continue;
    
    const date = parts[0];
    const duration = parseDurationMinutes(parts[2]);
    const calories = parseInt(parts[3]) || 0;
    const distance = parts[4];
    const avgHeartRate = parts[5] === '-' ? null : parseInt(parts[5]);
    const maxHeartRate = parts[6] === '-' ? null : parseInt(parts[6]);
    const load = parts[7] === '-' ? null : parseInt(parts[7]);
    
    if (!exerciseRecords[date]) {
      exerciseRecords[date] = [];
    }
    
    exerciseRecords[date].push({
      type: currentType,
      duration,
      calories,
      distance,
      avgHeartRate,
      maxHeartRate,
      load,
      timestamp: Date.now()
    });
  }
  
  let count = 0;
  for (const [date, exercises] of Object.entries(exerciseRecords)) {
    const existingData = await readHealthFile(date) || {};
    existingData.date = date;
    existingData.exercises = existingData.exercises || [];
    
    for (const exercise of exercises) {
      const exists = existingData.exercises.some(e => 
        e.type === exercise.type && 
        e.duration === exercise.duration && 
        e.calories === exercise.calories
      );
      
      if (!exists) {
        existingData.exercises.push(exercise);
        count++;
      }
    }
    
    await writeHealthFile(date, existingData);
  }
  
  console.log(`导入运动数据完成，共 ${count} 条记录`);
  return count;
}

async function main() {
  console.log('开始导入历史健康数据...');
  
  await ensureHealthFolder();
  
  const sleepCount = await importSleepData();
  const exerciseCount = await importExerciseData();
  
  console.log(`导入完成！睡眠数据：${sleepCount} 条，运动数据：${exerciseCount} 条`);
  
  new Notice(`导入完成！睡眠数据：${sleepCount} 条，运动数据：${exerciseCount} 条`);
  
  if (window.__health && window.__health._ready) {
    location.reload();
  }
}

main().catch(e => {
  console.error('导入失败:', e);
  new Notice(`导入失败：${e.message}`);
});