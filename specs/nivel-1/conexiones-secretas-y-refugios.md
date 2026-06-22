# SPEC: Conexiones secretas y refugios (Nivel 1)

- **Estado:** Parcialmente implementado
- **Nivel:** 1 — Florida y Lavalle
- **Última actualización:** 2026-06-21
- **Decisiones tomadas:** el refugio es un **loop literal** (no un final); el colapso de los
  otros edificios es **fachada en ruinas + puertas bloqueadas** (ver RF-7 y §3.3).
- **Ya en código (v=37):** joyas→linyera te raja, **tótem de 3 monos** (RF-1/2), **búnker** del
  piso 20 (RF-3/4/5/6) y **loop** del catre (RF-8). **Pendiente:** colapso en **ruinas** de los
  otros edificios tras la tormenta (RF-7) y la persistencia del loop.

## 1. Contexto y objetivo

El Nivel 1 ya tiene una historia: comprás dólares en la cueva, el cuevero te caga, **estalla la
tormenta solar** y el espacio-tiempo se parte. Lo que falta dejar **explícito** es qué pasa
*después* del estallido: cómo se conectan las zonas secretas, qué lugares quedan habitables y
cómo el jugador puede **escapar** (pasar de nivel) o **refugiarse** (quedarse a sobrevivir).

Este spec documenta:
- el mapa de **conexiones secretas** (las que ya existen),
- el **loop post-tormenta** (escape vs. refugio),
- y una **feature nueva**: el **búnker de los linyeras**, al que se entra por una puerta secreta
  en el **piso 20** que se desbloquea robando un **tótem de 3 monos** (Monkey Island) en el piso 19.

> Es la primera forma de entrar al refugio. Habrá más (ver Preguntas abiertas).

## 2. Modelo del mundo (lo que ya existe)

Salas por índice real (de `Level.build()`):

| Sala | Qué es |
|---|---|
| **0** | Calle Florida y Lavalle (hub). Acá estalla la tormenta. Borrachines custodiando el edificio. |
| 4 | Arcade (4 máquinas). |
| 6 / 7 | Galería Subsuelo 1 / Sótano Subsuelo 2. |
| **8** | **LAS CUEVAS del dólar** (Subsuelo 3): 3 cueveros + disquería. El **cuevero 3 (`real`) te cambia y dispara la tormenta**. Este es "el arbolito que te cagó". |
| 9 / 10 | Lugar secreto (humo) / Trastienda del truco (Tahúr). |
| 13 | **Casa de Cambio Oficial**: repleta; tras la tormenta acá se abre el **PORTAL** = pasar de nivel (`win`). |
| **14–33** | **Edificio abandonado** de los borrachines, **pisos 1–20**. Piso `n` = sala `13+n`. Impares = **lujo**, pares = **ruina**. → **Piso 19 = sala 32**, **Piso 20 = sala 33**. |

### 2.1 Conexiones secretas que YA existen

1. **Arcade → lugar secreto → truco.** En el arcade (sala 4) hay una puerta `secret` que se
   **habilita ganando** Pac-Man + Galaga + Frogger (`checkSecret()` → `secretUnlocked`). Lleva a la
   sala 9 (humo) y de ahí a la 10 (Tahúr).
2. **Super chino → la cueva del cuevero.** Desde el modo super hay una **puerta secreta** que
   llama a `enterCuevaFromSecret()` y te deposita en la **sala 8** (las cuevas), al lado de la
   puerta `up`, con **+60 monedas** la primera vez (*"le sacás la guita al arbolito que te cagó"*).
   Los borrachines te **soplan esta pista** cuando te hacés socio VIP (`borrachosHappy`).

### 2.2 Estados relevantes que ya existen

- `stormed` — la tormenta ya estalló (la dispara el cuevero `real`).
- `borrachosHappy` — alimentaste a los 3 borrachines → **se abre el edificio** (salas 14–33).
- `secretUnlocked` — ganaste los 3 arcades → puerta secreta del arcade.
- `moneyRecovered` — ya le recuperaste la guita al cuevero por la puerta del super.

## 3. Diseño / narrativa: el loop post-tormenta

Cuando estalla la tormenta, **la sociedad colapsa**. La mayoría de los edificios se vuelven
**inaccesibles** (clausurados / derrumbados). El jugador queda con **dos caminos**:

- **(A) ESCAPE — pasar de nivel.** Ir a la **Casa de Cambio Oficial** (sala 13), ahora con el
  espacio-tiempo roto, y meterse en el **PORTAL** del fondo. *(Ya implementado: `win()`.)*
- **(B) REFUGIO — quedarse y entrar en el LOOP.** Esconderse en la **red de lugares conectados a la
  cueva del cuevero que te rajó** (sala 8 y lo que cuelga de ahí) y, sobre todo, en el **búnker de
  los linyeras**. Se vuelve **"tu casa"** porque **nadie más puede entrar**: es el lugar ilegal, a
  la sombra, fuera del radar de la sociedad. **Decisión: es un loop LITERAL** — quedarse no es un
  final, te mete en un **bucle temporal** (ver §3.3): la city se repite y volvés a arrancar.

### 3.1 Qué sobrevive y por qué

| Lugar | ¿Queda en pie? | Por qué |
|---|---|---|
| **Super chino** | Sí, **atrincherado** | Tachos con fuego, **granadas** y **ninjas samurái** en la puerta. Búnker comercial. |
| **Edificio de los borrachines** (14–33) | Sí, **habitable** | Nadie lo quiere: los borrachines son *"la escoria de la sociedad"*. Por eso sigue en pie y es refugio. |
| **La cueva del dólar** (8) y su red | Sí | Es ilegal/a la sombra; la sociedad colapsada no llega ahí. |
| **Casa de Cambio Oficial** (13) | Sí, pero es la **salida** | No es refugio: es el portal para escapar. |
| **Cemento** (12) | Sí | El under aguanta y **Iorio** es clave en el loop (falopa → abre el chino). Ver [`loop-supervivencia.md`](loop-supervivencia.md). |
| **Todo el resto** (EducaciónIT, Garbarino, Chorería, arcade) | **No** | Colapsa / clausurado. No se puede entrar tras la tormenta. |

### 3.2 El búnker de los linyeras (feature nueva)

Dentro del edificio de los borrachines, el **piso 20 (sala 33)** tiene una **puerta secreta** que
está **cerrada** hasta que el jugador hace lo siguiente en el **piso 19 (sala 32, lujo)**:

> Intenta **robar un TÓTEM SAGRADO de 3 cabezas de mono** (ítem de **Monkey Island** — el chiste
> del *"mono de tres cabezas"*).

Al intentar agarrarlo, **aparecen 20 linyeras** y, en vez de echarte, te **consagran gurú**:

> *"¡Pará, pibe! Encontraste a nuestro dios de la isla **Monkey Island**... sos nuestro **GURÚ**.
> Tenés la puerta del **piso 20**: te lleva al lugar más seguro, **nuestro búnker** —por si la
> sociedad decide darnos planes y obligarnos a laburar. Para vos queda **siempre abierta**."*

Desde ese momento, la puerta del piso 20 **queda abierta para siempre** y lleva al **BÚNKER**
(sala nueva): el lugar **más seguro** del nivel.

### 3.3 El loop (loop = supervivencia, storm-gated)

> **Refinado:** el loop **NO es un "reset limpio" del nivel** (eso quedó descartado). Es un **ciclo de
> supervivencia post-tormenta**: cada día que dormís, el mundo **sigue en el caos** de la tormenta y
> tu vida se gasta. Todo el detalle está en **[`loop-supervivencia.md`](loop-supervivencia.md)**.

- **Solo existe con la tormenta estallada (`stormed`).** Antes, el búnker es inerte y **dormir no
  hace nada** *(ya en código, v=38)*.
- **Disparador:** el **catre** del búnker (`action:'loop'`): dormir = **pasa un día** (`loopCount++`),
  pero **el mundo sigue igual** (no se reinicia la city desde cero).
- **Meta: sobrevivir.** La vida **decae −3/30 s**; hay que salir a **comprar comida al chino**
  (atrincherado) — por la **puerta trasera** o consiguiendo que **Iorio** corra a los ninjas.
- **Recursos al loopear:** la **falopa** de los cajones de lujo **se resetea** cada vuelta; las
  **monedas** de los linyeras quedan **parciales y aleatorias** (ni todo ni nada).
- **Muerte (vida 0):** **volvés al loop anterior** (`loopCount − 1`), no es game-over seco.
- **El loop NO termina solo:** seguís **hasta que VOS** salís por el **portal** de la Casa de Cambio
  (la única salida hacia adelante).

### 3.4 Colapso de la ciudad (decisión: fachada en ruinas)

Tras `stormed`, los edificios que **no** son refugio ni salida **se derrumban**: además de
**bloquear la puerta** (no entrás), se les **cambia el arte de la fachada a una versión en ruinas**
(escombros, vidrios rotos, fuego), para que se **vea** el colapso, no solo se sienta. Ver RF-7.

## 4. Requisitos funcionales

- **RF-1** — En la **sala 32** (piso 19) existe un ítem interactivo **"Tótem de 3 monos"**
  (sprite nuevo, p. ej. `totem_monos`), **distinto** del maletín/linyera del depto de lujo.
- **RF-2** — Interactuar (`E`) con el tótem **la primera vez** dispara el set-piece de los 20
  linyeras (copy canónico de §3.2) y setea `bunkerUnlocked = true`. Re-interactuar muestra una
  variante corta. **El tótem no se puede llevar** (es un disparador, no un pickup).
- **RF-3** — Con `bunkerUnlocked = false`, la **puerta secreta del piso 20** (sala 33) **no es
  usable ni visible**. Al pasar a `true`, queda **visible y siempre abierta**.
- **RF-4** — La puerta secreta del piso 20 lleva a una **sala BÚNKER nueva** (ida y vuelta wired).
- **RF-5** — El **búnker es seguro**: **sin enemigos**, tono de refugio (linyeras tranqui, fogata,
  etc.). Es un destino de "quedarse", no un `win`.
- **RF-6** — **No rompe el final**: la **Casa de Cambio (13)** sigue siendo la única vía de **pasar
  de nivel**. El búnker es alternativa de **refugio**, no victoria.
- **RF-7** *(colapso post-tormenta = fachada en ruinas)* — ✅ **Implementado (v=50).** Tras `stormed`,
  los edificios que **no** son `{super, abandonado, red de la cueva, casa de cambio, cemento}` —o sea
  **EducaciónIT, arcade, chorería, Garbarino** (`COLLAPSED` en game.js)— quedan **clausurados**:
  **(a)** su puerta no entra y tira un mensaje ("derrumbado / clausurado"), y **(b)** se les dibuja
  **tablones cruzados** (`Art.decor.tablones`) + cartel CLAUSURADO sobre la fachada.
- **RF-8** *(loop = supervivencia, storm-gated)* — En el **búnker**, el **catre** (`action:'loop'`)
  **solo funciona post-`stormed`** *(ya en código, v=38)*. Dormir = **pasa un día** (`loopCount++`)
  manteniendo el mundo en caos (no reset). El ciclo de supervivencia completo (vida −3/30 s, comida,
  falopa, Iorio, muerte→loop anterior) está en **[`loop-supervivencia.md`](loop-supervivencia.md)**.

## 5. Estados y flags

| Flag | Tipo | Transición |
|---|---|---|
| `bunkerUnlocked` | bool | `false` → `true` al disparar el tótem (RF-2). Habilita la puerta del piso 20. |
| `totemSeen` | bool | marca si ya se mostró el monólogo largo (para variar en re-interacción). |
| `loopCount` | int | +1 cada vez que se usa el loop del búnker (RF-8). Guiño "Día #N". |
| *(existentes)* `stormed`, `borrachosHappy`, `secretUnlocked`, `moneyRecovered` | bool | Ver §2.2. `stormed` además dispara el colapso/ruinas (RF-7). |

## 6. Criterios de aceptación

- La **sala 32** referencia el ítem del tótem y su **sprite existe** en `Art` (lo valida la
  auditoría de assets del e2e).
- Existe una **sala BÚNKER** en `Level.build()`, **sin enemigos**, con puerta de vuelta wired.
- Con `bunkerUnlocked = true`, la **puerta del piso 20 (sala 33)** queda wired al búnker; con
  `false`, no se puede usar.
- **`node tests/e2e.js` sigue en verde** (assets de todas las salas resuelven; sub-modos corren).
- La **Casa de Cambio (13)** sigue ganando el nivel tras la tormenta (no se rompe el final).

## 7. Preguntas abiertas

1. **Implementación del tótem:** ¿NPC invisible con `action:'totem'`, o un decor con hitbox de
   interacción? *(Sugerencia: NPC con sprite `totem_monos` + `action:'totem'`, igual que el
   linyera del maletín.)*
2. **Los "20 linyeras":** ¿se dibujan 20 de verdad o es un set-piece con varios sprites `linyera`
   + el mensaje? *(Sugerencia: dibujar unos cuantos, no hace falta 20 entidades reales.)*
3. ~~**Colapso de los otros edificios (RF-7).**~~ ✅ **DECIDIDO:** **fachada en ruinas + puerta
   bloqueada** (RF-7, §3.4).
4. **El búnker, ¿da algo?** ¿checkpoint/guardado, loot, un NPC que cuenta lore del satélite/IA?
5. ~~**¿"Loop" literal?**~~ ✅ **DECIDIDO:** **loop literal** — quedarse reinicia el nivel en bucle
   (RF-8, §3.3). Sub-decisión pendiente: **qué persiste** al loopear (propuesta: reset total +
   `loopCount`).
6. **Más entradas al refugio:** el tótem es **una** forma; listar y especificar las próximas.
