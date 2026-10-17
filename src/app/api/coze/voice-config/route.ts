import { NextRequest, NextResponse } from 'next/server';
import { resolveAuth } from '@/lib/server-auth';
import { COZE_CONFIG, isMockEnabled, buildPassengerKickoff } from '@/lib/coze';

/**
 * 已登录学员获取实时语音通话配置。
 * token 仅下发给已鉴权前端，用于 WsChatClient（需浏览器麦克风 + HTTPS/localhost）。
 */
export async function GET(req: NextRequest) {
  const auth = await resolveAuth(req);
  if (!auth) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  if (!auth.is_active) return NextResponse.json({ error: '账号已被禁用' }, { status: 403 });

  if (isMockEnabled() || !COZE_CONFIG.token || !COZE_CONFIG.tutorBotId) {
    return NextResponse.json({
      enabled: false,
      error: '未配置旅客陪练 Bot 或 PAT，无法启用语音',
    });
  }

  const profileName = req.nextUrl.searchParams.get('profileName') || '';
  const description = req.nextUrl.searchParams.get('description') || '';

  return NextResponse.json({
    enabled: true,
    botId: COZE_CONFIG.tutorBotId,
    token: COZE_CONFIG.token,
    baseWsURL: COZE_CONFIG.wsBaseUrl,
    voiceId: COZE_CONFIG.voiceId || undefined,
    kickoff: buildPassengerKickoff(profileName, description),
    userId: auth.user_id,
  });
}
