// audio.js — SFX mínimos con WebAudio + música chiptune (sin archivos).
const Sfx = (() => {
  let ctx = null;
  let hum = null;      // zumbido de la tormenta
  let humGain = null;
  let amb = null, ambLfo = null, ambKind = null;   // cama de AMBIENTE por zona (capa aparte de la música)

  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function blip(freq, dur, type = 'square', vol = 0.2) {
    const c = ensure();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur);
  }

  function noiseBurst(dur, vol = 0.3) {
    const c = ensure();
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const src = c.createBufferSource(); src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start();
  }

  // ---- música chiptune: arreglo de "Mi Buenos Aires querido" (tango) ----
  const FREQ = {
    A2:110.00, E2:82.41, D2:73.42, F2:87.31, G2:98.00, C3:130.81,
    E4:329.63, F4:349.23, G4:392.00, A4:440.00, B4:493.88,
    C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00,
  };
  function voice(freq, start, dur, type, vol) {
    const c = ensure();
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.02);
    g.gain.setValueAtTime(vol, start + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0008, start + dur);
    o.connect(g); g.connect(c.destination);
    o.start(start); o.stop(start + dur + 0.03);
  }
  // track con scheduler de lookahead; [lead, bajo, tiempos]
  function makeTrack(song, beat, opts) {
    let on = false, idx = 0, nextT = 0, timer = null;
    function tick() {
      if (!on) return;
      const c = ensure();
      while (nextT < c.currentTime + 0.25) {
        const [lead, bass, beats] = song[idx % song.length];
        const dur = beats * beat;
        if (lead && FREQ[lead]) voice(FREQ[lead], nextT, dur * (opts.staccato || 0.92), opts.leadType || 'square', opts.leadVol || 0.05);
        if (bass && FREQ[bass]) voice(FREQ[bass], nextT, dur * 0.95, 'triangle', opts.bassVol || 0.05);
        if (opts.guira) voice(1600, nextT + dur*0.5, 0.03, 'square', 0.018); // güira de cumbia
        idx++; nextT += dur;
      }
      timer = setTimeout(tick, 55);
    }
    return {
      start() { if (on) return; on = true; idx = 0; nextT = ensure().currentTime + 0.08; tick(); },
      stop() { on = false; if (timer) clearTimeout(timer); },
    };
  }
  // "Mi Buenos Aires querido" (tango)
  const TANGO = [
    ['E4','A2',1],['A4','A2',1],['B4','A2',1],['C5','A2',1],
    ['B4','E2',2],['A4','E2',1],['E4','E2',1],
    ['A4','D2',1],['C5','D2',1],['E5','D2',2],
    ['D5','E2',1],['C5','E2',1],['B4','E2',1],['A4','E2',1],
    ['A4','A2',2],['C5','A2',1],['B4','A2',1],
    ['C5','F2',2],['A4','F2',1],['E4','F2',1],
    ['G4','E2',1],['B4','E2',1],['D5','E2',2],
    ['C5','A2',2],['B4','A2',1],['A4','A2',1],
    ['A4','A2',4],
  ];
  // cumbia (riff cortito y bailable)
  const CUMBIA = [
    ['E5','A2',1],['D5','E2',1],['C5','A2',1],['B4','E2',1],
    ['A4','A2',1],['C5','A2',1],['B4','E2',1],['A4','E2',1],
    ['E5','F2',1],['D5','F2',1],['C5','E2',1],['B4','E2',1],
    ['A4','A2',1],['B4','A2',1],['C5','A2',1],['A4','E2',1],
  ];
  // synth-pop ochentoso
  const EIGHTIES = [
    ['E5','A2',1],['E5','A2',1],['D5','A2',1],['E5','A2',1],
    ['C5','F2',1],['C5','F2',1],['B4','E2',1],['C5','E2',1],
    ['A4','A2',1],['C5','A2',1],['E5','A2',1],['D5','D2',1],
    ['C5','E2',2],['B4','E2',1],['A4','E2',1],
  ];
  const Music = makeTrack(TANGO, 0.34, { leadVol:0.05, bassVol:0.05 });
  const Cumbia = makeTrack(CUMBIA, 0.21, { leadVol:0.05, bassVol:0.06, staccato:0.55, guira:true });
  const Eighties = makeTrack(EIGHTIES, 0.20, { leadVol:0.05, bassVol:0.05, leadType:'square' });
  // MARCHA PERONISTA (chiptune, homenaje): "Los muchachos peronistas / todos unidos triunfaremos / ¡Viva Perón!"
  const MARCHA = [
    ['G4','C2',1],['G4','C2',1],['G4','C2',1],['C5','C2',1],   // Los mu-cha-chos pe-
    ['C5','G2',1],['B4','G2',1],['A4','G2',1],['G4','G2',1],   // -ro-nis-tas
    ['A4','F2',1],['A4','F2',1],['A4','F2',1],['D5','F2',1],   // to-dos u-ni-dos
    ['D5','G2',1],['C5','G2',1],['B4','G2',1],['A4','G2',1],   // triun-fa-re-mos
    ['C5','C2',1],['C5','C2',1],['G4','G2',2],                  // ¡Vi-va Pe-rón!
    ['C5','C2',1],['C5','C2',1],['C5','C2',2],                  // ¡Vi-va Pe-rón!
  ];
  const Marcha = makeTrack(MARCHA, 0.26, { leadVol:0.06, bassVol:0.06, leadType:'square', staccato:0.6, guira:true });
  // heavy metal argentino (Almafuerte) prueba de sonido
  const METAL = [
    ['E4','E2',1],['E4','E2',1],['G4','E2',1],['E4','E2',1],
    ['A4','A2',1],['E4','A2',1],['G4','G2',1],['E4','G2',1],
    ['E4','E2',1],['G4','E2',1],['A4','E2',1],['B4','E2',1],
    ['G4','E2',2],['E4','E2',1],['E4','E2',1],
  ];
  const Metal = makeTrack(METAL, 0.16, { leadVol:0.055, bassVol:0.06, leadType:'sawtooth' });
  // dance pedorra (la parte que juegan)
  const DANCE = [
    ['A4','A2',1],['A4','A2',1],['E5','A2',1],['A4','A2',1],
    ['C5','F2',1],['C5','F2',1],['G5','F2',1],['C5','F2',1],
    ['D5','G2',1],['D5','G2',1],['A5','G2',1],['D5','G2',1],
    ['C5','E2',1],['B4','E2',1],['A4','E2',1],['G4','E2',1],
  ];
  const Dance = makeTrack(DANCE, 0.15, { leadVol:0.05, bassVol:0.06, leadType:'square' });
  // música de telo (lenta y baranda)
  const TELO = [
    ['E4','A2',2],['G4','A2',1],['A4','A2',1],
    ['C5','A2',2],['B4','E2',1],['A4','E2',1],
    ['G4','D2',2],['A4','D2',1],['G4','D2',1],
    ['E4','E2',2],['G4','E2',1],['A4','E2',1],
  ];
  const Telo = makeTrack(TELO, 0.42, { leadVol:0.10, bassVol:0.09, leadType:'triangle' });   // bien grasa y AUDIBLE (subido de 0.05)
  const ROOM = { metal: Metal, dance: Dance, telo: Telo };
  let musicWanted = false, cumbiaActive = false, marchaActive = false;

  return {
    init() { ensure(); },
    shoot() { blip(220, 0.08, 'square', 0.18); noiseBurst(0.05, 0.14); },
    spit() { blip(150, 0.05, 'sawtooth', 0.08); noiseBurst(0.08, 0.12); },
    eShoot() { blip(160, 0.09, 'sawtooth', 0.12); },
    jump() { blip(330, 0.10, 'square', 0.10); },
    empty() { blip(90, 0.05, 'square', 0.10); },
    hit()   { blip(140, 0.12, 'sawtooth', 0.22); },
    hurt()  { blip(80, 0.18, 'sawtooth', 0.28); },
    enemyDie() { blip(60, 0.3, 'sawtooth', 0.25); noiseBurst(0.25, 0.2); },
    pickup() { blip(660, 0.08); blip(880, 0.08); },
    win()   { [440, 550, 660, 880].forEach((f, i) => setTimeout(() => blip(f, 0.25, 'triangle', 0.2), i*140)); },
    stormBoom() { ensure(); noiseBurst(0.9, 0.5); blip(50, 0.8, 'sawtooth', 0.3); },
    startHum() {
      const c = ensure();
      if (hum) return;
      hum = c.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 55;
      const lfo = c.createOscillator(); lfo.frequency.value = 7;
      const lfoG = c.createGain(); lfoG.gain.value = 14;
      lfo.connect(lfoG); lfoG.connect(hum.frequency);
      humGain = c.createGain(); humGain.gain.value = 0.05;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
      hum.connect(f); f.connect(humGain); humGain.connect(c.destination);
      hum.start(); lfo.start();
    },
    stopHum() { if (humGain) humGain.gain.value = 0; },
    // AMBIENTE por sala: una cama de ruido filtrado en loop (capa APARTE de la música).
    // calle (murmullo) · viento (post-tormenta, desolado) · cueva (rumor de subsuelo) · recital (gentío).
    setAmbient(kind) {
      if (ambKind === kind) return;
      // apagar el anterior
      if (amb) { try { amb.stop(); } catch (e) {} amb = null; }
      if (ambLfo) { try { ambLfo.stop(); } catch (e) {} ambLfo = null; }
      ambKind = kind;
      const CFG = {
        calle:   { type: 'bandpass', freq: 520,  q: 0.5, vol: 0.020, lfo: 0.0  },
        viento:  { type: 'highpass', freq: 700,  q: 0.4, vol: 0.038, lfo: 0.25 },
        cueva:   { type: 'lowpass',  freq: 210,  q: 0.7, vol: 0.050, lfo: 0.12 },
        recital: { type: 'bandpass', freq: 250,  q: 0.8, vol: 0.042, lfo: 0.7  },
      };
      const cfg = CFG[kind];
      if (!cfg) return;                        // kind nulo/desconocido → sin ambiente
      const c = ensure();
      // fuente: ruido blanco en buffer, en loop
      const buf = c.createBuffer(1, Math.max(1, (c.sampleRate || 44100) * 2), c.sampleRate || 44100);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      amb = c.createBufferSource(); amb.buffer = buf; amb.loop = true;
      const f = c.createBiquadFilter(); f.type = cfg.type; f.frequency.value = cfg.freq; f.Q.value = cfg.q;
      const g = c.createGain(); g.gain.value = cfg.vol;
      amb.connect(f); f.connect(g); g.connect(c.destination);
      if (cfg.lfo) {                           // "respiración"/ráfagas lentas del volumen
        ambLfo = c.createOscillator(); ambLfo.frequency.value = cfg.lfo;
        const lg = c.createGain(); lg.gain.value = cfg.vol * 0.6;
        ambLfo.connect(lg); lg.connect(g.gain); ambLfo.start();
      }
      amb.start();
    },
    stopAmbient() { this.setAmbient(null); },
    startMusic() { musicWanted = true; if (!cumbiaActive) Music.start(); },
    stopMusic() { musicWanted = false; Music.stop(); },
    toggleMusic() { musicWanted = !musicWanted; if (musicWanted && !cumbiaActive) Music.start(); else Music.stop(); return musicWanted; },
    setMarcha(on) {   // Marcha Peronista (fiesta de Lavalle al ganar los 5 mini-juegos)
      if (on && !marchaActive) { marchaActive = true; Music.stop(); Cumbia.stop(); cumbiaActive = false; Marcha.start(); }
      else if (!on && marchaActive) { marchaActive = false; Marcha.stop(); if (musicWanted) Music.start(); }
    },
    setCumbia(on) {
      if (on && !cumbiaActive) { cumbiaActive = true; Music.stop(); Cumbia.start(); }
      else if (!on && cumbiaActive) { cumbiaActive = false; Cumbia.stop(); if (musicWanted) Music.start(); }
    },
    startEighties() { Music.stop(); Cumbia.stop(); for (const k in ROOM) ROOM[k].stop(); Eighties.start(); },
    stopEighties() { Eighties.stop(); if (musicWanted && !cumbiaActive) Music.start(); },
    setRoomTrack(kind) {
      for (const k in ROOM) ROOM[k].stop();
      if (kind && ROOM[kind]) { Music.stop(); Cumbia.stop(); Eighties.stop(); ROOM[kind].start(); }
      else if (musicWanted && !cumbiaActive) Music.start();
    },
  };
})();
