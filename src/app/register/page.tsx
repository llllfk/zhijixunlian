'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plane, Phone, Lock, User, Loader2 } from 'lucide-react';
import { apiSend, setSessionToken } from '@/lib/client-api';
import { isValidCnMobile, normalizePhone } from '@/lib/phone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const phoneNorm = normalizePhone(phone);
    if (!name.trim() || !phoneNorm || !password) {
      toast.error('请填写姓名、手机号与密码');
      return;
    }
    if (!isValidCnMobile(phoneNorm)) {
      toast.error('请输入正确的11位手机号');
      return;
    }
    if (password.length < 6) {
      toast.error('密码至少 6 位');
      return;
    }
    if (password !== confirm) {
      toast.error('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      const data = await apiSend<{ token: string }>('/api/auth/register', 'POST', {
        name: name.trim(),
        phone: phoneNorm,
        password,
      });
      setSessionToken(data.token);
      toast.success('注册成功，已自动登录');
      router.push('/');
    } catch (err: any) {
      toast.error(err?.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 top-6 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -left-16 bottom-16 h-80 w-80 rounded-full bg-blue-600/25 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-sky-500/30">
            <Plane className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">创建学员账号</h1>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-xl backdrop-blur-md">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-slate-300">
              姓名
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入真实姓名"
                className="border-white/10 bg-slate-900/60 pl-9 text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-slate-300">
              手机号
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="请输入11位手机号"
                className="border-white/10 bg-slate-900/60 pl-9 text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-300">
              密码
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                className="border-white/10 bg-slate-900/60 pl-9 text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-slate-300">
              确认密码
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="再次输入密码"
                className="border-white/10 bg-slate-900/60 pl-9 text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            注 册
          </Button>

          <p className="text-center text-sm text-slate-400">
            已有账号？
            <Link href="/login" className="ml-1 font-medium text-sky-400 hover:underline">
              去登录
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
