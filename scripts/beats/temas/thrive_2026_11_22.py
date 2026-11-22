"""SWALLOWED WORDS — Thrive (Tacet Sin) · dark trap · 146 BPM · Bb menor

Concepto: achicarte hasta casi desaparecer. Te tragás lo que sentís, bajás la voz y te borrás de a
poco para que no se rompa la calma de lo que amás. Nadie lo ve; adentro, todo sigue sonando.

Emoción por sección:
  intro   — la kalimba dice la frase entera, bajito, como un recuerdo; sub grave y hiss de cuarto
  verso   — pocket para el rap: la llamada de la kalimba se TRAGA: cada repetición pierde notas,
            se apaga (filtro que se cierra, afinación que cae) y responde solo en los huecos
  gancho  — la frase por fin sale entera: kalimba abierta, contracanto, pad ancho (centro libre
            para el dúo), 808 que sube de octava
  puente  — la canción despojada: sin bombo, progresión del gancho, la llamada a media velocidad
  final   — la frase se va apagando nota a nota hasta quedar solo el sub y el soplido

Rasgo distintivo: "palabras tragadas" — la misma llamada de kalimba muteada; en los versos se
corta antes de terminar (verso 2 la borra casi por completo), en el gancho se dice completa.

Estructura (84 compases, 146 BPM, ~138 s):
  intro 4 · verso 16 · gancho 16 · verso 16 · gancho 16 · puente 8 · final 8
"""
import json
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, hz, t_arr, lp, hp, bp, poner, repitch, reverb_ir, con_reverb,
                      delay_pingpong, paneo, saturar, cinta, ochocientos, clap, pad)

BPM = 146
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SWING = 0.16 * S16
rng = np.random.default_rng(20261122)
SECS = [('intro', 4), ('verse', 16), ('chorus', 16), ('verse', 16), ('chorus', 16), ('bridge', 8), ('outro', 8)]

# acorde: (raíz del 808, triada para el pad)
CH = {'Bbm': (34, [58, 61, 65]), 'Gb': (30, [54, 58, 61]), 'Db': (37, [61, 65, 68]),
      'Ab': (32, [56, 60, 63]), 'Fm': (29, [53, 56, 60])}
VERSE = ['Bbm', 'Bbm', 'Gb', 'Fm']
CHOR = ['Bbm', 'Gb', 'Db', 'Ab']
# La llamada (2 compases): (compás, paso de 1/16, midi)
CALL = [(0, 0, 77), (0, 3, 75), (0, 6, 73), (0, 10, 70), (1, 2, 73), (1, 5, 70), (1, 8, 68), (1, 12, 70)]
KEEP_V = [[6, 6, 5, 5, 4, 4, 3, 2], [5, 4, 4, 3, 3, 2, 1, 0]]      # notas que sobreviven por repetición
KV = [[[0, 9], [0, 6, 10], [0, 9, 11], [0, 10, 14]], [[0, 3, 10], [0, 7], [0, 6, 9, 14], [0, 10]]]
KC = [[0, 6, 10], [0, 7, 10, 13], [0, 3, 6, 10], [0, 6, 10, 14]]
BRILLO_PAD = {'intro': 800, 'verse': 650, 'chorus': 1900, 'bridge': 700, 'outro': 600}
NIVEL_PAD = {'intro': .5, 'verse': .4, 'chorus': 1.0, 'bridge': .7, 'outro': .5}


# ── Instrumentos del tema ────────────────────────────────────────────────────
def kalimba(m, dur=1.3, mut=0.0, vel=1.0, lpf=2400):
    """Kalimba muteada; con 'mut' alto se traga: más corta, más oscura y la afinación cae."""
    t = t_arr(dur)
    f = hz(m) * (1 - 0.035 * mut * (1 - np.exp(-t * 3)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * (3.2 + 4 * mut)) + 0.3 * np.sin(ph * 5.4) * np.exp(-t * 24) \
        + 0.12 * np.sin(ph * 2) * np.exp(-t * 8)
    x += bp(rng.standard_normal(len(t)), 400, 2500) * np.exp(-t * 260) * 0.25   # golpe del pulgar
    return lp(x, lpf * (1 - 0.75 * mut) + 300) * vel * 0.45


def kick():
    t = t_arr(0.5)
    sub = np.sin(2 * np.pi * np.cumsum(46 + 9 * np.exp(-t * 18)) / SR) * np.exp(-t * 6)
    punch = np.sin(2 * np.pi * np.cumsum(60 + 170 * np.exp(-t * 60)) / SR) * np.exp(-t * 28)
    click = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 500) * 0.4
    return np.tanh((sub * 0.7 + punch * 0.9 + click) * 1.6)


def snare():
    t = t_arr(0.35)
    cuerpo = (np.sin(2 * np.pi * 185 * t) + 0.4 * np.sin(2 * np.pi * 330 * t)) * np.exp(-t * 22)
    ruido = bp(rng.standard_normal(len(t)), 1800, 9500) * np.exp(-t * 15)
    return np.tanh((cuerpo * 0.6 + ruido * 0.8) * 1.4)


def hat_metal(abierto=False):
    t = t_arr(0.35 if abierto else 0.07)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (210.5, 298.3, 375.2, 518.4, 545.1, 812.3))
    return hp(bp(x, 6500, 14500), 7500) * np.exp(-t * (10 if abierto else 60)) * 0.2


def swell(m, dur):
    """Sub grave y apagado que crece y se va."""
    t = t_arr(dur)
    x = np.sin(2 * np.pi * hz(m) * t) + 0.3 * np.sin(2 * np.pi * hz(m) * 2 * t)
    return paneo(lp(x, 220) * np.sin(np.pi * t / dur) ** 1.5 * 0.55, 0)


def riser(dur):
    t = t_arr(dur)
    return hp(lp(rng.standard_normal((2, len(t))), 5000), 600) * (t / dur) ** 2.5 * 0.3


def ms(st, mid, side):
    m, s = (st[0] + st[1]) / 2, (st[0] - st[1]) / 2
    return np.stack([m * mid + s * side, m * mid - s * side])


def hats_bar(c, grid, drop, base):
    """Hats de un compás: 1/16 u 1/8, y cada 4 compases cambia: roll 1/32, tresillos, fill."""
    ev = [[s, (1.0 if s % 4 == 0 else .55 if s % 2 == 0 else .38) * base, 1.0] for s in range(0, 16, grid)]
    ph = c % 4
    if drop:        # redoble 1/32 que sube antes de la entrada
        ev = [e for e in ev if e[0] < 8] + [[8 + j * .5, .25 + .7 * j / 16, 1 + .012 * j] for j in range(16)]
    elif ph == 3:   # tresillos que suben
        ev = [e for e in ev if e[0] < 12] + [[12 + j * 4 / 6, (.4 + .5 * j / 6) * base * 1.1, 1 + .05 * j] for j in range(6)]
    elif ph == 1:   # 1/32
        ev = [e for e in ev if e[0] not in (6, 7)] + [[6 + j * .5, (.35 + .15 * j) * base, 1 + .02 * j] for j in range(4)]
    elif ph == 2:   # tresillo corto
        ev = [e for e in ev if e[0] not in (10, 11)] + [[10 + j * 2 / 3, (.5 + .15 * j) * base, 1.0] for j in range(3)]
    return ev


def bass_notes(b, root, ks, prev, jump, fin=16):
    """808 sobre los bombos: silencios, salto de octava al final y glide solo hacia el tiempo 1."""
    out = []
    for i, s in enumerate(ks):
        nxt = ks[i + 1] if i + 1 < len(ks) else fin
        m = root + (12 if jump and i == len(ks) - 1 and i > 0 else 0)
        g = 0.11 if (i == 0 and prev is not None and prev != m) else 0
        out.append((b * COMPAS + s * S16, m, (nxt - s) * S16 * 0.85, g))
        prev = m
    return out, prev


# ── Composición ──────────────────────────────────────────────────────────────
def render():
    total = sum(l for _, l in SECS)
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ('drums', 'bajo', 'kal', 'pad', 'fx')}
    sc = np.zeros(N)
    K, SN, CL, H, HO = kick(), snare(), clap(), hat_metal(), hat_metal(True)
    ir, ir_s = reverb_ir(2.6, 3.0, 5500, 11), reverb_ir(0.5, 8, 7500, 12)
    hc, notes, starts = {}, [], []
    jt = lambda x=.004: rng.normal(0, x)
    vl = lambda: 1 - rng.uniform(0, .22)

    def hits(b, ev, lvl=1.0):
        for pos, v, p in ev:
            key = round(p, 2)
            if key not in hc:
                hc[key] = repitch(H, p)
            sw = SWING if pos == int(pos) and int(pos) % 2 else 0
            poner(bus['drums'], paneo(hc[key] * v * lvl * vl(), .3), b * COMPAS + pos * S16 + sw + jt(.002))

    def kicks(b, ks, lvl=1.0):
        for s in ks:
            t = b * COMPAS + s * S16 + jt(.002)
            poner(bus['drums'], paneo(K, 0) * .95 * lvl * vl(), t)
            poner(sc[None], np.exp(-t_arr(.25) * 14)[None], t)

    def snaps(b, steps, lvl, solo_clap=False):
        for s in steps:
            x = paneo(CL, -.06) * .6 * lvl if solo_clap else paneo(SN, .04) * .7 * lvl + paneo(CL, -.06) * .5 * lvl
            poner(bus['drums'], x * vl(), b * COMPAS + s * S16 + jt(.002))

    def llamada(b0, keep, mut0, oct_=0, speed=1, vel=1.0, lpf=2400, pan=.2, dmut=.07):
        for i, (bo, s, m) in enumerate(CALL):
            if i >= keep:
                break
            sw = SWING if (s % 2 and speed == 1) else 0
            t = b0 * COMPAS + (bo * 16 + s) * speed * S16 + sw + jt(.003)
            mut = min(1.0, mut0 + dmut * i)
            x = kalimba(m + 12 * oct_, 1.3 * speed, mut, vel * (1 - .5 * mut), lpf)
            poner(bus['kal'], paneo(x, pan * (1 if i % 2 else -.6)), t)

    b0, vi, ci, prev = 0, 0, 0, None
    for idx, (nm, l) in enumerate(SECS):
        starts.append(b0)
        vi += nm == 'verse'
        ci += nm == 'chorus'
        prog = VERSE if nm in ('intro', 'verse') else CHOR
        for c in range(l):
            b = b0 + c
            name = prog[c % 4]
            root, tri = CH[name]
            last = c == l - 1
            drop = last and (nm == 'verse' or (nm == 'chorus' and ci == 2) or nm == 'bridge')

            # Batería y 808
            if nm == 'intro':
                if c >= 2:
                    hits(b, hats_bar(c, 2, False, .3))
            elif nm in ('verse', 'chorus'):
                ver = nm == 'verse'
                ks = [0] if drop else (KV[vi - 1][c % 4] if ver else KC[c % 4])
                kicks(b, ks, .9 if ver else 1.0)
                if not drop:
                    snaps(b, [8], .75 if ver else 1.0)
                grid = 2 if (ver and vi == 1) else 1
                hits(b, hats_bar(c, grid, drop, (.8 if vi == 1 else .55) if ver else 1.0))
                if not ver and c % 2 == 1 and not drop:      # hat abierto a contratiempo, cortado
                    ho = HO[:int(2.2 * S16 * SR)].copy()
                    ho[-200:] *= np.linspace(1, 0, 200)
                    poner(bus['drums'], paneo(ho, -.25) * .7, b * COMPAS + 6 * S16 + SWING * 0)
                jump = (c % 4 == 3) if (ver and vi == 1) else (c % 2 == 1)
                nb, prev = bass_notes(b, root, ks, prev, jump and not drop, 7 if drop else 16)
                notes += nb
            elif nm == 'bridge':
                snaps(b, [4, 12], .5, solo_clap=True)        # clap a 2 y 4, sin bombo
                if drop:
                    hits(b, hats_bar(c, 4, True, .6))
                else:
                    hits(b, [[k * 4 / 3, (.5 if k % 3 == 0 else .25) * .6, 1.0] for k in range(12)])
                g = .22 if prev is not None and prev != root else 0
                if c % 4 == 3 and not drop:
                    notes += [(b * COMPAS, root, 7 * S16, g), (b * COMPAS + 8 * S16, root + 12, 6 * S16, .08)]
                    prev = root + 12
                else:
                    notes.append((b * COMPAS, root, (7 if drop else 15) * S16, g))
                    prev = root
            else:  # outro
                if c < 4:
                    kicks(b, [0], .8)
                    snaps(b, [8], .55)
                    hits(b, hats_bar(c, 2, False, .3))
                if c < 6:
                    nb, prev = bass_notes(b, root, [0], prev, False, 12 if c < 4 else 15)
                    notes += nb

            # Armonía grave y filtrada (no es un colchón constante)
            lv = NIVEL_PAD[nm] * (1 - .6 * c / l if nm == 'outro' else 1)
            poner(bus['pad'], pad(tri, COMPAS, BRILLO_PAD[nm], 3) * lv, b * COMPAS)

            # La llamada de kalimba
            if nm == 'intro' and c in (0, 2):
                llamada(b, 8 if c == 0 else 6, .1 + .2 * c / 2, vel=.7, lpf=1900)
            elif nm == 'verse' and c % 2 == 0:
                r = c // 2
                llamada(b, KEEP_V[vi - 1][r], .1 + .04 * r + .2 * (vi - 1), vel=.55, lpf=1800)
            elif nm == 'chorus':
                if c % 2 == 0:
                    llamada(b, 8, 0, vel=1.0, lpf=4200)
                    if ci == 2 or c % 8 >= 4:                # doble una octava arriba
                        llamada(b + .03 / COMPAS * 0 + 0, 8, .1, oct_=1, vel=.4, lpf=4500, pan=-.4)
                for s, ix in ((8, 1), (14, 2)) if c % 2 == 0 else ((4, 2), (14, 1)):   # contracanto
                    poner(bus['kal'], paneo(kalimba(tri[ix] + 12, 1.2, 0, .6, 3000), -.35), b * COMPAS + s * S16 + jt(.003))
            elif nm == 'bridge' and c in (0, 4):
                llamada(b, 8 if c == 0 else 5, .25 + .2 * c / 4, speed=2, vel=.8, lpf=1600)
            elif nm == 'outro' and c % 2 == 0:
                r = c // 2
                llamada(b, [6, 4, 3, 1][r], .3 + .15 * r, vel=.6 - .08 * r, lpf=1700)

            # Subs y risers
            if (nm == 'intro' and c in (0, 2)) or (nm == 'bridge' and c % 2 == 0):
                poner(bus['fx'], swell(root + 12, 2 * COMPAS) * .6, b * COMPAS)
            if nm == 'verse' and c == l - 2:
                poner(bus['fx'], riser(2 * COMPAS) * .6, b * COMPAS)
        b0 += l

    bajo = ochocientos(notes, N / SR, 2.8)
    bajo = lp(bajo + .3 * hp(np.tanh(bajo * 5), 150), 3500)       # distorsión con intención
    bus['bajo'] += paneo(bajo, 0) * .9

    # ── Mezcla ──
    scl = np.clip(sc, 0, 1)
    pad_b = con_reverb(ms(hp(bus['pad'], 140), .5, 1.5) * (1 - .35 * scl), ir, .4)
    kal = saturar(cinta(hp(bus['kal'], 180), .4, rng), .25)
    kal = con_reverb(delay_pingpong(kal, BEAT * .75, .4, .28) * (1 - .3 * scl), ir, .35)
    drums = con_reverb(saturar(bus['drums'], .3), ir_s, .06)
    fx = con_reverb(bus['fx'], ir, .25)
    mix = drums + bus['bajo'] * (1 - .3 * scl) * .95 + kal * 1.4 + pad_b * .8 + fx * .7

    # Dinámica: intro/final ~7 dB bajo el gancho, verso y puente por debajo
    secs_t = [(nm, s * COMPAS, (s + l) * COMPAS) for (nm, l), s in zip(SECS, starts)]
    rms = lambda a, b: np.sqrt(np.mean(mix[:, int(a * SR):int(b * SR)] ** 2) + 1e-12)
    cr = np.mean([rms(a, b) for nm, a, b in secs_t if nm == 'chorus'])
    tgt = {'intro': -7, 'verse': -2.5, 'bridge': -4.5, 'outro': -7, 'chorus': 0}
    g = np.ones(mix.shape[1])
    for nm, a, b in secs_t:
        g[int(a * SR):int(b * SR)] = np.clip(cr * 10 ** (tgt[nm] / 20) / rms(a, b), .4, 4)
    mix = hp(mix * lp(g, 2), 28)
    mix += lp(hp(rng.standard_normal(mix.shape), 2000), 8000) * .006      # soplido de cuarto

    mix = mix / (np.percentile(np.abs(mix), 99.95) + 1e-9) * .85
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    mix /= np.abs(mix).max() + 1e-9
    mix = mix[:, :int((total * COMPAS + 1.5) * SR)]
    mix[:, -int(1.5 * SR):] *= np.linspace(1, 0, int(1.5 * SR))
    secciones = [{"nombre": nm, "inicio": round(a, 2), "fin": round(b, 2), "compases": l}
                 for (nm, l), (_, a, b) in zip(SECS, secs_t)]
    return (mix * .95).T, secciones


if __name__ == '__main__':
    audio, secciones = render()
    sf.write(sys.argv[1], audio, SR, subtype='PCM_16')
    print('SECCIONES=' + json.dumps(secciones))
