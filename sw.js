/* eslint-disable no-restricted-globals */
// =======================================================================
// Service Worker — Hogwarth
// =======================================================================
//
// Stratégie :
//   - index.html / manifest.json → Network-First (timeout 3 s → cache)
//   - js/, css/ (URLs cache-bustées par ?v=N) → Cache-First
//   - img/, audio/, fonts → Stale-While-Revalidate avec cache à la demande
//   - Reste (CDN, requêtes externes) → passthrough sans cache
//
// Versionnage :
//   - Incrémenter CACHE_VERSION + ajouter ?v=N à l'URL d'enregistrement
//     dans index.html à chaque release qui change index.html ou sw.js.
//   - Les CSS/JS ont déjà leur propre ?v=N (cf. index.html), donc bump
//     individuel suffit pour eux.
// =======================================================================

const CACHE_VERSION = 'hogwarth-v178';
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Précache minimal (~1 Mo) : shell HTML/CSS/JS + premier visuel.
// Le reste (img/, audio/) est mis en cache à la demande.
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',

  // CSS
  './css/style.css?v=45',
  './css/ux-improvements.css?v=4',
  './css/save-ui.css?v=5',
  './css/ornaments.css?v=1',
  './css/help-tour.css?v=2',
  './css/pwa.css?v=1',
  './css/combat-fx.css?v=11',
  './css/dungeon-fx.css?v=5',
  './css/cinematics.css?v=1',
  './css/frost.css?v=1',
  './css/codex.css?v=5',

  // JS — ordre identique à index.html (sans incidence pour le cache,
  // mais utile à la relecture)
  './js/html-escape.js?v=1',
  './js/ux-improvements.js?v=6',
  './js/combat-fx.js?v=10',
  './js/haptics.js?v=2',
  './js/audio.js?v=2',
  './js/audio-music.js?v=7',
  './js/audio-sfx.js?v=16',
  './js/icons.js?v=1',
  './js/scene-icons.js?v=7',
  './js/monsters.js?v=22',
  './js/npcs.js?v=37',
  './js/npcs-helpers.js?v=4',
  './js/riddles.js?v=2',
  './js/codex.js?v=14',
  './js/data.js?v=49',
  './js/data-icon-recipes.js?v=1',
  './js/floor-themes.js?v=2',
  './js/floor-ambiance.js?v=14',
  './js/floor-events.js?v=1',
  './js/room-flavor.js?v=1',
  './js/item-icons.js?v=32',
  './js/state.js?v=35',
  './js/hero-barks.js?v=11',
  './js/ui.js?v=18',
  './js/modal-a11y.js?v=1',
  './js/ui-character-sheet.js?v=8',
  './js/ui-settings.js?v=3',
  './js/ui-bestiary.js?v=5',
  './js/ui-codex.js?v=6',
  './js/dungeon-scaling.js?v=7',
  './js/dungeon.js?v=19',
  './js/dungeon-spawning.js?v=2',
  './js/textures.js?v=1',
  './js/renderer.js?v=16',
  './js/renderer-effects.js?v=12',
  './js/dungeon-fx.js?v=8',
  './js/cinematics.js?v=2',
  './js/renderer-sprites.js?v=6',
  './js/renderer-entities.js?v=8',
  './js/renderer-minimap.js?v=8',
  './js/movement.js?v=37',
  './js/movement-floors.js?v=17',
  './js/movement-interactions.js?v=18',
  './js/swipe-canvas.js?v=4',
  './js/battle.js?v=33',
  './js/battle-rewards.js?v=11',
  './js/battle-death.js?v=3',
  './js/teleport.js?v=2',
  './js/battle-spells.js?v=15',
  './js/battle-ui.js?v=8',
  './js/inventory-core.js?v=8',
  './js/inventory.js?v=21',
  './js/inventory-spells.js?v=5',
  './js/potions.js?v=6',
  './js/quests-templates.js?v=16',
  './js/quests.js?v=19',
  './js/quests-riddles.js?v=3',
  './js/npc-dialog.js?v=21',
  './js/karaoke.js?v=1',
  './js/intro.js?v=3',
  './js/shop.js?v=17',
  './js/save-slots.js?v=3',
  './js/save.js?v=40',
  './js/save-visit-snapshot.js?v=1',
  './js/profile.js?v=3',
  './js/save-ui.js?v=9',
  './js/ironman.js?v=4',
  './js/hall-of-fame.js?v=4',
  './js/multiplayer.js?v=9',
  './js/multiplayer-social.js?v=1',
  './js/multiplayer-visits.js?v=1',
  './js/main.js?v=29',
  './js/endgame.js?v=9',
  './js/break-cycle.js?v=4',
  './js/forge.js?v=5',
  './js/library.js?v=4',
  './js/help-tour.js?v=3',
  './js/loader.js?v=52',
  './js/pwa.js?v=4',

  // Icônes PWA + premier écran
  './img/icons/pwa/icon-192.png?v=2',
  './img/icons/pwa/icon-512.png?v=2',
  './img/scenes/title.jpg',
];

// ── Helpers ─────────────────────────────────────────────────────────────

function isCacheBustedAsset(url) {
  // Les CSS/JS qu'on précache ont tous un ?v=N → matche tout chemin
  // js/* ou css/* avec query string.
  return /\/(js|css)\/[^?]+\?v=/.test(url);
}

function isMediaAsset(url) {
  return /\/(img|audio)\//.test(url);
}

function isHtmlNavigation(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

function isSameOrigin(url) {
  return new URL(url, self.location.href).origin === self.location.origin;
}

// Network-First avec timeout 3 s
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('network-timeout')), 3000)
    );
    const response = await Promise.race([networkPromise, timeoutPromise]);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (_err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Fallback ultime : index.html depuis le precache
    const shell = await caches.match('./index.html');
    if (shell) return shell;
    throw _err;
  }
}

// Cache-First : sert depuis le cache, fallback réseau si absent
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

// Stale-While-Revalidate : sert le cache si dispo, met à jour en arrière-plan
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then((response) => {
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  }).catch(() => null);
  return cached || networkPromise || Promise.reject(new Error('no-cache-no-network'));
}

// ── Lifecycle ───────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore les requêtes non-GET (POST Supabase pour Hall of Fame, etc.)
  if (request.method !== 'GET') return;

  // Ignore les requêtes cross-origin (Supabase, fonts CDN, etc.)
  if (!isSameOrigin(request.url)) return;

  // Navigation HTML → Network-First
  if (isHtmlNavigation(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Manifest → Network-First (rare, mais on veut la dernière version)
  if (request.url.includes('manifest.json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Assets cache-bustés (?v=N) → Cache-First
  if (isCacheBustedAsset(request.url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Médias (img/, audio/) → Stale-While-Revalidate
  if (isMediaAsset(request.url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Reste → passthrough (réseau direct, pas de cache)
});
