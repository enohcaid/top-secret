"""Compositor de beats de trap del club: todo sintetizado por código (sin samples ni modelos).

Cada sonido se genera acá (808 con glides y caídas, bombo, clap, hi-hats con redobles que suben,
pads, arpegios, campanas, piano, lead ochentoso, chops de voz) y cada tema sale de un estilo:
tempo, tonalidad, progresión de acordes, instrumentos, estructura y "suciedad". La melodía se
compone con una semilla: misma semilla = mismo tema.

La suciedad (pedido de Juan, 2026-10-06: "está muy limpio, todo muy cuadrado; el trap se destaca
por las deformaciones") viene en el bloque "sucio" del estilo, valores de 0 a 1:
  cinta     wow & flutter (afinación que se mueve, como casete/vinilo) en melodía y armonía
  crush     bitcrush + reducción de muestreo en la melodía (sample reciclado)
  saturar   saturación por pista
  swing     swing de los hi-hats (0 = cuadrado)
  humano    desfasaje y fuerza variable de cada golpe
  vinilo    crujido y soplido de fondo
  tapestop  la cinta frena al final de las secciones que lo piden ("tapestop" en las capas)
  stutter   cortes repetidos al final de algunos compases del gancho
  respira   filtro que abre y cierra en los pads

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/componer.py <estilo> [--seed N] [--n 2]

Salida: fuentes/beats/salida/<estilo>-propio/<estilo>-propio-<seed>.wav → pulir con scripts/beats/pulir.mjs.
"""
import argparse
import json
import os
import sys

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# ── Teoría ───────────────────────────────────────────────────────────────────
NOTAS = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6,
         'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
MENOR = [0, 2, 3, 5, 7, 8, 10]          # menor natural
MENOR_ARM = [0, 2, 3, 5, 7, 8, 11]      # menor armónica (séptima mayor: suena más inquietante)


def hz(midi):
    return 440.0 * 2 ** ((np.asarray(midi, dtype=float) - 69) / 12)


def acorde(raiz_midi, grado, escala, voces=4):
    """Acorde por terceras sobre un grado (0-6) de la escala, en midi."""
    return [raiz_midi + escala[(grado + 2 * k) % 7] + 12 * ((grado + 2 * k) // 7) for k in range(voces)]


# ── Utilidades de síntesis ───────────────────────────────────────────────────
def t_arr(dur):
    return np.arange(int(dur * SR)) / SR


def lp(x, fc, orden=2):
    return sosfilt(butter(orden, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x, axis=-1)


def hp(x, fc, orden=2):
    return sosfilt(butter(orden, fc, 'high', fs=SR, output='sos'), x, axis=-1)


def bp(x, lo, hi, orden=2):
    return sosfilt(butter(orden, [lo, hi], 'band', fs=SR, output='sos'), x, axis=-1)


def saw(f, t, det=0.0):
    ph = (f * (1 + det)) * t
    return 2 * (ph - np.floor(ph + 0.5))


def env_adsr(n, a, d, s, r, sus_len):
    """Envolvente ADSR en muestras (a, d, r en segundos; s nivel; sus_len = duración de la nota)."""
    e = np.zeros(n)
    A, D, R, L = int(a * SR), int(d * SR), int(r * SR), int(sus_len * SR)
    seg = min(A, n)
    e[:seg] = np.linspace(0, 1, A, endpoint=False)[:seg] if A else 1
    i = seg
    seg = min(D, max(0, n - i))
    e[i:i + seg] = np.linspace(1, s, D, endpoint=False)[:seg] if D else s
    i += seg
    if L > i:
        e[i:min(L, n)] = s
        i = min(L, n)
    seg = min(R, max(0, n - i))
    if seg:
        e[i:i + seg] = np.linspace(e[i - 1] if i else s, 0, R)[:seg]
    return e


def poner(buf, x, t0):
    """Suma x en buf a partir del segundo t0 (recortando al final)."""
    i = int(round(t0 * SR))
    if i < 0:
        x, i = x[..., -i:], 0
    if i >= buf.shape[-1]:
        return
    n = min(x.shape[-1], buf.shape[-1] - i)
    buf[..., i:i + n] += x[..., :n]


def repitch(x, ratio):
    """Cambia la altura re-muestreando (como acelerar o frenar una cinta)."""
    n = x.shape[-1]
    idx = np.arange(0, n - 1, ratio)
    return np.interp(idx, np.arange(n), x) if x.ndim == 1 else np.stack([np.interp(idx, np.arange(n), c) for c in x])


def reverb_ir(dur=2.4, decay=3.0, brillo=6000, seed=7):
    rng = np.random.default_rng(seed)
    t = t_arr(dur)
    ir = np.stack([lp(rng.standard_normal(len(t)), brillo) * np.exp(-decay * t) for _ in range(2)])
    ir[:, :int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    return ir / np.abs(ir).sum(axis=1, keepdims=True).max() * 6


def con_reverb(st, ir, mezcla):
    mojado = np.stack([fftconvolve(st[c], ir[c])[:st.shape[1]] for c in range(2)])
    return st * (1 - mezcla * 0.5) + mojado * mezcla


def delay_pingpong(st, tiempo, fb=0.35, mezcla=0.3):
    out = st.copy()
    d = int(tiempo * SR)
    eco = st.mean(axis=0)
    for k in range(1, 5):
        if d * k < st.shape[1]:
            # Cada repetición más oscura, como un delay de cinta
            out[k % 2, d * k:] += lp(eco[:-d * k], 6000 / k) * mezcla * fb ** (k - 1)
    return out


def paneo(x, p):
    """Mono → estéreo, p de -1 (izq) a 1 (der), ley de potencia constante."""
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


# ── Suciedad ─────────────────────────────────────────────────────────────────
def cinta(st, cuanto, rng):
    """Wow & flutter: la afinación oscila lento (wow) y tiembla rápido (flutter), como una cinta gastada."""
    if cuanto <= 0:
        return st
    n = st.shape[-1]
    t = np.arange(n) / SR
    deriva = lp(rng.standard_normal(n), 1.5) * 40          # deriva lenta aleatoria
    d_ms = cuanto * (4.0 * np.sin(2 * np.pi * 0.55 * t) + 0.5 * np.sin(2 * np.pi * 6.5 * t) + deriva)
    idx = np.arange(n) - (d_ms + 6 * cuanto) * SR / 1000
    return np.stack([np.interp(idx, np.arange(n), c) for c in st])


def bitcrush(st, cuanto):
    """Menos bits y menos muestras por segundo: el brillo áspero de un sample reciclado."""
    if cuanto <= 0:
        return st
    bits = int(16 - cuanto * 10)                           # 16 → 6 bits
    paso = 1 + int(cuanto * 5)                             # 44.1k → ~7k
    q = 2 ** (bits - 1)
    x = np.round(st * q) / q
    x = np.repeat(x[:, ::paso], paso, axis=1)[:, :st.shape[1]]
    return st * (1 - cuanto) + x * cuanto


def saturar(st, cuanto):
    if cuanto <= 0:
        return st
    g = 1 + cuanto * 6
    pico = np.abs(st).max() + 1e-9
    return np.tanh(st / pico * g) / np.tanh(g) * pico


def vinilo(n, cuanto, rng):
    if cuanto <= 0:
        return np.zeros((2, n))
    soplido = lp(hp(rng.standard_normal((2, n)), 1500), 7000) * 0.012
    crujido = np.zeros((2, n))
    pos = rng.integers(0, n, int(n / SR * 9))
    crujido[rng.integers(0, 2, len(pos)), pos] = rng.uniform(-1, 1, len(pos)) * 0.5
    crujido = hp(crujido, 900)
    return (soplido + crujido) * cuanto


def tape_stop(st, t0, dur):
    """La cinta frena: desde t0 la velocidad baja a cero en dur segundos (y queda en silencio hasta el final del tramo)."""
    i0, n = int(t0 * SR), int(dur * SR)
    if i0 + n > st.shape[1]:
        return st
    vel = np.linspace(1, 0, n) ** 1.6
    pos = i0 + np.cumsum(vel)
    seg = np.stack([np.interp(pos, np.arange(st.shape[1]), c) for c in st])
    seg *= np.linspace(1, 0.2, n)
    st[:, i0:i0 + n] = seg
    return st


def stutter(st, t0, largo, corte):
    """Repite el primer pedacito (corte seg) a lo largo de 'largo' seg: el corte típico del gancho."""
    i0, c, L = int(t0 * SR), int(corte * SR), int(largo * SR)
    if i0 + L > st.shape[1] or c <= 0:
        return st
    pedazo = st[:, i0:i0 + c].copy()
    v = np.ones(c)
    v[-int(c * 0.15):] = np.linspace(1, 0, int(c * 0.15))
    for k in range(L // c):
        st[:, i0 + k * c:i0 + (k + 1) * c] = pedazo * v
    return st


def respirar(st, periodo, cuanto):
    """Filtro que abre y cierra lento sobre los pads (mezcla de la versión oscura y la original)."""
    if cuanto <= 0:
        return st
    t = np.arange(st.shape[1]) / SR
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * t / periodo - np.pi / 2)
    oscuro = lp(st, 450, 2)
    return st * (1 - cuanto + cuanto * lfo) + oscuro * cuanto * (1 - lfo)


# ── Instrumentos ─────────────────────────────────────────────────────────────
def bombo(punch=1.0):
    t = t_arr(0.45)
    f = 48 + 110 * np.exp(-t * 38)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    x += 0.25 * punch * np.random.default_rng(1).standard_normal(len(t)) * np.exp(-t * 180)
    return np.tanh(x * 1.8)


def clap(seed=2):
    rng = np.random.default_rng(seed)
    t = t_arr(0.35)
    ruido = bp(rng.standard_normal(len(t)), 900, 5200)
    e = np.zeros(len(t))
    for k, off in enumerate([0, 0.011, 0.022]):
        i = int(off * SR)
        e[i:] += np.exp(-(t[: len(t) - i]) * 70) * (0.8 if k < 2 else 1)
    e += 0.6 * np.exp(-t * 14)
    tono = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.35
    return np.tanh((ruido * e + tono) * 1.6)


def hat(abierto=False, seed=3):
    rng = np.random.default_rng(seed)
    t = t_arr(0.32 if abierto else 0.06)
    return hp(rng.standard_normal(len(t)), 7500, 4) * np.exp(-t * (11 if abierto else 85)) * 0.5


def ochocientos(notas, total_dur, distorsion=2.2):
    """808 continuo: notas [(t0, midi, dur, glide_seg)] con deslizamiento entre notas y fase continua."""
    n = int(total_dur * SR)
    f = np.zeros(n)
    amp = np.zeros(n)
    for k, (t0, m, d, glide) in enumerate(notas):
        i0, i1 = int(t0 * SR), min(n, int((t0 + d) * SR))
        if i0 >= n or i1 <= i0:
            continue
        seg = i1 - i0
        tt = np.arange(seg) / SR
        objetivo = hz(m)
        if glide and k > 0:
            prev = hz(notas[k - 1][1])
            g = min(seg, int(glide * SR))
            curva = np.full(seg, objetivo)
            curva[:g] = prev * (objetivo / prev) ** ((np.arange(g) / g) ** 0.7)
            f[i0:i1] = curva
            amp[i0:i1] = np.maximum(amp[i0:i1], 0.85 * np.exp(-tt * 0.7))
        else:
            f[i0:i1] = objetivo * (1 + 0.6 * np.exp(-tt * 45))   # golpe de pitch del ataque
            amp[i0:i1] = np.exp(-tt * 0.9)
        rel = min(int(0.04 * SR), seg)
        amp[i1 - rel:i1] *= np.linspace(1, 0, rel)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * amp
    x = np.tanh(x * distorsion) / np.tanh(distorsion)
    return lp(x, 2600)


def pad(notas, dur, brillo=1800, voces=5):
    t = t_arr(dur + 1.2)
    out = np.zeros((2, len(t)))
    for m in notas:
        for v in range(voces):
            det = (v - (voces - 1) / 2) * 0.0055
            out += paneo(saw(hz(m), t, det) / voces, (v - (voces - 1) / 2) / voces * 1.4)
    e = env_adsr(len(t), 0.45, 0.6, 0.8, 1.2, dur)
    return lp(out, brillo, 2) * e * 0.16


def pluck(m, dur=0.35, brillo=3500):
    t = t_arr(dur + 0.25)
    x = saw(hz(m), t) + 0.5 * saw(hz(m), t, 0.008)
    return (lp(x, brillo * 2.2) * np.exp(-t * 26) + lp(x, brillo * 0.5) * np.exp(-t * 7)) * 0.3


def campana(m, dur=1.6):
    """Campana FM (portadora + moduladora inarmónica)."""
    t = t_arr(dur)
    fc = hz(m)
    mod = np.sin(2 * np.pi * fc * 3.5 * t) * 2.2 * np.exp(-t * 4)
    x = np.sin(2 * np.pi * fc * t + mod) * np.exp(-t * 2.4) + 0.3 * np.sin(2 * np.pi * fc * 2 * t) * np.exp(-t * 5)
    return x * 0.32


def piano_oscuro(m, dur=2.0):
    t = t_arr(dur)
    f = hz(m)
    x = sum(np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h * h)) * np.exp(-t * (1.2 + h * 0.9)) / h for h in range(1, 7))
    x += 0.15 * np.random.default_rng(int(m)).standard_normal(len(t)) * np.exp(-t * 90)
    return lp(x, 3000) * 0.35


def lead80(m, dur, desde=None):
    """Lead ochentoso con vibrato; si viene 'desde', arranca deslizándose desde esa nota (portamento)."""
    t = t_arr(dur + 0.4)
    vib = 1 + 0.007 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.2) * 3, 0, 1)
    f = hz(m) * vib
    if desde is not None:
        g = min(len(t), int(0.07 * SR))
        f[:g] *= (hz(desde) / hz(m)) ** (1 - np.arange(g) / g)
    ph = np.cumsum(f) / SR
    x = (2 * (ph - np.floor(ph + 0.5))) * 0.6 + np.sign(np.sin(2 * np.pi * ph * 1.003)) * 0.4
    return lp(x, 2600) * env_adsr(len(t), 0.02, 0.2, 0.7, 0.35, dur) * 0.22


def vox(m, dur, vocal, rng):
    """Chop de voz sintética: diente de sierra por filtros de formantes (a, o, e)."""
    formantes = {'a': (800, 1150, 2900), 'o': (450, 800, 2830), 'e': (400, 2000, 2550)}[vocal]
    t = t_arr(dur)
    f = hz(m) * (1 + 0.012 * np.sin(2 * np.pi * 5.5 * t))
    ph = np.cumsum(f) / SR
    x = 2 * (ph - np.floor(ph + 0.5)) + 0.05 * rng.standard_normal(len(t))
    y = sum(bp(x, fo * 0.88, fo * 1.12, 2) * g for fo, g in zip(formantes, (1.0, 0.6, 0.25)))
    return y * env_adsr(len(t), 0.008, 0.05, 0.85, 0.03, dur * 0.85) * 0.9


# ── Composición ──────────────────────────────────────────────────────────────
def componer_melodia(rng, escala, raiz, acordes_grados, pasos, densidad):
    """Motivo de 2 compases sobre notas del acorde + pasos de escala; se repite con variación."""
    motivo = []
    for c in range(2):
        g = acordes_grados[c % len(acordes_grados)]
        for p in range(pasos):
            fuerte = p % max(1, pasos // 4) == 0
            if rng.random() < densidad + (0.25 if fuerte else 0):
                grado = g + int(rng.choice([0, 2, 4])) if rng.random() < 0.65 else g + int(rng.integers(0, 9))
                motivo.append((c, p, grado, int(rng.choice([1, 1, 2, 2, 3]))))
    eventos = []
    for bloque in range(0, 8, 2):
        for (c, p, grado, largo) in motivo:
            if (bloque // 2) % 2 == 1 and c == 1 and p >= pasos // 2 and rng.random() < 0.6:
                grado += int(rng.choice([-2, -1, 1, 2]))
            eventos.append((bloque + c, p, raiz + escala[grado % 7] + 12 * (grado // 7), largo))
    return eventos


def render(est, seed):
    rng = np.random.default_rng(seed)
    sucio = {'cinta': 0, 'crush': 0, 'saturar': 0, 'swing': 0, 'humano': 0, 'vinilo': 0, 'tapestop': 0, 'stutter': 0, 'respira': 0, **est.get('sucio', {})}
    bpm = est['bpm']
    beat = 60 / bpm
    compas = 4 * beat
    escala = MENOR_ARM if est.get('armonica') else MENOR
    raiz = 12 * 4 + NOTAS[est['tonica']]          # octava 3 (C3 = 48)
    prog = est['progresion']
    secciones = est['estructura']                # [(nombre, compases, capas)]
    total_compases = sum(s[1] for s in secciones)
    total = total_compases * compas + 3.0
    N = int(total * SR)
    pistas = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'armonia', 'melodia', 'vox']}
    sidechain = np.zeros(N)

    B, CL, H, HO = bombo(), clap(), hat(), hat(True)
    ir = reverb_ir(dur=est.get('reverb_dur', 2.6), brillo=est.get('reverb_brillo', 6000))
    pasos_mel = est.get('pasos_melodia', 8)
    melodia = componer_melodia(rng, escala, raiz + 12 * est.get('octava_melodia', 1), prog, pasos_mel, est.get('densidad', 0.35))
    patron_bombo = est['bombo']                  # posiciones en 1/16 dentro del compás
    notas808 = []
    jit = lambda: rng.normal(0, 0.006 * sucio['humano'])          # desfasaje humano (seg)
    vel = lambda: 1 - rng.uniform(0, 0.35 * sucio['humano'])      # fuerza variable
    cortes = []                                  # (t, dur) para tape stop / stutter

    c0 = 0
    for si, (nombre, largo, capas) in enumerate(secciones):
        siguiente = secciones[si + 1][2] if si + 1 < len(secciones) else []
        entra_drop = 'drums' in siguiente and 'drums' not in capas or ('drums' in siguiente and 'corte' in capas)
        for c in range(largo):
            cg = c0 + c
            t_c = cg * compas
            grado = prog[cg % len(prog)]
            ac = acorde(raiz, grado, escala)
            ultimo = c == largo - 1
            # Armonía
            if 'pad' in capas:
                poner(pistas['armonia'], pad([n + 12 for n in ac], compas, est.get('brillo_pad', 1800)), t_c)
            if 'arpegio' in capas:
                orden = ac + [ac[1] + 12, ac[2] + 12]
                for k in range(16):
                    if rng.random() < 0.12 * sucio['humano'] * 2:   # notas que faltan: menos cuadrado
                        continue
                    m = orden[[0, 1, 2, 3, 4, 2, 1, 3][k % 8]] + 12
                    x = paneo(pluck(m, 0.22, est.get('brillo_arp', 3200)), 0.35 * np.sin(k))
                    poner(pistas['armonia'], x * (0.9 if k % 4 == 0 else 0.6) * vel(), t_c + k * beat / 4 + jit())
            if 'piano' in capas:
                for k, n in enumerate(ac[:3]):
                    poner(pistas['armonia'], paneo(piano_oscuro(n + 12, compas * 0.9), -0.2 + 0.2 * k), t_c + k * 0.025 + abs(jit()))
            # Melodía (8 compases que se repiten)
            if any(x in capas for x in ('campana', 'lead', 'pluck_mel')):
                paso = compas / pasos_mel
                previa = None
                for (mc, p, m, l) in melodia:
                    if mc != cg % 8:
                        continue
                    if 'campana' in capas:
                        x = paneo(campana(m + 12, 1.4), 0.25)
                    elif 'lead' in capas:
                        x = paneo(lead80(m, l * paso, previa if rng.random() < 0.5 else None), -0.1)
                    else:
                        x = paneo(pluck(m + 12, 0.3, 4200), 0.15)
                    poner(pistas['melodia'], x * vel(), t_c + p * paso + jit())
                    previa = m
            # Chops de voz: notas del acorde cortadas en semicorcheas, con huecos
            if 'vox' in capas:
                vocal = str(rng.choice(['a', 'o', 'e']))
                patron = est.get('vox_patron', [0, 3, 6, 8, 11, 14])
                for s in patron:
                    if rng.random() < 0.2:
                        continue
                    m = ac[int(rng.choice([0, 1, 2]))] + 12 * est.get('octava_vox', 1)
                    poner(pistas['vox'], paneo(vox(m, beat / 4 * rng.choice([1, 1, 2]), vocal, rng), float(rng.uniform(-0.5, 0.5))), t_c + s * beat / 4 + jit())
            # Batería
            if 'drums' in capas:
                pb = list(patron_bombo)
                if rng.random() < 0.45:                       # bombo extra que cambia por compás
                    extra = int(rng.choice([3, 5, 9, 13, 14, 15]))
                    if extra not in pb and extra % 8 != 4:
                        pb = sorted(pb + [extra])
                for s in pb:
                    if ultimo and s >= 12 and 'corte' in capas:
                        continue
                    t_k = t_c + s * beat / 4 + jit() * 0.3
                    poner(pistas['drums'], paneo(B, 0) * 0.95 * vel(), t_k)
                    poner(sidechain[None], np.exp(-t_arr(0.25) * 14)[None], t_k)
                for b in est['clap']:
                    poner(pistas['drums'], paneo(CL, 0.05) * 0.7 * vel(), t_c + b * beat + jit() * 0.5)
                    if rng.random() < 0.25 * sucio['humano'] * 2:          # clap fantasma
                        poner(pistas['drums'], paneo(CL, -0.1) * 0.25, t_c + b * beat + beat * 0.75)
                # Redoble de claps que sube antes de una entrada
                if ultimo and entra_drop:
                    for j in range(12):
                        poner(pistas['drums'], paneo(repitch(CL, 1 + j * 0.04), 0) * (0.25 + 0.05 * j), t_c + 2 * beat + j * beat / 6)
                # Hi-hats: swing, redobles con altura que sube, abiertos ocasionales
                div = est.get('hats', 16)
                k = 0
                while k < div:
                    t_h = t_c + k * compas / div + (sucio['swing'] * 0.33 * compas / div if k % 2 else 0) + jit()
                    if k >= div - div // 4 and rng.random() < est.get('redobles', 0.5):
                        sub = int(rng.choice([3, 4, 6]))
                        sube = rng.random() < 0.6
                        for j in range(sub * 2):
                            r = (1 + j * 0.06) if sube else (1 - j * 0.03)
                            poner(pistas['drums'], paneo(repitch(H, r) * (0.45 + 0.5 * j / (sub * 2)), 0.3), t_c + k * compas / div + j * (compas / div) / sub)
                        k += 2
                        continue
                    if rng.random() < 0.08 * sucio['humano'] * 2:
                        k += 1
                        continue
                    poner(pistas['drums'], paneo(H * (0.75 if k % 2 == 0 else 0.45) * vel(), 0.3), t_h)
                    k += 1
                if rng.random() < 0.4:
                    poner(pistas['drums'], paneo(HO * 0.5, -0.3), t_c + 3.5 * beat)
            # 808: sigue la raíz, con glides en las notas de paso y una caída al final de la sección
            if '808' in capas:
                r808 = raiz - 12 + escala[grado % 7]
                pb = list(patron_bombo)
                for s_i, s in enumerate(pb):
                    sig = pb[s_i + 1] if s_i + 1 < len(pb) else 16
                    nota, glide = r808, 0
                    if s_i == len(pb) - 1 and rng.random() < est.get('glides', 0.4):
                        nota, glide = r808 + int(rng.choice([7, 12, -2, 3, 5])), 0.09
                    notas808.append((t_c + s * beat / 4, nota, (sig - s) * beat / 4, glide))
                if ultimo:
                    t0, m, d, g = notas808[-1]
                    corte_t = t_c + compas - beat
                    if t0 < corte_t:
                        notas808[-1] = (t0, m, corte_t - t0, g)
                        notas808.append((corte_t, m - 12, beat, beat * 0.9))   # caída de una octava
        if 'tapestop' in capas and sucio['tapestop'] > 0:
            cortes.append(('tapestop', (c0 + largo) * compas - beat * (1 + sucio['tapestop']), beat * (1 + sucio['tapestop'])))
        if 'stutter_ok' in capas or 'corte' in capas:
            for c in range(largo):
                if rng.random() < sucio['stutter'] * 0.5:
                    cortes.append(('stutter', (c0 + c + 1) * compas - beat / 2, beat / 2))
        # Swell en reversa antes de cada entrada de batería
        if entra_drop and si + 1 < len(secciones):
            t_ent = (c0 + largo) * compas
            sig_ac = acorde(raiz, prog[(c0 + largo) % len(prog)], escala)
            sw = con_reverb(pad([n + 12 for n in sig_ac], beat, 2600), ir, 0.9)
            sw = sw[:, :int(beat * 2.2 * SR)][:, ::-1]
            poner(pistas['armonia'], sw * 0.8, t_ent - sw.shape[1] / SR)
        c0 += largo

    if notas808:
        pistas['bajo'] += paneo(ochocientos(notas808, total, est.get('distorsion_808', 2.2)), 0) * 0.9

    # ── Mezcla con suciedad ──
    sc = 1 - np.clip(sidechain, 0, 1) * est.get('sidechain', 0.55)
    arm = respirar(pistas['armonia'], compas * 4, sucio['respira'])
    arm = cinta(arm, sucio['cinta'] * 0.6, rng)
    pistas['armonia'] = con_reverb(saturar(arm, sucio['saturar'] * 0.5) * sc, ir, est.get('reverb_armonia', 0.35))
    mel = cinta(pistas['melodia'], sucio['cinta'], rng)
    mel = bitcrush(saturar(mel, sucio['saturar']), sucio['crush'])
    mel = delay_pingpong(mel, beat * 0.75, 0.4, est.get('delay', 0.25))
    pistas['melodia'] = con_reverb(mel * sc, ir, est.get('reverb_melodia', 0.4))
    vx = bitcrush(cinta(pistas['vox'], sucio['cinta'] * 0.5, rng), sucio['crush'] * 0.6)
    pistas['vox'] = con_reverb(delay_pingpong(vx, beat / 2, 0.3, 0.2) * sc, ir, 0.3)
    pistas['drums'] = con_reverb(saturar(pistas['drums'], sucio['saturar'] * 0.4), ir, 0.06)
    pistas['bajo'] = pistas['bajo'] * (1 - np.clip(sidechain, 0, 1) * 0.15)

    g = est.get('ganancias', {})
    mix = sum(pistas[k] * g.get(k, 1.0) for k in pistas)
    for tipo, t0, d in cortes:
        mix = tape_stop(mix, t0, d) if tipo == 'tapestop' else stutter(mix, t0, d, d / 4)
    mix = hp(mix, 30)
    mix = mix / (np.abs(mix).max() + 1e-9) * 0.9
    mix += vinilo(mix.shape[1], sucio['vinilo'], rng)
    mix = np.tanh(mix * 1.4) / np.tanh(1.4)
    mix /= np.abs(mix).max() + 1e-9
    fin = int((total_compases * compas + 2.5) * SR)
    mix = mix[:, :fin]
    fade = int(2.0 * SR)
    mix[:, -fade:] *= np.linspace(1, 0, fade)
    return (mix * 0.95).T


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('estilo')
    ap.add_argument('--seed', type=int)
    ap.add_argument('--n', type=int, default=2)
    a = ap.parse_args()
    ruta = os.path.join(RAIZ, 'scripts', 'beats', 'propios', f'{a.estilo}.json')
    if not os.path.exists(ruta):
        print('estilos:', ', '.join(f[:-5] for f in os.listdir(os.path.dirname(ruta))))
        sys.exit(1)
    est = json.load(open(ruta, encoding='utf-8'))
    out = os.path.join(RAIZ, 'fuentes', 'beats', 'salida', f'{a.estilo}-propio')
    os.makedirs(out, exist_ok=True)
    semillas = [a.seed + k for k in range(a.n)] if a.seed is not None else list(np.random.default_rng().integers(1, 99999, a.n))
    for s in semillas:
        audio = render(est, int(s))
        f = os.path.join(out, f'{a.estilo}-propio-{int(s)}.wav')
        sf.write(f, audio, SR, subtype='PCM_16')
        print(f'{os.path.relpath(f, RAIZ)}  {audio.shape[0] / SR:.0f} s  (semilla {int(s)})')


if __name__ == '__main__':
    main()
