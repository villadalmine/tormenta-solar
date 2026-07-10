// shots-novedades.mjs — CAPTURAS para el blog de Novedades (info/novedades.html).
// Arranca el juego en Chromium (Playwright), salta a cada feature con los hooks de DEBUG (data-dbg) y guarda
// un PNG del canvas por feature en info/img/novedades/. Correr tras un cambio visual:
//   node tests/shots-novedades.mjs
// (necesita: npm install && npx playwright install chromium)
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'info', 'img', 'novedades');
const PORT = 8801;
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

await mkdir(OUT, { recursive: true });
const srv = await serve();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

// arrancar con DEBUG on + nick puesto (no molesta el prompt), y arrancar partida
await page.addInitScript(() => { try { localStorage.setItem('ts_debug', '1'); localStorage.setItem('ts_nick', 'Prensa'); localStorage.setItem('ts_lang', 'es'); } catch (e) {} });
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
await page.click('#startBtn');
await page.waitForTimeout(1200);

const shotCanvas = async (name) => {
  const el = await page.$('#screen');
  await el.screenshot({ path: path.join(OUT, name + '.png') });
  console.log('  📸 ' + name + '.png');
};
// dispara una acción de debug (abre opciones → clic en el botón data-dbg → la acción cierra el overlay)
const dbg = async (action) => {
  await page.evaluate(() => { const b = document.getElementById('optBtn'); if (b) b.click(); });
  await page.waitForTimeout(200);
  await page.evaluate((a) => { const el = document.querySelector('[data-dbg="' + a + '"]'); if (el) el.click(); }, action);
  await page.waitForTimeout(900);
};

try {
  await shotCanvas('01-calle');                 // la peatonal (Florida y Lavalle)
  // Cabildo / Plaza de Mayo con la escarapela puesta → aparecen French & Beruti
  await page.evaluate(() => { try { localStorage.setItem('ts_escarapela', '1'); } catch (e) {} });
  await dbg('plazaYa');   await shotCanvas('02-plaza-cabildo');
  await dbg('subteYa');   await shotCanvas('03-subte');
  await dbg('constiYa');  await shotCanvas('04-constitucion');
  // v359: caminar al puesto de DIARIOS y leer el titular (= la pista del grafo)
  await page.keyboard.down('d'); await page.waitForTimeout(1350); await page.keyboard.up('d');
  await page.keyboard.down('w'); await page.waitForTimeout(700);  await page.keyboard.up('w');
  await page.keyboard.down('e'); await page.waitForTimeout(150);  await page.keyboard.up('e');
  await page.waitForTimeout(400); await shotCanvas('14-diario');
  // v362: la CALLE de Constitución (bondis + canas + puestos)
  await dbg('calleYa'); await page.waitForTimeout(2500); await shotCanvas('16-calle');
  await dbg('retiroYa');  await shotCanvas('05-retiro');
  // v359: caminar a la LIBRERÍA y pedir un verso del Martín Fierro (poco 'w': ni la salida ni el café)
  await page.keyboard.down('a'); await page.waitForTimeout(1400); await page.keyboard.up('a');
  await page.keyboard.down('w'); await page.waitForTimeout(270);  await page.keyboard.up('w');
  await page.keyboard.down('e'); await page.waitForTimeout(150);  await page.keyboard.up('e');
  await page.waitForTimeout(400); await shotCanvas('15-libreria');
  await dbg('villaYa');   await shotCanvas('06-villa31');
  await dbg('trenYa');    await page.waitForTimeout(1000); await shotCanvas('07-tren-viaje');   // el viaje (paisaje que scrollea)
  await page.waitForTimeout(4200); await shotCanvas('08-tren-anden');                          // el andén de destino
  // v360: EL POLACO hallado en el andén de La Plata (quest en etapa 'carrito')
  await page.evaluate(() => { try { localStorage.setItem('ts_polaco_caso', '1'); localStorage.setItem('ts_polaco_carrito', '1'); } catch (e) {} });
  await dbg('trenYa'); await page.waitForTimeout(800);
  await page.keyboard.down('e'); await page.waitForTimeout(150); await page.keyboard.up('e');   // saltear el viaje
  await page.waitForTimeout(600);
  await page.keyboard.down('d'); await page.waitForTimeout(1360); await page.keyboard.up('d');
  await page.keyboard.down('s'); await page.waitForTimeout(280);  await page.keyboard.up('s');
  await page.keyboard.down('e'); await page.waitForTimeout(150); await page.keyboard.up('e');   // [E] ¡es el Polaco!
  await page.waitForTimeout(500); await shotCanvas('17-polaco');
  await page.evaluate(() => { try { localStorage.removeItem('ts_polaco_caso'); localStorage.removeItem('ts_polaco_carrito'); localStorage.removeItem('ts_polaco_hallado'); } catch (e) {} });
  await dbg('ballesterYa'); await page.waitForTimeout(5000); await shotCanvas('09-ballester');  // Villa Ballester: el maquinista curda
  await dbg('sanmartinYa'); await page.waitForTimeout(5000); await shotCanvas('10-piquete-uba'); // el piquete de la UBA + el Monumental
  await dbg('canchaYa');    await page.waitForTimeout(900);  await shotCanvas('11-monumental');  // adentro del clásico River-Boca
  await dbg('campanaYa');   await page.waitForTimeout(900);  await shotCanvas('12-campana');     // Campana: escalinata + banda violeta
  // caminar hasta la puerta del estadio y entrar → la popular violeta de Dálmine vs CADU
  await page.keyboard.down('d'); await page.waitForTimeout(2600); await page.keyboard.up('d');
  await page.keyboard.down('e'); await page.waitForTimeout(150); await page.keyboard.up('e');
  await page.waitForTimeout(800); await shotCanvas('13-dalmine');
  if (errors.length) console.error('⚠️  errores JS durante las capturas:\n - ' + errors.join('\n - '));
  console.log('✓ capturas de novedades en info/img/novedades/');
} catch (e) {
  console.error('❌ falló la captura: ' + e.message); process.exitCode = 1;
} finally {
  await browser.close(); srv.close();
}
