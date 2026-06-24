// mobile/touch.js — adaptador de input TÁCTIL (capa ADITIVA, no toca el core).
// Traduce gestos a los objetos públicos mutables del juego: Input.keys (a/d/w/s), Input.mouse (apuntar
// + disparar), y dispara 'e'/'Escape' como eventos de teclado (interact / salir), igual que el teclado.
// Joystick izq = mover · mitad derecha = apuntar y disparar · botón E = usar · botón ESC = salir/cerrar.
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof Input === 'undefined') return;             // sin el juego cargado, no hace nada
  const canvas = document.getElementById('screen');
  if (!canvas) return;

  // --- helpers ---
  const setKey = (k, v) => { Input.keys[k] = v; };
  const fireKey = (key, type) => { try { document.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true })); } catch (e) {} };
  function aimAt(clientX, clientY) {                     // pantalla → coords del canvas (como hace input.js)
    const r = canvas.getBoundingClientRect();
    Input.mouse.x = (clientX - r.left) * (canvas.width / r.width);
    Input.mouse.y = (clientY - r.top) * (canvas.height / r.height);
  }

  // --- DOM de los controles ---
  const root = document.createElement('div');
  root.id = 'touch-controls';
  root.innerHTML =
    '<div id="tc-aim"></div>' +
    '<div id="tc-stick"><div id="tc-knob"></div></div>' +
    '<button id="tc-e" class="tc-btn" aria-label="usar">E</button>' +
    '<button id="tc-esc" class="tc-btn" aria-label="salir">ESC</button>';
  document.body.appendChild(root);
  const stick = root.querySelector('#tc-stick');
  const knob  = root.querySelector('#tc-knob');
  const aimZone = root.querySelector('#tc-aim');

  // --- joystick: a/d/w/s (sirve para el plataformas Y para los modos vista-de-arriba) ---
  let stickId = null, cx = 0, cy = 0;
  const DZ = 15, MAX = 46;
  function stickStart(t) { stickId = t.identifier; const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; stickMove(t); }
  function stickMove(t) {
    let dx = t.clientX - cx, dy = t.clientY - cy;
    const m = Math.hypot(dx, dy) || 1; if (m > MAX) { dx = dx / m * MAX; dy = dy / m * MAX; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    setKey('a', dx < -DZ); setKey('d', dx > DZ); setKey('w', dy < -DZ); setKey('s', dy > DZ);
  }
  function stickEnd() { stickId = null; knob.style.transform = 'translate(0,0)'; setKey('a', false); setKey('d', false); setKey('w', false); setKey('s', false); }

  // --- mitad derecha: apuntar + disparar (mientras tengas el dedo apoyado) ---
  let aimId = null;
  function aimStart(t) { aimId = t.identifier; Input.mouse.down = true; aimAt(t.clientX, t.clientY); }
  function aimMove(t) { aimAt(t.clientX, t.clientY); }
  function aimEnd() { aimId = null; Input.mouse.down = false; }

  const find = (list, id) => { for (const t of list) if (t.identifier === id) return t; return null; };
  document.addEventListener('touchstart', e => {
    for (const t of e.changedTouches) {
      if (stick.contains(t.target)) { if (stickId === null) stickStart(t); }
      else if (t.target === aimZone) { if (aimId === null) aimStart(t); }
    }
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (stickId !== null) { const t = find(e.touches, stickId); if (t) stickMove(t); }
    if (aimId !== null)   { const t = find(e.touches, aimId);   if (t) aimMove(t); }
  }, { passive: true });
  const onEnd = e => { for (const t of e.changedTouches) { if (t.identifier === stickId) stickEnd(); if (t.identifier === aimId) aimEnd(); } };
  document.addEventListener('touchend', onEnd);
  document.addEventListener('touchcancel', onEnd);

  // --- botones E (usar/interactuar) y ESC (cerrar chat / salir de sub-modos) ---
  // E: mismo efecto que la tecla 'e' (game.js interact + input.js keys). down en touchstart, up en touchend.
  const btnE = root.querySelector('#tc-e'), btnEsc = root.querySelector('#tc-esc');
  btnE.addEventListener('touchstart', e => { e.preventDefault(); fireKey('e', 'keydown'); }, { passive: false });
  btnE.addEventListener('touchend',   e => { e.preventDefault(); fireKey('e', 'keyup'); }, { passive: false });
  btnEsc.addEventListener('touchstart', e => { e.preventDefault(); setKey('escape', true); fireKey('Escape', 'keydown'); }, { passive: false });
  btnEsc.addEventListener('touchend',   e => { e.preventDefault(); setKey('escape', false); fireKey('Escape', 'keyup'); }, { passive: false });

  // IMPORTANTE: ocultar los controles cuando hay un MENÚ abierto. #stage usa transform:scale (fit.js) → crea
  // un stacking context propio; los overlays (z-10) viven adentro, pero #touch-controls cuelga del body, así
  // que su zona de apuntar quedaría POR ENCIMA de los menús y se comería los taps/clicks (Opciones, chat,
  // intro). Mientras hay un overlay visible, escondemos los controles para que el menú reciba los toques.
  const overlays = ['intro', 'options', 'chat', 'endscreen'].map(id => document.getElementById(id)).filter(Boolean);
  function syncVisible() {
    const menuOpen = overlays.some(o => !o.classList.contains('hidden'));
    root.style.display = menuOpen ? 'none' : '';
  }
  syncVisible();
  if (typeof MutationObserver === 'function') {
    const mo = new MutationObserver(syncVisible);
    overlays.forEach(o => mo.observe(o, { attributes: true, attributeFilter: ['class'] }));
  }
})();
