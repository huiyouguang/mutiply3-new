---
tags: [workbuddy, 个人工作台, 仪表盘]
banner: "https://images.unsplash.com/photo-1499750310107-5fef28a66643"
created: "2025-07-27"
project: "WorkBuddy"
status: "active"
---

# ⚡ WorkBuddy 个人工作台

> CodeBuddy 驱动的个人工作台 —— 与 Obsidian 主页文件逻辑完全一致

---

## 🎯 定位

WorkBuddy 是 CodeBuddy 环境下的个人工作台，核心能力：

1. **📊 仪表盘** —— 可视化统计数据（笔记、健康、心情、时间进度）
2. **🏥 健康追踪** —— 睡眠/运动/饮水/饮食/体重管理与记录
3. **💭 心情日记** —— 每日心情与感恩日记记录
4. **🤖 AI 助手** —— 基于 CodeBuddy Agent SDK 的智能写作与检索
5. **📂 文件管理** —— 读写 Obsidian Vault 中的所有 Markdown 文件

---

## 🗂️ 文件写入位置（与 Obsidian 主页一致）

| 数据类型 | 路径 | 说明 |
|---------|------|------|
| 健康数据 | `04 TaskNotes/健康数据/YYYY-MM-DD.md` | 每日健康记录 |
| 心情日记 | `04 TaskNotes/心情/YYYY-MM-DD.md` | 每日心情与感恩 |
| CPA 任务 | `04 TaskNotes/01 task/注册会计师.md` | 备考进度追踪 |
| 新建笔记 | `00 Inbox/` | 默认收件箱 |
| 学习笔记 | `04成长/` | 成长与学习 |
| 播客笔记 | `03Life os/播客生活/` | 播客与知识管理 |

---

## 🚀 启动方式

### 1. 安装依赖

```bash
cd "02 WorkBuddy"
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入你的 ANTHROPIC_API_KEY
```

### 3. 启动服务器

```bash
npm run dev
```

### 4. 打开仪表盘

在浏览器中打开 `client/index.html`，或访问 `http://localhost:3001/api` 使用 REST API。

---

## 📡 API 接口

### 仪表盘
- `GET /api/dashboard` - 获取仪表盘统计数据

### 健康数据
- `GET /api/health/today` - 获取今日健康数据
- `GET /api/health/:date` - 获取某天健康数据
- `POST /api/health` - 写入健康数据
- `GET /api/health/stats` - 获取健康统计（近7天）

### 心情日记
- `GET /api/mood/today` - 获取今日心情
- `POST /api/mood` - 写入心情日记

### 文件操作
- `GET /api/list?path=` - 列出目录
- `GET /api/file?path=` - 读取文件
- `POST /api/file` - 写入文件
- `GET /api/search?q=` - 搜索文件

### AI 助手
- `POST /api/chat` - AI 对话
- `POST /api/action` - 执行预设操作

---

## 🔗 相关页面

- [[主页2]] - Obsidian 每日工作台
- [[仪表盘]] - Obsidian 仪表盘
- [[健康追踪]] - Obsidian 健康追踪
- [[Agent 控制台]] - Obsidian Agent 控制台
- [[WorkBuddy 开发文档]] - WorkBuddy 开发文档

---

## 📁 项目结构

```
02 WorkBuddy/
├── server/                  # 后端服务
│   ├── server.ts           # Express + WebSocket 服务器
│   ├── config.ts           # 配置与路径常量
│   ├── file-manager.ts     # 文件管理器（Obsidian 兼容）
│   ├── agent.ts            # Agent SDK 封装
│   └── types.ts            # 类型定义
├── client/                  # 前端应用
│   ├── index.html          # 仪表盘入口
│   └── main.js             # 前端逻辑
├── package.json             # 依赖配置
├── .env.example             # 环境变量模板
├── WorkBuddy 主页.md        # 本文
└── WorkBuddy 开发文档.md    # 开发文档
```

---

*WorkBuddy —— 让 CodeBuddy 成为你的个人工作台*
