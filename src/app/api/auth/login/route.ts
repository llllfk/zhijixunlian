import { NextRequest, NextResponse } from 'next/server';
import { ensureDb, getPool } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { signSession } from '@/lib/session';
import { isValidCnMobile, normalizePhone } from '@/lib/phone';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const account = String(body.phone || body.email || body.account || '').trim();
    const password = String(body.password || '');
    if (!account || !password) {
      return NextResponse.json({ error: '请输入手机号与密码' }, { status: 400 });
    }

    await ensureDb();

    const phone = normalizePhone(account);
    let rows;
    if (isValidCnMobile(phone)) {
      ({ rows } = await getPool().query(
        `SELECT id, email, phone, name, role, is_active, password_hash FROM user_profiles WHERE phone = $1 LIMIT 1`,
        [phone]
      ));
    } else {
      // 兼容管理员邮箱账号
      ({ rows } = await getPool().query(
        `SELECT id, email, phone, name, role, is_active, password_hash FROM user_profiles WHERE email = $1 LIMIT 1`,
        [account.toLowerCase()]
      ));
    }

    const user = rows[0];
    if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
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
        phone: user.phone,
        name: user.name,
        role: user.role,
        is_active: user.is_active,
      },
    });
  } catch (e: unknown) {
    console.error('[login]', e);
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 });
  }
}
