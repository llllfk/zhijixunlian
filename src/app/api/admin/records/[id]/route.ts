import { NextRequest, NextResponse } from 'next/server';
import { ensureDb, getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/server-auth';

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number };
    return NextResponse.json({ error: err?.message || '无权限' }, { status: err?.status || 403 });
  }
  const { id } = await ctx.params;
  await ensureDb();
  await getPool().query(`DELETE FROM training_records WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
