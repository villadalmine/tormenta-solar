// chusmerio.js — banco de frases de CHUSMERÍO ambiente (npcs-vivos.md). Lo llena un cron con IA y el proxy lo sirve
// en GET /chusmerio. Los NPC del juego las rotan en globitos (game.js, ambientPool). Capa ADITIVA: sin red, usa el
// ESTÁTICO de abajo → los NPC chusmean igual. El estado vivo (lo que hiciste) lo agrega game.js desde worldSnapshot.
(() => {
  if (typeof window === 'undefined') return;
  const BASE = [
    'che, ¿escuchaste que fue un satélite con IA y no el sol?',
    'el chino atrincherado de nuevo, qué quilombo',
    'en el cine están pasando el Mundial, andá',
    'estos carteles cambian solos, cosa rara',
    'el tahúr te va a afanar al truco, ojo',
    'los borrachines no te dejan pasar si no les das nada',
    'desde la tormenta esto es tierra de nadie, loco',
    'el dólar está a lo que diga el arbolito',
    '¿viste al linyera filósofo? sabe más que la tele',
  ];
  window.CHUSMERIO = (window.CHUSMERIO && window.CHUSMERIO.length) ? window.CHUSMERIO : BASE;
  if (typeof fetch !== 'function') return;
  const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';
  fetch(PROXY + '/chusmerio')
    .then(r => (r.ok ? r.json() : null))
    .then(d => { if (d && Array.isArray(d.lineas) && d.lineas.length) window.CHUSMERIO = d.lineas; })
    .catch(() => {});
})();
