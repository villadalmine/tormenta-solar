// tests/tienda.js — TIENDAS GENERADAS (galería de la cueva): NivelAI.generateShop(rubro) arma un interior con
// clientela + mercadería, y el sub-modo Tienda cobra/da bien. Uso: node tests/tienda.js
const path = require('path');
global.Playable = require(path.join(__dirname, '..', 'js', 'playable.js'));
const NivelAI = require(path.join(__dirname, '..', 'js', 'nivelai.js'));
const Tienda = require(path.join(__dirname, '..', 'js', 'tienda.js'));

const out = [];
const ok = (c, m) => { if (!c) out.push('FAIL ' + m); };

// 1) generateShop arma una escena válida para CADA rubro de la galería (+ un rubro inexistente cae al default)
for (const id of ['sexshop', 'comida-rara', 'masajes', 'tenebroso', 'no-existe']) {
  const sc = NivelAI.generateShop(id);
  ok(sc && sc.W > 0 && sc.H > 0, 'generateShop(' + id + ') tiene grilla');
  ok(sc.name && sc.intro, 'generateShop(' + id + ') tiene nombre+intro');
  ok(Array.isArray(sc.wares) && sc.wares.length > 0, 'generateShop(' + id + ') tiene mercadería');
  ok(sc.wares.every(w => w.give && typeof w.cost === 'number' && (w.pay === 'coins' || w.pay === 'caramelos')), id + ': wares con give/cost/pay válidos');
  ok(Array.isArray(sc.npcs) && sc.npcs.length >= 1, id + ': tiene clientela');
  ok(sc.exit && sc.exit.x != null, id + ': tiene salida');
}

// 2) el ítem ancla (base) del NPC se incluye en la mercadería
const withBase = NivelAI.generateShop('masajes', [{ emoji: '🧖', label: { es: 'sauna', en: 'sauna' }, give: { item: 'health', amount: 50 }, cost: 12, pay: 'coins' }]);
ok(withBase.wares.some(w => w.label === 'sauna' || w.cost === 12), 'el ítem ancla (base) aparece en la mercadería');

// 3) comprar: descuenta la moneda correcta y aplica el efecto; con plata insuficiente NO compra
const sc = NivelAI.generateShop('comida-rara');   // wares en monedas (comida)
const ware = sc.wares.find(w => w.pay === 'coins' && w.give.item === 'health');
const player = { coins: 100, caramelos: 5, hp: 40, ammo: 0 };
const t = Tienda.create(sc, { player, maxHp: 100 });
const i = sc.wares.indexOf(ware), c0 = player.coins, hp0 = player.hp;
t.__buy(i);
ok(player.coins === c0 - ware.cost, 'comprar descuenta las monedas');
ok(player.hp > hp0, 'comprar de salud cura');
ok(sc.wares[i].taken === true, 'el ware queda agotado tras comprarlo');
t.__buy(i);   // ya agotado → no cobra de nuevo
ok(player.coins === c0 - ware.cost, 'no se vuelve a cobrar un ware agotado');
// plata insuficiente
const caro = sc.wares.find((w, k) => k !== i && w.pay === 'coins');
if (caro) { player.coins = 0; const before = player.hp; t.__buy(sc.wares.indexOf(caro)); ok(player.coins === 0 && player.hp === before, 'sin monedas no compra'); }

if (out.length) { console.error('❌ tienda:\n' + out.join('\n')); process.exit(1); }
console.log('✅ tienda: generateShop por rubro + clientela + mercadería + compra (cobra/da/agota) · OK');
