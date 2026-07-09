#!/usr/bin/env python3
import os
import re
import json
from datetime import datetime

HEALTH_DATA_PATH = '/Users/guochenfa/Nutstore Files/.symlinks/坚果云/mutiply/TaskNotes/健康数据'
SLEEP_FILE = os.path.join(HEALTH_DATA_PATH, '睡眠数据汇总.md')
EXERCISE_FILE = os.path.join(HEALTH_DATA_PATH, '运动数据汇总.md')

def parse_duration_hours(text):
    if not text or text == '-':
        return 0.0
    hours_match = re.search(r'(\d+)小时', text)
    mins_match = re.search(r'(\d+)分钟', text)
    hours = float(hours_match.group(1)) if hours_match else 0.0
    mins = float(mins_match.group(1)) if mins_match else 0.0
    return round(hours + mins / 60, 1)

def parse_duration_minutes(text):
    if not text or text == '-':
        return 0
    hours_match = re.search(r'(\d+)小时', text)
    mins_match = re.search(r'(\d+)分钟', text)
    hours = int(hours_match.group(1)) if hours_match else 0
    mins = int(mins_match.group(1)) if mins_match else 0
    return hours * 60 + mins

def parse_efficiency_to_quality(efficiency):
    if not efficiency or efficiency == '-' or efficiency == '-%':
        return None
    eff = int(efficiency.replace('%', ''))
    if eff >= 95:
        return 5
    elif eff >= 90:
        return 4
    elif eff >= 85:
        return 3
    elif eff >= 80:
        return 2
    else:
        return 1

def read_existing_health_file(date):
    file_path = os.path.join(HEALTH_DATA_PATH, f'{date}.md')
    if not os.path.exists(file_path):
        return {}
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    frontmatter_match = re.match(r'^---\n([\s\S]*?)\n---', content)
    if not frontmatter_match:
        return {}
    
    yaml = frontmatter_match.group(1)
    data = {}
    for line in yaml.split('\n'):
        if ':' not in line:
            continue
        key, value = line.split(':', 1)
        key = key.strip()
        value = value.strip()
        if not key:
            continue
        
        if value.startswith('[') or value.startswith('{'):
            try:
                data[key] = json.loads(value)
            except:
                data[key] = value
        elif value.isdigit():
            data[key] = int(value)
        elif value.replace('.', '').isdigit():
            data[key] = float(value)
        elif value.lower() == 'true':
            data[key] = True
        elif value.lower() == 'false':
            data[key] = False
        else:
            data[key] = value
    
    return data

def write_health_file(date, data):
    file_path = os.path.join(HEALTH_DATA_PATH, f'{date}.md')
    
    yaml_lines = [f'date: {date}']
    for key, value in sorted(data.items()):
        if key == 'date':
            continue
        if isinstance(value, (dict, list)):
            yaml_lines.append(f'{key}: {json.dumps(value, ensure_ascii=False)}')
        else:
            yaml_lines.append(f'{key}: {value}')
    
    yaml_content = '\n'.join(yaml_lines)
    
    sleep_duration = data.get('sleepDuration')
    sleep_quality = data.get('sleepQuality')
    water_count = data.get('waterCount', 0)
    mood = data.get('mood')
    weight = data.get('weight')
    
    exercises = data.get('exercises', [])
    exercise_lines = []
    for e in exercises:
        exercise_lines.append(f'- {e["type"]}: {e["duration"]}分钟，消耗{e["calories"]}千卡')
    
    meals = data.get('meals', [])
    meal_lines = []
    for m in meals:
        meal_lines.append(f'- {m["mealType"]}: {m["content"]}（{m["calories"]}千卡）')
    
    habits = data.get('habits', [])
    habit_lines = []
    for h in habits:
        checked = 'x' if h.get('completed') else ' '
        habit_lines.append(f'- [{checked}] {h["name"]}')
    
    file_content = f'''---
{yaml_content}
---

# 📅 {date} 健康记录

## 数据详情

- 睡眠时长：{sleep_duration if sleep_duration else '--'} 小时
- 睡眠质量：{sleep_quality if sleep_quality else '--'}
- 喝水杯数：{water_count}
- 今日心情：{mood if mood else '--'}
- 当前体重：{weight if weight else '--'} kg

## 运动记录

{chr(10).join(exercise_lines) if exercise_lines else '暂无运动记录'}

## 饮食记录

{chr(10).join(meal_lines) if meal_lines else '暂无饮食记录'}

## 健康习惯

{chr(10).join(habit_lines) if habit_lines else '暂无习惯打卡'}
'''
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(file_content)

def import_sleep_data():
    if not os.path.exists(SLEEP_FILE):
        print(f'[INFO] 未找到睡眠数据文件: {SLEEP_FILE}')
        return 0, 0, 0
    
    with open(SLEEP_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    in_table = False
    sleep_records = {}
    
    for line in lines:
        line = line.strip()
        if line.startswith('| 日期 |'):
            in_table = True
            continue
        if not in_table or not line.startswith('|'):
            continue
        
        parts = [p.strip() for p in line.split('|') if p.strip()]
        if len(parts) < 12:
            continue
        
        date = parts[0]
        sleep_duration = parse_duration_hours(parts[3])
        efficiency = parts[8]
        
        if date not in sleep_records:
            sleep_records[date] = {
                'total_duration': 0.0,
                'records': []
            }
        
        sleep_records[date]['total_duration'] += sleep_duration
        sleep_records[date]['records'].append({
            'efficiency': efficiency
        })
    
    created = 0
    updated = 0
    skipped = 0
    
    for date, data in sleep_records.items():
        if data['total_duration'] < 0.5:
            continue
        
        existing_data = read_existing_health_file(date)
        
        if existing_data.get('sleepDuration') is not None:
            if existing_data['sleepDuration'] >= data['total_duration']:
                skipped += 1
                continue
            updated += 1
        else:
            created += 1
        
        existing_data['date'] = date
        existing_data['sleepDuration'] = data['total_duration']
        
        if data['records']:
            efficiency = data['records'][0]['efficiency']
            quality = parse_efficiency_to_quality(efficiency)
            if quality:
                existing_data['sleepQuality'] = quality
        
        write_health_file(date, existing_data)
    
    print(f'[睡眠数据] 导入完成：新增 {created} 条，更新 {updated} 条，跳过 {skipped} 条')
    return created, updated, skipped

def import_exercise_data():
    if not os.path.exists(EXERCISE_FILE):
        print(f'[INFO] 未找到运动数据文件: {EXERCISE_FILE}')
        return 0, 0, 0
    
    with open(EXERCISE_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    current_type = ''
    in_table = False
    exercise_records = {}
    
    for line in lines:
        line = line.strip()
        if line.startswith('## '):
            current_type = line.replace('## ', '').strip()
            in_table = False
            continue
        
        if line.startswith('| 日期 |'):
            in_table = True
            continue
        
        if not in_table or not line.startswith('|'):
            continue
        
        parts = [p.strip() for p in line.split('|') if p.strip()]
        if len(parts) < 8:
            continue
        
        date = parts[0]
        duration = parse_duration_minutes(parts[2])
        calories_str = parts[3].strip()
        calories = int(calories_str) if calories_str != '-' and calories_str.isdigit() else 0
        
        if date not in exercise_records:
            exercise_records[date] = []
        
        exercise_records[date].append({
            'type': current_type,
            'duration': duration,
            'calories': calories,
            'timestamp': 0
        })
    
    created = 0
    updated = 0
    skipped = 0
    
    for date, exercises in exercise_records.items():
        existing_data = read_existing_health_file(date)
        existing_data['date'] = date
        existing_data['exercises'] = existing_data.get('exercises', [])
        
        new_exercises = []
        for exercise in exercises:
            exists = False
            for e in existing_data['exercises']:
                if (e['type'] == exercise['type'] and
                    e['duration'] == exercise['duration'] and
                    e['calories'] == exercise['calories']):
                    exists = True
                    break
            
            if not exists:
                new_exercises.append(exercise)
        
        if new_exercises:
            existing_data['exercises'].extend(new_exercises)
            write_health_file(date, existing_data)
            if existing_data.get('exercises') and len(existing_data['exercises']) > len(new_exercises):
                updated += len(new_exercises)
            else:
                created += len(new_exercises)
        else:
            skipped += len(exercises)
    
    print(f'[运动数据] 导入完成：新增 {created} 条，更新 {updated} 条，跳过 {skipped} 条')
    return created, updated, skipped

def print_summary():
    files = [f for f in os.listdir(HEALTH_DATA_PATH) 
             if f.endswith('.md') and re.match(r'^\d{4}-\d{2}-\d{2}\.md$', f)]
    
    sleep_count = 0
    exercise_count = 0
    
    for f in files:
        date = f[:-3]
        data = read_existing_health_file(date)
        if data.get('sleepDuration'):
            sleep_count += 1
        if data.get('exercises'):
            exercise_count += len(data['exercises'])
    
    print(f'\n[数据汇总]')
    print(f'  健康数据文件数：{len(files)}')
    print(f'  有睡眠数据的天数：{sleep_count}')
    print(f'  运动记录总数：{exercise_count}')

def main():
    print(f'=' * 60)
    print(f'健康数据导入工具 v1.0')
    print(f'导入时间：{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print(f'数据目录：{HEALTH_DATA_PATH}')
    print(f'=' * 60)
    
    if not os.path.exists(HEALTH_DATA_PATH):
        os.makedirs(HEALTH_DATA_PATH)
        print(f'[INFO] 创建目录: {HEALTH_DATA_PATH}')
    
    sleep_created, sleep_updated, sleep_skipped = import_sleep_data()
    exercise_created, exercise_updated, exercise_skipped = import_exercise_data()
    
    print(f'=' * 60)
    print(f'[导入结果]')
    print(f'  睡眠数据：新增 {sleep_created}，更新 {sleep_updated}，跳过 {sleep_skipped}')
    print(f'  运动数据：新增 {exercise_created}，更新 {exercise_updated}，跳过 {exercise_skipped}')
    print(f'=' * 60)
    
    print_summary()
    
    print(f'\n提示：导入不会覆盖已有数据，只会添加新数据或更新更精确的睡眠时长')

if __name__ == '__main__':
    main()