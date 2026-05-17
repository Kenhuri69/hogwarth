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

## 3. Étapes

> Vague A close. Étapes ci-dessous = Vagues B puis C.

### Vague B — Palier 17 « Mythe »

- [ ] Étendre `checkHouseLevelUp()` : garde `requiresDarkTier` via
      `endgameTierIndex(currentFloor)`.
- [ ] Ajouter le tier 17 aux 4 entrées `HOUSE_BONUSES[*].tiers[]`
      (`threshold`, `label:'Mythe'`, `requiresDarkTier:1`, `bonus`, `msg`).
- [ ] Définir les 4 sorts exclusifs dans `SPELLS` (`js/data.js`) +
      handlers dans `battle-spells.js`.
- [ ] Câbler l'apprentissage du sort au passage du tier 17 (bonus
      `grantsSpell` ou équivalent palier).
- [ ] Quête « don de 3000 gold » : entrée dans `quests.js` + hook Chef
      de Maison.
- [ ] Smoke `scenarioHouseMytheTier` : housePoints≥30000 + floor 11+
      post-victoire ⇒ tier 17 atteint, sort appris ; floor ≤ 10 ⇒ refusé.
- [ ] Commit + push.

### Vague C — Palier 18 « Apothéose »

- [ ] GO/NO-GO : à ne lancer qu'une fois le tier 17 joué et calibré.
- [ ] Tier 18 dans les 4 `tiers[]` (`requiresDarkTier:2`).
- [ ] Récompense capstone (apex-sort **ou** passif) selon décision §2.
- [ ] Smoke `scenarioHouseApotheoseTier` (gate floor 21+).
- [ ] Commit + push.

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
