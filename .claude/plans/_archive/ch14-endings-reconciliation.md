# Plan — Réconciliation doc↔code Ch.14 (Scénarios de fin) — ⚠️1 (volet Ch.14)

> Branche `claude/hogwarth-narrative-review-1kga03` (repartie de master après #511).
> Suite directe de la réconciliation Ch.12. Tâche Phase 1 🔴 Haute.

## Constat (vérifié contre le code)

Ch.14 est *partiellement* à jour (14.0/14.2.1/14.3/14.5 déjà ✅) mais plusieurs
blocs marqués `💡 proposé` / `❓ non implémenté` sont **livrés** :

| Bloc doc (stale) | Réalité code | État |
|---|---|---|
| §E « New Game+ — 💡 non implémenté aujourd'hui » ; §14.6.3 « ❓ aucun héritage inter-run » | `js/profile.js` (NG+ cosmétique : `getPlayerProfile`, `ngPlusAvailable`, `recordEndingToProfile`, `computeProfileTitles`, `openWizardCodex`) + `state.js`/`save.js` | ✅ livré |
| §A.2 `endingType` « 💡 proposé » + `computeEndingType` | `endingType` (endgame.js, state.js, save.js, codex.js, ui-codex.js) | ✅ livré |
| §14.6.2 « 💡 entrée d'épilogue proposée » | entrée `epilogue` (codex.js + state.js) | ✅ livré |
| §F Priorisation P1/P3/P5 « 💡 », P4 | livrés (#497/#501/#502/#507) | ✅ |
| Points à trancher #3/#4/#5 | tous tranchés (epilogue / NG+ / endingType) | ✅ |

## Étapes & vérifications

1. [x] §14.6.2 : épilogue 💡 → ✅ livré (codex `epilogue` + `endingType`).
2. [x] §14.6.3 : header `(❓/💡)` → `(✅)`, blocs héritage → ✅ livré (profile.js).
3. [x] §A.2 : header `(💡)` → `(✅ livré)`, `endingType`/`computeEndingType`/profil → livré.
4. [x] §E : header + blockquote NG+ → ✅ livré (profile.js).
5. [x] §F Priorisation : P1/P3/P5 → ✅, P4 câblage → ✅.
6. [x] Points à trancher #3/#4/#5 → ✅ tranchés.
7. [x] Roadmap ⚠️1 : marquer Ch.14 réconcilié (reste `CLAUDE.md`).
8. [x] Doc-only → pas de cache bump ni smoke (guidelines §7). commit → push → PR → merge.

## Notes
- Reste du volet ⚠️1 après ce PR : **`CLAUDE.md`** (index/sections) seul.
- Assets de fin (illustrations/sample) : câblage défensif livré (#497) ; l'art
  fin lui-même reste un polish optionnel (noté, non bloquant).
