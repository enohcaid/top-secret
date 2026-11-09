"""WHERE I END — Tacet Sin, "Thrive" (instrumental, 144 BPM, G# minor)

Concept: losing the border between yourself and what you love. You melted so far into
the night, its rhythm and its fever, that letting go feels like leaving nobody behind
to do the letting go.

Emotion per section:
  intro  — cello drone and one lonely harp line: the self before the merge, still audible
  verse  — half-time pocket for the rap; the call sits low and thin, answering in the gaps
  chorus — the call becomes a bell over a detuned harp arpeggio and a cello counter-line:
           two voices that cannot be told apart; opens up and widens, centre left free
  bridge — the song stripped down: no kick, chorus progression, the call at half speed and
           then MIRRORED (each note reflected around G#): the self seen in its own reflection
  final chorus — same chorus, denser, a register higher, clap doubling in the last bars

Distinctive trait: "the call" (harp/bell motif) is reflected into itself. It appears low and
thin in the verse, as a bell in the chorus, and in the bridge it slows to half speed and turns
into its own mirror image, so you cannot tell which version is the original.

Structure (84 bars, 144 BPM, 140 s):
  intro 4 · verse 16 · chorus 12 · verse 16 · chorus 12 · bridge 8 · chorus 16
Instruments (the whole song): detuned harp, FM bell, cello, 808 + layered kick, clap/snare, metal hats, rim.
"""
import json
import os
import sys
from functools import lru_cache

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, hz, t_arr, lp, hp, bp, env_adsr, poner, repitch, reverb_ir, con_reverb,
                      delay_pingpong, paneo, saturar, ochocientos, clap, campana, cinta, vinilo)

BPM = 144
BEAT = 60 / BPM
BAR = 4 * BEAT
S = BEAT / 4
rng = np.random.default_rng(20261109)
R = np.random.default_rng(5)
PCS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
SCALE = [0, 2, 3, 5, 7, 8, 10]


def n(x):
    return 12 * (int(x[-1]) + 1) + PCS[x[0]] + (1 if '#' in x else 0)


def espejo(m, pivot=80):
    """Reflect a note around G# (pivot) in scale degrees: stays inside G# minor."""
    o, iv = divmod(m - pivot, 12)
    g = -(7 * o + SCALE.index(iv))
    o2, k = divmod(g, 7)
    return pivot + 12 * o2 + SCALE[k]


VPROG = ['G#m', 'G#m', 'E', 'D#m']
CPROG = ['E', 'D#m', 'G#m', 'F#']
VOI = {'G#m': ['G#4', 'B4', 'D#5', 'G#5'], 'E': ['E4', 'G#4', 'B4', 'E5'],
       'D#m': ['D#4', 'F#4', 'A#4', 'D#5'], 'F#': ['F#4', 'A#4', 'C#5', 'F#5']}
CEL = {'G#m': n('G#2'), 'E': n('E2'), 'D#m': n('D#2'), 'F#': n('F#2')}
B808 = {'G#m': 32, 'E': 28, 'D#m': 27, 'F#': 30}
LINE = [n('B3'), n('A#3'), n('D#4'), n('C#4')]

# The call: 4 bars, (16th step, note, length)
CALL_V = [[(0, 'D#5', 3), (7, 'C#5', 2), (10, 'B4', 4)], [(4, 'G#4', 3), (12, 'A#4', 3)],
          [(0, 'B4', 4), (6, 'G#4', 3), (11, 'E4', 4)], [(2, 'F#4', 3), (8, 'A#4', 3), (14, 'D#5', 2)]]
CALL_C = [[(0, 'G#5', 3), (6, 'E5', 3), (10, 'B4', 4)], [(0, 'F#5', 3), (8, 'D#5', 3), (12, 'A#4', 3)],
          [(0, 'G#5', 2), (4, 'B5', 2), (8, 'D#6', 4), (13, 'B5', 2)], [(0, 'A#5', 3), (6, 'F#5', 3), (10, 'C#5', 5)]]
ARP = [(0, 0), (3, 1), (6, 2), (8, 3), (11, 2), (14, 1), (2, 3), (4, 2), (10, 3), (12, 1), (15, 2)]
SECS = [('intro', 4), ('verse', 16), ('chorus', 12), ('verse', 16), ('chorus', 12), ('bridge', 8), ('chorus', 16)]


# ── Instruments ──────────────────────────────────────────────────────────────
@lru_cache(None)
def harp(m, br):
    """Harp with two detuned strings per note."""
    t = t_arr(1.6)
    f = hz(m)
    x = np.zeros_like(t)
    for det in (-0.007, 0.006):
        for h in range(1, 7):
            x += np.sin(2 * np.pi * f * h * (1 + det) * t * (1 + 0.0005 * h * h)) * np.exp(-t * (2.2 + 1.6 * h)) / h
    x += hp(np.random.default_rng(int(m)).standard_normal(len(t)), 2500) * np.exp(-t * 200) * 0.15
    return lp(x, br) * 0.22


@lru_cache(None)
def bell(m):
    return campana(m, 2.2)


@lru_cache(None)
def cello(m, br):
    t = t_arr(BAR + 1.5)
    f = hz(m) * (1 + 0.004 * np.sin(2 * np.pi * 5 * t) * np.clip(t - 0.4, 0, 1))
    ph = np.cumsum(f) / SR
    x = sum(2 * (ph * (1 + d) - np.floor(ph * (1 + d) + 0.5)) for d in (-0.004, 0.0, 0.004)) / 3
    return lp(x, br, 2) * env_adsr(len(t), 0.7, 0.3, 0.85, 1.0, BAR) * 0.2


def bombo2():
    t = t_arr(0.5)
    sub = np.sin(2 * np.pi * np.cumsum(46 + 90 * np.exp(-t * 30)) / SR) * np.exp(-t * 6)
    punch = np.sin(2 * np.pi * np.cumsum(70 + 260 * np.exp(-t * 90)) / SR) * np.exp(-t * 35)
    click = hp(R.standard_normal(len(t)), 3000) * np.exp(-t * 400) * 0.4
    return np.tanh((sub * 0.9 + punch * 0.7 + click) * 2.0)


def clap_snare():
    t = t_arr(0.35)
    body = (np.sin(2 * np.pi * 190 * t) + 0.4 * np.sin(2 * np.pi * 330 * t)) * np.exp(-t * 22) * 0.5
    ruido = bp(R.standard_normal(len(t)), 1800, 9000) * np.exp(-t * 16) * 0.4
    return np.tanh(clap()[:len(t)] * 0.8 + body + ruido)


def rim():
    t = t_arr(0.08)
    return np.tanh((np.sin(2 * np.pi * 1700 * t) + hp(R.standard_normal(len(t)), 3000) * 0.5) * np.exp(-t * 130))


def hat_metal(abierto=False):
    t = t_arr(0.35 if abierto else 0.07)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (210.5, 298.3, 375.2, 518.4, 545.1, 812.3))
    return hp(bp(x, 6500, 14500), 7500) * np.exp(-t * (10 if abierto else 60)) * 0.2


def riser():
    t = t_arr(BAR)
    x = np.stack([bp(R.standard_normal(len(t)), 1500, 10000) for _ in range(2)])
    return x * (t / BAR) ** 2.5 * 0.22


# ── Patterns ─────────────────────────────────────────────────────────────────
def kicks(nom, c, v):
    if nom == 'verse':
        return ([[0, 10], [0, 6, 11], [0, 3, 10], [0, 7, 10, 14]] if v == 0 else
                [[0, 6, 10], [0, 3, 7, 11], [0, 5, 10], [0, 4, 7, 13]])[c % 4]
    if nom == 'chorus':
        return [[0, 3, 6, 10], [0, 6, 10, 13], [0, 3, 6, 10], [0, 6, 10, 14]][c % 4]
    return []


def bajo(nom, c, v, ks, drop):
    """808 line: (step, interval, length in steps, glide in seconds). Breathes: rests, octave jumps, slides."""
    if nom == 'intro':
        return [(0, 0, 10, 0)] if c == 3 else []
    if nom == 'bridge':
        return [(0, [0, 0, 12, 0][c % 4], 14, 0.22)]
    if drop:
        return [(0, 0, 6, 0.12)]
    out = []
    for i, s in enumerate(ks):
        last = i == len(ks) - 1
        ln = min(6, 16 - s) if last else ks[i + 1] - s - 1
        iv = 0
        if nom == 'verse':
            if last and c % 4 in (1, 3):
                iv = 12
            if v == 1 and i == 1 and c % 4 == 0:
                iv = 12
        else:
            if i == 1 and c % 2 == 1:
                iv = 12
            if last and c % 4 == 3:
                iv = 7
        out.append((s, iv, ln, 0.14 if s == 0 else (0.07 if iv else 0)))
    return out


def hats(nom, c, v):
    """Hat events (step, velocity, pitch ratio) + open-hat step. Pattern changes every 4 bars, rolls and triplets at phrase ends."""
    if nom == 'intro' and c < 2:
        return [], None
    rb = np.random.default_rng(11 + c // 4 + 37 * v + (5 if nom == 'chorus' else 0))
    if nom == 'bridge':
        base = [(k * 16 / 12, 0.7 if k % 3 == 0 else 0.35, 1.0) for k in range(12)]
    else:
        g = {'intro': 4, 'verse': 2, 'chorus': 1}[nom]
        base = []
        for s in range(0, 16, g):
            if s % 4 and rb.random() < 0.14:
                continue
            base.append((s, [1, .38, .62, .38][s % 4] * (.85 if nom == 'verse' else 1), 1.0))
            if nom == 'verse' and v == 1 and s % 4 == 2 and rb.random() < 0.5:
                base.append((s + 1, .3, 1.0))
    fa, fb = (10, 14) if nom == 'chorus' else (12, 16)
    fill = nom in ('verse', 'chorus') and c % 4 == 1
    ev = [(s, vel, ra) for s, vel, ra in base if not (c % 4 == 3 and s >= 12) and not (fill and fa <= s < fb)]
    if fill:
        ev += [(fa + j * 4 / 3, .5 + .1 * j, 1.0) for j in range(3)]
    if c % 4 == 3:
        if ('trip', 'r32', 'r32')[(c // 4 + v) % 3] == 'trip':
            ev += [(12 + j * 4 / 6, .35 + .6 * j / 6, 1 + .05 * j) for j in range(6)]
        else:
            ev += [(12 + j * .5, .3 + .6 * j / 8, 1 + .05 * j) for j in range(8)]
    op = None
    if nom == 'verse' and c % 4 in (1, 3) and c % 4 != 3:
        op = 6
    if nom == 'chorus' and c % 2 == 1 and c % 4 != 3:
        op = 14
    return ev, op


# ── Render ───────────────────────────────────────────────────────────────────
def render():
    total = sum(c for _, c in SECS)
    N = int((total * BAR + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ('bat', 'har', 'cam', 'cel', 'fx')}
    sc = np.zeros(N)
    K, CL, RM, H, HO, RS = bombo2(), clap_snare(), rim(), hat_metal(), hat_metal(True), riser()
    ir = reverb_ir(dur=3.6, decay=1.5, brillo=5000, seed=11)
    ir_s = reverb_ir(dur=0.5, decay=8, brillo=7000, seed=12)
    cache = {}

    def rep(x, r, tag):
        k = (tag, round(r, 2))
        if k not in cache:
            cache[k] = x if abs(r - 1) < 0.005 else repitch(x, r)
        return cache[k]

    jit = lambda s=0.004: rng.normal(0, s)
    notas, ini = [], []
    v = ch = -1
    c0 = 0
    for nom, largo in SECS:
        ini.append(c0)
        v += nom == 'verse'
        ch += nom == 'chorus'
        for c in range(largo):
            t0 = (c0 + c) * BAR
            at = lambda s: t0 + s * S + (0.1 * S if s == int(s) and int(s) % 2 else 0)
            ac = (VPROG if nom in ('intro', 'verse') else CPROG)[c % 4]
            drop = c == largo - 1 and nom != 'chorus'
            vv = v if nom == 'verse' else max(ch, 0)

            # Cello: drone, fifth and counter-line
            br = {'intro': 450, 'verse': 520, 'chorus': 1300, 'bridge': 700}[nom]
            gc = {'intro': .9, 'verse': .7, 'chorus': .8, 'bridge': .9}[nom]
            poner(bus['cel'], paneo(cello(CEL[ac], br), -.1) * gc, t0)
            if nom in ('chorus', 'bridge'):
                poner(bus['cel'], paneo(cello(CEL[ac] + 7, br), .15) * gc * .5, t0)
            if (nom == 'chorus' and ch >= 1) or nom == 'bridge':
                poner(bus['cel'], paneo(cello(LINE[c % 4] + (12 if ch == 2 and nom == 'chorus' else 0), 1500), .3) * .6, t0)

            # Harp / bell: the call
            if nom in ('intro', 'verse') and not (nom == 'intro' and c == 0):
                sh = -12 if (nom == 'intro' or v == 0) else 0
                for s, nm, l in CALL_V[c % 4]:
                    poner(bus['har'], paneo(harp(n(nm) + sh, 2200), .2) * (.5 if nom == 'verse' else .45) * (1 - rng.uniform(0, .2)), at(s) + jit())
                if nom == 'verse' and v == 1 and c % 4 in (1, 3):
                    for s, nm in ((12, 'A#5'),) if c % 4 == 1 else ((13, 'F#5'),):
                        poner(bus['cam'], paneo(bell(n(nm)), .3) * .45, at(s) + jit())
            if nom == 'chorus':
                k = c // 4
                dens = 1 + (k >= 2) + (ch == 2)
                for i, (s, ix) in enumerate(ARP[:6] if dens == 1 else ARP):
                    if rng.random() < .08:
                        continue
                    m = n(VOI[ac][ix])
                    poner(bus['har'], paneo(harp(m, 5200), .6 * np.sin(i * 1.9)) * .55 * (1 - rng.uniform(0, .25)), at(s) + jit())
                    if dens == 3 and i % 2 == 0:
                        poner(bus['har'], paneo(harp(m + 12, 5200), -.5) * .25, at(s) + S * .5)
                for s, nm, l in CALL_C[c % 4]:
                    m = n(nm)
                    poner(bus['cam'], paneo(bell(m), .3) * .9, at(s) + jit())
                    if k == 1:
                        poner(bus['cam'], paneo(bell(m - 12), -.3) * .35, at(s) + jit())
                    if k >= 2:
                        poner(bus['cam'], paneo(bell(m + 12), -.4) * .3, at(s) + S * .5)
            if nom == 'bridge':
                half = c % 2
                for s, nm, l in CALL_C[(c // 4) * 2 + (c % 4) // 2]:
                    if (half == 0 and s < 8) or (half == 1 and s >= 8):
                        m = n(nm)
                        m = (espejo(m) if c >= 4 else m) - 12
                        poner(bus['cam'], paneo(bell(m), .2) * .9, t0 + (s - 8 * half) * 2 * S + jit())
                for i, s in enumerate((0, 4, 8, 12)):
                    poner(bus['har'], paneo(harp(n(VOI[ac][i]) - 12, 2200), -.3 + .2 * i) * .4, at(s) + jit())

            # Drums
            ks = [0] if (drop and nom == 'verse') else ([] if drop else kicks(nom, c, vv))
            for s in ks:
                poner(bus['bat'], paneo(K, 0) * .95 * (1 - rng.uniform(0, .1)), t0 + s * S + jit(.002))
                poner(sc, np.exp(-t_arr(.3) * 12), t0 + s * S)
            if nom in ('verse', 'chorus') and not drop:
                poner(bus['bat'], paneo(CL, .05) * .8 * (1 - rng.uniform(0, .1)), t0 + 8 * S + jit(.002))
                if nom == 'chorus' and ch == 2 and c >= 12:
                    for s in (4, 12):
                        poner(bus['bat'], paneo(CL, -.05) * .5, t0 + s * S + jit(.002))
                if nom == 'verse' and v == 1:
                    poner(bus['bat'], paneo(RM, -.3) * .35, at(11 if c % 2 else 14))
            if nom == 'bridge' and not drop:
                poner(bus['bat'], paneo(RM, -.2) * .4, t0 + 8 * S)
            if drop and nom != 'intro':
                for j in range(8):
                    poner(bus['bat'], paneo(rep(CL, 1 + j * .04, 'cl'), 0) * (.25 + .06 * j), t0 + (8 + j) * S)
            if drop:
                poner(bus['fx'], RS * (.6 if nom == 'intro' else 1.0), t0)
            ev, op = hats(nom, c, vv)
            for s, vel, ra in ev:
                poner(bus['bat'], paneo(rep(H, ra, 'h'), .3) * vel * .5 * (1 - rng.uniform(0, .25)), at(s) + jit(.002))
            if op is not None:
                ho = HO[:int(2.2 * S * SR)].copy()
                ho[-200:] *= np.linspace(1, 0, 200)
                poner(bus['bat'], paneo(ho, -.25) * .4, at(op))

            # 808
            for s, iv, ln, gl in bajo(nom, c, vv, ks, drop):
                notas.append((t0 + s * S, B808[ac] + iv, ln * S, gl))
        c0 += largo

    # ── Mix ──
    sc = np.clip(sc, 0, 1)
    duck = lambda x, a: x * (1 - a * sc)
    baj = np.tanh(paneo(ochocientos(notas, N / SR, 2.6), 0) * 1.6) * .9
    baj = duck(baj, .2)
    har = cinta(hp(bus['har'], 180), .45, rng)
    har = con_reverb(delay_pingpong(duck(saturar(har, .25), .3), BEAT * .75, .4, .25), ir, .45)
    cam = cinta(hp(bus['cam'], 250), .3, rng)
    cam = con_reverb(delay_pingpong(duck(saturar(cam, .3), .3), BEAT * .75, .4, .3), ir, .5)
    cel = con_reverb(duck(hp(bus['cel'], 40), .25), ir, .35)
    bat = con_reverb(saturar(bus['bat'], .3), ir_s, .08)
    mix = bat * 1.0 + baj * .9 + har * .9 + cam * .85 + cel * .85 + bus['fx']
    del bat, baj, har, cam, cel

    g = np.ones(N)
    gains = {'intro': .42, 'verse': .78, 'chorus': 1.0, 'bridge': .72}
    for (nom, largo), i0 in zip(SECS, ini):
        g[int(i0 * BAR * SR):int((i0 + largo) * BAR * SR)] = gains[nom]
    mix = mix * lp(g, 3)
    mix = hp(mix, 28)
    mix = mix / (np.percentile(np.abs(mix), 99.95) + 1e-9) * .85
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    mix /= np.abs(mix).max() + 1e-9
    mix += vinilo(mix.shape[1], .8, rng)                       # tape hiss + crackle
    fin = int((total * BAR + 2.5) * SR)
    mix = mix[:, :fin]
    mix[:, -int(2 * SR):] *= np.linspace(1, 0, int(2 * SR))
    mix /= np.abs(mix).max() + 1e-9
    secs = [{'nombre': nom, 'inicio': round(i0 * BAR, 2), 'fin': round((i0 + largo) * BAR, 2), 'compases': largo}
            for (nom, largo), i0 in zip(SECS, ini)]
    return (mix * .95).T, secs


if __name__ == '__main__':
    audio, secs = render()
    sf.write(sys.argv[1], audio, SR, subtype='PCM_16')
    print('SECCIONES=' + json.dumps(secs))
