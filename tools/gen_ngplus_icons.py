#!/usr/bin/env python3
"""Génère les icônes PNG de New Game+ (Chapitre 14, P6).

2 icônes 64×64 dorées (style cohérent avec img/icons/*.png, calqué sur
gen_ironman_icons.py) :
  - codex_wizard.png   — grimoire fermé + étoile gravée (Codex du Sorcier)
  - ngplus_veteran.png — écu + étoile (médaillon « Vétéran » NG+)

Procédural via Pillow (aucune IA externe). Lancer depuis la racine :
    python3 tools/gen_ngplus_icons.py
"""
import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ICONS_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "img", "icons"))

SIZE = 64
SS   = 4
W    = SIZE * SS

# Palette métal : (HI, MID, LO, OUTLINE, GLOW) — identique à gen_ironman_icons.
GOLD = ((245, 222, 150), (201, 168, 76), (120, 88, 28), (32, 22, 6), (255, 198, 88))


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
    """Mask L (255 = matière) → icône RGBA 64×64 : remplissage métal dégradé,
    contour sombre, reflet spéculaire, halo doux. Identique à
    gen_ironman_icons.finalize (cohérence visuelle du set d'icônes)."""
    outline = pal[3]
    glow_col = pal[4]
    grad = metal_gradient(pal)
    shape = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    shape.paste(grad, (0, 0), mask)

    k = SS * 2 + 1
    dil = mask.filter(ImageFilter.MaxFilter(k))
    out = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    out.paste(Image.new("RGBA", (W, W), outline + (255,)), (0, 0), dil)
    out = Image.alpha_composite(out, shape)

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

    if glow:
        g = Image.new("RGBA", (W, W), (0, 0, 0, 0))
        g.paste(Image.new("RGBA", (W, W), glow_col + (95,)), (0, 0), dil)
        g = g.filter(ImageFilter.GaussianBlur(SS * 2.4))
        out = Image.alpha_composite(g, out)

    return out.resize((SIZE, SIZE), Image.LANCZOS)


# ── Masques ─────────────────────────────────────────────────────────

def m_book():
    """Grimoire fermé vu de face : couverture + tranche de pages à droite +
    nervures de reliure soustraites à gauche."""
    m = new_mask()
    d = ImageDraw.Draw(m)
    # Couverture (légèrement plus large que haute, coins francs).
    d.rounded_rectangle([0.17 * W, 0.13 * W, 0.83 * W, 0.87 * W], radius=0.05 * W, fill=255)
    # Tranche de pages : un liseré à droite (élargit légèrement la couverture).
    d.rectangle([0.79 * W, 0.18 * W, 0.86 * W, 0.82 * W], fill=255)

    holes = new_mask()
    hd = ImageDraw.Draw(holes)
    # Nervures de reliure (2 fines bandes verticales gravées à gauche).
    for cx in (0.255, 0.305):
        hd.rectangle([cx * W, 0.18 * W, (cx + 0.012) * W, 0.82 * W], fill=255)
    # Stries des pages (3 fines lignes horizontales sur la tranche).
    for cy in (0.34, 0.50, 0.66):
        hd.rectangle([0.80 * W, cy * W, 0.855 * W, (cy + 0.012) * W], fill=255)
    return ImageChops.subtract(m, holes)


def m_book_star():
    """Étoile gravée au centre de la couverture (décalée à droite de la
    reliure)."""
    m = new_mask()
    star(ImageDraw.Draw(m), 0.545 * W, 0.50 * W, 0.165 * W, points=5, inner=0.44)
    return m


def m_shield():
    """Écu héraldique : épaules droites en haut, pointe en bas."""
    m = new_mask()
    d = ImageDraw.Draw(m)
    d.polygon([
        (0.22 * W, 0.14 * W), (0.78 * W, 0.14 * W),   # épaules
        (0.78 * W, 0.50 * W),                          # flanc droit
        (0.50 * W, 0.88 * W),                          # pointe
        (0.22 * W, 0.50 * W),                          # flanc gauche
    ], fill=255)
    # Arrondi des épaules supérieures.
    d.pieslice([0.22 * W, 0.05 * W, 0.78 * W, 0.30 * W], 180, 360, fill=255)
    return m


def m_shield_star():
    m = new_mask()
    star(ImageDraw.Draw(m), 0.50 * W, 0.44 * W, 0.20 * W, points=5, inner=0.44)
    return m


def _save(icon, name):
    path = os.path.join(ICONS_DIR, name + ".png")
    icon.save(path, "PNG", optimize=True)
    print(f"Wrote {path} ({os.path.getsize(path)} bytes)")


def main():
    os.makedirs(ICONS_DIR, exist_ok=True)

    # Codex du Sorcier : grimoire + étoile gravée par-dessus (2 couches dorées,
    # le contour de finalize sépare nettement l'étoile de la couverture).
    book = finalize(m_book(), GOLD)
    book_star = finalize(m_book_star(), GOLD, glow=False)
    _save(Image.alpha_composite(book, book_star), "codex_wizard")

    # Médaillon « Vétéran » : écu + étoile.
    shield = finalize(m_shield(), GOLD)
    shield_star = finalize(m_shield_star(), GOLD, glow=False)
    _save(Image.alpha_composite(shield, shield_star), "ngplus_veteran")


if __name__ == "__main__":
    main()
