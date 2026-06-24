// lang/en.js — English UI catalog. TRANSCREATION, not literal translation: keep the porteño humor
// and the Buenos Aires flavor (proper nouns stay: Florida, Lavalle, EducaciónIT, Pac-Man...).
// Same keys as lang/es.js (parity is mandatory). See specs/idiomas.md.
const LANG_EN = {
  // --- intro ---
  'intro.title': 'SOLAR STORM',
  'intro.subtitle': 'Level 1 — Calle Florida, Buenos Aires',
  'intro.p1': 'A solar storm wrecked the planet and tore the fabric of space-time. You jump between moments in history to figure out why.',
  'intro.p2': "You're on the corner of <strong>Florida & Lavalle</strong>. You can go into the shops: <strong>EducaciónIT</strong> (head up to say hi to the teachers and CEOs) and the <strong>arcade</strong> (play <strong>Pac-Man</strong> and <strong>Galaga</strong>). But the greenbacks are downstairs: go in through the <strong>arcade gallery</strong> and <strong>head down to the cueva</strong>.",
  'intro.p3': "Down there there's no light: it's all illegal, off the books. You buy... and right at that moment, up top, <strong>everything goes dark</strong>.",
  'intro.controls': '<strong>A/D or ←/→</strong> run · <strong>W / Space</strong> jump · <strong>Mouse</strong> aim · <strong>Click (hold)</strong> shoot · <strong>E</strong> use door / buy · <strong>M</strong> music',
  'intro.start': 'HIT THE STREET',
  'intro.continue': 'CONTINUE',
  'intro.gh': 'Open source (GPLv3) ·',

  // --- HUD ---
  'hud.life': 'LIFE',
  'hud.coins': 'COINS',
  'hud.candy': 'CANDY',
  'hud.loop': 'LOOP',
  'hud.ammo': 'AMMO',

  // --- end ---
  'end.restart': 'TRY AGAIN',

  // --- options ---
  'opt.title': '⚙ OPTIONS',
  'opt.lang': 'Language / Idioma',
  'opt.font': 'Font size',
  'opt.msgMs': 'Text duration',
  'opt.msgFade': 'Fade in / out',
  'opt.aikeyLabel': 'AI chat — your OpenRouter API key (optional)',
  'opt.aikeyPh': 'sk-or-…  (stored ONLY in your browser)',
  'opt.aimodelPh': 'model (empty = auto)',
  'opt.validate': 'Validate',
  'opt.reset': 'Reset',
  'opt.close': 'Close',
  'opt.engine': 'Engine (experimental)',
  'opt.engineNote': 'v1 = stable · v2 = new data-driven engine (applies on (re)start).',

  // --- chat ---
  'chat.title': 'CHAT',
  'chat.inputPh': 'Type and hit Enter...',
  'chat.send': 'Say',
  'chat.close': 'Close',
};
if (typeof window !== 'undefined') window.LANG_EN = LANG_EN;
