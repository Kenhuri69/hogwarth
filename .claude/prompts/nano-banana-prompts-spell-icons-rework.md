# Prompts planches — reprise des logos de sorts « Copilot » (orbe plat + glyphe pixel)

> Cible : remplacer 10 icônes de sorts basse qualité (orbe dégradé uni + glyphe
> plat/pixel, « blanc qui ressort ») par des **orbes/effets painterly riches
> 128²**, style des bons sorts (incendio_royal, glacius_cataclysme). 2 lots, **1
> planche par lot**. Découpe → `img/icons/spells/<id>.png` (chemins inchangés →
> pas de bump cache, img SWR). Pas de cartouche (l'effet EST l'icône).

## Liste (10) — détectées « orbe clair + glyphe plat »

fulgari, fulgur_catena, glacius, glacius_tempete, diffindo_maxima,
patronus_maxima, sectumsempra_imperius, verrou_de_sang, vulnera_sanentur,
ferula_maxima.

## Règles communes (les 2 planches)

- **Fond** plat gris neutre **#8C9298**, uni, aucune ombre projetée.
- Grille régulière 3×2, 1 effet/case, **centré**, ~75 % de la case, qui
  **s'estompe en transparence avant le bord** (marge fondue ~8 %).
- **Style** : effet magique **painterly lumineux** (énergie, particules, glow),
  cohérent avec les bons sorts. **PAS** de disque dégradé uni en fond, **PAS** de
  pictogramme plat/vectoriel, **PAS** de cerne noir, pas de pixel art, pas de
  cartoon. Lisible réduit à ~48 px.
- Chaque effet doit **ressortir sur fond de combat sombre** (cœur lumineux).
- **INTERDITS** : texte, cadre, bordure, UI, personnage humain, décor, sol,
  ombre rectangulaire, fond noir/coloré (le fond reste gris plat).

---

## Planche LOT 1 — élémentaire offensif (3×2, 5 + 1 vide)

Ordre row-major : `fulgari, fulgur_catena, glacius, glacius_tempete, diffindo_maxima`

> A single 3×2 grid sheet of painterly magic spell icons (luminous energy
> effects), flat uniform neutral mid-gray background (#8C9298), equal cells with
> thin gutters. One effect per cell, centered, ~75% of the cell, fading to soft
> glow / transparency before the cell edge. Rich painterly VFX style, NO flat
> gradient disc, NO flat pictogram, NO black outline, no pixel art, no cartoon,
> no text, no frame, no background scenery, no black fill. Every effect bright
> enough to read on a dark combat background. The six cells, left-to-right then
> top-to-bottom:
> 1. A compact crackling sphere of brilliant blue-white lightning, blazing
>    electric core, arcing bolts and sparks radiating.
> 2. Interlinked arcs of electric-blue lightning forming a chained web, bright
>    glowing nodes where bolts connect, energetic.
> 3. A radiant icy-blue frost burst: cluster of pale-cyan ice crystals and
>    shards with a glowing cold core, sharp crystalline glints.
> 4. A swirling blizzard vortex of cyan ice and driving snow, frost-wind spiral
>    around a bright icy-white core.
> 5. Crossed silver-white slashing blades / sharp wind-cut arcs, razor metallic
>    gleam and bright steel sparks (a cleaving strike).
> 6. (leave this last cell empty — plain flat gray background only.)
> Cohesive luminous palette across cells. 3×2 grid, square.

---

## Planche LOT 2 — support & ténèbres (3×2, 5 + 1 vide)

Ordre row-major : `patronus_maxima, sectumsempra_imperius, verrou_de_sang, vulnera_sanentur, ferula_maxima`

> A single 3×2 grid sheet of painterly magic spell icons (luminous energy
> effects), flat uniform neutral mid-gray background (#8C9298), equal cells with
> thin gutters. One effect per cell, centered, ~75% of the cell, fading to soft
> glow / transparency before the cell edge. Rich painterly VFX style, NO flat
> gradient disc, NO flat pictogram, NO black outline, no pixel art, no cartoon,
> no text, no frame, no background scenery, no black fill. Every effect bright
> enough to read on a dark combat background. The six cells, left-to-right then
> top-to-bottom:
> 1. A luminous silver-white spectral stag of radiant guardian light, ethereal
>    glowing wisps streaming around it, bright and ethereal (a Patronus).
> 2. Sinister crimson-and-black cutting slashes flinging luminous blood-red
>    energy droplets, dark core with bright red glowing edges so it reads.
> 3. A glowing crimson blood-rune seal: a circular sigil ring of bright
>    blood-red runes around a dark center, ominous red glow.
> 4. A gentle radiant bloom of rose-pink and warm-gold healing light, soft
>    glowing petals and rising sparkles, soothing but bright.
> 5. A warm golden-green restorative glow with wrapping ribbons of light
>    (bandage motif) and soft sparkles, luminous and supportive.
> 6. (leave this last cell empty — plain flat gray background only.)
> Cohesive luminous palette across cells. 3×2 grid, square.

---

## Intégration (par planche)

```bash
# LOT 1 (planche_sorts1.png)
python3 tools/sheet_extract.py planche_sorts1.png --cols 3 --rows 2 --side 128 --margin 0.06 \
  --ids fulgari,fulgur_catena,glacius,glacius_tempete,diffindo_maxima \
  --out img/icons/spells --qc /tmp/s1_qc.png

# LOT 2 (planche_sorts2.png)
python3 tools/sheet_extract.py planche_sorts2.png --cols 3 --rows 2 --side 128 --margin 0.06 \
  --ids patronus_maxima,sectumsempra_imperius,verrou_de_sang,vulnera_sanentur,ferula_maxima \
  --out img/icons/spells --qc /tmp/s2_qc.png

node tests/smoke.js spell visual
```

> Chemins `img/icons/spells/<id>.png` inchangés → **pas de bump cache** (SWR).
> Si un orbe ressort trop sombre/plat ou avec un liseré → réajuster `--tol`/
> `--margin` ou régénérer la case. Contrôle : pas de disque plat, pas de liseré
> blanc, lisible à 48 px.
