// config.js — opciones del juego (capa ADITIVA, no rompe el core si falta).
// Persiste en localStorage y aplica por CSS vars (--ui-font-scale, --ui-msg-fade) + Config.msgMs.
// game.js usa Config.msgMs solo si Config existe (typeof guard), así el e2e headless no lo necesita.
const Config = (() => {
  const DEFAULTS = { fontScale: 1.0, msgMs: 1.0, msgFade: 150 };
  const LIMITS   = { fontScale: [0.7, 1.3], msgMs: [0.5, 2.0], msgFade: [0, 600] };
  const FMT = { fontScale: v => Math.round(v * 100) + '%', msgMs: v => v.toFixed(2) + '×', msgFade: v => v + 'ms' };
  let cfg = { ...DEFAULTS };

  function load() {
    try {
      if (typeof localStorage === 'undefined') return;
      const s = JSON.parse(localStorage.getItem('ts_config') || 'null');
      if (s) cfg = { ...DEFAULTS, ...s };
    } catch (e) { /* defaults */ }
  }
  function save() {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('ts_config', JSON.stringify(cfg)); } catch (e) {}
  }
  function apply() {
    if (typeof document === 'undefined' || !document.documentElement) return;
    const r = document.documentElement.style;
    r.setProperty('--ui-font-scale', String(cfg.fontScale));
    r.setProperty('--ui-msg-fade', cfg.msgFade + 'ms');
  }
  const clamp = (k, v) => { const [a, b] = LIMITS[k] || [-1e9, 1e9]; return Math.min(b, Math.max(a, Math.round(v * 100) / 100)); };
  function set(k, v) { if (k in cfg) { cfg[k] = clamp(k, v); save(); apply(); refreshUI(); } return cfg[k]; }
  function reset() { cfg = { ...DEFAULTS }; save(); apply(); refreshUI(); }

  // ---- UI (panel de Opciones) ----
  const $ = id => (typeof document !== 'undefined' && document.getElementById) ? document.getElementById(id) : null;
  function refreshUI() { for (const k of Object.keys(cfg)) { const el = $('ov-' + k); if (el && FMT[k]) el.textContent = FMT[k](cfg[k]); } }
  function show() { const o = $('options'); if (o) { o.classList.remove('hidden'); refreshUI(); } }
  function hide() { const o = $('options'); if (o) o.classList.add('hidden'); }
  function toggle() { const o = $('options'); if (o) (o.classList.contains('hidden') ? show() : hide()); }
  function initUI() {
    try {
      if (typeof document === 'undefined' || !document.getElementById) return;
      const opt = $('optBtn'); if (opt) opt.addEventListener('click', show);
      const cl = $('opt-close'); if (cl) cl.addEventListener('click', hide);
      const rs = $('opt-reset'); if (rs) rs.addEventListener('click', reset);
      if (document.querySelectorAll) document.querySelectorAll('.opt-btn').forEach(b => b.addEventListener('click', () => {
        set(b.getAttribute('data-k'), (cfg[b.getAttribute('data-k')] || 0) + parseFloat(b.getAttribute('data-d')));
      }));
      // atajo 'o' → abre/cierra Opciones, PERO no si estás escribiendo en un campo (ej. tu nombre con una "o" cerraba el panel)
      document.addEventListener('keydown', e => { if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return; if ((e.key || '').toLowerCase() === 'o') toggle(); });
      refreshUI();
    } catch (e) { /* la UI es opcional */ }
  }

  load(); apply();
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI);
    else initUI();
  }
  return { get: k => cfg[k], set, reset, all: () => ({ ...cfg }), get msgMs() { return cfg.msgMs; } };
})();
