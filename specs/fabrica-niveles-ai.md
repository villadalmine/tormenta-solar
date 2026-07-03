# SDD — La "máquina de hacer chorizos": contás una historia → la IA arma el juego (NORTE)

- **Estado:** ✅ **COMPLETO — A0 CERRADO (v207-209) + A0-DEEP CERRADO (v236-242):** cache-first, look propio por motif, enemigos por vibe, props ANCLA, salas=BEATS del relato (hand-authored + IA), beats en el spinoff top-down. Único futuro: mejores beats de la IA (depende del modelo). *(histórico v162:)* el generador se DISPARA in-game. Te colás a la **trastienda del
  chino durante el RAID** (mientras el chino corre en pánico hablando por globito) → se **genera un nivel surreal
  temático** y lo corre el sub-modo `Spinoff`. Generador `js/nivelai.js` (molde = `THEMES` data) + escena
  `js/spinoff.js` + endpoint proxy `POST /nivel-ai` (la IA autora nombre/intro/frases, con **fallback estático**).
  Temas v1: `super-rasca`, `taller-esclavo`, `comida-podrida`, `muralla-skate`. Falta el pipeline de autoría
  COMPLETO (historia→nivel jugable de N salas con el motor real + auditoría). Es el GOAL al que apunta todo v2.
- **Relacionado:** [`modelo-de-entidades.md`](modelo-de-entidades.md) (motor data-driven + AI-authorable, §6¾/RF-22),
  [`quest-mundo-ai.md`](quest-mundo-ai.md) (mundo on-the-fly por IA), [[v2-engine-principios]], `levels/level.schema.json`.

## 1. La idea (del dueño, textual)
*"La base del juego es crear diferentes escenarios. Así puedo tener la máquina de hacer chorizos: yo cuento una
historia, y vos vas viendo dónde poner cada cosa y me creás el juego."* + *"si el goal es que sea todo AI, y luego
puedo repetir la misma lógica para hacer otro nivel — es cambiar los nombres de los objetos y reutilizo todo."*

## 2. Por qué esto valida la decisión de UNIFICAR (la duda del dueño)
Tener todo **separado** estuvo bien para iterar rápido. Pero si el goal es un **mundo AI**, conviene tenerlo **junto
y declarativo**, porque:
- **Un nivel = DATOS** (`levels/*.json` validado contra el schema); el **motor es REUSABLE** (`Mundo.fromModel`).
  → **Nivel 2 = cambiar los datos/nombres de los objetos**, NO reescribir lógica. (Exactamente lo que dijo el dueño.)
- Para que la **IA** pueda autorar, todo tiene que ser **una sola superficie de datos** (entidades+componentes+grafo),
  no sistemas sueltos con ifs. Por eso unificamos: ecosistema (APIs) → grounding, quests → runtime de datos, pistas →
  grafo+quests, NPCs → memoria+grounding. **No hay que arrepentirse: separar primero y unir cuando el goal lo pide es
  el orden correcto** (no se sobre-diseña de entrada).

## 3. La "máquina de chorizos" = el MOLDE (schema) + la MASA (tu historia) + la MÁQUINA (motor)
- **El molde:** `levels/level.schema.json` (JSON Schema, `additionalProperties:false` = guardrails). Define qué es
  válido (rooms/entities/componentes render/interact/link/gate/give/combat/quest/ai…). La IA NO puede salirse del molde.
- **La masa:** tu **historia** en lenguaje natural ("una calle de Tokio post-apagón, un sushiman que te da una quest,
  un jefe robot al final").
- **La máquina:** el **motor data-driven** que ya corre cualquier nivel-dato (`Mundo.fromModel`) + el **runtime de
  quests** (registro+primitivas) + el **grounding del ecosistema** (los NPC saben todo).

## 3.1 DOS usos del pipeline de autoría (dueño, 2026-06-26)
El mismo generador sirve para **dos cosas**, y por eso vale doble:
- **(a) Herramienta de DESARROLLO (para el dueño):** le sirve para **codear/crear niveles** más rápido — contás la
  historia y te scaffoldea el JSON del nivel (que después editás a mano o con la IA). Es un editor de niveles asistido.
- **(b) EN VIVO dentro del juego (FEATURE PAGO ⭐):** le **hablás a un ORÁCULO** (linyera) y te **crea un nivel en
  tiempo real** — el oráculo (que ya sabe todo del ecosistema, grounding) toma tu pedido, genera el JSON validado y te
  mete en ese mundo. Es la versión jugable de la "máquina": el NPC IA como **autor de mundos on-the-fly**.
  **Monetización (dueño 2026-06-26):** es un **lindo feature PAGO** — *"si pagás, tenés un oráculo que te crea más
  juegos"*. Engancha con la **suscripción** ya implementada (`suscripcion.md`, X-Sub-Code): el free juega los niveles
  base; el **premium** desbloquea el oráculo-creador (genera mundos ilimitados con tu historia). Costo real = tokens
  del generador → cubierto por la sub (key propia por código, budget). Ver `quest-mundo-ai.md` (gating premium) +
  `pasarela-pago.md` (cobro).

## 4. El PIPELINE que falta (autoría) — fases
1. **F1 — molde sólido:** el schema cubre todo lo que hoy hay hardcodeado (seguir migrando: NPCs/quests/ambient a
   componentes de datos). Cuanto más data-driven, más puede autorar la IA. *(En progreso: quests F1-F3 hechas.)*
2. **F2 — generador:** endpoint `POST /nivel-ai` (premium) → el proxy le pasa al modelo el **schema + tu historia +
   una librería de "tipos de objeto"** → devuelve **JSON de nivel** → **se valida contra el schema** (si no valida,
   se re-pide) → el juego lo carga con `Mundo.fromModel`. (Ver `quest-mundo-ai.md §2.A` — es seguro: la IA produce
   DATOS, no código.)
3. **F3 — editor conversacional:** charlás con la IA ("poné un kiosco acá", "el jefe que tire fuego") y va **editando
   el JSON** en vivo (overlays/patch por id, `modelo-de-entidades §6¾`). Vos contás, ella ubica.
4. **F4 — biblioteca de tipos reusables:** "type objects" (sushiman, jefe-robot, kiosco, portal) que se instancian con
   distinto nombre/skin → "cambiar los nombres y reutilizo todo". Cada nivel = nuevo elenco, misma maquinaria.

## 4.5 PRIMER CORTE JUGABLE (v162, 2026-06-26) — el generador YA se dispara in-game

> **TL;DR:** te colás a la **trastienda del chino durante el RAID** → se **genera un nivel surreal temático** y lo
> jugás. La IA del proxy autora el texto; si falla, hay **fallback estático**. Es un **sub-modo contenido** (como
> arcade/super/vinilos): todavía NO usa el motor platformer real (eso es la F2 completa), pero cierra el lazo
> **trigger → generar (data) → jugar → recompensa**.

### A) El disparador (la experiencia)
1. **Contexto:** Iorio toca y **abre el frente del súper** (raid). Entrás al chino → `Super.create({raid:true})`.
2. **El chino entra en PÁNICO** y corre por todo el súper **hablando por GLOBITO** con frases cortas en su tonada
   chino-porteña (rotan c/~1.5s): *"¿¡cómo entlas!?", "tolmenta falta", "sol loco loco", "luz no andal", "aiyaaa",
   "ladlón ladlón"*… (`PANIC` en `super.js`, ES/EN por `I18n.short()`).
3. **La puerta privada (`family`) queda sin guardia.** En raid, al acercarte/`[E]` te **colás a la trastienda**
   (`sup.family.raid`) → `super.js` hace `finish('nivelai')` (su `exitTo`).
4. `game.js` ve `superGame.exitTo === 'nivelai'` → llama **`launchNivelAI()`**.

### B) El generador — `js/nivelai.js` (`window.NivelAI`)
- **El MOLDE = `THEMES` (DATA).** Cada tema describe un nivel surreal:
  `{ id, motif, name{es,en}, intro{es,en}, palette{floor,floor2,wall,accent}, props[emoji…], npc{emoji,lines{es,en}}, goal{es,en}, reward }`.
  Temas v1: **`super-rasca`** (antro mugriento), **`taller-esclavo`** (sweatshop tejiendo ropa), **`comida-podrida`**
  (cadena de frío rota), **`muralla-skate`** (la Muralla China en skate).
- **`generate(forceId?)`** elige un tema (o el forzado, para tests) y **compone una ESCENA** (data): grilla `W×H`,
  N props y 2-3 NPCs en tiles libres al azar, una `goal` (portal de salida), y el `reward`. Devuelve:
  `{ id, motif, name, intro, palette, W, H, props[{x,y,emoji}], npcs[{x,y,emoji,lines[],say,sayT}], goal{x,y,label}, reward }`.
- **`enrich(scene, cb?)`** — best-effort: `POST {PROXY}/nivel-ai {theme,lang}` → si responde, **pisa** `name/intro/lines`
  con lo que **autora la IA**; si falla/timeout (9s), queda lo estático. (Mismo patrón "banco + fallback" que
  propaganda/chusmerío.)

### C) La escena — `js/spinoff.js` (`window.Spinoff`)
- `Spinoff.create(scene)` = **sub-modo top-down explorable** (estilo `super.js`): `update(dt)` + `draw(ctx,VW,VH)` +
  `done`/`exitTo`. Caminás (WASD/flechas), los NPCs tiran **globitos** temáticos, llegás a la **META (portal)** →
  `done`, `exitTo:'back'`, y se aplica el **souvenir** (`Spinoff._reward(scene.reward)`). `ESC` = volver antes.
- **Aislado del motor principal** (no toca quests/tormenta/save), igual que arcade/super/vinilos.

### D) El cableado — `js/game.js`
- `spinoffGame` (var, reseteada en `reset()`).
- `launchNivelAI()`: `NivelAI.generate()` → setea `Spinoff._reward = rw => sumar al player` → `Spinoff.create(scene)`
  → `state='spinoff'` → `NivelAI.enrich(scene)` (async) → `tel('nivelai',{theme})`.
- En el loop: rama `state==='spinoff'` (update+draw); al `done` → `state='playing'` + `g.nivelai.back`.
- La rama de `super` ahora bifurca: `exitTo==='nivelai'` → `launchNivelAI()`, si no, salida normal.

### E) El endpoint IA — `ai-proxy/server.js` `POST /nivel-ai`
- Body `{theme, lang}` → arma un **prompt con el brief del tema** (mapa `BRIEF` server-side) pidiendo **JSON**
  `{name, intro, lines[6]}` (frases MUY cortas, tonada chino-porteña) → llama `ask(msgs, {maxTokens:260})` (se
  agregó override de `max_tokens` a `ask`) → extrae el primer `{…}`, sanea longitudes → responde el JSON.
- Si el modelo falla o no parsea → responde **`{}`** (el cliente usa su estático). CORS global ya cubre el POST.
- Verificado en vivo: devolvió *"El Bazar del Moho"* + frases tipo *"¿Qué quere, pibe?", "Sali ya, cerrá puerta"*.

### F) Cómo EXTENDER (sumar un tema nuevo)
Editar `THEMES` en `js/nivelai.js` (un objeto más) **y** el `BRIEF` en `server.js` (una línea con la descripción para
la IA). Nada más: el generador, la escena, el trigger y los tests ya lo toman. (Los 4 temas se testean en `tests/e2e.js`.)

### G) Límite honesto de este corte
La escena es **top-down contenida**, NO el motor **platformer** real ni `Mundo.fromModel` ni el **schema** de niveles.
Es un **lazo end-to-end de demostración**. La **F2 completa** (historia→nivel de N salas con el motor real + validación
contra `level.schema.json` + auditoría) sigue pendiente — ver §4 y §5.

## 4.6 LA RED: validador de jugabilidad (`js/playable.js`) — primer ladrillo de la C (v164)

> **La pregunta del dueño:** *"¿cómo puede la IA hacer algo bien si vos mismo con el motor hiciste un bug?"*
> **La respuesta:** la IA NO necesita ser perfecta — su salida pasa por una **RED automática** que rechaza lo
> roto **antes** de que llegue al jugador. Mi bug del ascensor se publicó **porque NO había red**: fue directo de
> mi mano al deploy. La C empieza construyendo esa red (y de paso protege el nivel hecho a mano).

- **`Playable.checkLevel(model)`** → `{ ok, problems[] }`. Opera sobre el **modelo v2** (el mismo que consume
  `Mundo.fromModel`), en tiles, sin pixeles. Reglas v1:
  - **R1 — puerta TAPADA:** una plataforma a la **altura de la cabeza** (`GTOP-2`) en la **misma columna** de una
    puerta la tapa = **exactamente el bug del ascensor**. (No mira +3 arriba: esas son fachadas de edificios que NO
    tapan la puerta de PB; ni `GTOP-1`: ahí una puerta puede **apoyarse** sobre una plataforma —piso alto— y es OK.)
  - **R2 — spawn dentro de sólido** · **R3 — meta enterrada.**
  - **R4 — reachability con física de salto (v180):** ✅ desde la entrada (spawn o puerta de entrada) ¿se LLEGA
    saltando a la meta y a cada puerta? BFS de superficies "parables" (tile libre con sólido abajo): se trepa
    ≤`JUMP_UP`=3 tiles por salto (apex real ~3.9, conservador), se cae/baja cualquier altura, saltos de hueco a
    x±2 sólo a nivel/abajo. Calibrado para NO marcar pisos despejados (los niveles actuales tienen el piso libre →
    meta/puertas siempre alcanzables). Es la red CLAVE para la **geometría autorada por IA**: una IA puede poner una
    plataforma válida por R1-R3 pero IMPOSIBLE de alcanzar (un muro más alto que el salto) — R4 la caza.
- **Prueba de regresión (`tests/playable.mjs`):** (1) el Nivel 1 real **pasa**; (2) el **viejo layout** que tapaba
  el ascensor (`[20,10,3]` + puerta en x=21) es **RECHAZADO**; (3) el layout arreglado **pasa**. Corre en CI
  (`.github/workflows/web-smoke.yml`) junto a schema + paridad.
- **El bucle de la C** será: la IA propone datos → `levels.mjs` (schema) **+** `playable.js` (jugabilidad) → si
  falla, se **re-pide / auto-repara** → recién ahí `Mundo.fromModel`. La calibración de R1 (head-height, no
  fachadas) es justo el tipo de regla que evita falsos positivos sobre niveles legítimos.

## 4.7 LADRILLO 2: la IA genera un NIVEL-PLATAFORMA real, validado y construible (v165)

> **El salto:** `generate()` hacía una escena top-down (Spinoff). **`NivelAI.generateLevel(theme)`** produce un
> **MODELO DE NIVEL del MOTOR REAL** (sala con plataformas saltables + spawn + meta + enemigos/pickups temáticos),
> el mismo formato que consume **`Mundo.fromModel`** (el loader del juego de verdad).

- **El bucle de la C, andando:** `generateLevel` arma un candidato → lo pasa por la **RED `Playable.checkLevel`**
  → si falla, **RE-INTENTA** (hasta 8, auto-reparación) → devuelve el primero que pasa. La imaginación de la IA
  **nunca** produce un nivel intransitable: la escalera de plataformas es saltable y nunca tapa spawn/meta (fila
  `GTOP-1` siempre libre → R2/R3 OK; sin puertas → R1 OK).
- **Probado (e2e, los 4 temas):** `generateLevel(theme)` → **pasa `Playable`** → **`Mundo.fromModel` lo CONSTRUYE**
  con `playerStart` + `goal`. Es decir: el nivel generado **carga en tu motor**, validado de punta a punta.
- **Lo que falta (próximo ladrillo):** el **render/play interactivo** del nivel generado en el motor (hoy se
  construye y valida headless; falta correrlo en vivo — vía rooms-swap aislado o runner contenido reusando
  `Player`). Eso es lo que vas a VER jugando. El texto del tema lo sigue autorando la IA (`/nivel-ai`).

## 4.8 LADRILLO 3: el nivel generado CORRE EN EL MOTOR REAL (rooms-swap, v166) — ¡jugable!

> El nivel-AI ya no es un sub-modo aparte: **se juega en EL motor principal** (vista lateral, saltos, física de
> `Player`, enemigos, cámara y art reales). Te colás a la trastienda del chino → la IA genera → pasa la RED →
> **swap de salas** → jugás → llegás a la SALIDA morada → volvés al juego con el souvenir.

- **`launchNivelAI()` (game.js):** `NivelAI.generateLevel()` → `Mundo.fromModel` → **`Playable.checkLevel` (la RED)**.
  Si no es jugable/no construye → **aborta al juego normal** (`g.nivelai.fail`), **nunca** carga un nivel roto.
  Si pasa: **snapshot** del juego principal (`rooms/states/current/pos/hp`) → **swap** a las salas generadas →
  `spawnIn(0)` → `spinoffLevel=true`.
- **`endSpinoffLevel(outcome)`:** restaura el snapshot exacto. `win` = souvenir (caramelos del tema). `dead` =
  **morir en el nivel bonus NO mata el run** (volvés sano). `flee` = `[ESC]` para volver.
- **Gates (`spinoffLevel`):** no drena la tormenta, no autosave, la muerte vuelve al juego (no game-over), la meta
  se dibuja a mano (portal morado, porque el motor solo dibuja el portal del cambio). Cero efecto sobre el run real.
- **Probado (e2e):** lanzar → entra al nivel generado (con goal+spawn) → ganar → **restaura la sala principal** +
  souvenir → y morir en el bonus **no rompe el run**. + schema + paridad + **playable** + web-smoke.
- **Calidad subida (v167):** `generateLevel` ahora arma **2-3 salas conectadas por puertas recíprocas** (spawn en
  la 1ª, meta en la última; el wiring lo resuelve `Mundo.wireRooms`), con **enemigos despiertos** (peaton/dron) y
  **decor temático con art válido** por tema (e2e verifica multi-sala + puertas cableadas + jugabilidad). Cruzar
  puertas dentro del nivel-AI muestra un mensaje neutro (gateado por `spinoffLevel`).
- **Estructura por TEMA + portal real (v170):** cada tema declara un **`style`** (DATA) que cambia la forma del
  nivel → **`wall`** (muralla: sala ANCHA, caminás por arriba del muro con almenas y huecos) · **`aisles`**
  (góndolas: 2 filas horizontales) · **`climb`** (zigzag que sube). Así la muralla **parece** una muralla y cada
  tema se siente distinto. La **meta** ahora usa el **art de portal real** (`Art.portal`, el mismo del cambio).
  Verificado: 200 niveles (50×4 temas) → 0 fallos de jugabilidad (la RED valida todo).
- **TEMA "ORÁCULO" — la IA inventa un nivel a tu MEDIDA (v175):** te colás a la trastienda y ~40% de las veces (si
  charlaste con los linyeras) el **oráculo te lee la mente**: el cliente junta tus mensajes (`oracleMem` →
  `playerChatTopics`) y los manda a `POST /nivel-ai {theme:'oraculo', chats}`; la IA **INVENTA** name/intro/frases +
  **ELIGE el `style`/layout** (wall/aisles/climb) guiñando a lo que hablaste. Se envuelve en un **tema ad-hoc**
  (`generateLevel` acepta objeto) → pasa la RED → rooms-swap. Carga **async** (mensaje "el oráculo te lee la
  mente…") con **fallback** a tema normal si la IA falla. Memoria del jugador → mundo generado. e2e: tema-objeto
  jugable + construible.
- **GEOMETRÍA AUTORADA POR LA IA (v180) — el salto grande, hecho:** la IA ya no elige solo el `style`: **autora la
  GEOMETRÍA exacta** como DATA. En el tema **oráculo**, el proxy `/nivel-ai` pide además `"platforms"` (array de
  `[x,y,ancho]` formando una escalera trepable) y `"enemies"` (posiciones x). El cliente las recibe como
  `aiPlatforms`/`aiEnemies`, las **sanea liviano** (`sanitizePlatforms`/`sanitizeEnemies`: coerción a la grilla,
  sin pisar bordes — pero **sin** garantizar jugabilidad a propósito, para que la RED trabaje de verdad) y
  `generateLevel` las usa **por sala**: si una sala con geometría IA **no pasa la RED** (incl. **R4 reachability**),
  se **AUTO-REPARA** cayendo al layout procedural (garantizado jugable). Así la "imaginación" de la IA llega al
  jugador SOLO si es transitable, y si propone un muro infranqueable la red lo caza y repara — **sin colgarse ni
  publicar un nivel roto**. Test `tests/geometria.js` (geometría buena se usa · muro infranqueable se auto-repara ·
  basura se ignora · enemigos IA presentes).
- **Geometría IA para los TEMAS FIJOS (v181):** la geometría ya no es exclusiva del oráculo. `requestGeometry(themeId)`
  le pide al proxy (`/nivel-ai` con `geometry:true`) las plataformas/enemigos del tema concreto; `launchNivelAI`
  (game.js) las usa en el path de tema fijo (el texto sigue siendo el bilingüe estático del tema). El **circuit
  breaker** lo cubre: GPU caída → `cb(null)` al toque → geometría procedural sin colgar. Así los **8 caminos** de
  generación pueden tener geometría autorada por IA, siempre tamizada por la RED.
- **Más obstáculos/enemigos + pickups alcanzables (v182):** los niveles generados ya tienen **pinchos** (entidad
  `hazard`, daño al contacto, render de triángulos; **aditivo** — las salas a mano no se tocan) con la regla nueva
  **R5** (un pincho sobre spawn/meta/puerta se rechaza); **enemigos variados** (pool peaton/dron/pacman/galaga/
  cuevero); y los **pickups se ponen solo en plataformas alcanzables** (`Playable.reachableTops` → R4 para pickups).
- **POZOS (v183):** segundo obstáculo: `hazard` kind `pit` que **CALA el piso** (`Mundo`/`Playable.roomGrid` borran
  los tiles del piso → hueco real). Te caés → daño + reaparecés (aditivo). **R4 ahora cruza huecos** (saltos de hueco
  hasta `JUMP_ACROSS`=3 si las columnas intermedias están ABIERTAS — pozo sí, muro no): pozo ancho ≤2 pasa, ancho 3
  se rechaza. El generador re-rollea SOLO los obstáculos si rompen la RED (las plataformas/geometría IA quedan fijas).
- **OBSTÁCULOS autorados por IA (v184) — cierra el círculo "todo lo dibuja la IA":** el proxy `/nivel-ai` ahora
  también pide `"hazards": [[x, ancho, "pit"|"spikes"]]`; el cliente los toma como `aiHazards`, los **sanea**
  (`sanitizeHazards`: ancho ≤2, lejos de columnas sagradas) y `generateLevel` los usa **si pasan la RED**; si no
  (ej. dos pozos pegados, o un pincho sobre la meta), **auto-repara** a obstáculos procedurales. Así la IA autora la
  geometría COMPLETA (plataformas + enemigos + pinchos + pozos), toda tamizada por la red. Test en `tests/geometria.js`.
- **Pulido (v185):** los **enemigos respetan los pozos** (caminantes/turret frenan en el borde, `edgeAhead`,
  aditivo por `room._hasPit`). **9 temas** (sumados «lavadero de billetes» y «farmacia vencida»).

## 5. Dónde estamos vs el norte (honesto)
- **Listo:** motor data-driven (paridad v1≡v2), schema, todo-es-API (4 bancos), grounding del ecosistema, quests como
  data+runtime, memoria incipiente, deploy reproducible, métricas.
- **Demostrado (v162):** el lazo **trigger → generar (data) → jugar → recompensa** anda in-game (§4.5), con la IA del
  proxy autorando el texto + fallback. Es un sub-modo contenido, no el motor real todavía.
- **Falta para la "máquina":** terminar de migrar lo hardcodeado a componentes (ambient/NPCs/relaciones), el
  **generador F2 completo** (nivel de N salas con `Mundo.fromModel` + validación de schema + auditoría) y el
  **editor conversacional** (F3). Cada paso v2 que damos hoy **es un ladrillo de esta máquina**.

> Regla operativa: cada feature nueva se piensa como **"un type object / componente / dato"** para que la máquina lo
> pueda generar mañana. (Ver SKILL regla #0.)

## ⚠️ Deuda PRIORITARIA — los niveles no reflejan el CONTEXTO/historia (reporte dueño 2026-06-27, v206)
Re-test del dueño tras el fix del modelo pago (v204): los niveles auto-generados (vecino/oráculo/chino-trastienda)
**siguen sintiéndose iguales y NO reflejan la historia**, mientras que las **tiendas SÍ reflejan su tipo**. Diagnóstico:
- Las **tiendas** andan porque el molde es **type-specific** (`SHOP_RUBROS` por `tipo`): aun en fallback estático,
  surtido/paleta son del rubro. Los **niveles NO**: la geometría IA (`aiPlatforms`) **cae a procedural por `style`**
  (`layoutPlatforms`) y la **paleta/props salen de un molde GENÉRICO** (`visualTemplate`, 6 estáticas), no del relato.
  La IA autora el TEXTO pero la **estructura/enemigos/look no varían con la historia**.
- **Latencia:** `passToBuilding`/`launchNivelAI` **esperan** la IA (16s, `AI_TIMEOUT` v204) antes de entrar, en vez de
  abrir estático AL TOQUE + enriquecer (como las tiendas cache-first).
**Fix a hacer:** (a) autorar (y APLICAR) geometría+enemigos+props+paleta **ligados al motif/relato**; (b) derivar
paleta/props del gancho de la historia, no de un molde fijo; (c) **cache-first / abrir estático + enriquecer** (o cron
pre-generador por edificio, patrón del banco vivo de historias) para matar la espera. Ver `tiendas-generadas.md` (el
contraste). Anotado también en la memoria `backlog` como **A0 (prioritario)**.

### ✅ A0 CERRADO (v207–v209)
- **(c) latencia — v207:** `passToBuilding` ahora es **cache-first** (igual que las tiendas): entra AL TOQUE con el
  tema estático (o el IA-cacheado si ya pasaste) y la IA enriquece **en background** para la próxima vez. `histThemeCache`.
- **(b) look propio — v208:** `motifVisuals` (en `game.js`): cada historia viva deriva paleta **determinística**
  (hash del relato → 1 de **10** hues de terror) + props armados desde su `motif`. Mismo relato → mismo look; relatos
  distintos → niveles distintos. Reemplaza el molde genérico random.
- **(a) enemigos/peligros por motif — v209:** un solo mapa data-driven `VIBES` + `MOTIF_VIBE` + `vibeFor()` (en
  `js/nivelai.js`) que `assemble()` consume para **TODOS** los caminos (THEMES del chino, oráculo, vecino). El motif
  define el **vibe** (slasher/ghost/party/swarm/gunmen/mob) → **pool de tipos** de enemigo + **cantidad** + **tipo de
  peligro** del piso (fantasma→pozos que ceden, slasher/tiradores→pinchos). Como `requestHistoria`/`requestOraculo`
  pasan su `motif` a `generateLevel`, heredan el vibe sin tocar nada. Sigue validado por la RED (jugabilidad garantizada).
  La **geometría** sigue variando por `style` (climb/wall/aisles) que ya trae cada historia.
- **Nota:** el **spinoff del chino** usa `generate()` (escena top-down, sin enemigos — solo props/npcs temáticos por
  THEME, ya themed); no le aplica el pool de enemigos. La queja del dueño era por los niveles-plataforma (vecino), ya
  resueltos. Si a futuro se quiere que la IA autore geometría **temática** (no solo posiciones), el hook ya existe
  (`aiPlatforms`/`requestGeometry`): falta que el proxy proponga layouts con sentido del relato.

## A0-DEEP — los niveles reflejan el relato (✅ CERRADO: props ancla + 2 styles v236 · salas=BEATS v237 · beats en el top-down v242)
**Hecho (v236, 2026-06-29):** las direcciones BARATAS/INTERMEDIAS del §A0-DEEP:
- **(3) PROPS ANCLA:** cada nivel generado lleva un **set-piece RECONOCIBLE** del relato colocado a propósito (centro del
  piso, emoji GRANDE con glow) — no decor random. Mapa `ANCHOR` (motif→emoji) + `anchorFor(t)` en `nivelai.js`; el render
  es un caso nuevo en el loop de decor de `game.js` (`d.type==='anchor'`). Ej: muralla→⛩️, súper→🐲, farmacia→⚗️, petardos→🎆.
- **(2) MÁS STYLES:** 2 layouts nuevos en `layoutPlatforms` — **`shelves`** (estanterías: columnas verticales que trepás,
  súper/farmacia) y **`rooftop`** (azoteas: plataformas anchas y altas con huecos, galpón de petardos). Asignados a
  super-rasca/farmacia (shelves) y fabrica-petardos (rooftop); el oráculo/historia (IA) ya pueden elegirlos. Todos pasan
  la RED (Playable) — el piso siempre transita, las plataformas son perchas.
- **Verificado:** e2e (cada tema 60 frames) + headless (props ancla presentes, 0 problems) + web-smoke. Cache v236.

**✅ (1) SALAS = BEATS del relato (HECHO v237, 2026-06-29):** cada sala del nivel generado es un MOMENTO de la historia
(su propio nombre + set-piece + encuentro), no salas intercambiables. **DATA:** `THEME_BEATS[id]` = secuencia hand-authored
por tema del chino (`[{n:{es,en}, a:emoji, en:tipoBicho, haz?}]`); la **IA** (oráculo/historia) también autora beats
(`j.beats` → `sanitizeBeats` → tema ad-hoc). `generateLevel`: si el tema trae beats, `candidate()` hace una sala por beat
y `assemble(i)` usa `beats[i]` para el **nombre de sala** + **ancla** + **sesgo de enemigo/hazard**. **Proxy:** `BEATS_ASK`
agregado a los prompts de oráculo/historia + `parseGeom` saca `j.beats`. Fallback total: sin beats → salas genéricas (como
antes). Verificado headless (super-rasca: "la entrada"→"las góndolas"→"el depósito del dragón" con 🧧→🥫→🐲; IA ad-hoc OK; 0
problems). **✅ beats al spinoff top-down HECHO (v242):** `generate()` ahora siembra las ANCLAS de los beats
(`THEME_BEATS[t.id]` o `t.beats`) como **props set-piece** (flag `anchor:true`), y `spinoff.js` las dibuja **más
grandes + glow** (no decor random) → el sueño top-down también "se lee" como la historia. Verificado: los 9 temas del
chino siembran anclas (ej. super-rasca → 🧧🥫🐲). **A0-DEEP CERRADO.** Único futuro abierto: afinar que la IA realmente
autore buenos beats (depende del modelo).

<details><summary>(reporte original ↓)</summary>

### ⚠️ A0-DEEP — los niveles AÚN no reflejan la HISTORIA (re-reporte dueño 2026-06-28)
Aún con paleta/props/enemigos por motif (v208/v209), el dueño dice que los niveles generados **siguen sintiéndose
genéricos**: *"cuando te habla el que cuida el edificio cerrado y cuenta una historia, el nivel no tiene nada que ver,
son simples niveles para saltar. Solo en el chino meten edificios chinos como decoración."* La **estructura** (geometría)
no codifica el **relato** — sigue siendo 2-3 salas de plataformas `climb/wall/aisles` con props pegados. Las **tiendas**
sí se sienten (porque el molde es por rubro), los **niveles no**.
### Diagnóstico
El gap real es **SEMÁNTICO/estructural**, no visual: la IA autora TEXTO + (opcional) coords de plataformas, pero NO una
**secuencia de "beats" del relato** ni **props con sentido** colocados a propósito. La geometría es procedural por `style`.
### Direcciones (a decidir con el dueño)
1. **Salas = BEATS del relato:** que la IA autore una **secuencia** de salas, cada una un momento de la historia (ej.
   juguetes: "el cuarto de la nena" → "la escalera donde cayó" → "la puerta que no abre"), con un **prop ancla** + un
   **encuentro** por sala. El schema de `requestHistoria` pasa de `{platforms,enemies}` a `{rooms:[{beat,anchorProp,
   enemyType,hazard}]}` → `generateLevel` arma cada sala alrededor del beat. **(la apuesta grande, la que más mueve la aguja).**
2. **Vocabulario de `style` por motif:** más layouts temáticos (estantería/juguetería, pista de baile/fiesta, pasillo de
   manicomio, azotea) además de climb/wall/aisles → la estructura "se ve" como el tema. **(intermedio, data-driven).**
3. **Props ANCLA con sentido:** la IA coloca props clave (la cuna, el hacha, el piano) en posiciones, no decor random →
   set-pieces reconocibles del relato. **(barato, alto impacto percibido).**
4. **Chino spinoff** (`generate()`): mismo problema — estructura genérica + decoración china. Aplicar (1)/(3) ahí también.
### Atado a
Los **niveles generados son "los sueños"** del Carpo (ver `inventario-armas.md §6`: ahí usa las armas criollas). Esa
narrativa (sueño/viaje temporal) **justifica** que sean surreales/temáticos. Recomendación: empezar por **(3) props ancla**
(barato, se nota) + **(2) más styles**, y evaluar **(1) beats** como la versión completa. **Deuda MEDIA-ALTA, prioritaria
de las de contenido.** Ver `edificios-clausurados-historias.md §8`, `modelo-de-entidades.md §6¾` (argumento AI-authorable).
</details>
