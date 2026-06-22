// i18n.js — runtime de idiomas (capa ADITIVA, no rompe el core si falta). Ver specs/idiomas.md.
// Resolución del idioma (orden): ?lang=  →  localStorage(ts_lang, lo que elegís en ⚙ Opciones)
//   →  navigator.language (auto del browser: español→es-AR; CUALQUIER otro idioma no soportado→inglés)
//   →  inglés (FALLBACK internacional: si no se puede detectar nada, English).
// t(key, params) cae: idioma activo → es-AR (catálogo fuente, siempre completo) → la clave cruda.
// Los diálogos de NPCs se piden con I18n.dict(pool) (lee Dialogos[es|en][pool]).
const I18n = (() => {
  const DEFAULT = 'es-AR';        // idioma FUENTE (catálogo completo) — fallback de t() para claves faltantes
  const FALLBACK_LANG = 'en';     // idioma que se usa si el browser trae uno que el juego NO soporta
  const SUPPORTED = ['es-AR', 'en'];
  const NAMES = { 'es-AR': 'Español (Argentina)', 'en': 'English' };
  const LS = 'ts_lang';

  // catálogos de UI (lang/es.js, lang/en.js cargados antes; si faltan, queda {} y t() cae a la clave)
  const catalogs = {
    'es-AR': (typeof LANG_ES !== 'undefined') ? LANG_ES : {},
    'en': (typeof LANG_EN !== 'undefined') ? LANG_EN : {},
  };

  const short = l => (l || '').toLowerCase().startsWith('en') ? 'en' : 'es';   // para Dialogos[es|en]
  function norm(l) {
    if (!l) return null;
    l = String(l).toLowerCase();
    if (l.startsWith('es')) return 'es-AR';
    if (l.startsWith('en')) return 'en';
    return SUPPORTED.includes(l) ? l : null;
  }
  function query() {
    try {
      if (typeof location === 'undefined' || !location.search) return null;
      const m = location.search.match(/[?&]lang=([^&]+)/i);
      return m ? norm(decodeURIComponent(m[1])) : null;
    } catch (e) { return null; }
  }
  function stored() { try { return typeof localStorage !== 'undefined' ? norm(localStorage.getItem(LS)) : null; } catch (e) { return null; } }
  // browser: si es un idioma SOPORTADO (es→es-AR, en→en) lo usa; si trae otro idioma → inglés.
  function fromNav() {
    try {
      if (typeof navigator === 'undefined' || !navigator.language) return null;
      return norm(navigator.language) || FALLBACK_LANG;   // no soportado → inglés
    } catch (e) { return null; }
  }

  // ?lang (override por URL) → tu elección guardada (Opciones) → browser → inglés internacional
  let lang = query() || stored() || fromNav() || FALLBACK_LANG;

  function interp(s, params) {
    if (!params || typeof s !== 'string') return s;
    return s.replace(/\{(\w+)\}/g, (m, k) => (k in params) ? params[k] : m);
  }
  function t(key, params) {
    const s = (catalogs[lang] && catalogs[lang][key]) || (catalogs[DEFAULT] && catalogs[DEFAULT][key]) || key;
    return interp(s, params);
  }
  // como t() pero devuelve un ARRAY del catálogo (para líneas al azar). null si no es array.
  function tList(key) {
    const v = (catalogs[lang] && catalogs[lang][key]) || (catalogs[DEFAULT] && catalogs[DEFAULT][key]);
    return Array.isArray(v) ? v : null;
  }
  function dict(pool) {
    if (typeof Dialogos === 'undefined') return null;
    const k = short(lang);
    const a = (Dialogos[k] && Dialogos[k][pool]) || (Dialogos.es && Dialogos.es[pool]) || Dialogos[pool];
    return (a && a.length) ? a : null;
  }

  // aplica las claves [data-i18n] a la página (textContent o innerHTML si la traducción trae tags)
  function apply(root) {
    if (typeof document === 'undefined') return;
    root = root || document;
    if (document.documentElement) document.documentElement.lang = lang === 'en' ? 'en' : 'es';
    if (!root.querySelectorAll) return;
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const v = t(el.getAttribute('data-i18n'));
      if (/[<>]/.test(v)) el.innerHTML = v; else el.textContent = v;
    });
    // data-i18n-attr="placeholder:opt.aikeyPh;title:foo.bar"
    root.querySelectorAll('[data-i18n-attr]').forEach(el => {
      el.getAttribute('data-i18n-attr').split(';').forEach(pair => {
        const [attr, key] = pair.split(':').map(s => s.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });
  }

  function set(l) {
    const n = norm(l) || DEFAULT;
    lang = n;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(LS, n); } catch (e) {}
    apply();
    syncSelect();
  }

  // --- selector en ⚙ Opciones (<select id="opt-lang">) ---
  function syncSelect() {
    if (typeof document === 'undefined' || !document.getElementById) return;
    const sel = document.getElementById('opt-lang');
    if (sel && sel.value !== lang) sel.value = lang;
  }
  function initUI() {
    try {
      if (typeof document === 'undefined' || !document.getElementById) return;
      const sel = document.getElementById('opt-lang');
      if (sel) {
        if (!sel.options || !sel.options.length) {
          for (const code of SUPPORTED) {
            const o = document.createElement('option');
            o.value = code; o.textContent = NAMES[code] || code;
            sel.appendChild(o);
          }
        }
        sel.value = lang;
        sel.addEventListener('change', () => set(sel.value));
      }
      apply();
    } catch (e) { /* la UI es opcional */ }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI);
    else initUI();
  }
  return { t, tList, dict, apply, set, get lang() { return lang; }, DEFAULT, SUPPORTED, short: () => short(lang) };
})();
