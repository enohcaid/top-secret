"""DEBUT — beat de trap del club, compuesto a mano. Tema del día 2026-10-20-2.

Concepto: La primera vez que salís a la cancha en un partido oficial — todo va más
rápido, la camiseta pesa, la tribuna es ruido; cada toque te asienta un poco más
hasta que en el último gancho jugás como si siempre hubieras estado ahí.

Emoción por sección:
  intro (4c)    — nervios puros: la cuerda estira sin llegar, el pad cerrado, todo lejano
  gancho A (8c) — el partido arranca: energía con inseguridad, bends todavía anchos
  verso (8c)    — momentos sueltos: piano nervioso, la cuerda desaparece (estás abrumado)
  build (2c)    — la confianza sube, redoblante que acelera
  gancho B (8c) — más asentado: bends cortos, contramelodía de piano, pad más abierto
  puente (4c)   — respiro: tresillos, cuerda lenta una octava abajo, espacio
  gancho C (8c) — ya estás ahí: la cuerda suena afinada, línea nueva más segura y aguda
  final (4c)    — la cuerda limpia, sola, sin bend — ya sos parte del equipo

Rasgo distintivo: CUERDA QUE ESTIRA — lead de cuerda sintetizada donde cada nota
arranca por debajo (bend ascendente) y sube hasta la nota real. Sección a sección
el bend se acorta:
  intro    = 4 semitonos, glide lento (0.28 s)
  gancho A = 3 semitonos, glide medio (0.20 s)
  gancho B = 1.5 semitonos, glide rápido (0.12 s)
  puente   = 2 semitonos, glide medio (0.22 s) — una octava abajo
  gancho C = 0 semitonos (afinada desde el ataque)
  final    = 0 semitonos — ya no estirás, ya estás ahí

Estructura: intro 4 · gancho A 8 · verso 8 · build 2 · gancho B 8 · puente 4 · gancho C 8 · final 4
            = 46 compases × 140 BPM → ~82 s

Tonalidad: mib menor (Eb minor natural)
Progresión: Ebm7 – Bmaj7 – Gbmaj7 – Db  (i – VI – III – VII)

Recursos: cuerda que estira con bend ascendente variable (firma del tema), pad tenso
con filtro que abre sección a sección, piano nervioso percusivo con ghost notes (verso),
808 melódico con saltos de octava y glide, platillo invertido en las transiciones

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_20_2.py
Salida: fuentes/beats/salida/diario/2026-10-20-2.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch,
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar, ochocientos)

BPM = 140
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.14 * S16
rng = np.random.default_rng(202610202)

NOM = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
       'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n(nombre):
    """'Eb4' -> MIDI 63."""
    return 12 * (int(nombre[-1]) + 1) + NOM[nombre[:-1]]


def paso(c, s, swing=True):
    """Tiempo (seg) del paso s (semicorchea 0-15) del compás c."""
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


hum = lambda s=0.004: rng.normal(0, s)
vel = lambda: 1 - rng.uniform(0, 0.18)


# ── Armonía: mib menor, i – VI – III – VII ────────────────────────────────
ACORDES = {
    'Ebm7':   ['Eb3', 'Gb3', 'Bb3', 'Db4'],
    'Bmaj7':  ['B2', 'Eb3', 'Gb3', 'Bb3'],     # enarmónico: B D# F# A#
    'Gbmaj7': ['Gb3', 'Bb3', 'Db4', 'F4'],
    'Db':     ['Db3', 'F3', 'Ab3'],
}
RAIZ808 = {'Ebm7': 'Eb2', 'Bmaj7': 'B1', 'Gbmaj7': 'Gb2', 'Db': 'Db2'}
PROG = ['Ebm7', 'Bmaj7', 'Gbmaj7', 'Db']

SECCIONES = [
    ('intro', 4), ('ganchoA', 8), ('verso', 8), ('build', 2),
    ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 4),
]

# ── Bend del rasgo (semitonos, duración del glide) por sección ─────────────
BEND = {
    'intro':   (4.0, 0.28),
    'ganchoA': (3.0, 0.20),
    'ganchoB': (1.5, 0.12),
    'puente':  (2.0, 0.22),
    'ganchoC': (0.0, 0.0),
    'final':   (0.0, 0.0),
}

# Cutoff del pad por sección (la tribuna se aclara)
PAD_CUTOFF = {
    'intro': 650, 'ganchoA': 1100, 'verso': 850, 'build': 1400,
    'ganchoB': 1900, 'puente': 1200, 'ganchoC': 3200, 'final': 900,
}

# ── Melodías escritas a mano: (paso 16avos, nota, duración 16avos) ─────────

# Gancho A y B: tentativo, rango Bb4–Eb5, frases cortas con huecos
MELODIA_GANCHO = [
    [(0, 'Bb4', 3), (4, 'Db5', 2), (8, 'Eb5', 4), (14, 'Db5', 2)],        # sobre Ebm7
    [(0, 'Eb5', 2), (3, 'Db5', 1), (4, 'B4', 3), (8, 'Db5', 6)],          # sobre Bmaj7
    [(0, 'Bb4', 3), (4, 'Ab4', 2), (8, 'Gb4', 3), (12, 'Ab4', 2), (14, 'Bb4', 2)],  # sobre Gbmaj7
    [(0, 'Ab4', 3), (4, 'F4', 2), (8, 'Eb4', 4)],                          # sobre Db
]

# Gancho C: seguro, agudo (Eb5–Ab5), frases más largas
MELODIA_C = [
    [(0, 'Eb5', 3), (4, 'Gb5', 2), (8, 'Ab5', 3), (12, 'Gb5', 2), (14, 'F5', 2)],
    [(0, 'Gb5', 3), (4, 'F5', 2), (8, 'Eb5', 4)],
    [(0, 'Db5', 2), (4, 'Eb5', 3), (8, 'Gb5', 4), (14, 'F5', 2)],
    [(0, 'Eb5', 3), (4, 'F5', 2), (8, 'Eb5', 6)],
]

# Intro: fragmentos del motivo, espaciados (nervios, todavía no hay frase completa)
MELODIA_INTRO = [
    [(0, 'Bb4', 6), (10, 'Db5', 4)],
    [(2, 'Eb5', 8)],
    [(0, 'Bb4', 6), (10, 'Ab4', 4)],
    [(2, 'Ab4', 4), (8, 'Eb4', 6)],
]

# Final: las notas clave, limpias y sostenidas (ya pertenecés)
MELODIA_FINAL = [
    [(0, 'Bb4', 8)],
    [(0, 'Eb5', 8)],
    [(0, 'Db5', 6), (8, 'Bb4', 6)],
    [(0, 'Eb4', 12)],
]

# Contramelodía del piano en gancho B: rellena los huecos del lead
CONTRA_PIANO = [
    [(6, 'Gb4', 2), (12, 'F4', 2)],
    [(6, 'Ab4', 2), (14, 'Gb4', 2)],
    [(6, 'F4', 2), (14, 'Eb4', 2)],
    [(6, 'Eb4', 2), (12, 'Db4', 2)],
]


# ── Instrumentos propios de este tema ──────────────────────────────────────

def cuerda_estira(m, dur, bend_st=0.0, bend_dur=0.0, v=1.0):
    """Lead de cuerda sintetizada con bend ascendente — la firma del tema.

    m: nota MIDI objetivo
    bend_st: semitonos debajo del objetivo donde arranca
    bend_dur: duración del glide (s)
    """
    t = t_arr(dur + 0.4)
    f_target = hz(m)
    f = np.full(len(t), f_target)
    if bend_st > 0 and bend_dur > 0:
        f_start = hz(m - bend_st)
        g = min(len(t), int(bend_dur * SR))
        curve = np.linspace(0, 1, g) ** 0.55          # ease-out: llega rápido, ajusta lento
        f[:g] = f_start + (f_target - f_start) * curve

    # Vibrato que aparece después del bend (confianza)
    vib_onset = (bend_dur + 0.1) if bend_dur > 0 else 0.15
    vib = 0.006 * np.sin(2 * np.pi * 5.3 * t) * np.clip((t - vib_onset) * 4, 0, 1)
    f *= 1 + vib

    # Fase continua (necesaria porque f varía)
    ph = np.cumsum(f) / SR

    # Sierra (cuerpo de cuerda) + quinta justa + octava con beating sutil
    x = 2 * (ph - np.floor(ph + 0.5))
    x += 0.25 * np.sin(2 * np.pi * ph * 1.498)       # quinta ligeramente baja → calidez
    x += 0.12 * np.sin(2 * np.pi * ph * 2.003)       # octava con beating mínimo

    # Ruido de arco en el ataque
    bow = bp(rng.standard_normal(len(t)), 600, 3000) * np.exp(-t * 45) * 0.15

    # Envolvente de arco: ataque lento, release suave
    e = env_adsr(len(t), 0.07, 0.15, 0.72, 0.25, dur)

    return lp(x + bow, 4000) * e * 0.20 * v


def pad_tenso(notas_midi, dur, cutoff=1200):
    """Pad de cuerdas tensas — supersaw detuned con filtro variable."""
    t = t_arr(dur + 1.2)
    out = np.zeros((2, len(t)))
    for m in notas_midi:
        for v in range(5):
            det = (v - 2) * 0.007
            out += paneo(saw(hz(m), t, det) / 5, (v - 2) / 4 * 1.0)
    e = env_adsr(len(t), 0.55, 0.7, 0.75, 0.9, dur)
    return lp(out, cutoff, 2) * e * 0.13


def piano_nervioso(m, dur, v=1.0):
    """Piano percusivo con hammer noise — nervioso, staccato."""
    t = t_arr(dur + 0.6)
    f = hz(m)
    hammer = bp(rng.standard_normal(len(t)), 900, 3500) * np.exp(-t * 120) * 0.2
    x = sum(np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h**2)) * np.exp(-t * (1.8 + h * 0.7)) / h
            for h in range(1, 6))
    e = env_adsr(len(t), 0.002, 0.3, 0.25, 0.2, dur)
    return lp(x + hammer, 4200) * e * 0.28 * v


def bombo_debut():
    """Bombo en capas: sub + punch + click."""
    t = t_arr(0.48)
    sub = np.sin(2 * np.pi * np.cumsum(44 + 16 * np.exp(-t * 22)) / SR) * np.exp(-t * 5.8)
    punch = np.sin(2 * np.pi * np.cumsum(65 + 130 * np.exp(-t * 50)) / SR) * np.exp(-t * 26)
    click = hp(rng.standard_normal(len(t)), 3200) * np.exp(-t * 320) * 0.55
    return np.tanh((sub * 0.82 + punch * 0.78 + click) * 1.5)


def caja_debut():
    """Caja apretada con ring metálico."""
    t = t_arr(0.32)
    cuerpo = np.sin(2 * np.pi * 195 * t) * np.exp(-t * 24)
    ring = np.sin(2 * np.pi * 440 * t) * np.exp(-t * 13) * 0.3
    ruido = bp(rng.standard_normal(len(t)), 1800, 8500) * np.exp(-t * 15)
    return np.tanh((cuerpo * 0.65 + ring + ruido * 0.8) * 1.3)


def hat_debut(abierto=False):
    """Hi-hat metálico tipo 808."""
    t = t_arr(0.38 if abierto else 0.075)
    freqs = (203.7, 308.9, 371.2, 528.5, 543.8, 806.3)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in freqs)
    x = hp(bp(x, 6200, 14500), 7000) * np.exp(-t * (9 if abierto else 58))
    return x * 0.21


def rim_debut():
    """Rimshot percusivo."""
    t = t_arr(0.045)
    return (bp(rng.standard_normal(len(t)), 1600, 2800) * 0.55 + np.sin(2 * np.pi * 880 * t)) \
        * np.exp(-t * 115) * 0.32


def platillo_invertido(dur):
    """Crash invertido — swell hacia una entrada."""
    t = t_arr(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * 1.6 * t)) for f in (203.7, 308.9, 371.2, 528.5, 543.8, 806.3))
    x = hp(x + rng.standard_normal(len(t)) * 1.8, 4200) * np.exp(-t * 2.0)
    x = x[::-1]
    return np.stack([x, np.roll(x, 350)]) * 0.065


def barrido_hp(st, t0, dur):
    """Build: el filtro pasa-altos sube (crossfade entre versiones filtradas)."""
    i0, L = int(t0 * SR), int(dur * SR)
    if i0 + L > st.shape[1]:
        L = st.shape[1] - i0
    seg = st[:, i0:i0 + L]
    cortes = [20, 250, 600, 1200, 2400, 4000]
    vers = [seg] + [hp(seg, c, 2) for c in cortes[1:]]
    pos = np.linspace(0, len(vers) - 1, seg.shape[1])
    out = np.zeros_like(seg)
    for k, vr in enumerate(vers):
        w = np.clip(1 - np.abs(pos - k), 0, 1)
        out += vr * w
    st[:, i0:i0 + L] = out
    return st


# ── Composición ─────────────────────────────────────────────────────────────

def render():
    total = sum(c for _, c in SECCIONES)        # 46 compases
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'pad', 'lead', 'piano', 'fx']}
    sc = np.zeros(N)

    K = bombo_debut()
    SN = caja_debut()
    H = hat_debut()
    HO = hat_debut(True)
    RI = rim_debut()

    ir = reverb_ir(dur=2.4, brillo=6500, seed=42)
    ir_sala = reverb_ir(dur=0.6, decay=8, brillo=9000, seed=43)

    notas808 = []
    ini = {}
    c0 = 0

    for nombre, largo in SECCIONES:
        ini[nombre] = c0
        bend_st, bend_dur = BEND.get(nombre, (0, 0))
        cutoff = PAD_CUTOFF.get(nombre, 1200)

        for c in range(largo):
            cg = c0 + c
            frase = c % 4
            ac = PROG[frase]
            ultimo = c == largo - 1
            gancho = nombre.startswith('gancho')

            # ── Pad de cuerdas tensas (todas las secciones menos build) ──
            if nombre != 'build':
                notas = [n(x) for x in ACORDES[ac]]
                poner(bus['pad'], pad_tenso(notas, COMPAS, cutoff), paso(cg, 0, False))

            # ── Piano nervioso: verso (acordes percusivos con ghost notes) ──
            if nombre == 'verso':
                notas = [n(x) for x in ACORDES[ac]]
                golpes = ([(0, 1.0), (3, 0.35), (6, 0.7), (10, 0.45)]
                          if frase != 3 else [(0, 1.0), (4, 0.55), (8, 0.8), (13, 0.4)])
                for s, vl in golpes:
                    for k, m in enumerate(notas):
                        x = piano_nervioso(m, S16 * 2.5, vl * (1 - rng.uniform(0, 0.12)))
                        poner(bus['piano'], paneo(x, -0.2 + 0.15 * k), paso(cg, s) + k * 0.005 + hum(0.003))

            # ── Piano: contramelodía en gancho B ──
            if nombre == 'ganchoB' and frase < len(CONTRA_PIANO):
                for (s, nota, l) in CONTRA_PIANO[frase]:
                    m = n(nota)
                    x = piano_nervioso(m, l * S16 * 0.9, 0.6)
                    poner(bus['piano'], paneo(x, 0.25), paso(cg, s) + hum(0.002))

            # ── Lead: cuerda que estira ──
            if nombre in ('intro', 'ganchoA', 'ganchoB', 'ganchoC', 'puente', 'final'):
                if nombre == 'ganchoC':
                    mel = MELODIA_C
                elif nombre == 'final':
                    mel = MELODIA_FINAL
                elif nombre == 'puente':
                    mel = MELODIA_INTRO            # misma idea que intro pero abajo
                elif nombre == 'intro':
                    mel = MELODIA_INTRO
                else:
                    mel = MELODIA_GANCHO

                if frase < len(mel):
                    for (s, nota, l) in mel[frase]:
                        m = n(nota)
                        oct_shift = -12 if nombre == 'puente' else 0
                        vl = 0.75 if nombre in ('intro', 'final', 'puente') else 1.0
                        x = cuerda_estira(m + oct_shift, l * S16 * 0.9, bend_st, bend_dur, vl * vel())
                        pan = -0.1 + 0.05 * (s % 4)
                        poner(bus['lead'], paneo(x, pan), paso(cg, s) + hum(0.003))

            # ── Batería ──
            con_bateria = nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC')
            if con_bateria:
                # Kicks
                if nombre == 'verso':
                    kicks = [0, 10] if frase != 3 else [0, 10, 14]
                else:
                    kicks = [0, 6, 10] if frase != 3 else [0, 6, 10, 15]
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.92, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.22) * 15)[None], paso(cg, s, False))

                # Caja en el tercer tiempo (medio tiempo)
                poner(bus['drums'], paneo(SN, 0.04) * 0.72, paso(cg, 8, False) + hum(0.002))

                # Hi-hats con swing
                if nombre == 'verso':
                    # Corcheas en el verso (espaciado, nervioso, con huecos aleatorios)
                    for s in range(0, 16, 2):
                        acento = 0.85 if s % 4 == 0 else 0.5
                        if rng.random() < 0.08:
                            continue
                        poner(bus['drums'], paneo(H * acento * vel(), 0.3), paso(cg, s) + hum(0.002))
                else:
                    # Semicorcheas en los ganchos
                    redoble = frase == 3
                    for s in range(16):
                        if redoble and s >= 12:
                            break
                        acento = [0.9, 0.38, 0.6, 0.38][s % 4]
                        poner(bus['drums'], paneo(H * acento * vel(), 0.28), paso(cg, s) + hum(0.002))

                    if redoble:
                        sub = 6 if (c // 4) % 2 == 0 else 8
                        for j in range(sub):
                            r = 1 + j * 0.05
                            poner(bus['drums'], paneo(repitch(H, r) * (0.4 + 0.5 * j / sub), 0.28),
                                  cg * COMPAS + 12 * S16 + j * BEAT / sub)

                # Hat abierto a contratiempo (ganchos, frases impares)
                if gancho and frase in (1, 3):
                    ho_len = int(2.5 * S16 * SR)
                    ho = HO[:ho_len].copy()
                    ho[-250:] *= np.linspace(1, 0, 250)
                    poner(bus['drums'], paneo(ho, -0.28) * 0.75, paso(cg, 6))

                # Rim en el verso (rebote nervioso)
                if nombre == 'verso' and frase in (1, 3):
                    poner(bus['drums'], paneo(RI, 0.35) * 0.55, paso(cg, 12))

            # Puente: batería mínima (kick en 1, tresillos de hat)
            if nombre == 'puente':
                poner(bus['drums'], paneo(K, 0) * 0.85, paso(cg, 0, False))
                poner(sc[None], np.exp(-t_arr(0.22) * 15)[None], paso(cg, 0, False))
                for k in range(12):
                    poner(bus['drums'], paneo(H * (0.7 if k % 3 == 0 else 0.35), 0.3),
                          cg * COMPAS + k * COMPAS / 12 + hum(0.002))

            # ── 808 ──
            if nombre in ('ganchoA', 'verso', 'ganchoB', 'ganchoC'):
                r = n(RAIZ808[ac])
                if nombre == 'verso':
                    patron = ([(0, 0, 4), (10, 0, 4)] if frase != 3
                              else [(0, 0, 4), (10, 0, 3), (14, 12, 2)])
                else:
                    patron = ([(0, 0, 3), (6, 12, 2), (10, 0, 4)] if frase != 3
                              else [(0, 0, 3), (6, 12, 2), (10, 0, 3), (14, 7, 2)])
                for s, intervalo, l in patron:
                    glide = 0.1 if (s == 0 and frase == 0 and c > 0) else 0
                    notas808.append((paso(cg, s, False), r + intervalo, l * S16, glide))

                # Caída de octava al final de la sección
                if ultimo:
                    t0_, m_, d_, g_ = notas808[-1]
                    corte_t = cg * COMPAS + COMPAS - BEAT
                    if t0_ < corte_t:
                        notas808[-1] = (t0_, m_, corte_t - t0_, g_)
                        notas808.append((corte_t, m_ - 12, BEAT, BEAT * 0.85))

            # 808 en el puente: nota larga sostenida
            if nombre == 'puente':
                r = n(RAIZ808[ac])
                notas808.append((paso(cg, 0, False), r, COMPAS * 0.9, 0.12 if frase > 0 else 0))

        c0 += largo

    T = lambda comp: comp * COMPAS

    # ── Momentos especiales ──

    # Build: redoblante que acelera (corcheas → semicorcheas → fusas)
    b0 = ini['build']
    tiempos = ([b0 * COMPAS + k * BEAT / 2 for k in range(4)]
               + [b0 * COMPAS + 2 * BEAT + k * S16 for k in range(8)]
               + [(b0 + 1) * COMPAS + k * S16 / 2 for k in range(24)])
    for j, tt in enumerate(tiempos):
        if tt < T(b0 + 2) - BEAT * 0.5:
            poner(bus['drums'], paneo(repitch(SN, 1 + j * 0.01), 0) * (0.25 + 0.55 * j / len(tiempos)), tt)

    # Platillo invertido hacia gancho A, gancho B, gancho C
    for g in ('ganchoA', 'ganchoB', 'ganchoC'):
        pc = platillo_invertido(BEAT * 3.5)
        poner(bus['fx'], pc, T(ini[g]) - pc.shape[1] / SR)

    # ── 808 render ──
    if notas808:
        b = ochocientos(notas808, N / SR, 2.3)
        b_st = paneo(lp(b, 4200), 0)
        # Ajustar largo por redondeo float
        blen = min(b_st.shape[1], N)
        bus['bajo'][:, :blen] += b_st[:, :blen]

    # ── Mezcla ──
    duck = np.clip(sc, 0, 1)

    # Pad: reverb, sidechain
    p = con_reverb(bus['pad'] * (1 - 0.45 * duck), ir, 0.35)

    # Lead: delay, reverb, saturación suave
    lead = hp(bus['lead'], 250)
    lead = delay_pingpong(saturar(lead, 0.2), BEAT * 0.75, 0.35, 0.2)
    lead = con_reverb(lead * (1 - 0.3 * duck), ir, 0.28)

    # Piano: reverb de sala, sidechain
    pn = hp(bus['piano'], 200)
    pn = con_reverb(pn * (1 - 0.3 * duck), ir_sala, 0.15)

    # Drums: saturación mínima, reverb de sala
    drums = con_reverb(saturar(bus['drums'], 0.12), ir_sala, 0.07)

    # Bajo: sidechain suave
    bajo = bus['bajo'] * (1 - 0.25 * duck)

    mix = drums * 1.0 + bajo * 0.88 + p * 0.85 + lead * 1.05 + pn * 0.8 + bus['fx']

    # Build: HP sweep + corte de silencio antes de que caiga gancho B
    mix = barrido_hp(mix, T(ini['build']), COMPAS * 2 - BEAT * 0.5)
    s_corte = int((T(ini['build'] + 2) - BEAT * 0.5) * SR)
    s_drop = int(T(ini['build'] + 2) * SR)
    if s_corte < mix.shape[1] and s_drop <= mix.shape[1]:
        mix[:, s_corte:s_drop] *= 0.05

    # ── Ganancia por sección ──
    g = np.ones(mix.shape[1])
    for nombre_s, valor in [('intro', 2.8), ('final', 2.5), ('build', 0.75), ('puente', 0.85)]:
        largo_s = dict(SECCIONES)[nombre_s]
        a_ = int(T(ini[nombre_s]) * SR)
        b_ = min(mix.shape[1], int(T(ini[nombre_s] + largo_s) * SR))
        g[a_:b_] = valor
    g = lp(g, 3)
    mix = mix * g

    # ── Master ──
    mix = hp(mix, 30)
    p99 = np.percentile(np.abs(mix), 99.95) + 1e-9
    mix = mix / p99 * 0.85
    mix = np.tanh(mix * 1.12) / np.tanh(1.12)
    mix /= np.abs(mix).max() + 1e-9

    fin_i = int((total * COMPAS + 2.5) * SR)
    mix = mix[:, :fin_i]
    fade = int(1.8 * SR)
    mix[:, -fade:] *= np.linspace(1, 0, fade)

    return (mix * 0.95).T


if __name__ == '__main__':
    out = os.path.join(RAIZ, 'fuentes', 'beats', 'salida', 'diario')
    os.makedirs(out, exist_ok=True)
    f = os.path.join(out, '2026-10-20-2.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.1f} s')
