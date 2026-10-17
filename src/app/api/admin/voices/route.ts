import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';
import { listCozeVoices, FALLBACK_VOICES } from '@/lib/coze';

/** 管理端拉取可试听音色列表（不下发原始文档给学员） */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number };
    return NextResponse.json({ error: err?.message || '无权限' }, { status: err?.status || 403 });
  }
  try {
    const voices = await listCozeVoices();
    return NextResponse.json({ voices, source: 'live' as const });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '拉取音色失败';
    const needPerm = /403|listVoice|权限|Forbidden/i.test(msg);
    const hint = needPerm
      ? '音色接口无权限（需 listVoice）。已改用内置中文音色列表；请到扣子开放平台为 PAT 开通 listVoice，试听预览会更完整。'
      : `${msg}。已改用内置中文音色列表。`;
    return NextResponse.json({
      voices: FALLBACK_VOICES,
      source: 'fallback' as const,
      warning: hint,
    });
  }
}
