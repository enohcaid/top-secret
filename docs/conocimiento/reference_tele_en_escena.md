---
name: reference_tele_en_escena
description: Video dentro del video (scripts/social/piezas/2026-11-09-sab-pov2.mjs): poner una jugada en una tele de una foto de ChatGPT, fallas de imagen por código, trampas de Canva y de los goles guardados
metadata:
  type: reference
---

Técnica de "POV: se te cae el internet en la final" (2026-11-06, con `plantillas/pov2.html`).

- **La tele:** pedirle a ChatGPT la pantalla "apagada, negro mate, de frente", medir los 4 rincones y poner un canvas de 1280x720 encima con `matrix3d`. La cámara se mueve por código sobre foto + tele juntas, así no hace falta seguir la pantalla. No pasar por Canva las tomas con tele, salvo para usar una parte que no la incluya: del clip del sillón se usa solo de la mitad para abajo (las manos), con la unión en el piso.
- **La jugada:** los goles guardados tienen la cámara lejana y no hay ningún mano a mano limpio. Recortar al doble alrededor del que lleva la pelota alcanza (el texto dice el resto) y de paso deja afuera HUD, radar y carteles. Marcador y minuto se dibujan encima. Ojo con el aviso de PlayStation "Tu amigo … está online": es una persona real.
- **Las fallas:** bloques de 40 px copiados de un cuadro viejo, de a manchones y con alguno teñido de magenta o verde; desgarro por franjas; píxeles por zonas. Todo con azar sembrado por pulso. Un corrimiento rojo fuerte deja la cancha amarilla: usarlo apenas, solo en el golpe.
- **Canva inventa objetos:** al clip del router le creció una cámara de fotos gigante desde el cuadro ~50. Revisar el clip entero antes de usarlo y quedarse con lo limpio, ida y vuelta.
- **Cambiar el color de luces de un clip:** los cuadros de Canva no siempre miden 9:16 justo y la plantilla los estira, así que la posición medida en el cuadro no coincide en alto con la de pantalla (hizo falta un corrimiento fijo). Se sigue con un peine de 5 dientes sobre los núcleos brillantes (el centroide se corre si el enchufe tapa una luz) y se tiñe con `hue-rotate` en una mancha de borde difuminado.
- **Sonido:** cortar la música de verdad en el audio final (granos repetidos, huecos, silencio) vende la falla más que cualquier efecto. El silencio sigue hasta el cierre, así el pitazo y el 1-2 pegan solos.
- **Alguien delante de la tele** (vlog de triple fecha, `2026-11-23-sab-vlog.mjs` + `plantillas/vlog.html`, 2026-11-19): encima de la jugada va la misma foto con la pantalla vuelta transparente (`delante-*.png`). Lo claro tapa solo (el puño), pero un buzo negro es tan oscuro como la pantalla: la silueta del pibe sale de rembg (`u2net_human_seg`, `only_mask=True`) y se suma al alfa. La medición automática de la mancha negra falló (el buzo se pegaba a la pantalla, el pie de la pantalla no es tan negro): medir a mano sobre una grilla de 20 px y dejar las medidas en el script.
- **sharp:** `blur()` sobre una máscara de 1 canal la devuelve en 3 (agregar `.extractChannel(0)` antes de `joinChannel`, si no el alfa sale corrido), y `extract`/`resize` se aplican ANTES que `composite` aunque se escriban después (componer a un buffer y después recortar).
- **Mismo cuarto en todas las tomas:** generar primero la toma abierta y adjuntarla a las demás ("la imagen adjunta es el mismo cuarto"). Salió consistente en 7 de 7; la única rehecha fue por continuidad (lo sentó en el sillón con la silla vacía adelante): encuadre cerrado y "ningún otro mueble en cuadro".
- **Portada:** tomar el cuadro con el oscurecido bajado (`D.paraPortada`): la plantilla de portada ya oscurece abajo.
