"""SOMBRA — tema del día 2026-10-23-1

Concepto: El jugador que siempre juega a la sombra de otro — hacés el trabajo sucio
para que la estrella brille, nadie canta tu nombre, pero la estrella sabe; sección a
sección la sombra se acerca hasta que en el gancho C sale a la luz.

Emoción por sección:
  intro — piano solo, aislado: el trabajo invisible antes de que empiece el partido
  verso — ritmo firme, piano + pad + 808: la rutina del que corre sin que lo miren
  gancho A — lead estrella + sombra 1 beat atrás y baja: la estrella brilla por primera vez
  build — filtro que sube, redoble: algo cambia
  gancho B — lead estrella + sombra medio beat atrás, más fuerte: se está acercando
  puente — solo la sombra, tresillos: por primera vez la sombra suena sin la estrella
  gancho C — ambos leads simultáneos al mismo nivel: la sombra salió de atrás
  final — dos pianos en unísono: la estrella y la sombra como iguales

Rasgo distintivo: sombra que sigue — un eco del lead retrasado y oscurecido que persigue
al principal; se acerca sección a sección (1 beat → ½ beat → simultáneo) y sube de
volumen y brillo hasta que en el gancho C suena igual — la sombra se reveló.

Estructura (46 compases, 112 BPM, la menor):
  intro 4 · verso 8 · gancho A 8 · build 2 · gancho B 8 · puente 4 · gancho C 8 · final 4
  ~101 s

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_23_1.py
Salida: fuentes/beats/salida/diario/2026-10-23-1.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch,
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar, ochocientos, clap)

BPM = 112
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.14 * S16
rng = np.random.default_rng(20261023)
NOMBRES = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
           'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOMBRES[nombre[:-1]]


# ── Armonía (la menor natural: A B C D E F G) ───────────────────────────────
PROG = ['Am', 'Dm', 'F', 'Em']

PIANO_V = {
    'Am': ['A3', 'E4', 'A4', 'C5'],
    'Dm': ['D3', 'A3', 'D4', 'F4'],
    'F':  ['F3', 'C4', 'F4', 'A4'],
    'Em': ['E3', 'B3', 'E4', 'G4'],
}
PAD_V = {
    'Am': ['A3', 'C4', 'E4'],
    'Dm': ['D4', 'F4', 'A4'],
    'F':  ['C4', 'F4', 'A4'],
    'Em': ['E4', 'G4', 'B4'],
}
RAIZ808 = {'Am': 'A1', 'Dm': 'D2', 'F': 'F1', 'Em': 'E2'}

# ── Melodías (escritas a mano) ───────────────────────────────────────────────
# Lead: 8 compases (4 llamada + 4 respuesta), (paso_en_16avos, nota, largo_en_16avos)
LEAD = [
    # Llamada
    [(0, 'E5', 3), (4, 'D5', 2), (8, 'C5', 3), (12, 'E5', 3)],
    [(0, 'D5', 3), (4, 'F5', 2), (7, 'E5', 1), (8, 'D5', 5)],
    [(0, 'C5', 2), (3, 'E5', 2), (6, 'F5', 3), (10, 'E5', 2), (13, 'C5', 3)],
    [(0, 'B4', 3), (4, 'D5', 2), (8, 'E5', 5)],
    # Respuesta
    [(0, 'A4', 2), (3, 'C5', 2), (6, 'E5', 3), (10, 'D5', 2), (13, 'C5', 3)],
    [(0, 'F5', 3), (4, 'E5', 2), (7, 'D5', 1), (8, 'A4', 6)],
    [(0, 'A4', 3), (4, 'C5', 2), (7, 'E5', 3), (11, 'C5', 2), (14, 'A4', 2)],
    [(0, 'G4', 3), (4, 'B4', 2), (8, 'A4', 6)],
]

# Gancho C: registro más alto, más confiado
LEAD_C = [
    [(0, 'A5', 3), (4, 'G5', 2), (7, 'E5', 1), (8, 'F5', 5)],
    [(0, 'D5', 4), (5, 'F5', 3), (9, 'E5', 5)],
    [(0, 'C5', 2), (3, 'E5', 2), (6, 'G5', 3), (10, 'F5', 2), (13, 'E5', 3)],
    [(0, 'D5', 3), (4, 'E5', 4), (9, 'A5', 3), (13, 'G5', 3)],
    [(0, 'E5', 3), (4, 'G5', 2), (7, 'A5', 3), (11, 'G5', 2), (14, 'E5', 2)],
    [(0, 'F5', 4), (5, 'E5', 3), (9, 'D5', 5)],
    [(0, 'C5', 3), (4, 'E5', 2), (7, 'F5', 4), (12, 'E5', 2), (15, 'C5', 1)],
    [(0, 'B4', 2), (3, 'D5', 3), (7, 'E5', 4), (12, 'A4', 4)],
]

# Melodía del piano (verso/intro): notas sueltas sobre los acordes
PIANO_MEL = [
    [(0, 'A4', 6), (8, 'E4', 4), (14, 'C5', 2)],
    [(0, 'D5', 4), (6, 'F4', 4), (12, 'A4', 4)],
    [(0, 'C5', 4), (6, 'A4', 3), (10, 'F4', 6)],
    [(0, 'B4', 5), (7, 'E4', 4), (13, 'G4', 3)],
    [(0, 'C5', 3), (4, 'A4', 4), (10, 'E5', 4)],
    [(0, 'D5', 6), (8, 'A4', 4)],
    [(0, 'A4', 3), (4, 'F5', 4), (10, 'C5', 4)],
    [(0, 'G4', 6), (8, 'B4', 3), (12, 'A4', 4)],
]

SECCIONES = [('intro', 4), ('verso', 8), ('ganchoA', 8), ('build', 2),
             ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 4)]

# Parámetros de la sombra: delay, volumen, corte LP
SHADOW = {
    'ganchoA': {'delay': BEAT, 'vol': 0.35, 'lp': 1500},
    'ganchoB': {'delay': BEAT / 2, 'vol': 0.6, 'lp': 2500},
    'puente':  {'delay': 0, 'vol': 0.8, 'lp': 3500},
    'ganchoC': {'delay': 0, 'vol': 1.0, 'lp': 8000},
}


# ── Instrumentos de este tema ────────────────────────────────────────────────
def piano_trabajo(m, dur, vel=1.0):
    """Piano oscuro con cuerpo: el instrumento del trabajo invisible."""
    t = t_arr(dur + 1.0)
    f = hz(m)
    x = sum(np.sin(2 * np.pi * f * h * t * (1 + 0.0003 * h * h))
            * np.exp(-t * (1.0 + h * 0.8)) / h for h in range(1, 8))
    x += 0.12 * rng.standard_normal(len(t)) * np.exp(-t * 120)
    e = env_adsr(len(t), 0.005, 0.3, 0.35, 0.6, dur)
    return lp(x, 3200) * e * 0.3 * vel


def lead_estrella(m, dur, desde=None):
    """Lead brillante: sierra + fundamental + detuneado sutil."""
    t = t_arr(dur + 0.35)
    f = np.full(len(t), hz(m))
    if desde is not None:
        g = min(len(t), int(0.055 * SR))
        f[:g] *= (hz(desde) / hz(m)) ** (1 - np.arange(g) / g)
    f *= 1 + 0.005 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.15) * 4, 0, 1)
    ph = np.cumsum(f) / SR
    x = (2 * (ph - np.floor(ph + 0.5))) * 0.55
    x += np.sin(2 * np.pi * ph) * 0.35
    x += saw(hz(m), t, 0.007) * 0.1
    x = lp(x, 5500)
    e = env_adsr(len(t), 0.008, 0.12, 0.6, 0.18, dur)
    return x * e * 0.22


def pad_cuerdas(notas_midi, dur, brillo=2000):
    """Triángulos detuneados: cuerdas sutiles."""
    t = t_arr(dur + 1.5)
    out = np.zeros((2, len(t)))
    for m in notas_midi:
        for v in range(4):
            det = (v - 1.5) * 0.004
            f = hz(m) * (1 + det)
            ph = f * t
            tri = 4 * np.abs((ph + 0.25) % 1 - 0.5) - 1
            out += paneo(tri / 4, (v - 1.5) / 3 * 0.8)
    e = env_adsr(len(t), 0.5, 0.5, 0.75, 1.2, dur)
    return lp(out, brillo) * e * 0.1


def bombo_capas():
    t = t_arr(0.45)
    sub = np.sin(2 * np.pi * np.cumsum(44 + 16 * np.exp(-t * 22)) / SR) * np.exp(-t * 5.5)
    punch = np.sin(2 * np.pi * np.cumsum(55 + 150 * np.exp(-t * 65)) / SR) * np.exp(-t * 30)
    click = hp(rng.standard_normal(len(t)), 3500) * np.exp(-t * 450) * 0.5
    return np.tanh((sub * 0.8 + punch * 0.85 + click) * 1.5)


def redoblante():
    t = t_arr(0.35)
    cuerpo = (np.sin(2 * np.pi * 195 * t) + 0.4 * np.sin(2 * np.pi * 340 * t)) * np.exp(-t * 20)
    ruido = bp(rng.standard_normal(len(t)), 1800, 9500) * np.exp(-t * 14)
    return np.tanh((cuerpo * 0.65 + ruido * 0.85) * 1.4)


def hat_metal(abierto=False):
    t = t_arr(0.35 if abierto else 0.07)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (210.5, 298.3, 375.2, 518.4, 545.1, 812.3))
    x = hp(bp(x, 6500, 14500), 7500) * np.exp(-t * (10 if abierto else 60))
    return x * 0.2


def shaker_hit():
    t = t_arr(0.08)
    return hp(rng.standard_normal(len(t)), 5500) * np.minimum(t / 0.01, 1) * np.exp(-t * 50) * 0.16


def platillo_inv(dur):
    t = t_arr(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * 1.65 * t)) for f in (210.5, 298.3, 375.2, 518.4, 545.1, 812.3))
    x = hp(x + rng.standard_normal(len(t)) * 2, 4500) * np.exp(-t * 2.0)
    x = x[::-1]
    return np.stack([x, np.roll(x, 350)]) * 0.065


# ── Utilidades ───────────────────────────────────────────────────────────────
def paso(c, s, swing=True):
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


def barrido_hp(st, t0, dur):
    i0, L = int(t0 * SR), int(dur * SR)
    L = min(L, st.shape[1] - i0)
    if L <= 0:
        return st
    seg = st[:, i0:i0 + L]
    cortes = [20, 300, 700, 1400, 2800, 4500]
    vers = [seg] + [hp(seg, c, 2) for c in cortes[1:]]
    pos = np.linspace(0, len(vers) - 1, L)
    out = np.zeros_like(seg)
    for k, v in enumerate(vers):
        w = np.clip(1 - np.abs(pos - k), 0, 1)
        out += v * w
    st[:, i0:i0 + L] = out
    return st


# ── Composición ──────────────────────────────────────────────────────────────
def render():
    total = sum(c for _, c in SECCIONES)          # 46 compases
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in
           ['drums', 'bajo', 'piano', 'pad', 'lead_star', 'lead_shadow', 'fx']}
    sc = np.zeros(N)

    K = bombo_capas()
    SN = redoblante()
    CL = clap()
    H = hat_metal()
    HO = hat_metal(True)
    SH = shaker_hit()
    ir = reverb_ir(dur=2.5, brillo=6500, seed=23)
    ir_sala = reverb_ir(dur=0.6, decay=8, brillo=7500, seed=24)
    notas808 = []
    ini = {}
    c0 = 0
    hum = lambda s=0.004: rng.normal(0, s)

    for nombre, largo in SECCIONES:
        ini[nombre] = c0
        for c in range(largo):
            cg = c0 + c                           # compás global
            ac = PROG[c % 4]
            frase = c % 8                          # para melodías de 8 compases
            frase4 = c % 4
            ultimo = c == largo - 1
            gancho = nombre.startswith('gancho')

            # ── Piano ─────────────────────────────────────────────────
            if nombre in ('intro', 'verso', 'final'):
                # Acordes (en la intro arrancan desde el compás 2)
                if nombre != 'intro' or c >= 2:
                    notas = [n(x) for x in PIANO_V[ac]]
                    vel_a = 0.65 if nombre == 'intro' else 0.85
                    for k, m in enumerate(notas):
                        poner(bus['piano'],
                              paneo(piano_trabajo(m, COMPAS * 0.85,
                                                  vel_a * (1 - rng.uniform(0, 0.1))),
                                    -0.15 + 0.1 * k),
                              paso(cg, 0, False) + k * 0.008 + hum())
                # Melodía
                if frase < len(PIANO_MEL):
                    vel_m = 0.5 if nombre == 'intro' else 0.7
                    for (s, nota, l) in PIANO_MEL[frase]:
                        poner(bus['piano'],
                              paneo(piano_trabajo(n(nota), l * S16, vel_m), 0.12),
                              paso(cg, s) + hum())
                # Final: segundo piano (la sombra), ligeramente desfasado
                if nombre == 'final' and frase < len(PIANO_MEL):
                    for (s, nota, l) in PIANO_MEL[frase]:
                        poner(bus['piano'],
                              paneo(piano_trabajo(n(nota), l * S16, 0.6), -0.25),
                              paso(cg, s) + S16 * 0.4 + hum())

            # ── Pad ───────────────────────────────────────────────────
            if nombre in ('verso', 'ganchoA', 'ganchoB', 'ganchoC'):
                brillo_p = 1500 if nombre == 'verso' else 2200
                poner(bus['pad'],
                      pad_cuerdas([n(x) for x in PAD_V[ac]], COMPAS, brillo_p),
                      paso(cg, 0, False))

            # ── Leads (estrella + sombra) ─────────────────────────────
            if nombre in SHADOW:
                sh = SHADOW[nombre]
                mel = LEAD_C if nombre == 'ganchoC' else LEAD
                has_star = nombre != 'puente'      # puente = sombra sola

                if frase < len(mel):
                    prev_s, prev_sh = None, None
                    for (s, nota, l) in mel[frase]:
                        m = n(nota)
                        # Estrella
                        if has_star:
                            x = lead_estrella(m, l * S16 * 0.95,
                                              prev_s if prev_s and abs(prev_s - m) <= 5 else None)
                            poner(bus['lead_star'], paneo(x, -0.12),
                                  paso(cg, s) + hum(0.003))
                            prev_s = m
                        # Sombra (filtrada, retrasada, más baja)
                        x_sh = lead_estrella(m, l * S16 * 0.95,
                                             prev_sh if prev_sh and abs(prev_sh - m) <= 5 else None)
                        x_sh = lp(x_sh, sh['lp'])
                        poner(bus['lead_shadow'], paneo(x_sh, 0.2) * sh['vol'],
                              paso(cg, s) + sh['delay'] + hum(0.003))
                        prev_sh = m

            # Verso: susurro de la sombra en el último compás (apenas perceptible)
            if nombre == 'verso' and c == largo - 1:
                x_hint = lead_estrella(n('E5'), BEAT * 1.5, None)
                x_hint = lp(x_hint, 1200)
                poner(bus['lead_shadow'], paneo(x_hint, 0.3) * 0.18,
                      paso(cg, 8) + hum(0.003))

            # ── Batería ───────────────────────────────────────────────
            con_bat = nombre in ('verso', 'ganchoA', 'ganchoB', 'puente', 'ganchoC')
            if con_bat:
                # Bombo
                if nombre == 'verso':
                    kicks = [0, 10] if frase4 != 3 else [0, 10, 14]
                elif nombre == 'puente':
                    kicks = [0, 6, 12] if frase4 % 2 == 0 else [0, 8]
                else:
                    kicks = [0, 6, 10] if frase4 != 3 else [0, 6, 10, 15]
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.92,
                          paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.2) * 15)[None],
                          paso(cg, s, False))

                # Redoblante en el 3er tiempo (medio tiempo); clap encima en ganchos
                golpe = paneo(SN, 0.04) * 0.72
                if gancho or nombre == 'puente':
                    golpe = golpe + paneo(CL, -0.06) * 0.4
                poner(bus['drums'], golpe, paso(cg, 8, False) + hum(0.002))

                # Hi-hats
                if nombre == 'puente':
                    # Tresillos para el beat switch
                    for k in range(12):
                        vel_h = 0.72 if k % 3 == 0 else 0.38
                        poner(bus['drums'], paneo(H * vel_h, 0.3),
                              cg * COMPAS + k * COMPAS / 12 + hum(0.002))
                else:
                    paso_h = 2 if nombre == 'verso' else 1
                    redoble = frase4 == 3 and nombre != 'verso'
                    for s in range(0, 16, paso_h):
                        if redoble and s >= 12:
                            break
                        acento = [1.0, 0.36, 0.6, 0.36][s % 4]
                        poner(bus['drums'],
                              paneo(H * acento * (1 - rng.uniform(0, 0.18)), 0.28),
                              paso(cg, s) + hum(0.002))
                    # Redoble al final de la frase de 4 compases
                    if redoble:
                        for j in range(6):
                            r = 1 + j * 0.04
                            poner(bus['drums'],
                                  paneo(repitch(H, r) * (0.4 + 0.5 * j / 6), 0.3),
                                  cg * COMPAS + 12 * S16 + j * BEAT / 6)
                    # Hat abierto a contratiempo
                    if frase4 in (1, 3) and nombre != 'verso':
                        ho_len = min(int(2.5 * S16 * SR), len(HO))
                        ho = HO[:ho_len].copy()
                        fade_n = min(250, ho_len)
                        ho[-fade_n:] *= np.linspace(1, 0, fade_n)
                        poner(bus['drums'], paneo(ho, -0.22) * 0.75, paso(cg, 6))

                # Shaker (no en el puente)
                if nombre != 'puente':
                    for s in range(2, 16, 4):
                        poner(bus['drums'], paneo(SH, -0.4), paso(cg, s))

            # ── 808 ──────────────────────────────────────────────────
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

    # ── FX de transición ─────────────────────────────────────────────────────
    for sec in ('ganchoA', 'ganchoB', 'ganchoC'):
        pc = platillo_inv(BEAT * 4)
        poner(bus['fx'], pc, T(ini[sec]) - pc.shape[1] / SR)

    # Build: redoble de redoblante acelerando
    b0 = ini['build']
    tiempos = ([b0 * COMPAS + k * BEAT / 2 for k in range(4)] +
               [b0 * COMPAS + 2 * BEAT + k * S16 for k in range(8)] +
               [(b0 + 1) * COMPAS + k * S16 / 2 for k in range(24)])
    for j, tt in enumerate(tiempos):
        if tt < T(b0 + 2) - BEAT * 0.5:
            poner(bus['drums'],
                  paneo(repitch(SN, 1 + j * 0.01), 0) * (0.25 + 0.55 * j / len(tiempos)),
                  tt)

    # 808
    if notas808:
        b = ochocientos(notas808, N / SR, 2.2)
        bus['bajo'] += paneo(lp(b, 4200), 0)

    # ── Mezcla ───────────────────────────────────────────────────────────────
    piano = hp(lp(bus['piano'], 7000), 150)
    piano = con_reverb(piano * (1 - 0.25 * np.clip(sc, 0, 1)), ir, 0.3)

    pad_b = hp(bus['pad'], 200)
    pad_b = con_reverb(pad_b * (1 - 0.2 * np.clip(sc, 0, 1)), ir, 0.35)

    star = hp(bus['lead_star'], 250)
    star = saturar(star, 0.2)
    star = delay_pingpong(star, BEAT * 0.75, 0.3, 0.2)
    star = con_reverb(star, ir, 0.22)

    shadow = hp(bus['lead_shadow'], 200)
    shadow = saturar(shadow, 0.15)
    shadow = delay_pingpong(shadow, BEAT * 0.5, 0.25, 0.18)
    shadow = con_reverb(shadow, ir, 0.35)          # más reverb (más lejos)

    drums = con_reverb(saturar(bus['drums'], 0.12), ir_sala, 0.07)

    bajo = bus['bajo'] * (1 - 0.25 * np.clip(sc, 0, 1))

    mix = (drums * 1.0 + bajo * 0.85 + piano * 0.95 + pad_b * 0.7 +
           star * 1.0 + shadow * 0.95 + bus['fx'])

    # Build: barrido de filtro HP que sube
    mix = barrido_hp(mix, T(ini['build']), COMPAS * 2 - BEAT * 0.5)
    s0 = int((T(ini['build'] + 2) - BEAT * 0.5) * SR)
    s1 = int(T(ini['build'] + 2) * SR)
    if s0 < s1 <= mix.shape[1]:
        mix[:, s0:s1] *= 0.05                      # silencio antes del drop

    # Dinámica por sección
    g = np.ones(mix.shape[1])
    for sec, val in [('intro', 3.0), ('final', 2.8), ('build', 0.65),
                     ('puente', 0.85), ('verso', 0.82)]:
        largo_s = dict(SECCIONES)[sec]
        a_ = int(T(ini[sec]) * SR)
        b_ = min(mix.shape[1], int(T(ini[sec] + largo_s) * SR))
        g[a_:b_] = val
    g = lp(g, 3)                                   # transiciones suaves
    mix = mix * g

    mix = hp(mix, 28)
    # Normalizar por percentil 99.95 (un ataque aislado no baja todo el tema)
    mix = mix / (np.percentile(np.abs(mix), 99.95) + 1e-9) * 0.85
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)     # master suave
    mix /= np.abs(mix).max() + 1e-9

    fin_i = int((total * COMPAS + 2.0) * SR)
    mix = mix[:, :fin_i]
    mix[:, -int(1.5 * SR):] *= np.linspace(1, 0, int(1.5 * SR))

    return (mix * 0.95).T


if __name__ == '__main__':
    out = os.path.join(RAIZ, 'fuentes', 'beats', 'salida', 'diario')
    os.makedirs(out, exist_ok=True)
    f = os.path.join(out, '2026-10-23-1.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.1f} s')
