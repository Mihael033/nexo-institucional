"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useOptimistic, useTransition, type ReactNode } from "react";
import type { ProductQuery } from "@/lib/api/types";
import { serializeCatalogParams } from "@/lib/catalog/url";

type Ctx = {
  /** Estado de filtros (optimista: refleja el cambio antes de que llegue la respuesta). */
  query: ProductQuery;
  isPending: boolean;
  /** Aplica cambios; cualquier filtro distinto de `page` vuelve a la página 1. */
  update: (patch: Partial<ProductQuery>) => void;
  reset: () => void;
};

const CatalogContext = createContext<Ctx | null>(null);

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog debe usarse dentro de <CatalogProvider>");
  return ctx;
}

/**
 * Fuente única del estado del catálogo: la URL. Cada cambio hace `router.push`
 * (el botón atrás deshace el filtro) dentro de una transición; el Server Component vuelve a consultar la API y
 * `useOptimistic` mantiene la interfaz al instante.
 */
export function CatalogProvider({ query, children }: { query: ProductQuery; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(query);

  const go = useCallback(
    (next: ProductQuery) => {
      const qs = serializeCatalogParams(next).toString();
      startTransition(() => {
        setOptimistic(next);
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, setOptimistic],
  );

  const update = useCallback(
    (patch: Partial<ProductQuery>) => {
      const keepPage = Object.keys(patch).length === 1 && "page" in patch;
      go({ ...optimistic, ...patch, page: keepPage ? patch.page : undefined });
    },
    [go, optimistic],
  );

  const reset = useCallback(
    () => go({ sort: optimistic.sort === "relevance" ? undefined : optimistic.sort }),
    [go, optimistic.sort],
  );

  return (
    <CatalogContext.Provider value={{ query: optimistic, isPending, update, reset }}>{children}</CatalogContext.Provider>
  );
}
