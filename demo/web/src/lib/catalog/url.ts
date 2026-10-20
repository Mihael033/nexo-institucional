import type { ProductCondition, ProductQuery, ProductSort } from "@/lib/api/types";
import type { Query } from "@/lib/api/http";

/**
 * Estado del catálogo ⇄ URL. Usa las mismas claves que la API (q, category, brand,
 * condition, available, minPrice, maxPrice, attr, sort, page) para que un link
 * compartido sea también una consulta válida.
 */

export const CATALOG_PAGE_SIZE = 9;

const SORTS: readonly ProductSort[] = [
  "relevance",
  "newest",
  "oldest",
  "price_asc",
  "price_desc",
  "name_asc",
  "name_desc",
];

export type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const csv = (v: string | string[] | undefined) =>
  all(v)
    .flatMap((s) => s.split(","))
    .map((s) => s.trim())
    .filter(Boolean);

function int(v: string | undefined): number | undefined {
  const n = num(v);
  return n === undefined ? undefined : Math.trunc(n);
}

/** Precios en Bs: admite decimales con punto (`1250.50`). */
function num(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function parseCatalogParams(params: RawParams | URLSearchParams): ProductQuery {
  const raw: RawParams =
    params instanceof URLSearchParams
      ? [...params.keys()].reduce<RawParams>((acc, k) => ({ ...acc, [k]: params.getAll(k) }), {})
      : params;

  const q = first(raw.q)?.trim().slice(0, 100) || undefined;
  const condition = first(raw.condition);
  const available = first(raw.available);
  const sort = first(raw.sort) as ProductSort | undefined;
  const page = int(first(raw.page));

  return {
    q,
    category: csv(raw.category),
    brand: csv(raw.brand),
    condition: condition === "new" || condition === "used" ? (condition as ProductCondition) : undefined,
    available: available === "true" ? true : undefined,
    minPrice: num(first(raw.minPrice)),
    maxPrice: num(first(raw.maxPrice)),
    attr: all(raw.attr).filter((a) => /^[a-zA-Z0-9]{1,40}:.+/.test(a)),
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    page: page && page > 1 ? page : undefined,
  };
}

/** Para la barra de direcciones: omite valores por defecto, orden estable. */
export function serializeCatalogParams(query: ProductQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.category?.length) sp.set("category", query.category.join(","));
  if (query.brand?.length) sp.set("brand", query.brand.join(","));
  if (query.condition) sp.set("condition", query.condition);
  if (query.available) sp.set("available", "true");
  if (query.minPrice !== undefined) sp.set("minPrice", String(query.minPrice));
  if (query.maxPrice !== undefined) sp.set("maxPrice", String(query.maxPrice));
  for (const a of query.attr ?? []) sp.append("attr", a);
  if (query.sort) sp.set("sort", query.sort);
  if (query.page && query.page > 1) sp.set("page", String(query.page));
  return sp;
}

/** Para `request()`: listas con coma (category, brand), `attr` repetido. */
export function toApiQuery(query: ProductQuery): Query {
  return {
    q: query.q,
    category: query.category?.length ? query.category.join(",") : undefined,
    brand: query.brand?.length ? query.brand.join(",") : undefined,
    condition: query.condition,
    available: query.available,
    featured: query.featured,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    attr: query.attr?.length ? query.attr : undefined,
    sort: query.sort,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export function countActiveFilters(query: ProductQuery): number {
  return (
    (query.q ? 1 : 0) +
    (query.category?.length ?? 0) +
    (query.brand?.length ?? 0) +
    (query.condition ? 1 : 0) +
    (query.available ? 1 : 0) +
    (query.minPrice !== undefined || query.maxPrice !== undefined ? 1 : 0) +
    (query.attr?.length ?? 0)
  );
}

/**
 * Orden al cambiar la búsqueda: con texto y sin orden elegido → relevancia; sin texto,
 * "relevancia" no tiene sentido y vuelve al predeterminado. Un orden manual se respeta.
 */
export function sortForSearch(q: string | undefined, current: ProductSort | undefined): ProductSort | undefined {
  if (q) return current ?? "relevance";
  return current === "relevance" ? undefined : current;
}
