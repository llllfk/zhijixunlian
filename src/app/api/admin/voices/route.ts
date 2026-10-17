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
  } catch {
    return NextResponse.json({
      voices: FALLBACK_VOICES,
      source: 'fallback' as const,
    });
  }
}
