#!/usr/bin/env python3
"""Génère les icônes PNG du mode Ironman et du Hall of Fame.

5 icônes 64×64 (style cohérent avec img/icons/*.png) :
  - ironman.png       — crâne (mode Ironman : vie unique)
  - trophy.png        — coupe (Hall of Fame)
  - medal_gold.png    — médaille or    (rang 1)
  - medal_silver.png  — médaille argent (rang 2)
  - medal_bronze.png  — médaille bronze (rang 3)

Procédural via Pillow, calqué sur gen_intro_icons.py. Lancer depuis la
racine du projet :
    python3 tools/gen_ironman_icons.py
"""
import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ICONS_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "img", "icons"))

SIZE = 64
SS   = 4
W    = SIZE * SS

# Palettes métal : (HI, MID, LO, OUTLINE, GLOW)
GOLD   = ((245, 222, 150), (201, 168, 76), (120, 88, 28), (32, 22, 6),  (255, 198, 88))
SILVER = ((244, 246, 252), (182, 188, 202), (96, 102, 118), (24, 26, 32), (205, 214, 232))
BRONZE = ((238, 188, 138), (184, 120, 70), (96, 58, 26), (30, 18, 6),  (224, 150, 88))


def new_mask():
    return Image.new("L", (W, W), 0)


def star(draw, cx, cy, r, points=5, inner=0.42, fill=255):
    pts = []
    for i in range(points * 2):
        ang = -math.pi / 2 + i * math.pi / points
        rad = r if i % 2 == 0 else r * inner
        pts.append((cx + math.cos(ang) * rad, cy + math.sin(ang) * rad))
    draw.polygon(pts, fill=fill)


def metal_gradient(pal):
    hi, mid, lo = pal[0], pal[1], pal[2]
    col = Image.new("RGB", (1, W))
    for y in range(W):
        t = y / (W - 1)
        if t < 0.5:
            tt = t / 0.5
            c = tuple(int(hi[i] + (mid[i] - hi[i]) * tt) for i in range(3))
        else:
            tt = (t - 0.5) / 0.5
            c = tuple(int(mid[i] + (lo[i] - mid[i]) * tt) for i in range(3))
        col.putpixel((0, y), c)
    return col.resize((W, W)).convert("RGBA")


def finalize(mask, pal=GOLD, glow=True):
    """Mask L (255 = matière) → icône RGBA 64×64 : remplissage métal
    dégradé, contour sombre, reflet spéculaire, halo doux."""
    outline = pal[3]
    glow_col = pal[4]
    grad = metal_gradient(pal)
    shape = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    shape.paste(grad, (0, 0), mask)

    # Contour sombre (dilatation du masque)
    k = SS * 2 + 1
    dil = mask.filter(ImageFilter.MaxFilter(k))
    out = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    out.paste(Image.new("RGBA", (W, W), outline + (255,)), (0, 0), dil)
    out = Image.alpha_composite(out, shape)

    # Reflet spéculaire dans la moitié haute
    ero = mask.filter(ImageFilter.MinFilter(SS * 3 + 1))
    hi = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    hp = hi.load()
    for y in range(int(W * 0.6)):
        a = max(0.0, 1 - y / (W * 0.55))
        if a <= 0:
            continue
        val = (255, 252, 240, int(130 * a))
        for x in range(W):
            hp[x, y] = val
    hi_masked = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    hi_masked.paste(hi, (0, 0), ero)
    out = Image.alpha_composite(out, hi_masked)

    # Halo doux
    if glow:
        g = Image.new("RGBA", (W, W), (0, 0, 0, 0))
        g.paste(Image.new("RGBA", (W, W), glow_col + (95,)), (0, 0), dil)
        g = g.filter(ImageFilter.GaussianBlur(SS * 2.4))
        out = Image.alpha_composite(g, out)

    return out.resize((SIZE, SIZE), Image.LANCZOS)


# ── Masques ─────────────────────────────────────────────────────────

def m_skull():
    """Crâne : calotte + mâchoire, orbites / nez / dents soustraits."""
    m = new_mask()
    d = ImageDraw.Draw(m)
    d.ellipse([0.17 * W, 0.09 * W, 0.83 * W, 0.69 * W], fill=255)        # calotte
    d.rectangle([0.33 * W, 0.52 * W, 0.67 * W, 0.80 * W], fill=255)      # mâchoire
    d.pieslice([0.33 * W, 0.66 * W, 0.67 * W, 0.92 * W], 0, 180, fill=255)

    holes = new_mask()
    hd = ImageDraw.Draw(holes)
    hd.ellipse([0.255 * W, 0.33 * W, 0.455 * W, 0.52 * W], fill=255)     # orbite G
    hd.ellipse([0.545 * W, 0.33 * W, 0.745 * W, 0.52 * W], fill=255)     # orbite D
    hd.polygon([(0.50 * W, 0.50 * W),                                   # nez
                (0.452 * W, 0.605 * W), (0.548 * W, 0.605 * W)], fill=255)
    for cx in (0.415, 0.50, 0.585):                                     # dents
        hd.rectangle([(cx - 0.020) * W, 0.66 * W, (cx + 0.020) * W, 0.86 * W], fill=255)
    return ImageChops.subtract(m, holes)


def m_trophy():
    """Coupe : vasque + 2 anses + pied + socle."""
    m = new_mask()
    d = ImageDraw.Draw(m)
    d.polygon([(0.30 * W, 0.15 * W), (0.70 * W, 0.15 * W),               # vasque haut
               (0.645 * W, 0.42 * W), (0.355 * W, 0.42 * W)], fill=255)
    d.pieslice([0.30 * W, 0.18 * W, 0.70 * W, 0.62 * W], 0, 180, fill=255)

    for side in (-1, 1):                                                # anses
        cx = 0.50 * W + side * 0.30 * W
        ring = new_mask()
        ImageDraw.Draw(ring).ellipse([cx - 0.115 * W, 0.16 * W,
                                      cx + 0.115 * W, 0.43 * W], fill=255)
        inner = new_mask()
        ImageDraw.Draw(inner).ellipse([cx - 0.055 * W, 0.225 * W,
                                       cx + 0.055 * W, 0.365 * W], fill=255)
        m = ImageChops.lighter(m, ImageChops.subtract(ring, inner))

    d = ImageDraw.Draw(m)
    d.rectangle([0.455 * W, 0.52 * W, 0.545 * W, 0.71 * W], fill=255)    # pied
    d.polygon([(0.40 * W, 0.71 * W), (0.60 * W, 0.71 * W),               # socle
               (0.655 * W, 0.85 * W), (0.345 * W, 0.85 * W)], fill=255)
    d.rectangle([0.32 * W, 0.85 * W, 0.68 * W, 0.91 * W], fill=255)
    return m


def m_medal_base():
    """Médaille : 2 rubans en V + disque."""
    m = new_mask()
    d = ImageDraw.Draw(m)
    d.polygon([(0.295 * W, 0.05 * W), (0.455 * W, 0.05 * W),             # ruban G
               (0.575 * W, 0.54 * W), (0.435 * W, 0.54 * W)], fill=255)
    d.polygon([(0.545 * W, 0.05 * W), (0.705 * W, 0.05 * W),             # ruban D
               (0.565 * W, 0.54 * W), (0.425 * W, 0.54 * W)], fill=255)
    d.ellipse([0.27 * W, 0.42 * W, 0.73 * W, 0.92 * W], fill=255)        # disque
    return m


def m_medal_star():
    m = new_mask()
    star(ImageDraw.Draw(m), 0.50 * W, 0.685 * W, 0.145 * W, points=5, inner=0.44)
    return m


def _save(icon, name):
    path = os.path.join(ICONS_DIR, name + ".png")
    icon.save(path, "PNG", optimize=True)
    print(f"Wrote {path} ({os.path.getsize(path)} bytes)")


def main():
    os.makedirs(ICONS_DIR, exist_ok=True)
    _save(finalize(m_skull(), GOLD), "ironman")
    _save(finalize(m_trophy(), GOLD), "trophy")
    for name, pal in (("medal_gold", GOLD), ("medal_silver", SILVER),
                      ("medal_bronze", BRONZE)):
        base = finalize(m_medal_base(), pal)
        star_layer = finalize(m_medal_star(), pal, glow=False)
        _save(Image.alpha_composite(base, star_layer), name)


if __name__ == "__main__":
    main()
