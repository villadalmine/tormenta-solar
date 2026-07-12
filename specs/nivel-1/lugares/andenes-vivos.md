# LOS ANDENES VIVEN — Tigre, Ezeiza y La Plata (v367-v369)

Cierra la deuda "contenido en los andenes genéricos" (backlog): cada destino grande del tren gana su
propio ARCO al bajarte, con una salida nueva en el andén. Brief del dueño (2026-07-11, verbatim la idea):

> "en tigre puedes poner la cancha de tigre y que juega con dalmine y empatan y lo suspenden porque hay
> violencia y las dos hinchadas se juntan para pelear con los policias, luego en ezeiza le gana el ascenso
> a tristan suarez creo y van a la nacional b, en la plata ves que es igual a campana el diseño original
> de la ciudad con sus diagonales y vas a la catedral a buscar el mapa y te das cuenta que cuando votaron
> quién iba a ser la capital hubo extorsión y por eso ganó la plata"

1. **TIGRE (v367) — EL CLÁSICO SUSPENDIDO:** en Victoria está la cancha de Tigre (el Dellagiovanna).
   Juegan **Tigre vs Villa Dálmine** y EMPATAN 1-1 (el gol de Dálmine lo gritás vos)… y se pudre: bengalas,
   corridas, el árbitro **SUSPENDE por violencia**. Y ahí el folclore argentino puro: **las dos hinchadas
   SE JUNTAN** — azul/rojo y violeta mezclados — para enfrentar a los canas. Vos cantás CON las dos.
2. **EZEIZA (v368) — EL ASCENSO:** el club de Ezeiza es **Tristán Suárez** (el Lechero). Final por el
   ASCENSO: **Dálmine le gana a Tristán Suárez** con gol tuyo (gritado) y aguante en el final →
   **¡VILLA DÁLMINE A LA NACIONAL B!** Fiesta violeta en Ezeiza.
3. **LA PLATA (v369) — LAS DIAGONALES Y EL MAPA:** caminás Plaza Moreno y caés: el trazado con
   **diagonales es IGUAL al de Campana** (las dos son ciudades planificadas de 1882). Entrás a la
   **CATEDRAL**, bajás a la cripta/archivo a buscar **EL MAPA original** — y la revelación: en la votación
   de 1882 por la capital de la provincia **HUBO EXTORSIÓN**, por eso ganó La Plata… y Campana se quedó
   sin ser capital. Te llevás el mapa 🗺️ (`mapa_1882`, coleccionable — hook suave: ¿mostrárselo al Tano?).

```hist
{
  "id": "tigre_clasico",
  "title": "El clásico suspendido: Tigre-Dálmine 1-1 y las hinchadas JUNTAS",
  "title_en": "The abandoned derby: Tigre-Dálmine 1-1 and the two crowds UNITED",
  "at": "plaza",
  "pre": { "nivel2Win": true },
  "sets": { "tigreClasico": true },
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
  }
}
```

```hist
{
  "id": "ezeiza_ascenso",
  "title": "El ascenso en Ezeiza: Dálmine le gana a Tristán Suárez → Nacional B",
  "title_en": "Promotion at Ezeiza: Dálmine beats Tristán Suárez → Nacional B",
  "at": "plaza",
  "pre": { "nivel2Win": true },
  "sets": { "ezeizaAscenso": true },
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
  }
}
```

```hist
{
  "id": "laplata_mapa",
  "title": "La Plata: las diagonales de Campana y el mapa de la extorsión (1882)",
  "title_en": "La Plata: Campana's diagonals and the map of the 1882 extortion",
  "at": "plaza",
  "pre": { "nivel2Win": true },
  "sets": { "laplataMapa": true },
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
  }
}
```

```hist
{
  "id": "mapa_tano",
  "title": "El mapa al Tano: la leyenda del barrio era CIERTA",
  "title_en": "The map to el Tano: the neighborhood legend was TRUE",
  "at": "plaza",
  "pre": { "laplataMapa": true },
  "sets": { "mapaTano": true },
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
  }
}
```

```hist
{
  "id": "mapa_marco",
  "title": "El mapa enmarcado en la sede: CAMPANA CAPITAL, a la vista de todos",
  "title_en": "The map framed at the clubhouse: CAMPANA CAPITAL, for all to see",
  "at": "plaza",
  "pre": { "mapaTano": true },
  "sets": { "mapaMarco": true },
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
  }
}
```

## Implementación (v367-v369)

- **`js/tren.js`:** `SALIDAS` (DATA, patrón `saavedraOut` generalizado): match por regex del ramal →
  `{ exit, label }`. Tigre → `'tigre'`, Ezeiza → `'ezeiza'`, La Plata → `'laplata'`. Portoncito en
  `(6.5, 9.4)` (lejos del Polaco/linyera/vendedor), surface `__salida`.
- **`js/tigre.js`:** estados `pt1 → golTigre(auto 0-1… no: Tigre 1-0) → pt2 → gol (E=gritás el EMPATE) →
  lio (bengalas+corridas) → suspendido → juntada (las hinchadas se MEZCLAN y encaran a los canas; E =
  cantar JUNTOS) → festejo → done`. One-shot `clasicoEdge` al cantar. ExitTo 'back' (vuelve al andén).
- **`js/ezeiza.js`:** `pt1 → gol (E=gritás el 1-0) → aguante (E=alentar, 3 veces) → pitazo → ascenso
  (fiesta violeta + banner NACIONAL B) → done`. One-shot `ascensoEdge`.
- **`js/laplata.js`:** dos fases: `plaza` (Plaza Moreno: catedral al fondo, PLANO de las diagonales —
  [E] = "¡es igual a Campana!" — y puerta de la catedral) → `cripta` (el archivo: la vitrina del MAPA —
  [E] = REVELACIÓN de la extorsión de 1882 + item `mapa_1882` 🗺️). One-shots `diagonalesBeat` (msg) y
  `mapaEdge` (arista + item). ESC en plaza vuelve al andén.
- **`js/game.js`:** state vars + enterTigre/enterEzeiza/enterLaPlata (guardan `trenCtx` para volver al
  andén con `{arrived:true}`), dispatches, FLAG_SETTERS/historiaState/worldSnapshot
  (`ts_tigre`/`ts_ascenso`/`ts_laplata_mapa`), WEAPONS `mapa_1882` (noEquip), debug
  `tigreYa/ezeizaYa/laplataYa`. Grafo 45.

## Implementación (v372 — LOS ANDENES CHICOS CON SABOR)

- Cañuelas / A. Korn / Bosques dejan el flavor genérico `campo`: **3 FLAVORS nuevos (DATA)** en `tren.js` —
  `canuelas` (🍮 dulcedeleche 15, liny **el Tambero**), `korn` (🍖 salame 13, **el Quintero**), `bosques`
  (🍯 miel 12, **el Hachero**). Pilar sigue en `campo` (no hay ramal todavía). 3 ítems heal en WEAPONS
  (30/30/25). i18n `g.tren.vend_<id>` / `g.tren.liny_<id>` / `g.wpn.<item>`. Debug `canuelasYa`.
  e2e `andenes-sabor:ok`.

## Implementación (v370 — EL MAPA AL TANO)

- **`js/campana.js`:** `create(opts)` gana `{mapa, mapaTanoDone, enMarco}`. Con el mapa, el [E] al TANO es el
  beat guionado (si además hay trofeo pendiente, los beats van EN ORDEN: trofeo → mapa → chat) → one-shot
  `mapaTanoEdge`. **El MARCO** (`marco = {x:5.6, y:9.4}`, junto a la sede) se dibuja solo cuando el arco está
  activo: vacío ("(un marco vacío)") tras el beat del Tano, o con EL MAPA (glow + placa "CAMPANA CAPITAL ·
  1882") si `enMarco`. [E] cuelga el mapa → one-shot `marcoEdge` + festejo con banner propio (`celebrateKey`).
- **`js/game.js`:** `enterCampana` pasa los opts; dispatch: `mapaTanoEdge` → `applyEdge('mapa_tano')`;
  `marcoEdge` → `applyEdge('mapa_marco')` + saca `mapa_1882` del inventario + **el mate del Tano (+vida
  FULL)**. Flags `ts_mapa_tano`/`ts_mapa_marco`. Debug `mapaTanoYa`. Grafo 47 (`laplata_mapa` ya no terminal).
