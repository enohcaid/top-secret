"""STILL MINE — Thrive, Tacet Sin

Concepto: quien siguió contestando el teléfono cuando no tenías nada. La deuda no se paga con
dinero: se devuelve quedándote. El beat rebota con confianza, pero guarda una ternura debajo.

Emoción por sección:
  intro      — guitarra muteada y campana "por la radio" (filtradas): el teléfono que sigue sonando
  verso 1    — medio tiempo, hats a corcheas, 808 con saltos: confesión tranquila, mucho aire
  pre-gancho — hats que suben, redoble, todo se corta en el último compás: respirar antes de decir gracias
  gancho     — 808 + bombo, campanas, guitarra densa y pad ancho; el centro queda libre para la voz
  verso 2    — hats a semicorcheas con tresillos y 1/32, 808 con otro ritmo, entra rim/hat abierto
  puente     — se afina: solo piano y 808 largo (4 compases), luego CAMBIO de beat a doble tiempo
  gancho 3   — campanas una octava arriba y contramelodía de pluck: la deuda se asume con alegría
  final      — guitarra y campana por la radio otra vez, un 808 largo, se apaga

Rasgo distintivo: Rebote con ternura: guitarra muteada que "contesta" con una campana en los huecos, y un 808 que salta de octava.

Estructura (150 BPM, re menor, 88 compases = 140.8 s):
  intro 4 · verso 16 · pre 4 · gancho 8 · verso 16 · pre 4 · gancho 8 · puente 12 · gancho 8 · final 8
Beat switch: puente compás 5 (redoblante en 2 y 4 = doble tiempo, tresillos de hats, nueva progresión
  Gm-Eb-Bb-A, piano en vez de guitarra/campana).
Drop-outs: último compás de cada pre-gancho (solo campanas + swell) y último del puente (solo piano + swell);
  todo entra con el bombo y un crash en el primer tiempo del gancho.
"""
import json
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, t_arr, lp, hp, bp, poner, repitch, reverb_ir, con_reverb, delay_pingpong,
                      paneo, saturar, bitcrush, cinta, ochocientos, clap, pluck, campana, pad, piano_oscuro)

BPM = 150
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SW = 0.3 * S16
rng = np.random.default_rng(20261101)

# ── Armonía: re menor ────────────────────────────────────────────────────────
CH = {
    'Dm': dict(r=38, g=[50, 57, 62, 65], bell=[(0, 74), (3, 77), (6, 81), (10, 79)]),
    'Bb': dict(r=34, g=[46, 53, 58, 62], bell=[(0, 74), (3, 77), (6, 82), (10, 81)]),
    'Gm': dict(r=31, g=[43, 55, 58, 62], bell=[(0, 70), (3, 74), (6, 79), (10, 77)]),
    'A':  dict(r=33, g=[45, 57, 61, 64], bell=[(0, 73), (3, 76), (6, 81), (10, 80), (12, 77)]),
    'Eb': dict(r=39, g=[51, 55, 58, 62], bell=[(0, 70), (3, 74), (6, 79), (10, 75)]),
}
PROG = ['Dm', 'Bb', 'Gm', 'A']
BRP = ['Gm', 'Eb', 'Bb', 'A']

# 808: (paso, salto de octava/intervalo, largo en 16avos, glide)
P808 = {
    'v1': [(0, 0, 6, .07), (7, 0, 3, 0), (10, 12, 2, 0), (12, 0, 4, 0)],
    'v2': [(0, 0, 3, .07), (3, 0, 3, 0), (6, 7, 2, 0), (8, 0, 4, 0), (14, 12, 2, .06)],
    'c':  [(0, 0, 4, .07), (4, 12, 2, 0), (6, 0, 2, 0), (10, 0, 3, 0), (13, 7, 3, .06)],
    'pre': [(0, 0, 8, .07), (8, 0, 8, 0)],
    'br': [(0, 0, 2, .07), (4, 0, 2, 0), (8, 0, 2, 0), (10, 12, 2, .05), (12, 0, 4, 0)],
    'brslow': [(0, 0, 16, .08)],
}
GP = {
    'v1': [(0, 0), (6, 2), (10, 1)],
    'v2': [(0, 0), (3, 1), (6, 2), (8, 3), (11, 1), (14, 2)],
    'c': [(0, 0), (2, 1), (3, 2), (6, 3), (8, 2), (10, 1), (11, 2), (14, 3)],
}
SECS = [('intro', 4, 'intro'), ('verse', 16, 'v1'), ('pre-chorus', 4, 'pre'), ('chorus', 8, 'c1'),
        ('verse', 16, 'v2'), ('pre-chorus', 4, 'pre2'), ('chorus', 8, 'c2'), ('bridge', 12, 'br'),
        ('chorus', 8, 'c3'), ('outro', 8, 'out')]
TOTAL = sum(s[1] for s in SECS)
N = int((TOTAL * COMPAS + 5) * SR)
B = {k: np.zeros((2, N)) for k in ['drums', 'gtr', 'bell', 'pad', 'keys', 'fx']}
sc = np.zeros(N)


# ── Batería propia ───────────────────────────────────────────────────────────
def kick():
    t = t_arr(0.5)
    sub = np.sin(2 * np.pi * np.cumsum(46 + 14 * np.exp(-t * 20)) / SR) * np.exp(-t * 5)
    pun = np.sin(2 * np.pi * np.cumsum(55 + 160 * np.exp(-t * 60)) / SR) * np.exp(-t * 28)
    clk = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 400) * .4
    return np.tanh((sub * .8 + pun * .9 + clk) * 1.6)


def snare():
    t = t_arr(0.3)
    body = (np.sin(2 * np.pi * 185 * t) + .4 * np.sin(2 * np.pi * 330 * t)) * np.exp(-t * 24)
    nz = bp(rng.standard_normal(len(t)), 1800, 9000) * np.exp(-t * 15)
    return np.tanh(body * .6 + nz * .9)


def hat_m(open_=False):
    t = t_arr(.3 if open_ else .06)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (210.5, 298.3, 375.2, 518.4, 545.1, 812.3))
    return hp(bp(x, 6500, 14500), 7500) * np.exp(-t * (10 if open_ else 70)) * .2


def rim():
    t = t_arr(.05)
    return np.tanh((np.sin(2 * np.pi * 820 * t) + hp(rng.standard_normal(len(t)), 2500)) * np.exp(-t * 90) * 1.2) * .5


K, SN, CL, H, HO, RM = kick(), snare(), clap(), hat_m(), hat_m(True), rim()
HO = HO[:int(2.5 * S16 * SR)].copy()
HO[-200:] *= np.linspace(1, 0, 200)
ir = reverb_ir(2.6, 3.0, 6000, 11)
ir_s = reverb_ir(.5, 9, 7500, 12)
_bells = {}


def bell(m):
    if m not in _bells:
        _bells[m] = campana(m, 1.5)
    return _bells[m]


def hum(s=.004):
    return rng.normal(0, s)


def put(bus, x, t, a=1.0, p=0.0):
    """Suma x al bus; si ya es estéreo no se vuelve a panear."""
    x = x if x.ndim == 2 else paneo(x, p)
    poner(B[bus], x * a, t)


def roll(t0, span, n, v0, v1, rise=.05):
    for j in range(n):
        put('drums', repitch(H, 1 + j * rise) * (v0 + (v1 - v0) * j / max(1, n - 1)), t0 + j * span / n, 1, .3)


def swell(t_end, dur):
    n = int(dur * SR)
    x = hp(rng.standard_normal((2, n)), 3000) * (np.linspace(0, 1, n) ** 2) * .22
    poner(B['fx'], x, t_end - dur)


def crash(t):
    n = t_arr(1.4)
    poner(B['fx'], np.stack([hp(rng.standard_normal(len(n)), 5000) * np.exp(-n * 3.2) * .3 for _ in range(2)]), t)


def bar_hats(key, c, t_c):
    st = lambda s: t_c + s * S16 + (SW if s % 2 else 0) + hum(.002)
    acc = [1, .5, .75, .5]

    def hh(s, v):
        put('drums', H * acc[s % 4] * v * (1 - rng.uniform(0, .2)), st(s), 1, .3)
    if key == 'v1':
        for s in range(0, 16, 2):
            hh(s, .7)
        if c % 4 == 3:
            roll(t_c + 14 * S16, 2 * S16, 4, .4, .7)
    elif key == 'v2':
        for s in range(16):
            if (rng.random() < .1 and s % 4) or (c % 4 == 3 and s >= 12):
                continue
            hh(s, .7)
        if c % 8 == 7:
            roll(t_c + 12 * S16, 4 * S16, 8, .4, .9)
        elif c % 4 == 3:
            roll(t_c + 12 * S16, 4 * S16, 6, .4, .8)
        if c % 2 == 0:
            put('drums', HO, st(14), .6, -.25)
    elif key == 'pre':
        for s in range(16 if c != 2 else 8):
            hh(s, .45 + .08 * c)
        if c == 2:
            roll(t_c + 8 * S16, 8 * S16, 16, .4, 1.0, .03)
    elif key == 'c':
        for s in range(16):
            if (c % 2 == 1 and s >= 14) or (c % 4 == 3 and s >= 12):
                continue
            hh(s, .8)
        if c % 4 == 3:
            roll(t_c + 12 * S16, 4 * S16, 6, .5, .9)
        elif c % 2 == 1:
            roll(t_c + 14 * S16, 2 * S16, 4, .5, .9)
        if c % 2 == 0:
            put('drums', HO, st(6), .7, -.25)
            put('drums', HO, st(14), .7, -.25)
    else:                                              # doble tiempo: tresillos
        for k in range(12):
            if c % 4 == 3 and k >= 9:
                continue
            put('drums', H * (.85 if k % 3 == 0 else .4) * (1 - rng.uniform(0, .2)), t_c + k * COMPAS / 12 + hum(.002), 1, .3)
        if c % 4 == 3:
            roll(t_c + 3 * BEAT, BEAT, 8, .4, .9)


def bar_snare(key, c, t_c):
    s = lambda k: t_c + k * S16 + hum(.002)
    if key in ('v1', 'v2'):
        put('drums', SN, s(8), .85, .04)
        if key == 'v2':
            put('drums', SN, s(15), .22)
            put('drums', RM, s(5), .6, .35)
            put('drums', RM, s(13), .5, .35)
    elif key == 'c':
        put('drums', SN, s(8), .9, .04)
        put('drums', CL, s(8), .5, -.05)
    elif key == 'pre':
        if c < 2:
            put('drums', SN, s(8), .8)
        elif c == 2:
            for j, k in enumerate([0, 4, 8, 10, 12, 13, 14, 15]):
                put('drums', repitch(SN, 1 + j * .035), s(k), .3 + .08 * j)
    else:
        for k in (4, 12):
            put('drums', SN, s(k), .9, .04)
        put('drums', CL, s(12), .5, -.05)


# ── Arreglo ──────────────────────────────────────────────────────────────────
notas, prev_end, c0 = [], -9.0, 0
ini = []
for nombre, largo, key in SECS:
    ini.append(c0 * COMPAS)
    tipo = 'c' if key[0] == 'c' else key.rstrip('2')
    chor = tipo == 'c'
    bridge = key == 'br'
    for c in range(largo):
        t_c = (c0 + c) * COMPAS
        ch = (BRP if bridge else PROG)[c % 4]
        D = CH[ch]
        last = c == largo - 1
        drop = last and (tipo == 'pre' or bridge)
        dk = 'pre' if tipo == 'pre' else ('br' if bridge else tipo)
        # Guitarra muteada
        gk = {'intro': 'v1', 'out': 'v1', 'v1': 'v1', 'v2': 'v2', 'pre': 'v2', 'c': 'c'}.get(tipo)
        if gk and not drop and not bridge:
            for s, i in GP[gk]:
                m = D['g'][i] + (12 if gk == 'c' and i == 3 else 0)
                put('gtr', pluck(m, .22, 1900) * 2.2 * (.8 + .2 * rng.random()), t_c + s * S16 + hum(), 1, -.4)
        # Campanas: respuesta en los huecos (verso), motivo completo (gancho)
        bl = D['bell']
        if chor:
            up = 12 if (key == 'c3' and c >= 4) else 0
            for s, m in bl:
                put('bell', bell(m + up), t_c + s * S16 + hum(), .9, .4)
            if key == 'c3':                            # contramelodía de pluck en el último gancho
                for s in range(1, 16, 2):
                    put('bell', pluck(D['g'][(s // 2) % 4] + 24, .15, 3500), t_c + s * S16, .55, -.2)
        elif tipo in ('v1', 'v2'):
            if (tipo == 'v1' and c % 4 == 3) or (tipo == 'v2' and c % 2 == 1):
                for s, m in bl:
                    if s >= 10:
                        put('bell', bell(m), t_c + s * S16 + hum(), .5, .4)
        elif (key == 'intro' and c >= 2) or (key == 'out' and c < 4):
            for s, m in bl:
                put('bell', bell(m), t_c + s * S16, .6, .3)
        elif tipo == 'pre' and not drop:
            for s in (0, 4, 8, 12):
                put('bell', bell(bl[(s // 4) % len(bl)][1] + 12), t_c + s * S16, .5, .3)
        if tipo == 'pre' and drop:                     # solo campanas altas
            for s, m in [(0, 81), (3, 85), (6, 88), (10, 93)]:
                put('bell', bell(m), t_c + s * S16, .8, .2)
        if chor or (bridge and c >= 4 and not drop):
            put('pad', pad(D['g'][1:], COMPAS, 1500), t_c, 1, 0)
        # Puente: piano y campana baja
        if bridge:
            pos = [0] if c < 4 else ([0, 6, 10] if not drop else [0])
            for s in pos:
                for j, m in enumerate(D['g'][:4]):
                    put('keys', piano_oscuro(m + 12, 1.2 if c < 4 else .7), t_c + s * S16 + j * .02, .9 if s == 0 else .6, -.2 + .15 * j)
            if c >= 4 and not drop:
                put('bell', bell(bl[-1][1] - 12), t_c + 12 * S16, .5, .35)
        # 808 y batería
        drums_on = (tipo in ('v1', 'v2', 'pre', 'c')) or (bridge and c >= 4)
        has808 = drums_on or bridge or (key == 'out' and c in (0, 4))
        if drop:
            has808 = False
        if has808:
            if key == 'out' or (bridge and c < 4):
                pat = P808['brslow']
            else:
                pat = P808[dk]
            for s, o, l, g in pat:
                t0 = t_c + s * S16
                if t0 - prev_end > .05:
                    g = 0
                notas.append((t0, D['r'] + o, l * S16, g))
                prev_end = t0 + l * S16
        if drums_on and not drop:
            ks = [s for s, o, l, g in P808[dk] if o == 0]
            if tipo == 'pre':
                ks = [0, 8]
            if chor and c % 2 == 1:
                ks.append(15)
            if bridge:
                ks += [6, 14]
            for s in sorted(set(ks)):
                t_k = t_c + s * S16 + hum(.002)
                put('drums', K, t_k, .95)
                poner(sc[None], np.exp(-t_arr(.25) * 14)[None], t_k)
            bar_snare(dk, c, t_c)
            bar_hats(dk, c, t_c)
        if drop or (key == 'intro' and last):
            swell(t_c + COMPAS, BEAT * 3.5)
    if key[0] == 'c':
        crash(c0 * COMPAS)
    if key == 'br':
        crash((c0 + 4) * COMPAS)
    c0 += largo

# ── Mezcla ───────────────────────────────────────────────────────────────────
scc = np.clip(sc, 0, 1)
b8 = ochocientos(notas, N / SR, 3.0)
b8 = np.pad(b8, (0, max(0, N - len(b8))))[:N]
bajo = paneo(b8, 0) * .9
bajo = bajo * (1 - .2 * scc)
gtr = saturar(cinta(hp(B['gtr'], 170), .5, rng), .25)
gtr = con_reverb(gtr * (1 - .3 * scc), ir, .18)
bel = bitcrush(hp(B['bell'], 300), .12)
bel = con_reverb(delay_pingpong(bel, BEAT * .75, .4, .3) * (1 - .2 * scc), ir, .4)
pd = con_reverb(hp(B['pad'], 250) * (1 - .35 * scc), ir, .35)
keys = con_reverb(hp(B['keys'], 150), ir, .3)
drums = con_reverb(saturar(B['drums'], .15), ir_s, .06)

# radio: intro y cola del final pasan por un filtro pasabanda
w = np.zeros(N)
w[:int(ini[1] * SR)] = 1
w[int((ini[9] + 4 * COMPAS) * SR):] = 1
w = lp(w, 4)
mel = gtr + bel + keys
mel = mel * (1 - w) + bp(mel, 350, 3200) * w * 1.3
mix = drums + bajo + mel + pd * .6 + B['fx'] * .6

# dinámica por sección (intro/final ~7 dB abajo)
GN = {'intro': .46, 'v1': .74, 'v2': .76, 'pre': .8, 'pre2': .85, 'c1': 1.0, 'c2': 1.0, 'br': .8, 'c3': 1.05, 'out': .46}
g = np.ones(N)
for (nombre, largo, key), a in zip(SECS, ini):
    i0, i1 = int(a * SR), int((a + largo * COMPAS) * SR)
    g[i0:i1] = GN[key]
    if key == 'br':
        g[i0:int((a + 4 * COMPAS) * SR)] = .6
g[int((ini[-1] + SECS[-1][1] * COMPAS) * SR):] = GN['out']
mix = mix * lp(g, 3)

mix = hp(mix, 28)
mix = mix / (np.percentile(np.abs(mix), 99.95) + 1e-9) * .85
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
mix /= np.abs(mix).max() + 1e-9
mix = mix[:, :int((TOTAL * COMPAS + 1.0) * SR)]
mix[:, -int(1.5 * SR):] *= np.linspace(1, 0, int(1.5 * SR))
sf.write(sys.argv[1], (mix * .95).T, SR, subtype='PCM_16')

sec = [{"nombre": n, "inicio": round(a, 3), "fin": round(a + l * COMPAS, 3), "compases": l}
       for (n, l, _), a in zip(SECS, ini)]
print('SECCIONES=' + json.dumps(sec))
