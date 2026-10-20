import type { Metadata } from "next";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { notFound } from "next/navigation";
import { CtaBlock } from "@/components/blocks/cta-block";
import { FeaturesSlides } from "@/components/blocks/features-slides";
import { StatsBand } from "@/components/blocks/stats-band";
import { CategoryIndex } from "@/components/home/category-index";
import { FeaturedProducts } from "@/components/home/featured-products";
import { Hero } from "@/components/home/hero";
import { LatestNews } from "@/components/home/latest-news";
import { Manifesto } from "@/components/home/manifesto";
import { JsonLd } from "@/components/seo/json-ld";
import { PageTransition } from "@/components/motion/page-transition";
import { getCategories, getNews, getPage, getProducts, getSite } from "@/lib/api/public";
import { findBlock } from "@/lib/blocks";
import { ogImages, SITE_URL } from "@/lib/site";
import { MaybeSuspense } from "@/components/layout/maybe-suspense";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("inicio");
  return {
    title: { absolute: page?.seo.title ?? "Nexo Institucional" },
    description: page?.seo.description,
    alternates: { canonical: "/" },
    openGraph: { title: page?.seo.title, description: page?.seo.description, url: "/", images: ogImages() },
  };
}

export default function HomePage() {
  return (
    <MaybeSuspense fallback={<PageSkeleton tall />}>
      <HomeContent />
    </MaybeSuspense>
  );
}

async function HomeContent() {
  const [page, site, featured, all, categories, news] = await Promise.all([
    getPage("inicio"),
    getSite(),
    getProducts({ featured: true, pageSize: 6, sort: "newest" }),
    getProducts({ pageSize: 100 }),
    getCategories(),
    getNews({ pageSize: 3 }),
  ]);
  const hero = findBlock(page, "hero");
  if (!page || !hero) notFound();

  const features = findBlock(page, "features");
  const stats = findBlock(page, "stats");
  const cta = findBlock(page, "cta");
  const about = findBlock(page, "richText");

  const categoryEntries = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    count: c.productCount,
    description: c.description,
    image:
      all.items.find((p) => p.category.slug === c.slug && p.isFeatured)?.thumbnail.url ??
      all.items.find((p) => p.category.slug === c.slug)?.thumbnail.url ??
      "https://picsum.photos/seed/nexo-cat/800/600",
  }));

  return (
    <PageTransition>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: site.name,
          slogan: site.slogan,
          url: SITE_URL,
          email: site.contact.email,
          telephone: site.contact.phone,
          address: { "@type": "PostalAddress", streetAddress: site.contact.address, addressCountry: "BO" },
          sameAs: site.social.map((s) => s.url),
        }}
      />
      <Hero data={hero} products={featured.items} />
      {about && <Manifesto data={about} stat={stats?.items[1] ?? stats?.items[0]} />}
      {features && <FeaturesSlides data={features} />}
      {stats && <StatsBand data={stats} />}
      <FeaturedProducts products={featured.items} total={all.totalItems} />
      <CategoryIndex categories={categoryEntries} />
      <LatestNews news={news.items} />
      {cta && <CtaBlock data={cta} />}
    </PageTransition>
  );
}
