"""Transcribe lo que realmente se canta en un tema (Whisper "turbo" en la GTX 1070, fp32: en fp16 Pascal da NaN).

    fuentes/beats/whisper/.venv/Scripts/python.exe scripts/beats/transcribir.py <audio.mp3> <salida.json> [pista.txt]

pista.txt (opcional): la letra escrita, como vocabulario de referencia para Whisper (initial_prompt).
Salida: [{"ini": s, "fin": s, "texto": "..."}]. Lo usa scripts/beats/letra-final.mjs.
"""
import json
import sys

import whisper

audio, salida = sys.argv[1], sys.argv[2]
pista = open(sys.argv[3], encoding="utf-8").read() if len(sys.argv) > 3 else None
modelo = whisper.load_model("turbo", device="cuda", download_root="D:/proyectos/top-secret/fuentes/beats/whisper/modelos")
r = modelo.transcribe(audio, language="en", fp16=False, condition_on_previous_text=False,
                      initial_prompt=(pista or "")[-800:] or None, no_speech_threshold=0.5)
segs = [{"ini": round(s["start"], 1), "fin": round(s["end"], 1), "texto": s["text"].strip()} for s in r["segments"] if s["text"].strip()]
json.dump(segs, open(salida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(segs)} segmentos")
