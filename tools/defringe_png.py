#!/usr/bin/env python3
"""
defringe_png.py — Nettoie un PNG RGBA déjà détouré mais qui garde des restes de
DAMIER de transparence (carrés gris/blancs) autour de la silhouette, et le
« halo blanc » de bord qui en résulte. Ne re-détoure PAS depuis la source.

Cas d'usage : un sprite (Nano Banana / Gemini) a été aplati sur un damier puis
découpé avec un alpha binaire. Restent : (a) des blobs de damier détachés,
(b) des carrés de damier ATTACHÉS à la silhouette, (c) un fin liseré clair
d'anti-aliasing cuit dans le RGB du bord. Tout cela apparaît comme des
« marching ants » blanches sur le fond sombre du combat.

Hypothèse : le SUJET est nettement plus coloré/saturé ou sombre que le damier
(neutre & clair). Vrai pour la quasi-totalité des sprites (feu, pierre dorée,
chair, etc.). Pour un sujet réellement gris-clair désaturé, baisser sat_th.

Méthode :
  1. mask = alpha >= 128 ;
  2. ouverture morpho (k) + plus grand composant connexe + dilatation géodésique
     (∩ mask) → drope les blobs de damier DÉTACHÉS, restaure le bord du corps ;
  3. dans l'anneau de bord (`band` px), SUPPRIME les pixels de damier neutres-
     clairs (lum >= lum_th & sat <= sat_th) → enlève les carrés attachés ;
  4. plus grand composant + bouchage de trous ;
  5. recolore le résidu clair restant (anti-alias) vers le pixel sain le plus
     proche (décontamination ciblée), puis replumage 1 px (`feather`).

Sortie : RGBA, mêmes dimensions.

Usage :
    python3 tools/defringe_png.py <src.png> <dst.png>
        [k=2] [band=16] [lum_th=150] [sat_th=42] [feather=140]
"""
import sys, os
import numpy as np
from scipy import ndimage
from PIL import Image


def defringe(src, dst, k=2, band=16, lum_th=150, sat_th=42, feather=140):
    a = np.asarray(Image.open(src).convert("RGBA"))
    rgb = a[..., :3].copy()
    al = a[..., 3]
    R, G, B = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    lum = (R + G + B) / 3
    sat = np.maximum(np.maximum(R, G), B) - np.minimum(np.minimum(R, G), B)

    mask = al >= 128

    # 1+2) drop blobs de damier détachés, restaure le bord du corps
    opened = ndimage.binary_opening(mask, iterations=k)
    lbl, n = ndimage.label(opened)
    if n == 0:
        Image.open(src).save(dst); return
    sizes = ndimage.sum(np.ones_like(lbl), lbl, index=np.arange(1, n + 1))
    core = lbl == (int(np.argmax(sizes)) + 1)
    body = ndimage.binary_fill_holes(ndimage.binary_dilation(core, iterations=k) & mask)

    # 3) supprime le damier neutre-clair ATTACHÉ, dans l'anneau de bord
    interior = ndimage.binary_erosion(body, iterations=band)
    outer = body & ~interior
    checker = outer & (lum >= lum_th) & (sat <= sat_th)
    body = ndimage.binary_fill_holes(body & ~checker)

    # 4) plus grand composant (au cas où la suppression aurait isolé un bout)
    lbl2, n2 = ndimage.label(body)
    if n2 > 1:
        sz = ndimage.sum(np.ones_like(lbl2), lbl2, index=np.arange(1, n2 + 1))
        body = lbl2 == (int(np.argmax(sz)) + 1)

    # 5) recolore le résidu clair (anti-alias) + replumage 1 px
    whiteish = (lum >= 172) & (sat <= 40)
    clean_int = ndimage.binary_erosion(body & ~whiteish, iterations=1)
    if clean_int.sum() == 0:
        clean_int = body & ~whiteish
    idx = ndimage.distance_transform_edt(~clean_int, return_distances=False,
                                         return_indices=True)
    rgb_out = rgb.copy()
    fix = body & whiteish
    rgb_out[fix] = rgb[tuple(idx)][fix]

    inner = ndimage.binary_erosion(body, iterations=1)
    if inner.sum() == 0:
        inner = body
    ring = body & ~inner
    alpha = np.zeros_like(al)
    alpha[inner] = 255
    alpha[ring] = feather

    out = np.dstack([rgb_out, alpha]).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(dst)
    al2 = np.asarray(Image.open(dst))[..., 3]
    print(f"{os.path.basename(dst)}: {Image.open(dst).size} RGBA "
          f"alpha0={(al2 == 0).mean()*100:.1f}% "
          f"opaque={(al2 == 255).mean()*100:.1f}% "
          f"{os.path.getsize(dst)//1024}KB")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(2)
    args = sys.argv[3:]
    defaults = [2, 16, 150, 42, 140]
    vals = [int(args[i]) if i < len(args) else defaults[i] for i in range(5)]
    defringe(sys.argv[1], sys.argv[2], *vals)
