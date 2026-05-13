# Mobile — Gestes de swipe sur le canvas pseudo-3D

## Contexte

Sur mobile, les déplacements passent aujourd'hui exclusivement par le
D-pad tactile (`.mobile-dir`, cf. CLAUDE.md « Contrôles de déplacement »).
On ajoute un second canal d'entrée : des swipes directement sur la vue
pseudo-3D (`#dungeon-canvas`). Le D-pad reste affiché en fallback.

Aucune autre interaction n'existe sur le canvas — pas de tap-to-interact,
pas de pinch — donc le risque de conflit est faible. Seul risque : les
gestes par défaut du navigateur (pull-to-refresh, scroll, double-tap zoom).

## Mapping retenu (confirmé)

| Geste                          | Action                              |
|--------------------------------|-------------------------------------|
| Swipe vertical vers le **haut**  | `moveForward()`                   |
| Swipe vertical vers le **bas**   | `moveBackward()`                  |
| Swipe horizontal vers la **gauche** | `turnLeft()`                   |
| Swipe horizontal vers la **droite** | `turnRight()`                  |

Cohérent avec le D-pad (▲ avancer, ▼ reculer, ↺ tourner gauche, ↻ tourner
droite) et avec le mapping clavier (↑↓ avancer/reculer, ←→ tourner).

## Garde-fous

- **Combat / overlay** : si `inBattle` ou si `#encounter-overlay`,
  `#explore-overlay`, `#npc-dialog-overlay`, `#floor-transition` sont
  visibles, on n'intercepte pas le geste (laisse l'overlay capter).
- **`movement.js` est déjà défensif** : `moveForward`, `moveBackward`,
  `turnLeft`, `turnRight` testent tous `inBattle` en amont. Notre
  garde-fou côté swipe est donc redondant mais évite de consommer un
  geste qui touche un overlay.
- **`touch-action: none`** sur `#dungeon-canvas` pour neutraliser le
  pull-to-refresh / scroll vertical / double-tap zoom. Limité au
  canvas — les modales et le HUD gardent leur scroll natif.
- **Seuil** : 30 px de déplacement minimum (axe dominant) pour qu'un
  contact bref ou un tap accidentel ne déclenche rien.
- **Mono-touch uniquement** : si `event.touches.length > 1` (pinch,
  multi-doigt), on annule le geste en cours.
- **Un geste = une action** : le handler `touchend` lit le delta total
  depuis `touchstart`, déclenche l'action correspondante, puis remet
  l'état à zéro. Pas de répétition pendant le drag.

## Architecture

Nouveau fichier `js/swipe-canvas.js` chargé après `js/movement.js` (qui
expose les helpers) et avant `js/main.js` (purement par convention —
l'init est appelée sur `DOMContentLoaded` donc l'ordre exact dans la
liste ne change rien fonctionnellement).

```js
function initCanvasSwipeGestures() {
  const canvas = document.getElementById('dungeon-canvas');
  if (!canvas) return;

  const THRESHOLD = 30; // px
  let startX = 0, startY = 0, tracking = false;

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { tracking = false; return; }
    if (_swipeBlocked()) { tracking = false; return; }
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    tracking = true;
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (!tracking) return;
    if (e.touches.length !== 1) { tracking = false; return; }
    // preventDefault déjà couvert par touch-action: none côté CSS,
    // ne pas le rappeler ici (listener passif).
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < THRESHOLD && absY < THRESHOLD) return; // tap → no-op
    if (absX > absY) {
      // axe dominant : horizontal → rotation
      if (dx < 0) turnLeft();
      else        turnRight();
    } else {
      // axe dominant : vertical → translation
      if (dy < 0) moveForward();
      else        moveBackward();
    }
  }, { passive: true });

  canvas.addEventListener('touchcancel', () => { tracking = false; }, { passive: true });
}

function _swipeBlocked() {
  if (typeof inBattle !== 'undefined' && inBattle) return true;
  const overlays = ['encounter-overlay', 'explore-overlay',
                    'npc-dialog-overlay', 'floor-transition'];
  for (const id of overlays) {
    const el = document.getElementById(id);
    if (el && el.style.display && el.style.display !== 'none') return true;
  }
  return false;
}

window.initCanvasSwipeGestures = initCanvasSwipeGestures;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCanvasSwipeGestures);
} else {
  initCanvasSwipeGestures();
}
```

### CSS

Dans `css/style.css`, ajouter `touch-action: none` au sélecteur
`#dungeon-canvas` existant (ligne ~235). Effet : neutralise le
pull-to-refresh + scroll + double-tap zoom uniquement sur le canvas.

### Loader

Ajouter `{ name: 'initCanvasSwipeGestures', source: 'swipe-canvas.js',
kind: 'fn' }` au MANIFEST de `loader.js`. Pas critique stricto sensu
(le jeu fonctionne sans, via D-pad) mais c'est une feature attendue ;
je la laisse en critique pour détecter une régression de chargement.

## Étapes & vérifications

1. [x] **Plan** rédigé (ce fichier).
2. [x] **Module** `js/swipe-canvas.js` créé avec `initCanvasSwipeGestures`,
   `_dispatchCanvasSwipe`, `_isCanvasSwipeBlocked` exposés sur `window`.
3. [x] **HTML** : `<script src="js/swipe-canvas.js?v=1"></script>` ajouté
   après `movement.js`. **CSS** : `touch-action: none` sur `#dungeon-canvas`.
4. [x] **Loader** : entrée `initCanvasSwipeGestures` ajoutée au MANIFEST
   (total passe de 82 à 83 entries, `__loaderReport.ok === true`).
5. [x] **Smoke** : nouveau scénario `scenarioCanvasSwipe` couvrant
   rotation horizontale, translation verticale avec préservation de
   l'orientation après reculer, garde-fou `inBattle`, `touch-action`
   CSS et marqueur `data-swipe-bound`. Choix : `_dispatchCanvasSwipe`
   appelé directement (plus déterministe que `TouchEvent` dispatch en
   headless ; les listeners eux-mêmes restent couverts par la vérif
   `data-swipe-bound`).
6. [x] **Run** : `node tests/smoke.js` → 49 scénarios verts (dont
   `scenarioCanvasSwipe`, `scenarioRelativeControls`, `scenarioLoader`).
7. [x] **CLAUDE.md** : section « Contrôles de déplacement » étendue
   (colonne « Swipe canvas »), sous-section dédiée ajoutée.
8. [ ] **Commit + push** sur `claude/add-mobile-3d-gestures-7gHE3`.

## Risques / hors-scope

- **TouchEvent en headless** : Playwright/Chromium headless supporte
  `new TouchEvent(...)` côté `dispatchEvent` mais demande un
  `TouchInit` complet. Si l'API n'est pas dispo, on simule via
  appels directs aux callbacks ou via `page.touchscreen.tap` /
  trajet ; à valider à l'étape 5.
- **Tap sur canvas** : volontairement no-op pour V1. Réservé à une
  future interaction (PNJ visible, coffre devant) — pas câblé ici.
- **Toggle d'options** : pas demandé, hors scope. Si voulu plus tard,
  un flag dans `localStorage` suffirait (`hogwarts_canvas_swipe_off`).
- **Inversion accidentelle clavier/UI** : non touché. Seul le canvas
  est concerné.
