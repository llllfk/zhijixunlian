import { NextRequest, NextResponse } from 'next/server';
import { ensureDb, getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/server-auth';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number };
    return NextResponse.json({ error: err?.message || '无权限' }, { status: err?.status || 403 });
  }
  const userId = req.nextUrl.searchParams.get('userId');
  await ensureDb();
  const { rows } = userId
    ? await getPool().query(
        `SELECT * FROM training_records WHERE user_id = $1 ORDER BY created_at DESC LIMIT 500`,
        [userId]
      )
    : await getPool().query(`SELECT * FROM training_records ORDER BY created_at DESC LIMIT 500`);
  return NextResponse.json({ records: rows });
}
