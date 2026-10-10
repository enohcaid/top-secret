// El Chrome con CDP (puerto 9222, perfil scripts/.chrome-profile) maneja ChatGPT, Canva, X, TikTok y YouTube.
// Si está cerrado (pasó el 2026-10-10: la ventana se había cerrado sola), se abre con scripts/abrir-chrome-chatgpt.ps1.
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT } from '../../lib/env.mjs';

const responde = async () => { try { return (await fetch('http://localhost:9222/json/version')).ok; } catch { return false; } };

export async function asegurarChrome() {
  if (await responde()) return;
  spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'scripts/abrir-chrome-chatgpt.ps1')], { stdio: 'ignore' });
  for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 1000)); if (await responde()) { await new Promise(r => setTimeout(r, 8000)); return; } }
  throw new Error('No pude abrir el Chrome con CDP (scripts/abrir-chrome-chatgpt.ps1).');
}
