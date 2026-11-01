"""Une los tramos cantados por ACE-Step (ace_secciones.py) en un solo tema, sobre la grilla del beat.

Cada tramo se ajusta al largo exacto de su pedazo de instrumental (así las secciones caen en los compases de la partitura)
y se le da la misma relación de volumen que tenía ese pedazo en el beat: ACE normaliza cada salida por su cuenta y, si no,
la dinámica por sección (intro baja, estribillo arriba) se aplanaría. Fundidos de 25 ms en las uniones.

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/unir_tramos.py <trabajo.json> <salida.wav>
"""
import json
import sys
from math import gcd

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

T = json.load(open(sys.argv[1], encoding='utf-8'))
SR = 44100
partes, ganancias = [], []
for tr in T['tramos']:
    src, sr_s = sf.read(tr['src'], always_2d=True)
    out, sr_o = sf.read(tr['salida'], always_2d=True)
    if sr_o != SR:
        g = gcd(SR, sr_o)
        out = resample_poly(out, SR // g, sr_o // g, axis=0)
    if sr_s != SR:
        g = gcd(SR, sr_s)
        src = resample_poly(src, SR // g, sr_s // g, axis=0)
    if out.shape[1] == 1:
        out = np.repeat(out, 2, axis=1)
    n = len(src)
    out = out[:n] if len(out) >= n else np.concatenate([out, np.zeros((n - len(out), out.shape[1]))])
    rms = lambda x: np.sqrt(np.mean(x ** 2)) + 1e-9
    partes.append(out)
    ganancias.append(rms(src) / rms(out))
ref = float(np.median(ganancias))
F = int(0.025 * SR)
mix = None
for out, g in zip(partes, ganancias):
    out = out * (g / ref)
    if mix is None:
        mix = out
        continue
    f = np.linspace(0, 1, F)[:, None]
    union = mix[-F:] * (1 - f) + out[:F] * f
    mix = np.concatenate([mix[:-F], union, out[F:]])
mix = mix / (np.abs(mix).max() + 1e-9) * 0.95
sf.write(sys.argv[2], mix, SR, subtype='PCM_16')
print(f'unido: {len(mix) / SR:.1f} s, ganancias {[round(g / ref, 2) for g in ganancias]}')
