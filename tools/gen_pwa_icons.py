"""
Génère les icônes PWA depuis img/scenes/title.jpg.

Produit dans img/icons/pwa/ :
  - icon-192.png            (192x192, purpose=any, sujet bord-à-bord avec cartouche or)
  - icon-512.png            (512x512, purpose=any)
  - icon-192-maskable.png   (192x192, purpose=maskable, sujet dans la safe zone 80%)
  - icon-512-maskable.png   (512x512, purpose=maskable)
  - apple-touch-icon.png    (180x180, fond opaque, pas de transparence)

Dépendance : pillow.

Usage : python3 tools/gen_pwa_icons.py
"""

from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "img" / "scenes" / "title.jpg"
OUT_DIR = ROOT / "img" / "icons" / "pwa"
OUT_DIR.mkdir(parents=True, exist_ok=True)

BG_COLOR = (26, 15, 6)         # background_color du manifest (#1a0f06)
GOLD_OUTER = (201, 168, 76)    # theme_color (#c9a84c)
GOLD_INNER = (236, 214, 146)   # accent doré clair
GOLD_DARK = (132, 99, 20)      # ombre dorée


def load_source() -> Image.Image:
    return Image.open(SRC).convert("RGB")


def center_crop_square(im: Image.Image) -> Image.Image:
    w, h = im.size
    s = min(w, h)
    left = (w - s) // 2
    top = (h - s) // 2
    return im.crop((left, top, left + s, top + s))


def make_any_icon(source: Image.Image, size: int) -> Image.Image:
    """
    Icône `purpose=any` : sujet édge-to-edge (le navigateur n'applique pas de
    masque), avec un cartouche doré périphérique pour relier au thème du jeu.
    """
    sq = center_crop_square(source).resize((size, size), Image.LANCZOS)
    canvas = Image.new("RGB", (size, size), BG_COLOR)
    canvas.paste(sq, (0, 0))

    draw = ImageDraw.Draw(canvas)
    # Cartouche or — épaisseur ~3% du côté
    border = max(2, size // 32)
    inner_pad = border + max(1, size // 64)

    # Anneau externe (bord)
    for i in range(border):
        # Dégradé sombre → clair → sombre pour un effet ciselé
        t = i / max(1, border - 1)
        r = int(GOLD_DARK[0] * (1 - t) + GOLD_OUTER[0] * t)
        g = int(GOLD_DARK[1] * (1 - t) + GOLD_OUTER[1] * t)
        b = int(GOLD_DARK[2] * (1 - t) + GOLD_OUTER[2] * t)
        draw.rectangle(
            [i, i, size - 1 - i, size - 1 - i],
            outline=(r, g, b),
            width=1,
        )

    # Liseré or clair intérieur
    draw.rectangle(
        [inner_pad, inner_pad, size - 1 - inner_pad, size - 1 - inner_pad],
        outline=GOLD_INNER,
        width=max(1, size // 128),
    )

    return canvas


def make_maskable_icon(source: Image.Image, size: int) -> Image.Image:
    """
    Icône `purpose=maskable` : le sujet doit tenir dans la safe-zone centrale
    de 80% (rayon 40% du côté). Le bord peut être croppé par le mask Android.
    """
    sq = center_crop_square(source)
    # Le sujet occupe 80% du côté final → on cible 80% du carré source aussi
    safe = int(size * 0.80)
    inner = sq.resize((safe, safe), Image.LANCZOS)

    canvas = Image.new("RGB", (size, size), BG_COLOR)
    off = (size - safe) // 2
    canvas.paste(inner, (off, off))

    # Cartouche doré, mais resserré dans la safe zone pour ne pas être croppé
    draw = ImageDraw.Draw(canvas)
    border = max(2, size // 40)
    for i in range(border):
        t = i / max(1, border - 1)
        r = int(GOLD_DARK[0] * (1 - t) + GOLD_OUTER[0] * t)
        g = int(GOLD_DARK[1] * (1 - t) + GOLD_OUTER[1] * t)
        b = int(GOLD_DARK[2] * (1 - t) + GOLD_OUTER[2] * t)
        draw.rectangle(
            [off + i, off + i, off + safe - 1 - i, off + safe - 1 - i],
            outline=(r, g, b),
            width=1,
        )

    # Léger vignettage sur le bord externe (zone qui peut être croppée)
    vignette = Image.new("L", (size, size), 255)
    vd = ImageDraw.Draw(vignette)
    vd.rectangle([off, off, size - off - 1, size - off - 1], fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(size // 16))
    bg_layer = Image.new("RGB", (size, size), BG_COLOR)
    canvas = Image.composite(canvas, bg_layer, vignette)

    return canvas


def make_apple_touch_icon(source: Image.Image) -> Image.Image:
    """
    iOS : 180×180, fond opaque (pas de purpose=maskable, mais iOS applique
    son propre arrondi → on évite tout contenu critique dans les coins).
    """
    size = 180
    sq = center_crop_square(source).resize((size, size), Image.LANCZOS)
    canvas = Image.new("RGB", (size, size), BG_COLOR)
    canvas.paste(sq, (0, 0))

    draw = ImageDraw.Draw(canvas)
    border = max(2, size // 32)
    for i in range(border):
        t = i / max(1, border - 1)
        r = int(GOLD_DARK[0] * (1 - t) + GOLD_OUTER[0] * t)
        g = int(GOLD_DARK[1] * (1 - t) + GOLD_OUTER[1] * t)
        b = int(GOLD_DARK[2] * (1 - t) + GOLD_OUTER[2] * t)
        draw.rectangle(
            [i, i, size - 1 - i, size - 1 - i],
            outline=(r, g, b),
            width=1,
        )

    return canvas


def main() -> None:
    source = load_source()

    outputs = [
        ("icon-192.png", make_any_icon(source, 192)),
        ("icon-512.png", make_any_icon(source, 512)),
        ("icon-192-maskable.png", make_maskable_icon(source, 192)),
        ("icon-512-maskable.png", make_maskable_icon(source, 512)),
        ("apple-touch-icon.png", make_apple_touch_icon(source)),
    ]

    for name, im in outputs:
        path = OUT_DIR / name
        im.save(path, "PNG", optimize=True)
        print(f"  ✓ {path.relative_to(ROOT)}  ({im.size[0]}x{im.size[1]})")


if __name__ == "__main__":
    main()
