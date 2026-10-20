# Nexo Institucional · Web (Next.js 16)

Sitio público y panel de administración de la demo. Next.js 16 (App Router, Cache Components), React 19, TypeScript estricto, Tailwind CSS 4, Framer Motion, Lenis y Radix UI.

## Ejecutar

Requisito: Node.js 22.12 o superior (22, 24 o 26; Vitest 5 y Vite 8 no admiten Node 20).

```sh
npm ci
cp .env.example .env.local    # en Windows: copy .env.example .env.local
npm run dev                   # http://localhost:3000 · panel en /admin/login
```

### Dos modos de datos

La capa `src/lib/api` tiene dos implementaciones con el **mismo contrato**:

| `NEXT_PUBLIC_API_MODE` | Qué hace |
|---|---|
| `mock` | Datos de ejemplo en el navegador (`src/lib/api/mock`). No necesita servidor. Es el modo de la demo publicada: los cambios del panel se guardan en `localStorage` (con un espacio de nombres por `basePath`) y «Restablecer demo» los borra. |
| `http` | Llama a la API .NET (`NEXT_PUBLIC_API_URL`, por defecto `http://localhost:5080/api/v1`). Arranca antes la API: ver [`../api/README.md`](../api/README.md). |

En modo `http`, `npm run build` prerenderiza las páginas consultando la API, así que esta tiene que estar en marcha. No hay vuelta automática a los mocks si la API falla.

Usuarios del panel (en los dos modos): `admin@nexo.com.bo` / `Demo#2026` (administradora) y `editor@nexo.com.bo` / `Demo#2026` (editor, sin usuarios ni auditoría).

## Scripts

| Orden | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en el puerto 3000. |
| `npm run build` / `npm start` | Compilación y servidor de producción (modo según `NEXT_PUBLIC_API_MODE`). |
| `npm run build:static` | **Export estático** en `out/` para hosting sin servidor (GitHub Pages): fuerza el modo `mock`. Alias: `build:pages`. |
| `npm run serve:static` | Sirve `out/` como GitHub Pages en `http://localhost:4300/nexo-institucional/`. |
| `npm run lint` · `npm run typecheck` · `npm test` | ESLint, TypeScript (`next typegen` + `tsc --noEmit`) y pruebas con Vitest. |

### Export estático y subcarpeta

`npm run build:static` lee `NEXT_PUBLIC_BASE_PATH` (por defecto `/nexo-institucional`; `/` para la raíz del dominio) y `NEXT_PUBLIC_SITE_URL` (URLs absolutas de metadatos, sitemap, robots y Open Graph). `next/link`, `useRouter()` y `redirect()` aplican el prefijo solos. Para URLs «crudas» (imágenes de `public/`, `url()` de CSS, `fetch` de archivos estáticos, descargas) se usa `withBasePath()` de `src/lib/base-path.ts`.

Para probar el resultado en local bajo la subcarpeta: `npm run serve:static` (imita GitHub Pages: carpeta → `index.html`, `/ruta` → `/ruta/`, `404.html` con estado 404) y, desde la raíz del repositorio, `node tools/smoke-pages.mjs` para recorrerlo en un navegador sin interfaz.

## Estructura

```
src/
  app/(public)/        inicio, nosotros, servicios, catálogo, ficha de producto, noticias, contacto
  app/(admin)/admin/   panel: dashboard, productos, importación CSV, mensajes, usuarios, auditoría
  components/          ui (design system), blocks (CMS), catalog, home, layout, motion, admin, seo
  lib/api/             cliente HTTP tipado + mocks con el mismo contrato
  lib/auth/            sesión del panel (token en memoria, refresh por cookie HttpOnly en modo http)
  data/productos.json  catálogo de ejemplo (30 productos)
```

Design system: tokens de marca y semánticos en `src/app/globals.css` (cambian con `data-theme="light|dark"`) y componentes en `src/components/ui`. Formato es-BO (`Bs 1.250,00`, fechas en America/La_Paz) en `src/lib/format.ts`.
