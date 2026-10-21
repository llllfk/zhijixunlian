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
  /** 展示用：外链、本地路径，或由 S3 key 签发后的临时 URL */
  background_url: string | null;
  /** 入库用的 S3 对象键；有值时保存画像应写回该字段，避免把签名 URL 存进库 */
  background_key?: string | null;
  /** 扣子音色 ID，仅存库；管理端用名称+试听选择，不向学员展示 */
  voice_id?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  language: string;
  previewUrl: string | null;
  isSystem: boolean;
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
  /** 老师文字点评；有内容时学生端显示「老师已点评」 */
  teacher_comment: string | null;
  teacher_commented_at?: string | null;
  teacher_id?: string | null;
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