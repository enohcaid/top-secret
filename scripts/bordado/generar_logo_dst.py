"""Digitaliza el logo Clean de Top Secret a un .dst de un solo color (relleno tatami).

Uso: python scripts/bordado/generar_logo_dst.py --alto 80 --salida bordado/clean-dorado-80mm.dst

Cada pieza del logo lleva: atado, contorno interior + refuerzo cruzado (base que estabiliza la tela),
relleno por filas, contorno triple del borde y atado final. Entre piezas: saltos, para que la máquina corte el hilo.
"""
import argparse
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from skimage.graph import route_through_array
from skimage.measure import approximate_polygon, find_contours, label

sys.path.insert(0, str(Path(__file__).parent))
from dst_lib import escribir

ap = argparse.ArgumentParser()
ap.add_argument('--logo', default='logos/rebrand/Clean logo Dorado.png')
ap.add_argument('--alto', type=float, default=80, help='alto del bordado en mm')
ap.add_argument('--salida', required=True)
ap.add_argument('--fila', type=float, default=0.4, help='separación entre filas del relleno (mm)')
ap.add_argument('--largo', type=float, default=3.5, help='largo de puntada del relleno (mm)')
ap.add_argument('--compensacion', type=float, default=0.1, help='estirado de cada fila por el tirón del hilo (mm)')
args = ap.parse_args()

# Orden del centro hacia afuera y ángulo de relleno. Cambiar el ángulo entre piezas da el juego de brillo del hilo.
PIEZAS = [(3, 0, 'anteojos'), (4, 35, 'saco izq.'), (5, -35, 'saco der.'), (2, 90, 'ala'), (1, 0, 'copa')]
PASO_CONTORNO = 2.0
PASO_TRASLADO = 2.5
PASO_BORDE = 1.8
MIN_PUNTADA = 0.35
ESCALONADO = [0, 0.4, 0.8, 0.2, 0.6]  # desfase por fila: evita líneas visibles en el relleno
TOLERANCIA_BORDE = 0.25  # mm que una puntada puede pasarse del borde (compensación + redondeo)

alfa = np.asarray(Image.open(args.logo).convert('RGBA').getchannel('A')).astype(float)
ys0, xs0 = np.where(alfa > 128)
ESC = args.alto / (ys0.max() - ys0.min() + 1)  # mm por píxel
CX, CY = (xs0.max() + xs0.min()) / 2, (ys0.max() + ys0.min()) / 2
GRILLA = 6  # píxeles por celda en la búsqueda de traslados

etiquetas = label(alfa > 128, connectivity=2)


def a_mm(rc):
    return np.column_stack(((rc[:, 1] - CX) * ESC, (CY - rc[:, 0]) * ESC))


def a_px(p):
    return (CY - p[1] / ESC, p[0] / ESC + CX)


def contornos(campo, nivel, tol_px=1.0):
    salida = []
    for c in find_contours(campo, nivel):
        if len(c) >= 8 and np.allclose(c[0], c[-1]):
            salida.append(a_mm(approximate_polygon(c, tol_px)))
    return salida


def intervalos_por_fila(polis, grados, sep, encoger=0):
    """Cruza filas paralelas con los polígonos. Devuelve {fila: [(a, b), ...]} en ejes girados."""
    t = math.radians(grados)
    c, s = math.cos(t), math.sin(t)
    ejes = []
    for p in polis:
        u = p[:, 0] * c + p[:, 1] * s
        v = -p[:, 0] * s + p[:, 1] * c
        ejes.append((u, v))
    vmin = min(v.min() for _, v in ejes)
    vmax = max(v.max() for _, v in ejes)
    filas = {}
    for k in range(math.floor(vmin / sep), math.ceil(vmax / sep) + 1):
        vv = (k + 0.5) * sep
        cruces = []
        for u, v in ejes:
            u2, v2 = np.roll(u, -1), np.roll(v, -1)
            cruza = (v - vv) * (v2 - vv) < 0
            cruces += list(u[cruza] + (vv - v[cruza]) / (v2[cruza] - v[cruza]) * (u2[cruza] - u[cruza]))
        cruces.sort()
        tramos = []
        for a, b in zip(cruces[::2], cruces[1::2]):
            if tramos and a - tramos[-1][1] < 0.5:  # una ranura de menos de 0,5 mm se cierra igual
                tramos[-1] = (tramos[-1][0], b)
            else:
                tramos.append((a, b))
        tramos = [(a - encoger, b + encoger) for a, b in tramos if b - a >= 0.5]
        if tramos:
            filas[k] = tramos
    return filas, (c, s), sep


def secciones(filas):
    """Agrupa tramos en secciones que se pueden coser de corrido (un tramo por fila, solapados)."""
    cerradas, abiertas = [], []
    previa = None
    for k in sorted(filas):
        if previa is not None and k != previa + 1:
            cerradas += abiertas
            abiertas = []
        tramos = filas[k]
        solapes = [[i for i, sec in enumerate(abiertas)
                    if max(a, sec[-1][1]) < min(b, sec[-1][2])] for a, b in tramos]
        usadas = [i for s_ in solapes for i in s_]
        nuevas = []
        for (a, b), s_ in zip(tramos, solapes):
            if len(s_) == 1 and usadas.count(s_[0]) == 1:
                abiertas[s_[0]].append((k, a, b))
                nuevas.append(abiertas[s_[0]])
            else:
                nuevas.append([(k, a, b)])
        cerradas += [sec for sec in abiertas if not any(sec is n for n in nuevas)]
        abiertas = nuevas
        previa = k
    return cerradas + abiertas


class Costura:
    def __init__(self):
        self.pts = []  # puntadas en mm
        self.comandos = []  # (x, y, tipo) en 0,1 mm

    def pos(self):
        return self.pts[-1] if self.pts else None

    def agregar(self, p, forzar=False):
        p = (float(p[0]), float(p[1]))
        x, y = round(p[0] * 10), round(p[1] * 10)  # la distancia que importa es la ya redondeada a 0,1 mm
        if self.comandos and not forzar and math.hypot(x - self.comandos[-1][0], y - self.comandos[-1][1]) < MIN_PUNTADA * 10:
            return
        self.pts.append(p)
        self.comandos.append((x, y, 'stitch'))

    def saltar(self, p, minimo=4):
        """Salto a p en al menos `minimo` tramos: varias máquinas cortan el hilo al ver saltos seguidos."""
        x0, y0 = (self.comandos[-1][0], self.comandos[-1][1]) if self.comandos else (0, 0)
        x1, y1 = round(p[0] * 10), round(p[1] * 10)
        d = math.hypot(x1 - x0, y1 - y0)
        n = max(minimo, math.ceil(d / 100))
        for i in range(1, n + 1):
            self.comandos.append((x0 + round((x1 - x0) * i / n), y0 + round((y1 - y0) * i / n), 'jump'))
        self.pts.append((x1 / 10, y1 / 10))

    def atar(self, hacia):
        """Atado como el del ejemplo: dos para allá, dos para acá, dos para allá."""
        p = np.array(self.pos())
        d = np.array(hacia) - p
        if np.linalg.norm(d) < 1e-6:
            return
        d = d / np.linalg.norm(d) * 0.6
        for q in (p + d, p + 2 * d, p + d, p, p + d, p + 2 * d):
            self.agregar(q, forzar=True)


class Pieza:
    def __init__(self, n):
        self.mask = etiquetas == n
        self.adentro = ndi.distance_transform_edt(self.mask) * ESC
        self.afuera = ndi.distance_transform_edt(~self.mask) * ESC
        h, w = self.mask.shape
        self.grilla = (h // GRILLA + 1, w // GRILLA + 1)
        self.cubierto = Image.new('L', (self.grilla[1], self.grilla[0]), 0)

    def dentro(self, p, tol=TOLERANCIA_BORDE):
        r, c = a_px(p)
        r, c = int(round(r)), int(round(c))
        if not (0 <= r < self.mask.shape[0] and 0 <= c < self.mask.shape[1]):
            return False
        return self.afuera[r, c] <= tol

    def segmento_dentro(self, a, b):
        n = max(2, int(math.dist(a, b) / 0.1))
        return all(self.dentro((a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n)) for i in range(n + 1))

    def marcar_cubierto(self, a, b):
        ra, ca = a_px(a)
        rb, cb = a_px(b)
        ImageDraw.Draw(self.cubierto).line(
            [(ca / GRILLA, ra / GRILLA), (cb / GRILLA, rb / GRILLA)], fill=255, width=2)

    def ruta(self, a, b):
        """Camino por dentro de la pieza: pegado al borde o por lo que falta rellenar, para que quede tapado."""
        adentro = ndi.zoom(self.adentro, 1 / GRILLA, order=1, grid_mode=False)[:self.grilla[0], :self.grilla[1]]
        filas, cols = adentro.shape
        cub = np.asarray(self.cubierto)[:filas, :cols] > 0
        costo = np.where(adentro > 0.3, 1.0, 1e5)
        costo[cub & (adentro > 0.3)] = 6.0
        costo[(adentro > 0.3) & (adentro < 0.8)] = 0.3  # pegado al borde: lo tapa el contorno final
        ini = [int(np.clip(round(v / GRILLA), 0, m - 1)) for v, m in zip(a_px(a), (filas, cols))]
        fin = [int(np.clip(round(v / GRILLA), 0, m - 1)) for v, m in zip(a_px(b), (filas, cols))]
        camino, _ = route_through_array(costo, ini, fin, fully_connected=True, geometric=True)
        camino = approximate_polygon(np.array(camino, float) * GRILLA, 6.0)  # sin escalones de la grilla
        return [tuple(q) for q in a_mm(camino)][1:-1]

    def mover(self, cos, b, paso=PASO_TRASLADO):
        """Lleva la aguja hasta b sin salirse de la pieza, con puntadas cortas."""
        a = cos.pos()
        corto = math.dist(a, b) <= 3 and self.segmento_dentro(a, b)
        tramo = [b] if corto else self.ruta(a, b) + [b]
        for q in tramo:
            ori = cos.pos()
            d = math.dist(ori, q)
            n = max(1, math.ceil(d / paso))
            for i in range(1, n + 1):
                cos.agregar((ori[0] + (q[0] - ori[0]) * i / n, ori[1] + (q[1] - ori[1]) * i / n))


def coser_contorno(cos, pieza, poli):
    i = int(np.argmin(np.hypot(poli[:, 0] - cos.pos()[0], poli[:, 1] - cos.pos()[1])))
    anillo = np.vstack((poli[i:-1], poli[:i + 1]))
    pieza.mover(cos, anillo[0])
    for q in anillo[1:]:
        ori = cos.pos()
        n = max(1, math.ceil(math.dist(ori, q) / PASO_CONTORNO))
        for j in range(1, n + 1):
            cos.agregar((ori[0] + (q[0] - ori[0]) * j / n, ori[1] + (q[1] - ori[1]) * j / n))


def coser_borde(cos, pieza, poli):
    """Contorno triple (ida, vuelta, ida en cada puntada) sobre el relleno: tapa el serrucho de las filas."""
    i = int(np.argmin(np.hypot(poli[:, 0] - cos.pos()[0], poli[:, 1] - cos.pos()[1])))
    anillo = np.vstack((poli[i:-1], poli[:i + 1]))
    pieza.mover(cos, anillo[0])
    for q in anillo[1:]:
        ori = cos.pos()
        if math.dist(ori, q) < 0.6:
            continue
        n = max(1, math.ceil(math.dist(ori, q) / PASO_BORDE))
        for j in range(1, n + 1):
            a = cos.pos()
            b = (ori[0] + (q[0] - ori[0]) * j / n, ori[1] + (q[1] - ori[1]) * j / n)
            for r in (b, a, b):
                cos.agregar(r, forzar=True)


def puntos_fila(k, a, b, largo, sentido):
    """Puntos de la fila k sobre una retícula común, desfasada por fila (tatami)."""
    desfase = ESCALONADO[k % len(ESCALONADO)] * largo
    us = [a]
    j = math.ceil((a + MIN_PUNTADA * 1.5 - desfase) / largo)
    while (u := desfase + j * largo) < b - MIN_PUNTADA * 1.5:
        us.append(u)
        j += 1
    us.append(b)
    return us if sentido > 0 else us[::-1]


def coser_secciones(cos, pieza, grados, sep, polis, largo, encoger, marcar):
    filas, (c, s), sep = intervalos_por_fila(polis, grados, sep, encoger)
    pend = secciones(filas)
    n = len(pend)
    a_xy = lambda u, k: (u * c - (k + 0.5) * sep * s, u * s + (k + 0.5) * sep * c)
    while pend:
        pos = cos.pos()

        def esquinas(sec):
            return [(math.dist(pos, a_xy(sec[i][1 + j], sec[i][0])), i, j) for i in (0, -1) for j in (0, 1)]

        # Primero las secciones chicas: así los traslados pasan por lo que todavía falta rellenar y quedan tapados.
        chicas = [t for t in pend if len(t) < max(len(x) for x in pend)] or pend
        sec = min(chicas, key=lambda t: min(esquinas(t))[0])
        pend = [t for t in pend if t is not sec]
        _, i, j = min(esquinas(sec))
        orden = sec if i == 0 else sec[::-1]
        sentido = 1 if j == 0 else -1
        primera = True
        for k, a, b in orden:
            us = puntos_fila(k, a, b, largo, sentido)
            if primera:
                pieza.mover(cos, a_xy(us[0], k))
                primera = False
            else:
                pieza.mover(cos, a_xy(us[0], k))
            for u in us[1:]:
                cos.agregar(a_xy(u, k))
            if marcar:
                pieza.marcar_cubierto(a_xy(a, k), a_xy(b, k))
            sentido = -sentido
    return n


def main():
    cos = Costura()
    cos.comandos.append((0, 0, 'jump'))  # igual que el ejemplo: arranca con un salto nulo en el centro
    cos.pts.append((0.0, 0.0))
    for n, grados, nombre in PIEZAS:
        pieza = Pieza(n)
        campo = np.where(pieza.mask | (ndi.binary_dilation(pieza.mask, iterations=3) & (alfa > 0)), alfa, 0)
        borde = contornos(campo, 128, 0.8)
        interior_05 = contornos(pieza.adentro, 0.5, 1.0)
        interior_06 = contornos(pieza.adentro, 0.6, 1.0)

        # Arranque: punto del contorno interior más cercano a donde quedó la aguja.
        pos = cos.pos()
        ini_poli = min(interior_05, key=lambda p: np.hypot(p[:, 0] - pos[0], p[:, 1] - pos[1]).min())
        i = int(np.argmin(np.hypot(ini_poli[:, 0] - pos[0], ini_poli[:, 1] - pos[1])))
        cos.saltar(ini_poli[i])
        cos.atar(ini_poli[(i + 1) % (len(ini_poli) - 1)])
        for poli in sorted(interior_05, key=lambda p: np.hypot(p[:, 0] - pos[0], p[:, 1] - pos[1]).min()):
            coser_contorno(cos, pieza, poli)

        base = coser_secciones(cos, pieza, grados + 90, 2.5, interior_06, 3.5, 0, False)
        ini = len(cos.comandos)
        rell = coser_secciones(cos, pieza, grados, args.fila, borde, args.largo, args.compensacion, True)

        for poli in sorted(contornos(pieza.adentro, 0.1, 1.2), key=lambda p: np.hypot(p[:, 0] - cos.pos()[0], p[:, 1] - cos.pos()[1]).min()):
            coser_borde(cos, pieza, poli)

        # Atado final hacia atrás, sobre lo ya cosido.
        ultimo = cos.pos()
        previo = next(q for q in reversed(cos.pts) if math.dist(q, ultimo) >= 0.6)
        cos.atar(previo)
        print(f'{nombre}: ángulo {grados}°, base {base} secciones, relleno {rell} secciones, '
              f'{len(cos.comandos) - ini} comandos de relleno')

    cos.saltar((0, 0))
    salida = Path(args.salida)
    salida.parent.mkdir(parents=True, exist_ok=True)
    escribir(salida, salida.stem, cos.comandos)
    print(f'{salida}: {len(cos.comandos)} comandos')


main()
