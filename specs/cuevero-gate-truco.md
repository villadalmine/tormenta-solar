# SPEC: Gate del cuevero — desbaratar la red del tahúr (truco) antes de la tormenta

- **Estado:** **Implementado** (2026-06-27) — core completo + ruta A (Guido) + ruta B (vos) + dead-end. Ver §9.
- **Nivel:** 1
- **Última actualización:** 2026-06-27
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

## 9. Implementación (2026-06-27)

Todo en `js/game.js` (capa aditiva, flags privados + `FLAG_SETTERS`/`FLAG_GETTERS`/`historiaState`) + i18n ES/EN
(`g.cuevero.busy|menuTitle|menuSub|optA|optB|optC|bGo|cBye|linyera`, `g.guido.*`, `g.truco.winGate`) + overlay
`#cueveromenu` en `index.html` (calcado de `armasmenu`). Flags nuevos serializados/restaurados (`save.js`) + en
`historiaState()` (los oráculos los ven). Guido pasa a `action:'guido'` en `js/level.js` (regenerado `level-data.js`).

- **RF-1/RF-7 (gate):** `handleCuevero` con `c.outcome==='real'` → `if (!cueveroUnlocked) cueveroBusy(c)`. Sólo se
  gatea el cuevero que SÍ cambia (los otros dos ya te rechazan por otros motivos → encaja con el humor de la opción C).
- **RF-2 (3 opciones):** `cueveroBusy` tira `TL('g.cuevero.busy')` + `openCuevero` (overlay, 3 botones A/B/C →
  `pickCuevero`). ESC/Cerrar como los otros menús.
- **RF-6 (ruta B):** al ganarle al tahúr (`arcade` result `win` vs `tahur`) → `cueveroUnlocked = true` + mensaje
  `g.truco.winGate` ("el tahúr te perdona"). Sigue abriendo la puerta al chino (`trucoWon`) como antes.
- **RF-3/RF-4/RF-5 (ruta A):** `pickCuevero('a')` → `startRutaContactos` (`guidoSummoned`). `handleGuido`:
  1ª vez te presenta (`guidoRecruited`); si `tahurDiscovered` → `guidoFollowing`, si no "volvé más tarde".
  `tahurDiscovered` se setea al ENTRAR a la trastienda (`hasTag(r,'truco')` en `transition`). Con Guido siguiéndote,
  `NPC_ACTIONS.truco` detecta `guidoFollowing` y dispara `guidoBeatsTahur` (auto-win) → `cueveroUnlocked`.
- **Tests:** `tests/e2e.js` (hook `Game.__gate`) cubre CA-1..CA-5 (ruta A end-to-end + dead-end + venta destrabada)
  + round-trip de los flags nuevos. Corre **después** del test de Mensajero (la venta dispara la tormenta).

### Deuda / simplificaciones respecto al diseño
- **Linyera-guía (RF-3):** el "seguime, pibe" cross-room **no** es un follow literal (el motor mueve NPCs sólo
  dentro de la sala). Por ahora es **scriptado por mensajes** + flag `guidoSummoned` que destraba la cadena con Guido.
  El walking-guide real queda pendiente.
- **Guido-follow (RF-4):** `guidoFollowing` es **lógico** (no hay un Guido físico acompañándote sala a sala); el
  auto-win se dispara al sentarte con el tahúr teniendo `guidoFollowing`.
- **Grafo (§5): ✅ HECHO (2026-06-27, v195).** Arista `cuevero_gate` (sets `cueveroUnlocked`, en `cueveros.md`) +
  `tormenta` ahora con `pre: { cueveroUnlocked }`. Ambas rutas setean el flag vía `applyEdge('cuevero_gate',
  'cueveroUnlocked')` (el grafo es dueño de la transición, Fase 2). El HintEngine ya guía: en la cueva la 1ª pista es
  "destrabá al cuevero (ganale al tahúr)" y, una vez destrabado, "dispará la tormenta". *(Resta: la cadena Guido en sí
  — recruit/follow — no es un sub-grafo; sigue resuelta por flags+menú.)*

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
