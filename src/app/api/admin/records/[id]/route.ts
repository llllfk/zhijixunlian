import { NextRequest, NextResponse } from 'next/server';
import { ensureDb, getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/server-auth';

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let admin: { user_id: string };
  try {
    admin = await requireAdmin(req);
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number };
    return NextResponse.json({ error: err?.message || '无权限' }, { status: err?.status || 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  if (!('teacher_comment' in body)) {
    return NextResponse.json({ error: '缺少点评内容' }, { status: 400 });
  }
  const comment = String(body.teacher_comment ?? '').trim();
  if (comment.length > 2000) {
    return NextResponse.json({ error: '点评请控制在 2000 字以内' }, { status: 400 });
  }

  await ensureDb();
  const { rows } = await getPool().query(
    `UPDATE training_records
     SET teacher_comment = $2,
         teacher_commented_at = CASE WHEN $2 = '' THEN NULL ELSE now() END,
         teacher_id = CASE WHEN $2 = '' THEN NULL ELSE $3 END
     WHERE id = $1
     RETURNING *`,
    [id, comment, admin.user_id]
  );
  if (!rows[0]) return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  return NextResponse.json({ record: rows[0] });
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
  await getPool().query(`DELETE FROM training_records WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
