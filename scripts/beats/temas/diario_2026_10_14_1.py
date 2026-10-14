"""PARED — tema del dia 2026-10-14-1.

Concepto: el rival de los entrenamientos — no se eligen, se chocan todos los
dias en el reducido; se putean, se empujan, pero despues de la pared perfecta
se miran y se entienden sin hablar.

Emocion por seccion:
  intro (4)     — una voz sola, tentativa; entrando al entrenamiento
  gancho A (8)  — las dos voces chocan, independientes; el conflicto
  verso (8)     — sin leads, respirando; el silencio entre choques
  build (2)     — la tension crece, algo va a cambiar
  gancho B (8)  — llamada y respuesta; empiezan a pasarse la pelota
  puente (4)    — el agresivo toca la melodia del suave; el reconocimiento
  gancho C (8)  — armonia paralela, las dos voces trabadas; la pared perfecta
  final (4)     — una voz sola con la melodia compartida; lo que queda

Rasgo distintivo: dos leads que chocan y convergen — dos sintetizadores con
  timbres opuestos (uno staccato/metalico FM, otro legato/calido saw) que
  arrancan tocando por su cuenta, pasan a llamada y respuesta, y terminan
  trabados en terceras paralelas. La convergencia es el arco emocional.

Estructura (46 compases, 136 BPM, do# menor):
  intro 4 . gancho A 8 . verso 8 . build 2 . gancho B 8 . puente 4 . gancho C 8 . final 4

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_14_1.py
Salida: fuentes/beats/salida/diario/2026-10-14-1.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch,
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar,
                      ochocientos, clap)

BPM = 136
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.15 * S16
rng = np.random.default_rng(20261014)
NOMBRES = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
           'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOMBRES[nombre[:-1]]


def paso(c, s, swing=True):
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


hum = lambda s=0.004: rng.normal(0, s)  # noqa: E731


def tercera_arriba(m):
    """Tercera diatonica ascendente en do# menor."""
    pc = m % 12
    return m + (4 if pc in (4, 9, 11) else 3)


# == Armonia (do# menor: i - VI - III - VII) =================================
PROG = ['C#m', 'A', 'E', 'B']
PAD_V = {'C#m': ['C#3', 'E3', 'G#3', 'B3'], 'A': ['A3', 'C#4', 'E4'],
         'E': ['E3', 'G#3', 'B3'], 'B': ['B3', 'D#4', 'F#4']}
RAIZ_808 = {'C#m': 'C#1', 'A': 'A1', 'E': 'E2', 'B': 'B1'}

# == Melodias ==================================================================
# (paso en semicorcheas, nota, largo en semicorcheas)

# Lead duro (gancho A): staccato, angular, registro alto
LEAD_DURO_A = [
    [(0, 'G#4', 1), (2, 'B4', 1), (4, 'C#5', 2), (8, 'E5', 1), (10, 'D#5', 1), (12, 'C#5', 3)],
    [(0, 'C#5', 1), (3, 'A4', 1), (4, 'E5', 2), (8, 'C#5', 1), (10, 'A4', 2), (14, 'B4', 2)],
    [(0, 'B4', 2), (4, 'G#4', 1), (6, 'A4', 2), (8, 'B4', 2), (12, 'D#5', 2), (14, 'C#5', 2)],
    [(0, 'D#5', 1), (3, 'B4', 1), (4, 'F#4', 2), (8, 'G#4', 2), (12, 'B4', 4)],
]

# Lead tierno (gancho A): legato, suave, registro medio
LEAD_TIERNO_A = [
    [(2, 'E4', 5), (8, 'F#4', 4), (14, 'G#4', 2)],
    [(0, 'A4', 6), (8, 'G#4', 4), (14, 'F#4', 2)],
    [(0, 'E4', 4), (6, 'G#4', 4), (12, 'B4', 4)],
    [(0, 'A4', 4), (6, 'F#4', 4), (12, 'D#4', 4)],
]

# Gancho B: duro llama (primera mitad), tierno responde (segunda mitad)
LEAD_DURO_B = [
    [(0, 'G#4', 2), (4, 'C#5', 2)],
    [(0, 'E5', 1), (2, 'D#5', 1), (4, 'C#5', 2)],
    [(0, 'B4', 2), (4, 'A4', 2)],
    [(0, 'D#5', 2), (4, 'B4', 3)],
]
LEAD_TIERNO_B = [
    [(8, 'E4', 3), (12, 'F#4', 4)],
    [(8, 'A4', 4), (14, 'G#4', 2)],
    [(8, 'G#4', 3), (12, 'F#4', 4)],
    [(8, 'E4', 4), (14, 'D#4', 2)],
]

# Gancho C: convergencia — tierno lleva la voz, duro armoniza una tercera arriba
LEAD_CONVERGENCIA = [
    [(0, 'E4', 3), (4, 'G#4', 2), (8, 'F#4', 3), (14, 'E4', 2)],
    [(0, 'C#4', 3), (4, 'E4', 2), (8, 'F#4', 4), (14, 'G#4', 2)],
    [(0, 'A4', 3), (4, 'G#4', 2), (8, 'F#4', 4)],
    [(0, 'E4', 3), (6, 'D#4', 2), (8, 'C#4', 8)],
]

SECCIONES = [('intro', 4), ('ganchoA', 8), ('verso', 8), ('build', 2),
             ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 4)]


# == Instrumentos propios del tema =============================================
def lead_duro(m, dur, suave=False):
    """FM staccato: metalico, percusivo. suave=True suaviza para la convergencia."""
    t = t_arr(dur + 0.15)
    f = hz(m)
    mod_d = 5 if suave else 8
    mod = np.sign(np.sin(2 * np.pi * f * 2.01 * t)) * 1.8 * np.exp(-t * mod_d)
    x = np.sin(2 * np.pi * f * t + mod)
    a = 0.02 if suave else 0.002
    s_lev = 0.5 if suave else 0.3
    e = env_adsr(len(t), a, 0.08, s_lev, 0.08, dur)
    return x * e * 0.25


def lead_tierno(m, dur, desde=None, apretado=False):
    """Saw filtrada con vibrato y portamento."""
    t = t_arr(dur + 0.6)
    f = hz(m) * (1 + 0.005 * np.sin(2 * np.pi * 4.5 * t) * np.clip((t - 0.25) * 2, 0, 1))
    if desde is not None:
        g = min(len(t), int(0.1 * SR))
        f[:g] *= (hz(desde) / hz(m)) ** (1 - np.arange(g) / g)
    ph = np.cumsum(f) / SR
    x = 2 * (ph - np.floor(ph + 0.5))
    x += 0.35 * saw(hz(m) * 1.004, t)
    x = lp(x, 2200)
    a_t = 0.08 if apretado else 0.15
    e = env_adsr(len(t), a_t, 0.25, 0.7, 0.35, dur)
    return x * e * 0.2


def colchon(notas_midi, dur):
    """Pad calido y discreto."""
    t = t_arr(dur + 1.5)
    out = np.zeros((2, len(t)))
    for m in notas_midi:
        for v in range(3):
            det = (v - 1) * 0.005
            out += paneo(saw(hz(m), t, det) / 3, (v - 1) / 2 * 0.8)
    e = env_adsr(len(t), 0.4, 0.5, 0.6, 1.0, dur)
    return lp(out, 1500, 2) * e * 0.1


def bombo_capas():
    t = t_arr(0.45)
    sub = np.sin(2 * np.pi * np.cumsum(42 + 16 * np.exp(-t * 18)) / SR) * np.exp(-t * 5.5)
    punch = np.sin(2 * np.pi * np.cumsum(70 + 120 * np.exp(-t * 55)) / SR) * np.exp(-t * 25)
    click = hp(rng.standard_normal(len(t)), 3500) * np.exp(-t * 350) * 0.5
    return np.tanh((sub * 0.85 + punch * 0.8 + click) * 1.6)


def redoblante():
    t = t_arr(0.3)
    cuerpo = (np.sin(2 * np.pi * 210 * t) + 0.4 * np.sin(2 * np.pi * 370 * t)) * np.exp(-t * 25)
    ruido = bp(rng.standard_normal(len(t)), 2000, 10000) * np.exp(-t * 16)
    return np.tanh((cuerpo * 0.6 + ruido * 1.0) * 1.3)


def hat_metal(abierto=False):
    t = t_arr(0.35 if abierto else 0.07)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (217.4, 315.2, 387.5, 546.3, 558.8, 827.1))
    x = hp(bp(x, 6500, 15000), 7500) * np.exp(-t * (10 if abierto else 58))
    return x * 0.2


def platillo_invertido(dur):
    t = t_arr(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * 1.5 * t)) for f in (217.4, 315.2, 387.5, 546.3, 558.8, 827.1))
    x = hp(x + rng.standard_normal(len(t)) * 1.5, 4500) * np.exp(-t * 2.0)
    x = x[::-1]
    return np.stack([x, np.roll(x, 350)]) * 0.065


def barrido_hp(st, t0, dur):
    """HP sweep para el build."""
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


# == Composicion ===============================================================
def render():
    total = sum(c for _, c in SECCIONES)
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'pad', 'duro', 'tierno', 'fx']}
    sc = np.zeros(N)
    K, SN, CL = bombo_capas(), redoblante(), clap()
    H, HO = hat_metal(), hat_metal(True)
    ir = reverb_ir(dur=2.4, brillo=6500, seed=42)
    ir_sala = reverb_ir(dur=0.6, decay=8, brillo=8500, seed=43)
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
                vol = 0.7 if nombre in ('intro', 'final') else (0.85 if nombre == 'puente' else 1.0)
                poner(bus['pad'], colchon(notas, COMPAS * 0.95) * vol, paso(cg, 0))

            # -- Bateria --
            con_bateria = nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC', 'puente')
            if con_bateria:
                # Bombo
                if nombre == 'verso':
                    kicks = [0, 10]
                elif nombre == 'puente':
                    kicks = [0, 8]
                else:
                    kicks = [0, 6, 10] if frase != 3 else [0, 6, 10, 15]
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.9, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.2) * 15)[None], paso(cg, s, False))

                # Redoblante en 3 (medio tiempo); clap encima en ganchos B y C
                t_sn = paso(cg, 8, False) + hum(0.002)
                poner(bus['drums'], paneo(SN, 0.04) * 0.7, t_sn)
                if nombre in ('ganchoB', 'ganchoC'):
                    poner(bus['drums'], paneo(CL, -0.03) * 0.4, t_sn)

                # Hi-hats
                if nombre == 'puente':
                    for s in range(0, 16, 2):
                        ac_h = 0.7 if s % 4 == 0 else 0.4
                        poner(bus['drums'], paneo(H * ac_h, 0.3), paso(cg, s) + hum(0.002))
                else:
                    redoble = frase == 3 and nombre not in ('verso', 'puente')
                    paso_h = 2 if nombre == 'verso' else 1
                    for s in range(0, 16, paso_h):
                        if redoble and s >= 12:
                            break
                        ac_h = [1.0, 0.35, 0.6, 0.35][s % 4]
                        poner(bus['drums'], paneo(H * ac_h * (1 - rng.uniform(0, 0.15)), 0.3),
                              paso(cg, s) + hum(0.002))
                    if redoble:
                        for j in range(6):
                            poner(bus['drums'], paneo(repitch(H, 1 + j * 0.045) * (0.4 + 0.5 * j / 6), 0.3),
                                  cg * COMPAS + 12 * S16 + j * BEAT / 3)
                    # Hat abierto a contratiempo
                    if frase in (1, 3) and nombre not in ('verso', 'puente'):
                        ho = HO[:int(2 * S16 * SR)].copy()
                        ho[-250:] *= np.linspace(1, 0, 250)
                        poner(bus['drums'], paneo(ho, -0.25) * 0.7, paso(cg, 6))

            # -- 808 --
            if nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC'):
                r = n(RAIZ_808[ac])
                if nombre == 'verso':
                    patron = [(0, 0, 4), (10, 0, 4)]
                else:
                    patron = [(0, 0, 4), (6, 12, 2), (10, 0, 3)]
                    if frase == 3:
                        patron = [(0, 0, 4), (6, 12, 2), (10, 0, 2), (14, 7, 2)]
                for s, intervalo, l in patron:
                    glide = 0.08 if (s == 6 and intervalo == 12) else 0
                    notas808.append((paso(cg, s, False), r + intervalo, l * S16, glide))
            elif nombre == 'puente':
                r = n(RAIZ_808[ac])
                notas808.append((paso(cg, 0, False), r, COMPAS * 0.85, 0))

            # -- Leads --
            if nombre == 'intro':
                previa = None
                for (s, nota, l) in LEAD_TIERNO_A[frase]:
                    m = n(nota)
                    desde = previa if previa and abs(previa - m) <= 5 else None
                    x = lead_tierno(m, l * S16 * 0.95, desde)
                    poner(bus['tierno'], paneo(x, 0.1), paso(cg, s) + hum(0.003))
                    previa = m

            elif nombre == 'ganchoA':
                for (s, nota, l) in LEAD_DURO_A[frase]:
                    x = lead_duro(n(nota), l * S16 * 0.9)
                    poner(bus['duro'], paneo(x, -0.2), paso(cg, s) + hum(0.002))
                previa = None
                for (s, nota, l) in LEAD_TIERNO_A[frase]:
                    m = n(nota)
                    desde = previa if previa and abs(previa - m) <= 5 else None
                    x = lead_tierno(m, l * S16 * 0.95, desde)
                    poner(bus['tierno'], paneo(x, 0.2), paso(cg, s) + hum(0.003))
                    previa = m

            elif nombre == 'ganchoB':
                for (s, nota, l) in LEAD_DURO_B[frase]:
                    x = lead_duro(n(nota), l * S16 * 0.9)
                    poner(bus['duro'], paneo(x, -0.2), paso(cg, s) + hum(0.002))
                previa = None
                for (s, nota, l) in LEAD_TIERNO_B[frase]:
                    m = n(nota)
                    desde = previa if previa and abs(previa - m) <= 5 else None
                    x = lead_tierno(m, l * S16 * 0.95, desde)
                    poner(bus['tierno'], paneo(x, 0.2), paso(cg, s) + hum(0.003))
                    previa = m

            elif nombre == 'puente':
                for (s, nota, l) in LEAD_TIERNO_A[frase]:
                    m = n(nota)
                    x = lead_duro(m, l * S16 * 1.3, suave=True)
                    poner(bus['duro'], paneo(x, 0) * 0.8, paso(cg, s) + hum(0.003))

            elif nombre == 'ganchoC':
                for (s, nota, l) in LEAD_CONVERGENCIA[frase]:
                    m = n(nota)
                    x_t = lead_tierno(m, l * S16 * 0.95, apretado=True)
                    poner(bus['tierno'], paneo(x_t, 0.15), paso(cg, s) + hum(0.003))
                    m_up = tercera_arriba(m)
                    x_d = lead_duro(m_up, l * S16 * 0.95, suave=True)
                    poner(bus['duro'], paneo(x_d, -0.15), paso(cg, s) + hum(0.002))

            elif nombre == 'final':
                for (s, nota, l) in LEAD_CONVERGENCIA[frase][:2]:
                    m_up = tercera_arriba(n(nota))
                    x = lead_duro(m_up, l * S16 * 1.3, suave=True)
                    poner(bus['duro'], paneo(x, 0) * 0.5, paso(cg, s) + hum(0.003))

        c0 += largo

    T = lambda comp: comp * COMPAS  # noqa: E731

    # -- Momentos --
    # Platillos invertidos antes de cada gancho
    for g_name in ('ganchoA', 'ganchoB', 'ganchoC'):
        dur_pc = BEAT * (3 if g_name == 'ganchoA' else 4)
        pc = platillo_invertido(dur_pc)
        poner(bus['fx'], pc, T(ini[g_name]) - pc.shape[1] / SR)

    # Build: redoble de redoblante que acelera
    b0 = ini['build']
    tiempos = ([b0 * COMPAS + k * BEAT / 2 for k in range(4)] +
               [b0 * COMPAS + 2 * BEAT + k * S16 for k in range(8)] +
               [(b0 + 1) * COMPAS + k * S16 / 2 for k in range(24)])
    for j, tt in enumerate(tiempos):
        if tt < T(b0 + 2) - BEAT * 0.5:
            poner(bus['drums'], paneo(repitch(SN, 1 + j * 0.01), 0) * (0.25 + 0.55 * j / len(tiempos)), tt)

    # Render 808
    if notas808:
        b = ochocientos(notas808, N / SR, 2.2)
        bus['bajo'] += paneo(lp(b, 4200), 0)

    # == Mezcla =================================================================
    pd = hp(lp(bus['pad'], 5500), 150)
    pd = con_reverb(pd * (1 - 0.3 * np.clip(sc, 0, 1)), ir, 0.3)

    duro = hp(bus['duro'], 300)
    duro = saturar(duro, 0.2)
    duro = con_reverb(delay_pingpong(duro, BEAT * 0.75, 0.28, 0.18), ir, 0.2)

    tierno = hp(bus['tierno'], 200)
    tierno = con_reverb(delay_pingpong(tierno, BEAT * 0.5, 0.22, 0.16), ir, 0.28)

    drums = con_reverb(saturar(bus['drums'], 0.12), ir_sala, 0.07)
    bajo = bus['bajo'] * (1 - 0.3 * np.clip(sc, 0, 1))
    fx = bus['fx']

    mix = drums * 1.0 + bajo * 0.85 + pd * 0.9 + duro * 1.0 + tierno * 1.0 + fx

    # Build: HP sweep + silencio al final
    mix = barrido_hp(mix, T(ini['build']), COMPAS * 2 - BEAT * 0.5)
    s0 = int((T(ini['build'] + 2) - BEAT * 0.5) * SR)
    s1 = int(T(ini['build'] + 2) * SR)
    if s0 < mix.shape[1] and s1 <= mix.shape[1]:
        mix[:, s0:s1] *= 0.05

    # Ganancia por seccion: intro y final tienen pocas capas, necesitan refuerzo
    g = np.ones(mix.shape[1])
    for nm, valor in (('intro', 2.8), ('final', 2.3), ('build', 0.65), ('puente', 0.85)):
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
    f = os.path.join(out_dir, '2026-10-14-1.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.1f} s')
