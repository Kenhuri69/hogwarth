# Prompts Nano Banana — faune & boss natifs des Ruines (Thème A / A1-A2)

> Sprites de combat des 5 créatures de l'Avant-Monde ajoutées en 2026-07
> (A1 : `larve_fondations`, `golem_runique_primordial`, `suture_du_reel`,
> `souffle_du_dormeur` ; A2 : `antecesseur`). Cibles :
> `img/monsters/<id>.png` — **512×512 RGBA, fond transparent**.
> Style : [`IMG_STYLE.md`](../../IMG_STYLE.md) **Règle A** + cadrage figure
> entière (§1-§10). Univers : Harry Potter, mais ces créatures sont
> **primordiales / abstraites** (avant l'école, avant les runes) — pas de
> bestiaire HP classique.
>
> ⚠️ **`imgSrc` n'est PAS encore câblé** dans `js/monsters-high.js` (les 5
> entrées sont volontairement sans `imgSrc` → fallback SVG catégorie). Après
> dépôt du PNG, **ajouter** `imgSrc:"img/monsters/<id>.png"` à l'entrée du
> monstre **et bumper le cache** (`monsters-high.js` + `CACHE_VERSION`, skill
> `cache-bump`) — le câblage est du JS servi, contrairement au PNG lui-même.

## Pipeline de dépôt (une fois l'image générée)

```bash
# rembg + modèle LOURD téléchargés au 1er run (chemin PNG uniquement) :
python3 -c "import rembg" 2>/dev/null || python3 -m pip install rembg
python3 tools/process_monster_png.py --src /chemin/source.png --id <id> --dry-run
# vérifier /tmp/<id>_check.png puis relancer sans --dry-run
```
Le PNG lui-même (`img/`) est servi en Stale-While-Revalidate (non précaché) →
**aucun `?v` à bumper pour déposer le fichier**. Seul l'ajout d'`imgSrc` dans
le JS demande un bump.

Palette commune de la tranche (cohérence Ruines / Zone D) : **givre-violet
froid, basalte noir, or runique éteint, lueurs de magie brute** (bleu-violet
sourd). Lumière directionnelle douce haut-gauche, aucune ombre au sol.

---

## 1. `larve_fondations` — Larve des Fondations

- **Catégorie** : `créature` (bête primordiale aveugle). Cadrage figure entière.
- **Lore** : née avant la lumière, creuse la roche de l'Avant-Monde ; sans yeux,
  mâchoire qui dissout pierre et acier.
- **Mécanique** : brute (broie la garde) + saignement.
- **Faiblesse** lumière ; **résiste** ténèbres/physique → masse pâle, aveugle,
  segmentée, patiente.

```
Concept art digital painting of a colossal blind primordial larva, a pale burrowing creature older than light, dark fantasy Harry Potter universe,
wide shot, distant framing, full segmented body head to tail in frame, complete silhouette, no cropping,
subject occupies 70-80% of frame, ample empty margin on all four sides,
a bloated eyeless pale-grey larva emerging from cracked ancient stone, blunt maw ringed with grinding stone-teeth wide open, glistening translucent segmented flesh, no eyes at all,
faint bioluminescent veins under the skin, pulverized rune-dust falling from the broken rock around it,
soft directional light from upper-left, cold cave palette (bone white, wet grey, faint violet subsurface glow),
fully transparent background, no ground shadow, no border,
512x512, painterly brush strokes, visible matter and texture, no black outline, MTG illustration quality,
no text, no watermark, no signature, no border frame, no ground line
```

## 2. `golem_runique_primordial` — Golem de Rune Primordiale

- **Catégorie** : `être magique` (construct de pierre). Figure entière, massif.
- **Lore** : gardien de basalte gravé de signes plus anciens que les runes,
  trouvé par les Fondateurs, pas fabriqué ; garde le sommeil de ce qui repose
  plus bas.
- **Mécanique** : tank, poing étourdissant, glyphe d'usure de la défense.
- **Faiblesse** glace ; **résiste** physique/foudre → colosse anguleux, joints
  incandescents, glyphes indéchiffrables.

```
Concept art digital painting of a towering primordial rune golem, a basalt guardian carved with glyphs older than any known rune, dark fantasy Harry Potter universe,
wide shot, distant framing, full standing body head to feet in frame, complete silhouette, no cropping,
subject occupies 70-80% of frame, ample empty margin on all four sides,
a massive angular humanoid construct of black cracked basalt, heavy fists raised in a slow grinding stance, seams glowing dull ember-orange between the stone plates,
its whole surface covered in faintly glowing indecipherable pre-runic glyphs, moss-free ancient stone,
soft directional light from upper-left, cold stone palette (black basalt, dull bronze, ember-orange seams, faint violet glyph glow),
fully transparent background, no ground shadow, no border,
512x512, painterly brush strokes, heavy stone texture, no black outline, MTG illustration quality,
no text, no watermark, no signature, no border frame, no ground line
```

## 3. `suture_du_reel` — Suture du Réel

- **Catégorie** : `être magique` (phénomène abstrait — une déchirure d'espace
  qui cherche à se recoudre). Pas de corps organique : une forme faite de
  « manque ».
- **Lore** : couture du réel arrachée par la spirale de la Boucle, éveillée près
  du Sceau, qui cherche à se recoudre à même le vivant.
- **Mécanique** : caster (déchirure de magie brute), dissipe les renforts, peur.
- **Faiblesse** physique ; **résiste** ténèbres/lumière → tear vertical de
  lumière noire, fils/points de suture lumineux, bords qui avalent la lumière.

```
Concept art digital painting of a hovering tear in reality, a vertical rip of black-light suturing itself shut, abstract eldritch entity, dark fantasy Harry Potter universe,
wide shot, distant framing, full floating form in frame, complete silhouette, no cropping,
subject occupies 65-75% of frame, ample empty margin on all four sides,
a floating vertical gash in space edged with glowing thread-like sutures and needle-points of light, the interior a depthless void that swallows surrounding light, faint stitched seams pulling the rip together,
warped distorted space and drifting reality-fragments around the edges, no organic body, no face,
soft ambient glow, cold palette (void black, electric violet, pale gold suture-thread), eerie inner light,
fully transparent background, no ground shadow, no border,
512x512, painterly brush strokes, no black outline, MTG illustration quality,
no text, no watermark, no signature, no border frame, no ground line
```

## 4. `souffle_du_dormeur` — Souffle du Dormeur

- **Catégorie** : `fantôme` → template éthéré `IMG_STYLE.md` §8.3, **palette
  adaptée** : brume tiède violet-givre (l'expiration d'une présence endormie).
- **Lore** : l'expiration du Dormeur des Fondations (jamais le Dormeur lui-même)
  — une brume qui cherche à respirer à votre place ; on ne la tue pas, on la
  chasse.
- **Mécanique** : caster/drain (aspiration lente), peur ; catégorie fantôme →
  valorise Lumos Solem (×1,5).
- **Faiblesse** lumière ; **résiste** ténèbres → nuée sans forme fixe, visage
  à peine suggéré, bords qui se dissolvent.

```
Concept art digital painting of a slow living mist, the exhaled breath of a sleeping primordial presence, ethereal wraith, dark fantasy Harry Potter universe,
wide shot, distant framing, full drifting form in frame, complete silhouette, no cropping,
subject occupies 65-75% of frame, ample empty margin on all four sides,
a formless warm-cold fog coalescing into a barely-suggested drowsy face and reaching tendrils, edges dissolving into smoke, faint inhaling motion pulling wisps inward,
translucent layered vapor, a slow pulse of light deep inside like a distant sleeping heartbeat,
soft diffuse glow, cold palette (frost violet, pale teal, dim inner gold pulse), dreamlike and suffocating,
fully transparent background, no ground shadow, no border,
512x512, painterly brush strokes, soft ethereal edges, no black outline, MTG illustration quality,
no text, no watermark, no signature, no border frame, no ground line
```

## 5. `antecesseur` — L'Antécesseur (boss épique)

- **Catégorie** : `être magique` (entité d'avant l'écriture). Figure imposante,
  abstraite-anthropoïde : quelque chose qui « se compose de ce qui manque ».
- **Lore** : entité antérieure aux runes et aux Fondateurs, liée EN PREMIER pour
  bâtir le Sceau ; à demi réveillée par la fracture de la Clé de Voûte, elle
  défait ce que le monde a appris.
- **Mécanique** : boss caster-hybride — nuke (verbe d'avant l'écriture), dissipe,
  peur, se recompose (auto-heal), 2 phases.
- **Faiblesse** lumière ; **résiste** ténèbres/physique → présence solennelle,
  silhouette instable, glyphes qui s'effacent autour d'elle.

```
Concept art digital painting of an eldritch pre-literate entity called The Antecessor, a being older than writing bound by the founders, epic boss, dark fantasy Harry Potter universe,
wide shot, distant framing, full imposing figure head to base in frame, complete silhouette, no cropping,
subject occupies 70-80% of frame, ample empty margin on all four sides,
a tall solemn quasi-humanoid presence assembled from absence and shadow, its form flickering as if reality forgets its shape, a single vast void-eye of pale light where a face should be, trailing robes of unmade space,
ancient runes and written glyphs visibly erasing and unravelling in the air all around it, threads of raw pre-runic magic bleeding from its outline,
dramatic directional light from upper-left, cold regal palette (void black, deep violet, dead-gold rune-light, pale eye-glow), ominous and monumental,
fully transparent background, no ground shadow, no border,
512x512, painterly brush strokes, no black outline, MTG illustration quality,
no text, no watermark, no signature, no border frame, no ground line
```

> Si une figure est coupée → ajouter `zoom out, show the entire form with margin on all sides`.
> Si le fond n'est pas transparent (damier aplati Gemini/Nano Banana) →
> `process_monster_png.py` (rembg) détoure au dépôt.

## Checklist post-génération (par créature)
1. Générer, vérifier cadrage/marge/silhouette lisible à 80×80.
2. `process_monster_png.py --id <id>` (détourage + 512² + specs IMG_STYLE).
3. Ajouter `imgSrc:"img/monsters/<id>.png"` dans l'entrée `monsters-high.js`.
4. `cache-bump` (monsters-high `?v` + `CACHE_VERSION`) + `check_cache_versions`.
5. `node tests/smoke.js MonsterImages` (le PNG doit charger 512+ avec alpha).
