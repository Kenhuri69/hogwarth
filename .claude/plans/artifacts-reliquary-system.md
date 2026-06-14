# Artefacts & Reliquaires 2.0 — Spécifications & Plan d'implémentation

> **Branche** : `claude/hogwarth-artifacts-system-we6nvv` (P0) ·
> `claude/hogwarth-artifacts-p1-em6jln` (P1)
> **Statut** : 🟢 **Lots P0 + P1 livrés** (P0 2026-06-14 socle data inerte ;
> P1 2026-06-14 nouvelles formes §1.4 A/B + leviers combat + icônes). Lots P2→P3 à venir.
> **Périmètre** : faire des Artefacts/Reliquaires un **pilier de personnalisation
> et de progression**, sans casser l'économie ni l'architecture zéro-build.
> **Canon de référence** : chapitres [05](../../docs/histoire/05-personnages-jouables.md),
> [07](../../docs/histoire/07-les-maisons.md), [08](../../docs/histoire/08-quetes-et-sous-intrigues.md),
> [09](../../docs/histoire/09-bestiaire-et-lore.md), [10](../../docs/histoire/10-lieux-et-geographie.md),
> [11](../../docs/histoire/11-mondes-paralleles.md), [12](../../docs/histoire/12-glossaire-et-codex.md),
> [13](../../docs/histoire/13-equilibre-difficulte-progression.md), [14](../../docs/histoire/14-scenarios-de-fin.md).

---

## 0. Contexte & règle d'or

Le jeu n'a **ni modules ES ni bundler** : tout est `<script>` séquentiel partageant
le scope global, servi en `file://`/GitHub Pages. Le moteur d'équipement repose sur
**11 slots fixes** (`wand, head, body, hands, feet, cloak, amulet, ring1, ring2,
belt, trinket`) et `recalculateStats()` (inventory-core.js) qui **itère
dynamiquement** sur `c.equipped` — donc **tout nouvel artefact est gratuit côté
moteur tant qu'il réutilise un slot et les champs `bonus*` existants**.

> 💡 **Décision structurante n°1** : les « nouvelles formes » demandées (orbes,
> capes, grimoires, bâtons, cristaux, talismans, masques, gantelets…) ne sont
> **pas** de nouveaux slots — ce serait une refonte lourde et risquée (cf.
> `equipment-extended.md`, Phase 1-4). Ce sont de **nouveaux archétypes
> visuels/sémantiques** (`formType`) **mappés sur les slots existants**. On
> enrichit la *fiction* et le *visuel*, pas la plomberie.

> ✅ **Règle d'or équilibre** (Ch.13 §13.6 #6) : les artefacts sont un **axe de
> progression ADDITIF**. On **n'altère jamais** le scaling des monstres. Un
> artefact rend le joueur plus fort ; il ne rend pas l'ennemi plus faible.

---

## ÉTAPE 1 — Spécifications & production de contenu

### 1.1 Audit de l'existant (✅ socle déjà en place)

| Brique | État | Détail |
|--------|------|--------|
| Slots d'équipement | ✅ | 11 slots, `_resolveSlotForItem`, paper-doll v2 |
| Raretés | ✅ | `common / rare / epic / legendary` utilisées ; `uncommon` **défini mais inutilisé** (`rarityRank` shop.js) → gap à combler |
| Champs `bonus*` | ✅ | atk/def/mag/lck/str/int/agi/end, critChance/Damage, spellCrit*, dodge, fortune, celerite, hpMax/spMax, regenHp/Sp, **bonusGoldMult**, **fearImmune**, grantsSpell, setKey/setPiece |
| Reliques de Maison | ✅ | légendaires palier 1000 + paliers Légende/T5 (sword_gryff, locket_slytherin, diademe_serdaigle, coupe_poufsouffle, lame_godric, bague_salazar, codex_rowena, bouclier_helga) |
| Reliques signature | ✅ | banniere_godric, langue_de_plomb, codex_rowena, coeur_refuge (remises **cérémonielles** via `pendingHouseRewards`, [08 §8.5](../../docs/histoire/08-quetes-et-sous-intrigues.md)) |
| Set Ténèbres / Set Voyageur | ✅ | drops Boucle + Atelier (Essence d'Outremonde) |
| Shops | ✅ | `SHOP_CATALOG` (Madame Malkins, stock tournant `_rollShopStock`), vendeurs PNJ (`wares`), `_endgameItemPrice` (rarityScales ×1.5ⁿ, priceMultiplier vendeur), buyback typé |
| Codex | ✅ | catégorie `objets`, déverrouillage par `item`/`quest`/`echo`, variantes Maison |
| Reliques de la Mort | 💡 | easter egg **non scénarisé** (wand2 / cape_invis / anneau_resurrection) — [12 §12.8](../../docs/histoire/12-glossaire-et-codex.md) |

> ❓ **À arbitrer (porté du Codex §12.8.609)** : les Reliques de la Mort
> restent-elles allusives, ou deviennent-elles un **méta-objectif traçable**
> (les 3 réunies → titre cosmétique) ? *Proposition retenue ci-dessous* :
> méta-objectif **cosmétique léger** (titre + entrée Codex), zéro stat ajoutée,
> pour ne pas concurrencer la trame Voldemort.

### 1.2 Principes directeurs

1. **Un artefact = une intention de build**, pas un stat-stick générique. Chaque
   pièce doit répondre à la question « *quel fantasme de jeu sert-elle ?* ».
2. **Cohérence Maison** (`houseAffinity`) : un artefact peut « pencher » vers une
   Maison (visuel + petit avantage d'accès en shop), sans **jamais** être bloqué
   à une autre Maison (anti-frustration ; la Maison module l'*accès*, pas le
   *droit de porter*).
3. **Le prix raconte la rareté** : table de coût unique (§1.6) ; les pièces les
   plus fortes ne s'**achètent pas** (quête / exploration / Boucle).
4. **Premium ≠ nouvelle rareté** : c'est une **variante coloriée + boostée** d'un
   artefact de base, gatée par contenu (jamais par or pur, sauf exclusivité
   Marchand d'Ombre). Évite l'inflation d'une 6ᵉ rareté.
5. **Surgical** : réutiliser `formType`/`tint`/`grantsSpell`/`bonus*`/set-system ;
   n'ajouter de champ que si un effet ne peut pas s'exprimer avec l'existant.

### 1.3 Diversification des formes — `formType`

Champ **cosmétique/sémantique** posé sur chaque artefact, orthogonal au `slot`
mécanique. Pilote : icône painterly dédiée, libellé de catégorie en fiche,
FX d'équipement, filtre futur d'inventaire.

| `formType` | Slot mécanique | Fantasme | Nouveau ? |
|------------|----------------|----------|-----------|
| `baguette` | `wand` | offensif baguette classique | ✅ existe |
| `baton` (**Bâton ancestral**) | `wand` | caster lourd MAG, lent mais fort | 💡 nouveau |
| `orbe` (**Orbe runique**) | `trinket` | focalise un élément (bonus dégâts élémentaires) | 💡 nouveau |
| `cristal` (**Cristal de focalisation**) | `trinket`/`amulet` | −coût de sort / +crit de sort | 💡 nouveau |
| `cape` (**Cape enchantée**) | `cloak` | esquive/AGI/celerité | ✅ slot, 💡 archétype enrichi |
| `grimoire` (**Grimoire flottant**) | `trinket` | INT/MAG + révèle (Legilimens-like passif léger) | 💡 nouveau |
| `talisman` (**Talisman des Fondateurs**) | `amulet` | identité Maison, régen | 💡 nouveau |
| `masque` (**Masque rituel**) | `head` | risque/récompense (gros bonus + petit malus) | 💡 nouveau |
| `gantelets` (**Gantelets de combat**) | `hands` | ATK/STR/pénétration | 💡 nouveau |
| `anneau` | `ring` | divers | ✅ existe |
| `relique_vocale` (**Relique vocale**) | `trinket` | passif lié à une Voix de Fondateur + sample audio | 💡 nouveau |
| `elixir_perma` (**Élixir permanent**) | — (consommable) | stat permanente rare | ✅ existe (`elixir_perma_*`, `pierre_ame`) → enrichi |

> ✅ Aucune de ces formes ne crée de slot : `baton`→wand, `orbe/grimoire/cristal/
> relique_vocale`→trinket, `cape`→cloak, `talisman`→amulet, `masque`→head,
> `gantelets`→hands. `recalculateStats` les traite **sans modification**.

### 1.4 Catalogue d'artefacts proposés (contenu neuf)

Stats **indicatives**, calibrées sur la courbe existante (§1.6). `prix 0` = non
vendable (récompense). Tous réutilisent des `bonus*` existants sauf mention.

#### A. Mid-game (Actes I-II, étages 3-7) — comble le gap `uncommon`/`rare`

| id | Nom | form | slot | rareté | bonus | prix | dispo |
|----|-----|------|------|--------|-------|------|-------|
| `orbe_flamme` | Orbe de Flamme | orbe | trinket | uncommon | `bonusElemDmg:{feu:0.15}` MAG+1 | 220 | shop ét.4 |
| `orbe_givre` | Orbe de Givre | orbe | trinket | uncommon | `bonusElemDmg:{glace:0.15}` MAG+1 | 220 | shop ét.4 |
| `cristal_focalisation` | Cristal de Focalisation | cristal | amulet | rare | MAG+2 · `bonusSpellCritChance:4` · `spCostReduction:1` | 320 | shop ét.5 |
| `gantelets_combat` | Gantelets de Combat | gantelets | hands | rare | ATK+3 STR+2 · `bonusStrPen` léger | 300 | shop ét.5 + drop élite |
| `baton_apprenti` | Bâton d'Apprenti | baton | wand | uncommon | ATK+2 MAG+3 (lent : `noCounter`) | 260 | shop ét.4 |
| `cape_funambule` | Cape du Funambule | cape | cloak | rare | AGI+3 · `bonusCelerite:4` · esquive+3% | 360 | shop ét.6 |
| `masque_courage` | Masque du Courage | masque | head | rare | ATK+5 mais DEF−2 (trade-off) | 300 | shop ét.6 + drop |
| `grimoire_flottant` | Grimoire Flottant | grimoire | trinket | rare | INT+4 MAG+2 · révèle l'ennemi au 1ᵉ tour | 380 | coffre ét.5-7 |

#### B. Endgame (Acte III, étages 8-10)

| id | Nom | form | slot | rareté | bonus | prix | dispo |
|----|-----|------|------|--------|-------|------|-------|
| `baton_ancestral` | Bâton Ancestral | baton | wand | epic | ATK+6 MAG+8 · `bonusSpellCritDamage:0.25` | 1300 | Forgeron Ténébreux + drop boss |
| `talisman_fondateurs` | Talisman des Fondateurs | talisman | amulet | epic | MAG+4 DEF+4 · régen +2 PV/+1 PM | 1200 | quête / Marchand |
| `masque_rituel` | Masque Rituel | masque | head | epic | MAG+8 · `bonusSpellCritChance:8` mais PV max−5 | 1100 | Hogsmeade corrompu |
| `gantelets_aurors` | Gantelets des Aurors | gantelets | hands | epic | ATK+5 STR+3 · crit phys.+6% | 1000 | drop boss ét.10 |
| `orbe_runique` | Orbe Runique | orbe | trinket | epic | `bonusElemDmg:{tous:0.10}` MAG+3 | 1200 | Ruines (exploration) |

#### C. Reliques vocales (4 — endgame / Boucle, **non vendables**)

Liées aux **Voix des Fondateurs** (codex `voix_godric/salazar/rowena/helga`,
échos Boucle). Équipées → passif léger + jouent le sample voix à l'équipement.

| id | Nom | houseAffinity | passif | déblocage |
|----|-----|---------------|--------|-----------|
| `voix_godric_relique` | Murmure de Godric | Gryffondor | ATK+4 · `fearImmune` partiel | écho `echo_godric` vu + Boucle |
| `voix_salazar_relique` | Murmure de Salazar | Serpentard | MAG+4 · `spellLifesteal:0.08` | écho `echo_salazar` |
| `voix_rowena_relique` | Murmure de Rowena | Serdaigle | INT+4 · `spCostReduction:1` | écho `echo_rowena` |
| `voix_helga_relique` | Murmure de Helga | Poufsouffle | DEF+4 · régen +2 PV/pas | écho `echo_helga` |

> 💡 Les 4 réunies (collectées en plusieurs Boucles) → entrée Codex « Le Chœur
> des Fondateurs » + titre cosmétique de profil (§1.8).

#### D. Élixirs permanents enrichis (consommables rares)

`elixir_perma_hp/mp`, `pierre_ame`, `philtre_endurance` existent déjà
(`rarityScales`). 💡 Ajouts cohérents avec les sinks endgame existants :

| id | effet | base | dispo |
|----|-------|------|-------|
| `elixir_perma_fortune` | +2 LCK permanent | 3000 (rarityScales) | Marchand d'Ombre |
| `elixir_perma_celerite` | +2 AGI permanent | 3000 (rarityScales) | Marchand d'Ombre |

### 1.5 Versions Premium (variantes coloriées + boostées)

**Définition** : une variante d'un artefact de base, **recoloriée par Maison**,
aux stats **majorées de +20 % (rare) / +35 % (epic) / +50 % (legendary)**, avec
FX/son distincts. **Jamais achetable à l'or** (sauf exclusivité Marchand
d'Ombre, prix prohibitif `rarityScales`). C'est la **récompense d'engagement**
(quêtes signature, Ruines, hauts paliers de Boucle).

| Maison | Coloration (`tint`) | FX visuel | Son d'équipement |
|--------|---------------------|-----------|------------------|
| Gryffondor | Aura dorée `#d3a625` | étincelles or, halo chaud | accord cuivre montant |
| Serpentard | Vert émeraude `#1a472a` | brume verte, reflet écaille | sifflement grave |
| Serdaigle | Bleu éthéré `#0e1a40` | particules bleues lentes | carillon cristallin |
| Poufsouffle | Terre cuite `#f0c75e` | lueur ambre stable | note de cor douce |

**Stat-boost** (decision §2.1) : **pré-cuit dans l'entrée ITEMS** (stats ×mult
arrondies), tag `premium:true, premiumOf:"<baseId>", houseAffinity`. Évite tout
multiplicateur runtime dans `recalculateStats` (surgical, testable).

> Exemple : `orbe_runique_premium_gryff` = `orbe_runique` (epic, +35 %) →
> MAG+4 (3→4), `bonusElemDmg:{tous:0.135}`, `tint:"#d3a625"`, `premium:true`,
> `premiumOf:"orbe_runique"`, `houseAffinity:"Gryffondor"`, prix 0.

**Conditions d'obtention** (synthèse) :
- **Quêtes signature de Maison** ([08 §8.5](../../docs/histoire/08-quetes-et-sous-intrigues.md)) → la Premium de la Maison du joueur.
- **Exploration Ruines Anciennes** (étages 14+, Boucle) → coffres Premium aléatoires.
- **Hauts paliers de Boucle** (Apothéose ★ N) → drop Premium des boss Ténébreux.
- **Fil rouge « Éclats »** (§1.8) → une Premium « des Fondateurs » au climax.

### 1.6 Rééquilibrage des coûts — table de cohérence globale

Formule de référence (documentaire, pour arbitrer les prix) :

```
prix ≈ powerBudget(stats) × rarityMult × actMult
rarityMult : common 1.0 · uncommon 1.3 · rare 1.8 · epic 3.0 · legendary 5.0
actMult    : Acte I (ét.1-3) 1.0 · Acte II (4-6) 1.4 · Acte III (7-10) 2.6 · Boucle (11+) 4.0
powerBudget : ~Σ(points de stat × poids) — 1 pt primaire ≈ 35 G base, 1 pt secondaire ≈ 20 G,
              1 % crit ≈ 12 G, 1 regen ≈ 40 G, grantsSpell ≈ +150 G
```

| Rareté | Couleur bordure | Plage de prix (achat) | Politique |
|--------|-----------------|------------------------|-----------|
| common | gris | 30–170 G | shop libre, stock tournant |
| uncommon | vert | 150–280 G | **NOUVEAU palier** : comble ét.3-5 |
| rare | bleu | 200–950 G | shop + drop élite |
| epic | violet | 380–6000 G | shop endgame + Hogsmeade corrompu |
| legendary | or | **non vendable (prix 0)** ou 8000+ `rarityScales` | quête/palier/Boucle |
| **Premium** | or pulsé + `tint` Maison | **non vendable** (récompense) ou Marchand d'Ombre `rarityScales` | contenu only |

> ✅ **Cohérence rétro** : les prix existants tombent déjà dans ces plages ; le
> rééquilibrage **n'abaisse aucun prix actuel** (ne casse pas l'éco). Il
> **ajoute** le palier `uncommon` (vide aujourd'hui) et **encadre** les neufs.
> Anti-farm : les pièces fortes restent gold-sinks `rarityScales` ou non-achat.

> 💡 Quelques **ajustements ciblés** (à confirmer par `tools/sim-difficulty.js`,
> §2.5) : `pendentif_ombre` (6000 G, epic) et `reliquaire_lunaire` (8000 G,
> legendary) sont des sinks sains — **laissés tels quels**. Aucune baisse de prix
> proposée : l'économie endgame est déjà tendue (cf. `game-economy-gold-audit.md`).

### 1.7 Mise à jour des Shops PNJ

Répartition **logique par marchand** (la fiction porte la disponibilité) :

| Marchand | Rôle | Formes vendues | Stock dynamique |
|----------|------|----------------|-----------------|
| **Madame Malkins** (fixe) | généraliste cachots | common/uncommon/rare classiques (robes, gants, bottes, baguettes basiques) | `_rollShopStock` (déjà tournant ; **+ affinité Maison**) |
| **Ollivander** (ét.3) | baguettier | `baguette` + 💡 **`baton`** (nouvelle forme baguette) | wares enrichies |
| **Guipure** (ét.5) | couture | `cape`, `masque`, `head`, `body` | wares enrichies |
| 💡 **Apothicaire des Reliques** (NOUVEAU, ét.6-7) | curiosités | `orbe`, `cristal`, `grimoire`, `talisman` mid-tier | wares + 1 slot Premium si Maison match |
| **Hogsmeade corrompu** (Apothicaire/Forgeron Ténébreux, ét.9-10) | artefacts corrompus/puissants | `masque_rituel`, `baton_ancestral`, gantelets epic, élixirs perma | prix prohibitifs, `priceMultiplier` |
| **Marchand d'Ombre** (itinérant, Boucle 11+) | exclusivités | élixirs perma, **1 Premium exclusive** `rarityScales` | déjà `priceMultiplier 1.4` |
| **Chef de Maison** | accès anticipé | la Premium de la Maison du joueur (récompense, pas vente) | `pendingHouseRewards` |

**Stock dynamique selon progression ET Maison** (💡 nouveauté clé) :
- `_rollShopStock` réserve **1 slot « affinité »** : si un artefact `houseAffinity
  === chosenHouse` est éligible à l'étage, il est **garanti** dans le tirage
  (priorité avant le remplissage aléatoire), avec un **bandeau « ⚜ Faveur de
  Maison »** et une **remise de 10 %** (`houseAffinityDiscount`).
- Les formes corrompues (Hogsmeade) n'apparaissent **qu'aux étages 9+** ou en
  Boucle (gate `currentFloor`/`victoryAchieved`).

### 1.8 Intégration Quêtes & Codex

**Quêtes signature → Premium** (réutilise `pendingHouseRewards`, remise
cérémonielle, [08 §8.5](../../docs/histoire/08-quetes-et-sous-intrigues.md)) :

| Quête signature | Récompense actuelle | 💡 Ajout Premium |
|-----------------|---------------------|------------------|
| 🦁 L'Étendard de Godric | `banniere_godric` | Premium dorée d'un orbe/talisman Gryffondor au climax |
| 🐍 Le Pacte des Cachots | `langue_de_plomb` | Premium émeraude (cristal/talisman) |
| 🦅 Le Savoir de l'Aigle | `codex_rowena` | Premium bleu éthéré (grimoire) |
| 🦡 Le Serment du Blaireau | `coeur_refuge` | Premium terre cuite (talisman défensif) |

**Fil rouge « Éclats »** (💡 nouveau, optionnel) : une fois `eclats_clef_voute`
résolue **et** les 4 échos de Fondateurs vus, le joueur peut forger (Atelier /
chef de Maison) **une Premium « des Fondateurs »** de sa Maison — clou narratif
qui relie reliques + voix + trame.

**Codex** (catégorie `objets`, modèle `sword_gryff` §12.4.10) : **une entrée par
nouvel artefact majeur**, déverrouillée par `{type:'item', value:'<id>'}`, avec :
- `textVersions.veiled` (description + lore court),
- `textVersions.revealed` (évolution / révélation, gatée par `eclat`/`echo`),
- `variants.house` (ligne spéciale si Maison affine).
- 💡 Entrée **« Le Chœur des Fondateurs »** (4 reliques vocales réunies) +
  entrée **« Les Reliques de la Mort »** (méta-objectif cosmétique, §1.1 ❓).

---

## ÉTAPE 2 — Plan d'implémentation

### 2.1 Structure de données (nouveaux champs ITEMS)

Ajoutés aux entrées de `js/data.js — ITEMS` (rétro-compatibles : tous optionnels,
ignorés s'ils sont absents) :

```js
{
  // … champs existants (id, name, type, slot, rarity, bonus*, price, tint) …
  formType:    "orbe",            // archétype cosmétique/sémantique (§1.3)
  houseAffinity: "Gryffondor",    // null | "Gryffondor"|"Serpentard"|"Serdaigle"|"Poufsouffle"
  premium:     true,              // variante Premium (coloriée + boostée)
  premiumOf:   "orbe_runique",    // id de l'artefact de base (traçabilité Codex/forge)
  questRewardFlag: "gryff_signature", // remise cérémonielle (non vendable) — facultatif
  // ── nouveaux bonus (uniquement si l'effet n'existe pas déjà) ──
  bonusElemDmg:    { feu: 0.15 }, // +% dégâts d'un/des élément(s) de sort
  spCostReduction: 1,             // −N PM sur le coût des sorts (plancher 1)
  premiumFx:   "gryff",           // clé d'effet visuel/son à l'équipement
}
```

> 💡 **Décision n°2 — Premium pré-cuit, pas runtime** : les stats Premium sont
> écrites en dur (base × mult arrondi) dans l'entrée. Avantage : zéro changement
> dans `recalculateStats` (qui itère déjà `bonus*`), testable, diff lisible.
> ❓ Alternative écartée : champ `premiumMult` appliqué au runtime → touche un
> chemin chaud partagé par ~13 modules, risque de régression > bénéfice.

> `bonusElemDmg` / `spCostReduction` sont les **seuls** nouveaux leviers
> mécaniques. Ils se branchent dans `battle-spells.js` (`_spellElementalDamage`,
> `_spellSpCost`) — chemins déjà existants, ajout d'un terme additif.

### 2.2 Variables & flags

| Flag / var | Lieu | Rôle | Sérialisé ? |
|------------|------|------|-------------|
| `ARTIFACT_FORMS` | data.js | registre `formType → {label, defaultSlot, icon}` (doc + UI) | non (inerte) |
| `PREMIUM_MULT` | data.js | `{rare:1.20, epic:1.35, legendary:1.50}` (référence génération) | non |
| `houseAffinityDiscount` | shop.js | const `0.90` (−10 % slot faveur) | non |
| `ownedFounderVoices` | state.js | `Set` des reliques vocales obtenues (Codex « Chœur ») | ✅ |
| `deathlyHallowsSeen` | state.js | bool — 3 Reliques de la Mort réunies (titre cosmétique) | ✅ (profil) |
| `endgamePurchases[id]` | state.js | **existe déjà** — réutilisé pour Premium `rarityScales` | ✅ |

> Les reliques vocales et le titre Reliques de la Mort vont dans le **profil
> persistant** (`profile.js`, `hogwarts_rpg_profile`) si l'on veut qu'ils
> survivent à une mort/New Game+ (cosmétique cross-run), sinon dans la save.
> ❓ À trancher : profil (cross-run) vs save (par partie). *Proposition* : profil
> pour le **titre** Reliques de la Mort, save pour les **reliques vocales**
> équipables.

### 2.3 Intégration shops (stock conditionnel, prix dynamiques, affinité)

1. **Nouvelles entrées `SHOP_CATALOG`** (`minFloor`) pour les artefacts §1.4 A/B
   vendables. Formes corrompues : `minFloor: 9` (ou gate `victoryAchieved`).
2. **Slot « faveur de Maison »** dans `_rollShopStock` :
   ```js
   // après filtrage eligible, avant _pickRandom :
   const favorite = eligible.find(e => {
     const it = ITEMS.find(i => i.id === e.id);
     return it && it.houseAffinity && it.houseAffinity === chosenHouse;
   });
   // garantir `favorite` dans le stock + prix × houseAffinityDiscount + bandeau ⚜
   ```
3. **Prix dynamiques** : Premium exclusives Marchand d'Ombre → `rarityScales:true`
   (réutilise `_endgameItemPrice`, ×1.5ⁿ). Hogsmeade corrompu → `priceMultiplier`.
4. **Nouveau PNJ** « Apothicaire des Reliques » (ét.6-7) dans `npcs.js` (`wares`)
   — modèle `ollivander`/`guipure`. Aucun moteur neuf (réutilise `openVendorShop`).
5. **Rendu** : badge `formType` + bandeau Premium (`tint` Maison) dans
   `_renderBuyGrid` (réutilise le pattern `rareTag`).

### 2.4 Système de récompenses de quêtes (Premium)

Réutilise **intégralement** le pipeline cérémoniel existant
(`pendingHouseRewards` → modale de remise) déjà câblé pour les reliques
signature ([08 §8.5](../../docs/histoire/08-quetes-et-sous-intrigues.md)) :
- À la complétion d'une quête signature, **pousser la Premium de `chosenHouse`**
  dans `pendingHouseRewards` (en plus de la relique actuelle, ou en remplacement
  selon arbitrage design — ❓).
- Coffres Ruines Anciennes (`movement-interactions.js — openChest`) : table de
  loot Premium aléatoire gatée `currentFloor >= 14`.
- Boss Ténébreux (Boucle, `monsters.js — drops`) : `{itemId:"<premium>", chance:…}`
  gaté par variant `darkness` + Apothéose.

### 2.5 Scaling difficulté (Ch.13) & Boucle (Ch.11)

- ✅ **Aucune altération du scaling monstres** (règle d'or). Les artefacts restent
  un **axe additif** parmi {niveaux, Forge/Biblio, sets} (Ch.13 §13.6, §13.9).
- **Boucle (Ch.11)** : les Premium et reliques vocales sont des **récompenses de
  Boucle** (Ruines 14+, paliers Apothéose ★ N) → nourrissent la rejouabilité sans
  trivialiser la première descente (gate `victoryAchieved`/`floor`).
- **Validation économie** : faire tourner `tools/sim-difficulty.js`
  (`--stat-rework`, `--endgame`) **avant** de figer les prix/stats Premium pour
  vérifier qu'on ne franchit pas les seuils de clear « kit complet » (Ch.13 §13.x,
  `DIFFICULTY_STUDY.md §8`). Critère : un set d'artefacts Premium ne doit pas
  dépasser le gain d'un palier de Forge 5 + 25 niveaux.

### 2.6 Priorisation (ordre d'implémentation + vérification)

> Ordre demandé : **rééquilibrage coûts → nouvelles formes → Premium → shops**.

| # | Lot | Contenu | Vérification |
|---|-----|---------|--------------|
| **P0** ✅ | **Coûts & socle data** *(livré 2026-06-14)* | table §1.6 figée ; registre `ARTIFACT_FORMS` (12 formes, inerte) + `PREMIUM_MULT` + helper PUR `premiumStat()` ajoutés à `data.js` ; palier `uncommon` documenté (§1.6) | ✅ `node tests/units.js` (614 assertions, bloc #12 `testArtifactSocle`) + smoke Equipment/ShopLimits/TryAddItem/CritDodge/ConsumableStacking verts ; cache bump data.js `?v=33` / `CACHE_VERSION v136` ; `check_cache_versions` + `pwa-smoke` OK |
| **P1** ✅ | **Nouvelles formes (1.4 A/B)** *(livré 2026-06-14)* | 13 entrées ITEMS (8 mid-game A + 5 endgame B) avec `formType` (+ `bonusElemDmg`/`spCostReduction` là où prévu) ; 2 leviers combat branchés (`_spellElementalDamage`, `_spellSpCost`) ; 13 icônes painterly (2 parts neufs `orb.svg`/`mask.svg`) + registres NEW & legacy | ✅ `node tests/units.js` (620) + `node tests/smoke.js` (219 dont `scenarioArtifactForms`) verts ; cache bump data.js `?v=34` / battle-spells `?v=15` / inventory-spells `?v=3` / item-icons `?v=23` / `CACHE_VERSION v139` ; `check_cache_versions` + `pwa-smoke` OK |
| **P2** ✅ | **Premium (1.5)** *(livré 2026-06-14)* | 4 variantes Premium pré-cuites (1/Maison) via `premiumStat` + tags `premium/premiumOf/houseAffinity/premiumFx` ; remise cérémonielle (`HOUSE_PREMIUM` → `pendingHouseRewards` à la Quête Signature + `_houseClaimableItems`) ; FX/son d'équipement défensif (`_premiumEquipFlash` + stinger) ; 4 entrées Codex ; 4 icônes painterly (repli, swappables `--raster`) | ✅ `node tests/units.js` (634) + smoke `scenarioPremiumReward` (stats pré-cuites + remise + équipement) / `ItemIcons` (166 mappés) verts ; cache bump data v35 / codex v10 / inventory v20 / quests v16 / npc-dialog v19 / item-icons v24 / `CACHE_VERSION v142` |
| **P3 (partie 1)** ✅ | **Shops (1.7 cœur)** *(livré 2026-06-14)* | `SHOP_CATALOG` enrichi (10 nouvelles formes vendables, minFloor) + `houseAffinity` sur les formes mid-game + **slot « faveur de Maison »** dans `_rollShopStock` (artefact affin à `chosenHouse` garanti, remise −10 % via `houseAffinityDiscount`, bandeau ⚜) | ✅ `node tests/units.js` + smoke `scenarioHouseFavorShop` (garanti + affinité + remise, 3 Maisons) / `ShopLimits` / `ItemIcons` verts ; cache bump data v36 / shop v14 / `CACHE_VERSION v144` |
| **P3 (partie 2)** ⏳ | **Quêtes & obtention Premium + Codex** | nouveau PNJ Apothicaire des Reliques (`npcs.js wares`) ; obtention Premium en Ruines (coffres ≥14) / drops boss Ténébreux / exclusive Marchand d'Ombre (`rarityScales`) ; Codex **Reliques de la Mort** (méta-objectif cosmétique) + **Chœur des Fondateurs** (dépend des reliques vocales §1.4 C, non implémentées) | à faire |

Chaque lot : **plan amendé** (§5), **smoke vert** (§7), **cache-bump** si JS/CSS
touché (§8), **PR non créée sans demande** (§6).

#### P1 — notes d'implémentation & écarts (2026-06-14)

**Livré** : 13 artefacts dans `ITEMS` (`js/data.js`) — A : `orbe_flamme`,
`orbe_givre`, `cristal_focalisation`, `gantelets_combat`, `baton_apprenti`,
`cape_funambule`, `masque_courage`, `grimoire_flottant` ; B : `baton_ancestral`,
`talisman_fondateurs`, `masque_rituel`, `gantelets_aurors`, `orbe_runique`.
Chacun porte `formType` ; prix conformes à la table §1.6 (palier `uncommon`
inclus). Slots existants réutilisés (aucun slot neuf).

**2 leviers combat** (les seuls demandés, additifs) :
- `bonusElemDmg` → branché dans `_spellElementalDamage` (`battle-spells.js`)
  via helper pur `_artifactElemBonus(char, element)` : somme les bonus de
  l'élément du sort + la clé `tous`, applique `dmg = floor(dmg × (1+Σ))`
  **après** résist/faiblesse/crit. N'affecte que la voie de dégât élémentaire
  (pas lifesteal/curse) — conforme à la fonction nommée au plan.
- `spCostReduction` → branché dans `_spellSpCost` (`battle-spells.js`) via
  helper pur `_artifactSpCostReduction(char)`, **plancher 1**. `_spellSpCost`
  prend désormais un `char` optionnel (défaut `getActiveChar()`). La modale de
  sorts (`inventory-spells.js`) affiche le coût effectif par lanceur (reflète
  aussi désormais l'Apothéose Serdaigle — amélioration de cohérence).

**Icônes** : enregistrées dans `ITEM_ICON_NEW_REGISTRY` (priorité 1) **et**
`ITEM_ICON_REGISTRY` (repli legacy, exigé par `scenarioItemIcons`).
- **Version livrée** (mise à jour P2-branch 2026-06-14) : objets peints par
  **Copilot/DALL·E** sur **fond gris clair**, extraits par la procédure FIABLE
  `tools/sheet_extract.py` (**anti-bave** : retire les composants touchant le
  bord = morceaux du voisin ; **centrage** sur la bbox du sujet nettoyé ;
  **porte QC** : marge/couverture/sujet non vide, exit 1 + planche QC), puis
  encadrés par `tools/icon_factory.py --raster`. Procédure réutilisable
  (Premium/épique) : [`tools/ICON_SHEET_PROCEDURE.md`](../../tools/ICON_SHEET_PROCEDURE.md).
  Sources détourées dans `tools/raster_src/`. Le **fond clair est crucial** (un
  fond sombre rend les objets sombres indétourables car iso-couleur). Bug initial
  corrigé : 1ʳᵉ passe (découpage naïf) → masque décentré + sliver du gantelet
  voisin ; `sheet_extract` l'empêche par construction + QC.
- **Repli/historique** : 13 recettes painterly (`tools/icon_factory.py`) + 2
  parts SVG (`tools/parts/orb.svg`, `tools/parts/mask.svg`) restent dans le
  dépôt — regénérables si une source Gemini disparaît. (Limite connue du
  painterly sur les masques : petites régions internes relightées vers le ton
  du visage → ovales lisses ; c'est pourquoi la version Gemini est préférée.)

**Écarts assumés** (hors périmètre « 2 seuls nouveaux leviers ») :
- `gantelets_combat` : pas de champ `bonusStrPen` (3ᵉ levier non sanctionné).
  Le STR+2 octroie déjà la pénétration de DEF via D4 (`_strPenFrac`).
- `baton_apprenti` : pas de rider mécanique `noCounter` (3ᵉ levier). « Lourd »
  reste du flavor ; ATK+2 MAG+3 sans malus.
- `grimoire_flottant` : pas de passif « révèle l'ennemi » (3ᵉ levier). INT+4
  MAG+2 seul.
- Reliques vocales (§1.4 C) et élixirs perma (§1.4 D) : **non implémentés**
  (le périmètre P1 demandé était §1.4 **A et B** uniquement).
- Variantes Premium (P2) et shops/quêtes (P3) : non touchés.
- Mirror inerte `js/data-icon-recipes.js` (`ICON_RECIPES`) : non mis à jour
  (documentation sans impact runtime, non vérifiée par les tests).

**Option icônes Gemini (outillage prêt)** : `tools/icon_factory.py` gagne un
mode `--raster` qui encadre une icône peinte par LLM image (Gemini / Nano
Banana) avec les **mêmes** passes `pass_halo` (rareté) + `pass_cartouche` +
mipmaps que les icônes par recette — les passes painterly sont sautées. Source :
`tools/raster_src/<id>.png` (détourage damier auto via `dechecker_png`). Permet
de remplacer tout ou partie des 13 icônes painterly sans toucher au JS (chemins
`ITEM_ICON_NEW_REGISTRY` inchangés) ni au cache (`img/` en SWR). Prompts prêts :
[`.claude/plans/artifacts-p1-gemini-prompts.md`](./artifacts-p1-gemini-prompts.md)
; mode opératoire : [`tools/raster_src/README.md`](../../tools/raster_src/README.md).
Les recettes painterly restent le **repli** tant qu'aucune source Gemini n'est
fournie pour un id.

#### P2 — notes d'implémentation & écarts (2026-06-14)

**Livré** : 4 variantes Premium (1/Maison), stats **pré-cuites** (décision §2.1
n°2, jamais de mult runtime), tags `premium/premiumOf/houseAffinity/premiumFx/
tint`, prix 0 (récompense). `HOUSE_PREMIUM` (data.js) mappe Maison → id Premium.
- Gryffondor : `orbe_runique_premium_gryff` (base `orbe_runique` epic ×1.35).
- Serpentard : `masque_rituel_premium_slyth` (base `masque_rituel` epic ×1.35).
- Serdaigle  : `baton_ancestral_premium_serd` (base `baton_ancestral` epic ×1.35).
- Poufsouffle: `talisman_fondateurs_premium_pouf` (base `talisman_fondateurs` epic ×1.35).

**Remise cérémonielle** (réutilise le pipeline existant) : à la complétion de
la Quête Signature (`quests.js`, après `_markSignatureDone`), la Premium de
`tpl.house` est poussée dans `pendingHouseRewards` ; `_houseClaimableItems`
(npc-dialog.js) l'inclut → le Chef de Maison la remet comme les autres reliques.

**FX/son d'équipement** : `_premiumEquipFlash(premiumFx)` (inventory.js) — flash
plein écran teinté par la Maison (radial-gradient inline, `pointer-events:none`,
try/catch) + stinger `AudioSystem.playSetComplete`/`playChestOpen`. Entièrement
défensif (no-op en file:///smoke). **Pas** de nouvelle méthode CombatFX ni de
nouveau CSS (surgical).

**Codex** : 4 entrées `category:'objets'` (modèle `sword_gryff`), déverrouillées
par `{type:'item'}`, révélées par l'écho du Fondateur (`echo_godric/salazar/
rowena/helga`), avec `variants.house`.

**Écarts assumés** :
- Choix des bases : **4 epic** retenues (boost ×1.35 lisible après arrondi) au
  lieu des suggestions rare §1.8 (`cristal`/`grimoire` rares → ×1.20 souvent
  absorbé par l'arrondi). Serpentard prend `masque_rituel` (très « cachots »),
  Serdaigle `baton_ancestral` (savoir) — déviation thématique mineure vs §1.8.
- Icônes Premium : **painterly** (recolor base + emblème Maison + `sparkles`),
  repli comme en P1 — remplaçables par Gemini via `--raster` (prompts à étendre
  si souhaité).
- **Premium achetables** (1 exclusive Marchand d'Ombre `rarityScales`, §1.5/§3)
  et **coffres Ruines / drops boss Ténébreux** (§2.4) : reportés en **P3**
  (canaux d'obtention = shops/quêtes/Boucle). P2 ne livre que la remise
  cérémonielle de signature.

#### P3 partie 1 — notes d'implémentation (2026-06-14)

**Livré (cœur shop, §1.7/§2.3)** :
- `SHOP_CATALOG` (shop.js) : +10 formes vendables — `orbe_flamme`/`orbe_givre`/
  `baton_apprenti` (ét.4), `cristal_focalisation`/`gantelets_combat` (ét.5),
  `cape_funambule`/`masque_courage` (ét.6), `baton_ancestral`/`masque_rituel`
  (ét.9), `gantelets_aurors` (ét.10). `grimoire_flottant` (coffre) et
  `orbe_runique` (Ruines) volontairement HORS shop.
- `houseAffinity` posé sur les formes mid-game (lean visuel/accès, jamais
  bloquant — §1.2) : Gryff = orbe_flamme/gantelets_combat/masque_courage ;
  Slyth = orbe_givre/cape_funambule ; Serd = cristal/baton_apprenti/grimoire ;
  **Pouf = `talisman_blaireau`** (forme défensive mid-game créée pour combler le
  trou : DEF+3 END+2 régen +1 PV, rare, ét.5, icône painterly repli). Les 4
  Maisons ont donc un slot faveur.
- **Slot « faveur de Maison »** dans `_rollShopStock` : garantit l'artefact affin
  à `chosenHouse`, remise `houseAffinityDiscount` (0.90), bandeau ⚜ dans
  `_renderBuyGrid`. Ne remplace jamais un consommable de soin en dernière
  position (anti-softlock).

**Reporté en P3 partie 2** : PNJ Apothicaire des Reliques ; obtention Premium
(Ruines/Boucle/Marchand d'Ombre) ; Codex Reliques de la Mort + Chœur des
Fondateurs (ce dernier dépend des reliques vocales §1.4 C, non implémentées).

### 2.7 Suggestions d'assets

- **Icônes painterly** (`tools/icon_factory.py`, skill `add-item-icon`) : 1 recette
  par nouvelle forme dans `RECIPES`, parts SVG réutilisables (`feather.svg`,
  `gem-pendant.svg`, `flask.svg`, `chalice.svg`…) ; créer `orb.svg`, `staff.svg`,
  `mask.svg`, `gauntlet.svg`, `floating-book.svg` si absents. Mipmaps 16-64.
- **Variantes Premium** : réutiliser les **palettes Maison standardisées**
  (`icon_factory.py` : Gryffondor `(116,0,1)`/or, Serpentard `(26,71,42)`/argent,
  Serdaigle `(14,26,64)`/bronze, Poufsouffle `(55,46,41)`/or) + emblème incrusté
  (`symbol`: lion/snake/eagle/badger) + `sparkles` (halo Premium).
- **FX visuels** : surcouche `CombatFX`/`DungeonFX` (PURE, défensive) — un flash
  coloré `premiumFx` à l'équipement. Réutilise le pattern halo de rareté.
- **Sons d'équipement** : `AudioSystem.playSpellCast`-like ; 4 stingers Premium par
  Maison (cuivre/sifflement/carillon/cor). Reliques vocales : samples
  `audio/voice/<fondateur>_relique.ogg` (réutilise `playVoice`).

### 2.8 Tests & garde-fous

- `node tests/units.js` — courbes/helpers purs (si `bonusElemDmg`/`spCostReduction`
  passent par un helper pur, l'y tester).
- `node tests/smoke.js` — scénarios `inventory`, `spells`, `combat`, `houses`,
  `npc`, `quests`, `visuals` ; **ajouter** un scénario `scenarioArtifactForms`
  (équipe une nouvelle forme, vérifie le bonus effectif) et
  `scenarioPremiumReward` (remise cérémonielle Premium).
- **MANIFEST loader** : si un nouveau module JS est créé (ex. `artifacts.js`),
  l'ajouter à `index.html`, à la doc « Structure des fichiers » et au MANIFEST.
- **cache-bump** obligatoire (skill `cache-bump`) dès qu'un JS/CSS sert au
  navigateur ; `node tools/check_cache_versions.js --base origin/master`.
- **check_doc_modules** : si modules ajoutés/retirés, `node tools/check_doc_modules.js`.

---

## 3. Récapitulatif décisionnel (à valider avant code)

| ❓ Question ouverte | Proposition par défaut |
|--------------------|------------------------|
| Nouveaux slots ? | **Non** — `formType` sur slots existants |
| Premium = 6ᵉ rareté ? | **Non** — variante coloriée+boostée pré-cuite |
| Premium achetables ? | **Non** (récompense) sauf 1 exclusive Marchand d'Ombre `rarityScales` |
| Stat-boost Premium | **+20 % rare / +35 % epic / +50 % legendary**, pré-cuit |
| Reliques de la Mort | **Méta-objectif cosmétique léger** (titre + Codex), zéro stat |
| Reliques vocales | Save (équipables) ; titre « Chœur » au profil |
| Premium signature : ajout ou remplacement de la relique actuelle ? | **Ajout** (la signature reste, la Premium est un bonus de prestige) — *à confirmer dev* |
| Baisse de prix existants ? | **Aucune** — on ajoute le palier `uncommon`, on n'abaisse rien |

> **Aucune ligne de code n'est écrite tant que ces arbitrages ne sont pas
> confirmés.** Ce document est le plan vivant (§5) : il sera coché/amendé au fil
> de l'implémentation P0→P3.
