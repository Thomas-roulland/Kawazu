// Page d'accueil : une cinématique en pixel art qui raconte l'histoire de la grenouille (avec les vrais décors
// du jeu), montée sur une musique épique, puis l'écran titre. En haut à droite, le compte : connexion, inscription, et les grenouilles du compte.
// Les phrases de la cinématique sont provisoires : elles attendent le lore.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var W = 320, H = 180;
  var sp = buildKawazu();
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]; }); };
  var mk = function (w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // ---------- La grenouille, dans ses différents habits ----------
  function frogSet(skin, equip, hermit) {
    var saved = [heroSkin, playerHermit];
    heroSkin = skinOf(skin); playerHermit = !!hermit;
    var an = buildKawazuAnims(dressKawazu(sp, lookFor(equip))), pal = paletteFor(sp.PAL, equip);
    var imgs = function (frames) { return frames.map(function (g) { return g ? gridToCanvas(g, pal) : null; }); };
    var set = { face: imgs(an.idle.frames), side: imgs(an.idleRight.frames), atk: imgs(an.attack.frames), fx: imgs(an.attack.fx) };
    heroSkin = saved[0]; playerHermit = saved[1];
    return set;
  }
  var HERO = frogSet('marais', DEFAULT_EQUIP, false);
  var FIGHTERS = [
    { name: 'baton', set: frogSet('marais', DEFAULT_EQUIP, false) },
    { name: 'kunai', set: frogSet('lagune', Object.assign({}, DEFAULT_EQUIP, { arme: 'kunai_acier' }), false), kunai: kunaiProjectileImgs(ITEMS.kunai_acier.blade).right },
    { name: 'ermite', set: frogSet('marais', DEFAULT_EQUIP, true) }
  ];
  var LIMON = SPECIES.limon.frames.map(function (f) { return stringsToCanvas(f, SPECIES.limon.pal); });
  var LIMON_HIT = SPECIES.limon.frames.map(function (f) { return stringsToCanvas(f, SPECIES.limon.pal, false, true); });

  // ---------- Décors ----------
  var camps = {};
  function campFrame(id, t, hero) {
    if (!camps[id]) {
      var L = {}, cv = {};
      ['back', 'mid', 'front'].forEach(function (k) { cv[k] = mk(W, H); L[k] = cv[k].getContext('2d'); });
      camps[id] = { stat: CampScene.buildStatic(id), L: L, cv: cv, out: mk(W, H) };
    }
    var c = camps[id];
    CampScene.draw(c.L, c.stat, t, hero || null, null);
    var o = c.out.getContext('2d');
    o.clearRect(0, 0, W, H);
    ['back', 'mid', 'front'].forEach(function (k) { o.drawImage(c.cv[k], 0, 0); });
    return c.out;
  }
  var fogMap = WorldMap.render([0]).canvas; // la carte telle qu'on la découvre : tout sauf le marais sous la brume
  var arena = (function () { // le sol d'un combat
    var w = 20, h = 12, tiles = new Uint8Array(w * h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) tiles[y * w + x] = y < 4 ? RT.WALL : (hash(x, y, 3) < 0.08 ? RT.ALT : RT.FLOOR);
    return renderMap({ biome: BIOMES[0], w: w, h: h, tiles: tiles, seed: 7 });
  })();

  // ---------- Le rythme ----------
  // Le film est monté sur la musique épique (100 BPM) : chaque plan dure un nombre entier de temps, et les coupes,
  // les coups et les apparitions tombent sur les taïkos. Quand le son tourne, le film suit l'horloge audio.
  var BEAT = 0.6;
  var clamp01 = function (x) { return Math.max(0, Math.min(1, x)); };
  var ease = function (x) { x = clamp01(x); return x * x * (3 - 2 * x); };
  var easeOut = function (x) { x = clamp01(x); return 1 - Math.pow(1 - x, 3); };
  var rgbOf = function (hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].join(','); };
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // secousses et éclairs : une valeur qui retombe avec le temps du film (now)
  var fx = { shake: 0, shakeT: -9, flash: 0, flashT: -9, flashRgb: '255,255,255', ox: 0, oy: 0 }, now = 0;
  function shake(a) { if (!still) { fx.shake = a; fx.shakeT = now; } }
  function flash(a, rgb) { fx.flash = still ? a * 0.3 : a; fx.flashT = now; fx.flashRgb = rgb || '255,255,255'; }
  function sfx(name) { if (Sfx.running()) Sfx.play(name); } // pas de son avant le premier clic (le navigateur l'interdit)
  // pulsation de la caméra sur les taïkos : croches 0, 3 et 6 de chaque mesure
  function thump(t) {
    var e = (t / (BEAT / 2)) % 8, h = e >= 6 ? 6 : (e >= 3 ? 3 : 0);
    return Math.exp(-(e - h) * BEAT / 2 * 10);
  }
  // un nom qui claque en haut de l'écran (voie, gardien)
  function tag(main, sub, color, dur) {
    var el = $('film-tag');
    el.classList.remove('on');
    void el.offsetWidth; // relance l'animation
    el.innerHTML = main ? '<b>' + esc(main) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') : '';
    el.style.setProperty('--tag', color || '#f3d27a');
    el.style.setProperty('--dur', (dur || 1.1) + 's');
    if (main) el.classList.add('on');
  }

  // ---------- Les combats : trois voies, deux coups chacune, sur les taïkos ----------
  FIGHTERS[0].melee = FIGHTERS[2].melee = true;
  FIGHTERS[0].dmg = [9, 17]; FIGHTERS[1].dmg = [7, 15]; FIGHTERS[2].dmg = [12, 26];
  FIGHTERS.forEach(function (f, i) { f.voie = VOIES[i]; });
  var SEG = 4 * BEAT, IMPACTS = [1.5 * BEAT, 3 * BEAT]; // dans chaque vignette de 4 temps
  var fightCv = mk(W, H), fctx = fightCv.getContext('2d');
  fctx.imageSmoothingEnabled = false;
  function strikeAt(lt) { // l'attaque en cours : elle commence 0,3 s avant l'impact
    for (var k = IMPACTS.length - 1; k >= 0; k--) { var a = lt - (IMPACTS[k] - 0.3); if (a >= 0) return a; }
    return -1;
  }
  function fightFrame(t) {
    var i = Math.min(2, Math.floor(t / SEG)), f = FIGHTERS[i], lt = t - i * SEG;
    fctx.drawImage(arena, 0, 0, W, H, 0, 0, W, H);
    var g = fctx.createRadialGradient(W / 2, 120, 20, W / 2, 120, 200);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
    fctx.fillStyle = g; fctx.fillRect(0, 0, W, H);
    var ground = 150, ex = 206, a = strikeAt(lt), frame = 0, dash = 0, kb = 0, hit = false;
    if (a >= 0 && a < 0.6) {
      frame = a < 0.1 ? 1 : (a < 0.2 ? 2 : (a < 0.5 ? 3 : 0));
      if (f.melee) dash = a < 0.2 ? easeOut(a / 0.2) : (a < 0.45 ? 1 : 1 - ease((a - 0.45) / 0.15)); // bond vers l'ennemi
    }
    IMPACTS.forEach(function (imp, k) { var d = lt - imp; if (d >= 0) { kb += (k ? 16 : 9) * Math.exp(-d * 7); if (d < 0.12) hit = true; } });
    var px = 70 + dash * 70;
    fctx.fillStyle = 'rgba(0,0,0,0.35)';
    fctx.beginPath(); fctx.ellipse(px + 32, ground - 2, 22, 4, 0, 0, Math.PI * 2); fctx.fill();
    fctx.beginPath(); fctx.ellipse(ex + kb + 24, ground - 2, 18, 4, 0, 0, Math.PI * 2); fctx.fill();
    fctx.drawImage(frame ? f.set.atk[frame] : f.set.side[Math.floor(lt * 2) % 2], px, ground - 64, 64, 64);
    if (f.kunai && a >= 0.1 && a < 0.3) fctx.drawImage(f.kunai, px + 50 + (a - 0.1) / 0.2 * 110, ground - 44, 24, 24);
    else if (frame && f.set.fx[frame]) fctx.drawImage(f.set.fx[frame], px + 56, ground - 64, 64, 64);
    fctx.drawImage((hit ? LIMON_HIT : LIMON)[Math.floor(lt / 0.11) % 2], ex + kb, ground - 48, 48, 48);
    // les dégâts qui s'envolent
    IMPACTS.forEach(function (imp, k) {
      var d = lt - imp;
      if (d < 0 || d > 0.7) return;
      var txt = '-' + f.dmg[k] + (k ? '!' : ''), y = Math.round(ground - 54 - d * 40);
      fctx.globalAlpha = 1 - Math.max(0, d - 0.45) / 0.25;
      fctx.font = (k ? 16 : 8) + 'px "Press Start 2P"';
      var x = Math.round(ex + 24 + kb - fctx.measureText(txt).width / 2); // calé sur la grille de la police : net
      fctx.fillStyle = '#1a1c2c'; fctx.fillText(txt, x + 1, y + 1);
      fctx.fillStyle = k ? '#ffd23a' : '#ffffff'; fctx.fillText(txt, x, y);
      fctx.globalAlpha = 1;
    });
    return fightCv;
  }
  function fightCam(t) {
    var lt = t % SEG, p = 0;
    IMPACTS.forEach(function (imp) { if (lt >= imp) p = Math.exp(-(lt - imp) * 9); });
    return { x: 162, y: 104, z: 1.15 + 0.12 * p };
  }

  // ---------- Les gardiens : ils s'abattent sur l'écran, un par temps fort ----------
  var GLOW = ['#e0b43a', '#c9f07a', '#b36ae0', '#ff6a4a', '#7af0d0'];
  var BOSSES = BIOMES.slice(0, 5).map(function (b, i) {
    var s = SPECIES[b.boss.species], pal = Object.assign({}, s.pal, b.boss.pal || {});
    return {
      biome: b, glow: GLOW[i],
      frames: s.frames.map(function (f) { return stringsToCanvas(f, pal); }),
      flash: s.frames.map(function (f) { return stringsToCanvas(f, pal, false, true); })
    };
  });
  var BOSS_D = 2 * BEAT;
  function bossAt(t) { return Math.min(BOSSES.length - 1, Math.floor(t / BOSS_D)); }
  function bossOver(t, v) {
    var i = bossAt(t), B = BOSSES[i], a = t - i * BOSS_D, fw = film.width, fh = film.height;
    ctx.fillStyle = 'rgba(6, 6, 12, 0.55)'; ctx.fillRect(0, 0, fw, fh);
    var size = fh * 0.46, cx = fw / 2 + fx.ox * v.s, cy = fh * 0.52 + fx.oy * v.s;
    var g = ctx.createRadialGradient(cx, cy, size * 0.1, cx, cy, size * 1.1);
    g.addColorStop(0, 'rgba(' + rgbOf(B.glow) + ', 0.5)'); g.addColorStop(1, 'rgba(' + rgbOf(B.glow) + ', 0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, fw, fh);
    // lignes de vitesse qui jaillissent au moment où il tombe
    var la = 0.55 * Math.exp(-a * 4);
    if (la > 0.02) {
      ctx.strokeStyle = 'rgba(255, 255, 255, ' + la.toFixed(3) + ')';
      ctx.lineWidth = Math.max(2, fh / 240);
      ctx.beginPath();
      for (var k = 0; k < 40; k++) {
        var an = k / 40 * Math.PI * 2 + hash(k, i, 4) * 0.2, r0 = size * (0.7 + hash(k, i, 5) * 0.3) + a * fh * 0.8, r1 = r0 + fh * (0.15 + hash(k, i, 6) * 0.25);
        ctx.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); ctx.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1);
      }
      ctx.stroke();
    }
    // le gardien : grossi, il s'écrase à sa taille, blanc sous le choc, puis respire
    var sc = 1 + 0.9 * (1 - easeOut(a / 0.16)), h = size * sc, img = a < 0.1 ? B.flash[0] : B.frames[Math.floor(t * 3.3) % 2];
    var bob = a > 0.2 ? Math.sin(t * 5) * fh * 0.006 : 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath(); ctx.ellipse(cx, cy + size / 2 - fh * 0.01, size * 0.42, size * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = clamp01(a / 0.06);
    ctx.drawImage(img, Math.round(cx - h / 2), Math.round(cy + size / 2 - h + bob), Math.round(h), Math.round(h));
    ctx.globalAlpha = 1;
  }

  // ---------- Le sommet : la grenouille, toute petite, face au Héron Ancestral sous une lune énorme ----------
  var SUMMIT = (function () {
    var back = mk(W, H), b = back.getContext('2d'), front = mk(W, H), f = front.getContext('2d');
    var BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    var set = function (c, x, y, col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); };
    // ciel en bandes tramées
    var stops = [[0, '#070a14'], [70, '#0e1428'], [120, '#1e2744'], [181, '#2c3556']];
    for (var y = 0; y < H; y++) {
      var s = 0; while (y >= stops[s + 1][0]) s++;
      var k = (y - stops[s][0]) / (stops[s + 1][0] - stops[s][0]);
      for (var x = 0; x < W; x++) set(b, x, y, (BAY[y % 4][x % 4] + 0.5) / 16 < k ? stops[s + 1][1] : stops[s][1]);
    }
    for (var i = 0; i < 70; i++) set(b, Math.floor(hash(i, 1, 21) * W), Math.floor(hash(i, 2, 21) * 110), hash(i, 3, 21) < 0.3 ? '#dfe6ff' : '#6d7aa6');
    // la lune, énorme, et son halo
    var MX = 264, MY = 86, R = 44;
    var halo = b.createRadialGradient(MX, MY, R * 0.9, MX, MY, R * 2.3);
    halo.addColorStop(0, 'rgba(200, 212, 255, 0.22)'); halo.addColorStop(1, 'rgba(200, 212, 255, 0)');
    b.fillStyle = halo; b.fillRect(0, 0, W, H);
    var craters = [[-14, -12, 7], [12, 6, 9], [-6, 18, 5], [20, -18, 4], [-24, 8, 4]];
    for (y = MY - R; y <= MY + R; y++) for (x = MX - R; x <= MX + R; x++) {
      var dx = x - MX, dy = y - MY, d = Math.hypot(dx, dy);
      if (d > R) continue;
      var col = (-dx * 0.6 + dy * 0.8) > R * 0.5 ? '#cdd1be' : '#eaeddc';
      craters.forEach(function (c) { if (Math.hypot(dx - c[0], dy - c[1]) < c[2]) col = (dx - c[0]) + (dy - c[1]) > 0 ? '#d8dcc8' : '#c4c8b3'; });
      if (d > R - 1.2) col = '#f6f8ea';
      set(b, x, y, col);
    }
    // crête lointaine, enneigée
    for (x = 0; x < W; x++) {
      var yf = Math.round(126 + 10 * Math.sin(x * 0.045) + 6 * Math.sin(x * 0.13 + 1) + hash(x, 0, 31) * 2);
      for (y = yf; y < H; y++) set(b, x, y, y - yf < 3 && yf < 128 ? (BAY[y % 4][x % 4] < 9 ? '#9aa6c8' : '#5a6690') : (y - yf < 5 ? '#222b4a' : '#1a2240'));
    }
    // crête proche : le rebord de la grenouille, à gauche, et le pic du héron, à droite
    var PTS = [[0, 151], [36, 149], [96, 152], [124, 166], [176, 174], [232, 162], [258, 151], [282, 148], [302, 151], [320, 158]];
    for (x = 0; x < W; x++) {
      var p = 0; while (x > PTS[p + 1][0]) p++;
      var yn = Math.round(PTS[p][1] + (PTS[p + 1][1] - PTS[p][1]) * (x - PTS[p][0]) / (PTS[p + 1][0] - PTS[p][0]) + (hash(x, 5, 31) - 0.5) * 2);
      for (y = yn; y < H; y++) set(f, x, y, y === yn ? '#39456e' : (y === yn + 1 ? '#1c2440' : (hash(x, y, 33) < 0.06 ? '#141a30' : '#0a0d1a')));
    }
    // le héron en ombre chinoise, bordé d'un peu de clair de lune
    function silhouette(rows) {
      var h = rows.length, w = rows[0].length, c = mk(w, h), x2 = c.getContext('2d');
      var solid = function (xx, yy) { return yy >= 0 && yy < h && xx >= 0 && xx < w && rows[yy][xx] !== '.'; };
      for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) if (solid(xx, yy)) set(x2, xx, yy, !solid(xx, yy - 1) || !solid(xx + 1, yy) ? '#27325a' : '#03050b');
      return c;
    }
    var heron = SPECIES.heron.frames.map(silhouette);
    // la grenouille, dans la pénombre
    var frogs = HERO.side.map(function (img) {
      var c = mk(img.width, img.height), x2 = c.getContext('2d');
      x2.drawImage(img, 0, 0);
      x2.globalCompositeOperation = 'source-atop';
      x2.fillStyle = 'rgba(8, 12, 30, 0.45)'; x2.fillRect(0, 0, c.width, c.height);
      return c;
    });
    var snow = [];
    for (i = 0; i < 90; i++) snow.push({ x: hash(i, 7, 41) * W, y: hash(i, 8, 41) * H, v: 30 + hash(i, 9, 41) * 60, s: hash(i, 10, 41) < 0.2 ? 2 : 1 });
    var out = mk(W, H), o = out.getContext('2d');
    var HX = 210, HY = 56;
    return {
      eye: function (down) { return { x: HX + 16 * 3 + 1.5, y: HY + (down ? 5 : 3) * 3 + 1.5 }; },
      draw: function (t, down) {
        o.imageSmoothingEnabled = false;
        o.drawImage(back, 0, 0);
        // brume qui passe devant la lune
        [[70, 90, 6, 0.1], [96, 120, 9, 0.08], [116, 70, 4, 0.12]].forEach(function (m, n) {
          o.fillStyle = 'rgba(170, 182, 225, ' + m[3] + ')';
          var mx = ((n * 97 - t * m[2]) % (W + m[1]) + W + m[1]) % (W + m[1]) - m[1];
          o.fillRect(Math.round(mx), m[0], m[1], 2); o.fillRect(Math.round(mx) + 12, m[0] + 2, m[1] - 24, 1);
        });
        o.drawImage(heron[down ? 1 : 0], HX, HY, 96, 96);
        o.drawImage(front, 0, 0);
        o.drawImage(frogs[Math.floor(t * 2) % 2], 50, 150 - frogs[0].height);
        o.fillStyle = '#dfe6f5';
        snow.forEach(function (p) {
          var x = ((p.x - t * p.v) % (W + 10) + W + 10) % (W + 10) - 5, y = ((p.y + t * p.v * 0.35 + Math.sin(t * 1.3 + p.x) * 3) % H + H) % H;
          o.fillRect(Math.round(x), Math.round(y), p.s, p.s);
        });
        return out;
      }
    };
  })();
  // L'œil qui s'allume, dessiné à l'écran (point de décor -> pixels de l'écran grâce à la vue)
  function eyeGlint(e, v, k, flare) {
    if (k <= 0.01) return;
    var x = (e.x - v.x) * v.s, y = (e.y - v.y) * v.s, r = v.s * 6;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255, 236, 140, ' + (0.9 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255, 200, 60, 0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = 'rgba(255, 246, 200, ' + k.toFixed(3) + ')';
    ctx.fillRect(Math.round(x - v.s / 2), Math.round(y - v.s / 2), Math.ceil(v.s), Math.ceil(v.s));
    if (flare > 0.01) { // éclat horizontal
      var fl = v.s * 30 * flare;
      var lg = ctx.createLinearGradient(x - fl, y, x + fl, y);
      lg.addColorStop(0, 'rgba(255, 240, 180, 0)'); lg.addColorStop(0.5, 'rgba(255, 240, 180, ' + (0.85 * flare).toFixed(3) + ')'); lg.addColorStop(1, 'rgba(255, 240, 180, 0)');
      ctx.fillStyle = lg; ctx.fillRect(x - fl, y - Math.max(1, v.s * 0.25), fl * 2, Math.max(2, v.s * 0.5));
    }
  }

  // ---------- Le film : des plans comptés en temps, chacun avec son décor, sa caméra, sa phrase et ses coups ----------
  // level : l'intensité de la musique (0 à 3), drop : le temps où elle retient son souffle avant le titre.
  var face = function (t) { return HERO.face[Math.floor(t * 2) % 2]; };
  var SHOTS = [
    { beats: 12, level: 0, enter: 'fade', text: 'Au fond du Marais-Brume vit une grenouille qui n’a jamais quitté son ponton.',
      src: function (t) { return campFrame('marais', t, face(t)); },
      cam: function (t, d) { var k = ease(t / d); return { x: 150 + k * 14, y: 96, z: 1 + k * 0.4 }; } },
    { beats: 8, level: 1, enter: 'flash', pulse: 0.02, text: 'Chaque nuit, au loin, une silhouette la guette : le Héron Ancestral.',
      src: function (t) { return campFrame('marais', t + 8, face(t)); },
      cam: function (t) { // deux zooms secs vers le héron, sur les temps forts
        var a = easeOut((t - 4 * BEAT) / 0.2), b = easeOut((t - 6 * BEAT) / 0.2);
        return { x: 176 + ease(t / (4 * BEAT)) * 26 + a * 64 + b * 4, y: 92 - a * 12 - b * 2, z: 1.35 + ease(t / (4 * BEAT)) * 0.15 + a * 0.7 + b * 0.9 };
      },
      over: function (t, v) { var k = t - 6 * BEAT; if (k > 0) eyeGlint({ x: 269.5, y: 68 }, v, Math.min(1, k / 0.1) * (0.6 + 0.4 * Math.exp(-k * 3)), Math.exp(-k * 4)); },
      ev: [[4, function () { shake(1.2); }], [6, function () { shake(2); sfx('glint'); }]] },
    { beats: 8, level: 1, enter: 'flash', pulse: 0.025, text: 'Au-delà du marais, une brume ancienne cache le reste du monde.',
      src: function () { return fogMap; },
      cam: function (t, d) { var k = ease(t / d); return { x: 150 + k * 360, y: 300 - k * 210, z: 1.9 - k * 0.55 }; } },
    { beats: 12, level: 2, enter: 'flash', text: 'Bâton, kunaï ou paume de l’ermite : chaque grenouille choisit sa voie.',
      src: fightFrame, cam: fightCam,
      ev: [].concat.apply([], FIGHTERS.map(function (f, i) {
        var b0 = i * 4;
        return [
          [b0, function () { tag(f.voie.short.toUpperCase(), f.voie.name, f.voie.color, 2.2); }],
          [b0 + 1.5 - 0.3 / BEAT, function () { sfx(f.melee ? 'swing' : 'throw'); }],
          [b0 + 1.5, function () { sfx('hit'); shake(1.6); flash(0.18); }],
          [b0 + 3 - 0.3 / BEAT, function () { sfx(f.melee ? 'swing' : 'throw'); }],
          [b0 + 3, function () { sfx('kill'); shake(3.2); flash(0.35, rgbOf(f.voie.color)); }]
        ];
      })) },
    { beats: 10, level: 3, enter: 'flash', pulse: 0.03, text: 'Sur chaque terre, un gardien barre la route.',
      src: function (t) { return campFrame(BOSSES[bossAt(t)].biome.id, t, null); },
      cam: function (t) { var a = t - bossAt(t) * BOSS_D; return { x: 160, y: 88, z: 1.2 + 0.12 * (1 - easeOut(a / 0.3)) }; },
      over: bossOver,
      ev: BOSSES.map(function (B, i) {
        return [i * 2, function () { sfx('impact'); shake(3.5); flash(0.5, rgbOf(B.glow)); tag(B.biome.boss.name.toUpperCase(), B.biome.name, B.glow, 1.15); }];
      }) },
    { beats: 6, level: 3, enter: 'flash', pulse: 0.03, text: 'Six terres à traverser. Un seul sommet.',
      src: function (t) { return campFrame(BIOMES[Math.min(5, Math.floor(t / BEAT))].id, t, HERO.face[0]); },
      cam: function (t) { var i = Math.floor(t / BEAT), k = easeOut((t % BEAT) / BEAT); return { x: 150 + (i % 2 ? 16 : -6) * k, y: 92, z: 1.32 - 0.22 * k }; },
      ev: [1, 2, 3, 4, 5].map(function (b) { return [b, function () { flash(0.6); shake(1.5); }]; }) },
    { beats: 8, level: 3, drop: 6, enter: 'flash', pulse: 0.02, text: 'Tout en haut, le Héron Ancestral attend la grenouille qui osera monter.',
      src: function (t) { return SUMMIT.draw(t, t >= 6 * BEAT); },
      cam: function (t) {
        var k0 = clamp01(t / (2.5 * BEAT)), w = ease((t - 2.5 * BEAT) / 0.35), k1 = clamp01((t - 3 * BEAT) / (3 * BEAT)), p = ease((t - 6 * BEAT) / (2 * BEAT));
        var z = (1 - w) * (2.4 + 0.2 * k0) + w * (1.7 + 0.15 * k1), x = (1 - w) * 66 + w * 260, y = (1 - w) * 132 + w * 92;
        var e = SUMMIT.eye(true);
        return { x: x + (e.x - x) * p, y: y + (e.y + 4 - y) * p, z: z + (2.9 - z) * p };
      },
      over: function (t, v) { var k = t - 6 * BEAT; if (k > 0) eyeGlint(SUMMIT.eye(true), v, Math.min(1, k / 0.08) * (0.65 + 0.35 * Math.exp(-k * 3)), Math.exp(-k * 3)); },
      ev: [[2.5 - 0.3 / BEAT, function () { sfx('whoosh'); }], [3, function () { sfx('riser'); }], [6, function () { sfx('glint'); flash(0.3, '255,226,106'); shake(1); }]] }
  ];
  // après le film : l'écran titre, sur le sommet en plan large
  var FINALE = {
    src: function (t) { return SUMMIT.draw(t + 8 * BEAT, true); },
    cam: function (t) { return { x: 160, y: 90, z: 1.02 + 0.012 * Math.sin(t * 0.5) }; },
    over: function (t, v) { eyeGlint(SUMMIT.eye(true), v, 0.7 + 0.1 * Math.sin(t * 2), 0); }
  };
  var TOTAL = 0, EVENTS = [];
  SHOTS.forEach(function (s, i) {
    s.t0 = TOTAL; s.d = s.beats * BEAT; TOTAL += s.d;
    if (s.enter === 'flash') {
      EVENTS.push({ t: s.t0 - 0.35, fn: function () { sfx('whoosh'); } });
      EVENTS.push({ t: s.t0, fn: function () { flash(0.55); } });
    }
    (s.ev || []).forEach(function (e) { EVENTS.push({ t: s.t0 + e[0] * BEAT, fn: e[1] }); });
  });
  EVENTS.push({ t: TOTAL, fn: slam });
  function shotAt(t) { var i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i].t0 + SHOTS[i].d) i++; return i; }
  // l'intensité de la musique à un moment du film (après le titre : le thème deux mesures, puis le calme)
  function levelAt(t) {
    if (t >= TOTAL) return t - TOTAL < 8 * BEAT ? 2 : 0;
    var s = SHOTS[shotAt(t)];
    return s.drop && t - s.t0 >= s.drop * BEAT ? -1 : s.level;
  }

  var film = $('film'), ctx = film.getContext('2d'), ended = false, lastShot = -1, lastT = -1, level = null;
  // l'horloge du film : celle de la page, puis celle du son dès qu'il tourne (la musique rejoint alors le film)
  var clk = { base: performance.now(), origin: null };
  function filmTime(ms) {
    var a = Sfx.clock();
    if (a !== null) {
      if (clk.origin === null) clk.origin = Sfx.seek(Math.max(0, lastT));
      return a - clk.origin;
    }
    if (clk.origin !== null) { clk.origin = null; clk.base = ms - Math.max(0, lastT) * 1000; } // le son s'est arrêté : l'image continue seule
    return (ms - clk.base) / 1000;
  }
  function resize() { film.width = Math.round(innerWidth); film.height = Math.round(innerHeight); ctx.imageSmoothingEnabled = false; }
  window.addEventListener('resize', resize);
  resize();
  // Un décor, cadré par la caméra (centre et zoom en pixels du décor), qui couvre tout l'écran ; renvoie la vue
  function blit(src, cam) {
    var s = Math.max(film.width / W, film.height / H) * cam.z, sw = film.width / s, sh = film.height / s;
    var sx = Math.max(0, Math.min(src.width - sw, cam.x - sw / 2)), sy = Math.max(0, Math.min(src.height - sh, cam.y - sh / 2));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, film.width, film.height);
    return { s: s, x: sx, y: sy };
  }
  function caption(text) {
    var el = $('film-caption');
    el.classList.remove('on');
    setTimeout(function () { el.textContent = text; if (text) { void el.offsetWidth; el.classList.add('on'); } }, 120);
  }
  function slam() {
    ended = true;
    caption(''); tag('');
    sfx('slam'); flash(1); shake(4.5);
    $('film-title').hidden = false;
    requestAnimationFrame(function () { $('film-title').classList.add('on'); });
  }
  function frame(ms) {
    var t = Math.max(0, filmTime(ms));
    now = t;
    // sons, secousses et noms : seulement quand le film avance normalement (pas après un saut)
    if (t > lastT && t - lastT < 0.25) EVENTS.forEach(function (e) { if (e.t > lastT && e.t <= t) e.fn(); });
    lastT = t;
    var lv = levelAt(t + 0.35); // la musique prépare ses notes un peu à l'avance
    if (lv !== level) { level = lv; Sfx.intensity(lv); }
    if (t >= TOTAL && !ended) slam();
    var shot, lt;
    if (t >= TOTAL) { shot = FINALE; lt = t - TOTAL; }
    else {
      var i = shotAt(t);
      shot = SHOTS[i]; lt = t - shot.t0;
      if (i !== lastShot) { lastShot = i; caption(shot.text); }
    }
    var cam = shot.cam(lt, shot.d), sh = fx.shake * Math.exp(-(t - fx.shakeT) * 9);
    fx.ox = Math.sin(t * 91) * sh; fx.oy = Math.cos(t * 73) * sh;
    var v = blit(shot.src(lt), { x: cam.x + fx.ox, y: cam.y + fx.oy, z: cam.z * (1 + (shot.pulse && level > 0 && !still ? shot.pulse * thump(t) : 0)) });
    if (shot.over) shot.over(lt, v);
    if (shot.enter === 'fade' && lt < 2 * BEAT) { ctx.fillStyle = 'rgba(5, 8, 6, ' + (1 - lt / (2 * BEAT)).toFixed(3) + ')'; ctx.fillRect(0, 0, film.width, film.height); }
    var fl = fx.flash * Math.exp(-(t - fx.flashT) * 8);
    if (fl > 0.01) { ctx.fillStyle = 'rgba(' + fx.flashRgb + ', ' + Math.min(1, fl).toFixed(3) + ')'; ctx.fillRect(0, 0, film.width, film.height); }
    if (Sfx.running() !== soundLive) renderSound();
    requestAnimationFrame(frame);
  }
  function replay() {
    clk.base = performance.now(); clk.origin = Sfx.clock() !== null ? Sfx.seek(0) : null;
    ended = false; lastShot = -1; lastT = -1; level = null;
    tag('');
    $('film-title').classList.remove('on'); $('film-title').hidden = true;
  }
  // les décors des six biomes, préparés en douce pour que le montage ne saccade pas
  BIOMES.forEach(function (b, i) { setTimeout(function () { campFrame(b.id, 0); }, 400 + i * 120); });

  // logo de l'écran titre
  var logo = $('title-logo');
  logo.width = 64; logo.height = 64;
  logo.getContext('2d').drawImage(CampScene.makeLogo(sp), 0, 0);

  // ---------- Son ----------
  // Le navigateur ne laisse jouer le son qu'après un clic : le film démarre muet, et la musique le rejoint
  // en rythme dès qu'on clique (sur « Activer le son » ou n'importe où).
  var soundLive = false, wasLive = false;
  function renderSound() {
    soundLive = Sfx.running();
    var on = soundLive && !Sfx.isMuted(), b = $('film-sound');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.textContent = on ? 'Couper le son' : 'Activer le son';
  }
  ['pointerdown', 'keydown'].forEach(function (ev) { window.addEventListener(ev, function () { wasLive = Sfx.running(); }, true); });
  Sfx.music('epic', true);
  renderSound();
  requestAnimationFrame(frame);

  // ---------- Le compte ----------
  var me = null, serverUp = true, tab = 'connexion', creating = false, confirmDelete = null, createSkin = 'marais';
  var params = new URLSearchParams(location.search);
  function api(method, url, body) {
    return fetch(url, { method: method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.erreur || 'Erreur du serveur.'); return d; }); });
  }
  function portrait(frog) {
    var set = frogSet(frog.peau, DEFAULT_EQUIP, frog.voie === 'ermite');
    return set.face[0].toDataURL();
  }
  function renderAccountButton() {
    $('account-btn').textContent = me ? me.pseudo + ' · Mes grenouilles' : 'Connexion / Inscription';
  }
  function openPanel(which) {
    if (which) tab = which;
    $('account-panel').hidden = false;
    renderPanel();
    var first = $('account-panel').querySelector('input, button.btn');
    if (first) first.focus();
  }
  function closePanel() { $('account-panel').hidden = true; creating = false; confirmDelete = null; }
  function renderPanel() {
    var box = $('account-body'), html = '';
    if (!serverUp) {
      html = '<h2>Le serveur du jeu ne répond pas</h2><p>Les comptes ont besoin du serveur du jeu. Dans le dossier du jeu, lance :</p><pre>node server/server.js</pre><p>puis ouvre <b>http://localhost:8765</b>.</p>' +
        '<a class="btn btn-ghost" href="jeu.html">Jouer sans compte</a>';
    } else if (!me) {
      html = '<div class="tabs2" role="tablist"><button role="tab" data-tab="connexion" aria-selected="' + (tab === 'connexion') + '">Connexion</button><button role="tab" data-tab="inscription" aria-selected="' + (tab === 'inscription') + '">Inscription</button></div>' +
        '<form id="auth-form" class="auth" autocomplete="on">' +
        '<label for="auth-pseudo">Pseudo</label><input id="auth-pseudo" name="username" autocomplete="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_\\-]+">' +
        '<label for="auth-pass">Mot de passe</label><input id="auth-pass" name="password" type="password" autocomplete="' + (tab === 'inscription' ? 'new-password' : 'current-password') + '" required minlength="' + (tab === 'inscription' ? 8 : 1) + '">' +
        (tab === 'inscription' ? '<label for="auth-pass2">Confirme le mot de passe</label><input id="auth-pass2" type="password" autocomplete="new-password" required minlength="8"><p class="hint">3 à 20 caractères pour le pseudo (lettres, chiffres, - ou _), 8 au moins pour le mot de passe.</p>' : '') +
        '<p id="auth-error" class="error" role="alert"></p>' +
        '<button class="btn" type="submit">' + (tab === 'inscription' ? 'Créer mon compte' : 'Se connecter') + '</button></form>' +
        '<a class="play-offline" href="jeu.html">Jouer sans compte</a>';
    } else if (creating) {
      html = '<h2>Nouvelle grenouille</h2><form id="frog-form" class="auth" autocomplete="off">' +
        '<div class="frog-preview"><img id="frog-preview" class="px" alt=""></div>' +
        '<label for="frog-name">Son nom</label><input id="frog-name" maxlength="16" placeholder="Kawazu" required>' +
        '<span class="lbl">Sa couleur</span><div class="skins2" role="radiogroup" aria-label="Couleur">' +
        Object.keys(SKINS).map(function (k) { return '<button type="button" role="radio" data-skin="' + k + '" aria-checked="' + (k === createSkin) + '"><i style="background:' + SKINS[k].m + '"></i>' + SKINS[k].name + '</button>'; }).join('') + '</div>' +
        '<p id="auth-error" class="error" role="alert"></p>' +
        '<div class="row"><button class="btn" type="submit">Créer et jouer ▶</button><button class="btn btn-ghost" type="button" data-cancel>Annuler</button></div></form>';
    } else {
      html = '<h2>Tes grenouilles</h2><div class="frogs">' + me.grenouilles.map(function (g) {
        var voie = g.voie ? VOIES.filter(function (v) { return v.id === g.voie; })[0].short : 'pas encore de voie';
        var where = BIOMES[g.monde] ? BIOMES[g.monde].name + ' · étape ' + g.etape + ' / 10' : '';
        return '<div class="frog"><img class="px" src="' + portrait(g) + '" alt=""><div class="frog-info"><b>' + esc(g.nom) + '</b><span>Niveau ' + g.niveau + ' · ' + voie + '</span><span>' + where + '</span></div>' +
          '<div class="frog-actions"><a class="btn" href="jeu.html?grenouille=' + g.id + '">Jouer ▶</a>' +
          (confirmDelete === g.id ? '<span class="confirm">Supprimer pour de bon ? <button class="link danger" data-delete="' + g.id + '">Oui</button> <button class="link" data-keep>Non</button></span>' : '<button class="link" data-ask-delete="' + g.id + '">Supprimer</button>') + '</div></div>';
      }).join('') + '</div>' +
        (me.grenouilles.length < (me.max || 5) ? '<button class="btn btn-ghost new-frog" data-new>+ Nouvelle grenouille</button>' : '<p class="hint">Tu as atteint le maximum de ' + me.max + ' grenouilles.</p>') +
        '<p id="auth-error" class="error" role="alert"></p><button class="link logout" data-logout>Se déconnecter</button>';
    }
    box.innerHTML = html;
    if (creating) updatePreview();
  }
  function updatePreview() {
    var img = $('frog-preview');
    if (img) img.src = frogSet(createSkin, DEFAULT_EQUIP, false).face[0].toDataURL();
  }
  function showError(msg) { var e = $('auth-error'); if (e) e.textContent = msg; }

  document.addEventListener('submit', function (e) {
    e.preventDefault();
    if (e.target.id === 'auth-form') {
      var pseudo = $('auth-pseudo').value.trim(), pass = $('auth-pass').value;
      if (tab === 'inscription' && pass !== $('auth-pass2').value) return showError('Les deux mots de passe ne sont pas les mêmes.');
      api('POST', '/api/' + tab, { pseudo: pseudo, motdepasse: pass }).then(function (d) {
        me = { pseudo: d.pseudo, grenouilles: d.grenouilles || [], max: 5 };
        creating = !me.grenouilles.length; // premier passage : on crée tout de suite sa grenouille
        renderAccountButton(); renderPanel();
      }, function (err) { showError(err.message); });
    }
    if (e.target.id === 'frog-form') {
      var name = $('frog-name').value.trim();
      api('POST', '/api/grenouilles', { nom: name, peau: createSkin }).then(function (g) { location.href = 'jeu.html?grenouille=' + g.id; }, function (err) { showError(err.message); });
    }
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button, a');
    if (!t) return;
    if (t.id === 'account-btn' || t.id === 'title-play') { Sfx.play('click'); openPanel(me ? null : (t.id === 'title-play' ? 'inscription' : tab)); return; }
    if (t.id === 'account-close') { closePanel(); return; }
    if (t.id === 'film-replay') { replay(); return; }
    // le clic qui a lancé le son ne doit pas le couper aussitôt
    if (t.id === 'film-sound') { if (Sfx.isMuted() || wasLive) Sfx.toggle(); renderSound(); return; }
    if (t.dataset.tab) { tab = t.dataset.tab; renderPanel(); return; }
    if (t.dataset.skin) { createSkin = t.dataset.skin; Array.prototype.forEach.call(document.querySelectorAll('[data-skin]'), function (b) { b.setAttribute('aria-checked', b.dataset.skin === createSkin); }); updatePreview(); return; }
    if (t.hasAttribute('data-new')) { creating = true; renderPanel(); return; }
    if (t.hasAttribute('data-cancel')) { creating = false; renderPanel(); return; }
    if (t.dataset.askDelete) { confirmDelete = t.dataset.askDelete; renderPanel(); return; }
    if (t.hasAttribute('data-keep')) { confirmDelete = null; renderPanel(); return; }
    if (t.dataset.delete) {
      api('DELETE', '/api/grenouilles/' + t.dataset.delete).then(function () {
        me.grenouilles = me.grenouilles.filter(function (g) { return g.id !== t.dataset.delete; });
        confirmDelete = null; renderPanel();
      }, function (err) { showError(err.message); });
      return;
    }
    if (t.hasAttribute('data-logout')) { api('POST', '/api/deconnexion').then(function () { me = null; tab = 'connexion'; renderAccountButton(); renderPanel(); }); }
  });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });

  // Qui est connecté ? (et le serveur est-il là ?)
  if (location.protocol === 'file:') { serverUp = false; renderAccountButton(); }
  else {
    fetch('/api/moi', { credentials: 'same-origin' }).then(function (r) {
      if (r.status === 401) return null;
      if (!r.ok) throw new Error('serveur');
      return r.json();
    }).then(function (d) {
      me = d; renderAccountButton();
      if (params.has('grenouilles') || params.has('connexion')) openPanel(me ? null : 'connexion');
    }, function () { serverUp = false; renderAccountButton(); });
  }
})();
