---
name: reference_bordado_dst
description: Cómo se genera el .dst de bordado del logo Clean (scripts/bordado), qué decidimos y qué falta probar en máquina
type: reference
---

**Archivo:** `bordado/clean-dorado-80mm.dst` (70,6 × 79,8 mm, un solo color, unas 5.400 puntadas) y su vista previa. Hecho el 2026-11-07 tomando de referencia un `corazon15mm.DST` que pasó Juan. Por decisión de Juan, la carpeta `bordado/` queda solo local (en `.gitignore`, no se publica en el sitio): en otra PC se regenera con los comandos de abajo.

**Regenerar en otro tamaño o densidad:**

```bash
python scripts/bordado/generar_logo_dst.py --alto 80 --salida bordado/clean-dorado-80mm.dst
python scripts/bordado/verificar_dst.py bordado/clean-dorado-80mm.dst --alto 80 --png bordado/clean-dorado-80mm-vista-previa.png
```

Opciones: `--fila` (separación de filas, 0,4 mm), `--largo` (puntada, 3,5 mm), `--compensacion` (0,1 mm). Python con numpy, scipy, scikit-image y Pillow. `dst_lib.py` lee y escribe el formato sin dependencias; `analizar_dst.py` inspecciona cualquier .dst.

**Formato DST:** cabecera de 512 bytes, 3 bytes por comando, unidades de 0,1 mm, máximo 12,1 mm por comando. No guarda colores: el dorado lo elige quien opera la máquina al poner el hilo. No tiene comando de corte: el corte se indica con saltos seguidos (acá 4 o más, igual que el ejemplo) y depende de la configuración de la máquina.

**Límite de tamaño:** la ranura entre las mitades del saco mide 28 px del logo: 1,3 mm a 80 mm, 0,8 mm a 50 mm, 0,25 mm a 15 mm. Por debajo de 1 mm se cierra en tela, así que tamaños chicos necesitan abrir los huecos (el script todavía no lo hace).

**Decisiones:**
- El ejemplo tiene filas cada 0,15-0,2 mm, muy denso porque es un dibujo chico. Para áreas grandes se usó el estándar de 0,4 mm.
- El bisel y el degradé del logo no se pueden bordar. El juego de luz sale de cambiar el ángulo del hilo entre piezas (ángulos en `PIEZAS`).
- Filas casi paralelas a un borde dejan serrucho: el saco va a ±35° cruzando sus bordes, y todas las piezas llevan un contorno triple por encima.

**Sin probar en máquina todavía:** los controles son geométricos y de formato. El comportamiento real sobre la tela (encogimiento, densidad) se confirma con una muestra.
