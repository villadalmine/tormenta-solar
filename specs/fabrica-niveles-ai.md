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

## 5. Dónde estamos vs el norte (honesto)
- **Listo:** motor data-driven (paridad v1≡v2), schema, todo-es-API (4 bancos), grounding del ecosistema, quests como
  data+runtime, memoria incipiente, deploy reproducible, métricas.
- **Falta para la "máquina":** terminar de migrar lo hardcodeado a componentes (ambient/NPCs/relaciones), el
  **generador** (F2) y el **editor conversacional** (F3). Cada paso v2 que damos hoy **es un ladrillo de esta máquina**.

> Regla operativa: cada feature nueva se piensa como **"un type object / componente / dato"** para que la máquina lo
> pueda generar mañana. (Ver SKILL regla #0.)
