# Prompts Nano Banana — Artefacts Lot E (icônes d'items)

> 6 prompts pour les artefacts neufs livrés par le plan de remédiation
> ([`artifact-remediation.md`](./artifact-remediation.md), Lots E1 + E2 — PR #568/#570).
> Objectif : remplacer (optionnellement) les icônes du pipeline `icon_factory.py`
> par de l'art raster dédié, plus riche, généré par LLM image (Nano Banana / Gemini).
>
> ⚠️ **Famille « icône d'item » — PAS un sprite de personnage.** N'applique NI la
> Règle A (sprites monstres figure entière, `IMG_STYLE.md` §8) NI la Règle B
> (portraits PNJ §12). Une icône d'item est un **objet isolé**, painterly, sur fond
> transparent, avec un **halo de rareté** — exactement l'esthétique produite par
> `tools/icon_factory.py` (cf. CLAUDE.md « Pipeline d'icônes d'items »).

---

## Spécifications techniques (icônes d'items)

| Champ | Valeur |
|-------|--------|
| Dimensions natives | **1024 × 1024 px** (carré) — source haute déf, à downscaler |
| Format | PNG-32 **RGBA, fond transparent** |
| Sujet | **un seul objet**, centré, isolé (aucune main, aucun personnage, aucun décor) |
| Cadrage | objet occupe **~70 %** du cadre, marge ≥ 12 % sur les 4 côtés |
| Style | painterly / concept-art MTG, coups de pinceau visibles, pas de contour vectoriel |
| Éclairage | clé en **haut-gauche** (45°), ombrage doux, rim-light froid léger |
| Halo de rareté | **glow radial doux** derrière l'objet, teinté par la rareté (voir table) |

### Workflow d'intégration (après génération)

1. Détourer si besoin (fond damier Gemini → `python3 tools/dechecker_png.py src.png out.png`).
2. Downscaler en mipmaps 64/48/32/24/16 (LANCZOS) → `img/icons_new/<id>_<size>.png`.
   (Le pipeline `icon_factory.py` génère déjà ces tailles ; ici on substitue la
   source raster — pas de changement de registre nécessaire, `ITEM_ICON_NEW_REGISTRY`
   pointe déjà sur `<id>_64.png`.)
3. **Bump cache PWA** (skill `cache-bump`) car les PNG servis changent.

### Halo de rareté (couleurs `RARITY_TINTS`, `icon_factory.py`)

| Rareté | RVB halo | Hex approx. |
|--------|----------|-------------|
| common | (180,175,165) | `#b4afa5` |
| **uncommon** | (110,200,140) | `#6ec88c` (vert) |
| rare | (90,150,220) | `#5a96dc` |
| **epic** | (180,110,220) | `#b46edc` (violet) |
| legendary | (235,200,110) | `#ebc86e` (or) |

### Suffixe universel (coller à TOUS les prompts items)

```
single object only, no hands, no character, no background scene,
isolated on fully transparent background, centered, object occupies 70% of frame
with even margin on all sides, painterly digital concept art, MTG illustration quality,
visible brush strokes, no vector outline, soft upper-left key light at 45 degrees,
no text, no watermark, no signature, no border frame, no ground line, no ground shadow,
1024x1024 square
```

---

## Lot E1 — uncommons (halo vert `#6ec88c`)

### `serre_tete_etude` — Serre-tête d'Étude (head, Serdaigle)
**Fichier cible** : `img/icons_new/serre_tete_etude_<size>.png`
**Stats** : MAG+1 INT+1 DEF+1 · **Lore** : circlet d'étudiant studieux, maison Serdaigle.

```
A slender scholar's circlet headband, thin polished bronze band with delicate
engraved runes, a single small faceted sapphire-blue gemstone set at the center
glowing softly, refined and understated academic jewelry, three-quarter view
slightly tilted, palette: warm bronze, deep Ravenclaw blue, pale silver highlights,
soft green uncommon-rarity radial glow behind the object,
single object only, no hands, no character, no background scene,
isolated on fully transparent background, centered, object occupies 70% of frame
with even margin on all sides, painterly digital concept art, MTG illustration quality,
visible brush strokes, no vector outline, soft upper-left key light at 45 degrees,
no text, no watermark, no signature, no border frame, no ground line, no ground shadow,
1024x1024 square
```

### `plastron_renforce` — Plastron Renforcé (body, Poufsouffle)
**Fichier cible** : `img/icons_new/plastron_renforce_<size>.png`
**Stats** : DEF+2 END+1 · **Lore** : pièce de torse en cuir renforcé, robuste et fiable.

```
A sturdy reinforced leather chest piece, a studded jerkin of thick warm-brown
leather with riveted brass plates over the shoulders and sternum, practical and
protective, slight quilted texture, three-quarter front view standing on an
invisible mannequin form, palette: warm tan and saddle brown leather, aged brass
rivets, hints of Hufflepuff gold and black trim, soft green uncommon-rarity radial
glow behind the object,
single object only, no hands, no character, no background scene,
isolated on fully transparent background, centered, object occupies 70% of frame
with even margin on all sides, painterly digital concept art, MTG illustration quality,
visible brush strokes, no vector outline, soft upper-left key light at 45 degrees,
no text, no watermark, no signature, no border frame, no ground line, no ground shadow,
1024x1024 square
```

### `bottes_lestes` — Bottes Lestes (feet)
**Fichier cible** : `img/icons_new/bottes_lestes_<size>.png`
**Stats** : AGI+2 LCK+1 · **Lore** : bottes souples et légères du voyageur agile.

```
A pair of light supple traveler's boots, soft fawn-coloured leather with gentle
folds, slim profile built for speed and agility, thin leather laces, low practical
heel, the two boots arranged in a balanced three-quarter view, palette: light fawn
and honey-brown leather, soft cream laces, muted earthy tones, soft green
uncommon-rarity radial glow behind the object,
single object only, no hands, no character, no background scene,
isolated on fully transparent background, centered, object occupies 70% of frame
with even margin on all sides, painterly digital concept art, MTG illustration quality,
visible brush strokes, no vector outline, soft upper-left key light at 45 degrees,
no text, no watermark, no signature, no border frame, no ground line, no ground shadow,
1024x1024 square
```

### `cape_doublee` — Cape Doublée (cloak)
**Fichier cible** : `img/icons_new/cape_doublee_<size>.png`
**Stats** : DEF+1 AGI+1 END+1 · **Lore** : cape de voyage doublée, chaude et discrète.

```
A doubled lined traveler's cloak, draped and gently folded to reveal a quilted
inner lining of a contrasting muted colour, simple round metal clasp at the collar,
heavy weatherproof outer wool, elegant flowing drape, three-quarter view as if hung
on display, palette: deep slate-grey and forest-green wool outer, warm ochre quilted
lining, pewter clasp, soft green uncommon-rarity radial glow behind the object,
single object only, no hands, no character, no background scene,
isolated on fully transparent background, centered, object occupies 70% of frame
with even margin on all sides, painterly digital concept art, MTG illustration quality,
visible brush strokes, no vector outline, soft upper-left key light at 45 degrees,
no text, no watermark, no signature, no border frame, no ground line, no ground shadow,
1024x1024 square
```

### `ceinture_etudiant` — Ceinture d'Étudiant (belt, Poufsouffle)
**Fichier cible** : `img/icons_new/ceinture_etudiant_<size>.png`
**Stats** : DEF+1 LCK+1 END+1 · **Lore** : ceinture de cuir simple d'écolier, boucle de laiton.

```
A simple brown leather student belt coiled loosely in a relaxed loop, plain
honest craftsmanship, a polished brass rectangular buckle catching the light,
evenly punched holes, modest and well-worn, palette: medium brown leather, warm
brass buckle, subtle Hufflepuff golden tone, soft green uncommon-rarity radial
glow behind the object,
single object only, no hands, no character, no background scene,
isolated on fully transparent background, centered, object occupies 70% of frame
with even margin on all sides, painterly digital concept art, MTG illustration quality,
visible brush strokes, no vector outline, soft upper-left key light at 45 degrees,
no text, no watermark, no signature, no border frame, no ground line, no ground shadow,
1024x1024 square
```

---

## Lot E2 — belt epic (halo violet `#b46edc`)

### `ceinture_aurors` — Ceinturon des Aurors (belt, epic)
**Fichier cible** : `img/icons_new/ceinture_aurors_<size>.png`
**Stats** : DEF+3 END+3 · Crit phys. +4 % · **Lore** : ceinturon d'ordonnance des
Aurors, cuir d'élite + boucle d'or gravée. 1er epic du slot `belt`.

```
A heavy Auror's duty belt of fine dark oxblood leather coiled in a commanding loop,
a large ornate golden buckle engraved with arcane runes glinting at the center,
reinforced double stitching, small gilded studs along the strap, an air of authority
and rank, faint magical shimmer on the runes, palette: deep dark oxblood and near-black
leather, rich antique gold buckle, warm rune glow, dramatic specular highlights on the
gold, soft violet epic-rarity radial glow behind the object,
single object only, no hands, no character, no background scene,
isolated on fully transparent background, centered, object occupies 70% of frame
with even margin on all sides, painterly digital concept art, MTG illustration quality,
visible brush strokes, no vector outline, soft upper-left key light at 45 degrees,
no text, no watermark, no signature, no border frame, no ground line, no ground shadow,
1024x1024 square
```

---

## Notes

- **Pas de regénération obligatoire** : les 6 items disposent déjà d'une icône
  fonctionnelle (3 painterly dédiées via `icon_factory.py` recettes
  `serre_tete_etude`/`bottes_lestes`/`ceinture_etudiant`/`ceinture_aurors`, +
  repli legacy pour `plastron_renforce`/`cape_doublee`). Ces prompts sont une
  **option d'upgrade artistique**, pas un correctif.
- Si un asset raster LLM est adopté, **bumper le cache PWA** (skill `cache-bump`)
  et relancer `node tests/smoke.js scenarioItemIcons` (couverture + chargement).
- Cohérence halo : garder le glow de rareté discret pour ne pas écraser le
  cartouche doré ajouté par le pipeline d'inventaire en aval.
