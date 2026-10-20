import type { MetadataRoute } from "next";
import { getAllProductSlugs, getNews } from "@/lib/api/public";
import { SITE_URL } from "@/lib/site";

/**
 * Export estático (GitHub Pages) exige marcar la ruta como estática, y Cache Components prohíbe
 * `dynamic`/`revalidate`. Next también acepta un `generateStaticParams` (ruta sin parámetros: uno vacío).
 */
export function generateStaticParams() {
  return [{}];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, news] = await Promise.all([getAllProductSlugs(), getNews({ pageSize: 100 })]);
  const pages = ["", "/nosotros", "/servicios", "/catalogo", "/noticias", "/contacto"].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));
  return [
    ...pages,
    ...slugs.map((slug) => ({
      url: `${SITE_URL}/catalogo/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...news.items.map((n) => ({
      url: `${SITE_URL}/noticias/${n.slug}`,
      lastModified: n.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
