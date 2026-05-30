#!/usr/bin/env python3
"""Génère 4 icônes UI 48×48 RGBA manquantes (migration emoji → PNG) :

  img/icons/essence_outremonde.png   ✨  étincelle dorée/violette (monnaie Essence)
  img/icons/fragment_outremonde.png  🔹  gemme facettée cyan (monnaie Fragment)
  img/icons/atelier.png              ✨  portail d'atelier (violet + étincelle or)
  img/icons/besace.png               🌿  brin d'herbes vert (onglet Besace)

Style aligné sur le jeu de pictos dorés 48×48 (gold.png, door.png…) :
rendu net via supersampling ×4 puis downscale LANCZOS. Procédural, Pillow.

    python3 tools/gen_outremonde_icons.py

Cf. .claude/plans/emoji-png-gaps.md
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

SIZE = 48
SS = 4                      # supersampling
S = SIZE * SS
ICON_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "img", "icons"))


def _new():
    return Image.new("RGBA", (S, S), (0, 0, 0, 0))


def _finish(img, name):
    img = img.resize((SIZE, SIZE), Image.LANCZOS)
    out = os.path.join(ICON_DIR, name)
    img.save(out)
    print("écrit", out, img.size)


def _glow(draw_fn, color, blur):
    """Calque flou coloré derrière le sujet (halo)."""
    layer = _new()
    d = ImageDraw.Draw(layer)
    draw_fn(d, color)
    return layer.filter(ImageFilter.GaussianBlur(blur))


def _four_point_star(d, cx, cy, r_long, r_short, fill):
    """Étincelle 4 branches (losange étiré sur les 2 axes)."""
    pts_v = [(cx, cy - r_long), (cx + r_short, cy), (cx, cy + r_long), (cx - r_short, cy)]
    pts_h = [(cx - r_long, cy), (cx, cy - r_short), (cx + r_long, cy), (cx, cy + r_short)]
    d.polygon(pts_v, fill=fill)
    d.polygon(pts_h, fill=fill)


# ── ✨ Essence d'Outremonde : grande étincelle or sur halo violet ──────
def gen_essence():
    img = _new()
    c = S / 2
    halo = _glow(lambda d, col: _four_point_star(d, c, c, S * 0.46, S * 0.16, col),
                 (150, 90, 220, 200), S * 0.05)
    img = Image.alpha_composite(img, halo)
    d = ImageDraw.Draw(img)
    _four_point_star(d, c, c, S * 0.44, S * 0.13, (240, 210, 110, 255))   # or
    _four_point_star(d, c, c, S * 0.30, S * 0.06, (255, 248, 220, 255))   # cœur clair
    # 2 micro-étincelles
    _four_point_star(d, S * 0.74, S * 0.26, S * 0.10, S * 0.03, (255, 240, 200, 235))
    _four_point_star(d, S * 0.26, S * 0.72, S * 0.07, S * 0.022, (235, 200, 255, 220))
    _finish(img, "essence_outremonde.png")


# ── 🔹 Fragment : petite gemme losange cyan facettée ──────────────────
def gen_fragment():
    img = _new()
    c = S / 2
    halo = _glow(lambda d, col: d.polygon(
        [(c, S * 0.12), (S * 0.82, c), (c, S * 0.88), (S * 0.18, c)], fill=col),
        (90, 180, 235, 180), S * 0.045)
    img = Image.alpha_composite(img, halo)
    d = ImageDraw.Draw(img)
    top, bot, left, right = (c, S * 0.16), (c, S * 0.84), (S * 0.20, c), (S * 0.80, c)
    # corps
    d.polygon([top, right, bot, left], fill=(70, 160, 220, 255))
    # facettes claires (gauche) / sombres (droite)
    d.polygon([top, left, (c, c)], fill=(150, 220, 245, 255))
    d.polygon([top, right, (c, c)], fill=(110, 195, 235, 255))
    d.polygon([bot, left, (c, c)], fill=(48, 120, 185, 255))
    d.polygon([bot, right, (c, c)], fill=(36, 100, 165, 255))
    # liseré
    d.line([top, right, bot, left, top], fill=(220, 245, 255, 230), width=SS)
    _finish(img, "fragment_outremonde.png")


# ── ✨ Atelier : portail violet annulaire + étincelle or centrale ──────
def gen_atelier():
    img = _new()
    c = S / 2
    halo = _glow(lambda d, col: d.ellipse(
        [S * 0.14, S * 0.14, S * 0.86, S * 0.86], outline=col, width=int(S * 0.10)),
        (150, 90, 220, 200), S * 0.05)
    img = Image.alpha_composite(img, halo)
    d = ImageDraw.Draw(img)
    # anneau de portail (or)
    d.ellipse([S * 0.16, S * 0.16, S * 0.84, S * 0.84], outline=(230, 195, 100, 255),
              width=int(S * 0.075))
    d.ellipse([S * 0.24, S * 0.24, S * 0.76, S * 0.76], outline=(120, 70, 180, 220),
              width=int(S * 0.045))
    # étincelle centrale
    _four_point_star(d, c, c, S * 0.20, S * 0.06, (255, 245, 210, 255))
    _finish(img, "atelier.png")


# ── 🌿 Besace : brin d'herbes (tige + 4 feuilles + bourgeon) ──────────
def gen_besace():
    img = _new()
    d = ImageDraw.Draw(img)
    cx = S / 2
    stem_top, stem_bot = S * 0.18, S * 0.86
    d.line([(cx, stem_bot), (cx, stem_top)], fill=(60, 122, 46, 255), width=int(S * 0.05))

    def leaf(cx0, cy0, dx, dy, col):
        d.polygon([(cx0, cy0), (cx0 + dx, cy0 + dy - S * 0.06),
                   (cx0 + dx * 1.15, cy0 + dy * 0.4), (cx0 + dx * 0.5, cy0 + dy * 0.1)],
                  fill=col)

    light, dark = (111, 191, 74, 255), (95, 174, 63, 255)
    leaf(cx, S * 0.62, -S * 0.26, -S * 0.16, light)
    leaf(cx, S * 0.62,  S * 0.26, -S * 0.16, dark)
    leaf(cx, S * 0.44, -S * 0.22, -S * 0.16, light)
    leaf(cx, S * 0.44,  S * 0.22, -S * 0.16, dark)
    # bourgeon sommital
    d.polygon([(cx, stem_top - S * 0.02), (cx - S * 0.09, stem_top + S * 0.10),
               (cx + S * 0.09, stem_top + S * 0.10)], fill=(127, 206, 90, 255))
    _finish(img, "besace.png")


if __name__ == "__main__":
    gen_essence()
    gen_fragment()
    gen_atelier()
    gen_besace()
