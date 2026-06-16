# Prompts Nano Banana — sprites des boss de Boucle

> Sprites de combat des boss endgame de la Boucle Ténébreuse.
> — 512×512 RGBA, fond transparent. Style : [`IMG_STYLE.md`](../../IMG_STYLE.md)
> Règle A + cadrage figure entière (§1-§10).
>
> **Lot 1 — `basilic_ancestral`, `moremplis`** (PR #510, #513, 2026-06-13) :
> PNG livrés, **`imgSrc` déjà câblé** dans `js/monsters.js` — le renderer
> retombe sur l'emoji tant que le fichier est absent (aucun chemin mort).
>
> **Lot 2 — les 4 Gardiens des Chambres des Fondateurs**
> (`gardien_lion`, `gardien_serpent`, `gardien_aigle`, `gardien_blaireau`,
> PR #560, Boucle ét. 17+) : prompts ci-dessous (§3-§6). **PNG livrés
> (2026-06-16)** — détourés via `process_monster_png.py`, `imgSrc` câblé
> dans `js/monsters.js` (78 PNG raster validés RGBA par smoke scénario 5).

## Pipeline de dépôt (une fois l'image générée)

```bash
# rembg + modèle LOURD téléchargés au 1er run (chemin PNG uniquement) :
python3 -c "import rembg" 2>/dev/null || python3 -m pip install rembg
python3 tools/process_monster_png.py --src /chemin/source.png --id basilic_ancestral --dry-run
# vérifier /tmp/basilic_ancestral_check.png puis relancer sans --dry-run
python3 tools/process_monster_png.py --src /chemin/source.png --id moremplis --dry-run
```
`img/` est servi en Stale-While-Revalidate (non précaché) → **aucun `?v` à
bumper** pour déposer le PNG seul.

**Câblage `imgSrc` (gardiens du Lot 2 uniquement)** — une fois le PNG d'un
gardien déposé et vérifié, ajouter dans son entrée `js/monsters.js`
(après `name:`/`icon:`) la ligne :

```js
imgSrc:   "img/monsters/gardien_lion.png",   // resp. _serpent / _aigle / _blaireau
```

`js/monsters.js` étant un asset servi → **dérouler le skill `cache-bump`**
(bump `?v` + `CACHE_VERSION`) dans le même commit que le câblage, puis
`node tests/smoke.js`. (Le Lot 1 — basilic/moremplis — est déjà câblé.)

---

## 1. `basilic_ancestral` — Basilic Ancestral

- **Catégorie** : `bête` → template `IMG_STYLE.md` §8.1, palette terre chaude.
- **Lore** : le premier des serpents, Roi des Serpents ancestral, réveillé au
  fond des Ruines Anciennes. Écailles antiques, deux yeux d'or pétrifiants.
- **Mécanique** : brute écrasante (constriction), regard pétrifiant, venin.
- **Faiblesse** lumière ; **résiste** physique/ténèbres → look massif, écaillé,
  ancien, légèrement luminescent aux yeux.

```
Concept art digital painting of a colossal ancient basilisk, the primordial King of Serpents, Harry Potter universe,
wide shot, distant framing, full coiled serpent body head to tail in frame, complete silhouette, no cropping,
subject occupies 70-80% of frame, ample empty margin on all four sides,
a massive scaled serpent rearing up from coiled rings, raised head facing the viewer in a menacing arrest pose,
two glowing molten-gold petrifying eyes, parted jaws revealing curved venom fangs, ancient cracked emerald-bronze scales,
faint runic stone dust clinging to the lower coils, soft directional light from upper-left,
warm earth palette (deep verdigris green, bronze, gold highlights), subtle gold eye-glow,
fully transparent background, no ground shadow, no border,
512x512, painterly brush strokes, no outline, MTG illustration quality,
no text, no watermark, no signature, no border frame, no ground line
```

> Si la figure est coupée → ajouter : `zoom out, show full coiled body including head and tail tip`.

## 2. `moremplis` — Moremplis (Lethifold)

- **Catégorie** : `être magique` → template `IMG_STYLE.md` §8.3 (éthéré),
  **palette adaptée** : noir d'encre au lieu d'argent-bleu (linceul d'ombre).
- **Lore** : Lethifold canon (XXXXX) — un linceul vivant sans visage qui
  étouffe sa proie et la digère. Repoussé par la lumière d'un Patronus.
- **Mécanique** : prédateur d'ombre caster/drain, peur, dissipe.
- **Faiblesse** lumière ; **résiste** ténèbres → masse d'ombre informe, bords
  qui se dissolvent en fumée, faible lueur froide interne.

```
Concept art digital painting of a Lethifold, a living shroud of darkness, Harry Potter universe,
wide shot, distant framing, the whole undulating cloak-creature in frame, complete silhouette, no cropping,
subject occupies 65-75% of frame, ample empty margin on all sides,
a faceless rippling sheet of black shadow rearing and unfurling like a cloak about to envelop the viewer,
no eyes no mouth, edges fraying and dissolving into thin smoke, a faint cold violet inner glow seeping between folds,
translucent fraying edges — preserve translucent and misty areas in alpha,
soft volumetric light from upper-left catching the upper rim, no harsh shadows,
ink-black palette with faint cold violet and cyan inner light, ethereal painterly brush strokes, MTG illustration quality,
fully transparent background, no ground shadow, no border,
512x512, complete figure visible,
no text, no watermark, no signature, no border frame, no ground line
```

> Si la masse remplit tout le cadre → ajouter : `zoom out, smaller subject, more empty margin around the shape`.

---

# Lot 2 — Gardiens des Chambres des Fondateurs

> 4 constructs gardiens, un par Fondateur/Maison, thématisés par élément.
> Catégorie commune `être magique` ; ce ne sont **pas** des fantômes éthérés
> mais des **golems/armures animés** massifs gardant le seuil d'une Chambre.
> Garder un **langage de forme commun** (silhouette de gardien colossal,
> emblème de Maison lumineux au torse) pour qu'ils se lisent comme une fratrie,
> tout en divergeant par élément/palette. Posture : sentinelle dressée, en
> garde devant une porte invisible (pas de décor — fond transparent).

## 3. `gardien_lion` — Gardien de la Chambre du Lion (Gryffondor · feu)

- **Lore** : armure de braise façonnée par Godric, ne recule jamais.
- **Mécanique** : brute (Broyer auto), charge ardente, `burn`.
- **Résiste** feu/disarm ; **faible** glace → métal chauffé à blanc, braises,
  crinière de flammes. Palette Gryffondor rouge `(116,0,1)` + or `(211,166,37)`.

```
Concept art digital painting of a colossal animated guardian armor wreathed in living embers, Harry Potter universe,
wide shot, distant framing, full standing figure head to feet in frame, complete silhouette, no cropping,
subject occupies 75-80% of frame, ample empty margin on all four sides,
a towering knight-construct of crimson and gold plate forged of glowing molten metal, standing sentinel in a menacing guard stance,
a flowing mane of fire rising from its helm like a lion, a glowing golden lion emblem blazing on its breastplate,
cracks of white-hot ember light seeping between the armor plates, ember sparks drifting upward,
soft directional light from upper-left, deep crimson and gold palette with white-hot ember glow,
fully transparent background, no ground shadow, no border,
512x512, painterly brush strokes, no outline, MTG illustration quality,
no text, no watermark, no signature, no border frame, no ground line
```

## 4. `gardien_serpent` — Gardien de la Chambre du Serpent (Serpentard · ténèbres)

- **Lore** : ombre lovée scellée par Salazar, frappe d'abord.
- **Mécanique** : caster rusé, `poison`, morsure drainante, affaiblit.
- **Résiste** ténèbres/disarm ; **faible** lumière → masse sombre lovée, écailles
  d'obsidienne, lueur verte. Palette Serpentard vert `(26,71,42)` + argent.

```
Concept art digital painting of a serpentine shadow guardian coiled before a hidden door, Harry Potter universe,
wide shot, distant framing, the whole reared coiled construct in frame, complete silhouette, no cropping,
subject occupies 70-78% of frame, ample empty margin on all sides,
a hooded armored sentinel rising from a coil of living shadow, lower body dissolving into serpentine rings of darkness,
obsidian-and-silver scaled plates, a glowing silver snake emblem on its chest, twin cold-green venom-glowing eyes,
wisps of dark green poison mist curling from its parted fangs, an arrested striking pose ready to lunge,
soft directional light from upper-left, deep emerald-green and tarnished-silver palette with cold green inner glow,
translucent shadowy lower coils — preserve misty dissolving edges in alpha,
fully transparent background, no ground shadow, no border,
512x512, ethereal painterly brush strokes, no outline, MTG illustration quality,
no text, no watermark, no signature, no border frame, no ground line
```

## 5. `gardien_aigle` — Gardien de la Chambre de l'Aigle (Serdaigle · foudre)

- **Lore** : sentinelle de runes vives de Rowena, foudroie qui force le passage.
- **Mécanique** : caster rapide, trait fulgurant, glyphe `stun`, dissipe.
- **Résiste** foudre/disarm ; **faible** physique → corps de pierre runique
  crépitant d'arcs électriques. Palette Serdaigle bleu `(14,26,64)` + bronze.

```
Concept art digital painting of a tall rune-carved sentinel construct crackling with channeled lightning, Harry Potter universe,
wide shot, distant framing, full standing figure head to feet in frame, complete silhouette, no cropping,
subject occupies 75-80% of frame, ample empty margin on all four sides,
a slender guardian of deep-blue stone and bronze inlay, glowing arcane runes carved across its body, standing alert in a casting pose,
great bronze eagle-wing motifs spreading from its shoulders, a glowing bronze eagle emblem on its chest,
arcs of blue-white electricity dancing between its raised hands and along the runes, ozone shimmer,
soft directional light from upper-left, deep midnight-blue and bronze palette with bright blue-white lightning glow,
fully transparent background, no ground shadow, no border,
512x512, painterly brush strokes, no outline, MTG illustration quality,
no text, no watermark, no signature, no border frame, no ground line
```

## 6. `gardien_blaireau` — Gardien de la Chambre du Blaireau (Poufsouffle · physique)

- **Lore** : colosse patient d'Helga, encaisse pour que d'autres tiennent.
- **Mécanique** : tank (forte DEF/PV), coup d'enclume, se soigne, brise la garde.
- **Résiste** physique/glace ; **faible** feu → masse trapue de pierre et terre,
  posture immuable. Palette Poufsouffle brun `(55,46,41)` + or `(240,199,94)`.

```
Concept art digital painting of a massive patient stone-and-earth colossus guardian, Harry Potter universe,
wide shot, distant framing, full standing figure head to feet in frame, complete silhouette, no cropping,
subject occupies 78-82% of frame, ample empty margin on all four sides,
a broad squat immovable guardian built of warm earthen stone bound with golden bronze plating, standing as a patient living wall,
heavy slab fists lowered in a steady defensive guard, a glowing golden badger emblem set into its broad chest,
veins of soft warm light running through the stone seams, moss and amber glints in the cracks,
soft directional light from upper-left, warm earth-brown and honey-gold palette with soft amber inner glow,
fully transparent background, no ground shadow, no border,
512x512, painterly brush strokes, no outline, MTG illustration quality,
no text, no watermark, no signature, no border frame, no ground line
```

> Si une figure est coupée → ajouter : `zoom out, show the full guardian from head to feet`.
> Les 4 gardiens doivent partager une **même échelle apparente** et une même
> direction de lumière (haut-gauche) pour cohabiter dans la même Chambre.

---

## Critères §9 (à vérifier sur chaque rendu)

- [ ] **Alpha** : pas de halo blanc/gris (zoom 400 %, fond noir). Moremplis :
      conserver la translucidité des bords (alpha 30-70 %).
- [ ] **Cadrage** : sujet 65-85 %, marge ≥ 8 %, aucune extrémité coupée.
- [ ] **Silhouette** : reconnaissable à 80×80 px (serpent dressé / linceul
      ondulant / armure-braise / sentinelle lovée / sentinelle runique / colosse).
- [ ] **Palette** : Basilic = terre chaude/bronze ; Moremplis = noir + lueur
      froide ; Gardiens = couleur de Maison + lueur élémentaire (rouge/braise,
      vert/poison, bleu/foudre, brun-or/ambre) + emblème de Maison lumineux.
- [ ] **Posture** : non-statique, intention de menace (dressé / déployé / en garde).
- [ ] **Fratrie (gardiens)** : échelle apparente et lumière (haut-gauche) cohérentes
      entre les 4, emblème de Maison lisible au torse.
- [ ] **Poids** : < 350 KB après `process_monster_png.py`.
- [ ] Pas d'ombre au sol, pas de bordure, pas de signature.
