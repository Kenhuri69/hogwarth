# Potions multi-cibles (AOE) & usage de potions par les ennemis

Reliquat **§1.1** de `reliquats-backlog.md` (P2). Source : `_archive/potions-enrichment.md`.

## Objectif
- (A) Potions offensives **AOE** : touchent tout le groupe ennemi.
- (B) **Usage de potions par les ennemis** (soin à charges limitées, côté IA).
Réutiliser l'existant (mécanique `throw` P6.c, système de capacités ennemies),
zéro nouvel asset lourd.

## Implémentation
### A — Flacons à dispersion (`item.aoe`)
- `data.js` : 2 items `effect:"throw", aoe:true` — `flacon_deflagration` (feu 16,
  zone) et `flacon_brume_toxique` (6 + poison 4/4, zone).
- `inventory.js` (`useItem` branche throw) : si `item.aoe` → `throwItemAoe(idx)`
  (pas de ciblage).
- `battle.js` : `throwItemAoe(invIdx)` — applique `_thrownPotionDamage` + statut
  à chaque ennemi vivant, consomme, log, avance le tour.
- `shop.js` : vente (minFloor 5/6). `item-icons.js` : icônes SVG (`_potionSvg`).

### B — Potion ennemie (`effect:"consumable"`)
- `battle-spells.js` : `case 'consumable'` dans `tryEnemyAbility` — soin (`power`)
  + buff optionnel (`buffAtk`), **charges par instance** (`enemy._potions[key]`,
  helpers `_enemyPotionLeft`/`_enemyPotionConsume`, combat-scoped). Gate dans le
  filtre `fired` (consommable épuisé ne tire plus) + priorité quand `lowHp`.
- `monsters.js` : `mangemort` (Mangemort Masqué, sans heal) reçoit « Potion de
  Régénération » (power 16, charges 1).

## Vérification
- Smoke `scenarioPotionAoeAndEnemyUse` (potions.js) : T1 données AOE, T2
  throwItemAoe touche les 3 ennemis + consomme, T3 Mangemort en danger boit
  (soin + charge→0) puis ne reboit plus. ✅
- Full smoke + units + pwa verts. Cache PWA bumpé.

## Journal
- ✅ Livré. A + B implémentés, scénario smoke dédié vert.
