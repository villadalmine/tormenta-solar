// lang/game.en.js — English TRANSCREATION of the game narration (game.js). Not literal: keep the
// Buenos Aires (porteño) street humor. Proper nouns stay (Florida, Lavalle, Obelisco, Iorio, Cemento,
// Garbarino, Diosa Tropical, Pibe Tigre, Mega Drive, FIFA 98, Malvinas). Same keys as lang/game.es.js.
(function () {
  const G = {
    'g.start': 'Head right and go in through the ARCADE GALLERY to get down to the cueva.  [E] use door',

    'g.ruina': [
      'That building came down in the storm. Boarded up, no way in. 🧱',
      'Collapsed and condemned: rubble all the way to the door. 🚧',
      "Forget it, it's in pieces. Try the spots that held up (corner shop, cueva, the drunks' place). 💥",
    ],
    'g.super.barricada': "The corner shop's FRONT is barricaded: burning drums, grenades and the ninjas on guard. No way in here. → Go in through the BACK DOOR (from the cueva) or get IORIO to play so they clear out. 🔥🥷",
    'g.cambio.cola': [
      '"Hey, pal, no cutting the line!"',
      '"Wait your turn like everyone else, wise guy!"',
      "\"Not even a pin fits in here, it's packed solid.\"",
      '"Respect the line, line-jumper!"',
      '"Take a number and wait like the rest of us, huh."',
    ],
    'g.abandonado': [
      '"Eh eh... not just anyone gets in, kid." The three drunks block the door. 🚫',
      '"Take care of the boys first, then we talk about the building, deal?" 🍻',
      "The drunks won't budge. They want something... chat with each one (E). 🤔",
    ],

    'g.frogger.start': "Let's play Frogger!",
    'g.truco.sit': 'You sit down at the table...',

    'g.joyas.default': '"Don\'t touch that, kid."',
    'g.joyas.eject': 'You reach for the jewels and OUT COMES THE BUM: {line} He grabs you by the jacket and tosses you out onto the street. 🦶🚪',
    'g.totem.first': "You go to swipe the 3-monkey TOTEM 🐵🐵🐵 and out of nowhere TWENTY bums appear... but instead of beating you up they crown you GURU: \"You found our Monkey Island god! The FLOOR 20 door is yours: it leads to our BUNKER, the safest place around. It stays open for you ALWAYS.\" 🗝️🛖",
    'g.totem.again': '"Guru, the FLOOR 20 door is already yours. The bunker awaits upstairs." 🐵',
    'g.linyeraCry': [
      '"I had THREE flats in Puerto Madero... three. (breaks down) Look in the toilet there, grab it, it\'s no use to me anymore..." 😭',
      '"I was a bank manager. Suits, meetings, a hole in my soul. (cries) There\'s cash in the safe, take it, kid." 💼😢',
      '"I had an imported car for every day of the week. And what for, huh? (sniffles) Grab a few coins, go on." 🚗',
      '"I got tired of working for an empty life. (sighs) Here, I don\'t need these." 🪙',
    ],
    'g.revive': 'You starved to death... but the loop spits you back into the refuge (DAY #{n}). Keep eating, kid. 💀🔁',

    'g.falopa.preStorm': "It's a briefcase full of dollars... with space-time still intact, better not even touch it (remember the bum). 💼",
    'g.falopa.empty': "You already emptied this drawer. It refills next day (sleep in the bunker). 🌿",
    'g.falopa.grab': 'You open the fancy dresser drawer: packed with GEAR! 🌿 You grab some (+2, you have {n}). It\'s so IORIO plays and the corner-shop ninjas clear out.',

    'g.limosna.preStorm': '"...move along, kid..."',
    'g.limosna.empty': '"I already gave you what I had, kid. Come back tomorrow." 🪙',

    'g.armas.preStorm': '"Keep your cash, kid. With the lights still on, the electric ones do the job. Come back when it all goes to hell." 🗡️',
    'g.armas.done': '"I already armed you, criollo. Go make history." ⚔️',
    'g.armas.noCoins': '"Criollo steel ain\'t free, kid. That\'ll be {cost} coins." 🗡️',
    'g.armas.buy': 'The guy unrolls a cloth on the floor: a WHIP, BOLAS, a FACÓN knife and a Malvinas FAL rifle. "The electric ones don\'t work with the solar storm, kid. Take some real criollo steel." ⚔️🇦🇷  +40 ammo, +20 life.',

    'g.iorio.preStorm': '"Bring me some gear and I\'ll play you Pibe Tigre." 🤘',
    'g.iorio.noFalopa': 'Iorio: "And the gear, dummy? No dope, no Pibe Tigre. Look in the DRAWERS of the building\'s fancy flats." 🤘',
    'g.iorio.give': 'You hand Iorio the gear 🤘. PIBE TIGRE kicks off and the NINJAS (metalheads) leave the corner shop and head to the gig. The shop\'s FRONT is now OPEN! Run and eat before they come back. (Iorio curses the sun: "...hey Marcello, good thing we do acoustic and tango now, since there\'s no power.") 🎻',

    'g.loop.preStorm': "The city's still normal, nothing blew up. Why sleep? The survival loop starts when the SOLAR STORM hits. 😴",
    'g.loop.sleep': 'You sleep on the cot. 🌅 DAY #{n}. The storm chaos is still out there. The gear in the drawers came back and you kept some cash; you start with full life, but hunger returns: go EAT. 🍜',

    'g.fifa.noMega': '"You brought a Mega Drive? Buy one at the Chinese supermarket (CONSOLES aisle) and come back for the FIFA tournament." 🎮',
    'g.fifa.done': '"FIFA 98 tournament champ, nice one!" 🏆',
    'g.fifa.win': 'You plug in the MEGA DRIVE and play the FIFA 98 TOURNAMENT (the very first one). You dribble, top-corner it... CHAMPION! 🏆 +30 coins.',

    'g.borracho.fed': ['"Thanks, champ, I\'m all set." 🥴', '"Cheers again, brother."', "\"You're a legend, kid.\""],
    'g.borracho.gotDiosa': 'a DIOSA TROPICAL 🍹',
    'g.borracho.gotCarne': 'a CHUNK OF MEAT 🥩',
    'g.borracho.gotFiambre': 'some COLD CUTS (a sandwich) 🥓',
    'g.borracho.allHappy': 'You slip him {got}. All THREE jump for joy 🎉 and invite you in: you\'re a VIP MEMBER for feeding the lower classes so selflessly. The building is now OPEN. 🏚️ (And they tip you off: "Inside the supermarket there\'s a door straight to the cueva of the guy who screwed you.") 🤫',
    'g.borracho.thanks': 'You slip him {got}. "Aaah, thanks maestro!" He stops bugging you.  ({n}/3 drunks happy)',
    'g.borracho.askDefault': '"Gimme a hand, kid?"',

    'g.chat.offline': '(no AI connected — canned replies. Drop your API key in ⚙ Options.)',
    'g.chat.online': '(chatting with AI — {mode})',
    'g.chat.error': '"...a wire crossed in my head, kid. Say it again."',
    'g.chat.localWarn': '(the AI didn\'t reply with your key — local lines. Open the console F12 to see the error: 429/404/CORS, etc.)',
    'g.chat.youPrefix': 'You: ',

    'g.cueva.secretMoney': 'You come in through the secret door and corner the arbolito who screwed you. You take your cash back: +60 coins. 😎',
    'g.cueva.secretEmpty': "The arbolito's cueva. You already cleaned him out, nothing left.",

    'g.shop.empty': '"All out, pal."',
    'g.shop.noFunds': 'Not enough: it costs {cost} {cur} and you have {have}.',
    'g.shop.ammo': '+{n} ammo',
    'g.shop.health': '+{n} life',
    'g.shop.coins': '+{n} coins',
    'g.shop.amuleto': 'a creepy amulet (+30 ammo, +25 life)',
    'g.shop.bought': 'You bought: {txt}  (−{cost} {cur})',
    'g.cur.caramelos': 'candy',
    'g.cur.forros': 'rubbers',
    'g.cur.monedas': 'coins',

    'g.machine.possessed': 'The machine is possessed by the storm... it attacks you!',
    'g.machine.pay': '"Pal, this is MY machine. That\'s {price} coins. No cash, no play." 💸',
    'g.machine.paid': 'You paid {price} coins... "Next time it\'ll cost ya more, eh." 😏',
    'g.machine.trucotron': 'A guy steps out of the dark back: "Hey, I don\'t play with chumps. Beat ALL the machines first, kid."',

    'g.cuevero.enter': 'You step into the dollar cueva. 💵 People waiting, smell of damp, everyone muttering. Talk to them (E)... then go to the cuevero in the back to exchange.',
    'g.cuevero.real': '{dialog} ...and RIGHT THEN everything blows up. The guy keeps your money. You: nothing. 💸',

    'g.chori.eat': '🌭 You eat the free choripán. +40 life. Aguante!',
    'g.chori.noVale': 'You need a voucher. Beat the choripán guy at the arcade (Street Fighter).',
    'g.secret.unlock': 'A guy steps out from the back: "Kid... you beat them all. Wanna make BIG money? Come, don\'t ask." A door opened at the back of the arcade. 🚪',

    'g.trans.streetStorm': 'The street went dark and everything went mad. The OFFICIAL EXCHANGE HOUSE is open now: get in there, the portal opened inside. 🏦🌀',
    'g.trans.street': 'Back on Florida & Lavalle.',
    'g.trans.cambioStorm': 'Space-time split open! People run in panic and a PORTAL opened in the back. Get in there! 🌀',
    'g.trans.cambioFull': "Official Exchange House: PACKED SOLID with people taking numbers. You can't even breathe. 🏦",
    'g.trans.cemento': 'CEMENTO. Almafuerte is doing the soundcheck 🤘. It\'s all smoke and the smell of a barbecue going. 🔥🥩',
    'g.trans.lujo': 'LUXURY floor 👗✨: top fashion, spotless storefronts... and not a soul. Loot away (E on the elevator to keep going).',
    'g.trans.ruina': 'WRECKED floor 💀: rubble, a closed-in stench and people sprawled out, trashed, sleeping. Tread softly.',
    'g.trans.garbarino': "Garbarino: pricey electronics. The salesman won't let go of you. 📺💸",
    'g.trans.edu': 'EducaciónIT — say hi to the people (E) and go up in the elevator.',
    'g.trans.arcadeStorm': 'The arcade is possessed! Pac-Man and Galaga attack you.',
    'g.trans.arcade': 'Arcade — press E on a machine to play.',
    'g.trans.shop': 'Choripán stand — redeem your voucher with the grill guy (E).',
    'g.trans.bunker': "The bums' BUNKER 🛖: the safest place in the city, nobody gets in here. Touch the cot (E) to stay in the LOOP, or go back to the Exchange House portal to really get out.",
    'g.trans.trucoStore': 'The back room: the card sharp is waiting for a game of truco. 🃏',
    'g.trans.secretStore': 'You come in scared... smoke, two tables, people staring at you. "You saw nothing here, kid."',
    'g.trans.cueveros': 'Three caves, three cueveros. Try each one (E)... see who\'ll exchange for you.',
    'g.trans.deeper': 'Further down... keep heading down to the caves.',
    'g.storm': '"Done, boss." A tremor: UP TOP everything went out from the solar storm. Down here, in the dark, nothing changes. Go up and escape.',

    'g.prompt.cuevero': 'talk to the cuevero',
    'g.prompt.fighter': 'challenge to Street Fighter',
    'g.prompt.chori': 'redeem voucher (choripán)',
    'g.prompt.shop': 'buy ({cost} {cur})',
    'g.prompt.lujoStorm': 'open the dresser drawer (gear) 🌿',
    'g.prompt.lujo': 'touch the jewels 💎',
    'g.prompt.totem': 'swipe the 3-monkey totem 🐵',
    'g.prompt.limosna': 'ask the bum for some coins 🪙',
    'g.prompt.iorioStorm': 'give gear to Iorio 🤘',
    'g.prompt.iorio': 'talk to Iorio',
    'g.prompt.armasStorm': 'buy criollo steel ⚔️',
    'g.prompt.armas': 'talk to the mysterious guy',
    'g.prompt.chat': 'chat 💬 with {name}',
    'g.prompt.loop': 'lie down to sleep (pass a day) 😴',
    'g.prompt.talk': 'talk to {name}',
    'g.prompt.machinePossessed': 'possessed machine!',
    'g.prompt.machinePay': 'play {name} ({price} coins)',
    'g.prompt.machine': 'play {name}',
    'g.prompt.collapsed': 'collapsed, no way in 🧱',

    // --- canvas labels ---
    'g.label.barricada': '🔥 BARRICADED',
    'g.label.clausurado': 'CONDEMNED',
    'g.label.psst': 'psst! come here',

    'g.truco.win': 'You beat the card sharp... but the dancers throw themselves at you 💃💃, you can\'t even walk and they swipe {n} coins. 😵 (Still: the sharp opens a back door straight to the CORNER SHOP — use it before you leave.)',
    'g.truco.lose': "You lose. The sharp gives you a sideways grin... they say the guy's into brown. You walk out a little uneasy, not quite sure why. (−25 life)",
    'g.frogger.valeWin': 'You beat Frogger! You\'ve got a VOUCHER for a free choripán 🌭. Redeem it at the choripán stand.',
    'g.frogger.valeLose': 'The choripán guy beat you. No voucher... ask for a rematch.',
    'g.frogger.win': '🐸 You crossed! +8 coins.',
    'g.frogger.lose': 'You got squashed in Frogger.',
    'g.pacman.win': '🕹️ You won Pac-Man! +10 coins, +6 ammo.',
    'g.galaga.win': '🕹️ You won Galaga! +10 coins, +20 life.',
    'g.arcade.gameover': 'Game over. Try again, there\'s coins on the line.',
    'g.super.leave': 'You leave the Chinese supermarket with your pockets full of candy. 🍬',
    'g.vinilos.leave': 'You leave the record shop. 🎵',

    'g.music.on': '♪ Music ON',
    'g.music.off': '♪ Music OFF',

    'g.win.title': 'STABLE PORTAL',
    'g.win.text': 'You cross the portal as Florida & Lavalle crumble into static.<br><br>This didn\'t start today: the storm comes from much further back... ever since we put a satellite to think for us.<br><br><em>The time jump begins. (End of Level 1)</em>',
    'g.die.title': 'THE STORM CONSUMED YOU',
    'g.die.text': 'The interference got you.<br><br>The time portal closes without you.<br><br><em>Try again.</em>',
  };
  if (typeof LANG_EN !== 'undefined') Object.assign(LANG_EN, G);
  else if (typeof window !== 'undefined') window.LANG_EN = G;
})();
