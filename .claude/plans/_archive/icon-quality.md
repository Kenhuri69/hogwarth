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

1. [x] Plan validé, commencer par refonte 6 sprites.
2. [x] Refondre les 6 fonctions dans `gen_icons.py` (lire le code existant pour reproduire le style Phase 4.5).
3. [x] Lancer `python3 gen_icons.py` puis `python3 tools/preview_icons.py items` → validation visuelle.
4. [x] POC tint sur épée :
   - Générer `sword_blade_base.png` + `sword_hilt_gryff.png` (gen_icons.py)
   - CSS classes metal-* dans `css/style.css`
   - Resolver étendu `js/item-icons.js`
   - Test in-game : afficher les 6 variantes côte à côte (page de démo simple ou via shell JS)
5. [x] Smoke test : extension scénario 21 pour valider chargement des nouveaux PNG.
6. [x] Commit + push.

## Hors périmètre
- Phase 5 char icons (5 PNG 32×32) — pas demandé par l'utilisateur.
- Refonte des autres sprites (déjà OK : chapeaux, capes, bottes, livres, baguettes).
- ICON_STYLE.md formel — peut venir plus tard.
- Audit emoji UTF-8 dans le DOM (mentionné dans icon-generation-engine.md mais hors scope ici).

## Critères de succès

- Atlas avant/après visuellement comparable, les 6 sprites refaits sont lisibles à 24 px.
- POC : 6 variantes de l'épée affichables via `data-metal` ou classe CSS, lisibles, distinctes.
- Smoke test continue de passer.

---

## Méthode 64×64 → 32×32 (alternative pour sprites complexes)

> Premier exemple : `img/icons/items/bottes_apprenti.png` — PR #51,
> branche `claude/improve-boot-icon-7OVCy`, script `tools/gen_boot_sprite.py`.

### Quand l'utiliser

Sprite final 32×32 trop contraint pour exprimer des détails fins (lacets,
coutures, œillets, dégradés multi-tons). Dessiner d'abord à 64×64 avec des
primitives PIL (polygones, ellipses, lignes) puis downscaler.

### Pourquoi pas Lanczos

Le downscale Lanczos (default PIL haute qualité) génère des **pixels
semi-transparents** sur les bords (anti-aliasing). Or `image-rendering:
pixelated` (déjà appliqué sur `.ui-icon-*` dans `css/style.css:1300+`)
ne corrige pas le halo cuit dans le PNG → résultat flou en jeu.

### Recette retenue

```python
from PIL import Image

PALETTE = [(r,g,b), ...]  # ~9-12 couleurs strictes

def downscale_pixel_art(src_64):
    small = src_64.resize((32, 32), Image.BOX)   # moyenne 2x2, pas Lanczos
    px = small.load()
    for y in range(32):
        for x in range(32):
            r, g, b, a = px[x, y]
            if a < 128:                            # alpha binarisé
                px[x, y] = (0, 0, 0, 0); continue
            # snap sur palette stricte (distance euclidienne RGB)
            best = min(PALETTE, key=lambda c:(c[0]-r)**2+(c[1]-g)**2+(c[2]-b)**2)
            px[x, y] = (*best, 255)
    return small
```

3 ingrédients essentiels :
1. **`Image.BOX`** — moyenne 2×2 prévisible, pas de fenêtre noyau lissé
2. **Alpha binarisé** (seuil 128) — bords nets, zéro halo
3. **Quantization palette stricte** — couleurs cohérentes, pas de fondu sale

### Critère d'acceptation

Capture in-game à 28 px (`.ui-icon-xl` dans la boutique de Madame Malkin)
doit montrer une silhouette lisible, sans halo flou autour du sprite.
Comparer visuellement vs sprite avant via un montage côte-à-côte zoom 8×.
