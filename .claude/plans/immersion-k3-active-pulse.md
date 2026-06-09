# Plan — Immersion K3 : halo pulsé du tour actif (combat)

**Branche :** `claude/immersion-k3-active-pulse`
**Origine :** [`immersion-suite-4.md`](./immersion-suite-4.md) §K3 (priorité 3).
**Nature :** 100 % cosmétique, **CSS seul** (la classe `.active-char` est déjà
posée par la boucle de combat — `battle-ui.js:211`). Bump cache PWA (style.css).

## Objectif

`.active-char` n'est qu'une bordure dorée statique. La rendre **vivante**
pendant le tour du perso : halo doré qui respire, pour suivre d'un coup d'œil
qui agit.

## Conception

- `css/style.css` : ajout d'`animation: activeCharPulse 1.8s ease-in-out infinite`
  sur `.party-card.active-char` + `@keyframes activeCharPulse` (box-shadow doré
  qui pulse). **Aucun JS.**
- **reduced-motion** → `animation: none` (le `box-shadow` statique de la règle
  de base reste = comportement actuel).
- **Cohabitation `.low-hp`** : la règle `.low-hp` est placée **après**
  `.active-char` → son `animation` (pulse rouge) l'emporte quand un perso actif
  est aussi en danger (danger prioritaire, cohérent avec K2).

## Étapes & vérifications

1. [x] Plan (ce fichier).
2. [x] `style.css` : animation `.active-char` + keyframes + override reduced-motion.
3. [x] `tests/smoke.js` `scenarioActiveCharPulse` : `animationName === 'activeCharPulse'`
   en normal, `'none'` en reduced-motion, classe conservée.
4. [x] Cache PWA bumpé (v82 : style.css).
5. [x] DoD : units, smoke, check_cache_versions, pwa-smoke verts ; commit + push ; PR + merge.

## Journal des écarts

### Implémentation (2026-06-08, branche claude/immersion-k3-active-pulse)

Livré conforme, aucun écart. CSS-only (style.css). `scenarioActiveCharPulse`
(fx.js) vérifie l'animation présente en normal et neutralisée en reduced-motion
(via `emulateMedia` + `getComputedStyle().animationName`). `CACHE_VERSION`
→ `hogwarth-v82`, style.css 33→34.
