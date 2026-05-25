# Prompts Nano Banana — Sprint endgame étages 8-10

> 18 prompts complets pour les assets ajoutés par PRs #241/#242/#243.
> Style ancré dans [`IMG_STYLE.md`](../../IMG_STYLE.md) (templates §8.1/§8.2/§8.3).
>
> **Workflow** :
> 1. Copier le prompt complet (entre les `---` ci-dessous).
> 2. Générer dans Nano Banana → ratio carré, 1024 ou 512.
> 3. Pour les **monstres** (12) : passer dans `tools/process_monster_png.py --src <chemin> --id <id> --model birefnet` pour détourage + resize 512×512 RGBA.
> 4. Pour les **portraits NPC** (6) : resize à 256×256 RGB (fond opaque OK), placer dans `img/npc/<id>.png`.
> 5. Smoke test `node tests/smoke.js` doit toujours passer.

---

## Monstres (12) — 512×512 RGBA, fond transparent

### Suffix universel à coller à TOUS les prompts monstres
```
no text, no watermark, no signature, no border frame, no ground line, no ground shadow,
fully transparent background, 512x512, painterly digital concept art, MTG illustration quality
```

---

### Tranche étage 8 « Le Seuil »

#### `fenrir_greyback` — Fenrir Greyback (boss canon, `humain`)
**Fichier cible** : `img/monsters/fenrir_greyback.png`
**Template** : §8.2 (humain) avec accents bestiaux
**Lore** : loup-garou humanoïde mature, contaminateur enfantin, allié de Voldemort.

```
Concept art digital painting of Fenrir Greyback in Harry Potter universe,
full body, dynamic threatening stance, gripping jagged teeth bared in a snarl,
mature lycanthrope man in his fifties, wild matted grey hair, long yellowed fangs,
deep facial scars, blood-stained jaw, filthy torn rags revealing scarred muscular chest,
clawed hands raised, body half-shifted between man and wolf,
dramatic upper-left lighting with cold blue rim light catching the fangs,
palette: ash grey, dirty brown, dried blood crimson, sickly yellow eyes,
fully transparent background, no shadow on ground,
subject occupies 80% of 512x512 square frame, painterly brush strokes,
no outline, MTG concept art quality,
no text, no watermark, no signature, no border frame
```

---

#### `veilleur_seuil` — Veilleur du Seuil (boss original, `être magique`)
**Fichier cible** : `img/monsters/veilleur_seuil.png`
**Template** : §8.2 adapté + runes lumineuses (§6)
**Lore** : colosse runique scellé dans la pierre par des sorciers oubliés, garde les passages.

```
Concept art digital painting of an ancient stone golem warden,
massive 3-meter humanoid sculpted from cracked granite blocks,
ornate engraved runes pulsing with cold cyan light across chest, shoulders and forehead,
arms crossed in guardian stance, head slightly lowered, eyes burning pale blue,
moss and lichen on lower body, weathered surfaces with chipped edges,
glowing rune seals integrated into stone volume (not floating),
upper-left dramatic lighting, cool cyan rim accent,
palette: weathered grey stone, mossy green, pulsing cyan runes, deep slate shadows,
fully transparent background, no ground shadow,
subject occupies 85% of 512x512 square frame, painterly style,
massive imposing silhouette, MTG concept art,
no text, no watermark, no signature, no border frame
```

---

#### `loup_garou_adulte` — Loup-Garou Adulte (appoint, `bête`)
**Fichier cible** : `img/monsters/loup_garou_adulte.png`
**Template** : §8.1 (bête)
**Lore** : loup-garou en pleine maturité, sans Tue-Loup, version brute du loup_garou existant.

```
Concept art digital painting of a mature adult werewolf, Harry Potter universe style,
quadrupedal mid-leap pose mid-air with all four claws extended,
muscular wolf body the size of a horse, matted grey-brown fur with silver tips,
elongated muzzle bared with bloody fangs, glowing yellow eyes,
torn human clothing scraps still hanging from one shoulder,
3/4 dynamic view from low angle showing power,
soft directional light from upper-left, cold cyan rim light,
warm earth palette: ash grey fur, dirty brown undercoat, amber yellow eyes,
fully transparent background, no ground shadow, no border,
centered subject filling 80% of square frame,
512x512, painterly brush strokes, MTG illustration quality,
no text, no watermark, no signature
```

---

#### `auror_corrompu` — Auror Corrompu (appoint, `humain`)
**Fichier cible** : `img/monsters/auror_corrompu.png`
**Template** : §8.2 (humain)
**Lore** : Auror retourné par les Ténèbres, magie autrefois protectrice virée au noir.

```
Concept art digital painting of a corrupted Auror in Harry Potter universe,
full body, dynamic pose casting a dark curse with extended wand,
former Auror robes now tattered and stained black, badge of office tarnished and cracked,
hollow shadowed eyes, sickly pale skin, faint dark veins on temples and hand,
sigil of the Dark Mark visible on inner forearm,
wand tip emitting a translucent purple-black wisp,
dramatic upper-left lighting with violet rim light from the cast spell,
palette: deep charcoal robes, oxidized silver trim, sickly pallor, purple curse glow,
fully transparent background, no shadow on ground,
subject occupies 80% of 512x512 square frame, painterly style,
no outline, MTG concept art quality,
no text, no watermark, no signature, no border frame
```

---

### Tranche étage 9 « Les Profondeurs »

#### `aragog` — Aragog (boss canon, `créature`)
**Fichier cible** : `img/monsters/aragog.png`
**Template** : §8.1 (bête/créature)
**Lore** : chef Acromantule de la Forêt Interdite, élevé par Hagrid, 60+ ans, massif.

```
Concept art digital painting of Aragog the Acromantula king, Harry Potter universe,
gigantic ancient spider the size of a small elephant,
3/4 dynamic view, body raised on front legs in threat display,
eight large milky-glowing eyes (signs of age) reflecting cold light,
massive chitinous mandibles dripping venom, dense black bristly hair on body,
front legs raised showing pale underbelly with battle scars,
long jointed legs spread wide for menacing scale,
soft directional light from upper-left, cold cyan rim light through bristles,
dark earth palette: jet black exoskeleton, mossy green-brown bristles, pale ivory mandibles,
glowing yellow-white blind eyes (cataract-clouded from old age),
fully transparent background, no ground shadow, no border,
subject filling 85% of 512x512 square frame,
painterly brush strokes, intimidating silhouette, MTG illustration quality,
no text, no watermark, no signature
```

---

#### `maitre_detraqueur` — Maître des Détraqueurs (boss original, `être magique`)
**Fichier cible** : `img/monsters/maitre_detraqueur.png`
**Template** : §8.3 (fantôme/éthéré)
**Lore** : figure tutélaire des Détraqueurs d'Azkaban, plus grand et plus avide que ses subordonnés.

```
Concept art digital painting of the Master of Dementors, Harry Potter universe,
towering 3-meter hooded wraith floating above ground, billowing dark tattered cloak,
deep empty hood swallowing all light, no face visible — only a void
where the face should be, faint silver mist seeping out,
skeletal grey hands with elongated fingers emerging from sleeves,
lower body dissolving into translucent black mist trailing downward,
floating posture with arms slightly spread, summoning aura of despair,
soft volumetric light, ethereal cold cyan glow at edges of cloak,
silvery blue palette with deep void-black core, cyan rim glow,
fully transparent background — preserve translucent areas in alpha,
no shadow on ground, no border,
floating subject centered in 512x512 frame, occupying 80% vertically,
ethereal painterly style, oppressive presence, MTG-quality illustration,
no text, no watermark, no signature
```

---

#### `acromantule_adulte` — Acromantule Adulte (appoint, `créature`)
**Fichier cible** : `img/monsters/acromantule_adulte.png`
**Template** : §8.1 (créature)
**Lore** : Acromantule mature taille cheval, progéniture d'Aragog (donc plus jeune que lui).

```
Concept art digital painting of an adult Acromantula spider, Harry Potter universe,
giant spider the size of a horse, 3/4 dynamic charging pose,
eight black gleaming healthy eyes (NOT clouded like Aragog),
dense black bristly hair across body and legs, clean wet chitin shine,
sharp curved mandibles open showing fangs, fresh venom drip,
front legs forward in attack posture, lower legs braced,
soft directional light from upper-left, cool cyan rim on legs,
dark earth palette: glossy jet black, deep brown undertones, amber-red eyes,
fully transparent background, no ground shadow, no border,
centered subject filling 80% of 512x512 square frame,
painterly brush strokes, predatory silhouette, MTG illustration quality,
no text, no watermark, no signature
```

---

#### `detraqueur_elite` — Détraqueur d'Élite (appoint, `être magique`)
**Fichier cible** : `img/monsters/detraqueur_elite.png`
**Template** : §8.3 (fantôme)
**Lore** : Détraqueur vétéran d'Azkaban, version plus dense des gardiens standards.

```
Concept art digital painting of an elite Dementor, Harry Potter universe,
tall 2.5-meter hooded wraith floating, layered dark ragged cloak with reinforced shoulders,
deep void hood with no visible face, faint silver soul-mist rising from the hood opening,
one skeletal grey hand outstretched palm-up summoning frost particles,
lower body trailing into translucent black smoke,
hovering posture with subtle menacing tilt forward,
soft volumetric cold light from upper-left, ethereal cyan glow at cloak edges,
palette: deep black-blue cloak, silvery cyan accents, void-black hood interior,
fully transparent background — preserve translucent mist in alpha,
no ground shadow, no border,
floating subject centered in 512x512 frame, 80% vertical occupation,
ethereal painterly style, oppressive cold aura, MTG illustration quality,
no text, no watermark, no signature
```

---

### Tranche étage 10 « Le Précipice »

#### `antonin_dolohov` — Antonin Dolohov (boss canon, `humain`)
**Fichier cible** : `img/monsters/antonin_dolohov.png`
**Template** : §8.2 (humain) avec accents magiques
**Lore** : Mangemort lieutenant, signature = courbe violette perforante (a presque tué Hermione au Ministère).

```
Concept art digital painting of Antonin Dolohov the Death Eater, Harry Potter universe,
full body, mid-cast pose tracing his signature violet curve in the air,
tall gaunt eastern european man with long dark hair tied back, sharp angular face,
twisted thin smile, dark sunken eyes, prominent cheekbones,
black Death Eater robes with silver clasps, mask removed and hanging from belt,
wand extended drawing a glowing translucent violet S-curve in mid-air beside him,
Dark Mark visible on inner forearm,
dramatic upper-left lighting with violet rim light from the spell trace,
palette: deep black robes, oxidized silver accents, violet magical glow, pale skin,
fully transparent background, no shadow on ground,
subject occupies 80% of 512x512 square frame, painterly style,
no outline, MTG concept art quality, menacing intent in posture,
no text, no watermark, no signature, no border frame
```

---

#### `heraut_tenebres` — Héraut des Ténèbres (boss original, `être magique`)
**Fichier cible** : `img/monsters/heraut_tenebres.png`
**Template** : §8.3 hybride (être magique éthéré + objet rituel)
**Lore** : annonciateur de la résurrection de Voldemort, sonne un cor d'os qui corrompt l'air.

```
Concept art digital painting of the Herald of Darkness, Harry Potter universe original creation,
tall 2.5-meter hooded figure floating, deep velvet black robes embroidered with silver runes,
hood pulled forward casting full shadow over the face — only two glowing crimson pinpoints visible,
both gauntleted hands gripping a massive carved bone horn raised to the hood,
the horn etched with arcane runes glowing faint violet,
visible breath of dark mist emanating from the horn's bell,
floating slightly above ground, lower robes dissolving into black smoke,
soft volumetric light, dramatic violet rim accent from the runes,
palette: deep velvet black, oxidized silver embroidery, bone-ivory horn, violet rune glow, crimson eye pinpoints,
fully transparent background — preserve mist translucency in alpha,
no shadow on ground, no border,
imposing figure centered in 512x512 frame, 85% vertical occupation,
painterly digital style, ritualistic threatening presence, MTG illustration quality,
no text, no watermark, no signature
```

---

#### `mangemort_veteran` — Mangemort Vétéran (appoint, `humain`)
**Fichier cible** : `img/monsters/mangemort_veteran.png`
**Template** : §8.2 (humain)
**Lore** : Mangemort de la première heure, marqué depuis la Première Guerre, cruauté intacte.

```
Concept art digital painting of a veteran Death Eater, Harry Potter universe,
full body, casting Cruciatus mid-pose, wand extended forward,
aging man in late fifties, hardened lined face, greying hair pulled back,
white serpent-mouthed Death Eater mask pushed up onto forehead revealing scarred face,
weathered black robes with old battle damage, silver fastenings tarnished,
visible Dark Mark on inner forearm, faded but still vivid,
crackling violet magical energy at wand tip with translucent purple sparks,
dramatic upper-left lighting with cold cyan rim, violet glow from the spell,
palette: aged black fabric, oxidized silver, pale lined skin, vivid violet curse-light,
fully transparent background, no ground shadow,
subject occupies 80% of 512x512 square frame, painterly style,
MTG concept art quality, cruel intent in expression,
no text, no watermark, no signature, no border frame
```

---

#### `spectre_renforce` — Spectre Renforcé (appoint, `fantôme`)
**Fichier cible** : `img/monsters/spectre_renforce.png`
**Template** : §8.3 (fantôme)
**Lore** : esprit corrompu plus dense, vestige d'un sorcier puissant retenu dans les Profondeurs.

```
Concept art digital painting of an empowered specter, Harry Potter ghost type,
translucent floating wraith of a former wizard in tattered ceremonial robes,
posture leaning forward arms extended toward viewer fingers crooked for a drain spell,
gaunt skull-like face with deep eye sockets glowing cold blue-white,
faint silver outline around the body indicating denser-than-normal ghost matter,
lower body fading to mist with whispy tendrils,
chest area showing translucent glow of trapped soul-light,
silvery blue palette with cyan core glow, cold cyan rim light,
soft volumetric light, ethereal but more solid than a typical ghost,
fully transparent background — preserve translucent body in alpha,
no ground shadow, no border,
floating subject centered in 512x512 frame, 80% vertical occupation,
ethereal painterly style, vengeful focused presence, MTG-quality illustration,
no text, no watermark, no signature
```

---

## Portraits NPC (6) — 256×256 RGB, fond opaque OK

> Format différent des monstres : cadrage **buste/épaules**, fond uni ou doux (pas obligatoirement transparent — voir `img/npc/lockhart.png` qui a un fond sombre uni).
> Réutiliser le suffix universel monstre mais retirer "fully transparent background" si tu préfères un fond contextuel.

### Suffix universel portraits NPC
```
no text, no watermark, no signature, no border frame,
256x256 portrait, painterly digital art, Harry Potter style,
warm directional lighting, soft contextual background
```

---

### Tranche étage 8

#### `kingsley` — Kingsley Shacklebolt (donneur 3 quêtes)
**Fichier cible** : `img/npc/kingsley.png`
**Personnage** : Auror noir, ancien membre de l'Ordre du Phénix, calme et imposant.

```
Portrait of Kingsley Shacklebolt from Harry Potter, bust shot, 3/4 face turn,
tall imposing black wizard in his forties, completely shaved head,
single gold hoop earring, deep brown eyes with intense calm authority,
neatly trimmed short beard, dark navy Auror robes with gold trim collar,
posture upright and composed, slight reassuring smile,
warm directional lighting from upper-left, gentle cyan rim light,
soft dark contextual background suggesting torchlit corridor,
painterly digital concept art, Harry Potter universe style,
256x256 portrait frame, character occupies 75% vertically,
dignified gravitas, MTG portrait illustration quality,
no text, no watermark, no signature, no border frame
```

---

#### `marchand_clandestin` — Marchand Clandestin (vendeur étage 8)
**Fichier cible** : `img/npc/marchand_clandestin.png`
**Personnage** : receleur d'équipement Auror, furtif, capuchon, propos pleins de sous-entendus.

```
Portrait of a clandestine black market merchant in Harry Potter universe,
bust shot, 3/4 face, hooded sneaky middle-aged man,
dark leather hood pulled low casting shadow over half the face,
one visible cunning eye glinting, scraggly stubble, missing tooth showing in sly half-smile,
worn leather coat with hidden pockets and dangling Auror badges as trophies,
fingerless gloves visible at frame edge,
warm tavern-orange lighting from below, cold cyan rim light from behind,
soft dark contextual background suggesting back alley shadows,
painterly digital concept art, Harry Potter universe style,
256x256 portrait frame, character occupies 75% vertically,
shifty conspiratorial mood, MTG portrait illustration quality,
no text, no watermark, no signature, no border frame
```

---

### Tranche étage 9

#### `bill_weasley` — Bill Weasley (donneur 3 quêtes)
**Fichier cible** : `img/npc/bill_weasley.png`
**Personnage** : briseur de sortilèges Gringotts, cicatrices Greyback sur le visage, roux Weasley, queue de cheval.

```
Portrait of Bill Weasley from Harry Potter (eldest Weasley son), bust shot, 3/4 face turn,
young man in his late twenties, long red hair tied back in a low ponytail,
fang earring in one ear, three diagonal claw scars across left cheek and jaw (Greyback's mark),
warm hazel eyes with weathered resolve, slight stubble, faint smile despite scars,
dark dragon-leather curse-breaker jacket with metallic clasps,
weathered curse-breaker amulet visible at neck,
warm directional lighting from upper-left highlighting the scars,
gentle blue rim light, soft dark contextual background of underground stone arches,
painterly digital concept art, Harry Potter universe style,
256x256 portrait frame, character occupies 75% vertically,
roguish charm with hard-earned wisdom, MTG portrait illustration quality,
no text, no watermark, no signature, no border frame
```

---

#### `apothicaire_tenebreux` — Apothicaire Ténébreux (vendeur étage 9)
**Fichier cible** : `img/npc/apothicaire_tenebreux.png`
**Personnage** : marchand d'élixirs et matériaux interdits, vit dans l'arrière-boutique.

```
Portrait of a dark apothecary merchant in Harry Potter universe,
bust shot, 3/4 face, gaunt elderly woman in her sixties,
long iron-grey hair tied in a severe braid,
sharp angular face with knowing crow's-feet eyes,
pale skin marked with faint potion burns on cheek and neck,
dark grey robes with rolled-up sleeves, leather apron stained with phials and herbs,
one bony hand holding up a tiny vial of glowing green liquid for inspection,
warm candle-orange lighting from below highlighting the vial, cold rim light from behind,
soft dark contextual background suggesting cluttered apothecary shelves,
painterly digital concept art, Harry Potter universe style,
256x256 portrait frame, character occupies 75% vertically,
shrewd calculating expression, MTG portrait illustration quality,
no text, no watermark, no signature, no border frame
```

---

### Tranche étage 10

#### `sirius_esprit` — Esprit de Sirius Black (donneur 3 quêtes, fantôme)
**Fichier cible** : `img/npc/sirius_esprit.png`
**Personnage** : Sirius Black post-mortem, fantôme bleu-argenté translucide, expression douce-amère.

```
Portrait of Sirius Black as a ghost in Harry Potter universe, bust shot, 3/4 face turn,
translucent silvery-blue spectral form of mid-thirties man (appears as he was at death),
long messy dark hair, gaunt aristocratic face hollowed by Azkaban years,
piercing grey eyes glowing pale cyan with otherworldly light,
ghostly tattered Azkaban prisoner shirt, faint silver outline around the body,
posture relaxed but melancholic, ghost of a smirk on the lips,
ethereal soft lighting from within the spectral body, no harsh shadows,
silvery-blue palette with cyan inner glow,
soft dark contextual background suggesting the Veil chamber stone arches,
fully translucent appearance, body slightly fading at edges into mist,
painterly digital concept art, Harry Potter universe style,
256x256 portrait frame, character occupies 75% vertically,
bittersweet protective presence, MTG portrait illustration quality,
no text, no watermark, no signature, no border frame
```

---

#### `forgeron_tenebreux` — Forgeron Ténébreux (vendeur étage 10)
**Fichier cible** : `img/npc/forgeron_tenebreux.png`
**Personnage** : armurier intimidant des dernières heures, vend Essence et Page à prix prohibitifs.

```
Portrait of a dark forge-master merchant in Harry Potter universe,
bust shot, 3/4 face, massively-built bearded man in his fifties,
shaven head with prominent brow scars, thick braided black beard with iron beads,
intense amber eyes lit by forge light from below, soot streaks on cheeks,
heavy burned leather apron over chain-mail shirt, scorched gauntlets visible,
massive forge hammer resting on shoulder visible at frame edge,
glowing orange forge light from below illuminating face from underneath,
cold blue rim light from behind for dramatic contrast,
warm orange and deep black palette, sparks of forge embers in the air,
soft dark contextual background suggesting underground forge,
painterly digital concept art, Harry Potter universe style,
256x256 portrait frame, character occupies 75% vertically,
intimidating dwarven-blacksmith aesthetic, MTG portrait illustration quality,
no text, no watermark, no signature, no border frame
```

---

## Récapitulatif fichiers cibles

| # | ID | Fichier | Type |
|---|----|---------|------|
| 1 | `fenrir_greyback` | `img/monsters/fenrir_greyback.png` | monstre 512×512 RGBA |
| 2 | `veilleur_seuil` | `img/monsters/veilleur_seuil.png` | monstre 512×512 RGBA |
| 3 | `loup_garou_adulte` | `img/monsters/loup_garou_adulte.png` | monstre 512×512 RGBA |
| 4 | `auror_corrompu` | `img/monsters/auror_corrompu.png` | monstre 512×512 RGBA |
| 5 | `aragog` | `img/monsters/aragog.png` | monstre 512×512 RGBA |
| 6 | `maitre_detraqueur` | `img/monsters/maitre_detraqueur.png` | monstre 512×512 RGBA |
| 7 | `acromantule_adulte` | `img/monsters/acromantule_adulte.png` | monstre 512×512 RGBA |
| 8 | `detraqueur_elite` | `img/monsters/detraqueur_elite.png` | monstre 512×512 RGBA |
| 9 | `antonin_dolohov` | `img/monsters/antonin_dolohov.png` | monstre 512×512 RGBA |
| 10 | `heraut_tenebres` | `img/monsters/heraut_tenebres.png` | monstre 512×512 RGBA |
| 11 | `mangemort_veteran` | `img/monsters/mangemort_veteran.png` | monstre 512×512 RGBA |
| 12 | `spectre_renforce` | `img/monsters/spectre_renforce.png` | monstre 512×512 RGBA |
| 13 | `kingsley` | `img/npc/kingsley.png` | portrait 256×256 RGB |
| 14 | `marchand_clandestin` | `img/npc/marchand_clandestin.png` | portrait 256×256 RGB |
| 15 | `bill_weasley` | `img/npc/bill_weasley.png` | portrait 256×256 RGB |
| 16 | `apothicaire_tenebreux` | `img/npc/apothicaire_tenebreux.png` | portrait 256×256 RGB |
| 17 | `sirius_esprit` | `img/npc/sirius_esprit.png` | portrait 256×256 RGB |
| 18 | `forgeron_tenebreux` | `img/npc/forgeron_tenebreux.png` | portrait 256×256 RGB |

## Critères d'acceptation par asset

Avant remplacement du placeholder :

**Monstres** (cf. IMG_STYLE.md §9) :
- [ ] Alpha propre (pas de halo blanc/gris) — zoom 400 % sur fond noir
- [ ] Cadrage 75-85 %, marge ≥ 8 % partout
- [ ] Silhouette reconnaissable à 80×80 px
- [ ] Palette conforme à la catégorie
- [ ] Posture non-statique, regard intentionnel
- [ ] Poids < 350 KB après `oxipng -o 4`

**Portraits NPC** :
- [ ] Format 256×256 exact
- [ ] Visage net, expression cohérente avec la personnalité dialogue
- [ ] Pas de fond transparent (le runtime affiche dans modal dark)
- [ ] Poids < 150 KB

## Smoke test post-intégration

Après remplacement des PNG :
```bash
node tests/smoke.js  # scénarios 5 (portraits monstres) + 27 (loader) doivent passer
```

Le scénario 5 vérifie que chaque `imgSrc` dans `monsters.js` pointe vers un fichier existant. Les remplaceurs PNG ne changent pas le contrat, donc tout doit rester vert.
