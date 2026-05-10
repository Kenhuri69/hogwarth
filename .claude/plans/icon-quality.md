# Plan — Refonte qualité icônes équipement + POC tint CSS

> Branche : `claude/improve-game-images-7OVCy` (post-rebase sur master)
> Décidé après audit visuel via `tools/preview_icons.py items` (atlas 41 PNG).

## Périmètre

### Refonte 6 sprites (Phase 4.5 bis)
1. `amulette` — médaillon ovale + chaîne + cabochon rouge serti
2. `amulette_protection` — médaillon avec sigle (croix/triskèle), chaîne en argent
3. `anneau_argent` — bague 3/4 avec gemme/cabochon, lit comme bague à 24 px
4. `anneau_runique` — idem mais rune violette gravée + lueur subtile
5. `felix` — fiole dorée brillante (pas confondue avec une potion bleue)
6. `ceinture_alchimiste` — ceinture cuir avec 3 boucles à fioles, pas un mur Lego

### POC architecture tint CSS sur l'épée
- Décomposer `gen_sword_gryff` en :
  - `sword_blade_base.png` — lame seule, blanc + ombrage en niveaux d'alpha
  - `sword_hilt_gryff.png` — garde rouge + pommeau or (couleurs fixes)
- CSS classes `.metal-iron / .metal-copper / .metal-bronze / .metal-silver / .metal-gold / .metal-platinum` (custom property `--metal`)
- Resolver `js/item-icons.js` étendu : si `item.tinted = true`, sortir un wrapper 2-calques au lieu d'un `<img>` simple
- Démo : injection d'un `data-metal` sur le sprite épée pour compare visuel des 6 teintes

## Stratégie technique tint

### Approche retenue : `mask-image` CSS

```css
.tinted-blade {
  -webkit-mask: url(.../sword_blade_base.png) center / contain no-repeat;
          mask: url(.../sword_blade_base.png) center / contain no-repeat;
  background-color: var(--metal, #909096);
  image-rendering: pixelated;
}
```

### Risque connu : pixelisation de la mask

Les navigateurs n'appliquent pas toujours `image-rendering: pixelated` à la
mask elle-même → la mask peut être lissée bilinéaire et flouter le pixel art.
**À évaluer** : si ça casse, fallback à **génération PNG côté Python**
(une fonction `tint_blade(color)` qui produit N variants en dur, conservant
le rendu pixel parfait).

## Étapes

1. [ ] Plan validé, commencer par refonte 6 sprites.
2. [ ] Refondre les 6 fonctions dans `gen_icons.py` (lire le code existant pour reproduire le style Phase 4.5).
3. [ ] Lancer `python3 gen_icons.py` puis `python3 tools/preview_icons.py items` → validation visuelle.
4. [ ] POC tint sur épée :
   - Générer `sword_blade_base.png` + `sword_hilt_gryff.png` (gen_icons.py)
   - CSS classes metal-* dans `css/style.css`
   - Resolver étendu `js/item-icons.js`
   - Test in-game : afficher les 6 variantes côte à côte (page de démo simple ou via shell JS)
5. [ ] Smoke test : extension scénario 21 pour valider chargement des nouveaux PNG.
6. [ ] Commit + push.

## Hors périmètre
- Phase 5 char icons (5 PNG 32×32) — pas demandé par l'utilisateur.
- Refonte des autres sprites (déjà OK : chapeaux, capes, bottes, livres, baguettes).
- ICON_STYLE.md formel — peut venir plus tard.
- Audit emoji UTF-8 dans le DOM (mentionné dans icon-generation-engine.md mais hors scope ici).

## Critères de succès

- Atlas avant/après visuellement comparable, les 6 sprites refaits sont lisibles à 24 px.
- POC : 6 variantes de l'épée affichables via `data-metal` ou classe CSS, lisibles, distinctes.
- Smoke test continue de passer.
