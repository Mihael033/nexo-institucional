/** Constantes del sitio que no vienen de la API. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/**
 * Imagen Open Graph por defecto (app/opengraph-image.png). Un `openGraph` definido en una página
 * reemplaza al del layout entero, imágenes incluidas: por eso cada página la declara explícitamente.
 */
export const OG_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "Nexo Institucional · Conectamos instituciones con soluciones",
};

/** Imágenes propias de la página o, si no tiene ninguna real, la imagen por defecto. */
export function ogImages<T extends { url: string }>(own: T[] = []): (T | typeof OG_IMAGE)[] {
  return own.length ? own : [OG_IMAGE];
}
