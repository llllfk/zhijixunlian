import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/lib/server-auth';

// 管理员：全部训练记录，支持按学生 userId / 筛选
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '无权限' }, { status: e?.status || 403 });
  }
  const userId = req.nextUrl.searchParams.get('userId');
  const db = getSupabaseClient();
  let query = db.from('training_records').select('*');
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ records: data });
}