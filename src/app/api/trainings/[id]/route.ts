import { NextRequest, NextResponse } from 'next/server';
import { ensureDb, getPool } from '@/lib/db';
import { resolveAuth } from '@/lib/server-auth';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await resolveAuth(req);
  if (!auth) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const { id } = await ctx.params;
  await ensureDb();
  const { rows } = await getPool().query(
    `SELECT * FROM training_records WHERE id = $1 AND user_id = $2`,
    [id, auth.user_id]
  );
  if (!rows[0]) return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  return NextResponse.json({ record: rows[0] });
}
