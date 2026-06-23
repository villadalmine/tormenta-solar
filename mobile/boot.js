// mobile/boot.js — carga la capa MOBILE solo si es un dispositivo táctil. 100% ADITIVO y
// DORMIDO en desktop: con pointer fino no hace NADA (el juego queda idéntico, los tests no se enteran).
// Una sola línea en index.html (<script src="mobile/boot.js?v=N">) enchufa todo lo de abajo.
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const coarse = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
  if (!coarse) return;                                  // desktop → no se activa

  // viewport apto para juego (sin zoom, respetando el notch)
  const vp = document.querySelector('meta[name=viewport]');
  if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');

  // cartel "girá el teléfono" (lo muestra/oculta el CSS según orientación)
  const hint = document.createElement('div');
  hint.id = 'rotate-hint';
  hint.textContent = '📱 ↻  Girá el teléfono / Rotate your phone — landscape';
  document.body.appendChild(hint);

  // mismo ?v= que este script, para el cache-busting de la capa mobile
  const m = document.currentScript && /[?&]v=([0-9]+)/.exec(document.currentScript.src);
  const q = m ? ('?v=' + m[1]) : '';
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = 'mobile/mobile.css' + q;
  document.head.appendChild(css);
  const js = document.createElement('script');
  js.src = 'mobile/touch.js' + q;
  document.body.appendChild(js);
})();
