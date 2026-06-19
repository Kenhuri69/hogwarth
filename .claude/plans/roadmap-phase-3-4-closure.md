# Roadmap Phases 3 & 4 — clôture des items restants

> Plan vivant (guidelines §5). Un item = une branche = une PR = squash-merge.
> Source : `docs/REVUE-TRANSVERSALE-ET-ROADMAP.md` (Phase 3 §190+, Phase 4 §203+).
> Méthode : AUDIT doc↔code AVANT d'écrire. Beaucoup d'items sont déjà livrés
> (doc en retard) → réconciliation, pas du neuf.

## Item 1 — Héritage / NG+ cosmétique opt-in (Phase 3) — DOC-ONLY

**Audit (2026-06-18)** : DÉJÀ LIVRÉ.
- `js/profile.js` complet : profil persistant `hogwarts_rpg_profile` (titres,
  Codex du Sorcier, fins vues), zéro stat héritée. Câblé `index.html?v=3`,
  MANIFEST loader (`getPlayerProfile`/`recordEndingToProfile`/`ngPlusAvailable`/
  `openWizardCodex`).
- NG+ « vrai » : `ngPlusScaling()` + constantes `NGPLUS_*` (`dungeon-scaling.js`),
  cran = victoires plafonné `NGPLUS_CAP`, zéro héritage joueur.
- Tests : `units.js §11quater` (computeProfileTitles / profileTopTitle).
- Ch.14 §14.6.3 / §E déjà réconciliés (✅ livré).

**Reste** : la table Phase 3 (roadmap) affiche encore 🟡 non-clos + §1.4 💡4
en 💡 proposé. → réconciliation roadmap.

- Étape 1 : marquer Phase 3 row « Héritage / NG+ » ✅ Fait (2026-06-18). → verify: ligne barrée + renvoi profile.js
- Étape 2 : §1.4 💡4 → ✅ Livré. → verify: statut ✅
- Vérif : `node tools/check_doc_modules.js` exit 0 (doc-only, pas de cache bump, smoke non requis §7/§8).

## Item 2 — Décisions ❓ endgame (Phase 3) — ARBITRAGE USER
À faire après merge Item 1. AskUserQuestion AVANT d'écrire.

## Item 3 — Pass d'équilibrage de release (Phase 4)
`tools/sim-difficulty.js` + `check_difficulty.js` en CI.

## Item 4 — QA parcours complet (Phase 4)
Scénario smoke bout-en-bout si lacune.

## Item 5 — Garde-fous release (Phase 4)
cache-bump / smoke / units / pwa-smoke verts.

### Hors-scope (art, session dédiée)
- Art PNG des 4 boss-gardiens.
- Pass d'assets de fin (illustrations victoire, SFX, fonds Codex).
