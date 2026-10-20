import type { Metadata } from "next";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { PageTransition } from "@/components/motion/page-transition";
import { getPage } from "@/lib/api/public";
import { isPlaceholderImage } from "@/lib/visuals";
import { ogImages } from "@/lib/site";
import { MaybeSuspense } from "@/components/layout/maybe-suspense";

const SLUG = "servicios";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG);
  return {
    title: page?.seo.title ?? "Servicios",
    description: page?.seo.description,
    alternates: { canonical: `/${SLUG}` },
    openGraph: { url: `/${SLUG}`, images: ogImages(page?.seo.ogImageUrl && !isPlaceholderImage(page.seo.ogImageUrl) ? [{ url: page.seo.ogImageUrl }] : []) },
  };
}

export default function ServicesPage() {
  return (
    <MaybeSuspense fallback={<PageSkeleton />}>
      <ServicesContent />
    </MaybeSuspense>
  );
}

async function ServicesContent() {
  const page = await getPage(SLUG);
  if (!page) notFound();
  return (
    <PageTransition>
      <BlockRenderer blocks={page.blocks} features="grid" />
    </PageTransition>
  );
}
