"""BANCO — tema del día 2026-10-15-1.

Concepto: Sentado en el banco mirando jugar a tus compañeros — entrenaste toda la semana pero
tu nombre no sale; la frustración de estar tan cerca sin poder tocar la pelota, hasta que el DT
te señala y entrás con un fuego que ningún titular tiene.

Emoción por sección:
  intro    — la espera, sonidos amortiguados del partido a lo lejos
  gancho A — la frustración crece, querés estar ahí adentro
  verso    — resignación, el partido sigue sin vos
  build    — el DT te mira, te parás
  gancho B — pisás la cancha, la energía cambia
  puente   — primeros toques, te adaptás al ritmo del juego
  gancho C — jugás con todo, demostrás que merecías entrar
  final    — el coro que estaba lejos ahora suena limpio; lo hiciste

Rasgo distintivo: coro sumergido — voces sintetizadas (sierras detuneadas por filtros de formantes
vocales) bajo un pasa-bajos pesado, como amortiguadas por la distancia del banco a la cancha; el
corte sube sección a sección (600 → 900 → 1400 → 3500 Hz) y en el gancho C el coro suena limpio
y presente por primera vez.

Estructura (46 compases, 120 BPM, lab menor, medio tiempo):
  intro 4 · gancho A 8 · verso 8 · build 2 · gancho B 8 · puente 4 · gancho C 8 · final 4

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_15_1.py
Salida: fuentes/beats/salida/diario/2026-10-15-1.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, env_adsr, poner, repitch,  # noqa: E402
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar,
                      ochocientos, clap)

BPM = 120
BEAT = 60 / BPM                          # 0.5 s
COMPAS = 4 * BEAT                         # 2.0 s
S16 = BEAT / 4                            # 0.125 s
SWING = 0.15 * S16
rng = np.random.default_rng(1015)
NOMBRES = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6,
           'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOMBRES[nombre[:-1]]


def paso(c, s, swing=True):
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


# ── Armonía (lab menor / sol# menor natural) ────────────────────────────────
CORO_V = {
    'G#m7':  ['G#3', 'B3', 'D#4', 'F#4'],
    'Emaj7': ['E3', 'G#3', 'B3', 'D#4'],
    'B':     ['B3', 'D#4', 'F#4'],
    'F#7':   ['F#3', 'A#3', 'C#4', 'E4'],
}
RAIZ808 = {'G#m7': 'G#1', 'Emaj7': 'E2', 'B': 'B1', 'F#7': 'F#1'}
PROG = ['G#m7', 'Emaj7', 'B', 'F#7']

# Lead del gancho A y B: 4 frases (una por acorde), cada una de 1 compás en semicorcheas (paso, nota, largo)
LEAD_HOOK = [
    [(0, 'D#5', 3), (4, 'C#5', 2), (7, 'B4', 1), (8, 'G#4', 4)],                                   # i — descenso melancólico
    [(0, 'G#4', 2), (3, 'B4', 1), (4, 'D#5', 3), (8, 'E5', 2), (11, 'D#5', 1), (12, 'B4', 3)],     # VI — sube y cae
    [(0, 'F#4', 2), (3, 'A#4', 1), (4, 'B4', 2), (7, 'D#5', 1), (8, 'C#5', 4)],                     # III — escala hacia arriba
    [(0, 'C#5', 3), (4, 'A#4', 2), (8, 'F#4', 4), (14, 'G#4', 2)],                                  # VII — cae y resuelve
]
# Lead del gancho C: más agudo, con fuego
LEAD_C = [
    [(0, 'G#5', 2), (3, 'F#5', 1), (4, 'D#5', 3), (8, 'E5', 2), (11, 'F#5', 1), (12, 'G#5', 4)],
    [(0, 'F#5', 3), (4, 'D#5', 2), (8, 'B4', 2), (11, 'D#5', 1), (12, 'E5', 4)],
    [(0, 'D#5', 2), (3, 'F#5', 1), (4, 'G#5', 3), (8, 'A#5', 2), (11, 'G#5', 1), (12, 'F#5', 4)],
    [(0, 'E5', 3), (4, 'D#5', 2), (8, 'B4', 6)],
]

SECCIONES = [('intro', 4), ('ganchoA', 8), ('verso', 8), ('build', 2),
             ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 4)]
CORO_CUTOFF = {'intro': 600, 'ganchoA': 900, 'verso': 600, 'build': 1000,
               'ganchoB': 1400, 'puente': 1000, 'ganchoC': 3500, 'final': 4000}


# ── Instrumentos del tema ───────────────────────────────────────────────────
def coro_sumergido(notas_str, dur, cutoff=800, vel=1.0):
    """Coro: 5 sierras detuneadas por formantes vocales 'oh'; el LP controla la distancia."""
    t = t_arr(dur + 1.5)
    out = np.zeros((2, len(t)))
    for nota in notas_str:
        m = n(nota)
        f = hz(m)
        for v in range(5):
            det = (v - 2) * 0.005
            vib = 1 + 0.006 * np.sin(2 * np.pi * (4.2 + v * 0.4) * t) * np.clip((t - 0.2) * 3, 0, 1)
            ph = np.cumsum(f * (1 + det) * vib) / SR
            x = 2 * (ph - np.floor(ph + 0.5))
            x += 0.04 * rng.standard_normal(len(t))
            out += paneo(x / 5, (v - 2) / 3.0 * 0.5)
    # Formantes vocales ('oh') + LP que controla cuánto se oye
    y = np.zeros_like(out)
    for fo, g in [(450, 1.8), (800, 1.0), (2800, 0.35)]:
        y += bp(out, fo * 0.7, min(fo * 1.3, SR * 0.44), 2) * g
    y = lp(y, cutoff, 3)
    e = env_adsr(len(t), 0.35, 0.5, 0.7, 1.2, dur)
    return y * e * 0.30 * vel


def lead_banco(m, dur, desde=None):
    """Lead emocional: dos sierras detuneadas + sub-octava triángulo, portamento y vibrato."""
    t = t_arr(dur + 0.5)
    f = np.full(len(t), float(hz(m)))
    if desde is not None:
        g = min(len(t), int(0.08 * SR))
        f[:g] = hz(desde) + (hz(m) - hz(desde)) * (np.arange(g) / g) ** 0.6
    vib = 1 + 0.008 * np.sin(2 * np.pi * 5.0 * t) * np.clip((t - 0.15) * 4, 0, 1)
    f *= vib
    ph = np.cumsum(f) / SR
    ph2 = np.cumsum(f * 1.004) / SR
    x = (2 * (ph - np.floor(ph + 0.5))) * 0.5 + (2 * (ph2 - np.floor(ph2 + 0.5))) * 0.3
    ph_sub = np.cumsum(f * 0.5) / SR
    x += (2 * np.abs(2 * (ph_sub - np.floor(ph_sub + 0.5))) - 1) * 0.2
    x += 0.03 * rng.standard_normal(len(t)) * np.exp(-t * 3)
    x = lp(x, 2400)
    e = env_adsr(len(t), 0.035, 0.15, 0.65, 0.2, dur)
    return x * e * 0.22


def bombo_banco():
    """Bombo con punch medio: no demasiado grave, más golpe de pecho."""
    t = t_arr(0.5)
    sub = np.sin(2 * np.pi * np.cumsum(50 + 18 * np.exp(-t * 22)) / SR) * np.exp(-t * 6.5)
    punch = np.sin(2 * np.pi * np.cumsum(65 + 130 * np.exp(-t * 55)) / SR) * np.exp(-t * 26)
    click = hp(rng.standard_normal(len(t)), 2800) * np.exp(-t * 350) * 0.5
    return np.tanh((sub * 0.8 + punch * 0.85 + click) * 1.4)


def caja_banco():
    """Caja con cola presurizada (decay más largo)."""
    t = t_arr(0.4)
    cuerpo = (np.sin(2 * np.pi * 175 * t) + 0.4 * np.sin(2 * np.pi * 290 * t)) * np.exp(-t * 18)
    ruido = bp(rng.standard_normal(len(t)), 1200, 8500) * np.exp(-t * 10)
    return np.tanh((cuerpo * 0.65 + ruido * 0.85) * 1.3)


def hat_banco(abierto=False):
    """Hi-hat metálico hueco (frecuencias distintas al kit de Fachero)."""
    t = t_arr(0.35 if abierto else 0.07)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (218.5, 288.0, 397.2, 483.1, 591.0, 760.0))
    x = hp(bp(x, 5500, 13000), 6500) * np.exp(-t * (8 if abierto else 50))
    return x * 0.2


def shaker_banco():
    t = t_arr(0.08)
    return hp(rng.standard_normal(len(t)), 5500) * np.minimum(t / 0.01, 1) * np.exp(-t * 48) * 0.16


def rim_banco():
    t = t_arr(0.04)
    return (bp(rng.standard_normal(len(t)), 1400, 2800) * 0.5 + np.sin(2 * np.pi * 780 * t)) * np.exp(-t * 120) * 0.3


def platillo_inv(dur):
    """Platillo invertido (swell hacia la entrada)."""
    t = t_arr(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * 1.8 * t)) for f in (218.5, 288.0, 397.2, 483.1, 591.0, 760.0))
    x = hp(x + rng.standard_normal(len(t)) * 2, 4500) * np.exp(-t * 2.0)
    x = x[::-1]
    return np.stack([x, np.roll(x, 500)]) * 0.06


# ── Composición ─────────────────────────────────────────────────────────────
def render():
    total = sum(c for _, c in SECCIONES)                      # 46 compases
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'coro', 'lead', 'fx']}
    sc = np.zeros(N)

    K, SN, CL = bombo_banco(), caja_banco(), clap()
    H, HO, SH, RI = hat_banco(), hat_banco(True), shaker_banco(), rim_banco()
    ir = reverb_ir(dur=2.5, brillo=6500, seed=151)
    ir_sala = reverb_ir(dur=0.6, decay=8, brillo=7500, seed=152)
    notas808 = []
    ini = {}
    c0 = 0
    hum = lambda s=0.004: rng.normal(0, s)

    for nombre, largo in SECCIONES:
        ini[nombre] = c0

        for c in range(largo):
            cg = c0 + c
            ac = PROG[cg % 4]
            frase = c % 4
            ultimo = c == largo - 1
            gancho = nombre.startswith('gancho')

            # ── Coro (en todas las secciones) ──────────────────────────────────
            if nombre == 'build':
                # Barrido de cutoff 600 → 1400 Hz en 2 compases
                t_frac = (c + 0.5) / 2.0
                co = int(600 + 800 * t_frac)
                ch = coro_sumergido(CORO_V[ac], COMPAS, co, 0.9)
            else:
                cutoff = CORO_CUTOFF[nombre]
                vel_coro = 0.7 if nombre == 'puente' else (1.0 if gancho else 0.85)
                if nombre == 'final':
                    vel_coro *= 1.15
                ch = coro_sumergido(CORO_V[ac], COMPAS, cutoff, vel_coro)
                # Puente: gate rítmico — pulsa en tiempos 1 y 3, se apaga en 2 y 4
                if nombre == 'puente':
                    gate_len = ch.shape[1]
                    gate = np.ones(gate_len)
                    step = int(BEAT * SR)
                    for b in range(4):
                        if b % 2 == 1:
                            s0 = b * step
                            s1 = min(gate_len, s0 + step)
                            seg = s1 - s0
                            fade = min(int(0.02 * SR), seg // 4)
                            if fade > 0 and seg > 2 * fade:
                                gate[s0:s0 + fade] = np.linspace(1, 0.15, fade)
                                gate[s0 + fade:s1 - fade] = 0.15
                                gate[s1 - fade:s1] = np.linspace(0.15, 1, fade)
                    ch *= gate
            poner(bus['coro'], ch, paso(cg, 0, False))

            # ── Lead ───────────────────────────────────────────────────────────
            if nombre in ('ganchoA', 'ganchoB', 'ganchoC'):
                fr = LEAD_C if nombre == 'ganchoC' else LEAD_HOOK
                previa = None
                for (s, nota, l) in fr[frase]:
                    m = n(nota)
                    x = lead_banco(m, l * S16 * 0.95, previa if previa and abs(previa - m) <= 5 else None)
                    poner(bus['lead'], paneo(x, -0.15), paso(cg, s) + hum(0.003))
                    previa = m

            # ── Batería ────────────────────────────────────────────────────────
            con_bateria = nombre in ('ganchoA', 'verso', 'ganchoB', 'puente', 'ganchoC')
            if con_bateria:
                # Bombo
                if nombre == 'verso':
                    kicks = [0, 10] if frase != 3 else [0, 10, 14]
                elif nombre == 'puente':
                    kicks = [0, 6, 12] if frase % 2 == 0 else [0, 4, 10]          # tresillo
                else:
                    kicks = [0, 7, 10] if frase != 3 else [0, 7, 10, 15]
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.9, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.2) * 16)[None], paso(cg, s, False))

                # Caja en el tercer tiempo; clap encima en ganchos B y C
                t_snare = paso(cg, 8, False) + hum(0.002)
                poner(bus['drums'], paneo(SN, 0.04) * 0.7, t_snare)
                if nombre in ('ganchoB', 'ganchoC'):
                    poner(bus['drums'], paneo(CL, -0.06) * 0.4, t_snare)

                # Hi-hats
                if nombre == 'puente':
                    for k in range(12):                                           # tresillos
                        vel = 0.75 if k % 3 == 0 else 0.4
                        poner(bus['drums'], paneo(H * vel, 0.3), cg * COMPAS + k * COMPAS / 12 + hum(0.002))
                else:
                    paso_h = 2 if nombre == 'verso' else 1                        # corcheas en verso, semicorcheas en ganchos
                    redoble = frase == 3 and nombre != 'verso'
                    for s in range(0, 16, paso_h):
                        if redoble and s >= 12:
                            break
                        acento = [1.0, 0.35, 0.6, 0.35][s % 4]
                        poner(bus['drums'], paneo(H * acento * (1 - rng.uniform(0, 0.18)), 0.3), paso(cg, s) + hum(0.002))
                    if redoble:
                        for j in range(8):
                            r = 1 + j * 0.04
                            poner(bus['drums'], paneo(repitch(H, r) * (0.4 + 0.5 * j / 8), 0.3),
                                  cg * COMPAS + 12 * S16 + j * S16 / 2)
                    # Hat abierto a contratiempo
                    if frase in (1, 3) and nombre != 'verso':
                        ho = HO[:int(2 * S16 * SR)].copy()
                        ho[-300:] *= np.linspace(1, 0, 300)
                        poner(bus['drums'], paneo(ho, -0.25) * 0.75, paso(cg, 6))

                # Shaker (no en puente, que tiene hats tresillo)
                if nombre != 'puente':
                    for s in range(2, 16, 4):
                        poner(bus['drums'], paneo(SH, -0.4), paso(cg, s))

            # Intro: percusión mínima (rim + shaker como latido)
            if nombre == 'intro':
                for s in [0, 8]:
                    poner(bus['drums'], paneo(RI, 0.35) * 0.5, paso(cg, s))
                for s in [4, 12]:
                    poner(bus['drums'], paneo(SH, -0.3) * 0.4, paso(cg, s))

            # ── 808 ───────────────────────────────────────────────────────────
            if nombre in ('ganchoA', 'verso', 'ganchoB', 'puente', 'ganchoC'):
                r = n(RAIZ808[ac])
                if nombre == 'verso':
                    patron = [(0, 0, 3), (10, 0, 3)] if frase != 3 else [(0, 0, 3), (10, 0, 2), (14, 12, 2)]
                elif nombre == 'puente':
                    patron = [(0, 0, 5), (6, 12, 3), (10, 0, 6)]
                else:
                    patron = [(0, 0, 3), (3, 0, 2), (7, 12, 2), (10, 0, 4)]
                    if frase == 3:
                        patron = patron[:3] + [(10, 0, 3), (14, 7, 2)]           # nota de paso al siguiente acorde
                for s, intervalo, l in patron:
                    glide = 0.1 if (s == 0 and frase == 0 and c > 0) or (nombre == 'puente' and s == 6) else 0
                    notas808.append((paso(cg, s, False), r + intervalo, l * S16, glide))
        c0 += largo

    T = lambda comp: comp * COMPAS

    # ── Momentos puntuales ──────────────────────────────────────────────────
    # Build: redoble de caja que acelera (corcheas → semicorcheas → fusas)
    b0 = ini['build']
    tiempos = ([T(b0) + k * BEAT / 2 for k in range(4)]
               + [T(b0) + 2 * BEAT + k * S16 for k in range(8)]
               + [T(b0 + 1) + k * S16 / 2 for k in range(16)])
    for j, tt in enumerate(tiempos):
        if tt < T(b0 + 2) - BEAT * 0.3:
            poner(bus['drums'], paneo(repitch(SN, 1 + j * 0.01), 0) * (0.25 + 0.55 * j / len(tiempos)), tt)

    # Platillo invertido antes de cada gancho
    for g in ('ganchoA', 'ganchoB', 'ganchoC'):
        pc = platillo_inv(BEAT * 3)
        poner(bus['fx'], pc, T(ini[g]) - pc.shape[1] / SR)

    # 808
    if notas808:
        b = ochocientos(notas808, N / SR, 2.2)
        bus['bajo'] += paneo(lp(b, 4200), 0)

    # ── Mezcla ──────────────────────────────────────────────────────────────
    coro_bus = con_reverb(bus['coro'] * (1 - 0.2 * np.clip(sc, 0, 1)), ir, 0.35)
    lead_bus = hp(bus['lead'], 250)
    lead_bus = lp(lead_bus, 5500)
    lead_bus = saturar(lead_bus, 0.25)
    lead_bus = con_reverb(delay_pingpong(lead_bus * (1 - 0.15 * np.clip(sc, 0, 1)),
                                         BEAT * 0.75, 0.3, 0.2), ir, 0.25)
    drums_bus = con_reverb(saturar(bus['drums'], 0.12), ir_sala, 0.07)
    bajo_bus = bus['bajo'] * (1 - 0.25 * np.clip(sc, 0, 1))

    mix = drums_bus * 1.0 + bajo_bus * 0.85 + coro_bus * 1.1 + lead_bus * 1.0 + bus['fx']

    # Build: el último medio tiempo es silencio (para que el gancho B pegue)
    s0 = int((T(ini['build'] + 2) - BEAT * 0.4) * SR)
    s1 = int(T(ini['build'] + 2) * SR)
    if s0 < mix.shape[1] and s1 <= mix.shape[1]:
        mix[:, s0:s1] *= 0.05

    # Ganancia por sección: intro y final necesitan boost (solo coro); build baja para que el gancho B pegue
    g_sec = np.ones(mix.shape[1])
    for nombre_s, valor in (('intro', 2.5), ('final', 2.5), ('build', 0.7)):
        largo_s = dict(SECCIONES)[nombre_s]
        a_, b_ = int(T(ini[nombre_s]) * SR), min(mix.shape[1], int(T(ini[nombre_s] + largo_s) * SR))
        g_sec[a_:b_] = valor
    g_sec = lp(g_sec, 3)
    mix = mix * g_sec

    mix = hp(mix, 28)
    mix = mix / (np.percentile(np.abs(mix), 99.95) + 1e-9) * 0.85
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    mix /= np.abs(mix).max() + 1e-9

    fin_i = int((total * COMPAS + 2.5) * SR)
    mix = mix[:, :fin_i]
    mix[:, -int(1.5 * SR):] *= np.linspace(1, 0, int(1.5 * SR))
    return (mix * 0.95).T


if __name__ == '__main__':
    out = os.path.join(RAIZ, 'fuentes', 'beats', 'salida', 'diario')
    os.makedirs(out, exist_ok=True)
    f = os.path.join(out, '2026-10-15-1.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.1f} s')
