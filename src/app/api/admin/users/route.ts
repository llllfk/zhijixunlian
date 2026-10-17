import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/lib/server-auth';
import { UserProfileInfo } from '@/lib/types';

// 账号列表：业务档案 + email（来自 auth.users）
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '无权限' }, { status: e?.status || 403 });
  }

  const db = getSupabaseClient();
  const { data: profiles, error } = await db
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 补 email
  const emailById: Record<string, string> = {};
  try {
    const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of users?.users || []) {
      emailById[u.id] = u.email || '';
    }
  } catch {
    /* 忽略邮件拉取失败 */
  }

  const list: UserProfileInfo[] = (profiles as UserProfileInfo[]).map((p) => ({
    ...p,
    email: emailById[p.id] || '',
  }));
  return NextResponse.json({ users: list });
}