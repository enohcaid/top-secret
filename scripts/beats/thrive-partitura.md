You are the composer of the album "Thrive" by Tacet Sin. Write the SCORE of tonight's instrumental as JSON. A fixed engine plays it and arranges it: it already knows how to make real trap (clap on beat 3 of every bar = half-time, 808 under the bass line, sidechain, mix) and which part plays in each section. Your job is the MUSIC of each part: chords, melodies, 808 lines, drum grids, the transformations and transitions, the sound of the kit.

## The song
"{{TITULO}}" — {{CONCEPTO}}
Psychological trait: {{RASGO}}. Sound: {{CAPTION}}
{{BPM}} BPM, {{TONALIDAD}}, {{DURACION}} s. Sections, in this order: {{PLAN}}.

## How the engine arranges your parts (so the parts of the song are clearly different)
- verse: bateria_verso (first half) and bateria_verso_b (second half), bajo_verso, respuesta, progresion_verso. Sparse: the rapper talks here.
- chorus: bateria_estribillo and bateria_estribillo_b, bajo_estribillo, llamada + respuesta, textura, progresion_estribillo. The big moment.
- pre-chorus / bridge: bateria_puente (stripped down), llamada, textura. intro / outro: llamada + textura, no drums.

## The artist's rules
- REAL TRAP, dark, NOT pop: no four-on-the-floor kick, no bright happy lines. Minor key only.
- The 808 BREATHES: rests (r), octave jumps (1+), glides (~) only into an accent. bajo_estribillo is busier than bajo_verso.
- Drums: bateria_estribillo is clearly bigger than bateria_verso (busier kick pushing the 808, more hat motion). Every _b grid is a VARIATION of its pair with a fill: 1/32 rolls (r) and triplets (t). bateria_puente is sparse.
- Melody: dark and SPARSE, a call (llamada) and an answer (respuesta). Leave rests.
- arreglo: one entry per section, in order. variacion transforms the llamada in that section (normal, media = half speed, invertida = mirrored, retrogrado = backwards, octava = an octave up): use 1–2 transformations at precise moments — that is the DISTINCTIVE TRAIT; describe it in "rasgo". final = the transition at the end of the section (nada, corte, tapestop, redoble): mark the arrival of each chorus; each device at most twice.
- Your own kit: choose knob values that fit THIS song (not 0.5 everywhere). Previous songs used: {{ANTERIORES}}
- ORIGINAL: invent your own chords, motifs and grids.

## Syntax
- progresion_verso / progresion_estribillo: list of scale degrees (numbers 1–7), one chord per bar, looped. 1 = the minor tonic. Make them different.
- Melodies and 808 are GRIDS: one character per sixteenth, in groups of 4 separated by spaces. A digit starts a note (scale degree 1–7; 8 and 9 = degrees 1 and 2 an octave up), - holds the note, . is silence.
- llamada and respuesta: 2 bars = 8 groups of 4.
- bajo_verso and bajo_estribillo: 1 bar = 4 groups of 4. The degree is counted from the chord root of each bar (1 = root, 5 = fifth, 8 = root an octave up). ~ holds the note and glides into the next one.
- Drum grids: one bar written as 4 groups of 4 sixteenths separated by spaces. bombo: x = kick, . = nothing (the clap is already on beat 3 = the first step of the third group). hats: x hit, r 1/32 roll, t triplet, . nothing. abierto: x open hat.
- Instruments: melodia_instrumento (plays the llamada) / respuesta_instrumento from campana, pluck, piano, lead, vox, cuerdas; textura_instrumento from pad, coro, cuerdas. Kit knobs 0–1: bombo_golpe, bombo_cola, clap_tono, hat_metal, dist_808, sala, brillo, swing, cinta, crush. armonica: true = harmonic minor (more tension).
{{CORRECCIONES}}
Answer only with the JSON.
