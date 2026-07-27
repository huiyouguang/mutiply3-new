/** 通用类型定义 */

/** 健康数据条目 */
export interface HealthEntry {
  date: string;
  /** 睡眠时长（小时） */
  sleep: number;
  /** 睡眠质量 1-5 */
  sleepQuality: number;
  /** 运动类型 */
  exercise: string;
  /** 运动时长（分钟） */
  exerciseDuration: number;
  /** 饮水杯数 */
  water: number;
  /** 早餐 */
  breakfast: string;
  /** 午餐 */
  lunch: string;
  /** 晚餐 */
  dinner: string;
  /** 零食 */
  snacks: string;
  /** 体重（kg） */
  weight: number;
  /** 备注 */
  notes: string;
}

/** 心情记录 */
export interface MoodEntry {
  date: string;
  /** 心情 1-5 */
  mood: number;
  /** 心情标签 */
  tags: string[];
  /** 日记内容 */
  content: string;
  /** 感恩事项 */
  gratitude: string[];
}

/** 任务条目 */
export interface TaskEntry {
  id: string;
  title: string;
  completed: boolean;
  due: string | null;
  priority: "high" | "medium" | "low";
  category: string;
  tags: string[];
}

/** 仪表盘统计 */
export interface DashboardStats {
  todayNotes: number;
  totalWords: number;
  completedTasks: number;
  totalTasks: number;
  sleepAvg: number;
  exerciseMinutes: number;
  waterCups: number;
  moodAvg: number;
  lastUpdated: string;
}

/** 文件操作结果 */
export interface FileResult {
  success: boolean;
  path: string;
  content?: string;
  error?: string;
}

/** API 响应格式 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/** WebSocket 消息类型 */
export interface WSMessage {
  type: "chat" | "action" | "sync" | "error";
  payload: unknown;
  id?: string;
}
