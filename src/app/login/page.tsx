'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plane, Phone, Lock, Loader2 } from 'lucide-react';
import { apiSend, setSessionToken } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !password) {
      toast.error('请输入手机号与密码');
      return;
    }
    setLoading(true);
    try {
      const data = await apiSend<{ token: string; user: { role: string } }>('/api/auth/login', 'POST', {
        phone: account.trim(),
        password,
      });
      setSessionToken(data.token);
      toast.success('登录成功');
      if (data.user?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      toast.error(err?.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -right-16 bottom-16 h-80 w-80 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-64 w-[120%] -translate-x-1/2 rotate-12 bg-white/[0.03] blur-2xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-sky-500/30">
            <Plane className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">空港值机语音陪练</h1>
            <p className="mt-1 text-sm text-slate-400">民航旅客地面服务 · 值机柜台训练</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-xl backdrop-blur-md">
          <div className="space-y-1.5">
            <Label htmlFor="account" className="text-slate-300">
              手机号
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="account"
                type="tel"
                inputMode="numeric"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
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
                placeholder="••••••••"
                className="border-white/10 bg-slate-900/60 pl-9 text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            登 录
          </Button>

          <p className="text-center text-sm text-slate-400">
            还没有账号？
            <Link href="/register" className="ml-1 font-medium text-sky-400 hover:underline">
              立即注册
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
