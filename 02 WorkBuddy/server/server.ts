/**
 * WorkBuddy 个人工作台服务器
 *
 * 提供 REST API + WebSocket + 文件管理能力
 * 所有文件读写路径与 Obsidian 01 主页/ 中的配置保持一致
 */

import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { fileURLToPath } from "url";
import * as path from "path";
import { fileManager } from "./file-manager.js";
import { singleQuery, createSession, executeAction } from "./agent.js";
import { SERVER_CONFIG, PATHS } from "./config.js";
import type { ApiResponse, WSMessage, HealthEntry, MoodEntry } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

app.use(express.json());

// 静态托管前端仪表盘（同源访问，避免 file:// 的 CORS / 缓存问题）
app.use(express.static(path.join(__dirname, "..", "client")));

// CORS
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  next();
});

// ==================== REST API ====================

/** 获取仪表盘统计 */
app.get("/api/dashboard", async (_req, res) => {
  try {
    const stats = await fileManager.getDashboardStats();
    const response: ApiResponse = { success: true, data: stats, timestamp: new Date().toISOString() };
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/** 获取今日健康数据 */
app.get("/api/health/today", async (_req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const entry = await fileManager.readHealthEntry(today);
  const response: ApiResponse = { success: true, data: entry, timestamp: new Date().toISOString() };
  res.json(response);
});

/** 获取某天健康数据 */
app.get("/api/health/:date", async (req, res) => {
  const entry = await fileManager.readHealthEntry(req.params.date);
  const response: ApiResponse = { success: true, data: entry, timestamp: new Date().toISOString() };
  res.json(response);
});

/** 写入健康数据 */
app.post("/api/health", async (req, res) => {
  const entry: HealthEntry = req.body;
  if (!entry.date) {
    res.status(400).json({ success: false, error: "缺少日期字段 date" });
    return;
  }
  const result = await fileManager.writeHealthEntry(entry);
  const response: ApiResponse = { success: result.success, data: result, timestamp: new Date().toISOString() };
  res.json(response);
});

/** 获取健康统计 */
app.get("/api/health/stats", async (_req, res) => {
  const stats = await fileManager.getHealthStats();
  const response: ApiResponse = { success: true, data: stats, timestamp: new Date().toISOString() };
  res.json(response);
});

/** 获取今日心情 */
app.get("/api/mood/today", async (_req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const entry = await fileManager.readMoodEntry(today);
  const response: ApiResponse = { success: true, data: entry, timestamp: new Date().toISOString() };
  res.json(response);
});

/** 写入心情 */
app.post("/api/mood", async (req, res) => {
  const entry: MoodEntry = req.body;
  if (!entry.date) {
    res.status(400).json({ success: false, error: "缺少日期字段 date" });
    return;
  }
  const result = await fileManager.writeMoodEntry(entry);
  const response: ApiResponse = { success: result.success, data: result, timestamp: new Date().toISOString() };
  res.json(response);
});

/** 搜索文件 */
app.get("/api/search", async (req, res) => {
  const q = req.query.q as string;
  if (!q) {
    res.status(400).json({ success: false, error: "缺少搜索参数 q" });
    return;
  }
  const files = await fileManager.searchFiles(q);
  const response: ApiResponse = { success: true, data: files.slice(0, 50), timestamp: new Date().toISOString() };
  res.json(response);
});

/** 列出目录 */
app.get("/api/list", async (req, res) => {
  const dirPath = req.query.path as string;
  if (!dirPath) {
    // 默认列出根目录
    const result = await fileManager.listDir(PATHS.vault);
    res.json({ success: result.success, data: result.files });
    return;
  }
  const result = await fileManager.listDir(dirPath);
  const response: ApiResponse = { success: result.success, data: result.files, timestamp: new Date().toISOString() };
  res.json(response);
});

/** 读取文件 */
app.get("/api/file", async (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ success: false, error: "缺少文件路径 path" });
    return;
  }
  const result = await fileManager.readFile(filePath);
  const response: ApiResponse = { success: result.success, data: result.content, timestamp: new Date().toISOString() };
  res.json(response);
});

/** 写入文件 */
app.post("/api/file", async (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath || content === undefined) {
    res.status(400).json({ success: false, error: "缺少 path 或 content" });
    return;
  }
  const result = await fileManager.writeFile(filePath, content);
  const response: ApiResponse = { success: result.success, data: result, timestamp: new Date().toISOString() };
  res.json(response);
});

/** 快速记录（闪电灵感 → 00 Inbox） */
app.post("/api/quicknote", async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    res.status(400).json({ success: false, error: "记录内容不能为空" });
    return;
  }
  const result = await fileManager.writeQuickNote(content.trim());
  const response: ApiResponse = { success: result.success, data: result, timestamp: new Date().toISOString() };
  res.json(response);
});

/** Agent 对话 */
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    res.status(400).json({ success: false, error: "缺少消息 message" });
    return;
  }
  try {
    const results: any[] = [];
    const stream = singleQuery(message);

    for await (const msg of stream) {
      results.push(msg);
    }
    res.json({ success: true, data: results, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/** Agent 执行操作 */
app.post("/api/action", async (req, res) => {
  const { action, payload } = req.body;
  if (!action) {
    res.status(400).json({ success: false, error: "缺少 action" });
    return;
  }
  try {
    const result = await executeAction(action, payload || {});
    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

// ==================== WebSocket 处理 ====================

wss.on("connection", (ws: WebSocket) => {
  console.log("[WS] 客户端已连接");

  ws.on("message", async (data) => {
    try {
      const msg: WSMessage = JSON.parse(data.toString());
      handleWSMessage(ws, msg);
    } catch (error: any) {
      ws.send(JSON.stringify({ type: "error", payload: { message: error.message } }));
    }
  });

  ws.on("close", () => {
    console.log("[WS] 客户端已断开");
  });

  // 发送初始连接确认
  ws.send(JSON.stringify({
    type: "sync",
    payload: { message: "已连接到 WorkBuddy 工作台", timestamp: new Date().toISOString() },
  }));
});

async function handleWSMessage(ws: WebSocket, msg: WSMessage) {
  const { type, payload, id } = msg;

  switch (type) {
    case "chat": {
      const stream = singleQuery(payload as string);
      for await (const chunk of stream) {
        ws.send(JSON.stringify({ type: "chat", payload: chunk, id }));
      }
      break;
    }
    case "action": {
      const { action, ...rest } = payload as any;
      const result = await executeAction(action, rest);
      ws.send(JSON.stringify({ type: "action", payload: result, id }));
      break;
    }
    default:
      ws.send(JSON.stringify({ type: "error", payload: { message: `未知消息类型: ${type}` }, id }));
  }
}

// ==================== 启动服务器 ====================

server.listen(SERVER_CONFIG.port, SERVER_CONFIG.host, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║          🚀 WorkBuddy 个人工作台已启动             ║
║                                                      ║
║  HTTP API:     http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}/api      ║
║  WebSocket:    ws://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}/ws       ║
║  Vault 路径:   ${PATHS.vault}║
║                                                      ║
║  文件写入逻辑与 Obsidian 01 主页/ 完全一致          ║
╚══════════════════════════════════════════════════════╝
`);
});
