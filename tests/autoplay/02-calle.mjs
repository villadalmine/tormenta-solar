// 02-calle — la CALLE se juega: el jugador se mueve, los hints [E] aparecen, y las puertas transicionan de sala.
import { chromium } from 'playwright';
import { suite, enterGame, SHOTS } from './lib.mjs';
const s = suite('02-calle');
const b = await chromium.launch();
try {
  const p = await enterGame(b, s);
  const st = () => p.evaluate(() => ({ room: (window.Game && Game.__nivelai.room() || {}).name || '?', x: Math.round((Game.__nivelai.player() || {}).x || 0), prompt: !document.getElementById('prompt').classList.contains('hidden') }));
  const st0 = await st();
  s.log('arranque en: ' + st0.room + ' x=' + st0.x);
  s.check('arranca en la calle', /florida|calle/i.test(st0.room), st0.room);
  // caminar a la derecha
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(2000); await p.keyboard.up('ArrowRight');
  const st1 = await st();
  s.check('el jugador SE MUEVE (x avanza)', st1.x > st0.x + 100, st0.x + '→' + st1.x);
  // recorrer la peatonal buscando hints [E] (puertas/NPCs) y ENTRAR a un edificio
  let sawPrompt = false, entered = null;
  const inside = () => p.evaluate(street => {
    const room = (Game.__nivelai.room() || {}).name || '?';
    const sub = document.getElementById('floorName').classList.contains('hidden') || document.getElementById('hud').classList.contains('hidden');
    return room !== street ? room : (sub ? 'sub-modo' : null);   // puerta normal O sub-modo (super/tienda/arcade)
  }, st0.room);
  // determinístico: leo las puertas REALES de la calle y camino hasta la x exacta de la primera
  const doors = await p.evaluate(() => ((Game.__nivelai.room() || {}).doors || []).map(d => ({ x: Math.round(d.x), to: d.to, id: d.id })));
  s.log('puertas en la calle: ' + doors.length);
  s.check('la calle tiene puertas en el modelo', doors.length >= 3, 'doors=' + doors.length);
  for (const d of doors.slice(0, 6)) {
    if (entered) break;
    for (let i = 0; i < 60 && !entered; i++) {
      const c = await st();
      if (c.prompt) sawPrompt = true;
      const dx = d.x - c.x;
      if (Math.abs(dx) < 14) { await p.keyboard.press('e'); await p.waitForTimeout(500); entered = await inside(); break; }
      const k = dx > 0 ? 'ArrowRight' : 'ArrowLeft';
      await p.keyboard.down(k); await p.waitForTimeout(Math.min(500, Math.max(80, Math.abs(dx)))); await p.keyboard.up(k);
    }
  }
  s.check('aparecen hints de interacción [E] en la peatonal', sawPrompt);
  s.check('una puerta TRANSICIONA de sala', !!entered, 'entró a: ' + entered);
  if (entered) {
    // volver a la calle: Esc cierra sub-modos; en salas, la puerta de vuelta con [E]
    let back = false;
    for (let i = 0; i < 16 && !back; i++) {
      await p.keyboard.press('Escape'); await p.waitForTimeout(250);
      await p.keyboard.press('e'); await p.waitForTimeout(350);
      const c = await st();
      if (c.room === st0.room && !(await inside())) { back = true; break; }
      await p.keyboard.down(i % 2 ? 'ArrowRight' : 'ArrowLeft'); await p.waitForTimeout(300); await p.keyboard.up(i % 2 ? 'ArrowRight' : 'ArrowLeft');
    }
    s.check('se vuelve a la calle (Esc/puerta)', back);
  }
  s.check('sin pageerrors en la corrida', s.pageErrors.length === 0, s.pageErrors[0]);
  await (await p.$('#screen'))?.screenshot({ path: SHOTS + '/02-calle.png' });
} catch (e) { s.check('suite corre sin excepción', false, e.message); }
await b.close(); s.finish();
