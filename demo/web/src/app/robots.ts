import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Export estático (GitHub Pages) exige marcar la ruta como estática, y Cache Components prohíbe
 * `dynamic`/`revalidate`. Next también acepta un `generateStaticParams` (ruta sin parámetros: uno vacío).
 */
export function generateStaticParams() {
  return [{}];
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
