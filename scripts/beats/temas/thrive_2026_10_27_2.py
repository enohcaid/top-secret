"""STILL HERE — Tacet Sin · «Thrive» · 120 BPM · Do menor

Concepto: llorar a alguien que todavía está al lado tuyo. Velar en silencio una versión
suya que ya murió mientras la persona sigue respirando. Duelo por algo que sigue vivo.

Emoción por sección:
  intro      — latido y respiración a solas; el gancho aparece como un recuerdo apagado, una octava abajo
  verso      — contenido, casi sin decir: bajo que respira, guitarra grave, un eco de la frase en los huecos
  pre-gancho — la respiración se acorta (de larga a jadeo), bombo a negras, redoble: la urgencia
  gancho     — se abre: guitarras en pared, cuerdas, 808; centro libre para el dúo; crece en cada vuelta
  puente     — solo latido y aliento; el latido se vuelve irregular; sube un último aire y se corta
  gancho 3   — el más grande: línea nueva y aguda, octava de brillo
  final      — todo se apaga pero el latido y la respiración siguen: sigue ahí

Rasgo distintivo: el cuerpo como instrumento. Un latido (lub-dub) y un aliento de ruido
(inhala/exhala) recorren el tema: en el verso el bombo repite el lub-dub, en el pre-gancho
las inhalaciones se acortan hasta el jadeo, en el puente el latido se descontrola y el aire
queda en suspenso, y el tema termina con un último latido y una exhalación.
La guitarra de fondo (fuzz con trémolo, "pared" shoegaze) y la reverb larga hacen la atmósfera.

Estructura (96 compases, 192 s):
  intro 8 · verso 12 · pre-gancho 4 · gancho 12 · verso 12 · pre-gancho 4 · gancho 12 ·
  puente 8 · gancho 16 · final 8
"""
import json
import os
import sys
from functools import lru_cache

import numpy as np
import soundfile as sf
from scipy.ndimage import uniform_filter1d
from scipy.signal import oaconvolve

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch, reverb_ir,
                      delay_pingpong, paneo, saturar, cinta, ochocientos, clap, pad, con_reverb)

BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
S = BEAT / 4
SW = 0.2 * S
rng = np.random.default_rng(20261027)

SECC = [('intro', 8), ('verse', 12), ('pre-chorus', 4), ('chorus', 12), ('verse', 12),
        ('pre-chorus', 4), ('chorus', 12), ('bridge', 8), ('chorus', 16), ('outro', 8)]
NB = sum(c for _, c in SECC)

# ── Armonía (Do menor) ───────────────────────────────────────────────────────
ACORDES = {'m': (0, 3, 7), 'M': (0, 4, 7), 'M7': (0, 4, 7, 11), 'm7': (0, 3, 7, 10), 'd7': (0, 4, 7, 10)}
VERSE = [(0, 'm'), (8, 'M'), (3, 'M'), (10, 'M')]            # Cm Ab Eb Bb
PRE = [(5, 'm'), (5, 'm7'), (7, 'M'), (7, 'd7')]             # Fm Fm7 G G7
CHOR = [(8, 'M7'), (3, 'M'), (10, 'M'), (0, 'm')]            # Ab Eb Bb Cm
CHOR_END = [(8, 'M7'), (5, 'm'), (7, 'M'), (0, 'm')]
BRID = [(5, 'm'), (0, 'm'), (8, 'M7'), (7, 'M')]
OUT2 = [(8, 'M7'), (3, 'M'), (5, 'm'), (0, 'm')]

# Líneas (paso en 16avos, nota midi, largo en 16avos), una lista por compás
HOOK = [[(10, 84, 3), (13, 82, 3)], [(10, 79, 3), (13, 77, 3)],
        [(8, 77, 4), (12, 74, 4)], [(6, 72, 6), (12, 75, 4)]]
CM = [[(2, 84, 2), (4, 87, 4)], [(2, 82, 2), (4, 86, 4)],
      [(2, 89, 2), (4, 86, 4)], [(2, 87, 2), (4, 84, 3), (8, 79, 6)]]
VM = [[(8, 74, 3), (11, 72, 2), (13, 70, 3)], [(6, 77, 3), (10, 75, 2), (12, 74, 4)],
      [(8, 79, 2), (10, 77, 2), (12, 74, 4)]]
VM2 = [(11, 72, 3), (14, 75, 2)]
BL = [[(0, 80, 12)], [(0, 79, 8), (8, 75, 8)], [(0, 84, 8), (8, 80, 8)], [(0, 83, 8), (8, 86, 8)]]


def acorde_de(nom, occ, c):
    if nom == 'intro':
        p = CHOR
    elif nom == 'verse':
        p = VERSE
    elif nom == 'pre-chorus':
        p = PRE
    elif nom == 'chorus':
        p = CHOR_END if (occ == 2 and c >= 12) else CHOR
    elif nom == 'bridge':
        p = BRID
    else:
        p = CHOR if c < 4 else OUT2
    pc, k = p[c % 4]
    return pc, ('d7' if nom == 'bridge' and c == 7 else k)


def voz(pc, kind, lo=52):
    out = []
    for iv in ACORDES[kind]:
        m = pc + iv
        while m < lo:
            m += 12
        out.append(m)
    return sorted(out)


def bajo(pc):
    m = 24 + pc
    return m + 12 if m < 31 else m


# ── Instrumentos de este tema ────────────────────────────────────────────────
def bombo():
    t = t_arr(0.5)
    sub = np.sin(2 * np.pi * np.cumsum(46 + 70 * np.exp(-t * 30)) / SR) * np.exp(-t * 6)
    punch = np.sin(2 * np.pi * np.cumsum(60 + 200 * np.exp(-t * 80)) / SR) * np.exp(-t * 35)
    click = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 500) * 0.4
    return np.tanh((sub * 0.9 + punch * 0.7 + click) * 1.6)


def caja():
    """Caja ochentosa: cuerpo + ruido + cola cortada por compuerta (gated reverb)."""
    t = t_arr(0.6)
    cuerpo = (np.sin(2 * np.pi * 185 * t) + 0.45 * np.sin(2 * np.pi * 335 * t)) * np.exp(-t * 24)
    ruido = bp(rng.standard_normal(len(t)), 1500, 9500) * np.exp(-t * 15)
    gate = bp(rng.standard_normal(len(t)), 700, 6000) * np.exp(-t * 3) * np.clip((0.17 - t) / 0.012, 0, 1)
    return np.tanh(cuerpo * 0.6 + ruido * 0.75 + gate * 0.5)


def rim():
    t = t_arr(0.09)
    x = (np.sin(2 * np.pi * 1750 * t) * 0.5 + np.sin(2 * np.pi * 480 * t) * 0.5) * np.exp(-t * 110)
    return np.tanh(x * 1.5 + hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 260) * 0.3) * 0.6


def hat_metal(abierto=False):
    t = t_arr(0.35 if abierto else 0.07)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
    return hp(bp(x, 6500, 15000), 7500) * np.exp(-t * (10 if abierto else 60)) * 0.2


def shaker():
    t = t_arr(0.08)
    return hp(rng.standard_normal(len(t)), 5500) * np.minimum(t / 0.012, 1) * np.exp(-t * 45) * 0.16


def platillo(dur=2.6):
    t = t_arr(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * 1.7 * t)) for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
    return hp(x + 2 * rng.standard_normal(len(t)), 4500) * np.exp(-t * 2.3) * 0.07


@lru_cache(maxsize=None)
def tom(f0):
    t = t_arr(0.5)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.5 * np.exp(-t * 18))) / SR) * np.exp(-t * 8) * 1.5) * 0.8


def latido(f0, dec):
    t = t_arr(0.35)
    x = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.9 * np.exp(-t * 35))) / SR) * np.exp(-t * dec)
    x += lp(rng.standard_normal(len(t)), 500) * np.exp(-t * 90) * 0.5
    return np.tanh(lp(x, 400) * 2.5) * 0.8


def aliento(dur, pico=0.45, vol=1.0):
    """Respiración: ruido filtrado que sube (inhala) y baja (exhala); pico = fracción en que llega al máximo."""
    n = int(dur * SR)
    u = np.linspace(0, 1, n)
    pico = min(pico, 0.97)
    e = np.where(u < pico, (u / pico) ** 1.6, ((1 - u) / (1 - pico)) ** 1.2)
    ch = []
    for _ in range(2):
        r = rng.standard_normal(n)
        ch.append(bp(r, 350, 1400) * 0.8 + bp(r, 2200, 7000) * 0.35)
    return np.stack(ch) * e * 0.4 * vol


@lru_cache(maxsize=None)
def guitarra(m, dur, brillo=3600, drive=2.0):
    """Guitarra eléctrica punteada: parciales con caída, ataque de púa y overdrive."""
    t = t_arr(dur + 1.4)
    f = hz(m)
    x = sum(np.sin(2 * np.pi * f * h * t * (1 + 0.00025 * h * h)) * np.exp(-t * (1.4 + 0.5 * h)) / h ** 0.7
            for h in range(1, 11))
    x += hp(rng.standard_normal(len(t)), 2200) * np.exp(-t * 260) * 0.12
    x = np.tanh(x * drive) / np.tanh(drive)
    return lp(x, brillo) * np.where(t < dur, 1, np.exp(-(t - dur) * 14)) * 0.2


@lru_cache(maxsize=None)
def lavado(notas, dur, brillo=2600):
    """Pared shoegaze: sierras desafinadas con fuzz, trémolo lento y filtro."""
    t = t_arr(dur + 1.2)
    out = np.zeros((2, len(t)))
    for m in notas:
        for i, d in enumerate((-0.007, 0.0, 0.006, 0.011)):
            out += paneo(saw(hz(m), t, d) * 0.25, (i - 1.5) / 1.5 * 0.8)
    trem = 1 - 0.25 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.35 * t))
    return hp(lp(np.tanh(out * 3.5), brillo), 170) * env_adsr(len(t), 0.3, 0.5, 0.8, 1.0, dur) * trem * 0.11


@lru_cache(maxsize=None)
def cuerdas(notas, dur, brillo=3800):
    """Cuerdas de época: sierras con vibrato lento, sin graves."""
    t = t_arr(dur + 1.5)
    out = np.zeros((2, len(t)))
    for m in notas:
        for v in range(3):
            f = hz(m) * (1 + (v - 1) * 0.005) * (1 + 0.003 * np.sin(2 * np.pi * 5.1 * t + v * 2))
            ph = np.cumsum(f) / SR
            out += paneo(2 * (ph - np.floor(ph + 0.5)) * 0.3, (v - 1) * 0.7)
    return lp(hp(out, 350), brillo) * env_adsr(len(t), 0.4, 0.5, 0.85, 1.3, dur) * 0.1


def coro(st, prof=0.004, rate=0.35):
    n = st.shape[1]
    i = np.arange(n, dtype=np.float64)
    return np.stack([0.55 * st[c] + 0.45 * np.interp(i - (prof * (1 + np.sin(2 * np.pi * rate * i / SR + c * 1.9)) + 0.007) * SR, i, st[c])
                     for c in range(2)])


K, SN, CL, RIM, SHK = bombo(), caja(), clap(), rim(), shaker()
H, HO = hat_metal(), hat_metal(True)
HOc = HO[:int(2.6 * S * SR)].copy()
HOc[-300:] *= np.linspace(1, 0, 300)
PLAT = platillo()
PLAT_INV = np.stack([PLAT[::-1][:int(2.2 * SR)], np.roll(PLAT[::-1], 350)[:int(2.2 * SR)]]) * 1.0
LUB, DUB = latido(52, 14), latido(64, 18)
SCP = np.exp(-t_arr(0.3) * 12)


def render():
    N = int((NB * BAR + 3.0) * SR)
    dr, ba, gt, wa, ha, fx = [np.zeros((2, N), np.float32) for _ in range(6)]
    sc = np.zeros(N, np.float32)
    mute = np.ones(N, np.float32)
    n808, secs, cuenta, c0 = [], [], {}, 0
    jt = lambda s: rng.normal(0, s)

    def T(c, s, sw=False, j=0.003):
        return c * BAR + s * S + (SW if sw and s % 2 else 0) + jt(j)

    def kk(c, s, v=1.0):
        t = T(c, s, j=0.0015)
        poner(dr, paneo(K, 0) * v * 0.95, t)
        poner(sc, SCP * v, t)

    def sn(c, s, v=1.0, cl=False, r=1.0):
        t = T(c, s, j=0.002)
        poner(dr, paneo(SN if r == 1 else repitch(SN, r), 0.03) * v * 0.8, t)
        if cl:
            poner(dr, paneo(CL, -0.08) * v * 0.45, t + 0.004)

    def hh(c, s, v, op=False, r=1.0, pan=0.3):
        x = HOc if op else repitch(H, r * (1 + rng.normal(0, 0.02)))
        poner(dr, paneo(x, pan) * v * (1 - rng.uniform(0, 0.2)), T(c, s, True, 0.004))

    def rm(c, s, v):
        poner(dr, paneo(RIM, -0.15) * v, T(c, s, j=0.002))

    def tm(c, s, f, v, pan=0.0):
        poner(dr, paneo(tom(f), pan) * v, T(c, s))

    def lat(c, s, v=1.0):
        t = c * BAR + s * S + jt(0.004)
        poner(dr, paneo(LUB, 0) * v, t)
        poner(dr, paneo(DUB, 0) * v * 0.6, t + 3 * S + jt(0.006))

    def resp(t, dur, pico=0.45, v=1.0):
        poner(fx, aliento(dur, pico, v), t)

    def gnota(m, c, s, l, v=1.0, pan=0.0, br=3600, dv=2.0):
        x = paneo(guitarra(int(m), round(l * S, 3), br, dv), pan)
        poner(gt, x * v * (1 - rng.uniform(0, 0.15)), T(c, s, True, 0.004))

    def lead(c, lineas, off=0, v=1.0, br=3800, dv=2.2, pan=0.0):
        for (s, m, l) in lineas:
            gnota(m + off, c, s, l, v, pan, br, dv)

    def lav(c, notas, v, br):
        poner(wa, lavado(notas, BAR, br) * v, c * BAR)

    def pd(c, notas, v, br):
        poner(ha, pad(list(notas), BAR, br, 3) * v, c * BAR)

    def cu(c, notas, v, br):
        poner(ha, cuerdas(notas, BAR, br) * v, c * BAR)

    def corte(t0, dur):
        i0, i1 = int(t0 * SR), int((t0 + dur) * SR)
        mute[i0 - 220:i0] = np.linspace(1, 0, 220)
        mute[i0:i1] = 0

    for si, (nom, largo) in enumerate(SECC):
        occ = cuenta.get(nom, 0)
        cuenta[nom] = occ + 1
        secs.append((nom, c0 * BAR, (c0 + largo) * BAR, largo))
        for c in range(largo):
            cg, c4, ult = c0 + c, c % 4, c == largo - 1
            pc, kind = acorde_de(nom, occ, c)
            r = bajo(pc)
            nt, alto = tuple(voz(pc, kind, 48)), tuple(voz(pc, kind, 60))

            def b808(s, p, l, gl=0.0):
                n808.append((cg * BAR + s * S, r + p, l * S, gl))

            if nom == 'intro':
                lat(cg, 0, 0.8)
                lat(cg, 8, 0.8)
                if c % 2:
                    resp(cg * BAR, BAR, 0.45, 0.7 + 0.05 * c)
                if c >= 2:
                    lav(cg, nt, 0.35 + 0.06 * c, 800 + 140 * c)
                    pd(cg, nt, 0.7, 500 + 60 * c)
                    gnota(nt[0], cg, 0, 8, 0.5, -0.3, 1800, 1.6)
                if c >= 3:
                    gnota(nt[2], cg, 10, 6, 0.4, 0.3, 1800, 1.6)
                if c >= 4:
                    lead(cg, HOOK[c4], -12, 0.55, 1800, 1.6)            # el gancho, como recuerdo apagado
                    b808(0, 0, 16, 0.1 if c > 4 else 0)
                if c >= 6:
                    rm(cg, 8, 0.4)
                    hh(cg, 4, 0.25)
                    hh(cg, 12, 0.25)

            elif nom == 'verse':
                kk(cg, 0)                          # el bombo repite el latido: lub-dub
                kk(cg, 3, 0.5)
                kk(cg, 10, 0.8)
                if c4 == 3 and rng.random() < 0.6:
                    kk(cg, 14, 0.55)
                rm(cg, 8, 0.8)
                sn(cg, 8, 0.3)
                suave = (occ == 0 and c < 8) or (occ == 1 and c < 4)
                lleno = occ == 1 and c >= 4
                ab = lleno and c4 in (1, 3)
                if ab:
                    hh(cg, 6, 0.4, True)
                for s in range(0, 16, 1 if lleno else 2):
                    if (suave and s % 4 != 2) or (ab and s in (6, 7)) or (rng.random() < 0.15 and s % 4):
                        continue
                    hh(cg, s, 0.5 if s % 4 == 2 else (0.3 if s % 2 == 0 else 0.2))
                gl = 0.09 if (c4 == 0 and c > 0) else 0
                if c4 == 0:
                    b808(0, 0, 9, gl)
                    b808(10, 12, 2)
                elif c4 == 1:
                    b808(0, 0, 8)
                    b808(11, 0, 3)
                elif c4 == 2:
                    b808(0, 0, 10)
                else:
                    b808(0, 0, 6)
                    b808(12, 7, 3)
                if c4 != 3:
                    gnota(nt[0], cg, 0, 10, 0.5, -0.3, 2200, 1.8)
                    if not (lleno and c4 == 1):
                        gnota(nt[2], cg, 10, 6, 0.4, 0.3, 2200, 1.8)
                    if lleno:
                        gnota(nt[1], cg, 6, 4, 0.35, 0.0, 2200, 1.8)
                else:
                    lead(cg, VM[c // 4], 0, 0.6 + 0.15 * occ, 3400, 2.0, 0.15)   # la respuesta, en el hueco
                if lleno and c4 == 1:
                    lead(cg, VM2, 0, 0.55, 3400, 2.0, 0.15)
                if c % 8 < 4:
                    pd(cg, nt, 0.8, 620)
                if occ == 1 and c >= 8:
                    lav(cg, nt, 0.4, 1100)
                if ult:
                    resp(cg * BAR + BAR / 2, BAR / 2, 0.5, 0.6 + 0.2 * occ)

            elif nom == 'pre-chorus':
                for s in (0, 4, 8, 12):
                    kk(cg, s, 0.55 + 0.1 * c + (0.15 if s % 8 == 0 else 0))
                if c < 2:
                    sn(cg, 8, 0.5)
                elif c == 2:
                    for i, s in enumerate((8, 10, 12, 14)):
                        sn(cg, s, 0.5 + 0.1 * i)
                else:
                    for s in range(14):                   # redoble que sube (corta antes del gancho)
                        sn(cg, s, 0.35 + 0.045 * s, False, 1 + 0.012 * s)
                if c >= 1:
                    for s in range(16 if c < 3 else 14):
                        hh(cg, s, 0.28 + 0.05 * c if s % 2 == 0 else 0.2)
                if c < 2:
                    resp(cg * BAR, BAR, 0.55, 0.9)         # la respiración se acorta hasta el jadeo
                elif c == 2:
                    resp(cg * BAR, BEAT * 2, 0.6, 1.0)
                    resp(cg * BAR + BEAT * 2, BEAT * 2, 0.7, 1.0)
                else:
                    for q in range(4):
                        resp(cg * BAR + q * BEAT, BEAT * 0.95, 0.85, 1.05)
                if c == 0:
                    b808(0, 0, 12, 0.09)
                elif c == 1:
                    b808(0, 0, 8)
                    b808(10, 12, 2)
                elif c == 2:
                    b808(0, 0, 6, 0.09)
                    b808(8, 0, 3)
                    b808(12, 0, 4)
                else:
                    b808(0, 0, 6)
                    b808(8, 0, 4)
                lav(cg, nt, 0.5 + 0.12 * c, 1400 + 450 * c)
                pd(cg, nt, 0.8, 700 + 350 * c)
                if c >= 2:
                    cu(cg, alto, 0.4 + 0.2 * (c - 2), 2500)
                for s in range(0, 16, 2):
                    gnota(nt[(s // 2) % len(nt)], cg, s, 1.5, 0.3 + 0.04 * c, 0.4 * (-1) ** (s // 2), 1500, 1.8)

            elif nom == 'chorus':
                final = occ == 2 and ult
                if c == 0:
                    poner(dr, paneo(PLAT, -0.1) * 0.6, cg * BAR)
                fill = ult and occ < 2
                kk(cg, 0)
                kk(cg, 7, 0.7)
                kk(cg, 10, 0.85)
                if c4 == 1:
                    kk(cg, 3, 0.5)
                if c4 == 3 and not fill:
                    kk(cg, 14, 0.7)
                sn(cg, 4, 1.0, True)
                if not (fill or final):
                    sn(cg, 12, 1.0, True)
                    if rng.random() < 0.3:
                        sn(cg, 15, 0.25)
                if fill:
                    for s, f in zip((12, 13, 14, 15), (160, 130, 110, 90)):
                        tm(cg, s, f, 0.8, 0.3 - 0.2 * (s - 12) / 3)
                dens = 1 if (occ == 2 or (occ == 1 and c4 >= 2)) else 2
                op = c4 in (1, 3)
                if op:
                    hh(cg, 6, 0.45, True, pan=-0.3)
                for s in range(0, 8 if final else (12 if (c4 == 3 or fill) else 16), dens):
                    if op and s in (6, 7):
                        continue
                    hh(cg, s, 0.55 if s % 4 == 0 else (0.35 if s % 2 == 0 else 0.22))
                if c4 == 3 and not (fill or final):
                    for j in range(8):
                        poner(dr, paneo(repitch(H, 1 + j * 0.05), 0.3) * (0.3 + 0.07 * j), cg * BAR + 12 * S + j * 4 * S / 8)
                if not (fill or final):
                    for s in (2, 6, 10, 14):
                        poner(dr, paneo(SHK, -0.4) * (1 - rng.uniform(0, 0.3)), T(cg, s))
                if c4 in (0, 2):
                    b808(0, 0, 5, 0.07 if c > 0 else 0)
                    b808(6, 12, 2)
                    b808(8, 0, 2)
                    b808(10, 0, 6)
                elif c4 == 1:
                    b808(0, 0, 5)
                    b808(6, 12, 2)
                    b808(8, 0, 2)
                    b808(10, 0, 6)
                else:
                    b808(0, 0, 5)
                    b808(6, 0, 2)
                    b808(10, 7, 3)
                    b808(13, 12, 3)
                lav(cg, nt, 1.0, 3000 if occ < 2 else 3600)
                pd(cg, nt, 0.7, 1500)
                if occ > 0 or c >= 4:
                    cu(cg, alto, 1.0, 3800)
                if occ == 2 and c >= 4:
                    cu(cg, tuple(m + 12 for m in alto[1:]), 0.5, 5200)
                ar = list(alto) + [alto[0] + 12]
                pasos = (0, 6, 10) if (occ == 0 and c < 4) else range(0, 16, 2)
                for k, s in enumerate(pasos):
                    if rng.random() < 0.08:
                        continue
                    gnota(ar[(0, 2, 1, 3, 2, 1, 3, 2)[(s // 2) % 8] % len(ar)], cg, s, 3,
                          0.8 if s % 8 == 0 else 0.55, 0.6 * (-1) ** k, 3600, 1.8)
                if occ > 0 or c >= 4:
                    if not (occ == 2 and 8 <= c < 12):
                        lead(cg, HOOK[c4], 0, 0.8 + 0.1 * occ, 4200, 2.4)
                if occ == 2 and c >= 8:
                    lead(cg, CM[c4], 0, 0.7, 4600, 2.4, -0.3)           # línea nueva en el último gancho
                if occ == 2 and c >= 12:
                    lead(cg, HOOK[c4], 12, 0.5, 5000, 2.4, 0.4)

            elif nom == 'bridge':
                if c < 6:
                    lat(cg, 0)
                    lat(cg, 8)
                elif c == 6:                                # el latido se descontrola
                    for s in (0, 6, 12):
                        lat(cg, s, 1.1)
                else:
                    lat(cg, 0, 0.8)
                if c in (0, 2, 4, 6):
                    resp(cg * BAR, BAR, 0.5, 1.0)
                if c == 7:
                    resp(cg * BAR, 1.5, 0.96, 1.1)          # un último aire que se corta
                lav(cg, nt, 0.55, 1300 + 100 * c)
                if c >= 1:
                    cu(cg, alto, 0.7, 2600)
                if c < 4:
                    pd(cg, nt, 0.8, 500)
                    gnota(alto[0], cg, 0, 12, 0.35, -0.4, 2400, 1.6)
                    gnota(alto[2], cg, 8, 8, 0.3, 0.4, 2400, 1.6)
                    b808(0, 0, 15, 0.08 if c else 0)
                else:
                    lead(cg, BL[c4], 0, 0.8, 3000, 1.8, 0.1)
                    if c < 7:
                        b808(0, 0, 6)
                        b808(8, 0, 6)
                    else:
                        b808(0, 0, 12)
                if c in (4, 5):
                    kk(cg, 0, 0.7)
                    tm(cg, 8, 200, 0.6)
                elif c == 6:
                    kk(cg, 0, 0.8)
                    for s, f in ((8, 190), (11, 160), (14, 130)):
                        tm(cg, s, f, 0.7, 0.2)

            else:
                if c == 0:
                    poner(dr, paneo(PLAT, 0.1) * 0.5, cg * BAR)
                if c < 4:
                    lat(cg, 0, 0.8 - 0.03 * c)
                    lat(cg, 8, 0.8 - 0.03 * c)
                    kk(cg, 0, 0.6)
                    kk(cg, 3, 0.35)
                    rm(cg, 8, 0.4)
                    lav(cg, nt, 0.6 - 0.1 * c, 1300)
                    pd(cg, nt, 0.6, 700)
                    cu(cg, alto, 0.5, 3000)
                    b808(0, 0, 16, 0.1 if c else 0)
                    for s in (0, 6, 10):
                        gnota(alto[(s // 2) % len(alto)], cg, s, 3, 0.4, 0.5 * (-1) ** (s // 2), 2800, 1.8)
                    lead(cg, HOOK[c4], -12, 0.55, 2600, 1.8)
                else:
                    lat(cg, 0, 0.7)
                    if c == 7:
                        lat(cg, 8, 0.55)
                    if c < 6:
                        lav(cg, nt, max(0.1, 0.6 - 0.1 * c), 1200)
                    if c in (4, 5):
                        lead(cg, HOOK[c4 % 2], -12, 0.45, 2400, 1.8)
                    elif c == 6:
                        lead(cg, [(4, 72, 8)], 0, 0.4, 2400, 1.8)
                    else:
                        lead(cg, [(0, 72, 24)], 0, 0.4, 2400, 1.8)
                if c in (1, 3, 5):
                    resp(cg * BAR, BAR, 0.45, 0.7 - 0.1 * (c // 2))
                if c == 7:
                    resp(cg * BAR + 0.4, 3.0, 0.1, 0.8)      # última exhalación: sigue acá

        te = (c0 + largo) * BAR
        nxt = SECC[si + 1][0] if si + 1 < len(SECC) else None
        if nxt == 'chorus':
            poner(fx, PLAT_INV * 0.9, te - PLAT_INV.shape[1] / SR)
            if cuenta.get('chorus', 0) in (0, 2):                        # swell de guitarra en reversa
                sw = lavado(tuple(voz(8, 'M7', 48)), 2.0, 3200)
                sw = con_reverb(sw, reverb_ir(dur=2.0, decay=2.5, brillo=4000, seed=5), 0.9)[:, :int(3.0 * SR)][:, ::-1]
                poner(fx, sw * 1.6, te - sw.shape[1] / SR)
        if nom == 'pre-chorus':
            corte(te - 0.25, 0.25)
        elif nom in ('bridge', 'intro'):
            corte(te - 0.5, 0.5)
        c0 += largo

    if n808:
        ba += paneo(lp(ochocientos(n808, N / SR, 2.4), 3200), 0) * 0.9
    for b in (dr, ba, gt, wa, ha):
        b *= mute

    # ── Mezcla ──
    scl = np.clip(sc, 0, 1)
    drm = saturar(dr, 0.15)
    bam = ba * (1 - 0.18 * scl)
    gtm = delay_pingpong(coro(hp(gt, 230)), BEAT * 0.75, 0.4, 0.3)
    wam = cinta(hp(wa, 160), 0.5, rng) * (1 - 0.35 * scl)
    ham = cinta(hp(ha, 120), 0.3, rng) * (1 - 0.45 * scl)
    del dr, ba, gt, wa, ha
    send = gtm * 0.4 + wam * 0.4 + ham * 0.4 + fx * 0.35 + drm * 0.06
    ir = reverb_ir(dur=3.2, decay=1.8, brillo=4200, seed=11)
    wet = hp(np.stack([oaconvolve(send[c], ir[c])[:N] for c in range(2)]), 180)
    del send
    mix = drm + bam * 0.8 + gtm * 0.85 + wam * 0.8 + ham * 0.85 + fx * 0.8 + wet
    del drm, bam, gtm, wam, ham, wet, fx

    # Dinámica por sección (en dB respecto al promedio de los ganchos), medida con RMS
    mono = mix.mean(axis=0)
    rms = [np.sqrt(np.mean(mono[int(a * SR):int(b * SR)] ** 2)) + 1e-9 for _, a, b, _ in secs]
    obj = [-7.5, -4.0, -2.5, -0.8, -3.5, -2.0, 0.0, -4.5, 0.6, -7.5]
    ref = np.sqrt(np.mean([rms[i] ** 2 for i in (3, 6, 8)]))
    g = np.ones(N)
    for (_, a, b, _), rr, o in zip(secs, rms, obj):
        g[int(a * SR):int(b * SR)] = np.clip(ref * 10 ** (o / 20) / rr, 0.2, 5)
    g[int(secs[-1][2] * SR):] = g[int(secs[-1][2] * SR) - 1]
    mix = mix * uniform_filter1d(g, int(1.2 * SR), mode='nearest')

    mix = hp(mix, 28)
    mix = mix / (np.percentile(np.abs(mix[:, ::7]), 99.95) + 1e-9) * 0.85
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    mix /= np.abs(mix).max() + 1e-9
    mix = mix[:, :int((NB * BAR + 1.5) * SR)]
    mix[:, -int(1.2 * SR):] *= np.linspace(1, 0, int(1.2 * SR))
    return (mix * 0.95).T, secs


if __name__ == '__main__':
    audio, secs = render()
    sf.write(sys.argv[1], audio, SR, subtype='PCM_16')
    print('SECCIONES=' + json.dumps([{"nombre": n, "inicio": round(a, 3), "fin": round(b, 3), "compases": k}
                                     for n, a, b, k in secs]))
