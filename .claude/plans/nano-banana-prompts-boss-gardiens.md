# Prompts Nano Banana — 4 Boss-Gardiens des Chambres des Fondateurs

> 4 prompts complets pour l'art PNG des boss-gardiens (Phase 3, code livré
> #560/#563/#567 ; reste l'art — fallback SVG catégorie en place).
> Cibles : `gardien_{lion,serpent,aigle,blaireau}` (`js/monsters.js`),
> `category: "être magique"`, `loreFamily: F5`, `minFloor: 17` (Cœur runique,
> zone D, Boucle Ténébreuse).
>
> Style ancré dans [`IMG_STYLE.md`](../../IMG_STYLE.md) (Règle A — sprites 512²
> painterly, fond transparent). Format identique au sprint étages 8-10 :
> [`nano-banana-prompts-floor-8-10.md`](./nano-banana-prompts-floor-8-10.md).

---

## ⚠️ RÈGLES DE CADRAGE OBLIGATOIRES (lire avant chaque prompt)

Nano Banana zoome agressivement par défaut. Pour ces 4 gardiens (figures
humanoïdes debout, vue 3/4 du combat), **forcer le cadrage** :

| Élément à inclure | Effet |
|--------------------|-------|
| `head to toe in frame, feet fully visible` | Empêche de couper aux jambes |
| `wide shot, distant framing` | Recule la caméra |
| `subject occupies ~72% of frame, ample empty space above head and below feet` | Force marge ≥ 12 % |
| `complete silhouette, no cropping of limbs` | Anti-crop explicite |
| `centered figure, full standing pose visible` | Anti-zoom |

Si après génération la figure est encore coupée → ajouter à la fin :
`zoom out, show full character including extremities`.

**Cohérence d'Identité (les 4 sont une fratrie)** : même posture-archétype
(gardien massif planté au seuil, garde défensive), même échelle (~3 m), même
matériau de base (construct rituel scellé par le Fondateur). Ce qui les
**distingue** = la palette de Maison + l'élément + l'emblème incrusté. Garder
le **même angle de lumière** (upper-left dramatique) sur les 4 pour qu'ils se
lisent en série dans le bestiaire.

---

## Suffix universel à coller à TOUS les prompts
```
no text, no watermark, no signature, no border frame, no ground line, no ground shadow,
fully transparent background, 512x512, painterly digital concept art,
MTG illustration quality, no cropping of limbs, complete figure visible
```

Palettes de Maison standardisées (cf. `CLAUDE.md` « Palettes Maison ») :
Gryffondor rouge `#740001` + or `#d3a625` · Serpentard vert `#1a472a` +
argent `#aaaaaa` · Serdaigle bleu `#0e1a40` + bronze `#946b2d` · Poufsouffle
brun `#372e29` + or `#f0c75e`.

---

### `gardien_lion` — Gardien de la Chambre du Lion 🦁 (Gryffondor, feu)
**Fichier cible** : `img/monsters/gardien_lion.png`
**Lore** : armure de braise façonnée par la volonté de Godric pour tenir la
porte ; ne recule jamais. Brute → capacité Broyer auto. Résiste feu, faible glace.

```
Concept art digital painting of an ancient guardian construct of living embers in the Harry Potter universe,
wide shot, head to toe in frame, both armored feet planted firmly on invisible ground,
complete towering 3-meter humanoid warden forged from blackened iron plate armor glowing with molten cracks,
heavy lion-faced helm with a flowing mane of fire, burning ember eyes,
ornate Gryffondor lion crest embossed and glowing on the breastplate,
broad pauldrons shaped like roaring lion heads, gauntleted fists wreathed in flame held in a guarding stance,
seams between armor plates radiating orange furnace light, cinders rising from the shoulders,
massive armored legs visible from hip to sabatons, greaves cracked with inner fire,
upper-left dramatic lighting with warm ember glow and a faint cold blue rim light on the helm,
palette: deep crimson red #740001, blackened iron, molten orange, brilliant gold #d3a625 crest accents,
fully transparent background, no ground shadow,
subject occupies 72% of 512x512 square frame with 14% margin top and bottom,
imposing immovable silhouette fully visible from crown to feet, painterly brush strokes, no outline,
complete silhouette, no cropping of limbs, MTG concept art,
no text, no watermark, no signature, no border frame
```

---

### `gardien_serpent` — Gardien de la Chambre du Serpent 🐍 (Serpentard, ténèbres)
**Fichier cible** : `img/monsters/gardien_serpent.png`
**Lore** : ombre lovée où Salazar scella sa ruse qui frappe d'abord ; caster
poison/drain. Résiste ténèbres, faible lumière. Posture sournoise, garde basse.

```
Concept art digital painting of a coiled shadow guardian in the Harry Potter universe,
wide shot, head to toe in frame, lower body resolving into a thick serpentine coil resting on invisible ground,
complete looming 3-meter humanoid sentinel of dark green-black scaled armor and living shadow,
sleek hooded serpent-faced helm with slit silver eyes glowing cold, two long curved venom fangs,
ornate Serpentard snake emblem coiled in silver on the chest plate,
sinewy clawed hands trailing dripping green venom, one hand raised low in a treacherous ready stance,
wisps of dark mist coiling around the body, scaled tail-coil instead of feet anchoring the lower frame,
upper-left dramatic lighting with sickly green underglow and a cold blue rim light on the hood,
palette: deep emerald green #1a472a, black scales, toxic acid green venom, brushed silver #aaaaaa accents,
fully transparent background, no ground shadow,
subject occupies 72% of 512x512 square frame with 14% margin top and bottom,
sinister complete silhouette fully visible from crown to coil tip, painterly brush strokes, no outline,
complete figure, no cropping of limbs, MTG concept art,
no text, no watermark, no signature, no border frame
```

---

### `gardien_aigle` — Gardien de la Chambre de l'Aigle 🦅 (Serdaigle, foudre)
**Fichier cible** : `img/monsters/gardien_aigle.png`
**Lore** : sentinelle de runes vives ; Rowena ne laissa pas un mur mais une
question — foudroie qui force ce qu'il n'a pas su lire. Caster foudre, résiste
foudre, faible physique. Élancé, glyphes lumineux.

```
Concept art digital painting of a runic sentinel guardian in the Harry Potter universe,
wide shot, head to toe in frame, both slender taloned feet planted on invisible ground,
complete slender 3-meter humanoid warden of pale carved bluestone wrapped in floating glowing rune-glyphs,
eagle-beaked helm crowned with a fan of bronze feather-blades, eyes burning bright electric blue,
ornate Serdaigle eagle emblem etched in bronze on the chest, wings of crackling lightning arcing from the shoulder-blades,
long arms ending in clawed hands, one hand raised channeling a spark of canalized lightning,
engraved runes pulsing cyan-white across chest, forearms and forehead (integrated into the stone, not floating clutter),
upper-left dramatic lighting with electric blue glow and a faint warm bronze rim light,
palette: deep midnight blue #0e1a40, pale bluestone, electric cyan-white lightning, antique bronze #946b2d accents,
fully transparent background, no ground shadow,
subject occupies 72% of 512x512 square frame with 14% margin top and bottom,
elegant imposing complete silhouette fully visible from crown to feet, painterly brush strokes, no outline,
complete figure, no cropping of limbs, MTG concept art,
no text, no watermark, no signature, no border frame
```

---

### `gardien_blaireau` — Gardien de la Chambre du Blaireau 🦡 (Poufsouffle, physique)
**Fichier cible** : `img/monsters/gardien_blaireau.png`
**Lore** : colosse patient ; Helga ne creusa pas une forteresse mais un abri —
encaisse pour que d'autres tiennent. Tank, soin/weaken. Résiste physique+glace,
faible feu. Trapu, robuste, posture défensive.

```
Concept art digital painting of a patient colossus guardian in the Harry Potter universe,
wide shot, head to toe in frame, both broad heavy feet planted solidly on invisible ground,
complete massive squat 3-meter humanoid warden of thick earthen bronze plating and packed clay over a stocky frame,
broad badger-faced helm with a low protective brow, calm steady amber eyes,
ornate Poufsouffle badger emblem embossed in gold on a huge round chest plate,
enormous tower-shield-like forearms crossed in a patient defensive guarding stance,
moss, warm lantern light and small living roots threaded through the lower armor and feet,
sturdy trunk-like legs visible from hip to feet, heavy rounded sabatons,
upper-left dramatic lighting with warm golden hearth glow and a soft cool rim light,
palette: warm earthen brown #372e29, aged bronze, mossy green, honey gold #f0c75e accents,
fully transparent background, no ground shadow,
subject occupies 72% of 512x512 square frame with 14% margin top and bottom,
sturdy immovable complete silhouette fully visible from crown to feet, painterly brush strokes, no outline,
complete figure, no cropping of limbs, MTG concept art,
no text, no watermark, no signature, no border frame
```

---

## Câblage APRÈS génération (checklist — PR séparée, touche `js/`)

Une fois les 4 PNG produits et déposés dans `img/monsters/` :

1. **Détourage** si la source arrive sur fond damier aplati (Nano Banana RGB
   sans alpha) :
   ```bash
   python3 tools/dechecker_png.py <src.png> img/monsters/gardien_lion.png
   ```
   (idem serpent / aigle / blaireau). Vérifier 512×512 RGBA, marge ≥ 12 %.
2. **Enregistrer `imgSrc`** sur chacune des 4 entrées de `js/monsters.js`
   (modèle `gardien_portail` : `imgSrc: "img/monsters/gardien_lion.png"`).
   Le moteur (`_getMonsterImg`, `renderer-entities.js`) bascule alors du
   fallback SVG vers le PNG ; fallback vectoriel conservé tant que l'image
   n'a pas chargé.
3. **Bump cache PWA** (skill `cache-bump`) : `js/monsters.js` modifié →
   bumper son `?v=N` (index.html + `PRECACHE_URLS` de `sw.js`) + `CACHE_VERSION`.
4. **Tests** : `node tests/smoke.js` (sur `file://`, les PNG chargent
   nativement ; aucun scénario ne dépend de ces ids → doit rester vert) +
   `node tools/check_cache_versions.js --base origin/master`.
5. **Doc** : retirer la mention « Art : fallback SVG catégorie en attendant le
   PNG dédié » de `CLAUDE.md` (section monstres, ligne des 4 Gardiens) une fois
   les 4 PNG livrés.

> Note : la génération d'image elle-même est hors de portée de cet agent
> (pas d'outil de génération raster) — ce fichier fournit les **prompts** prêts
> à coller dans Nano Banana / Gemini, et la checklist de câblage à exécuter
> ensuite.
