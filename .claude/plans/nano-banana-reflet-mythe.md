# Prompt Nano Banana — `reflet_mythe`

> Sprite de combat manquant identifié par la revue PNG (2026-06-13).
> Cible : `img/monsters/reflet_mythe.png` — 512×512 RGBA, fond transparent.
> Style : [`IMG_STYLE.md`](../../IMG_STYLE.md) Règle A, template §8.3 (éthéré)
> + règles de cadrage figure-entière.

## Contexte créature

- **Nom** : Le Reflet du Mythe — boss-miroir epic, climax de la Boucle Ténébreuse (étage 21+).
- **Catégorie** : `être magique` (couleur signature saturée + or).
- **Lore** : la propre légende du héros, détachée de lui, dressée en gardien —
  une silhouette humanoïde faite de **lumière froide et de légende retournée**.
- **Palette** : argent-cyan translucide + reflets d'or pâle (lumière froide).
- **Faiblesse** lumière ; **résiste** ténèbres/physique → look lumineux/spectral, pas sombre.

## Prompt (à copier dans Nano Banana / Gemini)

```
Concept art digital painting of a luminous spectral doppelganger guardian, Harry Potter universe,
"the reflection of one's own legend" — a translucent humanoid figure made of cold mirror-light,
wide shot, distant framing, head to toe in frame, feet fully visible, complete standing silhouette,
subject occupies 65-75% of frame, ample empty space above head and below feet, no cropping of limbs,
upright heroic stance with one hand slowly raised, hooded cloaked wizard silhouette whose body is
formed of pale silver-cyan light and fractured mirror shards, face hidden in cold radiance with two
faint glowing eyes, edges dissolving into thin luminous mist, subtle golden rim highlights along the
shoulders and raised hand, translucent body — preserve translucent and misty areas in alpha,
soft volumetric light from upper-left, cool cyan fill light, no harsh shadows,
silvery-blue palette with pale gold accents, ethereal painterly brush strokes, MTG illustration quality,
no text, no watermark, no signature, no border frame, no ground line, no ground shadow,
fully transparent background, 512x512, complete figure visible
```

> Si la figure est coupée → ajouter en fin de prompt :
> `zoom out, show full character including head and feet`.

## Critères §9 à vérifier sur le rendu
- Silhouette humanoïde reconnaissable à 80×80 px.
- Brume/lueur **translucide** (alpha 30-70 %), pas de halo blanc opaque.
- Marge ≥ 8 %, sujet 65-85 %, aucune extrémité coupée.
- Pas d'ombre au sol, pas de bordure/texte.

## Intégration (à ma charge une fois l'image fournie)
```bash
# Sujet éthéré/translucide → birefnet OBLIGATOIRE (§7)
python3 -c "import rembg" 2>/dev/null || python3 -m pip install rembg
python3 tools/process_monster_png.py --src /chemin/image.png --id reflet_mythe --model birefnet --dry-run
# vérifier /tmp/reflet_mythe_check.png, puis relancer sans --dry-run
```
Puis :
1. Ajouter `imgSrc: "img/monsters/reflet_mythe.png"` dans l'entrée `reflet_mythe` de `js/monsters.js`.
2. `node tests/smoke.js` (scénario 5 re-vérifie le RGBA de tous les PNG).
3. **Bump cache PWA** (skill `cache-bump`) car `js/monsters.js` est modifié.
