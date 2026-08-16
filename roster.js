// Plantel T3 (temporada actual) — fuente única.
// Antes estaba duplicado a mano en plantilla.html (ROSTER_T3) y en
// estadisticas.html (ROSTER, solo {name,pos}) — quedaban desincronizados
// cada vez que entraba o salía un jugador (ver memoria del proyecto:
// "rosters hardcodeados desactualizados"). Ahora ambas páginas importan
// este archivo; plantilla.html usa el objeto completo, estadisticas.html
// se queda solo con {name, pos}.
const ROSTER_T3 = [
  {key:'Ivan_Cabj_La12', pos:'POR', posn:'Portero',         num:'12', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps'},
  {key:'rivarola90',     pos:'DEF', posn:'Defensa central', num:'2',  nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'ps'},
  {key:'Alexisraies23',  pos:'DEF', posn:'Defensa central', num:'3',  nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'pc'},
  {key:'Cabers14',       pos:'DEF', posn:'Defensa central', num:'5',  nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'xbox'},
  {key:'CAT_FEL',        pos:'DEF', posn:'Defensa central', num:'55', nvl:'—', arq:'—', build:'—', stats:[], total:0, nat:'cl', plataforma:'ps'},
  {key:'Huber236',       pos:'LAT', posn:'Lateral',         num:'8',  nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps'},
  {key:'Guiidow',        pos:'LAT', posn:'Lateral',         num:'20', nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'ps'},
  {key:'Ramiro4588',     pos:'LAT', posn:'Lateral',         num:'96', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps'},
  {key:'Juan_Martinez4', pos:'MED', posn:'Mediocampista',   num:'6',  nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'ps'},
  {key:'RS32-DaniStone', pos:'MED', posn:'Mediocampista',   num:'13', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps'},
  {key:'CipriMancini',   pos:'MED', posn:'Mediocampista',   num:'32', nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'pc'},
  {key:'Eli_No-SKILL',   pos:'MED', posn:'Mediocampista',   num:'10', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps'},
  {key:'Lil_Dekuroko',   pos:'MED', posn:'Mediocampista',   num:'22', nvl:'—', arq:'—', build:'—', stats:[], total:0, nat:'co', plataforma:'ps'},
  {key:'Full_boxxing_',  pos:'MED', posn:'Mediocampista',   num:'14', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps'},
  {key:'BlackPanther-CG',pos:'DEL', posn:'Extremo',         num:'11', nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, nat:'uy', plataforma:'ps'},
  {key:'Lautavester7',   pos:'DEL', posn:'Extremo',         num:'7',  nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'pc'},
  {key:'Juanchyroman08', pos:'DEL', posn:'Extremo',         num:'18', nvl:'—', arq:'—', build:'—', stats:[], total:0},
  {key:'fedeavv9',       pos:'DEL', posn:'Delantero',       num:'9',  nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'pc'},
  {key:'kee_viin03',     pos:'DEL', posn:'Delantero',       num:'21', nvl:'—', arq:'—', build:'—', stats:[], total:0, photo:true, plataforma:'ps'},
  {key:'lTemp30148',     pos:'DEL', posn:'Delantero',       num:'16', nvl:'—', arq:'—', build:'—', stats:[], total:0, plataforma:'ps'},
];

export { ROSTER_T3 };
