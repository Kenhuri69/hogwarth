"""
Génère img/icons/items/bottes_apprenti.png (32×32) depuis un dessin
source 64×64 puis downscale pixel-art-friendly.

Méthode documentée dans .claude/plans/icon-quality.md §"Méthode 64×64 → 32×32".

Usage : python3 tools/gen_boot_sprite.py
"""
from PIL import Image, ImageDraw
import os

SRC = 64
DST = 32
OUT = os.path.join(os.path.dirname(__file__), '..', 'img', 'icons', 'items', 'bottes_apprenti.png')

TR     = (0, 0, 0, 0)
LIGHT  = (188, 122, 66, 255)
MID    = (148, 88, 42, 255)
SHADE  = (108, 60, 24, 255)
DARK   = (70,  38, 14, 255)
SOLE   = (38,  22, 8,  255)
LACE   = (245, 200, 80, 255)
LACE_D = (180, 130, 30, 255)
HILITE = (220, 160, 100, 255)
EYELET = (60,  30, 12, 255)

PALETTE = [
    (188, 122, 66), (148, 88, 42), (108, 60, 24), (70, 38, 14),
    (38, 22, 8), (245, 200, 80), (180, 130, 30), (220, 160, 100), (60, 30, 12),
]


def draw_source():
    img = Image.new('RGBA', (SRC, SRC), TR)
    d = ImageDraw.Draw(img)

    # Tige (trapèze légèrement évasé)
    d.polygon([(20, 10), (38, 10), (40, 42), (18, 42)], fill=LIGHT, outline=DARK)
    d.polygon([(34, 12), (38, 11), (40, 41), (35, 42)], fill=MID)
    d.polygon([(36, 14), (38, 13), (40, 40), (37, 41)], fill=SHADE)
    d.line([(22, 14), (22, 38)], fill=HILITE, width=1)
    d.line([(23, 16), (23, 36)], fill=HILITE, width=1)

    # Ourlet supérieur épais
    d.polygon([(17, 8), (41, 8), (43, 13), (15, 13)], fill=DARK)
    d.polygon([(19, 10), (39, 10), (40, 12), (18, 12)], fill=SHADE)

    # Pied (déborde vers la droite)
    d.polygon([(16, 42), (54, 42), (56, 50), (16, 50)], fill=LIGHT, outline=DARK)
    d.polygon([(50, 42), (54, 42), (56, 46), (54, 50), (50, 50)], fill=MID)
    d.polygon([(16, 42), (22, 42), (22, 50), (16, 50)], fill=MID)
    d.polygon([(16, 44), (20, 44), (20, 49), (16, 49)], fill=SHADE)
    d.line([(24, 44), (48, 44)], fill=HILITE, width=1)
    d.line([(26, 45), (46, 45)], fill=HILITE, width=1)

    # Œillets + lacets en X (3 paires)
    EYE_X_L, EYE_X_R = 22, 36
    EYE_YS = (16, 24, 32)
    for ey in EYE_YS:
        d.ellipse([EYE_X_L - 1, ey - 1, EYE_X_L + 1, ey + 1], fill=EYELET)
        d.ellipse([EYE_X_R - 1, ey - 1, EYE_X_R + 1, ey + 1], fill=EYELET)
    for i in range(len(EYE_YS) - 1):
        y0, y1 = EYE_YS[i], EYE_YS[i + 1]
        d.line([(EYE_X_L, y0), (EYE_X_R, y1)], fill=LACE, width=2)
        d.line([(EYE_X_R, y0), (EYE_X_L, y1)], fill=LACE, width=2)
        d.line([(EYE_X_L + 1, y0 + 1), (EYE_X_R - 1, y1 + 1)], fill=LACE_D, width=1)
        d.line([(EYE_X_R - 1, y0 + 1), (EYE_X_L + 1, y1 + 1)], fill=LACE_D, width=1)
    d.line([(EYE_X_L, EYE_YS[0]), (EYE_X_R, EYE_YS[0])], fill=LACE, width=2)
    d.line([(EYE_X_L, EYE_YS[-1]), (EYE_X_L - 2, EYE_YS[-1] + 4)], fill=LACE, width=2)
    d.line([(EYE_X_R, EYE_YS[-1]), (EYE_X_R + 2, EYE_YS[-1] + 4)], fill=LACE, width=2)

    # Semelle + talon
    d.polygon([(15, 50), (57, 50), (57, 54), (15, 54)], fill=SOLE)
    d.polygon([(15, 50), (22, 50), (22, 58), (15, 58)], fill=SOLE)
    d.polygon([(50, 50), (57, 50), (55, 54), (50, 54)], fill=DARK)
    for x in range(18, 56, 4):
        d.line([(x, 49), (x + 1, 49)], fill=(110, 70, 30, 255), width=1)
    d.polygon([(15, 58), (22, 58), (22, 60), (15, 60)], fill=(20, 12, 4, 200))
    return img


def downscale_pixel_art(src):
    """64×64 → 32×32 : Box filter + alpha binarisé + quantize palette."""
    small = src.resize((DST, DST), Image.BOX)
    px = small.load()
    for y in range(DST):
        for x in range(DST):
            r, g, b, a = px[x, y]
            if a < 128:
                px[x, y] = (0, 0, 0, 0)
                continue
            # Snap couleur sur la palette
            best, bd = PALETTE[0], 9e9
            for cr, cg, cb in PALETTE:
                d = (cr - r) ** 2 + (cg - g) ** 2 + (cb - b) ** 2
                if d < bd:
                    bd = d
                    best = (cr, cg, cb)
            px[x, y] = (best[0], best[1], best[2], 255)
    return small


if __name__ == '__main__':
    src = draw_source()
    out = downscale_pixel_art(src)
    out.save(os.path.abspath(OUT))
    print('Wrote', os.path.abspath(OUT), out.size)
