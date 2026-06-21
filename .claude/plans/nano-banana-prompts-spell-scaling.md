# Prompts Nano Banana — Icônes des sorts évolués (spell-scaling)

> 7 sorts livrés par la PR #645 (`single-target-spell-scaling`) actuellement sur
> **alias temporaire** dans `SPELL_ICON_REGISTRY` (`js/item-icons.js`, pointant
> sur l'art de leur sort de base) et **sans entrée** `SPELL_SPLASH_REGISTRY`.
> Objectif : produire l'**art dédié** (icône 128² + splash de combat 256²) de
> chaque forme évoluée, comme les lots P3/P4 (`spell-icons-p3.md` /
> `spell-icons-p4.md`).
>
> Règle de design de la PR : **une évolution préserve le ciblage** (mono→mono
> plus fort, zone→zone plus forte). L'art doit donc lire « **version
> amplifiée/suprême** » du sort de base — même élément, même motif, mais plus
> intense, plus grand, plus chargé.
>
> ⚠️ **Famille « icône de sort »** — un emblème/rune d'effet magique, PAS un
> sprite de personnage ni un objet d'inventaire. Sujet isolé, fond transparent,
> centré, lueur élémentaire. N'applique NI la Règle A (sprites monstres) NI la
> Règle B (portraits PNJ).

---

## Spécifications techniques (icônes de sorts)

| Champ | Valeur |
|-------|--------|
| Dimensions natives | **1024 × 1024 px** (carré) — source HD, downscalée ensuite |
| Format | PNG-32 **RGBA, fond transparent** |
| Sujet | **un seul emblème magique** centré, isolé (aucune main, perso, décor) |
| Cadrage | l'effet occupe **~72 %** du cadre, marge ≥ 12 % sur les 4 côtés |
| Style | painterly / concept-art MTG, coups de pinceau visibles, lueur élémentaire, pas de contour vectoriel |
| Éclairage | clé en **haut-gauche** (45°), cœur lumineux émissif |

### Workflow d'intégration (après réception des images)

Pour CHAQUE sort, dans l'ordre :
1. **Icône** : `python3 tools/dechecker_png.py <upload_icone.png> /tmp/<slug>_512.png 512`
   → contrôle visuel → downscale 128² LANCZOS → `img/icons/spells/<slug>.png`.
2. **Splash** : `python3 tools/dechecker_png.py <upload_splash.png> /tmp/<slug>_fx.png 256`
   → `img/fx/spells/<slug>.png` (256²).
3. Câblage `js/item-icons.js` :
   - `SPELL_ICON_REGISTRY['<Nom exact>']` → `'img/icons/spells/<slug>.png'`
     (remplace l'alias temporaire actuel).
   - `SPELL_SPLASH_REGISTRY['<Nom exact>']` → `'img/fx/spells/<slug>.png'`
     (nouvelle entrée).
4. **cache-bump** (skill `cache-bump`) : `item-icons.js` + `CACHE_VERSION` →
   `node tools/check_cache_versions.js --base origin/master`.
5. Tests : `node tests/smoke.js SpellIcons` (T1 charge les icônes, T5 = splash),
   puis `node tests/units.js` + `node tests/smoke.js` + `node tests/pwa-smoke.js`.

### Halo de rareté (teinte de lueur du fond)

| Sort | Rareté | RVB halo | Hex |
|------|--------|----------|-----|
| Lumos Solem Ardent | rare | (90,150,220) | `#5a96dc` |
| Glacius Cataclysme · Fulgur Imperium · Lux Suprema · Nox Devorans · Diffindo Ultima · Vulnera Maxima | epic | (180,110,220) | `#b46edc` |

### Suffixe universel — ICÔNE (coller à TOUS les prompts « symbole »)

```
single magical spell emblem only, no hands, no character, no background scene,
isolated on fully transparent background, centered, emblem occupies 72% of frame
with even margin on all sides, painterly digital concept art, MTG illustration quality,
visible brush strokes, glowing emissive core, no vector outline, soft upper-left key
light at 45 degrees, no text, no watermark, no signature, no border frame, no ground
line, no ground shadow, 1024x1024 square
```

### Suffixe universel — SPLASH d'effet (coller à TOUS les prompts « effet »)

```
combat spell effect burst, dynamic motion, isolated on fully transparent background,
centered radial composition meant to overlay a target, painterly digital concept art,
visible brush strokes, bright emissive energy, motion streaks, no character, no hands,
no background scene, no text, no watermark, no signature, no border frame, 1024x1024 square
```

---

## 1. Lumos Solem Ardent — `lumos_solem_ardent`
**Mono-cible**, élément lumière, `burn`, ×1,5 morts-vivants. Évolution de Lumos
Solem (étage 9). Base = soleil radial or/blanc à 8 rais. → version **plus
ardente, concentrée en lance solaire** (reste mono-cible, pas d'onde de zone).

**Icône (symbole)**
```
A concentrated blazing sun-spear of pure solar fire, a single intense white-gold
solar core with a sharp downward radiant lance of light, fewer but longer and
fiercer rays than a simple sunburst, shimmering heat haze, sacred radiant energy
that scorches undeath, palette: incandescent white core, deep gold, amber edges,
faint sky-blue rim glow, rare blue rarity halo behind,
[+ suffixe ICÔNE]
```
**Splash (effet)**
```
A vertical lance of searing solar light striking down onto a single point,
brilliant white-gold pillar with amber embers and holy radiance, focused single-target
impact (not an area wave), heat distortion, [+ suffixe SPLASH d'effet]
```

## 2. Glacius Cataclysme — `glacius_cataclysme`
**AoE (`aoe_field`)**, glace, gel renforcé. Évolution de Glacius Tempête (ét.14).
Base = nappe de blizzard bleu glacé. → **cataclysme de givre**, plus vaste,
cristaux acérés, tempête.

**Icône (symbole)**
```
A cataclysmic frost emblem, a dense burst of jagged ice crystals and razor shards
exploding outward in a frozen storm, swirling blizzard winds, deep glacial blue and
frost white with cyan highlights, hoarfrost spikes radiating in all directions,
overwhelming wintry power, epic violet rarity halo behind,
[+ suffixe ICÔNE]
```
**Splash (effet)**
```
A wide blizzard shockwave of shattering ice shards and frozen mist sweeping across
multiple targets, jagged crystals bursting outward, swirling glacial winds, cyan and
white frost, area-of-effect frost cataclysm, [+ suffixe SPLASH d'effet]
```

## 3. Fulgur Imperium — `fulgur_imperium`
**AoE (`aoe_chain`)**, foudre. Évolution de Fulgur Catena (ét.15). Base = arc
électrique en chaîne. → **tempête électrique impériale**, arcs multiples
ramifiés, plus violente.

**Icône (symbole)**
```
An imperial lightning storm emblem, multiple branching arcs of brilliant electricity
chaining and forking outward from a blazing white-blue core, crackling plasma,
violent voltaic energy, electric blue and white with violet sparks, a crown-like
ring of converging bolts, epic violet rarity halo behind,
[+ suffixe ICÔNE]
```
**Splash (effet)**
```
A devastating chain-lightning burst, multiple jagged electric arcs leaping between
several points, blinding white-blue plasma, crackling forks and sparks radiating
outward, area chain electrocution, [+ suffixe SPLASH d'effet]
```

## 4. Lux Suprema — `lux_suprema`
**AoE (`aoe_wave`)**, lumière, ×1,5 morts-vivants. Évolution de Lux Aeterna
(ét.16). Base = onde de lumière, anneaux concentriques + étoile. → **déluge de
lumière suprême**, anneaux plus nombreux et puissants, étoile rayonnante.

**Icône (symbole)**
```
A supreme radiance emblem, a brilliant many-pointed star at the center emitting
powerful concentric rings of golden light rippling outward, an overwhelming holy
light wave, sacred sunlit gold and pure white with faint celestial blue, far grander
and more luminous than a single sunburst, epic violet rarity halo behind,
[+ suffixe ICÔNE]
```
**Splash (effet)**
```
An expanding wave of radiant golden light washing over multiple targets, brilliant
concentric rings of holy luminance bursting outward from a star core, sacred white-gold
glow that smites undeath, area light deluge, [+ suffixe SPLASH d'effet]
```

## 5. Nox Devorans — `nox_devorans`
**AoE (`aoe_drain`)**, ténèbres, gros drain de vie. Évolution de Nox Vorax
(ét.17). Base = vague obscure drainante. → **marée obscure dévorante**, volutes
d'ombre absorbant des fils de vie écarlates.

**Icône (symbole)**
```
A devouring darkness emblem, a churning vortex of black-violet shadow tendrils
spiraling inward, thin crimson threads of drained life being pulled into a void core,
hungry consuming dark energy, deep purple-black with blood-red wisps and a faint
sickly green edge, ominous and predatory, epic violet rarity halo behind,
[+ suffixe ICÔNE]
```
**Splash (effet)**
```
A surging tide of dark shadow sweeping over multiple targets, black-violet tendrils
and a swirling void pulling crimson lifeforce threads back toward the caster, area
life-drain wave, ominous dark energy, [+ suffixe SPLASH d'effet]
```

## 6. Diffindo Ultima — `diffindo_ultima`
**AoE (`aoe_cleave`)**, physique. Évolution de Diffindo Maxima (ét.18). Base =
fauchage tranchant. → **fauchage absolu**, multiples lames d'énergie croisées,
coup de faux dévastateur.

**Icône (symbole)**
```
An ultimate severing emblem, multiple crossed blades of razor-sharp wind-force
energy slashing in an X, brilliant white-silver cutting arcs with steel-grey edges,
a great reaping scythe-stroke, kinetic slicing power, sparks at the intersection,
no fire no element color (pure physical force), epic violet rarity halo behind,
[+ suffixe ICÔNE]
```
**Splash (effet)**
```
A devastating sweep of multiple crossing slash arcs cleaving across several targets,
sharp white-silver cutting crescents, severing wind-force, sparks and motion streaks,
area cleaving strike, [+ suffixe SPLASH d'effet]
```

## 7. Vulnera Maxima — `vulnera_maxima`
**AoE soin (`heal_aoe`)**, restaure pleinement le groupe. Évolution de Vulnera
Sanentur (ét.19). Base = chant de guérison rose/ambré. → **grand chant de
guérison**, halo restaurateur plus vaste, plumes/runes de soin.

**Icône (symbole)**
```
A grand healing chant emblem, a radiant restorative halo of warm rose-gold and amber
light, gentle uplifting motes and soft feather-like wisps swirling around a glowing
heart of light, a great soothing aura of full recovery, warm pink-amber with creamy
white highlights, serene and benevolent, epic violet rarity halo behind,
[+ suffixe ICÔNE]
```
**Splash (effet)**
```
A wide blooming aura of warm rose-gold healing light enveloping a whole group,
rising gentle motes and soft restorative feathers, soothing radiant glow spreading
outward, area full-heal aura, [+ suffixe SPLASH d'effet]
```

---

## Journal

- 2026-06-21 : doc créé. 7 sorts (1 mono Lumos Solem Ardent + 6 AoE évolués),
  prompts icône + splash. Slugs alignés sur `SPELL_ICON_REGISTRY` (alias
  temporaires en place depuis PR #645). En attente des 14 images
  (symbole + splash × 7) pour intégration par lots.
