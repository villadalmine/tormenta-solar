// lang/level.en.js — TRANSCREATION map for level.js content (room names, NPC names, fixed dialogs,
// door labels, hints). level.js keeps its Spanish strings internally (so name-based logic / regex /
// pool wiring keep working); game.js translates ONLY at display time via TX() → levelTx().
// Keep porteño humor; proper nouns stay. Pool-driven NPC lines are handled by Dialogos[en], not here.
const LEVEL_EN = {
  // ---- cameos (homenaje) ----
  'Diógenes': 'Diogenes',
  'Dante el poeta': 'Dante the poet',
  '“Corréte que me tapás el sol, pibe. Lo demás es vento que no te hace falta.” ☀️🛢️':
    '"Step aside, kid, you\'re blocking my sun. The rest is dough you don\'t even need." ☀️🛢️',
  '“Te tiro unos versos en lunfardo y vos un puchito. Negocio redondo, maestro.” 📜':
    '"I drop you some lunfardo verses, you drop me a smoke. Fair trade, maestro." 📜',
  '“Soy el linyera más querido del barrio. Vení que charlamos, total el tiempo no se cobra.” 🫶':
    '"I\'m the most beloved bum in the barrio. Come, let\'s chat — time\'s free anyway." 🫶',
  // ---- LAVALLE / el piquete (specs/lavalle.md, Etapa 1) ----
  'Lavalle — el piquete': 'Lavalle — the picket',
  'doblar a Lavalle (al Obelisco)': 'turn down Lavalle (to the Obelisco)',
  'volver a Florida y Lavalle': 'back to Florida & Lavalle',
  'Pibita': 'Kid', 'Doña Rosa': 'Doña Rosa', 'La olla popular': 'The soup kitchen', 'Compañero': 'Comrade',
  'Vecina copada': 'Cool neighbor', 'El del fierro': 'The guy with the piece', 'El de la tumbera': 'The guy with the zip gun', 'El que corta': 'The one blocking the road',
  '“¡Pasámela, pasámela! ¡Dale que estamos 3 a 2!” ⚽': '"Pass it, pass it! C\'mon, it\'s 3 to 2!" ⚽',
  '“¡Gooool, la concha de la lora! ¡Aguante el barrio!” 🥅': '"Goooal, bloody hell! Long live the barrio!" 🥅',
  '“Bienvenido al corte, mi amor. Acá no falta un plato de comida ni una cumbia.” 🪗': '"Welcome to the picket, my love. Here there\'s always a plate of food and a cumbia." 🪗',
  '“¿Un guisito, pibe? Hay para todos, agarrá un plato. 🍲”': '"A bit of stew, kid? There\'s enough for everyone, grab a plate. 🍲"',
  '“Acá estamos firme, hermano. Viva Perón, viva el Che, viva la cumbia. ✊🎶”': '"We\'re standing firm here, brother. Long live Perón, long live the Che, long live cumbia. ✊🎶"',
  '“¡Que suene fuerte esa cumbia, dale! Bailá, no seas amargo. 💃”': '"Crank that cumbia up, c\'mon! Dance, don\'t be a sourpuss. 💃"',
  '“Tranqui, pibe, el fierro es por las dudas nomás. Acá entre nosotros somos todos compañeros. 🔧”': '"Easy, kid, the piece is just in case. Among us here we\'re all comrades. 🔧"',
  '“Cuidamos el corte, nada más. Vos pasala bien, comé algo, bailá. 🪅”': '"We just guard the picket, that\'s all. You have a good time, eat something, dance. 🪅"',
  '“De acá no se pasa, hermano: está todo cortado hasta el Obelisco. Volvé más adelante, que se viene algo grande. 🚧🏛️”': '"You can\'t get past here, brother: it\'s all blocked up to the Obelisco. Come back later — something big is coming. 🚧🏛️"',
  // ---- room names (static) ----
  'Florida y Lavalle': 'Florida & Lavalle',
  'Arcade de Lavalle': 'Lavalle Arcade',
  'Chorería de Florida': 'Florida Choripán Stand',
  'Galería — Subsuelo 1': 'Gallery — Basement 1',
  'Sótano — Subsuelo 2': 'Cellar — Basement 2',
  'LAS CUEVAS del dólar — Subsuelo 3': 'THE dollar CAVES — Basement 3',
  '??? — Lugar secreto': '??? — Secret place',
  'Trastienda — Truco': 'Back room — Truco',
  'Garbarino — Electrónica': 'Garbarino — Electronics',
  'CEMENTO — recital under': 'CEMENTO — underground gig',
  'Casa de Cambio Oficial': 'Official Exchange House',
  'El Búnker de los Linyeras': "The Bums' Bunker",
  'Cueva del dólar — la del fondo': 'Dollar cave — the one in the back',
  'Cueva del dólar — la de al lado': 'Dollar cave — the one next door',
  'Cueva del dólar — la que te cambia': 'Dollar cave — the one that exchanges',

  // ---- NPC names ----
  'Vecina': 'Neighbor lady', 'Linyera filósofo': 'Philosopher bum', 'Músico': 'Musician',
  'Canillita': 'Newsboy', 'Oficinista': 'Office worker', 'Turista': 'Tourist', 'Jubilado': 'Retiree',
  'Viejo': 'Old man', 'Gordo': 'Fat guy', 'Señora': 'Lady', 'Pibe': 'Kid', 'Papá': 'Dad',
  'Nene': 'Little kid', 'Don': 'Old-timer', 'Señora 2': 'Lady 2',
  'Borrachín del vino': 'Wine drunk', 'Borrachín de la cerveza': 'Beer drunk', 'Borrachín del porro': 'Weed drunk',
  'Recepción': 'Reception', 'Maxi': 'Maxi', 'Guido': 'Guido', 'Sebastián': 'Sebastián', 'Marcos': 'Marcos',
  'Dueño': 'Owner', 'El del chori': 'The choripán guy', 'El flaco del Trucotron': 'The Trucotron dude',
  'Parrillero': 'Grill guy', 'Sex-shop “El Subte”': 'Sex shop "The Subway"', 'Comida rara': 'Weird food',
  '???': '???', 'Masajes Felices': 'Happy Massages', 'Cueva 1': 'Cave 1', 'Cueva 2': 'Cave 2', 'Cueva 3': 'Cave 3',
  'Jugador': 'Player', 'El Tahúr': 'The Card Sharp', 'Vendedor': 'Salesman',
  'Smart TV 8K': 'Smart TV 8K', 'Celular tope de gama': 'Top-of-the-line phone',
  'Iorio (Almafuerte)': 'Iorio (Almafuerte)', 'Guitarrista': 'Guitarist', 'Bajista': 'Bassist',
  'Baterista': 'Drummer', 'Asador': 'Grill master', 'Cajero': 'Teller', 'Cajera': 'Teller', 'En la cola': 'In line',
  'Tótem de 3 monos': '3-monkey totem', 'Linyera': 'Bum', 'El cuevero': 'The cuevero',
  'Linyera tirado': 'Sprawled bum', 'Linyera durmiendo': 'Sleeping bum', 'Linyera hecho mierda': 'Wrecked bum',
  'el linyera': 'the bum',

  // ---- door labels ----
  'entrar a EducaciónIT': 'enter EducaciónIT', 'entrar al arcade': 'enter the arcade',
  'entrar a la chorería': 'enter the choripán stand', 'entrar a Garbarino': 'enter Garbarino',
  'entrar a Cemento': 'enter Cemento', 'bajar a la galería': 'go down to the gallery',
  'entrar a la casa de cambio': 'enter the exchange house', 'entrar al edificio abandonado': 'enter the abandoned building',
  'entrar al super chino': 'enter the Chinese supermarket', 'salir a la calle': 'go out to the street',
  'subir al piso 8': 'go up to floor 8', 'bajar al piso 4': 'go down to floor 4', 'subir al piso 9': 'go up to floor 9',
  'bajar al piso 8': 'go down to floor 8', 'seguir al tipo': 'follow the guy', 'subir': 'go up', 'bajar': 'go down',
  'entrar a la disquería': 'enter the record shop', 'entrar al chino por atrás': 'enter the shop from the back',
  'salir': 'exit', 'pasar a la trastienda': 'go to the back room', 'volver a la sala': 'back to the room',
  'cruzar al chino (la puerta del tahúr)': "cross to the shop (the card sharp's door)",
  'salir un piso': 'exit a floor', 'bajar un piso': 'go down a floor', 'subir un piso': 'go up a floor',
  'entrar al BÚNKER (secreto)': 'enter the BUNKER (secret)', 'volver al piso 20': 'back to floor 20',
  'salir de la cueva': 'leave the cave',

  // ---- street NPC dialogs ----
  '“Ay, nene... ¿viste cómo está el dólar? Un espanto.” 🙄': '"Oh, sweetie... have you seen the dollar? It\'s a horror." 🙄',
  '“Sentate, pibe, que el apuro es del que no entendió nada. Preguntame lo que quieras.” 🌞': '"Sit down, kid, rushing is for those who got nothing. Ask me anything." 🌞',
  '“Una moneda y te toco una cumbia, maestro.” 🎶': '"A coin and I\'ll play you a cumbia, maestro." 🎶',
  '“¡Diarios, revistas! ¿El de hoy, pibe? Está todo cada vez peor.” 📰': '"Papers, magazines! Today\'s edition, kid? It\'s all getting worse." 📰',
  '“Tarde, tarde, ¡llego tarde!” 💼': '"Late, late, I\'m running late!" 💼',
  '“Excuse me... ¿dónde queda el Obelisco?” 📸': '"Excuse me... where\'s the Obelisco?" 📸',
  '“Jaque, querido. Vas perdiendo... pagás el café.” ♟️': '"Check, my friend. You\'re losing... you\'re buying the coffee." ♟️',
  '“Callate y movés vos, tramposo de mierda.” ♟️': '"Shut it and it\'s your move, you damn cheat." ♟️',
  '“Hace dos horas que espero, pibe... y no avanza.” 👴': '"I\'ve been waiting two hours, kid... and it\'s not moving." 👴',
  '“Is this the line for dollars? ¿Acá cambian, sí?” 📸': '"Is this the line for dollars? You exchange here, yeah?" 📸',
  '“Tengo un hambre... ¿cuánto falta para la cueva?” 🍔': '"I\'m starving... how far to the cueva?" 🍔',
  '“Yo vengo todos los días, ¿eh? No me corran.” 💅': '"I come every day, alright? Don\'t push me." 💅',
  '“Aguante, ya casi llego al arbolito.” 🧢': '"Hang on, I\'m almost at the arbolito." 🧢',
  '“Estoy en horario laboral, no le digas a nadie.” 💼': '"I\'m on the clock, don\'t tell anyone." 💼',
  '“Quedate quieto, nene, ya falta poco.” 👨‍👦': '"Stay still, kiddo, almost there." 👨‍👦',
  '“¿Faaalta muuucho, paaa?” 🍭': '"Is it muuuch loooonger, daaad?" 🍭',
  '“En mis tiempos el dólar valía dos mangos.” ☕': '"Back in my day the dollar was worth two bucks." ☕',
  '“No empujes que me sacan de la fila, atorrante.” 😤': '"Stop shoving or they\'ll bump me from the line, you punk." 😤',

  // ---- borracho hints ----
  '“Uff... lo que me arreglaría un SÁNDWICH DE FIAMBRE ahora, pibe... un saladito, mortadela, lo que sea. Compralo en el super chino, dale.” 🥓': '"Oof... a COLD-CUTS SANDWICH would fix me right now, kid... salami, mortadella, whatever. Get it at the Chinese supermarket, go on." 🥓',
  '“Cerveza tengo, lo que quiero es una DIOSA TROPICAL, hermano... el vinito dulce de fruta. Conseguila en el super chino (góndola DIOSAS).” 🍹': '"Beer I\'ve got, what I want is a DIOSA TROPICAL, brother... the sweet fruity wine. Get it at the Chinese supermarket (DIOSAS aisle)." 🍹',
  '“Loco... tengo un BAJÓN bárbaro. Me morfaría un CACHO DE CARNE, te juro. Conseguime carne en el super, dale.” 🥩': '"Man... I\'ve got a serious case of the munchies. I\'d devour a CHUNK OF MEAT, I swear. Get me some meat at the supermarket, go on." 🥩',

  // ---- EducaciónIT / arcade / shops dialogs ----
  '“Bienvenido a EducaciónIT. Te cuento de los cursos, horarios, profes, descuentos y formas de pago. ¿Qué querés saber?” ☎️': '"Welcome to EducaciónIT. I can tell you about courses, schedules, teachers, discounts and payment methods. What do you want to know?" ☎️',
  '“¡Eh, Maxi!” — el profe de Java. «Acordate: en Java, todo es un objeto.» 👋': '"Hey, Maxi!" — the Java teacher. «Remember: in Java, everything is an object.» 👋',
  '“Piso 8: acá están los CEOs. ¿Te anoto en un curso o querés ver horarios y descuentos?” ☎️': '"Floor 8: the CEOs are here. Shall I sign you up for a course or want to see schedules and discounts?" ☎️',
  '“¡Guido, máquina!” 👋': '"Guido, you legend!" 👋',
  'Sebastián, uno de los CEOs. «Bienvenido a EducaciónIT.» 👔': 'Sebastián, one of the CEOs. «Welcome to EducaciónIT.» 👔',
  'El otro Sebastián, también CEO. «Sí, los dos nos llamamos Sebastián.» 😄': 'The other Sebastián, also a CEO. «Yep, we\'re both named Sebastián.» 😄',
  '“Piso 9: relax y mates con Marcos. ¿Te cuento de los cursos, los horarios o las formas de pago?” ☎️': '"Floor 9: chill and mate with Marcos. Want to hear about the courses, schedules or payment methods?" ☎️',
  'Te tomás unos mates con Marcos. 🧉 «Ahh, cebado en su punto.» Qué momento.': 'You share some mate with Marcos. 🧉 «Ahh, brewed just right.» What a moment.',
  '“Flaco, esta es MI máquina. Querés jugar al Pac-Man, pagás... y cada vez te sale más.” 💸': '"Pal, this is MY machine. Wanna play Pac-Man, you pay... and it costs more each time." 💸',
  '“El Galaga es mío, maestro. Pagá la ficha, acá nada es gratis.” 💸': '"Galaga is mine, maestro. Pay the token, nothing\'s free here." 💸',
  '“¿Te animás al Frogger? Si me ganás, te regalo un vale por un choripán gratis.” 🌭': '"Up for some Frogger? If you beat me, I\'ll give you a voucher for a free choripán." 🌭',
  '“¿Trajiste una Mega Drive? Hay torneo de FIFA original, pibe.” 🎮': '"Did you bring a Mega Drive? There\'s an original FIFA tournament, kid." 🎮',
  '“¿Tenés el vale? Te hago el mejor choripán de Florida.” 🌭': '"Got the voucher? I\'ll make you the best choripán in Florida." 🌭',
  '“¿Tenés caramelos, pibe? Pasá... una nochecita acá adentro y salís nuevo.” 😏': '"Got candy, kid? Come in... one little night in here and you\'ll come out brand new." 😏',
  '“¿Pancho de tres días? Igual te hace bien, barato.” 🤢': '"Three-day-old hot dog? It\'s still good for you, cheap." 🤢',
  '“Pssst... cuando se pudra todo y las eléctricas no anden, vení que tengo FIERRO criollo.” 🗡️': '"Pssst... when it all goes to hell and the electric ones quit, come see me, I\'ve got criollo STEEL." 🗡️',
  '“Masajes felices, jefe. Quedás como nuevo. Sin preguntas.” 💆': '"Happy massages, boss. You\'ll feel brand new. No questions." 💆',
  '“...te estaba esperando. Tengo un amuleto que no se vende con plata... bueno, con monedas sí.” 🕯️': '"...I was expecting you. I\'ve got an amulet that\'s not sold for money... well, for coins, yeah." 🕯️',

  // ---- cueveros (hall invite) ----
  '“Dale, pasá pibe, acá adentro te atiendo. Pasá, pasá, no muerdo...”': '"Go on, come in kid, I\'ll help you inside. Come in, come in, I don\'t bite..."',
  '“Vení, entrá tranqui a la cueva, hablamos adentro.”': '"Come on, step into the cave, we\'ll talk inside."',
  '“Pasá, pasá, que te cambio tranqui. Entrá a la cueva.”': '"Come in, come in, I\'ll exchange no problem. Step into the cave."',

  // ---- secret room (naiperos) ----
  '“Acá no, pibe. Vos no viste nada.” 🤫': '"Not here, kid. You saw nothing." 🤫',
  '“¿Y vos quién sos? Andá yendo.”': '"And who are you? Get going."',
  '“Shhh. Acá no se habla.”': '"Shhh. No talking here."',
  '“Vos no viste nada, ¿estamos?”': '"You saw nothing, got it?"',
  '“Seguí derecho, pibe.”': '"Keep straight, kid."',
  '“Mejor pasá a la otra sala.”': '"Better head to the other room."',
  '“Acá no, pibe. No viste nada.” 🤫': '"Not here, kid. You saw nothing." 🤫',
  '“Tranqui, seguí para el fondo.”': '"Easy, head to the back."',
  '“¿Buscás algo? No, no buscás nada.”': '"Looking for something? No, you\'re not."',
  '“Callate y seguí.”': '"Shut it and move along."',
  '“Esto no existió.”': '"This never happened."',
  '“Al fondo te esperan.”': '"They\'re waiting for you in the back."',

  // ---- tahúr / garbarino / cemento ----
  '“Sentate, pibe. Quilmes y truco. Si perdés te entregás el marrón... la bolsa de plata no.” 🃏': '"Sit down, kid. Quilmes and truco. If you lose you hand over your behind... not the bag of cash." 🃏',
  '“¿Te muestro el LED 65 pulgadas 8K? Una ganga... en 48 cuotas (mentira).” 📺': '"Want me to show you the 65-inch 8K LED? A steal... in 48 installments (a lie)." 📺',
  '“No mires el chiquito, pibe. Llevate el premium.”': '"Don\'t look at the small one, kid. Take the premium."',
  '“Te hago un precio: el mismo, pero te lo hago.” 😬': '"I\'ll cut you a deal: the same price, but I\'m cutting it." 😬',
  '“¿Vas a comparar precios? Acá es todo carísimo igual, ahorrá tiempo.”': '"Gonna compare prices? It\'s all pricey here anyway, save your time."',
  '“Llevá la garantía extendida, sale más que el producto.”': '"Take the extended warranty, it costs more than the product."',
  '“Eso que estás mirando ya lo estás comprando, ¿no?”': '"That thing you\'re looking at, you\'re already buying it, right?"',
  'Un TV carísimo.': 'A super-expensive TV.', 'Un celular carísimo.': 'A super-expensive phone.',
  '“Pará que afino, loco. Esta viola tiene más años que vos.” 🎸': '"Hold on, I\'m tuning, man. This guitar\'s older than you." 🎸',
  '“Grave, todo grave, hermano. El bajo es la vida.” 🎸': '"Low, all low, brother. The bass is life." 🎸',
  '“¡Uno, dos, tres, cuatro! ...¿probamos de nuevo?” 🥁': '"One, two, three, four! ...shall we try again?" 🥁',
  '“Tranqui que falta, el asado no se apura. ¿Querés un choripán de la previa?” 🔥': '"Relax, it\'s not ready, you don\'t rush a barbecue. Want a warm-up choripán?" 🔥',

  // ---- casa de cambio ----
  '“Número 247... ¿el 247? Bueno, el que sigue. Despacio que es uno solo.” 🪟': '"Number 247... the 247? Fine, next one. Slow down, there\'s only one of me." 🪟',
  '“No hay billetes chicos, señor. ¿De cien nomás? No tengo.” 🪟': '"No small bills, sir. Just hundreds? I don\'t have any." 🪟',
  '“Saqué número a las siete de la mañana, ¿eh? No me corran.” 🎫': '"I took a number at seven in the morning, alright? Don\'t push me." 🎫',
  '“¿Cómo que cerró la caja? ¡Si recién abrieron!” 😤': '"What do you mean the window closed? You just opened!" 😤',
  '“En mis tiempos esto se hacía en la vereda, más rápido.” 👴': '"Back in my day this was done on the sidewalk, faster." 👴',
  '“Is this the official rate? ...¿el oficial? ¡Pero si es la mitad!” 📸': '"Is this the official rate? ...the official one? But it\'s half!" 📸',
  '“Hace dos horas que no avanza un paso, hermano.” 🧢': '"Two hours and it hasn\'t moved an inch, brother." 🧢',
  '“Aguantá, nene, ya casi... no, mentira, falta un montón.” 👨‍👦': '"Hang on, kiddo, almost... no, lie, still ages to go." 👨‍👦',
  '“Pedí el día en el laburo para esto. Para ESTO.” 💼': '"I took the day off work for this. For THIS." 💼',
  '“Está hasta las pelotas, no entra un alfiler más.” 😮‍💨': '"It\'s packed solid, not even a pin fits." 😮‍💨',

  // ---- linyera del maletín (lujo) ----
  '“¡Pará, pibe! No toques eso. Vos solo, loco... ¿viste? Esto puede afectar el espacio-temporal y me convierto DE VUELTA en millonario. ¡Y yo NO quiero laburaaar! ...No entendés nada. Corréte, pibe, que me tapás el sol.” 🌞': '"Stop, kid! Don\'t touch that. All by yourself, man... see? This could mess with space-time and I turn BACK into a millionaire. And I do NOT wanna woooork! ...You don\'t get it. Move aside, kid, you\'re blocking my sun." 🌞',
  '“Dejá el maletín ahí, maestro. Yo ya fui rico, fue un garrón. Ahora: panza al sol y cero quilombo. Corréte que me hacés sombra.” 🌞': '"Leave the briefcase there, maestro. I was rich already, it sucked. Now: belly to the sun and zero hassle. Move, you\'re casting a shadow on me." 🌞',
  '“¿Las joyas? Mías, de cuando era millonario. Las tocás y se rompe todo de nuevo, ¿me entendés? Andá, andá.” ✨': '"The jewels? Mine, from when I was a millionaire. You touch them and it all breaks again, get it? Go on, go on." ✨',
  '“No, no, no. Esa guita está enchastrada con el espacio-tiempo. La agarrás y mañana tengo que ir a laburar. Ni en pedo, pibe.” 💼': '"No, no, no. That cash is smeared with space-time. You grab it and tomorrow I have to go to work. No way in hell, kid." 💼',

  // ---- búnker ----
  '“Bienvenido al búnker, gurú. Acá nadie labura. Tirate en el catre cuando quieras pasar el día. 🛖”': '"Welcome to the bunker, guru. Nobody works here. Flop on the cot whenever you want to pass the day. 🛖"',
  '“Si querés salir de verdad, andá al portal de la Casa de Cambio. Si no, quedate en el loop.” 🔁': '"If you really want out, go to the Exchange House portal. Otherwise, stay in the loop." 🔁',

  // ---- cuevas (gente esperando) ----
  '“Todo legal, ¿eh? Es para mi hijo, para cuando sea grande.” 👶': '"All legal, alright? It\'s for my son, for when he grows up." 👶',
  '“Si no ahorro en dólares, este país se va a la mierda, pibe.” 🇦🇷': '"If I don\'t save in dollars, this country goes to hell, kid." 🇦🇷',
  '“Yo en el peso no confío ni loca. Verde o nada.” 💵': '"I don\'t trust the peso one bit. Greenbacks or nothing." 💵',
  '“Vengo todos los meses. Es mi cajita de ahorro, qué querés.” 🏦': '"I come every month. It\'s my little savings box, what can I say." 🏦',
  '“Shhh, acá no se habla de cuánto traés, pibe.” 🤫': '"Shhh, we don\'t talk about how much you brought, kid." 🤫',
  '“Es para el futuro del nene. Dólar, siempre dólar.” 👨‍👦': '"It\'s for the kid\'s future. Dollars, always dollars." 👨‍👦',
  '“Acá sí te cambian. El tipo es de confianza, eh.” 💵': '"Here they do exchange. The guy\'s trustworthy, alright." 💵',
  '“Es para mi hijo, todo legal. Bueno, legal-legal no, pero me entendés.” 👶': '"It\'s for my son, all legal. Well, legal-legal not quite, but you get me." 👶',
  '“Apurate que se hace cola. Si no ahorro verde, ¿qué le dejo a los pibes?” 🇦🇷': '"Hurry, the line\'s forming. If I don\'t save greenbacks, what do I leave the kids?" 🇦🇷',
  '“Uh, venís cargado de monedas... eso te marca, pibe. Acá no te cambio. Andá.”': '"Whoa, you\'re loaded with coins... that marks you, kid. I won\'t exchange here. Go."',
  '“Mmm... tenés cara de garca. Nah, andá a otro lado, no te cambio nada.”': '"Mmm... you\'ve got a crook\'s face. Nah, go somewhere else, I\'m not exchanging anything."',
  '“Dale, vení que te los cambio, tranqui...”': '"Go on, come, I\'ll exchange them, easy..."',
};

// reglas para nombres de sala DINÁMICOS (pisos del edificio abandonado, EducaciónIT) que no están en el mapa
const LEVEL_EN_RULES = [
  [/^Edificio Abandonado — Piso (\d+) · LUJO$/, 'Abandoned Building — Floor $1 · LUXURY'],
  [/^Edificio Abandonado — Piso (\d+) · ruina$/, 'Abandoned Building — Floor $1 · ruins'],
  [/^EducaciónIT — Piso (\d+)$/, 'EducaciónIT — Floor $1'],
];

// traductor: mapa estático → reglas dinámicas → el original (fallback). Solo se usa en modo 'en'.
function levelTx(s) {
  if (s == null) return s;
  if (Object.prototype.hasOwnProperty.call(LEVEL_EN, s)) return LEVEL_EN[s];
  for (const [re, rep] of LEVEL_EN_RULES) if (re.test(s)) return s.replace(re, rep);
  return s;
}
if (typeof window !== 'undefined') { window.LEVEL_EN = LEVEL_EN; window.levelTx = levelTx; }
