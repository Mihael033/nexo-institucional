'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowUpRight, ChartNoAxesCombined, ChevronRight, ClipboardList, FileClock, LayoutDashboard, LogOut, Menu, Moon, Package, ShieldCheck, Sun, Users, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { adminApi, adminUsesMocks } from '@/lib/api/admin';
import { AdminProvider, useAdminAuth } from '@/lib/auth/admin-provider';
import type { Permission } from '@/lib/api/admin-types';
import { ErrorState, Loading, secondaryClass } from './common';
import { ResetDemo } from './reset-demo';

const navigation: { href: string; label: string; icon: typeof LayoutDashboard; permission: Permission }[] = [
  { href: '/admin', label: 'Vista general', icon: LayoutDashboard, permission: 'dashboard.read' },
  { href: '/admin/productos', label: 'Productos', icon: Package, permission: 'products.read' },
  { href: '/admin/mensajes', label: 'Mensajes', icon: ClipboardList, permission: 'messages.read' },
  { href: '/admin/usuarios', label: 'Usuarios y roles', icon: Users, permission: 'users.read' },
  { href: '/admin/auditoria', label: 'Bitácora', icon: FileClock, permission: 'audit.read' },
];
function subscribeTheme(callback: () => void) { window.addEventListener('storage', callback); window.addEventListener('nexo-theme', callback); return () => { window.removeEventListener('storage', callback); window.removeEventListener('nexo-theme', callback); }; }
function readTheme() { try { return localStorage.getItem('nexo-admin-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } }

export function AdminShell({ children }: { children: React.ReactNode }) { return <AdminProvider><Shell>{children}</Shell></AdminProvider>; }
function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAdminAuth();
  const pathname = usePathname().replace(/\/+$/, '') || '/', router = useRouter(), client = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false), [signingOut, setSigningOut] = useState(false), [error, setError] = useState<unknown>(null);
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => 'light');
  const isLogin = pathname === '/admin/login';
  const section = navigation.find(item => item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href));
  const permission = pathname.startsWith('/admin/productos/importar') ? 'products.import' : section?.permission;
  useEffect(() => { if (!loading && !user && !isLogin) router.replace('/admin/login'); }, [loading, user, isLogin, router]);
  function toggleTheme() { try { localStorage.setItem('nexo-admin-theme', theme === 'dark' ? 'light' : 'dark'); window.dispatchEvent(new Event('nexo-theme')); } catch { setError(new Error('No se pudo guardar la preferencia de tema en este navegador.')); } }
  async function logout() { setSigningOut(true); setError(null); try { await adminApi.logout(); client.clear(); router.replace('/admin/login'); } catch (cause) { setError(cause); } finally { setSigningOut(false); } }
  const themeButton = <button className={`${secondaryClass} px-3`} aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'} onClick={toggleTheme}>{theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}</button>;
  if (isLogin) return <div data-theme={theme} className="min-h-dvh bg-canvas text-fg"><div className="absolute right-5 top-5 z-10">{themeButton}</div>{children}</div>;
  if (loading || !user) return <div data-theme={theme} className="min-h-dvh bg-canvas p-8"><Loading label="Restaurando sesión…" /></div>;
  return <div data-theme={theme} className="min-h-dvh bg-canvas text-fg">
    <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:p-3 focus:text-primary-fg">Saltar al contenido</a>
    <aside className={`${mobileOpen ? 'flex' : 'hidden'} fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-line bg-surface lg:flex`}>
      <div className="flex h-24 items-center justify-between px-6"><Link href="/admin" className="flex items-center gap-2.5 text-2xl font-bold tracking-tight"><span className="flex size-9 items-center justify-center rounded-xl bg-primary text-lg text-primary-fg">n.</span>nexo<span className="self-start text-primary">®</span></Link><button aria-label="Cerrar menú" className="p-2 lg:hidden" onClick={() => setMobileOpen(false)}><X className="size-5" /></button></div>
      <div className="px-6 pb-5"><span className="text-[10px] font-semibold uppercase tracking-[.2em] text-muted">Administración institucional</span></div>
      <nav aria-label="Navegación del panel" className="space-y-1 px-3">{navigation.filter(item => user.permissions.includes(item.permission)).map(item => { const active = section?.href === item.href; return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} onClick={() => setMobileOpen(false)} className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-medium transition ${active ? 'bg-primary text-primary-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'}`}><item.icon aria-hidden className="size-4" />{item.label}{active && <ChevronRight className="ml-auto size-4" aria-hidden />}</Link>; })}</nav>
      <div className="mx-5 mt-auto mb-6 rounded-2xl border border-line bg-canvas p-4"><ShieldCheck className="mb-3 size-5 text-primary" /><p className="text-sm font-semibold">Un espacio seguro.</p><p className="mt-2 text-xs leading-5 text-muted">Cada cambio queda registrado. Su institución, siempre en control.</p><Link href="/" className="mt-4 flex items-center gap-2 text-xs font-semibold text-primary">Visitar sitio público <ArrowUpRight className="size-3.5" /></Link></div>
    </aside>
    {mobileOpen && <button aria-label="Cerrar menú lateral" className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />}
    <div className="lg:pl-64"><header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3 sm:px-8"><div className="flex items-center gap-3"><button aria-label="Abrir menú" aria-expanded={mobileOpen} className={`${secondaryClass} px-3 lg:hidden`} onClick={() => setMobileOpen(true)}><Menu className="size-4" /></button><span className="hidden text-xs text-muted sm:inline">Panel de control</span><ChevronRight aria-hidden className="hidden size-3 text-muted sm:block" /><span className="hidden text-sm font-medium sm:inline">{section?.label ?? 'Administración'}</span></div><div className="flex items-center gap-3">{themeButton}<div className="flex items-center gap-3 border-l border-line pl-3"><span className="flex size-9 items-center justify-center rounded-full bg-info-soft text-xs font-semibold text-primary">{user.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><div className="hidden sm:block"><p className="text-xs font-semibold">{user.name}</p><p className="mt-0.5 text-[11px] text-muted">{user.role === 'Admin' ? 'Administradora' : 'Editor'}</p></div></div><button aria-label="Cerrar sesión" disabled={signingOut} className="rounded-lg p-3 text-muted hover:bg-surface-2 disabled:opacity-50" onClick={logout}><LogOut className="size-4" /></button></div></header>
      <main id="admin-main" className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8 sm:py-10">{adminUsesMocks && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted"><span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-warning" />Demo interactiva · Cambios guardados en este navegador</span><ResetDemo /></div>}{error != null && <ErrorState error={error} />}{permission && !user.permissions.includes(permission) ? <div className="rounded-2xl border border-line bg-surface p-10"><ShieldCheck className="mb-4 size-8 text-warning" /><h1 className="text-2xl font-semibold">Acceso restringido</h1><p className="mt-3 text-sm text-muted">Su rol no tiene permiso para consultar esta sección.</p><Link href="/admin" className="mt-6 inline-flex items-center gap-2 text-sm text-primary"><ChartNoAxesCombined className="size-4" />Volver al inicio</Link></div> : children}</main>
      <footer className="flex flex-wrap justify-between gap-3 px-8 py-6 text-[11px] text-muted"><span>© {new Date().getFullYear()} Nexo Institucional · Organización ficticia</span><span>Gestión que conecta.</span></footer>
    </div>
  </div>;
}


