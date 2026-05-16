# Étude de la difficulté & équations de puissance

> Méthode : lecture du code réel + simulation Monte-Carlo
> `tools/sim-difficulty.js` (600-800 combats / étage / mode).
>
> ⚠️ **Correction importante** — une première version de cette étude
> concluait que le jeu était « ingagnable » en fin de partie. C'était faux :
> le harness de simulation comportait un bug (voir §2) qui désactivait
> silencieusement la modélisation des quêtes, de l'équipement et des
> potions. Corrigé. Les chiffres ci-dessous sont la mesure honnête.
>
> 🔄 **Recalcul (mai 2026)** — chiffres re-mesurés après la refonte du
> critique (deux canaux physique/sort, crit damage, crit > 40 %). Le jeu
> normal (§3-4) bouge peu (+2-4 pts, buff léger). En revanche les tables
> endgame (§8) étaient **obsolètes et trop optimistes** : les ajouts de
> monstres récents ont durci la Boucle au-delà de l'étage ~17 — §8
> ré-étalonné ci-dessous.

---

## 1. Résumé exécutif

La courbe de difficulté est **saine**. La fin de partie est exigeante, mais
c'est un **gate de progression voulu** : il se franchit en farmant des niveaux
et en récupérant des artefacts — exactement comme prévu par le design.

| Mode | Jeu normal (sans farming) | Avec farming + artefacts |
|------|---------------------------|--------------------------|
| Solo | confortable 1-6, tendu 7, difficile 8-9, dur 10-12 (~30 %) | 96 % à l'étage 8, 68-88 % aux étages 9-12 |
| Duo  | confortable 1-8, tendu 9, difficile 10-12 (59-65 %) | confortable, 89-100 % selon le farming |

**Il n'y a pas de mur infranchissable.** La zone « difficile » de fin de partie
est la récompense attendue de l'investissement (niveaux + équipement légendaire).

---

## 2. Correction méthodologique — bug du harness

`tools/sim-difficulty.js`, en mode simple, reconstruisait son objet `cfg` à
partir d'un **sous-ensemble** de `ARGS` :

```js
// AVANT (bug) — perd useQuests / useEquipment / usePotions / bonusLevels
const cfg = { nSims, hpMult, xpMult, statPoints, build };
```

Conséquence : `cfg.useQuests`, `cfg.useEquipment`, `cfg.usePotions` valaient
`undefined`. Tous les `if (cfg.useQuests)` de `createHero` étaient faux → le
joueur simulé n'avait **ni récompenses de quêtes, ni équipement, ni potions**.
La simulation tournait en réalité en mode `--pessimistic` permanent.

**Corrigé** : `cfg = ARGS` (objet déjà complet, defaults inclus).

Deux extensions ajoutées pour cette étude :
- `--bonus-levels=N` — niveaux gagnés au-delà de l'étage (modélise le farming).
- `--artifacts` — le best-in-slot inclut les artefacts légendaires hors
  boutique (récompenses de Maison, Forge, quêtes, drops Ténèbres) + les
  bonus de crit/esquive d'équipement.

---

## 3. Difficulté réelle — jeu normal

Modèle « joueur normal » : quêtes complétées, équipement best-in-slot de
boutique, stock de potions, 3 points de stats alloués par niveau (build
équilibré). ~4 combats / étage. Aucun farming supplémentaire.

| Étage | Solo (niv.) | Win % Solo | Duo (niv.) | Win % Duo |
|------:|:-----------:|-----------:|:----------:|----------:|
| 1-4  | 1→6  | 100 %        | 1→7  | 100 % |
| 5    | 8    | 95 %         | 8    | 100 % |
| 6    | 8    | 86 %         | 8    | 100 % |
| 7    | 9    | 76 %         | 9    | 98 %  |
| 8    | 9    | 60 %         | 10   | 93 %  |
| 9    | 10   | 45 %         | 10   | 77 %  |
| 10   | 10   | 33 %         | 11   | 65 %  |
| 11   | 11   | 31 %         | 11   | 60 %  |
| 12   | 11   | 28 %         | 12   | 59 %  |

**Lecture** : la difficulté monte progressivement, sans spike brutal. Le Solo
de fin de partie (étages 10-12, ~30 %) signale au joueur qu'il doit se
renforcer avant de continuer — ce n'est pas un blocage, c'est un signal.

> Note : les XP de quêtes font naturellement « sur-monter » le joueur en
> niveau (étage 10 → niveau 11). Le sur-leveling fait déjà partie du jeu
> normal, avant même tout farming volontaire.

---

## 4. Le gate de fin de partie se résout — comme prévu

Mesure avec farming (`--bonus-levels`) et artefacts légendaires (`--artifacts`) :

| Étage | Solo +8 niv. +artefacts | Duo +5 niv. +artefacts | Duo +12 niv. +artefacts |
|------:|------------------------:|-----------------------:|------------------------:|
| 8     | 96 %                    | 100 %                  | 100 % |
| 9     | 88 %                    | 96 %                   | 100 % |
| 10    | 81 %                    | 95 %                   | 99 %  |
| 11    | 73 %                    | 91 %                   | 98 %  |
| 12    | 68 %                    | 89 %                   | 97 %  |

**Conclusion : le design tient.** Investir des niveaux (farming respawn 20 %,
revisites d'étage) et récupérer les artefacts transforme une zone « difficile »
en zone « confortable ». Le mur EST la progression — il n'y a rien à corriger
côté scaling des monstres.

---

## 5. Équations — diagnostic révisé

Les équations actuelles sont **structurellement correctes**.

- **Scaling monstres** (`scaleMonster`) : `stat = base × (1+(F−1)×scale) × diffMult`.
  Linéaire en `F`, calibré pour que le gate de fin de partie demande du
  farming. À conserver.
- **Progression joueur** (`checkLevelUp`) : +8 PV, +5 PM, +1 ATK/DEF/MAG,
  +3 points libres par niveau. Le joueur peut dépasser la courbe ennemie en
  farmant — c'est le levier de progression voulu. À conserver.
- **Formule de dégâts** : un seul point méritait correction (voir §6).

Point d'attention mineur conservé pour l'avenir : le coefficient `scale`
par monstre (0.15→0.40) crée une variance de puissance à étage égal. Ce
n'est pas un bug — c'est de la variété — mais si une recalibration fine est
souhaitée un jour, resserrer la plage (ex. 0.20→0.34) lisserait l'expérience.
**Non prioritaire.**

---

## 6. Levier B — plancher de dégâts (implémenté)

Seul correctif appliqué. Problème visé : `max(1, atk − def)` fait tomber un
coup physique à **1 dégât** dès que la DEF adverse dépasse l'ATK — les
attaques physiques deviennent inutiles contre les ennemis très défensifs,
même pour un joueur correctement équipé.

**Correctif** — `mitigatedDamage(rawAtk, def)` :

```
dmg = max( round(rawAtk × 0.25), rawAtk − def )
```

Un coup inflige toujours ≥ 25 % de l'ATK brute. La soustraction `atk − def`
reste utilisée tant qu'elle dépasse ce plancher → **aucune régression
early-game** (où DEF ≈ ATK). Variante choisie de préférence au ratio
`def/(def+K)`, qui aurait alourdi les étages 1-4.

Appliqué à `executeAttack` et aux deux coups d'`enemyTurn`. La constante
`DAMAGE_MIN_FRACTION = 0.25` est dans `data.js`. La formule des capacités
ennemies (`def/3`) est laissée inchangée.

**Impact mesuré** (modèle honnête, sans farming) :

| Étage | Mode | Sans B | Avec B |
|------:|:----:|-------:|-------:|
| 6  | Solo | 78 % | 85 % |
| 7  | Solo | 71 % | 78 % |
| 8  | Duo  | 82 % | 91 % |
| 10 | Duo  | 57 % | 65 % |
| 11 | Duo  | 42 % | 57 % |
| 12 | Duo  | 44 % | 55 % |

Le levier B **n'aplatit pas le gate** (le farming reste nécessaire) mais
améliore nettement le confort en milieu et fin de partie, surtout en Duo
(+8 à +15 pts). Il rend aussi le farming plus efficace : sans lui, un coup
physique reste proche de 1 même très haut niveau face aux grosses DEF.

---

## 7. Recommandations

- ✅ **Levier B** — implémenté, validé, à garder.
- ✅ **Scaling des monstres** — ne pas toucher. Le gate de fin de partie est
  voulu et se franchit par le farming + les artefacts (§4).
- ✅ **Bug du harness de simulation** — corrigé ; `tools/sim-difficulty.js`
  modélise désormais fidèlement le joueur normal.
- 💡 **Piste optionnelle non prioritaire** — resserrer la plage de `scale`
  des monstres (§5) si une recalibration fine est souhaitée un jour.
- ❌ **Refonte du scaling (anciens « leviers A / C »)** — abandonnée. Elle
  reposait sur un diagnostic faussé par le bug du harness.

---

## 8. Endgame — Boucle Ténébreuse (post-victoire, étages 11+)

Après la victoire sur Voldemort Ressuscité, le jeu rejoue les étages par
paliers de 10 (`effectiveFloor = floor − 10`) en empilant la récursion
`ENDGAME_SCALING` : chaque palier applique `stat × scal + fixEff` une fois
de plus (`n = ⌊(floor−1)/10⌋`). La simulation modélise désormais cette
récursion via le flag `--endgame` (`tools/sim-difficulty.js`).

### 8.1 Sans farming volontaire

| Étage | Win % Solo | Win % Duo | Niveau joueur |
|------:|-----------:|----------:|--------------:|
| 11-15 | 93-100 %   | 100 %     | 11-12 |
| 18    | 48 %       | 77 %      | 11-12 |
| 20    | 18 %       | 42 %      | 12-13 |
| 25    | 8 %        | 20 %      | 13-14 |
| 30    | 2 %        | 13 %      | 14-15 |

En jeu « normal » (≈ 4 combats/étage, sans grind dédié), la Boucle
décroche vers l'**étage 17-19** puis devient très dure. Le décrochage est
plus précoce que dans la version précédente de cette étude : les monstres
profonds ajoutés depuis (Strigoï, Hécate, etc.) durcissent la récursion.

### 8.2 Cause structurelle — le joueur ne suit pas en niveau

Point clé : **le niveau du joueur stagne** — étage 30 atteint au niveau
14-15 seulement, soit +3-4 niveaux sur 20 étages de Boucle.

La raison est une course entre deux croissances géométriques :
- puissance des monstres : **× ~1.5 par palier** de 10 étages (récursion) ;
- coût d'un niveau joueur : `xpNext ×= 1.6` **par niveau**.

Le coût d'XP du joueur compose plus vite que l'XP gagnée. La progression
passive (marcher vers le bas) ne suit donc pas — contrairement au jeu
principal où l'XP des quêtes maintenait le joueur sur la courbe.

### 8.3 Avec farming de niveaux — le gate se résout

| Étage | Duo +10 niv. | Duo +25 niv. | Duo +45 niv. |
|------:|-------------:|-------------:|-------------:|
| 20    | 78 %         | 97 %         | 100 % |
| 25    | 37 %         | 72 %         | 92 %  |
| 30    | 27 %         | 49 %         | 81 %  |

Règle empirique : **~+20-22 niveaux farmés par tranche de 10 étages** de
Boucle pour rester en zone confortable — le farming demande nettement plus
d'investissement que ce que mesurait l'ancienne version de l'étude.

### 8.4 Forge des Ténèbres + Bibliothèque interdite

Les deux mécaniques de farming endgame sont désormais modélisées
(`--forge=N`, `--library=N`) :

- **Forge** (`forge.js`, max 5) : `+upgradeLevel` sur le bonus principal
  de chaque item équipé. Coût : Gallions + Essence des Ténèbres.
- **Bibliothèque** (`library.js`, max 3) : par sort, `power +2×niveau`,
  `cost −1×niveau`. Coût : Gallions + Pages de Grimoire.

Impact mesuré (Duo, endgame, +10 niveaux farmés) :

| Étage | Artefacts seuls | + Forge 5 + Biblio 3 |
|------:|----------------:|---------------------:|
| 22    | 59 %            | 82 % |
| 24    | 56 %            | 76 % |
| 26    | 44 %            | 66 % |
| 28    | 43 %            | 59 % |
| 30    | 35 %            | 50 % |

Le kit complet (artefacts + Forge 5 + Bibliothèque 3 + ~25 niveaux
farmés) maintient le Duo **confortable (81-97 %) jusqu'à l'étage 30**.
Forge et Bibliothèque valent à eux deux ~+15-20 pts de win rate dans le
deep endgame — un troisième axe de farming qui complète niveaux + artefacts.

### 8.6 Sets de Maison + set Ténèbres

Les deux sets sont modélisés (`--house-set=NAME`, `--tenebres-set`) :

- **Set de Maison 4/4** (`HOUSE_SETS`, state.js) — bonus cumulés 2+3+4
  pièces. Ex. Gryffondor : +7 ATK, +22 % crit ; Serpentard : +7 MAG,
  +4 LCK ; Serdaigle : +7 MAG ; Poufsouffle : +7 DEF.
- **Set Ténèbres 3/3** (`TENEBRES_SET`) — +15 % crit, +10 % esquive.

**Répartition en Duo** — un perso ne porte qu'un set entier (les deux se
disputent les slots `cloak` + `amulet`), mais **en Duo on répartit** :
Harry porte le set de Maison, Hermione le set Ténèbres → la party
bénéficie des **deux**. Seul le Solo est limité à un set. La sim modélise
exactement ça (Maison → héros 1, Ténèbres → héros 2).

**Progression hors endgame** — le set de Maison n'est pas qu'endgame : ses
pièces s'obtiennent aux paliers de Maison. Pièce 1 dès ~l'étage 5 (palier
Apprenti Or, 300 pts), pièces 3-4 en deep endgame (Maître Or 8000,
Virtuose Or 16000). Il **aide donc sur toute la partie** — d'abord en
pièces isolées et bonus partiel 2/4, puis en set complet 4/4 en endgame.
Le set Ténèbres, lui, est purement endgame (drops Ténèbres).

**Refonte du critique** — un premier passage avait montré que les sets
crit étaient *gaspillés* en endgame (le crit chance plafonnait à 40 %,
déjà atteint). Le système a été revu (cf. `.claude/plans/crit-rework.md`) :

- Deux canaux : **crit physique** et **crit de sort** (les sorts peuvent
  désormais crit).
- Une stat de **dégâts critiques** (`critMultiplier`, `spellCritMultiplier`)
  augmentable par équipement/set — axe non plafonné.
- Le crit chance d'équipement/set s'ajoute **au-dessus** du plafond LCK de
  40 % (plus de point gaspillé ; plafond absolu 100 %).
- Les sets portent ce crit damage : Gryffondor → crit physique ;
  Serpentard/Serdaigle → crit de sort ; Ténèbres → les deux.

**Impact mesuré** (600 sims — Duo, endgame, +10 niv., kit Forge 5 + Biblio 3,
sets répartis Gryffondor + Ténèbres) :

| Étage | Sans set | Avec sets (post-refonte) |
|------:|---------:|-------------------------:|
| 26    | 79 %     | 81 % |
| 28    | 78 %     | 79 % |
| 30    | 66 %     | 71 % |

Apport modéré (~+5 pts à l'étage 30) mais désormais **réel et non gaspillé**.
L'effet reste contenu car la sim privilégie les sorts : le set Gryffondor
(crit *physique*) profite surtout à un build qui attaque physiquement, le
set Ténèbres et les sets caster (crit de *sort*) aux builds magiques. La
refonte aligne donc chaque set sur son archétype de jeu.

### 8.7 Verdict endgame

- ✅ La Boucle Ténébreuse est un **gate infini farmable** sur quatre axes
  (niveaux, artefacts, Forge/Bibliothèque, sets) — cohérent avec le design.
- ⚠️ **Différence avec le jeu principal** : l'endgame n'a **aucune voie
  de progression passive**. Il *impose* le farming actif dès l'étage ~17.
  Choix de design assumable (mode infini façon roguelike), mais à
  connaître — descendre sans farmer heurte un mur réel vers l'étage 18.
- ⚠️ **Le mur endgame s'est durci** depuis la dernière étude (monstres
  profonds ajoutés) : le farming nécessaire a quasi doublé (~+20-22 niv.
  /10 étages contre ~+12-15 avant). À surveiller — si la Boucle devient
  trop punitive, réduire le `weight` ou le `scale` des monstres 6-7+ les
  plus lourds (Strigoï Ancien HP 110, Hécate HP 130) est le levier direct.
- 💡 Si l'on veut adoucir : ralentir `xpNext` en endgame, ou ajouter une
  XP passive de Boucle par étage franchi. Optionnel — à ne pas faire si
  le farming forcé est l'intention.
- ✅ Refonte du critique (§8.6) : deux canaux physique/sort, crit damage
  augmentable, crit d'équipement au-delà de 40 % — les sets crit ne sont
  plus gaspillés et s'alignent sur leur archétype.
- ⚠️ Limite résiduelle du modèle : effets de set non chiffrables en sim
  (regen passif, lifesteal de sorts, réduction de coût) — impact mineur.
