"use client";

import { MotionScope } from "@/components/motion/motion-scope";
import type {
  Paged,
  ProductFacets,
  ProductQuery,
  ProductSummary,
} from "@/lib/api/types";
import { CatalogProvider } from "./catalog-provider";
import { FilterPanel } from "./filters";
import { Results } from "./results";
import { ActiveChips, MobileFilters, SearchBox, SortSelect } from "./toolbar";

/** Interfaz completa del catálogo (búsqueda, filtros, resultados) para una consulta ya resuelta. */
export function CatalogView({
  query,
  result,
  facets,
}: {
  query: ProductQuery;
  result: Paged<ProductSummary>;
  facets: ProductFacets;
}) {
  return (
    <MotionScope>
      <CatalogProvider query={query}>
        <div className="container-site">
          <div className="sticky top-24 z-20 -mx-2 mb-6 grid gap-3 rounded-[2rem] bg-canvas/85 p-2 backdrop-blur-xl sm:flex sm:items-center">
            <SearchBox />
            <div className="flex items-center gap-2">
              <MobileFilters facets={facets} total={result.totalItems} />
              <SortSelect />
            </div>
          </div>
          <div className="mb-8">
            <ActiveChips facets={facets} />
          </div>
          <div className="grid gap-10 lg:grid-cols-[17.5rem_1fr]">
            <aside aria-label="Filtros" className="hidden lg:block">
              <div
                className="sticky top-48 max-h-[calc(100dvh-13rem)] overflow-y-auto overscroll-contain pb-6 pr-2 [scrollbar-width:thin]"
                data-lenis-prevent
              >
                <FilterPanel facets={facets} />
              </div>
            </aside>
            <Results result={result} />
          </div>
        </div>
      </CatalogProvider>
    </MotionScope>
  );
}
