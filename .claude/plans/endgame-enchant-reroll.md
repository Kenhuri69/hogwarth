# Plan — Enchantement rerollable (gold-sink endgame)

> Source : `reliquats-backlog.md` item **1.3 — Piste D** (reroll
> d'enchantement, gold-sink endgame complémentaire au don Maison).
> Décision commanditaire (2026-06-21) : **modèle « affixe aléatoire
> rerollable »**.

## Problème / intention

La Forge des Ténèbres (`forge.js`) propose déjà un upgrade **déterministe**
(`upgradeLevel`, voies power/crit, coûts or + Essence + Primordiale) et la
dissolution d'items. Le don à la Maison (`house-donation.js`) est un gold-sink
**pur or → points**. Il manque un gold-sink **aléatoire** qui donne une raison
de dépenser l'or accumulé en endgame sur l'équipement : un **affixe
d'enchantement** tiré au sort, **re-tirable** contre or jusqu'à obtenir
l'affixe voulu.

## Principes

1. **Pur gold-sink** : coûte UNIQUEMENT de l'or (distinct de la Forge qui
   consomme des matériaux). Ne crée jamais d'or → ne peut pas gonfler l'éco.
2. **Endgame-gated par construction** : l'action vit dans la modale Forge
   (cellule `CELL.FORGE`, générée post-victoire aux étages 11/14/17/20). Aucun
   gate supplémentaire.
3. **Power-creep maîtrisé** : magnitudes d'affixe ≤ bonus d'un item rare ;
   valeur mise à l'échelle par rareté. Pas de monstre touché → **hors kit
   `sim-difficulty`** (l'affixe est de l'équipement choisi par le joueur, pas
   dans le baseline). Ladder inchangé.
4. **Surgical** : un seul champ neuf `item.enchant`, un hook **gardé** dans
   `recalculateStats`, le reste confiné à `forge.js`.
5. Plan vivant (§5) + smoke vert (§7) + cache-bump (§8).

## Spécification

### Donnée — `item.enchant`
```js
item.enchant = { key:'bonusCritChance', value:6, label:'% Crit', disp:'+6%' }
```
- Un seul affixe par item. Absent/`null` = pas d'enchantement.
- Sérialisé automatiquement (les items équipés passent par `JSON.stringify`
  dans `_serializeState`). **Aucune migration de save** (champ optionnel).

### Pool d'affixes — `ENCHANT_POOL` (forge.js)
| key | plage (base) | type |
|-----|--------------|------|
| bonusAtk / bonusDef / bonusMag / bonusLck | 1–3 | entier |
| bonusCritChance / bonusSpellCritChance | 3–8 | % |
| bonusDodgeChance | 2–6 | % |
| bonusCritDamage | 5–15 → /100 (0.05–0.15) | fraction |
| bonusFortune / bonusCelerite | 3–8 | points (entrent dans la courbe de Hill) |

Multiplicateur par rareté `ENCHANT_RARITY_MULT` : common/uncommon/rare ×1,
epic ×1.25, legendary ×1.5 (arrondi). → les items de grande rareté méritent
l'enchant.

### Coût — `ENCHANT_COSTS` (or pur, par rareté)
common 250 · uncommon 350 · rare 500 · epic 900 · legendary 1500 (défaut 500).
**Coût plat par (re)roll** : la dépense répétée (« reroll jusqu'au bon affixe »)
EST le sink. Pas d'escalade par item (simplicité).

### API (forge.js)
- `_enchantCost(item)` → or requis.
- `_rollEnchant(item)` → tire un affixe du pool × mult rareté.
- `enchantItemAtForge(charIdx, slot)` → vérifie l'or, débite, pose
  `item.enchant`, `recalculateStats()`, `updateUI()`, `openForge()` (refresh),
  `autoSave('forge-enchant')`.
- `_enchantTotals(equipped)` → agrège les affixes équipés en `{bonusAtk:…,
  bonusCritChance:…, …}` (clés du pool), pour `recalculateStats`.

### Intégration `recalculateStats` (inventory-core.js)
Hook **gardé** (`typeof _enchantTotals === 'function'`) : calcule
`const _ench = _enchantTotals(c.equipped)` une fois, puis l'ajoute aux
accumulateurs existants à chaque site :
- primaires : `c.atk/def/mag/lck += _ench.bonus*` (après la boucle primaire,
  AVANT D1/D2 & fortune/célérité qui lisent lck).
- dérivés : `critBonus/dodgeBonus/critDmgBonus/spellCritBonus += _ench.*`.
- `fortuneBonus += _ench.bonusFortune` · `celeriteBonus += _ench.bonusCelerite`.

`forge.js` charge APRÈS `inventory-core.js`, mais `recalculateStats` s'exécute
au runtime → le hook gardé trouve la fonction. Feature 100 % confinée si
`forge.js` absent (no-op).

### UI
- **Forge** (`openForge`) : chaque item équipé gagne une ligne « ✨ affixe
  courant » + un bouton « ✨ Enchanter / Re-enchanter (Xg) » (désactivé si or
  insuffisant). Disponible sur **tous** les items équipés (y compris les items
  à effet spécial non forgeables → leur donne enfin une upgrade).
- **Tooltip** (`_renderItemTooltip`) : ligne « ✨ Enchantement : … » si présent.
- CSS minimal `.forge-enchant-cur` / `.forge-enchant-btn` (style.css).

## Étapes & vérifications

1. [x] Plan rédigé (ce fichier).
2. [x] `forge.js` : pool, coûts, `_rollEnchant`, `_enchantCost`,
   `_enchantTotals`, `enchantItemAtForge` + UI dans `openForge`. (`node --check` OK)
3. [x] `inventory-core.js` : hook `_enchantTotals` dans `recalculateStats`
   (agrégat unique versé dans primaires + dérivés + fortune + célérité).
4. [x] `ui-character-sheet.js` : ligne enchant dans `_renderItemTooltip`.
5. [x] CSS `.forge-enchant-*` + `.forge-item-actions` (style.css).
6. [x] MANIFEST loader : `enchantItemAtForge`.
7. [x] Unités (`tests/units.js`) : section N — 877 assertions (coûts, roll borné
   au pool, fraction critDamage, agrégat, garde clé hors-pool).
8. [x] Smoke `scenarioForgeEnchant` (inventory.js) : crit dérivé, débit = coût,
   refus si or insuffisant, round-trip de save.
9. [~] `node tests/smoke.js` complet (en cours).
10. [x] cache-bump (forge v6, inventory-core v9, ui-character-sheet v10,
    loader v54, style.css v46, CACHE v186) + `check_cache_versions` OK.
11. [ ] commit → push → PR.

## Hors-scope (assumé)
- **Piste C** (forge d'amélioration d'équipement légendaire) : la Forge fait
  déjà l'upgrade déterministe ; Piste C resterait un chantier séparé.
- Affixes regen/PV-max/PM-max : exclus du pool (déjà couverts par items/forge ;
  éviteraient un edit de `applyEquipmentRegen`).
- Escalade de coût par item, multi-affixes : non retenus (simplicité).

## Journal
- 2026-06-21 : plan rédigé. Décision « affixe aléatoire rerollable ».
