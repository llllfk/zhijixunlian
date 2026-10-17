'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, FileText, Clock, User, Loader2 } from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { AuthProvider } from '@/components/auth';
import { apiGet } from '@/lib/client-api';
import { toast } from 'sonner';
import { TrainingRecord, RADAR_DIMENSIONS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DialogueTranscript } from '@/components/dialogue-transcript';

function scoreTone(v: number) {
  if (v >= 85) return 'text-emerald-400';
  if (v >= 70) return 'text-amber-300';
  return 'text-red-400';
}

function ResultInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<TrainingRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ record: TrainingRecord }>(`/api/trainings/${id}`)
      .then((d) => setRecord(d.record))
      .catch((e) => toast.error(e?.message || '加载总结失败'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AuthProvider requireAuth>
        <main className="flex min-h-screen items-center justify-center bg-slate-950">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        </main>
      </AuthProvider>
    );
  }

  if (!record?.result) {
    return (
      <AuthProvider requireAuth>
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-white">
          <p className="text-slate-400">未找到该次训练总结</p>
          <Link href="/records">
            <Button variant="outline">返回训练记录</Button>
          </Link>
        </main>
      </AuthProvider>
    );
  }

  const dims = record.result.dimensions;
  const chartData = RADAR_DIMENSIONS.map((k) => ({ dimension: k, 得分: dims[k] ?? 0 }));

  const total = record.score ?? record.result.total_score;

  return (
    <AuthProvider requireAuth>
      <main className="min-h-screen bg-slate-950 pb-24 text-white">
        {/* 顶部 */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-slate-950/85 px-4 py-4 backdrop-blur">
          <button onClick={() => router.back()} className="rounded-lg p-1 hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">训练总结</h1>
        </header>

        {/* 总分卡片 */}
        <div className="mx-auto max-w-md px-4 pt-6">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/15 to-blue-600/10 p-6 text-center">
            <p className="text-sm text-slate-300">综合得分</p>
            <div className="mt-2 text-5xl font-extrabold tabular-nums">{total}</div>
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                通话 {Math.floor((record.duration_seconds || 0) / 60)} 分 {record.duration_seconds % 60} 秒
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {record.profile_name || '旅客'}
              </span>
            </div>
          </div>
        </div>

        {/* 雷达图 */}
        <div className="mx-auto max-w-md px-4 pt-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <h2 className="px-2 pb-2 text-sm font-semibold text-slate-300">能力维度雷达</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="72%">
                  <PolarGrid stroke="rgba(255,255,255,0.15)" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} />
                  <Radar dataKey="得分" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.35} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 px-1">
              {RADAR_DIMENSIONS.map((k) => (
                <div key={k} className="flex items-center justify-between rounded-xl bg-white/[0.05] px-3 py-2">
                  <span className="text-xs text-slate-400">{k}</span>
                  <span className={`text-sm font-bold tabular-nums ${scoreTone(dims[k] ?? 0)}`}>{dims[k] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 改进建议 */}
        <div className="mx-auto max-w-md px-4 pt-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="pb-2 text-sm font-semibold text-slate-300">改进建议</h2>
            <ul className="space-y-2.5">
              {(record.result.suggestions || []).map((s, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-200">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 对话回放 */}
        <div className="mx-auto max-w-md px-4 pb-4 pt-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="pb-3 text-sm font-semibold text-slate-300">对话记录</h2>
            <DialogueTranscript
              messages={record.result.transcript}
              passengerName={record.profile_name || '旅客'}
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-slate-950/85 px-4 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-md gap-3">
            <Button variant="outline" className="flex-1 border-white/15 bg-transparent" onClick={() => router.push('/records')}>
              <FileText className="mr-1.5 h-4 w-4" />
              查看训练记录
            </Button>
            {record.profile_id && (
              <Button className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600" onClick={() => router.push(`/call/${record.profile_id}`)}>
                <RotateCcw className="mr-1.5 h-4 w-4" />
                再练一次
              </Button>
            )}
          </div>
        </div>
      </main>
    </AuthProvider>
  );
}

export default ResultInner;