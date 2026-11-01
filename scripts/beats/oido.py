"""El "oído" de Thrive (Juan, 2026-11-01: "las chances de que esto salga bien sin que puedas escuchar son bajísimas").
No juzga el gusto: mide los errores objetivos de cada tramo cantado por ACE-Step contra lo que se le pidió.

  - letra: qué parte de las palabras escritas del tramo se oyen cantadas (Whisper). En "Borrowed Time" v1 el primer
    estribillo no se cantó y el último minuto fue "yeah, yeah": eso da cerca de 0.
  - beat: cuánto se parece el pulso de la batería del tramo cantado al del beat original (envolvente de ataques en la
    banda del bombo y en la de los hats, correlación con un margen de ±40 ms). Si ACE aplanó un cambio de beat, cae.
  - voz: en un tramo con letra, que haya voz (energía en la banda media por encima de la del beat original).

    fuentes/beats/whisper/.venv/Scripts/python.exe scripts/beats/oido.py <trabajo.json>   → JSON por tramo
"""
import json
import re
import sys

import numpy as np
import whisper

SR = 16000
T = json.load(open(sys.argv[1], encoding='utf-8'))
modelo = whisper.load_model('turbo')


def banda(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def ataques(x, lo, hi, hop=160):
    e = banda(x, lo, hi) ** 2
    n = len(e) // hop
    env = np.log1p(e[: n * hop].reshape(n, hop).sum(1) * 1e3)
    d = np.maximum(np.diff(env, prepend=env[0]), 0)
    return (d - d.mean()) / (d.std() + 1e-9)


def parecido(a, b, margen=4):
    n = min(len(a), len(b))
    a, b = a[:n], b[:n]
    return max(float(np.mean(a[max(0, k):n + min(0, k)] * b[max(0, -k):n - max(0, k)])) for k in range(-margen, margen + 1))


palabras = lambda s: [w for w in re.findall(r"[a-z']+", s.lower()) if len(w) > 2]
res = []
for tr in T['tramos']:
    src, out = whisper.load_audio(tr['src']), whisper.load_audio(tr['salida'])
    escrita = palabras(re.sub(r"\[[^\]]*\]|\(.*?\)", " ", tr['letra']))
    r = {'tramo': tr['salida'].replace('\\', '/').split('/')[-1]}
    if escrita:
        oida = set(palabras(modelo.transcribe(out, language='en')['text']))
        unicas = set(escrita)
        r['letra'] = round(len([w for w in unicas if w in oida]) / len(unicas), 2)
    r['beat'] = round((parecido(ataques(src, 30, 150), ataques(out, 30, 150)) + parecido(ataques(src, 5000, 7900), ataques(out, 5000, 7900))) / 2, 2)
    medio = lambda x: np.sqrt(np.mean(banda(x, 300, 3000) ** 2)) / (np.sqrt(np.mean(x ** 2)) + 1e-9)
    r['voz'] = round(float(medio(out) / (medio(src) + 1e-9)), 2)
    res.append(r)
print('OIDO=' + json.dumps(res))
