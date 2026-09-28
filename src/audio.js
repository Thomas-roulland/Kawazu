// Sons et musique du jeu, synthétisés avec la Web Audio API (aucun fichier).
// - Une musique lo-fi chill qui tourne en continu : piano électrique, basse ronde, kalimba, batterie feutrée
//   et craquements de vinyle. En combat, le tempo monte un peu et la batterie se réveille.
// - Des bruitages plus doux, passés dans une petite réverbération : bâton, kunaï, impacts, butin, niveau…
// - L'ambiance du marais au camp (rainettes, grillons, gouttes).
// - Une musique 8 bits (chiptune) pour la cinématique de l'accueil, calée sur le film (voir seek et intensity).
// Les navigateurs n'autorisent le son qu'après un clic ou une touche : tout démarre à ce moment-là.
var Sfx = (function () {
  var VOLUME = 0.55, MUSIC = 0.42;
  var EPIC_MUSIC = 0.6;
  var ac = null, master = null, sfxBus = null, musicBus = null, musicGain = null, reverb = null, warm = null;
  var muted = false;
  try { muted = localStorage.getItem('kawazu.muted') === '1'; } catch (e) { /* ignoré */ }

  function gainNode(v, to) { var g = ac.createGain(); g.gain.value = v; if (to) g.connect(to); return g; }
  function filter(type, f, q, to) { var b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 0.7; if (to) b.connect(to); return b; }

  // Réverbération : une réponse impulsionnelle de bruit qui s'éteint doucement
  function impulse(sec, decay) {
    var len = Math.floor(ac.sampleRate * sec), buf = ac.createBuffer(2, len, ac.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function build() {
    var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    comp.connect(ac.destination);
    var noRumble = filter('highpass', 80, 0.7, comp);
    master = gainNode(muted ? 0 : VOLUME, noRumble);
    reverb = ac.createConvolver();
    reverb.buffer = impulse(2.6, 2.4);
    reverb.connect(gainNode(0.5, master));
    sfxBus = gainNode(1, master);
    sfxBus.connect(gainNode(0.16, reverb));
    // la musique passe par un filtre passe-bas : c'est ce qui lui donne son côté feutré
    musicGain = gainNode(0, master);
    warm = filter('lowpass', 2600, 0.5, musicGain);
    musicBus = gainNode(1, warm);
    musicBus.connect(gainNode(0.32, reverb));
  }

  function ensure() {
    if (!ac) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      build();
    }
    if (ac.state === 'suspended') ac.resume();
    if (want && !mus.timer) startMusic();
    return ac;
  }
  ['pointerdown', 'keydown'].forEach(function (ev) { window.addEventListener(ev, ensure, { passive: true }); });

  // ---------- Briques de son ----------
  // Note : fréquence (qui peut glisser), forme d'onde, volume, attaque, désaccord
  function note(dest, t, f, dur, type, vol, attack, f1, detune) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (f1 && f1 !== f) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    if (detune) o.detune.value = detune;
    var a = attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.01, dur));
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  var noiseBuf = null;
  function getNoise() {
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  // Souffle filtré ; le filtre peut balayer de f0 à f1
  function hiss(dest, t, dur, vol, type, f0, f1, q, attack) {
    var src = ac.createBufferSource(), flt = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = getNoise();
    flt.type = type || 'bandpass';
    flt.frequency.setValueAtTime(f0, t);
    if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    flt.Q.value = q || 1;
    var a = attack || 0.003;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(dest);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  }
  // Cloche douce : fondamentale + partiels inharmoniques (kalimba, lucioles, butin)
  function bell(dest, t, f, dur, vol) {
    note(dest, t, f, dur, 'sine', vol, 0.003);
    note(dest, t, f * 2.76, dur * 0.35, 'sine', vol * 0.22, 0.002);
    note(dest, t, f * 5.4, dur * 0.12, 'sine', vol * 0.08, 0.001);
  }
  var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };

  // ---------- Bruitages ----------
  var S = function () { return { d: sfxBus, t: ac.currentTime + 0.005 }; };
  var sounds = {
    swing: function () { var s = S(); hiss(s.d, s.t, 0.22, 0.45, 'bandpass', 500, 2600, 1.4, 0.04); note(s.d, s.t, 200, 0.09, 'sine', 0.15, 0.01, 120); },
    throw: function () { var s = S(); hiss(s.d, s.t, 0.14, 0.3, 'bandpass', 2500, 7000, 2, 0.02); note(s.d, s.t + 0.02, 2400, 0.25, 'sine', 0.05); note(s.d, s.t + 0.02, 3710, 0.18, 'sine', 0.03); },
    clink: function () { var s = S(); [2100, 3290, 4870].forEach(function (f, i) { note(s.d, s.t, f, 0.35 - i * 0.08, 'sine', 0.08 / (i + 1)); }); },
    hit: function () { var s = S(); note(s.d, s.t, 190, 0.12, 'sine', 0.4, 0.002, 100); hiss(s.d, s.t, 0.08, 0.35, 'lowpass', 2200, 500, 0.8); },
    kill: function () { var s = S(); note(s.d, s.t, 220, 0.14, 'sine', 0.35, 0.002, 110); hiss(s.d, s.t, 0.25, 0.3, 'lowpass', 3000, 200, 0.8); [880, 660, 520].forEach(function (f, i) { note(s.d, s.t + 0.08 + i * 0.07, f, 0.12, 'sine', 0.12, 0.004, f * 0.6); }); },
    cut: function () { var s = S(); hiss(s.d, s.t, 0.12, 0.3, 'highpass', 2500, 6000, 0.8, 0.01); },
    hurt: function () { var s = S(); note(s.d, s.t, 200, 0.12, 'sine', 0.35, 0.002, 110); note(s.d, s.t, 420, 0.22, 'triangle', 0.12, 0.005, 200); hiss(s.d, s.t, 0.1, 0.2, 'lowpass', 1500, 300); },
    pickup: function () { var s = S(); [76, 81, 88].forEach(function (m, i) { bell(s.d, s.t + i * 0.08, mtof(m), 0.6, 0.16); }); },
    heart: function () { var s = S(); bell(s.d, s.t, mtof(81), 0.5, 0.15); bell(s.d, s.t + 0.1, mtof(86), 0.7, 0.15); },
    levelup: function () {
      var s = S();
      [72, 76, 79, 84, 88].forEach(function (m, i) { bell(s.d, s.t + i * 0.09, mtof(m), 0.9, 0.14); });
      [60, 64, 67, 71].forEach(function (m) { note(s.d, s.t + 0.35, mtof(m), 1.6, 'triangle', 0.05, 0.25); });
      hiss(s.d, s.t + 0.3, 1.2, 0.05, 'highpass', 7000, 11000, 0.5, 0.3);
    },
    ladder: function () { var s = S(); [67, 71, 74, 79].forEach(function (m, i) { bell(s.d, s.t + i * 0.06, mtof(m), 0.4, 0.12); }); hiss(s.d, s.t, 0.4, 0.12, 'bandpass', 400, 2400, 1, 0.1); },
    boss: function () {
      var s = S();
      // gong : un coup franc qui résonne, sans basse qui gronde
      [220, 331, 452, 697].forEach(function (f, i) { note(s.d, s.t, f, 1.6 - i * 0.3, 'sine', 0.16 / (i + 1), 0.004); });
      hiss(s.d, s.t, 0.3, 0.15, 'bandpass', 900, 400, 0.8);
    },
    bossDown: function () {
      var s = S();
      note(s.d, s.t, 260, 0.5, 'sine', 0.3, 0.005, 130); hiss(s.d, s.t, 0.6, 0.25, 'lowpass', 2500, 400);
      [72, 76, 79, 84].forEach(function (m, i) { bell(s.d, s.t + 0.7 + i * 0.11, mtof(m), 1, 0.15); });
    },
    ko: function () { var s = S(); [67, 64, 60, 55].forEach(function (m, i) { note(s.d, s.t + i * 0.22, mtof(m), 0.5, 'triangle', 0.14, 0.01, mtof(m) * 0.98); }); },
    click: function () { var s = S(); note(s.d, s.t, 900, 0.04, 'sine', 0.04, 0.002, 650); hiss(s.d, s.t, 0.015, 0.015, 'highpass', 4000); },
    equip: function () { var s = S(); hiss(s.d, s.t, 0.12, 0.1, 'bandpass', 1200, 3000, 0.8, 0.02); [2600, 3900].forEach(function (f, i) { note(s.d, s.t + 0.08, f, 0.2, 'sine', 0.03 / (i + 1)); }); },
    point: function () { var s = S(); note(s.d, s.t, 420, 0.14, 'sine', 0.22, 0.004, 900); },
    // ambiance du marais
    // petite rainette : deux « pîp » aigus et doux (plus de coassement grave)
    peep: function () { var s = S(), f = 2200 + Math.random() * 500; for (var i = 0; i < 2; i++) note(s.d, s.t + i * 0.13, f, 0.07, 'sine', 0.03, 0.01, f * 1.12); },
    cricket: function () { var s = S(); for (var i = 0; i < 4; i++) note(s.d, s.t + i * 0.055, 4600, 0.035, 'sine', 0.025, 0.004); },
    drip: function () { var s = S(); note(s.d, s.t, 1500, 0.1, 'sine', 0.08, 0.002, 600); },
    // cinématique de l'accueil
    page: function () { var s = S(); hiss(s.d, s.t, 0.32, 0.13, 'bandpass', 3400, 1100, 0.9, 0.09); hiss(s.d, s.t + 0.26, 0.07, 0.07, 'highpass', 5200); },
    whoosh: function () { var s = S(); hiss(s.d, s.t, 0.42, 0.2, 'bandpass', 350, 3200, 1.1, 0.3); },
    impact: function () {
      var s = S();
      note(s.d, s.t, 170, 0.4, 'triangle', 0.7, 0.002, 40);
      hiss(s.d, s.t, 0.35, 0.3, 'lowpass', 4000, 300, 0.8);
      stab(s.d, s.t, [50, 57, 62, 65], 0.45, 0.05);
    },
    slam: function () {
      var s = S();
      note(s.d, s.t, 160, 0.9, 'triangle', 0.8, 0.002, 36);
      hiss(s.d, s.t, 0.6, 0.35, 'lowpass', 5000, 250, 0.8);
      hiss(s.d, s.t, 2, 0.14, 'highpass', 5000, 3000, 0.6);
      stab(s.d, s.t, [62, 65, 69, 74, 77], 1.8, 0.05);
      stab(s.d, s.t, [38, 50], 1.2, 0.09, 'tri');
    },
    // montée : du souffle qui s'ouvre et une note carrée qui grimpe en tremblant
    riser: function () {
      var s = S(), g = gainNode(1, s.d);
      hiss(s.d, s.t, 3, 0.2, 'bandpass', 500, 7000, 1.2, 2.85);
      g.gain.setValueAtTime(0.0001, s.t); g.gain.exponentialRampToValueAtTime(0.045, s.t + 2.8); g.gain.linearRampToValueAtTime(0.0001, s.t + 3);
      var o = chipOsc(0.25, 55, s.t, s.t + 3, g), vib = ac.createOscillator(), vg = gainNode(40);
      o.frequency.exponentialRampToValueAtTime(mtof(91), s.t + 3);
      vib.frequency.value = 14; vib.connect(vg); vg.connect(o.detune); vib.start(s.t); vib.stop(s.t + 3.05);
    },
    glint: function () { var s = S(); bell(s.d, s.t, mtof(96), 1.2, 0.07); bell(s.d, s.t + 0.06, mtof(103), 1, 0.045); hiss(s.d, s.t, 0.5, 0.035, 'highpass', 9000, null, 0.5, 0.02); }
  };
  // Un accord plaqué en ondes carrées (ou triangle), qui s'éteint
  function stab(dest, t, notes, dur, vol, duty) {
    var g = ac.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(dest);
    notes.forEach(function (m) { chipOsc(duty || 0.25, m, t, t + dur, g); });
  }

  function play(name) {
    if (muted || !sounds[name]) return;
    if (!ensure()) return;
    sounds[name]();
  }

  // ---------- Musique lo-fi ----------
  // Huit mesures en do : Fa7M, Mim7, Rém7, Do7M, Fa7M, Mim7, Lam7, Sol7sus — assez de couleurs pour ne pas lasser.
  var PROG = [
    { bass: 41, ch: [53, 57, 60, 64] }, { bass: 40, ch: [52, 55, 59, 62] }, { bass: 38, ch: [50, 53, 57, 60, 64] }, { bass: 36, ch: [48, 52, 55, 59, 62] },
    { bass: 41, ch: [53, 57, 60, 64, 67] }, { bass: 40, ch: [52, 55, 59, 62] }, { bass: 45, ch: [57, 60, 64, 67] }, { bass: 43, ch: [55, 60, 62, 65] }
  ];
  var SCALE = [72, 74, 76, 79, 81, 84, 86];
  var MODES = { calm: { bpm: 72, drums: 0.7, melody: 0.32 }, battle: { bpm: 86, drums: 1, melody: 0.42 }, epic: { bpm: 100 } };
  var want = 'calm', mus = { timer: 0, next: 0, step: 0, mel: 2, level: 0, wait: false };

  // Piano électrique : une fondamentale ronde et un « tine » brillant qui s'éteint vite, légèrement désaccordés
  function epiano(t, m, dur, vol) {
    var f = mtof(m), wob = (Math.random() - 0.5) * 8;
    note(musicBus, t, f, dur, 'sine', vol, 0.012, null, wob);
    note(musicBus, t, f * 2, dur * 0.45, 'sine', vol * 0.18, 0.004, null, wob + 3);
    note(musicBus, t, f, dur * 0.8, 'triangle', vol * 0.12, 0.02, null, -wob);
  }
  function kick(t, v) { note(musicBus, t, 140, 0.14, 'sine', 0.3 * v, 0.002, 75); }
  function snare(t, v) { hiss(musicBus, t, 0.2, 0.16 * v, 'bandpass', 1900, 1200, 0.9); note(musicBus, t, 190, 0.07, 'triangle', 0.08 * v, 0.002, 140); }
  function hat(t, v) { hiss(musicBus, t, 0.05, 0.05 * v, 'highpass', 7500, null, 0.7); }

  function playStep(step, t, beat) {
    var mode = MODES[want] || MODES.calm, bar = Math.floor(step / 8), e8 = step % 8, P = PROG[bar];
    var strum = function (notes, dur, vol) { notes.forEach(function (m, i) { epiano(t + i * 0.018, m, dur, vol); }); };
    if (e8 === 0) { strum(P.ch, beat * 3.4, 0.06); note(musicBus, t, mtof(P.bass + 12), beat * 1.9, 'sine', 0.13, 0.02); note(musicBus, t, mtof(P.bass + 12), beat * 0.6, 'triangle', 0.03, 0.01); }
    if (e8 === 5) { strum(P.ch.slice(-3), beat * 1.3, 0.04); note(musicBus, t, mtof(P.bass + 12 + (bar % 2 ? 7 : 0)), beat * 0.9, 'sine', 0.1, 0.02); }
    if (e8 === 7 && bar % 4 === 3) note(musicBus, t, mtof(P.bass + 22), beat * 0.4, 'sine', 0.08, 0.02);
    // batterie « boom bap » feutrée
    var d = mode.drums;
    if (e8 === 0 || e8 === 5 || (e8 === 3 && bar % 2)) kick(t, d);
    if (e8 === 2 || e8 === 6) snare(t, d * (want === 'battle' ? 1 : 0.7));
    hat(t, d * (e8 % 2 ? 0.55 : 1) * (0.7 + Math.random() * 0.4));
    // kalimba : petite mélodie qui se promène dans la gamme, avec un écho
    if (bar % 4 !== 3 || e8 < 4) {
      if (Math.random() < mode.melody * (e8 % 2 ? 0.7 : 1)) {
        mus.mel = Math.max(0, Math.min(SCALE.length - 1, mus.mel + [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)]));
        var f = mtof(SCALE[mus.mel]);
        bell(musicBus, t, f, 1.2, 0.07);
        bell(musicBus, t + beat * 0.75, f, 0.9, 0.022);
      }
    }
  }

  // ---------- Musique 8 bits (la cinématique de l'accueil) ----------
  // Une bande-son façon console : ondes carrées, basse triangle, batterie de bruit blanc, en ré avec la couleur
  // « ninja » du mi bémol. 100 BPM, en doubles croches. Des couches qu'on ajoute une à une avec intensity(),
  // pour suivre le film : 0 arpège mystérieux et un battement de taïko ; 1 la basse pulse, les taïkos roulent ;
  // 2 le thème à l'onde carrée, batterie complète ; 3 tout à fond, thème doublé, roulements et cymbales ;
  // -1 le souffle retenu avant le titre (le thème tient sa dernière note, plus rien ne frappe).
  var EPIC = [
    { root: 38, ch: [62, 65, 69], mel: [[0, 74, 2], [2, 74, 2], [4, 75, 2], [6, 74, 2], [8, 81, 6], [14, 79, 2]] }, // Rém
    { root: 39, ch: [63, 67, 70], mel: [[0, 77, 4], [4, 75, 4], [8, 70, 4], [12, 74, 4]] },                         // Mib
    { root: 38, ch: [62, 65, 69], mel: [[0, 74, 2], [2, 74, 2], [4, 75, 2], [6, 74, 2], [8, 86, 6], [14, 84, 2]] }, // Rém
    { root: 36, ch: [60, 64, 67], mel: [[0, 82, 4], [4, 81, 4], [8, 79, 6], [14, 81, 2]] },                         // Do
    { root: 34, ch: [58, 62, 65], mel: [[0, 82, 6], [6, 81, 2], [8, 82, 4], [12, 84, 4]] },                         // Sib
    { root: 36, ch: [60, 64, 67], mel: [[0, 84, 6], [6, 82, 2], [8, 81, 4], [12, 79, 4]] },                         // Do
    { root: 38, ch: [62, 65, 69], mel: [[0, 81, 4], [4, 77, 4], [8, 75, 4], [12, 77, 4]] },                         // Rém
    { root: 33, ch: [61, 64, 69], mel: [[0, 74, 8], [8, 73, 8]] }                                                   // La : appelle le retour en ré
  ];
  // Ondes carrées au rapport cyclique réglable (12,5 %, 25 %, 50 %), comme sur les vieilles consoles
  var WAVES = {};
  function pulseWave(duty) {
    if (!WAVES[duty]) {
      var n = 40, re = new Float32Array(n), im = new Float32Array(n);
      for (var k = 1; k < n; k++) { re[k] = Math.sin(2 * Math.PI * k * duty) / (Math.PI * k); im[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (Math.PI * k); }
      WAVES[duty] = ac.createPeriodicWave(re, im);
    }
    return WAVES[duty];
  }
  function chipOsc(duty, m, t, end, dest) {
    var o = ac.createOscillator();
    if (duty === 'tri') o.type = 'triangle'; else o.setPeriodicWave(pulseWave(duty));
    o.frequency.value = mtof(m);
    o.connect(dest); o.start(t); o.stop(end + 0.05);
    return o;
  }
  // Une note « puce » : attaque sèche, petite retombée, tenue, relâche courte ; vibrato sur les notes longues
  function chip(dest, duty, m, t, dur, vol, vib) {
    var g = ac.createGain(), end = t + dur, dec = t + Math.min(dur * 0.5, 0.1), rel = Math.max(dec, end - 0.03);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.linearRampToValueAtTime(vol * 0.7, dec);
    g.gain.setValueAtTime(vol * 0.7, rel);
    g.gain.linearRampToValueAtTime(0.0001, end);
    g.connect(dest);
    var o = chipOsc(duty, m, t, end, g);
    if (vib && dur > 0.35) {
      var lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(22, t + 0.35);
      lfo.connect(lg); lg.connect(o.detune); lfo.start(t); lfo.stop(end + 0.05);
    }
  }
  // Écho en croche pointée : le thème et l'arpège y passent, comme sur les jeux 16 bits
  var echo = null;
  function echoBus() {
    if (!echo) {
      echo = gainNode(1, musicBus);
      var d = ac.createDelay(1), fb = gainNode(0.32), lp = filter('lowpass', 2400, 0.7);
      d.delayTime.value = 0.45;
      echo.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(gainNode(0.45, musicBus));
    }
    return echo;
  }
  // Batterie de bruit blanc et de triangle
  function ckick(t, v) { note(musicBus, t, 180, 0.13, 'triangle', 0.75 * v, 0.002, 45); hiss(musicBus, t, 0.02, 0.15 * v, 'lowpass', 3000); }
  function csnare(t, v) { hiss(musicBus, t, 0.15, 0.7 * v, 'bandpass', 2600, 1500, 0.6); note(musicBus, t, 230, 0.06, 'triangle', 0.3 * v, 0.002, 140); }
  function chat(t, v, open) { hiss(musicBus, t, open ? 0.16 : 0.035, 0.22 * v, 'highpass', 8000, null, 0.8); }
  function ctom(t, v, m) { note(musicBus, t, mtof(m), 0.24, 'triangle', 0.65 * v, 0.002, mtof(m - 12)); } // le taïko des consoles
  function ccrash(t) { hiss(musicBus, t, 1.4, 0.4, 'highpass', 5000, 3000, 0.6); }

  function playEpic(step, t, beat) {
    var I = mus.level, bar = Math.floor(step / 16), s = step % 16, P = EPIC[bar], q = beat / 4, phraseEnd = bar % 4 === 3;
    // le thème : il chante dès l'intensité 2, et tient sa note pendant le souffle retenu
    if (I >= 2 || I < 0) P.mel.forEach(function (n) {
      if (n[0] !== s) return;
      chip(echoBus(), 0.25, n[1], t, n[2] * q * 0.95, 0.2, true);
      if (I >= 3) chip(musicBus, 0.125, n[1] - 12, t, n[2] * q * 0.95, 0.12);
    });
    if (I < 0) return;
    // l'arpège : en croches, discret, au début ; en doubles croches ensuite
    var arp = [P.ch[0], P.ch[1], P.ch[2], P.ch[0] + 12];
    if (I === 0 ? s % 2 === 0 : true) chip(echoBus(), 0.125, arp[(I === 0 ? s / 2 : s) % 4] + (I >= 3 ? 12 : 0), t, q * 0.9, I === 0 ? 0.16 : 0.13);
    if (I === 0) { if (s === 0) ctom(t, 0.5, 45); return; }
    // la basse triangle : elle pulse sur la fondamentale, puis saute d'octave
    if (s % 2 === 0) chip(musicBus, 'tri', P.root + 12 + (I >= 2 && (s / 2) % 2 ? 12 : 0), t, q * 1.7, 0.12);
    if (I === 1) { if (s === 0 || s === 6 || s === 12) ctom(t, s ? 0.75 : 1, 45); chat(t, s % 4 === 2 ? 0.8 : 0.35); return; }
    // batterie complète
    if (s === 0 || s === 6 || s === 10 || (I >= 3 && s === 8)) ckick(t, 1);
    if (s === 4 || s === 12) csnare(t, 1);
    if (I >= 3 && s === 14) csnare(t, 0.45);
    var hv = s % 4 === 2 ? 0.9 : (I >= 3 ? 0.45 : (s % 2 ? 0 : 0.5));
    if (hv) chat(t, hv, I >= 3 && s === 14);
    if (I >= 3 && phraseEnd && s >= 8) csnare(t, 0.3 + (s - 8) * 0.08); // roulement avant la phrase suivante
    if (I >= 3 && s === 0 && bar % 4 === 0) ccrash(t);
    if (s === 0 || s === 6 || s === 12) ctom(t, 0.45, I >= 3 ? 50 : 45);
  }

  function schedule() {
    if (!ac || mus.wait) return;
    var epic = want === 'epic', beat = 60 / (MODES[want] || MODES.calm).bpm, len = epic ? EPIC.length * 16 : PROG.length * 8;
    if (mus.next < ac.currentTime) {
      if (epic) while (mus.next < ac.currentTime) { mus.next += beat / 4; mus.step = (mus.step + 1) % len; } // on garde la grille du film
      else mus.next = ac.currentTime + 0.05; // onglet en arrière-plan : on repart proprement
    }
    while (mus.next < ac.currentTime + 0.3) {
      if (!muted && want) (epic ? playEpic : playStep)(mus.step, mus.next, beat);
      mus.next += epic ? beat / 4 : (mus.step % 2 === 0 ? beat * 0.58 : beat * 0.42); // swing, sauf l'épique (doubles croches droites)
      mus.step = (mus.step + 1) % len;
    }
  }

  // Craquements de vinyle en boucle
  function startCrackle() {
    var len = ac.sampleRate * 3, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() < 0.0004 ? (Math.random() * 2 - 1) * 0.7 : 0) + (Math.random() * 2 - 1) * 0.015;
    var src = ac.createBufferSource();
    src.buffer = buf; src.loop = true;
    src.connect(filter('highpass', 900, 0.5, gainNode(0.35, musicBus)));
    src.start();
  }

  function startMusic() {
    if (mus.timer || !ac) return;
    mus.next = ac.currentTime + 0.15;
    mus.step = 0;
    if (want !== 'epic') startCrackle();
    warm.frequency.value = want === 'epic' ? 9000 : 2600; // l'épique garde tout son éclat
    musicGain.gain.setValueAtTime(0, ac.currentTime);
    musicGain.gain.linearRampToValueAtTime(want === 'epic' ? EPIC_MUSIC : MUSIC, ac.currentTime + (want === 'epic' ? 0.6 : 4));
    mus.timer = setInterval(schedule, 60);
  }
  // mode : 'calm' (menus), 'battle' (combat), 'epic' (cinématique). follow : la musique attend que seek() lui
  // dise où en est le film avant de jouer.
  function music(mode, follow) {
    var changed = want !== mode;
    want = mode;
    if (follow) mus.wait = true;
    if (ac && !mus.timer) startMusic();
    if (changed && ac && mus.timer) { mus.step = 0; mus.mel = 2; }
  }

  // Latence de sortie : ce qui est programmé maintenant s'entend un peu plus tard
  function latency() { return ac.outputLatency || ac.baseLatency || 0; }
  // L'horloge du son (s), quand il tourne : le film s'y cale pour rester synchrone avec la musique
  function clock() { return ac && ac.state === 'running' ? ac.currentTime - latency() : null; }
  // La musique épique rejoint le film : ft est le moment du film (s) affiché à l'instant. Renvoie l'instant de
  // clock() où le film a commencé ; le film suit ensuite clock() - origine, la musique retombe sur ses temps.
  function seek(ft) {
    if (!ac) return null;
    var e = 15 / MODES.epic.bpm, origin = ac.currentTime + 0.12 - latency() - ft; // le film attend 0,12 s : le premier temps n'est pas perdu
    var n = Math.ceil((ac.currentTime + 0.06 - origin) / e);
    mus.step = n % (EPIC.length * 16); mus.next = origin + n * e; mus.wait = false;
    return origin;
  }
  function intensity(n) { mus.level = n; }

  // Ambiance du camp : coassements, grillons et gouttes au hasard tant qu'elle est active
  var ambientTimer = 0;
  function ambient(on) {
    clearTimeout(ambientTimer);
    if (!on) return;
    (function loop() {
      var r = Math.random();
      if (ac && !muted) play(r < 0.3 ? 'peep' : (r < 0.8 ? 'cricket' : 'drip'));
      ambientTimer = setTimeout(loop, 1500 + Math.random() * 3000);
    })();
  }

  function toggle() {
    muted = !muted;
    try { localStorage.setItem('kawazu.muted', muted ? '1' : '0'); } catch (e) { /* ignoré */ }
    if (ensure()) master.gain.setTargetAtTime(muted ? 0 : VOLUME, ac.currentTime, 0.05);
    return muted;
  }

  // ---------- Voix « animalese », façon Animal Crossing ----------
  // Chaque lettre devient une petite syllabe chantée très vite : une onde en dent de scie passée dans deux filtres
  // (les formants de la voyelle), plus un petit souffle ou un claquement pour certaines consonnes.
  var FORMANTS = { a: [800, 1250], e: [420, 2100], i: [300, 2600], o: [520, 900], u: [340, 760], y: [300, 2400] };
  function syllable(dest, t, ch, pitch) {
    var l = ch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!/[a-z]/.test(l)) return;
    var vowel = FORMANTS[l], fm = vowel || FORMANTS['aeiou'[l.charCodeAt(0) % 5]];
    var f0 = pitch * (vowel ? 1 : 1.1) * (0.93 + Math.random() * 0.14);
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0 * 1.08, t);
    o.frequency.exponentialRampToValueAtTime(f0, t + 0.05);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
    // deux formants assez larges pour garder du corps, plus un peu de la voix brute (filtrée) pour qu'elle porte
    var b1 = filter('bandpass', fm[0], 2.2, g), b2 = filter('bandpass', fm[1], 3, gainNode(0.7, g)), raw = filter('lowpass', 2400, 0.7, gainNode(0.18, g));
    o.connect(b1); o.connect(b2); o.connect(raw); g.connect(dest);
    o.start(t); o.stop(t + 0.09);
    if (/[sfczjxv]/.test(l)) hiss(dest, t, 0.045, 0.05, 'highpass', 4200);        // chuintantes
    else if (/[ptkbdgq]/.test(l)) hiss(dest, t, 0.018, 0.07, 'bandpass', 1800, null, 1.5); // plosives
  }
  // Dit une phrase ; renvoie le moment (ms) où chaque caractère est prononcé, pour écrire la bulle en même temps,
  // et de quoi couper la voix si on quitte la boutique en pleine phrase.
  function animalese(text, opts) {
    opts = opts || {};
    var gap = opts.gap || 0.06, pitch = opts.pitch || 220, chars = Array.from(text), times = [], t = 0;
    chars.forEach(function (ch) { times.push(t * 1000); t += /[.!?…]/.test(ch) ? gap * 4 : (/[ ,;:]/.test(ch) ? gap * 1.4 : gap); });
    var voice = null, end = t;
    if (!muted && ensure()) {
      voice = gainNode(1.4, sfxBus);
      var t0 = ac.currentTime + 0.04;
      chars.forEach(function (ch, i) { syllable(voice, t0 + times[i] / 1000, ch, pitch); });
      // la musique se fait discrète le temps de la phrase
      musicGain.gain.setTargetAtTime(MUSIC * 0.3, ac.currentTime, 0.08);
      musicGain.gain.setTargetAtTime(MUSIC, t0 + end + 0.2, 0.4);
    }
    return {
      times: times,
      stop: function () {
        if (!voice) return;
        voice.gain.setValueAtTime(0, ac.currentTime);
        musicGain.gain.cancelScheduledValues(ac.currentTime);
        musicGain.gain.setTargetAtTime(MUSIC, ac.currentTime, 0.3);
      }
    };
  }

  return {
    animalese: animalese, play: play, ambient: ambient, music: music, toggle: toggle, isMuted: function () { return muted; },
    seek: seek, intensity: intensity, clock: clock, running: function () { return !!ac && ac.state === 'running'; }
  };
})();
