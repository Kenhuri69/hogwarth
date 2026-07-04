#!/usr/bin/env python3
"""Compression des assets img/ — P8a du plan final-polish-2026-07.md (Lot 3).

Trois traitements, script de PRÉ-TRAITEMENT pur (zéro code runtime) :
1. Quantization palette (libimagequant, dithering 1.0 — painterly → prudent)
   des PNG truecolor (RGBA/RGB) → PNG 8-bit palette, ~40-60 % de gain.
2. Recompression des JPEG (qualité 80, progressive).
3. Resize des portraits surdimensionnés (RESIZE_MAX ci-dessous) vers la
   taille standard des portraits PNJ (256², affichés 64-96 px).

Idempotent : les PNG déjà en mode palette (P) sont sautés ; un fichier
n'est réécrit QUE si le gain dépasse le seuil (sinon l'original est gardé),
donc une ré-exécution est un no-op.

Garde-fous :
- les planches de montage img/icons/_*.png ne sont PAS touchées (purge
  P8c en attente d'aval — inutile de les recompresser) ;
- contrôle visuel OBLIGATOIRE sur échantillon après chaque famille
  (avant/après dans tools/_shots/, cf. plan Lot 3 ÉTAPE 2).

Usage :
    python3 tools/optimize_images.py monsters          # une famille
    python3 tools/optimize_images.py npc icons         # plusieurs
    python3 tools/optimize_images.py --all             # tout img/

Pré-requis : pip install pillow imagequant
"""
import io
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow manquant — pip install pillow")
try:
    import imagequant
except ImportError:
    sys.exit("imagequant manquant — pip install imagequant")

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))

# Familles d'assets (chemins relatifs à la racine du dépôt).
# ("dossier", récursif ?) — img racine en non-récursif : médaillons héros.
FAMILIES = {
    "monsters": [("img/monsters", True)],
    "npc":      [("img/npc", True)],
    "players":  [("img/players", True), ("img", False)],
    "icons":    [("img/icons", True), ("img/icons_new", True)],
    "misc":     [("img/houses", True), ("img/fx", True), ("img/codex", True),
                 ("img/scenes", True), ("img/textures", True)],
}

# Portraits surdimensionnés → boîte max (px). Standard portrait PNJ = 256².
RESIZE_MAX = {
    "img/npc/rosmerta.png": 256,
    "img/npc/mundungus.png": 256,
}

PNG_KEEP_RATIO = 0.85   # réécrit un PNG quantifié seulement si ≤ 85 % du poids
JPG_KEEP_RATIO = 0.80   # idem JPEG recompressé
JPG_QUALITY = 80


def _skip(rel):
    # Planches de montage (P8c, en attente d'aval) : ne pas y toucher.
    return rel.startswith("img/icons/_")


def _iter_images(family):
    for d, recursive in FAMILIES[family]:
        base = os.path.join(ROOT, d)
        if recursive:
            for root, _dirs, files in os.walk(base):
                for f in sorted(files):
                    yield os.path.join(root, f)
        else:
            for f in sorted(os.listdir(base)):
                p = os.path.join(base, f)
                if os.path.isfile(p):
                    yield p


def _optimize_png(path, rel):
    im = Image.open(path)
    if im.mode == "P":
        return None  # déjà quantifié (idempotence)
    orig = os.path.getsize(path)
    resized = False
    box = RESIZE_MAX.get(rel)
    if box and max(im.size) > box:
        im = im.convert("RGBA")
        im.thumbnail((box, box), Image.LANCZOS)
        resized = True
    q = imagequant.quantize_pil_image(
        im.convert("RGBA"), dithering_level=1.0,
        max_colors=256, min_quality=0, max_quality=93)
    buf = io.BytesIO()
    q.save(buf, "PNG", optimize=True)
    if not resized and buf.tell() > orig * PNG_KEEP_RATIO:
        return None  # gain insuffisant — on garde l'original
    with open(path, "wb") as f:
        f.write(buf.getvalue())
    return orig, buf.tell(), " (resize)" if resized else ""


def _optimize_jpg(path):
    im = Image.open(path)
    orig = os.path.getsize(path)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=JPG_QUALITY, optimize=True, progressive=True)
    if buf.tell() > orig * JPG_KEEP_RATIO:
        return None
    with open(path, "wb") as f:
        f.write(buf.getvalue())
    return orig, buf.tell(), ""


def run_family(family):
    tot_before = tot_after = n = 0
    print(f"── famille {family} ──")
    for path in _iter_images(family):
        rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
        ext = os.path.splitext(path)[1].lower()
        if _skip(rel) or ext not in (".png", ".jpg", ".jpeg"):
            continue
        res = _optimize_png(path, rel) if ext == ".png" else _optimize_jpg(path)
        if not res:
            continue
        before, after, note = res
        tot_before += before
        tot_after += after
        n += 1
        print(f"  ✓ {rel}{note}: {before // 1024} → {after // 1024} Ko")
    if n:
        gain = 100 * (1 - tot_after / tot_before)
        print(f"  {n} fichier(s) : {tot_before // 1024} → "
              f"{tot_after // 1024} Ko (−{gain:.0f} %)")
    else:
        print("  rien à faire (déjà optimisé).")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    targets = list(FAMILIES) if "--all" in sys.argv else args
    if not targets:
        sys.exit(f"Usage : optimize_images.py <{'|'.join(FAMILIES)}> | --all")
    for fam in targets:
        if fam not in FAMILIES:
            print(f"  ⚠️  famille inconnue : {fam} (ignorée)")
            continue
        run_family(fam)
