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
]

if __name__ == '__main__':
    for path, fn in TARGETS:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        img = fn()
        img.save(path)
        print(f'✓ {path}')
    print(f'\n{len(TARGETS)} icons generated.')
