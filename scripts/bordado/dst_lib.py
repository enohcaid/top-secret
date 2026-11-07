"""Lectura y escritura del formato de bordado Tajima DST (sin dependencias).

Estructura del archivo:
- Cabecera ASCII de 512 bytes (LA, ST, CO, +X, -X, +Y, -Y, AX, AY, MX, MY, PD), rellena con espacios.
- Una terna de 3 bytes por comando, con desplazamiento relativo en unidades de 0,1 mm (máx. +-12,1 mm).
- Fin de archivo: 00 00 F3 y un 1A final.
El DST no guarda colores de hilo: los asigna quien opera la máquina.
"""
from pathlib import Path

# (byte, máscara, valor) de cada eje según la especificación de Tajima.
BITS_Y = [(2, 0x20, 81), (2, 0x10, -81), (1, 0x20, 27), (1, 0x10, -27), (0, 0x20, 9), (0, 0x10, -9),
          (1, 0x80, 3), (1, 0x40, -3), (0, 0x80, 1), (0, 0x40, -1)]
BITS_X = [(2, 0x04, 81), (2, 0x08, -81), (1, 0x04, 27), (1, 0x08, -27), (0, 0x04, 9), (0, 0x08, -9),
          (1, 0x01, 3), (1, 0x02, -3), (0, 0x01, 1), (0, 0x02, -1)]
MAX_PASO = 121  # 12,1 mm: lo máximo que entra en una terna


def decodificar_terna(b):
    """Devuelve (dx, dy, tipo) con tipo = 'stitch' | 'jump' | 'color' | 'end'."""
    if b[2] == 0xF3:
        return 0, 0, 'end'
    dx = sum(v for i, m, v in BITS_X if b[i] & m)
    dy = sum(v for i, m, v in BITS_Y if b[i] & m)
    if b[2] & 0xC3 == 0xC3:
        return dx, dy, 'color'
    if b[2] & 0x83 == 0x83:
        return dx, dy, 'jump'
    return dx, dy, 'stitch'


def codificar_terna(dx, dy, tipo='stitch'):
    if abs(dx) > MAX_PASO or abs(dy) > MAX_PASO:
        raise ValueError(f'desplazamiento fuera de rango: {dx},{dy}')
    b = [0, 0, 0x03]  # los bits 0 y 1 del tercer byte siempre van en 1
    for bits, resto in ((BITS_X, dx), (BITS_Y, dy)):
        # Ternario balanceado: como mucho un dígito por cada potencia de 3.
        for peso in (81, 27, 9, 3, 1):
            if abs(resto) * 2 > peso:
                signo = 1 if resto > 0 else -1
                i, m, _ = next(t for t in bits if t[2] == signo * peso)
                b[i] |= m
                resto -= signo * peso
    if tipo == 'jump':
        b[2] |= 0x83
    elif tipo == 'color':
        b[2] |= 0xC3
    elif tipo != 'stitch':
        raise ValueError(tipo)
    return bytes(b)


def leer(ruta):
    """Devuelve (campos de cabecera, comandos [(x, y, tipo, dx, dy)], bytes crudos)."""
    data = Path(ruta).read_bytes()
    campos = {}
    for parte in data[:512].split(b'\r'):
        txt = parte.strip(b' \x1a\x00').decode('latin1')
        if ':' in txt:
            k, v = txt.split(':', 1)
            campos[k.strip()] = v.strip()
    cmds, x, y = [], 0, 0
    for o in range(512, len(data) - 2, 3):
        dx, dy, t = decodificar_terna(data[o:o + 3])
        x += dx
        y += dy
        cmds.append((x, y, t, dx, dy))
        if t == 'end':
            break
    return campos, cmds, data


def _signado(v):
    return f'{"+" if v >= 0 else "-"}{abs(v):>5}'


def escribir(ruta, nombre, comandos):
    """comandos: lista de (x, y, tipo) absolutos en 0,1 mm, tipo = 'stitch' | 'jump' | 'color'.

    Los saltos más largos que una terna se parten. Una puntada más larga que eso es un error.
    """
    cuerpo = bytearray()
    x = y = n = colores = 0
    xs, ys = [0], [0]
    for cx, cy, t in comandos:
        if t == 'color':
            cuerpo += codificar_terna(0, 0, 'color')
            colores += 1
            n += 1
            continue
        dx, dy = cx - x, cy - y
        pasos = max(1, -(-max(abs(dx), abs(dy)) // MAX_PASO))
        if pasos > 1 and t == 'stitch':
            raise ValueError(f'puntada de más de 12,1 mm: {dx},{dy}')
        px, py = x, y
        for i in range(1, pasos + 1):
            nx, ny = x + round(dx * i / pasos), y + round(dy * i / pasos)
            cuerpo += codificar_terna(nx - px, ny - py, t)
            px, py = nx, ny
            n += 1
        x, y = cx, cy
        xs.append(x)
        ys.append(y)
    cuerpo += bytes([0x00, 0x00, 0xF3, 0x1A])
    n += 1
    cab = (f'LA:{nombre[:16]:<16}\r'
           f'ST:{n:>7}\r'
           f'CO:{colores:>3}\r'
           f'+X:{max(xs):>5}\r'
           f'-X:{-min(xs):>5}\r'
           f'+Y:{max(ys):>5}\r'
           f'-Y:{-min(ys):>5}\r'
           f'AX:{_signado(x)}\r'
           f'AY:{_signado(y)}\r'
           'MX:+    0\r'
           'MY:+    0\r'
           'PD:******\r\x1a')
    Path(ruta).write_bytes(cab.encode('latin1').ljust(512, b' ') + bytes(cuerpo))
