// lang/es.js — catálogo de UI en español rioplatense (es-AR). FUENTE DE VERDAD del contenido.
// Capa aditiva: lo lee i18n.js. Mismas claves que lang/en.js (paridad obligatoria).
const LANG_ES = {
  // --- intro ---
  'intro.title': 'TORMENTA SOLAR',
  'intro.subtitle': 'Nivel 1 — Calle Florida, Buenos Aires',
  'intro.p1': 'El planeta fue devastado por una tormenta solar que rasgó el tejido del espacio-tiempo. Saltás entre momentos de la historia para entender por qué.',
  'intro.p2': 'Estás en la esquina de <strong>Florida y Lavalle</strong>. Podés entrar a los locales: <strong>EducaciónIT</strong> (subí a saludar a los profes y CEOs) y el <strong>arcade</strong> (jugá al <strong>Pac-Man</strong> y al <strong>Galaga</strong>). Pero los verdes están abajo: entrá por la <strong>galería</strong> y <strong>bajá a la cueva</strong>.',
  'intro.p3': 'Ahí abajo no hay luz: es todo ilegal, a la sombra. Comprás... y justo en ese momento, allá arriba, <strong>todo se apaga</strong>.',
  'intro.controls': '<strong>A/D o ←/→</strong> correr · <strong>W / Espacio</strong> saltar · <strong>Mouse</strong> apuntar · <strong>Click (mantené)</strong> disparar · <strong>E</strong> usar puerta / comprar · <strong>M</strong> música',
  'intro.start': 'ENTRAR A LA PEATONAL',
  'intro.continue': 'CONTINUAR',
  'intro.gh': 'Código abierto (GPLv3) ·',

  // --- HUD ---
  'hud.life': 'VIDA',
  'hud.coins': 'MONEDAS',
  'hud.candy': 'CARAMELOS',
  'hud.loop': 'LOOP',
  'hud.ammo': 'MUN.',

  // --- fin ---
  'end.restart': 'REINTENTAR',

  // --- opciones ---
  'opt.title': '⚙ OPCIONES',
  'opt.lang': 'Idioma / Language',
  'opt.font': 'Tamaño de la fuente',
  'opt.msgMs': 'Duración del texto',
  'opt.msgFade': 'Aparición / desaparición',
  'opt.aikeyLabel': 'Chat con IA — tu API key de OpenRouter (opcional)',
  'opt.aikeyPh': 'sk-or-…  (se guarda SOLO en tu navegador)',
  'opt.aimodelPh': 'modelo (vacío = auto)',
  'opt.validate': 'Validar',
  'opt.reset': 'Restablecer',
  'opt.close': 'Cerrar',
  'opt.engine': 'Motor (experimental)',
  'opt.engineNote': 'v1 = estable · v2 = nuevo motor data-driven (aplica al (re)empezar).',

  // --- chat ---
  'chat.title': 'CHARLA',
  'chat.inputPh': 'Escribí y Enter...',
  'chat.send': 'Decir',
  'chat.close': 'Cerrar',
};
if (typeof window !== 'undefined') window.LANG_ES = LANG_ES;
