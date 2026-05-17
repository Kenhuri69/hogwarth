# Plan — Fontaine 3D/minimap + sprites PNJ par type

## Contexte

Deux demandes :
1. **Fontaine** : absente de la vue pseudo-3D et indistincte sur la minimap.
2. **PNJ** : un seul sprite générique `_wizard_generic.png` pour les 24 PNJ ;
   la couleur (or) ne correspond pas aux habits. Passer à 3 sprites de base
   (mage / prof homme / prof femme) + 2 cas spéciaux (fantôme / vendeur),
   générés via Gemini puis traités comme les monstres.

## Constat code

- `renderer.js:272` — `CELL.FOUNTAIN` absent de la liste de scan des sprites
  de couloir → aucun visuel 3D.
- `renderer-minimap.js:87` — fontaine en classe générique `map-special`
  (brun/or), identique à la base PNJ → indistincte. Pas de `.map-fountain`.
- `renderer-effects.js` — `_getNpcSprite()` charge un PNG unique.

## Étapes

1. **Fontaine 3D** — `drawFountainSprite(x,baseY,sz,dried)` dans
   `renderer-effects.js` (registre emoji ⛲ comme forge/biblio, halo bleu,
   variante tarie grisée). Scan + dispatch dans `renderer.js`.
   → vérif : se tenir face à une fontaine (étage 2) → sprite visible ;
   après avoir bu → grisé.
2. **Fontaine minimap** — classe dédiée `.map-fountain` (bleu) dans
   `renderer-minimap.js` + `css/style.css`.
   → vérif : case fontaine bleue, distincte des PNJ.
3. **Routage sprite PNJ** — champ `sprite:` dans chaque entrée de `npcs.js`
   + helper `getNpcSpriteType()`. Registre `NPC_SPRITE_SRC` dans
   `renderer-effects.js` (tous → `_wizard_generic.png` tant que les PNG
   dédiés ne sont pas générés).
   → vérif : `node tests/smoke.js` vert ; aucun PNJ cassé.
4. **Pipeline image** — option `--dest` sur `tools/process_monster_png.py`
   pour sortir dans `img/npc/`.
5. **Prompts Gemini** — section ci-dessous, 5 prompts prêts à générer.
6. **Doc** — CLAUDE.md (sections Fontaine + sprite PNJ).

## Affectation `sprite:` par PNJ

| sprite    | PNJ |
|-----------|-----|
| `mage`    | dumbledore, scamander, scamander_random |
| `prof_h`  | slughorn, lockhart, lupin, hagrid, rogue, flitwick, rusard, hagrid_random |
| `prof_f`  | pomfresh, manon, mcgonagall, sprout, trelawney |
| `fantome` | mimi, sir_nicolas, moine_gras, portrait_dumbledore |
| `vendeur` | ollivander, guipure, rosmerta, mundungus |
| `phenix`  | fumseck |

## Workflow images (à faire par l'utilisateur)

1. Générer chaque image via Gemini avec les prompts ci-dessous (1024² ou +).
2. Traiter : `python3 tools/process_monster_png.py --src <brut> --id _npc_<type> --dest img/npc [--model birefnet]`
   - `_npc_fantome` : `--model birefnet` obligatoire (translucidité).
3. Fournir les PNG → mise à jour de `NPC_SPRITE_SRC` (chemin
   `img/npc/_npc_<type>.png`) dans `renderer-effects.js`.

## Prompts Gemini

> Style : cf. `IMG_STYLE.md` §2 (digital painting concept-art HP) et §8.
> Sujet pleine hauteur, debout, fond transparent, 512² final.

### `_npc_mage` — Mage générique
```
Concept art digital painting of a friendly elderly wizard NPC, Harry Potter universe style,
full body standing pose, calm welcoming posture, one hand resting on a wooden staff,
long flowing midnight-blue robe with subtle silver star embroidery, pointed wizard hat,
soft directional light from upper-left with cool cyan rim light,
deep indigo and silver palette, warm skin tones,
fully transparent background, no ground shadow, no border,
subject occupies 80% of 512x512 square frame, vertically centered,
painterly brush strokes, no outline, MTG concept art quality,
no text, no watermark, no signature, no border frame, no ground line
```

### `_npc_prof_h` — Professeur homme
```
Concept art digital painting of a male Hogwarts professor NPC, Harry Potter universe style,
full body standing pose, dignified attentive posture, holding a rolled parchment,
formal dark academic teaching robe over a waistcoat, neat collar,
soft directional light from upper-left with cool cyan rim light,
charcoal black and burgundy palette with brass buttons, warm skin tones,
fully transparent background, no ground shadow, no border,
subject occupies 80% of 512x512 square frame, vertically centered,
painterly brush strokes, no outline, MTG concept art quality,
no text, no watermark, no signature, no border frame, no ground line
```

### `_npc_prof_f` — Professeur femme
```
Concept art digital painting of a female Hogwarts professor NPC, Harry Potter universe style,
full body standing pose, poised confident posture, wand held gently at her side,
long emerald teaching robe with a tartan shawl, hair in a neat bun,
soft directional light from upper-left with cool cyan rim light,
deep green and bronze palette, warm skin tones,
fully transparent background, no ground shadow, no border,
subject occupies 80% of 512x512 square frame, vertically centered,
painterly brush strokes, no outline, MTG concept art quality,
no text, no watermark, no signature, no border frame, no ground line
```

### `_npc_fantome` — Fantôme (cas spécial)
```
Concept art digital painting of a friendly Hogwarts ghost NPC, Harry Potter universe style,
full body floating pose, gentle hovering posture, faint trailing mist at the hem,
translucent body fading to mist at the edges, period clothing (ruffled collar, long robe),
soft volumetric light, no harsh shadows,
silvery blue palette with cyan glow,
fully transparent background — preserve translucent areas in alpha, no border,
floating subject occupying 80% of 512x512 square frame, vertically centered,
ethereal painterly style, no outline, MTG-quality illustration,
no text, no watermark, no signature, no border frame, no ground line
```

### `_npc_vendeur` — Vendeur (cas spécial)
```
Concept art digital painting of a wizarding shopkeeper NPC, Harry Potter universe style,
full body standing pose, inviting merchant posture, presenting a small wooden box of wares,
practical tradesman robe with a leather apron and a coin pouch at the belt,
soft directional light from upper-left with cool cyan rim light,
warm amber and brown palette with brass accents, warm skin tones,
fully transparent background, no ground shadow, no border,
subject occupies 80% of 512x512 square frame, vertically centered,
painterly brush strokes, no outline, MTG concept art quality,
no text, no watermark, no signature, no border frame, no ground line
```

### `_npc_phenix` — Phénix (cas spécial, Fumseck)
> Créature animale (cf. IMG_STYLE.md §8.1) ; `--model birefnet` au
> traitement (lueur de braise translucide).
```
Concept art digital painting of a phoenix, Harry Potter universe style (Fawkes),
perched majestically on nothing, wings half-spread, head in 3/4 turned toward the viewer,
brilliant crimson and gold plumage, long elegant tail feathers, faint translucent ember glow,
soft directional light from upper-left with cool cyan rim light,
scarlet red and radiant gold palette, amber eyes,
fully transparent background — preserve the translucent glow in alpha, no ground shadow, no border,
subject occupies 80% of 512x512 square frame, vertically centered,
painterly brush strokes, no outline, MTG concept art quality,
no text, no watermark, no signature, no border frame, no ground line
```

## Avancement

- [x] Étape 1 — fontaine 3D (`drawFountainSprite`, scan + dispatch renderer.js)
- [x] Étape 2 — fontaine minimap (`.map-fountain` bleu)
- [x] Étape 3 — routage sprite PNJ (`sprite:` ×25, `getNpcSpriteType`, `NPC_SPRITE_SRC`)
- [x] Étape 4 — option `--dest` sur process_monster_png.py
- [x] Étape 5 — prompts (ci-dessus, 5 prêts)
- [x] Étape 6 — doc CLAUDE.md
- [x] Smoke test vert (`node tests/smoke.js` — tous scénarios, loader 129/0)

## Reste à faire (utilisateur)

- Générer les 5 PNG via les prompts Gemini, traiter avec `--dest img/npc`,
  fournir les fichiers → bascule de `NPC_SPRITE_SRC` sur les chemins dédiés.
