// 共享类型与常量

// 雷达图六个维度（与「训练评价」智能体输出对齐）
export const RADAR_DIMENSIONS = [
  '礼仪问候',
  '证件与客票核对',
  '服务信息确认',
  '行李与危险品提示',
  '座位与登机牌唱票',
  '表达与应变',
] as const;

export type RadarKey = (typeof RADAR_DIMENSIONS)[number];

export interface DialogueMsg {
  role: 'passenger' | 'agent'; // passenger=旅客(智能体/预览), agent=学员(你)
  content: string;
  ts: number;
}

// 「训练评价」智能体返回的结构化结果
export interface EvalResult {
  total_score: number; // 0-100
  dimensions: Record<RadarKey, number>;
  suggestions: string[];
  transcript: DialogueMsg[];
}

export interface PassengerProfile {
  id: string;
  name: string;
  description: string | null;
  background_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

export interface TrainingRecord {
  id: string;
  user_id: string;
  profile_id: string | null;
  profile_name: string | null;
  status: string;
  duration_seconds: number;
  score: number | null;
  scores: Record<RadarKey, number> | null;
  result: EvalResult | null;
  started_at: string;
  created_at: string;
}

export interface UserProfileInfo {
  id: string;
  name: string;
  role: 'user' | 'admin';
  is_active: boolean;
  email?: string | null;
  phone?: string | null;
  created_at?: string;
}

// 通话页状态机
export type CallStage = 'idle' | 'calling' | 'connected' | 'ended';