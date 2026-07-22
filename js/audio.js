// audio.js — SFX mínimos con WebAudio + música chiptune (sin archivos).
const Sfx = (() => {
  let ctx = null;
  let hum = null;      // zumbido de la tormenta
  let humGain = null;
  let amb = null, ambLfo = null, ambKind = null;   // cama de AMBIENTE por zona (capa aparte de la música)
  let master = null, masterVol = 1;   // VOLUMEN general (specs/configuracion.md): único gain que TODO atraviesa antes de destination

  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    if (!master) { master = ctx.createGain(); master.gain.value = masterVol; master.connect(ctx.destination); }
    return ctx;
  }
  // 0..1 (config.js: Config.get('volume')). Guardado en masterVol para aplicarse aunque el context aún no exista.
  function setVolume(v) { masterVol = Math.min(1, Math.max(0, +v || 0)); if (master) master.gain.value = masterVol; }

  function blip(freq, dur, type = 'square', vol = 0.2) {
    const c = ensure();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(master);
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
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  }

  // ---- música chiptune: arreglo de "Mi Buenos Aires querido" (tango) ----
  const FREQ = {
    A2:110.00, E2:82.41, D2:73.42, F2:87.31, G2:98.00, C3:130.81,
    E4:329.63, F4:349.23, G4:392.00, A4:440.00, B4:493.88,
    C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00,
  };
  function voice(freq, start, dur, type, vol, pluck) {
    const c = ensure();
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    if (pluck) {                                            // cuerda PULSADA (koto/pizzicato): ataque rápido + decae, sin sustain
      g.gain.linearRampToValueAtTime(vol, start + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0008, start + dur);
    } else {
      g.gain.linearRampToValueAtTime(vol, start + 0.02);
      g.gain.setValueAtTime(vol, start + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0008, start + dur);
    }
    o.connect(g); g.connect(master);
    o.start(start); o.stop(start + dur + 0.03);
  }
  // BOMBO de hinchada (para makeTrack, opcional por paso): sine que cae 150→45Hz, corto y gordo. Conecta directo
  // a destination como voice(). Es el "pum" del bombo de la banda (canto de la popular de Dálmine, v356).
  function thump(start, vol) {
    const c = ensure(), o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, start); o.frequency.exponentialRampToValueAtTime(45, start + 0.1);
    g.gain.setValueAtTime(vol || 0.5, start); g.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
    o.connect(g); g.connect(master); o.start(start); o.stop(start + 0.15);
  }
  // track con scheduler de lookahead; [lead, bajo, tiempos, drum?] — drum: 'k' = bombo (opcional, no afecta los temas viejos)
  function makeTrack(song, beat, opts) {
    let on = false, idx = 0, nextT = 0, timer = null;
    function tick() {
      if (!on) return;
      const c = ensure();
      while (nextT < c.currentTime + 0.25) {
        const [lead, bass, beats, drum] = song[idx % song.length];
        const dur = beats * beat;
        if (drum && drum.indexOf('k') >= 0) thump(nextT, opts.kickVol);   // bombo de hinchada (v356)
        // nf(): acepta cualquier nombre de nota (no sólo la tabla FREQ) → se puede componer libre; reproduce FREQ para las de siempre.
        if (lead && nf(lead)) voice(nf(lead), nextT, dur * (opts.staccato || 0.92), opts.leadType || 'square', opts.leadVol || 0.05, opts.pluck);
        if (bass && nf(bass)) voice(nf(bass), nextT, dur * 0.95, opts.bassType || 'triangle', opts.bassVol || 0.05);
        if (opts.guira) voice(1600, nextT + dur*0.5, 0.03, 'square', 0.018); // güira de cumbia
        if (opts.wood) voice(2100, nextT, 0.05, 'square', opts.woodVol || 0.018, true); // woodblock (percusión oriental)
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
  // MARCHA PERONISTA (chiptune, homenaje) — melodía REAL en La menor ("mi do la mi..."; la más conocida, arranca en menor).
  // "Los muchachos peronistas / todos unidos triunfaremos / y como siempre daremos / un grito de corazón: ¡Viva Perón!"
  // MARCHA PERONISTA (homenaje) — se mantiene la parte que gustó ("un grito de corazón / ¡Viva Perón! ¡Viva Perón!")
  // y se alarga con un cierre grande. La estrofa "Los muchachos peronistas / todos unidos triunfaremos" a ajustar por oído.
  const MARCHA = [
    ['E4','A2',1],['C4','A2',1],['A3','A2',1],['E4','A2',1],['C4','A2',1],['A3','A2',1],['E4','A2',2],                 // Los mu-cha-chos pe-ro-nis-tas
    ['E4','A2',1],['C4','A2',1],['A3','A2',1],['E4','A2',1],['D4','G2',1],['C4','G2',1],['D4','G2',1],['B3','E2',2],   // to-dos u-ni-dos triun-fa-re-mos
    ['D4','D3',1],['B3','D3',1],['A3','D3',1],['D4','D3',1],['B3','D3',1],['A3','G2',1],['B3','G2',2],                 // y co-mo siem-pre da-re-mos
    ['F4','F2',2],['F4','F2',1],['F4','F2',1],['F4','F2',2],['E4','E2',1],['D4','E2',1],['E4','E2',1],                  // un gri-to de co-ra-zón  ← (te gustó)
    ['F4','F2',1],['E4','A2',1],['D4','E2',1],['E4','A2',1],['F4','F2',1],['E4','A2',1],['D4','E2',1],['E4','A2',2],   // ¡Vi-va Pe-rón! ¡Vi-va Pe-rón!  ← (te gustó)
    ['A4','A2',1],['G4','A2',1],['F4','F2',1],['E4','E2',1],['F4','F2',1],['E4','A2',1],['D4','E2',1],['E4','A2',1],['A3','A2',3],   // cierre grande (más larga)
  ];
  const Marcha = makeTrack(MARCHA, 0.2, { leadVol:0.07, bassVol:0.06, leadType:'square', staccato:0.7, wood:true, woodVol:0.012 });
  // EL CANTO DE LA POPULAR DE VILLA DÁLMINE (v356, letra del dueño — EL hit de Mitre y Puccini):
  // "dale dale dale dale vio / dale dale dale dale vio / daleeeeee daleeee viooooooo"
  // Cantito de tribuna en Do mayor + BOMBO de la banda ('k' = thump) marcando los tiempos fuertes.
  const VIOLETA = [
    // "da-le da-le da-le da-le vio" (1ª)
    ['C4','C2',1,'k'],['C4',null,1],['D4','G2',1],['D4',null,1],['E4','C2',1,'k'],['E4',null,1],['D4','G2',1],['D4',null,1],['E4','C2',2,'k'],
    // "da-le da-le da-le da-le vio" (2ª)
    ['C4','C2',1,'k'],['C4',null,1],['D4','G2',1],['D4',null,1],['E4','C2',1,'k'],['E4',null,1],['D4','G2',1],['D4',null,1],['E4','C2',2,'k'],
    // "da-leeeeee  da-leee  viooooooo" (el cierre que se estira)
    ['F4','F2',1,'k'],['G4','F2',1],['A4','F2',3,'k'],['G4','G2',3,'k'],['E4','C2',4,'k'],[null,'C2',1],
  ];
  const Violeta = makeTrack(VIOLETA, 0.23, { leadVol:0.075, bassVol:0.06, leadType:'square', staccato:0.8, kickVol:0.45 });
  // HIMNO NACIONAL ARGENTINO — parte CANTADA (dominio público): "Sean eternos los laureles / que supimos conseguir /
  // coronados de gloria vivamos / o juremos con gloria morir". Melodía de la voz cantada (Sol mayor: sol si sol re do la fa...).
  const HIMNO = [
    ['G4','C3',1],['A4','C3',1],['B4','G2',1],['C5','C3',1],['C5','C3',1],['E5','C3',1],['D5','G2',1],['C5','C3',2],   // Sean e-ter-nos los lau-re-les (SOL LA SI do do mi re do)
    ['B4','G2',1],['A4','G2',1],['G4','G2',1],['E4','C3',1],['C4','C3',1],['E4','C3',1],['G4','G2',2],                 // que su-pi-mos con-se-guir (SI LA SOL MI DO MI SOL)
    ['F4','F2',1],['F4','F2',1],['A4','F2',1],['G4','C3',1],['A4','F2',1],['B4','G2',1],['C5','C3',2],                 // que su-pi-mos con-se-guir (FA FA LA SOL LA SI do)
    ['C5','C3',1],['D5','G2',1],['E5','C3',1],['E5','C3',1],['D5','G2',1],['C5','C3',1],['D5','G2',2],                 // co-ro-na-dos de glo-ria vi-va-mos
    ['G4','G2',1],['C5','C3',2],['B4','G2',1],['A4','F2',1],['G4','C3',1],['F4','G2',1],['E4','C3',1],['D4','G2',1],['C4','C3',3],   // o ju-re-mos con glo-ria mo-rir
  ];
  const Himno = makeTrack(HIMNO, 0.44, { leadVol:0.09, bassVol:0.055, leadType:'triangle', staccato:0.99 });   // solemne pero no arrastrado; triangle + legato = tono de himno
  // CODA del himno "o juremos con gloria morir" ×2 — MÁS RÁPIDA y marcada, tocada como CAMPANA (square pulsado +
  // octava): la campana del Cabildo "toca" esta parte. Notas: do mi do sol fa re si (salto a "juremos" y caída).
  const HIMNO_CODA = [
    ['C5',1],['E5',1],['C5',1],['G4',1],['F4',1],['D5',1],['B4',2],           // o ju-re-mos con glo-ria mo-rir
    ['C5',1],['E5',1],['C5',1],['G4',1],['F4',1],['D5',1],['B4',1],['C5',3],  // o ju-re-mos con glo-ria mo-rir (resuelve)
  ];
  // ---- MOTOR "HEAVY CRIOLLO" (homenaje ORIGINAL a Almafuerte/Iorio, sin copiar temas): power chords con DISTORSIÓN
  // (waveshaper) + bajo con cuerpo + BATERÍA (kick/snare/hats) + ADSR + vibrato en los leads, todo por un bus con
  // compresor para que suene LLENO y no clipee. Data-driven: cada paso = [acorde, bajo, beats, drum, mel?].
  //   acorde  = raíz del power chord (rítmica distorsionada; se le suma la quinta + octava)
  //   bajo    = nota del bajo (limpia, grave)         beats = duración en pulsos
  //   drum    = ''|'k'(bombo)|'s'(redoblante)|'ks'    mel   = (opcional) nota del LEAD que "canta" arriba (estribillo/lick)
  // nf(): nombre de nota ("E2","G#4") → frecuencia, así se compone libre sin tabla fija.
  const NOTE_SEMI = { C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11 };
  function nf(n) { if (!n) return 0; const m = /^([A-G]#?)(-?\d)$/.exec(n); if (!m) return FREQ[n] || 0; const semi = NOTE_SEMI[m[1]] + (parseInt(m[2], 10) + 1) * 12; return 440 * Math.pow(2, (semi - 69) / 12); }
  function distCurve(k) { const n = 8192, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); } return c; }
  function makeHeavy(song, beat, opts) {
    opts = opts || {};
    let on = false, idx = 0, nextT = 0, timer = null, gtr = null, clean = null;
    function chain() {                                    // bus: guitarra→distorsión→comp ; bajo/batería→comp ; comp→master→salida
      if (clean) return; const c = ensure();
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -20; comp.knee.value = 24; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.18;
      const out = c.createGain(); out.gain.value = opts.master || 0.72; comp.connect(out); out.connect(master);
      const ws = c.createWaveShaper(); ws.curve = distCurve(opts.drive || 6); ws.oversample = '4x';
      const gi = c.createGain(); gi.gain.value = 1; gi.connect(ws); ws.connect(comp);
      gtr = gi; clean = comp;
    }
    function env(g, start, dur, sus) { g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(1, start + 0.007); g.gain.setValueAtTime(1, start + dur * (sus || 0.7)); g.gain.exponentialRampToValueAtTime(0.0006, start + dur); }
    function power(freq, start, dur) {                    // power chord: raíz + quinta + octava → guitarra rítmica gorda
      const c = ensure(), g = c.createGain(); env(g, start, dur, 0.72); g.connect(gtr);
      [[freq, 0.18], [freq * 1.4983, 0.11], [freq * 2, 0.07]].forEach(([f, v]) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const gg = c.createGain(); gg.gain.value = v; o.connect(gg); gg.connect(g); o.start(start); o.stop(start + dur + 0.05); });
    }
    function lead(freq, start, dur) {                     // LEAD que canta (con vibrato) — estribillos y licks
      const c = ensure(), g = c.createGain(); env(g, start, dur, 0.8); g.connect(gtr);
      [[freq, 0.26], [freq * 2, 0.10]].forEach(([f, v]) => { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f; const gg = c.createGain(); gg.gain.value = v; o.connect(gg); gg.connect(g);
        const lfo = c.createOscillator(); lfo.frequency.value = 5.5; const lg = c.createGain(); lg.gain.value = f * 0.011; lfo.connect(lg); lg.connect(o.frequency); lfo.start(start); lfo.stop(start + dur + 0.05);
        o.start(start); o.stop(start + dur + 0.05); });
    }
    function bassN(freq, start, dur) { const c = ensure(), o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = freq; env(g, start, dur, 0.85); g.gain.value = 0; const gg = c.createGain(); gg.gain.value = opts.bassVol || 0.42; o.connect(g); g.connect(gg); gg.connect(clean); o.start(start); o.stop(start + dur + 0.05); }
    function kick(start) { const c = ensure(), o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(160, start); o.frequency.exponentialRampToValueAtTime(48, start + 0.11); g.gain.setValueAtTime(0.9, start); g.gain.exponentialRampToValueAtTime(0.001, start + 0.14); o.connect(g); g.connect(clean); o.start(start); o.stop(start + 0.15); }
    function noise(start, dur, hp, bp, vol) { const c = ensure(); const b = c.createBuffer(1, Math.max(1, (c.sampleRate || 44100) * dur), c.sampleRate || 44100); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = hp ? 'highpass' : 'bandpass'; f.frequency.value = bp; f.Q.value = 0.8; const g = c.createGain(); g.gain.setValueAtTime(vol, start); g.gain.exponentialRampToValueAtTime(0.001, start + dur); s.connect(f); f.connect(g); g.connect(clean); s.start(start); }
    function tick() {
      if (!on) return; const c = ensure();
      while (nextT < c.currentTime + 0.3) {
        const [chord, bass, beats, drum, mel] = song[idx % song.length];
        const dur = (beats || 1) * beat;
        if (chord) power(nf(chord), nextT, dur * 0.9);
        if (bass) bassN(nf(bass), nextT, dur * 0.95);
        if (mel) lead(nf(mel), nextT, dur * 0.92);
        if (drum && drum.indexOf('k') >= 0) kick(nextT);
        if (drum && drum.indexOf('s') >= 0) noise(nextT, 0.13, false, 1900, 0.5);   // redoblante
        noise(nextT, 0.03, true, 8000, 0.06);                                        // hi-hat en cada pulso (drive)
        idx++; nextT += dur;
      }
      timer = setTimeout(tick, 55);
    }
    return { start() { if (on) return; chain(); on = true; idx = 0; nextT = ensure().currentTime + 0.1; tick(); }, stop() { on = false; if (timer) clearTimeout(timer); } };
  }
  // "FIERRO CRIOLLO" — instrumental ORIGINAL en Mi menor, estilo heavy criollo (homenaje a Almafuerte, NO es un tema suyo):
  // RIFF galopante en E → puente por C/D/A → ESTRIBILLO con lead cantando arriba → vuelta al riff. Loopea como canción.
  const HEAVY = [
    // -- RIFF A (galope en Mi, el "fierro") --
    ['E2','E1',1,'k'],['E2','E1',1,''],['E2','E1',1,'s'],['G2','G1',1,''],
    ['E2','E1',1,'k'],['E2','E1',1,''],['D2','D1',1,'s'],['E2','E1',1,''],
    ['E2','E1',1,'k'],['E2','E1',1,''],['C2','C1',1,'s'],['C2','C1',1,''],
    ['B1','B0',1,'k'],['C2','C1',1,''],['D2','D1',1,'s'],['D2','D1',1,''],
    // -- RIFF A' (variación, resuelve a Mi) --
    ['E2','E1',1,'k'],['G2','G1',1,''],['A2','A1',1,'s'],['E2','E1',1,''],
    ['E2','E1',1,'k'],['A2','A1',1,''],['G2','G1',1,'s'],['E2','E1',1,''],
    ['E2','E1',1,'k'],['E2','E1',1,''],['D2','D1',1,'s'],['C2','C1',1,''],
    ['B1','B0',1,'ks'],['B1','B0',1,''],['E2','E1',2,'k'],
    // -- ESTRIBILLO (acordes largos + LEAD que canta) --
    ['A2','A1',2,'k','E4'],['A2','A1',2,'s','G4'],
    ['C3','C2',2,'k','A4'],['C3','C2',2,'s','B4'],
    ['D3','D2',2,'k','C5'],['D3','D2',2,'s','B4'],
    ['E3','E2',2,'k','G4'],['E3','E2',2,'ks','E4'],
    // -- LICK de cierre (lead solista) y vuelta --
    ['E2','E1',1,'k','E5'],['E2','E1',1,'','D5'],['E2','E1',1,'s','B4'],['G2','G1',1,'','G4'],
    ['A2','A1',1,'k','A4'],['G2','G1',1,'','G4'],['E2','E1',1,'s','E4'],['E2','E1',2,'ks','E4'],
  ];
  const Metal = makeHeavy(HEAVY, 0.19, { master: 0.72, drive: 6, bassVol: 0.42 });
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
  // "EL CHINO" — chiptune ORIENTAL: melodía PENTATÓNICA (Do mayor pentatónica: C-D-E-G-A) con koto PULSADO + bajo
  // suave + woodblock. Lo pentatónico es lo que da el color oriental. Suena al entrar al súper chino. Original, sin samples.
  const ORIENTAL = [
    ['E5','C3',1],['G5','C3',1],['A5','C3',2],
    ['G5','G2',1],['E5','G2',1],['D5','G2',2],
    ['C5','A2',1],['D5','A2',1],['E5','A2',1],['G5','A2',1],
    ['A5','C3',2],['G5','C3',1],['E5','C3',1],
    ['E5','D3',1],['D5','D3',1],['C5','G2',1],['A4','G2',1],
    ['G4','C3',2],['A4','C3',1],['C5','C3',1],
    ['D5','G2',1],['E5','G2',1],['G5','A2',1],['A5','A2',1],
    ['G5','C3',2],['E5','C3',1],['D5','C3',1],
    ['C5','C3',4],
  ];
  const Oriental = makeTrack(ORIENTAL, 0.25, { leadType:'triangle', leadVol:0.085, bassVol:0.05, bassType:'triangle', staccato:0.85, pluck:true, wood:true, woodVol:0.014 });
  // CUMBIA VILLERA (estilo, homenaje ORIGINAL — no copia temas puntuales): lo que la hace "villera" es la GÜIRA + el
  // BAJO bouncy (tumbao) + la melodía simple de ORGANITO barato. 5 temas distintos → se ponen RANDOM por piso (el
  // edificio de 20 + los subsuelos de la cueva). Suenan en el edificio abandonado (borrachines) y la cueva/galería.
  const V_OPTS = { leadType:'square', leadVol:0.06, bassVol:0.065, staccato:0.55, guira:true };
  const VILLERA_SONGS = [
    // 1 — La menor, bien clásica/bouncy
    [ ['A4','A2',1],['C5','A2',1],['E5','A2',1],['C5','A2',1], ['D5','G2',1],['B4','G2',1],['G4','G2',1],['B4','G2',1],
      ['C5','F2',1],['E5','F2',1],['A5','F2',1],['E5','F2',1], ['D5','E2',1],['C5','E2',1],['B4','E2',1],['A4','E2',1] ],
    // 2 — Do menor, oscura (Bb = A#)
    [ ['G4','C2',1],['G4','C2',1],['A#4','C2',1],['G4','C2',1], ['F4','F2',1],['G4','F2',1],['A#4','F2',1],['C5','F2',1],
      ['C5','G2',1],['A#4','G2',1],['G4','G2',1],['F4','G2',1], ['G4','C2',2],['F4','C2',1],['G4','C2',1] ],
    // 3 — Re menor, cantadita
    [ ['A4','D2',1],['D5','D2',1],['F5','D2',1],['D5','D2',1], ['E5','A2',1],['C5','A2',1],['A4','A2',1],['C5','A2',1],
      ['D5','G2',1],['F5','G2',1],['A5','G2',1],['F5','G2',1], ['E5','A2',1],['D5','A2',1],['C5','A2',1],['A4','A2',1] ],
    // 4 — Sol mayor, festiva
    [ ['G4','G2',1],['B4','G2',1],['D5','G2',1],['B4','G2',1], ['C5','C3',1],['E5','C3',1],['C5','C3',1],['G4','C3',1],
      ['D5','D3',1],['B4','D3',1],['G4','D3',1],['D5','D3',1], ['G4','G2',2],['A4','G2',1],['B4','G2',1] ],
    // 5 — Mi menor, melódica
    [ ['E5','E2',1],['G5','E2',1],['B4','E2',1],['E5','E2',1], ['D5','G2',1],['B4','G2',1],['G4','G2',1],['B4','G2',1],
      ['A4','A2',1],['C5','A2',1],['E5','A2',1],['C5','A2',1], ['B4','E2',1],['A4','E2',1],['G4','E2',1],['E4','E2',1] ],
  ];
  const VILLERA = VILLERA_SONGS.map(s => makeTrack(s, 0.2, V_OPTS));
  const ROOM = { metal: Metal, dance: Dance, telo: Telo, chino: Oriental };
  VILLERA.forEach((t, i) => { ROOM['villera' + i] = t; });
  let musicWanted = false, cumbiaActive = false, marchaActive = false, himnoActive = false, violetaActive = false;

  return {
    init() { ensure(); },
    __ctx() { return ctx; },   // superficie de prueba (validación de audio en navegador)
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
      hum.connect(f); f.connect(humGain); humGain.connect(master);
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
      amb.connect(f); f.connect(g); g.connect(master);
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
      if (on && !marchaActive) { marchaActive = true; Music.stop(); Cumbia.stop(); Himno.stop(); cumbiaActive = false; himnoActive = false; Marcha.start(); }
      else if (!on && marchaActive) { marchaActive = false; Marcha.stop(); if (musicWanted) Music.start(); }
    },
    himnoCoda() {   // toca UNA VEZ el cierre "o juremos con gloria morir" como CAMPANA (Cabildo, al repicar de nuevo)
      const c = ensure(); let t0 = c.currentTime + 0.04; const beat = 0.26;
      for (const [n, b] of HIMNO_CODA) { const dur = (b || 1) * beat;
        if (n) { voice(nf(n), t0, dur * 0.95, 'square', 0.09, true); voice(nf(n) * 2, t0, dur * 0.6, 'triangle', 0.03, true); }
        t0 += dur; }
    },
    setHimno(on) {   // Himno Nacional Argentino (Obelisco: al llegar; silencio tenso durante la pelea del satélite)
      if (on && !himnoActive) { himnoActive = true; Music.stop(); Cumbia.stop(); Marcha.stop(); cumbiaActive = false; marchaActive = false; Himno.start(); }
      else if (!on && himnoActive) { himnoActive = false; Himno.stop(); if (musicWanted) Music.start(); }
    },
    setVioleta(on) {   // EL CANTO DE LA POPULAR de Dálmine (Campana, §12: la banda en la calle + el estadio)
      if (on && !violetaActive) { violetaActive = true; Music.stop(); Cumbia.stop(); Marcha.stop(); Himno.stop(); cumbiaActive = false; marchaActive = false; himnoActive = false; Violeta.start(); }
      else if (!on && violetaActive) { violetaActive = false; Violeta.stop(); if (musicWanted) Music.start(); }
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
    // CUMBIA VILLERA random-por-piso: el índice (nº de sala) elige uno de los 5 temas, estable por piso pero distinto entre pisos.
    setVillera(i) { const n = VILLERA.length; this.setRoomTrack('villera' + ((((i | 0) % n) + n) % n)); },
    setVolume, getVolume: () => masterVol,   // specs/configuracion.md: volumen general (config.js lo llama al cargar/cambiar)
  };
})();
