import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageTransition } from "@/components/motion/page-transition";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { SplitLines } from "@/components/motion/split-text";
import { NewsCard } from "@/components/news/news-card";
import { JsonLd } from "@/components/seo/json-ld";
import { ContentImage } from "@/components/visuals/brand-visual";
import { Skeleton } from "@/components/ui/skeleton";
import { getNewsBySlug, getNewsSlugsForBuild } from "@/lib/api/public";
import { formatDate } from "@/lib/format";
import { sanitizeRichText } from "@/lib/sanitize";
import { SITE_URL } from "@/lib/site";
import { isPlaceholderImage } from "@/lib/visuals";
import { ogImages } from "@/lib/site";
import { MaybeSuspense } from "@/components/layout/maybe-suspense";

export async function generateStaticParams() {
  const slugs = await getNewsSlugsForBuild();
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: "__sin-api-en-build__" }];
}

export async function generateMetadata({ params }: PageProps<"/noticias/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const news = await getNewsBySlug(slug);
  if (!news) return { title: "Noticia no encontrada" };
  return {
    title: news.seo.title || news.title,
    description: news.seo.description || news.excerpt,
    alternates: { canonical: `/noticias/${news.slug}` },
    openGraph: {
      type: "article",
      title: news.title,
      description: news.excerpt,
      url: `/noticias/${news.slug}`,
      publishedTime: news.publishedAt,
      authors: [news.author],
      tags: news.tags,
      images: ogImages(
        [news.seo.ogImageUrl, news.coverImage.url]
          .filter((u): u is string => !!u && !isPlaceholderImage(u))
          .slice(0, 1)
          .map((url) => ({ url, alt: news.coverImage.alt })),
      ),
    },
  };
}

export default function NewsArticlePage({ params }: PageProps<"/noticias/[slug]">) {
  return (
    <MaybeSuspense fallback={<ArticleSkeleton />}>
      <Article params={params} />
    </MaybeSuspense>
  );
}

/** Minutos de lectura estimados (200 palabras/min). */
const readingTime = (html: string) => Math.max(1, Math.round(html.replace(/<[^>]+>/g, " ").split(/\s+/).length / 200));

async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const news = await getNewsBySlug(slug);
  if (!news) notFound();

  return (
    <PageTransition>
      <ScrollProgress />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: news.title,
          description: news.excerpt,
          image: [news.coverImage.url].filter((u) => !isPlaceholderImage(u)),
          datePublished: news.publishedAt,
          author: { "@type": "Organization", name: news.author },
          publisher: { "@type": "Organization", name: "Nexo Institucional" },
          mainEntityOfPage: `${SITE_URL}/noticias/${news.slug}`,
        }}
      />
      <article>
        <header data-theme="dark" className="grain relative isolate overflow-hidden bg-canvas pb-16 pt-36 text-fg sm:pt-44">
          <div aria-hidden="true" className="absolute -right-[20%] -top-[30%] -z-10 size-[60vw] rounded-full bg-cobalt/25 blur-[140px]" />
          <div className="container-site">
            <Breadcrumbs
              items={[
                { label: "Inicio", href: "/" },
                { label: "Noticias", href: "/noticias" },
                { label: news.title },
              ]}
            />
            <div className="mt-10 flex flex-wrap items-center gap-2">
              {news.tags.map((t) => (
                <span key={t} className="rounded-full border border-line-strong px-3 py-1 text-xs font-medium">
                  {t}
                </span>
              ))}
            </div>
            <SplitLines
              label={news.title}
              lines={[news.title]}
              delay={0.1}
              className="mt-6 max-w-5xl font-display text-display-lg font-extrabold tracking-[-0.045em]"
              lineClassName="[&>span]:text-balance"
            />
            <Reveal delay={0.3} y={12}>
              <p className="mt-8 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs uppercase tracking-[0.16em] text-muted">
                <time dateTime={news.publishedAt}>{formatDate(news.publishedAt)}</time>
                <span aria-hidden="true">·</span>
                <span>{news.author}</span>
                <span aria-hidden="true">·</span>
                <span>{readingTime(news.html)} min de lectura</span>
              </p>
            </Reveal>
          </div>
        </header>

        <div data-theme="light" className="bg-canvas pb-24 text-fg">
          <div className="container-site">
            <div className="relative -mt-2 aspect-[16/8] overflow-hidden rounded-2xl">
              <ViewTransition name={`news-${news.slug}`} share="morph" default="none">
                <div className="absolute inset-0">
                  <ContentImage image={news.coverImage} priority sizes="100vw" />
                </div>
              </ViewTransition>
            </div>
            <div className="mx-auto mt-16 max-w-(--container-prose)">
              <p className="mb-10 text-xl leading-relaxed text-fg sm:text-2xl">{news.excerpt}</p>
              <div className="prose-nexo" dangerouslySetInnerHTML={{ __html: sanitizeRichText(news.html) }} />
              <Link
                href="/noticias"
                className="mt-14 inline-flex items-center gap-2 rounded-full border border-line-strong px-5 py-3 font-medium transition-colors hover:border-fg"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Todas las noticias
              </Link>
            </div>

            {news.related.length > 0 && (
              <section aria-labelledby="related-news" className="mt-28">
                <h2 id="related-news" className="mb-10 font-display text-display-md font-bold tracking-[-0.04em]">
                  Siga leyendo
                </h2>
                <RevealGroup className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
                  {news.related.slice(0, 3).map((n) => (
                    <RevealItem key={n.id}>
                      <NewsCard news={n} />
                    </RevealItem>
                  ))}
                </RevealGroup>
              </section>
            )}
          </div>
        </div>
      </article>
    </PageTransition>
  );
}

function ArticleSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        Cargando noticia…
      </span>
      <div data-theme="dark" className="bg-canvas pb-16 pt-44">
        <div className="container-site grid gap-5">
          <Skeleton className="h-4 w-60" />
          <Skeleton className="h-16 w-4/5" />
          <Skeleton className="h-16 w-3/5" />
        </div>
      </div>
      <div className="container-site py-8">
        <Skeleton className="aspect-[16/8] rounded-2xl" />
      </div>
    </div>
  );
}
