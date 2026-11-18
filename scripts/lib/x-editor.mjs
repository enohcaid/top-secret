// Editor de X (portada x.com/home), compartido por todo lo que publica en X por el Chrome CDP.
// 2026-11-18: X rediseñó la portada y sacó TODOS los data-testid (la noticia del día no salió: el script esperaba
// [data-testid="tweetTextarea_0"] y no aparecía nunca). Ahora el editor es un <textarea aria-multiline> ("¿Qué está
// pasando?") y el botón "Post" no tiene identificador. Se prueban los dos (lo nuevo y lo viejo, por si X vuelve atrás).

export const CAJA_X = '[data-testid="tweetTextarea_0"], textarea[aria-multiline="true"], textarea[aria-label="¿Qué está pasando?"], textarea[aria-label="What is happening?!"]';
export const ARCHIVO_X = 'input[data-testid="fileInput"], input[type="file"]';

// Corre en la página: el botón de publicar del editor de la portada. Lo viejo por testid; lo nuevo = el botón con
// texto "Post"/"Postear"/"Publicar" más cercano a la caja de texto (subiendo desde el textarea), no el de la barra lateral.
export function botonPostX() {
  const viejo = document.querySelector('[data-testid="tweetButtonInline"]');
  if (viejo) return viejo;
  const caja = document.querySelector('textarea[aria-multiline="true"], textarea[aria-label]');
  const esPost = b => /^(Post|Postear|Publicar)$/i.test((b.innerText || '').trim());
  for (let el = caja; el; el = el.parentElement) {
    const b = [...el.querySelectorAll('button')].find(esPost);
    if (b) return b;
  }
  return null;
}

// ¿El botón ya se puede tocar? / tocarlo. page.evaluate no lleva las funciones del módulo a la página: va el código
// como expresión de texto (por CDP, sin eval, que la política de seguridad de X podría bloquear).
// conVideo: además, que el video adjunto ya esté en el editor (antes [data-testid="attachments"] video). Se busca solo
// dentro del editor (el ancestro común del textarea y su botón), no en el feed de la portada, que también tiene videos.
const BUSCAR = `(${botonPostX.toString()})()`;
export const botonListoX = (page, { conVideo = false } = {}) => page.evaluate(`(() => {
  const bt = ${BUSCAR};
  if (!bt || bt.disabled || bt.getAttribute('aria-disabled') === 'true') return false;
  if (!${conVideo}) return true;
  if (document.querySelector('[data-testid="attachments"] video')) return true;
  let ed = bt; while (ed && !ed.querySelector('textarea')) ed = ed.parentElement;
  return !!ed?.querySelector('video');
})()`);
export const tocarPostX = async page => { if (!(await page.evaluate(`(() => { const bt = ${BUSCAR}; if (!bt) return false; bt.click(); return true; })()`))) throw new Error('No encontré el botón Post de X'); };
