#!/usr/bin/env python3
"""Génère l'icône du bouton de combat « Rune » (environnement runique).

Sortie : img/icons/rune.png — badge 48×48 RGBA cohérent avec les autres
icônes de bouton de combat (atk/mp/protego). Visuel : pierre runique
sombre gravée d'une rune protectrice (style Algiz ᛉ) qui rayonne d'une
lueur dorée/ambre (thème « Ruines Anciennes » + or du jeu).

Procédural via Pillow. Lancer depuis la racine du projet :
    python3 tools/gen_rune_icon.py
"""
import os

from PIL import Image, ImageDraw, ImageFilter

ICONS_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "img", "icons"))
SIZE = 48
C = SIZE / 2


def _rounded_tablet():
    """Tablette de pierre sombre, coins arrondis, biseau clair."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = 6
    box = [pad, pad - 1, SIZE - pad, SIZE - pad + 1]
    # ombre portée
    sh = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ds = ImageDraw.Draw(sh)
    ds.rounded_rectangle([pad, pad + 1, SIZE - pad, SIZE - pad + 2],
                         radius=9, fill=(0, 0, 0, 150))
    sh = sh.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, sh)
    d = ImageDraw.Draw(img)
    # biseau extérieur (pierre claire)
    d.rounded_rectangle(box, radius=9, fill=(92, 74, 48, 255))
    # face intérieure (pierre sombre granuleuse)
    d.rounded_rectangle([box[0] + 2, box[1] + 2, box[2] - 2, box[3] - 2],
                        radius=7, fill=(44, 34, 22, 255))
    # éclairage haut-gauche
    hi = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dh = ImageDraw.Draw(hi)
    dh.rounded_rectangle([box[0] + 2, box[1] + 2, box[2] - 2, box[3] - 6],
                         radius=7, fill=(120, 96, 60, 60))
    hi = hi.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, hi)
    return img


def _rune_path():
    """Points d'une rune type Algiz (tronc + deux bras levés + branches)."""
    top = (C, 11)
    bot = (C, 37)
    # bras supérieurs
    arm_l = (C - 8.5, 16)
    arm_r = (C + 8.5, 16)
    # branches médianes (donne le côté « gravé »)
    mid_l = (C - 6.5, 25)
    mid_r = (C + 6.5, 25)
    mid = (C, 24)
    return [
        (top, bot),       # tronc
        (mid, arm_l),     # bras gauche
        (mid, arm_r),     # bras droit
        ((C, 30), mid_l), # branche basse gauche
        ((C, 30), mid_r), # branche basse droite
    ]


def _draw_rune(img, color, width, blur=0):
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for a, b in _rune_path():
        d.line([a, b], fill=color, width=width)
    for p in ((C, 11), (C, 37), (C - 8.5, 16), (C + 8.5, 16)):
        r = width / 2
        d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color)
    if blur:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    return Image.alpha_composite(img, layer)


def build():
    img = _rounded_tablet()

    # halo doré diffus derrière la gravure
    halo = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dh = ImageDraw.Draw(halo)
    dh.ellipse([C - 15, C - 16, C + 15, C + 14], fill=(201, 168, 76, 90))
    halo = halo.filter(ImageFilter.GaussianBlur(5))
    img = Image.alpha_composite(img, halo)

    # gravure creusée (trait sombre, décalé bas-droite)
    carve = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dc = ImageDraw.Draw(carve)
    for a, b in _rune_path():
        dc.line([(a[0] + 1, a[1] + 1), (b[0] + 1, b[1] + 1)],
                fill=(16, 10, 4, 230), width=5)
    img = Image.alpha_composite(img, carve)

    # lueur large ambrée
    img = _draw_rune(img, (224, 176, 70, 200), 7, blur=2.4)
    # trait doré net
    img = _draw_rune(img, (243, 214, 140, 255), 3)
    # cœur incandescent clair
    img = _draw_rune(img, (255, 247, 222, 255), 1)

    return img


def main():
    os.makedirs(ICONS_DIR, exist_ok=True)
    out = os.path.join(ICONS_DIR, "rune.png")
    build().save(out)
    print("écrit", out)


if __name__ == "__main__":
    main()
