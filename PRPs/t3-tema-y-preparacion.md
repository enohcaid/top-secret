# PRP: Preparación T3 — Tema Azul/Gris + Toggle 3 modos

## Overview

Agregar un tercer tema visual al sitio ("T3 mode": gris oscuro + azul) que pase a ser el **predeterminado** para nuevos visitantes. El sistema actual soporta dark (default) y light; se extiende a un ciclo de 3 estados: `t3 → dark → light → t3`. Todo el sistema de temas vive en `layout.js` — un solo archivo a modificar para que los cambios se propaguen a todas las páginas. Los renders T3 (Brazos3/Frente3) ya están soportados en `convo.html` y `convocatoria.html`.

## Affected Files

| File | Change type | Description |
|------|------------|-------------|
| `layout.js` | modify | Core: lógica de tema, CSS `html.t3-mode`, toggle 3-way |
| `mobile-nav.js` | modify | Hardcodea `#C9A84C` y `#111111` — actualizar a variables |

Los archivos `.html` individuales **no se tocan**: sus `:root` ya usan `--gold`, `--black`, `--gray`, etc. que el override de `html.t3-mode` sobreescribe automáticamente.

## Context & Patterns

### Cómo funciona el tema actual en `layout.js`

```js
// Línea 8-10: se aplica ANTES de que el DOM cargue (sin flash)
const THEME_KEY = 'ts_theme';
const htmlEl = document.documentElement;
if (localStorage.getItem(THEME_KEY) === 'light') htmlEl.classList.add('light-mode');
// Si no hay valor → no se agrega clase → dark mode (default actual)
```

```js
// Toggle actual (binario: light ↔ dark)
btn.addEventListener('click', function () {
  const light = !htmlEl.classList.contains('light-mode');
  htmlEl.classList.toggle('light-mode', light);
  icon.innerHTML = light ? SUN_SVG : MOON_SVG;
  if (logo) logo.src = light ? LOGO_LIGHT : LOGO_DARK;
  localStorage.setItem(THEME_KEY, light ? 'light' : 'dark');
});
```

### CSS variables que layout.js inyecta como `:root` (OVERRIDES las páginas)

```css
/* layout.js línea 35 — sobreescribe el --gold de cada página */
:root { --gold: #B0B8C4; --gold2: #D4DAE4; }

/* light-mode restaura el gold original */
html.light-mode {
  --gold: #C9A84C; --gold2: #E8C97A;
  --bg: #FFFFFF; --card: #F5F5F0; ...
}
```

### Paleta T3 (gris oscuro + azul)

| Token | Valor | Rol |
|---|---|---|
| `--gold` | `#4a9eff` | Acento principal (azul reemplaza dorado) |
| `--gold2` | `#7ab8ff` | Acento secundario |
| `--gold-dim` | `rgba(74,158,255,.12)` | Acento transparente |
| bg body | `#0d1117` | Fondo (gris muy oscuro, tono azulado) |
| card | `#161b22` | Tarjetas/paneles |
| border | `rgba(74,158,255,.15)` | Bordes |
| text | `#e0e8f4` | Texto principal |

### Patrón de override existente a replicar

```css
/* MODELO: así funciona light-mode — replicar para t3-mode */
html.light-mode { --gold: #C9A84C; --gray: #F5F5F0; ... }
html.light-mode body { background: #FFFFFF; color: #111111; }
html.light-mode .topbar { background: #FFFFFF; border-bottom-color: #C9A84C; }
html.light-mode .sidebar-left { background: #FFFFFF; border-right-color: #E5E5E0; }
html.light-mode .sl-link.active { background: rgba(201,168,76,.08); color: #C9A84C; }
```

## Requirements

- [ ] T3 es el tema predeterminado: si `ts_theme` es `null` (visita nueva) o `'t3'`, aplicar `t3-mode`
- [ ] El toggle cicla: `t3 → dark → light → t3` (3 estados)
- [ ] Cada estado tiene su ícono en el botón del topbar: estrella (T3), luna (dark), sol (light)
- [ ] Usuarios existentes con `'dark'` o `'light'` guardado no se ven afectados
- [ ] `html.t3-mode` sobreescribe `--gold` a `#4a9eff` y el fondo a gris azulado oscuro
- [ ] El logo en topbar: en T3 usar logo blanco (mismo que dark), en dark el mismo, en light el de color
- [ ] `mobile-nav.js` debe usar `var(--gold)` en vez de `#C9A84C` hardcodeado para heredar el acento

## Gotchas

- **Sin flash**: La clase debe aplicarse al `<html>` ANTES del render. El bloque de detección de tema (líneas 8-10 de layout.js) se ejecuta sincrónicamente al parsear el `<script src="layout.js">`. Esto funciona si el `<script>` está en el `<head>` o al inicio del `<body>`. **No usar DOMContentLoaded para este bloque**.
- **layout.js sobreescribe `:root`**: El `document.head.appendChild(style)` inyecta el CSS DESPUÉS del `<style>` inline de cada página. Esto significa que `:root{--gold:#B0B8C4}` de layout.js tiene precedencia. T3 debe redefinir esto con `html.t3-mode { --gold: #4a9eff }` que tiene especificidad mayor.
- **`mobile-nav.js` hardcodea colores**: líneas `color: #666`, `color: #C9A84C`, `border-top: 2px solid rgba(201,168,76,.25)`, `background: #111111`. Reemplazar con variables CSS o agregar override en `html.t3-mode #ts-mobile-nav`.
- **No usar `transition: all`**: especificar propiedades exactas.
- **Renders T3**: Brazos3/Frente3 ya están soportados en convo.html y convocatoria.html. Si se agregan a otras páginas en el futuro, el mismo patrón aplica.

## Implementation Blueprint

```
PASO 1 — Modificar detección de tema al inicio de layout.js (IIFE, antes del DOMContentLoaded):
  stored = localStorage.getItem('ts_theme')
  if stored === 'light' → add 'light-mode' to html
  else if stored === 'dark' → no class (dark legacy)
  else → add 't3-mode' to html   // null o 't3' → nuevo default

PASO 2 — Agregar CSS html.t3-mode al bloque de estilos inyectado:
  html.t3-mode { --gold: #4a9eff; --gold2: #7ab8ff; --gold-dim: rgba(74,158,255,.12); }
  html.t3-mode body { background: #0d1117; color: #e0e8f4; }
  html.t3-mode .topbar { background: #0d1117; border-bottom-color: #4a9eff; }
  html.t3-mode .sidebar-left { background: #0d1117; border-right-color: rgba(74,158,255,.15); }
  html.t3-mode .sl-link:hover { background: rgba(74,158,255,.08); }
  html.t3-mode .sl-link.active { background: rgba(74,158,255,.12); color: #4a9eff; }
  html.t3-mode .sidebar-right { background: #0d1117; border-left-color: rgba(74,158,255,.1); }
  html.t3-mode .tb-theme-btn:hover { color: #4a9eff; border-color: rgba(74,158,255,.4); ... }
  html.t3-mode #ts-mobile-nav { background: #0d1117; border-top-color: rgba(74,158,255,.25); }
  html.t3-mode #ts-mobile-nav a.ts-mbn-active { color: #4a9eff; }

PASO 3 — Definir SVG para el ícono T3 (estrella de 5 puntas):
  T3_SVG = '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'

PASO 4 — Función getTheme() + applyTheme(theme) + cycleTheme():
  getTheme() → lee localStorage, null/'t3' → 't3', else el valor guardado
  applyTheme(theme):
    remove 'light-mode', 't3-mode' from html
    if 't3' → add 't3-mode'; icon = T3_SVG; logo = LOGO_DARK
    if 'light' → add 'light-mode'; icon = SUN_SVG; logo = LOGO_LIGHT
    if 'dark' → nothing; icon = MOON_SVG; logo = LOGO_DARK
    localStorage.setItem(THEME_KEY, theme)
  cycleTheme():
    cycle = { t3: 'dark', dark: 'light', light: 't3' }
    applyTheme(cycle[getTheme()])

PASO 5 — Reemplazar el event listener del botón con cycleTheme()

PASO 6 — mobile-nav.js: reemplazar colores hardcodeados
  #111111 → var(--black, #111111)
  rgba(201,168,76,.25) → var(--gold-dim, rgba(201,168,76,.25)) — o override en t3-mode CSS
  #C9A84C en .ts-mbn-active → color: var(--gold)
```

## Tasks (en orden)

1. [ ] En `layout.js`, reemplazar las líneas 8-10 de detección de tema con la lógica de 3 estados
2. [ ] Agregar `html.t3-mode { ... }` CSS al bloque `style.textContent` en `layout.js`
3. [ ] Definir `T3_SVG` junto a `MOON_SVG` y `SUN_SVG`
4. [ ] Actualizar `isLight()` → reemplazar por `getTheme()` helper
5. [ ] Actualizar el `innerHTML` inicial del botón y el `src` del logo según el tema al cargar
6. [ ] Reemplazar el event listener del toggle con `cycleTheme()`
7. [ ] En `mobile-nav.js`, reemplazar colores hardcodeados de acento y fondo por variables o agregar override `html.t3-mode #ts-mobile-nav` en el CSS de layout.js
8. [ ] Verificar que las páginas heredan `--gold: #4a9eff` correctamente sin tocar sus archivos HTML

## Validation

```
Manual steps:
1. npx serve . --port 8000
2. Abrir http://localhost:8000/index.html en incógnito (sin localStorage)
3. Verificar: fondo #0d1117, acento azul en topbar y sidebar → T3 es el default
4. Hacer clic en el botón de tema → debe pasar a dark (luna, fondo #111111, acento #B0B8C4)
5. Hacer clic de nuevo → light (sol, fondo blanco, acento dorado)
6. Hacer clic de nuevo → vuelve a T3 (estrella)
7. Recargar la página en cada modo → verificar que el tema persiste (sin flash)
8. Abrir http://localhost:8000/convocatoria.html → verificar acento azul en cards y controles
9. Abrir http://localhost:8000/posiciones.html → verificar tablas con acento azul
10. Verificar en 375px (mobile): bottom nav con acento azul en ítem activo
11. Abrir consola → sin errores JavaScript
```

## References

- Existing theme system: `layout.js` líneas 1-30 (detección) y 73-143 (CSS overrides)
- Patrón light-mode a replicar: `layout.js` líneas 74-142
- Mobile nav colores: `mobile-nav.js` líneas 47-75

---
**PRP Score**: 8/10
**Confidence**: Sistema de temas bien comprendido y centralizado en un solo archivo. El patrón light-mode es la plantilla exacta a replicar para t3-mode. El único riesgo es que algunas páginas tengan colores hardcodeados (no en variables) que el override no alcance — requiere verificación visual página por página en el paso de validación.
