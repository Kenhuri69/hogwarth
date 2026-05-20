#!/usr/bin/env python3
"""Génère les icônes de statut de combat pour img/icons/.

Couvre :
  - `gel`     (DoT Engelures ❄️) — flocon de givre cyan
  - `weaken`  (Affaiblissement)  — bouclier brisé violet
  - `protego` (Bouclier magique) — bouclier doré pulsant

Format : badge 48×48 cohérent avec burn/poison/bleed.png.
Procédural via Pillow. Lancer depuis la racine du projet :
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


def _shield_path(cx, cy, w, h):
    """Renvoie la liste des points d'un bouclier (forme « héraldique »)."""
    pts = [
        (cx,         cy - h * 0.50),  # haut centre
        (cx + w*0.42, cy - h * 0.42),
        (cx + w*0.50, cy - h * 0.22),
        (cx + w*0.46, cy + h * 0.10),
        (cx + w*0.28, cy + h * 0.38),
        (cx,         cy + h * 0.50),  # pointe bas
        (cx - w*0.28, cy + h * 0.38),
        (cx - w*0.46, cy + h * 0.10),
        (cx - w*0.50, cy - h * 0.22),
        (cx - w*0.42, cy - h * 0.42),
    ]
    return pts


def weaken():
    """Bouclier brisé violet — statut Affaiblissement (DEF réduite)."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    # halo violet sourd
    halo = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(halo).ellipse([C - 19, C - 19, C + 19, C + 19],
                                 fill=(155, 89, 182, 60))
    halo = halo.filter(ImageFilter.GaussianBlur(3))
    img = Image.alpha_composite(img, halo)

    d = ImageDraw.Draw(img)
    body    = (130, 70, 160, 255)
    rim     = (75, 35, 100, 255)
    crack   = (40, 15, 55, 255)
    inner   = (175, 120, 200, 255)

    pts = _shield_path(C, C + 1, SIZE - 14, SIZE - 8)
    d.polygon(pts, fill=body, outline=rim)
    # tracer l'outline une seconde fois épais pour un cerclage net
    for i in range(len(pts)):
        d.line([pts[i], pts[(i + 1) % len(pts)]], fill=rim, width=2)

    # reflet intérieur clair côté gauche
    pts_inner = [(p[0] - 1.4, p[1] - 1.4) for p in pts]
    d.line([pts_inner[0], pts_inner[-1]], fill=inner, width=1)
    d.line([pts_inner[-1], pts_inner[-2]], fill=inner, width=1)

    # fissure brisée diagonale : 2 segments en zigzag du haut-droite vers le bas-gauche
    crack_pts = [
        (C + 7, C - 14),
        (C + 2, C - 4),
        (C + 5, C + 2),
        (C - 3, C + 8),
        (C - 1, C + 14),
    ]
    for i in range(len(crack_pts) - 1):
        d.line([crack_pts[i], crack_pts[i + 1]], fill=crack, width=3)
    # petits éclats noirs au bord de la fissure
    for px, py in crack_pts[1:-1]:
        d.ellipse([px - 2, py - 2, px + 2, py + 2], fill=crack)

    return img


def protego():
    """Bouclier doré pulsant — buff Protego (bloque la prochaine attaque)."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    # halo doré pulsant large
    halo = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dh = ImageDraw.Draw(halo)
    dh.ellipse([C - 22, C - 22, C + 22, C + 22], fill=(236, 214, 146, 90))
    dh.ellipse([C - 16, C - 16, C + 16, C + 16], fill=(255, 230, 160, 60))
    halo = halo.filter(ImageFilter.GaussianBlur(4))
    img = Image.alpha_composite(img, halo)

    d = ImageDraw.Draw(img)
    rim     = (110, 75, 20, 255)
    body    = (201, 168, 76, 255)   # gold (cohérent --gold UI)
    shine   = (245, 224, 156, 255)  # gold clair
    sigil   = (60, 35, 5, 255)

    pts = _shield_path(C, C + 1, SIZE - 14, SIZE - 8)
    d.polygon(pts, fill=body, outline=rim)
    # outline épais
    for i in range(len(pts)):
        d.line([pts[i], pts[(i + 1) % len(pts)]], fill=rim, width=2)

    # reflet clair en haut-gauche (deux segments de l'outline intérieur)
    pts_inner = [(p[0] - 1.6, p[1] - 1.6) for p in pts]
    for i in (-1, 0, 1):
        d.line([pts_inner[(i - 1) % len(pts_inner)], pts_inner[i % len(pts_inner)]],
               fill=shine, width=1)

    # sigil central : étoile à 4 branches stylisée (rune protectrice)
    cx, cy = C, C + 1
    d.polygon([
        (cx,      cy - 9),
        (cx + 2,  cy - 2),
        (cx + 9,  cy),
        (cx + 2,  cy + 2),
        (cx,      cy + 9),
        (cx - 2,  cy + 2),
        (cx - 9,  cy),
        (cx - 2,  cy - 2),
    ], fill=sigil)
    # petit éclat clair au centre
    d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=shine)

    return img


def main():
    os.makedirs(ICONS_DIR, exist_ok=True)
    for slug, fn in (("gel", gel), ("weaken", weaken), ("protego", protego)):
        path = os.path.join(ICONS_DIR, slug + ".png")
        fn().save(path, "PNG", optimize=True)
        print(f"Wrote {path} ({os.path.getsize(path)} bytes)")


if __name__ == "__main__":
    main()
