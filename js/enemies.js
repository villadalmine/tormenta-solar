// enemies.js — peatones glitcheados (cuerpo a cuerpo), drones y cuevero (disparan).
// Pasivos hasta que estalla la tormenta (o si les disparás).
const Enemies = (() => {
  const T = {
    peaton:  { w:20, h:40, hp:30, fly:false, art:'peatonN', mad:'peaton', beh:'walker', speed:74, dmg:10 },
    dron:    { w:28, h:20, hp:22, fly:true,  art:'dron',    beh:'flyer',  speed:96,  dmg:7  },
    cuevero: { w:22, h:40, hp:70, fly:false, art:'cuevero', beh:'turret', speed:60,  dmg:12 },
    pacman:  { w:24, h:24, hp:34, fly:false, art:'pacman',  beh:'walker', speed:132, dmg:14 },
    galaga:  { w:30, h:22, hp:26, fly:true,  art:'galaga',  beh:'flyer',  speed:104, dmg:10 },
  };

  function create(s) {
    const t = T[s.type];
    const e = {
      type: s.type, w: t.w, h: t.h, hp: t.hp, fly: t.fly, art: t.art,
      calmArt: s.look || t.art, madArt: t.mad || t.art,
      beh: t.beh, speed: t.speed, dmg: t.dmg, dormant: !!s.dormant,
      x: s.x - t.w/2, y: t.fly ? s.y - t.h/2 : s.y - t.h,
      vx: 0, vy: 0, grounded: false,
      hostile: false, alive: true, flash: 0, atkCd: 0,
      shootCd: 0.6 + Math.random()*0.8, bob: Math.random()*6, facing: -1,
      die() {
        if (!this.alive) return;
        this.alive = false;
        Particles.burst(this.x+this.w/2, this.y+this.h/2, 16, this.fly ? '#88c0e0' : '#7a8a5a', 230, 600);
        Sfx.enemyDie();
      },
    };
    return e;
  }

  function overlap(a, b) { return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }

  // ¿hay un BORDE/POZO justo adelante (en dir)? Para que los caminantes NO se tiren al vacío de los niveles generados.
  function edgeAhead(e, room, dir) {
    if (!room._hasPit) return false;                 // aditivo: solo importa donde hay pozos
    const T = Level.TILE;
    const col = Math.floor((dir > 0 ? e.x + e.w + 2 : e.x - 2) / T);
    const supportRow = Math.floor((e.y + e.h) / T);  // la fila donde se apoya el pie
    return !Level.solid(room, col, supportRow);       // sin piso adelante → es un borde
  }

  function fireAt(e, player, dmg, spd) {
    const sx = e.x+e.w/2, sy = e.y+e.h/2;
    let dx = (player.x+player.w/2)-sx, dy = (player.y+12)-sy;
    const m = Math.hypot(dx, dy) || 1;
    Bullets.spawn(sx, sy, dx/m*spd, dy/m*spd, 'enemy', dmg);
    Sfx.eShoot();
  }

  function update(list, dt, room, player, dronesBlind) {
    for (const e of list) {
      if (!e.alive) continue;
      // APACIGUADO con dólares: se tira al piso a juntar guita, no ataca ni te jode más.
      if (e.pacified) { e.vx = 0; if (!e.fly) Level.moveBody(e, room, dt); e.flash -= dt; e.bob += dt * 6; continue; }
      if (e.dormant && !e.hostile) continue;
      e.flash -= dt; e.bob += dt*6;
      if (!e.hostile) continue;
      // ROBOTS CIEGOS (le tiraste un dólar de serie BUENA = legal): el dron NO te ve unos segundos → deriva, no dispara.
      if (dronesBlind && e.fly) { e.vx *= 0.92; e.vy = Math.sin(e.bob) * 22; Level.moveBody(e, room, dt, 0); e.shootCd = Math.max(e.shootCd, 0.6); continue; }
      const pcx = player.x+player.w/2, ecx = e.x+e.w/2;
      e.facing = pcx < ecx ? -1 : 1;

      if (e.beh === 'walker') {
        const dir = pcx > ecx ? 1 : -1;
        e.vx = dir * e.speed;
        if (e.grounded && edgeAhead(e, room, dir)) e.vx = 0;   // no se tira al pozo: frena en el borde
        Level.moveBody(e, room, dt);
        e.atkCd -= dt;
        if (overlap(e, player) && e.atkCd <= 0) { player.hurt(e.dmg); e.atkCd = 0.7; }
      } else if (e.beh === 'flyer') {
        const tx = pcx-(e.x+e.w/2), ty = (player.y+12)-(e.y+e.h/2);
        const m = Math.hypot(tx, ty) || 1;
        e.vx = tx/m*e.speed; e.vy = ty/m*e.speed + Math.sin(e.bob)*22;
        Level.moveBody(e, room, dt, 0);
        e.shootCd -= dt;
        if (e.shootCd <= 0 && Math.hypot(tx, ty) < 480) { fireAt(e, player, e.dmg, 320); e.shootCd = 1.4; }
      } else { // turret (cuevero)
        if (Math.random() < 0.012) e.vx = (pcx > ecx ? 1 : -1) * e.speed; else e.vx *= 0.8;
        if (e.grounded && e.vx !== 0 && edgeAhead(e, room, e.vx > 0 ? 1 : -1)) e.vx = 0;   // tampoco se tira al pozo
        Level.moveBody(e, room, dt);
        e.shootCd -= dt;
        if (e.shootCd <= 0) { fireAt(e, player, e.dmg, 370); e.shootCd = 0.8; }
      }
    }
  }

  function draw(e, ctx, cam, stormed) {
    if (!e.alive) return;
    if (e.dormant && !e.hostile) return;
    const art = Art.enemyArt[e.hostile ? e.madArt : e.calmArt] || Art.enemyArt[e.art];
    let frame;
    if (e.type === 'peaton') frame = art.frames[Math.floor(performance.now()/170) % art.frames.length];
    else if (e.type === 'dron' || e.type === 'galaga') frame = art.frames[Math.floor(performance.now()/80) % art.frames.length];
    else if (e.type === 'pacman') frame = art.frames[Math.floor(performance.now()/110) % art.frames.length];
    else frame = art.frames[0];
    const fw = frame.width, fh = frame.height;
    const cx = e.x - cam.x + e.w/2;
    const drawX = cx - fw/2;
    const drawY = e.fly ? (e.y - cam.y + e.h/2 - fh/2) : (e.y - cam.y + e.h - fh);

    if (!e.fly) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(cx, e.y - cam.y + e.h, 12, 4, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.save();
    if (e.facing < 0 && !e.fly) { ctx.translate(drawX+fw/2, 0); ctx.scale(-1, 1); ctx.translate(-(drawX+fw/2), 0); }
    ctx.drawImage(frame, drawX, drawY);
    if (e.flash > 0) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85;
      ctx.drawImage(frame, drawX, drawY);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    if (stormed && !e.pacified && Math.random() < 0.5) {
      ctx.globalAlpha = 0.22;
      ctx.drawImage(frame, drawX + (Math.random()<.5?2:-2), drawY);
      ctx.globalAlpha = 1;
    }
    // APACIGUADO: tirado juntando billetes (💰 + signos $ flotando)
    if (e.pacified) {
      const hx = cx, hy = e.y - cam.y - 4;
      ctx.font = '13px serif'; ctx.textAlign = 'center'; ctx.fillText('💰', hx, hy + Math.sin(e.bob) * 2);
      ctx.fillStyle = '#7ee07e'; ctx.font = 'bold 9px monospace';
      ctx.fillText('$', hx - 9 + (Math.sin(e.bob * 1.3) * 3), e.y - cam.y + e.h - 6);
      ctx.fillText('$', hx + 9 + (Math.cos(e.bob) * 3), e.y - cam.y + e.h - 10);
    }
  }

  return { create, update, draw, overlap };
})();
