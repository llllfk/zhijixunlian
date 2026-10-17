import { DialogueMsg } from '@/lib/types';

function fmtTime(ts?: number) {
  if (!ts) return '';
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function DialogueTranscript({
  messages,
  passengerName = '旅客',
  emptyText = '暂无对话记录',
  className = '',
}: {
  messages?: DialogueMsg[] | null;
  passengerName?: string;
  emptyText?: string;
  className?: string;
}) {
  const list = Array.isArray(messages) ? messages.filter((m) => m?.content?.trim()) : [];

  if (!list.length) {
    return <p className={`text-sm text-slate-400 ${className}`}>{emptyText}</p>;
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {list.map((m, i) => {
        const isStudent = m.role === 'agent';
        return (
          <div key={`${m.ts || i}-${i}`} className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                isStudent
                  ? 'rounded-br-md bg-emerald-500/20 text-emerald-50'
                  : 'rounded-bl-md bg-white/10 text-slate-100'
              }`}
            >
              <div className="mb-0.5 flex items-center gap-2 text-[11px] opacity-70">
                <span>{isStudent ? '学员（值机员）' : `${passengerName}（旅客）`}</span>
                {m.ts ? <span>{fmtTime(m.ts)}</span> : null}
              </div>
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
