# Étude de la difficulté — Mode Normal (Phase 3)

> Méthode : tableaux théoriques (formules réelles `scaleMonster`, `checkLevelUp`, `rollGroupSize`) + simulation Monte Carlo (800 combats / étage / mode).
> Script : [`tools/sim-difficulty.js`](./tools/sim-difficulty.js) — exécutable avec `node tools/sim-difficulty.js --stat-points=3 --build=balanced [N_SIMS]`.
> Plan : [`.claude/plans/difficulty-progression.md`](./.claude/plans/difficulty-progression.md)
>
> **Hypothèses de la sim (pessimistes)** : pas d'achat au shop, pas de potions, pas de fontaines (étages 2/5/8/11), pas de repos, pas de drops d'équipement, pas de quêtes Dumbledore (bonus stats permanents), pas de farming par respawn 20 %, pas de points de Maison. C'est le **pire cas** d'un joueur qui combat sans optimiser. Le vrai win rate en jeu est probablement **+20-30 pts** au-dessus.
>
> **Baseline du joueur** : 3 points de stats libres alloués à chaque niveau (build « balanced » = +1 ATK STR, +1 esquive AGI, +5 PV END par niveau). Reflète l'équilibre actuel du jeu post-Phase 3.

---

## 📊 Résumé exécutif

| Mode | Étages confortables (≥80 %) | Premier décrochage (<80 %) | Mur (<40 %) |
|------|-----------------------------|----------------------------|-------------|
| **Solo** | 1–4 | **Étage 5** (42 %) | **Étage 7** (37 %) |
| **Duo**  | 1–5 | **Étage 6** (64 %) | **Étage 8** (35 %) |

**Verdict** : le mode Normal a **un mur en solo dès l'étage 5** (chute 77 % → 42 %, −35 pts) et **un mur en duo à l'étage 8** (53 % → 35 %, −17 pts). Le baseline Phase 3 (3 pts libres/niveau) rend les murs **moins brutaux** que la V1 sans points libres (34 % et 26 % respectivement), mais les pics restent visibles.

**Cause profonde commune** : la pente du scaling ennemi (×1.22–×1.40 par étage selon le monstre) reste supérieure à la pente joueur, même après les 3 pts libres. L'écart se creuse à partir de l'étage 5 — c'est cohérent avec la zone où l'on a placé les **6 équipements mid-game** et les **potions ++** (étage 5+) ajoutés en Phase 3 : ils sont conçus pour compenser ce décrochage hors-sim.

---

## 1. Progression joueur attendue (4 combats / étage)

| Étage | Niveau Solo | XP cumul Solo | Niveau Duo | XP cumul Duo |
|------:|------------:|--------------:|-----------:|-------------:|
| 1  | 1  | 0     | 1  | 0     |
| 2  | 1  | 30    | 1  | 42    |
| 3  | 2  | 92    | 2  | 125   |
| 4  | 3  | 229   | 4  | 325   |
| 5  | 4  | 447   | 5  | 655   |
| 6  | 6  | 832   | 6  | 1268  |
| 7  | 7  | 1383  | 7  | 1998  |
| 8  | 8  | 2149  | 8  | 3307  |
| 9  | 8  | 3239  | 9  | 4894  |
| 10 | 9  | 4656  | 10 | 6976  |
| 11 | 10 | 6585  | 11 | 9858  |
| 12 | 10 | 8629  | 11 | 12998 |

> En Phase 3, **chaque level-up offre 3 points libres** à allouer parmi STR / INT / AGI / END / LCK. Le baseline simulé alloue 1 STR (+1 ATK), 1 AGI (+1 esquive), 1 END (+5 PV) par niveau. Le sort interdit **Avada... se débloque au niveau 9** — soit l'étage 9-10 en solo, trop tard pour aider sur le mur de l'étage 5.

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

**Lecture** : entre l'étage 4 et l'étage 5, la HP moyenne passe de 47 à 70 (+49 %), l'ATK de 11.6 à 17.6 (+52 %). Le joueur gagne +1 ATK / +1 DEF / +1 MAG **et** 3 points libres (~+5 PV ou +1 ATK ou +0.4 esquive selon allocation) en passant d'un niveau à l'autre — la pente joueur a doublé vs V1 mais reste en-dessous de la pente ennemi.

---

## 3. Résultats Monte Carlo (800 combats / cellule, Normal, 3 pts/niveau balanced)

| Étage | Mode | Niv. | Win % | Tours | PV restants (win) | Dégâts subis |
|------:|:----:|-----:|------:|------:|------------------:|-------------:|
| 1  | Solo | 1  | 100 % | 2.2 | 98 % | 0.5  |
| 1  | Duo  | 1  | 100 % | 1.5 | 100 %| 0.2  |
| 2  | Solo | 1  | 100 % | 2.4 | 95 % | 1.9  |
| 2  | Duo  | 1  | 100 % | 1.7 | 99 % | 0.8  |
| 3  | Solo | 2  | 🟢 80 %  | 3.7 | 82 % | 18.2 |
| 3  | Duo  | 2  | 🟢 98 %  | 3.1 | 87 % | 15.0 |
| 4  | Solo | 3  | 🟡 77 %  | 4.4 | 73 % | 31.6 |
| 4  | Duo  | 4  | 🟢 99 %  | 3.7 | 86 % | 23.9 |
| **5** | **Solo** | **4** | **🟠 42 %** | 5.2 | 70 % | 67.3  |
| 5  | Duo  | 5  | 🟢 80 % | 4.5 | 79 % | 74.3  |
| 6  | Solo | 6  | 🟠 47 % | 5.6 | 69 % | 93.5  |
| 6  | Duo  | 6  | 🟡 64 % | 5.0 | 76 % | 128.1 |
| 7  | Solo | 7  | 🔴 37 % | 5.8 | 62 % | 119.3 |
| 7  | Duo  | 7  | 🟠 53 % | 5.3 | 72 % | 180.7 |
| **8** | Solo | 8  | 🔴 24 % | 6.4 | 52 % | 150.3 |
| **8** | **Duo** | **8** | **🔴 35 %** | 5.4 | 70 % | 250.6 |
| 9  | Solo | 8  | 🔴 14 % | 6.9 | 51 % | 162.2 |
| 9  | Duo  | 9  | 🔴 29 % | 5.8 | 68 % | 292.8 |
| 10 | Solo | 9  | 🔴 6 %  | 7.1 | 49 % | 185.3 |
| 10 | Duo  | 10 | 🔴 19 % | 6.1 | 67 % | 346.8 |
| 11 | Solo | 10 | 🔴 7 %  | 8.3 | 40 % | 202.5 |
| 11 | Duo  | 11 | 🔴 22 % | 6.6 | 66 % | 371.1 |
| 12 | Solo | 10 | 🔴 6 %  | 8.6 | 38 % | 203.7 |
| 12 | Duo  | 11 | 🔴 18 % | 6.2 | 68 % | 384.1 |

### Spikes détectés (chute > 15 pts entre 2 étages)

**Solo**
- Étage 2 → 3 : 100 % → 80 % (−20 pts)
- **Étage 4 → 5 : 77 % → 42 % (−35 pts)** ← mur principal solo

**Duo**
- Étage 4 → 5 : 99 % → 80 % (−18 pts)
- Étage 5 → 6 : 80 % → 64 % (−16 pts)
- Étage 7 → 8 : 53 % → 35 % (−17 pts) ← mur principal duo

---

## 4. Impact des ajouts Phase 3

### 4.1 Effet mesuré : 3 pts libres / niveau (sim baseline)

Comparaison V1 (0 pt libre) vs Phase 3 (3 pts balanced) :

| Étage | Win % Solo V1 | Win % Solo Ph3 | Δ | Win % Duo V1 | Win % Duo Ph3 | Δ |
|------:|--------------:|---------------:|--:|-------------:|--------------:|--:|
| 3 | 76 % | 80 % | **+4** | 98 % | 98 % | 0 |
| 4 | 65 % | 77 % | **+12** | 95 % | 99 % | +4 |
| 5 | 34 % | 42 % | **+8** | 73 % | 80 % | +7 |
| 6 | 38 % | 47 % | **+9** | 56 % | 64 % | +8 |
| 7 | 28 % | 37 % | **+9** | 41 % | 53 % | +12 |
| 8 | 12 % | 24 % | **+12** | 26 % | 35 % | +9 |

Effet net : **+8 à +12 points de win rate** sur la zone difficile (étages 5–8). Pas suffisant pour passer au-dessus de 50 % en solo mid-game, mais réduit la pente du décrochage.

### 4.2 Effets non simulés (qui amélioreraient encore le win rate)

Les ajouts suivants ne sont **pas modélisés** dans la sim mais sont disponibles au joueur :

| Ajout | Impact attendu sur win rate |
|-------|-----------------------------|
| **6 équipements mid-game** (étages 3-7) | +ATK/DEF/AGI/LCK selon slot, drops élite + boutique progressive |
| **2 potions ++** (étage 5+) | Grande Potion de Soin (+40 PV) et Grande Potion Magique (+30 PM), refait toute une combat-vie |
| **Chaîne quêtes Dumbledore** (5 paliers) | Cumul jusqu'à +50 PV +5 ATK +5 DEF +5 MAG +3 LCK + 1 sort + 2 items |
| **Respawn 20 %** au retour d'étage | Permet le farming d'XP → joueur d'1-2 niveaux au-dessus de la sim |
| Fontaines (étages 2/5/8/11) | Heal complet 1×/visite |
| Repos | Heal partiel hors combat |
| Drops de monstres | Items consommables et équipement |
| Points de Maison | Bonus stats permanents (Gryffondor +ATK, etc.) |

**Estimation cumulée** : avec un usage normal du shop, des fontaines et de la chaîne Dumbledore, le win rate réel sur les étages 5-8 monte probablement à **65–85 %** en solo et **80–95 %** en duo. La sim reste un **plancher pessimiste**.

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

## 6. Recommandations (post-Phase 3)

Les éléments suivants sont disponibles **côté joueur** depuis Phase 3 et atténuent les murs sans changer la balance brute :

1. **Allocation des 3 pts libres** : pour passer le mur étage 5 solo, allouer prioritairement en END (+5 PV/pt) et STR (+1 ATK/pt) jusqu'au niveau 6, puis basculer sur LCK pour les crits.
2. **Chaîne Dumbledore** : faire les 3 premiers paliers (étages 1/3/5) avant d'attaquer l'étage 5 pour bénéficier de **+10 PV +1 ATK +1 MAG +1 LCK** cumulés.
3. **Boutique étage 5** : acheter les nouvelles potions ++ (Grande Potion de Soin / Magique) et au moins une pièce d'équipement mid-game (Casque d'Auror DEF+3 MAG+1 ou Anneau du Courage ATK+2 LCK+1).
4. **Farming respawn 20 %** : faire 2-3 allers-retours étage 4-5 pour gagner 1 niveau + or supplémentaire avant l'étage 6.
5. **Fontaines** : ne jamais traverser l'étage 5 ou 8 sans avoir bu à la fontaine de l'étage (1×/visite).

Pour la sim, ces leviers ne sont pas modélisés — le rapport est volontairement le **plancher** de difficulté. Toute valeur ≥ 30 % sur la sim devrait être confortablement gérable en jeu réel avec usage normal des leviers ci-dessus.
