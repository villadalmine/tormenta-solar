// propaganda.js — banco de CARTELES de propaganda (capa ADITIVA) para el cine. Marcas FALSAS estilo Buenos Aires,
// por rubro (comida/ropa/electrónica/bizarro). Los carteles del cine rotan slogans de acá (game.js).
// Trae el banco vivo del proxy (GET /propaganda, lo llena un cron con IA) y, si no hay red, usa el ESTÁTICO de abajo.
// FIXED = carteles que SIEMPRE están (no los pisa el banco IA): propaganda del otro juego del Ciruja + TIPS del juego.
(() => {
  if (typeof window === 'undefined') return;
  // SIEMPRE presentes (se mergean con el banco IA). cat: juego | tip
  const FIXED = [
    { cat: 'juego', brand: 'CRUZ DEL SUR', slogan: 'el otro juego del Ciruja → cruzdelsur.cybercirujas.club/game' },
    { cat: 'tip', brand: 'TIP', slogan: 'al linyera del 7º piso pedile noticias: si acertás, caramelos 🍬' },
    { cat: 'tip', brand: 'TIP', slogan: 'el guarda te pasa funciones viejas... regateale con 🤝' },
    { cat: 'tip', brand: 'TIP', slogan: 'los hinchas quieren resultados del Mundial: andá al guarda' },
    { cat: 'tip', brand: 'TIP', slogan: 'apretá [R] en el cine y te leen las noticias en voz alta' },
    { cat: 'tip', brand: 'TIP', slogan: 'post-tormenta comprá fierro en la galería, pibe' },
  ];
  // banco ESTÁTICO de respaldo (BsAs, fake, con humor) — si el proxy no responde
  const BASE = [
    { cat: 'comida', brand: 'Choripán Don Ramón', slogan: 'el chori que te hace feliz' },
    { cat: 'comida', brand: 'Bondiola del Abasto', slogan: 'sale calentita, maestro' },
    { cat: 'comida', brand: 'Pizzería La Mezzeta', slogan: 'fugazzeta hasta el techo' },
    { cat: 'ropa', brand: 'Jeans Once Premium', slogan: 'del shopping del Once' },
    { cat: 'ropa', brand: 'Zapatillas Adadas', slogan: 'corré que te corro' },
    { cat: 'electronica', brand: 'Celulares Garbatel', slogan: 'anda con monedas' },
    { cat: 'electronica', brand: 'Tele Plasma-Tronics', slogan: '4K (trucho) garpa' },
    { cat: 'bizarro', brand: 'Taller de Ovnis Bajo Flores', slogan: 'reparamos platos voladores' },
    { cat: 'bizarro', brand: 'Empanadas Cuánticas', slogan: 'están y no están' },
    { cat: 'bizarro', brand: 'Remís a Marte', slogan: 'tarifa nocturna' },
  ];
  window.PROPAGANDA = FIXED.concat(BASE);
  if (typeof fetch !== 'function') return;
  const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';   // mismo proxy que ai.js/noticias.js
  fetch(PROXY + '/propaganda')
    .then(r => (r.ok ? r.json() : null))
    .then(d => { const a = d && Array.isArray(d.carteles) ? d.carteles : null; if (a && a.length) window.PROPAGANDA = FIXED.concat(a); })
    .catch(() => {});
})();
