"""RAÍZ — tema del día 2026-10-14-2.

Concepto: el pibe que empezó a jugar en la calle — descalzo, con los amigos,
sin táctica ni camiseta. Todo lo que aprendió lo aprendió ahí, sin que nadie
le enseñe. Ahora juega en un equipo con uniforme y presión, pero en cada
gambeta todavía está ese pibe que jugaba por jugar.

Emoción por sección:
  intro (4)     — la calle, marimba sola con pad: inocencia
  gancho A (8)  — el juego organizado: batería y 808 llegan, lead nuevo
  verso (8)     — el peso de competir: lead grave, sin marimba
  build (2)     — la tensión entre jugar y ganar
  gancho B (8)  — el pibe asoma: lead ornamental, marimba fantasma
  puente (4)    — reconexión: marimba y pad solos, todo simple
  gancho C (8)  — conviven: marimba y lead juntos en octavas
  final (4)     — la marimba sola otra vez, como al principio

Rasgo distintivo: marimba de calle — una marimba sintetizada con rebote doble
  (cada nota toca dos veces: golpe + eco inmediato más suave, como una pelota
  picando en el asfalto); lleva la melodía en intro, puente y final; desaparece
  en las secciones adultas (verso); en el gancho C vuelve armonizada en octavas
  con el lead — el pibe y el jugador son el mismo.

Estructura (46 compases, 142 BPM, si menor):
  intro 4 · gancho A 8 · verso 8 · build 2 · gancho B 8 · puente 4 · gancho C 8 · final 4

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_14_2.py
Salida: fuentes/beats/salida/diario/2026-10-14-2.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch,  # noqa: E402
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar,
                      ochocientos, clap)

BPM = 142
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.14 * S16
rng = np.random.default_rng(141002)
NOMBRES = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
           'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOMBRES[nombre[:-1]]


def paso(c, s, swing=True):
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


hum = lambda s=0.004: rng.normal(0, s)  # noqa: E731


# == Armonía (si menor: i - VI - III - VII) ====================================
PROG = ['Bm', 'G', 'D', 'A']
PAD_V = {
    'Bm': ['B3', 'D4', 'F#4'],
    'G':  ['B3', 'D4', 'G4'],
    'D':  ['A3', 'D4', 'F#4'],
    'A':  ['A3', 'C#4', 'E4'],
}
RAIZ_808 = {'Bm': 'B1', 'G': 'G1', 'D': 'D2', 'A': 'A1'}

# == Melodías ==================================================================
# (paso en semicorcheas, nota, largo en semicorcheas)

# Marimba: motivo de calle, simple y cantable
MARIMBA_MEL = [
    [(0, 'F#4', 2), (3, 'D4', 1), (4, 'E4', 2), (8, 'B3', 3), (14, 'D4', 2)],
    [(0, 'B4', 2), (3, 'G4', 1), (4, 'A4', 2), (8, 'D4', 4)],
    [(0, 'A4', 2), (3, 'F#4', 1), (4, 'D4', 2), (8, 'E4', 3), (14, 'F#4', 2)],
    [(0, 'E4', 2), (4, 'C#4', 2), (8, 'D4', 3), (14, 'A3', 2)],
]

# Lead gancho A: versión expandida del motivo, registro más alto
LEAD_A = [
    [(0, 'F#5', 2), (3, 'D5', 1), (4, 'E5', 3), (8, 'B4', 2), (12, 'D5', 2), (14, 'E5', 2)],
    [(0, 'B5', 2), (3, 'A5', 1), (4, 'G5', 3), (8, 'D5', 4), (14, 'E5', 2)],
    [(0, 'A5', 2), (3, 'F#5', 1), (4, 'E5', 2), (8, 'D5', 3), (14, 'F#5', 2)],
    [(0, 'E5', 2), (3, 'D5', 1), (4, 'C#5', 3), (8, 'B4', 4)],
]

# Lead verso: grave, lento, deliberado — el peso de competir
LEAD_VERSO = [
    [(0, 'F#4', 3), (6, 'E4', 2), (10, 'D4', 4)],
    [(0, 'B4', 3), (6, 'A4', 2), (10, 'G4', 4)],
    [(0, 'A4', 3), (6, 'F#4', 2), (12, 'E4', 4)],
    [(0, 'E4', 3), (6, 'C#4', 2), (10, 'B3', 4)],
]

# Lead gancho B: ornamental, rápido, el pibe asoma
LEAD_B = [
    [(0, 'F#5', 1), (2, 'E5', 1), (4, 'D5', 2), (8, 'F#5', 2), (10, 'E5', 1), (12, 'B4', 3)],
    [(0, 'B5', 1), (2, 'A5', 1), (4, 'G5', 2), (8, 'A5', 2), (12, 'D5', 4)],
    [(0, 'A5', 1), (2, 'F#5', 2), (6, 'E5', 2), (8, 'D5', 2), (12, 'F#5', 4)],
    [(0, 'E5', 2), (4, 'D5', 1), (6, 'C#5', 2), (8, 'B4', 6)],
]

# Lead gancho C: la melodía de la marimba una octava arriba (convergencia)
LEAD_C = [
    [(0, 'F#5', 2), (3, 'D5', 1), (4, 'E5', 2), (8, 'B4', 3), (14, 'D5', 2)],
    [(0, 'B5', 2), (3, 'G5', 1), (4, 'A5', 2), (8, 'D5', 4)],
    [(0, 'A5', 2), (3, 'F#5', 1), (4, 'D5', 2), (8, 'E5', 3), (14, 'F#5', 2)],
    [(0, 'E5', 2), (4, 'C#5', 2), (8, 'D5', 3), (14, 'A4', 2)],
]

SECCIONES = [('intro', 4), ('ganchoA', 8), ('verso', 8), ('build', 2),
             ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 4)]


# == Instrumentos propios del tema =============================================

def marimba_nota(m, dur):
    """Marimba con rebote doble (pelota picando en el asfalto)."""
    t = t_arr(dur + 0.7)
    f = hz(m)
    x = np.sin(2 * np.pi * f * t)
    x += np.sin(2 * np.pi * f * 2 * t) * 0.3
    x += np.sin(2 * np.pi * f * 3.01 * t) * 0.06
    x += hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 300) * 0.12
    e = np.exp(-t * 5.0) * np.minimum(t / 0.002, 1)
    nota = x * e
    # Rebote: 55 ms después, 35% de volumen
    bd = int(0.055 * SR)
    rebote = np.zeros(len(t))
    bl = len(nota) - bd
    if bd < len(t) and bl > 0:
        rebote[bd:bd + bl] = nota[:bl] * 0.35
    return (nota + rebote) * 0.28


def lead_tri(m, dur, desde=None):
    """Lead triángulo con overdrive suave y vibrato."""
    t = t_arr(dur + 0.4)
    f = hz(m) * (1 + 0.005 * np.sin(2 * np.pi * 5.0 * t) * np.clip((t - 0.2) * 3, 0, 1))
    if desde is not None:
        g = min(len(t), int(0.06 * SR))
        f[:g] *= (hz(desde) / hz(m)) ** (1 - np.arange(g) / g)
    ph = np.cumsum(f) / SR
    x = 4 * np.abs(ph % 1 - 0.5) - 1
    x = x * 0.7 + saw(hz(m), t, 0.003) * 0.3
    x = np.tanh(x * 1.8) / np.tanh(1.8)
    x = lp(x, 3500)
    e = env_adsr(len(t), 0.01, 0.15, 0.65, 0.25, dur)
    return x * e * 0.2


def pad_tri(notas_midi, dur):
    """Pad de triángulos detuneados — cálido y discreto."""
    t = t_arr(dur + 1.5)
    out = np.zeros((2, len(t)))
    for m in notas_midi:
        for v in range(3):
            det = (v - 1) * 0.004
            ph = hz(m) * (1 + det) * t
            tri = 4 * np.abs(ph % 1 - 0.5) - 1
            out += paneo(tri / 3, (v - 1) * 0.6)
    e = env_adsr(len(t), 0.5, 0.5, 0.55, 1.0, dur)
    return lp(out, 1400, 2) * e * 0.09


def bombo_capas():
    t = t_arr(0.45)
    sub = np.sin(2 * np.pi * np.cumsum(44 + 18 * np.exp(-t * 22)) / SR) * np.exp(-t * 6)
    punch = np.sin(2 * np.pi * np.cumsum(65 + 130 * np.exp(-t * 50)) / SR) * np.exp(-t * 28)
    click = hp(rng.standard_normal(len(t)), 3200) * np.exp(-t * 380) * 0.55
    return np.tanh((sub * 0.85 + punch * 0.85 + click) * 1.5)


def redoblante():
    t = t_arr(0.3)
    cuerpo = (np.sin(2 * np.pi * 195 * t) + 0.45 * np.sin(2 * np.pi * 350 * t)) * np.exp(-t * 23)
    ruido = bp(rng.standard_normal(len(t)), 1800, 9500) * np.exp(-t * 14)
    return np.tanh((cuerpo * 0.65 + ruido * 0.95) * 1.35)


def hat_metal(abierto=False):
    t = t_arr(0.38 if abierto else 0.075)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (230.6, 322.1, 395.8, 510.3, 568.7, 842.5))
    x = hp(bp(x, 6200, 14500), 7200) * np.exp(-t * (10 if abierto else 60))
    return x * 0.21


def platillo_inv(dur):
    t = t_arr(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * 1.6 * t)) for f in (230.6, 322.1, 395.8, 510.3, 568.7, 842.5))
    x = hp(x + rng.standard_normal(len(t)) * 1.5, 4500) * np.exp(-t * 2.0)
    x = x[::-1]
    return np.stack([x, np.roll(x, 380)]) * 0.065


def barrido_hp(st, t0, dur):
    i0, L = int(t0 * SR), int(dur * SR)
    if i0 + L > st.shape[1]:
        L = st.shape[1] - i0
    if L <= 0:
        return st
    seg = st[:, i0:i0 + L]
    cortes = [20, 300, 700, 1400, 2800, 4000]
    vers = [seg] + [hp(seg, c, 2) for c in cortes[1:]]
    pos = np.linspace(0, len(vers) - 1, seg.shape[1])
    out = np.zeros_like(seg)
    for k, v in enumerate(vers):
        w = np.clip(1 - np.abs(pos - k), 0, 1)
        out += v * w
    st[:, i0:i0 + L] = out
    return st


# == Composición ===============================================================
def render():
    total = sum(c for _, c in SECCIONES)
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'pad', 'marimba', 'lead', 'fx']}
    sc = np.zeros(N)
    K, SN, CL = bombo_capas(), redoblante(), clap()
    H, HO = hat_metal(), hat_metal(True)
    ir = reverb_ir(dur=2.3, brillo=6500, seed=50)
    ir_sala = reverb_ir(dur=0.65, decay=7.5, brillo=8000, seed=51)
    notas808 = []
    ini = {}
    c0 = 0

    for nombre, largo in SECCIONES:
        ini[nombre] = c0
        for c in range(largo):
            cg = c0 + c
            frase = c % 4
            ac = PROG[frase]
            ultimo = c == largo - 1

            # -- Pad (todo menos build) --
            if nombre != 'build':
                notas = [n(x) for x in PAD_V[ac]]
                if nombre == 'intro':
                    vol = 0.4 if c < 2 else 0.7
                elif nombre == 'puente':
                    vol = 1.5
                elif nombre == 'final':
                    vol = 0.6
                else:
                    vol = 1.0
                poner(bus['pad'], pad_tri(notas, COMPAS * 0.95) * vol, paso(cg, 0))

            # -- Marimba --
            if nombre in ('intro', 'ganchoA', 'puente', 'ganchoC', 'final'):
                for (s, nota, l) in MARIMBA_MEL[frase]:
                    x = marimba_nota(n(nota), l * S16)
                    pan = 0.06 * (1 if s % 4 < 2 else -1)
                    poner(bus['marimba'], paneo(x, pan), paso(cg, s) + hum(0.003))

            # Marimba fantasma en gancho B (frases 0 y 2 solamente)
            if nombre == 'ganchoB' and frase in (0, 2):
                for (s, nota, l) in MARIMBA_MEL[frase]:
                    x = marimba_nota(n(nota), l * S16)
                    poner(bus['marimba'], paneo(x, -0.3), paso(cg, s) + hum(0.003))

            # -- Lead --
            if nombre == 'ganchoA':
                previa = None
                for (s, nota, l) in LEAD_A[frase]:
                    m = n(nota)
                    desde = previa if previa and abs(previa - m) <= 5 else None
                    x = lead_tri(m, l * S16 * 0.95, desde)
                    poner(bus['lead'], paneo(x, -0.1), paso(cg, s) + hum(0.003))
                    previa = m

            elif nombre == 'verso':
                previa = None
                for (s, nota, l) in LEAD_VERSO[frase]:
                    m = n(nota)
                    desde = previa if previa and abs(previa - m) <= 5 else None
                    x = lead_tri(m, l * S16 * 0.95, desde)
                    poner(bus['lead'], paneo(x, 0), paso(cg, s) + hum(0.003))
                    previa = m

            elif nombre == 'ganchoB':
                previa = None
                for (s, nota, l) in LEAD_B[frase]:
                    m = n(nota)
                    desde = previa if previa and abs(previa - m) <= 5 else None
                    x = lead_tri(m, l * S16 * 0.95, desde)
                    poner(bus['lead'], paneo(x, -0.15), paso(cg, s) + hum(0.003))
                    previa = m

            elif nombre == 'ganchoC':
                previa = None
                for (s, nota, l) in LEAD_C[frase]:
                    m = n(nota)
                    desde = previa if previa and abs(previa - m) <= 5 else None
                    x = lead_tri(m, l * S16 * 0.95, desde)
                    poner(bus['lead'], paneo(x, -0.12), paso(cg, s) + hum(0.003))
                    previa = m

            # -- Batería --
            con_bateria = nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC')
            if con_bateria:
                # Bombo
                if nombre == 'verso':
                    kicks = [0, 10]
                else:
                    kicks = [0, 6, 10] if frase != 3 else [0, 6, 10, 15]
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.9, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.2) * 15)[None], paso(cg, s, False))

                # Redoblante en el tercer tiempo; clap encima en ganchos B y C
                t_sn = paso(cg, 8, False) + hum(0.002)
                poner(bus['drums'], paneo(SN, 0.04) * 0.7, t_sn)
                if nombre in ('ganchoB', 'ganchoC'):
                    poner(bus['drums'], paneo(CL, -0.03) * 0.4, t_sn)

                # Hi-hats
                redoble = frase == 3 and nombre != 'verso'
                paso_h = 2 if nombre == 'verso' else 1
                for s in range(0, 16, paso_h):
                    if redoble and s >= 12:
                        break
                    ac_h = [1.0, 0.35, 0.6, 0.35][s % 4]
                    poner(bus['drums'], paneo(H * ac_h * (1 - rng.uniform(0, 0.15)), 0.3),
                          paso(cg, s) + hum(0.002))
                if redoble:
                    for j in range(6):
                        poner(bus['drums'], paneo(repitch(H, 1 + j * 0.04) * (0.4 + 0.5 * j / 6), 0.3),
                              cg * COMPAS + 12 * S16 + j * BEAT / 3)
                # Hat abierto a contratiempo
                if frase in (1, 3) and nombre != 'verso':
                    ho = HO[:int(2 * S16 * SR)].copy()
                    ho[-250:] *= np.linspace(1, 0, 250)
                    poner(bus['drums'], paneo(ho, -0.25) * 0.7, paso(cg, 6))

            # Puente: batería ligera (solo hats en corcheas)
            if nombre == 'puente':
                for s in range(0, 16, 2):
                    poner(bus['drums'], paneo(H * (0.6 if s % 4 == 0 else 0.35), 0.3),
                          paso(cg, s) + hum(0.002))

            # -- 808 --
            if nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC'):
                r = n(RAIZ_808[ac])
                if nombre == 'verso':
                    patron = [(0, 0, 6), (10, 0, 4)]
                elif nombre == 'ganchoC':
                    patron = [(0, 0, 3), (4, 12, 2), (8, 0, 3), (14, 0, 2)]
                    if frase == 3:
                        patron = [(0, 0, 3), (4, 12, 2), (8, 0, 2), (12, 7, 2), (14, 0, 2)]
                else:  # ganchoA, ganchoB
                    patron = [(0, 0, 4), (6, 0, 2), (10, 0, 4)]
                    if frase == 3:
                        patron = [(0, 0, 3), (6, 12, 2), (10, 0, 3), (14, 7, 2)]
                for s, intervalo, l in patron:
                    glide = 0.09 if intervalo == 12 else 0
                    notas808.append((paso(cg, s, False), r + intervalo, l * S16, glide))

        c0 += largo

    T = lambda comp: comp * COMPAS  # noqa: E731

    # -- Momentos --
    # Platillos invertidos antes de ganchos B y C
    for g_name in ('ganchoB', 'ganchoC'):
        pc = platillo_inv(BEAT * 4)
        poner(bus['fx'], pc, T(ini[g_name]) - pc.shape[1] / SR)

    # Build: redoble de redoblante que acelera
    b0 = ini['build']
    tiempos = ([b0 * COMPAS + k * BEAT / 2 for k in range(4)] +
               [b0 * COMPAS + 2 * BEAT + k * S16 for k in range(8)] +
               [(b0 + 1) * COMPAS + k * S16 / 2 for k in range(24)])
    for j, tt in enumerate(tiempos):
        if tt < T(b0 + 2) - BEAT * 0.5:
            poner(bus['drums'], paneo(repitch(SN, 1 + j * 0.01), 0) * (0.25 + 0.55 * j / len(tiempos)), tt)

    # 808
    if notas808:
        b = ochocientos(notas808, N / SR, 2.3)
        bus['bajo'] += paneo(lp(b, 4200), 0)

    # == Mezcla ================================================================
    pd = hp(lp(bus['pad'], 5500), 150)
    pd = con_reverb(pd * (1 - 0.3 * np.clip(sc, 0, 1)), ir, 0.3)

    # Marimba con reverb propio (suena a calle, rebota en paredes)
    ir_mar = reverb_ir(dur=1.8, decay=3.5, brillo=5500, seed=52)
    mar = con_reverb(bus['marimba'], ir_mar, 0.35)
    # Volumen por sección
    mar_g = np.zeros(mar.shape[1])
    for nm, val in [('intro', 1.0), ('ganchoA', 0.35), ('ganchoB', 0.25),
                    ('puente', 1.0), ('ganchoC', 0.9), ('final', 0.85)]:
        if nm in ini:
            largo_s = dict(SECCIONES)[nm]
            a_, b_ = int(T(ini[nm]) * SR), min(mar.shape[1], int(T(ini[nm] + largo_s) * SR))
            mar_g[a_:b_] = val
    mar = mar * lp(mar_g, 3)

    lead = hp(bus['lead'], 250)
    lead = saturar(lead, 0.18)
    lead = con_reverb(delay_pingpong(lead, BEAT * 0.75, 0.3, 0.2), ir, 0.22)

    drums = con_reverb(saturar(bus['drums'], 0.12), ir_sala, 0.07)
    bajo = bus['bajo'] * (1 - 0.3 * np.clip(sc, 0, 1))
    fx = bus['fx']

    mix = drums * 1.0 + bajo * 0.85 + pd * 0.9 + mar * 1.0 + lead * 1.0 + fx

    # Build: HP sweep + silencio al final
    mix = barrido_hp(mix, T(ini['build']), COMPAS * 2 - BEAT * 0.5)
    s0 = int((T(ini['build'] + 2) - BEAT * 0.5) * SR)
    s1 = int(T(ini['build'] + 2) * SR)
    if s0 < mix.shape[1] and s1 <= mix.shape[1]:
        mix[:, s0:s1] *= 0.05

    # Ganancia por sección: intro y final tienen pocas capas
    g = np.ones(mix.shape[1])
    for nm, valor in (('intro', 2.8), ('final', 3.2), ('build', 0.65), ('puente', 4.5), ('verso', 0.82)):
        largo_s = dict(SECCIONES)[nm]
        a_, b_ = int(T(ini[nm]) * SR), min(mix.shape[1], int(T(ini[nm] + largo_s) * SR))
        g[a_:b_] = valor
    g = lp(g, 3)
    mix = mix * g

    # Master
    mix = hp(mix, 28)
    mix = mix / (np.percentile(np.abs(mix), 99.95) + 1e-9) * 0.85
    mix = np.tanh(mix * 1.12) / np.tanh(1.12)
    mix /= np.abs(mix).max() + 1e-9

    fin_i = int((total * COMPAS + 2.0) * SR)
    mix = mix[:, :fin_i]
    mix[:, -int(1.5 * SR):] *= np.linspace(1, 0, int(1.5 * SR))
    return (mix * 0.95).T


if __name__ == '__main__':
    out_dir = os.path.join(RAIZ, 'fuentes', 'beats', 'salida', 'diario')
    os.makedirs(out_dir, exist_ok=True)
    f = os.path.join(out_dir, '2026-10-14-2.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.1f} s')
