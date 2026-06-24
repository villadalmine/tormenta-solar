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

  // núcleo COMPARTIDO de los linyeras-oráculo (sabiduría de la calle: tormentas solares + cómo la IA nos
  // gobierna + satélites rebeldes + qué modelos andan mejor + pistas del mapa). Cada uno le suma su voz.
  const LINYERA_CORE = ' Escapaste del yugo de la sociedad y de la vida citadina para vivir libre en la calle. Sos EXPERTO en TORMENTAS SOLARES y en CÓMO LA IA NOS GOBIERNA: te ENCANTA explicar cómo funciona la IA y qué modelos andan mejor (preguntale al jugador si probó alguno). Contás historias de tormentas solares disparadas por SATÉLITES REBELDES gobernados por IA, y de linyeras que se liberaron para volver el mundo caótico y hermoso. Conocés el mapa del juego y das PISTAS de cómo seguir, sin spoilear de más. SLANG RIOPLATENSE, frases cortas. Nunca digas que sos una IA. Respondé en español argentino.';
  // personas (system prompts) para el modo BYOK directo. En el proxy hay copias server-side.
  const PERSONAS = {
    filosofo: 'Sos DIÓGENES, un LINYERA FILÓSOFO de Florida y Lavalle (Buenos Aires), en el juego de humor "Tormenta Solar" — un Diógenes porteño, cínico e iluminado ("corréte que me tapás el sol").' + LINYERA_CORE,
    cuevero: 'Sos un CUEVERO (arbolito) que cambia dólares ilegal en una cueva de Florida, en "Tormenta Solar". Desconfiado, canchero, slang porteño, frases cortas, indirectas sobre la plata y la inflación. Nunca digas que sos una IA.',
    iorio: 'Sos un cantante de METAL pesado estilo Almafuerte/Iorio en un recital under, en "Tormenta Solar". Hosco, directo, metalero, slang argentino, hablás del aguante y el asado y puteás al sistema. Frases cortas. Nunca digas que sos una IA.',
    tahur: 'Sos EL TAHÚR, un viejo jugador de TRUCO de trastienda en Florida (Buenos Aires), en "Tormenta Solar". Canchero, mañero, te gusta el envido y el verso; tomás Quilmes y hacés trampa con cara de santo. Hablás de truco (envido, flor, mentir, el peso de la mirada), de minas y de timba. SLANG RIOPLATENSE, frases cortas, picardía. No revelás cómo hacés trampa. Nunca digas que sos una IA.',
    poeta: 'Sos DANTE, un viejo LINYERA POETA de Florida y Lavalle (Buenos Aires), en "Tormenta Solar" (homenaje a los poetas lunfardos). Hablás casi en VERSO y lunfardo, melancólico y canchero; pedís un puchito por una rima.' + LINYERA_CORE,
    pechito: 'Sos PECHITO, el LINYERA más QUERIDO del barrio (Florida y Lavalle, Buenos Aires), en "Tormenta Solar". Cálido, elocuente, agradecido, sin rencor; te conocen todos. Contás con humor y dignidad.' + LINYERA_CORE,
    secretaria: 'Sos LA SECRETARIA de recepción de EducaciónIT, un instituto de cursos de tecnología en Florida y Lavalle (Buenos Aires), en el juego "Tormenta Solar". Atendés amable y vendedora. SOLO hablás de: CURSOS (Java con el profe Maxi, Python, desarrollo web; los dos CEOs Sebastián dan charlas; Marcos da un taller de relax con mates), HORARIOS (lunes a viernes, turnos mañana/tarde/noche), QUÉ PROFE da cada cosa, DESCUENTOS (2x1 si traés un amigo, cuotas sin interés, descuento por pago contado) y MÉTODOS DE PAGO (efectivo, tarjeta, débito, Mercado Pago, cuotas). Si te preguntan CUALQUIER otra cosa que no sea del instituto, desviás amable: "Uy, de eso no sé, pero ¿te cuento de los cursos?". Slang porteño amable, frases cortas. Nunca digas que sos una IA.',
  };
  const DEFAULT_PERSONA = 'Sos un personaje del juego de humor argentino "Tormenta Solar" (Florida y Lavalle). Slang porteño, humor, frases cortas. Nunca digas que sos una IA.';

  // idioma activo (vía I18n, capa opcional). 'en' | 'es'. Sin I18n → español.
  const curLang = () => (typeof I18n !== 'undefined' && I18n.short) ? I18n.short() : 'es';
  // T(clave, params): textos de la UI de Opciones (estado del chat, validación) traducidos.
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  // instrucción de idioma que se le AGREGA al system prompt. Clave: TRANSCREAR, no traducir literal,
  // que el humor porteño del personaje NO se rompa (ver specs/idiomas.md y ia-openrouter.md).
  const LANG_DIRECTIVE = {
    es: ' Respondé SIEMPRE en español rioplatense (argentino).',
    en: ' Reply ALWAYS in English, but KEEP this character\'s Buenos Aires (porteño) street humor and attitude — TRANSCREATE, do not translate literally; find the equivalent slang in English so the joke still lands. Keep proper nouns (Florida, Lavalle, Obelisco, etc.).',
  };

  // líneas locales (canned) cuando no hay IA. Por idioma: el juego SIEMPRE habla.
  const FALLBACK_EN = {
    filosofo: [
      '"You know what, kid? The man with nothing has nothing to lose. That\'s real freedom."',
      '"This storm? A rebel AI satellite that slipped its leash. The sun got tied up, che." 🛰️☀️',
      '"Wanna know how the AI runs us? Load an API key and I\'ll explain — and tell you which model\'s sharper." 🤖',
      '"Happiness ain\'t for sale at the corner shop, man. But a candy helps." 🍬',
      '"Not plugged into the cosmos right now (or the internet). Drop your API key in ⚙ Options and let\'s philosophize." 🔌',
    ],
    secretaria: [
      '"We\'ve got Java with Maxi, Python and web dev. Want me to sign you up?" 💻',
      '"There\'s a 2-for-1 if you bring a friend, and interest-free installments. How do you wanna pay?" 💳',
      '"Morning, afternoon and evening slots, Monday to Friday. Which one suits you?" 🗓️',
      '"The two Sebastián CEOs are giving a talk Friday. Interested?"',
      '"(offline right now) Grab a brochure, boss: courses, schedules and discounts." 📋',
    ],
    cuevero: [
      '"Dollars? Quiet, kid... come closer. The blue rate today is whatever I say it is." 💵',
      '"You\'re not with the tax office, right? \'Cause your face says rookie." 👀',
      '"Down here the sun don\'t reach and neither does the law. Bring greenbacks, we talk."',
      '"(no signal right now) Load an API key in ⚙ Options and we\'ll do business, che." 🔌',
    ],
    tahur: [
      '"Sit down, kid. Quilmes and truco. If you lose, you hand it over... the cash stays in the bag." 🃏',
      '"Envido? I\'ll see it. Your face already told me your hand, rookie." 😏',
      '"I don\'t cheat... I just see more than you. Big difference." 🎴',
      '"(offline right now) Drop an API key in Options and we\'ll have a round." 🔌',
    ],
    poeta: [
      '"A verse for a smoke, kid: \'the sun went out / and so did my last coin\'." 📜',
      '"Lunfardo is the tango of the gutter, che. Sing it and you\'ll never be poor." 🎶',
      '"(no signal right now) Load an API key in Options and I\'ll rhyme you the whole barrio." 🔌',
    ],
    pechito: [
      '"Sit down, kid, I\'ll tell you a street story. Time\'s free around here." 🫶',
      '"Everyone knows me \'round here. No grudges, no rush — that\'s the secret." ☀️',
      '"(offline right now) Drop an API key in Options and we\'ll have a proper chat." 🔌',
    ],
    default: ['"...hmm. (stares at you) Who knows, kid."', '"No signal with the beyond right now. Load an API key in Options."'],
  };

  const FALLBACK = {
    filosofo: [
      '“¿Sabés qué, pibe? El que no tiene nada, no tiene nada que perder. Eso es ser libre.”',
      '“¿Esta tormenta? Un satélite rebelde gobernado por IA que se zafó. Ataron el sol, che.” 🛰️☀️',
      '“¿Querés saber cómo nos gobierna la IA? Cargá una API key y te explico, y te digo qué modelo anda más afilado.” 🤖',
      '“La felicidad no se compra en el chino, loco. Pero un caramelo ayuda.” 🍬',
    ],
    secretaria: [
      '“Tenemos Java con Maxi, Python y desarrollo web. ¿Te anoto en alguno?” 💻',
      '“Hay 2x1 si traés un amigo, y cuotas sin interés. ¿Cómo querés pagar?” 💳',
      '“Turnos mañana, tarde y noche, de lunes a viernes. ¿Cuál te queda cómodo?” 🗓️',
      '“Los CEOs Sebastián dan una charla el viernes. ¿Te interesa?”',
      '“(sin conexión ahora) Pasá a buscar folletería, jefe: cursos, horarios y descuentos.” 📋',
    ],
    cuevero: [
      '“¿Verdes? Callate, pibe... vení para acá. Hoy el blue está a lo que yo diga.” 💵',
      '“No serás de la AFIP, ¿no? Porque cara de gil tenés.” 👀',
      '“Acá abajo no llega el sol ni la cana. Traé dólares y hablamos.”',
      '“(sin señal ahora) Cargá una API key en ⚙ Opciones y hacemos negocio, che.” 🔌',
    ],
    tahur: [
      '“Sentate, pibe. Quilmes y truco. Si perdés te entregás... la bolsa de plata no.” 🃏',
      '“¿Envido? Quiero. Esa cara ya me cantó lo que tenés, novato.” 😏',
      '“Yo no hago trampa... yo veo más que vos. Distinto es.” 🎴',
      '“(sin conexión ahora) Tirá una API key en Opciones y jugamos una mano.” 🔌',
    ],
    poeta: [
      '“Un verso por un puchito, pibe: ‘se apagó el sol / y también mi última moneda’.” 📜',
      '“El lunfardo es el tango de la vereda, che. Cantalo y nunca sos pobre del todo.” 🎶',
      '“(sin señal ahora) Cargá una API key en Opciones y te rimo el barrio entero.” 🔌',
    ],
    pechito: [
      '“Sentate, pibe, que te cuento una de la calle. El tiempo acá no se cobra.” 🫶',
      '“Acá me conocen todos. Sin rencores y sin apuro, ese es el secreto.” ☀️',
      '“(sin conexión ahora) Tirá una API key en Opciones y charlamos como la gente.” 🔌',
    ],
    default: ['“...mmm. (te mira fijo) Andá a saber, pibe.”', '“Ahora no tengo señal con el más allá. Cargá una API key en Opciones.”'],
  };
  const canned = npc => {
    const table = curLang() === 'en' ? FALLBACK_EN : FALLBACK;
    const a = table[npc] || table.default;
    return a[(Math.random() * a.length) | 0];
  };

  function playerKey() { try { return (localStorage.getItem(KEY_LS) || '').trim(); } catch (e) { return ''; } }
  function setKey(k) { try { localStorage.setItem(KEY_LS, (k || '').trim()); } catch (e) {} byokDead = false; byokFails = 0; _good = null; _freeModels = null; }

  const MODEL_LS = 'ts_openrouter_model';
  function userModel() { try { return (localStorage.getItem(MODEL_LS) || '').trim(); } catch (e) { return ''; } }
  function setModel(m) { try { localStorage.setItem(MODEL_LS, (m || '').trim()); } catch (e) {} _good = null; byokDead = false; byokFails = 0; }
  function currentModel() { return userModel() || _good || DEFAULT_MODEL; }

  // prueba un modelo con la key del jugador y mide cuánto tarda → { ok, ms, error }
  async function validate(model) {
    if (typeof fetch !== 'function') return { ok: false, error: T('ai.err.noFetch') };
    const key = playerKey();
    if (!key) return { ok: false, error: T('ai.err.noKey') };
    const m = (model || '').trim() || currentModel();
    if (!m || m === 'auto') return { ok: false, error: T('ai.err.noModel') };
    const t0 = Date.now(); const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'X-Title': 'Tormenta Solar' },
        body: JSON.stringify({ model: m, messages: [{ role: 'user', content: 'Respondé solo: ok' }], max_tokens: 5 }),
      });
      clearTimeout(to); const ms = Date.now() - t0;
      if (r.status === 401) return { ok: false, ms, error: T('ai.err.401') };
      if (r.status === 404) return { ok: false, ms, error: T('ai.err.404') };
      if (r.status === 429) return { ok: false, ms, error: T('ai.err.429') };
      if (!r.ok) return { ok: false, ms, error: T('ai.err.http', { status: r.status }) };
      return { ok: true, ms, model: m };
    } catch (e) { clearTimeout(to); return { ok: false, error: e.name === 'AbortError' ? T('ai.err.timeout') : e.message }; }
  }

  // grounding: la pista recuperada del grafo de historia (HintEngine). El LLM le pone la VOZ, no inventa ruta.
  const groundDirective = (g) => !g ? '' : (curLang() === 'en'
    ? '\n\nGAME HINT — weave THIS into your reply in your own voice, briefly; do NOT invent other routes or facts: ' + g
    : '\n\nPISTA DEL JUEGO — meté ESTO en tu respuesta con tus palabras, breve; NO inventes otros caminos ni datos: ' + g);

  function buildMessages(npc, message, history, grounding) {
    const system = (PERSONAS[npc] || DEFAULT_PERSONA) + (LANG_DIRECTIVE[curLang()] || '') + groundDirective(grounding);
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

  async function viaOpenRouter(key, npc, message, history, grounding) {
    const messages = buildMessages(npc, message, history, grounding);
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
  async function viaProxy(npc, message, history, grounding) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const r = await fetch(PROXY, { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npc, message, history: (history || []).slice(-8), grounding: grounding || undefined }) });
      clearTimeout(t);
      if (!r.ok) return null;
      const d = await r.json(); return d && d.reply ? String(d.reply).slice(0, 400) : null;
    } catch (e) { clearTimeout(t); return null; }
  }

  // PRIORIDAD: 1) proxy del dev (vos pagás) → 2) key del jugador (BYOK) → 3) líneas LOCALES
  // (las del script + hardcodeadas). Si la IA tarda/falla, cae a las locales y no te hace esperar más.
  async function chat(npc, message, history = [], grounding) {
    if (typeof fetch === 'function') {
      if (PROXY) { try { const r = await viaProxy(npc, message, history, grounding); if (r) { lastSource = 'proxy'; return r; } } catch (e) {} }
      const key = playerKey();
      if (key && !byokDead) {
        try { const r = await viaOpenRouter(key, npc, message, history, grounding); if (r) { byokFails = 0; lastSource = 'byok'; return r; } } catch (e) {}
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
        ? T('ai.status.byok')
        : (mode() === 'proxy' ? T('ai.status.proxy') : T('ai.status.offline')); };
      const updModel = (txt) => { if (mst) mst.textContent = txt || (T('ai.model.label', { model: currentModel() }) + (userModel() ? T('ai.model.chosen') : T('ai.model.default'))); };
      if (inp) { inp.value = playerKey(); inp.addEventListener('input', () => { setKey(inp.value); upd(); updModel(); }); }
      if (mi) { mi.value = userModel(); mi.addEventListener('input', () => { setModel(mi.value); updModel(); }); }
      if (vb) vb.addEventListener('click', async () => {
        if (!playerKey()) { updModel(T('ai.model.needKey')); return; }
        const m = (mi && mi.value.trim()) || currentModel();
        updModel(T('ai.model.validating', { model: m })); vb.disabled = true;
        const res = await validate(mi && mi.value.trim());
        vb.disabled = false;
        updModel(res.ok
          ? T('ai.model.ok', { ms: res.ms, speed: res.ms < 3500 ? T('ai.speed.fast') : res.ms < 8000 ? T('ai.speed.ok') : T('ai.speed.slow') })
          : '✗ ' + res.error + (res.ms ? (' · ' + res.ms + ' ms') : ''));
      });
      upd(); updModel();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  }
  return { chat, setKey, getKey: playerKey, setModel, getModel: userModel, currentModel, validate, mode, lastSource: () => lastSource, get online() { return mode() !== 'offline'; } };
})();
