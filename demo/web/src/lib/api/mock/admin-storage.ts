import { z } from 'zod';

const prefix = `nexo-demo:v1:${process.env.NEXT_PUBLIC_BASE_PATH || '/'}`;
export const DEMO_DATA_KEY = `${prefix}:data`;
export const DEMO_SESSION_KEY = `${prefix}:session`;
export const DEMO_CHANGED_EVENT = 'nexo-demo-changed';

const image = z.object({ url: z.string(), alt: z.string() });
const person = z.object({ id: z.number().int().positive(), name: z.string(), email: z.string() });
const product = z.object({
  id: z.number().int().positive(), slug: z.string(), name: z.string(), brand: z.string(),
  category: z.object({ id: z.number(), slug: z.string(), name: z.string() }),
  priceBs: z.number().finite(), isAvailable: z.boolean(), condition: z.enum(['new', 'used']), isFeatured: z.boolean(),
  thumbnail: image, images: z.array(image), description: z.string(),
  attributes: z.array(z.object({ key: z.string(), label: z.string(), value: z.string() })),
  createdAt: z.string(), updatedAt: z.string(), isDeleted: z.boolean(), deletedAt: z.string().nullable(),
});
const user = person.extend({ role: z.enum(['Admin', 'Editor']), isActive: z.boolean(), isLockedOut: z.boolean(), lastLoginAt: z.string().nullable(), createdAt: z.string() });
const message = z.object({
  id: z.number(), name: z.string(), email: z.string(), phone: z.string().nullable(), organization: z.string().nullable(),
  subject: z.string(), message: z.string(), isRead: z.boolean(), readAt: z.string().nullable(), readBy: z.string().nullable(), createdAt: z.string(),
});
const audit = z.object({
  id: z.number(), occurredAt: z.string(), userId: z.number().nullable(), userName: z.string().nullable(), userEmail: z.string().nullable(),
  action: z.enum(['create', 'update', 'delete', 'restore', 'import', 'login', 'login_failed', 'logout', 'mark_read', 'mark_unread']),
  entityType: z.string(), entityId: z.string().nullable(), summary: z.string(), ipAddress: z.string().nullable(), userAgent: z.string().nullable(),
  before: z.record(z.string(), z.unknown()).nullable(), after: z.record(z.string(), z.unknown()).nullable(),
  changes: z.array(z.object({ field: z.string(), before: z.unknown(), after: z.unknown() })),
});
export const demoStateSchema = z.object({
  version: z.literal(1), products: z.array(product), users: z.array(user), messages: z.array(message), audits: z.array(audit),
  failures: z.array(z.tuple([z.string(), z.object({ count: z.number(), until: z.number() })])),
});
export type DemoState = z.infer<typeof demoStateSchema>;

// Only mock data lives here. HTTP-mode credentials and tokens remain in memory.
export function demoStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  if (typeof window === 'undefined') return null;
  try { return window[kind]; }
  catch { throw new Error('Permita el almacenamiento del navegador para utilizar la demo.'); }
}

export function notifyDemoChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(DEMO_CHANGED_EVENT));
}
