# Potions, Consommables & Craft 2.0 — Spécifications & Plan d'implémentation

> **Branche** : `claude/hogwarth-potions-crafting-yc5tcy`
> **Statut** : 🏁 **P7→P13 LIVRÉS — Potions/Consommables/Craft 2.0 CLOS (anti-corr · évolutif · Premium/Résilience · risques Boucle · Chaudron des Ruines · formes utilitaires/contrôle · équilibrage final). Triangle Artefacts ⇄ Sorts ⇄ Potions complet.**
> (toutes les ❓ résiduelles arbitrées par défauts figés ; voir §3).
> **Objectif** : *finaliser* le 3ᵉ pilier de personnalisation — **Consommables &
> Alchimie** — pour compléter le triangle **Artefacts + Sorts + Potions**.
>
> **Plan vivant** (cf. `.claude/guidelines.md` §5). Ce document **étend** et ne
> duplique pas les designs déjà livrés :
> - socle craft archivé : [`_archive/farming-potion-system.md`](./_archive/farming-potion-system.md)
> - enrichissement P0→P6 : [`potions-enrichment.md`](./potions-enrichment.md) (réf. permanente)
> - pilier jumeau (modèle de structure) : [`artifacts-reliquary-system.md`](./artifacts-reliquary-system.md)
> - sorts/corruption : [`spells-magic-system.md`](./spells-magic-system.md)
>
> **Canon de référence** : chapitres
> [07 Maisons](../../docs/histoire/07-les-maisons.md),
> [08 Quêtes](../../docs/histoire/08-quetes-et-sous-intrigues.md),
> [09 Bestiaire](../../docs/histoire/09-bestiaire-et-lore.md),
> [10 Lieux](../../docs/histoire/10-lieux-et-geographie.md),
> [11 Mondes Parallèles / Boucle](../../docs/histoire/11-mondes-paralleles.md),
> [12 Codex](../../docs/histoire/12-glossaire-et-codex.md),
> [13 Équilibre](../../docs/histoire/13-equilibre-difficulte-progression.md),
> [14 Fins](../../docs/histoire/14-scenarios-de-fin.md).

---

## 0. Contexte & règle d'or

Le jeu n'a **ni modules ES ni bundler** : `<script>` séquentiels, scope global
partagé, servi en `file://` / GitHub Pages. Toute la plomberie consommable existe
déjà et **itère dynamiquement** :

- `tryAddItem()` route `type:"herb"` → besace `player.herbs`, le reste → sac (16).
- `_applyConsumableEffect(item, target)` (`inventory.js`) gère **un grand switch
  d'effets** déjà branché (voir §1.1) — un nouvel effet = une nouvelle branche.
- le **chaudron** (`potions.js`) résout n'importe quel multiset d'ingrédients
  (herbes **et** items de sac) via `_ingredientCount`/`_consumeIngredient`.
- `brewPotency` est **bakée dans la fiole** au brassage et lue par l'effet.

> ✅ **Règle d'or équilibre** (Ch.13 §13.6) : les consommables sont un axe
> **additif et consenti**. On **n'altère jamais** le scaling des monstres. Une
> potion rend le joueur plus fort *pour un coût* (or, ingrédient, tour, ou
> **risque de corruption**) ; elle ne rend jamais l'ennemi plus faible « gratis ».

> ✅ **Règle d'or surgical** : Premium ≠ nouvelle rareté ; évolutif ≠ nouvel
> effet ; corruption ≠ nouveau système. On **réutilise** `brewPotency`, le switch
> d'effets, `spellCorruption`, `formType`/`setKey` des artefacts, et le système
> de statuts de combat. On n'ajoute un champ que si l'existant ne peut l'exprimer.

> ✅ **Ton** (cahier des charges) : magie **utilitaire & créative** au début →
> potions **puissantes mais risquées** en profondeur (corruption, effets
> secondaires). La courbe de risque suit la courbe d'étages déjà thématisée
> (Tranches A→D, Boucle Ténébreuse).

---

# ÉTAPE 1 — Spécifications & production de contenu

## 1.1 Audit de l'existant (✅ déjà livré — NE PAS refaire)

| Brique | État | Détail |
|--------|------|--------|
| Besace d'herboriste | ✅ | `player.herbs {id:count}`, illimitée, routage auto `tryAddItem` |
| 7 herbes / 4 paliers | ✅ | armoise·ortie (T1), asphodèle·branchiflore (T2), aconit·dictame (T3), **asphodèle_noire (T4, Boucle)** |
| Chaudron de Slughorn | ✅ | `#brewing-modal`, débloqué par quête `quest_potions_slughorn` (action `open_brewing`) |
| 26 recettes | ✅ | `POTION_RECIPES` — soin/mana/buff/utilitaire/upgrade/prestige/flacons |
| Jet de brassage (INT) | ✅ | `margin = bestINT + d20 − difficulty` → ratée/réussite/critique |
| **Brassage à maîtrise** | ✅ | `brewPotency` bakée [−15 %, +50 %], influe effet **et** revente |
| Codex de recettes | ✅ | silhouettes + indices non-spoiler `_recipeHint`, compteur X/26 |
| Buffs de combat (5 stats) | ✅ | `temp_buff` ATK/DEF/AGI/LCK/MAG, statuts `buff_*`, réappliqués par `recalculateStats` |
| Anti-statut / régen / résistance | ✅ | `cure`, `regen_buff`, `resist_buff` (−40 %/3t via `_resistMult`) |
| Chaîne upgrade-craft | ✅ | `eclat_vitalite` + potion de rang inférieur → rang supérieur |
| Flacons offensifs jetables | ✅ | `effect:"throw"` Feu/Givre/Venin, `pendingThrowIdx`, resist/weak/combo |
| Permanents | ✅ | `perma_hp`/`perma_sp`/`perma_end`, `stat_boost`, `auto_revive`, `fortune` (Félix) |
| Jardin passif + Slug Club | ✅ | `CELL.GARDEN`, `gardenStock`, cadence cueillette house-aware |
| Économie herbes | ✅ | cueillette (`searchRoom`) + drops botaniques + boutique Apothicaire |

**Moteur d'effets `_applyConsumableEffect` (branches existantes)** : `heal`,
`restore_sp`, `heal_full`, `restore_sp_full`, `both`, `cure`, `regen_buff`,
`temp_buff`, `resist_buff`, `perma_hp`, `perma_sp`, `perma_end`, `stat_boost`,
`auto_revive`, `throw`, `fortune`.

> **Conclusion de l'audit** : les catégories **Soins / Mana / Buffs / Débuffs
> ennemis (flacons) / Utilitaires / Permanents** sont **couvertes**. Les **trous
> exacts** que cette finalisation comble sont : **(a) Anti-corruption**,
> **(b) Premium par Maison**, **(c) Potions évolutives**, **(d) Risques & effets
> secondaires en profondeur/Boucle**, **(e) nouvelles formes signature**,
> **(f) ateliers hors Slughorn (Ruines)**, **(g) synergies explicites** Artefacts
> ⇄ Sorts ⇄ Potions. C'est le périmètre ci-dessous.

## 1.2 Principes directeurs (5)

1. **Une potion = une intention de jeu**, pas un stat-stick. Chaque ajout répond à
   « quel fantasme/décision sert-elle ? ».
2. **Risque consenti** : la puissance profonde se paie en **corruption** ou en
   **effet secondaire**, jamais en RNG punitif opaque. Le joueur *choisit* le risque.
3. **Cohérence Maison** (`houseAffinity`) : une potion peut « pencher » vers une
   Maison (accès shop + variante Premium), **jamais bloquée** à une autre (la
   Maison module l'*accès*, pas le *droit de boire* — anti-frustration).
4. **Premium = variante coloriée + boostée** d'une base, gatée par **contenu**
   (quête signature / Boucle), pas par or pur. Pas de 6ᵉ rareté.
5. **Le triangle se boucle** : chaque famille de potion doit avoir **au moins une
   synergie nommée** avec un Artefact (`formType`/`setKey`) **et/ou** un Sort.

## 1.3 Structure globale du système

### 1.3.1 Les 7 catégories (champ `category`)

| `category` | Rôle | Exemples (✅ existant / 💡 nouveau) |
|------------|------|--------------------------------------|
| `soin` | PV instant / régén | ✅ potion_s/l/xl, soin_mineure(+/++), elixir_regen |
| `mana` | PM instant / régén | ✅ potion_m/l_sp/xl_sp |
| `buff` | Buff temporaire de stat (combat) | ✅ force/defense/celerite/precision/puissance · 💡 Résilience Maison |
| `debuff` | Offensif jeté / affaiblit l'ennemi | ✅ flacon_feu/givre/venin · 💡 Huiles d'arme, Poudres runiques |
| `anti_corruption` | Purge/atténue la **corruption** | 💡 **Catégorie neuve** (§1.5, §1.8) |
| `utilitaire` | Exploration / hors-combat | ✅ cure, reveal (Revelio item) · 💡 Vision des Éclats, Écho Temporel |
| `permanent` | Gain de stat permanent (rare) | ✅ perma_hp/sp/end · 💡 Permanents Boucle (risqués) |

> `category` est **dérivable** au runtime depuis `effect`, mais on l'**explicite**
> sur l'item : il pilote le **filtre d'inventaire**, le **tri du codex chaudron**,
> et la **coloration de tooltip**. Champ purement déclaratif, zéro logique nouvelle.

### 1.3.2 Potion **classique** vs **craftée / alchimique**

| Axe | Classique (achetée/lootée) | Craftée / Alchimique (chaudron) |
|-----|----------------------------|----------------------------------|
| Source | boutique, coffre, drop | brassage (herbes/ingrédients + jet INT) |
| Puissance | nominale (`power`) | **+ `brewPotency`** [−15 %, +50 %] bakée |
| Revente | prix de base | prix × (1 + brewPotency) |
| Flag | aucun | `brewed:true` + `brewPotency` |
| Premium | non (sauf reliques shop) | **oui** — voie privilégiée des variantes Premium (§1.6) |
| Risque | nul | nul en surface ; **corruptionRisk** en profondeur (§1.8) |

> 💡 **Décision structurante n°1** : les **nouveautés fortes** (anti-corruption,
> évolutif, Premium, formes signature) sont **majoritairement craftées** — c'est
> ce qui *motive l'exploration et le crafting* (objectif final du cahier des
> charges). Le shop ne vend que les **bases** et de rares Premium de prestige.

## 1.4 Modèle de données enrichi (item potion)

Champs **nouveaux** (tous optionnels, fallback = comportement actuel → **zéro
régression** sur les 26 recettes / items existants) :

```js
{
  // — existant —
  id, name, icon, desc, price, type:"consumable",
  effect, power, turns?, buffStat?, element?, statusId?, statusPower?, statusTurns?,
  rarity:"common|rare|epic|legendary",

  // — NOUVEAU (cette finalisation) —
  category:        "soin|mana|buff|debuff|anti_corruption|utilitaire|permanent",
  houseAffinity:   "gryffondor|serpentard|serdaigle|poufsouffle" | null,
  premiumOf:       "<baseItemId>" | null,   // marque la variante Premium d'une base
  premiumTint:     "#d3a625",               // coloration distinctive (souvent = Maison)
  corruptionRisk:  0,                        // 0..N — corruption ajoutée à la consommation (§1.8)
  corruptionPurge: 0,                        // points de spellCorruption retirés (§1.5 anti-corr.)
  sideEffect:      { id, turns, magnitude } | null, // effet secondaire en profondeur (§1.8)
  evolves:         { source:"artifactForm|artifactSet|corruption|floor",
                     key?, perStep?, cap? } | null,  // potion évolutive (§1.7)
  synergy:         { artifacts:[...], spells:[...], note:"" } | null, // doc/tooltip (§1.11)
  fx:              { color, sound, particle } | null // FX renforcés Premium (§1.6, §2.8)
}
```

Champs **nouveaux** sur une recette `POTION_RECIPES` :

```js
{
  // — existant — id, name, resultItemId, ingredients:{...}, difficulty, lore
  // — NOUVEAU —
  workshop:    "slughorn|ruines|any",   // atelier requis (défaut "any")
  minFloor?:   11,                       // gate de découverte (recettes Boucle)
  premium?:    true                      // recette de variante Premium (gatée contenu)
}
```

> ✅ **Compat saves** : aucun champ n'est requis. Une potion sans `category`/
> `corruptionRisk`/`evolves` se comporte **exactement** comme aujourd'hui. Les
> nouveaux champs voyagent avec l'item (déjà sérialisé). Aucune migration.

## 1.5 Nouvelles formes (potions signature) — **9 formes, toutes en scope** ✅

> ✅ **Décision figée (2026-06-20)** : **les 9 formes sont livrées** (cahier des
> charges). Réparties sur les lots P7→P12 (§2.7). Toutes **craftées** ; effets
> exprimés via le moteur existant quand possible — les ⚙️ marquent une **nouvelle
> branche d'effet** à ajouter dans `_applyConsumableEffect` (détail §2.5).
> `huile_arme` et `poudre_runique` sont des **familles** (3 + 2 variantes) →
> **14 items** au total. Chaque item est spécifié en JSON-esquisse §1.5bis.

| # | Potion | `category` | `rarity` | Effet | ⚙️ branche | Ingrédients (figés) | `corruptionRisk` | Atelier / Source | Lot |
|---|--------|-----------|----------|-------|-----------|---------------------|------------------|------------------|-----|
| 1 | **Élixir de Lucidité** | `anti_corruption` | epic | `corruptionPurge:3` (−3 `spellCorruption`, hors combat) | `purge_corruption` | dictame×2 + asphodele_noire×1 | 0 | Ruines + Apothicaire Tén. | **P7** |
| 2 | **Baume du Patronus** | `anti_corruption` | rare | `corruptionPurge:2` **+** `cure` group (`fear`/`gel`) | `purge_corruption`+`cure` | dictame×1 + branchiflore×1 + armoise×1 | 0 | Slughorn · quête sig. Poufsouffle | **P7** |
| 3 | **Élixir d'Immunité** | `anti_corruption` | rare | `wardCharges+1` : absorbe le prochain `sideEffect`/corruption | `ward_charge` | dictame×1 + asphodele×1 | 0 | Slughorn · quête sig. Serdaigle | **P7** |
| 4 | **Potion de Corruption Contrôlée** | `buff` (évolutif) | epic | +8 MAG **+** dégâts sorts ×(1+0.05·corr.) 3 t — **mais** s'auto-corrompt | `temp_buff` + `evolves:corruption` + risk | asphodele_noire×2 + aconit×1 | **2** | Ruines (Boucle) | **P10** |
| 5 | **Potion de Résilience Maison** | `buff` | epic | Buff aligné sur `chosenHouse` (Gryff +ATK/crit · Slyth +MAG/spell-lifesteal · Serd +PM/−coût · Pouf +DEF/régén) | `house_buff` | herbe T2 ×2 + ingrédient Maison | 0 | Quête Chef de Maison | **P9** |
| 6 | **Potion de Vision des Éclats** | `utilitaire` | rare | Révèle coffres/jardins/cases cachées de l'étage + fouille majorée N pas | `reveal_treasures` | branchiflore×1 + ortie×1 | 0 | Slughorn + boutique (≥3) | **P12** |
| 7 | **Potion d'Écho Temporel** | `utilitaire` | epic | Hors combat : annule le **dernier pas/dégât de salle**. En combat : recharge le **budget temporel** 1×/combat | `temporal_echo` | dictame×2 + retourneur_temps×1 | 0 | Ruines · rare | **P12** |
| 8 | **Huile d'Arme** ×3 (feu/givre/foudre) | `buff` | rare | Enduit l'arme : attaques **physiques** infligent +X dégâts **élémentaires** N tours (combat) | `weapon_oil` | herbe-élément×2 + huile_base×1 | 0 | Forge + Ruines | **P12** |
| 9 | **Poudre Runique** ×2 (étourdissante/aveuglante) | `debuff` | rare | Jetée : `stun`/`fear` à **tout le groupe ennemi**, 0 dégât (contrôle pur) | `throw` (statut AoE, 0 dmg) | aconit×1 + page_grimoire×1 | 0 | Ruines — coûteux | **P12** |

### 1.5bis Esquisses JSON (figées — à transcrire en P7→P12)

```js
// 1 — anti_corruption (P7)
{ id:"elixir_lucidite", name:"Élixir de Lucidité", category:"anti_corruption",
  type:"consumable", rarity:"epic", effect:"purge_corruption", corruptionPurge:3,
  icon:"🧪", price:220, synergy:{ spells:["Sectumsempra","Morsmordre"],
  note:"Seule soupape pour faire redescendre la corruption." } }

// 4 — buff évolutif risqué (P10)
{ id:"potion_corruption_ctrl", name:"Potion de Corruption Contrôlée", category:"buff",
  type:"consumable", rarity:"epic", effect:"temp_buff", buffStat:"mag", power:8, turns:3,
  corruptionRisk:2, evolves:{ source:"corruption", perStep:0.05, cap:1.5 },
  synergy:{ artifacts:["TENEBRES_SET"], spells:["Sectumsempra"] }, icon:"🌑" }

// 5 — house_buff (P9) — un item, 4 comportements selon chosenHouse
{ id:"potion_resilience_maison", name:"Potion de Résilience Maison", category:"buff",
  type:"consumable", rarity:"epic", effect:"house_buff", turns:3, houseAffinity:null,
  synergy:{ note:"S'aligne sur le passif d'Apothéose de ta Maison." }, icon:"🛡️" }

// 8 — weapon_oil (P12) — gabarit, ×3 éléments
{ id:"huile_feu", name:"Huile de Feu", category:"buff", type:"consumable", rarity:"rare",
  effect:"weapon_oil", element:"feu", power:6, turns:4, price:60, icon:"🔥",
  synergy:{ note:"Les attaques physiques déclenchent les combos élémentaires." } }

// 9 — poudre runique (P12) — étend `throw`, dégât 0, statut AoE
{ id:"poudre_stun", name:"Poudre Runique Étourdissante", category:"debuff",
  type:"consumable", rarity:"rare", effect:"throw", power:0, aoe:true,
  statusId:"stun", statusTurns:1, price:70, icon:"💫" }
```

## 1.6 Variantes Premium par Maison

Modèle **calqué sur les Artefacts Premium** (`artifacts-reliquary-system.md` §3.2) :
une Premium est la **même potion**, **coloriée Maison** + **boostée** + **FX
renforcés**, **gatée par contenu**.

- **Mécanique** : `premiumOf:"<base>"`, `premiumTint` (couleur Maison),
  `brewPotency` plancher relevé (Premium toujours ≥ +25 %) **ou** `power`×1.25,
  `fx` renforcé (couleur de liquide, son, particules — §2.8).
- **Pas de nouvelle rareté** : la Premium hérite de la rareté de sa base, +1 cran
  d'affichage (cartouche doré Premium dans le tooltip).
- **Coloration canon** (palettes déjà utilisées par `icon_factory.py`) :

| Maison | Dominante | Accent | Liquide Premium |
|--------|-----------|--------|-----------------|
| Gryffondor | `#740001` | `#d3a625` | rubis ardent |
| Serpentard | `#1a472a` | `#aaaaaa` | émeraude argentée |
| Serdaigle | `#0e1a40` | `#946d2d` | saphir bronze |
| Poufsouffle | `#372e29` | `#f0c75e` | ambre doré |

| Premium (proposée) | Base | Maison | Bonus Premium | Obtention |
|--------------------|------|--------|---------------|-----------|
| 💡 Élixir du Lion Ardent | potion_force | Gryffondor | +ATK **et** +crit court | quête signature / Chef de Maison (McGonagall) |
| 💡 Venin du Serpent | potion_xl_sp / flacon_venin | Serpentard | lifesteal de sort majoré | quête signature (Rogue) |
| 💡 Sagesse de l'Aigle | potion_precision / potion_xl_sp | Serdaigle | +LCK/MAG **et** −coût PM | quête signature (Flitwick) |
| 💡 Vigueur du Blaireau | potion_resistance / elixir_regen | Poufsouffle | régén **et** −corruption | quête signature (Chourave/Sprout) |

> ✅ **Récompenses de quête** : les Premium sont la **récompense Premium** des
> quêtes signature de Maison (cohérent avec le cahier des charges « Récompenses
> de quêtes pour les versions Premium »). Une seule Premium accessible *facilement*
> par partie (celle de `chosenHouse`) ; les autres via Boucle / Marchand d'Ombre.

## 1.7 Potions évolutives (`evolves`)

Une potion dont l'effet **s'améliore selon le contexte du buveur** — purement
multiplicatif, calculé **à la consommation** (lecture seule, aucun nouvel état).

| Source (`evolves.source`) | Lecture | Exemple |
|---------------------------|---------|---------|
| `artifactForm` | nb de pièces équipées d'un `formType` (Artefacts 2.0) | 💡 « Philtre du Mage » : +X% PM par `formType:"baton"/"grimoire"` équipé |
| `artifactSet` | set actif (`setKey`, ex. Ténèbres / Voyageur) | 💡 « Élixir d'Outremonde » : effet ×1.5 si Set Voyageur ≥2 pièces |
| `corruption` | `spellCorruption` courant | 💡 « Corruption Contrôlée » : power × (1 + 0.05·corruption) (le risque nourrit la récompense) |
| `floor` | profondeur / Boucle | 💡 potions de prestige plus fortes en Boucle |

- **Helper pur** `potionEvolveMult(item)` (potions.js) → retourne un multiplicateur
  ∈ [1, cap]. `_applyConsumableEffect` multiplie `pow` par ce facteur quand
  `item.evolves` est présent. **Borné par `cap`** (anti-trivialisation).
- Le tooltip affiche l'ampleur **réelle** au moment de l'usage (« Effet actuel :
  +63 % grâce à ton équipement »).

> Synergie directe avec **Artefacts 2.0** (`formType`/`setKey`) et **Sorts/
> Corruption** → ferme le triangle. ❓ Calibration des coefficients à passer dans
> `tools/sim-difficulty.js` (voir §2.7, §3).

## 1.8 Risques & effets secondaires (profondeur & Boucle)

> Le ton « puissant mais risqué en profondeur ». Le risque est **gradué par
> tranche** et **toujours lisible avant consommation** (tooltip ⚠️).

### 1.8.1 La corruption comme monnaie de risque

`spellCorruption` (state.js, sérialisé, monotone croissant) majore le `power` ET
le **risque** des sorts corrompus (`corruptionSpellModifier`). **Aujourd'hui
aucun moyen de la réduire.** Cette finalisation l'ouvre aux potions :

- **Potions à risque** (`corruptionRisk > 0`) : ajoutent N à `spellCorruption` à
  la consommation (les plus puissantes potions de Boucle).
- **Anti-corruption** (`corruptionPurge > 0`, §1.5) : la **seule** soupape pour
  la faire **redescendre** → crée une vraie **boucle de gestion** de ressource
  endgame (brasser de l'anti-corruption ⇄ se permettre des potions risquées).

### 1.8.2 Effets secondaires gradués par tranche (`sideEffect`)

| Tranche / Boucle | Comportement des potions **risquées** |
|------------------|----------------------------------------|
| A/B (étages 1–6) | Aucun effet secondaire — magie utilitaire « sûre » |
| C (7–13) | `corruptionRisk` léger sur les potions de prestige |
| D / Boucle (14+) | `corruptionRisk` + chance de `sideEffect` (ex. −10 % PM max 2 tours après un buff trop puissant, ou statut `gel`/`fear` bref) |

- **Garde-fou** : `sideEffect` n'est **jamais** mortel ni « perte de tour » non
  télégraphié — il *coûte*, il ne *punit pas l'aveugle*. Toujours affiché ⚠️.
- L'**Élixir d'Immunité** (§1.5) annule le prochain `sideEffect`/corruption →
  contre-jeu explicite.

> ❓ **À valider** : intensité des `sideEffect` en Boucle (proposition douce :
> jamais > 15 % d'une stat, ≤ 2 tours, jamais sur PV).

## 1.9 Système de craft & ateliers

### 1.9.1 Ateliers (`workshop`) — au-delà de Slughorn

| Atelier | Lieu | Débloque | Recettes |
|---------|------|----------|----------|
| ✅ **Chaudron de Slughorn** | Salle des Potions (étage 2) | quête `quest_potions_slughorn` | toutes recettes `workshop:"any"` + base |
| 💡 **Chaudron des Ruines** | Cellule endgame (Ruines Anciennes, Tranche D / Boucle) | post-victoire (comme Forge/Bibliothèque) | recettes `workshop:"ruines"` (Boucle, Premium, anti-corruption, poudres runiques) |
| 💡 **Établi du Forgeron** (optionnel) | Forge existante | déjà présent | **Huiles d'arme** uniquement (thématique forge) |

- 💡 **Décision** : le Chaudron des Ruines **réutilise `#brewing-modal`** —
  `openBrewingModal({ workshop:"ruines" })` filtre les recettes éligibles. **Aucune
  nouvelle UI**, juste un en-tête contextuel + un filtre. Cellule `CELL.CAULDRON`
  posée comme Forge/Bibliothèque (endgame), interaction via overlay d'exploration.
- `workshopLevel` (state.js, sérialisé) : 0 = aucun, 1 = Slughorn, 2 = Ruines.
  Pilote l'accès aux recettes `workshop:"ruines"` et un **léger bonus de jet**
  (atelier supérieur = −1 difficulté effective). ❓ confirmer le bonus.

### 1.9.2 Succès / échec / découverte (✅ inchangé)

Mécanique conservée telle quelle (jet INT, `brewPotency`, découverte par
expérimentation, codex). Les nouvelles recettes s'y branchent **sans code** —
elles ne diffèrent que par `workshop`/`minFloor`/`premium`.

### 1.9.3 Découverte des recettes (3 vecteurs ✅ + 1 💡)

1. ✅ Quête (`reward.recipes`) — base + Premium signature.
2. ✅ Expérimentation au chaudron (multiset).
3. ✅ Codex (indices non-spoiler).
4. 💡 **PNJ Apothicaire / parchemins de Boucle** : les recettes `workshop:"ruines"`
   peuvent être **enseignées** par l'Apothicaire Ténébreux ou trouvées en coffre
   de Boucle (réutilise `learnRecipe`).

## 1.10 Économie & disponibilité

> Aligné Ch.13 §13 (économie d'or) et sur le système Artefacts (`_endgameItemPrice`,
> rareté×prix). Le **shop vend les bases** ; le **craft & les quêtes donnent le reste**.

| Source | Vend / Donne | Cohérence |
|--------|-------------|-----------|
| Apothicaire (shop) | herbes (✅), bases soin/mana, flacons, **Vision des Éclats** | progressif par étage (`minFloor`) |
| Apothicaire **Ténébreux** (Boucle) | herbe T4, anti-corruption, ingrédients Premium | endgame, prix ×rareté |
| Coffres | bases lootées, `eclat_vitalite` (✅), parchemins de recette Boucle | table de loot existante |
| Drops botaniques/Boucle | herbes (✅), ingrédients rares | bestiaire |
| **Quêtes signature Maison** | **Premium de `chosenHouse`** (§1.6) | une par partie « facile » |
| Marchand d'Ombre | Premium hors-Maison (cher) | exclusivité payante |

**Coûts** (table unique, miroir Artefacts) :

| Rareté potion | Achat base | Ingrédient craft | Note |
|---------------|-----------|------------------|------|
| common | 10–40 G | herbes T1–T2 | bases |
| rare | 60–120 G | herbes T2–T3 + Éclat | upgrades, flacons |
| epic | 200–400 G | herbes T3–T4 + ingrédient rare | Premium, anti-corruption |
| legendary | non vendue | quête / Boucle uniquement | Premium signature, prestige |

## 1.11 Synergies — fermer le triangle Artefacts ⇄ Sorts ⇄ Potions

Champ `synergy` (déclaratif, alimente tooltip + Codex) **et** effet réel via
`evolves`/effets dédiés. Exemples nommés (un par famille — exigence §1.2 #5) :

| Potion | ↔ Artefact | ↔ Sort | Effet de synergie |
|--------|-----------|--------|-------------------|
| Philtre du Mage (évolutif) | `formType:"baton"/"grimoire"` | sorts MAG | +PM/effet par pièce caster équipée |
| Corruption Contrôlée | Set Ténèbres | sorts corrompus (Sectumsempra…) | power ↑ avec `spellCorruption` ; le Set amplifie |
| Élixir d'Outremonde | Set Voyageur | Cheminette / Reliquae | effet ×1.5 sous Set Voyageur |
| Potion d'Écho Temporel | `retourneur_temps` (trinket) | **Reliquae Temporis** / Tempus Echo | recharge le budget temporel 1×/combat |
| Huile d'Arme | armes `wand`/`sword_gryff` | combos élémentaires | les attaques physiques **déclenchent les combos** de sort |
| Résilience Maison | reliques de Maison (`setKey`) | passifs Apothéose | buff aligné sur le passif de Maison |
| Anti-corruption | — | sorts corrompus | rend le **build corrompu jouable** sans dérive |

> ✅ Ces synergies **valorisent** l'investissement déjà fait par le joueur dans les
> deux autres piliers — c'est l'objectif « forte synergie avec les systèmes
> précédents ».

## 1.12 Table de synthèse maître (complète)

> 17 ajouts (9 formes dont 2 familles → 14 items + Philtre évolutif + 4 Premium).
> ✅ = base existante réutilisée ; 💡 = nouveauté de cette finalisation.

| Potion | Catégorie | Effet | Coût / Ingrédients | Premium | Disponibilité | Synergies | Lot |
|--------|-----------|-------|--------------------|---------|---------------|-----------|-----|
| Élixir de Lucidité 💡 | anti_corruption | −3 corruption | dictame×2 + asphodèle_noire×1 (220 G) | — | Ruines + Apothicaire Tén. | sorts corrompus | P7 |
| Baume du Patronus 💡 | anti_corruption | −2 corr. + cure groupe | dictame+branchiflore+armoise | — | Slughorn · q. Poufsouffle | Patronus, `fear`/`gel` | P7 |
| Élixir d'Immunité 💡 | anti_corruption | bloque 1 sideEffect | dictame×1 + asphodèle×1 | — | Slughorn · q. Serdaigle | risques Boucle | P7 |
| Corruption Contrôlée 💡 | buff (évolutif) | +MAG, dégâts sorts ↑ corr., risk:2 | asphodèle_noire×2 + aconit×1 | — | Ruines (Boucle) | Set Ténèbres, corruption | P10 |
| Résilience Maison 💡 | buff | buff selon `chosenHouse` | herbe T2×2 + ingrédient Maison | = 4 colorations | Quête Chef de Maison | reliques + passif Apothéose | P9 |
| Vision des Éclats 💡 | utilitaire | révèle étage + fouille | branchiflore×1 + ortie×1 (rare) | — | Slughorn + shop ≥3 | niffleurs, jardins, coffres, Revelio | P12 |
| Écho Temporel 💡 | utilitaire | annule dernier pas / recharge budget temporel | dictame×2 + retourneur_temps×1 | — | Ruines · rare | Reliquae Temporis, Tempus Echo | P12 |
| Huile de Feu/Givre/Foudre 💡 ×3 | buff | +dégâts élém. sur attaques phys. N t | herbe-élément×2 + huile_base | — | Forge + Ruines | combos, armes (`wand`/`sword`) | P12 |
| Poudre Runique (stun/fear) 💡 ×2 | debuff | statut AoE ennemis, 0 dmg | aconit×1 + page_grimoire×1 | — | Ruines — coûteux | contrôle, sorts | P12 |
| Philtre du Mage 💡 | mana (évolutif) | +PM × pièces caster équipées | herbe T3 + Éclat | — | Craft | `formType` baton/grimoire | P8 |
| Élixir du Lion Ardent 💡 | buff (Premium) | +ATK +crit court | base potion_force + colo Gryff | Gryffondor | Quête McGonagall | reliques Gryffondor | P9 |
| Venin du Serpent 💡 | debuff/mana (Premium) | spell-lifesteal majoré | base potion_xl_sp + colo Slyth | Serpentard | Quête Rogue | Set Ténèbres | P9 |
| Sagesse de l'Aigle 💡 | mana (Premium) | +LCK/MAG, −coût PM | base potion_precision + colo Serd | Serdaigle | Quête Flitwick | sorts, `formType` caster | P9 |
| Vigueur du Blaireau 💡 | buff (Premium) | régén + −corruption | base potion_resistance + colo Pouf | Poufsouffle | Quête Chourave | anti-corruption, régén | P9 |
| *(bases ✅)* | soin/mana/buff/debuff | — | — | — | shop/craft/loot | — | livré |

---

# ÉTAPE 2 — Plan d'implémentation

> Incrémental, **un lot = une PR verte au smoke avant la suivante**. Continue la
> numérotation de `potions-enrichment.md` (P0→P6) → ce document = **P7→P12**.

## 2.1 Structure des données

- **`js/data.js`** : champs optionnels §1.4 sur les items potion + recettes
  (`category`, `houseAffinity`, `premiumOf`, `premiumTint`, `corruptionRisk`,
  `corruptionPurge`, `sideEffect`, `evolves`, `synergy`, `fx`, `workshop`,
  `minFloor`, `premium`). Back-compat totale (tous optionnels).
- **`POTION_RECIPES`** : +N recettes (MVP ≈ 12–15) avec `workshop`/`minFloor`.
- **`SHOP_CATALOG`** : bases + Vision des Éclats + Premium de prestige (Marchand).

## 2.2 Variables & flags (state.js, sérialisés)

| Var | Type | Rôle | Sérialisé ? |
|-----|------|------|-------------|
| ✅ `player.herbs` / `player.knownRecipes` | obj/array | besace / recettes | oui |
| ✅ `spellCorruption` | int | corruption combat (réutilisé) | oui (clé `corruptionLevel`) |
| 💡 `workshopLevel` | int (0/1/2) | ateliers débloqués | oui |
| 💡 `wardCharges` | int | charges d'Immunité actives | oui (combat-scoped possible) |
| 💡 `weaponOil` | `[{stat,turns}]` par perso | enduit d'arme actif | combat-scoped (reset startBattle) |

> `inventoryPotions`/`craftingRecipesUnlocked` du cahier des charges sont **déjà
> couverts** par `player.inventory` + `player.knownRecipes` — **ne pas dupliquer**.

## 2.3 Système de crafting

- ✅ Réutilise **intégralement** `#brewing-modal` + `attemptBrew`.
- 💡 `openBrewingModal(opts)` : `opts.workshop` filtre les recettes affichées et
  l'en-tête (« Chaudron des Ruines »). Cellule `CELL.CAULDRON` (endgame) +
  overlay d'exploration (miroir Forge/Bibliothèque dans `movement-interactions.js`).
- ✅ Succès/échec/découverte : inchangés. Premium = recette `premium:true`
  pré-enseignée par quête (jamais brassable sans la connaître si `premium`).

## 2.4 Intégration (inventaire / combat / exploration / lieux)

- **Inventaire** : filtre par `category` (réutilise le patron des chips de filtre
  de la modale Sorts). Tooltip enrichi (corruption ⚠️, synergie, évolutif réel).
- **Combat** : `temp_buff`/`throw`/`resist_buff` déjà branchés ; ajouter
  `weapon_oil` (hook dans `executeAttack`), `house_buff`, poudres runiques
  (statut AoE via extension `throw`).
- **Exploration** : `reveal_treasures` (Vision des Éclats) réutilise la logique
  Revelio/jardins ; `temporal_echo` hors combat.
- **Lieux** : Chaudron des Ruines (génération cellule endgame), Apothicaire
  Ténébreux (wares), coffres Boucle (parchemins).

## 2.5 Effets temporaires / permanents & risques (nouvelles branches `_applyConsumableEffect`)

| ⚙️ Effet | Action | Réutilise |
|----------|--------|-----------|
| `purge_corruption` | `spellCorruption = max(0, − corruptionPurge)` | — |
| `house_buff` | applique le buff de `HOUSE_BONUSES[chosenHouse]` | `temp_buff`/statuts |
| `weapon_oil` | arme `weaponOil[char]` pour N tours | hook `executeAttack` |
| `reveal_treasures` | révèle coffres/jardins/cachés de l'étage | logique Revelio |
| `temporal_echo` | annule dernier pas / recharge budget temporel | `_timeSnapshot` |
| `ward_charge` | `wardCharges++` (bloque prochain sideEffect) | — |
| extension `throw` | statut AoE sans dégâts (poudres) | boucle enemyGroup |
| **risque** (transverse) | à la conso : `spellCorruption += corruptionRisk` ; roll `sideEffect` en Tranche D/Boucle ; `wardCharges` absorbe | `corruptionSpellModifier` |

`evolves` : helper pur `potionEvolveMult(item)` → `pow *= mult` (borné `cap`).

## 2.6 Synergies (impl.)

- `synergy` : déclaratif (tooltip + Codex) — **zéro logique**.
- Effet réel : porté par `evolves` (lecture `formType`/`setKey`/`spellCorruption`)
  + `weapon_oil` (combos) + `house_buff`. Helpers purs, testables unitairement
  (`tests/units.js`).

## 2.7 Priorisation (lots)

```
P7 (data + anti-corruption)  ← socle + comble le trou n°1, faible risque
   → P8 (évolutif + synergies)   lecture artefacts/corruption, helpers purs
   → P9 (Premium par Maison)     variantes + quêtes signature + FX
   → P10 (risques/sideEffect Boucle) profondeur, calibration sim
   → P11 (Chaudron des Ruines)   nouvelle cellule + workshopLevel
   → P12 (formes restantes)      huiles, poudres, Écho Temporel, Vision
   → P13 (équilibrage)           sim-difficulty + pass final
```

| Lot | Contenu (formes §1.5 incluses) | Effort | Risque | Dépend |
|-----|--------------------------------|--------|--------|--------|
| ✅ **P7** | champs data §1.4 + `category` + **anti-corruption** : Lucidité (1), Baume du Patronus (2), Immunité (3) ; effet `purge_corruption`/`ward_charge` | ~1,5 j | faible | — |
| ✅ **P8** | `evolves` + `potionEvolveMult` + synergies déclaratives ; **Philtre du Mage** (10, mana évolutif) | ~1 j | faible | P7 |
| ✅ **P9** | **Premium ×4 Maisons** (11–14) + **Résilience Maison** (5, `house_buff`) + quêtes signature + `fx` | ~2,5 j | moyen | P7 |
| ✅ **P10** | `corruptionRisk` + `sideEffect` Boucle + `wardCharges` ; **Corruption Contrôlée** (4) | ~1,5 j | moyen | P7,P8 |
| ✅ **P11** | **Chaudron des Ruines** + `workshopLevel` + cellule `CELL.CAULDRON` | ~1,5 j | moyen | — |
| ✅ **P12** | formes utilitaires/debuff : **Vision des Éclats** (6), **Écho Temporel** (7), **Huiles d'arme** ×3 (8), **Poudres runiques** ×2 (9) | ~2,5 j | moyen | P7,P11 |
| ✅ **P13** | calibration des coeffs évolutifs (analytique — la sim ne modélise que le stock de soins) + audit éco | ~1 j | faible | tous |

**Première vague recommandée** = **P7 + P8** (comble les trous structurants —
anti-corruption + évolutif/synergie — à risque faible, sans nouvelle UI).

## 2.8 Suggestions d'assets

- **Icônes** : fioles teintées par `category`/Maison. Premium = liquide
  `premiumTint` + cartouche doré (réutilise `icon_factory.py` ou SVG inline
  `ITEM_ICON_SVG_REGISTRY` selon dispo PIL — précédent flacons offensifs).
- **FX consommation** (`fx`) : flash coloré + particules (réutilise `CombatFX`) ;
  Premium = halo Maison + son renforcé. Hors-combat : volute sur le chaudron.
- **Sons** : ✅ `playBrew` existe ; 💡 son « purge/lucidité » (cristallin) et
  « huile/enduit » (réutilise synthèse Web Audio, pas de sample).
- **Anti-corruption** : VFX d'éclaircissement (recule la teinte « corruption »
  de l'ambiance) — réutilise les couches `floor-ambiance` / `DungeonFX`.

## 2.9 Tests (chaque lot)

- `tests/scenarios/potions.js` : étendre (nouveaux scénarios par lot —
  `scenarioAntiCorruption`, `scenarioPotionEvolve`, `scenarioPremiumPotions`,
  `scenarioPotionSideEffects`, `scenarioRuinsCauldron`, …).
- `tests/units.js` : helpers purs (`potionEvolveMult`, `_recipeHint` étendu,
  bornes de `corruptionRisk`/`sideEffect`).
- Mettre à jour les **asserts `POTION_RECIPES.length`** à chaque ajout (3+ sites).
- **Bump PWA** (skill `cache-bump`) dès qu'un JS/CSS servi change ; ce **document
  seul** est `.claude/` → **pas de bump, pas de smoke requis** (guidelines §7/§8).

---

## 3. Décisions à valider (❓ — à arbitrer AVANT P7)

1. ✅ **Périmètre des nouvelles formes** — **RÉSOLU (2026-06-20)** : **les 9
   formes** sont livrées (§1.5, 14 items + Philtre + 4 Premium), réparties P7→P12.
2. ✅ **Anti-corruption** — **RÉSOLU (2026-06-21, défaut figé en P7)** : la purge
   agit **uniquement** sur `spellCorruption` (combat/gameplay) + un **VFX
   d'ambiance léger** (volute cristalline `DFX_safe.burst`). Pas d'effet sur la
   corruption de **lieu** (ambiance) — cosmétique hors-scope.
3. ✅ **Intensité des `sideEffect` Boucle** — **RÉSOLU (2026-06-21, défaut figé)** :
   plafond **≤ 15 % d'une stat, ≤ 2 tours, jamais sur PV, toujours télégraphié ⚠️**,
   jamais « perte de tour » non télégraphiée. (Appliqué dès P10.)
4. ✅ **Premium** — **RÉSOLU (2026-06-21, défaut figé)** : une seule Premium
   « facile » par partie (celle de `chosenHouse`), les autres via Boucle /
   Marchand d'Ombre. (Appliqué dès P9.)
5. ✅ **Chaudron des Ruines** — **RÉSOLU (2026-06-21, défaut figé)** :
   `workshopLevel 2` → **−1 difficulté effective** du jet. (Appliqué dès P11.)
6. ✅ **Évolutif** — **RÉSOLU & CALIBRÉ (P13, 2026-06-21)** : `tools/sim-difficulty.js`
   ne modélise que le **stock de soins** (heal si PV < 40 %), pas les potions de
   buff/évolutives → calibration **analytique** (et non par sim, qui est le mauvais
   outil ici — surfacé honnêtement). Valeurs finales :
   - **Philtre du Mage** : `perStep 0.18`, **`cap 1.5`** (était 1.8, jamais
     atteint). Un perso équipe au plus **2** focaliseurs (`formType` bâton/grimoire :
     3 wands + 1 trinket en jeu) → max réel **1.36** (+7 PM sur 20). `cap 1.5` =
     plafond de design (+50 %, futur 3ᵉ focaliseur). Apport additif, faible risque.
   - **Corruption Contrôlée** : `perStep 0.05`, `cap 1.5` (**inchangé**) — atteint
     à `spellCorruption = 10` (+50 % MAG : 8 → 12, 3 t). Le risque (corruption +2/usage
     + contrecoup DEF) paie la récompense ; borné, conforme à la règle additive §0.
   Verrou de non-régression : `tests/units.js §3bis` (bornes du helper + source data.js).

## 4. Hors-scope (cette finalisation)

- Refonte de la besace / UI inventaire au-delà du filtre `category`.
- Potions offensives **multi-cibles** au-delà des poudres runiques (AoE combat lourd).
- Usage de potions/flacons **par les ennemis** (déjà noté hors-scope P6.c).
- Économie inter-mondes / Atelier du Voyageur (système séparé).
- Nouveaux **slots** d'équipement (les huiles sont des **consommables de prépa**,
  pas des équipements).

## 5. Journal d'avancement

| Date | Note |
|------|------|
| 2026-06-21 | **P13 LIVRÉ — équilibrage final (clôt Potions 2.0).** **Constat outil (surfacé honnêtement)** : `tools/sim-difficulty.js` ne modélise les potions QUE comme un **stock de soins** (`potionStock`, heal si PV < 40 %) — il n'a aucune notion de buff/évolutif/Premium/risque/contrôle. Calibrer ces coeffs « par la sim » est donc impossible avec l'outil actuel ; **calibration analytique** retenue (étendre la sim = gros changement spéculatif, écarté §2). **Coeffs évolutifs finalisés** (§6) : `philtre_mage` `cap 1.8 → 1.5` (jamais atteint — max réel **1.36** car ≤ 2 focaliseurs `formType` équipables : 3 wands + 1 trinket ; cap 1.5 = plafond de design +50 %, futur-proof). `potion_corruption_ctrl` **inchangé** (`0.05`/`1.5`, atteint à corruption 10 → +50 % MAG, payé par +2 corruption + contrecoup DEF). **Audit éco** (vs table §1.10 rare 60-120 / epic 200-400 G) — TOUT cohérent, **0 changement de prix** : Lucidité 220 (epic) · Baume 120 · Immunité 110 · Philtre 110 · Résilience 200 (epic) · Corruption Ctrl 360 (Marchand) · Vision 90 · Écho 260 (epic) / 300 (Apoth.) · huiles 70 · poudres 80/90 · 4 Premium = `price:0` (quête signature) / 1500 (Marchand d'Ombre, prestige). Multisets de craft alignés sur la rareté (rare = herbes T2-T3 ; epic Boucle = `retourneur_temps`/`page_grimoire`/`asphodele_noire`). **Tests** : `units.js §3bis` (6 bornes du helper `potionEvolveMult` chargé en sandbox vm + 2 verrous source data.js) → **916 assertions**. Aucun nouveau scénario smoke (changement transparent : `scenarioPotionEvolve` T3 reste 27 PM, `cap` réaliste < 1.5). `node tests/smoke.js` **vert (259)**, `check_doc_modules`, `pwa-smoke` (v199) OK. **Bump PWA** : data.js + `CACHE_VERSION` v198→v199. **→ Plan CLOS.** |
| 2026-06-21 | **P12 LIVRÉ — formes utilitaires & contrôle (Vision · Écho Temporel · Huiles ×3 · Poudres ×2).** **7 items + 7 recettes** (`POTION_RECIPES` 32→**39**, multisets vérifiés uniques). **Vision des Éclats** (`potion_vision`, rare) : effet neuf `reveal_treasures` (`inventory.js` useItem, hors combat) → helper `_revealFloorTreasures` (`movement-interactions.js` : dissipe `visited`, dévoile tous les jardins cachés via `_revealGardensNear(MAP_W)` + tous les `secretWalls` → FLOOR) + arme `visionSearchSteps` (state, **sérialisé**, décrémenté dans `_step`) → rider de fouille `+0.25` au seuil objet/herbe de `searchRoom`. **Écho Temporel** (`potion_echo_temporel`, epic) : effet neuf `temporal_echo` dual-mode — en combat = action immédiate **1×/combat** (`temporalEchoUsed`, combat-scoped, ne consomme pas le tour ni de contre-attaque) ; hors combat = `_undoLastStep` (`movement.js`) restaure position+orientation+PV/PM via snapshot `_lastStepUndo` (capturé dans `_step`, transitoire, gate même-étage). **Huiles d'arme ×3** (`huile_feu/givre/foudre`, rare) : effet neuf `weapon_oil` → `weaponOil[idx]` (state, combat-scoped, reset `startBattle`) ; rider élémentaire dans `executeAttack` (respecte resist/weak + déclenche `comboDamageMult` de l'élément, −1 attaque/coup). **Poudres runiques ×2** (`poudre_stun/fear`, rare) : réemploi `throw`+`aoe`+`power:0` ; `throwItemAoe` patché → 0 dégât quand `power===0`, statut AoE (stun 1t / fear 2t) à tout le groupe + log « disperse » dédié. **Sources** : Vision + huiles → boutique (≥3/≥5) + craft ; Écho + poudres → Apothicaire Ténébreux + craft Ruines (auto-enseignées au Chaudron des Ruines via P11). 7 icônes SVG (`_potionSvg`). **Écart vs §1.5bis** : huiles workshop `any` (gatées par herbes, pas Boucle) ; ingrédients huiles/poudres = multisets uniques d'herbes existantes + `retourneur_temps`/`page_grimoire` (pas de `huile_base` créée). **Tests** : `scenarioP12Forms` (T1 données/multisets/icônes, T2 Vision reveal+steps, T3 huile rider+décrément, T4 poudre 0-dmg+stun AoE, T5 Écho combat 1×+annulation pas). Asserts `POTION_RECIPES.length` 32→39 (8 sites). `node tests/smoke.js` **vert (259)**, `units.js` (908), `check_doc_modules`, `pwa-smoke` (v198) OK. **Bump PWA** : battle/data/inventory/item-icons/main/movement/movement-interactions/npcs/save/shop/state + `CACHE_VERSION` v197→v198. |
| 2026-06-21 | **P11 LIVRÉ — Chaudron des Ruines + `workshopLevel`.** **Global** `workshopLevel` (`state.js`, 0/1/2, monotone, SÉRIALISÉ clé `workshopLevel`, reset `startGame`). **Cellule** `CELL.CAULDRON = 18` posée comme Forge/Bibliothèque (post-victoire, cadence **13/16/19** intercalée sans overlap) : génération (`dungeon.js`), sprite de couloir `drawCauldronSprite` + scène SVG `SCENE_ICONS.cauldron` (chaudron de fer + braises + vapeur verte), overlay d'exploration + visiteur (`movement.js`), scan sprite (`renderer.js`), minimap `.map-cauldron` (`renderer-minimap.js`+css), WALKABLE visite (`save-visit-snapshot.js`). **Interaction** → `openBrewingModal({ workshop:'ruines' })` : **réemploi de `#brewing-modal`**, aucune nouvelle UI — juste (a) en-tête contextuel « Le Chaudron des Ruines », (b) filtre du codex (`_recipeAtWorkshop` : les `workshop:'ruines'` n'apparaissent qu'aux Ruines ; Slughorn ne montre que `any`/`slughorn`), (c) bypass du verrou quête Slughorn (la cellule endgame EST le verrou). **Bonus d'atelier** (décision §3.5) : `_effectiveBrewDifficulty` → `workshopLevel >= 2` retire **−1** à la difficulté (appliqué dans `_brewChance` ET le margin de `attemptBrew`). **Garde-fou** : un breuvage `workshop:'ruines'` tenté au Chaudron de Slughorn échoue (ingrédients perdus) avec message contextuel. **learnRecipe (§1.9.3 §4)** : le Chaudron des Ruines **révèle ses recettes** (`brew_elixir_lucidite`, `brew_potion_corruption_ctrl`) à la 1ʳᵉ ouverture (idempotent) — le « parchemin » est le chaudron ancestral lui-même (vecteur self-contained, l'Apothicaire Ténébreux les vend déjà en items + reste discovery par expérimentation). **Aucune recette ajoutée** (`POTION_RECIPES` reste **32**). **Tests** : `scenarioRuinsCauldron` (5 temps : données/cellule, génération Boucle vs hors-victoire vs hors-cadence, ouverture+enseignement+en-tête, bonus −1 difficulté, filtre+garde-fou) ; `scenarioRecipeCodex` ajusté (codex Slughorn = recettes visibles, ruines masquées). `node tests/smoke.js` **vert (257)**, `units.js` (908), `check_doc_modules`, `pwa-smoke` (v196) OK. **Bump PWA** : data/dungeon/main/movement/potions/renderer/renderer-minimap/renderer-sprites/save/save-visit-snapshot/scene-icons/state + style.css + `CACHE_VERSION` v195→v196. |
| 2026-06-20 | **Document rédigé** après audit complet du système existant. Constat : base + craft + enrichissement P0→P6 **déjà livrés** (26 recettes, 7 herbes, codex, maîtrise, buffs, flacons offensifs, upgrade-craft, jardin, Slug Club). Cette finalisation cible les **7 trous** : anti-corruption, Premium par Maison, évolutif, risques/effets secondaires Boucle, formes signature, Chaudron des Ruines, synergies explicites. ÉTAPE 1 (specs+contenu) et ÉTAPE 2 (plan d'impl., lots P7→P13) posées. **6 décisions ❓ en attente d'arbitrage avant P7.** Aucune ligne de code modifiée (document `.claude/` uniquement → pas de bump PWA ni smoke requis, guidelines §7/§8). |
| 2026-06-21 | **P10 LIVRÉ — risques & effets secondaires (Boucle) + Corruption Contrôlée.** **Mécanique de risque** (`inventory.js`, transverse au flux de consommation générique) : `_applyConsumptionRisk(item, target)` — `corruptionRisk` monte `spellCorruption` à la conso (item-gaté par les ingrédients Boucle) ; `sideEffect` n'est **armé qu'en Tranche D / Boucle** (`_sideEffectActiveHere` : étage 14+ ou victoire+étage 11+) avec un roll `chance` ; **`wardCharges` (Immunité P7) absorbe le paquet entier** d'un usage → contre-jeu explicite enfin actif. Garde-fou §3.3 respecté : `_applyPotionSideEffect` réutilise le statut **`weaken`** (malus DEF auto-restauré, **jamais sur PV**), borné **≤ 15 % / ≤ 2 tours**, télégraphié ⚠️. **Item** `potion_corruption_ctrl` (epic) : `temp_buff` MAG 8 × `evolves:corruption` (P8 → le buff croît avec la corruption) + `corruptionRisk:2` + `sideEffect:{def,0.15,2,chance:0.5}` ; recette `brew_potion_corruption_ctrl` (`asphodele_noire×2`+`aconit`, workshop ruines, `POTION_RECIPES` 31→**32**) + icône SVG + vente Marchand d'Ombre. **Télégraphe** : `_renderItemTooltip` affiche ⚠️ corruption + ⚠️ contrecoup. **Tests** : `scenarioPotionSideEffects` (5 temps : données, corruptionRisk hors-Boucle, absorption Immunité, contrecoup weaken en Tranche D, télégraphe). `node tests/smoke.js` **vert (256)**, `units.js` (908), `pwa-smoke`, `check_doc_modules` OK. **Bump PWA** : data/inventory/item-icons/npcs/ui-character-sheet + `CACHE_VERSION` v194→v195. |
| 2026-06-21 | **P9 LIVRÉ — Premium par Maison + Résilience Maison.** **Résilience Maison** (`potion_resilience_maison`, epic) : effet neuf `house_buff` (`inventory.js`) → buff aligné sur `chosenHouse` via `HOUSE_BUFF_PLANS` (primaire = stat Maison ATK/MAG/MAG/DEF ; rider EXISTANT : buff secondaire LCK/AGI, statut `regen`, ou restitution PM) + helper `_applyTempStatBuff` (réemploi du statut `buff_<stat>`). Recette `brew_resilience_maison` (`POTION_RECIPES` 30→**31**). **4 Premium** (`elixir_lion_ardent`/`venin_serpent`/`sagesse_aigle`/`vigueur_blaireau`) = variantes BOOSTÉES de bases (`potion_force`/`flacon_venin`/`potion_precision`/`elixir_regen`), `premium:true`+`premiumOf`+`premiumTint`+`premiumFx`, **pas de nouvelle rareté** ; rider PM `restoreSpBonus` (Sagesse) ajouté à la branche `temp_buff`. **FX conso** : flash teinté Maison à la consommation Premium (réemploi `_premiumEquipFlash` P2) + cartouche **✦ Premium · Maison** dans `_renderItemTooltip`. **Sources** (décision §3.4) : la Premium de `chosenHouse` = récompense `reward.item` de la quête signature (la seule « facile ») ; les 4 Premium + Résilience vendus par le Marchand d'Ombre (Apothicaire Ténébreux, cher) ; `brew_resilience_maison` enseignée par les 4 quêtes signature. 6 icônes SVG inline. **Écart design** : flavors « spell-lifesteal / −coût PM » approximés par buffs de stat (calibration P13) ; Premium granted comme items (pas de recette `premium:true` brassable) — simplification assumée. **Tests** : `scenarioHouseResilience` (3 temps, 4 Maisons) + `scenarioPremiumPotions` (4 temps : données/sources, effet, rider PM, tooltip) ; asserts `POTION_RECIPES.length` 30→31 (5 sites). `node tests/smoke.js` **vert (255)**, `units.js` (908), `pwa-smoke`, `check_doc_modules` OK. **Bump PWA** : data/inventory/item-icons/npcs/quests-templates/ui-character-sheet + `CACHE_VERSION` v193→v194. |
| 2026-06-21 | **P8 LIVRÉ — potions évolutives + synergies déclaratives.** **Engine** : helper PUR `potionEvolveMult(item)` (`potions.js`, au MANIFEST loader) → multiplicateur ∈ [1, `cap`] lu **à la consommation**, 4 sources (`artifactForm`/`artifactSet`/`corruption`/`floor`) ; lit le **MAX** sur les membres vivants du groupe (or/inventaire partagés) via `_partyEquipMax`. Intégré dans `_applyConsumableEffect` : `pow` (heal/restore_sp/both) **et** montant `temp_buff` × `evolveMult` (forward-compat Corruption Contrôlée P10). **Item** : `philtre_mage` (mana, `restore_sp` 20, `evolves:{artifactForm, key:[baton,grimoire], perStep:0.18, cap:1.8}`) + recette `brew_philtre_mage` (`herbe_dictame`+`eclat_vitalite`, `POTION_RECIPES` 29→**30**) + icône SVG inline. **Synergies déclaratives** : `_renderItemTooltip` affiche la note `synergy.note` (🔗) **et** l'ampleur RÉELLE de `evolves` (📈, via `potionEvolveMult`) au moment de l'usage — zéro logique nouvelle (P7/P8). Coeffs `perStep`/`cap` = placeholders **calibrés en P13** (sim). **Tests** : `scenarioPotionEvolve` (3 temps : données, helper pur multi-sources + cap, effet contextuel restore_sp) ; asserts `POTION_RECIPES.length` 29→30 (4 sites). `node tests/smoke.js` **vert (253)**, `units.js` (908), `pwa-smoke`, `check_doc_modules` OK. **Bump PWA** : data/inventory/item-icons/loader/potions/ui-character-sheet + `CACHE_VERSION` (skill `cache-bump`). |
| 2026-06-21 | **P7 LIVRÉ — anti-corruption + socle data.** ❓2-6 **arbitrées par défauts figés** (§3) : anti-corr. = `spellCorruption` combat seul + VFX léger ; `sideEffect` Boucle ≤ 15 %/≤ 2 t/jamais PV/télégraphié ⚠️ ; Premium « facile » = `chosenHouse` seule ; Chaudron Ruines = `workshopLevel 2` → −1 difficulté ; coeffs évolutifs → P13. **Code** : champs data optionnels §1.4 sur items potion (`category`/`houseAffinity`/`corruptionPurge`/`cureGroup`/`synergy`…) + recettes (`workshop`/`minFloor`) — tous back-compat. 3 items (`elixir_lucidite` epic, `baume_patronus` rare, `elixir_immunite` rare) + 3 recettes (`POTION_RECIPES` 26→**29**) + 3 icônes SVG inline. 2 branches d'effet `purge_corruption` (Lucidité −3 / Baume −2 + cure `fear`/`gel` de groupe) & `ward_charge` (Immunité → `wardCharges`) dans `_applyConsumableEffect` ; garde anti-gaspillage (`_isWastedRestore`). Flag `wardCharges` (`state.js`, sérialisé clé `wardCharges`). **Sources** : `elixir_lucidite` vendu par l'Apothicaire Ténébreux ; `brew_baume_patronus` enseigné par la quête signature Poufsouffle, `brew_elixir_immunite` par la signature Serdaigle ; recette Lucidité `workshop:"ruines"`/`minFloor:11` (inerte jusqu'à P11, gatée de facto par l'asphodèle noire de Boucle). **Écart vs §1.5bis** : ingrédients Immunité passés de `dictame×1+asphodèle×1` (collision avec `brew_elixir_regen`) à **`dictame×1+asphodèle×2`** (multiset unique). **Tests** : `scenarioAntiCorruption` (5 temps) ajouté ; asserts `POTION_RECIPES.length` 26→29 (4 sites). `node tests/smoke.js` **vert (250)**, `units.js` vert (897), `check_doc_modules` OK. **Bump PWA** : data/inventory/state/save/npcs/quests-templates/item-icons + `CACHE_VERSION` v189→v190 (skill `cache-bump`, `check_cache_versions` + `pwa-smoke` verts). |
| 2026-06-20 | **Affinage (feu vert utilisateur)** : décision ❓1 **résolue → les 9 formes en scope**. §1.5 refait (table figée : effet→branche ⚙️, ingrédients fixés, `corruptionRisk`, lot) + §1.5bis (esquisses JSON). §1.12 = **table maître complète** (17 ajouts : 14 items + Philtre + 4 Premium). §2.7 mappe chaque forme à son lot (P7 anti-corr · P8 Philtre/évolutif · P9 Premium+Résilience · P10 Corruption Contrôlée · P12 Vision/Écho/Huiles/Poudres). **Reste 5 ❓** (purge lieu, intensité sideEffect, accès Premium, bonus atelier, coeffs évolutif) — calibration/policy, non bloquantes pour P7. Toujours document `.claude/` uniquement. |
