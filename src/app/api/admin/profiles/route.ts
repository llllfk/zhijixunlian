import { NextRequest, NextResponse } from 'next/server';
import { ensureDb, getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/server-auth';
import { resolveProfileBackground, resolveProfileBackgrounds } from '@/lib/storage';

function persistBackgroundUrl(body: Record<string, unknown>): string | null {
  if (typeof body.background_key === 'string' && body.background_key.trim()) {
    return body.background_key.trim();
  }
  if (typeof body.background_url === 'string') {
    return body.background_url.trim() || null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number };
    return NextResponse.json({ error: err?.message || '无权限' }, { status: err?.status || 403 });
  }
  await ensureDb();
  const { rows } = await getPool().query(`SELECT * FROM passenger_profiles ORDER BY sort_order ASC`);
  const profiles = await resolveProfileBackgrounds(rows);
  return NextResponse.json({ profiles });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number };
    return NextResponse.json({ error: err?.message || '无权限' }, { status: err?.status || 403 });
  }
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: '请填写画像名称' }, { status: 400 });
  const voiceId =
    body.voice_id === null || body.voice_id === undefined || body.voice_id === ''
      ? null
      : String(body.voice_id);
  await ensureDb();
  const { rows } = await getPool().query(
    `INSERT INTO passenger_profiles (id, name, description, background_url, voice_id, is_active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      crypto.randomUUID(),
      name,
      body.description || null,
      persistBackgroundUrl(body),
      voiceId,
      body.is_active !== false,
      Number(body.sort_order) || 0,
    ]
  );
  const profile = await resolveProfileBackground(rows[0]);
  return NextResponse.json({ profile });
}
