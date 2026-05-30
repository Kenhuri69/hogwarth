# Étude de la difficulté — Mode Normal (Phase 3 + fixes design)

> Méthode : tableaux théoriques (formules réelles `scaleMonster`, `checkLevelUp`, `rollGroupSize`) + simulation Monte Carlo (800 combats / étage / mode).
> Script : [`tools/sim-difficulty.js`](./tools/sim-difficulty.js) — exécutable avec `node tools/sim-difficulty.js --stat-points=3 --build=balanced [N_SIMS]`.
> Plan : [`.claude/plans/difficulty-progression.md`](./.claude/plans/difficulty-progression.md)
>
> **MAJ 2026-05-30** ([`.claude/plans/simulation-tools-update.md`](./.claude/plans/simulation-tools-update.md)) :
> la sim modélise désormais la **difficulté** (`--difficulty=Facile|Normal|Difficile|Expert` —
> scalingMultiplier sur toutes les stats + enemyGroupMultiplier + xpMultiplier), les statuts
> de contrôle **stun / fear**, la capacité **dispel**, les **phases de boss** + l'**IA par
> tempérament**, les **items à compromis** (bonus négatifs) et la série **Apothéose ★ N**
> (`--star=N`). Résistances/faiblesses désormais matchées sur `spell.element`.
> Économie : nouvel outil [`tools/sim-economy.js`](./tools/sim-economy.js) (revenus d'or/étage,
> accessibilité des items, puits endgame don ★N / élixirs à prix progressif).
>
> **Baseline du joueur (default)** : 3 points de stats libres alloués à chaque niveau (build « balanced » = +1 STR, +1 AGI, +1 END par niveau) **+ XP cumulée des quêtes** (chaîne Dumbledore + secondaires PNJ) **+ bonus stats permanents des récompenses** (`reward.stats`) **+ équipement best-in-slot** disponible en boutique selon `minFloor` **+ stock de potions** consommables (1 par tour de soin, restaure 25 PV).
>
> **Fixes design appliqués dans ce rapport** :
> 1. Les **capacités spéciales `damage`** sont atténuées par la DEF cible (`max(1, power + mag/2 − def/3)`) — auparavant la DEF était ignorée par les abilities ennemies.
> 2. Les **groupes de 3 ennemis** en duo sont **différés à l'étage 7+** (avant : dès l'étage 3-4).
>
> **Pour comparer au cas pire** : `--pessimistic` désactive quêtes / équipement / potions.

---

## 📊 Résumé exécutif

| Mode | Étages confortables (≥ 80 %) | Premier décrochage (< 80 %) | Mur (< 40 %) |
|------|------------------------------|------------------------------|--------------|
| **Solo** | 1–3 | **Étage 4** (72 %) | **Étage 7** (37 %) |
| **Duo**  | 1–6 | **Étage 7** (57 %) | **Étage 8** (35 %) |

**Verdict** : les fixes design **résolvent le mur duo étage 5** (passe de 79 % à 91 %) et **lissent la zone duo 5-6** (étage 6 monte de 67 % à 82 %). Le mur duo se décale logiquement à l'étage 7 (réapparition des groupes de 3) puis 8.

Le **mur solo étage 5 reste** à 46 %. Cause : en solo les groupes restent à 1-2 ennemis (le retrait des 3 ne s'applique qu'au duo) et l'atténuation DEF apporte un gain marginal car le joueur a peu de DEF à ce niveau (~14, soit -4 dégâts par ability). Améliorer le solo nécessiterait un autre levier (cap chance, ralentissement scaling, ou groupes solo plus indulgents).

---

## 1. Progression joueur attendue (4 combats / étage + XP des quêtes)

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

> Les XP des quêtes (intro 30, Dumbledore 120/220/340/500, secondaires 80-380) sont cumulées selon `QUEST_COMPLETION_FLOOR`. Le sort interdit **Avada... se débloque au niveau 9**.

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

**Lecture** : la MAG ennemie (qui scale `power + mag/2` des capacités spéciales) passe de 7.6 à 10.8 entre étages 4 et 5. Avec l'atténuation DEF/3 (joueur ~DEF 14 → -4 dégâts), une capacité Détraqueur (power 10 + mag/2 = 15) fait désormais 11 dégâts au joueur (vs 15 avant le fix).

---

## 3. Résultats Monte Carlo (800 combats / cellule, post-fixes design)

| Étage | Mode | Niv. | Win % | Tours | PV restants (win) | Dégâts subis |
|------:|:----:|-----:|------:|------:|------------------:|-------------:|
| 1  | Solo | 1  | 100 % | 2.2 | 99 % | 0.5  |
| 1  | Duo  | 1  | 100 % | 1.5 | 100 %| 0.1  |
| 2  | Solo | 1  | 100 % | 2.4 | 95 % | 1.6  |
| 2  | Duo  | 1  | 100 % | 1.7 | 99 % | 0.8  |
| 3  | Solo | 2  | 🟢 80 % | 3.6 | 83 % | 17.9 |
| 3  | Duo  | 2  | 🟢 100 % | 2.8 | 90 % | 9.4  |
| 4  | Solo | 3  | 🟡 72 % | 4.4 | 75 % | 33.4 |
| 4  | Duo  | 4  | 🟢 100 % | 3.1 | 90 % | 14.4 |
| **5** | **Solo** | **4** | **🟠 46 %** | 5.2 | 70 % | 65.4 |
| 5  | Duo  | 5  | 🟢 91 % | 3.8 | 85 % | 42.9 |
| 6  | Solo | 6  | 🟠 46 % | 5.8 | 67 % | 97.4 |
| 6  | Duo  | 6  | 🟢 82 % | 4.4 | 83 % | 74.7 |
| 7  | Solo | 7  | 🔴 37 % | 5.9 | 64 % | 118.6 |
| 7  | Duo  | 7  | 🟠 57 % | 5.3 | 73 % | 167.5 |
| 8  | Solo | 7  | 🔴 20 % | 6.4 | 51 % | 139.4 |
| **8** | **Duo** | **8** | **🔴 35 %** | 5.5 | 71 % | 251.3 |
| 9  | Solo | 8  | 🔴 15 % | 6.8 | 54 % | 161.5 |
| 9  | Duo  | 9  | 🔴 28 % | 5.5 | 71 % | 293.3 |
| 10 | Solo | 9  | 🔴 8 %  | 7.2 | 51 % | 181.3 |
| 10 | Duo  | 10 | 🔴 17 % | 5.9 | 70 % | 358.0 |
| 11 | Solo | 10 | 🔴 6 %  | 8.4 | 44 % | 202.0 |
| 11 | Duo  | 11 | 🔴 20 % | 6.5 | 66 % | 382.2 |
| 12 | Solo | 10 | 🔴 7 %  | 8.6 | 39 % | 202.1 |
| 12 | Duo  | 11 | 🔴 19 % | 6.8 | 65 % | 379.1 |

### Spikes détectés (chute > 15 pts entre 2 étages)

**Solo**
- Étage 2 → 3 : 100 % → 80 % (−20 pts)
- **Étage 4 → 5 : 72 % → 46 % (−26 pts)** ← mur principal solo (inchangé par les fixes)
- Étage 7 → 8 : 37 % → 20 % (−17 pts)

**Duo**
- **Étage 6 → 7 : 82 % → 57 % (−25 pts)** ← mur duo (déplacé d'1 étage par les fixes)
- Étage 7 → 8 : 57 % → 35 % (−23 pts)

---

## 4. Impact mesuré des fixes design

Comparaison du même baseline (Phase 3 complet, 3 pts libres balanced) **avant** vs **après** les fixes design :

| Étage | Mode | AVANT fixes | APRÈS fixes | Δ |
|------:|:----:|------------:|------------:|--:|
| 3  | Duo  | 98 % | 100 % | +2  |
| 4  | Duo  | 98 % | 100 % | +2  |
| 5  | Duo  | 79 % | **91 %** | **+12** |
| 6  | Duo  | 67 % | **82 %** | **+15** |
| 7  | Duo  | 54 % | 57 % | +3  |
| 8  | Duo  | 38 % | 35 % | −3  |
| 5  | Solo | 46 % | 46 % | 0   |
| 6  | Solo | 47 % | 46 % | −1  |
| 7  | Solo | 37 % | 37 % | 0   |

**Conclusion** :
- **Le mur duo étage 5-6 est éliminé** (gain +12 / +15 pts) — résultat direct du retrait des groupes de 3 dans cette zone, qui supprimait le scénario punitif « 3 ennemis frappent pendant que la party fait 2 actions ».
- **Le mur duo se décale logiquement à l'étage 7** (57 % de win rate, dès la réapparition des groupes de 3).
- **Le solo reste inchangé** : ni le retrait des groupes de 3 (qui ne s'applique pas en solo) ni l'atténuation DEF/3 (~-4 dégâts par ability au niveau 4-5) ne suffisent à corriger le mur étage 5.

### Pour aller plus loin sur le mur solo (futur)

Pistes possibles, hors-scope de cette PR :
- **Cap sur la chance des abilities `damage` à 0.20** pour les monstres ≥ étage 5 (au lieu de 0.30-0.35). Réduirait la fréquence des dégâts ignorant DEF.
- **Ralentir le scaling** des élites étage 5+ (`scale: 0.30 → 0.25`).
- **Ajustement `rollGroupSize` solo** : forcer 1 ennemi à 80 % (au lieu de 50 %) sur les étages 5-6 en solo.

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

### Côté joueur (immédiates)

1. **Allocation des 3 pts libres** : prioriser END jusqu'à l'étage 5 (le bonus DEF + HP est désormais effectif contre les abilities). Bascule LCK à partir de l'étage 6 pour les crits.
2. **Chaîne Dumbledore** : faire les 3 premiers paliers avant l'étage 5. Les +20 PV cumulés et +1 LCK aident concrètement.
3. **Boutique étage 5** : prioriser l'**équipement DEF** (Casque d'Auror DEF+3 MAG+1, Ceinture de Force ATK+1 DEF+2) — désormais utile contre les capacités spéciales.
4. **Farming respawn 20 %** : 2-3 allers-retours étage 4-5 pour gagner 1 niveau + 100-200 g supplémentaires.
5. **Fontaines** (étages 2/5/8/11) : indispensables — 1×/visite.

### Côté design (cette PR)

- ✓ **Atténuation DEF des abilities `damage`** (`max(1, power + mag/2 − def/3)`)
- ✓ **Retrait des groupes de 3 en duo avant étage 7**

### Côté design (futur, hors-scope)

- Cap sur `chance` des abilities damage à 0.20 pour étages 5+
- Ralentissement du scaling élites mid-game (`scale: 0.30 → 0.25`)
- Ajustement `rollGroupSize` solo (favoriser 1 ennemi en mid-game)

Ces pistes attaquent le mur solo restant (étage 5, 46 %) mais touchent plus profondément la balance — à valider et sim avant implémentation.
