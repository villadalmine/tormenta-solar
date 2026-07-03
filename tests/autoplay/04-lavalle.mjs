// 04-lavalle — el arco del piquete: entrada REAL caminando + la lógica del sub-modo (seam: 5 juegos ganados
// plantados en localStorage → barricada abierta → salida al Obelisco → vuelta), con los módulos REALES de prod.
import { chromium } from 'playwright';
import { suite, enterGame, SHOTS } from './lib.mjs';
const s = suite('04-lavalle');
const b = await chromium.launch();
const WON = { corte: true, soga: true, bombo: true, olla: true, pancarta: true };
try {
  const p = await enterGame(b, s, { seed: { ts_piqueteWon: WON, ts_nick: 'QA·bot' }, toLavalle: true });
  await p.waitForTimeout(1200);
  // entrada real: el juego está en el sub-modo (canvas renderiza) y el salón te unió al espacio lavalle
  const live = await p.evaluate(() => ({ salon: !!(window.Salon && Salon.getPeers), lavalle: typeof Lavalle !== 'undefined', obelisco: typeof Obelisco !== 'undefined' }));
  s.check('módulos del arco cargados (Lavalle/Obelisco/Salon)', live.salon && live.lavalle && live.obelisco);
  const blank = await p.evaluate(() => { const c = document.getElementById('screen'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 397 * 4) if (d[i] || d[i + 1] || d[i + 2]) n++; return n < 4; });
  s.check('el piquete renderiza (canvas no en blanco)', !blank);
  await (await p.$('#screen'))?.screenshot({ path: SHOTS + '/04-lavalle.png' });
  // la LÓGICA del arco con los módulos reales: allWon → fiesta → subir → obelisco → bajar → vuelta
  const arco = await p.evaluate(() => {
    const won = { corte: true, soga: true, bombo: true, olla: true, pancarta: true };
    const cv = document.createElement('canvas'); cv.width = 960; cv.height = 540; const ctx = cv.getContext('2d');
    const lv = Lavalle.create({ intro: false, allWon: true, stormed: false, won, juramento: false });
    const step = (keys, n) => { for (const k of keys) Input.keys[k] = true; for (let i = 0; i < n && !lv.done; i++) { lv.update(0.05); lv.draw(ctx, 960, 540); } for (const k of keys) Input.keys[k] = false; };
    // el HUECO del corte está en x≈9CS: subir + tantear [E] (arranca el juramento→fiesta) y seguir subiendo
    for (let round = 0; round < 50 && !lv.done; round++) {
      step(['arrowup'], 30);
      step([round % 4 < 2 ? 'arrowleft' : 'arrowright'], 8);   // barrido horizontal buscando el hueco
      step(['e'], 3); step([], 6);                             // tap E (juramento) + soltar
    }
    const out = { lvDone: lv.done, lvExit: lv.exitTo };
    const ob = Obelisco.create();
    for (let i = 0; i < 40; i++) { ob.update(0.05); ob.draw(ctx, 960, 540); }
    Input.keys['arrowup'] = true; for (let i = 0; i < 30; i++) ob.update(0.05); Input.keys['arrowup'] = false;
    Input.keys['arrowdown'] = true; for (let i = 0; i < 120 && !ob.done; i++) ob.update(0.05); Input.keys['arrowdown'] = false;
    out.obDone = ob.done; out.obExit = ob.exitTo;
    return out;
  });
  s.log(JSON.stringify(arco));
  s.check('con los 5 juegos ganados la barricada ABRE → salís al Obelisco', arco.lvDone && arco.lvExit === 'obelisco', JSON.stringify(arco));
  s.check('del Obelisco se VUELVE al piquete', arco.obDone && arco.obExit === 'lavalle', JSON.stringify(arco));
  s.check('sin pageerrors en la corrida', s.pageErrors.length === 0, s.pageErrors[0]);
} catch (e) { s.check('suite corre sin excepción', false, e.message); }
await b.close(); s.finish();
