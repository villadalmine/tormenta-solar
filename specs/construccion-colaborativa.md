# Construcción colaborativa — carteles + datacenter (estilo Death Stranding)

**Estado:** **C1 (carteles MVP) IMPLEMENTADO (v232 · infra-36, 2026-06-29)** — ver §8. Falta C2 (IA deja carteles) y todo
el datacenter (D1/D2). **Origen:** idea del dueño (2026-06-28). Dos features nuevas de
**"construir algo entre todos"** (asincrónico/colaborativo, à la Death Stranding) montadas sobre **pisos vacíos del
cine**, reusando el `salon-server` (relay del bodegón, ya en el `ai-proxy`) y el patrón de **bancos JSON-en-PVC**.

- **Relacionado:** [[multijugador.md]] (salon-server SSE F2b), `carteles-ia.md` (propaganda/IA), `modelo-de-entidades.md`
  (§6.95 meta-progresión cross-run, §6¾ 3 capas de estado), `publicidad.md` (slots/rects), `historia-grafo.md` (aristas).

---

## 1. Las dos ideas (del dueño, textual)
### 1.1 Carteles colaborativos (Death Stranding)
- **2 pisos vacíos más del cine** donde podés **dejar carteles**. Iterás con una **computadora** en la sala que te deja
  **crear** un cartel. El cartel tiene un **chat/texto con X caracteres máximo** (corto, para que NO ocupe todo).
- El cartel **dura hasta que ALGUIEN lo lee**; una vez leído, **se borra** (consumo en lectura).
- Desde la sala **ves cuántos carteles tenés activos, cuáles y dónde**.
- La **IA del salón también interactúa** (deja carteles), pero **acotada**: si no, no queda espacio.
- Los carteles **no son más que rectángulos** que dicen **quién lo hizo**, y se **maximiza el espacio** para que entren
  los más posibles (empaquetado).

### 1.2 Datacenter colaborativo
- **Otro piso** donde **construís un datacenter**. Con una **computadora** elegís **partes** que **pagás con plata o
  caramelos**. **Todos ven el estado** de lo que se construye. Ayudás a construir el datacenter **para destruir la IA**
  que manipula todo y hace estallar las tormentas solares.
- El datacenter **sobrevive a los niveles** (viajás en el tiempo para construirlo) y **siempre ves esta sala, no importa
  en qué nivel estés**.
- Es **colaborativo y GLOBAL**: si **alguien lo construyó antes** (en el mismo momento que vos jugabas), se te **guarda
  en tu sesión**. Estado compartido por toda la comunidad.

---

## 2. Veredicto de factibilidad (resumen)
| Feature | Factibilidad | Por qué | Riesgo principal |
|---|---|---|---|
| **Carteles** | 🟢 **Alta** | Es un **tablón compartido** con cupo + consumo-en-lectura. Reusa el salon-server (ai-proxy) y el patrón de banco PVC. El render = empaquetado de rects (ya hay slots de publicidad). | **Moderación** del texto libre (carteles los escribe el jugador) |
| **Datacenter** | 🟡 **Media-alta** | El estado es **un contador global de partes** (server-side, simple). La economía reusa monedas/caramelos. La sala "siempre visible" es trivial en N1; el multinivel es a futuro. | Definir el **post-100%** (evento único global) + persistencia PVC |

**Conclusión:** ambas son **factibles** y encajan limpio con lo ya construido. Los carteles son casi un "modo nuevo del
salón"; el datacenter es **una meta de comunidad** que le da **propósito al endgame** (matar a la IA del satélite, que ya
está sembrado en `g.win.text`). Recomiendo **carteles primero** (más chico, valida el patrón) y datacenter después.

---

## 3. Qué se REUSA (nada nuevo de infra mayor)
- **salon-server = el mismo `ai-proxy`** (decisión infra-33): ya tiene relay in-memory + SSE. Los carteles y el datacenter
  son **dos bancos más** (como noticias/propaganda/historias), pero **mutables por el jugador** (no solo por cron).
- **Persistencia = bancos JSON-en-PVC** (como `gen-historias`): a diferencia del bodegón (efímero in-memory), acá el
  estado **debe sobrevivir reinicios** del proxy (un cartel espera horas a su lector; el datacenter es permanente). → PVC.
- **Economía** = monedas/caramelos del `player` (ya serializadas en el save).
- **Render de rects** = el sistema de slots de `publicidad.md`/`ads.js` (rectángulos posicionados en una sala) da la base
  para empaquetar carteles.
- **Grafo** = aristas `hist` autoradas en fichas → `gen-historia.mjs` → `historia.js` (desbloqueo de pisos + hito final).
- **Pisos del cine** = `level.js` data (tags + `wire`), igual que cine1..cine9. **OJO:** cablear SIEMPRE la puerta nueva
  (`wire(...)`) — el bug v214 fue olvidar `wire(cine8→cine9)` y el juego se trababa. Hay un guard en `transition()` ahora.

---

## 4. CARTELES — diseño detallado
### 4.1 Modelo de datos (data-driven, REGLA #0)
Un **cartel** = objeto plano: `{ id, floor, slot, author, nick, text, ts, ai }`.
- `floor` = cuál de los 2 pisos (ej. `carteles-1` / `carteles-2`, tags en level.js).
- `slot` = índice de celda en la **grilla de empaquetado** del piso (el server asigna el 1º libre).
- `author` = `pid` (o `ai` si lo dejó la IA); `nick` para mostrar "quién lo hizo".
- `text` = capado a **N chars** (ej. 80) — corto a propósito.
- `ts` = cuándo se creó (para ordenar/expirar viejos si hace falta).

El **piso** declara su capacidad (ej. `cap: 24` celdas) en level.js como data. **Maximizar espacio** = celdas chicas de
tamaño fijo, empaquetadas (grilla M×K sobre la pared). Cartel = rectángulo con el **nick** y, al acercarte/leer, el texto.

### 4.2 Endpoints (ai-proxy, banco MUTABLE + PVC)
```
GET  /carteles?floor=F                 → { cap, used, signs:[{id,slot,nick,text,ai,ts}] }
POST /carteles {pid,nick,floor,text}   → crea si hay slot libre (cupo). 409 si lleno. Rate-limit por pid.
POST /carteles/read {pid,id}           → CONSUMO: marca leído → BORRA el cartel (si el lector != autor). Devuelve el texto.
GET  /carteles/mine?pid=P              → los MÍOS activos (cuáles y en qué piso/slot) — para la computadora.
```
- **Consumo-en-lectura:** un cartel se borra cuando **otro** jugador (no el autor) lo "lee". "Leer" = te acercás y
  apretás E sobre el rect → `POST /carteles/read` → muestra el texto en grande + lo borra del banco (libera el slot).
- **Cupo de la IA:** la IA del salón deja carteles (cron `gen-carteles.mjs` o on-demand), pero el server **reserva** que
  los de IA no superen, p.ej., el 30% de `cap` (así siempre queda lugar para jugadores). Si está lleno, la IA no postea.
- **Persistencia:** PVC JSON (banco), poda de carteles muy viejos (ej. >7 días) para que no se "tranquen" slots.

### 4.3 Cliente + sala (game.js / level.js)
- 2 pisos nuevos del cine (`tags:['cine','carteles']`), cada uno con una **computadora** (`machine`/`npc action:'compu'`).
- La **computadora** abre un overlay (reusa el patrón de `#vecinomenu`/`#invmenu`): **(a) crear cartel** (input de texto
  capado a N chars + botón "fijar") → `POST /carteles`; **(b) mis carteles** (lista `GET /carteles/mine`: texto + piso +
  estado). Sin red → "modo offline" (no podés fijar; degradación, como el bodegón).
- **Render:** `drawCarteles(r)` (capa aditiva tipo `drawBodegonPeers`/`drawSalonScreen`): empaqueta los `signs` del piso
  en la grilla, cada uno = rect con el **nick**; al acercarte, resalta y muestra "[E] leer". Refresca por poll (~5s) o SSE.
- **Leer:** E sobre un cartel cercano → `POST /carteles/read` → cartel grande en pantalla (overlay) + se borra (animación).

### 4.4 Anti-abuso (DECISIÓN ABIERTA — el texto es del jugador)
El bodegón evitó moderación con **frases preset**. El cartel es **texto libre** → reintroduce el problema. Opciones:
1. **Preset + relleno** (plantillas: "Buscado: ___", "Cuidado con ___", "Gracias ___") → sin moderación, menos expresivo.
2. **Texto libre corto** (80 chars) + **rate-limit** + **filtro de palabras** simple + reporte → más expresivo, algo de riesgo.
3. **Moderación por IA** (el proxy ya tiene IA): cada cartel pasa por un check rápido antes de publicarse → caro/latencia.
**Recomendación:** **(2)** para empezar (corto + rate-limit + lista negra básica), consumo-en-lectura limita la exposición
(1 solo lector y desaparece). Subir a (3) si hace falta. Documentar en `seguridad.md`.

### 4.5 Grafo
- Desbloqueo de los pisos de carteles = arista(s) `hist` (ej. al hacerte gurú, o siempre disponibles desde el cine).
- Los carteles **no** son del grafo de historia (son runtime/social), igual que el bodegón. La compu sí puede ser un nodo.

---

## 5. DATACENTER — diseño detallado
### 5.1 Modelo (estado GLOBAL compartido, server-side)
Un **único** objeto global (no por jugador): el datacenter de toda la comunidad.
```
DATACENTER = { parts:{ cpu:N, gpu:N, disco:N, red:N, enfriamiento:N, energia:N }, progress, done, contributors:{pid:count}, ts }
```
- **Catálogo de PARTES = DATA** (REGLA #0): `PARTS = [{ id:'gpu', name, cost, pay:'coins'|'caramelos', contributes:10, max }]`.
  El `progress` = suma ponderada de partes / objetivo. `done` = progreso ≥ 100%.
- **Pago client-side:** elegís una parte en la computadora → si tenés la guita/caramelos, se **descuenta del player** y
  `POST /datacenter/contribute {pid, part}` incrementa el global. El server valida cupos por parte (`max`) y rate por pid.

### 5.2 Endpoints (ai-proxy, estado global PVC, PERMANENTE)
```
GET  /datacenter                       → { parts, progress, done, top:[contributors], updated }
POST /datacenter/contribute {pid,part} → suma la parte (valida part del catálogo, cupo, rate-limit). Devuelve el nuevo estado.
```
- **Persistencia:** PVC JSON, **permanente** (no se poda). Es la **meta-progresión de comunidad** (cross-run, cross-player).
- **"Se te salva en tu sesión":** al entrar a la sala (o al cargar la partida) hacés `GET /datacenter` → tu cliente
  **refleja** el estado global. Si otro sumó partes mientras jugabas, las **ves** (poll/SSE). No hay estado local que
  diverja: el datacenter es **del servidor**, el cliente solo lo muestra y contribuye.

### 5.3 La sala "siempre visible, no importa el nivel"
- **N1 (hoy):** un piso del cine (`tags:['cine','datacenter']`) con la computadora + la **maqueta** del datacenter que
  crece (render por `progress`). Suficiente para el alcance actual (solo existe el Nivel 1).
- **Multinivel (futuro, `modelo-de-entidades.md`):** la sala datacenter = **room GLOBAL/hub** referenciada por TODOS los
  niveles (un `building` compartido en el modelo, o un portal/atajo presente en cada nivel). El estado ya es global por
  diseño (server), así que "viajás en el tiempo y el datacenter sigue ahí" cae solo. **Decisión a futuro:** ¿se entra por
  un portal fijo (tipo stargate) o cada nivel declara una puerta al hub? → atar con `spinoff-stargate.md`.

### 5.4 Render + cliente
- `drawDatacenter(r)`: una **maqueta** (racks que se van llenando) proporcional a `progress`; barra global + "lo armó la
  comunidad: N jugadores". Poll `GET /datacenter` ~5s (o SSE si querés vivo).
- Computadora = overlay (catálogo de partes con su `cost`/`pay`; deshabilita lo que no podés pagar). Sin red → "offline"
  (ves la maqueta cacheada, no podés contribuir). Degradación total.

### 5.5 El PAGO NARRATIVO (grafo + endgame)
- **Hito del grafo:** `datacenter_done` (progress ≥ 100%). Cuando se completa (**evento global**), se dispara la arista
  final: **se destruye la IA del satélite** → desbloquea un **final nuevo / cinemática** (pago de `g.win.text`: "los
  linyeras tenían razón, era la IA"). Esto le da **propósito** a todo (matar a la IA que ata el sol).
- **DECISIÓN ABIERTA — el post-100%:** ¿qué pasa cuando la comunidad lo termina?
  - (A) **Evento único global** ("temporada"): se completa una vez, todos ven el final, y queda como hito histórico
    (o se reinicia a una v2 más cara = nueva temporada).
  - (B) **Permanente:** una vez hecho, queda hecho para siempre para todos (el mundo "ya salvado"); los nuevos jugadores
    lo ven completo (menos sentido de aporte).
  - **Recomendación:** **(A) temporadas** — más rejugable y siempre hay algo que construir. Atar con `modelo-de-entidades.md`
    §6.95 (meta-progresión) + §6¾ (content-packs/temporadas por fecha).

### 5.6 Anti-abuso
- Contribuir **solo SUMA** (no se puede sabotear) → grief bajo. **Rate-limit** por pid + **cupo por parte** evitan que
  uno solo lo termine en 5 min (que sea **colaborativo** de verdad). El pago es en moneda de juego (no real) → sin
  denial-of-wallet. El server **valida** el part contra el catálogo (no acepta basura).

---

## 6. Persistencia — el cuadro completo
| Estado | Dónde vive | Vida | Patrón |
|---|---|---|---|
| Posición/emote de peers (bodegón) | server in-memory | efímero (sesión) | salon F2b (ya hecho) |
| **Carteles** | **server PVC (banco)** | hasta que alguien lo lee (o poda 7d) | banco mutable por jugador + IA |
| **Datacenter (global)** | **server PVC (1 objeto)** | permanente / por temporada | meta-progresión de comunidad |
| Monedas/caramelos gastados | `player` (save local) | partida | save.js (ya hecho) |
| "Mis carteles activos" | derivado del banco (`GET /carteles/mine`) | — | sin estado local (lo dice el server) |

**Regla:** el estado **compartido** (carteles, datacenter) es **del servidor**, NO del save local — así "lo que hizo otro
se te salva en tu sesión" sale gratis (tu cliente solo refleja el server). El save local solo guarda lo **tuyo** (guita,
qué pisos desbloqueaste). Esto es exactamente la separación de las **3 capas de estado** de `modelo-de-entidades.md` §6¾
(definición / partida / meta-progresión), acá con la meta-capa **server-side y de comunidad**.

---

## 7. Grafo (aristas nuevas, autoradas en fichas → gen-historia.mjs)
- `carteles_unlock` (al X) → habilita los 2 pisos de carteles.
- `datacenter_unlock` (al X) → habilita el piso del datacenter.
- `datacenter_done` (cond: progress≥100% global) → **destruye la IA** → final nuevo. Es el primer hito **gatillado por
  estado GLOBAL del server**, no por un flag local → el `HintEngine`/`applyEdge` tendrá que poder evaluar una `cond` que
  consulta el server (poll). Encaja con la `cond` unificada de `modelo-de-entidades.md` §6.96 (un predicado que puede
  mirar estado externo). **Nota de diseño:** mantener el gatillo del final como **chequeo cliente del GET /datacenter**
  (cuando ves done=true al entrar/while en la sala) para no acoplar el grafo a la red.

---

## 8. Fases sugeridas (de barato a grande)
1. **✅ C1 — Carteles MVP (HECHO v232 · infra-36):** 2 pisos del cine ("El Tablón"/"El Tablón 2", entre EN VIVO y el
   bodegón; tags `carteles`+`carteles-a`/`carteles-b` → floor `carteles-1`/`carteles-2`) + **computadora** (NPC
   `action:'compu'` → `openCarteles`, overlay `#cartelmenu`: fijar + "mis carteles"). **Backend** (`ai-proxy`): banco
   `CARTELES` en **PVC** (`/data/carteles.json`) + `GET /carteles?floor=` (sin texto), `POST /carteles` (cupo 24/piso +
   rate-limit 20s/pid + censura + cap 80), `POST /carteles/read` (consumo-en-lectura → devuelve y borra si no es tuyo),
   `GET /carteles/mine?pid=`, poda > 7d. **Cliente** `js/carteles.js` (aditivo, offline-safe) + `drawCarteles` (render
   empaquetado 8×3 con chincheta+nick; `[E]` para leer estando debajo). Anti-abuso v1 = texto corto + rate-limit + lista
   negra mínima (§4.4 opción 2). **Pendiente de C1:** validación del dueño en prod (2 sesiones para ver el consumo real).
   <br>(detalle original ↓)
   - 2 pisos + computadora (crear + mis carteles) + banco PVC + render empaquetado + consumo-en-lectura.
   Texto libre corto + rate-limit (anti-abuso v1). Sin IA todavía.
2. **C2 — IA deja carteles:** cron/gen acotado (≤30% del cupo) que autora carteles "del salón" (sabor, pistas).
3. **D1 — Datacenter MVP:** 1 piso + computadora (catálogo de partes data) + estado global PVC + pago coins/caramelos +
   maqueta que crece + barra global (poll). Sin endgame todavía.
4. **D2 — Endgame:** arista `datacenter_done` → cinemática/final nuevo (matar a la IA). Decidir temporadas (§5.5).
5. **F (multinivel):** la sala datacenter como **hub global** visible desde cualquier nivel (cuando haya Nivel 2+).

---

## 9. Decisiones abiertas (para el dueño)
1. **Moderación de carteles** (§4.4): ¿preset+relleno, texto libre+filtro, o IA-moderado? (Recomiendo texto libre corto + filtro.)
2. **Post-100% del datacenter** (§5.5): ¿evento único / temporadas / permanente? (Recomiendo temporadas.)
3. **¿Carteles y datacenter persisten en PVC** (banco) o alcanza in-memory? (Recomiendo PVC: el cartel espera horas, el datacenter es permanente.)
4. **Cupo de la IA en carteles** y **cupos por parte/rate** en el datacenter (números de balance).
5. **Entrada a la sala datacenter en multinivel** (§5.3): ¿portal fijo (stargate) o puerta por nivel? (Diferible a Nivel 2.)
