# Plan — Immersion K2 : état « PV bas » par carte de groupe

**Branche :** `claude/immersion-k2-low-hp`
**Origine :** [`immersion-suite-4.md`](./immersion-suite-4.md) §K2 (priorité 2).
**Nature :** 100 % cosmétique/UX (aucune mécanique, aucun état de save). JS + CSS
→ **bump cache PWA** (guidelines §8).

## Objectif

Aucun signal quand un perso est en danger au niveau de **sa carte**. Ajouter un
**état persistant** sur `.party-card` quand `hp/hpMax < 0.25` : liseré rouge +
pulsation douce. Réactif : retiré dès soigné au-dessus du seuil. Complète le
voile plein écran D2 (`cfx-danger`), qui couvre le groupe.

## Conception

- **JS** (`js/ui.js`, dans la boucle KO de `updateUI`) : `card.classList.toggle('low-hp', !ko && c.hp/c.hpMax < LOW_HP_RATIO)`. Constante `LOW_HP_RATIO = 0.25` partagée avec la vignette D2 (anti-drift). Purement dérivé, **aucune variable d'état neuve**.
- **Garde-fou** : jamais sur un KO (`.ko-char` prioritaire — `low-hp` non posé quand `hp<=0`).
- **CSS** (`css/style.css`) : `.party-card.low-hp` (liseré `--danger` + `@keyframes lowHpPulse`), placé après `.active-char`/`.ko-char` pour que le rouge prime sur la bordure dorée du tour actif. **reduced-motion** → `animation:none` + liseré statique (danger lisible sans mouvement).

## Étapes & vérifications

1. [x] Plan (ce fichier).
2. [x] `ui.js` : toggle `.low-hp` + constante `LOW_HP_RATIO`.
3. [x] `style.css` : `.low-hp` + pulsation + variante reduced-motion.
4. [x] `tests/smoke.js` `scenarioLowHpCard` : seuil/remontée/KO + reduced-motion (anim `none`).
5. [x] Cache PWA bumpé (v81 : ui.js, style.css).
6. [x] DoD : units (179), smoke (170), check_cache_versions, pwa-smoke verts ; commit + push ; PR + merge.

## Journal des écarts

### Implémentation (2026-06-08, branche claude/immersion-k2-low-hp)

Livré conforme au plan, aucun écart.

- **`ui.js`** : boucle KO refactorée pour calculer `ko` une fois et basculer
  `.ko-char` + `.low-hp` ; const `LOW_HP_RATIO = 0.25` réutilisée par la
  vignette D2 (remplace les deux `0.25` inline → source unique).
- **`style.css`** : `.party-card.low-hp` (liseré + `lowHpPulse`) + bloc
  reduced-motion (anim neutralisée, box-shadow statique).
- **Tests** : `scenarioLowHpCard` (fx.js) — 4 transitions d'état + vérif
  reduced-motion via `emulateMedia` + `getComputedStyle().animationName === 'none'`.
- **Cache PWA** : `CACHE_VERSION` → `hogwarth-v81` ; ui.js 11→12, style.css 32→33.
