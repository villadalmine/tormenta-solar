# ROADMAP — tareas pendientes (lo que queda)

> Estado al 2026-06-26 (web 0.1.80 / proxy 0.1.40, cache v179). Lista viva de lo que falta. Lo HECHO está en
> CHANGELOG.md y `specs/features-showcase.md` (catálogo de técnicas).

## 1. Página /info y /tech — ✅ HECHO (v178)
La página de **info** (qué es) y **tech** (cómo funciona el stack) ya muestra el motor data-driven, la máquina de
niveles por IA + la RED de jugabilidad, el tema oráculo personalizado y la resiliencia. Ver CHANGELOG [v178].
- **Queda como mejora opcional:** **diagramas** del pipeline (`level.js → gen-level → JSON → schema → Mundo`) y del
  bucle de la máquina de niveles (`IA → schema + Playable → Mundo.fromModel`), idealmente auto-generados desde los SDD.

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

## 4. Resiliencia (core hecho) — extender
- ✅ Circuit breaker en `NivelAI` (GPU caída → estático al toque).
- ✅ Circuit breaker en el **chat** (`ai.js`, v179): GPU caída → pool local AL TOQUE (no espera los 11s), con
  **señal de salud compartida** (`window.__aiHealth`) entre chat y generador de niveles. Test `tests/breaker.js`.
- **Pendiente (opcional):** warm-cache del pool de líneas a `localStorage` cuando el proxy está sano (RF-2), y
  calibrar el umbral con datos del **stress test** (`resiliencia.md §5`).
- **KEDA GPU scaler** (autoescalar la GPU a cero en idle) — anotado en `hami-gpu-plan §6` / memoria.

## 5. Otros (backlog viejo, ver memoria/SKILL)
- Probar **mobile** en celular real (mobile/ existe, dormido en desktop).
- Assets reales de marcas para la publicidad.
- Spin-off Stargate (specs/spinoff-stargate.md).
- Quest-mundo-ai premium (specs/quest-mundo-ai.md).
- Transcreación EN de los rumores del chusmerío (hoy es-flavor).
