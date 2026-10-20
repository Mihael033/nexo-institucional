/**
 * Prefijo de ruta del sitio (GitHub Pages sirve la demo bajo /nexo-institucional).
 * `next/link`, `useRouter()` y `redirect()` ya lo aplican solos: usar `withBasePath` solo en
 * URLs "crudas" (img src de /public, CSS url(), fetch de JSON estático, window.location, descargas).
 */
export const BASE_PATH = normalize(process.env.NEXT_PUBLIC_BASE_PATH);

function normalize(value: string | undefined): string {
  const v = (value ?? "").trim().replace(/\/+$/, "");
  if (!v || v === "/") return "";
  return v.startsWith("/") ? v : `/${v}`;
}

/** `/logo.svg` → `/nexo-institucional/logo.svg`. URLs absolutas y `data:`/`blob:` pasan intactas. */
export function withBasePath(path: string): string {
  if (!BASE_PATH || !path.startsWith("/") || path.startsWith("//")) return path;
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${path}`;
}
