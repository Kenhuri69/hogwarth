# Stat dérivée « Célérité » — débouché post-plafond de l'AGI (D5 volet AGI)

> **Statut : IMPLÉMENTÉ (runtime).** Dernier morceau du rework des stats joueur.
> Le socle D1–D4 et la Fortune (D5 volet LCK) sont mergés (PR #336). Ce volet
> AGI était « Phase 2, non conçu » dans `player-stats-balance.md §2 (D5)`.
>
> **Pivot PO (2026-05-31)** : la 1ʳᵉ proposition (atténuation « Réflexes »,
> archivée §A) a été écartée. Le PO retient le débouché **action supplémentaire**
> avec un **gain de tour FLUIDE (continu), pas une fonction de palier**. Modèle
> livré : **Célérité** (accumulateur de tempo type ATB). Calibration **validée
> PO : `CELERITE_MAX 0.30 / CELERITE_HALF 45`** ; UX action sup. : re-prompt du
> même héros (le PO « sans préférence » → option recommandée retenue).

## 1. Constat (audit du code, 2026-05-31)

L'AGI est la stat **la plus surchargée** du jeu (`player-stats-balance.md §1`) :
elle pilote **trois** mécaniques, dont deux plafonnent.

| Mécanique | Formule (`inventory-core.js — recalculateStats`) | Plafond |
|-----------|--------------------------------------------------|---------|
| Crit de sort | `spellCritChance = min(35, 5 + agi×0.4)` | **35 %** à AGI **75** |
| Esquive | `dodgeChance = min(35, 5 + agi×0.4)` | **35 %** à AGI **75** |
| Fuite | `doFlee()` — chance basée AGI vs ATK ennemi | — |

Une fois les deux plafonds atteints, **chaque point d'AGI supplémentaire est
mort**. C'est le problème que la Fortune a résolu pour la LCK. Le volet AGI
applique le **même gabarit méthodologique** (stat dérivée, courbe de Hill,
simulation avant runtime, validation PO).

## 2. Modèle retenu — « Célérité » (gain de tour fluide)

### 2.1 Décision de modèle (pivot PO)

Le plan évoquait deux pistes : **initiative/action sup.** ou **atténuation**. Le
PO retient **l'action supplémentaire**, en exigeant un **gain de tour fluide,
pas par palier**. Une chance discrète « si AGI ≥ X → tour bonus » est donc
exclue : il faut que **chaque point d'AGI** augmente continûment la fréquence
d'action.

**Solution : accumulateur de tempo (type ATB).** Chaque héros porte une jauge de
Célérité qui se remplit d'un **taux continu** dérivé de l'AGI à chaque round ;
quand elle franchit 1.0, le héros gagne **une action supplémentaire** et la jauge
retombe de 1.0. Le **taux** (et non un seuil) pilote la fréquence → gain de tour
**parfaitement fluide** : AGI 30 → ~1 action sup. tous les 4 rounds, AGI 50 →
tous les ~2,5 rounds, sans rupture de palier.

> Cohérence avec le rôle « crit de sort » : la Célérité **renforce le tempo**
> (offensif ET défensif — les actions sup. servent attaque, sort, soin ou
> Garde). C'est l'identité « vivacité/vitesse » de l'AGI, distincte du crit de
> sort (qualité d'un sort) et de l'esquive (évitement). L'initiative pure
> (« agir avant l'ennemi ») est sans objet : le moteur fait déjà agir tous les
> héros avant les ennemis chaque round.

### 2.2 Stat dérivée `celerite` — courbe de Hill saturante

Calculée dans `recalculateStats()` (inventory-core.js), **par personnage**
(chaque héros a son propre tempo). Forme « douce → linéaire → plateau » (miroir
de `_fortuneCurve`), exprimée en **fraction d'action supplémentaire par round** :

```
celerite = CELERITE_MAX × x² / (x² + CELERITE_HALF²)
  où  x = c.agi + Σ item.bonusCelerite
```

- `CELERITE_MAX` — taux max d'actions sup./round (asymptote, jamais atteinte).
  **Candidat à figer : 0.30 (recommandé) ou 0.40.**
- `CELERITE_HALF` — AGI de demi-saturation. **Candidat : 45** (plus haut que la
  Fortune `HALF=30` car l'AGI démarre haut, 10–12, et croît +1/niveau : effet
  ≈ 0 en early game, payoff endgame qui **continue de croître bien au-delà du
  plafond d'esquive/crit-sort (AGI 75)**).
- `item.bonusCelerite` — point d'entrée d'équipement (futur gear), en points
  d'entrée (s'ajoute à `x`), comme `item.bonusFortune`. Aucun item ne le porte
  en V1 (hook inerte, symétrie méthodologique).

Profil (taux d'action sup./round, et cadence ≈ 1 action sup. tous les N rounds) :

| AGI (x) | 12 (early) | 22 | 32 | 45 | 52 (build AGI endgame) | 75 (cap esquive) |
|---------|:--:|:--:|:--:|:--:|:--:|:--:|
| `MAX 0.30 / HALF 45` | 1.7 % | 6.9 % | 12.4 % | 15 % | 17.1 % | 20.8 % |
| `MAX 0.40 / HALF 45` | 2.3 % | 9.2 % | 16.5 % | 20 % | 22.9 % | 27.7 % |
| cadence @0.30 (1 / N rounds) | ~59 | ~14 | ~8 | ~6,7 | ~5,8 | ~4,8 |

→ négligeable en early (gain de tour ~0), palier endgame qui **croît encore
quand crit de sort / esquive sont plafonnés**.

### 2.3 Mécanique de combat — jauge de tempo

- **État combat-scoped** : `celeriteGauge[idx]` par personnage, **réinitialisé
  à 0 dans `startBattle`** (comme `shieldTurns`/`guardTurns`). Non sérialisé.
- **Accumulation** : au début du segment d'un héros dans un round, après les
  contrôles (stun/peur), `gauge += c.celerite` ; tant que `gauge ≥ 1`, retirer
  1.0 et accorder **une action supplémentaire**.
- **Action supplémentaire** : le héros **rejoue son segment** (re-prompt du menu
  d'action) au lieu d'avancer au combattant suivant. Adaptation du flux de tour
  (`advanceBattleChar` / activation du perso) — c'est le « système de tour à
  adapter » demandé par le PO. KO/fin de combat coupent court (garde-fous).
- **Pas d'action sup. pour les ennemis** : la Célérité est un buff joueur (les
  monstres n'ont pas d'AGI exploitée pour ça — asymétrie volontaire en faveur du
  joueur, identité de la stat).

### 2.4 Application au simulateur (parité)

`simulateBattle` : `c._celGauge` réinitialisé à 0 ; dans la boucle des héros,
après stun/peur, `_celGauge += c._celerite` puis `while(_celGauge>=1){-=1;
actions++}` → le héros agit `1+actions` fois (chaque action revérifie les
ennemis vivants). Miroir exact du runtime.

## 3. Calibration & équité (validée par simulation §4)

- **Ne pas rendre l'AGI obligatoire** : le build AGI reste **non dominant** en
  win% absolu (cf. §4 — le tank garde la tête). L'AGI devient **viable et
  intéressant**, jamais un must.
- **Cohérence rôle « crit de sort »** : la Célérité est du **tempo**, pas un
  multiplicateur de dégât de sort — elle ne double pas le canal offensif AGI.
- **Risque surveillé (sim)** : les actions sup. composent avec le DPS → le
  levier est **puissant**. Calibration choisie (MAX 0.30) pour que le build AGI
  monte en milieu de peloton sans dépasser le tank, et que l'early reste à ~0.

## 4. Simulation — quantifier avant d'implémenter

Levier **opt-in** `--celerite-max=F` (asymptote, **défaut 0 = inactif** →
n'altère AUCUN rapport existant) + `--celerite-half=H` (défaut 45). Build de
mesure `--build=agi` (3 pts/niveau en AGI). Parité : accumulateur identique au
runtime. Protocole : n=600, Normal, `--stat-rework --stat-points=3` (baseline
**live** = D1–D4 + Fortune mergés), étages 1-12, solo+duo, sur balanced /
offensive / tank / **agi**.

### Critères de succès
1. **Early game intact** : Δ(ON−OFF) ≈ 0 aux étages 1-4.
2. **Débouché AGI réel ET ciblé** : le build `agi` est le plus gros bénéficiaire.
3. **Pas de build dominant** : le build `agi` (ON) ne dépasse pas le tank en
   win% absolu.

### Résultats (n=600, Δ = win% ON − OFF, points de %, Solo)

| Étage | `0.30/45` bal / off / tank / **agi** | `0.40/45` bal / off / tank / **agi** |
|------:|:--|:--|
| 5  | +1 / +2 / +0 / **+2** | +1 / +4 / +0 / **+2** |
| 6  | +3 / +1 / +1 / **+3** | +4 / +2 / +1 / **+7** |
| 7  | +5 / +7 / +1 / **+6** | +5 / +5 / +4 / **+8** |
| 8  | +3 / +3 / +6 / **+8** | +8 / +4 / +9 / **+10** |
| 9  | +4 / +4 / +3 / **+12** | +6 / +9 / +6 / **+13** |
| 10 | +4 / +4 / +7 / **+11** | +6 / +5 / +9 / **+9** |
| 11 | +4 / +4 / +4 / **+10** | +6 / +4 / +3 / **+15** |
| 12 | +6 / +6 / +3 / **+9** | +9 / +6 / +5 / **+17** |

### Win% ABSOLU avec levier ON `0.40/45` (vérif « pas de build dominant »)

| Étage | balanced | offensive | tank | **agi** |
|------:|:--:|:--:|:--:|:--:|
| 8 Solo | 75 | 63 | 79 | **68** |
| 10 Solo | 53 | 44 | 59 | **50** |
| 12 Solo | 52 | 41 | 53 | **50** |
| 12 Duo | 71 | 57 | 80 | **66** |

### Lecture des critères de succès
1. ✅ **Early game intact** : agi Δ aux étages 1-4 = `S1:0 S2:0 S3:0 S4:+1`
   (bruit). AGI bas → célérité ~2 % → quasi aucune action sup.
2. ✅ **Débouché AGI réel ET ciblé** : le build `agi` est **systématiquement le
   plus gros bénéficiaire** (Δ +6 à +17 en endgame), car il atteint ~52 AGI
   (~17–23 % de taux → 1 action sup. tous les ~5 rounds, ~3–4 par combat) là où
   un build qui dump l'AGI reste à ~22 AGI (~7–9 %, ~1 action sup./combat).
3. ✅ **Pas de build dominant** : en win% **absolu**, le **tank garde la tête**
   (ét.12 solo : tank 53, balanced 52, agi 50 ; duo : tank 80, agi 66). La
   Célérité fait passer le build AGI de **plus faible** (modèle Réflexes
   archivé) à **milieu de peloton compétitif** — viable, jamais dominant.

**Conclusion.** La Célérité (gain de tour fluide) remplit les 3 critères mieux
que l'atténuation : débouché AGI **net et ciblé**, early intact, pas de build
dominant. **Recommandation : `MAX 0.30 / HALF 45`** (signal AGI le plus net avec
le moins de power-creep général ; le build AGI reste sous le tank). Variante
`0.40/45` si on veut un payoff plus marqué (softening endgame plus large).

## 5. Étapes d'implémentation (toutes ✅ livrées)

1. ✅ `data.js` : `CELERITE_MAX = 0.30` / `CELERITE_HALF = 45`.
2. ✅ `inventory-core.js` : `c._celeriteX` / `c.celerite` dans
   `recalculateStats` (helper pur `_celeriteCurve`, lecture `item.bonusCelerite`).
3. ✅ `state.js` : `celeriteGauge = [0,0]` + `celeriteExtra = [0,0]`
   (combat-scoped).
4. ✅ `battle.js` : reset des jauges dans `startBattle` ; helper
   `_beginHeroSegment(idx)` (accumulateur, appelé aux 3 ouvertures de segment :
   `startBattle` char 0, opener `enemyTurn`, switch `advanceBattleChar`) ;
   consommation + re-prompt dans `advanceBattleChar` (garde-fous KO/ennemis
   vivants, reset `pendingAction`/`pendingSpell`/target-selection). Bandeau
   « ⚡ Célérité ! » + log UX.
5. ✅ `ui-character-sheet.js` : ligne « ⚡ Célérité X% ».
6. ✅ `loader.js` : `_celeriteCurve` au MANIFEST.
7. ✅ `tests/smoke.js` : `scenarioAgiCelerite` (T1 courbe AGI 45→15 %, T2
   `bonusCelerite`, T3 accumulateur 0/1/0 + AGI basse → 0, T4 re-prompt
   `advanceBattleChar`, T5 reset combat). **Suite complète 145 verts.**
8. ✅ Docs : CLAUDE.md (§ Crit + Esquive + § Célérité) + ce plan +
   `player-stats-balance.md §2 (D5)`.

> Pas de sérialisation : `celerite` est dérivé (recalc), `celeriteGauge` est
> combat-scoped (reset `startBattle`), comme `shieldTurns`/`guardTurns`.

## 6. Décisions PO (tranchées)

- **Calibration** : ✅ `MAX 0.30 / HALF 45` (ciblé).
- **Adaptation du flux de tour** : ✅ re-prompt du même héros à chaque action
  supplémentaire (PO « sans préférence » → option recommandée retenue).

## A. Alternative archivée — « Réflexes » (atténuation physique, écartée)

1ʳᵉ proposition, écartée par le PO au profit du gain de tour. Conservée pour
mémoire. Stat dérivée (Hill sur AGI) atténuant les coups physiques qui touchent
(`× (1 − reflexes)` dans `_enemyPhysicalHit`), Broyer/DoT non atténués.
Simulation n=600 (cap 0.20/half40 & 0.25/half35) : critères remplis mais le
build AGI restait **le plus faible** en absolu (viable, peu attractif). Le gain
de tour donne un débouché AGI **plus net** — d'où le pivot.

## 7. Journal

- 2026-05-31 : audit AGI (crit sort + esquive plafonnent à 35 % à AGI 75, puis
  mortes). 1ʳᵉ conception : stat dérivée « Réflexes » (atténuation physique).
  Sim n=600 × 4 builds : critères remplis mais build AGI peu attractif (le plus
  faible en absolu). **Aucun code `js/` touché.**
- 2026-05-31 : **pivot PO** — débouché = action supplémentaire, avec **gain de
  tour FLUIDE (non par palier)**. Conception « Célérité » (accumulateur de tempo
  type ATB, taux continu sur l'AGI). Levier sim `--celerite-max/-half` (opt-in,
  défaut 0 = inactif) + accumulateur dans `simulateBattle`. Sim n=600 × 4 builds
  × solo/duo × 3 calibrations (0.30/0.40/0.50, half 45) sur baseline live. **3
  critères remplis** : early intact (agi Δ≈0 ét.1-4), débouché AGI **ciblé** (agi
  = plus gros bénéficiaire, Δ +6..+17), **pas de build dominant** (tank garde la
  tête). Reco `0.30/45`. **Outil de mesure uniquement — aucun code `js/`
  touché.** En attente validation calibration PO avant runtime.
- 2026-05-31 : **PO valide `0.30/45` + re-prompt.** Implémentation runtime :
  constantes `data.js`, `_celeriteCurve` + `c.celerite` (`inventory-core.js`),
  jauges `celeriteGauge`/`celeriteExtra` (`state.js`), accumulateur
  `_beginHeroSegment` + re-prompt `advanceBattleChar` (`battle.js`), ligne fiche
  perso (`ui-character-sheet.js`), MANIFEST (`loader.js`), `scenarioAgiCelerite`
  (smoke), docs CLAUDE.md + plans. **Smoke : 145 verts.** Parité runtime↔sim
  (accumulateur identique). Volet AGI de D5 — et le rework de stats joueur —
  **terminé**.
