# SDD — CHAT LINYERA UX: ideas que quedan PICANDO (no tenés que contestar ya) + iconos de ESPERA

- **Estado:** **F1+F2 IMPLEMENTADOS (v290, 2026-07-02):** `js/ideas.js` (catálogo 9 ideas + `ts_ideas_v1` +
  grounding `g.idea.pend/done`) colgado de `evlog`/`memKey`/`groundTxt` en game.js; iconos de espera
  `chatThinking()` con `THINK_ICONS`. Testeado en e2e (`ideas:ok`).
- **La idea (dueño, textual):** *"que el linyera si te tira ideas de ver el cine no tengas que responderle YA —
  que se acuerde si le venís con eso. Y cuando le hablás y te quedás esperando, que haga iconos de
  sol/tormenta/vino/carne/diskette/chip para hacerte saber que está esperando."*
- **Relacionado:** `oracleMem` (memoria por identidad, cap 12 turnos, ya se retoma al reabrir el chat),
  `js/eventos.js` (bus + memoria del barrio + sync cross-device por nick), `worldBrief()` (grounding del
  ecosistema), `specs/latencia-chat.md` (la espera puede ser 2-11s → POR ESO el indicador), [[v2-engine-principios]].

## 1. IDEAS QUE QUEDAN PICANDO (el linyera se acuerda de lo que te sugirió)

### 1.1 El problema
Hoy si el linyera te tira "andate al cine, pibe" y vos cerrás el chat sin contestar, la sugerencia solo vive en
`oracleMem` como un turno más: si volvés a los 20 minutos con "che, fui", el modelo PUEDE acordarse (la historia se
retoma) pero nada se lo SUBRAYA — y si el turno cayó fuera del cap de 12, se perdió. No hay noción de
"idea pendiente" ni de "el pibe me hizo caso".

### 1.2 El diseño (data-driven, 3 piezas)
1. **Catálogo `IDEAS` (DATA):** cada idea = `{ id, rx, done }` — `rx` = regex ES/EN que la detecta en la RESPUESTA
   del NPC (ej. `cine: /cine|pel[ií]cula|pochoclo|movie|cinema/i`), `done` = matcher contra el bus de eventos que
   dice que el jugador LA HIZO (ej. evento `sala` con "cine", `minijuego`, `hito`). Ideas iniciales: **cine,
   bodegón/truco, piquete/Lavalle, obelisco, datacenter, carteles/tablón, arcade, búnker, chino**. El catálogo es
   chico y crece con el mundo (mismo espíritu que `VIBES`/`ANCHOR`).
2. **Registro `ts_ideas_v1` (persistente):** al llegar CADA respuesta del NPC → `Ideas.scan(npcKey, reply)`:
   si matchea una idea y no está ya pendiente → `{npc, idea, ts, done:false}` (cap ~10, LRU). **No hace falta
   contestar:** cerrás el chat y la idea queda. Lo notable va también a la memoria del barrio
   (`Eventos.remember('idea', …)`) → **viaja con tu nick** entre dispositivos y alimenta el chusmerío.
3. **El recuerdo, por GROUNDING (no por script):** al abrir/chatear con un NPC que tiene ideas registradas,
   se suma al grounding: *"vos le tiraste la idea de IR AL CINE hace 20 min y no te contestó — si te viene con eso,
   acordate y seguile la corriente"*; y si el bus dice que YA LA HIZO (`done:true` vía `Ideas.check(ev, detail)`
   colgado de `evlog`): *"el pibe TE HIZO CASO y fue al cine — felicitalo, chicaneálo"*. La VOZ la pone el modelo
   (nunca texto enlatado); claves i18n `g.idea.pend`/`g.idea.done` en ES/EN según `I18n.short()`.

### 1.3 Por qué así
- **Cero fricción:** no hay UI nueva ni obligación de responder — es memoria pura.
- **Cierra el loop:** sugerencia → acción del jugador → el NPC se entera por el BUS (el ecosistema alimenta a la
  IA, regla #0). El "¿y? ¿fuiste al cine como te dije?" sale solo.
- La detección por regex sobre texto libre es imperfecta (falsos negativos aceptables): si no matchea, no pasa
  nada — el chat sigue como hoy. Fail-open.

## 2. ICONOS DE ESPERA (el chat "piensa" con el mundo)

### 2.1 El problema
Entre que mandás el mensaje y llega la respuesta pasan **2-11s** (cadena free→pago→fallback, tope duro de
`latencia-chat.md`). Hoy se muestra un `...` estático → parece colgado.

### 2.2 El diseño
- La línea de espera (`chatLine('sys','...')`) pasa a ser un **ciclo animado de iconos del mundo** (los que pidió
  el dueño): **☀️ sol → ⛈️ tormenta → 🍷 vino → 🥩 carne → 💾 diskette → 🤖 chip**, uno por vez (~400ms) con
  puntitos progresivos (`☀️·`, `⛈️··`, `🍷···`…). Constante `THINK_ICONS` (DATA, un array — sin i18n: son iconos).
- Al llegar la respuesta (o el error) el interval se limpia y la línea se borra (mismo `thinking.remove()` de hoy,
  envuelto en un helper `chatThinking()` que devuelve `{el, stop}` para no filtrar intervals).
- Aplica a TODOS los chats que esperan la IA (linyeras, oráculos, hinchas, peronista, linyeras del telo).

## 3. FIX "responden largo y SE CORTA" (reporte del dueño, 2026-07-02 — v290/0.1.83)

- **Causa raíz:** el `ask()` del proxy mandaba `max_tokens: 120` — las personas piden "frases CORTAS" pero cuando
  el modelo se estira, OpenRouter corta el texto EXACTO en el token 120 → frase a la mitad ("y no tengo ni un
  caram"). El dueño lo intuyó bien: "yo los acorto".
- **Fix (2 capas, espejado proxy + BYOK):** (1) `max_tokens` 120→**220** (aire; el BYOK del cliente ya usaba 220);
  (2) **`tidyReply(text, finish_reason)`**: si el finish igual fue `length`, recorta a la **última frase COMPLETA**
  (`.`/`!`/`?`/`…`, arrastrando comillas de cierre) siempre que conserve ≥40% del texto; si no, cierra con "…"
  honesto. NUNCA se muestra el tajo a mitad de palabra. Solo aplica al chat (`!opts.gen` — los JSON de generación
  no se tocan).

## 4. Fases
- **F1 — iconos de espera:** `chatThinking()` + `THINK_ICONS` en game.js. *(Chico, puro cliente.)*
- **F2 — ideas:** `js/ideas.js` nuevo (aditivo, `typeof` guard): `scan(npcKey, reply)` + `check(ev, detail)`
  (colgado de `evlog`) + `groundFor(npcKey)` (se concatena al `groundTxt` existente) + persistencia `ts_ideas_v1`
  + `Eventos.remember`. Sumar a `SCRIPTS` del e2e + `index.html ?v=N`.

## 5. Notas
- `oracleMem` NO se toca: sigue siendo la memoria conversacional; las ideas son una capa encima (índice de
  "pendientes" que sobrevive al cap de 12 turnos).
- El grounding de idea se agrega SOLO si hay ideas registradas para ese NPC (sin ruido en el prompt).
- Privacidad: al barrio-mem va solo el ID de la idea (ej. "idea: cine"), nunca el texto del chat.
