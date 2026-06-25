# SDD — El CINE de noticias: pantalla con news capturadas por IA + el linyera que te manda y te corrobora

- **Estado:** Diseño (para implementar por fases). Idea del dueño (2026-06-25).
- **Relacionado:** [`modelo-de-entidades.md`](modelo-de-entidades.md) (el cine es un **edificio data-driven** + la
  pantalla un `sign`; el loop es un **quest** §6.95), [`carteles-ia.md`](carteles-ia.md) (carteles inteligentes
  NPU), [`openrouter-dinamico.md`](openrouter-dinamico.md) (patrón cron→banco, como `/novedades`),
  [`proxy-ia-deploy.md`](proxy-ia-deploy.md) (el proxy sirve el banco), `Mensajero` (agente↔agente).

## 1. Objetivo
Un **edificio CINE** (butacas + pantalla grande) donde la pantalla es un **cartel que muestra NOTICIAS reales
capturadas por IA** (resultados del Mundial, noticias del mundo, videojuegos, guerra, Argentina, Países Bajos,
mundo árabe, **Primera B** del fútbol argentino, **liga de bochas** de algún país…). **Cada vez que entrás,
sale algo distinto** (aleatorio del banco). Los **linyeras** te mandan a buscar data ("che, ¿tenés noticias de
X?") y, cuando volvés y se la decís, te la **corroboran** (hackean a la IA): si **acertás** → **caramelos**; si
**mentís** → te **saca plata**.

## 2. El loop de juego (la gracia)
1. **El linyera te pega el verso:** su IA (nube, rápida) "mira" los carteles-NPU del cine y **saca el TOPIC**
   (no la noticia): *"Che, quise hablar con esta IA del cartel pero no me tiró la data... andá al cine, pibe,
   quiero saber cómo salió el partido de X"* / *"cómo están las acciones"* / *"qué pasó en la guerra"*. (Esa
   elección del topic la hace **on-the-fly** — ver §6.)
2. **Vas al cine** → te sentás → la **pantalla muestra la noticia** de ese (y otros) topic. La leés.
3. **Volvés y se la contás** al linyera (por el chat).
4. **El linyera CORROBORA** (narrativa: "hackea a la IA del cartel"; mecánica: compara con el banco real):
   - Acertaste → *"Ahh, tenés razón, no me mentís"* → **+caramelos**.
   - Mentiste / data falsa → te cacha → **−plata**.

> Es un **mandado con verificación**: el linyera sabe el *qué* (topic) pero no el *cuánto/cómo* (la data); vos
> sos el "puente". La IA del linyera no lee la noticia (gameplay), por eso te manda.

## 3. Arquitectura (encaja con lo que YA hay)

### 3.1 Recolección de noticias — Argo CronWorkflow → banco (patrón `novedades`/`linyera-pool`)

> **CLAVE (decisión del dueño 2026-06-25): el FETCH lo hace el CRON (código Node), NO el modelo.** Ningún modelo
> —ni el NPU ni el de la nube— sale a buscar a internet (no tienen tool-use de fetching, y no hace falta). El
> cron pega el **HTTP** (API/RSS), y el **modelo, si se usa, SOLO resume/da formato** al texto ya traído. El
> "siempre se refresca con info nueva" lo da el **schedule del cron**, no el modelo.

- Un **CronWorkflow** (cada N horas) corre `gen-noticias.mjs` (Node, igual que `gen-prices.mjs`): por cada
  **topic** hace `fetch()` a su fuente (API/RSS) → extrae el dato → arma `{ topic, headline, answer, ts }`.
  - Ej.: `{topic:"mundial", headline:"Argentina 2-1 Brasil (semi)", answer:"2-1", ts:...}`.
  - **El resumen a "titular" es OPCIONAL:** muchas fuentes ya dan el titular/resultado directo (el cron lo toma
    tal cual, **sin modelo**). El modelo se usa **solo** si querés "capturar/redactar con onda" un texto largo
    (RSS de noticias) → ahí el cron le pasa el **texto ya fetcheado** a un LLM para resumir (NPU o nube).
- **POST `/noticias`** al proxy (protegido por `GEN_TOKEN`, igual que `/precios` y `/linyera-pool`). El proxy
  guarda el banco en memoria y lo sirve: **`GET /noticias`** (JSON, `Cache-Control` corto). Se refresca cada
  corrida del cron.
- **Hardware (carteles-ia.md):** si se usa el resumen, corre en la **NPU** (rockchip) sobre el texto que **ya
  trajo el cron**; el chat del linyera sigue en la **nube rápida**. Pero el **fetch siempre es del cron** (code).

#### Validación de modelos para la captura (2026-06-25) — tabla comparativa
Mismo titular con dato específico (para cazar alucinaciones). **Para noticias la FIDELIDAD es no-negociable**
(el linyera las verifica → un modelo que inventa rompe la mecánica y es desinformación):

| Modelo | ¿Anda? | Latencia | ¿Fiel? | Veredicto |
|---|---|---|---|---|
| GPU `local-gpu` (gemma2:2b) | ✅ | 2.3s | ❌ **inventó "10 veces seguidas"** | descartar (alucina) |
| NPU `rk1-npu-local` (llama-3.1-8b) | ✅ (pods rk1 Running) | **18–34s** (cold start arma prompt cache) | ❌ **inventó "32 partidos"** | NO caída, pero **lenta + alucina** → no sirve para noticias |
| **`gemma4-paid`** | ✅ | **0.9s** | ✅ | ⭐ **elegido** (rápido+fiel+barato) |
| `claude-sonnet` | ✅ | 1.6s | ✅ | bueno pero ~40× más caro |
| `gpt-4o` | ✅ | 6.0s | ✅ | lento+caro |
| `deepseek-pro` | ⚠️ | 1.2s | content vacío (reasoning) | inservible |

> Aunque el dueño prefería GPU/NPU (gratis), para NOTICIAS **no sirven**: GPU y NPU **inventan** (la NPU además
> tarda 18-34s) → se usa
> `gemma4-paid` (es "y sino el pago"). Corre 1×/día → costo despreciable. El `answer` queda CRUDO igual.

### 3.2 Las fuentes (topics — lista configurable, data del cron)
Arranque sugerido (cada uno con su fetcher): **mundial** (resultados), **mundo**, **videojuegos**, **guerra**,
**argentina**, **paises-bajos**, **arabe**, **primera-b** (fútbol AR), **bochas** (liga de algún país).
- Fuentes: APIs/RSS públicas por topic (deportes: API de fútbol; noticias: RSS por país/tema). **Si una falla,
  ese topic queda con su última captura** (best-effort, como precios). Lista de topics = **data/env**, ampliable.

### 3.3 El CINE — edificio DATA-DRIVEN (usa el modelo v2 que acabamos de cerrar)
- Es **otra entrada de `levels/nivel-1.json`** (o un content-pack §6¾ de modelo-de-entidades): un `edificio`
  con su `facade` (puerta en la calle) + una `room` con:
  - **butacas** = `decor` (filas de sillas) + **pantalla** = una entidad `sign` con componente nuevo
    **`news`** (en vez de `ad`): `{ source:"/noticias", rotate:true }`.
  - La pantalla **rota aleatorio** entre las noticias del banco **cada vez que entrás** (siembra por visita).
- **Arte nuevo:** fachada de cine + interior (pantalla grande iluminada + butacas). Render immediate-mode como el
  resto. *(Si no hay arte aún: F1 puede reusar un cartel grande tipo "pantalla" y butacas simples.)*
- **Idea F3 (dueño 2026-06-25):** el cine podría ser **multi-piso** (varias salas/pantallas, distintos topics por
  piso) o un **complejo de varios edificios**, con **carteles de propaganda** adentro (reusa `ads`/`js/ads.js` o
  decor `cartel`). Todo data-driven (más `rooms` + un `link` entre pisos, como la galería/abandonado). Pendiente.

### 3.4 La pantalla (cómo muestra la noticia)
- Lee `GET /noticias`, elige **1+ topics al azar** (semilla por visita) y dibuja el/los **titular(es)** en la
  pantalla (texto grande estilo marquesina). Opcional: **TTS al sentarte** (lee el titular con voz, como el hover
  de carteles-ia). El jugador VE el `answer` (lo que después le dice al linyera).

### 3.5 El quest del linyera (es un `quest` del modelo, §6.95)
- El linyera-oráculo, al chatear, **tira el pedido**: elige un topic del banco y te manda al cine (`interact`
  con grounding: se le pasan los **topics disponibles**, no las answers → "sabe el qué, no el cuánto").
- **Estado del mandado** (runtime, por sesión): `{ topic, asked:true, reported:false }`.
- Al volver y reportar (chat), se **verifica** (§4). Es un quest **repetible** (`scope:run`, recompensa chica)
  → da rejugabilidad ("cada vez algo distinto").

## 4. Verificación (anti-mentira) + economía
- **La verdad está en el banco** (`/noticias`, server-side). El jugador reporta su respuesta **por el chat**.
- **Chequeo (grounded, NUNCA inventa):** el proxy/juego compara lo que dijiste contra el `answer` real del topic
  (match flexible: número exacto del resultado, o el LLM del linyera evalúa "¿esto coincide con la data real?"
  con la data **inyectada en el prompt** — grounding, como las pistas). 
  - **Acertás** → el linyera "corrobora" en personaje (*"hackeo el cartel... y sí, no me mentís, genio"*) →
    **+caramelos** (sink/fuente: caramelos ya existen).
  - **Mentís** (no coincide) → *"¿Me querés cagar? La IA me sopló la posta, chanta"* → **−plata** (monedas).
- **Anti-abuso:** el topic del mandado se fija al pedírtelo (no podés "adivinar" cambiando de topic); 1 mandado
  activo por vez; cooldown para no farmear caramelos. (Mismo espíritu que el cupo del chat.)

## 5. Cómo encaja (reúso, no reinventar)
| Pieza | Reúsa |
|---|---|
| Banco de noticias (cron→proxy→`GET /noticias`) | patrón **`/novedades`** + **`/linyera-pool`** + `gen-prices.mjs` |
| Captura/summary por IA en NPU | **`carteles-ia.md`** (ruteo por hardware: NPU carteles, nube chat) |
| El cine como edificio + pantalla | **modelo-de-entidades** (edificio/room/`decor`/`sign` data-driven, F1-F4 ya hechos) |
| El pedido + verificación del linyera | **quest** (§6.95) + **grounding** del chat (ia-openrouter §0) + `Mensajero` |
| Recompensa/penalidad | economía existente (caramelos / monedas) |

## 6. El "cálculo on-the-fly" del linyera (lo que pediste explícito)
- El linyera **no lee la noticia**: al chatear, el juego le pasa al LLM **solo los `topic` disponibles** del banco
  (+ su personalidad). El LLM **elige uno y arma el pedido con su voz** ("andá al cine que quiero saber X").
  Es **grounding**: el espacio (topics) lo fija el código; el linyera elige y lo dice con onda. Cero invención.
- En la **verificación**, al LLM se le pasa el `answer` real (server-side) + lo que dijiste → responde
  "coincide / no coincide" **en personaje**. La "data" nunca sale al cliente hasta que la traés del cine.

## 7. Fases
1. **F1 — el banco + el cine estático:** `gen-noticias.mjs` (1-2 topics reales, ej. mundial + argentina) →
   `POST/GET /noticias`; el **CINE** como edificio data-driven con pantalla que muestra un titular random del
   banco al entrar. Sin quest todavía (solo "entrás y ves noticias distintas").
2. **F2 — el quest del linyera:** el oráculo te pide un topic (grounded) → vas → reportás → **verificación** +
   caramelos/plata. Repetible, con cooldown.
3. **F3 — más topics + TTS + arte:** todos los topics (videojuegos/guerra/NL/árabe/primera-b/bochas), voz al
   sentarte, fachada/interior de cine propios. Topics como **content-pack** (temporada).
4. **F4 — captura en NPU** (mover el summary a la rockchip, carteles-ia) + feed más rico (varias noticias en
   pantalla, rotación).

## 8. Mi lectura / decisiones abiertas
- **Encaja redondo** con el repo: es "novedades + un edificio data-driven + un quest", todo patrones que ya
  existen. El riesgo no es técnico sino de **fuentes de datos** (APIs/RSS por topic, rate limits, formato).
- **Abierto:** ¿qué fuente por topic (API key de deportes? RSS?)? ¿el reporte del jugador es **texto libre**
  (más divertido, necesita el LLM para verificar) o **elegir de opciones** (más simple, sin LLM)? ¿caramelos
  por acierto = cuántos, y cooldown? ¿el cine es del Nivel 1 o un content-pack de "temporada Mundial"?
- **Recomendación de arranque:** F1 con **mundial + argentina** (fuentes fáciles) y **reporte por texto libre
  verificado por el LLM** (es lo que le da la gracia del "no me mentís"). El resto escala agregando topics (data).
