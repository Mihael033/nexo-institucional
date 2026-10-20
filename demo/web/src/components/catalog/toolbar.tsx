"use client";

import { AnimatePresence, m } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { ProductFacets, ProductSort } from "@/lib/api/types";
import { countActiveFilters, sortForSearch } from "@/lib/catalog/url";
import { CONDITION_LABEL, formatCompactBs } from "@/lib/format";
import { useCatalog } from "./catalog-provider";
import { attrValueLabel, FilterPanel } from "./filters";

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Más nuevos" },
  { value: "oldest", label: "Más antiguos" },
  { value: "relevance", label: "Relevancia" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "name_asc", label: "Nombre: A–Z" },
  { value: "name_desc", label: "Nombre: Z–A" },
];

/** Búsqueda con debounce (350 ms). Enter aplica de inmediato. */
export function SearchBox() {
  const { query, update, isPending } = useCatalog();
  const [text, setText] = useState(query.q ?? "");
  const last = useRef(query.q ?? "");

  // Si la URL cambia desde afuera (atrás/adelante, limpiar), sincroniza el input.
  useEffect(() => {
    if ((query.q ?? "") !== last.current) {
      last.current = query.q ?? "";
      setText(query.q ?? "");
    }
  }, [query.q]);

  useEffect(() => {
    const value = text.trim();
    if (value === last.current) return;
    const t = setTimeout(() => {
      last.current = value;
      update({ q: value || undefined, sort: sortForSearch(value || undefined, query.sort) });
    }, 350);
    return () => clearTimeout(t);
  }, [text, update, query.sort]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const value = text.trim();
        last.current = value;
        update({ q: value || undefined, sort: sortForSearch(value || undefined, query.sort) });
      }}
      className="relative flex-1"
    >
      <label htmlFor="catalog-search" className="sr-only">
        Buscar productos
      </label>
      <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        id="catalog-search"
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Buscar por nombre, marca o descripción…"
        autoComplete="off"
        className="h-14 w-full rounded-full border border-line-strong bg-surface pl-14 pr-14 text-base text-fg shadow-card transition-[border-color,box-shadow] placeholder:text-muted focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20 [&::-webkit-search-cancel-button]:hidden"
      />
      <span className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center">
        {isPending ? (
          <Spinner className="text-muted" />
        ) : (
          text && (
            <button
              type="button"
              onClick={() => setText("")}
              className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
              aria-label="Borrar búsqueda"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )
        )}
      </span>
    </form>
  );
}

export function SortSelect() {
  const { query, update } = useCatalog();
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="catalog-sort" className="sr-only whitespace-nowrap text-sm text-muted sm:not-sr-only">
        Ordenar por
      </label>
      <NativeSelect
        id="catalog-sort"
        value={query.sort ?? (query.q ? "relevance" : "newest")}
        onChange={(e) => update({ sort: e.target.value as ProductSort })}
        className="h-12 min-w-52 rounded-full"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value} disabled={o.value === "relevance" && !query.q}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

export function MobileFilters({ facets, total }: { facets: ProductFacets; total: number }) {
  const { query } = useCatalog();
  const active = countActiveFilters({ ...query, q: undefined });
  return (
    <Sheet>
      <SheetTrigger className="inline-flex h-12 items-center gap-2 rounded-full border border-line-strong bg-surface px-5 font-medium lg:hidden">
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Filtros
        {active > 0 && (
          <span className="grid size-6 place-items-center rounded-full bg-primary text-xs text-primary-fg">{active}</span>
        )}
      </SheetTrigger>
      <SheetContent
        side="left"
        title="Filtros"
        description="Los resultados se actualizan al instante."
        footer={
          <SheetClose className="h-12 flex-1 rounded-full bg-primary font-semibold text-primary-fg">
            Ver {total} {total === 1 ? "resultado" : "resultados"}
          </SheetClose>
        }
      >
        <FilterPanel facets={facets} />
      </SheetContent>
    </Sheet>
  );
}

/** Chips de filtros activos (cada uno se quita por separado) + "Limpiar todo". */
export function ActiveChips({ facets }: { facets: ProductFacets }) {
  const { query, update, reset } = useCatalog();
  const chips: { key: string; label: string; remove: () => void }[] = [];

  if (query.q) chips.push({ key: "q", label: `“${query.q}”`, remove: () => update({ q: undefined, sort: sortForSearch(undefined, query.sort) }) });
  for (const slug of query.category ?? [])
    chips.push({
      key: `c-${slug}`,
      label: facets.categories.find((c) => c.slug === slug)?.name ?? slug,
      remove: () => update({ category: query.category?.filter((s) => s !== slug) }),
    });
  for (const b of query.brand ?? [])
    chips.push({ key: `b-${b}`, label: b, remove: () => update({ brand: query.brand?.filter((x) => x !== b) }) });
  if (query.condition)
    chips.push({ key: "cond", label: CONDITION_LABEL[query.condition], remove: () => update({ condition: undefined }) });
  if (query.available) chips.push({ key: "av", label: "Con stock", remove: () => update({ available: undefined }) });
  if (query.minPrice !== undefined || query.maxPrice !== undefined)
    chips.push({
      key: "price",
      label: `${formatCompactBs(query.minPrice ?? facets.price.min)} – ${formatCompactBs(query.maxPrice ?? facets.price.max)}`,
      remove: () => update({ minPrice: undefined, maxPrice: undefined }),
    });
  for (const a of query.attr ?? []) {
    const [key, value] = [a.slice(0, a.indexOf(":")), a.slice(a.indexOf(":") + 1)];
    chips.push({
      key: `a-${a}`,
      label: `${facets.attributes.find((x) => x.key === key)?.label ?? key}: ${attrValueLabel(key, value)}`,
      remove: () => update({ attr: query.attr?.filter((x) => x !== a) }),
    });
  }

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos" role="group">
      <AnimatePresence initial={false} mode="popLayout">
        {chips.map((c) => (
          <m.button
            layout
            key={c.key}
            type="button"
            onClick={c.remove}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className="group inline-flex items-center gap-1.5 rounded-full bg-fg py-1.5 pl-3.5 pr-2 text-sm text-canvas"
            aria-label={`Quitar filtro ${c.label}`}
          >
            {c.label}
            <X className="size-3.5 opacity-70 transition-transform group-hover:rotate-90" aria-hidden="true" />
          </m.button>
        ))}
        <m.button
          layout
          key="reset"
          type="button"
          onClick={reset}
          className="px-2 text-sm font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg"
        >
          Limpiar todo
        </m.button>
      </AnimatePresence>
    </div>
  );
}
