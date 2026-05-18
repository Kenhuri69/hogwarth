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
> `houseTier >= 18`. Valeurs **après rework sim** (cf. §3quater + §5) :
> Gryffondor +10 % crit (physique ET sort) +10 % dégâts critiques ;
> Serpentard 15 % spell-lifesteal ; Serdaigle −20 % coût des sorts ;
> Poufsouffle +2 PV/PM par pas hors combat **+ Vigueur** (+20 % de
> dégâts au-dessus de 60 % PV).

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

### §3quater — Rework des passifs Gryffondor & Poufsouffle (2026-05-18)

Suite à la 1ʳᵉ passe sim (§5) qui a montré Gryffondor et Poufsouffle
quasi inertes en combat, deux passifs ont été retravaillés (décision
utilisateur) :

- **Gryffondor — Cœur du Lion** : `+20 % crit physique` → `+10 % crit
  physique ET de sort, +10 % de dégâts critiques (physique + sort)`.
  Le canal *sort* est désormais touché — un Harry casteur en profite.
  Bonus appliqués PAR-DESSUS les plafonds LCK/AGI (40/35) :
  `recalculateStats()` (`inventory.js`) ajoute après le clamp, le taux
  peut donc dépasser 40 % (plafond absolu 100 %).
- **Poufsouffle — Souffle du Blaireau** : régén PV/PM par pas
  *conservée* + nouvelle composante DPS **Vigueur** : `+20 % de dégâts
  (physique + sort) tant que le combattant est au-dessus de 60 % PV`.
  Helper `_houseVigorMult(char)` (`battle.js`), consommé par
  `executeAttack` (physique) et `_computeSpellDamage` (sorts).

## 4. Risques

- **Calibrage des seuils** : 30000 / 45000 sont indicatifs. Le gate
  `endgameTierIndex` doit rester la contrainte mordante (sinon le palier
  redevient « hors-sol »). Vérifier qu'un joueur atteint bien l'étage
  11+ *avant* d'avoir 30000 points, sinon abaisser le seuil.
- **Sorts exclusifs trop forts** : 4 sorts endgame peuvent casser
  l'équilibrage de la Boucle Ténébreuse. Les sorts de Mythe (contrôle :
  Imperius / Legilimens) sortent du modèle DPS de `sim-difficulty.js` —
  reste un point de playtest manuel.
- **Vague C dépend de B** : ne pas démarrer C tant que le tier 17 n'a
  pas été joué — risque de concevoir un capstone déséquilibré.

## 5. Étude sim-difficulty (2026-05-18)

`tools/sim-difficulty.js` enrichi d'un flag `--house-tier=N` (requiert
`--house-set`) : modélise le delta de stats des paliers 17/18 + le
passif d'Apothéose. Étude lancée en mode `--endgame --max-floor=30
--artifacts --stat-points=3`, 800 sims/cellule.

### 1ʳᵉ passe — diagnostic

La 1ʳᵉ passe a établi que (a) le tier 17 seul (stats) est négligeable
(±2 pts vs baseline) ; (b) Serpentard (lifesteal) et Serdaigle dominent
grâce au lifesteal et au +5 MAG ; (c) **Gryffondor (+20 % crit
physique) et Poufsouffle (régén hors combat) étaient quasi inertes** —
un Harry casteur n'attaque presque jamais au physique, et la sim repart
PV/PM pleins à chaque combat. → a motivé le rework §3quater.

### 2ᵉ passe — post-rework (Win rate Solo, mode discriminant)

| Étage | tier 0 | Gryff 18 | Serp 18 | Serd 18 | Pouf 18 |
|------:|-------:|---------:|--------:|--------:|--------:|
| 20    | 55 %   | 58 %     | 68 %    | 68 %    | 66 %    |
| 21    | 31 %   | 35 %     | 49 %    | 46 %    | 42 %    |
| 25    | 22 %   | 25 %     | 41 %    | 32 %    | 28 %    |
| 30    | 16 %   | 16 %     | 30 %    | 22 %    | 20 %    |

Moyenne Solo étages 21-30 (cœur de la Boucle Ténébreuse) :
baseline **23,1 %** → Serpentard **38,0 %** (+14,9) · Serdaigle
**32,6 %** (+9,5) · Poufsouffle **29,4 %** (+6,3) · Gryffondor
**25,0 %** (+1,9).

### Constats post-rework

1. **Poufsouffle redressé** : Vigueur le fait passer de « ≈ baseline »
   à +6,3 pts profonds (et +11 pts au floor 20-21). Il a désormais une
   identité de combat claire, entre Serdaigle et Gryffondor.
2. **Gryffondor reste le plus discret** : +1,9 pt profond. Le crit de
   sort touché par le rework n'apporte que ~+4 % de dégâts attendus
   (spellCrit ~10 %→20 %, ×1,6). C'est assumé — Gryffondor est la
   Maison « burst/variance », pas « win rate moyen » : le passif paie
   surtout sur les pics de dégâts, que la moyenne Monte Carlo lisse.
3. **Hiérarchie finale** : Serpentard ≫ Serdaigle > Poufsouffle >
   Gryffondor. Resserrée vs la 1ʳᵉ passe (où Pouf/Gryff étaient
   confondus avec la baseline).
4. **Aucune Maison ne casse la courbe** : même Serpentard 18 reste à
   30 % Solo au floor 30. Les gates `requiresDarkTier` tiennent.

### Limites du modèle (à lever en playtest manuel)

- **IA mono-sort** : la sim n'attaque au physique qu'en dernier recours
  → sous-évalue toujours le volet *physique* de Gryffondor (crit phys.
  +10 %, dégâts crit phys. +10 %). Chiffre Gryffondor à lire comme un
  plancher.
- **PV/PM pleins à chaque combat** : la régén hors combat de Poufsouffle
  reste un no-op dans la sim (seule sa Vigueur est mesurée) ; Serdaigle
  (−20 % coût) est sous-évalué — l'économie de PM ne pèse que sur une
  série de combats sans repos.
- **Sorts de Mythe non modélisés** : Imperius / Legilimens (contrôle)
  sortent du modèle DPS — playtest manuel requis (cf. §4).
