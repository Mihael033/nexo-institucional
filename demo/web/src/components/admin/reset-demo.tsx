'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { adminApi, adminUsesMocks } from '@/lib/api/admin';
import { ErrorState, Modal, primaryClass, secondaryClass } from './common';

export function ResetDemo() {
  const router = useRouter(), client = useQueryClient();
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  if (!adminUsesMocks) return null;
  async function reset() {
    setBusy(true); setError(null);
    try { await adminApi.resetDemo(); client.clear(); setOpen(false); router.replace('/admin/login'); }
    catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }
  return <><button type="button" className={`${secondaryClass} text-xs`} onClick={() => { setError(null); setOpen(true); }}><RotateCcw aria-hidden className="size-4" />Restablecer demo</button>{open && <Modal title="Restablecer demo" busy={busy} onClose={() => setOpen(false)}><p className="text-sm leading-7 text-muted">Se eliminarán los cambios del catálogo, los mensajes de prueba y la bitácora guardados en este navegador. Se recuperarán los datos originales y se cerrará su sesión. Los datos de otros sitios no se modificarán.</p>{error != null && <ErrorState error={error} />}<div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} className={secondaryClass} onClick={() => setOpen(false)}>Cancelar</button><button type="button" disabled={busy} className={primaryClass} onClick={reset}>{busy ? 'Restableciendo…' : 'Restablecer y salir'}</button></div></Modal>}</>;
}
