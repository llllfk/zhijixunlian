'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Phone, FileText, LogOut, ShieldCheck } from 'lucide-react';
import { AuthProvider, useAuth } from '@/components/auth';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';

function HomeInner() {
  const { user } = useAuth();
  const router = useRouter();

  async function logout() {
    const supabase = await getSupabaseBrowserClientWithRetry();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950 text-white">
      {/* 背景 */}
      <div className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-10 h-80 w-80 rounded-full bg-blue-600/15 blur-3xl" />

      {/* 顶部 */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-6">
        <div>
          <p className="text-sm text-slate-400">你好，</p>
          <h1 className="mt-0.5 flex items-center gap-2 text-xl font-bold">
            {user?.name || '学员'}
            {user?.role === 'admin' && <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-xs font-medium text-amber-300">管理员</span>}
          </h1>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10">
          <LogOut className="h-4 w-4" />
          退出
        </button>
      </header>

      <div className="relative z-10 flex flex-1 flex-col justify-center gap-5 px-5 pb-12">
        <div className="text-center">
          <p className="text-3xl font-extrabold leading-snug">
            通关值机
            <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">服务通关训练</span>
          </p>
          <p className="mt-2 text-sm text-slate-400">模拟接听旅客电话，边练边学，AI 实时评价</p>
        </div>

        {/* 主入口：开始训练 */}
        <Link href="/train" className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/20 to-blue-600/20 p-6 backdrop-blur transition hover:from-sky-500/30 hover:to-blue-600/30">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/90 shadow-lg shadow-sky-500/30">
              <Phone className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">开始训练</h2>
              <p className="text-sm text-slate-300">选择旅客画像，拨打一通值机电话</p>
            </div>
            <span className="text-2xl text-slate-300 transition group-hover:translate-x-1">›</span>
          </div>
        </Link>

        {/* 次入口：训练记录 */}
        <Link href="/records" className="group rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur transition hover:bg-white/[0.09]">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <FileText className="h-7 w-7 text-sky-300" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">我的训练结果</h2>
              <p className="text-sm text-slate-400">查看历史场次、评分与改进建议</p>
            </div>
            <span className="text-2xl text-slate-500 transition group-hover:translate-x-1">›</span>
          </div>
        </Link>

        {user?.role === 'admin' && (
          <Link href="/admin" className="group rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5 backdrop-blur transition hover:bg-amber-400/20">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20">
                <ShieldCheck className="h-6 w-6 text-amber-300" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold">管理后台</h2>
                <p className="text-sm text-amber-200/70">账号、画像与训练记录管理</p>
              </div>
              <span className="text-2xl text-amber-200/60">›</span>
            </div>
          </Link>
        )}
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <AuthProvider requireAuth>
      <HomeInner />
    </AuthProvider>
  );
}