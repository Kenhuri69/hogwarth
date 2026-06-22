# Prompts Gemini — icônes P1 (Artefacts & Reliquaires 2.0)

> But : régénérer les **13 icônes P1** via LLM image (Gemini / Nano Banana),
> à découper puis encadrer par `tools/icon_factory.py --raster` (halo de rareté
> + cartouche doré + mipmaps réutilisés → cohérence avec le set existant).
> Workflow d'intégration : `tools/raster_src/README.md`.

## Cadre commun (Règle A d'`IMG_STYLE.md`) — à coller en tête de CHAQUE prompt

```
Single game inventory icon, one object only, centered, front view, floating.
Painterly digital concept art, Harry Potter / Magic: The Gathering style,
visible brush strokes, readable material, no photoreal, no cartoon, no pixel art.
Square 512x512. Transparent background (alpha). Object fills ~80% of the frame
with even margin on all four sides. Silhouette must stay readable shrunk to 64px.
NO border, NO frame, NO cartouche, NO rarity glow/halo, NO text, NO watermark,
NO drop shadow on the ground. Just the painted object on empty transparency.
```

> Le halo + le cadre doré sont ajoutés par le pipeline — ne PAS les demander à
> Gemini (sinon double cadre). Si Gemini ne sait pas rendre l'alpha, il sortira
> un damier gris : `dechecker_png.py` le détoure automatiquement.

## Sujets (ligne à ajouter sous le cadre commun, une par icône)

### A — mid-game
- **orbe_flamme** — A glowing crystal sphere orb on a small dark metal stand; molten fire churning inside, ember orange-red, warm inner light, wisps of flame.
- **orbe_givre** — A glowing crystal sphere orb on a small metal stand; a frozen blue core, frost crystals on the glass, pale cyan inner light.
- **cristal_focalisation** — A sharp faceted focusing crystal, teal-cyan, geometric octahedron cut, soft arcane inner glow, clean polished facets.
- **gantelets_combat** — A pair of worn brown leather combat gauntlets with riveted metal studs, sturdy and battle-used.
- **baton_apprenti** — A simple humble apprentice's wooden staff, straight pale-brown wood, a small pale-green knotted tip, modest.
- **cape_funambule** — A flowing acrobat's cloak in golden amber silk, light and billowing, fastened by a small clasp.
- **masque_courage** — A ceremonial face mask in crimson red lacquer with gold-leaf trim; clearly HOLLOW cut-out eye holes (empty dark space visible through them), defined brow and chin, heroic and bold — unmistakably a face mask, not an egg.
- **grimoire_flottant** — A floating open spellbook, deep blue leather cover, gilded page edges, a single glowing eye glyph on the cover, pages gently turning.

### B — endgame (epic)
- **baton_ancestral** — An ancient gnarled wizard staff of dark weathered wood, carved glowing runes along the shaft, crowned by a luminous violet orb.
- **talisman_fondateurs** — An ornate golden founders' medallion amulet on a chain, a central blue gem, a four-pointed star / four-house motif engraved in the gold.
- **masque_rituel** — A dark obsidian ritual mask with a violet sheen; a glowing third-eye glyph on the brow, HOLLOW cut-out eye sockets, arcane and ominous — clearly a face mask.
- **gantelets_aurors** — A pair of polished steel-blue Auror battle gauntlets, articulated plate, silver trim, disciplined and regulation.
- **orbe_runique** — An arcane runic sphere orb, deep violet glass, swirling luminous runes across the surface, a glowing purple core, on a small stand.

## Rappel rareté (pour info — géré par le pipeline, pas par le prompt)
uncommon : orbe_flamme, orbe_givre, baton_apprenti — rare : cristal_focalisation,
gantelets_combat, cape_funambule, masque_courage, grimoire_flottant — epic :
baton_ancestral, talisman_fondateurs, masque_rituel, gantelets_aurors, orbe_runique.
(Aucune legendary en P1 → pas de `sparkles`.)

## Intégration (après réception des PNG)
```bash
# déposer les fichiers dans tools/raster_src/<id>.png puis :
python3 tools/icon_factory.py --raster                  # encadre tous ceux présents
node tests/smoke.js ItemIcons                            # couverture + chargement
```
Aucune modif `ITEM_ICON_NEW_REGISTRY` (chemins identiques), aucun cache-bump
(PNG `img/` servis en stale-while-revalidate).
