"""TRIBUNA — tema del día 2026-10-14-3.

Concepto: el jugador que no tiene a nadie en la tribuna — juega igual, pero en
cada gol mira hacia arriba y no encuentra a nadie. El día que deja de mirar,
juega libre.

Emoción por sección:
  intro (4)     — la tribuna vacía: arpa sola con pad, contemplación
  gancho A (8)  — el partido empieza: batería y 808, arpa sigue sola
  verso (8)     — el peso de jugar sin hinchada: lead grave, arpa se calla
  build (2)     — tensión antes del gol
  gancho B (8)  — gol, mira arriba, no hay nadie: lead alto + arpa fugaz (bar 5)
  puente (4)    — decisión: deja de buscar, arpa y pad solos
  gancho C (8)  — juega libre: arpa y lead juntos, armonizados
  final (4)     — arpa sola otra vez; última nota: el lead la acompaña

Rasgo distintivo: arpa fantasma — arpa sintetizada grave (armónicos naturales con
  segundo parcial detuneado y caída sutil de pitch al final de cada nota) que lleva
  la melodía sola en intro, puente y final; en los ganchos las demás capas la rodean
  pero ella sigue aislada en su registro; en el gancho C suena armonizada con el
  lead — ya no está sola.

Estructura (46 compases, 132 BPM, la menor):
  intro 4 · gancho A 8 · verso 8 · build 2 · gancho B 8 · puente 4 · gancho C 8 · final 4

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_14_3.py
Salida: fuentes/beats/salida/diario/2026-10-14-3.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, env_adsr, poner, repitch,  # noqa: E402
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar,
                      ochocientos)

BPM = 132
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.13 * S16
rng = np.random.default_rng(141003)
NOMBRES = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
           'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
           'A#': 10, 'Bb': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOMBRES[nombre[:-1]]


def paso(c, s, swing=True):
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


hum = lambda s=0.004: rng.normal(0, s)                              # noqa: E731
vel = lambda: 1 - rng.uniform(0, 0.18)                              # noqa: E731


# ── Armonía (la menor: i – VI – iv – V) ─────────────────────────────────────
PROG = ['Am', 'F', 'Dm', 'E']
PAD_V = {
    'Am': ['A3', 'C4', 'E4'],
    'F':  ['A3', 'C4', 'F4'],
    'Dm': ['A3', 'D4', 'F4'],
    'E':  ['G#3', 'B3', 'E4'],
}
RAIZ_808 = {'Am': 'A1', 'F': 'F1', 'Dm': 'D2', 'E': 'E1'}

# ── Melodías (paso en semicorcheas, nota, largo en semicorcheas) ─────────────

# Arpa: simple, cantable, con espacio (intro, ganchoA, puente, final)
ARPA_MEL = [
    [(0, 'E4', 3), (4, 'C4', 2), (8, 'D4', 3), (14, 'E4', 2)],     # Am
    [(0, 'F4', 3), (4, 'C4', 2), (8, 'A3', 4)],                      # F
    [(0, 'D4', 2), (4, 'F4', 3), (10, 'E4', 2), (14, 'D4', 2)],     # Dm
    [(0, 'B3', 3), (4, 'G#3', 2), (8, 'E4', 4)],                     # E
]

# Lead del verso: grave, con peso
LEAD_VERSO = [
    [(0, 'A3', 4), (6, 'C4', 2), (8, 'E4', 3), (14, 'D4', 2)],     # Am
    [(0, 'F4', 3), (4, 'C4', 2), (8, 'A3', 4)],                      # F
    [(0, 'D4', 2), (4, 'F4', 3), (10, 'E4', 2), (14, 'D4', 2)],     # Dm
    [(0, 'B3', 3), (4, 'E4', 2), (8, 'G#3', 4)],                     # E
]

# Lead de los ganchos B: más agudo, rítmico
LEAD_GANCHO = [
    [(0, 'A4', 2), (3, 'C5', 1), (4, 'E5', 3), (8, 'C5', 2), (12, 'A4', 4)],
    [(0, 'F5', 3), (4, 'C5', 2), (8, 'A4', 4)],
    [(0, 'D5', 2), (4, 'F5', 3), (10, 'E5', 2), (14, 'D5', 2)],
    [(0, 'B4', 3), (4, 'G#4', 2), (8, 'E5', 4)],
]

# Lead del gancho C: ornamental, más alto
LEAD_C = [
    [(0, 'E5', 2), (3, 'G5', 1), (4, 'A5', 3), (8, 'G5', 2), (12, 'E5', 4)],
    [(0, 'F5', 3), (4, 'A5', 2), (8, 'C5', 4)],
    [(0, 'D5', 2), (3, 'F5', 1), (4, 'A5', 3), (8, 'F5', 2), (12, 'D5', 4)],
    [(0, 'E5', 3), (4, 'B4', 2), (8, 'G#4', 4)],
]

# Arpa en gancho C: acompaña al lead (ya no está sola)
ARPA_C = [
    [(0, 'A3', 2), (4, 'D4', 3), (8, 'C4', 2), (12, 'A3', 4)],     # Am
    [(0, 'C4', 3), (4, 'F3', 2), (8, 'A3', 4)],                      # F
    [(0, 'A3', 2), (4, 'D4', 3), (8, 'A3', 2), (12, 'F3', 4)],      # Dm
    [(0, 'E3', 3), (4, 'G#3', 2), (8, 'E4', 4)],                     # E
]

SECCIONES = [('intro', 4), ('ganchoA', 8), ('verso', 8), ('build', 2),
             ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 4)]


# ── Instrumentos ─────────────────────────────────────────────────────────────
def arpa_fantasma(m, dur=1.8):
    """Arpa fantasma: armónicos con 2do parcial detuneado, caída de pitch sutil."""
    t = t_arr(dur + 0.6)
    f0 = float(hz(m))
    drift = 1 - 0.006 * np.clip((t - dur * 0.5) / max(dur * 0.5, 0.01), 0, 1) ** 2
    ph = np.cumsum(f0 * drift) / SR
    x = np.sin(2 * np.pi * ph) * np.exp(-t * 1.6)
    x += 0.45 * np.sin(2 * np.pi * ph * 2.005) * np.exp(-t * 2.5)   # detuned 2nd
    x += 0.2 * np.sin(2 * np.pi * ph * 3) * np.exp(-t * 4.0)
    x += 0.08 * np.sin(2 * np.pi * ph * 5) * np.exp(-t * 6.5)
    plk = bp(rng.standard_normal(len(t)),
             max(f0 * 0.7, 80), min(f0 * 4, SR * 0.44)) * np.exp(-t * 100) * 0.2
    x = (x + plk) * env_adsr(len(t), 0.003, 0.08, 0.85, 0.5, dur)
    return lp(x, 4200) * 0.36


def pad_etereo(notas_str, dur, brillo=2000):
    """Pad etéreo: triángulos detuneados con ataque lento."""
    t = t_arr(dur + 1.5)
    out = np.zeros((2, len(t)))
    for nota in notas_str:
        f = float(hz(n(nota)))
        for v in range(4):
            det = (v - 1.5) * 0.004
            ph = f * (1 + det) * t
            tri = 2 * np.abs(2 * (ph - np.floor(ph + 0.5))) - 1
            out += paneo(tri / 4, (v - 1.5) / 3 * 0.8)
    e = env_adsr(len(t), 0.55, 0.7, 0.75, 1.0, dur)
    return lp(out, brillo) * e * 0.12


def lead_calido(m, dur, desde=None):
    """Lead cálido: saw+sine con overdrive suave y portamento lento."""
    t = t_arr(dur + 0.4)
    f0 = float(hz(m))
    f = np.full(len(t), f0)
    if desde is not None:
        g = min(len(t), int(0.08 * SR))
        ratio = float(hz(desde)) / f0
        f[:g] *= ratio ** (1 - (np.arange(g) / g) ** 0.7)
    f *= 1 + 0.005 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.2) * 3, 0, 1)
    ph = np.cumsum(f) / SR
    x = (2 * (ph - np.floor(ph + 0.5))) * 0.65 + np.sin(2 * np.pi * ph) * 0.35
    x = np.tanh(x * 1.7) * 0.75
    e = env_adsr(len(t), 0.012, 0.18, 0.6, 0.25, dur)
    return lp(x * e, 3200) * 0.2


def bombo_grave():
    """Bombo en capas: sub + punch + click."""
    t = t_arr(0.5)
    sub = np.sin(2 * np.pi * np.cumsum(44 + 12 * np.exp(-t * 18)) / SR) * np.exp(-t * 5.5)
    punch = np.sin(2 * np.pi * np.cumsum(55 + 130 * np.exp(-t * 55)) / SR) * np.exp(-t * 26)
    click = hp(rng.standard_normal(len(t)), 2800) * np.exp(-t * 350) * 0.5
    return np.tanh((sub * 0.8 + punch * 0.85 + click) * 1.4)


def palmada():
    """Palmada: clap-snare húmeda con cola."""
    t = t_arr(0.38)
    ruido = bp(rng.standard_normal(len(t)), 800, 5500)
    e = np.zeros(len(t))
    for k, off in enumerate([0, 0.009, 0.018]):
        i = int(off * SR)
        e[i:] += np.exp(-t[:len(t) - i] * 55) * (0.7 if k < 2 else 1)
    e += 0.5 * np.exp(-t * 11)
    tono = np.sin(2 * np.pi * 175 * t) * np.exp(-t * 28) * 0.3
    return np.tanh((ruido * e + tono) * 1.5)


def hat_sutil(abierto=False):
    """Hi-hat suave, noise filtrado."""
    t = t_arr(0.3 if abierto else 0.055)
    return hp(rng.standard_normal(len(t)), 8000, 3) * np.exp(-t * (10 if abierto else 75)) * 0.2


def shaker_suave():
    t = t_arr(0.08)
    return hp(rng.standard_normal(len(t)), 5500) * np.minimum(t / 0.01, 1) * np.exp(-t * 50) * 0.15


def platillo_inv(dur):
    """Platillo invertido: swell hacia la entrada."""
    t = t_arr(dur)
    x = hp(rng.standard_normal(len(t)) * 2, 4000) * np.exp(-t * 2.0)
    x = x[::-1]
    return np.stack([x, np.roll(x, 350)]) * 0.06


# ── Composición ──────────────────────────────────────────────────────────────
def render():
    total = sum(c for _, c in SECCIONES)                             # 46
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'arpa', 'pad', 'lead', 'fx']}
    sc = np.zeros(N)

    K, P = bombo_grave(), palmada()
    H, HO, SH = hat_sutil(), hat_sutil(True), shaker_suave()
    ir = reverb_ir(dur=2.8, brillo=5500, seed=33)
    ir_sala = reverb_ir(dur=0.6, decay=8, brillo=7000, seed=34)
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
            if nombre == 'intro' and c == 0:
                pass                                                 # primer compás sin pad
            elif nombre != 'build':
                brillo = 1500 if nombre in ('intro', 'puente', 'final') else 2200
                poner(bus['pad'], pad_etereo(PAD_V[ac], COMPAS, brillo),
                      paso(cg, 0, False))

            # ── Arpa ─────────────────────────────────────────────────────
            con_arpa = nombre in ('intro', 'ganchoA', 'puente', 'final')
            if nombre == 'ganchoB' and c == 4:                       # fugaz: mira arriba
                con_arpa = True
            if con_arpa:
                for (s, nota, l) in ARPA_MEL[frase]:
                    x = arpa_fantasma(n(nota), l * S16)
                    poner(bus['arpa'], paneo(x, 0.15 * (-1 if s < 8 else 1)),
                          paso(cg, s) + hum(0.003))
            if nombre == 'ganchoC':
                for (s, nota, l) in ARPA_C[frase]:
                    x = arpa_fantasma(n(nota), l * S16)
                    poner(bus['arpa'], paneo(x, 0.2), paso(cg, s) + hum(0.003))

            # ── Lead ─────────────────────────────────────────────────────
            if nombre == 'verso':
                previa = None
                for (s, nota, l) in LEAD_VERSO[frase]:
                    m = n(nota)
                    x = lead_calido(m, l * S16 * 0.9,
                                    previa if previa and abs(previa - m) <= 5 else None)
                    poner(bus['lead'], paneo(x, -0.1), paso(cg, s) + hum(0.003))
                    previa = m
            elif nombre == 'ganchoB':
                previa = None
                for (s, nota, l) in LEAD_GANCHO[frase]:
                    m = n(nota)
                    x = lead_calido(m, l * S16 * 0.9,
                                    previa if previa and abs(previa - m) <= 4 else None)
                    poner(bus['lead'], paneo(x, -0.1), paso(cg, s) + hum(0.003))
                    previa = m
            elif nombre == 'ganchoC':
                previa = None
                for (s, nota, l) in LEAD_C[frase]:
                    m = n(nota)
                    x = lead_calido(m, l * S16 * 0.9,
                                    previa if previa and abs(previa - m) <= 4 else None)
                    poner(bus['lead'], paneo(x, -0.15), paso(cg, s) + hum(0.003))
                    previa = m
            # Final: nota tímida del lead acompaña al arpa en unísono (E4)
            if nombre == 'final' and ultimo:
                x = lead_calido(n('E4'), 8 * S16, None)
                poner(bus['lead'], paneo(x * 0.45, 0.1), paso(cg, 8) + hum())

            # ── Batería ──────────────────────────────────────────────────
            con_drums = nombre in ('ganchoA', 'verso', 'build', 'ganchoB', 'ganchoC')
            if con_drums:
                # Kicks
                if nombre == 'verso':
                    kicks = [0, 8]
                elif nombre == 'build':
                    kicks = [0, 8] if c == 0 else [0, 4, 8, 12]
                elif nombre == 'ganchoC':
                    kicks = [0, 6, 10] if frase != 3 else [0, 6, 10, 15]
                else:                                                # ganchoA, ganchoB
                    kicks = [0, 10] if frase != 3 else [0, 6, 10]
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.9, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.2) * 15)[None], paso(cg, s, False))

                # Palmada en el 3er tiempo (no en el 2do compás del build)
                if nombre != 'build' or c == 0:
                    poner(bus['drums'], paneo(P, 0.05) * 0.7,
                          paso(cg, 8, False) + hum(0.002))

                # Hats
                if nombre == 'verso':
                    for s in range(0, 16, 2):                        # corcheas
                        a = 0.9 if s % 4 == 0 else 0.5
                        poner(bus['drums'], paneo(H * a * vel(), 0.3),
                              paso(cg, s) + hum(0.002))
                elif nombre == 'build':
                    div = 2 if c == 0 else 1                         # corcheas → semicorcheas
                    for s in range(0, 16, div):
                        a = 0.7 if s % 4 == 0 else 0.4
                        poner(bus['drums'], paneo(H * a, 0.3),
                              paso(cg, s) + hum(0.002))
                else:                                                # ganchos
                    redoble = frase == 3 and nombre.startswith('gancho')
                    for s in range(0, 16):
                        if redoble and s >= 13:
                            break
                        a = [0.9, 0.35, 0.6, 0.35][s % 4]
                        poner(bus['drums'], paneo(H * a * vel(), 0.3),
                              paso(cg, s) + hum(0.002))
                    if redoble:
                        for j in range(6):
                            r = 1 + j * 0.05
                            poner(bus['drums'],
                                  paneo(repitch(H, r) * (0.4 + 0.5 * j / 6), 0.3),
                                  cg * COMPAS + 13 * S16 + j * S16 / 2)
                    # Hat abierto a contratiempo
                    if frase in (1, 3):
                        ho = HO[:int(2.5 * S16 * SR)].copy()
                        ho[-300:] *= np.linspace(1, 0, 300)
                        poner(bus['drums'], paneo(ho, -0.25) * 0.7, paso(cg, 7))

                # Shaker (no en el build)
                if nombre != 'build':
                    for s in range(2, 16, 4):
                        poner(bus['drums'], paneo(SH, -0.4), paso(cg, s))

            # ── 808 ──────────────────────────────────────────────────────
            if nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC'):
                r = n(RAIZ_808[ac])
                if nombre == 'verso':
                    pat = [(0, 0, 8)]
                    if frase == 2:
                        pat = [(0, 0, 6), (8, 12, 6)]               # salto de octava
                elif nombre == 'ganchoC':
                    pat = [(0, 0, 3), (6, 12, 2), (10, 0, 4)]
                    if frase == 3:
                        pat = [(0, 0, 3), (6, 12, 2), (10, 0, 3), (14, 7, 2)]
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

    # ── Build: redoble de palmada acelerando ─────────────────────────
    b0 = ini['build']
    tiempos = ([b0 * COMPAS + k * BEAT / 2 for k in range(4)] +
               [b0 * COMPAS + 2 * BEAT + k * S16 for k in range(8)] +
               [(b0 + 1) * COMPAS + k * S16 / 2 for k in range(20)])
    for j, tt in enumerate(tiempos):
        if tt < T(b0 + 2) - BEAT * 0.3:
            poner(bus['drums'], paneo(repitch(P, 1 + j * 0.01), 0) *
                  (0.25 + 0.55 * j / len(tiempos)), tt)

    # ── 808 ──────────────────────────────────────────────────────────
    if notas808:
        bus['bajo'] += paneo(lp(ochocientos(notas808, N / SR, 2.0), 4000), 0)

    # ── Mezcla ───────────────────────────────────────────────────────
    duck = 1 - np.clip(sc, 0, 1) * 0.5
    arpa_m = con_reverb(bus['arpa'], ir, 0.5)
    arpa_m = delay_pingpong(arpa_m, BEAT * 0.75, 0.3, 0.15)
    pad_m = con_reverb(bus['pad'] * duck, ir, 0.35)
    lead_m = con_reverb(delay_pingpong(bus['lead'], BEAT * 0.5, 0.35, 0.18), ir, 0.25)
    drums_m = con_reverb(saturar(bus['drums'], 0.12), ir_sala, 0.07)
    bajo_m = bus['bajo'] * (1 - 0.25 * np.clip(sc, 0, 1))

    mix = drums_m * 1.0 + bajo_m * 0.85 + arpa_m * 1.1 + pad_m * 0.85 + lead_m * 0.95 + bus['fx']

    # Drop antes del gancho B: silencio para que la entrada pegue
    drop_start = int((T(ini['build'] + 2) - BEAT * 0.5) * SR)
    drop_end = int(T(ini['ganchoB']) * SR)
    fade_len = int(0.12 * SR)
    if drop_start + fade_len < drop_end:
        mix[:, drop_start:drop_start + fade_len] *= np.linspace(1, 0.03, fade_len)
        mix[:, drop_start + fade_len:drop_end] *= 0.03

    # Ganancia por sección: intro/final arriba (pocas capas), verso abajo de los ganchos
    g = np.ones(mix.shape[1])
    for nom, val in [('intro', 1.6), ('final', 1.5), ('puente', 1.2),
                     ('build', 0.7), ('verso', 0.75)]:
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
    f = os.path.join(out, '2026-10-14-3.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.0f} s')
