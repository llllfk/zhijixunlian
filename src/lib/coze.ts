/**
 * 扣子智能体接入配置与调用位。
 *
 * 用户将后续提供两个扣子智能体（发布密钥/PAT、Bot ID）：
 *   1.「旅客陪练」—— 实时语音/文字通话陪练（coze-coding 语音通话需配合通话类插件，此处先以文字流式对话预留）
 *   2.「训练评价」—— 挂断后评价本轮对话，返回评分 JSON
 *
 * 所有密钥一律从环境变量读取，禁止写入代码仓库。
 */

export const COZE_CONFIG = {
  // 平台 API
  apiBaseUrl: process.env.COZE_API_BASE_URL || 'https://api.coze.cn',
  token: process.env.COZE_WORKLOAD_API_TOKEN || process.env.COZE_API_TOKEN || '',
  spaceId: process.env.COZE_PROJECT_SPACE_ID || '',

  // 「旅客陪练」智能体：真实语音通话接入时，请在此二次配置（phone/voice 相关参数）
  tutorBotId: process.env.COZE_TUTOR_BOT_ID || '',

  // 「训练评价」智能体：返回结构化评分 JSON
  evaluatorBotId: process.env.COZE_EVALUATOR_BOT_ID || '',
};

/** 未配置任何 Bot 时走 mock 兜底，保证页面跑通 */
export const USE_MOCK = !COZE_CONFIG.tutorBotId || !COZE_CONFIG.evaluatorBotId;

export function isMockEnabled() {
  return USE_MOCK;
}

async function chatRequest(botId: string, messages: { role: string; content: string }[], stream = false) {
  const payload: Record<string, unknown> = {
    bot_id: botId,
    user_id: 'trainee',
    auto_save_history: true,
    stream,
    additional_messages: messages.map((m) => ({
      role: m.role === 'agent' ? 'user' : 'assistant',
      content: m.content,
      content_type: 'text',
    })),
  };
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

/** 取最终 answer 文本（同步轮询视频结束） */
export async function runBotTurn(botId: string, messages: { role: string; content: string }[]): Promise<string> {
  if (!COZE_CONFIG.token) throw new Error('Coze token not configured');
  const res = await chatRequest(botId, messages, false);
  const data = await res.json();
  // /v3/chat 返回 chat_id，需轮询取消息；此处保留最简实现，后续按需完善
  const chatId = data?.data?.id;
  if (!chatId) return '';
  // 简单轮询
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const msgs = await fetch(
      `${COZE_CONFIG.apiBaseUrl}/v3/chat/message/list?conversation_id=${data?.data?.conversation_id}&chat_id=${chatId}`,
      { headers: { Authorization: `Bearer ${COZE_CONFIG.token}` } }
    ).then((r) => r.json());
    const answer = msgs?.data?.find?.((m: { type?: string }) => m.type === 'answer')?.content;
    if (answer) return answer;
    const status = msgs?.data?.find?.((m: { type?: string }) => m.type === 'status');
    if (status?.content?.includes('failed')) break;
  }
  return '';
}

/** 流式对话：交给调用方处理 SSE（供通话页使用） */
export async function streamBotTurn(
  botId: string,
  messages: { role: string; content: string }[]
): Promise<Response> {
  if (!COZE_CONFIG.token) throw new Error('Coze token not configured');
  return chatRequest(botId, messages, true);
}