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
    # ── Chaîne de soin à paliers (P4) — niveau de liquide croissant ──
    "potion_soin_mineure": Recipe(
        id="potion_soin_mineure", name="Potion de Soin Mineure", rarity="common", material="glass",
        silhouette={"kind": "svg", "file": "flask.svg"},
        fills={"stopper": (118, 78, 42), "body": (172, 196, 208)},
        accents=[
            {"kind": "liquid", "region": "body", "color": (210, 80, 80), "level": 0.55, "meniscus": True},
        ],
    ),
    "potion_soin_mineure_plus": Recipe(
        id="potion_soin_mineure_plus", name="Potion de Soin Mineure +", rarity="uncommon", material="glass",
        silhouette={"kind": "svg", "file": "flask.svg"},
        fills={"stopper": (118, 78, 42), "body": (172, 196, 208)},
        accents=[
            {"kind": "liquid", "region": "body", "color": (220, 64, 64), "level": 0.70, "meniscus": True, "glow": True},
            {"kind": "bubbles", "region": "body", "color": (255, 150, 150), "count": 4},
        ],
    ),
    "potion_soin_mineure_pp": Recipe(
        id="potion_soin_mineure_pp", name="Potion de Soin Mineure ++", rarity="rare", material="glass",
        silhouette={"kind": "svg", "file": "flask.svg"},
        fills={"stopper": (118, 78, 42), "body": (172, 196, 208)},
        accents=[
            {"kind": "liquid", "region": "body", "color": (232, 48, 56), "level": 0.85, "meniscus": True, "glow": True},
            {"kind": "bubbles", "region": "body", "color": (255, 170, 170), "count": 6},
        ],
    ),
    # Ressource d'upgrade-craft des potions (gemme rouge-vie).
    "eclat_vitalite": Recipe(
        id="eclat_vitalite", name="Éclat de Vitalité", rarity="rare", material="glass",
        silhouette={"kind": "svg", "file": "gem-octahedron.svg"},
        fills={
            "gem":       (208,  48,  56),
            "gem_facet": (244, 132, 132),
            "gem_base":  (120,  24,  32),
        },
        accents=[
            {"kind": "gem_facet_shine", "region": "gem_facet", "color": (255, 210, 210)},
            {"kind": "orb_glow", "region": "gem", "color": (240, 90, 90)},
        ],
    ),
    "eclat_voute": Recipe(
        id="eclat_voute", name="Éclat de la Clé de Voûte", rarity="rare", material="glass",
        silhouette={"kind": "svg", "file": "shard.svg"},
        fills={
            "shard_body":  (180, 210, 240),   # bleu-blanc glacé, translucide
            "shard_facet": (220, 238, 255),   # plan de clivage plus clair, reflet givré
            "shard_tip":   ( 90, 140, 195),   # pointe plus sombre, plus dense
        },
        accents=[
            {"kind": "gem_facet_shine", "region": "shard_facet", "color": (245, 252, 255)},
            {"kind": "orb_glow",        "region": "shard_body",  "color": (200, 228, 255)},
            {"kind": "runes",           "region": "shard_body",  "color": ( 60, 110, 180),
             "count": 4, "around": "body"},
        ],
    ),
    # Codex Ch.12 — icône painterly de l'entrée-phare « La Clé de Voûte des
    # Quatre » (non-item : référencée par CODEX_ENTRIES via iconImg). Clé
    # gobeline d'or, gemme glacée des Fondateurs, runes gravées sur la tige.
    "cle_de_voute": Recipe(
        id="cle_de_voute", name="La Clé de Voûte des Quatre", rarity="legendary", material="metal",
        silhouette={"kind": "svg", "file": "key-voute.svg"},
        fills={
            "key_bow":   (201, 168,  76),     # or gobelin de l'anneau ouvragé
            "key_shaft": (170, 138,  60),     # tige, or plus sombre
            "key_bit":   (150, 120,  52),     # dents, métal patiné
            "key_gem":   (150, 200, 240),     # gemme glacée (le froid du verrou)
        },
        accents=[
            {"kind": "gem_facet_shine", "region": "key_gem",  "color": (224, 244, 255)},
            {"kind": "orb_glow",        "region": "key_gem",  "color": (190, 224, 255)},
            {"kind": "runes",           "region": "key_shaft", "color": ( 86,  62,  22),
             "count": 3, "around": "body"},
            {"kind": "emboss",          "region": "key_bow",  "color": ( 96,  70,  26)},
        ],
        sparkles=True,
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
            {"kind": "emboss", "region": "cover", "color": ( 30,  46,  76)},
            {"kind": "symbol", "region": "cover", "shape": "star",
             "color": (216, 188, 108), "size": 130},
        ],
    ),

    # ── Étape 7 — Mapping étendu ───────────────────────────────────────────

    # Potions / glass
    "potion_m": Recipe(
        id="potion_m", name="Potion Magique", rarity="common", material="glass",
        silhouette={"kind": "svg", "file": "flask.svg"},
        fills={"stopper": (118,  78,  42), "body": (172, 196, 208)},
        accents=[
            {"kind": "liquid", "region": "body", "color": (146,  92, 196),
             "level": 0.74, "meniscus": True, "glow": True},
            {"kind": "bubbles", "region": "body", "color": (220, 196, 255), "count": 4},
        ],
    ),
    "potion_force": Recipe(
        id="potion_force", name="Potion de Force", rarity="common", material="glass",
        silhouette={"kind": "svg", "file": "flask.svg"},
        fills={"stopper": (140,  92,  46), "body": (208, 184, 156)},
        accents=[
            {"kind": "liquid", "region": "body", "color": (216, 102,  44),
             "level": 0.70, "meniscus": True, "glow": True},
            {"kind": "bubbles", "region": "body", "color": (255, 200, 120), "count": 5},
        ],
    ),
    # Potions de buff de combat (P2) — flacons teintés par stat.
    "potion_defense": Recipe(
        id="potion_defense", name="Potion de Défense", rarity="common", material="glass",
        silhouette={"kind": "svg", "file": "flask.svg"},
        fills={"stopper": (140, 92, 46), "body": (200, 200, 184)},
        accents=[
            {"kind": "liquid", "region": "body", "color": (74, 134, 84), "level": 0.70, "meniscus": True, "glow": True},
            {"kind": "bubbles", "region": "body", "color": (150, 210, 160), "count": 5},
        ],
    ),
    "elixir_celerite": Recipe(
        id="elixir_celerite", name="Élixir de Célérité", rarity="common", material="glass",
        silhouette={"kind": "svg", "file": "flask.svg"},
        fills={"stopper": (140, 92, 46), "body": (190, 208, 210)},
        accents=[
            {"kind": "liquid", "region": "body", "color": (72, 178, 178), "level": 0.70, "meniscus": True, "glow": True},
            {"kind": "bubbles", "region": "body", "color": (170, 232, 232), "count": 6},
        ],
    ),
    "potion_precision": Recipe(
        id="potion_precision", name="Potion de Précision", rarity="common", material="glass",
        silhouette={"kind": "svg", "file": "flask.svg"},
        fills={"stopper": (140, 92, 46), "body": (198, 208, 188)},
        accents=[
            {"kind": "liquid", "region": "body", "color": (96, 172, 72), "level": 0.70, "meniscus": True, "glow": True},
            {"kind": "bubbles", "region": "body", "color": (180, 224, 150), "count": 5},
        ],
    ),
    "elixir_puissance": Recipe(
        id="elixir_puissance", name="Élixir de Puissance", rarity="common", material="glass",
        silhouette={"kind": "svg", "file": "flask.svg"},
        fills={"stopper": (140, 92, 46), "body": (200, 188, 212)},
        accents=[
            {"kind": "liquid", "region": "body", "color": (138, 74, 208), "level": 0.70, "meniscus": True, "glow": True},
            {"kind": "bubbles", "region": "body", "color": (200, 160, 240), "count": 6},
        ],
    ),
    "potion_resistance": Recipe(
        id="potion_resistance", name="Potion de Résistance", rarity="common", material="glass",
        silhouette={"kind": "svg", "file": "flask.svg"},
        fills={"stopper": (110,  84,  54), "body": (196, 206, 220)},
        accents=[
            {"kind": "liquid", "region": "body", "color": ( 74, 123, 166),
             "level": 0.70, "meniscus": True, "glow": True},
            {"kind": "bubbles", "region": "body", "color": (170, 206, 234), "count": 5},
        ],
    ),
    "larmes_phenix": Recipe(
        id="larmes_phenix", name="Larmes de Phénix", rarity="legendary", material="glass",
        silhouette={"kind": "svg", "file": "flask.svg"},
        fills={"stopper": (172, 120,  52), "body": (228, 212, 172)},
        accents=[
            {"kind": "liquid", "region": "body", "color": (240, 208, 128),
             "level": 0.82, "meniscus": True, "glow": True},
            {"kind": "bubbles", "region": "body", "color": (255, 240, 200), "count": 7},
        ],
        sparkles=True,
    ),

    # Wand
    "wand1": Recipe(
        id="wand1", name="Baguette de Saule", rarity="common", material="wood",
        silhouette={"kind": "svg", "file": "wizard-staff.svg"},
        fills={
            "shaft":  (132,  96,  56),
            "grip":   ( 84,  60,  36),
            "pommel": (156, 120,  72),
            "orb":    (208, 192, 144),
        },
        accents=[
            {"kind": "orb_glow", "region": "orb", "color": (240, 220, 160)},
        ],
    ),

    # Books — all use book-cover.svg, only colors change
    "livre_soin": Recipe(
        id="livre_soin", name="Potions & Remèdes Magiques", rarity="common", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": ( 56, 112,  78), "pages": (228, 210, 168),
               "spine": ( 32,  72,  48), "gilt":  (201, 168,  76)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": ( 22,  52,  36)},
            {"kind": "symbol", "region": "cover", "shape": "cross",
             "color": (216, 188, 108), "size": 120},
        ],
    ),
    "livre_ferula": Recipe(
        id="livre_ferula", name="Manuel du Soigneur de Champ", rarity="common", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": (170, 142,  96), "pages": (232, 220, 188),
               "spine": (120,  96,  60), "gilt":  (201, 168,  76)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": (120,  96,  60)},
            {"kind": "symbol", "region": "cover", "shape": "cross",
             "color": (236, 226, 210), "size": 120},
        ],
    ),
    "book_monsters": Recipe(
        id="book_monsters", name="Livre des Monstres", rarity="common", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": (108,  72,  44), "pages": (208, 184, 148),
               "spine": ( 72,  48,  28), "gilt":  (176, 124,  56)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": ( 56,  36,  20)},
            {"kind": "symbol", "region": "cover", "shape": "fang",
             "color": (224, 208, 172), "size": 130},
        ],
    ),
    "livre_prince": Recipe(
        id="livre_prince", name="Manuel du Demi-Sang", rarity="epic", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": ( 32,  32,  44), "pages": (208, 188, 156),
               "spine": ( 18,  18,  28), "gilt":  (192, 156,  72)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": ( 14,  14,  20)},
            {"kind": "symbol", "region": "cover", "shape": "moon",
             "color": (220, 196, 132), "size": 130},
        ],
    ),
    "livre_bombarda": Recipe(
        id="livre_bombarda", name="Traité de Magie Explosive", rarity="rare", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": (152,  60,  40), "pages": (228, 210, 168),
               "spine": (104,  36,  24), "gilt":  (220, 176,  72)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": ( 76,  24,  16)},
            {"kind": "symbol", "region": "cover", "shape": "flame",
             "color": (240, 200, 108), "size": 130},
        ],
    ),
    "livre_patronum": Recipe(
        id="livre_patronum", name="Guide du Patronus", rarity="rare", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": (220, 220, 232), "pages": (240, 224, 184),
               "spine": (172, 176, 192), "gilt":  (201, 168,  76)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": (152, 156, 172)},
            {"kind": "symbol", "region": "cover", "shape": "deer",
             "color": (180, 188, 208), "size": 130},
        ],
    ),
    "livre_glacius": Recipe(
        id="livre_glacius", name="Givre & Engelures", rarity="rare", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": ( 40,  86, 140), "pages": (224, 232, 240),
               "spine": ( 26,  58,  98), "gilt":  (150, 200, 232)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": ( 20,  44,  76)},
            {"kind": "symbol", "region": "cover", "shape": "snowflake",
             "color": (228, 244, 255), "size": 130},
        ],
    ),
    "livre_fulgari": Recipe(
        id="livre_fulgari", name="Foudre Canalisée", rarity="rare", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": ( 36,  42,  78), "pages": (228, 210, 168),
               "spine": ( 22,  26,  52), "gilt":  (224, 188,  84)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": ( 16,  20,  40)},
            {"kind": "symbol", "region": "cover", "shape": "lightning",
             "color": (255, 228, 108), "size": 130},
        ],
    ),
    "livre_lumos_solem": Recipe(
        id="livre_lumos_solem", name="Lumière Solaire", rarity="rare", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": (214, 158,  52), "pages": (244, 228, 184),
               "spine": (150, 104,  28), "gilt":  (255, 224, 128)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": (140,  96,  24)},
            {"kind": "symbol", "region": "cover", "shape": "sun",
             "color": (255, 240, 168), "size": 132},
        ],
    ),
    "livre_sanguini": Recipe(
        id="livre_sanguini", name="Traité du Sang Vivant", rarity="rare", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": (120,  20,  28), "pages": (208, 188, 152),
               "spine": ( 80,  12,  18), "gilt":  (180, 132,  48)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": ( 60,   8,  12)},
            {"kind": "symbol", "region": "cover", "shape": "drop",
             "color": (224, 168,  88), "size": 120},
        ],
    ),
    "livre_vampyrus": Recipe(
        id="livre_vampyrus", name="Codex des Strigoï", rarity="epic", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": ( 36,  24,  44), "pages": (200, 180, 148),
               "spine": ( 22,  14,  30), "gilt":  (180, 152, 196)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": ( 16,  10,  22)},
            {"kind": "symbol", "region": "cover", "shape": "bat",
             "color": (216, 188, 224), "size": 140},
        ],
    ),
    "livre_taranta": Recipe(
        id="livre_taranta", name="Pas de la Sorcière Maudite", rarity="common", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": (100,  56, 124), "pages": (228, 210, 168),
               "spine": ( 64,  32,  84), "gilt":  (192, 156,  72)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": ( 44,  20,  60)},
            {"kind": "symbol", "region": "cover", "shape": "snake",
             "color": (216, 188, 108), "size": 140},
        ],
    ),
    "livre_maledictus": Recipe(
        id="livre_maledictus", name="Grimoire des Maudits", rarity="rare", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": ( 56,  28,  76), "pages": (208, 188, 152),
               "spine": ( 32,  16,  52), "gilt":  (164, 128, 196)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": ( 24,  12,  40)},
            {"kind": "symbol", "region": "cover", "shape": "eye",
             "color": (208, 172, 224), "size": 130},
        ],
    ),
    "livre_crucio": Recipe(
        id="livre_crucio", name="Sortilèges Impardonnables, T.II", rarity="epic", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": ( 26,  20,  20), "pages": (200, 180, 148),
               "spine": ( 14,  10,  10), "gilt":  (180,  48,  44)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": ( 10,   6,   6)},
            {"kind": "symbol", "region": "cover", "shape": "lightning",
             "color": (224,  88,  72), "size": 130},
        ],
    ),
    "livre_morsmordre": Recipe(
        id="livre_morsmordre", name="Marque des Ténèbres", rarity="epic", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": ( 20,  20,  24), "pages": (200, 180, 148),
               "spine": ( 10,  10,  14), "gilt":  ( 80, 188, 120)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": (  8,   8,  12)},
            {"kind": "symbol", "region": "cover", "shape": "skull",
             "color": (140, 224, 168), "size": 130},
        ],
    ),

    # Grimoires de zone (AoE) — variantes épiques des livres de base :
    # même emblème, teintes plus profondes, halo de rareté supérieur.
    "livre_glacius_tempete": Recipe(
        id="livre_glacius_tempete", name="Tempête de Givre", rarity="epic", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": ( 24,  58, 108), "pages": (224, 232, 240),
               "spine": ( 14,  38,  76), "gilt":  (180, 222, 248)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": ( 12,  30,  58)},
            {"kind": "symbol", "region": "cover", "shape": "snowflake",
             "color": (238, 250, 255), "size": 132},
        ],
    ),
    "livre_fulgur_catena": Recipe(
        id="livre_fulgur_catena", name="Chaîne de Foudre", rarity="epic", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": ( 22,  26,  56), "pages": (228, 210, 168),
               "spine": ( 12,  14,  34), "gilt":  (245, 210, 110)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": (  8,  10,  24)},
            {"kind": "symbol", "region": "cover", "shape": "lightning",
             "color": (255, 236, 128), "size": 134},
        ],
    ),
    "livre_lux_aeterna": Recipe(
        id="livre_lux_aeterna", name="Lumière Éternelle", rarity="epic", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": (190, 134,  36), "pages": (244, 228, 184),
               "spine": (124,  84,  16), "gilt":  (255, 236, 150)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": (118,  78,  16)},
            {"kind": "symbol", "region": "cover", "shape": "sun",
             "color": (255, 244, 188), "size": 134},
        ],
    ),
    "livre_nox_vorax": Recipe(
        id="livre_nox_vorax", name="Nuit Dévorante", rarity="epic", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": ( 28,  16,  40), "pages": (200, 180, 148),
               "spine": ( 16,   8,  26), "gilt":  (164, 128, 200)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": ( 10,   6,  16)},
            {"kind": "symbol", "region": "cover", "shape": "bat",
             "color": (206, 174, 224), "size": 142},
        ],
    ),
    "livre_diffindo_maxima": Recipe(
        id="livre_diffindo_maxima", name="Lames Tourbillonnantes", rarity="epic", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": ( 58,  50,  54), "pages": (208, 184, 148),
               "spine": ( 34,  28,  32), "gilt":  (198, 110,  84)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": ( 24,  20,  22)},
            {"kind": "symbol", "region": "cover", "shape": "fang",
             "color": (240, 224, 208), "size": 136},
        ],
    ),
    "livre_vulnera": Recipe(
        id="livre_vulnera", name="Vulnera Sanentur", rarity="epic", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": ( 32,  86,  56), "pages": (228, 222, 196),
               "spine": ( 18,  54,  34), "gilt":  (236, 206, 120)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": ( 14,  44,  28)},
            {"kind": "symbol", "region": "cover", "shape": "cross",
             "color": (244, 234, 206), "size": 126},
        ],
    ),

    # Amulets / pendants
    "amulette": Recipe(
        id="amulette", name="Amulette du Phénix", rarity="rare", material="metal",
        silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={"chain": (180, 148,  72), "bezel": (201, 168,  76),
               "gem":   (216,  64,  48)},
        accents=[
            {"kind": "gem_facet_shine", "region": "gem", "color": (255, 180, 120)},
        ],
    ),
    "amulette_protection": Recipe(
        id="amulette_protection", name="Amulette de Protection", rarity="common", material="metal",
        silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={"chain": (172, 176, 188), "bezel": (192, 196, 208),
               "gem":   ( 80, 148, 192)},
        accents=[
            {"kind": "gem_facet_shine", "region": "gem", "color": (200, 230, 255)},
        ],
    ),
    "locket_slytherin": Recipe(
        id="locket_slytherin", name="Médaillon de Serpentard", rarity="legendary", material="metal",
        silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={"chain": (180, 184, 196), "bezel": (172, 176, 188),
               "gem":   ( 28, 108,  60)},
        accents=[
            {"kind": "gem_facet_shine", "region": "gem", "color": (120, 220, 160)},
            {"kind": "orb_glow", "region": "gem", "color": ( 80, 200, 140)},
        ],
        sparkles=True,
    ),

    # Cloaks / robes (use hood.svg)
    "robe1": Recipe(
        id="robe1", name="Robe Renforcée", rarity="common", material="matte",
        silhouette={"kind": "svg", "file": "hood.svg"},
        fills={"cloth": ( 48,  68, 108), "lining": ( 28,  44,  76),
               "clasp": (201, 168,  76)},
        accents=[{"kind": "emboss", "region": "cloth", "color": ( 24,  36,  60)}],
    ),
    "cape_voyageur": Recipe(
        id="cape_voyageur", name="Cape du Voyageur", rarity="common", material="matte",
        silhouette={"kind": "svg", "file": "hood.svg"},
        fills={"cloth": (108,  76,  48), "lining": ( 68,  44,  28),
               "clasp": (152, 124,  72)},
        accents=[{"kind": "emboss", "region": "cloth", "color": ( 56,  36,  20)}],
    ),
    "cape_invis": Recipe(
        id="cape_invis", name="Cape d'Invisibilité", rarity="legendary", material="matte",
        silhouette={"kind": "svg", "file": "hood.svg"},
        fills={"cloth": (200, 208, 220), "lining": (148, 156, 172),
               "clasp": (208, 196, 232)},
        accents=[
            {"kind": "emboss", "region": "cloth", "color": (124, 132, 148)},
            {"kind": "orb_glow", "region": "cloth", "color": (220, 232, 255)},
        ],
        sparkles=True,
    ),

    # Rings (parametric shape ring_band)
    "anneau_argent": Recipe(
        id="anneau_argent", name="Anneau d'Argent", rarity="common", material="metal",
        silhouette={"kind": "shape", "name": "ring_band",
                    "params": {"radius": 165, "thickness": 48,
                               "bezel": True, "gem": True}},
        fills={"metal": (196, 200, 212), "gem": (148, 152, 168)},
        accents=[
            {"kind": "runes", "region": "metal", "color": (108, 112, 128),
             "count": 8, "around": "ring"},
            {"kind": "gem_facet_shine", "region": "gem", "color": (232, 236, 248)},
            {"kind": "emboss", "region": "metal", "color": ( 96, 100, 116)},
        ],
    ),
    "anneau_resurrection": Recipe(
        id="anneau_resurrection", name="Pierre de Résurrection", rarity="epic", material="metal",
        silhouette={"kind": "shape", "name": "ring_band",
                    "params": {"radius": 175, "thickness": 38, "bezel": True, "gem": True}},
        fills={"metal": ( 88,  72,  52), "gem":   ( 32,  32,  40)},
        accents=[
            {"kind": "runes", "region": "metal", "color": ( 48,  36,  24),
             "count": 6, "around": "ring"},
            {"kind": "gem_facet_shine", "region": "gem", "color": (180, 156, 220)},
            {"kind": "orb_glow", "region": "gem", "color": (140, 100, 200)},
        ],
    ),

    # Sword
    "sword_gryff": Recipe(
        id="sword_gryff", name="Épée de Gryffondor", rarity="legendary", material="metal",
        silhouette={"kind": "svg", "file": "sword.svg"},
        fills={"blade":  (212, 220, 232), "guard":  (201, 168,  76),
               "hilt":   ( 96,  20,  20), "pommel": (212,  60,  56)},
        accents=[
            {"kind": "runes", "region": "blade", "color": (152, 160, 176), "count": 4},
            {"kind": "gem_facet_shine", "region": "pommel", "color": (255, 180, 160)},
            {"kind": "orb_glow", "region": "pommel", "color": (240, 120,  80)},
        ],
        sparkles=True,
    ),

    # Broom
    "broom": Recipe(
        id="broom", name="Balai Nimbus 2000", rarity="rare", material="wood",
        silhouette={"kind": "svg", "file": "broom.svg"},
        fills={"handle":   (124,  84,  44), "binding": (192, 140,  56),
               "bristles": (172, 124,  68), "tip":     (216, 184,  96)},
        accents=[
            {"kind": "runes", "region": "handle", "color": (216, 184,  96), "count": 3},
        ],
    ),

    # Boots
    "bottes_apprenti": Recipe(
        id="bottes_apprenti", name="Bottes d'Apprenti", rarity="common", material="leather",
        silhouette={"kind": "svg", "file": "boot.svg"},
        fills={"shaft": (124,  88,  56), "foot":  (108,  72,  40),
               "sole":  ( 56,  36,  20), "lace":  (208, 184, 132)},
        accents=[{"kind": "emboss", "region": "shaft", "color": ( 64,  44,  24)}],
    ),
    "bottes_dragon": Recipe(
        id="bottes_dragon", name="Bottes en Peau de Dragon", rarity="rare", material="leather",
        silhouette={"kind": "svg", "file": "boot.svg"},
        fills={"shaft": ( 40,  44,  48), "foot":  ( 28,  32,  36),
               "sole":  ( 12,  16,  20), "lace":  (180,  60,  44)},
        accents=[
            {"kind": "emboss", "region": "shaft", "color": ( 16,  20,  24)},
            {"kind": "runes", "region": "shaft", "color": (200,  80,  56), "count": 3},
        ],
    ),

    # Gloves
    "gants_apprenti": Recipe(
        id="gants_apprenti", name="Gants d'Apprenti", rarity="common", material="leather",
        silhouette={"kind": "svg", "file": "glove.svg"},
        fills={"cuff":    ( 84,  56,  32), "palm":    (116,  80,  48),
               "fingers": (108,  72,  40), "stitch":  (208, 180, 132)},
        accents=[{"kind": "emboss", "region": "palm", "color": ( 60,  40,  20)}],
    ),

    # Belts
    "ceinture_cuir": Recipe(
        id="ceinture_cuir", name="Ceinture de Cuir", rarity="common", material="leather",
        silhouette={"kind": "svg", "file": "belt.svg"},
        fills={"strap":  (108,  72,  40), "buckle": (180, 184, 196),
               "holes":  ( 56,  36,  20), "tongue": (172, 176, 188)},
        accents=[{"kind": "emboss", "region": "strap", "color": ( 64,  44,  24)}],
    ),
    "ceinture_alchimiste": Recipe(
        id="ceinture_alchimiste", name="Ceinture d'Alchimiste", rarity="rare", material="leather",
        silhouette={"kind": "svg", "file": "belt.svg"},
        fills={"strap":  ( 88,  56,  32), "buckle": (201, 168,  76),
               "holes":  ( 48,  28,  12), "tongue": (176, 144,  64)},
        accents=[
            {"kind": "emboss", "region": "strap", "color": ( 52,  32,  16)},
            {"kind": "runes", "region": "strap", "color": (216, 184,  96), "count": 4},
        ],
    ),

    # Pointy hats
    "chapeau_apprenti": Recipe(
        id="chapeau_apprenti", name="Chapeau d'Apprenti", rarity="common", material="matte",
        silhouette={"kind": "svg", "file": "hat-pointy.svg"},
        fills={"cone":   ( 44,  56,  88), "brim":   ( 28,  40,  68),
               "band":   ( 64,  44,  20), "buckle": (180, 156,  88)},
        accents=[{"kind": "emboss", "region": "cone", "color": ( 24,  32,  56)}],
    ),
    "chapeau_pointu": Recipe(
        id="chapeau_pointu", name="Chapeau de Serdaigle", rarity="rare", material="matte",
        silhouette={"kind": "svg", "file": "hat-pointy.svg"},
        fills={"cone":   ( 36,  60, 104), "brim":   ( 20,  40,  76),
               "band":   (140, 108,  56), "buckle": (216, 184,  96)},
        accents=[
            {"kind": "emboss", "region": "cone", "color": ( 16,  32,  64)},
            {"kind": "gem_facet_shine", "region": "buckle", "color": (255, 220, 140)},
        ],
    ),

    # Tiaras / circlets
    "circlet_serdaigle": Recipe(
        id="circlet_serdaigle", name="Bandeau de Serdaigle", rarity="common", material="metal",
        silhouette={"kind": "svg", "file": "tiara.svg"},
        fills={"band":   (172, 132,  56), "points": (180, 144,  64),
               "gem":    ( 56,  92, 156), "side":   ( 92, 132, 188)},
        accents=[{"kind": "gem_facet_shine", "region": "gem", "color": (180, 220, 255)}],
    ),
    "diademe_serdaigle": Recipe(
        id="diademe_serdaigle", name="Diadème de Serdaigle", rarity="legendary", material="metal",
        silhouette={"kind": "svg", "file": "tiara.svg"},
        fills={"band":   (201, 168,  76), "points": (224, 196, 108),
               "gem":    ( 36,  76, 156), "side":   (108, 168, 224)},
        accents=[
            {"kind": "gem_facet_shine", "region": "gem", "color": (200, 220, 255)},
            {"kind": "orb_glow", "region": "gem", "color": (140, 180, 255)},
        ],
        sparkles=True,
    ),
    # Easter egg « Salle sur Demande » — tiare ancienne et ternie, or vieilli
    # poussiéreux + gemme bleu nuit sourde (clin d'œil au Diadème caché).
    "tiare_poussiereuse": Recipe(
        id="tiare_poussiereuse", name="Tiare poussiéreuse", rarity="rare", material="metal",
        fills={"band":   (150, 124,  70), "points": (168, 140,  84),
               "gem":    ( 44,  56,  92), "side":   ( 96, 104, 128)},
        silhouette={"kind": "svg", "file": "tiara.svg"},
        accents=[
            {"kind": "gem_facet_shine", "region": "gem", "color": (158, 172, 204)},
        ],
    ),

    # Chalice
    "coupe_poufsouffle": Recipe(
        id="coupe_poufsouffle", name="Coupe de Poufsouffle", rarity="legendary", material="metal",
        silhouette={"kind": "svg", "file": "chalice.svg"},
        fills={"bowl": (201, 168,  76), "rim":  (224, 196, 108),
               "stem": (176, 144,  64), "foot": (160, 128,  56),
               "gem":  (216, 168,  44)},
        accents=[
            {"kind": "gem_facet_shine", "region": "gem", "color": (255, 224, 144)},
            {"kind": "orb_glow", "region": "gem", "color": (240, 200, 100)},
            {"kind": "emboss", "region": "bowl", "color": (120,  84,  28)},
        ],
        sparkles=True,
    ),

    # Hourglass
    "retourneur_temps": Recipe(
        id="retourneur_temps", name="Retourneur de Temps", rarity="legendary", material="metal",
        silhouette={"kind": "svg", "file": "hourglass.svg"},
        fills={"frame":    (201, 168,  76), "glass":    (220, 224, 236),
               "sand_top": (240, 196,  72), "sand_bot": (216, 168,  44)},
        accents=[
            {"kind": "orb_glow", "region": "sand_top", "color": (255, 224, 144)},
            {"kind": "gem_facet_shine", "region": "glass", "color": (240, 244, 255)},
        ],
        sparkles=True,
    ),

    # Cor du Pégase — trinket épique (drop boss étage 7, equipment-bonuses-v2)
    "cor_pegasse": Recipe(
        id="cor_pegasse", name="Cor du Pégase", rarity="epic", material="metal",
        silhouette={"kind": "svg", "file": "horn-pegasus.svg"},
        fills={
            "body":  (198, 158,  70),      # laiton chaud
            "bell":  (228, 196, 108),      # pavillon plus clair
            "mouth": ( 78,  54,  24),      # ombre intérieure du pavillon
            "band":  (150, 110,  44),      # anneaux bronze sombre
        },
        accents=[
            {"kind": "emboss", "region": "body", "color": (150, 110,  44)},
            {"kind": "orb_glow", "region": "bell", "color": (255, 226, 150)},
        ],
    ),

    # Mandragore
    "mandragore": Recipe(
        id="mandragore", name="Racine de Mandragore", rarity="common", material="matte",
        silhouette={"kind": "svg", "file": "mandragore.svg"},
        fills={"leaves":   ( 80, 132,  60), "root":     (200, 168, 124),
               "face":     ( 84,  56,  32), "tendrils": (172, 140,  96)},
        accents=[
            {"kind": "emboss", "region": "root", "color": (124,  92,  56)},
            {"kind": "emboss", "region": "leaves", "color": ( 40,  76,  24)},
        ],
    ),

    # Chocolate bar
    "choco_sorcier": Recipe(
        id="choco_sorcier", name="Chocolat aux Sorciers", rarity="common", material="matte",
        silhouette={"kind": "svg", "file": "choco-bar.svg"},
        fills={"wrapper": (172,  60,  48), "bar":     ( 88,  52,  32),
               "cube":    ( 56,  32,  20), "accent":  (216, 184,  96)},
        accents=[{"kind": "emboss", "region": "bar", "color": ( 32,  20,  12)}],
    ),

    # ── Items Tier 2 Maison (cf. .claude/plans/house-intermediate-tier.md) ────
    "brassard_lion": Recipe(
        id="brassard_lion", name="Brassard du Lion", rarity="rare", material="leather",
        silhouette={"kind": "svg", "file": "glove.svg"},
        fills={
            "cuff":    (116,   0,   1),    # rouge Gryffondor
            "palm":    (116,  80,  48),    # cuir tanné
            "fingers": (108,  72,  40),
            "stitch":  (211, 166,  37),    # or Gryffondor
        },
        accents=[
            {"kind": "emboss", "region": "palm", "color": ( 60,  32,  16)},
            {"kind": "symbol", "region": "palm", "shape": "lion",
             "color": (224, 184,  76), "size": 140},
        ],
    ),
    "anneau_serpent": Recipe(
        id="anneau_serpent", name="Anneau du Serpent", rarity="rare", material="metal",
        silhouette={"kind": "shape", "name": "ring_band",
                    "params": {"radius": 170, "thickness": 38,
                               "bezel": True, "gem": True}},
        fills={
            "metal": (170, 170, 170),     # argent Serpentard
            "gem":   ( 36, 124,  80),     # émeraude
        },
        accents=[
            {"kind": "runes", "region": "metal", "color": ( 72,  72,  72),
             "count": 8, "around": "ring"},
            {"kind": "gem_facet_shine", "region": "gem", "color": (140, 230, 180)},
            {"kind": "orb_glow", "region": "gem", "color": ( 60, 200, 140)},
        ],
    ),
    "plume_aigle": Recipe(
        id="plume_aigle", name="Plume d'Aigle", rarity="rare", material="matte",
        silhouette={"kind": "svg", "file": "feather.svg"},
        fills={
            "vane":   ( 14,  26,  64),    # bleu nuit Serdaigle
            "rachis": (148, 107,  45),    # bronze Serdaigle
            "quill":  ( 92,  68,  32),
        },
        accents=[
            {"kind": "emboss", "region": "vane", "color": (  8,  16,  40)},
            {"kind": "symbol", "region": "vane", "shape": "eagle",
             "color": (200, 156,  76), "size": 120},
        ],
    ),
    "ceinture_blaireau": Recipe(
        id="ceinture_blaireau", name="Ceinture du Blaireau", rarity="rare", material="leather",
        silhouette={"kind": "svg", "file": "belt.svg"},
        fills={
            "strap":  ( 88,  56,  32),    # cuir brun foncé
            "buckle": (240, 199,  94),    # or Poufsouffle
            "holes":  ( 48,  28,  12),
            "tongue": (220, 180,  80),
        },
        accents=[
            {"kind": "emboss", "region": "strap", "color": ( 52,  32,  16)},
            {"kind": "symbol", "region": "strap", "shape": "badger",
             "color": (240, 199,  94), "size": 100},
        ],
    ),

    # ── Sets de Maison 2.0 — pièces #2/#3/#4 ─────────────────────────────────
    # Cf. .claude/plans/houses-2.0.md §B. Mêmes palettes de Maison que la
    # piece #1 (Tier 2), rarity epic/legendary, emblème de Maison via
    # accent `symbol`. Les régions inconnues d'un part sont ignorées
    # silencieusement par le factory — on garde une map cohérente.

    # ── Set du Lion (Gryffondor) — rouge #740001, or #D3A625, "lion" ───
    "heaume_vaillant": Recipe(
        id="heaume_vaillant", name="Heaume du Vaillant", rarity="epic", material="metal",
        silhouette={"kind": "svg", "file": "hat-pointy.svg"},
        fills={
            "cone":   (116,   0,   1),    # rouge Gryffondor
            "band":   (211, 166,  37),    # or Gryffondor
            "brim":   ( 76,   0,   1),    # rouge profond
            "buckle": (240, 208, 128),    # or clair
        },
        accents=[
            {"kind": "emboss", "region": "cone",  "color": ( 60,   0,   0)},
            {"kind": "symbol", "region": "cone",  "shape": "lion",
             "color": (224, 184,  76), "size": 130},
        ],
    ),
    "cape_godric": Recipe(
        id="cape_godric", name="Cape de Godric", rarity="epic", material="matte",
        silhouette={"kind": "svg", "file": "hood.svg"},
        fills={
            "cloth":  (116,   0,   1),    # rouge Gryffondor
            "cavity": ( 56,   0,   0),
            "lining": ( 76,   0,   0),    # ignoré si absent
            "clasp":  (211, 166,  37),    # ignoré si absent
        },
        accents=[
            {"kind": "emboss", "region": "cloth", "color": ( 60,   0,   0)},
            {"kind": "symbol", "region": "cloth", "shape": "lion",
             "color": (224, 184,  76), "size": 140},
        ],
    ),
    "coeur_lion": Recipe(
        id="coeur_lion", name="Cœur de Lion", rarity="legendary", material="metal",
        silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={
            "chain":   (211, 166,  37),   # or Gryffondor
            "setting": (211, 166,  37),
            "gem":     (180,  20,  28),   # grenat rouge
        },
        accents=[
            {"kind": "gem_facet_shine", "region": "gem", "color": (255, 140, 140)},
            {"kind": "orb_glow",        "region": "gem", "color": (220,  60,  60)},
            {"kind": "symbol", "region": "setting", "shape": "lion",
             "color": (240, 208, 128), "size": 90},
        ],
        sparkles=True,
    ),

    # ── Set du Serpent (Serpentard) — vert #1A472A, argent #AAAAAA, "snake" ──
    "pendentif_mamba": Recipe(
        id="pendentif_mamba", name="Pendentif du Mamba", rarity="epic", material="metal",
        silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={
            "chain":   (170, 170, 170),   # argent Serpentard
            "setting": (140, 140, 140),
            "gem":     ( 26,  71,  42),   # vert Serpentard
        },
        accents=[
            {"kind": "gem_facet_shine", "region": "gem", "color": (120, 220, 160)},
            {"kind": "orb_glow",        "region": "gem", "color": ( 60, 200, 140)},
            {"kind": "symbol", "region": "setting", "shape": "snake",
             "color": (200, 200, 200), "size": 90},
        ],
    ),
    "cape_sibylline": Recipe(
        id="cape_sibylline", name="Cape Sibylline", rarity="epic", material="matte",
        silhouette={"kind": "svg", "file": "hood.svg"},
        fills={
            "cloth":  ( 26,  71,  42),    # vert Serpentard
            "cavity": ( 12,  36,  20),
            "lining": ( 16,  44,  26),
            "clasp":  (170, 170, 170),    # argent
        },
        accents=[
            {"kind": "emboss", "region": "cloth", "color": ( 12,  32,  18)},
            {"kind": "symbol", "region": "cloth", "shape": "snake",
             "color": (200, 200, 200), "size": 140},
        ],
    ),
    "couronne_basilic": Recipe(
        id="couronne_basilic", name="Couronne du Basilic", rarity="legendary", material="metal",
        silhouette={"kind": "svg", "file": "tiara.svg"},
        fills={
            "band":   (170, 170, 170),    # argent Serpentard
            "points": (200, 200, 200),
            "gem":    ( 36, 156,  92),    # émeraude
            "side":   ( 80, 168, 120),
        },
        accents=[
            {"kind": "gem_facet_shine", "region": "gem", "color": (160, 240, 200)},
            {"kind": "orb_glow",        "region": "gem", "color": ( 80, 220, 150)},
            {"kind": "symbol", "region": "band", "shape": "snake",
             "color": (220, 220, 220), "size": 100},
        ],
        sparkles=True,
    ),

    # ── Set de l'Aigle (Serdaigle) — bleu #0E1A40, bronze #946B2D, "eagle" ───
    "manteau_encre": Recipe(
        id="manteau_encre", name="Manteau d'Encre", rarity="epic", material="matte",
        silhouette={"kind": "svg", "file": "hood.svg"},
        fills={
            "cloth":  ( 14,  26,  64),    # bleu Serdaigle
            "cavity": (  6,  14,  36),
            "lining": (  8,  18,  48),
            "clasp":  (148, 107,  45),    # bronze
        },
        accents=[
            {"kind": "emboss", "region": "cloth", "color": (  6,  14,  36)},
            {"kind": "symbol", "region": "cloth", "shape": "eagle",
             "color": (200, 156,  76), "size": 140},
        ],
    ),
    "oeil_aigle": Recipe(
        id="oeil_aigle", name="Œil de l'Aigle", rarity="epic", material="metal",
        silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={
            "chain":   (148, 107,  45),   # bronze Serdaigle
            "setting": (124,  88,  36),
            "gem":     ( 36,  88, 188),   # saphir
        },
        accents=[
            {"kind": "gem_facet_shine", "region": "gem", "color": (140, 200, 255)},
            {"kind": "orb_glow",        "region": "gem", "color": ( 80, 160, 255)},
            {"kind": "symbol", "region": "setting", "shape": "eagle",
             "color": (200, 156,  76), "size": 90},
        ],
    ),
    "anneau_savoir": Recipe(
        id="anneau_savoir", name="Anneau du Savoir", rarity="legendary", material="metal",
        silhouette={"kind": "shape", "name": "ring_band",
                    "params": {"radius": 170, "thickness": 38,
                               "bezel": True, "gem": True}},
        fills={
            "metal": (148, 107,  45),     # bronze Serdaigle
            "gem":   ( 36,  88, 188),     # saphir
        },
        accents=[
            {"kind": "runes", "region": "metal", "color": (220, 200, 140),
             "count": 8, "around": "ring"},
            {"kind": "gem_facet_shine", "region": "gem", "color": (160, 220, 255)},
            {"kind": "orb_glow",        "region": "gem", "color": ( 80, 180, 255)},
        ],
        sparkles=True,
    ),

    # ── Set du Blaireau (Poufsouffle) — brun #372E29, or #F0C75E, "badger" ──
    "cape_loyaute": Recipe(
        id="cape_loyaute", name="Cape de Loyauté", rarity="epic", material="matte",
        silhouette={"kind": "svg", "file": "hood.svg"},
        fills={
            "cloth":  ( 55,  46,  41),    # brun Poufsouffle
            "cavity": ( 28,  22,  18),
            "lining": ( 36,  28,  22),
            "clasp":  (240, 199,  94),    # or
        },
        accents=[
            {"kind": "emboss", "region": "cloth", "color": ( 26,  20,  16)},
            {"kind": "symbol", "region": "cloth", "shape": "badger",
             "color": (240, 199,  94), "size": 140},
        ],
    ),
    "coiffe_blaireau": Recipe(
        id="coiffe_blaireau", name="Coiffe du Blaireau", rarity="epic", material="leather",
        silhouette={"kind": "svg", "file": "hat-pointy.svg"},
        fills={
            "cone":   ( 88,  56,  32),    # cuir brun
            "band":   (240, 199,  94),    # or Poufsouffle
            "brim":   ( 64,  40,  24),
            "buckle": (220, 180,  80),
        },
        accents=[
            {"kind": "emboss", "region": "cone",  "color": ( 52,  32,  16)},
            {"kind": "symbol", "region": "cone",  "shape": "badger",
             "color": (240, 199,  94), "size": 130},
        ],
    ),
    "medaillon_helga": Recipe(
        id="medaillon_helga", name="Médaillon de Helga", rarity="legendary", material="metal",
        silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={
            "chain":   (240, 199,  94),   # or Poufsouffle
            "setting": (211, 166,  37),
            "gem":     (224, 168,  44),   # topaze
        },
        accents=[
            {"kind": "gem_facet_shine", "region": "gem", "color": (255, 224, 144)},
            {"kind": "orb_glow",        "region": "gem", "color": (240, 200, 100)},
            {"kind": "symbol", "region": "setting", "shape": "badger",
             "color": (255, 220, 140), "size": 90},
        ],
        sparkles=True,
    ),

    # ── difficulty-polish-v3 Vague A — sprites des 6 équipements mid-game ──
    # Items du commit a953376 (étages 3-7, drops élite). Jusqu'ici ils
    # empruntaient l'icône d'un autre item (alias dans ITEM_ICON_REGISTRY).
    "gants_duelliste": Recipe(
        id="gants_duelliste", name="Gants du Duelliste", rarity="rare", material="leather",
        silhouette={"kind": "svg", "file": "glove.svg"},
        fills={
            "cuff":    ( 52,  56,  66),    # cuir gris acier
            "palm":    ( 78,  82,  94),
            "fingers": ( 66,  70,  82),
            "stitch":  (196,  72,  60),    # surpiqûre cramoisie
        },
        accents=[
            {"kind": "emboss", "region": "palm", "color": ( 30,  32,  40)},
            {"kind": "runes",  "region": "cuff", "color": (208,  96,  80), "count": 3},
        ],
    ),
    "casque_aurore": Recipe(
        id="casque_aurore", name="Casque d'Auror", rarity="rare", material="metal",
        silhouette={"kind": "svg", "file": "hat-pointy.svg"},
        fills={
            "cone":   ( 92, 100, 118),    # acier bleuté
            "brim":   ( 60,  66,  82),
            "band":   ( 58,  92, 152),    # bleu Auror
            "buckle": (206, 216, 232),    # rivet argenté
        },
        accents=[
            {"kind": "emboss", "region": "cone", "color": ( 40,  46,  60)},
            {"kind": "gem_facet_shine", "region": "buckle", "color": (224, 236, 255)},
        ],
    ),
    "ceinture_force": Recipe(
        id="ceinture_force", name="Ceinture de Force", rarity="rare", material="leather",
        silhouette={"kind": "svg", "file": "belt.svg"},
        fills={
            "strap":  ( 84,  52,  30),    # cuir épais brun foncé
            "buckle": (150, 100,  52),    # boucle de fer bronzé
            "holes":  ( 44,  26,  12),
            "tongue": (118,  76,  44),
        },
        accents=[
            {"kind": "emboss", "region": "strap", "color": ( 48,  28,  14)},
            {"kind": "runes",  "region": "strap", "color": (196, 140,  72), "count": 4},
        ],
    ),
    "anneau_courage": Recipe(
        id="anneau_courage", name="Anneau du Courage", rarity="rare", material="metal",
        silhouette={"kind": "shape", "name": "ring_band",
                    "params": {"radius": 172, "thickness": 40,
                               "bezel": True, "gem": True}},
        fills={
            "metal": (201, 168,  76),     # or
            "gem":   (194,  69,  58),     # rubis (tint #c2453a)
        },
        accents=[
            {"kind": "runes", "region": "metal", "color": ( 96,  60,  20),
             "count": 6, "around": "ring"},
            {"kind": "gem_facet_shine", "region": "gem", "color": (255, 168, 150)},
            {"kind": "orb_glow", "region": "gem", "color": (224,  90,  72)},
        ],
    ),
    "bottes_silence": Recipe(
        id="bottes_silence", name="Bottes du Silence", rarity="epic", material="leather",
        silhouette={"kind": "svg", "file": "boot.svg"},
        fills={
            "shaft": ( 46,  48,  60),     # cuir sombre feutré
            "foot":  ( 34,  36,  46),
            "sole":  ( 16,  18,  24),
            "lace":  (120, 124, 142),     # lacet gris argenté
        },
        accents=[
            {"kind": "emboss", "region": "shaft", "color": ( 20,  22,  30)},
            {"kind": "orb_glow", "region": "shaft", "color": ( 96, 112, 150)},
        ],
    ),
    "talisman_tactique": Recipe(
        id="talisman_tactique", name="Talisman du Tacticien", rarity="rare", material="metal",
        silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={
            "chain":   (150, 122,  62),   # chaîne bronze
            "setting": (170, 138,  70),   # sertissage bronze
            "gem":     ( 84, 132, 196),   # gemme bleu tacticien
        },
        accents=[
            {"kind": "gem_facet_shine", "region": "gem", "color": (200, 228, 255)},
            {"kind": "orb_glow", "region": "gem", "color": (110, 170, 230)},
        ],
    ),

    # ── Sinks endgame V1 (combo A+E) ───────────────────────────────
    # Cf. .claude/plans/game-economy-gold-audit.md §5.6 et §7 Étape 6.

    "elixir_perma_hp": Recipe(
        id="elixir_perma_hp", name="Élixir Permanent de Vitalité",
        rarity="epic", material="glass",
        silhouette={"kind": "svg", "file": "flask.svg"},
        fills={
            "stopper": ( 90,  55,  30),
            "body":    (200, 215, 220),
        },
        accents=[
            {"kind": "liquid",   "region": "body",
             "color": (180,  25,  45), "level": 0.72, "meniscus": True, "glow": True},
            {"kind": "bubbles",  "region": "body", "color": (255, 200, 200), "count": 8},
            {"kind": "orb_glow", "region": "body", "color": (220,  60,  80)},
            {"kind": "symbol",   "region": "body", "shape": "cross",
             "color": (255, 235, 235), "size": 90},
        ],
        sparkles=True,
    ),

    "elixir_perma_mp": Recipe(
        id="elixir_perma_mp", name="Élixir Permanent de Mana",
        rarity="epic", material="glass",
        silhouette={"kind": "svg", "file": "flask.svg"},
        fills={
            "stopper": ( 40,  30,  70),
            "body":    (200, 215, 220),
        },
        accents=[
            {"kind": "liquid",   "region": "body",
             "color": ( 40,  90, 220), "level": 0.72, "meniscus": True, "glow": True},
            {"kind": "bubbles",  "region": "body", "color": (180, 220, 255), "count": 10},
            {"kind": "orb_glow", "region": "body", "color": ( 80, 130, 255)},
            {"kind": "symbol",   "region": "body", "shape": "star",
             "color": (230, 240, 255), "size": 90},
        ],
        sparkles=True,
    ),

    "pierre_ame": Recipe(
        id="pierre_ame", name="Pierre d'Âme",
        rarity="legendary", material="glass",
        silhouette={"kind": "svg", "file": "gem-octahedron.svg"},
        fills={
            "gem":       (140,  60, 180),
            "gem_facet": (200, 140, 230),
            "gem_base":  ( 70,  25, 100),
        },
        accents=[
            {"kind": "gem_facet_shine", "region": "gem_facet", "color": (230, 200, 255)},
            {"kind": "orb_glow", "region": "gem", "color": (180, 100, 220)},
            {"kind": "symbol",   "region": "gem", "shape": "eye",
             "color": (255, 230, 255), "size": 110},
            {"kind": "runes",    "region": "gem", "color": (220, 180, 255), "count": 3},
        ],
        sparkles=True,
    ),

    "grimoire_interdit": Recipe(
        id="grimoire_interdit", name="Grimoire Interdit",
        rarity="legendary", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={
            "cover": ( 28,  18,  22),
            "spine": ( 18,  12,  16),
            "pages": (210, 195, 165),
            "gilt":  (170, 170, 175),
        },
        accents=[
            {"kind": "emboss", "region": "cover", "color": ( 10,   6,   8)},
            {"kind": "symbol", "region": "cover", "shape": "skull",
             "color": (190, 175, 145), "size": 140},
            {"kind": "runes",  "region": "cover", "color": (140,  30,  30), "count": 5},
        ],
        sparkles=True,
    ),

    "pendentif_ombre": Recipe(
        id="pendentif_ombre", name="Pendentif d'Ombre",
        rarity="epic", material="metal",
        silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={
            "chain":     ( 90,  90, 100),
            "setting":   ( 40,  40,  50),
            "gem":       ( 15,  15,  25),
            "gem_facet": ( 60,  50,  90),
        },
        accents=[
            {"kind": "gem_facet_shine", "region": "gem_facet", "color": (130, 100, 200)},
            {"kind": "orb_glow", "region": "gem", "color": ( 80,  40, 140)},
            {"kind": "symbol",   "region": "setting", "shape": "bat",
             "color": (150, 140, 170), "size": 60},
        ],
        sparkles=True,
    ),

    "reliquaire_lunaire": Recipe(
        id="reliquaire_lunaire", name="Reliquaire Lunaire",
        rarity="legendary", material="metal",
        silhouette={"kind": "svg", "file": "chalice.svg"},
        fills={
            "bowl":  (205, 215, 230),
            "rim":   (240, 245, 255),
            "stem":  (160, 170, 185),
            "foot":  (140, 150, 170),
            "gem":   ( 50,  80, 160),
        },
        accents=[
            {"kind": "symbol", "region": "bowl", "shape": "moon",
             "color": (245, 245, 220), "size": 130},
            {"kind": "runes",  "region": "bowl", "color": (200, 220, 255), "count": 4},
            {"kind": "gem_facet_shine", "region": "gem", "color": (200, 220, 255)},
            {"kind": "orb_glow", "region": "gem", "color": (120, 170, 255)},
            {"kind": "emboss", "region": "foot", "color": ( 80,  90, 110)},
        ],
        sparkles=True,
    ),

    "philtre_endurance": Recipe(
        id="philtre_endurance", name="Philtre d'Endurance",
        rarity="rare", material="glass",
        silhouette={"kind": "svg", "file": "flask.svg"},
        fills={
            "stopper": ( 80,  60,  35),
            "body":    (190, 200, 195),
        },
        accents=[
            {"kind": "liquid",  "region": "body",
             "color": ( 95, 115,  50), "level": 0.75, "meniscus": True, "glow": True},
            {"kind": "bubbles", "region": "body", "color": (170, 200, 130), "count": 6},
            {"kind": "symbol",  "region": "body", "shape": "drop",
             "color": (210, 230, 170), "size": 100},
        ],
    ),

    # ============================================================
    # Mondes parallèles Phase H §6.10 — Set du Voyageur (5 pièces)
    # ============================================================
    # Palette commune : violet astral (40-110 R, 20-80 G, 110-180 B) +
    # or pâle (216, 192, 132). Distincte des sets Maison (rouge / vert /
    # bleu / brun). Toutes les pièces sont `rarity:"rare"` (halo bleuté).
    "voyageur_diademe": Recipe(
        id="voyageur_diademe", name="Diadème du Plan", rarity="rare", material="metal",
        silhouette={"kind": "svg", "file": "tiara.svg"},
        fills={"band":   ( 92,  60, 156), "points": (148, 116, 196),
               "gem":    (108,  56, 172), "side":   (180, 148, 232)},
        accents=[
            {"kind": "gem_facet_shine", "region": "gem", "color": (220, 180, 255)},
            {"kind": "orb_glow",        "region": "gem", "color": (172, 124, 232)},
        ],
    ),
    "voyageur_cape": Recipe(
        id="voyageur_cape", name="Cape du Voyageur (astrale)", rarity="rare", material="matte",
        silhouette={"kind": "svg", "file": "hood.svg"},
        fills={"cloth":  ( 60,  36, 108), "lining": ( 96,  72, 160),
               "clasp":  (216, 192, 132)},
        accents=[
            {"kind": "emboss",  "region": "cloth", "color": ( 36,  20,  76)},
            {"kind": "runes",   "region": "cloth", "color": (180, 144, 232), "count": 3},
            {"kind": "orb_glow","region": "clasp", "color": (232, 200, 140)},
        ],
    ),
    "voyageur_bottes": Recipe(
        id="voyageur_bottes", name="Bottes du Pas Astral", rarity="rare", material="leather",
        silhouette={"kind": "svg", "file": "boot.svg"},
        fills={"shaft": ( 60,  36, 108), "foot":  ( 48,  28,  92),
               "sole":  ( 24,  12,  52), "lace":  (216, 192, 132)},
        accents=[
            {"kind": "emboss", "region": "shaft", "color": ( 32,  16,  68)},
            {"kind": "runes",  "region": "shaft", "color": (180, 144, 232), "count": 3},
        ],
    ),
    "voyageur_anneau": Recipe(
        id="voyageur_anneau", name="Anneau de l'Outremonde", rarity="rare", material="metal",
        silhouette={"kind": "shape", "name": "ring_band",
                    "params": {"radius": 175, "thickness": 36,
                               "bezel": True, "gem": True}},
        fills={"metal": (148, 116, 196), "gem":   (108,  56, 172)},
        accents=[
            {"kind": "runes",           "region": "metal", "color": ( 48,  24,  80),
             "count": 6, "around": "ring"},
            {"kind": "gem_facet_shine", "region": "gem",   "color": (224, 188, 255)},
            {"kind": "orb_glow",        "region": "gem",   "color": (172, 124, 232)},
        ],
    ),
    "voyageur_amulette": Recipe(
        id="voyageur_amulette", name="Amulette du Lien", rarity="rare", material="metal",
        silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={"chain": (216, 192, 132), "bezel": (148, 116, 196),
               "gem":   (108,  56, 172)},
        accents=[
            {"kind": "gem_facet_shine", "region": "gem", "color": (224, 188, 255)},
            {"kind": "orb_glow",        "region": "gem", "color": (172, 124, 232)},
            {"kind": "symbol",          "region": "gem", "shape": "star",
             "color": (240, 220, 255), "size": 90},
        ],
    ),

    # ── Reliques des Quêtes Signature de Maison ─────────────────────────
    # Bannière de Godric (Gryffondor) : étendard rouge à trim/hampe or, lion.
    "banniere_godric": Recipe(
        id="banniere_godric", name="Bannière de Godric", rarity="legendary", material="matte",
        silhouette={"kind": "svg", "file": "banner.svg"},
        fills={
            "cloth": (116,   0,   1),    # rouge Gryffondor
            "trim":  (211, 166,  37),    # or
            "pole":  (188, 148,  60),    # hampe dorée
        },
        accents=[
            {"kind": "emboss", "region": "cloth", "color": ( 60,   0,   0)},
            {"kind": "symbol", "region": "cloth", "shape": "lion",
             "color": (224, 184,  76), "size": 150},
        ],
        sparkles=True,
    ),
    # Langue-de-plomb (Serpentard) : médaillon vert serti d'argent, serpent.
    "langue_de_plomb": Recipe(
        id="langue_de_plomb", name="Langue-de-plomb", rarity="epic", material="metal",
        silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={
            "chain":   (170, 170, 170),   # argent Serpentard
            "setting": (140, 140, 140),
            "gem":     ( 26,  71,  42),   # vert Serpentard
        },
        accents=[
            {"kind": "gem_facet_shine", "region": "gem", "color": (120, 220, 160)},
            {"kind": "orb_glow",        "region": "gem", "color": ( 60, 200, 140)},
            {"kind": "symbol", "region": "setting", "shape": "snake",
             "color": (200, 200, 200), "size": 90},
        ],
    ),
    # Codex de Rowena (Serdaigle) : grimoire bleu nuit, dorures bronze, aigle.
    "codex_rowena": Recipe(
        id="codex_rowena", name="Codex de Rowena", rarity="epic", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={
            "cover": ( 14,  26,  64),    # bleu Serdaigle
            "pages": (220, 206, 168),
            "spine": (  8,  16,  44),
            "gilt":  (148, 107,  45),    # bronze
        },
        accents=[
            {"kind": "emboss", "region": "cover", "color": (  6,  14,  36)},
            {"kind": "symbol", "region": "cover", "shape": "eagle",
             "color": (200, 156,  76), "size": 140},
        ],
    ),
    # Cœur du Refuge (Poufsouffle) : médaillon or à pierre d'ambre, blaireau.
    "coeur_refuge": Recipe(
        id="coeur_refuge", name="Cœur du Refuge", rarity="epic", material="metal",
        silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={
            "chain":   (240, 199,  94),   # or Poufsouffle
            "setting": (211, 166,  37),
            "gem":     (200, 128,  36),   # ambre chaud
        },
        accents=[
            {"kind": "gem_facet_shine", "region": "gem", "color": (255, 212, 140)},
            {"kind": "orb_glow",        "region": "gem", "color": (240, 176,  72)},
            {"kind": "symbol", "region": "setting", "shape": "badger",
             "color": ( 60,  46,  36), "size": 90},
        ],
    ),

    # ════════════════════════════════════════════════════════════
    # Artefacts & Reliquaires 2.0 — P1 nouvelles formes (plan §1.4 A/B)
    # ════════════════════════════════════════════════════════════
    # A. Mid-game (uncommon/rare)
    "orbe_flamme": Recipe(
        id="orbe_flamme", name="Orbe de Flamme", rarity="uncommon", material="glass",
        silhouette={"kind": "svg", "file": "orb.svg"},
        fills={"sphere": (200,  72,  32), "core": (255, 168,  72), "base": (120,  82,  40)},
        accents=[
            {"kind": "orb_glow", "region": "core",   "color": (255, 200, 110)},
            {"kind": "symbol",   "region": "sphere", "shape": "flame",
             "color": (255, 226, 152), "size": 120},
        ],
    ),
    "orbe_givre": Recipe(
        id="orbe_givre", name="Orbe de Givre", rarity="uncommon", material="glass",
        silhouette={"kind": "svg", "file": "orb.svg"},
        fills={"sphere": ( 60, 140, 200), "core": (190, 232, 255), "base": ( 96, 110, 128)},
        accents=[
            {"kind": "orb_glow", "region": "core",   "color": (210, 240, 255)},
            {"kind": "symbol",   "region": "sphere", "shape": "snowflake",
             "color": (235, 250, 255), "size": 120},
        ],
    ),
    "cristal_focalisation": Recipe(
        id="cristal_focalisation", name="Cristal de Focalisation", rarity="rare", material="glass",
        silhouette={"kind": "svg", "file": "gem-octahedron.svg"},
        fills={"gem": ( 96, 200, 216), "gem_base": ( 40, 120, 140)},
        accents=[
            {"kind": "gem_facet_shine", "region": "gem", "color": (224, 250, 255)},
            {"kind": "orb_glow",        "region": "gem", "color": (170, 230, 240)},
        ],
    ),
    "gantelets_combat": Recipe(
        id="gantelets_combat", name="Gantelets de Combat", rarity="rare", material="leather",
        silhouette={"kind": "svg", "file": "glove.svg"},
        fills={"cuff": ( 96,  72,  48), "palm": (140, 100,  60),
               "fingers": (128,  92,  52), "stitch": (208, 180, 120)},
        accents=[{"kind": "emboss", "region": "palm", "color": ( 60,  40,  20)}],
    ),
    "baton_apprenti": Recipe(
        id="baton_apprenti", name="Bâton d'Apprenti", rarity="uncommon", material="wood",
        silhouette={"kind": "svg", "file": "wizard-staff.svg"},
        fills={"shaft": (120,  84,  48), "grip": ( 84,  60,  36),
               "pommel": (150, 112,  64), "orb": (176, 208, 160)},
        accents=[{"kind": "orb_glow", "region": "orb", "color": (210, 232, 190)}],
    ),
    "cape_funambule": Recipe(
        id="cape_funambule", name="Cape du Funambule", rarity="rare", material="matte",
        silhouette={"kind": "svg", "file": "hood.svg"},
        fills={"cloth": (176, 140,  64), "cavity": ( 96,  72,  36)},
        accents=[{"kind": "emboss", "region": "cloth", "color": (120,  92,  40)}],
    ),
    "masque_courage": Recipe(
        id="masque_courage", name="Masque du Courage", rarity="rare", material="matte",
        silhouette={"kind": "svg", "file": "mask.svg"},
        fills={"face": (150,  40,  36), "brow": (176,  60,  48),
               "eyes": ( 40,  16,  14), "accent": (208, 168,  80)},
        accents=[
            {"kind": "emboss",          "region": "face",   "color": ( 96,  24,  20)},
            {"kind": "gem_facet_shine", "region": "accent", "color": (255, 224, 150)},
        ],
    ),
    "grimoire_flottant": Recipe(
        id="grimoire_flottant", name="Grimoire Flottant", rarity="rare", material="leather",
        silhouette={"kind": "svg", "file": "book-cover.svg"},
        fills={"cover": ( 46,  84, 150), "pages": (224, 224, 236),
               "spine": ( 28,  56, 104), "gilt": (150, 180, 220)},
        accents=[
            {"kind": "emboss", "region": "cover", "color": ( 24,  48,  90)},
            {"kind": "symbol", "region": "cover", "shape": "eye",
             "color": (210, 228, 255), "size": 130},
        ],
    ),
    # B. Endgame (epic)
    "baton_ancestral": Recipe(
        id="baton_ancestral", name="Bâton Ancestral", rarity="epic", material="wood",
        silhouette={"kind": "svg", "file": "wizard-staff.svg"},
        fills={"shaft": ( 96,  64,  36), "grip": ( 64,  42,  24),
               "pommel": (150, 112,  64), "orb": (180, 150, 255)},
        accents=[
            {"kind": "orb_glow", "region": "orb",   "color": (220, 196, 255)},
            {"kind": "runes",    "region": "shaft", "color": (200, 170, 255), "count": 4},
        ],
    ),
    "talisman_fondateurs": Recipe(
        id="talisman_fondateurs", name="Talisman des Fondateurs", rarity="epic", material="metal",
        silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={"chain": (200, 168,  96), "setting": (211, 166,  37), "gem": (120, 150, 200)},
        accents=[
            {"kind": "gem_facet_shine", "region": "gem",     "color": (224, 235, 255)},
            {"kind": "orb_glow",        "region": "gem",     "color": (170, 200, 240)},
            {"kind": "symbol", "region": "setting", "shape": "star",
             "color": ( 60,  46,  30), "size": 80},
        ],
    ),
    "masque_rituel": Recipe(
        id="masque_rituel", name="Masque Rituel", rarity="epic", material="matte",
        silhouette={"kind": "svg", "file": "mask.svg"},
        fills={"face": ( 72,  40,  90), "brow": ( 96,  56, 120),
               "eyes": ( 20,  10,  28), "accent": (176, 144, 220)},
        accents=[
            {"kind": "emboss", "region": "face", "color": ( 44,  24,  56)},
            {"kind": "symbol", "region": "brow", "shape": "eye",
             "color": (216, 196, 248), "size": 70},
            {"kind": "gem_facet_shine", "region": "accent", "color": (224, 200, 255)},
        ],
    ),
    "gantelets_aurors": Recipe(
        id="gantelets_aurors", name="Gantelets des Aurors", rarity="epic", material="metal",
        silhouette={"kind": "svg", "file": "glove.svg"},
        fills={"cuff": ( 44,  70, 100), "palm": ( 90, 120, 150),
               "fingers": ( 76, 104, 134), "stitch": (200, 210, 224)},
        accents=[
            {"kind": "emboss",          "region": "palm",   "color": ( 30,  48,  70)},
            {"kind": "gem_facet_shine", "region": "stitch", "color": (220, 232, 255)},
        ],
    ),
    "orbe_runique": Recipe(
        id="orbe_runique", name="Orbe Runique", rarity="epic", material="glass",
        silhouette={"kind": "svg", "file": "orb.svg"},
        fills={"sphere": (120,  72, 180), "core": (208, 168, 255), "base": ( 90,  76, 120)},
        accents=[
            {"kind": "orb_glow", "region": "core",   "color": (224, 196, 255)},
            {"kind": "runes",    "region": "sphere", "color": (224, 196, 255), "count": 5},
            {"kind": "symbol",   "region": "sphere", "shape": "star",
             "color": (240, 224, 255), "size": 110},
        ],
    ),

    # ════════════════════════════════════════════════════════════
    # Artefacts P2 — variantes Premium par Maison (recolor + emblème + sparkles
    # de prestige). Repli painterly ; visuels finaux remplaçables via --raster.
    # Palettes Maison standardisées (Gryff/Slyth/Serd/Pouf).
    # ════════════════════════════════════════════════════════════
    "orbe_runique_premium_gryff": Recipe(
        id="orbe_runique_premium_gryff", name="Orbe Runique de Godric",
        rarity="epic", material="glass",
        silhouette={"kind": "svg", "file": "orb.svg"},
        fills={"sphere": (150,  20,  16), "core": (255, 198,  96), "base": (116,   0,   1)},
        accents=[
            {"kind": "orb_glow", "region": "core",   "color": (255, 214, 120)},
            {"kind": "runes",    "region": "sphere", "color": (240, 206, 120), "count": 5},
            {"kind": "symbol",   "region": "sphere", "shape": "lion",
             "color": (240, 206, 120), "size": 110},
        ],
        sparkles=True,
    ),
    "masque_rituel_premium_slyth": Recipe(
        id="masque_rituel_premium_slyth", name="Masque Rituel de Salazar",
        rarity="epic", material="matte",
        silhouette={"kind": "svg", "file": "mask.svg"},
        fills={"face": ( 20,  56,  36), "brow": ( 26,  71,  42),
               "eyes": (  8,  20,  14), "accent": (170, 170, 170)},
        accents=[
            {"kind": "emboss", "region": "face", "color": ( 10,  34,  22)},
            {"kind": "symbol", "region": "brow", "shape": "snake",
             "color": (200, 210, 200), "size": 80},
            {"kind": "gem_facet_shine", "region": "accent", "color": (230, 240, 230)},
        ],
        sparkles=True,
    ),
    "baton_ancestral_premium_serd": Recipe(
        id="baton_ancestral_premium_serd", name="Bâton Ancestral de Rowena",
        rarity="epic", material="wood",
        silhouette={"kind": "svg", "file": "wizard-staff.svg"},
        fills={"shaft": ( 30,  44,  86), "grip": ( 14,  26,  64),
               "pommel": (148, 107,  45), "orb": (120, 170, 255)},
        accents=[
            {"kind": "orb_glow", "region": "orb",   "color": (180, 210, 255)},
            {"kind": "runes",    "region": "shaft", "color": (170, 140,  80), "count": 4},
        ],
        sparkles=True,
    ),
    "talisman_fondateurs_premium_pouf": Recipe(
        id="talisman_fondateurs_premium_pouf", name="Talisman de Helga",
        rarity="epic", material="metal",
        silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={"chain": (240, 199,  94), "setting": (211, 166,  37), "gem": (200, 128,  36)},
        accents=[
            {"kind": "gem_facet_shine", "region": "gem",     "color": (255, 212, 140)},
            {"kind": "orb_glow",        "region": "gem",     "color": (240, 176,  72)},
            {"kind": "symbol", "region": "setting", "shape": "badger",
             "color": ( 60,  46,  36), "size": 80},
        ],
        sparkles=True,
    ),
    # Forme défensive mid-game Poufsouffle (P3) — talisman badger, repli painterly.
    "talisman_blaireau": Recipe(
        id="talisman_blaireau", name="Talisman du Blaireau",
        rarity="rare", material="metal",
        silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={"chain": (200, 168,  96), "setting": (240, 199,  94), "gem": (120,  92,  52)},
        accents=[
            {"kind": "emboss", "region": "setting", "color": (150, 112,  56)},
            {"kind": "symbol", "region": "setting", "shape": "badger",
             "color": ( 55,  46,  41), "size": 90},
            {"kind": "gem_facet_shine", "region": "gem", "color": (210, 184, 130)},
        ],
    ),
    # Reliques vocales (P3.3b) — recettes minimales : seules rarity/sparkles
    # sont lues par --raster (cadrage halo+cartouche d'une source Copilot
    # banque dans tools/raster_src/). silhouette/fills inertes ici.
    "voix_godric_relique": Recipe(
        id="voix_godric_relique", name="Murmure de Godric", rarity="epic",
        material="metal", silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={"chain": (180, 150, 90), "setting": (211, 166, 37), "gem": (116, 0, 1)},
    ),
    "voix_salazar_relique": Recipe(
        id="voix_salazar_relique", name="Murmure de Salazar", rarity="epic",
        material="metal", silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={"chain": (170, 170, 170), "setting": (150, 150, 150), "gem": (26, 71, 42)},
    ),
    "voix_rowena_relique": Recipe(
        id="voix_rowena_relique", name="Murmure de Rowena", rarity="epic",
        material="metal", silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={"chain": (148, 107, 45), "setting": (148, 107, 45), "gem": (14, 26, 64)},
    ),
    "voix_helga_relique": Recipe(
        id="voix_helga_relique", name="Murmure de Helga", rarity="epic",
        material="metal", silhouette={"kind": "svg", "file": "gem-pendant.svg"},
        fills={"chain": (200, 168, 96), "setting": (240, 199, 94), "gem": (55, 46, 41)},
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
        elif kind == "symbol":
            # Render a small named glyph centered on the region. Used mainly
            # to distinguish books that otherwise share the same silhouette.
            ys, xs = np.where(mask > 0.5)
            if len(ys) == 0:
                continue
            cy, cx = int(ys.mean()), int(xs.mean())
            size_px = int(acc.get("size", 110))   # ~22% of 512 frame
            shape_name = acc.get("shape", "star")
            sym = _render_symbol(shape_name, size_px)
            if sym is None:
                continue
            sh, sw = sym.shape
            y0 = max(0, cy - sh // 2); y1 = min(h, y0 + sh)
            x0 = max(0, cx - sw // 2); x1 = min(w, x0 + sw)
            sy0 = y0 - (cy - sh // 2); sx0 = x0 - (cx - sw // 2)
            patch_mask = sym[sy0:sy0 + (y1 - y0), sx0:sx0 + (x1 - x0)] * mask[y0:y1, x0:x1]
            strength = acc.get("strength", 0.85)
            rgb[y0:y1, x0:x1] = (
                rgb[y0:y1, x0:x1] * (1 - patch_mask[..., None] * strength)
                + color * (patch_mask[..., None] * strength)
            )
    return rgb


# ── small symbol library for cover/region glyphs ───────────────────────────

_SYMBOL_PATHS = {
    "star":      'M 50 8 L 60 40 L 92 40 L 66 60 L 76 92 L 50 72 L 24 92 L 34 60 L 8 40 L 40 40 Z',
    "moon":      'M 70 18 A 38 38 0 1 0 70 82 A 30 30 0 1 1 70 18 Z',
    "flame":     'M 50 8 C 56 30 78 32 70 56 C 84 56 80 78 64 86 C 70 70 56 70 60 84 C 44 84 32 72 36 56 C 20 56 38 30 50 8 Z',
    "drop":      'M 50 8 C 32 36 22 52 22 64 C 22 80 34 92 50 92 C 66 92 78 80 78 64 C 78 52 68 36 50 8 Z',
    "lightning": 'M 56 4 L 22 52 L 44 52 L 32 96 L 78 40 L 54 40 L 64 4 Z',
    "skull":     'M 30 14 A 22 22 0 0 1 70 14 L 74 52 L 64 56 L 64 70 L 58 70 L 58 60 L 42 60 L 42 70 L 36 70 L 36 56 L 26 52 Z M 36 32 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0 M 52 32 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0',
    "eye":       'M 6 50 C 26 22 74 22 94 50 C 74 78 26 78 6 50 Z M 38 50 a 12 12 0 1 0 24 0 a 12 12 0 1 0 -24 0',
    "bat":       'M 50 50 L 8 30 L 14 56 L 26 50 L 22 70 L 50 60 L 78 70 L 74 50 L 86 56 L 92 30 Z',
    "fang":      'M 24 8 L 40 8 L 32 80 Z M 60 8 L 76 8 L 68 80 Z',
    "cross":     'M 42 8 L 58 8 L 58 42 L 92 42 L 92 58 L 58 58 L 58 92 L 42 92 L 42 58 L 8 58 L 8 42 L 42 42 Z',
    "leaf":      'M 50 8 C 76 24 80 60 50 92 C 20 60 24 24 50 8 Z M 48 24 L 52 24 L 52 84 L 48 84 Z',
    "snake":     'M 12 30 C 36 18 64 50 88 38 C 64 50 36 82 12 70 C 36 60 64 60 88 70 Z',
    "deer":      'M 36 6 L 30 28 L 22 22 L 28 38 L 16 36 L 28 48 L 50 56 L 72 48 L 84 36 L 72 38 L 78 22 L 70 28 L 64 6 L 56 26 L 50 18 L 44 26 Z',
    "wand":      'M 12 88 L 76 24 L 88 36 L 24 100 Z M 76 16 L 80 4 L 86 12 L 98 12 L 90 20 L 98 28 L 86 28 L 84 38 Z',
    "snowflake": 'M 50.00 8.00 L 58.50 35.28 L 86.37 29.00 L 67.00 50.00 L 86.37 71.00 L 58.50 64.72 L 50.00 92.00 L 41.50 64.72 L 13.63 71.00 L 33.00 50.00 L 13.63 29.00 L 41.50 35.28 Z',
    "sun":       'M 50.00 5.00 L 56.99 23.92 L 72.50 11.03 L 69.09 30.91 L 88.97 27.50 L 76.08 43.01 L 95.00 50.00 L 76.08 56.99 L 88.97 72.50 L 69.09 69.09 L 72.50 88.97 L 56.99 76.08 L 50.00 95.00 L 43.01 76.08 L 27.50 88.97 L 30.91 69.09 L 11.03 72.50 L 23.92 56.99 L 5.00 50.00 L 23.92 43.01 L 11.03 27.50 L 30.91 30.91 L 27.50 11.03 L 43.01 23.92 Z',
    # House emblems — used for Tier 2 Maison items (cf. .claude/plans/house-intermediate-tier.md §2.7.2)
    "lion":      'M 50.0 10.0 L 55.7 28.7 L 70.0 15.4 L 65.6 34.4 L 84.6 30.0 L 71.3 44.3 L 90.0 50.0 L 71.3 55.7 L 84.6 70.0 L 65.6 65.6 L 70.0 84.6 L 55.7 71.3 L 50.0 90.0 L 44.3 71.3 L 30.0 84.6 L 34.4 65.6 L 15.4 70.0 L 28.7 55.7 L 10.0 50.0 L 28.7 44.3 L 15.4 30.0 L 34.4 34.4 L 30.0 15.4 L 44.3 28.7 Z',
    "eagle":     'M 50 30 L 8 18 L 16 44 L 30 38 L 22 60 L 50 44 L 78 60 L 70 38 L 84 44 L 92 18 Z M 46 44 L 54 44 L 54 84 L 50 92 L 46 84 Z',
    "badger":    'M 30 30 L 70 30 L 78 50 L 60 56 L 54 78 L 50 84 L 46 78 L 40 56 L 22 50 Z M 32 38 L 40 38 L 42 70 L 34 70 Z M 60 38 L 68 38 L 66 70 L 58 70 Z',
}


def _render_symbol(name: str, size_px: int):
    """Rasterize a named glyph to a (size_px, size_px) alpha array in [0,1]."""
    path_d = _SYMBOL_PATHS.get(name)
    if path_d is None:
        return None
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
        f'<path fill="#000" fill-rule="evenodd" d="{path_d}"/></svg>'
    )
    img = _rasterize(svg, size_px)
    return np.asarray(img, dtype=np.float32)[..., 3] / 255.0


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


# ── Raster path (Gemini / Nano Banana cutouts) ──────────────────────────────
# Au lieu de peindre une silhouette SVG, on encadre un sujet DÉJÀ peint (icône
# générée par LLM image), en réutilisant UNIQUEMENT les deux passes de cadrage
# communes — halo de rareté + cartouche doré — pour rester cohérent avec les
# icônes painterly. Les passes painterly (AO/shading/rim/specular/grain) sont
# sautées (le sujet est déjà ombragé). Source attendue : tools/raster_src/<id>.png.
RASTER_SRC_DIR = os.path.normpath(os.path.join(HERE, "..", "tools", "raster_src"))


def _drop_border_components(im, min_area_frac=0.003):
    """Retire de l'alpha les composants connexes touchant le bord (bave de
    voisin) et les micro-composants (< min_area_frac). Conserve les sujets
    multi-parties (paire de gantelets) tant qu'ils ne touchent pas le bord.
    No-op silencieux si scipy absent."""
    try:
        from scipy.ndimage import label
    except Exception:
        return im
    arr = np.asarray(im).copy()
    fg = arr[..., 3] > 32
    if not fg.any():
        return im
    lbl, n = label(fg)
    if n <= 1:
        return im
    border = set(lbl[0]).union(lbl[-1]).union(lbl[:, 0]).union(lbl[:, -1])
    border.discard(0)
    areas = np.bincount(lbl.ravel())
    min_area = max(1, int(min_area_frac * arr.shape[0] * arr.shape[1]))
    keep = np.zeros(fg.shape, dtype=bool)
    for li in range(1, n + 1):
        if li in border or areas[li] < min_area:
            continue
        keep |= (lbl == li)
    if not keep.any():        # tout supprimé (sujet collé au bord) → on garde tel quel
        return im
    arr[..., 3] = np.where(keep, arr[..., 3], 0)
    return Image.fromarray(arr, "RGBA")


def _load_raster_subject(path: str, margin: float = 0.08):
    """Charge un PNG d'icône externe en (rgb[0..1], alpha[0..1]) sur un canevas
    512² transparent, sujet centré avec marge. Accepte un PNG RGBA à
    transparence réelle, OU un PNG RGB/opaque sur damier de transparence aplati
    (détouré via dechecker_png)."""
    import dechecker_png
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im)[..., 3]
    if a.min() >= 250:  # pas d'alpha exploitable → damier « cuit »
        import tempfile
        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False).name
        dechecker_png.detour(path, tmp, side=RENDER_SIZE, margin=margin)
        im = Image.open(tmp).convert("RGBA")
        os.unlink(tmp)
    # Défense-en-profondeur (cf. tools/sheet_extract.py) : retire les composants
    # alpha qui touchent le bord (bave de voisin sur une source mal découpée) et
    # les micro-specks, AVANT le bbox → garantit un centrage sur le vrai sujet.
    im = _drop_border_components(im)
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    inner = int(RENDER_SIZE * (1 - 2 * margin))
    w, h = im.size
    scale = min(inner / w, inner / h)
    im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))),
                   Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (RENDER_SIZE, RENDER_SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((RENDER_SIZE - im.size[0]) // 2,
                                (RENDER_SIZE - im.size[1]) // 2))
    arr = np.asarray(canvas).astype(np.float64) / 255.0
    return arr[..., :3].copy(), arr[..., 3].copy()


def render_raster(src: str, rarity: str = "common", sparkles: bool = False,
                  seed: int = 0) -> Image.Image:
    """Encadre une icône raster externe avec le MÊME halo de rareté + cartouche
    doré que les icônes par recette (sans les passes painterly)."""
    rgb, alpha = _load_raster_subject(src)
    rgb, alpha = pass_halo(rgb, alpha, rarity=rarity, sparkles=sparkles, seed=seed)
    rgb = pass_cartouche(rgb, size=RENDER_SIZE)
    rgba = np.dstack([np.clip(rgb, 0, 1), alpha])
    return Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), mode="RGBA")


def save_raster(item_id: str, src: str, rarity: str, out_dir: str = OUT_DIR,
                sparkles: bool = False) -> List[str]:
    os.makedirs(out_dir, exist_ok=True)
    big = render_raster(src, rarity=rarity, sparkles=sparkles,
                        seed=hash(item_id) & 0xFFFF)
    paths: List[str] = []
    for s in MIPMAPS:
        p = os.path.join(out_dir, f"{item_id}_{s}.png")
        big.resize((s, s), Image.Resampling.LANCZOS).save(p, "PNG", optimize=True)
        paths.append(p)
    return paths


# ── CLI ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ids", nargs="*", help="recipe ids to render")
    parser.add_argument("--all", action="store_true", help="render every recipe")
    parser.add_argument("--list", action="store_true", help="list known recipes")
    parser.add_argument("--raster", action="store_true",
                        help="frame raster icons (Gemini cutouts) from "
                             "tools/raster_src/<id>.png — halo+cartouche only")
    parser.add_argument("--out", default=OUT_DIR, help="output directory")
    args = parser.parse_args()

    if args.list:
        for r in RECIPES.values():
            print(f"  {r.id:24s} {r.rarity:10s} {r.name}")
        return

    if args.raster:
        ids = args.ids or [r.id for r in RECIPES.values()]
        for rid in ids:
            src = os.path.join(RASTER_SRC_DIR, f"{rid}.png")
            if not os.path.exists(src):
                print(f"!! no raster source: {os.path.relpath(src)}", file=sys.stderr)
                continue
            rarity   = RECIPES[rid].rarity   if rid in RECIPES else "common"
            sparkles = RECIPES[rid].sparkles if rid in RECIPES else False
            print(f"→ framing raster {rid} ({rarity}) …")
            for p in save_raster(rid, src, rarity, out_dir=args.out, sparkles=sparkles):
                print(f"   wrote {os.path.relpath(p)}")
        print("done.")
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
