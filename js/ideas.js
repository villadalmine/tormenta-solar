// ideas.js — IDEAS QUE QUEDAN PICANDO (specs/chat-linyera-ux.md §1): cuando un linyera te sugiere algo
// ("andate al cine, pibe"), la idea queda REGISTRADA aunque cierres el chat sin contestarle; el bus de
// eventos marca cuando la HICISTE, y el grounding se lo recuerda al NPC en la próxima charla ("¿y? ¿fuiste
// al cine como te dije?"). Capa ADITIVA: si este módulo no está, el chat anda exactamente igual.
const Ideas = (() => {
  const K = 'ts_ideas_v1', CAP = 10;
  // catálogo DATA (crece con el mundo, mismo espíritu que VIBES/ANCHOR):
  //   rx   = detecta la idea en la RESPUESTA del NPC (ES/EN, falso negativo aceptable: fail-open)
  //   done = matchea "ev:detalle" del bus de eventos → el jugador LA HIZO
  const CATALOG = [
    { id: 'cine',       rx: /\bcine\b|pel[ií]cula|pochoclo|cinema|movie/i,                done: /cine|movie/i },
    { id: 'truco',      rx: /\btruco\b|bodeg[oó]n/i,                                      done: /truco|bodeg/i },
    { id: 'piquete',    rx: /piquete|lavalle|olla popular|picket/i,                       done: /lavalle|piquete|corte|soga|bombo|olla|pancarta/i },
    { id: 'obelisco',   rx: /obelisco|obelisk/i,                                          done: /obelisco|obelisk/i },
    { id: 'datacenter', rx: /datacenter|data\s*center/i,                                  done: /datacenter/i },
    { id: 'carteles',   rx: /cartel(es|ito)?\b|tabl[oó]n|billboard/i,                     done: /cartel|tabl[oó]n/i },
    { id: 'arcade',     rx: /arcade|fichines|maquinita|trucotron|fifa/i,                  done: /arcade|fifa|pacman|galaga|frogger|fighter/i },
    { id: 'bunker',     rx: /b[uú]nker/i,                                                 done: /b[uú]nker/i },
    { id: 'chino',      rx: /supermercado|almac[eé]n|el chino|del chino|lo del chino/i,   done: /chino|super/i },
  ];
  function load() { try { return JSON.parse(localStorage.getItem(K)) || []; } catch (e) { return []; } }
  function save(l) { try { localStorage.setItem(K, JSON.stringify(l.slice(-CAP))); } catch (e) {} }
  // la respuesta del NPC menciona una idea → queda PICANDO (no hace falta contestar)
  function scan(npcKey, reply) {
    if (!npcKey || !reply) return;
    const l = load(); let ch = false;
    for (const c of CATALOG) {
      if (!c.rx.test(reply)) continue;
      if (l.some(i => i.idea === c.id && i.npc === npcKey)) continue;   // ya la tiene registrada (picando o hecha)
      l.push({ npc: npcKey, idea: c.id, ts: Date.now(), done: false }); ch = true;
      // lo notable va a la memoria del barrio (viaja con tu nick + chusmerío) — solo el ID, nunca el texto del chat
      try { if (typeof Eventos !== 'undefined') Eventos.remember('idea', npcKey + '→' + c.id); } catch (e) {}
    }
    if (ch) save(l);
  }
  // el BUS dice que el jugador hizo algo → si matchea una idea pendiente, se marca (el NPC lo va a festejar)
  function check(ev, detail) {
    const s = (ev + ':' + (detail == null ? '' : detail)).toLowerCase();
    const l = load(); let ch = false;
    for (const i of l) {
      if (i.done) continue;
      const c = CATALOG.find(c => c.id === i.idea);
      if (c && c.done.test(s)) { i.done = true; i.doneTs = Date.now(); ch = true; }
    }
    if (ch) save(l);
  }
  // grounding para ESE NPC: pendientes ("no me contestó") y cumplidas ("me hizo caso") — la VOZ la pone el modelo
  function groundFor(npcKey) {
    if (!npcKey) return null;
    // patrón i18n del repo (fallback sin I18n = clave+idea, para tests headless)
    const tt = (k, v) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, v) : k + ':' + ((v && v.idea) || '');
    const mins = ts => Math.max(1, Math.round((Date.now() - ts) / 60000));
    const out = load().filter(i => i.npc === npcKey).slice(-3)
      .map(i => tt(i.done ? 'g.idea.done' : 'g.idea.pend', { idea: i.idea, min: mins(i.ts) })).filter(Boolean);
    return out.length ? out.join(' ') : null;
  }
  return { scan, check, groundFor, CATALOG };
})();
