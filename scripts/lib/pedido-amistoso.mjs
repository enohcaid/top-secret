// Leer un pedido de amistoso del grupo: quién pide (el encabezado) y qué horarios tiene libres.
//   "Amistosos vs Deportivo Murra\n22:40 vs instituto senior\n23:40 vs"  → equipo "Deportivo Murra", libre solo 23:40
//   "Amistoso vs\n▫️ InfinitX ▫️\n22:40 ❌\n23;00❌"                     → equipo "InfinitX", ningún horario libre
// Una línea de horario está OCUPADA si tiene ❌/✖/🚫, "x", "ocupado"/"confirmado", o un rival escrito
// ("22:40 vs instituto senior", "23:00 Real Marcianos"). Libre: la hora sola, "vs", 🆚, ✅, "libre".

const HORA = /^[\s*•·▫️◽◾▪️-]*(\d{1,2})\s*[:.;]\s*(\d{2})(?!\d)\s*(?:hs?\b\.?)?(.*)$/iu;
const OCUPADA = /❌|✖|🚫|⛔|\bocupad|\bconfirmad|\bcerrad|^\s*x\s*$/iu;

export function leerPedido(texto) {
  const horas = [], cabecera = [];
  for (const linea of String(texto || '').split('\n')) {
    // La hora sola en una línea ("23", "22hs") es en punto.
    const sola = linea.match(/^[\s*•·-]*(2[0-3])\s*(?:hs?\.?)?\s*$/i);
    const m = sola ? [linea, sola[1], '00', ''] : linea.match(HORA);
    if (m && +m[1] <= 23) {
      const hora = `${m[1].padStart(2, '0')}:${m[2]}`;
      const resto = m[3] || '';
      // Lo que queda sacando conectores y adornos: si hay letras o números, es un rival ya agendado.
      const rival = resto.replace(/\b(vs\.?|versus|contra|libre|disponible)\b/gi, '').replace(/[^\p{L}\p{N}]/gu, '');
      horas.push({ hora, libre: !OCUPADA.test(resto) && !rival });
    } else if (linea.trim()) cabecera.push(linea);
  }
  const equipoTxt = cabecera
    .filter(l => !/privad|escrib|\bmd\b|\bdm\b|contact/i.test(l))
    .join(' ')
    .replace(/\b\d{1,2}(?:\s*hs?\b|[:.;]\d{2})/gi, ' ')                 // horas sueltas en el encabezado ("buscamos 22hs")
    .replace(/\bamistos[oa]s?\b|\bbusca(n|mos)?\b|\bvs\.?\b|🆚|\(?\s*1ra\s*\/\s*2da\s*\)?|\bhoy\b|\bpara\b|\bquien\b|\balguien\b|\bjugar\b/gi, ' ')
    .replace(/[^\p{L}\p{N}\s/-]/gu, ' ').replace(/\s+/g, ' ').trim();
  return { equipoTxt, horas };
}
