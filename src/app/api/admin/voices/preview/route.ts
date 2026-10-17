import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';
import { COZE_CONFIG } from '@/lib/coze';

/** 无 preview_audio 时，用语音合成生成短试听 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number };
    return NextResponse.json({ error: err?.message || '无权限' }, { status: err?.status || 403 });
  }

  const voiceId = req.nextUrl.searchParams.get('voiceId') || '';
  if (!voiceId) return NextResponse.json({ error: '缺少音色' }, { status: 400 });
  if (!COZE_CONFIG.token) return NextResponse.json({ error: '未配置 API Token' }, { status: 500 });

  const res = await fetch(`${COZE_CONFIG.apiBaseUrl}/v1/audio/speech`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${COZE_CONFIG.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: '你好，我来办一下值机。',
      voice_id: voiceId,
      response_format: 'mp3',
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json(
      {
        error:
          res.status === 403
            ? '试听失败：PAT 需开通 createSpeech 权限'
            : `试听合成失败: ${res.status} ${text.slice(0, 120)}`,
      },
      { status: 502 }
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  return new NextResponse(buf, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
      'Cache-Control': 'private, max-age=300',
    },
  });
}
