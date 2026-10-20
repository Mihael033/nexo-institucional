// Export estático para GitHub Pages: `npm run build:static` (alias `build:pages`).
// Sin dependencias de shell: corre igual en Windows y en el Ubuntu del CI.
//
// Variables (todas con valor por defecto):
//   NEXT_PUBLIC_BASE_PATH  /nexo-institucional   (vacío o "/" = raíz del dominio)
//   NEXT_PUBLIC_SITE_URL   https://mihael033.github.io<BASE_PATH>
// Fija siempre STATIC_EXPORT=1 y NEXT_PUBLIC_API_MODE=mock (en Pages no hay servidor).

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/nexo-institucional";
const cleanBase = basePath.trim().replace(/\/+$/, "");
const env = {
  ...process.env,
  STATIC_EXPORT: "1",
  NEXT_PUBLIC_API_MODE: "mock",
  NEXT_PUBLIC_BASE_PATH: cleanBase === "/" ? "" : cleanBase,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? `https://mihael033.github.io${cleanBase === "/" ? "" : cleanBase}`,
  NEXT_TELEMETRY_DISABLED: "1",
};

// Caché de rutas de un build anterior (modo servidor) y export viejo.
rmSync(path.join(root, ".next/server/route-cache"), { recursive: true, force: true });
rmSync(path.join(root, "out"), { recursive: true, force: true });

console.log(`[build:static] basePath="${env.NEXT_PUBLIC_BASE_PATH || "/"}" siteUrl=${env.NEXT_PUBLIC_SITE_URL}`);
const nextBin = require.resolve("next/dist/bin/next");
const result = spawnSync(process.execPath, [nextBin, "build"], { cwd: root, env, stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);

const out = path.join(root, "out");
if (!existsSync(path.join(out, "index.html"))) {
  console.error("[build:static] out/index.html no existe: el export falló.");
  process.exit(1);
}
// Prefetch por segmentos: el export escribe `__next.<seg>/a/b/__PAGE__.txt` (carpetas), pero el
// cliente pide `__next.<seg>.a.b.__PAGE__.txt` (nombre plano). En `next start` el servidor lo
// traduce; en un host estático daría 404 en cada prefetch. Se copia cada uno con el nombre plano.
let flattened = 0;
function flattenSegments(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (!entry.name.startsWith("__next.")) {
      flattenSegments(full);
      continue;
    }
    for (const rel of readdirSync(full, { recursive: true })) {
      const src = path.join(full, rel);
      if (!statSync(src).isFile()) continue;
      const flat = [entry.name, ...rel.split(/[\\/]/)].join(".");
      copyFileSync(src, path.join(dir, flat));
      flattened++;
    }
  }
}
flattenSegments(out);

// Pintar antes de hidratar (páginas públicas). Los <script async> del HTML se ejecutan apenas
// llegan y, en un móvil lento, la descarga y la evaluación de React/Next compiten con el CSS, las
// fuentes y la primera pintura. Un cargador inline los inserta tras el FCP, con el mismo src (así
// Turbopack y React 19 los reconocen y no duplican nada). No se agrega preload a propósito (solo
// queda el que Next emite para el chunk de arranque, ~5 KB): el resto del JS no comparte el ancho
// de banda con lo que pinta; a cambio la hidratación empieza un poco después
// (el contenido y los enlaces son HTML estático y funcionan antes). Respaldos: pestaña oculta
// (sin pintura) = enseguida; sin Paint Timing = un frame; tope de 3 s. El panel (/admin) queda igual.
const ASYNC_SCRIPT = /<script src="([^"]+)" async=""><\/script>/g;
const hydrationLoader = (srcs) =>
  `(function(){var s=${JSON.stringify(srcs)},d=0;function go(){if(d)return;d=1;for(var i=0;i<s.length;i++){var e=document.createElement("script");e.src=s[i];e.async=true;document.head.appendChild(e)}}` +
  `if(document.visibilityState!=="visible")return go();setTimeout(go,3000);var P=window.PerformanceObserver;` +
  `if(P&&P.supportedEntryTypes&&P.supportedEntryTypes.indexOf("paint")>-1){new P(function(l,o){if(l.getEntriesByName("first-contentful-paint").length){o.disconnect();setTimeout(go,0)}}).observe({type:"paint",buffered:true})}` +
  `else requestAnimationFrame(function(){setTimeout(go,0)})})();`;
let deferred = 0;
function deferHydration(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir === out && entry.name === "admin") continue;
      deferHydration(full);
      continue;
    }
    if (!entry.name.endsWith(".html")) continue;
    let html = readFileSync(full, "utf8");
    const srcs = [];
    html = html.replace(ASYNC_SCRIPT, (_, src) => (srcs.push(src), ""));
    if (srcs.length === 0) continue;
    if (!html.includes("</body>")) throw new Error(`[build:static] HTML inesperado: ${full}`);
    html = html.replace("</body>", `<script>${hydrationLoader(srcs)}</script></body>`);
    writeFileSync(full, html);
    deferred++;
  }
}
deferHydration(out);

// GitHub Pages: sin Jekyll (si no, ignora la carpeta _next).
writeFileSync(path.join(out, ".nojekyll"), "");
console.log(
  `[build:static] listo: out/ (${flattened} segmentos de prefetch con nombre plano, hidratación tras la primera pintura en ${deferred} páginas, .nojekyll)`,
);
