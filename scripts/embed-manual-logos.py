"""Incrusta los logos de logos/rebrand en el manual de marca como WebP livianos.

Uso (desde la raíz del repo, con un Python que tenga Pillow):
    python scripts/embed-manual-logos.py

Lee cada <img data-logo="archivo.png"> del manual, genera una versión WebP
reducida de ese archivo y la guarda una sola vez en el bloque
<script id="logo-data">. Volver a correrlo cuando cambie algún logo.
"""
import base64
import io
import json
import re
from pathlib import Path

from PIL import Image

REBRAND = Path(__file__).resolve().parent.parent / 'logos' / 'rebrand'
MANUAL = REBRAND / 'Manual de Marca - Top Secret FC.html'
MAX_SIDE = {'Top Secret Logo New.png': 1000}  # el metal va grande en la portada
DEFAULT_SIDE = 640

html = MANUAL.read_text(encoding='utf-8')
html = html.replace(' src=""', '')

data = {}
for name in sorted(set(re.findall(r'data-logo="([^"]+)"', html))):
    im = Image.open(REBRAND / name).convert('RGBA')
    im.thumbnail((MAX_SIDE.get(name, DEFAULT_SIDE),) * 2, Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=86, method=6)
    data[name] = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
    print(f'{name}: {im.size[0]}x{im.size[1]}, {len(buf.getvalue()) // 1024} KB')

payload = json.dumps(data, separators=(',', ':'))
html = re.sub(r'(<script id="logo-data" type="application/json">).*?(</script>)',
              lambda m: m.group(1) + payload + m.group(2), html, count=1, flags=re.S)
MANUAL.write_text(html, encoding='utf-8')
print(f'Manual: {len(html.encode("utf-8")) // 1024} KB')
