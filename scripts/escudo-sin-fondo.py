# Saca el fondo a un escudo de rival (los que la liga sube con fondo cuadrado opaco).
#   python scripts/escudo-sin-fondo.py <entrada> <salida.webp> [relleno|rembg] [tolerancia]
# relleno (por defecto): borra el color del borde inundando desde todo el contorno (fondos lisos: negro,
#   blanco, crema, azul oscuro) — no toca lo de adentro aunque sea del mismo color, porque el anillo o el
#   borde del escudo corta la inundación. rembg: para fondos con textura o degradé.
# Recorta el sobrante transparente, deja un margen chico y lleva el lado mayor a 256 px.
import sys
from collections import deque
from PIL import Image, ImageFilter

ent, sal = sys.argv[1], sys.argv[2]
modo = sys.argv[3] if len(sys.argv) > 3 else 'relleno'
tol = int(sys.argv[4]) if len(sys.argv) > 4 else 40

img = Image.open(ent).convert('RGBA')
if modo == 'rembg':
    from rembg import remove
    img = remove(img)
else:
    w, h = img.size
    px = img.load()
    borde = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    # Color del fondo: el que se pase (hex, 5° argumento) o el más común entre los píxeles opacos del borde.
    # Fijo, no "sigue" al píxel vecino: si siguiera, se metería por los bordes suaves en los colores del escudo.
    if len(sys.argv) > 5:
        hx = sys.argv[5].lstrip('#')
        ref = tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4))
    else:
        cuenta = {}
        for x, y in borde:
            if px[x, y][3] > 16:
                c = tuple(v // 8 * 8 for v in px[x, y][:3])
                cuenta[c] = cuenta.get(c, 0) + 1
        ref = max(cuenta, key=cuenta.get) if cuenta else (0, 0, 0)
    vistos = bytearray(w * h)
    cola = deque()
    for x, y in borde:
        vistos[y * w + x] = 1
        cola.append((x, y))
    mascara = Image.new('L', (w, h), 255)
    m = mascara.load()
    while cola:
        x, y = cola.popleft()
        r, g, b, a = px[x, y]
        # lo transparente se atraviesa (hay escudos con un cuadro de color rodeado de borde transparente)
        if a > 16 and abs(r - ref[0]) + abs(g - ref[1]) + abs(b - ref[2]) > tol * 3:
            continue
        m[x, y] = 0
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not vistos[ny * w + nx]:
                vistos[ny * w + nx] = 1
                cola.append((nx, ny))
    mascara = mascara.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))   # borde limpio, sin halo
    alfa = Image.composite(img.getchannel('A'), Image.new('L', img.size, 0), mascara)
    img.putalpha(alfa)

caja = img.getchannel('A').point(lambda v: 255 if v > 16 else 0).getbbox()
if caja:
    img = img.crop(caja)
lado = max(img.size)
lienzo = Image.new('RGBA', (int(lado * 1.04), int(lado * 1.04)), (0, 0, 0, 0))
lienzo.paste(img, ((lienzo.width - img.width) // 2, (lienzo.height - img.height) // 2), img)
lienzo.thumbnail((256, 256), Image.LANCZOS)
lienzo.save(sal, 'WEBP', quality=90)
print(sal, lienzo.size)
