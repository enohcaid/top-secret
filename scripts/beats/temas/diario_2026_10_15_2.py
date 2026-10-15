"""MUDO — tema del día 2026-10-15-2.

Concepto: El gol más importante de tu vida y no te sale el grito — te quedás quieto con los ojos
cerrados mientras el mundo explota alrededor, hasta que la emoción te rompe y finalmente gritás.

Emoción por sección:
  intro    — tiempo detenido: la pelota cruza la línea y el mundo se congela
  gancho A — el ruido llega lejano, la emoción presiona desde adentro
  verso    — flashback: todo lo que costó llegar a esta jugada
  build    — algo se quiebra, la presión es insoportable
  gancho B — los compañeros llegan corriendo, empezás a sentir
  puente   — la emoción sube al pecho, a la garganta
  gancho C — el grito finalmente sale, la voz se encuentra, todo se alinea
  final    — el abrazo, la voz ya no tiembla

Rasgo distintivo: nota partida — cada nota del lead arranca dividida en dos voces
micro-tonalmente separadas (±20 cents), como una voz que tiembla y no puede salir; la separación
se reduce sección a sección (22→18→8→5→0 cents) y en el gancho C las voces suenan al unísono
perfecto — el momento en que encontrás la voz.

Estructura (46 compases, 128 BPM, do menor):
  intro 4 · gancho A 8 · verso 8 · build 2 · gancho B 8 · puente 4 · gancho C 8 · final 4

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_15_2.py
Salida: fuentes/beats/salida/diario/2026-10-15-2.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, env_adsr, poner, repitch,  # noqa: E402
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar,
                      ochocientos)

BPM = 128
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.14 * S16
rng = np.random.default_rng(10152)
NOMBRES = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
           'F#': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOMBRES[nombre[:-1]]


def paso(c, s, swing=True):
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


# ── Armonía (do menor: i → VI → III → V) ───────────────────────────────────
CUERDAS_V = {
    'Cm7':  ['C4', 'Eb4', 'G4', 'Bb4'],
    'AbM7': ['Ab3', 'C4', 'Eb4', 'G4'],
    'Eb':   ['Eb4', 'G4', 'Bb4'],
    'G7':   ['G3', 'B3', 'D4', 'F4'],
}
PIANO_V = {
    'Cm7': ['C3', 'C4'], 'AbM7': ['Ab2', 'Ab3'],
    'Eb':  ['Eb3', 'Eb4'], 'G7': ['G2', 'G3'],
}
RAIZ808 = {'Cm7': 'C2', 'AbM7': 'Ab1', 'Eb': 'Eb2', 'G7': 'G1'}
PROG = ['Cm7', 'AbM7', 'Eb', 'G7']

# Lead del gancho A/B: melodía fragmentada, buscando la voz que no sale
LEAD_HOOK = [
    [(0, 'G4', 2), (4, 'Eb4', 3), (8, 'C4', 3), (12, 'D4', 4)],                                      # Cm7 — descenso roto
    [(0, 'C5', 3), (4, 'Eb5', 2), (7, 'D5', 1), (8, 'C5', 2), (12, 'Ab4', 4)],                        # AbM7 — sube y cae
    [(0, 'Bb4', 2), (3, 'G4', 2), (6, 'Eb4', 2), (8, 'F4', 2), (12, 'G4', 4)],                        # Eb — busca salida
    [(0, 'D5', 2), (3, 'B4', 1), (4, 'G4', 3), (8, 'Ab4', 2), (11, 'G4', 1), (12, 'F4', 4)],          # G7 — tensión
]
# Lead del gancho C: la voz encontrada, más aguda y fluida
LEAD_C = [
    [(0, 'G5', 3), (4, 'Eb5', 2), (7, 'F5', 1), (8, 'G5', 4), (14, 'Eb5', 2)],                        # Cm7 — el grito
    [(0, 'Eb5', 2), (3, 'F5', 1), (4, 'G5', 3), (8, 'Ab5', 2), (11, 'G5', 1), (12, 'Eb5', 4)],        # AbM7 — expansión
    [(0, 'Bb5', 4), (5, 'G5', 2), (8, 'F5', 3), (12, 'Eb5', 4)],                                       # Eb — el pico
    [(0, 'D5', 3), (4, 'F5', 2), (8, 'G5', 6)],                                                         # G7 — resolución
]
# Verso: melodía contemplativa en piano (flashback)
VERSO_MEL = [
    [(0, 'Eb4', 6), (10, 'D4', 4)],                  # Cm7 — descenso suave
    [(0, 'C4', 6), (10, 'G3', 4)],                    # AbM7 — cae a la séptima
    [(0, 'Bb3', 6), (10, 'G3', 4)],                   # Eb — quinta al tercero
    [(0, 'F3', 6), (10, 'D3', 4)],                    # G7 — séptima a quinta
]

SECCIONES = [('intro', 4), ('ganchoA', 8), ('verso', 8), ('build', 2),
             ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 4)]

# Separación micro-tonal por sección (cents) — la firma del tema
DETUNE = {'intro': 22, 'ganchoA': 18, 'verso': 15, 'build': 12,
          'ganchoB': 8, 'puente': 5, 'ganchoC': 0, 'final': 0}


# ── Instrumentos del tema ───────────────────────────────────────────────────
def lead_partida(m, dur, cents=20, desde=None):
    """Dos voces micro-tonalmente separadas: la voz que tiembla y no puede salir."""
    t = t_arr(dur + 0.5)
    f_base = hz(m)
    ratio_up = 2 ** (cents / 1200)
    ratio_dn = 2 ** (-cents / 1200)
    f_up = np.full(len(t), f_base * ratio_up)
    f_dn = np.full(len(t), f_base * ratio_dn)
    if desde is not None:
        gl = min(len(t), int(0.06 * SR))
        slide = (hz(desde) / f_base) ** (1 - np.arange(gl) / gl)
        f_up[:gl] *= slide
        f_dn[:gl] *= slide
    vib = 1 + 0.005 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.2) * 3, 0, 1)
    f_up *= vib
    f_dn *= vib
    ph_up = np.cumsum(f_up) / SR
    ph_dn = np.cumsum(f_dn) / SR
    # Triángulo + toque de sierra: timbre vocal, ni muy limpio ni muy áspero
    tri_up = 2 * np.abs(2 * (ph_up % 1) - 1) - 1
    tri_dn = 2 * np.abs(2 * (ph_dn % 1) - 1) - 1
    saw_up = 2 * (ph_up - np.floor(ph_up + 0.5))
    saw_dn = 2 * (ph_dn - np.floor(ph_dn + 0.5))
    voz_up = tri_up * 0.65 + saw_up * 0.35
    voz_dn = tri_dn * 0.65 + saw_dn * 0.35
    e = env_adsr(len(t), 0.012, 0.18, 0.55, 0.2, dur)
    # Voz alta ligeramente a la derecha, voz baja a la izquierda
    return np.stack([voz_up * 0.55 + voz_dn * 0.45,
                     voz_up * 0.45 + voz_dn * 0.55]) * e * 0.18


def piano_grave(m, dur=2.0):
    """Piano oscuro percusivo: martillo con fieltro, pocos armónicos, mucho cuerpo."""
    t = t_arr(dur)
    f = hz(m)
    hit = rng.standard_normal(len(t)) * np.exp(-t * 200) * 0.15
    x = sum(np.sin(2 * np.pi * f * h * t * (1 + 0.0003 * h ** 2)) *
            np.exp(-t * (1.5 + h * 0.8)) / h for h in range(1, 5))
    return lp(hp(x + hit, 55), 2500) * env_adsr(len(t), 0.005, 0.8, 0.3, 0.5, dur) * 0.3


def cuerdas(notas_str, dur, brillo=2200):
    """Cuerdas cálidas: 4 voces detuneadas con vibrato de arco lento."""
    t = t_arr(dur + 2.0)
    out = np.zeros((2, len(t)))
    for nota in notas_str:
        m_ = n(nota)
        f = hz(m_)
        for v in range(4):
            det = (v - 1.5) * 0.0035
            bow = 1 + 0.006 * np.sin(2 * np.pi * (3.2 + v * 0.8) * t) * np.clip((t - 0.3) * 2, 0, 1)
            ph = np.cumsum(f * (1 + det) * bow) / SR
            x = 2 * (ph - np.floor(ph + 0.5))
            out += paneo(x / 4, (v - 1.5) / 2.0 * 0.5)
    e = env_adsr(len(t), 0.4, 0.7, 0.7, 1.2, dur)
    return lp(out, brillo) * e * 0.10


def bombo_profundo():
    """Bombo con sub extendido y click definido."""
    t = t_arr(0.55)
    sub = np.sin(2 * np.pi * np.cumsum(42 + 20 * np.exp(-t * 25)) / SR) * np.exp(-t * 5)
    punch = np.sin(2 * np.pi * np.cumsum(65 + 180 * np.exp(-t * 70)) / SR) * np.exp(-t * 35)
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 350) * 0.4
    return np.tanh((sub * 0.9 + punch * 0.8 + click) * 1.4)


def palmada():
    """Palmada abierta con cuerpo ancho."""
    t = t_arr(0.4)
    ruido = bp(rng.standard_normal(len(t)), 700, 6000)
    e = np.zeros(len(t))
    for k, off in enumerate([0, 0.013, 0.024]):
        i = int(off * SR)
        e[i:] += np.exp(-(t[:len(t) - i]) * 55) * (0.7 if k < 2 else 1)
    e += 0.5 * np.exp(-t * 12)
    return np.tanh(ruido * e * 1.5) * 0.75


def hat_fino(abierto=False):
    """Hi-hat fino metálico: cuadradas inarmónicas, no ruido."""
    t = t_arr(0.35 if abierto else 0.065)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (213.7, 318.2, 387.5, 548.9, 573.1, 826.3))
    x = hp(bp(x, 5500, 15000), 6500) * np.exp(-t * (8 if abierto else 65))
    return x * 0.2


def rimshot():
    t = t_arr(0.06)
    return (bp(rng.standard_normal(len(t)), 1200, 3000) * 0.5 +
            np.sin(2 * np.pi * 780 * t)) * np.exp(-t * 100) * 0.3


def swell_invertido(dur):
    """Swell de ruido invertido: crece hacia la entrada."""
    t = t_arr(dur)
    x = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 1.8)
    x = x[::-1]
    e = np.linspace(0, 1, len(t)) ** 2
    return np.stack([x * e, np.roll(x, 350) * e]) * 0.06


# ── Composición ──────────────────────────────────────────────────────────────
def render():
    total = sum(c for _, c in SECCIONES)
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'cuerdas', 'lead', 'piano', 'fx']}
    sc = np.zeros(N)

    K, CL, H, HO, RI = bombo_profundo(), palmada(), hat_fino(), hat_fino(True), rimshot()
    ir = reverb_ir(dur=2.8, brillo=5500, seed=42)
    ir_corta = reverb_ir(dur=0.6, decay=8, brillo=7000, seed=43)
    notas808 = []
    ini = {}
    c0 = 0
    hum = lambda s=0.004: rng.normal(0, s)
    vel_fn = lambda: 1 - rng.uniform(0, 0.2)

    for nombre, largo in SECCIONES:
        ini[nombre] = c0
        cents = DETUNE[nombre]

        for c in range(largo):
            cg = c0 + c
            ac = PROG[c % 4]
            frase = c % 4
            ultimo = c == largo - 1
            gancho = nombre.startswith('gancho')

            # ── Cuerdas: ganchos, verso, puente, final ──
            if nombre in ('ganchoA', 'verso', 'ganchoB', 'puente', 'ganchoC', 'final'):
                brillo_c = {'verso': 2000, 'puente': 2200, 'ganchoC': 2800, 'final': 1800}.get(nombre, 2200)
                poner(bus['cuerdas'], cuerdas(CUERDAS_V[ac], COMPAS, brillo_c), paso(cg, 0, False))

            # ── Piano grave ──
            if nombre in ('intro', 'puente', 'final'):
                for nota in PIANO_V[ac]:
                    poner(bus['piano'], paneo(piano_grave(n(nota), COMPAS * 0.8),
                          0.1 * (1 if nota[-1] > '3' else -1)), paso(cg, 0, False) + hum(0.002))
                if frase in (1, 3) and nombre != 'final':
                    poner(bus['piano'], paneo(piano_grave(n(PIANO_V[ac][0]), BEAT * 1.5), 0),
                          paso(cg, 8, False) + hum(0.002))
            if nombre == 'verso':
                # Raíz grave como base
                for nota in PIANO_V[ac]:
                    poner(bus['piano'], paneo(piano_grave(n(nota), COMPAS * 0.7),
                          0.08 * (1 if nota[-1] > '3' else -1)) * 0.7, paso(cg, 0, False) + hum(0.002))
                # Melodía contemplativa del flashback
                for (s, nota, l) in VERSO_MEL[frase]:
                    poner(bus['piano'], paneo(piano_grave(n(nota), l * S16 * 0.9), 0.15) * 0.8,
                          paso(cg, s, False) + hum(0.003))

            # ── Lead partida ──
            if nombre in ('ganchoA', 'ganchoB', 'ganchoC', 'puente', 'final'):
                fr = LEAD_C if nombre == 'ganchoC' else LEAD_HOOK
                previa = None
                for (s, nota, l) in fr[frase]:
                    m = n(nota)
                    desde_m = previa if previa and abs(previa - m) <= 5 else None
                    x = lead_partida(m, l * S16 * 0.95, cents, desde_m)
                    v = vel_fn()
                    if nombre == 'final':
                        v *= 0.7
                    elif nombre == 'puente':
                        v *= 0.6
                    poner(bus['lead'], x * v, paso(cg, s) + hum(0.003))
                    previa = m
            elif nombre == 'intro' and c >= 2:
                # Últimos 2 compases: el lead asoma filtrado
                for (s, nota, l) in LEAD_HOOK[frase]:
                    m = n(nota)
                    x = lead_partida(m, l * S16 * 0.95, cents, None)
                    x = lp(x, 1000 + (c - 2) * 300)
                    poner(bus['lead'], x * 0.6, paso(cg, s) + hum(0.003))
            elif nombre == 'build':
                for (s, nota, l) in LEAD_HOOK[frase]:
                    m = n(nota)
                    x = lead_partida(m, l * S16 * 0.95, cents, None)
                    poner(bus['lead'], x * (0.8 + 0.2 * c), paso(cg, s) + hum(0.003))

            # ── Batería ──
            con_bateria = nombre in ('ganchoA', 'verso', 'ganchoB', 'puente', 'ganchoC')
            if con_bateria:
                # Bombos
                if nombre == 'verso':
                    kicks = [0, 10]
                elif nombre == 'puente':
                    kicks = [0, 5, 10] if frase % 2 == 0 else [0, 7]
                else:
                    kicks = [0, 6, 10] if frase != 3 else [0, 6, 10, 15]
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.95, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.2) * 16)[None], paso(cg, s, False))
                # Palmada en el tercer tiempo (medio tiempo)
                poner(bus['drums'], paneo(CL, 0.04) * 0.7, paso(cg, 8, False) + hum(0.002))
                # Hi-hats
                if nombre == 'puente':
                    # Tresillos en el puente
                    for k in range(12):
                        poner(bus['drums'], paneo(H * (0.8 if k % 3 == 0 else 0.45), 0.3),
                              cg * COMPAS + k * COMPAS / 12 + hum(0.002))
                else:
                    paso_h = 2 if nombre == 'verso' else 1
                    redoble = frase == 3 and gancho
                    for s in range(0, 16, paso_h):
                        if redoble and s >= 12:
                            break
                        acento = [1.0, 0.4, 0.65, 0.4][s % 4]
                        poner(bus['drums'], paneo(H * acento * vel_fn(), 0.3), paso(cg, s) + hum(0.002))
                    if redoble:
                        for j in range(6):
                            r = 1 + j * 0.05
                            poner(bus['drums'], paneo(repitch(H, r) * (0.4 + 0.5 * j / 6), 0.3),
                                  cg * COMPAS + 12 * S16 + j * BEAT / 6)
                    # Hat abierto a contratiempo en los ganchos
                    if frase in (1, 3) and gancho:
                        ho = HO[:int(2 * S16 * SR)].copy()
                        ho[-300:] *= np.linspace(1, 0, 300)
                        poner(bus['drums'], paneo(ho, -0.25) * 0.7, paso(cg, 6))
                # Rimshot en el verso
                if nombre == 'verso' and frase in (1, 3):
                    poner(bus['drums'], paneo(RI, 0.4) * 0.5, paso(cg, 12))

            # ── 808 ──
            if nombre in ('ganchoA', 'verso', 'ganchoB', 'puente', 'ganchoC'):
                r = n(RAIZ808[ac])
                if nombre == 'verso':
                    pat = [(0, 0, 6), (10, 0, 4)]
                    if frase == 3:
                        pat = [(0, 0, 6), (10, 0, 3), (14, 5, 2)]
                elif nombre == 'puente':
                    pat = [(0, 0, 14)] if frase % 2 == 0 else [(0, 0, 6), (8, 12, 6)]
                else:  # ganchos
                    pat = [(0, 0, 4), (6, 12, 2), (10, 0, 4)]
                    if frase == 3:
                        pat = [(0, 0, 4), (6, 12, 2), (10, 0, 2), (14, 7, 2)]
                for s, intervalo, l in pat:
                    glide = 0.1 if s > 0 and intervalo >= 7 else 0
                    notas808.append((paso(cg, s, False), r + intervalo, l * S16, glide))

        c0 += largo

    T = lambda comp: comp * COMPAS

    # ── Momentos (cada recurso 1-2 veces) ────────────────────────────────────
    # 1) Swell invertido hacia los ganchos A y B
    for g_name in ('ganchoA', 'ganchoB'):
        sw = swell_invertido(BEAT * 4)
        poner(bus['fx'], sw, T(ini[g_name]) - sw.shape[1] / SR)
    # Swell más grande hacia el gancho C (el grito)
    sw = swell_invertido(BEAT * 6)
    poner(bus['fx'], sw * 1.5, T(ini['ganchoC']) - sw.shape[1] / SR)

    # 2) Build: redoble de palmadas que acelera
    b0 = ini['build']
    tiempos = ([b0 * COMPAS + k * BEAT / 2 for k in range(4)] +
               [b0 * COMPAS + 2 * BEAT + k * S16 for k in range(8)] +
               [(b0 + 1) * COMPAS + k * S16 / 2 for k in range(24)])
    for j, tt in enumerate(tiempos):
        if tt < T(b0 + 2) - BEAT * 0.4:
            poner(bus['drums'], paneo(repitch(CL, 1 + j * 0.01), 0) * (0.2 + 0.5 * j / len(tiempos)), tt)

    # 3) Cuerdas en el build con brillo que sube
    for c in range(2):
        cg_b = b0 + c
        ac = PROG[cg_b % 4]
        poner(bus['cuerdas'], cuerdas(CUERDAS_V[ac], COMPAS, 2500 + c * 800), T(cg_b))

    # 808
    if notas808:
        b = ochocientos(notas808, N / SR, 2.0)
        bus['bajo'] += paneo(lp(b, 4000), 0)

    # ── Mezcla ───────────────────────────────────────────────────────────────
    crd = hp(lp(bus['cuerdas'], 7000), 150)
    crd = con_reverb(crd * (1 - 0.35 * np.clip(sc, 0, 1)), ir, 0.3)

    lead = hp(bus['lead'], 200)
    lead = saturar(lead, 0.2)
    lead = lp(lead, 8000)
    lead = con_reverb(delay_pingpong(lead, BEAT * 0.75, 0.35, 0.2), ir, 0.25)

    pno = hp(bus['piano'], 75)
    pno = con_reverb(pno, ir, 0.2)

    drums = con_reverb(saturar(bus['drums'], 0.12), ir_corta, 0.06)
    bajo = bus['bajo'] * (1 - 0.25 * np.clip(sc, 0, 1))

    mix = drums * 1.0 + bajo * 0.85 + crd * 0.85 + lead * 1.0 + pno * 0.8 + bus['fx']

    # ── Dinámica por sección ──
    g = np.ones(mix.shape[1])
    for nombre_s, valor in (('intro', 2.5), ('verso', 0.8), ('build', 0.7), ('final', 1.5)):
        largo_s = dict(SECCIONES)[nombre_s]
        a_, b_ = int(T(ini[nombre_s]) * SR), min(mix.shape[1], int(T(ini[nombre_s] + largo_s) * SR))
        g[a_:b_] = valor
    g = lp(g, 3)
    mix = mix * g

    # Silencio breve al final del build (antes del gancho B)
    gap_i = int((T(ini['build'] + 2) - BEAT * 0.3) * SR)
    gap_f = int(T(ini['build'] + 2) * SR)
    if gap_f <= mix.shape[1]:
        mix[:, gap_i:gap_f] *= np.linspace(1, 0.02, gap_f - gap_i)

    mix = hp(mix, 28)
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
    f = os.path.join(out, '2026-10-15-2.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.0f} s')
