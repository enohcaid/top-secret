// Gráficos SVG de estadisticas.html. Devuelven strings de markup; los colores son tokens CSS
// (var(--gold) etc.) para que sigan el tema, y los atributos data-* son los que anima estadisticas-motion.js.
import { esc } from './estadisticas-datos.js';

const f1 = v => Math.round(v * 10) / 10;

// Arco de porcentaje (posesión, tiros al arco). pathLength=100 → el dasharray es el porcentaje directo.
export function arc({ pct, color = 'var(--gold)', size = 180, stroke = 12, label = '', sub = '' }) {
  const r = (size - stroke) / 2, c = size / 2, p = Math.max(0, Math.min(100, pct || 0));
  return `<svg class="g-arc" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(label)}: ${Math.round(p)}%">
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${stroke}"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
      pathLength="100" stroke-dasharray="${f1(p)} 100" transform="rotate(-90 ${c} ${c})" data-arc="${f1(p)}"/>
    <text x="${c}" y="${c - 4}" text-anchor="middle" dominant-baseline="middle" class="g-arc-val" data-count="${f1(p)}" data-dec="0" data-suffix="%">${Math.round(p)}%</text>
    ${sub ? `<text x="${c}" y="${c + 24}" text-anchor="middle" class="g-arc-sub">${esc(sub)}</text>` : ''}
  </svg>`;
}

const RADAR_R = 0.29;   // radio relativo: deja lugar a las etiquetas largas ("Recuperación")
// Radar: ejes [{k, v 0-100}]. `compare` (opcional) se dibuja punteado debajo.
export function radarPoints(axes, size, scale = 1) {
  const c = size / 2, R = size * RADAR_R * scale, n = axes.length;
  return axes.map((a, i) => {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2, r = R * Math.max(0.04, (a.v || 0) / 100);
    return `${f1(c + Math.cos(ang) * r)},${f1(c + Math.sin(ang) * r)}`;
  }).join(' ');
}
export function radar(axes, { size = 320, compare = null, color = 'var(--gold)', id = '' } = {}) {
  const c = size / 2, R = size * RADAR_R, n = axes.length;
  const ring = f => axes.map((_, i) => { const ang = (i / n) * Math.PI * 2 - Math.PI / 2; return `${f1(c + Math.cos(ang) * R * f)},${f1(c + Math.sin(ang) * R * f)}`; }).join(' ');
  const spokes = axes.map((_, i) => { const ang = (i / n) * Math.PI * 2 - Math.PI / 2; return `<line x1="${c}" y1="${c}" x2="${f1(c + Math.cos(ang) * R)}" y2="${f1(c + Math.sin(ang) * R)}"/>`; }).join('');
  const labels = axes.map((a, i) => {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2, x = c + Math.cos(ang) * R * 1.18, y = c + Math.sin(ang) * R * 1.22;
    const anchor = Math.abs(Math.cos(ang)) < 0.2 ? 'middle' : Math.cos(ang) > 0 ? 'start' : 'end';
    return `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" dominant-baseline="middle" class="g-radar-lbl">${esc(a.k)}${a.d ? `<tspan class="g-radar-d" x="${f1(x)}" dy="1.2em">${esc(a.d)}</tspan>` : ''}</text>`;
  }).join('');
  return `<svg class="g-radar" ${id ? `id="${id}"` : ''} viewBox="${-size * .14} 0 ${size * 1.28} ${size}" width="100%" style="max-width:${Math.round(size * 1.28)}px" role="img" aria-label="Radar: ${esc(axes.map(a => `${a.k} ${Math.round(a.v)}`).join(', '))}">
    <g class="g-grid">${[0.25, 0.5, 0.75, 1].map(f => `<polygon points="${ring(f)}"/>`).join('')}${spokes}</g>
    ${compare ? `<polygon class="g-radar-cmp" points="${radarPoints(compare, size)}"/>` : ''}
    <polygon class="g-radar-shape" points="${radarPoints(axes, size)}" style="--c:${color}" data-radar/>
    ${labels}
  </svg>`;
}

// Línea por partido. points: [{v, label, cls, title}] — cls colorea el punto (win/draw/loss).
export function line(points, { width = 900, height = 220, min = null, max = null, dec = 1, id = '' } = {}) {
  if (points.length < 2) return '';
  const pad = { t: 26, r: 18, b: 30, l: 34 };
  const vs = points.map(p => p.v);
  const lo = min ?? Math.floor(Math.min(...vs) - 0.5), hi = max ?? Math.ceil(Math.max(...vs) + 0.3);
  const W = width - pad.l - pad.r, H = height - pad.t - pad.b;
  const X = i => pad.l + (i / (points.length - 1)) * W, Y = v => pad.t + H * (1 - (v - lo) / (hi - lo || 1));
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${f1(X(i))},${f1(Y(p.v))}`).join(' ');
  const area = `${d} L${f1(X(points.length - 1))},${pad.t + H} L${pad.l},${pad.t + H} Z`;
  const grid = [lo, (lo + hi) / 2, hi].map(v => `<line x1="${pad.l}" x2="${width - pad.r}" y1="${f1(Y(v))}" y2="${f1(Y(v))}"/><text x="${pad.l - 8}" y="${f1(Y(v))}" text-anchor="end" dominant-baseline="middle">${f1(v)}</text>`).join('');
  const every = Math.ceil(points.length / Math.max(2, Math.floor(W / 56)));   // etiquetas sin pisarse
  const dots = points.map((p, i) => `<g class="g-dot ${p.cls || ''}" data-i="${i}" tabindex="-1"><title>${esc(p.title || '')}</title>
      <circle cx="${f1(X(i))}" cy="${f1(Y(p.v))}" r="4.5"/>${points.length <= 16 ? `<text x="${f1(X(i))}" y="${f1(Y(p.v) - 11)}" text-anchor="middle" class="g-dot-v">${p.v.toFixed(dec)}</text>` : ''}
      ${i % every === 0 || i === points.length - 1 ? `<text x="${f1(X(i))}" y="${height - 8}" text-anchor="middle" class="g-axis">${esc(p.label)}</text>` : ''}</g>`).join('');
  const gid = 'lg' + Math.random().toString(36).slice(2, 7);
  return `<svg class="g-line" ${id ? `id="${id}"` : ''} viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Evolución por partido">
    <defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--gold)" stop-opacity=".28"/><stop offset="1" stop-color="var(--gold)" stop-opacity="0"/></linearGradient></defs>
    <g class="g-grid">${grid}</g>
    <path d="${area}" fill="url(#${gid})" class="g-area" data-fade/>
    <path d="${d}" class="g-path" data-draw/>
    ${dots}
  </svg>`;
}

// Barra horizontal fina con etiqueta y valor (métricas de juego).
export function bar({ label, value, pct, color = 'var(--gold)', title = '' }) {
  return `<div class="g-bar" ${title ? `title="${esc(title)}"` : ''}>
    <span class="g-bar-lbl">${esc(label)}</span>
    <span class="g-bar-track"><span class="g-bar-fill" style="width:${Math.max(0, Math.min(100, pct || 0))}%;background:${color}" data-bar></span></span>
    <span class="g-bar-val" style="color:${color}">${value}</span>
  </div>`;
}

// Mini línea (sparkline) sin ejes para tarjetas y líderes.
export function spark(values, { width = 180, height = 40, color = 'var(--gold)' } = {}) {
  if (values.length < 2) return '';
  const lo = Math.min(...values), hi = Math.max(...values);
  const X = i => 3 + (i / (values.length - 1)) * (width - 6), Y = v => 4 + (height - 8) * (1 - (v - lo) / (hi - lo || 1));
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${f1(X(i))},${f1(Y(v))}`).join(' ');
  return `<svg class="g-spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" data-draw/>
    <circle cx="${f1(X(values.length - 1))}" cy="${f1(Y(values.at(-1)))}" r="3" fill="${color}"/></svg>`;
}
