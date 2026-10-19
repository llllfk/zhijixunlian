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
      const durationLine =
        durationSeconds > 0
          ? `本次通话时长：${durationSeconds} 秒。请按人设中的操作时限规则处理超时扣分。`
          : '本次未提供通话时长，按人设注明「未提供时长，本次不扣超时分」。';
      const prompt = `请按你的人设与评分表，对本轮「旅客陪练」语音对话评分。
旅客画像：${profileName || '普通旅客'}
${durationLine}
先按人设输出完整文字报告（总分、各分项得分表、雷达图维度、亮点、改进建议）。
报告写完后，末尾必须再附一段、且仅一段固定 JSON，用 \`\`\`json 代码块包裹，不要在 JSON 前后加解释。键名必须完全一致：
{"total_score":0,"dimensions":{"礼仪问候":0,"证件与客票核对":0,"服务信息确认":0,"行李与危险品提示":0,"座位与登机牌唱票":0,"表达与应变":0},"suggestions":["建议1","建议2"]}
total_score 为按评分表算出的总分（0-100，含超时扣分）。dimensions 六项各为 0-100。suggestions 为改进建议原文。
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

/** 取报告末尾的固定 JSON。优先 ```json 代码块，否则取最后一个含 total_score 的对象。 */
export function extractJson(text: string): any {
  const fences = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  for (let i = fences.length - 1; i >= 0; i--) {
    const parsed = parseObject(fences[i][1]);
    if (parsed && parsed.total_score != null && parsed.dimensions) return parsed;
  }
  const marker = '"total_score"';
  let from = text.lastIndexOf(marker);
  while (from >= 0) {
    const start = text.lastIndexOf('{', from);
    if (start >= 0) {
      const slice = sliceBalanced(text, start);
      const parsed = slice ? parseObject(slice) : null;
      if (parsed && parsed.total_score != null && parsed.dimensions) return parsed;
    }
    from = text.lastIndexOf(marker, from - 1);
  }
  return null;
}

function parseObject(raw: string): any {
  try {
    const value = JSON.parse(raw.trim());
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function sliceBalanced(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}