# Étude de la difficulté — Mode Normal (post-rework des stats D1–D5)

> Méthode : simulation Monte Carlo (800 combats / étage / mode) sur les formules
> réelles (`scaleMonster`, `checkLevelUp`, `rollGroupSize`, `recalculateStats`).
> Script : [`tools/sim-difficulty.js`](./tools/sim-difficulty.js).
> Plans : [`.claude/plans/difficulty-simulation-review.md`](./.claude/plans/difficulty-simulation-review.md)
> · [`.claude/plans/player-stats-balance.md`](./.claude/plans/player-stats-balance.md).
>
> **Commande de régénération** (le sim modélise le JEU ACTUEL par défaut) :
> ```bash
> node tools/sim-difficulty.js --difficulty=Normal --build=balanced 800
> ```
> Pour reproduire les rapports d'avant le rework : ajouter `--legacy`.
>
> **MAJ 2026-06-01 — Alignement runtime** : le simulateur modélise désormais
> **par défaut** le rework des stats D1–D5 (live en runtime) : INT→MAG 4:1,
> END→DEF 6:1, END→résistance DoT, STR→pénétration de DEF (courbe de Hill),
> croissance secondaire +1/niveau, **3 points libres/niveau** (`STAT_POINTS_PER_LEVEL`),
> et Célérité (D5 AGI). Fortune (D5 LCK) est win-rate-neutre ici (pas de
> fuite/butin simulés) — son effet économique est dans
> [`tools/sim-economy.js`](./tools/sim-economy.js). Avant cette MAJ, le défaut
> du sim renvoyait des chiffres pré-rework, ~+20 à +27 pts trop pessimistes en
> mid/late game (cf. §4).
>
> **Baseline du joueur (défaut)** : 3 pts libres/niveau (build « balanced » =
> +1 STR/+1 AGI/+1 END par niveau) **+ rework D1–D5** **+ XP & stats des quêtes**
> **+ équipement best-in-slot** disponible en boutique selon `minFloor`
> **+ stock de potions**. **Sans** forge/bibliothèque/sets de Maison/paliers
> Apothéose (systèmes de progression endgame — cf. §3 et le verdict).
>
> **Cas pire** : `--pessimistic` désactive quêtes / équipement / potions.
>
> **MAJ Ch.13 P2 — XP passive de Boucle** (`LOOP_PASSIVE_XP_FRAC = 0.45`) : un
> axe de progression endgame additif a été ajouté (étages 11+ post-victoire
> uniquement, modélisé par `--loop-xp-frac`). **Le tableau §3 ci-dessous
> (jeu principal, no-endgame) n'est PAS affecté** ; l'impact mesuré est
> documenté dans [`DIFFICULTY_STUDY.md §8.8`](./DIFFICULTY_STUDY.md). Le scaling
> n'a pas été touché.

---

## 📊 Résumé exécutif

> 🏁 **Pass d'équilibrage de release (2026-06-19)** — Roadmap Phase 4. La table
> **§3 « Résultats Monte Carlo »** (baseline du garde-fou CI `check_difficulty.js`)
> a été **régénérée à N=4000** sur le code actuel ; **§4** et la table « Win % par
> combat » ci-dessous sont réalignées dessus. Écart vs l'ancienne baseline :
> **+4 à +8 pts** aux étages 9-12 (mid/late game ENCORE adouci depuis le dernier
> rapport — toujours dans les bandes-cible : solo plancher **52 %**, duo plancher
> **72 %**, aucun mur < 40 % ≤ ét. 12). **Gate CI fiabilisé** : la dérive flaky
> observée (étage 9-Duo qui franchissait ±10 pts à N=800) venait d'une baseline
> périmée — vérifié **0 dérive sur 6 runs** consécutifs après régénération.
> Les autres tables du §📊 (« toutes difficultés » n=600, « impact du rework »
> legacy↔rework) et le **§7** (clear d'étage, méthodo PR #213) sont des
> **instantanés antérieurs** conservés pour comparaison, **non re-simulés** dans
> ce pass (méthodologies distinctes ; colonne Normal à ±quelques pts de §3).

Deux métriques complémentaires (cf. §3 et §7) :

- **Win % par combat moyen** (§3) — un affrontement isolé au niveau attendu.
- **Taux de clear d'étage** (§7) — enchaîner ~4 salles sans soin complet
  (repos partiel + jets de fouille). C'est la métrique de **progression réelle**,
  mécaniquement bien plus dure.

### Win % par combat (mode Normal, build balanced)

| Mode | Confortable (≥ 80 %) | 1er décrochage (< 80 %) | Mur (< 40 %) |
|------|----------------------|--------------------------|--------------|
| **Solo** | 1–7 | **Étage 8** (71 %) | aucun ≤ ét. 12 (plancher 52 %) |
| **Duo**  | 1–10 | **Étage 11** (73 %) | aucun ≤ ét. 12 (plancher 72 %) |

### Win % combat solo — toutes difficultés (balanced, n=600)

| Étage | Facile | Normal | Difficile | Expert |
|------:|:------:|:------:|:---------:|:------:|
| 5  | 100 % | 96 % | 93 % | 79 % |
| 6  | 99 %  | 87 % | 73 % | 62 % |
| 7  | 97 %  | 87 % | 69 % | 58 % |
| 8  | 95 %  | 72 % | 49 % | 33 % |
| 9  | 90 %  | 61 % | 34 % | 18 % |
| 10 | 90 %  | 54 % | 26 % | 15 % |
| 12 | 83 %  | 49 % | 27 % | 11 % |

### Taux de clear d'étage (Normal, §7) — la contrainte réelle

| Mode | Étage 7 | Étage 8 | Étage 9 | Étage 10+ |
|------|:-------:|:-------:|:-------:|:---------:|
| Solo | 34 % | 11 % | 3 % | ~1 % |
| Duo  | 69 % | 44 % | 10 % | 3–8 % |

**Verdict.**
- ✅ Le rework **adoucit nettement le mur mid/late game** : par combat, le solo
  Normal ne passe jamais sous 49 % (≤ ét. 12) et le duo reste ≥ 68 %, là où le
  modèle pré-rework s'effondrait dès l'étage 8 (cf. §4).
- ⚠️ Mais **enchaîner un étage entier sans systèmes de progression endgame**
  (forge, bibliothèque, sets de Maison 4/4, passifs d'Apothéose) reste très
  punitif au-delà de l'étage 8, surtout en **solo**. Le jeu est de fait calibré
  autour de **duo + builds tank-leaning + systèmes endgame** : un duo « préparé »
  (forge 3 / biblio 2 / set 4/4 / tier 18) tient ~54–82 % de clear ét. 9–12,
  contre ~3–10 % pour la baseline boutique.
- 📌 **Ordre des builds** : tank ≥ balanced ≥ offensive partout. L'offensif
  (casteur) est le plus fragile en solo, conséquence assumée d'INT→MAG 4:1.

### Impact du rework (Normal, win % combat : défaut − legacy)

| Étage | Solo legacy → rework | Δ | Duo legacy → rework | Δ |
|------:|:--------------------:|:--:|:-------------------:|:--:|
| 5  | 88 → 96 | +8  | 100 → 100 | 0  |
| 6  | 74 → 87 | +13 | 95 → 100  | +5 |
| 7  | 66 → 87 | +21 | 88 → 98   | +10 |
| 8  | 47 → 72 | +25 | 78 → 92   | +14 |
| 9  | 36 → 61 | +25 | 52 → 77   | +25 |
| 10 | 27 → 54 | +27 | 52 → 74   | +22 |
| 12 | 26 → 49 | +23 | 41 → 68   | +27 |

→ Le rework vaut **+20 à +27 pts de win-rate combat** à partir de l'étage 7.
C'est l'écart exact qui manquait au rapport pré-rework.

---

## 1. Progression joueur attendue

| Étage | Niveau Solo | XP cumul Solo | Niveau Duo | XP cumul Duo |
|------:|------------:|--------------:|-----------:|-------------:|
| 1 | 1 | 0 | 1 | 0 |
| 2 | 2 | 30 | 2 | 39 |
| 3 | 5 | 90 | 5 | 121 |
| 4 | 6 | 219 | 7 | 293 |
| 5 | 8 | 432 | 8 | 570 |
| 6 | 8 | 859 | 8 | 994 |
| 7 | 9 | 1392 | 9 | 1629 |
| 8 | 9 | 2215 | 10 | 2849 |
| 9 | 10 | 3400 | 10 | 4625 |
| 10 | 10 | 4920 | 11 | 6923 |
| 11 | 11 | 6905 | 11 | 9784 |
| 12 | 11 | 9165 | 12 | 13369 |

## 2. Profil ennemi moyen par étage (pondéré par weight)

| Étage | Monstres éligibles | HP moy | ATK moy | DEF moy | MAG moy |
|------:|-------------------:|-------:|--------:|--------:|--------:|
| 1 | 9 | 13 | 3.0 | 0.8 | 2.4 |
| 2 | 18 | 19 | 4.6 | 1.6 | 3.1 |
| 3 | 27 | 30 | 7.5 | 3.1 | 5.6 |
| 4 | 30 | 47 | 11.3 | 5.2 | 7.8 |
| 5 | 34 | 73 | 17.6 | 8.9 | 11.1 |
| 6 | 37 | 97 | 23.4 | 11.9 | 15.3 |
| 7 | 35 | 131 | 30.8 | 15.5 | 21.5 |
| 8 | 33 | 176 | 41.1 | 20.1 | 28.4 |
| 9 | 32 | 223 | 50.0 | 24.9 | 36.5 |
| 10 | 30 | 274 | 57.9 | 29.3 | 49.6 |
| 11 | 29 | 293 | 63.4 | 31.2 | 55.1 |
| 12 | 29 | 315 | 68.1 | 33.3 | 59.1 |

## 3. Résultats Monte Carlo

| Étage | Mode | Niv. | Win % | Tours moy. | PV restants (win) | Dégâts moy. subis |
|------:|:----:|-----:|------:|-----------:|------------------:|------------------:|
| 1 | Solo | 1 | 100% | 2.1 | 100% | 0.0 |
| 1 | Duo  | 1 | 100% | 1.4 | 100% | 0.0 |
| 2 | Solo | 2 | 100% | 2.2 | 99% | 0.6 |
| 2 | Duo  | 2 | 100% | 1.5 | 100% | 0.2 |
| 3 | Solo | 5 | 100% | 3.0 | 97% | 3.5 |
| 3 | Duo  | 5 | 100% | 1.9 | 99% | 1.4 |
| 4 | Solo | 6 | 100% | 3.6 | 93% | 8.0 |
| 4 | Duo  | 7 | 100% | 2.6 | 98% | 4.5 |
| 5 | Solo | 8 | 96% | 6.8 | 84% | 51.1 |
| 5 | Duo  | 8 | 100% | 3.3 | 95% | 14.3 |
| 6 | Solo | 8 | 86% | 8.1 | 77% | 103.4 |
| 6 | Duo  | 8 | 100% | 4.2 | 91% | 35.0 |
| 7 | Solo | 9 | 86% | 10.1 | 72% | 121.5 |
| 7 | Duo  | 9 | 98% | 7.3 | 83% | 91.0 |
| 8 | Solo | 9 | 71% | 12.4 | 64% | 194.9 |
| 8 | Duo  | 10 | 92% | 9.9 | 77% | 167.2 |
| 9 | Solo | 10 | 65% | 13.0 | 62% | 238.3 |
| 9 | Duo  | 10 | 85% | 11.4 | 75% | 243.8 |
| 10 | Solo | 10 | 58% | 14.1 | 62% | 280.9 |
| 10 | Duo  | 11 | 82% | 12.4 | 75% | 300.1 |
| 11 | Solo | 11 | 54% | 13.5 | 61% | 300.8 |
| 11 | Duo  | 11 | 73% | 12.5 | 74% | 365.3 |
| 12 | Solo | 11 | 52% | 14.4 | 59% | 309.5 |
| 12 | Duo  | 12 | 72% | 12.8 | 73% | 380.5 |

## 4. Diagnostic : étages charnières


### Solo

| Étage | Niv. | Win % | Verdict |
|------:|-----:|------:|:--------|
| 1 | 1 | 100% | 🟢 confortable |
| 2 | 2 | 100% | 🟢 confortable |
| 3 | 5 | 100% | 🟢 confortable |
| 4 | 6 | 100% | 🟢 confortable |
| 5 | 8 | 96% | 🟢 confortable |
| 6 | 8 | 86% | 🟢 confortable |
| 7 | 9 | 86% | 🟢 confortable |
| 8 | 9 | 71% | 🟡 tendu |
| 9 | 10 | 65% | 🟠 difficile |
| 10 | 10 | 58% | 🟠 difficile |
| 11 | 11 | 54% | 🟠 difficile |
| 12 | 11 | 52% | 🟠 difficile |

### Duo

| Étage | Niv. | Win % | Verdict |
|------:|-----:|------:|:--------|
| 1 | 1 | 100% | 🟢 confortable |
| 2 | 2 | 100% | 🟢 confortable |
| 3 | 5 | 100% | 🟢 confortable |
| 4 | 7 | 100% | 🟢 confortable |
| 5 | 8 | 100% | 🟢 confortable |
| 6 | 8 | 100% | 🟢 confortable |
| 7 | 9 | 98% | 🟢 confortable |
| 8 | 10 | 92% | 🟢 confortable |
| 9 | 10 | 85% | 🟢 confortable |
| 10 | 11 | 82% | 🟡 tendu |
| 11 | 11 | 73% | 🟡 tendu |
| 12 | 12 | 72% | 🟡 tendu |

## 5. Détection des spikes (chute > 15 pts entre 2 étages)

### Solo
- Aucun spike détecté.
### Duo
- Aucun spike détecté.

## 6. Monstres à scaling élevé (scale ≥ 0.30)

| Monstre | scale | floors | weight | HP base | ATK base |
|:--------|------:|:-------|-------:|--------:|---------:|
| Bellatrix Lestrange | 0.4 | 8–∞ | 2 | 70 | 20 |
| Voldemort Affaibli | 0.4 | 9–∞ | 2 | 80 | 22 |
| Voldemort Ressuscité | 0.4 | 10–∞ | 1 | 100 | 28 |
| Mangemort d'Élite | 0.38 | 7–∞ | 4 | 55 | 16 |
| Manticore Juvénile | 0.38 | 6–∞ | 4 | 65 | 18 |
| Nagini | 0.36 | 7–∞ | 3 | 55 | 18 |
| Basilic Mineur | 0.35 | 6–∞ | 4 | 60 | 20 |
| Fenrir Greyback | 0.34 | 8–∞ | 1 | 95 | 24 |
| Maître des Détraqueurs | 0.34 | 9–∞ | 1 | 115 | 14 |
| Héraut des Ténèbres | 0.34 | 10–∞ | 1 | 150 | 16 |
| Antonin Dolohov | 0.33 | 10–∞ | 1 | 115 | 22 |
| Chimère de Poudlard | 0.32 | 6–∞ | 3 | 65 | 19 |
| Ombre de Quirrell | 0.32 | 6–∞ | 3 | 50 | 12 |
| le Bibliothécaire d'Ombre | 0.32 | 6–∞ | 0 | 95 | 16 |
| Strigoï Ancien | 0.32 | 6–∞ | 4 | 110 | 14 |
| Hécate la Maudisseuse | 0.32 | 7–∞ | 4 | 130 | 10 |
| Aragog | 0.32 | 9–∞ | 1 | 135 | 22 |
| Détraqueur | 0.3 | 3–8 | 7 | 25 | 10 |
| Mangemort Masqué | 0.3 | 5–∞ | 8 | 40 | 12 |
| Jeune Acromantule | 0.3 | 5–9 | 5 | 48 | 16 |
| Détraqueur Gardien | 0.3 | 5–∞ | 5 | 45 | 14 |
| Gardien du Portail | 0.3 | 5–∞ | 5 | 80 | 14 |
| Spectre Maudit | 0.3 | 5–∞ | 5 | 80 | 11 |
| Gargouille Éveillée | 0.3 | 5–10 | 4 | 95 | 13 |
| Veilleur du Seuil | 0.3 | 8–∞ | 1 | 140 | 14 |
| Détraqueur d'Élite | 0.3 | 8–∞ | 4 | 60 | 12 |
| Mangemort Vétéran | 0.3 | 9–∞ | 4 | 72 | 18 |

## 7. Run d'étage complet — PR #213 (repos partiel + malus de fouille)

Enchaîne 4 salles sans reset des PV/PM, avec décision de repos (seuils PV < 65 % / PM < 40 %) et 3 fouilles par étage (jets de malus PR #213). « Étage réussi » = groupe vivant au bout des salles.

| Étage | Mode | Niv. | Étage réussi % | Combats moy. | Repos moy. | Repos interrompu % | Fouille néfaste % | PV fin (réussi) |
|------:|:----:|-----:|---------------:|-------------:|-----------:|-------------------:|------------------:|----------------:|
| 1 | Solo | 1 | 100% | 4.6 | 2.07 | 59% | 6% | 98% |
| 1 | Duo  | 1 | 100% | 4.3 | 0.85 | 25% | 6% | 100% |
| 2 | Solo | 2 | 100% | 4.4 | 1.39 | 41% | 6% | 97% |
| 2 | Duo  | 2 | 100% | 4.2 | 0.62 | 19% | 6% | 99% |
| 3 | Solo | 5 | 100% | 4.4 | 1.58 | 40% | 6% | 94% |
| 3 | Duo  | 5 | 100% | 4.3 | 0.75 | 24% | 7% | 99% |
| 4 | Solo | 6 | 100% | 4.6 | 1.85 | 55% | 5% | 90% |
| 4 | Duo  | 7 | 100% | 4.4 | 1.21 | 36% | 7% | 98% |
| 5 | Solo | 8 | 81% | 4.4 | 2.24 | 64% | 6% | 74% |
| 5 | Duo  | 8 | 100% | 4.5 | 1.48 | 44% | 8% | 92% |
| 6 | Solo | 8 | 43% | 3.7 | 1.81 | 54% | 5% | 66% |
| 6 | Duo  | 8 | 95% | 4.5 | 1.71 | 49% | 4% | 84% |
| 7 | Solo | 9 | 34% | 3.5 | 1.69 | 49% | 6% | 57% |
| 7 | Duo  | 9 | 69% | 4.4 | 2.15 | 65% | 6% | 71% |
| 8 | Solo | 9 | 11% | 2.6 | 1.15 | 33% | 5% | 48% |
| 8 | Duo  | 10 | 44% | 3.9 | 1.96 | 58% | 5% | 65% |
| 9 | Solo | 10 | 3% | 2.1 | 0.81 | 26% | 3% | 38% |
| 9 | Duo  | 10 | 10% | 2.8 | 1.18 | 35% | 5% | 59% |
| 10 | Solo | 10 | 1% | 1.9 | 0.68 | 21% | 3% | 37% |
| 10 | Duo  | 11 | 8% | 2.7 | 1.08 | 32% | 3% | 63% |
| 11 | Solo | 11 | 1% | 1.9 | 0.70 | 22% | 3% | 41% |
| 11 | Duo  | 11 | 5% | 2.4 | 0.91 | 28% | 4% | 62% |
| 12 | Solo | 11 | 1% | 1.7 | 0.58 | 17% | 4% | 36% |
| 12 | Duo  | 12 | 3% | 2.3 | 0.80 | 25% | 4% | 61% |
