// gen-og.mjs — renderiza la imagen de preview social (Open Graph) 1200×630 con Playwright/Chromium,
// en el estilo retro/CRT del juego. Salida: info/img/og.png. Correr: node tools/gen-og.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const VARIANTS = [
  { out: 'og.png',    title: 'TORMENTA SOLAR', tag: 'Comprás dólares en Florida y Lavalle… y el sol se apaga.',
    b: ['★ Chat IA GRATIS', 'Shooter porteño', 'open source · self-hosted'] },
  { out: 'og.en.png', title: 'SOLAR STORM',    tag: 'You buy dollars on Florida &amp; Lavalle… and the sun goes out.',
    b: ['★ FREE AI chat', 'Buenos Aires shooter', 'open source · self-hosted'] },
];

const tpl = (v) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden}
body{background:#05080c;color:#cfd8dc;font-family:"DejaVu Sans Mono","Courier New",monospace;
  background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.03) 0 1px,transparent 1px 3px);
  display:flex;flex-direction:column;justify-content:center;align-items:center;padding:60px;position:relative}
.sun{position:absolute;top:64px;right:86px;width:96px;height:96px;border-radius:50%;
  background:radial-gradient(circle at 50% 45%,#FFE082,#FFB300 60%,#FF7043);
  box-shadow:0 0 60px 12px rgba(255,179,0,.55)}
h1{font-size:118px;letter-spacing:6px;color:#7CFC00;text-shadow:0 0 28px rgba(124,252,0,.45);line-height:1}
.tag{margin-top:26px;font-size:34px;color:#FFE082;text-align:center;max-width:1000px}
.row{margin-top:46px;display:flex;gap:18px}
.b{font-size:24px;padding:12px 26px;border:2px solid #1f3a4d;border-radius:10px;background:rgba(6,14,22,.9)}
.b:nth-child(1){border-color:#7CFC00;color:#7CFC00}
.b:nth-child(2){border-color:#4FC3F7;color:#4FC3F7}
.b:nth-child(3){color:#8aa0b0}
.foot{position:absolute;bottom:42px;font-size:22px;color:#8aa0b0}
</style></head><body>
  <div class="sun"></div>
  <h1>${v.title}</h1>
  <div class="tag">${v.tag}</div>
  <div class="row">${v.b.map(x => `<div class="b">${x}</div>`).join('')}</div>
  <div class="foot">villadalmine.github.io/tormenta-solar</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const v of VARIANTS) {
  const out = path.join(ROOT, 'info', 'img', v.out);
  await page.setContent(tpl(v), { waitUntil: 'networkidle' });
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  console.log('OG escrita en', out);
}
await browser.close();
