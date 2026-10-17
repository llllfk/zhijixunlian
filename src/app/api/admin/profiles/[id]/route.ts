import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/lib/server-auth';

// 管理员：更新/删除画像
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '无权限' }, { status: e?.status || 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name) patch.name = String(body.name).trim();
  if ('description' in body) patch.description = body.description;
  if ('background_url' in body) patch.background_url = body.background_url;
  if ('is_active' in body && typeof body.is_active === 'boolean') patch.is_active = body.is_active;
  if ('sort_order' in body) patch.sort_order = Number(body.sort_order);

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('passenger_profiles')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '无权限' }, { status: e?.status || 403 });
  }
  const { id } = await ctx.params;
  const db = getSupabaseClient();
  const { error } = await db.from('passenger_profiles').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}