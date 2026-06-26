# ROADMAP — tareas pendientes (lo que queda)

> Estado al 2026-06-26 (web 0.1.80 / proxy 0.1.40, cache v181). Lista viva de lo que falta. Lo HECHO está en
> CHANGELOG.md y `specs/features-showcase.md` (catálogo de técnicas).

## 1. Página /info y /tech — ✅ HECHO (v178)
La página de **info** (qué es) y **tech** (cómo funciona el stack) ya muestra el motor data-driven, la máquina de
niveles por IA + la RED de jugabilidad, el tema oráculo personalizado y la resiliencia. Ver CHANGELOG [v178].
- **Queda como mejora opcional:** **diagramas** del pipeline (`level.js → gen-level → JSON → schema → Mundo`) y del
  bucle de la máquina de niveles (`IA → schema + Playable → Mundo.fromModel`), idealmente auto-generados desde los SDD.

## 2. Generador de niveles (la C)
- ✅ **IA autora la GEOMETRÍA exacta** (v180): plataformas `[x,y,ancho]` + enemigos como DATA en el tema **oráculo**,
  validadas por la RED (`Playable`, incl. **R4 reachability**) + **auto-reparación** (fallback procedural por sala si
  no pasa). Test `tests/geometria.js`. Ver `specs/fabrica-niveles-ai.md §4.7-4.8`.
- ✅ **Geometría IA también para los temas fijos** (v181): `requestGeometry` + `launchNivelAI` async, con circuit
  breaker. Falta el **redeploy del proxy** para que mande geometría en vivo (el cliente ya la consume si llega).
- ✅ **Pinchos + pozos + enemigos variados + pickups alcanzables** (v182/v183): entidad `hazard` (spikes contacto /
  pit cala el piso + caída→respawn) + R4-cruza-huecos + R5 + pool peaton/dron/pacman/galaga/cuevero +
  `Playable.reachableTops`. Test en `tests/geometria.js`.
- ✅ **Obstáculos autorados por IA** (v184): el proxy pide `hazards`, el cliente los sanea y los usa si pasan la RED
  (si no, auto-repara). La IA ya autora geometría COMPLETA (plataformas+enemigos+pinchos+pozos).
- ✅ **Enemigos que respetan los pozos** (v185): caminantes/turret frenan en el borde (`edgeAhead`).
- **Más temas** (el dueño quiere ir sumando) — sumar a `THEMES` (data) + `BRIEF` en `server.js`. Ya van **9**
  (sumados lavadero-billetes y farmacia-vencida en v185).

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
