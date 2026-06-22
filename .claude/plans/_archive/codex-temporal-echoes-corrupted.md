# Plan — Échos temporels → Codex (Phase 2)

> Roadmap Phase 2 « Échos temporels → Codex : Set `temporalEchoSeen` + robinet
> `corruptedBy` zone D ». **Touche du code** (`js/codex.js`) → cache-bump + smoke.
> Date : 2026-06-14.

## Audit doc↔code (AVANT écriture) — pipeline déjà construit

- Set : `seenEchoes` (state.js, sérialisé save.js) = le « temporalEchoSeen » prévu.
- Robinet Codex `echo` : `_codexCondMet` case `'echo'` → `ctx.echoSeen.has(value)` ;
  `_codexContext()` (ui-codex.js:72) passe `echoSeen: seenEchoes`. **15+ entrées**
  l'utilisent déjà (echo_scellement, voix_*, ruines_anciennes…).
- Surfaçage : `movement.js` affiche l'écho et fait `seenEchoes.add(...)`.
- Vue dédiée : `renderEchoCodex()` (ui-bestiary.js) « Mémoire des Ruines ».

**Gap réel (unique)** : l'entrée `echos_temporels` (codex.js:296) est encore
**purement floor-gated** (unlock 12 / reveal 14) — elle n'utilise pas le Set et
n'a **pas** de couche `corruptedBy` zone D. C'est exactement le livrable nommé.

## Changement

`echos_temporels` :
- ajouter `corruptedBy: [{type:'floor',14}, {type:'echo','echo_scene_sceau'}]`
  (zone D **ET** avoir traversé la scène pleine → utilise le Set `seenEchoes`).
- ajouter `textVersions.corrupted` (voix établie « cessé de distinguer jadis/
  maintenant »). Additif → aucune régression (sans la scène : reste `revealed`).

## Étapes

1. [x] codex.js : `echos_temporels` += corruptedBy (floor 14 + echo) + texte corrupted.
2. [x] units.js §8 : assertions echos_temporels (veiled/revealed/corrupted).
3. [x] `node tests/units.js` vert.
4. [x] cache-bump (skill) : codex.js `?v` (index.html + sw.js PRECACHE) + CACHE_VERSION.
5. [x] `node tools/check_cache_versions.js --base origin/master` + `node tests/pwa-smoke.js`.
6. [x] `node tests/smoke.js` (ou sous-ensemble codex) vert.
7. [x] `node tools/check_doc_modules.js` exit 0.
8. [x] Roadmap Phase 2 : ligne « Échos temporels → Codex » → ✅ Fait (date).
9. [x] Commit → push → PR → CI verte → squash-merge.

## Garde-fous

- Code servi (codex.js) → **cache-bump obligatoire** (guidelines §8).
- Additif : aucune régression (corrupted exige revealed + scène vue).
- Pipeline echo→codex déjà livré : ce PR ne fait que **brancher la dernière
  entrée** + sa couche corrompue (réconciliation + complétion).
