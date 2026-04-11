#!/usr/bin/env python3
"""Hogwarth RPG — Pixel art texture generator (64×64, tileable, no AA)"""

from PIL import Image
import random, os

S = 64

# ─── Helpers ──────────────────────────────────────────────────
def blend(c1, c2, t):
    t = max(0.0, min(1.0, t))
    return tuple(max(0, min(255, int(c1[i] + (c2[i]-c1[i])*t))) for i in range(3))

def vary(c, rng, a=5):
    return tuple(max(0, min(255, c[i]+rng.randint(-a, a))) for i in range(3))

# ─── Palette ──────────────────────────────────────────────────
J    = (18,  14, 10)   # deep joint
JM   = (32,  26, 20)   # mid joint
SD   = (52,  48, 42)   # stone dark
SM   = (78,  73, 65)   # stone mid
SL   = (102, 97, 87)   # stone light
SH   = (128,122,110)   # stone highlight
SHH  = (148,142,128)   # stone super-highlight
MSD  = (32,  52, 22)   # moss dark
MSL  = (48,  72, 34)   # moss light
WVD  = (25,  15,  8)   # wood very dark
WD   = (40,  26, 13)   # wood dark
WM   = (60,  42, 22)   # wood mid
WL   = (82,  60, 33)   # wood light
WH   = (105, 80, 48)   # wood highlight
GD   = (115, 86, 15)   # gold dark
GM   = (168,132, 26)   # gold mid
GL   = (205,165, 45)   # gold light
RD   = (95,  18, 18)   # red dark
RM   = (140, 32, 32)   # red mid
RL   = (178, 52, 52)   # red light
CW   = (145,138,125)   # cobweb
RN   = (75,  62,105)   # rune purple

# ─── Brick/stone tile helper ──────────────────────────────────
def draw_bricks(img, rng, row_h=13, col_w=32,
                colors=(SD,SM,SL),
                joint_col=J, joint_m=JM,
                highlight=True, moss=False, cracks=0):
    n_rows = S // row_h + 2
    n_cols = S // col_w + 2
    bc = {(r,c): rng.choice(colors)
          for r in range(n_rows) for c in range(n_cols)}

    for y in range(S):
        ri  = y // row_h
        yi  = y %  row_h
        hj  = (yi == 0)
        off = (col_w // 2) if (ri % 2 == 1) else 0

        for x in range(S):
            xo  = (x + off) % S
            ci  = xo // col_w
            xi  = xo %  col_w
            vj  = (xi == 0)

            if hj or vj:
                col = joint_col
            else:
                col = vary(bc[(ri % n_rows, ci % n_cols)], rng, 3)
                if highlight:
                    if yi == 1:           col = blend(col, SHH, 0.28)
                    if yi == row_h - 1:   col = blend(col, joint_col, 0.22)
                    if xi == 1:           col = blend(col, SH,  0.18)
                    if xi == col_w - 1:   col = blend(col, joint_m, 0.18)
                if moss and yi >= row_h-3 and rng.random() < 0.05:
                    col = rng.choice((MSD, MSL))

            img.putpixel((x, y), col)

    for _ in range(cracks):
        cx, cy = rng.randint(2, S-3), rng.randint(2, S-3)
        dx, dy = rng.randint(-1, 1), rng.choice((-1, 1))
        for i in range(rng.randint(3, 8)):
            nx, ny = (cx + dx*i) % S, (cy + dy*i) % S
            if img.getpixel((nx, ny)) not in (joint_col, joint_m):
                img.putpixel((nx, ny), joint_m)


# ─── 1. walls/stone1.png ─ mur Poudlard classique ────────────
def gen_stone1():
    rng = random.Random(1001)
    img = Image.new('RGB', (S, S))
    draw_bricks(img, rng, row_h=13, col_w=32,
                colors=(SD, SD, SM, SM, SL),
                moss=True, cracks=5)
    return img


# ─── 2. walls/stone2.png ─ donjon ancien, runes ───────────────
def gen_stone2():
    rng = random.Random(1002)
    img = Image.new('RGB', (S, S))
    draw_bricks(img, rng, row_h=17, col_w=33,
                colors=(J, SD, SD, SM),
                highlight=True, cracks=9)
    # Rune marks: croix 5px teintée violet
    for _ in range(3):
        rx, ry = rng.randint(5, S-8), rng.randint(5, S-10)
        rc = blend(img.getpixel((rx % S, ry % S)), RN, 0.40)
        for dd in range(-1, 2):
            img.putpixel(((rx+dd) % S, ry      % S), rc)
        for dd in range(-2, 3):
            img.putpixel((rx      % S, (ry+dd) % S), rc)
    return img


# ─── 3. walls/wood.png ─ boiseries horizontales ───────────────
def gen_wood():
    rng = random.Random(1003)
    img = Image.new('RGB', (S, S), WD)

    PLANK_H = 12  # 12px planche + 1px joint (row_h=13)
    row_col  = [rng.choice((WD, WM, WM, WL)) for _ in range(8)]

    for y in range(S):
        ri = y // 13
        yi = y %  13
        hj = (yi == 0)

        for x in range(S):
            if hj:
                col = WVD
            else:
                base = row_col[ri % len(row_col)]
                # Grain horizontal
                gf = y % 3
                if   gf == 0: base = blend(base, WL, 0.10)
                elif gf == 2: base = blend(base, WD, 0.10)
                col = vary(base, rng, 4)
                if yi == 1:       col = blend(col, WH,  0.20)
                if yi == PLANK_H: col = blend(col, WVD, 0.28)
            img.putpixel((x, y), col)

    # Noeuds de bois
    for _ in range(3):
        kx, ky = rng.randint(4, S-5), rng.randint(2, S-3)
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                if abs(dx)+abs(dy) <= 3:
                    orig = img.getpixel(((kx+dx)%S, (ky+dy)%S))
                    img.putpixel(((kx+dx)%S, (ky+dy)%S), blend(orig, WVD, 0.45))

    # Traces de bougie / suie
    for _ in range(3):
        sx, sy = rng.randint(0, S-1), rng.randint(0, 10)
        for dy in range(rng.randint(2, 6)):
            for dx in range(-1, 2):
                if rng.random() < 0.65:
                    orig = img.getpixel(((sx+dx)%S, (sy+dy)%S))
                    img.putpixel(((sx+dx)%S, (sy+dy)%S), blend(orig, J, 0.55))

    # Lignes de sculpture dorées (milieu de certaines planches)
    for ri in (1, 3, 5):
        y0 = ri*13 + 6
        for x in range(S):
            if rng.random() < 0.38:
                orig = img.getpixel((x, y0 % S))
                img.putpixel((x, y0 % S), blend(orig, GD, 0.14))

    return img


# ─── 4. walls/tapestry.png ─ tissu rouge/or, seamless ─────────
def gen_tapestry():
    rng = random.Random(1004)
    img = Image.new('RGB', (S, S))

    for y in range(S):
        for x in range(S):
            # Armure de tissu (2×2 pixels)
            wx, wy = (x//2)%4, (y//2)%4
            if (wx+wy) % 4 < 2:
                base = blend(RM, RD, 0.30)
            else:
                base = blend(RM, RL, 0.20)
            col = vary(base, rng, 5)

            # Motif losange doré répété tous les 32px (seamless 64/32=2)
            dx2, dy2 = x % 32 - 16, y % 32 - 16
            d2 = abs(dx2) + abs(dy2)
            if 14 <= d2 <= 15:
                col = blend(col, GM, 0.65)
            elif 7 <= d2 <= 8:
                col = blend(col, GD, 0.50)
            elif d2 < 2:
                col = vary(GL, rng, 6)

            # Lignes de plis verticaux (tous les 16px)
            if x % 16 == 0:
                col = blend(col, RD, 0.22)

            img.putpixel((x, y), col)

    return img


# ─── 5. floor/stone.png ─ dalles de sol carrées ───────────────
def gen_floor_stone():
    rng = random.Random(1005)
    img = Image.new('RGB', (S, S))

    TILE = 32  # 31px dalle + 1px joint
    bc   = {(r, c): rng.choice((SM, SM, SL, SL, SH))
            for r in range(3) for c in range(3)}

    for y in range(S):
        ri = y // TILE
        yi = y %  TILE
        hj = (yi == 0)

        for x in range(S):
            ci = x // TILE
            xi = x %  TILE
            vj = (xi == 0)

            if hj or vj:
                col = J
            else:
                col = vary(bc[(ri % 3, ci % 3)], rng, 5)
                # Fondu sombre proche des joints
                e = min(xi-1, TILE-1-xi, yi-1, TILE-1-yi)
                if e <= 2:
                    col = blend(col, JM, 0.12 * (3-e))
            img.putpixel((x, y), col)

    # Poussière / salissures
    for _ in range(15):
        gx, gy = rng.randint(0, S-1), rng.randint(0, S-1)
        orig = img.getpixel((gx, gy))
        if orig != J:
            img.putpixel((gx, gy), blend(orig, JM, 0.15))

    return img


# ─── 6. floor/carpet.png ─ tapis rouge et or ──────────────────
def gen_floor_carpet():
    rng = random.Random(1006)
    img = Image.new('RGB', (S, S))

    for y in range(S):
        for x in range(S):
            dist = min(x, S-1-x, y, S-1-y)

            if dist < 3:
                col = vary(GM if dist == 2 else GL, rng, 5)
            elif dist < 5:
                col = vary(RD, rng, 3)
            elif dist < 7:
                col = vary(GD, rng, 5)
            else:
                col = vary(RM, rng, 4)
                # Motif losange or intérieur (tous les 16px)
                dx2, dy2 = x % 16 - 8, y % 16 - 8
                d2 = abs(dx2)+abs(dy2)
                if 7 <= d2 <= 8:
                    col = blend(col, GD, 0.45)
                elif d2 < 2:
                    col = blend(col, GM, 0.35)
                # Texture trame horizontale
                if y % 2 == 0:
                    col = blend(col, RD, 0.08)

            img.putpixel((x, y), col)

    return img


# ─── 7. ceiling/beams.png ─ poutres bois + pierre ─────────────
def gen_ceil_beams():
    rng    = random.Random(1007)
    img    = Image.new('RGB', (S, S))
    BEAM   = 10   # largeur poutre px
    PERIOD = 22   # poutre + pierre (tileable: 64 % 22 ≠ 0 mais pattern visible)

    for y in range(S):
        for x in range(S):
            xm = x % PERIOD

            if xm < BEAM:  # ── Poutre bois ──────────────────
                if xm == 0 or xm == BEAM-1:
                    col = WVD
                else:
                    g    = y % 5
                    base = WD if g<1 else WM if g<3 else WL
                    col  = vary(base, rng, 4)
                    if xm == 1: col = blend(col, WD, 0.35)
                    if y <= 1:  col = blend(col, WH, 0.28)
                if y < 5 and rng.random() < 0.06:
                    col = blend(WVD, J, 0.65)

            else:           # ── Pierre entre poutres ──────────
                xs     = xm - BEAM
                xs_max = PERIOD - BEAM - 1   # = 11
                ys     = y % 13
                hj     = (ys == 0)
                vj     = (xs == 0 or xs == xs_max)

                if hj or vj:
                    col = J
                else:
                    col = vary(rng.choice((SD, SM)), rng, 3)
                    if ys == 1:  col = blend(col, SH, 0.18)
                    if ys == 12: col = blend(col, J,  0.18)

            img.putpixel((x, y), col)

    # Toiles d'araignée
    for _ in range(3):
        bx = rng.randint(BEAM+1, BEAM + PERIOD - BEAM - 2) % S
        by = rng.randint(0, 12)
        for i in range(rng.randint(4, 10)):
            xx, yy = (bx+i) % S, (by + i//2) % S
            img.putpixel((xx, yy),
                         blend(img.getpixel((xx, yy)), CW, 0.52))

    return img


# ─── 8. ceiling/stone.png ─ plafond pierre simple ─────────────
def gen_ceil_stone():
    rng = random.Random(1008)
    img = Image.new('RGB', (S, S))
    draw_bricks(img, rng, row_h=13, col_w=32,
                colors=(SM, SL, SL, SH),
                joint_col=JM, joint_m=SM,
                highlight=True, cracks=2)
    return img


# ─── Main ─────────────────────────────────────────────────────
TARGETS = [
    ('img/textures/walls/stone1.png',   gen_stone1),
    ('img/textures/walls/stone2.png',   gen_stone2),
    ('img/textures/walls/wood.png',     gen_wood),
    ('img/textures/walls/tapestry.png', gen_tapestry),
    ('img/textures/floor/stone.png',    gen_floor_stone),
    ('img/textures/floor/carpet.png',   gen_floor_carpet),
    ('img/textures/ceiling/beams.png',  gen_ceil_beams),
    ('img/textures/ceiling/stone.png',  gen_ceil_stone),
]

if __name__ == '__main__':
    for path, fn in TARGETS:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        img = fn()
        img.save(path)
        print(f'✓ {path}')
    print(f'\n{len(TARGETS)} textures generated.')
