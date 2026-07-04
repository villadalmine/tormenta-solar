// 07-mapas — los 3 mapas: el automap [TAB] REAL (overlay + 51 salas ancladas), el plano del búnker
// (colocar/validar/quitar) y el globo — con los módulos reales servidos por prod.
import { chromium } from 'playwright';
import { suite, enterGame, SHOTS } from './lib.mjs';
const s = suite('07-mapas');
const b = await chromium.launch();
try {
  const p = await enterGame(b, s);
  // TAB abre el automap (esconde el HUD) y TAB lo cierra
  await p.keyboard.press('Tab'); await p.waitForTimeout(600);
  const abierto = await p.evaluate(() => ({ hudOculto: document.getElementById('hud').classList.contains('hidden'),
    nodos: (window.Mapa && Mapa.model && Mapa.model.nodes || []).length,
    anclados: (window.Mapa && Mapa.model && Mapa.model.nodes || []).filter(n => n.anchor != null).length }));
  s.check('[TAB] abre el automap (HUD se esconde)', abierto.hudOculto);
  s.check('el mapa ancla TODAS las salas (51+)', abierto.nodos >= 51 && abierto.anclados === abierto.nodos, abierto.anclados + '/' + abierto.nodos);
  await (await p.$('#screen'))?.screenshot({ path: SHOTS + '/07-mapa-tab.png' });
  // la VISTA GENERAL (v300): cajones por edificio, SIN solapes (el bot mira lo que el dueño mira)
  const ov = await p.evaluate(() => {
    const cv = document.getElementById('screen');
    const o = Mapa.overview(cv.width, cv.height);
    const bs = o.boxes.map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h, name: b.b.name }));
    let solapes = 0;
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], c = bs[j];
      if (a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h) solapes++;
    }
    return { n: bs.length, solapes, tab: !!(Mapa.hitTest(cv.width, cv.height, { zoom: null, mx: 150, my: 40, visited: new Set() }) || {}).tab };
  });
  s.check('vista general: cajones por edificio (≥8) SIN solapes', ov.n >= 8 && ov.solapes === 0, JSON.stringify(ov));
  const piezas = await p.evaluate(() => { const cv = document.getElementById('screen');
    const o = Mapa.overview(cv.width, cv.height).boxes, k = Mapa.sky(cv.width, cv.height).boxes;
    const has = (list, rx) => list.some(b => rx.test((b.b && b.b.name) || '') || b.gateway);
    return { chinoOv: o.some(b => /chino|s[úu]per/i.test((b.b && b.b.name) || '')), chinoSky: k.some(b => /chino|s[úu]per/i.test((b.b && b.b.name) || '')),
      gwOv: o.some(b => b.gateway), gwSky: k.some(b => b.gateway) }; });
  s.check('el CHINO está en la manzana y el skyline', piezas.chinoOv && piezas.chinoSky, JSON.stringify(piezas));
  s.check('la compuerta ⛏️ SUBSUELOS está en ambas vistas', piezas.gwOv && piezas.gwSky, JSON.stringify(piezas));
  s.check('las pestañas responden al hitTest', ov.tab);
  const subteTab = await p.evaluate(() => { const cv = document.getElementById('screen');
    return (Mapa.hitTest(cv.width, cv.height, { zoom: null, mx: 360, my: 40, visited: new Set() }) || {}).tab === 'subte'; });
  s.check('la pestaña SUBTE 🚇 existe (preview)', subteTab);
  const boca = await p.evaluate(() => (Mapa.model.bocas || []).length);
  s.check('la boca del subte está en el mapa', boca >= 1, 'bocas=' + boca);
  await (await p.$('#screen'))?.screenshot({ path: SHOTS + '/07-vista-general.png' });
  // [1] LA CUADRA (skyline): siluetas por edificio con altura = pisos
  await p.keyboard.down('1'); await p.waitForTimeout(150); await p.keyboard.up('1'); await p.waitForTimeout(300);
  const sky = await p.evaluate(() => { const cv = document.getElementById('screen'); const k = Mapa.sky(cv.width, cv.height);
    const bs = (k.boxes || []).filter(b => b.up); let sol = 0;
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const a = bs[i], c = bs[j];
      if (a.x < c.x + c.w - 1 && c.x < a.x + a.w - 1 && a.y < c.y + c.h - 1 && c.y < a.y + a.h - 1) sol++; }
    return { n: (k.boxes || []).length, sol }; });
  s.check('skyline: siluetas por edificio (≥8) SIN solapes', sky.n >= 8 && sky.sol === 0, JSON.stringify(sky));
  await (await p.$('#screen'))?.screenshot({ path: SHOTS + '/07-skyline.png' });
  // [2] SUBSUELOS (tecla sostenida: un tap real dura >1 frame)
  await p.keyboard.down('3'); await p.waitForTimeout(150); await p.keyboard.up('3'); await p.waitForTimeout(300);
  await (await p.$('#screen'))?.screenshot({ path: SHOTS + '/07-subsuelos.png' });
  await p.keyboard.down('2'); await p.waitForTimeout(150); await p.keyboard.up('2'); await p.waitForTimeout(300);
  await p.keyboard.press('Tab'); await p.waitForTimeout(400);
  s.check('[TAB] cierra el automap (HUD vuelve)', await p.evaluate(() => !document.getElementById('hud').classList.contains('hidden')));
  // el PLANO del búnker (módulo real): conectado OK, desconectado falla, quitar devuelve
  const plano = await p.evaluate(() => {
    const cv = document.createElement('canvas'); cv.width = 960; cv.height = 540; const ctx = cv.getContext('2d');
    const bm = BunkerMapa.create({ player: { coins: 100 } });
    const okCerca = bm.placeAt(1, 3, 0);
    for (let i = 0; i < 30; i++) { bm.update(0.016); bm.draw(ctx, 960, 540); }
    const failLejos = bm.placeAt(6, 6, 0);
    const okQuitar = bm.removeAt(1, 3);
    return { okCerca, failLejos, okQuitar };
  });
  s.check('plano del búnker: colocar conectado ✓ / desconectado ✗ / quitar ✓', plano.okCerca && !plano.failLejos && plano.okQuitar, JSON.stringify(plano));
  // el GLOBO (módulo real): crea, gira y dibuja sin crash
  const globo = await p.evaluate(() => {
    if (typeof Globo === 'undefined' || !Globo.create) return { skip: true };
    const cv = document.createElement('canvas'); cv.width = 960; cv.height = 540; const ctx = cv.getContext('2d');
    try { const g = Globo.create({}); for (let i = 0; i < 60; i++) { g.update(0.016); g.draw(ctx, 960, 540); } return { ok: true }; }
    catch (e) { return { ok: false, err: e.message }; }
  });
  if (globo.skip) s.warn('globo salteado', 'Globo no expuesto en window');
  else s.check('el globo gira 60 frames sin crash', globo.ok, globo.err);
  s.check('sin pageerrors en la corrida', s.pageErrors.length === 0, s.pageErrors[0]);
} catch (e) { s.check('suite corre sin excepción', false, e.message); }
await b.close(); s.finish();
