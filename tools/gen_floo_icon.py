#!/usr/bin/env python3
"""Génère img/icons/spells/cheminette_inter_mondes.png — flammes vertes
torsadées (poudre de Cheminette) avec runes dorées.

Style cohérent avec teleportation.png (vortex Portus) : même
construction radiale + spirale + runes + scintillements, mais palette
flamme verte de Cheminette + accents or chauds — pour signaler que
c'est un sort cousin (portail) sans confusion visuelle avec Portus.

Sortie 128×128 RGBA. Procédural via Pillow. Lancer depuis la racine :
    python3 tools/gen_floo_icon.py

Cf. .claude/plans/parallel-worlds.md §4 (Cheminette Inter-Mondes).
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "img", "icons", "spells",
                   "cheminette_inter_mondes.png")
OUT = os.path.normpath(OUT)

SIZE = 128
CENTER = SIZE / 2

random.seed(7)


def lerp(a, b, t):
    return a + (b - a) * t


def hex_to_rgb(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def flame_layer():
    """Disque radial + spirale logarithmique en flammes vertes."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    px = img.load()
    cx, cy = CENTER - 0.5, CENTER - 0.5
    r_max = SIZE * 0.46

    inner = hex_to_rgb("#f0ffd0")
    mid   = hex_to_rgb("#3cdc5a")
    edge  = hex_to_rgb("#0e4a18")
    outer = hex_to_rgb("#06210d")

    for y in range(SIZE):
        for x in range(SIZE):
            dx, dy = x - cx, y - cy
            r = math.hypot(dx, dy)
            if r > r_max:
                continue
            theta = math.atan2(dy, dx)
            # spirale ascendante (flammes torsadées)
            spiral = math.sin(theta * 3 - r * 0.28) * 0.5 + 0.5
            t = r / r_max
            base = (
                int(lerp(inner[0], edge[0], t)),
                int(lerp(inner[1], edge[1], t)),
                int(lerp(inner[2], edge[2], t)),
            )
            mix = (
                int(lerp(base[0], mid[0], spiral * 0.55)),
                int(lerp(base[1], mid[1], spiral * 0.60)),
                int(lerp(base[2], mid[2], spiral * 0.50)),
            )
            falloff = 1 - max(0.0, (t - 0.85)) / 0.15 if t > 0.85 else 1.0
            px[x, y] = (mix[0], mix[1], mix[2], int(255 * falloff))

    # halo vert sombre extérieur
    halo = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    for i, a in enumerate([40, 32, 24, 14]):
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
    """Quatre runes dorées en cardinal — clin d'œil aux quatre cheminées."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    gold      = hex_to_rgb("#f0c75e") + (235,)
    gold_dark = hex_to_rgb("#a07a20") + (220,)
    rune_radius = SIZE * 0.42
    n = 4
    for i in range(n):
        a = -math.pi / 2 + 2 * math.pi * i / n
        rx = CENTER + math.cos(a) * rune_radius
        ry = CENTER + math.sin(a) * rune_radius
        # losange or
        size = 5.6
        d.polygon(
            [(rx, ry - size), (rx + size, ry), (rx, ry + size), (rx - size, ry)],
            fill=gold, outline=gold_dark,
        )
        d.line([(rx, ry - size + 2), (rx, ry + size - 2)], fill=gold_dark, width=1)
    # anneau fin or
    ring_r = SIZE * 0.42
    d.ellipse(
        [CENTER - ring_r, CENTER - ring_r, CENTER + ring_r, CENTER + ring_r],
        outline=hex_to_rgb("#c9a84c") + (170,),
        width=1,
    )
    return img


def embers_layer():
    """Escarbilles vertes ascendantes + scintillements blancs au cœur."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    white = (245, 255, 220, 240)
    ember = (180, 255, 130, 220)
    # scintillements blancs au cœur
    for _ in range(12):
        r = random.uniform(2, SIZE * 0.30)
        a = random.uniform(0, 2 * math.pi)
        x = CENTER + math.cos(a) * r
        y = CENTER + math.sin(a) * r
        sz = random.uniform(0.6, 1.6)
        d.ellipse([x - sz, y - sz, x + sz, y + sz], fill=white)
    # escarbilles vertes plus larges, ascendantes
    for _ in range(8):
        r = random.uniform(SIZE * 0.22, SIZE * 0.40)
        a = random.uniform(-math.pi, math.pi)
        x = CENTER + math.cos(a) * r
        y = CENTER + math.sin(a) * r
        sz = random.uniform(1.0, 2.0)
        d.ellipse([x - sz, y - sz, x + sz, y + sz], fill=ember)
    img = img.filter(ImageFilter.GaussianBlur(0.5))
    return img


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out = Image.alpha_composite(out, flame_layer())
    out = Image.alpha_composite(out, runes_layer())
    out = Image.alpha_composite(out, embers_layer())
    out.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({os.path.getsize(OUT)} bytes)")


if __name__ == "__main__":
    main()
