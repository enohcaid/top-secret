---
name: feedback-gamertags-verbatim
description: Gamertags de jugadores deben usarse verbatim — no cambiar mayúsculas ni formato aunque el usuario los escriba en minúsculas o de forma casual
metadata: 
  node_type: memory
  type: feedback
---

El usuario NUNCA escribe los gamertags perfectos en el chat — los escribe de forma casual. Si el jugador ya existe en el sitio (reclutamiento, plantel, convocatoria en Firestore), buscar el nombre correcto AHÍ, no copiarlo del mensaje.

**Why:** Los gamertags tienen casing específico que importa para carpetas (Renders/), Firestore, seed_matches, etc. El usuario lo aclaró explícitamente: cuando agrega jugadores que ya estaban en el sitio, el nombre correcto está en los datos existentes, no en el chat.

**How to apply:** Antes de hardcodear un gamertag nuevo, buscar si ya existe en el sitio: revisar Firestore (reclutamiento, plantel/activo), seed_matches.js, o cualquier referencia existente. Si no se puede acceder, preguntar al usuario el gamertag exacto. Ver también [[feedback-gamertags-noticias]].
