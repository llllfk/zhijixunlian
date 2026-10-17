import { NextRequest } from 'next/server';
import { ensureDb, getPool } from './db';
import { readSession } from './session';

export interface AuthContext {
  user_id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: 'user' | 'admin';
  is_active: boolean;
}

export async function resolveAuth(req: NextRequest): Promise<AuthContext | null> {
  const token = req.headers.get('x-session');
  const session = readSession(token);
  if (!session) return null;
  await ensureDb();
  const { rows } = await getPool().query(
    'SELECT id, email, phone, name, role, is_active FROM user_profiles WHERE id = $1',
    [session.uid]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    user_id: row.id,
    email: row.email,
    phone: row.phone,
    name: row.name,
    role: row.role === 'admin' ? 'admin' : 'user',
    is_active: row.is_active,
  };
}

export async function requireAdmin(req: NextRequest): Promise<AuthContext> {
  const ctx = await resolveAuth(req);
  if (!ctx) throw Object.assign(new Error('请先登录'), { status: 401 });
  if (ctx.role !== 'admin') throw Object.assign(new Error('无权限'), { status: 403 });
  return ctx;
}
