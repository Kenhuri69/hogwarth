# Potions, Consommables & Craft 2.0 — Spécifications & Plan d'implémentation

> **Branche** : `claude/hogwarth-potions-crafting-yc5tcy`
> **Statut** : 🟡 **SPÉCIFICATION & PLAN — en attente d'arbitrage des ❓ avant impl.**
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

## 1.5 Nouvelles formes (potions signature)

> Toutes **craftées** sauf mention. Effets exprimés via le moteur existant quand
> possible ; les ⚙️ marquent une **nouvelle branche d'effet** à ajouter (§2.5).

| Potion | `category` | Effet | ⚙️ ? | Ingrédients (proposés) | Disponibilité |
|--------|-----------|-------|------|------------------------|---------------|
| 💡 **Élixir de Lucidité** | `anti_corruption` | `corruptionPurge` : −3 `spellCorruption`, hors combat | ⚙️ `purge_corruption` | dictame×2 + asphodèle_noire×1 | Craft (Boucle) + Apothicaire Tén. |
| 💡 **Baume du Patronus** | `anti_corruption` | −2 corruption **et** soigne `fear`/`gel` du groupe | ⚙️ (réutilise `cure` + purge) | dictame×1 + branchiflore×1 + armoise×1 | Craft · quête signature Poufsouffle |
| 💡 **Potion de Corruption Contrôlée** | `buff` | +X MAG & +X% dégâts sorts N tours **mais** `corruptionRisk:2` | réutilise `temp_buff` + risk | asphodèle_noire×2 + aconit×1 | Craft (Boucle) — high-risk/high-reward |
| 💡 **Potion de Résilience Maison** | `buff` | Buff dont l'ampleur dépend de `chosenHouse` (Gryff ATK / Slyth MAG-lifesteal / Serd PM / Pouf DEF+régén) | ⚙️ `house_buff` | herbe T2 + relique/ingrédient Maison | Craft · quête Chef de Maison |
| 💡 **Potion d'Écho Temporel** | `utilitaire` | Hors combat : annule le **dernier déplacement/dégât de salle** (mini Reliquae). En combat : repose un buff expiré | ⚙️ `temporal_echo` | dictame×2 + retourneur (ingrédient rare) | Craft · rare (synergie Reliquae Temporis) |
| 💡 **Potion de Vision des Éclats** | `utilitaire` | Révèle coffres/jardins/Éclats & cases cachées de l'étage (mini-Revelio large) + bonus de fouille N pas | ⚙️ `reveal_treasures` | branchiflore×1 + ortie×1 | Craft + boutique (étage ≥3) |
| 💡 **Huile d'Arme (feu/givre/foudre)** | `debuff`/`buff` | Enduit l'arme : +X dégâts **élémentaires** sur les attaques **physiques** N tours (consommable de prépa) | ⚙️ `weapon_oil` | herbe élément + huile de base | Craft + Forgeron (Ruines) |
| 💡 **Poudre Runique (étourdissante/aveuglante)** | `debuff` | Jetée : applique `stun`/`fear` à **tout le groupe ennemi** sans dégâts (contrôle pur) | ⚙️ étend `throw` (statut AoE, 0 dmg) | aconit×1 + page_grimoire×1 | Craft (Ruines) — coûteux |
| 💡 **Élixir d'Immunité** | `anti_corruption` | Bloque le **prochain** effet secondaire/corruption subi (charge) | ⚙️ `ward_charge` | dictame×1 + asphodèle×1 | Craft · quête Serdaigle |

> ❓ **À valider** : faut-il livrer **les 9** ou un **sous-ensemble MVP** ? Voir
> §3 (proposition : MVP = Lucidité, Corruption Contrôlée, Résilience Maison,
> Vision des Éclats, Huiles d'arme — couvre les 4 trous majeurs).

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

## 1.12 Table de synthèse maître (extrait MVP)

| Potion | Catégorie | Effet | Coût / Ingrédients | Variante Premium | Disponibilité | Synergies |
|--------|-----------|-------|--------------------|--------------------|---------------|-----------|
| Élixir de Lucidité 💡 | anti_corruption | −3 corruption | dictame×2 + asphodèle_noire×1 | — | Craft Ruines + Apothicaire Tén. | sorts corrompus |
| Corruption Contrôlée 💡 | buff (évolutif) | +MAG/dégâts sorts, risk:2 | asphodèle_noire×2 + aconit×1 | par Maison | Craft Boucle | Set Ténèbres, corruption |
| Résilience Maison 💡 | buff | buff selon `chosenHouse` | herbe T2 + ingrédient Maison | = la potion (4 colos) | Quête Chef de Maison | reliques + passif Maison |
| Vision des Éclats 💡 | utilitaire | révèle étage + fouille | branchiflore×1 + ortie×1 | — | Craft + shop ≥3 | niffleurs, jardins, coffres |
| Huile d'Arme (×3) 💡 | debuff/buff | +dégâts élém. phys. N t | herbe élément + huile | — | Craft + Forge | combos, armes |
| Poudre Runique (×2) 💡 | debuff | stun/fear AoE ennemis | aconit + page_grimoire | — | Craft Ruines | contrôle, sorts |
| Élixir du Lion Ardent 💡 | buff (Premium) | +ATK +crit | base potion_force + colo Gryff | — | Quête McGonagall | reliques Gryffondor |
| Philtre du Mage 💡 | mana (évolutif) | +PM × pièces caster | herbe T3 + Éclat | — | Craft | `formType` baton/grimoire |

*(Table maître complète des ~15 ajouts à figer à l'implémentation, après §3.)*

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

| Lot | Contenu | Effort | Risque | Dépend |
|-----|---------|--------|--------|--------|
| **P7** | champs data + `category` + anti-corruption (Lucidité, Immunité) | ~1 j | faible | — |
| **P8** | `evolves` + `potionEvolveMult` + synergies déclaratives | ~1 j | faible | P7 |
| **P9** | Premium ×4 Maisons + quêtes signature + `fx` | ~2 j | moyen | P7 |
| **P10** | `corruptionRisk` + `sideEffect` Boucle + `wardCharges` | ~1,5 j | moyen | P7 |
| **P11** | Chaudron des Ruines + `workshopLevel` + cellule | ~1,5 j | moyen | — |
| **P12** | huiles d'arme, poudres runiques, Écho Temporel, Vision des Éclats | ~2 j | moyen | P7 |
| **P13** | calibration `tools/sim-difficulty.js` + pass éco | ~1 j | faible | tous |

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

1. ❓ **Périmètre des nouvelles formes** : livrer les **9** (§1.5) ou le **MVP 5**
   (Lucidité, Corruption Contrôlée, Résilience Maison, Vision des Éclats, Huiles) ?
   *Proposition : MVP 5 d'abord, le reste en P12.*
2. ❓ **Anti-corruption** : la purge agit-elle **uniquement** sur `spellCorruption`
   (combat), ou aussi cosmétiquement sur la corruption de **lieu** (ambiance) ?
   *Proposition : combat seulement (gameplay), un VFX léger d'ambiance en bonus.*
3. ❓ **Intensité des `sideEffect` Boucle** : plafond proposé ≤ 15 % d'une stat,
   ≤ 2 tours, jamais sur PV, jamais « perte de tour » non télégraphiée. OK ?
4. ❓ **Premium** : une seule Premium « facile » par partie (celle de
   `chosenHouse`), les autres en Boucle/Marchand. OK ?
5. ❓ **Chaudron des Ruines** : bonus de jet (−1 difficulté) au `workshopLevel 2` ?
6. ❓ **Évolutif** : coefficients (`perStep`/`cap`) à figer par simulation — OK
   pour calibrer en P13 plutôt que deviner maintenant ?

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
| 2026-06-20 | **Document rédigé** après audit complet du système existant. Constat : base + craft + enrichissement P0→P6 **déjà livrés** (26 recettes, 7 herbes, codex, maîtrise, buffs, flacons offensifs, upgrade-craft, jardin, Slug Club). Cette finalisation cible les **7 trous** : anti-corruption, Premium par Maison, évolutif, risques/effets secondaires Boucle, formes signature, Chaudron des Ruines, synergies explicites. ÉTAPE 1 (specs+contenu) et ÉTAPE 2 (plan d'impl., lots P7→P13) posées. **6 décisions ❓ en attente d'arbitrage avant P7.** Aucune ligne de code modifiée (document `.claude/` uniquement → pas de bump PWA ni smoke requis, guidelines §7/§8). |
