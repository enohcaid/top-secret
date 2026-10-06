"""FACHERO — beat de trap del club, compuesto a mano. Segundo tema "en serio", después de Operativo.

Emoción: actitud, rebote, flow de festejo (lo opuesto a la amenaza de Operativo).
Rasgo distintivo: llamada y respuesta entre un lead juguetón (pulso con PWM, grave, desafinado, con
resolución reducida: la nostalgia de videojuego de Pi'erre Bourne, insinuada, no un "chip" explícito) y
chops de voz que contestan en los huecos.

Correcciones aplicadas a partir de la autocrítica de Operativo v3:
  - batería propia del tema (bombo en capas, redoblante con cuerpo, hats metálicos tipo 808, shaker,
    rimshot, toms) en vez del kit de siempre
  - 808 que respira: línea de bajo con saltos de octava y silencios; glide solo hacia el acento
  - menos capas a la vez: Rhodes en lugar de pad constante, cada instrumento en su rango (EQ)
  - groove: swing real en hats, shaker y lead; humanización
  - la melodía se desarrolla: gancho → gancho con contramelodía → beat switch → gancho final con línea nueva
  - recursos variados, cada uno 1-2 veces (silencio + chop, build con filtro, platillo invertido,
    gate rítmico del Rhodes, fill de toms, chop final invertido) — nada de radio ni cinta
  - master suave: el verso queda más bajo que los ganchos

Estructura (50 compases, 150 BPM, fa# menor dórico, medio tiempo):
  intro 4 · gancho A 8 · verso 8 · build 2 · gancho B 8 · beat switch 8 · gancho C 8 · final 4

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/fachero.py
Salida: fuentes/beats/salida/fachero/fachero-v<N>.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch, reverb_ir, con_reverb,  # noqa: E402
                      delay_pingpong, paneo, bitcrush, saturar, ochocientos, vox, clap)

BPM = 150
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.17 * S16                       # las semicorcheas impares llegan un poco tarde
rng = np.random.default_rng(2026)
NOMBRES = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}


def n(nombre):
    return 12 * (int(nombre[-1]) + 1) + NOMBRES[nombre[:-1]]


ESCALA = {6, 8, 9, 11, 1, 3, 4}          # fa# dórico: F# G# A B C# D# E


def tercera_abajo(m):
    """La nota de la escala dos grados abajo (tercera menor o mayor según caiga)."""
    return m - 3 if (m - 3) % 12 in ESCALA else m - 4


def paso(c, s, swing=True):
    """Tiempo (seg) del paso s (semicorchea) del compás c, con swing en las impares."""
    return c * COMPAS + s * S16 + (SWING if swing and s % 2 == 1 else 0)


# ── Armonía (fa# menor dórico: el 6to mayor, D#, le da la luz) ───────────────
RHODES = {'F#m9': ['F#3', 'A3', 'C#4', 'E4', 'G#4'], 'B13': ['A3', 'D#4', 'G#4', 'C#5'],
          'Dmaj9': ['F#3', 'A3', 'C#4', 'E4'], 'C#m7': ['G#3', 'B3', 'C#4', 'E4']}
RAIZ808 = {'F#m9': 'F#1', 'B13': 'B1', 'Dmaj9': 'D2', 'C#m7': 'C#2'}
PROG = ['F#m9', 'B13', 'Dmaj9', 'C#m7']

# Lead del gancho, en semicorcheas: (paso, nota, largo). Llamada (2 compases) y respuesta (2 compases).
LEAD = [
    [(0, 'C#5', 2), (3, 'E5', 1), (4, 'F#5', 2), (7, 'E5', 1), (8, 'C#5', 3), (11, 'B4', 1), (12, 'A4', 2), (14, 'B4', 2)],
    [(0, 'D#5', 3), (3, 'C#5', 1), (4, 'B4', 2), (6, 'G#4', 2), (8, 'A4', 4)],
    [(0, 'A4', 2), (2, 'C#5', 2), (4, 'E5', 3), (7, 'F#5', 1), (8, 'E5', 2), (10, 'C#5', 2), (12, 'A4', 4)],
    [(0, 'G#4', 2), (3, 'B4', 1), (4, 'C#5', 4), (8, 'E5', 2), (10, 'D#5', 2)],
]
# Respuestas de voz en los huecos del lead: (compás de la frase, paso, nota, largo, vocal, bend semitonos)
RESP_VOZ = [(1, 12, 'F#5', 2, 'e', 2), (1, 14, 'E5', 2, 'o', 0), (3, 12, 'C#5', 2, 'a', 3), (3, 14, 'B4', 2, 'e', -2)]
# Línea nueva del gancho C: más aguda y con más espacio (desarrollo, no repetición)
LEAD_C = [
    [(0, 'F#5', 3), (4, 'A5', 2), (7, 'G#5', 1), (8, 'F#5', 4), (14, 'E5', 2)],
    [(0, 'D#5', 4), (6, 'E5', 2), (8, 'F#5', 6)],
    [(0, 'E5', 2), (3, 'F#5', 1), (4, 'A5', 3), (8, 'G#5', 2), (10, 'E5', 2), (12, 'C#5', 4)],
    [(0, 'B4', 3), (4, 'C#5', 2), (8, 'G#4', 4)],
]
SECCIONES = [('intro', 4), ('ganchoA', 8), ('verso', 8), ('build', 2), ('ganchoB', 8), ('switch', 8), ('ganchoC', 8), ('final', 4)]


# ── Instrumentos de este tema ────────────────────────────────────────────────
def rhodes(m, dur, vel=1.0):
    """Piano eléctrico FM: púa que se apaga + campanita del ataque, trémolo estéreo."""
    t = t_arr(dur + 1.0)
    f = hz(m)
    indice = 1.6 * np.exp(-t * 5) + 0.25
    x = np.sin(2 * np.pi * f * t + indice * np.sin(2 * np.pi * f * t))
    x += 0.18 * np.sin(2 * np.pi * f * 14.0 * t) * np.exp(-t * 40) * vel
    x *= env_adsr(len(t), 0.003, 1.2, 0.35, 0.5, dur) * np.exp(-t * 0.7)
    trem = 0.5 + 0.5 * np.sin(2 * np.pi * 4.5 * t)
    return np.stack([x * (0.6 + 0.4 * trem), x * (1 - 0.4 * trem)]) * 0.16 * vel


def lead_juguete(m, dur, desde=None):
    """Pulso con PWM, resolución reducida y filtro: el aire de videojuego sin sonar a 'chip'."""
    t = t_arr(dur + 0.3)
    f = np.full(len(t), hz(m))
    if desde is not None:
        g = min(len(t), int(0.05 * SR))
        f[:g] *= (hz(desde) / hz(m)) ** (1 - np.arange(g) / g)
    f *= 1 + 0.004 * np.sin(2 * np.pi * 5.8 * t) * np.clip((t - 0.15) * 4, 0, 1)
    ph = np.cumsum(f) / SR
    duty = 0.3 + 0.15 * np.sin(2 * np.pi * 0.7 * t)
    x = np.where((ph % 1) < duty, 1.0, -1.0) * 0.7 + saw(hz(m), t, 0.006) * 0.3
    x = lp(x, 3200)
    e = env_adsr(len(t), 0.004, 0.12, 0.55, 0.12, dur)
    return x * e * 0.2


def bombo_capas():
    t = t_arr(0.5)
    sub = np.sin(2 * np.pi * np.cumsum(46 + 14 * np.exp(-t * 20)) / SR) * np.exp(-t * 6)
    punch = np.sin(2 * np.pi * np.cumsum(60 + 140 * np.exp(-t * 60)) / SR) * np.exp(-t * 28)
    click = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 400) * 0.6
    return np.tanh((sub * 0.8 + punch * 0.9 + click) * 1.5)


def redoblante():
    t = t_arr(0.35)
    cuerpo = (np.sin(2 * np.pi * 185 * t) + 0.5 * np.sin(2 * np.pi * 330 * t)) * np.exp(-t * 22)
    ruido = bp(rng.standard_normal(len(t)), 1500, 9000) * np.exp(-t * 13)
    return np.tanh((cuerpo * 0.7 + ruido * 0.9) * 1.4)


def hat_metal(abierto=False):
    """Hi-hat tipo 808: seis ondas cuadradas inarmónicas, no ruido."""
    t = t_arr(0.4 if abierto else 0.08)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
    x = hp(bp(x, 6000, 14000), 7000) * np.exp(-t * (9 if abierto else 55))
    return x * 0.22


def shaker():
    t = t_arr(0.09)
    return hp(rng.standard_normal(len(t)), 5000) * np.minimum(t / 0.012, 1) * np.exp(-t * 45) * 0.18


def rim():
    t = t_arr(0.05)
    return (bp(rng.standard_normal(len(t)), 1500, 2600) * 0.6 + np.sin(2 * np.pi * 820 * t)) * np.exp(-t * 110) * 0.35


def tom(f0):
    t = t_arr(0.45)
    x = np.sin(2 * np.pi * np.cumsum(f0 * (0.75 + 0.25 * np.exp(-t * 12))) / SR) * np.exp(-t * 7)
    return np.tanh((x + bp(rng.standard_normal(len(t)), 300, 2000) * np.exp(-t * 30) * 0.2) * 1.3) * 0.6


def platillo_invertido(dur):
    t = t_arr(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * 1.7 * t)) for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
    x = hp(x + rng.standard_normal(len(t)) * 2, 4000) * np.exp(-t * 2.2)
    x = x[::-1]
    return np.stack([x, np.roll(x, 400)]) * 0.07


def chop_voz(m, dur, vocal, bend=0):
    """Chop de voz con bend de entrada (como un sample de voz cortado y repitcheado)."""
    x = vox(m + bend, dur, vocal, rng) if bend == 0 else None
    if x is None:
        # Arranca 'bend' semitonos corrido y cae a la nota: se arma con dos tramos y se funde
        a = vox(m + bend, dur * 0.25, vocal, rng)
        b = vox(m, dur, vocal, rng)
        f = len(a) // 2
        x = b.copy()
        x[:f] = a[:f] * np.linspace(1, 0, f) + b[:f] * np.linspace(0, 1, f)
    return bitcrush(np.stack([x, x]), 0.2)[0] * 0.8


def barrido_hp(st, t0, dur):
    """Build: el filtro pasa-altos sube durante 'dur' (crossfade entre versiones filtradas)."""
    i0, L = int(t0 * SR), int(dur * SR)
    seg = st[:, i0:i0 + L]
    cortes = [20, 250, 600, 1200, 2400, 4000]
    vers = [seg] + [hp(seg, c, 2) for c in cortes[1:]]
    pos = np.linspace(0, len(vers) - 1, seg.shape[1])
    out = np.zeros_like(seg)
    for k, v in enumerate(vers):
        w = np.clip(1 - np.abs(pos - k), 0, 1)
        out += v * w
    st[:, i0:i0 + L] = out
    return st


# ── Composición ──────────────────────────────────────────────────────────────
def render():
    total = sum(c for _, c in SECCIONES)
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'rhodes', 'lead', 'voz', 'fx']}
    sc = np.zeros(N)
    K, SN, CL, H, HO, SH, RI = bombo_capas(), redoblante(), clap(), hat_metal(), hat_metal(True), shaker(), rim()
    ir = reverb_ir(dur=2.2, brillo=7000, seed=21)
    ir_sala = reverb_ir(dur=0.7, decay=7, brillo=8000, seed=22)
    notas808 = []
    ini = {}
    c0 = 0
    hum = lambda s=0.004: rng.normal(0, s)
    for nombre, largo in SECCIONES:
        ini[nombre] = c0
        for c in range(largo):
            cg = c0 + c
            ac = PROG[c % 4]
            frase = c % 4
            ultimo = c == largo - 1
            gancho = nombre.startswith('gancho')

            # ── Rhodes: acordes con ritmo (no un colchón): golpe en 1 y anticipación en el "y" del 2 ──
            if True:
                notas = [n(x) for x in RHODES[ac]]
                golpes = [(0, 1.0, 6), (6, 0.7, 4), (10, 0.8, 6)] if nombre != 'switch' else [(0, 1.0, 14)]
                if nombre in ('intro', 'final', 'build'):
                    golpes = [(0, 0.9, 16)]
                if nombre == 'intro' and ultimo:
                    golpes = [(0, 0.9, 11)]          # el último tiempo de la intro queda vacío (silencio + chop)
                for s, v, l in golpes:
                    for k, m in enumerate(notas):
                        poner(bus['rhodes'], rhodes(m, l * S16, v * (1 - rng.uniform(0, 0.15))), paso(cg, s) + k * 0.006 + hum())

            # ── Lead: llamada y respuesta en los ganchos A y B; línea nueva en el C; grave en el switch ──
            if nombre in ('ganchoA', 'ganchoB', 'ganchoC', 'switch'):
                fr = LEAD_C if nombre == 'ganchoC' else LEAD
                oct_ = -12 if nombre == 'switch' else 0
                previa = None
                if not (nombre == 'switch' and frase in (2, 3) and c >= 4):          # el switch deja huecos
                    for (s, nota, l) in fr[frase]:
                        m = n(nota) + oct_
                        x = lead_juguete(m, l * S16 * 0.95, previa if previa and abs(previa - m) <= 4 else None)
                        poner(bus['lead'], paneo(x, -0.12), paso(cg, s) + hum(0.003))
                        previa = m
                        # Gancho B: la voz armoniza una tercera abajo las notas largas (contramelodía)
                        if nombre == 'ganchoB' and l >= 3:
                            poner(bus['voz'], paneo(chop_voz(tercera_abajo(m), l * S16, 'o'), 0.4) * 0.5, paso(cg, s))
            # ── Respuestas de voz en los huecos del lead ──
            if nombre in ('ganchoA', 'ganchoB', 'ganchoC'):
                for (fc, s, nota, l, voc, bend) in RESP_VOZ:
                    if fc == frase:
                        m = n(nota) + (12 if nombre == 'ganchoC' else 0)
                        poner(bus['voz'], paneo(chop_voz(m, l * S16, voc, bend), 0.35 * (1 if s % 4 else -1)), paso(cg, s))
            if nombre == 'verso' and frase == 3:
                poner(bus['voz'], paneo(chop_voz(n('C#5'), 3 * S16, 'e', 2), 0.3) * 0.7, paso(cg, 12))
            if nombre == 'intro':
                # Adelanto filtrado de la voz: aparece de a poco
                for s in (8, 11, 14):
                    poner(bus['voz'], paneo(hp(chop_voz(n('F#5'), 2 * S16, 'o', 0), 900), 0.2) * (0.3 + 0.1 * c), paso(cg, s))

            # ── Batería ──
            con_bateria = nombre in ('ganchoA', 'verso', 'ganchoB', 'switch', 'ganchoC')
            if con_bateria:
                if nombre == 'verso':
                    kicks = [0, 10] if frase != 3 else [0, 10, 13]
                elif nombre == 'switch':
                    kicks = [0, 7] if frase % 2 == 0 else [0, 3, 7]
                else:
                    kicks = [0, 6, 10] if frase != 3 else [0, 6, 10, 15]
                for s in kicks:
                    poner(bus['drums'], paneo(K, 0) * 0.95, paso(cg, s, False))
                    poner(sc[None], np.exp(-t_arr(0.2) * 16)[None], paso(cg, s, False))
                # Redoblante en el tercer tiempo (medio tiempo); clap encima en los ganchos B y C
                golpe = paneo(SN, 0.03) * 0.75
                if nombre in ('ganchoB', 'ganchoC'):
                    golpe = golpe + paneo(CL, -0.05) * 0.45
                poner(bus['drums'], golpe, paso(cg, 8, False) + hum(0.002))
                # Hats metálicos con swing: corcheas en el verso, semicorcheas en los ganchos, tresillos en el switch
                if nombre == 'switch':
                    for k in range(12):
                        poner(bus['drums'], paneo(H * (0.8 if k % 3 == 0 else 0.45), 0.3), cg * COMPAS + k * COMPAS / 12 + hum(0.002))
                else:
                    paso_h = 2 if nombre == 'verso' else 1
                    redoble = frase == 3 and nombre != 'verso'
                    for s in range(0, 16, paso_h):
                        if redoble and s >= 12:
                            break
                        acento = [1.0, 0.4, 0.65, 0.4][s % 4]
                        poner(bus['drums'], paneo(H * acento * (1 - rng.uniform(0, 0.2)), 0.3), paso(cg, s) + hum(0.002))
                    if redoble:
                        tipo = (c // 4) % 2
                        sub = 6 if tipo == 0 else 8                # tresillos o fusas, alternando por frase
                        for j in range(sub):
                            r = 1 + j * (0.05 if tipo == 0 else -0.03)   # sube o baja
                            poner(bus['drums'], paneo(repitch(H, r) * (0.45 + 0.5 * j / sub), 0.3), cg * COMPAS + 12 * S16 + j * BEAT / sub)
                    # Hat abierto a contratiempo cortado por el siguiente
                    if frase in (1, 3) and nombre != 'verso':
                        ho = HO[:int(2 * S16 * SR)].copy()
                        ho[-300:] *= np.linspace(1, 0, 300)
                        poner(bus['drums'], paneo(ho, -0.25) * 0.8, paso(cg, 6))
                # Shaker y rimshot: el rebote del verso y los ganchos
                if nombre != 'switch':
                    for s in range(2, 16, 4):
                        poner(bus['drums'], paneo(SH, -0.45), paso(cg, s))
                    if nombre == 'verso' or frase == 2:
                        poner(bus['drums'], paneo(RI, 0.4) * 0.6, paso(cg, 11))
                # Fill de toms al final del beat switch
                if nombre == 'switch' and ultimo:
                    for j, (f0, s) in enumerate([(150, 8), (150, 10), (115, 11), (115, 12), (88, 13), (88, 14), (70, 15)]):
                        poner(bus['drums'], paneo(tom(f0), -0.4 + 0.12 * j), paso(cg, s, False))

            # ── 808: línea de bajo con espacio ──
            if nombre in ('ganchoA', 'verso', 'ganchoB', 'switch', 'ganchoC'):
                r = n(RAIZ808[ac])
                if nombre == 'verso':
                    patron = [(0, 0, 3), (10, 0, 3)] if frase != 3 else [(0, 0, 3), (10, 0, 2), (13, 12, 2)]
                elif nombre == 'switch':
                    patron = [(0, 0, 14)] if frase % 2 == 0 else [(0, 0, 6), (7, 12, 6)]
                else:
                    patron = [(0, 0, 3), (3, 0, 2), (6, 12, 2), (10, 0, 4)]
                    if frase == 3:
                        patron = patron[:3] + [(10, 0, 3), (14, 7, 2)]     # nota de paso hacia el compás siguiente
                for s, intervalo, l in patron:
                    glide = 0.11 if (s == 0 and frase == 0 and c > 0) or (nombre == 'switch' and s == 7) else 0
                    notas808.append((paso(cg, s, False), r + intervalo, l * S16, glide))
        c0 += largo

    T = lambda comp: comp * COMPAS
    # ── Momentos (cada recurso una o dos veces) ──
    # 1) Silencio + chop antes del gancho A: el último tiempo de la intro queda vacío salvo la voz
    poner(bus['voz'], paneo(chop_voz(n('F#5'), 3 * S16, 'e', 3), 0) * 0.9, T(ini['ganchoA']) - BEAT * 0.75)
    # 2) Platillo invertido hacia el gancho B y hacia el gancho C
    for g in ('ganchoB', 'ganchoC'):
        pc = platillo_invertido(BEAT * 4)
        poner(bus['fx'], pc, T(ini[g]) - pc.shape[1] / SR)
    # 3) Build: redoble de redoblante que acelera (corcheas → semicorcheas → fusas) y sube de tono
    b0 = ini['build']
    tiempos = [b0 * COMPAS + k * BEAT / 2 for k in range(4)] + [b0 * COMPAS + 2 * BEAT + k * S16 for k in range(8)] + \
              [(b0 + 1) * COMPAS + k * S16 / 2 for k in range(24)]
    for j, tt in enumerate(tiempos):
        if tt < T(b0 + 2) - BEAT * 0.5:
            poner(bus['drums'], paneo(repitch(SN, 1 + j * 0.012), 0) * (0.3 + 0.6 * j / len(tiempos)), tt)
    # 4) Chop final invertido
    fin = paneo(chop_voz(n('F#5'), BEAT * 2, 'o', 0)[::-1], 0) * 0.8
    poner(bus['voz'], fin, T(ini['final'] + 3) + BEAT)

    if notas808:
        b = ochocientos(notas808, N / SR, 2.4)
        bus['bajo'] += paneo(lp(b, 4500), 0)

    # ── Mezcla: cada cosa en su rango; sidechain del bombo al 808 y al Rhodes ──
    duck = 1 - np.clip(sc, 0, 1)
    rh = hp(lp(bus['rhodes'], 6500), 170)
    # 5) Gate rítmico del Rhodes en un compás del switch (único momento)
    gc = ini['switch'] + 3
    i0, L = int(T(gc) * SR), int(COMPAS * SR)
    patron_gate = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0]
    gate = np.repeat(patron_gate, L // 16 + 1)[:L].astype(float)
    gate = lp(gate, 120)
    rh[:, i0:i0 + L] *= gate
    rh = con_reverb(rh * (1 - 0.35 * np.clip(sc, 0, 1)), ir, 0.22)
    lead = hp(bus['lead'], 230)
    lead = bitcrush(lead, 0.3)
    lead = lp(lead, 7500)
    lead = con_reverb(delay_pingpong(saturar(lead, 0.35), BEAT * 0.75, 0.32, 0.22), ir, 0.2)
    voz = con_reverb(delay_pingpong(hp(bus['voz'], 280), BEAT / 2, 0.3, 0.18), ir, 0.3)
    drums = con_reverb(saturar(bus['drums'], 0.15), ir_sala, 0.08)
    bajo = bus['bajo'] * (1 - 0.3 * np.clip(sc, 0, 1))
    mix = drums * 1.0 + bajo * 0.85 + rh * 0.9 + lead * 1.0 + voz * 0.9 + bus['fx']
    # Build: todo pasa por un filtro que sube; el último medio tiempo, silencio
    mix = barrido_hp(mix, T(ini['build']), COMPAS * 2 - BEAT * 0.5)
    s0 = int((T(ini['build'] + 2) - BEAT * 0.5) * SR)
    mix[:, s0:int(T(ini['build'] + 2) * SR)] *= 0.05
    # Ganancia por sección: la intro y el final son solo Rhodes y voz (se subían poco: -29 LUFS);
    # el build queda un poco abajo para que el gancho B pegue
    g = np.ones(mix.shape[1])
    for nombre, valor in (('intro', 3.4), ('final', 3.0), ('build', 0.7)):
        largo = dict(SECCIONES)[nombre]
        a_, b_ = int(T(ini[nombre]) * SR), min(mix.shape[1], int(T(ini[nombre] + largo) * SR))
        g[a_:b_] = valor
    g = lp(g, 3)                                      # transiciones suaves entre secciones
    mix = mix * g
    mix = hp(mix, 28)
    # Normalizar por el percentil 99.95 y no por el pico: un ataque aislado (Rhodes de la intro) no
    # baja todo el tema; la saturación suave redondea esos pocos picos
    mix = mix / (np.percentile(np.abs(mix), 99.95) + 1e-9) * 0.85
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)          # master más suave que en Operativo
    mix /= np.abs(mix).max() + 1e-9
    fin_i = int((total * COMPAS + 2.0) * SR)
    mix = mix[:, :fin_i]
    mix[:, -int(1.5 * SR):] *= np.linspace(1, 0, int(1.5 * SR))
    return (mix * 0.95).T


if __name__ == '__main__':
    out = os.path.join(RAIZ, 'fuentes', 'beats', 'salida', 'fachero')
    os.makedirs(out, exist_ok=True)
    v = 1 + len([f for f in os.listdir(out) if f.endswith('.wav')])
    f = os.path.join(out, f'fachero-v{v}.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.0f} s')
