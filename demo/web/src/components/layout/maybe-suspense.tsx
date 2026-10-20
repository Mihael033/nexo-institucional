import { Suspense, type ReactNode } from "react";
import { STATIC_EXPORT } from "@/lib/static-export";

/**
 * `<Suspense>` en modo servidor (PPR: el contenido asíncrono llega en streaming). En el export
 * estático todo se resuelve en el build: sin el límite, el contenido va en su lugar dentro del
 * HTML (sin esperar al script que lo intercambia) y la página pinta antes.
 */
export function MaybeSuspense({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return STATIC_EXPORT ? <>{children}</> : <Suspense fallback={fallback}>{children}</Suspense>;
}
