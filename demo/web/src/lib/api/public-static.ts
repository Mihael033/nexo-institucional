import "server-only";
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
 * Sustituto de `public.ts` en el export estático (STATIC_EXPORT=1, GitHub Pages): mismas
 * funciones, siempre con los datos de ejemplo y sin Cache Components (PPR no existe en un
 * export). `next.config.ts` redirige `@/lib/api/public` a este archivo solo en ese modo.
 */

export const getSite = async (): Promise<SiteInfo> => mockGetSite();
export const getPage = async (slug: string): Promise<Page | null> => mockGetPage(slug);

export const getNews = async (opts: NewsOpts = {}): Promise<Paged<NewsSummary>> => mockGetNews(opts);
export const getNewsBySlug = async (slug: string): Promise<NewsDetail | null> => mockGetNewsBySlug(slug);
export const getNewsSlugsForBuild = async (): Promise<string[]> =>
  mockGetNews({ pageSize: 100 }).items.map((n) => n.slug);

export const getCategories = async (): Promise<Category[]> => mockGetCategories();
export const getProducts = async (query: ProductQuery = {}): Promise<Paged<ProductSummary>> => mockGetProducts(query);
export const getProductFacets = async (): Promise<ProductFacets> => mockGetProductFacets();
export const getProductBySlug = async (slug: string): Promise<ProductDetail | null> => mockGetProductBySlug(slug);
export const getAllProductSlugs = async (): Promise<string[]> => mockGetProductSlugs();
export const getProductSlugsForBuild = async (): Promise<string[]> => mockGetProductSlugs();
