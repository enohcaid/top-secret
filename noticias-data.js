// ── TOP SECRET FC · Noticias compartidas ────────────────────────────────────
// Orden: más reciente primero. Agregar nuevas noticias al inicio del array.

const NOTICIAS = [
  {
    id: 'rebrand-2026',
    pinned: false,
    category: 'Institucional',
    title: 'Top Secret FC presenta su nueva identidad',
    date: '2026-05-06',
    dateLabel: '6 de mayo de 2026',
    excerpt: 'El club anuncia una renovación de su identidad visual. Una nueva era para Top Secret FC.',
    image: 'logos/Anuncio Rebrand.png',
    body: [
      'Top Secret FC da un paso adelante y presenta oficialmente su nueva identidad visual. Un rediseño que refleja la evolución del club y su crecimiento dentro del fútbol virtual argentino.',
      'La nueva imagen llega en un momento bisagra: el club acaba de lograr el ascenso a la Primera División de la VPN y se prepara para debutar en la élite del fútbol virtual argentino.',
      'El rebrand es más que un cambio estético. Representa la ambición del club, su identidad y el camino que tiene por delante.',
      'Seguinos en nuestras redes: <a href="https://instagram.com/fctopsecret" target="_blank" rel="noopener">Instagram</a> · <a href="https://x.com/fctopsecret" target="_blank" rel="noopener">X</a> · <a href="https://facebook.com/topsecretfc" target="_blank" rel="noopener">Facebook</a>',
      '¡Bienvenidos a la nueva era de Top Secret FC!',
    ],
    shareCaption: '⭐ TOP SECRET FC · NUEVA IDENTIDAD\n\nEl club presenta su nueva imagen. Una nueva era comienza.\n\n📱 @fctopsecret en IG y X · fb.com/topsecretfc\n\n🖤⭐ #TopSecretFC #Rebrand #EAFCClubsPro',
    shareCaptions: {
      ig: '⭐ NUEVA IDENTIDAD · TOP SECRET FC\n\nEvolucionamos. Presentamos nuestra nueva imagen 🖤⭐\n\nSeguinos → @fctopsecret\n\n#TopSecretFC #Rebrand #EAFCClubsPro',
      x:  '⭐ Top Secret FC presenta su nueva identidad visual.\n\nUna nueva era comienza 🖤\n\nSeguinos → @fctopsecret\n\n#TopSecretFC #Rebrand',
      fb: '⭐ TOP SECRET FC · NUEVA IDENTIDAD\n\nEl club presenta oficialmente su nueva imagen visual. Un rediseño que refleja nuestra evolución y el camino que tenemos por delante.\n\nSeguinos en Instagram y X: @fctopsecret\n\n¡Bienvenidos a la nueva era! 🖤⭐\n\n#TopSecretFC #Rebrand #EAFCClubsPro',
    },
  },
  {
    id: 'equipo-temporada-vpn-2026',
    pinned: false,
    category: 'Distinción',
    title: 'Tres jugadores en el Equipo de la Temporada VPN',
    date: '2026-05-04',
    dateLabel: '4 de mayo de 2026',
    excerpt: 'La Liga VPN seleccionó a Lautavester7, cansitrGd22_ y BlackPanther-CG en su equipo ideal de la Temporada 1. Los tres delanteros del club firmaron números históricos.',
    image: 'logos/equipo-temporada-vpn.png',
    body: [
      'La Liga VPN hizo oficial su Equipo de la Temporada 1 y Top Secret FC tuvo una participación histórica: tres jugadores seleccionados en el once ideal, todos delanteros.',
      'cansitrGd22_ fue el gran protagonista de la temporada con 64 goles y 22 asistencias en 49 partidos, cerrando con un rating promedio de 7.69 — el más alto del club. Sus números lo ubican como uno de los goleadores más letales de toda la liga.',
      'Lautavester7 completó una campaña de lujo con 41 goles y 18 asistencias en 52 partidos. Su versatilidad en el frente de ataque y su rendimiento constante (7.27 de promedio) lo hicieron un fijo en el esquema y merecedor del reconocimiento.',
      'BlackPanther-CG aportó profundidad y desequilibrio con 21 goles y 19 asistencias en 54 partidos — el más activo de los tres. Su capacidad de asociación y los centros al área fueron claves en el juego colectivo del equipo.',
      'El anuncio fue realizado oficialmente por la cuenta de VPN Argentina en X. Top Secret FC es el club con más representantes en el Equipo de la Temporada.',
    ],
    shareCaption: '🏆 ¡EQUIPO DE LA TEMPORADA VPN! 🏆\n\n3 jugadores de Top Secret FC en el XI ideal de la Liga VPN:\n\n⚡ #7 Lautavester7 — 41G · 18A · 7.27 rating\n⚡ #22 cansitrGd22_ — 64G · 22A · 7.69 rating\n⚡ #11 BlackPanther-CG — 21G · 19A · 6.84 rating\n\n🖤⭐ #TopSecretFC #VPN #EquipoDeLaTemporada',
    shareCaptions: {
      ig: '🏆 EQUIPO DE LA TEMPORADA · LIGA VPN\n\n3 de los nuestros en el XI ideal de la Temporada 1 🖤⭐\n\n⚡ Lautavester7 — 41G · 18A\n⚡ cansitrGd22_ — 64G · 22A\n⚡ BlackPanther-CG — 21G · 19A\n\n#TopSecretFC #VPN #EquipoDeLaTemporada #EAFCClubsPro',
      x:  '🏆 3 jugadores de Top Secret FC en el Equipo de la Temporada VPN\n\n⚡ Lautavester7 — 41G · 18A\n⚡ cansitrGd22_ — 64G · 22A\n⚡ BlackPanther-CG — 21G · 19A\n\n#TopSecretFC #VPN #EquipoDeLaTemporada',
      fb: '🏆 ¡EQUIPO DE LA TEMPORADA VPN! 🏆\n\nTop Secret FC tuvo 3 representantes en el once ideal de la Liga VPN Temporada 1. Un reconocimiento histórico para el club.\n\n⚡ Lautavester7 — 41 goles · 18 asistencias\n⚡ cansitrGd22_ — 64 goles · 22 asistencias\n⚡ BlackPanther-CG — 21 goles · 19 asistencias\n\n#TopSecretFC #VPN #EAFCClubsPro',
    },
  },
  {
    id: 'ascenso-primera-2025',
    pinned: true,
    category: 'Histórico',
    title: 'Ascendimos a Primera División',
    date: '2025-05-03',
    dateLabel: '3 de mayo de 2025',
    excerpt: 'Top Secret FC logró el ascenso a la Primera División de la VPN tras una campaña histórica. Un hito que marca el inicio de una nueva era para el club.',
    image: 'logos/Festejo Ascenso.png',
    body: [
      'Top Secret FC escribió una de las páginas más importantes de su historia al coronarse campeón y obtener el ascenso a la Primera División de la VPN.',
      'Fue una temporada de entrega, trabajo y colectivo. El equipo demostró carácter en los momentos clave y supo imponerse ante rivales de mucho nivel para hacerse merecedor de este logro.',
      'El festejo no tardó en llegar. Los jugadores celebraron el hito con la alegría y la emoción que merece un logro de esta magnitud. Las imágenes del festejo quedaron grabadas en la memoria del club.',
      'A partir de esta temporada, Top Secret FC competirá en la élite del fútbol virtual argentino. El desafío es enorme, pero la base está construida: un plantel comprometido, una identidad clara y una hinchada que acompaña.',
      '¡Arriba Top Secret FC! ¡Primera División!',
    ],
    shareCaption: '🏆 ¡ASCENDIMOS A PRIMERA DIVISIÓN! 🏆\n\nTop Secret FC acaba de lograr uno de los hitos más importantes de su historia. Campaña perfecta, equipo comprometido, resultado histórico.\n\n¡A la Primera División de la VPN! 🖤⭐\n\n#TopSecretFC #VPN #PrimeraDivision #Ascenso #EAFCClubsPro',
    shareCaptions: {
      ig: '🏆 ¡ASCENDIDOS A PRIMERA DIVISIÓN! 🏆\n\nCampaña histórica. Equipo comprometido. Un resultado que quedará para siempre en la memoria del club 🖤⭐\n\n#TopSecretFC #VPN #PrimeraDivision #Ascenso #EAFCClubsPro',
      x:  '🏆 ¡Top Secret FC asciende a Primera División VPN!\n\nCampaña histórica. Gracias a todos los que acompañaron 🖤⭐\n\n#TopSecretFC #VPN #PrimeraDivision #Ascenso',
      fb: '🏆 ¡ASCENDIDOS A PRIMERA DIVISIÓN! 🏆\n\nTop Secret FC logró el ascenso a la Primera División de la VPN tras una campaña histórica. Un resultado que quedará para siempre en la historia del club.\n\nGracias a cada jugador, cada entrenamiento y cada partido. Este logro es de todos. ¡Arriba Top Secret FC!\n\n#TopSecretFC #VPN #PrimeraDivision #Ascenso #EAFCClubsPro',
    },
  },
];
