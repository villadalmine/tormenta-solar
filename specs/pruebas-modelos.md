# SDD — Pruebas de modelos de inferencia (GPU / NPU / OpenRouter) + `tormenta-free`

- **Estado:** **Draft** (no implementado)
- **Última actualización:** 2026-06-24

## 1. Objetivo

Elegir el mejor modelo para el chat de los linyeras según **calidad / latencia / costo**, probando los
destinos que ya existen en el LiteLLM, y dejar declarada la **cadena exacta** que usa el código del juego.

## 2. Estado actual

- El proxy usa hoy `upstream.model=gemma4-free` (= `openrouter/google/gemma-4-31b-it:free`): sale limpio,
  en personaje, $0. **Funciona bien** como default.
- `default` (nemotron) se descartó: es de *reasoning* y **filtra el pensamiento** en la respuesta.
- El código del juego (`js/ai.js`) usa: `google/gemma-4-26b-a4b-it:free` → `meta-llama/llama-3.2-3b:free`
  → `liquid/lfm-2.5-1.2b:free` → `mistralai/mistral-7b:free` (+ prefiere el último que anduvo).

## 2.6 RESULTADOS de la primera tanda (2026-06-24)

Prompt fijo de linyera (Diógenes), `max_tokens` 160, vía LiteLLM y vía los endpoints locales:

| Modelo | Backend | Latencia | Calidad |
|---|---|---|---|
| **gemma4-free** (gemma-4-31b:free) | OpenRouter | **3.7s** | ★★★★ mejor criollo + lore. **Default actual.** |
| **gemma2:2b** | GPU (gpu-llm/ollama, NVIDIA+HAMi) | **2.5s caliente** / 17s frío | ★★★ buen criollo, en personaje. **Mejor self-hosted (punto justo en 4GB).** |
| gemma3:4b | GPU ollama | **65s caliente** / timeout frío | ★★★★ el mejor criollo local, PERO 3.3GB no entra bien en el slice de 4GB → inusable por latencia (necesitaría más GPU) |
| kimi-free | OpenRouter | 3.5s | ★★ español roto |
| llama3.2:3b | GPU ollama | 23s | ★ Spanglish, se va de tema |
| qwen2.5:1.5b | GPU/ai ollama | 40-55s | ★ flojo, lento |
| llama70b-free / qwen36-free | OpenRouter | timeout / **429** | free saturado, poco fiable para prod |
| rk1-npu-local (llama-3.1-8b) | NPU RK1 ×4 | 8s caliente | **salida corrupta** (bug streaming UUID-per-chunk) |
| gemma-3-1b-it | NPU (rkllama, test-gemma) | — | **HTTP 500** |

**Decisión:** seguir con `gemma4-free` (OpenRouter) como default productivo; `gemma2:2b` en la GPU es la
alternativa self-hosted viable (es "el mismo gemma" en ollama). Pendiente para usarla: (a) `keep_alive`
para que no se enfríe (evita los 17s), (b) un `model_name` en LiteLLM apuntando a `gpu-llm/ollama`
(`openai/gemma2:2b` @ `http://ollama.gpu-llm.svc:11434/v1`), aditivo. NPU: arreglar el bug de streaming
(initContainer format_utils.py) y reintentar; gemma en rkllama da 500 (revisar).

Nota infra: hay 2 ollama (`ai/ollama` = qwen2.5:1.5b; `gpu-llm/ollama` en srv-t7910 con GPU = llama3.2:3b
+ qwen2.5:1.5b + **gemma2:2b** que bajé). El slice GPU es chico (4GB / 40 cores HAMi) → entra hasta ~3-4b.

## 2.9 Benchmark con el DUAL OLLAMA real (2026-06-24, 3 prompts c/u)

Setup nuevo del usuario en ns `ai`: `ollama-a` + `ollama-b` en la GPU `srv-t7910` (HAMi, 3GB/40cores c/u),
balanceados bajo `local-gpu` en LiteLLM. La GPU es vieja (Pascal/Maxwell) y **se comparte con otro juego**.

Tabla cualitativa (3 prompts):

| Modelo | Backend | Latencia avg | Calidad |
|---|---|---|---|
| `gemma4-free` | OpenRouter (nube, live) | **2.4s** | ★★★★ criollo clavado, lore |
| `local-gpu` (qwen2.5:1.5b) | GPU dual | **1.7s** ⚡ | ★ genérico, fuera de personaje |
| `gemma2:2b` | GPU (ollama-a) | **5.3s** (sube a 8.9) | ★★ aceptable pero flojo y lento acá |

**Matriz CUANTIFICADA** (4 prompts; score 0-100 = español + slang rioplatense + tema + sin refusal/leak +
largo sano; latencia avg; tasa de éxito ok/4):

| # | Modelo | Backend | Calidad/100 | Lat avg | OK |
|---|---|---|---|---|---|
| 1 | **gemma4-free** | OpenRouter | **88** | 3.2s | 4/4 |
| 2 | kimi-free | OpenRouter | 75 | 2.5s | 1/4 (flaky/429) |
| 3 | **gemma2:2b** | GPU | 70 | 6.6s | 4/4 |
| 4 | local-gpu (qwen1.5b) | GPU | 59 | 5.1s | 4/4 |
| 5 | rk1-npu-local | NPU | 55 | 28.9s | 1/4 |
| 6 | nemotron | OpenRouter | 45 | 2.7s | 4/4 (filtra reasoning) |
| 7 | gpt-oss-free | OpenRouter | 22 | 5.7s | 4/4 (corto/pobre) |
| 8 | llama70b-free / qwen36-free / free | OpenRouter | 0 | — | 0/4 (timeout/429) |

**Confirma todo:** `gemma4-free` gana por amplio margen (calidad + latencia + fiabilidad). El mejor local es
`gemma2:2b` (70) pero a 6.6s; qwen (59) rápido pero flojo; NPU lenta+flaky; el resto de free o filtra
reasoning (nemotron) o es poco fiable (llama70b/qwen36/free 429) o pobre (gpt-oss). **Default: gemma4-free.**

**Conclusión:** la nube (`gemma4-free`) responde **mejor que la GPU actual** para el linyera (calidad + 2.4s).
La GPU vieja+compartida hace que gemma2:2b rinda ~5s (peor que el 2.5s del test aislado). qwen es rápido
pero malo. → **seguir con `gemma4-free`**; la GPU vale solo si se prioriza privacidad/no-cloud o se mete
una placa mejor. Para que la GPU sea usable habría que cambiar `local-gpu` de `qwen2.5:1.5b` a `gemma2:2b`
(`litellm_params.model: openai/gemma2:2b`) — ya bajé el modelo a ollama-a/b. HAMi: hay margen para pedir más
cores/mem, pero la placa es el techo.

## 2.10 GPU/CPU del nodo srv-t7910 (= 192.168.178.90) — matriz cloud vs GPU vs CPU/RAM

Hallazgos midiendo el hardware real (SSH al host):
- **DOS GPUs**: Quadro **M4000 8GB** (1.6 usado → **6.5 libre**) + Tesla **P4 7.7GB** (1.6 usado → **6.0 libre**).
  Los `ollama-a/b` (in-cluster, dual) usan solo ~1.5GB c/u (qwen2.5:1.5b) → **sobran ~12.5GB**: entran modelos
  de **8b** (no estábamos limitados a 4GB; ese era el slice HAMi auto-impuesto).
- **`llama3.1:8b` en la GPU real**: 100% GPU, 6.7GB, **buena calidad** en personaje (criollo). Mucho mejor que
  qwen1.5b / gemma2:2b. → si se quiere GPU, conviene **subir el slice HAMi a ~6GB y correr un 8b** (llama3.1:8b
  o gemma2:9b), no el 1.5b.
- **CPU/RAM**: el host tiene **247GB RAM** y **32 cores** → puede correr modelos enormes en CPU, pero la latencia
  por token en CPU es alta (decenas de segundos para una respuesta de chat) → sirve para calidad offline, no
  para el chat en vivo. (No se midió pura-CPU para no martillar el host; ver nota HAMi.)

**Matriz (resumen):** nube `gemma4-free` = mejor calidad + 2.4s, $0, simple (GANADOR para el chat). GPU con
8b = buena calidad, latencia media en placas viejas, usa tu fierro (privacidad). CPU/RAM = calidad alta con
modelo grande pero latencia mala → no para chat en vivo.

### 2.10.1 Arquitectura revisada (decisión del usuario): GPU solo para online-game; linyera en CPU+RAM

- **Agentes (Holmes/OpenClaw/Hermes) → nube, free CON thinking** (OpenRouter). No usan GPU.
- **GPU (HAMi) → exclusiva del juego online** (el que ya pidió GPU).
- **Linyera (este juego) → CPU+RAM** (desacoplado de GPU y de la nube), con **fallback a `gemma4-free` (nube)**.

**Medición CPU pura** (host, `num_gpu:0`, 100% CPU, 32 cores):
- `llama3.1:8b`: **12.1 tok/s** → ~16s frío / **~7-12s caliente**, buena calidad criollo.
- `gemma2:2b` (4× más chico, estimado): **~3-5s**. → candidato del linyera en CPU.

**Claves:** (1) **más RAM NO acelera** — solo deja entrar modelos más grandes, y en CPU más grande = más
lento (70b en 247GB correría a ~1-2 tok/s, inusable). El lever es cores + modelo chico. (2) **GPU+offload
híbrido descartado**: robaría GPU al juego online. → Linyera = **ollama CPU-only en k8s** (sin request de
GPU, solo cpu/mem limits) con gemma2:2b; nube como fallback.

### 2.10.2 Test de MEMORIA/contexto + idiomas (multi-turno: "me llamo Pocho y odio los drones")

3 turnos por modelo (T1 se presenta, T2 pista, T3 "¿te acordás nombre+lo que odio?"), en ES y EN, mandando
el historial completo (como el juego):

| Modelo | Backend | ES recall | EN recall | Coherencia | Latencia |
|---|---|---|---|---|---|
| **gemma4-free** | nube | ✅ | ✅ | ★★★★ criollo y EN clavados | **2-7s** |
| llama3.1:8b | CPU | ✅ | ✅ | ★★★ bien, recuerda | **13-26s** 🐢 |
| gemma2:2b | CPU | ✅ | ⚠️ ("bots" no "drones") | ★★ suelto, algún error gramatical | 8-14s |

**Conclusión:** los tres usan el contexto, pero **gemma4-free gana en TODO** (memoria perfecta ES+EN,
coherencia, latencia). En CPU el más coherente es `llama3.1:8b` pero a 13-26s (placa/CPU vieja); `gemma2:2b`
es más rápido pero menos coherente y flojea la memoria en EN. → **Linyera sigue en `gemma4-free` (nube).** La
opción CPU queda documentada como fallback/privacidad pero es un downgrade en calidad y latencia.

### ⚠️ Gobernanza GPU / HAMi (importante)
El **ollama del host** (`192.168.178.90`, fuera de k8s) consume VRAM **por fuera de HAMi** → HAMi no lo
contabiliza y puede sobre-suscribir. Ese ollama **está consumido** (Holmes `gpt-5.4` → `:11434`; rutas
`holmes-*`/`local-*` → LiteLLM del host `:4000`) → **NO apagar**. (Para pruebas se puede usar; recordar
`ollama stop <modelo>` al terminar para no dejar VRAM tomada por fuera de HAMi.)

**→ Riesgo de OOM PERMANENTE mientras convivan dos "dueños" de las mismas placas (HAMi + ollama host):**
HAMi sobre-reporta el VRAM libre y puede colocar un pod (ollama-a/b u **otro juego**) en la GPU donde el
host ya cargó su 8b → **CUDA OOM** bajo carga. (M4000 8GB + P4 7.7GB = ~15.7GB total; no alcanza si todo
cae en una placa.) Fixes, de mejor a más rápido:
- **A.** Migrar el ollama de Holmes a **k8s** (con request HAMi) → HAMi contabiliza todo, fin del problema.
- **B.** **Dedicar GPUs** (hay 2): host ollama → P4 (`CUDA_VISIBLE_DEVICES`), HAMi gobierna solo la M4000
  (excluir la P4 en el device-plugin). Cero overlap, sin migrar. **Recomendada.**
- **C.** Reservar headroom en HAMi (reportar N GB menos). Parche.
- **D.** Sacar el host: mover `gpt-5.4`/Holmes al ollama in-cluster o a la nube.

## 2.7 Diseño de rotación (LiteLLM) — PENDIENTE, se itera aparte

Requisito del usuario: **si el server (GPU) se apaga, LiteLLM tiene que rotar solo a otro modelo**. Por eso
el ruteo vive en LiteLLM, no en el juego. Diseño objetivo (a implementar cuando se itere el LiteLLM):

```yaml
# model_name de juego: GPU local primero, OpenRouter como red de seguridad
- model_name: tormenta            # lo que usa el proxy (upstream.model=tormenta)
  litellm_params:
    model: openai/gemma2:2b        # (o el gemma que gane la prueba)
    api_base: http://ollama.gpu-llm.svc.cluster.local:11434/v1
    api_key: dummy
    keep_alive: -1                 # que NO se descargue (evita el cold-start de ~17s)
# fallback declarado: si 'tormenta' (GPU) falla/timeout → gemma4-free (OpenRouter)
litellm_settings:
  fallbacks: [{ "tormenta": ["gemma4-free"] }]
```

Así: GPU prendida → responde local (rápido, gratis, privado); GPU caída/lenta → LiteLLM rota a OpenRouter
sin que el juego se entere. **El usuario lo está viendo por su lado; acá queda como diseño, no se aplica
todavía** (cambio aditivo en el LiteLLM compartido vía Ansible de `infra-ai`). Falta además elegir el gemma
final (ver §2.6 y la tanda de §3).

## 2.8 `tormenta-free` — snippet LISTO PARA PEGAR en tu LiteLLM (NO aplicado)

No lo apliqué yo: `infra-ai` lo está editando otro proceso en paralelo y no quiero pisar. Pegá esto en
`roles/install-litellm-proxy/tasks/main.yml` (es **aditivo**, no toca model_names existentes) y aplicá con
tu flujo de siempre:

```yaml
# (1) en model_list, cerca de gemma4-free:
- model_name: tormenta-free
  litellm_params:
    model: openrouter/google/gemma-4-26b-a4b-it:free   # primario EXACTO del código (js/ai.js)
    api_key: os.environ/OPENROUTER_API_KEY

# (2) en litellm_settings.fallbacks (misma política: free primero, paid-final al final):
- {"tormenta-free": ["gemma4-free", "gpt-oss-free", "llama70b-free", "paid-final"]}
```

Notas:
- El primario es el `gemma-4-26b:free` que usa la UI; si satura, rota a `gemma4-free` (31b) y la cadena free.
  No replico llama-3.2-3b / lfm-2.5 / mistral-7b como model_names aparte (serían 3 entradas más); la cadena
  de arriba cubre el "gemma primero + rotación" con modelos ya probados de tu pool.
- Para usarlo desde el juego: `helm upgrade tormenta-ai ai-proxy/chart -n ai --reuse-values --set upstream.model=tormenta-free`.
- OJO: hoy el ConfigMap vivo y el Ansible están **diverged por 1 model_name** (alguien edita en vivo) →
  conviene reconciliar antes de aplicar, para no perder cambios.

## 3. A probar (más modelos en la GPU para elegir el mejor)

- **OpenRouter free** (nube): gemma4 (actual) vs otros free — calidad del criollo/personaje.
- **GPU NVIDIA** (`local-gpu`, Ollama en `srv-t7910`, compartida con HAMi): ¿contesta bien y rápido el
  linyera con un modelo chico local? (estaba `Pending` al momento de escribir — revisar scheduling/HAMi).
- **NPU RK1** (`rk1-npu-local`, 4 placas): latencia y calidad de un 8B local en round-robin.
- Métrica: tiempo a primer token / total, y un set fijo de prompts de linyera para comparar "voz".

## 4. `tormenta-free` (cadena exacta del código)

Agregar un `model_name: tormenta-free` **aditivo** en el LiteLLM (vía el rol Ansible de `infra-ai`, NO
hot-patch del configmap compartido que sirve a Hermes/OpenClaw/Holmes) que replique la cadena de `ai.js`
con fallbacks de LiteLLM:

```yaml
- model_name: tormenta-free
  litellm_params: { model: openrouter/google/gemma-4-26b-a4b-it:free, api_key: os.environ/OPENROUTER_API_KEY }
- model_name: tormenta-free
  litellm_params: { model: openrouter/meta-llama/llama-3.2-3b-instruct:free, api_key: os.environ/OPENROUTER_API_KEY }
# … lfm-2.5, mistral-7b como siguientes
```
Luego `upstream.model=tormenta-free` en el chart. Verificar que no rompa los otros model_names (additive).

## 5. Salida esperada

- Recomendación de `upstream.model` por escenario (default público vs "modo fierro propio").
- Tablero Grafana con latencia/fallbacks por modelo (LiteLLM ya exporta métricas).
