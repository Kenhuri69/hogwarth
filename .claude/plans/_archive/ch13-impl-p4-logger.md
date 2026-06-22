# Ch.13 P4 — Logger d'équilibrage in-game `BALANCE_DEBUG`

Implémentation du lot P4 de §13.9.H : logger OPT-IN, LOCAL, ANONYME (aucune
collecte auto, aucun réseau). Activé par `localStorage.hogwarts_balance_debug = '1'`,
exposé sur `window.BalanceLog`. 100 % additif et inerte tant que le flag est off.
**Aucune valeur d'équilibrage du jeu n'est touchée** — instrumentation pure.

## État de départ
- Aucune télémétrie ni logger en jeu (vérifié §13.9.H).
- La sim (`sim-difficulty.js` + `check_difficulty.js` CI) couvre déjà la
  non-régression d'équilibrage. P4 = pont sim↔terrain pour playtest (§13.9.J).

## Décisions
- Schéma persisté `hogwarts_rpg_balance_log` = colonnes sim §3 :
  étage / mode / niveau / tours / PV restants / issue.
- `underLevelGap = niveau joueur − niveau attendu` via table statique
  `DIFFICULTY_REPORT.md §1` (Solo/Duo, étages 1-12 ; extrapolation +1/étage au-delà).
- 4 hooks défensifs `if (window.BalanceLog)` aux call-sites existants d'autoSave.
- Métriques dérivées (noms canoniques §13.9.G) calculées à l'export :
  `synergyUsageRate`, `loopDepthMedian`, `deathRatePerFloor`, `averageClearTime`.

## Étapes
1. [x] Lire spec §13.9.H/G/F/J + table niveau attendu (§13.2.4 / report §1) + call-sites.
2. [x] Écrire ce plan.
3. [x] Créer `js/balance-log.js` (défensif, silencieux si flag off) →
       vérif : `record/export/summary/enabled/clear` exposés, no-op sans flag.
4. [x] Brancher les 4 hooks défensifs (endBattle / triggerDeath / castSpellInBattle /
       goDeeper) → vérif : grep des call-sites, gardés par `if (window.BalanceLog)`.
5. [x] MANIFEST loader (`BalanceLog`, kind obj, optional) + index.html (avant loader.js)
       + section « Structure des fichiers » de CLAUDE.md → vérif : `node tools/check_doc_modules.js`.
6. [x] Skill cache-bump (`?v` balance-log.js + index.html + PRECACHE sw.js + CACHE_VERSION)
       → vérif : `node tools/check_cache_versions.js --base origin/master`.
7. [x] Scénario smoke `tests/scenarios/misc.js` (active le flag, combat, assert log non vide + export)
       → vérif : `node tests/smoke.js balanceLog`.
8. [x] `node tests/units.js && node tests/smoke.js` complets.
9. [x] Flip ligne P4 §13.9.F/§13.9.H + point 7 §résumé de 💡❓ → ✅ implémenté.
10. [x] commit-guard → commit + push + PR. → livré & mergé (#629, `js/balance-log.js`).

## Écarts constatés
- `expectedLevel` du logger est une **table statique** (report §1), pas le calcul
  dynamique `expectedLevelAtFloor` du sim (qui dépend de `cfg`). C'est volontaire :
  le runtime n'a pas le pool ennemi du sim ; la table figée suffit pour `underLevelGap`.
- Export : bouton debug flottant injecté **uniquement** quand le flag est on
  (zéro empreinte UI sinon).
