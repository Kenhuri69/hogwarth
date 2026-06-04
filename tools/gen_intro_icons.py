#!/usr/bin/env python3
"""Génère les icônes PNG de la phase d'introduction.

5 icônes dorées (style cohérent avec img/icons/*.png) :
  - step_mode.png        — fil d'Ariane, étape « Mode » (deux figures)
  - step_heroes.png      — fil d'Ariane, étape « Héros » (chapeau de sorcier)
  - step_difficulty.png  — fil d'Ariane, étape « Difficulté » (baguettes croisées)
  - crest_film.png       — emblème groupe « Les Héros du Film » (éclair)
  - crest_astres.png     — emblème groupe « Le Cercle des Astres » (lune + étoiles)
  - crest_aube.png       — emblème groupe « La Garde de l'Aube » (soleil levant)

Procédural via Pillow. Lancer depuis la racine du projet :
    python3 tools/gen_intro_icons.py
"""
import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ICONS_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "img", "icons"))

SIZE = 64
SS   = 4
W    = SIZE * SS          # toile de travail supersamplée

GOLD_HI = (245, 222, 150)
GOLD    = (201, 168, 76)
GOLD_LO = (120, 88, 28)
OUTLINE = (32, 22, 6)


def new_mask():
    return Image.new("L", (W, W), 0)


def star(draw, cx, cy, r, points=4, inner=0.40, fill=255):
    pts = []
    for i in range(points * 2):
        ang = -math.pi / 2 + i * math.pi / points
        rad = r if i % 2 == 0 else r * inner
        pts.append((cx + math.cos(ang) * rad, cy + math.sin(ang) * rad))
    draw.polygon(pts, fill=fill)


def gold_gradient():
    col = Image.new("RGB", (1, W))
    for y in range(W):
        t = y / (W - 1)
        if t < 0.5:
            tt = t / 0.5
            c = tuple(int(GOLD_HI[i] + (GOLD[i] - GOLD_HI[i]) * tt) for i in range(3))
        else:
            tt = (t - 0.5) / 0.5
            c = tuple(int(GOLD[i] + (GOLD_LO[i] - GOLD[i]) * tt) for i in range(3))
        col.putpixel((0, y), c)
    return col.resize((W, W)).convert("RGBA")


def finalize(mask, glow=True):
    """Mask L (255 = matière) → icône RGBA 64×64 : remplissage doré dégradé,
    contour sombre, reflet spéculaire, halo doux."""
    grad = gold_gradient()
    shape = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    shape.paste(grad, (0, 0), mask)

    # Contour sombre (dilatation du masque)
    k = SS * 2 + 1
    dil = mask.filter(ImageFilter.MaxFilter(k))
    out = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    out.paste(Image.new("RGBA", (W, W), OUTLINE + (255,)), (0, 0), dil)
    out = Image.alpha_composite(out, shape)

    # Reflet spéculaire dans la moitié haute
    ero = mask.filter(ImageFilter.MinFilter(SS * 3 + 1))
    hi = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    hp = hi.load()
    for y in range(int(W * 0.6)):
        a = max(0.0, 1 - y / (W * 0.55))
        if a <= 0:
            continue
        val = (255, 250, 235, int(135 * a))
        for x in range(W):
            hp[x, y] = val
    hi_masked = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    hi_masked.paste(hi, (0, 0), ero)
    out = Image.alpha_composite(out, hi_masked)

    # Halo doux
    if glow:
        g = Image.new("RGBA", (W, W), (0, 0, 0, 0))
        g.paste(Image.new("RGBA", (W, W), (255, 198, 88, 95)), (0, 0), dil)
        g = g.filter(ImageFilter.GaussianBlur(SS * 2.4))
        out = Image.alpha_composite(g, out)

    return out.resize((SIZE, SIZE), Image.LANCZOS)


# ── Masques des 5 icônes ────────────────────────────────────────────

def m_mode():
    m = new_mask()
    d = ImageDraw.Draw(m)

    def figure(cx):
        hr = 0.115 * W
        hy = 0.33 * W
        d.ellipse([cx - hr, hy - hr, cx + hr, hy + hr], fill=255)
        bw = 0.175 * W
        by0 = hy + hr * 0.35
        dome = bw * 2
        d.pieslice([cx - bw, by0, cx + bw, by0 + dome], 180, 360, fill=255)
        d.rectangle([cx - bw, by0 + dome / 2, cx + bw, 0.90 * W], fill=255)

    figure(0.31 * W)
    figure(0.69 * W)
    return m


def m_heroes():
    m = new_mask()
    d = ImageDraw.Draw(m)
    # Cône du chapeau, légèrement penché
    apex = (0.58 * W, 0.07 * W)
    cone = [
        apex,
        (0.50 * W, 0.30 * W),
        (0.42 * W, 0.50 * W),
        (0.30 * W, 0.69 * W),
        (0.74 * W, 0.69 * W),
    ]
    d.polygon(cone, fill=255)
    # Bord du chapeau
    d.ellipse([0.13 * W, 0.63 * W, 0.87 * W, 0.81 * W], fill=255)
    # Étincelle magique
    star(d, 0.76 * W, 0.26 * W, 0.085 * W, points=4, inner=0.34)
    return m


def m_difficulty():
    m = new_mask()
    d = ImageDraw.Draw(m)
    wand_w = int(0.085 * W)

    def wand(p0, p1):
        d.line([p0, p1], fill=255, width=wand_w)
        r = wand_w / 2
        for p in (p0, p1):
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=255)

    wand((0.21 * W, 0.79 * W), (0.79 * W, 0.21 * W))
    wand((0.21 * W, 0.21 * W), (0.79 * W, 0.79 * W))
    # Étincelles aux pointes hautes
    star(d, 0.79 * W, 0.21 * W, 0.085 * W, points=4, inner=0.34)
    star(d, 0.21 * W, 0.21 * W, 0.085 * W, points=4, inner=0.34)
    return m


def _ring():
    """Anneau d'emblème commun aux deux crests."""
    outer = new_mask()
    ImageDraw.Draw(outer).ellipse(
        [0.04 * W, 0.04 * W, 0.96 * W, 0.96 * W], fill=255)
    inner = new_mask()
    ImageDraw.Draw(inner).ellipse(
        [0.155 * W, 0.155 * W, 0.845 * W, 0.845 * W], fill=255)
    return ImageChops.subtract(outer, inner)


def m_crest_film():
    m = _ring()
    bolt = new_mask()
    d = ImageDraw.Draw(bolt)
    # Éclair (cicatrice de Harry)
    d.polygon([
        (0.585 * W, 0.26 * W),
        (0.40 * W, 0.53 * W),
        (0.515 * W, 0.53 * W),
        (0.42 * W, 0.78 * W),
        (0.61 * W, 0.49 * W),
        (0.49 * W, 0.49 * W),
    ], fill=255)
    return ImageChops.lighter(m, bolt)


def m_crest_astres():
    m = _ring()
    # Croissant de lune : disque moins disque décalé
    moon = new_mask()
    md = ImageDraw.Draw(moon)
    mr = 0.235 * W
    mcx, mcy = 0.45 * W, 0.53 * W
    md.ellipse([mcx - mr, mcy - mr, mcx + mr, mcy + mr], fill=255)
    cut = new_mask()
    ImageDraw.Draw(cut).ellipse(
        [mcx - mr + 0.15 * W, mcy - mr - 0.05 * W,
         mcx + mr + 0.15 * W, mcy + mr - 0.05 * W], fill=255)
    moon = ImageChops.subtract(moon, cut)
    m = ImageChops.lighter(m, moon)
    # Étoiles
    stars = new_mask()
    sd = ImageDraw.Draw(stars)
    star(sd, 0.69 * W, 0.33 * W, 0.085 * W, points=5, inner=0.42)
    star(sd, 0.66 * W, 0.62 * W, 0.058 * W, points=5, inner=0.42)
    return ImageChops.lighter(m, stars)


def m_crest_aube():
    """Emblème groupe « La Garde de l'Aube » : soleil levant + rayons."""
    m = _ring()
    sun = new_mask()
    sd = ImageDraw.Draw(sun)
    scx, scy = 0.5 * W, 0.60 * W
    sr = 0.17 * W
    # Disque solaire
    sd.ellipse([scx - sr, scy - sr, scx + sr, scy + sr], fill=255)
    # Rayons triangulaires dans l'hémisphère supérieur
    for k in range(7):
        ang = math.pi + (k + 0.5) * math.pi / 7   # de gauche à droite, vers le haut
        base = sr * 1.18
        tip = sr * 1.95
        nx, ny = math.cos(ang), math.sin(ang)
        # perpendiculaire pour la largeur de base
        px, py = -ny, nx
        half = sr * 0.12
        sd.polygon([
            (scx + nx * tip,            scy + ny * tip),
            (scx + nx * base + px * half, scy + ny * base + py * half),
            (scx + nx * base - px * half, scy + ny * base - py * half),
        ], fill=255)
    # Ligne d'horizon
    sd.rectangle([0.28 * W, 0.605 * W, 0.72 * W, 0.645 * W], fill=255)
    return ImageChops.lighter(m, sun)


def main():
    os.makedirs(ICONS_DIR, exist_ok=True)
    jobs = {
        "step_mode":       m_mode,
        "step_heroes":     m_heroes,
        "step_difficulty": m_difficulty,
        "crest_film":      m_crest_film,
        "crest_astres":    m_crest_astres,
        "crest_aube":      m_crest_aube,
    }
    for name, fn in jobs.items():
        icon = finalize(fn())
        path = os.path.join(ICONS_DIR, name + ".png")
        icon.save(path, "PNG", optimize=True)
        print(f"Wrote {path} ({os.path.getsize(path)} bytes)")


if __name__ == "__main__":
    main()
