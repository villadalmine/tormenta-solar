# El giro del telo: la trampa del CHIP + la quest del pibe de Garbarino

**Estado:** **Q0-Q4 IMPLEMENTADO y jugable (v221)** — arco completo end-to-end. Quedan pulidos (ver §6).

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
