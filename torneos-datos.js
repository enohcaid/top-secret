// Fixture y escudos de Top Secret — FUENTE ÚNICA. La leen calendario.html, convocatoria.html, el Worker
// (cargarCalendarioOficial), noticia-diaria.mjs, placa-envivo.mjs, placa-fixture-eg.mjs y social/lib/datos.mjs.
// Script clásico: deja globalThis.TSTorneos (en Node: import './torneos-datos.js').
// REGLAS (el Worker y noticia-diaria leen este archivo como TEXTO):
//   · RAW: un partido por línea, empezando con {date:'…; cierre "];" en la primera columna.
//   · El índice de cada partido es la clave de Firestore (edits/suspended/results): solo se AGREGA AL FINAL,
//     nunca se reordena ni se borra.
//   · Torneo nuevo = cabecera "// ══ <LIGA> T? — <torneo> ══" arriba de sus partidos.
// Después de editar: node scripts/control-datos.mjs  y subir ?v= en calendario.html y convocatoria.html.
(function torneos() {
const RAW = [
  // ══ SEMANA 2-5 MARZO ══
  // Lun 02 Mar - VPUG
  {date:'2026-03-02',time:'22:30',league:'VPUG', rival:'Suda eSports',       isHome:true,  result:null},
  // Mar 03 Mar - VPUG + 11x11
  {date:'2026-03-03',time:'22:30',league:'VPUG', rival:'Team Valhalla',      isHome:false, result:null},
  {date:'2026-03-03',time:'23:00',league:'11x11',rival:'Instituto Reserva',   isHome:false, result:[0,3]},
  {date:'2026-03-03',time:'23:30',league:'11x11',rival:'Los Picantes Esports',isHome:true,  result:[7,0]},
  // Mié 04 Mar - VPUG
  {date:'2026-03-04',time:'22:30',league:'VPUG', rival:'La Unión FC',        isHome:true,  result:null},
  // Jue 05 Mar - VPUG + 11x11
  {date:'2026-03-05',time:'22:30',league:'VPUG', rival:'Ferro eSports',      isHome:false, result:null},
  {date:'2026-03-05',time:'23:00',league:'11x11',rival:'Talleres Cantera',    isHome:true,  result:[6,0]},
  {date:'2026-03-05',time:'23:30',league:'11x11',rival:'Instituto Senior',    isHome:true,  result:[6,0]},

  // ══ SEMANA 9-12 MARZO ══
  // Lun 9 Mar
  {date:'2026-03-09',time:'23:00',league:'VPN',  rival:'Los Lesionados',    isHome:true,  result:null},
  {date:'2026-03-09',time:'23:30',league:'VPN',  rival:'Olimpo Esports',     isHome:false, result:null},

  // Mar 10 Mar
  {date:'2026-03-10',time:'23:00',league:'11x11',rival:'Talleres Reserva',   isHome:true,  result:null},
  {date:'2026-03-10',time:'23:30',league:'11x11',rival:'Estudiantes Río Cuarto',isHome:true,result:null},

  // Mié 11 Mar
  {date:'2026-03-11',time:'23:00',league:'VPN',  rival:'Suda Esports',       isHome:true,  result:null},
  {date:'2026-03-11',time:'23:30',league:'VPN',  rival:'4BDOMIFL4NES',       isHome:false, result:null},

  // Jue 12 Mar
  {date:'2026-03-12',time:'23:00',league:'11x11',rival:'Escuela Vieja',      isHome:false, result:null},
  {date:'2026-03-12',time:'23:30',league:'11x11',rival:'Team Valhalla',      isHome:false, result:null},

  // ══ SEMANA 16-19 MARZO ══
  // Lun 16 Mar
  {date:'2026-03-09',time:'22:30',league:'VPUG', rival:'I.A.C.C Cantera',    isHome:true,  result:null},
  {date:'2026-03-16',time:'23:00',league:'VPN',  rival:'All Boys',           isHome:true,  result:null},
  {date:'2026-03-16',time:'23:30',league:'VPN',  rival:'FERRO',              isHome:false, result:null},

  // Mar 17 Mar
  {date:'2026-03-10',time:'22:30',league:'VPUG', rival:'Evermeet Rising',    isHome:false, result:null},
  {date:'2026-03-17',time:'23:00',league:'11x11',rival:'Deportivo Ballester',isHome:false, result:null},
  {date:'2026-03-17',time:'23:30',league:'11x11',rival:'Olimpo Esports',     isHome:true,  result:null},

  // Mié 18 Mar
  {date:'2026-03-11',time:'22:30',league:'VPUG', rival:'Team Ceniza',    isHome:true,  result:null},
  {date:'2026-03-18',time:'23:00',league:'VPN',  rival:'La Resaca',          isHome:true,  result:null},
  {date:'2026-03-18',time:'23:30',league:'VPN',  rival:'Almirante Brown eSport',isHome:false,result:null},

  // Jue 19 Mar
  {date:'2026-03-12',time:'22:30',league:'VPUG', rival:'Real Marcianos FC',  isHome:false, result:null},
  {date:'2026-03-19',time:'23:00',league:'11x11',rival:'Acosta Beef Esports',isHome:false, result:null},
  {date:'2026-03-19',time:'23:30',league:'11x11',rival:'IACC Cantera',       isHome:false, result:null},

  // ══ SEMANA 23-26 MARZO ══
  // Lun 23 Mar
  // Mar 24 Mar
  {date:'2026-03-24',time:'22:30',league:'VPUG', rival:'Germinal eSports',   isHome:true,  result:null},
  {date:'2026-03-24',time:'23:00',league:'11x11',rival:'Altoke Perro',       isHome:false, result:null},
  {date:'2026-03-24',time:'23:30',league:'11x11',rival:'All Boys',           isHome:true,  result:null},

  // Mié 25 Mar
  {date:'2026-03-25',time:'22:30',league:'VPUG', rival:'Olimpo eSports',     isHome:false, result:null},
  {date:'2026-03-25',time:'23:00',league:'VPN',  rival:'SUB 21CF',           isHome:true,  result:null},
  {date:'2026-03-25',time:'23:30',league:'VPN',  rival:'Parke Avellaneda',   isHome:true,  result:null},

  // Jue 26 Mar
  {date:'2026-03-26',time:'22:30',league:'VPUG', rival:'DeLa Nada FC',       isHome:false, result:null},
  {date:'2026-03-26',time:'23:00',league:'11x11',rival:'ROKA56',             isHome:false, result:null},
  {date:'2026-03-26',time:'23:30',league:'11x11',rival:'Cambaceres',         isHome:true,  result:null},

  // ══ SEMANA 30 MAR - 2 ABR ══
  // Lun 30 Mar
  {date:'2026-03-31',time:'22:30',league:'VPUG', rival:'Villa Dalmine eSp',  isHome:true,  result:null},
  {date:'2026-04-01',time:'23:00',league:'VPN',  rival:'Nueva Chicago eSports',isHome:false,result:null},
  {date:'2026-04-01',time:'23:30',league:'VPN',  rival:'Instituto Reserva',  isHome:false, result:null},

  // Mar 31 Mar
  {date:'2026-03-23',time:'22:30',league:'VPUG', rival:'Atletico Titan',     isHome:false, result:null},
  {date:'2026-03-31',time:'23:00',league:'11x11',rival:'4BDOMIFL4NES',       isHome:true,  result:null},
  {date:'2026-03-31',time:'23:30',league:'11x11',rival:'Camioneros Esports', isHome:true,  result:null},

  // Mié 1 Abr
  {date:'2026-04-07',time:'22:30',league:'VPUG', rival:'Belgrano eSports',   isHome:false, result:null},
  {date:'2026-04-01',time:'23:00',league:'VPN',  rival:'Team Caniza',        isHome:false, result:null},
  {date:'2026-04-06',time:'23:30',league:'VPN',  rival:'Instituto Cantera',  isHome:true,  result:null},

  // Jue 2 Abr
  {date:'2026-03-25',time:'22:30',league:'VPUG', rival:'Almirante Brown eSp',isHome:false, result:null},
  {date:'2026-04-07',time:'23:00',league:'11x11',rival:'Sub 21 CF',          isHome:false, result:null},
  {date:'2026-04-07',time:'23:30',league:'11x11',rival:'Ferro',              isHome:false, result:null},

  // ══ SEMANA 6-9 ABR ══
  // Lun 6 Abr
  {date:'2026-04-08',time:'23:00',league:'VPN',  rival:'Infinitx',           isHome:false, result:null},
  {date:'2026-04-08',time:'23:30',league:'VPN',  rival:'Lírico FC',          isHome:true,  result:[11,1]},

  // Mar 7 Abr
  {date:'2026-04-07',time:'23:50',league:'11x11',rival:'Suda ESP',           isHome:false, result:null},

  // Lun 13 Abr
  {date:'2026-04-13',time:'23:00',league:'VPN',  rival:'Dep Ballester',      isHome:false, result:[2,3]},
  {date:'2026-04-13',time:'23:30',league:'VPN',  rival:'Dalmine Esports',    isHome:true,  result:null},
  {date:'2026-04-13',time:'23:50',league:'VPN',  rival:'Camioneros eSp',     isHome:false, result:null},

  // ══ PLAYOFFS VPN T1 ══

  // Cuartos de Final vs Camioneros eSports — 20 Abr
  {date:'2026-04-20',time:'23:00',league:'VPN',  rival:'Camioneros eSports',  isHome:false, result:[0,1],  playoff:'Cuartos de Final · Ida'},
  {date:'2026-04-20',time:'23:30',league:'VPN',  rival:'Camioneros eSports',  isHome:true,  result:[1,0],  playoff:'Cuartos de Final · Vuelta'},

  // Semifinal vs 4BDOMIFL4NES — 22 Abr
  {date:'2026-04-22',time:'23:00',league:'VPN',  rival:'4BDOMIFL4NES',        isHome:false, result:[0,3],  playoff:'Semifinal · Ida'},
  {date:'2026-04-22',time:'23:30',league:'VPN',  rival:'4BDOMIFL4NES',        isHome:true,  result:[2,0],  playoff:'Semifinal · Vuelta'},

  // Final Promoción vs InfinitX — 27 Abr
  {date:'2026-04-27',time:'23:00',league:'VPN',  rival:'InfinitX',            isHome:false, result:[0,1],  playoff:'Final Promoción · Ida'},
  {date:'2026-04-27',time:'23:30',league:'VPN',  rival:'InfinitX',            isHome:true,  result:[1,3],  playoff:'Final Promoción · Vuelta'},

  // Promo Playoffs vs Comunicaciones eSports — 29 Abr
  {date:'2026-04-29',time:'23:00',league:'VPN',  rival:'Comunicaciones eSports', isHome:false, result:[1,2], playoff:'Promo · Ida'},
  {date:'2026-04-29',time:'23:30',league:'VPN',  rival:'Comunicaciones eSports', isHome:true,  result:[1,1], playoff:'Promo · Vuelta'},

  // ══ VPN T2 — Temporada 2 (partidos jugados — respaldo RAW por si la API falla) ══
  {date:'2026-05-13',time:'22:30',league:'VPN', rival:'Escuela Vieja',           isHome:true,  result:[3,4], round:1},  // F1
  {date:'2026-05-13',time:'22:30',league:'VPN', rival:'Nueva Chicago eSports',   isHome:false, result:[2,1], round:2},  // F2
  {date:'2026-05-13',time:'22:30',league:'VPN', rival:'Real Black FC',           isHome:true,  result:[3,5], round:3},  // F3
  {date:'2026-05-18',time:'22:30',league:'VPN', rival:'Comunicaciones',          isHome:false, result:[3,2], round:4},  // F4
  {date:'2026-05-18',time:'22:30',league:'VPN', rival:'San Jorge eSp',           isHome:true,  result:[1,4], round:5},  // F5
  {date:'2026-05-18',time:'22:30',league:'VPN', rival:'InfinitX',                isHome:false, result:[3,2], round:6},  // F6
  // Semana 20 May
  {date:'2026-05-20',time:'23:00',league:'VPN', rival:'BNA San Jorge',           isHome:true,  result:[1,3], round:7},  // F7
  {date:'2026-05-20',time:'23:30',league:'VPN', rival:'Chacarita eSports',       isHome:false, result:[3,0], round:8},  // F8
  {date:'2026-05-20',time:'23:59',league:'VPN', rival:'Riestra eSports',         isHome:true,  result:[1,1], round:9},  // F9
  // Semana 27 May
  {date:'2026-05-27',time:'23:00',league:'VPN', rival:'Aesma Gaming',            isHome:false, result:[1,0], round:10}, // F10
  {date:'2026-05-27',time:'23:30',league:'VPN', rival:'CAI Esports',             isHome:true,  result:[2,3], round:11}, // F11
  {date:'2026-05-27',time:'23:59',league:'VPN', rival:'San Lorenzo Esports',     isHome:true,  result:[1,3], round:12}, // F12
  // Semana 1 Jun
  {date:'2026-06-01',time:'23:00',league:'VPN', rival:'Instituto Esports',       isHome:false, result:[3,1],  round:13}, // F13
  {date:'2026-06-01',time:'23:30',league:'VPN', rival:'Estudiantes LP',          isHome:true,  result:[1,2],  round:14}, // F14
  {date:'2026-06-01',time:'23:59',league:'VPN', rival:'Talleres Esports',        isHome:false, result:[5,1],  round:15}, // F15
  // Semana 3 Jun
  {date:'2026-06-03',time:'23:00',league:'VPN', rival:'FCO Cannabiense',         isHome:true,  result:[0,1],  round:16}, // F16
  {date:'2026-06-03',time:'23:30',league:'VPN', rival:'Monoidales',              isHome:false, result:[1,1],  round:17}, // F17
  // Semana 8 Jun
  {date:'2026-06-08',time:'23:00',league:'VPN', rival:'Hacha eSports',           isHome:true,  result:[0,4], round:18}, // F18
  {date:'2026-06-08',time:'23:30',league:'VPN', rival:'Belgrano Esports',        isHome:false, result:[1,3], round:19}, // F19

  // ══ VPUG T2 — Temporada 2 ══
  // Semana 18-21 May
  {date:'2026-05-18',time:'22:40',league:'VPUG', rival:'United Mito',            isHome:false, result:[0,3], round:1},  // F1
  {date:'2026-05-19',time:'22:40',league:'VPUG', rival:'All Boys eSports',       isHome:true,  result:[1,2], round:2},  // F2
  {date:'2026-05-20',time:'22:40',league:'VPUG', rival:'Olimpo eSports',         isHome:false, result:[2,0], round:3},  // F3
  {date:'2026-05-21',time:'22:40',league:'VPUG', rival:'InfinitX',               isHome:true,  result:[3,2], round:4},  // F4

  // Semana 26-29 May
  {date:'2026-05-26',time:'22:40',league:'VPUG', rival:'I.A.C.C Cantera',        isHome:false, result:[1,2], round:5},  // F5
  {date:'2026-05-27',time:'22:40',league:'VPUG', rival:'Hacha eSports',          isHome:true,  result:[0,1], round:6},  // F6
  {date:'2026-05-28',time:'22:40',league:'VPUG', rival:'Evermeet FC',            isHome:false, result:[0,4], round:7},  // F7
  {date:'2026-06-01',time:'22:40',league:'VPUG', rival:'Real Marcianos FC',      isHome:false, result:[0,4], round:8},  // F8 (jue→lun)

  // Semana 2-5 Jun
  {date:'2026-06-02',time:'22:40',league:'VPUG', rival:'Team Valhalla',          isHome:true,  result:[0,2], round:9},  // F9
  {date:'2026-06-03',time:'22:40',league:'VPUG', rival:'Germinal eSports',       isHome:false, result:[2,2], round:10}, // F10
  {date:'2026-06-04',time:'22:40',league:'VPUG', rival:'Atletico Moneiro',       isHome:true,  result:[1,1], round:11}, // F11
  {date:'2026-06-08',time:'22:40',league:'VPUG', rival:'Villa Dalmine eSports',  isHome:false, result:[0,0], round:12}, // F12 (jue→lun)

  // Semana 9-12 Jun
  {date:'2026-06-10',time:'22:40',league:'VPUG', rival:'La Unión FC',            isHome:true,  result:[1,0], round:13}, // F13 (WO)
  {date:'2026-06-11',time:'22:40',league:'VPUG', rival:'4BDOMIFL4NES',           isHome:false, result:null, round:14}, // F14 (jue)
  {date:'2026-06-11',time:'23:00',league:'VPUG', rival:'NuVo FC',                isHome:true,  result:null, round:15}, // F15 (jue)
  {date:'2026-06-11',time:'23:30',league:'VPUG', rival:'Suda eSports',           isHome:false, result:null, round:16}, // F16 (jue)

  // Semana 16 Jun
  {date:'2026-06-11',time:'23:59',league:'VPUG', rival:'Nueva Chicago eSports',  isHome:true,  result:null, round:17}, // F17 (jue)

  // ══ VPUG T3 — #1 Primera División VPUG (T6 CopáFácil) ══
  // Fixture confirmado via Firebase (matchs.json, evt -fthh5@7zxj). Fechas proyectadas
  // con patrón semanal Lunes a Jueves 22:30, 1 partido por día, arrancando 2026-08-10
  // (fecha de inicio real del torneo) — ajustar si el organizador reprograma alguna fecha.
  {date:'2026-08-10',time:'22:30',league:'VPUG', rival:'Nueva Chicago',          isHome:false, result:null, round:1},  // F1
  {date:'2026-08-11',time:'22:30',league:'VPUG', rival:'Deportivo Moron',        isHome:true,  result:null, round:2},  // F2
  {date:'2026-08-12',time:'22:30',league:'VPUG', rival:'Real MarcianoFC',        isHome:false, result:null, round:3},  // F3
  {date:'2026-08-13',time:'22:30',league:'VPUG', rival:'InfinitX',               isHome:true,  result:null, round:4},  // F4
  {date:'2026-08-17',time:'22:30',league:'VPUG', rival:'Germinal eSports',       isHome:false, result:null, round:5},  // F5
  {date:'2026-08-18',time:'22:30',league:'VPUG', rival:'Argentino de Merlo',     isHome:true,  result:null, round:6},  // F6
  {date:'2026-08-19',time:'22:30',league:'VPUG', rival:'Hacha eSports',          isHome:false, result:null, round:7},  // F7
  {date:'2026-08-20',time:'22:30',league:'VPUG', rival:'Suda eSports',           isHome:false, result:null, round:8},  // F8
  {date:'2026-08-24',time:'22:30',league:'VPUG', rival:'Ysh FC',                 isHome:true,  result:null, round:9},  // F9
  {date:'2026-08-25',time:'22:30',league:'VPUG', rival:'I.A.C.C Cantera',        isHome:false, result:null, round:10}, // F10
  {date:'2026-08-26',time:'22:30',league:'VPUG', rival:'Atlético Moneiro',       isHome:true,  result:null, round:11}, // F11
  {date:'2026-08-27',time:'22:30',league:'VPUG', rival:'4BDOMIFL4NES',           isHome:false, result:null, round:12}, // F12
  {date:'2026-08-31',time:'22:30',league:'VPUG', rival:'United Mito',            isHome:true,  result:null, round:13}, // F13
  {date:'2026-09-01',time:'22:30',league:'VPUG', rival:'All Boys eSp',           isHome:false, result:null, round:14}, // F14
  {date:'2026-09-01',time:'23:00',league:'VPUG', rival:'Temperley eSports',      isHome:true,  result:null, round:15}, // F15 (adelantada desde 09-02)
  {date:'2026-09-01',time:'23:59',league:'VPUG', rival:'San Miguel eSports',     isHome:false, result:null, round:16}, // F16 (adelantada desde 09-03)
  {date:'2026-09-01',time:'23:30',league:'VPUG', rival:'Colon SL',               isHome:true,  result:null, round:17}, // F17 (adelantada desde 09-07)

  // ══ VPUG T4 — Liga Pretemporada VPUG (FC-27) (T7 CopáFácil), Grupo D ══
  // Fixture confirmado via Firebase (matchs.json, evt -fthh5@b7we). Cadencia confirmada por el
  // usuario (2026-10-05): lunes y miércoles a las 23:00 y 23:30, 2 partidos por día — ajustar si
  // el organizador reprograma.
  {date:'2026-10-07',time:'22:30',league:'VPUG', rival:'Comunicaciones Cantera', isHome:true,  result:null, round:1},  // F1 — ex Villa Dalmine eSports, cambió nombre y escudo (reprogramada 2 veces: lun 05/10 23:00 → mar 06/10 22:30 → mié 07/10 22:30)
  {date:'2026-10-05',time:'23:30',league:'VPUG', rival:'Norpatagonicos eSports', isHome:false, result:null, round:2},  // F2 (lun)
  {date:'2026-10-07',time:'23:00',league:'VPUG', rival:'Cambaceres',             isHome:true,  result:null, round:3},  // F3 (mié)
  {date:'2026-10-07',time:'23:30',league:'VPUG', rival:'Real Envido',            isHome:false, result:null, round:4},  // F4 (mié)
  {date:'2026-10-12',time:'23:00',league:'VPUG', rival:'CSyD La Mochila',        isHome:true,  result:null, round:5},  // F5 (lun) — ex Inter Regional, cambió nombre y escudo
  {date:'2026-10-12',time:'23:30',league:'VPUG', rival:'Temperley eSports',      isHome:false, result:null, round:6},  // F6 (lun)
  {date:'2026-10-12',time:'23:59',league:'VPUG', rival:'Peñarol Creadores',      isHome:true,  result:null, round:7},  // F7 — adelantada (mié 14/10 23:00 → lun 12/10 23:59, triple fecha)
  // Playoff Fase Oro — Octavos de final #7 (2° Grupo D vs 1° Grupo C), ida y vuelta el mismo día.
  // Horarios = cadencia de la fase de grupos (mié 23:00/23:30), sin confirmar por el organizador.
  // Si la serie queda 1 ganado / 1 perdido por la misma diferencia, el Worker agrega solo el 3er partido.
  {date:'2026-10-14',time:'23:00',league:'VPUG', rival:'Argentino de Merlo',     isHome:false, result:null, playoff:'Fase Oro · Octavos de final · Ida'},
  {date:'2026-10-14',time:'23:30',league:'VPUG', rival:'Argentino de Merlo',     isHome:true,  result:null, playoff:'Fase Oro · Octavos de final · Vuelta'},

  // ══ VPUG T4 — Primera División VPUG ══
  // Fixture REAL (fecha y hora por partido) de la web nueva de la liga, vpug-liga.onrender.com (VPUG dejó
  // CopáFácil): GET /v1/partidos?temporadaId=7&divisionId=1 con sesión iniciada. 18 equipos, 17 fechas, lun-jue 22:30.
  // Nombres: los de la liga salvo clubes ya jugados con otro nombre (comentado).
  {date:'2026-11-10',time:'22:30',league:'VPUG', rival:'MON0TRIBUTIST4S',          isHome:false, result:null, round:1}, // F1 (mar)
  {date:'2026-11-11',time:'22:30',league:'VPUG', rival:'Deportivo Madryn eSports', isHome:true,  result:null, round:2}, // F2 (mié)
  {date:'2026-11-12',time:'22:30',league:'VPUG', rival:'San Miguel eSports',       isHome:false, result:null, round:3}, // F3 (jue) — en VPUG figura "San Miguel eSp"
  {date:'2026-11-16',time:'22:30',league:'VPUG', rival:'COMUNICACIONES',           isHome:true,  result:null, round:4}, // F4 (lun)
  {date:'2026-11-17',time:'22:30',league:'VPUG', rival:'INSTITUTO CANT',           isHome:false, result:null, round:5}, // F5 (mar)
  {date:'2026-11-18',time:'22:30',league:'VPUG', rival:'Argentino de Merlo',       isHome:false, result:null, round:6}, // F6 (mié) — en VPUG figura "Arg de Merlo eS"
  {date:'2026-11-19',time:'22:30',league:'VPUG', rival:'Hacha eSports',            isHome:true,  result:null, round:7}, // F7 (jue)
  {date:'2026-11-23',time:'22:30',league:'VPUG', rival:'Instituto esp',            isHome:false, result:null, round:8}, // F8 (lun)
  {date:'2026-11-24',time:'22:30',league:'VPUG', rival:'United Mito',              isHome:true,  result:null, round:9}, // F9 (mar) — en VPUG figura "UNITED MITO"
  {date:'2026-11-25',time:'23:59',league:'VPUG', rival:'IACC Reserva',             isHome:false, result:null, round:10}, // F10 (mié)
  {date:'2026-11-26',time:'22:30',league:'VPUG', rival:'Hacha Reserva',            isHome:true,  result:null, round:11}, // F11 (jue)
  {date:'2026-11-30',time:'22:30',league:'VPUG', rival:'moron esp',                isHome:false, result:null, round:12}, // F12 (lun)
  {date:'2026-12-01',time:'22:30',league:'VPUG', rival:'ALL BOYS',                 isHome:true,  result:null, round:13}, // F13 (mar)
  {date:'2026-12-02',time:'22:30',league:'VPUG', rival:'YSH FC',                   isHome:true,  result:null, round:14}, // F14 (mié)
  {date:'2026-12-03',time:'22:30',league:'VPUG', rival:'AtleticoMoneiro',          isHome:false, result:null, round:15}, // F15 (jue)
  {date:'2026-12-07',time:'22:30',league:'VPUG', rival:'Belgrano eSports',         isHome:true,  result:null, round:16}, // F16 (lun) — en VPUG figura "Belgrano eSport"
  {date:'2026-12-08',time:'22:30',league:'VPUG', rival:'Deportivo Murra',          isHome:false, result:null, round:17}, // F17 (mar)

  // ══ 11x11 T3 — CHALLENGERS #3 ══
  {date:'2026-05-19',time:'23:00',league:'11x11', rival:'Los Waxiturros',          isHome:true,  result:[1,2], round:1},  // F1
  {date:'2026-05-19',time:'23:30',league:'11x11', rival:'Argentino de Merlo',      isHome:false, result:[2,1], round:2},  // F2
  {date:'2026-05-21',time:'23:00',league:'11x11', rival:'Ferro',                   isHome:true,  result:[1,0], round:3},  // F3
  {date:'2026-05-21',time:'23:30',league:'11x11', rival:'Dep. Ballester',          isHome:true,  result:[1,0], round:4},  // F4
  {date:'2026-05-26',time:'23:00',league:'11x11', rival:'All Boys',                isHome:true,  result:[1,1], round:5},  // F5
  {date:'2026-05-26',time:'23:30',league:'11x11', rival:'Comunicaciones eSports',  isHome:true,  result:[2,3], round:6},  // F6
  {date:'2026-05-28',time:'23:00',league:'11x11', rival:'Instituto Reserva',       isHome:false, result:[2,1], round:7},  // F7
  {date:'2026-05-28',time:'23:30',league:'11x11', rival:'4BDOMIFL4NES',            isHome:true,  result:[4,2], round:8},  // F8
  {date:'2026-05-28',time:'23:59',league:'11x11', rival:'Los Picantes eSports',    isHome:true,  result:[2,0], round:9},  // F9

];

// VPUG T2 team badges (Firebase Storage)
const _FB = 'https://firebasestorage.googleapis.com/v0/b/copafacil-web.appspot.com/o/events%2F-fthh5%2Fpg59%2Fteams%2F';
const _FQ = '.png?alt=media&token=1';
const VPUG_T2_BADGES = {
  'United Mito':           _FB+'-OsMvCo5TroXXRQESh8X'+_FQ,
  'All Boys eSports':      _FB+'-OsMuxjrkBhlxqgHYo3h'+_FQ,
  'Olimpo eSports':        _FB+'-OsMunLybVb4pwFbqCue'+_FQ,
  'InfinitX':              _FB+'-OsMuhE-u1E66GmHygQ8'+_FQ,
  'I.A.C.C Cantera':       _FB+'-OsMuw6E8LdYHDoCUr1l'+_FQ,
  'Hacha eSports':         _FB+'-OsMuj6jB2yFLi8_u_BT'+_FQ,
  'Evermeet Rising':       _FB+'-OsMuzAoZE3jVN4OQFXE'+_FQ,
  'Real Marcianos FC':     _FB+'-OsMv2cJ5Fped-UWTHGu'+_FQ,
  'Team Valhalla':         _FB+'-OsMv-OatbjUrVHU2SRR'+_FQ,
  'Germinal eSports':      _FB+'-OsMutXodyVLwoM4J5wE'+_FQ,
  'Atletico Moneiro':      _FB+'-OsMufqFxBsoawhOuaBj'+_FQ,
  'Villa Dalmine eSports': _FB+'-OsMusnJNuTqdPlqecqy'+_FQ,
  'La Unión FC':           _FB+'-OsMuv-Tncx4ZJag-r26'+_FQ,
  '4BDOMIFL4NES':          _FB+'-OsMv3twVIiqprWZaFrj'+_FQ,
  'NuVo FC':               _FB+'-OsMvBXyushQcOcLYfub'+_FQ,
  'Suda eSports':          _FB+'-OsMuuL37DZJ4_U3v-AE'+_FQ,
  'Nueva Chicago eSports': _FB+'-OsMv1LKGj7lioqdDP0i'+_FQ,
};
// VPUG T3 team badges — #1 Primera División VPUG (T6 CopáFácil), temporada regular desde 2026-08-10
const VPUG_T3_BADGES = {
  'Nueva Chicago':       'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fjk0u%2Fteams%2F-OrJJG4wNcts0vozc6_Q.png?alt=media&token=1&m=1777384491268',
  'Deportivo Moron':     'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fl2fb%2Fteams%2F-Osl76Pr_C10tVEcf6jZ.png?alt=media&token=1&m=1778999664645',
  'Real MarcianoFC':     'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fjk0u%2Fteams%2F-OrJJK2phXP4iCdiats2.png?alt=media&token=1&m=1777383674107',
  'InfinitX':            'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fpg59%2Fteams%2F-OsMuhE-u1E66GmHygQ8.png?alt=media&token=1&m=1778519186424',
  'Germinal eSports':    'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fjk0u%2Fteams%2F-OrJJFPe1ZweZc87RIxz.png?alt=media&token=1&m=1777384309012',
  'Argentino de Merlo':  'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2F6w2f%2Fteams%2F-OsqaWiCI-o32hNoVxCB.png?alt=media&token=1&m=1779040380037',
  'Hacha eSports':       'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fllo8%2Fteams%2F-OvQbx98GunA039zp-bH.png?alt=media&token=1&m=1781803912247',
  'Suda eSports':        'https://firebasestorage.googleapis.com/v0/b/copafacil-web.appspot.com/o/events%2F-fthh5%2F7zxj%2Fteams%2F-OvQevHLY6602L6O9nnC.png?alt=media&token=1&m=1786312911683',
  'Ysh FC':              'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/escudos-rivales/ysh-fc.webp',
  'I.A.C.C Cantera':     'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fpg59%2Fteams%2F-OsMuw6E8LdYHDoCUr1l.png?alt=media&token=1&m=1778519091798',
  'Atlético Moneiro':    'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fjk0u%2Fteams%2F-OrJJ8gO1MV4MpdIkj31.png?alt=media&token=1&m=1777384209613',
  '4BDOMIFL4NES':        'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fjk0u%2Fteams%2F-OrJJHNtZzsN6pGKzstV.png?alt=media&token=1&m=1777384517795',
  'United Mito':         'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fllo8%2Fteams%2F-OvQc3HN0-1ALKiuvvQK.png?alt=media&token=1&m=1781803881039',
  'All Boys eSp':        'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fh6z9%2Fteams%2F-OlZaxMFjlVs5_rNMfbA.png?alt=media&token=1&m=1771279886020',
  'Temperley eSports':   'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fllo8%2Fteams%2F-OvQc6Ze0TMTfq1T1qlS.png?alt=media&token=1&m=1782828958852',
  'San Miguel eSports':  'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fl2fb%2Fteams%2F-Osl6TMQmCXINP2THWYM.png?alt=media&token=1&m=1778942125257',
  'Colon SL':            'https://firebasestorage.googleapis.com/v0/b/copafacil-web.appspot.com/o/events%2F-fthh5%2F7zxj%2Fteams%2F-OmWPzqBjj1QCR6oNHIq.png?alt=media&token=1&m=1786214093523',
};
// VPUG T4 badges — Liga Pretemporada VPUG (FC-27) (T7 CopáFácil), Grupo D, desde 2026-10-05
const VPUG_T4_BADGES = {
  'Comunicaciones Cantera':  'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fb7we%2Fteams%2F-P2JRiVP2pCqmqxrPfis.png?alt=media&token=1&m=1791296980020',   // ex Villa Dalmine eSports
  'Norpatagonicos eSports':  'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fb7we%2Fteams%2F-P31SBjRST6W8mTvYHP0.png?alt=media&token=1&m=1791042652994',
  'Cambaceres':              'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fb7we%2Fteams%2F-P2sJ7lR0q6j546X1yLj.png?alt=media&token=1&m=1790872517335',
  'Real Envido':             'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fb7we%2Fteams%2F-P2dRpWyb-B6cLLfTYAj.png?alt=media&token=1&m=1790623057205',
  'CSyD La Mochila':         'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fb7we%2Fteams%2F-P2OXy0twcTpDlidx8p-.png?alt=media&token=1&m=1791232638434',
  'Temperley eSports':       'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fb7we%2Fteams%2F-P2xb8ufrcFsK91qcsrN.png?alt=media&token=1&m=1791045825948',
  'Peñarol Creadores':       'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fb7we%2Fteams%2F-P2nt3cP2umFGxBQ5FKa.png?alt=media&token=1&m=1790798403308',
  'Argentino de Merlo':      'https://nkqjsmxxmrodientlnlh.supabase.co/storage/v1/object/public/escudos/club-161-1793991827920.webp',   // playoff Fase Oro, octavos · desde 10/11 el escudo de vpug-liga (Primera)
  // Primera División VPUG (vpug-liga, desde 2026-11-10) — escudos de la web nueva de la liga (Supabase); los que venían
  // con fondo opaco, sin fondo en R2 logos/escudos/vpug/ (scripts/escudo-sin-fondo.py)
  'MON0TRIBUTIST4S':          'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/escudos/vpug/monotributistas.webp',   // sin fondo (el de la liga traía fondo opaco)
  'Deportivo Madryn eSports': 'https://nkqjsmxxmrodientlnlh.supabase.co/storage/v1/object/public/escudos/pedido-1929-1794153209937.webp',
  'San Miguel eSports':       'https://nkqjsmxxmrodientlnlh.supabase.co/storage/v1/object/public/escudos/pedido-1081-1793398579721.webp',
  'COMUNICACIONES':           'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/escudos/vpug/comunicaciones.webp',   // sin fondo (el de la liga traía fondo opaco)
  'INSTITUTO CANT':           'https://nkqjsmxxmrodientlnlh.supabase.co/storage/v1/object/public/escudos/pedido-1173-1793546676663.webp',
  'Hacha eSports':            'https://nkqjsmxxmrodientlnlh.supabase.co/storage/v1/object/public/escudos/pedido-1279-1793580261004.webp',
  'Instituto esp':            'https://nkqjsmxxmrodientlnlh.supabase.co/storage/v1/object/public/escudos/pedido-1141-1793485125510.webp',
  'United Mito':              'https://nkqjsmxxmrodientlnlh.supabase.co/storage/v1/object/public/escudos/pedido-788-1793214523849.webp',
  'IACC Reserva':             'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/escudos/vpug/iacc-reserva.webp',   // sin fondo (el de la liga traía fondo opaco)
  'Hacha Reserva':            'https://nkqjsmxxmrodientlnlh.supabase.co/storage/v1/object/public/escudos/pedido-655-1793144856526.webp',
  'moron esp':                'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/escudos/vpug/moron-esp.webp',   // sin fondo (el de la liga traía fondo opaco)
  'ALL BOYS':                 'https://nkqjsmxxmrodientlnlh.supabase.co/storage/v1/object/public/escudos/pedido-1337-1793627903704.webp',
  'YSH FC':                   'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/escudos/vpug/ysh-fc.webp',   // sin fondo (el de la liga traía fondo opaco)
  'AtleticoMoneiro':          'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/escudos/vpug/atletico-moneiro.webp',   // sin fondo (el de la liga traía fondo opaco)
  'Belgrano eSports':         'https://nkqjsmxxmrodientlnlh.supabase.co/storage/v1/object/public/escudos/pedido-1333-1793626806878.webp',
  'Deportivo Murra':          'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/escudos/vpug/deportivo-murra.webp',   // sin fondo (el de la liga traía fondo opaco)
};
function vpugBadge(rival){ return VPUG_T4_BADGES[rival] || VPUG_T2_BADGES[rival] || VPUG_T3_BADGES[rival] || null; }

// 11x11 team badges — T2/CHALLENGERS#3 (historico) + T3/CHALLENGERS#4 (temporada actual)
const _VPG = 'https://virtualprogaming.com/cdn-cgi/imagedelivery/cl8ocWLdmZDs72LEaQYaYw/';
const E11_T3_BADGES = {
  'Los Waxiturros':         _VPG+'admin_cc6be38a-ba09-42a9-8b02-f212a63a69ee/public',
  'Argentino de Merlo':     _VPG+'admin_4b75c893-290e-4735-a5a9-8ec09a84c088/public',
  'Ferro':                  _VPG+'admin_1c583c95-59d3-4e79-9682-4d87ea41d8fe/public',
  'Dep. Ballester':         _VPG+'admin_92280d3f-785a-4421-a51b-ae8d6fc1be84/public',
  'All Boys':               _VPG+'admin_9d643667-da1a-4878-923c-88713acb1625/public',
  'Comunicaciones eSports': _VPG+'admin_defffab4-7d4a-489c-b9fd-ed65a8883046/public',
  'Instituto Reserva':      _VPG+'admin_033e2f03-d800-42fb-9a06-ef1339a9abf3/public',
  '4BDOMIFL4NES':           _VPG+'admin_d926fffb-49b9-44a2-8230-f2a44400927e/public',
  'Los Picantes eSports':   _VPG+'admin_f47091ff-af62-4f7f-bdb4-9aba143c3bef/public',
  // CHALLENGERS #4 — Zona 1 (Temporada 3)
  'Sub 21 CF':              _VPG+'admin_eaba7052-0cc9-4e41-8565-1a30736c24d9/public',
  'Parke Avellane':         _VPG+'admin_9596d0a8-192b-4d0c-ac39-00904c60220b/public',
  'IACC Cantera':           _VPG+'admin_f0266fdf-ebf4-4ddd-af73-81e1fe2daf17/public',
  'Camioneros eSports':     _VPG+'admin_e5ab2259-7ae3-47ce-a6c7-bc479b7bff72/public',
  'Deportivo Ballester':    _VPG+'admin_92280d3f-785a-4421-a51b-ae8d6fc1be84/public',
  'Interzonal A':           _VPG+'admin_22f4d8b1-33cb-4346-9bca-a64b9de5850f/public',
  'Olimpo Esports':         _VPG+'admin_b993e784-2fac-4459-bc68-db298ab57240/public',
  'Cambaceres':             _VPG+'admin_0418078a-b62c-4e2e-9656-6ace007d73f7/public',
};
// Espacio Gamer (ex 11x11) — T4: CHALLENGERS (2°) | ESPACIO GAMER ARGENTINA, escudos de espaciogamer.cl
// (nombres exactos de su fixture). Va antes que T3: algunos clubes repiten con escudo nuevo.
// Los que EG sube con fondo van sin fondo desde R2 logos/escudos-eg/ (scripts/escudos-sin-fondo.mjs).
const E11_T4_BADGES = {
  'Al Hueso':               'https://espaciogamer.cl/wp-content/uploads/2026/10/logo-20261013-202926-r4ry7akmsa.png',
  'ALL BOYS':               'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/escudos-eg/all-boys.webp',
  'Argentinos Jrs Esp':     'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/escudos-eg/argentinos-jrs-esp.webp',
  'Cambaceres':             'https://espaciogamer.cl/wp-content/uploads/2026/10/escudo-20261017-183948-j9beahxkmy.png',
  'Comunicaciones eSports': 'https://espaciogamer.cl/wp-content/uploads/2026/10/escudo-20261017-184001-chmnf1o33c.png',
  'CSyD La Mochila':        'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fb7we%2Fteams%2F-P2OXy0twcTpDlidx8p-.png?alt=media&token=1&m=1791232638434', // rival de la promoción (01/12), escudo de VPUG
  'Fco Kannabiense':        'https://espaciogamer.cl/wp-content/uploads/2026/10/escudo-20261017-184026-lfizbcrewy.png',
  'IACC Reserva':           'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/escudos-eg/iacc-reserva.webp',
  'InfinitX':               'https://espaciogamer.cl/wp-content/uploads/2026/10/escudo-20261017-184001-vrqhkmuma0.png',
  'Instituto Cantera':      'https://espaciogamer.cl/wp-content/uploads/2026/10/escudo-20261017-184004-16lzbul3pg.png',
  'La Carreta FC':          'https://espaciogamer.cl/wp-content/uploads/2026/10/escudo-20261017-184025-jnoqea0x5f.png',
  'Los Picantes':           'https://espaciogamer.cl/wp-content/uploads/2026/10/escudo-20261017-184002-fyufpthupl.png',
  'MISKYMAYU FC':           'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/escudos-eg/miskymayu-fc.webp',
  'MONOTRIBUTISTAS':        'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/escudos-eg/monotributistas.webp',
  'Nuvo FC':                'https://firebasestorage.googleapis.com/v0/b/copafacil-web.appspot.com/o/events%2F-fthh5%2Fpg59%2Fteams%2F-OsMvBXyushQcOcLYfub.png?alt=media&token=1', // EG no tiene escudo: el de NuVo FC en VPUG
  'Parke Avellane':         'https://espaciogamer.cl/wp-content/uploads/2026/10/escudo-20261017-183948-d4ddpbb8lw.png',
  'Sarmiento eSports':      'https://espaciogamer.cl/wp-content/uploads/2026/10/escudo-20261018-015205-zh9dt80nct.png',
  'Sub 21':                 'https://espaciogamer.cl/wp-content/uploads/2026/10/escudo-20261017-184004-ml2ubyzw5d.png',
  'SF Drysdale':            'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/escudos-eg/suda-esports.webp', // ex Suda eSports (2026-10-22), mismo escudo
  'Suda eSports':           'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/escudos-eg/suda-esports.webp',
  'WAP eSports':            'https://espaciogamer.cl/wp-content/uploads/2026/10/escudo-20261018-162806-ikyvnqcvqk.png',
};
const badgeSinMayus = (mapa, n) => n && (mapa[n] || mapa[Object.keys(mapa).find(k => k.toLowerCase() === n.toLowerCase())]);   // EG cambia mayúsculas de los nombres
function e11Badge(rival){ return badgeSinMayus(E11_T4_BADGES, rival) || badgeSinMayus(E11_T3_BADGES, rival) || null; }

// Torneo de cada partido de RAW: la cabecera de bloque bajo la que está anotado (se lee del propio código).
const cabeceras = [];
{
  const src = torneos.toString(), ini = src.indexOf('const RAW = ['), fin = src.indexOf('\n];', ini);
  let cab = '';
  for (const l of src.slice(ini, fin).split('\n')) {
    const h = l.match(/\/\/\s*══\s*(.*?)\s*══/);
    if (h) cab = h[1]; else if (/^\s*\{\s*date\s*:/.test(l)) cabeceras.push(cab);
  }
  if (cabeceras.length !== RAW.length) cabeceras.length = 0;   // si no cuadra, sin nombres (queda la liga)
}
// Fixture oficial vigente (desde la T4). VPN sale en vivo de la API; Espacio Gamer, de Firestore.
const T4_CUTOFF = '2026-09-28';
const fixtureVigente = RAW.filter(m => m.date > T4_CUTOFF && m.league !== 'VPN');

globalThis.TSTorneos = { RAW, cabeceras, fixtureVigente, VPUG_T2_BADGES, VPUG_T3_BADGES, VPUG_T4_BADGES, E11_T3_BADGES, E11_T4_BADGES, badgeSinMayus, vpugBadge, e11Badge };
})();
