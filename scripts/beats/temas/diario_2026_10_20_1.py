"""PENAL — beat de trap del club, compuesto a mano.

Concepto: La caminata del mediocampo al punto del penal — 10 metros de aislamiento total
en medio de la multitud. Todos miran, nadie puede ayudar. El mundo se achica a pelota,
punto, red. Cuando la apoyás, todo vuelve. Tirás.

Emoción por sección:
  intro (4c): caminando desde el mediocampo — pasos rápidos, mundo filtrado, piano lejano
  gancho A (8c): el foco se achica — batería entra, pasos más lentos, melodía tentativa
  verso (8c): la duda — batería simple, pasos muy lentos, lead disperso
  build (2c): apoyás la pelota — los pasos se detienen, filtro que sube
  gancho B (8c): enfrentás al arquero — batería completa, pad abierto, lead seguro
  puente (4c): la carrera — stripped, un eco de paso, tensión creciente
  gancho C (8c): el tiro — todo al máximo, UN paso al inicio, lead que vuela
  final (4c): la vuelta — piano solo, un último paso que se apaga

Rasgo distintivo: "pasos que cuentan" — golpe percusivo de pisada (thud grave + click de
tapones) a intervalos irregulares que se frenan sección a sección (caminando al punto);
se detienen en el gancho B (llegaste); en el gancho C, un solo paso marca la carrera.

Estructura: intro 4 · gancho A 8 · verso 8 · build 2 · gancho B 8 · puente 4 · gancho C 8 · final 4
  = 46 compases, 126 BPM, sib menor → ~88 s

Recursos: pasos que desaceleran (firma del tema), pad con banda estrecha que abre (visión de
túnel), piano reverberado y aislado, lead con confianza variable (dubitativo a decidido),
808 melódico con saltos de octava y glide, platillo invertido en las transiciones

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_20_1.py
Salida: fuentes/beats/salida/diario/2026-10-20-1.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch,
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar, ochocientos)

BPM = 126
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.14 * S16
rng = np.random.default_rng(20261020)
NOM = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
       'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n(nombre):
    """'Bb4' -> MIDI 70."""
    return 12 * (int(nombre[-1]) + 1) + NOM[nombre[:-1]]


def paso(c, s, swing=True):
    """Tiempo (seg) del paso s (semicorchea 0-15) del compas c."""
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


# -- Armonia: Bbm7 -> Ebm7 -> Gb -> F7  (i -> iv -> VI -> V) -----------------
ACORDES = {
    'Bbm7': ['Bb3', 'Db4', 'F4', 'Ab4'],
    'Ebm7': ['Eb3', 'Gb3', 'Bb3', 'Db4'],
    'Gb':   ['Gb3', 'Bb3', 'Db4'],
    'F7':   ['F3', 'A3', 'C4', 'Eb4'],      # A natural = tension armonica menor
}
RAIZ_808 = {'Bbm7': 'Bb1', 'Ebm7': 'Eb2', 'Gb': 'Gb1', 'F7': 'F2'}
PROG = ['Bbm7', 'Ebm7', 'Gb', 'F7']

SECCIONES = [
    ('intro', 4), ('ganchoA', 8), ('verso', 8), ('build', 2),
    ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 4),
]

# -- Melodias escritas a mano: (paso 16avos, nota, duracion 16avos) -----------
# Gancho A: tentativo (Bb4-F5), notas cortas, rango estrecho
LEAD_A = [
    [(0, 'Bb4', 2), (3, 'Db5', 1), (4, 'F5', 2), (8, 'Eb5', 2), (12, 'Db5', 3)],
    [(0, 'Eb5', 2), (3, 'Db5', 1), (4, 'Bb4', 3), (8, 'Gb4', 2), (12, 'Ab4', 4)],
    [(0, 'Bb4', 2), (2, 'Db5', 2), (4, 'F5', 3), (8, 'Eb5', 2), (10, 'Db5', 2), (12, 'Bb4', 3)],
    [(0, 'Ab4', 2), (3, 'C5', 1), (4, 'A4', 3), (8, 'Eb5', 2), (12, 'F5', 4)],
]
# Gancho B: decidido (F5-Bb5), notas mas largas, subidas
LEAD_B = [
    [(0, 'F5', 3), (4, 'Eb5', 2), (6, 'Db5', 2), (8, 'F5', 2), (10, 'Ab5', 2), (12, 'Bb5', 4)],
    [(0, 'Ab5', 3), (4, 'Gb5', 2), (6, 'F5', 2), (8, 'Eb5', 3), (12, 'Db5', 3)],
    [(0, 'Db5', 2), (2, 'F5', 2), (4, 'Bb5', 4), (8, 'Ab5', 2), (10, 'Gb5', 2), (12, 'F5', 2)],
    [(0, 'Eb5', 2), (4, 'C5', 3), (8, 'A4', 2), (10, 'C5', 2), (12, 'F5', 4)],
]
# Gancho C: vuelo (Bb5-Db6), sustain largo, cima del tema
LEAD_C = [
    [(0, 'Bb5', 4), (6, 'Ab5', 2), (8, 'F5', 2), (10, 'Ab5', 2), (12, 'Bb5', 4)],
    [(0, 'Db6', 6), (8, 'Bb5', 2), (10, 'Ab5', 2), (12, 'Gb5', 4)],
    [(0, 'F5', 2), (2, 'Ab5', 2), (4, 'Bb5', 3), (8, 'Db6', 4), (12, 'Bb5', 4)],
    [(0, 'Ab5', 2), (2, 'F5', 2), (4, 'Eb5', 4), (8, 'F5', 8)],
]
# Verso: disperso (Gb4-Db5), mucho silencio
LEAD_VERSO = [
    [(0, 'Bb4', 3), (8, 'Ab4', 2)],
    [(0, 'Gb4', 3), (6, 'F4', 2)],
    [(0, 'Db5', 2), (4, 'Bb4', 2), (8, 'Ab4', 3)],
    [(0, 'C5', 3), (8, 'A4', 4)],
]
# Piano: una nota por compas (intro y final), indice relativo al compas de la seccion
PIANO_INTRO = {0: 'Bb3', 1: 'F3', 2: 'Db3', 3: 'Ab2'}
PIANO_FINAL = {0: 'Gb3', 1: 'F3', 2: 'Bb3', 3: 'Bb2'}
# Bandpass del pad por seccion (lo, hi Hz) — apertura progresiva
BP_PAD = {
    'intro': (400, 1200), 'ganchoA': (250, 1800), 'verso': (200, 2500),
    'ganchoB': (150, 4000), 'puente': (300, 1500), 'ganchoC': (100, 7000),
}
# Confianza del lead por seccion (0 = tentativo, 1 = seguro)
CONFIANZA = {'ganchoA': 0.25, 'verso': 0.15, 'ganchoB': 0.7, 'ganchoC': 1.0}


# -- Instrumentos de este tema ------------------------------------------------
def pisada(intensidad=1.0):
    """Pisada en el pasto: thud grave de tapon + click agudo de suela."""
    t = t_arr(0.22)
    thud = np.sin(2 * np.pi * np.cumsum(38 + 65 * np.exp(-t * 35)) / SR) * np.exp(-t * 20) * 0.7
    click = bp(rng.standard_normal(len(t)), 2500, 6500) * np.exp(-t * 130) * 0.35
    return (thud + click) * intensidad


def piano_aislado(m, dur=2.5):
    """Piano lejano con armonicos naturales — como si sonara en otro cuarto."""
    t = t_arr(dur + 1.2)
    f = hz(m)
    x = sum(np.sin(2 * np.pi * f * h * t * (1 + 0.0003 * h ** 2)) *
            np.exp(-t * (0.9 + h * 0.6)) / h for h in range(1, 8))
    x += 0.08 * rng.standard_normal(len(t)) * np.exp(-t * 90)
    return lp(x, 2600) * env_adsr(len(t), 0.005, 0.9, 0.25, 1.0, dur) * 0.3


def pad_tunel(notas_midi, dur, lo=200, hi=3000):
    """Pad supersaw filtrado: la 'vision de tunel' que se abre seccion a seccion."""
    t = t_arr(dur + 1.4)
    out = np.zeros((2, len(t)))
    for m in notas_midi:
        for v in range(5):
            det = (v - 2) * 0.006
            out += paneo(saw(hz(m), t, det) / 5, (v - 2) / 2 * 1.3)
    e = env_adsr(len(t), 0.45, 0.5, 0.7, 1.0, dur)
    out = bp(out, max(lo, 30), min(hi, SR * 0.45), 2)
    return out * e * 0.14


def lead_penal(m, dur, confianza=0.5, desde=None):
    """Lead que empieza dubitativo (ataque lento, vibrato chico) y se vuelve decidido."""
    t = t_arr(dur + 0.4)
    vib_depth = 0.003 + 0.005 * confianza
    vib_rate = 4.5 + 1.5 * confianza
    vib = 1 + vib_depth * np.sin(2 * np.pi * vib_rate * t) * np.clip((t - 0.1) * 5, 0, 1)
    f = np.full(len(t), float(hz(m))) * vib
    if desde is not None:
        g = min(len(t), int(0.06 * SR))
        f[:g] *= (hz(desde) / hz(m)) ** (1 - np.arange(g) / g)
    ph = np.cumsum(f) / SR
    # Mezcla saw/sine: mas sine cuando tentativo, mas saw cuando decidido
    x = saw(1.0, ph) * (0.3 + 0.4 * confianza) + np.sin(2 * np.pi * ph) * (0.7 - 0.4 * confianza)
    x += 0.15 * saw(1.0, ph * 1.004)
    x = lp(x, 1800 + 2800 * confianza)
    atk = 0.07 - 0.05 * confianza
    e = env_adsr(len(t), atk, 0.2, 0.55 + 0.25 * confianza, 0.2, dur)
    return x * e * 0.2


def bombo_penal():
    """Bombo en capas: sub pesado + punch + click agudo."""
    t = t_arr(0.5)
    sub = np.sin(2 * np.pi * np.cumsum(42 + 16 * np.exp(-t * 20)) / SR) * np.exp(-t * 5.5)
    punch = np.sin(2 * np.pi * np.cumsum(58 + 150 * np.exp(-t * 60)) / SR) * np.exp(-t * 28)
    click = hp(rng.standard_normal(len(t)), 3200) * np.exp(-t * 380) * 0.5
    return np.tanh((sub * 0.85 + punch * 0.8 + click) * 1.4)


def snare_penal():
    """Redoblante con cuerpo + bordona."""
    t = t_arr(0.3)
    cuerpo = (np.sin(2 * np.pi * 190 * t) + 0.4 * np.sin(2 * np.pi * 325 * t)) * np.exp(-t * 20)
    bordona = bp(rng.standard_normal(len(t)), 1300, 8500) * np.exp(-t * 13)
    return np.tanh((cuerpo * 0.65 + bordona * 0.85) * 1.3)


def hat_penal(abierto=False):
    """Hi-hat metalico: ondas cuadradas inarmonicas."""
    t = t_arr(0.35 if abierto else 0.07)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (215, 310, 385, 540, 565, 830))
    x = hp(bp(x, 6500, 14500), 7200) * np.exp(-t * (10 if abierto else 55))
    return x * 0.2


def rim_penal():
    """Rimshot seco."""
    t = t_arr(0.04)
    return (bp(rng.standard_normal(len(t)), 1800, 2800) * 0.5 +
            np.sin(2 * np.pi * 880 * t)) * np.exp(-t * 120) * 0.3


def platillo_invertido(dur):
    """Swell hacia la entrada de la siguiente seccion."""
    t = t_arr(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * 1.5 * t)) for f in (215, 310, 385, 540, 565, 830))
    x = hp(x + rng.standard_normal(len(t)) * 1.8, 4500) * np.exp(-t * 2.5)
    x = x[::-1]
    return np.stack([x, np.roll(x, 380)]) * 0.06


def barrido_hp(st, t0, dur):
    """Build: filtro HP que sube (la pelota apoyada, el mundo vuelve)."""
    i0, L = int(t0 * SR), int(dur * SR)
    if i0 + L > st.shape[1]:
        L = st.shape[1] - i0
    if L <= 0:
        return st
    seg = st[:, i0:i0 + L]
    cortes = [20, 300, 700, 1400, 2800, 4500]
    vers = [seg] + [hp(seg, c, 2) for c in cortes[1:]]
    pos = np.linspace(0, len(vers) - 1, seg.shape[1])
    out = np.zeros_like(seg)
    for k, v in enumerate(vers):
        w = np.clip(1 - np.abs(pos - k), 0, 1)
        out += v * w
    st[:, i0:i0 + L] = out
    return st


# -- Composicion --------------------------------------------------------------
def render():
    total = sum(c for _, c in SECCIONES)                   # 46 compases
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'piano', 'pad', 'lead', 'pasos', 'fx']}
    sc = np.zeros(N)
    K, SN, H, HO, RI = bombo_penal(), snare_penal(), hat_penal(), hat_penal(True), rim_penal()
    ir = reverb_ir(dur=2.2, brillo=6500, seed=42)
    ir_piano = reverb_ir(dur=3.8, decay=1.8, brillo=3500, seed=43)
    ir_sala = reverb_ir(dur=0.6, decay=8, brillo=8500, seed=44)
    notas808 = []
    ini = {}
    c0 = 0
    hum = lambda s=0.004: rng.normal(0, s)

    for nombre, largo in SECCIONES:
        ini[nombre] = c0
        for c in range(largo):
            cg = c0 + c
            ac = PROG[cg % 4]
            frase = cg % 4
            ultimo = c == largo - 1
            t_c = cg * COMPAS

            # -- Pad: entra en intro bar 1, se abre seccion a seccion --
            if nombre in BP_PAD and not (nombre == 'intro' and c == 0):
                lo, hi = BP_PAD[nombre]
                notas_ac = [n(x) for x in ACORDES[ac]]
                poner(bus['pad'], pad_tunel(notas_ac, COMPAS, lo, hi), t_c)

            # -- Piano --
            if nombre == 'intro' and c in PIANO_INTRO:
                poner(bus['piano'], paneo(piano_aislado(n(PIANO_INTRO[c]), COMPAS * 0.8),
                      0.12 * (-1) ** c), t_c + hum(0.008))
            elif nombre == 'final' and c in PIANO_FINAL:
                poner(bus['piano'], paneo(piano_aislado(n(PIANO_FINAL[c]), COMPAS * 0.8),
                      0.12 * (-1) ** c), t_c + hum(0.008))
            elif nombre == 'verso' and c % 2 == 0:
                raiz_ac = n(ACORDES[ac][0])
                poner(bus['piano'], paneo(piano_aislado(raiz_ac, COMPAS * 0.5), 0.15), t_c + hum())
            elif nombre == 'puente' and c < 3:
                notas_p = {0: 'Gb2', 1: 'F3', 2: 'Bb2'}
                poner(bus['piano'], paneo(piano_aislado(n(notas_p[c]), COMPAS * 0.7),
                      0.1 * (-1) ** c), t_c + hum(0.008))

            # -- Lead --
            lead_notas = None
            if nombre == 'ganchoA':
                lead_notas = LEAD_A[frase]
            elif nombre == 'verso':
                lead_notas = LEAD_VERSO[frase]
            elif nombre == 'ganchoB':
                lead_notas = LEAD_B[frase]
            elif nombre == 'ganchoC':
                lead_notas = LEAD_C[frase]
            if lead_notas:
                conf = CONFIANZA.get(nombre, 0.5)
                previa = None
                for (s, nota, l) in lead_notas:
                    m = n(nota)
                    x = lead_penal(m, l * S16 * 0.95, conf,
                                   previa if previa and abs(previa - m) <= 5 else None)
                    poner(bus['lead'], paneo(x, -0.1 + 0.05 * (s % 4)), paso(cg, s) + hum(0.003))
                    previa = m

            # -- Pisadas: se frenan seccion a seccion --
            if nombre == 'intro':
                for s in [0, 6, 11]:
                    poner(bus['pasos'], paneo(pisada(0.5 + 0.1 * c), 0.25 * (-1) ** s),
                          t_c + s * S16 + hum(0.007))
            elif nombre == 'ganchoA':
                for s in [0, 8]:
                    poner(bus['pasos'], paneo(pisada(0.55), 0.2 * (-1) ** c),
                          t_c + s * S16 + hum(0.01))
            elif nombre == 'verso':
                if c % 2 == 0:
                    poner(bus['pasos'], paneo(pisada(0.35), 0.15 * (-1) ** c), t_c + hum(0.015))
                elif c in (1, 5):
                    poner(bus['pasos'], paneo(pisada(0.25), -0.15), t_c + 10 * S16 + hum(0.02))
            elif nombre == 'build' and c == 0:
                poner(bus['pasos'], paneo(pisada(0.65), 0), t_c)          # ultimo paso firme
            elif nombre == 'puente' and ultimo:
                poner(bus['pasos'], paneo(pisada(0.2), 0.3), t_c + 14 * S16)   # eco lejano
            elif nombre == 'ganchoC' and c == 0:
                poner(bus['pasos'], paneo(pisada(1.0), 0), t_c)           # EL paso
            elif nombre == 'final' and c == 2:
                poner(bus['pasos'], paneo(pisada(0.12), -0.2), t_c + 8 * S16)

            # -- Bateria --
            con_drums = nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC')
            if con_drums:
                # Kick
                if nombre == 'verso':
                    kicks = [0, 10]
                elif nombre == 'ganchoC':
                    kicks = [0, 4, 6, 10] if frase != 3 else [0, 4, 6, 10, 14]
                else:
                    kicks = [0, 6, 10] if frase != 3 else [0, 6, 10, 14]
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.9, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.2) * 16)[None], paso(cg, s, False))
                # Redoblante en el tercer tiempo (medio tiempo)
                poner(bus['drums'], paneo(SN, 0.04) * 0.7, paso(cg, 8, False) + hum(0.002))
                # Hi-hats
                if nombre == 'verso':
                    for s in range(0, 16, 2):
                        ac_h = 0.8 if s % 4 == 0 else 0.4
                        poner(bus['drums'], paneo(H * ac_h * (1 - rng.uniform(0, 0.15)), 0.3),
                              paso(cg, s) + hum(0.002))
                else:
                    redoble = frase == 3
                    for s in range(0, 16):
                        if redoble and s >= 12:
                            break
                        ac_h = [0.85, 0.35, 0.6, 0.35][s % 4]
                        poner(bus['drums'], paneo(H * ac_h * (1 - rng.uniform(0, 0.18)), 0.3),
                              paso(cg, s) + hum(0.002))
                    if redoble:
                        for j in range(6):
                            poner(bus['drums'], paneo(repitch(H, 1 + j * 0.05) *
                                  (0.4 + 0.5 * j / 6), 0.3), cg * COMPAS + 12 * S16 + j * BEAT / 6)
                    # Hat abierto a contratiempo en frases impares
                    if frase in (1, 3) and nombre != 'verso':
                        ho = HO[:int(2 * S16 * SR)].copy()
                        ho[-300:] *= np.linspace(1, 0, 300)
                        poner(bus['drums'], paneo(ho, -0.25) * 0.7, paso(cg, 6))
                # Rim en el verso
                if nombre == 'verso' and frase in (1, 3):
                    poner(bus['drums'], paneo(RI, 0.4) * 0.5, paso(cg, 12))

            # Puente: bombo minimalista + redoble al final
            if nombre == 'puente':
                if c % 2 == 0:
                    poner(bus['drums'], paneo(K, 0) * 0.6, t_c)
                    poner(sc[None], np.exp(-t_arr(0.2) * 16)[None], t_c)
                if ultimo:
                    for j in range(10):
                        poner(bus['drums'], paneo(repitch(SN, 1 + j * 0.008), 0) * (0.2 + 0.06 * j),
                              t_c + j * COMPAS / 10)

            # -- 808 --
            if nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC'):
                r = n(RAIZ_808[ac])
                if nombre == 'verso':
                    p808 = [(0, 0, 10)]
                elif nombre == 'ganchoA':
                    p808 = [(0, 0, 4), (6, 12, 2), (10, 0, 4)]
                    if frase == 3:
                        p808 = [(0, 0, 4), (6, 12, 2), (10, 0, 3), (14, 5, 2)]
                elif nombre == 'ganchoB':
                    p808 = [(0, 0, 3), (4, 7, 2), (6, 12, 2), (10, 0, 4)]
                    if frase == 3:
                        p808 = [(0, 0, 3), (4, 7, 2), (6, 12, 2), (10, 0, 3), (14, 5, 2)]
                else:  # ganchoC
                    p808 = [(0, 0, 2), (4, 12, 2), (6, 7, 2), (8, 0, 2), (10, 12, 4)]
                    if frase == 3:
                        p808 = [(0, 0, 2), (4, 12, 2), (6, 7, 2), (10, 0, 3), (14, 5, 2)]
                for s, intervalo, l in p808:
                    glide = 0.1 if (s > 0 and intervalo == 12) else 0
                    notas808.append((paso(cg, s, False), r + intervalo, l * S16, glide))
            if nombre == 'puente' and c % 2 == 0:
                r = n(RAIZ_808[PROG[cg % 4]])
                notas808.append((t_c, r, COMPAS * 2, 0))

        c0 += largo

    T = lambda comp: comp * COMPAS

    # Platillos invertidos antes de ganchoB y ganchoC
    for sec in ('ganchoB', 'ganchoC'):
        pc = platillo_invertido(BEAT * 4)
        poner(bus['fx'], pc, T(ini[sec]) - pc.shape[1] / SR)

    # 808
    if notas808:
        b = ochocientos(notas808, N / SR, 2.0)
        bus['bajo'] += paneo(lp(b, 4200), 0)

    # -- Mezcla ----------------------------------------------------------------
    piano_m = con_reverb(hp(bus['piano'], 80), ir_piano, 0.55) * 0.9
    pad_m = con_reverb(hp(bus['pad'], 100), ir, 0.28) * (1 - np.clip(sc, 0, 1) * 0.35)
    lead_m = hp(bus['lead'], 200)
    lead_m = saturar(lead_m, 0.22)
    lead_m = delay_pingpong(lead_m, BEAT * 0.75, 0.32, 0.2)
    lead_m = con_reverb(lead_m * (1 - np.clip(sc, 0, 1) * 0.3), ir, 0.22)
    pasos_m = con_reverb(bus['pasos'], ir_sala, 0.18)
    drums_m = con_reverb(saturar(bus['drums'], 0.12), ir_sala, 0.06)
    bajo_m = bus['bajo'] * (1 - 0.2 * np.clip(sc, 0, 1))

    mix = drums_m + bajo_m * 0.8 + piano_m + pad_m * 0.85 + lead_m + pasos_m * 1.1 + bus['fx']

    # Build: filtro HP que sube + silencio antes de la entrada
    build_end = T(ini['build'] + 2)
    mix = barrido_hp(mix, T(ini['build']), COMPAS * 2 - BEAT * 0.5)
    s0 = int((build_end - BEAT * 0.5) * SR)
    s1 = min(int(build_end * SR), mix.shape[1])
    mix[:, s0:s1] *= 0.05

    # Ganancia por seccion (intro/final mas bajos, build un poco abajo)
    g = np.ones(mix.shape[1])
    for nombre_s, valor in [('intro', 2.8), ('final', 2.5), ('build', 0.7), ('puente', 1.2)]:
        largo_s = dict(SECCIONES)[nombre_s]
        a_ = int(T(ini[nombre_s]) * SR)
        b_ = min(mix.shape[1], int(T(ini[nombre_s] + largo_s) * SR))
        g[a_:b_] = valor
    g = lp(g, 3)
    mix = mix * g

    mix = hp(mix, 28)
    # Normalizar por percentil 99.95: un ataque aislado no baja todo el tema
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
    f = os.path.join(out, '2026-10-20-1.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    dur = audio.shape[0] / SR
    print(f'{os.path.relpath(f, RAIZ)}  {dur:.0f} s')
