# SDD — EL SUBTE: las líneas reales bajo Florida y Lavalle (preview en el mapa → futuro medio de viaje)

- **Estado:** **PREVIEW IMPLEMENTADO (v306, pestaña [4] SUBTE del mapa).** El resto = diseño futuro.
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
