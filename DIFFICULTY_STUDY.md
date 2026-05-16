# Étude complète de la difficulté & refonte des équations de puissance

> Méthode : lecture du code réel (`scaleMonster`, `rollGroupSize`, `executeAttack`,
> `enemyTurn`, `tryEnemyAbility`, `checkLevelUp`, `recalculateStats`) + simulation
> Monte-Carlo `tools/sim-difficulty.js` (600 combats / étage / mode).
> Document d'analyse — aucune modification de code appliquée à ce stade.

---

## 1. Résumé exécutif

Le jeu **décroche brutalement en milieu de partie** et devient **mathématiquement
ingagnable en fin de partie**, dans les deux modes.

| Mode | Confortable (≥ 80 %) | Décrochage | Effondrement (< 40 %) |
|------|----------------------|------------|------------------------|
| Solo | étages 1–2           | étage 3 (73 %) | **étage 5 (33 %)** |
| Duo  | étages 1–5           | étage 6 (73 %) | **étage 7 (42 %)** |

À partir de l'étage 8, le taux de victoire tombe sous 30 % puis sous 15 %
(étages 10+). **Ce n'est pas un pic de difficulté, c'est un mur infranchissable.**

La cause n'est pas un réglage isolé mais **un défaut structurel des équations** :
les monstres gagnent en puissance *plus vite que le joueur*, et la formule de
dégâts `max(1, atk − def)` transforme cet écart en deux falaises symétriques.

---

## 2. Les équations actuelles

### 2.1 Mise à l'échelle des monstres (`dungeon.js — scaleMonster`)

```
intraMult = 1 + (floor − 1) × scale          // scale ∈ [0.15 … 0.40] par monstre
stat      = floor(base × intraMult × diffMult)
```

Appliquée **identiquement** à `hp`, `atk`, `def`, `xp`, `gold`. Le coefficient
`scale` est propre à chaque monstre (0.15 = lent, 0.40 = Voldemort).

### 2.2 Progression du joueur (`battle.js — checkLevelUp`)

Par niveau gagné :
- `hpMax += 8`, `spMax += 5`
- `_baseAtk += 1`, `_baseDef += 1`, `_baseMag += 1`
- `_baseStr/_baseInt/_baseAgi += 1`
- `+3` points libres à allouer (STR→ATK, INT→MAG, END→PV, …)

Cadence observée (sim) : **≈ 1 niveau par étage**. XP requise : `xpNext ×= 1.6`.

### 2.3 Formule de dégâts (`battle.js`)

- Joueur → ennemi : `dmg = max(1, atk + rand(0..3) − enemyDef)`
- Ennemi → joueur : `dmg = max(0, enemyAtk + rand(0..2) − playerDef)`
- Capacité ennemie `damage` : `max(1, power + mag/2 − playerDef/3)`

---

## 3. Diagnostic — pourquoi ça casse

### 3.1 Le joueur grandit **linéairement**, les monstres aussi… mais pas à la même pente

`intraMult = 1 + (F−1)×scale` est **linéaire** en `F`. Ce n'est pas exponentiel.
Le problème est la **pente**, multipliée par la stat de base :

| Grandeur | Pente par étage |
|----------|-----------------|
| ATK d'un monstre élite (base 16, scale 0.32) | **+5.1 / étage** |
| DEF effective du joueur (1/niveau + équipement) | ≈ +2 à +3 / étage |
| ATK effective du joueur (1/niveau + alloc + équip) | ≈ +3 à +4 / étage |
| DEF d'un monstre élite (base 8, scale 0.32) | **+2.6 / étage** |

Les dégâts *subis par coup* augmentent donc d'environ **+2.5 / étage sans
plafond**, et les dégâts *infligés par coup* stagnent puis s'effondrent.

### 3.2 Falaise n°1 — les attaques physiques du joueur deviennent inutiles

`max(1, atk − def)` : dès que la DEF du monstre rattrape l'ATK du joueur, **tout
coup physique tombe au plancher de 1 dégât**.

**Cas Voldemort Ressuscité, étage 10** (base hp100 atk28 def14 mag25, scale 0.40) :
`intraMult = 1 + 9×0.40 = 4.6`
→ **hp 460, atk 128, def 64, mag 115**

Joueur étage 10, niveau 10, build correct + équipement légendaire :
ATK effective ≈ 35.
`dmg = max(1, 35 + rand − 64) = 1`. **Le joueur ne peut littéralement plus
le frapper.** Il reste les sorts — mais `power + mag/2 ≈ 75` contre **460 PV**,
soit 6 sorts à 20 PM = 120 PM pour une réserve d'environ 67. Insuffisant.

### 3.3 Falaise n°2 — les coups ennemis approchent du one-shot

Mêmes chiffres : Voldemort atk 128, DEF joueur ≈ 26 →
`dmg = 128 − 26 ≈ 102` par coup. PV de Harry à 107.
**Mort en 1 à 2 coups**, sur un boss qui agit chaque tour.

### 3.4 Falaise n°3 — l'effet de meute amplifie tout

`rollGroupSize` fait monter la proportion de groupes de 2-3 avec l'étage **et**
avec le farming (`floorKillCount`). Combats à 3 ennemis : la party joue 2
actions pendant que 3 monstres frappent. Couplé aux falaises 1 & 2, chaque tour
perdu à infliger « 1 dégât » est un tour où l'on encaisse 3×100.

### 3.5 Le coefficient `scale` par monstre crée une variance ingérable

À l'étage 10, un monstre `scale 0.15` est à ×2.35, un `scale 0.40` à ×4.6.
**Pour le même étage, un quasi-doublement de puissance selon le tirage.** Impossible
à équilibrer : si l'on cale le joueur sur la moyenne, les monstres à haut `scale`
sont des one-shots et ceux à bas `scale` sont triviaux.

### 3.6 Synthèse chiffrée (formule réelle, mode Normal)

| Étage | Monstre repère | HP scalé | ATK scalé | DEF scalée | Coup reçu* | Coup infligé* |
|------:|----------------|---------:|----------:|-----------:|-----------:|--------------:|
| 5  | Mangemort Masqué (0.30) | 88  | 26  | 13 | ~14 | ~6  |
| 7  | Mangemort d'Élite (0.32) | 160 | 46 | 23 | ~30 | ~5  |
| 10 | Voldemort Ressuscité (0.40) | 460 | 128 | 64 | ~102 | **1** |

\* estimations avec un joueur de niveau ≈ étage, build équilibré + équipement
de boutique/quêtes best-in-slot.

---

## 4. Refonte proposée des équations

Trois leviers indépendants. Chacun peut être adopté seul ; ensemble ils
reconstruisent une courbe saine.

### Levier A — Découpler offense / défense / PV du monstre

Le défaut central : `scale` unique appliqué à toutes les stats. On le remplace
par **trois pentes distinctes**, calées sur la croissance réelle du joueur.

```
hpMult(F)  = 1 + (F − 1) × 0.26      // PV : ~ inchangé (combats de durée stable)
atkMult(F) = 1 + (F − 1) × 0.16      // ATK : ralentie — cœur du correctif
defMult(F) = 1 + (F − 1) × 0.11      // DEF : nettement ralentie
```

`scale` par monstre est conservé mais **réinterprété comme un modificateur
d'archétype léger** (± autour de 1.0) : un tank a `defMult` un peu plus haut,
un glass-cannon a `atkMult` un peu plus haut, sans jamais dépasser ~±25 %.

*Effet :* à l'étage 10, l'ATK de Voldemort passe de ×4.6 à ×2.44 (atk ≈ 68
au lieu de 128) et sa DEF de ×4.6 à ×1.99 (def ≈ 28 au lieu de 64). Le joueur
peut de nouveau le frapper, et un coup reçu redevient survivable.

### Levier B — Remplacer le plancher de dégâts par une atténuation douce

`max(1, atk − def)` est le générateur des deux falaises. On le remplace par une
**atténuation en ratio**, qui ne tombe jamais à 0 % ni ne monte à 100 % :

```
mitigation = def / (def + K)          // K ≈ 55
dmg        = max(1, round( (atk + rand) × (1 − mitigation) ))
```

| DEF | Atténuation (K=55) |
|----:|-------------------:|
| 15  | 21 % |
| 30  | 35 % |
| 60  | 52 % |
| 100 | 64 % |

Un attaquant inflige **toujours ≥ 36 %** de son ATK brute, quelle que soit la
DEF adverse → plus de coup à « 1 ». La DEF reste très utile (jusqu'à −64 %)
mais cesse d'être un interrupteur tout-ou-rien.

*Variante minimale (si on veut un changement chirurgical)* : garder la
soustraction mais **plafonner la DEF** à `0.75 × atk` →
`dmg = max(round(atk × 0.25), atk + rand − def)`. Une seule ligne par formule,
supprime la falaise n°1 sans toucher au reste.

### Levier C — Courbe globale d'étage plutôt que par-monstre

Optionnel mais recommandé à terme : factoriser A dans une fonction
`floorPower(F)` partagée, exposée comme constante de réglage unique. Cela
supprime la variance ×2 du §3.5 et rend toute future recalibration triviale
(un seul endroit à toucher au lieu de 50 entrées `scale`).

### Cible de design visée après refonte

| Indicateur | Cible |
|------------|-------|
| Coups joueur pour tuer un mob standard | 5 – 7 |
| Coups ennemis pour mettre un perso KO | 6 – 9 |
| Dégât physique joueur minimum vs n'importe quel DEF | ≥ 36 % de l'ATK brute |
| Win rate Solo, étages 1–10 | ≥ 60 % partout, ≥ 80 % jusqu'à l'étage 4 |
| Win rate Duo, étages 1–10 | ≥ 65 % partout, ≥ 80 % jusqu'à l'étage 6 |
| Aucun spike > 20 pts entre deux étages consécutifs |

---

## 5. Points secondaires relevés

- **Endgame (`ENDGAME_SCALING`)** : la récursion post-victoire empile
  `stat × scal + fixEff` par-dessus un `intraMult` déjà cassé. Tant que le
  scaling de base n'est pas corrigé, l'endgame est hors d'atteinte. À
  re-simuler **après** la refonte A/B.
- **Capacités `damage`** : atténuées par `def/3` seulement — incohérent avec
  la formule d'attaque normale. À aligner sur le levier B (`mitigation`).
- **MAG ennemie** : non scalée par `intraMult` en pré-victoire (constante),
  puis scalée d'un coup en post-victoire. Incohérence à trancher.
- **`xp`/`gold`** scalent avec le même `scale` que les stats : si l'on
  ralentit le combat, vérifier que la cadence « 1 niveau / étage » tient
  toujours, sinon le joueur décroche en niveau.
- **`rollGroupSize`** : le bonus de farming (`floorKillCount`) peut pousser
  à 3 ennemis très tôt ; à re-vérifier une fois A/B en place.

---

## 6. Plan d'implémentation suggéré

1. Levier B (atténuation douce) dans les 3 formules de dégâts → vérifier sim.
2. Levier A (3 pentes `hp/atk/def`) dans `scaleMonster` → re-simuler, ajuster
   les constantes 0.26 / 0.16 / 0.11 jusqu'aux cibles du §4.
3. Aligner les capacités `damage` sur la formule B.
4. Re-simuler endgame (Boucle Ténébreuse) et recalibrer `ENDGAME_SCALING`.
5. Levier C (refactor `floorPower`) — confort de maintenance, sans impact joueur.
6. `node tests/smoke.js` + mise à jour de `DIFFICULTY_REPORT.md`.

Chaque étape est isolée et validable par simulation avant la suivante.

---

## 7. État d'implémentation

**Levier B — implémenté** (variante minimale, plancher de dégâts).

`max(1, atk − def)` est remplacé par `mitigatedDamage(rawAtk, def)` =
`max( round(rawAtk × 0.25), rawAtk − def )` dans `executeAttack` et les
deux coups de `enemyTurn`. La constante `DAMAGE_MIN_FRACTION = 0.25` est
dans `data.js`. La formule des capacités ennemies (`def/3`) reste inchangée
(hors périmètre). Détails : `.claude/plans/difficulty-lever-b.md`.

Variante retenue : le **plancher 25 %** plutôt que le ratio `def/(def+K)`,
car le ratio aurait alourdi les étages 1-4 (où DEF ≈ ATK). La soustraction
est conservée tant qu'elle dépasse le plancher → aucune régression early-game.

Impact mesuré (sim 600 combats/étage, mode Normal) :

| Étage | Mode | Avant B | Après B |
|------:|:----:|--------:|--------:|
| 3  | Solo | 73 % | 78 % |
| 4  | Solo | 65 % | 70 % |
| 5  | Solo | 33 % | 37 % |
| 6  | Duo  | 73 % | 77 % |
| 7  | Duo  | 42 % | 48 % |

Gain réel mais modéré : le levier B supprime la falaise n°1 (attaques
physiques rendues utiles) mais **ne touche pas** la falaise n°2 (explosion
des dégâts subis). Le mur de fin de partie subsiste — sa correction
nécessite le **levier A** (découplage des pentes de scaling), non implémenté.

**Leviers A et C — non implémentés** (hors périmètre choisi).
