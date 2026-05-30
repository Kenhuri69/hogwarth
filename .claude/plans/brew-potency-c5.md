# LOT C.5 — Brassage maison (petit bonus optionnel)

> Branche : `claude/grimoire-reconnect-c5` (depuis `master` à jour).
> Issu de `.claude/plans/game-features-review.md` §3 LOT C (C5) / audit F7.

## Constat (préalable)
L'audit F7 (« Pages de Grimoire / brassage = flavour inerte ») est **obsolète** :
le sprint endgame a déjà reconnecté les deux systèmes —
- Pages de Grimoire : quête chaînée Manon (`manon_revelio` → `manon_grimoire`),
  collecte via Revelio, **fusion → grimoire « Tempête de Givre »** ; le matériau
  `page_grimoire` alimente la Bibliothèque.
- Brassage : déverrouillé par `quest_potions_slughorn`, herbes → chaudron
  (jet INT, crit ×2) → potions. Boucle complète, persistée, testée.

Aucune « reconnexion » n'est donc nécessaire. Sur décision utilisateur, on
ajoute à la place un **petit bonus optionnel** qui renforce la boucle de
brassage face à l'achat en boutique.

## Objectif
**Brassage maison** : une potion issue du chaudron (flag `brewed:true`)
restaure `BREW_POTENCY_BONUS` (+25 %) de plus qu'une potion achetée, sur les
effets chiffrés (`heal` / `restore_sp` / `both`). Les achats restent au taux
de base → incitation à brasser.

## Étapes
- [x] `tryAddItem(item, { props })` — fusionne des champs additionnels dans la
  copie poussée (générique, rétro-compatible). inventory-core.js.
- [x] `attemptBrew()` tague les potions produites : `props:{ brewed:true }`. potions.js.
- [x] `BREW_POTENCY_BONUS = 0.25` (potions.js, exporté implicitement au scope global).
- [x] `_applyConsumableEffect` (inventory.js) majore `heal`/`restore_sp`/`both`
  de `brewMult` quand `item.brewed`. Lecture défensive de `BREW_POTENCY_BONUS`
  (fallback 0.25). Effets « full » inchangés (déjà 100 %).
- [x] Feedback : note de potency au résultat de brassage + en-tête « Recettes
  connues » (potions.js) + ligne tooltip d'item (ui-character-sheet.js).
  CSS `.brew-potency-note` (style.css).
- [x] PWA : inventory-core v2→3, inventory v9→10, potions v1→2,
  ui-character-sheet v1→2, style.css v25→26 ; CACHE_VERSION v26→v27.
- [x] Smoke `scenarioBrewing` T8 : flag `brewed` posé, potion brassée soigne
  +25 % vs achetée, tooltip mentionne le brassage maison. Suite **126/126**
  + pwa v27.

## Compat saves
Le flag `brewed` voyage avec l'item dans `player.inventory` (sérialisé tel
quel). **Aucune migration** : une potion d'un save antérieur (sans flag) =
potion normale. Une potion de boutique n'a jamais le flag.

## Journal
| Date | Note |
|------|------|
| 2026-05-30 | Audit : F7 obsolète. Décision util. : petit bonus optionnel. Implémenté + testé (126/126 + pwa v27). |
