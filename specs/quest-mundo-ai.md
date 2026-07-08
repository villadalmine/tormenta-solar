# SDD — Quest: mundo aleatorio generado on-the-fly por IA

- **Estado:** **v1 + v2 IMPLEMENTADOS (v333/v334, 2026-07-07)** — la "máquina de mundos" por SEED (approach **2.A**,
  FREE por ahora, sin gate de suscripción). v1 = 100% procedural-por-seed (nunca depende de la IA). v2 = la IA autora
  el TEMA (flavor + beats) por PROMPT libre, cacheado por seed en el proxy (sigue compartible).

## 0. v1 — "LA MÁQUINA DE MUNDOS" (seed determinista, compartible)
La pieza estrella del pedido: **mismo seed = mismo mundo (compartible)**. Reusa TODO el motor existente
(`NivelAI.generateLevel` → `Mundo.fromModel` → la RED de jugabilidad), sin tocar el proxy.
- **Determinismo (D2):** `NivelAI.generateLevel(theme, seed)` — si `seed` es numérico, un PRNG **mulberry32** (`mkRand`)
  reemplaza a `Math.random` en TODO el generador (tema elegido por seed + toda la geometría/enemigos/pickups/hazards).
  El bucle de reparación de la RED también es determinista (mismo seed → misma secuencia de candidatos → mismo 1er válido).
  El `model.seed` guarda el número. e2e: mismo seed = mismo JSON; distinto seed = distinto; + pasa `Playable.checkLevel`.
- **Trigger:** `NPC action:'mundoai'` = la **MÁQUINA DE MUNDOS del gurú** en el búnker ("armada con lo que sobró del
  datacenter") → overlay `#mundoai` (input de semilla + prompt opcional + "▶ Generar" + "🎲 Al azar"). `launchMundoAI
  (seed, prompt)` → rooms-swap (como el nivel-AI) → jugás → `[ESC]`/meta vuelve. Debug: botón "🌀 Máquina de mundos".
- **Compartir:** el mensaje de entrada muestra `MUNDO #{seed}`; poné el mismo número y jugás el mismo mundo.

## 0.1 v2 — LA IA AUTORA EL TEMA (`/mundo-ai`, por PROMPT, cacheado por seed)
`launchMundoAI` primero le pide a la IA el TEMA (best-effort, nunca bloquea) y si no hay respuesta a tiempo entra
igual con el 100% procedural de v1 — la garantía "siempre entrás" de v1 nunca se rompe, v2 es pura enriquecimiento.
- **Cliente (`js/nivelai.js` `requestMundo(seed, prompt, cb)`):** mismo patrón que `requestOraculo`/`requestGeometry`
  (circuit breaker `aiDown()`, `AI_TIMEOUT`, `markAi`). `POST /mundo-ai {seed, prompt, lang}` → si responde con `name`,
  arma un tema ad-hoc (`name/intro/lines/style/motif/props/beats`) para `generateLevel(theme, seed)`; si no (caída,
  timeout, sin nombre) → `cb(null)` → el caller genera con el tema procedural (nunca deja al jugador esperando in vano).
- **`launchMundoAI(seed, prompt)`** (game.js): muestra "🌀 la máquina zumba..." (`g.mundoai.shaping`), llama
  `NivelAI.requestMundo`, y en el callback (con o sin tema) hace `loadGenLevel(generateLevel(theme, seed))` — SIEMPRE
  entra. Guard `spinoffLevel || state !== 'playing'` (mismo patrón que nivel-AI) por si cambiaste de pantalla mientras
  esperabas. Overlay: input `#mundoai-prompt` (opcional, "¿de qué querés el mundo?").
- **Proxy (`ai-proxy/server.js` `POST /mundo-ai`):** valida `seed` (numérico, si no → 400). **CACHE por seed**
  (`MUNDO_CACHE`, PVC `/data/mundo-ai.json`, LRU 500): si el seed YA se pidió antes, devuelve el mismo tema SIEMPRE
  (sin volver a llamar al modelo) — así "mismo seed = mismo mundo" se sostiene INCLUSO con el enriquecimiento de la IA
  (que de por sí no es determinista). Se cachea el resultado **tanto si la IA respondió bien como si falló** (incluida
  la excepción de `ask()` cuando todos los modelos fallan): la prioridad es que el seed sea SIEMPRE el mismo mundo para
  todos, no que "eventualmente" se enriquezca si la IA vuelve. Rate-limit: `allowed(ip)` (12/min) SOLO en cache-miss
  (los hits de caché son gratis e ilimitados). Sin gate de suscripción (FREE). Prompt: la IA devuelve
  `name/intro/lines/style/motif/props/beats` (mismo shape que el oráculo, sin geometría cruda — eso lo sigue haciendo
  el PRNG por seed de v1, determinista siempre).
- **Deuda / futuro:** limpiar el PVC a mano si se quiere reintentar un seed que cacheó `{}` por una caída pasada de
  la IA; opcionalmente gatear por suscripción si el costo lo justifica; opcionalmente devolver geometría cruda de la
  IA también (como hace `oraculo`/`historia`) en vez de sólo flavor+beats.
- **Tests:** e2e `Game.__mundoai` (round-trip real: lanzar por seed → sala con spawn → salir restaura). Validado
  local (proxy standalone: 400 en seed vacío, cache-hit instantáneo, rate-limit a los 13 pedidos de seeds distintas)
  y en **Chromium real** con la ruta `/mundo-ai` mockeada: con IA arriba entra con el tema enriquecido (nombre visible
  en el HUD superior); con IA caída (500) entra IGUAL con el tema procedural — nunca bloquea. 0 errores JS en ambos casos.
- **Relacionado:** [`modelo-de-entidades.md`](modelo-de-entidades.md) (motor data-driven `Mundo.fromModel` → carga un
  mundo desde DATOS), [`suscripcion.md`](suscripcion.md) (gating premium), [`ia-openrouter.md`](ia-openrouter.md) /
  [`proxy-ia-deploy.md`](proxy-ia-deploy.md) (el modelo lo sirve el proxy), [`spinoff-stargate.md`](spinoff-stargate.md)
  (los "mundos random" = planetas que discás).

## 1. La idea (del dueño)
Un **quest** (cómo se activa: TBD; **obvio que con el plan PREMIUM**) que te lleva a un **mundo aleatorio creado
on-the-fly**: o sea **la IA "codea" el mundo** y vos **accedés** a jugarlo. Cada vez, un mundo distinto generado por IA.
Pregunta del dueño: **¿se puede hacer algo así?** → **Sí.** Hay dos sabores (de seguro→potente):

## 2. ¿Se puede? Sí — dos formas

### 2.A — IA genera DATOS del mundo (RECOMENDADO, seguro, ya casi listo)
El motor **ya es data-driven**: `Mundo.fromModel(window.LEVEL1)` arma un nivel entero desde un **JSON** (salas, NPCs,
enemigos, puertas, items) validado contra `levels/level.schema.json`. → El quest premium le pide al **modelo** (vía el
proxy) que **genere ESE JSON** (un mundo nuevo: bioma, salas, enemigos, loot, un objetivo) → el juego lo **carga como
nivel** y lo jugás. **La IA no ejecuta código: produce DATOS**, y el motor existente los corre. Cero riesgo de seguridad,
y reusa todo lo construido. El "mundo lo codeó la IA" = la IA escribió el **modelo** del mundo.
- **Cómo:** endpoint `POST /mundo-ai` (premium) → el proxy llama al modelo con el **schema** + una semilla/tema →
  devuelve JSON → se **valida contra el schema** (si no valida, se rechaza/re-pide) → `Mundo.fromModel(json)` →
  entrás. Determinismo opcional por **seed** (mismo seed = mismo mundo, para compartir).
- **Premium:** gateado por `X-Sub-Code` (suscripcion.md). El free no genera (cuesta tokens); el premium sí.

### 2.B — IA genera CÓDIGO que corre en tu máquina (potente, necesita sandbox/confianza)
"La IA codea el código en tu máquina local y vos accedés" en sentido literal:
- **En el browser:** el modelo devuelve **JS** y el juego lo ejecuta con `new Function(...)` en un **sandbox** (un
  Web Worker / iframe aislado, sin acceso al DOM principal ni a credenciales). Potente (mecánicas nuevas, no solo
  datos) pero **ejecutar código de un modelo es riesgoso** → hay que **sandboxear fuerte** y, idealmente, **validar/
  limitar la API** que el código puede tocar. Sólo premium + con disclaimer.
- **En "tu máquina" de verdad (self-host/desktop):** un **agente con acceso a filesystem** (MCP/Claude Code-like)
  escribe archivos del mundo en tu disco y el juego los levanta. Esto es **fuera del browser** (otra topología) —
  encaja si hay una app local/agente, no en GitHub Pages.

## 3. Recomendación
Arrancar por **2.A (datos)**: es seguro, reusa el motor data-driven y el proxy/premium que ya existen, y entrega el
99% de la sensación ("un mundo nuevo que armó la IA cada vez"). **2.B (código)** queda como fase avanzada con sandbox.
El **validar-contra-schema** es la pieza clave: garantiza que el mundo de la IA sea jugable y no rompa el juego.

## 4. Preguntas abiertas (para el dueño)
- ¿Cómo se **activa** el quest? (un NPC, un item, el stargate del spinoff, un botón premium). · ¿Tema libre o el
  jugador elige (terror/espacio/medieval)? · ¿Mundo **efímero** (una corrida) o **guardable/compartible** por seed? ·
  ¿Objetivo del mundo (sobrevivir/llegar a la salida/matar al boss)? · ¿Qué modelo (calidad vs costo) genera el JSON? ·
  ¿2.B alguna vez, o nos quedamos en 2.A (datos) por seguridad?
