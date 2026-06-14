# Prompts Nano Banana — sprites des boss de Boucle (`basilic_ancestral`, `moremplis`)

> Sprites de combat des deux boss ajoutés en 2026-06-13 (PR #510, #513).
> Cibles : `img/monsters/basilic_ancestral.png` et `img/monsters/moremplis.png`
> — 512×512 RGBA, fond transparent. Style : [`IMG_STYLE.md`](../../IMG_STYLE.md)
> Règle A + cadrage figure entière (§1-§10).
>
> **`imgSrc` est déjà câblé** dans `js/monsters.js` : dès qu'un PNG est déposé
> au chemin ci-dessus, il s'active automatiquement (le renderer retombe sur
> l'emoji tant que le fichier est absent — aucun chemin mort).

## Pipeline de dépôt (une fois l'image générée)

```bash
# rembg + modèle LOURD téléchargés au 1er run (chemin PNG uniquement) :
python3 -c "import rembg" 2>/dev/null || python3 -m pip install rembg
python3 tools/process_monster_png.py --src /chemin/source.png --id basilic_ancestral --dry-run
# vérifier /tmp/basilic_ancestral_check.png puis relancer sans --dry-run
python3 tools/process_monster_png.py --src /chemin/source.png --id moremplis --dry-run
```
`img/` est servi en Stale-While-Revalidate (non précaché) → **aucun `?v` à
bumper** pour déposer le PNG. (Le câblage `imgSrc` dans `monsters.js`, lui, a
déjà été bumpé.)

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

## Critères §9 (à vérifier sur chaque rendu)

- [ ] **Alpha** : pas de halo blanc/gris (zoom 400 %, fond noir). Moremplis :
      conserver la translucidité des bords (alpha 30-70 %).
- [ ] **Cadrage** : sujet 65-85 %, marge ≥ 8 %, aucune extrémité coupée.
- [ ] **Silhouette** : reconnaissable à 80×80 px (serpent dressé / linceul ondulant).
- [ ] **Palette** : Basilic = terre chaude/bronze ; Moremplis = noir + lueur froide.
- [ ] **Posture** : non-statique, intention de menace (dressé / déployé).
- [ ] **Poids** : < 350 KB après `process_monster_png.py`.
- [ ] Pas d'ombre au sol, pas de bordure, pas de signature.
