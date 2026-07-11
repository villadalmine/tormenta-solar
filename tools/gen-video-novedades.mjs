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
  // ---- EL GUION (las mejoras de los últimos días, v358 → v365) ----
  await card('TORMENTA SOLAR', 'NOVEDADES · semana del 10 de julio de 2026 — el juego corriendo, sin trucos');
  await page.waitForTimeout(2800); await uncard(); await page.waitForTimeout(600);

  await seg('🍲 VILLA 31 VIVA', 'el mandado del cura · la abuela Coca · las rondas de la olla', 'villaYa', async () => {
    await hold('d', 1400); await hold('w', 700); await tap('e'); await page.waitForTimeout(1800); await hold('a', 900);
  });

  await seg('🕐 TRENES EN TIEMPO REAL', 'reloj real de Buenos Aires + frecuencias reales + el lío del día', 'constiYa', async () => {
    await hold('w', 900); await page.waitForTimeout(2600); await hold('d', 800);
  });

  await seg('🚌 LA CALLE DE CONSTITUCIÓN', 'bondis con líneas reales · canas de ronda · chori, bondiola y tortafritas', 'calleYa', async () => {
    await hold('d', 1600); await tap('e'); await page.waitForTimeout(1600); await hold('a', 1000); await tap('e'); await page.waitForTimeout(1200);
  });

  // el Polaco: seteamos la quest en etapa "carrito" para que aparezca en el andén de La Plata
  await page.evaluate(() => { try { localStorage.setItem('ts_polaco_caso', '1'); localStorage.setItem('ts_polaco_carrito', '1'); localStorage.setItem('ts_polaco_hallado', ''); } catch (e) {} });
  await seg('📻 EL MISTERIO DEL POLACO', 'cada estación tiene su linyera — y el de Constitución desapareció', 'trenYa', async () => {
    await page.waitForTimeout(1200); await tap('e');           // saltar el viaje → andén de La Plata
    await page.waitForTimeout(900);
    await hold('d', 1400); await hold('s', 500); await tap('e');   // hacia el Polaco → lo encontrás
    await page.waitForTimeout(2600);
  });

  await seg('🚶 A PIE A PUENTE SAAVEDRA', 'el Belgrano Norte te deja "cerca"… cerca es un decir', 'saavedraYa', async () => {
    await hold('d', 2900);                                      // Av. Maipú → el puente → la parada
    await tap('e');                                             // ¡llegó el 60 RAMAL ZÁRATE!
    await page.waitForTimeout(6500);                            // el viaje eterno (1h… 2h… Zzz)
  });

  await seg('🚍 ONCE + EL CHEVALLIER DE LUJO', 'la Línea A llega a Plaza Miserere — y el rápido a Zárate tiene AIRE', 'onceYa', async () => {
    await page.waitForTimeout(900);
    await hold('w', 1700); await tap('e');                      // a la dársena → pasaje → arriba del micro
    await page.waitForTimeout(1400);
    await hold('d', 2600);                                      // caminás por el pasillo (ventanillas + aire)
    await tap('e'); await page.waitForTimeout(1500);
  });

  await seg('🌭 LA COSTANERA DE ZÁRATE', 'choris, el club Arsenal… y un torneo de remo al que le falta ALGUIEN', 'zarateYa', async () => {
    await hold('d', 1500); await hold('w', 700); await tap('e');   // el chori de la costanera
    await page.waitForTimeout(1500);
    await hold('d', 2200); await tap('e'); await page.waitForTimeout(1800);   // el tablero: Campana 1-0 en todo
  });

  await seg('🚣 LA FINAL DEL OCHO: VOS DE TIMONEL', 'Campana vs Zárate — [E] al ritmo = ¡BOGA! · esquivá las boyas', 'regataYa', async () => {
    await page.waitForTimeout(3400);                            // 3… 2… 1… ¡LARGARON!
    for (let i = 0; i < 9; i++) {                               // remás al ritmo del metrónomo
      await page.waitForTimeout(i === 0 ? 1060 : 1110);
      await tap('e');
      if (i === 3) await hold('w', 260);                        // timoneás una boya
      if (i === 6) await hold('s', 260);
    }
    await page.waitForTimeout(1200);
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
