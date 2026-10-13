"""MARCA — tema del día 2026-10-13-1.

Concepto: una derrota que dejó marca — el partido terminó pero el gol en contra
se repite en tu cabeza; cada noche lo revivís hasta que el dolor se transforma
en hambre y la próxima vez que pisás la cancha sos otro.

Emoción por sección:
  intro (4)    — el gol en contra repitiéndose, solo y a oscuras
  verso (8)    — la rumiación: pesado, lento, cada error vuelve
  gancho A (8) — la bronca que sube, el primer impulso de reacción
  build (2)    — punto de quiebre: todo se tensa
  gancho B (8) — te levantás, el dolor se vuelve rabia productiva
  puente (4)   — respirar hondo, prepararse
  gancho C (8) — volvés a la cancha transformado: la marca empuja
  final (4)    — el eco se apaga, la marca queda

Rasgo distintivo: eco que cae — un delay descendente (cada repetición más grave
  y oscura) sobre golpes de piano grave al inicio de cada sección; suena como el
  recuerdo hundiéndose. En el gancho C el eco sube en vez de caer: la marca dejó
  de ser peso y se volvió impulso.

Estructura (46 compases, 124 BPM, sol menor):
  intro 4 · verso 8 · gancho A 8 · build 2 · gancho B 8 · puente 4 · gancho C 8 · final 4

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_13_1.py
Salida: fuentes/beats/salida/diario/2026-10-13-1.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch,
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar,
                      ochocientos, clap)

BPM = 124
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.14 * S16
rng = np.random.default_rng(20261013)
NOMBRES = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
           'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOMBRES[nombre[:-1]]


def paso(c, s, swing=True):
    """Tiempo (seg) del paso s (semicorchea) del compás c, con swing en impares."""
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


hum = lambda s=0.004: rng.normal(0, s)  # noqa: E731


# ── Armonía (sol menor: i – VI – iv – V7) ───────────────────────────────────
PROG = ['Gm', 'Eb', 'Cm', 'D']
PAD_V = {'Gm': ['G3', 'Bb3', 'D4', 'F4'], 'Eb': ['Eb3', 'G3', 'Bb3', 'D4'],
         'Cm': ['C3', 'Eb3', 'G3', 'Bb3'], 'D': ['D3', 'F#3', 'A3', 'C4']}
RAIZ_808 = {'Gm': 'G1', 'Eb': 'Eb2', 'Cm': 'C2', 'D': 'D2'}

# Voicings del eco por sección (densidad del recuerdo)
ECO_VOICINGS = {
    'intro':   ['G2', 'Bb2', 'D3'],
    'verso':   ['G2', 'Bb2', 'D3'],
    'ganchoA': ['G2', 'Bb2', 'D3', 'G3'],
    'ganchoB': ['G2', 'Bb2', 'D3', 'G3'],
    'puente':  ['G2', 'D3'],
    'ganchoC': ['G2', 'Bb2', 'D3', 'G3'],
    'final':   ['G2'],
}
ECO_VEL = {'intro': 1.0, 'verso': 0.65, 'ganchoA': 0.85, 'ganchoB': 0.9,
           'puente': 0.75, 'ganchoC': 1.0, 'final': 0.8}

# ── Melodías ─────────────────────────────────────────────────────────────────
# Lead gancho A: determinación ascendente — (paso, nota, largo en s16)
LEAD_A = [
    [(0, 'D5', 2), (3, 'F5', 1), (4, 'G5', 3), (8, 'F5', 2), (11, 'D5', 3)],
    [(0, 'Eb5', 3), (4, 'D5', 2), (7, 'C5', 2), (10, 'Bb4', 4)],
    [(0, 'C5', 2), (3, 'Eb5', 2), (6, 'G5', 3), (10, 'F5', 2), (13, 'Eb5', 3)],
    [(0, 'D5', 4), (5, 'C5', 2), (8, 'A4', 3), (12, 'D5', 4)],
]
# Lead gancho B: más intenso, trepa más arriba
LEAD_B = [
    [(0, 'D5', 2), (3, 'F5', 1), (4, 'G5', 2), (7, 'Bb5', 3), (11, 'G5', 3)],
    [(0, 'F5', 2), (3, 'Eb5', 2), (6, 'D5', 2), (9, 'C5', 2), (12, 'Bb4', 4)],
    [(0, 'C5', 2), (3, 'Eb5', 1), (4, 'G5', 2), (7, 'Bb5', 3), (11, 'G5', 2), (14, 'Eb5', 2)],
    [(0, 'D5', 6), (8, 'F#5', 2), (11, 'D5', 5)],
]
# Lead gancho C: arriba, la transformación — línea nueva
LEAD_C = [
    [(0, 'G5', 3), (4, 'Bb5', 2), (7, 'C6', 3), (12, 'Bb5', 2), (14, 'G5', 2)],
    [(0, 'F5', 3), (4, 'Eb5', 2), (8, 'D5', 4), (14, 'C5', 2)],
    [(0, 'Eb5', 2), (3, 'G5', 2), (6, 'Bb5', 3), (10, 'C6', 2), (13, 'Bb5', 3)],
    [(0, 'G5', 6), (8, 'D5', 4)],
]

SECCIONES = [('intro', 4), ('verso', 8), ('ganchoA', 8), ('build', 2),
             ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 4)]


# ── Instrumentos propios del tema ────────────────────────────────────────────
def piano_marca(m, dur=2.0, vel=1.0):
    """Piano oscuro con ataque de martillo: el golpe que deja marca."""
    t = t_arr(dur)
    f = hz(m)
    x = sum(np.sin(2 * np.pi * f * h * t * (1 + 0.0005 * h * h))
            * np.exp(-t * (1.0 + h * 0.7)) / h for h in range(1, 8))
    click = 0.2 * rng.standard_normal(len(t)) * np.exp(-t * 100)
    return lp(x + click, 3200) * 0.38 * vel


def eco_que_cae(audio, n_ecos=4, intervalo=None, caida_semi=1.5, subir=False):
    """Delay descendente: cada repetición más grave y oscura.
    Con subir=True sube en vez de caer (transformación del gancho C)."""
    if intervalo is None:
        intervalo = BEAT * 1.5
    max_len = len(audio) + int((n_ecos * intervalo + 5) * SR)
    result = np.zeros(max_len)
    result[:len(audio)] += audio
    for k in range(1, n_ecos + 1):
        semi = k * caida_semi * (1 if subir else -1)
        ratio = 2 ** (semi / 12)
        eco = repitch(audio, ratio)
        corte = max(350, int(4500 / (k * 1.3 + 1)))
        eco = lp(eco, corte)
        eco *= 0.5 ** k
        offset = int(k * intervalo * SR)
        avail = min(len(eco), max_len - offset)
        if avail > 0:
            result[offset:offset + avail] += eco[:avail]
    return result


def pad_organo(notas, dur, vel=1.0):
    """Pad de armónicos con modulación rotatoria: cálido, en movimiento."""
    t = t_arr(dur + 1.0)
    out = np.zeros((2, len(t)))
    for m in notas:
        f = hz(m) * (1 + 0.0018 * np.sin(2 * np.pi * 0.3 * t))
        x = (np.sin(2 * np.pi * f * t) +
             np.sin(2 * np.pi * f * 3 * t) * 0.35 +
             np.sin(2 * np.pi * f * 5 * t) * 0.1 +
             np.sin(2 * np.pi * f * 2 * t) * 0.2)
        rot = 0.5 + 0.5 * np.sin(2 * np.pi * 1.2 * t)
        out += np.stack([x * (0.6 + 0.4 * rot), x * (0.6 + 0.4 * (1 - rot))])
    e = env_adsr(len(t), 0.3, 0.5, 0.7, 0.9, dur)
    return lp(out, 2600) * e * 0.065 * vel


def lead_raspado(m, dur, desde=None):
    """Lead con grit: sine sobreexcitada + diente de sierra sutil."""
    t = t_arr(dur + 0.3)
    f = np.full(len(t), float(hz(m)))
    if desde is not None:
        g = min(len(t), int(0.06 * SR))
        f[:g] *= (hz(desde) / hz(m)) ** (1 - np.arange(g) / g)
    vib = 1 + 0.005 * np.sin(2 * np.pi * 5.0 * t) * np.clip((t - 0.15) * 3, 0, 1)
    f *= vib
    ph = np.cumsum(f) / SR
    x = np.sin(2 * np.pi * ph) * 0.7 + (2 * ((ph * 1.002) % 1) - 1) * 0.3
    x = np.tanh(x * 2.2) * 0.65
    x = lp(x, 3800)
    e = env_adsr(len(t), 0.012, 0.15, 0.55, 0.15, dur)
    return x * e * 0.22


def bombo_marca():
    """Bombo profundo: más sub, menos punch — un latido."""
    t = t_arr(0.5)
    sub = np.sin(2 * np.pi * np.cumsum(40 + 15 * np.exp(-t * 16)) / SR) * np.exp(-t * 5)
    punch = np.sin(2 * np.pi * np.cumsum(52 + 150 * np.exp(-t * 50)) / SR) * np.exp(-t * 22)
    click = hp(rng.standard_normal(len(t)), 2800) * np.exp(-t * 300) * 0.45
    return np.tanh((sub * 0.85 + punch * 0.65 + click) * 1.5)


def caja_seca():
    """Caja ajustada con chasquido corto."""
    t = t_arr(0.35)
    cuerpo = (np.sin(2 * np.pi * 200 * t) + 0.4 * np.sin(2 * np.pi * 360 * t)) * np.exp(-t * 26)
    ruido = bp(rng.standard_normal(len(t)), 2000, 9000) * np.exp(-t * 18)
    return np.tanh((cuerpo * 0.6 + ruido * 0.9) * 1.5)


def hat_met(abierto=False):
    """Hi-hat 808: ondas cuadradas inarmónicas."""
    t = t_arr(0.35 if abierto else 0.07)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (212, 318, 380, 538, 562, 835))
    x = hp(bp(x, 6500, 14500), 7500) * np.exp(-t * (8 if abierto else 60))
    return x * 0.2


def shaker():
    t = t_arr(0.08)
    return hp(rng.standard_normal(len(t)), 5500) * np.minimum(t / 0.01, 1) * np.exp(-t * 50) * 0.15


def platillo_inv(dur):
    """Platillo invertido (reverse crash)."""
    t = t_arr(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * 1.6 * t)) for f in (212, 318, 380, 538, 562, 835))
    x = hp(x + rng.standard_normal(len(t)) * 2, 3500) * np.exp(-t * 2.0)
    x = x[::-1]
    return np.stack([x, np.roll(x, 350)]) * 0.06


def barrido_hp(st, t0, dur):
    """Build: el filtro pasa-altos sube durante 'dur'."""
    i0, L = int(t0 * SR), int(dur * SR)
    if i0 + L > st.shape[-1]:
        L = st.shape[-1] - i0
    if L <= 0:
        return st
    seg = st[:, i0:i0 + L].copy()
    cortes = [20, 250, 600, 1200, 2400, 4000]
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
    total = sum(c for _, c in SECCIONES)
    N = int((total * COMPAS + 6) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'pad', 'lead', 'eco', 'fx']}
    sc = np.zeros(N)

    K = bombo_marca()
    SN = caja_seca()
    CL = clap()
    H = hat_met()
    HO = hat_met(True)
    SH = shaker()

    ir = reverb_ir(dur=2.8, brillo=5000, seed=42)
    ir_sala = reverb_ir(dur=0.6, decay=8, brillo=7000, seed=43)

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
            gancho = nombre.startswith('gancho')

            # ── Eco que cae: piano grave al inicio de secciones + verso bar 4 ──
            do_eco = (c == 0 and nombre in ECO_VOICINGS) or (nombre == 'verso' and c == 4)
            if do_eco:
                voicing = ECO_VOICINGS.get(nombre, ['G2', 'Bb2', 'D3'])
                vel_base = ECO_VEL.get(nombre, 0.8)
                vel = vel_base * (0.55 if c == 4 else 1.0)
                subir = nombre == 'ganchoC'
                chord_dur = COMPAS * 2.5
                chord = np.zeros(int(chord_dur * SR))
                for nota in voicing:
                    p = piano_marca(n(nota), dur=chord_dur, vel=vel)
                    L = min(len(p), len(chord))
                    chord[:L] += p[:L]
                eco = eco_que_cae(chord, n_ecos=4, caida_semi=1.5, subir=subir)
                poner(bus['eco'], paneo(eco, 0), paso(cg, 0, False))
            # Intro compás 2: segundo golpe más tenue (solo octava G2–G3)
            if nombre == 'intro' and c == 2:
                chord2 = np.zeros(int(COMPAS * 2 * SR))
                for nota in ['G2', 'G3']:
                    p = piano_marca(n(nota), dur=COMPAS * 2, vel=0.5)
                    L2 = min(len(p), len(chord2))
                    chord2[:L2] += p[:L2]
                eco2 = eco_que_cae(chord2, n_ecos=3, caida_semi=2.0, subir=False)
                poner(bus['eco'], paneo(eco2, 0.12), paso(cg, 0, False))

            # ── Pad orgánico: ganchos, puente, final de intro (swell) ──
            if nombre in ('ganchoA', 'ganchoB', 'ganchoC', 'puente'):
                notas_pad = [n(x) for x in PAD_V[ac]]
                vel_pad = 0.55 if nombre == 'puente' else 1.0
                poner(bus['pad'], pad_organo(notas_pad, COMPAS * 0.92, vel_pad),
                      paso(cg, 0, False))
            if nombre == 'intro' and c >= 2:
                notas_pad = [n(x) for x in PAD_V[ac]]
                swell_vol = 0.12 * (c - 1) / 2
                poner(bus['pad'], pad_organo(notas_pad, COMPAS * 0.9, swell_vol),
                      paso(cg, 0, False))

            # ── Lead raspado: ganchos A, B, C ──
            if nombre in ('ganchoA', 'ganchoB', 'ganchoC'):
                fr = {'ganchoA': LEAD_A, 'ganchoB': LEAD_B, 'ganchoC': LEAD_C}[nombre]
                previa = None
                for (s, nota, l) in fr[frase]:
                    m = n(nota)
                    x = lead_raspado(m, l * S16 * 0.9,
                                     previa if previa and abs(previa - m) <= 5 else None)
                    poner(bus['lead'], paneo(x, -0.12 + 0.06 * (s % 4)),
                          paso(cg, s) + hum(0.003))
                    previa = m

            # ── Batería ──────────────────────────────────────────────────
            con_bateria = nombre in ('verso', 'ganchoA', 'ganchoB', 'ganchoC')
            if con_bateria:
                # Bombo
                if nombre == 'verso':
                    kicks = [0, 10] if frase != 3 else [0, 10, 14]
                else:
                    kicks = [0, 7, 10] if frase != 3 else [0, 7, 10, 15]
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.9, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.18) * 18)[None], paso(cg, s, False))

                # Caja en el 3er tiempo; clap encima en ganchos B y C
                golpe = paneo(SN, 0.03) * 0.7
                if nombre in ('ganchoB', 'ganchoC'):
                    golpe = golpe + paneo(CL, -0.05) * 0.4
                poner(bus['drums'], golpe, paso(cg, 8, False) + hum(0.002))

                # Hi-hats: corcheas en el verso, semicorcheas en ganchos
                paso_h = 2 if nombre == 'verso' else 1
                redoble = frase == 3 and gancho
                for s in range(0, 16, paso_h):
                    if redoble and s >= 12:
                        break
                    acento = [1.0, 0.35, 0.6, 0.35][s % 4]
                    poner(bus['drums'],
                          paneo(H * acento * (1 - rng.uniform(0, 0.15)), 0.3),
                          paso(cg, s) + hum(0.002))
                if redoble:
                    for j in range(6):
                        r = 1 + j * 0.04
                        poner(bus['drums'],
                              paneo(repitch(H, r) * (0.35 + 0.5 * j / 6), 0.3),
                              cg * COMPAS + 12 * S16 + j * BEAT / 6)

                # Hat abierto a contratiempo (frases 1 y 3 en ganchos)
                if frase in (1, 3) and gancho:
                    ho = HO[:int(2 * S16 * SR)].copy()
                    ho[-250:] *= np.linspace(1, 0, 250)
                    poner(bus['drums'], paneo(ho, -0.25) * 0.7, paso(cg, 6))

                # Shaker en corcheas impares (solo ganchos)
                if gancho:
                    for s in range(2, 16, 4):
                        poner(bus['drums'], paneo(SH, -0.4), paso(cg, s))

            # Build: redoble de caja acelerando
            if nombre == 'build':
                if c == 0:
                    tiempos = ([cg * COMPAS + k * BEAT / 2 for k in range(4)] +
                               [cg * COMPAS + 2 * BEAT + k * S16 for k in range(8)])
                else:
                    tiempos = [cg * COMPAS + k * S16 / 2 for k in range(28)]
                for j, tt in enumerate(tiempos):
                    if tt < (c0 + largo) * COMPAS - BEAT * 0.3:
                        vol = 0.25 + 0.6 * j / max(len(tiempos), 1)
                        poner(bus['drums'], paneo(repitch(SN, 1 + j * 0.01), 0) * vol, tt)

            # ── 808 ──────────────────────────────────────────────────────
            if nombre in ('verso', 'ganchoA', 'ganchoB', 'ganchoC', 'puente'):
                r = n(RAIZ_808[ac])
                if nombre == 'verso':
                    patron = ([(0, 0, 5), (10, 0, 5)] if frase != 3
                              else [(0, 0, 5), (10, 0, 3), (14, 12, 2)])
                elif nombre == 'puente':
                    patron = [(0, 0, 14)]
                else:
                    patron = [(0, 0, 3), (4, 0, 2), (7, 12, 2), (10, 0, 5)]
                    if frase == 3:
                        patron = [(0, 0, 3), (4, 0, 2), (7, 12, 2), (10, 0, 3), (14, 7, 2)]
                for s, intervalo, l in patron:
                    glide = 0.1 if s == 0 and frase == 0 and c > 0 else 0
                    notas808.append((paso(cg, s, False), r + intervalo, l * S16, glide))

        c0 += largo

    T = lambda comp: comp * COMPAS  # noqa: E731

    # ── Momentos especiales ──────────────────────────────────────────────
    # Platillo invertido antes de ganchos A, B, C
    for g in ('ganchoA', 'ganchoB', 'ganchoC'):
        pc = platillo_inv(BEAT * 3)
        poner(bus['fx'], pc, T(ini[g]) - pc.shape[1] / SR)

    # ── 808 ──
    if notas808:
        b = ochocientos(notas808, N / SR, 2.0)
        bus['bajo'] += paneo(lp(b, 4000), 0)

    # ── Mezcla ───────────────────────────────────────────────────────────
    pad_mix = hp(lp(bus['pad'], 5500), 180)
    pad_mix = con_reverb(pad_mix, ir, 0.25)

    lead_mix = hp(bus['lead'], 250)
    lead_mix = saturar(lead_mix, 0.25)
    lead_mix = lp(lead_mix, 7500)
    lead_mix = con_reverb(delay_pingpong(lead_mix, BEAT * 0.75, 0.25, 0.18), ir, 0.18)

    eco_mix = con_reverb(bus['eco'], ir, 0.4)

    drums = con_reverb(saturar(bus['drums'], 0.12), ir_sala, 0.06)

    bajo = bus['bajo'] * (1 - 0.3 * np.clip(sc, 0, 1))

    mix = drums * 1.0 + bajo * 0.8 + pad_mix * 0.9 + lead_mix * 1.0 + eco_mix * 0.95 + bus['fx']

    # Build: filtro HP que sube + silencio final
    b0 = ini['build']
    b_len = dict(SECCIONES)['build']
    mix = barrido_hp(mix, T(b0), COMPAS * b_len - BEAT * 0.5)
    s0 = int((T(b0 + b_len) - BEAT * 0.4) * SR)
    s1 = int(T(b0 + b_len) * SR)
    if s0 < mix.shape[1] and s0 < s1:
        mix[:, s0:min(s1, mix.shape[1])] *= 0.05

    # Ganancia por sección: intro y final más arriba (pocas capas), build y puente más bajo
    g_arr = np.ones(mix.shape[1])
    for sec_name, valor in (('intro', 3.0), ('final', 2.5), ('build', 0.75),
                                ('verso', 0.7), ('puente', 1.8)):
        sec_len = dict(SECCIONES)[sec_name]
        a_ = int(T(ini[sec_name]) * SR)
        b_ = min(mix.shape[1], int(T(ini[sec_name] + sec_len) * SR))
        g_arr[a_:b_] = valor
    g_arr = lp(g_arr, 3)
    mix = mix * g_arr

    mix = hp(mix, 28)
    pct = np.percentile(np.abs(mix), 99.95)
    if pct > 0:
        mix = mix / pct * 0.85
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    mx = np.abs(mix).max()
    if mx > 0:
        mix /= mx

    fin_i = min(mix.shape[1], int((total * COMPAS + 3.5) * SR))
    mix = mix[:, :fin_i]
    fade_len = int(1.8 * SR)
    if fade_len < mix.shape[1]:
        mix[:, -fade_len:] *= np.linspace(1, 0, fade_len)

    return (mix * 0.95).T


if __name__ == '__main__':
    out = os.path.join(RAIZ, 'fuentes', 'beats', 'salida', 'diario')
    os.makedirs(out, exist_ok=True)
    f = os.path.join(out, '2026-10-13-1.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.1f} s')
