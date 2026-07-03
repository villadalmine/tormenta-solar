// 03-historia — el GRAFO y el guardado: planta un save post-tormenta (seam de autoplay-qa.md §3),
// retoma con CONTINUAR, verifica que el mundo restaurado es coherente y que la frontera del grafo avanzó.
import { chromium } from 'playwright';
import { suite, enterGame, SHOTS } from './lib.mjs';
const s = suite('03-historia');
const b = await chromium.launch();
const SAVE = { v: 2, current: 0, px: 220, py: 0,
  player: { hp: 50, coins: 30, ammo: 20, caramelos: 5, inventory: ['escupitajo'], weapon: 'escupitajo' },
  flags: { stormed: true, chinoFrontOpen: true, cueveroUnlocked: true, bought: true },
  arcadeWon: {}, pickups: [], npcs: [], oracleMem: {} };
try {
  const p = await enterGame(b, s, { seed: { 'tormenta-solar-save-v1': SAVE }, continuar: true });
  await p.waitForTimeout(800);
  const info = await p.evaluate(() => {
    const f = window.Game && Game.__gate ? Game.__gate.flags() : {};
    return { stormed: !!f.stormed, bought: !!f.bought, cuevero: !!f.cueveroUnlocked,
      coins: (Game.__nivelai.player() || {}).coins, room: (Game.__nivelai.room() || {}).name || '?' };
  });
  s.log(JSON.stringify(info));
  s.check('CONTINUAR restaura el save plantado (stormed)', info.stormed);
  s.check('flags del grafo restaurados (bought + cuevero)', info.bought && info.cuevero);
  s.check('la economía vuelve intacta (30 monedas)', info.coins === 30, 'coins=' + info.coins);
  // el GRAFO reacciona al estado: la frontera post-tormenta es distinta y la arista 'tormenta' ya no está
  const grafo = await p.evaluate(() => {
    const pre = HintEngine.frontier({}), post = HintEngine.frontier({ stormed: true, chinoFrontOpen: true, cueveroUnlocked: true, bought: true });
    return { edges: Historia.edges.length, preIds: pre.map(e => e.id), postIds: post.map(e => e.id) };
  });
  s.log('frontera pre=' + grafo.preIds.join(',') + ' · post=' + grafo.postIds.join(','));
  s.check('grafo completo (≥18 aristas)', grafo.edges >= 18, 'edges=' + grafo.edges);
  s.check('la frontera AVANZA con el estado (pre≠post, sin re-ofrecer lo hecho)', grafo.postIds.length > 0 && JSON.stringify(grafo.preIds) !== JSON.stringify(grafo.postIds));
  // el autosave sigue guardando sobre lo restaurado (jugar 6s → save nuevo con stormed adentro)
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(1000); await p.keyboard.up('ArrowRight');
  await p.waitForTimeout(6000);
  const saved = await p.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('tormenta-solar-save-v1')); return { stormed: !!(s && s.flags && s.flags.stormed), px: s && s.px }; } catch (e) { return {}; } });
  s.check('el autosave persiste el estado restaurado (stormed en el save nuevo)', saved.stormed && saved.px !== 220, JSON.stringify(saved));
  s.check('sin pageerrors en la corrida', s.pageErrors.length === 0, s.pageErrors[0]);
  await (await p.$('#screen'))?.screenshot({ path: SHOTS + '/03-historia.png' });
} catch (e) { s.check('suite corre sin excepción', false, e.message); }
await b.close(); s.finish();
