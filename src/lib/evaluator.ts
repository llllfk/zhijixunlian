import { COZE_CONFIG, runBotTurn, isMockEnabled } from './coze';
import { mockEval } from './mock';
import { EvalResult, DialogueMsg } from './types';

/**
 * 挂断后：把本轮对话记录发给「训练评价」智能体，拿回结构化评分。
 * - 已配置 evaluatorBotId + token → 调用真实智能体，尝试解析 JSON。
 * - 否则走 mock 兜底，保证页面可跑通。
 */
export async function evaluateDialogue(
  dialogue: DialogueMsg[],
  profileName?: string | null,
  durationSeconds = 0
): Promise<{ result: EvalResult; source: 'real' | 'mock' }> {
  if (!isMockEnabled() && COZE_CONFIG.evaluatorBotId && COZE_CONFIG.token) {
    try {
      const prompt = `请以民航值机服务培训师身份，对本轮「旅客陪练」语音对话进行评分。
旅客画像：${profileName || '普通旅客'}
指令：只输出 JSON，不要任何额外文字。JSON 结构：
{"total_score":0-100,"dimensions":{"礼仪问候":0-100,"证件与客票核对":0-100,"服务信息确认":0-100,"行李与危险品提示":0-100,"座位与登机牌唱票":0-100,"表达与应变":0-100},"suggestions":["建议1","建议2"]}
对话记录：
${dialogue.map((d) => `${d.role === 'passenger' ? '旅客' : '学员'}: ${d.content}`).join('\n')}`;

      const text = await runBotTurn(COZE_CONFIG.evaluatorBotId, [{ role: 'user', content: prompt }]);
      const json = extractJson(text);
      if (json && json.total_score != null && json.dimensions) {
        const transcript = dialogue.length ? dialogue : [];
        return { result: { ...json, transcript } as EvalResult, source: 'real' };
      }
    } catch {
      // 真实调用失败 → 兜底 mock，不阻断流程
    }
  }
  return { result: mockEval(dialogue, profileName), source: 'mock' };
}

export function extractJson(text: string): any {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}