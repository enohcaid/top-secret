"""Control de rimas por PRONUNCIACIÓN (Juan, 2026-10-26: "viendo que rimen las palabras teniendo en cuenta cómo se
pronuncian"). Usa el diccionario fonético CMU (paquete `pronouncing`), no la ortografía: "through" rima con "blue",
"love" no rima con "move".

    fuentes/beats/whisper/.venv/Scripts/python.exe scripts/beats/rimas.py <letra.txt>

Esquema al FINAL de la frase, no todo rimando (Juan, 2026-10-27: "TODO rima y se pierde el contenido; la rima es para la
terminación de las frases"): en cada sección, por grupos de 4 versos, el último del grupo tiene que rimar con el 2.° o el
3.° (cubre ABCB, ABAB y AABB); en un grupo de 2, el 2.° con el 1.°. Los demás versos quedan libres para el contenido. Acepta
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
        # grupos de 4 (el resto, si son 2 o 3, forma un grupo más): el cierre del grupo tiene que rimar
        for ini in range(0, len(versos), 4):
            g = list(range(ini, min(ini + 4, len(versos))))
            if len(g) < 2:
                continue
            ult = g[-1]
            candidatos = [g[1], g[2]] if len(g) == 4 else g[:-1]
            res = [riman(r[ult], r[j]) for j in candidatos]
            if r[ult] is not None and not any(x for x in res) and all(x is not None for x in res):
                problemas.append(f'"{versos[ult]}" — la frase cierra con "{ultima(versos[ult])}", que no rima (por sonido) con el cierre anterior del esquema')
    return {"ok": not problemas, "problemas": problemas, "desconocidas": sorted(desconocidas)}


if __name__ == "__main__":
    print(json.dumps(revisar(open(sys.argv[1], encoding="utf-8").read()), ensure_ascii=False))
