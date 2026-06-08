# Plan — Lots 4-5 ch.09 : dialogues conditionnels PNJ ↔ créature

**Branche :** `claude/ch09-npc-creature-dialogues` (créée après merge de PR #426)
**Source :** `docs/histoire/09-bestiaire-et-lore.md` §VI (Lot 4, volet « dialogues »)

## Objectif (périmètre validé : « dialogues de pnj »)
Donner aux PNJ tuteurs une **réaction de reconnaissance** quand le groupe a
**vaincu** la créature qui leur est liée — profondeur narrative, données pures,
aucun moteur neuf.

## Décisions de conception
- **Gate = `monsterKills[id] > 0`** (par espèce, déjà sérialisé) = « vaincu »,
  plus juste que `defeatedBosses` (ne couvre pas aragog/greyback/auror_corrompu)
  et que `seenMonsters` (juste rencontré). Aucun nouvel état, aucune migration.
- **Mécanisme = greffe dans le pool idle** de `_resolveDialogSource`
  (`npc-dialog.js`), strictement le même pattern que les rumeurs/indices/cheers
  déjà présents (`pool = pool.concat(...)`). Non préemptif, non garanti,
  test-safe. Ne touche que les PNJ portant le nouveau champ `contextualReaction`.
- **Champ NPC** : `contextualReaction: [{ killedId, text }]` (optionnel).

## Pairings (PNJ déjà placé sur l'étage du boss, donne déjà la quête de chasse)
- Kingsley (ét. 8) ↔ `fenrir_greyback`, `auror_corrompu`
- Bill Weasley (ét. 9) ↔ `aragog`, `maitre_detraqueur`
- Sirius (ét. 10) ↔ `antonin_dolohov`, `heraut_tenebres`
- Hagrid (ét. 4 / Boucle 14) ↔ `aragog`
- Lupin (ét. 4 / Boucle 14) ↔ `fenrir_greyback`

## Étapes
1. [x] Hook resolver dans `_resolveDialogSource` (idle pool concat, lit
   `d.contextualReaction` — cohérent avec `contextualLore`).
2. [x] `contextualReaction` sur les 5 PNJ (`npcs.js`), voix respectée
   (Kingsley ×2, Bill ×2, Sirius ×2, Lupin ×1, Hagrid ×1).
3. [x] Test smoke `scenarioNpcCreatureReaction` (déterministe via Kingsley +
   Math.random≈1) — vert.
4. [x] Bump cache : `npcs.js` v20, `npc-dialog.js` v14, `CACHE_VERSION` v80.
   `check_cache_versions.js` exit 0.
5. [x] `units.js` (139) + `pwa-smoke.js` verts ; `smoke.js` en cours.
6. [ ] Commit + push + PR (après smoke vert).

## Journal
- 2026-06-08 : branche créée post-merge #426 ; conception arrêtée.
