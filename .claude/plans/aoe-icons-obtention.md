# Plan — Logos dédiés + obtention des 6 sorts AoE

## Contexte
Les 6 sorts de zone (Glacius Tempête, Fulgur Catena, Lux Aeterna,
Nox Vorax, Diffindo Maxima, Vulnera Sanentur) :
- réutilisent les icônes PNG de leur sort élémentaire de base
  (placeholder, cf. `item-icons.js` SPELL_ICON_REGISTRY) ;
- ne s'obtiennent qu'en **boutique** (grimoires, étages 6-9) — alors
  que tous les autres grimoires droppent aussi en **coffre**.

## Décisions
- **Icônes** : 6 PNG 128×128 dédiés, générés par
  `tools/gen_element_spell_icons.py` (procédural Pillow), motif
  distinct = version « zone » du sort de base.
- **Obtention** : boutique **+** coffres (validé — cohérence avec les
  autres grimoires ; la boutique reste le gold-sink garanti, le coffre
  une voie chanceuse rare). Gating coffre = `minFloor` de la boutique.

## Étapes
1. `tools/gen_element_spell_icons.py` — 6 fonctions
   (`glacius_tempete`, `fulgur_catena`, `lux_aeterna`, `nox_vorax`,
   `diffindo_maxima`, `vulnera_sanentur`) + entrées dans `main()`.
   verify : 6 PNG écrits dans `img/icons/spells/`.
2. `js/item-icons.js` — SPELL_ICON_REGISTRY pointe les 6 sorts vers
   leurs PNG dédiés. verify : plus de référence placeholder.
3. `js/movement.js` — `openChest()` : ajouter les 6 grimoires AoE au
   filtre `booksAvailable` avec gating étage (glacius_tempete /
   diffindo_maxima / vulnera ≥ 6, fulgur_catena ≥ 7, lux_aeterna ≥ 8,
   nox_vorax ≥ 9). verify : drop possible en coffre profond.
4. `node tests/smoke.js` vert (scénario 20 charge tous les PNG du
   registre — les nouveaux doivent exister et se charger).

## Suivi
- [x] Étape 1 — 6 générateurs ajoutés ; 6 PNG 128×128 écrits. Diffindo
      Maxima et Lux Aeterna retravaillés (1re passe peu lisible).
- [x] Étape 2 — SPELL_ICON_REGISTRY pointe les 6 PNG dédiés.
- [x] Étape 3 — `openChest()` : 6 grimoires AoE ajoutés au pool coffre
      (gating ≥ 6/6/6/7/8/9 aligné sur SHOP_CATALOG).
- [x] Étape 4 — `node tests/smoke.js` vert (scénario 20 : 39 sorts
      mappés, tous les PNG chargés).
