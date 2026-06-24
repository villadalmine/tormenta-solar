# Reporte — Elección de modelo para el chat del linyera (nube vs GPU vs CPU vs NPU) + recomendación de placa

- **Fecha:** 2026-06-24
- **Resumen para detalle:** `pruebas-modelos.md` (§2.6–2.10.3) tiene cada corrida. Esto es el ejecutivo.

## TL;DR

- **Hoy, el mejor para el linyera es `gemma4-free` (OpenRouter, nube):** mejor coherencia, **memoria perfecta
  en ES y EN**, 2-7s, $0. **Ya está live.**
- **Ningún modelo local le gana en el fierro actual** (GPUs viejas M4000/P4): el mejor local es `qwen2.5:7b`
  pero a ~17 tok/s (5-7s warm + 22s cold) y sin mejor calidad.
- **Con una GPU nueva**, un local (qwen2.5:7b / gemma2:9b) **sí** sería competitivo (calidad ok + privacidad +
  sin rate-limit). **Recomendación de placa: RTX 3090 usada** (valor) o **L4** (moderna/baja potencia) — detalle abajo.

## Metodología

- Prompt de linyera (Diógenes) fijo; 3-4 prompts por modelo. Métricas: **latencia** (avg + cold/warm),
  **tasa de éxito** (ok/N), **score de calidad 0-100** automático (español + slang rioplatense + tema +
  sin refusal/leak + largo sano), y **test de memoria multi-turno** (te decís "me llamo Pocho y odio los
  drones" → al 3er turno se le pregunta si recuerda), en **ES y EN**.

## Resultados (consolidado)

| Modelo | Vía | Calidad | Latencia | Memoria ES/EN | Veredicto |
|---|---|---|---|---|---|
| **gemma4-free** (gemma-4-31b) | Nube | **88/100 ★★★★** | **2-7s** | ✅ / ✅ | **Ganador (live)** |
| qwen2.5:7b | GPU local | ★★★ | 5-7s warm / 22s cold (~17 tok/s) | ✅ | Mejor local; no gana hoy |
| gemma2:9b | GPU local | ★★★ | ~14s (~9 tok/s) | ✅ / ✅ | Calidad ok, lento acá |
| gemma2:2b | GPU/CPU | 70/100 ★★ | 2.5-6s GPU / 3-5s CPU | ✅ / ⚠️ | Rápido pero suelto |
| llama3.1:8b | GPU/CPU | ★★★ | 13-26s CPU / ~13s GPU (~6-12 tok/s) | ✅ / ✅ | Coherente pero lento |
| local-gpu (qwen2.5:1.5b) | GPU | 59/100 ★ | 1.7s | — | Rápido pero pobre |
| rk1-npu-local | NPU | 55/100 | 28.9s, flaky | — | No usable (lento/bug) |
| nemotron / gpt-oss / llama70b / qwen36 / free | Nube | 0-45/100 | timeout/429 o reasoning-leak | — | Descartados |

**Hallazgos clave:** (1) todos los modelos **usan bien la memoria** (mandando el historial) — el cuello no es
memoria, es **velocidad**. (2) Las GPUs actuales (M4000 8GB + P4 7.7GB, Pascal/Maxwell, sin tensor cores) dan
**tok/s bajo** → ni en GPU full un 7-9b baja de ~5-7s warm. (3) CPU+RAM (247GB, 32 cores) corre hasta 70b pero
inusable por latencia; **más RAM no acelera**. (4) Nube simple y mejor hoy.

## Arquitectura vigente

- **Linyera (este juego):** `gemma4-free` (nube) + fallback local cuando haya GPU.
- **Agentes (Holmes/OpenClaw/Hermes):** nube, free **con thinking**. No GPU.
- **GPU (HAMi):** exclusiva del **juego online**. (Ver `hami-gpu-plan.md` para sacar el ollama bare-metal y
  que HAMi gobierne todo → evita el OOM por doble-dueño.)

## Recomendación de placa (incluye otras además de T4/P40/A16)

Para correr 7-9b locales **rápido** (que le ganen a la nube) y/o densidad multi-tenant bajo HAMi:

| | Tesla T4 | Tesla P40 | A16 | **L4** ⭐ | **RTX 3090 usada** ⭐ |
|---|---|---|---|---|---|
| Arq / año | Turing '18 | Pascal '16 | Ampere '21 | **Ada '23** | Ampere '20 |
| VRAM | 16 GB | 24 GB | 64 (4×16) | **24 GB** | **24 GB** |
| Consumo | 70 W | 250 W | ~250 W | **72 W** | ~350 W (2-3 slots) |
| Tensor / stack | sí, vLLM | **sin tensor, CUDA deprecándose** | sí | **sí, FP8, vLLM** | sí, vLLM |
| 7b (Q4) | ~40-60 tok/s | ~20-40 | per-GPU modesto | ~60-90 tok/s | **~100-150 tok/s** |
| Multi-tenant HAMi | 1 GPU | 1 GPU | **4 GPUs (densidad)** | 1 GPU | 1 GPU (consumer, time-slice) |
| Precio aprox | US$400-700 | US$150-300 | US$2500+ | US$1500-2500 | **US$700-900** |
| ECC / vGPU oficial | sí | sí | sí | sí | no (consumer) |

**Mi recomendación, según prioridad:**
- **Mejor valor/velocidad (lo que yo elegiría para un homelab): RTX 3090 usada.** 24GB + ~100-150 tok/s en
  7b → le gana a la nube por lejos, corre varios modelos o uno de 30b, y HAMi soporta consumer (time-slice/MPS).
  Contras: ~350W, 2-3 slots, sin ECC/vGPU oficial. Si tu server aguanta la fuente/espacio, es la más rentable.
- **Mejor "hacelo bien", bajo consumo y moderna: L4.** 24GB, **72W**, Ada con **FP8**, datacenter-grade
  (vGPU/HAMi de primera). Es "la T4 de nueva generación" con 24GB. Cara, pero la más limpia para un rack.
- **T4:** buena entrada eficiente (70W, moderna) si el presupuesto aprieta, pero **16GB** y más lenta que L4/3090.
- **P40:** solo por **VRAM barata** (24GB) si el budget es mínimo; vieja, sin tensor, 250W, **soporte CUDA en
  retirada** → no la compraría hoy salvo desesperación.
- **A16:** solo si el objetivo es **densidad multi-tenant extrema** (64GB / 4 GPUs para muchísimos tenants);
  cada sub-GPU es lenta para un modelo grande, y es cara + 250W.

**En una línea:** **RTX 3090 usada** = mejor rendimiento por dólar (si tu server aguanta el W/espacio);
**L4** = la opción moderna y eficiente si querés bajo consumo y vGPU prolijo; T4 como entrada barata; P40/A16
solo en sus nichos (VRAM barata / densidad).

## Próximos pasos

1. Linyera sigue en `gemma4-free` (sin cambios, ya live).
2. Cuando entre la GPU nueva (recomendado **RTX 3090 usada** por valor, o **L4** por eficiencia): levantar `ollama` en k8s (pod con request HAMi) con
   `qwen2.5:7b` o `gemma2:9b`, `model_name` en LiteLLM + **fallback a `gemma4-free`**, y `--set
   upstream.model=` en el proxy. (Plan de gobernanza: `hami-gpu-plan.md`.)
