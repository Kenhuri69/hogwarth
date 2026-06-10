#!/usr/bin/env python3
# ============================================================
# gen_codex_parchment.py — Fonds de parchemin du Codex (Ch.12 §VIII)
# ------------------------------------------------------------
# Génère 4 textures de fond, une par Acte, qui « patinent » la même
# couverture (cf. docs/histoire/12-glossaire-et-codex.md §12.1.1) :
#   A vélin propre · B taché & gelé · C recousu · D runique.
#
# Procédural (PIL + numpy), déterministe (seed fixe par Acte) → reproductible.
# Sortie : img/codex/parchment_{a,b,c,d}.png (384×384, PNG-8, ~subtil).
# Les textures sont volontairement SOMBRES et peu contrastées : elles
# passent SOUS un dégradé d'assombrissement (codex.css) pour que le texte
# d'archive reste lisible. Usage : background-image en `cover`.
#
# Dépendances : pip install pillow numpy
# Usage : python3 tools/gen_codex_parchment.py
# ============================================================

import os
import numpy as np
from PIL import Image, ImageFilter

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'img', 'codex')
SIZE = 384

# Palette par Acte : (base RGB, grain, teinte de tache, force vignette).
ACTS = {
    'a': dict(base=(58, 44, 26), grain=18, blot=(86, 66, 36), vignette=0.55, seed=1, frost=0.0,  runes=0),
    'b': dict(base=(48, 40, 28), grain=20, blot=(70, 84, 96), vignette=0.62, seed=2, frost=0.45, runes=0),
    'c': dict(base=(40, 32, 22), grain=22, blot=(60, 48, 30), vignette=0.70, seed=3, frost=0.18, runes=0),
    'd': dict(base=(26, 32, 40), grain=24, blot=(54, 78, 104), vignette=0.74, seed=4, frost=0.30, runes=14),
}


def _fiber_noise(rng, h, w):
    """Bruit de fibre : grain fin + stries directionnelles (vélin)."""
    fine = rng.normal(0, 1, (h, w))
    # Stries horizontales douces (sens des fibres).
    streak = rng.normal(0, 1, (h, 1)) * np.ones((1, w))
    return 0.7 * fine + 0.3 * streak


def _blobs(rng, h, w, n, radius):
    """Champ de taches gaussiennes (stains / givre), valeurs 0..1."""
    field = np.zeros((h, w), dtype=np.float64)
    ys, xs = np.mgrid[0:h, 0:w]
    for _ in range(n):
        cy, cx = rng.integers(0, h), rng.integers(0, w)
        r = radius * (0.5 + rng.random())
        amp = 0.5 + rng.random()
        field += amp * np.exp(-(((ys - cy) ** 2 + (xs - cx) ** 2) / (2 * r * r)))
    m = field.max()
    return field / m if m > 0 else field


def _vignette(h, w, strength):
    ys, xs = np.mgrid[0:h, 0:w]
    cy, cx = h / 2, w / 2
    d = np.sqrt((ys - cy) ** 2 + (xs - cx) ** 2)
    d = d / d.max()
    return 1.0 - strength * (d ** 2)


def generate(act, cfg):
    rng = np.random.default_rng(cfg['seed'])
    h = w = SIZE
    base = np.array(cfg['base'], dtype=np.float64)
    img = np.ones((h, w, 3)) * base

    # 1) Grain de fibre.
    noise = _fiber_noise(rng, h, w)
    img += (noise * cfg['grain'])[:, :, None]

    # 2) Taches sombres (usure / encre) — assombrissent localement.
    stains = _blobs(rng, h, w, n=10, radius=70)
    img -= (stains * 16)[:, :, None]

    # 3) Givre / patine froide — éclaircit vers la teinte `blot`.
    if cfg['frost'] > 0:
        frost = _blobs(rng, h, w, n=7, radius=55) * cfg['frost']
        blot = np.array(cfg['blot'], dtype=np.float64)
        img = img * (1 - frost[:, :, None]) + blot * frost[:, :, None]

    # 4) Runes lumineuses (Acte D) — petits points froids qui palpitent.
    if cfg['runes'] > 0:
        glow = np.array((120, 170, 210), dtype=np.float64)
        ys, xs = np.mgrid[0:h, 0:w]
        for _ in range(cfg['runes']):
            cy, cx = rng.integers(40, h - 40), rng.integers(40, w - 40)
            r = 6 + rng.random() * 5
            g = np.exp(-(((ys - cy) ** 2 + (xs - cx) ** 2) / (2 * r * r))) * (0.35 + rng.random() * 0.25)
            img = img * (1 - g[:, :, None]) + glow * g[:, :, None]

    # 5) Vignette (bords assombris).
    img *= _vignette(h, w, cfg['vignette'])[:, :, None]

    img = np.clip(img, 0, 255).astype(np.uint8)
    out = Image.fromarray(img, 'RGB').filter(ImageFilter.GaussianBlur(0.8))
    # PNG-8 palettisé : fond sombre peu contrasté → 48 couleurs suffisent et
    # allègent fortement le PNG (asset chargé à la demande, on reste léger).
    out = out.quantize(colors=48, method=Image.MEDIANCUT, dither=Image.Dither.NONE)
    path = os.path.join(OUT_DIR, f'parchment_{act}.png')
    out.save(path, optimize=True)
    print(f'  écrit {path} ({os.path.getsize(path)} o)')


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    print('Génération des fonds de parchemin du Codex (4 Actes)…')
    for act, cfg in ACTS.items():
        generate(act, cfg)
    print('✅ Terminé.')


if __name__ == '__main__':
    main()
