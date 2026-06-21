// input.js — teclado + mouse (sin pointer lock; el mouse apunta libremente).
const Input = (() => {
  const keys = {};
  const mouse = { x: 0, y: 0, down: false };
  let canvas = null;

  function bind(c) {
    canvas = c;
    document.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    });
    document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
    function toCanvas(e) {
      const r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    }
    canvas.addEventListener('mousemove', toCanvas);
    canvas.addEventListener('mousedown', e => { if (e.button === 0) { mouse.down = true; toCanvas(e); } });
    window.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  const left  = () => keys['a'] || keys['arrowleft'];
  const right = () => keys['d'] || keys['arrowright'];
  const jump  = () => keys['w'] || keys[' '] || keys['arrowup'];
  const pressed = k => !!keys[k];

  return { bind, keys, mouse, left, right, jump, pressed };
})();
