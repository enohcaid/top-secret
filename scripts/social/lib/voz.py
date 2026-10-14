# Narración con voz neuronal (edge-tts, gratis, voces es-AR). Lo llama lib/voz.mjs:
#   python voz.py <texto.txt> <voz> <rate> <pitch> <salida.mp3> <palabras.json>
# palabras.json = [{ t, d, w }] (segundos desde el inicio de la frase), para subtítulos sincronizados.
import asyncio, json, sys
import edge_tts

async def main(txt, voz, rate, pitch, mp3, js):
    texto = open(txt, encoding='utf-8').read().strip()
    c = edge_tts.Communicate(texto, voz, rate=rate, pitch=pitch, boundary='WordBoundary')
    palabras = []
    with open(mp3, 'wb') as f:
        async for ch in c.stream():
            if ch['type'] == 'audio':
                f.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                palabras.append({'t': ch['offset'] / 1e7, 'd': ch['duration'] / 1e7, 'w': ch['text']})
    with open(js, 'w', encoding='utf-8') as f:
        json.dump(palabras, f, ensure_ascii=False)

asyncio.run(main(*sys.argv[1:7]))
