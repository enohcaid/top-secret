"""VUELTA — tema del día (2026-10-16-2)

Concepto: Volver después de una lesión — meses mirando desde afuera, el cuerpo que no
responde, el timing perdido; pero el músculo recuerda, y cuando la pelota vuelve a
sentirse bien en el pie, estás en casa.

Emoción por sección:
  intro (4)    — el vestuario vacío, el latido nervioso antes de pisar la cancha
  verso A (8)  — primeros pasos, el cuerpo duele, el timing está desfasado
  gancho A (8) — el juego empieza a fluir, las piernas recuerdan
  build (2)    — el cuerpo pide parar, ¿aguantás?
  gancho B (8) — confianza, todo vuelve, el equipo te pasa la pelota
  puente (4)   — un momento de quietud, sentís la cancha debajo de los pies
  verso B (4)  — último esfuerzo, el dolor quedó atrás
  gancho C (8) — plenitud: el latido y el beat son uno, estás de vuelta
  final (4)    — el latido sigue, pero ya no late solo

Rasgo distintivo: LATIDO DESINCRONIZADO — pulso grave de corazón (doble golpe lub-dub)
que arranca fuera de la grilla rítmica del beat y se alinea sección a sección hasta
trabar perfectamente con el kick en el gancho C — el momento en que el jugador vuelve
a estar en ritmo.

Estructura (50 compases, 134 BPM, mi menor):
  intro 4 · verso A 8 · gancho A 8 · build 2 · gancho B 8 · puente 4 ·
  verso B 4 · gancho C 8 · final 4

Recursos: latido desincronizado con convergencia rítmica (firma del tema), lead renacido
que muta de pluck rígido a lead sostenido con vibrato, pad cuerpo de triángulos que se
ensancha sección a sección, 808 melódico con saltos de octava, platillo invertido en las
transiciones.

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_16_2.py
Salida: fuentes/beats/salida/diario/2026-10-16-2.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch,  # noqa: E402
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar, ochocientos)

BPM = 134
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.13 * S16
rng = np.random.default_rng(202610162)
NOMBRES = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6,
           'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOMBRES[nombre[:-1]]


ESCALA = {4, 6, 7, 9, 11, 0, 2}              # mi menor natural: E F# G A B C D


def tercera_abajo(m):
    return m - 3 if (m - 3) % 12 in ESCALA else m - 4


def paso(c, s, swing_on=True):
    return c * COMPAS + s * S16 + (SWING if swing_on and s % 2 == 1 else 0)


# ── Armonía (mi menor: i9 → VImaj7 → IIImaj7 → VII7) ──────────────────────
ACORDES = {
    'Em9':   ['E3', 'G3', 'B3', 'D4', 'F#4'],
    'Cmaj7': ['C3', 'E3', 'G3', 'B3'],
    'Gmaj7': ['G3', 'B3', 'D4', 'F#4'],
    'D7':    ['D3', 'F#3', 'A3', 'C4'],
}
RAIZ808 = {'Em9': 'E1', 'Cmaj7': 'C2', 'Gmaj7': 'G1', 'D7': 'D2'}
PROG = ['Em9', 'Cmaj7', 'Gmaj7', 'D7']

# ── Melodías ───────────────────────────────────────────────────────────────
# Verso: fragmentado, tímido (se repite 2× en versoA)
VERSO_MEL = [
    [(0, 'E4', 2), (4, 'G4', 2), (10, 'B4', 2)],                           # Em9
    [(0, 'A4', 3), (4, 'G4', 2), (8, 'E4', 4)],                            # Cmaj7
    [(0, 'G4', 2), (3, 'A4', 1), (4, 'B4', 3), (10, 'A4', 2)],             # Gmaj7
    [(0, 'G4', 2), (4, 'F#4', 4)],                                          # D7
]
# Gancho A: llamada y respuesta, más seguro
LEAD_A = [
    [(0, 'B4', 2), (3, 'D5', 1), (4, 'E5', 3), (8, 'D5', 2), (10, 'B4', 2), (12, 'D5', 4)],
    [(0, 'C5', 2), (3, 'B4', 1), (4, 'A4', 2), (8, 'G4', 4)],
    [(0, 'D5', 3), (4, 'E5', 2), (7, 'F#5', 1), (8, 'E5', 3), (12, 'D5', 4)],
    [(0, 'C5', 2), (3, 'B4', 1), (4, 'A4', 2), (8, 'B4', 6)],
]
# Gancho C: registro alto, triunfal, plenitud
LEAD_C = [
    [(0, 'E5', 3), (4, 'F#5', 2), (7, 'G5', 1), (8, 'F#5', 2), (10, 'E5', 2), (12, 'D5', 4)],
    [(0, 'E5', 2), (3, 'D5', 1), (4, 'B4', 2), (8, 'D5', 4)],
    [(0, 'D5', 2), (3, 'E5', 1), (4, 'F#5', 4), (8, 'E5', 2), (10, 'D5', 2), (12, 'B4', 4)],
    [(0, 'C5', 2), (3, 'D5', 1), (4, 'E5', 2), (8, 'F#5', 6)],
]

SECCIONES = [
    ('intro', 4), ('versoA', 8), ('ganchoA', 8), ('build', 2),
    ('ganchoB', 8), ('puente', 4), ('versoB', 4), ('ganchoC', 8), ('final', 4),
]

# Offset del latido en fracción de BEAT: la narrativa central del tema
LATIDO_OFFSET = {
    'intro': 0.13, 'versoA': 0.10, 'ganchoA': 0.065,
    'build': 0.04, 'ganchoB': 0.025, 'puente': 0.055,
    'versoB': 0.015, 'ganchoC': 0.0, 'final': 0.0,
}
# Rigidez del lead: 1.0 = pluck corto y rígido, 0.0 = lead sostenido con vibrato
RIGIDEZ = {
    'intro': 1.0, 'versoA': 0.9, 'ganchoA': 0.6,
    'build': 0.45, 'ganchoB': 0.3, 'puente': 0.5,
    'versoB': 0.15, 'ganchoC': 0.0, 'final': 0.0,
}
# Plenitud del pad (0-1): controla detuning y brillo
PAD_FULL = {
    'intro': 0.2, 'versoA': 0.35, 'ganchoA': 0.55,
    'build': 0.45, 'ganchoB': 0.7, 'puente': 0.5,
    'versoB': 0.75, 'ganchoC': 1.0, 'final': 0.7,
}


# ── Instrumentos del tema ──────────────────────────────────────────────────
def latido():
    """Heartbeat: double sine pulse (lub-dub), warm sub-bass felt more than heard."""
    t = t_arr(0.6)
    # Lub: deep, pitch drops
    lub_f = 52 * (1 + 0.2 * np.exp(-t * 15))
    lub = np.sin(2 * np.pi * np.cumsum(lub_f) / SR) * np.exp(-t * 6.5)
    lub_click = np.sin(2 * np.pi * 115 * t) * np.exp(-t * 42) * 0.3
    # Dub: higher, shorter, 0.18s after lub
    d = 0.18
    t2 = np.maximum(t - d, 0)
    mask = (t >= d).astype(float)
    dub = np.sin(2 * np.pi * 68 * t2) * np.exp(-t2 * 11) * 0.45 * mask
    dub_click = np.sin(2 * np.pi * 135 * t2) * np.exp(-t2 * 48) * 0.18 * mask
    return lp(lub + lub_click + dub + dub_click, 190) * 0.5


def lead_renacido(m, dur, rigidez=0.5, desde=None):
    """Lead that morphs from stiff pluck (rigidez=1) to fluid sustained (rigidez=0)."""
    t = t_arr(dur + 0.5)
    f = np.full(len(t), hz(m), dtype=float)
    if desde is not None:
        g = min(len(t), int((0.015 + 0.065 * (1 - rigidez)) * SR))
        if g > 0:
            f[:g] *= (hz(desde) / hz(m)) ** (1 - np.arange(g) / g)
    vib_d = 0.0015 + 0.006 * (1 - rigidez)
    vib_on = 0.35 * rigidez + 0.08 * (1 - rigidez)
    f *= 1 + vib_d * np.sin(2 * np.pi * 5.3 * t) * np.clip((t - vib_on) * 4, 0, 1)
    ph = np.cumsum(f) / SR
    # Rigid = more sine (simple), fluid = more saw (rich harmonics)
    x = np.sin(2 * np.pi * ph) * (0.4 + 0.2 * rigidez)
    x += (2 * (ph - np.floor(ph + 0.5))) * (0.15 + 0.35 * (1 - rigidez))
    x = lp(x, 1800 + 2500 * (1 - rigidez))
    a = 0.003 + 0.035 * (1 - rigidez)
    dd = 0.06 + 0.2 * (1 - rigidez)
    s = 0.25 + 0.5 * (1 - rigidez)
    r = 0.04 + 0.3 * (1 - rigidez)
    return x * env_adsr(len(t), a, dd, s, r, dur) * 0.23


def pad_cuerpo(notas_midi, dur, fullness=0.5):
    """Triangle-voice pad that thickens with fullness: the body warming up."""
    t = t_arr(dur + 1.5)
    out = np.zeros((2, len(t)))
    voces = 7
    for m_note in notas_midi:
        for v in range(voces):
            det = (v - (voces - 1) / 2) * 0.002 * (0.3 + 0.7 * fullness)
            f_mod = 0.3 + v * 0.15
            f_inst = hz(m_note) * (1 + det + 0.003 * fullness * np.sin(2 * np.pi * f_mod * t))
            ph = np.cumsum(f_inst) / SR
            tri = 2 * np.abs(2 * (ph - np.floor(ph + 0.5))) - 1
            out += paneo(tri / voces, (v - (voces - 1) / 2) / voces * 1.2)
    brillo = 900 + 1800 * fullness
    e = env_adsr(len(t), 0.5 + 0.3 * (1 - fullness), 0.5,
                 0.7 + 0.15 * fullness, 1.2, dur)
    return lp(out, brillo) * e * 0.12 * (0.5 + 0.5 * fullness)


def bombo_vuelta():
    """Kick with long sub tail: the ground under the feet."""
    t = t_arr(0.5)
    sub = np.sin(2 * np.pi * np.cumsum(45 + 16 * np.exp(-t * 18)) / SR) * np.exp(-t * 5)
    punch = np.sin(2 * np.pi * np.cumsum(65 + 130 * np.exp(-t * 55)) / SR) * np.exp(-t * 26)
    click = hp(rng.standard_normal(len(t)), 2800) * np.exp(-t * 350) * 0.45
    return np.tanh((sub * 0.85 + punch * 0.8 + click) * 1.4)


def snare_vuelta():
    """Rimshot-like snare: tonal with metallic ring."""
    t = t_arr(0.3)
    cuerpo = np.sin(2 * np.pi * 200 * t) * np.exp(-t * 20)
    reson = np.sin(2 * np.pi * 385 * t) * np.exp(-t * 13) * 0.45
    ruido = bp(rng.standard_normal(len(t)), 2000, 8000) * np.exp(-t * 18)
    return np.tanh((cuerpo * 0.65 + reson + ruido * 0.55) * 1.3)


def hat_vuelta(abierto=False):
    """Clean thin hi-hat."""
    t = t_arr(0.35 if abierto else 0.06)
    x = sum(np.sign(np.sin(2 * np.pi * f * t))
            for f in (220.3, 315.8, 392.0, 542.1, 570.5, 845.2))
    x = hp(bp(x, 7000, 15000), 7800) * np.exp(-t * (8 if abierto else 62))
    return x * 0.19


def platillo_inv(dur):
    """Reverse cymbal swell for transitions."""
    t = t_arr(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * 1.65 * t))
            for f in (208.0, 312.6, 380.0, 528.5, 550.3, 818.0))
    x = hp(x + rng.standard_normal(len(t)) * 1.8, 4500) * np.exp(-t * 2.0)
    x = x[::-1]
    return np.stack([x, np.roll(x, 350)]) * 0.065


# ── Composición ────────────────────────────────────────────────────────────
def render():
    total = sum(c for _, c in SECCIONES)
    N = int((total * COMPAS + 5) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'pad', 'lead', 'latido', 'fx']}
    sc = np.zeros(N)

    K, SN = bombo_vuelta(), snare_vuelta()
    H, HO = hat_vuelta(), hat_vuelta(True)
    LAT = latido()
    ir_grande = reverb_ir(dur=3.0, decay=2.5, brillo=5000, seed=10162)
    ir_sala = reverb_ir(dur=0.65, decay=6.0, brillo=8000, seed=10163)
    ir_lead = reverb_ir(dur=2.0, brillo=5800, seed=10164)
    notas808 = []
    ini = {}
    c0 = 0
    hum = lambda s=0.004: rng.normal(0, s)

    for nombre, largo in SECCIONES:
        ini[nombre] = c0
        rig = RIGIDEZ[nombre]
        full = PAD_FULL[nombre]
        lat_off = LATIDO_OFFSET[nombre] * BEAT

        for c in range(largo):
            cg = c0 + c
            ac = PROG[cg % 4]
            frase = cg % 4
            ultimo = c == largo - 1
            gancho = nombre.startswith('gancho')
            verso = nombre.startswith('verso')

            # ── Latido: beats 1 y 3, desplazado de la grilla ──
            for beat_pos in [0, 8]:
                vol = 0.55 if nombre in ('intro', 'final') else (0.95 if gancho else 0.7)
                poner(bus['latido'], paneo(LAT * vol, 0),
                      paso(cg, beat_pos, False) + lat_off)

            # ── Pad ──
            if nombre != 'build':
                notas_pad = [n(x) for x in ACORDES[ac]]
                poner(bus['pad'], pad_cuerpo(notas_pad, COMPAS, full),
                      paso(cg, 0, False))

            # ── Lead ──
            if gancho or verso:
                if nombre == 'ganchoC':
                    fr, mel_f = LEAD_C, frase
                elif gancho:
                    fr, mel_f = LEAD_A, frase
                else:
                    fr, mel_f = VERSO_MEL, c % len(VERSO_MEL)
                oct_ = -12 if nombre == 'versoB' else 0
                previa = None
                for (s, nota, l) in fr[mel_f]:
                    m = n(nota) + oct_
                    x = lead_renacido(m, l * S16 * 0.95, rig,
                                      previa if previa and abs(previa - m) <= 5 else None)
                    poner(bus['lead'], paneo(x, -0.1 + 0.07 * ((s // 4) % 3 - 1)),
                          paso(cg, s) + hum(0.003))
                    previa = m
                # Gancho B: contramelodía una tercera abajo en notas largas
                if nombre == 'ganchoB':
                    for (s, nota, l) in fr[mel_f]:
                        if l >= 3:
                            m = tercera_abajo(n(nota))
                            x = lead_renacido(m, l * S16 * 0.9, 0.35) * 0.4
                            poner(bus['lead'], paneo(x, 0.3),
                                  paso(cg, s) + S16 * 0.25)

            # ── Batería ──
            con_bat = nombre in ('versoA', 'ganchoA', 'ganchoB', 'versoB', 'ganchoC')
            if con_bat:
                kicks = ([0, 10] if frase != 3 else [0, 10, 14]) if verso \
                    else ([0, 6, 10] if frase != 3 else [0, 6, 10, 15])
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.9, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.2) * 15)[None], paso(cg, s, False))
                # Snare en beat 3 (medio tiempo)
                poner(bus['drums'], paneo(SN, 0.03) * (0.55 if verso else 0.75),
                      paso(cg, 8, False) + hum(0.002))
                # Ghost snares en ganchos B y C
                if nombre in ('ganchoB', 'ganchoC') and frase in (1, 3):
                    poner(bus['drums'], paneo(SN, -0.08) * 0.2,
                          paso(cg, 4) + hum(0.003))
                # Hi-hats
                if nombre in ('ganchoB', 'ganchoC'):
                    redoble = frase == 3 and ultimo
                    for s in range(16):
                        if redoble and s >= 12:
                            break
                        vel = [1.0, 0.35, 0.6, 0.35][s % 4]
                        poner(bus['drums'],
                              paneo(H * vel * (1 - rng.uniform(0, 0.15)), 0.3),
                              paso(cg, s) + hum(0.002))
                    if redoble:
                        for j in range(8):
                            poner(bus['drums'],
                                  paneo(repitch(H, 1 + j * 0.04) * (0.4 + 0.5 * j / 8),
                                        0.3),
                                  cg * COMPAS + 12 * S16 + j * S16 * 0.5)
                elif nombre == 'ganchoA':
                    for s in range(0, 16, 2):
                        vel = 0.75 if s % 4 == 0 else 0.45
                        poner(bus['drums'],
                              paneo(H * vel * (1 - rng.uniform(0, 0.12)), 0.3),
                              paso(cg, s) + hum(0.002))
                else:                                             # versos: hats en negras
                    for s in [0, 4, 8, 12]:
                        vel = 0.6 if s % 8 == 0 else 0.35
                        poner(bus['drums'], paneo(H * vel, 0.3),
                              paso(cg, s) + hum(0.002))
                # Hat abierto a contratiempo en ganchos
                if gancho and frase in (1, 3):
                    ho = HO[:int(2.5 * S16 * SR)].copy()
                    ho[-260:] *= np.linspace(1, 0, 260)
                    poner(bus['drums'], paneo(ho, -0.25) * 0.6, paso(cg, 6))

            # ── 808 ──
            if nombre in ('versoA', 'ganchoA', 'ganchoB', 'versoB', 'ganchoC', 'puente'):
                r808 = n(RAIZ808[ac])
                if nombre == 'puente':
                    pat808 = [(0, 0, 14)]
                elif verso:
                    pat808 = ([(0, 0, 5), (10, 0, 4)] if frase != 3
                              else [(0, 0, 5), (10, 0, 3), (14, 12, 2)])
                else:
                    pat808 = [(0, 0, 3), (4, 0, 2), (6, 12, 2), (10, 0, 4)]
                    if frase == 3:
                        pat808 = [(0, 0, 3), (4, 0, 2), (6, 12, 2),
                                  (10, 0, 3), (14, 7, 2)]
                for s, intervalo, l in pat808:
                    glide = (0.1 if s == 0 and frase == 0 and c > 0
                             and nombre != 'puente' else 0)
                    notas808.append((paso(cg, s, False), r808 + intervalo,
                                     l * S16, glide))
        c0 += largo

    T = lambda comp: comp * COMPAS                                # noqa: E731

    # ── FX: platillos invertidos antes de cada gancho ──
    for sec in ('ganchoA', 'ganchoB', 'ganchoC'):
        pi = platillo_inv(BEAT * 3.5)
        poner(bus['fx'], pi, T(ini[sec]) - pi.shape[1] / SR)

    # ── Build: redoble de snare que acelera ──
    b0 = ini['build']
    tiempos = ([b0 * COMPAS + k * BEAT for k in range(4)]
               + [b0 * COMPAS + 2 * BEAT + k * S16 for k in range(8)]
               + [(b0 + 1) * COMPAS + k * S16 / 2 for k in range(16)])
    for j, tt in enumerate(tiempos):
        if tt < T(b0 + 2) - BEAT * 0.3:
            poner(bus['drums'],
                  paneo(repitch(SN, 1 + j * 0.01), 0) * (0.2 + 0.55 * j / len(tiempos)),
                  tt)

    # ── 808 render ──
    if notas808:
        bus['bajo'] += paneo(lp(ochocientos(notas808, N / SR, 2.2), 4000), 0)

    # ── Mezcla ──────────────────────────────────────────────────────────────
    lat_mix = con_reverb(hp(bus['latido'], 30), ir_grande, 0.1)
    pad_mix = con_reverb(
        hp(lp(bus['pad'], 4000), 70) * (1 - 0.2 * np.clip(sc, 0, 1)),
        ir_grande, 0.22)
    lead_mix = con_reverb(
        delay_pingpong(lp(saturar(hp(bus['lead'], 220), 0.15), 7000),
                       BEAT * 0.75, 0.25, 0.17),
        ir_lead, 0.2)
    drums_mix = con_reverb(saturar(bus['drums'], 0.1), ir_sala, 0.07)
    bajo_mix = bus['bajo'] * (1 - 0.3 * np.clip(sc, 0, 1))

    mix = drums_mix + bajo_mix * 0.8 + lat_mix * 0.9 + pad_mix * 0.85 + lead_mix + bus['fx']

    # Build → silencio antes del gancho B
    corte_s = int((T(ini['build'] + 2) - BEAT * 0.25) * SR)
    b_s1 = min(mix.shape[1], int(T(ini['build'] + 2) * SR))
    if corte_s < b_s1 and b_s1 - corte_s > 0:
        mix[:, corte_s:b_s1] *= np.linspace(1, 0.03, b_s1 - corte_s)

    # Dinámica por sección
    g = np.ones(mix.shape[1])
    for nom_s, val in [('intro', 4.5), ('final', 3.8), ('puente', 1.4),
                        ('build', 0.65), ('versoA', 0.82), ('versoB', 0.82)]:
        largo_s = dict(SECCIONES)[nom_s]
        a_ = int(T(ini[nom_s]) * SR)
        b_ = min(mix.shape[1], int(T(ini[nom_s] + largo_s) * SR))
        g[a_:b_] = val
    g = lp(g, 2.5)
    mix *= g

    # Master
    mix = hp(mix, 28)
    mix = mix / (np.percentile(np.abs(mix), 99.95) + 1e-9) * 0.85
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    mix /= np.abs(mix).max() + 1e-9
    fin_i = int((total * COMPAS + 2.5) * SR)
    mix = mix[:, :fin_i]
    mix[:, -int(2.0 * SR):] *= np.linspace(1, 0, int(2.0 * SR))
    return (mix * 0.95).T


if __name__ == '__main__':
    out = os.path.join(RAIZ, 'fuentes', 'beats', 'salida', 'diario')
    os.makedirs(out, exist_ok=True)
    f = os.path.join(out, '2026-10-16-2.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.1f} s')
