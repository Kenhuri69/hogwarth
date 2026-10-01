# 2.5b — Éveil d'artefact (`revue-design-progression-2026-07.md` §5.3)

Reporté du Lot 2 au Lot 3 parce qu'il coûte des Marques de Traque (livrées par
PR #757). Dernière pièce du Lot 3.

## Conception

- **Où** : section « 🏺 Éveil d'artefact » de la Forge (cellule CELL.FORGE,
  étages 11+). Concerne tout item équipé porteur d'`activeEffect`.
- **État** : `item.awakenRank` (0-3) sur l'objet équipé, donc sérialisé avec
  l'équipement (même mécanisme que `upgradeLevel`).
- **Effets** (helper PUR `artifactAwakened(art, rank)` → copie de l'effet) :
  - rang 1 : +1 charge par combat ;
  - rang 2 : puissance +50 % (bouclier : +1 tour ; entaille plafonnée à 0,5) ;
    ⚠️ `purgeStatus` n'a pas de puissance : au rang 2, il soigne 10 % des PV ;
  - rang 3 : effet secondaire mineur. ⚠️ Écart : défini **par résolveur**
    (`ARTIFACT_AWAKEN_SECONDARY`), pas par artefact — les artefacts d'un même
    résolveur partagent leur effet, une table par objet doublerait les données
    sans gain de jeu :
    - `elemBurst` : éclaboussure de 30 % sur les autres ennemis ;
    - `purgeStatus` : +1 palier de Garde à chaque héros ;
    - `shieldGroup` : rend 10 % des PM ;
    - `hasteGroup` : rend 10 % des PM ;
    - `sapDefense` : ATK de la cible −10 % ;
    - `succorGroup` : dissipe les altérations du groupe.
- **Coût** (`ARTIFACT_AWAKEN_COSTS`) : rang 1 = 4 🏹 + 1 🔮, rang 2 = 8 🏹 +
  1 🔮, rang 3 = 12 🏹 + 2 🔮 (Marques de Traque + Essence Primordiale).
- **Aucune simulation** : `tools/sim-difficulty.js` ne modélise pas les
  artefacts actifs (seulement leurs stats passives via `--artifacts`). Effet
  borné : 1 action par combat, rendue plus forte ou doublée.

## Étapes

1. [x] Plan (ce fichier).
2. [x] Helpers purs + coût + `awakenArtifactAtForge` (forge.js) ; section UI.
3. [x] Combat : charges et effet éveillés, secondaires (battle.js).
4. [x] Tests : units §30, smoke `scenarioArtifactAwaken`.
5. [x] Loader, CLAUDE.md, cache-bump, suite complète, push, PR.

## Journal

- 2026-09-30 — Plan créé (PR #757 fusionnée ; branche remise à zéro).
- 2026-09-30 — Implémenté tel que conçu. Tests : units §30 (1508 ✅), smoke
  `scenarioArtifactAwaken` (2 étapes ✅), suite complète 295 ✅, pwa-smoke ✅.
  Loader 416 ; cache 4 JS, `CACHE_VERSION` 284. Le Lot 3 est clos ; suite :
  Lot 4 (arbre « Éveil du Sorcier »).
