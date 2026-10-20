import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogFromUrl } from "@/components/catalog/catalog-from-url";
import { CatalogView } from "@/components/catalog/catalog-view";
import { CatalogSkeleton } from "@/components/catalog/skeleton";
import { PageHero } from "@/components/layout/page-hero";
import { PageTransition } from "@/components/motion/page-transition";
import { getProductFacets, getProducts } from "@/lib/api/public";
import { CATALOG_PAGE_SIZE, parseCatalogParams, type RawParams } from "@/lib/catalog/url";
import { STATIC_EXPORT } from "@/lib/static-export";
import { ogImages } from "@/lib/site";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Equipos de red, mobiliario, herramientas, electrodomésticos y vehículos para instituciones en Bolivia. Precios en bolivianos y stock actualizado.",
  alternates: { canonical: "/catalogo" },
  openGraph: { title: "Catálogo · Nexo Institucional", url: "/catalogo", images: ogImages() },
};

export default function CatalogPage({ searchParams }: PageProps<"/catalogo">) {
  return (
    <PageTransition>
      <PageHero
        compact
        eyebrow="Catálogo institucional"
        title="Todo para equipar su institución"
        subtitle="Busque, filtre y compare con precios en bolivianos. Cada filtro queda en el enlace: compártalo con su equipo."
      />
      <div data-theme="light" className="bg-canvas pb-28 pt-10 text-fg">
        {STATIC_EXPORT ? (
          <StaticCatalog />
        ) : (
          <Suspense fallback={<CatalogSkeleton />}>
            <CatalogBody searchParams={searchParams} />
          </Suspense>
        )}
      </div>
    </PageTransition>
  );
}

async function CatalogBody({ searchParams }: { searchParams: Promise<RawParams> }) {
  const query = parseCatalogParams(await searchParams);
  const [result, facets] = await Promise.all([
    getProducts({ ...query, pageSize: CATALOG_PAGE_SIZE }),
    getProductFacets(),
  ]);

  return <CatalogView query={query} result={result} facets={facets} />;
}

/**
 * Export estático: el HTML trae el catálogo sin filtros (completo para SEO y primera carga) y,
 * al hidratar, `CatalogFromUrl` aplica los filtros de la URL en el navegador.
 */
async function StaticCatalog() {
  const [result, facets] = await Promise.all([getProducts({ pageSize: CATALOG_PAGE_SIZE }), getProductFacets()]);
  return (
    <Suspense fallback={<CatalogView query={{}} result={result} facets={facets} />}>
      <CatalogFromUrl facets={facets} />
    </Suspense>
  );
}
