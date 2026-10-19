// Fixture de Top Secret en Espacio Gamer (ex 11x11) → Firestore calendario/estado.custom.
// Lo lee en vivo de espaciogamer.cl (mismo admin-ajax que /eg-table en el Worker, metrica=fixture)
// y agrega los partidos que falten con league:'11x11' (clave interna) e instancia 'Fecha N'.
// Los que ya están (misma fecha+hora+rival) no se tocan; los existentes del array se reescriben
// tal cual vienen (sin decodificar), así no se pisa nada.
//   node scripts/fixture-espacio-gamer.mjs          → muestra qué agregaría
//   node scripts/fixture-espacio-gamer.mjs --aplicar
// Si EG cambia una fecha/hora: corregir esa entrada desde el admin de calendario.html
// (este script no borra ni mueve partidos ya cargados).
const APLICAR = process.argv.includes('--aplicar');
const EG = 'https://espaciogamer.cl';
const DIV = EG + '/division/challengers-2-espacio-gamer-argentina/fixture/';
const UA = { 'User-Agent': 'Mozilla/5.0 (TopSecretFC site)' };
const DOC = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/calendario/estado';
const MES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const dec = x => x.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').trim();
const esTS = n => /top secret/i.test(n);

const page = await (await fetch(DIV, { headers: UA })).text();
const nonce = (page.match(/egRankingsData\s*=\s*\{[^}]*"nonce":"([a-f0-9]+)"/) || [])[1];
const divId = (page.match(/data-division-id="(\d+)"/) || [])[1];
const tempId = (page.match(/data-temporada-id="(\d+)"/) || [])[1];
if (!nonce || !divId || !tempId) throw new Error('No encontré nonce/división/temporada en la página de EG');
const aj = await (await fetch(EG + '/wp-admin/admin-ajax.php', {
  method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ action: 'eg_obtener_ranking', nonce, metrica: 'fixture', division_id: divId, temporada_id: tempId, limite: '500', club_destacado: '0' }),
})).json();
if (!aj?.success || !aj.data?.html) throw new Error('Respuesta de EG inesperada');

const partidos = [];
for (const jb of aj.data.html.split('<div class="eg-fx-jornada" data-fx-j="').slice(1)) {
  const j = +jb.match(/^(\d+)/)[1]; let fecha = null;
  const re = /<div class="eg-fx-fecha">([^<]+)<\/div>|<a class="eg-fx-partido"[^>]*>([\s\S]*?)<\/a>/g; let m;
  while ((m = re.exec(jb))) {
    if (m[1]) {
      const d = m[1].match(/(\d+) de (\w+)/i); const mo = MES[d[2].toLowerCase()];
      // La temporada arranca en octubre: enero–junio ya es el año siguiente.
      const y = new Date().getFullYear() + (mo < 7 && new Date().getMonth() >= 6 ? 1 : 0);
      fecha = `${y}-${String(mo).padStart(2, '0')}-${d[1].padStart(2, '0')}`; continue;
    }
    const [local, visita] = [...m[2].matchAll(/eg-fx-nom">([^<]+)/g)].map(x => dec(x[1]));
    if (!esTS(local) && !esTS(visita)) continue;
    // Hora de EG (Chile) = ART mientras los dos estén en UTC-3 (de septiembre a abril).
    const time = (m[2].match(/eg-fx-hora">\s*(\d{1,2}:\d{2})/) || [])[1];
    partidos.push({ tipo: 'partido', date: fecha, time, rival: esTS(local) ? visita : local, league: '11x11', instancia: `Fecha ${j}`, isHome: esTS(local) });
  }
}
console.log(`EG: ${partidos.length} partidos de Top Secret`);

const doc = await (await fetch(DOC)).json();
const valores = doc.fields?.custom?.arrayValue?.values || [];
const plano = v => Object.fromEntries(Object.entries(v.mapValue?.fields || {}).map(([k, x]) => [k, x.stringValue ?? x.booleanValue ?? x.integerValue ?? null]));
const ya = new Set(valores.map(plano).map(e => `${e.date}|${e.time}|${e.rival}`));
const nuevos = partidos.filter(p => !ya.has(`${p.date}|${p.time}|${p.rival}`));
for (const p of nuevos) console.log(`  + ${p.date} ${p.time} ${p.isHome ? 'L' : 'V'} ${p.rival} (${p.instancia})`);
if (!nuevos.length) { console.log('Nada para agregar.'); process.exit(0); }
if (!APLICAR) { console.log('\n(prueba) Para cargarlos: --aplicar'); process.exit(0); }

const tipado = e => ({ mapValue: { fields: Object.fromEntries(Object.entries(e).map(([k, v]) => [k, typeof v === 'boolean' ? { booleanValue: v } : { stringValue: v }])) } });
const res = await fetch(DOC + '?updateMask.fieldPaths=custom', {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { custom: { arrayValue: { values: [...valores, ...nuevos.map(tipado)] } } } }),
});
if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`);
const despues = (await (await fetch(DOC)).json()).fields.custom.arrayValue.values.length;
console.log(`Listo: custom pasó de ${valores.length} a ${despues} entradas.`);
