'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, PhoneOff, Mic, Loader2 } from 'lucide-react';
import { AuthProvider } from '@/components/auth';
import { apiGet, apiSend, getSessionToken } from '@/lib/client-api';
import { toast } from 'sonner';
import { DialogueMsg, PassengerProfile } from '@/lib/types';

type Stage = 'idle' | 'ringing' | 'connected' | 'saving';

function CallInner() {
  const { profileId } = useParams<{ profileId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<PassengerProfile | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [duration, setDuration] = useState(0);
  const [messages, setMessages] = useState<DialogueMsg[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<DialogueMsg[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    apiGet<{ profiles: PassengerProfile[] }>('/api/profiles')
      .then((d) => {
        const p = d.profiles?.find((x) => x.id === profileId);
        if (p) setProfile(p);
      })
      .catch((e) => toast.error(e?.message || '加载画像失败'));
  }, [profileId]);

  // 计时
  useEffect(() => {
    if (stage === 'connected') {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage]);

  // 清理
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function startCall() {
    setStage('ringing');
    setDuration(0);
    setMessages([]);
    try {
      const token = await getSessionToken();
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(`/api/coze/call?profileName=${encodeURIComponent(profile?.name || '')}`, {
        headers: token ? { 'x-session': token } : {},
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error('通话连接失败');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // 接通动画
      setStage('connected');

      const read = async () => {
        let done = false;
        try {
          while (!done) {
            const { value, done: d } = await reader.read();
            done = d;
            buffer += decoder.decode(value, { stream: !done });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';
            for (const part of parts) {
              const line = part.split('\n').find((l) => l.startsWith('data:'));
              if (!line) continue;
              let obj: any;
              try {
                obj = JSON.parse(line.slice(5));
              } catch {
                continue;
              }
              if (obj?.type === 'passenger' && typeof obj.content === 'string') {
                setMessages((prev) => [...prev, { role: 'passenger', content: obj.content, ts: Number(obj.ts) || Date.now() }]);
              }
            }
          }
        } catch {
          /* abort */
        }
      };
      read();
    } catch {
      toast.error('通话连接失败');
      setStage('idle');
    }
  }

  async function hangUp() {
    if (abortRef.current) abortRef.current.abort();
    if (timerRef.current) clearInterval(timerRef.current);
    setStage('saving');

    try {
      const data = await apiSend<{ record: { id: string } }>('/api/trainings', 'POST', {
        profileId: profile?.id || null,
        profileName: profile?.name || null,
        durationSeconds: duration,
        dialogue: messagesRef.current,
      });
      setSavedId(data.record.id);
      router.replace(`/result/${data.record.id}`);
    } catch (e: any) {
      toast.error(e?.message || '保存训练记录失败，请重试');
      setStage('connected');
    }
  }

  function fmt(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  const bg = profile?.background_url;

  return (
    <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-950 text-white">
      {/* 全屏旅客背景 */}
      <div className="absolute inset-0">
        {bg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bg} alt={profile?.name || '旅客'} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-sky-800/70 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/70" />
      </div>

      {/* 顶部信息 */}
      <header className="relative z-10 flex items-center justify-between px-4 pt-5">
        <button
          onClick={() => {
            if (stage === 'connected') {
              hangUp();
            } else if (stage === 'ringing') {
              abortRef.current?.abort();
              setStage('idle');
            } else {
              router.back();
            }
          }}
          className="rounded-full bg-black/30 p-2 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="rounded-full bg-black/30 px-3 py-1.5 text-sm backdrop-blur">值机接待 · {profile?.name || '旅客'}</div>
      </header>

      {/* 中间主区域 */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        {stage === 'idle' && (
          <div className="text-center">
            <p className="text-sm text-slate-200/90">旅客 {profile?.name} 在柜台前等待</p>
            <p className="mt-1 text-xs text-slate-300/70">接通后请以值机员身份耐心接待</p>
          </div>
        )}

        {stage === 'ringing' && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-sky-400/30" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/90">
                <Phone className="h-7 w-7 text-white" />
              </div>
            </div>
            <p className="font-semibold">正在接通旅客…</p>
            <p className="text-xs text-slate-300/70">{profile?.name} · 值机柜台</p>
          </div>
        )}

        {stage === 'connected' && (
          <div className="flex w-full flex-col items-center gap-4">
            {/* 声纹波形 */}
            <div className="flex h-16 items-end justify-center gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1.5 animate-wave rounded-full bg-sky-300/80"
                  style={{ animationDelay: `${i * 120}ms`, height: `${12 + ((i * 37) % 28)}px` }}
                />
              ))}
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold tabular-nums">{fmt(duration)}</div>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                通话中
              </p>
            </div>

            {/* 实时字幕 */}
            <div className="mt-2 w-full space-y-2">
              {messages.map((m, i) => (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-black/50 px-3.5 py-2 text-sm backdrop-blur">
                    <span className="mb-0.5 block text-[10px] font-medium text-sky-300">{profile?.name}（旅客）</span>
                    {m.content}
                  </div>
                </div>
              ))}
              {messages.length === 0 && <p className="mt-3 text-center text-xs text-slate-300/70">旅 客 正 在 说 话…</p>}
            </div>
          </div>
        )}

        {stage === 'saving' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
            <p className="font-semibold">正在生成训练评价…</p>
          </div>
        )}
      </div>

      {/* 底部操作区 */}
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 pb-10">
        {stage === 'idle' && (
          <button onClick={startCall} className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-xl shadow-emerald-500/40 transition active:scale-95">
            <Phone className="h-8 w-8 text-white" />
          </button>
        )}
        {stage === 'ringing' && (
          <button onClick={() => { abortRef.current?.abort(); setStage('idle'); }} className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-600 shadow-lg transition active:scale-95">
            <PhoneOff className="h-6 w-6 text-white" />
          </button>
        )}
        {stage === 'connected' && (
          <>
            <div className="flex items-center gap-2 text-xs text-slate-200/80">
              <Mic className="h-4 w-4 animate-pulse" />
              正在收音，请用普通话作答
            </div>
            <button onClick={hangUp} className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500 shadow-xl shadow-red-500/40 transition active:scale-95">
              <PhoneOff className="h-8 w-8 text-white" />
            </button>
            <p className="text-xs text-slate-300/80">点击挂断，生成训练总结</p>
          </>
        )}
        {stage === 'saving' && <div className="h-20" />}
      </div>
    </main>
  );
}

export default function CallPage() {
  return (
    <AuthProvider requireAuth>
      <CallInner />
    </AuthProvider>
  );
}