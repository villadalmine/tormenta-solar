// lang/es.js — catálogo de UI en español rioplatense (es-AR). FUENTE DE VERDAD del contenido.
// Capa aditiva: lo lee i18n.js. Mismas claves que lang/en.js (paridad obligatoria).
const LANG_ES = {
  // --- intro ---
  'intro.title': 'TORMENTA SOLAR',
  'intro.subtitle': 'Nivel 1 — Calle Florida, Buenos Aires',
  'intro.p1': 'Una tormenta solar rasgó el tejido del espacio-tiempo y devastó el planeta. Los linyeras juran que no fue el sol: fue un satélite con IA que se cortó solo. Saltás entre momentos de la historia para entender por qué.',
  'intro.p2': 'Estás en la esquina de <strong>Florida y Lavalle</strong>. Podés entrar a los locales: <strong>EducaciónIT</strong> (subí a saludar a los profes y CEOs), el <strong>arcade</strong> (jugá al <strong>Pac-Man</strong> y al <strong>Galaga</strong>) y el <strong>súper chino</strong> (comprá algo para no pasar hambre 🥟). Pero los verdes están abajo: entrá por la <strong>galería</strong> y <strong>bajá a la cueva</strong>.',
  'intro.p3': 'Ahí abajo no hay luz: es todo ilegal, a la sombra. Comprás... y justo en ese momento, allá arriba, <strong>todo se apaga</strong>.',
  'intro.controls': '<strong>A/D o ←/→</strong> correr · <strong>W / Espacio</strong> saltar · <strong>Mouse</strong> apuntar · <strong>Click (mantené)</strong> disparar · <strong>E</strong> usar puerta / comprar · <strong>I</strong> inventario · <strong>M</strong> música · <strong>P</strong> tu partida (tus métricas)',
  'intro.start': 'ENTRAR A LA PEATONAL',
  'intro.continue': 'CONTINUAR',
  'intro.homenaje': 'Sos <strong>el Carpo</strong>: rockero linyera, pelado, viola al hombro, cero glamour. 🎸 Homenaje cariñoso a los linyeras de Florida y Lavalle (Pechito, Diógenes, Dante). Ficción/parodia, sin afiliación.',
  'intro.gh': 'Código abierto (GPLv3) ·',
  'intro.info': '¿Qué es esto? · Cómo funciona (el stack)',
  'intro.novedades': '📓 Novedades — qué agregamos (bitácora)',

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
  'opt.nick': 'Tu nombre (multijugador)',
  'opt.nickPh': 'Tu nombre',
  'opt.nickIs': 'Tu nick:',
  'opt.lang': 'Idioma / Language',
  'opt.font': 'Tamaño de la fuente',
  'opt.msgMs': 'Duración del texto',
  'opt.msgFade': 'Aparición / desaparición',
  'opt.aikeyLabel': 'Chat con IA — GRATIS, ya incluido (no necesitás key): lo paga el server. Opcional: tu propia key de OpenRouter como override (SOLO tuya y a tu riesgo; un modelo free/lento puede tardar o cortarse).',
  'opt.aikeyPh': 'sk-or-…  (se guarda SOLO en tu navegador)',
  'opt.aimodelPh': 'modelo (vacío = auto)',
  'opt.validate': 'Validar',
  'opt.subLabel': 'Suscripción — pegá tu código para el chat PREMIUM (siempre rápido, sin esperas ni cupos).',
  'opt.subPh': 'código de suscripción',
  'opt.subSave': 'Activar',
  'opt.subActive': '✓ Suscripción activa — chat premium.',
  'opt.subUsage': 'usaste US${used} de ${limit}',
  'opt.subExpiry': 'vence en {d}d',
  'opt.subInvalid': '✗ Código inválido o no habilitado todavía.',
  'opt.subChecking': 'Validando código…',
  'opt.subCleared': 'Código borrado — volvés al chat gratis.',
  'opt.nickSyncHint': 'Para retomar tu partida en OTRO dispositivo, escribí ahí tu nick COMPLETO (con el ·XYZ).',
  'opt.ayuda': 'Ayuda del mapa 🗺️',
  'opt.ayudaNote': 'DIFÍCIL = las quests bloqueadas aparecen como \"??\" misterioso. FÁCIL = el mapa te marca TODO (nombre de cada quest, incluso las que faltan destrabar).',
  'opt.ayudaFacil': 'FÁCIL (todo marcado)',
  'opt.ayudaDificil': 'DIFÍCIL',
  'opt.hardcore': 'Modo HARDCORE 💀',
  'opt.hardcoreNote': 'ON = morir borra TODO (sin checkpoints, como antes). OFF = al morir podés volver al último hito de la historia.',
  'opt.reset': 'Restablecer',
  'opt.close': 'Cerrar',
  'mundoai.title': '🌀 MÁQUINA DE MUNDOS',
  'mundoai.desc': 'Poné un número (semilla) y jugás ESE mundo generado. El MISMO número da el MISMO mundo — pasáselo a alguien. Dejalo vacío para uno al azar.',
  'mundoai.ph': 'semilla (ej. 12345)',
  'mundoai.go': '▶ GENERAR Y JUGAR',
  'mundoai.rand': '🎲 Al azar',
  'mundoai.promptPh': '¿de qué querés el mundo? (opcional)',
  'opt.engine': 'Motor (experimental)',
  'opt.engineNote': 'v1 = estable · v2 = nuevo motor data-driven (aplica al (re)empezar).',

  // --- chat ---
  'chat.title': 'CHARLA',
  'chat.inputPh': 'Escribí y Enter...',
  'chat.send': 'Decir',
  'chat.close': 'Cerrar',
};
if (typeof window !== 'undefined') window.LANG_ES = LANG_ES;
