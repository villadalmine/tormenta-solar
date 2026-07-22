# EL MISTERIO DEL POLACO — ¿qué le pasó al linyera de Constitución? (v360)

Quest de investigación post-Nivel 2 sobre la red de tren (subte.md §11-§12). Homenaje al corazón del juego:
los **linyeras**. Cada terminal tiene su linyera propio con nombre e historia; el de Constitución, **el POLACO**
(20 años viviendo bajo el reloj), **desapareció** — y nadie de la calle desaparece sin que la calle lo sepa.

## Los linyeras de la red (DATA, elenco)

- **el POLACO** (Constitución): 20 años bajo el reloj del hall. Ex ferroviario del Roca (echado en las
  privatizaciones). Su rincón: carrito 🛒, colchón, y **Firulais**, el perro que lo espera. DESAPARECIDO al
  empezar la quest. Persona IA `polaco` (aparece recién cuando lo ENCONTRÁS en el andén de La Plata).
- **la GALLEGA** (Retiro): vive bajo la bóveda de hierro, ex enfermera, la memoria de la terminal — sabe
  quién pasa, quién falta y quién debe. Amiga del Polaco de la olla de los jueves. Persona IA `gallega`.
  Es la que te da el CASO.
- **Linyeras de andén** (DATA en `tren.js` FLAVORS, estáticos con una línea): la TURCA (Tigre/delta),
  el PROFE (La Plata, ex profesor de la universidad), el CHISPA (Ezeiza), el VASCO (campo), el FLACO (conurbano).
  Dan color, y cuando la quest está activa, sueltan la pista de que el Polaco pasó para La Plata.

## La historia (3 aristas)

La Gallega te cuenta: el Polaco faltó a la olla de los jueves — **nunca faltó en 20 años**. En su rincón de
Constitución, Firulais cuida el carrito: adentro hay una **nota** ("la tormenta me habla desde la playa de
maniobras… me voy a La Plata a escucharla de cerca") y un boleto viejo del Roca. En el **andén de La Plata**
lo encontrás: sano, iluminado, escuchando la tormenta solar con su **radiecita de transistores** — dice que
entre las estáticas se escucha "la voz de la tormenta" (¿o de la IA?). Como agradecimiento por buscarlo,
te REGALA la radiecita 📻: **usándola del inventario te sopla LA PISTA de la historia** donde estés
(el HintEngine portátil — el diario de v359 hecho ítem).

```hist
{
  "id": "polaco_caso",
  "title": "La Gallega te da el caso: el Polaco desapareció",
  "title_en": "La Gallega gives you the case: el Polaco is missing",
  "at": "plaza",
  "npc": "gallega",
  "pre": { "enRetiro": true },
  "sets": { "polacoCaso": true },
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
  }
}
```

```hist
{
  "id": "polaco_carrito",
  "title": "El rincón del Polaco: Firulais, el carrito y la nota",
  "title_en": "El Polaco's corner: Firulais, the cart and the note",
  "at": "plaza",
  "pre": { "polacoCaso": true },
  "sets": { "polacoCarrito": true },
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
  }
}
```

```hist
{
  "id": "polaco_hallado",
  "title": "El Polaco aparece en La Plata: la radiecita de la tormenta",
  "title_en": "El Polaco turns up at La Plata: the little storm radio",
  "at": "plaza",
  "pre": { "polacoCarrito": true },
  "sets": { "polacoHallado": true },
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
  }
}
```

## Implementación (v360)

- `js/retiro.js`: la GALLEGA (NPC, bóveda): 1er [E] sin caso → `casoEdge` (one-shot) + msg; con caso → chat IA
  (`openChatNpc {persona:'gallega'}`, patrón cura v358). `opts.polacoStage` ('caso'|'carrito'|'hallado'|null).
- `js/constitucion.js`: el RINCÓN del Polaco (carrito 🛒 + colchón + Firulais 🐕 que espera): [E] con
  `polacoStage='caso'` → `carritoEdge` (one-shot) + la NOTA; sin caso → Firulais gruñe (flavor); post-hallado →
  el rincón sigue (Firulais mueve la cola: el Polaco volvió a visitarlo).
- `js/tren.js`: en el andén de LA PLATA (flavor `ciudad`) con `opts.polacoStage='carrito'` → el POLACO sentado
  con la radio: [E] → `halladoEdge` (one-shot) + luego chat IA (`persona:'polaco'`). Además TODOS los andenes
  genéricos ganan su LINYERA propio (DATA `FLAVORS.liny = {name, emoji}`): [E] = una línea i18n de color; si
  la quest está activa (stage 'carrito'), sueltan "al Polaco lo vi pasar para La Plata".
- `js/game.js`: `FLAG_SETTERS` polacoCaso/polacoCarrito/polacoHallado (`ts_polaco_*`), `historiaState()`,
  `worldSnapshot`, ítem `radiecita` 📻 (`use:{kind:'hint'}` → `useItem` llama `HintEngine.next(historiaState())`
  y lo muestra — nuevo kind genérico, cualquier ítem-pista futuro lo reusa). Al `halladoEdge`: `addItem('radiecita')`.
- Personas: fichas `gallega.md` + `polaco.md` → `gen-personas.mjs --write` ⇒ **deploy del proxy**.
