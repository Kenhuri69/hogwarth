#!/usr/bin/env python3
"""
preview_icons.py — Atlas de prévisualisation des icônes générées.

Composte tous les PNG d'un dossier `img/icons/<sub>/` en une planche
unique avec étiquettes, à 1×, 2× et 4× pour évaluer la lisibilité in-game
(la taille de rendu est typiquement 24-32 px).

Usage :
    python3 tools/preview_icons.py            # défaut : items
    python3 tools/preview_icons.py items
    python3 tools/preview_icons.py spells
    python3 tools/preview_icons.py .          # racine img/icons/

Sortie : /tmp/icons_<sub>_atlas.png
"""

from __future__ import annotations
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

REPO_ROOT = Path(__file__).resolve().parent.parent
ICONS_DIR = REPO_ROOT / "img" / "icons"

# Tile : icône 4×, gap, icône 2×, gap, icône 1×, label
COLS       = 6
PAD        = 12
LABEL_H    = 22
ICON_NATIVE = 48
SCALES     = (4, 2, 1)


def load_font(size: int = 12):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              "/System/Library/Fonts/Helvetica.ttc"):
        try:
            return ImageFont.truetype(p, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def main() -> int:
    sub  = sys.argv[1] if len(sys.argv) > 1 else "items"
    src  = ICONS_DIR if sub == "." else ICONS_DIR / sub
    if not src.is_dir():
        print(f"erreur: {src} introuvable", file=sys.stderr)
        return 2

    files = sorted(p for p in src.glob("*.png") if not p.name.startswith("_"))
    if not files:
        print(f"erreur: aucun PNG dans {src}", file=sys.stderr)
        return 2

    # Tile width = 4× icon (largeur dominante)
    tile_w = ICON_NATIVE * SCALES[0] + 2 * PAD
    # Tile height = 4× icon + 2× icon + 1× icon (empilés) + label + gaps
    tile_h = sum(ICON_NATIVE * s for s in SCALES) + LABEL_H + 4 * PAD

    rows = (len(files) + COLS - 1) // COLS
    W    = COLS * tile_w
    H    = rows * tile_h

    atlas = Image.new("RGB", (W, H), (28, 22, 16))
    draw  = ImageDraw.Draw(atlas)
    font  = load_font(11)

    for i, f in enumerate(files):
        col, row = i % COLS, i // COLS
        x0, y0   = col * tile_w, row * tile_h
        # Fond tuile (alterné pour distinguer)
        bg = (40, 32, 24) if (col + row) % 2 == 0 else (32, 26, 20)
        draw.rectangle([x0, y0, x0 + tile_w - 1, y0 + tile_h - 1], fill=bg)

        img = Image.open(f).convert("RGBA")
        cy = y0 + PAD
        for s in SCALES:
            target = ICON_NATIVE * s
            scaled = img.resize((target, target), Image.NEAREST)
            cx     = x0 + (tile_w - target) // 2
            atlas.paste(scaled, (cx, cy), scaled)
            cy    += target + (PAD // 2)

        # Label
        ly = y0 + tile_h - LABEL_H
        draw.text((x0 + PAD, ly), f.stem, font=font, fill=(220, 200, 160))

    out = Path(f"/tmp/icons_{sub.replace('/', '_') or 'root'}_atlas.png")
    atlas.save(out)
    print(f"→ {out}  ({len(files)} icônes, {atlas.size[0]}×{atlas.size[1]})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
