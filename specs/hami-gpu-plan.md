# SDD — Plan: HAMi como único dueño de la GPU (cero inferencia bare-metal)

- **Estado:** **Draft / plan** (no ejecutado)
- **Última actualización:** 2026-06-24
- **Objetivo:** que **todo el uso de GPU pase por k8s/HAMi**. Ningún `ollama serve` ni LiteLLM corriendo a
  pelo en el host `srv-t7910` (192.168.178.90). Así HAMi contabiliza el 100% de la VRAM y se acaba el riesgo
  de **OOM por sobre-suscripción** (ver `pruebas-modelos.md §2.10`).

## 1. Estado actual (qué hay que migrar/eliminar)

- **Bare metal en srv-t7910**: `ollama serve` (host) con `llama3.1:8b` y `qwen2.5-coder:7b`. (Un LiteLLM del
  host en `:4000` aparece referenciado pero respondió vacío → posiblemente caído.)
- **Consumidores del ollama del host** (hay que repuntarlos antes de apagar):
  - `gpt-5.4` / `openai/gpt-5.4` (default de **Holmes**) → `192.168.178.90:11434` (llama3.1:8b).
  - `holmes-llama` / `holmes-free2` / `holmes-cheap` y `local-fast/llama/reason/coder-7b/codestral/deepseek`
    → LiteLLM del host `192.168.178.90:4000`.
  - **Plugin de Headlamp** (troubleshooter tipo HolmesGPT) → `192.168.178.90:4000`.
- **In-cluster (ya bajo HAMi)**: `ollama-a` + `ollama-b` (dual, qwen2.5:1.5b, ~3GB slice c/u) bajo `local-gpu`.
- **HW**: 2 GPUs en el nodo → M4000 8GB + P4 7.7GB (~15.7GB total).

## 2. Diseño objetivo

- **Un solo LiteLLM** (el in-cluster `ai/litellm-proxy`) hablando con **ollamas in-cluster**. Se retira el
  LiteLLM del host.
- **Ollama(s) in-cluster** con request HAMi del tamaño del modelo:
  - `ollama-holmes` (nuevo) con `nvidia.com/gpumem ≈ 7Gi` para `llama3.1:8b` (+ `qwen2.5-coder:7b` si Holmes
    lo usa). Cabe en la M4000 (8GB).
  - `ollama-a/b` (juego) con gemma2:2b/qwen1.5b (~2-3GB) → a la P4.
  - **Regla de oro de sizing**: la suma de `gpumem` de los pods que caen en una placa ≤ VRAM física de esa
    placa. Con 2 GPUs, separar "modelo grande de Holmes" (M4000) de "modelos chicos del juego" (P4).
- **HAMi** queda gobernando ambas GPUs sin nadie por fuera → su "libre" es real.

## 3. Plan por fases (orden seguro: migrar ANTES de apagar)

**F1 — Inventario + sizing.** Confirmar qué modelos usan Holmes/agentes del host y su VRAM. Definir requests
HAMi (llama3.1:8b ≈7Gi; gemma2:2b ≈2Gi). Cuadrar por placa.

**F2 — Llevar los modelos a k8s.** Crear/ajustar Deployment de ollama in-cluster (`ollama-holmes`, nodeSelector
`srv-t7910`, `nvidia.com/gpu:1` + `gpumem` adecuado). `ollama pull llama3.1:8b` (y `qwen2.5-coder:7b`). Service
`ollama-holmes:11434`.

**F3 — Repuntar LiteLLM (in-cluster).** En la config (Ansible `infra-ai`), cambiar las `api_base`:
- `gpt-5.4`/`openai/gpt-5.4`: `192.168.178.90:11434` → `http://ollama-holmes.ai.svc.cluster.local:11434/v1`.
- `holmes-*` y `local-*`: `192.168.178.90:4000` → el ollama in-cluster correspondiente (o el propio litellm
  in-cluster apuntando a esos ollamas; **colapsar el doble-hop**, ya no hace falta el litellm del host).
- Actualizar el **plugin de Headlamp** para que apunte al gateway/litellm in-cluster en vez de `:4000`.
Aplicar y **validar que Holmes responde** (gpt-5.4) por el camino nuevo.

**F4 — Apagar lo bare-metal.** Recién cuando F3 valida: en el host
`sudo systemctl disable --now ollama` (y el litellm del host si existe). 

**F5 — Validación + rollback.** `nvidia-smi` en el host: **solo procesos de pods k8s**, nada de `ollama serve`
del host. HAMi `free` = real. Smoke: Holmes/gpt-5.4 OK, juego OK, otro juego OK. **Rollback**: si algo falla,
`systemctl enable --now ollama` en el host hasta reconciliar (por eso F4 va último y no se borra nada).

## 4. Verificación

- `nvidia-smi --query-compute-apps` → todos los PIDs son de contenedores k8s (ninguno del host).
- `kubectl describe node srv-t7910` → `nvidia.com/gpu*` allocatable vs requests cuadran; sin OOM en eventos.
- Holmes responde con `gpt-5.4`; latencia comparable a antes.
- Grafana/Hubble: sin errores nuevos; sin reinicios por OOM en los ollama.

## 5. Riesgos / notas

- **No apagar el host antes de F3** (Holmes se queda sin modelo). Orden estricto F2→F3→F4.
- Placas viejas (Pascal/Maxwell): un 8b por placa es lo razonable; no apilar dos modelos grandes en una.
- Esto vive en **`infra-ai`** (config LiteLLM + manifiestos ollama) — lo ejecuta el dueño de esa infra; acá
  queda el plan. Relacionado con `pruebas-modelos.md §2.10` (gobernanza HAMi) y `seguridad.md` (anti-DoS/OOM).
