#!/usr/bin/env python3
"""asset_quality_scan.py — audit qualité des assets raster du jeu.

Repère les images susceptibles d'être d'origine « basse qualité » (export JPG
Copilot ré-encodé PNG, sous-résolution, opacité anormale) parmi les sprites
3D/iso et portraits : img/monsters, img/players, img/npc.

Métriques par fichier :
  - dims / mode / alpha%  (sujet = alpha>40)
  - sharp  : variance du Laplacien dans le sujet (bas = mou/flou)
  - grid   : signature de grille JPEG 8px (≳1.25 = blocs DCT ; NB : le
             rééchantillonnage Lanczos d'un JPG vers 512² efface souvent la
             grille → un score bas N'EXCLUT PAS une origine JPG)
  - edge   : luminance du liseré semi-transparent (très haut sur fond clair
             résiduel = halo de détourage)

Drapeaux : SMALL (<--min-side), OPAQUE (aucune transparence là où on l'attend),
BLOCKY (grid≥1.25).

Usage :
  python3 tools/asset_quality_scan.py                      # table triée
  python3 tools/asset_quality_scan.py --dirs img/monsters  # cibler
  python3 tools/asset_quality_scan.py --contact /tmp/qc    # planches visuelles
"""
import argparse, glob, os, sys, math
import numpy as np
from PIL import Image, ImageDraw

try:
    from scipy import ndimage
except Exception:
    ndimage = None


def _laplace_var(g, sub):
    if ndimage is None or not sub.any():
        return 0.0
    return float(ndimage.laplace(g)[sub].var())


def jpeg_grid(g, al):
    dx = np.abs(np.diff(g, axis=1)); dy = np.abs(np.diff(g, axis=0))
    wcol = al[:, 1:] > 40; wrow = al[1:, :] > 40
    col = (dx * wcol).sum(0) / (wcol.sum(0) + 1e-6)
    row = (dy * wrow).sum(1) / (wrow.sum(1) + 1e-6)
    def ratio(prof):
        i = np.arange(len(prof))
        on = prof[(i % 8) == 7]; off = prof[(i % 8) != 7]
        return on.mean() / (off.mean() + 1e-6)
    return (ratio(col) + ratio(row)) / 2


def scan_file(p):
    im = Image.open(p); W, H = im.size; mode = im.mode
    a = np.asarray(im.convert("RGBA")).astype(np.float32)
    rgb, al = a[..., :3], a[..., 3]
    g = rgb.mean(2)
    sub = al > 40
    semi = (al > 20) & (al < 200)
    return {
        "path": os.path.relpath(p), "w": W, "h": H, "mode": mode,
        "alpha": round(float((al < 250).mean()), 3),
        "sharp": round(_laplace_var(g, sub), 0),
        "grid": round(float(jpeg_grid(g, al)), 3),
        "edge": round(float(rgb[semi].mean()), 1) if semi.sum() > 50 else None,
    }


def contact(files, out, title, cols=7, thumb=120):
    rows = math.ceil(len(files) / cols); pad, lab = 4, 12
    W = cols * (thumb + pad) + pad; Hh = rows * (thumb + lab + pad) + pad
    sheet = Image.new("RGB", (W, Hh), (40, 40, 46)); d = ImageDraw.Draw(sheet)
    for k, p in enumerate(files):
        im = Image.open(p).convert("RGBA").resize((thumb, thumb), Image.LANCZOS)
        bg = Image.new("RGBA", (thumb, thumb), (70, 70, 78, 255)); bg.alpha_composite(im)
        r, c = divmod(k, cols)
        x = pad + c * (thumb + pad); y = pad + r * (thumb + lab + pad)
        sheet.paste(bg.convert("RGB"), (x, y))
        d.text((x, y + thumb), os.path.basename(p)[:18], fill=(220, 220, 220))
    sheet.save(out); print(f"  contact → {out} ({len(files)} items)")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dirs", nargs="*",
                    default=["img/monsters", "img/players", "img/npc"])
    ap.add_argument("--min-side", type=int, default=512)
    ap.add_argument("--contact", default=None, help="dossier de sortie des planches")
    ap.add_argument("--sort", default="sharp", choices=["sharp", "grid", "edge", "path"])
    args = ap.parse_args()

    rows = []
    for d in args.dirs:
        for p in sorted(glob.glob(os.path.join(d, "*.png"))):
            rows.append(scan_file(p))
    key = args.sort
    rows.sort(key=lambda r: (r[key] is None, r[key]))

    print(f"{'file':46s} {'dims':10s} {'mode':5s} {'alpha':6s} {'sharp':8s} {'grid':6s} {'edge':6s} flags")
    flagged = 0
    for r in rows:
        fl = []
        if min(r["w"], r["h"]) < args.min_side and not os.path.basename(r["path"]).startswith("_"):
            fl.append("SMALL")
        if r["alpha"] < 0.02:
            fl.append("OPAQUE")
        if r["grid"] >= 1.25:
            fl.append("BLOCKY")
        if fl:
            flagged += 1
        dims = "{}x{}".format(r["w"], r["h"])
        print(f"{r['path']:46s} {dims:10s} {r['mode']:5s} "
              f"{r['alpha']:<6} {str(r['sharp']):8s} {r['grid']:<6} "
              f"{str(r['edge']):6s} {','.join(fl)}")
    print(f"\n{len(rows)} scanned · {flagged} flagged (SMALL/OPAQUE/BLOCKY)")

    if args.contact:
        os.makedirs(args.contact, exist_ok=True)
        for d in args.dirs:
            fs = sorted(glob.glob(os.path.join(d, "*.png")))
            tag = os.path.basename(d.rstrip("/"))
            per = 28
            for i in range(0, len(fs), per):
                contact(fs[i:i + per], os.path.join(args.contact, f"{tag}_{i//per+1}.png"), tag)
    return 0


if __name__ == "__main__":
    sys.exit(main())
