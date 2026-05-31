# Stat dérivée « Fortune » — la Chance influence les événements aléatoires

> **Statut : CONCEPTION (à valider avant runtime).** Décision PO : Forme B —
> LCK reste la stat de **crit physique** ; on ajoute une stat **dérivée**
> « Fortune % » (nourrie par LCK + équipement + Félix Felicis) qui pilote les
> événements aléatoires hors-crit. Événements ciblés : **drops, or, fouille/
> coffres, fuite/pièges**.

## 1. Constat (audit du code, 2026-05-31)

LCK n'influence aujourd'hui **que** le crit physique
(`critChance = min(40, 5 + lck×0.5)`), plus deux hooks mineurs de sort
(or volé `+lck/2`, chance d'affliction DoT `+lck×0.0075`). Tous les événements
« fortune » l'ignorent : drops (`random < chance × diffMult`), or, contenu des
coffres, fouille, pièges (50 %), fuite (basée AGI), shiny (4 %).

🎯 **Félix Felicis** (`data.js:349`) est codé `+20 PV +10 PM` — **aucun effet de
chance** malgré son nom. Symptôme central du problème.

## 2. Modèle proposé

### 2.1 Stat dérivée `fortune` — courbe de Hill saturante

Calculée dans `recalculateStats()` (inventory-core.js). **Tout** (LCK + points
Félix + points d'équipement) entre dans **une seule courbe de Hill** approchant
~31 % — forme « douce → linéaire → plateau log » demandée par le PO :

```
fortune = FORTUNE_ASYMPTOTE × x² / (x² + FORTUNE_HALF²)
  où  x = c.lck + (felixActif ? FELIX_POINTS : 0) + Σ item.bonusFortune
```

- `FORTUNE_ASYMPTOTE = 0.31` (la courbe tend vers 31 %, ne l'atteint jamais → pas
  de clamp séparé)
- `FORTUNE_HALF = 30` (demi-saturation : à x=30, fortune = 0.31/2 = 15.5 %)
- `FELIX_POINTS = 40` (apport du buff Félix, cf. §2.2)
- `item.bonusFortune` : points de chance d'un équipement (futur gear), en
  **points d'entrée** (pas en % de sortie) — ils profitent donc aussi de la
  saturation.

**Propriété clé (exigence PO) : les bonus fixes réduisent la valeur marginale de
LCK.** Comme la courbe sature, un gros bonus fixe (Félix +40) pousse `x` dans la
zone plate où chaque point de LCK rapporte moins. Mesuré :

| Δ LCK | sans Félix | avec Félix |
|-------|-----------|-----------|
| +10 LCK (15→25 / 55→65) | +5.6 pts Fortune | **+1.6 pts** |

| x (= lck+félix+équip) | Fortune |
|----|----|
| 10 | 3.1 % |
| 15 (Harry base) | 6.2 % |
| 30 | 15.5 % |
| 50 | 22.8 % |
| 55 (Harry + Félix) | 23.9 % |
| 80 | 27.2 % |
| 100 | 28.4 % |

### 2.2 Buff Félix Felicis — pur buff de chance, durée en pas

Félix n'est **plus** un soin (`+20 PV +10 PM` retiré). Il pose
`felixFortuneSteps = FELIX_STEPS` (proposé : **40 pas**, knob), qui ajoute
`FELIX_POINTS = 40` à `x` tant que `> 0`. Décrémenté à chaque pas d'exploration
(`movement.js — _step`). Sérialisé. Couvre fouilles, coffres et combats d'une
exploration d'étage.

### 2.3 Règle de groupe — `partyFortune()`

Or/drops/fouille/fuite sont **partagés** (inventaire & or partagés). Helper :

```
partyFortune() = max( c.fortune for c in party[:partySize] if c.hp > 0 ) + felixBonus
```

→ le membre le plus chanceux fait bénéficier le groupe (modèle inventaire partagé).
Plafonné à `FORTUNE_CAP` (+ buff Félix par-dessus, plafond absolu ~0.55).

### 2.4 Application par événement

| Événement | Application | Garde-fou |
|-----------|-------------|-----------|
| **Drops** (battle-rewards.js) | `chance × (1 + F)` | `random < chance` cape à 1 |
| Drops rares (Ténèbres/XL/boss) | `× (1 + F)` | idem |
| **Or** (combat/coffre/fouille) | `× (1 + F×0.5)` | poids ½ pour protéger l'éco (cf. game-economy-gold-audit.md) |
| **Fouille** : seuil objet vs or | `SEARCH_ITEM_THRESHOLD` élargi de `+F` | borné |
| Fouille : double-herbe | `luckyChance + F` | borné à 0.9 |
| **Coffre** : roll objet rare ≥ ét.3 | `0.25 + F` | borné à 0.9 |
| **Fuite** (doFlee) | `chance + F` | borné à 0.95 |
| **Pièges** (désamorçage/déclenchement) | trigger `0.5 − F`, désamorçage `+F` | borné [0.1, 0.9] |

> Shiny (4 %) **hors scope** : c'est une rareté cosmétique de génération, pas un
> gain joueur — on le laisse indépendant.

### 2.5 Affichage (fiche perso)

Ligne « 🍀 Fortune X% » dans `char-stats-panel` (ui-character-sheet.js), à côté
de critChance. Tooltip : « Augmente drops, or, trouvailles et fuite ».

## 3. Calibration & équité

- **Risque « stat à tout faire »** : LCK pilote déjà le crit. La Fortune reste
  *douce* (cap 30 %) et le poids or est ½ — LCK ne doit pas devenir le stat
  dominant. À surveiller : ne pas empiler Fortune + crit au point de rendre LCK
  obligatoire.
- **Économie** : drops + or simultanés → inflation possible. Poids or ½ + cap 30 %
  limitent. Référence : `game-economy-gold-audit.md`.

## 4. Mesure & tests

- **Pas de simulateur** : ces événements sont hors-combat (le sim mesure le
  win-rate, pas le loot/éco). Validation = **EV analytique** + **smoke tests**
  de la formule (Fortune calculée correctement, application par événement,
  bornes, partyFortune = max, buff Félix).
- `scenarioFortuneStat` : recalc → fortune attendue ; partyFortune = max ;
  drop chance modulée ; flee/trap bornés ; Félix pose/expire le buff.

## 5. Étapes (à valider PO avant d'attaquer)

1. `inventory-core.js` : calcul `c.fortune` dans recalculateStats + `item.bonusFortune`.
2. Helper `partyFortune()` (state.js ou inventory-core.js) + `felixFortuneTurns`.
3. Application par site (battle-rewards / movement-interactions / battle.doFlee).
4. Félix → buff (inventory.js useItem) + décrément (movement `_step` ou par rencontre).
5. Fiche perso : ligne Fortune.
6. Sérialisation `felixFortuneTurns` (save.js).
7. `loader.js` : `partyFortune` au MANIFEST.
8. `scenarioFortuneStat` (smoke) + doc CLAUDE.md.

## 6. Décisions ouvertes (PO)

- **Cap** : 0.30 proposé (doux). 0.40 = plus marqué.
- **Félix** : retire le soin (pur buff chance) ou garde un soin résiduel ?
- **Durée du buff Félix** : en pas, en rencontres, ou en nb de combats ?

## 7. Journal

- 2026-05-31 : audit LCK (ne touche que le crit + 2 hooks sort) ; Félix sans effet
  de chance. PO choisit Forme B + 4 familles d'événements. Conception rédigée.
  **Aucun code touché — en attente validation calibration (§6).**
