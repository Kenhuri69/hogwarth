"""
Génère les icônes PWA depuis img/scenes/title.jpg.

Produit dans img/icons/pwa/ :
  - icon-192.png            (192x192, purpose=any)
  - icon-512.png            (512x512, purpose=any)
  - icon-192-maskable.png   (192x192, purpose=maskable)
  - icon-512-maskable.png   (512x512, purpose=maskable)
  - apple-touch-icon.png    (180x180, fond opaque)

Toutes les variantes appliquent un **recadrage serré** sur le château et
gardent le **cartouche or à l'intérieur de la safe-zone 80 %**, pour
survivre aux masques que les launchers Android appliquent (squircle,
circle, rounded square, teardrop). Le fond pourpre du ciel s'étend
jusqu'au bord (bleed-safe) — seul le ciel peut être croppé, pas le
château ni le cadre.

Dépendance : pillow.

Usage : python3 tools/gen_pwa_icons.py
"""

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "img" / "scenes" / "title.jpg"
OUT_DIR = ROOT / "img" / "icons" / "pwa"
OUT_DIR.mkdir(parents=True, exist_ok=True)

BG_COLOR = (26, 15, 6)         # background_color du manifest (#1a0f06)
GOLD_OUTER = (201, 168, 76)    # theme_color (#c9a84c)
GOLD_INNER = (236, 214, 146)   # accent doré clair
GOLD_DARK = (132, 99, 20)      # ombre dorée

# title.jpg : 1024x1024. Le château occupe approximativement la bande
# verticale entre y=80 (sommet des tours) et y=620 (base des rochers).
# On recadre sur cette zone pour que le château remplisse l'icône.
CASTLE_CROP_BOX = (110, 60, 920, 690)   # (left, top, right, bottom)


def load_castle_crop() -> Image.Image:
    """
    Recadre title.jpg sur le château et boost contraste + saturation
    pour que les détails restent lisibles à 48-72px.
    """
    im = Image.open(SRC).convert("RGB")
    crop = im.crop(CASTLE_CROP_BOX)
    # Recadre en carré : le crop est ~810x630, on étend symétriquement
    w, h = crop.size
    if w > h:
        pad = (w - h) // 2
        crop = Image.new("RGB", (w, w), BG_COLOR)
        crop.paste(im.crop(CASTLE_CROP_BOX), (0, pad))
    elif h > w:
        pad = (h - w) // 2
        out = Image.new("RGB", (h, h), BG_COLOR)
        out.paste(im.crop(CASTLE_CROP_BOX), (pad, 0))
        crop = out

    # Boost contraste + saturation pour rendre les flammes/fenêtres
    # dorées + le château plus lisibles à petite taille.
    crop = ImageEnhance.Contrast(crop).enhance(1.20)
    crop = ImageEnhance.Color(crop).enhance(1.25)
    crop = ImageEnhance.Brightness(crop).enhance(1.08)
    return crop


def draw_gold_frame(canvas: Image.Image, inset: int, thickness: int) -> None:
    """
    Trace un cartouche or à `inset` pixels du bord, épaisseur `thickness`.
    Dégradé sombre → clair → sombre pour effet ciselé, + liseré or clair
    intérieur.
    """
    draw = ImageDraw.Draw(canvas)
    size = canvas.size[0]

    # Anneau dégradé
    for i in range(thickness):
        t = i / max(1, thickness - 1)
        # courbe en V : pic clair au milieu de l'épaisseur
        v = 1.0 - abs(2 * t - 1)  # 0 → 1 → 0
        r = int(GOLD_DARK[0] * (1 - v) + GOLD_INNER[0] * v)
        g = int(GOLD_DARK[1] * (1 - v) + GOLD_INNER[1] * v)
        b = int(GOLD_DARK[2] * (1 - v) + GOLD_INNER[2] * v)
        x0 = inset + i
        y0 = inset + i
        x1 = size - 1 - inset - i
        y1 = size - 1 - inset - i
        draw.rectangle([x0, y0, x1, y1], outline=(r, g, b), width=1)

    # Liseré or clair intérieur
    pin = inset + thickness + max(1, size // 96)
    draw.rectangle(
        [pin, pin, size - 1 - pin, size - 1 - pin],
        outline=GOLD_OUTER,
        width=max(1, size // 96),
    )


def add_corner_studs(canvas: Image.Image, inset: int, thickness: int) -> None:
    """Petites pastilles dorées aux 4 coins du cartouche."""
    size = canvas.size[0]
    draw = ImageDraw.Draw(canvas)
    radius = max(3, size // 24)
    center = inset + thickness // 2
    for cx, cy in [
        (center, center),
        (size - 1 - center, center),
        (center, size - 1 - center),
        (size - 1 - center, size - 1 - center),
    ]:
        # halo extérieur
        draw.ellipse([cx - radius - 1, cy - radius - 1, cx + radius + 1, cy + radius + 1],
                     fill=GOLD_DARK)
        # disque or
        draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=GOLD_OUTER)
        # reflet clair
        r2 = max(1, radius // 2)
        draw.ellipse([cx - r2, cy - r2, cx, cy], fill=GOLD_INNER)


def make_any_icon(source: Image.Image, size: int) -> Image.Image:
    """
    purpose=any : le château remplit le canvas (bleed-safe — seul le ciel
    peut être croppé par un mask launcher). Le cartouche or est INDENTÉ
    de ~10 % du bord pour rester visible quel que soit le mask appliqué
    (squircle, rounded square, circle).
    """
    castle = source.resize((size, size), Image.LANCZOS)
    canvas = castle.copy()

    inset = max(2, int(size * 0.10))         # 10 % du côté
    thickness = max(3, int(size * 0.022))    # 2,2 % du côté
    draw_gold_frame(canvas, inset=inset, thickness=thickness)
    add_corner_studs(canvas, inset=inset, thickness=thickness)
    return canvas


def make_maskable_icon(source: Image.Image, size: int) -> Image.Image:
    """
    purpose=maskable : le contenu critique est dans la safe-zone 80 %.
    Le château occupe les 80 % centraux, le fond pourpre s'étend
    jusqu'au bord pour bleed-safe. Cartouche or au bord de la safe-zone.
    """
    safe = int(size * 0.80)
    inner = source.resize((safe, safe), Image.LANCZOS)

    # Fond : ciel pourpre étendu (couleur dominante du haut de l'image)
    # Pour éviter une bande BG_COLOR moche, on extrait la couleur médiane
    # du bord supérieur de l'image source.
    top_strip = source.crop((0, 0, source.size[0], max(1, source.size[1] // 10)))
    avg = top_strip.resize((1, 1), Image.LANCZOS).getpixel((0, 0))
    bg = tuple(int(c * 0.55) for c in avg)  # assombri pour éviter halo

    canvas = Image.new("RGB", (size, size), bg)
    off = (size - safe) // 2
    canvas.paste(inner, (off, off))

    # Cartouche or au bord de la safe-zone (donc à `off` du bord du canvas)
    thickness = max(2, int(size * 0.018))
    draw_gold_frame(canvas, inset=off, thickness=thickness)
    add_corner_studs(canvas, inset=off, thickness=thickness)

    # Léger blur sur la couture entre le château et le fond étendu
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rectangle([off - 1, off - 1, size - off, size - off], outline=255, width=3)
    blurred = canvas.filter(ImageFilter.GaussianBlur(2))
    canvas = Image.composite(blurred, canvas, mask)

    return canvas


def make_apple_touch_icon(source: Image.Image) -> Image.Image:
    """
    iOS applique un arrondi de coin doux (pas de masque squircle agressif).
    Cartouche indenté ~8 % suffit. Fond opaque obligatoire.
    """
    size = 180
    castle = source.resize((size, size), Image.LANCZOS)
    canvas = castle.copy()

    inset = max(2, int(size * 0.08))
    thickness = max(3, int(size * 0.022))
    draw_gold_frame(canvas, inset=inset, thickness=thickness)
    add_corner_studs(canvas, inset=inset, thickness=thickness)
    return canvas


def main() -> None:
    castle = load_castle_crop()

    outputs = [
        ("icon-192.png", make_any_icon(castle, 192)),
        ("icon-512.png", make_any_icon(castle, 512)),
        ("icon-192-maskable.png", make_maskable_icon(castle, 192)),
        ("icon-512-maskable.png", make_maskable_icon(castle, 512)),
        ("apple-touch-icon.png", make_apple_touch_icon(castle)),
    ]

    for name, im in outputs:
        path = OUT_DIR / name
        im.save(path, "PNG", optimize=True)
        print(f"  ✓ {path.relative_to(ROOT)}  ({im.size[0]}x{im.size[1]})")


if __name__ == "__main__":
    main()
