# Plan — Biais de génération par Maison V2 : levier « perception » (power-neutral)

Branche : `claude/biais-maison-v2`. Suite du chantier « biais Maison V2 »
(roadmap Phase 3 ; décision d'ouverture du 2026-06-19).

## Audit
- V1 = `houseAmbianceLine` (`floor-ambiance.js`) : ligne **fixe par zone**,
  tirée au hasard à l'entrée. Déjà livré.
- V2 levier **skin** = livrée visuelle d'ennemi (`houseSkinClass`, `battle-ui.js`)
  — déjà livré par un merge parallèle (item 2c).
- V2 levier **pondération de salles** = changerait la distribution des types de
  salle → **différé** derrière le gate sim (risque équité).
- **Lacune comblée ici** : levier **perception** — « ma Maison change ce que je
  VOIS » au niveau du **layout**, sans rien changer de fonctionnel.

## Design (power-neutral strict, Ch.13)
`housePerceptionLine(house, floor, x, y)` (`floor-ambiance.js`) :
- **PUR & déterministe** : hash entier de `(floor,x,y)` → ~24 % des salles sont
  « notables » → une observation du pool de la Maison, **toujours la même à
  cette coordonnée** (persistante, mappable — la promotion V1→V2).
- **Aucun `Math.random`** → **invisible au simulateur** `sim-difficulty.js` →
  0 dérive de win-rate par construction (pas besoin de sim par Maison).
- **Aucune** cellule fonctionnelle / butin / stat / spawn touché.
- Surfaçage : `movement.js` à l'entrée de salle (one-shot par coordonnée via
  `_housePoiSeen`), texte `addMsg('👁️ …')`.
- Repli : flag `houseGenBiasEnabled` (state.js, défaut true, non sérialisé).

## Étapes
1. [x] `HOUSE_PERCEPTION` (4 pools) + `housePerceptionLine` pur (floor-ambiance.js).
2. [x] Flag `houseGenBiasEnabled` + `_housePoiSeen` (state.js).
3. [x] Surfaçage one-shot à l'entrée de salle (movement.js).
4. [x] MANIFEST loader (HOUSE_PERCEPTION + housePerceptionLine, optional).
5. [x] Tests : `units.js` (déterminisme, taux, pools, null-safety) +
   `scenarioHouseGenBiasV2` (câblage navigateur, power-neutralité, distinction).
6. [x] **Preuve power-neutral** : `check_difficulty.js --base origin/master` → 0 dérive.
7. [x] cache-bump (floor-ambiance v13, state v35, movement v37, loader v51,
   CACHE_VERSION v170).
8. [x] Doc : 10 §10.6 (levier perception livré), roadmap (ligne V2 + sign-off).
9. [ ] smoke + pwa + doc-modules verts → commit → PR → merge.

## Hors-scope (différé, assumé)
Levier **pondération de salles** (distribution des types de salle) : seul levier
qui pourrait toucher l'équité → reste gaté par un sim d'équilibrage neutre par
Maison (Item 3). Non livré ici.
