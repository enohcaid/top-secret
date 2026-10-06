"""OPERATIVO — beat de trap del club, compuesto a mano (no por semilla) sobre el motor de componer.py.

Concepto: espionaje. Top Secret = una misión nocturna. Lo que tiene que transmitir: tensión con actitud.
Rasgo distintivo: el acorde de las películas de espías (menor con séptima mayor) y su línea cromática
interna 5 - #5 - 6 - #5 como gancho, más una firma en código Morse "T S" (— · · ·) que NO suena como
pitido: es el ritmo con el que se corta el propio acorde, bajado de octava y saturado (v2, pedido de
Juan: insinuar en vez de ser explícito — pitchear, invertir, cortar, distorsionar).

Narrativa (52 compases, 142 BPM, mi menor, medio tiempo):
  intro   8  transmisión interceptada: todo por "radio" (banda angosta, bitcrush), textura granular
             hecha del pad, notas "rebobinadas" (invertidas y frenando), firma Morse; en los compases 7-8
             el filtro se abre y sube un riser
  verso   8  entra el operativo: 808 distorsionado, batería contenida (hats en corcheas, después semicorcheas)
  gancho 16  melodía de vidrio (llamada y respuesta), golpe de metales grave al entrar, hats en semicorcheas
             con acentos y redobles al cierre de cada frase, cambio a tresillos en la segunda mitad,
             cuerdas fantasma doblando la melodía en los últimos 8
  puente  8  estilo John Carpenter: bajo pulsante en corcheas, batería filtrada, sin 808, cuerdas
  gancho2 8  arranca con la llamada a media velocidad (cinta lenta, octava abajo); un único stutter al final
  final   4  la transmisión se cierra: vuelve a la radio, Morse y estática

Influencias investigadas (2026-10-06): Metro Boomin (bandas de sonido, espacio, emoción concreta),
Southside (808 con distorsión y reverb), John Carpenter / Tangerine Dream (terror electrónico),
hi-hat abierto a contratiempo cortado por el cerrado, glides del 808 solo hacia un acento.

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/temas/operativo.py
Salida: fuentes/beats/salida/operativo/operativo-v<N>.wav
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, RAIZ, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch, reverb_ir, con_reverb,  # noqa: E402
                      delay_pingpong, paneo, cinta, bitcrush, saturar, stutter, bombo, clap, hat, ochocientos, pad)

BPM = 142
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
rng = np.random.default_rng(1985)

NOMBRES = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}


def n(nombre):
    """'E5' → midi."""
    return 12 * (int(nombre[-1]) + 1) + NOMBRES[nombre[:-1]]


# ── Armonía ──────────────────────────────────────────────────────────────────
ACORDES = {
    'EmM9': ['E3', 'G3', 'B3', 'D#4', 'F#4'],   # el acorde espía
    'Cmaj7': ['C3', 'E3', 'G3', 'B3'],
    'Am9': ['A2', 'C3', 'E3', 'G3', 'B3'],
    'B7b9': ['B2', 'D#3', 'A3', 'C4'],
}
RAIZ808 = {'EmM9': 'E1', 'Cmaj7': 'C2', 'Am9': 'A1', 'B7b9': 'B1'}
# Línea cromática interna (5, #5, 6, #5) sobre la raíz de cada acorde, en negras
LINEA = {'EmM9': ['B4', 'C5', 'C#5', 'C5'], 'Cmaj7': ['G4', 'G#4', 'A4', 'G#4'],
         'Am9': ['E4', 'F4', 'F#4', 'F4'], 'B7b9': ['F#4', 'G4', 'G#4', 'G4']}

SECCIONES = [('intro', 8), ('verso', 8), ('gancho', 16), ('puente', 8), ('gancho2', 8), ('final', 4)]
PROG = {
    'intro': ['EmM9', 'EmM9', 'Cmaj7', 'B7b9'], 'verso': ['EmM9', 'EmM9', 'Cmaj7', 'B7b9'],
    'gancho': ['EmM9', 'Cmaj7', 'Am9', 'B7b9'], 'puente': ['EmM9', 'EmM9', 'Cmaj7', 'B7b9'],
    'gancho2': ['EmM9', 'Cmaj7', 'Am9', 'B7b9'], 'final': ['EmM9'],
}
# Melodía del gancho en corcheas: llamada (2 compases) + respuesta (2 compases). (paso, nota, largo)
LLAMADA = [(0, 'E5', 2), (2, 'D#5', 1), (3, 'B4', 1), (4, 'C5', 3), (7, 'B4', 1),
           (8, 'G4', 2), (10, 'A4', 1), (11, 'B4', 1), (12, 'F4', 2), (14, 'E4', 2)]
RESPUESTA = [(0, 'C5', 2), (2, 'B4', 1), (3, 'A4', 1), (4, 'B4', 3), (7, 'C5', 1),
             (8, 'D#5', 2), (10, 'C5', 1), (11, 'B4', 1), (12, 'A4', 2), (14, 'F#4', 2)]


# ── Instrumentos propios de este tema ────────────────────────────────────────
def vidrio(m, dur):
    """Melodía de vidrio: FM suave, ataque con un poco de ruido, dos voces apenas desafinadas."""
    t = t_arr(dur + 0.6)
    f = hz(m)
    out = []
    for det in (1.0, 1.004):
        x = np.sin(2 * np.pi * f * det * t + 0.9 * np.exp(-t * 6) * np.sin(2 * np.pi * 2 * f * det * t))
        x += 0.25 * np.sin(2 * np.pi * 3 * f * det * t) * np.exp(-t * 9)
        out.append(x)
    x = (out[0] + out[1]) * 0.5                     # el leve batido entre las dos voces da el brillo
    x[:int(0.01 * SR)] += hp(rng.standard_normal(int(0.01 * SR)), 3000) * 0.3
    e = env_adsr(len(t), 0.004, 0.25, 0.55, 0.45, dur) * np.exp(-t * 0.8)
    return x * e * 0.28


def cuerdas(notas, dur):
    """Cuerdas fantasma: muchas sierras desafinadas, ataque lento, vibrato."""
    t = t_arr(dur + 1.5)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.1 * t + rng.uniform(0, 6))
    out = np.zeros((2, len(t)))
    for m in notas:
        for v in range(7):
            det = 1 + (v - 3) * 0.0028
            ph = np.cumsum(hz(m) * det * vib) / SR
            out += paneo(2 * (ph - np.floor(ph + 0.5)) / 7, (v - 3) / 4)
    out = hp(lp(out, 3200), 280)
    return out * env_adsr(len(t), 0.9, 0.5, 0.85, 1.4, dur) * 0.2


def braam(notas, dur=2.4):
    """Golpe de metales grave de banda de sonido: el filtro abre y vuelve a cerrar."""
    t = t_arr(dur)
    x = sum(saw(hz(m), t) + 0.6 * np.sign(np.sin(2 * np.pi * hz(m) * 1.003 * t)) for m in notas)
    abre = np.clip(t / 0.18, 0, 1) * np.exp(-np.clip(t - 0.18, 0, None) * 1.6)
    x = lp(x, 260) * (1 - abre) + lp(x, 1900) * abre
    x = np.tanh(x * 0.9) * env_adsr(len(t), 0.04, 0.4, 0.7, 1.2, dur * 0.5)
    return np.stack([x, np.roll(x, int(0.011 * SR))]) * 0.25


def bajo_carpenter(m, dur):
    t = t_arr(dur)
    x = np.sign(np.sin(2 * np.pi * hz(m) * t)) * 0.7 + saw(hz(m), t, 0.005) * 0.4
    return lp(x, 900) * np.exp(-t * 9) * 0.35


# Fuentes "escondidas": los sonidos de espionaje salen del material del propio tema (pedido de Juan:
# nada de pitidos de computadora explícitos — pitchear, invertir, cortar, distorsionar).
_FUENTES = {}


def fuente(nombre):
    if nombre not in _FUENTES:
        if nombre == 'acorde':
            # El acorde espía una octava abajo, saturado: el Morse se "dice" cortando este sonido
            x = pad([n(x) + 12 for x in ACORDES['EmM9'][:4]], 2.0, 2200).mean(axis=0)
            x = repitch(x, 0.5)
            _FUENTES[nombre] = saturar(np.stack([x, x]), 0.8)[0]
        elif nombre == 'perc':
            # Pedacitos de clap y hi-hat transportados hacia arriba, en loop
            _FUENTES[nombre] = np.tile(np.concatenate([repitch(clap(), 1.7)[:int(0.05 * SR)], repitch(hat(), 0.7)]), 40)
        elif nombre == 'grano':
            _FUENTES[nombre] = pad([n(x) + 12 for x in ACORDES['Cmaj7']], 3.0, 3000).mean(axis=0)
    return _FUENTES[nombre]


def morse(codigo, t0, buf, unidad=S16, origen='acorde', gan=0.18, pan=0.0, invertir=True):
    """El ritmo Morse ('-' = 3 unidades, '.' = 1) cortando un sonido del tema; algunos golpes invertidos."""
    src = fuente(origen)
    t, pos, k = t0, int(0.1 * SR), 0
    for ch in codigo:
        if ch == ' ':
            t += unidad * 2
            continue
        largo = int(unidad * (3 if ch == '-' else 1) * SR)
        x = src[pos:pos + largo].copy()
        if len(x) < largo:
            pos, x = 0, src[:largo].copy()
        if invertir and k % 2 == 1:
            x = x[::-1]
        f = min(len(x) // 4, int(0.004 * SR))
        x[:f] *= np.linspace(0, 1, f)
        x[-f:] *= np.linspace(1, 0, f)
        poner(buf, paneo(x * gan, pan), t)
        pos += largo
        t += largo / SR + unidad
        k += 1
    return t


def rebobinado(t0, buf, gan=0.15):
    """Una nota de la melodía invertida que se frena bajando de tono, como una cinta que vuelve atrás."""
    nota = n(str(rng.choice(['E5', 'B4', 'D#5', 'G4'])))
    x = vidrio(nota, 0.5)[::-1]
    vel = np.linspace(1.0, 0.3, len(x))
    pos = np.cumsum(vel)
    pos = pos[pos < len(x) - 1]
    y = saturar(np.stack([np.interp(pos, np.arange(len(x)), x)] * 2), 0.5)[0]
    poner(buf, paneo(y * gan, rng.uniform(-0.4, 0.4)), t0)


def estatica(dur, gan=0.05):
    """Textura granular hecha del pad: granos de 20-70 ms, algunos invertidos o a otra octava, que van y vienen."""
    src = fuente('grano')
    out = np.zeros((2, int(dur * SR)))
    for _ in range(int(dur * 22)):
        largo = int(rng.uniform(0.02, 0.07) * SR)
        i = int(rng.integers(0, len(src) - largo * 2))
        g = src[i:i + largo * 2]
        g = repitch(g, float(rng.choice([0.5, 1.0, 2.0])))[:largo]
        if rng.random() < 0.5:
            g = g[::-1]
        g = g * np.hanning(len(g))
        poner(out, paneo(g, float(rng.uniform(-0.8, 0.8))), rng.uniform(0, dur))
    out = lp(bitcrush(hp(out, 600), 0.4), 7000, 4)
    mod = np.clip(lp(rng.standard_normal(out.shape[1]), 3) * 10, 0.1, 1)
    return out * mod * gan * 6


def radio(st):
    """Transmisión interceptada: banda angosta, bitcrush, saturación, casi mono."""
    mono = st.mean(axis=0)
    x = bp(mono, 420, 2900, 3)
    x = saturar(np.stack([x, x]), 0.6)
    x = bitcrush(x, 0.55)
    # El bitcrush deja un silbido fijo (~15 kHz, la frecuencia del muestreo reducido): se filtra
    return lp(x, 3400, 4) * 0.8


def riser(dur):
    t = t_arr(dur)
    r = (t / dur) ** 2
    ruido = rng.standard_normal(len(t))
    x = hp(ruido, 800) * (1 - r) + hp(ruido, 5000) * r
    return np.stack([x, np.roll(x, 300)]) * r * 0.22


# ── Composición ──────────────────────────────────────────────────────────────
def render():
    total_compases = sum(c for _, c in SECCIONES)
    N = int((total_compases * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['intro', 'drums', 'bajo', 'armonia', 'melodia', 'fx', 'braam']}
    sidechain = np.zeros(N)
    B, CL, H, HO = bombo(), clap(), hat(), hat(True)
    snare_tono = np.sin(2 * np.pi * 210 * t_arr(0.12)) * np.exp(-t_arr(0.12) * 35) * 0.5
    ir = reverb_ir(dur=2.8, brillo=5200)
    ir_corta = reverb_ir(dur=0.9, decay=6, brillo=7000, seed=11)
    notas808 = []
    inicio = {}
    c0 = 0
    for nombre, largo in SECCIONES:
        inicio[nombre] = c0
        prog = PROG[nombre]
        for c in range(largo):
            cg = c0 + c
            t_c = cg * COMPAS
            ac_n = prog[c % len(prog)]
            ac = [n(x) for x in ACORDES[ac_n]]
            frase_fin = (c % 4) == 3
            destino = 'intro' if nombre in ('intro', 'final') else 'armonia'

            # Colchón oscuro de fondo (pegamento), siempre
            poner(bus[destino], pad([m + 12 for m in ac[:4]], COMPAS, 1100) * 0.7, t_c)

            # Línea cromática espía (negras); en el gancho baja de octava y de volumen
            if nombre in ('intro', 'verso', 'puente', 'final') or (nombre.startswith('gancho') and c % 2 == 0):
                oct_ = -12 if nombre.startswith('gancho') else 0
                g = 0.45 if nombre.startswith('gancho') else 0.8
                for k, nota in enumerate(LINEA[ac_n]):
                    poner(bus[destino], paneo(vidrio(n(nota) + oct_, BEAT * 0.9), -0.35) * g, t_c + k * BEAT)

            # Melodía del gancho: llamada y respuesta (4 compases)
            if nombre.startswith('gancho'):
                frase = LLAMADA if (c % 4) < 2 else RESPUESTA
                mitad = (c % 2) * 8
                media_vel = nombre == 'gancho2' and c < 2           # se arma después, a media velocidad
                for (p, nota, l) in frase:
                    if mitad <= p < mitad + 8 and not media_vel:
                        t_n = t_c + (p - mitad) * BEAT / 2
                        poner(bus['melodia'], paneo(vidrio(n(nota), l * BEAT / 2), 0.15), t_n)
                        if p == 0:
                            # Pre-eco: la reverb de la nota, invertida, desemboca en la nota
                            pre = con_reverb(paneo(vidrio(n(nota), BEAT), 0.15), ir, 1.0)[:, :int(BEAT * 1.6 * SR)][:, ::-1]
                            poner(bus['melodia'], pre * 0.6, t_n - pre.shape[1] / SR)
                        # Cuerdas fantasma doblando la melodía en la segunda mitad del gancho y en el gancho 2
                        if (nombre == 'gancho' and c >= 8) or (nombre == 'gancho2' and not media_vel):
                            poner(bus['armonia'], cuerdas([n(nota) - 12], l * BEAT / 2) * 0.5, t_n)

            # Cuerdas en acordes en el puente
            if nombre == 'puente':
                poner(bus['armonia'], cuerdas([m + 12 for m in ac[1:4]], COMPAS), t_c)
                # Bajo pulsante estilo Carpenter
                patron = ['E2', 'E2', 'E3', 'E2', 'E2', 'E3', 'E2', 'D3'] if ac_n == 'EmM9' else \
                         [x.replace('E', 'C') if ac_n == 'Cmaj7' else x.replace('E', 'B').replace('D3', 'A2')
                          for x in ['E2', 'E2', 'E3', 'E2', 'E2', 'E3', 'E2', 'D3']]
                for k, nota in enumerate(patron):
                    poner(bus['bajo'], paneo(bajo_carpenter(n(nota), BEAT / 2 * 0.9), 0), t_c + k * BEAT / 2)

            # Golpe de metales al entrar al gancho y cada 8 compases
            if nombre.startswith('gancho') and c % 8 == 0 or (nombre == 'puente' and c == 0):
                poner(bus['braam'], braam([n('E2'), n('B2'), n('E3')]), t_c)

            # ── Batería ──
            con_drums = nombre in ('verso', 'gancho', 'gancho2', 'puente')
            if con_drums:
                if nombre == 'verso':
                    pb = [0, 10] if c % 2 == 0 else [0, 10, 13]
                elif nombre == 'puente':
                    pb = [0, 11] if c % 2 == 0 else [0, 6, 11]
                else:
                    pb = [0, 7, 10] if c % 4 != 3 else [0, 7, 10, 14]
                # Antes de un gancho: un tiempo de silencio total (sale todo menos el swell)
                antes_gancho = c == largo - 1 and nombre in ('verso', 'puente')
                for s in pb:
                    if antes_gancho and s >= 12:
                        continue
                    poner(bus['drums'], paneo(B, 0) * 0.95, t_c + s * S16)
                    poner(sidechain[None], np.exp(-t_arr(0.25) * 14)[None], t_c + s * S16)
                golpe = paneo(CL, 0.04) * 0.65              # clap + cuerpo de redoblante, en el tercer tiempo
                golpe[:, :len(snare_tono)] += paneo(snare_tono, 0)
                poner(bus['drums'], golpe, t_c + 8 * S16)
                # Hi-hats: corcheas al principio del verso, después semicorcheas con acentos
                if nombre == 'verso' and c < 4:
                    pasos = list(range(0, 16, 2))
                elif nombre == 'gancho' and 8 <= c < 12:
                    pasos = None                       # tresillos de corchea en este tramo
                else:
                    pasos = list(range(16))
                if pasos is None:
                    for k in range(12):
                        poner(bus['drums'], paneo(H * (0.8 if k % 3 == 0 else 0.5), 0.25), t_c + k * COMPAS / 12)
                else:
                    redoble = frase_fin and nombre != 'puente'
                    for s in pasos:
                        if redoble and s >= 12:
                            break
                        acento = [1.0, 0.45, 0.7, 0.45][s % 4]
                        poner(bus['drums'], paneo(H * acento * (1 - rng.uniform(0, 0.15)), 0.25), t_c + s * S16 + rng.normal(0, 0.003))
                    if redoble and not antes_gancho:
                        sub = 6 if (c // 4) % 2 == 0 else 8       # tresillo de semicorchea o fusas, alternando
                        for j in range(sub):
                            r = 1 + j * 0.05
                            poner(bus['drums'], paneo(repitch(H, r) * (0.5 + 0.5 * j / sub), 0.25), t_c + 12 * S16 + j * BEAT / sub * 1.0)
                    # Abierto a contratiempo, cortado por el cerrado siguiente (2 semicorcheas)
                    if c % 2 == 1 and not redoble:
                        ho = HO[:int(2 * S16 * SR)].copy()
                        ho[-200:] *= np.linspace(1, 0, 200)
                        poner(bus['drums'], paneo(ho * 0.55, -0.3), t_c + 6 * S16)
                # Morse como percusión, bajito y agudo, en la segunda mitad del gancho
                if nombre == 'gancho' and c >= 8 and c % 2 == 1:
                    morse('- ...', t_c + 12 * S16, bus['fx'], unidad=S16 / 2, origen='perc', gan=0.12, pan=0.6)

            # ── 808: raíz del acorde; glide solo hacia el primer tiempo del compás siguiente ──
            if nombre in ('verso', 'gancho', 'gancho2'):
                r = n(RAIZ808[ac_n])
                pb808 = [0, 7, 10] if nombre != 'verso' else [0, 10]
                antes_gancho = c == largo - 1 and nombre == 'verso'
                for i, s in enumerate(pb808):
                    sig = pb808[i + 1] if i + 1 < len(pb808) else 16
                    if antes_gancho and s >= 12:
                        continue
                    glide = 0.13 if (s == 0 and c % 4 == 0 and c > 0) else 0
                    notas808.append((t_c + s * S16, r, (sig - s) * S16 - (BEAT if antes_gancho and sig == 16 else 0), glide))
                if frase_fin and not antes_gancho:
                    # La última nota de la frase sube una octava para caer deslizándose al compás siguiente
                    t0, m, d, g = notas808[-1]
                    notas808[-1] = (t0, m, d - 2 * S16, g)
                    notas808.append((t_c + 14 * S16, r + 12, 2 * S16, 0))
        c0 += largo

    T = lambda compas: compas * COMPAS
    # ── Intro: transmisión interceptada ──
    morse('- ...', T(0) + BEAT * 0.5, bus['intro'], gan=0.35)
    morse('- ...', T(4) + BEAT * 0.5, bus['intro'], gan=0.3)
    for k in range(6):
        rebobinado(T(rng.uniform(0, 6)), bus['fx'], 0.12)
    poner(bus['fx'], estatica(T(6), 0.04), 0)
    poner(bus['fx'], riser(T(2) - BEAT), T(6))
    # Swell en reversa hacia cada entrada fuerte
    for comp in (inicio['verso'], inicio['gancho'], inicio['gancho2']):
        sw = con_reverb(pad([n(x) + 12 for x in ACORDES['EmM9'][:4]], BEAT, 2600), ir, 0.9)[:, :int(BEAT * 2.4 * SR)][:, ::-1]
        poner(bus['armonia'], sw * 0.7, T(comp) - sw.shape[1] / SR)
    # Final: vuelve la radio y se cierra con Morse
    fi = inicio['final']
    poner(bus['fx'], estatica(T(4), 0.035), T(fi))
    morse('- ...', T(fi + 2) + BEAT, bus['intro'], gan=0.35)
    rebobinado(T(fi + 3) + BEAT * 2, bus['fx'], 0.16)

    # Gancho 2: el primer compás de la llamada a media velocidad (una octava abajo, el doble de largo),
    # como una cinta que gira lento, antes de que la melodía vuelva normal
    g0, g2i = int(T(inicio['gancho']) * SR), inicio['gancho2']
    lento = repitch(bus['melodia'][:, g0:g0 + int(COMPAS * SR)], 0.5)
    lento = cinta(saturar(lento, 0.4), 0.6, rng)
    poner(bus['melodia'], lento * 0.7, T(g2i))

    if notas808:
        sucio = ochocientos(notas808, N / SR, 5.0)          # 808 bien distorsionado (Southside)
        limpio = ochocientos(notas808, N / SR, 1.0)
        b = lp(limpio, 110) * 0.9 + hp(sucio, 140) * 0.55
        b_st = paneo(b, 0)
        bus['bajo'] += con_reverb(b_st, ir_corta, 0.12)

    # ── Mezcla ──
    sc = 1 - np.clip(sidechain, 0, 1) * 0.5
    # Intro y final: radio que se abre en los compases 7-8 (y se cierra en el final)
    clean = bus['intro']
    rad = radio(clean)
    w = np.zeros(N)
    a, b_ = int(T(6) * SR), int(T(8) * SR)
    w[a:b_] = np.linspace(0, 1, b_ - a) ** 2
    w[b_:] = 1
    w[int(T(fi) * SR):] = 0                                   # el final vuelve a sonar por radio
    intro = rad * (1 - w) + clean * w
    intro = con_reverb(intro, ir, 0.25)
    arm = cinta(bus['armonia'], 0.25, rng)                    # leve deriva de cinta solo en la armonía
    arm = con_reverb(arm * sc, ir, 0.35)
    mel = delay_pingpong(cinta(bus['melodia'], 0.2, rng), BEAT * 0.75, 0.38, 0.28)
    mel = con_reverb(saturar(mel, 0.25) * sc, ir, 0.38)
    drums = bus['drums']
    # Puente: batería filtrada (lowpass) como si viniera de otra sala
    p0, p1 = int(T(inicio['puente']) * SR), int(T(inicio['puente'] + 8) * SR)
    drums[:, p0:p1] = lp(drums[:, p0:p1], 900) * 1.3
    drums = con_reverb(saturar(drums, 0.2), ir_corta, 0.1)
    braam_bus = con_reverb(bus['braam'], ir, 0.5)
    # La intro queda más baja a propósito: contraste para que la entrada del verso pegue
    mix = intro * 1.3 + drums * 1.0 + bus['bajo'] * 0.8 + arm * 0.85 + mel * 0.95 + bus['fx'] + braam_bus * 0.8
    # Un único stutter: último medio compás del gancho 2
    g2 = inicio['gancho2'] + 8
    mix = stutter(mix, T(g2) - BEAT * 2, BEAT * 2, BEAT / 4)
    mix = hp(mix, 30)
    mix = mix / (np.abs(mix).max() + 1e-9) * 0.9
    mix = np.tanh(mix * 1.4) / np.tanh(1.4)
    mix /= np.abs(mix).max() + 1e-9
    fin = int((total_compases * COMPAS + 2.5) * SR)
    mix = mix[:, :fin]
    mix[:, -int(2 * SR):] *= np.linspace(1, 0, int(2 * SR))
    return (mix * 0.95).T


if __name__ == '__main__':
    out = os.path.join(RAIZ, 'fuentes', 'beats', 'salida', 'operativo')
    os.makedirs(out, exist_ok=True)
    v = 1 + len([f for f in os.listdir(out) if f.endswith('.wav')])
    f = os.path.join(out, f'operativo-v{v}.wav')
    audio = render()
    sf.write(f, audio, SR, subtype='PCM_16')
    print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.0f} s')
