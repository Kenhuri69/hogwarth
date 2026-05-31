# Revue d'équilibrage — Statistiques du joueur

> **Statut : RÉDACTION (conception).** Aucune modification du code de jeu (`js/`).
> Seul l'outil de mesure `tools/sim-difficulty.js` reçoit un mode d'analyse
> opt-in (`--stat-rework`) pour chiffrer les implications avant toute décision.

## 1. Constat (revue du code)

Cartographie de l'usage réel de chaque stat (lecture mécanique) :

| Stat | Croît /niv | Allouable | Lue par une mécanique de combat ? | Verdict |
|------|:--:|:--:|------|------|
| ATK | +1 | via STR | dégâts physiques `atk + rand(0..3)` − def | 🟢 central |
| DEF | +1 | ❌ | mitigation `max(atk·0.25, atk−def)` | 🟢 central |
| MAG | +1 | ❌ | dégâts de sort `power + mag/2` | 🟢 central |
| LCK | ❌ | ✅ | crit physique `min(40, 5+lck·0.5)` (plafonne) | 🟡 |
| AGI | +1 | ✅ | esquive **et** crit sort (cap 35 % chacun) ; fuite | 🟡 surchargée |
| INT | +1 | ✅ | soin (int/4), DoT (int/24), brassage potions | 🔴 faible/opaque |
| END | ❌ | ✅ (+5 PV) | soin (end/4) | 🔴 redondante avec PV max |
| STR | +1 | ✅ (+1 ATK) | **rien** sauf éclaboussure Bombarda (str/4) | 🔴 fantôme |

Fragilités : STR ne sert presque à rien ; INT/END n'ont pas de débouché vers une
primaire ; LCK/AGI plafonnent puis meurent (les +LCK de la série ★N endgame sont
des points morts une fois le cap crit atteint).

## 2. Décisions (validées avec le PO, 2026-05-31)

| # | Décision | Détail validé |
|---|----------|---------------|
| D1 | **INT → MAG**, conversion **4:1** | `mag += floor(int/4)` dans `recalculateStats`. |
| D2 | **END → DEF**, conversion **4:1** | `def += floor(end/4)` dans `recalculateStats`. |
| D3 | **END → résistance aux DoT** | réduit les dégâts (et/ou durée) des DoT subis (burn/poison/bleed/gel). Modèle proposé : `dégât_tick = max(1, power − floor(END/8))`. |
| D4 | **STR → pénétration de DEF**, en **% avec courbe sigmoïde** | douce au début → quasi-linéaire au milieu → plateau logarithmique vers un cap. Couplage **STR → +1 ATK conservé** (STR donne ATK *et* pénétration). |
| D5 | **P6 — débouché post-plafond LCK/AGI** | une fois le cap crit/esquive atteint, recycler les points excédentaires (LCK → or/butin ; AGI → initiative/atténuation). **Phase 2**, non chiffré ici. |

### Formule de pénétration STR (D4) — proposition concrète

Fonction de Hill (n=2), qui réalise exactement « douce → linéaire → plateau » :

```
penFrac(STR) = CAP · STR² / (STR² + H²)        avec CAP = 0.50, H = 20
effDef = def · (1 − penFrac(STR))
```

| STR | 5 | 10 | 15 | 20 | 25 | 30 | 40 | 60 |
|-----|---|----|----|----|----|----|----|----|
| pén. | 2.9 % | 10 % | 18 % | 25 % | 30.5 % | 34.6 % | 40 % | 45 % |

- `H` (demi-saturation, 20) et `CAP` (50 %) sont les **knobs** d'équilibrage.
- Harry (STR base 9, +1/niv) en profite ; Hermione (STR 6, casteuse) quasi pas
  — la pénétration est thématiquement un outil de **frappeur physique**.

## 3. Implications attendues (à confirmer par simulation §4)

- **INT 4:1 plus faible que l'allocation actuelle** : aujourd'hui le simulateur
  modélisait l'allocation INT comme `+1 MAG` direct (1:1). Le runtime réel fait
  `+1 INT` (inerte). La conversion 4:1 est donc **plus généreuse que le réel
  actuel** (INT devient utile) mais **moins forte que le raccourci du sim** — il
  faut vérifier que le casteur ne soit pas dévalué.
- **END devient un choix défensif riche** : +5 PV (allocation) + DEF (4:1) +
  résistance DoT. Risque : END trop fort vs allocation pure DEF — surveiller.
- **STR cesse de mentir** : la « Force » influence enfin la frappe (ATK + perce-
  garde), surtout contre les boss à haute DEF.

## 4. Simulation — quantifier avant d'implémenter

Outil : `tools/sim-difficulty.js`, mode opt-in `--stat-rework` (n'altère pas le
comportement par défaut ; les rapports existants restent valides).

Le mode `--stat-rework` modélise fidèlement les 4 décisions **et** corrige une
omission du simulateur (croissance STR/INT/AGI +1/niveau, présente dans le jeu
réel via `_grantLevelStats` mais absente du sim). Pour isoler le seul apport du
rework, un drapeau `--fair-baseline` applique uniquement la correction de
croissance — la comparaison **fair-baseline vs stat-rework** mesure le rework pur.

Allocation sous rework alignée sur `STAT_POINT_EFFECTS` réel :
`STR→+1 ATK +1 STR · INT→+1 INT · AGI→+1 AGI · END→+1 END +5 PV · LCK→+1 LCK`.

### Protocole

```
# baseline équitable (correction de croissance seule)
node tools/sim-difficulty.js --fair-baseline --stat-points=3 --build=<B> 600
# rework (croissance + D1..D4)
node tools/sim-difficulty.js --stat-rework   --stat-points=3 --build=<B> 600
```
avec B ∈ {balanced, offensive, tank}, en Normal, étages 1-12, solo+duo.

### Résultats (n=600/cellule, Normal, knobs par défaut penCap=0.50 H=20 dotResDiv=8)

Δ = win-rate **rework − fair-baseline** (points de %). Étages 1-4 omis (100 %
des deux côtés partout).

| Étage | balanced Solo | balanced Duo | offensive Solo | offensive Duo | tank Solo | tank Duo |
|------:|:--:|:--:|:--:|:--:|:--:|:--:|
| 5  | +4  | 0  | +3 | 0  | +4  | 0  |
| 6  | +6  | 0  | +5 | +1 | +5  | 0  |
| 7  | +4  | +4 | +6 | +2 | +9  | +3 |
| 8  | +10 | +6 | +5 | +6 | +13 | +9 |
| 9  | +11 | +11| +8 | +7 | **+20** | +11 |
| 10 | +8  | +11| +8 | +9 | +15 | +17 |
| 11 | +12 | +10| +7 | +11| +15 | +19 |
| 12 | +12 | +9 | +4 | +10| +18 | +11 |

**Lecture.**
- Effet **nul en early game** (ét. 1-4) : les stats secondaires sont trop
  basses pour que les conversions/pénétration pèsent — le début de partie n'est
  pas cassé. ✅
- Gain **croissant avec l'étage** : là où la DEF ennemie et les DoT mordent le
  plus, la pénétration STR et la résistance END font leur travail. ✅
- **Tous les builds profitent** : aucun build ne devient inutile.
- ⚠️ **Le build tank est le grand gagnant** (+13 à +20 pts en solo endgame),
  loin devant balanced (~+10) et offensive (~+6). C'est logique : END cumule
  désormais **trois** bénéfices (+5 PV + DEF 4:1 + résistance DoT) tandis que la
  pénétration STR ne profite qu'aux frappeurs physiques. Risque d'équilibrage :
  END pourrait devenir l'allocation par défaut universelle.

**Conclusion.** Le rework remplit l'objectif — il **adoucit le mur endgame**
(+8 à +20 pts ét. 8-12) sans toucher au early game, et redonne un rôle réel à
STR/INT/END. Mais l'ampleur est **plus forte que prévu**, et **END est
sur-récompensée**. Deux leviers de réglage avant implémentation :
1. Réduire l'apport END : conversion END→DEF en **6:1** (au lieu de 4:1) et/ou
   `--dot-res-div=12` (résistance DoT plus douce).
2. Garder INT→MAG en 4:1 (le casteur n'est pas sur-servi).

Les knobs `--pen-cap` / `--pen-half` / `--dot-res-div` (+ futur `--end-def-div`)
permettent de re-simuler chaque réglage avant de figer les valeurs.

> Repro :
> `for b in balanced offensive tank; do node tools/sim-difficulty.js --fair-baseline --stat-points=3 --build=$b 600; node tools/sim-difficulty.js --stat-rework --stat-points=3 --build=$b 600; done`

## 5. Journal

- 2026-05-31 : revue + décisions D1-D5. Implémentation prématurée annulée
  (`git reset` de la branche à l'état master). Doc de conception rédigé.
  Ajout du mode d'analyse `--stat-rework` au simulateur (mesure, pas runtime).
- 2026-05-31 : simulation n=600 × 3 builds, fair-baseline vs rework.
  Verdict : objectif atteint (adoucit l'endgame, early game intact) mais
  **END sur-récompensée** (build tank +13 à +20 pts solo). Reco : tester
  END→DEF en 6:1 et/ou dotResDiv=12 avant de figer. **Aucune valeur figée,
  aucun code de jeu touché — décision d'implémentation en attente du PO.**
