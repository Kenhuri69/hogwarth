#!/usr/bin/env python3
"""Hogwarth RPG — Pixel art icon generator (48×48 RGBA, transparent bg, no AA).

Calqué sur gen_textures.py : Pillow uniquement, fonctions déterministes,
palette cohérente (parchemin/cuir/or). Sortie : img/icons/*.png.
"""

from PIL import Image
import random, os

S = 48  # taille standard d'icône

# ─── Palette ──────────────────────────────────────────────────
# Reprise de gen_textures.py + ajouts pour cuir/parchemin/métal
TR   = (0, 0, 0, 0)        # transparent

# Contour
OUT  = (12,   8,   6, 255)  # contour quasi noir
OUT2 = (28,  20,  14, 255)  # contour secondaire (ombres internes)

# Cuir (sac à dos)
LD   = (52,  30,  16, 255)  # cuir très foncé
LM   = (82,  50,  26, 255)  # cuir mid
LL   = (118, 76,  40, 255)  # cuir clair
LH   = (155,108, 64, 255)   # cuir highlight

# Parchemin (carte, scroll)
PD   = (158,128, 80, 255)   # parchemin foncé (ombre)
PM   = (208,180,128, 255)   # parchemin mid
PL   = (238,218,170, 255)   # parchemin clair
PH   = (252,240,210, 255)   # parchemin highlight

# Or / laiton
GD   = (115, 86, 15, 255)
GM   = (168,132, 26, 255)
GL   = (205,165, 45, 255)
GH   = (240,210, 90, 255)

# Rouge (couvertures, runes)
RD   = ( 95, 18, 18, 255)
RM   = (140, 32, 32, 255)
RL   = (178, 52, 52, 255)

# Encre
INK  = ( 30, 22, 18, 255)


# ─── Helpers ──────────────────────────────────────────────────
def blend(c1, c2, t):
    t = max(0.0, min(1.0, t))
    return tuple(max(0, min(255, int(c1[i] + (c2[i]-c1[i])*t))) for i in range(4))

def vary(c, rng, a=4):
    if c[3] == 0:
        return c
    return (
        max(0, min(255, c[0]+rng.randint(-a, a))),
        max(0, min(255, c[1]+rng.randint(-a, a))),
        max(0, min(255, c[2]+rng.randint(-a, a))),
        c[3],
    )

def putpx(img, x, y, c):
    if 0 <= x < S and 0 <= y < S:
        img.putpixel((x, y), c)

def fill_rect(img, x0, y0, x1, y1, c, rng=None, var=0):
    """Inclusif sur les deux bornes."""
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            col = vary(c, rng, var) if rng and var else c
            putpx(img, x, y, col)

def outline_rect(img, x0, y0, x1, y1, c=OUT):
    for x in range(x0, x1+1):
        putpx(img, x, y0, c)
        putpx(img, x, y1, c)
    for y in range(y0, y1+1):
        putpx(img, x0, y, c)
        putpx(img, x1, y, c)

def line(img, x0, y0, x1, y1, c):
    """Bresenham simple."""
    dx = abs(x1-x0); dy = -abs(y1-y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy
    x, y = x0, y0
    while True:
        putpx(img, x, y, c)
        if x == x1 and y == y1: break
        e2 = 2*err
        if e2 >= dy: err += dy; x += sx
        if e2 <= dx: err += dx; y += sy

def fill_circle(img, cx, cy, r, c):
    for dy in range(-r, r+1):
        for dx in range(-r, r+1):
            if dx*dx + dy*dy <= r*r:
                putpx(img, cx+dx, cy+dy, c)

def ring(img, cx, cy, r, c):
    for dy in range(-r, r+1):
        for dx in range(-r, r+1):
            d2 = dx*dx + dy*dy
            if (r-1)*(r-1) < d2 <= r*r:
                putpx(img, cx+dx, cy+dy, c)


# ═════════════════════════════════════════════════════════════
# 1. backpack.png — sac à dos en cuir
# ═════════════════════════════════════════════════════════════
def gen_backpack():
    rng = random.Random(3001)
    img = Image.new('RGBA', (S, S), TR)

    # Sangle supérieure (anse arrondie) : 2 piliers + barre haut
    # Anse gauche
    for y in range(8, 18):
        for x in range(13, 16):
            putpx(img, x, y, LD)
    # Anse droite
    for y in range(8, 18):
        for x in range(32, 35):
            putpx(img, x, y, LD)
    # Sommet de l'anse (arc)
    for x in range(15, 33):
        putpx(img, x, 7, LD)
        putpx(img, x, 8, LM)

    # Corps principal du sac : 9..40 horizontal, 14..43 vertical
    BX0, BY0, BX1, BY1 = 8, 14, 39, 42

    # Fond sombre
    for y in range(BY0, BY1+1):
        for x in range(BX0, BX1+1):
            # Forme légèrement arrondie aux coins (couper les coins)
            corner = ((x-BX0 < 2 and y-BY0 < 2) or
                      (BX1-x < 2 and y-BY0 < 2) or
                      (x-BX0 < 2 and BY1-y < 2) or
                      (BX1-x < 2 and BY1-y < 2))
            if corner and ((x-BX0)+(y-BY0) < 2 or (BX1-x)+(y-BY0) < 2 or
                           (x-BX0)+(BY1-y) < 2 or (BX1-x)+(BY1-y) < 2):
                continue
            # Gradient vertical : plus clair en haut
            t = (y - BY0) / max(1, BY1 - BY0)
            base = blend(LL, LD, 0.15 + t * 0.55)
            putpx(img, x, y, vary(base, rng, 5))

    # Highlight gauche (lumière)
    for y in range(BY0+2, BY1-1):
        col = blend(img.getpixel((BX0+1, y)), LH, 0.45)
        putpx(img, BX0+1, y, col)
    # Ombre droite
    for y in range(BY0+2, BY1-1):
        col = blend(img.getpixel((BX1-1, y)), LD, 0.55)
        putpx(img, BX1-1, y, col)

    # Rabat supérieur (flap) : trapèze 9..39 / 14..24
    for y in range(BY0, 25):
        for x in range(BX0, BX1+1):
            if (x-BX0 < 2 and y-BY0 < 2) or (BX1-x < 2 and y-BY0 < 2):
                continue
            col = blend(LM, LL, (24-y)/10)
            putpx(img, x, y, vary(col, rng, 4))
    # Bord inférieur du rabat (ombre)
    for x in range(BX0+1, BX1):
        putpx(img, x, 24, OUT2)
        putpx(img, x, 25, blend(LD, LM, 0.4))

    # Boucle métallique centrale (or) — sur le rabat
    BUX, BUY = 22, 22
    fill_rect(img, BUX, BUY, BUX+3, BUY+3, GM)
    putpx(img, BUX, BUY, GH)
    putpx(img, BUX+3, BUY+3, GD)
    # Lanière qui descend de la boucle
    for y in range(BUY+4, 30):
        putpx(img, BUX+1, y, LD)
        putpx(img, BUX+2, y, LD)

    # Poche frontale : petit rectangle bas centré
    PX0, PY0, PX1, PY1 = 14, 30, 33, 40
    for y in range(PY0, PY1+1):
        for x in range(PX0, PX1+1):
            t = (y - PY0) / max(1, PY1 - PY0)
            col = blend(LM, LD, 0.2 + t * 0.4)
            putpx(img, x, y, vary(col, rng, 3))
    outline_rect(img, PX0, PY0, PX1, PY1, OUT2)
    # Petite boucle de la poche
    fill_rect(img, 22, 35, 25, 37, GD)
    putpx(img, 22, 35, GM)

    # Coutures (pointillés clairs sur le rabat et la poche)
    for x in range(BX0+2, BX1-1, 2):
        putpx(img, x, 23, blend(LH, LM, 0.3))
    for x in range(PX0+1, PX1, 2):
        putpx(img, x, PY0+1, blend(LH, LM, 0.4))

    # Contour global du sac
    outline_rect(img, BX0, BY0, BX1, BY1, OUT)
    # Coins arrondis : effacer les pixels de coin
    for (cx, cy) in [(BX0,BY0),(BX1,BY0),(BX0,BY1),(BX1,BY1)]:
        putpx(img, cx, cy, TR)

    # Contour de l'anse
    line(img, 14, 7, 33, 7, OUT)
    putpx(img, 13, 8, OUT); putpx(img, 34, 8, OUT)
    for y in range(8, 14):
        putpx(img, 12, y, OUT)
        putpx(img, 16, y, OUT)
        putpx(img, 31, y, OUT)
        putpx(img, 35, y, OUT)

    return img


# ═════════════════════════════════════════════════════════════
# 2. map.png — carte parchemin enroulée
# ═════════════════════════════════════════════════════════════
def gen_map():
    rng = random.Random(3002)
    img = Image.new('RGBA', (S, S), TR)

    # Rouleau central : parchemin déplié 6..42 horizontal, 12..38 vertical
    PX0, PY0, PX1, PY1 = 6, 12, 41, 37

    # Corps du parchemin
    for y in range(PY0, PY1+1):
        for x in range(PX0, PX1+1):
            # Léger gradient + bruit
            t_v = (y - PY0) / max(1, PY1 - PY0)
            t_h = abs((x - (PX0+PX1)//2) / max(1, (PX1-PX0)//2))
            base = blend(PL, PM, 0.15 + t_h * 0.25 + t_v * 0.15)
            putpx(img, x, y, vary(base, rng, 5))

    # Bords irréguliers haut et bas (effet déchiré)
    for x in range(PX0, PX1+1):
        if rng.random() < 0.25:
            putpx(img, x, PY0, blend(PM, PD, 0.5))
        if rng.random() < 0.25:
            putpx(img, x, PY1, blend(PM, PD, 0.6))

    # Rouleaux de parchemin sur les côtés (cylindres verticaux)
    # Rouleau gauche : 3..7 horizontal
    for y in range(PY0-2, PY1+3):
        for x in range(3, 8):
            t = abs(x - 5) / 2
            col = blend(PH, PD, 0.3 + t * 0.5)
            putpx(img, x, y, vary(col, rng, 3))
    # Rouleau droit
    for y in range(PY0-2, PY1+3):
        for x in range(40, 45):
            t = abs(x - 42) / 2
            col = blend(PH, PD, 0.3 + t * 0.5)
            putpx(img, x, y, vary(col, rng, 3))

    # Contour des rouleaux
    for y in range(PY0-2, PY1+3):
        putpx(img, 2, y, OUT)
        putpx(img, 8, y, OUT2)
        putpx(img, 39, y, OUT2)
        putpx(img, 45, y, OUT)
    # Bouchons haut/bas des rouleaux
    for x in range(3, 8):
        putpx(img, x, PY0-2, OUT)
        putpx(img, x, PY1+2, OUT)
    for x in range(40, 45):
        putpx(img, x, PY0-2, OUT)
        putpx(img, x, PY1+2, OUT)

    # Ombre interne du parchemin contre les rouleaux
    for y in range(PY0, PY1+1):
        putpx(img, PX0, y, blend(PM, PD, 0.5))
        putpx(img, PX0+1, y, blend(PM, PD, 0.25))
        putpx(img, PX1, y, blend(PM, PD, 0.5))
        putpx(img, PX1-1, y, blend(PM, PD, 0.25))

    # Dessin sur la carte : routes et points
    # Route serpentine (encre brune)
    route = [(11,17),(15,18),(18,21),(22,22),(26,20),(30,23),(34,25),(37,27)]
    for i in range(len(route)-1):
        line(img, route[i][0], route[i][1], route[i+1][0], route[i+1][1], INK)
    # Points d'intérêt (croix rouges)
    for (cx, cy) in [(15, 18), (26, 20), (37, 27)]:
        putpx(img, cx, cy, RM)
        putpx(img, cx-1, cy, RD)
        putpx(img, cx+1, cy, RD)
        putpx(img, cx, cy-1, RD)
        putpx(img, cx, cy+1, RD)

    # Petite "rose des vents" (étoile) en haut à gauche du parchemin
    rx, ry = 12, 14
    for d in range(-2, 3):
        putpx(img, rx+d, ry, INK)
        putpx(img, rx, ry+d, INK)
    putpx(img, rx, ry, GD)

    # Tâches d'usure
    for _ in range(5):
        ux = rng.randint(PX0+2, PX1-2)
        uy = rng.randint(PY0+1, PY1-1)
        orig = img.getpixel((ux, uy))
        if orig[3] > 0:
            putpx(img, ux, uy, blend(orig, PD, 0.45))

    # Contour parchemin
    for x in range(PX0, PX1+1):
        if img.getpixel((x, PY0))[3] > 0:
            putpx(img, x, PY0-1 if PY0>0 else PY0, OUT2)
        if img.getpixel((x, PY1))[3] > 0:
            putpx(img, x, PY1+1 if PY1<S-1 else PY1, OUT2)

    return img


# ═════════════════════════════════════════════════════════════
# 3. spellbook.png — livre de sorts (couverture rouge + tranche or)
# ═════════════════════════════════════════════════════════════
def gen_spellbook():
    rng = random.Random(3003)
    img = Image.new('RGBA', (S, S), TR)

    # Livre vu de 3/4 : couverture rouge + tranche dorée à droite
    # Bloc principal couverture : 8..38 horizontal, 8..42 vertical
    BX0, BY0, BX1, BY1 = 8, 8, 38, 42

    # Tranche pages (à droite, légèrement décalée)
    PG_X = BX1
    for y in range(BY0+2, BY1):
        for dx in range(0, 4):
            x = PG_X + dx
            # Lignes horizontales pour évoquer les pages
            if y % 2 == 0:
                col = blend(PL, PM, dx * 0.2)
            else:
                col = blend(PM, PD, dx * 0.2)
            putpx(img, x, y+1, col)

    # Couverture (gradient rouge cuir)
    for y in range(BY0, BY1+1):
        for x in range(BX0, BX1+1):
            t = (y - BY0) / max(1, BY1 - BY0)
            base = blend(RM, RD, 0.2 + t * 0.4)
            # Léger highlight gauche
            if x - BX0 < 3:
                base = blend(base, RL, 0.3 - (x-BX0)*0.1)
            putpx(img, x, y, vary(base, rng, 4))

    # Reliure (bande verticale plus sombre + 2 nervures dorées)
    SP_X0, SP_X1 = BX0+1, BX0+4
    for y in range(BY0+1, BY1):
        for x in range(SP_X0, SP_X1+1):
            putpx(img, x, y, vary(RD, rng, 3))

    # Nervures or transversales
    for ny in (BY0+8, BY0+22):
        for x in range(BX0, BX1+1):
            putpx(img, x, ny, GD)
            putpx(img, x, ny+1, GM)
            putpx(img, x, ny-1, RD)

    # Pentacle / étoile dorée au centre
    cx, cy = (BX0+BX1)//2 + 1, (BY0+BY1)//2 + 1
    # Cercle externe
    ring(img, cx, cy, 7, GD)
    ring(img, cx, cy, 6, GM)
    # Étoile à 5 branches (approximation pixel)
    star_pts = [
        (cx, cy-6), (cx+2, cy-1), (cx+6, cy-1),
        (cx+3, cy+2), (cx+4, cy+6), (cx, cy+3),
        (cx-4, cy+6), (cx-3, cy+2), (cx-6, cy-1),
        (cx-2, cy-1),
    ]
    for i in range(len(star_pts)):
        a = star_pts[i]
        b = star_pts[(i+1) % len(star_pts)]
        line(img, a[0], a[1], b[0], b[1], GH)
    putpx(img, cx, cy, GH)

    # Coins or (équerres décoratives)
    for (qx, qy) in [(BX0, BY0), (BX1-2, BY0), (BX0, BY1-2), (BX1-2, BY1-2)]:
        for dy in range(0, 3):
            for dx in range(0, 3):
                if dx == 0 or dy == 0 or dx == 2 or dy == 2:
                    putpx(img, qx+dx, qy+dy, GM)
        putpx(img, qx+1, qy+1, GH)

    # Fermoir doré centre-droit (petite agrafe)
    fx0, fy0 = BX1-2, (BY0+BY1)//2 - 1
    for dy in range(0, 4):
        for dx in range(0, 3):
            putpx(img, fx0+dx, fy0+dy, GD)
    putpx(img, fx0+1, fy0+1, GH)

    # Contour
    outline_rect(img, BX0, BY0, BX1, BY1, OUT)
    # Contour droit pages
    for y in range(BY0+2, BY1+1):
        putpx(img, BX1+4, y, OUT)
    putpx(img, BX1+4, BY0+2, OUT)
    line(img, BX1, BY0, BX1+4, BY0+2, OUT)
    line(img, BX1, BY1, BX1+4, BY1+1, OUT)

    return img


# ─── Main ─────────────────────────────────────────────────────
TARGETS = [
    ('img/icons/backpack.png',  gen_backpack),
    ('img/icons/map.png',       gen_map),
    ('img/icons/spellbook.png', gen_spellbook),
]

if __name__ == '__main__':
    for path, fn in TARGETS:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        img = fn()
        img.save(path)
        print(f'✓ {path}')
    print(f'\n{len(TARGETS)} icons generated.')
