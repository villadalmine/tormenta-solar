// historia.js — GENERADO por tools/gen-historia.mjs (NO editar a mano).
// Ensamblado desde los bloques ```hist de specs/nivel-1/**/*.md. Ver specs/nivel-1/historia-grafo.md.
// Capa aditiva (typeof Historia guard). Fase 1: el grafo SOLO DESCRIBE; game.js sigue dueño de los flags.
const Historia = {
  "edges": [
    {
      "id": "edificio",
      "title": "Abrir el edificio abandonado",
      "title_en": "Open the abandoned building",
      "at": "calle",
      "pre": {},
      "sets": {
        "borrachosHappy": true
      },
      "hints": {
        "es": [
          "Hay tres que no se mueven de esa puerta... algo querrán los muchachos, ¿no?",
          "A los tres borrachines los abrís con la panza: cada uno quiere algo distinto de comer/tomar.",
          "Conseguí en el super: una Diosa Tropical, un fiambre y un pedazo de carne; dale uno a cada borrachín.",
          "¡Que les LLEVES la Diosa, el fiambre y la carne a los tres borrachines, y te abren el edificio! Listo."
        ],
        "en": [
          "There's three that won't budge from that door... the fellas want something, don't they?",
          "You open the three drunks through the belly: each one wants something different to eat or drink.",
          "Get from the supermarket: a Diosa Tropical, some cold cuts and a chunk of meat; give one to each drunk.",
          "BRING the Diosa, the cold cuts and the meat to the three drunks and they open the building! Done."
        ]
      },
      "from": "specs/nivel-1/personajes/borrachines.md"
    },
    {
      "id": "cuevero_gate",
      "title": "Destrabar al cuevero (desbaratar al tahúr)",
      "title_en": "Unblock the money changer (bust the card sharp)",
      "at": "cueva",
      "npc": "tahur",
      "pre": {},
      "sets": {
        "cueveroUnlocked": true
      },
      "hints": {
        "es": [
          "El del fondo anda raro, con dramas... no te va a cambiar así nomás, pibe.",
          "El cuevero está ocupado con el tahúr: hasta que ese no se calme, no hay deal.",
          "Ganale al TAHÚR en el truco (vos, o mandá a alguien que sepa) y el cuevero te perdona y te vende.",
          "¡Andá a la trastienda, DESBARATÁ al tahúr en el truco y recién ahí el cuevero te cambia, dale!"
        ],
        "en": [
          "The back guy's off, got drama... he won't change for you just like that, kid.",
          "The cuevero's busy with the card sharp: until that calms down, no deal.",
          "Beat the SHARP at truco (yourself, or send someone who knows) and the cuevero forgives you and sells.",
          "Go to the back room, TAKE DOWN the sharp at truco and ONLY THEN the cuevero changes your money!"
        ]
      },
      "from": "specs/nivel-1/personajes/cueveros.md"
    },
    {
      "id": "tormenta",
      "title": "Disparar la tormenta solar",
      "title_en": "Trigger the solar storm",
      "at": "cueva",
      "pre": {
        "cueveroUnlocked": true
      },
      "sets": {
        "stormed": true
      },
      "hints": {
        "es": [
          "El verde se compra abajo, donde no llega el sol... pero el sol igual te encuentra, pibe.",
          "Ya destrabaste al cuevero: ahora SÍ te cambia. El negocio de verdad está en la del fondo.",
          "Andá a la cueva del fondo y cambiale los dólares al arbolito: ahí arranca TODO.",
          "¡Que bajes a la CUEVA DEL FONDO y CAMBIES, carajo! ¿Te lo dibujo?"
        ],
        "en": [
          "The green's bought down below, where the sun don't reach... but the sun finds you anyway, kid.",
          "You unlocked the cuevero: now he DOES change for you. The real deal's in the back one.",
          "Go to the back cueva and change your dollars with the arbolito: that's where it ALL kicks off.",
          "Go DOWN to the BACK CUEVA and CHANGE already, damn it! Want me to draw you a map?"
        ]
      },
      "from": "specs/nivel-1/personajes/cueveros.md"
    },
    {
      "id": "chino_iorio",
      "title": "Abrir el frente del chino con Iorio",
      "title_en": "Open the chino's front with Iorio",
      "at": "cemento",
      "pre": {
        "stormed": true
      },
      "sets": {
        "chinoFrontOpen": true
      },
      "hints": {
        "es": [
          "El frente del chino lo cuidan los ninjas... a menos que suene algo que los haga rajar al pogo.",
          "En Cemento hay un metalero que, si lo enganchás, hace irse a los ninjas del chino.",
          "Conseguí FALOPA en los cajones de los pisos de lujo y dásela a Iorio: toca, los ninjas se van.",
          "¡Llevale FALOPA a IORIO en Cemento, toca Pibe Tigre, los ninjas se van al recital y entrás al chino!"
        ],
        "en": [
          "The corner shop's front is guarded by ninjas... unless something plays that sends them to the pit.",
          "At Cemento there's a metalhead who, if you hook him up, makes the shop's ninjas leave.",
          "Get GEAR from the drawers in the luxury floors and give it to Iorio: he plays, the ninjas clear out.",
          "Bring GEAR to IORIO at Cemento, he plays Pibe Tigre, the ninjas head to the gig and you get into the shop!"
        ]
      },
      "from": "specs/nivel-1/personajes/iorio.md"
    },
    {
      "id": "bunker",
      "title": "Ganarte el búnker (gurú de los linyeras)",
      "title_en": "Earn the bunker (the bums' guru)",
      "at": "edificio",
      "sala": "piso 19",
      "pre": {
        "borrachosHappy": true
      },
      "sets": {
        "bunkerUnlocked": true
      },
      "hints": {
        "es": [
          "Adentro del edificio, los monos miran. Tres monitos que no ven, no oyen, no hablan...",
          "Subí el edificio: arriba hay algo de Monkey Island que a los linyeras los vuelve locos.",
          "En un piso alto está el TÓTEM de 3 monos. Robalo y 20 linyeras te hacen gurú: se abre el búnker.",
          "¡Que SUBAS y AFANES el TÓTEM de los 3 monos! Te consagran gurú y se abre el búnker, dale."
        ],
        "en": [
          "Inside the building, the monkeys watch. Three little monkeys that see no, hear no, speak no...",
          "Go up the building: up top there's a Monkey Island thing the bums go crazy for.",
          "On an upper floor there's the 3-monkey TOTEM. Swipe it and 20 bums crown you guru: the bunker opens.",
          "GO UP and SWIPE the 3-monkey TOTEM! They crown you guru and the bunker opens, come on."
        ]
      },
      "from": "specs/nivel-1/personajes/linyeras.md"
    },
    {
      "id": "loop",
      "title": "Dormir en el catre del búnker (pasar un día, reponer)",
      "title_en": "Sleep on the bunker cot (pass a day, recover)",
      "sala": "búnker",
      "at": "bunker",
      "pri": 24,
      "pre": {
        "bunkerUnlocked": true,
        "stormed": true
      },
      "sets": {
        "sleptOnce": true
      },
      "hints": {
        "es": [
          "Cuando el cuerpo no da más, hasta un gurú necesita un catre seguro para ver otro día...",
          "En el búnker hay un catre: dormir ahí te hace pasar el día y reponer un poco.",
          "Tocá el CATRE del búnker (E) para dormir: pasás un día del loop, te llenás la vida y se repone la falopa.",
          "¡Tirate a dormir en el CATRE del búnker! Pasás el día, recuperás vida y volvés a tener con qué seguir."
        ],
        "en": [
          "When the body's done, even a guru needs a safe cot to see another day...",
          "In the bunker there's a cot: sleeping there passes the day and restocks you a bit.",
          "Touch the bunker COT (E) to sleep: you pass a loop day, refill your life and the gear comes back.",
          "Go lie down on the bunker COT! You pass the day, get your life back and have stuff to keep going."
        ]
      },
      "from": "specs/nivel-1/personajes/linyeras.md"
    },
    {
      "id": "tesoro",
      "title": "El TESORO de los linyeras (premio del gurú)",
      "title_en": "The bums' TREASURE (the guru's prize)",
      "at": "edificio",
      "sala": "búnker",
      "pre": {
        "bunkerUnlocked": true
      },
      "sets": {
        "tesoroTaken": true
      },
      "hints": {
        "es": [
          "Dicen que los linyeras le guardan un premio a su gurú, bien abajo de todo.",
          "Cuando seas gurú, bajá al búnker: hay algo guardado que suena a madera y cuerdas.",
          "En el búnker te espera el TESORO de los linyeras: plata, munición y una viola que da risa.",
          "¡Sos gurú! Bajá al BÚNKER y reclamá el TESORO: monedas, balas y la VIOLA de Les Luthiers. 🎸"
        ],
        "en": [
          "They say the bums keep a prize for their guru, way down below.",
          "Once you're guru, go down to the bunker: something stashed there sounds like wood and strings.",
          "The bums' TREASURE waits in the bunker: cash, ammo and a guitar that makes people laugh.",
          "You're the guru! Go DOWN to the BUNKER and claim the TREASURE: coins, ammo and the Les Luthiers GUITAR. 🎸"
        ]
      },
      "from": "specs/nivel-1/personajes/linyeras.md"
    },
    {
      "id": "fifa",
      "title": "Ganar el torneo de FIFA 98 (con la Mega Drive)",
      "title_en": "Win the FIFA 98 tournament (with the Mega Drive)",
      "at": "arcade",
      "pri": 21,
      "pre": {
        "hasMegaDrive": true
      },
      "sets": {
        "fifaWon": true
      },
      "hints": {
        "es": [
          "Hay un flaco en el fondo del arcade que solo juega si le traés su consola...",
          "Al del TRUCOTRON le pica el FIFA: con la consola justa, te arma un torneo.",
          "Llevá la Mega Drive al TRUCOTRON del arcade y ganale el torneo de FIFA 98: +30 monedas.",
          "¡Enchufá la MEGA DRIVE en el TRUCOTRON y GANÁ el FIFA 98! Te llevás 30 monedas, listo."
        ],
        "en": [
          "There's a guy in the back of the arcade who'll only play if you bring him his console...",
          "The TRUCOTRON guy's itching for FIFA: with the right console he sets up a tournament.",
          "Take the Mega Drive to the TRUCOTRON at the arcade and win the FIFA 98 tournament: +30 coins.",
          "Plug the MEGA DRIVE into the TRUCOTRON and WIN FIFA 98! You pocket 30 coins, done."
        ]
      },
      "from": "specs/nivel-1/personajes/npcs-arcade.md"
    },
    {
      "id": "truco",
      "title": "Ganarle al tahúr (puerta al chino)",
      "title_en": "Beat the card sharp (door to the chino)",
      "at": "arcade",
      "pre": {},
      "sets": {
        "trucoWon": true
      },
      "hints": {
        "es": [
          "Atrás del arcade timbean. El que gana una de truco se gana algo más que el pozo...",
          "Hay una trastienda donde un tahúr juega al truco; ganarle abre un atajo.",
          "Ganale al tahúr en el truco (1/2/3 carta, T truco, V envido): se abre una puerta directa al chino.",
          "¡Andá a la trastienda, GANALE EL TRUCO al tahúr y cruzás derecho al chino! Eso."
        ],
        "en": [
          "Behind the arcade they gamble. Whoever wins a game of truco wins more than the pot...",
          "There's a back room where a card sharp plays truco; beating him opens a shortcut.",
          "Beat the card sharp at truco (1/2/3 card, T truco, V envido): a door straight to the shop opens.",
          "Go to the back room, BEAT the sharp at TRUCO and you cut straight to the corner shop! There."
        ]
      },
      "from": "specs/nivel-1/personajes/tahur.md"
    },
    {
      "id": "vecino",
      "title": "Pasar a un edificio clausurado (el vecino)",
      "title_en": "Get into a condemned building (the neighbor)",
      "at": "calle",
      "pri": 30,
      "pre": {
        "stormed": true
      },
      "sets": {
        "vecinoSeen": true
      },
      "terminal": true,
      "hints": {
        "es": [
          "Esos tipos parados al lado de los edificios tapiados... algo saben, y se mueren por contarlo.",
          "Al lado de cada edificio clausurado hay un vecino: te cuenta historias del lugar si le das charla.",
          "Hablale al VECINO de un edificio clausurado: te flashea historias y te deja PASAR a ver qué pasó.",
          "¡Andá a un edificio tapiado, hablale al VECINO y PASÁ! Adentro hay un nivel armado con su historia."
        ],
        "en": [
          "Those guys standing by the boarded-up buildings... they know something, and they're dying to tell it.",
          "By each condemned building there's a neighbor: he tells you stories of the place if you chat him up.",
          "Talk to the NEIGHBOR of a condemned building: he flashes stories and lets you GO IN to see what happened.",
          "Go to a boarded-up building, talk to the NEIGHBOR and GO IN! Inside there's a level built from his story."
        ]
      },
      "from": "specs/nivel-1/personajes/vecino.md"
    },
    {
      "id": "armas",
      "title": "Comprar fierro criollo (con la tormenta, las eléctricas no andan)",
      "title_en": "Buy criollo steel (with the storm, electric guns don't work)",
      "at": "galeria",
      "pri": 23,
      "pre": {
        "stormed": true
      },
      "sets": {
        "armado": true
      },
      "hints": {
        "es": [
          "Con la luz cortada, lo eléctrico no sirve. Hay un misterioso que tiene fierro de otra época...",
          "En la galería hay un tipo que, con la tormenta, vende armas que SÍ funcionan sin luz.",
          "Hablá con el misterioso de la galería y comprale fierro criollo (rebenque/facón/FAL): +munición +vida.",
          "¡Andá al misterioso de la GALERÍA y comprá el FIERRO CRIOLLO! Te suma munición y vida, dale."
        ],
        "en": [
          "With the power down, electric stuff is useless. There's a mysterious guy with old-school iron...",
          "In the gallery there's a guy who, with the storm, sells weapons that DO work without power.",
          "Talk to the mysterious guy in the gallery and buy criollo steel (whip/facón/FAL): +ammo +life.",
          "Go to the mysterious guy in the GALLERY and buy the CRIOLLO STEEL! It adds ammo and life, come on."
        ]
      },
      "from": "specs/nivel-1/personajes/vendedor-armas.md"
    },
    {
      "id": "portal",
      "title": "Escapar por el portal (fin del nivel)",
      "title_en": "Escape through the portal (end of level)",
      "at": "cambio",
      "pre": {
        "stormed": true
      },
      "sets": {
        "won": true
      },
      "terminal": true,
      "hints": {
        "es": [
          "Cuando todo se apague, la salida está donde antes no entrabas ni en pedo.",
          "Con la tormenta, la Casa de Cambio Oficial se vacía y adentro pasa algo raro al fondo.",
          "Post-tormenta, metete en la Casa de Cambio Oficial: al fondo se abre el PORTAL. Tocalo.",
          "¡Después de la tormenta, ENTRÁ A LA CASA DE CAMBIO y TOCÁ EL PORTAL del fondo para salir del nivel!"
        ],
        "en": [
          "When everything goes dark, the way out is where you couldn't get in before for the life of you.",
          "With the storm, the Official Exchange House empties and something weird happens in the back.",
          "After the storm, get into the Official Exchange House: a PORTAL opens in the back. Touch it.",
          "After the storm, GO INTO THE EXCHANGE HOUSE and TOUCH THE PORTAL in the back to leave the level!"
        ]
      },
      "from": "specs/nivel-1/edificios/casa-de-cambio-oficial.md"
    },
    {
      "id": "cemento_ticket",
      "title": "Conseguir la entrada a Cemento (en la disquería)",
      "title_en": "Get the Cemento ticket (at the record store)",
      "at": "cueva",
      "pri": 22,
      "pre": {},
      "sets": {
        "hasCementoTicket": true
      },
      "hints": {
        "es": [
          "Abajo, entre vinilos, hay un punk que regala lo que vos necesitás para ver a los pesados...",
          "En la disquería de la cueva, el punk del mostrador da una entrada a un recital.",
          "Comprale un disco al punk de la disquería: te regala la ENTRADA A CEMENTO (donde toca Iorio).",
          "¡Andá a la disquería, comprale al PUNK y te da la ENTRADA A CEMENTO para llegar a Iorio, dale!"
        ],
        "en": [
          "Down among the vinyl there's a punk who gives away just what you need to see the heavy guys...",
          "At the record shop in the cueva, the punk at the counter hands out a gig ticket.",
          "Buy a record from the record-shop punk: he gives you the CEMENTO TICKET (where Iorio plays).",
          "Go to the record shop, buy from the PUNK and he gives you the CEMENTO TICKET to reach Iorio!"
        ]
      },
      "from": "specs/nivel-1/edificios/cuevas-del-dolar.md"
    },
    {
      "id": "megadrive",
      "title": "Comprar una Mega Drive (para el torneo de FIFA)",
      "title_en": "Buy a Mega Drive (for the FIFA tournament)",
      "at": "super",
      "pri": 20,
      "pre": {},
      "sets": {
        "hasMegaDrive": true
      },
      "hints": {
        "es": [
          "Hay un torneo esperando una maquinita que ya nadie usa... ¿no la viste en alguna góndola?",
          "En el super chino, en la sección CONSOLAS, hay algo que sirve para un torneo del arcade.",
          "Comprale al chino una MEGA DRIVE (sección CONSOLAS) y llevala al TRUCOTRON del arcade para el FIFA.",
          "¡Que compres la MEGA DRIVE en el super (CONSOLAS) y la lleves al arcade para el torneo de FIFA, dale!"
        ],
        "en": [
          "There's a tournament waiting on a little machine nobody uses anymore... seen it on a shelf?",
          "At the Chinese supermarket, in the CONSOLES aisle, there's something for an arcade tournament.",
          "Buy a MEGA DRIVE from the Chino (CONSOLES aisle) and take it to the TRUCOTRON at the arcade for the FIFA.",
          "Buy the MEGA DRIVE at the supermarket (CONSOLES) and take it to the arcade for the FIFA tournament!"
        ]
      },
      "from": "specs/nivel-1/edificios/super-chino.md"
    },
    {
      "id": "chino_back",
      "title": "Entrar al chino por la puerta trasera (desde la cueva)",
      "title_en": "Enter the chino through the back door (from the cave)",
      "at": "cueva",
      "pre": {
        "stormed": true,
        "chinoFrontOpen": false
      },
      "sets": {
        "chinoEntered": true
      },
      "hints": {
        "es": [
          "El frente del chino está cerrado a cal y canto... pero los negocios siempre tienen otra puerta.",
          "Hay una entrada de servicio al chino, abajo, al fondo de la cueva. No por la calle.",
          "En la cueva, andá hasta el FONDO a la derecha: ahí hay una puerta trasera al chino.",
          "¡Metete por la PUERTA TRASERA del chino, al fondo de la CUEVA a la derecha! No hace falta Iorio."
        ],
        "en": [
          "The shop's front is shut tight... but businesses always have another door.",
          "There's a service entrance to the shop down in the back of the cueva. Not from the street.",
          "In the cueva, head all the way to the BACK on the right: there's a back door into the shop.",
          "Go in through the shop's BACK DOOR, at the far right of the CUEVA! You don't need Iorio."
        ]
      },
      "from": "specs/nivel-1/edificios/super-chino.md"
    },
    {
      "id": "sube_tarjeta",
      "title": "Conseguir una tarjeta SUBE (un linyera tiene una)",
      "title_en": "Get a SUBE card (a bum has one)",
      "at": "calle",
      "pre": {
        "subeSeen": true
      },
      "sets": {
        "subeGot": true
      },
      "hints": {
        "es": [
          "El tótem del chino se quedó sin tarjetas... alguien por acá seguro tiene una tirada.",
          "Los linyeras viajan de arriba o caminan: alguno tendrá una SUBE que ya no usa.",
          "Preguntale a un LINYERA por una tarjeta SUBE: te la regala, total ellos no la usan.",
          "¡Chamuyá a un LINYERA y pedile la tarjeta SUBE! Te la da de una, dale."
        ],
        "en": [
          "The chino's totem ran out of cards... someone around here surely has one lying around.",
          "The bums ride for free or walk: one of them must have a SUBE they don't use.",
          "Ask a BUM for a SUBE card: he'll give you his, they don't use it anyway.",
          "Chat up a BUM and ask for the SUBE card! He hands it over, come on."
        ]
      },
      "from": "specs/nivel-1/edificios/super-chino.md"
    },
    {
      "id": "sube_carga",
      "title": "Cargar la SUBE en el tótem del chino",
      "title_en": "Top up the SUBE at the chino's totem",
      "at": "super",
      "pre": {
        "subeGot": true
      },
      "sets": {
        "subeReady": true
      },
      "terminal": true,
      "hints": {
        "es": [
          "Ya tenés la tarjeta... pero sin saldo no vas a ningún lado.",
          "Volvé al TÓTEM del chino: ahora que tenés la SUBE, te la carga.",
          "En el super chino, andá al TÓTEM RECARGA SUBE y cargale $10 a tu tarjeta.",
          "¡Volvé al TÓTEM del chino y cargá la SUBE ($10)! Queda lista para el subte."
        ],
        "en": [
          "You've got the card now... but with no balance you're going nowhere.",
          "Back to the chino's TOTEM: now that you have the SUBE, it'll top it up.",
          "At the Chinese supermarket, go to the SUBE RECHARGE TOTEM and load $10 onto your card.",
          "Back to the chino's TOTEM and top up the SUBE ($10)! Ready for the subte."
        ]
      },
      "from": "specs/nivel-1/edificios/super-chino.md"
    },
    {
      "id": "tigre_clasico",
      "title": "El clásico suspendido: Tigre-Dálmine 1-1 y las hinchadas JUNTAS",
      "title_en": "The abandoned derby: Tigre-Dálmine 1-1 and the two crowds UNITED",
      "at": "plaza",
      "pre": {
        "nivel2Win": true
      },
      "sets": {
        "tigreClasico": true
      },
      "terminal": true,
      "hints": {
        "es": [
          "Dicen que hay un partido que termina sin terminar.",
          "El tren MITRE (desde Retiro) llega a TIGRE. En Victoria queda la cancha.",
          "En el andén de Tigre hay una SALIDA a la cancha: juegan Tigre y Villa Dálmine.",
          "Salí del andén de Tigre a la CANCHA [E]: gritá el empate… y mirá lo que pasa con las hinchadas."
        ],
        "en": [
          "They say there's a match that ends without ending.",
          "The MITRE train (from Retiro) reaches TIGRE. The stadium is in Victoria.",
          "Tigre's platform has an EXIT to the stadium: Tigre vs Villa Dálmine are playing.",
          "Leave Tigre's platform for the STADIUM [E]: shout the equalizer… and watch what the crowds do."
        ]
      },
      "from": "specs/nivel-1/lugares/andenes-vivos.md"
    },
    {
      "id": "ezeiza_ascenso",
      "title": "El ascenso en Ezeiza: Dálmine le gana a Tristán Suárez → Nacional B",
      "title_en": "Promotion at Ezeiza: Dálmine beats Tristán Suárez → Nacional B",
      "at": "plaza",
      "pre": {
        "nivel2Win": true
      },
      "sets": {
        "ezeizaAscenso": true
      },
      "terminal": true,
      "hints": {
        "es": [
          "Hay una final que se juega lejos, donde los aviones pasan bajito.",
          "El tren ROCA (desde Constitución) llega a EZEIZA. Ahí es local el Lechero: Tristán Suárez.",
          "En el andén de Ezeiza hay una SALIDA al estadio: se juega la FINAL por el ascenso.",
          "Salí del andén de Ezeiza al ESTADIO [E]: gritá el gol y aguantá el final — Dálmine a la NACIONAL B."
        ],
        "en": [
          "There's a final played far away, where the planes fly low.",
          "The ROCA train (from Constitución) reaches EZEIZA. Home of el Lechero: Tristán Suárez.",
          "Ezeiza's platform has an EXIT to the stadium: the promotion FINAL is on.",
          "Leave Ezeiza's platform for the STADIUM [E]: shout the goal and hold on — Dálmine up to NACIONAL B."
        ]
      },
      "from": "specs/nivel-1/lugares/andenes-vivos.md"
    },
    {
      "id": "laplata_mapa",
      "title": "La Plata: las diagonales de Campana y el mapa de la extorsión (1882)",
      "title_en": "La Plata: Campana's diagonals and the map of the 1882 extortion",
      "at": "plaza",
      "pre": {
        "nivel2Win": true
      },
      "sets": {
        "laplataMapa": true
      },
      "hints": {
        "es": [
          "Hay una ciudad que es el espejo de otra, y un papel viejo que explica por qué.",
          "El tren ROCA (desde Constitución) llega a LA PLATA. Mirá bien el trazado de la ciudad…",
          "Las DIAGONALES de La Plata son iguales a las de Campana. En la CATEDRAL guardan el mapa original.",
          "Salí del andén de La Plata [E], mirá el plano de las diagonales y bajá a la cripta de la CATEDRAL: el MAPA de 1882 cuenta la verdad de la votación."
        ],
        "en": [
          "There's a city that mirrors another, and an old paper that explains why.",
          "The ROCA train (from Constitución) reaches LA PLATA. Look closely at the city's layout…",
          "La Plata's DIAGONALS match Campana's. The CATHEDRAL keeps the original map.",
          "Leave La Plata's platform [E], study the diagonals plan and descend to the CATHEDRAL crypt: the 1882 MAP tells the truth about the vote."
        ]
      },
      "from": "specs/nivel-1/lugares/andenes-vivos.md"
    },
    {
      "id": "mapa_tano",
      "title": "El mapa al Tano: la leyenda del barrio era CIERTA",
      "title_en": "The map to el Tano: the neighborhood legend was TRUE",
      "at": "plaza",
      "pre": {
        "laplataMapa": true
      },
      "sets": {
        "mapaTano": true
      },
      "hints": {
        "es": [
          "Hay un viejo que escuchó esa historia toda la vida, y nadie le creía.",
          "El mapa de 1882 prueba lo que en Campana se contaba de padre a hijo. Llevalo a Campana.",
          "El TANO, en la calle del estadio de Campana, tiene que ver el mapa: su viejo lo contaba.",
          "Con el mapa 🗺️ encima, apretá [E] frente al TANO en Campana: mostrale la prueba."
        ],
        "en": [
          "There's an old man who heard that story all his life, and nobody believed him.",
          "The 1882 map proves what Campana passed down father to son. Take it to Campana.",
          "El TANO, on Campana's stadium street, must see the map: his father used to tell it.",
          "With the map 🗺️ on you, press [E] in front of el TANO in Campana: show him the proof."
        ]
      },
      "from": "specs/nivel-1/lugares/andenes-vivos.md"
    },
    {
      "id": "mapa_marco",
      "title": "El mapa enmarcado en la sede: CAMPANA CAPITAL, a la vista de todos",
      "title_en": "The map framed at the clubhouse: CAMPANA CAPITAL, for all to see",
      "at": "plaza",
      "pre": {
        "mapaTano": true
      },
      "sets": {
        "mapaMarco": true
      },
      "terminal": true,
      "hints": {
        "es": [
          "Hay un marco vacío que espera hace años.",
          "El Tano guarda un marco vacío en la sede, al lado de la vitrina. Ahora sabés para qué era.",
          "El mapa de 1882 va al MARCO de la sede de Villa Dálmine, al lado de la vitrina del trofeo.",
          "Con la bendición del Tano, apretá [E] en el MARCO de la sede: colgá la verdad del pueblo."
        ],
        "en": [
          "There's an empty frame that has been waiting for years.",
          "El Tano keeps an empty frame at the clubhouse, next to the trophy case. Now you know what for.",
          "The 1882 map goes in the clubhouse FRAME at Villa Dálmine, next to the trophy case.",
          "With el Tano's blessing, press [E] at the clubhouse FRAME: hang the town's truth."
        ]
      },
      "from": "specs/nivel-1/lugares/andenes-vivos.md"
    },
    {
      "id": "piquete_juegos",
      "title": "Ganar los 5 mini-juegos del piquete",
      "title_en": "Win the 5 picket mini-games",
      "at": "calle",
      "pre": {},
      "sets": {
        "piqueteCampeon": true
      },
      "hints": {
        "es": [
          "Dicen que a la izquierda de la esquina hay fiesta, fuego y juegos… y un premio para el que gane TODO.",
          "En el piquete de Lavalle hay 5 desafíos (el corte, la soga, el bombo, la olla, la pancarta). Ganalos.",
          "Doblá a la IZQUIERDA en la calle → el piquete. Ganá los 5 mini-juegos ([E] en la barricada, abajo a los costados, la olla y la derecha).",
          "¡Andá a LAVALLE (borde izquierdo de la calle) y GANÁ LOS 5 MINI-JUEGOS del piquete! Cada punto con [E]: corte, soga, bombo, olla y pancarta."
        ],
        "en": [
          "They say left of the corner there's a party, fire and games… and a prize for whoever wins it ALL.",
          "The Lavalle picket has 5 challenges (the blockade, the tug, the drum, the pot, the banner). Win them.",
          "Turn LEFT on the street → the picket. Win the 5 mini-games ([E] at the barricade, bottom sides, the pot and the right).",
          "GO TO LAVALLE (left edge of the street) and WIN THE 5 MINI-GAMES! Each spot with [E]: blockade, tug, drum, pot and banner."
        ]
      },
      "from": "specs/nivel-1/lugares/lavalle-quest.md"
    },
    {
      "id": "piquete_juramento",
      "title": "El juramento al General (se abre la barricada)",
      "title_en": "The oath to the General (the barricade opens)",
      "at": "lavalle",
      "pre": {
        "piqueteCampeon": true
      },
      "sets": {
        "juramento": true
      },
      "hints": {
        "es": [
          "Ganaste todo… y ahora la barricada tiene un hueco que brilla. Alguien espera una palabra tuya.",
          "El piquete te reconoce: subí al hueco del corte. El linyera peronista tiene una pregunta para vos.",
          "Subí al HUECO de la barricada (arriba, centro) y apretá [E]: el juramento de lealtad al General.",
          "¡Andá al HUECO del corte (arriba al centro del piquete) y apretá [E] para JURAR! Arranca la Marcha y se abre el paso."
        ],
        "en": [
          "You won it all… now the barricade has a glowing gap. Someone awaits a word from you.",
          "The picket knows you: go up to the gap. The Peronist hobo has a question for you.",
          "Go up to the GAP in the barricade (top center) and press [E]: the oath of loyalty to the General.",
          "GO TO THE GAP (top center of the picket) and press [E] to SWEAR! The March plays and the way opens."
        ]
      },
      "from": "specs/nivel-1/lugares/lavalle-quest.md"
    },
    {
      "id": "obelisco_llegada",
      "title": "Cruzar el corte: la Plaza de la República",
      "title_en": "Cross the picket line: Plaza de la República",
      "at": "lavalle",
      "pre": {
        "juramento": true
      },
      "sets": {
        "obeliscoLlegado": true
      },
      "hints": {
        "es": [
          "Del otro lado del corte, algo enorme y blanco toca el cielo.",
          "El paso está abierto: seguí derecho por el hueco, hacia arriba.",
          "Cruzá el HUECO de la barricada caminando hacia ARRIBA: llegás a la Plaza de la República, al pie del Obelisco.",
          "¡SUBÍ por el hueco del corte y CRUZÁ! Del otro lado te espera el OBELISCO (y hablá con el cuidador)."
        ],
        "en": [
          "On the other side of the blockade, something huge and white touches the sky.",
          "The way is open: go straight through the gap, upward.",
          "Cross the barricade GAP walking UP: you reach Plaza de la República, at the foot of the Obelisk.",
          "GO UP through the gap and CROSS! The OBELISK awaits on the other side (talk to the keeper)."
        ]
      },
      "from": "specs/nivel-1/lugares/lavalle-quest.md"
    },
    {
      "id": "satelite_herido",
      "title": "Herir al satélite rebelde (el rayo solar)",
      "title_en": "Wound the rogue satellite (the solar ray)",
      "at": "lavalle",
      "pre": {
        "obeliscoLlegado": true,
        "stormed": true
      },
      "sets": {
        "sateliteHerido": true
      },
      "hints": {
        "es": [
          "El cuidador lo dijo: cuando la tormenta pegue de nuevo, acá pasa algo grande. Mirá el cielo.",
          "Con la TORMENTA activa, volvé al Obelisco: el puntito rojo ya no está tan lejos…",
          "Post-tormenta, cruzá el corte de nuevo: el SATÉLITE bajó. Esquivá su rayo rojo y devolvele con [E].",
          "¡Con la tormenta ACTIVA andá al OBELISCO y PELEÁ: esquivá el rayo rojo telegrafiado y fritalo con [E], el RAYO SOLAR!"
        ],
        "en": [
          "The keeper said it: when the storm hits again, something big happens here. Watch the sky.",
          "With the STORM active, return to the Obelisk: the red dot isn't so far anymore…",
          "Post-storm, cross the blockade again: the SATELLITE came down. Dodge its red beam and fire back with [E].",
          "With the storm ACTIVE go to the OBELISK and FIGHT: dodge the telegraphed red beam and fry it with [E], the SOLAR RAY!"
        ]
      },
      "from": "specs/nivel-1/lugares/lavalle-quest.md"
    },
    {
      "id": "plaza_llegada",
      "title": "Llegar a Plaza de Mayo (el Nivel 2)",
      "title_en": "Reach Plaza de Mayo (Level 2)",
      "at": "lavalle",
      "pre": {
        "sateliteHerido": true
      },
      "sets": {
        "enPlaza": true
      },
      "hints": {
        "es": [
          "Con el satélite herido, la muchachada te manda a la Casa Rosada… ¿cómo llegás?",
          "Apareció una boca de subte en el piquete: bajá y viajá.",
          "En el piquete hay una BOCA DE SUBTE (Línea C). Bajá, viajá hasta CATEDRAL y salís en Plaza de Mayo.",
          "¡Bajá al SUBTE en el piquete, viajá a CATEDRAL (Línea D) y aparecés en PLAZA DE MAYO — el Nivel 2!"
        ],
        "en": [
          "With the satellite wounded, the crowd sends you to the Casa Rosada… how do you get there?",
          "A subte entrance appeared in the picket: go down and travel.",
          "There's a SUBTE ENTRANCE in the picket (Line C). Go down, ride to CATEDRAL and come up at Plaza de Mayo.",
          "Take the SUBTE at the picket, ride to CATEDRAL (Line D) and you arrive at PLAZA DE MAYO — Level 2!"
        ]
      },
      "from": "specs/nivel-1/lugares/lavalle-quest.md"
    },
    {
      "id": "escarapela",
      "title": "Repicar la campana del Cabildo → la escarapela (French & Beruti)",
      "title_en": "Ring the Cabildo bell → the cockade (French & Beruti)",
      "at": "plaza",
      "pre": {
        "enPlaza": true
      },
      "sets": {
        "escarapela": true
      },
      "hints": {
        "es": [
          "En la Plaza de Mayo, el CABILDO (oeste) guarda algo del 25 de Mayo de 1810.",
          "Entrá al Cabildo y tocá la CAMPANA de la torre.",
          "Al repicar caen ESCARAPELAS celestes y blancas — agarrá una.",
          "Con la escarapela, al salir aparecen los granaderos y DOMINGO FRENCH y ANTONIO BERUTI: hablales [E] (te cuentan de Mayo de 1810)."
        ],
        "en": [
          "At Plaza de Mayo, the CABILDO (west) holds something from May 25th, 1810.",
          "Enter the Cabildo and ring the tower BELL.",
          "As it rings, blue-and-white COCKADES fall — grab one.",
          "With the cockade, on your way out the grenadiers appear with DOMINGO FRENCH and ANTONIO BERUTI: talk to them [E] (they tell you about May 1810)."
        ]
      },
      "from": "specs/nivel-1/lugares/lavalle-quest.md"
    },
    {
      "id": "sanmartin_chip",
      "title": "Conseguir el CHIP del Libertador (tumba de San Martín)",
      "title_en": "Get the Liberator's CHIP (San Martín's tomb)",
      "at": "plaza",
      "pre": {
        "enPlaza": true
      },
      "sets": {
        "sanmartinChip": true
      },
      "hints": {
        "es": [
          "En Plaza de Mayo, la IA tomó el satélite. ¿Con qué la volteás?",
          "Una Madre te dijo: solo el CHIP DE SAN MARTÍN puede activar la Pirámide.",
          "Entrá a la CATEDRAL (norte de la plaza): adentro está la TUMBA DE SAN MARTÍN.",
          "En la tumba de San Martín, caminá hasta el sarcófago y [E]: tomá el CHIP AI DEL LIBERTADOR."
        ],
        "en": [
          "At Plaza de Mayo, the AI seized the satellite. What can take it down?",
          "A Mother told you: only SAN MARTÍN'S CHIP can power the Pyramid.",
          "Enter the CATHEDRAL (north of the plaza): San Martín's TOMB is inside.",
          "In San Martín's tomb, walk up to the sarcophagus and [E]: take the LIBERATOR'S AI CHIP."
        ]
      },
      "from": "specs/nivel-1/lugares/lavalle-quest.md"
    },
    {
      "id": "nivel2_liberacion",
      "title": "Armar la Pirámide → liberación sanmartiniana (ganar el Nivel 2)",
      "title_en": "Arm the Pyramid → San Martín liberation (win Level 2)",
      "at": "plaza",
      "pre": {
        "sanmartinChip": true
      },
      "sets": {
        "nivel2Win": true,
        "lineaC": true
      },
      "hints": {
        "es": [
          "Tenés el chip del Libertador. ¿Dónde se arma el dispositivo anti-IA?",
          "La PIRÁMIDE DE MAYO (centro de la plaza) es el dispositivo. Llevá el chip ahí.",
          "Parate en la Pirámide y SOSTENÉ [E]: la señal de San Martín tiene que vencer a la IA.",
          "¡Sostené [E] en la Pirámide hasta que el haz suba a los satélites — proceso sanmartiniano de liberación mundial!"
        ],
        "en": [
          "You have the Liberator's chip. Where do you arm the anti-AI device?",
          "The PIRÁMIDE DE MAYO (center of the plaza) is the device. Bring the chip there.",
          "Stand at the Pyramid and HOLD [E]: San Martín's signal must overpower the AI.",
          "Hold [E] at the Pyramid until the beam rises to the satellites — San Martín process of worldwide liberation!"
        ]
      },
      "from": "specs/nivel-1/lugares/lavalle-quest.md"
    },
    {
      "id": "constitucion_llegada",
      "title": "Llegar a la terminal Constitución (Línea C, tren Roca)",
      "title_en": "Reach Constitución terminal (Line C, Roca railway)",
      "at": "plaza",
      "pre": {
        "lineaC": true
      },
      "sets": {
        "enConstitucion": true
      },
      "terminal": true,
      "hints": {
        "es": [
          "Ganaste el Nivel 2: se habilitó la LÍNEA C. Bajá al subte.",
          "En el andén, con la SUBE, abrí el menú de viaje.",
          "Viajá a CONSTITUCIÓN: la escalera de esa estación sube a la terminal del Roca.",
          "Recorré el hall de Constitución: el reloj, los molinetes del tren, los locales (mock por ahora)."
        ],
        "en": [
          "You beat Level 2: LINE C is now open. Head down to the subway.",
          "On the platform, with the SUBE, open the travel menu.",
          "Travel to CONSTITUCIÓN: that station's stairs lead up to the Roca terminal.",
          "Explore the Constitución hall: the clock, the train turnstiles, the shops (mock for now)."
        ]
      },
      "from": "specs/nivel-1/lugares/lavalle-quest.md"
    },
    {
      "id": "retiro_llegada",
      "title": "Llegar a la terminal Retiro (Línea C)",
      "title_en": "Reach Retiro terminal (Line C)",
      "at": "plaza",
      "pre": {
        "lineaC": true
      },
      "sets": {
        "enRetiro": true
      },
      "hints": {
        "es": [
          "La Línea C también va a RETIRO. Bajá al subte y viajá.",
          "En el andén, con la SUBE, abrí el menú de viaje y elegí Retiro.",
          "La escalera de Retiro sube a la terminal del Mitre (bóveda de hierro).",
          "Desde Retiro podés SALIR A LA CALLE: seguí las vías de la San Martín."
        ],
        "en": [
          "Line C also goes to RETIRO. Head down and travel.",
          "On the platform, with the SUBE, open the travel menu and pick Retiro.",
          "Retiro's stairs lead up to the Mitre terminal (iron vault).",
          "From Retiro you can EXIT TO THE STREET: follow the San Martín tracks."
        ]
      },
      "from": "specs/nivel-1/lugares/lavalle-quest.md"
    },
    {
      "id": "villa31_llegada",
      "title": "Llegar a la Villa 31 (por la Línea San Martín)",
      "title_en": "Reach Villa 31 (via the San Martín line)",
      "at": "plaza",
      "pre": {
        "enRetiro": true
      },
      "sets": {
        "enVilla31": true
      },
      "hints": {
        "es": [
          "Salí de Retiro a la calle.",
          "Seguí las vías de la Línea San Martín hacia abajo.",
          "Atrás de Retiro está la VILLA 31 (Barrio Padre Mugica).",
          "Entrá a la Villa 31: hay un comedor popular y la iglesia del Padre Mugica."
        ],
        "en": [
          "Exit Retiro to the street.",
          "Follow the San Martín tracks downward.",
          "Behind Retiro is VILLA 31 (Padre Mugica neighborhood).",
          "Enter Villa 31: there's a soup kitchen and Padre Mugica's church."
        ]
      },
      "from": "specs/nivel-1/lugares/lavalle-quest.md"
    },
    {
      "id": "comedor_contratado",
      "title": "El comedor popular de la Villa 31 te contrata",
      "title_en": "The Villa 31 soup kitchen hires you",
      "at": "plaza",
      "npc": "comedor",
      "pre": {
        "enVilla31": true
      },
      "sets": {
        "comedorHired": true
      },
      "hints": {
        "es": [
          "En la Villa 31, buscá el COMEDOR POPULAR (la olla humeante).",
          "Acercate a la REFERENTE del comedor y apretá [E].",
          "Te contrata para dar una mano en la olla.",
          "Charlá con la referente (y con el CURA de la iglesia del Padre Mugica) — hablan con IA."
        ],
        "en": [
          "In Villa 31, find the SOUP KITCHEN (the steaming pot).",
          "Walk up to the kitchen's community leader and press [E].",
          "She hires you to lend a hand at the pot.",
          "Chat with her (and with the PRIEST at Padre Mugica's church) — they run on AI."
        ]
      },
      "from": "specs/nivel-1/lugares/lavalle-quest.md"
    },
    {
      "id": "comedor_jornada",
      "title": "Servir la jornada del comedor popular",
      "title_en": "Serve a shift at the soup kitchen",
      "at": "plaza",
      "npc": "comedor",
      "pre": {
        "comedorHired": true
      },
      "sets": {
        "comedorJornada": true
      },
      "terminal": true,
      "hints": {
        "es": [
          "Ya te contrataron: ahora hay que servir la olla.",
          "Parate en la OLLA y apretá [E] para agarrar un plato.",
          "Llevale el plato a cada vecino de la COLA y apretá [E].",
          "Serví a todos los vecinos: la referente te paga la changa."
        ],
        "en": [
          "You're hired: now serve the pot.",
          "Stand at the POT and press [E] to grab a plate.",
          "Take the plate to each neighbor in the QUEUE and press [E].",
          "Serve everyone in line: the leader pays you for the shift."
        ]
      },
      "from": "specs/nivel-1/lugares/lavalle-quest.md"
    },
    {
      "id": "clasico_trapo",
      "title": "Colarse al Monumental y robar el trapo de Boca",
      "title_en": "Sneak into the Monumental and steal the Boca flag",
      "at": "plaza",
      "pre": {
        "lineaC": true
      },
      "sets": {
        "bocaTrapo": true
      },
      "hints": {
        "es": [
          "El maquinista de Villa Ballester no maneja borracho… pero algo lo puede despabilar.",
          "Tomá el TREN ROJO de la San Martín en Retiro: hay un piquete de la UBA en Ciudad Universitaria.",
          "Al lado del piquete está el MONUMENTAL: River-Boca. Colate.",
          "Del lado visitante hay una BANDERA DE BOCA al alcance: manoteála [E]."
        ],
        "en": [
          "The Villa Ballester driver won't drive drunk… but something might snap him out of it.",
          "Take the RED San Martín train at Retiro: there's a UBA picket at Ciudad Universitaria.",
          "Right next to the picket is the MONUMENTAL: River-Boca. Sneak in.",
          "On the away side there's a BOCA FLAG within reach: snatch it [E]."
        ]
      },
      "from": "specs/nivel-1/lugares/lavalle-quest.md"
    },
    {
      "id": "campana_llegada",
      "title": "El maquinista sobrio te lleva a Campana",
      "title_en": "The sobered-up driver takes you to Campana",
      "at": "plaza",
      "pre": {
        "bocaTrapo": true
      },
      "sets": {
        "enCampana": true
      },
      "hints": {
        "es": [
          "Tenés el trapo de Boca. ¿A quién le puede cambiar el día?",
          "Volvé a VILLA BALLESTER (tren del Mitre desde Retiro).",
          "Dale el trapo al MAQUINISTA de la parrilla [E].",
          "Se le pasa el pedo de golpe y te lleva GRATIS a CAMPANA."
        ],
        "en": [
          "You have the Boca flag. Whose day could it make?",
          "Head back to VILLA BALLESTER (Mitre train from Retiro).",
          "Give the flag to the DRIVER at the grill [E].",
          "He sobers up on the spot and takes you to CAMPANA FOR FREE."
        ]
      },
      "from": "specs/nivel-1/lugares/lavalle-quest.md"
    },
    {
      "id": "dalmine_portal",
      "title": "4 goles de Villa Dálmine → el satélite → el portal al búnker",
      "title_en": "4 Villa Dálmine goals → the satellite → the portal to the bunker",
      "at": "plaza",
      "pre": {
        "enCampana": true
      },
      "sets": {
        "dalmineGritado": true
      },
      "terminal": true,
      "hints": {
        "es": [
          "En Campana, seguí a la banda violeta.",
          "Entrá al estadio de MITRE Y PUCCINI: juegan Villa Dálmine vs CADU.",
          "En el entretiempo clavate EL chori; en el 2º tiempo GRITÁ cada gol [E].",
          "Al 4º gol cae un SATÉLITE de la IA y el portal te devuelve al búnker del loop."
        ],
        "en": [
          "In Campana, follow the violet crowd.",
          "Enter the MITRE Y PUCCINI stadium: Villa Dálmine vs CADU.",
          "At halftime devour THE chori; in the 2nd half SHOUT every goal [E].",
          "On the 4th goal an AI SATELLITE falls and the portal drops you back at the loop bunker."
        ]
      },
      "from": "specs/nivel-1/lugares/lavalle-quest.md"
    },
    {
      "id": "cura_bendicion",
      "title": "El mandado del cura: un plato para la abuela Coca → la bendición",
      "title_en": "The priest's errand: a plate for grandma Coca → the blessing",
      "at": "plaza",
      "npc": "cura",
      "pre": {
        "enVilla31": true
      },
      "sets": {
        "curaBendicion": true
      },
      "terminal": true,
      "hints": {
        "es": [
          "En la Villa 31, el cura de la capilla tiene algo para pedirte.",
          "Hablale al CURA [E]: la abuela Coca no puede llegar a la olla.",
          "Agarrá un PLATO de la olla y llevalo a la casa del fondo a la derecha.",
          "Entregale el plato a la ABUELA COCA y volvé al cura: te da su BENDICIÓN (estampita 🙏, usala con [I])."
        ],
        "en": [
          "In Villa 31, the chapel priest has something to ask you.",
          "Talk to the PRIEST [E]: grandma Coca can't reach the pot.",
          "Grab a PLATE from the pot and take it to the house at the back right.",
          "Deliver the plate to GRANDMA COCA and return to the priest: he gives you his BLESSING (holy card 🙏, use with [I])."
        ]
      },
      "from": "specs/nivel-1/lugares/lavalle-quest.md"
    },
    {
      "id": "polaco_caso",
      "title": "La Gallega te da el caso: el Polaco desapareció",
      "title_en": "La Gallega gives you the case: el Polaco is missing",
      "at": "plaza",
      "pre": {
        "enRetiro": true
      },
      "sets": {
        "polacoCaso": true
      },
      "hints": {
        "es": [
          "En Retiro hay alguien que conoce todos los nombres de la terminal.",
          "Buscá a la GALLEGA, la linyera de la bóveda de Retiro, y hablale [E].",
          "La Gallega te cuenta: el POLACO de Constitución faltó a la olla de los jueves. Nunca faltó en 20 años.",
          "Aceptá el caso de la GALLEGA en Retiro [E]: averiguar qué le pasó al POLACO, el linyera de Constitución."
        ],
        "en": [
          "Someone at Retiro knows every name in the terminal.",
          "Find LA GALLEGA, the homeless woman under Retiro's iron vault, and talk to her [E].",
          "La Gallega tells you: EL POLACO from Constitución missed Thursday's soup pot. He never missed it in 20 years.",
          "Take LA GALLEGA's case at Retiro [E]: find out what happened to EL POLACO, Constitución's homeless man."
        ]
      },
      "from": "specs/nivel-1/lugares/misterio-polaco.md"
    },
    {
      "id": "polaco_carrito",
      "title": "El rincón del Polaco: Firulais, el carrito y la nota",
      "title_en": "El Polaco's corner: Firulais, the cart and the note",
      "at": "plaza",
      "pre": {
        "polacoCaso": true
      },
      "sets": {
        "polacoCarrito": true
      },
      "hints": {
        "es": [
          "Todo el que desaparece deja algo atrás. Y alguien que espera.",
          "En CONSTITUCIÓN, bajo el reloj, está el rincón del Polaco: un perro cuida el carrito.",
          "Revisá el CARRITO del Polaco [E] en Constitución — Firulais te deja pasar.",
          "En el carrito hay una NOTA: 'la tormenta me habla desde la playa de maniobras… me voy a LA PLATA a escucharla'."
        ],
        "en": [
          "Everyone who disappears leaves something behind. And someone waiting.",
          "At CONSTITUCIÓN, under the clock, there's el Polaco's corner: a dog guards the cart.",
          "Search el Polaco's CART [E] at Constitución — Firulais lets you through.",
          "Inside the cart there's a NOTE: 'the storm talks to me from the rail yard… I'm off to LA PLATA to listen'."
        ]
      },
      "from": "specs/nivel-1/lugares/misterio-polaco.md"
    },
    {
      "id": "polaco_hallado",
      "title": "El Polaco aparece en La Plata: la radiecita de la tormenta",
      "title_en": "El Polaco turns up at La Plata: the little storm radio",
      "at": "plaza",
      "pre": {
        "polacoCarrito": true
      },
      "sets": {
        "polacoHallado": true
      },
      "terminal": true,
      "hints": {
        "es": [
          "Las vías siempre llevan a alguna parte. Seguilas.",
          "Tomá el TREN del Roca a LA PLATA desde Constitución (molinetes [E] → ramal La Plata).",
          "En el ANDÉN de La Plata hay alguien escuchando una radio vieja entre las estáticas…",
          "Hablale al POLACO en el andén de La Plata [E]: está sano — y te regala su RADIECITA 📻 (usala con [I]: te sopla la pista)."
        ],
        "en": [
          "The tracks always lead somewhere. Follow them.",
          "Take the Roca TRAIN to LA PLATA from Constitución (turnstiles [E] → La Plata branch).",
          "On the La Plata PLATFORM someone is listening to an old radio through the static…",
          "Talk to EL POLACO on the La Plata platform [E]: he's fine — and he gifts you his RADIO 📻 (use with [I]: it whispers the hint)."
        ]
      },
      "from": "specs/nivel-1/lugares/misterio-polaco.md"
    },
    {
      "id": "bondi60_loop",
      "title": "El 60 a Zárate: el viaje tan largo que te devuelve al principio",
      "title_en": "Bus 60 to Zárate: the ride so long it returns you to the start",
      "at": "plaza",
      "pre": {
        "nivel2Win": true
      },
      "sets": {
        "bondi60": true
      },
      "terminal": true,
      "hints": {
        "es": [
          "Dicen que hay un colectivo que va tan lejos que llega al principio.",
          "El tren BELGRANO NORTE (desde Retiro) te deja cerca de Puente Saavedra. Cerca… es un decir.",
          "Caminá desde la estación hasta PUENTE SAAVEDRA y esperá el 60 RAMAL ZÁRATE en la parada.",
          "Subite al 60 en Puente Saavedra [E]: el viaje es tan largo que… mejor descubrilo vos."
        ],
        "en": [
          "They say there's a bus that goes so far it arrives at the beginning.",
          "The BELGRANO NORTE train (from Retiro) leaves you near Puente Saavedra. Near… so to speak.",
          "Walk from the station to PUENTE SAAVEDRA and wait for the 60 ZÁRATE BRANCH at the stop.",
          "Board the 60 at Puente Saavedra [E]: the ride is so long that… better find out yourself."
        ]
      },
      "from": "specs/nivel-1/lugares/zarate-60.md"
    },
    {
      "id": "zarate_llegada",
      "title": "El Chevallier de lujo: Once → la costanera de Zárate",
      "title_en": "The luxury Chevallier: Once → Zárate's riverside",
      "at": "plaza",
      "pre": {
        "nivel2Win": true
      },
      "sets": {
        "enZarate": true
      },
      "hints": {
        "es": [
          "Hay una manera VIP de ir al norte, y sale de donde llega la Línea A.",
          "Tomá la LÍNEA A del subte hasta ONCE (Plaza Miserere).",
          "En Once está la plataforma del CHEVALLIER: el rápido a Zárate, un viaje de lujo con aire acondicionado.",
          "Subite al CHEVALLIER en Once [E]: caminá por el bus si querés — te baja en la COSTANERA de Zárate."
        ],
        "en": [
          "There's a VIP way north, and it leaves from where Line A ends.",
          "Take subway LINE A to ONCE (Plaza Miserere).",
          "At Once you'll find the CHEVALLIER platform: the Zárate express, a luxury ride with A/C.",
          "Board the CHEVALLIER at Once [E]: walk around the bus if you like — it drops you at Zárate's RIVERSIDE."
        ]
      },
      "from": "specs/nivel-1/lugares/zarate-60.md"
    },
    {
      "id": "regata_timonel",
      "title": "La regata: timoneás la final y Campana es campeón (el trofeo)",
      "title_en": "The regatta: you cox the final and Campana takes the title (the trophy)",
      "at": "plaza",
      "pre": {
        "enZarate": true
      },
      "sets": {
        "regataWon": true
      },
      "hints": {
        "es": [
          "En el río hay un campeonato por definirse, y falta alguien en un bote.",
          "En la costanera de Zárate, pasá por el CLUB DE REMO: hay torneo Campana vs Zárate.",
          "Campana ganó todas las combinaciones, pero para la FINAL del ocho les falta el TIMONEL.",
          "Ofrecete de TIMONEL en el club de remo [E]: marcá el ritmo (¡BOGA!), esquivá las boyas y ganá la final 🏆."
        ],
        "en": [
          "On the river a championship hangs in the balance, and a boat is missing someone.",
          "At Zárate's riverside, stop by the ROWING CLUB: it's Campana vs Zárate tournament day.",
          "Campana won every class, but for the eights FINAL they're missing the COXSWAIN.",
          "Volunteer as COX at the rowing club [E]: call the stroke (¡BOGA!), dodge the buoys and win the final 🏆."
        ]
      },
      "from": "specs/nivel-1/lugares/zarate-60.md"
    },
    {
      "id": "trofeo_tano",
      "title": "El trofeo a casa: se lo mostrás al Tano en Campana",
      "title_en": "The trophy comes home: you show it to el Tano in Campana",
      "at": "plaza",
      "pre": {
        "regataWon": true
      },
      "sets": {
        "trofeoTano": true
      },
      "hints": {
        "es": [
          "Ese trofeo no se ganó para vos. Hay alguien que tiene que verlo.",
          "El trofeo es DE CAMPANA: volvé a Campana (el maquinista de Villa Ballester te lleva).",
          "En la calle del estadio de Campana anda el TANO, el hincha viejo del termo. Él tiene que ver esto.",
          "Con el trofeo 🏆 encima, apretá [E] frente al TANO en Campana: mostráselo."
        ],
        "en": [
          "That trophy wasn't won for you. Someone has to see it.",
          "The trophy belongs to CAMPANA: go back to Campana (the Villa Ballester engineer takes you).",
          "On Campana's stadium street you'll find el TANO, the old fan with the thermos. He has to see this.",
          "With the trophy 🏆 on you, press [E] in front of el TANO in Campana: show it to him."
        ]
      },
      "from": "specs/nivel-1/lugares/zarate-60.md"
    },
    {
      "id": "trofeo_vitrina",
      "title": "El trofeo queda en la vitrina del club — socio honorario",
      "title_en": "The trophy goes in the club's trophy case — honorary member",
      "at": "plaza",
      "pre": {
        "trofeoTano": true
      },
      "sets": {
        "trofeoVitrina": true
      },
      "terminal": true,
      "hints": {
        "es": [
          "Hay un estante vacío esperando algo que brille.",
          "El Tano dijo que el trofeo va DERECHO a la vitrina de la sede, en Campana.",
          "La vitrina de la SEDE de Villa Dálmine está en la misma calle del estadio, cerca de la estación.",
          "Con el trofeo 🏆 y la bendición del Tano, apretá [E] en la VITRINA de la sede: dejalo en casa."
        ],
        "en": [
          "There's an empty shelf waiting for something shiny.",
          "El Tano said the trophy goes STRAIGHT to the clubhouse trophy case, in Campana.",
          "Villa Dálmine's CLUBHOUSE case is on the stadium street itself, near the station.",
          "With the trophy 🏆 and el Tano's blessing, press [E] at the clubhouse CASE: bring it home."
        ]
      },
      "from": "specs/nivel-1/lugares/zarate-60.md"
    }
  ]
};
if (typeof window !== 'undefined') window.Historia = Historia;
