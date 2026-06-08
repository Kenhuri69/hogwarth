# Prompts Nano Banana — Sprint endgame étages 8-10 (v2)

> 18 prompts complets pour les assets ajoutés par PRs #241/#242/#243.
> **v2 — fix cadrage** : la v1 produisait des figures coupées aux jambes
> (« full body » interprété de façon souple par Nano Banana). v2 force
> head-to-toe avec marge explicite.
>
> Style ancré dans [`IMG_STYLE.md`](../../IMG_STYLE.md) (templates §8.1/§8.2/§8.3).

---

## ⚠️ RÈGLES DE CADRAGE OBLIGATOIRES (lire avant chaque prompt)

Nano Banana zoome agressivement par défaut. Pour les monstres `512×512` qui
doivent montrer la figure entière (vue 3/4 du combat), il faut **forcer le
cadrage** avec ces phrases dans CHAQUE prompt :

| Élément à inclure | Effet |
|--------------------|-------|
| `head to toe in frame, feet fully visible` | Empêche de couper aux jambes |
| `wide shot, distant framing` | Recule la caméra |
| `subject occupies 65-75% of frame, ample empty space above head and below feet` | Force marge ≥ 12 % |
| `complete silhouette, no cropping of limbs` | Anti-crop explicite |
| `centered figure, full standing pose visible` | Anti-zoom |

**À l'inverse**, pour les fantômes/créatures qui flottent ou rampent :
- Remplacer « feet fully visible » par `entire form visible from top to trailing mist`
- Pour Aragog/Acromantule : `all eight legs fully visible, complete spider silhouette`

Si après génération la figure est encore coupée → ajouter à la fin :
`zoom out, show full character including extremities`.

---

## Monstres (12) — 512×512 RGBA, fond transparent

### Suffix universel à coller à TOUS les prompts monstres
```
no text, no watermark, no signature, no border frame, no ground line, no ground shadow,
fully transparent background, 512x512, painterly digital concept art,
MTG illustration quality, no cropping of limbs, complete figure visible
```

---

### Tranche étage 8 « Le Seuil »

#### `fenrir_greyback` — Fenrir Greyback (boss canon, `humain`)
**Fichier cible** : `img/monsters/fenrir_greyback.png`
**Template** : §8.2 (humain) avec accents bestiaux
**Lore** : loup-garou humanoïde mature, contaminateur enfantin, allié de Voldemort.

```
Concept art digital painting of Fenrir Greyback in Harry Potter universe,
wide shot, head to toe in frame, feet fully visible standing on invisible ground,
complete standing figure in threatening crouched stance, knees slightly bent,
mature lycanthrope man in his fifties, wild matted grey hair, long yellowed fangs bared in a snarl,
deep facial scars, blood-stained jaw, filthy torn rags revealing scarred muscular chest,
ragged trousers torn at the knees, bare clawed feet visible at the bottom of frame,
clawed hands raised threateningly, body half-shifted between man and wolf,
dramatic upper-left lighting with cold blue rim light catching the fangs,
palette: ash grey, dirty brown, dried blood crimson, sickly yellow eyes,
fully transparent background, no shadow on ground,
subject occupies 70% of 512x512 square frame with 15% margin top and bottom,
centered full figure, painterly brush strokes, no outline, MTG concept art quality,
complete silhouette visible, no cropping of limbs,
no text, no watermark, no signature, no border frame
```

---

#### `veilleur_seuil` — Veilleur du Seuil (boss original, `être magique`)
**Fichier cible** : `img/monsters/veilleur_seuil.png`
**Template** : §8.2 adapté + runes lumineuses (§6)
**Lore** : colosse runique scellé dans la pierre par des sorciers oubliés, garde les passages.

```
Concept art digital painting of an ancient stone golem warden, full standing pose,
wide shot, head to toe in frame, both stone feet planted firmly on invisible ground,
complete towering 3-meter humanoid sculpted from cracked granite blocks,
ornate engraved runes pulsing with cold cyan light across chest, shoulders and forehead,
arms crossed in guardian stance over chest, head slightly lowered, eyes burning pale blue,
massive stone legs visible from hip to feet, blocky armored kneepads,
moss and lichen on lower body and feet, weathered surfaces with chipped edges,
glowing rune seals integrated into stone volume (not floating),
upper-left dramatic lighting, cool cyan rim accent,
palette: weathered grey stone, mossy green, pulsing cyan runes, deep slate shadows,
fully transparent background, no ground shadow,
subject occupies 75% of 512x512 square frame with 12% margin top and bottom,
massive imposing silhouette fully visible from crown to toes, painterly style,
no cropping of body parts, MTG concept art,
no text, no watermark, no signature, no border frame
```

---

#### `loup_garou_adulte` — Loup-Garou Adulte (appoint, `bête`)
**Fichier cible** : `img/monsters/loup_garou_adulte.png`
**Template** : §8.1 (bête) — quadrupède en pose dynamique
**Lore** : loup-garou en pleine maturité, sans Tue-Loup, version brute du loup_garou existant.

```
Concept art digital painting of a mature adult werewolf, Harry Potter universe style,
wide shot complete quadrupedal silhouette, all four paws visible in frame,
mid-leap pose, body angled diagonally, head forward and tail trailing behind,
muscular wolf body the size of a horse, matted grey-brown fur with silver tips,
elongated muzzle bared with bloody fangs, glowing yellow eyes,
torn human clothing scraps still hanging from one shoulder,
3/4 dynamic view, complete from snout to tail tip and all four claws,
soft directional light from upper-left, cold cyan rim light,
warm earth palette: ash grey fur, dirty brown undercoat, amber yellow eyes,
fully transparent background, no ground shadow, no border,
centered creature filling 75% of square frame, 12% margin all sides,
512x512, painterly brush strokes, complete predator silhouette no cropping,
MTG illustration quality,
no text, no watermark, no signature
```

---

#### `auror_corrompu` — Auror Corrompu (appoint, `humain`)
**Fichier cible** : `img/monsters/auror_corrompu.png`
**Template** : §8.2 (humain)
**Lore** : Auror retourné par les Ténèbres, magie autrefois protectrice virée au noir.

```
Concept art digital painting of a corrupted Auror in Harry Potter universe,
wide shot, head to toe in frame, both feet planted on invisible ground,
complete standing figure mid-cast pose with one arm extended forward holding a wand,
former Auror robes now tattered and stained black hanging down to dirty boots,
adult man with hollow shadowed eyes, sickly pale skin, faint dark veins on temples and hand,
sigil of the Dark Mark visible on inner forearm,
wand tip emitting a translucent purple-black wisp,
dark trousers visible below the torn robe, scuffed black boots at the bottom of frame,
dramatic upper-left lighting with violet rim light from the cast spell,
palette: deep charcoal robes, oxidized silver trim, sickly pallor, purple curse glow,
fully transparent background, no shadow on ground,
subject occupies 70% of 512x512 square frame with 15% margin top and bottom,
centered standing full figure, painterly style, complete silhouette no cropping,
MTG concept art quality,
no text, no watermark, no signature, no border frame
```

---

### Tranche étage 9 « Les Profondeurs »

#### `aragog` — Aragog (boss canon, `créature`)
**Fichier cible** : `img/monsters/aragog.png`
**Template** : §8.1 (créature multipattes)
**Lore** : chef Acromantule de la Forêt Interdite, élevé par Hagrid, 60+ ans, massif.

```
Concept art digital painting of Aragog the Acromantula king, Harry Potter universe,
wide shot complete spider silhouette, all eight legs fully visible spread wide,
gigantic ancient spider the size of a small elephant, 3/4 view,
body raised on front legs in threat display, rear legs braced behind,
eight large milky-glowing eyes (signs of age) reflecting cold light,
massive chitinous mandibles dripping venom, dense black bristly hair on body,
front legs raised showing pale underbelly with battle scars,
all eight long jointed legs fully in frame from base joint to clawed tips,
soft directional light from upper-left, cold cyan rim light through bristles,
dark earth palette: jet black exoskeleton, mossy green-brown bristles, pale ivory mandibles,
glowing yellow-white blind eyes (cataract-clouded from old age),
fully transparent background, no ground shadow, no border,
creature filling 75% of 512x512 square frame, 12% margin all sides,
all eight legs visible no leg cropping at edges,
painterly brush strokes, intimidating complete silhouette, MTG illustration quality,
no text, no watermark, no signature
```

---

#### `maitre_detraqueur` — Maître des Détraqueurs (boss original, `être magique`)
**Fichier cible** : `img/monsters/maitre_detraqueur.png`
**Template** : §8.3 (fantôme/éthéré)
**Lore** : figure tutélaire des Détraqueurs d'Azkaban, plus grand et plus avide que ses subordonnés.

```
Concept art digital painting of the Master of Dementors, Harry Potter universe,
wide shot complete wraith form, hood at top to trailing mist tail at bottom of frame,
towering 3-meter hooded specter floating above invisible ground,
billowing dark tattered cloak extending from raised hood down to wispy mist trail at frame bottom,
deep empty hood swallowing all light, no face visible — only a void
where the face should be, faint silver mist seeping out,
skeletal grey hands with elongated fingers emerging from sleeves at chest height,
lower body and cloak hem dissolving into translucent black mist trailing downward to bottom of frame,
floating posture with arms slightly spread, summoning aura of despair,
soft volumetric light, ethereal cold cyan glow at edges of cloak,
silvery blue palette with deep void-black core, cyan rim glow,
fully transparent background — preserve translucent areas in alpha,
no shadow on ground, no border,
complete spectral figure centered in 512x512 frame, occupying 75% vertically,
top of hood and trailing mist both visible inside frame with 12% margin,
ethereal painterly style, complete oppressive presence,
MTG-quality illustration,
no text, no watermark, no signature
```

---

#### `acromantule_adulte` — Acromantule Adulte (appoint, `créature`)
**Fichier cible** : `img/monsters/acromantule_adulte.png`
**Template** : §8.1 (créature multipattes)
**Lore** : Acromantule mature taille cheval, progéniture d'Aragog (donc plus jeune que lui).

```
Concept art digital painting of an adult Acromantula spider, Harry Potter universe,
wide shot complete spider silhouette, all eight legs fully visible in frame,
giant spider the size of a horse, 3/4 dynamic charging pose,
eight black gleaming healthy eyes (NOT clouded like Aragog),
dense black bristly hair across body and legs, clean wet chitin shine,
sharp curved mandibles open showing fangs, fresh venom drip,
front legs forward in attack posture, rear legs braced behind, mid-legs spread sideways,
every leg visible from base joint to claw tip, no leg cut at frame edge,
soft directional light from upper-left, cool cyan rim on legs,
dark earth palette: glossy jet black, deep brown undertones, amber-red eyes,
fully transparent background, no ground shadow, no border,
creature filling 75% of 512x512 square frame, 12% margin all sides,
painterly brush strokes, complete predatory silhouette no cropping,
MTG illustration quality,
no text, no watermark, no signature
```

---

#### `detraqueur_elite` — Détraqueur d'Élite (appoint, `être magique`)
**Fichier cible** : `img/monsters/detraqueur_elite.png`
**Template** : §8.3 (fantôme)
**Lore** : Détraqueur vétéran d'Azkaban, version plus dense des gardiens standards.

```
Concept art digital painting of an elite Dementor, Harry Potter universe,
wide shot complete wraith form, hood at top to trailing mist tail at bottom of frame,
tall 2.5-meter hooded specter floating, layered dark ragged cloak with reinforced shoulders,
cloak extending from raised hood down to wispy mist trail at frame bottom,
deep void hood with no visible face, faint silver soul-mist rising from the hood opening,
one skeletal grey hand outstretched palm-up at chest height summoning frost particles,
lower body and tattered cloak hem trailing into translucent black smoke at bottom of frame,
hovering posture with subtle menacing tilt forward,
soft volumetric cold light from upper-left, ethereal cyan glow at cloak edges,
palette: deep black-blue cloak, silvery cyan accents, void-black hood interior,
fully transparent background — preserve translucent mist in alpha,
no ground shadow, no border,
complete floating specter centered in 512x512 frame, 75% vertical occupation,
top of hood and bottom mist both visible inside frame with 12% margin,
ethereal painterly style, complete oppressive cold aura no cropping,
MTG illustration quality,
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
wide shot, head to toe in frame, both feet planted on invisible ground,
complete standing figure mid-cast pose tracing his signature violet curve in the air,
tall gaunt eastern european man with long dark hair tied back, sharp angular face,
twisted thin smile, dark sunken eyes, prominent cheekbones,
black Death Eater robes hanging from shoulders to ankles, silver clasps,
mask removed and hanging from belt, dark trousers and boots visible below robe hem,
wand extended drawing a glowing translucent violet S-curve in mid-air beside him,
Dark Mark visible on inner forearm,
dramatic upper-left lighting with violet rim light from the spell trace,
palette: deep black robes, oxidized silver accents, violet magical glow, pale skin,
fully transparent background, no shadow on ground,
subject occupies 70% of 512x512 square frame with 15% margin top and bottom,
centered standing full figure, complete silhouette no cropping of limbs,
painterly style, MTG concept art quality, menacing intent in posture,
no text, no watermark, no signature, no border frame
```

---

#### `heraut_tenebres` — Héraut des Ténèbres (boss original, `être magique`)
**Fichier cible** : `img/monsters/heraut_tenebres.png`
**Template** : §8.3 hybride (être magique éthéré + objet rituel)
**Lore** : annonciateur de la résurrection de Voldemort, sonne un cor d'os qui corrompt l'air.

```
Concept art digital painting of the Herald of Darkness, Harry Potter universe original creation,
wide shot complete figure, hood at top to trailing mist robes at bottom of frame,
tall 2.5-meter hooded figure floating above invisible ground,
deep velvet black robes embroidered with silver runes,
robes extending from hood down to wispy black mist trail at frame bottom,
hood pulled forward casting full shadow over the face — only two glowing crimson pinpoints visible,
both gauntleted hands gripping a massive carved bone horn raised to the hood,
the horn etched with arcane runes glowing faint violet,
visible breath of dark mist emanating from the horn's bell,
floating slightly above ground, lower robes dissolving into black smoke at bottom of frame,
soft volumetric light, dramatic violet rim accent from the runes,
palette: deep velvet black, oxidized silver embroidery, bone-ivory horn, violet rune glow, crimson eye pinpoints,
fully transparent background — preserve mist translucency in alpha,
no shadow on ground, no border,
complete imposing figure centered in 512x512 frame, 75% vertical occupation,
top of hood and mist hem both visible with 12% margin,
painterly digital style, ritualistic threatening presence no cropping,
MTG illustration quality,
no text, no watermark, no signature
```

---

#### `mangemort_veteran` — Mangemort Vétéran (appoint, `humain`)
**Fichier cible** : `img/monsters/mangemort_veteran.png`
**Template** : §8.2 (humain)
**Lore** : Mangemort de la première heure, marqué depuis la Première Guerre, cruauté intacte.

```
Concept art digital painting of a veteran Death Eater, Harry Potter universe,
wide shot, head to toe in frame, both feet planted on invisible ground,
complete standing figure casting Cruciatus mid-pose with wand extended forward,
aging man in late fifties, hardened lined face, greying hair pulled back,
white serpent-mouthed Death Eater mask pushed up onto forehead revealing scarred face,
weathered black robes hanging from shoulders to ankles, silver fastenings tarnished,
dark trousers visible below robe hem, scuffed black boots at bottom of frame,
visible Dark Mark on inner forearm, faded but still vivid,
crackling violet magical energy at wand tip with translucent purple sparks,
dramatic upper-left lighting with cold cyan rim, violet glow from the spell,
palette: aged black fabric, oxidized silver, pale lined skin, vivid violet curse-light,
fully transparent background, no ground shadow,
subject occupies 70% of 512x512 square frame with 15% margin top and bottom,
centered standing full figure complete silhouette no cropping,
painterly style, MTG concept art quality, cruel intent in expression,
no text, no watermark, no signature, no border frame
```

---

#### `spectre_renforce` — Spectre Renforcé (appoint, `fantôme`)
**Fichier cible** : `img/monsters/spectre_renforce.png`
**Template** : §8.3 (fantôme)
**Lore** : esprit corrompu plus dense, vestige d'un sorcier puissant retenu dans les Profondeurs.

```
Concept art digital painting of an empowered specter, Harry Potter ghost type,
wide shot complete spectral form, head at top to trailing mist tail at bottom of frame,
translucent floating wraith of a former wizard in tattered ceremonial robes,
robes extending from shoulders down to wispy mist trail at frame bottom,
posture leaning forward arms extended toward viewer fingers crooked for a drain spell,
gaunt skull-like face with deep eye sockets glowing cold blue-white,
faint silver outline around the body indicating denser-than-normal ghost matter,
lower body fading to mist with whispy tendrils that touch the bottom of the frame,
chest area showing translucent glow of trapped soul-light,
silvery blue palette with cyan core glow, cold cyan rim light,
soft volumetric light, ethereal but more solid than a typical ghost,
fully transparent background — preserve translucent body in alpha,
no ground shadow, no border,
complete floating specter centered in 512x512 frame, 75% vertical occupation,
top of head and bottom mist both visible inside frame with 12% margin,
ethereal painterly style, vengeful focused presence no cropping,
MTG-quality illustration,
no text, no watermark, no signature
```

---

## Portraits NPC (6) — 256×256 RGB, fond opaque OK

> Format différent des monstres : cadrage **buste/épaules**, fond uni ou doux
> (cf. `img/npc/lockhart.png` — fond sombre uni).
> **Pas affecté par le fix v2** : un buste tient nativement dans 256×256.

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

**Monstres** (cf. IMG_STYLE.md §9 + fix v2) :
- [ ] **Cadrage v2** : tête ET pieds (ou trailing mist) visibles dans le frame
- [ ] Alpha propre (pas de halo blanc/gris) — zoom 400 % sur fond noir
- [ ] Marge ≥ 12 % sur les 4 côtés
- [ ] Silhouette reconnaissable à 80×80 px
- [ ] Palette conforme à la catégorie
- [ ] Posture non-statique, regard intentionnel
- [ ] Poids < 350 KB après `oxipng -o 4`

**Portraits NPC** :
- [ ] Format 256×256 exact
- [ ] Visage net, expression cohérente avec la personnalité dialogue
- [ ] Pas de fond transparent (le runtime affiche dans modal dark)
- [ ] Poids < 150 KB

## Si Nano Banana zoome encore trop

Suffix de secours à ajouter en fin de prompt :
```
zoom out, far camera, show full character including head and feet,
ensure complete figure with empty space around it,
no close-up, no crop
```

## Smoke test post-intégration

Après remplacement des PNG :
```bash
node tests/smoke.js  # scénarios 5 (portraits monstres) + 27 (loader) doivent passer
```
