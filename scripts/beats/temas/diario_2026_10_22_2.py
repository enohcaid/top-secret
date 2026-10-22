"""ESPEJO — beat de trap del club, compuesto a mano.

Concepto: Mirarse al espejo del vestuario antes de salir a la cancha — la cara
que te devuelve no es la tuya de siempre; es la de alguien que va a dejar todo;
en cada sección la imagen se define más hasta que en el gancho C ya no te
reconocés — te convertiste en otra cosa.

Emoción por sección:
  intro (4c):    el vestuario vacío, la luz fría del espejo — solo pad y un reflejo lejano
  gancho A (8c): te mirás: el lead canta y el reflejo contesta desde lejos (delay 6 s16)
  verso (6c):    duda, introspección — piano solo y pad, sin reflejo (te diste vuelta)
  build (2c):    tensión, el momento de decidir quién vas a ser
  gancho B (8c): la imagen se acerca — delay 3 s16, melodía variada
  puente (4c):   oscuridad, el espejo se oscurece — tresillos pesados, lead grave, sin reflejo
  gancho C (8c): el reflejo se alineó — suena simultáneo y al unísono; ya no hay eco,
                 sos tu otro yo
  final (4c):    salís del vestuario, el reflejo queda solo un momento y se apaga

Rasgo distintivo: "reflejo desfasado" — eco del lead transportado una 4ta justa arriba
y retrasado, que se acerca sección a sección (delay 6→3→0 semicorcheas); en el gancho C
el reflejo suena simultáneo y a la misma altura — se alineó con la persona.

Estructura: intro 4 · gancho A 8 · verso 6 · build 2 · gancho B 8 · puente 4 · gancho C 8 · final 4
  = 44 compases, 114 BPM, sol menor → ~95 s

Recursos: reflejo desfasado con convergencia temporal (firma del tema), pad de cristal
(sines con chorus frío), piano de vestuario (notas sueltas, reverb largo), lead limpio
con sub-octava, 808 melódico con saltos de octava y glide, platillo invertido en las
transiciones

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_22_2.py
Salida: fuentes/beats/salida/diario/2026-10-22-2.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, env_adsr, poner, repitch,  # noqa: E402
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar,
                      ochocientos, clap)

BPM = 114
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.13 * S16
rng = np.random.default_rng(202610222)
NOM = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
       'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOM[nombre[:-1]]


def paso(c, s, swing=True):
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


# ── Armonía: Gm → Bb → Cm → D (i → III → iv → V, sol menor) ────────────────
ACORDES = {
    'Gm':  ['G3', 'Bb3', 'D4', 'F4'],        # Gm7
    'Bb':  ['Bb3', 'D4', 'F4', 'A4'],         # Bbmaj7
    'Cm':  ['C3', 'Eb3', 'G3', 'Bb3'],        # Cm7
    'D':   ['D3', 'F#3', 'A3', 'C4'],         # D7 (dominante)
}
RAIZ_808 = {'Gm': 'G1', 'Bb': 'Bb1', 'Cm': 'C2', 'D': 'D2'}
PROG = ['Gm', 'Bb', 'Cm', 'D']

SECCIONES = [
    ('intro', 4), ('ganchoA', 8), ('verso', 6), ('build', 2),
    ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 4),
]

# ── Melodías escritas a mano ────────────────────────────────────────────────
# Gancho A: introspectivo, preguntándose (quién sos hoy)
LEAD_A = [
    [(0, 'D5', 2), (4, 'G5', 2), (8, 'F5', 3), (12, 'D5', 1), (14, 'Bb4', 2)],
    [(0, 'F5', 2), (4, 'D5', 2), (8, 'Bb4', 4)],
    [(0, 'Eb5', 3), (4, 'G5', 2), (8, 'F5', 2), (12, 'D5', 4)],
    [(0, 'A4', 2), (4, 'C5', 2), (8, 'D5', 6)],
]
# Gancho B: más movimiento, la imagen se acerca
LEAD_B = [
    [(0, 'D5', 2), (4, 'G5', 2), (8, 'A5', 3), (12, 'G5', 1), (14, 'F5', 2)],
    [(0, 'F5', 3), (4, 'D5', 2), (8, 'Bb4', 2), (12, 'C5', 2)],
    [(0, 'Eb5', 2), (4, 'G5', 3), (8, 'A5', 2), (12, 'G5', 4)],
    [(0, 'F#5', 2), (4, 'A5', 2), (8, 'D5', 6)],
]
# Gancho C: transformado, alto, resuelto — ya no pregunta, afirma
LEAD_C = [
    [(0, 'G5', 3), (4, 'Bb5', 2), (8, 'A5', 2), (10, 'G5', 1), (12, 'F5', 2), (14, 'D5', 2)],
    [(0, 'D5', 2), (4, 'F5', 2), (8, 'Bb5', 4)],
    [(0, 'G5', 3), (4, 'Bb5', 2), (8, 'D6', 4)],
    [(0, 'A5', 3), (4, 'F#5', 2), (8, 'D5', 4)],
]

# ── Parámetros del reflejo (firma del tema) ────────────────────────────────
# delay = semicorcheas de retraso; transp = semitonos arriba; vol/brillo del reflejo
REFL = {
    'intro':   {'delay': 8, 'transp': 5, 'vol': 0.18, 'brillo': 1200},
    'ganchoA': {'delay': 6, 'transp': 5, 'vol': 0.38, 'brillo': 1500},
    'ganchoB': {'delay': 3, 'transp': 5, 'vol': 0.50, 'brillo': 2200},
    'ganchoC': {'delay': 0, 'transp': 0, 'vol': 0.55, 'brillo': 3200},  # unísono
    'final':   {'delay': 0, 'transp': 0, 'vol': 0.40, 'brillo': 1400},
}


# ── Instrumentos del tema ──────────────────────────────────────────────────
def lead_espejo(m, dur, desde=None):
    """Lead principal: saw limpio con sub-octava sine, vibrato suave."""
    t = t_arr(dur + 0.3)
    f = np.full(len(t), float(hz(m)))
    if desde is not None:
        g = min(len(t), int(0.06 * SR))
        f[:g] *= (hz(desde) / hz(m)) ** (1 - np.arange(g) / g)
    f *= 1 + 0.004 * np.sin(2 * np.pi * 5.0 * t) * np.clip((t - 0.15) * 4, 0, 1)
    ph = np.cumsum(f) / SR
    x = 2 * (ph - np.floor(ph + 0.5)) * 0.55          # saw
    x += 0.35 * np.sin(2 * np.pi * ph)                 # sub sine fundamental
    x = lp(x, 3200)
    return x * env_adsr(len(t), 0.008, 0.15, 0.6, 0.15, dur) * 0.22


def reflejo_inst(m, dur, brillo=1500):
    """Reflejo: eco filtrado del lead con AM sutil — el vidrio del espejo vibra."""
    t = t_arr(dur + 0.5)
    f = np.full(len(t), float(hz(m)))
    f *= 1 + 0.003 * np.sin(2 * np.pi * 4.2 * t) * np.clip((t - 0.2) * 3, 0, 1)
    ph = np.cumsum(f) / SR
    x = 2 * (ph - np.floor(ph + 0.5)) * 0.35           # saw más suave
    x += 0.55 * np.sin(2 * np.pi * ph)                  # más sine = más etéreo
    am = 0.82 + 0.18 * np.sin(2 * np.pi * 6.8 * t)     # AM: el espejo tiembla
    x = lp(x * am, brillo)
    return x * env_adsr(len(t), 0.02, 0.25, 0.45, 0.25, dur) * 0.18


def pad_cristal(notas_midi, dur, brillo=1000):
    """Pad de cristal: sines con chorus frío — la luz del espejo."""
    t = t_arr(dur + 1.5)
    out = np.zeros((2, len(t)))
    for m in notas_midi:
        f = hz(m)
        for v in range(4):
            det = (v - 1.5) * 0.004
            x = np.sin(2 * np.pi * f * (1 + det) * t)
            out += paneo(x, (v - 1.5) * 0.5) / (4 * max(len(notas_midi), 1))
    e = env_adsr(len(t), 0.45, 0.55, 0.7, 1.0, dur)
    return lp(out, brillo) * e * 0.14


def piano_vest(m, dur=2.5):
    """Piano de vestuario: oscuro, reverberante, notas sueltas en el silencio."""
    t = t_arr(dur + 0.5)
    f = hz(m)
    x = sum(np.sin(2 * np.pi * f * h * t * (1 + 0.0003 * h ** 2)) *
            np.exp(-t * (0.65 + h * 0.5)) / h for h in range(1, 8))
    x += 0.12 * rng.standard_normal(len(t)) * np.exp(-t * 100)
    return lp(x, 2400) * env_adsr(len(t), 0.005, 0.3, 0.4, 0.4, dur) * 0.3


def bombo_vest():
    """Bombo con click agudo — eco en el azulejo del vestuario."""
    t = t_arr(0.48)
    sub = np.sin(2 * np.pi * np.cumsum(45 + 15 * np.exp(-t * 22)) / SR) * np.exp(-t * 6.5)
    punch = np.sin(2 * np.pi * np.cumsum(60 + 135 * np.exp(-t * 58)) / SR) * np.exp(-t * 26)
    click = hp(rng.standard_normal(len(t)), 3500) * np.exp(-t * 400) * 0.55
    return np.tanh((sub * 0.85 + punch * 0.85 + click) * 1.5)


def redoblante_comp():
    """Redoblante compacto: corto, apretado."""
    t = t_arr(0.28)
    cuerpo = (np.sin(2 * np.pi * 195 * t) + 0.5 * np.sin(2 * np.pi * 350 * t)) * np.exp(-t * 26)
    ruido = bp(rng.standard_normal(len(t)), 1800, 9000) * np.exp(-t * 17)
    return np.tanh((cuerpo * 0.65 + ruido * 0.85) * 1.5)


def hat_fino(abierto=False):
    """Hi-hat fino, shimmer."""
    dur = 0.35 if abierto else 0.065
    t = t_arr(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
    return hp(bp(x, 6500, min(12000, SR * 0.45)), 7000) * np.exp(-t * (10 if abierto else 58)) * 0.2


def platillo_invertido(dur):
    t = t_arr(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * 1.7 * t)) for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
    x = hp(x + rng.standard_normal(len(t)) * 2, 4000) * np.exp(-t * 2.2)
    return np.stack([x[::-1], np.roll(x[::-1], 400)]) * 0.065


# ── Composición ────────────────────────────────────────────────────────────
def render():
    total = sum(c for _, c in SECCIONES)
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'pad', 'lead', 'reflejo', 'piano', 'fx']}
    sc = np.zeros(N)
    K, SN, CL = bombo_vest(), redoblante_comp(), clap(seed=1114)
    H, HO = hat_fino(), hat_fino(abierto=True)
    ir = reverb_ir(dur=2.8, brillo=5500, seed=50)
    ir_sala = reverb_ir(dur=0.7, decay=7, brillo=7000, seed=51)
    ir_espejo = reverb_ir(dur=3.2, brillo=4000, seed=52)     # reverb largo para el reflejo
    notas808 = []
    hum = lambda s=0.004: rng.normal(0, s)
    vel = lambda: 1 - rng.uniform(0, 0.18)

    ini = {}
    c0 = 0
    for nombre, largo in SECCIONES:
        ini[nombre] = c0
        for c in range(largo):
            cg = c0 + c
            frase = c % 4
            ac = PROG[frase]
            ultimo = c == largo - 1
            t_c = cg * COMPAS
            mitad2 = c >= 4

            # ── Pad de cristal: todas las secciones ──
            notas_ac = [n(x) for x in ACORDES[ac]]
            br_p = 800 if nombre in ('intro', 'verso', 'final') else 600 if nombre == 'puente' else 1200
            vl_p = 0.65 if nombre == 'final' else (0.7 if nombre == 'verso' else 1.0)
            poner(bus['pad'], pad_cristal(notas_ac, COMPAS, br_p) * vl_p, t_c)

            # ── Lead + Reflejo ──
            if nombre in ('ganchoA', 'ganchoB', 'ganchoC', 'puente'):
                fr = (LEAD_C[frase] if nombre == 'ganchoC' else
                      LEAD_B[frase] if nombre == 'ganchoB' and mitad2 else
                      LEAD_A[frase][:3] if nombre == 'puente' else   # sparser
                      LEAD_A[frase])
                oct_s = -12 if nombre == 'puente' else 0
                previa = None
                for (s, nta, l) in fr:
                    m = n(nta) + oct_s
                    x = lead_espejo(m, l * S16 * 0.9,
                                    previa if previa and abs(previa - m) <= 4 else None)
                    if nombre == 'puente':
                        x = np.tanh(x * 2.5) * 0.65      # driven, oscuro
                    poner(bus['lead'], paneo(x, 0.1), paso(cg, s) + hum(0.003))
                    previa = m
                    # Reflejo (solo en secciones con reflejo)
                    if nombre in REFL:
                        r = REFL[nombre]
                        m_r = m + r['transp']
                        x_r = reflejo_inst(m_r, l * S16 * 0.85, r['brillo'])
                        poner(bus['reflejo'], paneo(x_r, -0.25) * r['vol'],
                              paso(cg, s) + r['delay'] * S16 + hum(0.002))

            # Intro: hints filtradas del lead con reflejo lejano (compases 2-3)
            if nombre == 'intro' and c >= 2:
                r = REFL['intro']
                for (s, nta, l) in LEAD_A[c - 2][:2]:
                    m = n(nta)
                    x_h = lp(lead_espejo(m, l * S16 * 0.9), 1400) * 0.25
                    poner(bus['lead'], paneo(x_h, 0), paso(cg, s))
                    x_r = reflejo_inst(m + r['transp'], l * S16 * 0.85, r['brillo'])
                    poner(bus['reflejo'], paneo(x_r, -0.25) * r['vol'],
                          paso(cg, s) + r['delay'] * S16)

            # Final: reflejo solo (la imagen queda en el espejo después de irte)
            if nombre == 'final' and c < 2:
                r = REFL['final']
                for (s, nta, l) in LEAD_C[frase][:2]:
                    x_r = reflejo_inst(n(nta), l * S16 * 1.2, r['brillo'])
                    poner(bus['reflejo'], paneo(x_r, -0.25) * r['vol'] * (1 - c * 0.4),
                          paso(cg, s))

            # ── Piano en el verso: notas sueltas, introspectivas ──
            if nombre == 'verso':
                root_p = n(ACORDES[ac][0])
                if c in (0, 2, 4):
                    poner(bus['piano'], paneo(piano_vest(root_p, COMPAS * 0.8), -0.15),
                          paso(cg, 0, False) + hum())
                if c == 3:
                    poner(bus['piano'], paneo(piano_vest(n(ACORDES[ac][2]), BEAT * 2.5), 0.18),
                          paso(cg, 4, False) + hum())

            # ── Batería ──
            if nombre in ('ganchoA', 'verso', 'ganchoB', 'puente', 'ganchoC'):
                # Bombo
                if nombre == 'puente':
                    for k in range(6):       # tresillos con un hueco
                        if k == 3:
                            continue
                        t_k = cg * COMPAS + k * COMPAS / 6
                        poner(bus['drums'], paneo(K, 0) * 0.88, t_k + hum(0.002))
                        poner(sc[None], np.exp(-t_arr(0.25) * 14)[None], t_k)
                else:
                    kicks = ([0, 10] if frase != 3 else [0, 8, 13]) if nombre == 'verso' else \
                            ([0, 6, 10, 14] if frase == 3 else [0, 6, 10])
                    for sk in kicks:
                        poner(bus['drums'], paneo(K, 0) * 0.92,
                              paso(cg, sk, False) + hum(0.002))
                        poner(sc[None], np.exp(-t_arr(0.25) * 14)[None],
                              paso(cg, sk, False))

                # Redoblante en el tercer tiempo (medio tiempo)
                if nombre != 'puente':
                    sn = paneo(SN, 0.04) * 0.7
                    if nombre in ('ganchoB', 'ganchoC'):       # + clap en ganchos tardíos
                        cl_ = paneo(CL, -0.05) * 0.3
                        cl_ = np.pad(cl_, ((0, 0), (0, max(0, sn.shape[1] - cl_.shape[1]))))
                        sn = sn + cl_[:, :sn.shape[1]]
                    if not (nombre == 'verso' and frase % 2 == 0):
                        poner(bus['drums'], sn, paso(cg, 8, False) + hum(0.002))
                elif frase % 2 == 1:
                    poner(bus['drums'], paneo(SN, 0.04) * 0.55,
                          paso(cg, 8, False) + hum(0.002))

                # Hi-hats
                if nombre == 'puente':
                    for kh in range(12):     # tresillos
                        poner(bus['drums'],
                              paneo(H * (0.6 if kh % 3 == 0 else 0.3), 0.3),
                              cg * COMPAS + kh * COMPAS / 12 + hum(0.002))
                else:
                    ph_ = 2 if nombre == 'verso' else 1          # corcheas en verso, s16 en ganchos
                    redo = frase == 3 and nombre != 'verso'
                    for sh in range(0, 16, ph_):
                        if redo and sh >= 12:
                            break
                        poner(bus['drums'],
                              paneo(H * [1.0, 0.38, 0.62, 0.38][sh % 4] * vel(), 0.3),
                              paso(cg, sh) + hum(0.002))
                    if redo:                                     # redoble al final de frase 3
                        sub = 6 if (c // 4) % 2 == 0 else 8
                        for jr in range(sub):
                            poner(bus['drums'],
                                  paneo(repitch(H, 1 + jr * 0.05) * (0.35 + 0.5 * jr / sub), 0.3),
                                  cg * COMPAS + 12 * S16 + jr * BEAT / sub)
                    # Hat abierto a contratiempo
                    if frase in (1, 3) and nombre not in ('verso', 'puente'):
                        ho = HO[:min(len(HO), int(2 * S16 * SR))].copy()
                        if len(ho) > 250:
                            ho[-250:] *= np.linspace(1, 0, 250)
                        poner(bus['drums'], paneo(ho, -0.25) * 0.65, paso(cg, 6))

            # ── 808 ──
            if nombre in ('ganchoA', 'verso', 'ganchoB', 'puente', 'ganchoC'):
                r8 = n(RAIZ_808[ac])
                bp8 = ([(0, 0, 6), (10, 0, 4)] if nombre == 'verso' else
                       [(0, 0, 14)] if nombre == 'puente' and frase % 2 == 0 else
                       [(0, 0, 7), (8, 12, 7)] if nombre == 'puente' else
                       [(0, 0, 5), (6, 12, 3), (10, 0, 3), (14, 7, 2)] if frase == 3 else
                       [(0, 0, 5), (6, 12, 3), (10, 0, 5)])
                for s8, iv, l8 in bp8:
                    gl = 0.12 if (s8 == 0 and frase == 0 and c > 0) or \
                                 (nombre == 'puente' and s8 == 8) else 0
                    notas808.append((paso(cg, s8, False), r8 + iv, l8 * S16, gl))

        c0 += largo

    T = lambda comp: comp * COMPAS

    # ── Platillo invertido antes de ganchos B y C ──
    for sec in ('ganchoB', 'ganchoC'):
        pc = platillo_invertido(BEAT * 4)
        poner(bus['fx'], pc, T(ini[sec]) - pc.shape[1] / SR)

    # ── Build: redoble que acelera ──
    b0 = ini['build']
    ts = ([b0 * COMPAS + k * BEAT / 2 for k in range(4)] +
          [b0 * COMPAS + 2 * BEAT + k * S16 for k in range(8)] +
          [(b0 + 1) * COMPAS + k * S16 / 2 for k in range(24)])
    for j, tt in enumerate(ts):
        if tt < T(b0 + 2) - BEAT * 0.5:
            poner(bus['drums'], paneo(repitch(SN, 1 + j * 0.01), 0) *
                  (0.22 + 0.5 * j / len(ts)), tt)
    # Silencio en el último medio tiempo del build
    sil_a = int((T(b0 + 2) - BEAT * 0.4) * SR)
    sil_b = min(int(T(b0 + 2) * SR), N)

    # ── 808 ──
    if notas808:
        bus['bajo'] += paneo(lp(ochocientos(notas808, N / SR, 2.3), 3500), 0) * 0.85

    # ── Mezcla ──
    pad_m = con_reverb(lp(hp(bus['pad'], 75), 2200), ir, 0.32)
    lead_m = con_reverb(delay_pingpong(saturar(hp(bus['lead'], 200), 0.15),
                                       BEAT * 0.75, 0.25, 0.15), ir, 0.2)
    # Reflejo con reverb más largo (el espejo resuena más)
    ref_m = con_reverb(delay_pingpong(hp(bus['reflejo'], 180), BEAT, 0.35, 0.2),
                       ir_espejo, 0.45)
    piano_m = con_reverb(hp(bus['piano'], 140), ir_espejo, 0.4)
    drums_m = con_reverb(saturar(bus['drums'], 0.12), ir_sala, 0.07)
    bajo_m = bus['bajo'] * (1 - np.clip(sc, 0, 1) * 0.25)
    duck = 1 - np.clip(sc, 0, 1) * 0.38
    mix = drums_m + bajo_m * 0.9 + (pad_m + lead_m + ref_m + piano_m) * duck + bus['fx'] * 0.55

    # Silencio del build
    mix[:, sil_a:sil_b] *= 0.04

    # ── Ganancia por sección ──
    g = np.ones(mix.shape[1])
    for ns, val in [('intro', 10.0), ('final', 8.5), ('build', 0.65), ('verso', 0.82)]:
        ls = dict(SECCIONES)[ns]
        a, b = int(T(ini[ns]) * SR), min(mix.shape[1], int(T(ini[ns] + ls) * SR))
        g[a:b] = val
    g = lp(g, 3)
    mix *= g

    # Build HP sweep
    i0_b = int(T(ini['build']) * SR)
    i1_b = min(int(T(ini['build'] + 2) * SR), mix.shape[1])
    Lb = i1_b - i0_b
    if Lb > 0:
        seg = mix[:, i0_b:i1_b].copy()
        vers = [seg] + [hp(seg, c_, 2) for c_ in (250, 600, 1200, 2400)]
        pos_ = np.linspace(0, len(vers) - 1, Lb)
        out_ = np.zeros_like(seg)
        for kv, v in enumerate(vers):
            out_ += v * np.clip(1 - np.abs(pos_ - kv), 0, 1)
        mix[:, i0_b:i1_b] = out_

    # ── Master ──
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
    path = os.path.join(out, '2026-10-22-2.wav')
    audio = render()
    sf.write(path, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(path, RAIZ)}  {audio.shape[0] / SR:.1f} s')
