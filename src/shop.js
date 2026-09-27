// Boutique de l'Aïeule Gamako : l'intérieur de sa cabane en rondins (256×144, pixel art).
// Trois couches : le fond (murs, fenêtre ronde, étagères, tapisserie), Gamako animée, puis le comptoir
// où sont posées les marchandises (celles-ci sont des boutons HTML placés par-dessus).
var ShopScene = (function () {
  var W = 256, H = 144, COUNTER = 96;
  var RES = 2;             // la scène est rendue en ×2 : Gamako peut ainsi être dessinée à ×1,5 sans pixels irréguliers
  var GS = 1.5, GX = 104, GY = 54; // Gamako : 48×48 dans le décor
  var K = '#1a1208';

  function r(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function sprite(rows, pal) {
    var w = Math.max.apply(null, rows.map(function (s) { return s.length; }));
    return stringsToCanvas(rows.map(function (s) { return (s + '.'.repeat(w)).slice(0, w); }), pal);
  }
  function canvas() { var c = document.createElement('canvas'); c.width = W; c.height = H; return c; }

  // ---------- L'Aïeule Gamako ----------
  var GAMAKO = [
    '', '', '......kkkk..........kkkk', '.....kwwwwk........kwwwwk', '....kwwkwwwk......kwwkwwwk', '....kwwkwwwkkkkkkkkwwkwwwk',
    '...kmkwwwwkmmmmmmmmkwwwwkmk', '..kmmmkkkkmmmmmmmmmmkkkkmmmk', '..kSSSmmmmmmmmmmmmmmmmmmSSSk', '.kmmmmmmmmmmmmmmmmmmmmmmmmmmk',
    '.kmmhhmmmmmmmmmmmmmmmmmmhhmmk', '.kmmmmkkkkkkkkkkkkkkkkkkmmmmk', '.kmmmSSSSSSSSSSSSSSSSSSSSmmmk', '..kmSSSSSSSSSSSSSSSSSSSSSSmk',
    '..kpSSSSSSSSSSSSSSSSSSSSSSpk', '.kppSSSSSSSSSSSSSSSSSSSSSSppk', 'kpppPSSSSSSSSSSSSSSSSSSSSPpppk', 'kpppPPSSSSSSSSSSSSSSSSSSPPpppk',
    'kppppPPSSSSSSSSSSSSSSSSPPppppk', 'kpppppPPSSSSSSSSSSSSSSPPpppppk', 'kppppppPPSSSSSSSSSSSSPPpppmmmk', 'kpppppppPPSSSSSSSSSSPPppppmmmk',
    'kppppppppPPPSSSSSSPPPpppppkkk', 'kpppppppppPPPPPPPPPPppppppk', '.kppppppppppppppppppppppppk', '.kppppppppppppppppppppppppk',
    '..kppppppppppppppppppppppk', '..kmmmkkppppppppppppkkmmmk', '.kmmmmmk.kkkkkkkkkk.kmmmmmk', '.kllkllk............kllkllk',
    '.kkkkkkk............kkkkkkk', ''
  ].map(function (s, y) {
    // la canne, tenue dans la main droite
    var a = (s + '.'.repeat(32)).slice(0, 32).split('');
    if (y <= 2) { a[28] = 'O'; a[29] = 'O'; a[30] = 'O'; } else if (y < 31) a[29] = y === 3 ? 'O' : 'o';
    return a.join('');
  });
  var GPAL = { k: '#1a1c2c', w: '#f4f4e8', m: '#6b8a5a', h: '#c98a7a', S: '#e8ecf0', p: '#5a3a7a', P: '#e0b43a', l: '#8aa87a', o: '#6b4a2a', O: '#e0b43a' };
  var gamako = stringsToCanvas(GAMAKO, GPAL);

  // ---------- Le fond ----------
  function buildBack() {
    var c = canvas(), ctx = c.getContext('2d');
    // murs en rondins
    for (var y = 0; y < H; y += 10) {
      var base = hash(1, y, 5) < 0.5 ? '#3f2918' : '#432c1a';
      r(ctx, 0, y, W, 10, base);
      r(ctx, 0, y, W, 1, '#5a3c22');
      r(ctx, 0, y + 1, W, 1, '#4c331e');
      r(ctx, 0, y + 8, W, 2, '#24170c');
      for (var g = 0; g < 26; g++) r(ctx, Math.floor(hash(g, y, 6) * W), y + 3 + Math.floor(hash(g, y, 7) * 4), 3 + Math.floor(hash(g, y, 8) * 7), 1, '#34220f');
      for (var n = 0; n < 2; n++) {
        var kx = Math.floor(hash(n, y, 9) * (W - 6));
        r(ctx, kx, y + 3, 4, 3, '#2a1a0e'); r(ctx, kx + 1, y + 4, 2, 1, '#5a3c22');
      }
    }
    // poteaux d'angle et poutre du plafond
    [[4, 7], [W - 11, 7]].forEach(function (p) { r(ctx, p[0], 0, p[1], H, '#2e1e10'); r(ctx, p[0] + 1, 0, 1, H, '#4a321c'); r(ctx, p[0] + p[1] - 1, 0, 1, H, '#1a1208'); });
    r(ctx, 0, 0, W, 8, '#24170c'); r(ctx, 0, 1, W, 1, '#3a2616'); r(ctx, 0, 7, W, 1, K);

    // fenêtre ronde : la nuit sur le marais
    var wx = 44, wy = 48;
    for (var yy = -19; yy <= 19; yy++) {
      for (var xx = -19; xx <= 19; xx++) {
        var dd = Math.hypot(xx, yy), px = wx + xx, py = wy + yy;
        if (dd > 19) continue;
        if (dd > 17.2) r(ctx, px, py, 1, 1, K);
        else if (dd > 15) r(ctx, px, py, 1, 1, yy < 0 ? '#7a5634' : '#5a3e25');
        else {
          var sky = yy < 6 ? (yy < -6 ? '#142236' : '#1c3042') : '#1f3a3a';
          r(ctx, px, py, 1, 1, sky);
          if (yy >= 6 && (xx + yy) % 5 === 0 && Math.abs(xx - 5) < 3) r(ctx, px, py, 1, 1, '#8a9a70'); // reflet de la lune
          if (yy < 4 && hash(xx, yy, 12) < 0.03) r(ctx, px, py, 1, 1, '#e8ecf0');
        }
      }
    }
    for (var mx = -5; mx <= 5; mx++) for (var my = -5; my <= 5; my++) if (Math.hypot(mx, my) <= 4.6) r(ctx, wx + 6 + mx, wy - 7 + my, 1, 1, Math.hypot(mx + 1, my + 1) < 2 ? '#d8c890' : '#f3e2a8');
    [[-12, 9], [-9, 12], [-6, 8], [-2, 11], [3, 10], [8, 13], [11, 9]].forEach(function (s) {
      r(ctx, wx + s[0], wy + 14 - s[1], 1, s[1], '#0e1a14');
      r(ctx, wx + s[0], wy + 13 - s[1], 1, 3, '#2a1a0e');
    });
    r(ctx, wx - 15, wy - 1, 30, 2, '#5a3e25'); r(ctx, wx - 1, wy - 15, 2, 30, '#5a3e25');
    r(ctx, wx - 22, wy + 19, 44, 3, '#6b4a2a'); r(ctx, wx - 22, wy + 19, 44, 1, '#8a6440'); r(ctx, wx - 22, wy + 22, 44, 1, K);
    // pot de fleur sur le rebord
    r(ctx, wx - 17, wy + 13, 7, 6, K); r(ctx, wx - 16, wy + 14, 5, 5, '#9a5a3a'); r(ctx, wx - 16, wy + 14, 5, 1, '#b87a50');
    [[-15, 8], [-13, 10], [-11, 7]].forEach(function (s) { r(ctx, wx + s[0], wy + 13 - s[1] + 4, 1, s[1] - 4, '#4e9a45'); r(ctx, wx + s[0] - 1, wy + 13 - s[1] + 4, 3, 2, '#8fce52'); });

    // tapisserie derrière Gamako : l'emblème de la grenouille
    r(ctx, 98, 9, 60, 2, '#8a6f1f'); r(ctx, 97, 8, 2, 4, '#e0b43a'); r(ctx, 157, 8, 2, 4, '#e0b43a');
    r(ctx, 102, 11, 52, 62, '#4a2a6a'); r(ctx, 104, 13, 48, 58, '#5a3a7a');
    r(ctx, 104, 13, 48, 1, '#e0b43a'); r(ctx, 104, 70, 48, 1, '#e0b43a'); r(ctx, 104, 13, 1, 58, '#e0b43a'); r(ctx, 151, 13, 1, 58, '#e0b43a');
    for (var f = 102; f < 154; f += 4) { r(ctx, f, 73, 3, 2, '#4a2a6a'); r(ctx, f + 1, 75, 1, 2, '#e0b43a'); }
    ctx.drawImage(sprite(['..kk....kk..', '.kyyk..kyyk.', '.kykk..kkyk.', 'kyyyyyyyyyyk', 'kyykkkkkkyyk', '.kyyyyyyyyk.', '..kkkkkkkk..'], { k: '#2a1a3e', y: '#e0b43a' }), 122, 17);

    // lanternes suspendues
    [88, 170].forEach(function (lx) {
      r(ctx, lx + 3, 8, 1, 8, '#2a2a2a');
      r(ctx, lx, 16, 7, 2, '#2a2a2a'); r(ctx, lx, 26, 7, 2, '#2a2a2a');
      r(ctx, lx, 18, 1, 8, '#2a2a2a'); r(ctx, lx + 6, 18, 1, 8, '#2a2a2a');
      r(ctx, lx + 1, 18, 5, 8, '#f3d27a'); r(ctx, lx + 2, 19, 3, 6, '#fff3c0');
    });
    // bouquets d'herbes qui sèchent
    [70, 196, 222].forEach(function (hx, k) {
      r(ctx, hx + 2, 8, 1, 6, '#8a7a4a');
      r(ctx, hx, 14, 5, 2, '#6e4a2a');
      var col = ['#6b8a3a', '#8a6fa0', '#a8a04a'][k];
      for (var s = 0; s < 5; s++) r(ctx, hx + s, 16, 1, 5 + (s % 3) * 2, col);
    });

    // étagères de droite : bocaux, livres, crâne, champignons
    [[44, 186], [68, 186]].forEach(function (sh) {
      r(ctx, sh[1], sh[0], 50, 3, '#6b4a2a'); r(ctx, sh[1], sh[0], 50, 1, '#8a6440'); r(ctx, sh[1], sh[0] + 3, 50, 1, K);
      r(ctx, sh[1] + 4, sh[0] + 3, 2, 4, '#4a321c'); r(ctx, sh[1] + 44, sh[0] + 3, 2, 4, '#4a321c');
    });
    function jar(x, y, h, liquid) {
      r(ctx, x, y - h, 7, h, K); r(ctx, x + 1, y - h + 1, 5, h - 1, '#9cc7e0');
      r(ctx, x + 1, y - h + 3, 5, h - 3, liquid); r(ctx, x + 1, y - h + 3, 1, h - 3, '#ffffff55');
      r(ctx, x + 1, y - h - 2, 5, 2, '#b08a5a');
    }
    jar(190, 44, 9, '#8fce52'); jar(199, 44, 7, '#c9412f'); jar(208, 44, 10, '#5fd3e0');
    ['#8a3a2a', '#3a5a8a', '#6b8a3a', '#8a6f1f'].forEach(function (col, k) { r(ctx, 218 + k * 4, 44 - 9 - (k % 2), 3, 9 + (k % 2), col); r(ctx, 218 + k * 4, 44 - 7, 3, 1, '#e0b43a'); });
    ctx.drawImage(sprite(['.kkkk.', 'kbbbbk', 'bkbbkb', 'kbbbbk', '.kbbk.', '.kkkk.'], { k: '#3a3a3a', b: '#e8e0c8' }), 190, 62);
    ctx.drawImage(sprite(['.kkk..kk', 'kRwRkkRk', 'kRRRkkRk', '.kwk..wk', '.kwk..w.'], { k: K, R: '#c9412f', w: '#f4f4e8' }), 200, 63);
    ctx.drawImage(sprite(['..k..', '.kLk.', '.kLBk', 'kLBBk', 'kLBDk', '.kkk.'], { k: K, L: '#d4fbff', B: '#5fd3e0', D: '#2a7a90' }), 214, 62);
    r(ctx, 222, 63, 12, 5, '#e8d8a8'); r(ctx, 222, 63, 12, 1, '#fff6d0'); r(ctx, 221, 62, 2, 7, '#b08a5a'); r(ctx, 233, 62, 2, 7, '#b08a5a');

    // tonneau d'armes au pied de la fenêtre
    r(ctx, 64, 60, 1, 22, '#b08a5a'); r(ctx, 63, 58, 3, 3, '#8fce52');
    r(ctx, 70, 56, 1, 26, '#8a6440'); r(ctx, 69, 55, 3, 2, '#e0b43a');
    r(ctx, 76, 64, 1, 18, '#6b6556'); r(ctx, 75, 60, 3, 5, '#c8d0d8'); r(ctx, 76, 59, 1, 1, '#f4f4e8');
    r(ctx, 60, 76, 22, 22, K); r(ctx, 61, 77, 20, 21, '#6b4a2a');
    r(ctx, 61, 77, 3, 21, '#8a6440'); r(ctx, 61, 80, 20, 2, '#3a3a3a'); r(ctx, 61, 91, 20, 2, '#3a3a3a');

    // lumière chaude autour de Gamako, murs plus sombres sur les bords
    var glow = ctx.createRadialGradient(128, 60, 10, 128, 70, 150);
    glow.addColorStop(0, 'rgba(255, 190, 110, 0.16)'); glow.addColorStop(0.5, 'rgba(0, 0, 0, 0)'); glow.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    return c;
  }

  // ---------- Le comptoir (devant Gamako) ----------
  function buildFront() {
    var c = canvas(), ctx = c.getContext('2d');
    r(ctx, 0, COUNTER, W, 1, '#c9a06a'); r(ctx, 0, COUNTER + 1, W, 4, '#8a6440'); r(ctx, 0, COUNTER + 5, W, 1, '#3a2616');
    for (var g = 0; g < 40; g++) r(ctx, Math.floor(hash(g, 3, 21) * W), COUNTER + 2 + Math.floor(hash(g, 4, 21) * 3), 4 + Math.floor(hash(g, 5, 21) * 8), 1, '#7a5634');
    for (var y = COUNTER + 6; y < H; y += 9) {
      r(ctx, 0, y, W, 9, hash(2, y, 22) < 0.5 ? '#5a3e25' : '#553a22');
      r(ctx, 0, y, W, 1, '#6b4a2a'); r(ctx, 0, y + 8, W, 1, '#2b1d12');
      for (var nx = 10; nx < W; nx += 40) r(ctx, nx + (y % 3) * 3, y + 4, 1, 1, '#8a8578');
    }
    // nappe violette à franges dorées
    r(ctx, 0, COUNTER + 6, W, 6, '#5a3a7a'); r(ctx, 0, COUNTER + 6, W, 1, '#e0b43a'); r(ctx, 0, COUNTER + 11, W, 1, '#4a2a6a');
    for (var f = 0; f < W; f += 4) { r(ctx, f, COUNTER + 12, 3, 1, '#e0b43a'); r(ctx, f + 1, COUNTER + 13, 1, 1, '#c9a24a'); }
    // pile de vieux grimoires et bougeoir à gauche, bocal de lucioles à droite
    [['#6b3a2a', 0], ['#3a4a6a', 2], ['#5a6a3a', 1]].forEach(function (b, k) {
      var by = COUNTER - 4 - k * 4;
      r(ctx, 30 + b[1], by, 14, 4, K); r(ctx, 31 + b[1], by + 1, 12, 2, b[0]); r(ctx, 31 + b[1], by + 1, 12, 1, '#e8d8a8');
    });
    r(ctx, 18, COUNTER - 1, 9, 2, '#8a6f1f'); r(ctx, 21, COUNTER - 8, 3, 7, '#f4f4e8'); r(ctx, 21, COUNTER - 8, 1, 7, '#ffffff');
    r(ctx, 210, COUNTER - 14, 14, 14, K); r(ctx, 211, COUNTER - 13, 12, 13, '#1c3042'); r(ctx, 211, COUNTER - 13, 2, 13, '#ffffff33');
    r(ctx, 211, COUNTER - 17, 12, 3, '#b08a5a'); r(ctx, 210, COUNTER - 15, 14, 1, K);
    return c;
  }

  var back = null, front = null, talking = false;
  function build() { if (!back) { back = buildBack(); front = buildFront(); } }

  // t en secondes
  function draw(ctx, t) {
    build();
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(back, 0, 0);
    // halo des lanternes
    ctx.globalCompositeOperation = 'lighter';
    [91, 173].forEach(function (lx, k) {
      var a = 0.13 + Math.sin(t * 7 + k * 2) * 0.02 + Math.sin(t * 13 + k) * 0.015;
      var gl = ctx.createRadialGradient(lx, 22, 1, lx, 22, 34);
      gl.addColorStop(0, 'rgba(255, 200, 110,' + (a * 2.2) + ')'); gl.addColorStop(1, 'rgba(255, 170, 80, 0)');
      ctx.fillStyle = gl; ctx.fillRect(lx - 34, 0, 68, 60);
    });
    ctx.globalCompositeOperation = 'source-over';
    // poussières dans la lumière
    for (var i = 0; i < 12; i++) {
      var dx = (hash(i, 1, 40) * 120 + t * (3 + hash(i, 2, 40) * 4)) % 120, dy = (hash(i, 3, 40) * 70 + Math.sin(t * 0.7 + i) * 4 + 70) % 70;
      ctx.fillStyle = 'rgba(255, 230, 160,' + (0.25 + 0.25 * Math.sin(t * 2 + i)) + ')';
      ctx.fillRect(Math.floor(68 + dx), Math.floor(14 + dy), 1, 1);
    }
    // Gamako : elle respire et cligne des yeux
    var bob = (Math.floor(t * 1.2) % 2) * GS, blink = (t % 4.2) < 0.14;
    ctx.drawImage(gamako, GX, GY + bob, 32 * GS, 32 * GS);
    if (blink) {
      [[5, 6], [19, 6]].forEach(function (e) {
        r(ctx, GX + e[0] * GS, GY + bob + 3 * GS, e[1] * GS, 4 * GS, GPAL.m);
        r(ctx, GX + e[0] * GS, GY + bob + 5 * GS, e[1] * GS, GS, GPAL.k);
      });
    }
    // quand elle parle, sa grande bouche s'ouvre et se ferme
    if (talking && Math.floor(t * 8) % 3 !== 2) {
      var open = Math.floor(t * 8) % 3 === 0 ? 2 : 1;
      r(ctx, GX + 7 * GS, GY + bob + 11 * GS, 16 * GS, (open + 1) * GS, GPAL.k);
      r(ctx, GX + 8 * GS, GY + bob + 11 * GS + GS * 0.5, 14 * GS, open * GS, '#5a1a2a');
      r(ctx, GX + 11 * GS, GY + bob + (11 + open) * GS, 8 * GS, GS * 0.5, '#c96a7a');
    }
    ctx.drawImage(front, 0, 0);
    // flamme de la bougie
    var fl = Math.sin(t * 17) > 0;
    r(ctx, 22, COUNTER - 11 - (fl ? 1 : 0), 1, 3, '#f3d27a'); r(ctx, 21 + (fl ? 1 : 0), COUNTER - 10, 2, 2, '#e07a2a');
    var cg = ctx.createRadialGradient(22, COUNTER - 10, 0, 22, COUNTER - 10, 16);
    cg.addColorStop(0, 'rgba(255, 200, 120, 0.3)'); cg.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = cg; ctx.fillRect(6, COUNTER - 26, 32, 32);
    // lucioles dans le bocal
    for (var j = 0; j < 5; j++) {
      var fx = 212 + Math.floor(5 + Math.sin(t * (1.3 + j * 0.3) + j * 2) * 4.5), fy = COUNTER - 11 + Math.floor(5 + Math.cos(t * (1.1 + j * 0.25) + j) * 4.5);
      var on = Math.sin(t * 3 + j * 1.7) > -0.3;
      ctx.fillStyle = on ? 'rgba(240, 255, 170, 0.9)' : 'rgba(160, 200, 90, 0.5)';
      ctx.fillRect(fx, fy, 1, 1);
      if (on) { ctx.fillStyle = 'rgba(200, 255, 120, 0.2)'; ctx.fillRect(fx - 1, fy - 1, 3, 3); }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { talk: function (on) { talking = !!on; }, W: W, H: H, RES: RES, COUNTER: COUNTER, GX: GX, GY: GY, draw: draw, gamako: gamako };
})();
