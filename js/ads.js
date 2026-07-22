// ads.js — capa de PUBLICIDAD / product placement (ADITIVA). Ver specs/publicidad.md.
// Lee ads/slots.json (espacios anclados a salas REALES) + un manifiesto de campañas (ads/manifest.json,
// o un endpoint remoto vía window.ADS_MANIFEST). Resuelve campaña→slot (ventana de fechas + rotación por
// peso) y dibuja la creatividad AL ESTILO sobre el slot. El core solo llama, GUARDADO por typeof:
//   if (typeof Ads !== 'undefined') Ads.draw(ctx, roomIndex, cam, W, H);
// Sin slots/manifiesto (o sin red) → no dibuja nada y el juego anda EXACTAMENTE igual.
const Ads = (() => {
  const TILE = (typeof Level !== 'undefined' && Level.TILE) ? Level.TILE : 32;
  const lang = () => (typeof I18n !== 'undefined' && I18n.short) ? I18n.short() : 'es';
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  let slots = [];               // [{ id, room, x, y, w, h, format }]  (x/y en tiles; w/h en px)
  const chosen = {};            // slotId -> campaña elegida
  const imgCache = {};          // url -> HTMLImageElement (lazy)
  // --- métricas de IMPRESIÓN (agregadas, sin datos personales; opt-in por endpoint) ---
  const views = {}, lastView = {};   // slotId -> conteo / último ts visto (throttle por slot)
  // specs/publicidad.md §5: POST {views,ts} → el proxy agrega por slot (GET /ads-metrics). Mismo patrón que
  // ai.js/chusmerio.js (proxy propio hardcodeado, override opcional por window.ADS_METRICS para quien
  // self-hostee aparte). Solo conteos anónimos, sin PII — por eso sin gate ni token.
  const METRICS = (typeof window !== 'undefined' && window.ADS_METRICS) || 'https://llm-tormenta-solar.cybercirujas.club/ads-metrics';
  function countView(id) {
    const t = Date.now();
    if (t - (lastView[id] || 0) < 5000) return;   // 1 impresión por slot cada 5s (no por frame)
    lastView[id] = t; views[id] = (views[id] || 0) + 1;
  }
  function flush(beacon) {
    if (!METRICS || typeof fetch === 'undefined') return;
    const ids = Object.keys(views); if (!ids.length) return;
    const payload = JSON.stringify({ views, ts: Date.now() });
    for (const k of ids) delete views[k];          // best-effort: se limpia al enviar
    try {
      if (beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) navigator.sendBeacon(METRICS, payload);
      else fetch(METRICS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
    } catch (e) {}
  }

  const active = (c) => {       // ventana de pauta (si no hay fechas, siempre activa)
    const now = Date.now();
    if (c.from && now < Date.parse(c.from)) return false;
    if (c.to && now > Date.parse(c.to + 'T23:59:59')) return false;
    return true;
  };
  function pickForSlot(slotId, list) {     // rotación PONDERADA entre las campañas activas del slot
    const cs = list.filter(c => c.slot === slotId && active(c));
    if (!cs.length) return null;
    let total = cs.reduce((s, c) => s + (c.weight || 1), 0), r = Math.random() * total;
    for (const c of cs) { r -= (c.weight || 1); if (r <= 0) return c; }
    return cs[0];
  }
  async function load() {
    if (typeof fetch === 'undefined') return;
    const s = await fetch('ads/slots.json').then(r => r.ok ? r.json() : null).catch(() => null);
    if (Array.isArray(s)) slots = s;
    const url = (typeof window !== 'undefined' && window.ADS_MANIFEST) || 'ads/manifest.json';
    const m = await fetch(url).then(r => r.ok ? r.json() : null).catch(() => null);
    const list = Array.isArray(m) ? m : (m && m.campaigns) || [];
    for (const sl of slots) { const c = pickForSlot(sl.id, list); if (c) chosen[sl.id] = c; }
  }

  function getImg(url) {                    // lazy-load; null hasta que cargó (cae al placeholder de texto)
    if (!url || typeof Image === 'undefined') return null;
    if (imgCache[url]) return imgCache[url].complete && imgCache[url].naturalWidth ? imgCache[url] : null;
    const im = new Image(); im.src = url; imgCache[url] = im; return null;
  }
  function wrap(ctx, text, cx, cy, maxW, lh) {
    const words = String(text).split(' '); const lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    const start = cy - (lines.length - 1) * lh / 2;
    lines.forEach((l, i) => ctx.fillText(l, cx, start + i * lh));
  }
  function drawPoster(ctx, sx, sy, w, h, c) {
    ctx.save();
    ctx.fillStyle = c.bg || '#163047'; ctx.fillRect(sx, sy, w, h);
    const im = getImg(c.img);
    if (im) ctx.drawImage(im, sx + 3, sy + 3, w - 6, h - 6);
    else {
      ctx.fillStyle = c.fg || '#FFD54F'; ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      wrap(ctx, (c.alt && (c.alt[lang()] || c.alt.es)) || c.brand || 'PUBLICIDAD', sx + w / 2, sy + h / 2, w - 8, 13);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 2; ctx.strokeRect(sx + 1, sy + 1, w - 2, h - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sx, sy, 20, 9);   // etiqueta discreta "AD"
    ctx.fillStyle = '#cfcfcf'; ctx.font = '6px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('AD', sx + 3, sy + 2);
    ctx.restore();
  }

  // formato PANTALLA (LED/TV): el afiche base + scanlines + barrido de brillo (animado)
  function drawScreen(ctx, sx, sy, w, h, c) {
    drawPoster(ctx, sx, sy, w, h, c);
    const t = now();
    ctx.save();
    ctx.beginPath(); ctx.rect(sx, sy, w, h); ctx.clip();      // que nada se salga de la pantalla
    ctx.globalAlpha = 0.16; ctx.fillStyle = '#000';
    for (let y = 0; y < h; y += 3) ctx.fillRect(sx, sy + y, w, 1);   // scanlines
    ctx.globalAlpha = 0.10 + 0.07 * Math.sin(t * 2);
    ctx.fillStyle = '#bfefff';
    const sweep = ((t * 70) % (w + 40)) - 20;                 // brillo que barre
    ctx.fillRect(sx + sweep, sy, 12, h);
    ctx.restore();
  }
  // formato FACHADA: cartel de local con toldo a rayas (más ancho/llamativo)
  function drawFachada(ctx, sx, sy, w, h, c) {
    ctx.save();
    ctx.fillStyle = c.bg || '#222'; ctx.fillRect(sx, sy, w, h);
    const stripeH = Math.min(12, h * 0.3);
    for (let i = 0; i * 14 < w; i++) { ctx.fillStyle = (i % 2) ? '#d33' : '#f4f4f4'; ctx.fillRect(sx + i * 14, sy + h - stripeH, 14, stripeH); }
    ctx.fillStyle = c.fg || '#FFD54F'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.brand || (c.alt && (c.alt[lang()] || c.alt.es)) || 'LOCAL', sx + w / 2, sy + (h - stripeH) / 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(sx + 1, sy + 1, w - 2, h - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sx, sy, 20, 9);
    ctx.fillStyle = '#cfcfcf'; ctx.font = '6px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('AD', sx + 3, sy + 2);
    ctx.restore();
  }

  // GÓNDOLA: product placement DENTRO del super chino (vista de arriba). Lo llama super.js en su draw().
  // Usa coords de PANTALLA (px/py absolutos), porque el súper es un sub-modo con su propio sistema de coords.
  function drawGondola(ctx, W, H) {
    if (!slots.length) return;
    for (const sl of slots) {
      if (sl.room !== 'super' || (sl.format || 'gondola') !== 'gondola' || !chosen[sl.id]) continue;
      drawPoster(ctx, sl.px != null ? sl.px : 14, sl.py != null ? sl.py : (H - 58), sl.w || 90, sl.h || 42, chosen[sl.id]);
      countView(sl.id);
    }
  }

  function draw(ctx, roomIndex, cam, W, H) {
    if (!slots.length) return;
    for (const sl of slots) {
      if (sl.room !== roomIndex || !chosen[sl.id]) continue;
      const w = sl.w || 80, h = sl.h || 60;
      const sx = (sl.x || 0) * TILE - cam.x, sy = (sl.y || 7) * TILE - cam.y;
      if (sx > W || sx + w < 0) continue;        // fuera de cámara (no dibujar)
      const fmt = sl.format || 'poster';
      (fmt === 'screen' ? drawScreen : fmt === 'fachada' ? drawFachada : drawPoster)(ctx, sx, sy, w, h, chosen[sl.id]);
      countView(sl.id);
    }
  }

  if (typeof window !== 'undefined') {
    load();
    if (METRICS) {     // solo si hay endpoint: flush periódico + al ocultar/cerrar la pestaña (beacon)
      setInterval(() => { if (!(typeof document !== 'undefined' && document.hidden)) flush(false); }, 30000);
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden) flush(true); });
      window.addEventListener('pagehide', () => flush(true));
    }
  }
  return { draw, drawGondola, reload: load, flush, stats: () => ({ ...views }), get slots() { return slots; } };
})();
if (typeof window !== 'undefined') window.Ads = Ads;
