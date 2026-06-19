# Plan — Pass d'équilibrage de release (Roadmap Phase 4, item 3)

Branche : `claude/release-balance-pass`. Item 3 de la poursuite de roadmap.

## Audit (doc↔code)
- `tools/check_difficulty.js` est **déjà branché en CI** (`.github/workflows`, step
  « Garde-fou d'équilibre »). Il régénère un résumé win-rate via `sim-difficulty.js`
  (N=800) et compare au tableau **§3** de `DIFFICULTY_REPORT.md` (seuil 10 pts).
- **Constat** : la baseline §3 committée était **périmée**. Code actuel ≈ +6-9 pts
  aux étages 9-12 (Duo surtout) vs §3 → l'étage 9-Duo (baseline 77 %, réel ~85 %)
  franchissait ±10 pts sur les tirages N=800 malchanceux → **CI flaky** (constaté
  sur PR #576 : 88 % vs 77 % = +11 pts, échec ; re-run vert).

## Décision
Ce n'est pas une régression : 67 % solo / 85 % duo à l'étage-climax 9 sont des
bandes saines. La doc avait juste pris du retard. **Pass de release = régénérer la
baseline + fiabiliser le gate.**

## Étapes
1. [x] Régénérer §3 à **N=4000** (`check_difficulty.js --update-baseline --sims 4000`)
   → baseline stable reflétant le code actuel.
2. [x] Vérifier le gate **flake-free** : 6 runs advisory consécutifs vs nouvelle
   baseline → 0 dérive > 10 pts (avant : ~1/2 runs CI échouaient à l'ét. 9-Duo).
3. [x] Réaligner les tables **dérivées de §3** : §4 (verdicts) + exec-summary
   « Win % par combat » (Solo confortable 1-7 / 1er décrochage ét.8 71 % ;
   Duo confortable 1-10 / 1er décrochage ét.11 73 %).
4. [x] Banner daté en tête du §📊 : scope du pass, écart vs ancienne baseline,
   gate fiabilisé. Tables d'autres méthodologies (n=600 toutes difficultés,
   legacy↔rework, §7 floor-run) = instantanés antérieurs, non re-simulés.
5. [x] Gate strict local (`--base origin/master`) vert + `check_doc_modules` vert.
6. [x] Roadmap Phase 4 ligne « Pass d'équilibrage » close (2026-06-19).
7. [ ] Commit + push + PR ; doc-only (DIFFICULTY_REPORT.md) → pas de cache-bump,
   smoke non requis (§7/§8). CI « Smoke + PWA » doit être verte (gate inclus).

## Hors-scope (signalé)
- Re-simulation des tables « toutes difficultés » / « legacy↔rework » / §7 (méthodo
  distinctes, valeur historique) — non requis pour la robustesse du gate CI.
- Seed déterministe du sim (éliminerait 100 % du résidu de bruit) : amélioration
  possible mais invasive (≈ remplacer tous les `Math.random` de sim-difficulty.js) ;
  la régénération de baseline suffit à supprimer le flake observé. Noté comme
  amélioration optionnelle.
