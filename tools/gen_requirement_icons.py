#!/usr/bin/env python3
"""Génère les 6 trophées PNG de la Salle sur Demande (V3.1).

6 médaillons 64×64 dans img/icons/requirement/ :
  - eclat_refuge.png    — flamme (refuge)
  - eclat_loot.png      — gemme  (cache aux objets)
  - eclat_training.png  — épées croisées (entraînement)
  - eclat_boutique.png  — bourse/pièces (étal de marchand)
  - eclat_forge.png     — enclume (forge éphémère)
  - eclat_complet.png   — couronne rayonnante (complétion)

Procédural via Pillow (calqué sur gen_ironman_icons.py). Lancer depuis la
racine du projet :
    python3 tools/gen_requirement_icons.py
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

OUT_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "img", "icons", "requirement"))

SIZE = 64
SS = 4
W = SIZE * SS

GOLD_HI = (245, 222, 150)
GOLD_LO = (120, 88, 28)
GOLD_RIM = (201, 168, 76)
DARK = (26, 18, 8)

# Palette de fond par thème : (centre clair, bord sombre)
THEMES = {
    "eclat_refuge":   ((232, 140, 60),  (96, 30, 10)),
    "eclat_loot":     ((120, 196, 220), (24, 60, 96)),
    "eclat_training": ((200, 90, 80),   (70, 18, 16)),
    "eclat_boutique": ((110, 200, 130), (24, 80, 50)),
    "eclat_forge":    ((150, 150, 160), (28, 26, 32)),
    "eclat_complet":  ((245, 220, 130), (130, 80, 20)),
}


def disc_gradient(c_hi, c_lo, r):
    """Disque à dégradé radial (clair au centre, sombre au bord)."""
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    px = img.load()
    cx = cy = W / 2
    for y in range(W):
        for x in range(W):
            dx, dy = x - cx, y - cy
            d = math.hypot(dx, dy) / r
            if d > 1.0:
                continue
            t = d ** 1.3
            c = tuple(int(c_hi[i] + (c_lo[i] - c_hi[i]) * t) for i in range(3))
            px[x, y] = c + (255,)
    return img


def ring(draw, r, width, color):
    cx = cy = W / 2
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=width)


# ── Glyphes (tracés simples, dorés/blancs sur le médaillon) ──────────────
def g_flame(d, c):
    cx, cy = W / 2, W / 2 + 0.04 * W
    # bulbe inférieur + pointe haute = goutte de flamme
    d.ellipse([cx - 0.17 * W, cy - 0.06 * W, cx + 0.17 * W, cy + 0.22 * W], fill=c)
    d.polygon([(cx - 0.17 * W, cy + 0.03 * W), (cx, cy - 0.34 * W),
               (cx + 0.17 * W, cy + 0.03 * W)], fill=c)
    # cœur clair de la flamme
    inner = tuple(min(255, int(v * 0.55 + 255 * 0.45)) for v in c[:3])
    d.ellipse([cx - 0.08 * W, cy + 0.02 * W, cx + 0.08 * W, cy + 0.18 * W], fill=inner)
    d.polygon([(cx - 0.08 * W, cy + 0.06 * W), (cx, cy - 0.16 * W),
               (cx + 0.08 * W, cy + 0.06 * W)], fill=inner)


def g_gem(d, c):
    cx, cy = W / 2, W / 2
    r = 0.26 * W
    pts = [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]
    d.polygon(pts, fill=c)
    d.line([(cx - r, cy), (cx + r, cy)], fill=DARK, width=SS)
    d.line([(cx, cy - r), (cx, cy + r)], fill=DARK, width=SS)


def g_swords(d, c):
    cx, cy = W / 2, W / 2
    r = 0.30 * W
    for sx in (-1, 1):
        d.line([(cx - sx * r, cy - r), (cx + sx * r, cy + r)], fill=c, width=int(0.10 * W))
    d.ellipse([cx - 0.05 * W, cy - 0.05 * W, cx + 0.05 * W, cy + 0.05 * W], fill=GOLD_HI)


def g_purse(d, c):
    cx, cy = W / 2, W / 2 + 0.04 * W
    r = 0.24 * W
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
    d.rectangle([cx - 0.10 * W, cy - r - 0.06 * W, cx + 0.10 * W, cy - r + 0.04 * W], fill=GOLD_LO)
    # symbole pièce
    d.ellipse([cx - 0.10 * W, cy - 0.10 * W, cx + 0.10 * W, cy + 0.10 * W], outline=DARK, width=SS)


def g_anvil(d, c):
    cx, cy = W / 2, W / 2
    # corps
    d.polygon([(cx - 0.26 * W, cy - 0.06 * W), (cx + 0.28 * W, cy - 0.06 * W),
               (cx + 0.20 * W, cy + 0.04 * W), (cx + 0.08 * W, cy + 0.04 * W),
               (cx + 0.10 * W, cy + 0.18 * W), (cx - 0.10 * W, cy + 0.18 * W),
               (cx - 0.08 * W, cy + 0.04 * W), (cx - 0.18 * W, cy + 0.04 * W)], fill=c)
    d.polygon([(cx - 0.30 * W, cy - 0.16 * W), (cx + 0.14 * W, cy - 0.16 * W),
               (cx + 0.14 * W, cy - 0.06 * W), (cx - 0.30 * W, cy - 0.06 * W)], fill=c)


def g_crown(d, c):
    cx, cy = W / 2, W / 2 + 0.04 * W
    w = 0.30 * W
    base = cy + 0.14 * W
    top = cy - 0.18 * W
    d.polygon([(cx - w, base), (cx - w, top + 0.10 * W), (cx - 0.5 * w, top + 0.18 * W),
               (cx, top), (cx + 0.5 * w, top + 0.18 * W), (cx + w, top + 0.10 * W),
               (cx + w, base)], fill=c)
    for gx in (-w, 0, w):
        d.ellipse([cx + gx - 0.05 * W, top - 0.02 * W, cx + gx + 0.05 * W, top + 0.08 * W], fill=GOLD_HI)


GLYPHS = {
    "eclat_refuge":   (g_flame,  GOLD_HI),
    "eclat_loot":     (g_gem,    (235, 245, 252)),
    "eclat_training": (g_swords, (235, 235, 240)),
    "eclat_boutique": (g_purse,  GOLD_HI),
    "eclat_forge":    (g_anvil,  (40, 36, 44)),
    "eclat_complet":  (g_crown,  GOLD_HI),
}


def build(name):
    c_hi, c_lo = THEMES[name]
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    r = W / 2 - 3 * SS
    img.alpha_composite(disc_gradient(c_hi, c_lo, r))
    d = ImageDraw.Draw(img)
    # anneau or + liseré sombre
    ring(d, r, 3 * SS, GOLD_RIM)
    ring(d, r - 3 * SS, SS, DARK)
    # glyphe
    fn, col = GLYPHS[name]
    fn(d, col)
    # halo de complétion
    if name == "eclat_complet":
        glow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.ellipse([W / 2 - r, W / 2 - r, W / 2 + r, W / 2 + r], fill=(255, 220, 130, 70))
        glow = glow.filter(ImageFilter.GaussianBlur(6 * SS))
        img = Image.alpha_composite(glow, img)
    return img.resize((SIZE, SIZE), Image.LANCZOS)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name in THEMES:
        out = os.path.join(OUT_DIR, name + ".png")
        build(name).save(out)
        print("écrit", os.path.relpath(out))


if __name__ == "__main__":
    main()
