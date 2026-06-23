// ads.js — capa de PUBLICIDAD / product placement (ADITIVA). Ver specs/publicidad.md.
// Lee ads/slots.json (espacios anclados a salas REALES) + un manifiesto de campañas (ads/manifest.json,
// o un endpoint remoto vía window.ADS_MANIFEST). Resuelve campaña→slot (ventana de fechas + rotación por
// peso) y dibuja la creatividad AL ESTILO sobre el slot. El core solo llama, GUARDADO por typeof:
//   if (typeof Ads !== 'undefined') Ads.draw(ctx, roomIndex, cam, W, H);
// Sin slots/manifiesto (o sin red) → no dibuja nada y el juego anda EXACTAMENTE igual.
const Ads = (() => {
  const TILE = (typeof Level !== 'undefined' && Level.TILE) ? Level.TILE : 32;
  const lang = () => (typeof I18n !== 'undefined' && I18n.short) ? I18n.short() : 'es';
  let slots = [];               // [{ id, room, x, y, w, h, format }]  (x/y en tiles; w/h en px)
  const chosen = {};            // slotId -> campaña elegida
  const imgCache = {};          // url -> HTMLImageElement (lazy)

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

  function draw(ctx, roomIndex, cam, W, H) {
    if (!slots.length) return;
    for (const sl of slots) {
      if (sl.room !== roomIndex || !chosen[sl.id]) continue;
      const w = sl.w || 80, h = sl.h || 60;
      const sx = (sl.x || 0) * TILE - cam.x, sy = (sl.y || 7) * TILE - cam.y;
      if (sx > W || sx + w < 0) continue;        // fuera de cámara (no dibujar)
      drawPoster(ctx, sx, sy, w, h, chosen[sl.id]);
    }
  }

  if (typeof window !== 'undefined') load();
  return { draw, reload: load, get slots() { return slots; } };
})();
if (typeof window !== 'undefined') window.Ads = Ads;
