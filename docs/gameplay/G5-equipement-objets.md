# G5 — Équipement & objets

**Statut :** 🟩 à jour — couvre les systèmes récents (relecture design en continu)

> 📊 **Statut réel (code)** : ✅ 11 slots, raretés, sorts d'équipement, concoction
> de potions, Forge/Bibliothèque — modules : `js/inventory-core.js`, `js/inventory.js`,
> `js/item-icons.js`, `js/potions.js`, `js/data.js` (`ITEMS`), `js/forge.js`, `js/library.js`.
> Référence technique : [`CLAUDE.md`](../../CLAUDE.md).

> Objectif du chapitre : décrire le **système d'équipement complet** —
> les 11 slots, le flux d'équipement, les effets passifs, les raretés,
> les sorts d'équipement, les consommables, les livres de sorts, les sets
> de Maison et la Forge des Ténèbres.

---

## Vue d'ensemble

✅ (dans le jeu) Le jeu distingue deux couches de possession d'objets :

- **L'inventaire partagé** (`player.inventory`) — sac commun au groupe,
  limité à **16 cases** (constante `INVENTORY_MAX = 16`, `inventory-core.js`).
  Les consommables, matériaux et objets de quête **s'empilent** (`qty`) dans
  une même case ; les équipements et livres de sorts occupent chacun une case.
  Si le sac est plein mais qu'un consommable identique est déjà présent, la
  fusion se fait quand même (un stack peut grossir sans ouvrir de nouvelle case).

- **L'équipement par personnage** (`c.equipped`) — 11 slots indépendants par
  héros. Les pièces équipées **ne comptent pas** dans les 16 cases de sac.

Le fait que l'or (`player.gold`) et l'inventaire soient partagés entre Harry
et Hermione simplifie l'économie : un seul compte en banque, un seul sac, deux
sets d'armure distincts.

---

## Fonctionnement

### Les 11 slots d'équipement

✅ (dans le jeu — `state.js + inventory.js`) Chaque personnage possède une
structure `c.equipped` avec les 11 clés suivantes :

| Slot | Libellé | Items représentatifs (data.js) |
|------|---------|-------------------------------|
| `wand` | Baguette / arme | `wand1` Baguette de Saule (common, ATK+2), `wand2` Baguette de Sureau (rare, ATK+5 MAG+3 Crit+2%), `sword_gryff` Épée de Gryffondor (legendary, ATK+8) |
| `head` | Tête (chapeau, diadème, casque) | `chapeau_apprenti` (common, MAG+1 DEF+1), `chapeau_pointu` (rare, MAG+3 INT+3), `diademe_serdaigle` (legendary, MAG+4 LCK+5) |
| `body` | Corps (robe, armure, pectoral) | `robe1` Robe Renforcée (common, DEF+3), `armure_lourde` (rare, DEF+6 AGI-3), `coupe_poufsouffle` (legendary, DEF+6) |
| `hands` | Mains (gants, gantelets) | `gants_apprenti` (common, ATK+1 DEF+1), `gants_duelliste` (rare, ATK+2 AGI+1) |
| `feet` | Pieds (bottes, sandales) | `bottes_apprenti` (common, DEF+1 AGI+1), `bottes_dragon` (rare, DEF+3 AGI+2 Esquive+3%) |
| `cloak` | Cape, manteau | `cape_voyageur` (common, DEF+2 AGI+2), `cape_invis` (epic, AGI+5 LCK+5 Esquive+5%) |
| `amulet` | Amulette, collier, pendentif | `amulette_protection` (common, DEF+3 MAG+1), `larmes_phenix` (epic, regenHp:3 Esquive+3%), `locket_slytherin` (legendary, MAG+6 LCK+3) |
| `ring1` | Anneau gauche | `anneau_argent` (common, LCK+2), `anneau_runique` (rare, MAG+2 LCK+2 Crit+3%) |
| `ring2` | Anneau droit | mêmes items que `ring1` — deux slots distincts |
| `belt` | Ceinture, baudrier | `ceinture_cuir` (common, DEF+2), `ceinture_alchimiste` (rare, DEF+1 LCK+3 Crit+2%) |
| `trinket` | Bibelot (balai, retourneur…) | `broom` (rare, fuite garantie), `retourneur_temps` (epic, AGI+3 LCK+2) |

> Les anneaux sont un cas particulier : le champ `slot` dans `data.js` vaut
> `"ring"` (sans suffixe). `_resolveSlotForItem()` (`inventory.js`) route
> automatiquement vers `ring1` si vide, puis `ring2`. Si les deux sont
> occupés, `ring1` est ciblé et un prompt de confirmation s'affiche.

### Flux d'équipement

✅ (dans le jeu — `inventory.js : useItem → showEquipMenu → equipItem`)

```
Clic sur un item équipable dans le sac
  └─ useItem(idx, battleMode)
       ├─ en combat (battleMode) : grisé, non cliquable
       └─ hors combat :
            └─ showEquipMenu(item, idx)
                 ├─ solo + item non-anneau : equipItem(idx, 0) directement
                 ├─ solo + anneau : prompt « anneau gauche / anneau droit »
                 └─ duo : prompt Harry / Hermione (+ choix gauche/droit si anneau)
                      └─ equipItem(inventoryIdx, charIdx[, targetSlot])
                           ├─ slot = _resolveSlotForItem(item, c)
                           ├─ c.equipped[slot] = { ...item }
                           ├─ ancienne pièce → retour en sac si place dispo
                           └─ recalculateStats()
```

- **En combat, les équipements sont grisés** et non cliquables. Seuls les
  consommables sont accessibles depuis l'inventaire en cours de bataille.
- Déséquiper une pièce (`unequipFromSlot`) la renvoie dans le sac si une
  case est disponible ; sinon le désquipement est refusé avec un message.
- Si l'item appartient à un **set de Maison**, le menu affiche un badge
  `Set du Lion (1/4)` pour aider à l'identification visuelle.

### recalculateStats() — reconstruction des stats effectives

✅ (dans le jeu — `inventory-core.js`) Doit être appelé après chaque
équipement **et** après chaque montée de niveau.

La logique est à sens unique : à chaque appel, on **repart des valeurs de
base** (`c._baseAtk`, `c._baseDef`, `c._baseMag`, `c._baseLck`, etc.) puis
on ajoute toutes les couches dans l'ordre suivant :

1. **Base** (`c._baseX`) — croît au level-up et à l'allocation de points.
2. **Équipement** — itère sur tous les slots présents dans `c.equipped` et
   accumule les `bonusAtk/Def/Mag/Lck/Str/Int/Agi/End`.
3. **Forge** — si un item a `upgradeLevel > 0`, sa voie Puissance ajoute
   `+upgradeLevel` à sa stat principale ; la voie Critique ajoute
   `+upgradeLevel × 2 %` de `critChance` (`FORGE_CRIT_PER_LEVEL`, `forge.js`).
4. **Buffs temporaires** — potions de buff actives (statuts `temp_buff`).
5. **Sets de Maison** — bonus 2/3/4 pièces (`HOUSE_SETS`, `state.js`).
6. **Set Ténèbres** — 2 items équipés : +10 crit +5 esquive ; 3 items :
   +15 crit +10 esquive (`TENEBRES_SET`, `data.js`).
7. **Set Voyageur** (Mondes Parallèles) — 2-5 pièces `family:'voyageur'`.
8. **Souvenirs cross-plan** — bonus passifs des souvenirs débloqués (Atelier).
9. **Conversions secondaires D1/D2** (appliquées en dernier, sur les stats finales) :
   - D1 : `mag += floor(int / 4)` (`INT_MAG_DIV = 4`, `data.js`)
   - D2 : `def += floor(end / 6)` (`END_DEF_DIV = 6`, `data.js`)
   - D2bis : `hpMax += 5 × max(0, end_effectif − end_base)` (`END_HP_PER = 5`)
10. **Stats dérivées** recalculées en bout de chaîne :
    - `critChance = min(40, 5 + lck×0.5) + équipement` (plafond absolu 100 %)
    - `spellCritChance = min(35, 5 + agi×0.4) + équipement`
    - `dodgeChance = 5 + agi×0.4 + équipement` (plafonné à 35 %)
    - `critMultiplier = min(2.5, 1.5 + Σ bonusCritDamage)`
    - `fortune` et `celerite` (courbes de Hill — voir G3)

> Cette architecture « base + couches additives, recalc complet à chaque
> changement » garantit qu'aucun bonus ne peut s'accumuler de façon
> parasite entre deux appels.

---

## Règles & valeurs

### Champs d'un item équipable

✅ (dans le jeu — `data.js`)

| Champ | Type | Rôle |
|-------|------|------|
| `id` / `name` / `icon` / `desc` | string | Identification et affichage |
| `type` | string | `"wand"` / `"armor"` / `"acc"` (legacy) ; n'influe plus sur le slot réel |
| `slot` | string | Destination canonique dans `c.equipped` (ex. `"head"`, `"ring"`, `"trinket"`) |
| `family` | string | Identifiant de famille pour les variantes (teintures, craft) |
| `rarity` | string | `"common"` / `"rare"` / `"epic"` / `"legendary"` — bordure colorée dans le sac |
| `tint` | string | CSS drop-shadow coloré pour les items de prestige |
| `bonusAtk/Def/Mag/Lck` | number | Bonus aux stats primaires |
| `bonusStr/Int/Agi/End` | number | Bonus aux stats secondaires |
| `bonusCritChance` | number | % de crit physique supplémentaire |
| `bonusSpellCritChance` | number | % de crit de sort supplémentaire |
| `bonusCritDamage` | number | Fraction ajoutée au multiplicateur de crit (ex. `0.20` → ×1.7) |
| `bonusSpellCritDamage` | number | Idem pour les sorts |
| `bonusDodgeChance` | number | % d'esquive supplémentaire |
| `bonusFortune` | number | Bonus à `x` dans la courbe Fortune (D5 LCK) |
| `bonusCelerite` | number | Bonus à `x` dans la courbe Célérité (D5 AGI) |
| `bonusCounterChance` | number | % de riposte sur Garde supplémentaire |
| `bonusHpMax` / `bonusSpMax` | number | Bonus direct aux PV/PM max (ex. `cor_pegasse` : PV max +8) |
| `grantsSpell` | string | Enseigne un sort **en permanence au groupe** à l'équipement |
| `regenHp` / `regenSp` | number | PV / PM régénérés par tour ennemi en combat |
| `setKey` / `setPiece` | string / int | Appartenance à un set de Maison (clé + numéro de pièce 1-4) |
| `price` | number | Prix en Gallions (0 = récompense non vendable) |
| `upgradeLevel` | number | Niveau Forge (0-5), ajouté par `forge.js` à l'équipement |

### Raretés

✅ (dans le jeu — `inventory.js`, classe CSS `rarity-*`)

| Rareté | Bordure | Politique buyback |
|--------|---------|-------------------|
| `common` | Gris-or | Vendable à la boutique, récupérable |
| `rare` | Bleu | Vendable |
| `epic` | Violet | Vendable |
| `legendary` | Or vif | Non vendable (récompenses de Maison, quêtes) ; `price:0` dans `data.js` |

### Effets passifs en combat : regen PV/PM

✅ (dans le jeu — `battle.js : applyEquipmentRegen`)

À **chaque tour ennemi**, après le tick des statuts persistants, chaque héros
vivant régénère la somme des `regenHp` / `regenSp` de toutes ses pièces
équipées :

- Plafonné par `hpMax`/`spMax`.
- Ignoré si le personnage est KO (`hp <= 0`).
- **Additif** : plusieurs sources se cumulent (ex. `larmes_phenix` regenHp:3 +
  `cendres_phenix` regenHp:4 = 7 PV/tour).
- Le bonus 3/3 du Set Ténèbres (`regenHp:2`) s'ajoute également via ce même
  mécanisme (géré dans `applyEquipmentRegen`, pas dans `recalculateStats`).

Exemples d'items portant une regen :

| Item | Slot | regenHp | regenSp |
|------|------|---------|---------|
| `larmes_phenix` (Larmes du Phénix) | `amulet` | 3 | — |
| `larme_phenix_mineure` | `amulet` | 2 | — |
| `cendres_phenix` (Set Ténèbres) | `amulet` | 4 | — |
| `cape_voldemort` (Set Ténèbres) | `cloak` | — | 1 |
| `coeur_lion` (Set du Lion 4/4) | `amulet` | — | 1 |
| `couronne_basilic` (Set du Serpent 4/4) | `head` | — | 1 |
| `oeil_aigle` (Set de l'Aigle 3/4) | `amulet` | — | 1 |
| `medaillon_helga` (Set du Blaireau 4/4) | `amulet` | 1 | — |

### sorts d'équipement (grantsSpell)

✅ (dans le jeu — `inventory.js : equipItem`, `recalculateStats` downstream)

Quand un item porte `grantsSpell:"NomDuSort"`, l'équipement appelle
`_teachSpellToAll` : le sort est ajouté à **tous les membres du groupe** de
façon permanente, si ce n'est pas déjà le cas. Aucun PM supplémentaire n'est
requis pour l'apprentissage — c'est l'item lui-même qui le confère.

Exemples :

| Item | Sort enseigné | Rarity |
|------|--------------|--------|
| `amulette` (Amulette du Phénix) | Reparo | epic |
| `anneau_resurrection` (Anneau de la Résurrection) | Reparo | epic |

> `grantsSpell` sur un équipement diffère de `learnSpellbook` : le livre de
> sort enseigne à **un seul** héros et est consommé ; l'item d'équipement
> enseigne **à tous** et reste équipé.

---

## Potions, consommables & herbes

### Consommables principaux

✅ (dans le jeu — `data.js : ITEMS`)

| ID | Nom | Effet | Prix |
|----|-----|-------|------|
| `potion_s` / `potion_soin_mineure` | Potion de Soin (Mineure) | +15 PV | 28-30 G |
| `potion_soin_mineure_plus` | Potion de Soin Mineure + | +30 PV | 55 G |
| `potion_soin_mineure_pp` | Potion de Soin Mineure ++ | +55 PV | 95 G |
| `potion_m` | Potion Magique | +12 PM | 25 G |
| `potion_l` | Grande Potion de Soin | +40 PV | 80 G |
| `potion_xl` | Élixir Suprême | Restaure 100 % PV | 200 G |
| `felix` | Félix Felicis | Buff Fortune 40 pas | 80 G |
| `mandragore` | Racine de Mandragore | +8 PV | 15 G |
| `choco_sorcier` | Chocolat aux Sorciers | +10 PV +5 PM | 20 G |
| `elixir_antidote` | Élixir d'Antidote | Purge brûlure/poison/saignement/engelures | 45 G |
| `elixir_regen` | Élixir de Régénération | +6 PV/tour pendant 4 tours | 55 G |
| `potion_resistance` | Potion de Résistance | -40 % dégâts subis, 3 tours | 50 G |
| `larme_phenix_pure` | Larme du Phénix Pure | Résurrection auto KO (passif) | 500 G |

**Félix Felicis (felix)** — n'est **pas** un soin. Son `effect:"fortune"`
arme `felixFortuneSteps = 40` : pendant 40 pas d'exploration, `FELIX_POINTS
= 40` s'ajoutent à `x` dans `partyFortune()`, dopant drops, or, fouille et
chance de fuite. Décrémenté par pas (`movement.js`).

**Potions de buff temporaire** (P2) — même moteur `temp_buff`, 3 tours :
`potion_force` (+8 ATK), `potion_defense` (+8 DEF), `elixir_celerite`
(+8 AGI), `potion_precision` (+8 LCK), `elixir_puissance` (+8 MAG).

**Flacons offensifs jetables** (P6.c) — lancés en combat sur un ennemi,
profitent des résist/faiblesse élémentaires mais sans scaling MAG ni crit de
sort : `flacon_feu` (24 dégâts feu), `flacon_givre` (15 glace + gel 3 tours),
`flacon_venin` (8 + poison 5/tour 4 tours).

### Herbes & besace d'herboriste

✅ (dans le jeu — `inventory-core.js : tryAddItem`, `player.herbs`)

Les herbes (`type:"herb"`) ne vont **pas** dans le sac de 16 cases : elles
sont routées vers `player.herbs` (map `id → quantité`, non plafonnée).
La besace est consultable dans l'onglet « Besace » de l'inventaire.
Les herbes servent d'ingrédients au **chaudron de Slughorn** (module potions).

| Tier | Exemples | Étage source |
|------|---------|-------------|
| 1 | Armoise, Ortie séchée | Fouille, drop |
| 2 | Asphodèle, Branchiflore | Étages moyens |
| 3 | Aconit, Dictame | Étages avancés |
| 4 | Asphodèle des Ténèbres | Boucle Ténébreuse (11+) |

### Matériaux d'upgrade (type material)

✅ (dans le jeu — `data.js`, `inventory-core.js : _countMaterial/_consumeMaterial`)

Deux matériaux endgame non utilisables directement (type `"material"`,
stockables et empilables dans le sac) :

| ID | Nom | Usage | Source |
|----|-----|-------|--------|
| `essence_tenebres` | Essence des Ténèbres | Forge des Ténèbres (upgrade items) | Drop monstres variant `darkness` (étage 11+) |
| `page_grimoire` | Page de Grimoire | Bibliothèque Interdite (upgrade sorts) | Drop monstres variant `darkness` (étage 11+) |
| `eclat_vitalite` | Éclat de Vitalité | Upgrade potions au chaudron (P4) | Boutique étage ≥ 3, coffres |

---

## Livres de sorts (type spellbook)

✅ (dans le jeu — `data.js + inventory.js : learnSpellbook/_teachSpellToOne`)

Un livre de sort (`type:"spellbook"`) s'utilise **hors combat** uniquement.

**Flux :**
- Solo : le sort va directement à Harry.
- Duo : `showLearnMenu()` présente Harry ou Hermione — **un seul** apprenant,
  au choix du joueur.
- Le livre est **consommé** (retiré du sac) après l'apprentissage.

Contrairement à `grantsSpell` d'un item d'équipement, le livre enseigne à
**un seul** personnage.

Catalogue complet (data.js) :

| ID | Titre | Sort enseigné | Prix | Disponibilité |
|----|-------|--------------|------|---------------|
| `livre_sortileges` | Sortilèges Standards, Vol.3 | Wingardium Leviosa | 150 G | Boutique, coffre ≥ étage 2 |
| `livre_soin` | Potions & Remèdes Magiques | Reparo | 110 G | Boutique, coffre ≥ étage 3 |
| `livre_ferula` | Manuel du Soigneur de Champ | Ferula | 180 G | Coffre étages 4-6 |
| `book_monsters` | Livre des Monstres | Diffindo | 0 G (quête Lockhart) | Coffre ≥ étage 3 |
| `livre_prince` | Manuel du Demi-Sang | Sectumsempra | 600 G | Coffre ≥ étage 6 (rare) |
| `livre_bombarda` | Traité de Magie Explosive | Bombarda | 490 G | Boutique avancée |
| `livre_patronum` | Guide du Patronus | Patronum | 350 G | Boutique |
| `livre_glacius` | Givre & Engelures | Glacius | 220 G | Boutique ≥ étage 3 |
| `livre_fulgari` | Foudre Canalisée | Fulgari | 310 G | Boutique ≥ étage 5 |
| `livre_lumos_solem` | Lumière Solaire | Lumos Solem | 440 G | Coffre ≥ étage 5 |
| `livre_sanguini` | Traité du Sang Vivant | Sanguini | 270 G | Boutique |
| `livre_vampyrus` | Codex des Strigoï | Vampyrus | 540 G | Boutique avancée |
| `livre_taranta` | Pas de la Sorcière Maudite | Tarantallegra | 130 G | Boutique |
| `livre_maledictus` | Grimoire des Maudits | Maledictus | 390 G | Boutique |
| `livre_crucio` | Sortilèges Impardonnables T.II | Crucio | 580 G | Rare |
| `livre_morsmordre` | Marque des Ténèbres | Morsmordre | 640 G | Rare |
| `livre_vulnera` | Chant des Guérisseurs | Vulnera Sanentur (AoE soin) | 700 G | Boutique avancée |
| `livre_diffindo_maxima` | L'Art de la Lame Large | Diffindo Maxima (AoE physique) | 760 G | Boutique avancée |
| `livre_glacius_tempete` | Tempête de Givre | Glacius Tempête (AoE glace) | 840 G | Boutique avancée |
| `livre_fulgur_catena` | Chaîne d'Éclairs | Fulgur Catena (AoE foudre) | 920 G | Boutique avancée |
| `livre_lux_aeterna` | Lumière Éternelle | Lux Aeterna (AoE lumière) | 1 050 G | Boutique avancée |
| `livre_nox_vorax` | Nuit Dévorante | Nox Vorax (AoE ténèbres drain) | 1 200 G | Boutique avancée |
| `livre_portus` | Traité de la Téléportation | Portus (téléportation) | 2 800 G | Boutique endgame |
| `grimoire_interdit` | Grimoire Interdit | Fiendfyre (35 dégâts + brûle) | 4 000 G | Endgame sink |

Les livres s'affichent avec l'étiquette violette 📖 dans l'inventaire
(`isSpellbook` dans `renderInventory`).

---

## Sets de Maison

✅ (dans le jeu — `state.js : HOUSE_SETS`, `inventory-core.js : recalculateStats`)

Chaque Maison dispose d'un **set de 4 pièces** distribuées progressivement
par le chef de Maison au fil des paliers. Les pièces peuvent toutes être
portées simultanément sur un personnage (chaque pièce occupe un slot distinct).

Les bonus de set sont **additifs** — s'accumulent avec les bonus individuels
des pièces :

| Set | Pièces | Bonus 2/4 | Bonus 3/4 | Bonus 4/4 |
|-----|--------|-----------|-----------|-----------|
| **Set du Lion** (Gryffondor) | `brassard_lion`, `heaume_vaillant`, `cape_godric`, `coeur_lion` | +1 ATK, Crit +3%, dég.crit +10% | +2 ATK, Crit +7%, dég.crit +15% | +4 ATK, Crit +12%, dég.crit +25%, **immunité désarmement** |
| **Set du Serpent** (Serpentard) | `anneau_serpent`, `pendentif_mamba`, `cape_sibylline`, `couronne_basilic` | +1 MAG/LCK, Crit sort +5%, dég.crit sort +10% | +2 MAG/LCK, Crit sort +5%, dég.crit sort +15% | +4 MAG, +2 LCK, Crit sort +10%, dég.crit sort +25%, **lifesteal +10%** |
| **Set de l'Aigle** (Serdaigle) | `plume_aigle`, `manteau_encre`, `oeil_aigle`, `anneau_savoir` | +1 MAG/INT, Crit sort +5%, dég.crit sort +10% | +2 MAG/INT, Crit sort +5%, dég.crit sort +15% | +4 MAG, +2 INT, Crit sort +10%, dég.crit sort +25%, **-10% coût sorts** |
| **Set du Blaireau** (Poufsouffle) | `ceinture_blaireau`, `cape_loyaute`, `coiffe_blaireau`, `medaillon_helga` | +1 DEF/END | +2 DEF, +1 END | +4 DEF, +2 END, **Vigueur** |

La pièce 4/4 de chaque set est de rareté **legendary**.

> Pour le détail des paliers de distribution (Apprenti Or → Maître Or →
> quête de Maison), voir **G4 — Maisons**.

### Set Ténèbres (endgame post-victoire)

✅ (dans le jeu — `data.js : TENEBRES_SET = ['cape_voldemort', 'cendres_phenix', 'oeil_basilic']`)

3 drops legendaries sur les monstres variant `darkness` (étages 11+) :

| Pièces équipées | Bonus |
|----------------|-------|
| 2/3 | Crit +10 %, Esquive +5 %, dég. crit ×1.15 |
| 3/3 | Crit +15 %, Esquive +10 %, dég. crit ×1.30, +2 PV/tour |

---

## Forge des Ténèbres

✅ (dans le jeu — `js/forge.js`, cellule `CELL.FORGE` générée aux étages 11/14/17/20)

La Forge permet d'**améliorer un item déjà équipé** jusqu'au niveau 5
(`FORGE_MAX_LEVEL = 5`). Deux voies verrouillées au premier upgrade :

- **Voie Puissance** (défaut) : `+upgradeLevel` sur la stat principale de
  l'item (la plus élevée parmi ATK/DEF/MAG/LCK).
- **Voie Critique** : `+upgradeLevel × 2 %` de crit physique (`FORGE_CRIT_PER_LEVEL`).

Coût en or + Essence des Ténèbres (consommé via `_consumeEssence`) :

| Niveau cible | Or | Essences |
|-------------|-----|---------|
| 1 | 80 G | 1 |
| 2 | 160 G | 2 |
| 3 | 320 G | 3 |
| 4 | 640 G | 5 |
| 5 | 1 280 G | 8 |

Les items `grantsSpell` et `regen` ne voient pas ces effets binaires altérés
par l'`upgradeLevel` (les bonus regen/sort restent fixes). L'upgrade est
appliqué dans `recalculateStats()` à chaque recalc.

La **Bibliothèque Interdite** (`CELL.LIBRARY`) fonctionne sur le même modèle
mais consomme des Pages de Grimoire pour améliorer des sorts (hors scope de
ce chapitre — voir G6).

---

## Pipeline d'icônes (mention)

✅ (dans le jeu — `js/item-icons.js : getItemIconHtml`)

Le champ `icon` (emoji) de `data.js` est un fallback texte. En runtime,
`getItemIconHtml(item, size)` résout l'icône dans l'ordre :

1. `ITEM_ICON_NEW_REGISTRY[id]` → PNG painterly 5 tailles (`img/icons_new/`).
2. `ITEM_ICON_REGISTRY[id]` → PNG legacy (`img/icons/items/`).
3. Emoji `item.icon` en dernier recours.

Les PNG painterly sont générés par `tools/icon_factory.py` (pipeline SVG →
7 passes painterly → mipmaps). Détail de la procédure : voir `tools/README.md`.

---

## Interactions

- **G2 Combat** : les bonus ATK/DEF/MAG/LCK, `critChance`, `dodgeChance`,
  `counterChance` et `regenHp/Sp` sont tous actifs en combat ; les équipements
  grisés ne sont pas utilisables via le menu Objet.
- **G3 Progression** : `recalculateStats()` est aussi appelé après chaque
  level-up pour appliquer les nouveaux `_baseX` avec l'équipement actuel.
- **G4 Maisons** : les sets de Maison se débloqueront progressivement ; les
  items légendaires de palier (Épée de Gryffondor, Médaillon de Serpentard…)
  tombent directement dans le sac via `checkHouseLevelUp`.
- **G6 Sorts** : `grantsSpell` enseigne des sorts à l'équipement ;
  `spellCostReduction` du Set de l'Aigle 4/4 réduit le coût en PM.
- **G8 Difficulté** : les drops de matériaux Forge/Biblio dépendent de la
  présence du variant `darkness` (post-victoire étage 11+).

---

## Cas limites & garde-fous

✅ (dans le jeu)

- **Sac plein au déséquipement** : si l'inventaire est plein (16 cases), le
  jeu refuse le nouvel équipement avec un message ; l'ancienne pièce reste en
  place.
- **Slot inconnu** : `_resolveSlotForItem()` émet un `console.warn` si le
  champ `slot` d'un item ne correspond à aucune clé de `c.equipped`.
- **Migration save legacy** : `_migrateEquippedSlots()` (`save.js`) détecte
  les anciennes saves avec `equipped.armor` → `body`, `equipped.acc` → slot
  dérivé de `item.slot` (ou `amulet` par défaut), et initialise les 11 slots
  manquants à `null`. Idempotente.
- **Herbes hors-sac** : `tryAddItem()` déroute automatiquement les items
  `type:"herb"` vers `player.herbs` sans jamais toucher aux 16 cases.
- **Stacking conditionnel** : deux potions brassées avec des `brewPotency`
  différents ne fusionnent pas (`_stackKey` inclut `brewPotency`).
- **Double-comptage END→PV** : `recalculateStats()` dérive le bonus PV de
  `(end_effectif − end_base)` — l'END de départ et l'END allouée sont déjà
  inclus dans `_baseHpMax`, donc aucun double-comptage.

---

## ❓ À détailler / 💡 pistes

> ❓ À détailler : comportement exact de `unequipFromSlot` quand le sac est
> **presque** plein (16 cases moins une) et qu'on déséquipe deux pièces
> successivement — à vérifier en smoke test.

> ❓ À détailler : les sinks endgame `elixir_perma_hp/mp`, `pierre_ame`,
> `philtre_endurance` (prix à rareté progressive `rarityScales:true`) et leur
> politique d'achat répété (`endgamePurchases[id]`, boutique) — non documentés
> ici faute de valeurs confirmées dans le code boutique.

> ❓ À détailler : la Bibliothèque Interdite (`CELL.LIBRARY`) et le système
> d'upgrade de sorts via Pages de Grimoire — à traiter dans G6.

> 💡 (proposition) Un indicateur de « progression de set » visible dans la
> modale Personnage est déjà implémenté (`_renderHouseSetPanel`,
> `ui-character-sheet.js`), mais il n'apparaît que pour la Maison choisie.
> Afficher une ligne récapitulative du Set Ténèbres dans la même section
> renforcerait la lisibilité pour les joueurs endgame.

> 💡 (proposition) Les items à trade-off (`lame_sanguinaire` ATK+7/DEF-2,
> `armure_lourde` DEF+6/AGI-3, `anneau_furie` Crit+12%/Esquive-6%) ne sont
> pas encore signalés visuellement dans l'inventaire (bonus rouge pour les
> malus). Un badge coloré faciliterait la lecture rapide.

---

## Récapitulatif express (pour briefer Gemini)

> **11 slots d'équipement** par personnage (wand/head/body/hands/feet/cloak/
> amulet/ring1/ring2/belt/trinket) ; sac partagé 16 cases. 4 raretés
> (common/rare/epic/legendary). `recalculateStats()` reconstruit chaque fois :
> base + équipement + Forge + sets (Maison 2/3/4 pièces + Ténèbres) +
> conversions D1/D2 + stats dérivées (crit/dodge/fortune/celerite).
> `grantsSpell` enseigne un sort au groupe ; `regenHp/Sp` régénère en combat.
> Livres de sorts : un apprenant au choix, consommés. Matériaux endgame
> (Essence/Page) alimentent la Forge des Ténèbres (upgrade 1-5, voie
> Puissance ou Critique).
