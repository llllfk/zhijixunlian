import { NextRequest, NextResponse } from 'next/server';
import { resolveAuth } from '@/lib/server-auth';

export async function GET(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  return NextResponse.json({
    user: {
      id: ctx.user_id,
      email: ctx.email,
      phone: ctx.phone,
      name: ctx.name,
      role: ctx.role,
      is_active: ctx.is_active,
    },
  });
}