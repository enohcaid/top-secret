"""MADRUGADA — tema del día 2026-10-09.

Concepto: la noche antes de una final, cuando no podés dormir. La cabeza alterna
entre la duda y la convicción hasta que, al amanecer, sabés que estás listo.

Emoción por sección:
  intro    — insomnio: un piano suena lejano, como desde otro cuarto
  gancho A — la determinación aparece: el golpe entra, el piano se acerca
  verso    — los pensamientos se cruzan: duda, recuerdos
  build    — aguantar la respiración
  gancho B — convicción plena: la duda se vuelve combustible
  puente   — la pausa más profunda: solo el piano lejano y la voz
  gancho C — amanecer: melodía nueva que resuelve la tensión
  final    — el piano vuelve a la distancia, pero sereno

Rasgo distintivo: "piano lejano" — un piano reverberado y filtrado que suena como
  desde otra habitación (intro, verso, puente, final); en los ganchos se acerca
  (más seco, más brillante). La transición espacial lejos→cerca es la firma.

Estructura (48 compases, 130 BPM, re menor natural):
  intro 4 · gancho A 8 · verso 8 · build 4 · gancho B 8 · puente 4 · gancho C 8 · final 4

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_09.py
Salida: fuentes/beats/salida/diario/2026-10-09.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch,  # noqa: E402
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar,
                      ochocientos, vox, tape_stop, cinta, vinilo)

BPM = 130
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.12 * S16
rng = np.random.default_rng(1009)
NOMBRES = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
           'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOMBRES[nombre[:-1]]


# ── Armonía (re menor natural) ──────────────────────────────────────────────
# Voicings abiertas, pianísticas
ACORDES = {
    'Dm9':    ['D3', 'A3', 'C4', 'E4', 'F4'],
    'Bbmaj7': ['Bb2', 'F3', 'A3', 'D4'],
    'Gm7':    ['G2', 'D3', 'F3', 'Bb3'],
    'A7sus4': ['A2', 'E3', 'G3', 'D4'],
}
RAIZ808 = {'Dm9': 'D1', 'Bbmaj7': 'Bb1', 'Gm7': 'G1', 'A7sus4': 'A1'}
PROG = ['Dm9', 'Bbmaj7', 'Gm7', 'A7sus4']

# Motivo de piano (4 compases, uno por acorde): (semicorchea, nota, duración en s16)
PIANO_MOTIF = [
    [(0, 'D5', 3), (6, 'F5', 2), (10, 'A4', 3)],
    [(0, 'Bb4', 2), (4, 'C5', 2), (8, 'D5', 4)],
    [(0, 'F5', 2), (3, 'E5', 1), (4, 'D5', 3), (10, 'C5', 2)],
    [(2, 'A4', 3), (8, 'Bb4', 2), (12, 'A4', 4)],
]
# Contramelodía del gancho B (lead cálido, armoniza por encima)
CONTRA = [
    [(2, 'F5', 2), (6, 'A5', 3)],
    [(2, 'D5', 3), (8, 'F5', 2)],
    [(0, 'Bb5', 3), (4, 'A5', 2), (8, 'G5', 4)],
    [(0, 'E5', 2), (4, 'C#5', 4)],
]
# Melodía nueva del gancho C (resolución, más alta, más expansiva)
LEAD_C = [
    [(0, 'A5', 2), (2, 'G5', 1), (4, 'F5', 3), (10, 'D5', 2)],
    [(0, 'F5', 3), (4, 'D5', 2), (8, 'Bb4', 4)],
    [(0, 'G5', 2), (3, 'A5', 1), (4, 'Bb5', 4), (10, 'A5', 2)],
    [(0, 'E5', 3), (4, 'D5', 2), (8, 'C#5', 4)],
]
SECCIONES = [('intro', 4), ('ganchoA', 8), ('verso', 8), ('build', 4),
             ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 4)]


# ── Instrumentos propios del tema ──────────────────────────────────────────
def piano_noche(m, dur, vel=1.0):
    """Piano nocturno: armónicos con decaimiento natural, ataque suave."""
    t = t_arr(dur + 2.0)
    f = hz(m)
    x = sum(
        np.sin(2 * np.pi * f * h * t * (1 + 0.0003 * h * h))
        * np.exp(-t * (0.8 + h * 0.6)) * (1.0 / h ** 0.7)
        for h in range(1, 8)
    )
    x = (x + rng.standard_normal(len(t)) * np.exp(-t * 120) * 0.08) * vel
    return lp(x, 4500) * env_adsr(len(t), 0.005, 0.8, 0.4, 1.5, dur) * 0.28


def lead_calido(m, dur, desde=None):
    """Lead cálido: sierra + seno con ataque lento y vibrato tardío."""
    t = t_arr(dur + 0.5)
    f = np.full(len(t), hz(m))
    if desde is not None:
        g = min(len(t), int(0.06 * SR))
        f[:g] *= (hz(desde) / hz(m)) ** (1 - np.arange(g) / g)
    f *= 1 + 0.005 * np.sin(2 * np.pi * 5.0 * t) * np.clip((t - 0.3) * 2, 0, 1)
    ph = np.cumsum(f) / SR
    ph_det = np.cumsum(f * 1.004) / SR
    x = (2 * (ph_det - np.floor(ph_det + 0.5))) * 0.6 + np.sin(2 * np.pi * ph) * 0.4
    return lp(x, 2800) * env_adsr(len(t), 0.08, 0.3, 0.6, 0.3, dur) * 0.18


def bombo_noche():
    """Kick suave con sub largo: la patada a las 2 AM."""
    t = t_arr(0.55)
    sub = np.sin(2 * np.pi * np.cumsum(42 + 8 * np.exp(-t * 15)) / SR) * np.exp(-t * 5)
    punch = np.sin(2 * np.pi * np.cumsum(55 + 100 * np.exp(-t * 50)) / SR) * np.exp(-t * 25) * 0.6
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 350) * 0.3
    return np.tanh((sub * 0.9 + punch * 0.6 + click) * 1.3)


def caja_noche():
    """Caja seca y apretada: menos ruido, más cuerpo."""
    t = t_arr(0.3)
    cuerpo = (np.sin(2 * np.pi * 200 * t) + 0.4 * np.sin(2 * np.pi * 350 * t)) * np.exp(-t * 25)
    ruido = bp(rng.standard_normal(len(t)), 2000, 7000) * np.exp(-t * 18)
    return np.tanh((cuerpo * 0.8 + ruido * 0.5) * 1.2)


def hat_suave(abierto=False):
    """Hi-hat suave, entre metálico y escobillas."""
    t = t_arr(0.35 if abierto else 0.06)
    metal = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (307, 415, 528, 673, 812)) * 0.4
    ruido = hp(rng.standard_normal(len(t)), 8000) * 0.6
    return hp(metal + ruido, 6000) * np.exp(-t * (7 if abierto else 65)) * 0.15


def cuerda(notas_midi, dur):
    """Pad de cuerdas: sierras con detuning, filtrado cálido."""
    t = t_arr(dur + 1.5)
    out = np.zeros((2, len(t)))
    for m in notas_midi:
        for v in range(4):
            det = (v - 1.5) * 0.006
            out += paneo(saw(hz(m), t, det) / 4, (v - 1.5) / 3)
    return lp(out, 1600) * env_adsr(len(t), 0.6, 0.5, 0.7, 1.2, dur) * 0.1


def rim_noche():
    t = t_arr(0.04)
    return (bp(rng.standard_normal(len(t)), 1200, 3000) * 0.5
            + np.sin(2 * np.pi * 900 * t)) * np.exp(-t * 130) * 0.25


def paso(c, s, swing=True):
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


# ── Composición ─────────────────────────────────────────────────────────────
def render():
    total = sum(c for _, c in SECCIONES)
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'piano', 'lead', 'voz', 'cuerdas', 'fx']}
    sc = np.zeros(N)
    K, SN, H, HO, RI = bombo_noche(), caja_noche(), hat_suave(), hat_suave(True), rim_noche()
    ir_far = reverb_ir(dur=3.5, decay=2.0, brillo=3500, seed=109)
    ir_near = reverb_ir(dur=0.8, decay=6, brillo=8000, seed=110)
    ir_drums = reverb_ir(dur=0.5, decay=9, brillo=7000, seed=111)
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

            # ── Piano: motif melódico ──
            if nombre != 'build':
                vp = 0.7 if nombre in ('intro', 'final', 'puente') else 1.0
                for (s, nota, l) in PIANO_MOTIF[frase]:
                    x = piano_noche(n(nota), l * S16 * 1.1, vp * (1 - rng.uniform(0, 0.1)))
                    poner(bus['piano'], paneo(x, rng.uniform(-0.15, 0.15)), paso(cg, s) + hum(0.002))

            # ── Piano: acordes (golpe en el 1, como un pianista a las 2 AM) ──
            if nombre != 'build':
                cv = 0.4 if nombre in ('intro', 'final', 'puente') else 0.55
                for k, m in enumerate(ac):
                    poner(bus['piano'], paneo(piano_noche(m, COMPAS * 0.8, cv * (1 - rng.uniform(0, 0.1))),
                          -0.3 + 0.15 * k), paso(cg, 0, False) + k * 0.008 + hum(0.001))

            # ── Lead: entra sutil en gancho A (segunda mitad), contramelodía en B, línea nueva en C ──
            if nombre == 'ganchoA' and c >= 4:
                for (s, nota, l) in PIANO_MOTIF[frase]:
                    if l >= 3:
                        poner(bus['lead'], paneo(lead_calido(n(nota), l * S16 * 0.8), 0.2) * 0.5,
                              paso(cg, s) + hum(0.003))
            elif nombre == 'ganchoB':
                previa = None
                for (s, nota, l) in CONTRA[frase]:
                    m = n(nota)
                    poner(bus['lead'], paneo(lead_calido(m, l * S16 * 0.95,
                          previa if previa and abs(previa - m) <= 5 else None), 0.15),
                          paso(cg, s) + hum(0.003))
                    previa = m
            elif nombre == 'ganchoC':
                previa = None
                for (s, nota, l) in LEAD_C[frase]:
                    m = n(nota)
                    poner(bus['lead'], paneo(lead_calido(m, l * S16 * 0.95,
                          previa if previa and abs(previa - m) <= 5 else None), -0.1),
                          paso(cg, s) + hum(0.003))
                    previa = m

            # ── Cuerdas: solo en ganchos B y C (cada 4 compases, para dar cuerpo) ──
            if nombre in ('ganchoB', 'ganchoC') and frase == 0:
                poner(bus['cuerdas'], cuerda([m + 12 for m in ac[:3]], COMPAS * 4), paso(cg, 0, False))

            # ── Vocal chops (3 momentos en todo el tema, cada uno distinto) ──
            if nombre == 'intro' and ultimo:
                poner(bus['voz'], paneo(vox(n('A4'), BEAT * 2, 'a', rng), 0.2) * 0.4, paso(cg, 8))
            if nombre == 'verso' and frase == 3 and c >= 4:
                poner(bus['voz'], paneo(vox(n('D5'), S16 * 3, 'e', rng), -0.25) * 0.6, paso(cg, 10))
            if nombre == 'puente' and c == 1:
                poner(bus['voz'], paneo(vox(n('F5'), BEAT * 3, 'o', rng), 0) * 0.7, paso(cg, 0))

            # ── Batería ──
            if nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC'):
                # Kicks: más sparse en el verso
                kicks = [0, 10] if nombre == 'verso' else ([0, 6, 10] if frase != 3 else [0, 6, 10, 14])
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.9, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.22) * 14)[None], paso(cg, s, False))
                # Caja en el tercer tiempo (medio tiempo)
                poner(bus['drums'], paneo(SN, 0.02) * 0.7, paso(cg, 8, False) + hum(0.002))
                # Hats: corcheas en el verso, semicorcheas con swing en los ganchos
                if nombre == 'verso':
                    for s in range(0, 16, 4):
                        poner(bus['drums'], paneo(H * (0.9 if s == 0 else 0.5) * (1 - rng.uniform(0, 0.15)), 0.25),
                              paso(cg, s) + hum(0.002))
                else:
                    redoble = frase == 3
                    for s in range(0, 12 if redoble else 16, 2):
                        acento = [1.0, 0.4, 0.65, 0.4][s % 4]
                        poner(bus['drums'], paneo(H * acento * (1 - rng.uniform(0, 0.2)), 0.25),
                              paso(cg, s) + hum(0.002))
                    # Hat abierto a contratiempo (frase 1 y 3)
                    if frase in (1, 3):
                        ho = HO[:int(2 * S16 * SR)].copy()
                        ho[-200:] *= np.linspace(1, 0, 200)
                        poner(bus['drums'], paneo(ho, -0.3) * 0.7, paso(cg, 6))
                    # Redoble al final de la frase 3
                    if redoble:
                        for j in range(6):
                            poner(bus['drums'], paneo(repitch(H, 1 + j * 0.04) * (0.4 + 0.5 * j / 6), 0.25),
                                  paso(cg, 12) + j * S16 * 0.67)
                # Rim en el verso (sutil, cada 2 compases)
                if nombre == 'verso' and c % 2 == 0:
                    poner(bus['drums'], paneo(RI, 0.4) * 0.5, paso(cg, 4))

            # ── Build: redoble de caja que acelera (corcheas → semicorcheas → fusas) ──
            if nombre == 'build':
                if c < 2:
                    for s in range(0, 16, 2):
                        poner(bus['drums'], paneo(SN * (0.2 + 0.1 * (c * 8 + s / 2) / 16), 0),
                              paso(cg, s, False))
                elif c == 2:
                    for s in range(16):
                        poner(bus['drums'], paneo(SN * (0.3 + 0.4 * s / 16), 0), paso(cg, s, False))
                else:
                    for j in range(20):
                        poner(bus['drums'], paneo(repitch(SN, 1 + j * 0.015) * (0.35 + 0.5 * j / 20), 0),
                              cg * COMPAS + j * S16 / 1.5)

            # ── 808 ──
            if nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC'):
                r = n(RAIZ808[ac_nombre])
                if nombre == 'verso':
                    pat = [(0, 0, 8)] if frase != 3 else [(0, 0, 6), (10, 12, 4)]
                else:
                    pat = ([(0, 0, 3), (6, 12, 3), (10, 0, 3), (14, 5, 2)] if frase == 3
                           else [(0, 0, 4), (6, 12, 2), (10, 0, 4)])
                for s, iv, l in pat:
                    glide = 0.1 if s == 0 and frase == 0 and c > 0 else 0
                    notas808.append((paso(cg, s, False), r + iv, l * S16, glide))
            elif nombre == 'puente':
                notas808.append((paso(cg, 0, False), n(RAIZ808[PROG[frase]]), COMPAS, 0))

        c0 += largo

    T = lambda comp: comp * COMPAS

    # ── Momentos únicos ──
    # Pad en el build (sube durante 4 compases)
    poner(bus['cuerdas'], cuerda([n('D4'), n('F4'), n('A4')], 4 * COMPAS) * 1.5, T(ini['build']))
    # Swell invertido antes del gancho B
    sw = con_reverb(cuerda([n('D4'), n('A4'), n('F4')], BEAT * 1.5), ir_far, 0.9)
    sw = sw[:, :int(BEAT * 3 * SR)][:, ::-1]
    poner(bus['fx'], sw * 0.6, T(ini['ganchoB']) - sw.shape[1] / SR)

    # 808
    if notas808:
        poner(bus['bajo'], paneo(lp(ochocientos(notas808, N / SR, 2.0), 3000), 0), 0)

    # ── Mezcla ──────────────────────────────────────────────────────────────
    # Cinta sutil en el piano (calidez analógica)
    bus['piano'] = cinta(bus['piano'], 0.25, rng)

    # Piano lejano (intro/verso/puente/final) vs cercano (ganchos): LA FIRMA
    piano_far = con_reverb(lp(bus['piano'], 1500, 2), ir_far, 0.65)
    piano_near = con_reverb(bus['piano'], ir_near, 0.15)
    dist = np.zeros(N)
    for nombre, largo in SECCIONES:
        if 'gancho' in nombre:
            a, b = int(T(ini[nombre]) * SR), min(N, int(T(ini[nombre] + largo) * SR))
            dist[a:b] = 1.0
    dist = lp(dist, 2)
    piano = piano_far * (1 - dist) * 1.3 + piano_near * dist
    piano *= 1 - 0.3 * np.clip(sc, 0, 1)

    lead = con_reverb(delay_pingpong(saturar(hp(bus['lead'], 250), 0.2),
                      BEAT * 0.75, 0.35, 0.2), ir_near, 0.25)
    voz_mix = con_reverb(delay_pingpong(hp(bus['voz'], 300), BEAT / 2, 0.35, 0.2), ir_far, 0.5)
    cuerdas = con_reverb(bus['cuerdas'] * (1 - 0.4 * np.clip(sc, 0, 1)), ir_far, 0.4)
    drums = con_reverb(saturar(bus['drums'], 0.1), ir_drums, 0.06)
    bajo = bus['bajo'] * (1 - 0.25 * np.clip(sc, 0, 1))

    # Vinilo sutil solo en la intro y el final (2 AM)
    v_mask = np.zeros(N)
    for nombre, largo in SECCIONES:
        if nombre in ('intro', 'final'):
            a, b = int(T(ini[nombre]) * SR), min(N, int(T(ini[nombre] + largo) * SR))
            v_mask[a:b] = 1.0
    v_mask = lp(v_mask, 3)
    v_noise = vinilo(N, 0.6, rng) * v_mask

    mix = drums + bajo * 0.8 + piano + lead * 0.9 + voz_mix * 0.85 + cuerdas * 0.7 + bus['fx'] + v_noise

    # Tape stop al final del build (la cinta frena, queda el silencio antes del drop)
    mix = tape_stop(mix, T(ini['build'] + 4) - BEAT * 1.5, BEAT * 1.2)
    s0 = int((T(ini['build'] + 4) - BEAT * 0.3) * SR)
    s1 = min(mix.shape[1], int(T(ini['build'] + 4) * SR))
    mix[:, s0:s1] *= 0.03

    # Ganancia por sección: intro/final suben para compensar lo sparse, verso baja
    g = np.ones(mix.shape[1])
    for nombre, valor in [('intro', 1.8), ('final', 1.8), ('build', 0.8), ('puente', 0.7), ('verso', 0.85)]:
        largo = dict(SECCIONES)[nombre]
        a, b = int(T(ini[nombre]) * SR), min(mix.shape[1], int(T(ini[nombre] + largo) * SR))
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
    f = os.path.join(out, '2026-10-09.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.0f} s')
