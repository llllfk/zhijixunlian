'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, getSessionToken } from '@/lib/client-api';

export interface MeProfile {
  id: string;
  email?: string | null;
  phone?: string | null;
  name: string;
  role: 'admin' | 'user';
  is_active: boolean;
}

interface AuthState {
  loading: boolean;
  user: MeProfile | null;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  loading: true,
  user: null,
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({
  children,
  redirectTo = '/login',
  requireAuth = true,
  adminOnly = false,
}: {
  children: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
  adminOnly?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MeProfile | null>(null);
  const router = useRouter();

  const fetchMe = useCallback(async (): Promise<MeProfile | null> => {
    try {
      const data = await apiGet<{ user: MeProfile }>('/api/auth/me');
      return data.user ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const token = await getSessionToken();
      if (token) {
        const me = await fetchMe();
        if (!alive) return;
        setUser(me);
      } else if (alive) {
        setUser(null);
      }
      if (alive) setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [fetchMe]);

  useEffect(() => {
    if (loading) return;
    if (requireAuth) {
      if (!user) {
        router.replace(redirectTo);
      } else if (adminOnly && user.role !== 'admin') {
        router.replace('/');
      }
    }
  }, [loading, user, requireAuth, adminOnly, redirectTo, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
          <p className="text-sm">正在加载…</p>
        </div>
      </div>
    );
  }

  if (requireAuth && adminOnly && user?.role !== 'admin') {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        loading,
        user,
        refresh: async () => {
          await fetchMe();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}