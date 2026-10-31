"""Intérprete de partituras de Thrive (Juan, 2026-10-31: "hay que enseñarle a componer a Gemma").

El modelo (Gemma, local) escribe una PARTITURA en JSON —acordes, motivos, línea de 808, grillas de batería, arreglo
por secciones— y este código la toca. Lo que se reusa acá son los INSTRUMENTOS y la mezcla (cómo suena un 808 con
glide, el sidechain, los redobles, la normalización): lo mismo que reusa cualquier productor con su 808 y sus
plugins. El material musical (notas, acordes, ritmos, arreglo) sale entero de la partitura de cada tema.

El trap está garantizado por el intérprete: el clap va en el 3 (medio tiempo), el 808 lleva el bajo y sigue al
acorde, el bombo empuja al 808 (sidechain), las secciones con voz dejan los medios libres. No sabe hacer pop.

    python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/partitura.py <partitura.json> <salida.wav>

Al final imprime SECCIONES=[…] (inicio y fin reales de cada sección) como los temas compuestos por código.

## Formato (lo valida y lo repara scripts/beats/partitura.mjs antes de llegar acá)
{
  "bpm": 72, "tonalidad": "A minor", "armonica": false,
  "kit": {"bombo_golpe": 0-1, "bombo_cola": 0-1, "clap_tono": 0-1, "hat_metal": 0-1, "dist_808": 0-1,
          "sala": 0-1, "brillo": 0-1, "swing": 0-1, "cinta": 0-1, "crush": 0-1},
  "melodia": "campana|pluck|piano|lead|vox|cuerdas", "respuesta": "<igual>", "textura": "pad|coro|cuerdas",
  "progresiones": {"A": "1 6 3 7"},              grados de la escala (1-7), un acorde por compás, en loop
  "motivos": {"m1": "5/4 r/2 3/2 1+/8 r/16"},    2 compases = 32 semicorcheas; grado/duración; r = silencio;
                                                 + octava arriba, - octava abajo
  "bajos": {"b1": "1/6 r/2 1/4 5~/4"},           1 compás = 16; grado contado desde la raíz del acorde; ~ = glide
  "baterias": {"d1": {"bombo": "x.........x.....", "hats": "x.x.x.x.xrx.x.xt", "abierto": "..............x."}},
                                                 16 por compás; hats: x golpe, r redoble de fusas, t tresillo
  "secciones": [{"nombre": "verse", "compases": 8, "acordes": "A", "melodia": "m1", "variacion": "normal",
                 "respuesta": "m2", "bajo": "b1", "bateria": "d1", "bateria_b": "d2", "textura": true,
                 "energia": 3, "final": "nada|corte|tapestop|redoble"}]
}
variacion: normal | media (a media velocidad, ocupa 4 compases) | invertida (espejo) | retrogrado | octava
"""
import json
import os
import re
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from componer import (SR, NOTAS, MENOR, MENOR_ARM, hz, acorde, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch,
                      reverb_ir, con_reverb, delay_pingpong, paneo, cinta, bitcrush, saturar, tape_stop, stutter,
                      ochocientos, pad, pluck, campana, piano_oscuro, lead80, vox)

NOMBRES_OK = ('intro', 'verse', 'pre-chorus', 'chorus', 'bridge', 'outro')
# energía 1-5 → dB respecto de la sección más fuerte (regla de Juan: intro/outro 6–8 dB debajo del estribillo, verso debajo)
# (valores calibrados contra ebur128 el 31/10: en secciones despojadas la medición propia se quedaba ~2 dB corta)
OBJETIVO_DB = {1: -10.0, 2: -8.0, 3: -4.0, 4: -2.0, 5: 0.0}


# ── Kit propio de cada tema (perillas de la partitura) ───────────────────────
def bombo_k(golpe, cola):
    t = t_arr(0.6)
    f = 44 + (80 + 90 * golpe) * np.exp(-t * (30 + 25 * golpe))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (11 - 7 * cola))
    x += 0.3 * golpe * np.random.default_rng(1).standard_normal(len(t)) * np.exp(-t * 200)
    return np.tanh(x * (1.5 + golpe))


def clap_k(tono, seed=2):
    rng = np.random.default_rng(seed)
    t = t_arr(0.4)
    centro = 700 + 1600 * tono
    ruido = bp(rng.standard_normal(len(t)), centro * 0.6, centro * 3.5)
    e = np.zeros(len(t))
    for k, off in enumerate([0, 0.009, 0.019, 0.03]):
        i = int(off * SR)
        e[i:] += np.exp(-(t[: len(t) - i]) * 75) * (0.7 if k < 3 else 1)
    e += 0.5 * np.exp(-t * (10 + 10 * tono))
    cuerpo = np.sin(2 * np.pi * (150 + 120 * tono) * t) * np.exp(-t * 28) * 0.4
    return np.tanh((ruido * e + cuerpo) * 1.7)


def hat_k(metal, abierto=False, seed=3):
    """Mezcla de ruido y seis cuadradas inarmónicas (el hi-hat del 808): metal = cuánto de lo segundo."""
    t = t_arr(0.35 if abierto else 0.07)
    ruido = np.random.default_rng(seed).standard_normal(len(t))
    cuadradas = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
    x = hp(ruido * (1 - metal) + cuadradas / 3 * metal, 7000, 4)
    return x * np.exp(-t * (9 if abierto else 80)) * 0.5


def cuerdas(notas, dur, brillo):
    t = t_arr(dur + 1.5)
    out = np.zeros((2, len(t)))
    for m in notas:
        for v in range(4):
            det = (v - 1.5) * 0.004
            vib = 1 + 0.003 * np.sin(2 * np.pi * (4.8 + v * 0.3) * t)
            ph = np.cumsum(hz(m) * (1 + det) * vib) / SR
            out += paneo(2 * (ph - np.floor(ph + 0.5)) / 4, (v - 1.5) / 2.5)
    return lp(out, brillo, 2) * env_adsr(len(t), 0.9, 0.5, 0.85, 1.4, dur) * 0.14


def coro(notas, dur, rng):
    out = np.zeros((2, int((dur + 0.2) * SR)))
    for k, m in enumerate(notas[:3]):
        x = vox(m, dur, 'a' if k % 2 == 0 else 'o', rng) * env_adsr(int(dur * SR), 0.5, 0.3, 0.9, 0.6, dur * 0.7)
        poner(out, paneo(x, -0.5 + 0.5 * k), 0)
    return lp(out, 2400) * 0.35


def instrumento(nombre, m, dur, brillo, rng, previa=None):
    if nombre == 'campana':
        return paneo(campana(m + 12, max(1.0, dur * 1.5)), 0.2)
    if nombre == 'pluck':
        return paneo(pluck(m + 12, max(0.25, dur), 2500 + 3000 * brillo), 0.15)
    if nombre == 'piano':
        return paneo(piano_oscuro(m + 12, max(0.8, dur * 1.3)), -0.15)
    if nombre == 'lead':
        return paneo(lead80(m, dur, previa), -0.1)
    if nombre == 'vox':
        return paneo(vox(m + 12, dur, str(rng.choice(['a', 'o', 'e'])), rng), float(rng.uniform(-0.4, 0.4)))
    return cuerdas([m + 12], dur, 1800 + 2500 * brillo)


# ── Lectura de la partitura ──────────────────────────────────────────────────
def leer_motivo(s):
    """'5/4 r/2 3+/2 1~/4' → [(paso, grado|None, dur, glide)]; grado en escalones de la escala (0 = 1.er grado)."""
    eventos, p = [], 0
    for tok in s.split():
        m = re.fullmatch(r"(r|-?\d+)([+-]*)(~?)/(\d+)", tok)
        if not m:
            continue
        dur = int(m.group(4))
        if m.group(1) != 'r':
            g = int(m.group(1)) - 1 + 7 * (m.group(2).count('+') - m.group(2).count('-'))
            eventos.append((p, g, dur, bool(m.group(3))))
        p += dur
    return eventos


def variar(eventos, como, largo):
    if como == 'media':
        return [(p * 2, g, d * 2, gl) for p, g, d, gl in eventos], largo * 2
    if como == 'invertida' and eventos:
        eje = eventos[0][1]
        return [(p, 2 * eje - g, d, gl) for p, g, d, gl in eventos], largo
    if como == 'retrogrado':
        return sorted([(largo - p - d, g, d, gl) for p, g, d, gl in eventos]), largo
    if como == 'octava':
        return [(p, g + 7, d, gl) for p, g, d, gl in eventos], largo
    return eventos, largo


def render(P):
    rng = np.random.default_rng(int(P.get('semilla', 7)))
    k = {'bombo_golpe': 0.6, 'bombo_cola': 0.5, 'clap_tono': 0.5, 'hat_metal': 0.4, 'dist_808': 0.5, 'sala': 0.5,
         'brillo': 0.5, 'swing': 0.2, 'cinta': 0.2, 'crush': 0.0, **P.get('kit', {})}
    bpm = P['bpm']
    beat = 60 / bpm
    compas, semi = 4 * beat, beat / 4
    tonica, modo = P['tonalidad'].split()
    escala = MENOR_ARM if P.get('armonica') else MENOR
    raiz = 48 + NOTAS[tonica]                      # C3 = 48
    nota = lambda g, base: base + escala[g % 7] + 12 * (g // 7)
    secs = P['secciones']
    total_c = sum(s['compases'] for s in secs)
    total = total_c * compas + 3.0
    N = int(total * SR)
    pistas = {x: np.zeros((2, N)) for x in ('drums', 'armonia', 'melodia', 'respuesta')}
    sidechain, notas808, cortes = np.zeros(N), [], []
    nivel = np.ones(N)
    voz = np.zeros(N)                              # 1 donde canta alguien: los medios se abren para la voz
    B, CL = bombo_k(k['bombo_golpe'], k['bombo_cola']), clap_k(k['clap_tono'])
    H, HO = hat_k(k['hat_metal']), hat_k(k['hat_metal'], True)
    ir = reverb_ir(dur=1.6 + 2.2 * k['sala'], brillo=4000 + 4000 * k['brillo'])
    jit = lambda: rng.normal(0, 0.004)
    vel = lambda: 1 - rng.uniform(0, 0.25)
    motivos = {n: leer_motivo(s) for n, s in P.get('motivos', {}).items()}
    bajos = {n: leer_motivo(s) for n, s in P.get('bajos', {}).items()}
    progs = {n: [int(x) - 1 for x in s.split()] for n, s in P['progresiones'].items()}
    marcas, c0 = [], 0

    for si, S in enumerate(secs):
        t_s, largo = c0 * compas, S['compases']
        i0, i1 = int(t_s * SR), int((c0 + largo) * compas * SR)
        if S['nombre'] in ('verse', 'pre-chorus', 'chorus', 'bridge'):
            voz[i0:i1] = 1 if S['nombre'] in ('verse', 'pre-chorus') else 0.6
        prog = progs.get(S.get('acordes'), next(iter(progs.values())))
        for c in range(largo):
            t_c = t_s + c * compas
            grado = prog[c % len(prog)]
            ac = acorde(raiz, grado, escala)
            ultimo = c == largo - 1
            # Textura (armonía de fondo)
            if S.get('textura'):
                tx = P.get('textura', 'pad')
                notas_ac = [n + 12 for n in ac]
                x = (pad(notas_ac, compas, 900 + 1600 * k['brillo']) if tx == 'pad' else
                     coro(notas_ac, compas, rng) if tx == 'coro' else cuerdas(notas_ac, compas, 1200 + 1500 * k['brillo']))
                poner(pistas['armonia'], x, t_c)
            # Batería: clap en el 3 (medio tiempo), siempre
            nombre_d = S.get('bateria_b') if S.get('bateria_b') and c >= largo // 2 and largo >= 8 else S.get('bateria')
            D = P.get('baterias', {}).get(nombre_d) if nombre_d else None
            if D:
                for s, ch in enumerate(D.get('bombo', '')[:16]):
                    if ch == 'x' and not (ultimo and S.get('final') == 'corte' and s >= 8):
                        t_k = t_c + s * semi + jit() * 0.3
                        poner(pistas['drums'], paneo(B, 0) * 0.95, t_k)
                        poner(sidechain[None], np.exp(-t_arr(0.3) * 12)[None], t_k)
                if not (ultimo and S.get('final') == 'corte'):
                    poner(pistas['drums'], paneo(CL, 0.04) * 0.75 * vel(), t_c + 2 * beat + jit() * 0.4)
                for s, ch in enumerate(D.get('hats', '')[:16]):
                    t_h = t_c + s * semi + (k['swing'] * 0.33 * semi if s % 2 else 0) + jit()
                    if ch == 'x':
                        poner(pistas['drums'], paneo(H * (0.7 if s % 4 == 0 else 0.45) * vel(), 0.3), t_h)
                    elif ch in 'rt':
                        sub = 2 if ch == 'r' else 3
                        for j in range(sub):
                            poner(pistas['drums'], paneo(repitch(H, 1 + 0.05 * j) * (0.4 + 0.15 * j), 0.3), t_c + s * semi + j * semi / sub)
                for s, ch in enumerate(D.get('abierto', '')[:16]):
                    if ch == 'x':
                        poner(pistas['drums'], paneo(HO * 0.45, -0.3), t_c + s * semi)
                if ultimo and S.get('final') == 'redoble':
                    for j in range(12):
                        poner(pistas['drums'], paneo(repitch(CL, 1 + j * 0.04), 0) * (0.2 + 0.05 * j), t_c + 2 * beat + j * beat / 6)
            # 808: grados desde la raíz del acorde del compás; ~ = glide hacia la nota
            if S.get('bajo') in bajos:
                base = raiz - 24 + escala[grado % 7]          # octava 1 (A1 = 55 Hz)
                if base > 40:
                    base -= 12
                for p, g, d, gl in bajos[S['bajo']]:
                    if p >= 16:
                        break
                    m = base + escala[(grado + g) % 7] + 12 * ((grado + g) // 7) - escala[grado % 7]
                    notas808.append((t_c + p * semi, m, min(d, 16 - p) * semi, semi * 1.6 if gl else 0))
        # Melodía y respuesta: motivos de 2 compases que se repiten con la variación pedida
        for pista, clave, inst in (('melodia', 'melodia', P.get('melodia', 'campana')), ('respuesta', 'respuesta', P.get('respuesta', 'pluck'))):
            if S.get(clave) not in motivos:
                continue
            ev, lm = variar(motivos[S[clave]], S.get('variacion', 'normal') if clave == 'melodia' else 'normal', 32)
            base = raiz + 12 if clave == 'melodia' else raiz
            for vuelta in range(0, largo * 16, lm):
                previa = None
                for p, g, d, gl in ev:
                    if vuelta + p >= largo * 16:
                        break
                    c_abs = (vuelta + p) // 16
                    m = nota(g, base)
                    x = instrumento(inst, m, d * semi, k['brillo'], rng, previa if gl else None)
                    poner(pistas[pista], x * vel() * (0.75 if clave == 'respuesta' else 1), t_s + (vuelta + p) * semi + jit())
                    previa = m
        if S.get('final') == 'tapestop':
            cortes.append(('tapestop', (c0 + largo) * compas - beat * 1.5, beat * 1.5))
        if S.get('final') == 'corte':
            cortes.append(('stutter', (c0 + largo) * compas - beat, beat))
        nombre = S['nombre'] if S['nombre'] in NOMBRES_OK else 'verse'
        marcas.append({'nombre': nombre, 'inicio': round(t_s, 2), 'fin': round((c0 + largo) * compas, 2), 'compases': largo})
        c0 += largo

    if notas808:
        b808 = ochocientos(notas808, total, 1.4 + 2.6 * k['dist_808'])
    else:
        b808 = np.zeros(N)

    # ── Mezcla ──
    def suave(x, seg=0.08):                        # promedio móvil por suma acumulada (np.convolve tardaba minutos)
        w = int(seg * SR)
        c = np.cumsum(np.concatenate([np.full(w, x[0]), x, np.full(w, x[-1])]))
        return ((c[w:] - c[:-w]) / w)[w // 2: w // 2 + len(x)]
    voz = suave(voz, 0.3)
    sc = 1 - np.clip(sidechain, 0, 1) * 0.5
    arm = cinta(pistas['armonia'], k['cinta'] * 0.5, rng)
    arm = con_reverb(saturar(arm, 0.2) * sc, ir, 0.35)
    mel = bitcrush(cinta(pistas['melodia'], k['cinta'], rng), k['crush'])
    mel = con_reverb(delay_pingpong(mel, beat * 0.75, 0.35, 0.22) * sc, ir, 0.4)
    res = con_reverb(delay_pingpong(pistas['respuesta'], beat / 2, 0.3, 0.2) * sc, ir, 0.45)
    # espacio para la voz: donde se canta, la melodía y la respuesta bajan y pierden medios
    hueco = 1 - 0.45 * voz
    medios = lambda x: x * hueco + (hp(x, 3000) + lp(x, 300)) * (1 - hueco)
    mel, res = medios(mel), medios(res)
    drums = con_reverb(saturar(pistas['drums'], 0.25), ir, 0.05)
    bajo = paneo(b808 * (1 - np.clip(sidechain, 0, 1) * 0.15), 0) * 0.9
    mix = drums + bajo + arm * 0.8 + mel * 0.8 + res * 0.7
    for tipo, t0, d in cortes:
        mix = tape_stop(mix, t0, d) if tipo == 'tapestop' else stutter(mix, t0, d, d / 4)
    mix = hp(mix, 28)
    # Dinámica por sección: se mide cada una con una ponderación parecida a la K de ebur128 (corta graves bajo 40 Hz,
    # realza ~4 dB arriba de 1,5 kHz) y se la lleva a su objetivo; dos pasadas, porque la saturación final mueve un poco
    master = lambda x: np.tanh(x / (np.percentile(np.abs(x), 99.95) + 1e-9) * 0.8 * 1.3) / np.tanh(1.3)
    nivel[:] = 1
    for _ in range(3):
        medir = master(mix * suave(nivel, 0.15))
        medir = hp(medir, 40) + 0.585 * hp(medir, 1500)
        db = [20 * np.log10(np.sqrt(np.mean(medir[:, int(m['inicio'] * SR):int(m['fin'] * SR)] ** 2)) + 1e-9) for m in marcas]
        tope = max(db)
        for m, d, S in zip(marcas, db, secs):
            corr = 10 ** (np.clip(tope + OBJETIVO_DB.get(int(S.get('energia', 3)), -3.5) - d, -12, 20) / 20)
            nivel[int(m['inicio'] * SR):int(m['fin'] * SR)] *= corr
    mix = master(mix * suave(nivel, 0.15))
    mix = mix / (np.abs(mix).max() + 1e-9) * 0.89
    fin = int((total_c * compas + 2.5) * SR)
    mix = mix[:, :fin]
    fade = int(2.0 * SR)
    mix[:, -fade:] *= np.linspace(1, 0, fade)
    return mix.T, marcas


if __name__ == '__main__':
    P = json.load(open(sys.argv[1], encoding='utf-8'))
    audio, marcas = render(P)
    sf.write(sys.argv[2], audio, SR, subtype='PCM_16')
    print('SECCIONES=' + json.dumps(marcas))
