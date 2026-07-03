# Nombre de usuario (nick) para el multijugador

**Estado:** **IMPLEMENTADO (v233, 2026-06-29)**. **Origen:** pedido del dueño (2026-06-29): *"que el usuario defina un
nombre que quiera, y siempre al final le agrega 3 letras/número random, así cada uno tiene su nombre para cuando aparece
en la parte multiplayer"*. Relacionado: [[multijugador.md]] (bodegón/salón), `construccion-colaborativa.md` (carteles/datacenter).

---

## 1. La idea
El jugador **elige un nombre** (en ⚙ Opciones). El juego le **agrega siempre un sufijo random de 3 caracteres**
(`·XYZ`, alfanumérico) → así dos "Carpo" distintos no se confunden en el multijugador. El nick aparece donde te VEN los
otros: **peers del bodegón**, **autor de los carteles**, (a futuro) aportes del datacenter.

## 2. Diseño (mínimo, client-side)
- **CROSS-DEVICE (v292, 2026-07-03):** el sufijo `·XYZ` es PARTE de la identidad — si en ⚙ tipeás el nick
  COMPLETO (`Carpo·A3F`, también vale `Carpo#A3F`), `setNickBase` ADOPTA ese sufijo en vez de sortear uno nuevo →
  misma identidad en otro dispositivo (checkpoint + memoria del barrio te encuentran). Hint en la preview.
- **Estado (localStorage, persiste cross-sesión):**
  - `ts_nick` = el nombre BASE que escribió el usuario (sin sufijo). Default `'Carpo'` si está vacío.
  - `ts_nick_sfx` = los 3 chars random, **generados UNA vez** y guardados (así tu identidad es estable entre sesiones;
    si se regenerara cada vez, no "tendrías tu nombre"). Alfanumérico mayúsculas (`[A-Z0-9]{3}`).
- **`playerNick()` = `nickBase() + '·' + nickSuffix()`** (game.js). Sanitiza el base: saca `<>`, colapsa espacios,
  capa a **12 chars**; vacío → `'Carpo'`.
- **UI:** una fila en ⚙ Opciones (`#opt-nick` input + `#opt-nick-preview` que muestra el nick final con el sufijo en vivo).
  Al tipear, se guarda el base y se actualiza el preview. No hace falta "guardar": es inmediato.
- **Consumidores (ya usan `playerNick()`):** `Salon.join(playerNick(), …)` (bodegón), `Carteles.post(floor, playerNick(), …)`
  (autor del cartel). El server ya capa el nick a 16 chars + saca `<>` (defensa en profundidad).

## 3. Por qué así (no server-side)
El nick es **cosmético y local** (no es una cuenta): vive en el navegador, como el `ts_pid`. No hay login ni unicidad
garantizada global — el sufijo random + el nombre elegido alcanzan para distinguir en una sala de ≤6. Si a futuro se
quiere identidad fuerte (cuentas, evitar suplantación), va con la pasarela de pago / login (`pasarela-pago.md`), no acá.

## 4. Anti-abuso
Nick corto (12) + sin HTML (`<>` fuera, escapado al render) + el server lo recapa a 16. Sin texto libre largo. Si hace
falta moderar nombres ofensivos, reusar la lista negra de los carteles (`CARTEL_BAN`) — diferido (bajo riesgo, ≤6 personas).

## 5. Futuro (no ahora)
- Pasar el nick también al **datacenter** (hoy el top de contribuyentes muestra `pid.slice(-4)`, anónimo).
- **Avatar/color** elegible (hoy el peer del bodegón usa el sprite del Carpo para todos).
