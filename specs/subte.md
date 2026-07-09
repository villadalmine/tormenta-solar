# SDD — EL SUBTE: las líneas reales bajo Florida y Lavalle (preview en el mapa → futuro medio de viaje)

- **Estado:** **F1-F3 HECHOS (v306-v317).** Preview + quest de la tarjeta + boca Florida + estaciones Florida(B)/
  Lavalle(C) (`js/subte.js`, andén top-down + molinetes + boletero + tren) + **VIAJE entre estaciones (F3, menú de
  destinos, cuenta el pasaje)**. Boca de Lavalle en el piquete tras herir al satélite. Mapa: marcador 🚇 SUBTE en la
  calle + estaciones ✓/🔒 en el plano. **FALTA F4: Plaza de Mayo (Catedral) → Nivel 2** — diseño en §10.
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
  - **LA MANZANA (cajones):** la boca **no es un edificio** → **marcador «🚇 SUBTE» etiquetado que sobresale hacia
    arriba de la barra de la calle** en su x (v315, bien visible; no pisa la banda de subsuelos). Click → pestaña SUBTE.
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
  **✅ v330 — te VENDE un BOLETO 🎫** (alternativa de un uso a la SUBE): si no tenés la SUBE cargada ni un boleto y te
  alcanza la plata (precio DATA `boletoPrice`, def. 20 🪙), `[E]` sobre él → comprás; parado en el molinete con el
  boleto → `[E]` pasás **una vez** y se consume. La SUBE sigue siendo mejor (permanente/gratis tras la quest del chino);
  el boleto es el paraguas para el que no la hizo. Ítem `boleto` en `WEAPONS` (kind `ticket`, ver
  `inventario-armas.md §7.1`); `subte.js` reporta a game.js vía getters one-shot `purchase`/`boletoUsed` (isolation).
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
- **F2 — LA ESTACIÓN** ✅ (v312): estaciones Florida(B) + Lavalle(C), andén top-down + molinetes + boletero + tren.
- **F3 — VIAJAR** ✅ (v317): menú de destinos en el andén (Florida↔Lavalle), cuenta el pasaje (`ts_subte_stats`).
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

## 10. F4 — PLAZA DE MAYO (Catedral/Línea D) → arranque del NIVEL 2 [DISEÑO, pedido dueño 2026-07-04]

**La idea (dueño):** *"creá un ejemplo de Plaza de Mayo — la Catedral, la Casa de Gobierno, el Cabildo — quizás
una vista de arriba EN CÍRCULO, la parte donde las Madres de Plaza de Mayo dan vueltas. Es más rico en círculo
que en línea recta."*

- **Research (Plaza de Mayo real, microcentro CABA):** plaza histórica; en el CENTRO la **Pirámide de Mayo**
  (primer monumento patrio) — alrededor de ella las **Madres de Plaza de Mayo marchan en círculo** (ronda de los
  jueves, pañuelos blancos en la cabeza). Alrededor de la plaza: la **Casa Rosada / Casa de Gobierno** (rosa, al
  ESTE, sobre la Plaza Colón), la **Catedral Metropolitana** (al NORTE, sobre Rivadavia — tumba de San Martín +
  llama votiva), el **Cabildo** (colonial, blanco con arcos y recova, al OESTE), el **Banco Nación**, palomas,
  las fuentes. La estación **Catedral (Línea D)** tiene su boca EN la plaza.
- **Diseño CIRCULAR (mejor que la línea recta):** sub-modo top-down `js/plaza.js` con la plaza vista de arriba,
  la **Pirámide en el centro**, las **Madres girando alrededor** (círculo de siluetas con pañuelo blanco), y los
  3 landmarks anclados en su orientación real: **Casa Rosada** (E, rosa), **Catedral** (N, con columnas), **Cabildo**
  (O, arcos blancos). La boca del subte (Catedral) por donde llegás. Palomas, fuentes, adoquines en anillo.
- **Cómo se llega:** viajás en subte a **Catedral** (destino nuevo, se habilita tras `sateliteHerido`) → aparecés
  en Plaza de Mayo. Es el **arranque del NIVEL 2** (otra zona de la ciudad; el subte es el conector — subte.md §7).
- **F4 fases:** F4a ✅ POSTAL circular · F4b ✅ Catedral destino · F4c ✅ grafo (`plaza_llegada`, v319) · F4d ✅
  (v320): la CASA ROSADA enterable (Salón Blanco tomado + terminal del satélite) · **F4e ✅ (v321): el OBJETIVO
  SANMARTINIANO — el Nivel 2 se GANA.**

### 10.1 F4e — OBJETIVO DEL NIVEL 2: el proceso sanmartiniano de liberación mundial [v321, pedido dueño 2026-07-04]

**La idea (dueño):** *"desde la Plaza de Mayo, en la Pirámide de Mayo tenés que armar un dispositivo anti-IA, pero
para eso tenés que entrar en la tumba de San Martín y buscar el chip AI del Libertador para que desde la Pirámide
envíe una señal a los satélites manejados por la IA e inicie el proceso sanmartiniano de liberación mundial. San
Martín nos libera del yugo de la IA."*

**Implementación (`js/plaza.js`, todo aislado del juego principal):**
1. **Tracker de objetivo** (arriba, siempre visible): `objChip` → conseguí el chip · `objArm` → llevalo a la
   Pirámide · `objDone` → liberación en marcha. Una Madre lo anticipa en `g.plaza.enter`.
2. **Tumba de San Martín** (interior `inside='tumba'`, entrás por la Catedral N): cripta de piedra, **sarcófago
   velado por la bandera** (celeste-blanca-celeste + sol), **3 granaderos** (casaca azul, morrión con penacho
   rojo, fusil), **llama votiva** flameante, y el **CHIP AI DEL LIBERTADOR** (cuadrado verde con pins + aura que
   late) flotando sobre la cabecera. Caminás hasta él → **[E] lo tomás** (`hasChip`, flag `ts_sanmartin_chip`); lo
   llevás encima (pixel verde en la cabeza del jugador).
3. **Pirámide de Mayo = dispositivo anti-IA** (centro): con `hasChip`, **SOSTENÉS [E]** → **FORCEJEO** (v322): la
   **señal de San Martín** (`charge`, barra celeste) gana terreno contra la **resistencia de la IA** (`resist =
   0.16 + charge·0.14`, más fuerte cerca del final); si **soltás**, `charge` decae (0.7/s) → la IA recupera. Al
   llegar a 1 → `armed`: el **haz celeste** estalla hacia los satélites (~3.6s) → `exitTo='win2'`. Sin el chip:
   `needChip` (te manda a la tumba).
5b. **CINEMÁTICA DE CIERRE** (`js/finale.js`, v324): el `win2` NO va derecho a la pantalla de fin → juega 5 beats
   dibujados (señal → satélites caen → San Martín cruza los Andes → liberación MUNDIAL/globo → amanece sobre BA con
   el pueblo). Auto-avanza (`DUR=4.6`) + fundidos + progreso; `[E]`/Espacio adelanta, `Esc` saltea; al terminar
   `exitTo='end'` → `showWin2End()` (pantalla `g.win2`). Aditivo: `if (typeof Finale !== 'undefined')` en game.js;
   sin el módulo va derecho a `showWin2End()`. → **VICTORIA del Nivel 2** (`ts_nivel2_win`, tel `win/nivel2`).
4. **Casa Rosada** (interior `inside='rosada'`): pasa a ser **enemigo/lore** — el CONTROL DEL SATÉLITE tomado. Ya
   NO se apaga a mano; la lore (`term1-3`) apunta al chip del Libertador y la señal de la Pirámide.
   **Cabildo** (interior `inside='cabildo'`, v323): recova de arcos + **campana** repicable (`bellT`) + **balcón de
   la Junta**, lore del 25 de Mayo de 1810. Los 3 landmarks ya son enterables (tumba/control/cabildo).
   **DRONES de la IA** (v323): 3 chips voladores patrullan la plaza (`updateDrones`); te tocan → `stunT`+knockback (no
   letal, no perdés el chip); al armar convergen al centro y la señal los funde (`dead`). Las Madres son intocables.
5. **Desacople del datacenter:** el requisito de la victoria es el CHIP (personal), **no** el datacenter comunitario
   global — así el jugador siempre puede cerrar el Nivel 2 (el datacenter D1 sigue siendo su feature aparte).

**Test/validación:** e2e `plaza:ok` (chip→armar→win2 + boca→subte); Chromium (plaza circular, tumba con granaderos
y chip, haz de la señal). Superficies de test en `plaza.js`: `__chip`, `__arm`, `__leave`, getter `_dbg`.

**FIX de paso (v321):** el hueco de la barricada del piquete se ensanchó (x6-11) → cruzar al Obelisco ya no exige
alinearte al pixel (era la causa del "se cuelga al pasar la valla").

## 10.2 — El CABILDO de Mayo: escarapela + French & Beruti (v343)
En la Plaza de Mayo (Nivel 2), el **Cabildo** (oeste) suma un arco histórico/educativo:
- **Campana:** entrás al Cabildo y repicás la campana. **1ª vez** → caen **escarapelas** celestes y blancas y **agarrás
  una** (flag `ts_escarapela`; homenaje al 25 de mayo de 1810). **Repicás de nuevo** → la campana **toca el Himno**
  (coda "o juremos con gloria morir", `Sfx.himnoCoda()`, timbre de carillón, más rápida que el Himno solemne del Obelisco).
- **French & Beruti:** con la escarapela, al volver a la plaza aparecen **granaderos** (custodia) + **Domingo French** y
  **Antonio Luis Beruti** (los que repartieron las cintas en 1810). Son **NPCs chateables con IA** (personas `french`/
  `beruti`, memoria + grounding): hablan **sólo** de la Revolución de Mayo/Independencia (educativo) y confían "algo raro"
  que no entienden — el tiempo que se tuerce, hechos que se repiten (la **IA manipulando el espacio-tiempo**). No saben
  qué es una IA (lo viven como prodigio).
- **Data/grafo:** arista `escarapela` (at `plaza`, pre `enPlaza`) en `lavalle-quest.md` → `historia.js`; flag `escarapela`
  en `FLAG_SETTERS`/getters/`historiaState`/grounding. Personas desde fichas `personajes/{french,beruti}.md` →
  `gen-personas.mjs`. Wiring: `plaza.js` getters `openChatNpc`/`escarapelaEdge` → `game.js` (`openChat`, `chatReturnTo='plaza'`).

## 11 — POST NIVEL 2: la red de TREN (Línea C → Constitución / Retiro → Villa 31)

Pedido del dueño (2026-07-08): al reventar los satélites desde la Pirámide, la pantalla de **win2 sigue diciendo
"ganaste el Nivel 2"** pero **YA NO termina el juego** — te deja seguir en el mapa porque se **habilita la Línea C**
(que une Retiro ↔ Constitución). Roadmap por etapas (como Lavalle E1-E5):

- **E1 — HECHO (v344):** win2 **continuable** + **Constitución**.
  - `showWin2End()` enciende `ts_linea_c` y muestra el botón **"▶️ SEGUIR JUGANDO"** (`#seguirBtn`) → `resumeAfterWin2()`
    reanuda el loop y te devuelve a **Plaza de Mayo** (hub, ya liberada). El grafo: `nivel2_liberacion` ahora setea
    `nivel2Win` + **`lineaC`** (arista `constitucion_llegada` cuelga de `lineaC`). Flags `ts_linea_c`/`ts_en_constitucion`
    en FLAG_SETTERS/getters/historiaState/worldSnapshot (los oráculos lo saben). `clearProgress()` los borra en partida
    nueva (progreso de Nivel 2), se conservan en CONTINUAR/checkpoint.
  - **Catálogo del subte** (`js/subte.js`): estaciones `constitucion`/`retiro` (Línea C) con `surface:<id>` → la escalera
    de salida de una TERMINAL sube al **hall del tren** (no a la calle): `leave()` emite `exitTo='surface:<id>'`.
  - `enterSubte()` suma `constitucion` a los destinos cuando `ts_linea_c`. El handler del subte en game.js: `surface:constitucion`
    → `enterConstitucion()`.
  - **`js/constitucion.js`** — sub-modo top-down de la GRAN TERMINAL DEL ROCA, basado en la estación real: hall abovedado,
    **reloj histórico** central, fila de **molinetes de tren** con cartel de **ramales del Roca** (La Plata, Ezeiza, A. Korn,
    Bosques, Cañuelas — DATA rotando), y **locales MOCK** data-driven (kiosco/café/diarios/locutorio/boletería) que dan
    flavor "próximamente" (iteramos con interior real). Salidas: escalera **▼ SUBTE C** (vuelve al andén de la Línea C →
    menú de viaje) y una puerta a la calle (próximamente, para E3). Debug: acción/botón `constiYa`.
- **E2 — HECHO (v347):** **Retiro** (`js/retiro.js`, misma idea que Constitución pero con la **bóveda de hierro y vidrio
  del Mitre** + molinetes Mitre/San Martín/Belgrano + locales mock). `retiro` en `ESTACIONES` con `surface:'retiro'` y en
  los destinos de la Línea C → `enterRetiro()`. **Diferencia:** su SALIDA a la calle está HABILITADA (`exitTo='villa31'`).
- **E3 — HECHO (v347):** de Retiro salís a la calle y, siguiendo las vías de la **Línea San Martín**, entrás a la
  **Villa 31** (transición directa `enterVilla31()`; las vías están dibujadas arriba de la escena).
- **E4 — HECHO (v347):** **Villa 31** (`js/villa31.js`, top-down): casas de ladrillo, cables, murales; el **COMEDOR
  POPULAR** (olla humeante) donde **Doña Rosa te CONTRATA** (flag `ts_comedor`, arista `comedor_contratado` terminal); y
  la **iglesia del Padre Mugica** (capilla Cristo Obrero) con el **cura villero**. Doña Rosa y el cura son **NPCs con IA**
  (personas `comedor` y `cura` — fichas `personajes/{comedor,cura}.md` → `gen-personas.mjs`; el cura es **peronista +
  holístico**). Getters `hireEdge`/`openChatNpc` → game.js (`openChat` + `chatReturnTo='villa31'`). "Ahí quedamos"
  (dueño): cocinar en el comedor se itera después. **Requiere deploy del PROXY** (personas nuevas). Debug `retiroYa`/`villaYa`.
- **E4.1 — HECHO (v348): la JORNADA del comedor.** Contratada, agarrás un plato de la **olla** ([E]) y se lo servís a
  cada vecino de la **cola** ([E]); al servir los `META=6`, la referente te paga una **changa (+30 🪙)**. Estado en
  `villa31.js` (`carrying`/`servidos`/`cola`/`jornadaDone`), one-shot `jornadaEdge` → game.js aplica la paga + arista
  `comedor_jornada` (flag `comedorJornada`, `ts_comedor_jornada`). HUD `X/6` + plato en mano + cola que se vacía.

Nota geográfica: por jugabilidad, "habilitar la Línea C" abre el destino Constitución desde CUALQUIER estación (no forzamos
volver a Lavalle). El metro (subte) y el tren conviven: la terminal (Constitución/Retiro) tiene el andén del subte C abajo y
el hall del tren arriba.

### §11 — DÓNDE SEGUIR (próximos pasos del arco red de tren / Villa 31)
Estado al 2026-07-09 (cache v349): **E1-E4 + E4.1 (jornada) + kioscos HECHOS y en prod.** Lo que sigue, en orden de valor:
1. ~~**Andenes de tren REALES**~~ ✅ **HECHO (v350):** `js/tren.js` — el molinete abre un **menú de ramales** (`tren:<ramal>`)
   → **VIAJE** con paisaje que scrollea (tematizado por destino, `FLAVORS`) → **ANDÉN de destino** (cartel + banco + tren
   de vuelta). `enterTren(ramal,linea,origen)` en game.js; vuelve a la terminal (`trenReturn`). Debug `trenYa`. **Siguiente
   sobre esto:** darle CONTENIDO a cada andén de destino (un NPC, una tienda, una mini-quest por ramal) — hoy es una
   escena de llegada linda pero vacía.
2. **Villa 31 más profunda** — (a) **quest del cura** (un mandado del barrio / bendición con recompensa: ítem o buff
   "espiritual"); (b) el **comedor por rondas** (varias jornadas, la cola se renueva, sube la dificultad, paga escalonada);
   (c) más vida de barrio (vecinos que caminan, murales, un mural del Padre Mugica, perros).
3. **Locales mock restantes** — café / diarios / locutorio / librería / flores. Darles función simple y data-driven
   (comida que cura, "diario" = pista del grafo, "locutorio" = rumor/telegram-lore). Hoy sólo el kiosco (Constitución) y el
   puesto de facturas (Retiro) venden (chori). El patrón de venta ya está: `sells:'chori'` en `LOCALES` + one-shot
   `purchase` → game.js. Generalizar `sells` a otros ítems.
4. **Boarding cross-terminal por tren** — que desde Constitución puedas llegar a un ramal y volver, cerrando el "viajás en
   TREN" (hoy el viaje entre terminales es por el SUBTE Línea C; el TREN todavía no te lleva a ningún lado).
Recordatorio de infra (no-código de juego): `tormenta_ai_sub_codes=0` en el proxy ⇒ el **código premium del dueño no está
cargado**; es dominio del dueño (regla dura: no tocar la key), recordárselo. GOTCHA e2e: sin backticks en comentarios que
caigan dentro del `vm.runInContext(\`...\`)` de `tests/e2e.js`.

## §12 — LA ODISEA A CAMPANA / VILLA DÁLMINE (quest chain, pedido del dueño 2026-07-09)
Cadena grande que sale de la red de tren y cierra en LOOP (volvés al búnker). Homenaje a **Villa Dálmine** (Campana),
el club del dueño. Se construye por etapas; cada una self-contained, testeada y deployada.

**Gancho:** en Villa Ballester (§11) el **maquinista está pasado de copa** y NO lleva el tren a Campana. Para destrabarlo
hay que traerle **la remera/bandera de Boca** (robada de la hinchada en el clásico) → "se le pasa el pedo" y te lleva gratis.

- **S0 — HECHO (v351):** Villa Ballester + **maquinista curda** (persona `maquinista`, IA). El tren a Campana no sale.
- **S1 — HECHO (v353):** ramal **'San Martín — C. Universitaria'** en Retiro; el tren es **ROJO** (`trainCol()` en tren.js).
- **S2 — HECHO (v353):** destino especial `sanmartin` en tren.js: el tren FRENA por el **piquete de la UBA** (banner
  presupuesto + fogata + CBC) con la **estudiante NPC IA** (persona `estudiante`, ficha personajes/estudiante.md).
- **S3 — HECHO (v353):** al lado está el **Monumental** (tribuna+marquesina RIVER vs BOCA) → **[E] te colás** (`exitTo='cancha'`
  → `js/cancha.js`): la cancha con la jugada, tu tribuna de River ([E]=alentar, saltan), la de Boca enfrente.
- **S4 — HECHO (v353):** del lado visitante hay una **bandera de Boca** al alcance → la **manoteás** ([E]) → one-shot
  `trapoEdge` → game.js: `addItem('boca_trapo')` 🎽 + arista `clasico_trapo`. Al salir volvés al andén (opts.arrived,
  sin repetir el viaje; game.js guarda `trenCtx`).
- **S5 — HECHO (v353):** en Ballester, con `boca_trapo` en el inventario, **[E] sobre el maquinista** = se lo das →
  «se me pasó el pedo DE GOLPE» → countdown 2.6s → `exitTo='campana'`. One-shot `trapoUsed` → game.js consume el ítem.
- **S6 — HECHO (v353):** **`js/campana.js`** fase 'calle': estación → **escalinata** → la **banda VIOLETA** de Dálmine
  caminando y cantando → el estadio con luces.
- **S7 — HECHO (v353):** fase 'estadio' (**Mitre y Puccini**, Dálmine violeta vs CADU verde, marcador vivo): secuencia
  1T → **ENTRETIEMPO con el puesto de chori** ([E] = EL MEJOR CHORI DE TU VIDA → `choriEdge` → vida FULL) → 2T: **4
  goles** (cartel ¡GOL DE DÁLMINE! → [E] = gritarlo, la popular salta).
- **S8 — HECHO (v353):** tras el 4º gol **cae el SATÉLITE** (estela+fuego) → **PORTAL espacio-tiempo** (anillos violeta)
  → `exitTo='portal'` → game.js: arista `dalmine_portal` (terminal) + `spawnIn(bunker)` — caés en el **búnker del loop**
  al lado de tu cama. Cierra el círculo. Grafo 33 aristas; flags bocaTrapo/enCampana/dalmineGritado en snapshots.
  Debug `sanmartinYa`/`canchaYa`/`campanaYa`. e2e cadena completa (tren S1-S5 + cancha + campana 4 goles→portal) verde.
- **S9 — HECHO (v354): EL TANO**, hincha viejo de Dálmine (socio vitalicio, ex obrero de la fábrica) en la calle del
  estadio — NPC con IA (persona `violeta`): la historia del club de barrio, con ternura de abuelo.

Ítems/flags nuevos previstos: `boca_trapo` (kind trofeo), flags `enMonumental`/`clasicoVisto`/`bocaTrapo`/`campanaLibre`/
`enCampana`/`dalmineGritado`. El maquinista pasa a tener gate `{has:'boca_trapo'}` para el viaje a Campana.
