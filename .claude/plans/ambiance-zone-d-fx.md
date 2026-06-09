# Plan — P-D4 : FX runes pulsées + brouillard temporel (Zone D)

**Branche :** `claude/ambiance-zone-d-fx` (depuis master, Étape 3 mergée #447)
**Statut :** 🟧 En cours
**Nature :** visuel canvas (renderer + dungeon-fx) + pic givre sur écho. Touche
des JS servis → **bump cache PWA obligatoire**. Aucune nouvelle CSS, aucun
nouvel état persistant (tout dérivé de `currentFloor`/`victoryAchieved`).

Suite de l'Étape 3 (P-D1/P-D2/P-D3/P-D5 livrés #447). Référence design :
`chapters-04-10-lieux-ambiance.md` §Étape 3 « Système audiovisuel » +
`docs/histoire/10-lieux-et-geographie.md` §10.2 (runes qui palpitent,
brouillard temporel).

## Constat (état du code)

- Boucle FX `_dungeonFxPhase` (~11 FPS, `js/dungeon-fx.js`) pilote déjà
  `drawTorch` + `drawDepthsMist` (zone C) + `drawDungeonDust`. **Driver
  d'animation réutilisable**, respecte `prefers-reduced-motion`.
- Surfaces rune visibles = **sol + plafond** (`rune_floor`/`rune_ceiling`),
  peints en `renderer.js` (sol ~436, plafond ~472) sous le flag
  `_floorDark`/`_ceilDark` = `victoryAchieved && currentFloor >= 11`.
- `#frost-overlay` (givre CSS) piloté par `_applyCorruptionAmbiance(floor)`
  (`floor-ambiance.js`), transition opacité 1.2 s.

## Étapes & critères

1. **Runes pulsées** — `_runePulseAlpha(depthIndex)` (`dungeon-fx.js`, pur sur
   `_dungeonFxPhase`, 0 sous reduced-motion / phase 0). Injection canvas
   **surgicale** en `renderer.js` après le remplissage rune du sol et du
   plafond, gardée par `_floorDark`/`_ceilDark` → glow violet froid pulsé
   « respiration ». → vérif : drawDungeon à l'étage 14+victoire ne throw pas ;
   `_runePulseAlpha(0)` ∈ [0, cap].
2. **Brouillard temporel** — `drawTemporalFog(cx,cy,scale)` (`dungeon-fx.js`),
   miroir de `drawDepthsMist` mais palette violacée + nappes basses + dérive
   plus lente (« le temps ne coule plus droit »). Gate zone rune
   (`ambient==='abyss'` ∥ `victory && floor>=11`). Appel unique en `renderer.js`
   après `drawDepthsMist`. No-op hors zone / phase 0. → vérif : no-op étage 1 ;
   actif étage 14.
3. **Pic givre sur écho** — `pulseFrostOverlay()` (`floor-ambiance.js`) : élève
   brièvement `#frost-overlay` puis revient à la baseline corruption. Appelé au
   call-site écho de `movement.js` (P-D3) quand un écho s'affiche. → vérif :
   opacité > baseline juste après l'appel.
4. **Garde-fous** : MANIFEST loader (`drawTemporalFog`, `_runePulseAlpha`,
   `pulseFrostOverlay`) ; `tests/smoke.js` scénario `scenarioZoneDFx` ;
   `node tests/units.js && node tests/smoke.js` ; bump cache PWA
   (`dungeon-fx.js`, `renderer.js`, `floor-ambiance.js`, `movement.js`,
   `loader.js` + `CACHE_VERSION` + `PRECACHE_URLS`).

## Hors scope
- Superposition audio des 4 timbres de Fondateur (réserve, sample `abyss` déjà
  zoné) — suite possible.
- P5 (étage-scène Chambre de Maison) — arbitrage produit.

## Journal des écarts

### Implémenté (2026-06-09, branche claude/ambiance-zone-d-fx)
**Statut : 🟩 livré.** Approche **100 % canvas** (pas de nouvelle CSS / pas de
nouvel élément DOM) — plus cohérente avec les FX existants (`drawDepthsMist`,
`drawDungeonDust`) et footprint réduit.

1. **Runes pulsées** — `_runePulseAlpha(depthIndex)` + `_isRuneZone()` dans
   `dungeon-fx.js`. Injection canvas dans `renderer.js` après le remplissage
   rune du sol (glow plein) et du plafond (×0.7), gardée par `_floorDark`/
   `_ceilDark`. Glow violet froid `rgba(150,130,210,α)`, α ≤ 0.12, pulsé par
   `_dungeonFxPhase`, déphasé/atténué par la profondeur. 0 sous reduced-motion.
2. **Brouillard temporel** — `drawTemporalFog(cx,cy,scale)` (`dungeon-fx.js`),
   miroir de `drawDepthsMist` (palette violacée, nappes basses, dérive lente).
   Appel unique en `renderer.js` après `drawDepthsMist`. Gate `_isRuneZone()`.
3. **Pic givre sur écho** — `pulseFrostOverlay()` (`floor-ambiance.js`), appelé
   au call-site écho de `movement.js`. Élève `#frost-overlay` (+0.3, cap 0.6)
   puis ré-applique la baseline corruption après 900 ms.
4. **Garde-fous** — MANIFEST loader : `drawTemporalFog`, `_runePulseAlpha`,
   `pulseFrostOverlay` (optionnels). `tests/smoke.js` : `scenarioZoneDFx`
   (helpers, gate de zone, bornes du pulse, drawDungeon sans throw à l'étage 14,
   pic givre). `units` 246 / `smoke` 179 verts. Cache PWA : `CACHE_VERSION` v91,
   5 assets bumpés (dungeon-fx 8, renderer 16, floor-ambiance 4, movement 33,
   loader 32). Aucun nouvel état persistant.

**Écart vs plan initial** : le plan évoquait un overlay CSS `#temporal-fog-overlay`
en option ; j'ai retenu la variante **canvas** (`drawTemporalFog`) car le moteur
a déjà la brume `depths` en canvas — réutilisation directe, zéro CSS/HTML neuf.
