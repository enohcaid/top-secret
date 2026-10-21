"""PALO — beat de trap del club, compuesto a mano.

Concepto: Errar el gol decisivo — el palo, la repetición en la cabeza,
los "no pasa nada" que no alcanzan; cada noche repetís ese tiro hasta
que vuelve la misma jugada y esta vez entra, pero el eco del palo nunca
se va del todo.

Emoción por sección:
  intro (4c):    el estadio en silencio, un golpe metálico que resuena solo
  gancho A (8c): la jugada se arma, avanzás con todo, y el tiro pega en el palo
  verso (8c):    la repetición mental: fragmentos sueltos que vuelven incompletos
  build (4c):    cada noche repetís ese tiro, la obsesión crece, los ecos se acercan
  gancho B (8c): volvés a intentarlo con más hambre, el palo todavía presente
  gancho C (8c): la misma jugada, esta vez entra; el palo suena lejano
  final (4c):    el eco se apaga pero nunca del todo

Rasgo distintivo: "palo que resuena" — golpe metálico con armónicos inarmónicos
de barra percutida (ratios 1:2.76:5.40:8.93) y cola larga; cortante en las
primeras secciones, se ahoga y filtra sección a sección, lejano en el gancho C.

Estructura: intro 4 · gancho A 8 · verso 8 · build 4 · gancho B 8 · gancho C 8 · final 4
  = 44 compases, 122 BPM, do menor → ~87 s

Recursos: palo que resuena con armónicos inarmónicos (firma del tema), lead con
arrastre (pitch drop sutil en la cola), pad de sines con segundo armónico (oscuro,
denso), 808 melódico con saltos de octava y glide, palo invertido en las transiciones

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_21_1.py
Salida: fuentes/beats/salida/diario/2026-10-21-1.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch,  # noqa: E402
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar, ochocientos)

BPM = 122
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.14 * S16
rng = np.random.default_rng(20261021)
NOM = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
       'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n(nombre):
    """'Eb4' -> MIDI 63."""
    return 12 * (int(nombre[-1]) + 1) + NOM[nombre[:-1]]


def paso(c, s, swing=True):
    """Tiempo (seg) del paso s (semicorchea 0-15) del compás c."""
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


# -- Armonía: Cm → Ab → Fm → G7 (i → VI → iv → V, do menor armónica) ----------
ACORDES = {
    'Cm':  ['Eb3', 'G3', 'Bb3', 'C4'],
    'Ab':  ['Eb3', 'Ab3', 'C4'],
    'Fm':  ['F3', 'Ab3', 'C4'],
    'G7':  ['D3', 'F3', 'G3', 'B3'],
}
RAIZ_808 = {'Cm': 'C1', 'Ab': 'Ab1', 'Fm': 'F1', 'G7': 'G1'}
PROG = ['Cm', 'Ab', 'Fm', 'G7']

SECCIONES = [
    ('intro', 4), ('ganchoA', 8), ('verso', 8), ('build', 4),
    ('ganchoB', 8), ('ganchoC', 8), ('final', 4),
]

# -- Melodías escritas a mano: (paso 16avos, nota, duración 16avos) -------------
# Gancho: "la jugada" se arma compás a compás, asciende y se corta en el palo
LEAD_HOOK = [
    # Compás 0 (Cm): arranque
    [(0, 'G4', 2), (3, 'Bb4', 1), (4, 'C5', 3), (8, 'Eb5', 2), (12, 'C5', 4)],
    # Compás 1 (Ab): avance
    [(0, 'Ab4', 2), (3, 'Bb4', 1), (4, 'C5', 3), (8, 'D5', 2), (10, 'Eb5', 2), (12, 'D5', 4)],
    # Compás 2 (Fm): se acerca al arco
    [(0, 'F5', 2), (3, 'Eb5', 1), (4, 'D5', 2), (8, 'F5', 3), (12, 'G5', 2), (14, 'Ab5', 2)],
    # Compás 3 (G7): ¡el tiro! — se corta en step 8, ahí suena el palo
    [(0, 'G5', 3), (4, 'F5', 3)],
]
# Segunda mitad del gancho (compases 4-7): variaciones
LEAD_HOOK_V = [
    [(0, 'G4', 2), (3, 'Bb4', 1), (4, 'C5', 3), (8, 'D5', 2), (10, 'Eb5', 2), (12, 'D5', 2), (14, 'C5', 2)],
    [(0, 'Ab4', 3), (4, 'Bb4', 2), (8, 'C5', 2), (10, 'D5', 2), (12, 'Eb5', 4)],
    [(0, 'F5', 2), (3, 'G5', 1), (4, 'Ab5', 3), (8, 'G5', 2), (10, 'F5', 2), (12, 'Ab5', 4)],
    [(0, 'Ab5', 3), (4, 'G5', 2), (7, 'F5', 1)],  # más alto, más desesperado
]
# Gancho C: la jugada donde el gol entra — la melodía pasa del punto de corte
LEAD_C = [
    LEAD_HOOK[0],
    LEAD_HOOK[1],
    [(0, 'F5', 2), (3, 'G5', 1), (4, 'Ab5', 3), (8, 'Bb5', 2), (10, 'Ab5', 2), (12, 'Bb5', 4)],
    [(0, 'G5', 3), (4, 'Ab5', 2), (7, 'G5', 1), (8, 'C6', 6)],  # ¡GOL! C6 se sostiene
]
LEAD_C_V = [
    LEAD_HOOK_V[0],
    LEAD_HOOK_V[1],
    [(0, 'F5', 2), (3, 'G5', 1), (4, 'Ab5', 3), (8, 'G5', 2), (10, 'Ab5', 2), (12, 'Bb5', 4)],
    [(0, 'Ab5', 3), (4, 'G5', 2), (8, 'C6', 6)],
]
# Verso: fragmentos de la jugada sueltos, como el replay en la cabeza
LEAD_VERSO = [
    [(0, 'G4', 4), (10, 'C5', 2)],
    [(4, 'Eb5', 3), (12, 'D5', 2)],
    [(0, 'F5', 3), (10, 'G5', 2)],
    [(0, 'G5', 2)],  # toca la nota alta y se corta (el recuerdo del palo)
]


# -- Instrumentos del tema -------------------------------------------------------

def palo_resonante(dur=2.5, brillo=1.0):
    """Golpe de travesaño: transiente de impacto + resonancia de barra metálica."""
    t = t_arr(dur)
    impacto = bp(rng.standard_normal(len(t)), 900, 11000) * np.exp(-t * 280) * 0.5
    # Frecuencias de una barra libre: f₀, 2.76f₀, 5.40f₀, 8.93f₀, 13.34f₀
    f0 = 310
    ratios = [1.0, 2.76, 5.40, 8.93, 13.34]
    res = np.zeros(len(t))
    for i, r in enumerate(ratios):
        f = f0 * r
        if f > 16000:
            break
        res += np.sin(2 * np.pi * f * t) * np.exp(-t * (1.2 + i * 0.7)) * brillo / (1 + i * 0.4)
    x = impacto + res * 0.3
    x *= (1 - np.exp(-t * 600))  # anti-click
    return x


def palo_lejano(dur=3.0):
    """Palo ahogado: filtrado y oscuro, como un recuerdo que se aleja."""
    return lp(palo_resonante(dur, brillo=0.35), 1200)


def lead_jugada(midi, dur, desde=None):
    """Lead con arrastre: saw con grit de ataque, pitch drop sutil en la cola."""
    t = t_arr(dur + 0.4)
    f = np.full(len(t), float(hz(midi)))
    vib = 1 + 0.005 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.15) * 4, 0, 1)
    # Arrastre: el pitch cae sutilmente en la cola
    drag = np.ones(len(t))
    rel = int(dur * 0.75 * SR)
    if rel < len(t):
        drag[rel:] = 1 - 0.012 * np.clip((t[rel:] - t[rel]) * 4, 0, 1)
    f *= vib * drag
    if desde is not None:
        g = min(len(t), int(0.06 * SR))
        f[:g] *= (hz(desde) / hz(midi)) ** (1 - np.arange(g) / g)
    ph = np.cumsum(f) / SR
    x = 2 * (ph - np.floor(ph + 0.5)) * 0.65 + saw(hz(midi), t, 0.007) * 0.35
    x = lp(x + rng.standard_normal(len(t)) * np.exp(-t * 50) * 0.12, 3200)
    return x * env_adsr(len(t), 0.006, 0.12, 0.6, 0.2, dur) * 0.22


def pad_oscuro(notas_midi, dur, filtro=900):
    """Pad de sines detuneadas con segundo armónico: oscuro, denso, resonante."""
    t = t_arr(dur + 1.5)
    out = np.zeros((2, len(t)))
    for m in notas_midi:
        f = hz(m)
        for v in range(4):
            det = (v - 1.5) * 0.003
            fase = rng.uniform(0, 2 * np.pi)
            x = np.sin(2 * np.pi * f * (1 + det) * t + fase)
            x += 0.25 * np.sin(2 * np.pi * f * 2 * (1 + det * 0.7) * t + fase * 1.5)
            out += paneo(x / 4, (v - 1.5) / 2.5)
    return lp(out, filtro, 3) * env_adsr(len(t), 0.6, 0.3, 0.85, 1.2, dur) * 0.1


def bombo_pesado():
    """Kick profundo con sub largo (el peso del error)."""
    t = t_arr(0.55)
    sub = np.sin(2 * np.pi * np.cumsum(42 + 16 * np.exp(-t * 18)) / SR) * np.exp(-t * 4.5)
    punch = np.sin(2 * np.pi * np.cumsum(58 + 150 * np.exp(-t * 65)) / SR) * np.exp(-t * 28)
    click = hp(rng.standard_normal(len(t)), 2800) * np.exp(-t * 350) * 0.5
    return np.tanh((sub * 0.8 + punch * 0.85 + click) * 1.6)


def caja_seca():
    """Redoblante seco, cortante."""
    t = t_arr(0.3)
    cuerpo = np.sin(2 * np.pi * 195 * t) * np.exp(-t * 24)
    arm = np.sin(2 * np.pi * 370 * t) * np.exp(-t * 35) * 0.35
    ruido = bp(rng.standard_normal(len(t)), 1800, 9500) * np.exp(-t * 16)
    return np.tanh((cuerpo + arm + ruido * 0.85) * 1.5)


def hat_cerrado():
    """Hi-hat metálico tipo 808."""
    t = t_arr(0.07)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (209, 312, 371, 527, 545, 808))
    return hp(bp(x, 6500, 14500), 7200) * np.exp(-t * 58) * 0.2


def hat_abierto():
    """Hi-hat abierto con pitch drop sutil (decepción)."""
    t = t_arr(0.35)
    drop = np.linspace(1.0, 0.97, len(t))
    x = np.zeros(len(t))
    for f in (209, 312, 371, 527, 545, 808):
        x += np.sign(np.sin(2 * np.pi * np.cumsum(f * drop) / SR))
    return hp(bp(x, 6500, 14500), 7200) * np.exp(-t * 8) * 0.2


def rim_shot():
    t = t_arr(0.04)
    return (bp(rng.standard_normal(len(t)), 1500, 2700) * 0.5
            + np.sin(2 * np.pi * 880 * t)) * np.exp(-t * 115) * 0.3


# -- Composición ------------------------------------------------------------------
def render():
    total = sum(c for _, c in SECCIONES)
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'pad', 'lead', 'palo', 'fx']}
    sc = np.zeros(N)
    K, SN, HC, HO, RI = bombo_pesado(), caja_seca(), hat_cerrado(), hat_abierto(), rim_shot()
    ir = reverb_ir(dur=2.8, brillo=5500, seed=42)
    ir_corta = reverb_ir(dur=0.6, decay=8, brillo=7000, seed=43)
    notas808 = []
    hum = lambda s=0.004: rng.normal(0, s)
    vel = lambda: 1 - rng.uniform(0, 0.25)

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

            # -- Pad: todas las secciones salvo build --
            if nombre != 'build':
                notas = [n(x) for x in ACORDES[ac]]
                if nombre in ('intro', 'final'):
                    vp, filt = 0.85, 800
                elif nombre == 'verso':
                    vp, filt = 0.6, 950
                else:
                    vp, filt = 0.4, 1100
                poner(bus['pad'], pad_oscuro(notas, COMPAS, filt) * vp, t_c)

            # -- Lead --
            if nombre in ('ganchoA', 'ganchoB'):
                fr = LEAD_HOOK_V[frase] if mitad2 else LEAD_HOOK[frase]
                previa = None
                for (s, nta, l) in fr:
                    m = n(nta)
                    x = lead_jugada(m, l * S16 * 0.9, previa if previa and abs(previa - m) <= 5 else None)
                    poner(bus['lead'], paneo(x, -0.15 if s < 8 else 0.15), paso(cg, s) + hum(0.003))
                    previa = m
                # Gancho B: duplicado octava baja en compases fuertes (contrapeso)
                if nombre == 'ganchoB' and frase in (0, 2):
                    for (s, nta, l) in fr[:2]:
                        m = n(nta) - 12
                        x = lead_jugada(m, l * S16 * 0.8) * 0.35
                        poner(bus['lead'], paneo(x, 0.3), paso(cg, s) + hum(0.003))

            elif nombre == 'ganchoC':
                fr = LEAD_C_V[frase] if mitad2 else LEAD_C[frase]
                previa = None
                for (s, nta, l) in fr:
                    m = n(nta)
                    x = lead_jugada(m, l * S16 * 0.9, previa if previa and abs(previa - m) <= 5 else None)
                    poner(bus['lead'], paneo(x, -0.1), paso(cg, s) + hum(0.003))
                    previa = m

            elif nombre == 'verso':
                for (s, nta, l) in LEAD_VERSO[frase]:
                    m = n(nta)
                    x = lead_jugada(m, l * S16 * 0.9) * 0.65
                    poner(bus['lead'], paneo(x, 0), paso(cg, s) + hum(0.003))

            elif nombre == 'intro' and c >= 2:
                # Anticipación filtrada: primeras notas de la melodía
                hints = LEAD_HOOK[c - 2][:2]
                for (s, nta, l) in hints:
                    x = lp(lead_jugada(n(nta), l * S16 * 0.9), 1500) * 0.2
                    poner(bus['lead'], paneo(x, 0), paso(cg, s))

            elif nombre == 'final' and c == 0:
                for (s, nta, l) in LEAD_HOOK[0][:3]:
                    x = lp(lead_jugada(n(nta), l * S16 * 0.9), 1200) * 0.15
                    poner(bus['lead'], paneo(x, 0), paso(cg, s))

            # -- Palo: el rasgo que define el tema --
            if nombre == 'intro' and c in (0, 2):
                p = palo_resonante(3.0)
                poner(bus['palo'], paneo(p, 0) * (0.9 if c == 0 else 0.55), t_c)

            if nombre in ('ganchoA', 'ganchoB') and frase == 3:
                brl = 1.0 if nombre == 'ganchoA' else 1.15
                poner(bus['palo'], paneo(palo_resonante(2.5, brl), 0) * 0.75, paso(cg, 8))

            if nombre == 'verso' and frase == 3:
                poner(bus['palo'], paneo(palo_resonante(2.0, 0.55), 0) * 0.3, paso(cg, 4))

            if nombre == 'ganchoC' and frase == 3:
                poner(bus['palo'], paneo(palo_lejano(3.0), 0) * 0.35, paso(cg, 8))

            if nombre == 'final' and c == 2:
                poner(bus['palo'], paneo(palo_lejano(4.0), 0) * 0.2, t_c)

            # -- Batería --
            con_bat = nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC')
            if con_bat:
                kicks = [0, 10] if nombre == 'verso' else ([0, 6, 10, 14] if frase == 3 else [0, 6, 10])
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.95, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.22) * 15)[None], paso(cg, s, False))
                # Redoblante en beat 3 (medio tiempo)
                poner(bus['drums'], paneo(SN, 0.04) * 0.72, paso(cg, 8, False) + hum(0.002))
                # Hats
                if nombre == 'verso':
                    for s in range(0, 16, 2):
                        poner(bus['drums'], paneo(HC * (0.85 if s % 4 == 0 else 0.5) * vel(), 0.3),
                              paso(cg, s) + hum(0.002))
                else:
                    redo = frase == 3
                    for s in range(16):
                        if redo and s >= 12:
                            break
                        poner(bus['drums'], paneo(HC * [1.0, 0.4, 0.7, 0.4][s % 4] * vel(), 0.3),
                              paso(cg, s) + hum(0.002))
                    if redo:
                        sub = 6 if (c // 4) % 2 == 0 else 8
                        for j in range(sub):
                            poner(bus['drums'], paneo(repitch(HC, 1 + j * 0.05) * (0.4 + 0.5 * j / sub), 0.3),
                                  cg * COMPAS + 12 * S16 + j * BEAT / sub)
                    # Hat abierto a contratiempo en frases 1 y 3
                    if frase in (1, 3):
                        ho = HO[:min(len(HO), int(2 * S16 * SR))].copy()
                        if len(ho) > 200:
                            ho[-200:] *= np.linspace(1, 0, 200)
                        poner(bus['drums'], paneo(ho, -0.25) * 0.65, paso(cg, 6))
                # Rim en el verso
                if nombre == 'verso' and frase in (1, 3):
                    poner(bus['drums'], paneo(RI, 0.4) * 0.5, paso(cg, 12))

            # -- 808 --
            if nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC'):
                r808 = n(RAIZ_808[ac])
                if nombre == 'verso':
                    bp808 = [(0, 0, 8), (10, 0, 4)]
                elif frase == 3:
                    bp808 = [(0, 0, 5), (6, 12, 3), (10, 0, 3), (14, 7, 2)]
                else:
                    bp808 = [(0, 0, 5), (6, 12, 3), (10, 0, 5)]
                for s, iv, l in bp808:
                    gl = 0.1 if s == 0 and frase == 0 and c > 0 else 0
                    notas808.append((paso(cg, s, False), r808 + iv, l * S16, gl))
        c0 += largo

    # -- Palo invertido antes de cada gancho (transición tímbrica) --
    for sec in ('ganchoA', 'ganchoB', 'ganchoC'):
        t_sec = ini[sec] * COMPAS
        dur_pi = BEAT * 3
        if t_sec - dur_pi >= 0:
            p = palo_resonante(dur_pi, brillo=0.5)[::-1]
            poner(bus['fx'], paneo(p, 0) * 0.3, t_sec - dur_pi)

    # -- Build: kicks filtrados acelerando, redoble, ecos del palo que se acercan --
    b0 = ini['build']
    for c in range(4):
        cg = b0 + c
        t_c = cg * COMPAS
        notas_ac = [n(x) for x in ACORDES[PROG[c % 4]]]
        poner(bus['pad'], pad_oscuro(notas_ac, COMPAS, 600 + c * 200) * (0.4 + c * 0.1), t_c)
        step = max(1, 4 - c)
        for s in range(0, 16, step):
            vol = 0.2 + 0.55 * ((c * 16 + s) / 64)
            poner(bus['drums'], paneo(lp(K, 800 + c * 1200), 0) * vol, t_c + s * S16)
    # Redoble de caja en los últimos 2 compases
    for j in range(20):
        t_s = (b0 + 2) * COMPAS + j * S16 * 0.65
        if t_s < (b0 + 4) * COMPAS - BEAT * 0.5:
            poner(bus['drums'], paneo(repitch(SN, 1 + j * 0.01), 0) * (0.2 + 0.5 * j / 20), t_s)
    # Ecos del palo cada vez más juntos (la obsesión crece)
    for j, off in enumerate([0.0, 1.0, 1.7, 2.2, 2.6, 2.85, 3.05, 3.15]):
        t_p = (b0 + off) * COMPAS
        if t_p < (b0 + 4) * COMPAS:
            poner(bus['palo'], paneo(palo_resonante(1.2, 0.3 + j * 0.08), (j % 2) * 0.4 - 0.2)
                  * (0.15 + j * 0.04), t_p)
    # Silencio antes del gancho B (impacto)
    sil_a = int(((b0 + 4) * COMPAS - BEAT * 0.4) * SR)
    sil_b = min(int((b0 + 4) * COMPAS * SR), N)
    for k in bus:
        bus[k][:, sil_a:sil_b] *= 0.05

    # -- Render 808 --
    if notas808:
        bus['bajo'] += paneo(lp(ochocientos(notas808, N / SR, 2.0), 3500), 0) * 0.85

    # -- Mezcla --
    pd = con_reverb(lp(hp(bus['pad'], 80), 2800), ir, 0.35)
    ld = con_reverb(delay_pingpong(saturar(hp(bus['lead'], 200), 0.2), BEAT * 0.75, 0.3, 0.18), ir, 0.22)
    pl = con_reverb(bus['palo'], ir, 0.55)
    dr = con_reverb(saturar(bus['drums'], 0.18), ir_corta, 0.07)
    bj = bus['bajo'] * (1 - np.clip(sc, 0, 1) * 0.2)
    duck = 1 - np.clip(sc, 0, 1) * 0.5
    mix = dr * 1.0 + bj * 0.9 + (pd + ld + pl) * duck + bus['fx'] * 0.65

    # -- Ganancia por sección --
    g = np.ones(mix.shape[1])
    for ns, val in [('intro', 4.0), ('final', 5.5), ('build', 0.7), ('verso', 0.85)]:
        ls = dict(SECCIONES)[ns]
        a, b = int(ini[ns] * COMPAS * SR), min(mix.shape[1], int((ini[ns] + ls) * COMPAS * SR))
        g[a:b] = val
    g = lp(g, 3)
    mix *= g

    # -- Master --
    mix = hp(mix, 28)
    mix = mix / (np.percentile(np.abs(mix), 99.95) + 1e-9) * 0.85
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    mix /= np.abs(mix).max() + 1e-9
    fin = int((total * COMPAS + 2.5) * SR)
    mix = mix[:, :fin]
    mix[:, -int(2.0 * SR):] *= np.linspace(1, 0, int(2.0 * SR))
    return (mix * 0.95).T


if __name__ == '__main__':
    out = os.path.join(RAIZ, 'fuentes', 'beats', 'salida', 'diario')
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, '2026-10-21-1.wav')
    audio = render()
    sf.write(path, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(path, RAIZ)}  {audio.shape[0] / SR:.1f} s')
