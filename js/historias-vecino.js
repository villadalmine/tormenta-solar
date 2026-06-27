// historias-vecino.js — banco VIVO de historias de terror del VECINO de los edificios clausurados (capa ADITIVA).
// El vecino te flashea relatos de terror del edificio de al lado; tras un par, te ofrece "¿querés pasar?" y la
// máquina de niveles genera un nivel con la última historia como semilla (game.js → VECINO_STORIES + este banco).
// Acá traemos el banco que AUTORA la IA (GET /historias, lo llena el cron gen-historias.mjs) → window.HISTORIAS_VECINO.
// Si no hay red, queda [] y game.js usa su banco ESTÁTICO de respaldo (nunca rompe). Mismo patrón que propaganda.js.
// Formato de cada historia: { id, edif, motif, style:'wall'|'aisles'|'climb', es:{gancho,tale}, en:{gancho,tale} }.
(() => {
  if (typeof window === 'undefined') return;
  window.HISTORIAS_VECINO = window.HISTORIAS_VECINO || [];   // [] = solo el banco estático de game.js
  if (typeof fetch !== 'function') return;
  const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';   // mismo proxy que ai.js/propaganda.js
  fetch(PROXY + '/historias')
    .then(r => (r.ok ? r.json() : null))
    .then(d => { const a = d && Array.isArray(d.historias) ? d.historias : null; if (a && a.length) window.HISTORIAS_VECINO = a; })
    .catch(() => {});
})();
