import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/lib/server-auth';
import { PassengerProfile } from '@/lib/types';

// 管理员：全部画像
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '无权限' }, { status: e?.status || 403 });
  }
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('passenger_profiles')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profiles: data as PassengerProfile[] });
}

// 管理员：新增画像
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '无权限' }, { status: e?.status || 403 });
  }
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: '请填写画像名称' }, { status: 400 });

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('passenger_profiles')
    .insert({
      name,
      description: body.description || null,
      background_url: body.background_url || null,
      is_active: body.is_active !== false,
      sort_order: Number(body.sort_order) || 0,
    })
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}