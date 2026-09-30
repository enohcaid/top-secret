---
name: plataforma-jugadores-fuente
description: "Para plataforma (PS/PC/Xbox) y nacionalidad de jugadores, la Lista de Buena Fe de VPN es más confiable que las capturas del lobby del juego"
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-08-03T22:27:39.457Z
---

El ícono "monitor" que aparece en las capturas del lobby de EA FC Clubs Pro no distingue PC de Xbox — ambos se ven iguales. El 2026-08-03 esto llevó a marcar mal a Cabers14 y yzytx0 como "PC" cuando en realidad juegan en Xbox Series X|S.

**Por qué**: la Lista de Buena Fe (PDF oficial firmado por el DT, uno por temporada, en `VPN_Argentina_Lista_De_Buena_Fe_...pdf`) SÍ tiene una columna "Plataforma" explícita con PS5/PC/Xbox Series X|S diferenciados, más nacionalidad y teléfono. La web oficial del plantel (`virtualpronetwork.com/web/app/team/28524/top-secret/squad`) es una tercera fuente independiente (posiciones tácticas genéricas, no siempre coincide con el rol que usa el DT en convocatoria — ver [[arranque-temporada-vpn]] para el patrón de comunidad/Argentina al entrar a esa URL).

**Cómo aplicar**: cuando haya que cargar o verificar plataforma/nacionalidad de jugadores, preferir la Lista de Buena Fe (si el usuario la tiene) sobre capturas del lobby. Si solo hay capturas del lobby, tratar el dato de plataforma como provisorio y avisar que PC/Xbox pueden confundirse.

**Excepción confirmada**: Mauriii-_1891 — el PDF dice Argentina, pero el usuario pidió explícitamente dejarlo como uruguayo en el sitio (2026-08-03, revertido tras aplicar el fix). O sea: la Lista de Buena Fe es la mejor fuente disponible, pero no es infalible — ante una instrucción directa del usuario, esa gana siempre.

Ver también [[grillas-referencia-simetricas]] para otro caso de "revisar la fuente antes de asumir".
