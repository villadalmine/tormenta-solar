// nivelai.js — GENERADOR DE NIVELES (la "máquina de hacer chorizos", v2). Se DISPARA cuando te colás a la
// trastienda del chino durante el RAID: genera una ESCENA surreal temática (data-driven) y la corre el
// sub-modo Spinoff (js/spinoff.js). El "molde" son los THEMES (DATA): cada uno describe un nivel; el
// generador compone props/npcs/meta dentro de una grilla. Opcional: el proxy /nivel-ai autora el texto con
// IA (name + líneas), con FALLBACK estático (igual que los bancos de propaganda/chusmerío). Ver
// specs/fabrica-niveles-ai.md.
const NivelAI = (() => {
  const PROXY = 'https://llm-tormenta-solar.cybercirujas.club';   // mismo proxy que ai.js/propaganda.js
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
  ];

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
    if (typeof fetch !== 'function') return;
    try {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 9000);
      fetch(PROXY + '/nivel-ai', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: scene.id, lang: short() }) })
        .then(r => { clearTimeout(to); return r.ok ? r.json() : null; })
        .then(j => {
          if (!j) return;
          if (j.name) scene.name = j.name;
          if (j.intro) scene.intro = j.intro;
          if (Array.isArray(j.lines) && j.lines.length) for (const n of scene.npcs) n.lines = j.lines.slice();
          if (cb) cb(scene);
        }).catch(() => {});
    } catch (e) {}
  }

  // ----- LADRILLO 2 DE LA C: generar un NIVEL-PLATAFORMA REAL (modelo v2 que consume Mundo.fromModel) -----
  // A diferencia de `generate()` (escena top-down del Spinoff), esto produce un MODELO DE NIVEL del MOTOR REAL:
  // sala con plataformas saltables + spawn + meta + enemigos/pickups temáticos. Pasa por la RED (Playable):
  // genera → valida jugabilidad → si falla, RE-INTENTA (bucle de auto-reparación) → recién entonces se devuelve.
  // Así la "imaginación" de la IA nunca produce un nivel intransitable. Ver specs/fabrica-niveles-ai.md §4.7.
  function generateLevel(forceId) {
    const t = forceId ? (THEMES.find(x => x.id === forceId) || THEMES[0]) : THEMES[(Math.random() * THEMES.length) | 0];
    const GTOP = 12;
    const rnd = (a, b) => a + ((Math.random() * (b - a + 1)) | 0);
    const pick = a => a[(Math.random() * a.length) | 0];
    const decorKeys = t.decor || ['caja', 'barril', 'tacho'];
    const style = t.style || 'climb';
    // PLATAFORMAS según el STYLE del tema (data) — así cada nivel se SIENTE distinto (la muralla parece muralla, etc.).
    // Siempre confinadas a x∈[5..w-6] (lejos de las columnas x=2 y x=w-3 de puertas/spawn/meta) y nunca en GTOP-1.
    function layoutPlatforms(w) {
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
    // UNA sala del nivel: i=índice, n=total. Spawn en la 1ª (izq), META en la última (der); las del medio se enlazan
    // con puertas recíprocas (izq→sala anterior, der→sala siguiente). Plataformas saltables sin tapar puerta/spawn/meta.
    function room(i, n) {
      const w = style === 'wall' ? rnd(34, 42) : rnd(24, 32), id = 'sala-ai-' + i;   // la muralla es ANCHA (se recorre a lo largo)
      const ents = [];
      const plats = layoutPlatforms(w);
      // marcadores / puertas
      if (i === 0) ents.push({ id: id + '/spawn', tipo: 'marker', x: 2, render: { type: 'spawn' } });
      else ents.push({ id: id + '/door-l', tipo: 'door', x: 2, inward: 1, render: { type: 'door' }, link: { to: 'sala-ai-' + (i - 1) } });
      if (i === n - 1) ents.push({ id: id + '/goal', tipo: 'marker', x: w - 3, render: { type: 'goal' } });
      else ents.push({ id: id + '/door-r', tipo: 'door', x: w - 3, inward: -1, render: { type: 'door' }, link: { to: 'sala-ai-' + (i + 1) } });
      // pickups arriba de plataformas (premio por trepar) + enemigos DESPIERTOS temáticos + decor del tema en el piso
      for (const p of plats) if (Math.random() < 0.5) ents.push({ id: id + '/pk' + p[0], tipo: 'pickup', x: p[0] + 0.5, y: p[1] - 1, give: { item: pick(['ammo', 'coins', 'health']), amount: rnd(3, 6) } });
      for (let k = 0, e = rnd(1, 3); k < e; k++) ents.push({ id: id + '/en' + k, tipo: 'enemy', x: rnd(6, w - 5) + 0.5, combat: { type: Math.random() < 0.5 ? 'peaton' : 'dron' } });
      for (let k = 0, d = rnd(2, 4); k < d; k++) ents.push({ id: id + '/dec' + k, tipo: 'decor', x: rnd(4, w - 4) + 0.5, render: { type: pick(decorKeys) } });
      return { id, nombre: L(t.name) + (n > 1 ? ' · ' + (i + 1) + '/' + n : ''), theme: 'ruina', tags: ['generado', t.id], w, light: 1, platforms: plats, entities: ents };
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

  return { generate, generateLevel, enrich, THEMES };
})();
if (typeof window !== 'undefined') window.NivelAI = NivelAI;
if (typeof module !== 'undefined') module.exports = NivelAI;
