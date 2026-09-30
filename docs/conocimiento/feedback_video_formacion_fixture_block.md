---
name: video-formacion-fixture-block-siempre-4-filas
description: "Los videos 'Formación Titular' llevan el partido de VPUG del día en el bloque de fixture — pero la copia grande y la copia chica del bloque NO tienen por qué mostrar las mismas filas: eso es el formato real, no un bug"
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-08-19T16:46:18.710Z
---

En el video "FORMACIÓN TITULAR VPN" (Canva `DAHRSFOyrTA`, ver [[canva-video-formacion-titular]]) el bloque de fixture tiene dos copias a distinta escala (grande y chica, ver el mecanismo de "2 copias en paralelo" en esa referencia). El usuario edita este diseño directamente en Canva entre sesiones.

**Corrección 2026-08-19 (segunda vuelta):** tras notar que la copia GRANDE tenía 3 filas (solo VPN) y la copia CHICA tenía 4 filas (VPUG + 3 VPN), asumí que era una inconsistencia/bug y "arreglé" agregando la fila de VPUG a la copia grande también. El usuario corrigió: "no era una inconsistencia, es así el formato, lo acababa de editar yo" — el usuario había editado el diseño a mano en Canva minutos antes con esa estructura asimétrica a propósito (probablemente la copia chica es la que aparece en un momento "resumen" del video que sí lista todos los partidos incluido VPUG, mientras la copia grande solo destaca los de la liga principal del video). Tuve que revertir mi "arreglo" (borrar los 4 elementos que había insertado en la copia grande).

**Cómo aplicar:** NUNCA asumir que una diferencia de contenido entre la copia grande y la copia chica del bloque de fixture es un error a corregir — puede ser estructura intencional que el usuario armó a mano en el editor de Canva. Si algo se ve "inconsistente" entre ambas copias, PREGUNTAR antes de tocar nada, en vez de "corregirlo" unilateralmente. Además: el usuario edita este diseño directamente en Canva entre llamadas a la API — el documento puede cambiar sin que yo lo haya tocado; antes de reconstruir/reparar algo que parece raro, considerar que puede ser edición reciente del usuario, no drift ni un bug de la API.
