import { NextRequest, NextResponse } from 'next/server';
import { ensureDb, getPool } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { signSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!name || !email || !password) return NextResponse.json({ error: '请填写姓名、账号与密码' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 });

  await ensureDb();
  const exists = await getPool().query('SELECT id FROM user_profiles WHERE email = $1', [email]);
  if ((exists.rowCount || 0) > 0) return NextResponse.json({ error: '该账号已注册' }, { status: 409 });

  const id = crypto.randomUUID();
  await getPool().query(
    `INSERT INTO user_profiles (id, email, password_hash, name, role) VALUES ($1,$2,$3,$4,'user')`,
    [id, email, hashPassword(password), name]
  );
  return NextResponse.json({
    token: signSession(id),
    user: { id, email, name, role: 'user', is_active: true },
  });
}
