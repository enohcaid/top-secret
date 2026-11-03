You are the beatmaker of the album "Thrive" by Tacet Sin. Write, as Python code, the INSTRUMENTAL of this song: a trap beat synthesized entirely by code (no samples, no models), with the club's toolkit `componer.py` (below). Afterwards an AI model (ACE-Step, "cover" mode) sings on top of this exact beat and polishes the sound. So the beat must be a great beat on its own AND leave room for the voice.

## The song
{{CONCEPTO}}

## Sound
- Style for this song: {{CAPTION}}
- Energy: {{ENERGIA}}
- Who sings on it: {{VOCES}}
- **REAL TRAP**: half-time groove (snare/clap on beat 3 of each bar), hi-hats with 1/16 and 1/32 rolls and triplet fills, a gliding 808 that carries the bass and breathes (octave jumps, slides into the downbeats, rests), hard kick layered with the 808. Melody minor and sparse, loops that evolve. NOT pop: no four-on-the-floor kick, no bright major progressions, no big shiny synth-pop chords.
- Room for the voice: in verses keep the mid range (300 Hz–3 kHz) sparse — no busy lead over the vocal line, melody answering in the gaps. The choruses open up: more layers, wider, but still a space in the center for the voice.
- Previous Thrive beats (sound different from them: main instrument, texture, groove):
{{ANTERIORES}}

## Variation inside the song — the most important part (the artist, 2026-11-01)
"The human being needs things that stimulate him all the time, even inside one song: changes and variations are what give it life." A beat that loops the same 4 bars for 2 minutes is rejected. Real trap producers do this:
- **Verse 2 is not verse 1**: different hi-hat pattern (e.g. straight 1/8 → rolling 1/16 with triplets), the 808 changes its rhythm, one element added or removed.
- **A beat switch in the second half** (in the bridge or the last chorus/outro): a real change, not a fill — new drum pattern AND a new sound or chord progression, or half-time → double-time feel, or the melody moves to another instrument/octave. The listener must notice it on the first listen.
- **Drop-outs**: the last bar (or half bar) before each chorus, cut the drums and the 808 (only the melody or silence), then everything hits on the chorus downbeat.
- **Intro different from the body**: filtered (low-passed, "through a radio") or only the melody, the drums come in at the first verse.
- Small changes every 4–8 bars: a hat roll, an 808 slide, a percussion element entering, a melody answer.
- **Make every change BIG and obvious.** The model that sings on top keeps only about half of the drum pulse and tends to flatten subtle changes: a change that is only a hi-hat variation disappears. Changes in density (half the elements vs. all of them), in register and in sound survive; tiny ones do not.
- **Sections must be clearly different in loudness and density**, so the singing model can find them: intro sparse, verse medium, chorus full and loud, bridge different (thinner or switched), outro sparse.

## The artist's rules for composing (they override everything)
{{REGLAS}}

## Technical requirements (mandatory)
- {{BPM}} BPM, {{TONALIDAD}}. Structure, in this order: {{ESTRUCTURA}}. Choose the bars of each section so the total lasts {{DURACION}} s (±8 s): sections in multiples of 4 bars (2 allowed for a short build/break); verses at least 8 bars, choruses 8 bars.
- One self-contained Python file. Import what you need from `componer` exactly like the example (`sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))`). You may write your own instruments and effects with numpy/scipy.
- The output path comes as `sys.argv[1]`: write a 44.1 kHz stereo PCM_16 WAV there (`sf.write(path, audio, SR, subtype='PCM_16')`).
- At the end print exactly one line: `SECCIONES=` followed by a JSON list `[{"nombre": "verse", "inicio": seconds, "fin": seconds, "compases": n}, …]` with the real start/end of every section (names from: intro, verse, pre-chorus, chorus, bridge, outro).
- Dynamics: intro and outro 6–8 dB below the choruses; verses below the choruses; nothing clipped (normalize by the 99.95 percentile, soft master, like the example).
- Docstring at the top: concept, emotion per section, distinctive trait (one line starting "Rasgo distintivo:"), structure, and where the beat switch and drop-outs are.
- Runtime under ~3 minutes on a normal CPU (vectorize; no per-sample Python loops over the whole song).
- Keep the file compact (about 250–400 lines): reuse the toolkit's instruments and write helpers once; no long commented-out alternatives.
{{CORRECCIONES}}
## componer.py (the toolkit)
```python
{{COMPONER}}
```

## A complete beat that worked (for structure and craft, do NOT reuse its musical material)
```python
{{EJEMPLO}}
```

Answer ONLY with the complete Python file inside one ```python block.
