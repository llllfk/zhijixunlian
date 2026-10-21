import { NextRequest, NextResponse } from 'next/server';
import { ensureDb, getPool } from '@/lib/db';
import { resolveAuth } from '@/lib/server-auth';
import { resolveProfileBackgrounds } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  if (!ctx.is_active) return NextResponse.json({ error: '账号已被禁用' }, { status: 403 });

  await ensureDb();
  const { rows } = await getPool().query(
    `SELECT * FROM passenger_profiles WHERE is_active = true ORDER BY sort_order ASC`
  );
  const profiles = await resolveProfileBackgrounds(rows);
  return NextResponse.json({ profiles });
}
