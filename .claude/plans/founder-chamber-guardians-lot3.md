# Plan — Boss-gardiens Lot 3/3 : hooks code (promo + Codex), art déféré

> Phase 3, chantier boss-gardiens découpé. Lot 3 = polish **code only**
> (l'art PNG dédié reste une tâche d'asset séparée). 2026-06-15.

## Audit

- Promo beat : `BOSS_PROMO_BEATS` + `_maybeBossPromoBeat()` (battle.js) — système
  one-shot existant (Maître des Détraqueurs, Héraut des Ténèbres). Appelé dans
  `startBattle`.
- Codex : `checkCodexUnlocks('battle-end')` appelé en fin de `endBattle`
  (battle-rewards.js) ; lit `seenEchoes`. Les échos de Chambre
  `echo_chamber_<house>` (TEMPORAL_ECHOES) se révèlent dans la vue « Mémoire des
  Ruines » (renderEchoCodex). L'étage-scène ne débloque QUE la Chambre du héros
  (illumination §10.5) → défaire les 3 gardiens débloque les 3 autres.

## Changement (code, art déféré)

1. [x] battle.js : `BOSS_PROMO_BEATS` += 4 gardiens (lignes de Fondateur).
2. [x] battle-rewards.js (`endBattle`) : défaite d'un gardien → `seenEchoes.add`
   de l'écho de Chambre correspondant (map gardien→echo_chamber_<house>).
3. [x] tests/scenarios : `scenarioChamberGuardianPolish` (promo map + fire once
   + endBattle révèle l'écho).
4. [x] cache-bump battle.js + battle-rewards.js + CACHE_VERSION.
5. [x] check_cache_versions + pwa-smoke + smoke + units + check_doc_modules.
6. [x] Doc : 11 §11.9.2 (Lot 3 hooks ✅, art déféré) + roadmap Phase 3.
7. [ ] Commit → push → PR → CI verte → squash-merge.

## Garde-fous

- Code servi → cache-bump (§8).
- Défensif : promo one-shot via seenScriptedBeat ; unlock gardé par
  `typeof seenEchoes`. Réutilise des systèmes éprouvés.
- **Art NON inclus** (PNG dédié = tâche d'asset) — fallback SVG conservé.
