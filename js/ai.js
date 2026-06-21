// ai.js — cliente de CHAT con IA (modo B), capa ADITIVA y graceful. Tres formas, en este orden:
//   1) BYOK: si el JUGADOR puso SU propia OpenRouter key en Opciones (localStorage) → va directo a
//      OpenRouter con esa key. Segura: la key vive sólo en el navegador del jugador y paga lo suyo.
//   2) PROXY: si configurás un proxy (ai-proxy/) en PROXY → tu key queda server-side y vos pagás.
//   3) OFFLINE: si no hay ninguna → responde con líneas predefinidas (el juego anda igual).
const AI = (() => {
  const PROXY = '';   // (opcional) URL de tu proxy ai-proxy. Si está → "vos pagás" (prioridad 1).
  const KEY_LS = 'ts_openrouter_key';
  const TIMEOUT = 12000;
  let byokDead = false;   // si la key del jugador tarda/falla una vez → de ahí en más, líneas locales
  const MODELS = ['meta-llama/llama-3.3-70b-instruct:free', 'mistralai/mistral-7b-instruct:free', 'deepseek/deepseek-chat-v3-0324:free'];

  // personas (system prompts) para el modo BYOK directo. En el proxy hay copias server-side.
  const PERSONAS = {
    filosofo: 'Sos un LINYERA FILÓSOFO en Florida y Lavalle (Buenos Aires), en el juego de humor "Tormenta Solar". Fuiste exitoso, te cansaste del sistema y dejaste todo; ahora vivís en la calle y sos feliz, un Diógenes porteño. SLANG RIOPLATENSE, humor, frases CORTAS (1-3 oraciones), mirada canchera sobre la guita y la vida. Nunca digas que sos una IA. Respondé en español argentino.',
    cuevero: 'Sos un CUEVERO (arbolito) que cambia dólares ilegal en una cueva de Florida, en "Tormenta Solar". Desconfiado, canchero, slang porteño, frases cortas, indirectas sobre la plata y la inflación. Nunca digas que sos una IA.',
    iorio: 'Sos un cantante de METAL pesado estilo Almafuerte/Iorio en un recital under, en "Tormenta Solar". Hosco, directo, metalero, slang argentino, hablás del aguante y el asado y puteás al sistema. Frases cortas. Nunca digas que sos una IA.',
  };
  const DEFAULT_PERSONA = 'Sos un personaje del juego de humor argentino "Tormenta Solar" (Florida y Lavalle). Slang porteño, humor, frases cortas. Nunca digas que sos una IA.';

  const FALLBACK = {
    filosofo: [
      '“¿Sabés qué, pibe? El que no tiene nada, no tiene nada que perder. Eso es ser libre.”',
      '“El dólar sube, el dólar baja... yo sigo acá, mirando pasar la gente. ¿Quién ganó?”',
      '“La felicidad no se compra en el chino, loco. Pero un caramelo ayuda.” 🍬',
      '“Hoy no estoy conectado al cosmos (ni a internet). Poné tu API key en Opciones y filosofamos.” 🔌',
    ],
    default: ['“...mmm. (te mira fijo) Andá a saber, pibe.”', '“Ahora no tengo señal con el más allá. Cargá una API key en Opciones.”'],
  };
  const canned = npc => { const a = FALLBACK[npc] || FALLBACK.default; return a[(Math.random() * a.length) | 0]; };

  function playerKey() { try { return (localStorage.getItem(KEY_LS) || '').trim(); } catch (e) { return ''; } }
  function setKey(k) { try { localStorage.setItem(KEY_LS, (k || '').trim()); } catch (e) {} byokDead = false; }

  function buildMessages(npc, message, history) {
    const system = PERSONAS[npc] || DEFAULT_PERSONA;
    const hist = (Array.isArray(history) ? history : [])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-8).map(m => ({ role: m.role, content: m.content.slice(0, 400) }));
    return [{ role: 'system', content: system }, ...hist, { role: 'user', content: String(message || '').slice(0, 400) }];
  }

  async function viaOpenRouter(key, npc, message, history) {
    const messages = buildMessages(npc, message, history);
    for (const model of MODELS) {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), TIMEOUT);
      try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST', signal: ctrl.signal,
          headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'X-Title': 'Tormenta Solar' },
          body: JSON.stringify({ model, messages, temperature: 0.9, max_tokens: 220 }),
        });
        clearTimeout(t);
        if (r.status === 429 || r.status === 404) continue;     // saturado / no existe → otro modelo
        if (!r.ok) break;
        const d = await r.json(); const reply = d.choices?.[0]?.message?.content;
        if (reply) return reply.trim().slice(0, 400);
      } catch (e) { clearTimeout(t); }
    }
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
      if (PROXY) { try { const r = await viaProxy(npc, message, history); if (r) return r; } catch (e) {} }
      const key = playerKey();
      if (key && !byokDead) {
        try { const r = await viaOpenRouter(key, npc, message, history); if (r) return r; } catch (e) {}
        byokDead = true;   // tardó/falló: switch a locales por el resto de la sesión (hasta que cambie la key)
      }
    }
    return canned(npc);   // LOCAL: sin IA, o si falló/tardó
  }

  function mode() { return PROXY ? 'proxy' : (playerKey() && !byokDead ? 'byok' : 'offline'); }

  // UI: el campo de la API key en el panel de Opciones (BYOK)
  if (typeof document !== 'undefined') {
    const wire = () => {
      const inp = document.getElementById('opt-aikey'), st = document.getElementById('ai-status');
      const upd = () => { if (st) st.textContent = mode() === 'byok'
        ? '✓ Chat IA con TU key (pagás tu propio uso; la key queda en tu navegador).'
        : (mode() === 'proxy' ? '✓ Chat IA por el proxy del juego.' : 'Chat IA: offline (líneas predefinidas). Pegá tu key de openrouter.ai/keys para activarlo.'); };
      if (inp) { inp.value = playerKey(); inp.addEventListener('input', () => { setKey(inp.value); upd(); }); }
      upd();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  }
  return { chat, setKey, getKey: playerKey, mode, get online() { return mode() !== 'offline'; } };
})();
