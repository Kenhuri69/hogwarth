# Stacking des consommables identiques

## Objectif

Regrouper les consommables identiques en une seule case d'inventaire portant
un compteur de quantité (`×N`), au lieu d'occuper une case par exemplaire.
Cible : alléger la pression sur le sac 16 cases sans toucher à l'équipement
(qui reste 1 case par pièce, chaque pièce ayant un état propre : upgrade, set…).

## Décisions de périmètre

- **Stackables** : uniquement `type === 'consumable'` (demande utilisateur).
  Matériaux, objets de quête, livres de sort, équipement → restent 1/case.
- **Signature de stack** : `id` + état de brassage (`brewPotency` / `brewed`).
  Deux potions de même `id` non brassées fusionnent ; une potion brassée
  (potency spécifique) ne fusionne qu'avec une potion brassée identique.
- **Cap 16** : compte désormais les **cases** (stacks), pas les exemplaires.
  Un stack de 99 potions = 1 case. Ajouter un exemplaire d'un consommable
  déjà présent réussit même sac « plein » (16 stacks) car aucune case neuve.
- **Interaction quêtes / ingrédients** : `mandragore`, `choco_sorcier`… sont
  des consommables ET des cibles de quête/ingrédient. Les compteurs et
  consommations par `id` doivent sommer/décrémenter `qty`, sinon le stacking
  casse ces flux. → on rend ces helpers `qty`-aware.

## Modèle de données

Chaque entrée d'inventaire stackable gagne un champ `qty` (entier ≥ 1).
Une entrée sans `qty` ⇒ quantité 1 (rétrocompat saves). `qty` est un champ
plain sérialisé automatiquement (l'inventaire fait partie de `player`).

## Helpers centralisés (js/inventory-core.js)

- `_itemQty(e)` → `e.qty || 1`
- `_isStackable(item)` → `item.type === 'consumable'`
- `_stackKey(item)` → `id|brewPotency|brewed`
- `_addItemToBag(item)` → fusionne si stack compatible, sinon push (respecte cap)
- `_canAddItem(item)` → true si fusion possible OU `length < MAX`
- `_consumeAt(idx, n=1)` → décrémente `qty` à l'index, splice si épuisé
- `_countItems(id)` → somme des `qty` matchant `id`
- `_consumeItems(id, n)` → retire `n` exemplaires répartis sur les stacks
- `_consolidateInventoryStacks()` → fusionne les doublons (migration save)

## Étapes

1. **Helpers core** (`inventory-core.js`) → vérif : helpers définis, `tryAddItem`
   route via `_addItemToBag`. ✅
2. **Rendu badge `×N`** : `renderInventory` (inventory.js) + `_renderInvSlot`
   (ui-character-sheet.js) → vérif : un stack qty>1 affiche `×N`. ✅
3. **Consommation `qty`-aware** : `useItem`, `useItemFromChar`,
   `_applyPermaToChar`, `_applyStatBoost` (inventory.js) ; auto-revive Phénix
   (battle.js) → vérif : consommer 1 exemplaire décrémente sans vider le stack. ✅
4. **Quêtes** (`quests.js`) : comptage (×2 sites) + consommation `filter` →
   `_countItems` / `_consumeItems` → vérif : quête mandragore ×3 dans 1 stack
   se complète et consomme la bonne quantité. ✅
5. **Achat / vente / cadeau / ingrédients** : `_purchase` (shop.js) via
   `_addItemToBag` + garde `_canAddItem` ; **`sellItem` vend à l'unité**
   (décrément du stack, sinon on splice tout en ne payant qu'1) + affichage
   `×N` dans la grille de vente ; gifting (multiplayer-social.js) décrémente 1
   et n'envoie qu'un exemplaire (`qty` retiré du snapshot) ; ingrédients
   non-herbe (potions.js) `qty`-aware → vérif : achats successifs empilent. ✅
6. **Migration save** : `_consolidateInventoryStacks()` appelé dans
   `_applyState` avant `recalculateStats` → vérif : save legacy avec 3 potions
   séparées devient 1 stack ×3. ✅
7. **Smoke** : ajout `scenarioConsumableStacking` + mise à jour de
   `scenarioTryAddItem` (ITEMS[0]=potion_s fusionne désormais) →
   `node tests/smoke.js` vert (136 → 137 scénarios). ✅

## Écarts constatés / décisions

- **`sellItem` (shop.js)** : non listé au plan initial mais découvert au
  review — vendre un stack splice-ait tout en ne créditant qu'un exemplaire.
  Corrigé en vente à l'unité.
- **Périmètre confirmé consommables uniquement** : matériaux/quête/équipement
  restent 1/case. Les compteurs par `id` (quêtes, ingrédients) sont rendus
  `qty`-aware car des consommables (`mandragore`, `choco_sorcier`) sont aussi
  cibles de quête/ingrédient.
- **Cap 16** : compte les cases ; un consommable déjà possédé s'ajoute même
  sac plein (fusion sans case neuve) — gain UX voulu.

## Vérification finale

`node tests/smoke.js` vert (137 scénarios, dont `ConsumableStacking`).
