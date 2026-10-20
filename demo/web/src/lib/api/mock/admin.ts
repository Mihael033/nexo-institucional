import seed from '@/data/productos.json';
import { csvCell, parseCsvRecords, slugify, validateProduct } from './admin-csv';
import { DEMO_DATA_KEY, DEMO_SESSION_KEY, demoStateSchema, demoStorage, notifyDemoChanged, type DemoState } from './admin-storage';
import type { ContactAccepted, ContactRequest } from '../types';
import type { AdminCategory, AdminProductDetail, AdminQuery, AdminUser, AuditAction, AuditDetail, AuthSession, AuthUser, ContactMessage, ImportPreview, Permission, ProductUpsertRequest } from '../admin-types';

export class MockProblem extends Error {
  constructor(public status: number, message: string, public errors?: Record<string, string[]>, public code = 'bad_request') { super(message); }
}

const permissions: Permission[] = ['dashboard.read', 'products.read', 'products.write', 'products.import', 'categories.write', 'messages.read', 'messages.write', 'users.read', 'audit.read'];
const now = () => new Date().toISOString();
let currentUser: AuthUser | null = null;
const failures = new Map<string, { count: number; until: number }>();
export const mockCategories: AdminCategory[] = [...new Map(seed.map(p => [p.categoria.slug, p.categoria])).values()].map((c, i) => ({ id: i + 1, slug: c.slug, name: c.nombre, description: null, productCount: seed.filter(p => p.categoria.slug === c.slug).length }));
let products: AdminProductDetail[] = seed.map(p => ({
  id: p.id, slug: p.slug, name: p.nombre, brand: p.marca, category: mockCategories.find(c => c.slug === p.categoria.slug)!,
  priceBs: p.precioBs, isAvailable: p.disponible, condition: p.estado === 'Nuevo' ? 'new' : 'used', isFeatured: p.destacado,
  thumbnail: { url: p.imagenes[0], alt: p.nombre }, images: p.imagenes.map(url => ({ url, alt: p.nombre })),
  description: p.descripcion, attributes: Object.entries(p.atributos).map(([key, value]) => ({ key, label: key === 'ubicacion' ? 'Ubicación' : 'Garantía (meses)', value: String(value) })),
  createdAt: p.creadoEn, updatedAt: p.creadoEn, isDeleted: false, deletedAt: null,
}));
let users: AdminUser[] = [
  { id: 1, name: 'Ana Benítez', email: 'admin@nexo.com.bo', role: 'Admin', isActive: true, isLockedOut: false, lastLoginAt: now(), createdAt: '2026-01-10T12:00:00Z' },
  { id: 2, name: 'Diego González', email: 'editor@nexo.com.bo', role: 'Editor', isActive: true, isLockedOut: false, lastLoginAt: now(), createdAt: '2026-02-12T12:00:00Z' },
];
const subjects = ['Cotización de mobiliario', 'Equipamiento para oficina', 'Consulta sobre disponibilidad', 'Entrega en Santa Cruz de la Sierra', 'Solicitud de catálogo'];
let messages: ContactMessage[] = subjects.map((subject, i) => ({ id: i + 1, name: ['María López', 'Juan Pérez', 'Lucía Duarte', 'Pedro Acosta', 'Sofía Vera'][i], email: `consulta${i + 1}@ejemplo.com.bo`, phone: '+591 700 00000', organization: ['Gobierno Municipal de La Paz', 'Colegio del Sur', 'Fundación Horizonte', 'Cooperativa Central', 'Instituto Nacional'][i], subject, message: `Hola, nos gustaría recibir información sobre ${subject.toLowerCase()}. Necesitamos una propuesta para nuestra institución. Muchas gracias.`, isRead: i > 2, readAt: i > 2 ? now() : null, readBy: i > 2 ? 'Ana Benítez' : null, createdAt: new Date(Date.now() - i * 86400000).toISOString() }));
function appendContact(req: ContactRequest): ContactAccepted {
  const receivedAt = now(), id = Math.max(0, ...messages.map(message => message.id)) + 1;
  if (!req.website?.trim()) messages.unshift({ id, name: req.name, email: req.email, phone: req.phone || null, organization: req.organization || null, subject: req.subject, message: req.message, createdAt: receivedAt, isRead: false, readAt: null, readBy: null });
  return { id, receivedAt };
}
let audits: AuditDetail[] = [];
function audit(action: AuditAction, entityType: string, entityId: string, summary: string, before: unknown = null, after: unknown = null, actor: Pick<AuthUser, 'id' | 'name' | 'email'> | null = currentUser) {
  const previous = before ? JSON.parse(JSON.stringify(before)) as Record<string, unknown> : null;
  const next = after ? JSON.parse(JSON.stringify(after)) as Record<string, unknown> : null;
  audits.unshift({ id: audits.length + 1, occurredAt: now(), userId: actor?.id ?? null, userName: actor?.name ?? null, userEmail: actor?.email ?? null, action, entityType, entityId, summary, ipAddress: '127.0.0.1', before: previous, after: next, changes: [...new Set([...Object.keys(previous ?? {}), ...Object.keys(next ?? {})])].filter(field => JSON.stringify(previous?.[field]) !== JSON.stringify(next?.[field])).map(field => ({ field, before: previous?.[field] ?? null, after: next?.[field] ?? null })), userAgent: 'Nexo Demo / Mock' });
}
audit('create', 'Product', '1', 'Creó el producto «Router Wi-Fi 7»', null, products[0]);
audit('import', 'ImportBatch', 'seed', 'Importó el catálogo inicial: 30 productos', null, { created: 30 });

function requirePermission(permission: Permission) {
  if (!currentUser) throw new MockProblem(401, 'Inicie sesión para continuar.', undefined, 'unauthorized');
  if (!currentUser.permissions.includes(permission)) throw new MockProblem(403, 'No tiene permiso para esta acción.', undefined, 'forbidden');
}
function session(user: AdminUser): AuthSession {
  currentUser = authUser(user);
  return { accessToken: 'mock-in-memory', tokenType: 'Bearer', expiresIn: 900, user: currentUser };
}
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function page<T>(items: T[], query: AdminQuery) {
  const page = Number(query.page ?? 1), pageSize = Number(query.pageSize ?? 12);
  return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, totalItems: items.length, totalPages: Math.ceil(items.length / pageSize) };
}
const imports = new Map<string, { preview: ImportPreview; requests: (ProductUpsertRequest | null)[]; owner: number }>();
const template = '\uFEFFnombre;slug;categoria;marca;precio_bs;disponible;estado;destacado;descripcion;imagenes;garantia_meses;ubicacion\r\nEscritorio institucional;escritorio-demo;'+ mockCategories[0].slug +';Nexo;1250.50;si;Nuevo;no;Escritorio para espacios de trabajo institucional;https://picsum.photos/seed/escritorio/800/600;12;La Paz\r\n';

function saveProduct(input: ProductUpsertRequest, id?: number) {
  const errors = validateProduct(input);
  if (!mockCategories.some(c => c.id === input.categoryId)) errors.categoryId = ['La categoría no existe.'];
  if (Object.keys(errors).length) throw new MockProblem(400, 'Revise los campos del producto.', errors, 'validation_failed');
  const slug = input.slug || slugify(input.name);
  if (products.some(p => p.slug === slug && p.id !== id)) throw new MockProblem(409, 'Ya existe un producto con este slug.', undefined, 'conflict');
  const previous = products.find(p => p.id === id);
  if (id && !previous) throw new MockProblem(404, 'Producto no encontrado.');
  const result: AdminProductDetail = { ...input, id: id ?? Math.max(0, ...products.map(p => p.id)) + 1, slug, category: mockCategories.find(c => c.id === input.categoryId)!, thumbnail: { url: input.images[0], alt: input.name }, images: input.images.map(url => ({ url, alt: input.name })), attributes: Object.entries(input.attributes).map(([key, value]) => ({ key, label: key, value })), createdAt: previous?.createdAt ?? now(), updatedAt: now(), isDeleted: previous?.isDeleted ?? false, deletedAt: previous?.deletedAt ?? null };
  products = previous ? products.map(p => p.id === id ? result : p) : [result, ...products];
  audit(id ? 'update' : 'create', 'Product', String(result.id), `${id ? 'Actualizó' : 'Creó'} el producto «${result.name}»`, previous, result);
  return result;
}

async function dispatch(path: string, init: RequestInit = {}, query: AdminQuery = {}): Promise<unknown> {
  const method = init.method ?? 'GET';
  const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
  if (path === '/auth/login') {
    const email = String(body.email).toLowerCase().trim();
    const entry = failures.get(email);
    const user = users.find(u => u.email === email);
    if (entry && entry.until > Date.now()) {
      audit('login_failed', 'User', user ? String(user.id) : '', 'Intento de acceso a una cuenta bloqueada', null, null, user ?? null);
      throw new MockProblem(423, 'Cuenta bloqueada durante 15 minutos.', undefined, 'auth.locked_out');
    }
    if (!user || !user.isActive || body.password !== 'Demo#2026') {
      const count = entry && entry.until === 0 ? entry.count + 1 : 1;
      failures.set(email, { count, until: count >= 5 ? Date.now() + 900000 : 0 });
      if (user) user.isLockedOut = count >= 5;
      audit('login_failed', 'User', user ? String(user.id) : '', 'Intento de acceso fallido', null, null, user ?? null);
      throw new MockProblem(count >= 5 ? 423 : 401, count >= 5 ? 'Cuenta bloqueada durante 15 minutos.' : 'Correo o contraseña incorrectos.', undefined, count >= 5 ? 'auth.locked_out' : 'auth.invalid_credentials');
    }
    failures.delete(email);
    user.isLockedOut = false; user.lastLoginAt = now();
    const result = session(user); audit('login', 'User', String(user.id), 'Inició sesión en el panel'); return result;
  }
  if (path === '/auth/refresh') {
    if (!currentUser || !users.some(u => u.id === currentUser!.id && u.isActive)) throw new MockProblem(401, 'La sesión de demostración finalizó.', undefined, 'auth.invalid_refresh');
    return session(users.find(u => u.id === currentUser!.id)!);
  }
  if (path === '/auth/logout') { if (currentUser) audit('logout', 'User', String(currentUser.id), 'Cerró sesión'); currentUser = null; return undefined; }
  if (path === '/categories') { requirePermission('products.read'); return mockCategories.map(c => ({ ...c, productCount: products.filter(p => p.category.id === c.id && !p.isDeleted).length })); }
  if (path === '/admin/dashboard') {
    requirePermission('dashboard.read'); const active = products.filter(p => !p.isDeleted);
    return { totals: { products: active.length, productsAvailable: active.filter(p => p.isAvailable).length, productsFeatured: active.filter(p => p.isFeatured).length, categories: mockCategories.length, news: 3, messages: messages.length, messagesUnread: messages.filter(m => !m.isRead).length, users: users.length }, productsByCategory: mockCategories.map(c => ({ slug: c.slug, name: c.name, count: active.filter(p => p.category.id === c.id).length })), messagesLast7Days: Array.from({ length: 7 }, (_, i) => { const date = new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10); return { date, count: messages.filter(m => m.createdAt.startsWith(date)).length }; }), recentActivity: currentUser!.permissions.includes('audit.read') ? audits.slice(0, 8) : null };
  }
  if (path.startsWith('/admin/products/import')) {
    requirePermission('products.import');
    if (path.endsWith('/template')) return new Blob([template], { type: 'text/csv;charset=utf-8' });
    if (path.endsWith('/validate')) {
      const file = (init.body as FormData).get('file');
      if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.csv') || file.size > 2 * 1024 * 1024) throw new MockProblem(400, 'Seleccione un archivo CSV de hasta 2 MB.');
      let records: ReturnType<typeof parseCsvRecords>; try { records = parseCsvRecords(await file.text()); } catch (error) { throw new MockProblem(400, (error as Error).message); }
      const headers = (records.shift()?.cells ?? []).map(v => v.toLowerCase().replace(/\*$/, '').trim());
      const required = ['nombre', 'categoria', 'marca', 'precio_bs', 'disponible', 'estado', 'descripcion', 'imagenes'];
      const missing = required.filter(h => !headers.includes(h));
      if (missing.length) throw new MockProblem(400, `Faltan columnas: ${missing.join(', ')}.`);
      if (records.length > 1000 || !records.length) throw new MockProblem(400, 'El CSV debe contener entre 1 y 1.000 filas.');
      const requests: (ProductUpsertRequest | null)[] = [];
      const seenSlugs = new Map<string, number>();
      const rows: ImportPreview['rows'] = records.map(record => {
        const value = (name: string) => record.cells[headers.indexOf(name)] ?? '';
        const bool = (raw: string) => /^(si|true|1)$/i.test(raw) ? true : /^(no|false|0)$/i.test(raw) ? false : null;
        const category = mockCategories.find(c => c.slug === value('categoria'));
        const rawPrice = value('precio_bs');
        const price = rawPrice.includes(',') ? rawPrice.replaceAll('.', '').replace(',', '.') : rawPrice;
        const condition = /^nuevo$/i.test(value('estado')) ? 'new' : /^usado$/i.test(value('estado')) ? 'used' : null;
        const available = bool(value('disponible'));
        const input: ProductUpsertRequest = { name: value('nombre'), slug: value('slug') || null, categoryId: category?.id ?? 0, brand: value('marca'), priceBs: /^\d+(\.\d{1,2})?$/.test(price) ? Number(price) : NaN, isAvailable: available ?? false, condition: condition ?? 'new', isFeatured: bool(value('destacado')) ?? false, description: value('descripcion'), images: value('imagenes').split('|').filter(Boolean), attributes: { ...(value('garantia_meses') ? { garantiaMeses: value('garantia_meses') } : {}), ...(value('ubicacion') ? { ubicacion: value('ubicacion') } : {}) } };
        const errors = Object.entries(validateProduct(input)).flatMap(([column, messages]) => messages.map(message => ({ column: ({ name: 'nombre', categoryId: 'categoria', priceBs: 'precio_bs', brand: 'marca', description: 'descripcion', images: 'imagenes' } as Record<string, string>)[column] ?? column, message })));
        if (available === null) errors.push({ column: 'disponible', message: 'Use si o no.' });
        if (!condition) errors.push({ column: 'estado', message: 'Use Nuevo o Usado.' });
        if (value('destacado') && bool(value('destacado')) === null) errors.push({ column: 'destacado', message: 'Use si o no.' });
        const slug = input.slug || slugify(input.name);
        if (seenSlugs.has(slug)) errors.push({ column: 'slug', message: `El enlace ya aparece en la fila ${seenSlugs.get(slug)}.` });
        else if (!errors.length) seenSlugs.set(slug, record.lineNumber);
        const existing = products.find(p => p.slug === slug);
        requests.push(errors.length ? null : { ...input, slug });
        return { rowNumber: record.lineNumber, status: errors.length ? 'invalid' : 'valid', action: errors.length ? null : existing ? 'update' : 'create', data: { name: input.name, slug, categorySlug: value('categoria'), brand: input.brand, priceBs: Number.isNaN(input.priceBs) ? null : input.priceBs, isAvailable: available, condition, isFeatured: input.isFeatured }, errors };
      });
      const preview: ImportPreview = { importId: crypto.randomUUID().replaceAll('-', ''), fileName: file.name, expiresAt: new Date(Date.now() + 1800000).toISOString(), totalRows: rows.length, validRows: rows.filter(r => r.status === 'valid').length, invalidRows: rows.filter(r => r.status === 'invalid').length, toCreate: rows.filter(r => r.action === 'create').length, toUpdate: rows.filter(r => r.action === 'update').length, rows };
      imports.set(preview.importId, { preview, requests, owner: currentUser!.id }); return preview;
    }
    const id = path.split('/')[4], batch = imports.get(id);
    if (!batch || new Date(batch.preview.expiresAt).getTime() < Date.now()) throw new MockProblem(410, 'El lote venció o ya fue confirmado. Valide el archivo nuevamente.', undefined, 'import.expired');
    if (batch.owner !== currentUser!.id) throw new MockProblem(403, 'El lote pertenece a otro usuario.');
    if (path.endsWith('/errors')) return new Blob(['\uFEFFfila;columna;error\r\n' + batch.preview.rows.flatMap(r => r.errors.map(e => [r.rowNumber, e.column, e.message].map(csvCell).join(';'))).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    if (path.endsWith('/confirm')) {
      let created = 0, updated = 0;
      batch.requests.forEach(input => { if (!input) return; const existing = products.find(p => p.slug === input.slug); saveProduct(input, existing?.id); if (existing) updated++; else created++; });
      imports.delete(id); const result = { importId: id, created, updated, skipped: batch.preview.invalidRows }; audit('import', 'ImportBatch', id, `Importó ${created + updated} productos`, null, result); return result;
    }
  }
  if (path === '/admin/products' && method === 'GET') {
    requirePermission('products.read');
    let items = products.filter(p => (query.status === 'all' || (query.status === 'deleted' ? p.isDeleted : !p.isDeleted)) && (!query.q || normalized(`${p.name} ${p.brand} ${p.description}`).includes(normalized(String(query.q)))) && (!query.category || p.category.slug === query.category) && (query.available === undefined || query.available === '' || p.isAvailable === (String(query.available) === 'true')));
    items = [...items].sort((a, b) => query.sort === 'name_asc' ? a.name.localeCompare(b.name) : query.sort === 'price_asc' ? a.priceBs - b.priceBs : query.sort === 'price_desc' ? b.priceBs - a.priceBs : b.updatedAt.localeCompare(a.updatedAt));
    return page(items, query);
  }
  if (path === '/admin/products' && method === 'POST') { requirePermission('products.write'); return saveProduct(body); }
  if (/^\/admin\/products\/\d+/.test(path)) {
    requirePermission(method === 'GET' ? 'products.read' : 'products.write');
    const id = Number(path.split('/')[3]), product = products.find(p => p.id === id);
    if (!product) throw new MockProblem(404, 'Producto no encontrado.');
    if (method === 'GET') return product;
    if (method === 'PUT') return saveProduct(body, id);
    const before = structuredClone(product);
    product.isDeleted = method === 'DELETE'; product.deletedAt = product.isDeleted ? now() : null; product.updatedAt = now();
    audit(product.isDeleted ? 'delete' : 'restore', 'Product', String(id), `${product.isDeleted ? 'Eliminó' : 'Restauró'} el producto «${product.name}»`, before, product);
    return method === 'DELETE' ? undefined : product;
  }
  if (path.startsWith('/admin/messages')) {
    requirePermission(method === 'PATCH' ? 'messages.write' : 'messages.read');
    const id = Number(path.split('/')[3]);
    if (id) { const message = messages.find(m => m.id === id); if (!message) throw new MockProblem(404, 'Mensaje no encontrado.'); if (method === 'PATCH') { const before = structuredClone(message); message.isRead = body.isRead; message.readAt = body.isRead ? now() : null; message.readBy = body.isRead ? currentUser!.name : null; audit(body.isRead ? 'mark_read' : 'mark_unread', 'ContactMessage', String(id), `Marcó el mensaje como ${body.isRead ? 'leído' : 'no leído'}`, before, message); } return { ...message }; }
    let items = messages.filter(m => (!query.status || query.status === 'all' || m.isRead === (query.status === 'read')) && (!query.q || normalized(`${m.name} ${m.email} ${m.subject} ${m.organization}`).includes(normalized(String(query.q)))));
    items = [...items].sort((a, b) => query.sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)); return page(items, query);
  }
  if (path === '/admin/users') { requirePermission('users.read'); return page(users.filter(u => (!query.role || u.role === query.role) && (!query.q || normalized(`${u.name} ${u.email}`).includes(normalized(String(query.q))))), query); }
  if (path === '/admin/roles') { requirePermission('users.read'); return ['Admin', 'Editor'].map(role => ({ name: role, description: role === 'Admin' ? 'Acceso completo a la plataforma' : 'Productos y mensajes institucionales', permissions: permissions.filter(p => role === 'Admin' || !['users.read', 'audit.read'].includes(p)), userCount: users.filter(u => u.role === role).length })); }
  if (path.startsWith('/admin/audit')) {
    requirePermission('audit.read');
    if (path.endsWith('/meta')) return { actions: ['create', 'update', 'delete', 'restore', 'import', 'login', 'login_failed', 'logout', 'mark_read', 'mark_unread'].map((value, i) => ({ value, label: ['Creación', 'Actualización', 'Eliminación', 'Restauración', 'Importación', 'Inicio de sesión', 'Acceso fallido', 'Cierre de sesión', 'Lectura', 'No leído'][i] })), entityTypes: ['Product', 'Category', 'ContactMessage', 'User', 'ImportBatch'].map((value, i) => ({ value, label: ['Producto', 'Categoría', 'Mensaje', 'Usuario', 'Importación'][i] })), users: users.map(u => ({ id: u.id, name: u.name })) };
    const id = Number(path.split('/')[3]); if (id) { const entry = audits.find(a => a.id === id); if (!entry) throw new MockProblem(404, 'Registro no encontrado.'); return entry; }
    const boundary = (value: string, end: boolean) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T${end ? '23:59:59.999' : '00:00:00'}-04:00` : value).getTime();
    const from = query.from ? boundary(String(query.from), false) : -Infinity;
    const to = query.to ? boundary(String(query.to), true) : Infinity;
    let items = audits.filter(a => (!query.userId || a.userId === Number(query.userId)) && (!query.action || String(query.action).split(',').includes(a.action)) && (!query.entityType || String(query.entityType).split(',').includes(a.entityType)) && new Date(a.occurredAt).getTime() >= from && new Date(a.occurredAt).getTime() <= to && (!query.q || normalized(a.summary).includes(normalized(String(query.q)))));
    if (query.sort === 'oldest') items = [...items].reverse(); return page(items, query);
  }
  throw new MockProblem(404, 'Recurso no encontrado.');
}






function authUser(user: AdminUser): AuthUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role, permissions: permissions.filter(p => user.role === 'Admin' || !['users.read', 'audit.read'].includes(p)) };
}
const initial = structuredClone({ products, users, messages, audits });
let lastStored: string | null | undefined;
function resetMemory() {
  ({ products, users, messages, audits } = structuredClone(initial));
  failures.clear(); imports.clear(); currentUser = null;
}
function snapshot(): DemoState {
  return { version: 1, products, users, messages, audits, failures: [...failures] };
}
function hydrate() {
  const storage = demoStorage('localStorage');
  if (!storage) return;
  const raw = storage.getItem(DEMO_DATA_KEY);
  if (raw !== lastStored) {
    resetMemory();
    if (raw) {
      try {
        const saved = demoStateSchema.parse(JSON.parse(raw));
        ({ products, users, messages, audits } = saved);
        saved.failures.forEach(([key, value]) => failures.set(key, value));
      } catch { storage.removeItem(DEMO_DATA_KEY); }
    }
    lastStored = storage.getItem(DEMO_DATA_KEY);
  }
  const id = Number(demoStorage('sessionStorage')?.getItem(DEMO_SESSION_KEY));
  const user = users.find(u => u.id === id && u.isActive);
  currentUser = user ? authUser(user) : null;
}
function persist() {
  const storage = demoStorage('localStorage');
  if (!storage) return;
  const next = JSON.stringify(snapshot());
  // Do not report a saved operation if the browser is full or disallows storage.
  try {
    if (next !== lastStored) storage.setItem(DEMO_DATA_KEY, next);
    const auth = demoStorage('sessionStorage');
    if (currentUser) auth?.setItem(DEMO_SESSION_KEY, String(currentUser.id));
    else auth?.removeItem(DEMO_SESSION_KEY);
    lastStored = next;
  } catch {
    lastStored = undefined;
    throw new MockProblem(507, 'No se pudieron guardar los datos. Libere espacio o permita el almacenamiento del navegador.', undefined, 'demo.storage_unavailable');
  }
}

/** Shared by the public contact form and the static admin, including after reload. */
export function appendMockContact(req: ContactRequest): ContactAccepted {
  hydrate();
  const result = appendContact(req);
  persist(); notifyDemoChanged();
  return result;
}

export async function mockAdminRequest(path: string, init: RequestInit = {}, query: AdminQuery = {}): Promise<unknown> {
  hydrate();
  const before = JSON.stringify(snapshot()), identity = currentUser?.id;
  try { return await dispatch(path, init, query); }
  finally { if (JSON.stringify(snapshot()) !== before || currentUser?.id !== identity) persist(); }
}

/** Reset only this demo's data, never unrelated projects sharing a Pages origin. */
export function resetMockDemo() {
  demoStorage('localStorage')?.removeItem(DEMO_DATA_KEY);
  demoStorage('sessionStorage')?.removeItem(DEMO_SESSION_KEY);
  resetMemory(); lastStored = null;
  notifyDemoChanged();
}
