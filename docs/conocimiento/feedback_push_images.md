---
name: feedback-push-images
description: Siempre pushear imágenes al repo cuando el usuario las sube o cuando el JS las referencia
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-08-25T14:31:15.805Z
---

Solo pushear imágenes que son **referenciadas directamente en HTML/JS** del sitio (renders de jugadores, logos, etc.). Las imágenes en `reportes/` son material fuente para extraer datos — nunca se suben al repo. Lo mismo aplica a `Renders/Instalaciones del club/` (fotos institucionales de uso interno, no referenciadas en ninguna página) — ya está en `.gitignore` desde 2026-08-25.

**Why:** El usuario lo aclaró explícitamente dos veces: primero para `reportes/` (no sirven para el sitio, solo para leer stats localmente), y de nuevo el 2026-08-25 cuando se generaron 4 fotos nuevas de instalaciones del club y se habían pusheado por error — "esa carpeta no debe ir al repo, son imágenes de uso interno". Se revirtió con `git rm --cached` + `.gitignore`. Regla general: antes de commitear una carpeta de imágenes nueva, verificar con grep si algún HTML/JS la referencia; si no, no commitear (o preguntar).

**How to apply:** Cuando se carguen partidos desde reportes, solo hacer `git add` de seed_matches.js y los HTML modificados. Nunca agregar archivos de `reportes/` al commit. Antes de commitear cualquier carpeta nueva bajo `Renders/`, grep el nombre de la carpeta contra los HTML/JS del sitio — si no aparece, es probablemente material de uso interno/fuente y no debe ir al repo.
