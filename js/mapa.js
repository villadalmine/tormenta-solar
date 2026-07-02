// mapa.js — EL MAPA DEL JUEGO (specs/mapa-juego.md): automap estilo DOOM con [TAB]. El CORTE de la manzana:
// la CALLE como eje horizontal (cada edificio en su X REAL), los PISOS apilados arriba, los SUBSUELOS abajo, y los
// sub-modos (Lavalle/Obelisco/bodegón/telo) colgados de su origen. TODO sale del DATO: el layout se construye por
// BFS del wiring de puertas + regex de piso/subsuelo en los nombres; los MARCADORES salen del grafo (Historia ×
// historiaState × HintEngine.frontier), de los NPCs del modelo (persona/oracle/sells) y de los tags.
// Fog of war suave: lo no visitado = silueta "???"; las salas secret no aparecen hasta descubrirlas.
const Mapa = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  let model = null;

  // sub-modos = nodos DATA colgados de su punto de origen
  const SUBMODES = [
    { id: 'lavalle',  name: 'Lavalle — el piquete', anchor: 'left',    level: 0 },
    { id: 'obelisco', name: 'El Obelisco',          anchor: 'left',    level: 1 },
    { id: 'bodegon',  name: 'El Bodegón',           anchor: 'cinetop', level: 0 },
    { id: 'telo',     name: 'El telo',              anchor: 'cinetop', level: 1 },
  ];

  function levelOf(name, fallback) {
    const n = String(name || '');
    let m = n.match(/piso\s*(\d+)/i); if (m) return +m[1];
    m = n.match(/subsuelo\s*(\d+)/i); if (m) return -(+m[1]);
    if (/b[úu]nker/i.test(n)) return 21;
    return fallback;
  }
  const dirOf = label => (/baja|down/i.test(String(label || '')) ? -1 : (/subi|up/i.test(String(label || '')) ? 1 : 0));

  function build(rooms) {
    const street = rooms[0];
    const nodes = rooms.map((r, i) => ({ i, name: r.name, w: r.w || 24, tags: r.tags || [], theme: r.theme,
      secret: r.theme === 'secret' || (r.tags || []).includes('bunker'), level: null, anchor: null, room: r }));
    nodes[0].level = 0; nodes[0].anchor = (street.w || 120) / 2;
    // BFS por GRUPOS: cada puerta de la calle abre un edificio anclado en su X real
    const TILE = (typeof Level !== 'undefined' && Level.TILE) || 32;   // los door.x del runtime están en PÍXELES
    const q = [];
    for (const d of (street.doors || [])) if (typeof d.to === 'number' && d.to > 0 && d.to < rooms.length) {
      if (nodes[d.to].anchor == null) { nodes[d.to].anchor = d.x / TILE; nodes[d.to].level = levelOf(rooms[d.to].name, dirOf(d.label) < 0 ? -1 : 1); q.push(d.to); }
    }
    while (q.length) {
      const i = q.shift(), r = rooms[i];
      for (const d of (r.doors || [])) { const to = d.to;
        if (typeof to !== 'number' || to <= 0 || to >= rooms.length || nodes[to].anchor != null) continue;
        nodes[to].anchor = nodes[i].anchor;
        nodes[to].level = levelOf(rooms[to].name, nodes[i].level + (dirOf(d.label) || 0));
        q.push(to);
      }
    }
    for (const n of nodes) { if (n.anchor == null) { n.anchor = 4; n.level = n.level == null ? -4 : n.level; } }   // huérfanos: esquina abajo-izq
    // compactar niveles ALTOS (edificio de 20 pisos no entra): mapear nivel real → fila visual (comprimido arriba de 5)
    const lv = [...new Set(nodes.map(n => n.level))].sort((a, b) => a - b);
    const rowOf = { 0: 0 };
    let upRows = lv.filter(l => l > 0); upRows.forEach((l, idx) => rowOf[l] = idx + 1);
    let dnRows = lv.filter(l => l < 0).sort((a, b) => b - a); dnRows.forEach((l, idx) => rowOf[l] = -(idx + 1));
    model = { nodes, rowOf, streetW: street.w || 120, maxUp: upRows.length, maxDn: dnRows.length };
    // grupos por edificio (para el zoom): ancla → lista
    const groups = {}; nodes.forEach(n => { const k = Math.round(n.anchor); (groups[k] = groups[k] || []).push(n.i); });
    model.groups = groups;
    return model;
  }

  // geometría en pantalla de un nodo (vista mundo o zoom)
  function geom(n, VW, VH, zoomAnchor) {
    const m = model, pad = 26;
    if (zoomAnchor != null && Math.round(n.anchor) !== zoomAnchor) return null;
    const rows = m.maxUp + m.maxDn + 1;
    const rowH = Math.min(30, (VH - 130) / Math.max(6, rows));
    const y0 = 64 + m.maxUp * rowH;                                          // fila de la calle
    const row = m.rowOf[n.level] || 0;
    let w, x;
    if (zoomAnchor != null) { w = VW * 0.55; x = (VW - w) / 2; }
    else if (n.i === 0) { w = VW - pad * 2; x = pad; }
    else { const sx = (VW - pad * 2) / m.streetW; w = Math.max(40, Math.min(120, n.w * sx * 0.9)); x = pad + n.anchor * sx - w / 2; x = Math.max(pad, Math.min(VW - pad - w, x)); }
    const zRowH = zoomAnchor != null ? Math.min(44, (VH - 140) / Math.max(4, rows)) : rowH;
    const zy0 = zoomAnchor != null ? 70 + m.maxUp * zRowH : y0;
    return { x, y: zy0 - row * zRowH, w, h: (zoomAnchor != null ? zRowH : rowH) - 5 };
  }

  // MARCADORES del grafo/modelo (specs/mapa-juego.md §3)
  function markersOf(n, st) {
    const out = [];
    const r = n.room;
    if ((r.npcs || []).some(x => x && (x.persona || x.oracle))) out.push('💬');
    if (n.tags.includes('arcade') || n.tags.includes('truco')) out.push('🕹️');
    if ((r.npcs || []).some(x => x && (x.sells || x.tienda || x.arsenal)) || /chino|s[úu]per/i.test(n.name)) out.push('🛒');
    // quests del grafo ancladas a este nodo (edge.at → sala por tag/nombre)
    for (const e of (st.edges || [])) {
      const at = e.at || '';
      const match = (at === 'calle' && n.i === 0) || n.tags.includes(at) || (at && n.name && n.name.toLowerCase().includes(at));
      if (!match) continue;
      const done = e.sets && Object.keys(e.sets).every(k => st.flags && st.flags[k]);
      out.push(done ? '✅' : (st.frontier && st.frontier.has(e.id) ? '⭐' : '🔒'));
    }
    return [...new Set(out)].slice(0, 5);
  }

  function draw(ctx, VW, VH, st) {
    if (!model) return;
    st = st || {};
    const visited = st.visited || new Set([0]);
    ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.globalAlpha = 0.05; ctx.fillStyle = '#4af'; for (let y = 0; y < VH; y += 4) ctx.fillRect(0, y, VW, 1); ctx.restore();   // scanlines
    // header
    ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 30);
    ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left';
    ctx.fillText('🗺️ ' + (st.zoom != null ? T('g.mapa.zoomTitle') : T('g.mapa.title')), 10, 20);
    ctx.textAlign = 'right'; ctx.fillStyle = '#9be8a0'; ctx.font = '10px monospace';
    ctx.fillText((st.online ? '👥 ' + st.online + ' · ' : '') + T('g.mapa.hint'), VW - 10, 19);
    // conexiones (puertas) — solo entre visitados (fog)
    ctx.strokeStyle = 'rgba(90,140,200,0.25)'; ctx.lineWidth = 1;
    for (const n of model.nodes) { if (!visited.has(n.i)) continue; const g1 = geom(n, VW, VH, st.zoom); if (!g1) continue;
      for (const d of (n.room.doors || [])) { const to = d.to; if (typeof to !== 'number' || !model.nodes[to] || !visited.has(to)) continue;
        const g2 = geom(model.nodes[to], VW, VH, st.zoom); if (!g2) continue;
        ctx.beginPath(); ctx.moveTo(g1.x + g1.w / 2, g1.y + g1.h / 2); ctx.lineTo(g2.x + g2.w / 2, g2.y + g2.h / 2); ctx.stroke(); } }
    // nodos
    let hoverNode = null;
    for (const n of model.nodes) {
      const g = geom(n, VW, VH, st.zoom); if (!g) continue;
      const seen = visited.has(n.i);
      if (n.secret && !seen) continue;                                     // los secretos no existen hasta descubrirlos
      const isCur = st.current === n.i && !st.sub;
      const hov = st.mx >= g.x && st.mx <= g.x + g.w && st.my >= g.y && st.my <= g.y + g.h;
      if (hov) hoverNode = { n, g };
      const col = isCur ? '#ffd54f' : seen ? (n.i === 0 ? '#7fd0ff' : '#5a8cc8') : 'rgba(90,110,140,0.35)';
      ctx.strokeStyle = col; ctx.lineWidth = isCur || hov ? 2 : 1;
      ctx.strokeRect(g.x + 0.5, g.y + 0.5, g.w, g.h);
      if (st.stormed && n.room.collapsesOnStorm) { ctx.fillStyle = 'rgba(180,40,40,0.18)'; ctx.fillRect(g.x, g.y, g.w, g.h); }
      ctx.fillStyle = seen ? '#cfe0f0' : 'rgba(140,160,190,0.5)'; ctx.font = (isCur ? 'bold ' : '') + '9px monospace'; ctx.textAlign = 'left';
      const label = seen ? (typeof TX !== 'undefined' ? TX(n.name) : n.name) : '???';
      ctx.fillText(String(label).slice(0, Math.floor(g.w / 5.6)), g.x + 3, g.y + g.h / 2 + 3);
      if (seen) { const mk = markersOf(n, st); if (mk.length) { ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.fillText(mk.join(''), g.x + g.w - 2, g.y + g.h - 2); } }
      // ESTÁS ACÁ: punto que late, en tu x real dentro de la barra
      if (isCur) { const bx = g.x + (st.px01 || 0.5) * g.w, by = g.y + g.h / 2;
        ctx.fillStyle = 'rgba(255,213,79,' + (0.6 + 0.4 * Math.sin((st.t || 0) * 6)) + ')'; ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillText(T('g.mapa.aca'), bx, g.y - 3); }
    }
    // sub-modos como nodos colgados
    const cineAnchor = (() => { const c = model.nodes.find(n => /cine/i.test(n.name)); return c ? c : null; })();
    SUBMODES.forEach((sm, k) => {
      if (st.zoom != null) return;
      const x = sm.anchor === 'left' ? 8 : VW - 118, base = 64 + model.maxUp * Math.min(30, (VH - 130) / Math.max(6, model.maxUp + model.maxDn + 1));
      const y = sm.anchor === 'left' ? base - 30 - sm.level * 26 : 40 + sm.level * 26;
      const g = { x, y, w: 106, h: 20 };
      const active = st.sub === sm.id;
      ctx.strokeStyle = active ? '#ffd54f' : '#4a7a5a'; ctx.lineWidth = active ? 2 : 1; ctx.setLineDash([3, 3]);
      ctx.strokeRect(g.x, g.y, g.w, g.h); ctx.setLineDash([]);
      ctx.fillStyle = active ? '#ffe9b0' : '#8fc8a0'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
      ctx.fillText(sm.name.slice(0, 18), g.x + 3, g.y + 13);
      if (active) { ctx.fillStyle = 'rgba(255,213,79,' + (0.6 + 0.4 * Math.sin((st.t || 0) * 6)) + ')'; ctx.beginPath(); ctx.arc(g.x + g.w - 8, g.y + g.h / 2, 3.4, 0, Math.PI * 2); ctx.fill(); }
    });
    // tooltip del hover (abajo)
    if (hoverNode) {
      const { n } = hoverNode, seen = visited.has(n.i);
      const lines = [];
      lines.push((seen ? (typeof TX !== 'undefined' ? TX(n.name) : n.name) : '???') + (n.level ? '  ·  ' + (n.level > 0 ? T('g.mapa.piso', { n: n.level }) : T('g.mapa.sub', { n: -n.level })) : ''));
      if (seen) { const mk = markersOf(n, st); if (mk.length) lines.push(mk.join(' '));
        // hint críptico (nivel 0) de la quest DISPONIBLE acá
        for (const e of (st.edges || [])) if (st.frontier && st.frontier.has(e.id)) {
          const at = e.at || ''; if ((at === 'calle' && n.i === 0) || n.tags.includes(at) || (at && n.name.toLowerCase().includes(at))) {
            const h = e.hints && e.hints[(typeof I18n !== 'undefined' && I18n.short && I18n.short()) || 'es']; if (h && h[0]) lines.push('⭐ ' + h[0]); break; } } }
      const bh = 16 + lines.length * 14;
      ctx.fillStyle = 'rgba(4,8,14,0.94)'; ctx.fillRect(0, VH - bh, VW, bh);
      ctx.strokeStyle = '#2a4a6a'; ctx.strokeRect(0.5, VH - bh + 0.5, VW - 1, bh - 1);
      ctx.textAlign = 'left'; lines.forEach((ln, i) => { ctx.fillStyle = i === 0 ? '#ffd54f' : '#cfe0f0'; ctx.font = (i === 0 ? 'bold ' : '') + '11px monospace'; ctx.fillText(String(ln).slice(0, 110), 10, VH - bh + 15 + i * 14); });
    }
  }

  function groupAt(current) { const n = model && model.nodes[current]; return n ? Math.round(n.anchor) : null; }
  return { build, draw, groupAt, get model() { return model; } };
})();
if (typeof window !== 'undefined') window.Mapa = Mapa;
if (typeof module !== 'undefined') module.exports = Mapa;
