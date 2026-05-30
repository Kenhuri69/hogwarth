#!/usr/bin/env python3
"""Génère les PNG 48×48 des cosmétiques (12) et souvenirs (6) d'Outremonde,
pour remplacer leurs emoji dans l'Atelier du Voyageur (onglets Cosmétiques /
Souvenirs). Sortie : img/icons/outremonde/<id>.png

- Cosmétiques : orbe/anneau/éclat teinté par la `palette` de la donnée
  (aura = orbe halo, portal = anneau, fissure = éclat anguleux).
- Souvenirs : médaillon doré + glyphe blanc distinctif par succès.

Données dupliquées de js/data.js (OUTREMONDE_COSMETICS / OUTREMONDE_SOUVENIRS).
Supersampling ×4 + LANCZOS. Procédural, Pillow.

    python3 tools/gen_outremonde_cosmetics.py

Cf. .claude/plans/emoji-png-gaps.md
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

SIZE = 48
SS = 4
S = SIZE * SS
OUT_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "img", "icons", "outremonde"))
os.makedirs(OUT_DIR, exist_ok=True)

GOLD = (216, 182, 71)
GOLD_LT = (240, 214, 130)
GOLD_DK = (140, 105, 30)


def _hex(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def _new():
    return Image.new("RGBA", (S, S), (0, 0, 0, 0))


def _save(img, name):
    img = img.resize((SIZE, SIZE), Image.LANCZOS)
    img.save(os.path.join(OUT_DIR, name + ".png"))


def _lighten(rgb, f):
    return tuple(min(255, int(c + (255 - c) * f)) for c in rgb)


def _darken(rgb, f):
    return tuple(max(0, int(c * (1 - f))) for c in rgb)


# ── Cosmétiques ───────────────────────────────────────────────────────
COSMETICS = [
    ("aura_or", "#d8b647", "aura"), ("aura_glace", "#a8e0ff", "aura"),
    ("aura_brume", "#c8c4d6", "aura"), ("aura_lune", "#e8ecf8", "aura"),
    ("portal_emeraude", "#3cdc5a", "portal"), ("portal_amethyste", "#a060d0", "portal"),
    ("portal_rubis", "#d94545", "portal"), ("portal_saphir", "#4488dd", "portal"),
    ("fissure_or", "#d8b647", "fissure"), ("fissure_argent", "#c0c4ce", "fissure"),
    ("fissure_cuivre", "#cf8a3a", "fissure"), ("fissure_obsidienne", "#2a2530", "fissure"),
]


def _glow(shape_fn, color, blur):
    layer = _new()
    shape_fn(ImageDraw.Draw(layer), color)
    return layer.filter(ImageFilter.GaussianBlur(blur))


def gen_cosmetic(cid, hexcol, kind):
    col = _hex(hexcol)
    img = _new()
    c = S / 2

    if kind == "aura":
        img = Image.alpha_composite(img, _glow(
            lambda d, col: d.ellipse([S * 0.16, S * 0.16, S * 0.84, S * 0.84], fill=col),
            col + (170,), S * 0.07))
        d = ImageDraw.Draw(img)
        d.ellipse([S * 0.26, S * 0.26, S * 0.74, S * 0.74], fill=col + (255,))
        d.ellipse([S * 0.30, S * 0.28, S * 0.52, S * 0.46], fill=_lighten(col, 0.55) + (200,))
    elif kind == "portal":
        img = Image.alpha_composite(img, _glow(
            lambda d, col: d.ellipse([S * 0.18, S * 0.18, S * 0.82, S * 0.82],
                                     outline=col, width=int(S * 0.12)), col + (160,), S * 0.06))
        d = ImageDraw.Draw(img)
        d.ellipse([S * 0.20, S * 0.20, S * 0.80, S * 0.80], outline=_lighten(col, 0.2) + (255,),
                  width=int(S * 0.085))
        d.ellipse([S * 0.30, S * 0.30, S * 0.70, S * 0.70], outline=_darken(col, 0.3) + (220,),
                  width=int(S * 0.04))
        d.ellipse([S * 0.42, S * 0.42, S * 0.58, S * 0.58], fill=_lighten(col, 0.4) + (255,))
    else:  # fissure : éclat losange anguleux
        pts = [(c, S * 0.12), (S * 0.62, S * 0.40), (S * 0.80, c),
               (S * 0.58, S * 0.66), (c, S * 0.88), (S * 0.40, S * 0.60),
               (S * 0.20, c), (S * 0.42, S * 0.36)]
        img = Image.alpha_composite(img, _glow(lambda d, col: d.polygon(pts, fill=col),
                                               col + (150,), S * 0.05))
        d = ImageDraw.Draw(img)
        d.polygon(pts, fill=col + (255,))
        d.line([(c, S * 0.12), (c, S * 0.88)], fill=_lighten(col, 0.5) + (220,), width=SS)
        d.line([(S * 0.20, c), (S * 0.80, c)], fill=_darken(col, 0.25) + (200,), width=SS)
    _save(img, cid)


# ── Souvenirs : médaillon doré + glyphe ───────────────────────────────
def _medallion(d):
    d.ellipse([S * 0.10, S * 0.10, S * 0.90, S * 0.90], fill=GOLD_DK + (255,))
    d.ellipse([S * 0.13, S * 0.13, S * 0.87, S * 0.87], fill=GOLD + (255,))
    d.ellipse([S * 0.18, S * 0.18, S * 0.82, S * 0.82], outline=GOLD_LT + (255,), width=int(S * 0.02))


def _g_moon(d, col):
    d.ellipse([S * 0.34, S * 0.26, S * 0.70, S * 0.74], fill=col)
    d.ellipse([S * 0.44, S * 0.24, S * 0.78, S * 0.72], fill=GOLD + (255,))


def _g_compass(d, col):
    c = S / 2
    for a in (0, 90, 180, 270):
        r = math.radians(a)
        tip = (c + math.cos(r) * S * 0.26, c + math.sin(r) * S * 0.26)
        b1 = (c + math.cos(r + 2.3) * S * 0.09, c + math.sin(r + 2.3) * S * 0.09)
        b2 = (c + math.cos(r - 2.3) * S * 0.09, c + math.sin(r - 2.3) * S * 0.09)
        d.polygon([tip, b1, b2], fill=col)


def _g_swords(d, col):
    for sign in (-1, 1):
        d.line([(S * (0.5 - 0.2 * sign), S * 0.72), (S * (0.5 + 0.2 * sign), S * 0.28)],
               fill=col, width=int(S * 0.07))
    d.ellipse([S * 0.46, S * 0.46, S * 0.54, S * 0.54], fill=GOLD_DK + (255,))


def _g_web(d, col):
    c = S / 2
    for a in range(0, 360, 45):
        r = math.radians(a)
        d.line([(c, c), (c + math.cos(r) * S * 0.30, c + math.sin(r) * S * 0.30)],
               fill=col, width=SS)
    for rr in (0.12, 0.21, 0.30):
        d.ellipse([c - S * rr, c - S * rr, c + S * rr, c + S * rr], outline=col, width=SS)


def _g_scroll(d, col):
    d.rounded_rectangle([S * 0.30, S * 0.28, S * 0.70, S * 0.72], radius=int(S * 0.05), fill=col)
    d.rectangle([S * 0.30, S * 0.26, S * 0.70, S * 0.34], fill=GOLD_DK + (255,))
    d.rectangle([S * 0.30, S * 0.66, S * 0.70, S * 0.74], fill=GOLD_DK + (255,))
    for y in (0.42, 0.50, 0.58):
        d.line([(S * 0.37, S * y), (S * 0.63, S * y)], fill=GOLD_DK + (255,), width=SS)


def _g_crown(d, col):
    base_y = S * 0.66
    pts = [(S * 0.28, base_y), (S * 0.28, S * 0.40), (S * 0.39, S * 0.52),
           (S * 0.50, S * 0.32), (S * 0.61, S * 0.52), (S * 0.72, S * 0.40),
           (S * 0.72, base_y)]
    d.polygon(pts, fill=col)
    d.rectangle([S * 0.28, base_y, S * 0.72, S * 0.72], fill=col)


SOUVENIRS = [
    ("premier_pas", _g_moon), ("voyageur_familier", _g_compass),
    ("astralien", _g_swords), ("trame_cousue", _g_web),
    ("cartographe", _g_scroll), ("plenipotentiaire", _g_crown),
]


def gen_souvenir(sid, glyph_fn):
    img = _new()
    d = ImageDraw.Draw(img)
    _medallion(d)
    glyph_fn(d, (255, 250, 235, 255))
    _save(img, sid)


if __name__ == "__main__":
    for cid, hexcol, kind in COSMETICS:
        gen_cosmetic(cid, hexcol, kind)
    for sid, glyph in SOUVENIRS:
        gen_souvenir(sid, glyph)
    print("écrit", len(COSMETICS) + len(SOUVENIRS), "PNG dans", OUT_DIR)
