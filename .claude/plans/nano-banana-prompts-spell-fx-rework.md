# Prompt planche — reprise des 7 splash FX de sorts évolués

> **1 seule image** (planche 4×2) à générer via Nano Banana, que je découperai
> (`tools/sheet_extract.py`) en 7 PNG transparents 256² → `img/fx/spells/<id>.png`
> (chemins inchangés → pas de bump cache, img en SWR). Ce sont des **FX de
> combat** (PAS d'icônes encadrées) : aucun cartouche, juste l'effet détouré.

## Cause de la reprise

Les splash actuels du lot #649 sont posés sur fond neutre → l'un est **trop
sombre pour le combat** : `diffindo_ultima` (gris charbon, luminance 76) est
quasi invisible sur le décor sombre. On reprend **tout le lot des 7** pour
homogénéiser en effets **lumineux à fort contraste**, lisibles sur fond sombre.

## Règle d'or (impérative)

**Chaque effet doit RESSORTIR sur un fond de combat NOIR/sombre** : cœur
incandescent très lumineux, valeurs hautes, halo brillant. Même l'effet de
ténèbres doit avoir des **arêtes/veines lumineuses** (magenta/violet vif) — pas
de masse purement noire.

## Grille : 4 colonnes × 2 lignes (7 effets, dernière case vide)

Ordre **row-major** (= commande de découpe) :

| | col 1 | col 2 | col 3 | col 4 |
|---|-------|-------|-------|-------|
| **ligne 1** | diffindo_ultima | fulgur_imperium | glacius_cataclysme | lumos_solem_ardent |
| **ligne 2** | lux_suprema | nox_devorans | vulnera_maxima | *(vide)* |

## Règles communes (découpe propre)

- **Fond** : plat, uni, **gris neutre moyen (#8C9298)**, identique partout, aucun
  dégradé. (Le floodfill s'appuie dessus.)
- **Une grille régulière** 4×2, fines gouttières du même gris. Un seul effet par
  case, **centré**, occupant **~78 %** de la case, qui **s'estompe en
  transparence/halo AVANT le bord** (ne pas remplir la case bord à bord — il faut
  une marge fondue ~8 % pour un détourage propre).
- **Style** : VFX painterly / energy splash de RPG (particules, volutes,
  étincelles, glow), cohérent entre les 7. Pas de photoréalisme, pas de cartoon,
  pas de pixel art, **pas de cerne noir**.
- **INTERDITS** : aucun texte/chiffre, cadre, bordure, UI, personnage, arme
  réaliste, décor, sol, ombre rectangulaire, watermark, fond noir (le fond reste
  gris plat).

## Prompt unique (à coller tel quel)

> A single 4×2 grid sheet of RPG spell-impact VFX bursts, painterly energy-effect
> style (glowing particles, swirling plasma, sparks, bright bloom), on a flat
> uniform neutral mid-gray background (#8C9298) across the whole sheet, equal
> cells with thin gray gutters. One radial energy burst per cell, centered, about
> 78% of the cell, each effect fading out to a soft glow / transparency BEFORE the
> cell edge (do not fill the cell edge-to-edge). CRUCIAL: every effect must be
> high-value and luminous so it reads on a BLACK combat background — bright
> incandescent core, glowing rim. No text, no frame, no border, no UI, no
> character, no weapon, no scenery, no black background fill. The eight cells,
> left-to-right then top-to-bottom:
> 1. A cross-shaped burst of brilliant SILVER-WHITE slashing blades / wind-cut
>    arcs, razor-sharp metallic gleam, bright steel-white sparks radiating —
>    luminous and crisp (a severing/cleave strike).
> 2. An electric storm burst: vivid blue-white lightning bolts arcing outward
>    from a blazing white core, crackling plasma, bright electric sparks.
> 3. A frost cataclysm burst: cyan and icy-white shards and snow exploding
>    outward from a glowing pale-blue core, sharp crystalline glints.
> 4. A concentrated solar blaze: a vertical lance of brilliant golden sunfire
>    with a radiant white-gold core and flaring sun rays, hot and luminous.
> 5. A flood of holy light: a radiant golden sunburst halo / mandala of light
>    rays expanding outward, brilliant white-gold center, sacred and luminous.
> 6. A devouring darkness tide: a swirling dark-violet void core RINGED with
>    luminous magenta and electric-purple veins and bright violet edge-glow, so
>    it stays clearly visible on a dark background (never a flat black blob).
> 7. A great healing bloom: a radiant rose-pink and warm-gold flower of light,
>    soft luminous petals and rising sparks, gentle but bright and clearly
>    glowing.
> 8. (leave this last cell empty — plain flat gray background only.)
> Cohesive luminous palette and lighting across all cells. 4×2 grid, square.

## Intégration (planche `planche_fx.png` fournie)

```bash
# découpe → directement dans img/fx/spells/ en 256², marge faible (FX = grand effet)
python3 tools/sheet_extract.py planche_fx.png --cols 4 --rows 2 --side 256 --margin 0.05 \
  --ids diffindo_ultima,fulgur_imperium,glacius_cataclysme,lumos_solem_ardent,lux_suprema,nox_devorans,vulnera_maxima \
  --out img/fx/spells --qc /tmp/fx_qc.png

# vérif readability sur fond sombre (script ad hoc) + smoke
node tests/smoke.js spell visual
```

> Aucune icône 128² touchée (les 7 icônes sont lisibles). Chemins
> `img/fx/spells/<id>.png` inchangés → **pas de bump cache** (SWR). Si un splash
> sort trop sombre/clippé, réajuster `--tol`/`--margin` ou régénérer la case.
> Contrôle d'acceptation : luminance moyenne du sujet **≥ ~150** (diffindo passait
> à 76) et lisible sur fond combat.
