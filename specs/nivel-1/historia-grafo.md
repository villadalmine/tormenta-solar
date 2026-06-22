# SPEC: Grafo de historia + motor de pistas (la "didáctica" del juego)

- **Estado:** Draft (diseño; nada implementado todavía)
- **Nivel:** transversal (se estrena en Nivel 1)
- **Última actualización:** 2026-06-22

## 1. Contexto y objetivo

Hoy la **progresión de la historia** vive desparramada en flags sueltas dentro de `js/game.js`
(`stormed`, `borrachosHappy`, `trucoWon`, `bunkerUnlocked`, `chinoFrontOpen`, `gaveBeers`,
`hasCementoTicket`, `hasMegaDrive`, `fifaWon`, `loopCount`, `armado`…) y las **pistas** son estáticas
(el campo `hint:` de los borrachines + lo que cada `action` decide decir). No hay un lugar único que diga
**"la historia va así y se ramifica así"**, ni nada que, dado **dónde está parado el jugador**, sepa
**qué pista darle** sin spoilear.

Este spec define esa pieza: **el grafo de historia** (la narrativa como una **máquina de estados /
grafo de decisiones**, con disparadores como *la tormenta solar*) y, encima, un **motor de pistas**
(`HintEngine`) que consulta el grafo para responder *"¿qué conviene hacer ahora?"*. Ese motor es lo que
**luego** alimenta a un **NPC-guía** que tira pistas (scripteado y/o grounding para el chat IA).

**Cómo se diferencia de lo que ya hay (no se duplica):**
| Spec | Qué modela | Pregunta que responde |
|---|---|---|
| [`GRAFO.md`](GRAFO.md) | mundo/espacial + gating | *¿a dónde puedo ir?* |
| [`TECNICAS.md` §2](../TECNICAS.md) | quest DAG lock-and-key | *¿qué desbloquea qué?* |
| **este** | historia como estados + ramas + **pistas** | *¿en qué punto de la historia estoy y qué hago ahora?* |

Es un **RAG de decisiones**: el grafo es la base de conocimiento; el `HintEngine` hace el *retrieval*
(qué nodo/arista es relevante al estado actual); el NPC-guía es el *generation/presentation*.

## 2. Modelo del mundo (lo que ya existe)

- **Estado de la historia = vector de flags** (ya existen en `game.js`): `stormed`, `borrachosHappy`,
  `gaveBeers`, `fifaWon`, `trucoWon`, `bunkerUnlocked`, `chinoFrontOpen`, `hasCementoTicket`,
  `hasMegaDrive`, `armado`, `loopCount` + inventario del player (`coins`, `falopa`, `diosa/carne/fiambre`,
  `caramelos`, `hasMegaDrive`). **Estos flags YA SON los nodos de estado** — el spec no inventa estado
  nuevo, lo hace **explícito y consultable**.
- **Decisiones/disparadores = los `action:` de los NPCs/puertas** (ya existen en `level.js`): `borracho`,
  `truco`, `totem`, `lujo`, `iorio`, `fifa`, `chori`, `armas`, `loop`, `shop`, `chat`, `frogger`.
- **Disparador central — la tormenta solar:** en una **cueva** (sala 8/35/36/37) el cuevero del fondo
  te cambia dólares → **justo en ese momento revienta la tormenta** (`g.storm`, `g.cuevero.real`) →
  `stormed = true`. Es la **arista que parte la historia en dos** (pre-tormenta / post-tormenta).
- **Pistas hoy:** estáticas y locales (campo `hint:` en borrachines; cada `action` hardcodea su mensaje).

## 3. Diseño / narrativa

### 3.0 Cómo se llama esto (la teoría)
Para fijar vocabulario (y que no parezca magia "el linyera sabe todo"):

- **Estado del juego = vector de flags.** El "todo lo que está pasando" es el conjunto de flags de §2.
- **Máquina de estados / espacio de estados (reachability graph):** todos los estados posibles y las
  transiciones entre ellos. Es el "árbol de todo lo que el jugador puede iterar".
- **Modelo de planificación (precondición → acción → efecto), estilo STRIPS/PDDL:** la forma **compacta**
  de describir el espacio de estados **sin enumerarlo a mano**. Declarás por acción *"requiere X, produce
  Y"* y el grafo completo (qué destraba qué) **se deriva solo**. ← Esto es lo que se declara en las fichas.
- **Oráculo / planner:** un buscador (BFS/Dijkstra) sobre ese grafo. Desde el estado actual sabe **qué es
  alcanzable, qué falta y qué desbloquea qué**. **Así "sabe" el linyera**: no tiene el guion en la cabeza,
  *consulta el grafo y planifica* el próximo paso. (Es "un dios" porque ve el grafo entero, no porque se
  le escriba cada respuesta.)
- **Retrieval / grounding (el "RAG"):** recuperar del grafo el paso relevante al estado actual. Si el NPC
  habla por IA, ese paso se le pasa como **grounding** para que lo diga con su voz **sin inventar rutas**.

> **Decisión de arquitectura (resuelve "¿central o consultando a cada uno?"): las dos, en capas.**
> (1) **Cada ficha declara su pedacito** (precondición/efecto/pistas) — *definido en cada parte*.
> (2) Se **ensambla** un único **grafo omnisciente** a partir de todas las fichas — *el "dios", pero
> derivado, no un duplicado que se desincroniza*. (3) El linyera = **oráculo/planner** sobre ese grafo.
> Misma lógica que ya usa [`GRAFO.md`](GRAFO.md) (junta aristas de cada ficha) y los pools ` ```gen `.

### 3.1 El grafo de historia
Un **grafo dirigido** de **beats** (estados narrativos significativos) unidos por **aristas de decisión**.
Cada arista tiene **precondición** (flags + lugar + ítems), una **acción** (la decisión del jugador) y un
**efecto** (qué flags cambia). Ejemplo de la rama central:

```mermaid
flowchart TD
  inicio([Llegás a Florida y Lavalle]) -->|comprás dólares en la cueva| storm{{TORMENTA SOLAR · stormed=true}}
  inicio -->|alimentás a los 3 borrachines| edificio[Edificio abierto · borrachosHappy]
  edificio -->|robás el tótem de 3 monos| bunker[Sos GURÚ · bunkerUnlocked]
  storm -->|le das falopa a Iorio| frente[Frente del chino abierto · chinoFrontOpen]
  storm -->|entrás por la cueva al fondo del super| atras[Entrás al chino por atrás]
  storm -->|ganás el truco| puertaChino[Puerta directa al chino · trucoWon]
  storm --> portal{{Casa de Cambio · PORTAL FINAL}}
  bunker -->|dormís en el catre| loop[(LOOP de supervivencia · loopCount++)]
  loop --> portal
  portal -->|cruzás| fin([Fin Nivel 1 · salto temporal])
```

(Los nodos `{{...}}` son disparadores; el diagrama completo y exhaustivo vive en este archivo y se deriva
del **artefacto de datos** de §3.3.)

### 3.2 El motor de pistas (`HintEngine`) — la "didáctica"
Dado el **estado actual** (los flags), el motor calcula la **frontera**: las aristas cuya precondición
está **a un paso** de cumplirse (o la siguiente acción del camino crítico). De ahí emite una **pista
escalada por nivel de spoiler**:

- **Nivel 0 (ambiente):** "Algo se huele raro en la cueva..."
- **Nivel 1 (rumbo):** "Los borrachines no te dejan pasar porque quieren que les convides algo."
- **Nivel 2 (concreto):** "Conseguí una Diosa Tropical en el super (sección DIOSAS) y dásela al de la cerveza."

Reglas (atadas a [`ia-openrouter.md` §0](../ia-openrouter.md)):
- **La pista CRÍTICA la garantiza el código** (retrieval sobre el grafo), nunca el LLM. El chat IA del
  NPC-guía es **flavor**: se le pasa la pista recuperada como **grounding** y la dice con su voz; no
  inventa rutas.
- El motor evita spoilear de más: arranca en Nivel 0/1 y sube si el jugador insiste o sigue trabado.

### 3.3 De dónde sale el grafo: autoría distribuida → vista ensamblada
**Fuente de verdad = las fichas** (no un archivo central que haya que mantener sincronizado a mano). Cada
ficha de `personajes/`/`edificios/` declara **su arista** en un bloque estructurado (igual que hoy declara
sus pools ` ```gen `). Un paso de **ensamblado** junta todas las aristas en el **grafo omnisciente**.

**(a) Lo que declara cada ficha** — un bloque ` ```hist ` por decisión que ofrece la entidad:
```hist
id: disparar_tormenta
pre: { at: cueva }                 # precondición: lugar + flags + ítems
does: cambiar dólares con el cuevero del fondo
sets: { stormed: true }            # efecto: qué flags cambia (acá nace post-tormenta)
hints:                             # pistas por nivel de spoiler (i18n, es fuente)
  - Algo se huele raro abajo, en la cueva.
  - El negocio de verdad está en la cueva del fondo.
  - Hablá con el cuevero del fondo y cambiá: ahí arranca todo.
```
Otro ejemplo (ficha de los borrachines):
```hist
id: abrir_edificio
pre: { flags: { borrachosHappy: false } }
does: darle a cada borrachín lo que quiere (diosa / carne / fiambre)
sets: { borrachosHappy: true }
hints: [ "…", "…", "…" ]
```

**(b) El ensamblado** (un parser tipo `jobsFromFichas()`, que ya existe para los pools) compila todos los
` ```hist ` en una estructura única — el **modelo de planificación** que consume el motor:
```js
// estructura ENSAMBLADA (derivada, no escrita a mano)
Historia = {
  edges: [ { id:'disparar_tormenta', pre:{at:'cueva'}, sets:{stormed:true}, hints:[…] }, … ],
  // los "beats" (pre_tormenta / post_tormenta / gurú / loop / portal) se infieren de los flags
};
```

**(c) Validación (e2e):** que el grafo derivado no tenga **ciclos en el camino crítico**; que **toda**
`action:` real del nivel tenga su ` ```hist `; que cada `sets` sea precondición de otra arista o terminal
(estado final). Así el grafo omnisciente **nunca miente ni se desincroniza**: si una ficha cambia, el
grafo se recompila.

> Capa **aditiva**: el artefacto ensamblado (p. ej. `js/historia.js` generado, o leído de las fichas en
> runtime) va detrás de un `typeof Historia !== 'undefined'`; sin él, el juego anda igual.

### 3.4 El linyera filósofo como oráculo (futuro, "luego")
El **linyera filósofo** (ya chateable en la calle) es el **narrador omnisciente**: habla como un Diógenes
medio iluminado *porque ve el grafo entero*. Al hablarle, el juego corre `HintEngine.next(estado)`
(= planner sobre el grafo ensamblado de §3.3) y obtiene el próximo paso de la frontera. Cómo lo dice:
- **Sin IA:** dice la pista del nivel de spoiler actual, tal cual (i18n).
- **Con IA (chat):** se le pasa esa pista recuperada como **grounding** en el system prompt y la transcrea
  con su voz canchera (ver [`glosario-transcreacion.md`](../glosario-transcreacion.md)). **La ruta sale del
  grafo, no del LLM** (regla de [`ia-openrouter.md` §0](../ia-openrouter.md)): el modelo le pone la voz, no
  inventa qué destraba qué.

Diégesis: que "sepa todo" queda justificado en la ficción — es el tipo que se cansó del sistema, lo vio
desde afuera y ahora *entiende cómo funciona la máquina*. El oráculo no rompe la inmersión: la explica.

## 4. Requisitos funcionales
- **RF-1:** Existe un grafo de historia declarativo (`Historia.beats` + `Historia.edges`) que cubre
  **todas** las decisiones reales del Nivel 1 (las `action:` y los flags de §2), incluido el disparador
  de la tormenta.
- **RF-2:** `HintEngine.next(estado)` devuelve, para cualquier estado válido, **al menos una** arista de
  frontera y su pista al nivel de spoiler pedido (0/1/2).
- **RF-3:** Las pistas son **i18n** (claves o catálogo, es-AR fuente; transcreación al inglés — ver
  [`glosario-transcreacion.md`](../glosario-transcreacion.md)).
- **RF-4:** Capa **aditiva**: sin `Historia`/`HintEngine`, el juego funciona igual (los flags y la lógica
  actual no dependen del grafo).
- **RF-5 (futuro):** Un NPC-guía consume el motor; si usa IA, la pista crítica viene del motor (grounding),
  no del LLM.

## 5. Estados y flags
No agrega flags nuevos: **reusa** los de `game.js` (§2). El aporte es **leerlos como un vector de estado**
y mapear cada transición a una arista. (Si más adelante se quiere, se puede refactorizar `game.js` para
que **escriba** los flags vía el grafo — fuera de alcance de este Draft.)

## 6. Criterios de aceptación
- El e2e puede **cargar `Historia`** y validar el grafo: sin ciclos en el camino crítico; cada `sets`
  tiene consumidor o es terminal; toda `action:` real del nivel está representada.
- Para una **secuencia de estados de ejemplo** (recién llegás → borrachines felices → tormenta → …),
  `HintEngine.next()` devuelve la pista esperada (test de tabla).
- Paridad i18n de las pistas (es/en).

## 7. Decisiones tomadas / preguntas abiertas

**Resueltas (este Draft):**
- **¿Central o consultando a cada uno?** → **Autoría distribuida en las fichas (` ```hist `) + grafo
  ensamblado** (§3.3). No hay fuente central duplicada.
- **¿Cómo "sabe" el linyera?** → Es un **oráculo/planner** sobre el grafo ensamblado (§3.0, §3.4); la IA
  solo le pone la voz (grounding), no decide rutas.
- **¿Quién guía?** → El **linyera filósofo** que ya existe (no se agrega NPC nuevo).

**Abiertas (decidir antes de implementar):**
1. **¿El grafo solo describe, o también maneja los flags?** Fase 1 (recomendada) = **describe** + alimenta
   pistas; `game.js` sigue dueño de los flags. Fase 2 (opcional) = el grafo es la **fuente** y `game.js`
   setea los flags a través suyo (más limpio, más refactor).
2. **¿El grafo se lee en runtime de las fichas, o se pre-compila** a `js/historia.js` con un script (como
   `gen-dialogos.mjs`)? (Recomendado: pre-compilar, para no parsear markdown en el browser.)
3. **Política de spoiler:** ¿la pista sube de nivel sola si el jugador sigue trabado (timer/insistencia),
   o el jugador pide "dame más data"?
4. **Multi-camino:** cuando hay varias aristas de frontera (truco / Iorio / cueva para entrar al chino),
   ¿el motor prioriza una, las lista, o elige por cercanía de precondición?
5. **Alcance del grafo:** ¿solo el camino crítico (llegar al portal), o también los secundarios
   (búnker/loop, FIFA, disquería→Cemento) con sus pistas?
