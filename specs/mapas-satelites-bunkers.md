# SDD — Mapas estratégicos: SATÉLITES/BASES (el mundo) + BÚNKERES (tu refugio)

- **Estado:** **Diseño / brainstorm del dueño (2026-07-01).** Nada construido aún. Este doc captura la idea (que "no se
  veía" en ningún lado) y propone cómo hacerla, por fases.
- **Lore (ya existe):** la tormenta solar la desataron **SATÉLITES REBELDES gobernados por IA**; el endgame es
  **destruir la IA del satélite** (ver datacenter D2 / `construccion-colaborativa.md`). El **búnker** ya existe en el
  juego (sos gurú → `bunkerUnlocked`, atajo del piso 3). Estos dos mapas le dan una **capa estratégica** a eso.
- **Relacionado:** `specs/spinoff-stargate.md`, `construccion-colaborativa.md` (datacenter/satélite), el búnker en
  `js/game.js`. Patrón sub-modo (como `lavalle.js`/`piquete.js`): módulo self-contained `create()/update/draw`.

## 1. MAPA A — Satélites + Bases (el mundo)

**Qué es:** una vista del planeta con las **bases** (puntos) y los **satélites rebeldes** orbitando. Es el mapa
"macro": dónde está cada cosa, qué satélite gobierna qué zona, adónde ir.

**Dos formas (el dueño prefiere la 2):**
1. **Top-down plano:** un planisferio/mapa cuadrado con dots de bases + íconos de satélites. Simple, barato.
2. **★ GLOBO QUE GIRA (recomendado):** una **esfera pseudo-3D en canvas** (sin librerías): puntos (lat/long)
   proyectados a 2D con rotación continua; los del "frente" se ven, los de atrás se atenúan/ocultan. Satélites como
   puntos en órbita (anillo que gira más rápido). Se puede **arrastrar para girar** y **click en una base/satélite**
   para seleccionar (tooltip + acción). Es 100% factible con Math.sin/cos, mismo estilo retro del juego.

**Datos (v2 / no hardcode):** las bases y satélites = **DATA** (`{id, name, lat, lon, tipo, dueño}`), idealmente del
ecosistema (el datacenter global marca el progreso contra la IA del satélite → el mapa lo refleja). MVP: data estática.

## 2. MAPA B — Búnkeres (tu refugio)

**Qué es:** el mapa de tu **búnker** y los enemigos alrededor. Empezás **siempre con la entrada desde TU base** y vas
construyendo/expandiendo.

**Dos formas (el dueño tira ambas):**
1. **Cuadrado con "arriba" = radar:** mapa cuadrado; en la **franja de arriba**, la representación de **dónde están los
   enemigos** (radar/amenazas). Abajo, tu búnker (grilla de salas que construís).
2. **Redondo rotable + zoom:** un **mapa redondo que girás**; hacés **click → zoom** a una zona y ahí **construís tu
   búnker** (colocás salas/defensas). Siempre arrancás con la **entrada desde tu base** (el punto fijo inicial).

**Construcción:** grilla de celdas; colocás módulos (entrada [fija], pasillo, dormitorio, depósito, torreta…) con la
plata/recursos del juego. Reusa el patrón de **construcción colaborativa** (carteles/datacenter) si se quiere que sea
compartido, o local por jugador para el MVP.

## 3. Enganche al juego (dónde se accede)
- El **búnker** ya se desbloquea siendo gurú → desde ahí un **panel/mesa "MAPA"** abre el Mapa B (tu búnker) y, más
  arriba, el Mapa A (satélites) como "sala de situación".
- O un ítem/consola en el búnker (como la compu de los carteles/datacenter).

## 4. Fases sugeridas (para no morir en el intento)
- **F1 — Globo que gira (visual):** sub-modo `js/globo.js`: esfera de puntos rotando + bases/satélites (data estática)
  + arrastrar para girar + click-selección con tooltip. Sin gameplay todavía (postal interactiva). *Entregable chico
  y vistoso; valida la idea.*
- **F2 — Mapa B búnker (grilla + construir):** colocar módulos en una grilla, entrada fija desde tu base, guardar en
  localStorage. Radar de enemigos arriba (estático primero).
- **F3 — Conexión:** el progreso del datacenter/satélite se refleja en el globo; el búnker da bonus/defensa; enemigos
  reales en el radar.
- **F4 — (ambición) redondo-rotable + zoom** para el búnker, si la grilla cuadrada quedó corta.

## 5. Deuda / preguntas abiertas
- ¿Es single-player (tu búnker, tu mapa) o COLABORATIVO/global (todos ven el mismo mundo, tipo datacenter)? Cambia el
  netcode. MVP sugerido: **globo global (data compartida) + búnker local por jugador**.
- ¿El globo es solo "ver" o hay acciones (mandar, atacar, defender)? F1 = solo ver; acciones en F3.
- Encaje con el Stargate (¿el globo lleva a otras galaxias por el stargate?).
