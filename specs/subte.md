# SDD — EL SUBTE: las líneas reales bajo Florida y Lavalle (preview en el mapa → futuro medio de viaje)

- **Estado:** **PREVIEW (v306-307) + QUEST DE LA TARJETA (v310) HECHOS.** F2+ (la estación real, viajar, post-piquete)
  = **DISEÑO en §3-§8** (2026-07-04), esperando OK del dueño para construir. Ver §3 (dónde va la boca en el mapa) y
  §7 (el subte como puente piquete → Plaza de Mayo / Nivel 2).
- **La idea (dueño, 2026-07-03):** *"buscá las líneas de metro que están sobre Lavalle y Florida, armá un mapa
  subte para el mapa en una tab con el diseño del subte, pero solo las líneas que tienen cerca al menos dos
  estaciones — y lo dejamos como preview porque quiero meter el subte."*

## 1. Research: el subte REAL alrededor de Florida y Lavalle (microcentro, CABA)

La esquina del juego es **Florida y Lavalle** (peatonales del microcentro). Líneas con **≥2 estaciones cerca**:

| Línea | Color real | Estaciones CERCA de la zona | Recorrido relevante |
|---|---|---|---|
| **C** (Retiro–Constitución) | azul | **Lavalle** (¡la estación se llama como la calle!), **Gral. San Martín** (cabecera norte de Florida), **Diagonal Norte** | corre en sentido N-S cruzando el microcentro |
| **B** (Alem–J.M. de Rosas) | rojo | **Florida** (¡Corrientes y Florida!), **L. N. Alem**, **Carlos Pellegrini** | corre bajo Av. Corrientes, paralela a Lavalle a 1 cuadra |
| **D** (Catedral–Congreso de Tucumán) | verde | **Catedral** (Diagonal y Florida), **9 de Julio** | nace en el microcentro y sube al noroeste |

Quedan AFUERA (1 estación o lejos): **A** (Perú/Plaza de Mayo, al sur), **E** (Bolívar), **H** (no llega).
Combinaciones reales de la zona: 9 de Julio (D) ↔ Diagonal Norte (C) ↔ Carlos Pellegrini (B) es EL trasbordo
triple del Obelisco — cierra perfecto con el arco del Obelisco del juego.

## 2. F1 — PREVIEW (v306, hecho): pestaña [4] SUBTE en el mapa

- **Catálogo DATA `SUBTE`** en `js/mapa.js` (líneas, color, estaciones, cuáles "cerca") — nada hardcodeado en
  el render: agregar una línea = agregar un objeto.
- **Diseño estilo plano de subte**: fondo oscuro, líneas GRUESAS de color real (C azul vertical, B roja
  horizontal bajo Corrientes, D verde en diagonal), estaciones = puntos blancos con nombre; las estaciones
  CERCA van más grandes y brillantes; el trasbordo del Obelisco marcado; **⭐ "FLORIDA Y LAVALLE — acá"**
  señalando la esquina del juego entre las 3 líneas.
- **Watermark "PREVIEW — próximamente"**: es un teaser, no funcional. Hover/click no hacen nada todavía.

## 2.5 DECISIÓN del dueño (2026-07-03): las 3 ESTACIONES JUGABLES

- **Florida (Línea B)** — boca en la peatonal · **Lavalle (Línea C)** — boca en la zona del piquete ·
  **Catedral (Línea D)** — que **te deja en PLAZA DE MAYO** (la estación está EN la plaza; sería OTRO MAPA futuro).
  *(Precisión: en la Plaza también están «Plaza de Mayo» de la A y «Bolívar» de la E — la elegida es Catedral.)*
- **Gameplay F2:** bajás por la BOCA del subte (puerta en la calle) → nivel de metro (andén) → **viajás entre
  esas tres** — y Catedral es la puerta al futuro mapa Plaza de Mayo. El preview ya las destaca con 🚉 + panel
  de info.

## 2.6 v309 — HOVER con datos + el TÓTEM SUBE del chino (la semilla de la quest)

- **Hover por estación** (tarjeta flotante): año real de inauguración (`EST_ANIO`: Florida 1930, Lavalle 1936,
  Catedral 1937…), línea + año, recorrido en km y pasajeros/día (`SUBTE_DATA`: B 11,8km ~330k · C 4,4km ~200k ·
  D 10,4km ~310k) — y en las 3 jugables, **tus stats**: viajes y plata gastada (`ts_subte_stats` en localStorage,
  contadores LISTOS para cuando el viaje exista en F2; hoy 0).
- **TÓTEM «RECARGA SUBE» en el chino** (`js/super.js`, celeste, entre la SALIDA y la CAJA): 3 estados — sin la
  tarjeta → **“✖ SIN TARJETAS”** (`ts_sube_seen`) · con la tarjeta → **cargar $10** (`ts_sube_charged`) · ya
  cargada → “lista”.
- **QUEST «La tarjeta SUBE» — COMPLETA y DATA-DRIVEN por el grafo (v310):** 2 aristas en las fichas (```hist en
  `super-chino.md`) → 21 aristas totales:
  - `sube_tarjeta` (at `calle`, pre `subeSeen`, sets `subeGot`): un **LINYERA te regala su tarjeta** (ellos
    caminan / viajan de arriba). Se da vía `QUEST_DEFS.sube` (giver `oraculo`, primitiva `subeGive`) al chatear.
  - `sube_carga` (at `super`, pre `subeGot`, sets `subeReady`, terminal): **cargás la SUBE** en el tótem ($10).
  - Flags en localStorage (`ts_sube_seen/got/charged`, como el piquete) + item `sube` 💳 en el inventario. El
    mapa marca ambas (⭐/🔒/✅ vía `historiaState`), fire de checkpoint + ticker. `ts_sube_charged` deja la
    tarjeta lista para el VIAJE de F2.

## 3. LA BOCA DEL SUBTE en el mapa principal (decisión técnica, 2026-07-04)

**Pregunta del dueño:** *"¿dónde pongo la boca del subte en el mapa principal sin pisar lo demás?"*

- **En el MUNDO del juego (modelo):** la boca es una **puerta NUEVA en la calle** (escalera que BAJA, como
  "bajar a la galería" pero más profundo). Va en un HUECO libre de la fila de puertas — hoy la calle tiene puertas
  en x = 10/28/46/52/58/61/74/90/101/112. **Hueco elegido: x ≈ 82** (entre la galería x74 y la casa de cambio
  x90). Es la boca de **Florida (Línea B)**. Id de puerta: `subteB`, tag de sala `subte`.
- **En el MAPA (las 3 vistas), sin pisar nada:**
  - **LA CUADRA (skyline):** un **🚇 en la vereda** a la altura x=82 (marquita chica sobre la ruta; hay lugar,
    no hay silueta ahí).
  - **LA MANZANA (cajones):** la boca **no es un edificio** → va como **marcador 🚇 colgando bajo la calle** en su
    x (la banda de subsuelo bajo la calle está casi vacía: solo la compuerta ⛏️ —centrada en las cuevas, otra x— y
    la caja de SUEÑOS —lejos a la izq—; no se pisan). Click en el 🚇 → abre la **pestaña SUBTE**.
  - **SUBSUELOS:** la estación aparece como la fila **MÁS PROFUNDA (S5)**, debajo de las cuevas (el subte es lo
    más hondo del corte). Es la sala real (F2).
  - **SUBTE (plano):** el 🚉 de Florida ya existe; al tener la estación real, su punto se vuelve **clickeable**
    (mismo patrón que los cajones — el catálogo `SUBTE` gana `roomTag` por estación).
- Regla: **una sola boca nueva por ahora** (Florida/B). Lavalle (C) y Catedral (D) se suman en F3 (Lavalle desde
  la zona del piquete; Catedral desde Plaza de Mayo, ver §7).

## 4. F2 — LA ESTACIÓN como nivel (sub-modo top-down, patrón `tienda`/`bodegon`)

- **Sala real** `estacion-florida` (tag `subte`, theme nuevo `subte`), colgada de la boca (puerta `subteB`).
  Nivel top-down (se camina), NO side-scroller — el andén se lee mejor de arriba (como el bodegón).
- **Layout (de arriba hacia abajo):** ESCALERA (spawn, vuelta a la calle) → **hall con MOLINETES** (pasás la
  SUBE 💳: si `subeReady` → *bip* verde y pasás; si no → *bip rojo*, te manda a cargarla → engancha con la quest
  v310) → **ANDÉN** con el borde amarillo, cartel de la línea, mapa de la línea en la pared → **VÍAS** (el
  formación llega/sale). Puestito de diarios/kiosco opcional.
- **Decoración (art.js, DATA):** baldosas gastadas, tira LED del destino, banco de andén, cartel «FLORIDA — Línea
  B», tacho, afiches (reusan `Ads`/`Mensajero`), luz parpadeante (post-tormenta = medio a oscuras, dressing de
  refugio §F5). Todo props del theme `subte` (mismo patrón que `lavalle`/`telo`).

## 5. NPCs y VIDA del subte (data-driven, personas nuevas)

- **El del molinete / boletero** — persona `boletero`: gruñón simpático, te reta si querés pasar sin cargar la
  SUBE, sabe los horarios y "el de arriba" (rumores). NO IA obligatoria (línea scripteada + chat opcional).
- **Linyera del subte** — el subte es refugio de linyeras; una persona nueva `subterraneo` (vive abajo, filosofía
  del subsuelo, conoce todas las líneas y a dónde llevan) — 1er oráculo del subte, chateable.
- **Busker / músico** — toca en el andén por unas monedas (reusa el patrón del `musico` de la calle).
- **Pasajeros ambiente** — siluetas que esperan el subte, suben/bajan cuando llega la formación (peers si hay
  multiplayer; si no, NPCs canned). El chusmerío viaja por línea (F5).

## 6. F3 — VIAJAR (el fast-travel) + las 3 bocas

- **Mecánica:** en el andén, [E] sobre el cartel/tren → menú de DESTINOS (las estaciones de esa línea que tengan
  boca en el juego). Elegís → *cortina* → aparecés en la OTRA estación (spawn en su escalera). Cuesta saldo SUBE
  (baja `ts_subte_stats[est].gasto`, sube `usos` → los contadores del hover del §2.6 empiezan a moverse); si te
  quedás sin saldo → volvés al tótem del chino a recargar.
- **Las 3 estaciones jugables** (decisión §2.5): **Florida (B)** boca en la peatonal · **Lavalle (C)** boca en la
  zona del piquete · **Catedral (D) → PLAZA DE MAYO** (§7). Al principio conectan sólo estas tres.
- **Regla data:** cada estación es una sala `subte` con `linea` + `roomTag`; el menú de viaje se arma leyendo el
  catálogo `SUBTE` × qué estaciones tienen sala. Agregar una estación = agregar el dato (cero hardcode).

## 7. DÓNDE VAS LUEGO DEL PIQUETE — el subte como puente a PLAZA DE MAYO (propuesta)

Hoy el arco del piquete termina en `satelite_herido` (Obelisco). **Propuesta de continuación:** después de herir
al satélite, la muchachada te manda **a la Casa Rosada / Plaza de Mayo** a rematar la cosa → y la **única forma
de llegar es el SUBTE** (Línea D desde Catedral, o el trasbordo del Obelisco D/C/B). Así:

- La **quest de la tarjeta SUBE (v310) se vuelve el GATE narrativo a la Plaza** (necesitás la 💳 cargada para
  viajar) — el side-quest del chino pasa a ser parte de la ruta principal. Cierra redondo.
- **Plaza de Mayo = comienzo del NIVEL 2** (otro mapa: Casa Rosada, pirámide, las Madres, palomas, la Catedral).
  El subte es el conector natural entre Nivel 1 (microcentro) y Nivel 2 (Plaza).
- Arista nueva del grafo (cuando se construya): `plaza_llegada` (at `subte`/`obelisco`, pre `sateliteHerido` +
  `subeReady`, sets `enPlaza`) → engancha piquete → subte → Nivel 2.

## 8. Fases
- **F1 — PREVIEW** ✅ (v306-307): pestaña [4] + datos + tótem.
- **F1.5 — QUEST DE LA TARJETA** ✅ (v310): buscar (linyera) + cargar (tótem), por el grafo.
- **F2 — LA ESTACIÓN (Florida):** boca en la calle (§3) + sala `subte` top-down + molinetes que leen la SUBE +
  andén + 1 NPC (boletero) + decoración. Sin viaje todavía (una estación sola). *(Chico-medio; el sub-modo reusa
  el patrón `bodegon`/`tienda`.)*
- **F3 — VIAJAR + las 3 bocas:** menú de destinos, cortina, spawn cruzado, gasto de saldo; bocas de Lavalle (C) y
  Catedral (D). Los contadores del hover cobran vida.
- **F4 — POST-PIQUETE → PLAZA DE MAYO:** arista `plaza_llegada`, Catedral abre a Nivel 2 (aunque sea un teaser
  de Plaza al principio).
- **F5 — VIDA:** linyera del subte (oráculo), busker, pasajeros, chusmerío por línea, dressing post-tormenta.

## 9. Notas
- La pestaña es DATA + render puro: cuando existan las salas reales (F2), el catálogo `SUBTE` gana `roomTag` por
  estación y los puntos del plano se vuelven clickeables (mismo patrón que los cajones).
- Precisión geográfica: el plano es esquemático (estilo mapa de subte, no GPS) — lo importante es que las
  líneas/estaciones son las REALES de la zona.
- **3 patas** al sumar la sala `subte` con NPCs custom: `level.js makeRoom` + `tools/gen-level.js` + `mundo.js`
  (regla reincidente del proyecto). Tras tocar level.js: `node tools/gen-level.js` + bump del count en e2e.
