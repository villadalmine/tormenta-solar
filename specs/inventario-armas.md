# Inventario + armas (la viola de Les Luthiers que dispara risas)

**Estado:** F1 implementado (v210). **Origen:** pedido del dueño (2026-06-27): el tesoro del búnker, en vez de (o
además de) mejorar el escupitajo, debería dar una *"viola de Les Luthiers que dispara risas"*, un arma que **se
guarda/equipa** → "hay que implementar un INVENTARIO". "Después de la tormenta la viola la dejás" (cierre narrativo: el
Carpo se cuelga la viola y salta, ya está en `g.win.text`).

## 1. Problema
Hoy el Carpo tiene **un arma implícita**: el escupitajo, modelado como flags sueltos en `player` (`spitDmg`,
`dollarMode`, `canShoot`). No hay forma de **tener varias armas y elegir cuál usar**. El "vendedor de fierro criollo"
(`buyArmas`) sólo da bonus de munición/vida (flavor), no arma real. No hay inventario.

## 2. Diseño (REGLA #0: las armas son DATA)
### 2.1 Registro de armas (`WEAPONS` en `game.js`)
Cada arma es un objeto DATA: `{ id, emoji, label (i18n), bullet (kind del proyectil), mode, dmg }`. Las dos de F1:
- **`escupitajo`** (default): `bullet:'spit'`, `mode:'damage'`, `dmg = player.spitDmg` (14, sube a 24 con el tesoro).
  **Post-tormenta** escupe **dólares** (`dollarMode` → `bullet:'dollar'`) que **apaciguan a la gente** (no a voladores).
  Es el comportamiento actual, ahora descrito como arma.
- **`viola`** (premio del tesoro): `bullet:'laugh'`, `mode:'laugh'`, `dmg:0`. Dispara **risas** que hacen **morir de
  risa** (apaciguan) a **CUALQUIER** enemigo, **incluidos los voladores** (a diferencia del dólar). Crowd-control total
  = premio deseable. No mata: los deja tirados cagándose de risa (😂), inofensivos.

### 2.2 Inventario (en `player`)
- `player.inventory` = **array de ids** de armas/items que tenés (arranca `['escupitajo']`).
- `player.weapon` = **id del arma equipada** (arranca `'escupitajo'`).
- `equipWeapon(id)` = si está en el inventario, setea `player.weapon`. La UI lo llama; el HUD muestra el emoji.

### 2.3 Disparo (`player.shoot`, sin dependencia del registro)
`shoot()` decide el `kind` del proyectil y el daño desde `this.weapon` (string) + `this.dollarMode`:
- `viola` → `kind:'laugh'`, `dmg:0`.
- si no (escupitajo) → `kind = dollarMode ? 'dollar' : 'spit'`, `dmg = spitDmg`.
`player.js` queda **autónomo** (no importa el registro; el registro vive en game.js sólo para la UI/labels).

### 2.4 Proyectil `laugh` (`fx.js Bullets`)
- **update:** al pegarle a un enemigo (`from==='player'`, `kind==='laugh'`): `e.pacified = true; e.hostile = false;
  e.vx = 0` (apacigua a TODOS, también `e.fly`), burst amarillo + Sfx. Reusa el estado `pacified` que ya existe (el
  dólar lo usa); los enemigos pacificados ya son inofensivos en el loop de combate.
- **draw:** notas musicales / 😂 en vez del gargajo.

### 2.5 UI del inventario
- Overlay `#invmenu` (mismo patrón que `#vecinomenu`/`#guardamenu`): tecla **`I`** lo abre/cierra (y **ESC** lo cierra).
- Lista los items del inventario; las armas son clickeables para **equipar** (resalta la equipada). Headless-safe:
  si no existe el overlay, no rompe (guarda como `openVecino`).
- **HUD:** `#weapon` muestra el emoji del arma equipada, actualizado en `syncHud`.

### 2.6 El tesoro (`grabTesoro`)
Sigue dando +150 coins, +40 ammo y la mejora del escupitajo (spitDmg 24), y **además** ahora:
`addItem('viola')` + `equipWeapon('viola')` + mensaje temático (Les Luthiers, "dispara risas"). El gurú te entrega la
viola. La viola queda para todo el run (el cierre "la dejás" es narrativo, en la pantalla de fin).

### 2.7 Persistencia
`serialize()` agrega `player.inventory` (array) + `player.weapon` (string); `restore()` los reaplica;
`reset()` los vuelve al default (`['escupitajo']` / `'escupitajo'`). El hito del tesoro ya existe.

## 3. i18n
`g.wpn.escupitajo`/`g.wpn.viola` (nombres), `g.inv.title`/`g.inv.equip`/`g.inv.equipped`/`g.inv.empty`/`g.inv.hint`,
`g.tesoro.viola` (mensaje nuevo del premio). ES + EN, paridad.

## 4. Tests
- `e2e.js`: round-trip de guardado incluye inventory/weapon; equipar + disparar viola sin crash (sandbox).
- `web-smoke.mjs`: sin errores de consola con el nuevo overlay + HUD.

## 5. Deuda / futuro (F2+)
- Que `buyArmas` (fierro criollo) entregue **armas reales** al inventario (facón melee, FAL ráfaga) en vez de sólo
  bonus → usa el mismo registro `WEAPONS`. Necesita balance.
- Items NO-arma en el inventario (curativos, llaves) → el array ya lo soporta; falta UI de "usar".
- Slots / drop / peso → no hace falta para el alcance actual (YAGNI).
