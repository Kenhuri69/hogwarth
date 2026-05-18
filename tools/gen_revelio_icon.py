#!/usr/bin/env python3
"""Génère img/icons/spells/revelio.png — loupe dorée révélant une rune de lumière.

Style cohérent avec les autres sorts (128×128, alpha, halo magique).
Revelio = charme de révélation : une loupe dont la lentille dissipe un voile
de brume et fait apparaître une rune lumineuse. Procédural via Pillow.
Lancer depuis la racine du projet :
    python3 tools/gen_revelio_icon.py
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "img", "icons", "spells",
                   "revelio.png")
OUT = os.path.normpath(OUT)

SIZE = 128
CENTER = SIZE / 2
# Centre de la lentille (décalé en haut-gauche, manche vers le bas-droite)
LENS_X, LENS_Y = 53.0, 53.0
LENS_R = 31.0

random.seed(42)


def lerp(a, b, t):
    return a + (b - a) * t


def hex_to_rgb(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def mist_layer():
    """Voile de brume bleu-gris, dense aux coins, dissipé près de la lentille."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    px = img.load()
    fog = hex_to_rgb("#3a4660")
    for y in range(SIZE):
        for x in range(SIZE):
            dx, dy = x - LENS_X, y - LENS_Y
            r = math.hypot(dx, dy)
            # la brume s'efface là où la lentille la révèle
            clear = max(0.0, 1.0 - r / (LENS_R + 26))
            swirl = math.sin(x * 0.13 + y * 0.09) * math.cos(y * 0.11) * 0.5 + 0.5
            edge = min(1.0, r / (SIZE * 0.62))
            alpha = int(150 * edge * (0.45 + 0.55 * swirl) * (1.0 - clear))
            if alpha > 0:
                px[x, y] = (fog[0], fog[1], fog[2], alpha)
    return img.filter(ImageFilter.GaussianBlur(2.4))


def beam_layer():
    """Rais de lumière chaude émanant du cœur de la lentille."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    glow = hex_to_rgb("#ffe9a8")
    n = 12
    for i in range(n):
        a = 2 * math.pi * i / n + 0.26
        length = LENS_R + (20 if i % 2 == 0 else 11)
        x2 = LENS_X + math.cos(a) * length
        y2 = LENS_Y + math.sin(a) * length
        d.line([(LENS_X, LENS_Y), (x2, y2)], fill=glow + (70,), width=3)
    return img.filter(ImageFilter.GaussianBlur(2.0))


def lens_interior_layer():
    """Intérieur de la lentille : verre radiant, clair au centre."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    px = img.load()
    core = hex_to_rgb("#fff6d8")
    rim = hex_to_rgb("#caa44e")
    for y in range(SIZE):
        for x in range(SIZE):
            dx, dy = x - LENS_X, y - LENS_Y
            r = math.hypot(dx, dy)
            if r > LENS_R:
                continue
            t = r / LENS_R
            mix = (
                int(lerp(core[0], rim[0], t * t)),
                int(lerp(core[1], rim[1], t * t)),
                int(lerp(core[2], rim[2], t * t)),
            )
            falloff = 1.0 if t < 0.9 else 1 - (t - 0.9) / 0.1
            px[x, y] = (mix[0], mix[1], mix[2], int(235 * falloff))
    # reflet diagonal sur le verre
    hi = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hd.ellipse([LENS_X - 18, LENS_Y - 22, LENS_X + 2, LENS_Y - 4],
               fill=(255, 255, 255, 90))
    hi = hi.filter(ImageFilter.GaussianBlur(3.0))
    return Image.alpha_composite(img, hi)


def rune_layer():
    """Rune de révélation qui apparaît dans la lentille."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ink = hex_to_rgb("#6c4a12") + (235,)
    cx, cy = LENS_X, LENS_Y
    # œil stylisé : losange + pupille (motif de révélation)
    w, h = 16, 9
    d.polygon([(cx - w, cy), (cx, cy - h), (cx + w, cy), (cx, cy + h)],
              outline=ink, width=3)
    d.ellipse([cx - 4.5, cy - 4.5, cx + 4.5, cy + 4.5], fill=ink)
    d.ellipse([cx - 1.6, cy - 1.6, cx + 1.6, cy + 1.6],
              fill=hex_to_rgb("#fff6d8") + (255,))
    return img


def frame_layer():
    """Monture dorée de la loupe + manche."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    gold = hex_to_rgb("#f0c75e")
    gold_dark = hex_to_rgb("#9a7820")

    # manche : barre épaisse de la lentille vers le coin bas-droit
    a = math.radians(45)
    h0x = LENS_X + math.cos(a) * (LENS_R - 2)
    h0y = LENS_Y + math.sin(a) * (LENS_R - 2)
    h1x = LENS_X + math.cos(a) * (LENS_R + 36)
    h1y = LENS_Y + math.sin(a) * (LENS_R + 36)
    d.line([(h0x, h0y), (h1x, h1y)], fill=gold_dark, width=11)
    d.line([(h0x, h0y), (h1x, h1y)], fill=gold, width=7)
    d.ellipse([h1x - 6, h1y - 6, h1x + 6, h1y + 6], fill=gold,
              outline=gold_dark, width=2)

    # cercle de monture (double anneau)
    for rr, col, w in ((LENS_R + 4, gold_dark, 7),
                       (LENS_R + 3, gold, 5),
                       (LENS_R, gold_dark, 2)):
        d.ellipse([LENS_X - rr, LENS_Y - rr, LENS_X + rr, LENS_Y + rr],
                  outline=col, width=w)
    return img


def halo_layer():
    """Halo lumineux extérieur (sort de lumière)."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    glow = hex_to_rgb("#ffe9a8")
    for i, a in enumerate([34, 26, 18, 11]):
        rr = LENS_R + 6 + i * 3.2
        d.ellipse([LENS_X - rr, LENS_Y - rr, LENS_X + rr, LENS_Y + rr],
                  outline=glow + (a,), width=3)
    return img.filter(ImageFilter.GaussianBlur(3.4))


def sparks_layer():
    """Scintillements révélés autour de la lentille."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    white = (255, 248, 224, 245)
    for _ in range(13):
        a = random.uniform(0, 2 * math.pi)
        r = random.uniform(LENS_R * 0.3, LENS_R + 14)
        x = LENS_X + math.cos(a) * r
        y = LENS_Y + math.sin(a) * r
        s = random.uniform(0.7, 1.9)
        d.ellipse([x - s, y - s, x + s, y + s], fill=white)
    return img.filter(ImageFilter.GaussianBlur(0.4))


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out = Image.alpha_composite(out, mist_layer())
    out = Image.alpha_composite(out, halo_layer())
    out = Image.alpha_composite(out, beam_layer())
    out = Image.alpha_composite(out, lens_interior_layer())
    out = Image.alpha_composite(out, rune_layer())
    out = Image.alpha_composite(out, frame_layer())
    out = Image.alpha_composite(out, sparks_layer())
    out.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({os.path.getsize(OUT)} bytes)")


if __name__ == "__main__":
    main()
