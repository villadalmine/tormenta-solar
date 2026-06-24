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
| **gemma2:2b** | GPU (gpu-llm/ollama, NVIDIA+HAMi) | **2.5s caliente** / 17s frío | ★★★ buen criollo, en personaje. **Mejor self-hosted.** |
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

## 3. A probar

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
