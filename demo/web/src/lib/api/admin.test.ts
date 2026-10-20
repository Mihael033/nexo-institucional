import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = { accessToken: 'token-a', tokenType: 'Bearer', expiresIn: 900, user: { id: 1, name: 'Ana', email: 'admin@nexo.com.bo', role: 'Admin', permissions: ['dashboard.read'] } };
beforeEach(() => { vi.resetModules(); vi.stubEnv('NEXT_PUBLIC_API_MODE', 'http'); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

describe('real admin transport', () => {
  it('keeps tokens in memory and includes refresh cookies in login and logout', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response(session)).mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetcher);
    const { adminApi, getAdminSession } = await import('./admin');
    await adminApi.login('admin@nexo.com.bo', 'Demo#2026');
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(getAdminSession()?.accessToken).toBe('token-a');
    await adminApi.logout();
    expect(getAdminSession()).toBeNull();
    expect(fetcher.mock.calls[1][1].headers.get('Authorization')).toBe('Bearer token-a');
  });
  it('shares one refresh between parallel expired requests and retries with the new token', async () => {
    let refreshCalls = 0;
    let release!: (value: Response) => void;
    const refreshResponse = new Promise<Response>(resolve => { release = resolve; });
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/login')) return response(session);
      if (url.endsWith('/auth/refresh')) { refreshCalls++; return refreshResponse; }
      if (new Headers(init.headers).get('Authorization') === 'Bearer token-b') return response({ totals: {} });
      return response({ title: 'Sesión vencida', code: 'unauthorized' }, 401);
    });
    vi.stubGlobal('fetch', fetcher);
    const { adminApi } = await import('./admin');
    await adminApi.login('admin@nexo.com.bo', 'Demo#2026');
    const first = adminApi.dashboard(), second = adminApi.dashboard();
    await vi.waitFor(() => expect(refreshCalls).toBe(1));
    release(response({ ...session, accessToken: 'token-b' }));
    await Promise.all([first, second]);
    expect(refreshCalls).toBe(1);
    expect(fetcher.mock.calls.filter(([url]) => url.endsWith('/admin/dashboard'))).toHaveLength(4);
  });
  it('clears the session on invalid refresh and never falls back to mock data on HTTP errors', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response(session)).mockResolvedValueOnce(response({ code: 'unauthorized', title: 'Sesión vencida' }, 401)).mockResolvedValueOnce(response({ code: 'auth.invalid_refresh', title: 'Inicie sesión' }, 401));
    vi.stubGlobal('fetch', fetcher);
    const { adminApi, getAdminSession } = await import('./admin');
    await adminApi.login('admin@nexo.com.bo', 'Demo#2026');
    await expect(adminApi.dashboard()).rejects.toMatchObject({ status: 401, code: 'auth.invalid_refresh' });
    expect(getAdminSession()).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('does not restore a session when an earlier refresh finishes after logout', async () => {
    let release!: (value: Response) => void;
    const delayed = new Promise<Response>(resolve => { release = resolve; });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/auth/login')) return response(session);
      if (url.endsWith('/auth/refresh')) return delayed;
      return new Response(null, { status: 204 });
    }));
    const { adminApi, getAdminSession, refreshAdminSession } = await import('./admin');
    await adminApi.login('admin@nexo.com.bo', 'Demo#2026');
    const refresh = refreshAdminSession();
    const rejected = expect(refresh).rejects.toMatchObject({ status: 401 });
    await adminApi.logout();
    release(response(session));
    await rejected;
    expect(getAdminSession()).toBeNull();
  });
  it('does not clear a new login when an old retried request returns 401', async () => {
    let release!: (value: Response) => void;
    const delayed = new Promise<Response>(resolve => { release = resolve; });
    let calls = 0, retryStarted = false;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/auth/login')) return response(calls++ ? { ...session, user: { ...session.user, id: 2 } } : session);
      if (url.endsWith('/auth/logout')) return new Response(null, { status: 204 });
      if (url.endsWith('/auth/refresh')) return response({ ...session, accessToken: 'refreshed' });
      if (!retryStarted) { retryStarted = true; return response({ code: 'unauthorized', title: 'Vencido' }, 401); }
      return delayed;
    }));
    const { adminApi, getAdminSession } = await import('./admin');
    await adminApi.login('admin@nexo.com.bo', 'Demo#2026');
    const pending = adminApi.dashboard();
    const rejected = expect(pending).rejects.toMatchObject({ status: 401 });
    await vi.waitFor(() => expect(retryStarted).toBe(true));
    await new Promise(resolve => setTimeout(resolve, 10));
    await adminApi.logout();
    await adminApi.login('editor@nexo.com.bo', 'Demo#2026');
    release(response({ code: 'unauthorized', title: 'Vencido' }, 401));
    await rejected;
    expect(getAdminSession()?.user.id).toBe(2);
  });
});
