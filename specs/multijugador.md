# SDD — Zona MULTIJUGADOR: el CINE en vivo + el BODEGÓN donde te encontrás con otro

- **Estado:** **DISEÑO (2026-06-27).** Idea del dueño aterrizada a arquitectura. Sin implementar — listo para prototipar F1.
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
```

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
> `moza` → `handleMoza` en game.js: oferta → 2ª E = sí → flash + `ejectToStreet`). Es el **modo degradado** del bodegón
> (single-player), que el propio diseño contempla. **FALTA F2b:** el encuentro real-time por SSE (`/salon/join|stream|pos`),
> que necesita el `salon-server` dedicado — depende de la decisión de infra de §7 (dónde vive). Hasta entonces, el
> bodegón es un bar canned jugable solo, y "nadie nota que faltaba el online".

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
- **Privado 1-a-1:** te **acercás a otro jugador y apretás `E`** → se abre un **chat privado** entre vos y ese (panel
  de chat, solo lo ven los dos). Reusa el panel de chat de la IA (`#chat`) pero ruteado por el `salon-server` al peer.
- *(Recordar §6: empezar con **frases preset + emotes** para el público sin moderación; el privado 1-a-1 con texto
  libre es más acotado y se modera/rate-limita aparte, fase posterior.)*

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
2. **F2 — BODEGÓN**: **F2a ✅ HECHO (v211)** = la sala bodegón (9º piso) + mozos canned + gag rubia/ropero (modo
   degradado single-player). **F2b PENDIENTE** = co-presencia real: salas-instancia + posiciones por SSE + emotes +
   frases preset ("subís y te encontrás con otro"). Necesita el `salon-server` (§7). (Sin chat libre → sin moderación, §6.)
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
- **¿Dónde vive el `salon-server`?** ¿Reusar el backend de `online-game` (ya tiene SSE+presencia en prod) o un
  Deployment Node nuevo `salon`? Propuesta: **servicio propio chico** (SSE), detrás del mismo edge HAProxy/Cilium, PVC
  solo si quiere persistir el ticker (si no, in-memory). **Pinear a un nodo con headroom (NO `srv-rk1-nvme-01`)** —
  lección del incidente DiskPressure (ver repo `infra`).
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
