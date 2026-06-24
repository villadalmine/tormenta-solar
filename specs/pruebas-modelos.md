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
