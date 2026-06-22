# Mobile — Badges Éclats & Corruption (lisibilité HUD endgame)

## Problème
Sur mobile (≤700px), `.left-panel` passe en bandeau horizontal (`flex-direction: row`).
`#eclat-hud-badge` (« 11 ÉCLATS ») et `#corruption-meter` (« ❄❄❄ CORRUPTION TENACE »)
sont des enfants flex de ce bandeau → ils consomment chacun un créneau horizontal
de part et d'autre de la carte perso, qui est écrasée (nom tronqué, PV/PM coupés).
Indicateurs visibles uniquement en endgame (Boucle / étages corrompus).

## Décision (validée par l'utilisateur)
Mini-chips icône+chiffre empilés verticalement à gauche du bandeau de groupe,
ne squishant plus la carte. Tap → ouvre l'info liée dans le Codex.

## Statut : ✅ TERMINÉ
Validé par capture mobile (carte 315px non écrasée, chips « ✦ 11 » / « ❄❄❄❄❄ »,
taps → Codex Éclats / Corruption) + smoke 265 verts + cache cohérent.

## Étapes
1. [x] **HTML** (`index.html`) — wrapper `#hud-endgame-chips` regroupant le badge Éclats
   et le thermomètre corruption (déplacé depuis sa position sous les cartes).
   Ajout onclick + a11y (`openEclatInfo()` / `openCorruptionInfo()`).
   → verify: structure DOM, smoke test vert.
2. **JS** (`js/ui.js`) — `_updateEclatBadge` : wrapper le mot « Éclat(s) » dans
   `.eclat-chip-lbl` (masquable en CSS mobile) ; nouvelle fonction `openEclatInfo()`
   (Codex → section Éclats → entrée `porteur_eclats`).
   → verify: badge affiche « ✦ N » + mot, tap ouvre Codex.
3. **JS** (`js/floor-ambiance.js`) — `openCorruptionInfo()` (Codex → glossaire →
   entrée `corruption_gradient`).
   → verify: tap ouvre l'entrée corruption.
4. **CSS** (`css/style.css`, bloc ≤700px) — `#hud-endgame-chips` flex column étroit ;
   chips compacts (label masqué, ✦+chiffre / ❄ seul) ; sélecteurs `.left-panel #...`
   pour battre la spécificité de frost.css (chargé après).
   → verify: capture mobile, carte non écrasée, chips lisibles + cliquables.
5. **Cache PWA** — bump `?v` de style.css/ui.js/floor-ambiance.js (index.html + sw.js)
   + CACHE_VERSION. → verify: `node tools/check_cache_versions.js --base origin/master`.
6. **Tests** — `node tests/smoke.js`. → verify: vert.

## Écart accepté
Sur DESKTOP, le thermomètre corruption passe de « sous les cartes » à « au-dessus des
cartes » (regroupé avec le badge Éclats dans le wrapper). Changement mineur, cohérent
(les 2 indicateurs endgame groupés). Aucun impact fonctionnel.
