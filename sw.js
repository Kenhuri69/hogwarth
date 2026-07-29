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

const CACHE_VERSION = 'hogwarth-v273';
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Précache minimal (~1 Mo) : shell HTML/CSS/JS + premier visuel.
// Le reste (img/, audio/) est mis en cache à la demande.
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',

  // CSS
  './css/style.css?v=63',
  './css/ux-improvements.css?v=6',
  './css/save-ui.css?v=5',
  './css/ornaments.css?v=2',
  './css/help-tour.css?v=3',
  './css/pwa.css?v=1',
  './css/combat-fx.css?v=13',
  './css/dungeon-fx.css?v=5',
  './css/cinematics.css?v=1',
  './css/frost.css?v=3',
  './css/codex.css?v=5',
  './css/escape-pocket.css?v=2',

  // JS — ordre identique à index.html (sans incidence pour le cache,
  // mais utile à la relecture)
  './js/html-escape.js?v=1',
  './js/ux-improvements.js?v=10',
  './js/combat-fx.js?v=13',
  './js/haptics.js?v=3',
  './js/audio.js?v=2',
  './js/audio-music.js?v=12',
  './js/audio-sfx.js?v=19',
  './js/icons.js?v=2',
  './js/scene-icons.js?v=9',
  './js/monsters.js?v=24',
  './js/monsters-low.js?v=1',
  './js/monsters-mid.js?v=1',
  './js/monsters-high.js?v=6',
  './js/npcs.js?v=43',
  './js/npcs-a.js?v=8',
  './js/npcs-b.js?v=7',
  './js/npcs-helpers.js?v=4',
  './js/riddles.js?v=3',
  './js/codex.js?v=21',
  './js/data.js?v=65',
  './js/data-characters.js?v=1',
  './js/data-spells.js?v=1',
  './js/data-items.js?v=7',
  './js/data-world.js?v=1',
  './js/data-icon-recipes.js?v=1',
  './js/floor-themes.js?v=2',
  './js/floor-ambiance.js?v=20',
  './js/floor-events.js?v=2',
  './js/room-flavor.js?v=1',
  './js/item-icons.js?v=52',
  './js/state.js?v=49',
  './js/hero-barks.js?v=15',
  './js/ui.js?v=27',
  './js/modal-a11y.js?v=2',
  './js/ui-character-sheet.js?v=19',
  './js/ui-settings.js?v=7',
  './js/keybindings.js?v=1',
  './js/ui-bestiary.js?v=9',
  './js/ui-codex.js?v=12',
  './js/dungeon-scaling.js?v=10',
  './js/dungeon.js?v=22',
  './js/dungeon-spawning.js?v=2',
  './js/textures.js?v=2',
  './js/renderer.js?v=19',
  './js/renderer-effects.js?v=13',
  './js/dungeon-fx.js?v=9',
  './js/cinematics.js?v=3',
  './js/renderer-sprites.js?v=7',
  './js/renderer-entities.js?v=8',
  './js/renderer-minimap.js?v=9',
  './js/movement.js?v=45',
  './js/movement-floors.js?v=22',
  './js/movement-interactions.js?v=24',
  './js/escape-pocket.js?v=6',
  './js/swipe-canvas.js?v=4',
  './js/battle.js?v=46',
  './js/battle-rewards.js?v=14',
  './js/battle-death.js?v=5',
  './js/teleport.js?v=3',
  './js/battle-spells.js?v=29',
  './js/battle-ui.js?v=12',
  './js/inventory-core.js?v=13',
  './js/inventory.js?v=32',
  './js/inventory-spells.js?v=14',
  './js/potions.js?v=8',
  './js/quests-templates.js?v=27',
  './js/quests.js?v=27',
  './js/quests-riddles.js?v=3',
  './js/npc-dialog.js?v=26',
  './js/karaoke.js?v=1',
  './js/intro.js?v=4',
  './js/shop.js?v=22',
  './js/save-slots.js?v=4',
  './js/save.js?v=53',
  './js/save-visit-snapshot.js?v=2',
  './js/profile.js?v=7',
  './js/save-ui.js?v=9',
  './js/ironman.js?v=5',
  './js/hall-of-fame.js?v=5',
  './js/multiplayer.js?v=10',
  './js/multiplayer-social.js?v=2',
  './js/multiplayer-visits.js?v=2',
  './js/main.js?v=39',
  './js/endgame.js?v=10',
  './js/break-cycle.js?v=4',
  './js/forge.js?v=8',
  './js/library.js?v=7',
  './js/help-tour.js?v=5',
  './js/balance-log.js?v=2',
  './js/loader.js?v=65',
  './js/pwa.js?v=9',

  // Icônes PWA + premier écran
  './img/icons/pwa/icon-192.png?v=4',
  './img/icons/pwa/icon-512.png?v=4',
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
    caches.open(CACHE_VERSION).then((cache) =>
      // Précache TOLÉRANT : `addAll` est atomique — une seule URL morte (asset
      // oublié au bump du `?v`) ferait échouer toute l'install, donc plus de
      // mode offline. On précache par URL via `Promise.allSettled` : une URL en
      // échec est ignorée, le reste du shell est mis en cache normalement.
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
    )
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
