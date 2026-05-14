#!/usr/bin/env python3
"""Génère img/icons/spells/teleportation.png — vortex bleu-violet avec runes dorées.

Style cohérent avec les autres sorts (formats 128×128, alpha, halo magique).
Procédural via Pillow. Lancer depuis la racine du projet :
    python3 tools/gen_teleportation_icon.py
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "img", "icons", "spells",
                   "teleportation.png")
OUT = os.path.normpath(OUT)

SIZE = 128
CENTER = SIZE / 2

random.seed(42)


def lerp(a, b, t):
    return a + (b - a) * t


def hex_to_rgb(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def vortex_layer():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    px = img.load()
    cx, cy = CENTER - 0.5, CENTER - 0.5
    r_max = SIZE * 0.46

    inner = hex_to_rgb("#ecd8ff")
    mid = hex_to_rgb("#7860d0")
    edge = hex_to_rgb("#2a1860")
    outer = hex_to_rgb("#1a0a30")

    for y in range(SIZE):
        for x in range(SIZE):
            dx, dy = x - cx, y - cy
            r = math.hypot(dx, dy)
            if r > r_max:
                continue
            # spirale logarithmique
            theta = math.atan2(dy, dx)
            spiral = math.sin(theta * 4 + r * 0.32) * 0.5 + 0.5
            t = r / r_max
            base = (
                int(lerp(inner[0], edge[0], t)),
                int(lerp(inner[1], edge[1], t)),
                int(lerp(inner[2], edge[2], t)),
            )
            # superpose le motif spiralé
            mix = (
                int(lerp(base[0], mid[0], spiral * 0.55)),
                int(lerp(base[1], mid[1], spiral * 0.55)),
                int(lerp(base[2], mid[2], spiral * 0.65)),
            )
            # alpha décroît proche du bord pour fondu
            falloff = 1 - max(0.0, (t - 0.85)) / 0.15 if t > 0.85 else 1.0
            alpha = int(255 * falloff)
            px[x, y] = (mix[0], mix[1], mix[2], alpha)

    # halo extérieur bleu sombre
    halo = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    for i, a in enumerate([35, 30, 22, 14]):
        radius = int(SIZE * 0.49 + i * 1.6)
        hd.ellipse(
            [CENTER - radius, CENTER - radius, CENTER + radius, CENTER + radius],
            outline=outer + (a,),
            width=2,
        )
    halo = halo.filter(ImageFilter.GaussianBlur(2.2))
    img = Image.alpha_composite(halo, img)
    return img


def runes_layer():
    """Six runes dorées disposées en cercle autour du vortex."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    gold = hex_to_rgb("#f0c75e") + (235,)
    gold_dark = hex_to_rgb("#a07a20") + (220,)
    rune_radius = SIZE * 0.42
    n = 6
    for i in range(n):
        a = -math.pi / 2 + 2 * math.pi * i / n
        rx = CENTER + math.cos(a) * rune_radius
        ry = CENTER + math.sin(a) * rune_radius
        # petit losange + barre verticale (rune simple, géométrique)
        size = 5.4
        d.polygon(
            [
                (rx, ry - size),
                (rx + size, ry),
                (rx, ry + size),
                (rx - size, ry),
            ],
            fill=gold,
            outline=gold_dark,
        )
        # barre interne
        d.line([(rx, ry - size + 2), (rx, ry + size - 2)], fill=gold_dark, width=1)
    # Anneau or fin
    ring_r = SIZE * 0.42
    d.ellipse(
        [CENTER - ring_r, CENTER - ring_r, CENTER + ring_r, CENTER + ring_r],
        outline=hex_to_rgb("#c9a84c") + (160,),
        width=1,
    )
    return img


def sparks_layer():
    """Quelques étoiles/scintillements blancs au cœur."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    white = (255, 245, 220, 240)
    for _ in range(14):
        r = random.uniform(2, SIZE * 0.32)
        a = random.uniform(0, 2 * math.pi)
        x = CENTER + math.cos(a) * r
        y = CENTER + math.sin(a) * r
        size = random.uniform(0.6, 1.6)
        d.ellipse([x - size, y - size, x + size, y + size], fill=white)
    img = img.filter(ImageFilter.GaussianBlur(0.4))
    return img


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out = Image.alpha_composite(out, vortex_layer())
    out = Image.alpha_composite(out, runes_layer())
    out = Image.alpha_composite(out, sparks_layer())
    # léger sharpen final
    out.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({os.path.getsize(OUT)} bytes)")


if __name__ == "__main__":
    main()
