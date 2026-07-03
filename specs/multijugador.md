# SDD — Zona MULTIJUGADOR: el CINE en vivo + el BODEGÓN donde te encontrás con otro

- **Estado:** ✅ **IMPLEMENTADO (F1 v205 → mesas server-side v245·infra-43).** Cine EN VIVO (F1), bodegón real-time SSE (F2b, v212-213), top-down + telo (v217-220), truco PvP 1v1 (F3 v240) y 3v3 con IA-fill (v241), chat privado + menú de peer (T2b v243), matchmaking por MESAS EN EL SERVER (v245: `/salon/table`, table-start, peers caminando, chat auto-abre), ESPACIOS bodegon|lavalle (v252). Deuda: host malicioso (relay sin autoridad).
- **Nivel:** transversal (2 pisos nuevos del edificio del CINE; capa social online, NO vuelve todo el juego multiplayer).
- **Relacionado:** `presence.js` (heartbeat "jugando ahora", ya existe), repo **`online-game`** (SSE/tiempo real +
  presencia en el edge HAProxy/Cilium — REUSAR, no reinventar; ver su `sdd-haproxy-edge-sse.md`),
  [`modelo-de-entidades.md`](modelo-de-entidades.md) (otros jugadores = entidades efímeras de runtime), `truco.md`
  (PvP humano reusa el motor), `cine-noticias.md` (el cine ya es multi-piso, mismo patrón de `wire`), `seguridad.md`
  (chat/anti-abuso), `suscripcion.md` (identidad opcional).

## 1. La idea (del dueño)
Dos pisos nuevos en el edificio del CINE (que ya es multi-piso):
1. **CINE EN VIVO** (real-time): un piso-cine donde **la pantalla te muestra el mundo VIVO** — cuántas sesiones hay
   jugando ahora, dónde están, qué acaban de hacer. "Ver a los otros" sin cruzarte físicamente. *(Barato, alto impacto.)*
2. **BODEGÓN porteño** (encuentro real): un bodegón con **mesas y comida** donde, si subís, **te cruzás EN TIEMPO
   REAL con otro jugador** (de a 2+), lo ves moverse, se saludan, se sientan, comparten. *(El multiplayer "de verdad".)*

> Regla de oro del repo (se respeta): **capa ADITIVA con degradación**. Sin backend / sin conexión → los pisos
> quedan como decorado estático ("nadie conectado") y **el resto del juego anda 100% igual**. Nada de WebSockets
> nuevos: **SSE** (server→cliente) + **POST** (cliente→server), que el edge HAProxy/Cilium ya pasa (lo usa `online-game`).

## 2. Arquitectura (qué se reusa, qué es nuevo)
- **El juego sigue estático** (GitHub Pages + nginx self-host). Lo único nuevo es un **servicio de "salón"** chico
  (Node, SSE) — puede ser el backend de `online-game` o uno calcado (`salon-server/`). NO va en el `ai-proxy` (ese es
  para IA; mezclarlo con presencia real-time lo ensucia).
- **Identidad anónima y efímera** (como el cupo del chat / `presence.js`): `pid` en `sessionStorage` (`ts_pid`) + un
  **nick** y un **avatar** elegidos (variantes del Carpo). **Sin cuenta** (degrade-friendly); ligar a `suscripcion`
  es opcional a futuro.
- **Otros jugadores = entidades efímeras de runtime** (modelo §4, como las D6): `tipo:"player"` con `pos`/`render`,
  **se crean/actualizan/borran desde el stream**, NUNCA van al modelo ni al save. Entran y salen limpio.
- **El server es un RELAY, no autoridad de juego**: solo reenvía posiciones/chat a los suscriptores de la sala y poda
  los stale. Estado en memoria (se pierde al reiniciar = no importa, es un espacio social). Sin física server-side
  (un bodegón social no necesita anti-cheat; confiamos en el cliente).

### Protocolo (concreto, SSE + POST)
```
POST /salon/beat   {pid,nick,avatar, at:{sala,x}}   cada ~3s   → presencia global (quién, dónde). Poda >10s.
GET  /salon/live   (SSE o poll 5s)                              → CINE: {count, byRoom:{cueva:3,…}, ticker:[…]}
POST /salon/join   {pid,nick,avatar}                            → BODEGÓN: te asigna un roomId (matchmaking, §3.2)
GET  /salon/stream?room=R   (SSE)                               → eventos: peer-join/leave, peer-pos {pid,x,vx,emote}, say
POST /salon/pos    {pid,room,x,vx,emote}            throttle ~6/s  (tu posición → fanout a la sala)
POST /salon/say    {pid,room,phrase}                            (frase PRESET o emote — anti-abuso §6)
GET  /salon/debug?token=<GEN_TOKEN>   (ADMIN)                    → sesiones REALES {pid,sala,ip,edadSeg} + salas del bodegón
```

### ¿La presencia es REAL? (validación — pregunta del dueño 2026-06-28)
**Sí, no hay nada simulado:** cada sesión "jugando ahora" = un navegador real que mandó `/salon/beat` en los últimos
35s (el `SALON` Map es in-memory, sólo lo llena ese beat; cero seed/fake/bots en el código). **Para validarlo a mano:**
`GET /salon/debug?token=<GEN_TOKEN>` (admin, token-gated, infra-35) devuelve las **sesiones con su IP** (capturada de
`X-Forwarded-For` en `/salon/beat` y `/salon/join`) + antigüedad + las salas del bodegón. Sin token → 403. También se
ve en los **logs del proxy** (cada beat es un request real). **A futuro (Grafana):** exportar el `count`/byRoom como
métrica Prometheus para un panel — hoy la validación directa es el endpoint `/salon/debug` + los logs.

## 3. Los dos pisos (diseño de gameplay)

### 3.1 CINE EN VIVO (F1 — barato, alto wow)
- Sala nueva `cine-live` (theme `cine`, tag `cine-live`), wireada arriba del cine de noticias. La **pantalla** (donde
  hoy van las noticias) muestra un **dashboard del mundo vivo**, por `GET /salon/live` (SSE o poll 5s):
  - **"N jugando ahora"** (ya lo calcula `presence.js`; lo enriquecemos).
  - **Mapa/heatmap por zona:** "3 en la cueva · 1 en el chino · 2 en la calle bajo tormenta".
  - **Ticker de hitos anónimos** (agregado del `tel(...)`/`applyEdge` que YA emitimos): *"alguien le ganó al tahúr"*,
    *"alguien escupió dólares en Florida"*, *"entró un linyera al búnker"*. Anonimizado.
  - **[R]** lo lee en voz alta (reusa el TTS del cine).
- **Cero posiciones en tiempo real acá** — es un "panel de la Matrix". Reusa `presence.js` (heartbeat) + un endpoint
  de agregados. **Se prototipa primero**: sensación de mundo vivo con mínima plomería.

### 3.2 BODEGÓN (F2 — encuentro real-time)
> **✅ F2a HECHO (v211):** la sala `bodegon` existe (9º piso del cine, `tags:['cine','bodegon']`, theme `shop`, mesas
> redondas + parrilla + barriles + mozos canned) y el **gag de la rubia y el ropero §3.2.2 está implementado** (NPC
> `moza` → `handleMoza` en game.js: oferta → 2ª E = sí → flash + `ejectToStreet`).
>
> **✅ F2b.1 HECHO (v212 / infra-33):** el **encuentro real-time por SSE** funciona. **Decisión de infra (§7) tomada:**
> el `salon-server` vive en el **mismo `ai-proxy`** (no en `online-game`, que es Python pesado; no en un servicio nuevo).
> Relay SIN autoridad: `POST /salon/join` (matchmaking, cap 6) + `GET /salon/stream` (SSE) + `POST /salon/pos|say|leave`.
> Cliente `js/salon.js` (`Salon.join/onPeers/getPeers/pos/say/leave/inBodegon`); game.js: `syncBodegon` (join/leave al
> entrar/salir), `drawBodegonPeers` (interpola + nick + emote + globo), heartbeat de pos en el loop, teclas 1-4 emote /
> 5-8 frase preset. **Degradación total:** sin red/`EventSource` → bodegón single-player (mozos canned + gag), nadie nota.
> **✅ F2b.2 HECHO (v213/infra-34):** **chat PRIVADO 1-a-1** (§3.2.1) — `E` cerca de un peer → `#chat` en modo peer →
> `Salon.whisper` → relay dirigido `/salon/whisper` (solo al destinatario, efímero, rate-limit). **✅ F2b.3 + T2b
> HECHO (v243):** en el TOP-DOWN, [E] sobre un peer → chat privado; el peer es un punto de interacción real.
>
> **🔧 REWORK (v245 · infra-43) — MESAS SERVER-AUTHORITATIVE + chat + peers que caminan.** Playtest del dueño con 2
> navegadores: el truco no pareaba (matchmaking P2P frágil: "doble host" del a6, invitación 1v1 sin timeout), el chat
> no mostraba lo del otro (el toast del HUD es **invisible en el top-down**), y los peers se veían **sentados estáticos**
> (`bodegon.js` posteaba `Salon.pos(11,0)` FIJO). **Validé el transporte primero** (2 clientes curl): SSE/whisper/pareo
> OK → era todo lógica del cliente. Solución: **el LOBBY lo hace el SERVER** — mesas `1v1`/`6` por sala-instancia +
> `POST /salon/table {sit|leave}` → `table-update`/`table-start`/`table-end`. El server parea (1v1=2; 6=≥2+cuenta 8s o
> lleno), elige host (orden de llegada) y emite `table-start {seats,seed}`; tras emitir, la mesa se VACÍA (rendezvous).
> Se eliminó el handshake P2P (`tk-inv`/`t6-inv`). La PARTIDA ya arrancada sigue por whisper (reusa los motores
> `truco-net`/`truco-pvp` tal cual). **Chat**: el mensaje entrante AUTO-ABRE el panel. **Peers caminan**: `Salon.pos`
> lleva `(x,y)` real + relay; el top-down dibuja a los peers en su pos viva interpolada. Mesa **1v1 nueva** + la de 6.
> Observable con `/salon/debug` (muestra las mesas). Validado en prod (2 clientes → `table-start`). **truco.md §13/§14
> siguen iguales por dentro; solo cambió cómo se arma la mesa.**
>
> **✅ F3 HECHO — TRUCO PvP HUMANO (v240 · infra-41):** truco **1v1 contra otro jugador real** en el bodegón top-down.
> Te acercás a un peer **sentado** → **[E] invitar** → acepta → partida COMPLETA (envido/flor/truco, mejor de 3) con
> premio en **flores**. **Host-autoritativo** (`host=min(pid)` tiene las dos manos + valida + empuja vistas que no
> revelan la mano del rival) sobre el **mismo whisper del salón** (mensajes JSON `tk-*`; cap subido para las vistas).
> El salón **no se desconecta** durante el match (heartbeat propio); al terminar volvés al bodegón. Motor puro
> testeado `js/truco-net.js` + escena `js/truco-pvp.js` + targeting de peer en `js/bodegon.js`. Detalle: `truco.md §13`.
>
> **✅ TRUCO DE A 6 (3v3) hecho (v241 · infra-42):** mesa fija "TRUCO 6" en el bodegón → te sentás → **lobby** (el
> host invita a los peers; los que aceptan ocupan asientos, los vacíos los llenan **bots de IA**) → **3v3 real** con
> la **regla de la casa** del dueño (bazas global/1v1 + umbral 10; `truco.md §14`). Host-autoritativo (maneja los
> asientos IA por heurística + empuja vistas a los humanos). `js/truco-net6.js` + `js/truco-pvp6.js`. **Watchdog de
> reconexión** (cierra la deuda del 1v1): un humano que se va → en a6 lo toma la IA, en 1v1 cierra el match (reusa la
> presencia del salón). **Deuda v1:** host malicioso (relay sin autoridad); la regla de la casa es interpretación a
> validar; contraflor real en 3v3.

- Sala nueva `bodegon` (theme nuevo: madera, mesas redondas, mantel, parrilla, vino, fernet). Subís por el ascensor
  del cine. Al entrar → `POST /salon/join` te mete en una **sala-instancia chica (cap ~6)**:
  - **Matchmaking simple:** el server llena la sala actual hasta `cap`; cuando se llena, abre otra. "De a dos suben y
    se encuentran" = caés en la sala con gente esperando (o esperás vos, con mozos canned de relleno mientras tanto).
  - **Co-presencia real:** ves a los otros como **avatares que se mueven** (tu cliente postea `pos` ~6/s, recibe las de
    los demás por el `stream` SSE, con **interpolación** suave como cualquier .io). Caminás, te sentás a una mesa,
    tirás **emotes** (🍻🤝💃🎸) y **frases preset** porteñas ("¿todo bien maestro?", "salú", "tomá que van").
  - **Mesas = puntos de interacción compartida** (§3.3).
- **Degradación:** sin `salon-server` → el bodegón es un bar vacío con mozos canned (NPCs), jugable solo. Nadie nota
  que "faltaba" el online.

#### 3.2.1 Chat del bodegón — PÚBLICO vs PRIVADO (idea dueño 2026-06-27)
- **Público:** hablás y sale un **globito para TODOS** los de la sala (mensaje sobre tu cabeza, lo ven todos).
  ✅ **HECHO (v212):** frases preset (teclas 5-8) → evento `say` broadcast → globo sobre la cabeza del que la tiró.
- **Privado 1-a-1:** te **acercás a otro jugador y apretás `E`** → se abre un **chat privado** entre vos y ese (panel
  de chat, solo lo ven los dos). Reusa el panel de chat de la IA (`#chat`) pero ruteado por el `salon-server` al peer.
  ✅ **HECHO (v213/infra-34):** `nearestPeer()` (≤1.3 tiles) → `openPeerChat` (reusa `#chat` en "modo peer", `peerChat`
  en game.js) → `peerChatSend` → `Salon.whisper(to, msg)` → `POST /salon/whisper` → el proxy lo manda **SOLO al stream
  del destinatario** (`r.streams: Map<pid,res>`). Entrante: `onPeerWhisper` (si el chat está abierto con él lo agrega;
  si no, aviso `g.bodegon.privFrom`). Texto **efímero** (no se guarda), rate-limit ~1.4/s, cap 200 + saneo de control.
- *(§6: el público es preset/emotes = **sin moderación**; el privado 1-a-1 es texto libre pero **acotado** —solo a
  alguien de TU sala-instancia, efímero, rate-limitado—. Moderación/reportes del texto libre = a futuro si se decide.)*

#### 3.2.2 La RUBIA del bodegón y el ROPERO — gag recurrente (idea dueño 2026-06-27)
- En el bar atiende una **moza rubia explosiva** (NPC canned, no es un jugador): te sirve y **siempre te quiere llevar
  a "probar unos tragos" en la puerta de atrás**. Es un **honeypot**.
- Si le decís **que sí** y entrás al fondo → sale un **ROPERO de dos metros** (patova gigante) y **te RAJA del bar**
  (te echa a la calle, tipo `ejectToStreet`). Gag que se repite (cada vez que caés). Humor porteño de bodegón.
- Implementación: NPC `moza` con `action` propia (oferta → confirmás → mini-cinemática del ropero → eject). Canned
  (no necesita el online); funciona aunque estés solo en el bar. Pensar premio/variante si insistís N veces.
- **✅ HECHO (v211):** `handleMoza(n)` en game.js (flag `mozaInvited`, se resetea al cambiar de sala en `spawnIn`):
  1ª E = la rubia te invita (`g.moza.invite`); 2ª E = decís que sí → `flash()` + `ejectToStreet(g.moza.ropero)`. NPC
  `La Rubia` (sprite `erotica`) en el bodegón. *(Falta la variante/premio si insistís N veces — deuda fina.)*

#### 3.2.3 VISTA TOP-DOWN del bodegón + el TELO de lujo (idea dueño 2026-06-28) — DISEÑO
El dueño propone rehacer la sala compartida como **vista de ARRIBA** (top-down), más linda para representar **mesas con
gente**, un **mostrador** y el gag de la rubia extendido a un **telo de lujo**.
> **Factibilidad: 🟢 ALTA.** Ya existe el patrón: `js/tienda.js` es un **sub-modo top-down COMPLETO** (player-círculo,
> grid+colisión, NPCs, `update/draw`, `done`/`exitTo` para volver al juego exacto), igual que super/arcade/spinoff. El
> bodegón top-down y el telo se hacen **clonando ese patrón** (sub-modo `salonTopdown` + `telo`), sin tocar el motor
> side-scroller. Los peers (Salon.getPeers) se dibujan en las mesas. **Tono:** registro **paródico/insinuado** (siluetas,
> vapor, corazones, fade) como ya hace el juego (sex-shop, telo "El Edén", el honeypot) — NUNCA explícito; el remate es el gag.
- **Bodegón top-down:** entrás (puerta del 9º piso) → sub-modo vista-de-arriba. **Mesas redondas** distribuidas, cada una
  con **sillas**; los **peers online** se sientan en las mesas (top-down). **Mostrador** a un lado con la **rubia (moza)**:
  te acercás + E = te atiende/te invita. **Puerta al costado** = la "trastienda" (antes el ropero directo; ahora lleva al telo).
  El presence/posiciones siguen por SSE (Salon); el render cambia, el relay no.
- **El TELO de lujo (sub-escena top-down nueva):** si aceptás la invitación → entrás a una **pieza de lujo vista de
  arriba**: **cama**, **jacuzzi**, **espejos por todos lados**, **pósters** de minas, y una **puerta rara**. Secuencia
  SCRIPTEADA (canned, single-player, insinuada): (1) ella se mete al **jacuzzi** → te metés → **ducha/chapuzón juntos**
  (vapor + 2 siluetas + corazones, fade — sin nada explícito). (2) Ella sale y va a la **cama**. (3) te metés en la cama →
  **al toque** sale un **OSO/ROPERO de 2 metros** ("urzo") de la puerta rara → te **persigue** por la pieza → te **raja
  de vuelta al bar** (`ejectToBodegon`, no a la calle: volvés al salón). Gag recurrente, el clásico "casi pero no".
- **Implementación (cuando se decida):** `js/telo.js` (sub-modo top-down clonado de tienda.js: pieza chica, props cama/
  jacuzzi/espejo/poster, FSM de la secuencia, el oso = entidad que persigue con pathing simple en grid) + lanzado por el
  `action:'moza'` (en vez del eject directo) cuando aceptás. El bodegón top-down (`salon` sub-modo) es el cambio más
  grande (rehace el render de la sala); el telo se puede hacer **primero** y solo (gag autocontenido) aunque el bodegón
  siga side-scroller. i18n del guion (insinuado/cómico). Reusa `ejectToStreet`→variante `ejectToBodegon`.
- **Fases sugeridas:** **(T1)** el TELO solo (sub-modo `telo.js`, gag completo) colgado del `action:'moza'` actual —
  autocontenido, alto impacto, NO toca el multiplayer. **(T2)** rehacer el bodegón a **top-down** (`salon` sub-modo) con
  mesas + peers + mostrador. T1 no depende de T2.
- **✅ T1 HECHO (v217):** `js/telo.js` (sub-modo top-down, FSM jacuzzi→cama→oso→eject) lanzado por `enterTelo` desde
  `handleMoza` (aceptás → telo). Probado e2e.
- **✅ T2 HECHO (v218):** `js/bodegon.js` (sub-modo top-down): MESAS de madera + **peers ONLINE sentados** (presencia
  via `Salon.getPeers`, asignados a asientos) + **mostrador con la rubia** (E → invita → E → `goTelo` → lanza el telo) +
  salida (E/ESC → baja al cine8). **Emotes (1-4) y frases preset (5-8)** dentro del sub-modo (`Salon.pos/say`) + latido.
  Lanzado en `transition()` al entrar a la sala `bodegon` (si no hay sub-modo → cae al side-scroller, degradación). Tras
  el telo, si seguís en el bodegón, **relanza** el top-down. **✅ T2b + F2b.3 HECHO (v243):** te acercás a un peer
  sentado + **[E]** → **menú de interacción** (`drawPeerMenu`: [1] 🃏 truco 1v1 · [2] 💬 chat privado · [Esc]) → el
  peer es un punto de interacción real. El **chat privado 1-a-1 dentro del top-down** reusa `#chat` + `Salon.whisper`;
  el anidado del overlay con el sub-modo se resolvió con `peerChatFrom='bodegon'` → `closeChat` **re-entra al bodegón**
  (`enterBodegon()`) en vez de caer al side-scroller. i18n `g.bodegon.peerPrompt/peerMenu/peerMenuOpts`.

### 3.3 Qué hacés JUNTOS (el corazón — lo que no podés solo)
- **TRUCO PvP humano vs humano** ⭐: dos se sientan a una mesa → partida **persona contra persona** (reusa
  `js/truco.js`, motor puro ya testeado; el server relaya cantos/cartas). Es EL gancho social y casi gratis.
- **Brindis:** 2+ en una mesa con birra/fernet → animación + **flores a todos** + logro social.
- **Compartir comida:** pedís un asado/choripán para la mesa → **cura/buff a todos los sentados** (gastás vos, ganan
  todos = gesto cooperativo).
- **Trueque:** pasarle **caramelos/dólares/flores** a otro (intercambio explícito, confirmado por ambos).
- **Puerta co-op:** algo que **solo se abre con 2+** (quest co-op del grafo: "junten 3 flores entre todos", "uno toca
  A mientras el otro toca B").

## 4. Cliente (capa aditiva, `typeof Salon !== 'undefined'`)
- Nuevo módulo `js/salon.js` (patrón de `presence.js`/`Ads`): sin `ENDPOINT`/`fetch` → no-op total (e2e/headless ok).
  - `Salon.beat({sala,x})` desde el game loop (throttled) → presencia global.
  - En `cine-live`: `Salon.live(cb)` (SSE/poll) → render de la pantalla.
  - En `bodegon`: `Salon.join()` → `Salon.onPeers(cb)` (stream) + `Salon.pos(x,vx,emote)` + `Salon.say(phrase)`.
  - **Peers** = NPCs efímeros (reusa el render de NPC; sprite = avatar elegido + nick flotante). Se crean/borran por
    `peer-join/leave`. Interpolación cliente entre updates.
- Salas/wire en `level.js` (DATA, REGLA #0): 2 pisos nuevos del cine + `wire`. Probablemente sin campos nuevos en el
  schema (los peers no son data del nivel; son runtime).

## 5. Fases (de barato a co-op)
1. **F1 — CINE EN VIVO** ✅ **HECHO (v205)** (presencia + ticker agregado). Reusa `presence.js` + `/salon/live`. **Cero
   real-time de posiciones.** Máximo wow / mínimo riesgo.
2. **F2 — BODEGÓN**: **F2a ✅ HECHO (v211)** = la sala bodegón + mozos canned + gag rubia/ropero. **F2b.1 ✅ HECHO
   (v212/infra-33)** = co-presencia real por SSE (salas-instancia + posiciones interpoladas + emotes + frases preset:
   "subís y te encontrás con otro"). **F2b.2 ✅ chat privado 1-a-1 HECHO (v213/infra-34)** (`E` cerca de un peer →
   `#chat` ruteado por `/salon/whisper`, dirigido + efímero + rate-limit; **el chat en el TOP-DOWN se enganchó en v243**).
   **✅ F2b.3 HECHO (v243)** = peer sentado como punto de interacción (menú [E]: truco 1v1 / chat). (Público =
   preset/emotes → sin moderación, §6.)
3. **F3 — Co-op real**: **truco PvP** (reusa el motor) + brindis + compartir comida + trueque + 1 quest co-op.
4. **F4 — Identidad/escala**: nick ligado a `suscripcion` (opcional), más salas, y SI se agrega chat libre →
   moderación/rate-limit/reportes (`seguridad.md`).

## 6. Anti-abuso (decisión que ahorra MUCHO) → `seguridad.md`
- **Sin chat de texto libre en F2/F3**: solo **emotes + frases PRESET** (menú de porteñismos). Esto **elimina la
  moderación** (no hay texto arbitrario que filtrar) y sigue siendo expresivo. El chat libre queda para F4 con
  filtros/rate-limit/reportes si se decide.
- **Rate-limit** en `pos`/`say` (server). Identidad efímera por `pid`; `report/block` a futuro.
- **Denial-of-wallet:** el salón NO usa IA (es relay puro) → no toca el cupo de modelos. Barato.

## 7. Infra / preguntas abiertas
- **¿Dónde vive el `salon-server`?** ✅ **RESUELTO (infra-33):** vive en el **mismo `ai-proxy`**. Se descartó
  `online-game` (Python/FastAPI pesado, otro stack, otra DB → mal fit) y un Deployment Node nuevo (infra extra para un
  relay chico). El ai-proxy ya tenía `/salon/beat|live` (F1), es Node sin deps, mismo dominio/edge/pipeline de deploy, y
  el relay SSE no usa IA (no compite con el chat). In-memory (sin PVC; efímero = ok, social). Si algún día escala, se
  parte a un servicio aparte sin tocar el cliente (solo cambia la URL). Corre donde corre el proxy (nodo con headroom).
- **¿Cuánto aguanta el edge?** SSE = una conexión abierta por jugador en bodegón; el `maxconn` del G4/HAProxy es el
  límite real. F1 (cine) es liviano. F2 escala con salas chicas (cap ~6) → pocas conexiones por sala.
- **Matchmaking:** ¿global "primera sala con lugar" (simple) o por región/latencia? Propuesta: simple, una cola.
- **Reconexión:** se cae el SSE → reintento con backoff; mientras, el bodegón queda "solo" (degradación), no rompe.

## 8. Mi lectura
- **F1 (cine en vivo) es el quick-win brutal:** sensación de "mundo vivo" reusando `presence.js` + el telemetry que YA
  emitimos, sin real-time de posiciones. Lo haría primero — 70% del "ver a los otros" con 20% del trabajo.
- **F2 (bodegón) es el corazón** y es factible sobre SSE (relay de posiciones, sin autoridad). La clave de diseño es
  **qué hacés JUNTOS**: el **truco PvP** (reusa el motor puro) es el gancho que justifica subir, casi gratis.
- **La decisión que más ahorra:** **emotes + frases preset en vez de chat libre** → mata la moderación de F2/F3.
- **Degradación**: como todo el repo, sin backend los pisos son decorado y el juego sigue intacto. Cero riesgo de
  romper lo single-player.
