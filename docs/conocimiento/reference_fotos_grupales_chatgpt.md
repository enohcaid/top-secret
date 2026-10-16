---
name: reference_fotos_grupales_chatgpt
description: Cómo generar fotos grupales del plantel con ChatGPT sin jugadores repetidos ni números mal puestos (scripts/grupales-chatgpt.mjs)
metadata:
  type: reference
---

Juan quiere fotos grupales NUEVAS generadas con ChatGPT, no collages de renders (2026-10-16).

`node scripts/grupales-chatgpt.mjs [estudio|estadio|tunel|vestuario …]` — necesita el Chrome con CDP (`scripts/abrir-chrome-chatgpt.ps1`) logueado. Salida en `fuentes/grupales-ia/`; se sube a R2 `logos/grupales/grupal-ia-<id>-<ver>.webp` (lista `GRUPALES_IA_T4` en `estadisticas-datos.js`). Cada chat se borra después de bajar la imagen.

Lo que hizo falta para que salgan bien (cada punto corrigió un error real):
1. **Planillas con LETRAS (A–Q), nunca números**: con números 1–17 ChatGPT los pintaba como dorsales.
2. **Planilla de caras + dos de cuerpo entero (A–I, J–Q)** con las mismas letras (idea de Juan): el kit, las mangas, guantes y accesorios quedan en el jugador correcto.
3. **Ubicación obligatoria por letra** (`PLANES`, quién va atrás / al medio / adelante): sin eso, con las planillas de cuerpo entero repitió jugadores (19 personas) en 2 de 4 fotos.
4. **Dorsal**: la camiseta T4 NO lleva número adelante; va chico en la pierna derecha del short (y en la espalda). Manda el número de la lista del texto (el render de adri_cai muestra 99, su dorsal es 32).

Siempre revisar cada imagen antes de usarla: contar 17, que nadie esté repetido y dónde quedaron los números.
