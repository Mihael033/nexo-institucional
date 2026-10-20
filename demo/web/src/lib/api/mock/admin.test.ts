import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { csvCell, parseCsv, validateProduct } from './admin-csv';
import type { AdminPaged, AdminProductDetail, AuthSession, ImportPreview, ImportResult, ProductUpsertRequest } from '../admin-types';

async function setup(role: 'admin' | 'editor' = 'admin') {
  const { mockAdminRequest: request } = await import('./admin');
  const session = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: `${role}@nexo.com.bo`, password: 'Demo#2026' }) }) as AuthSession;
  return { request, session };
}
beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.useRealTimers(); });

describe('admin permissions and authentication', () => {
  it('rejects direct access without a session', async () => {
    const { mockAdminRequest } = await import('./admin');
    await expect(mockAdminRequest('/admin/users')).rejects.toMatchObject({ status: 401 });
  });
  it('blocks Editor access to users and audit, including direct API calls', async () => {
    const { request, session } = await setup('editor');
    expect(session.user.permissions).not.toContain('users.read');
    await expect(request('/admin/users')).rejects.toMatchObject({ status: 403 });
    await expect(request('/admin/audit')).rejects.toMatchObject({ status: 403 });
    expect(await request('/admin/dashboard')).toMatchObject({ recentActivity: null });
  });
  it('locks out after five invalid attempts and invalidates refresh on logout', async () => {
    const { request } = await setup();
    for (let attempt = 1; attempt <= 5; attempt++) await expect(request('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'editor@nexo.com.bo', password: 'wrong' }) })).rejects.toMatchObject({ status: attempt === 5 ? 423 : 401 });
    await request('/auth/logout', { method: 'POST' });
    await expect(request('/auth/refresh', { method: 'POST' })).rejects.toMatchObject({ status: 401 });
  });
  it('audits failed and blocked login attempts without passwords or tokens', async () => {
    const { request } = await setup();
    for (let i = 0; i < 6; i++) await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'editor@nexo.com.bo', password: 'never-log-this' }) }).catch(() => undefined);
    const entries = await request('/admin/audit', {}, { action: 'login_failed', userId: 2 }) as AdminPaged<{ id: number }>;
    expect(entries.totalItems).toBe(6);
    const detail = await request(`/admin/audit/${entries.items[0].id}`);
    expect(JSON.stringify(detail)).not.toContain('never-log-this');
    expect(detail).toMatchObject({ before: null, after: null, userId: 2 });
  });
});

describe('product operations', () => {
  const input: ProductUpsertRequest = { name: 'Equipo de prueba', slug: 'equipo-prueba', categoryId: 1, brand: 'Nexo', priceBs: 1200000, condition: 'new', isAvailable: true, isFeatured: false, description: 'Un equipo institucional para pruebas.', images: ['https://example.com/image.jpg'], attributes: { ubicacion: 'La Paz' } };
  it('creates, edits and soft deletes a product while keeping an audit trail', async () => {
    const { request } = await setup();
    const created = await request('/admin/products', { method: 'POST', body: JSON.stringify(input) }) as AdminProductDetail;
    const edited = await request(`/admin/products/${created.id}`, { method: 'PUT', body: JSON.stringify({ ...input, priceBs: 1500000 }) }) as AdminProductDetail;
    expect(edited.priceBs).toBe(1500000);
    await request(`/admin/products/${created.id}`, { method: 'DELETE' });
    const active = await request('/admin/products', {}, { q: 'equipo-prueba', status: 'active' }) as AdminPaged<AdminProductDetail>;
    expect(active.totalItems).toBe(0);
    expect(await request(`/admin/products/${created.id}`)).toMatchObject({ isDeleted: true });
    const audit = await request('/admin/audit', {}, { action: 'delete' }) as AdminPaged<unknown>;
    expect(audit.totalItems).toBe(1);
  });
  it('rejects duplicate slugs and unsafe image URLs', async () => {
    const { request } = await setup();
    await expect(request('/admin/products', { method: 'POST', body: JSON.stringify({ ...input, slug: 'router-wi-fi-7' }) })).rejects.toMatchObject({ status: 409 });
    expect(validateProduct({ ...input, images: ['javascript:alert(1)'] })).toHaveProperty('images');
  });
});

describe('CSV validation and confirmation', () => {
  it('reads quoted separators, escaped quotes and multiline cells', () => {
    expect(parseCsv('\uFEFFnombre;descripcion\r\n"Equipo; A";"Línea 1\nLínea ""2"""')).toEqual([['nombre', 'descripcion'], ['Equipo; A', 'Línea 1\nLínea "2"']]);
    expect(() => parseCsv('a;b\n"sin cerrar')).toThrow();
    expect(csvCell('=HYPERLINK("x")')).toContain("'=HYPERLINK");
  });
  it('shows row errors, imports only valid rows and prevents confirmation twice', async () => {
    const { request } = await setup();
    const template = await request('/admin/products/import/template') as Blob;
    const content = await template.text();
    const body = new FormData();
    body.set('file', new File([content + 'X;;categoria-inexistente;Nexo;abc;quizas;Otro;no;breve;url;;\r\n'], 'productos.csv', { type: 'text/csv' }));
    const preview = await request('/admin/products/import/validate', { method: 'POST', body }) as ImportPreview;
    expect(preview).toMatchObject({ totalRows: 2, validRows: 1, invalidRows: 1, toCreate: 1 });
    expect(preview.rows[1].errors.length).toBeGreaterThan(1);
    const result = await request(`/admin/products/import/${preview.importId}/confirm`, { method: 'POST' }) as ImportResult;
    expect(result).toMatchObject({ created: 1, skipped: 1 });
    await expect(request(`/admin/products/import/${preview.importId}/confirm`, { method: 'POST' })).rejects.toMatchObject({ status: 410 });
  });
  it('rejects missing columns and enforces ownership of a validated batch', async () => {
    const { request } = await setup();
    const body = new FormData(); body.set('file', new File(['nombre\nProducto'], 'mal.csv'));
    await expect(request('/admin/products/import/validate', { method: 'POST', body })).rejects.toMatchObject({ status: 400 });
    const template = await request('/admin/products/import/template') as Blob;
    body.set('file', new File([await template.text()], 'bien.csv'));
    const preview = await request('/admin/products/import/validate', { method: 'POST', body }) as ImportPreview;
    await request('/auth/logout', { method: 'POST' });
    await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'editor@nexo.com.bo', password: 'Demo#2026' }) });
    await expect(request(`/admin/products/import/${preview.importId}/confirm`, { method: 'POST' })).rejects.toMatchObject({ status: 403 });
  });
  it('rejects duplicate slugs and reports physical lines after multiline values', async () => {
    const { request } = await setup();
    const template = await request('/admin/products/import/template') as Blob;
    const [header, row] = (await template.text()).split('\r\n');
    const multiline = row.replace('Escritorio para espacios de trabajo institucional', '"Escritorio para espacios\nde trabajo institucional"');
    const body = new FormData(); body.set('file', new File([[header, multiline, row].join('\r\n')], 'duplicados.csv'));
    const preview = await request('/admin/products/import/validate', { method: 'POST', body }) as ImportPreview;
    expect(preview).toMatchObject({ validRows: 1, invalidRows: 1, toCreate: 1 });
    expect(preview.rows.map(row => row.rowNumber)).toEqual([2, 4]);
    expect(preview.rows[1].errors).toEqual(expect.arrayContaining([expect.objectContaining({ column: 'slug' })]));
    expect(await request(`/admin/products/import/${preview.importId}/confirm`, { method: 'POST' })).toMatchObject({ created: 1, updated: 0, skipped: 1 });
  });
  it('accepts all three contracted decimal formats in bolivianos', async () => {
    const { request } = await setup();
    const template = await request('/admin/products/import/template') as Blob;
    const [header, row] = (await template.text()).split('\r\n');
    const body = new FormData(); body.set('file', new File([[header, ...['1250.50', '1.250,50', '1250,50'].map((price, i) => row.replace('1250.50', price).replace('escritorio-demo', `precio-${i}`))].join('\r\n')], 'precios.csv'));
    const preview = await request('/admin/products/import/validate', { method: 'POST', body }) as ImportPreview;
    expect(preview.validRows).toBe(3);
    expect(preview.rows.map(row => row.data.priceBs)).toEqual([1250.5, 1250.5, 1250.5]);
  });
});

describe('messages and audit dates', () => {
  it('includes late Bolivian hours in date-only filters and preserves ISO boundaries', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-18T02:00:00Z'));
    const { request } = await setup();
    const day = await request('/admin/audit', {}, { from: '2026-10-17', to: '2026-10-17' }) as AdminPaged<unknown>;
    expect(day.totalItems).toBeGreaterThan(0);
    const iso = await request('/admin/audit', {}, { from: '2026-10-18T01:59:59Z', to: '2026-10-18T02:00:01Z' }) as AdminPaged<unknown>;
    expect(iso.totalItems).toBe(day.totalItems);
    const nextDay = await request('/admin/audit', {}, { from: '2026-10-18', to: '2026-10-18' }) as AdminPaged<unknown>;
    expect(nextDay.totalItems).toBe(0);
  });
  it('receives public contacts, honors the honeypot and audits message reading', async () => {
    const { request } = await setup();
    const { appendMockContact } = await import('./admin');
    const contact = { name: 'Persona QA', email: 'qa@ejemplo.com.bo', subject: 'Consulta institucional', message: 'Necesitamos información sobre un producto.', website: '' };
    const saved = appendMockContact(contact);
    appendMockContact({ ...contact, website: 'spam.example' });
    const unread = await request('/admin/messages', {}, { q: 'Persona QA', status: 'unread' }) as AdminPaged<unknown>;
    expect(unread.totalItems).toBe(1);
    await request(`/admin/messages/${saved.id}`, { method: 'PATCH', body: JSON.stringify({ isRead: true }) });
    expect(await request(`/admin/messages/${saved.id}`)).toMatchObject({ isRead: true });
    const audit = await request('/admin/audit', {}, { action: 'mark_read' }) as AdminPaged<unknown>;
    expect(audit.totalItems).toBe(1);
  });
});
