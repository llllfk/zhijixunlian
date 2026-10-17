import { NextResponse } from 'next/server';
import { COZE_CONFIG, isMockEnabled } from '@/lib/coze';

export async function GET() {
  const useMock = isMockEnabled();
  return NextResponse.json({
    useMock,
    tutorBotIdConfigured: Boolean(COZE_CONFIG.tutorBotId),
    evaluatorBotIdConfigured: Boolean(COZE_CONFIG.evaluatorBotId),
    tokenConfigured: Boolean(COZE_CONFIG.token),
    message: useMock
      ? '当前未配置扣子「旅客陪练/训练评价」或 PAT，通话与评价走 mock。请配置 ZJ_TUTOR_BOT_ID / ZJ_EVALUATOR_BOT_ID / ZJ_API_TOKEN。'
      : '已配置旅客陪练与考评员；通话优先走扣子实时语音（WsChat），失败时回退文字流。',
  });
}
