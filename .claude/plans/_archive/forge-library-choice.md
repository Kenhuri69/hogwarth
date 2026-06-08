# LOT C.3a — Forge à deux voies (choix d'upgrade)

> Branche : `claude/forge-library-choice-c3` (depuis `master` à jour).
> Issu de `.claude/plans/game-features-review.md` §3 LOT C (C3, partie Forge).

## Objectif
Donner un **choix de build** à la Forge des Ténèbres : au lieu d'un seul effet
(+stat principale), proposer **2 voies** par item, verrouillées au 1ᵉʳ upgrade.

## Réalisé
- [x] `FORGE_CRIT_PER_LEVEL = 2` (forge.js) — barème de la voie Critique.
- [x] `item.forgePath` ∈ `'power' | 'crit'`, **verrouillé au 1ᵉʳ upgrade**
  (`upgradeItemAtForge(charIdx, slot, path)`). Appel legacy sans `path` → `'power'`.
- [x] `recalculateStats()` (inventory-core.js) applique la voie :
  - `'power'` (défaut/legacy) → +`upgradeLevel` sur la stat principale (inchangé).
  - `'crit'` → +`upgradeLevel × FORGE_CRIT_PER_LEVEL` % dans `critBonus`
    (→ `c.critChance`, plafond 100 %).
- [x] UI `openForge()` : au niveau 0, **deux boutons** (⚔️ +stat / ✯ +Crit) ;
  aux niveaux suivants, bouton unique « Améliorer (voie) » + aperçu de la voie.
  Message de succès mentionnant la voie.
- [x] CSS `.forge-path-choice` / `.forge-preview.forge-choose` (style.css).

## Compatibilité saves
- `forgePath` est une simple propriété de l'item équipé, sérialisée comme
  `upgradeLevel`. **Aucune migration** : un item legacy (upgradeLevel>0, sans
  `forgePath`) est traité comme `'power'` (comportement d'origine conservé).

## Vérif
- [x] `scenarioForgeUpgrade` : T1-T3 inchangés (voie power par défaut) + **T4**
  ajouté (voie crit : ATK inchangée, `critChance` +`FORGE_CRIT_PER_LEVEL`).
- [x] Suite complète **126/126** + `pwa-smoke` (cache v24, offline OK).

## Reporté
- **C3b — Bibliothèque** : axe alternatif par sort (ex. −coût plutôt que
  +power). Même patron que la Forge (`upgradeSpellAtLibrary` + `spellUpgrades`),
  à faire dans un PR dédié pour garder les diffs reviewables.

## Journal
| Date | Note |
|------|------|
| 2026-05-29 | C3a (Forge 2 voies) implémenté et testé. C3b (Biblio) reporté. |
