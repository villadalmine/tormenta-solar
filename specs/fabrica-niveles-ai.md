# SDD — La "máquina de hacer chorizos": contás una historia → la IA arma el juego (NORTE)

- **Estado:** **PRIMER CORTE JUGABLE (v162):** el generador se DISPARA in-game. Te colás a la **trastienda del
  chino durante el RAID** (mientras el chino corre en pánico hablando por globito) → se **genera un nivel surreal
  temático** y lo corre el sub-modo `Spinoff`. Generador `js/nivelai.js` (molde = `THEMES` data) + escena
  `js/spinoff.js` + endpoint proxy `POST /nivel-ai` (la IA autora nombre/intro/frases, con **fallback estático**).
  Temas v1: `super-rasca`, `taller-esclavo`, `comida-podrida`, `muralla-skate`. Falta el pipeline de autoría
  COMPLETO (historia→nivel jugable de N salas con el motor real + auditoría). Es el GOAL al que apunta todo v2.
- **Relacionado:** [`modelo-de-entidades.md`](modelo-de-entidades.md) (motor data-driven + AI-authorable, §6¾/RF-22),
  [`quest-mundo-ai.md`](quest-mundo-ai.md) (mundo on-the-fly por IA), [[v2-engine-principios]], `levels/level.schema.json`.

## 1. La idea (del dueño, textual)
*"La base del juego es crear diferentes escenarios. Así puedo tener la máquina de hacer chorizos: yo cuento una
historia, y vos vas viendo dónde poner cada cosa y me creás el juego."* + *"si el goal es que sea todo AI, y luego
puedo repetir la misma lógica para hacer otro nivel — es cambiar los nombres de los objetos y reutilizo todo."*

## 2. Por qué esto valida la decisión de UNIFICAR (la duda del dueño)
Tener todo **separado** estuvo bien para iterar rápido. Pero si el goal es un **mundo AI**, conviene tenerlo **junto
y declarativo**, porque:
- **Un nivel = DATOS** (`levels/*.json` validado contra el schema); el **motor es REUSABLE** (`Mundo.fromModel`).
  → **Nivel 2 = cambiar los datos/nombres de los objetos**, NO reescribir lógica. (Exactamente lo que dijo el dueño.)
- Para que la **IA** pueda autorar, todo tiene que ser **una sola superficie de datos** (entidades+componentes+grafo),
  no sistemas sueltos con ifs. Por eso unificamos: ecosistema (APIs) → grounding, quests → runtime de datos, pistas →
  grafo+quests, NPCs → memoria+grounding. **No hay que arrepentirse: separar primero y unir cuando el goal lo pide es
  el orden correcto** (no se sobre-diseña de entrada).

## 3. La "máquina de chorizos" = el MOLDE (schema) + la MASA (tu historia) + la MÁQUINA (motor)
- **El molde:** `levels/level.schema.json` (JSON Schema, `additionalProperties:false` = guardrails). Define qué es
  válido (rooms/entities/componentes render/interact/link/gate/give/combat/quest/ai…). La IA NO puede salirse del molde.
- **La masa:** tu **historia** en lenguaje natural ("una calle de Tokio post-apagón, un sushiman que te da una quest,
  un jefe robot al final").
- **La máquina:** el **motor data-driven** que ya corre cualquier nivel-dato (`Mundo.fromModel`) + el **runtime de
  quests** (registro+primitivas) + el **grounding del ecosistema** (los NPC saben todo).

## 3.1 DOS usos del pipeline de autoría (dueño, 2026-06-26)
El mismo generador sirve para **dos cosas**, y por eso vale doble:
- **(a) Herramienta de DESARROLLO (para el dueño):** le sirve para **codear/crear niveles** más rápido — contás la
  historia y te scaffoldea el JSON del nivel (que después editás a mano o con la IA). Es un editor de niveles asistido.
- **(b) EN VIVO dentro del juego (FEATURE PAGO ⭐):** le **hablás a un ORÁCULO** (linyera) y te **crea un nivel en
  tiempo real** — el oráculo (que ya sabe todo del ecosistema, grounding) toma tu pedido, genera el JSON validado y te
  mete en ese mundo. Es la versión jugable de la "máquina": el NPC IA como **autor de mundos on-the-fly**.
  **Monetización (dueño 2026-06-26):** es un **lindo feature PAGO** — *"si pagás, tenés un oráculo que te crea más
  juegos"*. Engancha con la **suscripción** ya implementada (`suscripcion.md`, X-Sub-Code): el free juega los niveles
  base; el **premium** desbloquea el oráculo-creador (genera mundos ilimitados con tu historia). Costo real = tokens
  del generador → cubierto por la sub (key propia por código, budget). Ver `quest-mundo-ai.md` (gating premium) +
  `pasarela-pago.md` (cobro).

## 4. El PIPELINE que falta (autoría) — fases
1. **F1 — molde sólido:** el schema cubre todo lo que hoy hay hardcodeado (seguir migrando: NPCs/quests/ambient a
   componentes de datos). Cuanto más data-driven, más puede autorar la IA. *(En progreso: quests F1-F3 hechas.)*
2. **F2 — generador:** endpoint `POST /nivel-ai` (premium) → el proxy le pasa al modelo el **schema + tu historia +
   una librería de "tipos de objeto"** → devuelve **JSON de nivel** → **se valida contra el schema** (si no valida,
   se re-pide) → el juego lo carga con `Mundo.fromModel`. (Ver `quest-mundo-ai.md §2.A` — es seguro: la IA produce
   DATOS, no código.)
3. **F3 — editor conversacional:** charlás con la IA ("poné un kiosco acá", "el jefe que tire fuego") y va **editando
   el JSON** en vivo (overlays/patch por id, `modelo-de-entidades §6¾`). Vos contás, ella ubica.
4. **F4 — biblioteca de tipos reusables:** "type objects" (sushiman, jefe-robot, kiosco, portal) que se instancian con
   distinto nombre/skin → "cambiar los nombres y reutilizo todo". Cada nivel = nuevo elenco, misma maquinaria.

## 4.5 PRIMER CORTE JUGABLE (v162, 2026-06-26) — el generador YA se dispara in-game

> **TL;DR:** te colás a la **trastienda del chino durante el RAID** → se **genera un nivel surreal temático** y lo
> jugás. La IA del proxy autora el texto; si falla, hay **fallback estático**. Es un **sub-modo contenido** (como
> arcade/super/vinilos): todavía NO usa el motor platformer real (eso es la F2 completa), pero cierra el lazo
> **trigger → generar (data) → jugar → recompensa**.

### A) El disparador (la experiencia)
1. **Contexto:** Iorio toca y **abre el frente del súper** (raid). Entrás al chino → `Super.create({raid:true})`.
2. **El chino entra en PÁNICO** y corre por todo el súper **hablando por GLOBITO** con frases cortas en su tonada
   chino-porteña (rotan c/~1.5s): *"¿¡cómo entlas!?", "tolmenta falta", "sol loco loco", "luz no andal", "aiyaaa",
   "ladlón ladlón"*… (`PANIC` en `super.js`, ES/EN por `I18n.short()`).
3. **La puerta privada (`family`) queda sin guardia.** En raid, al acercarte/`[E]` te **colás a la trastienda**
   (`sup.family.raid`) → `super.js` hace `finish('nivelai')` (su `exitTo`).
4. `game.js` ve `superGame.exitTo === 'nivelai'` → llama **`launchNivelAI()`**.

### B) El generador — `js/nivelai.js` (`window.NivelAI`)
- **El MOLDE = `THEMES` (DATA).** Cada tema describe un nivel surreal:
  `{ id, motif, name{es,en}, intro{es,en}, palette{floor,floor2,wall,accent}, props[emoji…], npc{emoji,lines{es,en}}, goal{es,en}, reward }`.
  Temas v1: **`super-rasca`** (antro mugriento), **`taller-esclavo`** (sweatshop tejiendo ropa), **`comida-podrida`**
  (cadena de frío rota), **`muralla-skate`** (la Muralla China en skate).
- **`generate(forceId?)`** elige un tema (o el forzado, para tests) y **compone una ESCENA** (data): grilla `W×H`,
  N props y 2-3 NPCs en tiles libres al azar, una `goal` (portal de salida), y el `reward`. Devuelve:
  `{ id, motif, name, intro, palette, W, H, props[{x,y,emoji}], npcs[{x,y,emoji,lines[],say,sayT}], goal{x,y,label}, reward }`.
- **`enrich(scene, cb?)`** — best-effort: `POST {PROXY}/nivel-ai {theme,lang}` → si responde, **pisa** `name/intro/lines`
  con lo que **autora la IA**; si falla/timeout (9s), queda lo estático. (Mismo patrón "banco + fallback" que
  propaganda/chusmerío.)

### C) La escena — `js/spinoff.js` (`window.Spinoff`)
- `Spinoff.create(scene)` = **sub-modo top-down explorable** (estilo `super.js`): `update(dt)` + `draw(ctx,VW,VH)` +
  `done`/`exitTo`. Caminás (WASD/flechas), los NPCs tiran **globitos** temáticos, llegás a la **META (portal)** →
  `done`, `exitTo:'back'`, y se aplica el **souvenir** (`Spinoff._reward(scene.reward)`). `ESC` = volver antes.
- **Aislado del motor principal** (no toca quests/tormenta/save), igual que arcade/super/vinilos.

### D) El cableado — `js/game.js`
- `spinoffGame` (var, reseteada en `reset()`).
- `launchNivelAI()`: `NivelAI.generate()` → setea `Spinoff._reward = rw => sumar al player` → `Spinoff.create(scene)`
  → `state='spinoff'` → `NivelAI.enrich(scene)` (async) → `tel('nivelai',{theme})`.
- En el loop: rama `state==='spinoff'` (update+draw); al `done` → `state='playing'` + `g.nivelai.back`.
- La rama de `super` ahora bifurca: `exitTo==='nivelai'` → `launchNivelAI()`, si no, salida normal.

### E) El endpoint IA — `ai-proxy/server.js` `POST /nivel-ai`
- Body `{theme, lang}` → arma un **prompt con el brief del tema** (mapa `BRIEF` server-side) pidiendo **JSON**
  `{name, intro, lines[6]}` (frases MUY cortas, tonada chino-porteña) → llama `ask(msgs, {maxTokens:260})` (se
  agregó override de `max_tokens` a `ask`) → extrae el primer `{…}`, sanea longitudes → responde el JSON.
- Si el modelo falla o no parsea → responde **`{}`** (el cliente usa su estático). CORS global ya cubre el POST.
- Verificado en vivo: devolvió *"El Bazar del Moho"* + frases tipo *"¿Qué quere, pibe?", "Sali ya, cerrá puerta"*.

### F) Cómo EXTENDER (sumar un tema nuevo)
Editar `THEMES` en `js/nivelai.js` (un objeto más) **y** el `BRIEF` en `server.js` (una línea con la descripción para
la IA). Nada más: el generador, la escena, el trigger y los tests ya lo toman. (Los 4 temas se testean en `tests/e2e.js`.)

### G) Límite honesto de este corte
La escena es **top-down contenida**, NO el motor **platformer** real ni `Mundo.fromModel` ni el **schema** de niveles.
Es un **lazo end-to-end de demostración**. La **F2 completa** (historia→nivel de N salas con el motor real + validación
contra `level.schema.json` + auditoría) sigue pendiente — ver §4 y §5.

## 5. Dónde estamos vs el norte (honesto)
- **Listo:** motor data-driven (paridad v1≡v2), schema, todo-es-API (4 bancos), grounding del ecosistema, quests como
  data+runtime, memoria incipiente, deploy reproducible, métricas.
- **Demostrado (v162):** el lazo **trigger → generar (data) → jugar → recompensa** anda in-game (§4.5), con la IA del
  proxy autorando el texto + fallback. Es un sub-modo contenido, no el motor real todavía.
- **Falta para la "máquina":** terminar de migrar lo hardcodeado a componentes (ambient/NPCs/relaciones), el
  **generador F2 completo** (nivel de N salas con `Mundo.fromModel` + validación de schema + auditoría) y el
  **editor conversacional** (F3). Cada paso v2 que damos hoy **es un ladrillo de esta máquina**.

> Regla operativa: cada feature nueva se piensa como **"un type object / componente / dato"** para que la máquina lo
> pueda generar mañana. (Ver SKILL regla #0.)
