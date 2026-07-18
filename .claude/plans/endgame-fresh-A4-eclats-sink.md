# Thème A — Endgame frais · A4 : sink des Éclats (consécration au Sceau)

> Revue systèmes Axe 6 : « Éclats = compteur one-shot, aucun usage récurrent ».
> Décision utilisateur : **option (a)** — compteur de dépense SÉPARÉ (l'accumulé
> reste intact → seuils Briser-le-Cycle / Codex préservés). Reward **cosmétique
> cross-run** (zéro-héritage, précédent P7 Bibliothèque des Maîtrises).

## Constat
- `accumulatedEclats` : **per-run** (reset `startGame` main.js:561, sérialisé),
  +1 par profondeur d'étage + Poches. Lu par : seuil Briser-le-Cycle (≥15),
  gates Codex `eclatLoop` (≥5/≥3…), score Ironman, HUD. **Jamais dépensé.**

## Mécanique (option a)
- Nouveau global **`eclatsSpent`** (state.js, per-run, reset startGame, sérialisé
  save.js). Disponible = `accumulatedEclats − eclatsSpent`.
- Consécration au **Gardien de la Boucle** (`specialAction consecrate_eclats`,
  répétable) : transfère TOUT le disponible → `eclatsSpent = accumulatedEclats`
  et **profil persistant** `eclatsConsecrated += avail` (cross-run).
  `accumulatedEclats` **jamais réduit** → tous les seuils intacts.
- Reward = **titres cosmétiques** (profile.js `computeProfileTitles`, un seul
  palier affiché) : 15 → « Offrant du Sceau », 60 → « Porteur Consacré »,
  200 → « Pilier du Sceau ». Aucun gate de gameplay ne lit `eclatsConsecrated`.

## Fichiers
`state.js` (eclatsSpent) · `main.js` (reset) · `save.js` (sérialisation) ·
`profile.js` (champ + sanitize + `recordConsecratedEclats` + titres) ·
`npcs-b.js` (specialAction Gardien) · `npc-dialog.js` (handler).

## Vérif
- `node tests/units.js` → 1108 ✅ (5 assertions titres consécration, PURES).
- `node tests/smoke.js` npc + save (state round-trip + action Gardien).
- Cache : 6 JS + `CACHE_VERSION`.

## Journal
- **2026-07-16** — A4 livré. Option (a) : `eclatsSpent` séparé, `accumulatedEclats`
  intact ; reward = titres cosmétiques cross-run `eclatsConsecrated`.
