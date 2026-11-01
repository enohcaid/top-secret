// El álbum Thrive como un todo (Juan, 2026-11-01): "no es necesario que cada tema tenga un concepto, puede ser un concepto
// del álbum y que cada tema lo aborde desde un lugar diferente". Y el problema principal de los temas de oct-31: todos
// sonaban igual — mismo rapero, la chica SIEMPRE, BPM bajos, historias demasiado específicas.
// Acá vive lo que el código controla entre temas ("controlar con código lo reciente", regla del 2026-10-27): qué ángulo
// del álbum, qué casting de voces y qué energía/tempo ya se usaron; a Gemma solo se le ofrecen opciones no gastadas.
// Plan completo: docs/conocimiento/plan-album-thrive.md

export const ALBUM = `"Thrive" is about growing in the places that were supposed to break you. Not winning clean: staying hungry, getting up again, paying the price, and still finding something worth living for. Every song looks at that from a different place and a different mood — some hit hard and celebrate, some are 4 a.m. thoughts, some are angry, some are tender. The listener must recognise their own life in it: plain, universal situations (a phone that does not ring, a debt, a promise to your mother, the friend who stayed), never an exotic plot.`;

// Ángulos: cada tema toma uno que no se usó. `energia` define tempo y tipo de beat (variedad entre temas).
export const ANGULOS = {
  hambre:        { idea: 'the hunger before anyone believed in you: nothing in the fridge, everything in your head', energia: 'empuje' },
  insomnio:      { idea: 'the 4 a.m. mind that will not stop: overthinking, replaying every mistake', energia: 'nocturna' },
  los_mios:      { idea: 'loyalty: the few who stayed when you had nothing, and what you owe them', energia: 'rebote' },
  primera:       { idea: 'the first real win: the night it finally worked, celebrating like it could end tomorrow', energia: 'fiesta' },
  bronca:        { idea: 'anger: being underestimated one time too many, and using it as fuel', energia: 'furia' },
  precio:        { idea: 'the price of making it: the people and the time you lost on the way up', energia: 'melancolia' },
  paranoia:      { idea: 'success made you suspicious: everyone wants something now', energia: 'nocturna' },
  version_vieja: { idea: 'talking to the person you used to be, and not missing them', energia: 'melancolia' },
  presion:       { idea: 'everyone expects something from you: your family, your block, yourself', energia: 'empuje' },
  los_que_hablan:{ idea: 'the ones who talk behind your back while you keep working', energia: 'rebote' },
  perder_algo:   { idea: 'losing something you loved (a place, a time, a dream) and keeping it alive anyway', energia: 'melancolia' },
  calma:         { idea: 'the quiet after the storm: gratitude, breathing, still standing', energia: 'flotante' },
  todo_o_nada:   { idea: 'betting everything on one shot, no plan B', energia: 'furia' },
  volver:        { idea: 'coming back to where you started, different, and seeing it with new eyes', energia: 'flotante' },
};

// Energía → tempo (BPM del grid; el intérprete toca el clap en el 3, así que se siente a la mitad: 140 ≈ 70 "de pie")
// y carácter del beat. Nunca debajo de 128 (Juan, 2026-11-01: "bajos bpm en general").
export const ENERGIAS = {
  empuje:     { bpm: [142, 154], beat: 'driving and tense, busy hats, hard 808', kits: ['pesado', 'crudo'] },
  nocturna:   { bpm: [130, 140], beat: 'dark and spacious, slow-burning, sliding 808', kits: ['nocturno', 'hipnotico', 'frio'] },
  rebote:     { bpm: [145, 156], beat: 'bouncy, playful, swung hats, 808 that jumps', kits: ['crudo', 'hipnotico', 'frio'] },
  fiesta:     { bpm: [148, 160], beat: 'triumphant, brassy and bright, loud and confident', kits: ['pesado', 'crudo'] },
  furia:      { bpm: [155, 168], beat: 'aggressive rage energy, distorted 808, relentless hats', kits: ['crudo', 'pesado'] },
  melancolia: { bpm: [128, 138], beat: 'melodic and sad, piano or guitar-like, emotional', kits: ['nocturno', 'frio', 'hipnotico'] },
  flotante:   { bpm: [134, 146], beat: 'airy, dreamy synths, floating, light drums', kits: ['frio', 'hipnotico', 'nocturno'] },
};

// Casting de voces (Juan, 2026-11-01: "misma voz de rap, misma voz de la chica que SIEMPRE está"). Cada tema elige uno
// que no se usó en los 3 anteriores; con voz femenina como mucho un tema de cada tres. `tags` = cómo se marcan las
// secciones de la letra (ACE-Step las lee). `ella`: canta una mujer.
export const CASTING = {
  melodico_autotune: { voz: 'solista melódico con autotune, arrastrado y emocional', ella: false,
    caption: 'solo male trap singer, heavy auto-tune, slurred melodic flow, emotional and hazy, layered ad-libs, no female vocals',
    tags: 'one male voice only: [verse - male melodic rap], [chorus - male sung], [bridge - male sung]' },
  rapero_veloz: { voz: 'rapero solo, flow rápido y entrecortado, áspero', ella: false,
    caption: 'solo male rapper, fast staccato triplet flow, raspy hungry voice, punchy ad-libs, no female vocals',
    tags: 'one male rapper only: [verse - male rap fast flow], [chorus - male chant], [bridge - male rap]' },
  agudo_jugueton: { voz: 'voz aguda y juguetona, cantos repetitivos tipo arenga', ella: false,
    caption: 'solo male vocalist, high-pitched playful voice, bouncy chant hooks, repetitive catchy phrases, energetic ad-libs, no female vocals',
    tags: 'one male voice only: [verse - male playful rap], [chorus - male chant], [bridge - male]' },
  grave_amenazante: { voz: 'barítono grave, lento y amenazante', ella: false,
    caption: 'solo male rapper, deep baritone voice, slow menacing delivery, confident, dark ad-libs, no female vocals',
    tags: 'one male rapper only: [verse - male deep rap], [chorus - male deep chant], [bridge - male spoken]' },
  dos_raperos: { voz: 'dos raperos que se pasan los versos, voces contrastadas', ella: false,
    caption: 'two male rappers trading verses, one deep and calm, one high and energetic, contrasting flows, group chant chorus, no female vocals',
    tags: 'two male rappers: [verse - male rap deep voice], [verse - male rap high voice], [chorus - male group chant], [bridge - male rap]' },
  rapera: { voz: 'rapera solista, segura y filosa', ella: true,
    caption: 'solo female rapper, confident sharp flow, punchy delivery, attitude, ad-libs, no male vocals',
    tags: 'one female rapper only: [verse - female rap], [chorus - female chant], [bridge - female rap]' },
  cantante_trap: { voz: 'cantante de trap melódico, aireada con autotune', ella: true,
    caption: 'solo female trap singer, breathy auto-tuned vocals, melodic flow, emotional, airy harmonies, no male vocals',
    tags: 'one female singer only: [verse - female melodic rap], [chorus - female sung], [bridge - female sung]' },
  rapero_y_hook: { voz: 'rapero en los versos, ella solo en el estribillo', ella: true,
    caption: 'male rapper on the verses with a gritty flow, a female voice sings only the chorus hook, short and catchy',
    tags: 'male rapper on every verse and the bridge, female ONLY in the chorus: [verse - male rap], [chorus - female sung], [bridge - male rap]' },
};

// Lo que todavía se puede usar, según los temas anteriores (los dos carriles cuentan: el oyente no distingue motores)
export function opciones(temas) {
  const recientes = temas.slice(-3);
  const usadosAng = new Set(temas.map(t => t.angulo).filter(Boolean));
  const angulos = Object.keys(ANGULOS).filter(a => !usadosAng.has(a));
  const ultimaEnergia = temas.at(-1)?.energia;
  const angulosOk = angulos.filter(a => ANGULOS[a].energia !== ultimaEnergia);
  // los temas anteriores a este plan son todos duetos con ella: cuentan como casting "rapero_y_hook" con voz femenina
  const castingDe = t => t.casting || 'rapero_y_hook';
  const conElla = recientes.slice(-2).some(t => CASTING[castingDe(t)]?.ella);
  const casting = Object.keys(CASTING).filter(c => !recientes.map(castingDe).includes(c) && !(conElla && CASTING[c].ella));
  return { angulos: angulosOk.length ? angulosOk : angulos, casting };
}
