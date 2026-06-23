// level.js — cuartos (tilemaps), colisión por tiles, física y datos del nivel.
//  Calle Florida y Lavalle: locales en los que ENTRÁS (vidrieras, cine) + la puerta
//  de la galería que baja tres subsuelos hasta la CUEVA (siempre oscura).
const Level = (() => {
  const TILE = Art.TILE;
  const GRAV = 1750;

  function solid(room, tx, ty) {
    if (tx < 0 || tx >= room.w) return true;
    if (ty < 0) return false;
    if (ty >= room.h) return true;
    return room.map[ty][tx] === 1;
  }
  function solidPx(room, px, py) { return solid(room, Math.floor(px/TILE), Math.floor(py/TILE)); }

  function moveBody(ent, room, dt, grav = GRAV) {
    ent.vy += grav * dt;
    if (ent.vy > 1500) ent.vy = 1500;
    ent.x += ent.vx * dt;
    const t = Math.floor(ent.y/TILE), b = Math.floor((ent.y+ent.h-1)/TILE);
    if (ent.vx > 0) { const c = Math.floor((ent.x+ent.w-1)/TILE); for (let ty=t;ty<=b;ty++) if (solid(room,c,ty)) { ent.x=c*TILE-ent.w; ent.vx=0; break; } }
    else if (ent.vx < 0) { const c = Math.floor(ent.x/TILE); for (let ty=t;ty<=b;ty++) if (solid(room,c,ty)) { ent.x=(c+1)*TILE; ent.vx=0; break; } }
    ent.y += ent.vy * dt;
    ent.grounded = false;
    const l = Math.floor(ent.x/TILE), r = Math.floor((ent.x+ent.w-1)/TILE);
    if (ent.vy >= 0) { const c = Math.floor((ent.y+ent.h)/TILE); for (let tx=l;tx<=r;tx++) if (solid(room,tx,c)) { ent.y=c*TILE-ent.h; ent.vy=0; ent.grounded=true; break; } }
    else { const c = Math.floor(ent.y/TILE); for (let tx=l;tx<=r;tx++) if (solid(room,tx,c)) { ent.y=(c+1)*TILE; ent.vy=0; break; } }
  }

  function makeRoom(spec) {
    const w = spec.w, h = 14, gTop = h - 2;
    const map = Array.from({ length: h }, () => new Array(w).fill(0));
    for (let y = gTop; y < h; y++) for (let x = 0; x < w; x++) map[y][x] = 1;
    for (let y = 0; y < h; y++) { map[y][0] = 1; map[y][w-1] = 1; }
    for (const p of spec.platforms || []) for (let x = p[0]; x < p[0]+p[2]; x++) if (x>0&&x<w-1) map[p[1]][x] = 1;

    const feet = (tx, ty = gTop) => ({ x: tx*TILE + TILE/2, y: ty*TILE });
    const room = {
      name: spec.name, theme: spec.theme, w, h, gTop, map,
      pixW: w*TILE, pixH: h*TILE, light: spec.light, stormable: !!spec.stormable,
      goal: spec.goal != null ? feet(spec.goal) : null,
      buy: spec.buy != null ? feet(spec.buy) : null,
      playerStart: spec.playerStart != null ? feet(spec.playerStart) : null,
      enemies: (spec.enemies || []).map(e => ({ type: e.t, dormant: e.dormant, look: e.look, ...feet(e.x, e.y) })),
      pickups: (spec.pickups || []).map(p => ({ type: p.t, amount: p.amount, ...feet(p.x, p.y) })),
      npcs: (spec.npcs || []).map(n => ({ name: n.name, sprite: n.sprite, dialog: n.dialog, action: n.action, follow: n.follow, lines: n.lines, want: n.want, hint: n.hint, invisible: n.invisible, persona: n.persona, sells: n.sells && { ...n.sells }, ...feet(n.x) })),
      machines: (spec.machines || []).map(m => ({ name: m.name, game: m.game, ...feet(m.x) })),
      cueveros: (spec.cueveros || []).map(c => ({ name: c.name, outcome: c.outcome, to: c.to, dialog: c.dialog, ...feet(c.x) })),
      decor: (spec.decor || []).map(d => ({ type: d.t, x: d.x*TILE + TILE/2, feetY: gTop*TILE })),
      doors: [], doorById: {},
    };
    for (const d of spec.doors || []) {
      const f = feet(d.x);
      const door = { id: d.id, art: d.art, label: d.label, facade: d.facade, x: f.x, y: f.y, inward: d.inward, to: null, at: null };
      room.doors.push(door); room.doorById[d.id] = door;
    }
    return room;
  }

  function build() {
    // pools de diálogo generados por IA (js/dialogos.js, opcional), por IDIOMA vía I18n.dict.
    // Sin I18n → cae a Dialogos.es[pool] / Dialogos[pool] (legacy) y, si nada, al fallback hardcodeado.
    const _D = (pool, fb) => {
      if (typeof I18n !== 'undefined' && I18n.dict) { const a = I18n.dict(pool); if (a && a.length) return a; }
      if (typeof Dialogos !== 'undefined') {
        const a = (Dialogos.es && Dialogos.es[pool]) || Dialogos[pool];
        if (a && a.length) return a;
      }
      return fb;
    };
    const _Dp = (pool, fb) => { const a = _D(pool, null); return a ? a[(Math.random()*a.length)|0] : fb; };
    const rooms = [
      // 0 — la calle (Florida y Lavalle): edificios con sus puertas
      makeRoom({
        name: 'Florida y Lavalle', theme: 'street', light: 1.0, stormable: true, w: 116,
        // macetas (fila 11: obstáculos bajos que saltás) + toldos sobre los locales (fila 9)
        platforms: [[16,11,2],[36,11,2],[52,11,2],[68,11,2],[9,9,3],[27,9,3],[45,9,3]],
        playerStart: 5,
        doors: [
          { id:'edu',     art:'educacionit', facade:'educacionit', label:'entrar a EducaciónIT', x:10, inward:1 },
          { id:'arcade',  art:'arcade',      facade:'arcade',      label:'entrar al arcade',     x:28, inward:1 },
          { id:'choris',  art:'shop',        facade:'choris',      label:'entrar a la chorería', x:46, inward:1 },
          { id:'garbarino', art:'garbarino', facade:'garbarino',   label:'entrar a Garbarino',   x:58, inward:-1 },
          { id:'cemento', art:'cemento',     facade:'cemento',     label:'entrar a Cemento',     x:61, inward:-1 },
          { id:'galeria', art:'galeria',     facade:'galeria',     label:'bajar a la galería',   x:74, inward:-1 },
          { id:'cambio',  art:'cambio',      facade:'cambio',      label:'entrar a la casa de cambio', x:90, inward:-1 },
          { id:'abandonado', art:'abandonado', facade:'abandonado', label:'entrar al edificio abandonado', x:101, inward:-1 },
          { id:'super',   art:'superchino',  facade:'superchino',  label:'entrar al super chino', x:112, inward:-1 },
        ],
        decor: [
          {t:'arbol',x:7},{t:'farol',x:16},{t:'parlante',x:21},{t:'instrumentos',x:27},
          {t:'kiosko',x:38},{t:'arbol',x:54},{t:'mesa_ajedrez',x:64},{t:'tacho',x:94},
        ],
        npcs: [
          { name:'Vecina', sprite:'civil1', x:8,  dialog:'“Ay, nene... ¿viste cómo está el dólar? Un espanto.” 🙄' },
          { name:'Linyera filósofo', sprite:'linyera', x:14, action:'chat', persona:'filosofo',
            dialog:'“Sentate, pibe, que el apuro es del que no entendió nada. Preguntame lo que quieras.” 🌞' },
          { name:'Músico', sprite:'musico', x:24, dialog:'“Una moneda y te toco una cumbia, maestro.” 🎶' },
          { name:'Canillita', sprite:'diariero', x:38, dialog:'“¡Diarios, revistas! ¿El de hoy, pibe? Está todo cada vez peor.” 📰' },
          { name:'Oficinista', sprite:'civil4', x:50, dialog:'“Tarde, tarde, ¡llego tarde!” 💼' },
          { name:'Turista', sprite:'civil1', x:56, dialog:'“Excuse me... ¿dónde queda el Obelisco?” 📸' },
          { name:'Jubilado', sprite:'civil3', x:63, dialog:'“Jaque, querido. Vas perdiendo... pagás el café.” ♟️' },
          { name:'Jubilado', sprite:'civil4', x:65, dialog:'“Callate y movés vos, tramposo de mierda.” ♟️' },
          { name:'Viejo', sprite:'viejo', x:76, dialog:'“Hace dos horas que espero, pibe... y no avanza.” 👴' },
          { name:'Turista', sprite:'turista', x:77.4, dialog:'“Is this the line for dollars? ¿Acá cambian, sí?” 📸' },
          { name:'Gordo', sprite:'gordo', x:78.8, dialog:'“Tengo un hambre... ¿cuánto falta para la cueva?” 🍔' },
          { name:'Señora', sprite:'mujer', x:80.2, dialog:'“Yo vengo todos los días, ¿eh? No me corran.” 💅' },
          { name:'Pibe', sprite:'civil2', x:81.6, dialog:'“Aguante, ya casi llego al arbolito.” 🧢' },
          { name:'Oficinista', sprite:'civil4', x:83, dialog:'“Estoy en horario laboral, no le digas a nadie.” 💼' },
          { name:'Papá', sprite:'conNino', x:84.4, dialog:'“Quedate quieto, nene, ya falta poco.” 👨‍👦' },
          { name:'Nene', sprite:'nino', x:85.8, dialog:'“¿Faaalta muuucho, paaa?” 🍭' },
          { name:'Don', sprite:'civil3', x:87.2, dialog:'“En mis tiempos el dólar valía dos mangos.” ☕' },
          { name:'Señora 2', sprite:'mujer', x:88.6, dialog:'“No empujes que me sacan de la fila, atorrante.” 😤' },
          { name:'Borrachín del vino', sprite:'borracho_vino',  x:97, action:'borracho', want:'fiambre',
            hint:'“Uff... lo que me arreglaría un SÁNDWICH DE FIAMBRE ahora, pibe... un saladito, mortadela, lo que sea. Compralo en el super chino, dale.” 🥓',
            lines: _D('borracho_vino', [
            'Te tira un corcho a la cabeza. “¿Sabés qué pasa? El país está como yo: sin un mango, pero firme.” 🍷',
            'Te alcanza un caramelo pegoteado del bolsillo. “Yo fui contador, ¿sabés? Contador... de chistes malos. Ja.”',
            'Te escupe vino sin querer. “Este edificio de atrás es nuestro, eh. Pero no entra cualquiera.” 🏚️',
            'Te encaja un botón que se le cayó. “El obelisco lo construí yo, no me creen.” 🏛️' ]) },
          { name:'Borrachín de la cerveza', sprite:'borracho_birra', x:100, action:'borracho', want:'diosa',
            hint:'“Cerveza tengo, lo que quiero es una DIOSA TROPICAL, hermano... el vinito dulce de fruta. Conseguila en el super chino (góndola DIOSAS).” 🍹',
            lines: _D('borracho_cerveza', [
            'Te tira la tapita de la birra. “¡Boca campeón del mundo! ...¿no salió? Bueno, igual, salú.” ⚽',
            'Te ofrece un sorbo de su lata y se arrepiente. “Salú... *hipo*... vos me querés, ¿no, hermano?”',
            'Te encaja un posavasos mojado. “Nosotros cuidamos la entrada de ese edificio. Hay que ganarse el pase, eh.” 🚪',
            'Te pasa una servilleta escrita. “Mañana arranco la dieta. Mañana, eh.”' ]) },
          { name:'Borrachín del porro', sprite:'borracho_porro', x:103, action:'borracho', want:'carne',
            hint:'“Loco... tengo un BAJÓN bárbaro. Me morfaría un CACHO DE CARNE, te juro. Conseguime carne en el super, dale.” 🥩',
            lines: _D('borracho_porro', [
            'Te tira el filtro armado. “Tranqui todo, loco... ¿escuchás los pájaros? No hay pájaros. Igual.” 🌬️',
            'Te pasa un encendedor sin gas. “El sistema, viste... el sistema, hermano.”',
            'Te encaja un papelito. “Si los tres quedamos contentos, te abrimos el edificio, ¿me entendés o no me entendés?” 🏚️',
            'Te alcanza una galletita aplastada. “Este edificio antes era un banco. Ahora soy yo el banco. De nada.” 🏦' ]) },
        ],
        enemies: [
          {t:'peaton',x:14,look:'peatonN'},{t:'peaton',x:20,look:'turistaW'},{t:'peaton',x:32,look:'shopperW'},{t:'peaton',x:42,look:'peatonN2'},
          {t:'peaton',x:56,look:'turistaW'},{t:'peaton',x:70,look:'shopperW'},{t:'peaton',x:95,look:'peatonN'},
          {t:'dron',x:30,y:6},{t:'dron',x:72,y:5},
        ],
        // monedas/ítems arriba de las macetas (saltás para agarrarlos) + algo a ras del piso
        pickups: [{t:'coins',x:17,y:10,amount:5},{t:'ammo',x:37,y:10},{t:'health',x:53,y:10},{t:'coins',x:69,y:10,amount:5},{t:'ammo',x:24},{t:'health',x:60},{t:'coins',x:84,amount:6}],
      }),
      // 1 — EducaciónIT Piso 4 (Maxi, profe de Java)
      makeRoom({
        name: 'EducaciónIT — Piso 4', theme: 'office', light: 1.0, stormable: true, w: 20,
        platforms: [[8,9,4]],
        doors: [
          { id:'out', art:'exit',     label:'salir a la calle', x:2, inward:1 },
          { id:'up',  art:'elevator', label:'subir al piso 8',  x:17, inward:-1 },
        ],
        npcs: [
          { name:'Recepción', sprite:'recepcionista', x:4, action:'chat', persona:'secretaria', dialog:'“Bienvenido a EducaciónIT. Te cuento de los cursos, horarios, profes, descuentos y formas de pago. ¿Qué querés saber?” ☎️' },
          { name:'Maxi', sprite:'maxi', x:11, dialog:'“¡Eh, Maxi!” — el profe de Java. «Acordate: en Java, todo es un objeto.» 👋' },
        ],
        decor: [{t:'escritorio',x:7},{t:'laptop',x:11},{t:'planta',x:14},{t:'cafe',x:17}],
        enemies: [{t:'peaton',x:9,look:'peatonN'}],
        pickups: [{t:'ammo',x:9,y:9},{t:'health',x:14},{t:'coins',x:16,amount:4}],
      }),
      // 2 — EducaciónIT Piso 8 (Guido + los dos CEOs Sebastián)
      makeRoom({
        name: 'EducaciónIT — Piso 8', theme: 'office', light: 1.0, stormable: true, w: 22,
        platforms: [[9,9,4]],
        doors: [
          { id:'down', art:'elevator', label:'bajar al piso 4', x:2, inward:1 },
          { id:'up',   art:'elevator', label:'subir al piso 9', x:19, inward:-1 },
        ],
        npcs: [
          { name:'Recepción', sprite:'recepcionista', x:4, action:'chat', persona:'secretaria', dialog:'“Piso 8: acá están los CEOs. ¿Te anoto en un curso o querés ver horarios y descuentos?” ☎️' },
          { name:'Guido', sprite:'guido', x:8,  dialog:'“¡Guido, máquina!” 👋' },
          { name:'Sebastián', sprite:'seba1', x:12, dialog:'Sebastián, uno de los CEOs. «Bienvenido a EducaciónIT.» 👔' },
          { name:'Sebastián', sprite:'seba2', x:16, dialog:'El otro Sebastián, también CEO. «Sí, los dos nos llamamos Sebastián.» 😄' },
        ],
        decor: [{t:'escritorio',x:6},{t:'laptop',x:8},{t:'laptop',x:13},{t:'planta',x:17},{t:'cafe',x:20}],
        enemies: [{t:'peaton',x:6,look:'turistaW'},{t:'peaton',x:18,look:'peatonN2'}],
        pickups: [{t:'health',x:13,y:9},{t:'ammo',x:18},{t:'coins',x:7,amount:5}],
      }),
      // 3 — EducaciónIT Piso 9 (mates con Marcos)
      makeRoom({
        name: 'EducaciónIT — Piso 9', theme: 'office', light: 1.0, stormable: true, w: 20,
        platforms: [[7,9,4]],
        doors: [{ id:'down', art:'elevator', label:'bajar al piso 8', x:2, inward:1 }],
        npcs: [
          { name:'Recepción', sprite:'recepcionista', x:4, action:'chat', persona:'secretaria', dialog:'“Piso 9: relax y mates con Marcos. ¿Te cuento de los cursos, los horarios o las formas de pago?” ☎️' },
          { name:'Marcos', sprite:'marcos', x:12, dialog:'Te tomás unos mates con Marcos. 🧉 «Ahh, cebado en su punto.» Qué momento.' },
        ],
        decor: [{t:'escritorio',x:7},{t:'laptop',x:12},{t:'planta',x:15},{t:'cafe',x:17}],
        enemies: [{t:'peaton',x:8,look:'shopperW'}],
        pickups: [{t:'ammo',x:9,y:9},{t:'health',x:16},{t:'coins',x:6,amount:6}],
      }),
      // 4 — sala de arcade (Lavalle): más máquinas + gente jugando + el del chori
      makeRoom({
        name: 'Arcade de Lavalle', theme: 'arcade', light: 1.0, stormable: true, w: 26,
        platforms: [[18,9,3]],
        doors: [
          { id:'out', art:'exit', label:'salir a la calle', x:2, inward:1 },
          { id:'secret', art:'exit', label:'seguir al tipo', x:22, inward:-1 },
        ],
        machines: [
          { name:'PAC-MAN',   game:'pacman',    x:6 },
          { name:'GALAGA',    game:'galaga',    x:11 },
          { name:'FROGGER',   game:'frogger',   x:16 },
          { name:'TRUCOTRON', game:'trucotron', x:21 },
        ],
        npcs: [
          { name:'Dueño', sprite:'gamer1', x:5,  dialog:'“Flaco, esta es MI máquina. Querés jugar al Pac-Man, pagás... y cada vez te sale más.” 💸' },
          { name:'Dueño', sprite:'gamer2', x:10, dialog:'“El Galaga es mío, maestro. Pagá la ficha, acá nada es gratis.” 💸' },
          { name:'El del chori', sprite:'chori', x:17, action:'frogger',
            dialog:'“¿Te animás al Frogger? Si me ganás, te regalo un vale por un choripán gratis.” 🌭' },
          { name:'El flaco del Trucotron', sprite:'gamer1', x:20, action:'fifa',
            dialog:'“¿Trajiste una Mega Drive? Hay torneo de FIFA original, pibe.” 🎮' },
        ],
        enemies: [{t:'pacman',x:6,dormant:true},{t:'galaga',x:11,y:6,dormant:true},{t:'peaton',x:23,look:'turistaW'}],
        decor: [{t:'planta',x:24},{t:'tacho',x:3}],
        pickups: [{t:'ammo',x:23,y:9},{t:'coins',x:24,amount:4}],
      }),
      // 5 — la chorería (canjeás el vale)
      makeRoom({
        name: 'Chorería de Florida', theme: 'shop', light: 1.0, stormable: true, w: 16,
        platforms: [[6,9,4]],
        doors: [{ id:'out', art:'exit', label:'salir a la calle', x:2, inward:1 }],
        npcs: [{ name:'Parrillero', sprite:'choriVendor', x:10, action:'chori',
          dialog:'“¿Tenés el vale? Te hago el mejor choripán de Florida.” 🌭' }],
        decor: [{t:'parrilla',x:6},{t:'planta',x:14}],
        pickups: [{t:'ammo',x:13,y:9},{t:'coins',x:8,amount:3}],
      }),
      // 6 — galería subsuelo 1 (con tiendas raras)
      makeRoom({
        name: 'Galería — Subsuelo 1', theme: 'concrete', light: 0.6, w: 42,
        platforms: [[10,9,3],[20,9,4],[30,9,3]],
        doors: [
          { id:'up', art:'up', label:'subir', x:3, inward:1 },
          { id:'down', art:'galeria', label:'bajar', x:39, inward:-1 },
        ],
        npcs: [
          { name:'Sex-shop “El Subte”', sprite:'erotica', x:14, action:'shop',
            sells:{ kind:'health', amount:35, cost:25, pay:'caramelos', stock:3 },
            dialog:'“¿Tenés caramelos, pibe? Pasá... una nochecita acá adentro y salís nuevo.” 😏' },
          { name:'Comida rara', sprite:'comida', x:28, action:'shop',
            sells:{ kind:'health', amount:25, cost:4, stock:3 },
            dialog:'“¿Pancho de tres días? Igual te hace bien, barato.” 🤢' },
          { name:'???', sprite:'misterioso', x:36, action:'armas',
            dialog:'“Pssst... cuando se pudra todo y las eléctricas no anden, vení que tengo FIERRO criollo.” 🗡️' },
        ],
        enemies: [{t:'peaton',x:18},{t:'dron',x:24,y:6}],
        decor: [{t:'caja',x:8},{t:'barril',x:16},{t:'cartel',x:24},{t:'caja',x:32}],
        pickups: [{t:'ammo',x:20,y:9},{t:'health',x:34},{t:'coins',x:7,amount:5},{t:'coins',x:24,amount:4}],
      }),
      // 7 — sótano subsuelo 2 (más tiendas raras)
      makeRoom({
        name: 'Sótano — Subsuelo 2', theme: 'concrete', light: 0.48, w: 42,
        platforms: [[12,9,3],[22,9,4],[32,9,3]],
        doors: [
          { id:'up', art:'up', label:'subir', x:3, inward:1 },
          { id:'down', art:'galeria', label:'bajar', x:39, inward:-1 },
        ],
        npcs: [
          { name:'Masajes Felices', sprite:'masajes', x:14, action:'shop',
            sells:{ kind:'health', amount:45, cost:8, stock:1 },
            dialog:'“Masajes felices, jefe. Quedás como nuevo. Sin preguntas.” 💆' },
          { name:'???', sprite:'tenebroso', x:30, action:'shop',
            sells:{ kind:'mystery', cost:10, stock:1 },
            dialog:'“...te estaba esperando. Tengo un amuleto que no se vende con plata... bueno, con monedas sí.” 🕯️' },
        ],
        enemies: [{t:'peaton',x:20},{t:'dron',x:26,y:6}],
        decor: [{t:'barril',x:9},{t:'caja',x:18},{t:'cartel',x:26},{t:'barril',x:34}],
        pickups: [{t:'ammo',x:10},{t:'health',x:36},{t:'coins',x:18,amount:5},{t:'coins',x:26,amount:4}],
      }),
      // 8 — la cueva del dólar: TRES cueveros
      makeRoom({
        name: 'LAS CUEVAS del dólar — Subsuelo 3', theme: 'rock', light: 0.4, w: 48,
        platforms: [[16,9,4],[26,9,3],[36,9,4]],
        doors: [
          { id:'up', art:'up', label:'subir', x:3, inward:1 },
          { id:'vinilos', art:'disqueria', label:'entrar a la disquería', x:9, inward:-1 },
          { id:'chinoback', art:'superchino', label:'entrar al chino por atrás', x:44, inward:-1 },
        ],
        npcs: [
          { name:'Cuevero sin clientes', sprite:'cuevero', x:6, action:'chat', persona:'cuevero',
            dialog:'“Día flojo, pibe... ni clientes. ¿Venís a cambiar o a charlar un rato?” 💵' },
        ],
        cueveros: [
          { name:'Cueva 1', sprite:'cuevero', x:14, to:35, dialog:'“Dale, pasá pibe, acá adentro te atiendo. Pasá, pasá, no muerdo...”' },
          { name:'Cueva 2', sprite:'cuevero', x:26, to:36, dialog:'“Vení, entrá tranqui a la cueva, hablamos adentro.”' },
          { name:'Cueva 3', sprite:'cuevero', x:40, to:37, dialog:'“Pasá, pasá, que te cambio tranqui. Entrá a la cueva.”' },
        ],
        enemies: [{t:'peaton',x:20},{t:'peaton',x:32},{t:'dron',x:28,y:6}],
        decor: [{t:'barril',x:8},{t:'caja',x:18},{t:'cartel',x:30},{t:'barril',x:44}],
        pickups: [{t:'ammo',x:24,y:9},{t:'ammo',x:36,y:9},{t:'coins',x:10,amount:6}],
      }),
      // 9 — lugar secreto: sala llena de humo (dos mesas redondas, 6 por mesa)
      makeRoom({
        name: '??? — Lugar secreto', theme: 'secret', light: 0.72, w: 26,
        doors: [
          { id:'back', art:'exit', label:'salir', x:2, inward:1 },
          { id:'truco', art:'exit', label:'pasar a la trastienda', x:23, inward:-1 },
        ],
        npcs: [
          { name:'Jugador', sprite:'naipero', x:4,  dialog:'“Acá no, pibe. Vos no viste nada.” 🤫' },
          { name:'Jugador', sprite:'naipero', x:6,  dialog:'“¿Y vos quién sos? Andá yendo.”' },
          { name:'Jugador', sprite:'naipero', x:8,  dialog:'“Shhh. Acá no se habla.”' },
          { name:'Jugador', sprite:'naipero', x:10, dialog:'“Vos no viste nada, ¿estamos?”' },
          { name:'Jugador', sprite:'naipero', x:5,  dialog:'“Seguí derecho, pibe.”' },
          { name:'Jugador', sprite:'naipero', x:9,  dialog:'“Mejor pasá a la otra sala.”' },
          { name:'Naipero charlatán', sprite:'naipero', x:15, action:'chat', persona:'tahur', dialog:'“Bueno, vos parecés piola. Sentate que tiramos unas manos de truco y charlamos.” 🃏' },
          { name:'Jugador', sprite:'naipero', x:17, dialog:'“Tranqui, seguí para el fondo.”' },
          { name:'Jugador', sprite:'naipero', x:19, dialog:'“¿Buscás algo? No, no buscás nada.”' },
          { name:'Jugador', sprite:'naipero', x:21, dialog:'“Callate y seguí.”' },
          { name:'Naipero veterano', sprite:'naipero', x:16, action:'chat', persona:'tahur', dialog:'“¿Vos jugás al truco o sos de los que cantan envido sin nada? Vení, contame.” 😏' },
          { name:'Jugador', sprite:'naipero', x:20, dialog:'“Al fondo te esperan.”' },
        ],
        decor: [{t:'mesaRedonda',x:7},{t:'mesaRedonda',x:18},{t:'tacho',x:13}],
        pickups: [{t:'coins',x:13,y:9,amount:6}],
      }),
      // 10 — trastienda: truco con el tahúr
      makeRoom({
        name: 'Trastienda — Truco', theme: 'secret', light: 0.78, w: 22,
        doors: [
          { id:'back', art:'exit', label:'volver a la sala', x:2, inward:1 },
          { id:'chinotruco', art:'superchino', label:'cruzar al chino (la puerta del tahúr)', x:18, inward:-1 },
        ],
        npcs: [{ name:'El Tahúr', sprite:'tahur', x:7, action:'truco',
          dialog:'“Sentate, pibe. Quilmes y truco. Si perdés te entregás el marrón... la bolsa de plata no.” 🃏' }],
        decor: [{t:'parlante',x:3},{t:'mesaTruco',x:7},{t:'bailarinaMesa',x:11},{t:'bailarinaMesa',x:15},{t:'bailarinaParlante',x:19}],
        pickups: [{t:'coins',x:5,y:9,amount:5}],
      }),
      // 11 — Garbarino (electrónica carísima) con vendedor pesado que te sigue
      makeRoom({
        name: 'Garbarino — Electrónica', theme: 'office', light: 1.0, stormable: true, w: 22,
        platforms: [[8,9,4]],
        doors: [{ id:'out', art:'exit', label:'salir a la calle', x:2, inward:1 }],
        npcs: [
          { name:'Vendedor', sprite:'vendedor', x:11, follow:true, lines:[
            '“¿Te muestro el LED 65 pulgadas 8K? Una ganga... en 48 cuotas (mentira).” 📺',
            '“No mires el chiquito, pibe. Llevate el premium.”',
            '“Te hago un precio: el mismo, pero te lo hago.” 😬',
            '“¿Vas a comparar precios? Acá es todo carísimo igual, ahorrá tiempo.”',
            '“Llevá la garantía extendida, sale más que el producto.”',
            '“Eso que estás mirando ya lo estás comprando, ¿no?”' ] },
          { name:'Smart TV 8K', sprite:'recepcionista', x:6, action:'shop',
            sells:{ kind:'health', amount:60, cost:90, stock:1 }, dialog:'Un TV carísimo.' },
          { name:'Celular tope de gama', sprite:'recepcionista', x:17, action:'shop',
            sells:{ kind:'ammo', amount:24, cost:70, stock:1 }, dialog:'Un celular carísimo.' },
        ],
        decor: [{t:'tv',x:5},{t:'tv',x:9},{t:'escritorio',x:13},{t:'tv',x:17},{t:'planta',x:20}],
        enemies: [{t:'peaton',x:15,look:'shopperW'}],
        pickups: [{t:'coins',x:19,amount:6}],
      }),
      // 12 — CEMENTO (recital under): Almafuerte en prueba de sonido + Iorio
      makeRoom({
        name: 'CEMENTO — recital under', theme: 'cemento', light: 0.55, w: 26,
        doors: [{ id:'out', art:'exit', label:'salir a la calle', x:2, inward:1 }],
        npcs: [
          { name:'Iorio (Almafuerte)', sprite:'iorio', x:14, action:'iorio', dialog: _Dp('iorio', '“¿Qué hacés, tragaleche? Rajá... traeme falopa y te toco Pibe Tigre.” 🤘') },
          { name:'Guitarrista', sprite:'guitarrista', x:11, dialog:'“Pará que afino, loco. Esta viola tiene más años que vos.” 🎸' },
          { name:'Bajista', sprite:'bajista', x:17, dialog:'“Grave, todo grave, hermano. El bajo es la vida.” 🎸' },
          { name:'Baterista', sprite:'baterista', x:20, dialog:'“¡Uno, dos, tres, cuatro! ...¿probamos de nuevo?” 🥁' },
          { name:'Asador', sprite:'choriVendor', x:7, dialog:'“Tranqui que falta, el asado no se apura. ¿Querés un choripán de la previa?” 🔥' },
        ],
        decor: [{t:'parlante',x:4},{t:'ampli',x:10},{t:'ampli',x:17},{t:'bateria',x:21},{t:'parrilla',x:7}],
        enemies: [{t:'peaton',x:5,look:'peatonN'},{t:'peaton',x:24,look:'shopperW'}],
        pickups: [{t:'health',x:3},{t:'coins',x:24,amount:6}],
      }),
      // 13 — CASA DE CAMBIO OFICIAL: repleta de gente; acá se abre el PORTAL tras la tormenta
      makeRoom({
        name: 'Casa de Cambio Oficial', theme: 'cambio', light: 1.0, stormable: true, w: 24,
        playerStart: 3, goal: 21,
        doors: [{ id:'out', art:'exit', label:'salir a la calle', x:2, inward:1 }],
        npcs: [
          { name:'Cajero', sprite:'recepcionista', x:6,  dialog:'“Número 247... ¿el 247? Bueno, el que sigue. Despacio que es uno solo.” 🪟' },
          { name:'Cajera', sprite:'recepcionista', x:9,  dialog:'“No hay billetes chicos, señor. ¿De cien nomás? No tengo.” 🪟' },
          { name:'En la cola', sprite:'gordo',   x:11, dialog:'“Saqué número a las siete de la mañana, ¿eh? No me corran.” 🎫' },
          { name:'En la cola', sprite:'mujer',   x:12, dialog:'“¿Cómo que cerró la caja? ¡Si recién abrieron!” 😤' },
          { name:'En la cola', sprite:'viejo',   x:13, dialog:'“En mis tiempos esto se hacía en la vereda, más rápido.” 👴' },
          { name:'En la cola', sprite:'turista', x:14, dialog:'“Is this the official rate? ...¿el oficial? ¡Pero si es la mitad!” 📸' },
          { name:'En la cola', sprite:'civil2',  x:15, dialog:'“Hace dos horas que no avanza un paso, hermano.” 🧢' },
          { name:'En la cola', sprite:'conNino', x:16, dialog:'“Aguantá, nene, ya casi... no, mentira, falta un montón.” 👨‍👦' },
          { name:'En la cola', sprite:'civil4',  x:17, dialog:'“Pedí el día en el laburo para esto. Para ESTO.” 💼' },
          { name:'En la cola', sprite:'civil3',  x:18, dialog:'“Está hasta las pelotas, no entra un alfiler más.” 😮‍💨' },
        ],
        decor: [{t:'escritorio',x:6},{t:'escritorio',x:9},{t:'cartel',x:14},{t:'planta',x:20},{t:'planta',x:4}],
        pickups: [{t:'coins',x:8,amount:5},{t:'ammo',x:19}],
      }),
    ];

    // ---- 14..33: EDIFICIO ABANDONADO de los borrachines, 20 PISOS ----
    //   impares = LUJO (lo mejor de la moda, no hay nadie)
    //   pares   = DESTRUIDOS (escombros y gente tirada / yonquis durmiendo)
    const RUINA_LINES = _D('linyera_ruina', [
      '“...andá pasando, pibe... acá no hay nada... nada...” 💀',
      '“¿Tenés un puchito? ...dejá, dejá...” 🚬',
      'Duerme hecho un ovillo, ni te registra. 😴',
      '“Antes esto era un hotel cinco estrellas, ¿sabés?” 🏚️',
      '“Shhh... no despiertes a los de arriba.”',
      '“Yo vivía en el piso de lujo... me echaron... ahora vivo acá nomás.”',
      'Murmura algo y se da vuelta contra la pared. 😪',
      '“¿Buscás algo de valor? Subí a los impares... están vacíos, pero brillan.” ✨',
      '“La tele anda... si la mirás de costado y entrecerrás los ojos.” 📺',
      '“No uses ese baño, pibe, hace una semana que chorrea.” 🚽',
      '“Este sillón lo saqué de la calle. Tiene historia. Y pulgas.” 🛋️',
      '“¿Vos también te quedaste sin nada? Bienvenido al club.” 🍷',
      'Tose, escupe, y te ofrece la mitad de su vino. 🍷',
      '“Cuidado con el agujero del piso, ahí se cayó el Beto.” 🕳️',
      '“Yo era gerente de banco, ¿sabés? Mirame ahora.” 💼',
      '“Si ves a un linyera con un tótem de monos... ese es el jefe.” 🐵',
      '“Hay goteras hasta en las goteras, hermano.” 💧',
      '“Pasá tranqui, total acá ya no queda nada que romper.” 🧱',
    ]);
    // el linyera filósofo que cuida el maletín de los pisos de lujo (Diógenes versión Florida)
    const LINYERA_LINES = [
      '“¡Pará, pibe! No toques eso. Vos solo, loco... ¿viste? Esto puede afectar el espacio-temporal y me convierto DE VUELTA en millonario. ¡Y yo NO quiero laburaaar! ...No entendés nada. Corréte, pibe, que me tapás el sol.” 🌞',
      '“Dejá el maletín ahí, maestro. Yo ya fui rico, fue un garrón. Ahora: panza al sol y cero quilombo. Corréte que me hacés sombra.” 🌞',
      '“¿Las joyas? Mías, de cuando era millonario. Las tocás y se rompe todo de nuevo, ¿me entendés? Andá, andá.” ✨',
      '“No, no, no. Esa guita está enchastrada con el espacio-tiempo. La agarrás y mañana tengo que ir a laburar. Ni en pedo, pibe.” 💼',
    ];
    for (let n = 1; n <= 20; n++) {
      const lux = (n % 2 === 1), w = 17;
      const doors = [{ id:'down', art: n === 1 ? 'exit' : 'elevator', label: n === 1 ? 'salir a la calle' : 'bajar un piso', x:2, inward:1 }];
      if (n < 20) doors.push({ id:'up', art:'elevator', label:'subir un piso', x:w-3, inward:-1 });
      // piso 20: puerta SECRETA al búnker (solo usable con bunkerUnlocked, lo maneja game.js)
      if (n === 20) doors.push({ id:'bunker', art:'exit', label:'entrar al BÚNKER (secreto)', x:w-3, inward:-1 });
      const spec = { name:'Edificio Abandonado — Piso ' + n + (lux ? ' · LUJO' : ' · ruina'),
        theme: lux ? 'lujo' : 'ruina', light: lux ? 1.0 : 0.42, w, doors };
      if (lux) {
        // depto de lujo: moda, cocina, baño, living con tele, joyas y un maletín con dólares
        spec.decor = [
          {t:'maniqui',x:3.4}, {t:'cocina',x:4.8}, {t:'bano',x:6.6},
          {t:'sofa',x:8.6}, {t:'tvplasma',x:10.1}, {t:'joyas',x:11.4}, {t:'maletin',x:12.4},
        ];
        // UN solo punto interactivo sobre las joyas/maletín (trigger invisible sobre el decor):
        // pre-tormenta toca las joyas → el linyera te raja; post-tormenta abrís el cajón → falopa.
        spec.npcs = [
          { name:'', sprite:'linyera', invisible:true, x:11.9, action:'lujo', lines: LINYERA_LINES },
        ];
        spec.pickups = [{t:'coins',x:7,amount:6}];
        // PISO 19: además, el TÓTEM sagrado de 3 monos (abre el búnker del piso 20)
        if (n === 19) {
          spec.decor.push({t:'maniqui',x:9.3});
          spec.npcs.push({ name:'Tótem de 3 monos', sprite:'totem_monos', x:8, action:'totem' });
        }
      } else {
        // piso DESTRUIDO: cada piso par es distinto — muebles rotos y linyeras variados por piso
        const roto = ['escombros','tele_rota','bano_roto','mueble_roto','sillon_roto','barril','caja'];
        const at = (k) => roto[(n*5 + k*3) % roto.length];     // muebles rotos distintos por piso
        const dx = [4.5, 7, 9.5, 12];
        spec.decor = dx.map((x, k) => ({ t: at(k), x: x + ((n + k) % 3 - 1) * 0.5 }));
        const count = 2 + (n % 3);                              // 2..4 linyeras tirados por piso
        const xs = [3.5, 5.5, 7.5, 9.5, 11.5];
        const names = ['Linyera tirado','Linyera durmiendo','Linyera hecho mierda','Linyera'];
        spec.npcs = [];
        for (let i = 0; i < count; i++) {
          spec.npcs.push({
            name: names[i % names.length],
            sprite: ((n + i) % 3 === 0) ? 'linyera' : 'yonqui',          // mezcla tirados/parados
            x: xs[(i + (n >> 1)) % xs.length],                           // posiciones rotadas por piso
            dialog: RUINA_LINES[(n*5 + i*7) % RUINA_LINES.length],       // cada uno dice algo distinto
            action: 'limosna',                                          // tras la tormenta te dan monedas
          });
        }
        spec.pickups = [{t:'health',x:8}];
      }
      rooms.push(makeRoom(spec));
    }

    // 34 — EL BÚNKER de los linyeras (refugio más seguro; acá vive el LOOP del nivel)
    rooms.push(makeRoom({
      name: 'El Búnker de los Linyeras', theme: 'secret', light: 0.8, w: 20,
      doors: [{ id:'back', art:'exit', label:'volver al piso 20', x:2, inward:1 }],
      npcs: [
        { name:'', sprite:'linyera', invisible:true, x:10, action:'loop' },   // el CATRE (decor) es el punto de dormir
        { name:'Linyera', sprite:'linyera', x:5,  dialog:'“Bienvenido al búnker, gurú. Acá nadie labura. Tirate en el catre cuando quieras pasar el día. 🛖”' },
        // el linyera MAYOR te entrega el TESORO de los linyeras (premio del edificio: solo para el gurú)
        { name:'Linyera mayor', sprite:'linyera', x:13, action:'tesoro',
          dialog:'“Vos sos el gurú... a vos sí te lo damos. Guardamos un maletín toda la vida para alguien que entienda. Tomá: la guita y un secreto para que escupas como Dios manda.” 🐵💼' },
        { name:'Linyera', sprite:'linyera', x:17, dialog:'“Si querés salir de verdad, andá al portal de la Casa de Cambio. Si no, quedate en el loop.” 🔁' },
      ],
      decor: [{t:'catre',x:10},{t:'barril',x:4},{t:'maletin',x:13.5},{t:'parlante',x:18}],
      pickups: [{t:'health',x:12},{t:'coins',x:6,amount:8}],
    }));

    // 35,36,37 — las TRES cuevas del dólar (cada cuevero te invita a la suya): gente esperando + el deal
    rooms.push(makeRoom({
      name: 'Cueva del dólar — la del fondo', theme: 'rock', light: 0.36, w: 18,
      doors: [{ id:'back', art:'up', label:'salir de la cueva', x:2, inward:1 }],
      cueveros: [{ name:'El cuevero', sprite:'cuevero', x:14, outcome:'coins',
        dialog:'“Uh, venís cargado de monedas... eso te marca, pibe. Acá no te cambio. Andá.”' }],
      npcs: [
        { name:'En la cola', sprite:'gordo',  x:6,    dialog:'“Todo legal, ¿eh? Es para mi hijo, para cuando sea grande.” 👶' },
        { name:'En la cola', sprite:'civil3', x:9,    dialog:'“Si no ahorro en dólares, este país se va a la mierda, pibe.” 🇦🇷' },
        { name:'En la cola', sprite:'mujer',  x:11.5, dialog:'“Yo en el peso no confío ni loca. Verde o nada.” 💵' },
      ],
      decor: [{t:'barril',x:4},{t:'caja',x:8},{t:'cartel',x:12}],
      pickups: [{t:'coins',x:7,amount:4}],
    }));
    rooms.push(makeRoom({
      name: 'Cueva del dólar — la de al lado', theme: 'rock', light: 0.36, w: 18,
      doors: [{ id:'back', art:'up', label:'salir de la cueva', x:2, inward:1 }],
      cueveros: [{ name:'El cuevero', sprite:'cuevero', x:14, outcome:'garca',
        dialog:'“Mmm... tenés cara de garca. Nah, andá a otro lado, no te cambio nada.”' }],
      npcs: [
        { name:'En la cola', sprite:'viejo',   x:6,    dialog:'“Vengo todos los meses. Es mi cajita de ahorro, qué querés.” 🏦' },
        { name:'En la cola', sprite:'civil4',  x:9,    dialog:'“Shhh, acá no se habla de cuánto traés, pibe.” 🤫' },
        { name:'En la cola', sprite:'conNino', x:11.5, dialog:'“Es para el futuro del nene. Dólar, siempre dólar.” 👨‍👦' },
      ],
      decor: [{t:'caja',x:4},{t:'barril',x:8},{t:'cartel',x:12}],
      pickups: [{t:'ammo',x:7}],
    }));
    rooms.push(makeRoom({
      name: 'Cueva del dólar — la que te cambia', theme: 'rock', light: 0.36, w: 18,
      doors: [{ id:'back', art:'up', label:'salir de la cueva', x:2, inward:1 }],
      cueveros: [{ name:'El cuevero', sprite:'cuevero', x:14, outcome:'real',
        dialog:'“Dale, vení que te los cambio, tranqui...”' }],
      npcs: [
        { name:'En la cola', sprite:'civil2', x:6,    dialog:'“Acá sí te cambian. El tipo es de confianza, eh.” 💵' },
        { name:'En la cola', sprite:'mujer',  x:9,    dialog:'“Es para mi hijo, todo legal. Bueno, legal-legal no, pero me entendés.” 👶' },
        { name:'En la cola', sprite:'gordo',  x:11.5, dialog:'“Apurate que se hace cola. Si no ahorro verde, ¿qué le dejo a los pibes?” 🇦🇷' },
      ],
      decor: [{t:'barril',x:4},{t:'cartel',x:8},{t:'caja',x:12}],
      pickups: [{t:'coins',x:7,amount:5}],
    }));

    function wire(ai, ad, bi, bd) {
      const A = rooms[ai], B = rooms[bi], da = A.doorById[ad], db = B.doorById[bd];
      da.to = bi; da.at = { x: db.x + db.inward*48, y: db.y };
      db.to = ai; db.at = { x: da.x + da.inward*48, y: da.y };
    }
    wire(0, 'edu', 1, 'out');
    wire(1, 'up', 2, 'down');
    wire(2, 'up', 3, 'down');
    wire(0, 'arcade', 4, 'out');
    wire(0, 'choris', 5, 'out');
    wire(0, 'galeria', 6, 'up');
    wire(6, 'down', 7, 'up');
    wire(7, 'down', 8, 'up');
    wire(4, 'secret', 9, 'back');
    wire(9, 'truco', 10, 'back');
    wire(0, 'garbarino', 11, 'out');
    wire(0, 'cemento', 12, 'out');
    wire(0, 'cambio', 13, 'out');
    // edificio abandonado: calle -> piso 1, y ascensor entre pisos
    wire(0, 'abandonado', 14, 'down');
    for (let n = 1; n < 20; n++) wire(13 + n, 'up', 14 + n, 'down');
    // piso 20 (sala 33) -> búnker (sala 34), por la puerta secreta
    wire(33, 'bunker', 34, 'back');
    // las 3 cuevas (35,36,37): se entra por la invitación del cuevero (handleCuevero), se sale por 'back' al hall (8)
    [35, 36, 37].forEach((ri, k) => {
      const r = rooms[ri];
      const d = r.doorById['back'];
      d.to = 8; d.at = { x: [14, 26, 40][k] * TILE + TILE/2, y: rooms[8].gTop * TILE };
      // diálogos generados por IA (si dialogos.js está): gente esperando + cuevero que rebota
      for (const n of r.npcs) if (n.name === 'En la cola') n.dialog = _Dp('cueva_gente', n.dialog);
      for (const c of r.cueveros) if (c.outcome !== 'real') c.dialog = _Dp('cuevero_rebote', c.dialog);
    });

    // la COLA del dólar usa el pool generado: la fila en la calle (x≈74-90) y la Casa de Cambio (sala 13)
    for (const n of rooms[0].npcs) if (n.x >= 73 * TILE && n.x <= 91 * TILE) n.dialog = _Dp('cola_dolar', n.dialog);
    for (const n of rooms[13].npcs) if (/cola/i.test(n.name)) n.dialog = _Dp('cola_dolar', n.dialog);

    return rooms;
  }

  return { TILE, GRAV, build, solid, solidPx, moveBody };
})();
