// art.js — gráficos procedurales: tiles, sprites animados y fondos con parallax.
// Todo se pre-renderiza en canvases offscreen (sin assets externos).
const Art = (() => {
  const TILE = 32;

  function mk(w, h, fn) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    fn(c.getContext('2d'), w, h);
    return c;
  }
  function rng(seed) { return () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; }
  function line(g, x1, y1, x2, y2, wd, col) { g.strokeStyle = col; g.lineWidth = wd; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }

  // ---------------- TILES ----------------
  function speckle(g, w, h, amt, col) {
    g.fillStyle = col;
    for (let i = 0; i < amt; i++) g.fillRect(Math.random()*w, Math.random()*h, 1, 1);
  }
  const tiles = {
    street: mk(TILE, TILE, (g, w, h) => {
      g.fillStyle = '#6b6f76'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#5c6066'; g.fillRect(0, 0, w, 3);
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
      g.strokeRect(0.5, 0.5, w-1, h-1);
      speckle(g, w, h, 40, 'rgba(0,0,0,0.10)');
      speckle(g, w, h, 25, 'rgba(255,255,255,0.06)');
    }),
    building: mk(TILE, TILE, (g, w, h) => {
      g.fillStyle = '#4a5560'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2c3640'; g.fillRect(5, 5, 10, 12); g.fillRect(18, 5, 9, 12);
      g.fillStyle = '#6f93a8'; g.fillRect(6, 6, 4, 5); g.fillRect(19, 6, 4, 5);
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.strokeRect(0.5, 0.5, w-1, h-1);
    }),
    concrete: mk(TILE, TILE, (g, w, h) => {
      g.fillStyle = '#494640'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 50, 'rgba(0,0,0,0.18)');
      g.fillStyle = 'rgba(20,28,20,0.25)'; g.fillRect(0, h-8, w, 8);
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.strokeRect(0.5, 0.5, w-1, h-1);
    }),
    rock: mk(TILE, TILE, (g, w, h) => {
      g.fillStyle = '#322c28'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 70, 'rgba(0,0,0,0.30)');
      speckle(g, w, h, 20, 'rgba(120,110,90,0.10)');
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1;
      for (let i = 0; i < 3; i++) { g.beginPath(); let x = Math.random()*w; g.moveTo(x, 0); for (let y=0;y<h;y+=6){x+=(Math.random()-.5)*8;g.lineTo(x,y);} g.stroke(); }
    }),
    shop: mk(TILE, TILE, (g, w, h) => {
      g.fillStyle = '#6a5d4a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#7c6e58'; for (let y=0;y<h;y+=8) for (let x=(y/8%2?8:0);x<w;x+=16) g.fillRect(x, y, 8, 8);
      g.strokeStyle = 'rgba(0,0,0,0.2)'; g.strokeRect(0.5, 0.5, w-1, h-1);
    }),
    office: mk(TILE, TILE, (g, w, h) => {
      g.fillStyle = '#d8dde3'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#c3cad2'; for (let y=0;y<h;y+=8) for (let x=(y/8%2?8:0);x<w;x+=16) g.fillRect(x, y, 8, 8);
      g.strokeStyle = 'rgba(120,130,140,0.4)'; g.strokeRect(0.5, 0.5, w-1, h-1);
    }),
    arcade: mk(TILE, TILE, (g, w, h) => {
      g.fillStyle = '#16121f'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(120,60,200,0.35)'; g.lineWidth = 1; g.strokeRect(1, 1, w-2, h-2);
      g.fillStyle = 'rgba(80,200,255,0.10)'; g.fillRect(0, 0, w, 3);
    }),
    // maceta (plantera de la peatonal: obstáculo bajo que saltás)
    maceta: mk(TILE, TILE, (g, w, h) => {
      g.fillStyle = '#a0522d'; g.fillRect(2, 9, w-4, h-9);
      g.fillStyle = '#8b4423'; g.fillRect(2, 9, w-4, 4);
      g.fillStyle = '#5a3a1a'; g.fillRect(5, 13, w-10, 5); // tierra
      g.fillStyle = '#2e7d32'; g.beginPath(); g.arc(w/2, 9, 7, 0, Math.PI*2); g.fill();
      g.fillStyle = '#43a047'; g.beginPath(); g.arc(w/2-6, 10, 4, 0, Math.PI*2); g.arc(w/2+6, 10, 4, 0, Math.PI*2); g.fill();
      g.fillStyle = '#ff7043'; g.fillRect(w/2-1, 5, 2, 2);
    }),
    // toldo de local (marquesina rayada sobre la vereda)
    toldo: mk(TILE, TILE, (g, w, h) => {
      for (let i = 0; i < w; i += 8) { g.fillStyle = (i/8 % 2) ? '#c62828' : '#fafafa'; g.fillRect(i, 0, 8, h-6); }
      g.fillStyle = '#7a1c1c'; g.fillRect(0, h-6, w, 6);
    }),
    // piso del cuarto secreto (madera oscura bordó)
    secret: mk(TILE, TILE, (g, w, h) => {
      g.fillStyle = '#2a1418'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#341a20'; for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 1);
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.strokeRect(0.5, 0.5, w-1, h-1);
    }),
  };

  // ---- Decoración (no colisiona) ----
  const decor = {
    arbol: mk(48, 78, (g, w, h) => {
      g.fillStyle = '#5a3a1a'; g.fillRect(w/2-4, h-28, 8, 28);
      g.fillStyle = '#2e7d32'; g.beginPath(); g.arc(w/2, h-42, 21, 0, Math.PI*2); g.fill();
      g.fillStyle = '#388e3c'; g.beginPath(); g.arc(w/2-13, h-36, 13, 0, Math.PI*2); g.arc(w/2+13, h-36, 13, 0, Math.PI*2); g.fill();
      g.fillStyle = '#43a047'; g.beginPath(); g.arc(w/2, h-54, 15, 0, Math.PI*2); g.fill();
    }),
    farol: mk(18, 84, (g, w, h) => {
      g.fillStyle = '#2b2b2b'; g.fillRect(w/2-2, 10, 4, h-10);
      g.fillStyle = '#1c1c1c'; g.fillRect(w/2-5, h-3, 10, 3);
      g.fillStyle = '#3a3a3a'; g.fillRect(w/2-5, 4, 10, 9);
      g.fillStyle = 'rgba(255,228,140,0.95)'; g.fillRect(w/2-3, 6, 6, 5);
    }),
    banco: mk(54, 32, (g, w, h) => {
      g.fillStyle = '#6d4c2f'; g.fillRect(2, 14, w-4, 5);
      g.fillStyle = '#5a3f26'; g.fillRect(2, 3, w-4, 4);
      g.fillStyle = '#333'; g.fillRect(7, 19, 4, 12); g.fillRect(w-11, 19, 4, 12);
    }),
    tacho: mk(22, 34, (g, w, h) => {
      g.fillStyle = '#37474f'; g.fillRect(3, 6, w-6, h-6);
      g.fillStyle = '#263238'; g.fillRect(2, 3, w-4, 5);
      g.fillStyle = '#1c2429'; for (let y = 11; y < h-2; y += 5) g.fillRect(5, y, w-10, 2);
    }),
    // --- subsuelos / cuevas ---
    caja: mk(30, 28, (g, w, h) => {
      g.fillStyle = '#7a5230'; g.fillRect(2, 4, w-4, h-4);
      g.strokeStyle = '#4a3018'; g.lineWidth = 2; g.strokeRect(3, 5, w-6, h-6);
      g.beginPath(); g.moveTo(3, 5); g.lineTo(w-3, h-1); g.moveTo(w-3, 5); g.lineTo(3, h-1); g.stroke();
    }),
    barril: mk(26, 38, (g, w, h) => {
      g.fillStyle = '#3a4a55'; g.fillRect(3, 4, w-6, h-4);
      g.fillStyle = '#2a3640'; g.fillRect(3, 9, w-6, 3); g.fillRect(3, h-9, w-6, 3);
      g.fillStyle = '#1c252b'; g.fillRect(3, 4, w-6, 3);
      g.fillStyle = '#cddc39'; g.font = 'bold 11px monospace'; g.textAlign = 'center'; g.fillText('☣', w/2, h/2+4);
    }),
    cartel: mk(44, 50, (g, w, h) => {
      g.fillStyle = '#3a3a3a'; g.fillRect(w/2-2, 24, 4, h-24);
      g.fillStyle = '#1a1410'; g.fillRect(3, 4, w-6, 22);
      g.fillStyle = '#ff3b3b'; g.font = 'bold 9px monospace'; g.textAlign = 'center';
      g.fillText('PROHIBIDO', w/2, 14); g.fillText('PASAR', w/2, 23);
    }),
    // --- oficinas (EducaciónIT) ---
    escritorio: mk(56, 44, (g, w, h) => {
      g.fillStyle = '#8a939c'; g.fillRect(2, h-16, w-4, 6);
      g.fillStyle = '#6a737c'; g.fillRect(7, h-10, 5, 10); g.fillRect(w-12, h-10, 5, 10);
      g.fillStyle = '#1c2733'; g.fillRect(w/2-13, h-36, 26, 19);
      g.fillStyle = '#34c3ff'; g.fillRect(w/2-10, h-33, 20, 13);
      g.fillStyle = '#11161c'; g.font = '8px monospace'; g.textAlign = 'center'; g.fillText('</>', w/2, h-23);
    }),
    planta: mk(26, 48, (g, w, h) => {
      g.fillStyle = '#6d4c2f'; g.fillRect(6, h-12, w-12, 12);
      g.fillStyle = '#2e7d32';
      for (let i = 0; i < 5; i++) { g.save(); g.translate(w/2, h-12); g.rotate((i-2)*0.5); g.fillRect(-2, -24, 4, 24); g.restore(); }
      g.fillStyle = '#388e3c'; g.beginPath(); g.arc(w/2, h-28, 9, 0, Math.PI*2); g.fill();
    }),
    dispenser: mk(22, 54, (g, w, h) => {
      g.fillStyle = '#e8eef2'; g.fillRect(4, 18, w-8, h-18);
      g.fillStyle = '#5bc0ff'; g.fillRect(6, 2, w-12, 18);
      g.globalAlpha = 0.6; g.fillStyle = '#bfe7ff'; g.fillRect(7, 4, w-14, 14); g.globalAlpha = 1;
      g.fillStyle = '#1565c0'; g.fillRect(w/2-3, 26, 6, 4);
    }),
    laptop: mk(30, 28, (g, w, h) => {
      g.fillStyle = '#3a3f47'; g.fillRect(6, h-7, w-12, 7);   // mesita
      g.fillStyle = '#2a2e34'; g.fillRect(4, h-21, w-8, 15);
      g.fillStyle = '#34c3ff'; g.fillRect(6, h-19, w-12, 11);
      g.fillStyle = '#11161c'; g.font = '7px monospace'; g.textAlign = 'center'; g.fillText('</>', w/2, h-11);
    }),
    bateria: mk(50, 42, (g, w, h) => {
      g.fillStyle = '#c62828'; g.beginPath(); g.ellipse(w/2, h-10, 17, 12, 0, 0, Math.PI*2); g.fill();
      g.fillStyle = '#ececec'; g.beginPath(); g.ellipse(w/2, h-18, 17, 5, 0, 0, Math.PI*2); g.fill();
      g.fillStyle = '#ffd54f'; g.beginPath(); g.ellipse(11, h-24, 9, 2.5, 0, 0, Math.PI*2); g.fill(); g.beginPath(); g.ellipse(w-11, h-26, 9, 2.5, 0, 0, Math.PI*2); g.fill();
      g.strokeStyle = '#888'; g.lineWidth = 1; g.beginPath(); g.moveTo(11, h-24); g.lineTo(11, h); g.moveTo(w-11, h-26); g.lineTo(w-11, h); g.stroke();
    }),
    ampli: mk(40, 58, (g, w, h) => {
      g.fillStyle = '#0e0e0e'; g.fillRect(4, h-46, w-8, 46);
      g.fillStyle = '#1a1a1a'; g.fillRect(4, h-46, w-8, 5);
      g.fillStyle = '#262626'; g.beginPath(); g.arc(w/2-8, h-28, 6, 0, Math.PI*2); g.arc(w/2+8, h-28, 6, 0, Math.PI*2); g.arc(w/2-8, h-12, 6, 0, Math.PI*2); g.arc(w/2+8, h-12, 6, 0, Math.PI*2); g.fill();
      g.fillStyle = '#ffd54f'; g.font = 'bold 6px monospace'; g.textAlign = 'center'; g.fillText('AMP', w/2, h-48);
      g.fillStyle = '#e53935'; g.fillRect(8, h-50, 2, 2);
    }),
    tv: mk(40, 38, (g, w, h) => {
      g.fillStyle = '#3a3f47'; g.fillRect(8, h-8, w-16, 8);           // base/mesa
      g.fillStyle = '#0a0a0a'; g.fillRect(2, 2, w-4, h-12);          // marco TV
      g.fillStyle = '#1565c0'; g.fillRect(4, 4, w-8, h-16);          // pantalla
      g.fillStyle = '#4fc3f7'; for (let i=0;i<3;i++) g.fillRect(6, 6+i*5, w-12, 2);
      g.fillStyle = '#ffd54f'; g.font = 'bold 7px monospace'; g.textAlign = 'center'; g.fillText('$$$', w/2, 14);
    }),
    cafe: mk(24, 54, (g, w, h) => {
      g.fillStyle = '#3e2723'; g.fillRect(3, 6, w-6, h-6);
      g.fillStyle = '#5d4037'; g.fillRect(3, 6, w-6, 4);
      g.fillStyle = '#ffd54f'; g.font = 'bold 7px monospace'; g.textAlign = 'center'; g.fillText('CAFÉ', w/2, 14);
      g.fillStyle = '#1b1110'; g.fillRect(6, 22, w-12, 8);
      g.fillStyle = '#d7ccc8'; g.fillRect(w/2-3, 30, 6, 6);
      g.fillStyle = '#8d6e63'; g.fillRect(w/2-3, 30, 6, 2);
    }),
    // kiosko de diarios y revistas (típico de Buenos Aires)
    kiosko: mk(88, 100, (g, w, h) => {
      g.fillStyle = '#2e5d50'; g.fillRect(6, h-58, w-12, 58);
      g.fillStyle = '#1f3f37'; g.fillRect(6, h-30, w-12, 9);
      g.fillStyle = '#b71c1c'; g.fillRect(0, h-68, w, 13);
      g.fillStyle = '#fff'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.fillText('DIARIOS Y REVISTAS', w/2, h-58);
      for (let i = 0; i < 5; i++) { g.fillStyle = ['#e53935','#fbc02d','#1565c0','#43a047','#fb8c00'][i]; g.fillRect(12+i*14, h-52, 11, 17); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(13+i*14, h-50, 9, 4); }
      g.fillStyle = '#eceae0'; g.fillRect(14, h-30, 22, 5); g.fillStyle = '#333'; g.fillRect(15, h-29, 20, 1);
    }),
    // parlante del músico
    parlante: mk(22, 36, (g, w, h) => {
      g.fillStyle = '#15151a'; g.fillRect(2, 2, w-4, h-2);
      g.fillStyle = '#333'; g.beginPath(); g.arc(w/2, 13, 6, 0, Math.PI*2); g.fill();
      g.fillStyle = '#555'; g.beginPath(); g.arc(w/2, 13, 3, 0, Math.PI*2); g.fill();
      g.fillStyle = '#333'; g.beginPath(); g.arc(w/2, h-9, 4, 0, Math.PI*2); g.fill();
      g.fillStyle = '#ffd54f'; g.font = '8px monospace'; g.textAlign = 'center'; g.fillText('♪', w/2, h-2);
    }),
    // equipo del músico (amplificador, conga, estuche)
    instrumentos: mk(48, 42, (g, w, h) => {
      g.fillStyle = '#1a1a1a'; g.fillRect(2, h-22, 20, 22);
      g.fillStyle = '#333'; g.beginPath(); g.arc(12, h-11, 6, 0, Math.PI*2); g.fill();
      g.fillStyle = '#222'; g.beginPath(); g.arc(12, h-11, 3, 0, Math.PI*2); g.fill();
      g.fillStyle = '#8d4a2a'; g.fillRect(26, h-26, 14, 26);
      g.fillStyle = '#e0c9a0'; g.beginPath(); g.ellipse(33, h-26, 7, 4, 0, 0, Math.PI*2); g.fill();
      g.fillStyle = '#222'; g.fillRect(0, h-5, w, 5);
    }),
    // mesita con tablero de ajedrez
    mesa_ajedrez: mk(48, 40, (g, w, h) => {
      g.fillStyle = '#5a3a22'; g.fillRect(8, h-14, w-16, 5);
      g.fillStyle = '#3f2817'; g.fillRect(11, h-9, 4, 9); g.fillRect(w-15, h-9, 4, 9);
      g.fillStyle = '#222'; g.fillRect(w/2-12, h-22, 24, 10);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) { g.fillStyle = ((r+c)%2) ? '#eee' : '#333'; g.fillRect(w/2-12+c*4, h-22+r*5, 4, 5); }
      g.fillStyle = '#fafafa'; g.fillRect(w/2-8, h-26, 2, 4); g.fillStyle = '#111'; g.fillRect(w/2+5, h-26, 2, 4);
    }),
    // edificio abandonado / clausurado
    edificio_abandonado: mk(112, 186, (g, w, h) => {
      g.fillStyle = '#3a3a38'; g.fillRect(4, 0, w-8, h);
      g.fillStyle = '#2a2a28'; g.fillRect(4, 0, w-8, 8); g.fillRect(4, 0, 6, h);
      for (let wy = 18; wy < h-40; wy += 30) for (let wx = 14; wx < w-16; wx += 28) {
        const r = ((wx*7 + wy*13) % 10);
        if (r < 5) { g.fillStyle = '#4a3a2a'; g.fillRect(wx, wy, 18, 20); g.strokeStyle = '#2a1f15'; g.lineWidth = 2; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx+18, wy+20); g.moveTo(wx+18, wy); g.lineTo(wx, wy+20); g.stroke(); }
        else { g.fillStyle = '#0e171c'; g.fillRect(wx, wy, 18, 20); g.fillStyle = '#22343c'; g.fillRect(wx+2, wy+2, 7, 8); }
      }
      g.fillStyle = 'rgba(200,40,40,0.55)'; g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.fillText('CLAUSURADO', w/2, h-18);
      g.fillStyle = '#2a1f15'; g.fillRect(w/2-13, h-34, 26, 34);
      g.strokeStyle = '#4a3826'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(w/2-13, h-30+i*10); g.lineTo(w/2+13, h-30+i*10); g.stroke(); }
    }),
    // supermercado chino
    super_chino: mk(112, 158, (g, w, h) => {
      g.fillStyle = '#b71c1c'; g.fillRect(4, 0, w-8, h);
      g.fillStyle = '#7a1010'; g.fillRect(4, 0, w-8, 6);
      g.fillStyle = '#ffd54f'; g.fillRect(8, 8, w-16, 22);
      g.fillStyle = '#b71c1c'; g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.fillText('SUPERMERCADO', w/2, 24);
      g.fillStyle = '#ffd54f'; g.font = 'bold 20px serif'; g.fillText('超市', w/2, h-66);
      g.fillStyle = '#0d1a12'; g.fillRect(10, 36, w-20, h-72);
      const cols = ['#e53935','#fbc02d','#43a047','#fb8c00','#8bc34a'];
      for (let i = 0; i < 8; i++) { g.fillStyle = cols[i%5]; g.fillRect(14 + (i%4)*24, 42 + Math.floor(i/4)*26, 20, 18); }
      g.fillStyle = '#e53935'; g.beginPath(); g.ellipse(w-16, 16, 6, 8, 0, 0, Math.PI*2); g.fill(); g.fillStyle = '#7a1010'; g.fillRect(w-17, 8, 2, 4);
      g.fillStyle = '#1a1a1a'; g.fillRect(w/2-12, h-34, 24, 34);
    }),
    // --- cuarto secreto ---
    mesaRedonda: mk(74, 42, (g, w, h) => {
      g.fillStyle = '#14281a'; g.beginPath(); g.ellipse(w/2, h-13, 32, 14, 0, 0, Math.PI*2); g.fill();
      g.fillStyle = '#1f3a24'; g.beginPath(); g.ellipse(w/2, h-15, 32, 14, 0, 0, Math.PI*2); g.fill();
      g.fillStyle = '#5a3a1a'; g.fillRect(w/2-3, h-6, 6, 6);
      g.fillStyle = '#eee'; for (let i = 0; i < 5; i++) g.fillRect(w/2-22 + i*10, h-19, 7, 9);
    }),
    mesaTruco: mk(62, 46, (g, w, h) => {
      g.fillStyle = '#5a3a22'; g.fillRect(8, h-16, w-16, 7);
      g.fillStyle = '#3f2817'; g.fillRect(12, h-9, 5, 9); g.fillRect(w-17, h-9, 5, 9);
      g.fillStyle = '#2f5a1f'; g.fillRect(w/2-4, h-34, 8, 18); // botella Quilmes
      g.fillStyle = '#1f3a14'; g.fillRect(w/2-2, h-40, 4, 6);
      g.fillStyle = '#fafafa'; g.fillRect(w/2-4, h-27, 8, 6);
      g.fillStyle = '#1b5e20'; g.fillRect(w/2-3, h-26, 6, 4);
      g.fillStyle = 'rgba(225,225,185,0.85)'; g.fillRect(w/2-17, h-23, 6, 8); g.fillRect(w/2+11, h-23, 6, 8); // dos vasos
    }),
    // --- parte turbia: bailarinas (silueta estilizada) sobre mesa / parlante ---
    bailarinaMesa: mk(40, 70, (g, w, h) => {
      g.fillStyle = '#3a2a1a'; g.fillRect(6, h-14, w-12, 6);            // mesa
      g.fillStyle = '#2a1d12'; g.fillRect(10, h-8, 4, 8); g.fillRect(w-14, h-8, 4, 8);
      const cx = w/2, ty = h-14;
      g.fillStyle = '#e0b088'; g.fillRect(cx-5, ty-22, 4, 22); g.fillRect(cx+1, ty-22, 4, 22); // piernas
      g.fillStyle = '#16121f'; g.fillRect(cx-6, ty-25, 12, 4);          // tanga
      g.fillStyle = '#e0b088'; g.fillRect(cx-6, ty-40, 12, 16);         // torso
      g.fillStyle = '#16121f'; g.fillRect(cx-6, ty-38, 12, 3);          // top
      g.strokeStyle = '#e0b088'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx-5, ty-38); g.lineTo(cx-10, ty-50); g.moveTo(cx+5, ty-38); g.lineTo(cx+10, ty-50); g.stroke();
      g.fillStyle = '#e0b088'; g.beginPath(); g.arc(cx, ty-46, 5, 0, Math.PI*2); g.fill();
      g.fillStyle = '#3a1a10'; g.beginPath(); g.arc(cx, ty-48, 5, Math.PI, 2*Math.PI); g.fill();
    }),
    bailarinaParlante: mk(34, 78, (g, w, h) => {
      g.fillStyle = '#15151a'; g.fillRect(4, h-30, w-8, 30);            // parlante
      g.fillStyle = '#333'; g.beginPath(); g.arc(w/2, h-20, 7, 0, Math.PI*2); g.fill();
      g.fillStyle = '#555'; g.beginPath(); g.arc(w/2, h-20, 3, 0, Math.PI*2); g.fill();
      const cx = w/2, ty = h-30;
      g.fillStyle = '#caa070'; g.fillRect(cx-5, ty-22, 4, 22); g.fillRect(cx+1, ty-22, 4, 22);
      g.fillStyle = '#2a1024'; g.fillRect(cx-6, ty-25, 12, 4);
      g.fillStyle = '#caa070'; g.fillRect(cx-6, ty-40, 12, 16);
      g.fillStyle = '#2a1024'; g.fillRect(cx-6, ty-38, 12, 3);
      g.strokeStyle = '#caa070'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx-5, ty-38); g.lineTo(cx-11, ty-44); g.moveTo(cx+5, ty-38); g.lineTo(cx+11, ty-50); g.stroke();
      g.fillStyle = '#caa070'; g.beginPath(); g.arc(cx, ty-46, 5, 0, Math.PI*2); g.fill();
      g.fillStyle = '#1a0e08'; g.beginPath(); g.arc(cx, ty-48, 5, Math.PI, 2*Math.PI); g.fill();
    }),
    // --- chorería ---
    parrilla: mk(50, 48, (g, w, h) => {
      g.fillStyle = '#2b2b2b'; g.fillRect(6, h-20, w-12, 8);
      g.fillStyle = '#1a1a1a'; g.fillRect(11, h-12, 4, 12); g.fillRect(w-15, h-12, 4, 12);
      g.fillStyle = '#ff6a00'; for (let i = 0; i < 5; i++) g.fillRect(10+i*7, h-19, 5, 4);
      g.fillStyle = '#7a3b1a'; for (let i = 0; i < 4; i++) g.fillRect(12+i*8, h-22, 6, 3);
      g.globalAlpha = 0.25; g.fillStyle = '#cfcfcf';
      g.beginPath(); g.arc(w/2, h-32, 8, 0, Math.PI*2); g.arc(w/2+6, h-40, 6, 0, Math.PI*2); g.fill(); g.globalAlpha = 1;
    }),
    // maniquí de moda (pisos de lujo)
    maniqui: mk(30, 64, (g, w, h) => {
      g.fillStyle = '#1a1d24'; g.fillRect(w/2-2, h-22, 4, 22); g.fillStyle = '#11141a'; g.beginPath(); g.ellipse(w/2, h-2, 9, 3, 0, 0, Math.PI*2); g.fill(); // pie/base
      g.fillStyle = '#e8e8ee'; g.beginPath(); g.moveTo(w/2-10, 22); g.lineTo(w/2+10, 22); g.lineTo(w/2+7, h-24); g.lineTo(w/2-7, h-24); g.closePath(); g.fill(); // torso
      const c = ['#c2185b','#1565c0','#00897b','#6a1b9a','#ff8f00'][(w+h)%5];
      g.fillStyle = c; g.fillRect(w/2-11, 24, 22, 16);                      // prenda de moda
      g.fillStyle = '#d4af37'; g.fillRect(w/2-11, 39, 22, 3);               // cinto dorado
      g.fillStyle = '#e8e8ee'; g.beginPath(); g.arc(w/2, 14, 7, 0, Math.PI*2); g.fill(); // cabeza lisa
    }),
    // escombros / pila de basura (pisos destruidos)
    escombros: mk(48, 30, (g, w, h) => {
      g.fillStyle = '#3a352e'; g.beginPath(); g.moveTo(2, h); g.lineTo(12, 10); g.lineTo(24, h); g.closePath(); g.fill();
      g.fillStyle = '#4a443a'; g.beginPath(); g.moveTo(18, h); g.lineTo(30, 6); g.lineTo(44, h); g.closePath(); g.fill();
      g.fillStyle = '#5a3a2a'; g.fillRect(6, h-8, 10, 8); g.fillStyle = '#2a2a30'; g.fillRect(28, h-10, 9, 10);
      g.fillStyle = '#777'; g.fillRect(20, h-6, 7, 6); g.strokeStyle = '#222'; g.lineWidth = 1; g.strokeRect(20, h-6, 7, 6);
    }),
    // ---- depto de LUJO (pisos impares del edificio abandonado) ----
    cocina: mk(72, 72, (g, w, h) => {
      g.fillStyle = '#37474f'; g.fillRect(2, h-30, w-4, 30);                                   // bajo mesada
      g.fillStyle = '#eceff1'; g.fillRect(0, h-34, w, 5);                                       // encimera
      g.fillStyle = '#455a64'; g.fillRect(6, h-26, 18, 22); g.fillRect(28, h-26, 18, 22); g.fillRect(50, h-26, 16, 22);
      g.fillStyle = '#cfd8dc'; g.fillRect(20, h-18, 2, 6); g.fillRect(42, h-18, 2, 6); g.fillRect(62, h-18, 2, 6); // manijas
      g.fillStyle = '#263238'; g.fillRect(8, h-39, 24, 6);                                      // anafe
      g.fillStyle = '#ff7043'; g.beginPath(); g.arc(15, h-36, 3, 0, Math.PI*2); g.arc(25, h-36, 3, 0, Math.PI*2); g.fill();
      g.fillStyle = '#546e7a'; g.fillRect(6, 6, 26, 22); g.fillRect(40, 6, 26, 22);             // alacenas
      g.fillStyle = '#37474f'; g.fillRect(8, 8, 22, 18); g.fillRect(42, 8, 22, 18);
      g.fillStyle = '#90a4ae'; g.fillRect(34, 0, 6, 18); g.beginPath(); g.moveTo(28, 18); g.lineTo(46, 18); g.lineTo(42, 30); g.lineTo(32, 30); g.closePath(); g.fill(); // campana
    }),
    bano: mk(60, 62, (g, w, h) => {
      g.fillStyle = '#cfd8dc'; g.fillRect(0, 6, w, h-6);
      g.strokeStyle = '#b0bec5'; g.lineWidth = 1;
      for (let x = 0; x < w; x += 12) { g.beginPath(); g.moveTo(x, 6); g.lineTo(x, h); g.stroke(); }
      for (let y = 6; y < h; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.fillStyle = '#fff'; g.fillRect(8, h-14, 16, 14); g.beginPath(); g.ellipse(16, h-16, 9, 5, 0, 0, Math.PI*2); g.fill(); // inodoro
      g.fillStyle = '#eee'; g.fillRect(8, h-30, 14, 14);                                        // mochila
      g.fillStyle = '#fff'; g.fillRect(34, h-12, 22, 12); g.fillStyle = '#b3e5fc'; g.fillRect(36, h-10, 18, 6); // bañera + agua
      g.fillStyle = '#b0bec5'; g.fillRect(44, h-20, 2, 8);                                      // canilla
      g.fillStyle = '#80d8ff'; g.fillRect(36, 10, 18, 14); g.globalAlpha = 0.5; g.fillStyle = '#fff'; g.fillRect(38, 12, 4, 10); g.globalAlpha = 1; // espejo
    }),
    sofa: mk(70, 42, (g, w, h) => {
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(w/2, h-3, 30, 4, 0, 0, Math.PI*2); g.fill();
      g.fillStyle = '#6a1b9a'; g.fillRect(4, 14, w-8, 18);
      g.fillStyle = '#7b1fa2'; g.fillRect(2, 8, 12, 24); g.fillRect(w-14, 8, 12, 24);
      g.fillStyle = '#8e24aa'; g.fillRect(14, 12, 18, 8); g.fillRect(36, 12, 18, 8);
      g.fillStyle = '#4a148c'; g.fillRect(8, h-8, 5, 8); g.fillRect(w-13, h-8, 5, 8);
    }),
    tvplasma: mk(64, 70, (g, w, h) => {
      g.fillStyle = '#263238'; g.fillRect(8, h-12, w-16, 12);                                   // rack
      g.fillStyle = '#111'; g.fillRect(w/2-3, h-22, 6, 10); g.fillRect(w/2-12, h-13, 24, 3);     // pie
      g.fillStyle = '#0a0a0a'; g.fillRect(2, 4, w-4, h-26);                                      // marco
      g.fillStyle = '#0d47a1'; g.fillRect(6, 8, w-12, h-34);                                     // pantalla (paisaje)
      g.fillStyle = '#26c6da'; g.fillRect(6, 8+(h-34)*0.55, w-12, (h-34)*0.45);
      g.fillStyle = '#fff59d'; g.beginPath(); g.arc(w-16, 18, 5, 0, Math.PI*2); g.fill();
      g.globalAlpha = 0.15; g.fillStyle = '#fff'; g.fillRect(8, 10, 6, h-38); g.globalAlpha = 1;
    }),
    joyas: mk(34, 48, (g, w, h) => {
      g.fillStyle = '#3e2723'; g.fillRect(8, h-20, 18, 20);
      g.fillStyle = '#5d4037'; g.fillRect(6, h-24, 22, 5);
      g.fillStyle = '#b71c1c'; g.fillRect(9, h-29, 16, 7);                                       // almohadón
      g.strokeStyle = '#ffd700'; g.lineWidth = 2; g.beginPath(); g.arc(17, h-26, 6, 0.1*Math.PI, 0.9*Math.PI); g.stroke(); // collar
      const gem = (x, y, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, y-4); g.lineTo(x+4, y); g.lineTo(x, y+4); g.lineTo(x-4, y); g.closePath(); g.fill(); };
      gem(12, h-34, '#e91e63'); gem(22, h-34, '#00e5ff'); gem(17, h-39, '#76ff03');
      g.fillStyle = '#fff'; g.fillRect(11, h-36, 1, 3); g.fillRect(21, h-36, 1, 3);              // destellos
    }),
    maletin: mk(46, 36, (g, w, h) => {
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(w/2, h-2, 20, 3, 0, 0, Math.PI*2); g.fill();
      g.fillStyle = '#3e2723'; g.fillRect(3, 2, w-6, 12); g.fillStyle = '#4e342e'; g.fillRect(5, 4, w-10, 8); // tapa
      g.fillStyle = '#2e1c16'; g.fillRect(2, 14, w-4, h-16);                                      // base
      for (let i = 0; i < 3; i++) { const x = 6 + i*12; g.fillStyle = '#2e7d32'; g.fillRect(x, 16, 10, 7); g.fillStyle = '#43a047'; g.fillRect(x, 23, 10, 7);
        g.fillStyle = '#a5d6a7'; g.fillRect(x+3, 18, 4, 3); g.fillRect(x+3, 25, 4, 3); }               // fajos de dólares
      g.fillStyle = '#fff'; g.globalAlpha = 0.9; g.fillRect(w-10, 5, 2, 2); g.fillRect(w-7, 8, 1, 1); g.globalAlpha = 1; // brillo
    }),
  };

  // ---------------- PERSONAJE ----------------
  function drawHero(g, p) {
    // 32x44, frente a la derecha. p:{phase, air, crouch}
    const cx = 16, feet = 43;
    const jacket = '#36567f', jdark = '#274064', pants = '#2b2f3a', skin = '#d9a878', hair = '#23190f', shoe = '#15171c';
    let l1, l2; // pies
    if (p.air) { l1 = cx - 4; l2 = cx + 6; }
    else { const s = Math.cos(p.phase * Math.PI * 2) * 6; l1 = cx - s; l2 = cx + s; }
    const hipY = p.air ? 27 : 29;
    // piernas
    line(g, cx, 26, l1, p.air ? 36 : 42, 6, pants); line(g, l1-2, p.air?36:42, l1+2, p.air?37:43, 5, shoe);
    line(g, cx, 26, l2, p.air ? 38 : 42, 6, pants); line(g, l2-2, p.air?38:42, l2+2, p.air?39:43, 5, shoe);
    // torso (campera)
    g.fillStyle = jacket; g.fillRect(9, 13, 14, 15);
    g.fillStyle = jdark; g.fillRect(9, 13, 14, 4);
    g.fillStyle = '#9fb8d6'; g.fillRect(15, 17, 2, 9); // cierre
    // brazo trasero (balanceo opuesto)
    const sw = p.air ? -3 : -Math.cos(p.phase * Math.PI * 2) * 4;
    line(g, 12, 17, 12 + sw, 27, 5, jdark);
    // cabeza
    g.fillStyle = skin; g.beginPath(); g.arc(cx+1, 8, 6, 0, Math.PI*2); g.fill();
    g.fillStyle = hair; g.beginPath(); g.arc(cx+1, 7, 6, Math.PI*1.05, Math.PI*2.1); g.fill();
    g.fillRect(cx+5, 4, 3, 4);
    g.fillStyle = '#1a1a1a'; g.fillRect(cx+4, 7, 2, 2); // ojo
  }
  function heroFrames() {
    const idle = [mk(32, 44, (g) => drawHero(g, { phase: 0, air: false }))];
    const run = [0, 0.25, 0.5, 0.75].map(ph => mk(32, 44, (g) => drawHero(g, { phase: ph, air: false })));
    const jump = [mk(32, 44, (g) => drawHero(g, { phase: 0, air: true }))];
    return { idle, run, jump };
  }

  // ---------------- ENEMIGOS ----------------
  function drawPeaton(g, ph) {
    const cx = 16, skin = '#9c7a64', shirt = '#5a2533', pants = '#1c1c1c';
    const s = Math.cos(ph * Math.PI) * 5;
    line(g, cx, 27, cx - s, 43, 6, pants);
    line(g, cx, 27, cx + s, 43, 6, pants);
    g.fillStyle = shirt; g.fillRect(9, 14, 14, 15);
    // brazos hacia adelante (zombie)
    line(g, 20, 18, 28, 20, 5, skin);
    line(g, 20, 20, 28, 23, 5, skin);
    g.fillStyle = skin; g.beginPath(); g.arc(cx+1, 9, 6, 0, Math.PI*2); g.fill();
    g.fillStyle = '#0e0e0e'; g.beginPath(); g.arc(cx, 7, 6, Math.PI, Math.PI*2); g.fill();
    g.fillStyle = '#ff3030'; g.fillRect(cx+3, 8, 3, 2); // ojo rojo
  }
  function drawDron(g, rotor) {
    const cx = 16, cy = 13;
    g.fillStyle = '#3a444c'; g.beginPath(); g.ellipse(cx, cy, 11, 7, 0, 0, Math.PI*2); g.fill();
    g.fillStyle = '#222a30'; g.fillRect(cx-13, cy-1, 26, 3);
    g.fillStyle = rotor ? 'rgba(180,200,220,0.5)' : 'rgba(180,200,220,0.25)';
    g.fillRect(cx-16, cy-3, 7, 2); g.fillRect(cx+9, cy-3, 7, 2);
    g.fillStyle = '#ff2a2a'; g.beginPath(); g.arc(cx, cy, 3.5, 0, Math.PI*2); g.fill();
    g.fillStyle = 'rgba(255,80,80,0.4)'; g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI*2); g.fill();
  }
  function drawCuevero(g) {
    const cx = 16, skin = '#d9a878', suit = '#1d1d1d';
    line(g, cx, 27, cx-4, 43, 7, '#101010');
    line(g, cx, 27, cx+4, 43, 7, '#101010');
    g.fillStyle = suit; g.fillRect(8, 13, 16, 16);
    g.fillStyle = '#3aa655'; g.fillRect(24, 22, 7, 9); // fajo de plata
    g.fillStyle = skin; g.beginPath(); g.arc(cx+1, 8, 6, 0, Math.PI*2); g.fill();
    g.fillStyle = '#100d08'; g.beginPath(); g.arc(cx+1, 7, 6, Math.PI, Math.PI*2); g.fill();
    g.fillStyle = '#000'; g.fillRect(cx-3, 7, 9, 3); // lentes
  }
  // peatón "normal" (decoración) que camina; tras la tormenta se vuelve el glitcheado
  function drawWalker(g, ph, o) {
    const cx = 16, sw = ph ? 5 : -5;
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(cx, 42, 9, 3, 0, 0, Math.PI*2); g.fill();
    line(g, cx, 27, cx-sw, 42, 6, o.pants); line(g, cx, 27, cx+sw, 42, 6, o.pants);
    g.fillStyle = '#15171c'; g.fillRect(cx-sw-3, 41, 6, 3); g.fillRect(cx+sw-3, 41, 6, 3);
    g.fillStyle = o.shirt; g.fillRect(9, 14, 14, 15);
    line(g, 12, 17, 10, 27, 5, o.shirt); line(g, 20, 17, 22, 27, 5, o.shirt);
    g.fillStyle = o.skin; g.beginPath(); g.arc(cx, 9, 6, 0, Math.PI*2); g.fill();
    g.fillStyle = o.hair; g.beginPath(); g.arc(cx, 7.5, 6, Math.PI, 2*Math.PI); g.fill();
    g.fillStyle = '#111'; g.fillRect(cx-3, 8, 2, 2); g.fillRect(cx+1, 8, 2, 2);
    if (o.prop) o.prop(g);
  }
  const walkerFrames = (o) => [0, 1].map(ph => mk(32, 44, (g) => drawWalker(g, ph, o)));

  const enemyArt = {
    peaton: { feet: 44, frames: [0, 1].map(i => mk(32, 44, (g) => drawPeaton(g, i))) },
    peatonN:  { feet: 44, frames: walkerFrames({ skin:'#d8a070', hair:'#3a2a1a', shirt:'#3949ab', pants:'#37474f' }) },
    peatonN2: { feet: 44, frames: walkerFrames({ skin:'#b07a52', hair:'#222', shirt:'#00897b', pants:'#263238' }) },
    turistaW: { feet: 44, frames: walkerFrames({ skin:'#e6c098', hair:'#caa45a', shirt:'#ef6c00', pants:'#2a3a4a',
      prop:(g)=>{ g.fillStyle='#222'; g.fillRect(11,17,10,6); g.fillStyle='#4fc3f7'; g.fillRect(13,18,4,4); } }) },
    shopperW: { feet: 44, frames: walkerFrames({ skin:'#caa070', hair:'#3a2a1a', shirt:'#8e24aa', pants:'#222',
      prop:(g)=>{ g.fillStyle='#d84315'; g.fillRect(2,25,6,10); g.fillStyle='#bf360c'; g.fillRect(2,25,6,2); } }) },
    dron:   { feet: 26, frames: [false, true].map(r => mk(32, 28, (g) => drawDron(g, r))) },
    cuevero:{ feet: 44, frames: [mk(32, 44, drawCuevero)] },
    pacman: { feet: 26, frames: [0.28, 0.04].map(m => mk(26, 26, (g, w, h) => {
      const cx = w/2, cy = h/2, r = 12;
      g.fillStyle = '#ffe21a';
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, m*Math.PI, (2-m)*Math.PI); g.closePath(); g.fill();
      g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(cx+1, cy-5, 2, 0, Math.PI*2); g.fill();
    })) },
    galaga: { feet: 22, frames: [0, 1].map(f => mk(34, 24, (g, w, h) => {
      const cx = w/2;
      g.fillStyle = f ? '#e53935' : '#d81b60'; g.fillRect(cx-10, 8, 20, 9);
      g.fillStyle = '#ffd54f'; g.fillRect(cx-13, 6, 4, 11); g.fillRect(cx+9, 6, 4, 11);
      g.fillStyle = '#fff'; g.fillRect(cx-3, 6, 6, 4);
      g.fillStyle = '#4fc3f7'; g.fillRect(cx-2, 2, 4, 4);
    })) },
  };

  // ---- NPCs amistosos (EducaciónIT) ----
  function drawPerson(g, w, h, o) {
    const cx = w/2;
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(cx, h-3, 10, 4, 0, 0, Math.PI*2); g.fill();
    g.fillStyle = o.pants; g.fillRect(cx-7, h*0.62, 6, h*0.32); g.fillRect(cx+1, h*0.62, 6, h*0.32);
    g.fillStyle = '#15171c'; g.fillRect(cx-8, h-5, 7, 3); g.fillRect(cx+1, h-5, 7, 3);
    g.fillStyle = o.shirt; g.fillRect(cx-9, h*0.34, 18, h*0.30);
    g.fillRect(cx-12, h*0.36, 4, h*0.22); g.fillRect(cx+8, h*0.36, 4, h*0.22);
    g.fillStyle = o.skin; g.beginPath(); g.arc(cx, h*0.22, 6, 0, Math.PI*2); g.fill();
    g.fillStyle = o.hair; g.beginPath(); g.arc(cx, h*0.205, 6, Math.PI, 2*Math.PI); g.fill();
    if (o.eyes) { g.fillStyle = o.eyes; g.fillRect(cx-3, h*0.215, 2, 2); g.fillRect(cx+1, h*0.215, 2, 2); }
  }
  const person = (o) => mk(32, 44, (g) => drawPerson(g, 32, 44, o));
  const npc = {
    maxi:   person({ skin:'#d8a070', hair:'#2b1d12', shirt:'#6a3ad0', pants:'#222a33', eyes:'#111' }),
    guido:  person({ skin:'#c8986a', hair:'#1a1a1a', shirt:'#1565c0', pants:'#222a33', eyes:'#111' }),
    seba1:  person({ skin:'#d8a070', hair:'#3a2a1a', shirt:'#20242a', pants:'#111', eyes:'#111' }),
    seba2:  person({ skin:'#caa070', hair:'#666', shirt:'#37474f', pants:'#111', eyes:'#111' }),
    marcos: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#d8a070', hair:'#2a1d12', shirt:'#2e7d32', pants:'#222a33', eyes:'#111' });
      g.fillStyle = '#6d4c2f'; g.beginPath(); g.arc(26, 27, 4, 0, Math.PI*2); g.fill(); // mate
      g.fillStyle = '#cfcfcf'; g.fillRect(26, 18, 1.5, 10); // bombilla
    }),
    chori: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#caa070', hair:'#1a1a1a', shirt:'#b71c1c', pants:'#222a33', eyes:'#111' });
      g.fillStyle = '#e8b96a'; g.fillRect(22, 23, 12, 6); // pan
      g.fillStyle = '#7a3b1a'; g.fillRect(24, 25, 9, 3);  // chorizo
    }),
    gamer1: person({ skin:'#d8a070', hair:'#222', shirt:'#00897b', pants:'#222a33', eyes:'#111' }),
    gamer2: person({ skin:'#b07a52', hair:'#3a2a1a', shirt:'#5e35b1', pants:'#222a33', eyes:'#111' }),
    erotica: person({ skin:'#d8a070', hair:'#7a1f4a', shirt:'#ff2e88', pants:'#111', eyes:'#111' }),
    comida: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#caa070', hair:'#222', shirt:'#8d6e63', pants:'#333', eyes:'#111' });
      g.fillStyle = '#d7c9a0'; g.fillRect(8, 30, 16, 4); // delantal sucio
    }),
    masajes: person({ skin:'#d8a070', hair:'#222', shirt:'#26a69a', pants:'#dddddd', eyes:'#111' }),
    tenebroso: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#8a8f99', hair:'#000', shirt:'#1a1020', pants:'#0a0a12', eyes:'#ff3030' });
      g.fillStyle = '#140a1c'; g.beginPath(); g.arc(16, 9, 7, Math.PI, 2*Math.PI); g.fill(); // capucha
    }),
    cuevero: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#caa070', hair:'#15110d', shirt:'#1d1d1d', pants:'#101010' });
      g.fillStyle = '#000'; g.fillRect(13, 9, 9, 3); // lentes
      g.fillStyle = '#3aa655'; g.fillRect(22, 24, 7, 9); // fajo de plata
    }),
    choriVendor: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#caa070', hair:'#222', shirt:'#fafafa', pants:'#b71c1c', eyes:'#111' });
      g.fillStyle = '#8d5a2b'; g.fillRect(8, 30, 16, 5); // delantal de parrillero
    }),
    misterioso: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#bda078', hair:'#0a0a0a', shirt:'#20242c', pants:'#14161c', eyes:'#111' });
      g.fillStyle = '#0c0c0c'; g.fillRect(7, 3, 18, 3); g.fillRect(10, 0, 12, 5); // galera
    }),
    tahur: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#caa070', hair:'#1a1a1a', shirt:'#3a1d1d', pants:'#14161c', eyes:'#111' });
      g.fillStyle = '#0a0a0a'; g.fillRect(13, 9, 9, 3); // lentes
      g.fillStyle = '#fff'; g.fillRect(21, 24, 5, 8); g.fillStyle = '#c00'; g.fillRect(22, 25, 3, 2); // carta en mano
    }),
    naipero: person({ skin:'#b89068', hair:'#222', shirt:'#2c3038', pants:'#14161c', eyes:'#111' }),
    yonqui: mk(36, 44, (g) => {
      // tirado contra la pared, hecho mierda
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(18, 42, 16, 4, 0, 0, Math.PI*2); g.fill();
      g.fillStyle = '#3b4a2e'; g.beginPath(); g.moveTo(4, 42); g.lineTo(30, 36); g.lineTo(31, 43); g.lineTo(4, 43); g.closePath(); g.fill(); // cuerpo tirado
      g.fillStyle = '#2c3522'; g.fillRect(24, 37, 8, 6);                    // torso
      g.fillStyle = '#b89a78'; g.beginPath(); g.arc(6, 39, 5, 0, Math.PI*2); g.fill(); // cabeza caída
      g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(6, 36, 5, Math.PI, 2*Math.PI); g.fill(); // pelo
      g.strokeStyle = '#6b5a3a'; g.lineWidth = 1; g.beginPath(); g.moveTo(2, 41); g.lineTo(10, 39); g.stroke(); // brazo colgando
      g.fillStyle = 'rgba(180,180,200,0.4)'; g.fillRect(30, 30, 2, 6);      // ZzZ humo/vaho
    }),
    linyera: mk(40, 46, (g, w, h) => {
      // el solcito que le tapás
      g.fillStyle = 'rgba(255,213,79,0.35)'; g.beginPath(); g.arc(w-7, 10, 9, 0, Math.PI*2); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(w/2-2, h-3, 12, 4, 0, 0, Math.PI*2); g.fill();
      g.fillStyle = '#4e342e'; g.fillRect(w/2-8, h-18, 6, 18); g.fillRect(w/2, h-18, 6, 18);   // piernas
      g.fillStyle = '#2e1c16'; g.fillRect(w/2-9, h-4, 8, 4); g.fillRect(w/2, h-4, 8, 4);        // zapatos rotos
      g.fillStyle = '#6d4c41'; g.fillRect(w/2-11, h-30, 22, 16);                                // abrigo gastado
      g.fillStyle = '#5d4037'; g.fillRect(w/2-11, h-30, 22, 4);
      g.fillStyle = '#8d6e63'; g.fillRect(w/2-6, h-22, 6, 6);                                   // remiendo
      g.strokeStyle = '#b5895f'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(w/2+8, h-28); g.lineTo(w/2+15, h-36); g.stroke(); // brazo: "pará, pibe"
      g.fillStyle = '#caa478'; g.beginPath(); g.arc(w/2-2, h-36, 6, 0, Math.PI*2); g.fill();    // cabeza
      g.fillStyle = '#3a2a1a'; g.beginPath(); g.arc(w/2-2, h-39, 6, Math.PI, 2*Math.PI); g.fill(); // pelo desgreñado
      g.fillStyle = '#d8d8d8'; g.fillRect(w/2-7, h-34, 10, 5);                                  // barba canosa
      g.fillStyle = '#111'; g.fillRect(w/2-4, h-37, 2, 2); g.fillRect(w/2, h-37, 2, 2);          // ojos
    }),
    turista: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#e6c098', hair:'#caa45a', shirt:'#ef6c00', pants:'#2a3a4a', eyes:'#111' });
      g.fillStyle = '#222'; g.fillRect(11, 22, 10, 6); // cámara
      g.fillStyle = '#7fd0ff'; g.fillRect(13, 23, 4, 3); // lente
      g.strokeStyle = '#111'; g.lineWidth = 1; g.beginPath(); g.moveTo(11, 22); g.lineTo(8, 16); g.stroke(); // correa
    }),
    civil1: person({ skin:'#e0b088', hair:'#7a4a22', shirt:'#d84315', pants:'#37474f', eyes:'#111' }),
    civil2: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#a06a44', hair:'#111', shirt:'#fbc02d', pants:'#1a1a1a', eyes:'#111' });
      g.fillStyle = '#1565c0'; g.fillRect(10, 2, 12, 4); g.fillRect(20, 3, 4, 3); // gorra
    }),
    civil3: person({ skin:'#caa070', hair:'#555', shirt:'#455a64', pants:'#263238', eyes:'#111' }),
    civil4: person({ skin:'#8d5a3a', hair:'#1a1a1a', shirt:'#2e7d32', pants:'#3e2723', eyes:'#111' }),
    gordo: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#d8a070', hair:'#222', shirt:'#5d4037', pants:'#333', eyes:'#111' });
      g.fillStyle = '#5d4037'; g.beginPath(); g.ellipse(16, 24, 12, 9, 0, 0, Math.PI*2); g.fill();
      g.fillStyle = '#d8a070'; g.beginPath(); g.arc(16, 10, 6, 0, Math.PI*2); g.fill();
      g.fillStyle = '#222'; g.beginPath(); g.arc(16, 8, 6, Math.PI, 2*Math.PI); g.fill();
    }),
    mujer: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#e6c098', hair:'#6a3b1a', shirt:'#c2185b', pants:'#c2185b', eyes:'#111' });
      g.fillStyle = '#c2185b'; g.beginPath(); g.moveTo(8, 26); g.lineTo(24, 26); g.lineTo(27, 43); g.lineTo(5, 43); g.closePath(); g.fill();
      g.fillStyle = '#6a3b1a'; g.fillRect(9, 9, 14, 9);
    }),
    viejo: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#d8b89a', hair:'#bbb', shirt:'#607d8b', pants:'#455a64', eyes:'#111' });
      g.strokeStyle = '#5a3a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(26, 18); g.lineTo(26, 43); g.stroke();
      g.fillStyle = '#dddddd'; g.fillRect(11, 10, 10, 5);
    }),
    nino: mk(32, 44, (g) => {
      const cx = 16;
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(cx, 42, 7, 3, 0, 0, Math.PI*2); g.fill();
      g.fillStyle = '#37474f'; g.fillRect(cx-5, 30, 4, 12); g.fillRect(cx+1, 30, 4, 12);
      g.fillStyle = '#fbc02d'; g.fillRect(cx-7, 20, 14, 12);
      g.fillStyle = '#d8a070'; g.beginPath(); g.arc(cx, 15, 6, 0, Math.PI*2); g.fill();
      g.fillStyle = '#3a2a1a'; g.beginPath(); g.arc(cx, 13, 6, Math.PI, 2*Math.PI); g.fill();
    }),
    conNino: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#caa070', hair:'#222', shirt:'#3949ab', pants:'#333', eyes:'#111' });
      g.fillStyle = '#37474f'; g.fillRect(25, 34, 3, 8); g.fillStyle = '#e53935'; g.fillRect(22, 26, 8, 9);
      g.fillStyle = '#d8a070'; g.beginPath(); g.arc(26, 22, 4, 0, Math.PI*2); g.fill();
    }),
    recepcionista: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#e6c098', hair:'#3a2418', shirt:'#0d47a1', pants:'#263238', eyes:'#111' });
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 2; g.beginPath(); g.arc(16, 8, 7, Math.PI*1.05, Math.PI*1.95); g.stroke();
      g.fillStyle = '#1a1a1a'; g.fillRect(9, 12, 2, 3); // micrófono de vincha
    }),
    vendedor: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#e0b088', hair:'#1a1a1a', shirt:'#0d47a1', pants:'#20242a', eyes:'#111' });
      g.fillStyle = '#fafafa'; g.fillRect(13, 14, 6, 13);   // camisa
      g.fillStyle = '#b71c1c'; g.fillRect(15, 14, 2, 11);   // corbata
      g.fillStyle = '#ffd54f'; g.fillRect(10, 16, 3, 4);    // credencial
    }),
    iorio: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#d8a878', hair:'#9a9a9a', shirt:'#0a0a0a', pants:'#141414', eyes:'#111' });
      g.fillStyle = '#bdbdbd'; g.fillRect(11, 12, 10, 7);   // barba canosa
      g.fillStyle = '#0a0a0a'; g.beginPath(); g.arc(16, 7, 6, Math.PI*1.1, Math.PI*1.9); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 6px monospace'; g.textAlign = 'center'; g.fillText('M', 16, 24); // remera metal
    }),
    guitarrista: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#caa070', hair:'#2a1a10', shirt:'#5d1a1a', pants:'#1a1a1a', eyes:'#111' });
      g.fillStyle = '#3a2410'; g.fillRect(6, 24, 15, 7); g.fillStyle = '#1a0e08'; g.beginPath(); g.arc(10, 27, 4, 0, Math.PI*2); g.fill();
    }),
    bajista: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#b07a52', hair:'#111', shirt:'#1a1a3a', pants:'#1a1a1a', eyes:'#111' });
      g.fillStyle = '#2a2a2a'; g.fillRect(5, 24, 18, 6); g.fillStyle = '#111'; g.beginPath(); g.arc(9, 27, 4, 0, Math.PI*2); g.fill();
    }),
    baterista: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#caa070', hair:'#1a1a1a', shirt:'#2a2a2a', pants:'#1a1a1a', eyes:'#111' });
      g.strokeStyle = '#caa988'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(20, 18); g.lineTo(28, 11); g.moveTo(22, 20); g.lineTo(30, 14); g.stroke();
    }),
    musico: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#b07a4a', hair:'#111', shirt:'#7b1fa2', pants:'#1a1a1a', eyes:'#111' });
      g.fillStyle = '#5a3a1a'; g.fillRect(5, 24, 15, 7);          // cuerpo de la guitarra
      g.fillStyle = '#2a1a0c'; g.beginPath(); g.arc(10, 27, 4, 0, Math.PI*2); g.fill();
      g.strokeStyle = '#cfc4a0'; g.lineWidth = 1; g.beginPath(); g.moveTo(18, 18); g.lineTo(22, 28); g.stroke();
      g.fillStyle = '#ffd54f'; g.font = 'bold 10px monospace'; g.textAlign = 'center'; g.fillText('♪', 26, 12);
    }),
    diariero: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#caa070', hair:'#999', shirt:'#5d4037', pants:'#37474f', eyes:'#111' });
      g.fillStyle = '#f0ede0'; g.fillRect(19, 21, 12, 10);        // diario en la mano
      g.fillStyle = '#333'; for (let i = 0; i < 3; i++) g.fillRect(20, 23+i*2, 10, 1);
    }),
    borracho_vino: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#c98b6a', hair:'#3a2a1a', shirt:'#5a3a4a', pants:'#2a2a2a', eyes:'#111' });
      g.fillStyle = '#b71c1c'; g.beginPath(); g.arc(16, 13, 2, 0, Math.PI*2); g.fill();
      g.fillStyle = '#4a0d1a'; g.fillRect(22, 20, 5, 14); g.fillStyle = '#2a0810'; g.fillRect(23, 16, 3, 5); // botella de vino
    }),
    borracho_birra: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#c98b6a', hair:'#222', shirt:'#3a4a2a', pants:'#2a2a2a', eyes:'#111' });
      g.fillStyle = '#b71c1c'; g.beginPath(); g.arc(16, 13, 2, 0, Math.PI*2); g.fill();
      g.fillStyle = '#d4a017'; g.fillRect(22, 22, 6, 12); g.fillStyle = '#fafafa'; g.fillRect(22, 26, 6, 3); g.fillStyle = '#b71c1c'; g.fillRect(24, 22, 2, 12); // lata de birra
    }),
    borracho_porro: mk(32, 44, (g) => {
      drawPerson(g, 32, 44, { skin:'#c98b6a', hair:'#1a1a1a', shirt:'#37474f', pants:'#2a2a2a', eyes:'#111' });
      g.fillStyle = '#eee'; g.fillRect(20, 12, 6, 1.6); g.fillStyle = '#ff7043'; g.fillRect(26, 11.6, 2, 2.2); // porro
      g.globalAlpha = 0.4; g.fillStyle = '#cfcfcf'; g.beginPath(); g.arc(29, 9, 3, 0, Math.PI*2); g.arc(31, 6, 2, 0, Math.PI*2); g.fill(); g.globalAlpha = 1; // humo
    }),
  };

  // ---- Máquinas de arcade ----
  function cabinet(title, col, screen) {
    return mk(40, 70, (g, w, h) => {
      g.fillStyle = '#15171c'; g.fillRect(2, 4, w-4, h-4);
      g.fillStyle = col; g.fillRect(4, 4, w-8, 8);
      g.fillStyle = '#fff'; g.font = 'bold 7px monospace'; g.textAlign = 'center'; g.fillText(title, w/2, 11);
      g.fillStyle = '#05060a'; g.fillRect(6, 16, w-12, 26);
      screen(g, 6, 16, w-12, 26);
      g.fillStyle = '#23262b'; g.fillRect(7, 46, w-14, 12);
      g.fillStyle = '#ff5252'; g.beginPath(); g.arc(14, 52, 2.5, 0, Math.PI*2); g.fill();
      g.fillStyle = '#ffd54f'; g.beginPath(); g.arc(w-14, 52, 2.5, 0, Math.PI*2); g.fill();
    });
  }
  const machines = {
    pacman: cabinet('PAC-MAN', '#1d4ed8', (g, x, y, w, h) => {
      g.fillStyle = '#ffe21a'; g.beginPath(); g.moveTo(x+w/2, y+h/2); g.arc(x+w/2, y+h/2, 7, 0.25*Math.PI, 1.75*Math.PI); g.closePath(); g.fill();
      g.fillStyle = '#fff'; for (let i=0;i<3;i++) g.fillRect(x+4+i*4, y+h/2-1, 2, 2);
    }),
    galaga: cabinet('GALAGA', '#b91c1c', (g, x, y, w, h) => {
      g.fillStyle = '#4fc3f7'; g.fillRect(x+w/2-3, y+h-7, 6, 5);
      g.fillStyle = '#ff5252'; g.fillRect(x+5, y+4, 4, 4); g.fillRect(x+w-9, y+4, 4, 4);
      g.fillStyle = '#ffd54f'; g.fillRect(x+w/2-1, y+h-12, 2, 4);
    }),
    fighter: cabinet('ST.FIGHTER', '#7b1fa2', (g, x, y, w, h) => {
      g.fillStyle = '#fff'; g.fillRect(x+2, y+2, (w-4)*0.5, 2); g.fillRect(x+w-2-(w-4)*0.5, y+5, (w-4)*0.5, 2);
      g.fillStyle = '#5b8cff'; g.fillRect(x+6, y+12, 4, 11);
      g.fillStyle = '#ff5252'; g.fillRect(x+w-10, y+12, 4, 11);
      g.fillStyle = '#ffd54f'; g.fillRect(x+10, y+16, 6, 2); // golpe
    }),
    tron: cabinet('NEO-TRON', '#0288d1', (g, x, y, w, h) => {
      g.strokeStyle = '#34c3ff'; g.lineWidth = 1; g.strokeRect(x+4, y+4, w-8, h-8);
      g.beginPath(); g.moveTo(x+4, y+h/2); g.lineTo(x+w-4, y+h/2); g.stroke();
    }),
    frogger: cabinet('FROGGER', '#1b7d3a', (g, x, y, w, h) => {
      g.fillStyle = '#2a2a30'; for (let i = 0; i < 3; i++) g.fillRect(x+3, y+6+i*7, w-6, 4);
      g.fillStyle = '#7CFC00'; g.beginPath(); g.arc(x+w/2, y+h-6, 5, 0, Math.PI*2); g.fill();
    }),
    trucotron: cabinet('TRUCOTRON', '#6a1b9a', (g, x, y, w, h) => {
      g.fillStyle = '#f4f0e0'; g.fillRect(x+5, y+8, 8, 12); g.fillRect(x+w-13, y+9, 8, 12);
      g.fillStyle = '#a01020'; g.font = 'bold 9px monospace'; g.textAlign = 'center';
      g.fillText('1', x+9, y+18); g.fillText('7', x+w-9, y+19);
    }),
  };

  // ---------------- ITEMS ----------------
  const items = {
    ammo: mk(22, 18, (g, w, h) => {
      g.fillStyle = '#0a0f0a'; g.fillRect(1, 3, w-2, h-5);
      g.fillStyle = '#1b6b1b'; g.fillRect(2, 4, w-4, h-7);
      g.fillStyle = '#7CFC00'; g.font = 'bold 10px monospace'; g.textAlign = 'center'; g.fillText('U$D', w/2, h-5);
    }),
    health: mk(20, 20, (g, w, h) => {
      g.fillStyle = '#f4f4f4'; g.fillRect(2, 2, w-4, h-4);
      g.fillStyle = '#d32f2f'; g.fillRect(w/2-2, 5, 4, h-10); g.fillRect(5, h/2-2, w-10, 4);
    }),
    coin: mk(18, 18, (g, w, h) => {
      g.fillStyle = '#b8860b'; g.beginPath(); g.arc(w/2, h/2, 8, 0, Math.PI*2); g.fill();
      g.fillStyle = '#ffd54f'; g.beginPath(); g.arc(w/2, h/2, 6.5, 0, Math.PI*2); g.fill();
      g.fillStyle = '#b8860b'; g.font = 'bold 10px monospace'; g.textAlign = 'center'; g.fillText('$', w/2, h/2+4);
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(w/2-4, h/2-5, 2, 4);
    }),
    door: mk(36, 56, (g, w, h) => {
      g.fillStyle = '#3a322a'; g.fillRect(0, 4, w, h-4);
      g.fillStyle = '#07070a'; g.fillRect(5, 10, w-10, h-10);
      g.fillStyle = '#11161c'; g.fillRect(2, 0, w-4, 12);
      g.fillStyle = '#FFD54F'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.fillText('GALERÍA', w/2, 9);
      g.fillStyle = '#7CFC00'; g.font = 'bold 11px monospace'; g.fillText('$ ▼', w/2, h*0.6);
    }),
    doorUp: mk(36, 56, (g, w, h) => {
      g.fillStyle = '#2a2620'; g.fillRect(0, 4, w, h-4);
      g.fillStyle = '#161a20'; g.fillRect(5, 10, w-10, h-10);
      for (let i=0;i<5;i++){ g.fillStyle=`rgba(${120+i*20},${120+i*20},${140+i*20},1)`; g.fillRect(7, h-8-i*8, w-14, 4); }
      g.fillStyle = '#cfe8ff'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.fillText('▲ SUBIR', w/2, 9);
    }),
    // entrada de local (vidriera con marco)
    shop: mk(40, 62, (g, w, h) => {
      g.fillStyle = '#7a6a52'; g.fillRect(0, 6, w, h-6);
      g.fillStyle = '#1a2c38'; g.fillRect(4, 14, w-8, h-14);
      const gr = g.createLinearGradient(4, 14, w-4, h);
      gr.addColorStop(0, 'rgba(150,210,235,0.5)'); gr.addColorStop(1, 'rgba(40,80,110,0.2)');
      g.fillStyle = gr; g.fillRect(4, 14, w-8, h-14);
      g.fillStyle = '#0d0d0f'; g.fillRect(w/2-5, h-26, 10, 26); // puerta
      g.fillStyle = '#b71c1c'; g.fillRect(2, 0, w-4, 12);
      g.fillStyle = '#ffd54f'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.fillText('LOCAL', w/2, 9);
    }),
    // entrada de cine (marquesina)
    cine: mk(44, 64, (g, w, h) => {
      g.fillStyle = '#3a2030'; g.fillRect(0, 14, w, h-14);
      g.fillStyle = '#0c0a10'; g.fillRect(6, 24, w-12, h-24);
      g.fillStyle = '#1a1430'; g.fillRect(w/2-7, h-30, 14, 30);
      // marquesina con luces
      g.fillStyle = '#d4a017'; g.fillRect(0, 4, w, 16);
      for (let x=4;x<w;x+=8){ g.fillStyle = (x/8%2)?'#fff6b0':'#ff5a3c'; g.beginPath(); g.arc(x, 6, 2, 0, Math.PI*2); g.fill(); }
      g.fillStyle = '#fff'; g.font = 'bold 10px monospace'; g.textAlign = 'center'; g.fillText('CINE', w/2, 17);
    }),
    // salida de un local
    exit: mk(34, 56, (g, w, h) => {
      g.fillStyle = '#2c2c2c'; g.fillRect(0, 4, w, h-4);
      g.fillStyle = '#0a0a0a'; g.fillRect(5, 12, w-10, h-12);
      g.fillStyle = '#1b9e3a'; g.fillRect(3, 0, w-6, 12);
      g.fillStyle = '#eaffea'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.fillText('SALIDA', w/2, 9);
    }),
    // entrada EducaciónIT (corporativo)
    educacionit: mk(46, 62, (g, w, h) => {
      g.fillStyle = '#0e2a4a'; g.fillRect(0, 6, w, h-6);
      g.fillStyle = '#123a63'; g.fillRect(5, 16, w-10, h-16);
      g.fillStyle = '#0a0a0c'; g.fillRect(w/2-6, h-26, 12, 26);
      g.fillStyle = '#0b1f38'; g.fillRect(2, 0, w-4, 14);
      g.fillStyle = '#34c3ff'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.fillText('EducaciónIT', w/2, 10);
      g.fillStyle = '#7CFC00'; g.font = 'bold 8px monospace'; g.fillText('▲ PISOS', w/2, h*0.55);
    }),
    // entrada ARCADE (neón)
    arcade: mk(46, 64, (g, w, h) => {
      g.fillStyle = '#120a1e'; g.fillRect(0, 14, w, h-14);
      g.fillStyle = '#05030a'; g.fillRect(6, 24, w-12, h-24);
      g.fillStyle = '#1a1030'; g.fillRect(w/2-7, h-30, 14, 30);
      g.fillStyle = '#0a0612'; g.fillRect(0, 2, w, 16);
      g.fillStyle = '#ff2e88'; g.font = 'bold 11px monospace'; g.textAlign = 'center';
      g.shadowColor = '#ff2e88'; g.shadowBlur = 8; g.fillText('ARCADE', w/2, 14); g.shadowBlur = 0;
      for (let x=4;x<w;x+=8){ g.fillStyle = (x/8%2)?'#34c3ff':'#ffe21a'; g.beginPath(); g.arc(x, 20, 1.6, 0, Math.PI*2); g.fill(); }
    }),
    // ascensor (oficinas)
    elevator: mk(38, 58, (g, w, h) => {
      g.fillStyle = '#3a4048'; g.fillRect(0, 4, w, h-4);
      g.fillStyle = '#20252b'; g.fillRect(5, 10, w-10, h-12);
      g.strokeStyle = '#5a6470'; g.lineWidth = 2; g.beginPath(); g.moveTo(w/2, 12); g.lineTo(w/2, h-4); g.stroke();
      g.fillStyle = '#7CFC00'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.fillText('ASCENSOR', w/2, 9);
    }),
    // entrada de Garbarino (electrónica)
    garbarino: mk(46, 62, (g, w, h) => {
      g.fillStyle = '#e65100'; g.fillRect(0, 14, w, h-14);
      g.fillStyle = '#fff3e0'; g.fillRect(3, 2, w-6, 12);
      g.fillStyle = '#e65100'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.fillText('GARBARINO', w/2, 11);
      g.fillStyle = '#1a2733'; g.fillRect(6, 18, w-12, h-30); // vidriera con TVs
      g.fillStyle = '#4fc3f7'; g.fillRect(9, 21, 12, 9); g.fillRect(24, 21, 12, 9);
      g.fillStyle = '#0d0d0d'; g.fillRect(w/2-8, h-22, 16, 22);
    }),
    // puerta de la disquería (en la cueva)
    disqueria: mk(40, 56, (g, w, h) => {
      g.fillStyle = '#2a1a2a'; g.fillRect(0, 4, w, h-4);
      g.fillStyle = '#0a0a0a'; g.fillRect(5, 12, w-10, h-12);
      g.fillStyle = '#e0b0ff'; g.beginPath(); g.arc(w/2, h*0.58, 9, 0, Math.PI*2); g.fill();
      g.fillStyle = '#2a1a2a'; g.beginPath(); g.arc(w/2, h*0.58, 2.5, 0, Math.PI*2); g.fill();
      g.fillStyle = '#7CFC00'; g.font = 'bold 8px monospace'; g.textAlign = 'center'; g.fillText('VINILOS', w/2, 10);
    }),
    // puerta de Cemento (recitales under, en la calle)
    cemento: mk(46, 62, (g, w, h) => {
      g.fillStyle = '#161616'; g.fillRect(0, 12, w, h-12);
      g.fillStyle = '#000'; g.fillRect(5, 20, w-10, h-20);
      g.fillStyle = '#b71c1c'; g.fillRect(3, 2, w-6, 13);
      g.fillStyle = '#fff'; g.font = 'bold 10px monospace'; g.textAlign = 'center'; g.fillText('CEMENTO', w/2, 12);
      g.fillStyle = '#555'; g.fillRect(w/2-8, h-24, 16, 24);
    }),
    // entrada del supermercado chino
    superchino: mk(46, 64, (g, w, h) => {
      g.fillStyle = '#b71c1c'; g.fillRect(0, 14, w, h-14);
      g.fillStyle = '#ffd54f'; g.fillRect(3, 2, w-6, 12);
      g.fillStyle = '#b71c1c'; g.font = 'bold 8px monospace'; g.textAlign = 'center'; g.fillText('SUPER', w/2, 11);
      g.fillStyle = '#ffd54f'; g.font = 'bold 13px serif'; g.fillText('超市', w/2, h*0.52);
      g.fillStyle = '#0d0d0d'; g.fillRect(w/2-9, h-26, 18, 26);
    }),
    // casa de cambio OFICIAL (banco): la cola entra acá
    cambio: mk(48, 66, (g, w, h) => {
      g.fillStyle = '#15532e'; g.fillRect(0, 14, w, h-14);            // frente verde "billete"
      g.fillStyle = '#0e3a20'; g.fillRect(0, 14, w, 4);
      g.fillStyle = '#d4af37'; g.fillRect(3, 2, w-6, 12);             // cartel dorado
      g.fillStyle = '#0e3a20'; g.font = 'bold 8px monospace'; g.textAlign = 'center'; g.fillText('CAMBIO', w/2, 11);
      // columnas tipo banco
      g.fillStyle = '#e8e2cf'; g.fillRect(5, 18, 5, h-26); g.fillRect(w-10, 18, 5, h-26);
      // vidriera + cartel U$D
      g.fillStyle = '#0c1f14'; g.fillRect(13, 20, w-26, h-30);
      g.fillStyle = '#7CFC00'; g.font = 'bold 11px monospace'; g.fillText('U$D', w/2, h*0.5);
      // puerta vidriada
      g.fillStyle = '#0a0a0a'; g.fillRect(w/2-8, h-22, 16, 22);
      g.fillStyle = '#2a6b44'; g.fillRect(w/2-1, h-22, 2, 22);
    }),
    // entrada del EDIFICIO ABANDONADO (20 pisos) — la abren los 3 borrachines
    abandonado: mk(48, 70, (g, w, h) => {
      g.fillStyle = '#34322e'; g.fillRect(0, 8, w, h-8);
      g.fillStyle = '#26241f'; g.fillRect(0, 8, w, 5); g.fillRect(0, 8, 5, h-8);
      for (let wy = 16; wy < h-26; wy += 18) for (let wx = 8; wx < w-12; wx += 16) {
        if (((wx*7+wy*5) % 10) < 4) { g.fillStyle = '#5a4a30'; g.fillRect(wx, wy, 10, 12); } // tapiada
        else { g.fillStyle = '#0c1418'; g.fillRect(wx, wy, 10, 12); g.fillStyle = '#1e2c33'; g.fillRect(wx+1, wy+1, 4, 5); }
      }
      g.fillStyle = '#0a0a0a'; g.fillRect(w/2-9, h-26, 18, 26);            // entrada negra
      g.fillStyle = 'rgba(210,50,50,0.6)'; g.font = 'bold 7px monospace'; g.textAlign = 'center'; g.fillText('CLAUSURADO', w/2, 6);
    }),
  };
  function portalFrames() {
    return [0, 1, 2, 3].map(f => mk(48, 80, (g, w, h) => {
      const cx = w/2, cy = h/2;
      for (let r = 26; r > 0; r -= 2) {
        const t = r/26, a = 0.10 + 0.5*(1-t) + Math.sin(f + r*0.3)*0.05;
        g.fillStyle = `rgba(${130+90*t},${70+50*t},255,${Math.max(0,a)})`;
        g.beginPath(); g.ellipse(cx, cy, r*0.55, r, 0, 0, Math.PI*2); g.fill();
      }
      g.fillStyle = 'rgba(235,240,255,0.95)'; g.beginPath(); g.ellipse(cx, cy, 3, 9, 0, 0, Math.PI*2); g.fill();
    }));
  }

  // ---------------- FONDOS (parallax) ----------------
  function drawStreetBg(g, camX, W, H, stormed) {
    // cielo
    const sky = g.createLinearGradient(0, 0, 0, H);
    if (stormed) { sky.addColorStop(0, '#0a0e1c'); sky.addColorStop(1, '#1b1024'); }
    else { sky.addColorStop(0, '#8fc0e6'); sky.addColorStop(0.7, '#cfe6f2'); sky.addColorStop(1, '#e9e2d2'); }
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    if (!stormed) { g.fillStyle = 'rgba(255,245,210,0.5)'; g.beginPath(); g.arc(W*0.78, H*0.22, 34, 0, Math.PI*2); g.fill(); }
    // skyline lejano
    drawSkyline(g, camX*0.25, W, H, 110, H*0.42, stormed ? '#10131f' : '#9fb3c4', 7);
    // edificios medios con ventanas
    drawSkyline(g, camX*0.5, W, H, 150, H*0.62, stormed ? '#0c0f18' : '#6f7f8e', 11, true, stormed);
    // cartelería de la peatonal (capa cercana)
    drawSigns(g, camX*0.7, W, H, stormed);
  }
  function drawSigns(g, off, W, H, stormed) {
    const baseY = H * 0.66;
    const signs = [
      { x: 60,  t: 'FLORIDA', c: '#ff4d6d' },
      { x: 340, t: 'CAMBIO',  c: '#19d36a' },
      { x: 640, t: 'CINE',    c: '#ffd24d' },
      { x: 900, t: 'LAVALLE', c: '#4dc3ff' },
      { x: 1180,t: '$ U$D €', c: '#19d36a' },
      { x: 1480,t: 'GALERÍA', c: '#ff8a3c' },
    ];
    g.textAlign = 'center'; g.font = 'bold 15px monospace';
    for (const s of signs) {
      const x = s.x - off;
      if (x < -120 || x > W + 120) continue;
      // cartel colgante
      g.fillStyle = stormed ? 'rgba(20,20,28,0.9)' : 'rgba(15,18,26,0.92)';
      const wsign = s.t.length * 10 + 16;
      g.fillRect(x - wsign/2, baseY - 30, wsign, 22);
      const on = !stormed || Math.random() < 0.5;
      g.fillStyle = on ? s.c : '#33373f';
      if (on && !stormed) { g.shadowColor = s.c; g.shadowBlur = 10; }
      g.fillText(s.t, x, baseY - 14);
      g.shadowBlur = 0;
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, baseY - 30); g.lineTo(x, baseY - 40); g.stroke();
    }
  }
  function drawOfficeBg(g, camX, W, H) {
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#eef1f5'); bg.addColorStop(1, '#cfd6de'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // logo en la pared
    g.fillStyle = 'rgba(30,90,160,0.12)'; g.font = 'bold 46px monospace'; g.textAlign = 'center';
    g.fillText('EducaciónIT', (W/2) - (camX*0.3 % (W+400)), 90);
    // escritorios con monitores
    const off = camX * 0.5;
    for (let i = -1; i * 150 - off < W; i++) {
      const x = i * 150 - off;
      g.fillStyle = '#9aa4ae'; g.fillRect(x + 20, 150, 110, 60);
      g.fillStyle = '#1c2733'; g.fillRect(x + 50, 120, 50, 32);
      g.fillStyle = (i % 2) ? '#2bd17a' : '#34c3ff'; g.fillRect(x + 53, 123, 44, 26);
      g.fillStyle = '#11161c'; g.font = '8px monospace'; g.textAlign = 'left'; g.fillText('</>', x + 58, 138);
    }
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, 22, W, 8);
  }
  function drawArcadeBg(g, camX, W, H) {
    g.fillStyle = '#0b0716'; g.fillRect(0, 0, W, H);
    // grilla neón en perspectiva
    g.strokeStyle = 'rgba(120,60,220,0.35)'; g.lineWidth = 1;
    const off = camX * 0.4;
    for (let i = -1; i * 60 - off < W; i++) { const x = i*60 - off; g.beginPath(); g.moveTo(x, H); g.lineTo(x*0.5 + W*0.25, H*0.45); g.stroke(); }
    for (let y = H; y > H*0.45; y -= 18) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.globalAlpha = 0.15; g.stroke(); g.globalAlpha = 1; }
    // siluetas de máquinas
    const o2 = camX * 0.6;
    for (let i = -1; i * 120 - o2 < W; i++) { const x = i*120 - o2; g.fillStyle = 'rgba(40,20,70,0.7)'; g.fillRect(x+20, 70, 50, 150); g.fillStyle = (i%2)?'rgba(255,46,136,0.5)':'rgba(52,195,255,0.5)'; g.fillRect(x+28, 90, 34, 24); }
  }
  const BUILDINGS = {
    educacionit: { w: 170, h: 320, c: '#16324f', c2: '#0e2238', win: '#34c3ff', sign: 'EducaciónIT', sc: '#34c3ff' },
    arcade:      { w: 150, h: 270, c: '#1a1030', c2: '#0e0820', win: '#ff2e88', sign: 'ARCADE', sc: '#ff2e88' },
    choris:      { w: 130, h: 150, c: '#5a2a18', c2: '#3a1810', win: '#ffd54f', sign: 'CHORIS', sc: '#ffd54f' },
    galeria:     { w: 150, h: 340, c: '#3a352c', c2: '#26221b', win: '#caa45a', sign: 'GALERÍA', sc: '#ffd54f' },
    superchino:  { w: 152, h: 180, c: '#7a1414', c2: '#560d0d', win: '#ffd54f', sign: '超市 SUPER', sc: '#ffd54f' },
    garbarino:   { w: 150, h: 200, c: '#e65100', c2: '#bf360c', win: '#fff3e0', sign: 'GARBARINO', sc: '#fff' },
    cemento:     { w: 150, h: 170, c: '#161616', c2: '#0a0a0a', win: '#b71c1c', sign: 'CEMENTO', sc: '#fff' },
  };
  function drawBuilding(g, sx, gy, style) {
    const s = BUILDINGS[style] || BUILDINGS.galeria;
    const x = sx - s.w/2, y = gy - s.h;
    g.fillStyle = s.c; g.fillRect(x, y, s.w, s.h);
    g.fillStyle = s.c2; g.fillRect(x, y, s.w, 8); g.fillRect(x, y, 6, s.h);
    for (let wy = y + 36; wy < gy - 46; wy += 26)
      for (let wx = x + 14; wx < x + s.w - 14; wx += 24) {
        const lit = ((wx*7 + wy*13) % 10) < 6;
        g.globalAlpha = 0.5; g.fillStyle = lit ? s.win : '#0d1118'; g.fillRect(wx, wy, 13, 15); g.globalAlpha = 1;
      }
    // cartel
    g.fillStyle = '#0a0c10'; g.fillRect(x + 10, y + 10, s.w - 20, 24);
    g.fillStyle = s.sc; g.font = 'bold 15px monospace'; g.textAlign = 'center';
    g.shadowColor = s.sc; g.shadowBlur = 8; g.fillText(s.sign, sx, y + 27); g.shadowBlur = 0;
  }
  function drawSecretBg(g, camX, W, H) {
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a0e12'); bg.addColorStop(1, '#0a0608');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // lámparas colgantes con cono de luz
    for (let i = 0; i < 4; i++) {
      const x = 160 + i*200 - ((camX*0.5) % (W+200));
      g.fillStyle = 'rgba(255,210,140,0.08)'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x-46, 170); g.lineTo(x+46, 170); g.closePath(); g.fill();
      g.fillStyle = '#0d0d0d'; g.fillRect(x-2, 0, 4, 28);
      g.fillStyle = '#ffcf6a'; g.beginPath(); g.arc(x, 30, 5, 0, Math.PI*2); g.fill();
    }
  }
  function drawShopBg(g, camX, W, H) {
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#5a4f3e'); bg.addColorStop(1, '#3b3328');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // estantes / vidrieras al fondo
    const off = camX * 0.4;
    for (let i = -1; i * 120 - off < W; i++) {
      const x = i * 120 - off;
      g.fillStyle = 'rgba(30,24,18,0.6)'; g.fillRect(x + 14, 60, 90, 150);
      for (let sy = 70; sy < 200; sy += 26) { g.fillStyle = 'rgba(120,150,170,0.25)'; g.fillRect(x + 18, sy, 82, 18); }
    }
    // luz de tubo
    g.fillStyle = 'rgba(255,250,220,0.12)'; g.fillRect(0, 24, W, 10);
  }
  function drawSkyline(g, off, W, H, period, baseY, col, seed, windows, stormed) {
    const r = rng(seed);
    g.fillStyle = col;
    const start = Math.floor(off / period) - 1;
    for (let i = start; i * period - off < W + period; i++) {
      const rr = rng(seed + i * 97);
      const bw = period * (0.6 + rr()*0.35);
      const bh = H * (0.18 + rr()*0.28);
      const x = i * period - off;
      const y = baseY - bh;
      g.fillStyle = col; g.fillRect(x, y, bw, H - y);
      if (windows) {
        for (let wy = y + 8; wy < H - 6; wy += 12) for (let wx = x + 6; wx < x + bw - 6; wx += 12) {
          const lit = rr() < (stormed ? 0.06 : 0.5);
          g.fillStyle = lit ? (stormed ? 'rgba(255,180,60,0.5)' : 'rgba(255,230,150,0.8)') : 'rgba(20,26,34,0.6)';
          g.fillRect(wx, wy, 5, 6);
        }
      }
    }
  }
  function drawCaveBg(g, camX, W, H, theme) {
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, theme === 'rock' ? '#0a0907' : '#0d0d10');
    bg.addColorStop(1, '#050507'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // arcos de roca / columnas al fondo
    const off = camX * 0.3, period = 130, r = rng(theme === 'rock' ? 5 : 6);
    const start = Math.floor(off / period) - 1;
    for (let i = start; i * period - off < W + period; i++) {
      const rr = rng((theme==='rock'?500:600) + i*131);
      const x = i * period - off, cw = period*0.5, ch = H*(0.5+rr()*0.3);
      g.fillStyle = theme === 'rock' ? 'rgba(40,34,28,0.7)' : 'rgba(34,34,40,0.7)';
      g.beginPath(); g.moveTo(x, H); g.lineTo(x, H-ch); g.quadraticCurveTo(x+cw/2, H-ch-30, x+cw, H-ch); g.lineTo(x+cw, H); g.fill();
    }
    // caños horizontales
    g.strokeStyle = 'rgba(60,55,50,0.5)'; g.lineWidth = 4;
    for (let k = 0; k < 3; k++) { const y = 40 + k*60 + Math.sin(camX*0.001+k)*4; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // cables colgando del techo
    g.strokeStyle = 'rgba(15,15,18,0.85)'; g.lineWidth = 2;
    const oc = camX * 0.5;
    for (let i = 0; i < 14; i++) {
      const x = (((i*90 - oc) % (W+180)) + W+180) % (W+180) - 90;
      const len = 28 + (i % 4) * 22;
      g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 12, len*0.6, x + 3, len); g.stroke();
    }
    // cartel de neón tenue al fondo
    const sx = W*0.5 - (camX*0.4 % (W*1.5));
    g.fillStyle = 'rgba(10,30,16,0.7)'; g.fillRect(sx-34, 54, 68, 20);
    g.fillStyle = 'rgba(60,210,120,0.55)'; g.font = 'bold 13px monospace'; g.textAlign = 'center';
    g.fillText('$ CAMBIO', sx, 68);
  }

  return {
    TILE, tiles, decor, hero: heroFrames(), enemyArt, npc, machines, items, portal: portalFrames(),
    drawStreetBg, drawCaveBg, drawShopBg, drawOfficeBg, drawArcadeBg, drawSecretBg, drawBuilding,
  };
})();
