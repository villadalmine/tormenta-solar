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

// 4) la IA autora el surtido: generateShop(tipo, base, ai) usa name/intro/products/lines de la IA, manteniendo
// la economía (give/cost/pay) del molde estático.
const aiContent = { name: 'Sex-shop Inventado', intro: 'olor a IA', lines: ['frase ia 1', 'frase ia 2'],
  products: [{ label: 'producto IA', emoji: '✨' }] };
const enr = NivelAI.generateShop('sexshop', null, aiContent);
ok(enr.name === 'Sex-shop Inventado' && enr.intro === 'olor a IA', 'generateShop usa name/intro de la IA');
ok(enr.wares.some(w => w.label === 'producto IA'), 'generateShop re-bautiza productos con los de la IA');
ok(enr.wares.every(w => typeof w.cost === 'number' && w.give), 'la economía (give/cost) queda anclada al molde');
ok(enr.npcs[0].lines.includes('frase ia 1'), 'la clientela usa las frases de la IA');

// 4b) la IA SUGIERE economía (cost/amount) y el cliente la CLAMPA a rango sano (absurdo → tope; sano → pasa)
const eco = NivelAI.generateShop('sexshop', null, { products: [{ label: 'caro', emoji: '💸', cost: 9999, amount: 9999 }, { label: 'barato', emoji: '🪙', cost: 5, amount: 12 }] });
ok(eco.wares[0].cost >= 2 && eco.wares[0].cost <= 30, 'cost IA absurdo se clampa a rango sano: ' + eco.wares[0].cost);
ok(eco.wares[0].give.amount == null || eco.wares[0].give.amount <= 50, 'amount IA absurdo se clampa a tope: ' + eco.wares[0].give.amount);
ok(eco.wares[1].cost === 5, 'cost IA sano pasa tal cual (ware 1): ' + eco.wares[1].cost);
ok(eco.wares.every(w => w.pay === 'coins' || w.pay === 'caramelos' || w.pay === 'forros'), 'la moneda (pay) sigue siendo la del molde, la IA no la cambia');

(async () => {
  // 5) requestShop: trae el surtido del proxy (fetch mockeado) y lo cachea; 2da vez es instantánea
  global.fetch = () => Promise.resolve({ ok: true, json: async () => ({ name: 'Tienda Proxy', intro: 'i', lines: ['a'], products: [{ label: 'cosa', emoji: '🧪' }] }) });
  await new Promise(res => NivelAI.requestShop('masajes', ai => {
    ok(ai && ai.name === 'Tienda Proxy' && ai.products && ai.products.length === 1, 'requestShop trae el surtido del proxy');
    ok(NivelAI.shopCache('masajes') === ai, 'requestShop cachea el surtido por rubro');
    res();
  }));
  let calls = 0; global.fetch = () => { calls++; return Promise.reject(new Error('should not fetch')); };
  await new Promise(res => NivelAI.requestShop('masajes', ai => { ok(ai && calls === 0, 'segunda vez: usa la caché, no pega al proxy'); res(); }));

  // 6) el surtido autorado se PERSISTE en localStorage (sobrevive recargas): requestShop escribe ts_shopCache_v1
  // (antes del test de caída, porque ese ABRE el circuit breaker y requestShop dejaría de pegarle al proxy)
  const LS = {}; global.localStorage = { getItem: k => LS[k] || null, setItem: (k, v) => { LS[k] = String(v); }, removeItem: k => { delete LS[k]; } };
  global.fetch = () => Promise.resolve({ ok: true, json: async () => ({ name: 'Persistida', products: [{ label: 'x', emoji: '🧪', cost: 7, amount: 20 }] }) });
  await new Promise(res => NivelAI.requestShop('comida-rara', () => res()));
  const saved = LS['ts_shopCache_v1'] ? JSON.parse(LS['ts_shopCache_v1']) : null;
  ok(saved && saved['comida-rara'] && saved['comida-rara'].name === 'Persistida', 'requestShop persiste el surtido en localStorage');
  delete global.localStorage;

  // 7) requestShop con el proxy CAÍDO (fetch rechaza) → cb(null) → el caller usa el molde estático
  global.fetch = () => Promise.reject(new Error('down'));
  await new Promise(res => NivelAI.requestShop('tenebroso', ai => { ok(ai === null, 'proxy caído → requestShop cb(null) (estático)'); res(); }));

  if (out.length) { console.error('❌ tienda:\n' + out.join('\n')); process.exit(1); }
  console.log('✅ tienda: generateShop + compra + IA autora surtido (cache-first, fallback) · OK');
})();
