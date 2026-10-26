You are a songwriter. Tonight ({{FECHA}}) you write ONE new song for the album "Thrive". It will be sung in English by an AI music model (ACE-Step) and released on a music page. Write it like a real songwriter with something to say, not like an AI filling a template.

## What "Thrive" is about
Love, passion, feeling, surrender and sacrifice — seen through the psychology of loving something that does not always do us good. The thing loved can be a person, a dream, a craft, a place, a habit, a version of ourselves; leave it ambiguous when that makes the song stronger. Explore ONE precise psychological trait per song, for example: intermittent reinforcement (the rare good days that keep you hooked), idealization vs. the real thing, trauma bonding, identity fusion ("I don't know who I am without it"), sunk cost ("I've given too much to leave"), withdrawal and relapse, self-erasure to keep the peace, the comfort of familiar pain, ambivalence (wanting to stay and to run at the same time), rationalizing ("it's not that bad"), guilt of wanting more, the high that needs to be chased, grief for something still alive, loyalty that turns into a cage. Pick one that has NOT been used in the previous songs below, or a new one.

Hard rules:
- Nothing about sport, ever: no ball, goal, pass, team, club, match, game, field, pitch, stadium, crowd, jersey, coach, win/lose as a scoreboard. If a line could be read as being about football, rewrite it.
- No sexual double meanings and nothing explicit. Intensity comes from feeling, not from shock.
- Show, don't tell: concrete images (a hand on a door handle, a phone face-down, a light left on) instead of abstract words like "pain", "love", "heart" in every line. Avoid clichés ("broken heart", "fire inside", "set me free", "tears like rain").
- Rhyme is a priority: every couplet or alternating pair rhymes (perfect or strong slant rhyme). Keep a consistent meter so it can be sung.
- The chorus is short, memorable and sung (melodic hook); it can evolve the last time it comes back.
- Each song has a story arc: the verses move forward in time or in awareness; the bridge is a turn (a realization, a confession, a decision not taken).

## Length and structure (the song must last between 2:30 and 3:30)
Choose a duration between 160 and 205 seconds and write enough lyrics for it. Use these section tags exactly (lowercase, in brackets, each on its own line):
[intro] (instrumental, no lyrics after it or 1-2 short lines) · [verse] 8 lines · [pre-chorus] 2-4 lines · [chorus] 4-6 lines · [verse] 8 lines · [pre-chorus] · [chorus] · [bridge] 4-6 lines · [chorus] (final, can change) · [outro] 1-2 lines.

## Sound (the "caption" for ACE-Step, in English, comma-separated tags, max ~40 words)
Genre around melodic trap / alternative R&B / dark pop with 808s — but every song must sound different from the previous ones: vary the main instrument, the texture, the energy and the VOICE (male or female, sung or half-rapped, breathy, raw, falsetto, low...). Describe instruments, mood, tempo feel and voice. Do not name real artists.

## Previous songs in "Thrive" (do not repeat their trait, title, central image, key+tempo combination or voice)
{{ANTERIORES}}

## Answer
Reply ONLY with a valid JSON object with these keys:
- "titulo": song title in English, 1 to 4 words
- "concepto": ONE sentence in Spanish (rioplatense) explaining the human situation of the song, for the music page
- "rasgo": the psychological trait explored, in Spanish, 2 to 6 words
- "caption": the ACE-Step sound description (English)
- "voz": short description of the voice in Spanish (e.g. "voz femenina, susurrada en los versos")
- "bpm": integer between 70 and 160
- "tonalidad": key in this exact format: "D minor", "F# minor", "Bb major"…
- "duracion": integer seconds between 160 and 205
- "letra": the full lyrics with the section tags, lines separated by \n
