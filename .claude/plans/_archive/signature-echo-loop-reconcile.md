# Plan — Suites de signature en Boucle (écho déchiré par Maison) — réconciliation

> Roadmap Phase 3 « Suites de signature en Boucle (écho déchiré par Maison) ».
> **Doc-only** (déjà livré côté code). 2026-06-16.

## Audit doc↔code — déjà LIVRÉ + testé

`js/floor-ambiance.js` :
- `SIGNATURE_ECHOES` (4 Maisons) : variantes `done`/`undone` (+ `donePact`/
  `doneDefiance` pour Serpentard) — « Étendard de Godric déchiré mais la braise
  tient » / « jamais rallumé », etc.
- `getSignatureEchoBeat(floor, house, done, pactChoice)` — pur (étage 14).
- `maybeSignatureEchoBeat(floor)` — one-shot étage 14 : narrative + toast,
  débloque `echo_signature` (codex), relique vocale, `checkCodexUnlocks`.

Câblé : `movement-floors.js` (entrée des Ruines, étage 14, house-aware).
Testé : `tests/units.js` §724-760 (`SIGNATURE_FLOOR=14`, 4 Maisons, variantes
done/undone/pact/defiance, gating floor). `units` 682 verts.

→ La « suite de signature en Boucle » EST l'écho de signature livré. Le Ch.11
§11.8.1 (point 3) le marque encore `💡`. Réconciliation.

## Étapes

1. [x] 11 §11.8.1 point 3 : `💡` → `✅` (grounding floor-ambiance/movement-floors
   /echo_signature/units).
2. [x] Roadmap Phase 3 : ligne « Suites de signature en Boucle » → ✅ Fait.
3. [x] `node tools/check_doc_modules.js` exit 0.
4. [x] Commit → push → PR → CI verte → squash-merge.

## Garde-fous

- Doc-only → pas de cache bump, smoke non requis (§7/§8) ; units déjà verts.
- Surgical : flip de marqueur + roadmap, pas de réécriture de lore.
