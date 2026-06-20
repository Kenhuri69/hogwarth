# Prompts Nano Banana — icônes d'items de récompense (Boucle, suivi 3)

> 4 **icônes d'objet** pour les quêtes des PNJ de la Boucle (plan
> `loop-npc-quests-suivi3.md`). Famille **objet/icône** (≠ sprite monstre,
> ≠ portrait PNJ).
>
> **⚠️ L'image se génère hors environnement** (Nano Banana). Ce fichier ne
> produit pas les PNG — il fournit les prompts prêts à l'emploi.

## Cadre commun (à respecter pour les 4)

- **Sortie** : PNG **512×512**, **fond 100% transparent (alpha strict)**.
- **Sujet** : un **seul objet**, centré, occupant **75–85%** du cadre, marge
  ≥ 8% sur les 4 côtés, le sujet ne touche jamais les bords.
- **Style** : digital painting **concept-art Harry Potter / Magic: the
  Gathering** — coups de pinceau visibles, matière lisible, pas de
  photoréalisme, pas de cartoon, pas de pixel art. **Pas de cerne noir**
  (séparation par la valeur). Silhouette lisible à 64×64 px.
- **Lumière** : source principale **haut-gauche (~45°)**, ombre portée douce
  vers le bas-droite, **rim-light** subtil sur l'arête opposée, un point
  spéculaire net.
- **Halo de rareté** : très léger glow coloré derrière l'objet (voir chaque
  item), **non opaque**, qui ne crée PAS de fond rectangulaire.
- **Interdits** (negative) : aucun texte, lettre, chiffre, watermark, cadre,
  bordure, main, personnage, décor d'arrière-plan, sol, table, ombre
  rectangulaire, multiple objets, mockup, UI.

> Intégration : si le générateur sort un fond damier aplati →
> `python3 tools/dechecker_png.py <src> img/icons_new/<id>_512.png` ; puis
> mipmaps 64/48/32/24/16 (Lanczos) → `img/icons_new/<id>_<size>.png` ;
> puis entrée `ITEM_ICON_NEW_REGISTRY` (item-icons.js) + bump cache.

---

## 1. `perle_mimi` — « Perle de Larmes de Mimi » (amulette, épique)

**Prompt :**
> Painterly fantasy game item icon, Magic-the-Gathering concept-art style, on a
> fully transparent background. A single haunted teardrop pendant: a large
> luminous pearl-like gem the colour of pale ghost-blue water, shaped like a
> frozen teardrop, hanging from a thin tarnished silver chain that loops at the
> top. Faint wisps of translucent spectral mist curl around the gem; tiny
> droplets of glowing water bead on its surface as if perpetually weeping.
> Cold moonlit palette — spectral blue, silver, hints of drowned green. Soft
> top-left 45° lighting, gentle specular highlight on the pearl, soft drop
> shadow lower-right. Subtle ethereal blue rarity glow behind the pendant
> (epic), not opaque. Centered, 75–85% of frame, ≥8% margin. No text, no frame,
> no hand, no background scene. 512×512, transparent PNG.

Slot conseillé : `amulet`, rarity `epic`. Stats indicatives : `regenSp:2`,
`bonusMag:3`.

---

## 2. `cor_chasse` — « Cor de la Chasse Sans Tête » (bibelot, épique)

**Prompt :**
> Painterly fantasy game item icon, Magic-the-Gathering concept-art style, on a
> fully transparent background. A single ancient ghostly hunting horn: a curved
> bull-horn bugle of aged ivory bound with tarnished silver fittings and a
> frayed deep-crimson cord, faintly translucent and glowing with pale spectral
> light as if blown by a phantom rider. A wisp of ghostly green-white mist
> escapes the bell of the horn. Heraldic, gothic, slightly sinister. Palette of
> bone ivory, oxidized silver, blood crimson, spectral white. Soft top-left 45°
> lighting, crisp specular on the silver rim, soft drop shadow lower-right.
> Subtle violet rarity glow behind the horn (epic), not opaque. Centered,
> 75–85% of frame, ≥8% margin. No text, no frame, no hand, no background scene.
> 512×512, transparent PNG.

Slot conseillé : `trinket`, rarity `epic`. Stats indicatives :
`bonusCritChance:3`, `bonusCritDamage:0.2`.

---

## 3. `cape_soie_acromantule` — « Cape de Soie d'Acromantule » (cape, épique)

**Prompt :**
> Painterly fantasy game item icon, Magic-the-Gathering concept-art style, on a
> fully transparent background. A single elegant hooded cloak woven from
> acromantula spider-silk: deep charcoal-black fabric with an iridescent
> blue-violet sheen, fine silvery spider-silk threads catching the light along
> the folds, a faint cobweb pattern woven into the hem, fastened at the collar
> with a small dark chitinous clasp. The cloak is shown gracefully draped /
> folded as a wearable garment icon, hood visible at top. Palette of black,
> iridescent indigo, silver thread, with a cold violet shimmer. Soft top-left
> 45° lighting, silky specular highlights along the folds, soft drop shadow
> lower-right. Subtle violet rarity glow behind the cloak (epic), not opaque.
> Centered, 75–85% of frame, ≥8% margin. No text, no frame, no hand, no
> mannequin, no background scene. 512×512, transparent PNG.

Slot conseillé : `cloak`, rarity `epic`. Stats indicatives : `bonusAgi:3`,
`bonusDodgeChance:4`.

---

## 4. `plume_lockhart` — « Plume à Papote Dédicacée » (bibelot, rare)

**Prompt :**
> Painterly fantasy game item icon, Magic-the-Gathering concept-art style, on a
> fully transparent background. A single flamboyant peacock-feather quill pen,
> luxuriously vain: a long curling turquoise-and-gold peacock plume with a
> shimmering "eye" near the tip, fitted to a polished golden nib that drips a
> single bead of violet ink, tied with a small lilac silk ribbon. Glamorous,
> slightly ridiculous, self-important. Palette of turquoise, peacock blue,
> bright gold, lilac. Soft top-left 45° lighting, bright specular glint on the
> gold nib, soft drop shadow lower-right. Subtle warm blue rarity glow behind
> the quill (rare), not opaque. Centered, 75–85% of frame, ≥8% margin. No text,
> no frame, no hand, no parchment, no background scene. 512×512, transparent
> PNG.

Slot conseillé : `trinket`, rarity `rare`. Stats indicatives : `bonusLck:3`.

---

## Récapitulatif d'intégration

| id | fichier final | registre | slot / rareté |
|----|---------------|----------|----------------|
| `perle_mimi` | `img/icons_new/perle_mimi_<size>.png` | `ITEM_ICON_NEW_REGISTRY` | amulet / epic |
| `cor_chasse` | `img/icons_new/cor_chasse_<size>.png` | idem | trinket / epic |
| `cape_soie_acromantule` | `img/icons_new/cape_soie_acromantule_<size>.png` | idem | cloak / epic |
| `plume_lockhart` | `img/icons_new/plume_lockhart_<size>.png` | idem | trinket / rare |
