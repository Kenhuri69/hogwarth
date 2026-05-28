#!/usr/bin/env python3
"""Génère img/icons/spells/verrou_de_sang.png — sceau de sang circulaire
avec quatre runes angulaires aux cardinaux et noyau écarlate pulsant.

Style cohérent avec cheminette_inter_mondes.png (sort cousin, même
famille cross-plan) mais palette rouge sang + or pâle au lieu du vert
flamme + or chaud — pour signaler l'engagement contractuel violent du
Verrou (vs. le voyage paisible de la Cheminette).

Sortie 128×128 RGBA. Procédural via Pillow. Lancer depuis la racine :
    python3 tools/gen_blood_seal_icon.py

Cf. .claude/plans/parallel-worlds.md §6.9 (Verrou de Sang).
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "img", "icons", "spells",
                   "verrou_de_sang.png")
OUT = os.path.normpath(OUT)

SIZE = 128
CENTER = SIZE / 2

random.seed(13)


def lerp(a, b, t):
    return a + (b - a) * t


def hex_to_rgb(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def blood_disc_layer():
    """Disque radial sang — clair au centre, profond aux bords."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    px = img.load()
    cx, cy = CENTER - 0.5, CENTER - 0.5
    r_max = SIZE * 0.46

    core  = hex_to_rgb("#ffb0a0")   # cœur lumineux saumon
    mid   = hex_to_rgb("#d94545")   # rouge écarlate
    edge  = hex_to_rgb("#6e1a1a")   # grenat
    outer = hex_to_rgb("#2a0606")   # rouge brûlé

    for y in range(SIZE):
        for x in range(SIZE):
            dx, dy = x - cx, y - cy
            r = math.hypot(dx, dy)
            if r > r_max:
                continue
            theta = math.atan2(dy, dx)
            # filaments de sang : ondulations radiales pour évoquer le
            # mouvement visqueux. Moins de torsion que la Cheminette
            # (sort contractuel, pas un tourbillon).
            vein = math.sin(theta * 5 + r * 0.18) * 0.5 + 0.5
            t = r / r_max
            base = (
                int(lerp(core[0], edge[0], t)),
                int(lerp(core[1], edge[1], t)),
                int(lerp(core[2], edge[2], t)),
            )
            mix = (
                int(lerp(base[0], mid[0], vein * 0.35)),
                int(lerp(base[1], mid[1], vein * 0.35)),
                int(lerp(base[2], mid[2], vein * 0.30)),
            )
            falloff = 1 - max(0.0, (t - 0.85)) / 0.15 if t > 0.85 else 1.0
            px[x, y] = (mix[0], mix[1], mix[2], int(255 * falloff))

    # halo rouge sombre extérieur
    halo = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    for i, a in enumerate([48, 38, 28, 16]):
        radius = int(SIZE * 0.49 + i * 1.6)
        hd.ellipse(
            [CENTER - radius, CENTER - radius, CENTER + radius, CENTER + radius],
            outline=outer + (a,),
            width=2,
        )
    halo = halo.filter(ImageFilter.GaussianBlur(2.4))
    img = Image.alpha_composite(halo, img)
    return img


def runes_layer():
    """Quatre runes angulaires aux cardinaux + anneau central or pâle.

    Triangles inversés = sceau d'engagement (vs. losanges de la
    Cheminette = portes). Or pâle (#d8b647) au lieu de l'or chaud
    (#f0c75e) — l'or s'assombrit au contact du sang scellé.
    """
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    gold      = hex_to_rgb("#d8b647") + (235,)
    gold_dark = hex_to_rgb("#8a6a26") + (220,)
    rune_radius = SIZE * 0.42
    n = 4
    for i in range(n):
        a = -math.pi / 2 + 2 * math.pi * i / n
        rx = CENTER + math.cos(a) * rune_radius
        ry = CENTER + math.sin(a) * rune_radius
        # triangle pointe vers le centre (engagement entrant)
        size = 6.0
        # direction inversée : pointe vers le centre
        pull_x = (CENTER - rx) / max(1.0, math.hypot(CENTER - rx, CENTER - ry))
        pull_y = (CENTER - ry) / max(1.0, math.hypot(CENTER - rx, CENTER - ry))
        # base perpendiculaire
        perp_x, perp_y = -pull_y, pull_x
        tip = (rx + pull_x * size, ry + pull_y * size)
        base_l = (rx + perp_x * size - pull_x * 2, ry + perp_y * size - pull_y * 2)
        base_r = (rx - perp_x * size - pull_x * 2, ry - perp_y * size - pull_y * 2)
        d.polygon([tip, base_l, base_r], fill=gold, outline=gold_dark)
    # anneau fin or pâle externe
    ring_r = SIZE * 0.42
    d.ellipse(
        [CENTER - ring_r, CENTER - ring_r, CENTER + ring_r, CENTER + ring_r],
        outline=hex_to_rgb("#a07a20") + (170,),
        width=1,
    )
    # anneau interne fin sang
    inner_r = SIZE * 0.18
    d.ellipse(
        [CENTER - inner_r, CENTER - inner_r, CENTER + inner_r, CENTER + inner_r],
        outline=hex_to_rgb("#3a0a0a") + (210,),
        width=2,
    )
    return img


def droplets_layer():
    """Gouttes de sang et scintillements écarlates au cœur."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pearl  = (255, 220, 210, 240)
    droplet = (220,  70,  60, 220)
    # scintillements clairs au cœur
    for _ in range(10):
        r = random.uniform(2, SIZE * 0.18)
        a = random.uniform(0, 2 * math.pi)
        x = CENTER + math.cos(a) * r
        y = CENTER + math.sin(a) * r
        sz = random.uniform(0.6, 1.6)
        d.ellipse([x - sz, y - sz, x + sz, y + sz], fill=pearl)
    # gouttes de sang en couronne intermédiaire
    for _ in range(7):
        r = random.uniform(SIZE * 0.26, SIZE * 0.36)
        a = random.uniform(-math.pi, math.pi)
        x = CENTER + math.cos(a) * r
        y = CENTER + math.sin(a) * r
        sz = random.uniform(1.2, 2.2)
        d.ellipse([x - sz, y - sz, x + sz, y + sz], fill=droplet)
    img = img.filter(ImageFilter.GaussianBlur(0.5))
    return img


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out = Image.alpha_composite(out, blood_disc_layer())
    out = Image.alpha_composite(out, runes_layer())
    out = Image.alpha_composite(out, droplets_layer())
    out.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({os.path.getsize(OUT)} bytes)")


if __name__ == "__main__":
    main()
