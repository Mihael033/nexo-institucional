import type {
  Paged,
  ProductCondition,
  ProductDetail,
  ProductFacets,
  ProductQuery,
  ProductSummary,
} from "@/lib/api/types";

/**
 * Lógica pura del catálogo, idéntica a las reglas de GET /products del contrato.
 * La usa el mock de la API y está cubierta por tests (query.test.ts).
 */

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;

/** Minúsculas y sin acentos: "Vehículo" → "vehiculo". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

type Searchable = ProductSummary & Partial<Pick<ProductDetail, "description" | "attributes">>;

function relevance(p: Searchable, terms: string[]): number {
  const name = normalize(p.name);
  const brand = normalize(p.brand);
  const desc = normalize(p.description ?? "");
  let score = 0;
  for (const t of terms) {
    if (name.startsWith(t)) score += 6;
    else if (name.includes(t)) score += 4;
    if (brand.includes(t)) score += 2;
    if (desc.includes(t)) score += 1;
  }
  return score;
}

function matchesText(p: Searchable, terms: string[]): boolean {
  const haystack = normalize(`${p.name} ${p.brand} ${p.category.name} ${p.description ?? ""}`);
  return terms.every((t) => haystack.includes(t));
}

/** `["ubicacion:La Paz", "ubicacion:Cochabamba", "garantiaMeses:12"]` → Map(clave → valores). */
export function groupAttrFilters(attr: readonly string[] = []): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const pair of attr) {
    const i = pair.indexOf(":");
    if (i <= 0) continue;
    const key = pair.slice(0, i);
    const value = normalize(pair.slice(i + 1));
    if (!value) continue;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(value);
  }
  return map;
}

export function filterProducts<T extends Searchable>(products: readonly T[], query: ProductQuery = {}): T[] {
  const terms = query.q ? normalize(query.q).split(/\s+/).filter(Boolean) : [];
  const categories = new Set(query.category ?? []);
  const brands = new Set((query.brand ?? []).map(normalize));
  const attrs = groupAttrFilters(query.attr);

  return products.filter((p) => {
    if (terms.length && !matchesText(p, terms)) return false;
    if (categories.size && !categories.has(p.category.slug)) return false;
    if (brands.size && !brands.has(normalize(p.brand))) return false;
    if (query.condition && p.condition !== query.condition) return false;
    if (query.available !== undefined && p.isAvailable !== query.available) return false;
    if (query.featured && !p.isFeatured) return false;
    if (query.minPrice !== undefined && p.priceBs < query.minPrice) return false;
    if (query.maxPrice !== undefined && p.priceBs > query.maxPrice) return false;
    for (const [key, values] of attrs) {
      const attr = p.attributes?.find((a) => a.key === key);
      if (!attr || !values.has(normalize(attr.value))) return false;
    }
    return true;
  });
}

export function sortProducts<T extends Searchable>(products: readonly T[], query: ProductQuery = {}): T[] {
  const terms = query.q ? normalize(query.q).split(/\s+/).filter(Boolean) : [];
  const sort = query.sort === "relevance" && !terms.length ? "newest" : (query.sort ?? "newest");
  const byDate = (a: T, b: T) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id - b.id;
  const list = [...products];
  switch (sort) {
    case "oldest":
      return list.sort((a, b) => -byDate(a, b));
    case "price_asc":
      return list.sort((a, b) => a.priceBs - b.priceBs || a.id - b.id);
    case "price_desc":
      return list.sort((a, b) => b.priceBs - a.priceBs || a.id - b.id);
    case "name_asc":
      return list.sort((a, b) => a.name.localeCompare(b.name, "es"));
    case "name_desc":
      return list.sort((a, b) => b.name.localeCompare(a.name, "es"));
    case "relevance":
      return list.sort((a, b) => relevance(b, terms) - relevance(a, terms) || byDate(a, b));
    default:
      return list.sort(byDate);
  }
}

export function paginate<T>(items: readonly T[], page = 1, pageSize = DEFAULT_PAGE_SIZE): Paged<T> {
  const size = Math.min(Math.max(1, Math.trunc(pageSize)), MAX_PAGE_SIZE);
  const current = Math.max(1, Math.trunc(page));
  const start = (current - 1) * size;
  return {
    items: items.slice(start, start + size),
    page: current,
    pageSize: size,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / size),
  };
}

export function queryProducts<T extends Searchable>(products: readonly T[], query: ProductQuery = {}): Paged<T> {
  return paginate(sortProducts(filterProducts(products, query), query), query.page, query.pageSize);
}

const CONDITION_LABEL: Record<ProductCondition, string> = { new: "Nuevo", used: "Usado" };

export function computeFacets(products: readonly ProductDetail[]): ProductFacets {
  const count = <K extends string>(keys: K[]) =>
    keys.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map<K, number>());

  const cats = new Map<string, { slug: string; name: string; count: number }>();
  for (const p of products) {
    const c = cats.get(p.category.slug) ?? { slug: p.category.slug, name: p.category.name, count: 0 };
    c.count++;
    cats.set(c.slug, c);
  }

  const attrMap = new Map<string, { key: string; label: string; counts: Map<string, number> }>();
  for (const p of products)
    for (const a of p.attributes) {
      const entry = attrMap.get(a.key) ?? { key: a.key, label: a.label, counts: new Map() };
      entry.counts.set(a.value, (entry.counts.get(a.value) ?? 0) + 1);
      attrMap.set(a.key, entry);
    }

  const prices = products.map((p) => p.priceBs);
  const available = products.filter((p) => p.isAvailable).length;

  return {
    categories: [...cats.values()].sort((a, b) => a.name.localeCompare(b.name, "es")),
    brands: [...count(products.map((p) => p.brand))]
      .map(([value, n]) => ({ value, count: n }))
      .sort((a, b) => a.value.localeCompare(b.value, "es")),
    conditions: (["new", "used"] as const).map((value) => ({
      value,
      label: CONDITION_LABEL[value],
      count: products.filter((p) => p.condition === value).length,
    })),
    availability: { available, unavailable: products.length - available },
    price: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 },
    attributes: [...attrMap.values()].map(({ key, label, counts }) => ({
      key,
      label,
      values: [...counts]
        .map(([value, n]) => ({ value, count: n }))
        .sort((a, b) => a.value.localeCompare(b.value, "es", { numeric: true })),
    })),
  };
}

export function toSummary(p: ProductDetail): ProductSummary {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    category: p.category,
    priceBs: p.priceBs,
    isAvailable: p.isAvailable,
    condition: p.condition,
    isFeatured: p.isFeatured,
    thumbnail: p.thumbnail,
    createdAt: p.createdAt,
  };
}
