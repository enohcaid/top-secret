"""Monta las voces de Thrive sobre el beat pulido por ACE-Step (Juan, 2026-11-01: "pasar primero el beat por ACE y
después las voces en partes y anexarlas al beat").

Cada voz (ya separada con Demucs de la toma de ACE de su tramo) entra en el segundo exacto donde empieza su tramo en el
beat, recortada a su largo (con medio segundo de cola que se desvanece). Nivel: la voz se lleva al mismo RMS que el beat
en ese tramo (+1 dB) y el beat se corre 2 dB donde se canta, para que se entienda.

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/montar_voces.py <trabajo.json> <salida.wav>
trabajo.json: {"beat": "beat-ace.wav", "tramos": [{"inicio", "fin", "voz": "voz-i.wav" | null}]}
"""
import json
import sys
from math import gcd

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

T = json.load(open(sys.argv[1], encoding='utf-8'))


def leer(f, sr_obj):
    x, sr = sf.read(f, always_2d=True)
    if sr != sr_obj:
        g = gcd(sr, sr_obj)
        x = resample_poly(x, sr_obj // g, sr // g, axis=0)
    return np.repeat(x, 2, axis=1) if x.shape[1] == 1 else x[:, :2]


beat, SR = sf.read(T['beat'], always_2d=True)
beat = np.repeat(beat, 2, axis=1) if beat.shape[1] == 1 else beat[:, :2]
voces = np.zeros_like(beat)
duck = np.ones(len(beat))
rms = lambda x: np.sqrt(np.mean(x ** 2)) + 1e-9
for tr in T['tramos']:
    if not tr.get('voz'):
        continue
    v = leer(tr['voz'], SR)
    i0, i1 = int(tr['inicio'] * SR), min(len(beat), int(tr['fin'] * SR))
    cola = int(0.5 * SR)
    n = min(len(v), i1 - i0 + cola, len(beat) - i0)
    v = v[:n].copy()
    f = int(0.03 * SR)
    v[:f] *= np.linspace(0, 1, f)[:, None]
    if n > i1 - i0:                                   # la cola pasa al tramo siguiente desvaneciéndose
        k = n - (i1 - i0)
        v[-k:] *= np.linspace(1, 0, k)[:, None]
    v *= rms(beat[i0:i1]) / rms(v) * 10 ** (1 / 20)
    voces[i0:i0 + n] += v
    duck[i0:i1] = 10 ** (-2 / 20)
w = int(0.2 * SR)
duck = np.convolve(duck, np.ones(w) / w, mode='same')
mix = beat * duck[:, None] + voces
mix = mix / (np.abs(mix).max() + 1e-9) * 0.95
sf.write(sys.argv[2], mix, SR, subtype='PCM_16')
print(f'montado: {len(mix) / SR:.1f} s, {sum(1 for t in T["tramos"] if t.get("voz"))} voces')
