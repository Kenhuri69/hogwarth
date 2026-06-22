# Chapitre 13 — Implémentation des lots P1 (Équilibre)

> Réf : `docs/histoire/13-equilibre-difficulte-progression.md` §13.9 (plan
> d'implémentation) + §13.5 (simulations). Branche : `claude/ch13-impl-p1-vhoroc`.
> Périmètre : **P1 uniquement** — aucune modification des valeurs d'équilibrage.

## Exclusions strictes (NE PAS implémenter — `❓` non tranchés)
`houseDifficultyModifier`, `eclatPowerBoost`, refuges de Maison, héritage en
Boucle, et toute modif de `DIFFICULTY_SETTINGS` / `ENDGAME_SCALING` /
constantes de scaling. Si l'un semble nécessaire → demander avant.

---

## Lot 1 — Garde-fou de simulation en CI (`tools/check_difficulty.js`) (💡 §13.9.C/F)

**Objectif** : échouer (exit 1) si un étage dérive de > 10 pts de win-rate par
rapport à la baseline committée, **sans** mise à jour de `DIFFICULTY_REPORT.md`.
Modèle : `tools/check_cache_versions.js` (strictness dépendante de `--base`).

**Décision de conception** : la **baseline committée = le tableau §3 « Résultats
Monte Carlo » de `DIFFICULTY_REPORT.md`** (source de vérité unique, pas de fichier
JSON parallèle qui dériverait — cf. §13.9.A.1). Le script :
1. lance `node tools/sim-difficulty.js --difficulty=Normal --build=balanced <N>`
   (mêmes flags que l'en-tête du rapport), parse la table §3 → win-rate courant ;
2. parse la même table §3 dans `DIFFICULTY_REPORT.md` → baseline ;
3. calcule la dérive max par couple (étage, mode) ;
4. **avec `--base <ref>`** (PR) : si dérive > 10 pts ET `DIFFICULTY_REPORT.md`
   non modifié vs base → **exit 1** ; si le rapport est modifié → pass (note :
   régénérer la baseline) ;
5. **sans `--base`** (push master / local) : advisory — affiche la dérive,
   **exit 0** (post-merge, pas de base pour vérifier la doc — mirroir du mode
   cohérence-seule de `check_cache_versions`).
6. `--update-baseline` : régénère et réécrit la table §3 du rapport (confort dev).

Bruit Monte-Carlo : à N=800, SE de la différence de deux win-rates ≈ 2.5 pts →
P(|Δ| > 10) ≈ négligeable. Le seuil 10 pts absorbe le bruit.

- **Vérif** : `node tools/check_difficulty.js` passe sur master courant (dérive
  ≈ 0). Un patch de scaling factice fait dériver > 10 pts → `--base` échoue.
- Câblage CI : étape dans `.github/workflows/test.yml` (PR → `--base origin/<base_ref>`).

## Lot 2 — Communication du pivot endgame (💡 §13.9.E) — cosmétique

### 2a. Toast pivot à la 1ʳᵉ entrée en Boucle Ténébreuse
- Message : « Ici, la puissance se gagne — elle ne tombe plus. »
- Flag **one-shot SÉRIALISÉ** `endgamePivotSeen` (state.js, modèle
  `combatTutorialSeen`). Distinct du `_darknessToastShown` (ambiance, session-only).
- Déclencheur : `goDeeper` → `beforeTransition`, étage ≥ 11 + `victoryAchieved`,
  via helper `_maybeAnnounceEndgamePivot()` (movement-floors.js, modèle
  `_maybeAdvanceDarkLoop`).
- Sérialisation : `_serializeState` / `_applyState` (save.js) + reset `startGame` (main.js).

### 2b. Indicateur d'attrition / niveau de visite narratif (Sim 1)
- Label narratif dérivé de `floorKillCount` (n = floor(kills/4)) — **pas de
  chiffre brut**. Helper pur `floorVisitLabel(floor)` (movement-floors.js).
  - n ≤ 1 : « Étage maîtrisé » · n ≤ 3 : « Étage agité » ·
    n ≤ 5 : « Étage hostile » · n ≥ 6 : « Étage redouté ».
- Réutilise le toast de respawn existant `_announceRespawn` (préfixe le label).

## Process (guidelines)
- [x] Plan écrit (ce fichier) — §5.
- [x] JS/CSS touchés → `cache-bump` (state v28→29, movement-floors v12→13,
  save v32→33, main v20→21 ; CACHE_VERSION v108→v109). `check_cache_versions
  --working` + `pwa-smoke` verts — §8.
- [x] `node tests/units.js` (442 assertions) + `node tests/smoke.js` (195/195)
  verts ; scénario dédié `scenarioCh13EndgamePivot` (T1–T6) — §7.
- [x] Amendé Chapitre 13 (§13.9.C/E + tableau F + points à trancher #6 → `✅`)
  + G8 (indicateur d'attrition + toast pivot).
- [x] `node tools/check_difficulty.js` vert (baseline stable, changements
  d'équilibrage = 0 — les modifs sont cosmétiques/tooling).
- [x] Commit + push ; **demander avant** d'ouvrir/merger une PR. → livré & mergé.

## Suivi / écarts
- `check_difficulty.js` : baseline = table §3 de DIFFICULTY_REPORT.md (pas de
  JSON parallèle). Chemin strict (`--base`) + advisory (sans base) testés
  manuellement (injection d'une fausse baseline → exit 1 confirmé).
- Pivot toast ajouté en sus du `_darknessToastShown` existant (ambiance,
  session-only) sans le modifier — les deux toasts coexistent à la 1ʳᵉ entrée.

## Fichiers touchés
| Fichier | Nature | Cache-bump |
|---------|--------|:----------:|
| `tools/check_difficulty.js` | nouveau (tooling) | non |
| `.github/workflows/test.yml` | câblage CI | non |
| `js/state.js` | flag `endgamePivotSeen` | oui |
| `js/save.js` | sérialisation | oui |
| `js/main.js` | reset startGame | oui |
| `js/movement-floors.js` | pivot + label attrition | oui |
| `tests/scenarios/dungeon.js` | scénario smoke | non |
| `docs/histoire/13-...md`, `docs/gameplay/G8-...md` | doc | non |
