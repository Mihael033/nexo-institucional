import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminPaged, AdminProductDetail, AuditEntry, AuthSession, ContactMessage, ImportPreview, ProductUpsertRequest } from '../admin-types';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return { get length() { return data.size; }, key: index => [...data.keys()][index] ?? null, getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, String(value)); }, removeItem: key => { data.delete(key); }, clear: () => { data.clear(); } };
}
const input: ProductUpsertRequest = { name: 'Producto persistente', slug: 'producto-persistente', categoryId: 1, brand: 'Nexo', priceBs: 99.95, condition: 'new', isAvailable: true, isFeatured: false, description: 'Producto para comprobar la demo local.', images: ['https://example.com/product.jpg'], attributes: {} };
const login = { method: 'POST', body: JSON.stringify({ email: 'admin@nexo.com.bo', password: 'Demo#2026' }) };
let local: Storage, tab: Storage;
beforeEach(() => {
  vi.resetModules();
  local = memoryStorage(); tab = memoryStorage();
  vi.stubEnv('NEXT_PUBLIC_API_MODE', 'mock');
  vi.stubGlobal('window', { localStorage: local, sessionStorage: tab, dispatchEvent: vi.fn() });
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('No server in the static demo'); }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('static demo browser persistence', () => {
  it('restores the session, products and audit after a full module reload without HTTP', async () => {
    const { adminApi } = await import('../admin');
    await adminApi.login('admin@nexo.com.bo', 'Demo#2026');
    const created = await adminApi.saveProduct(input);
    await adminApi.saveProduct({ ...input, priceBs: 149.5 }, created.id);
    await adminApi.deleteProduct(created.id);
    vi.resetModules();
    const { adminApi: next, refreshAdminSession, getAdminSession } = await import('../admin');
    expect(getAdminSession()).toBeNull();
    await refreshAdminSession();
    expect(getAdminSession()?.user.role).toBe('Admin');
    expect(await next.product(created.id)).toMatchObject({ isDeleted: true, priceBs: 149.5 });
    await next.restoreProduct(created.id);
    expect((await next.products({ q: input.name })).totalItems).toBe(1);
    expect((await next.audit({ action: 'create,update,delete,restore' })).totalItems).toBeGreaterThanOrEqual(5);
    expect(fetch).not.toHaveBeenCalled();
    expect([...Array(local.length)].map((_, i) => local.getItem(local.key(i)!)).join('')).not.toContain('Demo#2026');
  });

  it('bridges a public contact to the admin across reloads and keeps its read state', async () => {
    const { appendMockContact } = await import('./admin');
    const accepted = appendMockContact({ name: 'Persona demo', email: 'persona@example.com', subject: 'Consulta persistente', message: 'Necesito información sobre el catálogo.', website: '' });
    vi.resetModules();
    const { mockAdminRequest: request } = await import('./admin');
    await request('/auth/login', login);
    const messages = await request('/admin/messages', {}, { q: 'Consulta persistente' }) as AdminPaged<ContactMessage>;
    expect(messages.totalItems).toBe(1);
    await request(`/admin/messages/${accepted.id}`, { method: 'PATCH', body: JSON.stringify({ isRead: true }) });
    vi.resetModules();
    const { mockAdminRequest: reloaded } = await import('./admin');
    expect(await reloaded(`/admin/messages/${accepted.id}`)).toMatchObject({ isRead: true, readBy: 'Ana Benítez' });
    const audit = await reloaded('/admin/audit', {}, { action: 'mark_read' }) as AdminPaged<AuditEntry>;
    expect(audit.totalItems).toBe(1);
  });

  it('persists confirmed CSV imports, reports invalid rows and preserves Editor restrictions after reload', async () => {
    const { mockAdminRequest: request } = await import('./admin');
    await request('/auth/login', { ...login, body: JSON.stringify({ email: 'editor@nexo.com.bo', password: 'Demo#2026' }) });
    const template = await request('/admin/products/import/template') as Blob;
    const form = new FormData();
    form.set('file', new File([await template.text(), 'X;;desconocida;Nexo;abc;no;Otro;no;x;bad;;\r\n'], 'demo.csv'));
    const preview = await request('/admin/products/import/validate', { method: 'POST', body: form }) as ImportPreview;
    expect(preview).toMatchObject({ validRows: 1, invalidRows: 1 });
    expect(await (await request(`/admin/products/import/${preview.importId}/errors`) as Blob).text()).toContain('categoria');
    expect(await request(`/admin/products/import/${preview.importId}/confirm`, { method: 'POST' })).toMatchObject({ created: 1, skipped: 1 });
    vi.resetModules();
    const { mockAdminRequest: reloaded } = await import('./admin');
    expect((await reloaded('/auth/refresh') as AuthSession).user.role).toBe('Editor');
    expect((await reloaded('/admin/products', {}, { q: 'Escritorio institucional' }) as AdminPaged<AdminProductDetail>).totalItems).toBe(1);
    await expect(reloaded('/admin/users')).rejects.toMatchObject({ status: 403 });
    await expect(reloaded('/admin/audit')).rejects.toMatchObject({ status: 403 });
  });

  it('resets only the demo keys, logs out and recovers seed data', async () => {
    local.setItem('another-project', 'keep');
    const { adminApi, getAdminSession, refreshAdminSession } = await import('../admin');
    await adminApi.login('admin@nexo.com.bo', 'Demo#2026');
    await adminApi.saveProduct(input);
    await adminApi.resetDemo();
    expect(local.length).toBe(1);
    expect(local.getItem('another-project')).toBe('keep');
    expect(tab.length).toBe(0);
    expect(getAdminSession()).toBeNull();
    await expect(refreshAdminSession()).rejects.toMatchObject({ status: 401 });
    expect(local.length).toBe(1);
    await adminApi.login('admin@nexo.com.bo', 'Demo#2026');
    expect((await adminApi.products({ q: input.name })).totalItems).toBe(0);
    expect((await adminApi.products({})).totalItems).toBe(30);
  });

  it('recovers from malformed saved data and never stores HTTP credentials in the demo', async () => {
    const { DEMO_DATA_KEY } = await import('./admin-storage');
    local.setItem(DEMO_DATA_KEY, '{malformed');
    const { mockAdminRequest: request } = await import('./admin');
    await request('/auth/login', login);
    expect((await request('/admin/products') as AdminPaged<AdminProductDetail>).totalItems).toBe(30);
    expect(JSON.parse(local.getItem(DEMO_DATA_KEY)!).version).toBe(1);
    expect(tab.getItem((await import('./admin-storage')).DEMO_SESSION_KEY)).toBe('1');
  });

  it('reports storage failures instead of claiming to save a product', async () => {
    const { mockAdminRequest: request } = await import('./admin');
    await request('/auth/login', login);
    const original = local.setItem;
    local.setItem = () => { throw new Error('Quota exceeded'); };
    await expect(request('/admin/products', { method: 'POST', body: JSON.stringify(input) })).rejects.toMatchObject({ status: 507 });
    local.setItem = original;
    expect((await request('/admin/products', {}, { q: input.name }) as AdminPaged<AdminProductDetail>).totalItems).toBe(0);
  });
});
