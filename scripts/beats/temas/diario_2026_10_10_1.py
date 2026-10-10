"""FRÍO — tema del día 2026-10-10-1.

Concepto: salir a jugar a las 11 de la noche en invierno — las manos heladas, el
aliento que se ve, el pasto mojado — pero adentro de la cancha el frío no existe.
Cada sección es un grado más caliente hasta que el frío desaparece.

Emoción por sección:
  intro    — frío puro: cristales y un pad lejano; la noche antes de entrar
  gancho A — primer paso en la cancha: batería y bajo, el frío sigue pero importa menos
  verso    — concentración: el cuerpo se acostumbra, los cristales bajan
  build    — adrenalina: cristales que se aceleran, redoble de caja
  gancho B — calor: lead cálido, los cristales son un recuerdo lejano
  puente   — el entretiempo: solo pad y bajo, silencio cálido
  gancho C — en llamas: melodía nueva alta, sin cristales
  final    — volver al frío: un cristal solitario, pero vos cambiaste

Rasgo distintivo: "cristales" — notas agudas cortas (campana FM + detune + reverb largo)
  que evocan escarcha; omnipresentes al principio, desaparecen hasta el gancho C donde
  el calor ganó. Uno solo vuelve al final.

Estructura (44 compases, 138 BPM, sib menor natural):
  intro 4 · gancho A 8 · verso 8 · build 2 · gancho B 8 · puente 4 · gancho C 8 · final 2

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_10_1.py
Salida: fuentes/beats/salida/diario/2026-10-10-1.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch,  # noqa: E402
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar, cinta,
                      ochocientos, vox)

BPM = 138
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.13 * S16
rng = np.random.default_rng(10101)
NOMBRES = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
           'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOMBRES[nombre[:-1]]


# ── Armonía (sib menor natural) ──────────────────────────────────────────────
ACORDES = {
    'Bbm9':   ['Bb2', 'F3', 'Ab3', 'Db4', 'C4'],
    'Gb6':    ['Gb2', 'Db3', 'Bb3', 'Eb4'],
    'Dbmaj7': ['Db3', 'Ab3', 'C4', 'F4'],
    'Ab':     ['Ab2', 'Eb3', 'Bb3', 'C4'],
}
RAIZ808 = {'Bbm9': 'Bb1', 'Gb6': 'Gb1', 'Dbmaj7': 'Db2', 'Ab': 'Ab1'}
PROG = ['Bbm9', 'Gb6', 'Dbmaj7', 'Ab']

# Notas cristal por acorde: (semicorchea, nota) — registro agudo, posiciones irregulares
CRISTAL_NOTAS = {
    'Bbm9':   [(1, 'Bb5'), (5, 'Db6'), (8, 'F5'), (11, 'Ab5'), (14, 'C6')],
    'Gb6':    [(0, 'Gb5'), (3, 'Bb5'), (7, 'Db6'), (10, 'Eb5'), (13, 'Gb6')],
    'Dbmaj7': [(2, 'Db6'), (4, 'F5'), (9, 'Ab5'), (12, 'C6'), (15, 'F6')],
    'Ab':     [(1, 'Eb5'), (5, 'Ab5'), (8, 'Bb5'), (11, 'C6'), (15, 'Eb6')],
}

# Lead del gancho B (cálido, cantado, crece)
LEAD_B = [
    [(0, 'Db5', 3), (4, 'F5', 2), (8, 'Ab5', 3), (14, 'Bb5', 2)],
    [(0, 'Db5', 4), (6, 'Bb4', 2), (10, 'Ab4', 4)],
    [(0, 'F5', 2), (3, 'Ab5', 1), (4, 'C6', 3), (10, 'Ab5', 2)],
    [(0, 'Eb5', 3), (6, 'C5', 2), (10, 'Bb4', 4)],
]

# Lead del gancho C (más alto, abierto — el calor ganó)
LEAD_C = [
    [(0, 'F5', 2), (2, 'Ab5', 2), (4, 'Bb5', 4), (10, 'Db6', 2)],
    [(0, 'Db6', 3), (4, 'Bb5', 2), (8, 'Ab5', 4)],
    [(0, 'Db6', 2), (3, 'C6', 1), (4, 'Bb5', 3), (8, 'Ab5', 2), (10, 'F5', 2), (12, 'Eb5', 4)],
    [(0, 'F5', 3), (4, 'Ab5', 2), (8, 'Bb5', 6)],
]

SECCIONES = [('intro', 4), ('ganchoA', 8), ('verso', 8), ('build', 2),
             ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 2)]

# Brillo del pad por sección: de frío (filtrado) a caliente (abierto)
BRILLO_PAD = {'intro': 600, 'ganchoA': 900, 'verso': 1200, 'build': 800,
              'ganchoB': 1600, 'puente': 1400, 'ganchoC': 2000, 'final': 800}
VEL_PAD = {'intro': 0.5, 'ganchoA': 0.7, 'verso': 0.8, 'build': 0.6,
            'ganchoB': 1.0, 'puente': 0.9, 'ganchoC': 1.0, 'final': 0.5}
# Proporción de cristales que suenan por sección (1.0 = todos, 0 = ninguno)
DENSIDAD_CR = {'intro': 1.0, 'ganchoA': 0.85, 'verso': 0.5, 'build': 1.0,
               'ganchoB': 0.2, 'puente': 0, 'ganchoC': 0, 'final': 0}


# ── Instrumentos propios del tema ────────────────────────────────────────────
def cristal(m, dur=0.2):
    """Nota cristalina: campana FM aguda con detune — escarcha que brilla."""
    t = t_arr(dur + 0.4)
    f = hz(m)
    mod = np.sin(2 * np.pi * f * 4.7 * t) * 3.0 * np.exp(-t * 8)
    x = np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 12)
    x += np.sin(2 * np.pi * f * 1.008 * t + mod * 0.7) * np.exp(-t * 14) * 0.6
    x += hp(rng.standard_normal(len(t)), 12000) * np.exp(-t * 200) * 0.08
    return x * 0.22


def pad_calido(notas_midi, dur, brillo=1200):
    """Pad supersaw cálido: lo que se siente cuando dejás de tener frío."""
    t = t_arr(dur + 1.5)
    out = np.zeros((2, len(t)))
    for m in notas_midi:
        for v in range(6):
            det = (v - 2.5) * 0.005
            out += paneo(saw(hz(m), t, det) / 6, (v - 2.5) / 5 * 0.8)
    return lp(out, brillo) * env_adsr(len(t), 0.5, 0.5, 0.75, 1.0, dur) * 0.12


def lead_tibio(m, dur, desde=None):
    """Lead que calienta: sierras con detune, ataque lento, vibrato tardío."""
    t = t_arr(dur + 0.5)
    f = np.full(len(t), hz(m))
    if desde is not None:
        g = min(len(t), int(0.07 * SR))
        f[:g] *= (hz(desde) / hz(m)) ** (1 - np.arange(g) / g)
    f *= 1 + 0.006 * np.sin(2 * np.pi * 4.5 * t) * np.clip((t - 0.2) * 3, 0, 1)
    ph = np.cumsum(f) / SR
    ph2 = np.cumsum(f * 1.005) / SR
    x = 2 * (ph - np.floor(ph + 0.5)) * 0.55 + 2 * (ph2 - np.floor(ph2 + 0.5)) * 0.45
    return lp(x, 2200) * env_adsr(len(t), 0.12, 0.25, 0.65, 0.35, dur) * 0.18


def bombo_helado():
    """Kick pesado con chasquido de hielo en el transiente."""
    t = t_arr(0.5)
    sub = np.sin(2 * np.pi * np.cumsum(44 + 12 * np.exp(-t * 18)) / SR) * np.exp(-t * 5.5)
    punch = np.sin(2 * np.pi * np.cumsum(58 + 120 * np.exp(-t * 55)) / SR) * np.exp(-t * 26)
    crack = hp(rng.standard_normal(len(t)), 4000) * np.exp(-t * 500) * 0.45
    return np.tanh((sub * 0.85 + punch * 0.7 + crack) * 1.4)


def caja_frio():
    """Caja apretada con ring metálico sutil."""
    t = t_arr(0.3)
    cuerpo = (np.sin(2 * np.pi * 195 * t) + 0.35 * np.sin(2 * np.pi * 380 * t)) * np.exp(-t * 24)
    ring = np.sin(2 * np.pi * 750 * t) * np.exp(-t * 35) * 0.2
    ruido = bp(rng.standard_normal(len(t)), 1800, 8000) * np.exp(-t * 16)
    return np.tanh((cuerpo * 0.75 + ruido * 0.6 + ring) * 1.3)


def hat_frio(abierto=False):
    """Hi-hat con 6 parciales metálicos (tipo 808)."""
    t = t_arr(0.35 if abierto else 0.07)
    metal = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (210, 312, 375, 530, 548, 810)) * 0.45
    ruido = hp(rng.standard_normal(len(t)), 7500) * 0.55
    return hp(metal + ruido, 6500) * np.exp(-t * (8 if abierto else 60)) * 0.18


def rim_helado():
    t = t_arr(0.04)
    return (bp(rng.standard_normal(len(t)), 1500, 3500) * 0.5
            + np.sin(2 * np.pi * 880 * t)) * np.exp(-t * 120) * 0.28


def paso(c, s, swing=True):
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


# ── Composición ──────────────────────────────────────────────────────────────
def render():
    total = sum(c for _, c in SECCIONES)
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'cristales', 'pad', 'lead', 'voz', 'fx']}
    sc = np.zeros(N)
    K, SN, H, HO, RI = bombo_helado(), caja_frio(), hat_frio(), hat_frio(True), rim_helado()
    ir_frio = reverb_ir(dur=3.5, decay=1.8, brillo=4000, seed=110)
    ir_near = reverb_ir(dur=0.9, decay=5, brillo=7000, seed=111)
    ir_drums = reverb_ir(dur=0.5, decay=8, brillo=7500, seed=112)
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

            # ── Cristales ──
            dens = DENSIDAD_CR[nombre]
            if dens > 0:
                for (s, nota) in CRISTAL_NOTAS[ac_nombre]:
                    if rng.random() < dens:
                        vol = 0.7 + 0.3 * rng.random()
                        x = cristal(n(nota))
                        poner(bus['cristales'], paneo(x * vol, float(rng.uniform(-0.6, 0.6))),
                              paso(cg, s) + hum(0.003))
                # Build segundo compás: cristales extra (acelerados)
                if nombre == 'build' and c == 1:
                    for (s, nota) in CRISTAL_NOTAS[ac_nombre]:
                        x = cristal(n(nota))
                        poner(bus['cristales'], paneo(x * (0.5 + 0.4 * s / 16),
                              float(rng.uniform(-0.7, 0.7))),
                              paso(cg, (s + 2) % 16) + hum(0.002))

            # Final: un cristal solitario por compás
            if nombre == 'final':
                nota_s, vol_s = [('Bb5', 0.6), ('F6', 0.4)][c % 2]
                poner(bus['cristales'], paneo(cristal(n(nota_s)) * vol_s, 0.3),
                      paso(cg, 4) + hum())

            # ── Pad: brillo crece de frío a caliente ──
            poner(bus['pad'], pad_calido([m + 12 for m in ac[:3]], COMPAS,
                  BRILLO_PAD[nombre]) * VEL_PAD[nombre], paso(cg, 0, False))

            # ── Lead: gancho B y C ──
            if nombre == 'ganchoB':
                previa = None
                for (s, nota, l) in LEAD_B[frase]:
                    m = n(nota)
                    x = lead_tibio(m, l * S16 * 0.95,
                                   previa if previa and abs(previa - m) <= 5 else None)
                    poner(bus['lead'], paneo(x, 0.15), paso(cg, s) + hum(0.003))
                    previa = m
            elif nombre == 'ganchoC':
                previa = None
                for (s, nota, l) in LEAD_C[frase]:
                    m = n(nota)
                    x = lead_tibio(m, l * S16 * 0.95,
                                   previa if previa and abs(previa - m) <= 5 else None)
                    poner(bus['lead'], paneo(x, -0.1), paso(cg, s) + hum(0.003))
                    previa = m

            # ── Voz (2 momentos puntuales en todo el tema) ──
            if nombre == 'puente' and c == 1:
                poner(bus['voz'], paneo(vox(n('Db5'), BEAT * 2, 'o', rng), 0) * 0.5,
                      paso(cg, 0))
            if nombre == 'ganchoC' and frase == 3 and c >= 4:
                poner(bus['voz'], paneo(vox(n('F5'), S16 * 3, 'a', rng), -0.2) * 0.55,
                      paso(cg, 10))

            # ── Batería ──
            con_bateria = nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC')
            if con_bateria:
                if nombre == 'verso':
                    kicks = [0, 10] if frase != 3 else [0, 10, 14]
                else:
                    kicks = [0, 6, 10] if frase != 3 else [0, 6, 10, 15]
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.92, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.22) * 14)[None], paso(cg, s, False))
                # Caja en el 3er tiempo (medio tiempo)
                poner(bus['drums'], paneo(SN, 0.02) * 0.72,
                      paso(cg, 8, False) + hum(0.002))
                # Hats: negras en el verso, corcheas con swing en los ganchos
                if nombre == 'verso':
                    for s in range(0, 16, 4):
                        poner(bus['drums'],
                              paneo(H * (0.85 if s == 0 else 0.5) * (1 - rng.uniform(0, 0.15)), 0.25),
                              paso(cg, s) + hum(0.002))
                else:
                    redoble = frase == 3
                    for s in range(0, 12 if redoble else 16, 2):
                        acento = [1.0, 0.4, 0.7, 0.4][s % 4]
                        poner(bus['drums'],
                              paneo(H * acento * (1 - rng.uniform(0, 0.15)), 0.25),
                              paso(cg, s) + hum(0.002))
                    # Hat abierto a contratiempo (frases 1 y 3)
                    if frase in (1, 3):
                        ho = HO[:int(2 * S16 * SR)].copy()
                        ho[-200:] *= np.linspace(1, 0, 200)
                        poner(bus['drums'], paneo(ho, -0.3) * 0.65, paso(cg, 6))
                    # Redoble de hats al final de la frase 3
                    if redoble:
                        for j in range(6):
                            poner(bus['drums'],
                                  paneo(repitch(H, 1 + j * 0.04) * (0.4 + 0.5 * j / 6), 0.25),
                                  paso(cg, 12) + j * S16 * 0.67)
                # Rim en el verso (cada 2 compases)
                if nombre == 'verso' and c % 2 == 0:
                    poner(bus['drums'], paneo(RI, 0.4) * 0.45, paso(cg, 4))

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
                    pat = ([(0, 0, 3), (6, 12, 2), (10, 0, 4)] if frase != 3
                           else [(0, 0, 3), (6, 12, 2), (10, 0, 3), (14, 5, 2)])
                for s, iv, l in pat:
                    glide = 0.1 if s == 0 and frase == 0 and c > 0 else 0
                    notas808.append((paso(cg, s, False), r + iv, l * S16, glide))
            elif nombre == 'puente':
                notas808.append((paso(cg, 0, False), n(RAIZ808[PROG[frase]]), COMPAS, 0))

        c0 += largo

    T = lambda comp: comp * COMPAS

    # ── Momentos únicos ──
    # Swell invertido antes del gancho B
    sw = con_reverb(pad_calido([n('Bb4'), n('Db5'), n('F5')], BEAT * 1.5, 1600), ir_frio, 0.8)
    sw = sw[:, :int(BEAT * 3 * SR)][:, ::-1]
    poner(bus['fx'], sw * 0.5, T(ini['ganchoB']) - sw.shape[1] / SR)

    # Swell invertido (más brillante) antes del gancho C
    sw2 = con_reverb(pad_calido([n('Db5'), n('F5'), n('Ab5')], BEAT * 2, 2200), ir_near, 0.6)
    sw2 = sw2[:, :int(BEAT * 3 * SR)][:, ::-1]
    poner(bus['fx'], sw2 * 0.5, T(ini['ganchoC']) - sw2.shape[1] / SR)

    # 808
    if notas808:
        poner(bus['bajo'], paneo(lp(ochocientos(notas808, N / SR, 2.0), 3000), 0), 0)

    # ── Mezcla ──────────────────────────────────────────────────────────────
    # Cristales: cinta sutil + delay + reverb largo y frío
    cr = cinta(bus['cristales'], 0.2, rng)
    cr = con_reverb(delay_pingpong(cr, BEAT * 0.75, 0.4, 0.25), ir_frio, 0.55)

    # Pad: sidechain leve + reverb corto
    pad_mix = bus['pad'] * (1 - 0.3 * np.clip(sc, 0, 1))
    pad_mix = con_reverb(pad_mix, ir_near, 0.2)

    # Lead: limpio, delay, reverb corto
    lead = hp(bus['lead'], 250)
    lead = con_reverb(delay_pingpong(saturar(lead, 0.15), BEAT * 0.75, 0.3, 0.2),
                      ir_near, 0.25)

    # Voz: delay + reverb largo
    voz_mix = con_reverb(delay_pingpong(hp(bus['voz'], 300), BEAT / 2, 0.35, 0.2),
                         ir_frio, 0.45)

    # Drums: saturación mínima + reverb de sala
    drums = con_reverb(saturar(bus['drums'], 0.1), ir_drums, 0.06)

    # Bajo: sidechain del bombo
    bajo = bus['bajo'] * (1 - 0.25 * np.clip(sc, 0, 1))

    mix = drums + bajo * 0.8 + cr + pad_mix + lead * 0.9 + voz_mix * 0.8 + bus['fx']

    # Build: silencio al final para que el drop del gancho B pegue
    build_end = int((T(ini['build'] + 2) - BEAT * 0.4) * SR)
    build_limit = min(mix.shape[1], int(T(ini['build'] + 2) * SR))
    mix[:, build_end:build_limit] *= 0.04

    # Ganancia por sección: intro/final suben mucho (muy pocas capas), verso/puente/build bajan
    g = np.ones(mix.shape[1])
    for nombre_s, valor in [('intro', 3.5), ('final', 4.0), ('build', 0.75),
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
    f = os.path.join(out, '2026-10-10-1.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.0f} s')
