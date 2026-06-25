# SDD — Métricas dentro del juego: "tu partida" (sesión) + comunidad + trazabilidad (OTel)

- **Estado:** Diseño (para implementar por fases).
- **Última actualización:** 2026-06-25
- **Relacionado:** telemetría existente (`tormenta_game_events_total`, `/game-metrics`, dashboards Grafana),
  `proxy-ia-deploy.md` (el proxy sirve agregados), `llm-metrics.md`.

## 1. Objetivo

Que el jugador **vea sus métricas DENTRO del juego/página** (tormenta-online): las de **su propia sesión**
(tu partida) y, opcional, las de la **comunidad** (las que ya están en Grafana). Funciona igual desde **GitHub
Pages** (el proxy provee los agregados) o desde **el self-host**. Opcional: **trazabilidad con OTel** del pipeline
del chat.

## 2. Tres capas (de más fácil/valiosa a más pesada)

### 2.1 "TU PARTIDA" — métricas de tu sesión (CLIENT-SIDE, lo mejor)
- El juego YA tiene tu estado: muertes, loops, truco ganados/perdidos, chats, tiempo jugado, **motor v1/v2**,
  hitos hechos, monedas/flores/forros. → un **panel/overlay in-game** que lo dibuja leyendo el estado del
  propio juego. **Cero servidor, cero PII, funciona en GitHub y self-host por igual.** Es el de **mayor valor y
  menor costo**: "mirá cómo te fue".
- Implementación: contadores client-side (varios ya existen) + una pantalla "Tus estadísticas" (overlay tipo
  end-screen, pero on-demand). Reusa `presence.js`/el HUD.

### 2.2 "COMUNIDAD" — agregados (del proxy, sin exponer Grafana)
- El proxy ya tiene los agregados (`tormenta_game_events_total`). Exponer un **`GET /stats.json`** (agregado,
  sin PII: sesiones por motor, % que termina, truco W/L, etc.) y el juego dibuja unos números de comunidad.
- **Por qué no embeber Grafana:** Grafana es interno; embeberlo lo expone. El `/stats.json` (público, agregado)
  es más limpio y funciona desde cualquier origen. (Grafana queda para el dev.)

### 2.3 TRAZABILIDAD con OTel (backend, opcional/pesado)
- OTel sirve para **trazar el pipeline del chat** (cliente → proxy → LiteLLM → modelo) con spans por hop →
  ves **dónde se va la latencia** (¿el G4? ¿LiteLLM? ¿el modelo?). NO es para las métricas de la partida (eso es
  2.1, client-side).
- Diseño: instrumentar el **proxy** (y opc. LiteLLM) con OpenTelemetry → **OTel Collector** → **Tempo/Jaeger** →
  visto en Grafana (que ya está). El `traceparent` puede venir del cliente para correlacionar una charla puntual.
- **Costo:** SDK OTel + collector + Tempo. Es infra real. **Vale si querés debuggear latencia del chat por hop**;
  para "ver tus métricas de la partida" NO hace falta.

## 3. Fases

1. **F1** Pantalla "**Tus estadísticas**" in-game (client-side, 2.1). Alto valor, sin infra. **Recomendado primero.**
2. **F2** `GET /stats.json` agregado en el proxy + sección "comunidad" en el juego (2.2).
3. **F3** (opcional) OTel en el proxy → Collector → Tempo → Grafana (2.3) para trazabilidad de latencia del chat.

## 4. Mi lectura

- **F1 (tu partida, client-side) es el ganador**: cero infra, funciona en GitHub y self-host, sin PII, y es lo
  que el jugador quiere ver ("mis métricas"). Reusa el estado que el juego ya tiene.
- **F2 (comunidad vía `/stats.json`)** es barato y lindo; **NO embeber Grafana** (es interno) — servir el agregado.
- **F3 (OTel)** es para **trazabilidad de backend** (latencia por hop del chat), no para las métricas de la
  partida — es la parte pesada y separada; vale cuando quieras debuggear el pipeline del chat a fondo.
- Funciona en **los dos orígenes**: lo client-side anda en cualquier lado; lo agregado/OTel pasa por el proxy,
  que sirve igual a GitHub Pages y al self-host.
