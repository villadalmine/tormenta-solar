// noticias.js — trae el banco de NOTICIAS del CINE (cine-noticias.md F1b). Best-effort, sin bloquear.
// Lo llena el cron (gen-noticias.mjs) y el proxy lo sirve en GET /noticias. La pantalla del cine elige una
// al azar cada vez que entrás (en game.js). Sin proxy / sin red → window.NOTICIAS queda vacío y el cine
// muestra un cartel "sin señal" (el juego anda igual).
// El proxy archiva hasta 7 días: window.NOTI_DIAS = días disponibles; window.fetchNoticiasDay(d) = funciones viejas
// (las vende el GUARDA del cine por caramelos).
(() => {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';   // mismo proxy que ai.js
  window.NOTICIAS = window.NOTICIAS || [];
  window.NOTI_DIAS = window.NOTI_DIAS || [];
  fetch(PROXY + '/noticias')
    .then(r => (r.ok ? r.json() : null))
    .then(d => { if (d && Array.isArray(d.noticias)) window.NOTICIAS = d.noticias; if (d && Array.isArray(d.dias)) window.NOTI_DIAS = d.dias; })
    .catch(() => {});
  // trae las noticias de un día puntual del archivo (YYYY-MM-DD) → promesa de array (vacío si falla)
  window.fetchNoticiasDay = (day) => fetch(PROXY + '/noticias?day=' + encodeURIComponent(day))
    .then(r => (r.ok ? r.json() : null)).then(d => (d && Array.isArray(d.noticias)) ? d.noticias : []).catch(() => []);
  // MUNDIAL: equipo→último resultado (quest de los hinchas del cine, §9). window.MUNDIAL = {equipos:{...}}.
  window.MUNDIAL = window.MUNDIAL || { equipos: {} };
  fetch(PROXY + '/mundial')
    .then(r => (r.ok ? r.json() : null))
    .then(d => { if (d && d.equipos) window.MUNDIAL = { equipos: d.equipos }; })
    .catch(() => {});
})();
