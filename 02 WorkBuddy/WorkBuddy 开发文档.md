---
tags: [workbuddy, 开发文档, 技术架构]
created: "2025-07-27"
project: "WorkBuddy"
---

# 📘 WorkBuddy 开发文档

## 架构概述

WorkBuddy 采用前后端分离的单体架构：

```
┌─────────────────────────────────────────────┐
│                 Browser                     │
│         client/index.html (仪表盘)           │
├─────────────────────────────────────────────┤
│               REST API / WebSocket           │
├─────────────────────────────────────────────┤
│          Express Server (server.ts)          │
│  ┌──────────────────┐ ┌──────────────────┐  │
│  │  file-manager.ts  │ │   agent.ts       │  │
│  │  (文件读写)       │ │   (AI 对话)      │  │
│  └──────────────────┘ └──────────────────┘  │
├─────────────────────────────────────────────┤
│           Obsidian Vault (文件系统)          │
│   04 TaskNotes/  00 Inbox/  04成长/  03Life os/ │
└─────────────────────────────────────────────┘
```

---

## 核心模块

### 1. `config.ts` —— 路径配置

所有文件读写路径在这里统一定义，确保与 Obsidian 主页中的 `01 主页/` 文件保持一致。

```typescript
// 示例：健康数据路径
PATHS.health("2025-07-27") → "04 TaskNotes/健康数据/2025-07-27.md"
```

### 2. `file-manager.ts` —— 文件管理器

提供 Obsidian Vault 的完整文件读写能力：

- `readFile()` / `writeFile()` —— 通用文件读写
- `readHealthEntry()` / `writeHealthEntry()` —— 健康数据
- `readMoodEntry()` / `writeMoodEntry()` —— 心情数据
- `getDashboardStats()` —— 仪表盘统计
- `searchFiles()` —— Vault 搜索

所有写入的 Markdown 文件包含 YAML frontmatter，与 Obsidian 完全兼容。

### 3. `agent.ts` —— Agent SDK 封装

基于 `@tencent-ai/agent-sdk` 的 AI 能力封装：

- `singleQuery()` —— 单次对话
- `createSession()` —— 持久会话
- `executeAction()` —— 预设操作执行

---

## 数据格式

### 健康数据

```yaml
---
date: 2025-07-27
type: 健康数据
sleep: 7.5
sleep_quality: 4
exercise: 跑步
exercise_duration: 30
water: 8
weight: 70.5
breakfast: 燕麦粥
lunch: 沙拉
dinner: 鱼
---
```

### 心情数据

```yaml
---
date: 2025-07-27
type: 心情日记
mood: 4
tags: [学习, 运动, 开心]
---
```

---

## 与 Obsidian 主页的关系

| WorkBuddy 模块 | 对应的 Obsidian 文件 | 读写兼容性 |
|:---|:---|:---|
| 仪表盘 | `01 主页/仪表盘.md` | 读取数据、写入统计 |
| 健康追踪 | `01 主页/健康追踪.md` | 读取 `04 TaskNotes/健康数据/*.md` |
| 心情日记 | `01 主页/主页2.md` Block2 | 读取 `04 TaskNotes/心情/*.md` |
| AI 助手 | `01 主页/Agent 控制台.md` | 独立 AI 会话 |

---

## 技术栈

| 层面 | 技术 |
|:---|:---|
| 前端 | Vanilla JS + Tailwind CSS |
| 后端 | Express + TypeScript |
| AI | CodeBuddy Agent SDK |
| 文件存储 | Obsidian Vault (Markdown) |
| 通信 | REST API + WebSocket |

---

## 扩展指南

### 添加新数据模块

1. 在 `config.ts` 添加路径常量
2. 在 `file-manager.ts` 添加读写函数
3. 在 `server.ts` 添加 API 路由
4. 在 `client/main.js` 添加视图组件

### 自定义 AI 提示词

修改 `config.ts` 中的 `SYSTEM_PROMPT`，添加你的专属 Agent 角色定义。
