"""SOLO — tema del día (2026-10-16-1)

Concepto: El jugador que se queda a entrenar solo cuando todos se fueron — la cancha
vacía, la pelota que pica sin respuesta, hasta que en esa soledad encuentra lo que no
encontraba con el grupo.

Emoción por sección:
  intro (4)    — vacío enorme, solo el eco de la pelota en la cancha desierta
  verso A (8)  — empieza a entrenar, incómodo con el silencio, movimientos tentativos
  gancho A (8) — encontró el ritmo, el entrenamiento fluye, confianza incipiente
  build (2)    — momento de duda: ¿tiene sentido entrenar solo?
  verso B (4)  — vuelve con decisión, más enfocado
  gancho B (8) — la confianza crece, el rebote se vuelve melodía (ya no solo eco)
  puente (4)   — se detiene, respira, siente la cancha
  gancho C (8) — plenitud, todo encaja, el vacío desapareció
  final (4)    — se va; el eco vuelve pero el jugador ya es otro

Rasgo distintivo: REBOTE SOLITARIO — pluck resonante con reverb larga que simula el eco
de una cancha vacía de noche; la reverb disminuye sección a sección (el vacío se llena
de confianza) y en el gancho C suena completamente seco por primera vez.

Estructura (50 compases, 144 BPM, fa# menor):
  intro 4 · verso A 8 · gancho A 8 · build 2 · verso B 4 · gancho B 8 · puente 4 ·
  gancho C 8 · final 4

Recursos: rebote solitario con reverb decreciente (firma del tema), lead saw+sine con
ataque variable (tentativo→seguro), pad de sines con chorus (vacío), 808 melódico con
saltos de octava y espacio, rebote invertido en las transiciones.

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_16_1.py
Salida: fuentes/beats/salida/diario/2026-10-16-1.wav
"""
import os
import sys

import numpy as np
import soundfile as sf
from scipy.signal import fftconvolve

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch,  # noqa: E402
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar, ochocientos)

BPM = 144
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.14 * S16
rng = np.random.default_rng(20261016)
NOMBRES = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6,
           'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOMBRES[nombre[:-1]]


ESCALA = {6, 8, 9, 11, 1, 2, 4}              # fa# menor natural: F# G# A B C# D E


def tercera_abajo(m):
    """Tercera diatónica abajo en fa# menor."""
    return m - 3 if (m - 3) % 12 in ESCALA else m - 4


def paso(c, s, swing_on=True):
    """Tiempo (seg) del paso s (semicorchea) del compás c, con swing en las impares."""
    return c * COMPAS + s * S16 + (SWING if swing_on and s % 2 == 1 else 0)


# ── Armonía (fa# menor: i7 → VImaj7 → IIImaj7 → VII7) ─────────────────────
ACORDES = {
    'F#m7':  ['F#3', 'A3', 'C#4', 'E4'],
    'Dmaj7': ['D3', 'F#3', 'A3', 'C#4'],
    'Amaj7': ['A3', 'C#4', 'E4', 'G#4'],
    'E7':    ['E3', 'G#3', 'B3', 'D4'],
}
RAIZ808 = {'F#m7': 'F#1', 'Dmaj7': 'D2', 'Amaj7': 'A1', 'E7': 'E2'}
REBOTE_NOTAS = {
    'F#m7':  ['F#4', 'C#5', 'A4'],
    'Dmaj7': ['D4', 'A4', 'F#4'],
    'Amaj7': ['A4', 'E5', 'C#5'],
    'E7':    ['E4', 'B4', 'G#4'],
}
PROG = ['F#m7', 'Dmaj7', 'Amaj7', 'E7']

# ── Melodías ────────────────────────────────────────────────────────────────
# Verso: 4 compases con desarrollo sutil (se repite 2× en el verso A de 8 compases)
VERSO_MEL = [
    [(0, 'A4', 3), (4, 'B4', 2), (8, 'C#5', 2), (12, 'A4', 4)],
    [(0, 'G#4', 3), (4, 'F#4', 6)],
    [(0, 'A4', 2), (3, 'B4', 1), (4, 'C#5', 3), (8, 'B4', 2), (12, 'A4', 4)],
    [(0, 'G#4', 2), (4, 'A4', 2), (8, 'F#4', 6)],
]
# Gancho A: 4 compases, llamada y respuesta, centro del tema
LEAD_A = [
    [(0, 'F#4', 2), (3, 'A4', 1), (4, 'B4', 3), (8, 'A4', 2), (10, 'C#5', 2), (12, 'B4', 4)],
    [(0, 'A4', 2), (3, 'G#4', 1), (4, 'E4', 2), (8, 'F#4', 4)],
    [(0, 'C#5', 3), (4, 'B4', 2), (7, 'A4', 1), (8, 'G#4', 2), (10, 'A4', 2), (12, 'B4', 4)],
    [(0, 'A4', 2), (3, 'G#4', 1), (4, 'F#4', 6)],
]
# Gancho C: 4 compases, registro alto, plenitud total
LEAD_C = [
    [(0, 'C#5', 2), (3, 'D5', 1), (4, 'E5', 3), (8, 'D5', 2), (10, 'C#5', 2), (12, 'B4', 4)],
    [(0, 'A4', 2), (3, 'B4', 1), (4, 'C#5', 4), (8, 'E5', 4)],
    [(0, 'F#5', 4), (4, 'E5', 2), (7, 'D5', 1), (8, 'C#5', 3), (12, 'B4', 4)],
    [(0, 'C#5', 2), (3, 'D5', 1), (4, 'E5', 2), (8, 'F#5', 6)],
]

SECCIONES = [
    ('intro', 4), ('versoA', 8), ('ganchoA', 8), ('build', 2),
    ('versoB', 4), ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 4),
]
# Reverb del rebote por sección: la firma narrativa del tema
REVERB_REBOTE = {
    'intro': 0.7, 'versoA': 0.5, 'ganchoA': 0.35, 'build': 0.25,
    'versoB': 0.2, 'ganchoB': 0.12, 'puente': 0.45, 'ganchoC': 0.0, 'final': 0.7,
}


# ── Instrumentos del tema ───────────────────────────────────────────────────
def rebote_sonido(m, largo=0.8):
    """Rebote solitario: pluck resonante como pelota picando en cancha vacía."""
    t = t_arr(largo)
    f = hz(m)
    lo, hi = max(20, f * 0.7), min(SR * 0.45, f * 1.6)
    transiente = bp(rng.standard_normal(len(t)), lo, hi) * np.exp(-t * 55) * 0.7
    cuerpo = np.sin(2 * np.pi * f * t) * np.exp(-t * 7)
    arm2 = np.sin(2 * np.pi * f * 2.003 * t) * np.exp(-t * 13) * 0.28
    arm3 = np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 20) * 0.1
    return (transiente + cuerpo + arm2 + arm3) * 0.32


def lead_solo(m, dur, ataque=0.06, desde=None):
    """Lead saw + sine sub: ataque variable (tentativo → seguro)."""
    t = t_arr(dur + 0.4)
    f = np.full(len(t), hz(m), dtype=float)
    if desde is not None:
        g = min(len(t), int(0.06 * SR))
        f[:g] *= (hz(desde) / hz(m)) ** (1 - np.arange(g) / g)
    vib = 1 + 0.005 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.25) * 3, 0, 1)
    f *= vib
    ph = np.cumsum(f) / SR
    x = (2 * (ph - np.floor(ph + 0.5))) * 0.55                  # saw principal
    x += np.sin(2 * np.pi * ph * 0.5) * 0.3                     # sine sub-octava (calidez)
    x = lp(x, 3200)
    return x * env_adsr(len(t), ataque, 0.18, 0.6, 0.2, dur) * 0.22


def pad_vacio(notas_midi, dur, brillo=1400):
    """Pad de sines con chorus: espacio abierto, vacío que se siente."""
    t = t_arr(dur + 1.5)
    out = np.zeros((2, len(t)))
    for m in notas_midi:
        for v in range(5):
            det = (v - 2) * 0.003
            mod = 0.4 + v * 0.12
            f = hz(m) * (1 + det + 0.002 * np.sin(2 * np.pi * mod * t))
            ph = np.cumsum(f) / SR
            out += paneo(np.sin(2 * np.pi * ph) / 5, (v - 2) / 2.5 * 0.8)
    e = env_adsr(len(t), 0.65, 0.45, 0.75, 1.5, dur)
    am = 0.85 + 0.15 * np.sin(2 * np.pi * 0.25 * t)
    return lp(out, brillo) * e * am * 0.13


def bombo_solo():
    """Kick en capas: sub + punch + click."""
    t = t_arr(0.45)
    sub = np.sin(2 * np.pi * np.cumsum(44 + 15 * np.exp(-t * 20)) / SR) * np.exp(-t * 5.5)
    punch = np.sin(2 * np.pi * np.cumsum(62 + 125 * np.exp(-t * 52)) / SR) * np.exp(-t * 25)
    click = hp(rng.standard_normal(len(t)), 3200) * np.exp(-t * 380) * 0.5
    return np.tanh((sub * 0.8 + punch * 0.85 + click) * 1.5)


def snare_fantasma():
    """Snare con carácter de rimshot: más tono que ruido, cola resonante."""
    t = t_arr(0.32)
    cuerpo = np.sin(2 * np.pi * 195 * t) * np.exp(-t * 22)
    reson = np.sin(2 * np.pi * 370 * t) * np.exp(-t * 11) * 0.4
    ruido = bp(rng.standard_normal(len(t)), 1800, 8500) * np.exp(-t * 16)
    return np.tanh((cuerpo * 0.6 + reson + ruido * 0.65) * 1.3)


def hat_fino(abierto=False):
    """Hi-hat fino y metálico."""
    t = t_arr(0.38 if abierto else 0.065)
    x = sum(np.sign(np.sin(2 * np.pi * f * t))
            for f in (215.0, 322.1, 378.5, 549.2, 562.0, 838.7))
    x = hp(bp(x, 6500, 15000), 7500) * np.exp(-t * (7.5 if abierto else 58))
    return x * 0.2


def rebote_invertido(m, dur=1.2):
    """Rebote al revés: swell orgánico para las transiciones."""
    r = rebote_sonido(m, dur)
    r = r[::-1].copy()
    r[:int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
    return r * 0.45


# ── Composición ─────────────────────────────────────────────────────────────
def render():
    total = sum(c for _, c in SECCIONES)
    N = int((total * COMPAS + 5) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'rebote', 'pad', 'lead', 'fx']}
    sc = np.zeros(N)

    K, SN = bombo_solo(), snare_fantasma()
    H, HO = hat_fino(), hat_fino(True)
    ir_grande = reverb_ir(dur=3.2, decay=2.2, brillo=4500, seed=1016)
    ir_sala = reverb_ir(dur=0.7, decay=6.5, brillo=7500, seed=1017)
    ir_lead = reverb_ir(dur=2.2, brillo=5500, seed=1018)
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
            gancho = nombre.startswith('gancho')
            verso = nombre.startswith('verso')

            # ── Rebote solitario ──
            reb_pasos = {
                'intro': [0, 7, 11], 'versoA': [0, 5, 10], 'ganchoA': [0, 4, 8, 12],
                'build': [0, 8], 'versoB': [0, 5, 10], 'ganchoB': [0, 3, 7, 10, 14],
                'puente': [0, 10], 'ganchoC': [0, 4, 8, 12], 'final': [0, 7, 11],
            }
            reb_notas = REBOTE_NOTAS[ac]
            for i, s in enumerate(reb_pasos.get(nombre, [])):
                nota = reb_notas[i % len(reb_notas)]
                r = rebote_sonido(n(nota))
                pan = -0.25 + 0.2 * ((i * 7) % 5 - 2) / 2
                poner(bus['rebote'], paneo(r, pan), paso(cg, s) + hum(0.002))

            # ── Pad ──
            if nombre != 'build':
                notas_pad = [n(x) for x in ACORDES[ac]]
                vol = 0.7 if nombre in ('intro', 'final', 'puente') else (0.35 if gancho else 0.5)
                bri = 1100 if nombre in ('intro', 'final', 'puente') else 1500
                poner(bus['pad'], pad_vacio(notas_pad, COMPAS, bri) * vol,
                      paso(cg, 0, False))

            # ── Lead ──
            if gancho or verso:
                if nombre == 'ganchoC':
                    fr, mel_f = LEAD_C, frase
                elif gancho:
                    fr, mel_f = LEAD_A, frase
                else:
                    fr, mel_f = VERSO_MEL, c % len(VERSO_MEL)
                ataque = 0.14 if verso else (0.03 if nombre == 'ganchoC' else 0.06)
                oct_ = -12 if nombre == 'versoB' else 0
                previa = None
                for (s, nota, l) in fr[mel_f]:
                    m = n(nota) + oct_
                    x = lead_solo(m, l * S16 * 0.95, ataque,
                                  previa if previa and abs(previa - m) <= 5 else None)
                    poner(bus['lead'], paneo(x, -0.12 + 0.08 * ((s // 4) % 3 - 1)),
                          paso(cg, s) + hum(0.003))
                    previa = m
                # Gancho B: contramelodía una tercera diatónica abajo en las notas largas
                if nombre == 'ganchoB':
                    for (s, nota, l) in fr[mel_f]:
                        if l >= 3:
                            m = tercera_abajo(n(nota))
                            x = lead_solo(m, l * S16 * 0.9, 0.08) * 0.45
                            poner(bus['lead'], paneo(x, 0.3), paso(cg, s) + S16 * 0.3)

            # ── Batería ──
            con_bat = nombre in ('versoA', 'ganchoA', 'versoB', 'ganchoB', 'ganchoC')
            if con_bat:
                kicks = ([0, 10] if frase != 3 else [0, 10, 14]) if verso \
                    else ([0, 6, 10] if frase != 3 else [0, 6, 10, 15])
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.92, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.2) * 15)[None], paso(cg, s, False))
                # Snare en el tercer tiempo (medio tiempo)
                poner(bus['drums'], paneo(SN, 0.04) * (0.6 if verso else 0.78),
                      paso(cg, 8, False) + hum(0.002))
                # Ghost snares en ganchos B y C
                if nombre in ('ganchoB', 'ganchoC') and frase in (1, 3):
                    poner(bus['drums'], paneo(SN, -0.1) * 0.22,
                          paso(cg, 4) + hum(0.003))
                # Hi-hats
                if nombre in ('ganchoB', 'ganchoC'):
                    redoble = frase == 3 and ultimo
                    for s in range(16):
                        if redoble and s >= 12:
                            break
                        vel = [1.0, 0.35, 0.6, 0.35][s % 4]
                        poner(bus['drums'],
                              paneo(H * vel * (1 - rng.uniform(0, 0.15)), 0.3),
                              paso(cg, s) + hum(0.002))
                    if redoble:
                        for j in range(8):
                            poner(bus['drums'],
                                  paneo(repitch(H, 1 + j * 0.045) * (0.4 + 0.5 * j / 8), 0.3),
                                  cg * COMPAS + 12 * S16 + j * S16 * 0.5)
                elif nombre == 'ganchoA':
                    for s in range(0, 16, 2):
                        vel = 0.8 if s % 4 == 0 else 0.5
                        poner(bus['drums'],
                              paneo(H * vel * (1 - rng.uniform(0, 0.12)), 0.3),
                              paso(cg, s) + hum(0.002))
                else:                                             # versos: hats espaciados
                    for s in [0, 4, 8, 12]:
                        vel = 0.65 if s % 8 == 0 else 0.38
                        poner(bus['drums'], paneo(H * vel, 0.3),
                              paso(cg, s) + hum(0.002))
                # Hat abierto a contratiempo en ganchos
                if gancho and frase in (1, 3):
                    ho = HO[:int(2.5 * S16 * SR)].copy()
                    ho[-280:] *= np.linspace(1, 0, 280)
                    poner(bus['drums'], paneo(ho, -0.28) * 0.65, paso(cg, 6))

            # ── 808 ──
            if nombre in ('versoA', 'ganchoA', 'versoB', 'ganchoB', 'ganchoC', 'puente'):
                r808 = n(RAIZ808[ac])
                if nombre == 'puente':
                    pat808 = [(0, 0, 14)]                         # nota larga: respirar
                elif verso:
                    pat808 = ([(0, 0, 5), (10, 0, 4)] if frase != 3
                              else [(0, 0, 5), (10, 0, 3), (14, 12, 2)])
                else:
                    pat808 = [(0, 0, 3), (4, 0, 2), (6, 12, 2), (10, 0, 4)]
                    if frase == 3:
                        pat808 = [(0, 0, 3), (4, 0, 2), (6, 12, 2), (10, 0, 3), (14, 7, 2)]
                for s, intervalo, l in pat808:
                    glide = (0.1 if s == 0 and frase == 0 and c > 0 and nombre != 'puente'
                             else 0)
                    notas808.append((paso(cg, s, False), r808 + intervalo, l * S16, glide))
        c0 += largo

    T = lambda comp: comp * COMPAS                                # noqa: E731

    # ── FX: rebotes invertidos antes de cada gancho ──
    for sec in ('ganchoA', 'ganchoB', 'ganchoC'):
        ac = PROG[ini[sec] % 4]
        nota = REBOTE_NOTAS[ac][0]
        ri = rebote_invertido(n(nota), BEAT * 3.5)
        poner(bus['fx'], paneo(ri, 0), T(ini[sec]) - len(ri) / SR)

    # ── Build: redoble de snare que acelera ──
    b0 = ini['build']
    tiempos = ([b0 * COMPAS + k * BEAT for k in range(4)]
               + [b0 * COMPAS + 2 * BEAT + k * S16 for k in range(8)]
               + [(b0 + 1) * COMPAS + k * S16 / 2 for k in range(16)])
    for j, tt in enumerate(tiempos):
        if tt < T(b0 + 2) - BEAT * 0.3:
            poner(bus['drums'],
                  paneo(repitch(SN, 1 + j * 0.012), 0) * (0.2 + 0.6 * j / len(tiempos)),
                  tt)

    # ── 808 ──
    if notas808:
        bus['bajo'] += paneo(lp(ochocientos(notas808, N / SR, 2.0), 4200), 0)

    # ── Mezcla ──────────────────────────────────────────────────────────────
    # Rebote: reverb variable por sección (firma del tema)
    rebote_dry = bus['rebote']
    rebote_conv = np.stack(
        [fftconvolve(rebote_dry[c], ir_grande[c])[:N] for c in range(2)])
    wet_env = np.zeros(N)
    for nombre, largo in SECCIONES:
        s0 = int(T(ini[nombre]) * SR)
        s1 = min(N, int(T(ini[nombre] + largo) * SR))
        wet_env[s0:s1] = REVERB_REBOTE[nombre]
    wet_env = np.clip(lp(wet_env, 1.5), 0, 1)
    rebote_mix = rebote_dry * (1 - wet_env * 0.5) + rebote_conv * wet_env

    # Pad
    pad_mix = con_reverb(
        hp(lp(bus['pad'], 3500), 80) * (1 - 0.2 * np.clip(sc, 0, 1)),
        ir_grande, 0.25)
    # Lead
    lead_mix = con_reverb(
        delay_pingpong(lp(saturar(hp(bus['lead'], 240), 0.18), 7500),
                       BEAT * 0.75, 0.28, 0.18),
        ir_lead, 0.22)
    # Drums
    drums_mix = con_reverb(saturar(bus['drums'], 0.1), ir_sala, 0.07)
    # Bajo
    bajo_mix = bus['bajo'] * (1 - 0.3 * np.clip(sc, 0, 1))

    mix = (drums_mix + bajo_mix * 0.8 + rebote_mix * 1.1
           + pad_mix * 0.85 + lead_mix + bus['fx'])

    # Build: fade al silencio en el último cuarto de beat antes de verso B
    corte_s = int((T(ini['build'] + 2) - BEAT * 0.25) * SR)
    b_s1 = min(mix.shape[1], int(T(ini['build'] + 2) * SR))
    if corte_s < b_s1 and b_s1 - corte_s > 0:
        mix[:, corte_s:b_s1] *= np.linspace(1, 0.03, b_s1 - corte_s)

    # Dinámica por sección
    g = np.ones(mix.shape[1])
    for nombre, valor in [('intro', 2.8), ('final', 2.5), ('puente', 1.3), ('build', 0.7),
                           ('versoA', 0.85), ('versoB', 0.85)]:
        largo = dict(SECCIONES)[nombre]
        a_ = int(T(ini[nombre]) * SR)
        b_ = min(mix.shape[1], int(T(ini[nombre] + largo) * SR))
        g[a_:b_] = valor
    g = lp(g, 2.5)
    mix *= g

    # Master
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
    f = os.path.join(out, '2026-10-16-1.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.1f} s')
