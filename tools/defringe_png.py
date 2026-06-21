#!/usr/bin/env python3
"""
defringe_png.py — Nettoie un PNG RGBA déjà détouré mais qui garde des restes de
DAMIER de transparence (carrés gris/blancs) collés autour de la silhouette, et
le « halo blanc » de bord qui en résulte. Ne re-détoure PAS depuis la source.

Cas d'usage : un sprite (Nano Banana / Gemini) a été aplati puis découpé avec un
alpha binaire, laissant des blobs de damier neutre autour du sujet — visibles
comme des « marching ants » blanches sur fond sombre en combat.

Méthode (robuste pour un sujet sur damier neutre, même si le sujet a des zones
grises type pierre) :
  1. mask = alpha >= 128 ;
  2. ouverture morpho + plus grand composant connexe → drope les blobs de damier
     DÉTACHÉS, puis dilatation géodésique (∩ mask) pour restaurer le bord ;
  3. dans l'anneau externe (`band` px), retire les pixels de damier ATTACHÉS,
     reconnus neutres-clairs (sat <= 28 & 150 <= lum <= 250) — restreint au bord
     pour protéger l'intérieur du sujet ;
  4. décontamination couleur (nearest pixel intérieur) + replumage 1 px (`feather`).

Sortie : RGBA, mêmes dimensions.

Usage :
    python3 tools/defringe_png.py <src.png> <dst.png> [k=2] [band=10] [feather=140]
"""
import sys, os
import numpy as np
from scipy import ndimage
from PIL import Image


def defringe(src, dst, k=2, band=10, feather=140):
    im = Image.open(src).convert("RGBA")
    a = np.asarray(im)
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
        im.save(dst); return
    sizes = ndimage.sum(np.ones_like(lbl), lbl, index=np.arange(1, n + 1))
    core = lbl == (int(np.argmax(sizes)) + 1)
    body = ndimage.binary_dilation(core, iterations=k) & mask
    body = ndimage.binary_fill_holes(body)

    # 3) retire le damier neutre attaché, dans l'anneau de bord uniquement
    interior = ndimage.binary_erosion(body, iterations=band)
    outer = body & ~interior
    checker = outer & (sat <= 28) & (lum >= 150) & (lum <= 250)
    body = ndimage.binary_fill_holes(body & ~checker)
    lbl2, n2 = ndimage.label(body)
    if n2 > 1:
        sz = ndimage.sum(np.ones_like(lbl2), lbl2, index=np.arange(1, n2 + 1))
        body = lbl2 == (int(np.argmax(sz)) + 1)

    # 4) décontamination couleur + replumage 1 px
    inner = ndimage.binary_erosion(body, iterations=1)
    if inner.sum() == 0:
        inner = body
    idx = ndimage.distance_transform_edt(~inner, return_distances=False,
                                         return_indices=True)
    rgb_decon = rgb[tuple(idx)]
    ring = body & ~inner
    alpha = np.zeros_like(al)
    alpha[inner] = 255
    alpha[ring] = feather

    out = np.dstack([rgb_decon, alpha]).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(dst)
    al2 = np.asarray(Image.open(dst))[..., 3]
    print(f"{os.path.basename(dst)}: {im.size} RGBA "
          f"alpha0={(al2 == 0).mean()*100:.1f}% "
          f"opaque={(al2 == 255).mean()*100:.1f}% "
          f"{os.path.getsize(dst)//1024}KB")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(2)
    k = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    band = int(sys.argv[4]) if len(sys.argv) > 4 else 10
    feather = int(sys.argv[5]) if len(sys.argv) > 5 else 140
    defringe(sys.argv[1], sys.argv[2], k, band, feather)
