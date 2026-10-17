import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/lib/server-auth';

// 重置学员密码（admin 专属）
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '无权限' }, { status: e?.status || 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || '');
  if (password.length < 6) return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 });

  const db = getSupabaseClient();
  const { error } = await db.auth.admin.updateUserById(id, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, message: '密码已重置' });
}