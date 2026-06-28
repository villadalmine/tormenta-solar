// player.js — protagonista: correr, saltar, apuntar con el mouse y disparar.
const Player = (() => {
  function create(feetX, feetY) {
    return {
      x: feetX - 10, y: feetY - 40, w: 20, h: 40,
      vx: 0, vy: 0, grounded: false, facing: 1,
      hp: 100, ammo: 24, coins: 20, forros: 0, flores: 0, caramelos: 0, birras: 0, carne: 0, fiambre: 0, diosa: 0, falopa: 0, hasMegaDrive: false, hasCementoTicket: false, alive: true,
      spitDmg: 14,   // daño del escupitajo; el TESORO de los linyeras (gurú) lo sube (mejora permanente del run)
      inventory: ['escupitajo'], weapon: 'escupitajo',   // INVENTARIO (specs/inventario-armas.md): armas que tenés + la equipada
      anim: 'idle', animTime: 0, shootCd: 0, muzzle: 0,
      aim: { x: 1, y: 0 }, hurtCd: 0,

      update(dt, room, cam, onShoot) {
        const sp = 210;
        this.vx = 0;
        if (!this.stunned) {
          if (Input.left()) this.vx = -sp;
          if (Input.right()) this.vx = sp;
          if (Input.jump() && this.grounded) { this.vy = -660; this.grounded = false; Sfx.jump(); }
        }
        Level.moveBody(this, room, dt);

        const ax = Input.mouse.x + cam.x, ay = Input.mouse.y + cam.y;
        let dx = ax - (this.x + this.w/2), dy = ay - (this.y + 14);
        const m = Math.hypot(dx, dy) || 1; this.aim = { x: dx/m, y: dy/m };
        this.facing = dx < 0 ? -1 : 1;

        this.shootCd -= dt; this.muzzle -= dt; this.hurtCd -= dt;
        if (Input.mouse.down && this.canShoot !== false) this.shoot();   // pre-tormenta canShoot=false → no dispara (lo setea game.js)

        this.animTime += dt;
        this.anim = !this.grounded ? 'jump' : (this.vx !== 0 ? 'run' : 'idle');
      },

      shoot() {
        if (this.shootCd > 0) return;
        if (this.ammo <= 0) { Sfx.empty(); this.shootCd = 0.25; return; }
        this.ammo--; this.shootCd = 0.16; this.muzzle = 0.08;
        const sx = this.x + this.w/2 + this.aim.x*18, sy = this.y + 12 + this.aim.y*18;
        // El proyectil sale del ARMA EQUIPADA (specs/inventario-armas.md). VIOLA → dispara RISAS (apacigua a cualquiera,
        // hasta voladores, no mata). ESCUPITAJO → post-tormenta escupe DÓLARES (apaciguan a la gente, no a voladores), pre-tormenta gargajo.
        const viola = this.weapon === 'viola';
        const kind = viola ? 'laugh' : (this.dollarMode ? 'dollar' : 'spit');
        const dmg = viola ? 0 : (this.spitDmg || 14);
        Bullets.spawn(sx, sy, this.aim.x*720, this.aim.y*720, 'player', dmg, kind);
        this.shots = (this.shots || 0) + 1; this.lastShot = { kind, x: sx, y: sy };   // para que las cámaras "vean" el dólar (game.js)
        Particles.spit(sx, sy, this.aim.x, this.aim.y);
        Sfx.spit();
      },

      hurt(dmg) {
        if (this.hurtCd > 0) return;
        this.hp -= dmg; this.hurtCd = 0.4; Sfx.hurt();
        if (this.hp <= 0) { this.hp = 0; this.alive = false; }
      },

      draw(ctx, cam) {
        const f = Art.hero;
        const frame = this.anim === 'jump' ? f.jump[0]
          : this.anim === 'run' ? f.run[Math.floor(this.animTime*11) % f.run.length]
          : f.idle[0];
        const drawX = (this.x - cam.x) + this.w/2 - 16;
        const drawY = (this.y - cam.y) + this.h - 44;
        // sombra
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(this.x - cam.x + this.w/2, this.y - cam.y + this.h, 13, 4, 0, 0, Math.PI*2); ctx.fill();
        // === QUEST DEL CHIP: cuando controlás al PIBE DE GARBARINO te ves como el vendedor (💼), NO como el Carpo ===
        if (this.asGarbarino && typeof Art !== 'undefined' && Art.npc && Art.npc.vendedor) {
          ctx.save();
          if (this.facing < 0) { ctx.translate(drawX + 16, 0); ctx.scale(-1, 1); ctx.translate(-(drawX + 16), 0); }
          ctx.drawImage(Art.npc.vendedor, drawX, drawY);
          ctx.restore();
          ctx.font = '12px serif'; ctx.textAlign = 'center'; ctx.fillText('💼', this.x - cam.x + this.w/2, this.y - cam.y - 6);
          return;
        }
        // cuerpo (flip según mira)
        ctx.save();
        if (this.facing < 0) { ctx.translate(drawX + 16, 0); ctx.scale(-1, 1); ctx.translate(-(drawX + 16), 0); }
        if (this.hurtCd > 0.25) ctx.globalAlpha = 0.6;
        ctx.drawImage(frame, drawX, drawY);
        ctx.restore();
        // brazo señalando + escupitajo desde la mano (sin arma)
        const shx = this.x - cam.x + this.w/2, shy = this.y - cam.y + 14;
        const a = Math.atan2(this.aim.y, this.aim.x);
        ctx.save(); ctx.translate(shx, shy); ctx.rotate(a);
        ctx.strokeStyle = '#d9a878'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(16, 0); ctx.stroke();
        ctx.fillStyle = '#e6c39a'; ctx.beginPath(); ctx.arc(17, 0, 3, 0, Math.PI*2); ctx.fill(); // puño
        if (this.muzzle > 0) {
          const viola = this.weapon === 'viola';
          ctx.fillStyle = viola ? 'rgba(255,225,77,0.95)' : 'rgba(169,224,138,0.95)';
          ctx.beginPath(); ctx.arc(21, 0, 5, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = viola ? 'rgba(255,240,160,0.5)' : 'rgba(200,240,170,0.5)';
          ctx.beginPath(); ctx.arc(21, 0, 9, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
      },
    };
  }
  return { create };
})();
