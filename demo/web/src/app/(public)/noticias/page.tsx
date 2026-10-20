import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/layout/page-hero";
import { PageTransition } from "@/components/motion/page-transition";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { NewsCard } from "@/components/news/news-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { getNews } from "@/lib/api/public";
import { STATIC_EXPORT } from "@/lib/static-export";
import { ogImages } from "@/lib/site";

export const metadata: Metadata = {
  title: "Noticias",
  description: "Novedades, guías y lanzamientos de Nexo Institucional para instituciones en Bolivia.",
  alternates: { canonical: "/noticias" },
  openGraph: { url: "/noticias", images: ogImages() },
};

const PAGE_SIZE = 9;

export default function NewsPage({ searchParams }: PageProps<"/noticias">) {
  return (
    <PageTransition>
      <PageHero
        compact
        eyebrow="Noticias"
        title="Novedades de la red Nexo"
        subtitle="Lanzamientos, guías prácticas para compras institucionales y lo que pasa en nuestras sedes."
      />
      <div data-theme="light" className="bg-canvas py-20 text-fg sm:py-24">
        <div className="container-site">
          {/* Export estático: sin servidor no hay `?page=`; con los datos de ejemplo todo cabe en la página 1. */}
          {STATIC_EXPORT ? (
            <NewsPageList page={1} />
          ) : (
            <Suspense fallback={<NewsSkeleton />}>
              <NewsList searchParams={searchParams} />
            </Suspense>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

async function NewsList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).page;
  const n = Math.trunc(Number(Array.isArray(raw) ? raw[0] : raw));
  const page = Number.isFinite(n) && n >= 1 ? Math.min(n, 1000) : 1;
  return <NewsPageList page={page} />;
}

async function NewsPageList({ page }: { page: number }) {
  const news = await getNews({ page, pageSize: PAGE_SIZE });

  if (!news.items.length) return <p className="text-muted">Todavía no hay noticias publicadas.</p>;

  const [first, ...rest] = news.items;
  return (
    <>
      <h2 className="sr-only">Todas las noticias</h2>
      <RevealGroup className="grid gap-x-8 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
        <RevealItem className="md:col-span-2 lg:row-span-2">
          <NewsCard news={first} large />
        </RevealItem>
        {rest.map((n) => (
          <RevealItem key={n.id}>
            <NewsCard news={n} />
          </RevealItem>
        ))}
      </RevealGroup>
      <Pagination
        className="mt-16"
        page={news.page}
        totalPages={news.totalPages}
        hrefFor={(p) => (p === 1 ? "/noticias" : `/noticias?page=${p}`)}
      />
    </>
  );
}

function NewsSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      <span className="sr-only" role="status">
        Cargando noticias…
      </span>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="grid gap-4">
          <Skeleton className="aspect-[4/3] rounded-xl" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-6 w-4/5" />
        </div>
      ))}
    </div>
  );
}
