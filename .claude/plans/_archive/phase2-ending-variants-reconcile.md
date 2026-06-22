# Plan — Variantes de fin (B) « dans la cinématique » (Phase 2, reconciliation)

> Roadmap Phase 2 « Variantes texte de fin (B) complètes dans la cinématique ».
> **Doc-only** (déjà livré côté code). Date : 2026-06-14.

## Audit doc↔code (AVANT écriture) — déjà LIVRÉ

- La « cinématique » de victoire (fin A) = modale `#victory-modal`
  (`#victory-speech` + `victoryFlourish` particules). `js/cinematics.js`
  `victoryFlourish()` est une **surcouche visuelle PURE** (halo + pluie d'or),
  **sans page de texte**.
- Les 5 axes de variantes (B) s'injectent déjà dans `#victory-speech` via
  `_victorySpeechVariants` (`js/endgame.js`), testés `tests/units.js` §11
  (livré/confirmé #547).
- Le seul autre **texte multi-pages** est *Briser le Cycle* (fin C,
  `BREAK_CYCLE_PAGES` dans `break-cycle.js`) — **hors-scope** (item = fin B).

**Conclusion** : il n'existe **pas** de cinématique-texte de victoire distincte
où « porter » les variantes — elles sont déjà sur la seule surface de fin A.
Rien à coder. Réconciliation doc.

## Étapes

1. [x] 14 §14.2.2 : 1 ligne précisant que « la cinématique » de fin A = la
   modale `#victory-modal` + `victoryFlourish` (visuel pur), donc les variantes
   y sont déjà rendues.
2. [x] Roadmap Phase 2 : ligne « Variantes texte de fin (B) » → ✅ Fait (date),
   avec grounding (déjà dans la cinématique de victoire ; cinematics.js = visuel).
3. [x] `node tools/check_doc_modules.js` exit 0.
4. [x] Commit → push → PR → CI verte → squash-merge.

## Garde-fous

- Doc-only → pas de cache bump, smoke non requis (§7/§8).
- Ne PAS toucher break-cycle.js (fin C, hors item) — éviter le scope creep.
