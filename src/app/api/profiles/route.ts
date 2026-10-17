import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { resolveAuth } from '@/lib/server-auth';
import { PassengerProfile } from '@/lib/types';

// 学员端：读取启用中的旅客画像（登录即可）
export async function GET(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  if (!ctx.is_active) return NextResponse.json({ error: '账号已被禁用' }, { status: 403 });

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('passenger_profiles')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ profiles: data as PassengerProfile[] });
}