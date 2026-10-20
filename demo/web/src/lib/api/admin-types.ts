export type AdminPaged<T> = { items: T[]; page: number; pageSize: number; totalItems: number; totalPages: number };
export type Permission = 'dashboard.read' | 'products.read' | 'products.write' | 'products.import' | 'categories.write' | 'messages.read' | 'messages.write' | 'users.read' | 'audit.read';
export type AuthUser = { id: number; name: string; email: string; role: 'Admin' | 'Editor'; permissions: Permission[] };
export type AuthSession = { accessToken: string; tokenType: string; expiresIn: number; user: AuthUser };
export type AdminCategory = { id: number; slug: string; name: string; description: string | null; productCount: number };
export type AdminProduct = {
  id: number; slug: string; name: string; brand: string;
  category: { id: number; slug: string; name: string };
  priceBs: number; isAvailable: boolean; condition: 'new' | 'used'; isFeatured: boolean;
  thumbnail: { url: string; alt: string }; createdAt: string;
  isDeleted: boolean; deletedAt: string | null; updatedAt: string;
};
export type AdminProductDetail = AdminProduct & { description: string; images: { url: string; alt: string }[]; attributes: { key: string; label: string; value: string }[] };
export type ProductUpsertRequest = {
  name: string; slug: string | null; categoryId: number; brand: string; priceBs: number;
  isAvailable: boolean; condition: 'new' | 'used'; isFeatured: boolean;
  description: string; images: string[]; attributes: Record<string, string>;
};
export type ContactMessage = { id: number; name: string; email: string; phone: string | null; organization: string | null; subject: string; message: string; isRead: boolean; readAt: string | null; readBy: string | null; createdAt: string };
export type AdminUser = { id: number; name: string; email: string; role: 'Admin' | 'Editor'; isActive: boolean; isLockedOut: boolean; lastLoginAt: string | null; createdAt: string };
export type AdminRole = { name: string; description: string; permissions: string[]; userCount: number };
export type AuditAction = 'create' | 'update' | 'delete' | 'restore' | 'import' | 'login' | 'login_failed' | 'logout' | 'mark_read' | 'mark_unread';
export type AuditEntry = { id: number; occurredAt: string; userId: number | null; userName: string | null; userEmail: string | null; action: AuditAction; entityType: string; entityId: string | null; summary: string; ipAddress: string | null };
export type AuditDetail = AuditEntry & { before: Record<string, unknown> | null; after: Record<string, unknown> | null; changes: { field: string; before: unknown; after: unknown }[]; userAgent: string | null };
export type AuditMeta = { actions: { value: string; label: string }[]; entityTypes: { value: string; label: string }[]; users: { id: number; name: string }[] };
export type Dashboard = {
  totals: { products: number; productsAvailable: number; productsFeatured: number; categories: number; news: number; messages: number; messagesUnread: number; users: number };
  productsByCategory: { slug: string; name: string; count: number }[];
  messagesLast7Days: { date: string; count: number }[];
  recentActivity: AuditEntry[] | null;
};
export type ImportRow = { rowNumber: number; status: 'valid' | 'invalid'; action: 'create' | 'update' | null; data: { name: string; slug: string | null; categorySlug: string; brand: string; priceBs: number | null; isAvailable: boolean | null; condition: 'new' | 'used' | null; isFeatured: boolean }; errors: { column: string; message: string }[] };
export type ImportPreview = { importId: string; fileName: string; expiresAt: string; totalRows: number; validRows: number; invalidRows: number; toCreate: number; toUpdate: number; rows: ImportRow[] };
export type ImportResult = { importId: string; created: number; updated: number; skipped: number };
export type AdminQuery = Record<string, string | number | boolean | undefined>;
