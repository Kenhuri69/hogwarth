# Prompt planche — refonte des 11 icônes sans cadre

> **1 seule image** (planche/grille) à générer via Nano Banana / Copilot, que
> je découperai ensuite (`tools/sheet_extract.py`) puis encadrerai
> (`icon_factory.py --raster`). Le **cartouche doré et le halo de rareté sont
> ajoutés par le pipeline** — NE PAS les peindre dans l'image.

## Grille : 4 colonnes × 3 lignes (11 items, dernière case vide)

Ordre **row-major** (gauche→droite, haut→bas) — DOIT correspondre à la commande
de découpe :

| | col 1 | col 2 | col 3 | col 4 |
|---|-------|-------|-------|-------|
| **ligne 1** | Baguette d'If des Profondeurs | Cape de Soie d'Acromantule | Ceinturon des Aurors | Perle de Larmes de Mimi |
| **ligne 2** | Cor de la Chasse Sans Tête | Plume à Papote Dédicacée | Bottes Lestes | Cape Doublée |
| **ligne 3** | Ceinture d'Étudiant | Plastron Renforcé | Serre-tête d'Étude | *(vide)* |

## Règles communes (impératif pour une découpe propre)

- **Fond** : **plat, uni, gris neutre moyen (#8C9298)**, identique sur toute la
  planche, AUCUN dégradé/texture/ombre projetée sur le fond. (Le floodfill du
  découpeur s'appuie sur un fond plat.)
- **Une grille régulière** : 4×3 cases de taille égale, fines gouttières du même
  gris. Un seul objet par case, **centré**, occupant **65–75 %** de la case,
  **marge ≥ 12 % sur les 4 côtés** — l'objet ne touche JAMAIS le bord de sa case
  ni l'objet voisin.
- **Style** : digital painting concept-art Harry Potter / Magic: the Gathering,
  coups de pinceau visibles, matière lisible, **pas** de photoréalisme, **pas**
  de cartoon, **pas** de pixel art, **pas de cerne noir** (séparation par la
  valeur). Silhouette lisible une fois réduite à 64 px.
- **Lumière** : source principale **haut-gauche ~45°**, ombre douce de l'objet
  vers le bas-droite (sur l'objet, pas sur le fond), rim-light subtil, un point
  spéculaire net.
- **INTERDITS** (negative) : aucun texte/lettre/chiffre, aucun **cadre/bordure**,
  aucun **halo/glow** coloré, aucune main, personnage, mannequin, décor,
  sol/table, ombre rectangulaire, watermark, mockup, UI.

> Le halo de rareté (violet=épique, bleu=rare, vert=uncommon) et le cartouche
> doré sont rajoutés ensuite par le moteur — les peindre ici créerait un
> double cadre.

## Prompt unique (à coller tel quel)

> A single 4×3 grid sheet of fantasy RPG inventory item icons, concept-art
> digital painting style (Harry Potter / Magic: the Gathering), visible
> brushwork, readable materials, no photorealism, no cartoon, no pixel art, no
> black outlines. Flat uniform neutral mid-gray background (#8C9298) across the
> whole sheet, equal cells separated by thin gray gutters. One single object per
> cell, centered, 65–75% of the cell, ≥12% margin on all sides, never touching
> the cell edges. Top-left ~45° key light, soft shadow on each object toward
> lower-right, subtle rim light, one crisp specular highlight. NO text, NO
> frame, NO border, NO colored glow or halo, NO hands, NO character, NO
> background scenery, NO floor. The twelve cells, left-to-right then
> top-to-bottom:
> 1. An ancient yew wizard wand of dark ebony-black wood, deep-violet grain, the
>    tip carved with faint glowing runic notches — sinister, deep-magic.
> 2. An elegant hooded cloak woven from acromantula spider-silk: charcoal-black
>    fabric with an iridescent blue-violet sheen, fine silvery silk threads along
>    the folds, a faint cobweb pattern at the hem, small dark chitinous clasp,
>    draped as a wearable garment, hood at top.
> 3. A heavy Auror's duty belt of dark oxblood leather with a large polished
>    gold-bronze buckle (#c8a24a), riveted, authoritative and martial.
> 4. A haunted teardrop pendant: a large luminous pale ghost-blue pearl shaped
>    like a frozen tear on a thin tarnished silver chain, faint droplets of
>    glowing water beading on it as if weeping.
> 5. An ornate ghostly hunting horn of the Headless Hunt: a curved bone-ivory
>    bugle banded with oxidized silver fittings, a polished green gemstone set at
>    the mouthpiece, draped with a frayed deep-crimson cloth banner, faint
>    spectral pale-violet mist clinging to it — gothic, heraldic, slightly
>    sinister.
> 6. A flamboyant peacock-feather quill pen: a long curling turquoise-and-gold
>    plume with a shimmering eye near the tip, a polished gold nib dripping one
>    bead of violet ink, tied with a small lilac silk ribbon — vain, glamorous.
> 7. A pair of light nimble leather travel boots in warm tan (#9a7d4f), supple
>    and low, built for speed, slightly scuffed.
> 8. A lined traveler's cloak: dark slate outer fabric folded open to reveal a
>    warm amber-gold quilted lining, sturdy and practical.
> 9. A simple student's leather belt in mid-brown with a modest brass buckle,
>    plain and worn.
> 10. A reinforced leather breastplate (cuirass) with riveted brass-gold trim
>     plates over the chest, practical defensive armor, warm brown leather.
> 11. A slim study circlet / headband of soft blue (#5c8cbe) leather and metal
>     with a small clear gemstone at the brow, scholarly and refined.
> 12. (leave this last cell empty — plain flat gray background only.)
> Painterly, cohesive lighting and palette across all cells. 4×3 grid, square.

## Intégration (une fois la planche `planche.png` fournie)

```bash
# 1) découpe → tools/raster_src/<id>.png (QC sur /tmp/qc.png)
python3 tools/sheet_extract.py planche.png --cols 4 --rows 3 \
  --ids baguette_if_boucle,cape_soie_acromantule,ceinture_aurors,perle_mimi,cor_chasse,plume_lockhart,bottes_lestes,cape_doublee,ceinture_etudiant,plastron_renforce,serre_tete_etude \
  --out tools/raster_src --qc /tmp/qc.png

# 2) encadrement halo + cartouche → img/icons_new/<id>_{16,24,32,48,64}.png
python3 tools/icon_factory.py --raster \
  baguette_if_boucle cape_soie_acromantule ceinture_aurors perle_mimi cor_chasse \
  plume_lockhart bottes_lestes cape_doublee ceinture_etudiant plastron_renforce serre_tete_etude

# 3) non-régression
node tests/smoke.js inventory visual icon
```

> Registre JS déjà correct (aucun change). `img/` en stale-while-revalidate →
> pas de bump cache PWA. Si la découpe signale FAIL (marge/bave), réajuster
> `--tol` / `--inset` ou regénérer la case fautive.
