# Plan — Garde-fous release / sign-off (Roadmap Phase 4, item 5)

Branche : `claude/release-guardrails-signoff`. Item 5 (dernier item Phase 3/4).

## Objectif
Vérifier que les garde-fous release sont verts sur master (après merge des
items 2/3/4) et clore la roadmap Phase 4 ; corriger toute dérive.

## Vérification (master = a66d118, post items 2/3/4)
Tous verts, aucune dérive à corriger :

| Garde-fou | Commande | Résultat |
|-----------|----------|----------|
| Cache PWA | `node tools/check_cache_versions.js --base origin/master` | ✅ cohérent |
| Doc modules | `node tools/check_doc_modules.js` | ✅ 86 modules alignés |
| Unitaires | `node tests/units.js` | ✅ 684 assertions |
| PWA | `node tests/pwa-smoke.js` | ✅ |
| Équilibre | `node tools/check_difficulty.js --base origin/master` | ✅ 0 dérive |
| Smoke | `node tests/smoke.js` | ✅ 227 scénarios |

Les 6 tournent aussi en CI (`.github/workflows`) à chaque PR — vérifié vert sur
les PR #576/#577/#578.

## Étapes
1. [x] Lancer les 6 garde-fous sur master final → tous verts.
2. [x] Roadmap : ligne « Garde-fous release » close + **sign-off release** daté
   (Phases 3 & 4 closes ; restent uniquement des tâches d'art séparées :
   PNG boss-gardiens, pass d'assets de fin, impl. biais Maison V2).
3. [x] Commit + push + PR ; doc-only → pas de cache-bump, smoke non requis
   (§7/§8 ; mais la CI les ré-exécute de toute façon).

## Note
Item doc-only : seuls la roadmap et ce plan changent. Aucun code servi au
navigateur touché → pas de bump de cache.
