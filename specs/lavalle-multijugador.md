# SDD — Lavalle MULTIJUGADOR: "Aguantar el corte" (co-op de piquete)

- **Estado:** **Fase 1 + Fase 2 HECHAS y en prod (v252→v262).** Verse+juntarse (F1), chat privado con el peer, y el
  mini-juego co-op **"Aguantar el corte"** (F2, `js/piquete.js`). Próximo: MÁS mini-juegos (§6).
- **Última actualización:** 2026-07-01
- **⚠️ GOTCHA que rompía TODO el multijugador (v262):** en `index.html`, `salon.js` DEBE cargar **ANTES** de
  `game.js`. game.js registra `Salon.onWhisper`/`Salon.onTable` en su init (parse-time); si `Salon` no existe aún, los
  callbacks NO se registran y los eventos entrantes (whisper, table-start) se descartan → chat/mesas/piquete mudos. Ver
  memoria [[orden-scripts-salon]]. Diagnóstico: 2 navegadores Playwright con **contextos separados** (distinto pid).
- **Origen:** idea del dueño — *"que esta parte de Lavalle sea una zona multiplayer; te podés juntar con otros y hacer
  piquete; si se unen 2/4/6 jugadores salen mini-juegos de piquete (a definir)"*. Mini-juego elegido para el 1er
  prototipo: **"Aguantar el corte"** (co-op wave-defense).
- **Relacionado:** [[lavalle]] (el sub-modo single-player), `specs/multijugador.md` (salon-server + mesas), `js/lavalle.js`,
  `js/salon.js`, `ai-proxy/server.js` (salon-server).

## 0. Principio de arquitectura (por qué NO va por el grafo)

El **grafo `historia.js`** es la **narrativa single-player** (flags/quests/desbloqueos). El **multijugador es OTRA
capa**: presencia + estado en vivo por **SSE** (el `salon-server` del ai-proxy). Ya conviven así: el **cine "EN VIVO"**
y el **bodegón** son multijugador y **no tocan el grafo**. Lavalle multijugador = **la misma capa**. Correcto y
consistente: **contenido = dato/grafo; presencia/partida = runtime.**

Reusa lo YA hecho y testeado:
- **`salon-server`** (SSE relay): `join / stream / pos / say / whisper` → peers caminando interpolados + emotes/frases
  (idéntico al bodegón).
- **Mesas server-authoritative** (del truco 3v3/1v1): `/salon/table` con lobby de **N asientos, waiting/playing, cuenta
  regresiva, host electo, seed compartido**. → es el **primitivo de "juntarse 2/4/6 y arrancar un mini-juego"**.

## 1. Cambio de base: ESPACIOS (`space`) en el salon-server

Hoy `/salon/join` mete a todos en **un** espacio (bodegón). Para que Lavalle sea un espacio aparte (no mezclar la
gente del bodegón con la del piquete):
- **`POST /salon/join {pid, nick, avatar, space}`** — `space ∈ {'bodegon','lavalle'}` (default `'bodegon'` para no
  romper). Los pools de rooms y las **mesas son por-espacio**. El `stream`/`pos`/`table`/`whisper` ya viajan con el
  `room` que devuelve join, así que **una vez asignada la room del espacio, el resto no cambia**.
- Cliente `js/salon.js`: `join(nick, avatar, cb, space)` (param opcional, default bodegón). `enterLavalle` llama
  `Salon.join(nick, avatar, cb, 'lavalle')`.
- `infra-N` (proxy): cambio chico y retro-compatible (default = comportamiento actual).

## 2. Fase 1 — VERSE + JUNTARSE (plomería, sin combate)

Objetivo: entrar a Lavalle y **ver a los otros jugadores caminando** por el piquete, y **poder juntarse** en un punto
de organización que arranca el mini-juego cuando hay 2/4/6.
- **Peers en `js/lavalle.js`:** al `create()`, `Salon.join(..., 'lavalle')`; en `update()` postear la pos real
  (`Salon.pos(tileX, vx, emote, tileY)`); dibujar cada peer con el mismo `piquetero()` en su (x,y) interpolado
  (mezclados con la multitud de fondo). Emotes (1-4) / frases (5-8) como el bodegón. **Copia directa de la capa de
  peers del bodegón.**
- **Punto de organización:** un set-piece (la **barricada** / el **bombo**) marcado con [E] → `Salon.tableSit('corte')`
  → overlay "esperando compañeros… (N/6)" (de `table-update`). Arranca a los **2/4/6** (o a los ≥2 tras cuenta
  regresiva, igual que la mesa de 6). `table-start {seats, seed, host}` → Fase 2.
- **Fallback single-player intacto:** si estás solo (sin red / sin peers) ves la **postal de hoy** (multitud + el
  linyera peronista). El multijugador es **aditivo**.

## 3. Fase 2 — el mini-juego "AGUANTAR EL CORTE" (co-op wave-defense)

**Concepto:** 2/4/6 jugadores defienden la **barricada** de **OLAS de desalojo** (la yuta / infiltrados / una topadora)
que bajan desde el lado del Obelisco e intentan **levantar el corte** (llegar a la barricada y sacarle cubiertas).
Entre todos los frenan (empujar / tirarles cosas / taparse los huecos). **Aguantás N olas → GANÁS** (el corte
resistió). Si la **barricada cae** (se le sacan K cubiertas / HP=0) → **PERDÉS** (levantaron el corte). Recompensa
grupal (flores / "aguante" / que el corte sume a lo colaborativo global tipo datacenter — a evaluar).

**Netcode — HOST-AUTHORITATIVE (como el truco), apropiado para co-op:**
- `host = seats[0]` (orden de llegada). El host **simula** olas/enemigos/HP de la barricada con el `seed` compartido
  (determinístico) y **broadcast** del estado a ~8-10 Hz por `whisper` (JSON `lv-*`, cap 900): posiciones de
  enemigos + HP barricada + ola actual + score.
- Guests: mandan su **input** (pos ya va por `Salon.pos`; acción "empujar/tirar" por `lv-act`) y **renderizan** el
  estado del host (enemigos interpolados). El host resuelve **kills y daño a la barricada** (autoridad → no diverge).
- En **co-op no hay incentivo a trampear** contra el equipo → la deuda "host malicioso" es irrelevante acá.
- **Watchdog** (reusa `trucoPeerGone`): si el host se va → migrar host a `seats[1]` o cerrar la ronda con "se cortó".
- **Escala por jugadores:** 2 = dupla, 4 = más huecos/olas, 6 = frente ancho. El nº de spawns/olas escala con
  `seats.length`.

**Piezas de dibujo/lógica que ya existen y se reusan:** `piquetero()` (jugadores+peers), enemigos/oleadas del motor
(la yuta = variante de enemigo), la barricada (cubiertas `tireStack` + reja) como estructura con HP, `fire()`/olla de
ambiente, cumbia.

## 4. Archivos
- `ai-proxy/server.js` — `space` en `/salon/join` (pools + mesas por espacio). **redeploy proxy (infra-N).**
- `js/salon.js` — `join(...ei, space)`; nada más cambia (room ya viaja).
- `js/lavalle.js` — Fase 1: peers + pos real + emotes + punto de organización (`tableSit('corte')`). Fase 2: escena
  del mini-juego (host-authoritative), `lv-*` por whisper.
- `js/game.js` — dispatch: `onTable`/`table-start` de la mesa `corte` → arranca "Aguantar el corte"; enrutar `lv-*`
  en `onPeerWhisper` (como `tk-*`/`t6-*`).
- i18n `g.lavalle.mp.*` (esperar, ganaste/perdiste, olas) ES≡EN. `index.html` bump `?v`.
- `tests/e2e.js` — smoke del mini-juego host/guest sin crash (como el truco PvP).

## 5. Verificación
- **2 clientes reales** (curl + navegador) en `space:'lavalle'`: se ven caminando, se sientan en `corte`, arranca la
  ronda con el mismo `seed`, el estado del host llega a los guests. `/salon/debug` por espacio.
- `node tests/e2e.js` + `tests/web-smoke.mjs` + paridad i18n.
- Manual 2 navegadores: entrar a Lavalle → verse → juntarse → aguantar una ola → ganar/perder consistente.

## 6. Roadmap (mini-juegos del piquete) — cada uno = otra `table` del espacio `lavalle`
- ✅ **Aguantar el corte** (co-op wave-defense) — HECHO (v259, mesa `corte`, `js/piquete.js`).
- ✅ **La soga** (tug of war co-op vs el desalojo) — HECHO (v263, mesa `soga`, `js/soga.js`; jugable solo vs bots).
- ✅ **Bombo & cumbia** (ritmo co-op) — HECHO (v264, mesa `bombo`, `js/bombo.js`; tocás al pulso, subís el aguante).
- ✅ **Reparto de la olla** (reacción co-op) — HECHO (v265, mesa `olla`, `js/olla.js`; servís al vecino más urgente).
- ✅ **Pintar la pancarta** (colaborativo) — HECHO (v266, mesa `pancarta`, `js/pancarta.js`; movés el pincel y pintás la tela).
- 🎉 **SET COMPLETO: 5 mini-juegos co-op del piquete** (corte, soga, bombo, olla, pancarta), cada uno con su gather point en `js/lavalle.js`.
- **Patrón para sumar uno:** (1) módulo `js/<juego>.js` host-authoritative (create({role,seats,myPid,seed,sendState})
  + update/draw/applyState + get done/exitTo/result/isHost); (2) server: sumar la mesa a `SPACE_TABLES.lavalle` +
  `TABLE_CAP` + `CD_TABLES` + `CD_MIN` (proxy redeploy); (3) `game.js`: `start<Juego>` + rama en `onTable` + ruteo del
  prefijo whisper en `onPeerWhisper` + rama en el dispatch + gather point que llame `sitAtTable`; (4) 3er gather point
  en `js/lavalle.js` + getter `join<Juego>`; (5) i18n + e2e (headless win/lose) + script tag en index.html.
- Enganche a lo colaborativo global (el "aguante" del corte suma a un contador global tipo datacenter).
- Server-authoritative real (simulación en el proxy) si el host-authoritative no alcanza con lag.
