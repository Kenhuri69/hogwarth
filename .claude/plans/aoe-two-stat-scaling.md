# Plan — Scaling à deux stats pour les sorts AoE de dégâts

## Contexte
Les 5 sorts AoE offensifs (Glacius Tempête, Fulgur Catena, Lux Aeterna,
Nox Vorax, Diffindo Maxima) calculent leurs dégâts sur **une seule stat** :
`power + mag/2` (ou `mag/3` pour Glacius Tempête). On veut une formule
**à deux stats** : MAG commune + une stat thématique par élément, pour
donner du sens aux stats secondaires et différencier les éléments.

`Vulnera Sanentur` (soin) utilise déjà deux stats (`power + int/4 + end/4`)
— inchangé.

## Décisions (validées avec l'utilisateur)
- **Pas de PM dans les dégâts.** La formule de dégâts ne lit que des stats.
- **Formule** : `base = power + floor(mag/3) + floor(stat2/3)`.
  - `/3` (vs `/2` du mono-cible) : l'AoE frappe plusieurs cibles, le
    scaling par cible est volontairement plus doux. Globalement neutre
    en dégâts par rapport à l'ancien `power + mag/2`.
- **Stat thématique par élément** :

  | Sort | Élément | stat2 |
  |------|---------|-------|
  | Glacius Tempête | glace | INT |
  | Fulgur Catena | foudre | AGI |
  | Lux Aeterna | lumière | INT |
  | Nox Vorax | ténèbres | END |
  | Diffindo Maxima | physique | STR |

- **Coût PM dynamique selon le nombre de cibles** : hors-scope ici.
  L'utilisateur l'a évoqué comme axe de variation possible par sort, pas
  comme exigence — non implémenté pour rester chirurgical.

## Étapes
1. `js/data.js` — ajouter le champ `stat2:"<int|agi|end|str>"` aux 5
   entrées `SPELLS` AoE de dégâts. verify : entrées présentes.
2. `js/battle-spells.js` — helper pur `aoeBaseDamage(spell, char)` près
   des autres formules pures (après `spellDamage`).
3. `js/battle-spells.js` — les 5 handlers (`_spellAoeWave/Field/Chain/
   Drain/Cleave`) utilisent `aoeBaseDamage` au lieu de `power + mag/X`.
4. `js/battle-spells.js` — `spellEffectPreview` : cas `aoe_*` via
   `aoeBaseDamage`.
5. verify final : `node tests/smoke.js` vert.

## Suivi
- [x] Étape 1 — champ `stat2` dans data.js (int/agi/int/end/str)
- [x] Étape 2 — helper `aoeBaseDamage`
- [x] Étape 3 — handlers (5 × `const base = aoeBaseDamage(...)`)
- [x] Étape 4 — `spellEffectPreview` (`aoe_*` via `aoeBaseDamage`)
- [x] Étape 5 — smoke test vert ; `scenarioAoeSpells` renforcé avec
      int/agi/end/str non nuls pour exercer réellement la stat thématique.

## Bilan dégâts (vérif équité)
Globalement neutre vs ancien `power + mag/2`. Avec MAG 16 / stat2 ~12 :
ancien Lux 23 → nouveau 24 ; chaîne 26→27 ; fauchage 26→27. La 2ᵉ stat
compense la baisse du diviseur MAG (/2 → /3). Glacius Tempête utilisait
déjà `mag/3` : +int/3 le fait monter de 17 à 21.
