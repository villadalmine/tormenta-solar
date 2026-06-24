# SDD — Truco de verdad: reglas completas, truco de a 6, reclutamiento y Calle Lavalle

- **Estado:** Draft
- **Última actualización:** 2026-06-24
- **Tamaño:** **GRANDE** (es el feature más pesado del backlog — ver §12 mi lectura). Multi-fase.
- **Relacionado:** `js/arcade.js` (`makeTruco`, hoy un placeholder), el grafo (`historia.js`/`hint-engine.js`),
  `carteles-ia.md` (generación de excusas con NPU/GPU/cloud + el Mensajero), `nivel-1/**` (personajes).

## 1. Contexto y objetivo

Hoy el truco es un **mini-juego trucho**: decisiones con `Math.random()`, sin reglas reales, y premia en
**forros**. Lo convertimos en un **truco argentino de verdad** (envido familia, truco/retruco/vale cuatro, flor),
con **dos formatos**, un **truco de a 6 (3v3)** con reclutamiento de compañeros, una **tabla de skill** que sesga
las cartas, y al ganar **se abre un mapa nuevo: Calle Lavalle**. El premio pasa de forros a **flores**.

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

## 5. Premio: flores + el Cabarulo (DECIDIDO — dos monedas)

- Ganar el truco da **flores** (`player.flores`), **no** forros. `forrosDelta` → **`floresDelta`** en el
  resultado del arcade. **Flores y forros conviven** como **dos monedas separadas** con usos distintos; los
  **shops actuales siguen cobrando en forros** (no se toca la economía existente).
- El `applyEdge('truco','trucoWon')` (puerta del tahúr) se mantiene como hito existente.

### 5.1 El Cabarulo (el sink, usa LAS DOS monedas + el chat IA)

Un **local nuevo** (cabaret cirujeado). Las dos monedas tienen rol:

- **ENTRAR = forros (vía charla absurda con el cafiolo/patovica).** El de la puerta te quiere cobrar **mucha
  plata** para entrar; **no la tenés** → se abre una **charla con IA** (el cafiolo es una **persona chateable
  nueva**) que **itera absurda** hasta que cede: *"bueno pibe, tenés forros… dame **5** y entrás."* → pagás
  **5 forros** y entrás. (Es un **gate por chat**: reusa el sistema de personas/`ai.js`; el desbloqueo se dispara
  cuando la charla llega al acuerdo, no por un precio fijo en pantalla.)
- **ADENTRO = flores (cortejo).** Les **das flores a las mujeres** del cabarulo (para **no perder plata**) → las
  chicas **se enamoran** de vos. Pero el **cafiolo** te **echa** porque "**no las dejás laburar**" → te saca
  cagando. (El loop interno fino: **TBD**, "después vemos mejor qué pasa adentro".)
- **Personajes nuevos:** el **cafiolo** (persona chateable, gate de entrada) + las **mujeres** del cabarulo
  (receptoras de flores). Entidades a crear.

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

## 10. Grafo + Calle Lavalle (mapa nuevo)

- **Ganar el truco** (el de a 6, o el 1v1 según §11) **habilita un hito** y **abre Calle Lavalle**: resulta que
  había un **piquete** que resistió **con o sin tormenta**. Lavalle = **caos** (contenido **TBD**, "después
  definimos").
- En el grafo: arista nueva `truco6_win` (o se reusa `trucoWon`) con `sets:{lavalleOpen:true}`; el mapa Lavalle
  se carga como nivel/zona nueva (probable `specs/nivel-2-lavalle.md` + datos en `level-data.js`/`mundo.js`).
- **Si PERDÉS** la partida: podés ir a **buscar otros jugadores** (re-reclutar) y reintentar.

## 11. Preguntas abiertas

### Resueltas (2026-06-24)
- ✅ **Flor:** **con flor siempre** (1v1 y a6).
- ✅ **Formato "3 manos":** **mejor de 3 rondas** (gana 2).
- ✅ **Monedas:** **dos separadas** — truco→**flores**; shops siguen en **forros** (no se toca la economía).
- ✅ **Cabarulo (§5.1):** local nuevo; **forros = entrar** (charla absurda con el cafiolo hasta "dame 5 forros");
  **flores = cortejar** a las mujeres (se enamoran → el cafiolo te echa por "no las dejás laburar").

### Pendientes (se afinan al llegar a esa fase)
- **Truco de a 6 "primera mano global hasta 15":** mecánica EXACTA de "baza global" vs "1v1 con el de enfrente"
  (default tentativo: hasta 15 se compara la baza entre los 6; pasados 15, 1v1 con tu vis-à-vis). **Confirmar en F5.**
- **Disparo del truco de a 6:** probabilidad por loop/visita + cuánto se anticipa para pre-generar excusas
  (default: se dispara al entrar a la sala del tahúr, con un margen para la NPU).
- **Roster** de invitables y del cabarulo: faltan entidades (jubilados, turista/gringo, garbarino, vinilero,
  cafiolo, mujeres) → crearlas con el template de entidades.
- **Adentro del cabarulo:** el loop fino post-cortejo.
- **Lavalle:** todo el contenido del nivel 2.

## 12. Mi lectura del SDD (cómo lo veo)

- **Es ambicioso y bueno**, pero es **el feature más grande del juego**, no un sprint. Lo realista es **partir en
  fases chicas y jugables**, no todo junto:
  1. **F1 — Motor de truco 1v1 REAL** (jerarquía, envido familia, truco/retruco/vale4, manos/parda; flor opcional)
     reemplazando `makeTruco`, con la IA `decidir()`. **Es el cimiento de todo** y ya mejora el juego solo.
  2. **F2 — Formatos** (3 manos / a 15) + **negociación con el tahúr**.
  3. **F3 — Premio flores** + definir el sink "cabarulo" (o dejar flores acumulables).
  4. **F4 — Tabla de skill** (sesgo de reparto + nivel de IA por tier). Aplica a 1v1 ya.
  5. **F5 — Truco de a 6** (3v3 a 30, regla de la casa, IA de 5 jugadores). **La parte más pesada.**
  6. **F6 — Reclutamiento** (roster + sí/no temático + **excusas con NPU/GPU/cloud** vía Mensajero) + **hito**.
  7. **F7 — Calle Lavalle** (mapa nuevo; diseño aparte).
- **Riesgos:** (a) **se eligió con flor siempre** → la **flor multi-jugador en el 3v3 es la lógica más cara** del
  proyecto; mitigación: el motor `decidir()` y el cálculo de flor/envido se construyen y testean **primero en
  1v1** (F1) y recién se generalizan a 6 (F5), reusando el mismo núcleo; (b) crear **muchas entidades nuevas**
  (jubilados, turista, garbarino, vinilero, **cafiolo + mujeres del cabarulo**); (c) Lavalle es **otro nivel
  entero** (alcance grande aparte).
- **Lo que ya juega a favor:** el **grafo + applyEdge + Mensajero** ya existen → el hito, las excusas y el
  desbloqueo de Lavalle encajan limpio. El motor de truco es **puro** (testeable con e2e sin render).
- **Recomendación:** arrancar por **F1 (motor 1v1 real)** — es autónomo, testeable, y todo lo demás se apoya ahí.
