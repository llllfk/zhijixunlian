import { NextRequest, NextResponse } from 'next/server';
import { ensureDb, getPool } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { signSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) {
    return NextResponse.json({ error: '请输入账号与密码' }, { status: 400 });
  }

  await ensureDb();
  const { rows } = await getPool().query(
    `SELECT id, email, name, role, is_active, password_hash FROM user_profiles WHERE email = $1 LIMIT 1`,
    [email]
  );
  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
  }
  if (!user.is_active) {
    return NextResponse.json({ error: '账号已被禁用' }, { status: 403 });
  }

  return NextResponse.json({
    token: signSession(user.id),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active,
    },
  });
}
