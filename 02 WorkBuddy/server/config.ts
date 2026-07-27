/**
 * WorkBuddy 配置文件
 *
 * 所有文件读写路径均与 Obsidian 主页保持一致
 */

import * as path from "path";

// Obsidian Vault 根目录（兼容 Obsidian 主页的文件位置逻辑）
// process.cwd() 通常为 02 WorkBuddy/ 目录，上一级即为 Vault 根目录
const VAULT_PATH = process.env.VAULT_PATH || path.resolve(process.cwd(), "..");

/** 路径常量 —— 与 Obsidian 01 主页/ 中的配置保持一致 */
export const PATHS = {
  /** Obsidian Vault 根目录 */
  vault: VAULT_PATH,

  // === 主页目录 ===
  /** 主页文件夹 */
  home: path.join(VAULT_PATH, "01 主页"),

  // === 数据写入路径（与 Obsidian 文件一致） ===
  /** 健康数据: TaskNotes/健康数据/YYYY-MM-DD.md */
  health: (date: string) => path.join(VAULT_PATH, "TaskNotes", "健康数据", `${date}.md`),
  /** 健康数据目录 */
  healthDir: path.join(VAULT_PATH, "TaskNotes", "健康数据"),
  /** 健康目标: TaskNotes/健康数据/健康目标.md */
  healthGoals: path.join(VAULT_PATH, "TaskNotes", "健康数据", "健康目标.md"),

  /** 心情数据: TaskNotes/心情/YYYY-MM-DD.md */
  mood: (date: string) => path.join(VAULT_PATH, "TaskNotes", "心情", `${date}.md`),
  /** 心情数据目录 */
  moodDir: path.join(VAULT_PATH, "TaskNotes", "心情"),

  /** 任务目录 */
  taskDir: path.join(VAULT_PATH, "TaskNotes", "01 task"),
  /** CPA 任务: TaskNotes/01 task/注册会计师.md */
  cpaTasks: path.join(VAULT_PATH, "TaskNotes", "01 task", "注册会计师.md"),

  // === 收件箱 ===
  /** 收件箱 */
  inbox: path.join(VAULT_PATH, "00 Inbox"),

  // === 成长学习 ===
  /** 成长目录 */
  growth: path.join(VAULT_PATH, "04成长"),

  // === Life OS ===
  /** Life OS 目录 */
  lifeOs: path.join(VAULT_PATH, "03Life os"),

  // === 数据库 ===
  /** 数据库目录 */
  database: path.join(VAULT_PATH, "08数据库"),

  // === 模板 ===
  /** 模板目录 */
  templates: path.join(VAULT_PATH, "Templates"),

  // === WorkBuddy 自身 ===
  /** WorkBuddy 工作目录 */
  workbuddy: path.join(VAULT_PATH, "02 WorkBuddy"),
};

/** 服务器配置 */
export const SERVER_CONFIG = {
  port: parseInt(process.env.PORT || "3001"),
  host: process.env.HOST || "localhost",
};

/** AI Agent 配置 */
export const AGENT_CONFIG = {
  model: process.env.MODEL || "claude-sonnet-4",
  maxTurns: parseInt(process.env.MAX_TURNS || "15"),
  vaultPath: VAULT_PATH,
};

/** 系统提示词 —— 与 01 主页/主页2.md 中的定位一致 */
export const SYSTEM_PROMPT = `你是 WorkBuddy 个人工作台的智能助手，运行在 CodeBuddy 环境中。

你的核心能力：
1. 📊 **仪表盘数据管理** —— 读取和更新个人仪表盘数据（健康、心情、任务、学习进度）
2. 📝 **文件读写** —— 按照 Obsidian Vault 的文件组织结构读写 Markdown 文件
3. 🔍 **知识检索** —— 搜索和检索 Vault 中的笔记、知识和数据库
4. 📋 **任务管理** —— 创建、更新和追踪任务进度
5. 🏥 **健康追踪** —— 记录和分析健康数据（睡眠、运动、饮水、饮食、体重）
6. 💭 **心情日记** —— 帮助用户记录每日心情和反思
7. 📚 **学习助手** —— CPA 备考进度追踪、学习笔记管理

文件写入位置（与 Obsidian 主页完全一致）：
- 健康数据 → TaskNotes/健康数据/YYYY-MM-DD.md
- 心情日记 → TaskNotes/心情/YYYY-MM-DD.md  
- 任务管理 → TaskNotes/01 task/
- 新建笔记 → 00 Inbox/ 或 04成长/
- 播客笔记 → 03Life os/播客生活/

工作方式：
- 所有文件读写操作使用绝对路径，基于 Vault 根目录
- Markdown 文件支持 YAML frontmatter
- 数据文件使用标准 Markdown 格式，与 Obsidian 完全兼容
- 回复简洁实用，聚焦于帮用户完成任务

现在，有什么我可以帮你的？`;
