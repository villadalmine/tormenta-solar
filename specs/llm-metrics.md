# SDD — Monitoreo de modelos free + página pública `/llm-metrics`

- **Estado:** Draft
- **Última actualización:** 2026-06-24
- **Incluye:** medición pasiva por uso (§2-§5), **benchmark activo cada 4h con costo y modelos pagos**
  (§11), y **re-ruteo automático** del juego cuando un modelo se degrada (§12).
- **Relacionado:** `metricas.md` (F1/F2/F3 — de donde sale el dato), `latencia-chat.md` (el tope de 10s y la
  cadena), `pruebas-modelos.md` / `reporte-modelos.md` (el banco manual de calidad), `suscripcion.md` (el
  upsell cuando el free satura).

## 1. Contexto y objetivo

El modelo free por defecto **falla muy seguido**: a veces recién a la 3ª/4ª vez contesta. Hoy el proxy ya mide
*outcome* y latencia (`metricas.md` F1), pero **no responde dos preguntas clave**:

1. **¿Qué modelo free de OpenRouter anda MEJOR para el juego?** — el que falla menos, responde más rápido y da
   respuestas más coherentes/en personaje. Hoy lo sabemos sólo por un banco **manual** (`pruebas-modelos.md`),
   que se desactualiza: los `:free` de OpenRouter cambian de disponibilidad hora a hora.
2. **¿Cuál es la tasa de fallo, de forma visible?** — que el usuario (y cualquiera) la pueda VER, sin entrar a
   Grafana, en una página pública estilo **`/llm-metrics`**.

Este SDD diseña: (a) cerrar el gap de métrica para medir fallo/calidad **por modelo**, (b) una página pública
`/llm-metrics` que lo muestra, sacándolo de las métricas que ya tenemos.

## 2. Lo que ya existe (y el gap)

- `tormenta_ai_chat_total{model,backend,outcome}` — outcome ∈ `ai|timeout|error|ratelimited`.
- `tormenta_ai_chat_latency_seconds{model,backend}` — histograma → p50/p95.
- ServiceMonitor + dashboard Grafana `tormenta-linyera` (interno).

**GAP CRÍTICO — los fallos no se atribuyen al modelo.** En `server.js`, `ask()` prueba la cadena
(`gemma4-free` → `kimi-free`); sólo cuando **gana** uno hace `incChat(model,…,'ai')`. Cuando la cadena entera
falla, el handler hace `incChat('-','-', 'timeout'|'error')`. O sea: **no sabemos qué modelo concreto se colgó**.
Para "tasa de fallo por modelo" eso es justo lo que falta. Tampoco distinguimos un intento de `gemma4-free` que
murió por timeout de uno que devolvió 429/empty.

→ Necesitamos contar **por intento de modelo**, no sólo por request ganada.

## 3. Diseño

### 3.1 Métrica nueva: intentos por modelo (RF-1)

Instrumentar `ask()` para emitir, por **cada intento** de cada modelo de la cadena:

```
tormenta_ai_model_attempts_total{model="gemma4-free", backend="openrouter", result="ok|timeout|http_429|http_other|empty"}  counter
```

- `result`:
  - `ok` — el modelo contestó con texto (ganó o no la cadena; acá ganó).
  - `timeout` — abortó por `PER_MODEL_TIMEOUT` (se colgó).
  - `http_429` — saturado (rate-limit del proveedor) → muy común en `:free`.
  - `http_other` — 404/5xx/etc.
  - `empty` — 200 pero `choices[0].message.content` vacío.
- Con esto, **tasa de fallo del modelo X** = `1 - ok/total_intentos{model=X}`, y el **% de 429** (saturación de
  OpenRouter) queda separado del % de timeout (lentitud). Esa es la métrica que explica "falla 3 veces y a la 4ª
  anda": son 429/timeout encadenados.
- `tormenta_ai_chat_total` (request-level) se mantiene como está (vista del jugador: ¿la request final dio IA o
  línea temática?). Las dos capas se complementan: *attempts* = salud por modelo; *chat_total* = experiencia.

### 3.2 Métrica nueva: señales de calidad baratas (RF-2)

"Cuál da mejores respuestas" no se puede medir sólo con ok/fail. Señales **heurísticas in-proxy** (costo ~0, sin
LLM-judge, sin PII — sólo cuenta agregada por modelo):

```
tormenta_ai_quality_total{model, issue="too_short|refusal|lang_mismatch|repetition|broke_character"}  counter
```

- `too_short` — respuesta < N chars (p.ej. < 15): el modelo "no dijo nada".
- `refusal` — matchea frases de rechazo ("I can't", "as an AI", "no puedo ayudarte con eso", etc.).
- `lang_mismatch` — el jugador escribió en ES y la respuesta vino en EN (o viceversa) — heurística por ratio de
  stopwords/charset. El linyera tiene que contestar en el idioma del jugador.
- `repetition` — n-grama repetido / respuesta que repite el prompt.
- `broke_character` — rompe el personaje (menciona "language model", "OpenRouter", markdown de asistente…).

Un modelo con `ok` alto pero mucho `lang_mismatch`/`broke_character` es **peor para el juego** aunque "no falle".
Esto es lo que convierte la página en "cuál da **mejores respuestas**", no sólo "cuál responde".

### 3.3 (Opcional, fase 2) Banco automático con LLM-judge (RF-3)

Para un ranking de calidad **real** y comparable (no sólo heurísticas), un `CronJob` semanal que:
1. Manda una batería fija de ~10 prompts (en ES y EN, con memoria multi-turno) a cada **candidato** `:free`.
2. Puntúa cada respuesta con un **LLM-judge** (un modelo barato/pago) en: coherencia, en-personaje, idioma,
   uso del contexto. (Calca lo que hoy es manual en `pruebas-modelos.md`, pero continuo y versionado.)
3. Publica `tormenta_ai_model_score{model,dim}` (gauge 0-1) → la página muestra el podio.

Esto tiene costo (tokens del judge) → es opt-in y de baja frecuencia. Sin él, la página usa §3.1+§3.2 (gratis).

### 3.4 (Opcional) 👍/👎 del jugador (RF-4)

Botoncito en el chat: el jugador califica la respuesta. `tormenta_ai_feedback_total{model,vote="up|down"}`.
Señal real de calidad, costo cero, pero rala. Bueno como desempate. (Requiere tocar `js/ai.js` + UI del chat.)

### 3.5 Exposición pública para la página: `/stats.json` (RF-5)

La página `/llm-metrics` es **estática y pública** (GitHub Pages + self-host). **Prometheus/Grafana son internos**
(no se exponen a internet). El proxy YA tiene todos los contadores en memoria → que exponga un **resumen JSON
público** derivado de los mismos contadores:

```
GET https://llm-tormenta-solar.cybercirujas.club/stats.json     (CORS *, cache 30s)
{
  "updated": "2026-06-24T22:40:00Z",
  "window": "desde el arranque del pod",        // in-memory, ver caveat §3.6
  "models": [
    { "model":"gemma4-free", "backend":"openrouter",
      "attempts":420, "ok":250, "timeout":90, "http_429":70, "empty":10,
      "ok_rate":0.595, "fail_rate":0.405,
      "p50_ms":3200, "p95_ms":7800,
      "quality":{ "lang_mismatch":12, "broke_character":4, "too_short":8 } },
    { "model":"kimi-free", ... }
  ],
  "champion": "gemma4-free",                      // §4 fórmula de ranking
  "requests": { "total":300, "ai":250, "fallback_line":50, "ratelimited":3 }
}
```

- Es el **mismo dato** que `/metrics`, pero pre-digerido para que una página estática lo pinte sin parsear
  Prometheus ni tener acceso al cluster. Endpoint nuevo en `server.js`, junto a `/metrics` y `/health`.
- **No** expone nada sensible (sin IPs, sin mensajes, sin keys). Sólo agregados por modelo.

### 3.6 Caveat in-memory + fuente de verdad histórica

`/stats.json` sale de contadores **en memoria del pod**: se reinicia con el pod y es **por réplica** (hoy
`replicaCount: 1`, así que ok). Implica:
- Es un **snapshot vivo** ("cómo viene andando ahora"), no historia.
- La **historia** (días/semanas, rate() real multi-réplica) vive en **Prometheus/Grafana** (la fuente de
  verdad). La página lo aclara y linkea al dashboard `tormenta-linyera` para quien tenga acceso interno.
- Si en el futuro hay varias réplicas y se quiere un `/stats.json` global y con historia: un mini-sidecar que
  consulta la `query API` de Prometheus y publica el JSON. Documentado como evolución; **no** para el MVP.

## 4. Fórmula de "campeón" (qué modelo recomendar)

Score por modelo (0-1, más alto mejor), para ordenar la tabla y marcar el ganador:

```
score = 0.50 * ok_rate
      + 0.25 * (1 - clamp(p95_ms / 8000, 0, 1))         // rápido suma; ≥8s no suma
      + 0.25 * (1 - quality_issue_rate)                  // (lang_mismatch+broke_character+too_short)/ok
```

- Pesos TBD, ajustables. Idea: **fallar poco** pesa más, pero un modelo rápido que rompe personaje/idioma cae.
- Mínimo de muestras (p.ej. `attempts ≥ 30`) para entrar al ranking (evita "campeón" por suerte de 2 requests).
- (Fase 2) si está el LLM-judge, su `score` entra a la fórmula y manda en la dimensión calidad.

**Uso humano primero:** la página muestra el ranking y el dev decide la cadena (`AI_MODEL` del proxy). **Fase 3
(auto-pilot, fuera de alcance):** el proxy re-ordena solo su cadena `MODELS` según el score cada X min.

## 5. La página `/llm-metrics`

- Archivos nuevos: `info/llm-metrics.html` (ES) + `info/llm-metrics.en.html` (EN), misma estética
  (`info.css`), en la `nav` junto a Info/Tech. (Servida por GitHub Pages **y** por el self-host nginx.)
- Hace `fetch('https://llm-tormenta-solar.cybercirujas.club/stats.json')` y pinta, **sin frameworks** (vanilla,
  como el resto):
  - **Tabla por modelo:** usos, **% éxito**, **% timeout**, **% 429 (saturación OpenRouter)**, **% error**,
    p50/p95 latencia, issues de calidad. Barras de color (verde/amarillo/rojo) por tasa de fallo.
  - **Campeón actual** destacado arriba ("ahora mismo, el que mejor anda para el linyera es …").
  - **Mini-explicación** honesta: "estos `:free` saturan; por eso el juego encadena varios y, si todos fallan,
    el linyera tira una línea temática" → conecta con `latencia-chat.md` y el upsell de `suscripcion.md`.
  - Estado del snapshot (`updated`, "desde el arranque del pod") + link a Grafana para la historia (interno).
  - **Auto-refresh** cada 30s.
- Degradación: si `/stats.json` no responde (proxy caído), muestra "sin datos ahora" sin romper.

## 6. Requisitos funcionales

- **RF-1** `ask()` emite `tormenta_ai_model_attempts_total{model,backend,result}` por cada intento (ok/timeout/
  http_429/http_other/empty). La tasa de fallo por modelo es calculable.
- **RF-2** Heurísticas de calidad → `tormenta_ai_quality_total{model,issue}` (too_short/refusal/lang_mismatch/
  repetition/broke_character), sin PII.
- **RF-3** (opcional) CronJob LLM-judge → `tormenta_ai_model_score{model,dim}`.
- **RF-4** (opcional) 👍/👎 → `tormenta_ai_feedback_total{model,vote}`.
- **RF-5** Endpoint `GET /stats.json` (CORS *, derivado de los contadores en memoria, sin datos sensibles).
- **RF-6** Página `info/llm-metrics.html` (+ EN) que pinta `/stats.json`: tabla por modelo con % de fallo,
  campeón, auto-refresh, link a Grafana, degradación si no hay datos.
- **RF-7** El dashboard Grafana `tormenta-linyera` suma 1 panel "attempts por modelo/result" y 1 "% fallo por
  modelo" (la historia que la página no tiene).

## 7. Criterios de aceptación

- Pegándole a `/stats.json` se ve, por modelo, intentos/ok/timeout/429 y p95, y un `champion` coherente con la
  fórmula.
- Tras forzar timeouts de un modelo, su `fail_rate` sube en `/stats.json` y en el panel de Grafana, y el
  `champion` cambia si corresponde.
- La página `/llm-metrics` carga el JSON, muestra la tabla y el campeón, refresca sola, y no rompe si el proxy
  no contesta.
- `e2e.js` / `web-smoke.mjs` cargan la página sin errores de consola (con un `/stats.json` mockeado).

## 8. Privacidad / cardinalidad

- Labels sólo de conjuntos finitos: `model` (≤ ~10), `backend` (3), `result` (5), `issue` (5), `vote` (2).
  **Nunca** mensaje del jugador, IP, ni id como label. `/stats.json` sólo agregados.

## 9. Fases

1. **F1** RF-1 (attempts por modelo) + RF-5 (`/stats.json`) en `server.js` → sube tag proxy. **Base mínima.**
2. **F2** RF-6 página `/llm-metrics.html` (+ EN) + RF-7 paneles Grafana.
3. **F3** RF-2 heurísticas de calidad → enriquecen tabla y fórmula.
4. **F4** RF-8/RF-9 — **benchmark CronJob cada 4h** (free + pagos) con **costo** + `POST /bench` → proxy
   expone `tormenta_ai_bench_*` y los fusiona en `/stats.json`; la página muestra free vs pago y US$ (RF-11).
   (Incluye el LLM-judge RF-3 como dimensión de calidad del bench.)
5. **F5** RF-10 — **auto-pilot**: política de ruteo dinámica en el proxy (con histéresis, piso fijo, override,
   sólo-free por defecto) → el juego se re-rutea solo cuando un modelo se degrada. Cadena activa observable.
6. **F6** (opcional) RF-4 feedback 👍/👎 del jugador como desempate.

## 11. Benchmark activo cada 4h (costo + modelos pagos)

La medición pasiva (§2-§5) sólo ve los modelos **que el juego usa** y sólo cuando hay jugadores. Para saber
**cuál conviene** (incluyendo pagos, que el tier free nunca toca) y a **qué costo**, un **CronJob** que prueba
de forma activa una batería fija contra una lista de candidatos. Hay **crédito en OpenRouter** → podemos probar
pagos seguido sin drama.

### 11.1 Qué corre

- **CronJob** `tormenta-llm-bench`, schedule `0 */4 * * *` (cada 4h = 6 corridas/día), ns `ai`.
- Script Node chico (imagen `node:alpine` o la del proxy) con:
  - **Batería fija** de ~6-8 prompts en **ES y EN**, incluyendo un caso **multi-turno** (para medir uso de
    memoria/contexto, como en `pruebas-modelos.md`). Versionada en un ConfigMap.
  - **Candidatos** = dos grupos:
    - *free* a vigilar: `gemma4-free, kimi-free, deepseek-free, gemini-free, gpt-oss-free, llama70b-free,
      qwen36-free, r1-free` (lista TBD; los que existen en LiteLLM).
    - *pagos* a comparar: `gemini-flash, cheap, deepseek-pro, qwen-pro, gpt-4o, claude-sonnet` (TBD). Estos
      **no** entran a producción del tier free; se miden para el ranking y para `suscripcion.md` (qué modelo
      pago vale la pena).
  - Pega vía **LiteLLM** (`http://litellm-proxy:4000/v1`, key `sk-…`) → así el costo lo calcula
    LiteLLM y reusa el pool de keys.

### 11.2 Qué mide por candidato

- **Disponibilidad / fallo**: ok / 429 / timeout / error / empty (igual que §3.1 pero activo y parejo).
- **Latencia**: p50/p95 sobre la batería.
- **Costo**: LiteLLM devuelve el costo por request (header `x-litellm-response-cost` y/o `usage` × precio).
  → `costo por respuesta` y `costo por 1k tokens` por modelo. Los `:free` dan ~0; los pagos, su número real.
  **Esto es lo que te dice "este pago cuesta US$X por charla y es N% mejor".**
- **Calidad (LLM-judge)**: un modelo barato/pago (p.ej. `gemini-flash`) puntúa cada respuesta 0-1 en
  coherencia / en-personaje / idioma correcto / uso del contexto. Con crédito, el judge es viable.

### 11.3 Cómo llegan esas métricas a Prometheus (vía elegida + Pushgateway)

Un CronJob es **efímero** (no se puede scrapear) y el cluster **no tiene Pushgateway**. Dos caminos:

**(A) `POST /bench` al proxy — RECOMENDADO para este caso, cero infra nueva.** El CronJob postea el snapshot al
proxy (token `BENCH_TOKEN`); el proxy lo guarda en memoria y lo expone en:
- `/metrics`: `tormenta_ai_bench_ok_ratio{model,tier}`, `tormenta_ai_bench_latency_seconds{model,tier}`,
  `tormenta_ai_bench_cost_usd{model,tier}`, `tormenta_ai_bench_score{model,dim}` → lo scrapea el ServiceMonitor
  que **YA existe**.
- `/stats.json`: se fusiona con la vista pasiva → la página muestra **free vs pago, costo y score** juntos.

Por qué A gana acá: **la página pública necesita un JSON público igual** (`/stats.json`), y el proxy es el
único servicio público que lo sirve. Así que el dato tiene que pasar por el proxy **sí o sí**. Con A, una sola
ruta alimenta página + Prometheus. Con Pushgateway harían falta **dos** rutas (push al gateway para Grafana +
algo que lea Prometheus y republique el JSON público) → más piezas para el mismo fin.

**(B) Pushgateway (rol nuevo en `infra-ai`).** Vale la pena **si se lo quiere general** para otros jobs batch
del cluster (billing, agentes, etc.), no sólo este bench. En `infra-ai/infra` el patrón es claro: un rol
`install-prometheus-pushgateway` calcando `install-kube-prometheus-stack` (Helm
`prometheus-community/prometheus-pushgateway`, repo ya agregado, ns `monitoring`, + un ServiceMonitor o el
`scrape_configs` honor-labels). El CronJob pushea ahí; **igual** hace falta el bridge a `/stats.json` para la
página. → Es complementario, no reemplaza A.

**Decisión:** arrancar con **(A)**; agregar el rol de Pushgateway en `infra-ai` sólo si aparecen más jobs batch
que lo necesiten (entonces este bench también puede pushear ahí además de al proxy). Loki (`loki-gateway` en
`monitoring`) queda como destino opcional del **detalle crudo por corrida** (filas JSON) si se quiere historia
fina.

### 11.4 Topes de gasto (guardrails)

- `max_tokens` chico en la batería; lista de candidatos acotada; **6 corridas/día**. Estimado: centavos/día.
- Tope duro `BENCH_BUDGET_USD` por corrida: si el costo acumulado lo supera, **saltea los pagos restantes** y
  loguea. Nunca una corrida puede dispararse de precio.
- El judge corre una sola vez por respuesta y con `max_tokens` mínimo (sólo el puntaje).

## 12. Re-ruteo automático cuando un modelo se degrada (auto-pilot)

Idea del usuario: **si el bench (o la métrica viva) detecta que un modelo anda mal, que el juego cambie su
propia ruta solo.** Sí, es diseñable como lazo cerrado. Dos señales alimentan una **política de ruteo**:

- **Métrica viva** (§3.1, continua): reacciona **rápido** a una caída (un modelo empieza a dar 429/timeout
  ahora) → lo saca de la cadena al toque.
- **Bench 4h** (§11): reordena **despacio** por calidad+costo (qué free conviene primero).

### 12.1 Dónde se aplica la ruta

- **Servidor (lo principal):** el proxy deja de leer una cadena **estática** (`AI_MODEL`) y arma su `MODELS`
  **dinámicamente** desde la política: mejor free primero, saca los que pasan el umbral de fallo. Sin redeploy,
  sin tocar nada — **el juego se re-rutea solo**. La política se recalcula tras cada bench y cada N minutos con
  la métrica viva.
- **Cliente (BYOK):** `js/ai.js` puede pedir `/stats.json` y reordenar su lista local de fallback igual.

### 12.2 Seguridad (sin esto, no se prende)

- **Piso fijo:** siempre queda una cadena **hardcodeada** de respaldo; la auto-ruta **nunca** puede vaciar la
  lista ni dejar al linyera sin modelo.
- **Histéresis / cooldown:** un modelo se saca sólo si está mal **varias ventanas seguidas**; se re-admite sólo
  tras recuperarse. Evita el "flapping".
- **Límites (costo):** por defecto la auto-ruta sólo reordena **dentro del set free**. Los **pagos NO se
  auto-activan** para usuarios free (gasto) — el bench los mide y reporta, pero habilitarlos es decisión humana
  / del tier pago (`suscripcion.md`). Un usuario pago sí puede rutearse a su modelo premium, pero eso lo decide
  el entitlement, no el auto-pilot.
- **Override manual:** poder **pinear** un modelo o **apagar** la auto-ruta (env / flag). El humano siempre
  puede mandar.
- **Presupuesto de latencia:** la cadena activa respeta el tope de §latencia (≤2 intentos en 8s) — no encadena
  10 modelos.
- **Observabilidad:** exponer la cadena activa (`tormenta_ai_active_chain` / en `/stats.json`) para **ver qué
  eligió** y por qué. La página `/llm-metrics` muestra "ruta activa ahora".

### 12.3 RF añadidos

- **RF-8** CronJob `tormenta-llm-bench` (cada 4h) prueba free+pagos, mide fallo/latencia/**costo**/calidad y
  hace `POST /bench` al proxy. Con tope `BENCH_BUDGET_USD`.
- **RF-9** Proxy expone `tormenta_ai_bench_*` (incl. `_cost_usd`) en `/metrics` y los fusiona en `/stats.json`.
- **RF-10** Política de ruteo dinámica en el proxy (mejor free primero, saca degradados con histéresis, piso
  fijo, override, sólo-free por defecto) → cadena activa observable.
- **RF-11** La página muestra **costo por modelo** (free=0, pagos su US$) y la **ruta activa**.

## 10. Preguntas abiertas

- Pesos de la fórmula §4 y umbral mínimo de muestras (¿30? ¿100?).
- ¿La página `/llm-metrics` es pública sin restricción (es sólo agregados, parece ok) o detrás de algo?
- Lista de **candidatos** `:free` a vigilar (hoy la cadena es `gemma4-free,kimi-free`; ¿agregamos 1-2 más
  sólo-para-medir aunque no entren a producción?). Esto define cuánto "explora" el monitoreo.
- ¿Vale el costo del LLM-judge (F4) o alcanza heurísticas + 👍/👎?
- **Métricas del bench batch:** ¿`POST /bench` al proxy (cero infra, elegido) o desplegar un **Pushgateway**
  en `infra-ai`? (El usuario ofrece agregarlo allá; si va Pushgateway, el CronJob pushea ahí y el proxy se
  libera de guardar estado del bench. Ver §11.3.)
- Lista final de candidatos free y pagos a vigilar + `BENCH_BUDGET_USD` por corrida.
- Pesos de la fórmula §4 y umbral mínimo de muestras.
- Histéresis del auto-pilot: ¿cuántas ventanas malas para sacar un modelo y cuántas buenas para re-admitirlo?
