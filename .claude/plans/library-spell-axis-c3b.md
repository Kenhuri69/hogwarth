# LOT C.3b — Bibliothèque à deux voies (axe alternatif par sort)

> Branche : `claude/library-spell-axis-c3b` (depuis `master` à jour).
> Suite de C3a (`.claude/plans/forge-library-choice.md`) — même patron.
> Issu de `.claude/plans/game-features-review.md` §3 LOT C (C3, partie Bibliothèque).

## Objectif
Donner un **choix de build par sort** à la Bibliothèque Interdite, sur le modèle
de la Forge (C3a). Aujourd'hui chaque niveau applique **simultanément**
power +2 / cost −1 / chance +0.05. On scinde en **2 voies**, verrouillées au
1ᵉʳ upgrade :

| Voie | Effet par niveau | Champ |
|------|------------------|-------|
| ⚡ **Puissance** (`'power'`, défaut/legacy) | `power +2` | — |
| 🎯 **Maîtrise** (`'focus'`) | `cost −1` (plancher 1) + `chance +0.05` (cap 0.50) | — |

`char.spellPaths = { 'Incendio': 'power' | 'focus' }`, miroir de `item.forgePath`.

## Étapes
- [x] `char.spellPaths` lazy-init (library.js `_ensureSpellUpgradesInit` + save.js `_applyState`).
- [x] `upgradeSpellAtLibrary(charIdx, spellName, path)` — voie figée au niveau 0.
  Appel legacy sans `path` → `'power'` (mirroir Forge, garde T2 vert).
- [x] `_spellForCaster` (battle-spells.js) applique la voie :
  - `'power'` → `power +2×lvl`.
  - `'focus'` → `cost −1×lvl` + `chance +0.05×lvl`.
  - **legacy** (lvl>0 sans path enregistré) → formule combinée d'origine.
- [x] UI `openLibrary()` : niveau 0 → deux boutons (⚡/🎯) ; au-delà →
  bouton unique « Amplifier (voie) » + aperçu de la voie verrouillée.
- [x] CSS `.library-path-choice` (style.css).
- [x] PWA : library.js v1→3, battle-spells v4→5, save v16→17, style.css v→25,
  CACHE_VERSION v24→v25. (corrige la dérive precache library.js v1 vs index v2.)
- [x] Smoke `scenarioLibraryUpgrade` : T3 (voie power : cost inchangé),
  T4 (voie focus : cost réduit / power inchangé), T5 (legacy combiné préservé).
  Suite **126/126** + pwa-smoke (cache v25, offline OK).

## Compatibilité saves
`spellPaths` est une propriété du perso, sérialisée via `party:[player,player2]`.
**Aucune migration** : une entrée `spellUpgrades[name] > 0` sans `spellPaths[name]`
= voie « legacy combinée » (comportement d'origine intégral conservé).

## Journal
| Date | Note |
|------|------|
| 2026-05-30 | Plan rédigé. Implémentation en cours. |
| 2026-05-30 | C3b implémenté et testé (126/126 + pwa v25). |
