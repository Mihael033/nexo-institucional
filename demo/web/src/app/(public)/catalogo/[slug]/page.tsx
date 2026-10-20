import { ArrowLeft, ArrowUpRight, Headset, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetailSkeleton } from "@/components/catalog/skeleton";
import { Gallery } from "@/components/catalog/gallery";
import { ProductCard } from "@/components/catalog/product-card";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { PageTransition } from "@/components/motion/page-transition";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { getProductBySlug, getProductSlugsForBuild } from "@/lib/api/public";
import { cn } from "@/lib/cn";
import { CONDITION_LABEL, formatBs } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { isPlaceholderImage } from "@/lib/visuals";
import { ogImages } from "@/lib/site";
import { MaybeSuspense } from "@/components/layout/maybe-suspense";

export async function generateStaticParams() {
  const slugs = await getProductSlugsForBuild();
  // Cache Components exige al menos un parámetro; sin API en el build, el resto se genera a pedido (ISR).
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: "__sin-api-en-build__" }];
}

export async function generateMetadata({ params }: PageProps<"/catalogo/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Producto no encontrado" };
  const description = `${product.name} (${product.brand}) por ${formatBs(product.priceBs)}. ${product.description}`;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/catalogo/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      url: `/catalogo/${product.slug}`,
      // Sin foto real se usa la imagen Open Graph por defecto del sitio.
      images: ogImages(product.images.filter((i) => !isPlaceholderImage(i.url)).slice(0, 1).map((i) => ({ url: i.url, alt: product.name }))),
    },
  };
}

const PERKS = [
  { icon: ShieldCheck, title: "Garantía local", text: "Respaldo y repuestos en Bolivia." },
  { icon: Truck, title: "Entrega coordinada", text: "En los 9 departamentos, con acta de recepción." },
  { icon: Headset, title: "Soporte", text: "Mesa de ayuda en días hábiles." },
];

export default function ProductPage({ params }: PageProps<"/catalogo/[slug]">) {
  return (
    <MaybeSuspense fallback={<ProductDetailSkeleton />}>
      <ProductContent params={params} />
    </MaybeSuspense>
  );
}

async function ProductContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <PageTransition>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description,
          sku: String(product.id),
          brand: { "@type": "Brand", name: product.brand },
          category: product.category.name,
          image: product.images.map((i) => i.url).filter((u) => !isPlaceholderImage(u)),
          itemCondition:
            product.condition === "new" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
          offers: {
            "@type": "Offer",
            price: product.priceBs.toFixed(2),
            priceCurrency: "BOB",
            availability: product.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `${SITE_URL}/catalogo/${product.slug}`,
          },
        }}
      />
      <div data-theme="light" className="bg-canvas pb-24 pt-32 text-fg sm:pt-36">
        <div className="container-site">
          <Breadcrumbs
            items={[
              { label: "Inicio", href: "/" },
              { label: "Catálogo", href: "/catalogo" },
              { label: product.category.name, href: `/catalogo?category=${product.category.slug}` },
              { label: product.name },
            ]}
          />

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Gallery images={product.images} product={product} />
            </div>

            <div className="grid content-start gap-8">
              <Reveal y={20}>
                <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-muted">
                  {product.category.name} · {product.brand}
                </p>
                <h1 className="font-display text-display-lg font-extrabold tracking-[-0.045em] [font-stretch:105%]">
                  {product.name}
                </h1>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium">
                    {CONDITION_LABEL[product.condition]}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium",
                      product.isAvailable ? "bg-success-soft text-success" : "bg-surface-2 text-muted",
                    )}
                  >
                    <span className="relative flex size-2" aria-hidden="true">
                      {product.isAvailable && (
                        <span className="absolute inset-0 rounded-full bg-success motion-safe:animate-ping" />
                      )}
                      <span className={cn("relative size-2 rounded-full", product.isAvailable ? "bg-success" : "bg-muted")} />
                    </span>
                    {product.isAvailable ? "Disponible para entrega" : "Sin stock por ahora"}
                  </span>
                  {product.isFeatured && (
                    <span className="rounded-full bg-lime px-3 py-1.5 text-sm font-semibold text-ink">Destacado</span>
                  )}
                </div>
              </Reveal>

              <Reveal y={20} delay={0.08} className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
                <p className="text-sm text-muted">Precio de referencia</p>
                <p className="mt-1 font-display text-[clamp(2.25rem,4vw,3.25rem)] font-black tabular-nums tracking-[-0.04em]">
                  {formatBs(product.priceBs)}
                </p>
                <p className="mt-1 text-sm text-muted">Incluye IVA. Precios institucionales por volumen a consultar.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/contacto?producto=${product.slug}`}
                    className="group inline-flex h-13 items-center gap-3 rounded-full bg-primary pl-6 pr-2 font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
                  >
                    Solicitar cotización
                    <span className="grid size-9 place-items-center rounded-full bg-lime text-ink transition-transform duration-500 ease-spring group-hover:rotate-45">
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </span>
                  </Link>
                  <Link
                    href="/catalogo"
                    className="inline-flex h-13 items-center gap-2 rounded-full border border-line-strong px-6 font-medium transition-colors hover:border-fg"
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Volver al catálogo
                  </Link>
                </div>
              </Reveal>

              <Reveal y={20} delay={0.14}>
                <h2 className="mb-3 font-display text-xl font-semibold">Descripción</h2>
                <p className="text-lg leading-relaxed text-muted">{product.description}</p>
              </Reveal>

              <Reveal y={20} delay={0.2}>
                <h2 className="mb-3 font-display text-xl font-semibold">Características</h2>
                <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                  {[
                    { label: "Marca", value: product.brand },
                    { label: "Categoría", value: product.category.name },
                    { label: "Estado", value: CONDITION_LABEL[product.condition] },
                    ...product.attributes.map((a) => ({
                      label: a.label,
                      value: a.key === "garantiaMeses" ? `${a.value} meses` : a.value,
                    })),
                  ].map((row) => (
                    <div key={row.label} className="grid grid-cols-2 gap-4 px-5 py-3.5">
                      <dt className="text-muted">{row.label}</dt>
                      <dd className="font-medium">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>

              <RevealGroup as="ul" className="grid gap-3 sm:grid-cols-3">
                {PERKS.map(({ icon: Icon, title, text }) => (
                  <RevealItem as="li" key={title} className="rounded-xl bg-surface-2 p-4">
                    <Icon className="mb-3 size-5 text-primary" aria-hidden="true" />
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-muted">{text}</p>
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          </div>

          {product.related.length > 0 && (
            <section aria-labelledby="related-title" className="mt-28">
              <h2 id="related-title" className="mb-10 font-display text-display-md font-bold tracking-[-0.04em]">
                También en {product.category.name}
              </h2>
              <RevealGroup as="ul" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {product.related.map((p) => (
                  <RevealItem as="li" key={p.id}>
                    <ProductCard product={p} sizes="(min-width:1024px) 22vw, (min-width:640px) 45vw, 92vw" />
                  </RevealItem>
                ))}
              </RevealGroup>
            </section>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
