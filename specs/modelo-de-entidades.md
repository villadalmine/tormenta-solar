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
