# DESIGN.md — Top Secret FC

## Temas

Cuatro temas gestionados por `layout.js` vía clase en `<html>` + override de CSS custom properties. Las páginas definen tokens base inline en su `<style>`; los temas los pisan.

| Tema | Clase | Rol |
|---|---|---|
| **Clasificado** (default) | `cls-mode` | Negro cálido `#0B0A07` + dorado comprometido `#C8A84B`. La identidad del club. |
| T3 azul | `t3-mode` | GitHub-dark `#0d1117` + azul `#4a9eff`. Legado T3, disponible en el toggle. |
| Dark plata | *(sin clase)* | Look original: `#111` + acentos según tokens de cada página. |
| Light | `light-mode` | Blanco cálido + dorado `#C9A84C`. |

Regla: **nuevos componentes se estilan con tokens (`var(--gold)`, `var(--card)`, …), nunca colores hardcodeados**, así heredan los cuatro temas gratis. Si un componente necesita ajuste por tema, el override vive en `layout.js` bajo `html.cls-mode` / `html.t3-mode` / `html.light-mode`.

## Tokens núcleo (Clasificado)

```css
--gold: #C8A84B;  --gold2: #E0C979;  --gold-dim: rgba(200,168,75,.12);
--bg / --black: #0B0A07;   --card / --gray: #16130B;   --card2: #1D1910;
--border: rgba(200,168,75,.16);
--text: #F2EEE0;  --mid: rgba(242,238,224,.42);
```

Semánticos (iguales en todos los temas oscuros): `--vpn #F5C518` · `--vpug #3ECF8E` · `--e11 #4A9EFF` · `--win #22C55E` · `--draw #F59E0B` · `--loss #EF4444`.

**Regla de color**: el color semántico (verde/rojo/amarillo) se reserva para resultado deportivo (V/E/D, GF/GC, estados de jugador). Todo lo demás usa tinta base o dorado. Nunca más de un acento decorativo por vista.

## Tipografía

- **Bebas Neue**: marca y titulares héroe (hero, nav-index, título de página grande).
- **Barlow Condensed** (700-900): títulos de sección, números, labels caps.
- **Barlow** (400-700): cuerpo.
- Caps con tracking solo en labels cortos y kickers; nunca en cuerpo.
- Escala: saltos ≥1.25 entre niveles. Los títulos de página usan `clamp()`.

## Lenguaje "expediente" (tema Clasificado)

- Badges de sección (`.section-badge`, `.ph-eyebrow`) = **sello de dossier**: borde dorado 1px + doble línea interior (box-shadow inset), tracking `.22em`, radius 2px.
- Kickers numerados estilo índice (`01 /`) en navegación tipográfica.
- Reglas de sección: hairline con degradado dorado→transparente.

## Prohibiciones (aprendidas, no repetir)

- Side-stripes (`border-left` >1px como acento) → usar fondo tintado + borde completo.
- `transition: all` → propiedades específicas.
- Glassmorphism decorativo y animaciones `infinite` de adorno.
- Métricas arcoíris (cada número de un color distinto).
- Tarjetas idénticas icono-título-texto para navegación → índice tipográfico.
- Emojis como iconografía de UI → dots CSS (`.sdot`) o SVG del sistema.
- Texto de implementación en copy ("IA extrae stats…") → voz de club.

## Motion

- Entradas con GSAP: fade+rise corto (`power3.out`), stagger ≤0.12s, solo primera carga.
- Nada de bounce/elastic. Nada infinito salvo señales de estado en vivo (dot pulsante).
- `prefers-reduced-motion` global inyectado por `layout.js`.

## Assets

- Renders de jugadores: `Renders/<gamertag>/Frente*.png` (fallback silueta).
- Escudos: `logos/Top Secret white.png` (oscuro), `TOP Secret Blue.png` (t3), `Top-Secret.png` (light/favicon).
- Fotos hero: `logos/Facha N.webp` (comprimidas; PNGs pesados no se commitean).
