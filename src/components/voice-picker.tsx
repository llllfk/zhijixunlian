'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Pause, Play, Volume2 } from 'lucide-react';
import { apiGet } from '@/lib/client-api';
import { VoiceOption } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Props = {
  value: string;
  onChange: (voiceId: string) => void;
};

const PREVIEW_TIP = '暂不可试听，选择保存后会直接生效';

export function VoicePicker({ value, onChange }: Props) {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    apiGet<{ voices: VoiceOption[] }>('/api/admin/voices')
      .then((d) => setVoices(d.voices ?? []))
      .catch(() => setVoices([]))
      .finally(() => setLoading(false));
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  function stopPlay() {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingId(null);
  }

  function preview(v: VoiceOption) {
    if (playingId === v.id) {
      stopPlay();
      return;
    }
    if (!v.previewUrl) {
      toast.message(PREVIEW_TIP);
      return;
    }
    stopPlay();
    const audio = new Audio(v.previewUrl);
    audioRef.current = audio;
    setPlayingId(v.id);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      setPlayingId(null);
      toast.message(PREVIEW_TIP);
    };
    void audio.play().catch(() => {
      setPlayingId(null);
      toast.message(PREVIEW_TIP);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        正在加载音色…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-slate-800">旅客音色</Label>
      <p className="text-xs text-slate-500">点选名称选用；界面不展示音色编号。</p>
      <div className="max-h-52 space-y-1.5 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
        <button
          type="button"
          onClick={() => onChange('')}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
            !value ? 'bg-sky-100 text-sky-950 ring-1 ring-sky-300' : 'bg-white text-slate-800 hover:bg-slate-100'
          }`}
        >
          <span className="flex items-center gap-2 font-medium">
            <Volume2 className="h-3.5 w-3.5 opacity-60" />
            默认音色
          </span>
          <span className="text-[11px] text-slate-500">环境变量</span>
        </button>
        {voices.map((v) => {
          const selected = value === v.id;
          return (
            <div
              key={v.id}
              className={`flex items-center gap-1 rounded-lg px-1 py-0.5 ${
                selected ? 'bg-sky-100 ring-1 ring-sky-300' : 'bg-white hover:bg-slate-100'
              }`}
            >
              <button
                type="button"
                onClick={() => onChange(v.id)}
                className="min-w-0 flex-1 px-2 py-2 text-left text-sm text-slate-900"
              >
                <span className="block truncate font-medium">{v.name}</span>
                <span className="block text-[11px] text-slate-500">
                  {v.language || '音色'}
                  {v.isSystem ? ' · 系统' : ' · 自定义'}
                </span>
              </button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="shrink-0 text-slate-700"
                onClick={() => preview(v)}
                title="试听"
              >
                {playingId === v.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>
          );
        })}
        {!voices.length && (
          <p className="px-2 py-3 text-center text-xs text-slate-500">暂无可用音色</p>
        )}
      </div>
    </div>
  );
}
