# SDD — EL SUBTE: las líneas reales bajo Florida y Lavalle (preview en el mapa → futuro medio de viaje)

- **Estado:** **PREVIEW IMPLEMENTADO (v306-307, pestaña [4]).** Decisión §2.5: 3 estaciones jugables (Florida B / Lavalle C / Catedral D→Plaza de Mayo) con viaje entre ellas — F2 pendiente.
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
- **TÓTEM «RECARGA SUBE» en el chino** (`js/super.js`, celeste, entre la SALIDA y la CAJA, sin pisar nada):
  [E] → querés comprar la tarjeta → **“✖ SIN TARJETAS”** — el chino grita que se le acabaron y que consigas una
  por ahí. Deja `ts_sube_seen=1` → **semilla de la QUEST «buscar la tarjeta SUBE»** (a diseñar: ¿quién tiene una
  SUBE dando vueltas? ¿un linyera? ¿el telo? ¿premio de un mini-juego?). La quest se agregará al grafo como
  arista con `sala` cuando se diseñe.

## 3. Futuro (F2+, a diseñar con el dueño): METER el subte al juego

- **F2 — la estación como LUGAR**: sala real "Estación Lavalle (C)" colgada de los subsuelos (S4/S5: más abajo
  que las cuevas — el subte es lo más profundo del corte). Molinetes, andén, linyeras del subte (persona nueva),
  puestito de socorro. Entrada por la calle (boca de subte = puerta nueva en el modelo).
- **F3 — VIAJAR**: el subte como fast-travel del juego: Lavalle (C) → San Martín (C) para aparecer en la otra
  punta de Florida; y a futuro **las estaciones = puertas a NIVELES NUEVOS** (Nivel 2 = otra zona de la ciudad,
  el subte es el conector natural). Combinación en el Obelisco (D/C/B) engancha con el arco del satélite.
- **F4 — vida**: el subte post-tormenta (¿anda sin electricidad? dressing de refugio), buskers, el chusmerío
  viaja en subte (rumores por línea).

## 4. Notas
- La pestaña es DATA + render puro: cuando exista la sala real (F2), el mismo catálogo gana `roomTag` por
  estación y los puntos se vuelven clickeables (mismo patrón que los cajones).
- Precisión geográfica: el plano es esquemático (estilo mapa de subte, no GPS) — lo importante es que las
  líneas/estaciones son las REALES de la zona.
