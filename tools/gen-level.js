// gen-level.js — F1 del modelo v2: deriva levels/nivel-1.json del Level.build() REAL (fiel por
// construcción, re-ejecutable). Patrón gen-historia/gen-dialogos. Reusa el sandbox del e2e para cargar
// level.js (con Art/Dialogos mockeados). NO toca el runtime del juego. Uso: node tools/gen-level.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// requiere e2e.js: carga TODOS los scripts en el sandbox (NO corre el smoke porque require.main!==module)
const { sandbox } = require('../tests/e2e.js');
const TILE = vm.runInContext('Art.TILE', sandbox);
const rooms = vm.runInContext('Level.build()', sandbox);

const r3 = v => Math.round(v * 1000) / 1000;            // 3 decimales (evita ruido float, preserva fracciones)
const tx = px => r3((px - TILE / 2) / TILE);             // pixel (feet, centrado) → tile (EXACTO, fraccionario)
const ty = py => r3(py / TILE);
const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'sala';

// ids de sala estables y únicos (slug del nombre)
const used = {};
const roomId = rooms.map(r => { let id = slug(r.name); if (used[id] != null) id += '-' + (++used[slug(r.name)]); else used[slug(r.name)] = 0; return id; });

// plataformas a partir del map (tiles sólidos interiores por encima del piso)
function platforms(r) {
  const out = [];
  for (let y = 0; y < r.gTop; y++) {
    let x = 1;
    while (x < r.w - 1) {
      if (r.map[y][x] === 1) { let w = 0; while (x + w < r.w - 1 && r.map[y][x + w] === 1) w++; out.push([x, y, w]); x += w; }
      else x++;
    }
  }
  return out;
}

// ENTITY-MODEL (§6.3 paso 3): la entidad v2 referencia su FICHA y trae su comportamiento de tormenta
// (fuente única). Leemos persona-id → tormenta de specs/nivel-1/personajes/*.md.
const ficheTormenta = {};
{
  const dir = path.join(__dirname, '..', 'specs', 'nivel-1', 'personajes');
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.md'))) {
    const pm = fs.readFileSync(path.join(dir, f), 'utf8').match(/##\s*Personalidad[\s\S]*?(?=\n##\s|$)/i);
    if (!pm) continue;
    const id = (pm[0].match(/\*\*Persona de chat:\*\*[^\n]*`([a-z]+)`/i) || [])[1];
    const t = (pm[0].match(/\*\*Tormenta:\*\*\s*([^\n]+)/i) || [])[1];
    if (id && t) ficheTormenta[id] = t.trim();
  }
}

function entities(r, ri) {
  const E = [];
  let n = 0;
  const id = t => roomId[ri] + '/' + t + (n++);
  const pos = (e, x, y) => { e.x = tx(x); const t = ty(y); if (t !== r.gTop) e.y = t; return e; };

  if (r.playerStart) E.push(pos({ id: id('marker'), tipo: 'marker', render: { type: 'spawn' } }, r.playerStart.x, r.playerStart.y));
  if (r.goal) E.push(pos({ id: id('marker'), tipo: 'marker', render: { type: 'goal' } }, r.goal.x, r.goal.y));
  if (r.buy) E.push(pos({ id: id('marker'), tipo: 'marker', render: { type: 'buy' } }, r.buy.x, r.buy.y));

  for (const d of r.doors || []) {
    const e = pos({ id: roomId[ri] + '/door-' + slug(d.id), tipo: 'door', render: { type: d.art || 'door' } }, d.x, d.y);
    if (d.facade) e.render.facade = d.facade;
    if (d.collapsesOnStorm) e.collapsesOnStorm = true;   // F4: colapso por tormenta = atributo del modelo (ex COLLAPSED hardcode)
    if (d.gate) e.gate = d.gate;                         // F4: gating declarativo (ex ifs por-id)
    if (d.label) e.label = d.label;
    if (d.inward != null) e.inward = d.inward;             // para reproducir el spawn al cruzar (wire)
    if (d.to != null) { e.link = { to: roomId[d.to] }; if (d.at) e.link.at = { x: tx(d.at.x), y: ty(d.at.y) }; }   // destino + spawn al cruzar
    E.push(e);
  }
  for (const m of r.npcs || []) {
    const e = pos({ id: id('npc'), tipo: 'npc', render: { sprite: m.sprite } }, m.x, m.y);
    if (m.name) e.name = m.name;
    const it = {};
    for (const k of ['action', 'want', 'persona', 'sells', 'lines', 'hint', 'follow', 'oracle']) if (m[k] != null) it[k] = m[k];
    if (Object.keys(it).length) e.interact = it;
    if (m.ambient != null) e.ambient = m.ambient;   // NPCs vivos: componente declarativo (chusmerío)
    if (m.social != null) e.social = m.social;       // grafo social (conoce/rival) — aristas autorables
    if (m.persona && !m.action) e.chat = { persona: m.persona };
    if (m.persona) { e.fiche = m.persona; if (ficheTormenta[m.persona]) e.comportamiento = { tormenta: ficheTormenta[m.persona] }; }   // §6.3-3: entidad → ficha (alma/comportamiento)
    if (m.dialog) e.dialogue = { text: m.dialog };
    if (m.invisible) e.lifecycle = { invisible: true };
    E.push(e);
  }
  for (const d of r.decor || []) { const e = pos({ id: id('decor'), tipo: 'decor', render: { type: d.type } }, d.x, d.feetY); if (d.ad) e.ad = (d.ad === true ? {} : d.ad); E.push(e); }   // cartel publicitario = componente `ad`
  for (const mc of r.machines || []) { const e = pos({ id: id('machine'), tipo: 'machine', render: { game: mc.game }, interact: { action: 'machine' } }, mc.x, mc.y); if (mc.name) e.name = mc.name; E.push(e); }
  for (const c of r.cueveros || []) { const e = pos({ id: id('cuevero'), tipo: 'cuevero', render: { sprite: c.sprite }, interact: { action: 'cuevero' } }, c.x, c.y); if (c.name) e.name = c.name; if (c.outcome) e.interact.outcome = c.outcome; if (c.to != null) e.interact.to = roomId[c.to]; if (c.dialog) e.dialogue = { text: c.dialog }; E.push(e); }
  for (const p of r.pickups || []) { const give = { item: p.type }; if (p.amount != null) give.amount = p.amount; E.push(pos({ id: id('pickup'), tipo: 'pickup', give }, p.x, p.y)); }
  for (const en of r.enemies || []) { const e = pos({ id: id('enemy'), tipo: 'enemy', combat: { type: en.type } }, en.x, en.y); if (en.look) e.combat.look = en.look; if (en.dormant) e.combat.dormant = true; E.push(e); }
  return E;
}

// QUESTS como DATA del nivel (v2: la mecánica se compone con primitivas nombradas; la IA podrá autorar quests acá).
// Config + nombres de hooks (onGive/onReport/onGreet/onHint); las primitivas (código) viven en game.js QUEST_PRIMS.
const QUESTS = {
  news:    { id: 'news',    scope: 'run', giver: 'oraculo', chance: 0.35, reward: { caramelos: 3 }, penalty: { coins: 10 }, ask: 'g.cine.questAsk', ok: 'g.cine.questOk', lie: 'g.cine.questLie', remind: 'g.cine.questRemind', onGive: 'newsGive', onReport: 'newsReport', onHint: 'newsHint' },
  mundial: { id: 'mundial', scope: 'run', giver: 'hincha',  reward: { caramelos: 5 }, ask: 'g.mundial.pregunta', back: 'g.mundial.gracias', remind: 'g.mundial.recorda', onGreet: 'mundialGreet', onReport: 'mundialReport' },
};

// REGLAS del nivel como DATA (§6.97): el loop de supervivencia (post-tormenta) deja de ser magic-numbers en
// game.js. La máquina de niveles podrá ajustar dificultad por nivel sin tocar el motor. Fallback inline = v1.
const RULES = {
  survival: { decayEverySec: 30, decayHp: 3, fullHp: 100, sleepCoinKeepMin: 0.3, sleepCoinKeepMax: 0.7 },
};

const model = {
  schemaVersion: 1,
  id: 'nivel-1',
  nombre: 'Florida y Lavalle',
  seed: 'nivel-1',
  rules: RULES,                    // reglas del nivel (supervivencia); game.js las lee con fallback inline
  quests: Object.values(QUESTS),   // array (lo que pide el schema); game.js lo mapea por id
  rooms: rooms.map((r, ri) => {
    const room = { id: roomId[ri], nombre: r.name, theme: r.theme, w: r.w };
    if (r.tags && r.tags.length) room.tags = r.tags;
    if (r.light != null) room.light = r.light;
    if (r.stormable) room.stormable = true;
    const pl = platforms(r); if (pl.length) room.platforms = pl;
    room.entities = entities(r, ri);
    return room;
  }),
};

fs.writeFileSync(path.join(__dirname, '..', 'levels', 'nivel-1.json'), JSON.stringify(model, null, 2) + '\n');
// wrapper JS para el browser (script sync, mismo patrón que dialogos.js/historia.js): lo consume mundo.js (v2)
const js = '// level-data.js — GENERADO por tools/gen-level.js (NO editar a mano). El Nivel 1 como data (modelo v2).\n'
  + '// Lo consume js/mundo.js cuando el motor v2 está activo (⚙ Opciones → Motor). Ver specs/modelo-de-entidades.md.\n'
  + 'window.LEVEL1 = ' + JSON.stringify(model) + ';\n';
fs.writeFileSync(path.join(__dirname, '..', 'js', 'level-data.js'), js);
const nEnt = model.rooms.reduce((s, r) => s + r.entities.length, 0);
console.log('✓ escrito levels/nivel-1.json + js/level-data.js — ' + model.rooms.length + ' salas, ' + nEnt + ' entidades');
