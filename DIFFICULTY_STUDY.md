# Étude de la difficulté & équations de puissance

> Méthode : lecture du code réel + simulation Monte-Carlo
> `tools/sim-difficulty.js` (600 combats / étage / mode).
>
> ⚠️ **Correction importante** — une première version de cette étude
> concluait que le jeu était « ingagnable » en fin de partie. C'était faux :
> le harness de simulation comportait un bug (voir §2) qui désactivait
> silencieusement la modélisation des quêtes, de l'équipement et des
> potions. Corrigé. Les chiffres ci-dessous sont la mesure honnête.
>
> 🔄 **Mise à jour 2026-05-21 (PR #213)** — le simulateur modélise
> désormais l'action **Garde** (regen PM 1 tour sur 2), le **repos
> partiel** et le **malus de fouille**. Ces deux dernières mécaniques
> opèrent entre les combats : un nouveau modèle de **run d'étage**
> (§9) les mesure. Les chiffres §3 (combat isolé) ont été rafraîchis.

---

## 1. Résumé exécutif

La courbe de difficulté est **saine**. La fin de partie est exigeante, mais
c'est un **gate de progression voulu** : il se franchit en farmant des niveaux
et en récupérant des artefacts — exactement comme prévu par le design.

Deux niveaux de lecture, désormais mesurés séparément :

| Lecture | Solo | Duo |
|---------|------|-----|
| **Combat isolé** (§3, PV/PM pleins) | confortable 1-5, tendu 6-7, difficile 8-12 (~30-50 %) | confortable 1-8, tendu 9-12 (76-92 %) |
| **Run d'étage** (§9, attrition + repos + fouille) | confortable 1-5, mur réel dès l'étage 6-7 | confortable 1-6, tendu 7-8, mur dès l'étage 9 |

**L'écart entre les deux lectures est l'enseignement clé.** Gagner un
combat isolé n'est pas gagner un étage : les 4 salles enchaînées drainent
les PV/PM, et le repos (interrompu 1 fois sur 3) ne compense pas tout. Le
Solo, sans second personnage pour absorber, décroche bien plus tôt que ne
le laissait croire le seul taux de victoire par combat.

**Il n'y a pas de mur infranchissable** : farming de niveaux + artefacts
repoussent le mur (§4). Mais la zone « difficile » du Solo de milieu de
partie est plus sévère que l'ancienne lecture par combat le suggérait.

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

## 3. Difficulté réelle — combat isolé

Modèle « joueur normal » : quêtes complétées, équipement best-in-slot de
boutique, stock de potions, 3 points de stats alloués par niveau (build
équilibré). Chaque combat part **PV/PM pleins** — c'est une borne haute
(optimiste) ; le run d'étage attrition-aware est en §9.

| Étage | Solo (niv.) | Win % Solo | Duo (niv.) | Win % Duo |
|------:|:-----------:|-----------:|:----------:|----------:|
| 1-4  | 1→6  | 100 %        | 1→7  | 100 % |
| 5    | 8    | 98 %         | 8    | 100 % |
| 6    | 8    | 87 %         | 8    | 100 % |
| 7    | 9    | 83 %         | 9    | 100 % |
| 8    | 9    | 63 %         | 10   | 99 %  |
| 9    | 10   | 51 %         | 10   | 92 %  |
| 10   | 10   | 43 %         | 11   | 89 %  |
| 11   | 11   | 37 %         | 11   | 77 %  |
| 12   | 11   | 32 %         | 12   | 76 %  |

**Lecture** : combat par combat, la difficulté monte progressivement, sans
spike brutal. Le Duo reste confortable (≥ 76 %) sur toute la grille ; le
Solo de fin de partie tombe vers 30-50 %. Modéliser la Garde a allongé les
combats (un tour de garde = pas de dégâts) sans déstabiliser la courbe.

> Note : les XP de quêtes font naturellement « sur-monter » le joueur en
> niveau (étage 10 → niveau 11). Le sur-leveling fait déjà partie du jeu
> normal, avant même tout farming volontaire.
>
> ⚠️ Cette table mesure des combats **isolés**. En conditions réelles, les
> PV/PM ne se rechargent pas entre deux salles — voir §9.

---

## 4. Le gate de fin de partie se résout — comme prévu

Mesure avec farming (`--bonus-levels`) et artefacts légendaires (`--artifacts`) :

| Étage | Solo +8 niv. +artefacts | Duo +5 niv. +artefacts | Duo +12 niv. +artefacts |
|------:|------------------------:|-----------------------:|------------------------:|
| 8     | 94 %                    | 100 %                  | 100 % |
| 9     | 86 %                    | 99 %                   | 100 % |
| 10    | 72 %                    | 93 %                   | 99 %  |
| 11    | 73 %                    | 84 %                   | 96 %  |
| 12    | 64 %                    | 86 %                   | 96 %  |

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
| 11-15 | 99-100 %   | 100 %     | 11-12 |
| 18    | 72 %       | 96 %      | 11-12 |
| 20    | 36 %       | 70 %      | 12-13 |
| 25    | 13 %       | 40 %      | 13-14 |
| 30    | 7 %        | 26 %      | 14-15 |

En jeu « normal » (≈ 4 combats/étage, sans grind dédié), la Boucle
décroche vers l'**étage 19-21** puis devient très dure.

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
| 20    | 97 %         | 99 %         | 100 % |
| 25    | 70 %         | 92 %         | 100 % |
| 30    | 54 %         | 85 %         | 97 %  |

Règle empirique : **~+12-15 niveaux farmés par tranche de 10 étages** de
Boucle pour rester en zone confortable.

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
| 22    | 80 %            | 90 % |
| 24    | 73 %            | 86 % |
| 26    | 62 %            | 83 % |
| 28    | 56 %            | 75 % |
| 30    | 54 %            | 64 % |

Le kit complet (artefacts + Forge 5 + Bibliothèque 3 + ~25 niveaux
farmés) maintient le Duo **confortable (88-100 %) jusqu'à l'étage 30**.
Forge et Bibliothèque valent à eux deux ~+10-15 pts de win rate dans le
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
  de progression passive**. Il *impose* le farming actif dès l'étage ~19.
  Choix de design assumable (mode infini façon roguelike), mais à
  connaître — descendre sans farmer heurte un mur réel vers l'étage 20.
- 💡 Si l'on veut adoucir : ralentir `xpNext` en endgame, ou ajouter une
  XP passive de Boucle par étage franchi. Optionnel — à ne pas faire si
  le farming forcé est l'intention.
- ✅ Refonte du critique (§8.6) : deux canaux physique/sort, crit damage
  augmentable, crit d'équipement au-delà de 40 % — les sets crit ne sont
  plus gaspillés et s'alignent sur leur archétype.
- ⚠️ Limite résiduelle du modèle : effets de set non chiffrables en sim
  (regen passif, lifesteal de sorts, réduction de coût) — impact mineur.

---

## 9. PR #213 — Garde, repos partiel & run d'étage

PR #213 a introduit trois ajustements d'équilibrage. Le simulateur les
modélise désormais (`tools/sim-difficulty.js`).

### 9.1 Action Garde (regen PM 1 tour sur 2)

Modélisée dans la boucle de combat : un héros blessé (40 % ≤ PV < 60 %)
qui n'a pas de palier de garde échange son tour d'attaque contre **50 %
de mitigation** sur les coups physiques entrants (+ riposte 30 % à
atk/2). La régénération de PM suit le cooldown 1t/2 de PR #213.

Impact sur les combats isolés (§3) : combats légèrement plus longs (un
tour de garde ne fait pas de dégâts), survie un peu meilleure dans les
échanges tendus — courbe globalement inchangée. La Garde est un outil de
mitigation, pas un levier de puissance.

### 9.2 Run d'étage complet — l'attrition révélée

Le **run d'étage** enchaîne 4 salles **sans recharger les PV/PM**, avec
décision de repos entre les salles et 3 fouilles par étage (jets de
malus PR #213). « Étage réussi » = groupe vivant au bout des 4 salles.

| Étage | Solo (niv.) | Étage réussi Solo | Duo (niv.) | Étage réussi Duo |
|------:|:-----------:|------------------:|:----------:|-----------------:|
| 1-4  | 1→6  | 98-100 %           | 1→7  | 100 %  |
| 5    | 8    | 75 %               | 8    | 100 %  |
| 6    | 8    | 33 %               | 8    | 100 %  |
| 7    | 9    | 20 %               | 9    | 84 %   |
| 8    | 9    | 5 %                | 10   | 62 %   |
| 9    | 10   | 1 %                | 10   | 21 %   |
| 10   | 10   | 0 %                | 11   | 11 %   |
| 11   | 11   | 0 %                | 11   | 5 %    |
| 12   | 11   | 0 %                | 12   | 6 %    |

**L'écart avec §3 est l'enseignement central.** Étage 6 Solo : 87 % par
combat → **33 %** sur l'étage entier. Étage 8 Duo : 99 % → **62 %**.
Gagner chaque combat à 87 % ne suffit pas : sur 4 combats enchaînés avec
attrition, la probabilité composée s'effondre, et le repos (interrompu
~1 fois sur 3, soin partiel via PR #213) ne reconstitue pas assez.

Le malus de fouille est marginal (3 fouilles × 2 % → ~5-7 % de runs
touchés par un piège ou un réveil) : il pimente sans déséquilibrer.

### 9.3 Le mur recule avec le farming

Run d'étage avec **+6 niveaux farmés + artefacts** :

| Étage | Étage réussi Solo | Étage réussi Duo |
|------:|------------------:|-----------------:|
| 6  | 96 % | 100 % |
| 8  | 54 % | 100 % |
| 10 | 16 % | 85 %  |
| 12 | 5 %  | 63 %  |

Le farming repousse nettement le mur en Duo (étage 8 : 62 % → 100 %,
étage 12 : 6 % → 63 %). Le Solo profite moins : sans second personnage
pour partager l'attrition, il reste fragile sur un étage entier — c'est
la pénalité structurelle du Solo, déjà compensée au classement Ironman
par le multiplicateur ×1.3.

### 9.4 Verdict PR #213

- ✅ **Garde** : modélisée, effet sain (mitigation, pas de power-creep).
  Le cooldown regen PM 1t/2 limite l'abus sans pénaliser l'usage défensif.
- ✅ **Repos partiel** : un repos interrompu rend désormais 15 % PV/PM
  (au lieu de 0) — amortisseur réel, surtout en Solo où le repos est
  fréquent (~2 par étage en milieu de partie).
- ✅ **Malus de fouille** : impact mesuré faible (~5-7 % de runs), conforme
  à l'intention « pimenter sans punir ».
- ⚠️ **Lecture run d'étage** : le Solo décroche dès l'étage 6-7 sur un
  étage *entier*, bien plus tôt que ne le suggérait le combat isolé. À
  surveiller si le Solo doit rester jouable sans farming dédié.
- 📌 **Limites du modèle run d'étage** : ne modélise ni la fontaine
  (restauration totale aux étages 2/5/8/11), ni le plein PV/PM offert
  par un level-up en cours d'étage, ni le butin des coffres. C'est donc
  une **borne basse** (pessimiste) ; la réalité se situe entre §3 (borne
  haute) et §9 (borne basse).
