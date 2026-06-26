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
- **El relay (tipo 3 recibe de 1 y 2):** un grafo social de quién le contó qué a quién → el decorativo repite el
  chusme ("me dijo el borrachín que…"). Modelar como **aristas** entre NPCs (entidades), no ifs.
- **Memoria por NPC:** lo que chusmean persiste/evoluciona (agent.memory). 
- Todo esto encaja con el modelo v2 (entidades+componentes+grafo+memoria); F1 es el placeholder v1 a migrar.
