# SDD (idea / stub) — Zona MULTIJUGADOR: cruzarte con otros jugadores en tiempo real + co-op/quests

- **Estado:** **Idea capturada (2026-06-25).** Diseño temprano — el dueño lo detalla después ("después veo qué").
- **Relacionado:** repo **`online-game`** (ya tiene el backend **SSE/tiempo real + presencia** — reusar, no
  reinventar; ver su `sdd-haproxy-edge-sse.md` y el metering por usuario), [`modelo-de-entidades.md`](modelo-de-entidades.md)
  (otros jugadores = entidades; quests co-op = quests del grafo), `presence.js`, `suscripcion.md` (identidad/usuarios).

## 1. La idea
Una **parte del juego** (una zona/sala, o un modo) donde **te cruzás EN TIEMPO REAL con otros jugadores** y podés
**interactuar** (verlos, hablar, emotes) y **hacer cosas juntos**: **quests co-op**, mandados compartidos, o
simplemente coexistir en el mundo (la peatonal "viva"). Hoy el juego es single-player; esto suma una capa
**social/online** acotada a una zona, sin volver todo el juego multiplayer.

## 2. Por qué encaja (no se inventa de cero)
- **`online-game` ya resuelve el tiempo real**: tiene **SSE** (server-sent events) por el edge HAProxy + Cilium,
  **presencia** y metering por usuario. La zona multi de Tormenta Solar **se conecta a ese backend** (o uno
  calcado) en vez de armar WebSockets nuevos. El juego sigue siendo estático (GitHub Pages) + un endpoint de
  estado en vivo.
- **Otros jugadores = entidades** (modelo §4): un jugador remoto es una `entity` `tipo:"player"` con `pos`/`render`
  que se **crea/actualiza/borra en runtime** desde el stream (como las efímeras D6 — NO van al modelo ni al save).
- **Quests co-op = quests del grafo** (§6.95) con condición compartida (ej. "los dos en la sala", "uno hace A y
  el otro B"). El `HintEngine`/oráculo ya guía; sumar la coordinación entre 2+ es la parte nueva.

## 3. Preguntas abiertas (para cuando se detalle)
- **Alcance:** ¿una sola "plaza"/zona social, o varias? ¿co-op de a 2 o lobby de N? ¿drop-in/drop-out?
- **Sincronización:** ¿solo posiciones + chat (barato, SSE), o estado de quest compartido (más complejo)?
  ¿autoridad del servidor vs cliente? ¿qué pasa si se cae la conexión (degradar a single, como todo el repo)?
- **Identidad:** ¿nick anónimo (session-id, como el cupo del chat) o ligado a la cuenta/suscripción?
- **Anti-abuso:** chat/acciones entre jugadores = moderación, rate-limit, reportes (cae en `seguridad.md`).
- **Infra:** ¿el endpoint vive en `online-game` o un servicio propio? ¿cuánto aguanta el edge (maxconn del G4)?
- **Diseño de juego:** ¿qué hacés JUNTOS que no podés solo? (puertas que requieren 2, un quest que se reparte,
  un jefe co-op, intercambio de items/caramelos). Eso es lo que le da sentido a la zona.

## 4. Mi lectura
- **Reutilizar `online-game`** es el camino: ya hay tiempo real + presencia probados en producción; sumamos una
  zona que habla ese protocolo. El **modelo de entidades** hace que los jugadores remotos entren limpio (entidades
  efímeras de runtime). Lo que hay que diseñar bien es **qué se hace junto** (el gameplay co-op) y la
  **degradación** (sin conexión → la zona queda single, el resto del juego intacto).
- **Cuándo:** después de cerrar lo single-player en curso (cine/noticias, etc.). Es una capa grande; conviene
  prototipar **una zona con solo posiciones + chat** (lo más barato sobre SSE) antes de quests co-op.
