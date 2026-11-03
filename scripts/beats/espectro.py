"""Reparto de energía por bandas y ancho estéreo de un WAV (control del beat, 2026-11-03).
"Still Mine" sonaba "adentro de una caja": su beat tenía 23% de la energía entre 150 y 1000 Hz (guitarra y campanas
en los medios) y ACE lo empujó a 33%; "Asphalt Ghosts", que sí sonaba a trap, tenía 4,6% en el beat y 16% al final.
Uso: espectro.py archivo.wav  →  imprime ESPECTRO={"sub":..,"graves":..,"medios_bajos":..,"medios":..,"presencia":..,"aire":..,"ancho":..}"""
import json, sys
import numpy as np, soundfile as sf

x, sr = sf.read(sys.argv[1])
x = x if x.ndim == 2 else np.stack([x, x], 1)
m, s = x.mean(1), (x[:, 0] - x[:, 1]) / 2
X = np.abs(np.fft.rfft(m)) ** 2
fr = np.fft.rfftfreq(len(m), 1 / sr)
tot = X.sum()
b = lambda a, c: round(100 * X[(fr >= a) & (fr < c)].sum() / tot, 1)
print('ESPECTRO=' + json.dumps({'sub': b(20, 60), 'graves': b(60, 150), 'medios_bajos': b(150, 400), 'medios': b(400, 1000),
  'presencia': b(1000, 8000), 'aire': b(8000, 16000), 'ancho': round(float(np.sqrt((s ** 2).mean()) / np.sqrt((m ** 2).mean())), 2)}))
