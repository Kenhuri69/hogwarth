# Plan — Maisons V3 : paliers endgame « Mythe » & « Apothéose »

> Plan vivant (cf. `.claude/guidelines.md` §5).
> Révisé le 2026-05-17 après revue de l'état réel du code.

## 1. Contexte & revue

`houses-2.0.md` (archivé, PR #123) a livré les 16 paliers Maison
(Bronze/Argent/Or × 5 phases + Légende), les sets 4 pièces et leurs
bonus 2/3/4.

### Revue 2026-05-17 — choix concurrents constatés

| Axe du plan d'origine | État réel constaté |
|-----------------------|--------------------|
| Vague A — sprites des 12 NEW set items | **✅ DÉJÀ LIVRÉE.** Les 16 items de `HOUSE_SETS` ont tous recette `icon_factory.py` + entrée `ITEM_ICON_NEW_REGISTRY` + PNG `img/icons_new/`. Vérifié visuellement. |
| IDs des items de set listés par le plan | **Erronés.** Le plan anticipait `circlet_serpent`, `cape_basilic`, `casque_aigle`, `cape_terre`… `houses-2.0` a en fait livré `pendentif_mamba`, `cape_sibylline`, `couronne_basilic`, `manteau_encre`, `oeil_aigle`, `anneau_savoir`, `cape_loyaute`, `coiffe_blaireau`, `medaillon_helga`. Le plan avait été rédigé avant le gel du nommage. |
| Vague B — palier « Mythe » | Non implémenté. |
| Vague C — sous-paliers Diamant/Platine | Non implémenté (recommandation d'origine : abandonner). |

**Conséquence** : la Vague A est close. Ce plan ne porte plus que les
**paliers endgame**, redéfinis ci-dessous pour s'ancrer sur la Boucle
Ténébreuse existante plutôt que sur un palier hors-sol.

### Infrastructure endgame réutilisée (déjà en place)

- **Boucle Ténébreuse** (`js/dungeon.js`) : post-victoire (`victoryAchieved`),
  les étages 11+ rejouent la progression 1-10.
- `effectiveFloor(floor)` : 11→1, 12→2, …, 21→11, …
- `endgameTierIndex(floor)` : **0** pour les étages 1-10, **1** pour 11-20,
  **2** pour 21-30, etc. ⇒ c'est notre gate « late game 11+ / 21+ ».
- `checkHouseLevelUp()` (`js/main.js`) : itère `HOUSE_BONUSES[h].tiers[]` ;
  le palier 16 (Légende) est déjà gated par `victoryAchieved`.

## 2. Vagues

### Vague A — Sprites des set items · ✅ CLOSE (livrée par `houses-2.0`)

Aucune action. Voir la revue §1.

### Vague B — Palier 17 « Mythe » (gate : Boucle Ténébreuse tier 1)

**Principe** : un 17ᵉ palier, débloqué quand le joueur **progresse dans
la Boucle Ténébreuse** (étages 11-20), pas seulement en accumulant des
points. C'est le premier vrai contenu Maison réservé au late game.

**Condition de déblocage** (double gate) :
- `housePoints >= 30000` (à calibrer — au-dessus de Légende 25000), **et**
- `endgameTierIndex(currentFloor) >= 1` (le joueur est à l'étage 11+).

**Mécanique** : ajouter un champ `requiresDarkTier` sur l'objet `tier`.
`checkHouseLevelUp()` ajoute une garde :
`if (tier.requiresDarkTier && endgameTierIndex(currentFloor) < tier.requiresDarkTier) return;`
— symétrique de la garde `victoryAchieved` existante.

**Récompense — un sort exclusif par Maison** (enseigné à tout le groupe,
via le mécanisme `grantsSpell`/apprentissage de palier) :

| Maison | Sort exclusif | Effet proposé |
|--------|---------------|---------------|
| Gryffondor | `Patronus Maxima` | Bouclier AOE groupe + retire `fear`/`stun` |
| Serpentard | `Sectumsempra Imperius` | DoT lourd + force la cible à frapper ses alliés 2 tours |
| Serdaigle | `Legilimens` | Révèle les abilities ennemies + annule 1 ability/combat |
| Poufsouffle | `Récolte Magique` | Regen full groupe + +50 % gold sur le combat suivant |

**Quête associée** (sink endgame) : « Faire don de 3000 gold à la
Maison » via le Chef de Maison — déclenchée à l'entrée du tier 17.

### Vague C — Palier 18 « Apothéose » (gate : Boucle Ténébreuse tier 2)

**Réorientation** : la Vague C d'origine (sous-paliers horizontaux
Diamant/Platine entre Or et Légende) est **abandonnée** — 4 paliers peu
différenciés, ROI faible. À la place, un **18ᵉ palier vertical unique**,
ancré sur le 2ᵉ palier de Boucle Ténébreuse (étages 21-30). C'est le
sommet absolu de la progression Maison.

**Condition de déblocage** (double gate) :
- `housePoints >= 45000` (à calibrer), **et**
- `endgameTierIndex(currentFloor) >= 2` (le joueur est à l'étage 21+).

**Récompense — capstone par Maison** (différenciée, conforme à la
recommandation d'origine « par Maison plutôt qu'horizontalement ») :
- Améliore le sort de Mythe en version « apex » (ex. `Patronus Maxima`
  → soigne aussi 25 % PV), **ou**
- Un passif légendaire de Maison (`legendaryPassive`-like) : aura
  permanente thématique (Gryffondor : +crit ; Serpentard : spell
  lifesteal ; Serdaigle : coût de sort −20 % ; Poufsouffle : regen PV/PM
  hors combat).

Décision apex-sort vs passif : à trancher au moment de l'implémentation,
selon l'équilibrage observé du tier 17.

> **Décision (2026-05-18)** : passif légendaire retenu (choix utilisateur).
> Pas de flag dédié — `houseApotheosePassive()` (`main.js`) lit
> `houseTier >= 18`. Valeurs : Gryffondor +20 % crit physique ;
> Serpentard 15 % spell-lifesteal ; Serdaigle −20 % coût des sorts ;
> Poufsouffle +2 PV/PM par pas hors combat.

## 3. Étapes

> Vague A close. Étapes ci-dessous = Vagues B puis C.

### Vague B — Palier 17 « Mythe » · ✅ LIVRÉE (2026-05-17)

- [x] Étendre `checkHouseLevelUp()` : garde `requiresDarkTier` via
      `endgameTierIndex(currentFloor)` (`js/main.js`).
- [x] Tier 17 ajouté aux 4 entrées `HOUSE_BONUSES[*].tiers[]`
      (`threshold:30000`, `label:'Mythe'`, `requiresDarkTier:1`, bonus
      stat + `grantsSpell`, `msg`) — `js/state.js`.
- [x] 4 sorts exclusifs dans `SPELLS` (`js/data.js`) + handlers
      `_spellPatronusMaxima` / `_spellImperius` / `_spellLegilimens` /
      `_spellRecolte` (`battle-spells.js`) + `SPELL_HANDLERS`.
      Mécaniques neuves : statut `imperius` (`battle.js` —
      `consumeImperius`, redirection dans `enemyTurn`) ; charge
      `legilimensCancelCharges` (annulation dans `tryEnemyAbility`).
- [x] Apprentissage câblé : `checkHouseLevelUp()` appelle
      `_teachSpellToParty(tier.bonus.grantsSpell)` au tier 17.
- [x] 4 icônes PNG (`tools/gen_element_spell_icons.py`) +
      `SPELL_ICON_REGISTRY` (`js/item-icons.js`).
- [x] Quête « don de 3000 gold » (gold-sink) : 4 templates
      `quest_don_*` (`quests.js`) avec nouvel objectif `donate`
      (`_refreshObjectives` bidirectionnel, consommation `_consumeQuestItems`,
      rendu `_renderQuestStep`) ; `unlockHouseMytheQuest()` appelée au
      tier 17 ; câblage Chefs de Maison (`questsGiven` / `dialoguesByQuest`).
- [x] Statut `fear` 😱 (`STATUS_DEFS`, `isFeared` / `rollFearSkip`,
      saut de tour 50 % ennemis + héros) ; injecté par `boggart` et
      `detraqueur` ; dissipé par `Patronus Maxima`.
- [x] Smoke `scenarioHouseMytheTier` (T1-T9) : gate, 4 sorts,
      mécaniques imperius / legilimens / recolte, quête de don
      (objectif bidirectionnel + remise consomme 3000), statut peur
      (saut forcé + dissipation). `node tests/smoke.js` vert.

### §3bis — Écarts vs plan

- **Récolte Magique** : le plan proposait « +50 % gold sur le combat
  *suivant* ». Implémenté « +50 % sur le combat *où il est lancé* »
  (`recolteGoldBonus`, lu par `endBattle`). Raison : l'état de combat
  n'est jamais sérialisé (`inBattle` bloque les sauvegardes) — une
  sémantique « combat courant » tient en un booléen transient.
- **Statut `fear`** : le jeu n'avait pas de statut `fear`. Implémenté
  comme contrôle non-DoT (50 % de saut de tour, décompté en rounds par
  `tickStatuses`). L'ancienne capacité `weaken` « Terreur Absolue » de
  l'Épouvantard est convertie en `effect:"status", statusId:"fear"`.
  `Patronus Maxima` dissipe désormais bien `fear` + `stun`.

### Vague C — Palier 18 « Apothéose » · ✅ LIVRÉE (2026-05-18)

- [x] GO/NO-GO : franchi sur instruction utilisateur (« go next »).
- [x] Tier 18 dans les 4 `tiers[]` (`threshold:45000`, `label:'Apothéose'`,
      `requiresDarkTier:2`, bonus +3 stat primaire + 1 LCK) — `js/state.js`.
      La garde `requiresDarkTier` existante (`checkHouseLevelUp`) couvre
      le gate sans modification.
- [x] Récompense capstone = passif légendaire de Maison (décision §2).
      Helper `houseApotheosePassive()` exposé (`js/main.js`, MANIFEST loader).
      Hooks : Gryffondor `recalculateStats()` (inventory.js) ;
      Serpentard `_applySerpentLifesteal` + Serdaigle `_spellSpCost`
      (battle-spells.js) ; Poufsouffle `_step` (movement.js).
- [x] Smoke `scenarioHouseApotheoseTier` (T1-T7) : gate floor 12 vs 22,
      franchissement tier 18, config des 4 Maisons, 4 passifs.
      `node tests/smoke.js` vert.

### §3ter — Écarts vs plan (Vague C)

- **Pas de flag `apotheosePassive`** : le plan évoquait un mécanisme
  « `legendaryPassive`-like ». Implémenté sans flag — `houseTier >= 18`
  est la source de vérité (déjà sérialisée), `houseApotheosePassive()`
  la lit. Évite un flag mort de plus (cf. `legendaryPassive` du tier 16,
  jamais consommé).
- **Poufsouffle régen** : +2 PV / +2 PM par pas (et non un pourcentage).
  Valeur plate, lisible, plafonnée par `hpMax`/`spMax`.

## 4. Risques

- **Calibrage des seuils** : 30000 / 45000 sont indicatifs. Le gate
  `endgameTierIndex` doit rester la contrainte mordante (sinon le palier
  redevient « hors-sol »). Vérifier qu'un joueur atteint bien l'étage
  11+ *avant* d'avoir 30000 points, sinon abaisser le seuil.
- **Sorts exclusifs trop forts** : 4 sorts endgame peuvent casser
  l'équilibrage de la Boucle Ténébreuse. Les tester via
  `tools/sim-difficulty.js` avant de figer.
- **Vague C dépend de B** : ne pas démarrer C tant que le tier 17 n'a
  pas été joué — risque de concevoir un capstone déséquilibré.
