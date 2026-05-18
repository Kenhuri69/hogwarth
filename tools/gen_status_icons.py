#!/usr/bin/env python3
"""Génère les icônes de statut de combat pour img/icons/.

Couvre le DoT `gel` (Engelures ❄️) — badge 48×48 cohérent avec
burn/poison/bleed.png. Procédural via Pillow.
Lancer depuis la racine du projet :
    python3 tools/gen_status_icons.py
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

ICONS_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "img", "icons"))
SIZE = 48
C = SIZE / 2


def gel():
    """Flocon de givre — DoT Engelures."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    # halo glacé doux
    halo = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dh = ImageDraw.Draw(halo)
    dh.ellipse([C - 20, C - 20, C + 20, C + 20], fill=(118, 192, 232, 70))
    halo = halo.filter(ImageFilter.GaussianBlur(3))
    img = Image.alpha_composite(img, halo)

    d = ImageDraw.Draw(img)
    outline = (58, 122, 168, 255)
    ice = (214, 240, 251, 255)
    arm = 18

    # deux passes : contour foncé large, puis cœur clair étroit
    for col, w, bw in ((outline, 7, 5), (ice, 4, 3)):
        for i in range(6):
            ang = math.pi / 2 + i * math.pi / 3
            ux, uy = math.cos(ang), math.sin(ang)
            d.line([(C, C), (C + ux * arm, C + uy * arm)], fill=col, width=w)
            for frac, blen in ((0.52, 0.34), (0.80, 0.22)):
                bx, by = C + ux * arm * frac, C + uy * arm * frac
                for sgn in (-1, 1):
                    ba = ang + sgn * math.pi / 3
                    d.line([(bx, by),
                            (bx + math.cos(ba) * arm * blen,
                             by + math.sin(ba) * arm * blen)],
                           fill=col, width=bw)

    # cœur lumineux
    d.ellipse([C - 5, C - 5, C + 5, C + 5], fill=outline)
    d.ellipse([C - 3, C - 3, C + 3, C + 3], fill=(245, 252, 255, 255))
    return img


def main():
    os.makedirs(ICONS_DIR, exist_ok=True)
    for slug, fn in (("gel", gel),):
        path = os.path.join(ICONS_DIR, slug + ".png")
        fn().save(path, "PNG", optimize=True)
        print(f"Wrote {path} ({os.path.getsize(path)} bytes)")


if __name__ == "__main__":
    main()
