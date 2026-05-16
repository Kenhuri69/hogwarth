# Variations d'anecdotes — PNJ lore sans quête

## Objectif

Enrichir les dialogues `idleRandom` des PNJ lore (sans quête) avec des
anecdotes couvrant un spectre tonal **rigolo → sombre**, fidèle à la
personnalité de chaque PNJ.

## Périmètre (décision utilisateur)

- **PNJ concernés** : PNJ lore — `sir_nicolas`, `moine_gras`, `rusard`,
  `trelawney` — puis extension aux vendeurs `rosmerta`, `mundungus`.
- **« En fonction du personnage » = le PNJ lui-même** : chaque pool
  d'anecdotes reflète le caractère du PNJ, pas le héros joueur.
- Mécanique inchangée : `idleRandom` (array piochée au hasard par
  `_npcDialogPages`). Aucun changement moteur.

## Étapes

1. Étendre `idleRandom` de `sir_nicolas` (fantôme nostalgique/pompeux :
   du Chasseur Sans Tête comique → son exécution ratée).
   → vérif : 4 anecdotes existantes conservées, pool élargi.
2. Étendre `idleRandom` de `moine_gras` (fantôme jovial/serein : la
   nourriture → la solitude de l'éternité).
3. Étendre `idleRandom` de `rusard` (concierge aigri/Cracmol : pétillant
   de mesquinerie → menace réelle et amertume).
4. Étendre `idleRandom` de `trelawney` (prédictions vagues comiques →
   vraie prophétie glaçante).
   → vérif : tonalité graduée présente dans chaque pool.
5. `node tests/smoke.js` vert → non-régression.

## Suivi

- [x] Étape 1 — sir_nicolas (4 → 9 anecdotes)
- [x] Étape 2 — moine_gras (4 → 9 anecdotes)
- [x] Étape 3 — rusard (4 → 9 anecdotes)
- [x] Étape 4 — trelawney (4 → 9 anecdotes)
- [x] Étape 5 — smoke test vert

## Extension — vendeurs (suite)

`rosmerta` et `mundungus` n'avaient qu'une ligne `idle` fixe. Remplacée
par un pool `idleRandom` de 8 anecdotes graduées rigolo → sombre :
- `rosmerta` : buvette joviale → habitués disparus, sortilège d'Imperium.
- `mundungus` : combines comiques → pillage des morts, abandon coupable.

- [x] Vendeurs — rosmerta + mundungus (1 → 8 anecdotes)
- [x] smoke test vert

## Extension — PNJ à quête (idle de fin de partie)

Une fois leur quête terminée, les PNJ à quête retombaient sur une ligne
`idle` ou `questDone` fixe. Conversion de leur `idle`/`questDone` en pool
`idleRandom` (~7 anecdotes graduées rigolo → sombre). La ligne `questDone`
d'origine est repliée comme entrée du pool, donc aucun changement moteur :
l'état `done` retombe sur la branche idle qui pioche dans `idleRandom`.

PNJ traités (12) : pomfresh, mimi, scamander, lockhart, lupin, hagrid,
mcgonagall, rogue, flitwick, sprout, ollivander, guipure.

Volontairement exclus : `dumbledore` (chaîne d'épreuves câblée à la voix,
PNJ d'intro rarement revisité), `portrait_dumbledore` (déjà varié via
`contextualLore`), `fumseck` (idle/idleSpent liés à l'action spéciale),
`scamander_random` / `hagrid_random` (quêtes farming répétables, pas
d'état `done` permanent).

- [x] 5 PNJ sans questDone (rogue, flitwick, sprout, ollivander, guipure)
- [x] 7 PNJ avec questDone repliée (pomfresh, mimi, scamander, lockhart,
      lupin, hagrid, mcgonagall)
- [x] smoke test vert
