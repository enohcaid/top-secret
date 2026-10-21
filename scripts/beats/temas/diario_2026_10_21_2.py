"""LLUVIA — beat de trap del club, compuesto a mano.

Concepto: Jugar bajo la lluvia — la cancha inundada, las camisetas pesadas,
la pelota que no pica; pero cuando hacés el gol y te tirás de rodillas
sobre el pasto mojado, todo ese sufrimiento se convierte en la celebración
más pura que existe.

Emoción por sección:
  intro (4c):    las primeras gotas, el cielo se cierra, la cancha brilla
  gancho A (8c): el partido arranca bajo la lluvia, cada pase cuesta el doble
  verso (8c):    resbalones, pelotazos que mueren en el charco, frustración
  build (4c):    el diluvio — la lluvia es un muro, las gotas aceleran
  gancho B (8c): adaptación — el equipo juega CON la lluvia, no contra ella
  gancho C (8c): el gol — de rodillas en el barro, las gotas caen como música
  final (4c):    escampa, las gotas se espacian, una última gota sola

Rasgo distintivo: "gota percusiva" — gotas sintetizadas (sine con barrido de
pitch alto→bajo, reverb corta) con altura aleatoria; empiezan como llovizna
fuera de grilla, se densifican sección a sección, y en el gancho C caen en
subdivisiones del ritmo afinadas al acorde — la lluvia se convierte en música.

Estructura: intro 4 · gancho A 8 · verso 8 · build 4 · gancho B 8 · gancho C 8 · final 4
  = 44 compases, 118 BPM, fa menor → ~90 s

Recursos: gota percusiva con pitch aleatorio (firma del tema), pad con ruido
filtrado (atmósfera de lluvia), lead con overshoot de pitch (resbalón), 808
melódico con saltos de octava y glide, gota invertida en las transiciones

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_21_2.py
Salida: fuentes/beats/salida/diario/2026-10-21-2.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch,  # noqa: E402
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar, ochocientos)

BPM = 118
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.13 * S16
rng = np.random.default_rng(202610212)
NOM = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
       'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOM[nombre[:-1]]


def paso(c, s, swing=True):
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


# ── Armonía: Fm → Db → Bbm → C7 (i → VI → iv → V, fa menor armónica) ────────
ACORDES = {
    'Fm':  ['F3', 'Ab3', 'C4', 'Eb4'],
    'Db':  ['F3', 'Ab3', 'Db4'],
    'Bbm': ['F3', 'Bb3', 'Db4'],
    'C7':  ['E3', 'G3', 'Bb3', 'C4'],
}
RAIZ_808 = {'Fm': 'F1', 'Db': 'Db2', 'Bbm': 'Bb1', 'C7': 'C2'}
PROG = ['Fm', 'Db', 'Bbm', 'C7']

SECCIONES = [
    ('intro', 4), ('ganchoA', 8), ('verso', 8), ('build', 4),
    ('ganchoB', 8), ('ganchoC', 8), ('final', 4),
]

# ── Melodías escritas a mano ─────────────────────────────────────────────────
# Gancho: empuja arriba bajo la lluvia, cada frase asciende y vuelve a caer
LEAD_HOOK = [
    [(0, 'Ab4', 2), (3, 'Bb4', 1), (4, 'C5', 3), (8, 'Eb5', 2), (12, 'C5', 4)],
    [(0, 'Db5', 2), (3, 'Eb5', 1), (4, 'F5', 3), (8, 'Ab5', 2), (12, 'F5', 4)],
    [(0, 'Bb4', 3), (4, 'Db5', 2), (7, 'F5', 1), (8, 'Ab5', 3), (12, 'F5', 4)],
    [(0, 'G5', 3), (4, 'F5', 2), (8, 'Eb5', 4)],
]
LEAD_HOOK_V = [
    [(0, 'Ab4', 3), (4, 'C5', 2), (7, 'Eb5', 1), (8, 'C5', 2), (12, 'Bb4', 4)],
    [(0, 'Db5', 3), (4, 'F5', 2), (8, 'Ab5', 6)],
    [(0, 'Bb4', 2), (3, 'Db5', 1), (4, 'F5', 3), (8, 'Eb5', 2), (12, 'Db5', 4)],
    [(0, 'C5', 3), (4, 'Eb5', 2), (8, 'G5', 6)],
]
# Gancho C: el gol — la melodía pasa el punto de bloqueo y se sostiene arriba
LEAD_C = [
    [(0, 'C5', 2), (3, 'Eb5', 1), (4, 'F5', 4), (8, 'Ab5', 4), (14, 'Bb5', 2)],
    [(0, 'Db5', 2), (3, 'F5', 1), (4, 'Ab5', 4), (10, 'Bb5', 6)],
    [(0, 'Bb5', 3), (4, 'Ab5', 1), (6, 'F5', 2), (8, 'Ab5', 2), (10, 'Bb5', 2), (12, 'C6', 4)],
    [(0, 'C6', 8)],
]
LEAD_C_V = [
    [(0, 'C5', 3), (4, 'F5', 3), (8, 'Ab5', 2), (12, 'Bb5', 4)],
    [(0, 'F5', 3), (4, 'Ab5', 2), (8, 'Bb5', 6)],
    [(0, 'Bb5', 2), (3, 'Ab5', 1), (4, 'F5', 3), (8, 'Bb5', 2), (12, 'C6', 4)],
    [(0, 'C6', 6), (8, 'Bb5', 6)],
]
# Verso: fragmentos mojados, entrecortados — el replay del resbalón
LEAD_VERSO = [
    [(0, 'C5', 3), (10, 'Ab4', 2)],
    [(4, 'Eb5', 4), (12, 'Db5', 2)],
    [(0, 'F5', 3), (8, 'Eb5', 3)],
    [(0, 'G5', 2)],
]


# ── Instrumentos del tema ────────────────────────────────────────────────────

def gota(f_start=None, dur=0.12, brillo=1.0):
    """Gota de agua: sine con barrido de pitch rápido y resonancia corta."""
    if f_start is None:
        f_start = rng.uniform(1800, 3500)
    t = t_arr(dur)
    f = f_start * np.exp(-t * 50) + 250
    x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    e = np.exp(-t * 22) * (1 - np.exp(-t * 4000))
    return x * e * 0.22 * brillo


def gota_tonal(midi, dur=0.12):
    """Gota afinada: la frecuencia base es una nota musical (gancho C)."""
    t = t_arr(dur + 0.08)
    f0 = hz(midi)
    f = f0 * 3 * np.exp(-t * 40) + f0
    x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    e = np.exp(-t * 18) * (1 - np.exp(-t * 4000))
    return x * e * 0.25


def lead_mojado(midi, dur, resbala=False, desde=None):
    """Lead saw con vibrato y overshoot ocasional (el pie que patina)."""
    t = t_arr(dur + 0.4)
    f = np.full(len(t), float(hz(midi)))
    vib = 1 + 0.005 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.15) * 4, 0, 1)
    f *= vib
    if resbala:
        n_os = min(len(t), int(0.12 * SR))
        overshoot = np.ones(len(t))
        overshoot[:n_os] = 1 + 0.04 * np.exp(-t[:n_os] * 12) * np.sin(2 * np.pi * 3.5 * t[:n_os])
        f *= overshoot
    if desde is not None:
        g = min(len(t), int(0.06 * SR))
        f[:g] *= (hz(desde) / hz(midi)) ** (1 - np.arange(g) / g)
    ph = np.cumsum(f) / SR
    x = 2 * (ph - np.floor(ph + 0.5)) * 0.55 + saw(hz(midi), t, 0.007) * 0.45
    x = lp(x, 2800)
    return x * env_adsr(len(t), 0.008, 0.15, 0.6, 0.25, dur) * 0.2


def pad_lluvia(notas_midi, dur, lluvia=0.3, filtro=1400):
    """Pad saw con capa de ruido filtrado: el sonido de fondo de la lluvia."""
    t = t_arr(dur + 1.2)
    out = np.zeros((2, len(t)))
    for m in notas_midi:
        f = hz(m)
        for v in range(5):
            det = (v - 2) * 0.004
            out += paneo(saw(f, t, det) / 5, (v - 2) / 3.5)
    rain = np.stack([bp(rng.standard_normal(len(t)), 500, 5000),
                     bp(rng.standard_normal(len(t)), 500, 5000)]) * lluvia
    return lp(out + rain, filtro, 3) * env_adsr(len(t), 0.55, 0.4, 0.8, 1.0, dur) * 0.11


def bombo_mojado():
    """Kick pesado con sub largo (la cancha retumba bajo el agua)."""
    t = t_arr(0.55)
    sub = np.sin(2 * np.pi * np.cumsum(44 + 15 * np.exp(-t * 18)) / SR) * np.exp(-t * 4.8)
    punch = np.sin(2 * np.pi * np.cumsum(55 + 130 * np.exp(-t * 60)) / SR) * np.exp(-t * 25)
    click = hp(rng.standard_normal(len(t)), 3200) * np.exp(-t * 400) * 0.3
    return np.tanh((sub * 0.85 + punch * 0.8 + click) * 1.5)


def caja_splash():
    """Redoblante con más ring (piel mojada)."""
    t = t_arr(0.35)
    cuerpo = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 20)
    ring = np.sin(2 * np.pi * 360 * t) * np.exp(-t * 12) * 0.3
    ruido = bp(rng.standard_normal(len(t)), 1500, 8500) * np.exp(-t * 11)
    return np.tanh((cuerpo + ring + ruido * 0.85) * 1.4)


def hat_oscuro():
    """Hi-hat más oscuro (la lluvia ahoga los brillos)."""
    t = t_arr(0.07)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (205, 308, 370, 524, 542, 790))
    return hp(bp(x, 5500, 12000), 6000) * np.exp(-t * 60) * 0.18


def hat_abierto_osc():
    t = t_arr(0.3)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (205, 308, 370, 524, 542, 790))
    return hp(bp(x, 5500, 12000), 6000) * np.exp(-t * 9) * 0.18


# ── Composición ──────────────────────────────────────────────────────────────
def render():
    total = sum(c for _, c in SECCIONES)
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'pad', 'lead', 'gotas', 'fx']}
    sc = np.zeros(N)
    K, SN, HC, HO = bombo_mojado(), caja_splash(), hat_oscuro(), hat_abierto_osc()
    ir = reverb_ir(dur=2.6, brillo=5000, seed=55)
    ir_sala = reverb_ir(dur=0.6, decay=8, brillo=6500, seed=56)
    ir_gotas = reverb_ir(dur=1.4, brillo=8000, seed=57)
    notas808 = []
    hum = lambda s=0.004: rng.normal(0, s)
    vel = lambda: 1 - rng.uniform(0, 0.2)

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

            # ── Pad: todas las secciones, con distinta cantidad de lluvia ──
            notas = [n(x) for x in ACORDES[ac]]
            if nombre == 'intro':
                poner(bus['pad'], pad_lluvia(notas, COMPAS, lluvia=0.15, filtro=900), t_c)
            elif nombre == 'final':
                poner(bus['pad'], pad_lluvia(notas, COMPAS, lluvia=0.08, filtro=700) * 0.7, t_c)
            elif nombre == 'build':
                poner(bus['pad'], pad_lluvia(notas, COMPAS, lluvia=0.3 + c * 0.15,
                                             filtro=800 + c * 250), t_c)
            elif nombre == 'verso':
                poner(bus['pad'], pad_lluvia(notas, COMPAS, lluvia=0.25, filtro=1000) * 0.6, t_c)
            else:
                llu = 0.2 if nombre == 'ganchoA' else (0.15 if nombre == 'ganchoB' else 0.1)
                filt = 1400 if nombre == 'ganchoC' else 1200
                poner(bus['pad'], pad_lluvia(notas, COMPAS, lluvia=llu, filtro=filt), t_c)

            # ── Gotas percusivas (firma del tema) ──
            if nombre == 'intro':
                for _ in range(rng.integers(2, 4)):
                    t_g = t_c + rng.uniform(0, COMPAS)
                    g = gota(rng.uniform(2000, 3500), rng.uniform(0.08, 0.15))
                    poner(bus['gotas'], paneo(g, rng.uniform(-0.6, 0.6)) * 0.35, t_g)

            elif nombre == 'ganchoA':
                for _ in range(rng.integers(4, 7)):
                    t_g = t_c + rng.uniform(0, COMPAS)
                    g = gota(rng.uniform(1800, 3200), rng.uniform(0.08, 0.13))
                    poner(bus['gotas'], paneo(g, rng.uniform(-0.7, 0.7)) * 0.4, t_g)

            elif nombre == 'verso':
                for _ in range(rng.integers(5, 9)):
                    t_g = t_c + rng.uniform(0, COMPAS)
                    g = gota(rng.uniform(1500, 3000), rng.uniform(0.06, 0.12))
                    poner(bus['gotas'], paneo(g, rng.uniform(-0.8, 0.8)) * 0.35, t_g)
                    if rng.random() < 0.3:
                        g2 = gota(rng.uniform(2000, 3500), 0.06)
                        poner(bus['gotas'], paneo(g2, rng.uniform(-0.5, 0.5)) * 0.2,
                              t_g + rng.uniform(0.02, 0.06))

            elif nombre == 'build':
                n_g = 8 + c * 6
                for j in range(n_g):
                    t_g = t_c + j * COMPAS / n_g + rng.uniform(-0.02, 0.02)
                    g = gota(rng.uniform(1500, 3500), rng.uniform(0.05, 0.1), 0.5 + c * 0.15)
                    poner(bus['gotas'], paneo(g, rng.uniform(-0.9, 0.9)) * (0.3 + c * 0.1),
                          max(0, t_g))

            elif nombre == 'ganchoB':
                for _ in range(rng.integers(4, 7)):
                    if rng.random() < 0.35:
                        s = int(rng.choice([0, 2, 4, 6, 8, 10, 12, 14]))
                        t_g = paso(cg, s)
                    else:
                        t_g = t_c + rng.uniform(0, COMPAS)
                    g = gota(rng.uniform(1800, 3200), 0.1)
                    poner(bus['gotas'], paneo(g, rng.uniform(-0.6, 0.6)) * 0.45, t_g)

            elif nombre == 'ganchoC':
                # Gotas afinadas al acorde EN la grilla: la lluvia es música
                notas_g = [n(x) + 12 for x in ACORDES[ac][:3]]
                for s in range(0, 16, 2):
                    if rng.random() < 0.65:
                        midi = int(rng.choice(notas_g))
                        g = gota_tonal(midi, 0.1)
                        pan = 0.5 * np.sin(s * 0.8)
                        v = 0.85 if s % 4 == 0 else 0.5
                        poner(bus['gotas'], paneo(g, pan) * v, paso(cg, s))
                for _ in range(rng.integers(2, 4)):
                    t_g = t_c + rng.uniform(0, COMPAS)
                    g = gota(rng.uniform(2000, 3000), 0.08)
                    poner(bus['gotas'], paneo(g, rng.uniform(-0.5, 0.5)) * 0.2, t_g)

            elif nombre == 'final':
                n_g = max(1, 4 - c)
                for _ in range(n_g):
                    t_g = t_c + rng.uniform(0, COMPAS)
                    g = gota(rng.uniform(2200, 3000), rng.uniform(0.1, 0.2))
                    poner(bus['gotas'], paneo(g, rng.uniform(-0.4, 0.4)) * max(0.1, 0.3 - c * 0.06),
                          t_g)

            # ── Lead ──
            if nombre in ('ganchoA', 'ganchoB'):
                fr = LEAD_HOOK_V[frase] if mitad2 else LEAD_HOOK[frase]
                previa = None
                for (s, nta, l) in fr:
                    m = n(nta)
                    res = nombre == 'ganchoA' and s >= 8 and rng.random() < 0.3
                    x = lead_mojado(m, l * S16 * 0.9, resbala=res,
                                    desde=previa if previa and abs(previa - m) <= 5 else None)
                    poner(bus['lead'], paneo(x, -0.12 if s < 8 else 0.12),
                          paso(cg, s) + hum(0.003))
                    previa = m
                if nombre == 'ganchoB' and frase in (0, 2):
                    for (s, nta, l) in fr[:2]:
                        m = n(nta) - 12
                        x = lead_mojado(m, l * S16 * 0.8) * 0.3
                        poner(bus['lead'], paneo(x, 0.3), paso(cg, s) + hum(0.003))

            elif nombre == 'ganchoC':
                fr = LEAD_C_V[frase] if mitad2 else LEAD_C[frase]
                previa = None
                for (s, nta, l) in fr:
                    m = n(nta)
                    x = lead_mojado(m, l * S16 * 0.9,
                                    desde=previa if previa and abs(previa - m) <= 5 else None)
                    poner(bus['lead'], paneo(x, -0.1), paso(cg, s) + hum(0.003))
                    previa = m

            elif nombre == 'verso':
                for (s, nta, l) in LEAD_VERSO[frase]:
                    m = n(nta)
                    res = rng.random() < 0.4
                    x = lead_mojado(m, l * S16 * 0.9, resbala=res) * 0.6
                    poner(bus['lead'], paneo(x, 0), paso(cg, s) + hum(0.003))

            elif nombre == 'intro' and c >= 2:
                hints = LEAD_HOOK[c - 2][:2]
                for (s, nta, l) in hints:
                    x = lp(lead_mojado(n(nta), l * S16 * 0.9), 1500) * 0.18
                    poner(bus['lead'], paneo(x, 0), paso(cg, s))

            elif nombre == 'final' and c <= 1:
                fr = LEAD_HOOK[c][:2] if c == 0 else LEAD_HOOK[1][:1]
                for (s, nta, l) in fr:
                    x = lp(lead_mojado(n(nta), l * S16 * 0.9), 1200) * 0.15
                    poner(bus['lead'], paneo(x, 0), paso(cg, s))

            # ── Batería ──
            con_bat = nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC')
            if con_bat:
                if nombre == 'verso':
                    kicks = [0, 10]
                elif frase == 3:
                    kicks = [0, 6, 10, 14]
                else:
                    kicks = [0, 6, 10]
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.93, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.22) * 15)[None], paso(cg, s, False))
                poner(bus['drums'], paneo(SN, 0.04) * 0.7, paso(cg, 8, False) + hum(0.002))
                if nombre == 'verso':
                    for s in range(0, 16, 2):
                        poner(bus['drums'], paneo(HC * (0.85 if s % 4 == 0 else 0.45) * vel(), 0.3),
                              paso(cg, s) + hum(0.002))
                else:
                    redo = frase == 3
                    for s in range(16):
                        if redo and s >= 12:
                            break
                        poner(bus['drums'], paneo(HC * [1.0, 0.4, 0.65, 0.4][s % 4] * vel(), 0.3),
                              paso(cg, s) + hum(0.002))
                    if redo:
                        sub = 6 if (c // 4) % 2 == 0 else 8
                        for j in range(sub):
                            poner(bus['drums'],
                                  paneo(repitch(HC, 1 + j * 0.04) * (0.4 + 0.5 * j / sub), 0.3),
                                  cg * COMPAS + 12 * S16 + j * BEAT / sub)
                    if frase in (1, 3):
                        ho = HO[:min(len(HO), int(2 * S16 * SR))].copy()
                        if len(ho) > 200:
                            ho[-200:] *= np.linspace(1, 0, 200)
                        poner(bus['drums'], paneo(ho, -0.25) * 0.6, paso(cg, 6))

            # ── 808 ──
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

    # ── Gotas invertidas en las transiciones ──
    for sec in ('ganchoA', 'ganchoB', 'ganchoC'):
        t_sec = ini[sec] * COMPAS
        dur_gi = BEAT * 3
        if t_sec - dur_gi >= 0:
            gi = np.zeros(int(dur_gi * SR))
            for _ in range(10):
                g = gota(rng.uniform(1500, 3000), 0.1, 0.6)
                pos = int(rng.uniform(0, 0.7) * len(gi))
                end = min(pos + len(g), len(gi))
                gi[pos:end] += g[:end - pos]
            gi = gi[::-1] * np.linspace(0.3, 1.0, len(gi))
            poner(bus['fx'], paneo(gi, 0) * 0.35, t_sec - dur_gi)

    # ── Build: kicks acelerando + redoble ──
    b0 = ini['build']
    for c in range(4):
        cg = b0 + c
        t_c = cg * COMPAS
        step = max(1, 4 - c)
        for s in range(0, 16, step):
            vol_k = 0.2 + 0.55 * ((c * 16 + s) / 64)
            poner(bus['drums'], paneo(lp(K, 900 + c * 1100), 0) * vol_k, t_c + s * S16)
    for j in range(18):
        t_s = (b0 + 2) * COMPAS + j * S16 * 0.7
        if t_s < (b0 + 4) * COMPAS - BEAT * 0.5:
            poner(bus['drums'], paneo(repitch(SN, 1 + j * 0.012), 0) * (0.2 + 0.5 * j / 18), t_s)
    # Silencio antes del gancho B
    sil_a = int(((b0 + 4) * COMPAS - BEAT * 0.4) * SR)
    sil_b = min(int((b0 + 4) * COMPAS * SR), N)
    for k in bus:
        bus[k][:, sil_a:sil_b] *= 0.05

    # ── Render 808 ──
    if notas808:
        bus['bajo'] += paneo(lp(ochocientos(notas808, N / SR, 1.8), 3200), 0) * 0.85

    # ── Mezcla ──
    pd = con_reverb(lp(hp(bus['pad'], 80), 2800), ir, 0.3)
    ld = con_reverb(delay_pingpong(saturar(hp(bus['lead'], 200), 0.2),
                                   BEAT * 0.75, 0.3, 0.18), ir, 0.22)
    gt = con_reverb(bus['gotas'], ir_gotas, 0.45)
    dr = con_reverb(saturar(bus['drums'], 0.15), ir_sala, 0.08)
    bj = bus['bajo'] * (1 - np.clip(sc, 0, 1) * 0.2)
    duck = 1 - np.clip(sc, 0, 1) * 0.45
    mix = dr * 1.0 + bj * 0.9 + (pd + ld + gt) * duck + bus['fx'] * 0.6

    # ── Ganancia por sección ──
    g = np.ones(mix.shape[1])
    for ns, val in [('intro', 6.5), ('final', 8.5), ('build', 0.7), ('verso', 0.85)]:
        ls = dict(SECCIONES)[ns]
        a, b = int(ini[ns] * COMPAS * SR), min(mix.shape[1], int((ini[ns] + ls) * COMPAS * SR))
        g[a:b] = val
    g = lp(g, 3)
    mix *= g

    # ── Master ──
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
    path = os.path.join(out, '2026-10-21-2.wav')
    audio = render()
    sf.write(path, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(path, RAIZ)}  {audio.shape[0] / SR:.1f} s')
