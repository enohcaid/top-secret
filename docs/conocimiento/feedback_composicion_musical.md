---
name: feedback_composicion_musical
description: Reglas de Juan para componer la música propia del club (beats de trap) — concepto humano profundo, esencia por tema, insinuar en vez de ser explícito, variación, y el oficio técnico aprendido
metadata:
  type: feedback
---

Todo lo aprendido componiendo los beats propios del club (2026-10-06/07). Proceso y herramientas: [[reference_beats_propios]].

## Lo que manda (feedback directo de Juan)

1. **El concepto tiene que ser humano y profundo, no lo obvio de Top Secret** (2026-10-07). Nada de "espías", "misión", "expediente" como idea de composición. Las ideas detrás de cada tema reflejan lo que vive quien practica un deporte: **frustración, amor, pasión, desamor, lucha** — lo que identifica a Top Secret por ser un equipo, pero también a los humanos por practicarlo. Ej.: la derrota que no se digiere, la remontada, el compañero que se va, la noche antes de una final, el que juega lesionado, el amor al club cuando nadie mira.
   **Why:** Operativo (espionaje) y Fachero (actitud) funcionaron como ejercicio, pero se quedaban en la superficie de la marca; la música tiene que emocionar a cualquiera, no ilustrar el nombre.
   **How to apply:** antes de escribir código, definir en una frase la emoción/situación humana y qué se tiene que sentir en cada sección (la estructura cuenta esa historia). La marca puede estar, pero escondida.
2. **Cada beat tiene su esencia y un rasgo distintivo; busca transmitir algo.** No caer siempre en el mismo recurso para "ensuciar" (vinilo, tape stop, bitcrush en todo).
3. **Insinuar, no ser explícito.** Nada de sonidos obviamente de computadora (pitidos, chirridos de radio): las ideas pueden estar, pero transformadas con recursos de composición — pitchear, invertir, cortar, distorsionar. Ej.: el Morse de Operativo pasó de pitido a ritmo que corta el propio acorde.
4. **La variación es lo que engancha.** Lo que más le gustó a Juan: la llamada del gancho a media velocidad (1:07 de Operativo v2) — "ese tipo de variación es lo que buscamos". Un motivo repetido igual todo el tema ("el beep del misterio") cansa. Pero tampoco convertir el hallazgo en muletilla: cada recurso 1-2 veces por tema.
5. **El trap vive de la imperfección:** "muy limpio, sintes muy limpios, todo muy cuadrado" no sirve; el género se destaca por las deformaciones en las pistas (con propósito, ver 2 y 3).
6. **Prefiere lo compuesto por código a lo generado por modelo** (ACE-Step quedó como opción descartada: "tiene cosas interesantes", pero gustó más lo propio).

## Oficio aprendido (autocrítica de Operativo → aplicada en Fachero)

- **Batería propia de cada tema** (bombo en capas, redoblante con cuerpo, hats metálicos tipo 808, shaker, rim, toms); el kit genérico es lo más "de computadora".
- **El 808 respira:** línea de bajo con saltos de octava y silencios; glide solo hacia un acento (primer tiempo de la frase siguiente). Distorsión con criterio (Southside: distorsión + reverb).
- **Espacio:** menos capas a la vez, cada instrumento en su rango (hp/lp por bus), nada de pad constante. Metro Boomin: dejar respirar, emoción concreta, influencia de bandas de sonido.
- **Groove:** swing real (semicorcheas impares tarde), humanización de tiempo y fuerza; hi-hat abierto a contratiempo cortado por el cerrado; cambiar el patrón de hats cada ~8 compases; un tramo simple antes del redoble hace que el redoble pegue.
- **Desarrollo melódico:** llamada y respuesta, contramelodía, línea nueva en el último gancho, cambio de registro — no un loop de 4 compases.
- **Arreglo como narrativa:** intro · gancho/verso · build · gancho con más capas · beat switch o puente · gancho final con variación · final. Silencios y cortes antes de las entradas.
- **Dinámica por sección:** el verso más bajo que los ganchos, intro/final ~6-8 dB abajo (no 12: en un celular no se oye). Master suave; normalizar por percentil 99.95, no por el pico.
- **Revisión sin oídos:** espectrograma (`showspectrumpic`) para ver estructura, graves y artefactos; `ebur128` por sección. Ojo: el bitcrush deja un silbido fijo ~15 kHz → filtrar después.
- **Referencias de Juan:** Timeless y Given Up On Me (The Weeknd), Too Many Nights (Metro Boomin), Stuff (Lil Baby y Travis Scott, prod. Wheezy — oscuro, hipnótico, rebote con aplomo). Las inspiraciones solo se describen; nunca se usa su audio.

**Letras (temas con voz, 2026-10-23):** la letra NUNCA habla explícitamente de fútbol: nada de pelota, gol, pase, marca, cancha, tribuna, banco, partido, camiseta, club ni equipo. Cuenta la situación humana (el esfuerzo que nadie ve, una pérdida, la bronca, el amor) y cualquiera que haga un deporte —o no— se tiene que sentir identificado. La primera prueba con voz ("Astilla") rompió esta regla y Juan lo marcó ("ya te lo dije"). Los temas con voz se generan con ACE-Step (estilos con `lyrics` en `scripts/beats/estilos/*-voz.toml`, `node scripts/beats/generar.mjs <estilo>`): los sintes por código sonaban robóticos.

**Letras en inglés y con rima (Juan, 2026-10-23):** todas las letras van en inglés y la rima es prioridad (pareados o alternadas, verso por verso). Están en `scripts/beats/letras.json`; `node scripts/beats/cantar.mjs` le pone voz a cada tema (ACE-Step cover sobre el instrumental propio, fuerza 0,5, ~13 min por tema en la GTX 1070) y actualiza la página pública **topsecret.ar/music** (`music.html`, catálogo en R2 `musica/catalogo.json`).

**Thrive: correcciones de Juan después de escuchar "Still Here" (2026-10-27).** Son reglas del disco, no de un tema:
1. **Rimas con esquema, al final de la frase.** "El uso de las rimas es caótico y exagerado: TODO rima y se pierde el contenido." Un esquema claro por sección (ABCB o ABAB en los versos, AABB o ABCB en el hook), sin rimas internas apiladas: primero el contenido, la rima solo cierra la frase. `rimas.py` ya no exige que cada verso rime: controla que el cierre de cada grupo de 4 rime con el 2.° o el 3.°.
2. **Trap de verdad, no pop.** "El beat no es trap, o no se escucha como trap real; está demasiado pop." Groove a medio tiempo (redoblante/clap en el 3), hi-hats con redobles y tresillos, 808 con glides que lleva el bajo, melodía oscura y escasa. Nada de bombo en negras parejas, progresiones mayores brillantes ni estribillos synth-pop. Las referencias de The Weeknd son de clima, no de género.
3. **Amor abstracto, nunca una persona.** "El amor está en todas las cosas, no solo en una persona." El objeto del amor es la noche, una ciudad, un oficio, la música, un vicio, un sueño, un lugar, una versión de uno mismo… nunca una pareja, "alguien" ni un "you" amante. El código rechaza conceptos con "alguien / pareja / amante…" y letras con "baby / girl / lover…".
4. **El rapero lidera, ella aparece en partes concretas.** "Lo que le daba sensación de trap era que alguien hacía el rap y la parte melódica era solo para alguna parte." Él rapea los versos y la voz femenina solo va en el hook, el puente o el outro, para crear un clima especial. El código rechaza letras donde ella canta más de un tercio de los versos.
