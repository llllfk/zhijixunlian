import { createHmac, timingSafeEqual } from 'crypto';

function secret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.ZJ_API_TOKEN ||
    process.env.COZE_WORKLOAD_API_TOKEN ||
    'zhiji-dev-session'
  );
}

/** 签发简易会话 token：uid.exp.sig */
export function signSession(uid: string, ttlSeconds = 60 * 60 * 24 * 14): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${uid}.${exp}`;
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function readSession(token: string | null | undefined): { uid: string; exp: number } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [uid, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!uid || !Number.isFinite(exp)) return null;
  if (exp < Math.floor(Date.now() / 1000)) return null;
  const payload = `${uid}.${expStr}`;
  const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { uid, exp };
}
