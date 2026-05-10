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


# ═════════════════════════════════════════════════════════════
# PHASE 2 — Équipement slots + status effects
# ═════════════════════════════════════════════════════════════

# Couleurs additionnelles
FIRE_D = (140, 30, 10, 255)
FIRE_M = (220, 80, 20, 255)
FIRE_L = (250,160, 50, 255)
FIRE_H = (255,230,140, 255)

POI_D  = ( 32, 70, 22, 255)  # vert poison foncé
POI_M  = ( 80,140, 50, 255)
POI_L  = (140,200, 90, 255)

BLOOD_D= (110, 14, 14, 255)
BLOOD_M= (170, 35, 35, 255)
BLOOD_L= (220, 80, 80, 255)
BLOOD_H= (255,180,180, 255)

HEAL_D = ( 30, 90, 35, 255)
HEAL_M = ( 60,160, 70, 255)
HEAL_L = (130,220,130, 255)
HEAL_H = (210,250,210, 255)

BONE_D = (100,100, 90, 255)
BONE_M = (180,175,160, 255)
BONE_L = (230,225,210, 255)


def gen_wand():
    """🪄 Baguette — icône slot pour équipement type 'wand'."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3201)
    # Manche diagonal (du bas-gauche vers haut-droit)
    # Path: (10, 38) → (38, 10), épaisseur 3
    for t in range(40):
        x = 10 + (t * 28) // 40
        y = 38 - (t * 28) // 40
        # Couleur : poignée foncée bas, bois mid haut
        if t < 10:
            col = LD          # poignée cuir foncée
        elif t < 14:
            col = GM          # bague or
        elif t < 18:
            col = GD
        else:
            col = blend(LL, LD, 0.3)  # bois clair
        for w in range(-2, 3):
            putpx(img, x+w, y+w, col)
            if abs(w) < 2:
                # Highlight haut
                putpx(img, x+w, y+w-1, blend(col, (255,240,200,255), 0.3))
    # Étoile dorée à la pointe (haut-droite)
    star_pts = [(38, 8),(40,7),(42,8),(43,10),(42,12),(40,13),(38,12),(36,13),(34,12),(33,10),(34,8),(36,7)]
    fill_circle(img, 39, 10, 5, GM)
    fill_circle(img, 39, 10, 4, GL)
    fill_circle(img, 39, 10, 2, XP_H)
    # Branches d'étoile
    for (dx, dy) in [(0,-7),(0,7),(-7,0),(7,0),(-5,-5),(5,-5),(-5,5),(5,5)]:
        x, y = 39+dx, 10+dy
        if 0 <= x < S and 0 <= y < S:
            putpx(img, x, y, GL)
            if abs(dx)+abs(dy) < 7:
                putpx(img, x + (1 if dx > 0 else -1 if dx < 0 else 0), y, GM)
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


def gen_armor():
    """🧥 Armure / Robe — icône slot pour équipement type 'armor'."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3202)
    ROBE_D = (40, 30, 80, 255)    # bleu nuit foncé
    ROBE_M = (70, 55,130, 255)
    ROBE_L = (110, 95,180, 255)
    # Capuche (col au-dessus, V)
    for y in range(8, 18):
        half = (y - 8) + 4
        for x in range(24-half, 24+half+1):
            t = (y - 8) / 10
            col = blend(ROBE_L, ROBE_D, 0.2 + t * 0.5)
            putpx(img, x, y, vary(col, rng, 4))
    # Encolure (V foncé)
    for i in range(8):
        for w in range(-1, 2):
            putpx(img, 24+w, 12+i, ROBE_D)
            putpx(img, 24-i+w, 12+i, ROBE_D)
            putpx(img, 24+i+w, 12+i, ROBE_D)
    # Corps de la robe (trapèze inversé qui s'élargit vers le bas)
    for y in range(18, 42):
        half = 10 + (y - 18) // 2
        for x in range(24-half, 24+half+1):
            t = (y - 18) / 24
            col = blend(ROBE_M, ROBE_D, 0.1 + t * 0.4)
            putpx(img, x, y, vary(col, rng, 5))
    # Plis verticaux (lignes plus foncées)
    for fold_x in (16, 24, 32):
        for y in range(20, 42):
            if img.getpixel((fold_x, y))[3] > 0:
                putpx(img, fold_x, y, ROBE_D)
    # Bordures or
    for y in range(8, 18):
        # Bord capuche
        half = (y - 8) + 4
        if 0 <= 24-half < S and img.getpixel((24-half, y))[3] > 0:
            putpx(img, 24-half, y, GM)
        if 0 <= 24+half < S and img.getpixel((24+half, y))[3] > 0:
            putpx(img, 24+half, y, GM)
    # Bordure bas (ourlet or)
    for x in range(11, 38):
        if img.getpixel((x, 41))[3] > 0:
            putpx(img, x, 41, GM)
        if img.getpixel((x, 40))[3] > 0 and (x % 3 == 0):
            putpx(img, x, 40, GD)
    # Boutons or (3 alignés verticalement)
    for cy_b in (22, 28, 34):
        fill_circle(img, 24, cy_b, 1, GM)
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


def gen_accessory():
    """💎 Accessoire — gemme triangulaire à facettes."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3203)
    # Gemme rouge en forme de losange/diamant
    GEM_D = (120, 20, 40, 255)
    GEM_M = (180, 50, 80, 255)
    GEM_L = (240,110,140, 255)
    GEM_H = (255,200,210, 255)
    # Triangle haut (table) — y=8 à 18
    for y in range(8, 18):
        half = ((y - 8) * 14) // 10
        for x in range(24-half, 24+half+1):
            # Facettes : alterner couleurs selon position
            if x < 24 - half // 2:
                col = GEM_L
            elif x > 24 + half // 2:
                col = GEM_M
            else:
                col = GEM_H
            putpx(img, x, y, vary(col, rng, 5))
    # Tranche pavillon (y=18 à 38) — pointe vers le bas
    for y in range(18, 38):
        t = (y - 18) / 20
        half = int(14 * (1 - t))
        for x in range(24-half, 24+half+1):
            # Gradient + facettes
            if abs(x - 24) < 3:
                col = blend(GEM_L, GEM_D, t)
            elif x < 24:
                col = blend(GEM_M, GEM_D, t * 0.7)
            else:
                col = blend(GEM_M, GEM_D, t * 0.9)
            putpx(img, x, y, vary(col, rng, 4))
    # Lignes de facettes (foncé)
    line(img, 24, 8, 10, 18, GEM_D)
    line(img, 24, 8, 38, 18, GEM_D)
    line(img, 10, 18, 24, 38, GEM_D)
    line(img, 38, 18, 24, 38, GEM_D)
    line(img, 18, 18, 24, 38, GEM_D)
    line(img, 30, 18, 24, 38, GEM_D)
    line(img, 10, 18, 38, 18, GEM_D)
    # Brillance haut-gauche
    for (x, y) in [(18,12),(19,12),(20,11),(15,15),(16,15),(17,14)]:
        putpx(img, x, y, GEM_H)
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


def gen_burn():
    """🔥 Brûlure — flamme orange (silhouette nette)."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3204)
    # Silhouette flamme par half-width(y), large bas → pointe haut.
    # On ajoute un petit hook à gauche pour la forme classique.
    def half_at(y):
        if   y >= 38: return 11
        elif y >= 32: return 12
        elif y >= 26: return 11
        elif y >= 20: return 9
        elif y >= 14: return 7
        elif y >= 9:  return 4
        elif y >= 6:  return 2
        else:         return 0
    # Petit hook à gauche bas (langue secondaire)
    pts = set()
    for y in range(6, 42):
        h = half_at(y)
        # Léger décalage à droite pour rendre la flamme dynamique
        off = 0
        if   y < 14: off = 1
        elif y < 22: off = 0
        else:        off = -1
        for x in range(24-h+off, 24+h+1+off):
            pts.add((x, y))
    # Render avec gradient propre : centre clair → bord foncé
    for (x, y) in pts:
        # distance au centre de la flamme à cette altitude
        h = max(1, half_at(y))
        d_center = min(1.0, abs(x - 24) / h)
        # gradient vertical : haut = chaud, bas = encore chaud
        t_v = (y - 6) / 36
        # 3 zones radiales, chacune avec gradient vertical doux
        if d_center < 0.45:
            col = blend(FIRE_H, FIRE_L, t_v * 0.7)
        elif d_center < 0.85:
            col = blend(FIRE_L, FIRE_M, t_v * 0.6)
        else:
            col = blend(FIRE_M, FIRE_D, t_v * 0.5)
        putpx(img, x, y, vary(col, rng, 4))
    # Outline
    for (x, y) in pts:
        for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)]:
            nx, ny = x+dx, y+dy
            if (nx, ny) not in pts and 0 <= nx < S and 0 <= ny < S and img.getpixel((nx, ny))[3] == 0:
                putpx(img, nx, ny, OUT)
    return img


def gen_poison():
    """☠️ Poison — crâne vert."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3205)
    cx, cy = 24, 22
    # Crâne (cercle haut)
    for dy in range(-12, 6):
        for dx in range(-12, 13):
            d2 = dx*dx + dy*dy
            if d2 > 12*12: continue
            t = (dy + 12) / 18
            col = blend((220,240,200,255), POI_M, 0.1 + t * 0.5)
            putpx(img, cx+dx, cy+dy, vary(col, rng, 6))
    # Mâchoire (bas étroit)
    for y in range(28, 36):
        half = max(2, 8 - (y - 28))
        for x in range(cx-half, cx+half+1):
            t = (y - 28) / 8
            col = blend(POI_L, POI_D, 0.3 + t * 0.5)
            putpx(img, x, y, vary(col, rng, 5))
    # Yeux (creux noirs)
    fill_circle(img, cx-5, cy, 3, OUT)
    fill_circle(img, cx+5, cy, 3, OUT)
    # Lueur verte dans yeux
    putpx(img, cx-5, cy, POI_L)
    putpx(img, cx+5, cy, POI_L)
    # Nez (triangle noir)
    for i in range(3):
        for x in range(cx-i, cx+i+1):
            putpx(img, x, cy+5+i, OUT)
    # Dents (lignes verticales bas)
    for tooth_x in (cx-4, cx-1, cx+2):
        for y in range(30, 35):
            putpx(img, tooth_x, y, OUT)
    # Outline général
    for y in range(S):
        for x in range(S):
            p = img.getpixel((x, y))
            if p[3] == 0 or p == OUT: continue
            for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)]:
                nx, ny = x+dx, y+dy
                if 0 <= nx < S and 0 <= ny < S and img.getpixel((nx, ny))[3] == 0:
                    putpx(img, nx, ny, OUT)
    return img


def gen_bleed():
    """🩸 Saignement — goutte de sang (forme classique)."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3206)
    cx = 24
    pts = set()
    # Goutte = unique courbe paramétrique :
    # half-width = fonction de y, croît lentement en haut puis arrondi en bas.
    # y=6 → tip (1px); y=42 → base. Ovale avec compression haute.
    # Formule : pour y in [6, 42], h = 13 * sin( pi * (y-6)/40 ) ** 0.7
    import math as _m
    for y in range(6, 42):
        t = (y - 6) / 36   # 0..1
        # Forme : taper en haut (très étroit), pleine sphère en bas
        # On combine deux fonctions : taper(t) en haut, bulge(t) en bas
        if t < 0.55:
            # Phase taper : largeur croît du 1 vers ~9
            h = int(1 + (t / 0.55) * 8)
        else:
            # Phase bulge : demi-cercle
            t2 = (t - 0.55) / 0.45      # 0..1
            # demi-largeur = sqrt(1 - (t2-0.5)^2 * 4) * 13
            inner = max(0.0, 1 - ((t2 - 0.5) * 2)**2)
            h = int(_m.sqrt(inner) * 13)
            # Assurer transition douce
            h = max(h, 9)
        for x in range(cx-h, cx+h+1):
            pts.add((x, y))
    # Render avec gradient simple : haut clair → bas foncé
    for (x, y) in pts:
        t_v = (y - 8) / 34
        # bord plus foncé
        # estimer la distance au centre vertical
        d_center = abs(x - cx) / 12
        col = blend(BLOOD_M, BLOOD_D, 0.15 + t_v * 0.45 + d_center * 0.2)
        putpx(img, x, y, vary(col, rng, 4))
    # Reflet brillant en haut-centre (forme de virgule)
    for (x, y) in [(cx-2, 14),(cx-2, 16),(cx-3, 18),(cx-3, 20),(cx-4, 22),(cx-4, 24),(cx-4, 26),(cx-3, 28)]:
        if (x, y) in pts:
            putpx(img, x, y, BLOOD_H)
    for (x, y) in [(cx-1, 13),(cx-1, 15),(cx-2, 17),(cx-2, 19),(cx-3, 21),(cx-3, 23),(cx-3, 25),(cx-2, 27)]:
        if (x, y) in pts:
            putpx(img, x, y, BLOOD_L)
    # Outline
    for (x, y) in pts:
        for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)]:
            nx, ny = x+dx, y+dy
            if (nx, ny) not in pts and 0 <= nx < S and 0 <= ny < S and img.getpixel((nx, ny))[3] == 0:
                putpx(img, nx, ny, OUT)
    return img


def gen_heal():
    """💚 Soin — coeur vert (forme nette)."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3207)
    cx = 24
    # Coeur classique : pour chaque y, on calcule la half-width via
    # union de 2 disques en haut + triangle pointe en bas.
    pts = set()
    # Lobes (2 cercles tangents)
    for dy in range(-9, 10):
        for dx in range(-9, 10):
            d2 = dx*dx + dy*dy
            if d2 <= 9*9:
                pts.add((cx-7+dx, 18+dy))
                pts.add((cx+7+dx, 18+dy))
    # Pointe (V)
    for y in range(18, 41):
        half = max(0, 16 - (y - 18))
        for x in range(cx-half, cx+half+1):
            pts.add((x, y))
    # Render avec gradient + highlight
    for (x, y) in pts:
        # gradient haut clair → bas foncé + assombrissement aux bords
        t_v = (y - 9) / 32
        # distance au "milieu" du coeur (les 2 lobes en haut, pointe en bas)
        if y < 18:
            # proche du centre des lobes
            d = min(math.sqrt((x - (cx-7))**2 + (y-18)**2),
                    math.sqrt((x - (cx+7))**2 + (y-18)**2)) / 9
        else:
            # partie pointe
            half = max(1, 16 - (y - 18))
            d = abs(x - cx) / half
        d = min(1.0, max(0.0, d))
        # gradient radial : centre clair, bord foncé + tonalité bas
        col = blend(HEAL_L, HEAL_D, 0.15 + d * 0.5 + t_v * 0.25)
        putpx(img, x, y, vary(col, rng, 4))
    # Highlight haut-gauche du lobe gauche
    for (x, y) in [(13,13),(14,13),(15,12),(13,15),(14,15),(12,16),(11,17)]:
        if (x, y) in pts:
            putpx(img, x, y, HEAL_H)
    # Petit éclat sur lobe droit
    for (x, y) in [(28,13),(29,13)]:
        if (x, y) in pts:
            putpx(img, x, y, HEAL_L)
    # Outline
    for (x, y) in pts:
        for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)]:
            nx, ny = x+dx, y+dy
            if (nx, ny) not in pts and 0 <= nx < S and 0 <= ny < S and img.getpixel((nx, ny))[3] == 0:
                putpx(img, nx, ny, OUT)
    return img


def gen_dead():
    """💀 Mort — crâne gris (différent de poison)."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3208)
    cx, cy = 24, 22
    # Crâne (cercle haut) — gris/os
    for dy in range(-13, 7):
        for dx in range(-13, 14):
            d2 = dx*dx + dy*dy
            if d2 > 13*13: continue
            t = (dy + 13) / 20
            col = blend(BONE_L, BONE_M, 0.1 + t * 0.4)
            putpx(img, cx+dx, cy+dy, vary(col, rng, 6))
    # Mâchoire séparée (bas)
    for y in range(30, 38):
        half = max(2, 9 - (y - 30))
        for x in range(cx-half, cx+half+1):
            t = (y - 30) / 8
            col = blend(BONE_M, BONE_D, 0.2 + t * 0.4)
            putpx(img, x, y, vary(col, rng, 5))
    # Petit gap entre crâne et mâchoire
    for x in range(cx-7, cx+8):
        if img.getpixel((x, 29))[3] > 0:
            putpx(img, x, 29, OUT)
    # Yeux (gros creux noirs en X)
    fill_circle(img, cx-6, cy-1, 4, OUT)
    fill_circle(img, cx+6, cy-1, 4, OUT)
    # Croix dans les yeux (X = mort)
    line(img, cx-9, cy-4, cx-3, cy+2, BONE_L)
    line(img, cx-9, cy+2, cx-3, cy-4, BONE_L)
    line(img, cx+3, cy-4, cx+9, cy+2, BONE_L)
    line(img, cx+3, cy+2, cx+9, cy-4, BONE_L)
    # Nez (triangle noir)
    for i in range(3):
        for x in range(cx-i, cx+i+1):
            putpx(img, x, cy+5+i, OUT)
    # Dents (alternées sur la mâchoire)
    for tooth_x in (cx-5, cx-2, cx+1, cx+4):
        for y in range(31, 35):
            putpx(img, tooth_x, y, OUT)
    # Outline
    for y in range(S):
        for x in range(S):
            p = img.getpixel((x, y))
            if p[3] == 0 or p == OUT: continue
            for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)]:
                nx, ny = x+dx, y+dy
                if 0 <= nx < S and 0 <= ny < S and img.getpixel((nx, ny))[3] == 0:
                    putpx(img, nx, ny, OUT)
    return img


# ═════════════════════════════════════════════════════════════
# PHASE 3 — Sorts (badges circulaires + glyphe central)
# ═════════════════════════════════════════════════════════════

def _spell_badge(seed, bg_dark, bg_light, glyph_fn, ring_color=None):
    """Disc 22r + ring + glyph centered."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(seed)
    cx, cy = 24, 24
    # Background gradient disc
    for dy in range(-21, 22):
        for dx in range(-21, 22):
            d2 = dx*dx + dy*dy
            if d2 > 21*21: continue
            t = (dy + 21) / 42
            col = blend(bg_light, bg_dark, 0.15 + t*0.55)
            putpx(img, cx+dx, cy+dy, vary(col, rng, 5))
    # Inner accent ring
    rc = ring_color if ring_color else GD
    for dy in range(-21, 22):
        for dx in range(-21, 22):
            d2 = dx*dx + dy*dy
            if 18*18 < d2 <= 19*19:
                putpx(img, cx+dx, cy+dy, rc)
    # Glyph
    glyph_fn(img, rng, cx, cy)
    # Outline disc
    for dy in range(-22, 23):
        for dx in range(-22, 23):
            d2 = dx*dx + dy*dy
            if 21*21 < d2 <= 22*22:
                putpx(img, cx+dx, cy+dy, OUT)
    return img


# Petits helpers pour glyphes
def _bolt(img, cx, cy, color):
    """Éclair zigzag vertical centré."""
    pts = [(cx, cy-9),(cx, cy-7),(cx-1, cy-5),(cx-2, cy-3),
           (cx-1, cy-2),(cx, cy-2),(cx+1, cy-1),(cx, cy+1),
           (cx-1, cy+3),(cx-2, cy+5),(cx-1, cy+7),(cx, cy+9)]
    for i in range(len(pts)-1):
        x0, y0 = pts[i]
        x1, y1 = pts[i+1]
        line(img, x0, y0, x1, y1, color)
    # Épaissir
    for (x, y) in pts:
        for (dx, dy) in [(-1,0),(1,0)]:
            putpx(img, x+dx, y, color)


def _flame(img, cx, cy, c1, c2, c3):
    """Petite flamme centrée."""
    for dy in range(-9, 8):
        for dx in range(-7, 8):
            ay = cy + dy
            ax = cx + dx
            # Forme : ovale du haut, large du bas
            if dy < 0:
                hh = max(0, 6 - abs(dy))
            else:
                hh = max(0, 7 - dy // 2)
            if abs(dx) <= hh:
                d_center = abs(dx) / max(1, hh)
                if d_center < 0.4:
                    putpx(img, ax, ay, c3)
                elif d_center < 0.75:
                    putpx(img, ax, ay, c2)
                else:
                    putpx(img, ax, ay, c1)


def _drop(img, cx, cy, c1, c2, c3):
    """Goutte petite verticale."""
    for dy in range(-9, 8):
        if dy < -3:
            hh = max(0, dy + 6)
        elif dy < 4:
            hh = 3 + (dy + 3)
        else:
            hh = max(0, 7 - dy)
        for dx in range(-hh, hh+1):
            d_center = abs(dx) / max(1, hh)
            if d_center < 0.4:
                col = c3
            elif d_center < 0.8:
                col = c2
            else:
                col = c1
            putpx(img, cx+dx, cy+dy, col)


def _cross(img, cx, cy, color, size=7, thick=2):
    """Croix +/heal."""
    for w in range(-thick, thick+1):
        for d in range(-size, size+1):
            putpx(img, cx+d, cy+w, color)
            putpx(img, cx+w, cy+d, color)


def _shield_glyph(img, cx, cy, c1, c2):
    """Mini bouclier heater."""
    for dy in range(-8, 9):
        if dy <= 4:
            half = 6
        else:
            half = max(0, 6 - (dy - 4))
        for dx in range(-half, half+1):
            t = (dy + 8) / 17
            putpx(img, cx+dx, cy+dy, blend(c1, c2, 0.2 + t*0.5))


def _spiral(img, cx, cy, color):
    """Spirale simple."""
    for theta in range(0, 360*3, 8):
        rad = math.radians(theta)
        r = 0.8 + (theta / (360*3)) * 8
        x = int(cx + r * math.cos(rad))
        y = int(cy + r * math.sin(rad))
        putpx(img, x, y, color)
        putpx(img, x+1, y, color)


def _star4(img, cx, cy, color, r=8):
    """Étoile 4 branches."""
    for d in range(-r, r+1):
        w = max(0, r - 2*abs(d))
        for o in range(-w, w+1):
            putpx(img, cx+d, cy+o, color)
            putpx(img, cx+o, cy+d, color)


def _key(img, cx, cy, color):
    """Petite clé."""
    # Bow (cercle avec trou)
    fill_circle(img, cx-5, cy, 4, color)
    fill_circle(img, cx-5, cy, 2, OUT)
    # Tige
    for x in range(cx-1, cx+9):
        putpx(img, x, cy, color)
        putpx(img, x, cy-1, color)
    # Dents
    for (x, y) in [(cx+5, cy+1),(cx+5, cy+2),(cx+7, cy+1),(cx+7, cy+2)]:
        putpx(img, x, y, color)


def _bat(img, cx, cy, color):
    """Silhouette chauve-souris."""
    # Corps
    for y in range(cy-3, cy+5):
        for x in range(cx-2, cx+3):
            putpx(img, x, y, color)
    # Ailes (triangles)
    for i in range(7):
        for j in range(i+1):
            putpx(img, cx-3-i, cy-2+j, color)
            putpx(img, cx+3+i, cy-2+j, color)
    # Oreilles
    for i in range(3):
        putpx(img, cx-1, cy-5-i, color)
        putpx(img, cx+1, cy-5-i, color)


def _skull(img, cx, cy, c_bone, c_eye):
    """Petit crâne."""
    # Tête
    for dy in range(-7, 4):
        for dx in range(-7, 8):
            d2 = dx*dx + dy*dy
            if d2 <= 7*7:
                putpx(img, cx+dx, cy+dy, c_bone)
    # Mâchoire
    for y in range(cy+4, cy+8):
        half = 5 - (y - cy - 4)
        for x in range(cx-half, cx+half+1):
            putpx(img, x, y, c_bone)
    # Yeux
    fill_circle(img, cx-3, cy-1, 2, c_eye)
    fill_circle(img, cx+3, cy-1, 2, c_eye)
    # Nez
    for x in range(cx-1, cx+2):
        putpx(img, x, cy+2, c_eye)


def _heart_small(img, cx, cy, color):
    """Petit coeur."""
    fill_circle(img, cx-3, cy-1, 3, color)
    fill_circle(img, cx+3, cy-1, 3, color)
    for y in range(cy-1, cy+8):
        half = max(0, 6 - (y - cy + 1))
        for x in range(cx-half, cx+half+1):
            putpx(img, x, y, color)


def _wave_arrow_up(img, cx, cy, color):
    """Flèche vers le haut avec ondulation (lévitation)."""
    # Tête flèche
    for i in range(5):
        for w in range(-i, i+1):
            putpx(img, cx+w, cy-7+i, color)
    # Corps
    for y in range(cy-3, cy+8):
        for x in range(cx-1, cx+2):
            putpx(img, x, y, color)


def _scissors(img, cx, cy, color):
    """Ciseaux/cut — vue de face, lames vers le haut."""
    # Lame gauche (épaisse, diagonale ↗)
    for t in range(10):
        x = cx - 4 + t
        y = cy - 8 + t
        for w in range(-1, 2):
            putpx(img, x, y+w, color)
    # Lame droite (mirroir, ↖)
    for t in range(10):
        x = cx + 4 - t
        y = cy - 8 + t
        for w in range(-1, 2):
            putpx(img, x, y+w, color)
    # Pivot doré
    fill_circle(img, cx, cy+2, 2, GH)
    fill_circle(img, cx, cy+2, 1, GD)
    # Anneau gauche (rond)
    ring(img, cx-4, cy+6, 3, color)
    putpx(img, cx-4, cy+6, color)
    # Lien anneau gauche → pivot
    line(img, cx-3, cy+5, cx-1, cy+3, color)
    # Anneau droit
    ring(img, cx+4, cy+6, 3, color)
    putpx(img, cx+4, cy+6, color)
    line(img, cx+3, cy+5, cx+1, cy+3, color)


def _explosion_star(img, cx, cy, color, hot):
    """Étoile explosion (8 branches)."""
    for theta in range(0, 360, 22):
        rad = math.radians(theta)
        for r in range(0, 9):
            x = int(cx + r * math.cos(rad))
            y = int(cy + r * math.sin(rad))
            col = hot if r < 4 else color
            putpx(img, x, y, col)
    # Centre brillant
    fill_circle(img, cx, cy, 3, hot)


def _mask_face(img, cx, cy, c_skin, c_eye):
    """Masque comique (riddikulus)."""
    fill_circle(img, cx, cy, 8, c_skin)
    # Yeux
    fill_circle(img, cx-3, cy-2, 1, c_eye)
    fill_circle(img, cx+3, cy-2, 1, c_eye)
    # Sourire
    for i in range(-3, 4):
        y = cy + 3 + (1 if abs(i) > 1 else 0)
        putpx(img, cx+i, y, c_eye)


def _spider(img, cx, cy, color):
    """Petit araignée."""
    fill_circle(img, cx, cy, 4, color)
    # 8 pattes
    for ang in (-45, -90, -135, 45, 90, 135, 180, 0):
        rad = math.radians(ang)
        for r in (5, 6, 7, 8):
            x = int(cx + r * math.cos(rad))
            y = int(cy + r * math.sin(rad))
            putpx(img, x, y, color)


# ─── Sortilèges ──────────────────────────────────────────────

def gen_spell_stupefix():
    return _spell_badge(3301, (60,30,80,255), (180,90,200,255),
        lambda im, rng, cx, cy: _bolt(im, cx, cy, XP_H), ring_color=GM)

def gen_spell_expelliarmus():
    return _spell_badge(3302, (90,80,40,255), (200,170,80,255),
        lambda im, rng, cx, cy: _star4(im, cx, cy, XP_H, r=8))

def gen_spell_episkey():
    return _spell_badge(3303, HEAL_D, HEAL_M,
        lambda im, rng, cx, cy: _cross(im, cx, cy, HEAL_H, size=7, thick=2))

def gen_spell_protego():
    return _spell_badge(3304, (30,50,110,255), (90,140,220,255),
        lambda im, rng, cx, cy: _shield_glyph(im, cx, cy, (180,210,250,255), (60,90,170,255)))

def gen_spell_incendio():
    return _spell_badge(3305, FIRE_D, FIRE_M,
        lambda im, rng, cx, cy: _flame(im, cx, cy, FIRE_M, FIRE_L, FIRE_H))

def gen_spell_accio():
    return _spell_badge(3306, (50,30,90,255), (130,90,200,255),
        lambda im, rng, cx, cy: _spiral(im, cx, cy, XP_H))

def gen_spell_wingardium():
    return _spell_badge(3307, (40,80,140,255), (120,180,230,255),
        lambda im, rng, cx, cy: _wave_arrow_up(im, cx, cy, (220,240,255,255)))

def gen_spell_diffindo():
    return _spell_badge(3308, (60,60,70,255), (160,160,180,255),
        lambda im, rng, cx, cy: _scissors(im, cx, cy, MTH))

def gen_spell_reparo():
    return _spell_badge(3309, (60,80,30,255), (140,180,50,255),
        lambda im, rng, cx, cy: _heart_small(im, cx, cy, GH))

def gen_spell_sectumsempra():
    return _spell_badge(3310, BLOOD_D, (60,12,12,255),
        lambda im, rng, cx, cy: _drop(im, cx, cy, BLOOD_M, BLOOD_L, BLOOD_H))

def gen_spell_lumos():
    return _spell_badge(3311, (40,30,80,255), (140,120,200,255),
        lambda im, rng, cx, cy: _star4(im, cx, cy, (255,250,200,255), r=9))

def gen_spell_aguamenti():
    return _spell_badge(3312, (20,60,110,255), (60,140,200,255),
        lambda im, rng, cx, cy: _drop(im, cx, cy, MP_M, MP_L, MP_H))

def gen_spell_bombarda():
    return _spell_badge(3313, (90,30,20,255), (200,80,40,255),
        lambda im, rng, cx, cy: _explosion_star(im, cx, cy, FIRE_M, FIRE_H))

def gen_spell_riddikulus():
    return _spell_badge(3314, (90,70,40,255), (220,180,90,255),
        lambda im, rng, cx, cy: _mask_face(im, cx, cy, (250,210,150,255), OUT))

def gen_spell_alohomora():
    return _spell_badge(3315, (50,40,20,255), (140,110,40,255),
        lambda im, rng, cx, cy: _key(im, cx, cy, GH))

def gen_spell_patronum():
    # Étoile/cerf simplifié = un star + halo
    def glyph(im, rng, cx, cy):
        fill_circle(im, cx, cy, 8, (220,220,255,255))
        _star4(im, cx, cy, (255,255,255,255), r=10)
        fill_circle(im, cx, cy, 4, (255,255,255,255))
    return _spell_badge(3316, (30,30,80,255), (90,100,180,255), glyph)

def gen_spell_avada():
    return _spell_badge(3317, (10,30,15,255), (40,90,40,255),
        lambda im, rng, cx, cy: _skull(im, cx, cy, (180,250,180,255), (10,40,10,255)),
        ring_color=POI_M)

def gen_spell_sanguini():
    return _spell_badge(3318, (40,10,15,255), (120,30,30,255),
        lambda im, rng, cx, cy: _heart_small(im, cx, cy, BLOOD_L))

def gen_spell_vampyrus():
    return _spell_badge(3319, (20,10,40,255), (80,50,140,255),
        lambda im, rng, cx, cy: _bat(im, cx, cy, (40,20,80,255)))

def gen_spell_tarantallegra():
    return _spell_badge(3320, (60,20,80,255), (160,80,200,255),
        lambda im, rng, cx, cy: _spider(im, cx, cy, OUT))

def gen_spell_maledictus():
    return _spell_badge(3321, (50,30,30,255), (130,40,80,255),
        lambda im, rng, cx, cy: _skull(im, cx, cy, (220,200,210,255), (60,20,40,255)))

def gen_spell_crucio():
    # Pointes irrégulières (douleur)
    def glyph(im, rng, cx, cy):
        for ang in (0, 45, 90, 135, 180, 225, 270, 315):
            rad = math.radians(ang)
            for r in range(0, 10):
                x = int(cx + r * math.cos(rad))
                y = int(cy + r * math.sin(rad))
                col = BLOOD_H if r < 3 else BLOOD_L if r < 7 else BLOOD_M
                putpx(im, x, y, col)
        fill_circle(im, cx, cy, 2, BLOOD_H)
    return _spell_badge(3322, (50,10,10,255), (140,30,40,255), glyph)

def gen_spell_morsmordre():
    # Marque des ténèbres : crâne avec serpent (simplifié = crâne vert)
    return _spell_badge(3323, (10,15,10,255), (40,80,40,255),
        lambda im, rng, cx, cy: _skull(im, cx, cy, (140,200,140,255), (10,30,10,255)),
        ring_color=POI_L)


# ═════════════════════════════════════════════════════════════
# PHASE 4 — Items (potions, baguettes, robes, accessoires, livres)
# ═════════════════════════════════════════════════════════════

# ── Helpers ─────────────────────────────────────────────────

def _flask(seed, liq_d, liq_m, liq_l, glow=None):
    """Fiole de potion : bouchon de liège + col + corps rond + liquide."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(seed)
    cx = 24
    # Bouchon (liège foncé)
    for y in range(5, 10):
        for x in range(cx-3, cx+4):
            putpx(img, x, y, LD)
    putpx(img, cx-3, 5, OUT); putpx(img, cx+3, 5, OUT)
    # Bague or
    for x in range(cx-4, cx+5):
        putpx(img, x, 10, GD)
        putpx(img, x, 11, GM)
    # Col (verre clair)
    for y in range(12, 18):
        for x in range(cx-2, cx+3):
            putpx(img, x, y, GLL)
    # Corps : ovale plus large vers bas
    body = set()
    for dy in range(-9, 14):
        for dx in range(-12, 13):
            d2 = (dx*dx) + (dy*dy) * 1.4 / 2.0
            if d2 <= 12*12:
                body.add((cx+dx, 28+dy))
    # Verre extérieur (highlight côté gauche)
    for (x, y) in body:
        # Reflets côté gauche du verre vide
        putpx(img, x, y, GLM)
    # Liquide (rempli aux 2/3 bas)
    liquid_top_y = 23  # niveau de remplissage
    for (x, y) in body:
        if y < liquid_top_y: continue
        # gradient haut→bas du liquide
        h = max(1, 41 - liquid_top_y)
        t = (y - liquid_top_y) / h
        d_center = abs(x - cx) / 12
        if d_center < 0.3:
            col = blend(liq_l, liq_m, t)
        elif d_center < 0.7:
            col = blend(liq_m, liq_d, t * 0.7)
        else:
            col = blend(liq_d, OUT2, 0.2)
        putpx(img, x, y, vary(col, rng, 4))
    # Surface du liquide
    for (x, y) in body:
        if y == liquid_top_y or y == liquid_top_y + 1:
            putpx(img, x, y, liq_l)
    # Bulles (3 petites)
    for (bx, by) in [(cx-5, 30),(cx+3, 34),(cx+1, 27)]:
        if (bx, by) in body and by >= liquid_top_y:
            putpx(img, bx, by, GLL)
    # Highlight verre haut-gauche
    for y in range(20, 38):
        x = cx - 9
        if (x, y) in body:
            putpx(img, x, y, GLL)
            putpx(img, x+1, y, blend(GLL, GLM, 0.5))
    # Halo glow
    if glow:
        for theta in range(0, 360, 30):
            rad = math.radians(theta)
            x = int(cx + 14 * math.cos(rad))
            y = int(28 + 14 * math.sin(rad))
            if 0 <= x < S and 0 <= y < S and img.getpixel((x, y))[3] == 0:
                putpx(img, x, y, glow)
    # Outline noir
    for (x, y) in body:
        for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)]:
            nx, ny = x+dx, y+dy
            if (nx, ny) not in body and 0 <= nx < S and 0 <= ny < S:
                p = img.getpixel((nx, ny))
                # n'écraser ni le bouchon ni la bague ni le col
                if p[3] == 0:
                    putpx(img, nx, ny, OUT)
    # Outline du col + bouchon
    for y in range(5, 18):
        for x in (cx-4, cx+4):
            if img.getpixel((x, y))[3] == 0 and 5 <= y < 12:
                pass
        if y < 12:
            putpx(img, cx-4, y, OUT)
            putpx(img, cx+4, y, OUT)
        if y >= 12 and y < 18:
            putpx(img, cx-3, y, OUT)
            putpx(img, cx+3, y, OUT)
    return img


def _spellbook(seed, cover_d, cover_l, spine_d, symbol_fn=None, ring_color=None):
    """Livre fermé : tranches de pages + couverture + symbole optionnel."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(seed)
    # Pages (jaunâtres) — visibles côté droit
    for y in range(9, 40):
        for x in range(13, 40):
            putpx(img, x, y, vary(PM, rng, 4))
    # Tranche bas (épaisseur)
    for x in range(13, 40):
        putpx(img, x, 39, PD)
        putpx(img, x, 40, blend(PD, OUT, 0.5))
    # Couverture (front)
    for y in range(8, 41):
        for x in range(11, 39):
            t = (y - 8) / 33
            d_x = (x - 11) / 28
            base = blend(cover_l, cover_d, 0.15 + t*0.35 + d_x*0.2)
            putpx(img, x, y, vary(base, rng, 5))
    # Dos (spine, plus foncé)
    for y in range(8, 41):
        for x in range(11, 14):
            putpx(img, x, y, spine_d)
    # Décor or sur la tranche (3 traits horizontaux)
    for x in range(11, 14):
        putpx(img, x, 14, GD)
        putpx(img, x, 24, GD)
        putpx(img, x, 34, GD)
    # Cadre or sur la couverture
    rc = ring_color if ring_color else GM
    for y in range(11, 38):
        putpx(img, 14, y, rc)
        putpx(img, 36, y, rc)
    for x in range(14, 37):
        putpx(img, x, 11, rc)
        putpx(img, x, 37, rc)
    # Symbole central
    if symbol_fn:
        symbol_fn(img, rng, 25, 24)
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


def _wand_item(seed, wood_d, wood_l, tip_color, has_runes=False):
    """Baguette horizontale avec poignée et pointe."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(seed)
    # Diagonale (10, 38) → (40, 8)
    for t in range(40):
        x = 10 + (t * 30) // 40
        y = 38 - (t * 30) // 40
        if t < 10:
            col = LD          # poignée cuir
        elif t < 13:
            col = GD          # bague or
        else:
            col = blend(wood_l, wood_d, (t - 13) / 27)
        for w in range(-2, 3):
            putpx(img, x+w, y+w, vary(col, rng, 4))
            if abs(w) < 2:
                putpx(img, x+w, y+w-1, blend(col, (255,240,200,255), 0.3))
    # Pointe (étoile/étincelle)
    fill_circle(img, 39, 9, 4, tip_color)
    fill_circle(img, 39, 9, 2, blend(tip_color, (255,255,255,255), 0.6))
    # Petites étincelles
    for (dx, dy) in [(-6,0),(6,0),(0,-6),(0,6),(-4,-4),(4,-4),(-4,4),(4,4)]:
        x, y = 39+dx, 9+dy
        if 0 <= x < S and 0 <= y < S and img.getpixel((x, y))[3] == 0:
            putpx(img, x, y, tip_color)
    # Runes optionnelles (3 points or sur le bois)
    if has_runes:
        for off in (15, 22, 28):
            t = off
            x = 10 + (t * 30) // 40
            y = 38 - (t * 30) // 40
            putpx(img, x+1, y-1, GH)
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


# ── Symboles pour spellbooks ────────────────────────────────

def _sym_wand_diag(img, rng, cx, cy):
    line(img, cx-5, cy+5, cx+5, cy-5, GH)
    line(img, cx-4, cy+5, cx+5, cy-4, GM)
    fill_circle(img, cx+6, cy-6, 2, XP_H)

def _sym_heart(img, rng, cx, cy):
    fill_circle(img, cx-3, cy-2, 2, HEAL_L)
    fill_circle(img, cx+3, cy-2, 2, HEAL_L)
    for y in range(cy-2, cy+5):
        half = max(0, 4 - (y - cy + 2))
        for x in range(cx-half, cx+half+1):
            putpx(img, x, y, HEAL_L)

def _sym_eye(img, rng, cx, cy):
    # ovale blanc
    for dy in range(-3, 4):
        for dx in range(-6, 7):
            d2 = (dx*dx)/4 + dy*dy
            if d2 <= 9:
                putpx(img, cx+dx, cy+dy, (240,230,200,255))
    fill_circle(img, cx, cy, 2, OUT)
    putpx(img, cx, cy, GH)

def _sym_letter_p(img, rng, cx, cy):
    # P stylisé
    P_PIX = [(0,0),(0,1),(0,2),(0,3),(0,4),(0,5),(0,6),
             (1,0),(2,0),(3,0),
             (1,3),(2,3),(3,3),
             (4,1),(4,2)]
    for (dx, dy) in P_PIX:
        putpx(img, cx-2+dx, cy-3+dy, GH)

def _sym_explosion(img, rng, cx, cy):
    for theta in range(0, 360, 30):
        rad = math.radians(theta)
        for r in range(0, 6):
            x = int(cx + r * math.cos(rad))
            y = int(cy + r * math.sin(rad))
            putpx(img, x, y, FIRE_H if r < 3 else FIRE_L)
    fill_circle(img, cx, cy, 2, FIRE_H)

def _sym_stag(img, rng, cx, cy):
    # Patronus simplifié = étoile + halo
    fill_circle(img, cx, cy, 5, (220,230,255,255))
    for (dx, dy) in [(-7,0),(7,0),(0,-7),(0,7)]:
        x, y = cx+dx, cy+dy
        putpx(img, x, y, (200,220,255,255))
    fill_circle(img, cx, cy, 2, (255,255,255,255))

def _sym_drop_red(img, rng, cx, cy):
    for dy in range(-5, 6):
        if dy < 0:
            half = max(0, dy + 4)
        else:
            half = max(0, 5 - dy // 2)
        for dx in range(-half, half+1):
            putpx(img, cx+dx, cy+dy, BLOOD_L)
    putpx(img, cx-1, cy-1, BLOOD_H)

def _sym_bat_small(img, rng, cx, cy):
    _bat(img, cx, cy, OUT)

def _sym_spider_small(img, rng, cx, cy):
    _spider(img, cx, cy, OUT)

def _sym_skull_small(img, rng, cx, cy):
    _skull(img, cx, cy, BONE_L, OUT)

def _sym_jagged(img, rng, cx, cy):
    # Pointes irrégulières (cruelty)
    for ang in (-30, 30, -90, -150, 150):
        rad = math.radians(ang)
        for r in range(0, 7):
            x = int(cx + r * math.cos(rad))
            y = int(cy + r * math.sin(rad))
            putpx(img, x, y, BLOOD_H if r < 3 else BLOOD_M)

def _sym_skull_snake(img, rng, cx, cy):
    _skull(img, cx, cy, (180,250,180,255), OUT)


# ─── Items spécifiques ──────────────────────────────────────

def gen_item_potion_s():
    return _flask(3401, BLOOD_D, HP_M, HP_L, glow=None)

def gen_item_potion_m():
    return _flask(3402, (50, 30, 110, 255), (130, 80, 200, 255), (200, 170, 250, 255))

def gen_item_felix():
    return _flask(3403, GD, GM, XP_H, glow=GL)

def gen_item_potion_force():
    return _flask(3404, (90, 25, 25, 255), (200, 60, 50, 255), (255, 130, 100, 255), glow=FIRE_H)

def gen_item_mandragore():
    """Racine de mandragore : forme tortueuse avec feuilles vertes."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3405)
    cx = 24
    # Feuilles (vertes, en éventail au sommet)
    leaf_color = VL
    for ang in range(-60, 61, 15):
        rad = math.radians(ang - 90)
        for r in range(0, 12):
            x = int(cx + r * math.cos(rad))
            y = int(10 + r * math.sin(rad)) + 4
            if 0 <= x < S and 0 <= y < S:
                col = leaf_color if r > 4 else VM
                putpx(img, x, y, vary(col, rng, 6))
                if r > 8:
                    putpx(img, x+1, y, VD)
    # Corps de la racine (forme humanoïde simple)
    SKIN_M = (210, 180, 130, 255)
    SKIN_D = (140, 100, 60, 255)
    # Tête
    for dy in range(-5, 6):
        for dx in range(-5, 6):
            d2 = dx*dx + dy*dy
            if d2 <= 25:
                putpx(img, cx+dx, 22+dy, vary(SKIN_M, rng, 8))
    # Corps allongé
    for y in range(28, 42):
        half = max(2, 6 - (y - 28) // 4)
        for x in range(cx-half, cx+half+1):
            t = (y - 28) / 14
            col = blend(SKIN_M, SKIN_D, 0.2 + t * 0.5)
            putpx(img, x, y, vary(col, rng, 6))
    # 2 yeux et bouche surprises
    putpx(img, cx-2, 21, OUT); putpx(img, cx+2, 21, OUT)
    for x in range(cx-1, cx+2):
        putpx(img, x, 24, OUT)
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


def gen_item_choco_sorcier():
    """Tablette de chocolat brisée."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3406)
    CHOCO_D = (40, 22, 12, 255)
    CHOCO_M = (90, 50, 24, 255)
    CHOCO_L = (140, 88, 50, 255)
    # Tablette (rectangle avec carreaux)
    for y in range(10, 38):
        for x in range(8, 40):
            t = (y - 10) / 28
            d_x = (x - 8) / 32
            base = blend(CHOCO_L, CHOCO_D, 0.2 + t * 0.4 + d_x * 0.1)
            putpx(img, x, y, vary(base, rng, 5))
    # Lignes carreaux (rainures)
    for x in (16, 24, 32):
        for y in range(10, 38):
            putpx(img, x, y, CHOCO_D)
    for y in (18, 26):
        for x in range(8, 40):
            putpx(img, x, y, CHOCO_D)
    # Highlight haut-gauche (carreau lumineux)
    for y in range(11, 17):
        for x in range(9, 15):
            putpx(img, x, y, CHOCO_L)
    # Pépites brillantes (lait/sucre)
    for (px, py) in [(12, 14),(20, 22),(28, 14),(36, 20),(20, 30),(28, 32)]:
        putpx(img, px, py, (250, 220, 180, 255))
    # Outline
    outline_rect(img, 8, 10, 39, 37, OUT)
    return img


def gen_item_wand1():
    return _wand_item(3407, (80, 60, 30, 255), (180, 130, 70, 255), XP_H)

def gen_item_wand2():
    return _wand_item(3408, (40, 25, 15, 255), (110, 70, 40, 255), (240, 240, 250, 255), has_runes=True)

def gen_item_sword_gryff():
    """Épée de Gryffondor : lame argent + pommeau or + rubis."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3409)
    # Lame diagonale ↗
    for t in range(28):
        x = 12 + t
        y = 36 - t
        for w in range(-2, 3):
            col = blend(MTH, MTM, abs(w) / 2.5)
            putpx(img, x+w, y-w, vary(col, rng, 4))
    # Garde (perpendiculaire à la lame)
    for i in range(-5, 6):
        putpx(img, 16+i, 32-i, GD)
        putpx(img, 17+i, 32-i, GM)
        putpx(img, 18+i, 32-i, GL)
        putpx(img, 19+i, 32-i, GD)
    # Manche cuir
    for i in range(8):
        for w in range(-1, 2):
            putpx(img, 11-i+w, 41-i, LD)
    # Pommeau or
    fill_circle(img, 7, 41, 3, GD)
    fill_circle(img, 7, 41, 2, GM)
    putpx(img, 7, 41, GH)
    # Rubis sur le manche
    fill_circle(img, 14, 38, 1, BLOOD_L)
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


def gen_item_robe1():
    """Robe d'élève renforcée — variation de gen_armor en gris."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3410)
    ROBE_D = (50, 50, 60, 255)
    ROBE_M = (90, 90, 110, 255)
    ROBE_L = (150, 150, 170, 255)
    # Capuche
    for y in range(8, 18):
        half = (y - 8) + 4
        for x in range(24-half, 24+half+1):
            t = (y - 8) / 10
            col = blend(ROBE_L, ROBE_D, 0.2 + t * 0.5)
            putpx(img, x, y, vary(col, rng, 4))
    # Encolure V
    for i in range(8):
        for w in range(-1, 2):
            putpx(img, 24+w, 12+i, ROBE_D)
            putpx(img, 24-i+w, 12+i, ROBE_D)
            putpx(img, 24+i+w, 12+i, ROBE_D)
    # Corps
    for y in range(18, 42):
        half = 10 + (y - 18) // 2
        for x in range(24-half, 24+half+1):
            t = (y - 18) / 24
            col = blend(ROBE_M, ROBE_D, 0.1 + t * 0.4)
            putpx(img, x, y, vary(col, rng, 5))
    # Plis
    for fold_x in (16, 24, 32):
        for y in range(20, 42):
            if img.getpixel((fold_x, y))[3] > 0:
                putpx(img, fold_x, y, ROBE_D)
    # Renforts plaques (cuir bouilli sur épaules)
    for y in range(18, 26):
        for x in (12, 13, 35, 36):
            if img.getpixel((x, y))[3] > 0:
                putpx(img, x, y, LM)
    # Boutons or
    for cy_b in (22, 28, 34):
        fill_circle(img, 24, cy_b, 1, GM)
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


def gen_item_coupe_poufsouffle():
    """Coupe de Poufsouffle : calice or à 2 anses."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3411)
    cx = 24
    # Coupe (bol)
    for y in range(8, 24):
        half = 10 - max(0, (24 - y - 6) // 2)
        for x in range(cx-half, cx+half+1):
            t = (y - 8) / 16
            d_x = abs(x - cx) / 10
            col = blend(GH, GD, 0.1 + t * 0.4 + d_x * 0.2)
            putpx(img, x, y, vary(col, rng, 4))
    # Pied / tige
    for y in range(24, 36):
        for x in (cx-2, cx-1, cx, cx+1, cx+2):
            t = abs(x - cx) / 2
            putpx(img, x, y, blend(GL, GD, 0.3 + t * 0.4))
    # Base élargie
    for y in range(36, 41):
        half = 8 - (40 - y)
        for x in range(cx-half, cx+half+1):
            t = (y - 36) / 5
            putpx(img, x, y, blend(GH, GD, 0.2 + t * 0.5))
    # Anses (2 demi-cercles)
    for theta in range(70, 290, 5):
        rad = math.radians(theta)
        x = int(cx - 12 + 5 * math.cos(rad))
        y = int(15 + 5 * math.sin(rad))
        if 0 <= x < S and 0 <= y < S:
            putpx(img, x, y, GM)
    for theta in range(-70, 110, 5):
        rad = math.radians(theta)
        x = int(cx + 12 + 5 * math.cos(rad))
        y = int(15 + 5 * math.sin(rad))
        if 0 <= x < S and 0 <= y < S:
            putpx(img, x, y, GM)
    # Blason poufsouffle (étoile)
    fill_circle(img, cx, 14, 2, (200, 80, 30, 255))
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


def gen_item_chapeau_pointu():
    """Chapeau de sorcier pointu."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3412)
    HAT_D = (20, 30, 80, 255)
    HAT_M = (50, 70, 140, 255)
    HAT_L = (100, 130, 200, 255)
    cx = 24
    # Cône (du sommet vers la base)
    for y in range(8, 32):
        half = (y - 8)
        # courbure
        if y > 24:
            half += (y - 24)
        for x in range(cx-half//2, cx+half//2+1):
            t = (y - 8) / 24
            col = blend(HAT_L, HAT_D, 0.2 + t * 0.5)
            putpx(img, x, y, vary(col, rng, 5))
    # Bord du chapeau (large)
    for y in range(32, 38):
        half = 18 - (y - 32) * 2
        if y == 32: half = 16
        for x in range(cx-half, cx+half+1):
            putpx(img, x, y, HAT_D)
    # Boucle/ceinture or
    for x in range(cx-13, cx+14):
        putpx(img, x, 30, GM)
        putpx(img, x, 31, GD)
    # Boucle métal centre
    fill_rect(img, cx-2, 29, cx+1, 32, GH)
    putpx(img, cx-1, 30, OUT); putpx(img, cx, 30, OUT)
    # Étoile or sur le cône
    putpx(img, cx-2, 18, GH); putpx(img, cx-1, 18, GH); putpx(img, cx, 18, GH)
    putpx(img, cx-1, 17, GH); putpx(img, cx-1, 19, GH)
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


def gen_item_amulette():
    """Amulette du Phénix : pendentif rond + chaîne."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3413)
    cx = 24
    # Chaîne (V au-dessus)
    for i in range(0, 14):
        putpx(img, cx-i, 6+i, GM)
        putpx(img, cx+i, 6+i, GM)
        if i % 2 == 0:
            putpx(img, cx-i, 6+i, GH)
            putpx(img, cx+i, 6+i, GH)
    # Anneau de suspension
    ring(img, cx, 17, 2, GD)
    # Pendentif (disque or)
    for dy in range(-12, 13):
        for dx in range(-12, 13):
            d2 = dx*dx + dy*dy
            if d2 > 12*12: continue
            t = (dy + 12) / 24
            d_x = abs(dx) / 12
            col = blend(GH, GD, 0.1 + t * 0.4 + d_x * 0.2)
            putpx(img, cx+dx, 30+dy, vary(col, rng, 5))
    # Phénix stylisé (oiseau au centre, rouge)
    PHX_M = (220, 70, 30, 255)
    PHX_L = (250, 150, 80, 255)
    # Corps
    for y in range(28, 34):
        for x in range(cx-2, cx+3):
            putpx(img, x, y, PHX_M)
    # Ailes déployées
    for i in range(4):
        putpx(img, cx-3-i, 30+i, PHX_M)
        putpx(img, cx+3+i, 30+i, PHX_M)
        putpx(img, cx-3-i, 29+i, PHX_L)
        putpx(img, cx+3+i, 29+i, PHX_L)
    # Tête + bec
    putpx(img, cx, 26, PHX_M); putpx(img, cx, 27, PHX_M)
    putpx(img, cx+1, 26, PHX_L)
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


def gen_item_broom():
    """Balai Nimbus 2000 : manche + brindilles."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3414)
    # Manche diagonal (haut-gauche → bas-droite)
    for t in range(0, 30):
        x = 6 + t
        y = 10 + t
        for w in range(-1, 2):
            col = blend(LL, LD, t / 30)
            putpx(img, x+w, y+w, vary(col, rng, 3))
    # Bague or à la base des brindilles
    for w in range(-2, 3):
        for d in range(-2, 3):
            x, y = 30+w, 34+d
            if abs(w) + abs(d) <= 3:
                putpx(img, x, y, GM)
    # Brindilles (plumage en éventail)
    BR_M = (140, 90, 40, 255)
    BR_L = (200, 140, 80, 255)
    BR_D = (80, 50, 20, 255)
    for ang in range(-40, 41, 5):
        rad = math.radians(ang + 20)
        for r in range(0, 14):
            x = int(33 + r * math.cos(rad))
            y = int(36 + r * math.sin(rad))
            if 0 <= x < S and 0 <= y < S:
                col = BR_L if r < 5 else BR_M if r < 10 else BR_D
                putpx(img, x, y, vary(col, rng, 5))
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


def gen_item_locket_slytherin():
    """Médaillon de Serpentard : ovale vert avec S serpentin."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3415)
    cx = 24
    # Chaîne
    for i in range(0, 12):
        putpx(img, cx-i, 6+i, GM)
        putpx(img, cx+i, 6+i, GM)
    ring(img, cx, 16, 2, GD)
    # Médaillon ovale
    for dy in range(-13, 14):
        for dx in range(-10, 11):
            d2 = (dx*dx)/0.7 + (dy*dy)/1.0
            if d2 > 13*13: continue
            t = (dy + 13) / 26
            col = blend(GH, GD, 0.1 + t * 0.5)
            putpx(img, cx+dx, 30+dy, vary(col, rng, 4))
    # Centre vert (émeraude)
    EMR_M = (40, 110, 60, 255)
    EMR_L = (80, 180, 100, 255)
    EMR_D = (20, 70, 40, 255)
    for dy in range(-9, 10):
        for dx in range(-7, 8):
            d2 = (dx*dx)/0.7 + (dy*dy)/1.0
            if d2 > 9*9: continue
            t = (dy + 9) / 18
            col = blend(EMR_L, EMR_D, 0.1 + t * 0.6)
            putpx(img, cx+dx, 30+dy, vary(col, rng, 5))
    # S stylisé
    S_PIX = [(0,0),(1,0),(2,0),(3,0),
             (0,1),(0,2),
             (1,3),(2,3),(3,3),
             (3,4),(3,5),
             (0,6),(1,6),(2,6),(3,6)]
    for (dx, dy) in S_PIX:
        putpx(img, cx-2+dx, 27+dy, GH)
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


def gen_item_diademe_serdaigle():
    """Diadème de Serdaigle : couronne fine avec gemme bleue centrale."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3416)
    cx = 24
    # Bandeau or (arc de cercle)
    for x in range(8, 41):
        # courbure
        offset = max(0, ((x - 24) ** 2) // 30)
        y = 22 + offset
        for w in (0, 1, 2):
            putpx(img, x, y+w, GM if w == 1 else GD)
    # Pointes triangulaires sur le bandeau
    for cx_p in (12, 17, 22, 27, 32, 37):
        for i in range(0, 5):
            offset = max(0, ((cx_p - 24) ** 2) // 30)
            y = 22 + offset - i
            for x in range(cx_p - i, cx_p + i + 1):
                if abs(x - cx_p) <= i:
                    putpx(img, x, y, GH if i < 3 else GM)
    # Pointe centrale plus haute (porte la gemme)
    for i in range(0, 8):
        offset = 0
        y = 22 - i
        for x in range(cx - i, cx + i + 1):
            putpx(img, x, y, GM)
    # Gemme bleue (saphir)
    SAPH_M = (40, 80, 180, 255)
    SAPH_L = (120, 170, 240, 255)
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            d2 = dx*dx + dy*dy
            if d2 <= 9:
                t = (dy + 3) / 6
                putpx(img, cx+dx, 16+dy, blend(SAPH_L, SAPH_M, 0.2 + t * 0.5))
    putpx(img, cx-1, 15, (220, 240, 255, 255))
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


def gen_item_cape_invis():
    """Cape d'Invisibilité : robe argentée semi-transparente."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3417)
    cx = 24
    CAPE_D = (60, 70, 90, 255)
    CAPE_M = (130, 150, 180, 230)
    CAPE_L = (200, 220, 240, 200)
    # Capuche
    for y in range(8, 18):
        half = (y - 8) + 5
        for x in range(cx-half, cx+half+1):
            t = (y - 8) / 10
            col = blend(CAPE_L, CAPE_D, 0.2 + t * 0.4)
            putpx(img, x, y, vary(col, rng, 5))
    # Encolure (vide)
    for i in range(7):
        for w in range(-1, 2):
            putpx(img, 24+w, 14+i, CAPE_D)
            putpx(img, 24-i+w, 14+i, CAPE_D)
            putpx(img, 24+i+w, 14+i, CAPE_D)
    # Corps en évasement
    for y in range(18, 42):
        half = 11 + (y - 18) // 2
        for x in range(cx-half, cx+half+1):
            t = (y - 18) / 24
            col = blend(CAPE_M, CAPE_D, 0.1 + t * 0.4)
            putpx(img, x, y, vary(col, rng, 6))
    # Étoiles scintillantes (effet magique)
    stars = [(13, 22),(34, 25),(20, 30),(30, 36),(15, 38),(28, 22)]
    for (px, py) in stars:
        if img.getpixel((px, py))[3] > 0:
            putpx(img, px, py, (240, 240, 255, 255))
            putpx(img, px-1, py, (180, 200, 230, 255))
            putpx(img, px+1, py, (180, 200, 230, 255))
            putpx(img, px, py-1, (180, 200, 230, 255))
            putpx(img, px, py+1, (180, 200, 230, 255))
    # Outline doux
    for y in range(S):
        for x in range(S):
            p = img.getpixel((x, y))
            if p[3] == 0: continue
            for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)]:
                nx, ny = x+dx, y+dy
                if 0 <= nx < S and 0 <= ny < S and img.getpixel((nx, ny))[3] == 0:
                    putpx(img, nx, ny, OUT)
    return img


# ─── Phase 3 extension : équipement étendu (12 items) ──────
# Sprites 48×48 pixel art, palette cohérente. Outline noir final
# appliqué via le helper _outline() partagé pour éviter la
# duplication de la triple boucle.

def _outline(img, color=OUT):
    """Ajoute un outline 1px sur tous les pixels opaques en bordure."""
    for y in range(S):
        for x in range(S):
            p = img.getpixel((x, y))
            if p[3] == 0: continue
            for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)]:
                nx, ny = x+dx, y+dy
                if 0 <= nx < S and 0 <= ny < S and img.getpixel((nx, ny))[3] == 0:
                    putpx(img, nx, ny, color)
    return img


def gen_item_gants_apprenti():
    """Paire de gants en cuir simples — vue de face, pouce levé."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3601)
    # Gant gauche (un peu décalé)
    for gx, ox in ((14, 0), (32, 1)):  # cx, miroir
        # Paume
        for y in range(20, 36):
            for x in range(gx-5, gx+6):
                t = (y - 20) / 16
                col = blend(LL, LD, 0.2 + t * 0.4)
                putpx(img, x, y, vary(col, rng, 5))
        # Doigts (4 stubs en haut)
        for fx in (gx-4, gx-2, gx, gx+2):
            for y in range(15, 20):
                putpx(img, fx, y, vary(LM, rng, 4))
                putpx(img, fx+1, y, vary(LL, rng, 4))
        # Pouce (côté)
        for y in range(22, 28):
            putpx(img, gx-6+ox*12, y, LM)
            putpx(img, gx-5+ox*12, y, LL)
        # Manchette dorée
        for y in range(35, 38):
            for x in range(gx-6, gx+7):
                putpx(img, x, y, GM if y == 36 else GD)
    return _outline(img)


def gen_item_bottes_apprenti():
    """Paire de bottes en cuir basique."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3602)
    for bx in (14, 32):
        # Tige verticale
        for y in range(10, 30):
            for x in range(bx-4, bx+5):
                t = (y - 10) / 20
                col = blend(LL, LD, 0.2 + t * 0.4)
                putpx(img, x, y, vary(col, rng, 5))
        # Pied (extension horizontale)
        for y in range(30, 38):
            for x in range(bx-4, bx+9):
                t = (y - 30) / 8
                col = blend(LM, LD, t)
                putpx(img, x, y, vary(col, rng, 4))
        # Semelle
        for x in range(bx-5, bx+10):
            putpx(img, x, 38, OUT)
            putpx(img, x, 37, OUT2)
        # Lacets (3 X)
        for y in (16, 22, 28):
            putpx(img, bx-1, y, GH); putpx(img, bx+1, y, GH)
    return _outline(img)


def gen_item_chapeau_apprenti():
    """Toque ronde d'apprenti (pas pointu, plus modeste)."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3603)
    cx = 24
    # Calotte (demi-cercle)
    for dy in range(-10, 4):
        for dx in range(-12, 13):
            d2 = dx*dx + dy*dy * 2
            if d2 > 144: continue
            t = (dy + 10) / 14
            col = blend(LL, LD, 0.2 + t * 0.4)
            putpx(img, cx+dx, 22+dy, vary(col, rng, 4))
    # Bord du chapeau (anneau de cuir)
    for x in range(cx-13, cx+14):
        for y in range(26, 30):
            t = (y - 26) / 4
            putpx(img, x, y, blend(LD, LM, 1-t))
    # Plume bleue à gauche
    PD_BLUE = (40, 60, 130, 255)
    PM_BLUE = (90, 130, 200, 255)
    for i, y in enumerate(range(8, 18)):
        x = cx - 12 + i // 2
        putpx(img, x, y, PM_BLUE)
        putpx(img, x-1, y+1, PD_BLUE)
    # Boucle dorée
    fill_rect(img, cx-2, 27, cx+1, 29, GH)
    return _outline(img)


def gen_item_ceinture_cuir():
    """Ceinture horizontale en cuir avec boucle dorée centrale."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3604)
    # Sangle
    for y in range(20, 28):
        for x in range(4, 44):
            t = (y - 20) / 8
            col = blend(LM, LD, 0.3 + t * 0.4)
            putpx(img, x, y, vary(col, rng, 5))
    # Trous (rivets)
    for x in (8, 14, 20, 38):
        ring(img, x, 24, 1, OUT)
    # Boucle dorée carrée au centre
    fill_rect(img, 22, 18, 30, 30, GD)
    fill_rect(img, 24, 20, 28, 28, GH)
    fill_rect(img, 25, 21, 27, 27, GM)
    # Pointe d'ardillon
    for y in range(23, 26):
        putpx(img, 30, y, GD)
    return _outline(img)


def gen_item_anneau_argent():
    """Anneau en argent simple, vu de 3/4."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3605)
    cx, cy = 24, 26
    # Ovale extérieur
    for dy in range(-12, 13):
        for dx in range(-13, 14):
            d2 = dx*dx + (dy*1.4)**2
            if d2 > 13*13: continue
            if d2 > 9*9:
                # Anneau
                t = (dy + 12) / 24
                col = blend(MTL, MTD, 0.2 + t * 0.4)
                putpx(img, cx+dx, cy+dy, vary(col, rng, 4))
    # Reflet sur le dessus
    for dx in range(-8, 9):
        if abs(dx) <= 8:
            putpx(img, cx+dx, cy-11, MTH)
    # Petite gemme bleue au sommet
    for dy in range(-3, 1):
        for dx in range(-2, 3):
            d2 = dx*dx + dy*dy
            if d2 <= 4:
                putpx(img, cx+dx, cy-14+dy, GLM)
                if d2 <= 1: putpx(img, cx+dx, cy-14+dy, GLL)
    return _outline(img)


def gen_item_cape_voyageur():
    """Cape brune drapée avec capuche."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3606)
    cx = 24
    CAPE_D = (60, 38, 22, 255)
    CAPE_M = (110, 75, 45, 255)
    CAPE_L = (150, 105, 65, 255)
    # Capuche (triangle pointu en haut)
    for y in range(8, 18):
        half = (y - 8) + 2
        for x in range(cx-half, cx+half+1):
            t = (y - 8) / 10
            col = blend(CAPE_L, CAPE_D, 0.3 + t * 0.4)
            putpx(img, x, y, vary(col, rng, 5))
    # Corps de la cape (trapèze)
    for y in range(18, 42):
        half = 10 + (y - 18)
        for x in range(cx-half, cx+half+1):
            t = (y - 18) / 24
            col = blend(CAPE_M, CAPE_D, 0.2 + t * 0.5)
            putpx(img, x, y, vary(col, rng, 6))
    # Plis verticaux
    for fx in (cx-12, cx-4, cx+4, cx+12):
        for y in range(20, 40):
            if 0 <= fx + (y//6) < S:
                putpx(img, fx, y, vary(CAPE_D, rng, 3))
    # Fermoir doré au cou
    fill_rect(img, cx-2, 16, cx+2, 19, GH)
    putpx(img, cx, 17, GD)
    return _outline(img)


def gen_item_amulette_protection():
    """Amulette en bouclier — pendentif triangulaire avec croix."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3607)
    cx = 24
    # Chaîne (V au-dessus)
    for i in range(0, 12):
        if i % 2 == 0:
            putpx(img, cx-i, 6+i, GH)
            putpx(img, cx+i, 6+i, GH)
        else:
            putpx(img, cx-i, 6+i, GM)
            putpx(img, cx+i, 6+i, GM)
    # Pendentif bouclier (forme blason)
    SHL_M = (90, 110, 140, 255)
    SHL_L = (140, 165, 200, 255)
    SHL_D = (40, 55, 80, 255)
    for y in range(18, 38):
        if y < 32:
            half = 9
        else:
            half = max(1, 9 - (y - 32) * 2)
        for x in range(cx-half, cx+half+1):
            t = (y - 18) / 20
            col = blend(SHL_L, SHL_D, 0.2 + t * 0.5)
            putpx(img, x, y, vary(col, rng, 4))
    # Croix dorée centrale
    for y in range(22, 32):
        putpx(img, cx, y, GH)
        putpx(img, cx-1, y, GM)
    for x in range(cx-4, cx+5):
        putpx(img, x, 26, GH)
        putpx(img, x, 27, GM)
    return _outline(img)


def gen_item_circlet_serdaigle():
    """Diadème fin avec gemme bleue centrale."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3608)
    cx = 24
    # Bandeau courbé (arc)
    for dx in range(-16, 17):
        # Hauteur courbée (fonction parabole)
        y = 24 + int((dx*dx) / 22)
        if y > 30: continue
        for dy in range(0, 4):
            t = dy / 4
            col = blend(GH, GD, 0.2 + t * 0.5)
            putpx(img, cx+dx, y+dy, vary(col, rng, 4))
    # Pointes décoratives (3 sur le devant)
    for px in (cx-6, cx, cx+6):
        for ph in range(0, 5):
            putpx(img, px, 18+ph, GH if ph % 2 == 0 else GM)
            if ph >= 3:
                putpx(img, px-1, 18+ph, GM)
                putpx(img, px+1, 18+ph, GM)
    # Gemme bleue centrale (saphir)
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            d2 = dx*dx + dy*dy
            if d2 > 9: continue
            col = GLM if d2 > 4 else GLL
            putpx(img, cx+dx, 23+dy, col)
    return _outline(img)


def gen_item_anneau_runique():
    """Anneau runique violet avec gemme épique."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3609)
    cx, cy = 24, 26
    # Anneau en or noirci
    GD2 = (60, 30, 80, 255)
    GM2 = (110, 60, 140, 255)
    GL2 = (160, 100, 200, 255)
    for dy in range(-12, 13):
        for dx in range(-13, 14):
            d2 = dx*dx + (dy*1.4)**2
            if d2 > 13*13: continue
            if d2 > 9*9:
                t = (dy + 12) / 24
                col = blend(GL2, GD2, 0.2 + t * 0.5)
                putpx(img, cx+dx, cy+dy, vary(col, rng, 4))
    # Runes gravées (3 marques sombres autour)
    for ang_deg in (-60, 0, 60):
        rad = math.radians(ang_deg)
        rx = int(cx + 11 * math.cos(rad - math.pi/2))
        ry = int(cy + 11 * 1.4 * math.sin(rad - math.pi/2))
        putpx(img, rx, ry, OUT)
        putpx(img, rx-1, ry, OUT)
        putpx(img, rx, ry-1, OUT)
    # Gemme violette épique au sommet
    for dy in range(-4, 1):
        for dx in range(-3, 4):
            d2 = dx*dx + dy*dy
            if d2 > 9: continue
            col = (160, 80, 220, 255) if d2 > 2 else (220, 180, 255, 255)
            putpx(img, cx+dx, cy-13+dy, col)
    return _outline(img)


def gen_item_ceinture_alchimiste():
    """Ceinture avec 4 petites fioles colorées suspendues."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3610)
    # Sangle
    for y in range(14, 22):
        for x in range(4, 44):
            t = (y - 14) / 8
            col = blend(LM, LD, 0.3 + t * 0.4)
            putpx(img, x, y, vary(col, rng, 5))
    # Boucle au centre
    fill_rect(img, 22, 12, 26, 24, GD)
    fill_rect(img, 23, 13, 25, 23, GH)
    # 4 fioles suspendues
    flask_colors = [
        ((180, 30, 30, 255), (250, 100, 80, 255)),   # rouge
        ((30, 80, 200, 255), (120, 170, 240, 255)),  # bleu
        ((30, 130, 50, 255), (100, 200, 120, 255)),  # vert
        ((180, 150, 30, 255), (240, 220, 100, 255)), # or
    ]
    for i, (cd, cl) in enumerate(flask_colors):
        fx = 8 + i * 10
        # Cordelette
        for y in range(22, 28):
            putpx(img, fx, y, OUT2)
        # Bouchon
        fill_rect(img, fx-2, 28, fx+2, 30, LD)
        # Corps fiole
        fill_rect(img, fx-2, 30, fx+2, 38, cd)
        fill_rect(img, fx-1, 31, fx, 36, cl)
    return _outline(img)


def gen_item_bottes_dragon():
    """Bottes en peau de dragon — écarlate, écailles, coutures."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3611)
    DR_D = (90, 16, 12, 255)
    DR_M = (160, 36, 24, 255)
    DR_L = (210, 70, 50, 255)
    for bx in (14, 32):
        # Tige
        for y in range(10, 30):
            for x in range(bx-4, bx+5):
                t = (y - 10) / 20
                col = blend(DR_L, DR_D, 0.2 + t * 0.4)
                putpx(img, x, y, vary(col, rng, 5))
        # Pied
        for y in range(30, 38):
            for x in range(bx-4, bx+9):
                t = (y - 30) / 8
                col = blend(DR_M, DR_D, t)
                putpx(img, x, y, vary(col, rng, 4))
        # Écailles (motif chevron sur la tige)
        for sy in range(12, 28, 3):
            for sx in (bx-3, bx, bx+3):
                putpx(img, sx, sy, DR_L)
                putpx(img, sx-1, sy+1, DR_M)
                putpx(img, sx+1, sy+1, DR_M)
        # Semelle noire
        for x in range(bx-5, bx+10):
            putpx(img, x, 38, OUT)
        # Boucle dorée en haut
        fill_rect(img, bx-3, 11, bx+3, 13, GD)
        putpx(img, bx, 12, GH)
    return _outline(img)


def gen_item_retourneur_temps():
    """Retourneur de temps — sablier or sur chaîne."""
    img = Image.new('RGBA', (S, S), TR)
    rng = random.Random(3612)
    cx = 24
    # Chaîne
    for i in range(0, 8):
        if i % 2 == 0:
            putpx(img, cx-i, 4+i, GH)
            putpx(img, cx+i, 4+i, GH)
        else:
            putpx(img, cx-i, 4+i, GM)
            putpx(img, cx+i, 4+i, GM)
    # Anneau du haut
    ring(img, cx, 13, 2, GD)
    # Cadre or extérieur (sablier — 2 trapèzes)
    # Plaque sup
    for x in range(cx-10, cx+11):
        putpx(img, x, 16, GD)
        putpx(img, x, 17, GH)
    # Plaque inf
    for x in range(cx-10, cx+11):
        putpx(img, x, 39, GD)
        putpx(img, x, 38, GH)
    # Côtés (4 piliers)
    for y in range(17, 39):
        putpx(img, cx-10, y, GD)
        putpx(img, cx-9, y, GM)
        putpx(img, cx+10, y, GD)
        putpx(img, cx+9, y, GM)
    # Verre supérieur (trapèze inverse) — sable doré qui s'écoule
    for y in range(18, 27):
        half = 9 - (y - 18)
        for x in range(cx-half, cx+half+1):
            putpx(img, x, y, GLM)
        # Sable au-dessus du col
        if y < 24:
            for x in range(cx-half+1, cx+half):
                putpx(img, x, y, vary(SBM, rng, 6))
    # Col central
    for y in range(26, 30):
        putpx(img, cx-1, y, GLD)
        putpx(img, cx, y, SBL)
        putpx(img, cx+1, y, GLD)
    # Verre inférieur (trapèze normal)
    for y in range(29, 38):
        half = (y - 29) + 1
        if half > 9: half = 9
        for x in range(cx-half, cx+half+1):
            putpx(img, x, y, GLM)
        # Petit tas de sable au fond
        if y >= 35:
            for x in range(cx-half+1, cx+half):
                putpx(img, x, y, vary(SBM, rng, 6))
    return _outline(img)


# ─── Spellbooks ─────────────────────────────────────────────

def gen_item_livre_sortileges():
    return _spellbook(3501, (20, 80, 30, 255), (60, 140, 60, 255), (15, 50, 20, 255), _sym_wand_diag)

def gen_item_livre_soin():
    return _spellbook(3502, (30, 60, 130, 255), (80, 130, 200, 255), (15, 35, 80, 255), _sym_heart)

def gen_item_book_monsters():
    return _spellbook(3503, (60, 30, 15, 255), (140, 90, 50, 255), (40, 18, 8, 255), _sym_eye)

def gen_item_livre_prince():
    return _spellbook(3504, (15, 15, 25, 255), (50, 50, 70, 255), (8, 8, 15, 255), _sym_letter_p)

def gen_item_livre_bombarda():
    return _spellbook(3505, (140, 70, 20, 255), (220, 130, 50, 255), (90, 40, 10, 255), _sym_explosion)

def gen_item_livre_patronum():
    return _spellbook(3506, (110, 110, 130, 255), (180, 190, 210, 255), (60, 60, 80, 255), _sym_stag)

def gen_item_livre_sanguini():
    return _spellbook(3507, (90, 15, 20, 255), (170, 40, 40, 255), (50, 8, 12, 255), _sym_drop_red)

def gen_item_livre_vampyrus():
    return _spellbook(3508, (40, 15, 60, 255), (110, 60, 150, 255), (20, 8, 35, 255), _sym_bat_small)

def gen_item_livre_taranta():
    return _spellbook(3509, (60, 30, 90, 255), (140, 80, 180, 255), (30, 15, 50, 255), _sym_spider_small)

def gen_item_livre_maledictus():
    return _spellbook(3510, (60, 25, 25, 255), (130, 50, 60, 255), (35, 10, 12, 255), _sym_skull_small)

def gen_item_livre_crucio():
    return _spellbook(3511, (15, 5, 5, 255), (60, 20, 25, 255), (8, 3, 3, 255), _sym_jagged, ring_color=BLOOD_M)

def gen_item_livre_morsmordre():
    return _spellbook(3512, (10, 30, 12, 255), (40, 90, 40, 255), (5, 18, 8, 255), _sym_skull_snake, ring_color=POI_M)


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
    # Phase 2 — équipement slots + status effects
    ('img/icons/wand.png',      gen_wand),
    ('img/icons/armor.png',     gen_armor),
    ('img/icons/accessory.png', gen_accessory),
    ('img/icons/burn.png',      gen_burn),
    ('img/icons/poison.png',    gen_poison),
    ('img/icons/bleed.png',     gen_bleed),
    ('img/icons/heal.png',      gen_heal),
    ('img/icons/dead.png',      gen_dead),
    # Phase 3 — Sortilèges (badges circulaires)
    ('img/icons/spells/stupefix.png',     gen_spell_stupefix),
    ('img/icons/spells/expelliarmus.png', gen_spell_expelliarmus),
    ('img/icons/spells/episkey.png',      gen_spell_episkey),
    ('img/icons/spells/protego.png',      gen_spell_protego),
    ('img/icons/spells/incendio.png',     gen_spell_incendio),
    ('img/icons/spells/accio.png',        gen_spell_accio),
    ('img/icons/spells/wingardium_leviosa.png', gen_spell_wingardium),
    ('img/icons/spells/diffindo.png',     gen_spell_diffindo),
    ('img/icons/spells/reparo.png',       gen_spell_reparo),
    ('img/icons/spells/sectumsempra.png', gen_spell_sectumsempra),
    ('img/icons/spells/lumos_maxima.png', gen_spell_lumos),
    ('img/icons/spells/aguamenti.png',    gen_spell_aguamenti),
    ('img/icons/spells/bombarda.png',     gen_spell_bombarda),
    ('img/icons/spells/riddikulus.png',   gen_spell_riddikulus),
    ('img/icons/spells/alohomora.png',    gen_spell_alohomora),
    ('img/icons/spells/patronum.png',     gen_spell_patronum),
    ('img/icons/spells/avada.png',        gen_spell_avada),
    ('img/icons/spells/sanguini.png',     gen_spell_sanguini),
    ('img/icons/spells/vampyrus.png',     gen_spell_vampyrus),
    ('img/icons/spells/tarantallegra.png',gen_spell_tarantallegra),
    ('img/icons/spells/maledictus.png',   gen_spell_maledictus),
    ('img/icons/spells/crucio.png',       gen_spell_crucio),
    ('img/icons/spells/morsmordre.png',   gen_spell_morsmordre),
    # Phase 4 — Items (potions, équipement, accessoires, livres)
    ('img/icons/items/potion_s.png',          gen_item_potion_s),
    ('img/icons/items/potion_m.png',          gen_item_potion_m),
    ('img/icons/items/felix.png',             gen_item_felix),
    ('img/icons/items/potion_force.png',      gen_item_potion_force),
    ('img/icons/items/mandragore.png',        gen_item_mandragore),
    ('img/icons/items/choco_sorcier.png',     gen_item_choco_sorcier),
    ('img/icons/items/wand1.png',             gen_item_wand1),
    ('img/icons/items/wand2.png',             gen_item_wand2),
    ('img/icons/items/sword_gryff.png',       gen_item_sword_gryff),
    ('img/icons/items/robe1.png',             gen_item_robe1),
    ('img/icons/items/coupe_poufsouffle.png', gen_item_coupe_poufsouffle),
    ('img/icons/items/chapeau_pointu.png',    gen_item_chapeau_pointu),
    ('img/icons/items/amulette.png',          gen_item_amulette),
    ('img/icons/items/broom.png',             gen_item_broom),
    ('img/icons/items/locket_slytherin.png',  gen_item_locket_slytherin),
    ('img/icons/items/diademe_serdaigle.png', gen_item_diademe_serdaigle),
    ('img/icons/items/cape_invis.png',        gen_item_cape_invis),
    ('img/icons/items/livre_sortileges.png',  gen_item_livre_sortileges),
    ('img/icons/items/livre_soin.png',        gen_item_livre_soin),
    ('img/icons/items/book_monsters.png',     gen_item_book_monsters),
    ('img/icons/items/livre_prince.png',      gen_item_livre_prince),
    ('img/icons/items/livre_bombarda.png',    gen_item_livre_bombarda),
    ('img/icons/items/livre_patronum.png',    gen_item_livre_patronum),
    ('img/icons/items/livre_sanguini.png',    gen_item_livre_sanguini),
    ('img/icons/items/livre_vampyrus.png',    gen_item_livre_vampyrus),
    ('img/icons/items/livre_taranta.png',     gen_item_livre_taranta),
    ('img/icons/items/livre_maledictus.png',  gen_item_livre_maledictus),
    ('img/icons/items/livre_crucio.png',      gen_item_livre_crucio),
    ('img/icons/items/livre_morsmordre.png',  gen_item_livre_morsmordre),
    # Phase 3 extension — équipement étendu (12 sprites dédiés)
    ('img/icons/items/gants_apprenti.png',      gen_item_gants_apprenti),
    ('img/icons/items/bottes_apprenti.png',     gen_item_bottes_apprenti),
    ('img/icons/items/chapeau_apprenti.png',    gen_item_chapeau_apprenti),
    ('img/icons/items/ceinture_cuir.png',       gen_item_ceinture_cuir),
    ('img/icons/items/anneau_argent.png',       gen_item_anneau_argent),
    ('img/icons/items/cape_voyageur.png',       gen_item_cape_voyageur),
    ('img/icons/items/amulette_protection.png', gen_item_amulette_protection),
    ('img/icons/items/circlet_serdaigle.png',   gen_item_circlet_serdaigle),
    ('img/icons/items/anneau_runique.png',      gen_item_anneau_runique),
    ('img/icons/items/ceinture_alchimiste.png', gen_item_ceinture_alchimiste),
    ('img/icons/items/bottes_dragon.png',       gen_item_bottes_dragon),
    ('img/icons/items/retourneur_temps.png',    gen_item_retourneur_temps),
]

if __name__ == '__main__':
    for path, fn in TARGETS:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        img = fn()
        img.save(path)
        print(f'✓ {path}')
    print(f'\n{len(TARGETS)} icons generated.')
