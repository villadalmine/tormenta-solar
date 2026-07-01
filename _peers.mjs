import { chromium } from 'playwright';
const URL = 'https://tormenta-solar.cybercirujas.club/';
const b = await chromium.launch();
async function enter(name){ const ctx=await b.newContext({viewport:{width:900,height:560}}); const p=await ctx.newPage();
  p.on('pageerror',e=>console.log(`[${name}] ERR`,e.message));
  await p.goto(URL,{waitUntil:'networkidle'}); await p.waitForTimeout(400);
  (await p.$('#startBtn'))?.click(); await p.waitForTimeout(600); (await p.$('#screen'))?.click();
  await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(2600); await p.keyboard.up('ArrowLeft'); return p; }
const A=await enter('A'); await A.waitForTimeout(300);
const B=await enter('B'); await B.waitForTimeout(2000);
const inp=await B.$('#chat-input'); await B.keyboard.down('e'); await B.waitForTimeout(200); await B.keyboard.up('e'); await B.waitForTimeout(400);
if(inp){await inp.click(); await B.keyboard.type('hola A'); await B.waitForTimeout(120); await B.keyboard.press('Enter');}
await B.waitForTimeout(2500);
console.log('A __ts_wh:', JSON.stringify(await A.evaluate(()=>window.__ts_wh||'NUNCA LLAMADO')));
console.log('A chat vis:', await A.evaluate(()=>{const c=document.getElementById('chat');return c&&!c.classList.contains('hidden');}));
await b.close();
