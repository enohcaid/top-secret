// Cambiar el rival de un amistoso ya cargado en calendario/estado.custom, en su mismo lugar de la lista
// (las claves c<N> de results/edits/suspended dependen de la posición). Solo toca amistosos: un partido de
// liga en ese horario no se reemplaza nunca. Con precondición updateTime, para no pisar guardados simultáneos.
const API = 'https://firestore.googleapis.com/v1/';

// valores = custom.arrayValue.values. Devuelve { nuevos, viejo } o null si a esa hora no hay un amistoso.
export function reemplazarEnLista(valores, fecha, hora, entrada) {
  const i = valores.findIndex(v => {
    const f = v.mapValue?.fields || {};
    return f.league?.stringValue === 'Amistoso' && f.date?.stringValue === fecha && f.time?.stringValue === hora;
  });
  if (i < 0) return null;
  const nuevos = [...valores];
  nuevos[i] = entrada;
  return { nuevos, viejo: valores[i].mapValue.fields.rival?.stringValue || '' };
}

// Devuelve { viejo } si lo cambió (o, con escribir:false, si lo cambiaría), { noHay:true } si a esa hora no hay
// amistoso, { igual:true } si ya es ese rival, { error } si no pudo.
export async function cambiarAmistoso(doc, fecha, hora, entrada, { escribir = true, intentos = 3 } = {}) {
  const url = API + doc;
  for (let n = 0; n < intentos; n++) {
    const r = await fetch(url);
    if (!r.ok) return { error: `lectura ${r.status}` };
    const d = await r.json();
    const cambio = reemplazarEnLista(d.fields?.custom?.arrayValue?.values || [], fecha, hora, entrada);
    if (!cambio) return { noHay: true };
    if (cambio.viejo === entrada.mapValue.fields.rival.stringValue) return { igual: true };
    if (!escribir) return { viejo: cambio.viejo };
    const w = await fetch(`${url}?updateMask.fieldPaths=custom&currentDocument.updateTime=${encodeURIComponent(d.updateTime)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { custom: { arrayValue: { values: cambio.nuevos } } } }),
    });
    if (w.ok) return { viejo: cambio.viejo };
    if (w.status !== 400 && w.status !== 409 && w.status !== 412) return { error: `escritura ${w.status}` };   // otro guardó en el medio: se reintenta
  }
  return { error: 'el calendario cambió mientras lo guardaba' };
}
