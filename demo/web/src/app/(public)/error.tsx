"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

/** Error inesperado en el sitio público (p. ej. la API no responde). */
export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section data-theme="dark" className="grid min-h-[80dvh] place-items-center bg-canvas px-6 pt-24 text-center text-fg">
      <div className="grid max-w-lg justify-items-center gap-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime">Error</p>
        <h1 className="font-display text-display-md font-bold tracking-[-0.04em]">Algo se desconectó</h1>
        <p className="text-lg text-muted">
          No pudimos cargar esta sección. Puede reintentar ahora o volver en unos minutos.
          {error.digest && <span className="mt-2 block font-mono text-xs">Código: {error.digest}</span>}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-lime px-6 font-semibold text-ink"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reintentar
          </button>
          <Link href="/" className="inline-flex h-12 items-center rounded-full border border-line-strong px-6 font-medium">
            Ir al inicio
          </Link>
        </div>
      </div>
    </section>
  );
}
