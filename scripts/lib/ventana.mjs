// Chrome con CDP minimizado = pestañas con viewport 0x0: Playwright nunca ve "visible" un elemento y el
// click se queda esperando hasta el timeout (pasó con ChatGPT el 2026-10-07 y con X el 2026-10-08).
// Restaurar la ventana y traer la pestaña al frente antes de interactuar.
export async function asegurarVentana(page) {
  try {
    const cdp = await page.context().newCDPSession(page);
    const { windowId, bounds } = await cdp.send('Browser.getWindowForTarget');
    if (bounds.windowState === 'minimized' || bounds.windowState === 'fullscreen') {
      await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
    }
    if (bounds.windowState !== 'maximized' && ((bounds.width || 0) < 1000 || (bounds.height || 0) < 700)) {
      await cdp.send('Browser.setWindowBounds', { windowId, bounds: { width: 1280, height: 900 } }).catch(() => {});
    }
    await cdp.detach().catch(() => {});
  } catch (e) {
    console.log(`  (No se pudo ajustar la ventana de Chrome: ${e.message})`);
  }
  await page.bringToFront().catch(() => {});
  await page.waitForTimeout(1500);
  const [w, h] = await page.evaluate(() => [innerWidth, innerHeight]);
  if (!w || !h) throw new Error(`La pestaña tiene tamaño ${w}x${h} (ventana de Chrome minimizada u oculta)`);
}

// Click en un campo de texto; si Playwright no puede (capa encima, no "visible"), lo enfoca por código.
export async function enfocar(page, selector) {
  const loc = page.locator(selector).first();
  try { await loc.click({ timeout: 10000 }); }
  catch {
    const ok = await page.evaluate(sel => { const el = document.querySelector(sel); if (!el) return false; el.focus(); el.click(); return document.activeElement === el || el.contains(document.activeElement); }, selector);
    if (!ok) throw new Error(`No pude enfocar ${selector}`);
  }
}
