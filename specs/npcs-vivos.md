# SDD — NPCs VIVOS: chusmerío ambiente + diálogo entre NPCs (oráculos de la Matrix)

- **Estado:** **F1 implementado** (globitos de chusmerío templados con el estado vivo, v141). Resto = diseño.
- **Relacionado:** `worldSnapshot`/`worldBrief` (game.js), `Mensajero` (invocación agente↔agente), `linyera-pool`
  (pool de frases por IA), [[v2-engine-principios]] (todo dato/API/memoria/grafo), `specs/modelo-de-entidades.md`.

## 1. La idea (del dueño)
Los NPC están **VIVOS y conectados**: se hablan **entre ellos** y te tiran data **de lo que hiciste y no**. Ves dos
NPC en tiempo real con un **globito** arriba de la cabeza (diálogo corto, ~10 palabras) que podés **leer en vivo**, y
hablan de cosas del juego y de tu progreso ("che, me dijo el borrachín que no le diste carne").

## 2. Taxonomía de NPCs (3 tipos — todo data-driven, por COMPONENTES)
1. **Oráculos** (linyeras ilustres): **chat IA** completo + **saben TODO** (grounding del ecosistema, worldBrief).
   Pueden hablar entre ellos (dos oráculos → mini-diálogo en vivo). Componente: `chat` + `oracle`.
2. **NPC estáticos PRINCIPALES (de quest):** Iorio, el chino, los borrachines, el tahúr, los cueveros, el guarda,
   los hinchas. Tienen `action`/quest. **No** tienen chat libre, pero **pueden tirar frases** ambientes (chusmean lo
   que hiciste, le hablan a otros). Componente: `action`/`quest` + `ambient`.
3. **NPC DECORATIVOS:** civiles de fondo, espectadores, la cola del dólar. Tienen un **set de mensajes pre-cargados
   (por IA)** + **a la vez reciben mensajes aleatorios** que les pasan los otros dos tipos (relay/chusmerío). Componente:
   `ambient` (pool) + receptor de mensajes de 1) y 2).

## 3. F1 implementado (v141) — chusmerío ambiente
- `ambientPool(worldSnapshot())` arma líneas **templadas con el estado vivo** (data, no random suelto): referencias a
  lo que hiciste (`trucoEverWon`, `chinoEntered`, `borrachosHappy`, `bunkerUnlocked`…), a los **carteles** ("probate
  el {marca}"), al **Mundial**, a quests activas, + flavor.
- `spawnAmbient()` cada ~7-15s elige un NPC visible y le pone un **globito** (`drawBubble`); si hay otro cerca, **le
  contesta** (mini-diálogo, 60% chance, con delay). Globitos en `ambientBubbles` (efímeros, se limpian al salir).
- Render: globito sobre la cabeza del NPC (`drawBubble`, wrap a 3 líneas).

## 4. Pendiente (hacia v2 REAL — la deuda de F1)
- ✅ **Las líneas salen de DATOS/API** (`/chusmerio`, banco IA en PVC) + estado derivado del `worldSnapshot`. Hecho.
- ✅ **`ambient` es un COMPONENTE declarativo del schema** (entity.ambient): cada NPC declara si participa del
  chusmerío (`ambient:false` para opt-out, ej. las recepcionistas). Threadeado level.js→gen-level→nivel-1.json→mundo→
  engine (`eligibleNpcs` lee `n.ambient !== false`). La máquina de niveles podrá autorarlo por NPC.
- **Diálogo real entre NPCs vía `Mensajero`** (agente↔agente): un oráculo le "pregunta" a otro y la respuesta sale
  del modelo (cacheada, barata), no de un pool fijo. Dos oráculos = conversación emergente.
- ✅ **El RELAY (chusme atribuido) — F2 (v149):** `rumorPool(worldSnapshot)` arma rumores con **FUENTE** (clave de rol)
  + claim sobre lo que hiciste; `spawnAmbient` relayea ("che, me dijo {fuente} {claim}", `g.relay`), sin que la fuente
  se cite a sí misma, y el NPC cercano **reacciona** (`g.relayReply`).
- ✅ **GRAFO SOCIAL como DATA — F3 (v150):** componente declarativo **`entity.social`** (`knows`/`rival`), threadeado
  level.js→gen-level→schema→mundo→engine. El relay **fluye por aristas**: un NPC prioriza relayear rumores de quien
  **CONOCE** (`social.knows`); y habla mal de su **`rival`** (`g.rivalGossip`). Tagueados: los oráculos conocen todo el
  chusme del barrio; el guarda es rival del tahúr. La **máquina de niveles** podrá autorar estas relaciones.
  **Pendiente:** transcreación EN de los rumores (hoy es-flavor) + que la fuente sea una entidad puntual (no solo rol).
- **Memoria por NPC:** lo que chusmean persiste/evoluciona (agent.memory). 
- Todo esto encaja con el modelo v2 (entidades+componentes+grafo+memoria); F1 es el placeholder v1 a migrar.

## 5. INVESTIGACIÓN (2026-07-02, pedido del dueño): métricas + tiempo real + NPCs que se mueven solos

### 5.1 Qué HAY hoy (3 sistemas de "métricas" con roles distintos)
| Sistema | Qué es | Tiempo real | ¿Sirve para los NPC? |
|---|---|---|---|
| **Telemetry → Prometheus** (`js/telemetry.js` → `POST /game-metrics` → `tormenta_game_events_total{event,result}`) | contadores AGREGADOS y anónimos (session/storm/truco/minigame/quest…) para los dashboards Grafana del dueño | ~5s de batch | ❌ NO: es agregado, sin lectura de vuelta al juego. Es para OBSERVAR, no para que el mundo reaccione |
| **Presencia/salón** (`POST /salon/beat {pid,sala,ev}` → `SALON` + ring `SALON_TICK` → `GET /salon/live {count,byRoom,ticker}`) | hitos ANÓNIMOS de TODOS los jugadores en vivo (cada `applyEdge` manda su edge-id) | SÍ (segundos) | ✅ SÍ: es el feed real-time de lo que hacen LOS OTROS. Hoy solo lo consume el piso "Cine EN VIVO" — desaprovechado para los NPC |
| **`worldSnapshot()`/`worldBrief()`** (game.js) | el estado VIVO del jugador local (flags, quests, cine, Mundial, marcas) inyectado como grounding en CADA chat de oráculo | SÍ (instantáneo) | ✅ SÍ: es LA vía por la que los NPC "entienden qué pasa". Le falta lo RECIENTE (eventos, no solo estado) |

Más piezas ya construidas: `oracleMem` (memoria por NPC), bancos del ecosistema (NOTICIAS/PROPAGANDA/CHUSMERIO/
HISTORIAS/MUNDIAL, autorados por IA), `Mensajero.evento(edgeId)` ("qué acaba de pasar" para carteles), chusmerío
F1-F3 (globitos + relay con fuente + **grafo social `social.knows/rival` como DATA**), y precedentes de MOVIMIENTO:
`follow` (compañeros caminan hacia vos), `mundialApproach` (el hincha TE BUSCA para agradecerte), `roamingNpc`.

### 5.2 Los GAPS (lo que falta para "personajes vivos")
1. **No hay BUS DE EVENTOS del jugador:** el estado (flags) es "foto", no "película". Los NPC saben QUE ganaste el
   truco pero no que fue *hace 30 segundos*. Falta un ring de eventos recientes (compró X, entró a Y, ganó Z, habló
   con W) que alimente grounding + chusmerío + decisiones de movimiento.
2. **Los NPC no saben de OTROS jugadores:** el ticker `/salon/live` existe y no se inyecta en `worldBrief`.
3. **Los NPC no se MUEVEN solos:** posiciones fijas (salvo follow/mundialApproach). Falta el componente `drives`:
   deambular, ir a chusmear con un conocido (por la arista `social.knows`), y BUSCARTE cuando pasó algo notable.
4. **Prometheus NO es la herramienta para esto** (agregado, anti-cardinalidad, sin read-API): la conciencia de los
   NPC va por (a) bus de eventos client-side + (b) ticker del salón + (c) bancos del ecosistema. Prometheus queda
   para los dashboards del dueño (correcto como está).

### 5.3 Diseño F4 — "SE SIENTEN VIVOS" (por fases)
- **F4a — BUS DE EVENTOS (`js/eventos.js`, aditivo):** ring de ~24 eventos `{ev, detail, t}`; `evlog()` en applyEdge,
  transición de sala, compra, mini-juego, truco, tormenta, muerte, chat. Consumidores: `worldBrief` suma "ÚLTIMOS
  MOVIMIENTOS del jugador" (los oráculos comentan lo FRESCO), `ambientPool` chusmea lo reciente, y F4b lo usa para
  decidir buscarte. + `worldBrief` suma el ticker de OTROS jugadores (`Salon.live`, cacheado ~60s).
- **F4b — DRIVES (movimiento autónomo):** NPCs elegibles (decorativos + oráculos; NUNCA los de quest/tienda/want)
  alternan: **deambular** (±70px del `homeX`), **ir a chusmear** (caminar hasta otro NPC elegible → dispara el
  mini-diálogo del chusmerío al llegar), y **buscarte** (si hubo evento notable fresco, un oráculo camina hacia vos
  y te tira un globito sobre eso — generaliza el precedente `mundialApproach`). Personalidad = data que ya existe
  (`persona` + `social` + `ambient`); `drives` se declara opt-out/opt-in en el schema (3 patas: level.js→gen-level→mundo).
- ✅ **F4b.1 — ESTADO DE MOVIMIENTO declarativo (v276):** componente **`mov`** por NPC (3 patas del schema):
  `mov:false` (colas/músico/porteros) · `mov:{tras:'flag'}` (se libera al pasar el quest — borrachines tras
  `borrachosHappy`) · `mov:{hasta:'flag'}` (vecinos hasta `stormed`, después quedan de guardia). `canMove()` evalúa
  contra `historiaState()` → EL GRAFO decide quién se mueve. Todos vuelven SIEMPRE a su `homeX`.
- ✅ **F4c — DIÁLOGO NPC↔NPC por IA: HECHO (v277).** Dos oráculos que se cruzan (vía drives) improvisan 2 líneas por IA (`oracleDialogue`: AI.chat con worldBrief como grounding; cache localStorage por par+día, tope 2/sesión, cooldown 3 min, fallback pool). Se muestra como globitos encadenados si el jugador está cerca.
- ✅ **F4d — MEMORIA DEL BARRIO: HECHO (v277).** `Eventos.remember` persiste lo notable (`ts_barrio_mem_v1`, ring 30); `memoriaVieja` (>6h) alimenta el chusmerío ('¿te acordás cuando…?') y el worldBrief ('MEMORIA DEL BARRIO') → los oráculos recuerdan tu historia entre sesiones. (La memoria por-NPC individual con evolución queda como refinamiento v2.)
