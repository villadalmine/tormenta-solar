# SDD — EL MAPA DEL JUEGO (automap estilo DOOM): dónde estás, qué hay, qué falta — todo desde el GRAFO

- **Estado:** **F1-F3+fog (v289) + FIXES del playtest (v293):** quests ancladas a UN nodo (la entrada del edificio; sin spam de 🔒 — las futuras solo en tooltip), **CLICK = zoom al edificio** (`Mapa.hitTest`; Esc sale del zoom primero), columnas reservadas para sub-modos (sin superposición), zoom con etiqueta de piso (P7/S2) + marcadores grandes + fila resaltada si hay contenido. Falta: cursor por teclado, minimapa HUD, `map` component override, online POR sala.
- **La idea (dueño):** apretás **TAB** en cualquier parte (decisión 2026-07-02: M queda para la música, confirmado por el dueño) y se abre un MAPA que muestra
  **dónde estás**. Como los niveles son 2D side-scroller, la mejor representación es un automap simple estilo DOOM.
  Hover del mouse (o moverte con el cursor) → info. Si estás en un edificio de varios pisos, marca TU piso y permite
  **zoom in/out por pisos**. Visualmente interesante y rico: marca **quests terminadas/pendientes, dónde están los
  juegos, los linyeras, los NPC inteligentes** — y TODO sale del grafo, porque es data-driven.
- **Relacionado:** `levels/nivel-1.json` (el modelo v2: salas+puertas+wiring+x reales), `js/historia.js` +
  `HintEngine` (quests del grafo), `worldSnapshot/historiaState`, `salonLive` (multijugador), [[v2-engine-principios]].

## 1. La representación: CORTE DE LA MANZANA (automap DOOM adaptado a side-scroller)

Un mundo side-scroller no se mapea "desde arriba" literal: la proyección honesta es el **CORTE** (estilo hormiguero /
plano de subte): la **CALLE como eje horizontal**, los **EDIFICIOS suben** (pisos apilados) y los **SUBSUELOS bajan**
(galería SS1 → sótano SS2 → cuevas SS3). Es "el Doom automap" de este mundo: wireframe retro, fondo oscuro, líneas
neón, labels monospace.

```
                                   [p20 ▓ búnker]
                 [p9]              [p19]
 [Lavalle]─┐     [p8]   [cine p1-9]  ⋮        ← pisos apilados (cada uno = 1 barra)
  piquete  │     [p4]   [garbarino] [p3-atajo]
 ══════════╪══ CALLE FLORIDA ═══════════════════════════════  ← la sala 0, con cada puerta en su X REAL
           │      [galería SS1]                [chino]
           │      [sótano SS2]      [telo]─[bodegón]          ← sub-modos = nodos colgados de su origen
           │      [cuevas SS3]─[secreto]─[trastienda]
        [Obelisco]
```

**Todo sale del DATO (cero hardcode):**
- La **calle** = sala 0; cada `door` de la calle tiene su **`x` real** en el modelo → cada edificio se dibuja EN su
  posición verdadera sobre Florida.
- Los **edificios** = grupos de salas alcanzables desde esa puerta (BFS por `door.link` del wiring); el **piso** se
  saca del id (`educacionit-piso-8`, `subsuelo-2`) o de la profundidad de BFS por puertas up/down.
- Cada sala = una **barra horizontal** con ancho ∝ `room.w`. Puertas = conexiones dibujadas.
- **Sub-modos** (Lavalle/Obelisco/bodegón/telo/plano/globo) = nodos especiales colgados de su punto de origen
  (Lavalle a la izquierda de la calle, bodegón del piso 9 del cine, etc.) — declarados en un pequeño catálogo DATA.
- Fallback/override: componente opcional **`map:{bx,by}`** por sala (3 patas del schema) para correcciones manuales
  y para que la **máquina de niveles IA** pueda autorar el layout de niveles generados.

## 2. Interacción

| Input | Acción |
|---|---|
| **TAB** (toggle) | abre/cierra el mapa (overlay sobre el juego, pausa como el inventario). M queda para música |
| **Mouse hover** | tooltip de la sala: nombre, piso, qué hay (ver §3), estado de quests ahí |
| **Flechas/WASD** | mueven un CURSOR sala-por-sala (misma info que hover — jugable sin mouse) |
| **Rueda / +− / Z** | **zoom**: vista MUNDO (toda la manzana) ↔ vista EDIFICIO (los pisos del edificio grandes) |
| **Enter en un edificio** | zoom directo a ese edificio con tu piso resaltado |
| **Esc / TAB** | cerrar |

- **"ESTÁS ACÁ"**: punto parpadeante en tu sala, en tu **x relativa real** dentro de la barra. En un edificio: tu
  piso resaltado (borde amarillo + label "PISO 8 — estás acá"). En un sub-modo: su nodo late.

## 3. Los MARCADORES (ricos en detalle, todos derivados del grafo/estado)

| Marcador | Fuente (data) |
|---|---|
| ✅ quest hecha / ⭐ quest DISPONIBLE ahora / 🔒 bloqueada | `Historia.edges` × `historiaState()` × `HintEngine.frontier()` — anclada a la sala vía `edge.at` (mapa lugar→sala) |
| 💬 NPC inteligente (chat IA) | npcs con `persona`/`oracle` en el modelo (Diógenes, Dante, Pechito, peronista, hinchas…) |
| 🕹️ juegos | salas con arcade (tag `arcade`), la trastienda del truco, los 5 gather-points del piquete, el bodegón (mesas 1v1/6) |
| 🛒 economía | npcs con `sells`/`tienda`/`arsenal`, el chino, las tiendas de la cueva |
| 👥 multijugador VIVO | `salonLive.byRoom` (cuánta gente hay AHORA en cine/bodegón/lavalle) |
| 🏚️ post-tormenta | edificios `collapsesOnStorm` derrumbados si `stormed` |
| 🛰️ el arco del satélite | Obelisco con el satélite herido o no (`ts_sat_down`) |
| 🛖 tus búnkers | `ts_bunker_zones` (cuánto construiste, del Mapa B) |

- El **tooltip de quest** reusa el **hint nivel 0** del HintEngine (críptico, sin spoilear — el spoiler fino se lo
  pedís al linyera).
- **Fog of war suave**: salas ya VISITADAS a todo color; no visitadas = silueta tenue sin detalles (anti-spoiler).
  Registro de visitadas: ya existe el evento `sala` en el bus (`Eventos`) + set persistido `ts_visited`.

## 4. Implementación (aditiva, patrón overlay)

- **`js/mapa.js`** nuevo: `Mapa.build(rooms)` (una vez, cachea el layout: grupos/pisos/posiciones desde el wiring)
  + `Mapa.draw(ctx, state)` (overlay canvas) + `Mapa.input()`. Sin dependencias; guardas `typeof`.
- **game.js**: TAB → `state='mapa'` (overlay que pausa, como el inventario); pasa `{current, player.x, historiaState,
  frontier, salonLive, visited}`.
- Los datos de layout salen de `rooms` en runtime (v1) — idéntico al modelo v2 (paridad garantizada por gen-level).
- **e2e**: `Mapa.build` sobre las 51 salas → todas ubicadas, sin superposiciones groseras; draw 60 frames sin crash;
  toggle TAB.

## 5. Fases
- **F1 — layout + estás acá:** build del corte (calle + edificios por pisos + subsuelos + sub-modos), render
  wireframe DOOM, TAB toggle, punto "estás acá", hover/cursor con nombre de sala + piso.
- **F2 — marcadores del grafo:** quests ✓/⭐/🔒 (Historia×HintEngine), NPCs IA 💬, juegos 🕹️, tiendas 🛒.
- **F3 — zoom por edificio** (vista edificio con pisos grandes) + fog of war por visitadas.
- **F4 — VIVO:** gente online por sala (`salonLive`), post-tormenta, satélite/búnkers; componente `map` autorable
  (máquina de niveles) + minimapa opcional en el HUD (esquina, solo sala actual).

## 6. Deuda / notas
- TAB roba el foco en browsers → `preventDefault` en el keydown (patrón ya usado con flechas/espacio).
- Salas generadas (niveles IA/spinoffs): fuera del mapa en F1 (son bolsillos temporales); F4 los puede colgar como
  nodo "sueño" si están activos.
- El mapa NO revela el secreto del chino ni el búnker si no los descubriste (fog of war cubre; las salas `secret`
  requieren su flag para aparecer).
