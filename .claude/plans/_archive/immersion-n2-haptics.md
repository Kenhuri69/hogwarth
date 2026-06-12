# Plan — Immersion N2 : retour haptique étendu

**Branche :** `claude/immersion-n2-haptics`
**Origine :** `immersion-suite-4.md` §N2 (optionnel).
**Nature :** 100 % cosmétique (vibration mobile). Bump cache PWA (5 JS).

## Objectif
`haptics.js` ne couvrait que hit/crit/death/levelUp. Étendre aux moments
manquants : alerte PV bas, coffre ouvert, quête accomplie, cast de sort.

## Conception
- `js/haptics.js` : 4 méthodes sobres (`lowHp`/`chest`/`quest`/`cast`) via le
  helper `_buzz` existant (mêmes garde-fous : `navigator.vibrate` absent → no-op,
  prefers-reduced-motion → no-op).
- Call-sites via `HAPTICS_safe` (proxy défensif) :
  - **lowHp** — `ui.js` `updateUI` : front montant (buzz une fois à l'entrée en
    état `.low-hp`, pas en y restant) ;
  - **chest** — `movement-interactions.js` `openChest` ;
  - **quest** — `quests.js` `completeQuest` ;
  - **cast** — `battle-spells.js` `castSpellInBattle` (après déduction du coût).

## Étapes & vérifications
1. [x] Plan.
2. [x] `haptics.js` : 4 méthodes + export.
3. [x] 4 call-sites via `HAPTICS_safe`.
4. [x] `tests/smoke.js` `scenarioHapticsExtended` : présence + appels (front
   montant lowHp, chest, quest, cast).
5. [x] Cache PWA bumpé (v89 : haptics, ui, movement-interactions, quests, battle-spells).
6. [x] DoD : units, smoke, check_cache_versions, pwa-smoke verts ; commit + push ; PR + merge.

## Journal des écarts
### Implémentation (2026-06-09, branche claude/immersion-n2-haptics)
Livré conforme. 4 méthodes sobres + câblage défensif. lowHp en front montant
(aucune variable neuve : lecture de la classe `.low-hp` avant toggle).
`scenarioHapticsExtended` espionne `window.Haptics` (vibrate absent en headless).
CACHE_VERSION v89.
