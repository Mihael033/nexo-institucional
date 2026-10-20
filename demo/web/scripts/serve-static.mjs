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

function send(req, res, file, status = 200) {
  const type = TYPES[path.extname(file)] ?? "application/octet-stream";
  const headers = { "Content-Type": type, "Cache-Control": "max-age=600" };
  const gzip = COMPRESS.test(type) && /\bgzip\b/.test(req.headers["accept-encoding"] ?? "");
  if (gzip) headers["Content-Encoding"] = "gzip";
  res.writeHead(status, headers);
  const stream = createReadStream(file);
  (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let pathname = decodeURIComponent(url.pathname);
  if (base && (pathname === "/" || pathname === "")) {
    res.writeHead(302, { Location: `${base}/` });
    return res.end();
  }
  if (base) {
    if (pathname !== base && !pathname.startsWith(`${base}/`)) return send(req, res, path.join(root, "404.html"), 404);
    pathname = pathname.slice(base.length) || "/";
  }
  const file = path.join(root, pathname);
  if (!file.startsWith(root)) return send(req, res, path.join(root, "404.html"), 404);

  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!pathname.endsWith("/")) {
      res.writeHead(301, { Location: `${base}${pathname}/${url.search}` });
      return res.end();
    }
    const index = path.join(file, "index.html");
    if (existsSync(index)) return send(req, res, index);
  } else if (existsSync(file)) {
    return send(req, res, file);
  } else if (existsSync(`${file}.html`)) {
    return send(req, res, `${file}.html`);
  }
  send(req, res, path.join(root, "404.html"), 404);
}).listen(port, () => console.log(`out/ en http://localhost:${port}${base}/`));
