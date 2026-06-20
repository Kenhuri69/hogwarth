# Sorts & Magie 2.0 — Lot P4 « Corrompus & Boucle »

> Plan vivant (guidelines §5). Pendant du master plan
> [`spells-magic-system.md`](./spells-magic-system.md) §2.7 (P4).
> P0→P3 **livrés** ; ce lot ouvre la 2ᵉ passe (corruption / Boucle), la plus
> sensible à l'équilibrage (sim obligatoire pour le contenu offensif).

## Découpage de P4 (multi-PR, réviewable)

P4 « full » (cœur corruption + 4 sorts corrompus de Maison + 3 temporels + 5
légendaires) est bien plus gros que P2/P3. On le tranche pour garder chaque PR
lisible et laisser `tools/sim-difficulty.js` valider le contenu offensif
incrémentalement :

| Sous-lot | Contenu | Sensibilité sim |
|----------|---------|-----------------|
| **P4a** (ce PR) | **Cœur corruption** : `corruptionLevel` (sérialisé) + mécanique `corruptionRisk`/contrecoup (`_applyCorruptionBacklash`) + **première évolution corrompue réelle** (Sanguini → Sanguini Vorace, condition `corruption ≥ 2` déjà stubée `data.js:692`). **Power-neutre** côté combat existant. | Aucune (rien de neuf ne scale les dégâts) |
| P4b | 4 sorts corrompus de Maison (§1.4.C : Flamme Dévorante / Venin du Cachot / Savoir Interdit / Fardeau Partagé) + contrecoups auto-dégât/statut + gate d'acquisition Boucle. | **Forte → sim obligatoire** |
| P4c | Sorts temporels / échos (§1.4.B : Tempus Echo, Reliquae Temporis, Écho Fantôme — réemploi `buildEcho`). | Moyenne |
| P4d | Sorts légendaires de quête (§1.7). | Moyenne→forte |
| P5 | Passe d'équilibrage final + Codex sorts. | Sim complet |

---

## P4a — Cœur corruption (livraison de ce PR)

### Principe
Rendre **réelle** la branche `corruption` déjà câblée dans
`_spellEvolveConditionMet` (`data.js:692`) sans introduire de nouveau power creep :

1. **`corruptionLevel`** (compteur persistant du groupe), 0 par défaut, sérialisé
   façon `accumulatedEclats`. **Monte uniquement en Boucle** (`post-victoire, étages 11+`).
2. **Contrecoup (`corruptionRisk` + `backlash`)** : à chaque sort porteur d'un
   `corruptionRisk`, en Boucle, un jet `Math.random() < risk` déclenche un
   contrecoup configurable (❓5 : `corruption` = +1 compteur · `selfburn` = statut
   · `selfdmg` = % PV max). **P4a n'utilise que `corruption`** (power-neutre) ;
   `selfburn`/`selfdmg` sont implémentés mais réservés aux sorts corrompus
   offensifs du P4b.
3. **Première évolution corrompue réelle** : Sanguini → **Sanguini Vorace**
   (lifesteal renforcé) quand `corruptionLevel ≥ 2`. Réversible (resolveSpellForm,
   non destructif) comme toutes les évolutions P3. Naturellement gated Boucle
   (le compteur n'accroît qu'en Boucle).

### Faithfulness / écarts
- **Aucun gate de modale `tier:"corrompu"`** ajouté en P4a : il régresserait les
  sorts corrompus déjà appris (Avada, Fiendfyre, Sectumsempra Imperius, taught
  via level-up/palier). L'unique nouvelle forme corrompue (Sanguini Vorace) est
  gated par sa condition d'évolution (`corruption ≥ 2`), pas par la modale. Le
  gate d'acquisition Boucle arrivera en P4b avec les sorts **directement
  apprenables** corrompus.
- **Power-neutre** : les sorts existants reçoivent un `corruptionRisk` dont le
  contrecoup est `corruption` (bump de compteur uniquement) — zéro impact sur les
  dégâts/coûts → pas de sim requise pour ce sous-lot. Le risk/reward (escalade du
  risque + power de corruption) arrive en P4b avec sim.
- **Pas de variable combat-scoped** : `corruptionLevel` est persistant → aucun
  reset `startBattle`.

### Étapes & vérifs
1. `state.js` — `let corruptionLevel = 0;` (près d'`accumulatedEclats`).
   → verify : déclaré, défaut 0.
2. `save.js` — sérialise/restaure `corruptionLevel` (back-compat 0).
   → verify : round-trip dans `scenarioSpellsP4`.
3. `data.js` —
   - entrée **Sanguini Vorace** + `Sanguini.evolvesTo/evolveCondition`.
   - `corruptionRisk` + `backlash:"corruption"` sur Avada / Fiendfyre /
     Sectumsempra Imperius / Sanguini Vorace.
   - helper PUR `corruptionBacklashKind(spell)` (défaut par tier) + `SPELL_META`
     de Sanguini Vorace.
   → verify : `tests/units.js` (évolution corruption, backlashKind).
4. `battle-spells.js` — `_applyCorruptionBacklash(spell, char)` (gate Boucle +
   rng + application), appelé dans `castSpellInBattle` après le handler ; FX
   défensifs.
   → verify : `scenarioSpellsP4` (proc en Boucle, no-op hors Boucle).
5. Tests : `testSpellP4` (units) + `scenarioSpellsP4` (smoke) enregistré.
6. cache-bump (data.js, battle-spells.js, state.js, save.js) + check_cache_versions.

---

## Journal
- 2026-06-20 : plan P4a rédigé après audit du code (stub `corruption`
  `data.js:692` confirmé, patterns `accumulatedEclats`/`resolveSpellForm`
  relevés).
- 2026-06-20 (impl.) — **P4a livré**. Écarts vs plan initial :
  - **Renommé `corruptionLevel` → `corruptionStacks`** (state.js) : collision de
    scope global avec le helper PUR d'ambiance `corruptionLevel(floor, va)`
    (floor-ambiance.js:180, déjà au MANIFEST loader). La branche `corruption` de
    `_spellEvolveConditionMet` (qui lisait `corruptionLevel` via `typeof … ===
    'number'`) était de fait **toujours fausse** (la fonction n'est jamais un
    nombre) → repointée sur `corruptionStacks`.
  - **Gate Boucle = `victoryAchieved && currentFloor >= 11`** (PAS
    `effectiveFloor() >= 11` : `effectiveFloor` REMAPPE les étages de Boucle
    vers 1-10, donc 12→2, inadapté à un seuil de profondeur).
  - `corruptionStacks` ajouté au MANIFEST loader (kind obj, comme
    `accumulatedEclats`).
  - **Vérif** : `tests/units.js` **825 assertions** (section P4a : évolution
    corruption réversible, `corruptionBacklashKind`) ; `scenarioSpellsP4`
    (4 sous-tests : no-op hors Boucle, montée en Boucle, évolution Sanguini
    Vorace + réversibilité, round-trip save) ; smoke complet vert ; cache PWA
    bumpé.
