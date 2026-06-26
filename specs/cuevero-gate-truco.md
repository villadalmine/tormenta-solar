# SPEC: Gate del cuevero — desbaratar la red del tahúr (truco) antes de la tormenta

- **Estado:** Draft (idea del dueño, 2026-06-26) — **no implementado**
- **Nivel:** 1
- **Última actualización:** 2026-06-26
- **Relacionado:** `truco.md` (motor de truco real), `nivel-1/historia-grafo.md` + `js/historia.js` (el GRAFO — esto
  agrega nodos/aristas), `npcs-vivos.md` (Mensajero/follow/chusmerío), `modelo-de-entidades.md` (quest = bundle de
  aristas §6.95). Toca el **arranque principal**, así que se diseña en el grafo (las fichas `specs/nivel-1/**`).

## 1. Contexto y objetivo

**Problema (dueño):** todos los NPC te empujan a la cueva (es la misión principal), pero **si vas directo, ganás de
una y te perdés todo lo demás**. Hay que **gatear** al cuevero — el único que te cambia dólares y dispara la tormenta
— detrás de **desbaratar la red del tahúr**, que se hace **ganándole al truco**.

**Idea:** el cuevero está "ocupado, con dramas con el tahúr, tiene un pedido grande que cumplir" y **no te vende**.
Para destrabarlo tenés que **ganarle al truco al tahúr** — vos mismo (si sabés jugar) o **pidiendo ayuda** (si no
sabés). Recién ahí el cuevero te vende y **estalla la tormenta**. Esto convierte el "ir a la cueva" en el **final**
de una cadena, no el atajo del principio, y hace que el resto del mundo (edificio, EducaciónIT, súper, arcade) tenga
sentido recorrerlo.

## 2. Modelo del mundo (lo que ya existe)

- **Cuevero** (`handleCuevero`, salas 35/36/37): hoy vende **directo** (`!bought && !stormed`) → comprar → entrás a la
  cueva → eventualmente `triggerStorm()` (`applyEdge('tormenta','stormed')`). **No hay gate.**
- **Tahúr / truco** (sala 10, trastienda): `launchArcade('truco', {opp:'tahur'})`; ganar setea **`trucoWon`** (se
  consume al cruzar la puerta `chinotruco` al chino) y **`trucoEverWon`** (persistente, para el HITO). El motor de
  truco real ya existe (`js/truco.js`, `truco.md`).
- **Guido** (EducaciónIT Piso 8, sala 2): `sprite:'guido'`, hoy solo un NPC de diálogo.
- **`follow`**: mecánica existente (el vendedor de Garbarino te sigue, `n.follow` + `lines`, `game.js:1328`). Reusar
  para el linyera-guía y para Guido.
- **Chat con opciones**: el chat IA existe; las **opciones fijas** (botones) son nuevas para este flujo (ver §7).

## 3. Diseño / narrativa (el flujo completo, según el dueño)

### 3.1 El cuevero ocupado (gate)
Cuando le hablás al cuevero y **todavía no desbarataste al tahúr**, te tira líneas **aleatorias** (pool i18n):
- "estoy ocupado, tengo dramas con el tahúr"
- "tengo un pedido grande que cumplirle, no puedo venderte nada"
- (variantes en la misma línea)

…y mientras te cuenta eso, **se te abre un chat con 3 OPCIONES**:

- **A — "Flaco, te puedo ayudar a sacártelo de encima, tengo contactos."** → **la ruta de AYUDA** (la que te sirve si
  NO sabés jugar al truco 😄). Dispara la cadena linyera→Guido (§3.2).
- **B — "Flaco, ¿vos qué podés hacer?"** → **la ruta PROPIA**: vas, encontrás al tahúr y le ganás vos mismo (§3.3).
- **C — "Flaco, dejate de joder, mucha mafia, me voy a otro cuevero más limpio."** → **dead-end**: no resuelve nada,
  no pasa nada (vuelve a estado normal; podés re-hablar y elegir otra).

### 3.2 Ruta A — "tengo contactos" (te aparece el linyera y te lleva a Guido)
Le decís que conocés a alguien… **pero en realidad no conocés a nadie**. En ese momento:
1. **Aparece un linyera** y te dice **"seguime, pibe"** → tenés que **seguirlo** (él camina, vos atrás).
2. Te lleva **hasta donde está Guido** (EducaciónIT, el de los cursos).
3. Guido: **"¿qué pasa?"** — vos: **"no sé, me trajeron hasta acá."**
4. El linyera: **"pero vooo so locooo viteh, van a suceder cosas raras… necesitás alguien que sepa jugar al truco"**
   → y **desaparece**.
5. Guido: **"¿truco? soy el mejor. Si querés jugar, avisá."**
6. **Condición (clave):** Guido **te sigue SOLO si ya descubriste al tahúr** (sabés dónde está / lo desbloqueaste).
   - Si **NO** lo descubriste todavía → Guido: **"toy ocupado, volvé más tarde."** (no te sigue aún).
   - Cuando **descubrís al tahúr y volvés**, Guido **te sigue** (ya "conoce" el NPC que lo necesita).
7. Vas con Guido a la trastienda, **Guido juega al truco contra el tahúr y le gana**, y **te pasa el mensaje del
   tahúr** para que se lo des al cuevero.

### 3.3 Ruta B — "yo me arreglo" (lo hacés vos)
Si elegís B (o directamente vas y jugás), **nada de lo del linyera ni Guido pasa**. Encontrás al tahúr, **le ganás
vos** al truco (motor actual) y **el tahúr te da el mensaje** ("bien flaco, me ganaste; andá al cuevero y decile que
lo perdono"). Con ese mensaje vas al cuevero.

### 3.4 El desenlace (común a A y B)
Con el **mensaje del tahúr** ("lo perdono"), volvés al **cuevero** → ahora **sí te vende** → comprás dólares →
**estalla la tormenta** (el arranque del caos, como hoy pero ganado).

## 4. Requisitos funcionales

- **RF-1 — Gate del cuevero:** el cuevero NO vende hasta tener el **mensaje del tahúr** (flag nuevo, ej.
  `cueveroUnlocked` / `tahurForgives`). Mientras no lo tengas, `handleCuevero` tira una **línea aleatoria del pool
  "ocupado"** + abre el **chat de 3 opciones**. (Hoy vende directo → se mueve detrás del flag.)
- **RF-2 — Chat de 3 opciones (botones fijos):** al hablar al cuevero (gateado), 3 opciones: **A** (contactos →
  cadena Guido), **B** (yo me arreglo → ruta propia), **C** (dead-end, sin efecto). Datos, no hardcode disperso.
- **RF-3 — Ruta A: linyera-guía (follow scriptado):** elegir A **spawnea un linyera** con `follow` que **camina hacia
  Guido** (waypoint) y te dice "seguime". Al llegar a Guido: diálogo scriptado (Guido "¿qué pasa?" → vos → linyera
  monólogo → **el linyera se va/desaparece**) y **Guido queda "reclutable"**.
- **RF-4 — Guido condicional al tahúr descubierto:** Guido **te sigue** (componente `follow` activado) **solo si
  `tahurDiscovered`** (descubriste dónde está el tahúr). Si no, "volvé más tarde". Al volver con `tahurDiscovered`,
  Guido pasa a seguirte. (Necesita el flag **`tahurDiscovered`** = entraste/viste la trastienda del tahúr.)
- **RF-5 — Guido juega y gana:** llevás a Guido a la trastienda → se dispara un truco donde **Guido es el que juega y
  GANA** (auto-win, o el motor con Guido como jugador). Resultado: setea el mensaje del tahúr (RF-7) **sin** que vos
  hayas tenido que saber jugar.
- **RF-6 — Ruta B: ganás vos:** sin la cadena. Ganarle al tahúr (motor actual, `trucoWon`/`trucoEverWon`) **te da el
  mensaje** del tahúr (RF-7). Si elegís B, no spawnea linyera ni Guido-follow.
- **RF-7 — El mensaje del tahúr → destraba el cuevero:** ganar (por A o B) setea **`cueveroUnlocked`** (el "te
  perdono"). Con eso, `handleCuevero` **vende** → comprar dispara la tormenta (flujo actual de la cueva).
- **RF-8 — Aditivo / compatibilidad:** si algo de esto falta (módulos, IA), el flujo cae al **comportamiento actual**
  (el cuevero vende) para no romper el arranque. La cadena Guido es una **capa** sobre el truco que ya existe.

## 5. Estados y flags (nuevos)

| Flag | Significado | Set por | Consumo |
|---|---|---|---|
| `tahurDiscovered` | viste/entraste la trastienda del tahúr | entrar a sala 10 (o ver la puerta `chinotruco`) | persistente |
| `guidoRecruited` | hiciste la cadena linyera→Guido (ruta A) | llegar a Guido con el linyera | persistente |
| `guidoFollowing` | Guido te está siguiendo | Guido reclutado **y** `tahurDiscovered` | hasta jugar el truco |
| `cueveroUnlocked` | tenés el mensaje "te perdono" del tahúr | ganar el truco (A: Guido; B: vos) | persistente; habilita la venta |

- `trucoWon`/`trucoEverWon` existen; **el gate del cuevero usa `cueveroUnlocked`** (no `trucoWon`, que se consume al
  cruzar al chino). Ganar el truco setea **ambos** según la ruta.
- Todo esto entra al **grafo** (`specs/nivel-1/**` → `js/historia.js` regenerado): nodos `tahur`, `guido`, `cuevero`
  con aristas `pre`/`sets`. La tormenta (`stormed`) pasa a tener `pre: { cueveroUnlocked }`.

## 6. Criterios de aceptación

- **CA-1:** hablar al cuevero sin `cueveroUnlocked` → línea "ocupado" + 3 opciones; **no** vende (e2e: `handleCuevero`
  no setea `bought`/no entra a la cueva).
- **CA-2 (ruta B):** ganarle al tahúr (motor) → `cueveroUnlocked` → el cuevero vende → tormenta. (e2e con el truco
  forzado a `win`.)
- **CA-3 (ruta A):** elegir "contactos" → aparece linyera follow → al llegar a Guido, Guido reclutable; con
  `tahurDiscovered` Guido sigue; jugar → Guido gana → `cueveroUnlocked`. (e2e por pasos del grafo.)
- **CA-4:** opción C no cambia ningún flag (dead-end).
- **CA-5:** Guido NO sigue si `!tahurDiscovered` (dice "volvé más tarde"); empieza a seguir al volver con el flag.
- **CA-6:** sin la cadena nueva, el resto del juego (edificio/súper/arcade) y el grafo existente siguen verdes
  (paridad + e2e + historia).

## 7. Preguntas abiertas

- **Chat de opciones fijas:** ¿reusar el panel del chat IA con botones, o un overlay nuevo tipo `guardamenu`/
  `armasmenu` (que ya son menús de opciones)? Propuesta: **calcar `armasmenu`** (overlay de opciones), no el chat IA.
- **¿El "ocupado" es chat IA o líneas fijas?** Propuesta: **pool i18n fijo** (rápido, sin red) + opcional sabor IA
  (persona `cuevero`, que ya existe) si está disponible.
- **Guido jugando:** ¿auto-win (cinemático corto) o el motor de truco con Guido como "máquina aliada"? Propuesta:
  **auto-win con un par de líneas** (más simple y fiel a "Guido le gana"); el motor real queda para la ruta B (vos).
- **`tahurDiscovered`:** ¿se gana al ENTRAR a la trastienda, o al solo VER la puerta del tahúr? Propuesta: **entrar**
  (o interactuar con la puerta `chinotruco`).
- **El linyera-guía:** ¿es uno de los linyeras-oráculo existentes (Pechito/Dante) o uno genérico? Propuesta:
  **genérico scriptado** (aparece, guía, se va) para no pisar a los oráculos chateables.
- **Ruta A si NUNCA descubrís al tahúr:** queda en "volvé más tarde" hasta que lo descubras — ¿una pista del
  `HintEngine` que te empuje a encontrar la trastienda? Propuesta: **sí**, sumar la pista al frontier.
- **Las otras cuevas (3):** ¿las tres comparten el gate, o el chiste de "me voy a otro cuevero más limpio" (opción C)
  insinúa que hay alternativas? Propuesta: **todas gateadas igual** (la opción C es humor, no una ruta real).

## 8. Bocetos (no normativo)

```text
cuevero (hablar)
  └─ if !cueveroUnlocked:  line(pool "ocupado") + chat 3 opciones
        A "tengo contactos"  → spawn linyera-guía (follow→Guido)
              → Guido: si tahurDiscovered → follow; else "volvé más tarde"
              → con Guido en la trastienda → Guido gana truco → cueveroUnlocked
        B "yo me arreglo"     → (vas vos) ganás truco al tahúr → cueveroUnlocked
        C "me voy a otro"     → nada
  └─ if  cueveroUnlocked:  vende → comprás → triggerStorm()
```
