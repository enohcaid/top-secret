---
name: reference_camara_celular
description: Anuncios gigantes imposibles "filmados con el celular": qué pedirle a ChatGPT y a Canva, y qué poner por código encima (pieza del Obelisco, 2026-11-06)
metadata:
  type: reference
---

Técnica de `scripts/social/piezas/2026-11-09-jue-obelisco.mjs` + `plantillas/obelisco.html`.

**ChatGPT (`promptCompleto` + `adjuntos` propios):** pedir "cuadro de video filmado con un celular por un peatón", no "fotografía cinematográfica", con gente de espaldas filmando en primer plano. Ropa: adjuntar `logos/nosotros/detalle-k1.png` + `Clean logo Dorado` y decir el lado desde el que mira (escudo a la derecha, swoosh a la izquierda). Con esto la camiseta salió bien de primera.
**Escudos gigantes:** si no se aclara, ChatGPT dibuja solo el contorno hueco. Hay que pedir "macizo, relleno, nunca un contorno".

**Canva:** la tela, el escudo y la cara aguantan bien. Va a 0,45–0,7 de velocidad para no llegar al final del clip, donde se desvía (le creció una placa a la pelota, la farola se volvió un óvalo blanco: lo tapó el sol quemado de la plantilla). A esa altura del mes el cupo llegó al 100 %: desde ahí cada clip tarda ~8 min, así que no correr tandas en una tarea con límite de 10 min (quedan cacheados y se retoma).

**Encima, por código y determinístico (función de t):** mano (sumas de senos + paso), encuadre que llega de costado, foco que busca al arrancar (nunca en la primera toma: es el gancho), exposición que respira, sol y fantasmas de lente que se mueven con la cámara, ruido de sensor. El grano fino (canvas 540x960, opacidad 0,09; de noche 0,16): más grueso o más fuerte se nota y además infla el archivo (de 39 a 25 MB).

**Sonido de ciudad:** no hay ninguno en el repo; `conCiudad()` lo sintetiza con ffmpeg (ruido marrón + rosa + bocinas con eco) y lo corta en seco con el negro del remate. Pasar todo a estéreo: `amix` con una fuente mono dejaba el video en mono.

Doble sentido: "¿Dónde la pondrías vos?" (el texto del guion) no lo detecta `revisar-textos.js`, pero va contra [[feedback_sin_doble_sentido]]; se reescribió a "colgarías".
