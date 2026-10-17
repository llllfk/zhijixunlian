import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/lib/server-auth';

// 更新账号：启用/禁用、角色
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '无权限' }, { status: e?.status || 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active;
  if (body.name) patch.name = String(body.name).trim();
  if (body.role === 'admin' || body.role === 'user') patch.role = body.role;

  const db = getSupabaseClient();
  const { data, error } = await db.from('user_profiles').update(patch).eq('id', id).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}