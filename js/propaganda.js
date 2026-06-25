// propaganda.js — banco de CARTELES de propaganda (capa ADITIVA) para el cine. Marcas FALSAS estilo Buenos Aires,
// por rubro (comida/ropa/electrónica/bizarro). Los carteles del cine rotan slogans de acá (game.js).
// Trae el banco vivo del proxy (GET /propaganda, lo llena un cron con IA) y, si no hay red, usa el ESTÁTICO de abajo
// → los carteles cambian igual. Sin proxy/sin red el juego anda EXACTAMENTE igual.
(() => {
  // banco ESTÁTICO de respaldo (BsAs, fake, con humor). cat: comida | ropa | electronica | bizarro
  const BASE = [
    { cat: 'comida', brand: 'Choripán Don Ramón', slogan: 'el chori que te hace feliz' },
    { cat: 'comida', brand: 'Bondiola del Abasto', slogan: 'sale calentita, maestro' },
    { cat: 'comida', brand: 'Empanadas Doña Rosa', slogan: 'repulgue garantizado' },
    { cat: 'comida', brand: 'Pizzería La Mezzeta', slogan: 'fugazzeta hasta el techo' },
    { cat: 'comida', brand: 'Helados Don Pepe', slogan: 'el palito que no se cae' },
    { cat: 'ropa', brand: 'Jeans Once Premium', slogan: 'del shopping del Once' },
    { cat: 'ropa', brand: 'Camperas Avellaneda', slogan: 'frío no quedás' },
    { cat: 'ropa', brand: 'Zapatillas Adadas', slogan: 'corré que te corro' },
    { cat: 'ropa', brand: 'Medias La Salada', slogan: '3x2, nunca solas' },
    { cat: 'electronica', brand: 'Celulares Garbatel', slogan: 'anda con monedas' },
    { cat: 'electronica', brand: 'Tele Plasma-Tronics', slogan: '4K (trucho) garpa' },
    { cat: 'electronica', brand: 'Auriculares La Cueva', slogan: 'bluetooth a veces' },
    { cat: 'electronica', brand: 'Cargador Universal Once', slogan: 'explota gratis' },
    { cat: 'bizarro', brand: 'Taller de Ovnis Bajo Flores', slogan: 'reparamos platos voladores' },
    { cat: 'bizarro', brand: 'Empanadas Cuánticas', slogan: 'están y no están' },
    { cat: 'bizarro', brand: 'Brujería Express Liniers', slogan: 'mal de ojo en 24hs' },
    { cat: 'bizarro', brand: 'Remís a Marte', slogan: 'tarifa nocturna' },
    { cat: 'bizarro', brand: 'Pizzería Interdimensional', slogan: 'fugazzeta de otro plano' },
  ];
  if (typeof window === 'undefined') return;
  window.PROPAGANDA = window.PROPAGANDA && window.PROPAGANDA.length ? window.PROPAGANDA : BASE;
  if (typeof fetch !== 'function') return;
  const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';   // mismo proxy que ai.js/noticias.js
  fetch(PROXY + '/propaganda')
    .then(r => (r.ok ? r.json() : null))
    .then(d => { const a = d && Array.isArray(d.carteles) ? d.carteles : null; if (a && a.length) window.PROPAGANDA = a; })
    .catch(() => {});
})();
