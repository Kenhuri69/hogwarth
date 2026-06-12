# Plan — Immersion K4 : comptage animé de l'or

**Branche :** `claude/immersion-k4-gold-tick`
**Origine :** [`immersion-suite-4.md`](./immersion-suite-4.md) §K4 (optionnel).
**Nature :** 100 % cosmétique. JS servi → bump cache PWA (ux-improvements.js, ui.js).

## Objectif

Le total d'or **saute** au gain. Un **roll-up** bref (~450 ms) rend la récompense
tangible.

## Conception

- `js/ux-improvements.js` : `UX.tickNumber(el, from, to, ms, render)` —
  interpole (easeOutCubic) via rAF ; `render(v)` permet de préserver une icône.
  Auto-annulé si rappelé sur le même élément (`el._tickRAF`). **reduced-motion**
  ou `ms<=0` → écrit `to` directement.
- `js/ui.js` (`updateUI`) : mémorise le dernier total affiché sur `data-gold`
  (pas dans l'état de jeu) ; au changement → `UX.tickNumber` avec un `render`
  qui réécrit l'icône + nombre. **Anti-clobber** : si une anim tourne
  (`el._tickRAF`), un `updateUI` redondant ne réécrit pas.
- **Défensif** : sans `UX.tickNumber`, écriture directe (comportement actuel).

## Étapes & vérifications

1. [x] Plan (ce fichier).
2. [x] `ux-improvements.js` : `tickNumber` + export.
3. [x] `ui.js` : roll-up de `#gold-display` (data-gold, anti-clobber).
4. [x] `tests/smoke.js` `scenarioGoldTick` : ms=0 → final immédiat ; render
   personnalisé ; data-gold mis à jour ; atterrissage exact ; reduced-motion → final.
5. [x] Cache PWA bumpé (v87 : ux-improvements.js, ui.js).
6. [x] DoD : units, smoke, check_cache_versions, pwa-smoke verts ; commit + push ; PR + merge.

## Journal des écarts

### Implémentation (2026-06-09, branche claude/immersion-k4-gold-tick)

Livré conforme. `UX.tickNumber` (rAF easeOutCubic, auto-annulation, callback de
rendu) ; `updateUI` anime `#gold-display` au changement (mémoire `data-gold`,
garde anti-clobber). `scenarioGoldTick` (fx.js) couvre API directe, render
personnalisé, atterrissage exact et reduced-motion. CACHE_VERSION v87,
ux-improvements.js 5→6, ui.js 12→13.
