'use client';

// 前端登录态工具：统一从 supabase 浏览器客户端获取 session 与当前用户
import { getSupabaseBrowserClientWithRetry, getSupabaseBrowserClientAsync } from '@/lib/supabase-browser';

export async function getSessionToken(): Promise<string | null> {
  const supabase = await getSupabaseBrowserClientWithRetry();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const token = await getSessionToken();
  const res = await fetch(path, {
    headers: token ? { 'x-session': token } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `请求失败(${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function apiSend<T = unknown>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  data?: unknown
): Promise<T> {
  const token = await getSessionToken();
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-session': token } : {}),
    },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `请求失败(${res.status})`);
  }
  return res.json() as Promise<T>;
}

export { getSupabaseBrowserClientAsync };
export { getSupabaseBrowserClientWithRetry };