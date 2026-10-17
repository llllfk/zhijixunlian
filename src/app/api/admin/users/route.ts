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
  await ensureDb();
  const { rows } = await getPool().query(
    `SELECT id, email, name, role, is_active, created_at FROM user_profiles ORDER BY created_at DESC`
  );
  return NextResponse.json({ users: rows });
}
