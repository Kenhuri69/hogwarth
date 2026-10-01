# Lot 4 (e) — Passe sim de l'arbre « Éveil du Sorcier » (4.8)

Revue `revue-design-progression-2026-07.md` §6.5 / étape 4.8 : mesurer
l'impact de l'arbre à budget plein (cible ≤ ~+12 points de win-rate),
documenter (G3/G4, CLAUDE.md) et ajuster si besoin.

## Conception

- `tools/sim-difficulty.js` charge `js/awaken-tree.js` dans son sandbox
  (mêmes données/helpers que le runtime : `AWAKEN_TREE`, `awakenCanTake`,
  `awakenBonuses` — aucune copie à maintenir).
- Flag `--awaken[=ordre]` : dépense gloutonne des points d'Éveil du héros,
  branche par branche selon l'ordre (`house,class,trunk` par défaut),
  rang par rang. Points = `floor(niveau/2)` + `--awaken-bought=N`
  (achats en Marques) ou `--awaken-points=N` (forcé).
  `--awaken-house=NAME` (défaut Gryffondor ; `--house-set` sinon).
  Archétypes : Harry = Duelliste, Hermione = Érudit (données).
- Effets mirroirs de `recalculateStats` : stats primaires avant D1/D2,
  crit/esquive/dégâts crit/PV/PM, Célérité (x = AGI + bonusCelerite),
  `lowHpDmg` (dégâts sous 50 % PV), `spellLifesteal`, `spellCostReduc`.
  Non modélisés (sans effet dans la sim) : `stepRegen` (hors combat),
  `bonusCounterChance` (riposte non modélisée), `bonusFortune`.
- Actifs : Riposte assurée (Harry) et Surcharge (Hermione), 1×/combat au
  premier tour offensif, puissance × (1 + activePower).
- Critère : delta de win-rate (Duo et Solo) entre `--awaken` et la baseline,
  étages 1-12 et Boucle (`--endgame`, budget achat max), ≤ ~+12 pts.

## Étapes

1. [x] Plan.
2. [x] Hook sim (chargement, allocation, effets, actifs) + aide CLI.
3. [x] Runs : baseline vs `--awaken` (1-12), 4 Maisons, Boucle budget plein.
4. [x] Ajustement des valeurs si > +12 pts — non requis (voir journal).
5. [x] Docs : G3/G4, CLAUDE.md, revue, push, PR. ⚠️ Pas de test units : la sim lit
   directement `js/awaken-tree.js` (aucune copie à verrouiller).

## Journal

- 2026-10-01 — Plan créé (PR #760 fusionnée, branche remise à zéro).
- 2026-10-01 — Sim branchée. Résultats (`--n=1500`/`4000`, étages 9-12, Δ
  win-rate vs baseline) : niveau/2 +0 à +5 ; 12 pts +1 à +5 ; 20 pts (victoire
  + 8 achats) +8 à +13 ; Boucle 11-35 avec 8 achats ≤ +7 ; arbre entier forcé
  (38 pts) +13 à +18. → Cible ≤ ~+12 tenue à budget plein ; aucune valeur
  modifiée. ⚠️ Écart entre Maisons (branche seule, 15 pts) : Gryffondor ≈ +4,
  Serdaigle ≈ +5, Serpentard ≈ +9, Poufsouffle ≈ +9. Biais connu du modèle
  contre Gryffondor (Harry de la sim lance surtout des sorts ; soin à 40 % PV
  avant que « sous 50 % PV » ne joue). Documenté (G4) ; rééquilibrage laissé
  au choix de l'utilisateur.
