# SDD — Métricas reales de uso del chat IA (qué modelo/backend por cada uso)

- **Estado:** **F1+F2+F3 LIVE Y VERIFICADOS** (release `tormenta-ai` rev 9, ns `ai`). `/metrics` etiqueta por
  modelo/backend/outcome (F1); ServiceMonitor (F2) y dashboard Grafana como ConfigMap (F3) desplegados y
  funcionando: Prometheus scrapea el target (`up`), `tormenta_ai_chat_total{model,backend,outcome}` consultable,
  y el sidecar de Grafana importó `tormenta-linyera.json`. Ambos opt-in
  (`metrics.serviceMonitor.enabled` / `metrics.grafanaDashboard.enabled`).
- **GOTCHA `--reuse-values`:** ese flag **ignora los defaults nuevos del chart**, así que el ServiceMonitor
  quedó sin la label `release: kube-prometheus-stack` (la que usa el Prometheus del cluster como selector) y no
  se scrapeaba. Fix: pasar la label explícita →
  `--set metrics.serviceMonitor.labels.release=kube-prometheus-stack`. Un `helm upgrade` SIN `--reuse-values`
  (tomando el values.yaml del chart) ya la trae bien.
- **Última actualización:** 2026-06-24
- **Patrón base:** se calca el de `online-game` (`app/core/metrics.py` + ServiceMonitor + dashboard Grafana
  como ConfigMap, incluso tienen un `llm-usage.json`). Relacionado: `latencia-chat.md`, `suscripcion.md`.

## 1. Objetivo

Saber, **cada vez que alguien usa el chat**: qué **modelo** contestó, por qué **backend** (OpenRouter / GPU /
NPU), la **latencia**, y el **resultado** (IA / timeout / fallback / error). Hoy NO se guarda eso (solo
totales). Esto lo agrega, con **bajo costo** y **sin PII**.

## 2. Estado actual

`tormenta-ai-proxy` ya expone `/metrics` (prometheus) con: `tormenta_ai_requests_total`, `*_timeouts_total`,
`*_errors_total`, `*_fallback_lines_total`, `*_latency_ms_avg`. **Pero todo agregado, sin saber el modelo ni
el backend.** LiteLLM también expone métricas por deployment (eso sí sabe OpenRouter vs Ollama). Falta cruzar
y, sobre todo, **etiquetar por modelo/backend en el proxy**.

## 3. Patrón (de online-game, a calcar)

- **Prometheus in-process, sin dependencias** (Counter/Gauge/Histogram + `render()`), como `core/metrics.py`.
- **Labels ACOTADOS**: nunca ids/emails/mensajes del jugador (cardinalidad + privacidad). Solo conjuntos
  finitos (modelo, backend, outcome, persona).
- **Multi-réplica**: cada pod expone lo suyo, Prometheus suma con `rate()`.
- **ServiceMonitor** (Prometheus Operator) scrapea el `/metrics` del Service in-cluster.
- **Dashboard Grafana** como **ConfigMap** con label `grafana_dashboard: "1"` → el sidecar lo auto-importa.
- **PrometheusRule** para alertas.

## 4. Métricas a agregar en el proxy (con labels)

```
# cada uso del chat, etiquetado por modelo + backend + resultado
tormenta_ai_chat_total{model="gemma4-free", backend="openrouter", outcome="ai"}      counter
  # outcome ∈ ai | timeout | fallback | error | ratelimited
# latencia (histograma) por modelo/backend → p50/p95
tormenta_ai_chat_latency_seconds_bucket{model, backend, le="..."}                    histogram
# (cuando exista la sub) tier del usuario
tormenta_ai_chat_total{..., tier="free|paid|byok"}
```

- **El proxy sabe qué `model_name` ganó la cadena** (`gemma4-free` o `kimi-free`, el del loop en `ask()`) →
  lo pone en `model`.
- **`backend` se deriva del model_name** con un mapa fijo: `gemma4-free|kimi-free|…:free → openrouter`,
  `linyera|local-gpu|gemma2:* → gpu`, `rk1-npu-local → npu`, `tormenta-paid → openrouter(paid)`. Así, mirando
  el panel, sabés al toque si se usó **OpenRouter o tu GPU** y **qué modelo**.
- **`outcome`**: `ai` (contestó el modelo), `timeout` (cortó el tope, fue a línea), `fallback`/`error`,
  `ratelimited` (429 por IP). Es el "¿está degradando?".
- **`persona`** (opcional, baja card.: filosofo/poeta/pechito/cuevero/tahur) si querés ver con qué linyera
  charlan más.

## 5. Dos capas (se complementan)

1. **Proxy** (`tormenta_ai_chat_*`): vista del JUEGO — qué model_name, outcome, latencia percibida, por persona/tier.
2. **LiteLLM** (`litellm_*`): vista de INFRA — qué deployment/proveedor real respondió, spend (US$), fallbacks,
   latencia por modelo. (Ya existe; sirve para confirmar OpenRouter vs Ollama y el costo.)

El `model_name` del proxy ya implica el backend, así que para "openrouter vs gpu" alcanza el proxy; LiteLLM
agrega el costo y el detalle de deployment.

## 6. (Opcional) Evento por uso → Loki

Si se quiere análisis fino "por cada chat" (no solo agregados), loguear una línea JSON por request a stdout
(→ Loki/Promtail si está): `{"ts","persona","model","backend","outcome","latency_ms","tier"}`. **Sin** el
mensaje del jugador ni ids. Permite consultas tipo "qué modelos se usaron ayer y con qué latencia".

## 7. Infra (mismo patrón online-game)

- **`ai-proxy/chart`**: agregar `templates/servicemonitor.yaml` (opt-in `metrics.serviceMonitor.enabled`) que
  scrapea el Service `:80/metrics`; label para que lo tome el Prometheus de `monitoring`.
- **Dashboard** `dashboards/tormenta-linyera.json` provisto como ConfigMap (`grafana_dashboard: "1"`). Paneles:
  - Usos por **modelo** (`sum by (model) (rate(tormenta_ai_chat_total[5m]))`).
  - **% por backend** openrouter/gpu/npu (`sum by (backend) (...)`).
  - **Outcome** (ai vs timeout vs fallback) apilado.
  - **Latencia p50/p95 por modelo** (`histogram_quantile(0.95, sum by (le,model) (rate(..._bucket[5m])))`).
  - **% timeouts** y **requests/min**.
  - (con sub) uso y latencia **por tier**.
- **PrometheusRule**: timeouts > 20% (10m) / p95 > 8s → alerta "modelo saturado".

## 8. Privacidad / cardinalidad

- Labels solo de conjuntos finitos (≤ ~10 modelos, 5 personas, 5 outcomes, 3 tiers). **Nunca** mensaje, IP
  como label, ni id de jugador. Rate-limit ya es por IP en memoria (no se expone como métrica con label IP).

## 9. Implementación por fases

1. **F1 — proxy**: ✅ HECHO (img 0.1.3, rev 7). `tormenta_ai_chat_total{model,backend,outcome}` +
   `tormenta_ai_chat_latency_seconds` (histograma por model/backend); `ask()` devuelve el modelo ganador; mapa
   `backendOf()` (→ openrouter/gpu/npu/openrouter-paid); `ratelimited` contado. Verificado en vivo.
2. **F2 — ServiceMonitor** en `ai-proxy/chart` (`templates/servicemonitor.yaml`, opt-in
   `metrics.serviceMonitor.enabled`): selecciona el Service por selectorLabels, label de metadata
   `release: kube-prometheus-stack` para que lo tome el Prometheus del cluster, endpoint port `http`
   path `/metrics`. ✅ HECHO (helm lint/template OK). Falta `helm upgrade --set ...enabled=true`.
3. **F3 — dashboard** `dashboards/tormenta-linyera.json` servido como ConfigMap
   (`templates/grafana-dashboard.yaml`, opt-in `metrics.grafanaDashboard.enabled`) con label
   `grafana_dashboard: "1"` → el sidecar de Grafana lo auto-importa. 8 paneles (chats/min, % timeouts,
   backend piechart, latencia media, usos por modelo, outcome apilado, p95 por modelo, fallback). ✅ HECHO.
4. **F4 — (opcional)** log JSON por evento → Loki.
5. Cruzar con `litellm_*` para costo/proveedor real.
