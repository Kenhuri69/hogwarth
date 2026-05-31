#!/usr/bin/env python3
"""Génère les icônes restantes du Journal / log de combat pour img/icons/.

Complète gen_status_icons.py pour viser le « zéro emoji » dans la boîte
#battle-log et le panneau #combat-log-list. Ne couvre QUE les emoji sans
PNG existant (les autres réutilisent spells/*, items/*, mp/search/gel…) :

  - crit     (💥) éclat explosif orange-rouge
  - sparkle  (✨) étincelle dorée 4 branches
  - resist   (🔰) bouclier bleu (déflexion)
  - celerity (⚡) éclair cyan
  - fail     (❌) disque rouge + croix
  - dodge    (💨) bourrasque gris-cyan
  - serpent  (🐍) serpent vert (lifesteal Serpentard)
  - tenebres (🌑) orbe sombre + croissant + halo violet
  - lion     (🦁) face de lion dorée (Élan Gryffondor)

Format : badge 48×48 RGBA cohérent avec burn/poison/protego.png.
Lancer depuis la racine du projet :
    python3 tools/gen_combat_log_icons.py
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

ICONS_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "img", "icons"))
SIZE = 48
C = SIZE / 2


def _new():
    return Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))


def _radial_halo(r_outer, r_inner, color_outer, color_inner=None, blur=3):
    halo = _new()
    dh = ImageDraw.Draw(halo)
    dh.ellipse([C - r_outer, C - r_outer, C + r_outer, C + r_outer], fill=color_outer)
    if color_inner:
        dh.ellipse([C - r_inner, C - r_inner, C + r_inner, C + r_inner], fill=color_inner)
    return halo.filter(ImageFilter.GaussianBlur(blur))


def _star(d, cx, cy, n, r_out, r_in, fill, outline=None, rot=-math.pi / 2):
    pts = []
    for i in range(n * 2):
        ang = rot + i * math.pi / n
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
    d.polygon(pts, fill=fill, outline=outline)


def crit():
    """Éclat explosif — coup critique / dégâts amplifiés."""
    img = _radial_halo(21, 11, (240, 120, 40, 110), (255, 190, 110, 70), blur=4)
    d = ImageDraw.Draw(img)
    # éclat à 10 branches irrégulières (orange foncé -> orange clair)
    _star(d, C, C, 10, 21, 8, (210, 70, 20, 255), outline=(120, 35, 5, 255))
    _star(d, C, C, 10, 15, 5.5, (250, 150, 50, 255))
    _star(d, C, C, 6, 9, 3.5, (255, 220, 120, 255))
    # cœur blanc-jaune
    d.ellipse([C - 3.5, C - 3.5, C + 3.5, C + 3.5], fill=(255, 244, 210, 255))
    return img


def sparkle():
    """Étincelle dorée 4 branches — gains / transitions / magie."""
    img = _radial_halo(20, 10, (236, 214, 146, 110), (255, 236, 170, 70), blur=4)
    d = ImageDraw.Draw(img)
    gold = (236, 198, 70, 255)
    light = (255, 240, 185, 255)
    rim = (150, 110, 25, 255)

    def four_point(cx, cy, r, fill, ol=None):
        k = r * 0.20
        pts = [
            (cx, cy - r), (cx + k, cy - k), (cx + r, cy), (cx + k, cy + k),
            (cx, cy + r), (cx - k, cy + k), (cx - r, cy), (cx - k, cy - k),
        ]
        d.polygon(pts, fill=fill, outline=ol)

    four_point(C, C, 18, gold, rim)
    four_point(C, C, 11, light)
    # deux petites étincelles satellites
    four_point(C + 13, C - 12, 5, gold)
    four_point(C - 13, C + 11, 4, gold)
    d.ellipse([C - 2.5, C - 2.5, C + 2.5, C + 2.5], fill=(255, 252, 235, 255))
    return img


def _shield_path(cx, cy, w, h):
    return [
        (cx, cy - h * 0.50), (cx + w * 0.42, cy - h * 0.42),
        (cx + w * 0.50, cy - h * 0.22), (cx + w * 0.46, cy + h * 0.10),
        (cx + w * 0.28, cy + h * 0.38), (cx, cy + h * 0.50),
        (cx - w * 0.28, cy + h * 0.38), (cx - w * 0.46, cy + h * 0.10),
        (cx - w * 0.50, cy - h * 0.22), (cx - w * 0.42, cy - h * 0.42),
    ]


def resist():
    """Bouclier bleu — résistance élémentaire (atténuation)."""
    img = _radial_halo(20, 12, (70, 130, 200, 95), (150, 200, 240, 55), blur=4)
    d = ImageDraw.Draw(img)
    body = (66, 120, 190, 255)
    rim = (28, 60, 110, 255)
    shine = (170, 210, 245, 255)
    pts = _shield_path(C, C + 1, SIZE - 14, SIZE - 8)
    d.polygon(pts, fill=body, outline=rim)
    for i in range(len(pts)):
        d.line([pts[i], pts[(i + 1) % len(pts)]], fill=rim, width=2)
    # reflet clair haut-gauche
    pts_inner = [(p[0] - 1.6, p[1] - 1.6) for p in pts]
    for i in (-1, 0, 1):
        d.line([pts_inner[(i - 1) % len(pts_inner)], pts_inner[i % len(pts_inner)]],
               fill=shine, width=1)
    # chevron de déflexion central
    d.line([(C - 7, C - 4), (C, C - 9), (C + 7, C - 4)], fill=shine, width=2)
    d.line([(C - 7, C + 3), (C, C - 2), (C + 7, C + 3)], fill=shine, width=2)
    return img


def celerity():
    """Éclair cyan — Célérité / action supplémentaire."""
    img = _radial_halo(20, 10, (90, 210, 220, 105), (170, 245, 250, 60), blur=4)
    d = ImageDraw.Draw(img)
    bolt = [
        (C + 4, C - 18), (C - 9, C + 2), (C - 1, C + 2),
        (C - 4, C + 18), (C + 10, C - 5), (C + 2, C - 5),
    ]
    # contour foncé puis remplissage cyan + cœur clair
    d.polygon(bolt, fill=(40, 120, 140, 255), outline=(15, 70, 85, 255))
    inner = [(C + (p[0] - C) * 0.74, C + (p[1] - C) * 0.86) for p in bolt]
    d.polygon(inner, fill=(120, 235, 245, 255))
    return img


def fail():
    """Disque rouge barré d'une croix — échec / dissipation."""
    img = _radial_halo(19, 0, (200, 60, 55, 90), blur=3)
    d = ImageDraw.Draw(img)
    d.ellipse([C - 16, C - 16, C + 16, C + 16],
              fill=(190, 50, 45, 255), outline=(110, 22, 20, 255))
    d.ellipse([C - 16, C - 16, C + 16, C + 16], outline=(110, 22, 20, 255), width=2)
    # croix blanche épaisse
    for dx in (-1, 0, 1):
        d.line([(C - 7 + dx, C - 7), (C + 7 + dx, C + 7)], fill=(255, 235, 232, 255), width=2)
        d.line([(C - 7 + dx, C + 7), (C + 7 + dx, C - 7)], fill=(255, 235, 232, 255), width=2)
    return img


def dodge():
    """Bourrasque gris-cyan — esquive."""
    img = _radial_halo(19, 0, (170, 200, 215, 70), blur=3)
    d = ImageDraw.Draw(img)
    pale = (225, 240, 248, 255)
    edge = (150, 180, 198, 255)
    # trois traînées de vent incurvées (arcs ouverts vers la droite)
    for (cy, x0, x1, w) in ((C - 8, C - 16, C + 10, 4),
                            (C, C - 18, C + 15, 5),
                            (C + 8, C - 16, C + 8, 4)):
        d.arc([x0, cy - 9, x1 + 8, cy + 9], start=110, end=350, fill=edge, width=w + 2)
        d.arc([x0, cy - 9, x1 + 8, cy + 9], start=110, end=350, fill=pale, width=w)
    return img


def serpent():
    """Serpent vert en S — lifesteal Serpentard."""
    img = _radial_halo(20, 0, (60, 160, 90, 90), blur=3)
    d = ImageDraw.Draw(img)
    body = (70, 170, 95, 255)
    rim = (25, 80, 45, 255)
    # corps : courbe en S échantillonnée puis tracée épaisse
    pts = []
    for i in range(33):
        t = i / 32.0
        y = C - 17 + t * 32
        x = C + math.sin(t * math.pi * 2.0) * 11
        pts.append((x, y))
    d.line(pts, fill=rim, width=8, joint="curve")
    d.line(pts, fill=body, width=5, joint="curve")
    # tête (en haut) + langue + œil
    hx, hy = pts[0]
    d.ellipse([hx - 6, hy - 5, hx + 6, hy + 5], fill=body, outline=rim)
    d.line([(hx, hy - 4), (hx, hy - 9)], fill=(200, 60, 60, 255), width=2)  # langue
    d.line([(hx - 2, hy - 9), (hx, hy - 6)], fill=(200, 60, 60, 255), width=2)
    d.line([(hx + 2, hy - 9), (hx, hy - 6)], fill=(200, 60, 60, 255), width=2)
    d.ellipse([hx - 3, hy - 2, hx - 1, hy], fill=(245, 230, 120, 255))  # œil
    return img


def tenebres():
    """Orbe sombre + croissant + halo violet — ténèbres / drain."""
    img = _radial_halo(21, 12, (110, 55, 150, 120), (165, 110, 205, 60), blur=5)
    d = ImageDraw.Draw(img)
    # orbe noir-violet
    d.ellipse([C - 15, C - 15, C + 15, C + 15],
              fill=(28, 14, 44, 255), outline=(95, 55, 135, 255))
    d.ellipse([C - 15, C - 15, C + 15, C + 15], outline=(120, 75, 165, 255), width=2)
    # croissant clair (décalé) en évidant un disque sombre
    cres = _new()
    dc = ImageDraw.Draw(cres)
    dc.ellipse([C - 12, C - 12, C + 12, C + 12], fill=(150, 100, 195, 235))
    dc.ellipse([C - 6, C - 14, C + 18, C + 10], fill=(0, 0, 0, 0))
    img = Image.alpha_composite(img, cres)
    return img


def lion():
    """Face de lion dorée — passif Élan (Gryffondor)."""
    img = _radial_halo(21, 0, (236, 200, 90, 100), blur=4)
    d = ImageDraw.Draw(img)
    mane = (180, 120, 35, 255)
    mane_rim = (110, 70, 18, 255)
    face = (240, 205, 120, 255)
    dark = (70, 40, 10, 255)
    # crinière : étoile à 12 pointes
    _star(d, C, C, 12, 21, 14, mane, outline=mane_rim)
    # face ronde
    d.ellipse([C - 12, C - 11, C + 12, C + 13], fill=face, outline=mane_rim)
    # oreilles
    for sx in (-1, 1):
        d.ellipse([C + sx * 9 - 4, C - 12, C + sx * 9 + 4, C - 4], fill=face, outline=mane_rim)
    # yeux
    for sx in (-1, 1):
        d.ellipse([C + sx * 5 - 2, C - 4, C + sx * 5 + 2, C], fill=dark)
    # museau + nez + bouche
    d.polygon([(C, C + 2), (C - 4, C + 6), (C + 4, C + 6)], fill=(120, 75, 30, 255))
    d.line([(C, C + 6), (C, C + 9)], fill=dark, width=2)
    d.arc([C - 5, C + 6, C, C + 11], start=20, end=160, fill=dark, width=2)
    d.arc([C, C + 6, C + 5, C + 11], start=20, end=160, fill=dark, width=2)
    return img


def main():
    os.makedirs(ICONS_DIR, exist_ok=True)
    recipes = (
        ("crit", crit), ("sparkle", sparkle), ("resist", resist),
        ("celerity", celerity), ("fail", fail), ("dodge", dodge),
        ("serpent", serpent), ("tenebres", tenebres), ("lion", lion),
    )
    for slug, fn in recipes:
        path = os.path.join(ICONS_DIR, slug + ".png")
        fn().save(path, "PNG", optimize=True)
        print(f"Wrote {path} ({os.path.getsize(path)} bytes)")


if __name__ == "__main__":
    main()
