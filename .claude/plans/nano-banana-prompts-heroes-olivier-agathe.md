# Prompts Nano Banana — Visuels isolation 3D des héros Olivier & Agathe

> 2 prompts pleine hauteur pour les héros jouables **Olivier de Clairval**
> (Serdaigle) et **Agathe Lumiflore** (Gryffondor), déjà intégrés dans
> `CHARACTERS` (`js/data.js`) et profilés en `docs/histoire/05-personnages-jouables.md §5.2`.
>
> But : figures **isolées plein corps, fond transparent, style 3D painterly**
> (pas un buste-portrait). On suit la **Règle A** d'[`IMG_STYLE.md`](../../IMG_STYLE.md)
> (§1-§10 — sprites 512×512 RGBA) + le cadrage forcé head-to-toe de
> [`nano-banana-prompts-floor-8-10.md`](./_archive/nano-banana-prompts-floor-8-10.md).
>
> ⚠️ Ce ne sont PAS les portraits de dialogue (Règle B, 256² photoréaliste).
> Ce sont des silhouettes héroïques entières, lumineuses, regard vers le viewer.

---

## ⚠️ Règles de cadrage obligatoires (lire avant chaque prompt)

Nano Banana zoome agressivement. Forcer le plein corps avec ces phrases dans
CHAQUE prompt :

| Élément à inclure | Effet |
|--------------------|-------|
| `head to toe in frame, feet fully visible` | Empêche de couper aux jambes |
| `wide shot, distant framing` | Recule la caméra |
| `subject occupies 65-75% of frame, ample empty space above head and below feet` | Force marge ≥ 12 % |
| `complete silhouette, no cropping of limbs` | Anti-crop explicite |
| `centered figure, full standing pose visible` | Anti-zoom |

Si la figure est encore coupée après génération → ajouter en fin :
`zoom out, show full character including extremities`.

### Différence de ton vs monstres

Ce sont des **alliés héroïques**, pas des ennemis : posture **confiante et
noble** (jamais menaçante ni recroquevillée), regard déterminé vers le viewer,
contre-jour magique chaleureux côté Maison. Jeune sorcier/sorcière d'école,
beau, vivant, lumineux.

### Suffix universel à coller à TOUS les prompts héros
```
no text, no watermark, no signature, no border frame, no ground line, no ground shadow,
fully transparent background, 512x512, painterly digital concept art,
MTG illustration quality, no cropping of limbs, complete figure visible
```

---

## Héros (2) — 512×512 RGBA, fond transparent, plein corps

### `olivier` — Olivier de Clairval (Serdaigle, Mage de combat)

**Fichier cible suggéré** : `img/heroes/olivier.png` (ou `img/olivier-full.png`)
**Canon** : Serdaigle, 7e année. Discipliné, intense, perfectionniste du sortilège ;
regard d'escrimeur. Baguette de Chêne Ardent, Plume d'Aigle dans un carnet, Robe
de Serdaigle. Nukeur élémentaire (feu/foudre) : Incendio, Stupefix.

```
Concept art digital painting of Olivier de Clairval, a young heroic wizard in the Harry Potter universe,
wide shot, distant framing, head to toe in frame, feet fully visible standing on invisible ground,
complete standing figure in a confident disciplined fencer's stance, weight balanced, chin level, intense focused gaze toward the viewer,
handsome 17-year-old French wizard, neat dark hair, sharp determined eyes, composed serious expression,
wearing elegant Ravenclaw school robes in deep midnight blue with bronze trim and the blue-and-bronze eagle house crest,
raising a slender wand of glowing ember oak in one hand, faint embers and small sparks of fire-and-lightning magic curling around the wand tip (translucent, alpha 30-70%),
a leather notebook with a single eagle feather tucked into its binding held in the other hand,
boots fully visible at the bottom of frame,
dramatic upper-left lighting with a warm bronze key light and a cool cyan rim light separating him from the background,
palette: midnight blue robes, antique bronze accents, ember orange spell glow, pale skin,
fully transparent background, no ground shadow,
subject occupies 70% of 512x512 square frame with 15% empty margin above head and below feet,
centered full standing pose, painterly brush strokes, no outline, MTG concept art quality,
complete silhouette visible, no cropping of limbs,
no text, no watermark, no signature, no border frame, no ground line, no ground shadow
```

---

### `agathe` — Agathe Lumiflore (Gryffondor, Enchanteresse florale)

**Fichier cible suggéré** : `img/heroes/agathe.png` (ou `img/agathe-full.png`)
**Canon** : Gryffondor, 5e année. Douce, tenace, profondément vivante. Couronne
de fleurs vivantes dans les cheveux, mains tachées de terre et de pollen.
Baguette de Cerisier en Fleur, Robe de Gryffondor. Soigneuse-soutien
(Episkey, Ferula, Wingardium Leviosa).

```
Concept art digital painting of Agathe Lumiflore, a young heroic witch in the Harry Potter universe,
wide shot, distant framing, head to toe in frame, feet fully visible standing on invisible ground,
complete standing figure in a gentle warm yet tenacious pose, one hand open and nurturing, kind determined gaze toward the viewer,
lovely 15-year-old witch with a living crown of fresh blooming flowers woven into her wavy hair, soft warm smile, hands lightly stained with soil and pollen,
wearing Gryffondor school robes in crimson red with gold trim and the red-and-gold lion house crest,
holding a flowering cherry-blossom wand from which delicate pink petals and tendrils of green life-magic gently swirl (translucent, alpha 30-70%),
small vines and tiny blossoms curling around her sleeve and the hem of her robe,
shoes fully visible at the bottom of frame,
soft directional light from the upper-left with a warm golden key light and a cool cyan rim light separating her from the background,
palette: crimson and gold robes, fresh spring greens, blossom pink, warm earthy skin tones,
fully transparent background, no ground shadow,
subject occupies 70% of 512x512 square frame with 15% empty margin above head and below feet,
centered full standing pose, painterly brush strokes, no outline, MTG concept art quality,
complete silhouette visible, no cropping of limbs,
no text, no watermark, no signature, no border frame, no ground line, no ground shadow
```

---

## ✅ Assets livrés (2026-06-11)

Les deux visuels ont été générés via Gemini puis détourés :

| Héros | Fichier | Format |
|-------|---------|--------|
| Olivier | `img/heroes/olivier.png` | 512×512 RGBA transparent (~110 KB) |
| Agathe  | `img/heroes/agathe.png`  | 512×512 RGBA transparent (~145 KB) |

### Détourage (fond damier « cuit »)

Gemini a renvoyé des PNG **1024×1024 RGB** avec le damier de transparence
**aplati en pixels gris** (pas de vrai canal alpha). `rembg`/`birefnet`
(cf. `process_monster_png.py`) sont superflus ici : fond gris régulier, sujet
coloré. Outil dédié **`tools/dechecker_png.py`** (reconstruction de silhouette,
récupère les vêtements gris internes par fill-holes, garde les blobs de magie
saturés) :

```bash
python3 tools/dechecker_png.py <gemini_olivier.png> img/heroes/olivier.png
python3 tools/dechecker_png.py <gemini_agathe.png>  img/heroes/agathe.png
```

Critères §9 d'`IMG_STYLE.md` OK : 512² RGBA, marge ≥ 8 %, < 350 KB, pas de halo
gris (érosion 1 px + feather). Reliquat : quelques carreaux ultra-faibles près
de la magie d'Agathe (invisibles à la taille d'affichage 80-150 px).

## Câblage côté code — À DÉCIDER

Aujourd'hui les héros n'utilisent que `imgSrc` (portrait médaillon
`img/<key>.png`). Ces visuels plein corps sont un asset **NOUVEAU**. Usage visé
(réponse joueur) : **sprites de combat (côté allié) + rendu 3D donjon**.

⚠️ Deux points à arbitrer avant d'implémenter :
1. **Vue 3D donjon = première personne** : on ne voit pas sa propre équipe.
   Préciser le besoin (sprite allié visible où exactement ?).
2. **Seuls 2 des 14 héros** ont un sprite plein corps. Un système de sprite
   allié en combat serait incohérent pour les 12 autres (portrait seul).
   → soit fallback portrait médaillon, soit générer les 12 manquants.

Ce fichier ne couvre que la génération + le détourage des 2 assets.
