"""LAST TIME AGAIN: instrumental de trap oscuro para el disco Thrive (Tacet Sin).

Concepto: la promesa de "esta es la ultima vez" que se afloja cada vez que vuelve la noche.
El alivio y la verguenza se mezclan en el mismo trago, y el sonido cuenta ese aflojarse.

Emocion por seccion:
  intro  - flauta y caja de musica solas, niebla: la noche que todavia no empezo a ganar
  verse  - medio tiempo con aplomo, 808 que respira, flauta apenas en los huecos: el rapero
           tiene el pocket y los medios libres; la promesa se dice en voz baja
  chorus - se abre: flauta plena, coro oscuro, pad ancho, caja de musica contestando; hueco al centro
           para el duo (ella canta el gancho)
  bridge - beat switch: sin bombo ni clap, tresillos y 808 largo que se desliza; flauta una octava
           abajo y caja de musica con la llamada: el momento melodico de ella
  outro  - la flauta casi sin tono, solo aire: la promesa disuelta

Rasgo distintivo: la flauta que se desafina al exhalar. Cada repeticion de la llamada pierde
mas tono al final de cada nota (la afinacion cae y gana aire) hasta ser casi puro soplido:
la promesa que no se sostiene. No hay espejo ni reversa: es el aliento el que se rinde.

Estructura (136 BPM, do# menor, 80 compases, ~141 s):
  intro 8 / verse 16 / chorus 8 / verse 16 / chorus 8 / bridge 8 / chorus 12 / outro 4

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/last_time_again.py out.wav
"""
import json
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, hz, t_arr, lp, hp, bp, env_adsr, poner, repitch, reverb_ir, con_reverb,
                      delay_pingpong, paneo, saturar, ochocientos, clap, pad, vox, cinta)

BPM = 136
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SW = 0.07 * S16
rng = np.random.default_rng(20261108)
NN = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NN[nombre[:-1]]


# ── Armonia: C#m - A - F#m - G#m (menor natural, sin brillo mayor) ───────────
ACORDES = [[56, 61, 64], [57, 61, 64], [57, 61, 66], [59, 63, 68]]
R808 = [25, 33, 30, 32]

CALL = [[(0, 'G#4', 6), (8, 'C#5', 3), (12, 'E5', 4)],
        [(0, 'E5', 4), (6, 'C#5', 2), (8, 'B4', 8)],
        [(2, 'A4', 3), (6, 'C#5', 3), (10, 'F#5', 6)],
        [(0, 'D#5', 4), (6, 'B4', 3), (10, 'G#4', 6)],
        [(0, 'C#5', 3), (4, 'E5', 3), (8, 'G#5', 6)],
        [(0, 'A5', 4), (6, 'E5', 2), (10, 'C#5', 6)],
        [(0, 'F#5', 3), (4, 'E5', 2), (8, 'C#5', 3), (12, 'A4', 4)],
        [(0, 'B4', 3), (4, 'D#5', 3), (8, 'G#4', 8)]]
MB_V = {1: [(10, 'G#5'), (13, 'E6')], 3: [(2, 'C#6'), (5, 'B5'), (8, 'G#5')]}
MB_C = {0: [(4, 'C#6'), (7, 'E6'), (12, 'G#6')], 1: [(6, 'B5'), (10, 'E6')],
        2: [(2, 'A5'), (5, 'C#6'), (10, 'F#6')], 3: [(0, 'D#6'), (6, 'B5'), (9, 'G#5')]}

# 808: (paso, semitonos sobre la raiz, largo en pasos, glide en seg)
VP = [[(0, 0, 6, 0), (7, 0, 2, 0), (10, 0, 5, 0)],
      [(0, 0, 4, 0), (6, 12, 3, .06), (10, 0, 4, 0), (14, 0, 2, 0)],
      [(0, 0, 6, 0), (9, 0, 3, 0), (12, 7, 3, .05)],
      [(0, 0, 5, 0), (7, 0, 2, 0), (11, 12, 2, .05), (14, 0, 2, 0)]]
CP = [[(0, 0, 3, 0), (3, 0, 2, 0), (6, 12, 2, .05), (10, 0, 3, 0), (13, 0, 3, 0)],
      [(0, 0, 4, 0), (6, 0, 2, 0), (8, 12, 2, .06), (11, 0, 2, 0), (14, 7, 2, .05)],
      [(0, 0, 3, 0), (4, 12, 2, .05), (7, 0, 3, 0), (10, 0, 5, 0)],
      [(0, 0, 6, 0), (8, 0, 2, 0), (10, 12, 2, .05), (13, 0, 3, 0)]]

SECS = [('intro', 8), ('verse', 16), ('chorus', 8), ('verse', 16), ('chorus', 8), ('bridge', 8),
        ('chorus', 12), ('outro', 4)]
# cuanto cae la afinacion al exhalar (semitonos) en cada tramo: la promesa se afloja
DROOP = {('intro', 0): 0.0, ('verse', 0): 0.15, ('chorus', 0): 0.3, ('verse', 1): 0.7,
         ('chorus', 1): 1.0, ('bridge', 0): 0.5, ('chorus', 2): 2.0, ('outro', 0): 3.5}
GANANCIA = {'intro': 0.45, 'verse': 0.78, 'chorus': 1.0, 'bridge': 0.85, 'outro': 0.45}
VOL_FLAUTA = {'intro': .5, 'verse': .42, 'chorus': 1.0, 'bridge': .7, 'outro': .6}


# ── Instrumentos ─────────────────────────────────────────────────────────────
def flauta(m, dur, droop=0.0):
    aire = min(0.15 + 0.12 * droop, 0.75)
    t = t_arr(dur + 0.35)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5 * t) * np.clip((t - 0.15) * 3, 0, 1)
    f = hz(m) * vib
    if droop > 0:
        f = f * 2 ** (-droop * np.clip((t - dur * 0.4) / (dur * 0.8 + 0.2), 0, 1) ** 2 / 12)
    ph = np.cumsum(f) / SR
    x = np.sin(2 * np.pi * ph) + 0.28 * np.sin(4 * np.pi * ph) + 0.1 * np.sin(6 * np.pi * ph)
    soplo = bp(rng.standard_normal(len(t)), hz(m) * 0.9, min(hz(m) * 3.2, 15000)) * aire * 3
    e = env_adsr(len(t), 0.06, 0.1, 0.8, 0.25, dur)
    return (x * (1 - 0.5 * aire) + soplo) * e * 0.3


def caja(m, dur=1.4):
    t = t_arr(dur)
    f = hz(m)
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d)
            for r, a, d in [(1.0, 1, 3.2), (2.76, .35, 7), (5.4, .12, 13)])
    x += 0.05 * rng.standard_normal(len(t)) * np.exp(-t * 300)
    return x * 0.2


def bombo_t():
    t = t_arr(0.5)
    sub = np.sin(2 * np.pi * np.cumsum(42 + 130 * np.exp(-t * 45)) / SR) * np.exp(-t * 6)
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 400) * 0.4
    return np.tanh((sub * 1.2 + click) * 1.6)


def redoblante():
    t = t_arr(0.35)
    cuerpo = (np.sin(2 * np.pi * 190 * t) + 0.4 * np.sin(2 * np.pi * 330 * t)) * np.exp(-t * 22)
    ruido = bp(rng.standard_normal(len(t)), 1500, 9000) * np.exp(-t * 13)
    return np.tanh(cuerpo * 0.6 + ruido * 0.8)


def hat_metal(abierto=False):
    t = t_arr(0.3 if abierto else 0.07)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (210.5, 298.3, 375.2, 518.4, 545.1, 812.3))
    return hp(bp(x, 6500, 14500), 7500) * np.exp(-t * (11 if abierto else 60)) * 0.2


def barrido(dur):
    x = lp(rng.standard_normal(int(dur * SR)), 6000) * np.linspace(0, 1, int(dur * SR)) ** 2 * 0.18
    return np.stack([x, np.roll(x, 300)])


# ── Utilidades ───────────────────────────────────────────────────────────────
def T(c, s):
    return c * COMPAS + s * S16 + (SW if s == int(s) and int(s) % 2 == 1 else 0)


def hats_bar(c, name):
    if name == 'bridge':
        return [(k * 4 / 3, 1.0 if k % 3 == 0 else .45, 1.0) for k in range(12)]
    paso = 1 if name == 'chorus' else 2
    base = [(float(s), [1, .45, .7, .45][s % 4] if paso == 1 else [1, .6][(s // 2) % 2], 1.0)
            for s in range(0, 16, paso)]
    if name != 'chorus':
        base += [(s, .3, 1.0) for s in (3, 11) if rng.random() < .35]
    if c % 4 == 3:
        ph = (c // 4) % 3
        if name == 'chorus' and c % 8 == 7:
            base = [b for b in base if b[0] < 12] + [(12 + .5 * j, .3 + .08 * j, 1 + .03 * j) for j in range(8)]
        elif ph == 0:
            base = [b for b in base if b[0] < 14] + [(14 + .5 * j, .35 + .12 * j, 1 + .05 * j) for j in range(4)]
        elif ph == 1:
            base = [b for b in base if b[0] < 12] + [(12 + 2 * j / 3, .3 + .1 * j, 1 + .04 * j) for j in range(6)]
        else:
            base = [b for b in base if not (6 <= b[0] < 8) and b[0] < 15]
            base += [(6 + 2 * j / 3, .45, 1.0) for j in range(3)] + [(15, .6, 1.1), (15.5, .8, 1.2)]
    return base


# ── Composicion ──────────────────────────────────────────────────────────────
def render():
    total = sum(c for _, c in SECS)
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'pad', 'flauta', 'caja', 'fx']}
    sc = np.zeros(N)
    K, SN, CL, H, HO = bombo_t(), redoblante(), clap(), hat_metal(), hat_metal(True)
    ir = reverb_ir(3.2, 2.2, 4500, 31)
    ir_sala = reverb_ir(0.7, 8, 7000, 32)
    notas = []
    info, ini, c0 = [], [], 0
    cuenta = {}
    hum = lambda s=0.004: rng.normal(0, s)

    for si, (name, largo) in enumerate(SECS):
        occ = cuenta.get(name, 0)
        cuenta[name] = occ + 1
        dr = DROOP[(name, occ)]
        ini.append(c0)
        siguiente = SECS[si + 1][0] if si + 1 < len(SECS) else None
        for c in range(largo):
            cg = c0 + c
            ai = c % 4
            fr = c % 8
            ultimo = c == largo - 1
            pre = ultimo and name in ('verse', 'bridge')
            ac = ACORDES[ai]

            # Flauta (llamada y respuesta; en el verso solo en los huecos)
            toca = (name != 'verse' or fr in (2, 3, 6, 7)) and not (name == 'intro' and c < 1)
            if toca:
                for (s, nota, l) in CALL[fr]:
                    m = n(nota) - (12 if name == 'bridge' else 0)
                    x = flauta(m, l * S16 * 0.95, dr * (1 + 0.15 * rng.random()))
                    poner(bus['flauta'], paneo(x, 0.1) * VOL_FLAUTA[name], T(cg, s) + hum(0.006))

            # Caja de musica: acentos en los huecos; en el puente lleva la llamada
            mbn = []
            if name == 'bridge':
                mbn = [(s, nota) for (s, nota, l) in CALL[fr][:2]]
                mbn = [(s, n(nota) + 12) for s, nota in mbn]
            elif name in ('chorus', 'outro') or (name == 'intro' and c >= 4):
                mbn = [(s, n(nota)) for s, nota in MB_C[ai]]
            elif name == 'verse' and ai in MB_V:
                mbn = [(s, n(nota)) for s, nota in MB_V[ai]]
            for k, (s, m) in enumerate(mbn):
                poner(bus['caja'], paneo(caja(m), 0.35 * (-1) ** k) * (0.8 if name == 'verse' else 1.0), T(cg, s) + hum(0.003))

            # Pad bajo y coro oscuro
            if name != 'intro' or c >= 2:
                brillo = {'verse': 600, 'chorus': 2200, 'bridge': 2800}.get(name, 700)
                nivel = {'verse': 0.7, 'chorus': 1.0, 'bridge': 1.1}.get(name, 0.8)
                poner(bus['pad'], pad(ac, COMPAS, brillo, 3) * nivel, T(cg, 0))
            if name in ('chorus', 'bridge') and ai in (0, 2):
                poner(bus['pad'], paneo(vox(ac[2], COMPAS * 0.9, 'o', rng), 0.0) * 0.28, T(cg, 0))

            # Bateria y 808
            hv = 0.5 if name == 'intro' else 1.0
            if name == 'intro' and c >= 4 or name in ('verse', 'chorus', 'bridge'):
                if not pre:
                    for (s, v, r) in hats_bar(cg, name):
                        h = repitch(H, r) if r != 1.0 else H
                        poner(bus['drums'], paneo(h, 0.3) * v * hv * (1 - rng.uniform(0, 0.2)), T(cg, s) + hum(0.002))
                    if name == 'chorus' and c % 2 == 1:
                        ho = HO[:int(3 * S16 * SR)].copy()
                        ho[-300:] *= np.linspace(1, 0, 300)
                        poner(bus['drums'], paneo(ho, -0.25) * 0.7, T(cg, 6))
            swing_off = name == 'bridge' and c < 4
            if name in ('verse', 'chorus') or (name == 'bridge' and not swing_off):
                golpe = paneo(SN, 0.03) * 0.5 + paneo(CL, -0.05) * 0.6
                if not (pre and False):
                    poner(bus['drums'], golpe * (1 - rng.uniform(0, 0.1)), T(cg, 8) + hum(0.002))
            if pre:                                  # redoble de caja en tresillos que sube
                for j in range(12):
                    poner(bus['drums'], paneo(repitch(SN, 1 + j * 0.03), 0) * (0.2 + 0.05 * j), T(cg, 8 + j * 2 / 3))

            if name in ('verse', 'chorus', 'bridge', 'outro'):
                if name == 'bridge':
                    pat = [(0, 0, 16, 0)] if c % 2 == 0 else [(0, 0, 8, 0), (8, 12, 8, .3)]
                elif name == 'outro':
                    pat = [(0, 0, 16, 0)] if c == 0 else []
                elif name == 'chorus':
                    pat = CP[(c + c // 4) % 4]
                else:
                    pat = VP[(c + c // 4) % 4]
                if pre and name == 'verse':
                    pat = [(s, o, min(l, 8 - s), g) for s, o, l, g in pat if s < 8]
                for k, (s, o, l, g) in enumerate(pat):
                    if k == 0 and c % 4 == 0 and cg > 0 and name != 'outro':
                        g = 0.12                     # desliza hacia el tiempo 1 de la frase
                    notas.append((T(cg, s), R808[ai] + o, l * S16, g))
                    if o == 0 and g == 0 and name in ('verse', 'chorus') or (name == 'bridge' and c >= 4 and o == 0 and s == 0):
                        poner(bus['drums'], paneo(K, 0) * 0.9 * (1 - rng.uniform(0, 0.1)), T(cg, s) + hum(0.002))
                        poner(sc[None], np.exp(-t_arr(0.25) * 12)[None], T(cg, s))
        c0 += largo

    # Barridos antes de cada entrada
    for si in range(1, len(SECS)):
        if SECS[si][0] != 'outro':
            sw = barrido(BEAT * 3)
            poner(bus['fx'], sw, ini[si] * COMPAS - sw.shape[1] / SR)

    b = ochocientos(notas, N / SR, 2.6)
    arm = hp(np.tanh(lp(b, 700) * 4), 120) * 0.18
    bus['bajo'] += paneo(saturar(b[None][0:1].repeat(1, 0)[0], 0.3) + arm, 0)

    # Mezcla
    scc = 1 - np.clip(sc, 0, 1)
    flu = cinta(bus['flauta'], 0.5, rng)
    flu = delay_pingpong(hp(flu, 250), BEAT * 0.75, 0.35, 0.22)
    flu = con_reverb(flu, ir, 0.45)
    cab = con_reverb(cinta(bus['caja'], 0.4, rng), ir, 0.5)
    pd = con_reverb(hp(bus['pad'], 110) * (1 - 0.25 * np.clip(sc, 0, 1)), ir, 0.4)
    dr_ = con_reverb(saturar(bus['drums'], 0.15), ir_sala, 0.06)
    bajo = bus['bajo'] * (1 - 0.25 * np.clip(sc, 0, 1))
    mix = dr_ + bajo * 0.85 + flu * 1.0 + cab * 0.9 + pd * 0.7 + con_reverb(bus['fx'], ir, 0.3)

    g = np.ones(mix.shape[1])
    pos = 0
    for name, largo in SECS:
        a, e = int(pos * COMPAS * SR), min(mix.shape[1], int((pos + largo) * COMPAS * SR))
        g[a:e] = GANANCIA[name]
        pos += largo
    g[int(pos * COMPAS * SR):] = GANANCIA['outro']
    mix = mix * lp(g, 2, 1)

    mix = hp(mix, 28)
    mix = mix / (np.percentile(np.abs(mix), 99.95) + 1e-9) * 0.85
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    mix /= np.abs(mix).max() + 1e-9
    fin = int((total * COMPAS + 2.0) * SR)
    mix = mix[:, :fin]
    mix[:, -int(1.5 * SR):] *= np.linspace(1, 0, int(1.5 * SR))
    return (mix * 0.95).T


if __name__ == '__main__':
    audio = render()
    sf.write(sys.argv[1], audio, SR, subtype='PCM_16')
    out, pos = [], 0
    for name, largo in SECS:
        out.append({"nombre": name, "inicio": round(pos * COMPAS, 2),
                    "fin": round((pos + largo) * COMPAS, 2), "compases": largo})
        pos += largo
    print('SECCIONES=' + json.dumps(out))
