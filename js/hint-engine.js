// hint-engine.js — el "oráculo" de pistas (la didáctica). Capa ADITIVA: si no está, el juego anda igual.
// Lee el grafo ensamblado (Historia, de historia.js) y, dado el ESTADO actual (los flags que game.js ya
// setea — Fase 1: solo DESCRIBE, no maneja nada), calcula la FRONTERA y devuelve la próxima pista.
// Spoiler escalado por INSISTENCIA (0 frase loca → 1 rumbo → 2 receta → 3 directo/enojado).
// Ver specs/nivel-1/historia-grafo.md.
const HintEngine = (() => {
  const lang = () => (typeof I18n !== 'undefined' && I18n.short) ? I18n.short() : 'es';
  const edges = () => (typeof Historia !== 'undefined' && Historia.edges) ? Historia.edges : [];

  // ¿la precondición (flags) de la arista está satisfecha por el estado?
  const preMet = (e, st) => Object.entries(e.pre || {}).every(([k, v]) => !!(st && st[k]) === !!v);
  // ¿la arista YA está hecha? (todos sus `sets` ya valen en el estado)
  const done = (e, st) => Object.keys(e.sets || {}).length > 0 &&
    Object.entries(e.sets).every(([k, v]) => !!(st && st[k]) === !!v);

  // FRONTERA: aristas accionables ahora (precondición lista) y todavía NO hechas.
  function frontier(st) {
    return edges().filter(e => preMet(e, st) && !done(e, st));
  }

  // próxima arista a sugerir: prioriza por CERCANÍA (mismo lugar que el jugador) y, si no, orden del grafo.
  function pick(st, at) {
    const fr = frontier(st);
    if (!fr.length) return null;
    if (at) { const near = fr.find(e => e.at === at); if (near) return near; }
    return fr[0];
  }

  // texto de la pista de una arista al nivel de spoiler dado (clamp al array disponible), en el idioma activo.
  function hintText(e, level) {
    const h = (e.hints && (e.hints[lang()] || e.hints.es)) || [];
    if (!h.length) return e.title || e.id;
    return h[Math.max(0, Math.min(level | 0, h.length - 1))];
  }

  // API principal: dado el estado + {at, insistencia}, devolvé la próxima pista (o null si no hay nada pendiente).
  function next(st, opts) {
    opts = opts || {};
    const e = pick(st, opts.at);
    if (!e) return null;
    return { id: e.id, title: e.title, at: e.at, level: opts.insistencia | 0, text: hintText(e, opts.insistencia | 0) };
  }

  return { next, frontier, pick, hintText, get edges() { return edges(); } };
})();
if (typeof window !== 'undefined') window.HintEngine = HintEngine;
