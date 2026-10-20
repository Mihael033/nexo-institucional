import { computeFacets, queryProducts, toSummary } from "@/lib/catalog/query";
import type {
  Category,
  NewsDetail,
  NewsSort,
  NewsSummary,
  Page,
  Paged,
  ProductDetail,
  ProductFacets,
  ProductQuery,
  ProductSummary,
  SiteInfo,
} from "../types";
import { mockNews, mockPages, mockSite } from "./content";
import { mockCategories, mockProducts } from "./products";

/**
 * Lecturas del sitio público sobre los datos de ejemplo, como funciones puras.
 * Las usan `public.ts` (servidor, dentro de "use cache") y `public-static.ts`
 * (export estático para GitHub Pages, sin servidor ni Cache Components).
 */

export type NewsOpts = { page?: number; pageSize?: number; sort?: NewsSort };

export const mockGetSite = (): SiteInfo => mockSite;

export const mockGetPage = (slug: string): Page | null => mockPages.find((p) => p.slug === slug) ?? null;

export function mockGetNews(opts: NewsOpts = {}): Paged<NewsSummary> {
  const sorted = [...mockNews].sort((a, b) =>
    opts.sort === "oldest"
      ? Date.parse(a.publishedAt) - Date.parse(b.publishedAt)
      : Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
  const paged = paginate(sorted, opts.page, opts.pageSize);
  return {
    ...paged,
    items: paged.items.map(({ id, slug, title, excerpt, coverImage, author, tags, publishedAt }) => ({
      id,
      slug,
      title,
      excerpt,
      coverImage,
      author,
      tags,
      publishedAt,
    })),
  };
}

export const mockGetNewsBySlug = (slug: string): NewsDetail | null => mockNews.find((n) => n.slug === slug) ?? null;

export const mockGetCategories = (): Category[] => [...mockCategories];

export function mockGetProducts(query: ProductQuery = {}): Paged<ProductSummary> {
  const page = queryProducts(mockProducts, query);
  return { ...page, items: page.items.map(toSummary) };
}

export const mockGetProductFacets = (): ProductFacets => computeFacets(mockProducts);

export function mockGetProductBySlug(slug: string): ProductDetail | null {
  const product = mockProducts.find((p) => p.slug === slug);
  if (!product) return null;
  const related = mockProducts
    .filter((p) => p.id !== product.id && p.category.slug === product.category.slug)
    .sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable))
    .slice(0, 4)
    .map(toSummary);
  return { ...product, related };
}

export const mockGetProductSlugs = (): string[] => mockProducts.map((p) => p.slug);

function paginate<T>(items: T[], page = 1, pageSize = 12): Paged<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / pageSize),
  };
}
