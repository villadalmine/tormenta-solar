// 01-boot — el juego CARGA: 0 errores de JS, versión visible, el grafo completo, el mundo renderiza.
import { chromium } from 'playwright';
import { suite, enterGame, SHOTS } from './lib.mjs';
const s = suite('01-boot');
const b = await chromium.launch();
try {
  const p = await enterGame(b, s);
  await p.waitForTimeout(1500);
  s.check('carga sin pageerrors', s.pageErrors.length === 0, s.pageErrors[0]);
  const info = await p.evaluate(() => ({
    ver: ((document.querySelector('script[src*="?v="]') || {}).src || '').match(/v=(\d+)/)?.[1],
    edges: (window.Historia && window.Historia.edges || []).length,
    salon: !!(window.Salon && window.Salon.enabled),
    eventos: !!window.Eventos, mapa: !!window.Mapa,
  }));
  s.log('versión v' + info.ver);
  s.check('versión cache presente', !!info.ver);
  s.check('grafo de historia completo (≥18 aristas)', info.edges >= 18, 'edges=' + info.edges);
  s.check('módulos clave cargados (Salon/Eventos/Mapa)', info.salon && info.eventos && info.mapa);
  // el canvas no está en blanco (render real)
  const blank = await p.evaluate(() => { const c = document.getElementById('screen'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 397 * 4) if (d[i] || d[i + 1] || d[i + 2]) n++; return n < 4; });
  s.check('el canvas renderiza (no está en blanco)', !blank);
  await (await p.$('#screen'))?.screenshot({ path: SHOTS + '/01-boot.png' });
} catch (e) { s.check('suite corre sin excepción', false, e.message); }
await b.close(); s.finish();
