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
      goal: { es: 'PASILLO TRUCHO', en: 'DODGY AISLE' }, reward: { caramelos: 3 },
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
      goal: { es: 'PUERTA TRASERA', en: 'BACK DOOR' }, reward: { caramelos: 4 },
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
      goal: { es: 'CÁMARA FRÍA', en: 'COLD ROOM' }, reward: { caramelos: 3 },
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
      goal: { es: 'FIN DE LA MURALLA', en: 'END OF THE WALL' }, reward: { caramelos: 5 },
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

  return { generate, enrich, THEMES };
})();
if (typeof window !== 'undefined') window.NivelAI = NivelAI;
if (typeof module !== 'undefined') module.exports = NivelAI;
