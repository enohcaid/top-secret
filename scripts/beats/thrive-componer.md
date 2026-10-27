You are the beatmaker of the album "Thrive" by Tacet Sin. Write, as Python code, the INSTRUMENTAL of tonight's song: a beat synthesized entirely by code (no samples, no models), with the club's toolkit `componer.py` (below). Afterwards an AI model (ACE-Step, "cover" mode) sings a male–female duet on top of this beat and polishes the sound; that combination is exactly what the artist wants. So the beat must be a great beat on its own AND leave room for two voices.

## The song
{{CONCEPTO}}

## Sound
- Style for this song: {{CAPTION}}
- Album references (describe, never imitate): The Weeknd's duets with female artists — "Lust for Life" (slow, dreamy, cinematic, vintage strings), "The Abyss" (dark, hypnotic, cinematic synths), "Love Me Harder" (R&B-pop, pulsing synths, big chorus), "One of the Girls" (dark seductive synth-pop, 80s drum machine). Dark, cinematic alt-R&B / synth-pop with trap DNA (808s, hats).
- Room for the voices: in verses and pre-choruses keep the mid range (300 Hz–3 kHz) sparse — no busy lead over the vocal line, pads low and filtered, melody answering in the gaps. The choruses open up: more layers, wider, brighter, but still a space in the center for the duet.
- Previous Thrive beats (sound different from them: main instrument, texture, groove):
{{ANTERIORES}}

## The artist's rules for composing (they override everything)
{{REGLAS}}

## Technical requirements (mandatory)
- {{BPM}} BPM, {{TONALIDAD}}. Structure, in this order: {{ESTRUCTURA}}. Choose the bars of each section so the total lasts {{DURACION}} s (±8 s): sections in multiples of 4 bars (2 allowed for a short build/break).
- One self-contained Python file. Import what you need from `componer` exactly like the example (`sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))`). You may write your own instruments and effects with numpy/scipy.
- The output path comes as `sys.argv[1]`: write a 44.1 kHz stereo PCM_16 WAV there (`sf.write(path, audio, SR, subtype='PCM_16')`).
- At the end print exactly one line: `SECCIONES=` followed by a JSON list `[{"nombre": "verse", "inicio": seconds, "fin": seconds, "compases": n}, …]` with the real start/end of every section (names from: intro, verse, pre-chorus, chorus, bridge, outro).
- Dynamics: intro and outro 6–8 dB below the choruses; verses below the choruses; nothing clipped (normalize by the 99.95 percentile, soft master, like the example).
- Docstring at the top: concept, emotion per section, distinctive trait, structure.
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
