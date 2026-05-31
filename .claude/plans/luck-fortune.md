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

### 2.1 Stat dérivée `fortune` (fraction 0..cap)

Calculée dans `recalculateStats()` (inventory-core.js), comme `critChance` :

```
c.fortune = min(FORTUNE_CAP, c.lck × FORTUNE_PER_LCK + Σ item.bonusFortune)
```

- `FORTUNE_PER_LCK = 0.006` (0,6 %/point de LCK)
- `FORTUNE_CAP = 0.30` (plafond dur, comme le crit plafonne)
- `item.bonusFortune` : nouveau champ d'équipement optionnel (gear de chance futur)
- Harry (lck 15) → 0.09 ; endgame (lck ~25-30 + paliers Maison + équip) → approche 0.30.

### 2.2 Buff Félix Felicis (la chance temporaire)

Félix devient un **buff de Fortune** : `felixFortuneTurns` (état sérialisé),
ajoute `FELIX_FORTUNE = +0.25` à la Fortune effective pendant N pas/rencontres.
(Garde un petit soin ? À trancher — proposition : retire le soin, Félix = pur
buff de chance, cohérent avec le nom.)

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
