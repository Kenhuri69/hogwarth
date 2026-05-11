"""
shapes.py — Parametric shape primitives for the Poudlard & Magie icon pipeline.

Each builder returns an SVG string in a 512x512 viewBox, black silhouette on
transparent background, with `data-region` attributes so icon_factory can
color sub-regions independently.

Pure-string SVG is intentional: cairosvg rasterizes it, and the recipe layer
stays language-agnostic (a recipe can swap between an SVG part file and a
parametric shape with identical downstream handling).
"""

from __future__ import annotations
from typing import Iterable


# ── helpers ────────────────────────────────────────────────────────────────

def _svg(body: str) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
        f'<g fill="#000000">{body}</g></svg>'
    )


def _path(d: str, region: str = "body") -> str:
    return f'<path data-region="{region}" d="{d}"/>'


# ── primitives ─────────────────────────────────────────────────────────────

def ring_band(
    radius: float = 170,
    thickness: float = 32,
    cx: float = 256,
    cy: float = 296,
    bezel: bool = True,
    gem: bool = False,
) -> str:
    """A finger-ring band. `bezel` adds a flat top mount; `gem` puts a
    lozenge stone on the bezel."""
    r_out, r_in = radius, radius - thickness
    band = (
        f'M {cx - r_out} {cy} A {r_out} {r_out} 0 1 0 {cx + r_out} {cy} '
        f'A {r_out} {r_out} 0 1 0 {cx - r_out} {cy} '
        f'M {cx - r_in} {cy} A {r_in} {r_in} 0 1 1 {cx + r_in} {cy} '
        f'A {r_in} {r_in} 0 1 1 {cx - r_in} {cy} Z'
    )
    parts = [f'<path data-region="metal" fill-rule="evenodd" d="{band}"/>']
    if bezel:
        bw = thickness * 1.8
        bh = thickness * 1.1
        by = cy - r_out - bh + 2
        parts.append(
            _path(
                f'M {cx - bw/2} {by + bh} L {cx - bw/2 - 6} {by} '
                f'L {cx + bw/2 + 6} {by} L {cx + bw/2} {by + bh} Z',
                region="metal",
            )
        )
    if gem:
        gx = cx
        gy = cy - r_out - thickness * 0.55
        s = thickness * 0.9
        parts.append(
            _path(
                f'M {gx} {gy - s} L {gx + s} {gy} L {gx} {gy + s} L {gx - s} {gy} Z',
                region="gem",
            )
        )
    return _svg("".join(parts))


def gem_lozenge(
    width: float = 240,
    height: float = 320,
    cx: float = 256,
    cy: float = 256,
    facets: bool = True,
) -> str:
    """A faceted lozenge / diamond gem, oriented vertically."""
    hw, hh = width / 2, height / 2
    body = _path(
        f'M {cx} {cy - hh} L {cx + hw} {cy} L {cx} {cy + hh} L {cx - hw} {cy} Z',
        region="gem",
    )
    facet_paths = ""
    if facets:
        # crown ridges (purely silhouette-detail; coloring happens at the pass)
        facet_paths = _path(
            f'M {cx - hw*0.45} {cy - hh*0.35} L {cx + hw*0.45} {cy - hh*0.35} '
            f'L {cx} {cy + hh*0.05} Z',
            region="gem_facet",
        )
    return _svg(body + facet_paths)


def bottle_round(
    bulb_r: float = 150,
    neck_w: float = 70,
    neck_h: float = 120,
    stopper_h: float = 60,
    cx: float = 256,
    base_y: float = 504,
) -> str:
    """A round-bottomed potion bottle. Compose-friendly with flask.svg but
    fully parametric — useful when the recipe needs a slimmer or fatter
    silhouette than the SVG asset."""
    bulb_cy = base_y - bulb_r
    neck_top = bulb_cy - bulb_r - 4
    stopper_top = neck_top - stopper_h
    parts = []
    # bulb
    parts.append(_path(
        f'M {cx - bulb_r} {bulb_cy} '
        f'A {bulb_r} {bulb_r} 0 1 0 {cx + bulb_r} {bulb_cy} '
        f'A {bulb_r} {bulb_r} 0 1 0 {cx - bulb_r} {bulb_cy} Z',
        region="body",
    ))
    # neck
    parts.append(_path(
        f'M {cx - neck_w/2} {neck_top + neck_h} '
        f'L {cx - neck_w/2} {neck_top} '
        f'L {cx + neck_w/2} {neck_top} '
        f'L {cx + neck_w/2} {neck_top + neck_h} Z',
        region="body",
    ))
    # collar
    cw = neck_w + 16
    parts.append(_path(
        f'M {cx - cw/2} {neck_top} L {cx + cw/2} {neck_top} '
        f'L {cx + cw/2} {neck_top + 16} L {cx - cw/2} {neck_top + 16} Z',
        region="stopper",
    ))
    # stopper
    sw = neck_w + 24
    parts.append(_path(
        f'M {cx - sw/2} {stopper_top} L {cx + sw/2} {stopper_top} '
        f'L {cx + sw/2 - 6} {neck_top} L {cx - sw/2 + 6} {neck_top} Z',
        region="stopper",
    ))
    return _svg("".join(parts))


def stick_shaft(
    length: float = 380,
    thickness: float = 28,
    taper: float = 0.55,
    cx: float = 256,
    top_y: float = 70,
    tip_region: str = "tip",
) -> str:
    """A wand or staff shaft with optional tip taper. The top is tagged
    `tip` so the recipe can color it differently (gem, glow, runic cap)."""
    tw = thickness * taper
    bottom_y = top_y + length
    parts = [
        _path(
            f'M {cx - tw/2} {top_y} L {cx + tw/2} {top_y} '
            f'L {cx + thickness/2} {bottom_y} L {cx - thickness/2} {bottom_y} Z',
            region="shaft",
        ),
        _path(
            f'M {cx - tw/2 - 4} {top_y - 12} L {cx + tw/2 + 4} {top_y - 12} '
            f'L {cx + tw/2} {top_y + 8} L {cx - tw/2} {top_y + 8} Z',
            region=tip_region,
        ),
        # pommel
        _path(
            f'M {cx - thickness/2 - 6} {bottom_y - 4} '
            f'L {cx + thickness/2 + 6} {bottom_y - 4} '
            f'L {cx + thickness/2 + 2} {bottom_y + 16} '
            f'L {cx - thickness/2 - 2} {bottom_y + 16} Z',
            region="pommel",
        ),
    ]
    return _svg("".join(parts))


def scroll_roll(
    width: float = 320,
    height: float = 360,
    cx: float = 256,
    cy: float = 256,
) -> str:
    """A vertical parchment scroll with curled top + bottom."""
    hw, hh = width / 2, height / 2
    curl_h = height * 0.12
    parts = [
        _path(
            f'M {cx - hw} {cy - hh + curl_h} L {cx + hw} {cy - hh + curl_h} '
            f'L {cx + hw} {cy + hh - curl_h} L {cx - hw} {cy + hh - curl_h} Z',
            region="paper",
        ),
        _path(
            f'M {cx - hw - 16} {cy - hh} L {cx + hw + 16} {cy - hh} '
            f'L {cx + hw} {cy - hh + curl_h} L {cx - hw} {cy - hh + curl_h} Z',
            region="curl",
        ),
        _path(
            f'M {cx - hw} {cy + hh - curl_h} L {cx + hw} {cy + hh - curl_h} '
            f'L {cx + hw + 16} {cy + hh} L {cx - hw - 16} {cy + hh} Z',
            region="curl",
        ),
    ]
    return _svg("".join(parts))


# ── registry ───────────────────────────────────────────────────────────────

SHAPES = {
    "ring_band": ring_band,
    "gem_lozenge": gem_lozenge,
    "bottle_round": bottle_round,
    "stick_shaft": stick_shaft,
    "scroll_roll": scroll_roll,
}


def build(name: str, **params) -> str:
    """Recipe-side entry point. Returns SVG string."""
    if name not in SHAPES:
        raise KeyError(f"Unknown shape '{name}'. Known: {list(SHAPES)}")
    return SHAPES[name](**params)


if __name__ == "__main__":
    # quick smoke test — write each primitive to tools/_smoke/<name>.svg
    import os
    out = os.path.join(os.path.dirname(__file__), "_smoke")
    os.makedirs(out, exist_ok=True)
    for name in SHAPES:
        with open(os.path.join(out, f"{name}.svg"), "w") as f:
            f.write(build(name))
    print(f"Wrote {len(SHAPES)} smoke SVGs to {out}")
