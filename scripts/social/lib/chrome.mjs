// El Chrome con CDP (puerto 9222, perfil scripts/.chrome-profile) maneja ChatGPT, Canva, X, TikTok y YouTube.
// Si está cerrado (pasó el 2026-10-10: la ventana se había cerrado sola), se abre con scripts/abrir-chrome-chatgpt.ps1.
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT } from '../../lib/env.mjs';

const responde = async () => { try { return (await fetch('http://localhost:9222/json/version')).ok; } catch { return false; } };

// Una pestaña que no contesta hace que chromium.connectOverCDP() venza a los 30 s (espera a todas): el 2026-11-18 había
// tres de ChatGPT trabadas y nada que publicara en X/TikTok/YouTube podía conectarse. Se prueban por CDP y se cierran
// las que no responden en 8 s (lo mismo que closeHungTabs() de generate-image-chatgpt.mjs).
async function cerrarPestanasColgadas() {
  let tabs;
  try { tabs = await (await fetch('http://localhost:9222/json/list')).json(); } catch { return; }
  for (const t of tabs.filter(t => t.type === 'page' && t.webSocketDebuggerUrl)) {
    const ok = await new Promise(res => {
      let ws;
      const to = setTimeout(() => { try { ws.close(); } catch {} res(false); }, 8000);
      try { ws = new WebSocket(t.webSocketDebuggerUrl); } catch { clearTimeout(to); return res(true); }
      ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: '1' } }));
      ws.onmessage = () => { clearTimeout(to); ws.close(); res(true); };
      ws.onerror = () => { clearTimeout(to); res(true); };
    });
    if (!ok) { console.log(`Pestaña colgada, se cierra: ${t.title || t.url}`); try { await fetch(`http://localhost:9222/json/close/${t.id}`); } catch {} }
  }
}

export async function asegurarChrome() {
  if (await responde()) return cerrarPestanasColgadas();
  spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'scripts/abrir-chrome-chatgpt.ps1')], { stdio: 'ignore' });
  for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 1000)); if (await responde()) { await new Promise(r => setTimeout(r, 8000)); return; } }
  throw new Error('No pude abrir el Chrome con CDP (scripts/abrir-chrome-chatgpt.ps1).');
}
