# SDD — Monitoreo de modelos free + página pública `/llm-metrics`

- **Estado:** Draft
- **Última actualización:** 2026-06-24
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
4. **F4** (opcional) RF-3 LLM-judge (CronJob) y/o RF-4 feedback 👍/👎.
5. **F5** (futuro) auto-pilot: el proxy re-ordena su cadena por score.

## 10. Preguntas abiertas

- Pesos de la fórmula §4 y umbral mínimo de muestras (¿30? ¿100?).
- ¿La página `/llm-metrics` es pública sin restricción (es sólo agregados, parece ok) o detrás de algo?
- Lista de **candidatos** `:free` a vigilar (hoy la cadena es `gemma4-free,kimi-free`; ¿agregamos 1-2 más
  sólo-para-medir aunque no entren a producción?). Esto define cuánto "explora" el monitoreo.
- ¿Vale el costo del LLM-judge (F4) o alcanza heurísticas + 👍/👎?
