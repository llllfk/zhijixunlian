import { NextRequest, NextResponse } from 'next/server';
import { ensureDb, getPool } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { signSession } from '@/lib/session';
import { assertCnMobile } from '@/lib/phone';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    const password = String(body.password || '');
    const phoneRaw = String(body.phone || body.email || '');

    if (!name || !phoneRaw || !password) {
      return NextResponse.json({ error: '请填写姓名、手机号与密码' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 });
    }

    let phone: string;
    try {
      phone = assertCnMobile(phoneRaw);
    } catch (e: unknown) {
      const err = e as { message?: string; status?: number };
      return NextResponse.json({ error: err.message || '手机号格式不正确' }, { status: err.status || 400 });
    }

    await ensureDb();
    const exists = await getPool().query('SELECT id FROM user_profiles WHERE phone = $1', [phone]);
    if ((exists.rowCount || 0) > 0) {
      return NextResponse.json({ error: '该手机号已注册' }, { status: 409 });
    }

    const id = crypto.randomUUID();
    await getPool().query(
      `INSERT INTO user_profiles (id, phone, password_hash, name, role) VALUES ($1,$2,$3,$4,'user')`,
      [id, phone, hashPassword(password), name]
    );

    return NextResponse.json({
      token: signSession(id),
      user: { id, phone, email: null, name, role: 'user', is_active: true },
    });
  } catch (e: unknown) {
    console.error('[register]', e);
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
  }
}
