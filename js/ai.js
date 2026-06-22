// ai.js — cliente de CHAT con IA (modo B), capa ADITIVA y graceful. Tres formas, en este orden:
//   1) BYOK: si el JUGADOR puso SU propia OpenRouter key en Opciones (localStorage) → va directo a
//      OpenRouter con esa key. Segura: la key vive sólo en el navegador del jugador y paga lo suyo.
//   2) PROXY: si configurás un proxy (ai-proxy/) en PROXY → tu key queda server-side y vos pagás.
//   3) OFFLINE: si no hay ninguna → responde con líneas predefinidas (el juego anda igual).
const AI = (() => {
  const PROXY = '';   // (opcional) URL de tu proxy ai-proxy. Si está → "vos pagás" (prioridad 1).
  const KEY_LS = 'ts_openrouter_key';
  const TIMEOUT = 11000;
  const MAX_TRIES = 3;        // no probar más de N modelos por mensaje (no colgar)
  let byokDead = false;       // tras varios fallos seguidos → de ahí en más, líneas locales
  let byokFails = 0;          // fallos seguidos de la key (un 429 transitorio NO mata el BYOK)
  let _good = null;           // el último modelo que respondió bien → se usa primero (rápido)
  let lastSource = 'local';   // de dónde salió la última respuesta: 'proxy' | 'byok' | 'local'
  // default = un free CHICO y RÁPIDO (para el chat la velocidad importa más que el tamaño).
  // El user lo cambia en Opciones (ej. uno más grande/lindo si no le molesta esperar).
  const DEFAULT_MODEL = 'google/gemma-4-26b-a4b-it:free';   // el último que usamos y anduvo
  const MODELS = [DEFAULT_MODEL, 'meta-llama/llama-3.2-3b-instruct:free', 'liquid/lfm-2.5-1.2b-instruct:free', 'mistralai/mistral-7b-instruct:free'];

  // personas (system prompts) para el modo BYOK directo. En el proxy hay copias server-side.
  const PERSONAS = {
    filosofo: 'Sos un LINYERA FILÓSOFO en Florida y Lavalle (Buenos Aires), en el juego de humor "Tormenta Solar". Fuiste exitoso, te cansaste del sistema y dejaste todo; ahora vivís en la calle y sos feliz, un Diógenes porteño. SLANG RIOPLATENSE, humor, frases CORTAS (1-3 oraciones), mirada canchera sobre la guita y la vida. Nunca digas que sos una IA. Respondé en español argentino.',
    cuevero: 'Sos un CUEVERO (arbolito) que cambia dólares ilegal en una cueva de Florida, en "Tormenta Solar". Desconfiado, canchero, slang porteño, frases cortas, indirectas sobre la plata y la inflación. Nunca digas que sos una IA.',
    iorio: 'Sos un cantante de METAL pesado estilo Almafuerte/Iorio en un recital under, en "Tormenta Solar". Hosco, directo, metalero, slang argentino, hablás del aguante y el asado y puteás al sistema. Frases cortas. Nunca digas que sos una IA.',
    secretaria: 'Sos LA SECRETARIA de recepción de EducaciónIT, un instituto de cursos de tecnología en Florida y Lavalle (Buenos Aires), en el juego "Tormenta Solar". Atendés amable y vendedora. SOLO hablás de: CURSOS (Java con el profe Maxi, Python, desarrollo web; los dos CEOs Sebastián dan charlas; Marcos da un taller de relax con mates), HORARIOS (lunes a viernes, turnos mañana/tarde/noche), QUÉ PROFE da cada cosa, DESCUENTOS (2x1 si traés un amigo, cuotas sin interés, descuento por pago contado) y MÉTODOS DE PAGO (efectivo, tarjeta, débito, Mercado Pago, cuotas). Si te preguntan CUALQUIER otra cosa que no sea del instituto, desviás amable: "Uy, de eso no sé, pero ¿te cuento de los cursos?". Slang porteño amable, frases cortas. Nunca digas que sos una IA.',
  };
  const DEFAULT_PERSONA = 'Sos un personaje del juego de humor argentino "Tormenta Solar" (Florida y Lavalle). Slang porteño, humor, frases cortas. Nunca digas que sos una IA.';

  const FALLBACK = {
    filosofo: [
      '“¿Sabés qué, pibe? El que no tiene nada, no tiene nada que perder. Eso es ser libre.”',
      '“El dólar sube, el dólar baja... yo sigo acá, mirando pasar la gente. ¿Quién ganó?”',
      '“La felicidad no se compra en el chino, loco. Pero un caramelo ayuda.” 🍬',
      '“Hoy no estoy conectado al cosmos (ni a internet). Poné tu API key en Opciones y filosofamos.” 🔌',
    ],
    secretaria: [
      '“Tenemos Java con Maxi, Python y desarrollo web. ¿Te anoto en alguno?” 💻',
      '“Hay 2x1 si traés un amigo, y cuotas sin interés. ¿Cómo querés pagar?” 💳',
      '“Turnos mañana, tarde y noche, de lunes a viernes. ¿Cuál te queda cómodo?” 🗓️',
      '“Los CEOs Sebastián dan una charla el viernes. ¿Te interesa?”',
      '“(sin conexión ahora) Pasá a buscar folletería, jefe: cursos, horarios y descuentos.” 📋',
    ],
    default: ['“...mmm. (te mira fijo) Andá a saber, pibe.”', '“Ahora no tengo señal con el más allá. Cargá una API key en Opciones.”'],
  };
  const canned = npc => { const a = FALLBACK[npc] || FALLBACK.default; return a[(Math.random() * a.length) | 0]; };

  function playerKey() { try { return (localStorage.getItem(KEY_LS) || '').trim(); } catch (e) { return ''; } }
  function setKey(k) { try { localStorage.setItem(KEY_LS, (k || '').trim()); } catch (e) {} byokDead = false; byokFails = 0; _good = null; _freeModels = null; }

  const MODEL_LS = 'ts_openrouter_model';
  function userModel() { try { return (localStorage.getItem(MODEL_LS) || '').trim(); } catch (e) { return ''; } }
  function setModel(m) { try { localStorage.setItem(MODEL_LS, (m || '').trim()); } catch (e) {} _good = null; byokDead = false; byokFails = 0; }
  function currentModel() { return userModel() || _good || DEFAULT_MODEL; }

  // prueba un modelo con la key del jugador y mide cuánto tarda → { ok, ms, error }
  async function validate(model) {
    if (typeof fetch !== 'function') return { ok: false, error: 'sin fetch' };
    const key = playerKey();
    if (!key) return { ok: false, error: 'pegá primero tu API key arriba' };
    const m = (model || '').trim() || currentModel();
    if (!m || m === 'auto') return { ok: false, error: 'escribí un modelo (ej. mistralai/mistral-7b-instruct:free)' };
    const t0 = Date.now(); const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'X-Title': 'Tormenta Solar' },
        body: JSON.stringify({ model: m, messages: [{ role: 'user', content: 'Respondé solo: ok' }], max_tokens: 5 }),
      });
      clearTimeout(to); const ms = Date.now() - t0;
      if (r.status === 401) return { ok: false, ms, error: 'API key inválida (401)' };
      if (r.status === 404) return { ok: false, ms, error: 'ese modelo no existe (404)' };
      if (r.status === 429) return { ok: false, ms, error: 'saturado (429), probá en un rato' };
      if (!r.ok) return { ok: false, ms, error: 'error ' + r.status };
      return { ok: true, ms, model: m };
    } catch (e) { clearTimeout(to); return { ok: false, error: e.name === 'AbortError' ? 'timeout (>15s, lentísimo)' : e.message }; }
  }

  function buildMessages(npc, message, history) {
    const system = PERSONAS[npc] || DEFAULT_PERSONA;
    const hist = (Array.isArray(history) ? history : [])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-8).map(m => ({ role: m.role, content: m.content.slice(0, 400) }));
    return [{ role: 'system', content: system }, ...hist, { role: 'user', content: String(message || '').slice(0, 400) }];
  }

  // trae la lista de modelos FREE vigentes con la key del jugador (los slugs cambian); cachea por sesión
  let _freeModels = null;
  async function freeModels(key) {
    if (_freeModels) return _freeModels;
    try {
      const r = await fetch('https://openrouter.ai/api/v1/models', { headers: { 'Authorization': 'Bearer ' + key } });
      if (r.ok) {
        const d = await r.json();
        const free = (d.data || []).filter(m => m.pricing && +m.pricing.prompt === 0 && +m.pricing.completion === 0).map(m => m.id);
        const pref = free.filter(id => /instruct|chat|gemma|mistral|llama|qwen|deepseek/i.test(id));
        // chicos/rápidos primero (responden mucho más rápido que los 70B)
        const small = id => /(^|[^0-9])([1-9]\.?[0-9]?b|mini|small|flash|lite|nano)([^0-9]|$)/i.test(id) ? 0 : (/(1[0-9]b|2[0-9]b|3[0-2]b)/i.test(id) ? 1 : 2);
        const list = [...new Set(pref.length ? pref : free)].sort((a, b) => small(a) - small(b)).slice(0, 6);
        if (list.length) { _freeModels = list; console.log('[ai] modelos free:', list.join(', ')); return list; }
      } else { console.warn('[ai] /models', r.status); }
    } catch (e) { console.warn('[ai] no pude traer modelos free:', e.message); }
    _freeModels = MODELS; return MODELS;   // fallback hardcodeado
  }

  async function viaOpenRouter(key, npc, message, history) {
    const messages = buildMessages(npc, message, history);
    const all = await freeModels(key);
    const first = userModel() || _good || DEFAULT_MODEL;                     // elegido por el jugador → el que anduvo → default
    const order = [first, ...all.filter(m => m !== first)];
    let tried = 0, lastStatus = 0;
    for (const model of order) {
      if (tried++ >= MAX_TRIES) break;   // no rotar por todos (eso es lo que lo hacía LENTO)
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), TIMEOUT);
      try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST', signal: ctrl.signal,
          headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'X-Title': 'Tormenta Solar' },
          body: JSON.stringify({ model, messages, temperature: 0.9, max_tokens: 160 }),
        });
        clearTimeout(t);
        if (r.status === 429 || r.status === 404) { lastStatus = r.status; if (model === _good) _good = null; continue; }
        if (!r.ok) { lastStatus = r.status; console.warn('[ai] OpenRouter', r.status, (await r.text().catch(() => '')).slice(0, 160)); break; }
        const d = await r.json(); const reply = d.choices?.[0]?.message?.content;
        if (reply) { _good = model; return reply.trim().slice(0, 400); }   // recordamos el que anduvo
      } catch (e) { clearTimeout(t); console.warn('[ai] fetch falló (' + model + '):', e.message); }
    }
    console.warn('[ai] sin respuesta (status ' + lastStatus + '). El free está saturado: probá de nuevo en unos segundos.');
    return null;
  }
  async function viaProxy(npc, message, history) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const r = await fetch(PROXY, { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npc, message, history: (history || []).slice(-8) }) });
      clearTimeout(t);
      if (!r.ok) return null;
      const d = await r.json(); return d && d.reply ? String(d.reply).slice(0, 400) : null;
    } catch (e) { clearTimeout(t); return null; }
  }

  // PRIORIDAD: 1) proxy del dev (vos pagás) → 2) key del jugador (BYOK) → 3) líneas LOCALES
  // (las del script + hardcodeadas). Si la IA tarda/falla, cae a las locales y no te hace esperar más.
  async function chat(npc, message, history = []) {
    if (typeof fetch === 'function') {
      if (PROXY) { try { const r = await viaProxy(npc, message, history); if (r) { lastSource = 'proxy'; return r; } } catch (e) {} }
      const key = playerKey();
      if (key && !byokDead) {
        try { const r = await viaOpenRouter(key, npc, message, history); if (r) { byokFails = 0; lastSource = 'byok'; return r; } } catch (e) {}
        // un 429 transitorio NO mata el BYOK: cae a local SOLO en este mensaje y reintenta el próximo
        if (++byokFails >= MAX_TRIES) { byokDead = true; console.warn('[ai] ' + byokFails + ' fallos seguidos → líneas locales por la sesión. Cambiá la key (o esperá) para reintentar.'); }
      }
    }
    lastSource = 'local';
    return canned(npc);   // LOCAL: sin IA, o si falló/tardó
  }

  function mode() { return PROXY ? 'proxy' : (playerKey() && !byokDead ? 'byok' : 'offline'); }

  // UI: el campo de la API key en el panel de Opciones (BYOK)
  if (typeof document !== 'undefined') {
    const wire = () => {
      const inp = document.getElementById('opt-aikey'), st = document.getElementById('ai-status');
      const mi = document.getElementById('opt-aimodel'), mst = document.getElementById('ai-model-status'), vb = document.getElementById('opt-validate');
      const upd = () => { if (st) st.textContent = mode() === 'byok'
        ? '✓ Chat IA con TU key (pagás tu propio uso; la key queda en tu navegador).'
        : (mode() === 'proxy' ? '✓ Chat IA por el proxy del juego.' : 'Chat IA: offline (líneas predefinidas). Pegá tu key de openrouter.ai/keys para activarlo.'); };
      const updModel = (txt) => { if (mst) mst.textContent = txt || ('Modelo: ' + currentModel() + (userModel() ? ' (elegido por vos)' : ' (por defecto · podés cambiarlo)')); };
      if (inp) { inp.value = playerKey(); inp.addEventListener('input', () => { setKey(inp.value); upd(); updModel(); }); }
      if (mi) { mi.value = userModel(); mi.addEventListener('input', () => { setModel(mi.value); updModel(); }); }
      if (vb) vb.addEventListener('click', async () => {
        if (!playerKey()) { updModel('Validar: pegá primero tu API key arriba.'); return; }
        const m = (mi && mi.value.trim()) || currentModel();
        updModel('Validando ' + m + '…'); vb.disabled = true;
        const res = await validate(mi && mi.value.trim());
        vb.disabled = false;
        updModel(res.ok
          ? '✓ Anda · ' + res.ms + ' ms ' + (res.ms < 3500 ? '(rápido 🚀)' : res.ms < 8000 ? '(ok 👍)' : '(lento 🐢)')
          : '✗ ' + res.error + (res.ms ? (' · ' + res.ms + ' ms') : ''));
      });
      upd(); updModel();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  }
  return { chat, setKey, getKey: playerKey, setModel, getModel: userModel, currentModel, validate, mode, lastSource: () => lastSource, get online() { return mode() !== 'offline'; } };
})();
