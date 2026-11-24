// Plantel — FUENTE ÚNICA. roster.js lo reexporta para los módulos; convocatoria.html lo carga como script clásico.
// Deja globalThis.TSPlantel. Después de editar: node scripts/control-datos.mjs y subir ?v= donde se carga.
//   conv = datos de la convocatoria: n (orden en la lista), pos (nomenclatura de la cancha), campo (arquero con
//   render de jugador de campo). Sin conv, el jugador llega a la convocatoria desde Firestore plantel/activo.
(() => {
// RENDER_V: subir cuando se regeneren renders de jugadores o fotos editoriales — R2 los cachea un año en el navegador.
const RENDER_V = '2026-11-04';

const ROSTER_T3 = [
  {key:'Ivan_Cabj_La12', pos:'POR', posn:'Portero',         num:'12', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps'},
  {key:'rivarola90',     pos:'DEF', posn:'Defensa central', num:'2',  nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'ps'},
  {key:'Alexisraies23',  pos:'DEF', posn:'Defensa central', num:'3',  nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'pc'},
  {key:'Cabers14',       pos:'DEF', posn:'Defensa central', num:'5',  nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'xbox'},
  {key:'CAT_FEL',        pos:'DEF', posn:'Defensa central', num:'55', nvl:'—', arq:'—', build:'—', stats:[], total:0, nat:'cl', plataforma:'ps'},
  {key:'Huber236',       pos:'LAT', posn:'Lateral',         num:'8',  nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps'},
  {key:'Guiidow',        pos:'LAT', posn:'Lateral',         num:'20', nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'ps'},
  {key:'Juan_Martinez4', pos:'MED', posn:'Mediocampista',   num:'6',  nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'ps'},
  {key:'RS32-DaniStone', pos:'MED', posn:'Mediocampista',   num:'13', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps'},
  {key:'Ciprimancini32',   pos:'MED', posn:'Mediocampista',   num:'32', nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'pc'},
  {key:'Eli_No-SKILL',   pos:'MED', posn:'Mediocampista',   num:'10', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps'},
  {key:'Lil_Dekuroko',   pos:'MED', posn:'Mediocampista',   num:'22', nvl:'—', arq:'—', build:'—', stats:[], total:0, nat:'co', plataforma:'ps'},
  {key:'Full_boxxing_',  pos:'MED', posn:'Mediocampista',   num:'14', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps'},
  {key:'BlackPanther-CG',pos:'DEL', posn:'Extremo',         num:'11', nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, nat:'uy', plataforma:'ps'},
  {key:'Lautavester7',   pos:'DEL', posn:'Extremo',         num:'7',  nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'pc'},
  {key:'Juanchyroman08', pos:'DEL', posn:'Extremo',         num:'18', nvl:'—', arq:'—', build:'—', stats:[], total:0},
  {key:'kee_viin03',     pos:'DEL', posn:'Delantero',       num:'21', nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'ps'},
  {key:'lTemp30148',     pos:'DEL', posn:'Delantero',       num:'16', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps'},
];

// Plantel T4 (temporada actual) — el mismo de convocatoria.html. Renders
// Brazos4/Frente4/Pose4 con el Kit 1 de T4; los arqueros con el kit de arquero.
const ROSTER_T4 = [
  {key:'Ivan_Cabj_La12',   pos:'POR', posn:'Portero',         num:'12', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps', conv:{n:1, pos:'POR', campo:true}},
  {key:'adri_cai',         pos:'POR', posn:'Portero',         num:'32', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps', conv:{n:12, pos:'POR'}},
  {key:'rivarola90',       pos:'DEF', posn:'Defensa central', num:'2',  nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'ps', conv:{n:2, pos:'DFC'}},
  {key:'Alexisraies23',    pos:'DEF', posn:'Defensa central', num:'3',  nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'pc', conv:{n:3, pos:'DFC'}},
  {key:'Cabers14',         pos:'DEF', posn:'Defensa central', num:'5',  nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'xbox', conv:{n:4, pos:'DFC'}},
  {key:'Elianja20',        pos:'DEF', posn:'Defensa central', num:'24', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps'},
  {key:'endiabladorojo66', pos:'DEF', posn:'Defensa central', num:'66', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps', conv:{n:13, pos:'DFC'}},
  {key:'Huber236',         pos:'LAT', posn:'Lateral',         num:'8',  nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps', conv:{n:5, pos:'LD'}},
  {key:'Guiidow',          pos:'LAT', posn:'Lateral',         num:'20', nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'ps', conv:{n:6, pos:'LD'}},
  {key:'nikileo527',       pos:'LAT', posn:'Lateral',         num:'10', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps', conv:{n:14, pos:'EI'}},
  {key:'pepolemmo2710',    pos:'LAT', posn:'Lateral',         num:'15', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps', conv:{n:15, pos:'ED'}},
  {key:'Juan_Martinez4',   pos:'MED', posn:'Mediocampista',   num:'6',  nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'ps', conv:{n:7, pos:'MCD'}},
  {key:'RS32-DaniStone',   pos:'MED', posn:'Mediocampista',   num:'13', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps', conv:{n:8, pos:'MCI'}},
  {key:'Ciprimancini32',     pos:'MED', posn:'Mediocampista',   num:'14', nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'ps', conv:{n:9, pos:'MVD'}},
  {key:'Lil_Dekuroko',     pos:'MED', posn:'Mediocampista',   num:'22', nvl:'—', arq:'—', build:'—', stats:[], total:0, nat:'co', plataforma:'ps', conv:{n:10, pos:'LI'}},
  {key:'davidelapaternal', pos:'MED', posn:'Mediocampista',   num:'34', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'pc', conv:{n:17, pos:'MCI'}},
  {key:'Lautavester7',     pos:'DEL', posn:'Extremo',         num:'7',  nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'pc', conv:{n:11, pos:'DC'}},
  {key:'NicoBJ_96',        pos:'DEL', posn:'Delantero',       num:'9',  nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps', conv:{n:16, pos:'DC'}},
];

const paraConvocatoria = () => ROSTER_T4.filter(p => p.conv).sort((a, b) => a.conv.n - b.conv.n)
  .map(({ key, num, conv: { n, ...c } }) => ({ name: key, num: Number(num), folder: key, ...c }));

globalThis.TSPlantel = { ROSTER_T3, ROSTER_T4, RENDER_V, paraConvocatoria };
})();
