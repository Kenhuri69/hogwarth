# Pipeline icônes Poudlard & Magie — J1

Direction A (peint MTG) validée dans `Audit Icones.html`. Pipeline procédural
Python — pas d'AI, pas de dessin main.

## Structure

    tools/
      icon_factory.py       compositeur + 7 passes (AO, shading 45°, rim,
                            specular, grain, halo rareté, cartouche)
      shapes.py             formes paramétriques (ring_band, gem_lozenge,
                            bottle_round, stick_shaft, scroll_roll)
      parts/                silhouettes SVG game-icons.net (MIT, Lorc/Delapouite)
        flask.svg
        wizard-staff.svg
        gem-pendant.svg
        book-cover.svg
        hood.svg

    img/icons_new/          sortie : <id>_<size>.png pour size in 16/24/32/48/64

    js/data.js              ITEM_RECIPES = { … } — miroir du dict RECIPES côté Python
    Compare Icones.html     ancien PNG vs nouveau rendu, à 16/24/32/48/64 px

## Install

    pip install pillow cairosvg numpy scipy

Sur macOS, `cairosvg` a besoin du binaire cairo :

    brew install cairo pango

## Run

    python tools/icon_factory.py --list          # liste les recipes
    python tools/icon_factory.py --all           # rend tout
    python tools/icon_factory.py potion_s felix  # rend seulement ceux-là

Sortie : `img/icons_new/<id>_16.png`, `<id>_24.png`, `<id>_32.png`,
`<id>_48.png`, `<id>_64.png` (mipmaps LANCZOS depuis 512 px).

## Recipe schema

Côté Python (`tools/icon_factory.py`) : dataclass `Recipe`.
Côté JS (`js/data.js`) : `ICON_RECIPES = { id: { … } }` — même schéma JSON.

    {
      silhouette: { kind:"svg",   file:"flask.svg" }
              // ou { kind:"shape", name:"ring_band", params:{...} }
      fills:    { region: "#rrggbb", ... },     // 1 couleur par data-region
      accents:  [
        { kind:"liquid",          region:"body", color:"#d94444",
          level:0.72, meniscus:true, glow:false },
        { kind:"bubbles",         region:"body", color:"#ffe8a8", count:6 },
        { kind:"runes",           region:"shaft", color:"#ebd796", count:5 },
        { kind:"orb_glow",        region:"gem",  color:"#c8e6ff" },
        { kind:"gem_facet_shine", region:"gem",  color:"#dcebff" },
        { kind:"emboss",          region:"cover", color:"#1e2e4c" }
      ],
      rarity:     "common" | "uncommon" | "rare" | "epic" | "legendary",
      material:   "matte" | "glass" | "metal" | "leather" | "wood",
      lightAngle: 45,                   // optionnel, défaut 45°
      sparkles:   false                 // legendary bonus dust
    }

## 5 items test (J1)

| id                  | rareté    | silhouette                    |
|---------------------|-----------|-------------------------------|
| potion_s            | common    | flask.svg                     |
| felix               | legendary | flask.svg (+ sparkles + halo) |
| wand2               | rare      | wizard-staff.svg              |
| anneau_runique      | rare      | shape `ring_band(bezel,gem)`  |
| livre_sortileges    | common    | book-cover.svg                |

Validation : ouvrir `Compare Icones.html` après run, vérifier que le rendu
tient à 16 px (cartouche lisible, sujet identifiable) et que le grain ne
mange pas la silhouette à 24 px.

## Suite (J2+) — mapping des 45 items restants

Une fois la direction validée :

1. Ajouter les SVG bases manquants dans `tools/parts/`
   (sword-blade, broom, hat-pointy, cape, amulet, etc.)
2. Étendre `tools/shapes.py` avec les primitives qui reviennent
   (`crown_band`, `cup_chalice`, …)
3. Remplir `ICON_RECIPES` pour les 45 items
4. Lancer `python tools/icon_factory.py --all`
5. Brancher `js/icons.js` pour pointer sur `img/icons_new/<id>_<size>.png`
   selon la taille d'affichage (mipmaps déjà découpés)

## Notes de licence

Les SVG dans `tools/parts/` sont des silhouettes redessinées dans le style
game-icons.net (MIT, Lorc / Delapouite). Conserver l'attribution dans le
crédits du jeu si publication.
