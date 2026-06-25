// noticias.js — trae el banco de NOTICIAS del CINE (cine-noticias.md F1b). Best-effort, sin bloquear.
// Lo llena el cron (gen-noticias.mjs) y el proxy lo sirve en GET /noticias. La pantalla del cine elige una
// al azar cada vez que entrás (en game.js). Sin proxy / sin red → window.NOTICIAS queda vacío y el cine
// muestra un cartel "sin señal" (el juego anda igual).
(() => {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';   // mismo proxy que ai.js
  window.NOTICIAS = window.NOTICIAS || [];
  fetch(PROXY + '/noticias')
    .then(r => (r.ok ? r.json() : null))
    .then(d => { if (d && Array.isArray(d.noticias)) window.NOTICIAS = d.noticias; })
    .catch(() => {});
})();
