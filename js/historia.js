// historia.js — GENERADO por tools/gen-historia.mjs (NO editar a mano).
// Ensamblado desde los bloques ```hist de specs/nivel-1/**/*.md. Ver specs/nivel-1/historia-grafo.md.
// Capa aditiva (typeof Historia guard). Fase 1: el grafo SOLO DESCRIBE; game.js sigue dueño de los flags.
const Historia = {
  "edges": [
    {
      "id": "edificio",
      "title": "Abrir el edificio abandonado",
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
      "id": "tormenta",
      "title": "Disparar la tormenta solar",
      "at": "cueva",
      "pre": {},
      "sets": {
        "stormed": true
      },
      "hints": {
        "es": [
          "El verde se compra abajo, donde no llega el sol... pero el sol igual te encuentra, pibe.",
          "¿Nunca bajaste del todo a la cueva? El negocio de verdad está en la del fondo.",
          "Andá a la cueva del fondo y cambiale los dólares al arbolito: ahí arranca TODO.",
          "¡Que bajes a la CUEVA DEL FONDO y CAMBIES, carajo! ¿Te lo dibujo?"
        ],
        "en": [
          "The green's bought down below, where the sun don't reach... but the sun finds you anyway, kid.",
          "You never went all the way down to the cueva? The real deal's in the back one.",
          "Go to the back cueva and change your dollars with the arbolito: that's where it ALL kicks off.",
          "Go DOWN to the BACK CUEVA and CHANGE already, damn it! Want me to draw you a map?"
        ]
      },
      "from": "specs/nivel-1/personajes/cueveros.md"
    },
    {
      "id": "chino_iorio",
      "title": "Abrir el frente del chino con Iorio",
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
      "at": "edificio",
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
      "id": "fifa",
      "title": "Ganar el torneo de FIFA 98 (con la Mega Drive)",
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
      "id": "armas",
      "title": "Comprar fierro criollo (con la tormenta, las eléctricas no andan)",
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
    }
  ]
};
if (typeof window !== 'undefined') window.Historia = Historia;
