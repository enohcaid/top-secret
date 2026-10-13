"""VÉRTIGO — tema del día 2026-10-13-2.

Concepto: los últimos cinco minutos ganando 1-0 — cada segundo es eterno,
el rival empuja, el cuerpo no da, pero en ese borde entre ganar y perder
es donde más vivo te sentís.

Emoción por sección:
  intro (4)    — solo el tic y cuerdas lejanas: la tensión apenas empieza
  verso (8)    — aguantando, el cuerpo al límite, pesado, contenido
  gancho A (8) — el rival empuja, la defensa se planta y contesta
  build (2)    — todo se tensa, el reloj se frena al máximo
  gancho B (8) — presión más fuerte, la urgencia crece
  puente (4)   — un córner a favor, respiro brevísimo
  gancho C (8) — los últimos 30 segundos: todo se acelera, los tics se juntan
  final (4)    — el pitazo, el alivio, el silencio

Rasgo distintivo: tic que estira — un pulso percusivo metálico que marca el
  tiempo pero dentro de cada frase va llegando cada vez más tarde, como un
  reloj que se frena bajo presión. En las transiciones vuelve al tempo de
  golpe. En el gancho C se invierte: los tics se aceleran hacia el final.

Estructura (46 compases, 148 BPM, fa menor):
  intro 4 · verso 8 · gancho A 8 · build 2 · gancho B 8 · puente 4 · gancho C 8 · final 4

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_13_2.py
Salida: fuentes/beats/salida/diario/2026-10-13-2.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch,
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar,
                      ochocientos, clap)

BPM = 148
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.13 * S16
rng = np.random.default_rng(202610132)
NOMBRES = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
           'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOMBRES[nombre[:-1]]


def paso(c, s, swing=True):
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


hum = lambda s=0.004: rng.normal(0, s)  # noqa: E731


# ── Armonía (fa menor: i – bVI – iv – bVII) ────────────────────────────────
PROG = ['Fm', 'Db', 'Bbm', 'Eb']
CUERDAS_V = {
    'Fm':  ['F3', 'C4', 'Eb4', 'Ab4'],
    'Db':  ['Db3', 'Ab3', 'C4', 'F4'],
    'Bbm': ['Bb2', 'F3', 'Ab3', 'Db4'],
    'Eb':  ['Eb3', 'Bb3', 'Db4', 'G4'],
}
RAIZ_808 = {'Fm': 'F1', 'Db': 'Db2', 'Bbm': 'Bb1', 'Eb': 'Eb2'}

# ── Melodías ────────────────────────────────────────────────────────────────
# Gancho A: determinación defensiva, arcos que van y vuelven
LEAD_A = [
    [(0, 'C5', 2), (3, 'Eb5', 1), (4, 'F5', 2), (7, 'Eb5', 1), (8, 'C5', 3), (12, 'Ab4', 2)],
    [(0, 'Db5', 3), (4, 'C5', 2), (7, 'Ab4', 1), (8, 'Bb4', 4)],
    [(0, 'Ab4', 2), (3, 'Bb4', 1), (4, 'Db5', 2), (7, 'F5', 3), (12, 'Eb5', 4)],
    [(0, 'Eb5', 2), (3, 'Db5', 1), (4, 'C5', 2), (7, 'Bb4', 1), (8, 'G4', 3), (12, 'Bb4', 2), (14, 'C5', 2)],
]
# Gancho B: más intenso, sube más arriba
LEAD_B = [
    [(0, 'F5', 2), (3, 'Ab5', 2), (6, 'G5', 2), (9, 'F5', 2), (12, 'Eb5', 4)],
    [(0, 'Eb5', 2), (3, 'Db5', 2), (6, 'C5', 2), (9, 'Bb4', 3), (13, 'Ab4', 3)],
    [(0, 'Bb4', 2), (3, 'Db5', 1), (4, 'F5', 2), (7, 'Ab5', 3), (12, 'G5', 4)],
    [(0, 'F5', 4), (5, 'Eb5', 2), (8, 'C5', 4), (14, 'Eb5', 2)],
]
# Gancho C: pico, línea nueva en el agudo — los últimos segundos
LEAD_C = [
    [(0, 'Ab5', 2), (3, 'Bb5', 2), (6, 'C6', 3), (10, 'Bb5', 2), (13, 'Ab5', 3)],
    [(0, 'G5', 2), (3, 'Ab5', 2), (6, 'Bb5', 2), (9, 'C6', 3), (14, 'Bb5', 2)],
    [(0, 'C6', 4), (5, 'Bb5', 2), (8, 'Ab5', 2), (11, 'G5', 2), (14, 'F5', 2)],
    [(0, 'Eb5', 3), (4, 'F5', 2), (8, 'Ab5', 6)],
]

SECCIONES = [('intro', 4), ('verso', 8), ('ganchoA', 8), ('build', 2),
             ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 4)]

# Factor de estiramiento del tic (>0 = frena, <0 = acelera)
TIC_STRETCH = {
    'intro': 0.006, 'verso': 0.015, 'ganchoA': 0.025,
    'build': 0.05, 'ganchoB': 0.035, 'puente': 0.01,
    'ganchoC': -0.025, 'final': 0.008
}


# ── Instrumentos propios del tema ────────────────────────────────────────────
def cuerdas(notas_midi, dur, vel=1.0):
    """Cuerdas articuladas: arco con ataque definido, vibrato individual, presión variable."""
    t = t_arr(dur + 0.8)
    out = np.zeros((2, len(t)))
    for i, m in enumerate(notas_midi):
        f = hz(m)
        vib = 1 + 0.0035 * np.sin(2 * np.pi * (4.5 + i * 0.4) * t) * np.clip((t - 0.08) * 6, 0, 1)
        x = (np.sin(2 * np.pi * f * vib * t) +
             0.45 * np.sin(2 * np.pi * f * 2 * vib * t) +
             0.25 * np.sin(2 * np.pi * f * 3 * vib * t) +
             0.08 * np.sin(2 * np.pi * f * 5 * vib * t))
        bow = 0.8 + 0.2 * np.sin(2 * np.pi * 0.9 * t + i * 0.7)
        x *= bow
        out += paneo(x, -0.35 + 0.23 * i)
    e = env_adsr(len(t), 0.06, 0.25, 0.6, 0.55, dur)
    noise = hp(rng.standard_normal(len(t)), 2000) * np.exp(-t * 30) * 0.04
    out += paneo(noise, 0)
    return lp(out, 4500) * e * 0.065 * vel


def pizz(m, dur=0.3):
    """Pizzicato: cuerda punteada seca con twang."""
    t = t_arr(dur + 0.5)
    f = hz(m)
    x = (np.sin(2 * np.pi * f * t) * 0.6 +
         np.sin(2 * np.pi * f * 2 * t * 1.001) * 0.22 +
         np.sin(2 * np.pi * f * 3 * t * 0.999) * 0.1 +
         np.sin(2 * np.pi * f * 5 * t) * 0.04)
    e = (1 - np.exp(-t * 900)) * np.exp(-t * 11)
    twang = bp(rng.standard_normal(len(t)), 3000, 8000) * np.exp(-t * 120) * 0.07
    return lp(x * e + twang, 6500) * 0.24


def tic_metal():
    """Tic metálico: clic bandpaseado corto, como un mecanismo de reloj."""
    t = t_arr(0.045)
    body = bp(rng.standard_normal(len(t)), 2500, 9000) * np.exp(-t * 180)
    ring = np.sin(2 * np.pi * 4800 * t) * np.exp(-t * 250) * 0.25
    return (body + ring) * 0.45


def bombo_vert():
    """Bombo rápido: decay corto para 148 BPM, punch alto."""
    t = t_arr(0.4)
    sub = np.sin(2 * np.pi * np.cumsum(44 + 16 * np.exp(-t * 22)) / SR) * np.exp(-t * 7)
    punch = np.sin(2 * np.pi * np.cumsum(58 + 160 * np.exp(-t * 55)) / SR) * np.exp(-t * 25)
    click = hp(rng.standard_normal(len(t)), 3200) * np.exp(-t * 350) * 0.5
    return np.tanh((sub * 0.75 + punch * 0.85 + click) * 1.6)


def caja_tensa():
    """Caja apretada con ring metálico corto."""
    t = t_arr(0.35)
    cuerpo = (np.sin(2 * np.pi * 210 * t) + 0.35 * np.sin(2 * np.pi * 380 * t)) * np.exp(-t * 28)
    ruido = bp(rng.standard_normal(len(t)), 2200, 10000) * np.exp(-t * 20)
    ring = np.sin(2 * np.pi * 1200 * t) * np.exp(-t * 80) * 0.12
    return np.tanh((cuerpo * 0.55 + ruido * 0.85 + ring) * 1.5)


def hat_met(abierto=False):
    """Hi-hat 808: ondas cuadradas inarmónicas."""
    t = t_arr(0.3 if abierto else 0.06)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (220, 330, 395, 555, 580, 870))
    x = hp(bp(x, 7000, 15000), 8000) * np.exp(-t * (7 if abierto else 65))
    return x * 0.19


def shaker():
    t = t_arr(0.07)
    return hp(rng.standard_normal(len(t)), 6000) * np.minimum(t / 0.01, 1) * np.exp(-t * 55) * 0.14


def platillo_inv(dur):
    """Platillo invertido."""
    t = t_arr(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * 1.5 * t)) for f in (220, 330, 395, 555, 580, 870))
    x = hp(x + rng.standard_normal(len(t)) * 2, 3800) * np.exp(-t * 1.8)
    x = x[::-1]
    return np.stack([x, np.roll(x, 400)]) * 0.055


def barrido_hp(st, t0, dur):
    """Build: filtro HP que sube."""
    i0, L = int(t0 * SR), int(dur * SR)
    if i0 + L > st.shape[-1]:
        L = st.shape[-1] - i0
    if L <= 0:
        return st
    seg = st[:, i0:i0 + L].copy()
    cortes = [20, 300, 700, 1500, 3000, 5000]
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
    N = int((total * COMPAS + 5) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'cuerdas', 'lead', 'tic', 'fx']}
    sc = np.zeros(N)

    K = bombo_vert()
    SN = caja_tensa()
    CL = clap()
    H = hat_met()
    HO = hat_met(True)
    SH = shaker()
    TIC = tic_metal()

    ir = reverb_ir(dur=2.4, brillo=5500, seed=55)
    ir_sala = reverb_ir(dur=0.55, decay=9, brillo=7500, seed=56)

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

            # ── Tic que estira ──────────────────────────────────────────
            if nombre in TIC_STRETCH:
                pos_p = c % 4
                cumul = pos_p * (pos_p + 1) / 2          # 0, 1, 3, 6
                drift = cumul * TIC_STRETCH[nombre] * BEAT
                vol_tic = 1.0
                if nombre == 'build':
                    vol_tic = 0.7
                elif nombre == 'final':
                    vol_tic = max(0.05, 1 - c * 0.3)     # 1.0 → 0.7 → 0.4 → 0.1
                # Bar-start tic
                poner(bus['tic'], paneo(TIC * vol_tic, -0.12),
                      paso(cg, 0, False) + drift)
                # Half-bar tic (ganchos, verso, puente — not intro/final/build)
                if nombre not in ('intro', 'final', 'build'):
                    poner(bus['tic'], paneo(TIC * vol_tic * 0.75, 0.15),
                          paso(cg, 8, False) + drift * 0.7)
                # Extra tics in gancho C: every beat (4 per bar)
                if nombre == 'ganchoC':
                    for extra_s in [4, 12]:
                        poner(bus['tic'], paneo(TIC * vol_tic * 0.55, 0.25),
                              paso(cg, extra_s, False) + drift * 0.5)

            # ── Cuerdas articuladas ─────────────────────────────────────
            if nombre in ('ganchoA', 'ganchoB', 'ganchoC', 'puente', 'verso'):
                notas_c = [n(x) for x in CUERDAS_V[ac]]
                vel_c = 0.5 if nombre == 'verso' else (0.6 if nombre == 'puente' else 1.0)
                poner(bus['cuerdas'], cuerdas(notas_c, COMPAS * 0.9, vel_c),
                      paso(cg, 0, False))
            # Intro: cuerdas swell desde el compás 1
            if nombre == 'intro' and c >= 1:
                notas_c = [n(x) for x in CUERDAS_V[ac]]
                poner(bus['cuerdas'], cuerdas(notas_c, COMPAS * 0.85, 0.07 * c),
                      paso(cg, 0, False))
            # Final: cuerdas que se apagan
            if nombre == 'final':
                notas_c = [n(x) for x in CUERDAS_V[ac]]
                poner(bus['cuerdas'], cuerdas(notas_c, COMPAS * 0.9, max(0.05, 0.7 - c * 0.2)),
                      paso(cg, 0, False))

            # ── Lead pizzicato ──────────────────────────────────────────
            if nombre in ('ganchoA', 'ganchoB', 'ganchoC'):
                fr = {'ganchoA': LEAD_A, 'ganchoB': LEAD_B, 'ganchoC': LEAD_C}[nombre]
                for (s, nota, l) in fr[frase]:
                    m = n(nota)
                    x = pizz(m, l * S16 * 0.8)
                    poner(bus['lead'], paneo(x, -0.15 + 0.08 * (s % 4)),
                          paso(cg, s) + hum(0.003))
            # Puente: pizzicato suave, pocas notas (frases 0 y 2)
            if nombre == 'puente' and frase in (0, 2):
                for (s, nota, l) in [(0, 'C5', 3), (8, 'Ab4', 4)]:
                    poner(bus['lead'], paneo(pizz(n(nota), l * S16 * 0.8) * 0.45, 0.1),
                          paso(cg, s) + hum(0.003))

            # ── Batería ─────────────────────────────────────────────────
            con_bateria = nombre in ('verso', 'ganchoA', 'ganchoB', 'ganchoC')
            if con_bateria:
                # Bombo
                if nombre == 'verso':
                    kicks = [0, 10] if frase != 3 else [0, 10, 14]
                else:
                    kicks = [0, 7, 10] if frase != 3 else [0, 7, 10, 15]
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.9, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.16) * 19)[None], paso(cg, s, False))

                # Caja en el 3er tiempo; + clap en ganchos B y C
                golpe = paneo(SN, 0.04) * 0.7
                if nombre in ('ganchoB', 'ganchoC'):
                    golpe = golpe + paneo(CL, -0.06) * 0.38
                poner(bus['drums'], golpe, paso(cg, 8, False) + hum(0.002))

                # Hi-hats con swing
                paso_h = 2 if nombre == 'verso' else 1
                redoble = frase == 3 and gancho
                for s in range(0, 16, paso_h):
                    if redoble and s >= 12:
                        break
                    acento = [1.0, 0.32, 0.58, 0.32][s % 4]
                    poner(bus['drums'],
                          paneo(H * acento * (1 - rng.uniform(0, 0.13)), 0.3),
                          paso(cg, s) + hum(0.002))
                if redoble:
                    for j in range(6):
                        r = 1 + j * 0.045
                        poner(bus['drums'],
                              paneo(repitch(H, r) * (0.3 + 0.5 * j / 6), 0.3),
                              cg * COMPAS + 12 * S16 + j * BEAT / 6)

                # Hat abierto a contratiempo (frases 1 y 3 en ganchos)
                if frase in (1, 3) and gancho:
                    ho = HO[:int(2 * S16 * SR)].copy()
                    ho[-220:] *= np.linspace(1, 0, 220)
                    poner(bus['drums'], paneo(ho, -0.25) * 0.65, paso(cg, 6))

                # Shaker en ganchos
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
                        vol = 0.22 + 0.6 * j / max(len(tiempos), 1)
                        poner(bus['drums'], paneo(repitch(SN, 1 + j * 0.012), 0) * vol, tt)

            # ── 808 ─────────────────────────────────────────────────────
            if nombre in ('verso', 'ganchoA', 'ganchoB', 'ganchoC', 'puente'):
                r = n(RAIZ_808[ac])
                if nombre == 'verso':
                    patron = ([(0, 0, 5), (10, 0, 5)] if frase != 3
                              else [(0, 0, 5), (10, 0, 3), (14, 12, 2)])
                elif nombre == 'puente':
                    patron = [(0, 0, 14)]
                elif nombre == 'ganchoC':
                    # Más rítmico en el gancho final
                    if frase in (0, 2):
                        patron = [(0, 0, 2), (3, 0, 1), (4, 0, 2), (7, 0, 2), (10, 0, 5)]
                    elif frase == 1:
                        patron = [(0, 0, 3), (6, 12, 2), (10, 0, 5)]
                    else:
                        patron = [(0, 0, 2), (3, 0, 1), (4, 0, 2), (7, 12, 2), (10, 0, 3), (14, 7, 2)]
                else:  # ganchoA, ganchoB
                    if frase in (0, 2):
                        patron = [(0, 0, 3), (7, 0, 2), (10, 0, 5)]
                    elif frase == 1:
                        patron = [(0, 0, 4), (10, 0, 5)]
                    else:
                        patron = [(0, 0, 3), (4, 0, 2), (7, 12, 2), (10, 0, 3), (14, 7, 2)]
                for s, intervalo, l in patron:
                    glide = 0.09 if s == 0 and frase == 0 and c > 0 else 0
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
        b = ochocientos(notas808, N / SR, 2.2)
        if len(b) < N:
            b = np.concatenate([b, np.zeros(N - len(b))])
        else:
            b = b[:N]
        bus['bajo'] += paneo(lp(b, 4200), 0)

    # ── Mezcla ───────────────────────────────────────────────────────────
    cuer_mix = hp(lp(bus['cuerdas'], 5000), 150)
    cuer_mix = con_reverb(cuer_mix, ir, 0.28)

    lead_mix = hp(bus['lead'], 280)
    lead_mix = con_reverb(delay_pingpong(lead_mix, BEAT * 0.75, 0.3, 0.22), ir, 0.35)

    tic_mix = con_reverb(bus['tic'], ir_sala, 0.15)

    drums = con_reverb(saturar(bus['drums'], 0.1), ir_sala, 0.05)

    bajo = bus['bajo'] * (1 - 0.3 * np.clip(sc, 0, 1))

    mix = drums * 1.0 + bajo * 0.8 + cuer_mix * 0.9 + lead_mix * 1.0 + tic_mix * 0.9 + bus['fx']

    # Build: HP sweep + silencio antes del drop
    b0 = ini['build']
    b_len = dict(SECCIONES)['build']
    mix = barrido_hp(mix, T(b0), COMPAS * b_len - BEAT * 0.5)
    s0 = int((T(b0 + b_len) - BEAT * 0.4) * SR)
    s1 = int(T(b0 + b_len) * SR)
    if s0 < mix.shape[1] and s0 < s1:
        mix[:, s0:min(s1, mix.shape[1])] *= 0.05

    # Ganancia por sección
    g_arr = np.ones(mix.shape[1])
    for sec_name, valor in (('intro', 2.8), ('final', 2.5), ('build', 0.7),
                            ('verso', 0.65), ('puente', 1.1)):
        sec_len = dict(SECCIONES)[sec_name]
        a_ = int(T(ini[sec_name]) * SR)
        b_ = min(mix.shape[1], int(T(ini[sec_name] + sec_len) * SR))
        g_arr[a_:b_] = valor
    g_arr = lp(g_arr, 6)
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
    fade_len = int(1.5 * SR)
    if fade_len < mix.shape[1]:
        mix[:, -fade_len:] *= np.linspace(1, 0, fade_len)

    return (mix * 0.95).T


if __name__ == '__main__':
    out = os.path.join(RAIZ, 'fuentes', 'beats', 'salida', 'diario')
    os.makedirs(out, exist_ok=True)
    f = os.path.join(out, '2026-10-13-2.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.1f} s')
