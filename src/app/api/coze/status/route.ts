import { NextResponse } from 'next/server';
import { COZE_CONFIG, isMockEnabled } from '@/lib/coze';

// 前端用于判断当前是否走 mock 兜底，以及两个智能体是否已配置
export async function GET() {
  return NextResponse.json({
    useMock: isMockEnabled(),
    tutorBotIdConfigured: Boolean(COZE_CONFIG.tutorBotId),
    evaluatorBotIdConfigured: Boolean(COZE_CONFIG.evaluatorBotId),
    message:
      USE_MOCK_DESC,
  });
}
const USE_MOCK_DESC =
  '当前未配置扣子「旅客陪练/训练评价」智能体，通话与评价走 mock 数据。请在环境变量填入 COZE_TUTOR_BOT_ID / COZE_EVALUATOR_BOT_ID / COZE_WORKLOAD_API_TOKEN 后切换为真实能力。';