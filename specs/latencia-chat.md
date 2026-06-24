# SDD — Latencia del chat del linyera: tope de 10s + flujo de espera + métricas

- **Estado:** **Implementado (cliente v=93) + proxy (rebuild pendiente)**
- **Última actualización:** 2026-06-24
- **Regla dura:** el linyera **no puede tardar más de 10s** en dar una respuesta. Si el modelo no contesta a
  tiempo, se sirve una **línea temática** ("la tormenta solar saturó el modelo") y el juego sigue fluido.

## 1. Problema detectado (con métricas en vivo)

`gemma4-free` (free de OpenRouter vía LiteLLM) se **satura** en horas pico: medido **20.6s y 51.6s** por
respuesta. Causas:
- `gemma4-free` **no tiene fallback** en LiteLLM → cuando se satura, no hay escape: espera hasta
  `request_timeout: 120s`.
- El **cliente esperaba 35s** (`PROXY_TIMEOUT`) → el jugador quedaba colgado.

## 2. Flujo de espera (presupuesto ≤10s, capas)

```
Jugador ─POST─► Proxy (Node) ─fetch─► LiteLLM ─► modelo A (gemma4-free)
  │ abort 9s     │ presupuesto TOTAL 8s · 4s POR modelo
  │              ├─ A responde <4s → { reply }                         (camino feliz)
  │              ├─ A tarda >4s → aborta A → prueba modelo B (kimi-free) con los ~4s que quedan
  │              │     ├─ B responde → { reply }
  │              │     └─ B también tarda → { reply: línea temática timeout }  (~8s, no cuelga)
  └─ si el proxy/red no contesta en 9s → línea LOCAL + lastTimedOut ("tormenta saturó")
```

- **Proxy** (`ai-proxy/server.js`): `UPSTREAM_TIMEOUT=8000ms` (presupuesto **TOTAL**, tope duro) +
  `PER_MODEL_TIMEOUT=4000ms` (tope **por modelo**). Recorre la **cadena de modelos** (`AI_MODEL` separado por
  comas): si el 1º no contesta en 4s, **prueba el 2º** con el tiempo restante. Si ninguno → línea temática de
  timeout (200, no cuelga). `max_tokens` 220→**120** (más corto = más rápido; el linyera habla corto).
- **Cliente** (`js/ai.js`): `PROXY_TIMEOUT=9000ms` (era 35000). Red de seguridad por si el proxy/red se pasa.
- **Neto:** se **prueban 2 modelos** dentro del tope; el jugador **siempre** responde en ≤9s.

## 3. El modelo y la cadena (free más rápido degradando poco)

**Cadena recomendada (set en `AI_MODEL`, por comas):** `gemma4-free,kimi-free`.
- **`gemma4-free`** (gemma-4-31b): mejor calidad medida (88/100) pero **latencia variable** (2-7s, hasta 20-51s
  en pico). Va de primero por calidad.
- **`kimi-free`** (moonshot kimi): el **free rápido decente** (~2.5s, 75/100). Va de 2º: si gemma se satura a
  los 4s, kimi suele contestar en el tiempo que queda. *(Descartados: gpt-oss/llama70b/qwen36 = pobres o 429;
  nemotron = filtra reasoning.)*

Para que el linyera conteste **siempre** con IA <10s hace falta algo **fiable** (los free se saturan los dos):
- **GPU local** (`ollama-linyera` qwen2.5:7b, ~5-7s warm) cuando entre la placa (`hami-gpu-plan.md §3.5`).
- **Modelo pago barato y rápido** como primario (latencia <3s estable).
- Mientras tanto: la cadena de 2 free + tope de 8s degrada elegante a la línea temática en pico (no cuelga).

## 4. Métricas en Grafana

### 4.1 Del proxy (nuevo endpoint `/metrics`, prometheus)
`tormenta-ai-proxy` ahora expone en `/metrics`:
- `tormenta_ai_requests_total` — requests de chat.
- `tormenta_ai_timeouts_total` — requests que pasaron el tope de 8s (← el número que importa).
- `tormenta_ai_errors_total` — errores de upstream (no timeout).
- `tormenta_ai_fallback_lines_total` — respuestas servidas con línea local (timeout+error).
- `tormenta_ai_latency_ms_avg` — latencia media (ms) de las respuestas con IA.

Scrape: `ServiceMonitor`/annotation `prometheus.io/scrape` en el Service del proxy (kube-prometheus-stack ya
corre en ns `monitoring`). Paneles:
- **% de timeouts:** `rate(tormenta_ai_timeouts_total[5m]) / rate(tormenta_ai_requests_total[5m])`.
- **Latencia media:** `tormenta_ai_latency_ms_avg` (gauge) — alertar si > 8000.
- **Requests/min:** `rate(tormenta_ai_requests_total[1m]) * 60`.

### 4.2 De LiteLLM (ya existe, por modelo)
- Latencia p50/p95 por modelo: `litellm_request_total_latency_metric_bucket` (histogram_quantile).
- Fallbacks: `litellm_deployment_successful_fallbacks_total` / fallos: `litellm_deployment_failure_responses_total`.
- **Por usuario:** pasar el campo `user` en cada request (el proxy puede mandar un id de sesión) → LiteLLM
  expone métricas por `end_user` (el config ya tiene `disable_end_user_cost_tracking_prometheus_only: false`).

### 4.3 Alertas sugeridas
- timeouts > 20% durante 10m → el modelo está saturado, revisar/cambiar.
- latencia media > 8s → idem.

## 5. Estado / pendientes

- ✅ Cliente `PROXY_TIMEOUT=9s` (v=93, live).
- ⏳ Proxy: `UPSTREAM_TIMEOUT=8s` + `PER_MODEL_TIMEOUT=4s` (cadena de 2) + `/metrics` + línea temática →
  **rebuild imagen (0.1.2) + redeploy** con `--set upstream.model="gemma4-free,kimi-free"`.
- ⏳ Scrape del `/metrics` en Prometheus + panel Grafana (PromQL arriba).
- ⏳ Palanca de modelo fiable (GPU local / pago rápido) para no depender de free saturado.
