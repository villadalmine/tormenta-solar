// web-smoke.mjs — test de NAVEGADOR REAL (lo que el e2e headless no puede ver).
//
// Levanta un server estático, abre el juego en Chromium (Playwright) en varias resoluciones y
// verifica cosas que SOLO se ven con render+CSS+layout reales:
//   1. no hay errores de consola / excepciones de JS,
//   2. el botón ENTRAR está ENTERO dentro del viewport (no cortado)  ← el bug del panel,
//   3. el panel de intro no recorta contenido sin scroll,
//   4. tras apretar ENTRAR, el canvas NO queda en blanco/uniforme (sprite faltante),
// y guarda screenshots en tests/screenshots/.
//
// Local:  npm install && npx playwright install chromium && node tests/web-smoke.mjs
// CI:     corre solo en GitHub Actions (.github/workflows/web-smoke.yml).
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'tests', 'screenshots');
const PORT = 8799;
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' };

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer(async (req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !existsSync(fp)) { res.writeHead(404); return res.end('404'); }
      try {
        const buf = await readFile(fp);
        res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
        res.end(buf);
      } catch { res.writeHead(500); res.end('500'); }
    });
    srv.listen(PORT, () => resolve(srv));
  });
}

const VIEWPORTS = [
  { name: 'laptop-1366', width: 1366, height: 768 },
  { name: 'fhd-1920',    width: 1920, height: 1080 },
  { name: 'chico-1280',  width: 1280, height: 720 },
];

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

let chromium;
try { ({ chromium } = await import('playwright')); }
catch {
  console.error('⚠️  Falta Playwright. Instalá:  npm install && npx playwright install chromium');
  process.exit(2);
}

await mkdir(SHOTS, { recursive: true });
const srv = await serve();
const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    try {
      const errors = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));

      await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      ok(errors.length === 0, `[${vp.name}] errores de consola/JS: ${errors.join(' | ')}`);

      // (2) el botón ENTRAR debe estar ENTERO dentro del viewport
      const btn = await page.evaluate(() => {
        const b = document.getElementById('startBtn'); if (!b) return null;
        const r = b.getBoundingClientRect();
        return { top: r.top, left: r.left, bottom: r.bottom, right: r.right, vw: innerWidth, vh: innerHeight };
      });
      ok(btn, `[${vp.name}] no existe #startBtn`);
      let btnInside = false;
      if (btn) {
        const okV = btn.top >= -0.5 && btn.bottom <= btn.vh + 0.5;
        const okH = btn.left >= -0.5 && btn.right <= btn.vw + 0.5;
        btnInside = okV && okH;
        ok(okV, `[${vp.name}] el botón ENTRAR está CORTADO vertical (top ${btn.top.toFixed(0)}, bottom ${btn.bottom.toFixed(0)}, alto ventana ${btn.vh})`);
        ok(okH, `[${vp.name}] el botón ENTRAR está CORTADO horizontal`);
      }

      // (3) el panel de intro no debe recortar contenido sin scroll
      const panel = await page.evaluate(() => {
        const p = document.querySelector('#intro .panel'); if (!p) return null;
        return { scrollH: p.scrollHeight, clientH: p.clientHeight, overflowY: getComputedStyle(p).overflowY };
      });
      if (panel) ok(panel.scrollH <= panel.clientH + 1 || ['auto','scroll'].includes(panel.overflowY),
        `[${vp.name}] el panel de intro recorta sin scroll (scrollH ${panel.scrollH} > clientH ${panel.clientH})`);

      await page.screenshot({ path: path.join(SHOTS, `intro-${vp.name}.png`) });

      // (4) arrancar y verificar que el canvas dibuja algo (no queda uniforme).
      //     Si el botón está cortado/fuera de viewport, ni lo intentamos (ya quedó el fail).
      if (btnInside) {
        await page.click('#startBtn');
        await page.waitForTimeout(1500);
        const blank = await page.evaluate(() => {
          const c = document.getElementById('screen');
          const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
          for (let i = 4; i < d.length; i += 4 * 997) {
            if (d[i] !== d[0] || d[i+1] !== d[1] || d[i+2] !== d[2]) return false;
          }
          return true;
        });
        ok(!blank, `[${vp.name}] el canvas quedó en blanco/uniforme tras ENTRAR (¿sprite faltante / crash de render?)`);
        await page.screenshot({ path: path.join(SHOTS, `juego-${vp.name}.png`) });
      }
    } catch (e) {
      fails.push(`[${vp.name}] excepción inesperada: ${e.message}`);
    } finally {
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  srv.close();
}

if (fails.length) {
  console.error('❌ WEB SMOKE FALLÓ:\n - ' + fails.join('\n - '));
  process.exit(1);
}
console.log('✓ web smoke OK — sin errores de consola, botón ENTRAR visible y canvas dibuja (1366 / 1920 / 1280).');
