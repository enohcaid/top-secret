#!/usr/bin/env node
// Corre el bot de amistosos y lo vuelve a levantar si se cae (WhatsApp desconectado, arranque colgado,
// error) antes de las 23:40 ART. Espera 2 min entre intentos y prueba 5 veces como mucho: reiniciar en
// ráfaga mientras WhatsApp conecta puede romper la sesión guardada. Salida 0 del bot = terminó bien
// (horarios cubiertos o 23:45): no se relanza.
//   node scripts/amistosos-vigilado.mjs [--auto] [...]   (los argumentos pasan tal cual al bot)
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const TZ = 'America/Argentina/Buenos_Aires';
const hora = () => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
const MAX = 5, ESPERA_MS = +process.env.AMISTOSOS_ESPERA_MS || 120000;   // la variable es solo para probar el vigilante

for (let intento = 0; ; intento++) {
  const codigo = await new Promise(res => {
    const p = spawn(process.execPath, [path.join(DIR, 'amistosos.mjs'), ...process.argv.slice(2)], {
      stdio: 'inherit', env: { ...process.env, AMISTOSOS_REINICIO: String(intento) },
    });
    p.on('exit', c => res(c ?? 1));
  });
  if (codigo === 0) break;
  if (hora() >= '23:40') { console.log(hora(), 'vigilante: el bot se cortó cerca del cierre, no lo relanzo'); break; }
  if (intento + 1 >= MAX) { console.log(hora(), `vigilante: el bot se cayó ${MAX} veces, me rindo por hoy`); break; }
  console.log(hora(), `vigilante: el bot salió con código ${codigo}, lo relanzo en 2 min (intento ${intento + 2} de ${MAX})`);
  await new Promise(r => setTimeout(r, ESPERA_MS));
}
