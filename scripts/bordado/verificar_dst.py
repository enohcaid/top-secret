"""Controla un .dst generado contra el logo y dibuja una vista previa con el grosor real del hilo.

Uso: python scripts/bordado/verificar_dst.py <archivo.dst> --logo <logo.png> --alto 80 --png preview.png [--ejemplo ej.dst]
"""
import argparse
import math
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

sys.path.insert(0, str(Path(__file__).parent))
from dst_lib import codificar_terna, decodificar_terna, escribir, leer

ap = argparse.ArgumentParser()
ap.add_argument('dst')
ap.add_argument('--logo', default='logos/rebrand/Clean logo Dorado.png')
ap.add_argument('--alto', type=float, default=80)
ap.add_argument('--png')
ap.add_argument('--ejemplo', help='.dst real para comprobar que la librería lo reproduce byte a byte')
args = ap.parse_args()
problemas = []

# 1. Formato: ida y vuelta de todos los desplazamientos posibles.
for dx in range(-121, 122):
    for dy in range(-121, 122):
        for tipo in ('stitch', 'jump'):
            if decodificar_terna(codificar_terna(dx, dy, tipo)) != (dx, dy, tipo):
                problemas.append(f'codificación {dx},{dy},{tipo}')
print('codificación ida y vuelta:', 'ok' if not problemas else 'FALLA')

if args.ejemplo:
    _, cm, crudo = leer(args.ejemplo)
    tmp = Path(args.dst).with_suffix('.tmp-ejemplo')
    escribir(tmp, 'x', [(c[0], c[1], c[2]) for c in cm if c[2] != 'end'])
    ok = tmp.read_bytes()[512:] == crudo[512:]
    tmp.unlink()
    print('reproduce las puntadas del ejemplo byte a byte:', ok)
    if not ok:
        problemas.append('no reproduce el ejemplo')

campos, cmds, data = leer(args.dst)
st = [c for c in cmds if c[2] == 'stitch']
print('cabecera', {k: campos[k] for k in ('LA', 'ST', 'CO', '+X', '-X', '+Y', '-Y', 'AX', 'AY')})
print('tipos', dict(Counter(c[2] for c in cmds)), '| bytes', len(data))
if int(campos['ST']) != len(cmds):
    problemas.append(f"ST {campos['ST']} != {len(cmds)}")
if (cmds[-1][0], cmds[-1][1]) != (0, 0):
    problemas.append('no termina en el origen')
if (len(data) - 512 - 1) % 3:
    problemas.append('largo del cuerpo')
if any(c[2] == 'color' for c in cmds):
    problemas.append('hay cambios de color')

xs = [c[0] for c in cmds]
ys = [c[1] for c in cmds]
ancho, alto = (max(xs) - min(xs)) / 10, (max(ys) - min(ys)) / 10
print(f'tamaño {ancho:.1f} x {alto:.1f} mm, centro ({(max(xs)+min(xs))/20:.2f}, {(max(ys)+min(ys))/20:.2f}) mm')

largos = np.array([math.hypot(c[3], c[4]) / 10 for c in st])
print(f'puntadas: {len(st)} | mm: min {largos.min():.2f} mediana {np.median(largos):.2f} max {largos.max():.2f} | '
      f'tiempo a 800 ppm: {len(cmds)/800:.1f} min')
print('  < 0,3 mm:', int((largos < 0.3).sum()), '| > 5 mm:', int((largos > 5).sum()))
if (largos < 0.3).sum():
    problemas.append(f'{int((largos < 0.3).sum())} puntadas de menos de 0,3 mm')
if (largos > 5).sum():
    problemas.append(f'{int((largos > 5).sum())} puntadas de más de 5 mm')

# 2. Geometría contra el logo.
alfa = np.asarray(Image.open(args.logo).convert('RGBA').getchannel('A'))
m = alfa > 128
y0, x0 = np.where(m)
esc = args.alto / (y0.max() - y0.min() + 1)
cx, cy = (x0.max() + x0.min()) / 2, (y0.max() + y0.min()) / 2
afuera = ndi.distance_transform_edt(~m) * esc


def dist_afuera(x, y):
    r = int(round(cy - y / 10 / esc))
    c = int(round(x / 10 / esc + cx))
    if not (0 <= r < m.shape[0] and 0 <= c < m.shape[1]):
        return 99.0
    return afuera[r, c]


peor, fuera, prev, lista_fuera = 0.0, 0, (0, 0), []
trazos = []
for x, y, t, dx, dy in cmds:
    if t == 'stitch':
        n = max(2, int(math.hypot(dx, dy) / 0.5))
        d = max(dist_afuera(prev[0] + dx * i / n, prev[1] + dy * i / n) for i in range(n + 1))
        peor = max(peor, d)
        if d > 0.3:
            fuera += 1
            lista_fuera.append(((x / 10, y / 10), round(d, 2)))
        trazos.append((prev, (x, y)))
    prev = (x, y)
print(f'puntadas que pisan un hueco (más de 0,3 mm afuera del logo): {fuera}; peor {peor:.2f} mm', lista_fuera[:8])
if fuera:
    problemas.append(f'{fuera} puntadas cruzan huecos')

# 3. Cobertura a 0,4 mm de hilo: cuánto del logo queda tapado y cuánto se ensucia afuera.
PX = 25  # px por mm
W, H = int(ancho + 12) * PX, int(alto + 12) * PX
cov = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(cov)
ox, oy = W / 2, H / 2
for a, b in trazos:
    d.line([(a[0] / 10 * PX + ox, oy - a[1] / 10 * PX), (b[0] / 10 * PX + ox, oy - b[1] / 10 * PX)], fill=255, width=10)
cov = np.asarray(cov) > 0
rr, cc = np.mgrid[0:H, 0:W]
logo = np.zeros((H, W), bool)
fx = ((cc - ox) / PX / esc + cx).round().astype(int)
fy = (cy - (oy - rr) / PX / esc).round().astype(int)
vale = (fx >= 0) & (fx < m.shape[1]) & (fy >= 0) & (fy < m.shape[0])
logo[vale] = m[fy[vale], fx[vale]]
tapado = (cov & logo).sum() / logo.sum()
sucio = (cov & ~logo).sum() / logo.sum()
hueco = ndi.distance_transform_edt(logo & ~cov).max() * 2 / PX  # diámetro de la mayor zona sin hilo
print(f'cobertura del logo {tapado*100:.1f}% | hilo fuera del logo {sucio*100:.1f}% | mayor hueco sin hilo {hueco:.2f} mm')
if hueco > 0.6:
    problemas.append(f'hueco sin hilo de {hueco:.2f} mm')

# 4. Ranura central: tiene que seguir abierta después de bordar.
c0 = int(round(cx))
ancho_ranura = []
for r in range(int(cy + 0.55 * (y0.max() - cy)), int(cy + 0.9 * (y0.max() - cy)), 40):
    y_mm = (cy - r) * esc
    fila = cov[int(oy - y_mm * PX)]
    i = int(ox)
    izq = i
    while izq > 0 and not fila[izq]:
        izq -= 1
    der = i
    while der < W - 1 and not fila[der]:
        der += 1
    ancho_ranura.append((der - izq) / PX)
print('ranura entre las mitades del saco (mm, de arriba abajo):', ancho_ranura)
if ancho_ranura and min(ancho_ranura) < 0.5:
    problemas.append(f'la ranura se cierra: {min(ancho_ranura)} mm')

# 5. Vista previa: hilo dorado sobre tela oscura, con el brillo según la dirección de la puntada.
if args.png:
    SS = 40
    W2, H2 = int(ancho + 8) * SS, int(alto + 8) * SS
    img = Image.new('RGB', (W2, H2), (24, 24, 26))
    dr = ImageDraw.Draw(img)
    for a, b in trazos:
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        luz = 0.72 + 0.28 * abs(math.cos(ang - 0.9))
        col = tuple(int(v * luz) for v in (232, 182, 72))
        dr.line([(a[0] / 10 * SS + W2 / 2, H2 / 2 - a[1] / 10 * SS),
                 (b[0] / 10 * SS + W2 / 2, H2 / 2 - b[1] / 10 * SS)], fill=col, width=int(0.4 * SS))
    img = img.resize((W2 // 2, H2 // 2), Image.LANCZOS)
    img.save(args.png)
    print('vista previa', args.png, img.size)

print('RESULTADO:', 'OK' if not problemas else 'PROBLEMAS -> ' + '; '.join(problemas))
sys.exit(1 if problemas else 0)
