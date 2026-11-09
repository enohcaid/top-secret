"""CRIMSON TIDE — Tacet Sin, álbum "Thrive" (instrumental, 74 BPM, mi menor)

Concepto: aferrarse a la promesa de algo más aunque el sabor ya sea amargo y la marea
arrastre. Lo familiar duele, pero es lo conocido y se vuelve a pedir otro trago.

Emoción por sección:
  intro      — campana lejana, piano grave y pad oscuro: el sabor que se reconoce antes de probarlo
  verso      — 808 que respira, hats con tresillos, campana que contesta en los huecos: la rutina
               de volver, con bolsillo para el rap (medios casi vacíos)
  pre-gancho — sin bombo, hats en tresillos y redoble que sube, corte en seco: la marea que se retira
  gancho     — bombo + 808 deslizante, coro 'o' ancho y la llamada de campana: la marea sube,
               hay un hueco al centro para el dúo
  puente     — la canción despojada: progresión del gancho sin bombo, la llamada a MEDIA velocidad
               y una octava abajo, 808 largo: ahogarse despacio
  final      — la llamada se apaga con piano y pad: queda el regusto

Rasgo distintivo: "la llamada" (motivo de campana) es la marea. En el verso solo responde en los
huecos, en el gancho llega completa, en el último gancho sube una octava, en el puente
se arrastra a media velocidad y en el final se disuelve. Mismos instrumentos todo el tema
(campana, piano, pad, coro, 808, kit propio).

Estructura (44 compases, 74 BPM, ~143 s):
  intro 4 · verso 8 · pre 2 · gancho 4 · verso 8 · pre 2 · gancho 4 · puente 4 · gancho 4 · final 4
"""
import json
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from componer import (SR, hz, t_arr, lp, hp, bp, saw, env_adsr, poner, repitch, reverb_ir,
                      con_reverb, delay_pingpong, paneo, saturar, cinta, ochocientos, clap,
                      campana, piano_oscuro, pad)

BPM = 74
BEAT = 60 / BPM
COMPAS = 4 * BEAT
S16 = BEAT / 4
SW = 0.1 * S16
rng = np.random.default_rng(20261108)

ESTR = [('intro', 4), ('verse', 8), ('pre-chorus', 2), ('chorus', 4), ('verse', 8),
        ('pre-chorus', 2), ('chorus', 4), ('bridge', 4), ('chorus', 4), ('outro', 4)]
VERSE_P = ['Em', 'C', 'Am', 'B']
CHOR_P = ['Am', 'C', 'Em', 'B']
PRE_P = ['Am', 'B']
RAIZ808 = {'Em': 28, 'C': 36, 'Am': 33, 'B': 35}
PAD = {'Em': [52, 55, 59], 'C': [52, 55, 60], 'Am': [52, 57, 60], 'B': [51, 54, 59]}

# La llamada: 4 compases (compás, paso 1/16, midi, largo) sobre la progresión del gancho
CALL = [
    [(0, 76, 4), (6, 74, 2), (8, 72, 6)],
    [(0, 72, 2), (2, 76, 4), (8, 79, 4), (12, 76, 2)],
    [(0, 79, 4), (6, 76, 2), (8, 74, 4), (12, 71, 4)],
    [(0, 75, 6), (8, 74, 2), (10, 71, 2), (12, 71, 4)],
]
# Contracanto de piano (en los huecos, registro medio-bajo)
COUNTER = [[(14, 67, 2)], [(6, 71, 2), (14, 69, 2)], [(6, 67, 2), (10, 64, 4)], [(6, 66, 2), (10, 71, 4)]]

K_V = [[[0, 7, 10], [0, 6, 11], [0, 7, 10, 14], [0, 3, 10, 13]],
       [[0, 5, 10], [0, 7, 12], [0, 3, 7, 10], [0, 6, 10, 15]]]
K_C = [[0, 3, 6, 10], [0, 6, 10, 13], [0, 3, 6, 10], [0, 6, 9, 12, 14]]


# ── Instrumentos propios ────────────────────────────────────────────────────
def bombo():
    t = t_arr(0.5)
    sub = np.sin(2 * np.pi * np.cumsum(46 + 20 * np.exp(-t * 20)) / SR) * np.exp(-t * 5)
    punch = np.sin(2 * np.pi * np.cumsum(60 + 170 * np.exp(-t * 60)) / SR) * np.exp(-t * 28)
    click = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 400) * 0.4
    return np.tanh((sub * 0.8 + punch * 0.9 + click) * 1.7)


def redoblante():
    t = t_arr(0.35)
    cuerpo = (np.sin(2 * np.pi * 185 * t) + 0.4 * np.sin(2 * np.pi * 330 * t)) * np.exp(-t * 22)
    ruido = bp(rng.standard_normal(len(t)), 1500, 9000) * np.exp(-t * 15)
    return np.tanh(cuerpo * 0.6 + ruido * 0.8)


def hat_metal(abierto=False):
    t = t_arr(0.3 if abierto else 0.06)
    x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (210.5, 298.3, 375.2, 518.4, 545.1, 812.3))
    return hp(bp(x, 6500, 14500), 7500) * np.exp(-t * (11 if abierto else 70)) * 0.2


def coro(notas, dur):
    """Coro 'o': sierras detuneadas por formantes, ataque lento, ancho."""
    t = t_arr(dur + 1.5)
    out = np.zeros((2, len(t)))
    for k, m in enumerate(notas):
        x = sum(saw(hz(m), t, d) for d in (-0.006, 0, 0.006)) / 3
        y = sum(bp(x, fo * 0.88, fo * 1.12) * g for fo, g in ((450, 1), (800, 0.6), (2830, 0.15)))
        out += paneo(y, (k - (len(notas) - 1) / 2) * 0.6)
    return out * env_adsr(len(t), 0.7, 0.5, 0.8, 1.0, dur) * 0.1


# ── Render ──────────────────────────────────────────────────────────────────
def render():
    total = sum(c for _, c in ESTR)
    N = int((total * COMPAS + 4) * SR)
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bajo', 'pad', 'coro', 'bell', 'piano', 'fx']}
    sc = np.zeros(N)
    K, SN, CL, H, HO = bombo(), redoblante(), clap(), hat_metal(), hat_metal(True)
    ir = reverb_ir(2.6, 3.0, 5500, 31)
    ir_sala = reverb_ir(0.5, 8, 7500, 32)
    HOc = HO[:int(2 * S16 * SR)].copy()
    HOc[-200:] *= np.linspace(1, 0, 200)
    notas = []
    secs = []

    T = lambda cg, s, sw=True: cg * COMPAS + s * S16 + (SW if sw and s % 2 else 0)

    def kk(cg, s, v=0.92):
        poner(bus['drums'], paneo(K, 0) * v, T(cg, s, False))
        poner(sc[None], np.exp(-t_arr(0.3) * 12)[None], T(cg, s, False))

    def sn(cg, s, v=0.72, cv=0.4):
        poner(bus['drums'], (paneo(SN, 0.04) * v + paneo(CL, -0.06) * cv), T(cg, s, False) + rng.normal(0, 0.002))

    def hh(cg, s, v, pan=0.3):
        poner(bus['drums'], paneo(H * v * (1 - rng.uniform(0, 0.18)), pan), T(cg, s) + rng.normal(0, 0.002))

    def roll(cg, s0, n, span, v0, v1, rise=0.05):
        for j in range(n):
            poner(bus['drums'], paneo(repitch(H, 1 + rise * j) * (v0 + (v1 - v0) * j / max(1, n - 1)), 0.3),
                  cg * COMPAS + s0 * S16 + j * span * S16 / n)

    def campanas(cg, evs, v, oct_=0, esc=1):
        for (s, m, l) in evs:
            poner(bus['bell'], paneo(campana(m + oct_, 1.5), 0.25) * v, T(cg, s) + rng.normal(0, 0.003))

    def swell(t_fin, acorde_):
        x = np.zeros((2, int(3.5 * SR)))
        for m in acorde_:
            poner(x, paneo(campana(m + 12, 1.6) * 1.6, 0), 0)
        sw = con_reverb(x, ir, 0.95)[:, :int(2.2 * SR)][:, ::-1]
        tt = t_arr(2.2)
        rn = hp(rng.standard_normal((2, len(tt))), 3000) * np.exp(-tt[::-1] * 0)[::-1] * (tt / 2.2) ** 2 * 0.05
        poner(bus['fx'], hp(sw, 400) * 0.8 + rn, t_fin - 2.2)

    cnt = {'verse': 0, 'chorus': 0, 'pre-chorus': 0}
    c0 = 0
    prev_iv = 0
    for nom, largo in ESTR:
        k = cnt.get(nom, 0)
        if nom in cnt:
            cnt[nom] += 1
        prog = CHOR_P if nom in ('chorus', 'bridge', 'outro') else (PRE_P if nom == 'pre-chorus' else VERSE_P)
        secs.append((nom, c0, largo))
        for c in range(largo):
            cg = c0 + c
            ac = prog[c % len(prog)]
            b4 = c % 4
            ult = c == largo - 1
            pc = PAD[ac]
            # ── Armonía ──
            if nom in ('intro', 'verse', 'outro', 'bridge'):
                lvl = {'intro': 0.55, 'verse': 0.5, 'outro': 0.6, 'bridge': 0.7}[nom]
                poner(bus['pad'], pad(pc, COMPAS, 700 if nom != 'bridge' else 1000) * lvl, T(cg, 0, False))
            elif nom == 'pre-chorus':
                dur = COMPAS - BEAT if ult else COMPAS
                poner(bus['pad'], pad(pc, dur, 1400) * 0.7, T(cg, 0, False))
                poner(bus['coro'], coro([n + 12 for n in pc], dur) * 0.6, T(cg, 0, False))
            else:
                poner(bus['pad'], pad(pc, COMPAS, 1800) * 0.8, T(cg, 0, False))
                poner(bus['coro'], coro([n + 12 for n in pc], COMPAS), T(cg, 0, False))
            if nom == 'bridge':
                poner(bus['coro'], coro([n + 12 for n in pc], COMPAS) * 0.8, T(cg, 0, False))
            # ── Piano ──
            if nom in ('intro', 'outro', 'bridge') and (nom != 'outro' or c < 2):
                poner(bus['piano'], paneo(piano_oscuro(pc[0] - 12, COMPAS * 0.95), -0.15) * 0.8, T(cg, 0, False))
                if c % 2 == 1 and nom == 'intro':
                    poner(bus['piano'], paneo(piano_oscuro(pc[1], BEAT * 2), 0.1) * 0.6, T(cg, 8, False))
            if (nom == 'verse' and k == 1) or (nom == 'chorus' and k >= 1):
                for (s, m, l) in COUNTER[b4]:
                    poner(bus['piano'], paneo(piano_oscuro(m, l * S16 + 0.8), 0.2) * (0.55 if nom == 'verse' else 0.8), T(cg, s))
            # ── La llamada (campana) ──
            if nom == 'intro' and c >= 2:
                campanas(cg, CALL[c], 0.55)
            elif nom == 'verse':
                if k == 1 or b4 in (1, 3):
                    campanas(cg, [e for e in CALL[b4] if e[0] >= 10], 0.5 if k == 0 else 0.6)
            elif nom == 'pre-chorus' and c == 0:
                campanas(cg, CALL[0], 0.6)
            elif nom == 'chorus':
                campanas(cg, CALL[b4], 1.0)
                if k == 2:
                    campanas(cg, CALL[b4], 0.55, 12)
            elif nom == 'bridge':      # media velocidad, una octava abajo
                for bb in range(2):
                    for (s, m, l) in CALL[bb]:
                        g = 2 * (bb * 16 + s)
                        if g // 16 == c:
                            poner(bus['bell'], paneo(campana(m - 12, 2.6), 0.2) * 0.9, T(cg, g % 16, False))
            elif nom == 'outro':
                campanas(cg, CALL[b4], 0.7 * 0.7 ** c)
            # ── Batería + 808 ──
            kicks = []
            if nom in ('verse', 'chorus'):
                kicks = list(K_V[min(k, 1)][b4]) if nom == 'verse' else list(K_C[b4])
                if nom == 'verse' and ult:
                    kicks = [s for s in kicks if s < 12]
                for s in kicks:
                    kk(cg, s)
                if not (nom == 'verse' and ult):
                    sn(cg, 8, 0.72, 0.4 if nom == 'verse' else 0.55)
                if nom == 'verse' and k == 1:
                    sn(cg, 15, 0.12, 0.05) if c % 2 else None
            # hats
            if nom == 'verse' and k == 0:
                for s in range(0, 16, 2):
                    if (b4 == 3 and s >= 12) or (ult and s >= 12):
                        continue
                    hh(cg, s, [1, .4, .65, .4][(s // 2) % 4] * .8)
                    if rng.random() < 0.2 and s < 12:
                        hh(cg, s + 1, 0.28)
                if b4 == 3 and not ult:
                    roll(cg, 12, 6, 4, 0.35, 0.75, 0.04)
            elif nom == 'verse':
                for s in range(16):
                    if (b4 == 3 and s >= 12) or (s in (4, 5) and c % 2 == 1) or (ult and s >= 12):
                        continue
                    if s % 2 and rng.random() < 0.35:
                        continue
                    hh(cg, s, [1, .4, .65, .4][s % 4] * .75)
                if c % 2 == 1:
                    roll(cg, 4, 3, 2, 0.4, 0.7, 0.05)
                if b4 == 3 and not ult:
                    roll(cg, 12, 8, 4, 0.3, 0.8, 0.03)
                if c % 4 == 2:
                    poner(bus['drums'], paneo(HOc, -0.25) * 0.5, T(cg, 6))
            elif nom == 'chorus':
                for s in range(16):
                    if b4 in (1, 3) and s >= 12:
                        continue
                    hh(cg, s, [1, .45, .7, .45][s % 4] * .85)
                if b4 in (0, 2):
                    poner(bus['drums'], paneo(HOc, -0.25) * 0.7, T(cg, 6))
                if b4 == 1:
                    roll(cg, 12, 6, 4, 0.35, 0.8, 0.05)
                if b4 == 3:
                    roll(cg, 12, 8 if k else 6, 4, 0.35, 0.85, 0.04)
            elif nom == 'pre-chorus':
                if c == 0:
                    for j in range(12):
                        hh(cg, 0, 0, 0) if False else poner(bus['drums'], paneo(H * (0.25 + 0.04 * j), 0.3), cg * COMPAS + j * COMPAS / 12)
                    sn(cg, 8, 0.5, 0.2)
                else:
                    roll(cg, 0, 16, 8, 0.3, 0.8, 0.02)
                    for j in range(10):
                        poner(bus['drums'], paneo(repitch(SN, 1 + j * 0.03), 0) * (0.25 + 0.05 * j), cg * COMPAS + 8 * S16 * 0 + j * BEAT / 3)
            elif nom == 'bridge':
                for j in range(12):
                    if j % 3 == 0 or rng.random() < 0.5:
                        poner(bus['drums'], paneo(H * (0.4 if j % 3 == 0 else 0.22), 0.3), cg * COMPAS + j * COMPAS / 12)
                if ult:
                    for j in range(8):
                        poner(bus['drums'], paneo(repitch(SN, 1 + j * 0.03), 0) * (0.2 + 0.07 * j), cg * COMPAS + 8 * S16 + j * S16)
            elif nom == 'intro' and c == 3:
                roll(cg, 0, 12, 16, 0.1, 0.4, 0.01)
            elif nom == 'outro' and c < 2:
                for s in range(0, 16, 4):
                    hh(cg, s, 0.3 * (1 - c * 0.4))
            # 808
            if nom in ('verse', 'chorus'):
                for j, s in enumerate(kicks):
                    nxt = kicks[j + 1] if j + 1 < len(kicks) else (12 if (nom == 'verse' and ult) else 16)
                    iv = 12 if (c % 2 == 1 and j == len(kicks) - 1 and (nom == 'chorus' or k == 0 or j > 1)) else 0
                    ln = min(nxt - s, 7) - (1 if nxt - s > 3 else 0)
                    gl = 0.1 if (s == 0 and (nom == 'chorus' or prev_iv != 0)) else 0
                    notas.append((T(cg, s, False), RAIZ808[ac] + iv, ln * S16, gl))
                    prev_iv = iv
            elif nom == 'pre-chorus':
                notas.append((T(cg, 0, False), RAIZ808[ac] + (12 if c == 1 else 0), (16 if c == 0 else 10) * S16, 0.12 if c else 0))
            elif nom == 'bridge':
                notas.append((T(cg, 0, False), RAIZ808[ac], 15 * S16, 0.25))
            elif nom == 'outro' and c < 2:
                notas.append((T(cg, 0, False), RAIZ808[ac], 12 * S16, 0.15))
            # swell en reversa antes de cada gancho y de la 2ª parte
            if ult and ESTR[[s[0] for s in secs].__len__() - 1 + 1][0] == 'chorus' if len(secs) < len(ESTR) else False:
                swell((cg + 1) * COMPAS, [n + 12 for n in PAD[CHOR_P[0]]])
        c0 += largo

    bus['bajo'] += paneo(ochocientos(notas, N / SR, 2.8), 0) * 0.95

    # ── Mezcla (cada bus en su rango, suciedad con intención) ──
    d = np.clip(sc, 0, 1)
    drums = con_reverb(saturar(bus['drums'], 0.3), ir_sala, 0.07)
    bajo = bus['bajo'] * (1 - 0.2 * d)
    mrng = np.random.default_rng(5)
    padb = con_reverb(saturar(cinta(hp(bus['pad'], 120), 0.5, mrng), 0.15) * (1 - 0.3 * d), ir, 0.4)
    cor = con_reverb(hp(bus['coro'], 250) * (1 - 0.2 * d), ir, 0.55)
    bell = cinta(hp(bus['bell'], 400), 0.35, mrng)
    bell = con_reverb(delay_pingpong(saturar(bell, 0.2), BEAT * 0.75, 0.4, 0.25) * (1 - 0.2 * d), ir, 0.45)
    pno = con_reverb(cinta(hp(bus['piano'], 150), 0.4, mrng) * (1 - 0.2 * d), ir, 0.3)
    mix = drums + bajo * 0.9 + padb * 0.9 + cor * 1.5 + bell * 1.0 + pno * 0.9 + bus['fx']

    gsec = {'intro': 1.5, 'verse': 0.9, 'pre-chorus': 0.95, 'chorus': 1.0, 'bridge': 0.9, 'outro': 1.4}
    g = np.ones(mix.shape[1])
    for nom, a, largo in secs:
        g[int(a * COMPAS * SR):int((a + largo) * COMPAS * SR)] = gsec[nom]
    mix = mix * lp(g, 3)
    mix = hp(mix, 28)
    mix = mix / (np.percentile(np.abs(mix), 99.95) + 1e-9) * 0.85
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    mix /= np.abs(mix).max() + 1e-9
    mix = mix[:, :int((total * COMPAS + 2.0) * SR)]
    mix[:, -int(1.5 * SR):] *= np.linspace(1, 0, int(1.5 * SR))
    lista = [{"nombre": nom, "inicio": round(a * COMPAS, 2), "fin": round((a + largo) * COMPAS, 2), "compases": largo}
             for nom, a, largo in secs]
    return (mix * 0.95).T, lista


if __name__ == '__main__':
    audio, lista = render()
    sf.write(sys.argv[1], audio, SR, subtype='PCM_16')
    print('SECCIONES=' + json.dumps(lista))
