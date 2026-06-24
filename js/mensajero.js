// mensajero.js — el MENSAJERO: una sola puerta para que CUALQUIER objeto con frases (cartel, banner, NPC,
// vinilo, góndola…) pida un mensaje pasando SU contexto, y el Mensajero decide QUÉ TIPO de mensaje según lo
// que pasó en el grafo de historia. Es un agente (el objeto) hablándole a otro agente (el Mensajero).
// Capa ADITIVA: sin red/HintEngine, cae a estático y el juego anda EXACTAMENTE igual. Ver specs/carteles-ia.md.
//
//   Mensajero.init({ state: () => historiaState(), at: () => currentAt() });   // 1 vez, desde game.js
//   game.js, dentro de applyEdge(id):  Mensajero.evento(id);                    // "qué acaba de pasar"
//   const m = Mensajero.pedir({ tipo:'cartel', id:'poster_super', at:'super' });
//     -> { clase:'pista'|'ambiente'|'reaccion', short, full, src }
//   Mensajero.hablar(m.full);  // TTS al pasar el mouse;  Mensajero.callar();  // al salir
const Mensajero = (() => {
  const lang = () => (typeof I18n !== 'undefined' && I18n.short) ? I18n.short() : 'es';
  const now = () => Date.now();

  let _state = () => ({});                 // getter del estado (flags) — lo cablea game.js
  let _at = () => null;                     // getter del lugar actual
  let _lastEvent = null, _lastEventTs = 0;  // último applyEdge (qué acaba de pasar)
  let _muted = false;                       // lo sincroniza game.js con su toggle de sonido
  const REACT_WINDOW = 12000;               // una reacción "fresca" dura 12s

  // Pool de propaganda AMBIENTE (lo llena la NPU vía el proxy; acá se cachea). Fallback estático embebido.
  const POOL_URL = (typeof window !== 'undefined' && window.PROPAGANDA) || '';   // '' = solo estático
  let _pool = { es: [], en: [] };
  const STATIC = {
    es: ['¡Pilas Solaris! Duran lo que el sol te deje.', 'Fernet Apocalipsis: el after del fin del mundo.',
         'Sándwich chino: para borrachines con suerte.', 'Dólar Blue Eterno: cotiza hasta sin luz.',
         '¡Linterna Faro! Si hay tormenta, vos brillás.', 'Vino en caja Last Tango: barato y trágico.'],
    en: ['Solaris Batteries! They last as long as the sun lets you.', 'Apocalypse Fernet: the end-times after-party.',
         'Chinese sandwich: for lucky bums.', 'Eternal Blue Dollar: trades even in the dark.',
         'Lighthouse Lantern! When the storm hits, you shine.', 'Last Tango boxed wine: cheap and tragic.']
  };
  function refillPool() {                    // best-effort: trae frases del proxy (NPU), cae a estático
    if (!POOL_URL || typeof fetch === 'undefined') return;
    const l = lang();
    fetch(POOL_URL + (POOL_URL.includes('?') ? '&' : '?') + 'lang=' + l + '&n=40')
      .then(r => r.ok ? r.json() : null)
      .then(d => { const arr = Array.isArray(d) ? d : (d && d.textos) || (d && d.items); if (Array.isArray(arr) && arr.length) _pool[l] = arr.map(x => typeof x === 'string' ? x : x.texto).filter(Boolean); })
      .catch(() => {});
  }
  const ambientList = () => { const l = lang(); return (_pool[l] && _pool[l].length) ? _pool[l] : (STATIC[l] || STATIC.es); };

  // --- grafo: ¿hay una arista de frontera EN ESTE LUGAR? (estás trabado acá → pista) ---
  function frontierAt(at) {
    if (typeof HintEngine === 'undefined') return null;
    const fr = HintEngine.frontier(_state()) || [];
    return fr.find(e => e.at === at) || null;
  }
  // texto de pista al nivel de spoiler dado (el grafo ya trae 0=críptico … 3=directo)
  function hint(e, level) {
    if (typeof HintEngine !== 'undefined' && HintEngine.hintText) return HintEngine.hintText(e, level);
    const h = (e.hints && (e.hints[lang()] || e.hints.es)) || []; return h[Math.min(level, h.length - 1)] || e.title || '';
  }

  const trunc = (s, n) => (s && s.length > n) ? s.slice(0, n - 1).trimEnd() + '…' : s;

  // cache por objeto para no parpadear cada frame: id -> { key, msg }
  const _cache = {};
  function keyOf(ctx, clase, extra) { return clase + '|' + (ctx.at || '') + '|' + lang() + '|' + (extra || ''); }

  // ----- API principal: el objeto pide, el Mensajero decide la CLASE según lo que pasó -----
  function pedir(ctx) {
    ctx = ctx || {};
    const at = ctx.at != null ? ctx.at : _at();
    const id = ctx.id || (ctx.tipo + '@' + at);

    // 1) REACCIÓN: ¿pasó algo recién, acá? (último applyEdge fresco y en este lugar)
    let clase, extra = '';
    let edge = frontierAt(at);
    if (_lastEvent && (now() - _lastEventTs) < REACT_WINDOW) { clase = 'reaccion'; extra = _lastEvent; }
    else if (edge) { clase = 'pista'; extra = edge.id; }
    else { clase = 'ambiente'; }

    const key = keyOf(ctx, clase, extra);
    const c = _cache[id];
    if (c && c.key === key && clase !== 'ambiente') return c.msg;   // pista/reaccion estables; ambiente puede rotar lento
    if (c && c.key === key && c.msg && (now() - (c.ts || 0)) < 20000) return c.msg;  // ambiente: misma frase 20s

    let msg;
    if (clase === 'pista' && edge) {
      msg = { clase, short: trunc(hint(edge, 0), 60), full: hint(edge, 1), src: 'static' };
    } else if (clase === 'reaccion') {
      const e = (typeof Historia !== 'undefined' && Historia.edges) ? Historia.edges.find(x => x.id === _lastEvent) : null;
      const t = e ? (lang() === 'en' ? 'Well done with “' + e.title + '”, kid.' : 'Bien ahí con “' + e.title + '”, pibe.') : '';
      const amb = pick(ambientList(), id);
      msg = { clase, short: trunc(amb, 60), full: (t ? t + ' ' : '') + amb, src: 'static' };
    } else {
      const amb = pick(ambientList(), id + '|' + Math.floor(now() / 20000));
      msg = { clase: 'ambiente', short: trunc(amb, 60), full: amb, src: (_pool[lang()] && _pool[lang()].length) ? 'pool' : 'static' };
    }
    _cache[id] = { key, msg, ts: now() };
    return msg;
  }
  // elección estable y repartida por id (hash simple)
  function pick(list, seed) {
    if (!list || !list.length) return '';
    let h = 0; const s = String(seed); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return list[Math.abs(h) % list.length];
  }

  // registra "qué acaba de pasar" (lo llama game.js dentro de applyEdge)
  function evento(edgeId) { _lastEvent = edgeId; _lastEventTs = now(); }

  // ----- TTS: leer el `full` al pasar el mouse -----
  function hablar(text, optLang) {
    if (_muted || !text || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = optLang || (lang() === 'en' ? 'en-US' : 'es-AR');
      u.rate = 1.02; u.pitch = 0.95;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function callar() { try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {} }

  function init(opts) {
    opts = opts || {};
    if (typeof opts.state === 'function') _state = opts.state;
    if (typeof opts.at === 'function') _at = opts.at;
    refillPool();
    return Mensajero;
  }
  function mute(v) { _muted = !!v; if (_muted) callar(); }

  const Mensajero = { init, pedir, evento, hablar, callar, mute, refillPool, get muted() { return _muted; } };
  return Mensajero;
})();
if (typeof window !== 'undefined') window.Mensajero = Mensajero;
