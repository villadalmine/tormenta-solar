# 🛣️ ROADMAP — Tormenta Solar

Estado del proyecto y por dónde seguir. Última actualización: **2026-06-22** (cache `v=61`).

---

## ✅ Hecho (funciona y está testeado)

- **Motor 2D side-scroller**: colisión por tiles, gravedad, salto, cámara, iluminación con
  foco alrededor del jugador, partículas, parallax.
- **38 salas** conectadas por puertas (ver README), incluyendo las 3 cuevas del dólar y el búnker.
- **Loop de supervivencia** post-tormenta (vida que decae, comer en el chino, falopa/Iorio, plata de
  los linyeras, catre/día, muerte→loop anterior). Ver `specs/nivel-1/loop-supervivencia.md`.
- **IA (OpenRouter)**: diálogos pre-generados (modo A, `js/dialogos.js`) + chat en vivo con un NPC
  (modo B, `js/ai.js`: proxy/BYOK/local). Capas aditivas. Ver `specs/ia-openrouter.md`.
- **Multi-idioma (ES/EN)**: el juego entero se juega en inglés. `js/i18n.js` + catálogos `js/lang/*`
  (`t/tList/dict`, `data-i18n`), selector en ⚙ Opciones, auto-detect del browser (no soportado→inglés),
  pools y chat IA por idioma (transcreación, no traducción literal). Ver `specs/idiomas.md`.
- **Grafo de historia + linyera-oráculo de pistas (Fase 1, v=61)**: el linyera filósofo tira pistas
  según en qué punto de la historia estás, con spoiler escalado por insistencia. Grafo ensamblado de las
  fichas (` ```hist `) por `tools/gen-historia.mjs` → `js/historia.js`; `js/hint-engine.js` (frontera +
  cercanía). Capa aditiva, solo describe. Camino crítico listo. Ver `specs/nivel-1/historia-grafo.md`.
- **Opciones** (`js/config.js`): tamaño de fuente, duración/fundido del texto, API key (BYOK).
- **Calle Florida y Lavalle** con NPCs, decoración, enemigos (peatones/drones), pickups,
  y la **cola de la casa de cambio** (10 personas distintas).
- **EducaciónIT** (3 pisos con ascensor), **Garbarino**, **Cemento** (Almafuerte/Iorio),
  **Chorería**.
- **Arcade** con 4 máquinas jugables (Pac-Man, Galaga, Frogger, Trucotron) + puerta secreta
  → **truco con el Tahúr** (te roba la guita, bailarinas, música de telo).
- **Super chino** (vista de arriba): góndolas que rotan, **changuito** (agarrás sin pagar →
  pagás en la CAJA, vuelto en caramelos), garcas de carne/fiambre, **Mega Drive** (easter egg),
  **ninjas samurái** si rajás sin pagar, puerta oscura de la familia y puerta secreta a la cueva.
  El chino **no acepta caramelos** como pago.
- **Disquería** (vista de arriba): comprás vinilo → **ticket de Cemento**.
- **Galería / Sótano / Cuevas del dólar**: tiendas raras, 3 cueveros, **tormenta solar** y
  **portal final** en la Casa de Cambio Oficial.
- **3 borrachines + edificio abandonado de 20 pisos**. Cada borracho tiene algo en la mano
  (vino/cerveza/porro) y quiere de regalo fiambre / **Diosa Tropical** / carne; te tiran cosas
  al azar y la pista se revela hablándole. Pisos **impares = depto de lujo** (cocina, baño, living
  con tele, joyas y **maletín de dólares**) cuidado por un **linyera filósofo** (Diógenes: “corréte
  que me tapás el sol”) que te frena si querés agarrar el maletín/joyas; **pares = destruidos** (yonquis).
- **Economía**: monedas, caramelos (vuelto), **changuito virtual**, Diosa Tropical, carne,
  fiambre, munición, vida.
- **Música chiptune** por zona (tango, cumbia, eighties, metal, dance, telo).
- **Tests en 2 niveles**: e2e headless (`node tests/e2e.js`, lógica + auditoría de assets) y
  **web smoke** en navegador real (`tests/web-smoke.mjs`, Playwright+Chromium, corre en CI) que ve
  render/CSS/layout (consola, botón ENTRAR no cortado, canvas dibuja, screenshots).
- **Links**: la intro linkea al repo (GitHub) y el README al juego online (GitHub Pages).
- **Presencia "jugando ahora"** (`js/presence.js`, capa aditiva opcional): contador en la intro;
  backend mínimo en `presence-server/` (Node propio o Cloudflare Worker). Sin endpoint → no muestra
  nada y el juego anda igual. Ver `presence-server/README.md`.
- **Auto-escalado de pantalla** (`js/fit.js`, capa aditiva): el `#stage` se escala con
  `transform: scale()` para llenar la ventana sin deformar (canvas + HUD juntos). No hay que hacer
  zoom en el navegador. Mismo seam que serviría para mobile.

---

## 🔜 Ideas / pendientes (sin empezar)

Ordenadas por impacto. Nada de esto está hecho.

### Idiomas / i18n (inglés) — ✅ COMPLETO para Nivel 1 (v=60)
Ver [`specs/idiomas.md`](specs/idiomas.md) (**source of truth · §13 = dónde seguir**). El juego ENTERO se
puede jugar en inglés (verificado en navegador real: intro "SOLAR STORM", botón "HIT THE STREET", etc.).

**Fase 1 hecha (v=54):** runtime `js/i18n.js` + catálogos
`js/lang/es.js`/`en.js` (UI estática, paridad 29/29) + `data-i18n` en `index.html` + selector en ⚙ Opciones
+ pools por idioma (`Dialogos[es|en]`, `_D/_Dp` vía `I18n.dict`) + chat IA en el idioma activo (transcreación)
+ generador multi-idioma (`OPENROUTER_LANGS=es,en`). Resolución `?lang`→localStorage→navigator→es-AR.
- [x] **Fase 2 · Pasada A (v=57):** TODA la narración de `game.js` (~90 `setMsg`/prompts/fin/labels/arcade)
      a claves `t()/tList()` (`js/lang/game.es.js`+`game.en.js`, paridad 149/149). En `en` ya sale en inglés.
- [x] **Fase 2 · Pasada B (v=58):** `level.js` (salas/NPCs/diálogos/labels) traducido en el punto de display
      con `js/lang/level.en.js` + helper `TX()`. `level.js` NO se tocó: sus strings quedan como **id interno
      estable** (los regex `/Búnker/`,`/Truco/`,`/Garbarino/` y el wiring por `name` siguen intactos).
- [x] **Fase 2 · Pasada C (v=59):** sub-pantallas que faltaban — **super chino** (`super.js`), **disquería**
      (`vinilos.js`), **arcade** (`arcade.js`: HUD/banners/Street Fighter/Truco) y **estado del chat IA** en
      Opciones (`ai.js`) — cableadas a `T()` (claves `sup.*`/`vin.*`/`arc.*`/`ai.*`, paridad 263/263).
- [x] **`Dialogos.en` completo (v=60):** 9/9 pools llenos (se completó `linyera_llanto` con
      `OPENROUTER_ONLY=linyera_llanto`, flag nuevo del generador para top-up sin churn). **Glosario de
      transcreación** centralizado en [`specs/glosario-transcreacion.md`](specs/glosario-transcreacion.md).

**Qué sigue (OPCIONAL — ver `specs/idiomas.md` §13):**
- [ ] Regenerar `Dialogos.en` para más variedad / completar `linyera_llanto`: `OPENROUTER_LANGS=es,en node tools/gen-dialogos.mjs`.
- [ ] Glosario de transcreación por término (falopa, linyera, chino…) centralizado.
- [ ] 3er idioma (ej. `pt-BR`): para `level.js` conviene **migrarlo a claves `t()`** (hoy `level.en.js` es un
      mapa es→en puntual). Nivel 2 debería nacer ya con claves `t()` desde el principio.

### IA / diálogos
- [x] **`tools/gen-dialogos.mjs` lee las fichas** (`specs/nivel-1/personajes/*`, bloques ` ```gen `):
      los pools salen de cada personaje. (Pendiente: usar también la Personalidad completa como
      contexto, no sólo la `seed`.)
- [ ] Más NPCs chateables con persona acotada (cuevero, tahúr) reusando su bloque Personalidad.
- [ ] **Ollama local** como fuente del chat (modo C, para ver luego): correr un modelo local
      (`http://localhost:11434`) para quien lo tenga — cero costo/cuota, privado, sin clave. Mismo
      seam (`AI.chat()`), se agregaría `viaOllama()` en la cadena de prioridad + detección en ⚙ Opciones.
      Detalle en `specs/ia-openrouter.md` → "Modo C (Ollama local)".

### Loop de supervivencia — pulido pendiente
Ver [`specs/nivel-1/loop-supervivencia.md`](specs/nivel-1/loop-supervivencia.md). El MVP está; falta:
- [ ] **Animar el fuego** de la barricada del chino (llamas parpadeando).
- [ ] **Sprite de los ninjas yéndose al recital** cuando Iorio toca (hoy solo texto).
- [ ] **Balance** de los números placeholder (decay −3/30s, comida −10/+40, falopa, plata 5–20).
- [x] **RF-7 — colapso en ruinas** (v=50): tras la tormenta, EducaciónIT / arcade / chorería /
      Garbarino quedan **clausurados** (puerta bloqueada con mensaje + tablones cruzados sobre la
      fachada). Sobreviven super, cueva/galería, abandonado, Cemento (Iorio) y la Casa de Cambio.

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
- [ ] **Mobile / touch**: hoy es teclado+mouse, no anda en celular. → ver
      **[📱 Soporte para celulares](#-soporte-para-celulares-mobile)** abajo (estrategia analizada).
- [ ] Extender el e2e para **simular navegación real** (caminar hasta una puerta, gatillar la
      tormenta y verificar la victoria), no solo boot + auditoría de assets.
- [ ] Considerar partir `art.js` (es enorme) en módulos por categoría.

---

## 📱 Soporte para celulares (mobile)

> Decisión de diseño: lo vamos a hacer **sin tocar el código del juego** (los 11 `js/*.js`),
> como una **capa aditiva** aparte. Así el core sigue siendo fácil de mantener: la versión
> de escritorio no se entera de que existe la mobile.

### Por qué se puede hacer “por afuera” (el seam)

Todo el input del juego pasa por **un único módulo**, `js/input.js`, y se lee siempre como:

- `Input.keys['a' | 'd' | 'w' | ' ' | 'e' | 'escape' | …]`  (objeto **mutable** público)
- `Input.mouse.x`, `Input.mouse.y`, `Input.mouse.down`  (objeto **mutable** público)

`game.js`, `player.js`, `super.js`, `vinilos.js` y `arcade.js` **nunca** leen el teclado/mouse
directo: leen estos dos objetos. Eso es el **seam**: una capa mobile puede **escribir** en
`Input.keys`/`Input.mouse` y el juego entero responde igual, sin cambiar una línea del core.
(El juego **no depende** de la capa mobile; la capa mobile depende del juego. Dependencia en
un solo sentido = mantenible.)

### Estrategia recomendada (en capas, de menor a mayor esfuerzo)

**Capa 1 — Adaptador de input táctil (`mobile/touch.js`, NUEVO, no toca el core).**
Un overlay que:
- Detecta touch (`matchMedia('(pointer: coarse)')`).
- Dibuja controles en pantalla (joystick virtual izq. + botones `SALTAR`/`E` der.; para apuntar,
  arrastrar en la mitad derecha; tap = disparar).
- **Traduce** gestos a estado de Input: joystick → `Input.keys['a'/'d']`, botón salto →
  `Input.keys['w']`, botón acción → `Input.keys['e']`, drag → `Input.mouse.x/y`, tap →
  `Input.mouse.down`. Para los modos vista-de-arriba (super/disquería) el mismo joystick ya
  mapea a `a/d/w/s` y los botones a `e`/`escape`.
- Único requisito sobre el core: que `Input.keys`/`Input.mouse` sean mutables y públicos →
  **ya lo son**. Si en algún momento hiciera falta, el ÚNICO cambio tolerable en el core sería
  exponer un helper en `Input` (ej. `Input.set(k,v)`), pero hoy **no hace falta**.

**Capa 2 — Viewport / escalado responsive (`mobile/mobile.css`, NUEVO).**
- Canvas 960×540 fijo, escalado por **CSS** (`width:100%; height:100%; object-fit:contain`)
  para no tocar la lógica de render. Bloquear orientación a **landscape** (cartel “girá el
  teléfono” en portrait) vía CSS + `screen.orientation.lock('landscape')` cuando se pueda.
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">`
  y manejo de `safe-area-inset-*` para el notch.

**Capa 3 — Entry point separado (`mobile.html`, NUEVO).**
- Copia de `index.html` que además incluye `mobile/mobile.css` y `mobile/touch.js` (después de
  `input.js`). Mismos `js/*.js`, mismo `?v=N`. **Cero archivos del core modificados.**
- Opción más prolija para no duplicar HTML: un mini `mobile/boot.js` que, si detecta touch,
  inyecta el CSS y el overlay — así `index.html` podría cargarlo condicionalmente con **una sola
  línea** (`<script src="mobile/boot.js">`), que es el único “toque” y es puramente aditivo.

### Distribución (qué tan “app” querés que sea)

1. **PWA instalable (recomendado para empezar):** agregar `manifest.webmanifest` + íconos +
   un `service-worker.js` que cachee los assets. Queda “instalable” desde el navegador, offline,
   pantalla completa. **No requiere build ni tocar el core.** Como ya es 100% estático, encaja
   directo en GitHub Pages.
2. **Wrapper nativo (App Store / Play Store):** un **proyecto aparte** con **Capacitor**
   (carpeta/repo propio, ej. `tormenta-solar-app/`) que apunta a estos archivos estáticos como
   `webDir`. El juego sigue intacto; Capacitor sólo lo envuelve en un shell nativo y da acceso a
   APIs del cel. Es el “build diferente” literal: vive afuera, no contamina el core.
3. **TWA (Trusted Web Activity):** si ya hay PWA, publicar en Play Store envolviendo la URL de
   Pages. El más barato si no necesitás APIs nativas.

### Orden sugerido de trabajo
1. `mobile/touch.js` + `mobile/mobile.css` + `mobile.html` → jugable al tacto (capas 1–3).
2. Probar en cel real (DevTools device mode no alcanza para gestos finos).
3. PWA (manifest + service worker) → instalable/offline.
4. (Opcional) Capacitor para tiendas.

### Qué NO hacer
- No meter `if (mobile)` desperdigados por `game.js`/`player.js`: rompe el principio de capa única.
- No migrar a un bundler sólo por esto: el seam de Input alcanza sin build.
- Mantener el e2e headless válido para **ambas** versiones (el core no cambia, así que sigue cubriendo).

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
5. **Dos niveles de test.** `node tests/e2e.js` es headless (DOM/canvas mockeado): valida lógica
   y assets, pero **no ve render/CSS/layout**. Para eso está el **web smoke** real
   (`tests/web-smoke.mjs`, Playwright+Chromium) que corre en **GitHub Actions** en cada push y
   chequea consola, que el **botón ENTRAR no quede cortado**, y que el canvas dibuje. Si tocás
   CSS/HTML/layout, confiá en el web smoke (o corrélo local instalando Chromium).

---

## 🧰 Workflow para seguir

```bash
# 1. editar js/*.js
# 2. subir el cache:  ?v=32 -> ?v=33  en index.html (todos los src)
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
- Licencia: **GPLv3** (archivo `LICENSE`). ✅
