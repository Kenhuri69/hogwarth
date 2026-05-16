#!/usr/bin/env python3
"""Génère les icônes des sorts élémentaires Glacius / Fulgari / Lumos Solem.

Sorties 128×128 RGBA dans img/icons/spells/ — style cohérent avec les
autres sorts (halo magique radial + motif central + scintillements).
Procédural via Pillow. Lancer depuis la racine du projet :
    python3 tools/gen_element_spell_icons.py
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

SPELLS_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "img", "icons", "spells"))

SIZE = 128
CENTER = SIZE / 2


def lerp(a, b, t):
    return a + (b - a) * t


def hex_to_rgb(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def radial_base(inner, mid, edge):
    """Disque de lumière radial — coeur clair vers bord sombre."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    px = img.load()
    cx, cy = CENTER - 0.5, CENTER - 0.5
    r_max = SIZE * 0.46
    inner, mid, edge = hex_to_rgb(inner), hex_to_rgb(mid), hex_to_rgb(edge)
    for y in range(SIZE):
        for x in range(SIZE):
            r = math.hypot(x - cx, y - cy)
            if r > r_max:
                continue
            t = r / r_max
            if t < 0.5:
                k = t / 0.5
                col = [int(lerp(inner[i], mid[i], k)) for i in range(3)]
            else:
                k = (t - 0.5) / 0.5
                col = [int(lerp(mid[i], edge[i], k)) for i in range(3)]
            falloff = 1 - max(0.0, (t - 0.82)) / 0.18 if t > 0.82 else 1.0
            px[x, y] = (col[0], col[1], col[2], int(255 * falloff))
    return img


def sparks(color, count, r_max_frac, seed):
    """Scintillements aléatoires au coeur du sort."""
    random.seed(seed)
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for _ in range(count):
        r = random.uniform(2, SIZE * r_max_frac)
        a = random.uniform(0, 2 * math.pi)
        x = CENTER + math.cos(a) * r
        y = CENTER + math.sin(a) * r
        s = random.uniform(0.6, 1.8)
        d.ellipse([x - s, y - s, x + s, y + s], fill=color)
    return img.filter(ImageFilter.GaussianBlur(0.4))


def glow_ring(color, radius_frac, alphas):
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for i, a in enumerate(alphas):
        radius = int(SIZE * radius_frac + i * 1.6)
        d.ellipse([CENTER - radius, CENTER - radius,
                   CENTER + radius, CENTER + radius],
                  outline=color + (a,), width=2)
    return img.filter(ImageFilter.GaussianBlur(2.2))


# ── Glacius : cristal de glace / flocon ──────────────────────
def glacius():
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out = Image.alpha_composite(out, glow_ring(hex_to_rgb("#1a3a6a"), 0.46,
                                               [40, 32, 22, 14]))
    out = Image.alpha_composite(out, radial_base("#eaf6ff", "#7fc4ec", "#1c3f74"))

    flake = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(flake)
    ice = hex_to_rgb("#eaf8ff") + (240,)
    ice_d = hex_to_rgb("#8fd3ef") + (220,)
    arm = SIZE * 0.40
    for i in range(6):
        ang = math.pi / 2 + i * math.pi / 3
        ux, uy = math.cos(ang), math.sin(ang)
        tipx, tipy = CENTER + ux * arm, CENTER + uy * arm
        d.line([(CENTER, CENTER), (tipx, tipy)], fill=ice, width=3)
        # branches latérales à deux hauteurs
        for frac, blen in ((0.55, 0.20), (0.80, 0.13)):
            bx, by = CENTER + ux * arm * frac, CENTER + uy * arm * frac
            for sign in (-1, 1):
                ba = ang + sign * math.pi / 3
                d.line([(bx, by),
                        (bx + math.cos(ba) * arm * blen,
                         by + math.sin(ba) * arm * blen)],
                       fill=ice_d, width=2)
    # coeur lumineux
    d.ellipse([CENTER - 5, CENTER - 5, CENTER + 5, CENTER + 5], fill=ice)
    flake = flake.filter(ImageFilter.GaussianBlur(0.5))
    out = Image.alpha_composite(out, flake)
    out = Image.alpha_composite(out, sparks((255, 255, 255, 235), 16, 0.34, 11))
    return out


# ── Fulgari : éclair canalisé ────────────────────────────────
def fulgari():
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out = Image.alpha_composite(out, glow_ring(hex_to_rgb("#3a2e00"), 0.46,
                                               [40, 32, 22, 14]))
    out = Image.alpha_composite(out, radial_base("#fff7d0", "#3a4a78", "#10142e"))

    bolt = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(bolt)
    pts = [(70, 14), (52, 58), (68, 58), (46, 114),
           (58, 66), (44, 66), (66, 22)]
    glow = hex_to_rgb("#ffe96b") + (210,)
    core = hex_to_rgb("#fffce6") + (255,)
    d.polygon(pts, fill=glow)
    bolt = bolt.filter(ImageFilter.GaussianBlur(1.8))
    sharp = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ds = ImageDraw.Draw(sharp)
    ds.polygon(pts, fill=core)
    # arcs électriques secondaires
    for path in ([(30, 40), (40, 52), (32, 64)],
                 [(96, 56), (86, 70), (94, 84)]):
        ds.line(path, fill=hex_to_rgb("#fff0a0") + (200,), width=2)
    out = Image.alpha_composite(out, bolt)
    out = Image.alpha_composite(out, sharp)
    out = Image.alpha_composite(out, sparks((255, 250, 200, 240), 18, 0.36, 22))
    return out


# ── Lumos Solem : soleil rayonnant ───────────────────────────
def lumos_solem():
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out = Image.alpha_composite(out, glow_ring(hex_to_rgb("#7a4500"), 0.46,
                                               [44, 34, 24, 14]))
    out = Image.alpha_composite(out, radial_base("#fffcea", "#ffd24a", "#9a5a12"))

    rays = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(rays)
    gold = hex_to_rgb("#fff2b0") + (235,)
    gold_d = hex_to_rgb("#e0a52e") + (230,)
    r_in, r_out = SIZE * 0.20, SIZE * 0.44
    n = 12
    for i in range(n):
        ang = i * 2 * math.pi / n
        long = r_out if i % 2 == 0 else r_out * 0.82
        half = 0.13
        d.polygon([
            (CENTER + math.cos(ang) * long, CENTER + math.sin(ang) * long),
            (CENTER + math.cos(ang - half) * r_in,
             CENTER + math.sin(ang - half) * r_in),
            (CENTER + math.cos(ang + half) * r_in,
             CENTER + math.sin(ang + half) * r_in),
        ], fill=gold if i % 2 == 0 else gold_d)
    rays = rays.filter(ImageFilter.GaussianBlur(0.6))
    out = Image.alpha_composite(out, rays)

    disc = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dd = ImageDraw.Draw(disc)
    dr = SIZE * 0.22
    dd.ellipse([CENTER - dr, CENTER - dr, CENTER + dr, CENTER + dr],
               fill=hex_to_rgb("#ffe27a") + (255,),
               outline=hex_to_rgb("#e8a52e") + (255,), width=2)
    cr = SIZE * 0.11
    dd.ellipse([CENTER - cr, CENTER - cr, CENTER + cr, CENTER + cr],
               fill=hex_to_rgb("#fffae0") + (255,))
    out = Image.alpha_composite(out, disc)
    out = Image.alpha_composite(out, sparks((255, 252, 224, 240), 14, 0.30, 33))
    return out


def main():
    os.makedirs(SPELLS_DIR, exist_ok=True)
    for slug, fn in (("glacius", glacius),
                     ("fulgari", fulgari),
                     ("lumos_solem", lumos_solem)):
        path = os.path.join(SPELLS_DIR, slug + ".png")
        fn().save(path, "PNG", optimize=True)
        print(f"Wrote {path} ({os.path.getsize(path)} bytes)")


if __name__ == "__main__":
    main()
