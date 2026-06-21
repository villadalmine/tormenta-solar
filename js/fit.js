// fit.js — escala el #stage para llenar la ventana manteniendo la proporción 800x448.
// Capa ADITIVA: no toca el render ni la lógica; solo agranda/achica el contenedor con
// transform: scale(), que escala el canvas Y el HUD juntos (queda nítido, sin deformar).
(() => {
  if (typeof document === 'undefined') return;
  const stage = document.getElementById('stage');
  if (!stage) return;
  const BASE_W = 800, BASE_H = 448;   // tamaño base del stage (igual al canvas)
  const MARGIN = 24;                  // aire para que no pegue contra los bordes

  function fit() {
    // s = lo que entre en la ventana por el lado más justo → NUNCA se sale (no se corta).
    const s = Math.min(
      (window.innerWidth  - MARGIN) / BASE_W,
      (window.innerHeight - MARGIN) / BASE_H
    );
    stage.style.transform = 'scale(' + (s > 0 ? s : 1) + ')';
  }

  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fit);
  else fit();
})();
