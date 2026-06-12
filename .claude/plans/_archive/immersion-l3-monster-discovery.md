# Plan — Immersion L3 : toast de première découverte de monstre

**Branche :** `claude/immersion-l3-monster-discovery`
**Origine :** `immersion-suite-4.md` §L3 (optionnel).
**Nature :** 100 % cosmétique, purement textuel (`addMsg`). Bump cache PWA (battle.js).

## Objectif
La 1re rencontre d'une espèce passait inaperçue. Émettre un toast discret
« 🔎 Nouvelle créature cataloguée : <nom> » à la première rencontre.

## Conception
- `js/battle.js` (`startBattle`) : AVANT `seenMonsters.add`, parcourir le groupe ;
  pour chaque `id` non vu (et non duelliste), émettre un `addMsg(..., 'good')`.
  Déduplication intra-groupe via un Set local. Réutilise `seenMonsters` (aucun
  état neuf). Purement textuel → non gardé reduced-motion (cohérent I1).

## Étapes & vérifications
1. [x] Plan.
2. [x] `battle.js` : toast avant `seenMonsters.add`.
3. [x] `tests/smoke.js` `scenarioMonsterDiscovery` : 1re rencontre → toast + seen ;
   2e rencontre même espèce → pas de toast.
4. [x] Cache PWA bumpé (v88 : battle.js).
5. [x] DoD : units, smoke, check_cache_versions, pwa-smoke verts ; commit + push ; PR + merge.

## Journal des écarts
### Implémentation (2026-06-09, branche claude/immersion-l3-monster-discovery)
Livré conforme. Toast `🔎` une fois par espèce neuve (dédup intra-groupe),
avant `seenMonsters.add`. `scenarioMonsterDiscovery` (combat.js) couvre 1re/2e
rencontre. CACHE_VERSION v88, battle.js 28→29.
