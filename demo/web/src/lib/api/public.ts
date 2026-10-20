import "server-only";
import { cacheLife, cacheTag, io } from "next/cache";
import { toApiQuery } from "@/lib/catalog/url";
import { API_MODE, apiBaseUrl, isApiError, request } from "./http";
import {
  mockGetCategories,
  mockGetNews,
  mockGetNewsBySlug,
  mockGetPage,
  mockGetProductBySlug,
  mockGetProductFacets,
  mockGetProducts,
  mockGetProductSlugs,
  mockGetSite,
  type NewsOpts,
} from "./mock/public-data";
import type {
  Category,
  NewsDetail,
  NewsSummary,
  Page,
  Paged,
  ProductDetail,
  ProductFacets,
  ProductQuery,
  ProductSummary,
  SiteInfo,
} from "./types";

/**
 * Cliente de lectura del sitio público (Server Components).
 * `NEXT_PUBLIC_API_MODE=mock` usa los datos locales; `http` llama a la API real.
 * En el export estático (STATIC_EXPORT=1) este módulo se sustituye por `public-static.ts`
 * (mismas funciones, sin Cache Components): ver `next.config.ts`.
 *
 * Las lecturas pasan por `use cache` (minutos): las páginas se prerenderizan y se revalidan solas.
 * Build resiliente: si durante `next build` la API no responde, `availableAtBuild()` llama a `io()`
 * y esa parte de la página se renderiza en la primera petición (las páginas envuelven los datos en
 * <Suspense>), en lugar de romper el build. Con la API arriba, todo se prerenderiza normalmente.
 */

const mock = API_MODE === "mock";
const BUILD = process.env.NEXT_PHASE === "phase-production-build";

let warned = false;

/**
 * ¿La API responde? `pingApi` está en "use cache", así que se consulta una vez por build.
 * (No memorizar la promesa a nivel de módulo: cada prerender necesita la suya.)
 */
async function apiUp(): Promise<boolean> {
  const ok = await pingApi();
  if (!ok && !warned) {
    warned = true;
    console.warn(`[nexo] API no disponible durante el build (${apiBaseUrl()}): las páginas públicas se renderizarán a pedido.`);
  }
  return ok;
}

/** Dentro de "use cache": en el prerender, un fetch sin caché quedaría suspendido como dato dinámico. */
async function pingApi(): Promise<boolean> {
  "use cache";
  cacheLife("minutes"); // "seconds" se trataría como dinámico en el prerender
  try {
    const res = await fetch(apiBaseUrl().replace(/\/api\/v\d+$/, "") + "/health", { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}

/** En build con la API caída, suspende el prerender de este subárbol (se completa por petición). */
async function availableAtBuild() {
  if (!mock && BUILD && !(await apiUp())) await io();
}

/** 404 del contrato → null (para usar `notFound()` en la página). */
async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (isApiError(e) && e.status === 404) return null;
    throw e;
  }
}

/* ----------------------------------------------------------- Sitio y CMS */

export async function getSite(): Promise<SiteInfo> {
  await availableAtBuild();
  return cachedSite();
}
async function cachedSite(): Promise<SiteInfo> {
  "use cache";
  cacheLife("minutes");
  cacheTag("site");
  return mock ? mockGetSite() : request<SiteInfo>("/site");
}

export async function getPage(slug: string): Promise<Page | null> {
  await availableAtBuild();
  return cachedPage(slug);
}
async function cachedPage(slug: string): Promise<Page | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("pages", `page:${slug}`);
  if (mock) return mockGetPage(slug);
  return orNull(request<Page>(`/pages/${encodeURIComponent(slug)}`));
}

/* -------------------------------------------------------------- Noticias */

export async function getNews(opts: NewsOpts = {}): Promise<Paged<NewsSummary>> {
  await availableAtBuild();
  return cachedNews(opts);
}
async function cachedNews(opts: NewsOpts): Promise<Paged<NewsSummary>> {
  "use cache";
  cacheLife("minutes");
  cacheTag("news");
  return mock ? mockGetNews(opts) : request<Paged<NewsSummary>>("/news", { query: opts });
}

export async function getNewsBySlug(slug: string): Promise<NewsDetail | null> {
  await availableAtBuild();
  return cachedNewsBySlug(slug);
}
async function cachedNewsBySlug(slug: string): Promise<NewsDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("news", `news:${slug}`);
  if (mock) return mockGetNewsBySlug(slug);
  return orNull(request<NewsDetail>(`/news/${encodeURIComponent(slug)}`));
}

/** Slugs para generateStaticParams. Con la API caída en build devuelve [] (se resuelven a pedido). */
export async function getNewsSlugsForBuild(): Promise<string[]> {
  if (!mock && BUILD && !(await apiUp())) return [];
  return (await cachedNews({ pageSize: 100 })).items.map((n) => n.slug);
}

/* ------------------------------------------------------ Catálogo/productos */

export async function getCategories(): Promise<Category[]> {
  await availableAtBuild();
  return cachedCategories();
}
async function cachedCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("categories");
  return mock ? mockGetCategories() : request<Category[]>("/categories");
}

export async function getProducts(query: ProductQuery = {}): Promise<Paged<ProductSummary>> {
  await availableAtBuild();
  return cachedProducts(query);
}
async function cachedProducts(query: ProductQuery): Promise<Paged<ProductSummary>> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  return mock ? mockGetProducts(query) : request<Paged<ProductSummary>>("/products", { query: toApiQuery(query) });
}

export async function getProductFacets(): Promise<ProductFacets> {
  await availableAtBuild();
  return cachedFacets();
}
async function cachedFacets(): Promise<ProductFacets> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  return mock ? mockGetProductFacets() : request<ProductFacets>("/products/facets");
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  await availableAtBuild();
  return cachedProductBySlug(slug);
}
async function cachedProductBySlug(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products", `product:${slug}`);
  return mock ? mockGetProductBySlug(slug) : orNull(request<ProductDetail>(`/products/${encodeURIComponent(slug)}`));
}

/** Slugs de productos (sitemap). */
export async function getAllProductSlugs(): Promise<string[]> {
  await availableAtBuild();
  return cachedProductSlugs();
}
async function cachedProductSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  if (mock) return mockGetProductSlugs();
  const first = await request<Paged<ProductSummary>>("/products", { query: { pageSize: 100 } });
  return first.items.map((p) => p.slug);
}

/** Slugs para generateStaticParams. Con la API caída en build devuelve [] (se resuelven a pedido). */
export async function getProductSlugsForBuild(): Promise<string[]> {
  if (!mock && BUILD && !(await apiUp())) return [];
  return cachedProductSlugs();
}
