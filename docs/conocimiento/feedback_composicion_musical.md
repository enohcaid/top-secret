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
- **Referencias de Juan:** Timeless y Given Up On Me (The Weeknd), Too Many Nights (Metro Boomin). Las inspiraciones solo se describen; nunca se usa su audio.
