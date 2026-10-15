"""VESTUARIO — tema del día 2026-10-14-4.

Concepto: el vestuario después de perder un partido que tenían ganado — nadie habla,
cada uno procesa el dolor a su manera; el silencio pesa más que cualquier grito,
hasta que alguien dice "va de nuevo" y el silencio se rompe en convicción.

Emoción por sección:
  intro (4)     — el silencio: gota sola con pad oscuro, vacío
  gancho A (8)  — el peso llega: batería y 808, cada golpe duele
  verso (8)     — el dolor individual: cello grave, la gota casi no aparece
  build (2)     — las gotas se aceleran, la tensión crece
  gancho B (8)  — alguien levanta la cabeza: lead más alto, gota cada compás
  puente (4)    — "va de nuevo": gota y pad solos, decisión
  gancho C (8)  — la convicción: gota estalla en arpeggio, lead y arpeggio juntos
  final (4)     — una última gota; el vestuario se vacía

Rasgo distintivo: gota que llena — pluck cristalino (armónicos de guitarra sintetizada)
  que cae a intervalos irregulares como gotas en un vestuario silencioso; al principio
  aislada y lenta, se densifica sección a sección, y en el gancho C explota en un
  arpeggio rápido — el silencio que se rompió.

Estructura (46 compases, 110 BPM, re# menor):
  intro 4 · gancho A 8 · verso 8 · build 2 · gancho B 8 · puente 4 · gancho C 8 · final 4

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_14_4.py
Salida: fuentes/beats/salida/diario/2026-10-14-4.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, env_adsr, poner, repitch,  # noqa: E402
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar,
                      ochocientos)

BPM = 110
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.10 * S16
rng = np.random.default_rng(141004)
NOMBRES = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
           'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
           'A#': 10, 'Bb': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOMBRES[nombre[:-1]]


def paso(c, s, swing=True):
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


hum = lambda s=0.004: rng.normal(0, s)                              # noqa: E731
vel = lambda: 1 - rng.uniform(0, 0.18)                              # noqa: E731


# ── Armonía (re# menor: i – VI – iv – VII) ──────────────────────────────────
PROG = ['D#m', 'B', 'G#m', 'C#']
PAD_V = {
    'D#m': ['D#3', 'F#3', 'A#3'],
    'B':   ['B2', 'D#3', 'F#3'],
    'G#m': ['G#2', 'B2', 'D#3'],
    'C#':  ['C#3', 'F3', 'G#3'],
}
RAIZ_808 = {'D#m': 'D#1', 'B': 'B1', 'G#m': 'G#1', 'C#': 'C#2'}

# ── Melodías (paso en semicorcheas, nota, largo en semicorcheas) ─────────────

# Cello (verso): lento, grave, doloroso
CELLO_MEL = [
    [(0, 'D#4', 5), (8, 'C#4', 3), (14, 'B3', 2)],             # D#m
    [(0, 'B3', 4), (6, 'D#4', 2), (10, 'F#3', 4)],              # B
    [(0, 'G#3', 5), (8, 'B3', 3), (14, 'D#4', 2)],              # G#m
    [(0, 'C#4', 4), (6, 'F4', 2), (10, 'D#4', 4)],              # C#
]

# Lead gancho B: más agudo, esperanzado
LEAD_B = [
    [(0, 'A#4', 3), (4, 'D#5', 2), (8, 'F#5', 3), (14, 'D#5', 2)],
    [(0, 'B4', 4), (6, 'F#4', 2), (10, 'D#5', 4)],
    [(0, 'D#5', 3), (4, 'B4', 2), (8, 'G#4', 3), (14, 'A#4', 2)],
    [(0, 'C#5', 4), (6, 'F5', 2), (10, 'G#4', 4)],
]

# Lead gancho C: alto, con espacios para el arpeggio de la gota
LEAD_C = [
    [(0, 'F#5', 4), (8, 'A#5', 3), (14, 'F#5', 2)],
    [(0, 'D#5', 4), (8, 'B4', 4)],
    [(0, 'G#5', 3), (4, 'D#5', 3), (10, 'B4', 4)],
    [(0, 'C#5', 4), (8, 'G#5', 4)],
]

SECCIONES = [('intro', 4), ('ganchoA', 8), ('verso', 8), ('build', 2),
             ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 4)]


# ── Instrumentos de este tema ────────────────────────────────────────────────

def gota(m, dur=1.4):
    """Gota: pluck cristalino con armónicos de guitarra, como una gota en el silencio."""
    t = t_arr(dur)
    f0 = float(hz(m))
    x = np.sin(2 * np.pi * f0 * t) * np.exp(-t * 2.5)
    x += 0.55 * np.sin(2 * np.pi * f0 * 2 * t) * np.exp(-t * 4)
    x += 0.3 * np.sin(2 * np.pi * f0 * 3 * t) * np.exp(-t * 6)
    x += 0.12 * np.sin(2 * np.pi * f0 * 5 * t) * np.exp(-t * 9)
    plk = bp(rng.standard_normal(len(t)),
             max(f0 * 0.8, 100), min(f0 * 5, SR * 0.44)) * np.exp(-t * 150) * 0.18
    x = (x + plk) * env_adsr(len(t), 0.002, 0.06, 0.7, 0.4, dur * 0.8)
    return lp(x, 7000) * 0.32


def pad_oscuro(notas_str, dur, brillo=1400):
    """Pad oscuro: pulso con PWM lento, grave y denso."""
    t = t_arr(dur + 1.5)
    out = np.zeros((2, len(t)))
    for nota in notas_str:
        f = float(hz(n(nota)))
        for v in range(4):
            det = (v - 1.5) * 0.005
            ph = f * (1 + det) * t
            duty = 0.35 + 0.1 * np.sin(2 * np.pi * 0.3 * t + v * 0.5)
            x = np.where((ph % 1) < duty, 1.0, -1.0)
            out += paneo(x / 4, (v - 1.5) / 3 * 0.7)
    e = env_adsr(len(t), 0.5, 0.7, 0.7, 1.0, dur)
    return lp(out, brillo) * e * 0.09


def cello(m, dur, desde=None):
    """Cello sintetizado: saw grave con ataque de arco y vibrato."""
    t = t_arr(dur + 0.5)
    f0 = float(hz(m))
    f = np.full(len(t), f0)
    if desde is not None:
        g = min(len(t), int(0.1 * SR))
        f[:g] *= (float(hz(desde)) / f0) ** (1 - (np.arange(g) / g) ** 0.6)
    f *= 1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.3) * 2, 0, 1)
    ph = np.cumsum(f) / SR
    x = (2 * (ph - np.floor(ph + 0.5))) * 0.55
    x += np.sign(np.sin(2 * np.pi * ph)) * 0.25
    x += np.sin(2 * np.pi * ph) * 0.2
    e = env_adsr(len(t), 0.12, 0.25, 0.6, 0.35, dur)
    return lp(x * e, 2800) * 0.18


def lead_abierto(m, dur, desde=None):
    """Lead abierto: saw cálida con vibrato amplio, para los ganchos."""
    t = t_arr(dur + 0.4)
    f0 = float(hz(m))
    f = np.full(len(t), f0)
    if desde is not None:
        g = min(len(t), int(0.07 * SR))
        f[:g] *= (float(hz(desde)) / f0) ** (1 - (np.arange(g) / g) ** 0.8)
    f *= 1 + 0.007 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.15) * 3, 0, 1)
    ph = np.cumsum(f) / SR
    x = (2 * (ph - np.floor(ph + 0.5))) * 0.5 + np.sin(2 * np.pi * ph) * 0.5
    e = env_adsr(len(t), 0.008, 0.12, 0.65, 0.25, dur)
    return lp(x * e, 3800) * 0.20


def bombo_pesado():
    """Bombo pesado: golpe sordo, como un puño contra el banco."""
    t = t_arr(0.55)
    sub = np.sin(2 * np.pi * np.cumsum(42 + 10 * np.exp(-t * 15)) / SR) * np.exp(-t * 5)
    punch = np.sin(2 * np.pi * np.cumsum(52 + 100 * np.exp(-t * 45)) / SR) * np.exp(-t * 22)
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 300) * 0.4
    return np.tanh((sub * 0.85 + punch * 0.8 + click) * 1.3)


def snare_seco():
    """Snare seco y corto, como un golpe cerrado."""
    t = t_arr(0.28)
    cuerpo = np.sin(2 * np.pi * 195 * t) * np.exp(-t * 28)
    ruido = bp(rng.standard_normal(len(t)), 1600, 7500) * np.exp(-t * 18)
    return np.tanh((cuerpo * 0.55 + ruido * 0.85) * 1.3)


def hat_fino(abierto=False):
    """Hi-hat sutil, noise filtrado alto."""
    t = t_arr(0.28 if abierto else 0.05)
    return hp(rng.standard_normal(len(t)), 8500, 3) * np.exp(-t * (9 if abierto else 80)) * 0.18


def shaker_leve():
    t = t_arr(0.07)
    return hp(rng.standard_normal(len(t)), 6000) * np.minimum(t / 0.01, 1) * np.exp(-t * 55) * 0.14


def platillo_inv(dur):
    """Platillo invertido: swell hacia la entrada."""
    t = t_arr(dur)
    x = hp(rng.standard_normal(len(t)) * 2, 4500) * np.exp(-t * 2.2)
    x = x[::-1]
    return np.stack([x, np.roll(x, 400)]) * 0.055


# ── Composición ──────────────────────────────────────────────────────────────

def render():
    total = sum(c for _, c in SECCIONES)                             # 46
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'gota', 'pad', 'lead', 'fx']}
    sc = np.zeros(N)

    K, SN = bombo_pesado(), snare_seco()
    H, HO, SH = hat_fino(), hat_fino(True), shaker_leve()
    ir = reverb_ir(dur=3.0, brillo=5000, seed=44)
    ir_sala = reverb_ir(dur=0.7, decay=7, brillo=7000, seed=45)
    notas808 = []
    ini = {}
    c0 = 0

    for nombre, largo in SECCIONES:
        ini[nombre] = c0
        for c in range(largo):
            cg = c0 + c
            ac = PROG[c % 4]
            frase = c % 4
            ultimo = c == largo - 1

            # ── Pad ──────────────────────────────────────────────────────
            if nombre != 'build':
                brillo = 1100 if nombre in ('intro', 'puente', 'final') else 1600
                poner(bus['pad'], pad_oscuro(PAD_V[ac], COMPAS, brillo),
                      paso(cg, 0, False))

            # ── Gota: patrón variable por sección ────────────────────────
            drips = []
            if nombre == 'intro':
                if c == 0:
                    drips = [(0, 'D#5')]
                elif c == 2:
                    drips = [(8, 'A#4')]
            elif nombre == 'ganchoA':
                patrones = {0: [(4, 'D#5')], 1: [(12, 'A#4')], 3: [(8, 'F#4')],
                            4: [(0, 'D#5')], 5: [(6, 'B4')], 7: [(10, 'A#4')]}
                drips = patrones.get(c, [])
            elif nombre == 'verso':
                if c == 2:
                    drips = [(12, 'D#5')]
                elif c == 6:
                    drips = [(4, 'A#4')]
            elif nombre == 'build':
                if c == 0:
                    drips = [(0, 'D#5'), (8, 'A#4'), (12, 'F#4')]
                else:
                    drips = [(0, 'B4'), (4, 'D#5'), (8, 'A#4'),
                             (10, 'F#4'), (12, 'B4'), (14, 'D#5')]
            elif nombre == 'ganchoB':
                notas_b = ['D#5', 'A#4', 'F#4', 'B4', 'D#5', 'C#5', 'A#4', 'D#5']
                steps_b = [4, 8, 0, 12, 4, 10, 0, 8]
                drips = [(steps_b[c], notas_b[c])]
            elif nombre == 'puente':
                pat_p = {0: [(0, 'D#5')], 1: [(8, 'A#4')],
                         2: [(4, 'F#4')], 3: [(12, 'B4')]}
                drips = pat_p.get(c, [])
            elif nombre == 'ganchoC':
                arps = {
                    'D#m': [(0, 'D#5'), (4, 'F#4'), (8, 'A#4'), (12, 'D#5')],
                    'B':   [(0, 'B4'),  (4, 'D#5'), (8, 'F#4'), (12, 'B4')],
                    'G#m': [(0, 'G#4'), (4, 'B4'),  (8, 'D#5'), (12, 'G#4')],
                    'C#':  [(0, 'C#5'), (4, 'F5'),  (8, 'G#4'), (12, 'C#5')],
                }
                drips = arps[ac]
            elif nombre == 'final':
                if c == 3:
                    drips = [(8, 'D#5')]

            for (s, nota) in drips:
                x = gota(n(nota))
                poner(bus['gota'], paneo(x, 0.2 * (-1 if s < 8 else 1)),
                      paso(cg, s) + hum(0.003))

            # ── Lead (cello en verso, lead abierto en ganchos B y C) ─────
            if nombre == 'verso':
                previa = None
                for (s, nota, l) in CELLO_MEL[frase]:
                    m = n(nota)
                    x = cello(m, l * S16 * 0.9,
                              previa if previa and abs(previa - m) <= 5 else None)
                    poner(bus['lead'], paneo(x, -0.15), paso(cg, s) + hum(0.003))
                    previa = m
            elif nombre == 'ganchoB':
                previa = None
                for (s, nota, l) in LEAD_B[frase]:
                    m = n(nota)
                    x = lead_abierto(m, l * S16 * 0.9,
                                     previa if previa and abs(previa - m) <= 4 else None)
                    poner(bus['lead'], paneo(x, -0.1), paso(cg, s) + hum(0.003))
                    previa = m
            elif nombre == 'ganchoC':
                previa = None
                for (s, nota, l) in LEAD_C[frase]:
                    m = n(nota)
                    x = lead_abierto(m, l * S16 * 0.9,
                                     previa if previa and abs(previa - m) <= 4 else None)
                    poner(bus['lead'], paneo(x, -0.12), paso(cg, s) + hum(0.003))
                    previa = m
            # Final: nota del cello acompaña la última gota
            if nombre == 'final' and ultimo:
                x = cello(n('D#4'), 6 * S16, None)
                poner(bus['lead'], paneo(x * 0.4, 0.1), paso(cg, 6))

            # ── Batería ──────────────────────────────────────────────────
            con_drums = nombre in ('ganchoA', 'verso', 'build', 'ganchoB', 'ganchoC')
            if con_drums:
                if nombre == 'verso':
                    kicks = [0, 8]
                elif nombre == 'build':
                    kicks = [0, 8] if c == 0 else [0, 4, 8, 12]
                elif nombre == 'ganchoC':
                    kicks = [0, 6, 10] if frase != 3 else [0, 6, 10, 14]
                else:                                                # ganchoA, ganchoB
                    kicks = [0, 10] if frase != 3 else [0, 6, 10]
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.9, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.22) * 14)[None], paso(cg, s, False))

                # Snare en el 3er tiempo
                if nombre != 'build' or c == 0:
                    poner(bus['drums'], paneo(SN, 0.04) * 0.7,
                          paso(cg, 8, False) + hum(0.002))

                # Hats
                if nombre == 'build':
                    div = 2 if c == 0 else 1
                    for s in range(0, 16, div):
                        a = 0.65 if s % 4 == 0 else 0.35
                        poner(bus['drums'], paneo(H * a, 0.3),
                              paso(cg, s) + hum(0.002))
                elif nombre == 'verso':
                    for s in range(0, 16, 2):
                        a = 0.8 if s % 4 == 0 else 0.45
                        poner(bus['drums'], paneo(H * a * vel(), 0.3),
                              paso(cg, s) + hum(0.002))
                else:                                                # ganchos
                    redoble = frase == 3 and nombre.startswith('gancho')
                    for s in range(0, 16):
                        if redoble and s >= 13:
                            break
                        a = [0.85, 0.35, 0.55, 0.35][s % 4]
                        poner(bus['drums'], paneo(H * a * vel(), 0.3),
                              paso(cg, s) + hum(0.002))
                    if redoble:
                        for j in range(6):
                            r = 1 + j * 0.04
                            poner(bus['drums'],
                                  paneo(repitch(H, r) * (0.35 + 0.5 * j / 6), 0.3),
                                  cg * COMPAS + 13 * S16 + j * S16 / 2)
                    # Hat abierto a contratiempo
                    if frase in (1, 3):
                        ho = HO[:int(2.5 * S16 * SR)].copy()
                        ho[-300:] *= np.linspace(1, 0, 300)
                        poner(bus['drums'], paneo(ho, -0.25) * 0.6, paso(cg, 7))

                # Shaker
                if nombre != 'build':
                    for s in range(2, 16, 4):
                        poner(bus['drums'], paneo(SH, -0.4), paso(cg, s))

            # ── 808 ──────────────────────────────────────────────────────
            if nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC'):
                r = n(RAIZ_808[ac])
                if nombre == 'verso':
                    pat = [(0, 0, 10)]
                    if frase == 2:
                        pat = [(0, 0, 6), (8, 12, 6)]               # salto de octava
                elif nombre == 'ganchoC':
                    pat = [(0, 0, 4), (6, 12, 2), (10, 0, 4)]
                    if frase == 3:
                        pat = [(0, 0, 3), (6, 7, 2), (10, 0, 3), (14, 12, 2)]
                else:                                                # ganchoA, ganchoB
                    pat = [(0, 0, 6), (10, 12, 4)]
                    if frase == 3:
                        pat = [(0, 0, 4), (6, 7, 2), (10, 0, 4)]    # con quinta
                for s, intervalo, l in pat:
                    gl = 0.1 if intervalo in (7, 12) and s > 0 else 0
                    notas808.append((paso(cg, s, False), r + intervalo, l * S16, gl))
        c0 += largo

    T = lambda comp: comp * COMPAS                                   # noqa: E731

    # ── Platillo invertido antes de cada gancho ──────────────────────
    for g in ('ganchoA', 'ganchoB', 'ganchoC'):
        pc = platillo_inv(BEAT * 3)
        poner(bus['fx'], pc, T(ini[g]) - pc.shape[1] / SR)

    # ── Build: redoble de snare acelerando ───────────────────────────
    b0 = ini['build']
    tiempos = ([b0 * COMPAS + k * BEAT / 2 for k in range(4)] +
               [b0 * COMPAS + 2 * BEAT + k * S16 for k in range(8)] +
               [(b0 + 1) * COMPAS + k * S16 / 2 for k in range(20)])
    for j, tt in enumerate(tiempos):
        if tt < T(b0 + 2) - BEAT * 0.3:
            poner(bus['drums'], paneo(repitch(SN, 1 + j * 0.01), 0) *
                  (0.2 + 0.55 * j / len(tiempos)), tt)

    # ── 808 render ───────────────────────────────────────────────────
    if notas808:
        bus['bajo'] += paneo(lp(ochocientos(notas808, N / SR, 2.0), 4000), 0)

    # ── Mezcla ───────────────────────────────────────────────────────
    duck = 1 - np.clip(sc, 0, 1) * 0.5
    gota_m = con_reverb(bus['gota'], ir, 0.55)                    # reverb largo: eco en el vestuario
    gota_m = delay_pingpong(gota_m, BEAT * 0.75, 0.35, 0.2)
    pad_m = con_reverb(bus['pad'] * duck, ir, 0.3)
    lead_m = con_reverb(delay_pingpong(bus['lead'], BEAT * 0.5, 0.3, 0.15), ir, 0.22)
    drums_m = con_reverb(saturar(bus['drums'], 0.12), ir_sala, 0.07)
    bajo_m = bus['bajo'] * (1 - 0.25 * np.clip(sc, 0, 1))

    mix = drums_m * 1.0 + bajo_m * 0.85 + gota_m * 1.15 + pad_m * 0.85 + lead_m * 0.95 + bus['fx']

    # Drop antes del gancho B: silencio para que la entrada pegue
    drop_start = int((T(ini['build'] + 2) - BEAT * 0.5) * SR)
    drop_end = int(T(ini['ganchoB']) * SR)
    fade_len = int(0.12 * SR)
    if drop_start + fade_len < drop_end:
        mix[:, drop_start:drop_start + fade_len] *= np.linspace(1, 0.03, fade_len)
        mix[:, drop_start + fade_len:drop_end] *= 0.03

    # Ganancia por sección: intro/final arriba (pocas capas, necesitan boost),
    # verso abajo de los ganchos, puente arriba (pocas capas)
    g = np.ones(mix.shape[1])
    for nom, val in [('intro', 4.0), ('final', 3.8), ('puente', 2.8),
                     ('build', 0.7), ('verso', 0.7)]:
        largo_s = dict(SECCIONES)[nom]
        a_ = int(T(ini[nom]) * SR)
        b_ = min(mix.shape[1], int(T(ini[nom] + largo_s) * SR))
        g[a_:b_] = val
    g = lp(g, 3)
    mix *= g

    # Master
    mix = hp(mix, 28)
    mix /= np.percentile(np.abs(mix), 99.95) + 1e-9
    mix *= 0.85
    mix = np.tanh(mix * 1.12) / np.tanh(1.12)
    mix /= np.abs(mix).max() + 1e-9

    fin = int((total * COMPAS + 2.5) * SR)
    mix = mix[:, :fin]
    fade = int(2.0 * SR)
    mix[:, -fade:] *= np.linspace(1, 0, fade)
    return (mix * 0.95).T


if __name__ == '__main__':
    out = os.path.join(RAIZ, 'fuentes', 'beats', 'salida', 'diario')
    os.makedirs(out, exist_ok=True)
    f = os.path.join(out, '2026-10-14-4.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.0f} s')
