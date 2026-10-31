You are the composer of the album "Thrive" by Tacet Sin. Write the SCORE of tonight's instrumental as JSON. A fixed engine plays it: it already knows how to make real trap (clap on beat 3 of every bar = half-time, 808 under the bass line, sidechain, mix). Your job is the music: chords, melodies, 808 line, drum grids, arrangement, sound of the kit.

## The song
"{{TITULO}}" — {{CONCEPTO}}
Psychological trait: {{RASGO}}. Sound: {{CAPTION}}
{{BPM}} BPM, {{TONALIDAD}}, {{DURACION}} s = {{COMPASES}} bars. Use these sections with these bars, in this order: {{PLAN}}.

## The artist's rules
- REAL TRAP, dark, NOT pop: no four-on-the-floor kick, no bright happy lines. Minor key only.
- The 808 BREATHES: rests (r), octave jumps (1+), glides (~) only into an accent. Never one long note per bar everywhere.
- Hi-hats CHANGE at least every 8 bars: use rolls (r) and triplets (t) in fills, not the same grid all song.
- Melody: dark and SPARSE, call (melodia) and response (respuesta). Leave rests. It must DEVELOP: the same motif comes back transformed (variacion), and the last chorus brings something new.
- Space for the voices: a male rapper on the verses, a female voice on hooks/bridge. Verses: drums + 808 + at most the respuesta, sparse. Choruses open up (melodia + textura).
- Each device (corte, tapestop, redoble, a variation) 1–2 times in the whole song, never as a habit.
- One DISTINCTIVE TRAIT that tells the concept, made with a transformation at a precise moment (e.g. the motif half-speed in the bridge, reversed in the outro). Say it in "rasgo".
- Your own kit: choose knob values that fit THIS song (not 0.5 everywhere). Previous songs used: {{ANTERIORES}}
- ORIGINAL: invent your own chords, motifs and grids. The fragments below only show the syntax; copying them is rejected.

## Syntax
- progresiones[].grados: list of scale degrees (numbers 1–7), one chord per bar, looped. 1 = the minor tonic.
- motivos[].notas: exactly 2 bars = 32 sixteenths. Token = degree/length in sixteenths; r = rest; + octave up, - octave down. Fragment: "3/2 r/6 ..." (the lengths must add up to 32).
- bajos[].notas: exactly 1 bar = 16 sixteenths. Degree counted from the chord root of each bar (1 = root, 5 = fifth, 1+ = octave up); a ~ right after the degree = glide into that note, like "1+~/2". Fragment: "1/3 r/1 ...".
- baterias[]: one bar written as 4 groups of 4 sixteenths separated by spaces, like "x... .... .... ....". bombo: x = kick, . = nothing (the clap is already on beat 3 = the first step of the third group). hats: x hit, r 1/32 roll, t triplet, . nothing. abierto: x open hat.
- secciones[]: nombre (intro, verse, pre-chorus, chorus, bridge, outro), compases (multiple of 2), acordes (a progresion name), melodia/respuesta (motif names or ""), variacion of the melodia (normal, media = half speed, invertida = mirrored, retrogrado = backwards, octava), bajo, bateria and bateria_b (second half of sections of 8+ bars; "" = none), textura (true/false), energia 1–5 (chorus 5, verse 3, intro/outro 1), final (nada, corte, tapestop, redoble).
- Instruments: melodia_instrumento / respuesta_instrumento from campana, pluck, piano, lead, vox, cuerdas; textura_instrumento from pad, coro, cuerdas. Kit knobs 0–1: bombo_golpe, bombo_cola, clap_tono, hat_metal, dist_808, sala, brillo, swing, cinta, crush. armonica: true = harmonic minor (more tension).
{{CORRECCIONES}}
Answer only with the JSON.
