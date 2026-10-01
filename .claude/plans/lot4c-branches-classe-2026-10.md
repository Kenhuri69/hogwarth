# Lot 4 (c) — Branches de classe et actifs de combat (4.5)

Revue `revue-design-progression-2026-07.md` §6.3, étape 4.5. S'appuie sur le
socle de l'arbre (PR #760, 4.3/4.4). Reste ensuite : onglet « Passifs actifs »,
4.7 (achat en Marques), 4.8 (sim).

## Conception (écarts ⚠️)

- **Données** : `AWAKEN_TREE.classes[archétype]`, 10 nœuds par archétype, même
  gabarit de rangs que les Maisons (R1 3×1 pt, R2 3×1 pt dont l'actif,
  R3 3×2 pts, capital 3 pts). Branche lue via `heroArchetype(c, idx)` (4.1).
- **Équité** : chaque branche de classe pèse 30, l'actif compte pour 2
  (`AWAKEN_ACTIVE_WEIGHT`) ; le capital porte `activePower: 0.5`
  (poids 8 par unité) qui renforce l'actif de 50 %.
- **Actifs** (1×/combat par héros, `awakenActiveUsed[idx]`, remis à zéro par
  `startBattle`, non sérialisé). Bouton conditionnel `#btn-awaken` (🌟)
  géré par `_refreshBattleActionButtons`. ⚠️ Tous à effet **immédiat**
  (pas d'état différé à brancher dans d'autres fonctions) :
  - ⚔️ Duelliste « Riposte assurée » : coup physique critique garanti sur le
    premier ennemi vivant + 1 palier de Garde.
  - 📘 Érudit « Surcharge » : décharge arcanique sur tous les ennemis,
    MAG × 1,2 chacun.
  - 🌑 Occultiste « Saignée » : `bleed` (MAG × 0,4, 3 tours) sur tous les
    ennemis, soigne 10 % des PV du lanceur.
  - 🛡️ Gardien « Interposition » : +2 paliers de Garde (cap 3) et Protego
    1 tour sur l'allié vivant (soi en Solo).
  - ✨ Enchanteur « Faveur » : soigne 20 % des PV de chaque héros vivant et
    dissipe ses altérations (sauf `regen`).
  Puissance × (1 + `activePower`).
- **UI** : la modale d'arbre affiche une 3ᵉ section « Branche <archétype> » ;
  l'actif est marqué 🌟.
- **Sim** : toujours reportée à 4.8 (le sim ne modélise pas les actions
  conditionnelles).

## Étapes

1. [x] Plan (ce fichier).
2. [x] Données classes + `AWAKEN_ACTIVES` + helpers (archétype en paramètre).
3. [x] Actif en combat : bouton, `triggerAwakenActive`, reset `startBattle`.
4. [x] UI de l'arbre : section de classe.
5. [x] Tests : units §32 étendu (équité classes, actif unique par classe) ;
   smoke `scenarioSkillTreeActives` (les 5 actifs en combat, 1×/combat).
6. [x] Loader, CLAUDE.md, cache-bump, suite complète, push, PR.

## Journal

- 2026-10-01 — Plan créé (PR #760 verte, non fusionnée : travail empilé sur la
  même branche).
- 2026-10-01 — Implémenté tel que conçu. Le scénario `scenarioSkillTree` voit
  désormais 28 nœuds (tronc + Maison + classe). Tests : units §32b (1547 ✅),
  smoke `scenarioSkillTreeActives` (5 actifs, 1×/combat, capital +50 % ✅),
  suite complète 298 ✅, pwa-smoke ✅ ; captures du bouton en combat
  (desktop + mobile). Loader 427 ; cache : `battle-ui` 15, `awaken-tree` 2,
  `battle` 53, `inventory-core` 15, `loader` 78, `CACHE_VERSION` 287.
  Suite : onglet « Passifs actifs », 4.7 (achat en Marques), 4.8 (sim).
