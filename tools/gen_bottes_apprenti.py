"""
Régénère bottes_apprenti.png 32×32 façon emoji 👢 (silhouette L inversée).
Cible : tige verticale visible, pied étendu vers la droite, semelle distincte,
lacets dorés en X, ourlet supérieur en cuir foncé.
"""
from PIL import Image

W, H = 32, 32
TR     = (0, 0, 0, 0)
LIGHT  = (172, 110, 60, 255)
MID    = (130, 76, 36, 255)
DARK   = (78, 42, 18, 255)
SOLE   = (32, 18, 6, 255)
LACE   = (235, 184, 80, 255)

img = Image.new('RGBA', (W, H), TR)
px  = img.load()

def fill(x0, y0, x1, y1, col):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if 0 <= x < W and 0 <= y < H:
                px[x, y] = col

TIG_X0, TIG_X1 = 10, 18
TIG_Y0, TIG_Y1 = 5, 21

fill(TIG_X0 - 1, TIG_Y0, TIG_X1 + 1, TIG_Y0 + 1, DARK)
fill(TIG_X0,     TIG_Y0 + 1, TIG_X1, TIG_Y0 + 2, MID)
fill(TIG_X0, TIG_Y0 + 3, TIG_X1, TIG_Y1, LIGHT)
fill(TIG_X1 - 1, TIG_Y0 + 3, TIG_X1, TIG_Y1, MID)

for y in range(TIG_Y0 + 3, TIG_Y1 + 1):
    px[TIG_X0 - 1, y] = DARK
    px[TIG_X1 + 1, y] = DARK

# Lacets dorés en X (3 paires)
for cy in (9, 13, 17):
    px[TIG_X0 + 1, cy]     = LACE; px[TIG_X0 + 2, cy + 1] = LACE
    px[TIG_X1 - 1, cy]     = LACE; px[TIG_X1 - 2, cy + 1] = LACE
    px[TIG_X0 + 3, cy + 2] = LACE; px[TIG_X1 - 3, cy + 2] = LACE
    px[(TIG_X0 + TIG_X1) // 2, cy + 2] = LACE

px[TIG_X0 + 4, 20] = LACE
px[TIG_X1 - 4, 20] = LACE

PIED_X0, PIED_X1 = 9, 27
PIED_Y0, PIED_Y1 = 22, 26

fill(PIED_X0, PIED_Y0, PIED_X1, PIED_Y1, LIGHT)
fill(PIED_X0, PIED_Y0, PIED_X0 + 2, PIED_Y1, MID)
px[PIED_X1, PIED_Y0]   = TR
px[PIED_X1, PIED_Y1]   = MID
px[PIED_X1 - 1, PIED_Y0] = MID

for x in range(PIED_X0, TIG_X0 - 1):
    px[x, PIED_Y0] = DARK
for x in range(TIG_X1 + 2, PIED_X1):
    px[x, PIED_Y0] = MID

fill(PIED_X0, 27, PIED_X1, 27, SOLE)
fill(PIED_X0, 28, PIED_X0 + 3, 29, SOLE)
fill(PIED_X1 - 2, 28, PIED_X1, 28, SOLE)

px[PIED_X0 + 4, PIED_Y0 + 1] = (210, 150, 95, 255)
px[PIED_X0 + 5, PIED_Y0 + 1] = (210, 150, 95, 255)

img.save('/home/user/hogwarth/img/icons/items/bottes_apprenti.png')
print('OK', img.size)
