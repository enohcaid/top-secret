// Animaciones de estadisticas.html (GSAP 3 + ScrollTrigger + Flip, cargados desde cdnjs).
// Regla: la página se ve completa y quieta sin esto (sin JS, sin GSAP o con prefers-reduced-motion);
// acá solo se agrega movimiento encima de lo que ya está dibujado.
const g = () => window.gsap;
export const reduced = () => !g() || !window.ScrollTrigger || matchMedia('(prefers-reduced-motion: reduce)').matches;

const ctxs = new Map();   // un contexto de GSAP por bloque, para re-armar uno sin tocar los demás
const once = (trigger, start = 'top 88%') => ({ trigger, start, once: true });

function fmt(v, dec, pre, suf) { return pre + v.toFixed(dec).replace('.', ',') + suf; }

// (Re)arma todas las animaciones de `root`. Se llama después de cada render.
export function initMotion(root) {
  ctxs.get(root)?.revert(); ctxs.delete(root);
  if (reduced()) { root.querySelectorAll('[data-count]').forEach(el => setCount(el, +el.dataset.count)); return; }
  const gsap = g();
  gsap.registerPlugin(window.ScrollTrigger, ...(window.Flip ? [window.Flip] : []));
  const ctx = gsap.context(() => {
    gsap.utils.toArray(root.querySelectorAll('[data-reveal]')).forEach(el =>
      gsap.from(el, { y: 32, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: once(el) }));

    gsap.utils.toArray(root.querySelectorAll('[data-stagger]')).forEach(box =>
      gsap.from(box.children, { y: 22, opacity: 0, duration: .7, ease: 'power3.out', stagger: .045, scrollTrigger: once(box, 'top 90%') }));

    gsap.utils.toArray(root.querySelectorAll('[data-count]')).forEach(el => countUp(el, once(el, 'top 92%')));

    root.querySelectorAll('[data-arc]').forEach(el =>
      gsap.from(el, { attr: { 'stroke-dasharray': '0 100' }, duration: 1.6, ease: 'power3.out', scrollTrigger: once(el.ownerSVGElement, 'top 85%') }));

    root.querySelectorAll('[data-draw]').forEach(el => {
      const len = el.getTotalLength ? el.getTotalLength() : 0;
      if (!len) return;
      gsap.fromTo(el, { strokeDasharray: len, strokeDashoffset: len }, {
        strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', scrollTrigger: once(el.ownerSVGElement, 'top 85%'),
        onComplete: () => { el.style.strokeDasharray = 'none'; },
      });
    });
    root.querySelectorAll('[data-fade]').forEach(el =>
      gsap.from(el, { opacity: 0, duration: 1.4, delay: .6, ease: 'power1.out', scrollTrigger: once(el.ownerSVGElement, 'top 85%') }));
    root.querySelectorAll('.g-line').forEach(svg =>
      gsap.from(svg.querySelectorAll('.g-dot circle'), { scale: 0, transformOrigin: '50% 50%', duration: .5, ease: 'back.out(2)', stagger: .03, delay: .5, scrollTrigger: once(svg, 'top 85%') }));

    root.querySelectorAll('[data-radar]').forEach(el =>
      gsap.from(el, { scale: .05, transformOrigin: '50% 50%', opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: once(el.ownerSVGElement, 'top 85%') }));

    root.querySelectorAll('[data-bar]').forEach(el =>
      gsap.from(el, { scaleX: 0, transformOrigin: '0 50%', duration: 1.2, ease: 'power3.out', scrollTrigger: once(el, 'top 94%') }));

    root.querySelectorAll('[data-parallax]').forEach(el =>
      gsap.to(el, { yPercent: 14, scale: 1.06, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top top', end: 'bottom top', scrub: true } }));

  }, root);
  ctxs.set(root, ctx);
}

export function setCount(el, v) {
  el.textContent = fmt(v, +(el.dataset.dec || 0), el.dataset.prefix || '', el.dataset.suffix || '');
}
function countUp(el, scrollTrigger) {
  const end = +el.dataset.count, o = { v: 0 };
  setCount(el, 0);
  return g().to(o, { v: end, duration: 1.5, ease: 'power2.out', scrollTrigger, onUpdate: () => setCount(el, o.v), onComplete: () => setCount(el, end) });
}

// Reordenar/filtrar el plantel con Flip: `mutate` cambia el orden del DOM o la clase is-hidden.
export function flip(container, mutate) {
  if (reduced() || !window.Flip) { mutate(); return; }
  const items = container.querySelectorAll('.pl-item');
  const state = window.Flip.getState(items);
  mutate();
  window.Flip.from(state, {
    duration: .65, ease: 'power3.inOut', stagger: .012, absolute: true, nested: true,
    onEnter: els => g().fromTo(els, { opacity: 0, scale: .85 }, { opacity: 1, scale: 1, duration: .5 }),
    onLeave: els => g().to(els, { opacity: 0, scale: .85, duration: .35 }),
  });
}

// Paneles (detalle de partido, perfil): entrada y salida.
export function panelIn(el, from = 'right') {
  if (reduced()) return;
  const gsap = g();
  const box = el.querySelector('.panel-box');
  gsap.fromTo(el, { backgroundColor: 'rgba(0,0,0,0)' }, { backgroundColor: 'rgba(0,0,0,.62)', duration: .35 });
  if (from === 'right') gsap.fromTo(box, { xPercent: 100 }, { xPercent: 0, duration: .55, ease: 'expo.out' });
  else gsap.fromTo(box, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .7, ease: 'expo.inOut' });
  gsap.from(box.querySelectorAll('[data-in]'), { y: 26, opacity: 0, duration: .6, ease: 'power3.out', stagger: .05, delay: .2 });
  box.querySelectorAll('[data-count]').forEach(c => countUp(c));
  box.querySelectorAll('[data-draw]').forEach(p => { const len = p.getTotalLength(); gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.2, delay: .35, ease: 'power2.inOut' }); });
  box.querySelectorAll('[data-radar]').forEach(p => gsap.from(p, { scale: .05, transformOrigin: '50% 50%', duration: 1, delay: .3, ease: 'expo.out' }));
  box.querySelectorAll('[data-bar]').forEach(b => gsap.from(b, { scaleX: 0, transformOrigin: '0 50%', duration: .9, delay: .3, ease: 'power3.out' }));
}
export function panelOut(el, done) {
  if (reduced()) { done(); return; }
  const gsap = g();
  gsap.to(el.querySelector('.panel-box'), { opacity: 0, y: 24, duration: .25, ease: 'power2.in' });
  gsap.to(el, { backgroundColor: 'rgba(0,0,0,0)', duration: .3, onComplete: () => { gsap.set(el.querySelector('.panel-box'), { clearProps: 'all' }); done(); } });
}

// Radar que cambia de forma (tramos / ligas del equipo).
export function morphRadar(poly, points) {
  if (reduced()) { poly.setAttribute('points', points); return; }
  g().to(poly, { attr: { points }, duration: .9, ease: 'elastic.out(1, .75)' });
}

// Barras del comparador: animan al nuevo ancho.
export function tweenWidths(els) {
  els.forEach(el => {
    const w = el.dataset.w + '%';
    if (reduced()) { el.style.width = w; return; }
    g().to(el, { width: w, duration: .8, ease: 'power3.out' });
  });
}

export function refresh() { window.ScrollTrigger?.refresh(); }
