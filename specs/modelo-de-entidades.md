# SPEC: Modelo de entidades + motor data-driven ("todo es un objeto")

> **TL;DR (§2.5):** la técnica recomendada es **Component pattern + Type Object + data-driven** (NO un ECS
> completo ni un engine nuevo desde cero). El **motor se EXTRAE del juego por fases** (separar `engine/`
> genérico de `game/` data), validando con un **toggle v1/v2** + test de paridad. Idempotencia = modelo
> declarativo puro + estado runtime aparte (el que ya guarda `save.js`).

- **Estado:** **Draft** (solo diseño — no se implementa hasta acordar el alcance y el plan por fases de §10)
- **Nivel:** transversal (es la base para Nivel 1 **y** Nivel 2+)
- **Última actualización:** 2026-06-24

## 1. Contexto y objetivo

Hoy un "edificio" **no es una entidad de primera clase**: está partido en 4 representaciones que se
mantienen a mano y se desincronizan (ver auditoría §3). Para cambiar algo hay que tocar `level.js`
(salas + `wire`), la ficha, `GRAFO.md` y a veces hardcodes sueltos en `game.js` (`COLLAPSED`, `DOOR_ART`,
ifs de gating). No hay **un inventario único** donde **cada cosa del juego —desde el edificio hasta la
maceta, el personaje o el cartel— sea un objeto con sus atributos**.

**Meta:** definir **un modelo de objetos único, declarativo e idempotente** que sea la **fuente de verdad**
de todo el contenido del nivel. Con eso:
- **Mapeás todo** en un solo lugar: cambiás el atributo del objeto y sabés exactamente dónde.
- **Reusás el motor** para otro nivel: **mismo modelo, distinta data** → Nivel 2 nace declarativo.
- Las lógicas y los otros SDD (historia, diálogos, publicidad, gating, colapso) **se cuelgan del mismo
  objeto** como atributos/componentes, en vez de vivir desparramadas.

> **Decisión del dueño (2026-06-24):** por ahora **solo SDD**. Pensar TODOS los componentes del código,
> apuntando a que sea **lo más idempotente posible**, y dejar la puerta a **recrear el juego desde el
> modelo** con un **toggle v1/v2** en la UI (v1 = lo actual; v2 = el nuevo, data-driven) cuando se decida.

## 2. Cómo se llama esto (la teoría)

Para fijar vocabulario (el patrón que estás pidiendo tiene nombre):

- **Diseño guiado por datos (data-driven design):** el comportamiento y el contenido salen de **datos**
  (un modelo declarativo), no de código imperativo. El motor es genérico; el nivel es data.
- **Modelo Entidad-Componente (ECS-lite / entity-component):** **todo es una Entidad** (id + posición +
  tipo) y sus capacidades son **Componentes** (atributos/datos: render, interact, puerta, colisión,
  diálogo, gating…). Una maceta, un cartel, un linyera y una puerta son **la misma cosa** (Entidad) con
  **distintos componentes**. Es como las **prefabs/escenas** de Unity o Godot, o los mapas de **Tiled**.
- **Fuente de verdad única (single source of truth) + ensamblador puro:** un `buildWorld(modelo)` que es
  una **función pura** (mismo modelo → mismo mundo, sin efectos acumulativos) = la base de la
  **idempotencia** (§5).
- **Definición vs. estado:** el **modelo** es estático (la definición del nivel); el **estado** (vida,
  flags, pickups levantados) es dinámico y vive aparte (¡es lo que ya serializa `save.js`!). `mundo =
  buildWorld(modelo)` y luego `aplicarEstado(mundo, snapshot)`. Separarlos es lo que hace todo idempotente.
- **Migración strangler-fig:** el modelo nuevo (v2) **reproduce** el viejo (v1) en paralelo; cuando v2 da
  paridad, v1 se retira. Permite el **toggle v1/v2** sin romper nada.
- **Relación con lo que ya hay:** esto **formaliza** el "grafo de entidades" de [TECNICAS.md §1](TECNICAS.md)
  y la [ENTIDAD-template](ENTIDAD-template.md), pero en formato **que el motor consume** (no solo doc). El
  grafo de historia ([historia-grafo](nivel-1/historia-grafo.md)) y los pools de diálogo (`gen-dialogos`)
  pasan a ser **componentes** de las entidades.

## 2.5 ¿Qué arquitectura conviene? (análisis + lo del "motor propio")

El dueño quiere elegir **la mejor técnica** para esto y evalúa **hacer un motor**. Comparo las opciones
canónicas (referencia: *Game Programming Patterns*, Robert Nystrom; y los modelos de Unity/Godot/Bevy):

| Patrón | Qué es | Para ESTE juego |
|---|---|---|
| **Herencia OOP** (`Npc extends Entity…`) | Jerarquía de clases. | ❌ Rígido: "un cartel que además colisiona y tiene IA" no entra en una jerarquía. Lo que ya sufrimos. |
| **ECS completo** (Entity-Component-**System**) | Componentes = data pura en arrays; **systems** los procesan; storage por arquetipos (cache-friendly). Bevy, Unity DOTS. | ⚠️ **Overkill.** Su gran ventaja es performance con **miles** de entidades; acá hay decenas. Reescribir todo a systems es enorme y va contra el grano (vanilla, sin build). |
| **Component pattern** (entidad = bolsa de componentes con data+comportamiento) | Composición sin el aparato de "systems". Es el **GameObject de Unity / nodos de Godot**. | ✅ **El punto justo.** "Todo es entidad + componentes" sin reescribir el loop ni inventar un framework. |
| **Type Object** (define *tipos* como data; las instancias referencian un tipo) | Una "clase de NPC/puerta/decor" es **un dato**, no código. Prototype/Flyweight. | ✅ **Clave para tu pedido**: el cartel, la maceta, el personaje son **tipos de objeto declarados como data** + instancias con overrides. |
| **Data-driven + content pipeline** (motor genérico, nivel = data: JSON/Tiled) | Separa **motor** de **contenido**. | ✅ **Es el eje** de todo esto: el nivel es data, el motor la levanta. Habilita Nivel 2 = otro archivo. |
| **Scene graph / prefabs** (árbol de nodos, Godot) | Jerarquía contenedora + instancias reusables. | ➕ Útil como *forma* del modelo (Game→Edificio→Sala→Entidad ya es un árbol), sin adoptar un engine entero. |

**Recomendación: `Component pattern` + `Type Object` + `data-driven`, NO un ECS completo.**
Es decir: **composición** (todo = entidad + componentes), **tipos declarados como data** (registries de
npc/decor/puerta/enemigo/cartel), **niveles como data** y un **ensamblador puro** (`buildWorld`, §5).
Mantenemos el **game loop**, el **render immediate-mode** y la **state machine** que ya andan (no se tocan).
Performance no es el cuello de botella acá, así que la complejidad del ECS no se paga sola.

### ¿Y "crear un motor"?
Sí, pero con una distinción de oro: **un motor no se inventa de la nada, se EXTRAE del juego** (regla
práctica: *"the engine emerges from the game"*, y **YAGNI** — no generalizar de más). El plan es separar:

- **Motor (genérico, reusable):** game loop, input (`Input`), física por tiles (`Level.moveBody`),
  render immediate-mode, runtime de **entidad/componente**, **loader de niveles** (`buildWorld`), audio,
  cámara, overlays/estado. Nada sabe de "Florida" ni "linyera".
- **Juego/contenido (data + registries):** los **niveles** (data), el **arte** (`Art`), los **tipos** de
  entidad, los **handlers de acción** (chat/shop/truco…), las **personas** de IA, los **mini-juegos**
  (super/arcade/vinilos). Esto es lo específico de *Tormenta Solar*.

Con ese corte, el "motor" es real y reusable (otro juego = otro contenido), pero **crece desde lo que ya
funciona**, sin un rewrite especulativo. El **toggle v1/v2** (§7) es justamente el camino para extraerlo
sin romper nada. (Nombre tentativo del motor cuando se extraiga: `engine/` vs `game/` data.)

> En una línea: **no un ECS ni un engine nuevo desde cero, sino un modelo data-driven de
> entidad-componente con tipos-como-data, y un motor que se va extrayendo del juego actual por fases.**

## 3. Inventario: todo lo que HOY es un "componente" disperso

La auditoría de dónde vive cada atributo hoy, y a qué parte del modelo mapea (§4):

| Concepto (hoy) | Dónde vive hoy | En el modelo (§4) |
|---|---|---|
| Sala (geometría, theme, luz, ancho, plataformas) | `level.js` `makeRoom(spec)` | **Room** (entidad contenedora) |
| NPC (sprite, diálogo, acción, want, sells, persona, invisible, lines, hint) | `level.js` `npcs[]` | **Entity** `npc` + componentes `render`/`interact`/`dialogue`/`i18n` |
| Decoración (maceta, cartel, tele, catre, maletín…) | `level.js` `decor[]` (`type,x`) | **Entity** `decor` + `render` (+ `collide` opcional) |
| Puerta (a dónde va, fachada, condición) | `level.js` `doors[]` + `wire()` + `DOOR_ART` + ifs en `interact()` | **Entity** `door` + `link`/`gate`/`facade` |
| Máquina arcade | `level.js` `machines[]` | **Entity** `machine` + `interact` |
| Cuevero (outcome real/garca, invita a sala) | `level.js` `cueveros[]` | **Entity** `cuevero` + `interact` |
| Enemigo (tipo, look, hp, dmg, comportamiento) | `level.js` `enemies[]` + `enemies.js` tabla | **Entity** `enemy` + `combat`/`ai` |
| Pickup (vida, munición, monedas…) | `level.js` `pickups[]` | **Entity** `pickup` + `give` |
| Spawn / goal / buy | `level.js` `playerStart/goal/buy` | **Markers** de la Room |
| **Verbo de interacción** (chat/shop/borracho/lujo/totem/tesoro/loop/limosna/iorio/armas/fifa/truco/frogger/chori) | `game.js` `interact()` dispatch | Componente **`interact.action`** + handler registrado |
| **Gating de puerta** (cemento→ticket, bunker→bunkerUnlocked, chinoback→stormed, chinotruco→trucoWon, secret→secretUnlocked) | `game.js` ifs en `interact()`/`render()` | Componente **`gate`** (requiere flag/ítem) en la Entity `door` |
| **Colapso por tormenta** | `game.js` `COLLAPSED=['edu','arcade','choris','garbarino']` | Atributo **`collapsesOnStorm`** del Building/Room |
| **Conexión entre salas** | `game.js`/`level.js` `wire(a,'pa',b,'pb')` | Componente **`link`** de la Entity `door` (par bidireccional) |
| **Transición de historia** (setea flags) | `game.js` `applyEdge(id)` + `historia.js` | Componente **`story`** (ref a arista) en la Entity que la dispara |
| **Pool de diálogo IA** | `dialogos.js` + ` ```gen ` en fichas | Componente **`dialogue.pool`** de la Entity `npc` |
| **Persona de chat** | `ai.js`/`ai-proxy` `PERSONAS` | Componente **`chat.persona`** de la Entity `npc` |
| **Cartel publicitario / slot** | `ads/slots.json` (`room`,`x`,`format`) | **Entity** `sign` (es decoración con componente `ad`) |
| **Ambiente por zona** | `game.js` `ambientFor()` | Atributo **`ambient`** del Building/Room |
| **Música por zona** | `game.js` `setRoomTrack()` por theme | Atributo **`music`** del Building/Room |
| **i18n** (nombres/diálogos traducidos) | `level.en.js` map + `TX()` | Componente **`i18n`** (id estable) por Entity |

> Conclusión: **ya tenemos todos los "componentes", pero como datos sueltos en 6+ archivos.** El modelo
> los junta bajo una sola entidad por cosa.

## 4. El modelo de objetos (schema)

Jerarquía de contención + entidades con componentes. Borrador de forma (los nombres se afinan):

```jsonc
// Game → Levels → (Zonas/Edificios) → Rooms → Entities (+componentes)
{
  "id": "nivel-1",
  "nombre": "Florida y Lavalle",
  "eventos": [ { "id": "tormenta", "trigger": "deal_cuevero_real", "sets": "stormed" } ],
  "edificios": [
    {
      "id": "abandonado",
      "nombre": "Edificio Abandonado",
      "facade": "abandonado",                 // sprite de fachada (ex DOOR_ART)
      "gate": { "requiere": "borrachosHappy" },
      "collapsesOnStorm": false,
      "ambient": "viento", "music": null,
      "rooms": [
        {
          "id": "abandonado/p19",
          "theme": "lujo", "w": 17, "light": 1.0,
          "platforms": [],
          "entities": [
            { "id":"p19/totem", "tipo":"npc", "x":8, "render":{"sprite":"totem_monos"},
              "interact":{"action":"totem"}, "story":{"edge":"bunker"} },
            { "id":"p19/maceta", "tipo":"decor", "x":3, "render":{"type":"maniqui"} },
            { "id":"p19/door-up", "tipo":"door", "x":15,
              "link":{"a":"abandonado/p19#up","b":"abandonado/p20#down"}, "facade":"elevator" }
          ]
        }
      ]
    }
  ]
}
```

**Tipos de entidad** (cerrado, extensible): `room` (contenedor) · `door` · `npc` · `decor` · `machine` ·
`cuevero` · `enemy` · `pickup` · `sign` (cartel/publicidad) · `marker` (spawn/goal/buy) · `trigger`.

**Componentes** (un objeto sólo declara los que usa):
- `pos` `{x, y?}` (en tiles; `y` opcional, default piso).
- `render` `{sprite | type, ...}` (de `Art`).
- `interact` `{action, want?, sells?, persona?, lines?}` — el **verbo** (§3) + sus params.
- `door`/`link` `{to, facade, ...}` + `gate`.
- `gate` `{requiere: flag|item}` — condición para usar/entrar/ver.
- `collide` `{solid:true}` (decor que tapa, plataformas).
- `combat`/`ai` `{hp, dmg, look, beh}` (enemigos).
- `give` `{item, amount}` (pickups).
- `story` `{edge}` — referencia a una arista del [grafo de historia](nivel-1/historia-grafo.md) (la que
  hoy aplica `applyEdge`).
- `dialogue` `{pool | lines}` — pool de `gen-dialogos`.
- `chat` `{persona}` — persona de IA.
- `ad` `{slot, format}` — si es un `sign` publicitario (unifica `ads/slots.json`).
- `lifecycle` `{appearsWhen?, hideWhen?, invisible?, oncePerLoop?}` — apariciones condicionadas
  (puerta trasera post-tormenta, falopa por loop, linyera errante, ninjas, etc.).
- `i18n` `{id}` — clave estable para traducir nombre/diálogo (reemplaza el map `level.en.js`).
- `agent`/`brain` `{traits, state, states, transitions, memory?, policy}` — la entidad **piensa y puede
  mutarse a sí misma** de forma ACOTADA (no random). Ver §6½. Sirve para un NPC, **pero también para una
  maceta o un edificio** (que se marchite/florezca/mute según condiciones).
- `event`/`trace` (implícito): cada entidad emite eventos por su `id` estable → log de trazabilidad (§6½).

**Idea clave:** una **maceta** es `{tipo:decor, render:{type:'planta'}}`; un **cartel** es
`{tipo:sign, render:..., ad:{...}}`; un **linyera** es `{tipo:npc, render:{sprite:'linyera'},
interact:{action:'chat',persona:'filosofo'}, dialogue:{pool:'linyera_ruina'}}`. **Todo el mismo molde.**

## 5. Idempotencia (el corazón del pedido)

Que el modelo sea **idempotente** = aplicarlo N veces da **siempre el mismo mundo**, sin acumular estado:

1. **El modelo es definición pura, sin estado mutable.** No guarda "pickup ya agarrado" ni flags. Eso es
   **estado runtime** y vive aparte (lo que ya serializa `save.js`: `serialize()/restore()`).
2. **`buildWorld(modelo)` es una función pura:** entra el modelo, sale un mundo nuevo (salas + entidades
   frescas). Sin globals, sin `Math.random` en el armado (las posiciones random de hoy se **siembran** con
   el id de la entidad → deterministas). Correrla dos veces da estructuras **idénticas** (testeable).
3. **`aplicarEstado(mundo, snapshot)`** superpone el estado dinámico. `reset()` = `buildWorld` + estado
   inicial; "Continuar" = `buildWorld` + `restore(snapshot)`.
4. **Ids estables por entidad** (`edificio/sala/entidad`) → cualquier sistema (historia, ads, save,
   pistas) referencia por id, no por índice de array. Esto es lo que hace que **cambiar el modelo no rompa
   los demás SDD**: todos hablan por id.

> Esto, además, **arregla** un olor actual: hoy el guardado mapea pickups/npcs **por índice de array**
> (frágil si cambia el orden). Con ids estables, el estado se ancla al id.

## 6. Reuso multi-nivel (el otro objetivo)

Mismo **schema** + mismo **motor** (`buildWorld`, render, interact, combat) → un nivel nuevo es **otro
archivo de datos**. Nivel 2 (el salto temporal que promete la intro) **nace declarativo**: define sus
edificios/entidades en el modelo y reusa todo. Lo único por nivel: data + arte nuevo si hace falta.
(Hoy `level.js` mezcla motor y data del Nivel 1; el modelo los separa.)

## 6½. IA en v2: entidades con "cerebro" + asistente con trazabilidad

Dos pedidos del dueño, los dos caen redondos en el modelo de entidad-componente.

### A) Entidades que se auto-mutan con IA, pero **acotadas** (siguen un razonamiento, no random)

**Qué es / cómo se llama:** un **agente generativo con espacio de acciones acotado**. Mezcla de varias
técnicas conocidas:
- **Generative Agents** (Park et al. 2023, el paper "Smallville"): agentes con **memoria → reflexión →
  plan**. Acá en miniatura.
- **AI Director** (Left 4 Dead): un sistema que **cambia el mundo según el estado del juego** (un edificio
  que "se pudre" si pasaron N loops, una maceta que florece si alimentaste a los borrachines).
- **Utility AI / GOAP / Behavior Tree**: decisión **acotada** entre opciones legales con un "puntaje".
- **Type Object + máquina de estados como data**: los **estados posibles** de la entidad están
  **declarados** (data), así el cambio nunca sale del conjunto legal.
- **Generación con grounding** (la regla que YA usás en [ia-openrouter §0](ia-openrouter.md) y en el
  [grounding del linyera](nivel-1/historia-grafo.md)): **el código define el espacio legal; el LLM elige y
  justifica dentro de él, con su voz** — nunca inventa una transición que no existe.

**Cómo se modela (componente `agent`/`brain`):** cualquier entidad (npc, decor=maceta, edificio) puede tener:
```jsonc
"agent": {
  "traits": { "humor": "amargo", "paciencia": 0.2 },   // atributos que SESGAN el razonamiento (no lo randomizan)
  "state": "marchita",                                  // estado actual (runtime, va al estado, no al modelo)
  "states": ["sana", "marchita", "mutante"],            // estados LEGALES (definición)
  "transitions": [                                      // qué destraba qué (precondición → efecto), como el grafo de historia
    { "to": "mutante", "when": { "stormed": true, "loop": ">=2" } }
  ],
  "memory": "rolling",                                  // qué eventos recientes "vio" (para razonar)
  "policy": "llm | utility | rule"                      // quién elige la transición
}
```
- Con `policy:"rule"/"utility"` → determinista (puntaje sobre `traits` + condiciones).
- Con `policy:"llm"` → al motor le pasa **traits + estado actual + transiciones legales + contexto** y el
  LLM **elige una transición y la explica** (con la voz de la entidad). **No puede saltar a un estado no
  declarado** → "razonamiento, no aleatorio". La maceta "decide" mutar *porque* hubo tormenta y van 2 loops,
  y lo dice con onda; pero el conjunto de finales posibles lo fijás vos como atributo.
- **Idempotencia (§5):** los `states`/`transitions` son **definición** (modelo); el `state` actual y la
  `memory` son **estado runtime** (se serializan con `save.js`). Así el mundo se reconstruye igual y la IA
  no rompe el determinismo del armado.

**Política de costo (decisión del dueño): el `policy` es un ATRIBUTO POR ENTIDAD — las tres opciones
conviven y están codeadas.** No es "todo determinista"; es **vos elegís por entidad**:
- `rule`/`utility` → **default** para la mayoría (determinista, gratis, testeable). El grueso del nivel va acá.
- `llm` (runtime) → **soportado y cableado de fábrica**; lo ponés en **las entidades donde NO te importa la
  latencia/costo** (un objeto especial, una zona "viva", un NPC clave). El LLM razona y elige una transición
  **dentro del espacio legal** (grounding). No es para todas, pero **está ahí listo** para usar cuando quieras.
- **Offline (autoría)** → además, el patrón `gen-dialogos` (LLM **en la compu** → variantes como data) es
  una vía **extra** para tener variedad barata sin tocar runtime. Es ortogonal al `policy` (podés combinar:
  pools offline + elección `rule`, o directamente `llm` en vivo donde te dé el cuero).

Es decir: el motor **trae el runtime-LLM enchufado**; qué entidades lo usan es una decisión de diseño por
atributo, no una limitación del modelo.

### B) Trazabilidad total para que un asistente (o vos preguntándole a Claude) sepa **exactamente** el juego

**Qué es / cómo se llama:** la combinación de tres técnicas:
1. **Event Sourcing** — la verdad de "qué hiciste" es un **log append-only de eventos** (`{t, entityId,
   action, effect}`); el estado actual = el *fold* de esos eventos. Te da **historia perfecta**: dónde
   estuviste, qué tocaste, en qué orden. (Hoy ya hay un proto: los flags + `loopCount`.)
2. **Knowledge Graph + RAG (GraphRAG)** — **el modelo v2 ES el grafo de conocimiento** (entidades +
   relaciones + ids estables). Un asistente **recupera el subgrafo relevante** (dónde estás, qué te falta,
   qué destraba qué) y responde **grounded** en él (sin alucinar). El [grafo de historia + `HintEngine`]
   (nivel-1/historia-grafo.md) ya es una versión chiquita y **rule-based** de esto.
3. **World-state como contexto** — `serialize()` (lo que ya guarda `save.js`) da el "**dónde estoy / qué
   tengo**" en un objeto estructurado, listo para pasarle a un LLM.

**Cómo se arma en v2 (casi gratis por el modelo):** como **todo tiene `id` estable** y el **estado está
separado de la definición**, el asistente recibe 3 cosas y sabe exactamente todo:
- **`snapshot`** (estado actual: sala, inventario, flags, estado de cada entidad) — el "dónde".
- **`eventLog`** (qué hiciste, en orden) — el "qué hice / cómo llegué".
- **`subgrafo`** del modelo alrededor de donde estás (qué hay, qué destraba qué) — el "qué puedo/qué falta".

Eso es, textualmente, un **copiloto del juego con GraphRAG + event sourcing**. Casos:
- *In-game*: el linyera-oráculo deja de ser solo rule-based y pasa a un asistente que **explica tu partida**.
- *Dev/meta* (vos preguntándole a Claude "¿cómo va?"): se le da el `snapshot + eventLog + modelo` y razona
  sobre **tu partida real**, no en abstracto. También sirve para **QA automática** (detectar que un objetivo
  quedó inalcanzable, que un flag no tiene quién lo destrabe, etc.).

**Nombre corto del stack:** *Event Sourcing + Knowledge Graph + Retrieval-Augmented Generation (GraphRAG)* →
un **asistente grounded en el estado real del juego**.

> Las dos cosas comparten cimiento: **ids estables + estado separado + el modelo como grafo consultable**.
> Por eso conviene que entren en el diseño de v2 desde el día 1 (aunque se implementen en fases tardías).

## 6¾. Rejugabilidad, contenido vivo y multi-nivel (y por qué el modelo lo habilita)

El objetivo del dueño: que el juego **no sea monótono** — que al rejugarlo **cambie visualmente o en las
respuestas de NPCs**, destrabe **mejoras**, y que se le puedan **agregar quests/temporadas** ("la semana de
nuevos quests, mi mundo cambia"), tipo **mundo abierto con misiones editables**; y a futuro **volver a
niveles pasados** para resolver cosas (estructura **Metroidvania**). Cómo lo da v2:

### Tres capas de estado (la base de "el mundo cambia mientras más jugás")
1. **Definición** (modelo, estático): qué entidades existen y sus transiciones legales.
2. **Estado de partida** (per-run): vida, flags, posición → lo que ya serializa `save.js`.
3. **Meta-progresión** (cross-run, persistente): lo que se acumula entre **muchas** partidas (qué
   descubriste, qué temporada está activa, qué se desbloqueó "para siempre"). **Acá vive "cuanto más jugás,
   más cambia"**: las `transitions` de las entidades pueden mirar la meta-progresión, no solo la partida.
   (New Game+ / mundo que evoluciona.) Es una 3ª "save" aparte de la de partida.

### Variedad SIN costo en vivo (autoría offline)
- **Respuestas de NPC que cambian**: ya tenés `gen-dialogos` (LLM **offline** → pools de líneas como data).
  El estado de la entidad (§6½A) elige **qué pool/variante** mostrar. Cero costo en runtime.
- **Cambios visuales por rejugada**: el `agent` con `policy:"rule"/"utility"` muta el `render` entre estados
  declarados, **sembrado por run/loop/meta** → determinista pero distinto cada vuelta.

### Contenido vivo / "temporadas" (content packs)
- Como el nivel es **data**, un **quest nuevo = entradas nuevas en el modelo** (entidades + aristas del
  **quest DAG**, ver [TECNICAS.md §2](TECNICAS.md)). No se toca el motor.
- **Content pack / overlay**: un archivo que se **superpone** al modelo base y agrega/cambia entidades
  (la "temporada de la semana"). Patrón **data packs / mods**. Se puede activar/desactivar por fecha
  (como las campañas de [publicidad](publicidad.md)). Forma tentativa:
  ```jsonc
  // packs/temporada-2026-07.json — se aplica ENCIMA del modelo base por id (merge/patch)
  {
    "id": "temporada-jul26", "activo": { "from": "2026-07-01", "to": "2026-07-31" },
    "add": [                                  // entidades nuevas
      { "id": "calle/afiche-mundial", "room": "calle", "tipo": "sign", "x": 40, "render": {"type":"cartel"} },
      { "id": "calle/quest-npc", "room": "calle", "tipo": "npc", "x": 52,
        "interact": {"action":"quest"}, "story": {"edge":"quest_mundial"} }
    ],
    "patch": [                                // cambia atributos de entidades existentes por id
      { "id": "abandonado", "set": { "collapsesOnStorm": true } },
      { "id": "p19/totem", "set": { "render": {"sprite":"totem_mundial"} } }
    ],
    "remove": ["calle/oficinista-3"]          // saca entidades
  }
  ```
  Reglas: **merge por `id`** (add/patch/remove); el pack **no** rompe el base (si falta un id en `patch`,
  warning, no crash); validable con el mismo schema. Así "la semana de nuevos quests" = subir un JSON.

### Multi-nivel + backtracking (Metroidvania)
- El **grafo del mundo abarca varios niveles** y las conexiones se **gatean por lo que desbloqueaste**
  (items/abilities/flags — ya tenés gating: ticket, `bunkerUnlocked`, `spitDmg`). Volver a un nivel pasado
  con algo nuevo abre puertas antes cerradas. El **grafo de historia** explica el "qué está pasando".

### Por qué la decisión del motor te da "cintura" (y es clave porque NO programás)
- Un modelo **declarativo, con schema y fuente única** es **lo más fácil de editar para una IA** (de
  cualquier proveedor): leer/escribir **JSON validado contra un schema** es muchísimo más confiable que
  tocar código imperativo. El **schema = guardrails** de la IA, y los **tests de paridad/validación**
  (§9) atrapan los errores. → vos pedís el cambio en lenguaje natural, la IA edita la **data**, los tests
  cuidan que no se rompa. Esto es **exactamente** lo que hace viable "yo voy cambiando todo" sin saber
  programar. (Es el argumento más fuerte a favor de v2.)

## 6.9. Acceso a la IA y monetización (freemium: gratis / suscripción / BYOK)

Idea del dueño: una **feature paga**. Pagás (ej. **€1/mes**) → tenés el modelo de IA integrado y **todos los
features de jugar con IA**; si no, el juego es **más estático** (pero **anda igual**). Alternativa: ponés
**tu propia API key (BYOK)** → mismos features, los pagás vos y te bancás la latencia. Y como **todo está
mapeado en el modelo, el código sabe** qué parte usa IA, qué tier requiere y qué modelo se testeó.

Esto se llama **freemium / feature-gating de IA**, y **reusa la cadena que ya tenés** en
[ia-openrouter §0](ia-openrouter.md): `proxy del dev (vos pagás) > BYOK (key del jugador) > local (canned)`.

### Tres tiers de acceso (resuelven sobre la misma entidad)
- **Gratis (sin IA en vivo):** toda entidad que sería `llm` cae a su **`fallback`** (rule/utility o pool
  offline `gen-dialogos`). Juego 100% jugable, más estático. (Es lo que hoy hace el modo `local`.)
- **Suscripción (€1/mes):** desbloquea el **proxy del dev** → las entidades `policy:"llm"` funcionan con un
  **modelo testeado por el dev** (latencia conocida). El usuario no configura nada.
- **BYOK:** el jugador pega su key → mismas features `llm`, **paga él**, con su modelo/latencia.

> Suscripción y BYOK desbloquean **lo mismo** (las features full-AI). La diferencia es **quién paga** y
> **qué latencia** te toca. El free nunca queda afuera del juego: sólo de la capa "viva".

**Decisiones del dueño (2026-06-24) — principios firmes:**
- **Por ahora, FREE = TODO.** No se gatea nada todavía. La degradación se define **más adelante**, con el
  juego más estable, viendo hasta dónde conviene bajar al free.
- **El pago NUNCA traba ni esconde contenido.** Prohibido el patrón "esto sólo se ve si pagás". Lo que el
  pago da es la capa **viva** (IA en vivo); sin pagar, **el juego es más estático pero está completo y
  jugable de punta a punta**. El `fallback` de cada entidad debe ser una versión **jugable**, no la ausencia
  de la feature.
- **La degradación es un PARÁMETRO, no código.** El `tier` por entidad arranca en `any` (free); apretarlo
  en el futuro es **config/data**, no un cambio de lógica → **flexible para updates**. Así podés mover la
  línea free↔pago por temporada sin tocar el motor.
- **Empezar con UNA feature full-AI y que escale.** Arrancamos por el **chat de NPCs** (ya existe). Sumar
  más (oráculo, `agent:llm`, etc.) = **agregar el atributo `ai` a más entidades**, sin código nuevo → escala
  solo. No importa con cuál se arranca; importa que el seam ya soporte agregar.

### Lo habilita el modelo (atributos en el componente `ai` de la entidad)
```jsonc
"ai": {
  "tier": "sub | byok | any",     // qué acceso requiere esta feature full-AI
  "model": "meta-llama/…:free",   // modelo TESTEADO para esta parte
  "latencyMs": 1200,              // latencia medida (para decirle al user qué le conviene)
  "fallback": "rule"              // qué hace si no hay acceso (determinista/offline) → el juego no se rompe
}
```
- En runtime, `aiAccess()` (¿suscripción activa? ¿key BYOK? si no → free) decide. Si la entidad pide un
  `tier` que no tenés → usa `fallback`. **Degradación graceful** = el mismo principio aditivo de todo el repo.
- Como el código **lee estos atributos**, puede **sin hardcodear nada**: marcar las features full-AI (badge
  "✨ IA"), **mostrar qué modelo/latencia** se testeó por feature, y gate/ocultar lo que no tenés. "No hay
  que describir todo: el modelo ya lo sabe."

### Qué puede ser "full AI" (a definir) y cómo degrada
| Feature | Full-AI (sub/BYOK) | Free (fallback) |
|---|---|---|
| Chat con NPCs (linyera, cuevero, tahúr…) | charla libre con el LLM | pools pre-generados (`gen-dialogos`) + canned |
| Entidades con `agent:llm` (objeto/zona "viva") | mutación razonada en vivo | mutación por `rule`/`utility` (sembrada) |
| Oráculo/asistente con trazabilidad (§6½B) | explica tu partida (GraphRAG) | `HintEngine` rule-based (lo de hoy) |
| Variedad de quests/respuestas | re-generación on-demand | variantes offline + reglas |

### Infra (honesto)
- El **proxy del dev ya existe** (`ai-proxy/`); falta **gating por suscripción** (auth/token) + el **cobro**
  (un Stripe/Lemon Squeezy + un check de "suscripción activa" en el proxy). BYOK y free **ya funcionan**.
- Nada de esto bloquea v2: el modelo declara los atributos; el cobro/gating es una capa externa (como
  `presence`/métricas de `ads`).
- **El routing/serving (suscripción vs GPU propia vs externo, abuso, k8s) es un SDD de infra aparte:**
  [ia-routing-infra.md](ia-routing-infra.md). No toca el juego: éste sólo habla con **un endpoint** y
  **expone métricas** (el contrato está en §5 de ese spec).

## 6.95. Schema en detalle: meta-progresión y quests

### Meta-progresión (la 3ª capa de estado, §6¾)

Es lo **persistente entre partidas** (lo que hace que "cuanto más jugás, más cambia"). Vive en su **propio
`localStorage`** (`ts_meta`), **separado** de la save de partida (`tormenta-solar-save-v1`). Mientras la save
de partida se borra/reinicia, la meta **acumula**.

```jsonc
// ts_meta — estado META (cross-run, persistente)
{
  "v": 1,
  "runs": 7, "deaths": 3, "loopsTotal": 12,        // contadores acumulados
  "seed": "a3f9",                                  // semilla estable para variación determinista del layout
  "discovered": ["bunker", "tahur", "cuevas/3"],   // qué descubriste ALGUNA vez (ids estables)
  "unlocked": ["ability_doblesalto", "nivel-2"],   // desbloqueos PERMANENTES (Metroidvania / NG+)
  "questsDone": ["quest_mundial"],                  // quests completadas para siempre (scope:meta)
  "packs": ["temporada-jul26"]                      // content-packs vistos/activos
}
```

**Cómo maneja la variación (clave de idempotencia):** `buildWorld(modelo, ctx)` es puro, donde
`ctx = { meta, runState }`. La variación NO es `Math.random()` suelto: es **`hash(seed + entityId + runs)`**
→ el mundo cambia entre partidas **pero es determinista** dado el `ctx` (re-armar con el mismo `ctx` da el
mismo mundo → testeable). Las `transitions`/`agent` de las entidades pueden leer `meta.*`:
```jsonc
{ "to": "mutante", "when": { "meta.runs": ">=3", "stormed": true } }
```
**Reglas:** la meta es **sólo local** (sin backend, como `config`/`save`); morir o NG+ **conserva** la meta;
sólo un "borrar datos" explícito la limpia. Qué entra en meta vs partida es decisión por feature (§ abajo).

### Quests (cómo se declara una misión)

Insight: **un quest NO es un sistema nuevo — es un *bundle* presentable y premiado de aristas del
[grafo de historia](nivel-1/historia-grafo.md)** (las que ya tienen `pre`/`sets`/`hints`). El `HintEngine`
y el oráculo ya saben pistar "el próximo paso"; el quest sólo agrupa pasos + recompensa + presentación
(quest log). Forma tentativa, declarada como una entidad más del modelo:

```jsonc
{
  "tipo": "quest",
  "id": "quest_mundial",
  "i18n": "q.mundial",                       // nombre/descr traducibles
  "giver": "calle/quest-npc",                // quién la da (entidad por id); o "autostart": {cond}
  "requires": { "stormed": true },           // para que aparezca/se pueda tomar (gating)
  "scope": "meta",                           // "run" (por partida) | "meta" (para siempre)
  "repeatable": false,
  "steps": [                                  // pasos = aristas (o refs a aristas existentes). Lineal o DAG.
    { "id":"q.mundial.s1", "at":"super", "when":{}, "sets":{"tieneCamiseta":true},
      "hints": { "es":["…cripto…","…rumbo…","…receta…","…directo…"] } },
    { "id":"q.mundial.s2", "at":"cemento", "when":{"tieneCamiseta":true}, "sets":{"quest_mundial":true} }
  ],
  "rewards": { "coins": 50, "unlock": "ability_doblesalto", "flag": "campeon" }
}
```
- **`steps`** son aristas: reusan `preMet`/`done` del `HintEngine` (frontera + pistas escaladas por
  insistencia). Un step puede **referenciar** una arista ya existente (no duplicar) o declarar una nueva.
- **`scope`** decide dónde vive el estado del quest: `run` → save de partida; `meta` → `questsDone` (no se
  repite nunca más). La historia principal tiende a `meta`; las side/temporada a `run`.
- **`rewards`** al completar: `coins`/items, `flag` (entra al grafo), `unlock` (va a `meta.unlocked` →
  Metroidvania/NG+). Aplicado por el mismo `applyEdge` extendido.
- **`giver`**: una entidad `npc`/`sign` con `interact:{action:"quest", quest:"quest_mundial"}`. Tomarla
  activa el quest; el **quest log** (UI) se **deriva** de los quests activos + estado de sus steps (no se
  hardcodea).
- **Desde content-packs** (§6¾): un pack puede `add` un quest entero (la "misión de la semana") + su giver.

> Así, "misiones de mundo abierto que vas cambiando" = **quests declarados como data**, que se apoyan en el
> grafo de historia y el HintEngine que **ya existen**. El oráculo/asistente (§6½B) ya sabe guiarlos.

## 7. Coexistencia v1 / v2 + toggle en la UI (estrategia de migración)

Para no reescribir a ciegas (strangler-fig):
- **v1 (actual):** `Level.build()` imperativo. Queda **intacto** y es el default.
- **v2 (nuevo):** un loader `Mundo.fromModel(modelo)` que produce **el mismo array de salas** que
  `Level.build()` devuelve hoy (misma forma → el resto del juego no se entera).
- **Toggle:** en ⚙ Opciones **"Motor: v1 / v2"** (o `?engine=v2`), persistido en `Config`. Permite
  jugar el MISMO Nivel 1 con un motor o el otro y **comparar**.
- **Paridad (criterio de corte):** un test e2e compara `Level.build()` (v1) vs `Mundo.fromModel(modeloN1)`
  (v2) campo por campo (salas, doors, npcs, decor, enemies, pickups, wiring). Cuando son **equivalentes**,
  v2 es confiable. Recién ahí se puede **retirar v1** (o dejar ambos).
- **Autoría/ensamblado (patrón del repo):** el modelo se escribe como **data** (`levels/nivel-1.json` o
  fichas → `tools/gen-mundo.mjs` → `js/mundo.js`, igual que `gen-historia`/`gen-dialogos`). Validado en e2e.

## 8. Requisitos funcionales

- **RF-1:** Existe un **schema** documentado de Entidad + Componentes (§4) que cubre **todo** lo del
  inventario (§3): no queda atributo del juego sin lugar en el modelo.
- **RF-2:** El modelo es **declarativo y sin estado mutable**; el estado runtime queda separado (§5) y es
  el que persiste `save.js`.
- **RF-3:** `buildWorld(modelo)` es **idempotente** (dos corridas → mundo estructuralmente idéntico;
  random sembrado por id).
- **RF-4:** Todo se referencia por **id estable** (no por índice): historia, ads, save y pistas migran a ids.
- **RF-5:** **Coexistencia v1/v2** con toggle en la UI y **test de paridad** v1≡v2 sobre Nivel 1.
- **RF-6:** El **mismo motor** levanta un Nivel 2 cambiando sólo la data.
- **RF-7:** Capa **aditiva/compatible**: mientras v1 sea default, el juego actual no cambia (e2e + web-smoke
  siguen verdes).
- **RF-8 (IA acotada, §6½A):** una entidad puede tener `agent`/`brain` con `states`/`transitions`
  **declarados** (definición) y un `policy` (`rule`/`utility`/`llm`); el LLM **sólo elige entre transiciones
  legales** (grounding), nunca inventa estados. El `state` actual es runtime (serializable).
- **RF-9 (trazabilidad, §6½B):** el motor emite un **event log append-only** por `id` de entidad y expone
  `snapshot + eventLog + subgrafo` para un asistente; la respuesta del LLM va **grounded** en eso (GraphRAG),
  sin inventar. Sirve in-game (oráculo) y dev/meta (QA + "¿cómo va mi partida?").
- **RF-10 (rejugabilidad, §6¾):** existe una capa de **meta-progresión** persistente (cross-run, aparte de
  la save de partida); las `transitions` pueden mirarla → el mundo evoluciona entre partidas. El **default**
  de variación es **determinista** (sembrada por run/loop/meta) por costo; el runtime-LLM (`policy:"llm"`)
  está **disponible por entidad** para las partes donde se acepte latencia/costo (RF-8).
- **RF-11 (contenido vivo, §6¾):** el contenido se puede extender con **content packs** (overlays de data
  sobre el modelo base, activables por fecha) **sin tocar el motor**. Un quest nuevo = data nueva.
- **RF-12 (AI-authorable):** el modelo tiene **schema** y los cambios se validan (paridad + auditoría) → un
  asistente puede editar la **data** de forma confiable sin tocar código.
- **RF-13 (freemium IA, §6.9):** el acceso a las features `llm` resuelve por **suscripción / BYOK / gratis**
  (reusa la cadena de [ia-openrouter §0](ia-openrouter.md)); sin acceso, cada entidad usa su `fallback`. El
  **juego siempre es jugable en gratis** (más estático).
- **RF-14 (transparencia de IA, §6.9):** cada entidad full-AI declara `tier` + `model` testeado + `latencyMs`;
  la UI lo **deriva del modelo** (badge "✨ IA", qué modelo/latencia) sin hardcodear.
- **RF-15 (free completo + no-paywall, §6.9):** el pago **nunca traba ni esconde contenido**; el `fallback`
  es siempre una versión **jugable** (no ausencia). `tier` arranca en `any` (free = todo); apretarlo es
  **config/data**, no código. Empezar con **una** feature full-AI (chat NPCs) y escalar agregando el atributo
  `ai` a más entidades.
- **RF-16 (meta-progresión, §6.95):** estado **persistente cross-run** en `ts_meta` (aparte de la save de
  partida); `buildWorld(modelo, ctx)` es **puro** con `ctx={meta,runState}` y la variación usa
  `hash(seed+id+runs)` (determinista, no `Math.random` suelto). Morir/NG+ conserva la meta.
- **RF-17 (quests, §6.95):** un `quest` es una entidad **declarativa** = bundle de **aristas** (reusa
  `pre`/`sets`/`hints` del grafo y el `HintEngine`) + `requires`/`scope`/`rewards`; el **quest log** se
  **deriva** del estado de los steps; los packs pueden agregar quests. No es un sistema nuevo.

## 9. Criterios de aceptación

- e2e: **paridad** `Level.build()` (v1) ≡ `Mundo.fromModel(N1)` (v2) en los campos estructurales.
- e2e: **idempotencia** — `buildWorld(modelo)` dos veces produce estructuras iguales (deep-equal).
- e2e: **cobertura del schema** — toda `action:`/`door.gate`/`decor.type`/`sprite` del modelo existe en los
  registries (`Art`, handlers, `Historia`, personas) → auditoría como la de assets actual.
- El toggle v1/v2 cambia el motor sin errores de consola (web-smoke).

## 10. Plan por fases (cuando se apruebe implementar)

1. **F0 — este SDD** (acordar schema + alcance). ← estás acá.
2. **F1 — schema + modelo de Nivel 1 como data** (sin tocar runtime): escribir `levels/nivel-1` en el
   formato del modelo, derivándolo de `level.js`. Test que el modelo está completo (cubre las 38 salas).
3. **F2 — `buildWorld`/`Mundo.fromModel` + test de paridad** v1≡v2 (v1 sigue default).
4. **F3 — toggle v1/v2 en ⚙ Opciones** + parity en CI. Jugar Nivel 1 en v2.
5. **F4 — migrar los hardcodes** (`COLLAPSED`, `DOOR_ART`, gating, `ambientFor`) a atributos del modelo;
   historia/ads/save pasan a **ids estables**.
6. **F5 — extraer el motor** (`engine/` genérico vs `game/` contenido, §2.5) y que **Nivel 2 nazca en v2**
   (sólo data). Eventualmente v1 se retira.

## 11. Riesgos y preguntas abiertas

1. **Tamaño.** Es el refactor más grande del proyecto. Mitigación: fases chicas, v1 siempre default hasta
   paridad, todo cubierto por el test de paridad.
2. **Random determinista.** Hoy varias salas usan `Math.random()` en el armado (pisos en ruina, posiciones).
   Para idempotencia hay que **sembrar** por id. ¿Aceptamos que el layout quede fijo por sala (sí, mejor
   para tests y para "saber dónde cambiar")?
3. **Formato de autoría.** ¿`levels/*.json` (data pura) o fichas `.md` con bloques → generador (como
   `gen-historia`)? Recomendado: **JSON por nivel** para el mapa, fichas para la prosa/personalidad.
4. **Sub-modos** (super/arcade/vinilos) son mini-juegos con su propia lógica: ¿entran al modelo como
   `room` con `tipo:modo` (sólo el lanzador es entidad) o quedan afuera? Propuesta: el **lanzador** es una
   entidad `door`/`machine`; el mini-juego interno sigue como módulo.
5. **¿Editor?** Con el modelo declarativo, un **editor visual** (tipo Tiled) es posible a futuro — fuera de
   alcance, pero el schema debería no cerrarle la puerta.

---

> Relacionados: [TECNICAS.md](TECNICAS.md) (grafo de entidades — la teoría que esto formaliza),
> [GRAFO.md](nivel-1/GRAFO.md) (el grafo espacial actual, a mano → se derivaría del modelo),
> [historia-grafo.md](nivel-1/historia-grafo.md) (el `story` component), [publicidad.md](publicidad.md)
> (el `ad` component), [idiomas.md](idiomas.md) (el `i18n` component), y `save.js` (el **estado** separado
> de la **definición**).
