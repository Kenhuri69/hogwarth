# Variations d'anecdotes — PNJ lore sans quête

## Objectif

Enrichir les dialogues `idleRandom` des PNJ lore (sans quête) avec des
anecdotes couvrant un spectre tonal **rigolo → sombre**, fidèle à la
personnalité de chaque PNJ.

## Périmètre (décision utilisateur)

- **PNJ concernés** : uniquement les PNJ lore — `sir_nicolas`,
  `moine_gras`, `rusard`, `trelawney`.
- **Vendeurs exclus** : `rosmerta`, `mundungus` gardent leur `idle` fixe.
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
