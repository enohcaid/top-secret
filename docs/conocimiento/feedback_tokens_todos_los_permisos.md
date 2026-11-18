---
name: feedback_tokens_todos_los_permisos
description: "Al generar o pedir un token para una cuenta (Meta, Google, TikTok, X…), pedir de entrada TODOS los permisos que el proyecto pueda necesitar, lecturas y métricas incluidas, no solo publicar"
metadata:
  node_type: memory
  type: feedback
  originSessionId: d17babd9-833d-4831-8d51-f67d2786426d
  modified: 2026-11-18T22:55:47.486Z
---

Juan, 2026-11-18: "anotá esto para que la próxima que genere un token para el uso de una cuenta, no te olvides ningún permiso".

El token de Meta (app "Top Secret FC Publicador", 2026-10-01) se generó solo con permisos de publicar. Le faltaron `instagram_manage_insights` y `read_insights`, así que nunca se pudieron leer alcance, vistas, compartidos ni guardados: las decisiones de contenido viral se tomaron con likes. Agregar un permiso después obliga a re-autorizar con el login de Juan, y Juan no lo va a hacer.

**Why:** cada permiso olvidado cuesta un nuevo login del dueño de la cuenta, y eso a veces no se puede conseguir. Lo que no se pidió al principio queda sin poder usarse.

**How to apply:**
- Antes de abrir el diálogo de autorización de cualquier cuenta, armar la lista completa de permisos: publicar + leer + **métricas/insights** + comentarios/mensajes si alguna vez se van a moderar + administración (páginas, cuentas vinculadas). Pensar en lo que el proyecto va a querer más adelante, no solo en la tarea de hoy.
- Mostrarle la lista a Juan en el mismo momento, para que autorice una sola vez.
- Meta (Facebook + Instagram), lista mínima: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_metadata`, `pages_read_user_content`, `pages_manage_engagement`, `read_insights`, `publish_video`, `business_management`, `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`, `instagram_manage_comments`.
- Después de generar el token, revisar con `debug_token` que estén **todos** los permisos pedidos (si el usuario destilda uno en el diálogo, no aparece) y que sea permanente.
- Credenciales en `.env` (ver `docs/conocimiento/reference_publicar_redes.md`, "API de Meta configurada").
