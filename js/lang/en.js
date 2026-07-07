// lang/en.js — English UI catalog. TRANSCREATION, not literal translation: keep the porteño humor
// and the Buenos Aires flavor (proper nouns stay: Florida, Lavalle, EducaciónIT, Pac-Man...).
// Same keys as lang/es.js (parity is mandatory). See specs/idiomas.md.
const LANG_EN = {
  // --- intro ---
  'intro.title': 'SOLAR STORM',
  'intro.subtitle': 'Level 1 — Calle Florida, Buenos Aires',
  'intro.p1': "A solar storm tore the fabric of space-time and wrecked the planet. The bums swear it wasn't the sun: it was an AI satellite that slipped its leash. You jump between moments in history to figure out why.",
  'intro.p2': "You're on the corner of <strong>Florida & Lavalle</strong>. You can go into the shops: <strong>EducaciónIT</strong> (head up to say hi to the teachers and CEOs), the <strong>arcade</strong> (play <strong>Pac-Man</strong> and <strong>Galaga</strong>) and the <strong>Chinese mini-market</strong> (grab a bite so you don't go hungry 🥟). But the greenbacks are downstairs: go in through the <strong>arcade gallery</strong> and <strong>head down to the cueva</strong>.",
  'intro.p3': "Down there there's no light: it's all illegal, off the books. You buy... and right at that moment, up top, <strong>everything goes dark</strong>.",
  'intro.controls': '<strong>A/D or ←/→</strong> run · <strong>W / Space</strong> jump · <strong>Mouse</strong> aim · <strong>Click (hold)</strong> shoot · <strong>E</strong> use door / buy · <strong>I</strong> inventory · <strong>M</strong> music · <strong>P</strong> your run (your metrics)',
  'intro.start': 'HIT THE STREET',
  'intro.continue': 'CONTINUE',
  'intro.homenaje': "You're <strong>el Carpo</strong>: a bum bluesman, bald, guitar on his back, zero glamour. 🎸 A fond tribute to the bums of Florida & Lavalle (Pechito, Diógenes, Dante). Fiction/parody, no affiliation.",
  'intro.gh': 'Open source (GPLv3) ·',
  'intro.info': 'What is this? · How it works (the stack)',

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
  'opt.nick': 'Your name (multiplayer)',
  'opt.nickPh': 'Your name',
  'opt.nickIs': 'Your nick:',
  'opt.lang': 'Language / Idioma',
  'opt.font': 'Font size',
  'opt.msgMs': 'Text duration',
  'opt.msgFade': 'Fade in / out',
  'opt.aikeyLabel': 'AI chat — FREE, already included (no key needed): the server pays for it. Optional: your own OpenRouter key as an override (ONLY yours and at your own risk; a free/slow model may lag or time out).',
  'opt.aikeyPh': 'sk-or-…  (stored ONLY in your browser)',
  'opt.aimodelPh': 'model (empty = auto)',
  'opt.validate': 'Validate',
  'opt.subLabel': 'Subscription — paste your code for PREMIUM chat (always fast, no waits or caps).',
  'opt.subPh': 'subscription code',
  'opt.subSave': 'Activate',
  'opt.subActive': '✓ Subscription active — premium chat.',
  'opt.subUsage': 'used ${used} of ${limit}',
  'opt.subExpiry': 'expires in {d}d',
  'opt.subInvalid': '✗ Invalid code or not enabled yet.',
  'opt.subChecking': 'Checking code…',
  'opt.subCleared': 'Code cleared — back to free chat.',
  'opt.nickSyncHint': 'To pick up your game on ANOTHER device, type your FULL nick there (with the ·XYZ).',
  'opt.ayuda': 'Map help 🗺️',
  'opt.ayudaNote': 'HARD = locked quests show as a mysterious \"??\". EASY = the map marks EVERYTHING (every quest name, even the ones not unlocked yet).',
  'opt.ayudaFacil': 'EASY (everything marked)',
  'opt.ayudaDificil': 'HARD',
  'opt.hardcore': 'HARDCORE mode 💀',
  'opt.hardcoreNote': 'ON = dying wipes EVERYTHING (no checkpoints, classic). OFF = on death you can return to the last story milestone.',
  'opt.reset': 'Reset',
  'opt.close': 'Close',
  'mundoai.title': '🌀 WORLD MACHINE',
  'mundoai.desc': 'Type a number (seed) and you play THAT generated world. The SAME number gives the SAME world — share it. Leave it empty for a random one.',
  'mundoai.ph': 'seed (e.g. 12345)',
  'mundoai.go': '▶ GENERATE & PLAY',
  'mundoai.rand': '🎲 Random',
  'opt.engine': 'Engine (experimental)',
  'opt.engineNote': 'v1 = stable · v2 = new data-driven engine (applies on (re)start).',

  // --- chat ---
  'chat.title': 'CHAT',
  'chat.inputPh': 'Type and hit Enter...',
  'chat.send': 'Say',
  'chat.close': 'Close',
};
if (typeof window !== 'undefined') window.LANG_EN = LANG_EN;
