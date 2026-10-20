"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { mockProducts } from "@/lib/api/mock/products";
import type { ProductFacets } from "@/lib/api/types";
import { queryProducts, toSummary } from "@/lib/catalog/query";
import { CATALOG_PAGE_SIZE, parseCatalogParams } from "@/lib/catalog/url";
import { CatalogView } from "./catalog-view";

/**
 * Catálogo del export estático (GitHub Pages, sin servidor): lee los filtros de la URL y aplica
 * en el navegador las mismas reglas de `GET /products` (`queryProducts`) sobre los datos de ejemplo.
 * Los enlaces compartidos con filtros siguen funcionando.
 */
export function CatalogFromUrl({ facets }: { facets: ProductFacets }) {
  const params = useSearchParams();
  const key = params.toString();

  const { query, result } = useMemo(() => {
    const query = parseCatalogParams(new URLSearchParams(key));
    const page = queryProducts(mockProducts, { ...query, pageSize: CATALOG_PAGE_SIZE });
    return { query, result: { ...page, items: page.items.map(toSummary) } };
  }, [key]);

  return <CatalogView query={query} result={result} facets={facets} />;
}
