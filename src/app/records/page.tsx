'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, User, Loader2 } from 'lucide-react';
import { AuthProvider } from '@/components/auth';
import { apiGet } from '@/lib/client-api';
import { toast } from 'sonner';
import { TrainingRecord } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function scoreTone(v: number | null) {
  if (v == null) return 'text-slate-500';
  if (v >= 85) return 'text-emerald-400';
  if (v >= 70) return 'text-amber-300';
  return 'text-red-400';
}

function RecordsInner() {
  const router = useRouter();
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ records: TrainingRecord[] }>('/api/trainings')
      .then((d) => setRecords(d.records ?? []))
      .catch((e) => toast.error(e?.message || '加载记录失败'))
      .finally(() => setLoading(false));
  }, []);

  function fmtDate(s?: string) {
    if (!s) return '';
    const d = new Date(s);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}月${d.getDate()}日 ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  return (
    <AuthProvider requireAuth>
      <main className="min-h-screen bg-slate-950 text-white">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-slate-950/85 px-4 py-4 backdrop-blur">
          <button onClick={() => router.back()} className="rounded-lg p-1 hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">我的训练记录</h1>
          {!loading && <span className="ml-auto text-xs text-slate-500">{records.length} 场</span>}
        </header>

        <div className="mx-auto max-w-md space-y-3 px-4 py-5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/5" />)
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] py-14 text-center">
              <User className="h-10 w-10 text-slate-600" />
              <p className="text-slate-400">还没有训练记录</p>
              <button onClick={() => router.push('/train')} className="text-sm font-medium text-sky-400 hover:underline">
                去开始第一次训练 →
              </button>
            </div>
          ) : (
            records.map((r) => (
              <button
                key={r.id}
                onClick={() => router.push(`/result/${r.id}`)}
                className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.08]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15">
                  <User className="h-6 w-6 text-sky-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.profile_name || '旅客'}</span>
                      {r.teacher_comment?.trim() ? (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                          老师已点评
                        </span>
                      ) : null}
                    </div>
                    <span className={`shrink-0 text-lg font-bold tabular-nums ${scoreTone(r.score)}`}>{r.score ?? '—'}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span>{fmtDate(r.created_at)}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.floor((r.duration_seconds || 0) / 60)}:{String(r.duration_seconds % 60).padStart(2, '0')}
                    </span>
                  </div>
                </div>
                <span className="text-slate-600">›</span>
              </button>
            ))
          )}
        </div>
      </main>
    </AuthProvider>
  );
}

export default function RecordsPage() {
  return <RecordsInner />;
}