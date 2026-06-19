# Plan — Décisions ❓ endgame tranchées (Roadmap Phase 3, item 2)

> Item 2 de la poursuite de roadmap (`docs/REVUE-TRANSVERSALE-ET-ROADMAP.md`
> ligne 198, Phase 3). Trois arbitrages de design soumis à l'utilisateur via
> `AskUserQuestion` (2026-06-19) — réponses ci-dessous. Branche :
> `claude/endgame-decisions-tranchees`.

## Décisions de l'utilisateur (2026-06-19)

| # | Question | Réponse retenue |
|---|----------|-----------------|
| 1 | « Ce qui dort » sous les Ruines (ét. 21+) : personnifié ou muet ? | **Personnifier (entité nommée)** |
| 2 | Barks « Ténébreux » supplémentaires (au-delà de `darkBoss` #559) ? | **Ajouter quelques barks Boucle** |
| 3 | Variantes de Maison : cosmétiques (V1) ou biais de génération (V2) ? | **Ouvrir un biais V2** |

## Périmètre de cette PR (item 2 = trancher + tracer + petit incrément décidé)

Item borné : **tracer** les 3 décisions dans la doc canon + livrer le **petit
incrément barks** (décision 2, faible risque). La décision 3 (biais V2) est un
**gros chantier** (dungeon.js + sim d'équilibrage) : on **ratifie la direction +
garde-fous d'équité + spec**, et on ouvre une **nouvelle ligne de roadmap** pour
l'implémentation (chantier suivant). On n'implémente PAS le biais procédural ici.

## Étapes

### A. Décision 1 — personnifier « le Dormeur » (doc-only)
- Canon : « ce qui dort » = **le Dormeur** — présence magique primordiale,
  antérieure à l'écriture, sur laquelle les Fondateurs ont bâti ; son
  **battement organique** est le « cœur » de l'Avant-Monde (déjà évoqué en
  14 §14 fin « Briser »). La descente ★ N infinie = on s'en **approche sans
  jamais l'atteindre** (plafond de scaling) → la Boucle a une **destination
  écrite** sans cheap final boss, et le mystère tient (on ne le réveille jamais).
- Renvois : 10 §10.2 (fiche 21+), 10 §10.3 (bloc ❓ + point 1), 11 §11.7.3
  (ligne Total 21+), 03 (point ❓ « la Boucle a-t-elle une fin écrite »).
- Cohérence : ne contredit pas le canon (Ruines antérieures aux Fondateurs ;
  Voldemort = dernière serrure ; ✅ plafond de scaling).
- → verify : `grep "Dormeur"` présent dans 10/11/03 ; ❓ → ✅.

### B. Décision 2 — barks Boucle (CODE)
- Nouvel événement `loopEcho` dans `HERO_BARKS` (16 héros) — voix d'un héros
  présent quand un **écho temporel** affleure en Boucle (réutilise le hook
  existant `js/movement.js` ~l.710, `seenEchoes`/`echoLine`).
- Câblage : `movement.js` — après `seenEchoes.add(echo.id)`, `heroBark(speaker,
  'loopEcho', { channel:'explore', once:'loopecho:'+echo.id })`.
- Test : `tests/units.js` §1bis — assertion « 16 héros : loopEcho couvert ».
- Doc : 09 §VII.5 (clore ❓), 11 §11.7.3 (note).
- → verify : `node tests/units.js` vert (compte mis à jour).

### C. Décision 3 — biais Maison V2 (doc + roadmap, impl. différée)
- Ratifier la **direction** en 10 §10.6 (garde-fou l.981) + 10 §10.3 point 3 :
  V2 ouvert, **mais power-neutral strict** (Ch.13) — le biais touche la
  *distribution/saveur* (pondération de types de salle, préférence de skin de
  monstre thématique), **jamais** la difficulté/le butin/les stats. Même grille
  pour les 4 Maisons.
- Spec courte + **nouvelle ligne de roadmap** Phase 3 (« Biais Maison V2 —
  implémentation », 🟡 Basse, dépend d'un sim d'équilibrage neutre).
- → verify : ❓ V2 → « tranché : ouvert, impl. = chantier suivant ».

### D. Roadmap + cache-bump
- `docs/REVUE-TRANSVERSALE-ET-ROADMAP.md` : ligne 198 close (date 2026-06-19),
  nouvelle ligne biais V2, §1.5 trace.
- Code touché (`hero-barks.js`, `movement.js`) → skill `cache-bump`
  (`?v` + `CACHE_VERSION`) + `node tests/smoke.js` + `node tests/units.js`
  + `node tests/pwa-smoke.js`.
- `node tools/check_doc_modules.js` reste vert.

## Suivi
- [x] A — Dormeur tracé (10 §10.2/§10.3, 11 §11.7.3, 03 §3.6)
- [x] B — loopEcho codé (hero-barks.js ×16 + movement.js) + testé (units §1bis)
- [x] C — biais V2 ratifié (10 §10.6 spec + garde-fous) + roadmap line
- [x] D — roadmap close ✅ ; cache-bump (v163) + smoke (226) / units (684) / pwa verts
