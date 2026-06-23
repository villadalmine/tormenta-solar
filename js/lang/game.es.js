// lang/game.es.js — catálogo de la NARRACIÓN del juego (game.js): setMsg, prompts, fin, etc.
// Fuente de verdad en español. Se mergea en LANG_ES (definido en lang/es.js, cargado antes).
// Mismas claves que lang/game.en.js (paridad). Arrays = líneas al azar (I18n.tList / TL en game.js).
(function () {
  const G = {
    'g.start': 'Andá a la derecha y entrá por la GALERÍA para bajar a la cueva.  [E] usar puerta',
    'g.loaded': 'Retomaste donde dejaste, pibe. 💾',

    // --- ruinas / barricada / colas ---
    'g.ruina': [
      'Ese edificio se vino abajo con la tormenta. Tapiado, no se entra. 🧱',
      'Derrumbado y clausurado: escombros hasta la puerta. 🚧',
      'Ya fue, está hecho pedazos. Probá los lugares que aguantaron (chino, cueva, el de los borrachines). 💥',
    ],
    'g.super.barricada': 'El FRENTE del chino está atrincherado: tachos con fuego, granadas y los ninjas de guardia. No entrás por acá. → Entrá por la PUERTA TRASERA (desde la cueva) o que IORIO toque para que se vayan. 🔥🥷',
    'g.cambio.cola': [
      '“¡Ehh, loco, no te coles!”',
      '“¡Hacé la cola como todos, vivo!”',
      '“No entra un alfiler, está hasta las pelotas.”',
      '“¡Respetá la fila, colado!”',
      '“Sacá número y esperá como todos, eh.”',
    ],
    'g.abandonado': [
      '“Eh eh... acá no entra cualquiera, pibe.” Los tres borrachines te tapan la puerta. 🚫',
      '“Primero atendé a los muchachos y después hablamos del edificio, ¿estamos?” 🍻',
      'Los borrachines no se mueven. Algo querrán... charlá con cada uno (E). 🤔',
    ],

    // --- arcade / truco lanzamiento ---
    'g.frogger.start': '¡A jugar al Frogger!',
    'g.truco.sit': 'Te sentás a la mesa...',

    // --- joyas / linyera / tótem ---
    'g.joyas.default': '“No toques eso, pibe.”',
    'g.joyas.eject': 'Vas a manotear las joyas y SALE EL LINYERA: {line} Te agarra de la campera y te saca cagando a la calle. 🦶🚪',
    'g.totem.first': 'Vas a afanar el TÓTEM de 3 monos 🐵🐵🐵 y de la nada salen VEINTE linyeras... pero en vez de cagarte a palos te consagran GURÚ: “¡Encontraste a nuestro dios de Monkey Island! La puerta del PISO 20 es tuya: te lleva a nuestro BÚNKER, el lugar más seguro. Queda SIEMPRE abierta para vos.” 🗝️🛖',
    'g.totem.again': '“Gurú, la puerta del PISO 20 ya es tuya. El búnker te espera arriba.” 🐵',
    'g.linyeraCry': [
      '“Yo tenía TRES deptos en Puerto Madero... tres. (se quiebra) Mirá ahí en el inodoro, agarrá, total ya no me sirve de nada...” 😭',
      '“Era gerente de banco. Traje, reuniones, un vacío de mierda. (llora) Hay guita en la caja fuerte, llevate, pibe.” 💼😢',
      '“Tenía un auto importado por cada día de la semana. ¿Y para qué, eh? (moquea) Sacá unas monedas, dale.” 🚗',
      '“Me cansé de laburar para una vida vacía. (suspira) Tomá, a mí no me hacen falta.” 🪙',
    ],
    'g.revive': 'Te moriste de hambre... pero el loop te escupe de vuelta al refugio (DÍA #{n}). Seguí comiendo, pibe. 💀🔁',

    // --- falopa ---
    'g.falopa.preStorm': 'Es un maletín lleno de dólares... con el espacio-tiempo intacto, mejor ni tocarlo (acordate del linyera). 💼',
    'g.falopa.empty': 'Este cajón ya lo vaciaste. Se rellena el próximo día (dormí en el búnker). 🌿',
    'g.falopa.grab': 'Abrís el cajón del mueble de lujo: ¡repleto de FALOPA! 🌿 Agarrás (+2, tenés {n}). Es para que IORIO toque y se vayan los ninjas del chino.',

    // --- limosna ---
    'g.limosna.preStorm': '“...andá pasando, pibe...”',
    'g.limosna.empty': '“Ya te di lo que tenía, pibe. Volvé mañana.” 🪙',

    // --- armas ---
    'g.armas.preStorm': '“Guardá la guita, pibe. Con la luz andando todavía, las eléctricas te alcanzan. Volvé cuando se pudra todo.” 🗡️',
    'g.armas.done': '“Ya te armé, criollo. Andá a hacer historia.” ⚔️',
    'g.armas.noCoins': '“Fierro criollo no es gratis, pibe. Son {cost} monedas.” 🗡️',
    'g.armas.buy': 'El tipo abre un trapo en el piso: REBENQUE, BOLEADORAS, FACÓN y un FAL de Malvinas. “Las eléctricas no andan con la tormenta solar, pibe. Llevate fierro criollo de verdad.” ⚔️🇦🇷  +40 munición, +20 vida.',

    // --- Iorio ---
    'g.iorio.preStorm': '“Traeme falopa y te toco Pibe Tigre.” 🤘',
    'g.iorio.noFalopa': 'Iorio: “¿Y la falopa, gil? Sin merca no hay Pibe Tigre. Buscá en los CAJONES de los deptos de lujo del edificio.” 🤘',
    'g.iorio.give': 'Le pasás la falopa a Iorio 🤘. Arranca PIBE TIGRE y los NINJAS (metaleros) dejan el chino y se van al recital. ¡El FRENTE del chino quedó ABIERTO! Corré a comer antes de que vuelvan. (Iorio putea al sol: “...che tano Marcello, menos mal que ahora hacemos acústicos y tango, ya que no hay luz.”) 🎻',

    // --- loop / catre ---
    'g.loop.preStorm': 'La city todavía está normal, no estalló nada. ¿Para qué dormir? El loop de supervivencia arranca cuando reviente la TORMENTA SOLAR. 😴',
    'g.loop.sleep': 'Dormís en el catre. 🌅 DÍA #{n}. El caos de la tormenta sigue afuera. La falopa de los cajones se repuso y te quedó algo de guita; arrancás con la vida llena, pero el hambre vuelve: salí a COMER. 🍜',

    // --- fifa ---
    'g.fifa.noMega': '“¿Trajiste una Mega Drive? Comprá una en el super chino (sección CONSOLAS) y volvé para el torneo de FIFA.” 🎮',
    'g.fifa.done': '“Campeón del torneo de FIFA 98, ¡grande!” 🏆',
    'g.fifa.win': 'Enchufás la MEGA DRIVE y jugás el TORNEO DE FIFA 98 (el primero). Gambeteás, la clavás al ángulo... ¡CAMPEÓN! 🏆 +30 monedas.',

    // --- borrachines ---
    'g.borracho.fed': ['“Gracias, campeón, ya estoy servido.” 🥴', '“Salú de nuevo, hermano.”', '“Sos un fenómeno, pibe.”'],
    'g.borracho.gotDiosa': 'una DIOSA TROPICAL 🍹',
    'g.borracho.gotCarne': 'un PEDAZO DE CARNE 🥩',
    'g.borracho.gotFiambre': 'un FIAMBRE (sándwich) 🥓',
    'g.borracho.allHappy': 'Le encajás {got}. Los TRES saltan de alegría 🎉 y te invitan a pasar: sos SOCIO VIP por alimentar a las clases bajas de forma desinteresada. El edificio queda ABIERTO. 🏚️ (Y te soplan: “Adentro del super hay una puerta directa a la cueva del que te cagó.”) 🤫',
    'g.borracho.thanks': 'Le encajás {got}. “¡Aaah, gracias maestro!” Deja de pedirte cosas.  ({n}/3 borrachines contentos)',
    'g.borracho.askDefault': '“¿Una mano no me das, pibe?”',

    // --- chat ---
    'g.chat.offline': '(sin IA conectada — respuestas predefinidas. Pegá tu API key en ⚙ Opciones.)',
    'g.chat.online': '(charlando con IA — {mode})',
    'g.chat.error': '“...se me cruzó un cable, pibe. Repetí.”',
    'g.chat.localWarn': '(la IA no respondió con tu key — líneas locales. Abrí la consola F12 para ver el error: 429/404/CORS, etc.)',
    'g.chat.youPrefix': 'Vos: ',
    'g.oraculo.greet': '“Eh, pibe... yo veo el quilombo entero desde acá arriba. Preguntame, que algo sé.” 🧙',

    // --- cueva secreta ---
    'g.cueva.secretMoney': 'Entrás por la puerta secreta y encarás al arbolito que te cagó. Le sacás la guita: +60 monedas. 😎',
    'g.cueva.secretEmpty': 'La cueva del arbolito. Ya le sacaste todo, no queda nada.',

    // --- shop ---
    'g.shop.empty': '“Ya no me queda, flaco.”',
    'g.shop.noFunds': 'No te alcanza: cuesta {cost} {cur} y tenés {have}.',
    'g.shop.ammo': '+{n} munición',
    'g.shop.health': '+{n} vida',
    'g.shop.coins': '+{n} monedas',
    'g.shop.amuleto': 'un amuleto tenebroso (+30 munición, +25 vida)',
    'g.shop.bought': 'Compraste: {txt}  (−{cost} {cur})',
    'g.cur.caramelos': 'caramelos',
    'g.cur.forros': 'forros',
    'g.cur.monedas': 'monedas',

    // --- máquinas ---
    'g.machine.possessed': 'La máquina está poseída por la tormenta... ¡te ataca!',
    'g.machine.pay': '“Flaco, esta es MI máquina. Son {price} monedas. Sin guita no jugás.” 💸',
    'g.machine.paid': 'Pagaste {price} monedas... “La próxima te sale más, eh.” 😏',
    'g.machine.trucotron': 'Sale un tipo del fondo oscuro: “Ehh, con peleles no juego. Ganale a TODAS las máquinas primero, pibe.”',

    // --- cuevero ---
    'g.cuevero.enter': 'Entrás a la cueva del dólar. 💵 Gente esperando, olor a humedad, todos murmurando. Hablales (E)... y andá al cuevero del fondo a cambiar.',
    'g.cuevero.real': '{dialog} ...y JUSTO explota todo. El tipo se queda con tu plata. Vos: nada. 💸',

    // --- chori / secreto ---
    'g.chori.eat': '🌭 Te comés el choripán gratis. +40 vida. ¡Aguante!',
    'g.chori.noVale': 'Necesitás un vale. Ganale al del choripán en el arcade (Street Fighter).',
    'g.secret.unlock': 'Un tipo sale de atrás: “Pibe... le ganaste a todas. ¿Querés ganar MUCHA plata? Vení, no preguntes.” Se abrió una puerta al fondo del arcade. 🚪',

    // --- transiciones de sala ---
    'g.trans.streetStorm': 'La calle quedó a oscuras y todo enloqueció. La CASA DE CAMBIO OFICIAL quedó abierta: metete ahí, el portal se abrió adentro. 🏦🌀',
    'g.trans.street': 'De vuelta en Florida y Lavalle.',
    'g.trans.cambioStorm': '¡El espacio-tiempo se partió! La gente corre en pánico y al fondo se abrió un PORTAL. ¡Metete ahí! 🌀',
    'g.trans.cambioFull': 'Casa de Cambio Oficial: está HASTA LAS PELOTAS de gente sacando número. No se puede ni respirar. 🏦',
    'g.trans.cemento': 'CEMENTO. Almafuerte hace la prueba de sonido 🤘. Está todo lleno de humo y olor a asado haciéndose. 🔥🥩',
    'g.trans.lujo': 'Piso de LUJO 👗✨: lo mejor de la moda, vidrieras impecables... y no hay un alma. Saqueá tranquilo (E en el ascensor para seguir).',
    'g.trans.ruina': 'Piso DESTRUIDO 💀: escombros, olor a encierro y gente tirada, hecha mierda, durmiendo. Pisá despacio.',
    'g.trans.garbarino': 'Garbarino: electrónica carísima. El vendedor no te suelta. 📺💸',
    'g.trans.edu': 'EducaciónIT — saludá a la gente (E) y subí en ascensor.',
    'g.trans.arcadeStorm': '¡El arcade está poseído! Pac-Man y Galaga te atacan.',
    'g.trans.arcade': 'Arcade — apretá E en una máquina para jugar.',
    'g.trans.shop': 'Chorería — canjeá tu vale con el parrillero (E).',
    'g.trans.bunker': 'El BÚNKER de los linyeras 🛖: el lugar más seguro de la city, acá no entra nadie. Tocá el catre (E) para quedarte en el LOOP, o volvé y andá al portal de la Casa de Cambio para salir de verdad.',
    'g.trans.trucoStore': 'La trastienda: el tahúr te espera para el truco. 🃏',
    'g.trans.secretStore': 'Entrás con miedo... humo, dos mesas, gente que te mira. “Acá no viste nada, pibe.”',
    'g.trans.cueveros': 'Tres cuevas, tres cueveros. Probá con cada uno (E)... a ver quién te cambia.',
    'g.trans.deeper': 'Más abajo... seguí bajando hasta las cuevas.',
    'g.storm': '“Listo, jefe.” Un temblor: ARRIBA se cortó TODO por la tormenta solar. Acá abajo, sin luz, nada cambia. Subí y escapá.',

    // --- prompts ---
    'g.prompt.cuevero': 'hablar con el cuevero',
    'g.prompt.fighter': 'retar a Street Fighter',
    'g.prompt.chori': 'canjear vale (choripán)',
    'g.prompt.shop': 'comprar ({cost} {cur})',
    'g.prompt.lujoStorm': 'abrir el cajón del mueble (falopa) 🌿',
    'g.prompt.lujo': 'tocar las joyas 💎',
    'g.prompt.totem': 'robar el tótem de 3 monos 🐵',
    'g.prompt.limosna': 'pedirle unas monedas al linyera 🪙',
    'g.prompt.iorioStorm': 'darle falopa a Iorio 🤘',
    'g.prompt.iorio': 'hablar con Iorio',
    'g.prompt.armasStorm': 'comprar fierro criollo ⚔️',
    'g.prompt.armas': 'hablar con el misterioso',
    'g.prompt.chat': 'charlar 💬 con {name}',
    'g.prompt.loop': 'tirarte a dormir (pasar un día) 😴',
    'g.prompt.talk': 'hablar con {name}',
    'g.prompt.machinePossessed': '¡máquina poseída!',
    'g.prompt.machinePay': 'jugar {name} ({price} monedas)',
    'g.prompt.machine': 'jugar {name}',
    'g.prompt.collapsed': 'derrumbado, no se entra 🧱',

    // --- labels dibujados sobre el canvas ---
    'g.label.barricada': '🔥 ATRINCHERADO',
    'g.label.clausurado': 'CLAUSURADO',
    'g.label.psst': '¡psst! vení',

    // --- arcade resultados ---
    'g.truco.win': 'Le ganás al tahúr... pero las minas se te tiran encima 💃💃, no te dejan ni caminar y te afanan {n} monedas. 😵 (Igual: el tahúr abre una puerta al fondo que cruza derecho al CHINO — usala antes de irte.)',
    'g.truco.lose': 'Perdés. El tahúr te sonríe de costado... dicen que al tipo le gusta el marrón. Salís medio incómodo, sin saber bien por qué. (−25 vida)',
    'g.frogger.valeWin': '¡Le ganaste al Frogger! Tenés un VALE por un choripán gratis 🌭. Canjealo en la chorería.',
    'g.frogger.valeLose': 'Te ganó el del chori. Sin vale... pedile revancha.',
    'g.frogger.win': '🐸 ¡Cruzaste! +8 monedas.',
    'g.frogger.lose': 'Te aplastaron en el Frogger.',
    'g.pacman.win': '🕹️ ¡Ganaste el Pac-Man! +10 monedas, +6 munición.',
    'g.galaga.win': '🕹️ ¡Ganaste el Galaga! +10 monedas, +20 vida.',
    'g.arcade.gameover': 'Game over. Probá de nuevo, hay monedas en juego.',
    'g.super.leave': 'Salís del super chino con los bolsillos llenos de caramelos. 🍬',
    'g.vinilos.leave': 'Salís de la disquería. 🎵',

    // --- música ---
    'g.music.on': '♪ Música ON',
    'g.music.off': '♪ Música OFF',

    // --- fin ---
    'g.win.title': 'PORTAL ESTABLE',
    'g.win.text': 'Cruzás el portal mientras Florida y Lavalle se desmoronan en estática.<br><br>Esto no empezó hoy: la tormenta viene desde mucho más atrás... desde que pusimos un satélite a pensar por nosotros.<br><br><em>El salto temporal comienza. (Fin del Nivel 1)</em>',
    'g.die.title': 'TE CONSUMIÓ LA TORMENTA',
    'g.die.text': 'La interferencia te alcanzó.<br><br>El portal temporal se cierra sin vos.<br><br><em>Probá de nuevo.</em>',

    // --- resumen de la partida (pantalla de fin) ---
    'g.stats.title': 'CÓMO TE FUE',
    'g.stats.coins': 'Guita en el bolsillo',
    'g.stats.days':  'Días en el quilombo',
    'g.stats.items': 'Cosas que juntaste',
    'g.stats.hitos': 'Hitos',
    'g.hito.tormenta':  'Disparaste la tormenta solar',
    'g.hito.edificio':  'Abriste el edificio abandonado',
    'g.hito.bunker':    'Te consagraron gurú (búnker)',
    'g.hito.iorio':     'Iorio corrió a los ninjas',
    'g.hito.truco':     'Le ganaste al Tahúr',
    'g.hito.fifa':      'Campeón del FIFA 98',
    'g.hito.megadrive': 'Conseguiste la Mega Drive',
    'g.hito.cemento':   'Entraste a Cemento',
    'g.hito.armado':    'Te armaste con fierro criollo',
    'g.hito.portal':    'Cruzaste el portal',

    // ===== SUPER CHINO (super.js) =====
    'sup.intro': 'Agarrá de las góndolas [E] (se mete al changuito SIN pagar). Después pagás en la CAJA del chino — te da el vuelto en caramelos. Si rajás sin pagar... salen los ninjas. ESC: salir.',
    'sup.title': 'SUPER CHINO 超市',
    'sup.till': 'CAJA 超市',
    'sup.exitLabel': 'SALIDA',
    'sup.cart': '🛒 CHANGUITO: {n}{unpaid}',
    'sup.unpaid': ' (sin pagar)',
    'sup.sectorFmt': 'SECTOR {name}',
    'sup.sector.ALMACEN': 'ALMACÉN',
    'sup.sector.LIMPIEZA': 'LIMPIEZA',
    'sup.sector.BAZAR': 'BAZAR',
    // nombres de categoría (se muestran en góndolas y prompts; la clave interna queda fija)
    'sup.cat.VINOS': 'VINOS', 'sup.cat.BIRRAS': 'BIRRAS', 'sup.cat.DIOSAS': 'DIOSAS',
    'sup.cat.FIAMBRES': 'FIAMBRES', 'sup.cat.CARNES': 'CARNES', 'sup.cat.GOLOSINAS': 'GOLOSINAS',
    'sup.cat.GALLETITAS': 'GALLETITAS', 'sup.cat.LIMPIEZA': 'LIMPIEZA', 'sup.cat.HIGIENE': 'HIGIENE',
    'sup.cat.BAZAR': 'BAZAR', 'sup.cat.CONSOLAS': 'CONSOLAS',
    // etiquetas cortas (lo que metés al changuito)
    'sup.label.VINOS': 'un vino 🍷', 'sup.label.BIRRAS': 'una birra 🍺', 'sup.label.DIOSAS': 'una Diosa Tropical 🍹',
    'sup.label.FIAMBRES': 'un fiambre 🥓', 'sup.label.CARNES': 'un pedazo de carne 🥩', 'sup.label.GOLOSINAS': 'caramelos 🍬',
    'sup.label.GALLETITAS': 'galletitas 🍪', 'sup.label.LIMPIEZA': 'lavandina 🧴', 'sup.label.HIGIENE': 'jabón 🧼',
    'sup.label.BAZAR': 'un chiche del bazar 🔌', 'sup.label.CONSOLAS': 'una consola 🎮',
    'sup.grab.garca': 'El garca te encaja ',
    'sup.grab.take': 'Agarrás ',
    'sup.grab.body': ' y lo metés al changuito (SIN pagar). Changuito: {n} ítem{s}. Pagá en la CAJA del chino. 🛒',
    'sup.pay.nothing': 'Chino: “Amigo, no agarraste nada. Andá a las góndolas primero.” 🧧',
    'sup.pay.noFunds': 'Chino: “Te falta la guita, amigo. Son {total} monedas y tenés {coins}. Caramelos NO acepto. Dejá algo o conseguí más.” 🧧',
    'sup.pay.ok': 'Chino: “¡Gracias amigo!” 🧧 Pagás {total} monedas por {n} producto{s}. Vuelto: +{change} caramelos 🍬.',
    'sup.pay.mega': ' ¡Y te llevás una MEGA DRIVE! 🎮 (torneo de FIFA: el flaco del TRUCOTRON en el arcade).',
    'sup.pay.heal': ' Comés ahí mismo: +{n} vida. 🍜  (Ahora rajá por la PUERTA SECRETA del fondo.)',
    'sup.leave.ninjas': 'Intentás rajar con {n} producto{s} SIN pagar... De la PUERTA OSCURA (donde vive la familia del chino) salen DOS NINJAS SAMURÁI 🥷🗡️ y te echan del local SIN lo que “te olvidaste” de pagar.',
    'sup.leave.front': 'Querés salir por la puerta principal... “¡Eh, solo, loco! ¿No ves que afuera está todo HASTA LA TETA? Quedate, pibe, gastá tranquilo... el chino tiene caramelos.” 🧧 → Rajá por la PUERTA SECRETA del fondo (a la cueva).',
    'sup.family': 'Chino (tapando la puerta oscura): “Acá NO, amigo. Acá vive la familia. Comprá y pagá tranquilo, ¿eh?” 🥷',
    'sup.hint': 'Acercate a una góndola (agarrar) o a la CAJA (pagar) y apretá E.',
    'sup.candyAngry': 'Chino, ENOJADO: “¡Chino NO comer y pagar con caramelos! ¡Caramelos NO! Pagá con monedas, amigo.” 🤬',
    'sup.prompt.garca': '🥩 Garca de {cat} — [E] te encaja al changuito',
    'sup.prompt.gondola': '🛒 Góndola de {cat} — [E] al changuito',
    'sup.prompt.caja': '🧧 CAJA del chino — [E] PAGAR ({total} monedas, vuelto en caramelos)',
    'sup.prompt.family': '🚪 Puerta oscura — la familia del chino (no se entra)',
    'sup.prompt.secret': '🚪 PUERTA SECRETA — salir (¡pagá antes!)',
    'sup.prompt.exit': '↓ Salida a la calle (¡pagá antes!)',

    // ===== DISQUERÍA (vinilos.js) =====
    'vin.title': 'DISQUERÍA  🎵 80s chiptune sonando',
    'vin.banner': '★ DISQUERÍA SUBTERRÁNEA ★  vinilos · cassettes · CDs',
    'vin.exitLabel': 'SALIDA ↑',
    'vin.intro': 'Disquería: 3 góndolas por época. [E] revisar vinilos / hablar con el punk. ESC: salir.',
    'vin.era.60/70': '60/70', 'vin.era.80/90': '80/90', 'vin.era.2000/HOY': '2000/HOY',
    'vin.dig': '🎵 Revolvés los vinilos de {era}: encontrás un {disc}. (compráselo al punk en el mostrador)',
    'vin.punk.noFunds': 'Punk: “God Save the Queen... pero sin guita no hay vinilo, hermano.” (8 monedas) 🎸',
    'vin.punk.ticket': 'Comprás un disco de ALMAFUERTE 🤘. Punk: “Mirá loco, tocan en CEMENTO, te regalo una entrada. Yo no puedo ir, me tengo que hacer un estudio de hígado... la Diosa Tropical me lo comió entero.” 🎫',
    'vin.punk.again': 'Comprás otro vinilo de metal argentino. 🤘 “Aguante, pibe.”',
    'vin.hint': 'Acercate a una góndola o al mostrador (punk) y apretá E.',
    'vin.prompt.gondola': '🎵 Góndola {era} — [E] revisar',
    'vin.prompt.punk': '🎸 Punk del mostrador — [E] hablar',
    'vin.prompt.exit': '↓ Salida',

    // ===== ARCADE (arcade.js) =====
    'arc.esc': 'ESC: salir',
    'arc.win': '¡GANASTE!',
    'arc.lose': 'PERDISTE',
    'arc.gameover': 'GAME OVER',
    'arc.score': 'PUNTOS',
    'arc.lives': 'VIDAS',
    'arc.pac.eat': '  🍒 ¡COMÉLOS!',
    'arc.fight.you': 'VOS',
    'arc.fight.chori': 'EL DEL CHORI',
    'arc.fight.controls': 'A/D mover · W saltar · J piña · K patada',
    'arc.frog.goal': 'META',
    'arc.frog.controls': 'flechas/WASD · VIDAS {n}',
    'arc.truco.note0': 'Carta 1/2/3 · T: truco · V: envido',
    'arc.truco.controls': '1/2/3 carta · T truco · V envido',
    'arc.truco.envNo': 'Envido: el tahúr no quiere. +6 forros.',
    'arc.truco.envWin': 'Envido {pe} a {ae}. ¡Tuyo! +6 forros',
    'arc.truco.envLose': 'Envido {pe} a {ae}. Perdiste. −6 forros',
    'arc.truco.quiero': '“¡Quiero!” Va el truco: vale 20 forros.',
    'arc.truco.noQuiero': '“No quiero.” ¡Te llevás la mano! +{stake} forros',
    'arc.truco.handWin': '¡Ganaste la mano!',
    'arc.truco.handLose': 'Te ganó la mano.',
    'arc.truco.tie': 'Parda.',
    'arc.truco.bigWin': '¡GANASTE EL TRUCO!',
    'arc.truco.yourTurn': 'Tu turno: carta 1/2/3',
    'arc.truco.tHint': ' · T truco',
    'arc.truco.score': 'VOS {p}  -  {ai} TAHÚR',
    'arc.truco.pot': 'Pozo: {stake} forros',
    'arc.truco.potDelta': '   (vas {sign}{delta})',

    // ===== Chat IA: estado en ⚙ Opciones (ai.js) =====
    'ai.status.byok': '✓ Chat IA con TU key (pagás tu propio uso; la key queda en tu navegador).',
    'ai.status.proxy': '✓ Chat IA por el proxy del juego.',
    'ai.status.offline': 'Chat IA: offline (líneas predefinidas). Pegá tu key de openrouter.ai/keys para activarlo.',
    'ai.model.label': 'Modelo: {model}',
    'ai.model.chosen': ' (elegido por vos)',
    'ai.model.default': ' (por defecto · podés cambiarlo)',
    'ai.model.needKey': 'Validar: pegá primero tu API key arriba.',
    'ai.model.validating': 'Validando {model}…',
    'ai.model.ok': '✓ Anda · {ms} ms {speed}',
    'ai.speed.fast': '(rápido 🚀)',
    'ai.speed.ok': '(ok 👍)',
    'ai.speed.slow': '(lento 🐢)',
    'ai.err.noFetch': 'sin fetch',
    'ai.err.noKey': 'pegá primero tu API key arriba',
    'ai.err.noModel': 'escribí un modelo (ej. mistralai/mistral-7b-instruct:free)',
    'ai.err.401': 'API key inválida (401)',
    'ai.err.404': 'ese modelo no existe (404)',
    'ai.err.429': 'saturado (429), probá en un rato',
    'ai.err.http': 'error {status}',
    'ai.err.timeout': 'timeout (>15s, lentísimo)',
  };
  if (typeof LANG_ES !== 'undefined') Object.assign(LANG_ES, G);
  else if (typeof window !== 'undefined') window.LANG_ES = G;
})();
