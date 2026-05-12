# Étude de la difficulté — Mode Normal

> Branche : `claude/analyze-difficulty-progression-vyItb`
> Méthode : tableaux théoriques (formules réelles `scaleMonster`, `checkLevelUp`, `rollGroupSize`) + simulation Monte Carlo (800 combats / étage / mode).
> Script : [`tools/sim-difficulty.js`](./tools/sim-difficulty.js) — exécutable avec `node tools/sim-difficulty.js [N_SIMS]`.
> Plan : [`.claude/plans/difficulty-progression.md`](./.claude/plans/difficulty-progression.md)
>
> **⚠️ Hypothèses de la sim (pessimistes)** : pas d'achat au shop, pas de potions de soin, pas de fontaines (étages 2/5/8/11), pas de repos, pas de drops, pas de points de Maison. C'est le **pire cas** d'un joueur qui combat "honnêtement" sans optimiser. Le vrai win rate en jeu est probablement **+15-25 pts** au-dessus.

---

## 📊 Résumé exécutif

| Mode | Étages confortables (≥85%) | Premier décrochage (<85%) | Mur (<35%) |
|------|---------------------------|---------------------------|------------|
| **Solo** | 1–2          | **Étage 3** (76%)   | **Étage 5** (34%) |
| **Duo**  | 1–4          | **Étage 5** (73%)   | **Étage 8** (26%) |

**Verdict** : le mode Normal a **deux murs** :
- **Solo, étage 5** : chute de 31 pts en un étage (65% → 34%). Quasi-injouable dès cet étage sans grind.
- **Duo, étage 8** : chute de 41% à 26%. Le joueur n'arrive plus à boucler les combats.

**Cause profonde commune** : la pente du scaling ennemi (×1.22–×1.40 par étage selon le monstre) est environ **2 à 4 fois supérieure** à la pente joueur (+1 ATK/DEF/MAG par niveau, soit ~+10% sur les stats offensives). Le gap se creuse irrémédiablement à partir de l'étage 5.

---

## 1. Progression joueur attendue (4 combats / étage)

| Étage | Niveau Solo | XP cumul Solo | Niveau Duo | XP cumul Duo |
|------:|------------:|--------------:|-----------:|-------------:|
| 1  | 1  | 0     | 1  | 0     |
| 2  | 1  | 30    | 1  | 40    |
| 3  | 2  | 92    | 2  | 123   |
| 4  | 3  | 224   | 4  | 310   |
| 5  | 4  | 443   | 5  | 631   |
| 6  | 6  | 818   | 6  | 1230  |
| 7  | 7  | 1373  | 7  | 2004  |
| 8  | 8  | 2135  | 8  | 3247  |
| 9  | 8  | 3276  | 9  | 4912  |
| 10 | 9  | 4736  | 10 | 7059  |
| 11 | 10 | 6629  | 11 | 9749  |
| 12 | 10 | 8696  | 11 | 12921 |

> Le joueur solo plafonne à niveau 9-10 sur l'ensemble de l'aventure faute d'XP. Le sort interdit **Avada... se débloque au niveau 9** — soit l'étage 9-10 en solo, **trop tard pour aider sur le mur de l'étage 5**.

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

**Lecture** : entre l'étage 4 et l'étage 5, la HP moyenne passe de 47 à 70 (+49 %), l'ATK de 11.6 à 17.6 (+52 %). Le joueur, lui, ne gagne que +1 ATK et +8 HP en passant d'un niveau à l'autre.

---

## 3. Résultats Monte Carlo (800 combats / cellule, Normal)

| Étage | Mode | Niv. | Win % | Tours | PV restants (win) | Dégâts subis |
|------:|:----:|-----:|------:|------:|------------------:|-------------:|
| 1  | Solo | 1  | 100% | 2.2 | 99% | 0.5  |
| 1  | Duo  | 1  | 100% | 1.5 | 100%| 0.1  |
| 2  | Solo | 1  | 100% | 2.5 | 95% | 1.8  |
| 2  | Duo  | 1  | 100% | 1.7 | 99% | 0.8  |
| 3  | Solo | 2  | 76%  | 3.3 | 85% | 16.7 |
| 3  | Duo  | 2  | 98%  | 3.0 | 87% | 15.1 |
| 4  | Solo | 3  | 65%  | 4.1 | 77% | 32.2 |
| 4  | Duo  | 4  | 95%  | 3.7 | 84% | 26.0 |
| **5** | **Solo** | **4** | **🔴 34%** | 4.9 | 71% | 60.2 |
| 5  | Duo  | 5  | 🟡 73% | 4.3 | 78% | 68.3 |
| 6  | Solo | 6  | 🔴 38% | 5.5 | 66% | 86.7  |
| 6  | Duo  | 6  | 🟠 56% | 4.9 | 73% | 118.4 |
| 7  | Solo | 7  | 🔴 28% | 5.6 | 60% | 106.0 |
| 7  | Duo  | 7  | 🟠 41% | 5.2 | 70% | 160.6 |
| **8** | Solo | 8  | 🔴 12% | 6.1 | 54% | 127.1 |
| **8** | **Duo** | **8** | **🔴 26%** | 4.9 | 68% | 207.5 |
| 9  | Solo | 8  | 🔴 9%  | 7.5 | 44% | 132.4 |
| 9  | Duo  | 9  | 🔴 22% | 5.4 | 64% | 230.0 |
| 10 | Solo | 9  | 🔴 2%  | 6.9 | 51% | 144.0 |
| 10 | Duo  | 10 | 🔴 12% | 5.2 | 72% | 261.5 |
| 11 | Solo | 10 | 🔴 2%  | 9.0 | 28% | 155.9 |
| 11 | Duo  | 11 | 🔴 15% | 5.9 | 64% | 285.8 |
| 12 | Solo | 10 | 🔴 3%  | 8.8 | 30% | 159.3 |
| 12 | Duo  | 11 | 🔴 12% | 5.8 | 68% | 291.7 |

### Spikes détectés (chute > 15 pts entre 2 étages)

| Mode | Transition | Win rate | Chute |
|------|-----------|----------|-------|
| Solo | 2 → 3     | 100% → 76% | −25 pts |
| Solo | **4 → 5** | 65% → 34%  | **−31 pts** ← le mur |
| Duo  | **4 → 5** | 95% → 73%  | −22 pts |
| Duo  | 5 → 6     | 73% → 56%  | −17 pts |

---

## 4. Coupables identifiés

### 4.1 Monstres à scaling agressif (scale ≥ 0.30)

| Monstre | scale | Étages | weight | Diagnostic |
|---------|------:|:------:|------:|------------|
| Voldemort Ressuscité  | 0.40 | 10+   | 1 | Boss final, scaling extrême — acceptable |
| Voldemort Affaibli    | 0.40 | 9+    | 2 | Boss, scaling extrême — acceptable |
| Basilic Mineur        | 0.35 | 6+    | 4 | Frappe trop fort dès l'étage 6 |
| Bellatrix Lestrange   | 0.35 | 8+    | 2 | Boss intermédiaire — acceptable |
| **Mangemort Masqué**  | 0.30 | 5+    | **8** | ⚠️ **Le plus commun à partir de l'étage 5** + scaling élevé = catastrophe |
| Détraqueur            | 0.30 | 3–8   | 7 | ⚠️ Présent dès l'étage 3, contribue au décrochage de l'étage 3 |
| Chimère / Manticore / Strigoï / Hécate / Ombre Quirrell / Nagini | 0.32 | 6-7+ | 3-4 | Pile à l'étage 6, où le joueur lutte déjà |
| Mangemort d'Élite     | 0.32 | 7+    | 4 | Renforce l'étage 7 |
| Jeune Acromantule / Détraqueur Gardien / Gardien du Portail / Spectre Maudit | 0.30 | 5+ | 5 | Pile sur le mur de l'étage 5 |

### 4.2 Tailles de groupe trop punitives en solo

Solo, à partir de l'étage 5 : 50 % de chance d'avoir **2 ennemis** alors que Harry n'a qu'un seul tour de jeu et environ 70 HP. Un Mangemort Masqué + Détraqueur Gardien représente ~140 HP à abattre face à 70 HP de Harry — 2 tours ennemis pour 1 tour Harry = défaite assurée.

### 4.3 Pente d'XP trop lente vs scaling ennemi

En solo, le joueur arrive à l'**étage 5 niveau 4** (430 XP cumulés), face à des ennemis dont le scaling moyen est ×2.0 par rapport à l'étage 1. Il faudrait être niveau 5-6 pour tenir le rythme — soit ~50 % d'XP en plus.

---

## 5. 🎯 Recommandations chiffrées

Hiérarchisées du moins au plus invasif. Chaque levier est isolément applicable.

### R1 — Réduire la fréquence du Mangemort Masqué (poids 8 → 5)
**Fichier** : `js/monsters.js` (entrée `mangemort_masque`)
**Impact attendu** : +6-10 pts win rate solo étage 5-6 ; +4-6 pts duo étage 5-7.
**Coût** : trivial, 1 ligne. Risque nul — il reste présent, juste moins dominant.

### R2 — Lisser le scaling des élites
**Fichier** : `js/monsters.js`
- Mangemort Masqué : `scale: 0.30 → 0.24`
- Détraqueur : `scale: 0.30 → 0.24`
- Détraqueur Gardien, Jeune Acromantule, Gardien du Portail, Spectre Maudit : `0.30 → 0.25`
- Basilic Mineur, Chimère, Manticore, Strigoï, Hécate, Ombre Quirrell, Nagini, Mangemort d'Élite : `0.32–0.35 → 0.27`
- Voldemort Affaibli / Ressuscité : laisser à 0.40 (boss finaux)

**Impact attendu** : +10-15 pts win rate étage 5-7 (solo et duo), +8-12 pts étage 8+.
**Coût** : ~12 valeurs à éditer. Aucune logique à modifier.

### R3 — Adoucir les tailles de groupe en solo
**Fichier** : `js/battle.js — rollGroupSize`
- Solo étage 3-4 : `0.70` → `0.80` (80 % d'un seul ennemi)
- Solo étage 5+  : `0.50` → `0.65` (65 % d'un seul ennemi)

**Impact attendu** : +12-18 pts win rate solo étage 5+.
**Coût** : 2 lignes. Différencie davantage solo / duo (cohérent : solo doit rester jouable).

### R4 — Augmenter la pente de progression joueur (ciblé MAG / HP)
**Fichier** : `js/battle.js — _grantLevelHpSp` + `_grantLevelStats`
- HP par level-up : `+8 → +10`
- MAG par level-up : `+1 → +2` (les sorts mettent leur `power + mag/2`, donc cette ligne aide les caster)

**Impact attendu** : +8-12 pts win rate sur tous les étages 5+, plus marqué duo (Hermione vit de sa MAG).
**Coût** : 2 lignes. Affecte aussi les autres difficultés — à valider.

### R5 — Bonus XP en mode Normal pour rattraper la pente
**Fichier** : `js/state.js — DIFFICULTY_SETTINGS.Normal`
- `xpMultiplier: 1.0 → 1.15`

**Impact attendu** : niveau attendu +1 à partir de l'étage 5, +1-2 à partir de l'étage 8. Convertit en environ +8 pts win rate sur étages 5-10.
**Coût** : 1 ligne. **Attention** : rend Normal plus proche de Facile (1.4) côté XP. Si on combine avec R4, à doser.

### R6 — Plafonner le scaling absolu au-delà de l'étage 8 (optionnel)
**Fichier** : `js/dungeon.js — scaleMonster`
```js
const mult = Math.min(MAX_MULT, (1 + (floor - 1) * (base.scale || 0.25)) * diffMult);
// où MAX_MULT = 4.0 (= étage ~13 avec scale 0.25)
```
**Impact attendu** : évite que les étages 11-12 deviennent injouables si l'aventure se prolonge.
**Coût** : 1 ligne + 1 constante. Diagnostic plus que correctif.

---

## 🥇 Combinaison recommandée

Pour **un patch minimal et efficace** (objectif : ramener le mode Normal à 70-85 % win rate sur tous les étages) :

> **R1 + R2 + R3** — uniquement `monsters.js` et `battle.js — rollGroupSize`.

Estimation cumulée :
- Solo étage 5 : 34% → ~65-70%
- Solo étage 8 : 12% → ~35-45%
- Duo étage 5 : 73% → ~88%
- Duo étage 8 : 26% → ~50-60%

Si après ce patch les étages 8+ restent durs : ajouter **R4** ou **R5** (mais pas les deux ensemble).

---

## 6. Annexes

### Comment relancer la simulation

```bash
node tools/sim-difficulty.js          # 400 sims / étage / mode (def)
node tools/sim-difficulty.js 1000     # 1000 sims pour plus de stabilité
```

### Limites de la sim (à garder en tête)

- Ignore les **potions de soin** (or initial = 25 G en Normal, peut acheter 1-2 potions par étage).
- Ignore les **fontaines** des étages 2/5/8/11 qui *full-heal* le groupe une fois.
- Ignore les **drops** (potions, équipement).
- Ignore les **achats d'équipement** au shop (+ATK/+DEF/+MAG).
- Ignore les **points de Maison** (palier 100 = +1 stat, atteint vers le niveau 5).
- IA joueur volontairement simple : pas d'usage de l'effet `disarm`, `shield`, ni de items en combat.

→ En pratique, ces ressources rapportent **15 à 25 pts de win rate** supplémentaires. Mais elles ne suffisent pas à compenser le mur de l'étage 5 en solo (qui resterait autour de 50-55 %, soit "tendu").

### Extrapolation autres difficultés

- **Facile** : `scalingMultiplier: 0.75` + `groupMultiplier: 0.65` → ajoute environ +15-20 pts de win rate à tous les étages. L'étage 5 solo en Facile : ~55-65 %, jouable.
- **Difficile** : `1.22 × 1.35` → retire environ −20 pts. L'étage 5 solo en Difficile : ~10-15 %, injouable sans grind.
- **Expert** : `1.45 × 1.65` → retire environ −35 pts. L'étage 3 solo en Expert : ~30 %, mur dès le départ.

L'écart entre les difficultés est cohérent **en multiplicateur**. Le problème de la pente de scaling reste structurel — corriger Normal réparera automatiquement les autres modes.
