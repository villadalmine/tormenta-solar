# SDD — Truco de verdad: reglas completas, truco de a 6 (1v1 + 3v3 PvP), reclutamiento

- **Estado:** **F1 + F2 + F3(PvP 1v1) + a6(3v3 PvP con IA-fill) IMPLEMENTADOS**. Resto en fases (§12).
- **Última actualización:** 2026-06-30
- **F3 PvP HUMANO hecho (v240 · infra-41):** truco **1v1 contra OTRO jugador real** en el bodegón (no la IA). Ver §13.
- **TRUCO DE A 6 (3v3) PvP hecho (v241 · infra-42):** mesa de a 6 en el bodegón, humanos + relleno de IA, regla
  de la casa del dueño. Ver §14.
- **Tamaño:** **GRANDE** (es el feature más pesado del backlog — ver §12 mi lectura). Multi-fase.
- **F1 hecho:** `js/truco.js` (motor puro: jerarquía/envido/flor/parda, testeado e2e) + `arcade.js makeTruco`
  reescrito sobre él: cantos reales (envido/real/falta, truco/retruco/vale4, flor) con quiero/no quiero,
  IA por tier, premio en **flores** (`player.flores`). **Voces criollas:** el tahúr canta en voz alta
  (`Mensajero.cantar()`, voz es-AR).
- **F2.1 fix (v138):** **orden de tiro REAL** — la **mano alterna cada reparto** (`mano = dealNum%2`), la mano
  **tira primero** en la 1ª baza, después tira **el que ganó** la baza anterior (parda → la mano); si el tahúr es
  mano, **tira él primero** y vos respondés (`lead`/`aiLed`). Antes el jugador tiraba siempre primero (incorrecto).
  Cartas **boca arriba** en la mesa. + el tahúr **GRITA** los cantos bien porteños (TRUCO/RETRUCO/ENVIDO/FLOR,
  quiero/no-quiero) y canta victoria ("¡te ganéee, gil!", `WINW`) vía `Mensajero.cantar` (TTS, con fallback al server).
- **F2 hecho:** el tahúr **pregunta el formato** (fase 'choose': [3] mejor de 3 manos / [1] a 15 puntos);
  `makeTruco` ahora es una **PARTIDA multi-mano** (startDeal/concludeDeal, marcador de partida, falta envido
  dinámico en a15). e2e juega una partida completa en ambos formatos.
- **Falta:** tabla skill (F4, el `bias` del reparto ya está en el motor). [a6 ✅ §14 · cabarulo y Lavalle ❌ descartados]
- **Relacionado:** `js/arcade.js` (`makeTruco`, hoy un placeholder), el grafo (`historia.js`/`hint-engine.js`),
  `carteles-ia.md` (generación de excusas con NPU/GPU/cloud + el Mensajero), `nivel-1/**` (personajes).

## 1. Contexto y objetivo

Hoy el truco es un **mini-juego trucho**: decisiones con `Math.random()`, sin reglas reales, y premia en
**forros**. Lo convertimos en un **truco argentino de verdad** (envido familia, truco/retruco/vale cuatro, flor),
con **dos formatos**, un **truco de a 6 (3v3)** con reclutamiento de compañeros y una **tabla de skill** que sesga
las cartas. El premio pasa de forros a **flores**. (El "mapa nuevo Calle Lavalle" al ganar fue **descartado** — §10.)

## 2. Estado actual (lo que hay)

- `arcade.js` → `makeTruco()`: `stake`, envido random (`Math.random()<0.4`), un "truco" sin retruco/vale4, 3
  manos con `pW/aiW`, devuelve `{done, result, forrosDelta}`.
- `game.js`: `launchArcade('truco')`; al terminar (≈línea 1025) lee `result`/`forrosDelta`; en win
  `applyEdge('truco','trucoWon')` (abre la puerta del tahúr al chino, se consume al cruzar). Forros = moneda
  (`player.forros`, se gasta en shops).
- Personas con alma (chat): `filosofo, poeta, pechito, cuevero, iorio, tahur` (`ai-proxy/personas.js`). NPCs en
  el mundo: borrachines, chino, cueveros, etc.

→ Hay que **reescribir el motor** (no parchar el placeholder) y **separar** "motor de truco" de "UI/escena".

## 3. Reglas del truco (el motor real)

Baraja española de **40** (sin 8/9/comodín). 3 cartas c/u, 3 **manos** (bazas) por **ronda**.

### 3.1 Jerarquía de cartas (de mayor a menor)
1 espada (macho) > 1 basto > 7 espada > 7 oro > **todos los 3** > **todos los 2** > 1 copa/oro > **12 (rey)** >
**11 (caballo)** > **10 (sota)** > 7 copa/basto > **6** > **5** > **4**.

### 3.2 Envido (se canta en la PRIMERA mano, antes de jugar la 2ª carta)
- **Puntos:** dos cartas del mismo palo → 20 + valores de esas dos (figuras = 0, el resto su número, capado a 7).
  Sin dos del mismo palo → la carta más alta (figuras 0). Máx **33**.
- **Cadena (cantos):** `Envido` (2) → `Envido-Envido` (+2 = 4) → `Real Envido` (+3) → `Falta Envido` (los puntos
  que le faltan al puntero para ganar). Se contestan **Quiero / No quiero** (no quiero = el cantor se lleva lo
  acumulado del paso anterior). "Dos reales envido" = Envido + Real + Real, etc. Gana el de más puntos; empata el
  **mano** (el que es "mano", a la derecha del que reparte).

### 3.3 Flor (si tenés 3 del mismo palo) — **CON FLOR SIEMPRE** (decidido)
- **Flor** = 3 pts (se canta, no se juega envido si hay flor). Cadena: `Flor` → `Contraflor` → `Contraflor al
  resto`. Flor mata envido. **Se juega con flor en 1v1 Y en el truco de a 6** (es lo más fiel; la flor
  multi-jugador en el 3v3 es la lógica más pesada — ver §12).

### 3.4 Truco
- `Truco` (2) → `Retruco` (3) → `Vale Cuatro` (4). **Quiero/No quiero** (no quiero = el otro se lleva el valor
  del nivel anterior). Lo canta cualquiera en su turno.

### 3.5 Manos / parda
- Gana la ronda quien gana 2 de 3 manos. **Parda** (empate de baza): manda quien ganó la 1ª; si la 1ª fue parda,
  la 2ª; si todas pardas, el **mano**. (Tabla de parda completa en la implementación.)

## 4. Formatos + negociación con el tahúr

Al sentarte con el **tahúr**, te pregunta: **"¿jugamos a 3 manos, o el primero a 15 puntos?"**
- **A 3 manos = MEJOR DE 3 RONDAS** (decidido): se juegan rondas hasta que alguien gana 2. Rápido.
- **A 15 puntos:** partida normal (el de a 6 es a 30, §6). Falta envido usa los puntos que faltan para 15.

## 5. Premio: flores (DECIDIDO — dos monedas)

- Ganar el truco da **flores** (`player.flores`), **no** forros. `forrosDelta` → **`floresDelta`** en el
  resultado del arcade. **Flores y forros conviven** como **dos monedas separadas** con usos distintos; los
  **shops actuales siguen cobrando en forros** (no se toca la economía existente).
- El `applyEdge('truco','trucoWon')` (puerta del tahúr) se mantiene como hito existente.

### 5.1 El Cabarulo — ❌ DESCARTADO (decisión del dueño, 2026-06-30)

El sink "Cabarulo" (cabaret cirujeado: entrar pagando forros vía chat con el cafiolo + cortejar con flores a las
mujeres) **NO se va a hacer.** El dueño lo descartó. (Si en el futuro hace falta un uso para las flores, se diseña
otro sink desde cero.)

## 6. Truco de a 6 (3 vs 3) — evento aleatorio

Cada tanto, **aleatoriamente**, los que están en la mesa proponen: **"¿hacemos un truco de a seis?"**. Entonces
tenés que **reclutar 2 compañeros** (§7) para jugar 3v3.

- **Equipos:** vos + tus 2 reclutas **vs** el **tahúr + el chino + el cuevero #3** (fijos).
- **A 30 puntos.** Cartas: 3 c/u (18 de 40). Vos manejás **tu** mano; la **IA** maneja a los otros 5 (tus 2
  socios y los 3 rivales), modulada por su **skill** (§8).
- **Regla de la casa (textual del usuario):** "hasta los **15 puntos la primera mano es global**, luego jugás con
  el que tenés **en el frente**". → Interpretación a confirmar (§11): hasta 15, la baza se resuelve global entre
  los 6; pasados los 15, te enfrentás 1v1 con tu vis-à-vis. **Mecánica exacta TBD.**
- Envido/flor/truco en 6: los cantos los lleva el **pie** de cada equipo; el envido se compara por equipo (el más
  alto que cante cada bando). (Detalle de orden de cantos = parte pesada del motor.)

## 7. Reclutamiento de compañeros (itera contra TODOS los personajes)

Cuando se dispara el truco de a 6, **recorrés a los personajes** invitándolos. **Todos esperan que vos los
invites** (cambia el flujo del nivel). Respuestas:

- **Dicen SÍ siempre** (candidatos válidos): vendedor de **Garbarino**, **Iorio**, un **linyera** cualquiera, los
  **jubilados**, el **turista/gringo**, cualquiera de los **tres borrachines**. Juntás **2**.
- **Dicen NO, temático:**
  - **Chino** y el de los **cuchillos/cueveros**: "ta loco, somos de los **malos**, no rompás".
  - **Vinilero**: "no puedo, tengo el **hígado pa la mierda**".
  - **Todos los demás**: **excusas locas inventadas** para no ir.
- **Excusas con IA:** las frases-excusa se generan con el pipeline de `carteles-ia.md` (NPU/GPU/cloud) si no hay
  modelo free/pago disponible. Como esto **habilita un hito en el grafo**, hay **tiempo** para pre-generar: el
  evento puede **dispararse antes** (anticipado) para que las excusas estén listas cuando invitás. (Reusa el
  **Mensajero** `clase:'reaccion'/'ambiente'` con un tipo nuevo `excusa`.)

## 8. Tabla de skill (sesga las cartas)

A los **mejores jugadores se les reparten mejores cartas** (no es trampa visible: es "tienen mano"). Tiers:

| Tier | Quiénes | Reparto |
|---|---|---|
| **Crack** | borrachines, Iorio, linyeras, EducaciónIT, **gringo/turista** | **siempre** cartas buenas |
| **Bueno** | (resto de candidatos válidos) | mezcla **aleatoria de cartas buenas** |
| **Normal** | todos los demás | **lo que salga** |

- Implementación: tras barajar, el reparto a cada jugador se **sesga** según su tier (ej. crack = top-k de la
  baraja; bueno = sampling ponderado a cartas altas; normal = uniforme). El **rival tahúr** es crack (es el
  tahúr). Define qué tan "justo" se siente el 3v3.
- La **calidad de juego** de la IA (decisiones de envido/truco/flor) también escala con el tier (un borracho crack
  juega mejor que un normal).

## 9. Motor de IA del truco

- **Decisiones** (por jugador IA, moduladas por skill): cantar/aceptar envido según puntos; escalar
  truco/retruco/vale4 según fuerza de mano y manos ganadas; cantar flor; elegir qué carta tirar (guardar la
  alta, "robar" la 1ª, mentir/farolear según tier).
- **Reutilizable** para 1v1 y para los 5 jugadores del 3v3. Una función pura `decidir(estado, mano, tier)`.
- Sin LLM: es lógica de juego (heurísticas + un poco de azar por tier). El LLM **solo** para las **excusas** y,
  opcional, **chau-canto** floreado ("¡quiero retruco y las pelotas!") como sabor.

## 10. Calle Lavalle (Nivel 2) — ❌ DESCARTADO (decisión del dueño, 2026-06-30)

El "Nivel 2 = Calle Lavalle" (un mapa nuevo que se abría al ganar el truco; el piquete que resistió la tormenta)
**NO se va a hacer.** El dueño lo descartó. Ganar el truco se queda con los hitos que YA tiene (`trucoWon` abre la
puerta del tahúr al chino; el premio en flores). No hay nivel/zona nueva ligada al truco.
(Nota: "Florida y Lavalle" como **esquina/setting del Nivel 1** sigue igual — esto descarta solo el Nivel 2.)

## 11. Preguntas abiertas

### Resueltas (2026-06-24)
- ✅ **Flor:** **con flor siempre** (1v1 y a6).
- ✅ **Formato "3 manos":** **mejor de 3 rondas** (gana 2).
- ✅ **Monedas:** **dos separadas** — truco→**flores**; shops siguen en **forros** (no se toca la economía).
- ❌ **Cabarulo:** DESCARTADO (§5.1). **Lavalle (Nivel 2):** DESCARTADO (§10).

### Pendientes (se afinan al llegar a esa fase)
- **Regla de la casa del a6:** la mecánica de baza global/1v1 + umbral 10 está IMPLEMENTADA (§14) en `bazaMode`, a
  validar fino en playtest.
- **Roster** de invitables: faltan entidades (jubilados, turista/gringo, garbarino, vinilero) → crearlas con el
  template de entidades (para el reclutamiento F6, si se hace).

## 12. Mi lectura del SDD (cómo lo veo)

- **Es ambicioso y bueno**, pero es **el feature más grande del juego**, no un sprint. Lo realista es **partir en
  fases chicas y jugables**, no todo junto:
  1. **F1 — Motor de truco 1v1 REAL** (jerarquía, envido familia, truco/retruco/vale4, manos/parda; flor opcional)
     reemplazando `makeTruco`, con la IA `decidir()`. **Es el cimiento de todo** y ya mejora el juego solo.
  2. **F2 — Formatos** (3 manos / a 15) + **negociación con el tahúr**.
  3. **F3 — Premio flores** ✅ (las flores se acumulan; sin sink — el cabarulo se descartó).
  4. **F4 — Tabla de skill** (sesgo de reparto + nivel de IA por tier). Aplica a 1v1 ya.
  5. **F5 — Truco de a 6** ✅ HECHO como PvP+IA-fill (§14).
  6. **F6 — Reclutamiento** (roster + sí/no temático + **excusas con NPU/GPU/cloud** vía Mensajero) — opcional, si se hace.
  7. ~~**F7 — Calle Lavalle**~~ ❌ DESCARTADO (§10).
- **Riesgos:** (a) **se eligió con flor siempre** → la **flor multi-jugador en el 3v3 es la lógica más cara** del
  proyecto; mitigación: el motor y el cálculo de flor/envido se construyeron y testearon **primero en 1v1** y recién
  se generalizaron a 6, reusando el mismo núcleo; (b) crear **entidades nuevas** para el reclutamiento (jubilados,
  turista, garbarino, vinilero), sólo si se hace F6.
- **Lo que ya juega a favor:** el **grafo + applyEdge + Mensajero** ya existen → los hitos y las excusas encajan
  limpio. El motor de truco es **puro** (testeable con e2e sin render).
- **Recomendación:** arrancar por **F1 (motor 1v1 real)** — es autónomo, testeable, y todo lo demás se apoya ahí.

## 13. F3 — TRUCO PvP HUMANO-vs-HUMANO (IMPLEMENTADO, v240 · infra-41)

Truco **1v1 contra otro jugador real** en el bodegón top-down (multijugador §F3). El oponente ya **no es la IA**:
cada carta/canto/respuesta del rival viaja por la red.

- **Disparo (UX):** en el bodegón te acercás a un peer **sentado** en una mesa → se resalta → **[E] invitar al
  truco**. Al otro le aparece un overlay (`[E] aceptar · [Esc] no`). Aceptado → ambos entran al sub-modo `trucopvp`.
- **Modelo host-autoritativo:** `host = min(myPid, peerPid)` (ambos lo computan igual). El host corre la partida
  (tiene las DOS manos), valida cada acción y empuja una **vista por jugador** que **nunca** incluye la mano del
  rival (anti-trampa de cliente vanilla). El guest solo manda intenciones y refleja la vista que recibe.
- **Transporte:** el **mismo whisper del salón** (`Salon.whisper`/`onWhisper`, relay SSE sin autoridad). Mensajes
  JSON con `t`: `tk-inv`/`tk-ok`/`tk-no` (handshake), `tk-hello` (guest listo → re-push), `tk-act` (acción del
  guest), `tk-view` (vista del host), `tk-bye` (abandono). Cap del whisper subido (cliente 200→700; proxy `msg`
  200→700 · body 800→1400 · rate-limit 700→250ms) para que entren las vistas JSON. El salón **nunca se desconecta**
  durante el match (heartbeat `Salon.pos` propio); al terminar se vuelve al bodegón top-down.
- **Reglas:** reusa el motor puro `Truco` + la lógica de `makeTruco` (mismos `envQ/envN/trucoQ/trucoN`, faltaPts,
  "el envido está primero", parda). **Con flor siempre** (auto al repartir, sin contraflor). Formato **mejor de 3
  manos**. Premio en **flores** al ganador (`floresAcc`).
- **Archivos:** `js/truco-net.js` (motor host-autoritativo PURO, testeable: `match()/start/act/viewFor`),
  `js/truco-pvp.js` (escena host/guest), `js/bodegon.js` (targeting de peer + `invitePid`), `js/game.js`
  (handshake + ruteo whisper `tk-*` + estado `trucopvp` + premio), `js/salon.js` + `ai-proxy/server.js` (cap whisper).
- **Tests:** e2e — 12 partidas del motor (sin sesgo estructural host/guest) + escena host/guest sobre transporte en
  memoria terminan consistentes (1 win / 1 lose, flores al ganador). Paridad i18n: 31 claves `g.trucopvp.*` ES≡EN.
- **Degradación:** sin red / EventSource / si el rival se va → el match cierra limpio (`tk-bye` → "se fue el rival",
  sin penalidad de flores); el bodegón sigue 100% jugable. Capa aditiva con `typeof` guards.

### 13.1 Deuda de F3 (v1 → futuro)
- **Host malicioso** podría trampear (relay sin autoridad) — fuera de alcance v1, igual que el resto del
  multijugador. Mitigación futura: validación cruzada / autoridad en el server.
- **Reconexión dura:** si el rival cierra la pestaña sin `tk-bye`, el que queda sale con `Esc` (no hay watchdog por
  timeout todavía).
- **Truco de a 6 PvP** (3v3 humano) ✅ HECHO (§14). El **cabarulo** y **Calle Lavalle** quedaron ❌ **descartados** (§5.1, §10).

## 14. TRUCO DE A 6 (3v3) PvP — IMPLEMENTADO (v241 · infra-42)

3v3 multijugador real en el bodegón, **desacoplado del gate del cuevero** (el de-a-6 single-player de §6/`resolveTrucoSeis`
sigue existiendo aparte; aquel es abstracto). Decisiones del dueño: **mesa de a 6 en el bodegón**, **relleno con IA**
(humanos presentes + bots IA llenan los asientos vacíos → jugable solo o con gente, escala a 6 humanos).

### 14.1 La regla de la casa (interpretación implementada — a validar en playtest)
Toda la mecánica de bazas vive en `bazaMode(bazaIdx, scoreMax)` (en `js/truco-net6.js`) → un solo lugar para corregir.
- **Equipos alternados:** A = asientos {0,2,4}, B = {1,3,5}; "el de enfrente" = `(seat+3)%6` (siempre del otro equipo).
- **Baza 1 = GLOBAL:** tiran los 6 rotando por turno; la carta más alta gana la baza **para su equipo**.
- **Baza 2 = 1v1:** cada uno vs su vis-à-vis; el equipo que gana **2 de 3** duelos cruzados se lleva la baza.
- **Baza 3 = GLOBAL** (desempate).
- **Umbral 10:** si algún equipo llegó a **10 puntos**, de ahí en más **todas** las bazas son GLOBAL.
- Gana la **mano** el equipo con 2 de 3 bazas. **Partida a 15.** Envido/flor **por equipo** (el más alto de cada bando).

### 14.2 Arquitectura (reusa el host-autoritativo del F3)
- **Host = el que se sienta:** corre TODA la partida (las 6 manos), valida las acciones de los humanos (por whisper) y
  **maneja los asientos IA** por heurística (`Truco.aiPlayCard`/`aiAcceptEnvido`, con delay para que se vea). Empuja una
  **vista por jugador humano** que solo revela SU mano (las cartas jugadas son públicas).
- **Lobby:** al sentarte (`bodegon.js` → `sit6`), el host manda `t6-inv` a todos los peers del bodegón (~8s). Los que
  aceptan (`t6-join`) ocupan asientos humanos; los vacíos se llenan con IA; el host manda `t6-start{seat,nicks}` a cada
  uno y crea la escena. Si nadie acepta → vos + 5 IA.
- **Mensajes** (JSON por el whisper del salón): `t6-inv/join/start/hello/act/view/bye`. El host trackea `seatToPid`/
  `pidToSeat`. Cap del whisper subido 700→900 (las vistas de a6 llegan a ~765 chars).
- **Archivos:** `js/truco-net6.js` (motor PURO), `js/truco-pvp6.js` (escena host/guest), `js/bodegon.js` (mesa fija
  "TRUCO 6" + `get sit6`), `js/game.js` (lobby/matchmaking + ruteo `t6-*` + estado `trucopvp6` + premio).

### 14.3 Watchdog de reconexión (cierra la deuda fina del F3)
Un jugador que cierra la pestaña deja de mandar `Salon.pos` → el relay lo poda (~35s) → desaparece de `Salon.getPeers()`.
El host lo detecta (`trucoPeerGone`) y: en **a6** lo reemplaza un **bot IA** (`dropToAI`, la partida sigue); en **1v1**
cierra el match limpio. Reusa la presencia del salón (sin protocolo de ping nuevo). Cierra "reconexión dura por timeout".

### 14.4 CONTRAFLOR en 3v3 — ✅ IMPLEMENTADO (v331)
Antes la flor se resolvía **automática al repartir** (+3 por flor, sin canto). Ahora, con flor en **AMBOS** equipos, se
abre un **canto interactivo** (mismo mecanismo `pending` del envido), host-autoritativo:
- **Una sola flor** (un equipo) → sigue **+3 automático** (mata el envido). Sin rival, no hay contra.
- **Flor en los dos equipos** → `pending {kind:'flor', level, by, responder}` al repartir (el 1er florista de cada equipo
  desde la mano). El responder puede **escalar** (`contraflor` L2 / `contraflor al resto` L3), **[Q]uiero** (se comparan
  las flores: el equipo de **mayor flor** se lleva el pozo) o **[N]o** (se achica → el que cantó suma el "no").
- **Valores** (regla de la casa, `florQ`/`florN` en `truco-net6.js`, a ajustar en playtest): flor **3** · contraflor **6**
  · al resto = **falta** (`TARGET − scoreMax`). "No": L1 **3**, contraflor **4**, al resto **6**, al que cantó.
- **IA**: responde por la fuerza de SU flor (no ve la rival) — escala con flor ≥32, quiere con ≥24, si no se achica.
- **Motor** `truco-net6.js`: `resolveFlor`, `canto('contraflor'|'contraflorresto')`, `respond` flor, `aiAct` flor,
  `noteFor` `florNo`. **Escena** `truco-pvp6.js`: tecla **[F]** escala la flor, voz "¡CONTRAFLOR!". i18n `g.truco6.respond.flor`
  + `note.florNo{You,Opp}` (ES≡EN). e2e: los 3 caminos (quiero→6, no→3, al resto→falta) deterministas (seed 23) + las 20
  partidas all-IA no se traban con la flor interactiva.

### 14.5 Deuda de a6 (v1 → futuro)
- **Host malicioso** podría trampear (relay sin autoridad) — fuera de alcance v1.
- La **regla de la casa** es mi interpretación de lo que pidió el dueño; está toda en `bazaMode`/`florQ`/`florN` para ajustar tras playtest.
- Cantos: el ping-pong de respuesta es entre dos asientos representatives (uno por equipo), no "cualquiera del equipo rival".
- **Playtest pendiente:** validar el contraflor con 2+ humanos reales (el motor está testeado headless; la escena PvP no).
