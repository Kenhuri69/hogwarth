# Plan — Immersion M1 : PNJ qui réagit à l'approche

**Branche :** `claude/immersion-m1-npc-approach`
**Origine :** [`immersion-suite-4.md`](./immersion-suite-4.md) §M1 (priorité 7).
**Nature :** 100 % cosmétique, canvas pur. Bump cache PWA (renderer-entities.js, renderer.js).

## Objectif

Le sprite PNJ a une orientation/aura constante. Donner l'impression qu'il
**remarque** le joueur qui approche : à courte distance, accentuer brièvement
l'aura chaude + agiter un peu plus le signe ❗/❓ (déjà bobbing).

## Conception

- **`renderer.js`** : passe la **distance en cases** (Manhattan, `pendingSprite.mapX/Y`
  ↔ `playerX/Y`) à `drawNpcSprite(npcId, x, baseY, sz, dist)`.
- **`renderer-entities.js`** :
  - Helper **pur** `_npcApproachProx(dist)` → facteur 0..1 (dist 1 → 1, 2 → 0.5,
    ≥ 3 → 0 ; clampé). Testable en `tests/units.js`.
  - `drawNpcSprite` : `prox = reduce ? 0 : _npcApproachProx(dist)`. Quand `prox > 0` :
    aura ×(1 + prox·0.30·shimmer(phase)) et bob du signe ×(1 + prox·0.6). Subtil
    (max +30 % aura, +60 % bob).
  - **reduced-motion** (`_spriteReducedMotion`) → `prox = 0` (aura/idle de base).
  - **Défensif** : `dist` absente → `prox = 0` (rétro-compat ; aucun autre
    call-site ne change).

## Étapes & vérifications

1. [x] Plan (ce fichier).
2. [x] `renderer-entities.js` : `_npcApproachProx` + modulation dans `drawNpcSprite`.
3. [x] `renderer.js` : passe `dist` au call-site NPC.
4. [x] `tests/units.js` : `_npcApproachProx` (1→1, 2→0.5, 3→0, clamp, non-nombre → 0).
5. [x] `tests/smoke.js` : `drawNpcSprite` ne throw pas avec/ sans `dist` (proche/loin),
   ni sous reduced-motion ; pas de régression du sprite.
6. [x] Cache PWA bumpé : renderer-entities.js, renderer.js.
7. [x] DoD : units, smoke, check_cache_versions, pwa-smoke verts ; commit + push ; PR + merge.

## Journal des écarts

### Implémentation (2026-06-09, branche claude/immersion-m1-npc-approach)

Livré conforme. `_npcApproachProx(dist)` pur (renderer-entities.js) + modulation
aura/sign dans `drawNpcSprite` (gated reduced-motion + `dist` absente). `renderer.js`
passe la distance Manhattan. units.js : 11 assertions ; smoke `scenarioNpcSprite3D`
volet M1 (no-throw proche/loin/sans-dist + reduced-motion). CACHE_VERSION v86,
renderer.js 14→15, renderer-entities.js 2→3.
