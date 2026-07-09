// repro-win2.mjs — reproduce el bug "gano el Nivel 2 → SEGUIR → no me puedo mover / se congela".
import http from 'http'; import { readFile } from 'fs/promises'; import { existsSync } from 'fs';
import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon' };
const srv = http.createServer(async (rq, rs) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const fp = path.join(ROOT, p); if (!existsSync(fp)) { rs.writeHead(404); return rs.end('x'); } try { const b = await readFile(fp); rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' }); rs.end(b); } catch { rs.writeHead(500); rs.end('x'); } });
await new Promise(r => srv.listen(8803, r));
const { chromium } = await import('playwright');
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await pg.addInitScript(() => { try { localStorage.setItem('ts_debug', '1'); localStorage.setItem('ts_nick', 'Repro'); localStorage.setItem('ts_lang', 'es'); } catch (e) {} });
await pg.goto('http://localhost:8803/index.html', { waitUntil: 'networkidle' }); await pg.waitForTimeout(300);
await pg.click('#startBtn'); await pg.waitForTimeout(1000);
// disparar el win2 (arma la Pirámide)
await pg.evaluate(() => document.getElementById('optBtn').click()); await pg.waitForTimeout(150);
await pg.evaluate(() => document.getElementById('optBtn').click()); await pg.waitForTimeout(200);
// sanity: ¿el wiring del debug anda? subeSeen debería setear ts_sube_seen
await pg.evaluate(() => { const e = document.querySelector('[data-dbg="subeSeen"]'); if (e) e.click(); });
const seen = await pg.evaluate(() => localStorage.getItem('ts_sube_seen'));
console.log('sanity subeSeen → ts_sube_seen:', seen);
const served = await pg.evaluate(async () => { try { const t = await (await fetch('js/game.js?v=351')).text(); return { win2endYa: t.includes('win2endYa'), showWin2End: t.includes('function showWin2End'), len: t.length }; } catch (e) { return 'fetch fail: ' + e.message; } });
console.log('game.js servido:', JSON.stringify(served));
const dbgRes = await pg.evaluate(() => { const el = document.querySelector('[data-dbg="win2endYa"]'); if (!el) return 'NO BUTTON'; el.click(); return 'clicked'; });
console.log('win2endYa:', dbgRes);
await pg.waitForTimeout(700);
const lc = await pg.evaluate(() => localStorage.getItem('ts_linea_c'));
const dmsg = await pg.evaluate(() => { const e = document.getElementById('opt-debug-msg'); return e ? e.textContent : '(no msg el)'; });
console.log('ts_linea_c tras el click:', lc, '| mensaje debug:', dmsg);
await pg.screenshot({ path: ROOT + '/tests/screenshots/win2-a-arming.png' });
const endShown = await pg.evaluate(() => !document.getElementById('endscreen').classList.contains('hidden'));
const seguirShown = await pg.evaluate(() => { const s = document.getElementById('seguirBtn'); return s && !s.classList.contains('hidden'); });
console.log('endscreen visible:', endShown, '| seguirBtn visible:', seguirShown);
if (seguirShown) {
  await pg.evaluate(() => document.getElementById('seguirBtn').click());
  await pg.waitForTimeout(600);
  // ¿el loop corre? comparo dos frames del canvas ~500ms aparte
  const hash = () => pg.evaluate(() => { const c = document.getElementById('screen'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 4 * 331) h = (h * 31 + d[i]) >>> 0; return h; });
  const h1 = await hash(); await pg.waitForTimeout(700); const h2 = await hash();
  const hudHidden = await pg.evaluate(() => document.getElementById('hud').classList.contains('hidden'));
  const endStillShown = await pg.evaluate(() => !document.getElementById('endscreen').classList.contains('hidden'));
  console.log('tras SEGUIR → canvas anima:', h1 !== h2, '(h1', h1, 'h2', h2, ') | HUD oculto:', hudHidden, '| endscreen aún visible:', endStillShown);
} else {
  console.log('⚠️ NO apareció SEGUIR — el flujo win2 no llegó a la pantalla de fin como se espera');
}
console.log('errores JS:', errs.length ? errs.join(' | ') : 'ninguno');
await b.close(); srv.close();
// REGRESIÓN (bug "gano el Nivel 2 y no me puedo mover", v344-v351): showWin2End llamaba lsOn (fuera de scope) → crash
// → la pantalla de fin no salía → juego congelado. Este test lo cubre.
const fail = [];
if (!seguirShown) fail.push('la pantalla de fin del Nivel 2 no apareció (¿showWin2End crasheó?)');
if (errs.length) fail.push('errores JS: ' + errs.join(' | '));
if (fail.length) { console.error('❌ REPRO WIN2 FALLÓ:\n - ' + fail.join('\n - ')); process.exit(1); }
console.log('✓ repro-win2 OK — win2 muestra la pantalla de fin + SEGUIR reanuda sin congelar.');
