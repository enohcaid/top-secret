---
name: alwayspresent-lo-pone-el-jugador
description: "alwaysPresent (\"fijo\") en convocatoria nunca se marca automáticamente al promover/agregar un jugador — lo tiene que activar el jugador mismo"
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-09-09T21:11:35.292Z
---

En convocatoria.html, el flag "fijo" (`alwaysPresent` en `convocatoria/state`) NUNCA debe marcarse automáticamente cuando se promueve o agrega un jugador (ni desde reclutamiento.html ni desde ningún otro flujo). Tiene que ser una acción que decide y ejecuta el jugador mismo, siempre — nunca un default que le ponga el sistema o un admin en su nombre al darlo de alta.

**Contexto (2026-09-09):** después de marcar manualmente a Elianja20 como fijo (a pedido explícito del usuario, caso puntual) y de arreglar el delay con el que su nombre aparecía en la lista de convocatoria, implementé que TODO futuro jugador promovido desde reclutamiento.html quedara marcado "fijo" automáticamente (`arrayUnion` sobre `alwaysPresent` en `_confirmarPromover()`). El usuario corrigió esto explícitamente: no tiene que venir marcado por defecto.

**Revertido en commit ab72e1c** (sobre el feature original en d71e9f0): se sacó el `CONV_DOC`, el sign-in anónimo y el `arrayUnion` de `reclutamiento.html` — volvió a su estado previo. El otro fix del mismo commit (el delay de `_loadPlantel()` en convocatoria.html, que esperaba el `.get()` inicial antes del primer `render()`) SÍ era un bug real y se mantuvo — no se tocó.

**Por qué importa distinguir:** "arreglar el bug de que tarda en aparecer en la lista" y "marcarlo fijo automáticamente" son dos cosas separadas que se pidieron/hicieron juntas ese día, pero solo la primera era un bug de verdad — la segunda era una decisión de producto que el usuario NO quería. Al automatizar flujos de convocatoria/plantel a futuro, separar bien estas dos categorías: bugs técnicos (arreglar sin preguntar) vs. reglas de negocio de cómo se comporta el estado de un jugador (confirmar antes de asumir un default).
