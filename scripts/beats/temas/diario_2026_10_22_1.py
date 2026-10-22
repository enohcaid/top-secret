"""BARRO — beat de trap del club, compuesto a mano.

Concepto: El laburo invisible — los entrenamientos repetitivos, las mañanas heladas,
los partidos donde nada sale; todos quieren la gloria pero la pelea real es en el barro,
donde el cuerpo pide parar y vos seguís; sección a sección el peso se levanta hasta que
lo que era sufrimiento se convierte en fuerza.

Emoción por sección:
  intro (4c):    pesadez, oscuridad, el entrenamiento a las 6am — solo barro y pad
  gancho A (8c): el laburo: golpes mecánicos, repetitivos; el lead es corto y obstinado
  verso (6c):    el cansancio: solo quedan piano y barro, el cuerpo no da más
  build (2c):    la tensión acumulada que no se puede contener
  gancho B (8c): la voluntad se impone — contramelodía responde, hats más abiertos
  puente (4c):   el punto más bajo: tresillos pesados, el cuerpo rompiéndose
  gancho C (8c): la transformación: todo lo que pesaba es impulso, lead alto y abierto
  final (4c):    calma después del esfuerzo; el barro se secó

Rasgo distintivo: "arrastre de barro" — golpe de ruido con barrido de pitch descendente
(bota que se hunde en el barro); arranca pesado y largo (0.5 s), se acorta sección a
sección, y en el gancho C es un chasquido seco y percusivo — el barro se endureció.

Estructura: intro 4 · gancho A 8 · verso 6 · build 2 · gancho B 8 · puente 4 · gancho C 8 · final 4
  = 44 compases, 108 BPM, si menor → ~100 s

Recursos: arrastre de barro con pitch descendente (firma del tema), pad oscuro de sines
detuneadas, lead crudo con overdrive variable (pesado→limpio), piano pesado (verso),
808 melódico con saltos de octava y glide, platillo invertido en las transiciones

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/diario_2026_10_22_1.py
Salida: fuentes/beats/salida/diario/2026-10-22-1.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, env_adsr, poner, repitch,  # noqa: E402
                      reverb_ir, con_reverb, delay_pingpong, paneo, saturar, ochocientos, clap)

BPM = 108
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.14 * S16
rng = np.random.default_rng(20261022)
NOM = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
       'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOM[nombre[:-1]]


def paso(c, s, swing=True):
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


# ── Armonía: Bm → Em → G → F#m  (i → iv → VI → v, si menor natural) ────────
ACORDES = {
    'Bm':  ['B2', 'D3', 'F#3', 'A3'],       # Bm7
    'Em':  ['E3', 'G3', 'B3', 'D4'],         # Em7
    'G':   ['G3', 'B3', 'D4', 'F#4'],        # Gmaj7
    'F#m': ['F#3', 'A3', 'C#4', 'E4'],       # F#m7
}
RAIZ_808 = {'Bm': 'B1', 'Em': 'E2', 'G': 'G1', 'F#m': 'F#1'}
PROG = ['Bm', 'Em', 'G', 'F#m']

SECCIONES = [
    ('intro', 4), ('ganchoA', 8), ('verso', 6), ('build', 2),
    ('ganchoB', 8), ('puente', 4), ('ganchoC', 8), ('final', 4),
]

# ── Melodías escritas a mano ────────────────────────────────────────────────
# Gancho A: corto, percutido, obstinado (la monotonía del entrenamiento)
LEAD_A = [
    [(0, 'B4', 2), (4, 'D5', 2), (8, 'B4', 3), (12, 'C#5', 1), (14, 'B4', 2)],
    [(0, 'D5', 2), (4, 'C#5', 2), (8, 'B4', 4)],
    [(0, 'F#4', 3), (4, 'A4', 2), (8, 'B4', 2), (12, 'A4', 4)],
    [(2, 'G4', 2), (6, 'F#4', 2), (8, 'B4', 6)],
]
# Gancho B: el mismo lead con la variación de la 2da mitad
LEAD_B = [
    [(0, 'B4', 2), (4, 'D5', 2), (8, 'C#5', 3), (12, 'D5', 1), (14, 'B4', 2)],
    [(0, 'E5', 2), (4, 'D5', 2), (8, 'B4', 4)],
    [(0, 'F#4', 3), (4, 'A4', 2), (8, 'B4', 3), (12, 'D5', 4)],
    [(2, 'C#5', 2), (6, 'A4', 2), (8, 'B4', 6)],
]
# Contramelodía del gancho B: responde en los huecos, registro medio-bajo
CONTRA_B = [
    [(10, 'D4', 3), (14, 'E4', 2)],
    [(10, 'F#4', 4)],
    [(10, 'E4', 3), (14, 'D4', 2)],
    [(10, 'C#4', 4)],
]
# Gancho C: más alto, más libre — la transformación
LEAD_C = [
    [(0, 'F#5', 3), (4, 'G5', 2), (8, 'A5', 4), (14, 'F#5', 2)],
    [(0, 'E5', 3), (4, 'D5', 2), (8, 'F#5', 4)],
    [(0, 'B4', 2), (4, 'D5', 2), (8, 'F#5', 3), (12, 'A5', 4)],
    [(0, 'G5', 3), (4, 'F#5', 2), (8, 'E5', 2), (12, 'F#5', 4)],
]


# ── Instrumentos del tema ───────────────────────────────────────────────────
def barro_drag(dur, peso=1.0):
    """Arrastre de barro: ruido + sine con pitch descendente (bota hundiéndose).
    dur = largo (0.5 pesado → 0.06 chasquido); peso = volumen/presencia."""
    t = t_arr(max(dur, 0.04) + 0.02)
    decay = 4.5 / max(dur, 0.04)
    # Sine que baja de 280 a 55 Hz (el squelch)
    f_sweep = 280 * np.exp(-t * decay) + 55
    carrier = np.sin(2 * np.pi * np.cumsum(f_sweep) / SR)
    # Ruido filtrado para textura
    ruido = lp(rng.standard_normal(len(t)), 550) * 0.35
    x = carrier * 0.65 + ruido
    x = lp(x, 450 + 250 * (1 - peso))
    e = np.exp(-t * (3.5 / max(dur, 0.04))) * peso
    x = np.tanh(x * 2.2) * 0.5
    return x * e * 0.38


def pad_oscuro(notas_midi, dur, brillo=700):
    """Pad oscuro: sines detuneadas, bajo y denso — el frío del amanecer."""
    t = t_arr(dur + 1.5)
    out = np.zeros((2, len(t)))
    for m in notas_midi:
        f = hz(m)
        for v in range(3):
            det = (v - 1) * 0.0035
            x = np.sin(2 * np.pi * f * (1 + det) * t)
            out += paneo(x, (v - 1) * 0.55) / (3 * max(len(notas_midi), 1))
    e = env_adsr(len(t), 0.55, 0.7, 0.7, 1.2, dur)
    return lp(out, brillo) * e * 0.13


def piano_pesado(m, dur=2.0):
    """Piano pesado: oscuro, con golpe de martillo amortiguado."""
    t = t_arr(dur + 0.3)
    f = hz(m)
    x = sum(np.sin(2 * np.pi * f * h * t * (1 + 0.0003 * h * h)) *
            np.exp(-t * (0.85 + h * 0.65)) / h for h in range(1, 8))
    x += 0.18 * rng.standard_normal(len(t)) * np.exp(-t * 130)
    x = lp(x, 2100)
    return x * env_adsr(len(t), 0.006, 0.25, 0.4, 0.35, dur) * 0.35


def lead_crudo(m, dur, peso=1.0, desde=None):
    """Lead crudo: saw con overdrive variable. peso=1 pesado, peso=0.3 limpio."""
    t = t_arr(dur + 0.3)
    f = np.full(len(t), float(hz(m)))
    if desde is not None:
        g = min(len(t), int(0.06 * SR))
        f[:g] *= (hz(desde) / hz(m)) ** (1 - np.arange(g) / g)
    f *= 1 + 0.005 * np.sin(2 * np.pi * 4.5 * t) * np.clip((t - 0.12) * 5, 0, 1)
    ph = np.cumsum(f) / SR
    x = 2 * (ph - np.floor(ph + 0.5))
    x += 0.25 * np.sin(2 * np.pi * hz(m) * 0.5 * t) * peso  # sub-octava
    drive = 1.5 + peso * 1.5
    x = np.tanh(x * drive) / np.tanh(drive)
    x = lp(x, 2200 + 900 * (1 - peso))
    return x * env_adsr(len(t), 0.008 + 0.012 * peso, 0.15, 0.55, 0.12, dur) * 0.2


def bombo_pesado():
    """Bombo con más sub y ataque más lento — como golpear en el barro."""
    t = t_arr(0.55)
    sub = np.sin(2 * np.pi * np.cumsum(42 + 12 * np.exp(-t * 16)) / SR) * np.exp(-t * 5)
    punch = np.sin(2 * np.pi * np.cumsum(55 + 120 * np.exp(-t * 50)) / SR) * np.exp(-t * 22)
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 350) * 0.35
    return np.tanh((sub * 0.9 + punch * 0.8 + click) * 1.4)


def redoblante_grueso():
    """Redoblante con cuerpo: golpe amortiguado, menos brillo."""
    t = t_arr(0.4)
    cuerpo = (np.sin(2 * np.pi * 170 * t) + 0.55 * np.sin(2 * np.pi * 280 * t)) * np.exp(-t * 18)
    ruido = bp(rng.standard_normal(len(t)), 1200, 7000) * np.exp(-t * 11)
    return np.tanh((cuerpo * 0.8 + ruido * 0.7) * 1.3)


def hat_sucio(brillo=10000):
    """Hi-hat tipo 808 con LP variable: arranca oscuro, se abre con el tema."""
    t = t_arr(0.07)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
    return hp(bp(x, 5500, min(brillo, SR * 0.45)), 6000) * np.exp(-t * 52) * 0.19


def hat_abierto(brillo=10000):
    t = t_arr(0.32)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
    return hp(bp(x, 5500, min(brillo, SR * 0.45)), 6000) * np.exp(-t * 9) * 0.19


def platillo_invertido(dur):
    t = t_arr(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * 1.7 * t)) for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
    x = hp(x + rng.standard_normal(len(t)) * 2, 4000) * np.exp(-t * 2.2)
    x = x[::-1]
    return np.stack([x, np.roll(x, 400)]) * 0.065


# ── Composición ─────────────────────────────────────────────────────────────
def render():
    total = sum(c for _, c in SECCIONES)
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'pad', 'lead', 'piano', 'barro', 'fx']}
    sc = np.zeros(N)
    K = bombo_pesado()
    SN = redoblante_grueso()
    CL = clap(seed=1022)
    ir = reverb_ir(dur=2.6, brillo=5000, seed=42)
    ir_sala = reverb_ir(dur=0.7, decay=7, brillo=6500, seed=43)
    ir_barro = reverb_ir(dur=1.8, brillo=3500, seed=44)
    notas808 = []
    hum = lambda s=0.004: rng.normal(0, s)
    vel = lambda: 1 - rng.uniform(0, 0.18)

    # Brillo de hats por sección (la apertura progresiva)
    H_BRILLO = {'intro': 8000, 'ganchoA': 9000, 'verso': 8500, 'build': 9000,
                'ganchoB': 11000, 'puente': 9000, 'ganchoC': 14000, 'final': 10000}
    # Duración y peso del arrastre de barro (la evolución central del tema)
    B_DUR = {'intro': 0.50, 'ganchoA': 0.35, 'verso': 0.25, 'build': 0.20,
             'ganchoB': 0.15, 'puente': 0.10, 'ganchoC': 0.06, 'final': 0.06}
    B_PESO = {'intro': 1.0, 'ganchoA': 0.85, 'verso': 0.65, 'build': 0.55,
              'ganchoB': 0.45, 'puente': 0.35, 'ganchoC': 0.28, 'final': 0.18}
    # Peso del lead (overdrive) — pesado al principio, limpio al final
    L_PESO = {'ganchoA': 1.0, 'ganchoB': 0.65, 'ganchoC': 0.3}
    # Reverb del barro: mojado al principio, seco al final
    B_REV = {'intro': 0.55, 'ganchoA': 0.40, 'verso': 0.30, 'build': 0.20,
             'ganchoB': 0.15, 'puente': 0.10, 'ganchoC': 0.05, 'final': 0.08}

    # Pre-compute hats per section brightness
    HATS = {nb: hat_sucio(H_BRILLO[nb]) for nb, _ in SECCIONES}
    HATS_O = {nb: hat_abierto(H_BRILLO[nb]) for nb, _ in SECCIONES}

    ini = {}
    c0 = 0
    for nombre, largo in SECCIONES:
        ini[nombre] = c0
        H = HATS[nombre]
        HO = HATS_O[nombre]
        for c in range(largo):
            cg = c0 + c
            frase = c % 4
            ac = PROG[frase]
            ultimo = c == largo - 1
            t_c = cg * COMPAS
            mitad2 = c >= 4

            # ── Pad oscuro: todas las secciones, brillo variable ──
            notas = [n(x) for x in ACORDES[ac]]
            brillo_p = 600 if nombre in ('intro', 'verso', 'final') else 900 if nombre == 'puente' else 1100
            vol_p = 0.7 if nombre == 'verso' else (0.6 if nombre == 'final' else 1.0)
            poner(bus['pad'], pad_oscuro(notas, COMPAS, brillo_p) * vol_p, t_c)

            # ── Arrastre de barro (firma del tema) ──
            dur_b = B_DUR[nombre]
            peso_b = B_PESO[nombre]
            if nombre in ('intro', 'final'):
                for s in [0, 8]:
                    if nombre == 'final' and c >= 3 and s == 8:
                        continue
                    b = barro_drag(dur_b, peso_b * (1 - c * 0.15 if nombre == 'final' else 1))
                    poner(bus['barro'], paneo(b, rng.uniform(-0.2, 0.2)), paso(cg, s, False) + hum())
            elif nombre == 'puente':
                for k in range(6):
                    b = barro_drag(dur_b, peso_b * (0.6 + 0.4 * (k % 2)))
                    poner(bus['barro'], paneo(b, 0.3 * np.sin(k)),
                          cg * COMPAS + k * COMPAS / 6 + hum())
            elif nombre == 'ganchoC':
                for s in range(0, 16, 2):
                    if rng.random() < 0.18:
                        continue
                    b = barro_drag(dur_b, peso_b * (1.0 if s % 4 == 0 else 0.55))
                    poner(bus['barro'], paneo(b, 0.3 * np.sin(s * 0.7)), paso(cg, s) + hum(0.002))
            else:
                for s in [0, 4, 8, 12]:
                    b = barro_drag(dur_b, peso_b)
                    poner(bus['barro'], paneo(b, rng.uniform(-0.15, 0.15)),
                          paso(cg, s, False) + hum())

            # ── Lead ──
            if nombre in ('ganchoA', 'ganchoB', 'ganchoC'):
                if nombre == 'ganchoC':
                    fr = LEAD_C[frase]
                elif nombre == 'ganchoB':
                    fr = LEAD_B[frase] if mitad2 else LEAD_A[frase]
                else:
                    fr = LEAD_A[frase]
                peso_l = L_PESO[nombre]
                previa = None
                for (s, nta, l) in fr:
                    m = n(nta)
                    x = lead_crudo(m, l * S16 * 0.9, peso_l,
                                   previa if previa and abs(previa - m) <= 4 else None)
                    poner(bus['lead'], paneo(x, -0.1), paso(cg, s) + hum(0.003))
                    previa = m
                # Contramelodía en gancho B
                if nombre == 'ganchoB':
                    for (s, nta, l) in CONTRA_B[frase]:
                        m = n(nta)
                        x = lead_crudo(m, l * S16 * 0.8, 0.35)
                        poner(bus['lead'], paneo(x, 0.35), paso(cg, s) + hum(0.003))

            # Intro: adelanto filtrado del lead en los últimos 2 compases
            if nombre == 'intro' and c >= 2:
                hints = LEAD_A[c - 2][:2]
                for (s, nta, l) in hints:
                    x = lp(lead_crudo(n(nta), l * S16 * 0.9, 0.5), 1400) * 0.15
                    poner(bus['lead'], paneo(x, 0), paso(cg, s))

            # ── Piano en el verso: notas sueltas, pesadas ──
            if nombre == 'verso':
                root = n(ACORDES[ac][0])
                quinto = n(ACORDES[ac][2])
                if c in (0, 2, 4):
                    poner(bus['piano'], paneo(piano_pesado(root, COMPAS * 0.8), -0.12),
                          paso(cg, 0, False) + hum())
                if c == 3:
                    poner(bus['piano'], paneo(piano_pesado(quinto, BEAT * 2.5), 0.15),
                          paso(cg, 4, False) + hum())

            # ── Batería ──
            con_bat = nombre in ('ganchoA', 'verso', 'ganchoB', 'puente', 'ganchoC')
            if con_bat:
                # Kick
                if nombre == 'puente':
                    for k in range(4):
                        if k == 2 and frase % 2 == 0:
                            continue
                        t_k = cg * COMPAS + k * BEAT
                        poner(bus['drums'], paneo(K, 0) * 0.9, t_k + hum(0.002))
                        poner(sc[None], np.exp(-t_arr(0.25) * 14)[None], t_k)
                else:
                    if nombre == 'verso':
                        kicks = [0, 10] if frase != 3 else [0, 8, 13]
                    elif frase == 3:
                        kicks = [0, 6, 10, 14]
                    else:
                        kicks = [0, 6, 10]
                    for s in kicks:
                        poner(bus['drums'], paneo(K, 0) * 0.92, paso(cg, s, False) + hum(0.002))
                        poner(sc[None], np.exp(-t_arr(0.25) * 14)[None], paso(cg, s, False))

                # Redoblante: tercer tiempo
                if nombre != 'puente':
                    sn = paneo(SN, 0.03) * 0.7
                    if nombre in ('ganchoB', 'ganchoC'):
                        cl = paneo(CL, -0.05) * 0.3
                        cl = np.pad(cl, ((0, 0), (0, max(0, sn.shape[1] - cl.shape[1]))))
                        sn = sn + cl[:, :sn.shape[1]]
                    if nombre == 'verso' and frase % 2 == 0:
                        pass  # solo en compases impares del verso
                    else:
                        poner(bus['drums'], sn, paso(cg, 8, False) + hum(0.002))
                else:
                    # Puente: redoblante cada 2 tiempos
                    if frase % 2 == 1:
                        poner(bus['drums'], paneo(SN, 0.03) * 0.6,
                              paso(cg, 8, False) + hum(0.002))

                # Hi-hats
                if nombre == 'puente':
                    for k in range(12):
                        poner(bus['drums'], paneo(H * (0.65 if k % 3 == 0 else 0.3), 0.3),
                              cg * COMPAS + k * COMPAS / 12 + hum(0.002))
                else:
                    paso_h = 2 if nombre == 'verso' else 1
                    redo = frase == 3 and nombre != 'verso'
                    for s in range(0, 16, paso_h):
                        if redo and s >= 12:
                            break
                        ac_h = [1.0, 0.35, 0.6, 0.35][s % 4]
                        poner(bus['drums'], paneo(H * ac_h * vel(), 0.3),
                              paso(cg, s) + hum(0.002))
                    if redo:
                        sub = 6 if (c // 4) % 2 == 0 else 8
                        for j in range(sub):
                            poner(bus['drums'],
                                  paneo(repitch(H, 1 + j * 0.05) * (0.35 + 0.5 * j / sub), 0.3),
                                  cg * COMPAS + 12 * S16 + j * BEAT / sub)
                    # Hat abierto a contratiempo en ganchos
                    if frase in (1, 3) and nombre not in ('verso', 'puente'):
                        ho = HO[:min(len(HO), int(2 * S16 * SR))].copy()
                        if len(ho) > 250:
                            ho[-250:] *= np.linspace(1, 0, 250)
                        poner(bus['drums'], paneo(ho, -0.25) * 0.65, paso(cg, 6))

            # ── 808 ──
            if nombre in ('ganchoA', 'verso', 'ganchoB', 'puente', 'ganchoC'):
                r808 = n(RAIZ_808[ac])
                if nombre == 'verso':
                    bp808 = [(0, 0, 6), (10, 0, 4)]
                elif nombre == 'puente':
                    bp808 = [(0, 0, 14)] if frase % 2 == 0 else [(0, 0, 7), (8, 12, 7)]
                elif frase == 3:
                    bp808 = [(0, 0, 5), (6, 12, 3), (10, 0, 3), (14, 7, 2)]
                else:
                    bp808 = [(0, 0, 5), (6, 12, 3), (10, 0, 5)]
                for s, iv, l in bp808:
                    gl = 0.12 if (s == 0 and frase == 0 and c > 0) or (nombre == 'puente' and s == 8) else 0
                    notas808.append((paso(cg, s, False), r808 + iv, l * S16, gl))

        c0 += largo

    T = lambda comp: comp * COMPAS

    # ── Platillo invertido antes de ganchos B y C ──
    for sec in ('ganchoB', 'ganchoC'):
        pc = platillo_invertido(BEAT * 4)
        poner(bus['fx'], pc, T(ini[sec]) - pc.shape[1] / SR)

    # ── Build: redoble que acelera ──
    b0 = ini['build']
    tiempos = ([b0 * COMPAS + k * BEAT / 2 for k in range(4)] +
               [b0 * COMPAS + 2 * BEAT + k * S16 for k in range(8)] +
               [(b0 + 1) * COMPAS + k * S16 / 2 for k in range(24)])
    for j, tt in enumerate(tiempos):
        if tt < T(b0 + 2) - BEAT * 0.5:
            poner(bus['drums'], paneo(repitch(SN, 1 + j * 0.01), 0) * (0.22 + 0.5 * j / len(tiempos)), tt)
    # Silencio en el último medio tiempo
    sil_a = int((T(b0 + 2) - BEAT * 0.4) * SR)
    sil_b = min(int(T(b0 + 2) * SR), N)

    # ── Render 808 ──
    if notas808:
        bus['bajo'] += paneo(lp(ochocientos(notas808, N / SR, 2.4), 3500), 0) * 0.85

    # ── Mezcla ──
    # Barro: reverb variable por sección
    barro_rev = np.zeros((2, N))
    for nombre, largo in SECCIONES:
        i0 = int(T(ini[nombre]) * SR)
        i1 = min(N, int(T(ini[nombre] + largo) * SR))
        if i1 <= i0:
            continue
        seg = bus['barro'][:, i0:i1]
        seg_r = con_reverb(seg, ir_barro, B_REV[nombre])
        barro_rev[:, i0:i1] = seg_r

    pad_m = con_reverb(lp(hp(bus['pad'], 75), 2400), ir, 0.3)
    lead_m = con_reverb(delay_pingpong(saturar(hp(bus['lead'], 200), 0.2),
                                       BEAT * 0.75, 0.28, 0.18), ir, 0.2)
    piano_m = con_reverb(hp(bus['piano'], 140), ir, 0.3)
    drums_m = con_reverb(saturar(bus['drums'], 0.12), ir_sala, 0.07)
    bajo_m = bus['bajo'] * (1 - np.clip(sc, 0, 1) * 0.25)
    duck = 1 - np.clip(sc, 0, 1) * 0.4
    mix = drums_m * 1.0 + bajo_m * 0.9 + (pad_m + lead_m + piano_m) * duck + barro_rev * 1.1 + bus['fx'] * 0.55

    # Silencio del build aplicado a la mezcla
    mix[:, sil_a:sil_b] *= 0.04

    # ── Ganancia por sección ──
    g = np.ones(mix.shape[1])
    for ns, val in [('intro', 5.0), ('final', 4.5), ('build', 0.65), ('verso', 0.82)]:
        ls = dict(SECCIONES)[ns]
        a, b = int(T(ini[ns]) * SR), min(mix.shape[1], int(T(ini[ns] + ls) * SR))
        g[a:b] = val
    g = lp(g, 3)
    mix *= g

    # Build HP sweep
    b_start = T(ini['build'])
    b_end = T(ini['build'] + 2)
    i0_b, i1_b = int(b_start * SR), min(int(b_end * SR), mix.shape[1])
    L = i1_b - i0_b
    if L > 0:
        seg = mix[:, i0_b:i1_b].copy()
        cortes_hp = [20, 250, 600, 1200, 2400]
        vers = [seg] + [hp(seg, c, 2) for c in cortes_hp[1:]]
        pos_arr = np.linspace(0, len(vers) - 1, L)
        out_b = np.zeros_like(seg)
        for k, v in enumerate(vers):
            w = np.clip(1 - np.abs(pos_arr - k), 0, 1)
            out_b += v * w
        mix[:, i0_b:i1_b] = out_b

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
    path = os.path.join(out, '2026-10-22-1.wav')
    audio = render()
    sf.write(path, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(path, RAIZ)}  {audio.shape[0] / SR:.1f} s')
