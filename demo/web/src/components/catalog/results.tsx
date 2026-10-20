"use client";

import { AnimatePresence, m } from "framer-motion";
import { PackageSearch } from "lucide-react";
import { useRef } from "react";
import { getLenis } from "@/components/motion/motion-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import type { Paged, ProductSummary } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { serializeCatalogParams } from "@/lib/catalog/url";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { useCatalog } from "./catalog-provider";
import { ProductCard } from "./product-card";

/** Grilla con animaciones de layout al filtrar; se atenúa mientras llega la nueva página. */
export function Results({ result }: { result: Paged<ProductSummary> }) {
  const { query, isPending, update, reset } = useCatalog();
  const top = useRef<HTMLDivElement>(null);
  const { items, totalItems, page, totalPages } = result;

  const goTo = (p: number) => {
    update({ page: p });
    const el = top.current;
    if (!el) return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(el, { offset: -120 });
    else el.scrollIntoView({ block: "start" });
  };

  return (
    <div ref={top} className="scroll-mt-32">
      <h2 className="sr-only">Resultados</h2>
      <p className="mb-5 text-sm text-muted" role="status" aria-live="polite">
        {isPending ? (
          "Buscando…"
        ) : (
          <>
            <strong className="font-semibold text-fg">{totalItems}</strong>{" "}
            {totalItems === 1 ? "producto encontrado" : "productos encontrados"}
            {totalPages > 1 && ` · página ${page} de ${totalPages}`}
          </>
        )}
      </p>

      {items.length === 0 ? (
        <EmptyState
          icon={<PackageSearch />}
          title="No encontramos productos con esos filtros"
          description="Pruebe con otra búsqueda, amplíe el rango de precio o quite algunos filtros."
          action={
            <Button variant="primary" onClick={reset}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <m.ul
          aria-busy={isPending}
          className={cn(
            "grid gap-5 transition-[opacity,filter] duration-300 sm:grid-cols-2 xl:grid-cols-3",
            isPending && "pointer-events-none opacity-50 saturate-50",
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map((p, i) => (
              <m.li
                layout
                key={p.id}
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
                transition={{ duration: 0.6, delay: Math.min(i, 8) * 0.04, ease: EASE_OUT_EXPO }}
              >
                <ProductCard product={p} priority={i < 3} />
              </m.li>
            ))}
          </AnimatePresence>
        </m.ul>
      )}

      <Pagination
        className="mt-12"
        page={page}
        totalPages={totalPages}
        hrefFor={(p) => {
          const qs = serializeCatalogParams({ ...query, page: p }).toString();
          return qs ? `/catalogo?${qs}` : "/catalogo";
        }}
        onPageChange={goTo}
      />
    </div>
  );
}
