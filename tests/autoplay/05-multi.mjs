// 05-multi — MULTIJUGADOR real con 2 navegadores: se VEN en Lavalle y el chat privado LLEGA (el bug histórico).
import { chromium } from 'playwright';
import { suite, enterGame, SHOTS } from './lib.mjs';
const s = suite('05-multi');
const b = await chromium.launch();
try {
  const A = await enterGame(b, s, { toLavalle: true });
  await A.waitForTimeout(400);
  const B = await enterGame(b, s, { toLavalle: true });
  await B.waitForTimeout(2600);
  const peers = k => k.evaluate(() => window.Salon && window.Salon.getPeers ? [...window.Salon.getPeers().values()].map(p => p.nick) : []);
  const pa = await peers(A), pb = await peers(B);
  s.log('A ve: ' + JSON.stringify(pa) + ' · B ve: ' + JSON.stringify(pb));
  s.check('A ve a B en el piquete', pa.length >= 1);
  s.check('B ve a A en el piquete', pb.length >= 1);
  // B abre chat con [E] y manda → a A se le AUTO-ABRE con el mensaje
  await B.keyboard.down('e'); await B.waitForTimeout(200); await B.keyboard.up('e'); await B.waitForTimeout(500);
  const inp = await B.$('#chat-input');
  s.check('B abre el chat privado con [E]', !!inp && await B.evaluate(() => !document.getElementById('chat').classList.contains('hidden')));
  if (inp) { await inp.click(); await B.keyboard.type('qa ping'); await B.waitForTimeout(120); await B.keyboard.press('Enter'); }
  await B.waitForTimeout(2500);
  const rx = await A.evaluate(() => ({ vis: !document.getElementById('chat').classList.contains('hidden'), log: (document.getElementById('chat-log') || {}).textContent || '' }));
  if (!s.check('A RECIBE el mensaje (auto-abre)', rx.vis && rx.log.includes('qa ping'), JSON.stringify(rx).slice(0, 120)))
    await (await A.$('#screen'))?.screenshot({ path: SHOTS + '/05-multi-fail.png' });
  s.check('sin pageerrors en la corrida', s.pageErrors.length === 0, s.pageErrors[0]);
} catch (e) { s.check('suite corre sin excepción', false, e.message); }
await b.close(); s.finish();
