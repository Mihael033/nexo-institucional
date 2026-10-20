#!/usr/bin/env node
// Prueba de humo E2E del export estático tal como queda en GitHub Pages.
// Sirve demo/web/out con demo/web/scripts/serve-static.mjs (que imita Pages) bajo el basePath y
// recorre el sitio en Edge/Chrome sin interfaz por Chrome DevTools Protocol: estado HTTP, errores de
// consola y de red, enlaces que escapan del basePath, catálogo, ficha, noticia, contacto, login del
// panel y 404. Sin dependencias (Node ≥ 22: WebSocket y fetch).
//   cd demo/web && npm run build:static && cd ../..
//   node tools/smoke-pages.mjs [--prefix /nexo-institucional/] [--port 4180] [--browser <ruta>]
import { spawn } from 'node:child_process';
import { mkdtemp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback; };
const PREFIX = `/${arg('--prefix', '/nexo-institucional/').replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/');
const PORT = arg('--port', '4180');
const ORIGIN = `http://localhost:${PORT}`;
const BASE = `${ORIGIN}${PREFIX}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
      } else if (msg.method) for (const fn of this.listeners.get(msg.method) || []) fn(msg.params);
    });
  }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject })); }
  on(method, fn) { this.listeners.set(method, [...(this.listeners.get(method) || []), fn]); }
}

async function launch() {
  const candidates = [arg('--browser', process.env.BROWSER), 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
  let exe;
  for (const c of candidates) if (await access(c).then(() => true, () => false)) { exe = c; break; }
  if (!exe) throw new Error('No encuentro Edge ni Chrome (usa --browser).');
  const profile = await mkdtemp(path.join(tmpdir(), 'nexo-smoke-'));
  const flags = ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1366,900'];
  if (process.env.CI) flags.push('--no-sandbox', '--disable-dev-shm-usage');
  const proc = spawn(exe, [...flags, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => reject(new Error('El navegador no abrió el puerto de depuración')), 20000);
    proc.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m) { clearTimeout(t); resolve(m[1]); } });
  });
  const targets = await (await fetch(`http://127.0.0.1:${new URL(wsUrl).port}/json/list`)).json();
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  return { cdp: new Cdp(ws), exe, close: async () => { ws.close(); proc.kill(); await sleep(300); await rm(profile, { recursive: true, force: true }).catch(() => {}); } };
}

const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? '✔' : '✖'} ${name}${detail ? ` — ${detail}` : ''}`); };

async function run() {
  const server = spawn(process.execPath, [path.join(ROOT, 'demo/web/scripts/serve-static.mjs')], {
    stdio: 'ignore',
    env: { ...process.env, PORT, NEXT_PUBLIC_BASE_PATH: PREFIX === '/' ? '/' : PREFIX.slice(0, -1) },
  });
  let up = false;
  for (let i = 0; i < 50 && !(up = await fetch(BASE).then((r) => r.ok, () => false)); i++) await sleep(100);
  if (!up) { server.kill(); throw new Error(`El servidor no responde en ${BASE} (¿falta demo/web/out? ejecuta npm run build:static).`); }
  const { cdp, close, exe } = await launch();
  console.log(`Navegador: ${exe}\nSitio: ${BASE}\n`);

  let problems = [];
  let docStatus = 0;
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable'); await cdp.send('Log.enable');
  cdp.on('Runtime.exceptionThrown', (p) => problems.push(`excepción: ${p.exceptionDetails.exception?.description?.split('\n')[0] || p.exceptionDetails.text}`));
  cdp.on('Runtime.consoleAPICalled', (p) => { if (p.type === 'error') problems.push(`console.error: ${p.args.map((a) => a.value ?? a.description).join(' ').slice(0, 160)}`); });
  cdp.on('Network.responseReceived', (p) => {
    if (p.type === 'Document') docStatus = p.response.status;
    else if (p.response.url.startsWith(ORIGIN) && p.response.status >= 400) problems.push(`${p.response.status} ${p.response.url}`);
  });
  cdp.on('Network.loadingFailed', (p) => { if (!p.canceled && p.type !== 'Document') problems.push(`falló la carga (${p.errorText}) ${p.type}`); });
  const external = new Set(); // dominios de terceros que el sitio pide (informativo)
  cdp.on('Network.requestWillBeSent', (p) => { if (/^https?:/.test(p.request.url) && !p.request.url.startsWith(ORIGIN)) external.add(new URL(p.request.url).host); });

  const evaluate = async (expression) => {
    const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const waitFor = async (expression, timeout = 8000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) { if (await evaluate(`!!(${expression})`).catch(() => false)) return true; await sleep(150); }
    return false;
  };
  const goto = async (url) => {
    problems = []; docStatus = 0;
    await cdp.send('Page.navigate', { url });
    await waitFor('document.readyState === "complete"', 15000);
    await sleep(1200); // hidratación y datos mock
  };
  /** Enlaces internos que escapan del basePath (p. ej. "/catalogo" en vez de "/nexo-institucional/catalogo"). */
  const escaping = () => evaluate(`[...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => h.startsWith('/') && !h.startsWith('//') && !h.startsWith(${JSON.stringify(PREFIX)}) && h !== ${JSON.stringify(PREFIX.slice(0, -1))})`);

  async function page(label, rel, { status = 200, extra } = {}) {
    await goto(`${BASE}${rel}`);
    const h1 = await evaluate("document.querySelector('h1')?.textContent.trim().slice(0, 60) || ''");
    const esc = await escaping();
    const ok = docStatus === status && esc.length === 0 && problems.length === 0 && (status !== 200 || !!h1);
    check(`${label} (${rel || '/'})`, ok, [`HTTP ${docStatus}`, h1 && `h1 «${h1}»`, esc.length && `enlaces fuera del basePath: ${esc.slice(0, 3).join(', ')}`, problems.length && problems.slice(0, 3).join(' | ')].filter(Boolean).join(' · '));
    if (extra) await extra();
  }

  try {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
    await page('Inicio', '');
    await page('Nosotros', 'nosotros/');
    await page('Servicios', 'servicios/');
    await page('Catálogo', 'catalogo/', {
      extra: async () => {
        check('Catálogo con productos (datos mock)', await waitFor(`document.querySelectorAll('a[href*="/catalogo/"][href$="/"]').length > 3`));
        const product = await evaluate(`[...document.querySelectorAll('a[href*="/catalogo/"]')].map(a => a.getAttribute('href')).find(h => /\\/catalogo\\/[^/?#]+\\/$/.test(h))`);
        if (product) await page('Ficha de producto', product.slice(PREFIX.length));
        else check('Ficha de producto', false, 'no encontré enlaces a fichas');
      },
    });
    await page('Noticias', 'noticias/', {
      extra: async () => {
        const news = await evaluate(`[...document.querySelectorAll('a[href*="/noticias/"]')].map(a => a.getAttribute('href')).find(h => /\\/noticias\\/[^/?#]+\\/$/.test(h))`);
        if (news) await page('Noticia', news.slice(PREFIX.length));
        else check('Noticia', false, 'no encontré enlaces a noticias');
      },
    });
    await page('Contacto', 'contacto/', { extra: async () => check('Formulario de contacto presente', await evaluate("!!document.querySelector('form textarea, form [name=message], form [name=mensaje]')")) });
    await page('Panel: inicio de sesión', 'admin/login/', {
      extra: async () => {
        await evaluate(`(() => {
          const set = (el, v) => { const p = Object.getPrototypeOf(el); Object.getOwnPropertyDescriptor(p, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
          set(document.querySelector('input[name=email], input[type=email]'), 'admin@nexo.com.bo');
          set(document.querySelector('input[name=password], input[type=password]'), 'Demo#2026');
          // requestSubmit: el primer botón del formulario puede ser «mostrar contraseña» (type=button).
          const form = document.querySelector('input[name=password]').form;
          form.requestSubmit();
        })()`);
        const ok = await waitFor(`location.pathname.startsWith(${JSON.stringify(`${PREFIX}admin`)}) && !location.pathname.includes('/login') && !!document.querySelector('h1')`, 10000);
        const why = ok ? '' : await evaluate(`[location.pathname, [...document.querySelectorAll('[role=alert], [aria-invalid=true]')].map(e => e.textContent.trim() || e.name).join(' | '), 'inputs: ' + [...document.querySelectorAll('form input')].map(i => i.type + ':' + (i.name || i.id)).join(','), 'botones: ' + [...document.querySelectorAll('form button')].map(b => (b.type || '') + ':' + b.textContent.trim().slice(0, 20)).join(',')].join(' · ')`);
        check('Panel: login de demo entra al dashboard', ok, ok ? await evaluate('location.pathname') : why);
        if (ok) {
          for (const [label, rel] of [['Panel: productos', 'admin/productos/'], ['Panel: auditoría', 'admin/auditoria/']]) {
            const link = await evaluate(`!!document.querySelector('a[href="${PREFIX}${rel}"]')`);
            check(`${label}: enlace en el menú con basePath`, link);
          }
        }
      },
    });
    await page('Página inexistente → 404', 'esto-no-existe/', { status: 404 });
  } finally {
    await close();
    server.kill();
  }
  console.log(`
Peticiones a terceros: ${external.size ? [...external].sort().join(', ') : 'ninguna'}`);
  const failed = results.filter((r) => !r).length;
  console.log(`\n${failed ? `✖ ${failed} de ${results.length} comprobaciones fallaron` : `✔ ${results.length} comprobaciones correctas`}`);
  process.exitCode = failed ? 1 : 0;
}

run().catch((err) => { console.error(`✖ ${err.stack || err.message}`); process.exitCode = 1; });
