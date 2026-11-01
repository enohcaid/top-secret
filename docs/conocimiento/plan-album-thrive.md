# Plan del álbum Thrive (2026-11-01)

Escuchando los temas del 31/10 y el 1/11, Juan señaló estos problemas:
- **Todo suena igual entre temas:** la misma voz de rap y la chica "que SIEMPRE está".
- **BPM bajos en general.**
- **Letras demasiado específicas:** historias en contextos complejos con las que el oyente no se identifica.
- **Cada tema es plano por dentro:** le faltan cambios y variaciones; hasta sostener el mismo BPM todo el tema es cuestionable.

Asphalt Ghosts le gustó, pero si todos se hacen igual, el oyente los mete en la misma bolsa.

## Qué hacen los referentes (investigación, 2026-11-01)

| Referente | Qué tomar | Cómo lo hacemos acá |
|---|---|---|
| Metro Boomin | Espacio y contención: la batería manda; el bombo y el 808 forman un solo golpe; capas oscuras y cinematográficas; cambios de beat | Sidechain y 808 sobre el bombo (ya estaba). Ahora también el **cambio de beat** en la segunda mitad |
| Travis Scott ("Sicko Mode") | "Tres temas en uno": dos cambios de beat bruscos, no graduales | `cambio`: una sección con otro kit, otra progresión y otra batería |
| Lex Luger / Southside (808 Mafia) | Orquestal y oscuro: metales, cuerdas, 808 enormes, hats rápidos | Kits `pesado`/`crudo` y textura de cuerdas para la energía *fiesta* y *furia* |
| Pi'erre Bourne (Playboi Carti) | Sintes aireados y luminosos de videojuego, mínimo y repetitivo, 808 que rebota | Energía *flotante* y *rebote*; casting `agudo_jugueton` |
| Mike WiLL Made-It / Murda Beatz | Rebote: espacio, bombo sincopado, groove bailable | Energía *rebote* (145–156) |
| Wheezy / Future / Young Thug | Melodía con autotune; el hook como mantra que cambia de entrega en cada repetición; ad-libs tan melódicos como la línea | Casting `melodico_autotune`; hook de 2 a 5 palabras; ad-libs entre paréntesis |
| Lil Baby | Flow rápido y entrecortado sobre beats que empujan | Casting `rapero_veloz`, energía *empuje* |
| Ovy On The Drums / Big One | Trap latino y argentino: bombo con dembow o rebote, melodía pegadiza, más brillo | Pendiente: un tema del álbum puede probar ese rebote |

Las técnicas de arreglo se repiten en las guías de producción:
- No loopear los mismos 2 compases todo el tema.
- Sacar la batería antes de un estribillo para que el golpe pegue más.
- Cambiar el 808 entre secciones.
- Redobles de hats (fusas, tresillos) como transición, al final de las frases de 4 compases.
- Un puente despojado o un cambio de beat.

**Tempo:** el trap se escribe a 130–165 BPM con el clap en el 3, así que "se siente" a 65–80. Nuestro intérprete ya pone el clap en el 3, por eso 72–78 BPM sonaba a 36–39: esa era la causa de "bajos bpm".

Calidad de las fuentes: casi todo lo que aparece en la web es relleno de SEO. Las más sólidas son:
- [XXL sobre los cambios de beat](https://www.xxlmag.com/hip-hop-beat-switches/)
- [Rolling Stone sobre Sicko Mode](https://www.rollingstone.com/music/music-news/travis-scott-sicko-mode-song-708140/)
- [Rolling Stone sobre Metro Boomin](https://www.rollingstone.com/music/music-features/metro-boomin-trap-symphony-1234643162)
- [Red Bull Music Academy, entrevista a Lex Luger](https://daily.redbullmusicacademy.com/2016/01/interview-lex-luger/)
- [Wikipedia: 808 Mafia](https://en.wikipedia.org/wiki/808_Mafia)
- [MusicRadar: trucos de trap](https://www.musicradar.com/tuition/tech/10-tricks-every-trap-producer-should-know-638684)

Nada de esto se copia: se toman técnicas, nunca letras ni melodías reales, y en los captions de ACE no van nombres de artistas.

## El plan

### 1. Un concepto de álbum, un ángulo por tema
"Thrive" = crecer en los lugares que tenían que romperte. Cada tema lo mira desde un lugar distinto y con otra energía: hambre, insomnio, los míos, la primera victoria, bronca, el precio, paranoia, la versión vieja de mí, presión, los que hablan, perder algo, calma, todo o nada, volver.

Están en `scripts/beats/thrive-album.mjs`. Cada tema toma un ángulo que no se usó, y con energía distinta del anterior.

### 2. Variedad entre temas, controlada por código
- **Casting de voces:** 8 opciones; no se repite ninguna de los 3 temas anteriores. Hay voz femenina como mucho en un tema de cada tres; cuando aparece, puede ser rapera o cantante solista, o solo el hook.
- **Energía y tempo:** empuje 142–154, nocturna 130–140, rebote 145–156, fiesta 148–160, furia 155–168, melancolía 128–138, flotante 134–146. Nunca menos de 128.
- **Kit:** distinto según la energía.

### 3. Variación dentro del tema (intérprete y molde de Gemma)
- El verso 2 no copia la batería del 1, y puede pasar el clap a 2 y 4: el mismo tempo se siente al doble.
- Un **cambio de beat** en la segunda mitad (puente, un estribillo posterior o el outro): otro kit, otra progresión, otra batería.
- Transición **silencio**: la batería y el 808 salen en el último compás y entra la voz sola antes del estribillo.
- Intro **radio**: filtrada, y después abre el beat.
- La melodía no puede ser una escala recta: tiene que tener saltos, una nota repetida y un giro. Gemma eligió escalas en Asphalt Ghosts, Flicker y Still Here.
- Pendiente: un cambio de tempo real a mitad del tema. El intérprete y ACE trabajan con un solo BPM, así que primero hay que probar un corte duro con un cover de ACE.

### 4. Letras con las que el oyente se identifique
- La historia es una situación en primera persona que cualquiera vivió, sin nombres, ciudades, profesiones, años ni tramas raras. Antes salían "un arquitecto en São Paulo" o "un botánico llamado Elias", y eso empujaba a escribir en tercera persona.
- El hook es de 2 a 5 palabras, para corear.
- El flow cambia dentro del tema: un verso puede pasar a doble tiempo.
- Los problemas (deporte, voces que no corresponden, "baby") ya no rechazan la letra entera: vuelven a Gemma como corrección. Antes se perdían 3 o 4 de las 5 vueltas.
- Se mantiene la regla del 27/10: el amor es abstracto, nunca una persona.

### 5. Cómo se prueba
Por ahora todo esto vive solo en el carril local, `thrive.mjs --local`: el proceso semanal de las 2:00 sigue con Claude y su brief de siempre. Si a Juan le gustan los resultados, se pasa el proceso semanal a este método.
