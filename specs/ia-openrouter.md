# SPEC: IA con OpenRouter (diálogos / contenido generativo)

- **Estado:** Modo A implementado (v=44); **Modo B (chat en vivo) implementado** (v=45–47): cliente
  `js/ai.js` (proxy **o** BYOK **o** local), proxy `ai-proxy/` (Node + Worker), NPCs chateables
  (linyera filósofo + secretaria de EducaciónIT con persona acotada), y en ⚙ Opciones: **API key**,
  **selección de modelo** y botón **Validar** (existe + velocidad). Modelos free al vuelo, cacheo del
  que anduvo, tope de intentos y BYOK tolerante a 429. Ver §0.
- **Alcance:** transversal
- **Última actualización:** 2026-06-21

> **Implementado (v=44, modo A):** `tools/gen-dialogos.mjs` genera 9 pools (`js/dialogos.js`) con un
> modelo `:free` de OpenRouter (key en env o `tools/openrouter.key`, gitignored; trae la lista de
> modelos free al vuelo y rota/reintenta ante 429/404). **Enchufado a los NPCs** con fallback: los
> borrachines (`lines`), los linyeras de ruina (`RUINA_LINES`), el llanto de los ex-millonarios
> (`LINYERA_CRY`), Iorio, la gente de las cuevas (`cueva_gente`) y los cueveros que rebotan
> (`cuevero_rebote`) leen de `Dialogos.<pool>` vía un helper `_D/_Dp`; si `js/dialogos.js` no está
> (e2e), usan los pools hardcodeados. La IA solo da TEXTO; cero efecto en el estado.

## 0. Política de resolución (DECISIÓN IMPORTANTE)

Dos capas distintas, no confundir:

### Diálogo normal de los NPCs (borrachines, linyeras, cola, cueveros, Iorio…)
**Siempre LOCAL.** Usa los pools **pre-generados con el script (modo A, `js/dialogos.js`) + los
hardcodeados**. **Nunca** llama a la IA en vivo (cero latencia, cero costo, siempre disponible).
Esto es el **default** del contenido del juego.

### Chat en vivo con un NPC (`action:'chat'`) — orden de prioridad
1. **Proxy del dev** (`PROXY` seteado en `js/ai.js`) → "vos pagás", la key queda server-side. Si está
   configurado, **manda** (los jugadores no necesitan key).
2. **BYOK** — la **key del jugador** (la que pega en ⚙ Opciones, guardada en su `localStorage`). Se
   usa **sólo si no hay proxy**. Cada uno paga lo suyo; la key nunca sale de su navegador.
3. **LOCAL** (líneas predefinidas / canned) — si **no hay** proxy ni key, **o** si la IA elegida
   **tarda/falla**.

**Anti-espera:** si la key del jugador es trucha o el modelo tarda, **al primer fallo se hace switch
a las locales** por el resto de la sesión (`byokDead`), para que no se quede esperando cada vez.
Cambiar la key resetea ese estado. Timeout: 12 s.

> Resumen: **el juego siempre habla** (locales). La IA en vivo es un **enhancement** del chat, con
> dev-paid > player-key > local, y degradación automática a local ante lentitud/fallo.

### Selección y validación de modelo (en ⚙ Opciones) — v=47
- **Default = un free CHICO y RÁPIDO** (`DEFAULT_MODEL = meta-llama/llama-3.2-3b-instruct:free`):
  para el **chat** la velocidad importa más que el tamaño (los 70B/253B son lentos y rate-limited).
  El jugador puede elegir uno más grande/lindo en Opciones si no le molesta esperar. Orden real:
  **modelo elegido por el jugador → el que ya funcionó en la sesión (`_good`) → el default → resto**.
- En Opciones se ve **qué modelo usa** (`Modelo: <slug>`) y hay un campo para **forzar otro modelo**
  (slug de OpenRouter, ej.
  `mistralai/mistral-7b-instruct:free`). Se guarda en `localStorage` (`ts_openrouter_model`).
- Botón **Validar**: hace una llamada mínima al modelo con la key del jugador y reporta si **existe**
  y **cuánto tarda** (`✓ Anda · 1234 ms (rápido 🚀 / ok 👍 / lento 🐢)` o `✗ no existe (404) / 429 /
  401 / timeout`). `AI.validate(model)`.

### Rendimiento del free tier (decisiones)
Los modelos `:free` son **lentos y rate-limited** (después de 1 request te tiran 429). Por eso:
- **Se cachea el modelo que funcionó** (`_good`) y se usa **primero** → respuestas rápidas (1 sola
  llamada, sin rotar por todos, que era lo que lo hacía lentísimo).
- **Tope de 3 intentos** por mensaje (`MAX_TRIES`), timeout 11 s, **modelos chicos/rápidos primero**.
- **Un 429 transitorio NO mata el BYOK**: cae a local **sólo ese mensaje** y reintenta el próximo.
  Recién tras **3 fallos seguidos** se hace switch a local por la sesión (`byokDead`).
- Logs `[ai] …` en consola (F12) y `AI.lastSource()` para diagnosticar; el chat avisa si cayó a local
  teniendo key.

### Qué NPC es chateable y cuál NO (regla anti-confusión)
- **NO se hacen chat los NPCs que dan DATA crítica de gameplay.** Ej.: **Iorio** debe tirar la pista
  de la **falopa** (si no, el jugador nunca se entera) → queda como **acción scripteada**
  (`action:'iorio'`, no `chat`). Igual los borrachines (`want`/`hint`) y los cueveros. **El chat libre
  no puede esconder info esencial.**
- **Los NPC chateables usan una persona ACOTADA** (system prompt que limita el tema): el chat es para
  color/inmersión, no para guiar. Personas actuales:
  - `filosofo` — el linyera de la calle: filosofía callejera, sin info de quest.
  - `secretaria` — recepción de **EducaciónIT** (cada piso): SÓLO cursos, horarios, qué profe da qué,
    descuentos y métodos de pago. Si le preguntás otra cosa, desvía ("de eso no sé, ¿te cuento de los
    cursos?"). **No contesta nada fuera de su rol.**
- Las personas (system prompts) viven en `js/ai.js` (BYOK) y en `ai-proxy/personas.js` (proxy).

### Las PISTAS (palabras clave) NO dependen del LLM
Las pistas del juego se entregan por la **capa scripteada**, siempre, pase lo que pase con la IA:
- el campo **`hint`** (los borrachines lo revelan al hablarles) y las **`action`** (Iorio→falopa,
  el del chori→vale, etc.).
- Las **pools generadas** (modo A) y el **chat IA** (modo B) son **flavor**. El `keywords:` de los
  bloques ` ```gen ` sólo hace que ese flavor sea **on-theme** (que algún borracho hambriento nombre
  el fiambre), **no reemplaza** la pista.
- **Regla:** *hablar* a un NPC clave **siempre dice lo importante**; *chatear* (IA) es **libre**.

### Fuente única de la personalidad: la ficha SDD de cada personaje
Cada personaje tiene un bloque **Personalidad** en su ficha (`specs/nivel-1/personajes/*`): voz, tono,
contexto, qué quiere, **qué NO dice** (límites), `persona` de chat y una **semilla para el script**.
Es la **fuente única** de la voz del personaje, de la que se derivan:
1. los **pools del modo A** (`tools/gen-dialogos.mjs` — sus JOBS espejan estas semillas), y
2. los **`persona` del chat** (modo B).

**Multi-idioma — los chistes NO se traducen, se TRANSCREAN (regla dura).** Cuando el juego se sirve
en otro idioma (ver `specs/idiomas.md` y el [glosario de transcreación](glosario-transcreacion.md) =
términos/nombres propios/tono canónicos), las personas, las líneas canned y los pools generados deben
**conservar el humor porteño** del personaje, **sin romperse en la traducción**. El system prompt de
cada persona y los JOBS del generador llevan la instrucción explícita: *"no traduzcas literal — buscá
el equivalente en slang callejero del idioma destino, manteniendo el tono y el chiste del personaje"*.
La ficha de cada personaje declara su **voz en otros idiomas (transcreación)** en el bloque
Personalidad (ver `ENTIDAD-template.md`); de ahí salen tanto el `persona` por idioma como los pools
`js/dialogos.<lang>.js`. El chat en vivo responde en el **idioma activo** (`I18n.lang`) manteniendo
la misma voz. Las **pistas** siguen garantizadas por la capa scripteada en cualquier idioma.

> **Hecho:** `gen-dialogos.mjs` **lee las fichas**. Cada ficha declara sus pools en bloques
> ` ```gen ` (`pool` / `n` / `seed`); el script los junta de `specs/nivel-1/personajes/*.md` y genera.
> Para sumar/ajustar diálogos de un personaje, se toca **su ficha** y se regenera (`npm run gen:dialogos`).
> Hay `FALLBACK_JOBS` por si no encuentra bloques. (Sigue pendiente: usar también el bloque Personalidad
> completo como contexto extra, no sólo la `seed`.)

## 1. Objetivo
Usar un LLM (vía **OpenRouter**, con un **modelo `:free`**) para **mejorar el contenido textual** del
juego: diálogos variados, narrador del loop, NPCs con los que charlar, sin romper el ethos (100%
estático) ni meter la API key en el cliente. La IA **solo genera texto/flavor**; **nunca** toca el
estado del juego (flags, outcomes, vida).

## 2. Blocker de diseño
El juego se sirve estático (GitHub Pages). **La API key NO puede vivir en el cliente** (quedaría
expuesta y cualquiera quema la cuota). De ahí los dos modos de abajo.

## 3. Dos modos

### 🅰️ Pre-generación en dev-time (recomendado para empezar)
Un **script Node** (`tools/gen-dialogos.mjs`, NUEVO, corre **local con tu key**, no en producción)
que le pide a OpenRouter **N variantes** de líneas por NPC/situación, usando el **grafo**
(`specs/nivel-1/GRAFO.md`) y las fichas como contexto, y **escribe pools estáticos** (en `js/*.js` o
un `js/dialogos.js`) que se **commitean**.
- ✅ Cero key en producción, **cero latencia/costo en runtime**, sigue 100% estático.
- ✅ Resuelve la regla *"siempre variantes, no repetir"* sin escribir cientos de líneas a mano.
- Es un **content generator** offline; el juego ni se entera de que hubo IA.

### 🅲️ Ollama local (FUTURO — anotado para ver luego)
> **Estado: idea, sin empezar.** Correr un modelo **local con [Ollama](https://ollama.com)** como
> tercera fuente del chat (modo B), para quien lo tenga instalado: cero costo, cero cuota, privado
> y sin clave. Encaja en el **mismo seam** que ya existe (`AI.chat()` con orden de fuentes): se
> sumaría **`viaOllama()`** apuntando a `http://localhost:11434/api/chat` (modelo ej. `gemma`/`llama3.2`),
> y entraría en la cadena de prioridad (p. ej. **Ollama local > proxy > BYOK > local-canned**, o
> elegible en ⚙ Opciones). Detección: ping a `localhost:11434` al abrir Opciones; si responde,
> ofrecer la opción. **No** cambia nada del resto: si no hay Ollama, sigue igual que hoy. Pendiente
> de decidir: orden de prioridad, cómo se elige el modelo local, y CORS (Ollama necesita
> `OLLAMA_ORIGINS` para aceptar el origen del juego). Ver ROADMAP → IA.

### 🅱️ Runtime (en vivo) con proxy
Para lo dinámico (chatear, reacciones al estado): **capa aditiva** igual que `presence.js`/`config.js`.
- **Proxy mínimo** (extender `presence-server/` o `ai-proxy/`, Cloudflare Worker o Node): guarda
  `OPENROUTER_API_KEY`, expone `POST /ai`, hace **rate-limit + cache + tope de tokens/coste**, y
  arma el request a `https://openrouter.ai/api/v1/chat/completions`.
- **`js/ai.js`** (NUEVO, capa aditiva): `AI.ask(kind, ctx)` → `fetch(ENDPOINT)`. **Graceful**: sin
  endpoint configurado o si falla/tarda → **fallback a los pools hardcodeados**. Nunca dependencia dura.
- **Asíncrono**, nunca en el loop de render: al acercarte a un NPC se dispara y **cachea** por
  `(npc, estado)` en `localStorage`; mostrás "…" y reemplazás cuando llega.

## 4. Qué mejora (orden de valor)
1. **Diálogos dinámicos** sin repetir: borrachines, linyeras (llanto + historia), la cola del dólar,
   la gente de las cuevas, Iorio.
2. **Narrador del loop**: flavor distinto cada "Día #N" de supervivencia.
3. **Chatear** con un NPC (linyera filósofo, cuevero) — más inmersión, más costo/latencia.
4. **GraphRAG**: el knowledge graph como contexto/oráculo (ver `TECNICAS.md §5`) y para **QA en dev**.

## 5. El system prompt (la voz)
- Tono: **humor porteño, slang argentino**, NPC concreto, **1–2 frases**.
- Contexto inyectado: ficha del NPC + estado relevante (pre/post tormenta, día del loop, qué tiene el
  jugador) + **few-shot** con líneas existentes (los pools actuales como ejemplo de estilo).
- Reglas duras en el prompt: nada de romper la 4ª pared del sistema, no inventar mecánicas, largo corto.

## 6. Modelos `:free` de OpenRouter
Variantes `:free` (Llama / Gemma / Mistral / DeepSeek, etc. — la oferta cambia) alcanzan para
one-liners. **Free = rate-limited** (por minuto/día) → por eso el proxy necesita **cache + rate-limit**
igual. Elegir el modelo por slug en el proxy; fácil de cambiar.

## 7. Caveats (lo que hay que cuidar)
- **Seguridad:** key **solo** en el proxy. CORS acotado. Validar/recortar el input del cliente
  (prompt-injection): el cliente manda `kind` + estado, **no** un prompt libre arbitrario (salvo el
  modo chat, que va con guardrails).
- **Latencia:** 1–5 s → siempre async + fallback; nunca bloquear el gameplay.
- **Costo/cuota:** cache agresivo (localStorage + proxy), rate-limit, tope de tokens.
- **Calidad/tono:** depende del prompt + few-shot; opcional filtro de palabras para mantener el tono.
- **Offline / Pages sin proxy:** **debe** degradar a los pools hardcodeados (el juego anda igual).

## 8. Requisitos funcionales (Draft)
- **RF-IA1** — modo A: script dev-time que genera pools y los deja estáticos (cero runtime).
- **RF-IA2** — modo B: `js/ai.js` aditivo con **fallback** a pools si no hay IA.
- **RF-IA3** — proxy con key segura + rate-limit + cache + tope.
- **RF-IA4** — la IA **solo** produce texto; el estado del juego queda en el código.
- **RF-IA5** — cache de respuestas por `(npc, estado)` para costo/latencia/offline.

## 9. Preguntas abiertas
- ¿Arrancamos por **A (pre-generación)** —más alineado y sin infra— y dejamos B para "chatear"?
- ¿Qué NPCs primero? (sugerencia: borrachines + linyeras + gente de las cuevas.)
- ¿Modelo `:free` preferido? (probar 2–3 y comparar tono/latencia.)
- ¿Querés un **modo chat** real con algún NPC, o alcanza con líneas generadas?
