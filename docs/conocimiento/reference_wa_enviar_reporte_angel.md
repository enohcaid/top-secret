---
name: reference_wa_enviar_reporte_angel
description: Mandar fotos/texto desde el WhatsApp personal de Juan (scripts/wa-enviar.mjs) — se usa para el reporte de VPUG a Angel; trampas de whatsapp-web.js 1.34.7
metadata:
  type: reference
---

`node scripts/wa-enviar.mjs --a <teléfono> --texto "..." foto1.png foto2.png ...` manda primero el texto y después todas las fotos juntas, desde la sesión de WhatsApp personal de Juan (`scripts/.wa-personal/`, la misma que el bot de amistosos: **no correrlo mientras el bot está prendido**). `--prueba` lo manda al chat "Mensaje a mí mismo" de Juan, que sirve para que valide desde el celular. Al final confirma en WhatsApp que cada mensaje salió como texto o foto (ack ≥ 1).

**Reporte de VPUG a Angel** (`Angel VPUG`, +598 93 798 044; qué pide: ver [[project_vpug_t4_pretemporada]]): las fotos salen de las pantallas que captura el vigía (`fuentes/vivo/<sesión>/reporte/`) más el cartel "Fin del partido", que se saca de la grabación del vivo (dura ~1 s, unos 60 s antes de la primera pantalla de reporte; **en un 0-0 no aparece**: va la pantalla Resumen con el 0-0). Se arman en `fuentes/reporte-angel/<fecha>/` (gitignored), Juan las valida y se manda un mensaje por partido (`F5 · Top Secret 1-0 Rival` + sus fotos). Primer envío: 2026-10-12.

Trampas (whatsapp-web.js 1.34.7, 2026-10-13):
- `client.sendMessage` con `MessageMedia` **no crea el mensaje** (tira "Data passed to getter must include an id"). Los textos sí salen (el mismo error a veces aparece después de enviarlos, se tolera). Por eso las fotos se adjuntan por la interfaz de WhatsApp Web: Adjuntar → **"Fotos y videos"** → selector de archivos → enviar.
- El `<input type=file accept="image/*">` que ya está en la página es el de **"Nuevo sticker"**: si se usa ese, al rival le llegan stickers (pasó el 2026-10-12 con Angel). Siempre hacer click en "Fotos y videos" y tomar su selector de archivos.
- Recién conectado, esperar ~15 s antes de mandar (WhatsApp Web sigue sincronizando).
