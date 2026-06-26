# SDD — El CINE de noticias: pantalla con news capturadas por IA + el linyera que te manda y te corrobora

- **Estado:** **Implementado** (F1 banco+cine, F2 quest, F3 7 pisos + TTS + arte, **F5 archivo de 7 días + el GUARDA
  con regateo** — todo en prod 2026-06-25, `cache v129` / `proxy 0.1.27`). **F4 (captura en NPU) NO se hizo** y queda
  descartado: la NPU alucina + es lenta; la captura corre en `gemma4-paid` (ver §3.1). Este spec documenta la
  **intención realizada**, no un plan.
- **Implementación:** banco+archivo en `ai-proxy/server.js` (`GET/POST /noticias` con `?day=`/persistencia PVC),
  fetch en `ai-proxy/gen-noticias.mjs` (cron `cronworkflow-noticias.yaml`), cliente `js/noticias.js`
  (→ `window.NOTICIAS` + `window.NOTI_DIAS` + `window.fetchNoticiasDay`), edificio+pisos+guarda en `js/level.js`,
  lógica de pantalla/quest/guarda en `js/game.js` (`cineTopicsFor`/`pickNoticias`/`drawCineScreen`/`newsQuest`/
  `openGuarda`/`guardaRegatear`), arte en `js/art.js` (`BUILDINGS.cine`). TTS con fallback al server (espeak-ng) en
  `js/mensajero.js` (ver §3.4).
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

- El **CronWorkflow** `tormenta-ai-proxy-noticias` corre `gen-noticias.mjs` **1×/día a las 09:00** (`schedule:
  ["0 9 * * *"]`, `timezone: America/Argentina/Buenos_Aires` — slow OK porque es diario): por cada **topic** hace
  `fetch()` a su fuente → extrae el dato → arma `{ topic, headline, answer, ts }`.
  - Ej.: `{topic:"mundial", headline:"Argentina 2-1 Brasil (semi)", answer:"2-1", ts:...}`.
  - **El resumen a "titular" es OPCIONAL y FIEL:** el `headline` se rephrasea con `gemma4-paid` (12 palabras máx,
    "no inventes datos"), pero el **`answer` queda CRUDO** (el titular real que el linyera verifica). **crypto y
    openrouter NO se resumen** (son números/precios): se pushean *después* del loop de resumen para que el dato
    quede exacto. Si el resumen falla, queda el crudo.
- **POST `/noticias`** al proxy (protegido por `GEN_TOKEN`, igual que `/precios` y `/linyera-pool`). El proxy
  **persiste el banco en JSON sobre el PVC** (`/data/noticias.json`, mismo patrón que `subs.json`): `saveNoticias()`
  en cada POST + `loadNoticias()` al arrancar. **Por qué:** el cron corre 1×/día, así que sin persistir, cada
  redeploy/restart dejaría el cine "sin señal" hasta las 9am. Lo sirve por **`GET /noticias`** (JSON,
  `Cache-Control: 300`). El POST **sobrescribe** el banco entero (no acumula); un POST **vacío** (corrida fallida)
  **no** lo borra (`empty-ignored`).
  - ⚠️ **Gotcha operativo (mordió en prod 2026-06-25):** `GEN_TOKEN` sale de `.Values.linyeraPool.genToken`, que
    es secreto (default `""`). Un `helm upgrade tormenta-ai ... --set image.tag=X` **SIN** `--set
    linyeraPool.genToken=<TOK>` lo resetea a vacío → el proxy devuelve **403** a TODO POST interno
    (`/noticias`, `/precios`, `/linyera-pool`, `/sub-codes`, `/provision`) y el cron ni POSTea (`if (POST_URL &&
    TOKEN)`), pero el workflow igual termina **"Succeeded"** (cae al `else` que imprime JSON) → falla silenciosa,
    banco vacío. **Siempre desplegar el proxy con `--set linyeraPool.genToken=<TOK>`.** Verificar mirando la línea
    `POST http://tormenta-ai-proxy/noticias -> 200` en los logs del cron, no solo el "Succeeded".
- **Hardware:** el `gen-noticias.mjs` (fetch + resumen) corre en el pod del proxy (arquitectura del cron); el
  resumen usa `gemma4-paid` (nube). La NPU quedó **descartada** para esto (alucina + lenta, §3.1 tabla). El
  **fetch siempre es del cron** (code), nunca un modelo.

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

### 3.2 Las fuentes (topics — 15 implementados, data del cron)
Lista real en `gen-noticias.mjs` (`NEWS_TOPICS` env, ampliable). **15 topics**, 3 clases de fuente:

| Clase | Topics | Fuente (sin key) | Resumen IA |
|---|---|---|---|
| **Google News RSS** | `mundo`, `mundial`, `primera-b`, `videojuegos`, `guerra`, `argentina`, `paises-bajos`, `arabe`, `ia`, `bochas`, `finanzas`, `colombofila`, `consolas-retro` | `news.google.com/rss/search?q=…&hl=es-419&gl=AR&ceid=AR:es` (fetch sigue el 302 solo) | sí (`gemma4-paid`, fiel) |
| **CoinGecko** | `crypto` | `api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum…` | **no** (números exactos) |
| **OpenRouter** | `openrouter` | `openrouter.ai/api/v1/models` (precios US$/1M de modelos populares) | **no** (precios exactos) |

- **Fútbol con resultado exacto:** opt-in `NEWS_SPORTS="mundial:4406,…"` → TheSportsDB (key de prueba `3`), pisa el
  topic con un `answer` numérico ("2-1"). Best-effort; si falla queda lo de Google News.
- **Fuentes que NO sirvieron (probadas 2026-06-25):** API de MercadoLibre → **403** (bloqueada sin key, era para
  `consolas-retro` con precios reales); Reddit → **403**. Por eso `consolas-retro` cae a Google News; eBay/
  Marktplaats necesitan key (pendiente). **Si una fuente falla, ese topic queda sin entrada esa corrida**
  (best-effort, como precios).

### 3.3 El CINE — edificio DATA-DRIVEN de 7 PISOS (implementado)
- Es parte de `levels/nivel-1.json` (generado por `tools/gen-level.js`): puerta `cine` en la calle (x:52, **fuera**
  de la cola de la casa de cambio — se movió del 84 por feedback del dueño) con `facade:'cine'` + arte propio
  `BUILDINGS.cine` (`js/art.js`, marquesina "🎬 CINE", NO "galería"). Adentro, **7 salas/pisos** (`cine1..cine7`)
  encadenadas por puertas `up`/`down` (la planta baja tiene `back` a la calle), cada una con `_seats` (7 sofás
  compartidos) + `_ads` (2 carteles de propaganda, reúsa decor `cartel`).
- **Cada piso = una categoría temática**, su pantalla muestra noticias del banco filtradas por sus topics
  (`cineTopicsFor(name)` en `js/game.js`, detección por nombre `/Cine/`):

  | Piso | Sala | Topics que muestra | NPC temático |
  |---|---|---|---|
  | 1 · **Deportes** | `cine1` | `mundial`, `primera-b`, `bochas` | — |
  | 2 · **Mundo** | `cine2` | `mundo`, `guerra`, `argentina`, `paises-bajos`, `arabe` | — |
  | 3 · **Tecno** | `cine3` | `videojuegos`, `ia` | — |
  | 4 · **Finanzas** | `cine4` | `finanzas`, `crypto` | Broker |
  | 5 · **Colombofilia** | `cine5` | `colombofila` | Colombófilo |
  | 6 · **Consolas** | `cine6` | `consolas-retro` | Coleccionista |
  | 7 · **OpenRouter** | `cine7` | `openrouter` | "El Linyera IA" (oráculo chateable) |

- **Colombofilia (investigado 2026-06-25):** asociaciones reales activas = **FCI** (Fed. Colombófila Internacional),
  **RFCE** (Real Fed. Colombófila Española), **FECOAR** (Argentina). No hay API pública → vía Google News.
- **La pantalla** (`drawCineScreen(r)` en `js/game.js`): 360×168, header "🎬 CINE · CATEGORÍA", topic + **titular
  completo** (`wrapLines`, hasta 8 líneas — se agrandó porque antes cortaba el texto), footer con la acción de
  lectura. `pickNoticia(name)` elige al azar entre las noticias cuyos topics matchean el piso (siembra por visita).

### 3.4 La pantalla (cómo muestra la noticia)
- `js/noticias.js` trae `GET /noticias` a `window.NOTICIAS` al cargar. Al entrar a un piso, `pickNoticias` toma
  **varias** noticias del banco filtradas por los topics del piso → `cineNoticias` (1 sola → texto completo; varias
  → 2 líneas c/u). Se **leen de un vistazo** sin depender del audio (igual en celular, mismo canvas).
- **TTS = ACCIÓN, no automático.** Tecla **[R]** (`cineRead` → `Mensajero.hablar`), lee todas, opt-in. No se dispara
  solo (la versión auto sonaba mal).
- **TTS con fallback al SERVIDOR (clave en Linux):** si el navegador **no tiene voz** (`speechSynthesis` vacío —
  típico en Chromium/Linux, donde la música WebAudio sí suena), `Mensajero.hablar` cae a **`GET /tts?text=…&lang=es|en`**
  del proxy (**`espeak-ng`** → WAV) y lo reproduce por WebAudio. Respeta el acento (`es-419` / `en-us`). Así lee en
  cualquier navegador sin tocar el sistema.

### 3.5 El quest del linyera (es un `quest` del modelo, §6.95)
- El linyera-oráculo, al chatear, **tira el pedido**: elige un topic del banco y te manda al cine (`interact`
  con grounding: se le pasan los **topics disponibles**, no las answers → "sabe el qué, no el cuánto").
- **Estado del mandado** (runtime, por sesión): `{ topic, asked:true, reported:false }`.
- Al volver y reportar (chat), se **verifica** (§4). Es un quest **repetible** (`scope:run`, recompensa chica)
  → da rejugabilidad ("cada vez algo distinto").

### 3.6 El ARCHIVO de 7 días + el GUARDA (funciones viejas por caramelos, con regateo) — F5
La gracia (idea del dueño 2026-06-25): el cine no solo pasa la función de hoy; **guarda hasta 7 días** y un
**guarda** en la entrada te **vende funciones viejas** por caramelos. Cierra el loop económico: los caramelos del
quest del oráculo (§4) se **gastan** acá. 🍬↔📼

- **Backend — archivo acotado (no "basura forever"):** el proxy guarda `NOTI_DAYS = { 'YYYY-MM-DD': {noticias, ts} }`
  persistido en el PVC (`/data/noticias.json`, ver §3.1). El POST del cron **archiva el día de hoy** y **poda** a los
  **7 más recientes** (`notiPrune`): entra el nuevo, se cae el más viejo. `GET /noticias` = día actual + `dias`
  (lista); `GET /noticias?day=YYYY-MM-DD` = esa función vieja. (El POST acepta un `day` opcional para sembrar
  pruebas; GEN_TOKEN.)
- **El guarda (NPC, `js/level.js` cine1):** `action:'guarda'`. Al interactuar abre un **menú** (overlay
  `#guardamenu`, `openGuarda`) con los días viejos disponibles y su precio. Elegís (no cicla).
- **Precio:** la **1ª función vieja del run es GRATIS** (`guardaFreeUsed`); después el **precio base = días para
  atrás** (más viejo = más caro). **Regateo** (`guardaRegatear`, botón 🤝): baja de a 1 caramelo hasta un **piso**
  (`HAGGLE_FLOOR = 2`), así las muy viejas (caras) convergen al mismo precio que las otras. El guarda contesta en
  personaje. El regateo y la función vieja se **resetean al salir del cine** y por partida.
- **En pantalla:** al comprar, `cineArchive = {day, noticias}` y los pisos muestran ESA jornada; el header pasa a
  **📼 FUNCIÓN VIEJA DD/MM**. `pickNoticias` usa `cineArchive` si está activo, si no el día de hoy.

## 4. Verificación (anti-mentira) + economía — **implementado en `js/game.js`**
- **La verdad está en el banco** (`window.NOTICIAS`, que vino del server). El jugador reporta su respuesta **por el
  chat** del linyera (`chatSend`): el reporte se evalúa **antes** de mandar al modelo.
- **Chequeo `newsMatch` (local, NUNCA inventa):** compara las **palabras significativas** de lo que dijiste contra
  el `answer`/headline real del topic activo:
  - **≥1 palabra significativa compartida** → **verdad** → *"no me mentís, genio"* → **+3 caramelos**.
  - **≥2 palabras y 0 compartidas** → **mentira** → *"¿Me querés cagar?"* → **−10 monedas**.
  - (Pocas palabras / ambiguo → no penaliza.) Mensajes en `g.cine.questOk` / `g.cine.questLie`.
- **El pedido (`newsQuest`):** con ~35% de chance, después de responderte, el linyera te tira un topic disponible
  ("andá al cine, quiero saber de X") → quest repetible. 1 mandado activo por vez.

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
1. **F1 — el banco + el cine** ✅ (`v119`): `gen-noticias.mjs` → `POST/GET /noticias`; CINE como edificio
   data-driven con pantalla que muestra un titular random del banco al entrar.
2. **F2 — el quest del linyera** ✅ (`v120`): el oráculo te pide un topic → vas → reportás → `newsMatch` +
   caramelos/plata. Repetible (~35% chance).
3. **F3 — multipiso + TTS + arte** ✅ (`v122`-`v124`): fachada/arte de cine propios, TTS por **[R]** (no auto),
   carteles de propaganda adentro, y **7 pisos temáticos** (Deportes/Mundo/Tecno/Finanzas/Colombofilia/Consolas/
   OpenRouter) con 15 topics (incl. crypto CoinGecko + precios OpenRouter). Cron a **1×/día 9am AR**.
4. **F4 — captura en NPU** ❌ **descartada**: la NPU alucina + tarda 18-34s (§3.1). La captura se queda en
   `gemma4-paid` (fiel, barato a 1×/día). **Pendiente real:** precios de `consolas-retro` con monto exacto
   (eBay/Marktplaats necesitan key; ML da 403).
6. **F6 — fútbol con resultado exacto (`NEWS_SPORTS`)** ✅ **activado** (`infra-14`, 2026-06-25): `noticias.sports
   = "mundial:4429,primera-b:4616"` (TheSportsDB) → los topics `mundial`/`primera-b` traen el score real
   ("Ecuador 1-1 Germany"). El `answer` pasa a ser numérico → la verificación del oráculo (§4) tiene dato preciso.

### 7.2 BLOQUEADO por API key — tabla de goleadores + posiciones del grupo de Argentina (Mundial)
Idea del dueño (2026-06-25): que el piso Deportes muestre la **tabla de goleadores** y la **tabla de posiciones del
grupo de Argentina** del Mundial. **NO se puede con fuente gratis/sin key** (verificado 2026-06-25):
- TheSportsDB key de prueba `3`: `lookuptable.php?l=4429&s=2026` **trunca a 5 filas** (solo líderes de grupo) →
  Argentina **ni aparece**, no da el grupo completo. Y **no hay endpoint de goleadores** en el tier gratis (devuelve HTML).
- **Para hacerlo:** necesita una **API key** — opciones: api-football (api-sports.io, free 100 req/día), football-data.org
  (free con key), o el Patreon de TheSportsDB (key real → tabla completa + goleadores). El dueño tiene que conseguir una.
- **NO inventar** la data (rompería la verificación del cine §4 y sería desinformación). Queda pendiente de la key.

### 7.1 PENDIENTE (idea del dueño 2026-06-25, NO implementado) — news EN VIVO horario + Villa Dálmine
- **Refresh cada 1 h** (hoy el cron es 1×/día 9am): para lo que cambia rápido (fútbol/Mundial, crypto). Diseño
  recomendado: un **2º CronWorkflow `0 * * * *`** que corra `gen-noticias.mjs` en modo **live-only** (solo sports +
  crypto, sin el resumen `gemma4-paid` de Google News) y **POSTee con MERGE por topic** — porque hoy el POST
  **reemplaza** el día entero (`NOTI_DAYS[day] = …`), así que un POST parcial **borraría** los 13 topics de Google
  News. → falta: (a) modo `NEWS_LIVE_ONLY` en `gen-noticias.mjs`, (b) `merge:true` en `POST /noticias` (update por
  topic, no replace), (c) el cronworkflow horario.
- **Villa Dálmine** ✅ **HECHO** (`infra-15`): `NEWS_SPORTS` ahora acepta `topic:team:<id>` (por EQUIPO vía
  `eventslast.php`, no por liga) → `primera-b:team:137785` muestra el **último partido de Villa Dálmine**
  ("Villa Dálmine 2-1 Sportivo Italiano"), sin importar cómo etiqueten la liga. Falta solo el **refresh horario**.
5. **F5 — archivo de 7 días + el GUARDA** ✅ (`v127`-`v129`, ver §3.6): persistencia por día en el PVC, `GET
   /noticias?day=`, NPC guarda con menú de elección, 1ª gratis, más viejo más caro, **regateo** hasta piso. Más el
   **TTS con fallback al server** (espeak-ng, §3.4, `v126`) para que lea aunque el navegador no tenga voz.

## 8. Decisiones tomadas (cerradas en la implementación)
- **Fuente por topic:** Google News RSS (público, sin key, cubre casi todo) + CoinGecko (crypto) + OpenRouter API
  (precios). Lo que pedía key/estaba bloqueado (deportes exactos, ML para consolas) quedó como opt-in/pendiente.
- **Reporte del jugador:** **texto libre** verificado **local** (`newsMatch` por palabras compartidas, sin LLM ni
  costo) — más simple que mandar a un modelo y suficiente para el "no me mentís".
- **Economía:** +3 caramelos por acierto, −10 monedas por mentira (§4). Quest repetible, ~35% chance, no cron-gated.
- **El cine es del Nivel 1** (no content-pack) — 7 pisos data-driven en `levels/nivel-1.json`.
- **Pendientes** (no bloquean): precios exactos de consolas (eBay/Marktplaats con key), `NEWS_SPORTS` activado para
  resultados de fútbol, y eventualmente más pisos/topics como content-pack de "temporada".

## 9. Quest del MUNDIAL — los dos hinchas + el guarda ✅ IMPLEMENTADO (v133, 2026-06-26)

En el **piso Deportes/Mundial** hay **dos hinchas** parados (NPCs **con IA**, chateables). El loop:
1. Les hablás → te preguntan **"¿sabés cómo salió [equipo random que jugó el Mundial]?"** (un equipo al azar de los
   que **realmente jugaron**). Vos **no sabés** (no se te dio el dato).
2. Vas al **guarda** y le pedís ese resultado → el guarda **te cambia la pantalla en el momento** con el partido de
   ese equipo. Lo leés.
3. Volvés a los hinchas → te **agradecen** (quest cumplida). **En el momento que lo activás con el guarda, uno de
   los hinchas ya se te arrima a dar las gracias** (el NPC "entiende el entorno mediante los grafos" → grounding:
   sabe que conseguiste el dato porque el estado/flag cambió).
4. Si volvés a hablarles, **pasa lo mismo** (repetible, otro equipo). **Al salir del piso/cine, todo vuelve como
   estaba** (estado efímero por visita, como `cineArchive`).

### 9.1 Requisito de datos (clave)
- Los hinchas tienen que **saber TODOS los resultados** de los equipos que jugaron el Mundial → hay que **poblar
  todos los partidos una vez al día y guardarlos** (no solo el último). **Fuente: ESPN** `…/fifa.world/scoreboard`
  (da todos los `events` con marcador) — o `eventsseason`/por fecha. Persistir como un **mapa equipo→último
  resultado** (o lista de partidos) en el banco (PVC), junto a `mundial-tabla`/`mundial-goleadores`.
- Endpoint sugerido: `GET /mundial` → `{ partidos:[{home,away,score,date}], porEquipo:{ "Argentina":"2-1 vs X" } }`.
  El cron lo llena 1×/día (o 3×, ya hay schedule múltiple). El guarda y los hinchas leen de ahí (grounding).

### 9.2 Cómo encaja con lo que ya hay
- **Guarda** (ya existe, `openGuarda`): se le agrega "mostrar el resultado de un equipo" → set `cineArchive`-like
  o un `cineMatch` que la pantalla dibuja. Ya cambia la pantalla; acá la cambia a un **partido puntual**.
- **NPCs IA + grounding por grafo** (Mensajero/historia-grafo): a los hinchas se les inyecta el equipo pedido + el
  resultado real (server-side) → preguntan y agradecen **en personaje**, sin inventar. El "ya sabe que cumpliste"
  = un **flag** (`mundialQuest = {equipo, resultado, done}`) que el grafo lee.
- **Estado efímero**: `mundialQuest` se resetea al salir (como `cineArchive`/`guardaAsk`).

### 9.3 Pendiente de definir con el dueño
- ¿Recompensa? (caramelos/monedas como el quest del oráculo §4). · ¿Los dos hinchas son uno que pregunta y otro que
  agradece, o ambos? · ¿El guarda cobra por este "favor" o es gratis (es parte de la quest)? · ¿Verificación al
  reportar, o alcanza con haber abierto el dato en el guarda (el flag)?
