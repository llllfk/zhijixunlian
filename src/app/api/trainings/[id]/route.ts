import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { resolveAuth } from '@/lib/server-auth';

// 某次训练详情（本人可见）
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await resolveAuth(req);
  if (!auth) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { id } = await ctx.params;
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('training_records')
    .select('*')
    .eq('id', id)
    .eq('user_id', auth.user_id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  return NextResponse.json({ record: data });
}