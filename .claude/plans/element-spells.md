# Nouveaux sorts élémentaires + statut gel

> Prérequis : `elemental-system.md` (champ `spell.element`, re-tag des
> 50 monstres) doit être implémenté **avant** ce lot.

## Sorts à ajouter (3)

| Sort | element | effect (routage) | power | cost | Statut |
|------|---------|------------------|-------|------|--------|
| **Glacius** | glace | stun | 14 | 8 | applique `gel` (proba) |
| **Fulgari** | foudre | stun | 16 | 9 | — (dégâts purs) |
| **Lumos Solem** | lumière | burn | 16 | 10 | bonus vs morts-vivants |

- `effect` n'est qu'une clé de routage vers `_spellElementalDamage` après
  la refonte élémentaire ; `element` porte la faiblesse/résistance.
- Fulgari : nom inventé (pas de sort canon de foudre offensif).
- Lumos Solem : sort canon (lumière solaire). Anti-mort-vivant.

### Lumos Solem — bonus anti-mort-vivant

Champ `spell.bonusVsUndead: 1.5`. Dans `_spellElementalDamage`, si la
cible est un mort-vivant, dégâts × 1.5 (cumulable avec faiblesse lumière).
Ensemble mort-vivant = `category === 'fantôme'` OU id ∈ { inferius,
detraqueur, dementor_garde, vampire_mineur, strigoi, chauve_souris_vampire,
poupee_maudite }.

## Statut `gel`

Suit le patron de `weaken` (debuff de stat restauré à l'expiration) mais
sur l'**AGI** : la cible gelée perd `power` AGI pendant N tours → baisse
son esquive et son crit de sort. Restauration auto via `tickStatuses`.

- `STATUS_DEFS.gel = { icon:'❄️', label:'Gelé', kind:'debuff', stat:'agi' }`.
- `applyStatus(enemy, 'gel', power, turns)` depuis Glacius.
- `STATUS_BY_SPELL['Glacius'] = 'gel'`.

## Apprentissage : 3 spellbooks

Chaque sort est enseigné par un livre (`type:"spellbook"`, champ `spell`).

| Item id | Nom | Sort | Dispo |
|---------|-----|------|-------|
| `livre_glacius` | Givre & Engelures | Glacius | Boutique ét. 3, coffre ≥ 3 |
| `livre_fulgari` | Foudre Canalisée | Fulgari | Boutique ét. 5, coffre ≥ 4 |
| `livre_lumos_solem` | Lumière Solaire | Lumos Solem | Coffre ≥ 5 |

## Icônes PNG

### Icône de sort (3)
Générateur Python procédural par sort (modèle `gen_teleportation_icon.py`),
128×128 RGBA, → `img/icons/spells/<slug>.png`. Référencé dans
`SPELL_ICON_REGISTRY` (`item-icons.js`).

### Icône de livre (3)
SVG d'un grimoire portant le logo/glyphe du sort, rendu en PNG via
`icon_factory.py` (recette `spellbook` + accent `symbol`) →
`img/icons_new/<id>_*.png`. Référencé dans `ITEM_ICON_NEW_REGISTRY`.

## Étapes

1. `data.js` — 3 sorts dans `SPELLS` (+`element`, +`bonusVsUndead` pour
   Lumos Solem) ; 3 livres dans `ITEMS`.
2. `battle-spells.js` — `STATUS_BY_SPELL['Glacius']='gel'` ; bonus
   anti-mort-vivant dans `_spellElementalDamage`.
3. `state.js` / `battle.js` — `STATUS_DEFS.gel` + tick (patron `weaken`).
4. `shop.js` — 3 livres au catalogue progressif.
5. Générateurs PNG sorts (3 scripts Python) → `img/icons/spells/`.
6. Recettes `icon_factory.py` pour les 3 livres → `img/icons_new/`.
7. `item-icons.js` — `SPELL_ICON_REGISTRY` + `ITEM_ICON_NEW_REGISTRY`.
8. `tests/smoke.js` — scénario sorts élémentaires + gel.
9. `CLAUDE.md` — doc sorts, statut gel, table spellbooks.

## Décisions

- `gel` implémenté comme **DoT de froid** (4ᵉ DoT, patron burn/poison/
  bleed) et non comme debuff AGI : plus simple (zéro nouvelle logique de
  tick) et l'AGI ennemie a peu d'effet en jeu — un debuff serait sans
  impact.
- Logos de livre : ajout des glyphes `snowflake` + `sun` à
  `_SYMBOL_PATHS` (`lightning` existait déjà) pour que la couverture
  porte le vrai emblème du sort.

## Suivi

- [x] Étape 1 — sorts + livres dans data.js
- [x] Étape 2 — handler (gel via STATUS_BY_SPELL, bonus mort-vivant)
- [x] Étape 3 — statut gel (DoT)
- [x] Étape 4 — boutique (glacius ét.3, fulgari ét.5) + coffre lumos_solem ét.5
- [x] Étape 5 — PNG sorts (`gen_element_spell_icons.py`)
- [x] Étape 6 — PNG livres (recettes `icon_factory.py`)
- [x] Étape 7 — registres d'icônes (SPELL + ITEM_ICON_NEW + legacy)
- [x] Étape 8 — smoke `scenarioElementSpells`
- [x] Étape 9 — doc CLAUDE.md
- [x] `node tests/smoke.js` vert
