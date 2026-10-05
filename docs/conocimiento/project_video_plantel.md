---
name: project_video_plantel
description: Videos "Plantel" y "Equipo de hoy" (reel 9:16) — poses Gesto4 por jugador, clips de Canva, transición a brazos cruzados en la grilla; decisiones de Juan 2026-10-05
metadata:
  type: project
---

Herramienta en `scripts/video-plantel/` (ver su README). Primera versión 2026-10-05: `videos/plantel-t4.mp4` y `videos/equipo-2026-10-05.mp4` en R2.

**Decisiones de Juan (no volver a preguntarlas):**
- Cada jugador entra con una **pose propia, mirando a cámara, NO brazos cruzados** (`Renders/<gt>/Gesto4.png`, generadas con ChatGPT desde su Frente4). **Todas distintas.** Pedirle a ChatGPT "pose fachera" da mejores resultados; las Pose3 de la T3 sirven de referencia (la mayoría estaban bien).
- En la **grilla final cada jugador queda con su propia pose** (Juan, tras ver la versión con transición a brazos cruzados: "queda mejor"). La variante de grilla de brazos cruzados con transición sigue disponible con `POSE_GRILLA=Brazos4`.
- El mismo formato sirve para el **equipo de la noche** (formación y capitán de la convocatoria en Firestore).

**Gotchas:** el clip de Canva termina en primer plano y tapa el gesto → se reproduce al revés. En la tipografía de la espalda, ChatGPT escribe "KEE_VIINO3" (O por cero) y no lo corrige al pedírselo. Cupo de Canva: 19 clips ≈ 76% del mes (4% c/u).
- **Botón "Compartir video" en convocatoria** (2026-10-05): genera el video del equipo de hoy en el navegador y lo comparte por WhatsApp (`video-equipo.js`, hojas de cuadros en R2 `video-equipo/<VER>/`). Ver README de scripts/video-plantel.
