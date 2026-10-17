import { NextRequest, NextResponse } from 'next/server';
import { ensureDb, getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/server-auth';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number };
    return NextResponse.json({ error: err?.message || '无权限' }, { status: err?.status || 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  await ensureDb();
  const { rows } = await getPool().query(
    `UPDATE user_profiles SET
       is_active = COALESCE($2, is_active),
       name = COALESCE($3, name),
       role = COALESCE($4, role),
       updated_at = now()
     WHERE id = $1
     RETURNING id, email, name, role, is_active, created_at`,
    [
      id,
      typeof body.is_active === 'boolean' ? body.is_active : null,
      body.name ? String(body.name).trim() : null,
      body.role === 'admin' || body.role === 'user' ? body.role : null,
    ]
  );
  return NextResponse.json({ user: rows[0] || null });
}
