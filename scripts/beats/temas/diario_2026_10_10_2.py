"""DEUDA — tema del día 2026-10-10-2.

Concepto: le debés una al equipo — te bancaron cuando no rendías, ahora te toca
a vos. El peso de lo que debés, el impulso para devolverlo, y el alivio cuando
finalmente lo hacés.

Emoción por sección:
  intro    — el peso: cuerda sola con reverb, pad distante — la deuda pesa
  gancho A — primer paso: drums y bajo, la cuerda lleva el tema — te ponés la 10
  verso    — el trabajo: sin cuerda, pad y drums — cabeza abajo, a moler
  build    — el momento: tensión ascendente, la cuerda redobla
  gancho B — la respuesta: un lead contesta a la cuerda — el equipo responde
  puente   — duda: solo pad y bajo — "¿alcanza?"
  gancho C — la deuda pagada: cuerda y lead juntos — jugaron juntos, ganaron juntos
  final    — la cuerda sola — pero ya no pesa

Rasgo distintivo: "cuerda oscura" — una cuerda pulsada sombría (sintetizada, tipo
  nylon) que lleva la melodía siempre aislada; cuando toca, las demás capas bajan.
  Encarna la deuda personal: un instrumento solo, una persona cargando el peso. En
  el gancho C, por primera vez suena acompañada — la deuda se paga en equipo.

Estructura (44 compases, 116 BPM, mi menor natural):
  intro 4 · gancho A 8 · verso 8 · build 2 · gancho B 8 · puente 4 · gancho C 8 · final 2

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_10_2.py
Salida: fuentes/beats/salida/diario/2026-10-10-2.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch,  # noqa: E402
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar, cinta,
                      ochocientos, vox)

BPM = 116
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.14 * S16
rng = np.random.default_rng(10102)
NOMBRES = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
           'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOMBRES[nombre[:-1]]


# ── Armonía (mi menor natural: E F# G A B C D) ─────────────────────────────
ACORDES = {
    'Em9':   ['E3', 'B3', 'D4', 'F#4', 'G4'],
    'Cmaj7': ['C3', 'G3', 'B3', 'E4'],
    'Am7':   ['A2', 'E3', 'G3', 'C4'],
    'Bm':    ['B2', 'F#3', 'B3', 'D4'],
}
RAIZ808 = {'Em9': 'E1', 'Cmaj7': 'C2', 'Am7': 'A1', 'Bm': 'B1'}
PROG = ['Em9', 'Cmaj7', 'Am7', 'Bm']

# ── Melodías ────────────────────────────────────────────────────────────────

# Intro: una nota larga por compás, contemplativa
CUERDA_INTRO = [
    [(0, 'E4', 12)],
    [(0, 'G4', 12)],
    [(0, 'A4', 12)],
    [(0, 'F#4', 12)],
]

# Gancho A: motivo principal, llamada personal (4 compases × 2 con variación)
CUERDA_A = [
    [(0, 'E4', 3), (4, 'G4', 2), (8, 'B4', 4), (14, 'A4', 2)],
    [(0, 'G4', 3), (4, 'E4', 2), (8, 'D4', 3), (12, 'C4', 4)],
    [(0, 'A4', 2), (3, 'C5', 1), (4, 'B4', 3), (10, 'G4', 2), (12, 'E4', 4)],
    [(0, 'F#4', 3), (6, 'D4', 2), (8, 'E4', 6)],
]
CUERDA_A2 = [
    [(0, 'E4', 2), (3, 'G4', 1), (4, 'B4', 3), (8, 'A4', 2), (12, 'G4', 4)],
    [(0, 'G4', 4), (6, 'E4', 2), (8, 'D4', 4)],
    [(0, 'C5', 2), (3, 'A4', 1), (4, 'G4', 2), (8, 'E4', 3), (12, 'A4', 4)],
    [(0, 'F#4', 2), (4, 'B4', 3), (8, 'A4', 2), (10, 'F#4', 2), (12, 'D4', 4)],
]

# Gancho B: el lead responde más alto mientras la cuerda repite el motivo
LEAD_B = [
    [(0, 'B4', 2), (4, 'D5', 2), (8, 'E5', 4)],
    [(0, 'E5', 3), (4, 'D5', 2), (8, 'C5', 4)],
    [(0, 'C5', 2), (3, 'E5', 1), (4, 'G5', 3), (8, 'E5', 2), (10, 'C5', 2), (12, 'A4', 4)],
    [(0, 'B4', 4), (6, 'A4', 2), (8, 'B4', 6)],
]

# Gancho C: la cuerda sube una octava, el lead contesta abajo (call and response invertido)
CUERDA_C = [
    [(0, 'E5', 2), (3, 'G5', 1), (4, 'B5', 3), (10, 'A5', 2), (14, 'G5', 2)],
    [(0, 'G5', 4), (6, 'E5', 2), (8, 'D5', 4)],
    [(0, 'E5', 2), (2, 'G5', 2), (4, 'A5', 3), (8, 'G5', 2), (10, 'E5', 2), (12, 'C5', 4)],
    [(0, 'D5', 3), (4, 'F#5', 2), (8, 'E5', 6)],
]
LEAD_C = [
    [(2, 'G4', 2), (8, 'B4', 2), (12, 'D5', 4)],
    [(2, 'E4', 2), (6, 'G4', 2), (10, 'B4', 4)],
    [(0, 'C5', 2), (6, 'A4', 2), (10, 'G4', 2), (14, 'E4', 2)],
    [(2, 'A4', 2), (6, 'D5', 2), (10, 'B4', 4)],
]

# Final: la cuerda vuelve al principio, resuelta
CUERDA_FINAL = [
    [(0, 'E5', 6), (12, 'G5', 4)],
    [(0, 'B4', 10)],
]

SECCIONES = [('intro', 4), ('ganchoA', 8), ('verso', 8), ('build', 2),
             ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 2)]

BRILLO_PAD = {'intro': 800, 'ganchoA': 950, 'verso': 1400, 'build': 850,
              'ganchoB': 1500, 'puente': 1200, 'ganchoC': 1800, 'final': 900}
VOL_PAD = {'intro': 0.5, 'ganchoA': 0.45, 'verso': 0.85, 'build': 0.55,
           'ganchoB': 0.5, 'puente': 0.85, 'ganchoC': 0.45, 'final': 0.6}


# ── Instrumentos propios del tema ────────────────────────────────────────────
def cuerda_oscura(m, dur=0.8):
    """Cuerda pulsada sombría: armónicos con decay por parcial + ruido de dedo."""
    t = t_arr(dur + 0.5)
    f = hz(m)
    x = sum(np.sin(2 * np.pi * f * h * t * (1 + 0.0002 * h ** 2)) *
            np.exp(-t * (1.8 + h * 1.5)) * (0.9 / h ** 0.6)
            for h in range(1, 12))
    click = bp(rng.standard_normal(len(t)), 1500, 4000) * np.exp(-t * 200) * 0.12
    x = (x + click) * env_adsr(len(t), 0.003, 0.06, 0.35, 0.25, dur)
    return lp(x, 3500) * 0.25


def lead_respuesta(m, dur, desde=None):
    """Lead cálido: sierras detuneadas con vibrato. El equipo que responde."""
    t = t_arr(dur + 0.4)
    f = np.full(len(t), hz(m))
    if desde is not None:
        g = min(len(t), int(0.06 * SR))
        f[:g] *= (hz(desde) / hz(m)) ** (1 - np.arange(g) / g)
    f *= 1 + 0.005 * np.sin(2 * np.pi * 4.8 * t) * np.clip((t - 0.18) * 3, 0, 1)
    ph = np.cumsum(f) / SR
    ph2 = np.cumsum(f * 1.006) / SR
    x = 2 * (ph - np.floor(ph + 0.5)) * 0.55 + 2 * (ph2 - np.floor(ph2 + 0.5)) * 0.45
    return lp(x, 2600) * env_adsr(len(t), 0.06, 0.2, 0.6, 0.3, dur) * 0.17


def pad_hueco(notas_midi, dur, brillo=1400):
    """Pad de pulso: cuadradas con duty 35% detuneadas. Hueco y pesado."""
    t = t_arr(dur + 1.2)
    out = np.zeros((2, len(t)))
    duty = 0.35
    for m in notas_midi:
        for v in range(4):
            det = (v - 1.5) * 0.005
            ph = hz(m) * (1 + det) * t
            x = np.where((ph % 1) < duty, 1.0, -1.0) / 4
            out += paneo(x, (v - 1.5) / 3 * 0.8)
    return lp(out, brillo) * env_adsr(len(t), 0.4, 0.5, 0.75, 1.0, dur) * 0.10


def bombo_pesado():
    """Kick profundo con sub larga y clic de ataque."""
    t = t_arr(0.55)
    sub = np.sin(2 * np.pi * np.cumsum(42 + 10 * np.exp(-t * 15)) / SR) * np.exp(-t * 4.8)
    punch = np.sin(2 * np.pi * np.cumsum(55 + 100 * np.exp(-t * 50)) / SR) * np.exp(-t * 22)
    click = hp(rng.standard_normal(len(t)), 3500) * np.exp(-t * 350) * 0.4
    return np.tanh((sub * 0.9 + punch * 0.65 + click) * 1.3)


def caja_seca():
    """Caja corta, apretada, sin ring."""
    t = t_arr(0.25)
    cuerpo = (np.sin(2 * np.pi * 200 * t) + 0.3 * np.sin(2 * np.pi * 400 * t)) * np.exp(-t * 28)
    ruido = bp(rng.standard_normal(len(t)), 2000, 7500) * np.exp(-t * 20)
    return np.tanh((cuerpo * 0.7 + ruido * 0.75) * 1.3)


def hat_pesado(abierto=False):
    """Hi-hat metálico tipo 808: seis cuadradas inarmónicas."""
    t = t_arr(0.3 if abierto else 0.065)
    metal = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (215, 318, 380, 538, 555, 820))
    return hp(metal, 7000) * np.exp(-t * (7.5 if abierto else 55)) * 0.17


def rim_sutil():
    t = t_arr(0.04)
    return (bp(rng.standard_normal(len(t)), 1600, 3000) * 0.5 +
            np.sin(2 * np.pi * 900 * t)) * np.exp(-t * 130) * 0.25


def paso(c, s, swing=True):
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


# ── Composición ──────────────────────────────────────────────────────────────
def render():
    total = sum(c for _, c in SECCIONES)
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'pad', 'cuerda', 'lead', 'voz', 'fx']}
    sc = np.zeros(N)
    K, SN, H, HO, RI = bombo_pesado(), caja_seca(), hat_pesado(), hat_pesado(True), rim_sutil()
    ir_largo = reverb_ir(dur=3.0, decay=2.0, brillo=4500, seed=116)
    ir_corto = reverb_ir(dur=0.8, decay=6, brillo=7000, seed=117)
    ir_drums = reverb_ir(dur=0.5, decay=8, brillo=7500, seed=118)
    notas808 = []
    ini = {}
    c0 = 0
    hum = lambda s=0.004: rng.normal(0, s)

    for nombre, largo in SECCIONES:
        ini[nombre] = c0
        for c in range(largo):
            cg = c0 + c
            frase = c % 4
            ac_nombre = PROG[frase]
            ac = [n(x) for x in ACORDES[ac_nombre]]
            ultimo = c == largo - 1

            # ── Pad (siempre) ──
            poner(bus['pad'], pad_hueco([m + 12 for m in ac[:3]], COMPAS,
                  BRILLO_PAD[nombre]) * VOL_PAD[nombre], paso(cg, 0, False))

            # ── Cuerda ──
            if nombre == 'intro':
                for (s, nota, l) in CUERDA_INTRO[frase]:
                    x = cuerda_oscura(n(nota), l * S16)
                    poner(bus['cuerda'], paneo(x, 0), paso(cg, s) + hum(0.003))

            elif nombre in ('ganchoA', 'ganchoB'):
                fr = CUERDA_A if c < 4 else CUERDA_A2
                for (s, nota, l) in fr[frase]:
                    x = cuerda_oscura(n(nota), l * S16)
                    poner(bus['cuerda'], paneo(x, float(rng.uniform(-0.15, 0.15))),
                          paso(cg, s) + hum(0.003))

            elif nombre == 'build':
                build_notas = ([n('E4'), n('G4'), n('A4'), n('B4')]
                               if c == 0 else [n('C5'), n('D5'), n('E5'), n('G5')])
                for j in range(4):
                    vol = 0.4 + 0.5 * (j + c * 4) / 8
                    x = cuerda_oscura(build_notas[j], BEAT * 0.9) * vol
                    poner(bus['cuerda'], paneo(x, 0), paso(cg, j * 4, False))

            elif nombre == 'ganchoC':
                for (s, nota, l) in CUERDA_C[frase]:
                    x = cuerda_oscura(n(nota), l * S16)
                    poner(bus['cuerda'], paneo(x, float(rng.uniform(-0.1, 0.1))),
                          paso(cg, s) + hum(0.003))

            elif nombre == 'final':
                for (s, nota, l) in CUERDA_FINAL[c]:
                    x = cuerda_oscura(n(nota), l * S16)
                    poner(bus['cuerda'], paneo(x, 0), paso(cg, s) + hum(0.003))

            # ── Lead ──
            if nombre == 'ganchoB':
                previa = None
                for (s, nota, l) in LEAD_B[frase]:
                    m = n(nota)
                    x = lead_respuesta(m, l * S16 * 0.95,
                                       previa if previa and abs(previa - m) <= 5 else None)
                    poner(bus['lead'], paneo(x, 0.15), paso(cg, s) + hum(0.003))
                    previa = m
            elif nombre == 'ganchoC':
                previa = None
                for (s, nota, l) in LEAD_C[frase]:
                    m = n(nota)
                    x = lead_respuesta(m, l * S16 * 0.95,
                                       previa if previa and abs(previa - m) <= 5 else None)
                    poner(bus['lead'], paneo(x, -0.15), paso(cg, s) + hum(0.003))
                    previa = m

            # ── Voz (2 momentos puntuales) ──
            if nombre == 'puente' and c == 1:
                poner(bus['voz'], paneo(vox(n('E5'), BEAT * 2, 'o', rng), 0) * 0.45,
                      paso(cg, 4))
            if nombre == 'ganchoC' and frase == 3 and c >= 4:
                poner(bus['voz'], paneo(vox(n('E5'), S16 * 3, 'a', rng), -0.2) * 0.5,
                      paso(cg, 10))

            # ── Batería ──
            con_bateria = nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC')
            if con_bateria:
                if nombre == 'verso':
                    kicks = [0, 10] if frase != 3 else [0, 10, 14]
                else:
                    kicks = [0, 7, 10] if frase != 3 else [0, 7, 10, 15]
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.92, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.22) * 14)[None], paso(cg, s, False))
                # Caja en beat 3 (medio tiempo)
                poner(bus['drums'], paneo(SN, 0.02) * 0.72,
                      paso(cg, 8, False) + hum(0.002))
                # Hi-hats
                if nombre == 'verso':
                    for s in range(0, 16, 4):
                        poner(bus['drums'],
                              paneo(H * (0.8 if s == 0 else 0.5) * (1 - rng.uniform(0, 0.15)), 0.25),
                              paso(cg, s) + hum(0.002))
                else:
                    redoble = frase == 3
                    for s in range(0, 12 if redoble else 16, 2):
                        acento = [1.0, 0.4, 0.65, 0.4][s % 4]
                        poner(bus['drums'],
                              paneo(H * acento * (1 - rng.uniform(0, 0.15)), 0.25),
                              paso(cg, s) + hum(0.002))
                    # Hat abierto a contratiempo en frases 1 y 3
                    if frase in (1, 3):
                        ho = HO[:int(2 * S16 * SR)].copy()
                        ho[-200:] *= np.linspace(1, 0, 200)
                        poner(bus['drums'], paneo(ho, -0.3) * 0.6, paso(cg, 6))
                    # Redoble de hats al final de la frase 3
                    if redoble:
                        for j in range(6):
                            poner(bus['drums'],
                                  paneo(repitch(H, 1 + j * 0.04) * (0.4 + 0.5 * j / 6), 0.25),
                                  paso(cg, 12) + j * S16 * 0.67)
                # Rim en el verso (cada 2 compases)
                if nombre == 'verso' and c % 2 == 0:
                    poner(bus['drums'], paneo(RI, 0.4) * 0.4, paso(cg, 4))

            # ── Build: redoble de caja que acelera ──
            if nombre == 'build':
                if c == 0:
                    for s in range(0, 16, 2):
                        poner(bus['drums'], paneo(SN * (0.25 + 0.3 * s / 16), 0),
                              paso(cg, s, False))
                else:
                    for j in range(20):
                        poner(bus['drums'],
                              paneo(repitch(SN, 1 + j * 0.012) * (0.3 + 0.5 * j / 20), 0),
                              cg * COMPAS + j * S16 / 1.3)

            # ── 808 ──
            if nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC'):
                r = n(RAIZ808[ac_nombre])
                if nombre == 'verso':
                    pat = [(0, 0, 8)] if frase != 3 else [(0, 0, 6), (10, 12, 4)]
                else:
                    pat = ([(0, 0, 3), (7, 12, 2), (10, 0, 4)] if frase != 3
                           else [(0, 0, 3), (7, 12, 2), (10, 0, 3), (14, 5, 2)])
                for s, iv, l in pat:
                    glide = 0.1 if s == 0 and frase == 0 and c > 0 else 0
                    notas808.append((paso(cg, s, False), r + iv, l * S16, glide))
            elif nombre == 'puente':
                notas808.append((paso(cg, 0, False), n(RAIZ808[PROG[frase]]), COMPAS, 0))

        c0 += largo

    T = lambda comp: comp * COMPAS

    # ── Momentos únicos ──
    # Swell invertido antes del gancho B
    sw = con_reverb(pad_hueco([n('B3'), n('D4'), n('E4')], BEAT * 1.5, 1500), ir_largo, 0.8)
    sw = sw[:, :int(BEAT * 3 * SR)][:, ::-1]
    poner(bus['fx'], sw * 0.45, T(ini['ganchoB']) - sw.shape[1] / SR)

    # Swell invertido (más brillante) antes del gancho C
    sw2 = con_reverb(pad_hueco([n('E4'), n('G4'), n('B4')], BEAT * 2, 2000), ir_corto, 0.6)
    sw2 = sw2[:, :int(BEAT * 3 * SR)][:, ::-1]
    poner(bus['fx'], sw2 * 0.45, T(ini['ganchoC']) - sw2.shape[1] / SR)

    # Chop de voz antes del gancho C (marca la transición)
    poner(bus['voz'], paneo(vox(n('E5'), S16 * 3, 'e', rng), 0) * 0.65,
          T(ini['ganchoC']) - BEAT * 0.75)

    # 808
    if notas808:
        poner(bus['bajo'], paneo(lp(ochocientos(notas808, N / SR, 2.0), 3000), 0), 0)

    # ── Mezcla ──────────────────────────────────────────────────────────────
    # Cuerda: cinta sutil + delay + reverb largo (aislada, con espacio)
    cr = cinta(bus['cuerda'], 0.15, rng)
    cr = con_reverb(delay_pingpong(cr, BEAT * 0.75, 0.35, 0.2), ir_largo, 0.45)

    # Pad: sidechain leve + reverb corto
    pad_mix = bus['pad'] * (1 - 0.3 * np.clip(sc, 0, 1))
    pad_mix = con_reverb(pad_mix, ir_corto, 0.18)

    # Lead: delay + reverb corto (cerca, como el equipo)
    lead = hp(bus['lead'], 250)
    lead = con_reverb(delay_pingpong(saturar(lead, 0.15), BEAT * 0.75, 0.3, 0.2),
                      ir_corto, 0.22)

    # Voz
    voz_mix = con_reverb(delay_pingpong(hp(bus['voz'], 300), BEAT / 2, 0.35, 0.2),
                         ir_largo, 0.4)

    # Drums
    drums = con_reverb(saturar(bus['drums'], 0.1), ir_drums, 0.06)

    # Bajo
    bajo = bus['bajo'] * (1 - 0.25 * np.clip(sc, 0, 1))

    mix = drums + bajo * 0.8 + cr + pad_mix + lead * 0.85 + voz_mix * 0.75 + bus['fx']

    # Build: silencio al final para que el drop del gancho B pegue
    build_end = int((T(ini['build'] + 2) - BEAT * 0.4) * SR)
    build_limit = min(mix.shape[1], int(T(ini['build'] + 2) * SR))
    mix[:, build_end:build_limit] *= 0.04

    # Ganancia por sección
    g = np.ones(mix.shape[1])
    for nombre_s, valor in [('intro', 5.0), ('final', 1.0), ('build', 0.7),
                             ('puente', 0.7), ('verso', 0.82)]:
        largo_s = dict(SECCIONES)[nombre_s]
        a = int(T(ini[nombre_s]) * SR)
        b = min(mix.shape[1], int(T(ini[nombre_s] + largo_s) * SR))
        g[a:b] = valor
    mix *= lp(g, 2.5)

    # Master
    mix = hp(mix, 28)
    mix = mix / (np.percentile(np.abs(mix), 99.95) + 1e-9) * 0.85
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    mix /= np.abs(mix).max() + 1e-9
    fin_i = int((total * COMPAS + 2.5) * SR)
    mix = mix[:, :fin_i]
    mix[:, -int(2.0 * SR):] *= np.linspace(1, 0, int(2.0 * SR))
    return (mix * 0.95).T


if __name__ == '__main__':
    out = os.path.join(RAIZ, 'fuentes', 'beats', 'salida', 'diario')
    os.makedirs(out, exist_ok=True)
    f = os.path.join(out, '2026-10-10-2.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.0f} s')
