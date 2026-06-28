// fx.js — sistema de partículas y de proyectiles.

const Particles = (() => {
  let list = [];
  function clear() { list = []; }
  function spawn(x, y, vx, vy, life, col, size, grav = 1400) {
    list.push({ x, y, vx, vy, life, max: life, col, size, grav });
  }
  function burst(x, y, n, col, spd, grav) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random() * 0.7);
      spawn(x, y, Math.cos(a)*s, Math.sin(a)*s, 0.3 + Math.random()*0.4, col, 1 + Math.random()*2.5, grav);
    }
  }
  function muzzle(x, y, dx, dy) {
    for (let i = 0; i < 6; i++) {
      const sp = 120 + Math.random()*180;
      spawn(x, y, dx*sp + (Math.random()-.5)*60, dy*sp + (Math.random()-.5)*60, 0.12+Math.random()*0.1,
        Math.random()<.5 ? '#fff3b0' : '#ffb84d', 1.5+Math.random()*2, 0);
    }
  }
  function spit(x, y, dx, dy) {
    for (let i = 0; i < 6; i++) {
      const sp = 70 + Math.random()*140;
      spawn(x, y, dx*sp + (Math.random()-.5)*80, dy*sp + (Math.random()-.5)*80, 0.18+Math.random()*0.14,
        Math.random()<.5 ? '#b6e89a' : '#dff3d0', 1.5+Math.random()*2, 380);
    }
  }
  function update(dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) { list.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }
  function draw(ctx, cam) {
    for (const p of list) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x - cam.x - p.size/2, p.y - cam.y - p.size/2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
  return { clear, spawn, burst, muzzle, spit, update, draw, get list() { return list; } };
})();

const Bullets = (() => {
  let list = [];
  function clear() { list = []; }
  function spawn(x, y, vx, vy, from, dmg, kind) {
    list.push({ x, y, vx, vy, from, dmg, kind: kind || 'spit', life: 1.6, spin: Math.random() * 6.28,
      col: from === 'player' ? '#ffe14d' : '#ff5a5a' });
  }
  function hitRect(b, e) { return b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h; }

  // onPlayerHit(dmg); enemies: lista con .alive,.x,.y,.w,.h,.hp
  function update(dt, room, enemies, player, onPlayerHit) {
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      b.life -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      let dead = b.life <= 0;
      if (!dead && Level.solidPx(room, b.x, b.y)) {
        Particles.burst(b.x, b.y, 5, b.from === 'player' ? '#b6e89a' : '#cfcfcf', 150, 500); dead = true;
      }
      if (!dead && b.from === 'player') {
        for (const e of enemies) {
          if (!e.alive || e.pacified) continue;
          if (hitRect(b, e)) {
            // VIOLA (RISAS de Les Luthiers + heavy metal): la GENTE queda muerta de risa con música 🎵; los DRONES/
            // voladores salen volando ALOCADOS por el heavy metal. En ambos casos: inofensivos, no los mata.
            if (b.kind === 'laugh') {
              e.hostile = false; e.flash = 0.08;
              if (e.fly) { e.fleeing = true; e.vx = (Math.random() < 0.5 ? -1 : 1) * (140 + Math.random() * 140); e.vy = -130 - Math.random() * 140; }
              else { e.pacified = true; e.laughing = true; e.vx = 0; }
              Particles.burst(b.x, b.y, 12, '#ffe14d', 200, 700); Sfx.pickup();
            }
            // DÓLAR contra GENTE (no voladores): la apacigua → se tira al piso a juntar y no jode más (no la mata).
            else if (b.kind === 'dollar' && !e.fly) {
              e.pacified = true; e.hostile = false; e.vx = 0; e.flash = 0.08;
              Particles.burst(b.x, b.y, 12, '#7ee07e', 200, 700); Sfx.pickup();
            } else {
              e.hp -= b.dmg; e.hostile = true; e.flash = 0.08;
              Particles.burst(b.x, b.y, 6, b.kind === 'dollar' ? '#7ee07e' : '#a9e08a', 170, 600);
              if (e.hp <= 0) e.die(); else Sfx.hit();
            }
            dead = true; break;
          }
        }
      }
      if (!dead && b.from === 'enemy' && player.alive) {
        if (hitRect(b, player)) { onPlayerHit(b.dmg); Particles.burst(b.x, b.y, 6, '#b03030', 160, 700); dead = true; }
      }
      if (dead) list.splice(i, 1);
    }
  }
  function draw(ctx, cam) {
    for (const b of list) {
      const a = Math.atan2(b.vy, b.vx);
      ctx.save(); ctx.translate(b.x - cam.x, b.y - cam.y);
      if (b.from === 'player' && b.kind === 'laugh') {
        // RISA de la viola: nota musical amarilla que tiembla (Les Luthiers)
        const wob = Math.sin(((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 70) + (b.spin || 0)) * 2;
        ctx.translate(0, wob);
        ctx.fillStyle = '#ffe14d'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText((b.spin || 0) % 2 < 1 ? '♪' : '♫', 0, 0);
        ctx.fillStyle = 'rgba(255,240,160,0.4)'; ctx.fillText('♪', 0, 0);
        ctx.restore(); continue;
      }
      if (b.from === 'player' && b.kind === 'dollar') {
        // BILLETE DE DÓLAR girando (proyectil post-tormenta)
        ctx.rotate((b.spin || 0) + (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 90);
        ctx.fillStyle = '#2e7d32'; ctx.fillRect(-7, -4, 14, 8);
        ctx.fillStyle = '#1b5e20'; ctx.fillRect(-7, -4, 14, 8); ctx.fillStyle = '#3a9d3a'; ctx.fillRect(-6, -3, 12, 6);
        ctx.fillStyle = '#dff5df'; ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1b5e20'; ctx.font = 'bold 4px monospace'; ctx.textAlign = 'center'; ctx.fillText('$', 0, 1.5);
        ctx.restore(); continue;
      }
      ctx.rotate(a);
      if (b.from === 'player') {
        // escupitajo (gargajo)
        ctx.fillStyle = 'rgba(150,205,120,0.55)'; ctx.fillRect(-8, -1, 6, 2); // hilo de baba
        ctx.fillStyle = '#a9e08a'; ctx.beginPath(); ctx.ellipse(0, 0, 5, 3.4, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#e0f4d4'; ctx.beginPath(); ctx.ellipse(-1, -1, 2, 1.3, 0, 0, Math.PI*2); ctx.fill();
      } else {
        ctx.fillStyle = b.col; const len = 6;
        ctx.fillRect(-len, -1.5, len*2, 3);
        ctx.fillStyle = 'rgba(255,255,200,0.6)'; ctx.fillRect(-len, -0.7, len*2, 1.4);
      }
      ctx.restore();
    }
  }
  return { clear, spawn, update, draw, get list() { return list; } };
})();
