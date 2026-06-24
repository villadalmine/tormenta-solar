# SDD — Carteles con IA: pistas inteligentes + banco de propaganda (ambos en NPU)

- **Estado:** Draft
- **Última actualización:** 2026-06-24
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
