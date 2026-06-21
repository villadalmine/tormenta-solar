// fit.js — escala el #stage para llenar la ventana manteniendo la proporción 800x448.
// Capa ADITIVA: no toca el render ni la lógica; solo agranda/achica el contenedor con
// transform: scale(), que escala el canvas Y el HUD juntos (queda nítido, sin deformar).
(() => {
  if (typeof document === 'undefined') return;
  const stage = document.getElementById('stage');
  if (!stage) return;
  const BASE_W = 800, BASE_H = 448;   // tamaño base del stage (igual al canvas)

  function fit() {
    // el #stage está fijo arriba-izquierda; lo escalamos desde top-left y lo centramos con
    // translate. Como s = lo que entra por el lado más justo, NUNCA se pasa del viewport
    // (no se corta) y llena la pantalla por uno de los dos lados.
    const s = Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H);
    const tx = (window.innerWidth  - BASE_W * s) / 2;
    const ty = (window.innerHeight - BASE_H * s) / 2;
    stage.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + (s > 0 ? s : 1) + ')';
  }

  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fit);
  else fit();
})();
