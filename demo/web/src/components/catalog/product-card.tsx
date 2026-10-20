import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";
import { ProductImage } from "@/components/visuals/product-visual";
import type { ProductSummary } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { CONDITION_LABEL, formatBs } from "@/lib/format";

/**
 * Tarjeta de producto. La imagen comparte `ViewTransition name` con la galería del detalle,
 * así al navegar la imagen "vuela" de la grilla a su lugar en la ficha.
 */
export function ProductCard({
  product,
  priority,
  sizes = "(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 92vw",
  className,
}: {
  product: ProductSummary;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface text-fg",
        "transition-[transform,box-shadow,border-color] duration-500 ease-out-expo hover:-translate-y-1.5 hover:border-line-strong hover:shadow-float",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        <ViewTransition name={`product-${product.slug}`} share="morph" default="none">
          <ProductImage
            image={product.thumbnail}
            product={product}
            decorative
            sizes={sizes}
            priority={priority}
            className={cn(
              "transition-[transform,filter] duration-[1.2s] ease-out-expo group-hover:scale-[1.06]",
              !product.isAvailable && "grayscale-[0.6]",
            )}
          />
        </ViewTransition>
        <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-ink/75 px-2.5 py-1 text-xs font-medium text-paper backdrop-blur-md">
            {CONDITION_LABEL[product.condition]}
          </span>
          {product.isFeatured && (
            <span className="rounded-full bg-lime px-2.5 py-1 text-xs font-semibold text-ink">Destacado</span>
          )}
          {!product.isAvailable && (
            <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-ink">Sin stock</span>
          )}
        </div>
        <span
          aria-hidden="true"
          className="absolute bottom-3 right-3 grid size-11 translate-y-3 scale-75 place-items-center rounded-full bg-lime text-ink opacity-0 shadow-float transition-all duration-500 ease-spring group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100"
        >
          <ArrowUpRight className="size-5" />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted">
          {product.category.name} · {product.brand}
        </p>
        <h3 className="font-display text-lg font-semibold leading-snug tracking-tight">
          <Link
            href={`/catalogo/${product.slug}`}
            className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none after:focus-visible:outline-3 after:focus-visible:outline-offset-2 after:focus-visible:outline-ring"
          >
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-dashed border-line pt-4">
          <p className="font-display text-xl font-bold tabular-nums tracking-tight">{formatBs(product.priceBs)}</p>
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              product.isAvailable ? "text-success" : "text-muted",
            )}
          >
            <span
              aria-hidden="true"
              className={cn("size-1.5 rounded-full", product.isAvailable ? "bg-success" : "bg-muted")}
            />
            {product.isAvailable ? "Disponible" : "Sin stock"}
          </p>
        </div>
      </div>
    </article>
  );
}
