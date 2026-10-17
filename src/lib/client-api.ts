'use client';

const TOKEN_KEY = 'zj_session';

export function getSessionTokenSync(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export async function getSessionToken(): Promise<string | null> {
  return getSessionTokenSync();
}

export function setSessionToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken() {
  localStorage.removeItem(TOKEN_KEY);
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
