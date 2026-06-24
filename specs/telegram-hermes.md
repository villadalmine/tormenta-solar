# SDD — Bot de Telegram → Hermes para manejar el juego

- **Estado:** **Draft** (no implementado)
- **Última actualización:** 2026-06-24

## 1. Objetivo

Un **bot de Telegram** conectado a **Hermes** (el agente que ya corre en el cluster:
`registry.registry:5000/ai/hermes-agent:…-telegram`) para **administrar y orquestar el juego desde el
chat**: generar contenido, mover flags/quests, ver estado, etc. — un "panel de control conversacional".

## 2. Idea de arquitectura

```
Telegram  ──►  Hermes (agente, LiteLLM + tools)  ──►  acciones sobre el juego
```

- **Hermes** ya tiene Telegram + acceso a herramientas/LLM vía LiteLLM. La pieza nueva son las **tools**
  que expongan operaciones del juego.
- ¿Qué "maneja"? Opciones a definir:
  - **Contenido**: disparar los generadores (`tools/gen-dialogos.mjs`, `gen-historia.mjs`, `gen-level.js`)
    y abrir un PR / commit (el juego es data-driven; nuevo contenido = nuevos datos).
  - **Operación**: ver métricas del proxy/LiteLLM, estado del deploy, reiniciar, cambiar `upstream.model`.
  - **Telemetría**: "cuántos jugando ahora", consumo de tokens, etc.
- **Trazabilidad** (encaja con el motor v2 de `modelo-de-entidades.md`): si el juego emite eventos
  (event-sourcing) + grafo de conocimiento, Hermes puede responder "¿en qué parte está el jugador X?".

## 3. Seguridad

- Allowlist de chat IDs (solo el dueño). Las tools de escritura (commit/deploy) detrás de confirmación.
- Las keys/credenciales viven en Hermes (cluster), nunca en el cliente.

## 4. Pendiente de decidir

- Alcance v1 (¿solo generar contenido, o también operar la infra?).
- Cómo aplica cambios al repo (PR vs commit directo) y al cluster (Argo/Helm).
- Relación con el motor v2 (event-sourcing/GraphRAG) para la parte de "saber en qué parte está el juego".
