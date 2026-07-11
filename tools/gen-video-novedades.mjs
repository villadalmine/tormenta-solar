// gen-video-novedades.mjs — EL REEL DE NOVEDADES 🎬 (pedido del dueño 2026-07-10): un video estilo YouTube
// que recorre las mejoras de los últimos días CON EL JUEGO CORRIENDO de verdad. Misma maquinaria que
// tests/shots-novedades.mjs (Chromium + hooks de debug data-dbg) pero grabando con recordVideo de Playwright:
// tarjetas de título entre segmentos (tapan el menú de debug mientras salta de feature) + teclas reales
// (camina, interactúa, ¡BOGA!). Al final ffmpeg lo transcodea a mp4 h264 (faststart, sin audio).
// El mp4 NO va al repo: se sube al proxy (PVC) → GET /videos/<nombre> lo sirve con Range desde tu server.
//   node tools/gen-video-novedades.mjs [salida.mp4]
//   TOK=$(kubectl get secret -n ai ... ) && curl -X POST -H "X-Gen-Token: $TOK" --data-binary @novedades.mp4 \
//     https://llm-tormenta-solar.cybercirujas.club/videos/novedades-2026-07-10.mp4
import http from 'http';
import { readFile, mkdir, rename } from 'fs/promises';
import { existsSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTDIR = process.env.VIDEO_OUT || path.join(os.tmpdir(), 'ts-video');
const FINAL = process.argv[2] || path.join(OUTDIR, 'novedades.mp4');
const PORT = 8807;
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' };

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer(async (req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !existsSync(fp)) { res.writeHead(404); return res.end('404'); }
      try { const buf = await readFile(fp);
        res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' }); res.end(buf);
      } catch { res.writeHead(500); res.end('500'); }
    });
    srv.listen(PORT, () => resolve(srv));
  });
}

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.error('⚠️  Falta Playwright: npm install && npx playwright install chromium'); process.exit(2); }

await mkdir(OUTDIR, { recursive: true });
const srv = await serve();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUTDIR, size: { width: 1280, height: 720 } } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

await page.addInitScript(() => { try { localStorage.setItem('ts_debug', '1'); localStorage.setItem('ts_nick', 'Prensa'); localStorage.setItem('ts_lang', 'es'); } catch (e) {} });
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.click('#startBtn');
await page.waitForTimeout(1400);

// ---- helpers ----
const dbg = async (action) => {   // salta a una feature con su hook de debug (el menú queda tapado por la tarjeta)
  await page.evaluate(() => { const b = document.getElementById('optBtn'); if (b) b.click(); });
  await page.waitForTimeout(200);
  await page.evaluate((a) => { const el = document.querySelector('[data-dbg="' + a + '"]'); if (el) el.click(); }, action);
  await page.waitForTimeout(700);
};
const card = async (title, sub) => {   // tarjeta de título estilo YouTube (tapa la pantalla mientras carga el segmento)
  await page.evaluate(([t, s]) => {
    let d = document.getElementById('reel-card');
    if (!d) { d = document.createElement('div'); d.id = 'reel-card';
      d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#070a10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;font-family:monospace;text-align:center;padding:0 40px';
      document.body.appendChild(d); }
    d.innerHTML = '<div style="color:#ffe9b0;font-size:34px;font-weight:bold;text-shadow:0 0 18px rgba(255,213,79,.35)">' + t + '</div>' +
      (s ? '<div style="color:#9fb0c4;font-size:17px;max-width:820px;line-height:1.5">' + s + '</div>' : '');
    d.style.display = 'flex';
  }, [title, sub || '']);
};
const uncard = async () => { await page.evaluate(() => { const d = document.getElementById('reel-card'); if (d) d.style.display = 'none'; }); };
const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };
const tap = async (key) => { await page.keyboard.down(key); await page.waitForTimeout(90); await page.keyboard.up(key); };
// tarjeta arriba → saltar a la feature POR DETRÁS → destapar → jugar
const seg = async (title, sub, action, play) => {
  await card(title, sub);
  if (action) await dbg(action);
  await page.waitForTimeout(1400);
  await uncard();
  await page.waitForTimeout(400);
  if (play) await play();
  console.log('  🎬 ' + title);
};

try {
  // ---- EL GUION (las mejoras de los últimos días, v366 → v369) ----
  await card('TORMENTA SOLAR', 'NOVEDADES · 11 de julio de 2026 — el juego corriendo, sin trucos');
  await page.waitForTimeout(2800); await uncard(); await page.waitForTimeout(600);

  await seg('🏆 EL TROFEO A CASA', 'la regata se ganó PARA Campana: el Tano se emociona → la vitrina de la sede', 'trofeoYa', async () => {
    await hold('d', 1900); await hold('s', 400); await tap('e');   // se lo mostrás al TANO (se le empañan los ojos)
    await page.waitForTimeout(2600);
    await hold('a', 1750); await hold('s', 350); await tap('e');   // lo dejás en la VITRINA → ¡SOCIO HONORARIO!
    await page.waitForTimeout(4200);
  });

  await seg('🐯 EL CLÁSICO QUE SE PUDRE', 'Tigre vs Dálmine: empate, SUSPENDIDO… y las DOS hinchadas JUNTAS contra los canas', 'tigreYa', async () => {
    await page.waitForTimeout(11500); await tap('e');              // ¡gritás el EMPATE!
    await page.waitForTimeout(9600); await tap('e');               // lío → suspendido → cantás CON LAS DOS
    await page.waitForTimeout(5000);                               // "¡el que no salta es un vigilante!"
  });

  await seg('💜 LA FINAL DEL ASCENSO', 'en Ezeiza: Dálmine vs Tristán Suárez — gritá el gol… y AGUANTÁ', 'ezeizaYa', async () => {
    await page.waitForTimeout(5200); await tap('e');               // ¡gritás el gol!
    for (let i = 0; i < 3; i++) { await page.waitForTimeout(900); await tap('e'); }   // el arquero ataja TODO
    await page.waitForTimeout(3000);                               // pitazo → ¡A LA NACIONAL B!
    await page.waitForTimeout(4500);                               // papelitos + vuelta olímpica
  });

  await seg('🗺️ LA PLATA Y EL MAPA DE 1882', 'las diagonales son IGUALES a Campana… y la catedral guarda la prueba de la EXTORSIÓN', 'laplataYa', async () => {
    await hold('a', 1050); await hold('w', 380); await tap('e');   // el plano: "¡es IGUAL a Campana!"
    await page.waitForTimeout(2800);
    await hold('d', 1050); await hold('w', 550); await tap('e');   // entrás a la catedral → la cripta
    await page.waitForTimeout(1000);
    await hold('w', 680); await tap('e');                          // la vitrina: EL MAPA (la extorsión)
    await page.waitForTimeout(3600);
  });

  await card('TORMENTA SOLAR ⚡', 'jugalo GRATIS · tormenta-solar.cybercirujas.club · villadalmine.github.io/tormenta-solar');
  await page.waitForTimeout(3200);

  if (errors.length) console.error('⚠️  errores JS durante la grabación:\n - ' + errors.join('\n - '));
} finally {
  await page.close();                        // cierra y flushea el video
  const webm = await page.video().path();
  await ctx.close(); await browser.close(); srv.close();
  // transcodear a mp4 h264 (compatible con <video> en todos lados; faststart = arranca sin bajar todo).
  // GOTCHA Fedora: el ffmpeg-free NO trae libx264 → usamos libopenh264 (mismo codec h264, sin crf → bitrate).
  // TRIM recorta el boot (goto+ENTRAR+espera ≈3s) para abrir directo con la tarjeta de título.
  execFileSync('ffmpeg', ['-y', '-ss', process.env.TRIM || '3.0', '-i', webm, '-c:v', 'libopenh264', '-b:v', '2500k', '-maxrate', '3000k',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', FINAL + '.tmp.mp4'], { stdio: 'inherit' });
  await rename(FINAL + '.tmp.mp4', FINAL);
  console.log('✓ reel listo: ' + FINAL);
}
