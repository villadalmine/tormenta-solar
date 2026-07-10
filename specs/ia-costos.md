# SDD — IA/COSTOS: salud cada 6h + scout diario de modelos (costo-beneficio por PATRÓN de uso)

- **Estado:** Implemented (infra-68, proxy 0.2.0)
- **La idea (dueño, 2026-07-10):** *"es mejor tener un cron cada 6 horas para ver cómo va por si hay que corregir
  algo, y uno diario para analizar potenciales modelos buenos — algo que sea como aprender qué modelos están bien
  y son baratos pero con los estándares para que cada NPC / cartel vivo / chat / lo que se genera estático, todo el
  flujo funcione, cine, etc. Tenés que definir un patrón de qué es bueno para cada uno para hacer el costo-beneficio."*
- **Reglas duras que respeta:** la config de LiteLLM es **dominio del dueño** (el scout RECOMIENDA, nunca cambia el
  ruteo solo); no se tocan keys/secrets; los cambios de cadena van por `values-prod.yaml` + deploy (auditables).

## 1. LOS PATRONES — qué es "bueno" para cada consumidor de IA (la tabla del costo-beneficio)

Cada uso de IA del ecosistema cae en UNO de estos tres patrones. Un modelo se evalúa POR PATRÓN (un modelo puede
ser excelente para `banco` y malo para `chat`).

| Patrón | Quién lo usa | Estándar de calidad (APRUEBA si…) | Cómo pesa el costo |
|---|---|---|---|
| **`chat`** — tiempo real, en personaje | `/chat` (NPCs/oráculos: linyeras, French/Beruti, Doña Rosa, el cura, el maquinista, la estudiante, el Tano…) | Con prompt real (~persona+grounding ≈2.5k tok, `max_tokens=150`): **p95 ≤ 8s** (calibrado: claude-sonnet real 5-7s; el cliente aguanta 11s), responde **3/3**, **respeta max_tokens** (≤180 tok), contesta **en castellano** (heurística: voseo/es-palabras), **sin CoT leak** (no `<think>`/razonamiento visible) | **Confiabilidad > precio.** El jugador espera 11s como mucho. Objetivo: blended < $4/M tok. Un modelo barato que cuelga = carísimo (quema el budget y da fallback) |
| **`gen`** — JSON estructurado, batch/casi-real-time | `/nivel-ai` (niveles, tiendas, historias del vecino, `/mundo-ai`) | Con el prompt de nivel: devuelve **JSON parseable** con los campos pedidos, **2/2**, en **≤ 14s** | Precio bajo importa (pero corre pocas veces/día + cachea). Objetivo: < $2/M |
| **`banco`** — texto corto batch (cron, latencia irrelevante) | crons: carteles, propaganda, noticias/**cine**, chusmerío, pool del linyera, historias | 1-3 frases **con humor rioplatense** (es-castellano), sin CoT leak, longitud sana (10-400 chars), **2/2**, ≤ 20s | **EL MÁS BARATO que apruebe.** Corre en batch de madrugada; si tarda 20s no importa. Objetivo: free o < $0.5/M |

**Score costo-beneficio** (por modelo × patrón): `APRUEBA (pasa todos los estándares) → score = 100 − precio_blended
− p95_seg×2` (más barato y más rápido = mejor); NO aprueba → descalificado para ese patrón. `precio_blended` =
(in + 3×out)/4 por 1M tokens, de OR_PRICES (cron `precios` ya lo trae del catálogo de OpenRouter).

## 2. CRON CADA 6h — `ia-health` (¿cómo venimos? ¿hay que corregir?)

`ai-proxy/gen-ia-health.mjs` (CronWorkflow `-ia-health`, `30 */6 * * *` — corrido 30' del cron de precios):
1. Lee **`GET /metrics`** del propio proxy: `chat_total{outcome}`, `fallback_lines`, `paid_budget`, `okrate{model}`,
   `sub_codes`, timeouts.
2. Calcula el **delta vs el snapshot anterior** (viene en el último reporte guardado): chats totales, % fallback,
   % timeout, respuestas pagas consumidas del budget, y **gasto estimado** (pagas × precio del modelo activo).
3. **Veredicto**: `ok` / `warn` (fallback ≥ 20% o budget ≥ 80%) / `critical` (fallback ≥ 50% o budget agotado).
4. POSTea el reporte a **`POST /ia-report`** (GEN_TOKEN) → PVC `/data/ia-reports.json` (últimos 60) y el proxy
   expone los valores como **gauges Prometheus** (`tormenta_ia_health_*`) → las **PrometheusRule** existentes rutean
   `warning|critical` → **Telegram** (receiver `telegram-openclaw`). El dueño no mira nada: si algo anda mal, le llega.
5. Lectura humana: **`GET /ia-reports`** (público, sin secretos) — el historial de salud + scouts.

## 3. CRON DIARIO — `ia-scout` (aprender qué modelos están bien y baratos)

`ai-proxy/gen-ia-scout.mjs` (CronWorkflow `-ia-scout`, `15 6 * * *` — 6:15 AM, tras los crons de contenido):
1. **`GET {LiteLLM}/v1/models`** → los model_names REALES del pool del dueño (no adivina).
2. **MINI-BENCH por patrón** sobre cada candidato (excluye `local-gpu`/`rk1-*` = GPU/NPU apagables): prompts
   ESTÁNDAR fijos por patrón (§1) — chat: 3 mensajes de persona con grounding; gen: 2 pedidos de JSON con schema;
   banco: 2 pedidos de cartel/noticia. Mide latencia, validez, max_tokens-compliance, es-castellano, CoT leak.
3. Cruza con **OR_PRICES** (del cron `precios`) → **score costo-beneficio por patrón** (§1) → ranking.
4. **Candidatos NUEVOS**: barre el catálogo OR (OR_NEWS/prices) buscando modelos baratos (<$1/M) con contexto ≥32k
   que NO están en LiteLLM → lista "PARA AGREGAR (dominio del dueño)".
5. Reporte → `POST /ia-report {kind:'scout'}` → mismo store + `GET /ia-reports`. Incluye **recomendación** explícita
   por patrón ("chat: claude-sonnet sigue #1; cheap aprobó gen y banco; kimi-free volvió a andar → candidato a
   reponer en la cadena") — pero **NO cambia nada solo**: los cambios van por values-prod.yaml + deploy.
6. **Presupuesto del bench:** ~10 modelos × 7 prompts × ~500 tok ≈ 35k tok/día ≈ **centavos** (y los free, $0).

## 4. Implementación
- `ai-proxy/gen-ia-health.mjs` + `ai-proxy/gen-ia-scout.mjs` (Node puro, sin deps — patrón gen-*.mjs).
- `ai-proxy/server.js`: `POST /ia-report` (GEN_TOKEN, guarda en PVC + actualiza gauges) · `GET /ia-reports`
  (público) · gauges `tormenta_ia_health_fallback_pct / timeout_pct / paid_used / est_cost_usd / verdict` en /metrics.
- `ai-proxy/chart/templates/cronworkflow-ia-health.yaml` + `cronworkflow-ia-scout.yaml` (patrón `-precios`:
  imagen del proxy, SA del pool, GEN_TOKEN, retries, GC).
- Alertas: PrometheusRule `ai-proxy/chart/templates/prometheusrule-ia.yaml` (labels `release: kube-prometheus-stack`):
  `TormentaIAFallbackAlto` (warning, fallback_pct ≥ 20 por 15m) · `TormentaIAFallbackCritico` (critical, ≥ 50) ·
  `TormentaIABudgetAgotandose` (warning, paid_used ≥ 80% del cap). Rutea al Telegram existente.

## 6. AUTOTUNE REACTIVO (infra-69, proxy 0.2.4) — "si detecta algo, lo prueba punta a punta y cambia"
Pedido del dueño (2026-07-10): *"¿puede ser reactivo? si detecta algo, lo prueba punta a punta, si anda y responde,
con un Argo Workflow cambia."* SÍ — el workflow diario ahora es **scout → tune** (2 pasos):

1. **`gen-ia-tune.mjs`** (2º paso): si el scout encontró un modelo mejor para `chat`, exige que haya APROBADO los
   últimos **TUNE_CONSECUTIVE=2 scouts** (una corrida buena no alcanza — gemma4-paid un día voló y al otro colgó).
2. **CANARY** directo AHORA (3 prompts reales contra LiteLLM) — el scout fue a la mañana, esto re-verifica al momento.
3. **Aplica** el override runtime: `POST /ia-chain {chat:[...], reason}` (GEN_TOKEN) → PVC. `activeChain()` lo usa;
   el env `AI_MODEL` queda como **baseline intocable** (reset vuelve ahí). La cadena deseada SIEMPRE lleva el titular
   confiable de respaldo (`TUNE_BASELINE=claude-sonnet`).
4. **Verificación PUNTA A PUNTA**: 4 requests al **`POST /chat` real del proxy** → ≥3/4 sin fallback ⇒ queda; si no ⇒
   **ROLLBACK automático** a la cadena anterior. Reporte `{kind:'tune', action: applied|rollback|noop|skip}` en /ia-reports.
5. **Guardián de 6h**: si `ia-health` da **critical** con un override activo → **auto-reset al baseline** env.
6. **Aviso**: gauge `tormenta_ia_tune_last_change_ts` + alerta `TormentaIACadenaCambiada` (Telegram, informativa 1h).
7. **MULTI-PATRÓN (infra-70):** el tune cubre LOS TRES consumidores — `chat` (canary + aplica + verificación punta a
   punta por el /chat real + rollback), `gen` (canary JSON fresco + aplica; el server usa `IA_CHAIN.gen` para
   /nivel-ai y /mundo-ai) y `banco` (elige **EL MÁS BARATO** que aprueba consistente + canary cartel + aplica;
   **los crons** — carteles, propaganda, CINE/noticias, chusmerío, pool, historias — consultan `GET /ia-chain →
   effectiveBanco` al arrancar, ADITIVO: sin respuesta usan su env de siempre; gen-noticias solo si SUM_MODEL ya
   estaba activado). POST /ia-chain acepta cualquier subconjunto {chat,gen,banco} y conserva lo no enviado.
8. **Página pública** `info/ia.html` (GitHub Pages + self-host): los reportes **agrupados POR DÍA** (health con
   veredicto/fallback/gasto, scouts con ranking por patrón, tunes con acción y cadenas) + las cadenas efectivas AHORA
   con el motivo del override. Lee /ia-reports y /ia-chain en vivo (CORS ya abierto). Link "🤖 IA" en el nav de info.
9. **Límites duros**: solo la cadena ANÓNIMA (el premium SUB_* NO se autotunea); solo modelos ya en LiteLLM;
   `AUTOTUNE=0` (values `autotune`) lo apaga entero; auditable en `GET /ia-chain` (env/override/effective + motivo).
   Validado punta a punta en local (server real + mock: detecta→canary 3/3→aplica→verifica 4/4→applied; y noop/skip/rollback).

## 5. Deuda / siguientes
- El scout podría auto-PROBAR candidatos nuevos de OpenRouter con una key efímera de la provisioning key (hoy solo
  los reporta). — decisión del dueño.
- ~~Cerrar el loop~~ ✅ HECHO (§6, infra-69): autotune reactivo con canary + verificación punta a punta + rollback.
- Sumar calidad "en personaje" con un LLM-judge barato (hoy heurísticas: es-castellano, longitud, no-CoT).
- Matching de precios model_name→id de OpenRouter: hoy es por nombre aproximado y suele dar "$?/M" (p.ej. claude-sonnet→anthropic/claude-sonnet-4.5 no matchea). Un mapa explícito en env lo arregla.
