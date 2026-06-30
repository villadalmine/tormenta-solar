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

## 5. La VIOLA: efecto música + heavy metal (✅ v216, idea dueño 2026-06-28)
La risa de la viola NO es genérica: el **proyectil** son notas ♪♫ y al pegar **distingue por tipo**:
- **Gente (no voladores):** queda **muerta de risa con MÚSICA** (🎵😂, no billetes 💰 como con el dólar). `e.pacified +
  e.laughing` → el draw muestra notas en vez de plata (`enemies.js`).
- **Drones / voladores:** salen **volando ALOCADOS por el heavy metal** (🤘🎸), zigzagueando hacia arriba hasta perderse
  (`e.fleeing` → vuelo errático + despawn fuera de pantalla). Inofensivos, no se mueren.
Implementado en `fx.js` (hit del kind `laugh`) + `enemies.js` (update `fleeing` + draw `laughing`/`fleeing`).

## 6. Armas CRIOLLAS: pacifista en la calle, "sí loco" en los SUEÑOS — ✅ IMPLEMENTADO (v235, 2026-06-29)
**Hecho:** 4 armas en `WEAPONS` con `ctx:'dream'` + `effectiveVs` + `dmgMul:3` + `baseDmg` (rebenque→pacman, boleadoras→
dron/galaga, facón→peaton, FAL→cuevero). `pickArma` suma el arma ESPECÍFICA comprada (`a.key` ∈ rebenque/boleadoras/
facon/fal). En el inventario `[I]`: si `isDream()` (= `spinoffLevel`, los niveles generados) se EQUIPA ("sí loco acá lo
usamo", `g.wpn.dreamOk`); en la calle real se niega (`g.wpn.dreamOnly`). El disparo: `syncHud` deriva `player.weaponCombat`
{eff,mul,dmg} del arma equipada; `player.js fire()` manda un proyectil que DAÑA con `{eff,mul}`; `fx.js` aplica `dmg×mul`
si `e.type ∈ eff` (chispa dorada). Al terminar el sueño (`endSpinoffLevel`) se desequipa (volvés a `escupitajo`: despierto
no la usa). Probado headless (x3 al tipo, x1 al resto). i18n `g.wpn.rebenque/boleadoras/facon/fal/dreamOk/dreamOnly/
dreamHint`, `g.inv.dream`. **✅ Spawn del tipo "contra" HECHO (v242):** al cargar un nivel generado, `game.js`
`ensureCriolloTargets(model)` mira las armas criollas que TENÉS en el inventario y, por cada tipo "contra" que no
aparezca en el nivel (una sala de un solo *vibe* puede no spawnearlo), **swapea un enemigo al azar a ese tipo**
(no toca geometría → la RED no se altera). Así el fierro criollo que llevés SIEMPRE tiene a quién pegarle.
**Falta (futuro):** balance fino de daño/cantidad.

### (diseño original ↓)
### 6.0 — DISEÑO
El dueño quiere que el **fierro criollo** del armero (rebenque/boleadoras/facón/FAL) **se pueda VER y USAR**, pero con
una vuelta: en el **mundo real el Carpo se NIEGA** (gag pacifista, ✅ ya hecho: `noEquip`+`g.wpn.refuse`). En cambio, en
los **SUEÑOS / niveles GENERADOS** (los que flashea el vecino del edificio clausurado, el oráculo, el chino) **SÍ los
usa** ("sí loco, acá lo usamo"), y **cada arma es eficaz contra un TIPO de monstruo** distinto.
### 6.1 Grafo de objeto (data-driven, REGLA #0 — Type Object de `modelo-de-entidades.md`)
Cada arma criolla = entidad-arma con **componentes**: `{ id, emoji, label, ctx:'dream', effectiveVs:[tipos], dmgMul }`.
Ejemplo de catálogo (a balancear):
| arma | emoji | eficaz contra | por qué (flavor) |
|---|---|---|---|
| **rebenque** | 🪢 | `pacman` (rápidos) | los apura/azota, los frena en seco |
| **boleadoras** | 🔗 | `dron`/`galaga` (voladores) | los enreda en el aire y los baja |
| **facón** | 🔪 | `peaton` (cuerpo a cuerpo) | el criollo de confianza, melee |
| **FAL** (Malvinas) | 🔫 | `cuevero` (tiradores) | el único que le aguanta a distancia |
`effectiveVs` = bonus de daño (`dmgMul`) contra esos tipos; daño normal contra el resto → invita a **cambiar de arma
según el bicho** (el inventario [I] cobra sentido táctico). El "es un sueño" lo habilita el **contexto** `spinoffLevel`/
generado (ahí `noEquip` se ignora y aparece la línea "sí loco acá lo usamo"); en la calle real sigue el `g.wpn.refuse`.
### 6.2 A implementar
- `WEAPONS` de las criollas con `ctx:'dream'` + `effectiveVs` + `dmgMul`; `equipWeapon` permite equiparlas **solo** si
  `spinoffLevel`/nivel generado (si no → refuse). El disparo aplica `dmgMul` cuando `combat.type ∈ effectiveVs`.
- `buyArmas` ya suma `fierro` al inventario; pasar a sumar el arma **específica** comprada (id por `a.key`).
- Mensaje contextual: en sueño, al equipar → "sí loco, acá lo usamo" (`g.wpn.dreamOk`); en calle → `g.wpn.refuse`.
- Atar con `fabrica-niveles-ai.md` (los niveles generados son el "sueño") y `modelo-de-entidades.md` §6.97 (capacidades).

## 7. Deuda / futuro (F2+)
- Items NO-arma en el inventario (curativos, llaves) → el array ya lo soporta; falta UI de "usar".
- Slots / drop / peso → no hace falta para el alcance actual (YAGNI).
