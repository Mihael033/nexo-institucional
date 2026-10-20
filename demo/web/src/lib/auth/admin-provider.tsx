'use client';

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAdminSession, refreshAdminSession, subscribeAdminSession } from '@/lib/api/admin';
import type { AuthUser } from '@/lib/api/admin-types';
import { adminUsesMocks } from '@/lib/api/admin';
import { DEMO_DATA_KEY, DEMO_CHANGED_EVENT } from '@/lib/api/mock/admin-storage';

const AuthContext = createContext<{ user: AuthUser | null; loading: boolean }>({ user: null, loading: true });
export const useAdminAuth = () => useContext(AuthContext);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 15000, refetchOnWindowFocus: false }, mutations: { retry: false } } }));
  const session = useSyncExternalStore(subscribeAdminSession, getAdminSession, () => null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!adminUsesMocks) return;
    const changed = () => { void client.invalidateQueries({ queryKey: ['admin'] }); };
    const storage = (event: StorageEvent) => { if (event.key === DEMO_DATA_KEY) changed(); };
    window.addEventListener('storage', storage);
    window.addEventListener(DEMO_CHANGED_EVENT, changed);
    return () => { window.removeEventListener('storage', storage); window.removeEventListener(DEMO_CHANGED_EVENT, changed); };
  }, [client]);
  useEffect(() => {
    let active = true;
    const ready = getAdminSession() ? Promise.resolve() : refreshAdminSession().then(() => undefined).catch(() => undefined);
    void ready.finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const identity = () => { const user = getAdminSession()?.user; return user ? `${user.id}:${user.permissions.join(',')}` : ''; };
    let previous = identity();
    return subscribeAdminSession(() => {
      const next = identity();
      if (next !== previous) client.clear();
      previous = next;
    });
  }, [client]);
  return <QueryClientProvider client={client}><AuthContext.Provider value={{ user: session?.user ?? null, loading }}>{children}</AuthContext.Provider></QueryClientProvider>;
}
