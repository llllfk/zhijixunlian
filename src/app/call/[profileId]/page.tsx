'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, PhoneOff, Mic, MicOff, Loader2, Send } from 'lucide-react';
import { AuthProvider } from '@/components/auth';
import { apiGet, apiSend, getSessionToken } from '@/lib/client-api';
import { toast } from 'sonner';
import { DialogueMsg, PassengerProfile } from '@/lib/types';

type Stage = 'idle' | 'ringing' | 'connected' | 'saving';
type CallMode = 'voice' | 'text';

function pickContent(event: unknown): string {
  const e = event as { data?: { content?: string; text?: string }; content?: string };
  return String(e?.data?.content || e?.data?.text || e?.content || '').trim();
}

function pickConversationId(event: unknown): string | null {
  const e = event as { data?: { conversation_id?: string }; conversation_id?: string };
  return e?.data?.conversation_id || e?.conversation_id || null;
}

function CallInner() {
  const { profileId } = useParams<{ profileId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<PassengerProfile | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [mode, setMode] = useState<CallMode>('text');
  const [duration, setDuration] = useState(0);
  const [messages, setMessages] = useState<DialogueMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [livePassenger, setLivePassenger] = useState('');
  const [liveStudent, setLiveStudent] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const voiceClientRef = useRef<any>(null);
  const messagesRef = useRef<DialogueMsg[]>([]);
  const passengerBufRef = useRef('');
  messagesRef.current = messages;

  useEffect(() => {
    apiGet<{ profiles: PassengerProfile[] }>('/api/profiles')
      .then((d) => {
        const p = d.profiles?.find((x) => x.id === profileId);
        if (p) setProfile(p);
      })
      .catch((e) => toast.error(e?.message || '加载画像失败'));
  }, [profileId]);

  useEffect(() => {
    if (stage === 'connected') {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      void voiceClientRef.current?.disconnect?.().catch(() => undefined);
      voiceClientRef.current = null;
    };
  }, []);

  function pushMsg(role: DialogueMsg['role'], content: string) {
    if (!content.trim()) return;
    setMessages((prev) => [...prev, { role, content: content.trim(), ts: Date.now() }]);
  }

  async function consumeSse(res: Response) {
    if (!res.ok || !res.body) {
      let msg = '通话连接失败';
      try {
        const j = await res.json();
        if (j?.message || j?.error) msg = j.message || j.error;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let gotPassenger = false;
    let deltaAcc = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
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
        if (obj?.type === 'meta' && obj.conversationId) setConversationId(String(obj.conversationId));
        if (obj?.type === 'passenger_delta' && typeof obj.content === 'string') {
          deltaAcc += obj.content;
          setLivePassenger(deltaAcc);
        }
        if (obj?.type === 'passenger' && typeof obj.content === 'string') {
          gotPassenger = true;
          deltaAcc = '';
          setLivePassenger('');
          pushMsg('passenger', obj.content);
        }
        if (obj?.type === 'error') toast.error(obj.message || '对话出错');
      }
    }

    if (!gotPassenger && deltaAcc.trim()) {
      pushMsg('passenger', deltaAcc.trim());
      setLivePassenger('');
    }
  }

  async function startVoiceCall() {
    const token = await getSessionToken();
    const qs = new URLSearchParams({
      profileName: profile?.name || '',
      description: profile?.description || '',
    });
    const cfgRes = await fetch(`/api/coze/voice-config?${qs}`, {
      headers: token ? { 'x-session': token } : {},
    });
    const cfg = await cfgRes.json();
    if (!cfgRes.ok || !cfg.enabled) {
      throw new Error(cfg.error || '语音未启用');
    }

    const { WsChatClient, WsChatEventNames, WsToolsUtils } = await import('@coze/api/ws-tools');
    const permission = await WsToolsUtils.checkDevicePermission();
    if (!permission.audio) {
      throw new Error('需要麦克风权限，请在浏览器中允许后重试');
    }

    const client = new WsChatClient({
      token: cfg.token,
      botId: cfg.botId,
      baseWsURL: cfg.baseWsURL || 'wss://ws.coze.cn',
      voiceId: cfg.voiceId,
      allowPersonalAccessTokenInBrowser: true,
      audioMutedDefault: false,
      audioCaptureConfig: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    client.on(WsChatEventNames.ERROR, (_n: string, event: unknown) => {
      const msg = (event as any)?.data?.msg || (event as any)?.message || '语音连接异常';
      toast.error(String(msg));
    });
    client.on(WsChatEventNames.SERVER_ERROR, (_n: string, event: unknown) => {
      toast.error(pickContent(event) || '扣子语音服务报错');
    });
    client.on(WsChatEventNames.CONVERSATION_CHAT_CREATED, (_n: string, event: unknown) => {
      const cid = pickConversationId(event);
      if (cid) setConversationId(cid);
    });
    client.on(WsChatEventNames.CONVERSATION_MESSAGE_DELTA, (_n: string, event: unknown) => {
      const piece = pickContent(event);
      if (!piece) return;
      const cid = pickConversationId(event);
      if (cid) setConversationId(cid);
      passengerBufRef.current += piece;
      setLivePassenger(passengerBufRef.current);
    });
    client.on(WsChatEventNames.CONVERSATION_MESSAGE_COMPLETED, (_n: string, event: unknown) => {
      const full = pickContent(event) || passengerBufRef.current;
      passengerBufRef.current = '';
      setLivePassenger('');
      const role = (event as any)?.data?.role;
      // 开场用文本注入画像，不记入学员发言
      if (role === 'user' || full.includes('系统提示')) return;
      pushMsg('passenger', full);
    });
    client.on(WsChatEventNames.CONVERSATION_AUDIO_TRANSCRIPT_UPDATE, (_n: string, event: unknown) => {
      setLiveStudent(pickContent(event));
    });
    client.on(WsChatEventNames.CONVERSATION_AUDIO_TRANSCRIPT_COMPLETED, (_n: string, event: unknown) => {
      const text = pickContent(event);
      setLiveStudent('');
      pushMsg('agent', text);
    });
    client.on(WsChatEventNames.INPUT_AUDIO_BUFFER_SPEECH_STARTED, () => setSpeaking(true));
    client.on(WsChatEventNames.INPUT_AUDIO_BUFFER_SPEECH_STOPPED, () => setSpeaking(false));

    await client.connect();
    voiceClientRef.current = client;
    setMode('voice');
    setMicOn(true);
    setStage('connected');

    // 接通后用文本注入画像开场，旅客用语音回复
    if (cfg.kickoff) {
      setTimeout(() => {
        try {
          client.sendTextMessage(cfg.kickoff);
        } catch {
          /* ignore */
        }
      }, 400);
    }
  }

  async function startTextCall() {
    const token = await getSessionToken();
    const controller = new AbortController();
    abortRef.current = controller;
    const qs = new URLSearchParams({
      profileName: profile?.name || '',
      description: profile?.description || '',
    });
    const res = await fetch(`/api/coze/call?${qs}`, {
      headers: token ? { 'x-session': token } : {},
      signal: controller.signal,
    });
    setMode('text');
    setStage('connected');
    await consumeSse(res);
  }

  async function startCall() {
    setStage('ringing');
    setDuration(0);
    setMessages([]);
    setConversationId(null);
    setLivePassenger('');
    setLiveStudent('');
    passengerBufRef.current = '';
    try {
      await startVoiceCall();
    } catch (voiceErr: any) {
      console.warn('voice fallback to text', voiceErr);
      toast.message(voiceErr?.message || '语音暂不可用，已切文字对话');
      try {
        await startTextCall();
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        toast.error(e?.message || '通话连接失败');
        setStage('idle');
      }
    }
  }

  async function sendStudentLine() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    pushMsg('agent', text);
    try {
      if (mode === 'voice' && voiceClientRef.current) {
        voiceClientRef.current.sendTextMessage(text);
        return;
      }
      const token = await getSessionToken();
      const controller = new AbortController();
      abortRef.current = controller;
      const res = await fetch('/api/coze/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session': token } : {}),
        },
        body: JSON.stringify({
          conversationId,
          message: text,
          profileName: profile?.name || '',
        }),
        signal: controller.signal,
      });
      await consumeSse(res);
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error(e?.message || '发送失败');
    } finally {
      setSending(false);
    }
  }

  async function toggleMic() {
    if (!voiceClientRef.current || mode !== 'voice') return;
    try {
      const next = !micOn;
      await voiceClientRef.current.setAudioEnable(next);
      setMicOn(next);
    } catch (e: any) {
      toast.error(e?.message || '麦克风切换失败');
    }
  }

  async function hangUp() {
    abortRef.current?.abort();
    if (timerRef.current) clearInterval(timerRef.current);
    setStage('saving');
    try {
      await voiceClientRef.current?.disconnect?.();
    } catch {
      /* ignore */
    }
    voiceClientRef.current = null;

    try {
      const data = await apiSend<{ record: { id: string } }>('/api/trainings', 'POST', {
        profileId: profile?.id || null,
        profileName: profile?.name || null,
        durationSeconds: duration,
        dialogue: messagesRef.current,
      });
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
      <div className="absolute inset-0">
        {bg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bg} alt={profile?.name || '旅客'} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-sky-800/70 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/70" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-4 pt-5">
        <button
          onClick={() => {
            if (stage === 'connected') hangUp();
            else if (stage === 'ringing') {
              abortRef.current?.abort();
              void voiceClientRef.current?.disconnect?.();
              setStage('idle');
            } else router.back();
          }}
          className="rounded-full bg-black/30 p-2 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="rounded-full bg-black/30 px-3 py-1.5 text-sm backdrop-blur">
          值机接待 · {profile?.name || '旅客'}
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center overflow-hidden px-6">
        {stage === 'idle' && (
          <div className="text-center">
            <p className="text-sm text-slate-200/90">旅客 {profile?.name} 在柜台前等待</p>
            <p className="mt-1 text-xs text-slate-300/70">接通后将开启实时语音（需麦克风权限）</p>
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
          </div>
        )}

        {stage === 'connected' && (
          <div className="flex w-full max-w-lg flex-1 flex-col items-center gap-3 overflow-hidden py-2">
            <div className="flex h-12 items-end justify-center gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1.5 animate-wave rounded-full bg-sky-300/80"
                  style={{ animationDelay: `${i * 120}ms`, height: `${12 + ((i * 37) % 28)}px` }}
                />
              ))}
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold tabular-nums">{fmt(duration)}</div>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                {mode === 'voice' ? '语音通话中' : '文字通话中'}
                {speaking ? ' · 正在听你说' : ''}
              </p>
            </div>

            <div className="mt-1 w-full flex-1 space-y-2 overflow-y-auto pb-2">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'agent' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm backdrop-blur ${
                      m.role === 'agent' ? 'rounded-br-md bg-emerald-600/80' : 'rounded-bl-md bg-black/50'
                    }`}
                  >
                    <span className="mb-0.5 block text-[10px] font-medium opacity-80">
                      {m.role === 'agent' ? '我（值机员）' : `${profile?.name || '旅客'}（旅客）`}
                    </span>
                    {m.content}
                  </div>
                </div>
              ))}
              {livePassenger && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-black/50 px-3.5 py-2 text-sm backdrop-blur">
                    <span className="mb-0.5 block text-[10px] font-medium text-sky-300">旅客正在说…</span>
                    {livePassenger}
                  </div>
                </div>
              )}
              {liveStudent && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-emerald-600/50 px-3.5 py-2 text-sm backdrop-blur">
                    <span className="mb-0.5 block text-[10px] font-medium opacity-80">识别中…</span>
                    {liveStudent}
                  </div>
                </div>
              )}
              {messages.length === 0 && !livePassenger && (
                <p className="mt-3 text-center text-xs text-slate-300/70">请对着麦克风说话，或下方打字辅助</p>
              )}
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

      <div className="relative z-10 flex flex-col items-center gap-3 px-6 pb-8">
        {stage === 'idle' && (
          <button
            onClick={startCall}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-xl shadow-emerald-500/40 transition active:scale-95"
          >
            <Phone className="h-8 w-8 text-white" />
          </button>
        )}
        {stage === 'ringing' && (
          <button
            onClick={() => {
              abortRef.current?.abort();
              void voiceClientRef.current?.disconnect?.();
              setStage('idle');
            }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-600 shadow-lg transition active:scale-95"
          >
            <PhoneOff className="h-6 w-6 text-white" />
          </button>
        )}
        {stage === 'connected' && (
          <>
            <form
              className="flex w-full max-w-lg items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendStudentLine();
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={mode === 'voice' ? '也可打字辅助发言…' : '输入值机员话术，回车发送…'}
                className="flex-1 rounded-full border border-white/15 bg-black/40 px-4 py-2.5 text-sm outline-none backdrop-blur placeholder:text-slate-400"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500 disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
            <div className="flex items-center gap-4">
              {mode === 'voice' && (
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition active:scale-95 ${
                    micOn ? 'bg-sky-500' : 'bg-slate-600'
                  }`}
                >
                  {micOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                </button>
              )}
              <button
                onClick={hangUp}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-xl shadow-red-500/40 transition active:scale-95"
              >
                <PhoneOff className="h-6 w-6 text-white" />
              </button>
            </div>
            <p className="text-xs text-slate-300/80">
              {mode === 'voice' ? (micOn ? '麦克风已开，请用普通话作答' : '麦克风已静音') : '文字模式'} · 挂断后生成训练总结
            </p>
          </>
        )}
        {stage === 'saving' && <div className="h-16" />}
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
