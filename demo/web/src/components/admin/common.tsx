'use client';

import { useRef } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, LoaderCircle, X } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge as UiBadge } from '@/components/ui/badge';
import { Field as UiField } from '@/components/ui/field';
import { formatBs, formatDateTime } from '@/lib/format';

export const controlClass = 'h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-fg outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-50';
export const primaryClass = buttonVariants({ variant: 'primary', size: 'md' });
export const secondaryClass = buttonVariants({ variant: 'outline', size: 'md' });
export const money = formatBs;
export const dateTime = (value: string | null) => value ? formatDateTime(value) : '—';

export function PageHeading({ eyebrow = 'Espacio de gestión', title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: React.ReactNode }) {
  return <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-primary">{eyebrow}</p><h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{description}</p></div>{actions && <div className="flex flex-wrap gap-2">{actions}</div>}</div>;
}
export function Loading({ label = 'Cargando información…' }: { label?: string }) { return <div role="status" className="flex min-h-48 items-center justify-center gap-3 rounded-2xl border border-line bg-surface p-8 text-sm text-muted"><LoaderCircle aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />{label}</div>; }
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) { return <div role="alert" className="my-4 flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger"><AlertCircle className="size-5 shrink-0" aria-hidden /><p className="flex-1">{error instanceof Error ? error.message : 'No se pudo completar la operación.'}</p>{retry && <button className={secondaryClass} onClick={retry}>Reintentar</button>}</div>; }
export function Notice({ children }: { children: React.ReactNode }) { return <p role="status" className="mb-4 rounded-xl border border-success/20 bg-success-soft p-4 text-sm text-success">{children}</p>; }
export function Empty({ title = 'No se encontraron resultados', text = 'Pruebe con otros filtros o una búsqueda diferente.' }: { title?: string; text?: string }) { return <div className="p-14 text-center"><p className="font-medium text-fg">{title}</p><p className="mt-2 text-sm text-muted">{text}</p></div>; }
export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) { return <UiBadge variant={tone}>{children}</UiBadge>; }
export function Pagination({ page, totalPages, totalItems, onChange }: { page: number; totalPages: number; totalItems: number; onChange: (page: number) => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4"><p className="text-xs text-muted">{totalItems} registros · Página {page} de {Math.max(1, totalPages)}</p><div className="flex gap-2"><button aria-label="Página anterior" className={secondaryClass} disabled={page <= 1} onClick={() => onChange(page - 1)}><ArrowLeft className="size-4" /></button><button aria-label="Página siguiente" className={secondaryClass} disabled={page >= totalPages} onClick={() => onChange(page + 1)}><ArrowRight className="size-4" /></button></div></div>;
}
export function Field({ label, htmlFor, error, children, hint }: { label: string; htmlFor: string; error?: string; children: React.ReactNode; hint?: string }) { return <UiField label={label} id={htmlFor} error={error} hint={hint}>{children}</UiField>; }
export function Modal({ title, children, onClose, busy = false }: { title: string; children: React.ReactNode; onClose: () => void; busy?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return <dialog ref={element => { dialogRef.current = element; if (element && !element.open) element.showModal(); }} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} aria-label={title} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/60"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-6 py-4"><h2 className="text-lg font-semibold">{title}</h2><button disabled={busy} aria-label="Cerrar diálogo" onClick={onClose} className={`${secondaryClass} px-3`}><X className="size-4" /></button></div><div className="p-6">{children}</div></dialog>;
}
export function downloadBlob(blob: Blob, fileName: string) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = fileName; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

