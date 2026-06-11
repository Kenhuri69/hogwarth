#!/usr/bin/env python3
"""
dechecker_png.py — Détourage d'un PNG sur fond DAMIER « cuit » (RGB sans alpha).

Cas d'usage : un générateur d'images (Nano Banana / Gemini) renvoie un sujet
sur un damier de transparence APLATI en pixels gris (RGB, pas de canal alpha).
rembg/birefnet (cf. process_monster_png.py) ne sont pas requis ici : le fond
est un gris régulier, le sujet est coloré.

Méthode : reconstruction de silhouette.
  1. masque « damier » = quasi-gris mi-clair (sat<=22, 150<=lum<=248) ;
  2. sujet = tout le reste → plus grand composant connexe = la figure ;
  3. on garde aussi les blobs de magie VRAIMENT saturés (sat moyen >= 45) ;
  4. closing (relie la magie au corps) + fill_holes (récupère les vêtements
     gris internes) + érosion 1 px (mange le halo gris d'anti-aliasing) ;
  5. trim bbox → resize LANCZOS → recentrage carré avec marge (IMG_STYLE §1).

Sortie : PNG-32 RGBA 512×512, fond transparent (Règle A d'IMG_STYLE.md).

Usage :
    python3 tools/dechecker_png.py <src.png> <dst.png> [side] [margin]
"""
import sys, os
import numpy as np
from scipy import ndimage
from PIL import Image


def detour(src, dst, side=512, margin=0.08):
    im = Image.open(src).convert('RGB')
    arr = np.asarray(im); a = arr.astype(np.int16)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    sat = np.maximum(np.maximum(R, G), B) - np.minimum(np.minimum(R, G), B)
    lum = (R + G + B) // 3
    grayish = (sat <= 22) & (lum >= 150) & (lum <= 248)
    subj = ~grayish
    lbl, n = ndimage.label(subj)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, index=np.arange(1, n + 1))
    msat = ndimage.mean(sat, lbl, index=np.arange(1, n + 1))
    main = int(np.argmax(sizes)) + 1   # largest component = the figure
    keep = np.zeros(lbl.shape, bool)
    for i in range(1, n + 1):
        if i == main:
            keep |= (lbl == i)                      # the figure
        elif sizes[i - 1] >= 2000 and msat[i - 1] >= 45:
            keep |= (lbl == i)                      # vivid magic blobs only
    keep = ndimage.binary_closing(keep, iterations=3)
    keep = ndimage.binary_fill_holes(keep)
    keep = ndimage.binary_erosion(keep, iterations=1)
    alpha = np.where(keep, 255, 0).astype(np.uint8)
    edge = keep & ~ndimage.binary_erosion(keep, iterations=1)
    alpha[edge] = 175
    img = Image.fromarray(np.dstack([arr, alpha]), 'RGBA')
    img = img.crop(img.getbbox())
    w, h = img.size
    inner = int(side * (1 - 2 * margin)); scale = inner / max(w, h)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    img = img.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - nw) // 2, (side - nh) // 2), img)
    canvas.save(dst)
    al = np.asarray(canvas)[..., 3]
    print(f"{os.path.basename(dst)}: {canvas.size} RGBA "
          f"alpha0={(al == 0).mean() * 100:.1f}% "
          f"opaque={(al == 255).mean() * 100:.1f}% "
          f"{os.path.getsize(dst) // 1024}KB")


if __name__ == '__main__':
    side = int(sys.argv[3]) if len(sys.argv) > 3 else 512
    margin = float(sys.argv[4]) if len(sys.argv) > 4 else 0.08
    detour(sys.argv[1], sys.argv[2], side, margin)
