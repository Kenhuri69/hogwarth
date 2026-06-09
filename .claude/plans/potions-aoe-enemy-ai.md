# Plan — Potions multi-cibles (AOE) & usage de potions par l'IA ennemie

**Branche :** `claude/potions-aoe-enemy-ai`
**Origine :** `reliquats-backlog.md` §1.1 (P2), source `_archive/potions-enrichment.md` (P6).
**Nature :** gameplay (data.js / battle.js / battle-spells.js / inventory.js /
monsters.js). Bump cache PWA.

## Objectif

1. **Potions offensives AOE** (joueur) : un flacon lancé peut frapper **tout le
   groupe ennemi** (flag `aoe:true`), en réutilisant la résolution de dégâts
   existante `_thrownPotionDamage` (resist/weak par cible, comme le splash de
   Bombarda).
2. **Usage de potions par l'IA** : quelques monstres « humains » (Mangemorts)
   **boivent une potion de soin** en plein combat — réserve limitée, usage
   opportuniste (seulement quand entamés).

## Conception

### A. Potion AOE (joueur)
- `data.js` : nouvel item `flacon_grec` (Feu Grégeois) — `effect:"throw",
  element:"feu", power:16, aoe:true`. Power/cible < flacon mono (24) car frappe
  plusieurs. Ajout à `SHOP_ITEMS`.
- `inventory.js` (`useItem`, branche `effect:'throw'`) : si `item.aoe`, **pas de
  sélection de cible** → `throwItemAtEnemy(idx, -1)`.
- `battle.js` (`throwItemAtEnemy`) : si `item.aoe` → délègue à `_throwItemAoe`,
  qui applique `_thrownPotionDamage` + statut éventuel à **chaque** ennemi vivant,
  consomme l'item, log groupé, puis `advanceBattleChar`. Sinon, comportement
  mono-cible inchangé.

### B. Potion ennemie (IA)
- `battle-spells.js` :
  - `tryEnemyConsumable(enemy, ability, appendLog)` — réserve `enemy._potionsLeft`
    (lazy-init = `ability.uses` ou 2 ; transient combat, non sérialisé) ; **ne boit
    que si `< 60 % PV`** et qu'il reste des potions ; soigne `ability.power`, log +
    `floatDmg heal`. Retourne `false` sinon (→ attaque normale).
  - `case 'consumable'` dans `tryEnemyAbility` : `if (!tryEnemyConsumable(...)) return false;`.
  - Priorité `healPotionReady` (comme `enrageReady`) : un ennemi **entamé** dont
    la potion a « fired » la boit même en IA `aggressive`.
- `monsters.js` : ability `consumable` (potion de soin) sur `mangemort` et
  `mangemort_elite` (cohérent : ils droppent déjà des potions).

> **Hors-scope V1** : potions ennemies de **buff** (atk/def) — `tryEnemyConsumable`
> ne gère que `potion:"heal"` ; les variantes buff sont notées pour plus tard
> (éviter d'inventer une mécanique de buff de stats ennemies fragile).

## Étapes & vérifications
1. [x] Plan (ce fichier).
2. [x] `data.js` : `flacon_grec` (aoe) + SHOP_ITEMS.
3. [x] `inventory.js` : branche aoe (pas de cible).
4. [x] `battle.js` : `_throwItemAoe` + garde aoe dans `throwItemAtEnemy`.
5. [x] `battle-spells.js` : `tryEnemyConsumable` + `case 'consumable'` + priorité.
6. [x] `monsters.js` : ability potion sur mangemort(s).
7. [x] `tests/smoke.js` `scenarioPotionAoe` : flacon AOE touche tout le groupe ;
   Mangemort entamé boit une potion (log + heal + réserve qui s'épuise).
8. [x] Cache PWA bumpé.
9. [x] DoD : units, smoke, check_cache_versions, pwa-smoke verts ; commit + push ; PR + merge.

## Journal des écarts

### Implémentation (2026-06-09, branche claude/potions-aoe-enemy-ai)
Livré conforme. A : `flacon_grec` (aoe) + branche `useItem` sans cible +
`_throwItemAoe` (réutilise `_thrownPotionDamage`). B : `tryEnemyConsumable`
(soin, réserve limitée, usage opportuniste <60% PV) + `case 'consumable'` +
priorité `healPotionReady` ; porté par `mangemort` (22 PV ×2) et
`mangemort_elite` (34 PV ×2). Buff ennemi = hors-scope V1 (noté).
`scenarioPotionAoe` (potions.js) couvre AOE 3 cibles + cycle potion ennemie
(soin/réserve épuisée/PV hauts). CACHE_VERSION v90, 5 assets bumpés.
