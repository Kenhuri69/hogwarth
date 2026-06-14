# Remplacement des médaillons Olivier & Nathalie

Remplacer les portraits-médaillons des héros `olivier` et `nathalie` par les
deux nouvelles photos fournies.

## Mapping image → héros
- `nathalie`  (Poufsouffle, fille) ← image Poufsouffle souriante (e4cccc2c)
- `chatillon` (Olivier De Châtillon, Serpentard) ← image Serpentard (9efdc27e)

> ⚠️ Correction : il y a DEUX Olivier (`olivier` = de Clairval/Serdaigle,
> `chatillon` = De Châtillon/Serpentard). L'image Serpentard va sur
> `chatillon`. `olivier` (Serdaigle) est restauré à son visuel d'origine.

## Étapes
1. Crop visage carré + resize Lanczos 128×128 → `img/<key>-original.png` → verif: aperçu visage cadré.
2. Transplant de l'anneau existant (r≥50 depuis l'actuel `img/<key>.png`, anneau déjà au bon genre) sur la nouvelle photo masquée ronde → `img/<key>.png` → verif: aperçu médaillon.
3. `node tests/smoke.js` (aucune clé nouvelle) → verif: vert.
4. Pas de changement JS/CSS (mêmes chemins imgSrc) → bump cache PWA NON requis (images non bumpées par ?v).

## Notes
- Les chemins `img/olivier.png` / `img/nathalie.png` sont inchangés (déjà dans CHARACTERS) → aucun câblage à toucher.
- Sprites plein corps `img/players/*` non concernés (le user parle des médaillons).
