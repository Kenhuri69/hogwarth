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


def _radial_halo(r_outer, r_inner, color_outer, color_inner=None, blur=3):
    """Renvoie une layer transparente avec un halo circulaire gaussien."""
    halo = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dh = ImageDraw.Draw(halo)
    dh.ellipse([C - r_outer, C - r_outer, C + r_outer, C + r_outer], fill=color_outer)
    if color_inner:
        dh.ellipse([C - r_inner, C - r_inner, C + r_inner, C + r_inner], fill=color_inner)
    return halo.filter(ImageFilter.GaussianBlur(blur))


def disarm():
    """Baguette brisée bronze-or — statut Désarmé."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    img = Image.alpha_composite(img, _radial_halo(18, 0, (201, 168, 76, 80), blur=3))
    d = ImageDraw.Draw(img)
    rim   = (90, 55, 15, 255)
    body  = (188, 145, 60, 255)
    tip   = (235, 210, 140, 255)
    crack = (35, 20, 5, 255)

    # baguette : diagonale haut-gauche → bas-droite avec une rupture au centre
    # segment haut (intact, plus large à la base)
    d.polygon([(C - 17, C - 14), (C - 13, C - 18), (C - 4, C - 9), (C - 8, C - 5)], fill=body)
    d.polygon([(C - 17, C - 14), (C - 13, C - 18), (C - 4, C - 9), (C - 8, C - 5)], outline=rim)
    d.ellipse([C - 19, C - 16, C - 13, C - 10], fill=tip)   # embout en haut-gauche
    d.ellipse([C - 19, C - 16, C - 13, C - 10], outline=rim)

    # segment bas (fissuré, plus fin vers la pointe)
    d.polygon([(C + 4, C + 5), (C + 1, C + 9), (C + 14, C + 18), (C + 17, C + 14)], fill=body)
    d.polygon([(C + 4, C + 5), (C + 1, C + 9), (C + 14, C + 18), (C + 17, C + 14)], outline=rim)
    d.ellipse([C + 13, C + 13, C + 19, C + 19], fill=tip)  # pointe en bas-droite
    d.ellipse([C + 13, C + 13, C + 19, C + 19], outline=rim)

    # fissure entre les deux segments
    d.line([(C - 8, C - 5), (C - 4, C - 1)], fill=crack, width=2)
    d.line([(C - 4, C - 1), (C + 4, C + 5)], fill=crack, width=2)
    d.line([(C + 1, C + 9), (C + 4, C + 5)], fill=crack, width=2)
    # éclats à la rupture
    for px, py in ((C - 4, C - 1), (C + 1, C + 4)):
        d.ellipse([px - 2, py - 2, px + 2, py + 2], fill=crack)
    return img


def regen():
    """Croix médicale verte avec halo — statut Régénération."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    img = Image.alpha_composite(img, _radial_halo(20, 12, (90, 200, 100, 80), (170, 240, 175, 60), blur=4))
    d = ImageDraw.Draw(img)
    rim   = (30, 95, 40, 255)
    green = (58, 165, 90, 255)
    light = (170, 240, 175, 255)

    # disque fond
    d.ellipse([C - 17, C - 17, C + 17, C + 17], fill=(20, 60, 30, 230), outline=rim)
    # croix verte épaisse
    arm = 12
    th  = 5
    d.rectangle([C - th, C - arm, C + th, C + arm], fill=green, outline=rim)
    d.rectangle([C - arm, C - th, C + arm, C + th], fill=green, outline=rim)
    # reflet clair sur l'épine verticale
    d.line([(C - 2, C - arm + 2), (C - 2, C + arm - 2)], fill=light, width=1)
    return img


def stun():
    """Spirale d'étoiles dorées tournoyantes — statut Étourdi."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    img = Image.alpha_composite(img, _radial_halo(20, 0, (236, 214, 146, 110), blur=4))
    d = ImageDraw.Draw(img)
    gold      = (236, 198, 70, 255)
    gold_lite = (255, 235, 165, 255)
    outline   = (90, 55, 15, 255)

    # 3 étoiles à 5 branches autour du centre, à des rayons et angles variés
    def star(cx, cy, r_outer, r_inner=None, fill=gold, ol=outline):
        if r_inner is None: r_inner = r_outer * 0.45
        pts = []
        for i in range(10):
            ang = -math.pi / 2 + i * math.pi / 5
            r   = r_outer if i % 2 == 0 else r_inner
            pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
        d.polygon(pts, fill=fill, outline=ol)

    star(C - 7, C - 6, 7, fill=gold_lite)
    star(C + 8, C + 1, 6)
    star(C - 4, C + 9, 5)
    return img


def fear():
    """Visage spectral cyan-violet avec halo glacial — statut Apeuré."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    img = Image.alpha_composite(img, _radial_halo(20, 12, (90, 107, 140, 90), (180, 195, 230, 50), blur=4))
    d = ImageDraw.Draw(img)
    ghost_body   = (210, 220, 245, 255)
    ghost_shadow = (122, 138, 175, 255)
    eye          = (15, 20, 35, 255)

    # corps "fantôme" : cercle haut + draperie ondulée
    d.ellipse([C - 13, C - 16, C + 13, C + 6], fill=ghost_body, outline=ghost_shadow)
    # draperie : 3 vagues en bas
    drape = [(C - 13, C),
             (C - 13, C + 12),
             (C - 8,  C + 8),
             (C - 4,  C + 14),
             (C,      C + 9),
             (C + 4,  C + 14),
             (C + 8,  C + 8),
             (C + 13, C + 12),
             (C + 13, C)]
    d.polygon(drape, fill=ghost_body, outline=ghost_shadow)
    # 2 yeux ronds noirs grands ouverts
    d.ellipse([C - 7, C - 8, C - 2, C - 1], fill=eye)
    d.ellipse([C + 2, C - 8, C + 7, C - 1], fill=eye)
    # bouche petit "o" terrorisé
    d.ellipse([C - 2, C, C + 2, C + 4], fill=eye)
    return img


def imperius():
    """Spirale violette hypnotique — statut Asservi."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    img = Image.alpha_composite(img, _radial_halo(20, 10, (125, 63, 160, 100), (190, 130, 220, 60), blur=4))
    d = ImageDraw.Draw(img)
    rim    = (60, 25, 90, 255)
    purple = (138, 75, 175, 255)
    light  = (220, 175, 240, 255)

    # disque fond
    d.ellipse([C - 17, C - 17, C + 17, C + 17], fill=(35, 18, 55, 235), outline=rim)
    # spirale logarithmique en pointillés épais (3 boucles)
    a = 1.0
    b = 0.32
    last = None
    for i in range(50):
        t = i * 0.32
        r = a + b * t
        if r > 14: break
        x = C + math.cos(t) * r
        y = C + math.sin(t) * r
        if last:
            col = light if i % 2 == 0 else purple
            d.line([last, (x, y)], fill=col, width=2)
        last = (x, y)
    # point central clair
    d.ellipse([C - 2, C - 2, C + 2, C + 2], fill=light)
    return img


def regen_ferula_max():
    """Croix médicale verte + étincelles dorées — Ferula Maxima."""
    img = regen()  # base = regen
    d = ImageDraw.Draw(img)
    spark = (250, 230, 130, 255)
    # 4 étincelles aux coins
    for dx, dy in ((-15, -15), (15, -15), (-15, 15), (15, 15)):
        cx, cy = C + dx, C + dy
        d.polygon([
            (cx,     cy - 4),
            (cx + 1, cy - 1),
            (cx + 4, cy),
            (cx + 1, cy + 1),
            (cx,     cy + 4),
            (cx - 1, cy + 1),
            (cx - 4, cy),
            (cx - 1, cy - 1),
        ], fill=spark)
    return img


def main():
    os.makedirs(ICONS_DIR, exist_ok=True)
    recipes = (
        ("gel", gel), ("weaken", weaken), ("protego", protego),
        ("disarm", disarm), ("regen", regen), ("stun", stun),
        ("fear", fear), ("imperius", imperius),
        ("regen_ferula_max", regen_ferula_max),
    )
    for slug, fn in recipes:
        path = os.path.join(ICONS_DIR, slug + ".png")
        fn().save(path, "PNG", optimize=True)
        print(f"Wrote {path} ({os.path.getsize(path)} bytes)")


if __name__ == "__main__":
    main()
