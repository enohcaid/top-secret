"""ASTILLA — tema del día 2026-10-23-2

Concepto: La jugada que sale mal y te rompe la confianza en pedazos — el pase que no
llegó, la marca que perdiste; sección a sección juntás los pedazos hasta que en el
gancho C la confianza se rearmó más fuerte porque sabés dónde están las grietas.

Emoción por sección:
  intro — fragmentos sueltos: la confianza hecha pedazos, granos dispersos sin orden
  verso — los pedazos se acercan: ritmo firme pero frágil, fragmentos van a la grilla
  gancho A — las piezas se conectan: melodía con grieta, fragmentos en contratiempos
  build — presión: ahora o nunca
  gancho B — casi armado: melodía más limpia, fragmentos en el beat
  puente — respiro: fragmentos pulsan como latido (tresillos)
  gancho C — todo encajó: arpegio perfecto, lead sin grieta
  final — los últimos fragmentos flotan y se alejan

Rasgo distintivo: fragmento que encaja — granos cristalinos (micro-notas de sine)
dispersos a intervalos y alturas aleatorias; se organizan sección a sección hasta que
en el gancho C forman un arpegio rítmico claro — las piezas se rearmaron.

Estructura (46 compases, 135 BPM, lab menor):
  intro 4 · verso 8 · gancho A 8 · build 2 · gancho B 8 · puente 4 · gancho C 8 · final 4
  ~84 s

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_23_2.py
Salida: fuentes/beats/salida/diario/2026-10-23-2.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch,
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar, ochocientos,
                      clap)

BPM = 135
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.15 * S16
rng = np.random.default_rng(202610232)
NOMBRES = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
           'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOMBRES[nombre[:-1]]


# ── Armonía (lab menor = G# natural minor: G# A# B C# D# E F#) ─────────────
PROG = ['G#m', 'E', 'C#m', 'D#m']

PIANO_V = {
    'G#m': ['G#3', 'B3', 'D#4', 'G#4'],
    'E':   ['E3', 'G#3', 'B3', 'E4'],
    'C#m': ['C#3', 'E3', 'G#3', 'C#4'],
    'D#m': ['D#3', 'F#3', 'A#3', 'D#4'],
}
PAD_V = {
    'G#m': ['G#3', 'B3', 'D#4'],
    'E':   ['E3', 'G#3', 'B3'],
    'C#m': ['C#3', 'E3', 'G#3'],
    'D#m': ['D#3', 'F#3', 'A#3'],
}
RAIZ808 = {'G#m': 'G#1', 'E': 'E1', 'C#m': 'C#2', 'D#m': 'D#2'}

FRAG_NOTAS = {
    'G#m': ['G#4', 'B4', 'D#5', 'G#5'],
    'E':   ['E4', 'G#4', 'B4', 'E5'],
    'C#m': ['C#4', 'E4', 'G#4', 'C#5'],
    'D#m': ['D#4', 'F#4', 'A#4', 'D#5'],
}
ESCALA_MIDI = [n('G#4'), n('A#4'), n('B4'), n('C#5'),
               n('D#5'), n('E5'), n('F#5'), n('G#5')]

# ── Melodías ────────────────────────────────────────────────────────────────
LEAD = [
    [(0, 'D#5', 3), (4, 'C#5', 2), (8, 'B4', 3), (12, 'D#5', 3)],
    [(0, 'C#5', 3), (4, 'E5', 2), (7, 'D#5', 1), (8, 'C#5', 5)],
    [(0, 'B4', 2), (3, 'D#5', 2), (6, 'E5', 3), (10, 'D#5', 2), (13, 'B4', 3)],
    [(0, 'A#4', 3), (4, 'C#5', 2), (8, 'D#5', 5)],
    [(0, 'G#4', 2), (3, 'B4', 2), (6, 'D#5', 3), (10, 'C#5', 2), (13, 'B4', 3)],
    [(0, 'E5', 3), (4, 'D#5', 2), (7, 'C#5', 1), (8, 'G#4', 6)],
    [(0, 'G#4', 3), (4, 'B4', 2), (7, 'D#5', 3), (11, 'B4', 2), (14, 'G#4', 2)],
    [(0, 'F#4', 3), (4, 'A#4', 2), (8, 'G#4', 6)],
]

LEAD_C = [
    [(0, 'G#5', 3), (4, 'F#5', 2), (7, 'D#5', 1), (8, 'E5', 5)],
    [(0, 'C#5', 4), (5, 'E5', 3), (9, 'D#5', 5)],
    [(0, 'B4', 2), (3, 'D#5', 2), (6, 'F#5', 3), (10, 'E5', 2), (13, 'D#5', 3)],
    [(0, 'C#5', 3), (4, 'D#5', 4), (9, 'G#5', 3), (13, 'F#5', 3)],
    [(0, 'D#5', 3), (4, 'F#5', 2), (7, 'G#5', 3), (11, 'F#5', 2), (14, 'D#5', 2)],
    [(0, 'E5', 4), (5, 'D#5', 3), (9, 'C#5', 5)],
    [(0, 'B4', 3), (4, 'D#5', 2), (7, 'E5', 4), (12, 'D#5', 2), (15, 'B4', 1)],
    [(0, 'A#4', 2), (3, 'C#5', 3), (7, 'D#5', 4), (12, 'G#4', 4)],
]

PIANO_MEL = [
    [(0, 'G#4', 6), (8, 'D#4', 4), (14, 'B4', 2)],
    [(0, 'C#5', 4), (6, 'E4', 4), (12, 'G#4', 4)],
    [(0, 'B4', 4), (6, 'G#4', 3), (10, 'E4', 6)],
    [(0, 'A#4', 5), (7, 'D#4', 4), (13, 'F#4', 3)],
    [(0, 'B4', 3), (4, 'G#4', 4), (10, 'D#5', 4)],
    [(0, 'C#5', 6), (8, 'G#4', 4)],
    [(0, 'G#4', 3), (4, 'E5', 4), (10, 'B4', 4)],
    [(0, 'F#4', 6), (8, 'A#4', 3), (12, 'G#4', 4)],
]

SECCIONES = [('intro', 4), ('verso', 8), ('ganchoA', 8), ('build', 2),
             ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 4)]

CRACK = {'ganchoA': 0.7, 'ganchoB': 0.35, 'ganchoC': 0.08}


# ── Instrumentos de este tema ───────────────────────────────────────────────
def fragmento(m, dur):
    """Grano cristalino: sine corta con pitch ascendente en el ataque."""
    t = t_arr(dur)
    f = hz(m) * (1 + 0.4 * np.exp(-t * 200))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    e = np.exp(-t * (25 + 12 / max(dur, 0.01)))
    atk = min(len(e), int(0.002 * SR))
    if atk > 1:
        e[:atk] *= np.linspace(0, 1, atk)
    return x * e * 0.3


def piano_fragil(m, dur, vel=1.0):
    """Piano con armónicos que decaen rápido: sonido frágil, delicado."""
    t = t_arr(dur + 0.8)
    f = hz(m)
    x = sum(np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h * h))
            * np.exp(-t * (1.3 + h * 1.0)) / h for h in range(1, 7))
    x += 0.1 * rng.standard_normal(len(t)) * np.exp(-t * 150)
    e = env_adsr(len(t), 0.004, 0.25, 0.3, 0.5, dur)
    return lp(x, 2800) * e * 0.28 * vel


def lead_grieta(m, dur, crack=0.5, desde=None):
    """Lead saw + sine con burst de ruido en el ataque (la grieta)."""
    t = t_arr(dur + 0.35)
    f = np.full(len(t), hz(m))
    if desde is not None:
        g = min(len(t), int(0.05 * SR))
        f[:g] *= (hz(desde) / hz(m)) ** (1 - np.arange(g) / g)
    f *= 1 + 0.005 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.15) * 4, 0, 1)
    ph = np.cumsum(f) / SR
    x = (2 * (ph - np.floor(ph + 0.5))) * 0.5 + np.sin(2 * np.pi * ph) * 0.35
    x += saw(hz(m), t, 0.006) * 0.15
    ruido = bp(rng.standard_normal(len(t)), 2000, 8000) * np.exp(-t * 80) * crack * 0.7
    x = lp(x + ruido, 5200)
    e = env_adsr(len(t), 0.006, 0.14, 0.55, 0.18, dur)
    return x * e * 0.2


def pad_oscuro(notas_midi, dur, brillo=1600):
    """Sines detuneadas: envolvente, oscuro."""
    t = t_arr(dur + 1.5)
    out = np.zeros((2, len(t)))
    for m in notas_midi:
        for v in range(5):
            det = (v - 2) * 0.005
            x = np.sin(2 * np.pi * hz(m) * (1 + det) * t)
            out += paneo(x / 5, (v - 2) / 4 * 0.7)
    e = env_adsr(len(t), 0.55, 0.5, 0.7, 1.0, dur)
    return lp(out, brillo) * e * 0.08


def bombo_capas():
    t = t_arr(0.45)
    sub = np.sin(2 * np.pi * np.cumsum(45 + 15 * np.exp(-t * 20)) / SR) * np.exp(-t * 5.8)
    punch = np.sin(2 * np.pi * np.cumsum(58 + 145 * np.exp(-t * 60)) / SR) * np.exp(-t * 28)
    click = hp(rng.standard_normal(len(t)), 3200) * np.exp(-t * 420) * 0.55
    return np.tanh((sub * 0.8 + punch * 0.88 + click) * 1.5)


def redoblante():
    t = t_arr(0.35)
    cuerpo = (np.sin(2 * np.pi * 192 * t) + 0.42 * np.sin(2 * np.pi * 338 * t)) * np.exp(-t * 22)
    ruido = bp(rng.standard_normal(len(t)), 1700, 9300) * np.exp(-t * 13.5)
    return np.tanh((cuerpo * 0.65 + ruido * 0.88) * 1.4)


def hat_metal(abierto=False):
    t = t_arr(0.36 if abierto else 0.075)
    x = sum(np.sign(np.sin(2 * np.pi * f * t))
            for f in (209.1, 302.5, 374.3, 523.8, 541.2, 811.5))
    x = hp(bp(x, 6300, 14600), 7300) * np.exp(-t * (9.5 if abierto else 58))
    return x * 0.21


def shaker_hit():
    t = t_arr(0.085)
    return (hp(rng.standard_normal(len(t)), 5300)
            * np.minimum(t / 0.011, 1) * np.exp(-t * 48) * 0.16)


def platillo_inv(dur):
    t = t_arr(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * 1.7 * t))
            for f in (209.1, 302.5, 374.3, 523.8, 541.2, 811.5))
    x = hp(x + rng.standard_normal(len(t)) * 2, 4300) * np.exp(-t * 2.0)
    x = x[::-1]
    return np.stack([x, np.roll(x, 370)]) * 0.062


# ── Utilidades ──────────────────────────────────────────────────────────────
def paso(c, s, swing=True):
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


def barrido_hp(st, t0, dur):
    i0, L = int(t0 * SR), int(dur * SR)
    L = min(L, st.shape[1] - i0)
    if L <= 0:
        return st
    seg = st[:, i0:i0 + L]
    cortes = [20, 280, 650, 1300, 2600, 4200]
    vers = [seg] + [hp(seg, c, 2) for c in cortes[1:]]
    pos = np.linspace(0, len(vers) - 1, L)
    out = np.zeros_like(seg)
    for k, v in enumerate(vers):
        w = np.clip(1 - np.abs(pos - k), 0, 1)
        out += v * w
    st[:, i0:i0 + L] = out
    return st


# ── Composición ─────────────────────────────────────────────────────────────
def render():
    total = sum(c for _, c in SECCIONES)
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in
           ['drums', 'bajo', 'piano', 'pad', 'lead', 'frag', 'fx']}
    sc = np.zeros(N)

    K = bombo_capas()
    SN = redoblante()
    CL = clap()
    H = hat_metal()
    HO = hat_metal(True)
    SH = shaker_hit()
    ir = reverb_ir(dur=2.3, brillo=6800, seed=2310)
    ir_sala = reverb_ir(dur=0.65, decay=7.5, brillo=7800, seed=2311)
    ir_frag = reverb_ir(dur=1.8, brillo=9500, seed=2312)
    notas808 = []
    ini = {}
    c0 = 0
    hum = lambda s=0.004: rng.normal(0, s)

    for nombre, largo in SECCIONES:
        ini[nombre] = c0
        for c in range(largo):
            cg = c0 + c
            ac = PROG[c % 4]
            frase = c % 8
            frase4 = c % 4
            ultimo = c == largo - 1
            gancho = nombre.startswith('gancho')

            # ── Piano ──────────────────────────────────────────────────
            if nombre in ('intro', 'verso', 'final'):
                if nombre != 'intro' or c >= 1:
                    notas = [n(x) for x in PIANO_V[ac]]
                    vel_a = 0.55 if nombre == 'intro' else 0.8
                    for k, m in enumerate(notas):
                        poner(bus['piano'],
                              paneo(piano_fragil(m, COMPAS * 0.85,
                                    vel_a * (1 - rng.uniform(0, 0.1))),
                                    -0.15 + 0.1 * k),
                              paso(cg, 0, False) + k * 0.007 + hum())
                if frase < len(PIANO_MEL):
                    vel_m = 0.45 if nombre == 'intro' else 0.65
                    for (s, nota, l) in PIANO_MEL[frase]:
                        poner(bus['piano'],
                              paneo(piano_fragil(n(nota), l * S16, vel_m), 0.1),
                              paso(cg, s) + hum())

            # ── Pad ────────────────────────────────────────────────────
            if nombre in ('verso', 'ganchoA', 'ganchoB', 'ganchoC'):
                brillo_p = {'verso': 1200, 'ganchoA': 1600,
                            'ganchoB': 2000, 'ganchoC': 2400}[nombre]
                poner(bus['pad'],
                      pad_oscuro([n(x) for x in PAD_V[ac]], COMPAS, brillo_p),
                      paso(cg, 0, False))

            # ── Lead (con grieta que se cura) ──────────────────────────
            if nombre in CRACK:
                mel = LEAD_C if nombre == 'ganchoC' else LEAD
                crack = CRACK[nombre]
                if frase < len(mel):
                    prev = None
                    for (s, nota, l) in mel[frase]:
                        m = n(nota)
                        x = lead_grieta(m, l * S16 * 0.95, crack,
                                        prev if prev and abs(prev - m) <= 5
                                        else None)
                        poner(bus['lead'], paneo(x, -0.1),
                              paso(cg, s) + hum(0.003))
                        prev = m

            # ── Fragmentos (RASGO DISTINTIVO) ──────────────────────────
            if nombre == 'intro':
                for _ in range(5 + (c > 1)):
                    t_f = cg * COMPAS + rng.random() * COMPAS
                    m_f = int(rng.choice(ESCALA_MIDI)) + int(rng.integers(-5, 6))
                    pan_f = float(rng.uniform(-0.7, 0.7))
                    dur_f = 0.025 + rng.random() * 0.035
                    x = fragmento(m_f, dur_f)
                    poner(bus['frag'], paneo(x, pan_f) * 0.35, t_f)

            elif nombre == 'verso':
                for k in range(8):
                    grid = k * BEAT / 2
                    jitter = float(rng.normal(0, 0.3 * BEAT / 2))
                    t_f = cg * COMPAS + grid + jitter
                    chord_m = [n(x) for x in FRAG_NOTAS[ac]]
                    m_f = int(rng.choice(chord_m)) + int(rng.integers(-2, 3))
                    pan_f = float(rng.uniform(-0.5, 0.5))
                    x = fragmento(m_f, 0.03 + rng.random() * 0.025)
                    poner(bus['frag'], paneo(x, pan_f) * 0.4, t_f)

            elif nombre == 'ganchoA':
                for k in range(8):
                    s = k * 2 + 1                     # contratiempos (off-beat)
                    t_f = paso(cg, s) + float(rng.normal(0, 0.12 * S16))
                    chord_m = [n(x) for x in FRAG_NOTAS[ac]]
                    m_f = int(rng.choice(chord_m)) + int(rng.integers(-1, 2))
                    pan_f = float(rng.uniform(-0.3, 0.3))
                    x = fragmento(m_f, 0.035 + rng.random() * 0.02)
                    poner(bus['frag'], paneo(x, pan_f) * 0.5, t_f)

            elif nombre == 'ganchoB':
                chord_m = [n(x) for x in FRAG_NOTAS[ac]]
                for k in range(8):
                    s = k * 2                         # en el beat
                    t_f = paso(cg, s) + float(rng.normal(0, 0.03 * S16))
                    m_f = chord_m[k % len(chord_m)]
                    pan_f = -0.25 + 0.5 * (s / 14)
                    x = fragmento(m_f, 0.04)
                    poner(bus['frag'], paneo(x, pan_f) * 0.55, t_f)

            elif nombre == 'puente':
                chord_m = [n(x) for x in FRAG_NOTAS[ac]]
                roots = [chord_m[0], chord_m[2]]
                for b in range(4):
                    m_f = roots[b % 2]
                    pan_f = -0.12 if b % 2 == 0 else 0.12
                    x = fragmento(m_f, 0.05)
                    poner(bus['frag'], paneo(x, pan_f) * 0.48,
                          cg * COMPAS + b * BEAT)

            elif nombre == 'ganchoC':
                notas_c = [n(x) for x in FRAG_NOTAS[ac]]
                arp = notas_c + [notas_c[2], notas_c[1], notas_c[0], notas_c[2]]
                for k in range(8):
                    m_f = arp[k]
                    pan_f = -0.4 + 0.8 * k / 7
                    x = fragmento(m_f, 0.05)
                    poner(bus['frag'], paneo(x, pan_f) * 0.6,
                          cg * COMPAS + k * BEAT / 2)

            elif nombre == 'final':
                n_g = 3 if c < 2 else 2
                for _ in range(n_g):
                    t_f = cg * COMPAS + rng.random() * COMPAS
                    m_f = int(rng.choice(ESCALA_MIDI))
                    if rng.random() < 0.3:
                        m_f += int(rng.integers(-1, 2))
                    pan_f = float(rng.uniform(-0.6, 0.6))
                    x = fragmento(m_f, 0.03 + rng.random() * 0.03)
                    vol = 0.3 * (1 - c / max(largo, 1))
                    poner(bus['frag'], paneo(x, pan_f) * vol, t_f)

            # ── Batería ────────────────────────────────────────────────
            con_bat = nombre in ('verso', 'ganchoA', 'ganchoB', 'puente', 'ganchoC')
            if con_bat:
                if nombre == 'verso':
                    kicks = [0, 10] if frase4 != 3 else [0, 10, 14]
                elif nombre == 'puente':
                    kicks = [0, 6, 12] if frase4 % 2 == 0 else [0, 8]
                else:
                    kicks = [0, 6, 10] if frase4 != 3 else [0, 6, 10, 15]
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.93,
                          paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.2) * 15)[None],
                          paso(cg, s, False))

                golpe = paneo(SN, 0.03) * 0.73
                if gancho or nombre == 'puente':
                    golpe = golpe + paneo(CL, -0.05) * 0.42
                poner(bus['drums'], golpe, paso(cg, 8, False) + hum(0.002))

                if nombre == 'puente':
                    for k in range(12):
                        vel_h = 0.7 if k % 3 == 0 else 0.35
                        poner(bus['drums'], paneo(H * vel_h, 0.28),
                              cg * COMPAS + k * COMPAS / 12 + hum(0.002))
                else:
                    paso_h = 2 if nombre == 'verso' else 1
                    redoble = frase4 == 3 and nombre != 'verso'
                    for s in range(0, 16, paso_h):
                        if redoble and s >= 12:
                            break
                        acento = [1.0, 0.38, 0.62, 0.38][s % 4]
                        poner(bus['drums'],
                              paneo(H * acento * (1 - rng.uniform(0, 0.18)), 0.3),
                              paso(cg, s) + hum(0.002))
                    if redoble:
                        for j in range(6):
                            r = 1 + j * 0.045
                            poner(bus['drums'],
                                  paneo(repitch(H, r) * (0.4 + 0.5 * j / 6), 0.3),
                                  cg * COMPAS + 12 * S16 + j * BEAT / 6)
                    if frase4 in (1, 3) and nombre != 'verso':
                        ho_len = min(int(2.5 * S16 * SR), len(HO))
                        ho = HO[:ho_len].copy()
                        fade_n = min(250, ho_len)
                        ho[-fade_n:] *= np.linspace(1, 0, fade_n)
                        poner(bus['drums'], paneo(ho, -0.24) * 0.72, paso(cg, 6))

                if nombre != 'puente':
                    for s in range(2, 16, 4):
                        poner(bus['drums'], paneo(SH, -0.42), paso(cg, s))

            # ── 808 ────────────────────────────────────────────────────
            if nombre in ('verso', 'ganchoA', 'ganchoB', 'puente', 'ganchoC'):
                r = n(RAIZ808[ac])
                if nombre == 'verso':
                    pat = ([(0, 0, 4), (10, 0, 4)] if frase4 != 3
                           else [(0, 0, 4), (10, 0, 2), (14, 12, 2)])
                elif nombre == 'puente':
                    pat = ([(0, 0, 12)] if frase4 % 2 == 0
                           else [(0, 0, 6), (8, 12, 6)])
                else:
                    pat = [(0, 0, 3), (4, 0, 2), (6, 12, 2), (10, 0, 4)]
                    if frase4 == 3:
                        pat = pat[:3] + [(10, 0, 3), (14, 7, 2)]
                for s, intv, l in pat:
                    gl = (0.1 if ((s == 0 and frase4 == 0 and c > 0) or
                                  (nombre == 'puente' and s == 8)) else 0)
                    notas808.append((paso(cg, s, False), r + intv, l * S16, gl))

        c0 += largo

    T = lambda comp: comp * COMPAS

    # ── FX de transición ─────────────────────────────────────────────────
    for sec in ('ganchoA', 'ganchoB', 'ganchoC'):
        pc = platillo_inv(BEAT * 4)
        poner(bus['fx'], pc, T(ini[sec]) - pc.shape[1] / SR)

    # Build: redoble acelerando
    b0 = ini['build']
    tiempos = ([b0 * COMPAS + k * BEAT / 2 for k in range(4)] +
               [b0 * COMPAS + 2 * BEAT + k * S16 for k in range(8)] +
               [(b0 + 1) * COMPAS + k * S16 / 2 for k in range(24)])
    for j, tt in enumerate(tiempos):
        if tt < T(b0 + 2) - BEAT * 0.5:
            poner(bus['drums'],
                  paneo(repitch(SN, 1 + j * 0.012), 0)
                  * (0.28 + 0.55 * j / len(tiempos)), tt)

    # 808
    if notas808:
        b = ochocientos(notas808, N / SR, 2.3)
        bus['bajo'] += paneo(lp(b, 4300), 0)

    # ── Mezcla ───────────────────────────────────────────────────────────
    piano = hp(lp(bus['piano'], 6500), 160)
    piano = con_reverb(piano * (1 - 0.25 * np.clip(sc, 0, 1)), ir, 0.3)

    pad_b = hp(bus['pad'], 180)
    pad_b = con_reverb(pad_b * (1 - 0.2 * np.clip(sc, 0, 1)), ir, 0.35)

    lead = hp(bus['lead'], 240)
    lead = saturar(lead, 0.2)
    lead = delay_pingpong(lead, BEAT * 0.75, 0.28, 0.2)
    lead = con_reverb(lead, ir, 0.24)

    frag = hp(bus['frag'], 350)
    frag = con_reverb(frag, ir_frag, 0.4)

    drums = con_reverb(saturar(bus['drums'], 0.13), ir_sala, 0.07)

    bajo = bus['bajo'] * (1 - 0.25 * np.clip(sc, 0, 1))

    mix = (drums * 1.0 + bajo * 0.85 + piano * 0.9 + pad_b * 0.65 +
           lead * 1.0 + frag * 1.1 + bus['fx'])

    # Build: barrido HP
    mix = barrido_hp(mix, T(ini['build']), COMPAS * 2 - BEAT * 0.5)
    s0 = int((T(ini['build'] + 2) - BEAT * 0.5) * SR)
    s1 = int(T(ini['build'] + 2) * SR)
    if s0 < s1 <= mix.shape[1]:
        mix[:, s0:s1] *= 0.05

    # Dinámica por sección
    g = np.ones(mix.shape[1])
    for sec, val in [('intro', 5.5), ('final', 4.5), ('build', 0.65),
                     ('puente', 0.85), ('verso', 0.82)]:
        largo_s = dict(SECCIONES)[sec]
        a_ = int(T(ini[sec]) * SR)
        b_ = min(mix.shape[1], int(T(ini[sec] + largo_s) * SR))
        g[a_:b_] = val
    g = lp(g, 3)
    mix = mix * g

    mix = hp(mix, 28)
    mix = mix / (np.percentile(np.abs(mix), 99.95) + 1e-9) * 0.85
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    mix /= np.abs(mix).max() + 1e-9

    fin_i = int((total * COMPAS + 2.0) * SR)
    mix = mix[:, :fin_i]
    fade_len = int(1.5 * SR)
    mix[:, -fade_len:] *= np.linspace(1, 0, fade_len)

    return (mix * 0.95).T


if __name__ == '__main__':
    out = os.path.join(RAIZ, 'fuentes', 'beats', 'salida', 'diario')
    os.makedirs(out, exist_ok=True)
    f = os.path.join(out, '2026-10-23-2.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.1f} s')
