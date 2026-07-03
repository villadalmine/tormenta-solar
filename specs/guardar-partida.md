# SDD — GUARDAR PARTIDA: checkpoints por HITOS del grafo (el juego se puso difícil)

- **Estado:** **F1+F2+F3 IMPLEMENTADAS (v291·infra-65, 2026-07-03).** Checkpoint por hito en `applyEdge` →
  `ts_checkpoint_v1`; botón «⏪ VOLVER AL ÚLTIMO HITO» en la pantalla de muerte (`#hitoBtn`); HARDCORE 💀 en ⚙;
  cross-device `GET/POST /checkpoint` por nick (proxy 0.1.87). e2e `Game.__chk`. Falta validación del dueño.
- **La pregunta (dueño, textual):** *"el juego se está haciendo muy difícil, quiero poner guardar partida — ¿se
  puede o se complica por el multiplayer y el grafo de estado de NPC? ¿vale la pena? ¿o que te guarde hasta cierto
  punto solo y tengas botón de empezar de nuevo? ¿cuál ves mejor, basado en cómo funciona el grafo por hitos?"*
- **Relacionado:** `js/save.js` (SaveStore + botón Continuar), `game.js serialize()/restore()/die()`,
  `historia.js`/`applyEdge` (el grafo por hitos), `estado-jugador.md §2` (respawn peronista, v288).

## 0. Lo que YA existe (importante: guardar partida ya está — lo que falta es la POLÍTICA de muerte)

| Pieza | Estado |
|---|---|
| **Autosave completo** cada ~5s a localStorage (`tormenta-solar-save-v1`) | ✅ desde hace rato |
| **Botón CONTINUAR** en la intro si hay partida guardada | ✅ (`save.js`) |
| Se guarda TODO el estado del mundo: player+inventario, **los ~30 flags del grafo**, pickups/NPCs por posición, `oracleMem` (memoria de los linyeras), `vecinoState`, quest del chip, arcadeWon | ✅ (`serialize()` v2) |
| Respawn peronista: morir SIN búnker → piquete, sin perder nada | ✅ (v288) |
| **El problema real:** morir CON búnker → **`SaveStore.clear()` — el save SE BORRA** ("moriste de verdad") y arrancás de CERO | ❌ el permadeath es lo que lo hace "muy difícil" |

## 1. Respuesta corta a las dudas

- **¿Se complica por el multiplayer?** NO. Lo multiplayer es EFÍMERO por diseño (presencia, peers, mesas viven
  en el server y NO se guardan; al restaurar te re-unís al espacio como siempre; los co-op en curso los cierra el
  watchdog). Nada que persistir.
- **¿Se complica por el grafo de estado de NPC?** NO — al revés: el grafo ES la solución. Los flags del grafo ya
  se serializan enteros y los companions se re-derivan de los flags (`syncCompanions`). Restaurar una partida ya
  reconstruye el mundo coherente hoy.
- **¿Vale la pena?** SÍ y es BARATO (~20-40 líneas): todo el trabajo pesado (serialize/restore) ya está hecho.

## 2. Las opciones evaluadas

- **(A) Guardado MANUAL multi-slot** (menú guardar/cargar donde quieras): técnicamente posible reusando
  `serialize()`, pero ❌ NO recomendada: UI pesada, invita al save-scumming (guardar antes de cada riesgo → muere
  la tensión que hace divertido el juego), y pisa el tono del permadeath/loop.
- **(B) CHECKPOINTS AUTOMÁTICOS POR HITO DEL GRAFO — ⭐ RECOMENDADA.** Es exactamente "que te guarde hasta
  cierto punto solo": los "ciertos puntos" YA EXISTEN y son los **hitos del grafo** (`applyEdge` es el punto único
  por donde pasa TODA transición de la historia). Diseño:
  1. En cada `applyEdge(id)` exitoso → snapshot `ts_checkpoint_v1 = { edge: id, ts, snap: serialize() }`.
     (El autosave de 5s sigue igual para "Continuar" normal.)
  2. **Morir CON búnker** → en vez de `SaveStore.clear()`: pantalla de muerte con **"⏪ VOLVER AL ÚLTIMO HITO"**
     (restaura el checkpoint: retomás en el momento del último logro de la historia, perdés solo lo suelto desde
     entonces — monedas juntadas, pasos sin hito: ese es el castigo justo) + **"EMPEZAR DE NUEVO"** (reset total,
     ya existe). El checkpoint NO se re-escribe al morir (no hay farmeo de muerte).
  3. Lore-fit perfecto: el LOOP del búnker ya establece que el tiempo se dobla — "la historia te recuerda hasta
     el último hito" cierra con el universo (y con el rayo solar del respawn peronista).
- **(C) Solo botón "empezar de nuevo":** ya existe (restart) — no resuelve la dificultad.

## 3. Detalles de (B)

- **Qué se pierde al volver al hito:** lo no-hito desde el checkpoint (plata/ítems sueltos, posición). Lo
  IMPORTANTE (progreso de historia, inventario clave al momento del hito, memoria de linyeras) vuelve.
- **Spinoffs/niveles generados:** ya están excluidos del autosave (efímeros) — igual acá; morir en un sueño ya
  tiene su propia red.
- **Modo HARDCORE (opcional, F2):** toggle en ⚙ Opciones para los puristas = comportamiento actual (morir borra
  todo). Default = checkpoints.
- **Cross-device (F3, futuro):** el checkpoint es local; se puede subir por nick al proxy (patrón `barrio-mem`)
  para retomar en el celu. No bloquea F1.
- **Autoplay QA:** la suite 03-historia ya planta saves por localStorage — sumar un check de checkpoint (morir →
  volver al hito → flags intactos).

## 4. Fases
- **F1 — checkpoint por hito + muerte con vuelta:** hook en `applyEdge` (guardar `ts_checkpoint_v1`), branch en
  `die()` post-búnker (ofrecer volver al hito en la pantalla de muerte, botón nuevo en `#end`), i18n ES/EN,
  e2e (morir→checkpoint→flags restaurados). *(Chico: reusa serialize/restore tal cual.)*
- **F2 — pulido:** título del hito en el botón ("Volver a: EL JURAMENTO"), toggle hardcore en ⚙, `tel('death',
  {result:'checkpoint'})` para ver en Grafana cuánta gente lo usa.
- **F3 — checkpoint cross-device por nick** (POST al proxy, patrón barrio-mem).
