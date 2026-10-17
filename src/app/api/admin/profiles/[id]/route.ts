import { NextRequest, NextResponse } from 'next/server';
import { ensureDb, getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/server-auth';

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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
    `UPDATE passenger_profiles SET
       name = COALESCE($2, name),
       description = CASE WHEN $3::boolean THEN $4 ELSE description END,
       background_url = CASE WHEN $5::boolean THEN $6 ELSE background_url END,
       is_active = COALESCE($7, is_active),
       sort_order = COALESCE($8, sort_order),
       updated_at = now()
     WHERE id = $1 RETURNING *`,
    [
      id,
      body.name ? String(body.name).trim() : null,
      'description' in body,
      body.description ?? null,
      'background_url' in body,
      body.background_url ?? null,
      typeof body.is_active === 'boolean' ? body.is_active : null,
      'sort_order' in body ? Number(body.sort_order) : null,
    ]
  );
  return NextResponse.json({ profile: rows[0] || null });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number };
    return NextResponse.json({ error: err?.message || '无权限' }, { status: err?.status || 403 });
  }
  const { id } = await ctx.params;
  await ensureDb();
  await getPool().query(`DELETE FROM passenger_profiles WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
