import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { CategoryPreview } from "./category-preview";
import { CategoryThumb, type CategoryEntry } from "./category-thumb";

export type { CategoryEntry } from "./category-thumb";

/**
 * Índice de categorías en tipografía grande (servidor). Con mouse, `CategoryPreview` muestra
 * una vista previa que sigue al puntero; en táctil se ve la miniatura dentro de la fila.
 */
export function CategoryIndex({ categories }: { categories: CategoryEntry[] }) {
  return (
    <section data-theme="dark" aria-labelledby="categorias-title" className="bg-canvas py-24 text-fg sm:py-32">
      <div className="container-site">
        <div className="mb-12 flex items-end justify-between gap-6">
          <h2 id="categorias-title" className="font-display text-display-md font-bold tracking-[-0.04em]">
            Explore por categoría
          </h2>
          <p className="hidden max-w-xs text-muted md:block">Cinco líneas de producto con stock en Bolivia y soporte local.</p>
        </div>

        <div className="relative">
          <ul className="border-t border-line">
            {categories.map((c, i) => (
              <li key={c.slug} data-index={i} className="border-b border-line">
                <Link
                  href={`/catalogo?category=${c.slug}`}
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-6 sm:gap-8 sm:py-8"
                >
                  <span className="font-mono text-xs text-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex min-w-0 items-center gap-4">
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-xl sm:hidden">
                      <CategoryThumb entry={c} sizes="56px" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-display text-[clamp(1.6rem,5vw,4.5rem)] font-bold leading-none tracking-[-0.045em] transition-[color,transform] duration-500 ease-out-expo group-hover:translate-x-3 group-hover:text-lime">
                        {c.name}
                      </span>
                      {c.description && (
                        <span className="mt-2 hidden max-w-xl text-sm text-muted sm:block">{c.description}</span>
                      )}
                    </span>
                  </span>
                  <span className="flex items-center gap-4">
                    <span className="hidden font-mono text-sm text-muted sm:inline">
                      {c.count} {c.count === 1 ? "producto" : "productos"}
                    </span>
                    <span className="grid size-11 place-items-center rounded-full border border-line-strong transition-all duration-500 ease-spring group-hover:rotate-45 group-hover:border-lime group-hover:bg-lime group-hover:text-ink">
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <CategoryPreview categories={categories} />
        </div>
      </div>
    </section>
  );
}
