import { chromium } from 'playwright';
const URL = 'https://tormenta-solar.cybercirujas.club/';
const b = await chromium.launch();
const WRAP = `(() => { const OE = window.EventSource; window.__ev = []; window.EventSource = function(u, o){ const es = new OE(u, o); window.__ev.push('OPEN '+u); const add = es.addEventListener.bind(es);
  for (const t of ['peer-join','peer-pos','whisper','say','table-start','table-update','error']) add(t, e => { if(t!=='peer-pos') window.__ev.push(t+' '+((e&&e.data)||'').slice(0,60)); });
  return es; }; window.EventSource.prototype = OE.prototype; })();`;
async function enter(name, wrap) {
  const ctx = await b.newContext({ viewport: { width: 900, height: 560 } });
  if (wrap) await ctx.addInitScript(WRAP);
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log(`[${name}] PAGEERROR`, e.message));
  await p.goto(URL, { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  (await p.$('#startBtn'))?.click(); await p.waitForTimeout(600);
  (await p.$('#screen'))?.click();
  await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(2600); await p.keyboard.up('ArrowLeft');
  return p;
}
const A = await enter('A', true); await A.waitForTimeout(300);
const B = await enter('B', false); await B.waitForTimeout(2000);
await B.keyboard.down('e'); await B.waitForTimeout(200); await B.keyboard.up('e'); await B.waitForTimeout(400);
const inp = await B.$('#chat-input');
if (inp) { await inp.click(); await B.keyboard.type('mensaje de B'); await B.waitForTimeout(120); await B.keyboard.press('Enter'); }
await B.waitForTimeout(2500);
console.log('A EventSource recibió:', JSON.stringify(await A.evaluate(() => window.__ev)));
await b.close();
