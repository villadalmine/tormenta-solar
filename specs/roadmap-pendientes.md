# ROADMAP — tareas pendientes (lo que queda)

> Estado al 2026-06-26 (web 0.1.79 / proxy 0.1.40). Lista viva de lo que falta. Lo HECHO está en CHANGELOG.md
> y `specs/features-showcase.md` (catálogo de técnicas).

## 1. Página /info y /tech (lo que pidió el dueño) — PENDIENTE
Mostrar que "esto no es un jueguito": armar la página de **info** (qué es) y **tech** (cómo funciona el stack).
- **Fuente de verdad:** `specs/features-showcase.md` (ya cataloga TODAS las técnicas).
- Existe el link en la intro (`index.html` → `info/`). Falta **construir/actualizar la página** con:
  el motor data-driven (v2), la **máquina de niveles por IA + la RED de jugabilidad**, el **tema oráculo
  personalizado**, los **oráculos con memoria + grounding**, los **banks vivos**, las **mecánicas satíricas**
  (dólares/cámaras/AFIP, caja del chino, edificio), y la **infra** (proxy propio, métricas, deploy, tests/CI).
- Ideal: diagramas del pipeline (`level.js → gen-level → JSON → schema → Mundo`) y del bucle de la máquina de
  niveles (`IA → schema + Playable → Mundo.fromModel`). Idealmente auto-generar parte desde los SDD.

## 2. Generador de niveles (la C) — el salto grande que queda
- **IA autora la GEOMETRÍA exacta** (no solo el `style`): posiciones de plataformas/enemigos/obstáculos como DATA,
  validadas por la RED (`Playable`) + **auto-reparación** (re-pedir si no pasa). Hoy: la IA elige el `style` y el
  texto; la geometría es procedural acotada. Ver `specs/fabrica-niveles-ai.md §4.7-4.8`.
- **Más tipos de obstáculo/enemigo** en los generados (pozos/pinches, enemigos variados).
- **Más temas** (el dueño quiere ir sumando) — sumar a `THEMES` (data) + `BRIEF` en `server.js`.

## 3. Cámaras / dólares (pulido)
- Cámaras como **entidad con lógica propia** (hoy son decor + reacción al disparo). Opcional: que “vean” en un cono.
- **Munición de dólares** como recurso aparte (juntarla en las cuevas, según el lore) — hoy reusa `ammo`.
- Apaciguados: que dejen monedas / se levanten tras un rato (hoy quedan juntando guita).

## 4. Resiliencia (ya hecho el core) — extender
- ✅ Circuit breaker en `NivelAI` (GPU caída → estático al toque). 
- **Pendiente:** llevar el mismo breaker al **chat** (`ai.js`) para que cuando la GPU está caída, el chat **falle
  rápido** al pool local (hoy espera el `PROXY_TIMEOUT` de 11s por mensaje). Compartir una señal de salud.
- **KEDA GPU scaler** (autoescalar la GPU a cero en idle) — anotado en `hami-gpu-plan §6` / memoria.

## 5. Otros (backlog viejo, ver memoria/SKILL)
- Probar **mobile** en celular real (mobile/ existe, dormido en desktop).
- Assets reales de marcas para la publicidad.
- Spin-off Stargate (specs/spinoff-stargate.md).
- Quest-mundo-ai premium (specs/quest-mundo-ai.md).
- Transcreación EN de los rumores del chusmerío (hoy es-flavor).
