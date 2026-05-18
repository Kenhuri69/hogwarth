#!/usr/bin/env python3
"""Génère des icônes de sorts procédurales pour img/icons/spells/.

Couvre les sorts élémentaires (Glacius / Fulgari / Lumos Solem),
Ferula Maxima, et les 4 sorts de Maison du palier 17 « Mythe »
(Patronus Maxima / Sectumsempra Imperius / Legilimens / Récolte Magique).

Sorties 128×128 RGBA — style cohérent avec les autres sorts (halo
magique radial + motif central + scintillements). Procédural via Pillow.
Lancer depuis la racine du projet :
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


# ── Ferula Maxima : soin régénérant amplifié (AOE) ───────────
def ferula_maxima():
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    # halo doré : marque la version « Maxima » amplifiée
    out = Image.alpha_composite(out, glow_ring(hex_to_rgb("#b88a1e"), 0.46,
                                               [46, 36, 26, 16]))
    out = Image.alpha_composite(out, radial_base("#eaffec", "#5fcf7a", "#1c5a2e"))

    # rayons dorés derrière la croix (rayonnement de soin)
    rays = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(rays)
    gold = hex_to_rgb("#ffe9a0") + (200,)
    r_in, r_out = SIZE * 0.16, SIZE * 0.43
    for i in range(8):
        ang = i * math.pi / 4 + math.pi / 8
        half = 0.10
        d.polygon([
            (CENTER + math.cos(ang) * r_out, CENTER + math.sin(ang) * r_out),
            (CENTER + math.cos(ang - half) * r_in,
             CENTER + math.sin(ang - half) * r_in),
            (CENTER + math.cos(ang + half) * r_in,
             CENTER + math.sin(ang + half) * r_in),
        ], fill=gold)
    rays = rays.filter(ImageFilter.GaussianBlur(0.8))
    out = Image.alpha_composite(out, rays)

    # croix de soin blanche, liseré doré
    cross = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dc = ImageDraw.Draw(cross)
    arm, th = SIZE * 0.27, SIZE * 0.115
    edge = hex_to_rgb("#e8c45a") + (255,)
    core = hex_to_rgb("#ffffff") + (255,)
    for col, pad in ((edge, 3), (core, 0)):
        dc.rectangle([CENTER - th - pad, CENTER - arm - pad,
                      CENTER + th + pad, CENTER + arm + pad], fill=col)
        dc.rectangle([CENTER - arm - pad, CENTER - th - pad,
                      CENTER + arm + pad, CENTER + th + pad], fill=col)
    out = Image.alpha_composite(out, cross)
    out = Image.alpha_composite(out, sparks((255, 252, 224, 240), 16, 0.34, 44))
    return out


# ── Patronus Maxima : cerf argenté (Patronus de groupe) ──────
def patronus_maxima():
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    # halo doré : marque la version « Maxima » amplifiée
    out = Image.alpha_composite(out, glow_ring(hex_to_rgb("#b88a1e"), 0.46,
                                               [46, 36, 26, 16]))
    out = Image.alpha_composite(out, radial_base("#eef6ff", "#9fc4e8", "#23406e"))

    stag = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(stag)
    silver = hex_to_rgb("#eaf2ff") + (255,)
    silver_d = hex_to_rgb("#bcd6f0") + (240,)
    hx, hy = CENTER, CENTER + 14   # tête légèrement basse
    # tête + museau
    d.ellipse([hx - 9, hy - 10, hx + 9, hy + 14], fill=silver)
    d.polygon([(hx - 5, hy + 10), (hx + 5, hy + 10), (hx, hy + 24)], fill=silver)
    # oreilles
    for sgn in (-1, 1):
        d.polygon([(hx + sgn * 8, hy - 4), (hx + sgn * 18, hy - 9),
                   (hx + sgn * 9, hy + 4)], fill=silver_d)
    # bois ramifiés
    for sgn in (-1, 1):
        bx, by = hx + sgn * 4, hy - 9
        d.line([(bx, by), (bx + sgn * 7, by - 16),
                (bx + sgn * 3, by - 30), (bx + sgn * 20, by - 42)],
               fill=silver, width=4, joint="curve")
        d.line([(bx + sgn * 5, by - 13), (bx + sgn * 23, by - 17)],
               fill=silver, width=3)
        d.line([(bx + sgn * 4, by - 27), (bx + sgn * 21, by - 34)],
               fill=silver, width=3)
        d.line([(bx + sgn * 3, by - 30), (bx - sgn * 5, by - 44)],
               fill=silver, width=3)
    stag = stag.filter(ImageFilter.GaussianBlur(0.5))
    out = Image.alpha_composite(out, stag)
    out = Image.alpha_composite(out, sparks((255, 255, 255, 240), 18, 0.36, 71))
    return out


# ── Sectumsempra Imperius : entailles + spirale d'asservissement ─
def sectumsempra_imperius():
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out = Image.alpha_composite(out, glow_ring(hex_to_rgb("#3a0a30"), 0.46,
                                               [44, 34, 24, 14]))
    out = Image.alpha_composite(out, radial_base("#ffe2e2", "#8a2530", "#2a0810"))

    fx = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)
    blood = hex_to_rgb("#ff5a4a") + (235,)
    blood_c = hex_to_rgb("#fff0ec") + (255,)
    for off in (-16, 0, 16):
        d.line([(CENTER - 26 + off, CENTER - 34),
                (CENTER + 18 + off, CENTER + 38)], fill=blood, width=6)
    for off in (-16, 0, 16):
        d.line([(CENTER - 26 + off, CENTER - 34),
                (CENTER + 18 + off, CENTER + 38)], fill=blood_c, width=2)
    fx = fx.filter(ImageFilter.GaussianBlur(0.6))
    out = Image.alpha_composite(out, fx)

    # spirale de l'Imperium (violet)
    sw = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ds = ImageDraw.Draw(sw)
    pts = []
    for i in range(60):
        t = i / 59
        ang = t * 3.4 * math.pi
        rad = 6 + t * 30
        pts.append((CENTER + math.cos(ang) * rad, CENTER + math.sin(ang) * rad))
    ds.line(pts, fill=hex_to_rgb("#c08aff") + (210,), width=3, joint="curve")
    sw = sw.filter(ImageFilter.GaussianBlur(0.7))
    out = Image.alpha_composite(out, sw)
    out = Image.alpha_composite(out, sparks((255, 200, 220, 235), 16, 0.34, 82))
    return out


# ── Legilimens : oeil scrutateur ─────────────────────────────
def legilimens():
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out = Image.alpha_composite(out, glow_ring(hex_to_rgb("#2a1a55"), 0.46,
                                               [44, 34, 24, 14]))
    out = Image.alpha_composite(out, radial_base("#ece8ff", "#7d5fb8", "#241a44"))

    eye = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(eye)
    ew, eh = SIZE * 0.36, SIZE * 0.20
    d.ellipse([CENTER - ew, CENTER - eh, CENTER + ew, CENTER + eh],
              fill=hex_to_rgb("#fbfaff") + (255,))
    ir = SIZE * 0.16
    d.ellipse([CENTER - ir, CENTER - ir, CENTER + ir, CENTER + ir],
              fill=hex_to_rgb("#6e4ec0") + (255,),
              outline=hex_to_rgb("#b89cff") + (255,), width=2)
    pr = SIZE * 0.072
    d.ellipse([CENTER - pr, CENTER - pr, CENTER + pr, CENTER + pr],
              fill=hex_to_rgb("#140c2c") + (255,))
    d.ellipse([CENTER - pr + 2, CENTER - pr, CENTER - pr + 7, CENTER - pr + 5],
              fill=(255, 255, 255, 235))
    line = hex_to_rgb("#3a2a66") + (255,)
    d.arc([CENTER - ew, CENTER - eh - 2, CENTER + ew, CENTER + eh + 6],
          200, 340, fill=line, width=3)
    d.arc([CENTER - ew, CENTER - eh - 6, CENTER + ew, CENTER + eh + 2],
          20, 160, fill=line, width=3)
    eye = eye.filter(ImageFilter.GaussianBlur(0.4))
    out = Image.alpha_composite(out, eye)
    out = Image.alpha_composite(out, sparks((230, 220, 255, 235), 14, 0.32, 93))
    return out


# ── Récolte Magique : gerbe de blé doré ──────────────────────
def recolte_magique():
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out = Image.alpha_composite(out, glow_ring(hex_to_rgb("#b88a1e"), 0.46,
                                               [46, 36, 26, 16]))
    out = Image.alpha_composite(out, radial_base("#f2ffe2", "#7cbf4a", "#2a5a18"))

    wheat = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(wheat)
    stalk = hex_to_rgb("#d8a838") + (255,)
    grain = hex_to_rgb("#f4d56a") + (255,)
    grain_d = hex_to_rgb("#c8902a") + (255,)
    base = (CENTER, CENTER + 44)
    for lean in (-0.26, 0.0, 0.26):
        topx = CENTER + lean * 38
        topy = CENTER - 36
        d.line([base, (topx, topy)], fill=stalk, width=4)
        for k in range(5):
            t = 0.35 + k * 0.14
            gx = base[0] + (topx - base[0]) * t
            gy = base[1] + (topy - base[1]) * t
            for s2 in (-1, 1):
                ex, ey = gx + s2 * 7, gy - 4
                d.ellipse([ex - 4, ey - 6, ex + 4, ey + 6],
                          fill=grain, outline=grain_d, width=1)
        d.ellipse([topx - 5, topy - 9, topx + 5, topy + 7],
                  fill=grain, outline=grain_d, width=1)
    wheat = wheat.filter(ImageFilter.GaussianBlur(0.4))
    out = Image.alpha_composite(out, wheat)
    out = Image.alpha_composite(out, sparks((255, 250, 210, 235), 14, 0.32, 104))
    return out


# ── Sorts de zone (AoE) — version « zone » du sort élémentaire ─

# ── Glacius Tempête : blizzard — bourrasques + flocons multiples ─
def glacius_tempete():
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out = Image.alpha_composite(out, glow_ring(hex_to_rgb("#16325e"), 0.46,
                                               [44, 34, 24, 14]))
    out = Image.alpha_composite(out, radial_base("#e6f4ff", "#6fb4e4", "#16345f"))

    storm = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(storm)
    ice = hex_to_rgb("#eaf8ff") + (235,)
    ice_d = hex_to_rgb("#9bd6f0") + (205,)
    # bourrasques : arcs spiralés concentriques
    for rad, a0, a1 in ((48, 200, 350), (36, 20, 175), (26, 235, 380)):
        d.arc([CENTER - rad, CENTER - rad, CENTER + rad, CENTER + rad],
              a0, a1, fill=ice_d, width=3)

    def flake(cx, cy, arm):
        for i in range(6):
            ang = i * math.pi / 3
            ux, uy = math.cos(ang), math.sin(ang)
            d.line([(cx, cy), (cx + ux * arm, cy + uy * arm)], fill=ice, width=2)
            for frac in (0.6,):
                bx, by = cx + ux * arm * frac, cy + uy * arm * frac
                for sign in (-1, 1):
                    ba = ang + sign * math.pi / 3
                    d.line([(bx, by), (bx + math.cos(ba) * arm * 0.28,
                                       by + math.sin(ba) * arm * 0.28)],
                           fill=ice_d, width=1)
    flake(CENTER, CENTER, 17)
    flake(CENTER - 31, CENTER - 25, 9)
    flake(CENTER + 30, CENTER + 27, 9)
    storm = storm.filter(ImageFilter.GaussianBlur(0.5))
    out = Image.alpha_composite(out, storm)
    out = Image.alpha_composite(out, sparks((255, 255, 255, 235), 24, 0.42, 201))
    return out


# ── Fulgur Catena : éclairs en chaîne — noeuds reliés par des arcs ─
def fulgur_catena():
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out = Image.alpha_composite(out, glow_ring(hex_to_rgb("#2e2400"), 0.46,
                                               [42, 32, 22, 14]))
    out = Image.alpha_composite(out, radial_base("#fff6c8", "#3a4576", "#0e1228"))

    glow = hex_to_rgb("#ffe96b") + (215,)
    core = hex_to_rgb("#fffce6") + (255,)
    nodes = [(26, 38), (CENTER, CENTER + 2), (102, 88)]

    def zig(p, q):
        mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
        return [p, (mx + 9, my - 11), (mx - 7, my + 9), q]

    arc = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    da = ImageDraw.Draw(arc)
    for a, b in ((nodes[0], nodes[1]), (nodes[1], nodes[2])):
        da.line(zig(a, b), fill=glow, width=5, joint="curve")
    arc = arc.filter(ImageFilter.GaussianBlur(1.7))
    out = Image.alpha_composite(out, arc)

    sharp = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ds = ImageDraw.Draw(sharp)
    for a, b in ((nodes[0], nodes[1]), (nodes[1], nodes[2])):
        ds.line(zig(a, b), fill=core, width=2, joint="curve")
    for nx, ny in nodes:
        ds.ellipse([nx - 9, ny - 9, nx + 9, ny + 9],
                   outline=glow, width=2)
        ds.ellipse([nx - 5, ny - 5, nx + 5, ny + 5], fill=core)
    out = Image.alpha_composite(out, sharp)
    out = Image.alpha_composite(out, sparks((255, 250, 200, 240), 18, 0.38, 202))
    return out


# ── Lux Aeterna : onde de lumière — anneaux concentriques + étoile ─
def lux_aeterna():
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out = Image.alpha_composite(out, glow_ring(hex_to_rgb("#6a4a08"), 0.46,
                                               [46, 36, 26, 16]))
    out = Image.alpha_composite(out, radial_base("#fffdf2", "#ffe07a", "#9a6a14"))

    wave = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dw = ImageDraw.Draw(wave)
    for i, rad in enumerate((20, 33, 46)):
        a = max(150, 245 - i * 45)
        dw.ellipse([CENTER - rad, CENTER - rad, CENTER + rad, CENTER + rad],
                   outline=hex_to_rgb("#e8a52e") + (a,), width=3)
        dw.ellipse([CENTER - rad + 3, CENTER - rad + 3,
                    CENTER + rad - 3, CENTER + rad - 3],
                   outline=hex_to_rgb("#fffbe6") + (a,), width=2)
    wave = wave.filter(ImageFilter.GaussianBlur(0.6))
    out = Image.alpha_composite(out, wave)

    star = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dd = ImageDraw.Draw(star)
    gold = hex_to_rgb("#fff6c8") + (255,)
    r_in, r_out = SIZE * 0.08, SIZE * 0.24
    for i in range(8):
        ang = i * math.pi / 4
        long = r_out if i % 2 == 0 else r_out * 0.58
        half = 0.16
        dd.polygon([
            (CENTER + math.cos(ang) * long, CENTER + math.sin(ang) * long),
            (CENTER + math.cos(ang - half) * r_in,
             CENTER + math.sin(ang - half) * r_in),
            (CENTER + math.cos(ang + half) * r_in,
             CENTER + math.sin(ang + half) * r_in),
        ], fill=gold)
    cr = SIZE * 0.075
    dd.ellipse([CENTER - cr, CENTER - cr, CENTER + cr, CENTER + cr],
               fill=hex_to_rgb("#fffef6") + (255,))
    star = star.filter(ImageFilter.GaussianBlur(0.4))
    out = Image.alpha_composite(out, star)
    out = Image.alpha_composite(out, sparks((255, 252, 224, 240), 16, 0.34, 203))
    return out


# ── Nox Vorax : vague obscure — vortex spiralé + gueule dévorante ─
def nox_vorax():
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out = Image.alpha_composite(out, glow_ring(hex_to_rgb("#1a0a2e"), 0.46,
                                               [46, 36, 26, 16]))
    out = Image.alpha_composite(out, radial_base("#c89aff", "#4a2470", "#0c0618"))

    vortex = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dv = ImageDraw.Draw(vortex)
    for spin in (0.0, math.pi):
        pts = []
        for i in range(64):
            t = i / 63
            ang = spin + t * 3.0 * math.pi
            rad = 4 + (1 - t) * 42
            pts.append((CENTER + math.cos(ang) * rad,
                        CENTER + math.sin(ang) * rad))
        dv.line(pts, fill=hex_to_rgb("#9a6ad0") + (205,), width=3, joint="curve")
    vortex = vortex.filter(ImageFilter.GaussianBlur(0.7))
    out = Image.alpha_composite(out, vortex)

    maw = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dm = ImageDraw.Draw(maw)
    dm.ellipse([CENTER - 22, CENTER - 22, CENTER + 22, CENTER + 22],
               outline=hex_to_rgb("#b890ff") + (220,), width=2)
    for rad, col in ((20, hex_to_rgb("#1a0a30") + (255,)),
                     (12, hex_to_rgb("#050208") + (255,))):
        dm.ellipse([CENTER - rad, CENTER - rad, CENTER + rad, CENTER + rad],
                   fill=col)
    maw = maw.filter(ImageFilter.GaussianBlur(0.6))
    out = Image.alpha_composite(out, maw)
    out = Image.alpha_composite(out, sparks((200, 160, 255, 220), 16, 0.36, 204))
    return out


# ── Diffindo Maxima : fauchage — trail de fauchée + entailles ─────
def diffindo_maxima():
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out = Image.alpha_composite(out, glow_ring(hex_to_rgb("#3a1212"), 0.46,
                                               [42, 32, 22, 14]))
    out = Image.alpha_composite(out, radial_base("#fdeee8", "#a86f66", "#2a1410"))

    # arc de fauchée reliant les pointes des entailles
    trail = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dt = ImageDraw.Draw(trail)
    dt.arc([CENTER - 50, CENTER - 50, CENTER + 50, CENTER + 50], 300, 60,
           fill=hex_to_rgb("#ff8a66") + (160,), width=10)
    trail = trail.filter(ImageFilter.GaussianBlur(2.2))
    out = Image.alpha_composite(out, trail)

    # 3 entailles en éventail depuis un point à gauche (le coup faucheur)
    origin = (CENTER - 44, CENTER)
    tips = [(CENTER + 46, CENTER - 34), (CENTER + 52, CENTER + 2),
            (CENTER + 44, CENTER + 38)]
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dg = ImageDraw.Draw(glow)
    for t in tips:
        dg.line([origin, t], fill=hex_to_rgb("#ff7a5a") + (210,), width=9)
    glow = glow.filter(ImageFilter.GaussianBlur(1.8))
    out = Image.alpha_composite(out, glow)

    sharp = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ds = ImageDraw.Draw(sharp)
    steel = hex_to_rgb("#fff6f0") + (255,)
    for i, t in enumerate(tips):
        ds.line([origin, t], fill=steel, width=4 if i == 1 else 3)
    out = Image.alpha_composite(out, sharp)
    out = Image.alpha_composite(out, sparks((255, 240, 230, 235), 14, 0.34, 205))
    return out


# ── Vulnera Sanentur : soin de groupe — trois croix de guérison ───
def vulnera_sanentur():
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out = Image.alpha_composite(out, glow_ring(hex_to_rgb("#1c6a3a"), 0.46,
                                               [46, 36, 26, 16]))
    out = Image.alpha_composite(out, radial_base("#eaffe8", "#5fce86", "#1a5630"))

    rays = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dr = ImageDraw.Draw(rays)
    gold = hex_to_rgb("#fff0b0") + (185,)
    r_in, r_out = SIZE * 0.14, SIZE * 0.44
    for i in range(10):
        ang = i * 2 * math.pi / 10
        half = 0.085
        dr.polygon([
            (CENTER + math.cos(ang) * r_out, CENTER + math.sin(ang) * r_out),
            (CENTER + math.cos(ang - half) * r_in,
             CENTER + math.sin(ang - half) * r_in),
            (CENTER + math.cos(ang + half) * r_in,
             CENTER + math.sin(ang + half) * r_in),
        ], fill=gold)
    rays = rays.filter(ImageFilter.GaussianBlur(0.8))
    out = Image.alpha_composite(out, rays)

    crosses = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dc = ImageDraw.Draw(crosses)
    edge = hex_to_rgb("#e8c45a") + (255,)
    core = hex_to_rgb("#ffffff") + (255,)

    def cross(cx, cy, arm, th):
        for col, pad in ((edge, 2), (core, 0)):
            dc.rectangle([cx - th - pad, cy - arm - pad,
                          cx + th + pad, cy + arm + pad], fill=col)
            dc.rectangle([cx - arm - pad, cy - th - pad,
                          cx + arm + pad, cy + th + pad], fill=col)
    cross(CENTER - 29, CENTER + 21, 9, 4)
    cross(CENTER + 29, CENTER + 21, 9, 4)
    cross(CENTER, CENTER - 8, 19, 8)
    crosses = crosses.filter(ImageFilter.GaussianBlur(0.4))
    out = Image.alpha_composite(out, crosses)
    out = Image.alpha_composite(out, sparks((255, 252, 224, 240), 16, 0.34, 206))
    return out


def main():
    os.makedirs(SPELLS_DIR, exist_ok=True)
    for slug, fn in (("glacius", glacius),
                     ("fulgari", fulgari),
                     ("lumos_solem", lumos_solem),
                     ("ferula_maxima", ferula_maxima),
                     ("patronus_maxima", patronus_maxima),
                     ("sectumsempra_imperius", sectumsempra_imperius),
                     ("legilimens", legilimens),
                     ("recolte_magique", recolte_magique),
                     ("glacius_tempete", glacius_tempete),
                     ("fulgur_catena", fulgur_catena),
                     ("lux_aeterna", lux_aeterna),
                     ("nox_vorax", nox_vorax),
                     ("diffindo_maxima", diffindo_maxima),
                     ("vulnera_sanentur", vulnera_sanentur)):
        path = os.path.join(SPELLS_DIR, slug + ".png")
        fn().save(path, "PNG", optimize=True)
        print(f"Wrote {path} ({os.path.getsize(path)} bytes)")


if __name__ == "__main__":
    main()
