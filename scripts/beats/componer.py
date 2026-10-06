"""Compositor de beats de trap del club: todo sintetizado por código (sin samples ni modelos).

Cada sonido se genera acá (808 con glides, bombo, clap, hi-hats con redobles, pads, arpegios,
campanas, lead ochentoso) y cada tema sale de un estilo: tempo, tonalidad, progresión de acordes,
instrumentos y estructura. La melodía se compone con una semilla: misma semilla = mismo tema.

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/componer.py <estilo> [--seed N] [--n 2]
    (o: node scripts/beats/componer.mjs <estilo> …)

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
    notas = []
    for k in range(voces):
        g = grado + 2 * k
        notas.append(raiz_midi + escala[g % 7] + 12 * (g // 7))
    return notas


# ── Utilidades de síntesis ───────────────────────────────────────────────────
def t_arr(dur):
    return np.arange(int(dur * SR)) / SR


def lp(x, fc, orden=2):
    return sosfilt(butter(orden, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x)


def hp(x, fc, orden=2):
    return sosfilt(butter(orden, fc, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, orden=2):
    return sosfilt(butter(orden, [lo, hi], 'band', fs=SR, output='sos'), x)


def saw(f, t, det=0.0):
    ph = (f * (1 + det)) * t
    return 2 * (ph - np.floor(ph + 0.5))


def env_adsr(n, a, d, s, r, sus_len):
    """Envolvente ADSR en muestras (a, d, r en segundos; s nivel; sus_len = duración de la nota)."""
    e = np.zeros(n)
    A, D, R, L = int(a * SR), int(d * SR), int(r * SR), int(sus_len * SR)
    i = 0
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
    if i >= buf.shape[-1]:
        return
    n = min(x.shape[-1], buf.shape[-1] - i)
    buf[..., i:i + n] += x[..., :n]


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
        g = mezcla * fb ** (k - 1)
        canal = k % 2
        if d * k < st.shape[1]:
            out[canal, d * k:] += eco[:-d * k] * g
    return out


def paneo(x, p):
    """Mono → estéreo, p de -1 (izq) a 1 (der), ley de potencia constante."""
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


# ── Instrumentos ─────────────────────────────────────────────────────────────
def bombo(punch=1.0):
    t = t_arr(0.45)
    f = 48 + 110 * np.exp(-t * 38)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 7.5) + 0.25 * punch * np.random.default_rng(1).standard_normal(len(t)) * np.exp(-t * 180)
    return np.tanh(x * 1.6)


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
    return np.tanh((ruido * e + tono) * 1.2)


def hat(abierto=False, seed=3):
    rng = np.random.default_rng(seed)
    dur = 0.32 if abierto else 0.06
    t = t_arr(dur)
    x = hp(rng.standard_normal(len(t)), 7500, 4) * np.exp(-t * (11 if abierto else 85))
    return x * 0.5


def ochocientos(notas, total_dur, bpm, distorsion=2.2):
    """808 continuo: notas [(t0, midi, dur, glide)] con deslizamiento entre notas y fase continua."""
    n = int(total_dur * SR)
    f = np.zeros(n)
    amp = np.zeros(n)
    for k, (t0, m, d, glide) in enumerate(notas):
        i0, i1 = int(t0 * SR), min(n, int((t0 + d) * SR))
        if i0 >= n:
            continue
        seg = i1 - i0
        tt = np.arange(seg) / SR
        objetivo = hz(m)
        if glide and k > 0:
            prev = hz(notas[k - 1][1])
            g = min(seg, int(0.09 * SR))
            curva = np.full(seg, objetivo)
            curva[:g] = prev * (objetivo / prev) ** (np.arange(g) / g)
            f[i0:i1] = curva
            amp[i0:i1] = np.maximum(amp[i0:i1], np.exp(-tt * 0.9))
        else:
            f[i0:i1] = objetivo * (1 + 0.6 * np.exp(-tt * 45))   # golpe de pitch del ataque
            amp[i0:i1] = np.exp(-tt * 0.9)
        rel = min(int(0.04 * SR), seg)
        amp[i1 - rel:i1] *= np.linspace(1, 0, rel)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * amp
    x = np.tanh(x * distorsion) / np.tanh(distorsion)
    return lp(x, 2400)


def pad(notas, dur, brillo=1800, voces=5):
    t = t_arr(dur + 1.2)
    out = np.zeros((2, len(t)))
    for m in notas:
        for v in range(voces):
            det = (v - (voces - 1) / 2) * 0.0045
            x = saw(hz(m), t, det) * (1 / voces)
            out += paneo(x, (v - (voces - 1) / 2) / voces * 1.4)
    e = env_adsr(len(t), 0.45, 0.6, 0.8, 1.2, dur)
    out = np.stack([lp(out[c], brillo, 2) for c in range(2)]) * e
    return out * 0.16


def pluck(m, dur=0.35, brillo=3500):
    t = t_arr(dur + 0.25)
    x = saw(hz(m), t) + 0.5 * saw(hz(m), t, 0.006)
    claro = lp(x, brillo * 2.2) * np.exp(-t * 26)
    oscuro = lp(x, brillo * 0.5) * np.exp(-t * 7)
    return (claro + oscuro) * 0.3


def campana(m, dur=1.6):
    """Campana FM (portadora + moduladora inarmónica)."""
    t = t_arr(dur)
    fc = hz(m)
    mod = np.sin(2 * np.pi * fc * 3.5 * t) * 2.2 * np.exp(-t * 4)
    x = np.sin(2 * np.pi * fc * t + mod) * np.exp(-t * 2.4)
    x += 0.3 * np.sin(2 * np.pi * fc * 2 * t) * np.exp(-t * 5)
    return x * 0.32


def piano_oscuro(m, dur=2.0):
    t = t_arr(dur)
    f = hz(m)
    x = sum(np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h * h)) * np.exp(-t * (1.2 + h * 0.9)) / h for h in range(1, 7))
    x += 0.15 * np.random.default_rng(int(m)).standard_normal(len(t)) * np.exp(-t * 90)
    return lp(x, 3000) * 0.35


def lead80(m, dur, vibrato=True):
    t = t_arr(dur + 0.4)
    vib = 1 + (0.006 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.25) * 3, 0, 1) if vibrato else 0)
    f = hz(m) * vib
    ph = np.cumsum(f) / SR
    x = (2 * (ph - np.floor(ph + 0.5))) * 0.6 + np.sign(np.sin(2 * np.pi * ph * 1.003)) * 0.4
    e = env_adsr(len(t), 0.02, 0.2, 0.7, 0.35, dur)
    return lp(x, 2600) * e * 0.22


# ── Composición ──────────────────────────────────────────────────────────────
def componer_melodia(rng, escala, raiz, acordes_grados, compases, pasos_por_compas, densidad, rango=(0, 9)):
    """Motivo de 2 compases sobre notas del acorde + pasos de escala; se repite con variación."""
    motivo = []
    for c in range(2):
        g = acordes_grados[c % len(acordes_grados)]
        for p in range(pasos_por_compas):
            fuerte = p % (pasos_por_compas // 4) == 0
            if rng.random() < (densidad + (0.25 if fuerte else 0)):
                if rng.random() < 0.65:
                    grado = g + rng.choice([0, 2, 4])          # nota del acorde
                else:
                    grado = g + rng.integers(rango[0], rango[1]) # paso de escala
                largo = rng.choice([1, 1, 2, 2, 3]) if pasos_por_compas >= 8 else 1
                motivo.append((c, p, int(grado), int(largo)))
    eventos = []
    for bloque in range(0, compases, 2):
        variar = (bloque // 2) % 2 == 1
        for (c, p, grado, largo) in motivo:
            if variar and c == 1 and p >= pasos_por_compas // 2 and rng.random() < 0.6:
                grado += int(rng.choice([-2, -1, 1, 2]))
            if bloque + c < compases:
                eventos.append((bloque + c, p, grado, largo))
    return [(cc, p, raiz + escala[g % 7] + 12 * (g // 7), l) for (cc, p, g, l) in eventos]


def render(est, seed):
    rng = np.random.default_rng(seed)
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
    pistas = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'armonia', 'melodia']}
    sidechain = np.zeros(N)

    B, CL, H, HO = bombo(), clap(), hat(), hat(True)
    ir = reverb_ir(dur=est.get('reverb_dur', 2.6), brillo=est.get('reverb_brillo', 6000))
    pasos_mel = est.get('pasos_melodia', 8)
    melodia = componer_melodia(rng, escala, raiz + 12 * est.get('octava_melodia', 1), prog, 8, pasos_mel, est.get('densidad', 0.35))
    patron_bombo = est['bombo']                  # posiciones en 1/16 dentro del compás
    notas808 = []

    c0 = 0
    for nombre, largo, capas in secciones:
        for c in range(largo):
            cg = c0 + c                          # compás global
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
                    m = orden[[0, 1, 2, 3, 4, 2, 1, 3][k % 8]] + 12
                    x = paneo(pluck(m, 0.22, est.get('brillo_arp', 3200)), 0.35 * np.sin(k))
                    poner(pistas['armonia'], x * (0.9 if k % 4 == 0 else 0.6), t_c + k * beat / 4)
            if 'piano' in capas:
                for k, n in enumerate(ac[:3]):
                    poner(pistas['armonia'], paneo(piano_oscuro(n + 12, compas * 0.9), -0.2 + 0.2 * k), t_c + k * 0.02)
            # Melodía (8 compases que se repiten)
            if any(x in capas for x in ('campana', 'lead', 'pluck_mel')):
                paso = compas / pasos_mel
                for (mc, p, m, l) in melodia:
                    if mc == cg % 8:
                        if 'campana' in capas:
                            x = paneo(campana(m + 12, 1.4), 0.25)
                        elif 'lead' in capas:
                            x = paneo(lead80(m, l * paso), -0.1)
                        else:
                            x = paneo(pluck(m + 12, 0.3, 4200), 0.15)
                        poner(pistas['melodia'], x, t_c + p * paso)
            # Batería
            if 'drums' in capas:
                for s in patron_bombo:
                    if ultimo and s >= 12 and 'corte' in capas:
                        continue
                    poner(pistas['drums'], paneo(B, 0) * 0.95, t_c + s * beat / 4)
                    poner(sidechain[None], np.exp(-t_arr(0.25) * 14)[None], t_c + s * beat / 4)
                for b in est['clap']:
                    poner(pistas['drums'], paneo(CL, 0.05) * 0.7, t_c + b * beat)
                # Hi-hats en corcheas/semicorcheas con redobles al final de algunos compases
                div = est.get('hats', 8)
                k = 0
                while k < div:
                    t_h = t_c + k * compas / div
                    if k >= div - div // 4 and rng.random() < est.get('redobles', 0.5):
                        sub = int(rng.choice([3, 4, 6]))
                        for j in range(sub * 2):
                            poner(pistas['drums'], paneo(H * (0.5 + 0.5 * j / (sub * 2)), 0.3), t_h + j * (compas / div) / sub)
                        k += 2
                        continue
                    vel = 0.75 if k % 2 == 0 else 0.5
                    poner(pistas['drums'], paneo(H * vel, 0.3), t_h)
                    k += 1
                if rng.random() < 0.4:
                    poner(pistas['drums'], paneo(HO * 0.5, -0.3), t_c + 3.5 * beat)
            # 808: sigue la raíz del acorde, con glides en las notas de paso
            if '808' in capas:
                r808 = raiz - 12 + escala[grado % 7]
                for s_i, s in enumerate(patron_bombo):
                    sig = patron_bombo[s_i + 1] if s_i + 1 < len(patron_bombo) else 16
                    nota = r808
                    glide = False
                    if s_i == len(patron_bombo) - 1 and rng.random() < est.get('glides', 0.4):
                        nota = r808 + int(rng.choice([7, 12, -2, 3]))
                        glide = True
                    notas808.append((t_c + s * beat / 4, nota, (sig - s) * beat / 4, glide))
        c0 += largo

    if notas808:
        b = ochocientos(notas808, total, bpm, est.get('distorsion_808', 2.2))
        pistas['bajo'] += paneo(b, 0) * 0.9

    # Mezcla: sidechain del bombo sobre armonía y melodía, reverb, delay
    sc = 1 - np.clip(sidechain, 0, 1) * est.get('sidechain', 0.55)
    pistas['armonia'] = con_reverb(pistas['armonia'] * sc, ir, est.get('reverb_armonia', 0.35))
    mel = delay_pingpong(pistas['melodia'], beat * 0.75, 0.35, est.get('delay', 0.25))
    pistas['melodia'] = con_reverb(mel * sc, ir, est.get('reverb_melodia', 0.4))
    pistas['drums'] = con_reverb(pistas['drums'], ir, 0.06)
    pistas['bajo'] = pistas['bajo'] * (1 - np.clip(sidechain, 0, 1) * 0.15)

    g = est.get('ganancias', {})
    mix = sum(pistas[k] * g.get(k, 1.0) for k in pistas)
    mix = hp(mix, 30)
    # Primero se lleva el pico a 0.9 y recién ahí una saturación suave: antes se saturaba la suma
    # cruda y salía todo pegado al máximo (-5 LUFS, graves hechos una pared).
    mix = mix / (np.abs(mix).max() + 1e-9) * 0.9
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
