# Sorts de zone (AoE) — un mode par élément + soin de groupe

## Contexte

Suite à Bombarda (feu — éclaboussure), revue des 6 éléments : seul le feu
a une AoE. On ajoute **6 sorts** : un par élément manquant (glace, foudre,
lumière, ténèbres, physique), chacun avec un **mode d'AoE distinct**, plus
un sort de **soin de groupe**.

## Les 6 sorts

| Sort | Élément | Mode | `effect` | cost | power | Mécanique |
|------|---------|------|----------|------|-------|-----------|
| Glacius Tempête | glace | nappe | `aoe_field` | 16 | 12 | dégâts `power+mag/3` à tous + `gel` à tous |
| Fulgur Catena | foudre | chaîne | `aoe_chain` | 15 | 18 | `power+mag/2`, ×0,65 par ennemi suivant |
| Lux Aeterna | lumière | vague | `aoe_wave` | 17 | 15 | `power+mag/2` égal à tous, ×1,5 morts-vivants |
| Nox Vorax | ténèbres | drain | `aoe_drain` | 18 | 14 | `power+mag/2` à tous ; lanceur soigné de Σ/2 |
| Diffindo Maxima | physique | fauchage | `aoe_cleave` | 14 | 18 | cible pleine + voisins (index ±1) ×0,6 |
| Vulnera Sanentur | — | soin groupe | `heal_aoe` | 16 | 22 | soin burst `healAmount` à tous les alliés |

Règles d'équité communes (héritées de Bombarda) : les dégâts AoE **ne
crittent pas**, ne déclenchent **ni Élan ni vol de vie** de Maison. Chaque
cible applique quand même ses resist/weak élémentaires.

## Étapes

1. ✅ `js/data.js` — 6 entrées `SPELLS` ; `spellCategory` : `heal_aoe` → soutien.
2. ✅ `js/battle-spells.js` — helper `_aoeHit()` + 6 handlers + entrées
   `SPELL_HANDLERS` + cas `spellEffectPreview`.
3. ✅ `js/inventory.js` — `openBattleSpells` : `aoe_cleave` ajouté à `needsTarget`.
4. ✅ `js/data.js` + `js/shop.js` — 6 livres `spellbook` + `SHOP_CATALOG` (étages 6-9).
5. ✅ `js/item-icons.js` — 6 entrées `SPELL_ICON_REGISTRY` + 6 `ITEM_ICON_REGISTRY`
   (icônes legacy reprises — exigé par les scénarios 20/21 du smoke test).
6. ✅ `tests/smoke.js` — `scenarioAoeSpells` (6 sorts). Suite complète verte.

## Hors-scope

- Cast hors combat de Vulnera Sanentur (`isOutOfCombatSpell` ne couvre
  que teleport/heal) — combat uniquement, suivi possible.
- Icônes PNG dédiées (fallback emoji `icon` suffisant).
- Drops en coffre — acquisition par boutique seulement.
