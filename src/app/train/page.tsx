'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Loader2 } from 'lucide-react';
import { AuthProvider } from '@/components/auth';
import { apiGet } from '@/lib/client-api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Profile {
  id: string;
  name: string;
  description: string;
  background_url: string | null;
}

function TrainInner() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ profiles: Profile[] }>('/api/profiles')
      .then((d) => setProfiles(d.profiles ?? []))
      .catch((e) => toast.error(e?.message || '加载画像失败'))
      .finally(() => setLoading(false));
  }, []);

  function pick(p: Profile) {
    router.push(`/call/${p.id}`);
  }

  return (
    <main className="relative min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-slate-950/80 px-4 py-4 backdrop-blur">
        <button onClick={() => router.back()} className="rounded-lg p-1 hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold">选择旅客画像</h1>
          <p className="text-xs text-slate-400">选择一位旅客，开始模拟办理值机</p>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-4 px-4 py-5 pb-24">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-3xl bg-white/5" />)
        ) : (
          <>
            <p className="px-1 text-xs text-slate-500">旅客已经在等待值机，可以选择一位开始办理</p>
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => pick(p)}
                className="group relative block h-40 w-full overflow-hidden rounded-3xl border border-white/10 text-left shadow-lg transition active:scale-[0.99]"
              >
                {p.background_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.background_url} alt={p.name} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-600/70 to-slate-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{p.name}</h2>
                      <p className="mt-1 text-sm text-slate-200/90">{p.description}</p>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur transition group-hover:bg-sky-500/90">
                      <Phone className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/60">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        </div>
      )}
    </main>
  );
}

export default function TrainPage() {
  return (
    <AuthProvider requireAuth>
      <TrainInner />
    </AuthProvider>
  );
}