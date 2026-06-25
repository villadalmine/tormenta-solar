# SDD — Carteles con IA: pistas inteligentes + banco de propaganda (ambos en NPU)

- **Estado:** Draft · **banco de propaganda del CINE = IMPLEMENTADO** (2026-06-26, ver §9).
- **Última actualización:** 2026-06-26

## 9. Banco de propaganda del CINE (IMPLEMENTADO) — carteles dinámicos por rubro

Los carteles del cine **cambian solos**, rotando **marcas FALSAS estilo Buenos Aires** por **rubro**:
🍕 `comida` · 👕 `ropa` · 📱 `electronica` · 🛸 `bizarro` (rubros inventados absurdos). Cada cartel rota cada ~7s y
muestra uno distinto (seed por `x`). Color del panel según rubro.
- **Generación:** `ai-proxy/gen-propaganda.mjs` (cron `cronworkflow-propaganda.yaml`, **1×/día 4am**) le pide a
  **`gemma4-paid`** que **invente** 8 marcas+slogans por rubro (acá el modelo SÍ inventa, es el punto — al revés que
  las noticias). Devuelve JSON, se parsea defensivo. POST → `/propaganda` (GEN_TOKEN), **persistido en PVC**
  (`/data/propaganda.json`), servido por `GET /propaganda`.
- **Cliente:** `js/propaganda.js` trae el banco a `window.PROPAGANDA` y tiene un **fallback ESTÁTICO** BA (anda sin
  proxy/sin red). `js/game.js` `drawCartelProp()` dibuja un panel sobre cada cartel `decor` del cine.
- **NOTA de ruteo:** el §0 decía "propaganda en NPU". Quedó en **`gemma4-paid` (nube)** porque la NPU alucina+lenta
  (mismo veredicto que noticias, `cine-noticias.md §3.1`). Corre 1×/día → costo despreciable.
- Ejemplos generados: "La Muchacha del Carbón — si no sale humo no es parrilla", "TrucoPhone — casi un iPhone pero
  más barato", "UFO-Taxis — te llevamos a Marte pero no te quejes del tráfico".

> Lo de abajo (§0-§8) es el diseño original (pistas NPU + propaganda); el banco del cine es la primera parte llevada
> a producción.
- **Relacionado:** `publicidad.md` (los carteles/banners de `js/ads.js`), `llm-metrics.md` (ruteo/medición de
  modelos), `hami-gpu-plan.md` (GPU/HAMi), `proxy-ia-deploy.md` (el proxy), el **grafo de historia** (story
  graph / flags).

## 0. Principio de ruteo por hardware (decisión)

Tres workloads, tres destinos — **según latencia y duración**, no por capricho:

| Workload | Característica | Hardware | Por qué |
|---|---|---|---|
| **Chat del linyera** | interactivo, respuestas largas, latencia-crítico (≤10s) | **Cloud** (pago / free-tier del dev / **BYOK** del jugador) | Las GPUs viejas (M4000/P4) son **lentas** para chat largo; el cloud es más rápido. **El chat NUNCA va a GPU.** |
| **Carteles inteligentes** (pista que lee el grafo) | **async**, pre-generable, frase corta | **NPU** (4× RK1) | No es tiempo real: se **pre-genera al cambiar un flag** y se cachea → la lentitud de la NPU (~28s) **se esconde**. Gratis, ociosa, 4 en paralelo, libera la GPU. |
| **Banco de propaganda ambiente** (frases random para banners) | **batch puro**, sin contexto | **NPU** (4× RK1) | Llena un pool de fondo en una DB; la lentitud no importa. |
| *(futuro)* algo **real-time corto efímero** | baja latencia, generación corta | **GPU** (gemma2:2b) | La GPU queda **reservada** para cuando aparezca un caso que necesite respuesta corta y rápida en vivo (TBD). |

→ La GPU **no** se usa para el chat ni (por ahora) para los carteles. Queda libre para el online-game y para un
futuro feature real-time corto.

## 1. Contexto y objetivo

El juego ya tiene **carteles/banners** (`js/ads.js`: poster/screen/fachada/gondola), hoy estáticos. Los volvemos
**vivos con IA**, en **dos modos**, ambos sobre las **4 RK1-NPU** (casi ociosas, bajo consumo, sin gastar cuota
de OpenRouter):

1. **Cartel-oráculo (inteligente, personalizado):** el cartel **lee el grafo de historia** (qué hiciste / qué
   falta) y emite una **pista críptica envuelta en propaganda absurda** ("probá el sándwich chino, es para
   borrachines…"). Se **pre-genera** cuando cambia tu estado y se cachea.
2. **Banco de propaganda ambiente (genérico):** las NPU generan en background un **pool de frases random** de
   propaganda trash post-apocalíptica, se **guardan en una base de datos** y los banners las van **rotando**.

## 1.5 El Mensajero — invocación genérica agente-a-agente (la abstracción)

**No** queremos código pegado a los banners. Queremos **una sola puerta** que cualquier objeto con frases
(cartel, banner, NPC, vinilo, góndola, lo que sea, presente o futuro) **invoque igual**, pasando **su contexto**,
y que **el Mensajero decida qué TIPO de mensaje** corresponde **según lo que pasó** en el juego. Es, literal,
**un agente (el objeto) hablándole a otro agente (el Mensajero)**: el objeto dice "soy esto, estoy acá, mirá lo
que viene pasando" y el Mensajero interpreta el **grafo anidado** y le devuelve el mensaje justo.

### 1.5.1 Lo que ya existe (el "cerebro")

- **`Historia`** (`historia.js`, generado del grafo): `edges[]` con `pre` (flags requeridos), `sets` (flags que
  prende), `at` (lugar), `hints[lang][nivel]`. **Es el grafo anidado.**
- **`HintEngine`**: dado el estado (flags) calcula la **frontera** (lo accionable-ahora-y-no-hecho) y la próxima
  pista con spoiler escalado. **Ya sabe "qué falta".**
- **`applyEdge(id, flag)`** (en `game.js`): **punto único** por donde pasa **toda** transición del grafo. Es el
  hook de **"qué acaba de pasar"**.

### 1.5.2 El contrato

```js
// Cableado una vez por game.js (que es dueño del estado):
Mensajero.init({ state: () => historiaState(), at: () => currentAt() });
game.js // dentro de applyEdge(id): Mensajero.evento(id)   // registra "qué acaba de pasar"

// Lo invoca CUALQUIER objeto, siempre igual:
const msg = Mensajero.pedir({ tipo:'cartel', id:'poster_super', at:'super', lang:'es' });
//   -> { clase:'pista'|'ambiente'|'reaccion', short:'...', full:'...', src:'npu|pool|static' }
```

- **`short`** = el resumen que se **dibuja** en el cartel (corto, entra visualmente).
- **`full`** = el texto entero que **se habla** con TTS al pasar el mouse (§4.4). Así el cartel no necesita
  mostrar todo el texto, solo el resumen.

### 1.5.3 Cómo decide la CLASE de mensaje (según lo que pasó)

El Mensajero mira estado + frontera + último evento y clasifica:

1. **`reaccion`** — si hubo un `applyEdge` reciente relevante a este objeto/lugar → comenta lo que **acabás de
   hacer** ("bien ahí con los borrachines, pibe").
2. **`pista`** — si hay una **arista de frontera `at` = lugar de este objeto** (estás trabado acá) → **pista
   críptica** (el cartel-oráculo). Fuente: **NPU** (F2) cacheada por `hash(estado, id)`; mientras no esté lista o
   en F1, el `HintEngine.hintText` (texto del grafo) envuelto como propaganda.
3. **`ambiente`** — si no hay nada pendiente acá → **propaganda genérica** del **pool NPU** (`GET /propaganda`).

Esto es la regla "el método te dice qué tipo de mensaje **basado en algo que pasó**". El mismo objeto, en
distinto momento del grafo, recibe distinta clase. Reutilizable por todo lo que tenga frases.

### 1.5.4 Capa aditiva

`Mensajero` es opcional (guard `typeof`): sin red/pool, **siempre** cae a estático y el juego anda igual. No
mete dependencias. Vive en `js/mensajero.js`.

## 2. Hardware (medido en vivo, 2026-06-24)

- **NPU** 4× RK1 (RK3588, ~6 TOPS) en `srv-rk1-nvme-01`, pods `rk1-npu-0{1..4}`, PVCs 20-30GB (`longhorn-nvme`).
  Genera **sin streaming** ~0.7 tok/s (≈28s/20 tokens); cold-start ~60s. → **batch/async, no tiempo real.**
- **GPU** srv-t7910: 2 placas (M4000 8GB + P4 7.7GB), **~5GB asignables por HAMi en cada una** sin tocar los
  ollama-a/b. `gemma2:2b` ya cargado (~3-4s, coherente). → **reservada** (§0).
- **Storage:** `longhorn-nvme` (NVMe replicado) para la DB del banco de frases.

## 3. Evidencia (test real)

- **NPU `rk1-npu-local`** (no-stream): 1er intento timeout 60s (cold), 2º 28s → frase coherente ("Che, vos sos el
  rey del mundo, y vos tenés que creerlo"). **Sirve para batch/pre-generado, no en vivo** → por eso va acá.
- **GPU `gemma2:2b`** con prompt de cartel, ~3-4s, coherente y mete la pista ("¡El tahur se va a meter a un susto
  de chicharras en la **cueva**!"). Queda como **opción real-time futura / fallback**, no primario.
- **GPU `qwen2.5:1.5b`**: incoherente → descartado.

## 4. Modo 1 — Cartel-oráculo inteligente (NPU)

### 4.1 Flujo (pre-generación, la clave para que la NPU sirva)

- El juego mantiene el **estado del grafo** (flags) client-side (ya existe).
- **Disparo:** NO al acercarse, sino cuando **cambia un flag relevante** → el juego pide al proxy las pistas de
  los carteles "próximos" para el estado nuevo; la **NPU las genera de fondo** y se **cachean** (client-side y/o
  en la DB por `hash(estado, cartelId)`). Al acercarte, ya está → instantáneo.
- **Si llegás antes de que esté lista:** el cartel muestra una **frase del banco ambiente** (Modo 2) como
  placeholder, y cuando la pista llega, la reemplaza. (Los dos modos se complementan.)
- **Petición:** `POST /cartel` `{estado:[flags/resumen], cartelId, lang}` → el proxy arma el prompt (persona
  "cartel poseído" + estado) → NPU. **Post-proceso:** saca markdown, recorta a 1 frase, filtra "Pista:" literal.

### 4.2 Ruteo (tiered)

`NPU` primario → si NPU caída/cold-timeout → **frase del banco ambiente** (placeholder) → línea estática. La GPU
queda como **opción** si en el futuro se quiere bajar la latencia. Medible con
`tormenta_ai_chat_total{backend="npu",...}` (las métricas de `llm-metrics.md` ya distinguen npu/gpu/openrouter).

### 4.3 Diseño de la pista

- **Críptica pero justa:** alude a la acción que falta sin nombrarla; nunca dice "Pista:"; nunca spoilea algo
  indeducible. Lunfardo, formato aviso trash. Sigue el idioma del juego (ES/EN).

### 4.4 Resumen visible + voz al pasar el mouse (TTS)

- El cartel **dibuja solo `short`** (resumen corto) → no se satura de texto.
- Al **pasar el mouse por encima** del cartel (hover sobre su región), se **lee `full` en voz alta** con el
  **Web Speech API** (`speechSynthesis` / `SpeechSynthesisUtterance`) — **nativo del browser, sin dependencias**,
  con voz en el idioma del juego (`lang='es-AR'`/`'es-ES'` o `'en'`). Al salir el mouse / cambiar de cartel, se
  `cancel()` la locución para no encimar voces.
- Degradación: si el browser no tiene `speechSynthesis` (o el user no interactuó aún — algunos exigen gesto),
  no pasa nada, queda solo el `short`. Toggle de sonido del juego también silencia el TTS.
- Detalle UX: throttle (no relee si ya está hablando ese cartel); en mobile el "hover" = tap sostenido (TBD).

## 5. Modo 2 — Banco de propaganda ambiente (NPU → base de datos)

### 5.1 Qué hace

- Un **CronJob/worker** en nodos **NPU** (`nodeSelector` rk1) genera tandas de **frases genéricas** de propaganda
  trash ("2x1 en pilas para linternas, mientras dure el sol"), por **categorías** (comida, fierros, agüero,
  política trucha…) y semilla random. Las **persiste con dedup**. Batch puro: la lentitud no se nota.
- Los **banners** consumen del pool y lo **rotan** ("las vaya usando"): sirve preferentemente lo **menos usado**
  (`used_count`/`last_used`).

### 5.2 La base de datos

- **Elegido: SQLite en PVC `longhorn-nvme`**, servido por el **proxy** (sin montar un Postgres nuevo para esto).
  Tabla `propaganda(id, lang, categoria, texto UNIQUE, used_count, last_used, created_at)`. Alcanza de sobra para
  un pool de frases y soporta "rotá lo menos usado". (Postgres existente = acopla a otra app; Redis = caché, no
  durable. Descartados.)
- **Escritura:** el job NPU hace `POST /propaganda` (token `GEN_TOKEN`) con `{lang, categoria, textos:[...]}` →
  `INSERT OR IGNORE` (dedup por `texto`).
- **Lectura:** el juego hace `GET /propaganda?lang=es&n=20` → N frases priorizando `used_count` bajo, incrementa
  el contador. Cacheable, sin PII.

## 6. Requisitos funcionales

- **RF-1** (cartel-oráculo) `POST /cartel {estado, cartelId, lang}` → 1 frase con pista escondida,
  post-procesada (sin markdown/"Pista:", 1 frase), generada en **NPU**.
- **RF-2** Ruteo NPU → placeholder del banco ambiente → línea estática; medido con métricas existentes (backend=npu).
- **RF-3** El juego pre-genera/cachea las pistas al **cambiar un flag** (no al acercarse); placeholder ambiente si
  aún no está lista.
- **RF-4** (propaganda) CronJob/worker en nodos NPU genera frases genéricas por categoría/idioma → `POST /propaganda`.
- **RF-5** Proxy persiste en **SQLite sobre PVC longhorn-nvme** con dedup; `GET /propaganda?lang&n` prioriza lo
  menos usado e incrementa `used_count`.
- **RF-6** Los banners de `js/ads.js` consumen del pool (fallback a las frases estáticas actuales si no hay endpoint).
- **RF-7** **El chat del linyera no cambia:** sigue en cloud (pago / free-tier / BYOK), **nunca GPU/NPU**.
- **RF-8** (abstracción) `js/mensajero.js`: `Mensajero.init({state, at})`, `Mensajero.evento(edgeId)`,
  `Mensajero.pedir(ctx) -> {clase, short, full, src}`. Clasifica reaccion/pista/ambiente según estado+frontera+
  último evento. Capa aditiva (sin red → estático, juego anda igual). Lo usa cualquier objeto con frases.
- **RF-9** (TTS) Hover sobre un cartel → `speechSynthesis` lee `full` en el idioma activo; `cancel()` al salir;
  respeta el toggle de sonido; degrada si no hay API. El cartel dibuja solo `short`.

## 7. Privacidad / seguridad

- Sin PII en prompts ni DB. El estado del cartel-oráculo va **resumido** (flags/etiquetas), nunca datos del
  jugador. Escritura (`POST /propaganda`, `POST /cartel` si hiciera falta token) protegida; lectura pública/cacheada.

## 8. Fases

1. **F1** Modo 2 base: tabla SQLite + `POST /propaganda` + `GET /propaganda` en el proxy + un job NPU que llene
   unos cientos de frases; banners consumen del pool (RF-4/5/6). **Es lo primero que pediste.**
2. **F2** Modo 1: `POST /cartel` + generación en NPU + post-proceso + cache por flag + placeholder ambiente
   (RF-1/2/3).
3. **F3** Pulido: categorías/cripticidad, panel en `/llm-metrics` (uso NPU, tamaño del pool, hit-rate de cache),
   estabilizar el job NPU (cold-start/reintentos). Evaluar si algún feature real-time corto justifica usar la GPU.

## 9. Preguntas abiertas

- **Modelo NPU:** ¿qué modelo RKNN corre `rk1-npu-local` y da las frases más lindas? Probar 2-3 y fijar.
- **Tamaño/refresh del pool:** ¿cuántas frases objetivo y cada cuánto regenera la NPU? ¿caduca lo muy usado?
- **Cripticidad** del cartel-oráculo: ¿qué tan velada la pista? ¿escala con la dificultad?
- **Pre-generación:** ¿el juego pide pistas para TODOS los carteles próximos al cambiar un flag, o sólo el más
  cercano? (costo NPU vs cache miss).
- **GPU real-time (futuro):** ¿qué feature corto/efímero justificaría usarla? (TBD).
