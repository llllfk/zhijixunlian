/**
 * 扣子智能体接入配置与调用位。
 * 密钥一律从环境变量读取，禁止写入代码仓库。
 * 注意：扣子平台自定义环境变量不能以 COZE_ 开头，统一用 ZJ_；本地旧名仅作兼容回退。
 */

import fallbackVoicesJson from './fallback-voices.json';

function env(...keys: string[]) {
  for (const k of keys) {
    const v = process.env[k];
    if (v) return v;
  }
  return '';
}

export const COZE_CONFIG = {
  apiBaseUrl: env('ZJ_API_BASE_URL', 'COZE_API_BASE_URL') || 'https://api.coze.cn',
  token: env('ZJ_API_TOKEN', 'COZE_WORKLOAD_API_TOKEN', 'COZE_API_TOKEN'),
  spaceId: env('ZJ_SPACE_ID', 'COZE_PROJECT_SPACE_ID'),
  tutorBotId: env('ZJ_TUTOR_BOT_ID', 'COZE_TUTOR_BOT_ID'),
  evaluatorBotId: env('ZJ_EVALUATOR_BOT_ID', 'COZE_EVALUATOR_BOT_ID'),
  voiceId: env('ZJ_VOICE_ID', 'COZE_VOICE_ID'),
  wsBaseUrl: env('ZJ_WS_BASE_URL', 'COZE_WS_BASE_URL') || 'wss://ws.coze.cn',
};

/** 未配置 Bot 或未配置 token 时走 mock */
export const USE_MOCK = !COZE_CONFIG.tutorBotId || !COZE_CONFIG.evaluatorBotId || !COZE_CONFIG.token;

export function isMockEnabled() {
  return USE_MOCK;
}

type ChatMessage = { role: string; content: string };

async function chatRequest(
  botId: string,
  messages: ChatMessage[],
  opts?: { stream?: boolean; conversationId?: string; userId?: string }
) {
  const payload: Record<string, unknown> = {
    bot_id: botId,
    user_id: opts?.userId || 'trainee',
    auto_save_history: true,
    stream: Boolean(opts?.stream),
    additional_messages: messages.map((m) => ({
      role: m.role === 'assistant' || m.role === 'agent' ? 'assistant' : 'user',
      content: m.content,
      content_type: 'text',
    })),
  };
  if (opts?.conversationId) payload.conversation_id = opts.conversationId;

  const res = await fetch(`${COZE_CONFIG.apiBaseUrl}/v3/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${COZE_CONFIG.token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Coze chat request failed: ${res.status} ${await res.text()}`);
  }
  return res;
}

/** 取最终 answer 文本（同步轮询） */
export async function runBotTurn(botId: string, messages: ChatMessage[]): Promise<string> {
  if (!COZE_CONFIG.token) throw new Error('Coze token not configured');
  const res = await chatRequest(botId, messages, { stream: false });
  const data = await res.json();
  const chatId = data?.data?.id;
  const conversationId = data?.data?.conversation_id;
  if (!chatId || !conversationId) return '';

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1200));
    const msgs = await fetch(
      `${COZE_CONFIG.apiBaseUrl}/v3/chat/message/list?conversation_id=${conversationId}&chat_id=${chatId}`,
      { headers: { Authorization: `Bearer ${COZE_CONFIG.token}` } }
    ).then((r) => r.json());
    const answer = msgs?.data?.find?.((m: { type?: string }) => m.type === 'answer')?.content;
    if (answer) return String(answer);
    const retrieve = await fetch(
      `${COZE_CONFIG.apiBaseUrl}/v3/chat/retrieve?conversation_id=${conversationId}&chat_id=${chatId}`,
      { headers: { Authorization: `Bearer ${COZE_CONFIG.token}` } }
    ).then((r) => r.json());
    if (retrieve?.data?.status === 'failed') break;
    if (retrieve?.data?.status === 'completed') {
      const again = msgs?.data?.find?.((m: { type?: string }) => m.type === 'answer')?.content;
      if (again) return String(again);
    }
  }
  return '';
}

/** 流式对话原始 Response（SSE） */
export async function streamBotTurn(
  botId: string,
  messages: ChatMessage[],
  opts?: { conversationId?: string; userId?: string }
): Promise<Response> {
  if (!COZE_CONFIG.token) throw new Error('Coze token not configured');
  return chatRequest(botId, messages, { stream: true, conversationId: opts?.conversationId, userId: opts?.userId });
}

export type CozeSseEvent =
  | { type: 'meta'; conversationId: string; chatId?: string }
  | { type: 'passenger_delta'; content: string }
  | { type: 'passenger'; content: string; ts: number }
  | { type: 'done' }
  | { type: 'error'; message: string };

/** 将扣子 SSE 转成通话页事件 */
export async function* iterateCozePassengerEvents(
  cozeRes: Response,
  signal?: AbortSignal
): AsyncGenerator<CozeSseEvent> {
  if (!cozeRes.body) {
    yield { type: 'error', message: '扣子未返回流' };
    return;
  }

  const reader = cozeRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = '';
  let conversationId = '';
  let chatId = '';
  let answerBuf = '';

  try {
    while (true) {
      if (signal?.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const raw of lines) {
        const line = raw.replace(/\r$/, '');
        if (!line) {
          eventName = '';
          continue;
        }
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
          continue;
        }
        if (!line.startsWith('data:')) continue;
        const dataStr = line.slice(5).trim();
        if (!dataStr || dataStr === '[DONE]') continue;

        let data: any;
        try {
          data = JSON.parse(dataStr);
        } catch {
          continue;
        }

        if (data?.conversation_id) conversationId = String(data.conversation_id);
        if (data?.id && String(eventName).includes('chat')) chatId = String(data.id);
        if (data?.chat_id) chatId = String(data.chat_id);

        if (eventName === 'conversation.chat.created' || eventName === 'conversation.chat.in_progress') {
          if (conversationId) {
            yield { type: 'meta', conversationId, chatId: chatId || undefined };
          }
        }

        if (eventName === 'conversation.message.delta' && data?.type === 'answer') {
          const piece = typeof data.content === 'string' ? data.content : '';
          if (piece) {
            answerBuf += piece;
            yield { type: 'passenger_delta', content: piece };
          }
        }

        if (eventName === 'conversation.message.completed' && data?.type === 'answer') {
          const full = typeof data.content === 'string' && data.content ? data.content : answerBuf;
          answerBuf = '';
          if (full.trim()) {
            yield { type: 'passenger', content: full.trim(), ts: Date.now() };
          }
        }

        if (eventName === 'conversation.chat.failed') {
          yield { type: 'error', message: data?.last_error?.msg || '扣子对话失败' };
        }

        if (eventName === 'done' || eventName === 'conversation.chat.completed') {
          if (answerBuf.trim()) {
            yield { type: 'passenger', content: answerBuf.trim(), ts: Date.now() };
            answerBuf = '';
          }
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }

  if (answerBuf.trim()) {
    yield { type: 'passenger', content: answerBuf.trim(), ts: Date.now() };
  }
  yield { type: 'done' };
}

export function buildPassengerKickoff(profileName?: string | null, description?: string | null) {
  const name = profileName || '普通成人';
  const desc = description?.trim() || '配合度高的常规旅客，按标准流程办理值机。';
  return [
    `系统提示（学员看不到）：你是机场值机柜台前的旅客，不是老师，不背规范、不打分。`,
    `本场必须只扮演以下画像，不要切换成其他旅客类型：`,
    `当前画像：${name}`,
    `画像说明（严格按此语气与行为）：${desc}`,
    `通话刚接通。请用一两句口语开场（例如来办值机），一次只说一两句，等值机员回应。`,
  ].join('\n');
}

export type CozeVoiceItem = {
  id: string;
  name: string;
  language: string;
  previewUrl: string | null;
  isSystem: boolean;
};

/** 接口无权限时的内置中文音色（仅名称可选，试听走合成接口） */
export const FALLBACK_VOICES: CozeVoiceItem[] = (fallbackVoicesJson as Array<{
  id: string;
  name: string;
  language?: string;
  isSystem?: boolean;
}>).map((v) => ({
  id: v.id,
  name: v.name,
  language: v.language || '中文',
  previewUrl: null,
  isSystem: v.isSystem !== false,
}));

/** 拉取扣子可用音色（含试听地址），供管理端选型 */
export async function listCozeVoices(): Promise<CozeVoiceItem[]> {
  if (!COZE_CONFIG.token) throw new Error('未配置 ZJ_API_TOKEN');
  const out: CozeVoiceItem[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore && page <= 5) {
    const url = new URL(`${COZE_CONFIG.apiBaseUrl}/v1/audio/voices`);
    url.searchParams.set('page_num', String(page));
    url.searchParams.set('page_size', '100');
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${COZE_CONFIG.token}`,
        'Content-Type': 'application/json',
      },
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      const detail = json?.msg || json?.message || text.slice(0, 160);
      throw new Error(`音色列表请求失败: ${res.status}${detail ? ` ${detail}` : ''}`);
    }
    if (json?.code !== 0 && json?.code != null) {
      throw new Error(json?.msg || `音色列表返回异常 code=${json.code}`);
    }
    const list = Array.isArray(json?.data?.voice_list) ? json.data.voice_list : [];
    for (const v of list) {
      const id = String(v.voice_id || '');
      if (!id) continue;
      out.push({
        id,
        name: String(v.name || '未命名音色'),
        language: String(v.language_name || v.language_code || ''),
        previewUrl: v.preview_audio ? String(v.preview_audio) : null,
        isSystem: Boolean(v.is_system_voice),
      });
    }
    hasMore = Boolean(json?.data?.has_more);
    page += 1;
  }
  return out;
}
