import type { AdminCategory, AdminPaged, AdminProduct, AdminProductDetail, AdminQuery, AdminRole, AdminUser, AuditDetail, AuditEntry, AuditMeta, AuthSession, ContactMessage, Dashboard, ImportPreview, ImportResult, ProductUpsertRequest } from './admin-types';

import { API_MODE, ApiError, request as httpRequest } from './http';

export const adminUsesMocks = API_MODE === 'mock';
let session: AuthSession | null = null;
let authVersion = 0;
let refreshPromise: Promise<AuthSession> | null = null;
const listeners = new Set<() => void>();
export function getAdminSession() { return session; }
export function subscribeAdminSession(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function setSession(value: AuthSession | null) { session = value; listeners.forEach(listener => listener()); return value; }

export class AdminApiError extends Error {
  constructor(public status: number, message: string, public errors?: Record<string, string[]>, public code?: string) { super(message); }
}

async function transport<T>(path: string, init: RequestInit = {}, query: AdminQuery = {}, blob = false): Promise<T> {
  if (adminUsesMocks) {
    const { mockAdminRequest, MockProblem } = await import('./mock/admin');
    try { return await mockAdminRequest(path, init, query) as T; }
    catch (error) { if (error instanceof MockProblem) throw new AdminApiError(error.status, error.message, error.errors, error.code); throw error; }
  }
  try {
    return await httpRequest<T>(path, { method: (init.method ?? 'GET') as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body, token: session?.accessToken, credentials: 'include', query, cache: 'no-store', responseType: blob ? 'blob' : 'json' });
  } catch (error) {
    if (error instanceof ApiError) throw new AdminApiError(error.status, error.message, error.fieldErrors, error.code);
    throw error;
  }
}

export async function refreshAdminSession(): Promise<AuthSession> {
  if (!refreshPromise) {
    const version = authVersion;
    refreshPromise = transport<AuthSession>('/auth/refresh', { method: 'POST' }).then(value => {
      if (version !== authVersion) throw new AdminApiError(401, 'La sesión cambió. Inicie sesión nuevamente.', undefined, 'auth.invalid_refresh');
      setSession(value); return value;
    }).catch(error => { if (version === authVersion) setSession(null); throw error; }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function request<T>(path: string, init: RequestInit = {}, query: AdminQuery = {}, blob = false): Promise<T> {
  const version = authVersion;
  try { return await transport<T>(path, init, query, blob); }
  catch (error) {
    if (!(error instanceof AdminApiError) || error.status !== 401) throw error;
    if (version !== authVersion) throw error;
    await refreshAdminSession();
    if (version !== authVersion) throw error;
    try { return await transport<T>(path, init, query, blob); }
    catch (retryError) { if (retryError instanceof AdminApiError && retryError.status === 401 && version === authVersion) setSession(null); throw retryError; }
  }
}
const json = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
export const adminApi = {
  async resetDemo() {
    if (!adminUsesMocks) throw new AdminApiError(403, 'Esta opción solo está disponible en la demo.');
    ++authVersion;
    const { resetMockDemo } = await import('./mock/admin');
    resetMockDemo();
    setSession(null);
  },
  async login(email: string, password: string) {
    const version = ++authVersion;
    const value = await transport<AuthSession>('/auth/login', json('POST', { email, password }));
    if (version !== authVersion) throw new AdminApiError(401, 'La solicitud de acceso fue cancelada.');
    setSession(value); return value;
  },
  async logout() {
    ++authVersion;
    const pending = transport('/auth/logout', json('POST'));
    setSession(null);
    await pending;
  },
  dashboard: () => request<Dashboard>('/admin/dashboard'),
  categories: () => request<AdminCategory[]>('/categories'),
  products: (query: AdminQuery) => request<AdminPaged<AdminProduct>>('/admin/products', {}, query),
  product: (id: number) => request<AdminProductDetail>(`/admin/products/${id}`),
  saveProduct: (input: ProductUpsertRequest, id?: number) => request<AdminProductDetail>(`/admin/products${id ? `/${id}` : ''}`, json(id ? 'PUT' : 'POST', input)),
  deleteProduct: (id: number) => request<void>(`/admin/products/${id}`, json('DELETE')),
  restoreProduct: (id: number) => request<AdminProductDetail>(`/admin/products/${id}/restore`, json('POST')),
  importTemplate: () => request<Blob>('/admin/products/import/template', {}, {}, true),
  validateImport: (file: File) => { const body = new FormData(); body.set('file', file); return request<ImportPreview>('/admin/products/import/validate', { method: 'POST', body }); },
  confirmImport: (id: string) => request<ImportResult>(`/admin/products/import/${id}/confirm`, json('POST')),
  importErrors: (id: string) => request<Blob>(`/admin/products/import/${id}/errors`, {}, {}, true),
  messages: (query: AdminQuery) => request<AdminPaged<ContactMessage>>('/admin/messages', {}, query),
  message: (id: number) => request<ContactMessage>(`/admin/messages/${id}`),
  markMessage: (id: number, isRead: boolean) => request<ContactMessage>(`/admin/messages/${id}`, json('PATCH', { isRead })),
  users: (query: AdminQuery) => request<AdminPaged<AdminUser>>('/admin/users', {}, query),
  roles: () => request<AdminRole[]>('/admin/roles'),
  audit: (query: AdminQuery) => request<AdminPaged<AuditEntry>>('/admin/audit', {}, query),
  auditMeta: () => request<AuditMeta>('/admin/audit/meta'),
  auditDetail: (id: number) => request<AuditDetail>(`/admin/audit/${id}`),
};
