# 🛣️ ROADMAP — Tormenta Solar

Estado del proyecto y por dónde seguir. Última actualización: **2026-06-20** (cache `v=30`).

---

## ✅ Hecho (funciona y está testeado)

- **Motor 2D side-scroller**: colisión por tiles, gravedad, salto, cámara, iluminación con
  foco alrededor del jugador, partículas, parallax.
- **34 salas** conectadas por puertas (ver README).
- **Calle Florida y Lavalle** con NPCs, decoración, enemigos (peatones/drones), pickups,
  y la **cola de la casa de cambio** (10 personas distintas).
- **EducaciónIT** (3 pisos con ascensor), **Garbarino**, **Cemento** (Almafuerte/Iorio),
  **Chorería**.
- **Arcade** con 4 máquinas jugables (Pac-Man, Galaga, Frogger, Trucotron) + puerta secreta
  → **truco con el Tahúr** (te roba la guita, bailarinas, música de telo).
- **Super chino** (vista de arriba): góndolas que rotan, caja, garcas de carne/fiambre,
  pago con monedas o caramelos, **Mega Drive** (easter egg) y puerta secreta a la cueva.
- **Disquería** (vista de arriba): comprás vinilo → **ticket de Cemento**.
- **Galería / Sótano / Cuevas del dólar**: tiendas raras, 3 cueveros, **tormenta solar** y
  **portal final** en la Casa de Cambio Oficial.
- **3 borrachines + edificio abandonado de 20 pisos** (impares lujo vacío / pares destruidos
  con yonquis). Cada borracho quiere birra / carne / fiambre; la pista se revela hablándole.
- **Economía**: monedas, caramelos, birras, carne, fiambre, munición, vida.
- **Música chiptune** por zona (tango, cumbia, eighties, metal, dance, telo).
- **Suite e2e headless** (`node tests/e2e.js`): boot + auditoría de assets + 7 sub-modos.

---

## 🔜 Ideas / pendientes (sin empezar)

Ordenadas por impacto. Nada de esto está hecho.

### Jugabilidad
- [ ] **Objetivo dentro del edificio abandonado**: hoy es exploración + loot de monedas.
      Darle un premio real (ej. un arma/mejora en el último piso, o un personaje).
- [ ] **Más usos para carne/fiambre/birras** más allá de los borrachines.
- [ ] **Balance de la tormenta**: hoy los enemigos se activan al estallar; revisar dificultad
      de la vuelta a la superficie.
- [ ] **Guardado**: el progreso se pierde al recargar (no hay persistencia).
- [ ] **Pantalla de fin** más rica (stats: monedas juntadas, secretos encontrados).

### Contenido
- [ ] **Nivel 2** (el salto temporal): la intro promete viajar entre momentos de la historia.
      Hoy termina en el portal del Nivel 1.
- [ ] Más easter eggs / personajes reales.
- [ ] Sonido ambiente por sala (hoy solo música).

### Técnico / calidad
- [ ] **Mobile / touch**: hoy es teclado+mouse, no anda en celular.
- [ ] **Escalado responsive** del canvas a distintas pantallas.
- [ ] Extender el e2e para **simular navegación real** (caminar hasta una puerta, gatillar la
      tormenta y verificar la victoria), no solo boot + auditoría de assets.
- [ ] Considerar partir `art.js` (es enorme) en módulos por categoría.

---

## ⚠️ Cosas a tener en cuenta (gotchas)

1. **Cache-busting obligatorio.** Si cambiás un `.js`/`.css`, subí `?v=N` en `index.html`
   (todos los `src`). Si no, no vas a ver los cambios en el navegador (sirve la versión vieja).
   Es la causa #1 de "no veo nada nuevo".
2. **Sprite faltante = pantalla en blanco.** `render()` itera los NPCs/decor de cada sala y
   dibuja `Art.npc[sprite]`. Si el sprite no existe, antes crasheaba todo el render. Ya hay
   fallback (`Art.npc.civil1`) y la **auditoría del e2e** lo detecta. Igual: cualquier sala
   nueva con un sprite nuevo → correr `node tests/e2e.js`.
3. **Puertas de edificio** necesitan: (a) el sprite de fachada en `Art.items.<x>`, y
   (b) una entrada `<art>: '<x>'` en `DOOR_ART` de `game.js`. Sin (b) dibuja una puerta genérica.
4. **Puertas "lanzador de modo"** (super, vinilos) **no se cablean** con `wire()`; las maneja
   `interact()` en game.js. El e2e las excluye del chequeo de wiring.
5. **Sin navegador en el entorno de dev**: toda validación es headless (e2e + `node --check`).

---

## 🧰 Workflow para seguir

```bash
# 1. editar js/*.js
# 2. subir el cache:  ?v=30 -> ?v=31  en index.html (todos los src)
# 3. validar:
node tests/e2e.js
# 4. probar a mano:
python3 -m http.server 8000   # http://localhost:8000
```

### Cómo agregar una sala nueva (resumen)
1. En `level.js`, agregá un `makeRoom({...})` al array de `build()` (o generala en loop).
2. Agregá una **puerta** en la sala origen y `wire(origen,'puertaA', nuevaIdx,'puertaB')`.
3. Si dibuja fachada propia: sprite en `art.js` (`items.<x>`) + `DOOR_ART` en `game.js`.
4. Si usa un **theme** nuevo: agregá sus ramas en `game.js` → `tileImg()`, el dispatch de
   fondo (`drawXBg`) y el mensaje de transición.
5. `node tests/e2e.js` y subí `?v=N`.

---

## 📦 Para publicar el repo

- Es 100% estático: sirve con GitHub Pages directo (no hay build).
  Subí todo y activá Pages apuntando a la raíz; se juega desde `index.html`.
- No hay secretos ni `.env`. No hay `node_modules` (Node solo se usa para el test).
- Sugerido agregar un `.gitignore` (al menos `*.output`, archivos temporales del sistema).
- Licencia: definir una (MIT, CC-BY-NC, etc.) antes de publicar.
