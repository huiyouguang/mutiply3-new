/**
 * Agent SDK 封装 —— 管理 AI 对话会话
 *
 * 当 @tencent-ai/agent-sdk 不可用时，使用本地回退模式
 */

import { AGENT_CONFIG, SYSTEM_PROMPT, PATHS } from "./config.js";

let query: any;
let unstable_v2_createSession: any;

try {
  const sdk = await import("@tencent-ai/agent-sdk");
  query = sdk.query;
  unstable_v2_createSession = sdk.unstable_v2_createSession;
} catch {
  console.log("[Agent] CodeBuddy Agent SDK 未安装，使用本地回退模式");
  console.log("  安装方法: npm install @tencent-ai/agent-sdk");
}

interface AgentSession {
  id: string;
  createdAt: Date;
  sendMessage: (message: string) => AsyncGenerator<any>;
  close: () => void;
}

const sessions = new Map<string, any>();
const sdkAvailable = () => !!query;

/** 创建单次查询 */
export async function* singleQuery(userPrompt: string) {
  if (!sdkAvailable()) {
    yield {
      type: "result",
      content: [
        {
          type: "text",
          text: `[本地回退模式] 收到消息: "${userPrompt}"\n\n请安装 CodeBuddy Agent SDK 以启用 AI 对话：\nnpm install @tencent-ai/agent-sdk\n\n当前可用功能：仪表盘统计、健康数据读写、心情日记、文件管理。`,
        },
      ],
    };
    return;
  }

  const stream = query({
    prompt: userPrompt,
    options: {
      model: AGENT_CONFIG.model,
      maxTurns: AGENT_CONFIG.maxTurns,
      systemPrompt: SYSTEM_PROMPT,
      cwd: PATHS.vault,
    },
  });

  for await (const message of stream) {
    yield message;
  }
}

/** 创建持久会话 */
export async function createSession(): Promise<AgentSession> {
  const id = Date.now().toString(36);

  if (!sdkAvailable()) {
    return {
      id,
      createdAt: new Date(),
      sendMessage: async function* (message: string) {
        yield { type: "text", content: `[回退模式] 收到: ${message}` };
      },
      close: () => sessions.delete(id),
    };
  }

  const session = await unstable_v2_createSession({
    model: AGENT_CONFIG.model,
    systemPrompt: SYSTEM_PROMPT,
    cwd: PATHS.vault,
  });

  sessions.set(id, session);

  return {
    id,
    createdAt: new Date(),
    sendMessage: async function* (message: string) {
      const response = await session.sendMessage(message);
      yield response;
    },
    close: () => {
      sessions.delete(id);
    },
  };
}

/** 执行具体操作（非对话模式） */
export async function executeAction(
  action: string,
  payload: Record<string, unknown>
): Promise<any> {
  if (!sdkAvailable()) {
    return {
      mode: "fallback",
      action,
      payload,
      message: `[回退模式] 操作 "${action}" 已记录，请安装 Agent SDK 以执行 AI 操作。`,
    };
  }

  const prompt = buildActionPrompt(action, payload);

  const results: any[] = [];
  const stream = query({
    prompt,
    options: {
      model: AGENT_CONFIG.model,
      maxTurns: 3,
      systemPrompt: SYSTEM_PROMPT,
      cwd: PATHS.vault,
      allowedTools: ["Read", "Write", "Grep", "Bash", "Glob"],
    },
  });

  for await (const message of stream) {
    results.push(message);
  }

  return results;
}

function buildActionPrompt(action: string, payload: Record<string, unknown>): string {
  const today = new Date().toISOString().split("T")[0];

  switch (action) {
    case "write_health":
      return `请写入今日(${today})的健康数据到 TaskNotes/健康数据/${today}.md：
- 睡眠时长: ${payload.sleep || "未记录"} 小时
- 运动类型: ${payload.exercise || "未记录"}
- 运动时长: ${payload.exerciseDuration || "0"} 分钟
- 饮水: ${payload.water || "0"} 杯
- 早餐: ${payload.breakfast || "未记录"}
- 午餐: ${payload.lunch || "未记录"}
- 晚餐: ${payload.dinner || "未记录"}
- 体重: ${payload.weight || "未记录"} kg
- 备注: ${payload.notes || "无"}

文件格式请包含 YAML frontmatter。`;

    case "write_mood":
      return `请写入今日(${today})的心情日记到 TaskNotes/心情/${today}.md：
- 心情指数: ${payload.mood || "3"}/5
- 内容: ${payload.content || ""}
- 感恩事项: ${payload.gratitude || ""}

文件格式请包含 YAML frontmatter。`;

    case "get_stats":
      return `请分析并返回最近7天的仪表盘统计数据，包括：
- 今日新增笔记数量
- 完成的/总任务数
- 平均睡眠时长
- 平均运动时长
- 平均饮水量
- 平均心情指数`;

    case "search_vault":
      return `请在 Obsidian Vault 中搜索关于 "${payload.query}" 的内容，
返回相关文件路径和摘要。`;

    default:
      return `执行操作: ${action}, 参数: ${JSON.stringify(payload)}`;
  }
}
