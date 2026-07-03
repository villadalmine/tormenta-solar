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
