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
      if (nodes[d.to].anchor == null) { nodes[d.to].anchor = d.x / TILE; nodes[d.to].level = levelOf(rooms[d.to].name, dirOf(d.label) < 0 ? -1 : 1); nodes[d.to].parent = 0; q.push(d.to); }
    }
    while (q.length) {
      const i = q.shift(), r = rooms[i];
      for (const d of (r.doors || [])) { const to = d.to;
        if (typeof to !== 'number' || to <= 0 || to >= rooms.length || nodes[to].anchor != null) continue;
        nodes[to].anchor = nodes[i].anchor;
        nodes[to].level = levelOf(rooms[to].name, nodes[i].level + (dirOf(d.label) || 0));
        nodes[to].parent = i;
        q.push(to);
      }
    }
    // huérfanas con puerta de SALIDA a una sala anclada (se entra por spawnIn, ej. las cuevas del cuevero):
    // adoptan el ancla del destino y quedan UN nivel más abajo (hasta converger)
    for (let pass = 0; pass < 4; pass++) {
      for (const n of nodes) { if (n.anchor != null) continue;
        for (const d of (rooms[n.i].doors || [])) { const to = d.to;
          if (typeof to === 'number' && nodes[to] && nodes[to].anchor != null) {
            n.anchor = nodes[to].anchor; n.level = nodes[to].level - 1; n.parent = to; break; } } }
    }
    for (const n of nodes) { if (n.anchor == null) { n.anchor = 4; n.level = n.level == null ? -4 : n.level; } }   // huérfanos reales: esquina abajo-izq
    // hermanas (misma ancla + mismo nivel, ej. las 3 cuevas del dólar): se reparten el lugar
    const sibKey = n => Math.round(n.anchor) + '|' + n.level;
    const sibs = {}; nodes.forEach(n => { if (n.i === 0) return; (sibs[sibKey(n)] = sibs[sibKey(n)] || []).push(n); });
    for (const k in sibs) sibs[k].forEach((n, j) => { n.sib = j; n.sibN = sibs[k].length; });
    // y por NIVEL solo (vista SUBSUELOS: todas las salas de un nivel comparten la fila)
    const lvls = {}; nodes.forEach(n => { if (n.i === 0 || n.level >= 0) return; (lvls[n.level] = lvls[n.level] || []).push(n); });
    for (const k in lvls) lvls[k].sort((a, b) => a.anchor - b.anchor).forEach((n, j) => { n.ssSib = j; n.ssSibN = lvls[k].length; });
    // compactar niveles ALTOS (edificio de 20 pisos no entra): mapear nivel real → fila visual (comprimido arriba de 5)
    const lv = [...new Set(nodes.map(n => n.level))].sort((a, b) => a - b);
    const rowOf = { 0: 0 };
    let upRows = lv.filter(l => l > 0); upRows.forEach((l, idx) => rowOf[l] = idx + 1);
    let dnRows = lv.filter(l => l < 0).sort((a, b) => b - a); dnRows.forEach((l, idx) => rowOf[l] = -(idx + 1));
    model = { nodes, rowOf, streetW: street.w || 120, maxUp: upRows.length, maxDn: dnRows.length };
    // grupos por edificio (para el zoom): ancla → lista
    const groups = {}; nodes.forEach(n => { const k = Math.round(n.anchor); (groups[k] = groups[k] || []).push(n.i); });
    model.groups = groups;
    // puertas de la calle SIN sala destino (sub-modos como el SÚPER): del DATO de la calle, nada hardcodeado
    model.puertas = (street.doors || []).filter(d => !(typeof d.to === 'number' && d.to > 0))
      .map(d => ({ x: d.x, label: d.label || d.id || '', id: d.id || '', emoji: /super|chino/i.test(String(d.id) + String(d.art)) ? '🛒' : '🚪' }));
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
    // EDIFICIOS (v299): un OBJETO por grupo para la vista general — nombre, salas, superficie o bajo tierra
    model.buildings = [];
    for (const k in groups) {
      const idxs = groups[k].filter(i => i !== 0);
      if (!idxs.length) continue;
      const ns = idxs.map(i => nodes[i]);
      const entr = ns.slice().sort((a, b) => Math.abs(a.level) - Math.abs(b.level))[0];
      const bname = String(entr.name).split(/\s+[—-]\s+/)[0].trim() || String(entr.name);
      model.buildings.push({ anchor: +k, rooms: idxs, up: ns.some(n => n.level >= 0), name: bname,
        floors: idxs.length, entrance: entr.i });
    }
    model.buildings.sort((a, b) => a.anchor - b.anchor);
    return model;
  }

  // márgenes reservados: columna IZQUIERDA (Lavalle/Obelisco) y DERECHA (bodegón/telo) para que nada se pise
  const PADL = VW => Math.min(150, Math.max(120, VW * 0.14));
  const PADR = 130;

  // geometría en pantalla de un nodo — 3 vistas: MANZANA (null: solo superficie), SUBSUELOS ('ss'), edificio (número)
  function geom(n, VW, VH, zoomAnchor) {
    const m = model, padL = PADL(VW), padR = PADR;
    if (zoomAnchor === 'ss') {                                               // SUBSUELOS: la calle de referencia + niveles bajo tierra, GRANDES
      if (n.i !== 0 && n.level >= 0) return null;
      const rows2 = m.maxDn + 1;
      const rh = Math.min(52, (VH - 170) / Math.max(3, rows2));
      if (n.i === 0) return { x: padL, y: 56, w: VW - padL - padR, h: 22 };
      const W = VW * 0.52, X = Math.max(60, (VW - W) / 2 - VW * 0.08);
      const nSib = n.ssSibN || 1, j = n.ssSib || 0;
      const w = W / nSib - (nSib > 1 ? 8 : 0);
      return { x: X + j * (W / nSib), y: 56 + 30 + (-(m.rowOf[n.level] || -1) - 1) * rh, w, h: rh - 8 };
    }
    if (typeof zoomAnchor === 'number' && Math.round(n.anchor) !== zoomAnchor) return null;
    if (zoomAnchor == null && n.i !== 0 && n.level < 0) return null;         // MANZANA = solo superficie (subsuelos → vista [2])
    const rows = m.maxUp + 1;
    const rowH = Math.min(30, (VH - 110) / Math.max(6, rows));
    const y0 = 64 + m.maxUp * rowH;                                          // fila de la calle
    const row = m.rowOf[n.level] || 0;
    let w, x;
    if (typeof zoomAnchor === 'number') { w = VW * 0.5; x = (VW - w) / 2; }
    else if (n.i === 0) { w = VW - padL - padR; x = padL; }
    else {
      const sx = (VW - padL - padR) / m.streetW; w = Math.max(34, Math.min(120, n.w * sx * 0.9)); x = padL + n.anchor * sx - w / 2; x = Math.max(padL, Math.min(VW - padR - w, x));
      const nSib = n.sibN || 1; if (nSib > 1) { const j = n.sib || 0; w = w / nSib - 3; x += j * (w + 3); }
    }
    const zRowH = typeof zoomAnchor === 'number' ? Math.min(44, (VH - 140) / Math.max(4, m.maxUp + m.maxDn + 1)) : rowH;
    const zy0 = typeof zoomAnchor === 'number' ? 70 + m.maxUp * zRowH : y0;
    return { x, y: zy0 - row * zRowH, w, h: (typeof zoomAnchor === 'number' ? zRowH : rowH) - 5 };
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
  // título de la quest en el idioma del jugador (title_en viene del grafo, v295)
  const questTitle = e => ((typeof I18n !== 'undefined' && I18n.short && I18n.short() === 'en' && e.title_en) ? e.title_en : (e.title || e.id));

  // VISTA GENERAL (v299): cajones POR EDIFICIO en flujo — reparto equitativo, imposible que se pisen.
  // Devuelve [{b, x, y, w, h}] para dibujar y clickear con la MISMA geometría.
  function overviewBoxes(VW, VH) {
    const m = model; if (!m || !m.buildings) return [];
    const padL = PADL(VW), padR = PADR;
    const surf = m.buildings.filter(b => b.up), under = m.buildings.filter(b => !b.up);
    const out = [];
    const flow = (list, yBase, dir) => {
      const avail = VW - padL - padR;
      const perRow = Math.max(1, Math.floor(avail / 118));
      const rows2 = Math.ceil(list.length / perRow);
      const slot = avail / Math.min(list.length, perRow);
      list.forEach((b, i) => {
        const r = Math.floor(i / perRow), c = i % perRow;
        const inRow = Math.min(list.length - r * perRow, perRow);
        const rowSlot = avail / inRow;
        out.push({ b, x: padL + c * rowSlot + 4, y: yBase + dir * r * 64, w: rowSlot - 8, h: 56 });
      });
      return rows2;
    };
    const streetY = Math.round(VH * 0.55);
    const surfRows = Math.ceil(surf.length / Math.max(1, Math.floor((VW - padL - padR) / 118)));
    flow(surf, streetY - 64 - (surfRows - 1) * 64, 1);
    flow(under, streetY + 34, 1);
    return { boxes: out, streetY };
  }

  // qué hay bajo el mouse: pestaña de vista, o edificio/nodo (CLICK = zoom). Devuelve { tab } | { anchor } | null.
  function hitTest(VW, VH, st) {
    if (!model) return null;
    if (st.my >= 30 && st.my <= 48) {                                        // pestañas [MANZANA] [SUBSUELOS]
      if (st.mx >= 10 && st.mx <= 110) return { tab: 'manzana' };
      if (st.mx >= 118 && st.mx <= 228) return { tab: 'ss' };
    }
    if (st.zoom == null) {                                                   // vista general: cajones por edificio
      const ov = overviewBoxes(VW, VH);
      for (const bx of (ov.boxes || [])) {
        if (st.mx >= bx.x && st.mx <= bx.x + bx.w && st.my >= bx.y && st.my <= bx.y + bx.h)
          return bx.b.up ? { anchor: bx.b.anchor } : { tab: 'ss' };
      }
      return null;
    }
    for (const n of model.nodes) {
      const g = geom(n, VW, VH, st.zoom); if (!g) continue;
      if (n.secret && !(st.visited && st.visited.has(n.i))) continue;
      if (st.mx >= g.x && st.mx <= g.x + g.w && st.my >= g.y && st.my <= g.y + g.h) return { anchor: Math.round(n.anchor), node: n.i };
    }
    return null;
  }

  // dibuja la vista GENERAL y devuelve el cajón bajo el mouse (para el tooltip)
  function drawOverview(ctx, VW, VH, st, qAt, visited) {
    const ov = overviewBoxes(VW, VH); if (!ov.boxes) return null;
    const padL = PADL(VW), padR = PADR;
    const curB = model.nodes[st.current];
    let hover = null;
    // la CALLE: banda de referencia con sus quests + puertas
    const sy = ov.streetY;
    const isCurStreet = st.current === 0 && !st.sub;
    ctx.strokeStyle = isCurStreet ? '#ffd54f' : '#7fd0ff'; ctx.lineWidth = isCurStreet ? 2 : 1;
    ctx.strokeRect(padL + 0.5, sy + 0.5, VW - padL - padR, 24);
    ctx.fillStyle = '#cfe0f0'; ctx.font = (isCurStreet ? 'bold ' : '') + '10px monospace'; ctx.textAlign = 'left';
    ctx.fillText((typeof TX !== 'undefined' ? TX(model.nodes[0].name) : model.nodes[0].name), padL + 6, sy + 16);
    const sq = (qAt[0] || []).map(e => questMark(e, st));
    const sqTxt = (sq.filter(q => q === '✅').length ? '✅' + sq.filter(q => q === '✅').length + ' ' : '') +
                  (sq.filter(q => q === '⭐').length ? '⭐' + sq.filter(q => q === '⭐').length + ' ' : '') +
                  (sq.includes('🔒') ? '??' : '');
    if (sqTxt) { ctx.textAlign = 'right'; ctx.fillText(sqTxt.trim(), VW - padR - 6, sy + 16); }
    if (isCurStreet) { const bx = padL + (st.px01 || 0.5) * (VW - padL - padR);
      ctx.fillStyle = 'rgba(255,213,79,' + (0.6 + 0.4 * Math.sin((st.t || 0) * 6)) + ')'; ctx.beginPath(); ctx.arc(bx, sy + 12, 4, 0, Math.PI * 2); ctx.fill(); }
    // cajones de EDIFICIOS
    for (const bx of ov.boxes) {
      const b = bx.b;
      const v = b.rooms.filter(i => visited.has(i)).length;
      const qs = []; for (const i of b.rooms) for (const e of (qAt[i] || [])) qs.push(questMark(e, st));
      const nDone = qs.filter(q => q === '✅').length, nStar = qs.filter(q => q === '⭐').length, hasLock = qs.includes('🔒');
      const iCur = curB && Math.round(curB.anchor) === b.anchor && st.current !== 0 && !st.sub;
      const hov = st.mx >= bx.x && st.mx <= bx.x + bx.w && st.my >= bx.y && st.my <= bx.y + bx.h;
      if (hov) hover = { bx, v, nDone, nStar, hasLock };
      if (v || nStar) { ctx.fillStyle = 'rgba(80,140,220,' + (nStar ? 0.14 : 0.07) + ')'; ctx.fillRect(bx.x, bx.y, bx.w, bx.h); }
      ctx.strokeStyle = iCur ? '#ffd54f' : nStar ? '#ffe27a' : v ? '#5a8cc8' : 'rgba(90,110,140,0.4)';
      ctx.lineWidth = iCur || hov ? 2 : 1;
      ctx.strokeRect(bx.x + 0.5, bx.y + 0.5, bx.w, bx.h);
      // línea a su puerta en la calle (su x real)
      const doorX = padL + Math.max(0, Math.min(1, b.anchor / model.streetW)) * (VW - padL - padR);
      ctx.strokeStyle = 'rgba(90,140,200,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx.x + bx.w / 2, b.up ? bx.y + bx.h : bx.y); ctx.lineTo(doorX, b.up ? sy : sy + 24); ctx.stroke();
      // contenido: nombre / pisos+descubierto / hitos
      ctx.fillStyle = v ? '#cfe0f0' : 'rgba(140,160,190,0.6)'; ctx.font = (iCur ? 'bold ' : '') + '10px monospace'; ctx.textAlign = 'left';
      ctx.fillText(String(b.name).slice(0, Math.floor((bx.w - 8) / 6)), bx.x + 4, bx.y + 14);
      ctx.font = '9px monospace'; ctx.fillStyle = v ? '#8fa8c8' : 'rgba(120,140,170,0.55)';
      ctx.fillText('×' + b.floors + '  🔦' + v + '/' + b.floors, bx.x + 4, bx.y + 28);
      const marks = (nDone ? '✅' + nDone + ' ' : '') + (nStar ? '⭐' + nStar + ' ' : '') + (hasLock ? '?? ' : '');
      const icons = [...new Set(b.rooms.filter(i => visited.has(i)).flatMap(i => iconsOf(model.nodes[i])))].slice(0, 3).join('');
      if (marks || icons) { ctx.font = '10px monospace'; ctx.fillStyle = '#ffe27a'; ctx.fillText((marks + icons).trim().slice(0, Math.floor((bx.w - 8) / 6)), bx.x + 4, bx.y + 44); }
      if (iCur) { ctx.fillStyle = 'rgba(255,213,79,' + (0.6 + 0.4 * Math.sin((st.t || 0) * 6)) + ')'; ctx.beginPath(); ctx.arc(bx.x + bx.w - 8, bx.y + 9, 3.5, 0, Math.PI * 2); ctx.fill(); }
    }
    return hover;
  }

  function draw(ctx, VW, VH, st) {
    if (!model) return;
    st = st || {};
    const visited = st.visited || new Set([0]);
    const qAt = model.questAt ? model.questAt(st.edges, st.zoom != null) : {};
    ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.globalAlpha = 0.05; ctx.fillStyle = '#4af'; for (let y = 0; y < VH; y += 4) ctx.fillRect(0, y, VW, 1); ctx.restore();   // scanlines
    // header + PESTAÑAS de vista (v298: [1] manzana / [2] subsuelos — pedido del dueño: "elegir qué ver")
    ctx.fillStyle = '#0a0a0e'; ctx.fillRect(0, 0, VW, 30);
    ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left';
    ctx.fillText('🗺️ ' + (typeof st.zoom === 'number' ? T('g.mapa.zoomTitle') : st.zoom === 'ss' ? T('g.mapa.ssTitle') : T('g.mapa.title')), 10, 20);
    ctx.textAlign = 'right'; ctx.fillStyle = '#9be8a0'; ctx.font = '10px monospace';
    ctx.fillText((st.online ? '👥 ' + st.online + ' · ' : '') + T('g.mapa.hint'), VW - 10, 19);
    if (typeof st.zoom !== 'number') {
      const tabs = [[10, T('g.mapa.tabManzana'), st.zoom == null], [118, T('g.mapa.tabSS'), st.zoom === 'ss']];
      for (const [tx, label2, act] of tabs) {
        ctx.fillStyle = act ? 'rgba(255,213,79,0.15)' : 'rgba(90,140,200,0.08)'; ctx.fillRect(tx, 31, 100, 16);
        ctx.strokeStyle = act ? '#ffd54f' : '#3a5a80'; ctx.strokeRect(tx + 0.5, 31.5, 100, 16);
        ctx.fillStyle = act ? '#ffe9b0' : '#7fa8c8'; ctx.font = (act ? 'bold ' : '') + '9px monospace'; ctx.textAlign = 'center';
        ctx.fillText(label2, tx + 50, 42);
      }
    }
    // VISTA GENERAL (v299): cajones por edificio — de menor a mayor detalle; el loop fino queda para zoom/subsuelos
    let hoverBox = null;
    if (st.zoom == null) hoverBox = drawOverview(ctx, VW, VH, st, qAt, visited);
    // conexiones (puertas) — solo entre visitados (fog), solo en las vistas de detalle
    if (st.zoom != null) {
    ctx.strokeStyle = 'rgba(90,140,200,0.25)'; ctx.lineWidth = 1;
    for (const n of model.nodes) { if (!visited.has(n.i)) continue; const g1 = geom(n, VW, VH, st.zoom); if (!g1) continue;
      for (const d of (n.room.doors || [])) { const to = d.to; if (typeof to !== 'number' || !model.nodes[to] || !visited.has(to)) continue;
        const g2 = geom(model.nodes[to], VW, VH, st.zoom); if (!g2) continue;
        ctx.beginPath(); ctx.moveTo(g1.x + g1.w / 2, g1.y + g1.h / 2); ctx.lineTo(g2.x + g2.w / 2, g2.y + g2.h / 2); ctx.stroke(); } }
    }
    let hoverNode = null;
    const drawList = [];
    if (st.zoom != null) {
      for (const n of model.nodes) { const g = geom(n, VW, VH, st.zoom); if (!g) continue; drawList.push({ n, g }); }
      drawList.sort((a, b) => a.g.x - b.g.x || a.g.y - b.g.y);
    }
    const labelEnd = {};   // fila → hasta dónde llegó la última etiqueta escrita
    for (const { n, g } of drawList) {
      const seen = visited.has(n.i);
      if (n.secret && !seen) continue;                                     // los secretos no existen hasta descubrirlos
      const isCur = st.current === n.i && !st.sub;
      const hov = st.mx >= g.x && st.mx <= g.x + g.w && st.my >= g.y && st.my <= g.y + g.h;
      if (hov) hoverNode = { n, g };
      // marcadores del nodo: iconos del modelo (si visitaste) + quests ancladas ACÁ (SIEMPRE — te guían; 🔒 solo al hover)
      const mk = seen ? iconsOf(n) : [];
      const qs = (qAt[n.i] || []).map(e => questMark(e, st));
      const vis = mk.concat(qs.filter(q => q !== '🔒'));
      const hasStar = qs.includes('⭐');
      // pisos con contenido: fondo tenue (en zoom, más notorio) — "los pisos importantes SE VEN"
      if (seen && (vis.length || hasStar)) { ctx.fillStyle = st.zoom == null ? 'rgba(80,140,220,0.07)' : 'rgba(80,140,220,0.12)'; ctx.fillRect(g.x, g.y, g.w, g.h); }
      const col = isCur ? '#ffd54f' : hasStar ? '#ffe27a' : seen ? (n.i === 0 ? '#7fd0ff' : '#5a8cc8') : 'rgba(90,110,140,0.35)';
      ctx.strokeStyle = col; ctx.lineWidth = isCur || hov ? 2 : 1;
      ctx.strokeRect(g.x + 0.5, g.y + 0.5, g.w, g.h);
      if (st.stormed && n.room.collapsesOnStorm) { ctx.fillStyle = 'rgba(180,40,40,0.18)'; ctx.fillRect(g.x, g.y, g.w, g.h); }
      ctx.fillStyle = seen ? '#cfe0f0' : 'rgba(140,160,190,0.55)'; ctx.font = (isCur ? 'bold ' : '') + '9px monospace'; ctx.textAlign = 'left';
      const label = (typeof TX !== 'undefined' ? TX(n.name) : n.name);   // el barrio se CONOCE: fog = atenuado, no '???' (v296)
      // en ZOOM: etiqueta de PISO a la izquierda de la barra + nombre + marcadores GRANDES a la derecha, afuera
      if (typeof st.zoom === 'number' || st.zoom === 'ss') {
        const lv = n.level || 0;
        if (!(st.zoom === 'ss' && (n.ssSib || 0) > 0)) {   // la etiqueta S/P va solo en la primera de la fila
          ctx.fillStyle = '#8fa8c8'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'right';
          ctx.fillText(lv === 0 ? '—' : (lv > 0 ? 'P' + lv : 'S' + (-lv)), g.x - 8, g.y + g.h / 2 + 3);
        }
        ctx.fillStyle = seen ? '#cfe0f0' : 'rgba(140,160,190,0.5)'; ctx.font = (isCur ? 'bold ' : '') + '11px monospace'; ctx.textAlign = 'left';
        ctx.fillText(String(label).slice(0, Math.floor(g.w / 7)), g.x + 5, g.y + g.h / 2 + 4);
        // a la derecha del piso: iconos del modelo + cada QUEST con su NOMBRE (⭐ dorada · ✅ verde), apiladas
        let rx = g.x + g.w + 8;
        if (seen && mk.length) { ctx.font = '13px monospace'; ctx.textAlign = 'left'; ctx.fillText(mk.join(' '), rx, g.y + g.h / 2 + 5); rx += mk.length * 20 + 4; }
        if (seen) {
          const qe = (qAt[n.i] || []).map(e => ({ e, q: questMark(e, st) })).filter(x => x.q !== '🔒');
          const maxQ = Math.max(1, Math.floor((g.h - 4) / 13));
          qe.sort((a, b) => (a.q === '⭐' ? -1 : 1) - (b.q === '⭐' ? -1 : 1));   // las ⭐ primero
          qe.slice(0, maxQ).forEach((x, k) => {
            ctx.font = (x.q === '⭐' ? 'bold ' : '') + '10px monospace'; ctx.textAlign = 'left';
            ctx.fillStyle = x.q === '⭐' ? '#ffe27a' : '#9be8a0';
            const extra = (k === maxQ - 1 && qe.length > maxQ) ? '  +' + (qe.length - maxQ) : '';
            const espacio = (VW - rx - 8) / 6 - extra.length;
            ctx.fillText(x.q + ' ' + String(questTitle(x.e)).slice(0, Math.max(12, Math.floor(espacio))) + extra, rx, g.y + 11 + k * 13);
          });
        }
      } else {
        const rkey = String(model.rowOf[n.level] || 0);
        const txt = String(label).slice(0, Math.floor(g.w / 5.6));
        if (n.i === 0 || g.x + 3 >= (labelEnd[rkey] || -1)) {   // sin lugar = sin etiqueta (el hover la nombra)
          ctx.fillText(txt, g.x + 3, g.y + g.h / 2 + 3);
          labelEnd[rkey] = g.x + 3 + txt.length * 5.5 + 6;
        }
        if (vis.length) { ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.fillText(vis.slice(0, 4).join(''), g.x + g.w - 2, g.y + g.h - 2); }
      }
      // ESTÁS ACÁ: punto que late, en tu x real dentro de la barra
      if (isCur) { const bx = g.x + (st.px01 || 0.5) * g.w, by = g.y + g.h / 2;
        ctx.fillStyle = 'rgba(255,213,79,' + (0.6 + 0.4 * Math.sin((st.t || 0) * 6)) + ')'; ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillText(T('g.mapa.aca'), bx, g.y - 3); }
    }
    // PUERTAS de la calle sin sala (el súper): cajita colgada de la barra de la calle en su X real (v296)
    if (st.zoom == null && model.puertas && model.puertas.length) {   // colgantes (el súper) bajo la calle, en su x real
      const TILE2 = (typeof Level !== 'undefined' && Level.TILE) || 32;
      const padL = PADL(VW), sx = (VW - padL - PADR) / model.streetW;
      const sy = Math.round(VH * 0.55) + 24;                          // borde inferior de la banda de la calle
      for (const pd of model.puertas) {
        const px = padL + (pd.x / TILE2) * sx;
        const qs = (qAt[0] || []).filter(e => /super|chino/i.test(String(e.at))).map(e => questMark(e, st)).filter(q => q !== '🔒');
        ctx.strokeStyle = '#4a7a5a'; ctx.setLineDash([2, 2]);
        ctx.strokeRect(px - 10, sy + 2, 20, 13); ctx.setLineDash([]);
        ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#8fc8a0';
        ctx.fillText(pd.emoji + (qs.length ? qs[0] : ''), px, sy + 12);
      }
    }
    // sub-modos como nodos colgados — en sus COLUMNAS reservadas (no pisan la calle ni los subsuelos)
    SUBMODES.forEach((sm) => {
      if (st.zoom != null) return;   // solo en MANZANA
      const padL = PADL(VW);
      const base = Math.round(VH * 0.55);
      const x = sm.anchor === 'left' ? Math.max(8, padL - 116) : VW - PADR + 10;
      const y = sm.anchor === 'left' ? base - sm.level * 26 : 56 + sm.level * 26;
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
    // tooltip del hover (banda de abajo) — acá SÍ se ven las 🔒 ("se destraba más adelante")
    if (hoverBox) {
      const b = hoverBox.bx.b;
      const lines = [];
      lines.push(b.name + '  ·  ×' + b.floors + '  ·  🔦 ' + hoverBox.v + '/' + b.floors + '  ·  ' + T('g.mapa.click'));
      for (const i of b.rooms) for (const e of (qAt[i] || [])) {
        const q = questMark(e, st);
        if (q === '⭐') { const h = e.hints && e.hints[(typeof I18n !== 'undefined' && I18n.short && I18n.short()) || 'es']; lines.push('⭐ ' + ((h && h[0]) || questTitle(e))); }
        else if (q === '✅') lines.push('✅ ' + questTitle(e));
      }
      if (hoverBox.hasLock) lines.push('?? ' + T('g.mapa.algoOculto'));
      const bh = 16 + lines.length * 14;
      ctx.fillStyle = 'rgba(4,8,14,0.94)'; ctx.fillRect(0, VH - bh, VW, bh);
      ctx.strokeStyle = '#2a4a6a'; ctx.strokeRect(0.5, VH - bh + 0.5, VW - 1, bh - 1);
      ctx.textAlign = 'left'; lines.forEach((ln, i) => { ctx.fillStyle = i === 0 ? '#ffd54f' : '#cfe0f0'; ctx.font = (i === 0 ? 'bold ' : '') + '11px monospace'; ctx.fillText(String(ln).slice(0, 110), 10, VH - bh + 15 + i * 14); });
    }
    if (hoverNode) {
      const { n } = hoverNode, seen = visited.has(n.i);
      const lines = [];
      lines.push((typeof TX !== 'undefined' ? TX(n.name) : n.name) + (n.level ? '  ·  ' + (n.level > 0 ? T('g.mapa.piso', { n: n.level }) : T('g.mapa.sub', { n: -n.level })) : '') + '  ·  ' + T('g.mapa.click'));
      if (seen) { const mk = iconsOf(n); if (mk.length) lines.push(mk.join(' ')); }
      for (const e of (qAt[n.i] || [])) {
        const q = questMark(e, st);
        if (q === '⭐') { const h = e.hints && e.hints[(typeof I18n !== 'undefined' && I18n.short && I18n.short()) || 'es']; lines.push('⭐ ' + ((h && h[0]) || questTitle(e))); }
        else lines.push(q + ' ' + questTitle(e) + (q === '🔒' ? ' — ' + T('g.mapa.locked') : ''));
      }
      // puerta de la calle bajo el mouse (el súper): mostrala
      if (n.i === 0 && model.puertas) {
        const TILE2 = (typeof Level !== 'undefined' && Level.TILE) || 32;
        const padL = PADL(VW), sx = (VW - padL - PADR) / model.streetW;
        for (const pd of model.puertas) { const px = padL + (pd.x / TILE2) * sx; if (Math.abs(st.mx - px) < 14) { lines.push(pd.emoji + ' ' + pd.label); break; } }
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
