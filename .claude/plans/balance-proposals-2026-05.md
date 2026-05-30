# Propositions de rééquilibrage — issues des simulations

**Date** : 2026-05-30
**Branche** : `claude/balance-proposals-followup`
**Statut** : 📋 **Propositions chiffrées — analyse seulement, aucun code de jeu modifié.**
**Outils** : `tools/sim-difficulty.js` + `tools/sim-economy.js` (cf.
[`simulation-tools-update.md`](./simulation-tools-update.md)).

> Baseline difficulté = joueur réaliste : `--stat-points=3` (3 pts libres/niveau,
> build balanced) + quêtes + équipement + potions. 600 sims/cellule.
> Baseline économie = duo, Normal, 4 combats / 1 coffre / 3 fouilles par étage.

---

## Proposition 1 — Murs de difficulté (étages 8-11)

### Constat (baseline réaliste)

| Étage | Solo | Duo |
|------:|:----:|:---:|
| 6-7   | 78 / 76 % 🟢 | 99 / 94 % 🟢 |
| **8** | **57 %** 🟠 | 85 % 🟢 |
| **9** | 44 % 🔴 | **66 %** 🟡 |
| 10-11 | 38 / 37 % 🔴 | 64 / 60 % 🟡 |

Spikes : solo 7→8 (−25 pts), duo 8→9 (−22 pts). Pilotés par les boss à
`scale` élevé (Bellatrix/Voldemort 0,40 ; Mangemort d'Élite/Manticore 0,38).

### Candidats testés

| Levier | Solo 8 | Solo 9 | Duo 9 | Verdict |
|--------|-------:|-------:|------:|---------|
| Baseline           | 57 % | 44 % | 66 % | — |
| +20 % XP           | 60 % | 45 % | 64 % | ❌ inefficace (courbe XP ×1,6 absorbe le gain) |
| −15 % HP ennemis   | 63 % | 47 % | 73 % | ✅ efficace mais trop large (allège 5-7 déjà sains) |

### 🎯 Recommandation : nerf **ciblé** du scaling des boss lourds

Réduire `scale` des 6 monstres à `scale ≥ 0,36` (dominants des pools 8-11),
dans `js/monsters.js` :

| Monstre | actuel | proposé |
|---------|-------:|--------:|
| Bellatrix Lestrange, Voldemort Affaibli, Voldemort Ressuscité | 0,40 | **0,34** |
| Mangemort d'Élite, Manticore Juvénile | 0,38 | **0,33** |
| Nagini | 0,36 | **0,32** |
| Basilic Mineur | 0,35 | **0,31** |

**Effet** ≈ candidat −15 % HP **mais étages 8+ uniquement** (ces monstres sont
gated `minFloor` 6-10 → étages 1-5 **inchangés**). Cible : solo 8-10 « difficile »
(47-63 %) au lieu de « punitif » ; duo 9-11 ~71-73 %. Endgame exigeant sans mur.
Modif chirurgicale (6 valeurs), zéro impact early-game.

> À valider par simulation du correctif exact (patch `scale` + run avant/après)
> au moment de l'implémentation.

---

## Proposition 2 — Accessibilité de la série Apothéose ★ N

### Constat (duo, Normal)

| | ★1 (points) | Boucles pour ★1 | Or drainé pour ★1 |
|---|---:|---:|---:|
| **Actuel** — 5 G/pt · seuil `45000+15000N+1000N²` | 61 000 | **16,6** | 305 000 G |

Décomposition : ~3 676 points/boucle (≈ 3 076 don + 600 kills) ; le don domine.

> ⚠️ **Possiblement voulu.** La doc décrit ★ N comme une « génératrice infinie »
> (gold-sink sans fond). Si l'intention est d'absorber le surplus d'or des
> *whales*, **statu quo** — fonctionne comme prévu.

### Si l'objectif est « ★1 atteignable en ~5 boucles »

| Option | Changement | Boucles ★1 | Or pour ★1 | Caractère |
|--------|-----------|-----------:|-----------:|-----------|
| **1** | taux don **5→2 G/pt** (`_DONATION_GOLD_PER_POINT`) | 7,4 | 122 000 G | 1 constante ; draine moins d'or/étoile |
| **2 ✅** | courbe douce **`12000+6000N+500N²`** (5 G/pt) | **5,0** | 92 500 G | early ★ attractives ; queue N² toujours raide |

★5 : actuel **145 000 pts** vs Option 2 **54 500 pts**.

**Recommandation** : **Option 2** si le but est une progression endgame
atteignable à longue traîne ; **statu quo** si le but est un sink bottomless.
→ **Choix d'intention de design** à trancher avant implémentation.

---

## Fiabilité

- Difficulté : 600 sims/cellule, écart-type ~±2 pts de win rate.
- Économie : le terme dominant (don) est exact ; l'estimation kills/boucle
  (~600 pts) est approximative mais minoritaire — conclusions robustes.
- Aucune modif de code de jeu dans cette proposition : seules des cibles
  chiffrées sont fournies, à simuler précisément lors d'une implémentation.
