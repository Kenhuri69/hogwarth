"""
icon_factory.py — Compositeur + 7 passes painterly pour Poudlard & Magie.

Pipeline (direction A — tableau peint MTG, cartouche dorée) :

    recipe ─► assemble silhouette (SVG part(s) + parametric shapes via shapes.py)
           ─► rasterize @ 512px via cairosvg
           ─► flat fill per region (alpha mask per data-region)
           ─► 7 passes painterly composed in order :
                1. AO            ambient occlusion (inner shadow, edge multiply)
                2. SHADING 45°   directional gradient driven by alpha-derived normals
                3. RIM-LIGHT     gold highlight on top-right edges
                4. SPECULAR      sparse hot-spots on convex peaks
                5. GRAIN         monochrome film grain (low amplitude)
                6. HALO RARETÉ   radial background tinted by rarity tier
                7. CARTOUCHE     gold-on-gold double frame, painterly border
           ─► downsample mipmaps @ 64 / 48 / 32 / 24 / 16 px (LANCZOS)
           ─► write PNG → img/icons_new/<id>_<size>.png

Stack : Python 3, Pillow, cairosvg, numpy, scipy.ndimage.

Usage :
    python tools/icon_factory.py --all
    python tools/icon_factory.py potion_s felix wand2
    python tools/icon_factory.py --list
"""

from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

try:
    import cairosvg
except ImportError:  # pragma: no cover
    print("ERROR: cairosvg manquant — pip install cairosvg", file=sys.stderr)
    raise

# Local import — works whether run as module or script.
HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
import shapes  # noqa: E402


# ── constants ──────────────────────────────────────────────────────────────

RENDER_SIZE = 512          # work resolution
MIPMAPS = (64, 48, 32, 24, 16)
OUT_DIR = os.path.normpath(os.path.join(HERE, "..", "img", "icons_new"))
PARTS_DIR = os.path.join(HERE, "parts")

# rarity tints used by halo pass + cartouche accent
RARITY_TINTS = {
    "common":    (180, 175, 165),
    "uncommon":  (110, 200, 140),
    "rare":      ( 90, 150, 220),
    "epic":      (180, 110, 220),
    "legendary": (235, 200, 110),
}

GOLD       = (201, 168,  76)
GOLD_LIGHT = (240, 208, 128)
GOLD_DARK  = (122,  92,  30)
PAPER_BG   = ( 26,  18,  12)


# ── recipe types ───────────────────────────────────────────────────────────

@dataclass
class Recipe:
    id: str
    name: str
    silhouette: dict                   # {kind:"svg", file:"..."} or {kind:"shape", name:"...", params:{...}}
    fills: Dict[str, Tuple[int, int, int]] = field(default_factory=dict)
    accents: List[dict] = field(default_factory=list)   # liquid bands, runic marks, sparkles
    rarity: str = "common"
    material: str = "matte"            # matte / glass / metal / leather / wood
    light_angle: float = 45.0          # degrees; 45° = top-left light by convention here
    sparkles: bool = False             # legendary-tier extra dust


# Built-in recipes for the 5 test items. Mirrors the schema we'll merge into
# js/data.js (ITEM_RECIPES) once validated.
RECIPES: Dict[str, Recipe] = {
    "potion_s": Recipe(
        id="potion_s", name="Potion de Soin", rarity="common", material="glass",
        silhouette={"kind": "svg", "file": "flask.svg"},
        fills={
            "stopper": (118,  78,  42),
            "body":    (172, 196, 208),     # cool glass tint
        },
        accents=[
            {"kind": "liquid", "region": "body", "color": (217,  68,  68),
             "level": 0.72, "meniscus": True},
        ],
    ),
    "felix": Recipe(
        id="felix", name="Félix Felicis", rarity="legendary", material="glass",
        silhouette={"kind": "svg", "file": "flask.svg"},
        fills={
            "stopper": (140,  98,  46),
            "body":    (210, 188, 142),
        },
        accents=[
            {"kind": "liquid", "region": "body", "color": (240, 196,  72),
             "level": 0.80, "meniscus": True, "glow": True},
            {"kind": "bubbles", "region": "body", "count": 6,
             "color": (255, 232, 168)},
        ],
        sparkles=True,
    ),
    "wand2": Recipe(
        id="wand2", name="Baguette de Sureau", rarity="rare", material="wood",
        silhouette={"kind": "svg", "file": "wizard-staff.svg"},
        fills={
            "shaft":  ( 78,  52,  32),
            "grip":   ( 54,  36,  22),
            "pommel": (122,  88,  42),
            "orb":    (190, 220, 235),       # crystal orb at the top
        },
        accents=[
            {"kind": "runes", "region": "shaft", "color": (235, 215, 150),
             "count": 5},
            {"kind": "orb_glow", "region": "orb", "color": (200, 230, 255)},
        ],
    ),
    "anneau_runique": Recipe(
        id="anneau_runique", name="Anneau Runique", rarity="rare", material="metal",
        silhouette={"kind": "shape", "name": "ring_band",
                    "params": {"radius": 175, "thickness": 36,
                               "bezel": True, "gem": True}},
        fills={
            "metal": (201, 168,  76),
            "gem":   ( 96, 150, 220),
        },
        accents=[
            {"kind": "runes", "region": "metal", "color": ( 80,  56,  20),
             "count": 6, "around": "ring"},
            {"kind": "gem_facet_shine", "region": "gem",
             "color": (220, 235, 255)},
        ],
    ),
    "livre_sortileges": Recipe(
        id="livre_sortileges", name="Sortilèges Standards, Vol.3",
        rarity="common", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={
            "cover":  ( 58,  88, 138),
            "pages":  (228, 210, 168),
            "spine":  ( 38,  60,  98),
            "gilt":   (201, 168,  76),
        },
        accents=[
            {"kind": "emboss", "region": "cover",
             "color": ( 30,  46,  76)},
        ],
    ),
}


# ── silhouette assembly ────────────────────────────────────────────────────

def _read_svg(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _rasterize(svg: str, size: int = RENDER_SIZE) -> Image.Image:
    """SVG string → RGBA PIL image."""
    png_bytes = cairosvg.svg2png(
        bytestring=svg.encode("utf-8"),
        output_width=size,
        output_height=size,
    )
    return Image.open(io.BytesIO(png_bytes)).convert("RGBA")


def _region_masks(svg: str, size: int = RENDER_SIZE) -> Dict[str, np.ndarray]:
    """For each unique data-region in the SVG, rasterize JUST that region
    (white on transparent) and return a {region: alpha_array} dict in [0,1]."""
    # Preserve first-occurrence order so the SVG-defined z-order is honored
    # by _flat_compose (later regions paint on top of earlier ones).
    regions = list(dict.fromkeys(re.findall(r'data-region="([^"]+)"', svg)))
    masks: Dict[str, np.ndarray] = {}
    for region in regions:
        # isolate this region — make every other path invisible
        isolated = re.sub(
            r'(<path\b[^>]*data-region=")([^"]+)("[^>]*/>)',
            lambda m: m.group(0) if m.group(2) == region
                      else m.group(1) + m.group(2) + '" fill="none" opacity="0"' + m.group(3).lstrip('"'),
            svg,
        )
        # cleaner approach — strip path entirely if region mismatches:
        isolated = re.sub(
            r'<path\b[^>]*data-region="(?!' + re.escape(region) + r')[^"]+"[^>]*/>',
            "",
            svg,
        )
        # force a clean black fill on the kept region (override stroke-only paths)
        isolated = re.sub(
            r'(<path\b[^>]*data-region="' + re.escape(region) + r'"[^>]*?)(\s*/>)',
            r'\1 fill="#000000" opacity="1"\2',
            isolated,
        )
        img = _rasterize(isolated, size)
        a = np.asarray(img, dtype=np.float32)[..., 3] / 255.0
        masks[region] = a
    return masks


def _build_silhouette_svg(recipe: Recipe) -> str:
    spec = recipe.silhouette
    if spec["kind"] == "svg":
        return _read_svg(os.path.join(PARTS_DIR, spec["file"]))
    if spec["kind"] == "shape":
        return shapes.build(spec["name"], **spec.get("params", {}))
    raise ValueError(f"Unknown silhouette kind: {spec['kind']}")


# ── base composite (flat fill per region) ──────────────────────────────────

def _flat_compose(recipe: Recipe, masks: Dict[str, np.ndarray]) -> Tuple[np.ndarray, np.ndarray]:
    """Apply recipe.fills to each region mask. Returns (RGB float [0,1], alpha float [0,1])."""
    h, w = next(iter(masks.values())).shape
    rgb = np.zeros((h, w, 3), dtype=np.float32)
    alpha = np.zeros((h, w), dtype=np.float32)
    for region, mask in masks.items():
        color = recipe.fills.get(region)
        if color is None:
            # default = neutral mid-grey so unmapped regions are still visible
            color = (140, 130, 118)
        col = np.array(color, dtype=np.float32) / 255.0
        m = mask[..., None]
        rgb = rgb * (1 - m) + col * m
        alpha = np.maximum(alpha, mask)
    return rgb, alpha


# ── accent rendering (liquid, runes, sparkles, etc.) ───────────────────────

def _apply_accents(rgb: np.ndarray, alpha: np.ndarray,
                   recipe: Recipe, masks: Dict[str, np.ndarray]) -> np.ndarray:
    h, w = alpha.shape
    rng = np.random.default_rng(seed=hash(recipe.id) & 0xFFFFFFFF)
    for acc in recipe.accents:
        kind = acc["kind"]
        region = acc.get("region")
        mask = masks.get(region, alpha) if region else alpha
        color = np.array(acc.get("color", (255, 255, 255)), dtype=np.float32) / 255.0
        if kind == "liquid":
            ys, xs = np.where(mask > 0.5)
            if len(ys) == 0:
                continue
            y_top, y_bot = ys.min(), ys.max()
            cut = y_bot - (y_bot - y_top) * acc.get("level", 0.7)
            band = (np.arange(h)[:, None] >= cut).astype(np.float32) * mask
            if acc.get("meniscus"):
                # subtle horizontal lighter line at the surface
                band_top = ((np.arange(h)[:, None] >= cut - 4) &
                            (np.arange(h)[:, None] <= cut + 1)).astype(np.float32) * mask
                rgb = rgb + band_top[..., None] * (np.clip(color * 1.25, 0, 1) - rgb) * 0.6
            rgb = rgb * (1 - band[..., None] * 0.92) + color * (band[..., None] * 0.92)
            if acc.get("glow"):
                glow = ndimage.gaussian_filter(band, sigma=8)
                rgb = np.clip(rgb + glow[..., None] * color * 0.35, 0, 1)
        elif kind == "bubbles":
            ys, xs = np.where(mask > 0.6)
            if len(ys) == 0:
                continue
            for _ in range(acc.get("count", 5)):
                idx = rng.integers(0, len(ys))
                y, x = ys[idx], xs[idx]
                r = rng.integers(3, 7)
                yy, xx = np.ogrid[:h, :w]
                d = (yy - y) ** 2 + (xx - x) ** 2
                bub = (d <= r * r).astype(np.float32) * mask
                rgb = np.clip(rgb + bub[..., None] * (color - rgb) * 0.55, 0, 1)
        elif kind == "runes":
            # short carved horizontal/vertical strokes scattered along the region
            ys, xs = np.where(mask > 0.6)
            if len(ys) == 0:
                continue
            for _ in range(acc.get("count", 4)):
                idx = rng.integers(0, len(ys))
                y, x = ys[idx], xs[idx]
                length = rng.integers(8, 18)
                horiz = bool(rng.integers(0, 2))
                yy, xx = np.ogrid[:h, :w]
                if horiz:
                    rune = ((np.abs(yy - y) <= 1) & (np.abs(xx - x) <= length)).astype(np.float32) * mask
                else:
                    rune = ((np.abs(xx - x) <= 1) & (np.abs(yy - y) <= length)).astype(np.float32) * mask
                rgb = rgb * (1 - rune[..., None] * 0.85) + color * (rune[..., None] * 0.85)
        elif kind in ("orb_glow", "gem_facet_shine"):
            ys, xs = np.where(mask > 0.5)
            if len(ys) == 0:
                continue
            cy, cx = ys.mean(), xs.mean()
            yy, xx = np.ogrid[:h, :w]
            d = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2)
            glow = np.exp(-(d / 40) ** 2) * mask
            rgb = np.clip(rgb + glow[..., None] * (color - rgb) * 0.6, 0, 1)
        elif kind == "emboss":
            # darken near edges of the region — adds a subtle stamped pattern
            inner = ndimage.binary_erosion((mask > 0.5), iterations=18).astype(np.float32)
            band = (mask - inner) * mask
            rgb = rgb * (1 - band[..., None] * 0.35)
    return rgb


# ── PASS 1 — Ambient Occlusion ─────────────────────────────────────────────

def pass_ao(rgb: np.ndarray, alpha: np.ndarray, strength: float = 0.55) -> np.ndarray:
    """Inner-edge darkening: dilate the alpha mask, blur, subtract."""
    a = (alpha > 0.05).astype(np.float32)
    eroded = ndimage.binary_erosion(a, iterations=3).astype(np.float32)
    inner_edge = a - eroded
    occ = ndimage.gaussian_filter(inner_edge, sigma=6) * alpha
    occ = np.clip(occ * strength, 0, 1)
    return rgb * (1 - occ[..., None])


# ── PASS 2 — Directional Shading 45° ───────────────────────────────────────

def pass_shading(rgb: np.ndarray, alpha: np.ndarray, angle_deg: float = 45.0,
                 strength: float = 0.40) -> np.ndarray:
    """Approximate normals from the alpha distance-transform gradient, dot
    with the light direction, modulate brightness."""
    dist = ndimage.distance_transform_edt(alpha > 0.05).astype(np.float32)
    dist = ndimage.gaussian_filter(dist, sigma=3)
    gy, gx = np.gradient(dist)
    n = np.sqrt(gx ** 2 + gy ** 2) + 1e-6
    gx /= n; gy /= n
    rad = np.deg2rad(angle_deg)
    lx, ly = np.cos(rad), -np.sin(rad)   # screen y is flipped
    dot = gx * lx + gy * ly              # +1 facing light, -1 away
    shade = dot * (alpha > 0.05).astype(np.float32)
    # split into highlight + shadow
    hi = np.clip(shade,  0, 1) * strength * 0.8
    lo = np.clip(-shade, 0, 1) * strength
    rgb = rgb + hi[..., None] * (1 - rgb) * 0.6
    rgb = rgb * (1 - lo[..., None] * 0.85)
    return np.clip(rgb, 0, 1)


# ── PASS 3 — Rim Light ─────────────────────────────────────────────────────

def pass_rim(rgb: np.ndarray, alpha: np.ndarray, angle_deg: float = 45.0,
             color=GOLD_LIGHT, strength: float = 0.85) -> np.ndarray:
    """Bright outer edge facing the light direction."""
    a = (alpha > 0.05).astype(np.float32)
    edge = a - ndimage.binary_erosion(a, iterations=2).astype(np.float32)
    edge = ndimage.gaussian_filter(edge, sigma=1.2)
    # mask edge by light-facing direction
    dist = ndimage.distance_transform_edt(a).astype(np.float32)
    dist = ndimage.gaussian_filter(dist, sigma=2)
    gy, gx = np.gradient(dist)
    n = np.sqrt(gx ** 2 + gy ** 2) + 1e-6
    gx /= n; gy /= n
    rad = np.deg2rad(angle_deg)
    lx, ly = np.cos(rad), -np.sin(rad)
    facing = np.clip(gx * lx + gy * ly, 0, 1)
    rim = edge * facing * strength
    c = np.array(color, dtype=np.float32) / 255.0
    return np.clip(rgb + rim[..., None] * (c - rgb), 0, 1)


# ── PASS 4 — Specular Highlights ───────────────────────────────────────────

def pass_specular(rgb: np.ndarray, alpha: np.ndarray, material: str = "matte") -> np.ndarray:
    """Add small bright hotspots on the most light-facing convex regions."""
    intensity = {"matte": 0.25, "leather": 0.30, "wood": 0.30,
                 "metal": 0.75, "glass": 0.85}.get(material, 0.35)
    a = (alpha > 0.05).astype(np.float32)
    dist = ndimage.distance_transform_edt(a).astype(np.float32)
    dist = ndimage.gaussian_filter(dist, sigma=2)
    gy, gx = np.gradient(dist)
    n = np.sqrt(gx ** 2 + gy ** 2) + 1e-6
    gx /= n; gy /= n
    rad = np.deg2rad(45)
    lx, ly = np.cos(rad), -np.sin(rad)
    dot = np.clip(gx * lx + gy * ly, 0, 1)
    # narrow to "peak" facing (raise to a power)
    spec = (dot ** 6) * (dist > 6).astype(np.float32) * a
    spec *= intensity
    spec = ndimage.gaussian_filter(spec, sigma=1.2)
    white = np.ones_like(rgb)
    return np.clip(rgb + spec[..., None] * (white - rgb), 0, 1)


# ── PASS 5 — Grain ─────────────────────────────────────────────────────────

def pass_grain(rgb: np.ndarray, alpha: np.ndarray, seed: int = 0,
               strength: float = 0.045) -> np.ndarray:
    rng = np.random.default_rng(seed)
    noise = rng.standard_normal(rgb.shape[:2]).astype(np.float32)
    noise = ndimage.gaussian_filter(noise, sigma=0.6)
    return np.clip(rgb + noise[..., None] * strength * (alpha[..., None] * 0.6 + 0.4), 0, 1)


# ── PASS 6 — Rarity Halo ───────────────────────────────────────────────────

def pass_halo(rgb: np.ndarray, alpha: np.ndarray, rarity: str = "common",
              sparkles: bool = False, seed: int = 0) -> Tuple[np.ndarray, np.ndarray]:
    """Paint a radial background tinted by rarity behind the silhouette.
    Returns (rgb_with_bg, alpha_with_bg=1.0 everywhere — the cartouche fills
    the rest)."""
    h, w = alpha.shape
    yy, xx = np.ogrid[:h, :w]
    cy, cx = h / 2, w / 2
    d = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2) / (max(h, w) / 2)

    tint = np.array(RARITY_TINTS.get(rarity, RARITY_TINTS["common"]),
                    dtype=np.float32) / 255.0
    bg_base = np.array(PAPER_BG, dtype=np.float32) / 255.0
    # painted dark background, lifted in the center toward the tint
    radial = np.exp(-(d * 1.6) ** 2)
    bg = bg_base[None, None, :] + radial[..., None] * (tint - bg_base) * 0.35

    # mild oil-paint warble — low-freq noise
    rng = np.random.default_rng(seed + 17)
    warble = ndimage.gaussian_filter(rng.standard_normal((h, w)).astype(np.float32), sigma=18)
    bg = np.clip(bg + warble[..., None] * 0.02, 0, 1)

    # rarity-tier halo ring for rare+
    if rarity in ("rare", "epic", "legendary"):
        ring = np.exp(-((d - 0.42) * 6) ** 2) * 0.22
        bg = np.clip(bg + ring[..., None] * tint, 0, 1)

    if sparkles:
        rng2 = np.random.default_rng(seed + 99)
        for _ in range(22):
            sy = rng2.integers(20, h - 20)
            sx = rng2.integers(20, w - 20)
            sr = rng2.integers(1, 3)
            yy2, xx2 = np.ogrid[:h, :w]
            sp = (((yy2 - sy) ** 2 + (xx2 - sx) ** 2) <= sr * sr).astype(np.float32)
            sp = ndimage.gaussian_filter(sp, sigma=1.0)
            bg = np.clip(bg + sp[..., None] *
                         np.array([1.0, 0.92, 0.65], dtype=np.float32) * 0.6, 0, 1)

    a3 = alpha[..., None]
    composed = bg * (1 - a3) + rgb * a3
    return composed, np.ones_like(alpha)


# ── PASS 7 — Cartouche Frame ───────────────────────────────────────────────

def pass_cartouche(rgb: np.ndarray, size: int = RENDER_SIZE) -> np.ndarray:
    """Gold double-frame border, painterly (no perfect 1px lines — the
    border is drawn into the pixel buffer so it survives downsampling)."""
    h, w = rgb.shape[:2]
    out = rgb.copy()
    gold = np.array(GOLD, dtype=np.float32) / 255.0
    gold_light = np.array(GOLD_LIGHT, dtype=np.float32) / 255.0
    gold_dark = np.array(GOLD_DARK, dtype=np.float32) / 255.0

    # outer thick frame
    t1 = max(4, size // 64)            # ~8px at 512
    out[:t1, :] = gold
    out[-t1:, :] = gold
    out[:, :t1] = gold
    out[:, -t1:] = gold
    # bevel: inside edge of the outer frame brightened, outside darkened
    out[t1:t1+2, t1:-t1] = gold_light
    out[t1:-t1, t1:t1+2] = gold_light
    out[-t1-2:-t1, t1:-t1] = gold_dark
    out[t1:-t1, -t1-2:-t1] = gold_dark

    # inner thin frame
    g = max(6, size // 32)             # gap from outer
    t2 = max(2, size // 256)
    a, b = t1 + g, h - t1 - g
    out[a:a+t2, a:b] = gold_dark
    out[b-t2:b, a:b] = gold_dark
    out[a:b, a:a+t2] = gold_dark
    out[a:b, b-t2:b] = gold_dark

    # corner ornaments (tiny gold diamonds)
    cs = max(6, size // 42)
    diamond = ((np.abs(np.arange(-cs, cs+1))[None, :] +
                np.abs(np.arange(-cs, cs+1))[:, None]) <= cs)[..., None]
    for (cy, cx) in [(a, a), (a, b), (b, a), (b, b)]:
        patch = out[cy-cs:cy+cs+1, cx-cs:cx+cs+1]
        out[cy-cs:cy+cs+1, cx-cs:cx+cs+1] = np.where(diamond, gold_light, patch)
    return out


# ── pipeline ───────────────────────────────────────────────────────────────

def render(recipe: Recipe) -> Image.Image:
    """Run the full pipeline. Returns a 512×512 RGBA PIL image."""
    svg = _build_silhouette_svg(recipe)
    masks = _region_masks(svg, RENDER_SIZE)
    rgb, alpha = _flat_compose(recipe, masks)

    rgb = _apply_accents(rgb, alpha, recipe, masks)

    rgb = pass_ao(rgb, alpha)
    rgb = pass_shading(rgb, alpha, angle_deg=recipe.light_angle)
    rgb = pass_rim(rgb, alpha, angle_deg=recipe.light_angle)
    rgb = pass_specular(rgb, alpha, material=recipe.material)
    rgb = pass_grain(rgb, alpha, seed=hash(recipe.id) & 0xFFFF)
    rgb, alpha = pass_halo(rgb, alpha, rarity=recipe.rarity,
                           sparkles=recipe.sparkles,
                           seed=hash(recipe.id) & 0xFFFF)
    rgb = pass_cartouche(rgb, size=RENDER_SIZE)

    rgba = np.dstack([np.clip(rgb, 0, 1), alpha])
    rgba8 = (rgba * 255 + 0.5).astype(np.uint8)
    return Image.fromarray(rgba8, mode="RGBA")


def render_mipmaps(recipe: Recipe) -> Dict[int, Image.Image]:
    big = render(recipe)
    out: Dict[int, Image.Image] = {RENDER_SIZE: big}
    for s in MIPMAPS:
        out[s] = big.resize((s, s), Image.Resampling.LANCZOS)
    return out


def save_all(recipe: Recipe, out_dir: str = OUT_DIR) -> List[str]:
    os.makedirs(out_dir, exist_ok=True)
    paths: List[str] = []
    mipmaps = render_mipmaps(recipe)
    for size, img in mipmaps.items():
        if size == RENDER_SIZE:
            continue   # skip work-res; we only ship the mipmaps
        p = os.path.join(out_dir, f"{recipe.id}_{size}.png")
        img.save(p, "PNG", optimize=True)
        paths.append(p)
    # also save a "default" 64 alias for the comparison page
    return paths


# ── CLI ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ids", nargs="*", help="recipe ids to render")
    parser.add_argument("--all", action="store_true", help="render every recipe")
    parser.add_argument("--list", action="store_true", help="list known recipes")
    parser.add_argument("--out", default=OUT_DIR, help="output directory")
    args = parser.parse_args()

    if args.list:
        for r in RECIPES.values():
            print(f"  {r.id:24s} {r.rarity:10s} {r.name}")
        return

    if args.all:
        ids = list(RECIPES.keys())
    else:
        ids = args.ids or list(RECIPES.keys())

    for rid in ids:
        if rid not in RECIPES:
            print(f"!! unknown recipe: {rid}", file=sys.stderr)
            continue
        print(f"→ rendering {rid} ({RECIPES[rid].rarity}) …")
        paths = save_all(RECIPES[rid], out_dir=args.out)
        for p in paths:
            print(f"   wrote {os.path.relpath(p)}")
    print("done.")


if __name__ == "__main__":
    main()
