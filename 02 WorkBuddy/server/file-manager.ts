/**
 * 文件管理器 —— 所有文件读写操作与 Obsidian 主页保持一致
 *
 * 核心原则：
 * 1. 所有路径基于 Vault 根目录
 * 2. Markdown 文件支持 YAML frontmatter
 * 3. 数据文件格式与 Obsidian 完全兼容
 */

import * as fs from "fs/promises";
import * as path from "path";
import { PATHS } from "./config.js";
import type { HealthEntry, MoodEntry, TaskEntry, FileResult, DashboardStats } from "./types.js";

// ==================== 通用文件操作 ====================

/** 确保目录存在 */
async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/** 读取文件内容 */
async function readFile(filePath: string): Promise<FileResult> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return { success: true, path: filePath, content };
  } catch (error: any) {
    return { success: false, path: filePath, error: error.message };
  }
}

/** 写入文件内容 */
async function writeFile(filePath: string, content: string): Promise<FileResult> {
  try {
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, "utf-8");
    return { success: true, path: filePath, content };
  } catch (error: any) {
    return { success: false, path: filePath, error: error.message };
  }
}

/** 列出目录文件 */
async function listDir(dirPath: string): Promise<FileResult & { files?: string[] }> {
  try {
    const files = await fs.readdir(dirPath);
    return { success: true, path: dirPath, files };
  } catch (error: any) {
    return { success: false, path: dirPath, error: error.message };
  }
}

/** 搜索 Vault 中的 Markdown 文件 */
async function searchFiles(pattern: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
          await walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name.includes(pattern)) {
          results.push(fullPath);
        }
      }
    } catch {
      // 跳过无法访问的目录
    }
  }

  await walk(PATHS.vault);
  return results;
}

// ==================== 健康数据操作（与 Obsidian 主页一致） ====================

/** 读取某天健康数据 (TaskNotes/健康数据/YYYY-MM-DD.md) */
async function readHealthEntry(date: string): Promise<HealthEntry | null> {
  const filePath = PATHS.health(date);
  const result = await readFile(filePath);
  if (!result.success || !result.content) return null;

  return parseHealthMarkdown(result.content, date);
}

/** 写入健康数据 */
async function writeHealthEntry(entry: HealthEntry): Promise<FileResult> {
  const filePath = PATHS.health(entry.date);
  const content = formatHealthMarkdown(entry);
  return writeFile(filePath, content);
}

/** 获取健康数据统计（近7天） */
async function getHealthStats(days: number = 7): Promise<{
  sleepAvg: number;
  exerciseAvg: number;
  waterAvg: number;
  entries: HealthEntry[];
}> {
  const entries: HealthEntry[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const entry = await readHealthEntry(dateStr);
    if (entry) entries.push(entry);
  }

  const sum = (key: keyof HealthEntry) =>
    entries.reduce((acc, e) => acc + (typeof e[key] === "number" ? (e[key] as number) : 0), 0);

  return {
    sleepAvg: entries.length > 0 ? Math.round((sum("sleep") / entries.length) * 10) / 10 : 0,
    exerciseAvg: entries.length > 0 ? Math.round(sum("exerciseDuration") / entries.length) : 0,
    waterAvg: entries.length > 0 ? Math.round(sum("water") / entries.length) : 0,
    entries,
  };
}

// ==================== 心情数据操作 ====================

/** 读取某天心情 (TaskNotes/心情/YYYY-MM-DD.md) */
async function readMoodEntry(date: string): Promise<MoodEntry | null> {
  const filePath = PATHS.mood(date);
  const result = await readFile(filePath);
  if (!result.success || !result.content) return null;

  return parseMoodMarkdown(result.content, date);
}

/** 写入心情数据 */
async function writeMoodEntry(entry: MoodEntry): Promise<FileResult> {
  const filePath = PATHS.mood(entry.date);
  const content = formatMoodMarkdown(entry);
  return writeFile(filePath, content);
}

// ==================== 仪表盘统计 ====================

/** 获取仪表盘统计数据 */
async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date().toISOString().split("T")[0];
  const healthStats = await getHealthStats(1);
  const todayEntry = healthStats.entries[0];

  // 统计今日笔记数量
  const todayDir = await listDir(PATHS.inbox);
  const taskDir = await listDir(PATHS.taskDir);
  const todayNotes = (todayDir.files?.length || 0) + (taskDir.files?.length || 0);

  // 统计最近心情
  const mood = await readMoodEntry(today);

  return {
    todayNotes,
    totalWords: 0, // 需要逐文件统计
    completedTasks: 0,
    totalTasks: 0,
    sleepAvg: todayEntry?.sleep || 0,
    exerciseMinutes: todayEntry?.exerciseDuration || 0,
    waterCups: todayEntry?.water || 0,
    moodAvg: mood?.mood || 0,
    lastUpdated: new Date().toISOString(),
  };
}

// ==================== Markdown 格式化 ====================

function formatHealthMarkdown(entry: HealthEntry): string {
  return `---
date: ${entry.date}
type: 健康数据
sleep: ${entry.sleep}
sleep_quality: ${entry.sleepQuality}
exercise: ${entry.exercise}
exercise_duration: ${entry.exerciseDuration}
water: ${entry.water}
weight: ${entry.weight}
breakfast: ${entry.breakfast}
lunch: ${entry.lunch}
dinner: ${entry.dinner}
---

# 🏥 健康记录 - ${entry.date}

## 😴 睡眠
- **时长**: ${entry.sleep} 小时
- **质量**: ${"★".repeat(entry.sleepQuality)}${"☆".repeat(5 - entry.sleepQuality)}

## 🏃 运动
- **类型**: ${entry.exercise || "未记录"}
- **时长**: ${entry.exerciseDuration} 分钟

## 💧 饮水
- **杯数**: ${entry.water} 杯

## 🍽️ 饮食
- **早餐**: ${entry.breakfast || "未记录"}
- **午餐**: ${entry.lunch || "未记录"}
- **晚餐**: ${entry.dinner || "未记录"}
- **零食**: ${entry.snacks || "无"}

## ⚖️ 体重
- **今日**: ${entry.weight} kg

## 📝 备注
${entry.notes || "无"}
`;
}

function parseHealthMarkdown(content: string, date: string): HealthEntry {
  // 简单解析 frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const fm: Record<string, string> = {};
  if (fmMatch) {
    fmMatch[1].split("\n").forEach((line) => {
      const [key, ...rest] = line.split(":");
      if (key && rest.length > 0) {
        fm[key.trim()] = rest.join(":").trim();
      }
    });
  }

  return {
    date,
    sleep: parseFloat(fm.sleep || "0"),
    sleepQuality: parseInt(fm.sleep_quality || "0"),
    exercise: fm.exercise || "",
    exerciseDuration: parseInt(fm.exercise_duration || "0"),
    water: parseInt(fm.water || "0"),
    breakfast: fm.breakfast || "",
    lunch: fm.lunch || "",
    dinner: fm.dinner || "",
    snacks: "",
    weight: parseFloat(fm.weight || "0"),
    notes: "",
  };
}

function formatMoodMarkdown(entry: MoodEntry): string {
  const moodEmojis = ["😢", "😔", "😐", "🙂", "😄"];
  return `---
date: ${entry.date}
type: 心情日记
mood: ${entry.mood}
tags:
${entry.tags.map((t) => `  - ${t}`).join("\n")}
---

# 💭 心情日记 - ${entry.date}

## 心情指数
${moodEmojis[entry.mood - 1] || "😐"} **${entry.mood}/5**

## 今日感受
${entry.content || "今天什么都没写..."}

## 🌟 感恩日记
${entry.gratitude?.map((g) => `- ${g}`).join("\n") || "- 无"}
`;
}

function parseMoodMarkdown(content: string, date: string): MoodEntry {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const fm: Record<string, string> = {};
  if (fmMatch) {
    fmMatch[1].split("\n").forEach((line) => {
      const [key, ...rest] = line.split(":");
      if (key && rest.length > 0) {
        fm[key.trim()] = rest.join(":").trim();
      }
    });
  }

  const contentMatch = content.match(/## 今日感受\n([\s\S]*?)(?:\n##|$)/);
  const gratitudeMatch = content.match(/## 🌟 感恩日记\n([\s\S]*?)$/);

  return {
    date,
    mood: parseInt(fm.mood || "3"),
    tags: fm.tags ? fm.tags.split(",").map((t) => t.trim()) : [],
    content: contentMatch?.[1]?.trim() || "",
    gratitude:
      gratitudeMatch?.[1]
        ?.split("\n")
        .filter((l) => l.startsWith("-"))
        .map((l) => l.replace(/^-\s*/, "").trim()) || [],
  };
}

// ==================== 导出 ====================

export const fileManager = {
  // 通用
  readFile,
  writeFile,
  listDir,
  searchFiles,
  ensureDir,
  // 健康数据
  readHealthEntry,
  writeHealthEntry,
  getHealthStats,
  // 心情数据
  readMoodEntry,
  writeMoodEntry,
  // 仪表盘
  getDashboardStats,
};
