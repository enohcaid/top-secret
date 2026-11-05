"""Lo que se canta de verdad en cada tema, palabra por palabra, para la letra de los videos de YouTube
(scripts/beats/videos-youtube.mjs). Demucs separa la voz y Whisper "turbo" (GTX 1070, fp32: en fp16 Pascal da NaN) la
transcribe por ventanas cortas superpuestas, SIN la letra como pista y sin los filtros de silencio: de corrido, Whisper
descartaba ventanas enteras de 30 s (estrofas completas) y la pista lo sesgaba hacia la letra escrita, que puede no ser
lo que se canta.

    fuentes/beats/whisper/.venv/Scripts/python.exe scripts/beats/palabras-whisper.py <lista.json> <carpeta-salida>

lista.json: [{"slug", "mp3"}]
Salida: <carpeta>/<slug>.json = [{"w", "ini", "fin"}] y <carpeta>/voz/<slug>.f32 (voz sola, 16 kHz, mono, float32).
Lo que ya está no se rehace.

Probado y descartado: alineación forzada con stable-ts contra la letra (amontona versos enteros en el mismo instante).
"""
import json
import os
import subprocess
import sys

import numpy as np
import torch
import whisper

lista = json.load(open(sys.argv[1], encoding="utf-8"))
salida = sys.argv[2]
os.makedirs(os.path.join(salida, "voz"), exist_ok=True)
SR = 44100
VENTANA, PASO = 16, 8   # segundos: de cada ventana se usa la franja central de PASO segundos
ruta_voz = lambda t: os.path.join(salida, "voz", t["slug"] + ".f32")


def leer(mp3):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).copy().reshape(-1, 2).T


sin_voz = [t for t in lista if not os.path.exists(ruta_voz(t))]
if sin_voz:
    from demucs.apply import apply_model
    from demucs.pretrained import get_model
    separador = get_model("htdemucs")
    separador.to("cuda")
    separador.eval()
    for t in sin_voz:
        audio = torch.from_numpy(leer(t["mp3"]))
        ref = audio.mean(0)
        norm = (audio - ref.mean()) / ref.std()
        with torch.no_grad():
            fuentes = apply_model(separador, norm[None], device="cuda", split=True, overlap=0.25, progress=False)[0]
        voz = (fuentes[separador.sources.index("vocals")] * ref.std() + ref.mean()).mean(0)[None, None].cpu()
        torch.nn.functional.interpolate(voz, scale_factor=16000 / SR, mode="linear", align_corners=False)[0, 0].numpy().astype(np.float32).tofile(ruta_voz(t))
        print("voz", t["slug"], flush=True)
    del separador
    torch.cuda.empty_cache()

modelo = whisper.load_model("turbo", device="cuda", download_root="D:/proyectos/top-secret/fuentes/beats/whisper/modelos")
for t in lista:
    f = os.path.join(salida, t["slug"] + ".json")
    if os.path.exists(f):
        continue
    voz = np.fromfile(ruta_voz(t), dtype=np.float32)
    dur = len(voz) / 16000
    palabras = []
    ini = -PASO / 2
    while ini < dur:
        a = max(0.0, ini)
        trozo = voz[int(a * 16000):int((a + VENTANA) * 16000)]
        if len(trozo) >= 8000 and np.sqrt(np.mean(trozo ** 2)) > 0.002:
            r = modelo.transcribe(trozo, language="en", fp16=False, condition_on_previous_text=False, word_timestamps=True, temperature=0.0,
                                  no_speech_threshold=None, logprob_threshold=None, compression_ratio_threshold=None)
            # cada ventana manda en su franja central: ahí corta menos palabras
            desde, hasta = ini + (VENTANA - PASO) / 2, ini + (VENTANA + PASO) / 2
            for s in r["segments"]:
                for w in s.get("words", []):
                    medio = a + (w["start"] + w["end"]) / 2
                    if w["word"].strip() and desde <= medio < hasta:
                        palabras.append({"w": w["word"].strip(), "ini": round(a + w["start"], 2), "fin": round(a + w["end"], 2)})
        ini += PASO
    json.dump(palabras, open(f, "w", encoding="utf-8"), ensure_ascii=False)
    print(t["slug"], len(palabras), "palabras", flush=True)
