// nivelai.js — GENERADOR DE NIVELES (la "máquina de hacer chorizos", v2). Se DISPARA cuando te colás a la
// trastienda del chino durante el RAID: genera una ESCENA surreal temática (data-driven) y la corre el
// sub-modo Spinoff (js/spinoff.js). El "molde" son los THEMES (DATA): cada uno describe un nivel; el
// generador compone props/npcs/meta dentro de una grilla. Opcional: el proxy /nivel-ai autora el texto con
// IA (name + líneas), con FALLBACK estático (igual que los bancos de propaganda/chusmerío). Ver
// specs/fabrica-niveles-ai.md.
const NivelAI = (() => {
  const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';   // mismo proxy que ai.js/propaganda.js
  // CIRCUIT BREAKER: si la IA (GPU/upstream) falla o tarda, ABRIMOS el circuito 90s → todas las generaciones caen
  // a MODO ESTÁTICO al toque, sin esperar timeouts. Si la GPU se va al tacho, NO se cuelga nada. (premisa del dueño)
  // La señal de salud se COMPARTE con el chat (js/ai.js) vía window.__aiHealth: mismo backend GPU/proxy, así si
  // uno detecta la IA caída el otro también falla rápido al modo estático/local. (specs/resiliencia.md)
  // 16s (no 6s): la GENERACIÓN no es el chat en tiempo real — el proxy ahora va DIRECTO al modelo PAGO confiable
  // (gen-models), que tarda varios seg en escupir el JSON del nivel. Antes 6s abortaba antes de que el pago contestara
  // → caía a estático aunque hubiera pago. El circuit breaker (AI_COOLDOWN) igual corta tras el 1er timeout real.
  const AI_TIMEOUT = 16000, AI_COOLDOWN = 90000;
  const health = (typeof window !== 'undefined') ? (window.__aiHealth = window.__aiHealth || { downUntil: 0 }) : { downUntil: 0 };
  const aiDown = () => Date.now() < health.downUntil;
  const markAi = ok => { health.downUntil = ok ? 0 : Date.now() + AI_COOLDOWN; };
  const short = () => (typeof I18n !== 'undefined' && I18n.short) ? I18n.short() : 'es';
  const L = o => (o && typeof o === 'object' && ('es' in o || 'en' in o)) ? (o[short()] || o.es) : o;

  // ----- EL MOLDE: temas como DATA (la IA podrá sumar/autorar más) -----
  const THEMES = [
    {
      id: 'super-rasca', motif: '🐉',
      name: { es: 'Súper Rasca «El Dragón Mugriento»', en: 'Dive Mart "The Grimy Dragon"' },
      intro: { es: 'El pasadizo te escupe en un súper chino RASCA, todo pegoteado y a media luz.',
               en: 'The passage spits you into a GRIMY dive Chinese mart, all sticky and dim.' },
      palette: { floor: '#2a241c', floor2: '#332b20', wall: '#5a4632', accent: '#caa000' },
      props: ['🥫', '🧴', '🐀', '🪣', '🥢', '🧧', '🀄', '🥟', '🍜'],
      npc: { emoji: '🧑‍🍳', lines: { es: ['todo vencido, amigo', 'dos por uno casi', 'rata gratis adentro', 'no milar fecha', 'pagá pagá'],
                                      en: ['all expired, amigo', 'almost two for one', 'free rat inside', 'no look date', 'pay pay'] } },
      goal: { es: 'PASILLO TRUCHO', en: 'DODGY AISLE' }, reward: { caramelos: 3 }, style: 'aisles', decor: ['super_chino', 'kiosko', 'caja', 'barril', 'tacho', 'dispenser'],
    },
    {
      id: 'taller-esclavo', motif: '🧵',
      name: { es: 'Taller Clandestino «Tela & Sudor»', en: 'Sweatshop "Thread & Sweat"' },
      intro: { es: 'Caés en un TALLER clandestino: máquinas de coser sin parar, gente tejiendo ropa en modo esclavo.',
               en: 'You land in a clandestine SWEATSHOP: sewing machines nonstop, people weaving clothes in slave mode.' },
      palette: { floor: '#23222a', floor2: '#2b2a34', wall: '#4a3a52', accent: '#ff7043' },
      props: ['🧵', '🪡', '👕', '👖', '🧶', '⚙️', '🧥', '🧦'],
      npc: { emoji: '🪢', lines: { es: ['ayudame a salir', 'cosé cosé cosé', 'no hay descanso', 'doce holas seguidas', 'shh, viene el capataz'],
                                    en: ['help me get out', 'sew sew sew', 'no rest here', 'twelve hours straight', 'shh, boss coming'] } },
      goal: { es: 'PUERTA TRASERA', en: 'BACK DOOR' }, reward: { caramelos: 4 }, style: 'climb', decor: ['escritorio', 'maniqui', 'mueble_roto', 'sillon_roto', 'caja', 'laptop'],
    },
    {
      id: 'comida-podrida', motif: '🤢',
      name: { es: 'Mercado «Fresco... Ponele»', en: 'Market "Fresh... Sure"' },
      intro: { es: 'Un mercado con la cadena de frío ROTA: todo verde, peludo y con olor. Tapate la nariz.',
               en: 'A market with the cold chain BROKEN: everything green, fuzzy and stinky. Hold your nose.' },
      palette: { floor: '#1f2a1c', floor2: '#26331f', wall: '#3a5230', accent: '#9ccc65' },
      props: ['🤢', '🥬', '🍖', '🐛', '🦠', '🪰', '🧅', '🐟'],
      npc: { emoji: '🧟', lines: { es: ['está fresco, ¿no?', 'el moho da sabor', 'no huele tan mal', 'comé igual', 'la fecha es sugerencia'],
                                    en: ['it\'s fresh, right?', 'mold adds flavor', 'doesn\'t smell that bad', 'eat it anyway', 'the date is a suggestion'] } },
      goal: { es: 'CÁMARA FRÍA', en: 'COLD ROOM' }, reward: { caramelos: 3 }, style: 'aisles', decor: ['parrilla', 'cocina', 'bano_roto', 'tacho', 'barril', 'escombros'],
    },
    {
      id: 'muralla-skate', motif: '🛹',
      name: { es: 'La Muralla China en Skate', en: 'The Great Wall on a Skateboard' },
      intro: { es: '¡Un portal te tira ARRIBA de la Muralla China con una tabla! Bajá la rampa esquivando todo.',
               en: 'A portal drops you ON the Great Wall with a board! Bomb the ramp dodging everything.' },
      palette: { floor: '#3a3026', floor2: '#46392c', wall: '#6e5a44', accent: '#4FC3F7' },
      props: ['🛹', '🏮', '🐉', '🏯', '🧨', '🪁', '⛩️', '🗿'],
      npc: { emoji: '🧎', lines: { es: ['¡cuidado el escalón!', '¡aiyaa, rápido!', 'no caigas, eh', 'mil años de muro', 'dale gas'],
                                    en: ['watch the step!', 'aiyaa, fast!', 'don\'t fall, eh', 'thousand-year wall', 'gas it'] } },
      goal: { es: 'FIN DE LA MURALLA', en: 'END OF THE WALL' }, reward: { caramelos: 5 }, style: 'wall', decor: ['farol', 'banco', 'planta', 'tacho', 'barricada', 'escombros'],
    },
    {
      id: 'feria-trucha', motif: '👜',
      name: { es: 'La Feria Trucha «Todo Original... Ponele»', en: 'Knockoff Fair "All Original... Sure"' },
      intro: { es: 'Caés en una mega-feria de marcas TRUCHAS: ñabes, carteras, championes, todo copia.',
               en: 'You drop into a mega knockoff fair: fake brands, bags, sneakers, all copies.' },
      palette: { floor: '#2a2630', floor2: '#322d3a', wall: '#52405e', accent: '#ff6ec7' },
      props: ['👜', '👟', '👕', '🧢', '⌚', '🕶️', '💼', '🩴'],
      npc: { emoji: '🧍', lines: { es: ['oliginal oliginal', 'lleve dos, amigo', 'misma marca, casi', 'no es trucho, es homenaje', 'última talle'],
                                    en: ['oliginal oliginal', 'take two, amigo', 'same brand, almost', 'not fake, homage', 'last size'] } },
      goal: { es: 'PUESTO DEL FONDO', en: 'BACK STALL' }, reward: { caramelos: 4 }, style: 'aisles', decor: ['maniqui', 'cartel', 'caja', 'kiosko', 'mesaRedonda', 'tacho'],
    },
    {
      id: 'fabrica-petardos', motif: '🧨',
      name: { es: 'Fábrica Clandestina de Petardos', en: 'Clandestine Fireworks Factory' },
      intro: { es: 'Un galpón LLENO de pólvora y petardos truchos. No prendas un fósforo, eh.',
               en: 'A warehouse FULL of gunpowder and dodgy fireworks. Don\'t light a match, eh.' },
      palette: { floor: '#2e2018', floor2: '#382820', wall: '#6e3a20', accent: '#ffca28' },
      props: ['🧨', '🎆', '🎇', '💥', '🪔', '🧯', '📦', '🔥'],
      npc: { emoji: '🧑‍🏭', lines: { es: ['no fumes acá', 'mecha corta, ojo', 'todo trucho igual prende', 'cuidado el cajón', 'aiyaa pólvora'],
                                       en: ['no smoking here', 'short fuse, careful', 'fake but still blows', 'mind the crate', 'aiyaa gunpowder'] } },
      goal: { es: 'SALIDA DE PÓLVORA', en: 'POWDER EXIT' }, reward: { caramelos: 5 }, style: 'climb', decor: ['barril', 'caja', 'tablones', 'escombros', 'dispenser', 'parlante'],
    },
    {
      id: 'karaoke-mafia', motif: '🎤',
      name: { es: 'Karaoke de la Mafia «Dragón de Oro»', en: 'Mafia Karaoke "Golden Dragon"' },
      intro: { es: 'Un KTV clandestino con luces y reservados: cantan, juegan y nadie vio nada.',
               en: 'An underground KTV with lights and private rooms: they sing, gamble, nobody saw anything.' },
      palette: { floor: '#1d1a2e', floor2: '#241f38', wall: '#3a2a5e', accent: '#ff3d7f' },
      props: ['🎤', '🎶', '🍶', '🀄', '💃', '🥢', '🎲', '🏮'],
      npc: { emoji: '🕴️', lines: { es: ['acá no viste nada', 'cantá y callá', 'reservado ocupado', 'la casa invita', 'shh, el jefe canta'],
                                     en: ['you saw nothing', 'sing and shush', 'private room taken', 'on the house', 'shh, boss sings'] } },
      goal: { es: 'SALIDA VIP', en: 'VIP EXIT' }, reward: { caramelos: 4 }, style: 'aisles', decor: ['parlante', 'ampli', 'sofa', 'tv', 'bailarinaParlante', 'mesaRedonda'],
    },
    {
      id: 'lavadero-billetes', motif: '🧺',
      name: { es: 'Lavadero «Blanco Como Nieve»', en: 'Laundromat "White as Snow"' },
      intro: { es: 'Un lavadero donde NO lavan ropa: lavan BILLETES. Tambores girando llenos de verdes.',
               en: 'A laundromat that washes no clothes: it washes BILLS. Drums spinning full of greenbacks.' },
      palette: { floor: '#1c2630', floor2: '#22303c', wall: '#33485a', accent: '#4dd0e1' },
      props: ['💵', '🧺', '🫧', '🧼', '💸', '🪙', '🧽', '🌀'],
      npc: { emoji: '🧺', lines: { es: ['queda limpito', 'no preguntá origen', 'centrifugá la guita', 'seca y blanca', 'segundo tambor libre'],
                                    en: ['comes out clean', 'no ask origin', 'spin the cash', 'dry and white', 'second drum free'] } },
      goal: { es: 'SALIDA EN SECO', en: 'DRY EXIT' }, reward: { caramelos: 5 }, style: 'aisles', decor: ['caja', 'barril', 'tacho', 'dispenser', 'maletin', 'parlante'],
    },
    {
      id: 'farmacia-vencida', motif: '💊',
      name: { es: 'Farmacia «Casi Vence»', en: 'Pharmacy "Almost Expired"' },
      intro: { es: 'Una farmacia trucha: remedios vencidos, jarabes raros y un cartel de "oferta o muerte".',
               en: 'A dodgy pharmacy: expired meds, weird syrups and a sign reading "deal or die".' },
      palette: { floor: '#20281f', floor2: '#283322', wall: '#3a4a34', accent: '#aed581' },
      props: ['💊', '🧪', '🩹', '💉', '🧫', '🦠', '🧴', '⚗️'],
      npc: { emoji: '🧑‍⚕️', lines: { es: ['vence mañana, comprá', 'cura casi todo', 'sin receta, dale', 'efecto secundario gratis', 'jarabe de la casa'],
                                       en: ['expires tomorrow, buy', 'cures almost all', 'no script, go', 'free side effect', 'house syrup'] } },
      goal: { es: 'TRASTIENDA', en: 'BACK ROOM' }, reward: { caramelos: 4 }, style: 'climb', decor: ['kiosko', 'caja', 'escritorio', 'dispenser', 'tacho', 'mueble_roto'],
    },
  ];

  // ----- TIENDAS GENERADAS (galería de la cueva): el "molde" es el RUBRO. Le hablás al local → entrás a un interior
  // generado (top-down, sub-modo Tienda) con clientela + mercadería COHERENTE para browsear/comprar. DATA = rubro;
  // la IA podrá enriquecer (name/intro/wares); fallback estático = esto. Ver specs/tiendas-generadas.md. -----
  const SHOP_RUBROS = [
    { id: 'sexshop', motif: '🔞', name: { es: 'Sex-shop «El Subte»', en: 'Sex-shop "The Tube"' },
      intro: { es: 'Luz roja, cortina de tiras y olor a látex. Pasá, pasá, no mires con culpa.', en: 'Red light, strip curtain and a latex smell. Come in, no shame.' },
      palette: { floor: '#2a1620', floor2: '#331a28', wall: '#5a2440', accent: '#ff4d8d' },
      props: ['🔞', '💋', '🩲', '🪅', '🧴', '💄', '🕯️', '🎀'],
      npc: { emoji: '🧍', lines: { es: ['no le digas a mi señora', 'envuelto para regalo', '¿talle único?', 'discreto, eh'], en: ['don\'t tell my wife', 'gift-wrapped', 'one size?', 'discreet, eh'] } },
      wares: [{ emoji: '🧴', label: { es: 'pócima energizante', en: 'energizing potion' }, give: { item: 'health', amount: 20 }, cost: 14, pay: 'caramelos' },
              { emoji: '🩲', label: { es: 'tanga de la suerte', en: 'lucky thong' }, give: { item: 'coins', amount: 8 }, cost: 6, pay: 'coins' },
              { emoji: '💋', label: { es: 'beso embotellado', en: 'bottled kiss' }, give: { item: 'health', amount: 30 }, cost: 22, pay: 'caramelos' }] },
    { id: 'comida-rara', motif: '🤢', name: { es: 'Comida Rara', en: 'Weird Eats' },
      intro: { es: 'Un mostrador con cosas de dudoso origen. "Barato y te llena", dice el cartel.', en: 'A counter with stuff of dubious origin. "Cheap and filling", says the sign.' },
      palette: { floor: '#23271a', floor2: '#2b3020', wall: '#46512f', accent: '#c5d86d' },
      props: ['🌭', '🍢', '🦴', '🪰', '🥘', '🧅', '🫕', '🐀'],
      npc: { emoji: '🧑‍🍳', lines: { es: ['de tres días, igual rico', 'no preguntés qué es', 'lleve dos', 'recién... ponele'], en: ['three days old, still good', 'don\'t ask what it is', 'take two', 'fresh... sure'] } },
      wares: [{ emoji: '🌭', label: { es: 'pancho de tres días', en: 'three-day hot dog' }, give: { item: 'health', amount: 25 }, cost: 4, pay: 'coins' },
              { emoji: '🍢', label: { es: 'brocheta misteriosa', en: 'mystery skewer' }, give: { item: 'health', amount: 15 }, cost: 3, pay: 'coins' },
              { emoji: '🥘', label: { es: 'guiso del día', en: 'stew of the day' }, give: { item: 'health', amount: 40 }, cost: 9, pay: 'coins' }] },
    { id: 'masajes', motif: '💆', name: { es: 'Masajes Felices', en: 'Happy Massage' },
      intro: { es: 'Camillas, aceitito y música de pan flauta. Relajate, jefe.', en: 'Tables, oil and pan-flute music. Relax, boss.' },
      palette: { floor: '#1c2630', floor2: '#22303c', wall: '#34506a', accent: '#7fd1ff' },
      props: ['💆', '🕯️', '🧖', '🪷', '🧴', '🎐', '🛁', '☯️'],
      npc: { emoji: '🧖', lines: { es: ['un gustito nomás', 'descontracturante', 'sin final feliz, eh', 'la hora completa'], en: ['just a treat', 'knot remover', 'no happy ending, eh', 'the full hour'] } },
      wares: [{ emoji: '💆', label: { es: 'masaje descontracturante', en: 'deep-tissue massage' }, give: { item: 'health', amount: 45 }, cost: 8, pay: 'coins' },
              { emoji: '🕯️', label: { es: 'aromaterapia', en: 'aromatherapy' }, give: { item: 'health', amount: 25 }, cost: 5, pay: 'coins' }] },
    { id: 'tenebroso', motif: '🕯️', name: { es: 'El Tenebroso', en: 'The Creepy One' },
      intro: { es: 'Penumbra, velas negras y un tipo encapuchado que no parpadea. "Tengo lo que NADIE tiene."', en: 'Gloom, black candles and a hooded guy who doesn\'t blink. "I have what NO ONE has."' },
      palette: { floor: '#16131d', floor2: '#1c1826', wall: '#34284a', accent: '#b388ff' },
      props: ['🕯️', '💀', '🔮', '🃏', '🧿', '🕸️', '⚰️', '🗝️'],
      npc: { emoji: '🧙', lines: { es: ['no tiene devolución', 'el precio es tu suerte', 'sin garantía', 'shhh'], en: ['no refunds', 'the price is your luck', 'no warranty', 'shhh'] } },
      wares: [{ emoji: '🔮', label: { es: 'objeto misterioso', en: 'mystery object' }, give: { item: 'mystery' }, cost: 10, pay: 'coins' },
              { emoji: '🧿', label: { es: 'amuleto truchísimo', en: 'super-fake amulet' }, give: { item: 'coins', amount: 20 }, cost: 12, pay: 'coins' }] },
  ];

  // genera la ESCENA de tienda (top-down) desde el RUBRO (tipo) + ítems ancla del NPC (base). Sin meta, sin enemigos.
  // `ai` (opcional) = contenido autorado por la IA {name,intro,lines,products}: enriquece nombre/intro/clientela y
  // los NOMBRES de los productos; la ECONOMÍA (give/cost/pay) queda anclada al molde estático (precios sanos).
  function generateShop(tipo, base, ai) {
    const t = SHOP_RUBROS.find(x => x.id === tipo) || SHOP_RUBROS[0];
    const W = 16, H = 11, used = {}, key = (x, y) => x + ',' + y;
    const rnd = (a, b) => a + ((Math.random() * (b - a + 1)) | 0);
    function freeTile() { for (let i = 0; i < 60; i++) { const x = rnd(2, W - 3), y = rnd(2, H - 4); if (!used[key(x, y)]) { used[key(x, y)] = 1; return { x, y }; } } return { x: 2, y: 2 }; }
    const props = [];
    for (let i = 0, n = rnd(7, 11); i < n; i++) { const p = freeTile(); props.push({ x: p.x, y: p.y, emoji: t.props[(Math.random() * t.props.length) | 0] }); }
    const lines = (ai && Array.isArray(ai.lines) && ai.lines.length) ? ai.lines : L(t.npc.lines);
    const npcs = [];
    for (let i = 0, n = rnd(2, 3); i < n; i++) { const p = freeTile(); npcs.push({ x: p.x, y: p.y, emoji: t.npc.emoji, lines: lines.slice(), say: '', sayT: 0 }); }
    // wares = mercadería del rubro + los ítems ancla (base) del NPC, garantizados
    const baseWares = (Array.isArray(base) ? base : []).map(b => ({ emoji: b.emoji || '🛍️', label: L(b.label) || (b.give && b.give.item) || 'ítem', give: b.give || { item: 'health', amount: 10 }, cost: b.cost || 5, pay: b.pay || 'coins' }));
    let wares = baseWares.concat(t.wares.map(w => ({ emoji: w.emoji, label: L(w.label), give: { ...w.give }, cost: w.cost, pay: w.pay || 'coins' })));
    // la IA re-bautiza (label/emoji) Y SUGIERE economía (cost/amount); el cliente CLAMPA a rango sano por kind (la
    // moneda `pay` y el tipo de ítem `give.item` quedan del molde: la IA no cambia balance estructural). Falta dato → molde.
    const clampCost = (c, pay) => Math.max(2, Math.min(pay === 'caramelos' ? 30 : pay === 'forros' ? 12 : 25, c | 0));
    const clampAmount = (a, item) => { a = a | 0; return item === 'coins' ? Math.max(4, Math.min(25, a)) : item === 'ammo' ? Math.max(10, Math.min(40, a)) : Math.max(5, Math.min(50, a)); };
    const prods = ai && Array.isArray(ai.products) ? ai.products : null;
    if (prods && prods.length) wares = wares.map((w, i) => {
      const p = prods[i % prods.length] || {};
      const give = { ...w.give };
      if (p.amount != null && give.amount != null) give.amount = clampAmount(p.amount, give.item);   // potencia sugerida, clampada
      const cost = (p.cost != null) ? clampCost(p.cost, w.pay) : w.cost;                              // precio sugerido, clampado
      return { ...w, label: p.label || w.label, emoji: p.emoji || w.emoji, give, cost };
    });
    wares = wares.map(w => { const p = freeTile(); return { ...w, x: p.x, y: p.y, taken: false }; });
    return { id: t.id, motif: t.motif, name: (ai && ai.name) || L(t.name), intro: (ai && ai.intro) || L(t.intro), palette: t.palette, W, H, props, npcs, wares, exit: { x: 2, y: H - 2 } };
  }
  // ----- la IA autora el surtido del local (best-effort + caché por rubro, PERSISTIDA en localStorage). Fallback = molde
  // estático. La IA SUGIERE precio/potencia (cost/amount); generateShop CLAMPA a rango sano por kind. Ver tiendas-generadas.md
  const SHOP_CACHE_KEY = 'ts_shopCache_v1';
  function loadShopCache() {   // memoria del cliente: el surtido autorado sobrevive recargas (REGLA #0: dato/memoria)
    try { if (typeof localStorage === 'undefined') return {}; const d = JSON.parse(localStorage.getItem(SHOP_CACHE_KEY) || '{}'); return (d && typeof d === 'object') ? d : {}; } catch (e) { return {}; }
  }
  const shopCacheBox = loadShopCache();
  function saveShopCache() { try { if (typeof localStorage !== 'undefined') localStorage.setItem(SHOP_CACHE_KEY, JSON.stringify(shopCacheBox)); } catch (e) {} }
  const shopCache = tipo => shopCacheBox[tipo] || null;
  function requestShop(tipo, cb) {
    if (shopCacheBox[tipo]) { cb && cb(shopCacheBox[tipo]); return; }              // ya cacheado → instantáneo
    if (typeof fetch !== 'function' || aiDown()) { cb && cb(null); return; }       // IA caída → estático (circuit breaker)
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), AI_TIMEOUT);
    fetch(PROXY + '/nivel-ai', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'shop', tipo, lang: short() }) })
      .then(r => { clearTimeout(to); if (!r.ok) { markAi(false); return null; } return r.json(); })
      .then(j => {
        if (!j || !(j.name || j.products || j.lines)) { if (j) markAi(true); cb && cb(null); return; }
        markAi(true);
        const ci = v => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : null; };   // entero o null (generateShop re-clampa por kind)
        const ai = {
          name: j.name ? String(j.name).slice(0, 60) : null,
          intro: j.intro ? String(j.intro).slice(0, 160) : null,
          lines: Array.isArray(j.lines) ? j.lines.slice(0, 6).map(s => String(s).slice(0, 40)) : null,
          products: Array.isArray(j.products) ? j.products.slice(0, 8).map(p => { const o = { label: String((p && p.label) || p || '').slice(0, 28), emoji: String((p && p.emoji) || '🛍️').slice(0, 4) };
            const c = ci(p && p.cost); if (c != null) o.cost = c; const a = ci(p && p.amount); if (a != null) o.amount = a; return o; }).filter(p => p.label) : null,
        };
        shopCacheBox[tipo] = ai; saveShopCache(); cb && cb(ai);
      }).catch(() => { clearTimeout(to); markAi(false); cb && cb(null); });
  }

  // ----- EL GENERADOR: compone una escena (data) desde un tema (forceId opcional, para tests) -----
  function generate(forceId) {
    const t = forceId ? (THEMES.find(x => x.id === forceId) || THEMES[0]) : THEMES[(Math.random() * THEMES.length) | 0];
    const W = 22, H = 13;
    const rnd = (a, b) => a + ((Math.random() * (b - a + 1)) | 0);
    const used = {}, key = (x, y) => x + ',' + y;
    function freeTile() { for (let i = 0; i < 60; i++) { const x = rnd(2, W - 3), y = rnd(2, H - 3); if (!used[key(x, y)]) { used[key(x, y)] = 1; return { x, y }; } } return { x: 2, y: 2 }; }
    const props = [];
    for (let i = 0, n = rnd(9, 15); i < n; i++) { const p = freeTile(); props.push({ x: p.x, y: p.y, emoji: t.props[(Math.random() * t.props.length) | 0] }); }
    const npcs = [];
    for (let i = 0, n = rnd(2, 3); i < n; i++) { const p = freeTile(); npcs.push({ x: p.x, y: p.y, emoji: t.npc.emoji, lines: L(t.npc.lines).slice(), say: '', sayT: 0 }); }
    const gp = freeTile();
    return {
      id: t.id, motif: t.motif, name: L(t.name), intro: L(t.intro),
      palette: t.palette, W, H, props, npcs,
      goal: { x: gp.x, y: gp.y, label: L(t.goal) },
      reward: t.reward || { caramelos: 3 },
    };
  }

  // ----- enriquecer con IA (opcional, best-effort): el proxy /nivel-ai autora name + líneas. Fallback = estático -----
  function enrich(scene, cb) {
    if (typeof fetch !== 'function' || aiDown()) return;   // GPU caída → quedate con el texto estático del molde
    try {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), AI_TIMEOUT);
      fetch(PROXY + '/nivel-ai', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: scene.id, lang: short() }) })
        .then(r => { clearTimeout(to); if (!r.ok) { markAi(false); return null; } return r.json(); })
        .then(j => {
          if (!j) return; markAi(true);
          if (j.name) scene.name = j.name;
          if (j.intro) scene.intro = j.intro;
          if (Array.isArray(j.lines) && j.lines.length) for (const n of scene.npcs) n.lines = j.lines.slice();
          if (cb) cb(scene);
        }).catch(() => { clearTimeout(to); markAi(false); });   // timeout/red → abre el circuito (modo estático 90s)
    } catch (e) {}
  }

  // ----- GEOMETRÍA AUTORADA POR IA (la C, salto grande): sanitizar lo que propone la IA antes de construir -----
  // La IA puede mandar plataformas/enemigos como DATA cruda (poco confiable con modelos chicos). Acá la
  // SANEAMOS dura (clamp a límites, sin tapar puertas), y la RED (Playable, incl. R4 reachability) la valida
  // por sala; si una sala con geometría IA no pasa, se AUTO-REPARA cayendo al layout procedural (garantizado
  // jugable). Así la "imaginación" de la IA llega al jugador SOLO si es transitable. Ver specs/fabrica-niveles-ai.md.
  const GTOP_C = 12;
  // Saneo LIVIANO: coerciona a números y mete dentro de la grilla (sin pisar bordes), pero NO garantiza
  // jugabilidad — eso lo hace la RED (Playable, incl. R4). A propósito: si clampeáramos todo a "siempre jugable",
  // la red nunca trabajaría y la auto-reparación sería decorativa. Acá la IA SÍ puede proponer algo roto (un
  // muro infranqueable, una plataforma que tapa la puerta) y la red lo caza → fallback procedural.
  function sanitizePlatforms(raw, w) {
    if (!Array.isArray(raw)) return null;
    const out = [], seen = {};
    for (const p of raw) {
      let x, y, pw;
      if (Array.isArray(p)) { x = p[0]; y = p[1]; pw = p[2]; }
      else if (p && typeof p === 'object') { x = p.x; y = p.y; pw = p.w != null ? p.w : p.width; }
      else continue;
      x = Math.round(+x); y = Math.round(+y); pw = Math.round(+pw);
      if (!isFinite(x) || !isFinite(y) || !isFinite(pw)) continue;
      pw = Math.max(2, Math.min(6, pw || 2));
      x = Math.max(1, Math.min(w - 3, x));                    // dentro de las paredes
      if (x + pw > w - 1) pw = (w - 1) - x; if (pw < 2) continue;
      y = Math.max(2, Math.min(GTOP_C - 1, y));               // de la grilla; puede llegar al piso (la RED lo juzga)
      const k = x + ',' + y; if (seen[k]) continue; seen[k] = 1;
      out.push([x, y, pw]);
      if (out.length >= 10) break;
    }
    return out.length ? out : null;
  }
  function sanitizeEnemies(raw, w) {
    if (!Array.isArray(raw)) return null;
    const out = [];
    for (const e of raw) {
      let x = Array.isArray(e) ? e[0] : (e && typeof e === 'object' ? e.x : e);
      x = Math.round(+x); if (!isFinite(x)) continue;
      x = Math.max(6, Math.min(w - 5, x));
      const type = (e && e.type) === 'dron' ? 'dron' : (e && e.type) === 'peaton' ? 'peaton' : null;
      out.push({ x, type });
      if (out.length >= 5) break;
    }
    return out.length ? out : null;
  }
  // OBSTÁCULOS autorados por IA: pinchos/pozos como {x, w, kind}. Saneo a anchos saltables (la RED igual los re-valida).
  function sanitizeHazards(raw, w) {
    if (!Array.isArray(raw)) return null;
    const out = [];
    for (const h of raw) {
      let x, hw, kind;
      if (Array.isArray(h)) { x = h[0]; hw = h[1]; kind = h[2]; }
      else if (h && typeof h === 'object') { x = h.x; hw = h.w != null ? h.w : h.width; kind = h.kind || h.type; }
      else continue;
      x = Math.round(+x); hw = Math.round(+hw); if (!isFinite(x)) continue;
      kind = /pit|pozo|hueco/i.test(String(kind)) ? 'pit' : 'spikes';
      hw = Math.max(1, Math.min(2, hw || 2));                  // ≤2 = siempre saltable (la RED rechaza lo demás igual)
      x = Math.max(6, Math.min(w - 7, x));                     // lejos de columnas sagradas (spawn x2 / meta·puerta w-3)
      out.push({ x, w: hw, kind });
      if (out.length >= 4) break;
    }
    return out.length ? out : null;
  }

  // ----- LADRILLO 2 DE LA C: generar un NIVEL-PLATAFORMA REAL (modelo v2 que consume Mundo.fromModel) -----
  // A diferencia de `generate()` (escena top-down del Spinoff), esto produce un MODELO DE NIVEL del MOTOR REAL:
  // sala con plataformas saltables + spawn + meta + enemigos/pickups temáticos. Pasa por la RED (Playable):
  // genera → valida jugabilidad → si falla, RE-INTENTA (bucle de auto-reparación) → recién entonces se devuelve.
  // Así la "imaginación" de la IA nunca produce un nivel intransitable. Ver specs/fabrica-niveles-ai.md §4.7.
  function generateLevel(forceId) {
    // forceId puede ser un ID (string) O un TEMA ad-hoc (objeto) — ej. el que INVENTA la IA en el tema 'oraculo'
    const t = (forceId && typeof forceId === 'object') ? forceId
      : forceId ? (THEMES.find(x => x.id === forceId) || THEMES[0]) : THEMES[(Math.random() * THEMES.length) | 0];
    const GTOP = 12;
    const rnd = (a, b) => a + ((Math.random() * (b - a + 1)) | 0);
    const pick = a => a[(Math.random() * a.length) | 0];
    const decorKeys = t.decor || ['caja', 'barril', 'tacho'];
    const style = t.style || 'climb';
    // PLATAFORMAS según el STYLE del tema (data) — así cada nivel se SIENTE distinto (la muralla parece muralla, etc.).
    // Siempre confinadas a x∈[5..w-6] (lejos de las columnas x=2 y x=w-3 de puertas/spawn/meta) y nunca en GTOP-1.
    // geometría IA opcional (de requestOraculo/enrich): si el tema la trae, la usa layoutPlatforms(w, true).
    function layoutPlatforms(w, useAi) {
      if (useAi && t.aiPlatforms) { const s = sanitizePlatforms(t.aiPlatforms, w); if (s) return s; }   // GEOMETRÍA AUTORADA POR IA
      const P = [];
      if (style === 'wall') {
        // MURALLA: caminás por la parte de ARRIBA del muro, con almenas (sube/baja 1) y huecos cortos para saltar
        let y = GTOP - 3;
        for (let x = 5; x < w - 6;) { const pw = rnd(3, 5); P.push([x, y, pw]); x += pw + rnd(1, 2); y += (Math.random() < 0.5 ? -1 : 1); y = Math.max(GTOP - 5, Math.min(GTOP - 2, y)); }
      } else if (style === 'aisles') {
        // GÓNDOLAS/ESTANTES: 2 filas horizontales (pasillos) que saltás entre medio
        for (const y of [GTOP - 3, GTOP - 6]) for (let x = 5; x < w - 6; x += rnd(4, 6)) P.push([x, y, rnd(2, 3)]);
      } else {
        // CLIMB (default): zigzag que sube
        let px = rnd(5, 7), py = GTOP - 2;
        for (let k = 0, m = rnd(3, 6); k < m && px < w - 6; k++) { P.push([px, py, rnd(2, 3)]); px += P[P.length - 1][2] + rnd(2, 3); py = Math.max(4, py - (Math.random() < 0.6 ? rnd(1, 2) : 0)); }
      }
      return P;
    }
    // Arma UNA sala dada su geometría (plats): spawn/meta + puertas recíprocas + pickups sobre plataformas +
    // enemigos (posiciones autoradas por IA si las hay, si no aleatorias) + decor temático en el piso.
    // pool de enemigos VARIADO (antes solo peaton/dron): pacman es rápido, galaga vuela rápido, cuevero dispara.
    // Pesado hacia peaton/dron para que no sea injusto. La IA autora la POSICIÓN; el tipo lo elige el pool.
    const ENEMY_POOL = ['peaton', 'peaton', 'dron', 'dron', 'pacman', 'galaga', 'cuevero'];
    function assemble(i, n, w, plats, noHaz, hazards) {
      const id = 'sala-ai-' + i, ents = [];
      if (i === 0) ents.push({ id: id + '/spawn', tipo: 'marker', x: 2, render: { type: 'spawn' } });
      else ents.push({ id: id + '/door-l', tipo: 'door', x: 2, inward: 1, render: { type: 'door' }, link: { to: 'sala-ai-' + (i - 1) } });
      if (i === n - 1) ents.push({ id: id + '/goal', tipo: 'marker', x: w - 3, render: { type: 'goal' } });
      else ents.push({ id: id + '/door-r', tipo: 'door', x: w - 3, inward: -1, render: { type: 'door' }, link: { to: 'sala-ai-' + (i + 1) } });
      // pickups SOLO en plataformas ALCANZABLES (R4 para pickups): la red nos dice qué techos se pisan saltando.
      const reach = (typeof Playable !== 'undefined' && Playable.reachableTops)
        ? Playable.reachableTops({ w, platforms: plats, entities: [{ tipo: 'marker', x: 2, render: { type: 'spawn' } }] }) : null;
      for (const p of plats) { const ty = p[1] - 1; if (reach && !reach[p[0] + ',' + ty]) continue; if (Math.random() < 0.5) ents.push({ id: id + '/pk' + p[0], tipo: 'pickup', x: p[0] + 0.5, y: ty, give: { item: pick(['ammo', 'coins', 'health']), amount: rnd(3, 6) } }); }
      const aiEn = t.aiEnemies ? sanitizeEnemies(t.aiEnemies, w) : null;   // enemigos autorados por IA (posición) o aleatorios
      if (aiEn) aiEn.forEach((en, k) => ents.push({ id: id + '/en' + k, tipo: 'enemy', x: en.x + 0.5, combat: { type: en.type || pick(ENEMY_POOL) } }));
      else for (let k = 0, e = rnd(1, 3); k < e; k++) ents.push({ id: id + '/en' + k, tipo: 'enemy', x: rnd(6, w - 5) + 0.5, combat: { type: pick(ENEMY_POOL) } });
      // OBSTÁCULOS (pinchos / pozos) en el piso, lejos de columnas sagradas (spawn x2 / meta·puerta w-3) → saltables.
      // El POZO cala el piso (te caés y reaparecés); el PINCHO daña al contacto. Ancho ≤2 → la RED (R4) garantiza salto.
      // `hazards` = lista explícita autorada por IA; si no, se siembran 0-2 procedurales al azar.
      if (!noHaz) {
        if (hazards) hazards.forEach((h, k) => ents.push({ id: id + '/hz' + k, tipo: 'hazard', x: h.x + 0.5, w: h.w, render: { type: h.kind }, combat: { dmg: 12 } }));
        else for (let k = 0, hz = rnd(0, 2); k < hz; k++) { const pit = Math.random() < 0.5; ents.push({ id: id + '/hz' + k, tipo: 'hazard', x: rnd(7, w - 8) + 0.5, w: pit ? rnd(1, 2) : 2, render: { type: pit ? 'pit' : 'spikes' }, combat: { dmg: 12 } }); }
      }
      for (let k = 0, d = rnd(2, 4); k < d; k++) ents.push({ id: id + '/dec' + k, tipo: 'decor', x: rnd(4, w - 4) + 0.5, render: { type: pick(decorKeys) } });
      return { id, nombre: L(t.name) + (n > 1 ? ' · ' + (i + 1) + '/' + n : ''), theme: 'ruina', tags: ['generado', t.id], w, light: 1, platforms: plats, entities: ents };
    }
    // UNA sala: si el tema trae geometría IA, se INTENTA; si esa sala no pasa la RED (incl. R4 reachability) se
    // AUTO-REPARA cayendo al layout procedural (garantizado jugable). Así la geometría de la IA llega sólo si sirve.
    function room(i, n) {
      const w = style === 'wall' ? rnd(34, 42) : rnd(24, 32);   // la muralla es ANCHA (se recorre a lo largo)
      // 1) PLATAFORMAS: la geometría IA si pasa la RED (sin obstáculos); si no, procedural (auto-repair de geometría).
      let plats = layoutPlatforms(w, false);
      if (t.aiPlatforms) {
        const cand = layoutPlatforms(w, true);
        if (typeof Playable === 'undefined' || Playable.checkRoom(assemble(i, n, w, cand, true)).length === 0) plats = cand;
      }
      // 2) OBSTÁCULOS: los AUTORADOS POR IA si pasan la RED; si no (o no hay), procedurales re-rolleados — plataformas fijas.
      const okRoom = rr => typeof Playable === 'undefined' || Playable.checkRoom(rr).length === 0;
      if (t.aiHazards) { const hz = sanitizeHazards(t.aiHazards, w); if (hz) { const r = assemble(i, n, w, plats, false, hz); if (okRoom(r)) return r; } }
      let r = assemble(i, n, w, plats);
      for (let k = 0; k < 6 && !okRoom(r); k++) r = assemble(i, n, w, plats);
      return r;
    }
    function candidate() {
      const n = rnd(2, 3);                                    // 2-3 salas conectadas por puertas
      const rooms = []; for (let i = 0; i < n; i++) rooms.push(room(i, n));
      return { schemaVersion: 1, id: 'nivel-ai-' + t.id, nombre: L(t.name), seed: 'ai', rooms };
    }
    // BUCLE de validación/reparación: probamos hasta 8 candidatos, devolvemos el 1º que pasa la RED.
    let last = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const model = candidate();
      const v = (typeof Playable !== 'undefined') ? Playable.checkLevel(model) : { ok: true, problems: [] };
      last = { model, theme: t.id, name: L(t.name), reward: t.reward || { caramelos: 4 }, attempt, problems: v.problems };
      if (v.ok) return last;
    }
    return last;   // (por construcción no debería fallar; si falla, el caller ve problems[])
  }

  // ----- TEMA "ORÁCULO": la IA INVENTA un nivel a la medida del jugador, según lo que habló con los linyeras/bots
  // (chats = mensajes del jugador, de oracleMem). El proxy arma el tema (name/intro/lines + ELIGE el style = layout)
  // y acá lo envolvemos en un tema ad-hoc para generateLevel. Best-effort: si falla, cb(null) → el caller usa otro.
  function requestOraculo(chats, cb) {
    if (typeof fetch !== 'function' || aiDown()) { cb(null); return; }   // GPU caída → fallback INSTANTÁNEO a tema normal
    const ctrl = new AbortController(); const to = setTimeout(() => { ctrl.abort(); }, AI_TIMEOUT);
    fetch(PROXY + '/nivel-ai', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'oraculo', lang: short(), chats: (chats || []).slice(0, 8) }) })
      .then(r => { clearTimeout(to); if (!r.ok) { markAi(false); return null; } return r.json(); })
      .then(j => {
        if (!j || !j.name) { if (j) markAi(true); cb(null); return; }   // {} = proxy vivo pero sin texto → no abre circuito
        markAi(true);
        const styles = ['wall', 'aisles', 'climb'];
        const props = (typeof j.props === 'string' ? j.props.trim().split(/\s+/) : Array.isArray(j.props) ? j.props : ['🔮', '✨', '👁️', '🌀']).slice(0, 8);
        const lines = (Array.isArray(j.lines) && j.lines.length ? j.lines : ['te conozco, pibe', 'esto es por vos', 'lo pediste vos']).map(s => String(s).slice(0, 40));
        // GEOMETRÍA autorada por la IA (opcional): si manda plataformas/enemigos, los pasamos como aiPlatforms/
        // aiEnemies → generateLevel los sanea + valida por la RED (R4) y auto-repara si no sirven.
        const aiPlatforms = sanitizePlatforms(j.platforms, 30);   // pre-saneo grueso; generateLevel re-sanea por ancho de sala
        const aiEnemies = sanitizeEnemies(j.enemies, 30);
        const aiHazards = sanitizeHazards(j.hazards, 30);
        cb({
          id: 'oraculo', motif: String(j.motif || '🔮').slice(0, 4),
          name: { es: j.name, en: j.name }, intro: { es: j.intro || '', en: j.intro || '' },
          palette: { floor: '#241c2e', floor2: '#2b2238', wall: '#4a3a66', accent: '#e0b0ff' },
          props, npc: { emoji: '🔮', lines: { es: lines, en: lines } },
          goal: { es: 'SALIDA', en: 'EXIT' }, reward: { caramelos: 6 },
          style: styles.indexOf(j.style) >= 0 ? j.style : 'climb', decor: ['cartel', 'caja', 'barril', 'tacho'],
          aiPlatforms, aiEnemies, aiHazards,
        });
      }).catch(() => { clearTimeout(to); markAi(false); cb(null); });   // timeout/red → abre el circuito (modo estático 90s)
  }

  // ----- GEOMETRÍA IA para los TEMAS FIJOS (no solo el oráculo): pide al proxy las plataformas/enemigos de un
  // tema concreto y devuelve el tema (clonado de THEMES) con aiPlatforms/aiEnemies para generateLevel. El texto
  // (name/intro/frases) sigue siendo el bilingüe estático del tema; acá SOLO traemos geometría. Best-effort: si
  // la IA está caída/falla → cb(null) y el caller usa generateLevel() sync (geometría procedural). Ver §4.8.
  function requestGeometry(forceId, cb) {
    const t = forceId ? (THEMES.find(x => x.id === forceId) || THEMES[0]) : THEMES[(Math.random() * THEMES.length) | 0];
    if (typeof fetch !== 'function' || aiDown()) { cb(null); return; }   // GPU caída → sync procedural (instantáneo)
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), AI_TIMEOUT);
    fetch(PROXY + '/nivel-ai', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: t.id, lang: short(), geometry: true }) })
      .then(r => { clearTimeout(to); if (!r.ok) { markAi(false); return null; } return r.json(); })
      .then(j => {
        if (!j) { cb(null); return; }
        markAi(true);
        const aiPlatforms = sanitizePlatforms(j.platforms, 30);
        const aiEnemies = sanitizeEnemies(j.enemies, 30);
        const aiHazards = sanitizeHazards(j.hazards, 30);
        if (!aiPlatforms) { cb(null); return; }                         // sin geometría usable → sync procedural
        cb(Object.assign({}, t, { aiPlatforms, aiEnemies, aiHazards }));
      }).catch(() => { clearTimeout(to); markAi(false); cb(null); });   // timeout/red → abre el circuito (modo estático)
  }

  // ----- HISTORIA del VECINO: la IA flashea un nivel desde la "última historia" del edificio clausurado
  // (specs/edificios-clausurados-historias.md). Mismo patrón que el oráculo: el proxy arma name/intro/props/lines +
  // ELIGE style + (opcional) geometría; acá lo envolvemos en un tema ad-hoc para generateLevel. Best-effort: si la
  // IA está caída/falla → cb(null) y el caller usa su tema ESTÁTICO derivado de la historia (nunca se cuelga). -----
  function requestHistoria(edificio, gancho, cb) {
    if (typeof fetch !== 'function' || aiDown()) { cb(null); return; }   // IA caída → tema estático INSTANTÁNEO
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), AI_TIMEOUT);
    fetch(PROXY + '/nivel-ai', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'historia', edificio: String(edificio || '').slice(0, 24), gancho: String(gancho || '').slice(0, 80), lang: short() }) })
      .then(r => { clearTimeout(to); if (!r.ok) { markAi(false); return null; } return r.json(); })
      .then(j => {
        if (!j || !j.name) { if (j) markAi(true); cb(null); return; }   // {} = vivo pero sin texto → no abre circuito
        markAi(true);
        const styles = ['wall', 'aisles', 'climb'];
        const props = (typeof j.props === 'string' ? j.props.trim().split(/\s+/) : Array.isArray(j.props) ? j.props : ['👻', '🕯️', '🚪', '🩸']).slice(0, 8);
        const lines = (Array.isArray(j.lines) && j.lines.length ? j.lines : ['no deberías estar acá', 'andate', 'te esperábamos']).map(s => String(s).slice(0, 40));
        const aiPlatforms = sanitizePlatforms(j.platforms, 30);
        const aiEnemies = sanitizeEnemies(j.enemies, 30);
        const aiHazards = sanitizeHazards(j.hazards, 30);
        cb({
          id: 'historia', motif: String(j.motif || '👻').slice(0, 4),
          name: { es: j.name, en: j.name }, intro: { es: j.intro || '', en: j.intro || '' },
          palette: { floor: '#16141c', floor2: '#1d1a26', wall: '#3a2e4a', accent: '#c060a0' },
          props, npc: { emoji: String(j.motif || '👻').slice(0, 4), lines: { es: lines, en: lines } },
          goal: { es: 'SALIDA', en: 'EXIT' }, reward: { caramelos: 6 },
          style: styles.indexOf(j.style) >= 0 ? j.style : 'climb', decor: ['cartel', 'caja', 'barril', 'tacho', 'escombros', 'mueble_roto'],
          aiPlatforms, aiEnemies, aiHazards,
        });
      }).catch(() => { clearTimeout(to); markAi(false); cb(null); });   // timeout/red → abre el circuito (modo estático)
  }

  return { generate, generateLevel, enrich, requestOraculo, requestGeometry, requestHistoria, generateShop, requestShop, shopCache, SHOP_RUBROS, THEMES };
})();
if (typeof window !== 'undefined') window.NivelAI = NivelAI;
if (typeof module !== 'undefined') module.exports = NivelAI;
