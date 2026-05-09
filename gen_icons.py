#!/usr/bin/env python3
"""Hogwarth RPG — Pixel art icon generator (48×48 RGBA, transparent bg, no AA).

Calqué sur gen_textures.py : Pillow uniquement, fonctions déterministes,
palette cohérente (parchemin/cuir/or). Sortie : img/icons/*.png.
"""

from PIL import Image, ImageDraw
import random, os, math

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

# Vert (bestiaire)
VD   = ( 28, 48, 24, 255)
VM   = ( 54, 86, 42, 255)
VL   = ( 82,124, 60, 255)

# Métal (loupe / sablier / engrenage)
MTD  = ( 60, 60, 70, 255)
MTM  = (110,110,125, 255)
MTL  = (170,170,185, 255)
MTH  = (220,220,235, 255)

# Verre / cristal bleu
GLD  = ( 80,110,140, 220)
GLM  = (150,180,210, 200)
GLL  = (220,235,250, 230)

# Sable doré (sablier)
SBD  = (180,130, 30, 255)
SBM  = (230,180, 60, 255)
SBL  = (255,220,110, 255)


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


# ═════════════════════════════════════════════════════════════
# 4. scroll.png — fiche personnage (parchemin vertical)
# ═════════════════════════════════════════════════════════════
def gen_scroll():
    rng = random.Random(3004)
    img = Image.new('RGBA', (S, S), TR)

    PX0, PX1 = 13, 34

    # Corps parchemin (zone déroulée verticale)
    for y in range(8, 40):
        for x in range(PX0, PX1+1):
            t_h = abs((x - 23) / 11)
            base = blend(PL, PM, 0.15 + t_h * 0.3)
            putpx(img, x, y, vary(base, rng, 4))

    # Rouleau haut
    for y in range(4, 9):
        for x in range(PX0-2, PX1+3):
            t = abs(y - 6) / 2
            col = blend(PH, PD, 0.3 + t * 0.5)
            putpx(img, x, y, vary(col, rng, 3))
    # Rouleau bas
    for y in range(39, 44):
        for x in range(PX0-2, PX1+3):
            t = abs(y - 41) / 2
            col = blend(PH, PD, 0.3 + t * 0.5)
            putpx(img, x, y, vary(col, rng, 3))

    # Contour rouleaux
    for x in range(PX0-2, PX1+3):
        putpx(img, x, 3, OUT)
        putpx(img, x, 9, OUT2)
        putpx(img, x, 39, OUT2)
        putpx(img, x, 44, OUT)
    for y in range(4, 9):
        putpx(img, PX0-2, y, OUT)
        putpx(img, PX1+2, y, OUT)
    for y in range(39, 44):
        putpx(img, PX0-2, y, OUT)
        putpx(img, PX1+2, y, OUT)

    # Lignes d'écriture (encre)
    for ly in (14, 18, 22, 31, 35):
        for x in range(PX0+2, PX1-1):
            if rng.random() < 0.7:
                putpx(img, x, ly, INK)

    # Sceau de cire rouge centré
    fill_circle(img, 23, 26, 3, RM)
    ring(img, 23, 26, 3, RD)
    putpx(img, 23, 26, GH)
    # Petite croix or sur le sceau
    putpx(img, 22, 26, GM); putpx(img, 24, 26, GM)
    putpx(img, 23, 25, GM); putpx(img, 23, 27, GM)

    # Ombre interne contre les rouleaux
    for x in range(PX0, PX1+1):
        putpx(img, x, 8, blend(PM, PD, 0.5))
        putpx(img, x, 39, blend(PM, PD, 0.5))

    return img


# ═════════════════════════════════════════════════════════════
# 5. bestiary.png — livre vert avec empreinte de bête
# ═════════════════════════════════════════════════════════════
def gen_bestiary():
    rng = random.Random(3005)
    img = Image.new('RGBA', (S, S), TR)

    BX0, BY0, BX1, BY1 = 8, 8, 38, 42

    # Tranche pages (à droite)
    for y in range(BY0+2, BY1):
        for dx in range(0, 4):
            x = BX1 + dx
            if y % 2 == 0:
                col = blend(PL, PM, dx * 0.2)
            else:
                col = blend(PM, PD, dx * 0.2)
            putpx(img, x, y+1, col)

    # Couverture verte
    for y in range(BY0, BY1+1):
        for x in range(BX0, BX1+1):
            t = (y - BY0) / max(1, BY1 - BY0)
            base = blend(VM, VD, 0.2 + t * 0.4)
            if x - BX0 < 3:
                base = blend(base, VL, 0.3 - (x-BX0)*0.1)
            putpx(img, x, y, vary(base, rng, 4))

    # Reliure (verticale gauche)
    for y in range(BY0+1, BY1):
        for x in range(BX0+1, BX0+5):
            putpx(img, x, y, vary(VD, rng, 3))

    # Empreinte de patte centrée (paume + 4 doigts) en or
    cx, cy = 24, 27
    # Paume (ovale)
    for dy in range(-3, 4):
        for dx in range(-4, 5):
            if (dx*dx)/16 + (dy*dy)/9 <= 1:
                putpx(img, cx+dx, cy+dy, GD)
    # Highlight paume
    for dy in range(-2, 1):
        for dx in range(-2, 1):
            if (dx*dx)/4 + (dy*dy)/3 <= 1:
                putpx(img, cx+dx, cy+dy, GM)

    # 4 doigts (petits ovales au-dessus de la paume)
    for fx, fy in [(cx-5, cy-7), (cx-2, cy-9), (cx+2, cy-9), (cx+5, cy-7)]:
        for dy in range(-2, 3):
            for dx in range(-1, 2):
                if (dx*dx)/1 + (dy*dy)/4 <= 1:
                    putpx(img, fx+dx, fy+dy, GD)
        putpx(img, fx, fy, GH)
        putpx(img, fx, fy-1, GM)

    # Coins métalliques
    for (qx, qy) in [(BX0, BY0), (BX1-2, BY0), (BX0, BY1-2), (BX1-2, BY1-2)]:
        for dy in range(0, 3):
            for dx in range(0, 3):
                if dx == 0 or dy == 0 or dx == 2 or dy == 2:
                    putpx(img, qx+dx, qy+dy, GM)
        putpx(img, qx+1, qy+1, GH)

    # Contour
    outline_rect(img, BX0, BY0, BX1, BY1, OUT)
    for y in range(BY0+2, BY1+1):
        putpx(img, BX1+4, y, OUT)
    line(img, BX1, BY0, BX1+4, BY0+2, OUT)
    line(img, BX1, BY1, BX1+4, BY1+1, OUT)

    return img


# ═════════════════════════════════════════════════════════════
# 6. quest.png — étoile dorée brillante
# ═════════════════════════════════════════════════════════════
def gen_quest():
    img = Image.new('RGBA', (S, S), TR)
    draw = ImageDraw.Draw(img)
    cx, cy = 23, 24

    def star_pts(r_out, r_in):
        pts = []
        for i in range(10):
            theta = -math.pi/2 + i * math.pi / 5
            r = r_out if i % 2 == 0 else r_in
            pts.append((cx + math.cos(theta) * r, cy + math.sin(theta) * r))
        return pts

    # Étoile externe (contour or foncé)
    draw.polygon(star_pts(17, 7), fill=GD, outline=OUT)
    # Étoile interne (or vif)
    draw.polygon(star_pts(13, 5), fill=GM)
    # Cœur lumineux
    draw.polygon(star_pts(8, 3), fill=GL)
    fill_circle(img, cx, cy, 2, GH)
    putpx(img, cx, cy, (255, 255, 230, 255))

    # Étincelles autour
    for (sx, sy) in [(8, 10), (40, 14), (5, 30), (42, 36), (24, 44)]:
        putpx(img, sx, sy, GH)
        putpx(img, sx-1, sy, GM)
        putpx(img, sx+1, sy, GM)
        putpx(img, sx, sy-1, GM)
        putpx(img, sx, sy+1, GM)

    return img


# ═════════════════════════════════════════════════════════════
# 7. search.png — loupe diagonale
# ═════════════════════════════════════════════════════════════
def gen_search():
    img = Image.new('RGBA', (S, S), TR)
    draw = ImageDraw.Draw(img)

    # Manche (cuir/bois) diagonal
    draw.line([(26, 26), (43, 43)], fill=OUT, width=8)
    draw.line([(27, 27), (42, 42)], fill=LD, width=6)
    draw.line([(28, 28), (41, 41)], fill=LM, width=4)
    draw.line([(29, 29), (40, 40)], fill=LL, width=2)
    # Embout du manche
    draw.ellipse([(38, 38), (46, 46)], fill=LD, outline=OUT)

    # Cadre métallique extérieur
    draw.ellipse([(3, 3), (29, 29)], fill=OUT)
    draw.ellipse([(4, 4), (28, 28)], fill=GD)
    draw.ellipse([(6, 6), (26, 26)], fill=GM)
    # Highlight haut-gauche du cadre
    draw.arc([(4, 4), (28, 28)], start=200, end=290, fill=GH, width=2)

    # Verre
    draw.ellipse([(8, 8), (24, 24)], fill=GLM)
    # Reflet verre
    draw.arc([(9, 9), (19, 19)], start=200, end=290, fill=GLL, width=2)

    # Connecteur lentille-manche (collier doré)
    draw.line([(23, 23), (28, 28)], fill=GD, width=4)
    draw.line([(23, 23), (28, 28)], fill=GM, width=2)

    return img


# ═════════════════════════════════════════════════════════════
# 8. rest.png — croissant de lune + étoiles
# ═════════════════════════════════════════════════════════════
def gen_rest():
    img = Image.new('RGBA', (S, S), TR)

    # Croissant : disque principal moins disque décalé
    cx1, cy1, r1 = 22, 22, 14
    cx2, cy2, r2 = 28, 18, 13
    for dy in range(-r1, r1+1):
        for dx in range(-r1, r1+1):
            d2 = dx*dx + dy*dy
            if d2 <= r1*r1:
                x, y = cx1+dx, cy1+dy
                ddx, ddy = x - cx2, y - cy2
                if ddx*ddx + ddy*ddy > r2*r2:
                    d_bord = r1 - d2**0.5
                    if d_bord < 0.7:
                        col = OUT
                    elif d_bord < 2:
                        col = GD
                    elif d_bord < 5:
                        col = GM
                    else:
                        col = GH
                    putpx(img, x, y, col)

    # Contour intérieur du croissant (limite avec disque "morsure")
    for dy in range(-r1, r1+1):
        for dx in range(-r1, r1+1):
            x, y = cx1+dx, cy1+dy
            if 0 <= x < S and 0 <= y < S:
                ddx, ddy = x - cx2, y - cy2
                d2 = ddx*ddx + ddy*ddy
                if r2*r2 < d2 <= (r2+1)*(r2+1):
                    if dx*dx + dy*dy <= r1*r1:
                        putpx(img, x, y, OUT)

    # Étoiles autour
    stars = [(7, 10, 2), (40, 8, 1), (43, 26, 2), (8, 38, 1), (38, 40, 1)]
    for sx, sy, r in stars:
        if r == 2:
            for d in range(-2, 3):
                putpx(img, sx+d, sy, GM)
                putpx(img, sx, sy+d, GM)
            putpx(img, sx-1, sy, GH); putpx(img, sx+1, sy, GH)
            putpx(img, sx, sy-1, GH); putpx(img, sx, sy+1, GH)
            putpx(img, sx, sy, (255, 255, 230, 255))
        else:
            putpx(img, sx, sy, GH)
            putpx(img, sx-1, sy, GM)
            putpx(img, sx+1, sy, GM)
            putpx(img, sx, sy-1, GM)
            putpx(img, sx, sy+1, GM)

    return img


# ═════════════════════════════════════════════════════════════
# 9. save.png — sablier doré
# ═════════════════════════════════════════════════════════════
def gen_save():
    rng = random.Random(3008)
    img = Image.new('RGBA', (S, S), TR)
    draw = ImageDraw.Draw(img)

    # Plaques haut/bas (laiton)
    draw.rectangle([(8, 6), (40, 11)], fill=GD, outline=OUT)
    draw.rectangle([(9, 7), (39, 10)], fill=GM)
    putpx(img, 10, 7, GH)
    draw.rectangle([(8, 36), (40, 41)], fill=GD, outline=OUT)
    draw.rectangle([(9, 37), (39, 40)], fill=GM)
    putpx(img, 10, 37, GH)

    # Montants verticaux
    for y in range(11, 37):
        putpx(img, 9, y, OUT)
        putpx(img, 10, y, GD)
        putpx(img, 38, y, OUT)
        putpx(img, 39, y, GD)

    # Verre triangulaire (haut + bas)
    for y in range(12, 24):
        delta = y - 12
        for x in range(13 + delta, 36 - delta):
            putpx(img, x, y, GLM)
    for y in range(24, 36):
        delta = 35 - y
        for x in range(13 + delta, 36 - delta):
            putpx(img, x, y, GLM)

    # Sable haut (dégressif vers le bas)
    for y in range(13, 22):
        delta = y - 12
        for x in range(14 + delta, 35 - delta):
            putpx(img, x, y, vary(SBM, rng, 8))
    # Filet de sable
    for y in range(22, 28):
        putpx(img, 23, y, SBL)
        putpx(img, 24, y, SBD)
    # Tas en bas (forme triangulaire inversée)
    for y in range(28, 36):
        delta = 35 - y
        height = 35 - y
        for x in range(13 + delta, 36 - delta):
            if abs(x - 23) <= (35 - y - 1) and y >= 30:
                putpx(img, x, y, vary(SBM, rng, 8))

    # Contours triangles verre
    line(img, 12, 12, 36, 12, OUT)
    line(img, 12, 12, 23, 23, OUT)
    line(img, 36, 12, 24, 23, OUT)
    line(img, 12, 35, 36, 35, OUT)
    line(img, 23, 24, 12, 35, OUT)
    line(img, 24, 24, 36, 35, OUT)

    return img


# ═════════════════════════════════════════════════════════════
# 10. load.png — coffre ouvert avec lumière dorée
# ═════════════════════════════════════════════════════════════
def gen_load():
    rng = random.Random(3009)
    img = Image.new('RGBA', (S, S), TR)
    draw = ImageDraw.Draw(img)

    # Caisse (corps inférieur)
    BX0, BY0, BX1, BY1 = 6, 24, 41, 42
    for y in range(BY0, BY1+1):
        for x in range(BX0, BX1+1):
            t = (y - BY0) / max(1, BY1 - BY0)
            base = blend(LM, LD, 0.1 + t * 0.5)
            putpx(img, x, y, vary(base, rng, 4))

    # Bandes métalliques verticales
    for x in (12, 23, 34):
        for y in range(BY0, BY1+1):
            putpx(img, x, y, GD)
            putpx(img, x+1, y, GM)
        putpx(img, x, BY0, GH)
        putpx(img, x+1, BY0, GH)

    outline_rect(img, BX0, BY0, BX1, BY1, OUT)

    # Couvercle ouvert (trapèze incliné vers l'arrière)
    pts_ext = [(8, 24), (39, 24), (35, 12), (12, 12)]
    draw.polygon(pts_ext, fill=LM, outline=OUT)
    pts_int = [(11, 23), (36, 23), (33, 14), (14, 14)]
    draw.polygon(pts_int, fill=LD)

    # Trésor à l'intérieur (or visible dans l'ouverture)
    for (gx, gy) in [(13, 26), (18, 27), (23, 26), (28, 27), (33, 26),
                     (15, 30), (21, 30), (26, 30), (32, 30)]:
        if 0 <= gx < S and 0 <= gy < S:
            putpx(img, gx, gy, GH)
            putpx(img, gx-1, gy, GM)
            putpx(img, gx+1, gy, GM)
            putpx(img, gx, gy+1, GD)

    # Rayons de lumière dorée vers le haut
    for x in range(13, 35):
        if rng.random() < 0.5:
            for y in range(16, 24):
                if 0 <= x < S and 0 <= y < S:
                    orig = img.getpixel((x, y))
                    if orig[3] > 0:
                        new = blend(orig, (255, 230, 120, 255), 0.35)
                        putpx(img, x, y, new)

    # Serrure dorée centrale sur la caisse
    fill_rect(img, 22, 32, 25, 38, GD)
    putpx(img, 22, 32, GH)
    putpx(img, 23, 35, OUT)  # trou de serrure

    return img


# ═════════════════════════════════════════════════════════════
# 11. gear.png — engrenage métallique
# ═════════════════════════════════════════════════════════════
def gen_gear():
    img = Image.new('RGBA', (S, S), TR)
    draw = ImageDraw.Draw(img)
    cx, cy = 23, 23

    # 8 dents (rectangles disposés autour)
    for i in range(8):
        theta = i * math.pi / 4
        # Position de la dent
        tx = cx + math.cos(theta) * 17
        ty = cy + math.sin(theta) * 17
        # Rotation : dent rectangulaire
        # Approximation simple : carré de 7×5 perpendiculaire au rayon
        sin_t, cos_t = math.sin(theta), math.cos(theta)
        for dy in range(-3, 4):
            for dx in range(-2, 3):
                # Rotation
                rx = dx * cos_t - dy * sin_t
                ry = dx * sin_t + dy * cos_t
                px = int(round(tx + rx))
                py = int(round(ty + ry))
                if 0 <= px < S and 0 <= py < S:
                    if abs(dx) == 2 or abs(dy) == 3:
                        putpx(img, px, py, OUT)
                    else:
                        putpx(img, px, py, MTM)

    # Disque central
    fill_circle(img, cx, cy, 13, OUT)
    fill_circle(img, cx, cy, 12, MTD)
    fill_circle(img, cx, cy, 11, MTM)
    # Highlight diagonal
    for dy in range(-11, 0):
        for dx in range(-11, 0):
            d2 = dx*dx + dy*dy
            if d2 <= 81 and dx + dy < -8:
                putpx(img, cx+dx, cy+dy, MTL)

    # Trou central
    fill_circle(img, cx, cy, 4, OUT)
    fill_circle(img, cx, cy, 3, MTD)
    putpx(img, cx-1, cy-1, MTL)

    # Petits trous décoratifs (typique sur un engrenage)
    for i in range(4):
        theta = math.pi/4 + i * math.pi/2
        hx = cx + int(math.cos(theta) * 7)
        hy = cy + int(math.sin(theta) * 7)
        fill_circle(img, hx, hy, 1, OUT)

    return img


# ═════════════════════════════════════════════════════════════
# 12-13. music_on.png / music_off.png
# ═════════════════════════════════════════════════════════════
def _draw_note(img, draw, color_head, color_stem):
    # Tête de note (ovale incliné) en bas-gauche
    draw.ellipse([(11, 28), (22, 38)], fill=color_head, outline=OUT)
    # Hampe
    draw.line([(21, 33), (21, 8)], fill=color_stem, width=3)
    putpx(img, 21, 8, OUT); putpx(img, 22, 8, OUT)
    # Drapeau / crochet en haut
    pts = [(22, 8), (34, 12), (34, 18), (22, 14)]
    draw.polygon(pts, fill=color_stem, outline=OUT)
    # Highlight tête
    putpx(img, 13, 30, GH)

def gen_music_on():
    img = Image.new('RGBA', (S, S), TR)
    draw = ImageDraw.Draw(img)
    _draw_note(img, draw, GM, GD)
    return img

def gen_music_off():
    img = Image.new('RGBA', (S, S), TR)
    draw = ImageDraw.Draw(img)
    # Note grisée
    GREY_M = (110, 100, 90, 255)
    GREY_D = ( 70,  60,  55, 255)
    _draw_note(img, draw, GREY_M, GREY_D)
    # Barre rouge en travers (interdit)
    draw.line([(4, 4), (43, 43)], fill=OUT, width=5)
    draw.line([(5, 5), (42, 42)], fill=RL, width=3)
    draw.line([(6, 6), (41, 41)], fill=RM, width=1)
    return img


# ═════════════════════════════════════════════════════════════
# 14-15. voice_on.png / voice_off.png — bulle de dialogue
# ═════════════════════════════════════════════════════════════
def _draw_speech(img, draw, color_fill, color_dot):
    # Bulle arrondie
    draw.rounded_rectangle([(4, 8), (42, 32)], radius=6, fill=color_fill, outline=OUT)
    # Queue de la bulle (triangle bas-gauche)
    pts = [(12, 30), (10, 40), (22, 32)]
    draw.polygon(pts, fill=color_fill, outline=OUT)
    # Re-dessiner haut de la queue pour masquer la jonction
    draw.line([(12, 31), (22, 31)], fill=color_fill, width=1)
    # 3 points d'élocution
    for cxd in (14, 23, 32):
        fill_circle(img, cxd, 20, 2, color_dot)

def gen_voice_on():
    img = Image.new('RGBA', (S, S), TR)
    draw = ImageDraw.Draw(img)
    _draw_speech(img, draw, PL, INK)
    # Petites ondes sonores à droite
    for i, r in enumerate((8, 12)):
        for theta in range(-30, 31, 5):
            rad = math.radians(theta)
            px = int(36 + math.cos(rad) * r)
            py = int(20 + math.sin(rad) * r)
            if 0 <= px < S and 0 <= py < S and img.getpixel((px, py))[3] == 0:
                putpx(img, px, py, GD if i == 0 else GM)
    return img

def gen_voice_off():
    img = Image.new('RGBA', (S, S), TR)
    draw = ImageDraw.Draw(img)
    GREY_PL = (160, 150, 140, 255)
    GREY_INK = (60, 55, 50, 255)
    _draw_speech(img, draw, GREY_PL, GREY_INK)
    # Barre rouge en travers
    draw.line([(4, 4), (43, 43)], fill=OUT, width=5)
    draw.line([(5, 5), (42, 42)], fill=RL, width=3)
    draw.line([(6, 6), (41, 41)], fill=RM, width=1)
    return img


# ═════════════════════════════════════════════════════════════
# PHASE 1 — UI chrome + HUD stats
# ═════════════════════════════════════════════════════════════

# Couleurs additionnelles pour Phase 1
HP_D  = (140, 22, 22, 255)   # rouge HP foncé
HP_M  = (200, 50, 50, 255)
HP_L  = (240,100,100, 255)
HP_H  = (255,180,170, 255)

MP_D  = ( 30, 60,140, 255)   # bleu MP foncé
MP_M  = ( 70,120,210, 255)
MP_L  = (140,190,250, 255)
MP_H  = (220,235,255, 255)

XP_D  = (180,130, 30, 255)   # or XP (réutilise sable doré)
XP_M  = (230,180, 60, 255)
XP_L  = (255,220,110, 255)
XP_H  = (255,245,180, 255)

ROSE  = (200,120,140, 255)   # cerveau
ROSE_D= (140, 70, 90, 255)
ROSE_L= (240,180,200, 255)

PURPLE= (110, 60,160, 255)   # crystal ball
PURPLE_M=(150,100,200, 255)
PURPLE_L=(200,170,240, 255)


def gen_hp():
    """⚡ HP — éclair rouge à contour or."""
    img = Image.new('RGBA', (S, S), TR)
    # Polygone éclair stylisé. Points en pixel (haut→bas, zigzag).
    # On dessine plein, puis contour, puis highlight.
    bolt_fill = [
        (28,5),(29,5),(30,5),(31,5),(32,5),
        (25,6),(26,6),(27,6),(28,6),(29,6),(30,6),(31,6),(32,6),(33,6),
        (23,7),(24,7),(25,7),(26,7),(27,7),(28,7),(29,7),(30,7),(31,7),(32,7),(33,7),
        (22,8),(23,8),(24,8),(25,8),(26,8),(27,8),(28,8),(29,8),(30,8),(31,8),(32,8),
        (20,9),(21,9),(22,9),(23,9),(24,9),(25,9),(26,9),(27,9),(28,9),(29,9),(30,9),(31,9),
        (19,10),(20,10),(21,10),(22,10),(23,10),(24,10),(25,10),(26,10),(27,10),(28,10),(29,10),(30,10),
        (18,11),(19,11),(20,11),(21,11),(22,11),(23,11),(24,11),(25,11),(26,11),(27,11),(28,11),(29,11),
        (17,12),(18,12),(19,12),(20,12),(21,12),(22,12),(23,12),(24,12),(25,12),(26,12),(27,12),(28,12),
        (16,13),(17,13),(18,13),(19,13),(20,13),(21,13),(22,13),(23,13),(24,13),(25,13),(26,13),(27,13),
        (15,14),(16,14),(17,14),(18,14),(19,14),(20,14),(21,14),(22,14),(23,14),(24,14),(25,14),(26,14),
        (14,15),(15,15),(16,15),(17,15),(18,15),(19,15),(20,15),(21,15),(22,15),(23,15),(24,15),(25,15),
        (13,16),(14,16),(15,16),(16,16),(17,16),(18,16),(19,16),(20,16),(21,16),(22,16),(23,16),(24,16),
        (13,17),(14,17),(15,17),(16,17),(17,17),(18,17),(19,17),(20,17),(21,17),(22,17),(23,17),(24,17),(25,17),(26,17),(27,17),(28,17),(29,17),(30,17),(31,17),(32,17),(33,17),(34,17),(35,17),
        (15,18),(16,18),(17,18),(18,18),(19,18),(20,18),(21,18),(22,18),(23,18),(24,18),(25,18),(26,18),(27,18),(28,18),(29,18),(30,18),(31,18),(32,18),(33,18),(34,18),
        (17,19),(18,19),(19,19),(20,19),(21,19),(22,19),(23,19),(24,19),(25,19),(26,19),(27,19),(28,19),(29,19),(30,19),(31,19),(32,19),(33,19),
        (18,20),(19,20),(20,20),(21,20),(22,20),(23,20),(24,20),(25,20),(26,20),(27,20),(28,20),(29,20),(30,20),(31,20),(32,20),
        (19,21),(20,21),(21,21),(22,21),(23,21),(24,21),(25,21),(26,21),(27,21),(28,21),(29,21),(30,21),
        (20,22),(21,22),(22,22),(23,22),(24,22),(25,22),(26,22),(27,22),(28,22),(29,22),
        (20,23),(21,23),(22,23),(23,23),(24,23),(25,23),(26,23),(27,23),(28,23),
        (19,24),(20,24),(21,24),(22,24),(23,24),(24,24),(25,24),(26,24),(27,24),
        (18,25),(19,25),(20,25),(21,25),(22,25),(23,25),(24,25),(25,25),(26,25),
        (17,26),(18,26),(19,26),(20,26),(21,26),(22,26),(23,26),(24,26),(25,26),
        (16,27),(17,27),(18,27),(19,27),(20,27),(21,27),(22,27),(23,27),(24,27),
        (15,28),(16,28),(17,28),(18,28),(19,28),(20,28),(21,28),(22,28),(23,28),
        (14,29),(15,29),(16,29),(17,29),(18,29),(19,29),(20,29),(21,29),(22,29),
        (13,30),(14,30),(15,30),(16,30),(17,30),(18,30),(19,30),(20,30),(21,30),
        (12,31),(13,31),(14,31),(15,31),(16,31),(17,31),(18,31),(19,31),(20,31),
        (11,32),(12,32),(13,32),(14,32),(15,32),(16,32),(17,32),(18,32),(19,32),
        (10,33),(11,33),(12,33),(13,33),(14,33),(15,33),(16,33),(17,33),(18,33),
        ( 9,34),(10,34),(11,34),(12,34),(13,34),(14,34),(15,34),(16,34),(17,34),
        ( 8,35),( 9,35),(10,35),(11,35),(12,35),(13,35),(14,35),(15,35),(16,35),
        ( 7,36),( 8,36),( 9,36),(10,36),(11,36),(12,36),(13,36),(14,36),(15,36),
        ( 7,37),( 8,37),( 9,37),(10,37),(11,37),(12,37),(13,37),(14,37),
        ( 8,38),( 9,38),(10,38),(11,38),(12,38),(13,38),
        ( 9,39),(10,39),(11,39),(12,39),
        (10,40),(11,40),
    ]
    rng = random.Random(3101)
    for (x, y) in bolt_fill:
        # gradient diagonal : haut-droite plus clair, bas-gauche plus foncé
        t = ((S - x) + y) / (2 * S)
        col = blend(HP_L, HP_D, t)
        putpx(img, x, y, vary(col, rng, 6))
    # Highlight central
    for (x, y) in [(24,9),(23,10),(22,11),(21,12),(20,13),(19,14),(18,15),(28,18),(27,19),(26,20),
                   (25,21),(24,22),(23,23),(22,24),(15,30),(14,31),(13,32),(12,33),(11,34)]:
        putpx(img, x, y, HP_H)
    # Contour or
    pixels = set(bolt_fill)
    for (x, y) in pixels:
        for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)]:
            nx, ny = x+dx, y+dy
            if (nx, ny) not in pixels and 0 <= nx < S and 0 <= ny < S and img.getpixel((nx, ny))[3] == 0:
                putpx(img, nx, ny, GM)
    return img


def gen_mp():
    """✨ MP — étincelle bleue à 4 branches."""
    img = Image.new('RGBA', (S, S), TR)
    cx, cy = 24, 24
    rng = random.Random(3102)
    # Branche verticale
    for y in range(4, 44):
        # largeur diminue avec la distance au centre
        d = abs(y - cy)
        w = max(0, 4 - d // 4)
        for x in range(cx - w, cx + w + 1):
            t = d / 20
            col = blend(MP_L, MP_D, t)
            putpx(img, x, y, vary(col, rng, 5))
    # Branche horizontale
    for x in range(4, 44):
        d = abs(x - cx)
        w = max(0, 4 - d // 4)
        for y in range(cy - w, cy + w + 1):
            if img.getpixel((x, y))[3] > 0:
                continue
            t = d / 20
            col = blend(MP_L, MP_D, t)
            putpx(img, x, y, vary(col, rng, 5))
    # Branches diagonales (fines)
    for r in range(5, 20):
        for (dx, dy) in [(1,1),(1,-1),(-1,1),(-1,-1)]:
            x, y = cx + dx*r, cy + dy*r
            if r < 14:
                col = MP_M if r > 9 else MP_L
                putpx(img, x, y, col)
    # Coeur très brillant
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            if dx*dx + dy*dy <= 6:
                putpx(img, cx+dx, cy+dy, MP_H)
    # Coeur central blanc
    fill_circle(img, cx, cy, 1, (255, 255, 255, 255))
    # Outline
    pixels = []
    for y in range(S):
        for x in range(S):
            if img.getpixel((x, y))[3] > 0:
                pixels.append((x, y))
    pset = set(pixels)
    for (x, y) in pixels:
        for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)]:
            nx, ny = x+dx, y+dy
            if (nx, ny) not in pset and 0 <= nx < S and 0 <= ny < S and img.getpixel((nx, ny))[3] == 0:
                putpx(img, nx, ny, OUT2)
    return img


def gen_xp():
    """🌟 XP — étoile dorée 5 branches."""
    img = Image.new('RGBA', (S, S), TR)
    cx, cy = 24, 25
    # Calcul des sommets : 5 branches externes (r=20) et 5 internes (r=8)
    R_OUT, R_IN = 20, 8
    pts = []
    for i in range(10):
        ang = -math.pi/2 + i * math.pi / 5
        r = R_OUT if i % 2 == 0 else R_IN
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    # Remplissage par scanline
    rng = random.Random(3103)
    for y in range(S):
        # intersections avec les arêtes du polygone
        xs = []
        n = len(pts)
        for i in range(n):
            x0, y0 = pts[i]
            x1, y1 = pts[(i+1) % n]
            if (y0 <= y < y1) or (y1 <= y < y0):
                t = (y - y0) / (y1 - y0) if (y1 - y0) != 0 else 0
                xs.append(x0 + t * (x1 - x0))
        xs.sort()
        for i in range(0, len(xs)-1, 2):
            xa, xb = int(xs[i]), int(xs[i+1])
            for x in range(xa, xb+1):
                # gradient haut clair → bas foncé
                t = (y - 5) / 35
                col = blend(XP_L, XP_D, max(0.0, min(1.0, t)))
                putpx(img, x, y, vary(col, rng, 5))
    # Highlight haut-gauche
    for (x, y) in [(22,8),(23,8),(24,7),(21,10),(22,10),(20,12),(21,12),
                   (18,14),(19,14),(17,17),(18,17)]:
        putpx(img, x, y, XP_H)
    # Outline
    pixels = []
    for y in range(S):
        for x in range(S):
            if img.getpixel((x, y))[3] > 0:
                pixels.append((x, y))
    pset = set(pixels)
    for (x, y) in pixels:
        for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)]:
            nx, ny = x+dx, y+dy
            if (nx, ny) not in pset and 0 <= nx < S and 0 <= ny < S and img.getpixel((nx, ny))[3] == 0:
                putpx(img, nx, ny, OUT)
    return img


def gen_gold():
    """🪙 Gallion — disque doré à anneau et G central."""
    img = Image.new('RGBA', (S, S), TR)
    cx, cy = 24, 24
    rng = random.Random(3104)
    # Disque externe
    for dy in range(-19, 20):
        for dx in range(-19, 20):
            d2 = dx*dx + dy*dy
            if d2 > 19*19: continue
            t = (dy + 19) / 38  # gradient haut clair → bas foncé
            base = blend(XP_L, XP_D, t)
            putpx(img, cx+dx, cy+dy, vary(base, rng, 6))
    # Anneau intérieur (relief)
    ring(img, cx, cy, 14, GD)
    # Highlight haut-gauche
    for theta in range(180, 270, 2):
        rad = math.radians(theta)
        x = int(cx + 17 * math.cos(rad))
        y = int(cy + 17 * math.sin(rad))
        putpx(img, x, y, XP_H)
        putpx(img, x-1, y, XP_H)
    # Lettre G stylisée au centre (5x7)
    G_PIX = [
        (0,1),(0,2),(0,3),(0,4),(0,5),
        (1,0),(2,0),(3,0),
        (1,6),(2,6),(3,6),
        (4,1),(4,5),(4,6),
        (3,3),(2,3),(2,4),(3,4),
    ]
    gx0, gy0 = cx-2, cy-3
    for (px, py) in G_PIX:
        putpx(img, gx0+px, gy0+py, GD)
    # Contour disque
    for dy in range(-20, 21):
        for dx in range(-20, 21):
            d2 = dx*dx + dy*dy
            if 19*19 < d2 <= 20*20:
                putpx(img, cx+dx, cy+dy, OUT)
    return img


def gen_atk():
    """⚔️ ATK — épées croisées."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3105)
    # Épée 1 : diagonale ↘ (de haut-gauche vers bas-droite)
    # Lame
    for i in range(28):
        x = 8 + i
        y = 8 + i
        for w in range(-2, 3):
            putpx(img, x+w, y-w, blend(MTH, MTM, abs(w)/2.5))
    # Épée 2 : diagonale ↙ (de haut-droite vers bas-gauche)
    for i in range(28):
        x = 39 - i
        y = 8 + i
        for w in range(-2, 3):
            col = blend(MTH, MTM, abs(w)/2.5)
            if img.getpixel((x+w, y+w))[3] > 0:
                continue
            putpx(img, x+w, y+w, col)
    # Garde épée 1 (haut-gauche, perpendiculaire)
    for i in range(-3, 4):
        putpx(img, 11+i, 5+i, GD)
        putpx(img, 12+i, 5+i, GM)
        putpx(img, 13+i, 5+i, GD)
    # Garde épée 2
    for i in range(-3, 4):
        putpx(img, 36-i, 5+i, GD)
        putpx(img, 35-i, 5+i, GM)
        putpx(img, 34-i, 5+i, GD)
    # Pommeaux (or)
    fill_circle(img, 38, 38, 2, GD)
    fill_circle(img, 38, 38, 1, GM)
    fill_circle(img,  9, 38, 2, GD)
    fill_circle(img,  9, 38, 1, GM)
    # Manches en cuir
    for i in range(0, 4):
        putpx(img, 36+i, 36+i, LD)
        putpx(img, 11-i, 36+i, LD)
    # Contours sur lames (assurer la lisibilité)
    for y in range(S):
        for x in range(S):
            p = img.getpixel((x, y))
            if p[3] == 0: continue
            for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)]:
                nx, ny = x+dx, y+dy
                if 0 <= nx < S and 0 <= ny < S and img.getpixel((nx, ny))[3] == 0:
                    putpx(img, nx, ny, OUT)
    return img


def gen_def():
    """🛡️ DEF — bouclier (heater) bleu et or."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3106)
    # Forme heater : trapèze haut, pointe en bas
    # Top edge y=6, sides droites jusqu'à y=26, courbure jusqu'à pointe y=42
    SHIELD = (40, 70,140, 255)
    SHIELD_M = (70,110,180, 255)
    SHIELD_L = (130,170,220, 255)
    for y in range(6, 43):
        if y <= 26:
            # Trapèze : largeur croît de 16 à 18
            half = 14 + (y - 6) // 10
        else:
            # Pointe : largeur décroît
            t = (y - 26) / 16
            half = int(18 * (1 - t * t))
        for x in range(24-half, 24+half+1):
            t = (y - 6) / 36
            base = blend(SHIELD_L, SHIELD, 0.2 + t * 0.6)
            putpx(img, x, y, vary(base, rng, 5))
    # Bord supérieur or
    for x in range(8, 41):
        if img.getpixel((x, 6))[3] > 0:
            putpx(img, x, 6, GM)
            putpx(img, x, 5, GD)
    # Croix or sur bouclier
    for y in range(10, 36):
        if img.getpixel((23, y))[3] > 0:
            putpx(img, 23, y, GM)
            putpx(img, 24, y, GL)
            putpx(img, 25, y, GM)
    for x in range(13, 36):
        for dy in (-1, 0, 1):
            y = 18 + dy
            if img.getpixel((x, y))[3] > 0 and abs(x-24) > 2:
                putpx(img, x, y, GL if dy == 0 else GM)
    # Outline noir
    for y in range(S):
        for x in range(S):
            p = img.getpixel((x, y))
            if p[3] == 0: continue
            for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)]:
                nx, ny = x+dx, y+dy
                if 0 <= nx < S and 0 <= ny < S and img.getpixel((nx, ny))[3] == 0:
                    putpx(img, nx, ny, OUT)
    return img


def gen_str():
    """💪 STR — haltère (dumbbell) métallique."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3107)
    cy = 24
    # Plaque gauche : rectangle 8×26
    for y in range(11, 38):
        for x in range(6, 14):
            t = (x - 6) / 8  # gauche clair → droit foncé
            col = blend(MTH, MTD, 0.2 + t * 0.6)
            putpx(img, x, y, vary(col, rng, 4))
    # Plaque droite (mirroir)
    for y in range(11, 38):
        for x in range(34, 42):
            t = (42 - x) / 8
            col = blend(MTH, MTD, 0.2 + t * 0.6)
            putpx(img, x, y, vary(col, rng, 4))
    # Petit liseré entre la plaque et la barre (gauche)
    for y in range(15, 34):
        for x in range(14, 17):
            putpx(img, x, y, MTM)
    # Petit liseré (droite)
    for y in range(15, 34):
        for x in range(31, 34):
            putpx(img, x, y, MTM)
    # Barre (cylindrique avec hachures)
    for y in range(20, 29):
        for x in range(15, 33):
            t = abs(y - 24) / 5
            col = blend(MTH, MTD, t)
            putpx(img, x, y, vary(col, rng, 3))
    # Hachures sur la barre (grip)
    for x in range(17, 31, 2):
        for y in range(21, 28):
            putpx(img, x, y, MTD)
    # Outline
    for y in range(S):
        for x in range(S):
            p = img.getpixel((x, y))
            if p[3] == 0: continue
            for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)]:
                nx, ny = x+dx, y+dy
                if 0 <= nx < S and 0 <= ny < S and img.getpixel((nx, ny))[3] == 0:
                    putpx(img, nx, ny, OUT)
    return img


def gen_int():
    """🧠 INT — cerveau rose."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3108)
    cx, cy = 24, 25
    # Forme globale : 2 hémisphères ovales
    for dy in range(-15, 16):
        for dx in range(-17, 18):
            d2 = (dx*dx)/1.4 + (dy*dy)/1.0
            if d2 > 16*16: continue
            t = (dy + 15) / 30
            base = blend(ROSE_L, ROSE_D, 0.2 + t * 0.5)
            putpx(img, cx+dx, cy+dy, vary(base, rng, 8))
    # Sillon central (vertical)
    for y in range(cy-13, cy+14):
        for w in range(-1, 2):
            x = cx + w
            putpx(img, x, y, ROSE_D)
    # Plis aléatoires (déterministes)
    folds = [
        [(cx-12, cy-6),(cx-9, cy-9),(cx-6, cy-7),(cx-4, cy-10)],
        [(cx-13, cy+2),(cx-9, cy+5),(cx-6, cy+3)],
        [(cx-11, cy+10),(cx-7, cy+12),(cx-4, cy+10)],
        [(cx+4, cy-10),(cx+7, cy-7),(cx+10, cy-9),(cx+13, cy-5)],
        [(cx+5, cy+3),(cx+9, cy+5),(cx+13, cy+2)],
        [(cx+3, cy+10),(cx+7, cy+12),(cx+11, cy+10)],
    ]
    for path in folds:
        for i in range(len(path)-1):
            line(img, path[i][0], path[i][1], path[i+1][0], path[i+1][1], ROSE_D)
    # Highlights aléatoires
    for (x, y) in [(cx-10, cy-3),(cx-5, cy-7),(cx-7, cy+1),(cx+5, cy-5),(cx+9, cy-1),(cx+3, cy+7)]:
        putpx(img, x, y, ROSE_L)
        putpx(img, x+1, y, ROSE_L)
    # Outline
    for y in range(S):
        for x in range(S):
            p = img.getpixel((x, y))
            if p[3] == 0: continue
            for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)]:
                nx, ny = x+dx, y+dy
                if 0 <= nx < S and 0 <= ny < S and img.getpixel((nx, ny))[3] == 0:
                    putpx(img, nx, ny, OUT)
    return img


def gen_agi():
    """🏃 AGI — aile stylisée (vitesse / vol)."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3109)
    # Couleurs aile : crème → ombre dorée
    WD = (180, 150, 80, 255)   # plume foncée
    WM = (230, 200,140, 255)   # plume mid
    WL = (250, 235,200, 255)   # plume claire

    # Forme : aile en éventail, pivot en bas-droite
    # Os principal de l'aile : courbe diagonale du pivot vers le haut-gauche
    pivot_x, pivot_y = 36, 38

    # 4 plumes longues qui s'éventent
    feathers = [
        # (start_x, start_y, end_x, end_y, length-curve)
        (32, 36,  6, 28),   # plume basse, presque horizontale
        (33, 32,  9, 16),   # plume mid-basse
        (34, 28, 16,  8),   # plume mid-haute
        (35, 24, 26,  6),   # plume haute, presque verticale
    ]

    # Pour chaque plume, dessiner un triangle/feuille
    for (sx, sy, ex, ey) in feathers:
        # axe principal
        steps = 18
        for i in range(steps):
            t = i / (steps - 1)
            cx = int(sx + (ex - sx) * t)
            cy = int(sy + (ey - sy) * t)
            # largeur : plus large au milieu de la plume
            width = int(4 - abs(t - 0.5) * 5)
            for w in range(-width, width + 1):
                # déplacer perpendiculairement
                px = cx + w
                py = cy
                if 0 <= px < S and 0 <= py < S:
                    if abs(w) == width:
                        col = WD
                    elif abs(w) >= width - 1:
                        col = WM
                    else:
                        col = WL
                    putpx(img, px, py, vary(col, rng, 4))

    # Petites barbes des plumes (hachures perpendiculaires)
    for (sx, sy, ex, ey) in feathers:
        for i in range(2, 16, 3):
            t = i / 17
            cx = int(sx + (ex - sx) * t)
            cy = int(sy + (ey - sy) * t)
            putpx(img, cx,   cy-1, WD)
            putpx(img, cx+1, cy-1, WD)

    # Petites lignes de vitesse à droite de l'aile
    for y in (24, 28, 32):
        for x in range(38, 44):
            putpx(img, x, y, WD)

    # Outline
    for y in range(S):
        for x in range(S):
            p = img.getpixel((x, y))
            if p[3] == 0: continue
            for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)]:
                nx, ny = x+dx, y+dy
                if 0 <= nx < S and 0 <= ny < S and img.getpixel((nx, ny))[3] == 0:
                    putpx(img, nx, ny, OUT)
    return img


def gen_mag():
    """🔮 MAG — boule de cristal violette sur socle."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3110)
    cx, cy = 24, 22
    # Socle (or)
    for y in range(36, 42):
        half = 12 - (y - 36)
        for x in range(cx-half, cx+half+1):
            putpx(img, x, y, GM if y < 39 else GD)
    # Liaison socle-boule
    for x in range(cx-4, cx+5):
        for y in range(34, 37):
            putpx(img, x, y, GD)
    # Boule
    for dy in range(-14, 15):
        for dx in range(-14, 15):
            d2 = dx*dx + dy*dy
            if d2 > 14*14: continue
            t = (dy + 14) / 28  # gradient haut clair → bas foncé
            col = blend(PURPLE_L, PURPLE, 0.2 + t * 0.6)
            putpx(img, cx+dx, cy+dy, vary(col, rng, 8))
    # Reflets internes
    for (x, y, col) in [(cx-7, cy-6, PURPLE_L),(cx-5, cy-8, (250,240,255,255)),(cx-3, cy-9, (230,220,250,255))]:
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                if dx*dx + dy*dy <= 4:
                    putpx(img, x+dx, y+dy, col)
    # Petite étoile dedans
    for (x, y) in [(cx+4, cy+2),(cx+5, cy+2),(cx+4, cy+1),(cx+4, cy+3),(cx+3, cy+2),(cx+5, cy+1),(cx+5, cy+3),(cx+3, cy+1),(cx+3, cy+3)]:
        putpx(img, x, y, (255, 255, 240, 255))
    # Outline noir
    for y in range(S):
        for x in range(S):
            p = img.getpixel((x, y))
            if p[3] == 0: continue
            for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)]:
                nx, ny = x+dx, y+dy
                if 0 <= nx < S and 0 <= ny < S and img.getpixel((nx, ny))[3] == 0:
                    putpx(img, nx, ny, OUT)
    return img


def gen_shop_sign():
    """🏪 Boutique — devanture avec auvent rayé."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3111)
    # Mur arrière en pierre
    for y in range(14, 42):
        for x in range(6, 42):
            base = blend(PD, (90, 70, 50, 255), 0.5)
            putpx(img, x, y, vary(base, rng, 6))
    # Auvent rayé (rouge / blanc)
    for x in range(4, 44):
        col = RM if (x // 4) % 2 == 0 else (240, 230, 220, 255)
        for y in range(8, 14):
            putpx(img, x, y, col)
    # Bordure auvent
    for x in range(4, 44):
        putpx(img, x, 13, OUT)
    # Festons (zigzag bas auvent)
    for x in range(4, 44, 3):
        putpx(img, x, 14, OUT)
        putpx(img, x+1, 15, OUT)
    # Porte
    for y in range(22, 42):
        for x in range(20, 28):
            t = (y - 22) / 20
            col = blend(LM, LD, 0.3 + t * 0.4)
            putpx(img, x, y, vary(col, rng, 4))
    # Poignée porte
    putpx(img, 26, 32, GD)
    putpx(img, 26, 33, GM)
    # Vitrine gauche
    for y in range(22, 34):
        for x in range(8, 18):
            putpx(img, x, y, GLM)
    # Cadre vitrine gauche
    outline_rect(img, 8, 22, 18, 34, OUT)
    # Vitrine droite
    for y in range(22, 34):
        for x in range(30, 40):
            putpx(img, x, y, GLM)
    outline_rect(img, 30, 22, 40, 34, OUT)
    # Outline général
    outline_rect(img, 4, 8, 43, 41, OUT)
    return img


def gen_door():
    """🚪 Porte en bois cloutée."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3112)
    # Encadrement pierre
    for y in range(4, 44):
        for x in range(8, 40):
            base = blend(PD, (95, 75, 55, 255), 0.5)
            putpx(img, x, y, vary(base, rng, 5))
    # Porte (bois)
    for y in range(6, 42):
        for x in range(12, 36):
            t = ((x - 12) % 6) / 6  # rainures verticales
            base = blend(LM, LD, 0.3 + t * 0.4)
            putpx(img, x, y, vary(base, rng, 5))
    # Rainures
    for x in (16, 22, 28, 34):
        for y in range(6, 42):
            putpx(img, x, y, LD)
    # Clous (or) en grille
    for cy_n in (10, 18, 26, 34):
        for cx_n in (15, 21, 27, 33):
            putpx(img, cx_n,   cy_n,   GM)
            putpx(img, cx_n-1, cy_n,   GD)
            putpx(img, cx_n+1, cy_n,   GD)
            putpx(img, cx_n,   cy_n-1, GD)
            putpx(img, cx_n,   cy_n+1, GD)
    # Poignée (or)
    fill_circle(img, 31, 25, 2, GD)
    fill_circle(img, 31, 25, 1, GH)
    # Outline encadrement
    outline_rect(img, 8, 4, 39, 43, OUT)
    # Outline porte
    outline_rect(img, 12, 6, 35, 41, OUT)
    return img


# ─── Main ─────────────────────────────────────────────────────
TARGETS = [
    ('img/icons/backpack.png',  gen_backpack),
    ('img/icons/map.png',       gen_map),
    ('img/icons/spellbook.png', gen_spellbook),
    ('img/icons/scroll.png',    gen_scroll),
    ('img/icons/bestiary.png',  gen_bestiary),
    ('img/icons/quest.png',     gen_quest),
    ('img/icons/search.png',    gen_search),
    ('img/icons/rest.png',      gen_rest),
    ('img/icons/save.png',      gen_save),
    ('img/icons/load.png',      gen_load),
    ('img/icons/gear.png',      gen_gear),
    ('img/icons/music_on.png',  gen_music_on),
    ('img/icons/music_off.png', gen_music_off),
    ('img/icons/voice_on.png',  gen_voice_on),
    ('img/icons/voice_off.png', gen_voice_off),
    # Phase 1 — UI chrome + HUD stats
    ('img/icons/hp.png',        gen_hp),
    ('img/icons/mp.png',        gen_mp),
    ('img/icons/xp.png',        gen_xp),
    ('img/icons/gold.png',      gen_gold),
    ('img/icons/atk.png',       gen_atk),
    ('img/icons/def.png',       gen_def),
    ('img/icons/str.png',       gen_str),
    ('img/icons/int.png',       gen_int),
    ('img/icons/agi.png',       gen_agi),
    ('img/icons/mag.png',       gen_mag),
    ('img/icons/shop_sign.png', gen_shop_sign),
    ('img/icons/door.png',      gen_door),
]

if __name__ == '__main__':
    for path, fn in TARGETS:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        img = fn()
        img.save(path)
        print(f'✓ {path}')
    print(f'\n{len(TARGETS)} icons generated.')
