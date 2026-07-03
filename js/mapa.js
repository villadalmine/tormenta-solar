// mapa.js — EL MAPA DEL JUEGO (specs/mapa-juego.md): automap estilo DOOM con [TAB]. El CORTE de la manzana:
// la CALLE como eje horizontal (cada edificio en su X REAL), los PISOS apilados arriba, los SUBSUELOS abajo, y los
// sub-modos (Lavalle/Obelisco/bodegón/telo) colgados de su origen. TODO sale del DATO: el layout se construye por
// BFS del wiring de puertas + regex de piso/subsuelo en los nombres; los MARCADORES salen del grafo (Historia ×
// historiaState × HintEngine.frontier), de los NPCs del modelo (persona/oracle/sells) y de los tags.
// Fog of war suave: lo no visitado = silueta "???"; las salas secret no aparecen hasta descubrirlas.
// v293 (playtest del dueño): cada quest se ancla a UN solo nodo (la entrada del edificio, no todos los pisos),
// las 🔒 salen de las barras (solo tooltip), CLICK en un edificio = zoom, y el zoom marca los pisos con contenido.
const Mapa = (() => {
  const T = (k, p) => (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(k, p) : k;
  let model = null;

  // sub-modos = nodos DATA colgados de su punto de origen ('at' = a qué lugar del grafo responden)
  const SUBMODES = [
    { id: 'lavalle',  name: 'Lavalle — el piquete', anchor: 'left',    level: 0, at: 'lavalle' },
    { id: 'obelisco', name: 'El Obelisco',          anchor: 'left',    level: 1, at: 'lavalle' },
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
    // QUESTS → UN nodo cada una (v293): preferencia tag exacto; si no, match por nombre eligiendo la ENTRADA
    // (|level| más chico) del grupo — así "edificio" no pinta los 20 pisos. 'calle' → nodo 0; 'lavalle' → sub-modo.
    model.questAt = (edges, fino) => {
      const at = {};   // nodeIdx -> [edge,...]  ·  'sm:<id>' -> [edge,...]
      const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');   // sin acentos: "Súper"≈"super", "búnker"≈"bunker"
      for (const e of (edges || [])) {
        const a = String(e.at || '');
        if (!a) continue;
        // ZOOM (fino): si la arista declara su SALA ("piso 19", "búnker"), va a ESE piso exacto
        if (fino && e.sala) {
          const fn = nodes.find(n => n.i > 0 && norm(n.name).includes(norm(e.sala)));
          if (fn) { (at[fn.i] = at[fn.i] || []).push(e); continue; }
        }
        if (a === 'calle') { (at[0] = at[0] || []).push(e); continue; }
        const sm = SUBMODES.find(s => s.at === a);
        if (sm) { (at['sm:' + sm.id] = at['sm:' + sm.id] || []).push(e); continue; }
        let cands = nodes.filter(n => n.i > 0 && n.tags.includes(a));
        if (!cands.length) cands = nodes.filter(n => n.i > 0 && norm(n.name).includes(norm(a)));
        if (!cands.length) { (at[0] = at[0] || []).push(e); continue; }   // sub-modos sin sala (el súper) → la CALLE (ahí está su puerta)
        cands.sort((x, y) => Math.abs(x.level) - Math.abs(y.level));
        (at[cands[0].i] = at[cands[0].i] || []).push(e);
      }
      return at;
    };
    return model;
  }

  // márgenes reservados: columna IZQUIERDA (Lavalle/Obelisco) y DERECHA (bodegón/telo) para que nada se pise
  const PADL = VW => Math.min(150, Math.max(120, VW * 0.14));
  const PADR = 130;

  // geometría en pantalla de un nodo (vista mundo o zoom)
  function geom(n, VW, VH, zoomAnchor) {
    const m = model, padL = PADL(VW), padR = PADR;
    if (zoomAnchor != null && Math.round(n.anchor) !== zoomAnchor) return null;
    const rows = m.maxUp + m.maxDn + 1;
    const rowH = Math.min(30, (VH - 130) / Math.max(6, rows));
    const y0 = 64 + m.maxUp * rowH;                                          // fila de la calle
    const row = m.rowOf[n.level] || 0;
    let w, x;
    if (zoomAnchor != null) { w = VW * 0.5; x = (VW - w) / 2; }
    else if (n.i === 0) { w = VW - padL - padR; x = padL; }
    else { const sx = (VW - padL - padR) / m.streetW; w = Math.max(40, Math.min(120, n.w * sx * 0.9)); x = padL + n.anchor * sx - w / 2; x = Math.max(padL, Math.min(VW - padR - w, x)); }
    const zRowH = zoomAnchor != null ? Math.min(44, (VH - 140) / Math.max(4, rows)) : rowH;
    const zy0 = zoomAnchor != null ? 70 + m.maxUp * zRowH : y0;
    return { x, y: zy0 - row * zRowH, w, h: (zoomAnchor != null ? zRowH : rowH) - 5 };
  }

  // MARCADORES del modelo (specs/mapa-juego.md §3). Las quests van aparte (questAt) para no repetir por piso.
  function iconsOf(n) {
    const out = [];
    const r = n.room;
    if ((r.npcs || []).some(x => x && (x.persona || x.oracle))) out.push('💬');
    if (n.tags.includes('arcade') || n.tags.includes('truco')) out.push('🕹️');
    if ((r.npcs || []).some(x => x && (x.sells || x.tienda || x.arsenal)) || /chino|s[úu]per/i.test(n.name)) out.push('🛒');
    return out;
  }
  // estado de una quest: '✅' hecha · '⭐' disponible AHORA · '🔒' futura (solo tooltip, no ensucia las barras)
  const questMark = (e, st) => (e.sets && Object.keys(e.sets).every(k => st.flags && st.flags[k])) ? '✅'
    : (st.frontier && st.frontier.has(e.id) ? '⭐' : '🔒');

  // qué edificio/nodo hay bajo el mouse (para CLICK = zoom). Devuelve { anchor } o null.
  function hitTest(VW, VH, st) {
    if (!model) return null;
    for (const n of model.nodes) {
      const g = geom(n, VW, VH, st.zoom); if (!g) continue;
      if (n.secret && !(st.visited && st.visited.has(n.i))) continue;
      if (st.mx >= g.x && st.mx <= g.x + g.w && st.my >= g.y && st.my <= g.y + g.h) return { anchor: Math.round(n.anchor), node: n.i };
    }
    return null;
  }

  function draw(ctx, VW, VH, st) {
    if (!model) return;
    st = st || {};
    const visited = st.visited || new Set([0]);
    const qAt = model.questAt ? model.questAt(st.edges, st.zoom != null) : {};
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
      // marcadores del nodo: iconos del modelo + quests ancladas ACÁ (✅/⭐ visibles; 🔒 solo al hover)
      const mk = seen ? iconsOf(n) : [];
      const qs = seen ? (qAt[n.i] || []).map(e => questMark(e, st)) : [];
      const vis = mk.concat(qs.filter(q => q !== '🔒'));
      const hasStar = qs.includes('⭐');
      // pisos con contenido: fondo tenue (en zoom, más notorio) — "los pisos importantes SE VEN"
      if (seen && (vis.length || hasStar)) { ctx.fillStyle = st.zoom != null ? 'rgba(80,140,220,0.12)' : 'rgba(80,140,220,0.07)'; ctx.fillRect(g.x, g.y, g.w, g.h); }
      const col = isCur ? '#ffd54f' : hasStar ? '#ffe27a' : seen ? (n.i === 0 ? '#7fd0ff' : '#5a8cc8') : 'rgba(90,110,140,0.35)';
      ctx.strokeStyle = col; ctx.lineWidth = isCur || hov ? 2 : 1;
      ctx.strokeRect(g.x + 0.5, g.y + 0.5, g.w, g.h);
      if (st.stormed && n.room.collapsesOnStorm) { ctx.fillStyle = 'rgba(180,40,40,0.18)'; ctx.fillRect(g.x, g.y, g.w, g.h); }
      ctx.fillStyle = seen ? '#cfe0f0' : 'rgba(140,160,190,0.5)'; ctx.font = (isCur ? 'bold ' : '') + '9px monospace'; ctx.textAlign = 'left';
      const label = seen ? (typeof TX !== 'undefined' ? TX(n.name) : n.name) : '???';
      // en ZOOM: etiqueta de PISO a la izquierda de la barra + nombre + marcadores GRANDES a la derecha, afuera
      if (st.zoom != null) {
        ctx.fillStyle = '#8fa8c8'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'right';
        const lv = n.level || 0;
        ctx.fillText(lv === 0 ? '—' : (lv > 0 ? 'P' + lv : 'S' + (-lv)), g.x - 8, g.y + g.h / 2 + 3);
        ctx.fillStyle = seen ? '#cfe0f0' : 'rgba(140,160,190,0.5)'; ctx.font = (isCur ? 'bold ' : '') + '11px monospace'; ctx.textAlign = 'left';
        ctx.fillText(String(label).slice(0, Math.floor(g.w / 7)), g.x + 5, g.y + g.h / 2 + 4);
        if (vis.length) { ctx.font = '13px monospace'; ctx.fillText(vis.slice(0, 5).join(' '), g.x + g.w + 8, g.y + g.h / 2 + 5); }
      } else {
        ctx.fillText(String(label).slice(0, Math.floor(g.w / 5.6)), g.x + 3, g.y + g.h / 2 + 3);
        if (vis.length) { ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.fillText(vis.slice(0, 4).join(''), g.x + g.w - 2, g.y + g.h - 2); }
      }
      // ESTÁS ACÁ: punto que late, en tu x real dentro de la barra
      if (isCur) { const bx = g.x + (st.px01 || 0.5) * g.w, by = g.y + g.h / 2;
        ctx.fillStyle = 'rgba(255,213,79,' + (0.6 + 0.4 * Math.sin((st.t || 0) * 6)) + ')'; ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillText(T('g.mapa.aca'), bx, g.y - 3); }
    }
    // sub-modos como nodos colgados — en sus COLUMNAS reservadas (no pisan la calle ni los subsuelos)
    SUBMODES.forEach((sm) => {
      if (st.zoom != null) return;
      const padL = PADL(VW);
      const rows = model.maxUp + model.maxDn + 1;
      const rowH = Math.min(30, (VH - 130) / Math.max(6, rows));
      const base = 64 + model.maxUp * rowH;
      const x = sm.anchor === 'left' ? Math.max(8, padL - 116) : VW - PADR + 10;
      const y = sm.anchor === 'left' ? base - sm.level * 26 : 40 + sm.level * 26;
      const g = { x, y, w: 104, h: 20 };
      const active = st.sub === sm.id;
      const qs = (qAt['sm:' + sm.id] || []).map(e => questMark(e, st)).filter(q => q !== '🔒');
      ctx.strokeStyle = active ? '#ffd54f' : qs.includes('⭐') ? '#ffe27a' : '#4a7a5a'; ctx.lineWidth = active ? 2 : 1; ctx.setLineDash([3, 3]);
      ctx.strokeRect(g.x, g.y, g.w, g.h); ctx.setLineDash([]);
      ctx.fillStyle = active ? '#ffe9b0' : '#8fc8a0'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
      ctx.fillText(sm.name.slice(0, 16), g.x + 3, g.y + 13);
      if (qs.length) { ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.fillText(qs.join(''), g.x + g.w - 2, g.y + 13); }
      if (active) { ctx.fillStyle = 'rgba(255,213,79,' + (0.6 + 0.4 * Math.sin((st.t || 0) * 6)) + ')'; ctx.beginPath(); ctx.arc(g.x + g.w - 8, g.y + g.h / 2, 3.4, 0, Math.PI * 2); ctx.fill(); }
    });
    // tooltip del hover (banda de abajo) — acá SÍ se ven las 🔒 con su nombre ("se destraba más adelante")
    if (hoverNode) {
      const { n } = hoverNode, seen = visited.has(n.i);
      const lines = [];
      lines.push((seen ? (typeof TX !== 'undefined' ? TX(n.name) : n.name) : '???') + (n.level ? '  ·  ' + (n.level > 0 ? T('g.mapa.piso', { n: n.level }) : T('g.mapa.sub', { n: -n.level })) : '') + '  ·  ' + T('g.mapa.click'));
      if (seen) {
        const mk = iconsOf(n); if (mk.length) lines.push(mk.join(' '));
        for (const e of (qAt[n.i] || [])) {
          const q = questMark(e, st);
          if (q === '⭐') { const h = e.hints && e.hints[(typeof I18n !== 'undefined' && I18n.short && I18n.short()) || 'es']; lines.push('⭐ ' + ((h && h[0]) || e.title || e.id)); }
          else lines.push(q + ' ' + (e.title || e.id) + (q === '🔒' ? ' — ' + T('g.mapa.locked') : ''));
        }
      }
      const bh = 16 + lines.length * 14;
      ctx.fillStyle = 'rgba(4,8,14,0.94)'; ctx.fillRect(0, VH - bh, VW, bh);
      ctx.strokeStyle = '#2a4a6a'; ctx.strokeRect(0.5, VH - bh + 0.5, VW - 1, bh - 1);
      ctx.textAlign = 'left'; lines.forEach((ln, i) => { ctx.fillStyle = i === 0 ? '#ffd54f' : '#cfe0f0'; ctx.font = (i === 0 ? 'bold ' : '') + '11px monospace'; ctx.fillText(String(ln).slice(0, 110), 10, VH - bh + 15 + i * 14); });
    }
  }

  function groupAt(current) { const n = model && model.nodes[current]; return n ? Math.round(n.anchor) : null; }
  return { build, draw, groupAt, hitTest, get model() { return model; } };
})();
if (typeof window !== 'undefined') window.Mapa = Mapa;
if (typeof module !== 'undefined') module.exports = Mapa;
