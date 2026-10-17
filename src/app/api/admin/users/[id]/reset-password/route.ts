import { NextRequest, NextResponse } from 'next/server';
import { ensureDb, getPool } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { requireAdmin } from '@/lib/server-auth';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number };
    return NextResponse.json({ error: err?.message || '无权限' }, { status: err?.status || 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || '');
  if (password.length < 6) return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 });
  await ensureDb();
  await getPool().query(`UPDATE user_profiles SET password_hash = $2, updated_at = now() WHERE id = $1`, [
    id,
    hashPassword(password),
  ]);
  return NextResponse.json({ ok: true, message: '密码已重置' });
}
