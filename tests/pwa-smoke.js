// ============================================================
// Tests fumée PWA — Hogwarth
// Usage : node tests/pwa-smoke.js
// Pré-requis : Playwright installé globalement (chromium)
//
// Différences avec smoke.js :
//   - Ce test démarre un serveur HTTP local : les Service Workers
//     sont désactivés en file://, donc impossible de tester en
//     ouvrant directement index.html.
//   - Couvre uniquement le périmètre PWA (manifest, SW, offline).
//     Pour les tests de jeu, voir smoke.js.
// ============================================================

const { chromium } = require('./_playwright.js');
const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── Mini serveur HTTP statique ─────────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ogg':  'audio/ogg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent(req.url.split('?')[0]);
      if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
      const filePath = path.join(ROOT, urlPath);
      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
        });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

// ── Helpers ───────────────────────────────────────────────────

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg} — attendu ${JSON.stringify(expected)}, reçu ${JSON.stringify(actual)}`);
  }
}

function assertTrue(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function waitForActivatedSw(page, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { ready: false };
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return { ready: false, why: 'no-reg' };
      const sw = reg.active || reg.waiting || reg.installing;
      return {
        ready: !!(reg.active && reg.active.state === 'activated'),
        installing: reg.installing && reg.installing.state,
        waiting: reg.waiting && reg.waiting.state,
        active: reg.active && reg.active.state,
      };
    });
    if (state.ready) return state;
    await new Promise(r => setTimeout(r, 250));
  }
  const last = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ? {
      installing: reg.installing && reg.installing.state,
      waiting: reg.waiting && reg.waiting.state,
      active: reg.active && reg.active.state,
    } : null;
  });
  throw new Error(`SW pas activé après ${timeoutMs}ms — état final: ${JSON.stringify(last)}`);
}

// ── Scénarios ─────────────────────────────────────────────────

async function scenarioManifest(page, baseUrl) {
  console.log('\n── Scénario : manifest.json ──');

  const response = await page.goto(`${baseUrl}/manifest.json`);
  assertEq(response.status(), 200, 'manifest.json doit répondre 200');
  const body = await response.json();

  assertTrue(typeof body.name === 'string' && body.name.length > 0, 'name doit être défini');
  assertEq(body.display, 'standalone', 'display doit être standalone');
  assertEq(body.start_url, './', 'start_url doit être relatif (./)');
  assertEq(body.scope, './', 'scope doit être relatif (./)');
  assertTrue(Array.isArray(body.icons) && body.icons.length >= 2, 'au moins 2 icônes');

  // Au moins une icône `any` 192+ et une `maskable`
  const hasAny192Plus  = body.icons.some(i => /any/.test(i.purpose || 'any')   && parseInt(i.sizes) >= 192);
  const hasMaskable    = body.icons.some(i => /maskable/.test(i.purpose || '') && parseInt(i.sizes) >= 192);
  assertTrue(hasAny192Plus, 'au moins une icône any ≥ 192px');
  assertTrue(hasMaskable, 'au moins une icône maskable ≥ 192px');

  // Vérifier que chaque chemin d'icône répond 200
  for (const icon of body.icons) {
    const iconUrl = `${baseUrl}/${icon.src}`;
    const r = await page.goto(iconUrl);
    assertEq(r.status(), 200, `icône ${icon.src} doit exister`);
  }

  console.log('  ✅ manifest.json valide, toutes les icônes accessibles');
}

async function scenarioServiceWorker(page, baseUrl) {
  console.log('\n── Scénario : Service Worker installation + précache ──');

  await page.goto(`${baseUrl}/index.html`);

  // Attendre que le SW soit enregistré ET actif
  await waitForActivatedSw(page);

  // Vérifier qu'il y a au moins une cache nommée hogwarth-v<n>
  const caches = await page.evaluate(() => window.caches.keys());
  const hogwarthCache = caches.find(k => /^hogwarth-v\d+$/.test(k));
  assertTrue(!!hogwarthCache, `au moins une cache hogwarth-v* doit exister (caches: ${caches.join(',')})`);

  // Vérifier que index.html et au moins quelques JS critiques sont en cache
  const cachedUrls = await page.evaluate(async (cacheName) => {
    const cache = await caches.open(cacheName);
    const reqs = await cache.keys();
    return reqs.map(r => r.url);
  }, hogwarthCache);

  const required = ['index.html', 'manifest.json', 'js/state.js', 'js/loader.js', 'js/pwa.js'];
  for (const needle of required) {
    assertTrue(
      cachedUrls.some(u => u.includes(needle)),
      `precache doit contenir un fichier matchant "${needle}" (${cachedUrls.length} URLs en cache)`
    );
  }

  console.log(`  ✅ SW activé, cache "${hogwarthCache}" avec ${cachedUrls.length} entrées`);
}

async function scenarioOfflineReload(browser, baseUrl) {
  console.log('\n── Scénario : chargement offline ──');

  // Nouveau contexte propre pour isoler le cache d'origine. Le SW doit
  // déjà être enregistré (scénario précédent), mais on revérifie.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${baseUrl}/index.html`);

  await waitForActivatedSw(page);

  // Attendre que les scripts du jeu soient chargés (le loader est le dernier)
  await page.waitForFunction(() => typeof window.startGame === 'function', null, { timeout: 10000 });

  // Force la mise en cache du shell complet en accédant aux ressources clés.
  // Le SW intercepte automatiquement via stale-while-revalidate.
  await page.evaluate(() => fetch('img/scenes/title.jpg').catch(() => {}));

  // Passer offline puis reload
  await ctx.setOffline(true);

  // Force un cold-load : on quitte la page, on revient.
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'load' });

  await page.waitForFunction(() => typeof window.startGame === 'function', null, { timeout: 10000 });

  const titleScreenVisible = await page.evaluate(() => {
    const el = document.getElementById('title-screen');
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
  assertTrue(titleScreenVisible, "L'écran titre doit s'afficher en mode offline");

  // Vérifier qu'aucune erreur réseau bloquante n'a sapé le runtime
  const loaderOk = await page.evaluate(() =>
    window.__loaderReport && window.__loaderReport.ok === true
  );
  assertTrue(loaderOk, 'window.__loaderReport.ok doit être true offline');

  await ctx.close();
  console.log('  ✅ jeu chargé hors-ligne, loader OK');
}

// ── Run ───────────────────────────────────────────────────────

async function main() {
  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Serveur HTTP : ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Mêmes ignorables que tests/smoke.js : fonts CDN bloquées (cert TLS
  // en sandbox), audio fetch sur file:// (sans objet ici mais aligné).
  function isIgnorableError(text) {
    return text.includes('ERR_CERT_AUTHORITY_INVALID')
        || text.includes('Failed to load resource');
  }

  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (isIgnorableError(t)) return;
    errors.push(`console.error: ${t}`);
  });

  try {
    await scenarioManifest(page, baseUrl);
    await scenarioServiceWorker(page, baseUrl);
    await ctx.close();
    await scenarioOfflineReload(browser, baseUrl);

    if (errors.length > 0) {
      console.error('\n❌ Erreurs console pendant les tests :');
      errors.forEach(e => console.error('  -', e));
      process.exit(1);
    }
    console.log('\n✅ Tous les scénarios PWA sont passés.');
  } catch (err) {
    console.error('\n❌ ÉCHEC :', err.message);
    process.exit(1);
  } finally {
    await browser.close();
    server.close();
  }
}

main();
