# Plan — Immersion N1 : transitions d'ouverture des modales

**Branche :** `claude/immersion-n1-modal-transitions`
**Origine :** [`immersion-suite-4.md`](./immersion-suite-4.md) §N1 (priorité 5).
**Nature :** 100 % cosmétique, **CSS seul**. Bump cache PWA (style.css).

## Objectif

Les modales d'info apparaissent sèchement (`display:flex` instantané). Ajouter un
**fondu + léger scale** d'ouverture, confort sans ralentir l'usage.

## Conception

- `css/style.css` : animation `modalBoxIn` (fondu + translateY/scale) sur
  `.modal-box` et `.bestiary-modal-box` + fondu de voile `modalBackdropIn` sur le
  conteneur des modales d'info. **CSS seul** : l'animation se rejoue à chaque
  passage `display:none → flex` (réaffichage). **reduced-motion** → `modalBoxFadeRM`
  (fondu d'opacité seul, sans translation/scale).
- **Garde-fou** : ne cible **que** les modales d'info partageant `.modal-box`/
  `.bestiary-modal-box`. Les overlays de **combat** (`#encounter-overlay`) et de
  **transition d'étage** (`#floor-transition`, `#tier-transition-overlay`)
  n'utilisent pas ces classes → non touchés. Ouverture seule (fermeture instantanée
  conservée — pas de régression de timing).

## Étapes & vérifications

1. [x] Plan (ce fichier).
2. [x] `style.css` : `modalBoxIn`/`modalBackdropIn` + variante reduced-motion.
3. [x] `tests/smoke.js` `scenarioModalTransitions` : box animée (`modalBoxIn`),
   modale fonctionnelle (bouton fermeture), combat non touché, reduced-motion
   → `modalBoxFadeRM`.
4. [x] Cache PWA bumpé (v84 : style.css).
5. [x] DoD : units, smoke, check_cache_versions, pwa-smoke verts ; commit + push ; PR + merge.

## Journal des écarts

### Implémentation (2026-06-08, branche claude/immersion-n1-modal-transitions)

Livré conforme, aucun écart. CSS-only (style.css). `scenarioModalTransitions`
(visuals.js) vérifie l'animation présente en normal (`modalBoxIn`), la modale
fonctionnelle, l'absence d'impact sur `#encounter-overlay`, et la variante
reduced-motion (`modalBoxFadeRM`). `CACHE_VERSION` → `hogwarth-v84`, style.css 34→35.
