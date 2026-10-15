"""Saca el fondo de todos los PNG de una carpeta (rembg, una sola sesión del modelo).
   python -I scripts/stream/quitar-fondo.py <entrada> <salida> [modelo]"""
import sys, pathlib
from rembg import new_session, remove

src, dst = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
dst.mkdir(parents=True, exist_ok=True)
ses = new_session(sys.argv[3] if len(sys.argv) > 3 else 'u2net_human_seg')
cuadros = sorted(src.glob('*.png'))
for i, f in enumerate(cuadros, 1):
    (dst / f.name).write_bytes(remove(f.read_bytes(), session=ses))
    if i % 25 == 0 or i == len(cuadros):
        print(f'{i}/{len(cuadros)}', flush=True)
