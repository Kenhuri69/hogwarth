# Plan — Aligner Ch. 11 §11.10 « Briser le Cycle » sur le code livré

> Suite de la réconciliation doc↔code (roadmap Phase 1, item « Aligner Ch. 11 »).
> Le chapitre a déjà un bandeau « Statut réel » en tête (2026-06-13) mais
> **§11.10 est encore rédigé comme « 💡 Proposition / ❓ à valider »** alors que
> `js/break-cycle.js` le livre intégralement. Doc-only → pas de cache bump.

## Audit code (source de vérité — vérifié)

- `js/break-cycle.js` : 4 jalons. I `echo_scene_sceau` (UNE scène, via `seenEchoes`,
  ét. 14+) · II `accumulatedEclats ≥ BRISER_ECLAT_SEUIL = 15` · III boss
  `reflet_mythe` « Le Reflet du Mythe » (ét. réel 21+) · IV modale choix
  (`confirmBreakCycle`/`declineBreakCycle`). Résolveur PUR `briserCycleJalons`
  / `briserCycleProgress` (pas `brokenCycleProgress`). Flag persistant unique
  `cycleBroken`. Cinématique 3 pages (patron intro.js), musique
  `playEndingTheme`/`ending_break`, art `img/scenes/ending_break_cycle.jpg`,
  Codex `cycle_brise`, profil titre « Briseur de Cycle ★N ».
- `js/monsters.js` : `reflet_mythe` présent (l. 2059). `js/codex.js` : entrée
  `cycle_brise` (unlock/revealed `cycleBroken`). `accumulatedEclats` +1 par
  étage de Boucle le plus profond franchi (`movement-floors.js:215`).
- **`temporalEchoSeen` n'existe PAS dans le code** → la condition « 4
  écho-scellements / `temporalEchoSeen` » de §11.10.2 est une extension Phase 2
  non livrée : à laisser en 💡, le SHIPPÉ est `echo_scene_sceau` (1 scène).

## Corrections (chirurgicales, docs/histoire/11-mondes-paralleles.md)

1. [x] Ligne 3 : statut « 🟩 proposition de référence » → refléter que les
   **systèmes** (Boucle/MP/Briser le Cycle) sont livrés, habillage narratif 💡.
2. [x] §11.10 ouverture (518-521) : « 💡 Proposition / ❓ à valider — La voici
   proposée » → ✅ **livré** (`break-cycle.js`), descriptif ; garder l'argument
   de compatibilité canon.
3. [x] §11.10.2 : titre `brokenCycleProgress` → `briserCycleProgress` (dérivé,
   PUR) ; jalon I = `echo_scene_sceau` shippé (4-écho/`temporalEchoSeen` = 💡
   Phase 2) ; jalon II seuil = `15` (`BRISER_ECLAT_SEUIL`) ; jalon III ✅
   `reflet_mythe` (plus ❓ « ce qui dort »).
4. [x] §11.10.3 : marquer outcomes ✅ ; citer Codex `cycle_brise`, profil titre,
   cinématique 3 pages, musique, art.
5. [x] Bloc « ❓ À arbitrer » (569-572) : (a) boss personnifié ✅ `reflet_mythe`
   (b) cinématique = patron pages d'intro.js ✅ (c) seuil = 15 ✅ → ✅ Tranché.

## Roadmap

6. [x] `docs/REVUE-TRANSVERSALE-ET-ROADMAP.md` : item Phase 1 « Aligner Ch. 11 »
   — volet « Briser le Cycle = ✅ » fait ; « définir la Boucle » (authorial,
   cross-link 11↔06) reste ouvert. Matrice 11↔14 → ✅.

## Vérif

- [x] `node tools/check_doc_modules.js` reste vert (ne touche pas l'index).
- Doc-only → pas de cache bump, smoke non requis (guidelines §7/§8).

## Branche

`claude/align-ch11-briser-cycle` (depuis master à jour, après merge #519).
