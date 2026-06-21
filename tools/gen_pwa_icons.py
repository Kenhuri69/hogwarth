"""
Génère les icônes PWA depuis img/scenes/title_icon.jpg.

Produit dans img/icons/pwa/ :
  - icon-192.png            (192x192, purpose=any)
  - icon-512.png            (512x512, purpose=any)
  - icon-192-maskable.png   (192x192, purpose=maskable)
  - icon-512-maskable.png   (512x512, purpose=maskable)
  - apple-touch-icon.png    (180x180, fond opaque)

La source `title_icon.jpg` est une image CARRÉE dédiée (château centré,
fissure runique en dessous) — distincte de l'image de garde portrait
`title.jpg`. Un léger recadrage central remonte le château pour qu'il
remplisse l'icône. Pas de cadre ajouté : l'image se suffit à elle-même.
Pour les variantes maskable, le contenu critique tient dans la safe-zone
80 % et le fond pourpre du ciel s'étend jusqu'au bord (bleed-safe).

Dépendance : pillow.

Usage : python3 tools/gen_pwa_icons.py
"""

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "img" / "scenes" / "title_icon.jpg"
OUT_DIR = ROOT / "img" / "icons" / "pwa"
OUT_DIR.mkdir(parents=True, exist_ok=True)

BG_COLOR = (26, 15, 6)         # background_color du manifest (#1a0f06)

# title_icon.jpg : 1024x1024, château centré. On recadre légèrement vers
# le haut (on rogne un peu de ciel et la base de la fissure) pour que le
# château remplisse mieux l'icône à petite taille. Crop carré.
CASTLE_CROP_BOX = (60, 30, 964, 934)   # (left, top, right, bottom) — carré 904²


def load_castle_crop() -> Image.Image:
    """
    Recadre title_icon.jpg sur le château et boost contraste + saturation
    pour que les détails restent lisibles à 48-72px.
    """
    im = Image.open(SRC).convert("RGB")
    crop = im.crop(CASTLE_CROP_BOX)
    # Sécurité : forcer un carré si le crop ne l'est pas parfaitement.
    w, h = crop.size
    if w != h:
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        crop = crop.crop((left, top, left + side, top + side))

    # Boost contraste + saturation pour rendre les flammes/fenêtres
    # dorées + le château plus lisibles à petite taille.
    crop = ImageEnhance.Contrast(crop).enhance(1.20)
    crop = ImageEnhance.Color(crop).enhance(1.25)
    crop = ImageEnhance.Brightness(crop).enhance(1.08)
    return crop


def make_any_icon(source: Image.Image, size: int) -> Image.Image:
    """
    purpose=any : le château remplit le canvas (bleed-safe — seul le ciel
    peut être croppé par un mask launcher).
    """
    return source.resize((size, size), Image.LANCZOS)


def make_maskable_icon(source: Image.Image, size: int) -> Image.Image:
    """
    purpose=maskable : le contenu critique est dans la safe-zone 80 %.
    Le château occupe les 80 % centraux, le fond pourpre s'étend
    jusqu'au bord pour bleed-safe.
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
    Fond opaque obligatoire.
    """
    size = 180
    return source.resize((size, size), Image.LANCZOS)


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
