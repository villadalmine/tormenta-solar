// trenes.js — HORARIOS DE TREN "de verdad" (v361, subte.md §11). El tablero de salidas de las terminales se
// calcula con el RELOJ REAL de Buenos Aires + las frecuencias/ventanas de servicio REALES (aproximadas) de cada
// ramal (DATA abajo). El ESTADO del servicio (demoras / servicio limitado / suspendido — "el lío") viene del
// proxy (GET /trenes): consistente para todos los jugadores y ENCHUFABLE a la API real de transporte (GTFS-RT)
// si el dueño registra credenciales; sin red se simula LOCAL con el mismo seed horario (mismo lío para todos).
// Capa ADITIVA (regla de oro): si este módulo no está, las terminales muestran su cartel simple de siempre.
const Trenes = (() => {
  // ── DATA: la RED por terminal. freq en minutos; first/last = ventana de servicio en hora BsAs (last>24 cruza medianoche).
  const RED = {
    constitucion: { linea: 'Roca', ramales: {
      'La Plata': { freq: 12, first: 4, last: 25 },
      'Ezeiza':   { freq: 15, first: 4, last: 25 },
      'A. Korn':  { freq: 20, first: 4, last: 24 },
      'Bosques':  { freq: 30, first: 5, last: 23 },
      'Cañuelas': { freq: 60, first: 5, last: 22 },
    } },
    retiro: { linea: 'Mitre', ramales: {
      'Mitre — Tigre':        { linea: 'Mitre',          freq: 13, first: 4, last: 25 },
      'Mitre — J. L. Suárez': { linea: 'Mitre',          freq: 17, first: 4, last: 24 },
      'Villa Ballester':      { linea: 'Mitre',          freq: 17, first: 4, last: 24 },
      'Belgrano Norte':       { linea: 'Belgrano Norte', freq: 14, first: 4, last: 25 },
      'San Martín — C. Universitaria': { linea: 'San Martín', freq: 12, first: 4, last: 25 },
    } },
  };
  const LINEAS = ['Roca', 'Mitre', 'San Martín', 'Belgrano Norte'];
  // motivos TÍPICOS del lío ferroviario (ids → i18n g.trenes.motivo_N en el cliente)
  const MOTIVOS = 6;   // 0 accidente · 1 obras · 2 cables · 3 señales · 4 tormenta · 5 gremial

  // ── reloj REAL de Buenos Aires (minutos del día), robusto sin Intl
  function nowBsAs() {
    try {
      const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
      const m = p.match(/(\d+):(\d+)/); if (m) return { h: +m[1] % 24, min: (+m[1] % 24) * 60 + +m[2] };
    } catch (e) {}
    const d = new Date(Date.now() - 3 * 3600 * 1000);   // fallback: UTC-3 fijo
    return { h: d.getUTCHours(), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
  }
  // ── seed determinístico por (fecha+hora BsAs, línea): el MISMO lío para todos aunque no haya red
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
  function hourKey() { const d = new Date(Date.now() - 3 * 3600 * 1000); return d.getUTCFullYear() + '-' + d.getUTCMonth() + '-' + d.getUTCDate() + '-' + d.getUTCHours(); }
  function estadoSimulado(linea) {
    const r = hash(hourKey() + '|' + linea);
    const roll = r % 100;   // 70% normal · 18% demorado · 8% limitado · 4% suspendido
    if (roll < 70) return { e: 'normal' };
    if (roll < 88) return { e: 'demorado', m: r % MOTIVOS, extra: 8 + (r % 18) };
    if (roll < 96) return { e: 'limitado', m: r % MOTIVOS };
    return { e: 'suspendido', m: r % MOTIVOS };
  }

  // ── estado del servicio: del PROXY si contesta (source real|simulado), si no el simulado local
  const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';   // mismo proxy que ai.js/noticias.js
  let ESTADOS = null, SOURCE = 'local', lastFetch = 0;
  function refresh() {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return;
    if (Date.now() - lastFetch < 5 * 60 * 1000) return;   // cada 5 min alcanza
    lastFetch = Date.now();
    try {
      fetch(PROXY + '/trenes')
        .then(r => (r && r.ok) ? r.json() : null)
        .then(d => { if (d && d.estados) { ESTADOS = d.estados; SOURCE = d.source || 'proxy'; } })
        .catch(() => {});
    } catch (e) {}
  }
  function estadoDe(linea) { refresh(); return (ESTADOS && ESTADOS[linea]) || estadoSimulado(linea); }

  // ── el TABLERO: próximas salidas de una terminal, con el reloj real + el estado
  function tablero(terminal) {
    const term = RED[terminal]; if (!term) return [];
    const { min } = nowBsAs(), out = [];
    for (const ramal in term.ramales) {
      const r = term.ramales[ramal], linea = r.linea || term.linea;
      const est = estadoDe(linea);
      const freq = est.e === 'limitado' ? r.freq * 2 : r.freq;   // servicio limitado = mitad de trenes
      let mins = null;
      const inService = (min >= r.first * 60) || (r.last > 24 && min <= (r.last - 24) * 60);
      if (inService && est.e !== 'suspendido') { mins = freq - (min % freq); if (est.e === 'demorado') mins += est.extra || 10; }
      out.push({ ramal, linea, mins, estado: est.e, motivo: est.m, first: r.first });
    }
    return out;
  }
  function horaStr() { const { min } = nowBsAs(); const h = Math.floor(min / 60), m = min % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  function source() { return SOURCE; }

  // ── DIBUJO compartido (lo usan constitucion.js y retiro.js): la CARTELERA de salidas + el TICKER de noticias
  const COLS = { normal: '#9fe6a0', demorado: '#ffcf5b', limitado: '#ffa04a', suspendido: '#ff6a6a' };
  function drawCartelera(g, cx, cy, terminal, T, t) {
    const rows = tablero(terminal); if (!rows.length) return;
    const bw = 302, bh = 22 + rows.length * 12 + 13;
    g.fillStyle = 'rgba(6,10,16,0.94)'; g.fillRect(cx - bw / 2, cy, bw, bh);
    g.strokeStyle = '#2a3a4c'; g.lineWidth = 1; g.strokeRect(cx - bw / 2 + 0.5, cy + 0.5, bw - 1, bh - 1);
    g.fillStyle = '#ffcf5b'; g.font = 'bold 10px monospace'; g.textAlign = 'center';
    g.fillText('▶ ' + T('g.trenes.salidas') + ' · ' + horaStr(), cx, cy + 13);
    g.font = '9px monospace';
    rows.forEach((r, i) => {
      const ry = cy + 24 + i * 12;
      g.fillStyle = '#cfd8e4'; g.textAlign = 'left'; g.fillText(r.ramal.toUpperCase().slice(0, 22), cx - bw / 2 + 10, ry + 6);
      g.fillStyle = COLS[r.estado] || '#cfd8e4'; g.textAlign = 'right';
      const txt = r.estado === 'suspendido' ? T('g.trenes.susp')
        : r.mins == null ? T('g.trenes.cerrado', { h: (r.first < 10 ? '0' : '') + r.first + ':00' })
        : r.mins + '′' + (r.estado === 'demorado' ? ' ⚠' : r.estado === 'limitado' ? ' ◐' : '');
      g.fillText(txt, cx + bw / 2 - 10, ry + 6);
    });
    // pie: el LÍO del día (la peor línea con problemas), con su motivo típico
    const lio = rows.find(r => r.estado === 'suspendido') || rows.find(r => r.estado === 'limitado') || rows.find(r => r.estado === 'demorado');
    g.textAlign = 'center'; g.font = '8px monospace';
    if (lio) { g.fillStyle = COLS[lio.estado]; g.fillText('⚠ ' + lio.linea + ': ' + T('g.trenes.' + lio.estado) + ' ' + T('g.trenes.motivo_' + (lio.motivo || 0)), cx, cy + bh - 5); }
    else { g.fillStyle = '#6f8a6f'; g.fillText('✓ ' + T('g.trenes.normal'), cx, cy + bh - 5); }
  }
  function drawTicker(g, x0, x1, y, t, T) {
    const ns = (typeof window !== 'undefined' && window.NOTICIAS) || [];
    if (!ns.length) return;
    const txt = ns.map(n => (n.answer || n.headline || '')).filter(Boolean).join('   +++   ');
    if (!txt) return;
    g.save(); g.beginPath(); g.rect(x0, y - 10, x1 - x0, 14); g.clip();
    g.fillStyle = 'rgba(6,10,16,0.85)'; g.fillRect(x0, y - 10, x1 - x0, 14);
    g.fillStyle = '#7fd0ff'; g.font = '10px monospace'; g.textAlign = 'left';
    const tw = Math.max(200, txt.length * 6.2), off = (t * 45) % (tw + 80);
    g.fillText('📰 ' + txt, x1 - off, y + 1); g.fillText('📰 ' + txt, x1 - off + tw + 80, y + 1);
    g.restore();
  }
  // info puntual de un ramal (para el menú del molinete): "7′", "+18′ ⚠", "SUSP"…
  function infoRamal(terminal, ramal, T) {
    const r = tablero(terminal).find(x => x.ramal === ramal); if (!r) return '';
    if (r.estado === 'suspendido') return T('g.trenes.susp');
    if (r.mins == null) return T('g.trenes.cerrado', { h: (r.first < 10 ? '0' : '') + r.first + ':00' });
    return r.mins + '′' + (r.estado === 'demorado' ? ' ⚠' : r.estado === 'limitado' ? ' ◐' : '');
  }

  return { tablero, horaStr, nowBsAs, estadoDe, source, drawCartelera, drawTicker, infoRamal, LINEAS, RED };
})();
if (typeof window !== 'undefined') window.Trenes = Trenes;
if (typeof module !== 'undefined') module.exports = Trenes;
