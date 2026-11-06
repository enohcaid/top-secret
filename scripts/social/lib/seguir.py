#!/usr/bin/env python
# Seguimiento sobre video real, sin opencv: movimiento de cámara cuadro a cuadro (homografía por Gauss-Newton sobre toda la
# imagen, robusta a los jugadores) y jugadores por mean-shift sobre su color (camiseta oscura o blanca).
# Sirve para dibujar marcas "pegadas al pasto" estilo análisis de TV: todo sale en coordenadas del cuadro de referencia.
#
#   python seguir.py <ffmpeg> <config.json> <salida.json>
#   config: { video, desde, largo, fps, ancho, alto, referencia, recorteY: [y0, y1],
#             pistas: [{ id, tipo: 'oscuro'|'blanco', cuadro, x, y }] }   (x, y: centro del cuerpo en ese cuadro)
#   salida: { n, H: [H de cada cuadro → referencia], pistas: { id: [[x, y, pieY] de cada cuadro] } }
import json, subprocess, sys
import numpy as np

ffmpeg, cfg_path, salida = sys.argv[1:4]
cfg = json.load(open(cfg_path, encoding='utf8'))
W, H_ = cfg['ancho'], cfg['alto']

p = subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-ss', str(cfg['desde']), '-i', cfg['video'], '-t', str(cfg['largo']),
                    '-vf', f"fps={cfg['fps']}", '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE, check=True)
cuadros = np.frombuffer(p.stdout, dtype=np.uint8).reshape(-1, H_, W, 3)
n = len(cuadros)
print(f'{n} cuadros', flush=True)


def achicar(g):
    return (g[:-1:2, :-1:2] + g[1::2, :-1:2] + g[:-1:2, 1::2] + g[1::2, 1::2]) / 4


def piramide(i):
    g = cuadros[i][..., 1].astype(np.float32) * .6 + cuadros[i][..., 0].astype(np.float32) * .3 + cuadros[i][..., 2].astype(np.float32) * .1
    g = achicar(g)   # 640x360
    return [g, achicar(g), achicar(achicar(g))]


def muestrear(img, x, y):
    h, w = img.shape
    x = np.clip(x, 0, w - 1.001); y = np.clip(y, 0, h - 1.001)
    x0 = x.astype(np.int32); y0 = y.astype(np.int32); fx = x - x0; fy = y - y0
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy)


def aplicar(M, x, y):
    d = M[2, 0] * x + M[2, 1] * y + M[2, 2]
    return (M[0, 0] * x + M[0, 1] * y + M[0, 2]) / d, (M[1, 0] * x + M[1, 1] * y + M[1, 2]) / d


def escalar(M, f):
    S = np.diag([f, f, 1.0]); return S @ M @ np.linalg.inv(S)


# M: puntos del cuadro A → cuadro B. Gauss-Newton con parámetros normalizados y pesos de Huber (los jugadores son atípicos).
def camara(A, B, M0):
    M = escalar(M0, 1 / 8)
    y0, y1 = cfg['recorteY']
    for nivel, iters in [(2, 8), (1, 6), (0, 4)]:
        a, b = A[nivel], B[nivel]; f = 2 ** (nivel + 1)
        paso = 1 if nivel else 2
        ys, xs = np.mgrid[int(y0 / f):int(y1 / f):paso, 4:a.shape[1] - 4:paso]
        x = xs.astype(np.float32).ravel(); y = ys.astype(np.float32).ravel()
        ref = a[ys, xs].ravel()
        cx, cy = a.shape[1] / 2, a.shape[0] / 2; e = max(cx, cy)
        xn = (x - cx) / e; yn = (y - cy) / e
        for _ in range(iters):
            wx, wy = aplicar(M, x, y)
            v = muestrear(b, wx, wy)
            gx = (muestrear(b, wx + 1, wy) - muestrear(b, wx - 1, wy)) / 2
            gy = (muestrear(b, wx, wy + 1) - muestrear(b, wx, wy - 1)) / 2
            r = ref - v
            s = max(1.5, 1.4826 * np.median(np.abs(r)))
            pesos = np.minimum(1, 2 * s / np.maximum(np.abs(r), 1e-3))
            J = e * np.stack([gx * xn, gx * yn, gx, gy * xn, gy * yn, gy, -(gx * xn + gy * yn) * xn, -(gx * xn + gy * yn) * yn], 1)
            JW = J * pesos[:, None]
            d = np.linalg.solve(J.T @ JW + np.eye(8) * 1e-3, JW.T @ r)
            # Vuelve a píxeles: H(p) = N⁻¹ (I + Δ) N, con N la normalización
            N = np.array([[1 / e, 0, -cx / e], [0, 1 / e, -cy / e], [0, 0, 1]])
            D = np.array([[1 + d[0], d[1], d[2]], [d[3], 1 + d[4], d[5]], [d[6], d[7], 1]])
            M = M @ (np.linalg.inv(N) @ D @ N)
            M /= M[2, 2]
        if nivel:
            M = escalar(M, 2)
    return escalar(M, 2)   # de 640x360 a 1280x720


print('Cámara…', flush=True)
pir = piramide(0)
pasos = [np.eye(3)]   # pasos[i]: cuadro i-1 → cuadro i
ult = np.eye(3)
for i in range(1, n):
    sig = piramide(i)
    ult = camara(pir, sig, ult)
    pasos.append(ult.copy()); pir = sig
    if i % 60 == 0:
        print(f'  {i}/{n}  dx {ult[0, 2]:+.1f}  dy {ult[1, 2]:+.1f}', flush=True)

r = cfg['referencia']
Hs = [None] * n
Hs[r] = np.eye(3)
for i in range(r + 1, n):
    Hs[i] = Hs[i - 1] @ np.linalg.inv(pasos[i])
for i in range(r - 1, -1, -1):
    Hs[i] = Hs[i + 1] @ pasos[i + 1]


def mascara(fr, tipo):
    f = fr.astype(np.int16)
    R, G, B = f[..., 0], f[..., 1], f[..., 2]
    if tipo == 'oscuro':
        return (np.maximum(np.maximum(R, G), B) < 105) & (G - R < 16)
    return (np.minimum(np.minimum(R, G), B) > 165) & (np.abs(R - G) < 34)


def buscar(i, x, y, tipo):
    rx, ry = 15, 25
    for _ in range(6):
        x0, x1 = max(0, int(x - rx)), min(W, int(x + rx) + 1)
        y0, y1 = max(0, int(y - ry)), min(H_, int(y + ry) + 1)
        m = mascara(cuadros[i][y0:y1, x0:x1], tipo)
        if m.sum() < 12:
            return x, y, None
        ys, xs = np.nonzero(m)
        nx, ny = xs.mean() + x0, ys.mean() + y0
        hecho = abs(nx - x) + abs(ny - y) < .3
        x, y = nx, ny
        if hecho:
            break
    return x, y, (ys.max() + y0 if len(ys) else None)


def seguir(pista):
    s = [None] * n
    c = pista['cuadro']
    x, y, pie = buscar(c, pista['x'], pista['y'], pista['tipo'])
    s[c] = (x, y, pie)
    for sentido in (1, -1):
        px, py = s[c][0], s[c][1]; vx = vy = 0.0
        i = c + sentido
        while 0 <= i < n:
            # Posición que tendría por el movimiento de cámara + su propia velocidad
            M = pasos[i] if sentido == 1 else np.linalg.inv(pasos[i + 1])
            ex, ey = aplicar(M, px, py)
            x, y, pie = buscar(i, ex + vx, ey + vy, pista['tipo'])
            if pie is None:
                x, y = ex + vx, ey + vy
            vx += .25 * ((x - ex) - vx); vy += .25 * ((y - ey) - vy)
            s[i] = (x, y, pie); px, py = x, y
            i += sentido
    return s


def suavizar(a, sigma=3.0):
    k = np.exp(-.5 * (np.arange(-9, 10) / sigma) ** 2); k /= k.sum()
    return np.convolve(np.pad(a, 9, mode='edge'), k, mode='valid')


print('Jugadores…', flush=True)
pistas = {}
for pi in cfg['pistas']:
    s = seguir(pi)
    # Pie: el cuerpo mide casi lo mismo de un cuadro al siguiente; se usa la mediana de la distancia centro-pie para los huecos
    alto = np.median([q[2] - q[1] for q in s if q[2] is not None])
    xy = np.array([aplicar(Hs[i], s[i][0], s[i][1] + alto) for i in range(n)])   # en coordenadas de la referencia, ya sobre el pasto
    # Se suaviza sobre el pasto (ahí el movimiento es el del jugador, sin la cámara)
    gx, gy = suavizar(xy[:, 0]), suavizar(xy[:, 1])
    pistas[pi['id']] = {'alto': float(alto), 'pasto': [[round(float(a), 2), round(float(b), 2)] for a, b in zip(gx, gy)]}
    print(f"  {pi['id']}: alto {alto:.1f}", flush=True)

json.dump({'n': n, 'fps': cfg['fps'], 'desde': cfg['desde'], 'referencia': r,
           'H': [[round(float(v), 8) for v in h.ravel()] for h in Hs], 'pistas': pistas}, open(salida, 'w', encoding='utf8'))
print('Listo', flush=True)
