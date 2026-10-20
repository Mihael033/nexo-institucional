// Sirve out/ como lo haría GitHub Pages, para probar el export en local:
//   npm run build:static && npm run serve:static   →   http://localhost:4300/nexo-institucional/
// Imita Pages: carpeta → index.html, /ruta → 301 a /ruta/, 404.html propio, gzip y caché de 10 min.

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGzip } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../out");
const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "/nexo-institucional").replace(/\/+$/, "");
const port = Number(process.env.PORT ?? 4300);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".csv": "text/csv; charset=utf-8",
};
const COMPRESS = /^(text\/|application\/(json|xml)|image\/svg)/;

if (!existsSync(path.join(root, "index.html"))) {
  console.error("No existe out/index.html: ejecute antes npm run build:static.");
  process.exit(1);
}

const notFound = path.join(root, "404.html");

function plain(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

// Las cabeceras salen recién cuando el archivo abrió: si falla (out/ borrado durante un rebuild,
// archivo que desapareció) se responde 404 sin tumbar el proceso; sin 404.html, en texto plano.
function send(req, res, file, status = 200) {
  const type = TYPES[path.extname(file)] ?? "application/octet-stream";
  const stream = createReadStream(file);
  res.on("close", () => stream.destroy());
  stream.on("error", () => {
    if (res.headersSent) return res.destroy();
    if (file !== notFound) return send(req, res, notFound, 404);
    plain(res, 404, "404: out/ no disponible (¿rebuild en curso?)");
  });
  stream.on("open", () => {
    const headers = { "Content-Type": type, "Cache-Control": "max-age=600" };
    const gzip = COMPRESS.test(type) && /\bgzip\b/.test(req.headers["accept-encoding"] ?? "");
    if (gzip) headers["Content-Encoding"] = "gzip";
    res.writeHead(status, headers);
    (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
  });
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return plain(res, 400, "400: URL mal codificada");
  }
  if (base && (pathname === "/" || pathname === "")) {
    res.writeHead(302, { Location: `${base}/` });
    return res.end();
  }
  if (base) {
    if (pathname !== base && !pathname.startsWith(`${base}/`)) return send(req, res, notFound, 404);
    pathname = pathname.slice(base.length) || "/";
  }
  const file = path.join(root, pathname);
  if (!file.startsWith(root)) return send(req, res, notFound, 404);

  // throwIfNoEntry: el archivo puede desaparecer entre una comprobación y otra durante un rebuild.
  const stat = statSync(file, { throwIfNoEntry: false });
  if (stat?.isDirectory()) {
    if (!pathname.endsWith("/")) {
      res.writeHead(301, { Location: `${base}${pathname}/${url.search}` });
      return res.end();
    }
    const index = path.join(file, "index.html");
    if (existsSync(index)) return send(req, res, index);
  } else if (stat) {
    return send(req, res, file);
  } else if (existsSync(`${file}.html`)) {
    return send(req, res, `${file}.html`);
  }
  send(req, res, notFound, 404);
})
  .on("error", (err) => {
    console.error(err.code === "EADDRINUSE" ? `El puerto ${port} ya está en uso (use PORT=otro).` : err);
    process.exit(1);
  })
  .listen(port, () => console.log(`out/ en http://localhost:${port}${base}/`));
