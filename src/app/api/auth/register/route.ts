import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { resolveAuth } from '@/lib/server-auth';

// 注册第二步：前端 supabase.auth.signUp 成功后，用此接口创建业务档案（姓名/角色）
export async function POST(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  let name: string;
  try {
    const body = await req.json();
    name = String(body?.name || '').trim();
  } catch {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }
  if (!name) return NextResponse.json({ error: '请填写姓名' }, { status: 400 });

  const db = getSupabaseClient(); // service role
  await db.from('user_profiles').upsert(
    { id: ctx.user_id, name, role: 'user', is_active: true, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  );

  return NextResponse.json({ ok: true, user: { id: ctx.user_id, name, role: 'user' } });
}