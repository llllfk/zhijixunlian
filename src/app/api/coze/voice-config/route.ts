import { NextRequest, NextResponse } from 'next/server';
import { resolveAuth } from '@/lib/server-auth';
import { COZE_CONFIG, isMockEnabled, buildPassengerKickoff } from '@/lib/coze';
import { ensureDb, getPool } from '@/lib/db';

/**
 * 已登录学员获取实时语音通话配置。
 * token 仅下发给已鉴权前端，用于 WsChatClient（需浏览器麦克风 + HTTPS/localhost）。
 * 音色优先用画像上配置的 voice_id，否则回退全局 ZJ_VOICE_ID。
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

  const profileId = req.nextUrl.searchParams.get('profileId') || '';
  let profileName = req.nextUrl.searchParams.get('profileName') || '';
  let description = req.nextUrl.searchParams.get('description') || '';
  let voiceId = COZE_CONFIG.voiceId || undefined;

  if (profileId) {
    try {
      await ensureDb();
      const { rows } = await getPool().query(
        `SELECT name, description, voice_id FROM passenger_profiles WHERE id = $1 LIMIT 1`,
        [profileId]
      );
      const row = rows[0];
      if (row) {
        if (!profileName) profileName = row.name || '';
        if (!description) description = row.description || '';
        if (row.voice_id) voiceId = String(row.voice_id);
      }
    } catch {
      /* 查库失败仍用请求参数 + 全局音色 */
    }
  }

  return NextResponse.json({
    enabled: true,
    botId: COZE_CONFIG.tutorBotId,
    token: COZE_CONFIG.token,
    baseWsURL: COZE_CONFIG.wsBaseUrl,
    voiceId: voiceId || undefined,
    kickoff: buildPassengerKickoff(profileName, description),
    userId: auth.user_id,
  });
}
