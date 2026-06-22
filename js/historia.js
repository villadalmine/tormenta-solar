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
    }
  ]
};
if (typeof window !== 'undefined') window.Historia = Historia;
