# G3 — Progression

**Statut :** 🟧 ébauche

> Objectif du chapitre : décrire le système de montée en puissance du groupe —
> niveaux, stats primaires et secondaires, rework D1–D5 (conversions inter-stats),
> stats dérivées (crit physique, crit de sort, esquive, Fortune, Célérité) et
> allocation libre de points.

---

## Vue d'ensemble

✅ (dans le jeu) La progression est **partagée entre les deux héros** : le niveau,
l'XP et l'or sont portés par `player` (Harry) et répercutés instantanément sur
`player2` (Hermione) à chaque level-up. Il n'y a **pas de niveaux individuels** —
le groupe monte ensemble.

L'architecture repose sur une séparation stricte entre **stats de base** (qui
croissent de façon permanente) et **stats effectives** (recalculées à chaque
level-up ou changement d'équipement par `recalculateStats()`). Cette séparation
évite les effets de bord entre équipement, level-up et allocation libre de
points.

Les **stats dérivées** (crit physique, crit de sort, esquive, Fortune, Célérité)
sont calculées à l'issue de `recalculateStats()` et ne sont jamais modifiées
directement : elles découlent toujours des stats primaires et secondaires finales.

---

## Fonctionnement

### XP et montée de niveau

✅ (dans le jeu — `battle-rewards.js — checkLevelUp / _grantLevel*`)

L'XP est versée en fin de combat (`endBattle`) sur `player.xp`, multipliée par
le coefficient de difficulté. Quand `player.xp >= player.xpNext`, le groupe passe
au niveau suivant :

1. `player.level` s'incrémente.
2. `player.xp -= player.xpNext` (soustraction, pas remise à zéro).
3. `player.xpNext` est **multiplié par `LEVEL_UP_XP_MULTIPLIER = 1.6`** (`data.js`),
   créant une courbe exponentielle douce.
4. Pour chaque héros actif (`party.slice(0, partySize)`) :
   - `_grantLevelHpSp` : `_baseHpMax += 8`, `_baseSpMax += 5`.
   - `_grantLevelStats` : `_baseAtk += 1`, `_baseDef += 1`, `_baseMag += 1`,
     `_baseStr += 1`, `_baseInt += 1`, `_baseAgi += 1`.
   - `_grantLevelStatPoints` : `unallocatedStatPoints += 3` (`STAT_POINTS_PER_LEVEL`).
5. `recalculateStats()` reconstruite les stats effectives (base + équipement +
   rework D1–D5).
6. Full heal (PV et PM au maximum).

> ❓ À détailler : la courbe XP complète (de niveau 1 à 10+) n'est pas documentée
> en table — calculable depuis la valeur initiale de `player.xpNext` et le
> multiplicateur `1.6`.

### Sorts appris au level-up

✅ (dans le jeu — `battle-rewards.js — _grantLevelSpells`)

| Niveau | Harry apprend | Hermione apprend |
|--------|---------------|-----------------|
| 2 | — | Expelliarmus |
| 3 | Accio | Stupefix |
| 4 | Wingardium Leviosa | Ferula |
| 5 | Reparo | Diffindo |
| 6 | Ferula | — |
| 7 | Diffindo | Wingardium Leviosa, Reparo, Ferula Maxima |
| 8 | Cheminette Inter-Mondes | Cheminette Inter-Mondes |
| 9 | Avada... (déverrouillé) | Avada... (déverrouillé) |

Au niveau 9, le flag `locked:true` du sort `Avada...` est muté en `false` dans le
registre `SPELLS` (`data.js`) pour les deux héros simultanément.

### Allocation libre de points

✅ (dans le jeu — `ui-character-sheet.js / data.js — STAT_POINT_EFFECTS`)

À chaque level-up, chaque héros reçoit **3 points non alloués**
(`STAT_POINTS_PER_LEVEL`, `data.js`). Le joueur les dépense librement via la
modale Personnage (section Stats). L'effet d'un point alloué est permanent — il
est appliqué sur la base (`_base*`) et survit aux recalculs.

| Choix | Effet permanent (`data.js — STAT_POINT_EFFECTS`) |
|-------|--------------------------------------------------|
| STR | +1 `_baseAtk`, +1 `_baseStr` |
| INT | +1 `_baseInt` |
| AGI | +1 `_baseAgi` |
| END | +5 PV max (`hpMax`), +1 `_baseEnd` |
| LCK | +1 `_baseLck` |

---

## Règles & valeurs

### Stats de base des héros (au niveau 1)

✅ (dans le jeu — `js/data.js — CHARACTERS`)

Seuls Harry et Hermione sont disponibles par défaut dans le mode 2 joueurs. Les
autres héros (`draco`, `cho`, `cedric`, personnages originaux) sont sélectionnables
à l'écran de démarrage.

| Stat | Harry | Hermione |
|------|-------|----------|
| PV (`hp`) | 35 | 28 |
| PM (`sp`) | 22 | 35 |
| ATK | 5 | 3 |
| DEF | 2 | 2 |
| MAG | 10 | 16 |
| LCK | 15 | 12 |
| FOR (STR) | 9 | 6 |
| INT | 11 | 17 |
| AGI | 12 | 10 |
| END | 10 | 7 |

Harry : profil physique-offensif (LCK élevée → bon taux de crit physique, STR
élevée → pénétration de DEF). Hermione : profil mage-soutien (INT et MAG élevées
→ sorts plus puissants et PM importants).

### Stats primaires et secondaires

**Stats primaires** (pilotent directement le combat) :
- `atk` — dégâts physiques
- `def` — mitigation des coups reçus
- `mag` — puissance des sorts
- `lck` — chance (crit physique, Fortune)

**Stats secondaires** (débouchés propres depuis le rework D1–D5) :
- `str` (FOR) — pénétration de DEF physique (D4)
- `int` — conversion vers MAG (D1)
- `agi` — crit de sort, esquive, Célérité (D5)
- `end` — résistance DoT (D3), conversion vers DEF (D2), PV max (D2bis)

### Rework des statistiques D1–D5

✅ (dans le jeu — `inventory-core.js — recalculateStats`, constantes `data.js`)

Ces conversions sont appliquées **après** base + équipement + sets, sur les
stats effectives finales. Elles ne se déclenchent pas sur les stats de base
seules.

| Décision | Règle | Constante |
|----------|-------|-----------|
| **D1** INT → MAG | `mag += floor(int / 4)` | `INT_MAG_DIV = 4` (`data.js`) |
| **D2** END → DEF | `def += floor(end / 6)` | `END_DEF_DIV = 6` (`data.js`) |
| **D2bis** END gagné → PV max | `hpMax += 5 × (end effectif − _baseEnd)` — seuls les points d'END acquis par équipement/sets/buffs comptent ; l'END de base et l'END allouée sont déjà crédités dans `_baseHpMax` | `END_HP_PER = 5` (`data.js`) |
| **D3** END → résistance DoT | À chaque tick de DoT subi (héros), dégâts réduits de `floor(end / 12)`, plancher 1 | `END_DOT_RES_DIV = 12` (`data.js`) |
| **D4** STR → pénétration DEF | `effDef = def × (1 − penFrac)` — `penFrac` suit une courbe de Hill (n=2) : cap **50 %** atteint asymptotiquement, demi-saturation à STR **20** | `STR_PEN_CAP = 0.50`, `STR_PEN_HALF = 20` (`data.js`) |
| **D5 volet LCK** → Fortune | Stat dérivée `fortune`, courbe de Hill saturante (voir ci-dessous) | `FORTUNE_*` (`data.js`) |
| **D5 volet AGI** → Célérité | Stat dérivée `celerite`, courbe de Hill saturante (voir ci-dessous) | `CELERITE_*` (`data.js`) |

### Stats dérivées — formules complètes

✅ (dans le jeu — `inventory-core.js — recalculateStats`)

Toutes les stats dérivées sont recalculées par `recalculateStats()` à chaque
level-up ou changement d'équipement. Les bonus d'équipement (`bonusCritChance`,
`bonusDodgeChance`…) s'ajoutent **par-dessus** les plafonds LCK/AGI.

| Stat dérivée | Formule de base | Plafond de base | Plafond absolu |
|--------------|-----------------|-----------------|----------------|
| `critChance` | `5 + lck × 0.5` | **40 %** (piloté par LCK) | 100 % |
| `spellCritChance` | `5 + agi × 0.4` | **35 %** (piloté par AGI) | 100 % |
| `dodgeChance` | `5 + agi × 0.4 + dodgeBonus` | **35 %** | 35 % (cap compris bonus) |
| `critMultiplier` | `1.5 + bonusCritDamage` | — | **2.5** (`data.js` cap) |
| `spellCritMultiplier` | `1.5 + bonusSpellCritDamage` | — | **2.5** |
| `fortune` | courbe Hill (voir ci-dessous) | ~**31 %** | ~31 % + Félix |
| `celerite` | courbe Hill (voir ci-dessous) | ~**30 %** | ~30 % |

**Crit physique (LCK)** : roll `< critChance` dans `executeAttack` → dégâts ×
`critMultiplier`.

**Crit de sort (AGI)** : roll `< spellCritChance` dans `rollSpellCrit`
(`battle-spells.js`) → dégâts × `spellCritMultiplier`.

**Esquive (AGI)** : roll `< dodgeChance` dans `enemyTurn` → attaque ennemie
annulée.

**Passif Apothéose Gryffondor** (palier 18) : `critChance += 10`,
`spellCritChance += 10`, `critMultiplier += 0.15`, `spellCritMultiplier += 0.15`
— appliqués par-dessus les plafonds, plafond absolu 100 % / 2.5.

### Fortune (D5 volet LCK)

✅ (dans le jeu — `inventory-core.js — _fortuneCurve, partyFortune`)

La stat dérivée `fortune` pilote tous les **événements aléatoires hors-crit** :
taux de drops, or de combat et de coffre (+× F et +× F×0.5 respectivement),
seuil de fouille, chance de fuite, résistance aux pièges.

```
fortune = FORTUNE_ASYMPTOTE × x² / (x² + FORTUNE_HALF²)
  où x = LCK + Σ item.bonusFortune  (+ FELIX_POINTS si buff Félix actif)

FORTUNE_ASYMPTOTE = 0.31   (courbe tend vers ~31 %, jamais atteint)
FORTUNE_HALF      = 30     (x=30 → ~15.5 %)
```
(`data.js`)

**`partyFortune()`** (`inventory-core.js`) : retourne le **maximum** de la
Fortune des membres vivants du groupe — le membre le plus chanceux profite à
tous (cohérent avec l'inventaire/or partagés).

**Félix Felicis** (`data.js — FELIX_POINTS = 40, FELIX_STEPS = 40`) : boire
cette potion arme `felixFortuneSteps = 40`. Pendant 40 pas d'exploration,
`FELIX_POINTS = 40` s'ajoutent à `x` dans `partyFortune()` avant d'entrer
dans la courbe (buff transient, non sérialisé dans `_fortuneX`). La saturation
de la courbe fait que le buff est décroissant en valeur marginale quand la LCK
est déjà élevée.

Applications concrètes de la Fortune :
- Drops de combat : chance × `(1 + F)` (`battle-rewards.js`).
- Or de combat/coffre : × `(1 + F × 0.5)` (poids ½ pour protéger l'économie).
- Seuil objet en fouille : `+F` (borné).
- Chance de fuite : `+F` plafonnée à 0.95 (`doFlee`).
- Embuscade de piège : `0.5 − F` ∈ [0.1, 0.9] (`_triggerDungeonTrap`).

### Célérité (D5 volet AGI)

✅ (dans le jeu — `inventory-core.js — _celeriteCurve`, `battle.js`)

L'AGI pilote le crit de sort et l'esquive, tous deux plafonnés à 35 % (atteint
pour AGI ≈ 75). La **Célérité** est le débouché post-plafond : une stat dérivée
qui donne un **taux continu d'actions supplémentaires par round**.

```
celerite = CELERITE_MAX × x² / (x² + CELERITE_HALF²)
  où x = AGI + Σ item.bonusCelerite

CELERITE_MAX  = 0.30   (taux max ~30 % d'actions sup./round)
CELERITE_HALF = 45     (AGI=45 → ~15 %)
```
(`data.js`)

**Accumulateur de tempo (type ATB)** : en combat, chaque héros dispose d'une
jauge `celeriteGauge[idx]` réinitialisée à 0 au début du combat (`startBattle`).
À l'ouverture de chaque segment du héros (`_beginHeroSegment`), la jauge monte
de `c.celerite`. Quand elle franchit 1.0, une action supplémentaire est mise en
réserve (`celeriteExtra[idx]`). `advanceBattleChar()` re-prompte le même héros
tant qu'il a des actions en réserve (bandeau « ⚡ Célérité ! »).

Exemples de cadence pour des valeurs courantes :
- AGI 30 : celerite ≈ 0.11 → ~1 action sup. toutes les 9 rounds.
- AGI 45 : celerite ≈ 0.15 → ~1 action sup. toutes les 7 rounds.
- AGI 75 : celerite ≈ 0.22 → ~1 action sup. toutes les 5 rounds.

La jauge est **combat-scoped** (jamais persistée dans la sauvegarde).
L'équipement peut porter `item.bonusCelerite` pour augmenter `x` avant la courbe.

---

## Interactions

- **G2 Combat** : les stats dérivées (crit physique/sort, esquive, Fortune,
  Célérité, pénétration STR, résistance DoT END) s'appliquent directement dans
  les fonctions de combat (`executeAttack`, `enemyTurn`, `doFlee`,
  `_spellElementalDamage`, `tickStatuses`).
- **G4 Maisons** : les paliers de Maison incrémentent les `_base*` (stats
  primaires) ou offrent des items. L'Apothéose Gryffondor (palier 18) pousse
  `critChance` et `critMultiplier` au-delà des plafonds normaux dans
  `recalculateStats()`.
- **G5 Équipement** : les champs `bonusAtk`, `bonusCritChance`,
  `bonusDodgeChance`, `bonusFortune`, `bonusCelerite`, `bonusHpMax`, etc. sont
  tous sommés dans `recalculateStats()`. L'END d'équipement déclenche le bonus
  D2bis (PV max).
- **G6 Sorts** : `spellCritChance`/`spellCritMultiplier` s'appliquent dans
  `battle-spells.js — rollSpellCrit` pour les sorts offensifs. L'INT pilote
  indirectement la MAG via D1.
- **Mode Solo** : `partySize = 1` — seul `party[0]` (Harry) reçoit level-up et
  allocation de points. `partyFortune()` n'évalue que Harry.

---

## Cas limites & garde-fous

✅ (dans le jeu)

- **Lazy-init des stats secondaires** : `recalculateStats()` initialise
  `_baseStr`/`_baseInt`/`_baseAgi`/`_baseEnd` si absents (sauvegardes
  antérieures au rework). Idem pour `_baseHpMax`/`_baseSpMax`.
- **Pas de double-comptage D2bis** : `hpMaxBonus += END_HP_PER × max(0, end − _baseEnd)`.
  L'END de base et l'END allouée (qui incrémentent `_baseEnd` et `_baseHpMax`
  simultanément) sont exclues du calcul.
- **recalculateStats() après application d'une save** : `_applyState()` dans
  `save.js` appelle `recalculateStats()` après migration, garantissant la
  cohérence des stats dérivées même sur une save ancienne.
- **Plafond critMultiplier à 2.5** : évite les one-shots de boss — tout bonus
  cumulé (équipement + sets + Apothéose) est borné par `Math.min(2.5, ...)`.
- **dodgeChance cap 35 %** : même avec des bonus d'équipement, l'esquive est
  bornée à 35 % (`Math.min(35, ...)`) — contrairement à `critChance` et
  `spellCritChance` qui peuvent dépasser leurs plafonds LCK/AGI via l'équipement.
- **Célérité non sérialisée** : la jauge `celeriteGauge` est combat-scoped.
  La valeur `c.celerite` est dérivée et recalculée — aucune migration nécessaire.
- **Félix transient** : `FELIX_POINTS` s'ajoutent à `x` dans `partyFortune()`
  uniquement (pas dans `recalculateStats()`). `_fortuneX` mémorise toujours `x`
  sans Félix pour permettre le recalcul avec bonus transient.

---

## ❓ À détailler / 💡 pistes

> ❓ À détailler : table de progression XP complète (niveaux 1–15+) — valeurs
> extrapolables depuis la valeur initiale de `player.xpNext` (dans `state.js`)
> et le multiplicateur `LEVEL_UP_XP_MULTIPLIER = 1.6`.

> ❓ À détailler : plafond de niveau effectif — le code ne fixe pas de niveau
> maximum explicite ; à confirmer si un niveau max est envisagé côté design.

> ❓ À détailler : interaction entre buffs temporaires de stat (statuts
> `buff_atk`, `buff_def`…) et `recalculateStats()` — les buffs sont réappliqués
> à chaque recalc (via `BUFF_STAT_BY_ID`) ; documenter l'ordre exact si
> nécessaire pour la fiche Sorts (G6).

> 💡 (proposition) Envisager une table des « seuils de déblocage » par stat
> secondaire : à quelle valeur d'AGI l'esquive est-elle au cap ? à quelle valeur
> d'INT le bonus MAG vaut-il l'investissement ? Ces repères aideraient le joueur
> à calibrer son allocation.

---

## Récapitulatif express (pour briefer Gemini)

> XP partagée, montée de niveau simultanée : +1 ATK/DEF/MAG/STR/INT/AGI par
> héros, +8 PV / +5 PM base, +3 points libres (STR/INT/AGI/END/LCK).
> **Rework D1–D5** : INT→MAG (÷4), END→DEF (÷6), END gagné→+5 PV/pt, END→−tick
> DoT (÷12), STR→pénétration DEF (Hill, cap 50 %, demi-sat 20).
> **Stats dérivées** : crit phys. (LCK, cap 40 %), crit sort (AGI, cap 35 %),
> esquive (AGI, cap 35 %), Fortune (Hill LCK, ~31 %, événements aléatoires),
> Célérité (Hill AGI, ~30 %, actions supplémentaires ATB en combat).
