# G6 — Sorts

**Statut :** 🟩 à jour — couvre les systèmes récents (relecture design en continu)

> 📊 **Statut réel (code)** : ✅ catalogue, éléments, 3 vecteurs d'apprentissage,
> AoE/utilitaires, Portus, upgrade Bibliothèque — modules : `js/data.js` (`SPELLS`),
> `js/battle-spells.js`, `js/inventory-spells.js`, `js/teleport.js`, `js/library.js`.
> Référence technique : [`CLAUDE.md`](../../CLAUDE.md).

> Objectif du chapitre : décrire le **catalogue complet des sorts** du jeu,
> leur fonctionnement mécanique (formules de dégâts, de soin, d'AoE, de
> vol de vie), les 6 éléments et leurs interactions avec résistances et
> faiblesses, ainsi que les 3 vecteurs d'apprentissage. Vue design, valeurs
> fidèles au code.

---

## Vue d'ensemble

✅ (dans le jeu) Les sorts sont la **ressource premium du combat** : puissants
mais coûteux en PM. Le jeu compte actuellement **43 entrées dans `SPELLS`**
(`data.js`), réparties en grande famille :

- Sorts offensifs élémentaires (cible unique ou zone)
- Sorts de soin et de soutien (cible alliée ou groupe)
- Sorts de contrôle et de désarmement
- Sorts de vol de vie (lifesteal)
- Sorts de malédiction (curse)
- Sorts utilitaires (vol d'or, téléportation, révélation)
- Sorts endgame exclusifs (palier Mythe, Cheminette Inter-Mondes, sorts cross-plan)

Les sorts s'inscrivent dans une **logique de ressources** : chaque héros a un
pool de PM (`spMax`) qu'il dépense tour après tour. La **Garde** (`battle.js`)
restitue `3 + floor(mag/5)` PM par pose — c'est l'alternative au sort quand
les PM manquent. La progression (G3) et les passifs de Maison (G4) agissent
directement sur l'économie de PM et sur les dégâts de sort.

---

## Fonctionnement

### Lancer en combat

✅ (dans le jeu — `castSpellInBattle` dans `battle-spells.js`) En combat, le
héros actif choisit l'action **✨ Sortilège**, qui ouvre la modale `#spell-modal`
filtrée sur ses sorts. Il sélectionne un sort, puis — pour les sorts offensifs
— cible un ennemi via `showTargetSelection`. Le coût en PM est soustrait via
`_spellSpCost(spell)` (qui applique la réduction de 20 % de l'Apothéose
Serdaigle si active).

### Lancer hors combat (SPELL_OOC_HANDLERS)

✅ (dans le jeu — `isOutOfCombatSpell` / `SPELL_OOC_HANDLERS` dans
`inventory-spells.js`) Seuls certains sorts sont utilisables hors combat.
L'ouverture de la modale depuis le bouton 📖 Sorts affiche tous les sorts du
héros, mais avec un tag **« Combat uniquement »** pour ceux non disponibles :

| Effet OOC | Sort(s) | Comportement hors combat |
|-----------|---------|--------------------------|
| `heal` | Episkey, Reparo | Cible auto : l'allié le plus blessé. Cooldown 3 pas après chaque usage. |
| `teleport` | Portus | Ouvre l'overlay de téléportation (`openOutOfCombatTeleport`). |
| `reveal` | Revelio | Dissipe le brouillard sur un carré de rayon 2 + révèle pages de grimoire / jardins. |
| `portal` | Cheminette Inter-Mondes | Animation 2,8 s puis matchmaking ; **refusé en Ironman**. |
| `blood_seal` | Verrou de Sang | Pose une menace en visite (MP — Mondes Parallèles). |
| `voyager_seal` | Sceau du Voyageur | Ancrage astral pour les combats astraux. |
| `outremonde_memory` | Mémoire d'Outremonde | Restauration de début de prochaine visite. |
| `pilgrim_mark` | Marque du Pèlerin | Marque une cellule sur la minimap (visite). |
| `astral_recall` | Rappel Astral | Téléporte à la dernière Marque du Pèlerin. |

### Modale Sorts — filtre + aperçu chiffré

✅ (dans le jeu — `inventory-spells.js`) En tête de la liste : une **barre de
chips** par catégorie (`SPELL_FILTERS`). Seules les catégories dont le héros
possède au moins un sort s'affichent (plus « Tous »). Si le filtre actif
devient vide, la modale retombe automatiquement sur « Tous ».

Sous chaque sort : un **aperçu chiffré** (`spellEffectPreview` dans
`battle-spells.js`) calculé pour le lanceur courant, ex. :
`≈ 18 PV rendus`, `≈ 22 dégâts`, `bouclier 3 tours`.

Les catégories de filtre correspondent à la fonction `spellCategory(spell)`
(`data.js`) : `soutien` et `utilitaire` priment sur l'élément ; sinon c'est
l'élément du sort (`feu`, `glace`, `foudre`, `lumière`, `ténèbres`,
`physique`).

---

## Règles & valeurs

### Formules de base

✅ (dans le jeu — `battle-spells.js`)

| Formule | Expression | Applicabilité |
|---------|-----------|---------------|
| **Dégâts de sort** | `power + floor(MAG / 2)` | Tous les sorts offensifs à cible unique (`spellDamage`) |
| **Soin** | `power + floor(INT / 4) + floor(END / 4)` | Episkey, Reparo, Ferula, Vulnera Sanentur (`healAmount`) |
| **Dégâts AoE** | `power + floor(MAG / magDiv) + floor(stat2 / stat2Div)` | Sorts de zone (`aoeBaseDamage`) |
| **Lifesteal (PV drainés)** | `floor(dégâts / 2)` | Sanguini, Vampyrus (`_spellLifesteal`) |

`MAG` est la stat principale des sorts de dégâts ; `INT` et `END` pilotent le
soin (maîtrise + endurance). Les AoE ont des diviseurs propres (`magDiv` /
`stat2Div`) : un sort à effet secondaire lourd (gel, drain de vie) scale plus
doucement qu'un sort de dégâts purs. Valeur par défaut : `magDiv = 3`,
`stat2Div = 3`.

### Crit de sort

✅ (dans le jeu — `rollSpellCrit` dans `battle-spells.js`) Le crit de sort est
un **canal distinct** du crit physique :

```
spellCritChance    = min(35, 5 + AGI × 0.4) + Σ bonusSpellCritChance  (5–35 %  + bonus équip.)
spellCritMultiplier = 1.5 + Σ bonusSpellCritDamage
```

- Pilotage : **AGI** (contre LCK pour le crit physique) — c'est le débouché
  offensif de l'AGI au-delà de l'esquive.
- Roll : `Math.random() * 100 < spellCritChance` → dégâts × `spellCritMultiplier`.
- Les sorts AoE (`_aoeHit`) **ne crittent pas** (choix d'équité).
- Affichage : suffixe `💥CRIT` dans le log de combat.

### Statut DoT probabiliste (sorts offensifs)

✅ (dans le jeu — `_spellElementalDamage` dans `battle-spells.js`) Certains
sorts offensifs peuvent **appliquer un DoT** sur la cible survivante (doublé
par `STATUS_BY_SPELL`) :

| Sort | DoT associé |
|------|-------------|
| Incendio | `burn` 🔥 |
| Diffindo | `bleed` 🩸 |
| Sectumsempra | `bleed` 🩸 |
| Glacius | `gel` ❄️ |

Probabilité : `min(0.50, 0.10 + INT × 0.0075 + LCK × 0.0075)` — pilotée
conjointement par INT (maîtrise) et LCK (chance d'infliger des afflictions).
Power du DoT : `max(1, floor(power × 0.25))`. Durée :
`min(5, 2 + floor(INT / 24) + floor(LCK / 24))`.

### Combos tactiques

✅ (dans le jeu — `COMBO_RULES` dans `battle-spells.js`) Un statut présent sur
la cible amplifie le coup entrant, récompensant l'enchaînement de sorts :

| Statut sur la cible | Élément entrant | Amplification | Libellé |
|--------------------|-----------------|---------------|---------|
| `gel` ❄️ | Tous | ×1.3 | ❄️ Éclat de glace |
| `bleed` 🩸 | `physique` | ×1.2 | 🩸 Plaie ouverte |

La première règle qui matche l'emporte ; combo incompatible avec les AoE
(qui contournent `_computeSpellDamage`).

### Coût en PM effectif

✅ (dans le jeu — `_spellSpCost` dans `battle-spells.js`) Le coût prélevé est
celui déclaré dans `SPELLS.cost`, avec deux exceptions :

- **Apothéose Serdaigle** (palier 18) : `ceil(cost × 0.8)`, plancher 1 —
  réduction permanente de 20 % sur tous les sorts.
- **Legilimens** : coût croissant de `+6 PM` par relance dans le même combat
  (`LEGILIMENS_COST_STEP = 6`). Anti-spam sans plafond de charges.

### Les 6 éléments

✅ (dans le jeu — `RESIST_MULTIPLIER = 0.5` / `WEAK_MULTIPLIER = 1.5`,
`data.js`) Voir G2 pour le tableau des résistances/faiblesses ennemies.

| Élément | Icône | Sorts porteurs (exemples) |
|---------|-------|--------------------------|
| `feu` | 🔥 | Incendio, Bombarda, Crucio, Fiendfyre |
| `glace` | ❄️ | Aguamenti, Glacius, Glacius Tempête |
| `foudre` | ⚡ | Stupefix, Fulgari, Tarantallegra, Fulgur Catena |
| `lumière` | ✨ | Lumos Maxima, Riddikulus, Patronum, Lumos Solem, Lux Aeterna |
| `ténèbres` | 🌑 | Avada..., Sanguini, Vampyrus, Maledictus, Morsmordre, Nox Vorax, Sectumsempra Imperius, Verrou de Sang |
| `physique` | ⚔️ | Wingardium Leviosa, Diffindo, Sectumsempra, Diffindo Maxima |

La clé `disarm` est une **résistance mécanique** indépendante des éléments :
`enemy.resist.includes('disarm')` bloque Expelliarmus quelle que soit
l'affinité élémentaire de l'ennemi.

**Bonus anti-mort-vivant** : `Lumos Solem` et `Lux Aeterna` portent le champ
`bonusVsUndead: 1.5` — les cibles de catégorie `fantôme` ou listées dans
`UNDEAD_IDS` subissent ×1.5 dégâts supplémentaires (`_isUndead` dans
`battle-spells.js`).

---

## Catalogue des sorts

### Sorts de base (disponibles dès le départ selon le personnage)

✅ (`data.js`)

| Nom | Icône | Élément | Effet | Coût PM | Power |
|-----|-------|---------|-------|---------|-------|
| Expelliarmus | ✨ | — | Désarme l'ennemi (réduit ATK) | 4 | 3 |
| Stupefix | ⚡ | foudre | Étourdit + 8 dégâts | 6 | 8 |
| Episkey | 💚 | — | Soin léger | 5 | 12 |
| Ferula | 🩹 | — | Soin instantané + régénération 3 tours | 6 | 4 |
| Ferula Maxima | 🩹 | — | Régén. PV + PM des deux alliés (3 tours) | 12 | 1 |
| Protego | 🛡️ | — | Bouclier magique | 5 | 5 |
| Incendio | 🔥 | feu | 14 dégâts (DoT burn probable) | 8 | 14 |
| Accio | 🌀 | — | Vole de l'or à l'ennemi | 6 | 0 |

### Sorts avancés (appris en cours de jeu)

✅ (`data.js`)

| Nom | Icône | Élément | Effet | Coût PM | Power |
|-----|-------|---------|-------|---------|-------|
| Wingardium Leviosa | 🌬️ | physique | 10 dégâts + stun | 7 | 10 |
| Diffindo | ✂️ | physique | 16 dégâts (DoT bleed probable) | 9 | 16 |
| Reparo | 💛 | — | Soin renforcé | 7 | 20 |
| Sectumsempra | 🩸 | physique | 24 dégâts (DoT bleed probable) | 14 | 24 |

### Sorts intermédiaires

✅ (`data.js`)

| Nom | Icône | Élément | Effet | Coût PM | Power |
|-----|-------|---------|-------|---------|-------|
| Lumos Maxima | 💡 | lumière | 12 dégâts + stun | 8 | 12 |
| Aguamenti | 💧 | glace | 10 dégâts + −2 DEF | 7 | 10 |
| Bombarda | 💥 | feu | 20 dégâts cible + éclaboussure | 15 | 20 |
| Riddikulus | 🤡 | lumière | Stun sur créatures du chaos | 6 | 8 |
| Alohomora | 🔓 | — | Vol d'une grosse bourse (or) | 5 | 20 |
| Patronum | ✨ | lumière | 18 dégâts anti-Détraqueur | 12 | 18 |

### Sorts élémentaires (glace / foudre / lumière)

✅ (`data.js`)

| Nom | Icône | Élément | Effet | Coût PM | Power |
|-----|-------|---------|-------|---------|-------|
| Glacius | ❄️ | glace | 14 dégâts + DoT gel garanti | 8 | 14 |
| Fulgari | ⚡ | foudre | 16 dégâts foudre purs | 9 | 16 |
| Lumos Solem | ☀️ | lumière | 16 dégâts + ×1,5 morts-vivants | 10 | 16 |

### Sort interdit (déverrouillé au niveau 9)

✅ (`data.js`)

| Nom | Icône | Élément | Effet | Coût PM | Power | Verrou |
|-----|-------|---------|-------|---------|-------|--------|
| Avada... | 💚✨ | ténèbres | 50 dégâts instantanés | 20 | 50 | `locked:true` → `false` au niv. 9 |

Ce sort est marqué `locked: true` dans `SPELLS` jusqu'au niveau 9, où le flag
est muté en `false` et le sort ajouté aux deux personnages actifs.

### Sorts de vampirisme (lifesteal)

✅ (`data.js` / `_spellLifesteal`)

| Nom | Icône | Élément | Effet | Coût PM | Power | PV drainés |
|-----|-------|---------|-------|---------|-------|------------|
| Sanguini | 🩸 | ténèbres | 12 dégâts + drain | 8 | 12 | +6 PV |
| Vampyrus | 🦇 | ténèbres | 18 dégâts + drain | 14 | 18 | +9 PV |

Les PV drainés = `floor(dégâts / 2)` après résistances/faiblesses. L'Apothéose
Serpentard (palier 18) greffe un lifesteal supplémentaire de 15 % sur **tous**
les sorts offensifs via `_applySerpentLifesteal`.

### Sorts de malédiction (curse)

✅ (`data.js` / `_spellCurse`)

| Nom | Icône | Élément | Effet | Coût PM | Power |
|-----|-------|---------|-------|---------|-------|
| Tarantallegra | 💃 | foudre | 8 dégâts + stun | 7 | 8 |
| Maledictus | ☠️ | ténèbres | 10 dégâts + −3 ATK/DEF | 9 | 10 |
| Crucio | 😖 | feu | 22 dégâts | 14 | 22 |
| Morsmordre | 💀 | ténèbres | 26 dégâts | 18 | 26 |

`Maledictus` est le seul « vrai » curse (`effect:"curse"`) : il réduit
directement l'ATK et la DEF de l'ennemi de 3 en plus de causer des dégâts.

### Sorts utilitaires

✅ (`data.js`)

| Nom | Icône | Effet | Coût PM |
|-----|-------|-------|---------|
| Revelio | 🔎 | Dissipe le brouillard alentour (OOC) / révèle les secrets d'un monstre (combat) | 2 |
| Portus | 🌀 | Téléportation tactique (bannit un ennemi non-boss en combat, ou voyage vers un étage visité OOC) | 52 (combat) / 38 (OOC) |

`Portus` présente deux coûts distincts : `cost: 52` en combat, `outOfCombatCost: 38`
hors combat (`data.js`). Un cooldown de transition d'étage s'applique OOC
(`portusOocCooldown`).

### Sorts de zone AoE (6 sorts)

✅ (`data.js` / `battle-spells.js`) Dégâts calculés par `aoeBaseDamage` :
`power + floor(MAG / magDiv) + floor(stat2 / stat2Div)`. Les AoE ne crittent
pas et n'appliquent pas les passifs de Maison (choix d'équité hérité de
Bombarda).

| Nom | Icône | Élément | Mode | Coût PM | Power | stat2 |
|-----|-------|---------|------|---------|-------|-------|
| Glacius Tempête | 🌨️ | glace | Nappe — dégâts égaux + gel sur tous | 16 | 12 | int (÷3) |
| Fulgur Catena | ⚡ | foudre | Chaîne — dégâts ×0,65 par saut | 15 | 18 | agi (÷4) |
| Lux Aeterna | 🌟 | lumière | Vague — dégâts égaux + ×1,5 morts-vivants | 17 | 15 | int (÷4) |
| Nox Vorax | 🌑 | ténèbres | Drain — dégâts à tous, lanceur +50 % en PV | 18 | 14 | end (÷3) |
| Diffindo Maxima | ⚔️ | physique | Fauchage — cible pleine + voisins ×0,6 | 14 | 18 | str (÷2) |
| Vulnera Sanentur | 💗 | — | Soin de groupe instantané | 16 | 22 | — |

**Bombarda** (15 PM, power 20, feu) est techniquement un sort à cible unique
avec `splash:true` : il applique des dégâts principaux sur la cible et des
dégâts d'éclaboussure sur les autres ennemis (`floor(power/2 + MAG/8 +
STR/4)`). Distinct des 6 AoE pures ci-dessus.

### Sort endgame (Grimoire Interdit)

✅ (`data.js`)

| Nom | Icône | Élément | Effet | Coût PM | Power |
|-----|-------|---------|-------|---------|-------|
| Fiendfyre | 🔥 | feu | 35 dégâts + brûlure persistante | 32 | 35 |

Coût prohibitif — utilisation parcimonieuse. Obtenu via le Grimoire Interdit
(sink matériaux Forge + Bibliothèque).

### Sorts de Maison — palier 17 « Mythe »

✅ (`data.js` / `battle-spells.js`) Enseignés lors du franchissement du palier
Mythe (tier 17, étages 11+, post-victoire). Un sort exclusif par Maison :

| Maison | Sort | Icône | Effet | Coût PM |
|--------|------|-------|-------|---------|
| Gryffondor | Patronus Maxima | 🦌 | Bouclier de groupe (2 tours) + dissipe stun et fear | 22 |
| Serpentard | Sectumsempra Imperius | 🩸 | ~20 dégâts ténèbres + saignement lourd + asservit 2 tours | 24 |
| Serdaigle | Legilimens | 👁️ | Révèle les capacités ennemies + annule la prochaine capacité (coût croissant) | 18 |
| Poufsouffle | Récolte Magique | 🌾 | Restaure PV + PM du groupe + or du combat +50 % | 26 |

Ces sorts sont liés à la Maison choisie, pas au personnage individuel. Voir G4
pour le contexte des paliers de Maison.

### Sorts exclusifs des Mondes Parallèles (cross-plan)

✅ (`data.js`, champ `_cross:true`) Achetés à l'Atelier du Voyageur contre
essences ; utilisables uniquement en visite (hors combat, contexte MP) :

| Nom | Icône | Effet | Coût PM |
|-----|-------|-------|---------|
| Cheminette Inter-Mondes | 🌀 | Ouvre un portail vers un autre monde (niv. 8 — **exclu Ironman**) | 25 |
| Verrou de Sang | 🩸 | Scelle une menace pour le sorcier hôte (1 essence requise) | 5 |
| Sceau du Voyageur | 🪬 | Ancrage astral : retour à la cellule de départ si mort astrale | 8 |
| Mémoire d'Outremonde | 🌌 | Restaure 100 % PV + PM au début de la prochaine visite | 10 |
| Marque du Pèlerin | 📍 | Marque la cellule courante (visible sur minimap) | 4 |
| Rappel Astral | 🌠 | Téléporte à la dernière Marque du Pèlerin | 12 |

---

## Les 3 vecteurs d'apprentissage

### 1. Level-up (automatique)

✅ (dans le jeu — `_grantLevelSpells` dans `battle-rewards.js`) À chaque
montée de niveau, des sorts sont enseignés automatiquement selon la table
ci-dessous. La table est à sens unique : un sort appris ne peut pas être
oublié.

| Niveau | Harry apprend | Hermione apprend |
|--------|--------------|-----------------|
| 2 | — | Expelliarmus |
| 3 | Accio | Stupefix |
| 4 | Wingardium Leviosa | Ferula |
| 5 | Reparo | Diffindo |
| 6 | Ferula | — |
| 7 | Diffindo | Wingardium Leviosa + Reparo + Ferula Maxima |
| 8 | — | — (Cheminette Inter-Mondes) |
| 9 | Avada... (déverrouillage) | Avada... (déverrouillage) |

**Note :** la Cheminette Inter-Mondes est inscrite au niveau 8 dans
`_grantLevelSpells` (`data.js`). L'`Avada...` n'est pas un enseignement au
sens strict : le flag `locked` est muté en `false` et le sort ajouté si le
perso ne l'a pas déjà.

### 2. Livres de sorts (spellbook)

✅ (dans le jeu — `showLearnMenu` / `learnSpellbook` dans `inventory.js`)
Les livres de sorts ont `type:"spellbook"` et un champ `spell`. Cliquer un
livre **hors combat** ouvre `showLearnMenu()` :

- **Solo** : le sort est enseigné à Harry directement.
- **Duo** : un prompt propose Harry ou Hermione — **un seul** perso apprend
  le sort, le livre est consommé.

**Différence clé avec `grantsSpell`** : le livre n'est consommé qu'une fois,
enseigne un sort à **un seul** personnage choisi.

Catalogue des livres disponibles :

| ID | Livre | Sort enseigné | Disponibilité |
|----|-------|---------------|---------------|
| `livre_sortileges` | Sortilèges Standards, Vol.3 | Wingardium Leviosa | Boutique / coffre ≥ étage 2 |
| `livre_soin` | Potions & Remèdes Magiques | Reparo | Boutique / coffre ≥ étage 3 |
| `livre_ferula` | Manuel du Soigneur de Champ | Ferula | Coffre étages 4-6 |
| `book_monsters` | Livre des Monstres | Diffindo | Coffre ≥ étage 3 (quête Lockhart) |
| `livre_glacius` | Givre & Engelures | Glacius | Boutique ≥ étage 3 |
| `livre_fulgari` | Foudre Canalisée | Fulgari | Boutique ≥ étage 5 |
| `livre_lumos_solem` | Lumière Solaire | Lumos Solem | Coffre ≥ étage 5 |
| `livre_prince` | Manuel du Demi-Sang | Sectumsempra | Coffre ≥ étage 6 (rare) |

### 3. Équipement (`grantsSpell`)

✅ (dans le jeu — `equipItem` dans `inventory.js`) Certains équipements
portent un champ `grantsSpell:"NomDuSort"`. À l'équipement, le sort est
enseigné **de façon permanente** au personnage (via `learnSpell`) — il le
conserve même si l'objet est retiré par la suite.

**Différence clé** : enseigne le sort au personnage qui équipe l'objet
(en Solo, toujours Harry ; en Duo, selon le choix).

| Item | Slot | Sort enseigné |
|------|------|---------------|
| `amulette` | amulet | Reparo |
| `anneau_resurrection` | ring | Reparo |

---

## Interactions

- **G2 Combat** : le coût PM est déduit via `_spellSpCost` (réduction
  Apothéose Serdaigle) ; la cible est sélectionnée via `showTargetSelection`
  quand plusieurs ennemis sont vivants ; les statuts DoT posés par les sorts
  sont tickés par `tickStatuses` chaque tour.
- **G3 Progression** : `MAG` pilote les dégâts, `INT + END` le soin, `AGI`
  le crit de sort (canal distinct du crit physique LCK). L'Apothéose Serdaigle
  (`−20 % coût`) et Poufsouffle (`+1 PM/pas`) interagissent directement avec
  l'économie de PM.
- **G4 Maisons** : les 4 sorts de palier Mythe (17) sont des récompenses de
  progression Maison. L'Apothéose Serpentard greffe un lifesteal sur tous les
  sorts offensifs.
- **G5 Équipement** : `grantsSpell` et `bonusSpellCritChance` /
  `bonusSpellCritDamage` modifient directement les capacités offensives.
- **G8 Difficulté & scaling** : `enemy.resist[]` / `enemy.weak[]` imposent
  de varier les éléments selon l'adversaire ; `RESIST_MULTIPLIER = 0.5`,
  `WEAK_MULTIPLIER = 1.5`.

---

## Cas limites & garde-fous

✅ (dans le jeu)
- **Sort verrouillé** (`Avada...`, `locked:true`) : n'apparaît pas dans la
  liste avant le niveau 9. La déverrouillage est irréversible.
- **PM insuffisants** : le bouton du sort est grisé dans la modale (opacité
  0,6), le lancer est refusé avec message.
- **Cheminette Inter-Mondes en Ironman** : double vérification — dans
  `openSpells` (label « Voie solitaire ») et dans le handler `portal` de
  `SPELL_OOC_HANDLERS` (message d'erreur + abandon).
- **Cooldown soin OOC** (`HEAL_OOC_CD_STEPS = 3 pas`) : partagé entre tous
  les sorts de soin hors combat ; affiché en clair dans la modale.
- **Legilimens anti-spam** : pas de plafond de charges, mais coût +6 PM par
  relance dans le même combat (n'invalide jamais le sort, le rend
  progressivement plus coûteux).
- **AoE sur groupe vide** : `livingEnemies()` est évalué au moment du lancer
  — si tous les ennemis sont déjà morts, la plupart des handlers AoE sont
  silencieux.
- **Cible alliée KO** (`_spellSupportRegen`) : le handler vérifie `ally.hp > 0`
  et renvoie un message d'erreur sans muter l'état.
- **Bombarda et Diffindo Maxima** : les ennemis adjacents subissent les
  resist/weak normalement, mais sans crit ni passif de Maison — même
  comportement que les AoE.

---

## ❓ À détailler / 💡 pistes

> ❓ À détailler : `Portus` en combat — le comportement précis du choix
> « déplacer le groupe vs bannir un ennemi » (fichier `js/teleport.js` cité
> dans `data.js` mais non intégré dans ce chapitre) mériterait sa propre
> sous-section.

> ❓ À détailler : sorts de départ des personnages originaux (Céleste,
> Iris, Maxence, Anastasia, etc.) — certains possèdent `Lumos Maxima`,
> `Aguamenti`, `Sanguini`, `Riddikulus` dès le départ (`CHARACTERS` dans
> `data.js`). À consigner si la doc couvre les héros originaux.

> ❓ À détailler : le comportement exact de `Sectumsempra Imperius` quand la
> cible asservie frappe ses alliés ennemis (`effect:"imperius"`) — la logique
> d'`enemyTurn` pendant les 2 tours d'Imperius est à documenter.

> 💡 (proposition) Un mini-tableau « lecture rapide » pour le joueur : 3
> sorts à retenir selon la situation (manque de PM → Garde ; groupe d'ennemis
> → AoE ; boss morts-vivant → Lumos Solem / Lux Aeterna). Non implémenté
> comme tutoriel.

> 💡 (proposition) Documenter le `spellCategory` (`soutien` / `utilitaire` /
> élément) de chaque sort dans le catalogue pour rendre lisible la logique
> des filtres de la modale.

---

## Récapitulatif express (pour briefer Gemini)

> **43 sorts** dans 9 familles : offensifs élémentaires, soin/soutien,
> contrôle, désarmement, lifesteal, malédiction, AoE (6 modes), utilitaires,
> endgame Maison. Dégâts = `power + MAG/2` ; soin = `power + INT/4 + END/4` ;
> AoE = `power + MAG/magDiv + stat2/stat2Div`. **Crit de sort** piloté par
> AGI (≤ 35 %), canal distinct du crit physique (LCK ≤ 40 %). **3 vecteurs
> d'apprentissage** : level-up automatique, livre de sort (un seul apprenant
> en Duo), équipement `grantsSpell` (permanent, groupe entier). Cheminette
> Inter-Mondes (niv. 8, OOC, exclu Ironman) ; Patronus Maxima, Legilimens,
> Sectumsempra Imperius, Récolte Magique (palier Mythe 17).
