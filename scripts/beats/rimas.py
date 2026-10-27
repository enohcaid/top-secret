"""Control de rimas por PRONUNCIACIÓN (Juan, 2026-10-26: "viendo que rimen las palabras teniendo en cuenta cómo se
pronuncian"). Usa el diccionario fonético CMU (paquete `pronouncing`), no la ortografía: "through" rima con "blue",
"love" no rima con "move".

    fuentes/beats/whisper/.venv/Scripts/python.exe scripts/beats/rimas.py <letra.txt>

Por sección, cada verso tiene que rimar con el siguiente (pareados) o con el de dos más adelante (alternadas). Acepta
rima perfecta (misma parte rimante desde la última vocal acentuada) y asonante fuerte (misma última vocal acentuada y
misma consonante final o ninguna). Imprime un JSON: {"ok": bool, "problemas": ["…"], "desconocidas": [palabras]}.
"""
import json
import re
import sys

import pronouncing

VOCALES = ("AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW")


def fonemas(palabra):
    p = pronouncing.phones_for_word(palabra.lower())
    if p:
        return p[0].split()
    # sin entrada en el diccionario (contracciones, nombres): probar sin apóstrofos ni sufijos comunes
    for alt in (palabra.replace("'", ""), re.sub(r"in'$", "ing", palabra), re.sub(r"s$", "", palabra)):
        p = pronouncing.phones_for_word(alt.lower())
        if p:
            return p[0].split()
    return None


def rimante(fs):
    """Desde la última vocal acentuada (1 o 2) hasta el final; si no hay acento, desde la última vocal."""
    idx = [i for i, f in enumerate(fs) if f[-1] in "12"] or [i for i, f in enumerate(fs) if f[:2] in VOCALES]
    return [re.sub(r"\d", "", f) for f in fs[idx[-1]:]] if idx else None


def riman(a, b):
    if a is None or b is None:
        return None
    if a == b:
        return True
    # asonante fuerte: misma vocal acentuada y misma consonante final (o las dos terminan en vocal)
    fin = lambda r: r[-1] if r[-1][:2] not in VOCALES else ""
    return a[0] == b[0] and fin(a) == fin(b)


def ultima(verso):
    ws = re.findall(r"[A-Za-z']+", verso)
    return ws[-1].strip("'") if ws else None


def revisar(texto):
    problemas, desconocidas = [], set()
    secciones = re.split(r"^\s*\[[^\]]*\]\s*$", texto, flags=re.M)
    for sec in secciones:
        versos = [v.strip() for v in sec.splitlines() if v.strip() and not re.fullmatch(r"\(.*\)", v.strip())]
        if len(versos) < 2:
            continue
        r = []
        for v in versos:
            w = ultima(v)
            f = fonemas(w) if w else None
            if w and f is None:
                desconocidas.add(w)
            r.append(rimante(f) if f else None)
        for i, v in enumerate(versos):
            vecinos = [j for j in (i - 2, i - 1, i + 1, i + 2) if 0 <= j < len(versos)]
            res = [riman(r[i], r[j]) for j in vecinos]
            if r[i] is not None and not any(x for x in res) and all(x is not None for x in res):
                problemas.append(f'"{v}" — "{ultima(v)}" no rima (por sonido) con ningún verso vecino')
    return {"ok": not problemas, "problemas": problemas, "desconocidas": sorted(desconocidas)}


if __name__ == "__main__":
    print(json.dumps(revisar(open(sys.argv[1], encoding="utf-8").read()), ensure_ascii=False))
