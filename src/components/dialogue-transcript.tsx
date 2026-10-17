import { DialogueMsg } from '@/lib/types';

function isControlText(content: string) {
  const t = content.trim();
  return t.includes('generate_answer_finish') || t.includes('msg_type') || t.includes('finish_reason');
}

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
  tone = 'dark',
}: {
  messages?: DialogueMsg[] | null;
  passengerName?: string;
  emptyText?: string;
  className?: string;
  /** dark：深色页浅字；light：白底弹窗深字 */
  tone?: 'dark' | 'light';
}) {
  const list = Array.isArray(messages)
    ? messages.filter((m) => m?.content?.trim() && !isControlText(m.content))
    : [];

  if (!list.length) {
    return <p className={`text-sm ${tone === 'light' ? 'text-slate-600' : 'text-slate-400'} ${className}`}>{emptyText}</p>;
  }

  return (
    <div className={`min-w-0 space-y-2.5 overflow-x-hidden ${className}`}>
      {list.map((m, i) => {
        const isStudent = m.role === 'agent';
        const bubble =
          tone === 'light'
            ? isStudent
              ? 'rounded-br-md bg-emerald-100 text-emerald-950'
              : 'rounded-bl-md bg-slate-100 text-slate-900'
            : isStudent
              ? 'rounded-br-md bg-emerald-500/20 text-emerald-50'
              : 'rounded-bl-md bg-white/10 text-slate-100';
        return (
          <div key={`${m.ts || i}-${i}`} className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${bubble}`}>
              <div className="mb-0.5 flex items-center gap-2 text-[11px] opacity-70">
                <span>{isStudent ? '学员（值机员）' : `${passengerName}（旅客）`}</span>
                {m.ts ? <span>{fmtTime(m.ts)}</span> : null}
              </div>
              <p className="whitespace-pre-wrap break-all">{m.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
