#!/usr/bin/env node
// Prueba de humo E2E del export estático tal como queda en GitHub Pages.
// Sirve demo/web/out con demo/web/scripts/serve-static.mjs (que imita Pages) bajo el basePath y
// recorre el sitio en Edge/Chrome sin interfaz por Chrome DevTools Protocol: estado HTTP, errores de
// consola y de red, enlaces que escapan del basePath, catálogo, ficha, noticia, contacto, login del
// panel y 404. Además interactúa con las páginas públicas (búsqueda del catálogo y menú móvil), algo
// que solo funciona si hidrataron. Sin dependencias (Node ≥ 22: WebSocket y fetch).
//   cd demo/web && npm run build:static && cd ../..
//   node tools/smoke-pages.mjs [--prefix /nexo-institucional/] [--port 4180] [--browser <ruta>] [--timeout 30]
// --timeout: segundos de espera por comando enviado al navegador.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback; };
const PREFIX = `/${arg('--prefix', '/nexo-institucional/').replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/');
const PORT = arg('--port', '4180');
const CDP_TIMEOUT = Number(arg('--timeout', '30')) * 1000;
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
    // Si el navegador muere, los comandos pendientes fallan ya, sin esperar su tiempo límite.
    ws.addEventListener('close', () => {
      for (const { reject } of this.pending.values()) reject(new Error('Se cerró la conexión con el navegador.'));
      this.pending.clear();
    });
  }
  /** Con tiempo límite: un navegador bloqueado (p. ej. sandbox del sistema) no deja la prueba colgada. */
  send(method, params = {}, timeout = CDP_TIMEOUT) {
    if (this.ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error(`Sin conexión con el navegador (${method}).`));
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`El navegador no respondió a ${method} en ${timeout / 1000} s (en entornos aislados prueba con CI=1, que añade --no-sandbox).`));
      }, timeout);
      this.pending.set(id, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); } });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, fn) { this.listeners.set(method, [...(this.listeners.get(method) || []), fn]); }
}

/** Espera a que el proceso termine, con tope; devuelve si terminó. */
const exited = (proc, ms) => new Promise((resolve) => {
  if (proc.exitCode !== null || proc.signalCode !== null) return resolve(true);
  const t = setTimeout(() => resolve(false), ms);
  proc.once('exit', () => { clearTimeout(t); resolve(true); });
});

/** Termina un proceso hijo: primero normal y, si sigue vivo, a la fuerza. */
async function stop(proc) {
  if (!proc || proc.exitCode !== null || proc.signalCode !== null) return;
  proc.kill();
  if (!(await exited(proc, 5000))) { proc.kill('SIGKILL'); await exited(proc, 2000); }
}

/** Abre el navegador. Si algo falla a mitad de camino, cierra lo que ya abrió antes de propagar el error. */
async function launch() {
  const chosen = arg('--browser', process.env.BROWSER);
  const candidates = chosen ? [chosen] : ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'];
  let exe;
  for (const c of candidates) if (await access(c).then(() => true, () => false)) { exe = c; break; }
  if (!exe) throw new Error(chosen ? `No encuentro el navegador ${chosen}.` : 'No encuentro Edge ni Chrome (usa --browser).');
  const profile = await mkdtemp(path.join(tmpdir(), 'nexo-smoke-'));
  let proc, ws;
  const close = async () => {
    try { ws?.close(); } catch { /* ya cerrado */ }
    await stop(proc);
    proc?.stderr?.destroy();
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
  };
  try {
    const flags = ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1366,900'];
    if (process.env.CI) flags.push('--no-sandbox', '--disable-dev-shm-usage');
    proc = spawn(exe, [...flags, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
    const wsUrl = await new Promise((resolve, reject) => {
      let buf = '';
      const t = setTimeout(() => reject(new Error('El navegador no abrió el puerto de depuración en 20 s.')), 20000);
      const fail = (err) => { clearTimeout(t); reject(err); };
      proc.on('error', (err) => fail(new Error(`No pude iniciar el navegador: ${err.message}`)));
      proc.once('exit', (code, signal) => fail(new Error(`El navegador terminó al iniciar (${signal || `código ${code}`}).`)));
      proc.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m) { clearTimeout(t); resolve(m[1]); } });
    });
    const targets = await (await fetch(`http://127.0.0.1:${new URL(wsUrl).port}/json/list`, { signal: AbortSignal.timeout(10000) })).json();
    const target = targets.find((t) => t.type === 'page');
    if (!target) throw new Error('El navegador no expuso ninguna pestaña.');
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Sin conexión con DevTools en 10 s.')), 10000);
      ws.addEventListener('open', () => { clearTimeout(t); resolve(); });
      ws.addEventListener('error', () => { clearTimeout(t); reject(new Error('No pude conectar con DevTools.')); });
    });
    return { cdp: new Cdp(ws), exe, close };
  } catch (err) {
    await close();
    throw err;
  }
}

const results = [];
const external = new Set(); // dominios de terceros que el sitio pide (informativo)
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? '✔' : '✖'} ${name}${detail ? ` — ${detail}` : ''}`); };

async function run() {
  let server, browser;
  // Todo lo que se abre (servidor, navegador, conexión) se cierra en el finally, también si falla la
  // inicialización o un comando agota su tiempo.
  try {
    server = spawn(process.execPath, [path.join(ROOT, 'demo/web/scripts/serve-static.mjs')], {
      stdio: 'ignore',
      env: { ...process.env, PORT, NEXT_PUBLIC_BASE_PATH: PREFIX === '/' ? '/' : PREFIX.slice(0, -1) },
    });
    server.on('error', () => {});
    let up = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 15000 && server.exitCode === null) {
      if ((up = await fetch(BASE, { signal: AbortSignal.timeout(3000) }).then((r) => r.ok, () => false))) break;
      await sleep(200);
    }
    if (!up) {
      const why = server.exitCode !== null ? `el servidor terminó con código ${server.exitCode}` : 'sin respuesta en 15 s';
      throw new Error(`El servidor no responde en ${BASE}: ${why} (¿falta demo/web/out? ejecuta npm run build:static; ¿puerto ${PORT} ocupado?).`);
    }
    browser = await launch();
    const { cdp, exe } = browser;
    console.log(`Navegador: ${exe}\nSitio: ${BASE}\n`);
    await runChecks(cdp);
  } finally {
    try { await browser?.close(); } finally { await stop(server); }
  }
  console.log(`
Peticiones a terceros: ${external.size ? [...external].sort().join(', ') : 'ninguna'}`);
  const failed = results.filter((r) => !r).length;
  console.log(`\n${failed ? `✖ ${failed} de ${results.length} comprobaciones fallaron` : `✔ ${results.length} comprobaciones correctas`}`);
  process.exitCode = failed ? 1 : 0;
}

async function runChecks(cdp) {
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
  /** Fichas de producto enlazadas en la página (sin repetir). */
  const productLinks = `[...new Set([...document.querySelectorAll('a[href*="/catalogo/"]')].map(a => a.getAttribute('href')).filter(h => /\\/catalogo\\/[^/?#]+\\/$/.test(h)))]`;
  /**
   * Repite una acción del usuario hasta que se vea su efecto. Antes de hidratar, React no escucha los
   * eventos (el HTML estático no reacciona), así que solo pasa si la página hidrató dentro del plazo.
   */
  const until = async (action, effect, timeout = 10000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      await evaluate(action);
      if (await waitFor(effect, 1500)) return true;
    }
    return false;
  };

  async function page(label, rel, { status = 200, extra } = {}) {
    await goto(`${BASE}${rel}`);
    const h1 = await evaluate("document.querySelector('h1')?.textContent.trim().slice(0, 60) || ''");
    const esc = await escaping();
    const ok = docStatus === status && esc.length === 0 && problems.length === 0 && (status !== 200 || !!h1);
    check(`${label} (${rel || '/'})`, ok, [`HTTP ${docStatus}`, h1 && `h1 «${h1}»`, esc.length && `enlaces fuera del basePath: ${esc.slice(0, 3).join(', ')}`, problems.length && problems.slice(0, 3).join(' | ')].filter(Boolean).join(' · '));
    if (extra) await extra();
  }

  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
  await page('Inicio', '');
  await page('Nosotros', 'nosotros/');
  await page('Servicios', 'servicios/');
  await page('Catálogo', 'catalogo/', {
    extra: async () => {
      check('Catálogo con productos (datos mock)', await waitFor(`${productLinks}.length > 3`));
      const all = await evaluate(productLinks);
      // Búsqueda: escribir como un usuario y esperar a que la URL (?q=) y la lista cambien.
      const typed = await until(
        `(() => {
          const input = document.querySelector('#catalog-search, form[role=search] input');
          const set = (v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, v); input.dispatchEvent(new Event('input', { bubbles: true })); };
          set(''); set('router');
        })()`,
        `new URLSearchParams(location.search).get('q') === 'router'`,
      );
      const found = typed && await waitFor(`(() => { const l = ${productLinks}; return l.length > 0 && l.length < ${all.length} && [...document.querySelectorAll('a[href*="/catalogo/"]')].some(a => /router/i.test(a.textContent)); })()`);
      const shown = await evaluate(`${productLinks}.length`);
      check('Catálogo: la búsqueda cambia la URL y los resultados (requiere hidratación)', found && problems.length === 0,
        !typed ? 'la URL no cambió: la página no reaccionó (¿sin hidratar?)' : `${await evaluate('location.search')} · ${shown} de ${all.length} fichas${problems.length ? ` · ${problems.slice(0, 3).join(' | ')}` : ''}`);
      const product = all[0];
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

  // Móvil: abrir el menú y navegar al catálogo con él.
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  // Sin interfaz, el cambio a móvil deja la pestaña «hidden» y las View Transitions se abortan.
  await cdp.send('Page.bringToFront');
  await goto(BASE);
  const menu = 'document.querySelector(\'[role=dialog] nav[aria-label="Menú móvil"]\')';
  const opened = await until(`document.querySelector('button[aria-label="Abrir menú"]')?.click()`, menu);
  let navigated = false;
  if (opened) {
    await evaluate(`[...${menu}.querySelectorAll('a')].find(a => /\\/catalogo\\/?$/.test(a.getAttribute('href')))?.click()`);
    navigated = await waitFor(`location.pathname === ${JSON.stringify(`${PREFIX}catalogo/`)} && !${menu} && !!document.querySelector('#catalog-search')`);
  }
  check('Menú móvil: abre y navega al catálogo (requiere hidratación)', navigated && problems.length === 0,
    !opened ? 'el botón no abrió el menú (¿sin hidratar?)' : [await evaluate('location.pathname'), problems.length && problems.slice(0, 3).join(' | ')].filter(Boolean).join(' · '));
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });

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
}

run()
  .catch((err) => { console.error(`✖ ${err.message}`); process.exitCode = 1; })
  // Recursos ya cerrados: si algo quedara pendiente, no deja el proceso abierto.
  .finally(() => setTimeout(() => process.exit(), 3000).unref());
