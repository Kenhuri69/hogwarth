# Défi Quotidien seedé — plan multi-étapes

> Revue UX Axe 3 (D1) : « HoF non comparable (seeds ≠) ; un défi à seed du jour
> = le levier social/rétention le plus fort ». Chantier **effort L** → livré par
> étapes. Prérequis technique : génération de donjon **déterministe**, qui
> n'existait pas (tout en `Math.random`).

## Étape 1 — Fondation : génération déterministe ✅ (2026-07-16)
- **PRNG seedé** dans `dungeon-scaling.js` (chargé avant dungeon.js) :
  `_mulberry32`, `_hashSeed` (FNV-1a), `dailySeedString(y,m,d)`, `setWorldSeed`,
  `clearWorldSeed`, **`dgRand()`** = tirage de génération (repli `Math.random`
  par défaut → **comportement identique hors défi**).
- **Threading** `Math.random → dgRand` dans tout le chemin de génération :
  `dungeon.js` (31), `dungeon-spawning.js` (6), `dungeon-scaling.js` (3 :
  weightedPick/gold/shiny), `floor-events.js` (2 : déclenche/tire l'événement
  d'étage — **cause identifiée** du 1ᵉʳ échec de déterminisme). Les rumeurs de
  dialogue (npcs-helpers) et le flavor de salle (room-flavor) sont du RUNTIME,
  hors génération → laissés non-seedés. Le **combat** (battle.js) reste en
  `Math.random` (RNG live — le défi partage le donjon, pas les jets de combat).
- **Preuve** : test smoke `scenarioDailySeedDeterminism` — même seed →
  donjon+spawns **identiques** ; seed différente → différents ; `clearWorldSeed`
  → repli OK. Units : mulberry32/hash/dailySeed + déterminisme de `dgRand`.

## Étape 2 — Mode Défi Quotidien (à venir)
- Seed du jour : `setWorldSeed(dailySeedString(UTC))` **par étage**
  (`hash(dateSeed + ':' + floor)`) au début de `generateDungeon` en mode défi,
  pour que chaque étage soit reproductible indépendamment de la consommation RNG.
- Flag de mode (`dailyChallengeMode`), point d'entrée au hub de démarrage,
  run façon Ironman (permadeath + score), verrou anti-rejeu (1 tentative/jour).

## Étape 3 — Hall of Fame « Défi du jour »
- Colonne/filtre `daily_seed` dans le HoF → classement comparable sur seed commune.
- UI dédiée (onglet « Défi du jour »).

## Journal
- **2026-07-16** — Étape 1 livrée : génération déterministe (dgRand + threading),
  prouvée par test bout-en-bout. Zéro changement de comportement hors défi.
