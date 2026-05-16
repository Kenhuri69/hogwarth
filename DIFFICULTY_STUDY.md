# Étude de la difficulté & équations de puissance

> Méthode : lecture du code réel + simulation Monte-Carlo
> `tools/sim-difficulty.js` (400 combats / étage / mode).
>
> ⚠️ **Correction importante** — une première version de cette étude
> concluait que le jeu était « ingagnable » en fin de partie. C'était faux :
> le harness de simulation comportait un bug (voir §2) qui désactivait
> silencieusement la modélisation des quêtes, de l'équipement et des
> potions. Corrigé. Les chiffres ci-dessous sont la mesure honnête.

---

## 1. Résumé exécutif

La courbe de difficulté est **saine**. La fin de partie est exigeante, mais
c'est un **gate de progression voulu** : il se franchit en farmant des niveaux
et en récupérant des artefacts — exactement comme prévu par le design.

| Mode | Jeu normal (sans farming) | Avec farming + artefacts |
|------|---------------------------|--------------------------|
| Solo | confortable 1-5, tendu 6-7, difficile 8-9, dur 10-12 (~30 %) | 100 % jusqu'à l'étage 8, 64-86 % aux étages 9-12 |
| Duo  | confortable 1-8, tendu 9, difficile 10-12 (55-65 %) | ≥ 93 % partout |

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
| 5    | 8    | 96 %         | 8    | 100 % |
| 6    | 8    | 85 %         | 8    | 99 %  |
| 7    | 9    | 78 %         | 9    | 97 %  |
| 8    | 9    | 57 %         | 10   | 91 %  |
| 9    | 10   | 41 %         | 10   | 74 %  |
| 10   | 10   | 31 %         | 11   | 65 %  |
| 11   | 11   | 27 %         | 11   | 57 %  |
| 12   | 11   | 26 %         | 12   | 55 %  |

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
