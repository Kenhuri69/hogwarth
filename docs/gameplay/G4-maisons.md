# G4 — Maisons (mécanique)

**Statut :** 🟩 à jour — couvre les systèmes récents (relecture design en continu)

> 📊 **Statut réel (code)** : ✅ points, 18 paliers + Apothéose/★ N, sets, passifs
> endgame, don d'or — modules : `js/state.js` (`HOUSE_BONUSES`), `js/main.js`
> (`checkHouseLevelUp`), `js/house-donation.js`.
> Référence technique : [`CLAUDE.md`](../../CLAUDE.md).

> Objectif du chapitre : documenter le **système de prestige de Maison** — son
> économie de points, ses 18 paliers nommés (Apprenti → Virtuose → Légende →
> Mythe → Apothéose) plus la série Apothéose ★ N génératrice, les bonus par
> Maison, et le gold-sink du don. Vue design, valeurs fidèles au code.

---

## Vue d'ensemble

✅ (dans le jeu) Dès le lancement d'une nouvelle partie, le joueur choisit une
**Maison** (Gryffondor, Serpentard, Serdaigle, Poufsouffle). Ce choix est
**permanent** pour la durée de la partie. Il configure :

1. Le **profil de stat** récompensé à chaque palier (ATK pour Gryffondor, MAG
   pour Serpentard et Serdaigle, DEF pour Poufsouffle).
2. Les **pièces du set de Maison** distribuées par le chef (4 items par Maison —
   voir G5 Sets de Maison).
3. Le **sort exclusif** (palier Mythe) et le **passif légendaire** (palier
   Apothéose) propres à la Maison.
4. La **voix du chef** (samples audio) et les dialogues PNJ variants.

`chosenHouse` (string), `housePoints` (int) et `houseTier` (0–18+) sont les
trois variables d'état du système (`js/state.js`). Tous trois sont sérialisés
dans le save.

---

## Fonctionnement

### Gain de points

✅ (dans le jeu — `js/battle-rewards.js — endBattle`, `js/quests.js —
completeQuest`)

Les **deux seules sources** de points de Maison sont :

| Source | Gain |
|--------|------|
| Victoire de combat (par round de kill) | `HOUSE_POINTS_PER_KILL[difficulty]` |
| Remise d'une quête | **30 points fixes** |

Pour les kills, le gain dépend du niveau de difficulté :

| Difficulté | Points par kill (ennemi normal) |
|------------|----------------------------------|
| Facile     | **8**  (`data.js — HOUSE_POINTS_PER_KILL`) |
| Normal     | **10** |
| Difficile  | **14** |
| Expert     | **18** |

> ✅ **Bonus Ténèbres** : les ennemis de la Boucle Ténébreuse (variante
> `darkness`, étages 11+) rapportent **× 1.5 points** (`battle-rewards.js l.205`).
> Ex. : un combat de 3 ennemis Ténèbres en Difficile rapporte `floor(14 × 3 ×
> 1.5) = 63 points` au lieu de 42.

### Cycle de vérification

✅ (dans le jeu — `js/main.js — checkHouseLevelUp`)

```
endBattle(won) / completeQuest(i)
  └─ housePoints += gain
     └─ checkHouseLevelUp()
        ├─ parcourt bonuses.tiers[] dans l'ordre
        ├─ si housePoints >= tier.threshold ET garde-fous satisfaits
        │   → houseTier = i + 1
        │   → applique bonus (stat / item / sort)
        │   → addMsg, playLevelUp
        │   └─ recalculateStats() + updateUI()
        └─ boucle génératrice ★ N si houseTier >= 18 (voir §Série ★ N)
```

Les **bonus de stats** (`_baseAtk / _baseDef / _baseMag / _baseLck`) sont
appliqués sur **tout le groupe** (`party.forEach`). `recalculateStats()`
reconstruit ensuite `atk / def / mag / lck` avec l'équipement, ce qui évite
le double-comptage.

Les **items de palier** transitent par `pendingHouseRewards` (Set persisté) :
ils ne tombent pas directement dans l'inventaire mais sont remis par le **chef
de Maison** lors d'un dialogue (`specialAction: claim_house_reward`).

---

## Règles & valeurs

### 16 paliers de base (Apprenti → Légende)

✅ (dans le jeu — `HOUSE_BONUSES[h].tiers[]`, `js/state.js`)

L'architecture commune est **5 phases narratives × 3 sous-paliers (Bronze /
Argent / Or)** = 15 sous-paliers + 1 palier Légende endgame (16 au total) :

- **Bronze** → `+1 LCK`
- **Argent** → `+1 stat principale` (ATK / MAG / MAG / DEF)
- **Or** → récompense narrative (pièce du set de Maison via chef)

Le palier **Légende** (16, seuil 25 000 pts) est **gaté par `victoryAchieved`**
(victoire sur Voldemort Ressuscité) — inaccessible avant l'endgame.

Tableau des seuils et bonus par Maison (extraits représentatifs des 8 premières
entrées + Légende) :

| Palier | Label | Seuil (pts) | 🦁 Gryffondor | 🐍 Serpentard | 🦅 Serdaigle | 🦡 Poufsouffle |
|--------|-------|-------------|---------------|---------------|--------------|----------------|
| 1  | Apprenti Bronze | 50    | +1 LCK        | +1 LCK        | +1 LCK       | +1 LCK         |
| 2  | Apprenti Argent | 150   | +1 ATK        | +1 MAG        | +1 MAG       | +1 DEF         |
| 3  | Apprenti Or     | 300   | `brassard_lion` | `anneau_serpent` | `plume_aigle` | `ceinture_blaireau` |
| 4  | Confirmé Bronze | 500   | +1 LCK        | +1 LCK        | +1 LCK       | +1 LCK         |
| 5  | Confirmé Argent | 800   | +1 ATK        | +1 MAG        | +1 MAG       | +1 DEF         |
| 6  | Confirmé Or     | 1 200 | `heaume_vaillant` | `pendentif_mamba` | `manteau_encre` | `cape_loyaute` |
| 7  | Expert Bronze   | 1 700 | +1 LCK        | +1 LCK        | +1 LCK       | +1 LCK         |
| 8  | Expert Argent   | 2 500 | +1 ATK        | +1 MAG        | +1 MAG       | +1 DEF         |
| 9  | Expert Or       | 3 500 | `sword_gryff` ✨ | `locket_slytherin` ✨ | `diademe_serdaigle` ✨ | `coupe_poufsouffle` ✨ |
| 10 | Maître Bronze   | 4 500 | +1 LCK        | +1 LCK        | +1 LCK       | +1 LCK         |
| 11 | Maître Argent   | 6 000 | +1 ATK        | +1 MAG        | +1 MAG       | +1 DEF         |
| 12 | Maître Or       | 8 000 | `cape_godric` + quête set | `cape_sibylline` + quête set | `oeil_aigle` + quête set | `coiffe_blaireau` + quête set |
| 13 | Virtuose Bronze | 10 000 | +1 LCK       | +1 LCK        | +1 LCK       | +1 LCK         |
| 14 | Virtuose Argent | 13 000 | +1 ATK       | +1 MAG        | +1 MAG       | +1 DEF         |
| 15 | Virtuose Or     | 16 000 | *(quête set à finir)* | idem | idem | idem   |
| 16 | **Légende** *(gated victoire)* | 25 000 | +2 ATK +1 LCK + passif Légende + `lame_godric` | +2 MAG +1 LCK + `bague_salazar` | +2 MAG +1 LCK + `codex_rowena` | +2 DEF +1 LCK + `bouclier_helga` |

> ✅ Les items marqués ✨ au palier 9 (Épée de Gryffondor, Médaillon de
> Serpentard, Diadème de Serdaigle, Coupe de Poufsouffle) sont les reliques
> **légendaires** classiques — distribuées via le chef de Maison à Expert Or.

> ✅ Le palier 12 **Maître Or** déclenche également `unlockHouseQuest` : la
> quête de set de Maison s'ouvre, dont la remise permet d'obtenir la
> **4e pièce** du set.

### Palier 17 — Mythe (`requiresDarkTier: 1`)

✅ (dans le jeu — `HOUSE_BONUSES[h].tiers[16]`, `js/main.js`)

**Conditions** : `housePoints >= 30 000` ET Boucle Ténébreuse niveau ≥ 1
(étages 11+, `endgameTierIndex(currentFloor) >= 1`). Impose donc d'avoir
franchi la victoire sur Voldemort **et** d'explorer les étages 11+.

| Maison | Bonus stats | Sort exclusif enseigné | Effet du sort |
|--------|-------------|------------------------|---------------|
| 🦁 Gryffondor | +2 ATK +1 LCK | **Patronus Maxima** | Dissipe le statut `fear` sur le groupe |
| 🐍 Serpentard | +2 MAG +1 LCK | **Sectumsempra Imperius** | Magie tranchante endgame (transgressive) |
| 🦅 Serdaigle  | +2 MAG +1 LCK | **Legilimens** | Anticipe / annule des capacités ennemies |
| 🦡 Poufsouffle| +2 DEF +1 LCK | **Récolte Magique** | Majore l'or du prochain combat de +50 % |

Le sort est enseigné **à tout le groupe actif** via `_teachSpellToParty`
(même mécanique que `grantsSpell` d'équipement). Le palier déclenche aussi
`unlockHouseMytheQuest` : la **quête de don** (gold-sink) s'ouvre chez le
chef de Maison.

### Palier 18 — Apothéose (`requiresDarkTier: 2`)

✅ (dans le jeu — `HOUSE_BONUSES[h].tiers[17]`, `js/main.js —
houseApotheosePassive`)

**Conditions** : `housePoints >= 45 000` ET Boucle Ténébreuse niveau ≥ 2
(étages 21+). Palier capstone — le plus profond du système de paliers nommés.

> ✅ `houseApotheosePassive()` retourne le nom de la Maison quand
> `houseTier >= 18`, sinon `null`. C'est la **source de vérité** pour tous les
> hooks de passif — aucun flag séparé.

| Maison | Bonus stats | Passif légendaire | Hook d'implémentation |
|--------|-------------|-------------------|-----------------------|
| 🦁 Gryffondor | +3 ATK +1 LCK | **Cœur du Lion** : +10 % crit (physique ET sort), +15 % dégâts critiques, **Élan** (chaque crit → +8 % dégâts, cumul × 5 max) | `recalculateStats` + `_houseElanMult`/`_updateElan` dans `battle.js` |
| 🐍 Serpentard | +3 MAG +1 LCK | **Soif du Serpent** : 15 % vol de vie sur chaque sort offensif | `_applySerpentLifesteal` dans `battle-spells.js` |
| 🦅 Serdaigle  | +3 MAG +1 LCK | **Esprit de l'Aigle** : −20 % coût PM de tous les sorts | `_spellSpCost` dans `battle-spells.js` |
| 🦡 Poufsouffle| +3 DEF +1 LCK | **Souffle du Blaireau** : +2 PV/PM par pas d'exploration + **Vigueur** (+23 % dégâts quand PV > 60 %) | `_step` dans `movement.js` + `_houseVigorMult` dans `battle.js` |

### Série Apothéose ★ N — génératrice infinie

✅ (dans le jeu — boucle finale de `checkHouseLevelUp`, helpers purs
`_starGeneratorBonus` / `_starGeneratorMsg` dans `js/state.js`)

Une fois Apothéose atteint (`houseTier >= 18`) **et** la Boucle Ténébreuse
niveau 2 active (même gate que le palier 18), `houseTier` continue de s'incrémenter
indéfiniment : chaque étoile N correspond à `houseTier = 18 + N`.

**Seuil** (formule polynomiale douce) :

```
seuil(★ N) = 45 000 + 15 000 × N + 1 000 × N²
```

Exemples : ★ 1 = 61 000 pts, ★ 5 = 145 000 pts, ★ 10 = 295 000 pts,
★ 20 = 745 000 pts. (`js/state.js — _starGeneratorBonus`, `main.js l.405`)

**Bonus par cadence** (identiques pour toutes les Maisons, adapté à la stat
de la Maison via `starGenerator`) :

| Cadence | Condition | Bonus |
|---------|-----------|-------|
| Chaque ★  | `n % 1 === 0` | +1 **stat principale** (ATK / MAG / MAG / DEF) |
| Tous les **2 ★** | `n % 2 === 0` | +1 **stat secondaire** (STR / INT / INT / END) |
| Tous les **5 ★** | `n % 5 === 0` | +1 **LCK** |
| Tous les **10 ★** | `n % 10 === 0` | +5 **PV max** (Gryffondor / Poufsouffle) ou +5 **PM max** (Serpentard / Serdaigle) |

> ✅ La valeur `hpMax` / `spMax` est incrémentée directement sur le personnage et
> la valeur courante (PV/PM) est également relevée d'autant (`Math.min(hpMax,
> hp + bonus[k])`). Le hpMax/spMax de la ★ N n'est **pas** recalculé par
> `recalculateStats` — c'est un incrément direct sur la valeur brute.

---

## Don à la Maison (gold-sink endgame)

✅ (dans le jeu — `js/house-donation.js`)

**Débloqué dès `houseTier >= 17`** (palier Mythe atteint). Un bouton « Don à
la Maison » apparaît dans le dialogue du chef de Maison correspondant.

| Paramètre | Valeur | Source |
|-----------|--------|--------|
| Taux de conversion | **5 G = 1 point** (fixe) | `_DONATION_GOLD_PER_POINT = 5` (`house-donation.js`) |
| Montant minimum | 5 G (en dessous = 0 point → refusé) | idem |
| Arrondi | Vers le bas — l'or non divisible par 5 est **conservé** | `spent = points × 5` |
| Boutons rapides | 1 k / 5 k / 10 k / Max | `setHouseDonationAmount` |
| Confirmation | Demande `confirm()` pour les dons ≥ 5 000 G | `confirmHouseDonation` |

Les points gagnés passent par `checkHouseLevelUp()` normalement — les paliers
18 (Apothéose) et ★ N sont franchissables via le don, sous réserve des gates
de Boucle Ténébreuse.

**Voix du chef** (32 samples au total, 8 par chef) :

| Contexte sample | Déclencheur |
|-----------------|-------------|
| `<chef>_donation_intro` | 1ʳᵉ ouverture de la modale (une fois par save, flag `donationIntroPlayed`) |
| `<chef>_donation_offer` | Ouvertures suivantes |
| `<chef>_donation_small` | Don < 5 000 G confirmé |
| `<chef>_donation_large` | Don ≥ 5 000 G confirmé |
| `<chef>_donation_refuse` | Montant invalide ou fonds insuffisants |
| `<chef>_apotheose_star` | Passage d'un ★ N |
| `<chef>_apotheose_star_first` | Passage du premier ★ (★ 1) |
| `<chef>_apotheose_star_milestone` | Passage d'un ★ multiple de 10 |

Chefs : `mcgonagall` (Gryffondor), `rogue` (Serpentard), `flitwick`
(Serdaigle), `sprout` (Poufsouffle).

---

## Sets de Maison

✅ (dans le jeu — `HOUSE_SETS` dans `js/state.js`)

Chaque Maison dispose d'un **set de 4 pièces** dont les bonus s'activent par
seuils (2 / 3 / 4 pièces équipées) et sont calculés par `recalculateStats()`.
Les items sont distribués progressivement via les paliers **Apprenti Or** (1ʳᵉ
pièce), **Confirmé Or** (2ᵉ), **Maître Or** (3ᵉ) et la **quête de set**
déclenchée au palier 12 (4ᵉ pièce).

> 🔗 Détail des bonus de set 2/3/4 pièces par Maison → **G5 Équipement & Sets**.

---

## Interactions

- **G2 Combat** : les passifs Apothéose (Élan, lifesteal, coût réduit, Vigueur)
  s'activent **dans** le combat ; les points de Maison sont crédités **à la
  sortie** du combat dans `endBattle`.
- **G3 Progression** : les bonus stats de palier incrémentent `_baseAtk /
  _baseDef / _baseMag / _baseLck` (même chemin que le level-up) ;
  `recalculateStats()` reconstruit les stats effectives avec l'équipement.
- **G5 Équipement & Sets** : les pièces de set sont distribuées par le chef de
  Maison (flux `pendingHouseRewards`), pas par les coffres.
- **G6 Sorts** : les sorts de Mythe sont enseignés via `_teachSpellToParty`
  (groupe entier) — même mécanique que `grantsSpell` d'équipement.
- **Mode Ironman** : les points et paliers fonctionnent normalement ; le
  gold-sink reste intéressant mais la mort est définitive avant d'atteindre
  les paliers tardifs.
- **Boucle Ténébreuse** (étages 11+) : nécessaire pour Mythe (`requiresDarkTier
  1`) et indispensable pour Apothéose / ★ N (`requiresDarkTier 2`, étages 21+).

---

## Cas limites & garde-fous

✅ (dans le jeu)

- **`checkHouseLevelUp` idempotente** : `if (houseTier >= tierNum) return` —
  un même palier ne peut jamais être franchi deux fois.
- **Gate endgame à double verrou** : `victoryAchieved` (palier 16 Légende) puis
  `endgameTierIndex >= 1` ou `>= 2` (paliers 17-18+). Les deux conditions sont
  évaluées indépendamment.
- **Don refusé si < 5 G** : `real < _DONATION_GOLD_PER_POINT → return false`.
  L'or non converti (reste de la division entière) n'est **pas prélevé**.
- **Don refusé si `houseTier < 17`** : la fonction `donateGoldToHouse` vérifie
  ce guard avant toute opération.
- **hpMax / spMax de ★ N** : incrément direct, jamais recalculé (pour éviter la
  perte au recalc d'équipement) — mais le PV/PM courant est relevé d'autant.
- **Boucle ★ N continue dans la même passe** : la boucle `while(true)` de
  `checkHouseLevelUp` peut franchir plusieurs ★ en un seul appel si le joueur
  a accumulé assez de points (ex. via un grand don).

---

## ❓ À détailler / 💡 pistes

> ❓ À détailler : quel est l'ordre exact de la cérémonie `claim_house_reward`
> chez le chef — le dialogue spécial est-il documenté côté design ou seulement
> câblé dans `npc-dialog.js` ?

> ❓ À détailler : la **quête de set** déclenchée au palier 12 (`unlockHouseQuest`)
> — ses objectifs et récompenses sont dans `QUEST_TEMPLATES` (quests.js) ;
> mérite un tableau par Maison ici ou en G5.

> ❓ À détailler : **`legendaryPassive`** (flag du palier 16 Légende dans
> `HOUSE_BONUSES.tiers`) — son effet exact n'est pas encore documenté séparément
> de l'Apothéose ; à clarifier si c'est distinct du passif capstone.

> 💡 (proposition) Ajouter un **tableau récapitulatif du coût total en points**
> pour chaque plateau (niveau max raisonnablement atteignable par tranche d'étage
> explorée) — utile pour calibrer l'économie sans simulation.

---

## Récapitulatif express (pour briefer Gemini)

> **4 Maisons** = 4 profils de stat (ATK / MAG / MAG / DEF), **18 paliers
> nommés** (Apprenti Bronze → Légende → Mythe → Apothéose) + série **★ N**
> génératrice infinie. Points gagnés par **kill** (8/10/14/18 selon difficulté,
> ×1.5 en Ténèbres) et **quête remise** (+30 pts). Paliers Légende/Mythe/
> Apothéose **gatés par la victoire et la Boucle Ténébreuse**. Mythe (30 k pts,
> ét. 11+) = sort exclusif + gold-sink. Apothéose (45 k pts, ét. 21+) = passif
> légendaire (Cœur du Lion / Soif du Serpent / Esprit de l'Aigle / Souffle du
> Blaireau). Série ★ N : seuil polynomial `45k + 15k·N + 1k·N²`, taux de don
> **5 G = 1 pt**, voix du chef sur chaque ★.
