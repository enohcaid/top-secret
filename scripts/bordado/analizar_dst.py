"""Analiza un .dst: cabecera, cantidad de puntadas, largos, saltos y vista previa PNG.
Uso: python scripts/bordado/analizar_dst.py <archivo.dst> [salida.png]
"""
import math
import sys
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).parent))
from dst_lib import leer

campos, cmds, data = leer(sys.argv[1])
print('tamaño', len(data), 'bytes')
print('cabecera', campos)
print('cabecera cruda', data[:125])
print('primeros bytes de puntadas', data[512:512 + 45].hex(' '))
print('últimos', data[-12:].hex(' '))
print('tipos', Counter(c[2] for c in cmds))
xs = [c[0] for c in cmds]
ys = [c[1] for c in cmds]
print(f'bbox x {min(xs)}..{max(xs)}  y {min(ys)}..{max(ys)}  => {(max(xs)-min(xs))/10:.1f} x {(max(ys)-min(ys))/10:.1f} mm')
largos = [math.hypot(c[3], c[4]) / 10 for c in cmds if c[2] == 'stitch' and (c[3] or c[4])]
if largos:
    largos_o = sorted(largos)
    print(f'puntada mm: min {largos_o[0]:.2f} mediana {largos_o[len(largos_o)//2]:.2f} max {largos_o[-1]:.2f}')
    print('histograma mm', sorted(Counter(round(l, 1) for l in largos).items()))
print('primeros comandos', [(c[2][0], c[3], c[4]) for c in cmds[:40]])
print('últimos comandos', [(c[2][0], c[3], c[4]) for c in cmds[-15:]])

if len(sys.argv) > 2:
    esc = 1600 / max(max(xs) - min(xs), max(ys) - min(ys), 1)
    m = 40
    w = int((max(xs) - min(xs)) * esc) + 2 * m
    h = int((max(ys) - min(ys)) * esc) + 2 * m
    img = Image.new('RGB', (w, h), 'white')
    d = ImageDraw.Draw(img)
    pal = [(180, 130, 30), (30, 80, 180), (180, 30, 30), (30, 140, 60)]
    col = 0
    prev = None
    for x, y, t, *_ in cmds:
        p = ((x - min(xs)) * esc + m, (max(ys) - y) * esc + m)
        if t == 'color':
            col += 1
        if t == 'stitch' and prev:
            d.line([prev, p], fill=pal[col % 4], width=1)
        elif t == 'jump' and prev:
            d.line([prev, p], fill=(220, 220, 220), width=1)
        prev = p
    img.save(sys.argv[2])
