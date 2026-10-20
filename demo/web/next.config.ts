import type { NextConfig } from "next";

/**
 * Dos modos:
 * - Normal (`npm run build`): servidor Next + API .NET (o mocks), con caché por componente.
 * - Export estático (`npm run build:static`, STATIC_EXPORT=1): HTML/JS/CSS en `out/` para
 *   GitHub Pages, en modo mock y bajo NEXT_PUBLIC_BASE_PATH (p. ej. /nexo-institucional).
 */
const STATIC_EXPORT = process.env.STATIC_EXPORT === "1";
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // PPR (Cache Components) no existe en un export estático: ahí se desactiva y las lecturas
  // usan `public-static.ts` (mismas funciones, sin "use cache").
  cacheComponents: !STATIC_EXPORT,
  partialPrefetching: !STATIC_EXPORT,
  env: { NEXT_PUBLIC_STATIC_EXPORT: STATIC_EXPORT ? "1" : "" },
  ...(STATIC_EXPORT && {
    output: "export",
    trailingSlash: true,
    ...(BASE_PATH && BASE_PATH !== "/" && { basePath: BASE_PATH, assetPrefix: BASE_PATH }),
  }),
  images: {
    // Sin servidor no hay optimizador: en el export las imágenes reales se sirven tal cual
    // (en modo mock casi todo son visuales generados por CSS).
    unoptimized: STATIC_EXPORT,
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "fastly.picsum.photos", pathname: "/**" },
      { protocol: "http", hostname: "localhost", port: "5080", pathname: "/**" },
    ],
    qualities: [70, 85],
  },
  turbopack: {
    ...(STATIC_EXPORT && { resolveAlias: { "@/lib/api/public": "./src/lib/api/public-static.ts" } }),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
