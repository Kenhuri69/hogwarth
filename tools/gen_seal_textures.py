#!/usr/bin/env python3
# ============================================================
# Génère le tileset « Poche du Sceau » (seal_*) — ambiance froide /
# temporelle, givre-violet runique, nettement distincte des Ruines (rune_*).
# Sortie : 3 PNG 64×64 tileables (mêmes dimensions que rune_*) :
#   img/textures/walls/seal_wall.png
#   img/textures/floor/seal_floor.png
#   img/textures/ceiling/seal_ceiling.png
# Plan : .claude/plans/escape-game-traps.md (Lot 2, volet 4).
#
# Tileabilité : toutes les features basses fréquences (veines de givre,
# glyphes, joints) sont bâties sur des sinusoïdes à fréquence ENTIÈRE
# (donc périodiques sur 64 px) ; le grain haute fréquence est un bruit
# par pixel (sans continuité spatiale → pas de couture visible).
# Zéro dépendance hors Pillow + numpy.
# ============================================================
import os
import numpy as np
from PIL import Image

SIZE = 64
OUT = {
    'wall':    'img/textures/walls/seal_wall.png',
    'floor':   'img/textures/floor/seal_floor.png',
    'ceiling': 'img/textures/ceiling/seal_ceiling.png',
}

# Palette froide : pierre bleu-ardoise + givre cyan glacé + violet pâle.
COLD_STONE = np.array([26, 32, 48])     # base bleu-ardoise (≠ violet sombre de rune_*)
FROST      = np.array([150, 205, 235])  # givre cyan glacé
PALE_VIO   = np.array([138, 130, 205])  # violet pâle runique
RIME       = np.array([205, 225, 245])  # rime blanc-bleu (pic lumineux)

rng = np.random.default_rng(20260628)


def _grain(scale):
    """Bruit par pixel (tileable : aucune continuité spatiale requise)."""
    return (rng.random((SIZE, SIZE)) - 0.5) * scale


def _coords():
    y, x = np.mgrid[0:SIZE, 0:SIZE].astype(np.float64)
    return x, y


def _blend(base, color, mask):
    """mask ∈ [0,1] par pixel → mélange vers `color`."""
    m = np.clip(mask, 0, 1)[..., None]
    return base * (1 - m) + color[None, None, :] * m


def _frost_veins(x, y, freqs):
    """Veines de givre : scommes de sinus à fréquence entière (périodiques)."""
    v = np.zeros((SIZE, SIZE))
    for fx, fy, ph in freqs:
        v += np.sin(2 * np.pi * (fx * x + fy * y) / SIZE + ph)
    v /= len(freqs)
    # Les crêtes fines = givre : on garde la proximité de zéro du sinus.
    return np.clip(1.0 - np.abs(v) * 3.2, 0, 1)


def _glyph_marks(x, y, n):
    """Petits glyphes runiques froids posés en grille douce (tileable)."""
    mask = np.zeros((SIZE, SIZE))
    cells = SIZE // n
    for gy in range(n):
        for gx in range(n):
            if rng.random() < 0.45:
                continue
            cx = gx * cells + cells // 2 + int((rng.random() - 0.5) * 4)
            cy = gy * cells + cells // 2 + int((rng.random() - 0.5) * 4)
            # croix/losange runique simple, wrap toroïdal
            dx = np.minimum(np.abs(x - cx), SIZE - np.abs(x - cx))
            dy = np.minimum(np.abs(y - cy), SIZE - np.abs(y - cy))
            arm = cells // 3
            cross = ((dx < 0.9) & (dy < arm)) | ((dy < 0.9) & (dx < arm))
            mask = np.maximum(mask, cross.astype(np.float64) * (0.6 + 0.4 * rng.random()))
    return mask


def make_wall():
    x, y = _coords()
    base = np.broadcast_to(COLD_STONE, (SIZE, SIZE, 3)).astype(np.float64).copy()
    # Joints de maçonnerie froids (blocs décalés) — périodiques.
    rows = (np.sin(2 * np.pi * 4 * y / SIZE) ** 8)  # 4 assises
    cols = (np.sin(2 * np.pi * 4 * (x + 8 * np.floor(y / (SIZE / 4))) / SIZE) ** 8)
    mortar = np.clip(rows + cols, 0, 1) * 0.55
    base = _blend(base, COLD_STONE * 0.45, mortar)
    # Variation de pierre.
    base += _grain(26)[..., None]
    # Veines de givre dans les joints + diagonales.
    veins = _frost_veins(x, y, [(0, 4, 0.0), (3, 3, 1.1), (5, 0, 2.0)])
    base = _blend(base, FROST, veins * 0.5)
    # Glyphes runiques froids.
    glyph = _glyph_marks(x, y, 4)
    base = _blend(base, PALE_VIO, glyph * 0.7)
    base = _blend(base, RIME, glyph * 0.25)
    return base


def make_floor():
    x, y = _coords()
    base = np.broadcast_to(COLD_STONE * 0.8, (SIZE, SIZE, 3)).astype(np.float64).copy()
    # Dalles carrées givrées (grille 2×2 sur 64 → dalles de 32).
    grid = (np.sin(2 * np.pi * 2 * x / SIZE) ** 8) + (np.sin(2 * np.pi * 2 * y / SIZE) ** 8)
    seams = np.clip(grid, 0, 1) * 0.6
    base = _blend(base, COLD_STONE * 0.4, seams)
    base += _grain(20)[..., None]
    # Rime de givre qui s'accumule dans les joints.
    base = _blend(base, RIME, seams * 0.35)
    # Veines de givre fines + halo violet froid diffus.
    veins = _frost_veins(x, y, [(2, 2, 0.4), (4, 1, 1.7), (1, 5, 2.6)])
    base = _blend(base, FROST, veins * 0.45)
    glow = (np.sin(2 * np.pi * x / SIZE) * np.sin(2 * np.pi * y / SIZE) + 1) / 2
    base = _blend(base, PALE_VIO, glow * 0.12)
    return base


def make_ceiling():
    x, y = _coords()
    base = np.broadcast_to(COLD_STONE * 0.55, (SIZE, SIZE, 3)).astype(np.float64).copy()
    base += _grain(16)[..., None]
    # Cristaux de givre pendants (stalactites de glace) — verticales périodiques.
    spikes = np.clip(np.sin(2 * np.pi * 6 * x / SIZE) ** 6 * (1.0 - y / SIZE), 0, 1)
    base = _blend(base, FROST, spikes * 0.5)
    base = _blend(base, RIME, spikes * 0.2)
    # Glyphes froids plus discrets qu'au mur.
    glyph = _glyph_marks(x, y, 3)
    base = _blend(base, PALE_VIO, glyph * 0.4)
    return base


def save(arr, path):
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGB')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    print('✅', path, img.size)


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)
    save(make_wall(),    OUT['wall'])
    save(make_floor(),   OUT['floor'])
    save(make_ceiling(), OUT['ceiling'])


if __name__ == '__main__':
    main()
