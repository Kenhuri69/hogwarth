# Révision de la courbe de scaling — Boucle Ténébreuse

Objectif : rendre la montée en puissance des monstres de la Boucle Ténébreuse
(étages 11+, post-victoire) **plus marquée**. Le joueur trouve la Boucle trop
facile en l'état (testé en jeu). Réglage piloté par `tools/sim-difficulty.js`.

## Diagnostic (sim « endgame réaliste » — joueur suréquipé)

`node tools/sim-difficulty.js --endgame --artifacts --stat-points=3 \
  --house-set=gryffondor --house-tier=18 --forge=3 --library=2 --bonus-levels=4`

| Loop | Étages | Win % Solo | Win % Duo | Ressenti |
|------|--------|-----------|-----------|----------|
| 1 | 11→20 | **100 %** (fin 77-99 % PV) | **100 %** | **trivial** |
| 2 | 21→30 | 61-84 % | 77-94 % | léger |
| 3 | 31→40 | 36-51 % | 44-68 % | correct |

Cause racine :
- `ENDGAME_SCALING.scalDelta = 0.5` est **constant** → la boucle 1 (n=1) ne
  reçoit qu'**une** passe de récursion `stat×scal + fixEff`.
- Le lissage par `intraMult` (volontaire, anti double-punition) **écrase**
  l'apport du palier sur les monstres de fin de boucle (relFloor 8-10), si
  bien que les étages 18-20 montent à peine.

## Plan

1. [x] Diagnostic chiffré (ci-dessus). → vérifié
2. [x] Knobs de tuning sim : `--endgame-scaldelta`, `--endgame-scaldelta-growth`,
   `--endgame-basefix-mult`. → no-op aux défauts vérifié.
3. [x] Balayage de paramètres (candidats A→G) → 3 intensités R0/R1/R2.
4. [x] Validé avec l'utilisateur : **R1 marqué**.
5. [x] Bake dans `js/dungeon-scaling.js` (runtime) + miroir `tools/sim-difficulty.js`.
   → sim défaut reproduit R1 (runtime/sim en phase).
6. [x] `node tests/units.js` (761 ok) + smoke (filtré dungeon/scaling ok ;
   suite complète en cours).
7. [x] Cache-bump `dungeon-scaling.js?v=6→7`, `CACHE_VERSION v172→v173`.
   check_cache_versions + pwa-smoke verts.
8. [x] MàJ CLAUDE.md (section Boucle Ténébreuse) + ce plan.

## Décision retenue — R1 marqué

`ENDGAME_SCALING` : `scalDelta` 0.5 → **0.8**, ajout `scalDeltaGrowth` **0.2**
(`endgameScalDelta(n) = 0.8 + 0.2×(n−1)`), `baseFix` × 1.4
(`{hp:112, atk:14, def:7, mag:11, xp:70, gold:112}`).

Courbe obtenue (joueur suréquipé Solo/Duo, win %) :
- Étage 20 : 89 / 100 % (vs 95 / 100 baseline)
- Étage 25 : 57-63 / 76-82 % (vs 75 / 86)
- Étage 30 : 48 / 61-66 % (vs 63 / 76)
- Étage 40 : 18-22 / 28-29 % (vs 29 / 47)

Limite assumée : étages 11-13 (et 21-23…) restent faciles (pool rebasé
sur étages 1-3 via `effectiveFloor`) — rythme voulu du rebase, hors scope.
