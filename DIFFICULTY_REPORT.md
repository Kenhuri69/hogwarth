# Étude de la difficulté — Mode Normal (Phase 3)

> Méthode : tableaux théoriques (formules réelles `scaleMonster`, `checkLevelUp`, `rollGroupSize`) + simulation Monte Carlo (800 combats / étage / mode).
> Script : [`tools/sim-difficulty.js`](./tools/sim-difficulty.js) — exécutable avec `node tools/sim-difficulty.js --stat-points=3 --build=balanced [N_SIMS]`.
> Plan : [`.claude/plans/difficulty-progression.md`](./.claude/plans/difficulty-progression.md)
>
> **Baseline du joueur (default)** : 3 points de stats libres alloués à chaque niveau (build « balanced » = +1 STR, +1 AGI, +1 END par niveau) **+ XP cumulée des quêtes** (chaîne Dumbledore + secondaires PNJ) **+ bonus stats permanents des récompenses** (`reward.stats`) **+ équipement best-in-slot** disponible en boutique selon `minFloor` **+ stock de potions** consommables (1 par tour de soin, restaure 25 PV).
>
> **Pour comparer au cas pire** : `--pessimistic` désactive quêtes / équipement / potions. Permet d'isoler l'effet brut du contenu.

---

## 📊 Résumé exécutif

| Mode | Étages confortables (≥ 80 %) | Premier décrochage (< 80 %) | Mur (< 40 %) |
|------|------------------------------|------------------------------|--------------|
| **Solo** | 1–4 | **Étage 5** (46 %) | **Étage 7** (37 %) |
| **Duo**  | 1–5 | **Étage 6** (67 %) | **Étage 8** (38 %) |

**Verdict** : malgré l'intégration **complète** des leviers Phase 3 (3 pts libres / niveau, XP des quêtes, bonus stats des récompenses, équipement, potions), les murs restent visibles aux mêmes étages que la version V1 pessimiste. **Le contenu joueur n'efface pas les murs — il les atténue de 0 à 8 pts seulement.**

**Cause profonde diagnostiquée** : les capacités spéciales ennemies (`enemy.abilities[].effect = "damage"`) **ignorent la défense joueur**. Elles font `power + mag/2` dégâts directs. À partir de l'étage 5, ces capacités (Cruciatus, Charge Ailée, Drain, Crocs Venimeux…) avec un trigger ~25-35 % par tour deviennent la source dominante de dégâts subis. Le buff DEF (équipement, quêtes, points END) ne les atténue pas.

---

## 1. Progression joueur attendue (4 combats / étage + XP des quêtes complétées)

| Étage | Niveau Solo | XP cumul Solo | Niveau Duo | XP cumul Duo |
|------:|------------:|--------------:|-----------:|-------------:|
| 1  | 1  | 0     | 1  | 0     |
| 2  | 1  | 30    | 1  | 42    |
| 3  | 2  | 92    | 2  | 125   |
| 4  | 3  | 229   | 4  | 325   |
| 5  | 4  | 447   | 5  | 655   |
| 6  | 6  | 832   | 6  | 1268  |
| 7  | 7  | 1383  | 7  | 1998  |
| 8  | 7  | 2149  | 8  | 3307  |
| 9  | 8  | 3239  | 9  | 4894  |
| 10 | 9  | 4656  | 10 | 6976  |
| 11 | 10 | 6585  | 11 | 9858  |
| 12 | 10 | 8629  | 11 | 12998 |

> Les XP des quêtes (intro 30, Dumbledore 120/220/340/500, secondaires 80-380) sont cumulées selon `QUEST_COMPLETION_FLOOR` (table dans `tools/sim-difficulty.js`). Effet net : niveau gagné +0/+1 selon l'étage. Le sort interdit **Avada... se débloque au niveau 9** — toujours étage 9-10 en solo.

---

## 2. Profil ennemi moyen par étage (pondéré par `weight`)

| Étage | Monstres éligibles | HP moy | ATK moy | DEF moy | MAG moy |
|------:|-------------------:|-------:|--------:|--------:|--------:|
| 1  | 8  | 13  | 3.0  | 0.9  | 2.2  |
| 2  | 17 | 20  | 4.7  | 1.7  | 3.0  |
| 3  | 25 | 30  | 7.5  | 3.2  | 5.7  |
| 4  | 27 | 47  | 11.6 | 5.4  | 7.6  |
| 5  | 31 | 70  | 17.6 | 8.7  | 10.8 |
| 6  | 33 | 93  | 23.4 | 11.7 | 15.0 |
| 7  | 30 | 128 | 30.9 | 15.2 | 20.9 |
| 8  | 24 | 166 | 40.4 | 19.8 | 27.3 |
| 9  | 20 | 204 | 48.2 | 24.3 | 34.5 |
| 10 | 16 | 253 | 56.1 | 29.1 | 50.0 |
| 11 | 16 | 274 | 61.1 | 31.6 | 54.3 |
| 12 | 16 | 294 | 65.6 | 33.8 | 58.3 |

**Lecture** : entre l'étage 4 et l'étage 5, la HP moyenne passe de 47 à 70 (+49 %), l'ATK de 11.6 à 17.6 (+52 %), et la **MAG de 7.6 à 10.8 (+42 %)** — c'est cette MAG qui fait scaler les capacités spéciales `damage` des ennemis (`power + mag/2`), et c'est le facteur dominant du mur étage 5 en solo.

---

## 3. Résultats Monte Carlo (800 combats / cellule, Normal, baseline complet)

| Étage | Mode | Niv. | Win % | Tours | PV restants (win) | Dégâts subis |
|------:|:----:|-----:|------:|------:|------------------:|-------------:|
| 1  | Solo | 1  | 100 % | 2.2 | 98 % | 0.6   |
| 1  | Duo  | 1  | 100 % | 1.5 | 100 %| 0.2   |
| 2  | Solo | 1  | 100 % | 2.4 | 95 % | 1.7   |
| 2  | Duo  | 1  | 100 % | 1.7 | 98 % | 0.9   |
| 3  | Solo | 2  | 🟢 77 % | 3.6 | 82 % | 20.0  |
| 3  | Duo  | 2  | 🟢 98 % | 3.0 | 88 % | 13.2  |
| 4  | Solo | 3  | 🟡 75 % | 4.3 | 75 % | 31.3  |
| 4  | Duo  | 4  | 🟢 98 % | 3.6 | 86 % | 24.6  |
| **5** | **Solo** | **4** | **🟠 46 %** | 5.0 | 71 % | 64.6  |
| 5  | Duo  | 5  | 🟢 79 % | 4.6 | 78 % | 77.8  |
| 6  | Solo | 6  | 🟠 47 % | 5.7 | 66 % | 96.4  |
| 6  | Duo  | 6  | 🟡 67 % | 5.1 | 76 % | 121.1 |
| 7  | Solo | 7  | 🔴 37 % | 5.8 | 63 % | 118.8 |
| 7  | Duo  | 7  | 🟠 54 % | 5.4 | 72 % | 176.9 |
| **8** | Solo | 7  | 🔴 21 % | 6.5 | 49 % | 141.2 |
| **8** | **Duo** | **8** | **🔴 38 %** | 5.3 | 71 % | 242.5 |
| 9  | Solo | 8  | 🔴 14 % | 7.0 | 49 % | 161.9 |
| 9  | Duo  | 9  | 🔴 28 % | 5.8 | 69 % | 296.6 |
| 10 | Solo | 9  | 🔴 6 %  | 7.2 | 47 % | 184.3 |
| 10 | Duo  | 10 | 🔴 20 % | 5.8 | 69 % | 347.6 |
| 11 | Solo | 10 | 🔴 7 %  | 8.1 | 44 % | 200.8 |
| 11 | Duo  | 11 | 🔴 21 % | 6.6 | 65 % | 373.4 |
| 12 | Solo | 10 | 🔴 6 %  | 8.3 | 38 % | 204.9 |
| 12 | Duo  | 11 | 🔴 18 % | 6.3 | 68 % | 375.5 |

### Spikes détectés (chute > 15 pts entre 2 étages)

**Solo**
- Étage 2 → 3 : 100 % → 77 % (−23 pts)
- **Étage 4 → 5 : 75 % → 46 % (−29 pts)** ← mur principal
- Étage 7 → 8 : 37 % → 21 % (−16 pts)

**Duo**
- Étage 4 → 5 : 98 % → 79 % (−19 pts)
- Étage 7 → 8 : 54 % → 38 % (−16 pts)

---

## 4. Impact mesuré du contenu Phase 3 (default vs `--pessimistic`)

Comparaison rigoureuse à 800 sims/cellule, mode solo :

| Étage | Pessimistic (3 pts libres seul) | Phase 3 complète | Δ |
|------:|--------------------------------:|-----------------:|--:|
| 3 | 79 % | 77 % | −2  |
| 4 | 74 % | 75 % | +1  |
| 5 | 46 % | 46 % | **0**  |
| 6 | 46 % | 47 % | +1  |
| 7 | 38 % | 37 % | −1  |
| 8 | 26 % | 21 % | −5  |
| 9 | 12 % | 14 % | +2  |
| 10 | 7 % | 6 % | −1  |

**Constat** : l'impact mesuré du contenu (XP de quêtes, bonus stats, équipement best-in-slot, potions) est **dans la marge d'erreur du Monte Carlo** (~±3 %). Concrètement, les ajouts Phase 3 **ne déplacent pas significativement les murs**.

### Pourquoi un effet aussi limité ?

Trois explications cumulatives :

1. **Capacités spéciales ennemies non atténuées par DEF** (cf. `enemyAct` dans `js/battle.js`). Au mid-game, la majorité des dégâts subis viennent de `damage` abilities (~25-35 % chance par tour) qui font `power + mag/2`. La DEF du joueur (équipement + quêtes + END) n'a **aucun effet** sur ces dégâts.
2. **Le DPS additionnel raccourcit peu les combats**. À l'étage 5, +6 ATK fait passer l'attaque de ~11 à ~17 dégâts par tour. Sur un ennemi à 70 HP, ça raccourcit le combat de ~6 à ~4 tours. Mais 4 tours d'attaques spéciales ennemies = encore 50-80 dégâts subis.
3. **Les potions sont déjà dépassées par les sorts de soin**. Reparo à 20 PV pour 8 SP est comparable aux 25 PV de potion. Les potions deviennent un fallback marginal quand le SP est épuisé.

### Vraie solution si l'on veut alléger les murs

Pas un changement de contenu, mais un changement de **design** :
- Réduire la `chance` ou le `power` des capacités spéciales mid-game (étages 5-7 en particulier).
- Faire dépendre le `damage` des abilities aussi de la DEF cible (`max(1, power + mag/2 - def/2)` par exemple).
- Réduire la fréquence des groupes de 3 ennemis (cf. `rollGroupSize` étages 5+).

Ces leviers sont hors-scope de ce rapport — à valider avant implémentation.

---

## 5. Monstres à scaling élevé (scale ≥ 0.30)

| Monstre | scale | floors | weight | HP base | ATK base |
|:--------|------:|:-------|-------:|--------:|---------:|
| Voldemort Ressuscité | 0.40 | 10–∞ | 1 | 100 | 28 |
| Voldemort Affaibli   | 0.40 | 9–∞  | 2 | 80  | 22 |
| Basilic Mineur       | 0.35 | 6–∞  | 4 | 60  | 20 |
| Bellatrix Lestrange  | 0.35 | 8–∞  | 2 | 70  | 20 |
| Chimère de Poudlard  | 0.32 | 6–∞  | 3 | 65  | 19 |
| Ombre de Quirrell    | 0.32 | 6–∞  | 3 | 50  | 12 |
| Nagini               | 0.32 | 7–∞  | 3 | 55  | 18 |
| Mangemort d'Élite    | 0.32 | 7–∞  | 4 | 55  | 16 |
| Manticore Juvénile   | 0.32 | 6–∞  | 4 | 65  | 18 |
| Strigoï Ancien       | 0.32 | 6–∞  | 4 | 110 | 14 |
| Hécate la Maudisseuse| 0.32 | 7–∞  | 4 | 130 | 10 |
| Détraqueur           | 0.30 | 3–8  | 7 | 25  | 10 |
| Mangemort Masqué     | 0.30 | 5–∞  | 8 | 40  | 12 |
| Jeune Acromantule    | 0.30 | 5–9  | 5 | 48  | 16 |
| Détraqueur Gardien   | 0.30 | 5–∞  | 5 | 45  | 14 |
| Gardien du Portail   | 0.30 | 5–∞  | 5 | 80  | 14 |
| Spectre Maudit       | 0.30 | 5–∞  | 5 | 80  | 11 |

---

## 6. Recommandations

### Côté joueur (immédiates, sans changement code)

1. **Allocation des 3 pts libres** : prioriser END jusqu'à l'étage 5 (PV max contre les capacités ignorant la DEF), puis bascule LCK pour les crits qui raccourcissent les combats. STR/INT marginal (gain DPS faible).
2. **Chaîne Dumbledore** : faire les 3 premiers paliers avant l'étage 5. Les +20 PV cumulés et +1 LCK aident concrètement contre les abilities mid-game.
3. **Boutique étage 5** : prioriser **Grande Potion de Soin** (40 PV) et **Grande Potion Magique** (rester capable de cast Reparo). L'équipement aide moins que les consommables sur les abilities ignorant DEF.
4. **Farming respawn 20 %** : 2-3 allers-retours étage 4-5 pour gagner 1 niveau + 100-200 g supplémentaires.
5. **Fontaines** (étages 2/5/8/11) : indispensables — 1×/visite, restaure tout PV/PM.

### Côté design (à valider avant implémentation)

Si l'équipe souhaite alléger les murs étage 5 (solo) et étage 8 (duo), modifier les capacités ennemies (`MONSTERS[].abilities`) plutôt que d'ajouter du contenu joueur. Trois pistes possibles :
- Atténuation par DEF cible : `power + mag/2 - target.def/3`.
- Cap sur la chance des abilities `damage` à 0.20 pour les monstres ≥ étage 5 (au lieu de 0.30-0.35).
- Retrait du groupe à 3 ennemis avant l'étage 7.

Aucune de ces pistes n'est mise en œuvre dans ce rapport — c'est de la balance design qui mérite sa propre PR + sim de validation.
