# SPEC: IA con OpenRouter (diálogos / contenido generativo)

- **Estado:** Modo A implementado (v=44); **Modo B (chat en vivo) implementado** (v=45): cliente
  `js/ai.js` (proxy **o** BYOK **o** local), proxy `ai-proxy/` (Node + Worker), NPC chateable
  (Linyera filósofo) y campo de API key en ⚙ Opciones. Ver §0 (política de resolución).
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
