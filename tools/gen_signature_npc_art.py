#!/usr/bin/env python3
"""Art dédié des PNJ donneurs de Quête Signature (ch.06 §6.12 — P1).

Dérive les visuels des deux donneurs originaux à partir des sprites canon du
bestiaire (zéro modèle d'image externe), pour rester cohérent avec l'univers :

- 🦁 Chevalier Fantôme (donneur non-hostile) ← `chevalier_fantome` (bestiaire),
  reteinté en spectre bleuté « apaisé » (variante non-hostile, §6.8.5).
- 🐍 Écho de Salazar (présence murmurée des cachots) ← `serpent_cachot`,
  recoloré en émeraude spectral (§6.8.6).

Sorties (formats alignés sur l'existant) :
- Portrait-médaillon de dialogue : 256×256 RGB (`img/npc/<id>.png`).
- Sprite de couloir 3D : 512×512 RGBA fond transparent (`img/npc/_npc_<type>.png`).

Usage : python3 tools/gen_signature_npc_art.py
"""
import os
from PIL import Image, ImageChops, ImageEnhance, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _load(rel):
    return Image.open(os.path.join(ROOT, rel)).convert("RGBA")


def _save(img, rel):
    out = os.path.join(ROOT, rel)
    img.save(out)
    print(f"  écrit {rel}  {img.size} {img.mode}")


def tint_rgba(img, color, strength, brightness=1.0):
    """Mélange le RGB vers un multiply-tint de `color`, alpha préservé."""
    r, g, b, a = img.split()
    rgb = Image.merge("RGB", (r, g, b))
    mult = ImageChops.multiply(rgb, Image.new("RGB", img.size, color))
    blended = Image.blend(rgb, mult, strength)
    if brightness != 1.0:
        blended = ImageEnhance.Brightness(blended).enhance(brightness)
    out = blended.convert("RGBA")
    out.putalpha(a)
    return out


def make_sprite(src_rel, color, strength, brightness, out_rel):
    sp = tint_rgba(_load(src_rel), color, strength, brightness)
    _save(sp, out_rel)
    return sp


def make_portrait(sprite_rgba, bg_top, bg_bot, out_rel, size=256, head_frac=0.60):
    """Cadre buste (haut du sprite) sur fond dégradé sombre → 256² RGB."""
    bbox = sprite_rgba.getbbox()
    cropped = sprite_rgba.crop(bbox) if bbox else sprite_rgba
    w, h = cropped.size
    upper = cropped.crop((0, 0, w, max(1, int(h * head_frac))))

    bg = Image.new("RGB", (size, size), bg_bot)
    draw = ImageDraw.Draw(bg)
    for y in range(size):
        t = y / size
        draw.line([(0, y), (size, y)],
                  fill=tuple(int(bg_top[i] * (1 - t) + bg_bot[i] * t) for i in range(3)))
    bg = bg.convert("RGBA")

    uw, uh = upper.size
    scale = (size * 0.94) / max(uw, uh)
    nu = upper.resize((max(1, int(uw * scale)), max(1, int(uh * scale))), Image.LANCZOS)
    bg.alpha_composite(nu, ((size - nu.size[0]) // 2, int(size * 0.05)))
    _save(bg.convert("RGB"), out_rel)


def main():
    print("Chevalier Fantôme (🦁, non-hostile) :")
    chev = make_sprite("img/monsters/chevalier_fantome.png",
                       (150, 190, 255), 0.45, 1.10, "img/npc/_npc_chevalier.png")
    make_portrait(chev, (42, 60, 100), (8, 12, 24), "img/npc/chevalier_godric.png")

    print("Écho de Salazar (🐍, présence des cachots) :")
    echo = make_sprite("img/monsters/serpent_cachot.png",
                       (90, 215, 140), 0.55, 1.06, "img/npc/_npc_echo.png")
    make_portrait(echo, (20, 66, 46), (6, 18, 12), "img/npc/echo_salazar.png")


if __name__ == "__main__":
    main()
