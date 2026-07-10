// check-violeta.mjs — valida en Chromium REAL que el canto de la popular (setVioleta) suena al entrar a Campana:
// cuenta los osciladores creados (lead + bajo + bombo) durante ~3s. Efímero pero committeado como herramienta.
import http from 'http'; import { readFile } from 'fs/promises'; import { existsSync } from 'fs';
import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon' };
const srv = http.createServer(async (rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const fp = path.join(ROOT, p); if (!existsSync(fp)) { rs.writeHead(404); return rs.end('x'); } try { const b = await readFile(fp); rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' }); rs.end(b); } catch { rs.writeHead(500); rs.end('x'); } });
await new Promise(r => srv.listen(8805, r));
const { chromium } = await import('playwright');
const b = await chromium.launch(); const ctx = await b.newContext(); const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(() => {
  try { localStorage.setItem('ts_debug', '1'); localStorage.setItem('ts_nick', 'QA'); localStorage.setItem('ts_lang', 'es'); } catch (e) {}
  window.__osc = 0; window.__sine = 0;
  const P = (window.AudioContext || window.webkitAudioContext).prototype;
  const orig = P.createOscillator;
  P.createOscillator = function () { window.__osc++; const o = orig.apply(this, arguments);
    const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(o), 'type') || {};
    try { let t = 'sine'; Object.defineProperty(o, 'type', { get() { return t; }, set(v) { t = v; if (v === 'sine') window.__sine++; d.set && d.set.call(o, v); } }); } catch (e) {}
    return o; };
});
await pg.goto('http://localhost:8805/index.html', { waitUntil: 'networkidle' }); await pg.waitForTimeout(300);
await pg.click('#startBtn'); await pg.waitForTimeout(900);
const before = await pg.evaluate(() => window.__osc);
await pg.evaluate(() => document.getElementById('optBtn').click()); await pg.waitForTimeout(150);
await pg.evaluate(() => document.querySelector('[data-dbg="campanaYa"]').click());
await pg.waitForTimeout(3200);
const res = await pg.evaluate(() => ({ osc: window.__osc, sine: window.__sine }));
const delta = res.osc - before;
console.log('osciladores creados en 3.2s de Campana:', delta, '| bombos (sine):', res.sine, '| errores JS:', errs.length ? errs.join('|') : 'ninguno');
await b.close(); srv.close();
if (delta < 15 || errs.length) { console.error('❌ el canto de la popular NO está sonando como se espera'); process.exit(1); }
console.log('✓ check-violeta OK — el canto de la popular suena (lead + bajo + bombo) al entrar a Campana. 💜');
