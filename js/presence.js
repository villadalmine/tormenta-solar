// presence.js — contador de "jugando ahora" (capa ADITIVA, no toca el core del juego).
//
// Cómo funciona: cada pestaña abierta manda un "latido" (heartbeat) a un endpoint que
// cuenta cuántos latieron en los últimos ~30s y devuelve { count }. Mostramos ese número
// en la intro. Si NO hay endpoint configurado (o no responde), no muestra nada y no rompe
// nada: el juego es 100% estático igual. Ver presence-server/ para levantar el endpoint
// (server propio en tu infra, o un Worker de Cloudflare gratis para GitHub Pages).
const Presence = (() => {
  // 👉 Pegá acá la URL de tu endpoint de presencia. Vacío = desactivado.
  //    Ej: 'https://tormenta-presence.TUUSUARIO.workers.dev'
  //    Ej: 'https://miservidor.com/presence'
  const ENDPOINT = '';

  const BEAT_MS = 12000;   // cada cuánto late
  const el = (typeof document !== 'undefined' && document.getElementById)
    ? document.getElementById('online') : null;

  // sin endpoint, sin fetch (e2e/headless) o sin lugar donde dibujar → no hacemos nada.
  if (!ENDPOINT || typeof fetch !== 'function' || !el) {
    return { start() {}, count: 0 };
  }

  // id por pestaña (sobrevive recargas dentro de la misma pestaña).
  let id;
  try {
    id = sessionStorage.getItem('ts_pid');
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('ts_pid', id); }
  } catch (e) { id = Math.random().toString(36).slice(2); }

  let timer = null, last = 0;

  function show(n) {
    if (n > 0) { el.textContent = '🟢 ' + n + (n === 1 ? ' jugando ahora' : ' jugando ahora'); el.classList.remove('hidden'); }
    else { el.classList.add('hidden'); }
  }

  async function beat() {
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
        keepalive: true,
      });
      if (!r.ok) throw new Error('http ' + r.status);
      const data = await r.json();
      last = (data && typeof data.count === 'number') ? data.count : 0;
      show(last);
    } catch (e) {
      // endpoint caído / no configurado bien → escondemos, sin spamear errores.
      el.classList.add('hidden');
    }
  }

  function start() {
    if (timer) return;
    beat();
    timer = setInterval(() => {
      // si la pestaña está oculta no contamos como "jugando" (ahorra requests).
      if (typeof document !== 'undefined' && document.hidden) return;
      beat();
    }, BEAT_MS);
  }

  // arranca solo al cargar; la intro ya está visible.
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }

  return { start, get count() { return last; } };
})();
