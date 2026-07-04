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

  // EL SUBTE (specs/subte.md, preview v306): líneas REALES con ≥2 estaciones cerca de Florida y Lavalle.
  // DATA pura: cada línea = { id, color real, estaciones en orden, cuáles están CERCA de la zona del juego }.
  // Datos REALES por línea (año de inauguración, recorrido, pasajeros/día aprox) + año de las estaciones clave.
  const SUBTE_DATA = {
    B: { anio: 1930, km: '11,8', pax: '~330.000' },
    C: { anio: 1934, km: '4,4', pax: '~200.000' },
    D: { anio: 1937, km: '10,4', pax: '~310.000' },
  };
  const EST_ANIO = { Florida: 1930, Lavalle: 1936, 'San Martín': 1936, Retiro: 1936, Catedral: 1937, '9 de Julio': 1937 };
  const SUBTE = [
    { id: 'C', color: '#1f6cb5', name: 'Línea C · Retiro–Constitución',
      ests: ['Retiro', 'San Martín', 'Lavalle', 'Diagonal Norte', 'Av. de Mayo', 'Moreno', 'Independencia', 'San Juan', 'Constitución'],
      cerca: ['San Martín', 'Lavalle', 'Diagonal Norte'] },
    { id: 'B', color: '#e2231a', name: 'Línea B · bajo Av. Corrientes',
      ests: ['L. N. Alem', 'Florida', 'C. Pellegrini', 'Uruguay', 'Callao'],
      cerca: ['L. N. Alem', 'Florida', 'C. Pellegrini'] },
    { id: 'D', color: '#00a54f', name: 'Línea D · Catedral–Congreso de Tucumán',
      ests: ['Catedral', '9 de Julio', 'Tribunales', 'Callao', 'Facultad de Medicina'],
      cerca: ['Catedral', '9 de Julio'] },
  ];

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
            n.anchor = nodes[to].anchor; n.level = nodes[to].level - 1; n.parent = to; n.adopted = true; break; } } }
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
        if (!cands.length) {   // sub-modos sin sala: si matchea una PUERTA de calle (el súper) → su cajón; si no, la calle
          if ((model.puertas || []).some(pd => pd.id === a)) { (at['door:' + a] = at['door:' + a] || []).push(e); }
          else { (at[0] = at[0] || []).push(e); }
          continue;
        }
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
      if (ns.every(n => n.secret && n.adopted)) continue;   // bolsillo secreto por teleport (telohab) → no es un edificio
      const entr = ns.slice().sort((a, b) => Math.abs(a.level) - Math.abs(b.level))[0];
      const bname = String(entr.name).split(/\s+[—-]\s+/)[0].trim() || String(entr.name);
      model.buildings.push({ anchor: +k, rooms: idxs, up: ns.some(n => n.level >= 0), name: bname,
        floors: idxs.length, entrance: entr.i });
    }
    for (const pd of (model.puertas || [])) model.buildings.push({
      anchor: pd.x / TILE, rooms: [], floors: 0, entrance: -1, up: true, puerta: true, doorId: pd.id, emoji: pd.emoji,
      name: (pd.emoji + ' ' + String(pd.label || pd.id).replace(/^(entrar|bajar)\s+(a|al|a la)\s+/i, '')).trim(),
    });
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
    if (typeof zoomAnchor === 'number') { w = VW * 0.44; x = Math.max(70, (VW - w) / 2 - VW * 0.06); }
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
    // slot por POSICIÓN REAL en la calle (orientación espacial: oeste→este se conserva);
    // si el slot ideal está tomado, prueba el más cercano libre en la fila y después la otra fila
    const flow = (list, yBase, rowStep) => {
      const avail = VW - padL - padR;
      const perRow = Math.max(2, Math.floor(avail / 118));
      const slotW = avail / perRow;
      const taken = {};   // 'fila:slot' → true
      let maxRow = 0;
      for (const b of list) {
        const ideal = Math.max(0, Math.min(perRow - 1, Math.round((b.anchor / m.streetW) * (perRow - 1))));
        // la COLUMNA es la posición real en la calle: primero al lado (±1) en la fila baja, después APILA
        // en la misma columna (orientación espacial: lo del este queda al este aunque suba de fila)
        const cands = [];
        for (let r = 0; r < 5; r++) { cands.push([r, ideal]); if (r === 0) { if (ideal + 1 < perRow) cands.push([0, ideal + 1]); if (ideal - 1 >= 0) cands.push([0, ideal - 1]); } }
        let placed = null;
        for (const [r, c] of cands) if (!taken[r + ':' + c]) { placed = { r, c }; break; }
        if (!placed) placed = { r: 0, c: ideal };
        taken[placed.r + ':' + placed.c] = true; maxRow = Math.max(maxRow, placed.r);
        out.push({ b, x: padL + placed.c * slotW + 4, y: yBase + placed.r * 64 * rowStep, w: slotW - 8, h: 56, row: placed.r });
      }
      return maxRow + 1;
    };
    const streetY = Math.round(VH * 0.55);
    // superficie: las filas crecen hacia ARRIBA desde la calle (fila 0 pegada a la calle = orientación)
    const surfBoxes = [];
    {
      const availRows = flow(surf, 0, 1);   // asigna filas 0..n
      for (const bx of out) bx.y = streetY - 70 - bx.row * 64;
    }
    if (under.length) {   // compuerta ÚNICA a los subsuelos (el detalle vive en su pestaña)
      const a = under[0].anchor;
      const gx = Math.max(padL, Math.min(VW - padR - 170, padL + (a / m.streetW) * (VW - padL - padR) - 85));
      out.push({ gateway: true, x: gx, y: streetY + 34, w: 170, h: 46,
        b: { anchor: a, rooms: under.flatMap(u => u.rooms), floors: under.reduce((t, u) => t + u.floors, 0), name: '', up: false } });
    }
    return { boxes: out, streetY };
  }

  // SKYLINE (v301, "la cuadra en perspectiva"): silueta por edificio — x real, ALTURA = pisos. Menos detalle,
  // hover = etiqueta flotante, click = zoom. Compartida por draw y hitTest.
  function skyBoxes(VW, VH) {
    const m = model; if (!m || !m.buildings) return { boxes: [] };
    const padL = 60, padR = 60;
    const streetY = Math.round(VH * 0.62);
    const avail = VW - padL - padR;
    const surf = m.buildings.filter(b => b.up), under = m.buildings.filter(b => !b.up);
    const maxF = Math.max(...surf.map(b => b.floors), 1);
    const hUnit = Math.max(6, Math.min(16, (streetY - 96) / maxF));
    const boxes = [];
    // SOLVER 1D (v302): anchos capeados para que ENTREN TODOS + barrido L→R y R→L → cero solapes, orden real
    const sorted = surf.slice().sort((a, b) => a.anchor - b.anchor);
    const GAP = 6;
    const maxW = Math.max(24, (avail - GAP * (sorted.length + 1)) / Math.max(1, sorted.length));
    const sboxes = sorted.map(b => {
      const entr = m.nodes[b.entrance];   // las PUERTAS sin sala (el chino) no tienen entrance → ancho chico fijo
      const w = Math.max(24, Math.min(maxW, ((entr && entr.w) || 16) * (avail / m.streetW) * 0.85));
      return { b, w, x: padL + (b.anchor / m.streetW) * avail - w / 2 };
    });
    for (let i = 0; i < sboxes.length; i++) { const p = sboxes[i - 1]; sboxes[i].x = Math.max(i ? p.x + p.w + GAP : padL, sboxes[i].x); }
    for (let i = sboxes.length - 1; i >= 0; i--) { const nx = sboxes[i + 1]; const lim = (nx ? nx.x - GAP : VW - padR) - sboxes[i].w; sboxes[i].x = Math.min(sboxes[i].x, lim); sboxes[i].x = Math.max(padL, sboxes[i].x); }
    for (const sb of sboxes) { const h = Math.max(18, sb.b.floors * hUnit); boxes.push({ b: sb.b, x: sb.x, y: streetY - h, w: sb.w, h, up: true }); }
    if (under.length) {   // compuerta única ⛏️ a los subsuelos (como en la manzana)
      const a = under[0].anchor, w = 150;
      let x = padL + (a / m.streetW) * avail - w / 2; x = Math.max(padL, Math.min(VW - padR - w, x));
      boxes.push({ gateway: true, x, y: streetY + 16, w, h: 34,
        b: { anchor: a, rooms: under.flatMap(u => u.rooms), floors: under.reduce((t, u) => t + u.floors, 0), name: '', up: false } });
    }
    return { boxes, streetY, hUnit, padL, padR };
  }

  // qué hay bajo el mouse: pestaña de vista, o edificio/nodo (CLICK = zoom). Devuelve { tab } | { anchor } | null.
  function hitTest(VW, VH, st) {
    if (!model) return null;
    if (st.my >= 30 && st.my <= 48) {                                        // pestañas [CUADRA] [MANZANA] [SUBSUELOS]
      if (st.mx >= 10 && st.mx <= 106) return { tab: 'sky' };
      if (st.mx >= 112 && st.mx <= 208) return { tab: 'manzana' };
      if (st.mx >= 214 && st.mx <= 310) return { tab: 'ss' };
      if (st.mx >= 316 && st.mx <= 412) return { tab: 'subte' };
    }
    if (st.zoom === 'subte') return null;                                    // subte: solo pestañas (hover en el draw)
    if (st.zoom === 'sky') {                                                 // siluetas del skyline
      const sk = skyBoxes(VW, VH);
      for (const bx of sk.boxes) if (st.mx >= bx.x && st.mx <= bx.x + bx.w && st.my >= bx.y && st.my <= bx.y + bx.h)
        return bx.up ? { anchor: bx.b.anchor } : { tab: 'ss' };
      return null;
    }
    if (st.zoom == null) {                                                   // vista general: cajones por edificio
      const ov = overviewBoxes(VW, VH);
      for (const bx of (ov.boxes || [])) {
        if (st.mx >= bx.x && st.mx <= bx.x + bx.w && st.my >= bx.y && st.my <= bx.y + bx.h) {
          if (bx.b.puerta) return null;                                      // la puerta del chino: sub-modo, sin zoom
          return bx.b.up ? { anchor: bx.b.anchor } : { tab: 'ss' };
        }
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

  // dibuja EL SUBTE (preview): plano esquemático estilo mapa de subte con las líneas reales de la zona
  function drawSubte(ctx, VW, VH, st) {
    const top = 108, bot = VH - 104, cx = VW * 0.46;
    const C = SUBTE[0], B = SUBTE[1], D = SUBTE[2];
    const stepC = (bot - top) / (C.ests.length - 1);
    const yB = top + stepC * 2 + 24, xB0 = VW * 0.72, stepB = (VW * 0.5) / (B.ests.length - 1);
    const nD = 4;                                                            // D recortada: no pisa las pestañas
    const yD0 = top + stepC * 3.2, xD0 = cx + 56;
    const stepD = Math.min(90, (yD0 - top - 6) / ((nD - 1) * 0.52));
    const pt = { C: i => ({ x: cx, y: top + i * stepC }), B: i => ({ x: xB0 - i * stepB, y: yB }), D: i => ({ x: xD0 - i * stepD * 0.86, y: yD0 - i * stepD * 0.52 }) };
    const JUEGO = { Florida: 'B', Lavalle: 'C', Catedral: 'D' };             // las 3 jugables (§2.5 del SDD)
    for (const [L, p, n] of [[C, pt.C, C.ests.length], [B, pt.B, B.ests.length], [D, pt.D, nD]]) {
      ctx.strokeStyle = L.color; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); const a = p(0); ctx.moveTo(a.x, a.y); const z = p(n - 1); ctx.lineTo(z.x, z.y); ctx.stroke();
      const h0 = p(0);
      ctx.fillStyle = L.color; ctx.beginPath(); ctx.arc(h0.x, h0.y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText(L.id, h0.x, h0.y + 4);
    }
    ctx.lineCap = 'butt';
    const puntos = [];   // para el hover con DATOS de la estación
    for (const [L, p, n] of [[C, pt.C, C.ests.length], [B, pt.B, B.ests.length], [D, pt.D, nD]]) {
      L.ests.slice(0, n).forEach((e, i) => {
        const q = p(i), near = L.cerca.includes(e), game = JUEGO[e] === L.id;
        puntos.push({ e, L, q, game });
        if (game) { ctx.strokeStyle = 'rgba(255,213,79,' + (0.5 + 0.5 * Math.sin((st.t || 0) * 5)) + ')'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(q.x, q.y, 9, 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q.x, q.y, near ? 5 : 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = L.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, near ? 5 : 3, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = game ? '#ffd54f' : near ? '#ffe9b0' : 'rgba(160,180,205,0.55)'; ctx.font = ((near || game) ? 'bold ' : '') + '9px monospace';
        const label2 = game ? '🚉 ' + e : e;
        if (L === C) { ctx.textAlign = 'left'; ctx.fillText(label2, q.x + 12, q.y + 3); }
        else if (L === D) { if (i === 0) { ctx.textAlign = 'left'; ctx.fillText(label2, q.x + 12, q.y + 14); } else { ctx.textAlign = 'right'; ctx.fillText(label2, q.x - 10, q.y + 3); } }
        else { ctx.textAlign = 'center'; ctx.fillText(label2, q.x, q.y - 10); }
      });
    }
    // HOVER de estación: tarjeta con datos reales (año, línea, recorrido, pax/día) + tus stats si es jugable
    let hovEst = null, hd = 14;
    for (const c2 of puntos) { const d2 = Math.hypot(st.mx - c2.q.x, st.my - c2.q.y); if (d2 < hd) { hd = d2; hovEst = c2; } }
    if (hovEst) {
      const dat = SUBTE_DATA[hovEst.L.id] || {};
      const anio = EST_ANIO[hovEst.e] || dat.anio;
      const lines = [
        '🚉 ' + hovEst.e + ' — ' + T('g.mapa.estLinea', { l: hovEst.L.id, a: anio }),
        T('g.mapa.estRecorrido', { km: dat.km }) + ' · ' + T('g.mapa.estPax', { p: dat.pax }),
      ];
      if (hovEst.game) {
        const sst = (st.subteStats && st.subteStats[hovEst.e]) || { usos: 0, gasto: 0 };
        lines.push(T('g.mapa.estTuyo', { n: sst.usos || 0, g: sst.gasto || 0 }));
      }
      const tw = Math.max(...lines.map(l => l.length)) * 6.2 + 14;
      const tx2 = Math.min(VW - tw - 6, st.mx + 14), ty2 = Math.max(56, st.my - 14 - lines.length * 13);
      ctx.fillStyle = 'rgba(4,8,14,0.95)'; ctx.fillRect(tx2, ty2, tw, 10 + lines.length * 13);
      ctx.strokeStyle = hovEst.L.color; ctx.lineWidth = 1.5; ctx.strokeRect(tx2 + 0.5, ty2 + 0.5, tw, 10 + lines.length * 13);
      ctx.textAlign = 'left';
      lines.forEach((ln, k) => { ctx.fillStyle = k === 0 ? '#ffe9b0' : '#cfe0f0'; ctx.font = (k === 0 ? 'bold ' : '') + '10px monospace'; ctx.fillText(ln, tx2 + 7, ty2 + 15 + k * 13); });
    }
    // ⭐ la esquina del juego
    const gx = cx + 96, gy = pt.C(2).y - 30;
    ctx.fillStyle = 'rgba(255,213,79,' + (0.7 + 0.3 * Math.sin((st.t || 0) * 5)) + ')';
    ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
    ctx.fillText('⭐ ' + T('g.mapa.subteAca'), gx, gy);
    // PANEL de info: las 3 estaciones del juego (decisión §2.5)
    const px2 = VW - 268, py2 = VH - 152, pw2 = 254, ph2 = 96;
    ctx.fillStyle = 'rgba(6,12,20,0.92)'; ctx.fillRect(px2, py2, pw2, ph2);
    ctx.strokeStyle = '#3a5a80'; ctx.strokeRect(px2 + 0.5, py2 + 0.5, pw2, ph2);
    ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
    ctx.fillText(T('g.mapa.subteInfoT'), px2 + 8, py2 + 15);
    ctx.font = '9px monospace';
    [[T('g.mapa.subteInfo1'), '#e2231a'], [T('g.mapa.subteInfo2'), '#1f6cb5'], [T('g.mapa.subteInfo3'), '#00a54f'], [T('g.mapa.subteInfo4'), null]].forEach(([ln, col], k) => {
      if (col) { ctx.fillStyle = col; ctx.fillRect(px2 + 8, py2 + 24 + k * 15, 10, 4); }
      ctx.fillStyle = k === 3 ? '#9be8a0' : '#cfe0f0'; ctx.fillText(String(ln).slice(0, 38), px2 + (col ? 24 : 8), py2 + 29 + k * 15);
    });
    // leyenda + PREVIEW
    SUBTE.forEach((L, k) => { ctx.fillStyle = L.color; ctx.fillRect(14, VH - 86 + k * 13, 18, 5);
      ctx.fillStyle = 'rgba(200,215,235,0.8)'; ctx.font = '9px monospace'; ctx.textAlign = 'left'; ctx.fillText(L.name, 38, VH - 80 + k * 13); });
    ctx.fillStyle = 'rgba(150,170,200,0.5)'; ctx.fillText(T('g.mapa.subteOtras'), 14, VH - 86 + 3 * 13 + 4);
    ctx.save(); ctx.translate(VW - 92, 104); ctx.rotate(-0.18);
    ctx.strokeStyle = 'rgba(255,213,79,0.7)'; ctx.lineWidth = 2; ctx.strokeRect(-64, -16, 128, 30);
    ctx.fillStyle = 'rgba(255,213,79,0.85)'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    ctx.fillText('PREVIEW', 0, -1); ctx.font = '8px monospace'; ctx.fillText(T('g.mapa.subtePronto'), 0, 10);
    ctx.restore();
  }

  // dibuja el SKYLINE ("la cuadra"): siluetas en perspectiva, hover = etiqueta flotante
  function drawSky(ctx, VW, VH, st, qAt, visited) {
    const sk = skyBoxes(VW, VH);
    const sy = sk.streetY;
    // la calle (ruta con línea punteada al medio)
    ctx.fillStyle = '#101722'; ctx.fillRect(0, sy, VW, 14);
    ctx.strokeStyle = 'rgba(255,213,79,0.5)'; ctx.setLineDash([10, 8]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, sy + 7); ctx.lineTo(VW, sy + 7); ctx.stroke(); ctx.setLineDash([]);
    // Obelisco de fondo a la izquierda (el sub-modo, del catálogo)
    ctx.strokeStyle = '#4a7a5a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(24, sy); ctx.lineTo(30, sy - 74); ctx.lineTo(36, sy); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#8fc8a0'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('✊', 30, sy - 80);
    let hover = null;
    const curB = model.nodes[st.current];
    // torres ALTAS primero (quedan atrás), locales al frente — con cara lateral (perspectiva)
    const orden = sk.boxes.slice().sort((a, b) => b.h - a.h);
    for (const bx of orden) {
      const b = bx.b;
      const v = b.rooms.filter(i => visited.has(i)).length;
      const qs = []; for (const i of b.rooms) for (const e of (qAt[i] || [])) qs.push(questMark(e, st));
      if (b.puerta) for (const e of (qAt['door:' + b.doorId] || [])) qs.push(questMark(e, st));   // quests del sub-modo (megadrive/sube→súper)
      const star = qs.includes('⭐'), lock = qs.includes('🔒');
      const iCur = curB && Math.round(curB.anchor) === b.anchor && st.current !== 0 && !st.sub;
      const hov = st.mx >= bx.x && st.mx <= bx.x + bx.w && st.my >= bx.y && st.my <= bx.y + bx.h;
      if (hov) hover = { bx, v, qs };
      const alpha = 0.14 + 0.4 * (v / Math.max(1, b.floors));
      // cara lateral (extrusión: "de costado en perspectiva")
      ctx.fillStyle = 'rgba(40,60,95,' + (alpha * 0.8) + ')';
      ctx.beginPath(); ctx.moveTo(bx.x + bx.w, bx.y); ctx.lineTo(bx.x + bx.w + 7, bx.y - 5);
      ctx.lineTo(bx.x + bx.w + 7, bx.y + bx.h - 5); ctx.lineTo(bx.x + bx.w, bx.y + bx.h); ctx.closePath(); ctx.fill();
      // frente
      ctx.fillStyle = 'rgba(70,110,170,' + alpha + ')'; ctx.fillRect(bx.x, bx.y, bx.w, bx.h);
      ctx.strokeStyle = iCur ? '#ffd54f' : star ? '#ffe27a' : hov ? '#9fc8ff' : 'rgba(110,150,200,0.55)';
      ctx.lineWidth = iCur || hov ? 2 : 1; ctx.strokeRect(bx.x + 0.5, bx.y + 0.5, bx.w, bx.h);
      // líneas de pisos (detalle mínimo)
      if (bx.up && b.floors > 1) { ctx.strokeStyle = 'rgba(120,160,220,0.14)'; ctx.lineWidth = 1;
        const step = bx.h / b.floors;
        for (let k = 1; k < Math.min(b.floors, 24); k++) { ctx.beginPath(); ctx.moveTo(bx.x + 2, bx.y + k * step); ctx.lineTo(bx.x + bx.w - 2, bx.y + k * step); ctx.stroke(); } }
      // señales mínimas: ⭐ latiendo arriba / ?? / dónde estás
      if (star) { ctx.fillStyle = 'rgba(255,226,122,' + (0.6 + 0.4 * Math.sin((st.t || 0) * 5)) + ')'; ctx.font = '11px monospace'; ctx.textAlign = 'center'; ctx.fillText('⭐', bx.x + bx.w / 2, bx.y - 4); }
      else if (lock) { ctx.fillStyle = 'rgba(150,170,200,0.7)'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText(st.facil ? '🔒' : '??', bx.x + bx.w / 2, bx.y - 4); }
      if (iCur) { ctx.fillStyle = 'rgba(255,213,79,' + (0.6 + 0.4 * Math.sin((st.t || 0) * 6)) + ')'; ctx.beginPath(); ctx.arc(bx.x + bx.w / 2, bx.y + bx.h / 2, 4, 0, Math.PI * 2); ctx.fill(); }
      bx._v = v;   // para el pase de nombres
      // los de CINETOP (bodegón/telo) como cartelitos en la azotea del cine
      if (bx.up && /cine/i.test(b.name)) {
        SUBMODES.filter(x => x.anchor === 'cinetop').forEach((x2, k) => {
          ctx.fillStyle = st.sub === x2.id ? '#ffe9b0' : '#8fc8a0'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
          ctx.fillText('· ' + x2.name.replace(/^El /, ''), bx.x + 2, bx.y - 14 - k * 10);
        });
      }
    }
    // nombres de BASE con presupuesto (ordenados por x; si no entra, no se escribe — el hover lo da)
    {
      let upEnd = -1, dnEnd = -1;
      for (const bx of sk.boxes.slice().sort((a, b2) => a.x - b2.x)) {
        const name = (bx.gateway ? T('g.mapa.tabSS') : String(bx.b.name)).slice(0, Math.max(4, Math.floor(bx.w / 5.5)));
        const cx = bx.x + bx.w / 2, half = name.length * 2.6;
        const end = bx.up ? upEnd : dnEnd;
        if (cx - half < end + 4) continue;
        ctx.fillStyle = (bx._v ? 'rgba(210,228,245,0.85)' : 'rgba(150,170,195,0.5)'); ctx.font = '8px monospace'; ctx.textAlign = 'center';
        ctx.fillText(name, cx, bx.y + bx.h - 4);
        if (bx.up) upEnd = cx + half; else dnEnd = cx + half;
      }
    }
    // estás en la CALLE: punto sobre la ruta
    if (st.current === 0 && !st.sub) { const px = 60 + (st.px01 || 0.5) * (VW - 120);
      ctx.fillStyle = 'rgba(255,213,79,' + (0.6 + 0.4 * Math.sin((st.t || 0) * 6)) + ')'; ctx.beginPath(); ctx.arc(px, sy + 7, 4, 0, Math.PI * 2); ctx.fill(); }
    // hover: etiqueta FLOTANTE al lado del mouse (poco más de info; el click abre el detalle)
    if (hover) {
      const b = hover.bx.b;
      const done = hover.qs.filter(q => q === '✅').length, stars = hover.qs.filter(q => q === '⭐').length;
      const locks = hover.qs.filter(q => q === '🔒').length;
      const txt = b.name.slice(0, 24) + '  ×' + b.floors + ' 🔦' + hover.v + '/' + b.floors +
        (done ? ' ✅' + done : '') + (stars ? ' ⭐' + stars : '') + (locks ? (st.facil ? ' 🔒' + locks : ' ??') : '');
      const tw = txt.length * 6.2 + 12;
      const tx2 = Math.min(VW - tw - 4, st.mx + 12), ty2 = Math.max(34, st.my - 26);
      ctx.fillStyle = 'rgba(4,8,14,0.95)'; ctx.fillRect(tx2, ty2, tw, 18);
      ctx.strokeStyle = '#2a4a6a'; ctx.strokeRect(tx2 + 0.5, ty2 + 0.5, tw, 18);
      ctx.fillStyle = '#ffe9b0'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
      ctx.fillText(txt, tx2 + 6, ty2 + 13);
    }
    return hover;
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
      if (b.puerta) for (const e of (qAt['door:' + b.doorId] || [])) qs.push(questMark(e, st));   // las quests del sub-modo (megadrive→súper)
      const nDone = qs.filter(q => q === '✅').length, nStar = qs.filter(q => q === '⭐').length, hasLock = qs.includes('🔒');
      const iCur = curB && Math.round(curB.anchor) === b.anchor && st.current !== 0 && !st.sub;
      const hov = st.mx >= bx.x && st.mx <= bx.x + bx.w && st.my >= bx.y && st.my <= bx.y + bx.h;
      if (hov) hover = { bx, v, nDone, nStar, hasLock };
      if (v || nStar) { ctx.fillStyle = 'rgba(80,140,220,' + (nStar ? 0.14 : 0.07) + ')'; ctx.fillRect(bx.x, bx.y, bx.w, bx.h); }
      ctx.strokeStyle = iCur ? '#ffd54f' : nStar ? '#ffe27a' : v ? '#5a8cc8' : 'rgba(90,110,140,0.4)';
      ctx.lineWidth = iCur || hov ? 2 : 1;
      ctx.strokeRect(bx.x + 0.5, bx.y + 0.5, bx.w, bx.h);
      // su PUERTA en la calle: tick ▾ siempre (orientación); la línea completa solo al hover (sin telaraña)
      const doorX = padL + Math.max(0, Math.min(1, b.anchor / model.streetW)) * (VW - padL - padR);
      ctx.strokeStyle = hov ? 'rgba(255,213,79,0.7)' : 'rgba(90,140,200,0.55)'; ctx.lineWidth = hov ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(doorX, b.up ? sy - 4 : sy + 24); ctx.lineTo(doorX, b.up ? sy : sy + 28); ctx.stroke();
      if (hov) { ctx.strokeStyle = 'rgba(255,213,79,0.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(bx.x + bx.w / 2, b.up ? bx.y + bx.h : bx.y); ctx.lineTo(doorX, b.up ? sy : sy + 24); ctx.stroke(); }
      // contenido: nombre / pisos+descubierto / hitos (las PUERTAS y la COMPUERTA tienen su formato)
      const title2 = bx.gateway ? T('g.mapa.tabSS') : String(b.name);
      ctx.fillStyle = bx.gateway ? '#9be8a0' : v ? '#cfe0f0' : 'rgba(140,160,190,0.6)'; ctx.font = (iCur || bx.gateway ? 'bold ' : '') + '10px monospace'; ctx.textAlign = 'left';
      ctx.fillText(title2.slice(0, Math.floor((bx.w - 8) / 6)), bx.x + 4, bx.y + 14);
      ctx.font = '9px monospace'; ctx.fillStyle = v ? '#8fa8c8' : 'rgba(120,140,170,0.55)';
      if (!b.puerta) ctx.fillText('×' + b.floors + '  🔦' + v + '/' + b.floors, bx.x + 4, bx.y + 28);
      else ctx.fillText(T('g.mapa.enLaCalle'), bx.x + 4, bx.y + 28);
      const nLock = qs.filter(q => q === '🔒').length;
      const marks = (nDone ? '✅' + nDone + ' ' : '') + (nStar ? '⭐' + nStar + ' ' : '') + (hasLock ? (st.facil ? '🔒' + nLock + ' ' : '?? ') : '');
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
    ctx.fillText('🗺️ ' + (typeof st.zoom === 'number' ? T('g.mapa.zoomTitle') : st.zoom === 'ss' ? T('g.mapa.ssTitle') : st.zoom === 'sky' ? T('g.mapa.skyTitle') : st.zoom === 'subte' ? T('g.mapa.subteTitle') : T('g.mapa.title')), 10, 20);
    ctx.textAlign = 'right'; ctx.fillStyle = '#9be8a0'; ctx.font = '10px monospace';
    ctx.fillText((st.online ? '👥 ' + st.online + ' · ' : '') + T('g.mapa.hint'), VW - 10, 19);
    if (typeof st.zoom !== 'number') {
      const tabs = [[10, T('g.mapa.tabSky'), st.zoom === 'sky'], [112, T('g.mapa.tabManzana'), st.zoom == null], [214, T('g.mapa.tabSS'), st.zoom === 'ss'], [316, T('g.mapa.tabSubte'), st.zoom === 'subte']];
      if (st.facil) {   // chip 🎚️ FÁCIL al lado de las pestañas (que se NOTE el modo)
        ctx.fillStyle = 'rgba(155,232,160,0.12)'; ctx.fillRect(420, 31, 150, 16);
        ctx.strokeStyle = '#6aa870'; ctx.strokeRect(420.5, 31.5, 150, 16);
        ctx.fillStyle = '#9be8a0'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
        ctx.fillText('🎚️ ' + T('g.mapa.facilOn').slice(0, 26), 495, 42); ctx.textAlign = 'left';
      }
      for (const [tx, label2, act] of tabs) {
        ctx.fillStyle = act ? 'rgba(255,213,79,0.15)' : 'rgba(90,140,200,0.08)'; ctx.fillRect(tx, 31, 96, 16);
        ctx.strokeStyle = act ? '#ffd54f' : '#3a5a80'; ctx.strokeRect(tx + 0.5, 31.5, 96, 16);
        ctx.fillStyle = act ? '#ffe9b0' : '#7fa8c8'; ctx.font = (act ? 'bold ' : '') + '9px monospace'; ctx.textAlign = 'center';
        ctx.fillText(label2, tx + 48, 42);
      }
    }
    // VISTA GENERAL (v299): cajones por edificio; SKYLINE (v301): la cuadra en perspectiva
    let hoverBox = null;
    if (st.zoom == null) hoverBox = drawOverview(ctx, VW, VH, st, qAt, visited);
    if (st.zoom === 'sky') drawSky(ctx, VW, VH, st, qAt, visited);
    if (st.zoom === 'subte') drawSubte(ctx, VW, VH, st);
    // conexiones (puertas) — solo entre visitados (fog), solo en las vistas de detalle
    if (st.zoom === 'ss' || typeof st.zoom === 'number') {
    ctx.strokeStyle = 'rgba(90,140,200,0.25)'; ctx.lineWidth = 1;
    for (const n of model.nodes) { if (!visited.has(n.i)) continue; const g1 = geom(n, VW, VH, st.zoom); if (!g1) continue;
      for (const d of (n.room.doors || [])) { const to = d.to; if (typeof to !== 'number' || !model.nodes[to] || !visited.has(to)) continue;
        const g2 = geom(model.nodes[to], VW, VH, st.zoom); if (!g2) continue;
        ctx.beginPath(); ctx.moveTo(g1.x + g1.w / 2, g1.y + g1.h / 2); ctx.lineTo(g2.x + g2.w / 2, g2.y + g2.h / 2); ctx.stroke(); } }
    }
    let hoverNode = null;
    const drawList = [];
    if (st.zoom === 'ss' || typeof st.zoom === 'number') {
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
          const qe = (qAt[n.i] || []).map(e => ({ e, q: questMark(e, st) })).filter(x => x.q !== '🔒' || st.facil);
          const maxQ = Math.max(1, Math.floor((g.h - 4) / 13));
          qe.sort((a, b) => (a.q === '⭐' ? -1 : 1) - (b.q === '⭐' ? -1 : 1));   // las ⭐ primero
          qe.slice(0, maxQ).forEach((x, k) => {
            ctx.font = (x.q === '⭐' ? 'bold ' : '') + '10px monospace'; ctx.textAlign = 'left';
            ctx.fillStyle = x.q === '⭐' ? '#ffe27a' : x.q === '🔒' ? 'rgba(150,170,200,0.75)' : '#9be8a0';
            const extra = (k === maxQ - 1 && qe.length > maxQ) ? '  +' + (qe.length - maxQ) : '';
            const espacio = Math.floor((VW - rx - 14) / 6.3) - extra.length;   // presupuesto en px reales
            ctx.fillText((x.q + ' ' + String(questTitle(x.e))).slice(0, Math.max(10, espacio)) + extra, rx, g.y + 11 + k * 13);
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
    // 💤 SUEÑOS / NIVELES IA (v304): dónde se sueñan + si estás soñando AHORA (los niveles generados son
    // bolsillos efímeros — no se mapean sala a sala, se representan como categoría)
    if (st.zoom == null) {
      const dy2 = Math.round(VH * 0.55) + 42, dx2 = 10, dw2 = Math.min(230, VW * 0.24);   // abajo-izquierda: hay lugar de sobra
      // truncado por MEDICIÓN real (la fuente varía por browser; el slice por chars desbordaba el recuadro)
      const fitTxt = (t, maxW) => { let str = String(t); while (str.length > 1 && ctx.measureText(str).width > maxW) str = str.slice(0, -1); return str; };
      ctx.fillStyle = '#c8a8e8'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
      ctx.fillText(fitTxt(T('g.mapa.suenios'), dw2), dx2, dy2 - 6);
      ctx.strokeStyle = st.dream ? '#ffd54f' : '#7a5a9a'; ctx.lineWidth = st.dream ? 2 : 1; ctx.setLineDash([3, 3]);
      ctx.strokeRect(dx2 + 0.5, dy2 + 0.5, dw2, 58); ctx.setLineDash([]);
      ctx.fillStyle = '#b8a0d0'; ctx.font = '8px monospace';
      [T('g.mapa.dream1'), T('g.mapa.dream2'), T('g.mapa.dream3')].forEach((ln, k) => ctx.fillText(fitTxt(ln, dw2 - 8), dx2 + 5, dy2 + 13 + k * 11));
      if (st.dream) { ctx.fillStyle = 'rgba(255,213,79,' + (0.6 + 0.4 * Math.sin((st.t || 0) * 6)) + ')'; ctx.font = 'bold 8px monospace';
        ctx.fillText(fitTxt('💤 ' + T('g.mapa.suenioAhora', { n: st.dream }), dw2 - 8), dx2 + 5, dy2 + 13 + 33); }
    }
    // 🎮 MULTIJUGADOR (v300): categoría propia con INFO real — qué juegos hay (DATA), tu progreso (piquete),
    // quests del grafo y gente ONLINE ahora (salonLive). Columna derecha, cajones tipo la vista general.
    if (st.zoom == null) {
      const colX = VW - PADR + 6, colW = PADR - 14;
      ctx.fillStyle = '#9be8a0'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
      ctx.fillText(T('g.mapa.multi'), colX, 66);
      const won = st.piquete || {};
      const nWon = ['corte', 'soga', 'bombo', 'olla', 'pancarta'].filter(k => won[k]).length;
      const liveOf = id => { let n = 0; for (const k in (st.live || {})) if (k === id || k.startsWith(id)) n += st.live[k]; return n; };
      const INFO = { lavalle: '✊' + nWon + '/5 🃏', obelisco: '🛰️', bodegon: '🃏1v1·6 💬', telo: '🤖' };
      SUBMODES.forEach((sm, k) => {
        const g = { x: colX, y: 74 + k * 46, w: colW, h: 40 };
        const active = st.sub === sm.id;
        const qs = (qAt['sm:' + sm.id] || []).map(e => questMark(e, st)).filter(q => q !== '🔒');
        const onl = liveOf(sm.id);
        ctx.strokeStyle = active ? '#ffd54f' : qs.includes('⭐') ? '#ffe27a' : '#4a7a5a'; ctx.lineWidth = active ? 2 : 1; ctx.setLineDash([3, 3]);
        ctx.strokeRect(g.x + 0.5, g.y + 0.5, g.w, g.h); ctx.setLineDash([]);
        ctx.fillStyle = active ? '#ffe9b0' : '#8fc8a0'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
        ctx.fillText(sm.name.slice(0, Math.floor((g.w - 6) / 5.5)), g.x + 4, g.y + 13);
        ctx.fillStyle = '#7fa8c8'; ctx.font = '9px monospace';
        ctx.fillText(((INFO[sm.id] || '') + (onl ? ' 👥' + onl : '') + (qs.length ? ' ' + qs.join('') : '')).slice(0, Math.floor((g.w - 6) / 5.5)), g.x + 4, g.y + 28);
        if (active) { ctx.fillStyle = 'rgba(255,213,79,' + (0.6 + 0.4 * Math.sin((st.t || 0) * 6)) + ')'; ctx.beginPath(); ctx.arc(g.x + g.w - 8, g.y + 8, 3.4, 0, Math.PI * 2); ctx.fill(); }
      });
    }
    // tooltip del hover (banda de abajo) — acá SÍ se ven las 🔒 ("se destraba más adelante")
    if (hoverBox) {
      const b = hoverBox.bx.b;
      const lines = [];
      lines.push(b.name + '  ·  ×' + b.floors + '  ·  🔦 ' + hoverBox.v + '/' + b.floors + '  ·  ' + T('g.mapa.click'));
      for (const i of b.rooms) for (const e of (qAt[i] || [])) {
        const q = questMark(e, st);
        if (q === '⭐') { const h = e.hints && e.hints[(typeof I18n !== 'undefined' && I18n.short && I18n.short()) || 'es']; lines.push('⭐ ' + ((h && h[st.facil ? 2 : 0]) || questTitle(e))); }
        else if (q === '✅') lines.push('✅ ' + questTitle(e));
        else if (st.facil) lines.push('🔒 ' + questTitle(e) + ' — ' + T('g.mapa.locked'));   // FÁCIL: te marca TODO
      }
      if (hoverBox.hasLock && !st.facil) lines.push('?? ' + T('g.mapa.algoOculto'));
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
        if (q === '⭐') { const h = e.hints && e.hints[(typeof I18n !== 'undefined' && I18n.short && I18n.short()) || 'es']; lines.push('⭐ ' + ((h && h[st.facil ? 2 : 0]) || questTitle(e))); }
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
  return { build, draw, groupAt, hitTest, overview: overviewBoxes, sky: skyBoxes, get model() { return model; } };
})();
if (typeof window !== 'undefined') window.Mapa = Mapa;
if (typeof module !== 'undefined') module.exports = Mapa;
