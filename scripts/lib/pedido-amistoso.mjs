// Leer un pedido de amistoso del grupo: quién pide (el encabezado) y qué horarios tiene libres.
//   "Amistosos vs Deportivo Murra\n22:40 vs instituto senior\n23:40 vs"  → equipo "Deportivo Murra", libre solo 23:40
//   "Amistoso vs\n▫️ InfinitX ▫️\n22:40 ❌\n23;00❌"                     → equipo "InfinitX", ningún horario libre
// Una línea de horario está OCUPADA si tiene ❌/✖/🚫, "x", "ocupado"/"confirmado", o un rival escrito
// ("22:40 vs instituto senior", "23:00 Real Marcianos"). Libre: la hora sola, "vs", 🆚, ✅, "libre".

const HORA = /^[\s*•·▫️◽◾▪️-]*(\d{1,2})\s*[:.;]\s*(\d{2})(?!\d)\s*(?:hs?\b\.?)?(.*)$/iu;
const OCUPADA = /❌|✖|🚫|⛔|\bocupad|\bconfirmad|\bcerrad|^\s*x\s*$/iu;

export function leerPedido(texto) {
  const horas = [], cabecera = [];
  for (let linea of String(texto || '').split('\n')) {
    // "2240" / "2320" sin separador = 22:40 / 23:20
    linea = linea.replace(/^([\s*•·▫️◽◾▪️-]*)(2[0-3])([0-5]\d)(?!\d)/u, '$1$2:$3');
    // La hora sola en una línea ("23", "22hs", "23 ❌") es en punto; lo que sigue sin letras ni números son marcas.
    const sola = linea.match(/^[\s*•·-]*(2[0-3])\s*(?:hs?\.?)?(?![\d:.;])([^\p{L}\p{N}]*)$/iu);
    const m = sola ? [linea, sola[1], '00', sola[2]] : linea.match(HORA);
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
    // divisiones entre paréntesis o sueltas: "(1ra/2da)", "(2da/3ra/4ta)", "3°"
    .replace(/\(?\s*\d\s*(?:ra|da|ta|ro|do|to|°|º)(?:\s*[\/-]\s*\d\s*(?:ra|da|ta|ro|do|to|°|º))*\s*\)?/gi, ' ')
    .replace(/\bamistos[oa]s?\b|\bbusca(n|mos)?\b|\bvs\.?\b|🆚|\bhoy\b|\bpara\b|\bquien\b|\balguien\b|\bjugar\b/gi, ' ')
    .replace(/[^\p{L}\p{N}\s/-]/gu, ' ').replace(/\s+/g, ' ').trim();
  return { equipoTxt, horas };
}
