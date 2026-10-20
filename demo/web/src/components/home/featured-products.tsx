import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/catalog/product-card";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { SplitLines } from "@/components/motion/split-text";
import type { ProductSummary } from "@/lib/api/types";

export function FeaturedProducts({ products, total }: { products: ProductSummary[]; total: number }) {
  return (
    <section aria-labelledby="destacados-title" className="bg-paper py-24 text-ink sm:py-32" data-theme="light">
      <div className="container-site">
        <div className="mb-14 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.24em] text-ink/70">Catálogo · Destacados</p>
            <SplitLines
              as="h2"
              inView
              label="Equipamiento listo para entregar"
              lines={[
                "Equipamiento",
                <span key="l2">
                  listo para <em className="font-serif font-normal italic text-cobalt">entregar</em>
                </span>,
              ]}
              className="font-display text-display-lg font-extrabold tracking-[-0.045em] [font-stretch:108%]"
            />
            <span id="destacados-title" className="sr-only">
              Productos destacados
            </span>
          </div>
          <Link
            href="/catalogo"
            className="group inline-flex w-fit items-center gap-3 font-medium text-ink"
          >
            <span className="link-underline">Ver los {total} productos</span>
            <span className="grid size-11 place-items-center rounded-full border border-ink/25 transition-all duration-500 ease-spring group-hover:translate-x-1 group-hover:border-ink group-hover:bg-ink group-hover:text-lime">
              <ArrowRight className="size-4" aria-hidden="true" />
            </span>
          </Link>
        </div>

        <RevealGroup as="ul" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.1}>
          {products.map((p, i) => (
            <RevealItem as="li" key={p.id}>
              <ProductCard product={p} priority={i < 3} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
