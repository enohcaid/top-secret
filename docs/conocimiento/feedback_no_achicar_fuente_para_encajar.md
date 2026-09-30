---
name: no-achicar-fuente-para-encajar-texto
description: "Cuando un texto nuevo (rival largo, etc.) no entra en el tamaño de fuente original de un elemento (Canva u otros editores), NUNCA achicar el font_size para que entre — escribir el texto al tamaño original y centrar/ajustar el recuadro (box) en su lugar"
metadata:
  type: feedback
  modified: 2026-08-25T22:45:51.665Z
---

Al editar el video "Formación Titular 11x11" en Canva (2026-08-25, ver [[canva-video-formacion-titular]]), cuando el nombre de un rival nuevo era más largo que el original (ej. "comunicaciones esports 23:30h" vs "sub 21 cf 23:30h"), reduje el `font_size` del texto para que entrara en el ancho de caja existente (siguiendo una práctica de sesiones anteriores documentada en esa misma memoria de referencia). El usuario corrigió: **nunca cambiar el tamaño de letra para que algo entre — escribir el texto en el tamaño que está y despues centrar el recuadro**. Aclaración inmediata siguiente: **"o dejás que exceda el recuadro"** — es decir, también es aceptable simplemente dejar que el texto desborde la caja original, sin centrar nada. Las dos son válidas; lo único prohibido es tocar el `font_size`.

**Cómo aplicar:** cuando un texto no entra en el ancho/alto actual de su elemento:
1. Mantener el `font_size` original SIN TOCARLO, siempre.
2. Elegir la opción más simple según el caso: (a) agrandar el RECUADRO (`resize_element`) y listo, dejando que el texto exceda el ancho/posición original si hace falta — esta es la opción por defecto, más simple; o (b) si hace falta prolijidad visual, redimensionar y además centrar (`position_element`) el recuadro ya agrandado en su lugar. No hace falta esforzarse en centrar si con solo agrandar (dejando que exceda) ya se lee bien.

Esta instrucción probablemente anula la nota anterior en `canva-video-formacion-titular.md` que decía "bajar font_size... hasta que entre en la misma cantidad de líneas" — esa práctica quedó obsoleta por esta corrección más reciente y explícita del usuario. Aplica en general a cualquier ajuste de texto que no entre en su contenedor, no solo en este video puntual.
