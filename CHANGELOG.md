# 📜 Changelog — Tormenta Solar

Todos los cambios notables del juego. Formato inspirado en
[Keep a Changelog](https://keepachangelog.com/es-ES/). Las versiones se corresponden con el
**cache-busting** (`?v=N` en `index.html`): subir `v` = release nuevo.

El juego es 100% estático; se publica en
[villadalmine.github.io/tormenta-solar](https://villadalmine.github.io/tormenta-solar/).

---

## [v80] — 2026-06-24 — 🧩 Motor v2 (data-driven) detrás de un toggle — F1/F2/F3

Primer paso real hacia el **modelo de entidades data-driven** ([`specs/modelo-de-entidades.md`](specs/modelo-de-entidades.md)).
**El juego sigue en v1 por default**; v2 es opt-in y experimental.

### Agregado
- **Nivel 1 como DATA** (`levels/nivel-1.json`, 38 salas / 487 entidades) **generado** del `Level.build()` real
  por `tools/gen-level.js` (fiel y re-ejecutable) + `js/level-data.js` (wrapper para el browser).
- **`js/mundo.js`** (`Mundo.fromModel`, función pura) reconstruye el nivel desde la data.
- **Toggle "Motor: v1/v2"** en ⚙ Opciones (persiste en `localStorage`, aplica al (re)empezar; `?engine=v2`).
  Con v2, `reset()` usa `Mundo.fromModel(LEVEL1)` en vez de `Level.build()` (guardado por `useV2()`).

### Tests
- **`tests/levels.mjs`** (mini-validador de JSON Schema **sin deps**) valida los `levels/*.json`.
- **`tests/parity.mjs`**: **paridad v1≡v2** sobre el Nivel 1 → **las 38 salas coinciden** (geometría,
  posiciones, doors+wiring). e2e ahora también bootea v2 headless (build + 95 frames jugando). Todo en CI.

### Nota
- Es **opt-in**: sin tocar el toggle el juego es idéntico (v1). v2 reproduce el Nivel 1; las features ricas
  (IA/quests/meta/packs) se cuelgan en fases posteriores del SDD.

---

## [v79] — 2026-06-24 — 🐛 Fix grande: la capa mobile tapaba los menús (Opciones/chat/intro)

### Arreglado
- **No se podían tocar los controles de Opciones (ni botones de menús) en dispositivos con pointer táctil**:
  `#stage` usa `transform: scale()` (fit.js) → crea su propio *stacking context*, así que el z-index de los
  overlays (z-10) es **local a `#stage`**. Pero `#touch-controls` (capa mobile, v=72) cuelga del `<body>`,
  **afuera** de `#stage`, así que su zona de apuntar (`#tc-aim`, `pointer-events:auto`) quedaba pintada **por
  encima de TODO `#stage`, incluidos los menús** → se comía los taps/clicks en la mitad derecha del panel
  (Opciones, chat, intro). Solo respondía el teclado (Escape). Pasaba en cualquier device con *coarse pointer*
  (celular, o notebook con pantalla táctil aunque uses mouse). **Probablemente explica también** los reportes
  previos de "no salía del chat" (tapaba el botón Cerrar) y "Continuar no quedaba bien" (tapaba el botón).
- **Fix**: `mobile/touch.js` ahora **oculta los controles mientras hay un overlay/menú abierto**
  (`MutationObserver` sobre intro/options/chat/endscreen) → el menú recibe los toques; durante el juego, los
  controles vuelven.

### Técnico
- Solo afecta a la capa mobile (dormida en desktop → web-smoke sin cambios). e2e + web-smoke verdes.
- ⚠️ **SIN VERIFICAR EN DEVICE REAL**: el fix (y toda la capa mobile v=72) **falta probarlo en el cel del
  usuario** — no es testeable headless. Pendiente de confirmación.

---

## [v78] — 2026-06-23 — 🐛 Fix: salir del chat con ESC + autosave durante el chat

### Arreglado
- **No se podía salir del chat con ESC**: el handler de Escape vivía solo en el `<input>` del chat, así que
  si el input perdía el foco (click en el log, o después de tocar "Decir") ESC se iba al `document` y **no
  había handler** → quedabas trabado en `state='chat'` sin poder moverte. Ahora hay un **Escape global** que
  cierra el chat tenga o no el foco el input. (El botón "Cerrar" siempre funcionó; "E" es *interactuar*, no salir.)
- **Continuar tras refresh "no quedaba bien"**: el autosave **se salteaba el estado `chat`** (solo guardaba en
  `playing`), así que si refrescabas estando en el chat, "Continuar" te devolvía a un punto viejo. Ahora el
  autosave/serialize también cubren `chat` (el jugador está quieto y la posición es válida).

### Técnico
- `game.js`: Escape global con guard `state==='chat'`; `serialize()`/`autosave()` aceptan `playing`+`chat`.
  e2e + web-smoke verdes.

---

## [v77] — 2026-06-23 — 📈 Publicidad: métricas de impresión (cliente, opt-in)

Cierre del MVP de medición de `specs/publicidad.md` del lado del cliente.

### Agregado
- **Conteo de impresiones** en `js/ads.js`: una impresión por slot **a lo sumo cada 5s** (no por frame),
  agregadas y **sin datos personales**. `Ads.stats()` las expone (debug).
- **Flush opt-in**: solo si `window.ADS_METRICS` apunta a un endpoint, hace `POST {views, ts}` cada 30s y
  al ocultar/cerrar la pestaña (`navigator.sendBeacon`). **Sin endpoint → cero red** (default), mismo molde
  que `presence.js`.

### Pendiente del SDD
- El **endpoint server** de métricas (contrato documentado en §5, reusar `presence-server/`), imágenes
  pixel-procesadas y manifiesto remoto. e2e + web-smoke verdes (sin endpoint, no hay red).

---

## [v76] — 2026-06-23 — 🛒 Publicidad: formato góndola (product placement en el chino)

Tercer formato del MVP de `specs/publicidad.md`: la marca DENTRO del super chino.

### Agregado
- **Formato `gondola`**: product placement en el súper (vista de arriba). `Ads.drawGondola(ctx, W, H)` dibuja
  un cartel de marca en coords de pantalla; lo llama `super.js` en su `draw()` con un guard `typeof Ads`
  (sin la capa, no hace nada). Slot/campaña de ejemplo: *Fideos Mamushka*.
- `ads/slots.json` admite slots con `room:"super"` y coords `px/py` absolutas (el súper es un sub-modo).

### Pendiente del SDD
- Imágenes pixel-procesadas y **métricas** de impresión (reusar `presence-server`). e2e + web-smoke verdes.

---

## [v75] — 2026-06-23 — 📢 Publicidad: formatos pantalla y fachada

Segunda pasada del MVP de `specs/publicidad.md`: más formatos de espacio publicitario.

### Agregado
- **Formato `screen`** (pantalla LED/TV): el afiche base + **scanlines** y un **barrido de brillo animado**
  (clippeado a la pantalla). Slot de ejemplo en el **arcade** (RetroByte).
- **Formato `fachada`**: cartel de local con **toldo a rayas** y marca grande. Slot de ejemplo en la calle
  (Pizza Obelisco).
- `ads/slots.json` y `ads/manifest.json` ampliados (5 slots, 5 campañas ficticias). Sigue todo aditivo:
  sin manifiesto, idéntico.

### Pendiente del SDD
- Formato **góndola** (product placement en el super chino): necesita un seam en `super.js` (sub-modo aparte).
- Imágenes pixel-procesadas y **métricas** (reusar `presence-server`). e2e + web-smoke verdes.

---

## [v74] — 2026-06-23 — 🕸️ Fase 2 del grafo: el grafo MANEJA los flags

El grafo de historia pasa de *describir* a *gobernar* las transiciones de estado.

### Cambiado
- Las 8 transiciones de historia de `game.js` (tormenta, edificio, búnker, Iorio, truco, FIFA, armas,
  chino_back) ya no hardcodean el flag: llaman a **`applyEdge(id, fallbackFlag)`**, que lee el `sets` de
  esa arista del grafo (declarado en las fichas) para decidir **qué flag cambia**. La **fuente de verdad
  de las transiciones es el grafo**: si cambia el `sets` de una ficha, cambia el efecto sin tocar `game.js`.

### Técnico
- Implementación **segura**: los *reads* de los flags quedan idénticos (un closure escribe el `let`
  externo, no hace falta un store nuevo → cero churn/regresión en las lecturas). El 2º argumento
  `fallbackFlag` es **red de seguridad** si `historia.js` no cargara (el juego progresa igual).
- e2e: chequeo **estático** de que cada arista aplicada existe y setea exactamente su flag (atrapa typos de
  id / drift del grafo). e2e + web-smoke verdes. Cierra el SDD `specs/nivel-1/historia-grafo.md` (Fase 1+2).

---

## [v73] — 2026-06-23 — 📢 Publicidad / product placement — MVP (capa aditiva)

Primer esqueleto de la monetización del SDD `specs/publicidad.md`: espacios de marca dentro del mundo.

### Agregado
- **`js/ads.js`** (capa **aditiva**, no en el e2e): lee `ads/slots.json` (espacios anclados a salas reales)
  + un manifiesto de campañas (`ads/manifest.json` o `window.ADS_MANIFEST` remoto), resuelve campaña→slot
  (ventana de fechas + rotación por peso) y dibuja un **afiche al estilo** sobre el slot (imagen lazy si
  hay, o placeholder de texto bilingüe). Etiqueta discreta "AD".
- **`ads/slots.json`** (3 espacios de ejemplo: 2 en la calle, 1 en la cueva) + **`ads/manifest.json`** con
  campañas **ficticias** (Cumbia Cola, Telo El Edén, Blue Bank) para demostrar el formato.
- Seam en `game.js`: 1 línea guardada `if (typeof Ads !== 'undefined') Ads.draw(...)`. **Sin slots/manifiesto
  o sin red, el juego anda idéntico.**

### Técnico
- En producción las creatividades/manifiesto viven **fuera del repo GPL** (o endpoint remoto). Falta del SDD:
  pantalla/fachada/góndola, imágenes pixel-procesadas y métricas (reusar `presence-server`). web-smoke sirve
  `ads/*.json` (fetch 200, sin errores). e2e + web-smoke verdes.

---

## [v72] — 2026-06-23 — 📱 Soporte mobile / touch (capa aditiva, dormida en desktop)

Primera versión de controles táctiles, como **capa aparte** que no toca el core (los 11 `js/*.js`).

### Agregado
- **`mobile/`**: `boot.js` (detecta pointer coarse y, solo ahí, inyecta el resto), `touch.js` (controles
  en pantalla) y `mobile.css` (estilos + cartel "girá el teléfono" en vertical).
- **Controles**: **joystick** izquierdo → `Input.keys` a/d/w/s (sirve para el plataformas y los modos
  vista-de-arriba); **mitad derecha** → apuntar + disparar (`Input.mouse`); botón **E** (usar) y **ESC**
  (cerrar/salir), que disparan los mismos eventos de teclado que el juego ya escucha.
- Una **sola línea** en `index.html` (`mobile/boot.js`); en desktop la capa queda **dormida** (pointer
  fino → no inyecta nada), así el juego y los tests quedan idénticos.

### Técnico
- Aprovecha el **seam de Input** (`Input.keys`/`Input.mouse` son objetos públicos mutables): la capa
  **escribe** ahí y el core responde igual, sin cambios. Dependencia en un solo sentido.
- `z-index 8`: los controles van sobre el canvas durante el juego y **debajo** de los overlays (menús/chat)
  y del ⚙. e2e + web-smoke (desktop) verdes. **Pendiente: probar en celular real** (gestos finos, notch).

---

## [v71] — 2026-06-23 — 💬 Más NPCs chateables (cuevero y tahúr)

El chat con IA tenía pocos personajes; ahora hay dos voces nuevas con persona acotada.

### Agregado
- **Cuevero chateable** en la cueva (sala 8): un arbolito "sin clientes" (`action:'chat'`, `persona:'cuevero'`)
  — desconfiado, slang porteño, indirectas sobre el blue y la AFIP. **No** es el del deal (ese sigue
  scripteado: dispara la tormenta).
- **Tahúres chateables** en la trastienda secreta (sala 9): dos naiperos (`persona:'tahur'`) que charlan de
  truco, envido y trampas con cara de santo. El Tahúr del juego de truco sigue intacto (`action:'truco'`).
- Persona **`tahur`** nueva en `js/ai.js` y en el proxy (`ai-proxy/personas.js`); **canned** locales (es/en)
  para `cuevero` y `tahur` (antes caían al genérico) → el chat offline ahora responde **en personaje**.

### Técnico
- Respeta la regla de [ia-openrouter §0]: los NPCs con DATA/acción crítica siguen scripteados; sólo se
  hacen chateables NPCs sin rol de gameplay. e2e (auditoría de assets) + web-smoke verdes.

---

## [v70] — 2026-06-23 — 🔊 Sonido ambiente por zona

Hasta ahora solo había música. Ahora cada zona tiene una **cama de ambiente** sutil debajo.

### Agregado
- **Ambiente por sala** (`Sfx.setAmbient(kind)` en `audio.js`, capa **aparte** de la música): una cama de
  ruido filtrado en loop con "respiración" lenta. Cuatro climas: **calle** (murmullo de ciudad),
  **viento** (post-tormenta / pisos en ruina, desolado, con ráfagas), **cueva** (rumor grave de subsuelo)
  y **recital** (gentío en Cemento). Se cruza-funde al cambiar de sala; se corta al ganar/morir.

### Técnico
- `game.js`: helper `ambientFor(room)` (zona→clima) cableado en la transición de sala + al arrancar/continuar.
  Procedural (WebAudio: buffer de ruido en loop + biquad + LFO de volumen), sin assets. e2e + web-smoke verdes.

---

## [v69] — 2026-06-23 — 🚪 La puerta trasera del chino entra al grafo de pistas

Playtest: si disparabas la tormenta de una, el linyera solo te mandaba a Iorio (camino circular) y nunca
te decía que el chino tiene una **puerta de servicio** al fondo de la cueva. Ahora el grafo conoce las dos.

### Agregado
- **Arista `chino_back`** en el grafo de historia (autoría en `super-chino.md` → `gen-historia.mjs` →
  `historia.js`, **12 aristas**): la **segunda forma** de entrar al chino post-tormenta. Por **cercanía**,
  el linyera te manda a la **puerta trasera** cuando estás en la cueva, y a **Iorio** cuando estás en Cemento.
- La pista trasera desaparece al **entrar** (`chinoEntered`) o si ya abriste el **frente** con Iorio.

### Técnico
- Flag espejo `chinoEntered` (1 línea en `enterSuper`: lo setea **cualquier** puerta del chino post-tormenta;
  en `historiaState`, `serialize`/`restore` → persiste en el guardado). Fase 1 sigue **solo describiendo**.
- e2e: nuevas aserciones (cueva→`chino_back`, Cemento→`chino_iorio`, y que `chino_back` se resuelve al entrar
  / con el frente abierto). e2e + web-smoke verdes.

---

## [v68] — 2026-06-23 — 💼 Premio real en el edificio abandonado (el tesoro de los linyeras)

El edificio dejó de ser solo loot de monedas: ahora la trepada tiene un **premio de verdad**.

### Agregado
- **Tesoro de los linyeras** en el búnker: el **linyera mayor** te entrega un **maletín de dólares** (+150 🪙),
  un cajón de munición (+40) y una **mejora PERMANENTE del escupitajo** (daño 14→24, para todo el run).
  Solo si sos **gurú** (tras robar el tótem del piso 19 → `bunkerUnlocked`) y **una vez por partida**.
  Le da sentido a alimentar a los borrachines → trepar 20 pisos → tótem → búnker.
- Nuevo **hito** en la pantalla de fin: *Reclamaste el tesoro de los linyeras* (ahora 11 hitos).

### Técnico
- `player.spitDmg` (default 14, lo lee `player.shoot`); el tesoro lo sube a 24. Persiste en el guardado.
- `grabTesoro` + flag `tesoroTaken` (en `reset`/`serialize`/`restore`) + `action:'tesoro'` en el búnker
  (NPC + decor `maletin`). i18n `g.tesoro.*` / `g.prompt.tesoro*` / `g.hito.tesoro` (es/en, paridad ok).
- e2e (auditoría de los 38 cuartos) + web-smoke verdes.

---

## [v67] — 2026-06-23 — 🏆 Pantalla de fin con stats (resumen de la partida)

Ganar o morir ya no muestra solo texto: ahora hay un **resumen** de cómo te fue.

### Agregado
- **Resumen de la partida** en la pantalla de fin (`#endStats`): guita en el bolsillo, días sobrevividos
  en el loop, cosas juntadas (pickups), y **Hitos N/10** con un **checklist** ✓/· de los 10 hitos del nivel
  (tormenta, edificio, búnker, Iorio, truco, FIFA, Mega Drive, Cemento, armado, portal). El portal aparece
  tildado solo si ganaste.
- i18n completo (es/en): `g.stats.*` + `g.hito.*` (paridad verificada).

### Técnico
- `gameStats(won)` + `renderStats(won)` en `game.js`; se llaman desde `win()`/`die()`. Reusa el estado que
  ya existe (flags + `states[].pickups`), no agrega tracking nuevo. Estilos `.end-stats*` en `style.css`.

---

## [v66] — 2026-06-23 — 🔥 Pulido del loop: fuego que parpadea + ninjas al pogo

Dos detalles visuales del loop post-tormenta que estaban pendientes (antes eran estáticos / solo texto).

### Agregado
- **Fuego animado** en la barricada del chino: los tachos ahora tienen **llamas que titilan** y se mecen
  (`drawFlame` en `game.js`, dibujadas sobre el sprite con resplandor y `globalCompositeOperation:'lighter'`,
  desfasadas entre los dos tachos). Reemplaza el fuego pintado fijo del sprite.
- **Ninjas yéndose al pogo**: cuando le das FALOPA a **Iorio** y toca *Pibe Tigre*, en **Cemento** entran
  corriendo **3 ninjas** hacia el escenario (siluetas con vincha roja y katana, piernas animadas;
  `drawNinjaRunners`/`drawRunner`, FX transitorio de ~4s que se desvanece). Antes el frente del chino
  simplemente se abría sin verse nada.

### Técnico
- Todo **procedural** (sin sprites ni sistema de entidades nuevos): se dibuja en `render()` con el reloj
  `time`. El FX de ninjas usa `ninjaRunT`/`ninjaRunRoom` (se setean en `giveIorio`, se limpian en `reset`).
- Capa de render pura: no toca lógica ni flags. e2e + web-smoke verdes.

---

## [v65] — 2026-06-23 — 💾 Guardado automático (continuar partida)

El progreso ya no se pierde al recargar: se autoguarda en `localStorage` y la intro ofrece **Continuar**.

### Agregado
- **Guardado automático** (`js/save.js`, capa **aditiva**): cada ~5s jugando se persiste un snapshot del
  estado en `localStorage` (clave `tormenta-solar-save-v1`). Sin `localStorage` o sin la capa, el juego
  anda exactamente igual.
- **Botón "Continuar"** en la intro (`#continueBtn`, i18n `intro.continue`), visible solo si hay partida
  guardada; retoma exactamente donde dejaste (sala, posición, vida/inventario, todos los flags de historia,
  pickups levantados, limosnas/falopa consumidas). Verde para distinguirlo de ENTRAR.
- El guardado **se borra** al ganar (`win`) o morir de verdad (`die`); morir en el loop de supervivencia
  no lo toca (volvés al loop anterior como siempre).

### Técnico
- Seam mínimo en `game.js`: `serialize()` (snapshot plano) / `restore(snap)` / `continueGame(snap)` +
  `autosave()` en el loop; se expone `window.Game = { serialize, continueGame }`. El estado sigue privado.
- No se persisten los sub-modos (arcade/super/disquería): al cargar retomás parado en la sala.
- e2e: nuevo test de **round-trip** `serialize`→`continueGame`→`serialize` (vía `window.Game`). web-smoke OK.

---

## [v64] — 2026-06-22 — 🧭 Linyera ERRANTE: aparece cerca de lo que no hiciste (Fase 1 completa)

Último ítem del grafo de historia (Fase 1): el linyera ya no está fijo en la calle.

### Agregado
- **Linyera errante** (`placeRoamingOraculo` en `game.js`): al entrar a una sala, si hay una arista de
  **frontera en ese lugar** (`currentAt()`), aparece un linyera cerca del jugador para tirar la pista de
  *eso*. Uno solo a la vez (se mueve con vos); en la calle queda el fijo de siempre. Inyección **aditiva**
  en `spawnIn`, sin tocar `Level.build()`. Saludo i18n `g.oraculo.greet`.

### Cambiado
- Cache `v=63`→`v=64`.

### Notas
- **Fase 1 del grafo de historia COMPLETA.** Futuro opcional: Fase 2 (que el grafo *maneje* los flags).

---

## [v63] — 2026-06-22 — 🧭 Pistas: el linyera las dice con su voz (grounding del chat IA)

El chat IA del linyera ahora se **apoya en la pista del grafo** (grounding): el LLM le pone la voz, la ruta
sale del `HintEngine`.

### Agregado
- **`AI.chat(npc, message, history, grounding)`**: la pista recuperada se inyecta en el system prompt
  (`groundDirective`, es/en) — *"decí ESTO con tus palabras, no inventes otros caminos ni datos"*. También
  se manda al proxy (`grounding` en el body).
- **`game.js`**: al chatear con el linyera, la pista del nivel actual se pasa como grounding; si la
  respuesta sale **local** (sin IA), se muestra la pista explícita (💡) como garantía.

### Cambiado
- Cache `v=62`→`v=63`.

### Notas
- Con esto, de la Fase 1 del grafo de historia queda **solo** el **spawn errante** del linyera (SDD §7).

---

## [v62] — 2026-06-22 — 🧭 Pistas: aristas secundarias (el linyera ayuda en TODO)

Segunda pasada del grafo de historia: el linyera ahora también guía las ramas secundarias, no solo el
camino crítico.

### Agregado
- **5 aristas nuevas** (` ```hist ` en las fichas): `megadrive` (super), `fifa` (arcade), `cemento_ticket`
  (disquería), `armas` (galería), `loop` (búnker). **11 aristas en total.**
- **Prioridad** en `HintEngine`: el camino crítico (`pri` default 10) gana al secundario (`pri` 20+); la
  cercanía sigue eligiendo lo del lugar donde estás.
- `historiaState()` ampliado (`hasMegaDrive`, `fifaWon`, `hasCementoTicket`, `armado`, `sleptOnce`) y
  `currentAt()` con más lugares (super/galería/búnker). Flag espejo `armado` en `game.js` (no refactor).
- e2e: asserts de cercanía (super→megadrive) y precondición (FIFA requiere Mega Drive).

### Cambiado
- Cache `v=61`→`v=62`.

### Notas
- Fase 1 casi completa. Pendiente (SDD §7): **spawn errante** del linyera y **grounding** del chat IA.

---

## [v61] — 2026-06-22 — 🧭 Grafo de historia + linyera-oráculo de pistas (Fase 1)

Primera implementación del SDD [`historia-grafo.md`](specs/nivel-1/historia-grafo.md): el **linyera
filósofo** ahora **te tira pistas que dependen de en qué punto de la historia estás**, sin spoilear de
una. Capa **aditiva** (sin esto, el juego anda igual); el grafo **solo describe** (lee los flags que
`game.js` ya maneja, no los toca).

### Agregado
- **`tools/gen-historia.mjs`**: ensambla el grafo desde bloques ` ```hist ` (JSON) declarados en las
  fichas (`personajes/`+`edificios/`) → escribe `js/historia.js`. Validación: ids únicos, sin ciclos.
- **`js/historia.js`** (generado): 6 aristas del **camino crítico** (`tormenta`, `edificio`, `bunker`,
  `chino_iorio`, `truco`, `portal`), cada una con precondición/efecto y **pistas es+en × 4 niveles**.
- **`js/hint-engine.js`** (`HintEngine`): dado el estado (flags) + lugar + insistencia, devuelve la
  próxima pista de la **frontera**, por **cercanía** y con **spoiler escalado** (0 frase loca → 3 directo).
- **Linyera enchufado**: al hablarle tira una pista críptica; cada repregunta la aclara más (hasta
  ponerse directo). Sabe qué hiciste y qué no.
- **e2e**: valida el grafo + el motor (frontera, cercanía cueva→tormenta, aristas hechas, fin sin pistas).

### Cambiado
- Cache `v=60`→`v=61`.

### Notas
- Fase 1 / camino crítico. Pendiente (en el SDD §7): aristas secundarias, **spawn errante** del linyera y
  **grounding** del chat IA con la pista.

---

## [v60] — 2026-06-22 — 🌎 i18n: `Dialogos.en` completo + glosario de transcreación

Cierre de los pendientes opcionales de i18n (menos el 3er idioma).

### Agregado
- **`js/dialogos.js`**: se completó el último pool en inglés que faltaba (`linyera_llanto`, 8 líneas
  transcreadas) → **9/9 pools llenos en `es` y `en`**. (Antes caía al fallback `g.linyeraCry` de 4 líneas.)
- **`specs/glosario-transcreacion.md`** (NUEVO): fuente única de las decisiones es-AR → inglés —
  nombres propios que se dejan igual, mapeo canónico de términos (guita→cash, falopa→gear, forros→rubbers,
  pibe→kid, etc.) y notas de tono. Referenciado desde `idiomas.md`, `ia-openrouter.md` y el índice de specs.
- **`tools/gen-dialogos.mjs`**: flag `OPENROUTER_ONLY=pool1,pool2` para regenerar **solo** ciertos pools
  (top-up sin tocar los demás, que `readExisting()` preserva). Útil cuando un pool cae por un 429.

### Cambiado
- Cache `v=59`→`v=60`.

---

## [v59] — 2026-06-22 — 🌎 i18n: las pantallas que faltaban (super, disquería, arcade, IA)

Un chequeo idioma por idioma encontró 4 sub-pantallas que habían quedado **en español** porque
nunca se habían cableado a la capa i18n. Ahora el juego está **realmente** entero en inglés.

### Cambiado
- **Super Chino** (`js/super.js`): mensajes, prompts y labels del canvas (góndolas, sectores, CAJA,
  CHANGUITO, SALIDA, diálogos del chino y los ninjas) pasan por `T()`. Las categorías quedan como
  **id interno estable** y se traducen al mostrar (`sup.cat.*`).
- **Disquería** (`js/vinilos.js`): intro, diálogos del punk, banner, época y SALIDA por `T()` (acá el
  helper se llama `TR()` porque `create()` ya usa una coordenada local `T`).
- **Arcade** (`js/arcade.js`): HUD (`PUNTOS/VIDAS`), banners (`¡GANASTE!/GAME OVER/PERDISTE`), Street
  Fighter y **todo el Truco** (envido, quiero/no quiero, parda, pozo, marcador). Se conservan los
  términos del truco (`truco`, `envido`) y las iniciales de los palos (E/B/O/C).
- **Chat IA en ⚙ Opciones** (`js/ai.js`): estado del chat, validación de modelo y errores
  (401/404/429/timeout) por `T()`.
- **Catálogos**: +~120 claves (`sup.*`, `vin.*`, `arc.*`, `ai.*`) en `game.es.js`/`game.en.js`.
  **Paridad 263/263** (verificada).
- Cache `v=58`→`v=59`.

### Notas
- Verificado renderizando las tres pantallas con `I18n` en inglés (texto dibujado en EN). e2e
  (incl. sub-modos y chino) y web smoke en verde.

---

## [v54–v58] — 2026-06-22 — 🌎 Multi-idioma: el juego entero en inglés

Soporte multi-idioma (español rioplatense ⇄ inglés) para que lo jueguen angloparlantes. `es-AR` es la
**fuente**; el inglés es **transcreación** (no traducción literal: el humor porteño no se rompe). Capa
aditiva, mismo ethos que `config.js`/`fit.js`. Spec: [`specs/idiomas.md`](specs/idiomas.md) (source of
truth). *(Las versiones v34–v53 no están detalladas acá; ver `ROADMAP.md` y la memoria del proyecto.)*

### Agregado
- **Runtime i18n** (`js/i18n.js`): `I18n.t(key, params)` (fallback idioma→es-AR→clave), `I18n.tList(key)`
  (líneas al azar), `I18n.dict(pool)` (diálogos por idioma), `I18n.apply()` (recorre `[data-i18n]` /
  `[data-i18n-attr]`), `I18n.set(lang)` (cambia en vivo y persiste).
- **Catálogos**: UI (`js/lang/es.js`/`en.js`), narración de `game.js` (`js/lang/game.es.js`/`game.en.js`,
  se mergean con `Object.assign`) y traducción de `level.js` (`js/lang/level.en.js`, mapa es→en + reglas
  para nombres dinámicos). **Paridad 149/149 claves** UI+narración (verificada).
- **Selector de idioma** en ⚙ Opciones (`#opt-lang`), cambia en vivo sin recargar.
- **Diálogos de NPC por idioma** (`Dialogos[es|en][pool]`): `tools/gen-dialogos.mjs` ahora es multi-idioma
  (`OPENROUTER_LANGS=es,en`, prompt de transcreación). `js/dialogos.js` reestructurado. (`en`: 8/9 pools.)
- **Chat IA en el idioma activo** (`js/ai.js`): directiva de transcreación en el system prompt + canned
  en inglés (`FALLBACK_EN`).

### Cambiado
- **Resolución del idioma** (v56): `?lang` → `localStorage(ts_lang)` (lo que elegís en Settings) →
  `navigator.language` (español→`es-AR`; **cualquier otro idioma no soportado → inglés**) → inglés.
- **`game.js`**: toda la narración (~90 `setMsg`/prompts/fin/labels/arcade/música) pasa por `T()/TL()`.
- **`level.js`**: **no se tocó** — sus strings quedan en español como **id interno estable** (los regex
  `/Búnker/`,`/Truco/`,`/Garbarino/` y el wiring por `name` siguen intactos); se traducen sólo al mostrar
  vía `TX()` → `js/lang/level.en.js`.
- Meta no-cache en el HTML y cache `v=54`→`v=58`.

### Notas
- Verificado en navegador real (`?lang=en`): intro "SOLAR STORM", botón "HIT THE STREET", piso
  "Florida & Lavalle", mensajes en inglés. e2e y web smoke en verde.
- **Pendiente (opcional)**: regenerar `Dialogos.en` para más variedad, glosario de transcreación, y un 3er
  idioma (que conviene encarar migrando `level.js` a claves `t()`). Ver `specs/idiomas.md` §13.

---

## [v33] — 2026-06-21

### Agregado
- **Deptos de lujo** en el edificio abandonado (pisos impares): depto completo con **cocina**,
  **baño**, **living con tele**, maniquí de moda, **joyas** y un **maletín lleno de dólares**.
  Sprites procedurales nuevos en `art.js` (`cocina`, `bano`, `sofa`, `tvplasma`, `joyas`, `maletin`).
- **Linyera filósofo** (un Diógenes de Florida): si querés agarrar el maletín o las joyas, sube y
  te frena con su monólogo (*“corréte que me tapás el sol”*). Sprite `linyera` + `action:'maletin'`.
- **Presencia "jugando ahora"** (`js/presence.js`): contador de jugadores online en la intro.
  Capa **aditiva y opcional** (sin endpoint no muestra nada y el juego anda igual). Backend mínimo
  en [`presence-server/`](presence-server/README.md): server Node sin dependencias **o** Cloudflare
  Worker gratis.
- **Auto-escalado de pantalla** (`js/fit.js`): el `#stage` se escala para llenar la ventana sin
  deformar (canvas + HUD juntos). Ya no hace falta hacer zoom en el navegador.
- **Links**: la intro linkea al repo de GitHub; el README al juego online.

### Cambiado
- README / ROADMAP actualizados (depto de lujo, presencia, auto-fit, cómo correr).

### Arreglado
- El audit de assets del e2e chequeaba `d.art` (campo inexistente) en vez de `d.type`, así que
  **no validaba la decoración**. Ahora sí: detecta sprites de decor faltantes.

---

## [v31] — 2026-06-21

### Cambiado
- **Rediseño del super chino**: **changuito virtual** — agarrás de las góndolas sin pagar y
  **pagás en la CAJA**; el chino cobra solo en monedas y **da el vuelto en caramelos**. Si no te
  alcanza la guita no te fía y **no acepta caramelos** (se enoja). Si rajás sin pagar, salen **dos
  ninjas samurái** de la puerta de la familia y te echan **sin la mercadería**.
- **Rediseño de los borrachines**: cada uno tiene algo en la mano (vino/cerveza/porro) y quiere de
  regalo **fiambre / Diosa Tropical / carne** (no lo que tiene en la mano). Te tiran cosas al azar
  y la pista se revela hablándoles. Nuevo ítem **Diosa Tropical**.

### Agregado
- Test e2e del chino (changuito + pagar + vuelto + ninjas) vía `__grab/__pay/__leave/__cart`.

---

## [docs] — 2026-06-21

### Agregado
- **ROADMAP**: estrategia de **soporte mobile** como capa aditiva (sin tocar el core), apoyada en
  el seam de `js/input.js`.

---

## [GPLv3] — 2026-06-20

### Agregado
- Licencia **GNU GPLv3** (`LICENSE`).
- **PUBLICAR.md**: guía paso a paso para subir el repo y publicarlo en GitHub Pages.

---

## [v1] — 2026-06-20

### Agregado
- **Lanzamiento — Nivel 1: Florida y Lavalle.** Motor 2D side-scroller (tiles, gravedad, salto,
  cámara, iluminación, partículas, parallax). **34 salas**, NPCs, enemigos, pickups.
- EducaciónIT, Garbarino, Cemento, Chorería, **arcade** con 4 máquinas (Pac-Man, Galaga, Frogger,
  Trucotron) + truco con el Tahúr, **super chino** y **disquería** (vistas de arriba), galería,
  cuevas del dólar, **tormenta solar** y **portal final**.
- **Arte y música 100% procedurales** (sin assets externos). Música chiptune por zona.
- **Suite e2e headless** (`node tests/e2e.js`): boot + auditoría de assets + sub-modos.
