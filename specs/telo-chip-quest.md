# El giro del telo: la trampa del CHIP + la quest del pibe de Garbarino

**Estado:** **Q0-Q4 IMPLEMENTADO y jugable (v221)** — arco completo end-to-end. Quedan pulidos (ver §6).

## ✅ v226 — REDISEÑO al flujo definitivo (visión del dueño)
**El grafo final (todo NPC, data-driven):**
1. **Telo** (sub-modo): rubia→jacuzzi→cama→robot. **Escapás** (puerta marcada) → al bar. **Te atrapa** → caés a…
2. **`La habitación del telo`** (sala REAL nueva, tag `telohab`, se entra con `spawnIn`): están los **3 LINYERAS
   chateables** (IA, personas filosofo/poeta/pechito, flag `chiplin`). Hablás con **cada uno** (`chipLinNote` en openChat);
   al hablar con los 3 (`chipLinMaybePosta` en closeChat) → **posta** → **CORTE DE ESCENA** (`chipBecomeGarbarino`, v230):
   `playingAs='garbarino'`, **`spawnIn` el edificio de Garbarino**, el NPC vendedor se **oculta** (`invisible=true`, *ahora
   sos vos*) y arrancás directo en `chipStep='troyano'`. El **Carpo queda dibujado acostado en la cama** del telo
   (`telohab.carpoInBed=true` → hero idle rotado + 💤🤖 sobre el catre). **No hay paso `garbarino` intermedio** (lo resuelve
   la posta): cambia sala+sprite+música = la transformación es inequívoca. El sprite del jugador pasa a `Art.npc.vendedor`+💼
   vía `player.asGarbarino` (player.js draw).
3. **`troyano`** (Maxi sala 1 + Marcos sala 3, ambos) → `consola`.
4. **`consola`** (un jubilado del cine Consolas) → los **2 jubilados te SIGUEN** (companions) → `consola2`.
5. **`consola2`** (**El flaco del Trucotron**, arcade sala 4, flag `consolaGuy`) → te da la **consola**; jubilados se van
   rezongando → `cure`.
6. **`cure`** (cualquier **linyera/oracle**) → `cureChip`: el juego **salta a `telohab`** (sos el Carpo, `carpoInBed` se
   limpia); vos —chipeado—
   querés **estallar el sol**, el linyera te **mete la consola a la fuerza** → resaca → **SIN chip**. (`useConsola` redirige:
   no te curás solo.)
**Lección reforzada:** todo flag custom de NPC (`chiplin`, `consolaGuy`, `jubilado`) va a `makeRoom` + `gen-level` + `mundo`
(si no, se pierde en v1 → el NPC no matchea). `CHIP_QUEST` es data; el paso `linyeras` y el `cure` usan código puntual.

## ✅ v225 — versión "larga" + fixes de playtest
- **Telo (giro):** caught → el robot **se va y quedás en la habitación** (fase `chipped`) → buscás el **📱 celu en la
  mesita** (glow) → `phonecall` (texto ARRIBA, grande, `[E]` para seguir) → salís chipeado. La puerta de salida está
  **marcada** (verde+glow+"SALIDA"+flecha) y el Carpo salta al MEDIO del cuarto (escapable corriendo).
- **Paso 'linyeras' (largo):** los **3 linyeras aparecen al lado tuyo** (companions `chiplinyera`), te **boludean**
  (pool `g.chip.boludeo.*`, charlas filosóficas) y a la **4ª** te dan la posta → `garbarino`.
- **Consola en 2 pasos:** `consola` (hablás a un jubilado en el cine Consolas) → los **2 jubilados te SIGUEN** al arcade
  (companions, paso `consola2`) → **'El flaco parado'** (NPC nuevo `consolaGuy` en el arcade) → chat estilo Matrix + te
  **da la consola** + los jubilados se van **rezongando**. → `cure` → usás la consola [I] → curado.
- **FIX clave:** `makeRoom` (v1) no copiaba flags custom (`jubilado`/`consolaGuy`) → los NPCs perdían el flag → no
  matcheaban. Arreglado en `makeRoom` + `gen-level` + `mundo`. **Lección:** todo flag de NPC nuevo va a esos 3 lugares.
- **Legibilidad:** diálogos del chip a 15s; `g.chip.cured` aclara que te desplomás dormido y te despertás.

## ✅ IMPLEMENTADO (v221) — el arco completo, jugable
La quest es **DATA** (`CHIP_QUEST` en game.js = grafo lineal de pasos `{id, on, next, msg, fx, partial}`) + un runtime
GENÉRICO (`chipTry`/`chipMatch`) que matchea el NPC contra `on` (rol/sprite/tag/nombre) y avanza al `next` — **sin
if-chain por paso** (REGLA #0, directiva del dueño). Los efectos (`CHIP_FX`: `becomeGarbarino`, `buyConsola`) y el
`useConsola` son code puntual (comportamiento del quest, habilitado por el dueño). **Flujo:** telo te chipa
(`chipStart`) → hablás a un **linyera** (se ríen + hook) → al **vendedor de Garbarino** (cambio de PJ `playingAs='garbarino'`)
→ **Maxi Y Marcos** (troyano, junta de a uno) → **jubilados** (cine Consolas: ex-TecToys/Commodore, te consiguen la
**consola** −20🪙) → **usar consola** en el inventario (`useConsola`) → curado, despertás (repetible). **Persiste** en el
save (`chipped/chipStep/playingAs/chipParts/chipEverCured` + inventory). **HUD** avisa 🤖 / 🧑‍💼🤖. **Los linyeras dan
PISTAS** del paso actual (`getHint` prioriza `chipHint` cuando estás chipeado — "saben todo + en qué vas, no te la tiran").
**Hitos** reorganizados en **primarias/secundarias** (directiva del dueño) + hito `g.hito.chip` (secundaria). Simplificaciones
vs la visión: el "celu" = framing del chat de linyeras (no un overlay aparte); el cambio de PJ = flag narrativo (no re-skin);
el escorte de los jubilados = framing (el comprar se resuelve al hablarles). Ver §6 para los pulidos.

---

**(SDD original abajo.)**

**Estado inicial:** SDD / Draft. **Origen:** idea del dueño (2026-06-28) — darle un **giro** al gag del telo: lo que parecía un
patova celoso es en realidad una **trampa de la IA** para chiparte y esclavizarte. Si te atrapan, arranca una **quest
con cambio de personaje** para sacarte el chip. Extiende [[multijugador.md]] §3.2.3 (el telo `js/telo.js`).

---

## 1. La idea (del dueño, textual ordenada)
1. Te metés en la cama y **saltás enseguida**: NO viene el patova de la puerta. Saltás porque **es un ROBOT IA** que te
   quería **inyectar un chip** para que seas su **esclavo**.
2. Tenés que **huir rápido**: si no, te **captura** y quedás **encerrado en la habitación con el chip puesto** (robot).
3. Si **escapás por la puerta** → zafás (volvés al bar, normal). Si **no** → quedás **encerrado y chipeado**.
4. Encerrado: buscás en la **mesita** el **celular** → desde el celu abrís el **chat de linyeras**, elegís con cuál
   hablar. **Los tres se te ríen**: *"¿ahora de qué bando jugás, pibe?"* (da igual con cuál hables, los 3 con la misma).
   Tenés que **convencerlos** de que te saquen el chip.
5. Tras varias charlas **sin sentido y filosóficas**, terminan diciendo: *"ahh, pero esto te lo arregla el pibe de
   Garbarino."* → **la historia CAMBIA: pasás a controlar al PIBE DE GARBARINO.**
6. La quest del pibe de Garbarino:
   - Hablar con **Maxi** y **Marcos** → te **programan un TROYANO**.
   - Hablar con los **JUBILADOS** que laburaron en **TecToys de Brasil** y en **Commodore Argentina**.
   - Ellos te **acompañan al CHINO** a comprar una **CONSOLA** (queda en tu inventario).
   - Con la consola, vas con el pibe de Garbarino **al bar**, **aceptás la invitación** (de la rubia) → ahí el pibe de
     Garbarino **te da la consola y se va**.
   - Desde el inventario: **"usar consola"** → te **hackea el chip** → quedás **tumbado en la cama** → te **despertás** →
     **huís** y **todo vuelve a la normalidad**.
7. **Repetible:** te puede volver a pasar si te metés de nuevo al telo.

---

## 2. Veredicto de factibilidad
| Pieza | Factib. | Notas |
|---|---|---|
| Twist del telo (robot en vez de patova, huir→escapás/te atrapan) | 🟢 Alta | cambio chico en `telo.js` (ya está la figura oscura+ojos rojos = lee como robot; FSM con condición de ESCAPE real). |
| Estado "chipeado" + el celu → chat de linyeras (grounding "¿de qué bando jugás?") | 🟡 Media | reusar el chat IA (`openChat`) con un **grounding** especial; los 3 linyeras = personas existentes. Nesting del overlay = manejable. |
| **CAMBIO DE PERSONAJE** (controlás al pibe de Garbarino) | 🔴 **Alta complejidad** | el juego asume "sos el Carpo". Para v1: **framing narrativo** (HUD "ahora sos el pibe de Garbarino" + sprite opcional) + un **modo-quest** que habilita los NPCs/pasos; NO un sistema genérico de multi-PJ. |
| Quest multi-paso (Maxi/Marcos→troyano, jubilados→escolta al chino→consola, bar→dar consola→usar) | 🟡 Media | reusa el **grafo** (historia.js aristas) + **quests** (`modelo-de-entidades.md` §6.95) + companions (escolta, ya existe). Contenido grande pero con piezas conocidas. |
| Ítem **consola** + **"usar"** desde el inventario | 🟢 Alta | el inventario ya soporta items; falta la **acción "usar"** (deuda anotada en `inventario-armas.md §7`). |

**Conclusión:** el **twist del telo** es chico y se hace YA. La **quest del chip con cambio de personaje** es **grande**
(varias sesiones): es básicamente un **mini-arco** nuevo. Se construye por fases; el cambio de personaje conviene
resolverlo como **modo-quest narrativo** (no un motor genérico de PJs) para no sobre-ingenierizar.

---

## 3. Diseño data-driven / grafo
### 3.1 Flags / estado (persisten en el save)
- `chipped` (bool): te atraparon en el telo y estás chipeado (arranca la quest).
- `chipQuest` (string|null): paso actual del arco — `phone` → `garbarino` → `troyano` → `jubilados` → `consola` →
  `darConsola` → `usar` → `done`. (Un mini-DAG lineal; encaja con quests = DAG de `modelo-de-entidades.md` §6.96.)
- `playingAs` (string): `'carpo'` (default) o `'garbarino'` (mientras dura el cambio de personaje).
- `player.inventory` suma `consola` (ítem usable).
Todo en `serialize/restore` (como los demás flags). Repetible → al terminar (`usar`→wake), se **resetea** `chipped/chipQuest/playingAs`.

### 3.2 Aristas del grafo (autoradas en fichas → gen-historia.mjs)
`chip_trap` (te atrapan en el telo) → `chip_phone` (usás el celu) → `chip_garbarino` (te pasan a controlar al pibe) →
`chip_troyano` (Maxi+Marcos) → `chip_consola` (jubilados+chino) → `chip_cura` (usás la consola) → `chip_done` (despertás).
Cada una con su `cond` (paso previo hecho) — el `HintEngine` te va guiando.

### 3.3 Cambio de personaje (modo-quest, NO motor genérico)
- `playingAs='garbarino'`: el HUD muestra "🧑‍💼 el pibe de Garbarino" + (opcional) el sprite del player cambia. La
  movilidad/disparo del Carpo NO importan acá (es navegación + diálogo). Los NPCs de la quest (Maxi/Marcos/jubilados/
  rubia) responden distinto según `playingAs` y `chipQuest`. Al terminar, `playingAs='carpo'`.
- Es un **estado**, no un sistema: una rama narrativa acotada. Si a futuro se quiere multi-PJ real, va a `modelo-de-entidades.md`.

### 3.4 NPCs (reusar + sumar)
- **Reusar:** el **pibe de Garbarino** (vendedor, sala 11 office `garbarino`), **Maxi/Marcos** (sprites ya existen en
  `Art.npc`: maxi, marcos), la **rubia** (telo/bodegón), el **chino**.
- **Sumar:** 2 **jubilados** (TecToys Brasil / Commodore Argentina) — NPCs nuevos con su ficha + diálogo; te **escoltan**
  al chino (reusa `companions`/follow cross-room, ya hecho).
- Los 3 **linyeras** (Diógenes/Dante/Pechito) en el chat del celu, con grounding "¿de qué bando jugás?" + "te lo arregla
  el de Garbarino".

### 3.5 Persistencia
Todo lo de la quest vive en el **save local** (es single-player, tu partida). Nada server-side (a diferencia del bodegón
real-time / carteles / datacenter, que son compartidos). El twist del telo es canned.

---

## 4. Fases
- **Q0 — TWIST del telo (✅ se hace YA, v220):** la cama dispara un **ROBOT IA** (no el patova) que te quiere chipar;
  tenés que **llegar a la puerta** antes de que te atrape. **Escapás** → volvés al bar (safe). **Te atrapa** → quedás
  **chipeado**: por ahora, canned — agarrás el celu, los linyeras se cagan de risa ("¿de qué bando jugás?") y te tiran
  el hook ("te lo arregla el pibe de Garbarino"), y **te despertás** (zafás) → al bar. Deja sembrado el flag `chipped`.
- **Q1 — el celu → chat de linyeras (real):** el celu abre el chat IA con los 3 linyeras + grounding especial
  (se ríen, "de qué bando", "convenceme") → al insistir, sueltan el hook del pibe de Garbarino.
- **Q2 — cambio de personaje + troyano:** `playingAs='garbarino'`; hablás con Maxi+Marcos → `troyano` listo.
- **Q3 — jubilados + consola:** los 2 jubilados te escoltan al chino → comprás la **consola** (al inventario).
- **Q4 — el cierre:** al bar con el pibe de Garbarino → aceptás la invitación → te da la consola → **"usar consola"** en
  el inventario → hackea el chip → despertás en la cama → huís → normal. Resetea (repetible).

**Recomendación:** Q0 ya (cierra el loop con un susto y siembra el hook). Q1-Q4 = el arco grande, a confirmar/priorizar
con el dueño (es contenido de varias sesiones).

---

## 5. Lo que se IMPLEMENTA ahora (Q0)
`telo.js`: la fase `bed` lanza la fase `robot` (re-tematiza la figura oscura como **robot IA**, con texto). Condición de
**ESCAPE real**: si llegás a la **puerta de salida** antes de que te atrape → `escaped`. Si te atrapa/timeout → `chipped`.
`game.js`: en el done del telo, si `chipped` → secuencia canned (celu + linyeras se ríen + hook Garbarino) + setea el flag
`chipped` (para Q1+) + despertás → al bar. i18n `g.telo.robot*`/`g.telo.chip*`.

---

## 6. PENDIENTE — feedback de playtest del dueño (post-v230, PRÓXIMA iteración, NO implementado aún)

El dueño jugó el corte de escena v230 y pidió este lote (anotado para retomar; algunos son bugs, otros features):

1. **Prerrequisito FIFA98 para la consola del Trucotron (bug de lógica).** El paso `consola2` matchea al **flaco del
   Trucotron** (`consolaGuy`) y te da la consola "de la nada". Pero el flaco **no tiene consola si nunca le diste la
   Mega Drive** para el torneo de **FIFA 98** (quest `fifa` existente: chino→Mega Drive→Trucotron, +30 monedas; flags
   `hasMegaDrive`/`fifaWon`, action `fifa` en `level.js:226`). → **El paso `consola2` debe exigir FIFA98 resuelto
   primero**: si no, el flaco dice "no tengo consola, traeme la Mega Drive / ganá el FIFA" y NO avanza. Recién con el
   FIFA hecho te entrega la consola retro que corre el troyano.

2. **BUG: dar la consola te devuelve a Carpo antes de tiempo.** Hoy `CHIP_FX.getConsola()` hace `playingAs='carpo'`.
   **MAL**: al recibir la consola (jubilados/Trucotron) **tenés que SEGUIR siendo el pibe de Garbarino**. El switch de
   vuelta a Carpo debe pasar **SOLO en la cura**. → quitar el `playingAs='carpo'` de `getConsola`; queda en `garbarino`
   hasta `cureChip` (que ya hace `chipReset`→`carpo`).

3. **Escena de cura reforzada.** Como el de Garbarino, le llevás la "máquina"/consola a un **linyera**. El linyera
   **aparece en la habitación donde el Carpo duerme** (telohab), le **da la consola al Carpo**, el Carpo **se despierta,
   la activa**, queda **curado** y **salís de la sala como si nada**. (Hoy `cureChip` ya hace spawnIn telohab + chipReset
   + flash; falta la puesta en escena: el linyera entrando, el Carpo levantándose, la activación.)

4. **Loop de hasta 3 veces + RESCATE a la 4ª (feature nueva).** Todo el arco (telo→chip→cura) puede **repetirse hasta
   3 veces**. La **4ª vez** que el robot te atrapa, **si ya completaste el loop 3 veces**, en lugar de chiparte:
   **aparecen los linyeras de la nada en la habitación, le disparan RAYOS CÓSMICOS al robot, lo matan, desaparecen y
   salís normal** (sin chip). → necesita un **contador de loops** (`chipLoops`, persistido) que se pase a `telo.js`
   (`Telo.create(loopsDone)`); en la fase `robot`/`result` de telo.js, si `loopsDone >= 3` y te atrapan → fase de
   **rescate** (animación de los linyeras + rayos) en vez de `chipped`; al volver, `exitTo='back'` sin setear el flag
   `chipped`. i18n nuevo `g.telo.rescue*`.

5. **BUG: los linyeras del telohab preguntan del cine.** En la habitación del telo, el chat IA de los 3 linyeras
   **sigue preguntando del cine/Mundial**, y eso **no corresponde ahí**. El grounding "solo del chip" (cuando `chipped`)
   no está suprimiendo del todo el tema cine. → revisar `chatSend`/`worldBrief`/`mundialQuest` con `chipped`: forzar el
   grounding `g.chip.chatGround` y **suprimir el quest de noticias/cine** para los NPC `chiplin` en `telohab`.

**Orden sugerido:** (5) y (2) son fixes chicos y rápidos; (3) puesta en escena media; (1) prereq FIFA media; (4) es la
más grande (contador + nueva fase de rescate en telo.js + arte de rayos). Todo data-driven donde se pueda (REGLA #0).
