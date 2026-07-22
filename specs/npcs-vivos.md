# SDD — NPCs VIVOS: chusmerío ambiente + diálogo entre NPCs (oráculos de la Matrix)

- **Estado:** ✅ **F1-F4 IMPLEMENTADAS (v141 → v277).** F1 globitos templados · grafo social (rumores relayados) · F4a bus de eventos `js/eventos.js` (evlog en applyEdge/transition/chat/muerte/minijuego) + drives (deambular/chusmear/TE BUSCAN) · F4b `mov` declarativo (colas fijas, liberados por quest) · F4c oráculos improvisan por IA · F4d memoria del barrio persistente + cross-device por nick. **§6 (v2, F1 HECHO — v373, 2026-07-21): memoria por-NPC individual, 100% data-driven por el grafo (`edge.npc`), gate premium.** Pendiente menor aparte: transcreación EN del chusmerío server.
- **Relacionado:** `worldSnapshot`/`worldBrief` (game.js), `Mensajero` (invocación agente↔agente), `linyera-pool`
  (pool de frases por IA), [[v2-engine-principios]] (todo dato/API/memoria/grafo), `specs/modelo-de-entidades.md`.

> **✅ Validación externa (2026-07-21):** un review de IA sobre "vender y masificar" el juego propuso, sin conocer
> este SDD, el mismo gancho de venta: NPCs que recuerdan al jugador entre sesiones y comentan lo que hizo — el
> ejemplo que dio ("che, hace tres días me prometiste traerme un choripán") es literalmente lo que F4d (memoria
> del barrio) ya hace. La brecha real frente a esa idea sigue siendo la de siempre: hoy la memoria es del
> **barrio** (compartida, ring persistente), no un registro fino **por (NPC, jugador)** que evolucione distinto
> con cada uno — el "refinamiento v2" que ya estaba anotado en §4. Ver [[suscripcion]] para el lado monetización
> (esa memoria como parte de lo que se vende en el tier pago).

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
  **✅ transcreación EN de los rumores/derivadas: HECHA (v287, 24 claves `g.viva.*`/`g.rumor.*`).** Queda: el banco CHUSMERIO del server bilingüe (cambio del cron gen-chusmerio) + que la fuente sea una entidad puntual (no solo rol).
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
- ✅ **F4d — MEMORIA DEL BARRIO: HECHO (v277).** `Eventos.remember` persiste lo notable (`ts_barrio_mem_v1`, ring 30); `memoriaVieja` (>6h) alimenta el chusmerío ('¿te acordás cuando…?') y el worldBrief ('MEMORIA DEL BARRIO') → los oráculos recuerdan tu historia entre sesiones. (La memoria por-NPC individual con evolución queda como refinamiento v2, diseñado en §6.)

## 6. v2 — Memoria por-NPC individual (F1 HECHO — v373, 2026-07-21)

> Motivación: hoy TODOS los NPC leen la MISMA memoria de barrio (F4d) — ningún NPC tiene una versión de
> los hechos distinta de la del vecino. Un review externo sobre venta/monetización (ver nota de
> Validación externa arriba) señaló esto como el gancho de venta más fuerte del juego ("un NPC que se
> acuerda de VOS, no del barrio en general"). Dos decisiones del dueño (2026-07-21) fijan el alcance:

### 6.1 Alcance — SOLO oráculos + NPCs de quest
**NO** aplica a NPC decorativos/ambient (tipo 3 de §2). Motivo del dueño: menos superficie nueva (rings a
persistir/sincronizar), memoria más rica justo donde importa la narrativa (Iorio, el cura, el tahúr, los
borrachines, los oráculos-linyera), en vez de diluirla en civiles de fondo.
**Backlog / descartado por ahora:** extender memoria individual a NPC decorativos/chusmerío puro —
anotado como idea futura si algún día se quiere ir más allá de oráculos/quest (no priorizado; el dueño lo
descartó explícitamente para este v2, no es un "falta" urgente).

### 6.2 Monetización — gate PREMIUM
La memoria individual por NPC es parte de lo que se **vende** (tier pago de [[suscripcion]], ~1€/mes):
- **Free:** el NPC sigue leyendo la memoria de BARRIO compartida (F4d, comportamiento de hoy, sin cambios).
- **Premium (`X-Sub-Code` activo):** el NPC en alcance (oráculo/quest) lee, además, SU PROPIA memoria
  individual — lo que ese jugador puntual le dijo/prometió/le pasó a ESE NPC.
Ver [[suscripcion]] §1 tabla de tiers, actualizada con esta fila.

### 6.3 Mecanismo implementado — 100% DATA-DRIVEN por el grafo (pedido explícito del dueño: "todo dato/grafo,
no hardcodear código por NPC")

La atribución NO vive en código (nada de "si el NPC es el cura, hacé X" en game.js): vive en la **ficha SDD**
del propio edge, igual que `sets`/`pre`/`hints`. Un bloque ` ```hist ` puede declarar un campo `"npc"`:

```json
{ "id": "cura_bendicion", "npc": "cura", "sets": { "curaBendicion": true }, ... }
```

`tools/gen-historia.mjs` no valida ni exige ese campo (pasa cualquier extra tal cual) → `js/historia.js`
(generado) lo trae, y `applyEdge()` en game.js lo lee genéricamente:

```js
if (e && e.npc) rememberNpc(e.npc, id);   // §6: memoria individual — SOLO si el edge lo declara en su DATA
```

Sumar memoria a un NPC nuevo = **agregar `"npc":"clave"` a su ficha + `node tools/gen-historia.mjs`**, no
tocar game.js. Etiquetados (2026-07-21/22, 9 edges / 7 NPCs — todos con `persona` real, es decir con chat,
así la memoria tiene por dónde salir):
- `cura_bendicion`→`cura`, `comedor_contratado`/`comedor_jornada`→`comedor` (`lavalle-quest.md`).
- `cuevero_gate`/`tormenta`→`cuevero` (`cueveros.md`: te cambia guita Y se acuerda que le desbarataste al tahúr para lograrlo).
- `cuevero_gate`→ también quedó `tahur` (`cueveros.md`, el tahúr recuerda que lo desbarataste).
- `polaco_caso`→`gallega` (`misterio-polaco.md`: te dio el caso del Polaco).
- `campana_llegada`→`maquinista` (`lavalle-quest.md`: le diste el trapo, te llevó gratis).
- `mapa_tano`→`violeta` (`andenes-vivos.md`) y `trofeo_tano`→`violeta` (`zarate-60.md`): el Tano se acuerda del mapa y del trofeo que le mostraste.

**Sin tag, a propósito:** NPCs sin `persona`/chat hoy (Iorio, vendedor de armas, los borrachines individuales)
— tagearlos sería memoria que nadie puede leer todavía (no tienen por dónde surgir); esperar a que tengan
chat, o sumarles uno, antes de taguear sus edges. Edges de LUGAR/evento sin un NPC único (piquete, subte,
Cabildo, etc.) tampoco se tagean — no hay "de quién" sería la memoria.

**Piezas:**
- **`npcMem[npcKey]`** (game.js, nuevo): ring de ≤6 hechos `{id, t}` por NPC — `id` es el edge del grafo,
  `t` el timestamp; persiste en el save (serialize/restore) igual que `oracleMem`, se resetea en partida
  nueva. El TEXTO no se guarda (evita duplicar datos): se resuelve en el momento con `npcMemTitle(id)`
  buscando el edge en `Historia.edges` (mismo patrón que `chkTitle()` de los checkpoints) → siempre en el
  idioma actual, sin re-traducir nada a mano.
- **Grounding del CHAT (`chatSend`, game.js):** `npcFactsGround(chatNpc)` — si `AI.isPaid()` y el NPC en
  el chat tiene hechos propios, agrega "recordás esto puntual: {títulos}" al grounding que recibe la IA
  (clave `g.chat.npcMemGround`). Aplica a **cualquier NPC con chat** (cura, referente, oráculos), no solo
  a los declarados `oracle:true` — es aditivo, un NPC sin hechos no cambia nada.
- **Globito ambiente (`spawnAmbient`, F1-F4 de este spec):** `npcMemLine(a)` — reusa `oracleMem` (no
  `npcMem`) porque el sistema de globitos solo alcanza a los NPCs del mapa principal
  (`room().npcs`/`eligibleNpcs`), que son los `oracle:true` (Iorio, French, Beruti, los linyeras). Si
  premium y el oráculo tiene chat previo con vos, prioriza una línea sobre lo que LE dijiste
  (`g.viva.recuerdaMio`) por encima del rival-gossip/relay/pool genérico. Los NPC de quest en submódulos
  (villa31.js, retiro.js, etc.) **no viven en ese array** → no les llega el globito; su vía es el chat
  (arriba), no el ambiente.
- **Gate premium:** `AI.isPaid()` (js/ai.js, nuevo) — cachea sync el resultado de `mySub()`/`checkSub()`
  (se refresca al activar código en ⚙ Opciones + cada 10min); `AI.__setPaidForTest(v)` para tests.
- **Free:** cero cambios de comportamiento — sin gate premium, ambos caminos devuelven `null`/nada.

### 6.4 Test
`tests/e2e.js` (sección "MEMORIA INDIVIDUAL por-NPC", `Game.__npcmem`): un edge SIN `npc` no escribe a
nadie · un edge CON `npc` escribe (siempre, gratis o pago — la ESCRITURA no gatea) · FREE no da grounding
ni globito · PREMIUM sí, y solo para el NPC con hechos propios (no inventa nada para otro) · el globito
individual es exclusivo de oráculos (un NPC de quest no lo dispara, aunque tenga `npcMem`) · `npcMem`
sobrevive `serialize()`→(JSON, como localStorage real)→`continueGame()`. Corre con `node tests/e2e.js`.

### 6.5 Pendiente (no bloqueante)
- Taguear más edges/NPCs con `npc` en sus fichas SDD (dato puro, sin tocar motor).
- Promesas SIN RESOLVER ("hace 3 días que…", con antigüedad) — hoy solo se listan hechos ya pasados
  (títulos de edges disparados); falta cruzar contra flags `pre` no cumplidos si se quiere ese matiz.
- Persistencia cross-device: queda local (vía save), igual que `oracleMem` hoy; el patrón de sync ya
  existe (`POST /barrio-mem`) por si se quiere sumar después.
