---
name: reference_pizarra
description: Pizarra en vivo (topsecret.ar/pizarra) — dónde guarda el estado, por qué en plantel/, límites de escritura y qué hacer cuando cambia el plantel
type: reference
---

`pizarra.html` + `pizarra.js` (Juan, 2026-11-04). Tablero compartido en tiempo real, enlazado en Miembros.

- **Estado en Firestore**: `plantel/pizarra` (`f`, solo las fichas que alguien movió) y `plantel/pizarra-trazos` (`t`). Van dentro de `plantel` porque esa colección ya admite escritura abierta y las reglas de Firestore no están en el repo (una colección nueva da 403 hasta sumarle su `match`). Ambos documentos vacíos = formación base.
- **Sin login**: cualquiera con el enlace puede mover y borrar, como pidió Juan ("todos"). Si aparece vandalismo, lo natural es exigir auth anónima + reglas, como en `convocatoria`.
- **Consumo**: como mucho 5 escrituras/s al arrastrar o dibujar (`CADA_MS`), y cada cambio es una lectura por cada pestaña abierta; las pestañas ocultas dejan de escuchar. Comparte cuota con el resto del proyecto, así que no bajar `CADA_MS` sin mirar el uso.
- **Latencia medida**: unos 0,4–0,6 s; la primera escritura de cada navegador tarda cerca de 2 s porque abre la conexión. Al probar, no asumir que llegó antes de eso.
- **Coordenadas**: marco único de cancha (x de nuestro arco al rival, y a lo ancho). Acostada en PC, parada en celular: el giro se resuelve en `toPx`/`fromPx`, nunca en los datos.
- **Cambio de plantel**: las fichas salen de `ROSTER_T4`. Jugador nuevo: `node scripts/pizarra-caras.mjs --subir` (genera `fuentes/pizarra-caras/_hoja.png` para revisar las caras; ajustes en `AJUSTES`). Arranca en el banco salvo que se lo agregue a `XI` en `pizarra.js`. Si alguien de `XI` se va, sacarlo de ahí. Render regenerado con otra cara: volver a correr y cambiar el nombre o agregar `?v=`, porque `/media` se sirve como immutable.
