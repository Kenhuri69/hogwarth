# Prompt Nano Banana / Gemini — sprite plein corps `margaux`

> Héroïne **Margaux Aiglebrume** (Serdaigle, Astromancienne), cohorte
> Le Cercle des Astres. Cible : `img/players/margaux.png`, **512×512 RGBA
> fond transparent**, plein corps painterly (Règle A `IMG_STYLE.md`).
> Canon : 1ʳᵉ année, petite fille blond-roux espiègle, trace de chocolat au
> coin des lèvres, Baguette d'Aulne Étoilé (étincelle bleue), Grimoire des
> Enchantements serré contre elle.

## Prompt à coller dans Gemini

```
Concept art digital painting of Margaux Aiglebrume, a young heroic witch girl in the Harry Potter universe,
wide shot, distant framing, head to toe in frame, feet fully visible standing on invisible ground,
complete standing figure in a confident curious pose, bright delighted gaze toward the viewer,
adorable 11-year-old first-year witch with messy strawberry-blonde curls and freckles, mischievous smile with a tiny smudge of chocolate at the corner of her mouth,
wearing Ravenclaw school robes in deep midnight blue with bronze trim, blue-and-bronze striped tie, and the blue-and-bronze eagle house crest,
raising a slender star-alder wand from which small bright blue sparkles and tiny stars swirl (translucent, alpha 30-70%),
clutching a thick blue spellbook ("Les Sortilèges et Enchantements") against her chest with the other arm,
shoes fully visible at the bottom of frame,
dramatic upper-left lighting, warm key light + cool cyan rim light separating her from the background,
palette: midnight blue robes, antique bronze accents, icy star-blue spell glow, warm freckled skin, strawberry-blonde hair,
fully transparent background, no ground shadow,
subject occupies 70% of 512x512 square frame with 15% empty margin above head and below feet,
centered full standing pose, painterly brush strokes, no outline, MTG concept art quality,
complete silhouette visible, no cropping of limbs,
no text, no watermark, no signature, no border frame, no ground line, no ground shadow
```

> Si la figure est coupée → ajouter en fin :
> `zoom out, show full character including extremities`.

## Après réception de l'image

1. `python3 tools/dechecker_png.py <fichier_gemini.png> img/players/margaux.png`
2. Ajouter `margaux: 'img/players/margaux.png'` à `PLAYER_SPRITE_SRC`
   (`js/renderer-entities.js`) + bump cache (skill `cache-bump`).
3. Passer le compte de héros 15→16 dans
   `tests/scenarios/multiplayer.js` (assertions `sprites.keys` / `sprites.loaded`).
4. `node tests/smoke.js`.
