import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface AuthContext {
  user_id: string;
  email: string | null;
  name: string;
  role: 'user' | 'admin';
  is_active: boolean;
}

/**
 * 从请求头 x-session 解析当前登录用户与其角色信息。
 * 不抛错，返回 null 表示未登录/认证失败。
 */
export async function resolveAuth(req: NextRequest): Promise<AuthContext | null> {
  const token = req.headers.get('x-session');
  if (!token) return null;

  const authClient = getSupabaseClient(token); // anon + token 校验身份
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return null;
  if (!user.email && !user.phone) return null;

  // 读取业务档案（服务端用 service_role，绕过 RLS）
  const db = getSupabaseClient();
  const { data: profile, error: pErr } = await db
    .from('user_profiles')
    .select('id, name, role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (pErr) throw pErr;

  if (!profile) {
    // 首次登录兜底：自动补充档案（如老用户）
    return {
      user_id: user.id,
      email: user.email ?? null,
      name: (user.user_metadata?.full_name as string) || user.email || '学员',
      role: 'user',
      is_active: true,
    };
  }

  return {
    user_id: user.id,
    email: user.email ?? null,
    name: profile.name,
    role: profile.role,
    is_active: profile.is_active,
  };
}

/** 校验管理员，未通过抛错由路由统一捕获 */
export async function requireAdmin(req: NextRequest): Promise<AuthContext> {
  const ctx = await resolveAuth(req);
  if (!ctx) throw Object.assign(new Error('请先登录'), { status: 401 });
  if (ctx.role !== 'admin') throw Object.assign(new Error('无权限'), { status: 403 });
  return ctx;
}