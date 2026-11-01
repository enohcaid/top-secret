"""HOUSE LIGHTS — Tacet Sin · Thrive

Concepto: cuando se apagan los reflectores y se prenden las luces de la sala, él se queda solo
frente al escenario vacío. No se banca volver a ser uno más, así que vive esperando la próxima
función, aunque el escenario le coma la vida.

Emoción por sección:
  intro  — zumbido de tubo fluorescente que parpadea y se corta: la sala vacía, el silencio
  verse  — trap a medio tiempo, 808 que respira y un coro grave: él rumiando, con aire para el rap
  chorus — cuerdas staccato, bronces, coro ancho y campanas: el escenario que lo llama
  bridge — se rompe el ritmo: tresillos, coro agudo y arpegio de campanas para la voz de ella;
           el zumbido de las luces de sala queda prendido por primera vez
  outro  — se va la banda, queda el coro y al final solo el zumbido: él solo

Rasgo distintivo: el zumbido de las luces de la sala (armónicos de B2 con flicker de 60 Hz).
Cada vez que el beat se corta en seco (silencio tenso antes de entrar o al salir del gancho)
el zumbido prende con un clac de interruptor. En el puente se queda sostenido y en el final
queda como único sonido.

Estructura (84 compases, 140 BPM, si menor, ~144 s):
  intro 8 · verse 16 · chorus 8 · verse 16 · chorus 8 · bridge 8 · chorus 12 · outro 8
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from scipy.signal import fftconvolve

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch, reverb_ir,
                      delay_pingpong, paneo, saturar, bitcrush, ochocientos, clap, campana, vox)

BPM = 140
BEAT = 60 / BPM
BAR = 4 * BEAT
S = BEAT / 4
SW = 0.09 * S
rng = np.random.default_rng(20261101)

SECC = [('intro', 8), ('verse', 16), ('chorus', 8), ('verse', 16), ('chorus', 8),
        ('bridge', 8), ('chorus', 12), ('outro', 8)]
GAPB = [0, 1, 0, 1, 1, 1, 2, 0]                      # pulsos de silencio al final de cada sección
GSEC = {'intro': .5, 'verse': .8, 'chorus': 1., 'bridge': .8, 'outro': .5}
CH = [[47, 50, 54, 59], [43, 47, 50, 55], [47, 50, 54, 59], [42, 46, 49, 54]]   # Bm | G | Bm | F#
ROOT = [35, 31, 35, 30]
BR = [35, 31, 30, 35]
BRC = [0, 1, 3, 0]

# 808: (paso, semitonos sobre la raíz, largo en pasos, glide)
VP = [[(0, 0, 6, 0), (10, 0, 4, 0)],
      [(0, 0, 5, 0), (7, 12, 2, 0), (10, 0, 5, 0)],
      [(0, 0, 6, 0), (11, 0, 3, 0)],
      [(0, 0, 5, 0), (6, 0, 2, 0), (10, 0, 2, 0), (14, 12, 2, .06)]]
CP = [[(0, 0, 3, 0), (4, 12, 1, 0), (6, 0, 2, 0), (10, 0, 3, 0), (14, 7, 2, .05)],
      [(0, 0, 4, 0), (6, 12, 2, 0), (10, 0, 3, 0), (13, 0, 3, 0)],
      [(0, 0, 3, 0), (3, 0, 2, 0), (6, 0, 2, 0), (10, 12, 2, 0), (12, 7, 4, .06)],
      [(0, 0, 4, 0), (8, 0, 3, 0), (12, 5, 1, .04), (13, 3, 1, .04), (14, 0, 2, .04)]]

# Campanas (paso, midi): llamada de 4 compases y sus variantes
M1 = [[(0, 78), (5, 76), (10, 74)], [(4, 74), (8, 71)], [(0, 74), (6, 78), (9, 74)], [(2, 73), (12, 66)]]
M2 = [[(0, 78), (3, 79), (6, 78), (10, 76)], [(0, 74), (4, 76), (8, 74), (12, 71)],
      [(0, 78), (4, 81), (7, 79), (10, 78), (13, 76)], [(0, 73), (4, 70), (8, 66)]]
M3 = [[(0, 81), (4, 78), (8, 81), (12, 83)], [(0, 79), (3, 78), (6, 76), (10, 74)],
      [(0, 78), (6, 83), (10, 81), (13, 78)], [(0, 82), (6, 85), (8, 82), (12, 78)]]
CM = [M1, M2, M3]
VB = [{1: [(10, 78), (13, 76)], 3: [(9, 73)]},
      {1: [(10, 78), (13, 76)], 3: [(6, 73), (10, 70)], 0: [(14, 71)]}]


# ── Instrumentos del tema ────────────────────────────────────────────────────
def kick():
    t = t_arr(.5)
    sub = np.sin(2 * np.pi * np.cumsum(46 + 14 * np.exp(-t * 20)) / SR) * np.exp(-t * 6)
    punch = np.sin(2 * np.pi * np.cumsum(60 + 170 * np.exp(-t * 60)) / SR) * np.exp(-t * 28)
    click = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 400) * .4
    return np.tanh((sub * .8 + punch + click) * 1.6)


def snare():
    t = t_arr(.4)
    body = np.sin(2 * np.pi * np.cumsum(170 + 90 * np.exp(-t * 60)) / SR) * np.exp(-t * 22)
    ruido = bp(rng.standard_normal(len(t)), 1600, 9500) * np.exp(-t * 16)
    return np.tanh((body * .6 + ruido * .9) * 1.6) * .9


def hat_m(abierto=False):
    t = t_arr(.35 if abierto else .06)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (205.3, 304.4, 369.6, 522.7, 540.1, 812.8))
    x = hp(bp(x, 6000, 15000), 7000) * np.exp(-t * (9 if abierto else 75))
    return x / np.abs(x).max() * .5


def cuerda(m, dur=.13):
    t = t_arr(dur + .1)
    x = sum(saw(hz(m), t, d) for d in (-.006, 0, .006)) / 3
    return lp(x, 2800) * np.minimum(t / .006, 1) * np.exp(-t / (dur * .45)) * .5


def metal(m, dur=.42):
    t = t_arr(dur + .25)
    x = np.tanh(sum(saw(hz(m), t, d) for d in (-.008, 0, .008)) / 3 * 2.5)
    k = np.exp(-t * 7)
    return (lp(x, 3000) * k + lp(x, 650) * (1 - k)) * env_adsr(len(t), .02, .12, .55, .15, dur) * .45


def choir(ms, dur, vocal, cut, lev):
    n = int(dur * SR)
    out = np.zeros((2, n))
    for i, m in enumerate(ms):
        for d, p in ((-.14, -.6), (.14, .6)):
            x = vox(m + d, dur, vocal, rng)[:n]
            out[:, :len(x)] += paneo(x, p if i % 2 else -p)
    t = np.arange(n) / SR
    out = lp(out, cut) * np.clip(t / .7, 0, 1) * np.clip((dur - t) / .6, 0, 1)
    return out / (np.abs(out).max() + 1e-9) * lev


def swell(dur):
    t = t_arr(dur)
    x = np.stack([bp(rng.standard_normal(len(t)), 1800, 11000) for _ in range(2)])
    return x * (t / dur) ** 2.2 * .18


def hum_buf(dur, lvl, tick_out=False):
    """Zumbido de tubo fluorescente en B2 (con flicker de red) y clac de interruptor al prender."""
    t = t_arr(dur)
    x = sum(np.sin(2 * np.pi * k * hz(47) * t + k) / k ** .8 for k in range(1, 8))
    x += lp(hp(rng.standard_normal(len(t)), 400), 2500) * .6
    x = lp(x * (1 + .12 * np.sin(2 * np.pi * 60 * t)), 1800)
    x = x / np.abs(x).max() * lvl * np.clip(t / .004, 0, 1) * np.clip((dur - t) / .03, 0, 1)
    gate = np.ones(len(t))
    gate[int(.03 * SR):int(.05 * SR)] = 0
    gate[int(.08 * SR):int(.09 * SR)] = .2
    x *= gate
    tt = t_arr(.08)
    tk = (hp(rng.standard_normal(len(tt)), 2500) * np.exp(-tt * 420) * .7
          + np.sin(2 * np.pi * 85 * tt) * np.exp(-tt * 55) * .9) * lvl
    x[:len(tk)] += tk
    if tick_out and dur > .2:
        x[-len(tk):] += tk
    return x


def roll(s0, ln, n, v0, v1, rise):
    return [(s0 + ln * j / n, v0 + (v1 - v0) * j / max(1, n - 1), 1 + rise * j / n) for j in range(n)]


def hats(cb, dens, var, gap):
    """Patrón de hats por compás: 1/8 o 1/16, con redobles 1/32 y tresillos que cambian cada frase."""
    st = 1 if dens == 2 else 2
    ev = [(s, 1. if s % 4 == 0 else .62 if s % 2 == 0 else .4, 1.) for s in range(0, 16, st)]
    if dens == 1:
        ev = [e for e in ev if e[0] % 4 == 0 or rng.random() > .12]
        ev += [(s, .35, 1.) for s in ((3, 11) if var % 4 == 1 else (7, 13) if var % 4 == 3 else ())]
    cut = lambda a: [e for e in ev if e[0] < a]
    if gap:
        return cut(8) + roll(8, 4, 8, .3, 1., .5)
    if cb == 3:
        f = var % 3
        if f == 0:
            return cut(12) + roll(12, 4, 8, .35, 1., .4)
        if f == 1:
            return cut(8) + roll(8, 8, 6, .4, 1., .3)
        return cut(10) + roll(10, 2, 3, .5, .8, 0.) + roll(12, 4, 8, .4, 1., -.3)
    if cb == 1 and var % 2:
        return cut(6) + roll(6, 2, 3, .5, .8, 0.) + [e for e in ev if e[0] >= 8]
    return ev


# ── Render ───────────────────────────────────────────────────────────────────
def render():
    nb = sum(n for _, n in SECC)
    total = nb * BAR + 2.0
    N = int(total * SR)
    B = {k: np.zeros((2, N)) for k in ('dr', 'snr', 'ch', 'bell', 'str', 'hum')}
    sc = np.zeros(N)
    notas, gaps, hums, secs = [], [], [], []
    K, SN, CL, H, HO = kick(), snare(), clap(), hat_m(), hat_m(True)
    HOc = HO[:int(2.4 * S * SR)].copy()
    HOc[-300:] *= np.linspace(1, 0, 300)
    cache = {}
    last_p = 35

    def bells(ev, t0, vol):
        for j, (s, m) in enumerate(ev):
            if m not in cache:
                cache[m] = campana(m, 1.6)
            poner(B['bell'], paneo(cache[m], .35 if j % 2 else -.25) * vol, t0 + s * S + rng.normal(0, .003))

    def hatbar(t0, ev, vol):
        for s, v, r in ev:
            ts = t0 + s * S + (SW if s == int(s) and int(s) % 2 else 0) + rng.normal(0, .0025)
            h = H if r == 1 else repitch(H, r)
            poner(B['dr'], paneo(h * v * vol * rng.uniform(.8, 1), .25 if int(s) % 2 else -.15), ts)

    def kicks(t0, steps, v=.95):
        for s in steps:
            tk = t0 + s * S + rng.normal(0, .002)
            poner(B['dr'], paneo(K, 0) * v * rng.uniform(.9, 1), tk)
            poner(sc[None], np.exp(-t_arr(.3) * 12)[None], tk)

    def caja(t0, v, cl, send):
        tt = t0 + 8 * S + rng.normal(0, .002)
        poner(B['dr'], paneo(SN, .03) * v, tt)
        poner(B['dr'], paneo(CL, -.05) * cl, tt)
        if send:
            poner(B['snr'], paneo(SN, 0) * send, tt)

    def bajo(pat, t0, cb, gap):
        nonlocal last_p
        pat = [p for p in pat if p[0] < 8] if gap else pat
        for s, off, l, g in pat:
            m = ROOT[cb] + off
            if g == 0 and s == 0 and m != last_p:
                g = .12                                   # desliza hacia el tiempo fuerte
            notas.append((t0 + s * S, m, l * S * .96, g))
            last_p = m
        return [s for s, off, l, g in pat if off == 0 and l >= 2]

    def cuerdas(t0, ch, vol):
        for j, (s, i) in enumerate(zip((0, 3, 6, 10, 12, 13), (1, 2, 3, 2, 1, 0))):
            poner(B['str'], paneo(cuerda(ch[i] + 12), .6 if j % 2 else -.6) * vol * rng.uniform(.8, 1),
                  t0 + s * S + rng.normal(0, .003))

    c0 = 0
    cnt = {'verse': 0, 'chorus': 0}
    for si, (nm, n) in enumerate(SECC):
        k = cnt.get(nm, 0)
        gb = GAPB[si]
        ini = c0 * BAR
        for c in range(n):
            t0 = (c0 + c) * BAR
            cb, ph, ch = c % 4, c // 4, CH[c % 4]
            gap = bool(gb) and c == n - 1
            if nm == 'intro':
                if c >= 2:
                    bells(M1[cb], t0, .45)
                if c >= 2 and c % 2 == 0:
                    poner(B['ch'], choir([ch[0] + 12, ch[2] + 12], 2.3 * BAR, 'o', 900, .18), t0)
                if c >= 4:
                    hatbar(t0, hats(cb, 1, ph, gap), .5)
                    if c % 2 == 0:
                        notas.append((t0, ROOT[cb], BAR * 1.7, .2 if ROOT[cb] != last_p else 0))
                        last_p = ROOT[cb]
            elif nm == 'verse':
                kicks(t0, bajo(VP[(cb + k) % 4], t0, cb, gap))
                caja(t0, .75, .25, .3)
                hatbar(t0, hats(cb, 1, ph + k, gap), .8)
                poner(B['ch'], choir([ch[0], ch[2]], BAR * 1.1, 'o', 700, .15 + .06 * k), t0)
                bells(VB[k].get(cb, []), t0, .4)
                if c % 8 == 7 or (k == 1 and cb == 3):    # cuerdas tensas en semicorcheas
                    for j in range(8):
                        poner(B['str'], paneo(cuerda(59, .1), 0) * (.2 + .05 * j), t0 + (4 + j) * S)
            elif nm == 'chorus':
                kicks(t0, bajo(CP[(cb + k) % 4], t0, cb, gap), 1.0)
                caja(t0, .85, .6, .6)
                if cb == 1 and k >= 1:
                    poner(B['dr'], paneo(SN, 0) * .2, t0 + 11 * S)
                hatbar(t0, hats(cb, 2, ph + k, gap), .85)
                if cb in (0, 2) and not gap:
                    poner(B['dr'], paneo(HOc, -.3) * .45, t0 + 6 * S)
                poner(B['ch'], choir([ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[3]], BAR * 1.1,
                                     'a' if cb % 2 else 'o', 2200, .3), t0)
                cuerdas(t0, ch, .55)
                if not gap:
                    if cb in (0, 2):
                        for m in (ch[0], ch[2], ch[3]):
                            poner(B['str'], paneo(metal(m), 0) * .8, t0)
                    if k >= 1 and cb == 3:
                        for m in (ch[0], ch[2], ch[3]):
                            poner(B['str'], paneo(metal(m, .3), 0) * .6, t0 + 10 * S)
                bells(CM[k][cb], t0, .7)
                if k == 2:
                    bells([(s, m - 12) for s, m in M1[cb]], t0, .4)   # línea nueva en el último gancho
            elif nm == 'bridge':
                bc = BRC[c // 2]
                chb = CH[bc]
                if c in (0, 4):
                    kicks(t0, [0], .9)
                if c % 4 >= 2:
                    caja(t0, .6, .3, .5)
                for j in range(9 if gap else 12):
                    poner(B['dr'], paneo(H * [1, .4, .55][j % 3] * .5 * rng.uniform(.8, 1), .25 if j % 2 else -.15),
                          t0 + j * BEAT / 3 + rng.normal(0, .002))
                if gap:
                    hatbar(t0, roll(8, 4, 8, .3, 1., .5), .5)
                if c % 2 == 0:
                    notas.append((t0, BR[c // 2], BAR * 1.85, .25 if BR[c // 2] != last_p else 0))
                    last_p = BR[c // 2]
                    poner(B['ch'], choir([chb[2] + 12, chb[3] + 12, chb[1] + 24], 2.3 * BAR, 'a', 3200, .3), t0)
                arp = [0, 2, 1, 3, 2, 1, 3, 2]
                for j, s in enumerate(range(0, 16, 2)):
                    if rng.random() < .8:
                        bells([(s, chb[arp[j]] + 24)], t0, .5)
                if c >= 4:
                    cuerdas(t0, chb, .25)
            else:
                if c < 4:
                    if c % 2 == 0:
                        kicks(t0, [0], .8)
                        notas.append((t0, ROOT[cb], BAR * 1.8, .2 if ROOT[cb] != last_p else 0))
                        last_p = ROOT[cb]
                    caja(t0, .55, .15, .3)
                    if c < 2:
                        hatbar(t0, hats(cb, 1, 0, False), .35)
                    bells(M1[cb], t0, .4)
                if c < 8:
                    poner(B['ch'], choir([ch[0] + 12, ch[2] + 12], BAR * 1.1, 'o', 800, .2 * (1 - c / 9)), t0)
                if c == 6:
                    bells([(0, 71)], t0, .5)
        end = (c0 + n) * BAR
        if gb:
            gaps.append((end - gb * BEAT, end))
            hums.append((end - gb * BEAT, gb * BEAT, .55, False))
            poner(B['dr'], swell(BAR * .9), end - gb * BEAT - BAR * .9)
        if nm == 'bridge':
            hums.append((ini, n * BAR, .12, False))
        if nm == 'outro':
            hums.append((ini + 4 * BAR, nb * BAR + 1.5 - ini - 4 * BAR, .45, False))
        secs.append({"nombre": nm, "inicio": round(ini, 3), "fin": round(end, 3), "compases": n})
        if nm in cnt:
            cnt[nm] += 1
        c0 += n
    hums.insert(0, (0.0, BAR * 1.5, .6, True))
    for a, d, lvl, to in hums:
        poner(B['hum'], paneo(hum_buf(d, lvl, to), 0), a)

    # ── Mezcla ──
    mask = np.ones(N)
    for a, b in gaps:
        mask[int(a * SR):int(b * SR)] = 0
    mask = np.clip(lp(mask, 70, 1), 0, 1)
    ir_s = reverb_ir(.5, 9, 7000, seed=5)
    ir = reverb_ir(3.2, 2.4, 5000, seed=11)
    bass = paneo(ochocientos(notas, total, 2.8)[:N], 0) * .85 * mask * (1 - .45 * np.clip(sc, 0, 1))
    dr = saturar(B['dr'] * mask, .3)
    dr = dr * .94 + np.stack([fftconvolve(dr[c], ir_s[c])[:N] for c in range(2)]) * .06
    ch = hp(B['ch'] * mask, 120)
    bell = lp(bitcrush(hp(B['bell'] * mask, 300), .2), 8000)
    bell = delay_pingpong(saturar(bell, .2), BEAT * .75, .4, .3)
    st = saturar(hp(B['str'] * mask, 200), .3)
    send = B['snr'] * mask + ch * .9 + bell * .5 + st * .5
    wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
    mix = dr + bass + ch * .8 + bell * .7 + st * .7 + wet * .5

    g = np.ones(N)
    for s in secs:
        g[int(s['inicio'] * SR):int(s['fin'] * SR)] = GSEC[s['nombre']]
    kk = int(.3 * SR)
    gp = np.pad(g, (kk, kk), 'edge')
    g = fftconvolve(gp, np.ones(kk) / kk, 'valid')[kk // 2:kk // 2 + N]
    mix = hp(mix * g[None] + B['hum'], 28)
    mix = mix / (np.percentile(np.abs(mix), 99.95) + 1e-9) * .85
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    mix /= np.abs(mix).max() + 1e-9
    mix = mix[:, :int((nb * BAR + 1.5) * SR)]
    mix[:, -int(1.5 * SR):] *= np.linspace(1, 0, int(1.5 * SR))
    return (mix * .95).T, secs


if __name__ == '__main__':
    audio, secs = render()
    sf.write(sys.argv[1], audio, SR, subtype='PCM_16')
    print('SECCIONES=' + json.dumps(secs))
