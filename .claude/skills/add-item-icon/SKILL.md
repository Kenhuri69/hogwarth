---
name: add-item-icon
description: Générer ou retoucher l'icône painterly d'un item d'inventaire/équipement du jeu Poudlard & Magie (potion, arme, armure, anneau, livre de sorts…) via le pipeline Python tools/icon_factory.py. Utiliser dès qu'un item neuf a besoin de son visuel PNG multi-tailles, ou pour regénérer/améliorer une icône existante (« l'icône de l'amulette est moche, refais-la », « génère le PNG de la nouvelle épée légendaire »). Couvre le part SVG, la recette RECIPES, les mipmaps et l'enregistrement dans ITEM_ICON_NEW_REGISTRY. Ne PAS utiliser pour les sprites de monstres (skill add-monster), les portraits de PNJ, ni les icônes de sorts/statuts (scripts gen_*_icons.py dédiés).
---

# Ajouter une icône d'item

Les items n'utilisent **pas** d'emoji en runtime (le champ `icon` de `data.js`
n'est qu'un fallback texte). Le rendu réel passe par `getItemIconHtml(item, size)`
qui résout dans l'ordre :
1. `ITEM_ICON_NEW_REGISTRY[id]` → PNG painterly `img/icons_new/<id>_<16|24|32|48|64>.png`
2. `ITEM_ICON_REGISTRY[id]` → PNG legacy `img/icons/items/<id>.png`
3. fallback emoji `item.icon`

Objectif de cette skill : produire le **niveau 1** (painterly).

## Prérequis
```bash
pip install pillow cairosvg numpy scipy
# macOS : brew install cairo pango
```

## Étapes

### 1. Choisir (ou créer) le part SVG de base
Les silhouettes vivent dans `tools/parts/` (19 dispo : `flask.svg`,
`wizard-staff.svg`, `gem-pendant.svg`, `book-cover.svg`, `hood.svg`,
`hat-pointy.svg`, `tiara.svg`, `feather.svg`, `glove.svg`, `belt.svg`,
`boot.svg`, `broom.svg`, `chalice.svg`, `sword.svg`, `horn-pegasus.svg`,
`hourglass.svg`, `gem-octahedron.svg`, `choco-bar.svg`, `mandragore.svg`).

Inspecter les régions colorables d'un part :
```bash
grep -oE 'data-region="[^"]+"' tools/parts/<file>.svg
```
Si aucun part ne convient → en créer un : silhouette mono-couleur `#000000`
sur viewBox `0 0 512 512`, 2-5 régions nommées `data-region="<nom>"` max.
Alternative sans SVG : forme paramétrique de `tools/shapes.py`
(`ring_band`, `gem_lozenge`, `bottle_round`, `stick_shaft`, `scroll_roll`).

### 2. Écrire la recette dans `RECIPES` (`tools/icon_factory.py`)
S'inspirer de recettes existantes (`sword_gryff`, `coupe_poufsouffle`,
`brassard_lion`, `potion_s`, `felix`). Schéma :
```python
{
  "id": "mon_item",
  "name": "Nom",
  "rarity":   "common|uncommon|rare|epic|legendary",   # pilote le halo
  "material": "matte|glass|metal|leather|wood",
  "silhouette": {"kind": "svg", "file": "flask.svg"},
  #         ou  {"kind": "shape", "name": "ring_band", "params": {...}},
  "fills":   {"body": (217, 68, 68)},                   # 1 couleur RGB / data-region
  "accents": [
    {"kind": "liquid", "region": "body", "color": (217,68,68), "level": 0.72, "meniscus": True},
    {"kind": "bubbles", "region": "body", "color": (255,232,168), "count": 6},
    # autres : runes, orb_glow, gem_facet_shine, emboss, symbol
  ],
  "sparkles": False,    # True = poussière legendary
}
```

**Emblème de Maison incrusté** — accent `symbol` :
```python
{"kind": "symbol", "region": "<region>", "shape": "lion|snake|eagle|badger",
 "color": (211,166,37), "size": 120}
```
Glyphs dispo dans `_SYMBOL_PATHS` (`icon_factory.py:827+`) : lion, snake,
eagle, badger, star, moon, flame, drop, lightning, skull, eye, bat, fang,
cross, leaf, deer, wand.

**Palettes Maison standard** (réutiliser) :
| Maison | Dominante | Accent | Emblème |
|--------|-----------|--------|---------|
| Gryffondor | `(116,0,1)` | `(211,166,37)` or | `lion` |
| Serpentard | `(26,71,42)` | `(170,170,170)` argent | `snake` |
| Serdaigle | `(14,26,64)` | `(148,107,45)` bronze | `eagle` |
| Poufsouffle | `(55,46,41)` | `(240,199,94)` or | `badger` |

### 3. Générer les PNG
```bash
python3 tools/icon_factory.py mon_item        # un ou plusieurs id
python3 tools/icon_factory.py --list          # lister les recettes
python3 tools/icon_factory.py --all           # tout regénérer
```
Produit 5 PNG : `img/icons_new/mon_item_{16,24,32,48,64}.png` (mipmaps
LANCZOS depuis 512 px ; 7 passes painterly : AO, shading 45°, rim-light,
specular, grain, halo rareté, cartouche dorée).

### 4. Enregistrer dans le registre JS
Ajouter dans `js/item-icons.js` → `ITEM_ICON_NEW_REGISTRY`, en pointant sur
le `_64.png` (le moteur choisit la mipmap selon la taille demandée) :
```js
mon_item: 'img/icons_new/mon_item_64.png',
```

### 5. Vérifier
- Ouvrir `Compare Icones.html` : le rendu doit tenir à **16 px** (cartouche
  lisible, sujet identifiable) et le grain ne doit pas manger la silhouette à 24 px.
- Lancer le jeu, item visible dans l'inventaire au bon visuel.
- `node tests/smoke.js` (non-régression, guidelines §7).

## Référence
`tools/README.md` + `tools/icon_factory.py` (recettes existantes) +
`.claude/plans/icon-generation-engine.md`. Le miroir JS inerte des recettes
est `js/data-icon-recipes.js` (`ICON_RECIPES`) — le tenir cohérent si on
documente la recette côté JS, sans impact runtime.
