// Décor du camp (320×180, pixel art animé) : marécage au crépuscule, brume, cyprès drapés de mousse,
// eau trouble couverte de lentilles, cabane sur pilotis et ponton. Kawazu se tient sur le ponton.
// Au loin, sur une souche, la silhouette du Héron Ancestral attend au sommet de l'ascension.
// Le camp suit l'aventure : il prend les couleurs et l'ambiance du biome en cours (voir THEMES).
var CampScene = (function () {
  var W = 320, H = 180, HORIZON = 100;
  var HERO = { x: 144, y: 87 }; // Kawazu au centre du ponton (pieds en y = 118)
  var PAD = { x: 178, y: 150 }; // le nénuphar de la méditation, sur l'eau devant le ponton
  var MOON = { x: 236, y: 34 };
  var BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

  // Dégradé en bandes tramées (effet pixel art) entre des couleurs de référence
  function ditherFill(ctx, x0, y0, x1, y1, stops, clip) {
    for (var y = y0; y < y1; y++) {
      var i = 0;
      while (i < stops.length - 2 && y >= stops[i + 1][0]) i++;
      var a = stops[i], b = stops[i + 1];
      var f = Math.max(0, Math.min(1, (y - a[0]) / (b[0] - a[0])));
      for (var x = x0; x < x1; x++) {
        if (clip && !clip(x, y)) continue;
        ctx.fillStyle = f * 16 > BAYER[y % 4][x % 4] ? b[1] : a[1];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  function noise(n) { var s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); }

  // Ambiance de chaque biome. shift : rotation de teinte (degrés), saturation et luminosité appliquées au ciel,
  // à l'eau et à la végétation (le bois de la cabane et du ponton garde sa couleur).
  // fog / halo : couleurs RVB de la brume et du halo derrière la grenouille ; fire : lucioles (null = aucune).
  var THEMES = {
    marais: { shift: null, fog: '190,210,180', halo: '226,240,196', fire: '#c9f07a', fires: 22 },
    lagune: { shift: { h: 48, s: 1.15, l: 0.9 }, fog: '150,215,215', halo: '200,245,235', fire: '#f0ff9a', fires: 40 },
    saules: { shift: { h: -85, s: 1.1, l: 1.05 }, fog: '230,205,160', halo: '255,225,170', fire: '#ffd27a', fires: 10, leaves: true },
    grottes: { shift: { h: 150, s: 0.7, l: 0.75 }, fog: '150,150,210', halo: '190,205,255', fire: '#9ef0ff', fires: 16, cave: true },
    temple: { shift: { h: 70, s: 0.55, l: 0.95 }, fog: '170,205,205', halo: '210,240,240', fire: '#8af0d0', fires: 14, ruins: true },
    sommet: { shift: { h: 110, s: 0.25, l: 1.35 }, fog: '230,236,246', halo: '240,246,255', fire: null, fires: 0, snow: true },
    // le Continent
    plaine: { shift: { h: -40, s: 1.1, l: 1.15 }, fog: '230,225,190', halo: '255,240,200', fire: '#ffd27a', fires: 14 },
    bataille: { shift: { h: -80, s: 0.45, l: 0.85 }, fog: '190,170,150', halo: '230,200,170', fire: '#ff9a4a', fires: 8, ruins: true },
    epines: { shift: { h: -140, s: 0.8, l: 0.7 }, fog: '170,150,160', halo: '210,180,200', fire: '#e05a8a', fires: 10, leaves: true },
    dunes: { shift: { h: -70, s: 0.9, l: 1.35 }, fog: '245,225,180', halo: '255,240,200', fire: null, fires: 0 },
    canyon: { shift: { h: -95, s: 1.1, l: 1.0 }, fog: '230,180,150', halo: '255,210,170', fire: '#ffb04a', fires: 6 },
    toundra: { shift: { h: 90, s: 0.3, l: 1.5 }, fog: '235,242,250', halo: '245,250,255', fire: null, fires: 0, snow: true },
    volcan: { shift: { h: -110, s: 1.3, l: 0.6 }, fog: '200,120,90', halo: '255,160,110', fire: '#ff6a1a', fires: 30 },
    cimetiere: { shift: { h: 50, s: 0.35, l: 0.7 }, fog: '170,190,185', halo: '200,230,220', fire: '#8af0c0', fires: 18, ruins: true },
    feerique: { shift: { h: 170, s: 1.2, l: 0.9 }, fog: '200,170,230', halo: '240,200,255', fire: '#f0a0e0', fires: 40 },
    ciel: { shift: { h: 100, s: 0.4, l: 1.45 }, fog: '235,240,255', halo: '250,252,255', fire: '#fff6a0', fires: 12, ruins: true },
    jungle: { shift: { h: 10, s: 1.3, l: 0.85 }, fog: '170,210,160', halo: '210,245,190', fire: '#e04a8a', fires: 20, leaves: true },
    mines: { shift: { h: -80, s: 0.3, l: 0.6 }, fog: '140,130,120', halo: '200,180,150', fire: '#e0b43a', fires: 8, cave: true },
    forteresse: { shift: { h: 110, s: 0.2, l: 0.9 }, fog: '180,185,195', halo: '215,220,230', fire: '#ff9a4a', fires: 10, ruins: true },
    abysse: { shift: { h: 160, s: 1.0, l: 0.5 }, fog: '130,100,170', halo: '190,150,240', fire: '#c080ff', fires: 26, cave: true },
    dragons: { shift: { h: -65, s: 1.2, l: 1.05 }, fog: '230,200,150', halo: '255,225,160', fire: '#ff8a2a', fires: 16 },
    orage: { shift: { h: 105, s: 0.8, l: 0.7 }, fog: '150,170,210', halo: '190,220,255', fire: '#6af0ff', fires: 22, ruins: true }
  };

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0;
    if (mx !== mn) {
      var d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : (mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
      h *= 60;
    }
    return [h, s, l];
  }
  function hslToRgb(h, s, l) {
    var f = function (n) { var k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
    return [f(0), f(8), f(4)];
  }
  function tinter(shift) {
    var memo = {};
    return function (hex) {
      if (!shift) return hex;
      if (!memo[hex]) {
        var hsl = rgbToHsl(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));
        var rgb = hslToRgb((hsl[0] + shift.h + 360) % 360, Math.min(1, hsl[1] * shift.s), Math.min(0.97, hsl[2] * shift.l));
        memo[hex] = 'rgb(' + rgb.join(',') + ')';
      }
      return memo[hex];
    };
  }
  // Recolore une couche ; greensOnly : seulement la végétation (nénuphars, mousse), pas le bois
  function recolor(canvas, shift, greensOnly) {
    var ctx = canvas.getContext('2d'), img = ctx.getImageData(0, 0, W, H), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      var hsl = rgbToHsl(d[i], d[i + 1], d[i + 2]);
      if (greensOnly && !(hsl[0] >= 60 && hsl[0] <= 170 && hsl[1] > 0.12)) continue;
      var rgb = hslToRgb((hsl[0] + shift.h + 360) % 360, Math.min(1, hsl[1] * shift.s), Math.min(0.97, hsl[2] * shift.l));
      d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2];
    }
    ctx.putImageData(img, 0, 0);
  }

  // Cyprès chauve : tronc évasé à la base, houppier plat, mousse espagnole qui pend
  function cypress(ctx, x, base, height, width, trunk, leaf, moss, seed) {
    var px = function (xx, yy, col) { ctx.fillStyle = col; ctx.fillRect(xx, yy, 1, 1); };
    for (var y = 0; y < height; y++) {
      var yy = base - y;
      var flare = y < 8 ? Math.round((8 - y) * 0.7) : 0;
      var tw = Math.max(2, Math.round(width * 0.18)) + flare;
      for (var dx = -tw; dx <= tw; dx++) px(x + dx, yy, trunk);
    }
    // houppier en plusieurs étages plats
    var top = base - height;
    for (var layer = 0; layer < 3; layer++) {
      var ly = top + layer * 7, lw = width - layer * 2 + Math.round(noise(seed + layer) * 4);
      for (var y2 = 0; y2 < 6; y2++) {
        var half = Math.round(lw * Math.sqrt(1 - Math.pow((y2 - 2.5) / 3.2, 2)));
        for (var dx2 = -half; dx2 <= half; dx2++) px(x + dx2 + Math.round((noise(seed + y2) - 0.5) * 3), ly + y2, leaf);
      }
      // mousse qui pend sous chaque étage
      for (var m = -lw + 1; m < lw; m += 2) {
        var len = 3 + Math.floor(noise(seed * 7 + m + layer * 13) * 9);
        for (var k = 0; k < len; k++) px(x + m, ly + 5 + k, moss);
      }
    }
  }

  function buildStatic(biomeId) {
    var theme = THEMES[biomeId] || THEMES.marais;
    // deux couches : le fond (ciel, lac) puis le premier plan (cabane, ponton),
    // pour que les ondulations animées passent entre les deux
    var mk = function () { var cv = document.createElement('canvas'); cv.width = W; cv.height = H; return cv; };
    var back = mk(), front = mk();
    var ctx = back.getContext('2d');
    var rect = function (x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    var px = function (x, y, col) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); };

    // Ciel de crépuscule verdâtre
    ditherFill(ctx, 0, 0, W, HORIZON, [[0, '#0b1512'], [30, '#12241d'], [55, '#1f3a2c'], [78, '#3a5238'], [92, '#6b7a4a'], [100, '#8a8a55']]);
    // Lune pâle + halo
    for (var y = MOON.y - 20; y < MOON.y + 20; y++) {
      for (var x = MOON.x - 20; x <= MOON.x + 20; x++) {
        var d = Math.hypot(x - MOON.x, y - MOON.y);
        if (d < 9) px(x, y, (x - MOON.x + 3) * (x - MOON.x + 3) + (y - MOON.y + 2) * (y - MOON.y + 2) < 6 || (x - MOON.x - 3) * (x - MOON.x - 3) + (y - MOON.y - 3) * (y - MOON.y - 3) < 4 ? '#c8caa8' : '#e6e8c8');
        else if (d < 13 && (x + y) % 2 === 0) px(x, y, '#3f5a44');
        else if (d < 18 && (x + y) % 4 === 0) px(x, y, '#2c4636');
      }
    }
    if (theme.snow) {
      [[30, 46], [92, 58], [160, 44], [292, 62]].forEach(function (m) {
        for (var yy = 0; yy < m[1]; yy++) {
          var half = Math.round(yy * 1.1), top = HORIZON - m[1] + yy;
          rect(m[0] - half, top, half + 1, 1, '#6a6e72'); rect(m[0] + 1, top, half, 1, '#4e5256');
          if (yy < m[1] * 0.3) { rect(m[0] - half, top, half + 1, 1, '#eef2f6'); rect(m[0] + 1, top, half, 1, '#c8ccd6'); }
        }
      });
    }
    // Rangée lointaine de cyprès dans la brume
    for (var fx = -4; fx < W + 8; fx += 11) {
      var h = 18 + Math.floor(noise(fx) * 16);
      cypress(ctx, fx, HORIZON, h, 6 + Math.floor(noise(fx + 3) * 4), '#1d3228', '#1d3228', '#24392d', fx);
    }
    rect(0, HORIZON - 6, W, 6, '#1d3228');
    // Silhouette du héron sur une souche, au loin
    rect(270, 84, 3, 16, '#101c17');
    [[271, 70], [271, 71], [272, 72], [272, 73], [271, 74], [271, 75], [270, 76], [270, 77], [271, 78], [272, 79]].forEach(function (p) { px(p[0], p[1], '#101c17'); });
    rect(268, 67, 4, 3, '#101c17');
    rect(263, 68, 5, 1, '#101c17');
    rect(268, 79, 9, 4, '#101c17');
    rect(276, 81, 3, 2, '#101c17');
    rect(271, 83, 1, 3, '#101c17');
    // Grands cyprès du plan intermédiaire
    cypress(ctx, 196, HORIZON + 2, 44, 14, '#16261e', '#1a2e22', '#3a4a34', 11);
    cypress(ctx, 305, HORIZON + 2, 56, 16, '#16261e', '#1a2e22', '#3a4a34', 23);

    // Eau trouble du marais
    ditherFill(ctx, 0, HORIZON, W, H, [[100, '#2f3f2c'], [120, '#1f2e22'], [150, '#142018'], [180, '#0c150f']]);
    // reflets sombres des cyprès
    for (var rx = 0; rx < W; rx++) {
      var len = 6 + Math.floor(noise(rx * 0.37) * 12);
      for (var ry = 0; ry < len; ry++) if (ry % 3 !== 2) px(rx, HORIZON + ry, '#18241b');
    }
    for (var r2 = 186; r2 < 207; r2++) for (var r3 = 0; r3 < 30; r3 += 2) px(r2, HORIZON + 2 + r3, '#101a13');
    rect(0, HORIZON, W, 1, '#4a5a3a');
    // lentilles d'eau
    [[150, 142, 26], [250, 128, 30], [60, 160, 22], [218, 166, 34], [290, 150, 18], [120, 170, 20]].forEach(function (p, n) {
      for (var i = 0; i < p[2] * 3; i++) {
        var a = noise(n * 97 + i) * Math.PI * 2, r = noise(n * 31 + i * 3) * p[2] * 0.5;
        px(Math.round(p[0] + Math.cos(a) * r * 1.6), Math.round(p[1] + Math.sin(a) * r * 0.5), noise(i + n) > 0.5 ? '#4f7a36' : '#6f9a45');
      }
    });
    // tronc flottant
    rect(214, 147, 34, 5, '#1a1c2c');
    rect(215, 148, 32, 3, '#4a3325');
    rect(215, 148, 32, 1, '#6b4a2a');
    rect(246, 148, 2, 3, '#8a6440');
    for (var lx = 218; lx < 244; lx += 5) px(lx, 150, '#3e2a19');
    px(226, 146, '#4f7a36'); px(227, 146, '#6f9a45'); px(236, 146, '#4f7a36');

    if (theme.shift) recolor(back, theme.shift, false);
    if (theme.cave) caveCeiling(ctx);
    if (theme.ruins) sunkenRuins(ctx);

    ctx = front.getContext('2d');

    // Nénuphars
    [[262, 138, 5], [296, 162, 7], [104, 156, 6], [36, 168, 7], [184, 172, 5]].forEach(function (l, n) {
      var r = l[2], ry2 = Math.max(2, Math.round(r * 0.45));
      for (var y2 = -ry2; y2 <= ry2; y2++) {
        for (var x2 = -r; x2 <= r; x2++) {
          var e = (x2 * x2) / (r * r) + (y2 * y2) / (ry2 * ry2);
          if (e > 1) continue;
          if (x2 > 0 && Math.abs(y2) <= x2 * 0.3) continue;
          px(l[0] + x2, l[1] + y2, e > 0.65 ? '#1d3b24' : (x2 < 0 && y2 < 0 ? '#6fae52' : '#4f8a3c'));
        }
      }
      if (n % 2 === 0) { px(l[0] - 2, l[1] - 1, '#f4b8c8'); px(l[0] - 1, l[1] - 2, '#e8897a'); px(l[0] - 3, l[1] - 2, '#e8897a'); px(l[0] - 2, l[1] - 2, '#fff0f4'); }
    });

    // Pilotis et poteaux du ponton (+ reflets), couverts d'algues à la base
    var post = function (x, top, bottom) {
      rect(x, top, 3, bottom - top, '#4a3325');
      rect(x, top, 1, bottom - top, '#5e4330');
      rect(x, bottom - 4, 3, 4, '#3f5a34');
      for (var y3 = bottom; y3 < bottom + 10; y3++) if (y3 % 2 === 0) rect(x, y3, 3, 1, '#0f1a12');
    };
    [12, 40, 68, 96].forEach(function (x) { post(x, 122, 140); });
    [126, 152, 178, 202].forEach(function (x) { post(x, 122, 134); });

    // Barque amarrée
    rect(176, 128, 30, 2, '#6b4a2a');
    rect(178, 130, 26, 2, '#4a3325');
    rect(181, 132, 20, 1, '#3e2a19');
    rect(176, 127, 30, 1, '#1a1c2c');
    for (var bx = 178; bx < 204; bx += 2) px(bx, 134, '#0f1a12');

    // Plancher de la cabane et ponton (bois humide, mousse)
    var planks = function (x0, x1) {
      rect(x0, 117, x1 - x0, 1, '#1a1c2c');
      rect(x0, 118, x1 - x0, 3, '#6b4a2a');
      rect(x0, 118, x1 - x0, 1, '#8a6440');
      rect(x0, 121, x1 - x0, 1, '#2e2018');
      for (var x4 = x0 + 3; x4 < x1; x4 += 7) rect(x4, 118, 1, 3, '#4a3325');
      for (var x5 = x0 + 5; x5 < x1; x5 += 13) { px(x5, 118, '#4f6b3a'); px(x5 + 1, 118, '#4f6b3a'); }
    };
    planks(6, 112);
    planks(112, 208);
    // Poteau d'amarrage et corde vers la barque
    rect(203, 108, 4, 10, '#4a3325');
    rect(203, 108, 4, 1, '#1a1c2c');
    rect(203, 111, 4, 1, '#c9b47a');
    for (var k = 0; k < 8; k++) px(202 - k, 112 + Math.round(k * 1.9), '#c9b47a');

    // Murs de la cabane
    rect(15, 81, 87, 37, '#1a1c2c');
    rect(16, 82, 85, 35, '#5e4228');
    for (var wy = 85; wy < 117; wy += 4) rect(16, wy, 85, 1, '#4a3325');
    rect(16, 82, 3, 35, '#3e2a19');
    rect(98, 82, 3, 35, '#3e2a19');
    for (var mx = 17; mx < 100; mx += 3) if (noise(mx) > 0.55) rect(mx, 110 + Math.floor(noise(mx * 3) * 5), 2, 7, '#3f5a34');
    // Fenêtre
    rect(27, 91, 18, 14, '#1a1c2c');
    rect(28, 92, 16, 12, '#f3c27a');
    rect(29, 93, 6, 4, '#ffe2a8');
    rect(35, 92, 2, 12, '#3e2a19');
    rect(28, 97, 16, 2, '#3e2a19');
    rect(26, 105, 20, 3, '#4a3325');
    [[28, '#e8897a'], [32, '#e0b43a'], [37, '#f4b8c8'], [42, '#e8897a']].forEach(function (f) { px(f[0], 104, f[1]); px(f[0] + 1, 104, '#4f8a3c'); });
    // Porte
    rect(63, 93, 17, 25, '#1a1c2c');
    rect(64, 94, 15, 23, '#4a3325');
    for (var dx = 67; dx < 79; dx += 4) rect(dx, 94, 1, 23, '#3e2a19');
    rect(75, 105, 2, 2, '#e0b43a');
    // Filet de pêche accroché au mur
    for (var ny = 0; ny < 12; ny++) for (var nx = 0; nx < 10; nx++) if ((nx + ny) % 3 === 0) px(84 + nx, 92 + ny, '#b8ad6e');
    // Tonneau
    rect(84, 106, 11, 12, '#1a1c2c');
    rect(85, 107, 9, 10, '#5e4228');
    rect(85, 109, 9, 1, '#3e2a19');
    rect(85, 114, 9, 1, '#3e2a19');
    rect(86, 107, 2, 10, '#7a5634');

    // Toit de chaume moussu (en A)
    for (var ty2 = 52; ty2 <= 84; ty2++) {
      var hw = Math.round((ty2 - 52) / 32 * 54) + 2;
      for (var tx2 = 58 - hw; tx2 <= 58 + hw; tx2++) {
        var edge = tx2 === 58 - hw || tx2 === 58 + hw || ty2 === 52;
        var col = edge ? '#1a1c2c' : (ty2 % 3 === 0 ? '#5e4a26' : '#7a6232');
        if (!edge && ((tx2 * 7 + ty2 * 13) % 11 === 0)) col = '#8a7440';
        if (!edge && ((tx2 * 5 + ty2 * 3) % 7 < (ty2 > 70 ? 4 : 2))) col = ty2 % 2 ? '#3f5a34' : '#4f6b3a';
        px(tx2, ty2, col);
      }
    }
    rect(4, 84, 110, 1, '#1a1c2c');
    rect(16, 85, 85, 2, '#2e2018');
    // mousse qui pend du bord du toit
    for (var mm = 6; mm < 112; mm += 3) {
      var ml = 1 + Math.floor(noise(mm * 1.7) * 6);
      rect(mm, 85, 1, ml, noise(mm) > 0.5 ? '#4f6b3a' : '#3f5a34');
    }
    // Cheminée
    rect(79, 49, 11, 19, '#1a1c2c');
    rect(80, 50, 9, 18, '#5b6068');
    for (var cy = 53; cy < 68; cy += 4) rect(80, cy, 9, 1, '#3e434b');
    rect(78, 48, 13, 3, '#3e434b');
    rect(80, 60, 3, 4, '#3f5a34');
    // Lanterne du porche
    rect(106, 85, 1, 5, '#1a1c2c');
    rect(104, 90, 5, 7, '#1a1c2c');
    rect(105, 91, 3, 5, '#c9e07a');
    if (theme.shift) recolor(front, theme.shift, true);
    if (theme.snow) { // neige sur le toit, la cheminée et le ponton
      for (var sy = 52; sy <= 84; sy++) {
        var shw = Math.round((sy - 52) / 32 * 54) + 1;
        for (var sx = 58 - shw; sx <= 58 + shw; sx++) if ((sy < 60 || noise(sx * 3 + sy) < 0.35 - (sy - 60) * 0.012)) px(sx, sy, noise(sx + sy * 7) < 0.3 ? '#c8d0dc' : '#eef2f6');
      }
      rect(79, 47, 13, 2, '#eef2f6');
      for (var sp2 = 6; sp2 < 208; sp2++) if (noise(sp2 * 1.3) < 0.55) px(sp2, 117, '#eef2f6');
    }
    return { back: back, front: front, theme: theme, biome: biomeId, tint: tinter(theme.shift) };
  }

  // Grottes Luisantes : la voûte d'une caverne avec ses stalactites, et des cristaux au bord de l'eau
  function caveCeiling(ctx) {
    for (var x = 0; x < W; x++) {
      var len = 40 + Math.floor(noise(x * 0.31) * 12) + (x % 9 === 0 ? Math.floor(noise(x) * 26) : 0) + (x % 9 === 1 || x % 9 === 8 ? Math.floor(noise(x - 1) * 14) : 0);
      for (var y = 0; y < len; y++) { ctx.fillStyle = y < len - 3 ? '#0c0a16' : '#221c38'; ctx.fillRect(x, y, 1, 1); }
    }
    [[22, 99], [124, 98], [236, 97], [302, 99]].forEach(function (p, n) {
      [[0, 0, 7], [-3, 2, 5], [3, 2, 5]].forEach(function (s) {
        for (var h = 0; h < s[2]; h++) {
          var w = Math.max(1, Math.round((s[2] - h) / 2));
          ctx.fillStyle = h < 2 ? '#d4fbff' : (n % 2 ? '#5fd3e0' : '#8a6fe0');
          ctx.fillRect(p[0] + s[0] - (w >> 1), p[1] + s[1] - h, w, 1);
        }
      });
    });
  }
  // Temple Englouti : une pyramide à degrés à l'horizon et des colonnes brisées dans l'eau
  function sunkenRuins(ctx) {
    var r = function (x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    for (var st = 0; st < 5; st++) r(228 + st * 6, HORIZON - 6 - st * 5, 60 - st * 12, 5, st % 2 ? '#1a3034' : '#203a3e');
    r(254, HORIZON - 36, 8, 6, '#203a3e');
    [[262, 108, 22], [292, 112, 14]].forEach(function (c) {
      r(c[0] - 4, c[1] - c[2], 9, c[2], '#10181a'); r(c[0] - 3, c[1] - c[2] + 1, 7, c[2] - 1, '#6b7f86'); r(c[0] - 3, c[1] - c[2] + 1, 2, c[2] - 1, '#9ab0b6');
      r(c[0] + 2, c[1] - c[2] + 1, 2, c[2] - 1, '#3e4e54'); r(c[0] - 5, c[1] - c[2] - 1, 11, 2, '#9ab0b6');
      for (var ry = 0; ry < 8; ry += 2) r(c[0] - 3, c[1] + ry, 7, 1, '#2a4448');
    });
  }

  // Éléments animés
  var FIREFLIES = [];
  for (var i = 0; i < 40; i++) {
    FIREFLIES.push({ x: (i * 73) % 300 + 10, y: 60 + (i * 37) % 110, ph: i * 1.7, sp: 0.3 + (i % 5) * 0.12 });
  }
  var STARS = [];
  for (var s = 0; s < 30; s++) STARS.push({ x: (s * 131) % W, y: (s * 57) % 40, ph: s * 0.9 });

  function reeds(ctx, x0, x1, t, tc) {
    for (var x = x0; x < x1; x += 3) {
      var h = 22 + ((x * 7) % 18);
      var sway = Math.round(Math.sin(t * 1.1 + x * 0.4) * 1.5);
      for (var y = 0; y < h; y++) {
        var off = Math.round(sway * (y / h));
        ctx.fillStyle = tc(y > h - 4 ? '#0a120d' : ((x / 3) % 2 ? '#16291c' : '#1f3624'));
        ctx.fillRect(x + off, H - y - 1, 1, 1);
      }
      if (x % 2 === 0) {
        ctx.fillStyle = '#4a3325';
        ctx.fillRect(x + sway, H - h - 4, 2, 5);
      }
    }
  }

  // Branche au premier plan, en haut à gauche, drapée de mousse qui se balance
  function mossBranch(ctx, t, tc) {
    ctx.fillStyle = tc('#0e1812');
    for (var x = 0; x < 78; x++) {
      var y = Math.round(10 + x * 0.12 + Math.sin(x * 0.15) * 2);
      ctx.fillRect(x, y - 2, 1, x < 40 ? 5 : 3);
    }
    for (var m = 2; m < 76; m += 3) {
      var len = 6 + Math.floor(noise(m * 2.3) * 22);
      var base = Math.round(10 + m * 0.12 + Math.sin(m * 0.15) * 2);
      for (var k = 0; k < len; k++) {
        var sway = Math.round(Math.sin(t * 0.9 + m * 0.3) * (k / len) * 2);
        ctx.fillStyle = tc(k % 4 === 3 ? '#2f4230' : '#3a4a34');
        ctx.fillRect(m + sway, base + k, 1, 1);
      }
    }
  }

  // Le décor est dessiné en trois couches superposées (effet de profondeur au mouvement de la souris) :
  // L.back = ciel, arbres, lac et brume lointaine ; L.mid = halo, cabane, ponton et Kawazu ;
  // L.front = roseaux, branche moussue, brume proche et lucioles.
  function draw(L, stat, t, hero, fx, zen) {
    var ctx = L.back, th = stat.theme || THEMES.marais;
    ctx.drawImage(stat.back, 0, 0);

    if (!th.cave) STARS.forEach(function (st) {
      var a = Math.sin(t * 2 + st.ph);
      if (a < 0.2) return;
      ctx.fillStyle = a > 0.8 ? '#e6e8c8' : '#8a9a7a';
      ctx.fillRect(st.x, st.y, 1, 1);
    });

    // reflet de la lune (pas sous la voûte des grottes)
    for (var y = HORIZON + 2; y < (th.cave ? 0 : 150); y += 2) {
      var n = noise(y * 3 + Math.floor(t * 2.5) * 7);
      if (n < 0.35) continue;
      var w = Math.max(2, 12 - (y - HORIZON) * 0.15);
      ctx.fillStyle = y < 118 ? '#c8caa8' : '#7a8a68';
      ctx.fillRect(Math.round(MOON.x - w / 2 + Math.sin(t * 1.5 + y) * 2), y, Math.round(w * n), 1);
    }
    // ondulations lentes
    for (var wy = HORIZON + 5; wy < H; wy += 6) {
      for (var k = 0; k < 3; k++) {
        var seed = noise(wy * 3.7 + k * 91.3);
        var wx = Math.round((seed * W + t * (3 + wy * 0.04)) % (W + 20)) - 10;
        ctx.fillStyle = stat.tint(wy < 130 ? '#3a4a36' : '#243426');
        ctx.fillRect(wx, wy, 3 + Math.round(seed * 5), 1);
      }
    }
    // bulles qui remontent et éclatent
    for (var b = 0; b < 7; b++) {
      var ph = (t * 0.35 + b * 0.37) % 1;
      var bx = Math.round(20 + noise(b * 5.1) * 280), by = Math.round(120 + noise(b * 2.7) * 55);
      if (ph < 0.7) {
        ctx.fillStyle = stat.tint('#5a7a4a');
        ctx.fillRect(bx, by - Math.round(ph * 3), 1, 1);
      } else if (ph < 0.85) {
        ctx.strokeStyle = 'rgba(122,154,100,0.6)';
        ctx.strokeRect(bx - 1.5, by - 2.5, 3, 2);
      } else {
        ctx.fillStyle = 'rgba(122,154,100,0.35)';
        ctx.fillRect(bx - 3, by - 2, 1, 1);
        ctx.fillRect(bx + 3, by - 2, 1, 1);
      }
    }
    // brume lointaine
    fogBand(ctx, t, 84, 10, 0.13, 0, th.fog);
    fogBand(ctx, t, 104, 8, 0.1, 1, th.fog);

    // ----- couche du milieu : halo, cabane, ponton, Kawazu -----
    ctx = L.mid;
    ctx.clearRect(0, 0, W, H);
    // halo clair derrière Kawazu, qui respire doucement (sur le nénuphar quand il médite)
    var hx = zen ? PAD.x : HERO.x + 16, hy = zen ? PAD.y - 14 : HERO.y + 18;
    var r = 58 + Math.sin(t * 0.8) * 3;
    var glow = ctx.createRadialGradient(hx, hy, 4, hx, hy, r);
    glow.addColorStop(0, 'rgba(' + th.halo + ',0.42)');
    glow.addColorStop(0.45, 'rgba(' + th.halo + ',0.16)');
    glow.addColorStop(1, 'rgba(' + th.halo + ',0)');
    ctx.fillStyle = glow;
    ctx.fillRect(hx - r, hy - r, r * 2, r * 2);

    ctx.drawImage(stat.front, 0, 0);

    // lumière de la fenêtre et de la lanterne
    var flick = 0.5 + 0.5 * Math.sin(t * 7) * Math.sin(t * 3.1);
    ctx.fillStyle = 'rgba(243,194,122,' + (0.12 + flick * 0.06) + ')';
    ctx.fillRect(24, 88, 24, 20);
    ctx.fillStyle = 'rgba(201,224,122,' + (0.14 + flick * 0.06) + ')';
    ctx.fillRect(101, 87, 11, 13);
    ctx.fillStyle = 'rgba(243,194,122,0.3)';
    for (var ly = 142; ly < 160; ly += 3) ctx.fillRect(30 + Math.round(Math.sin(t * 2 + ly) * 2), ly, 10, 1);

    // fumée de la cheminée
    for (var p = 0; p < 5; p++) {
      var sph = (t * 0.18 + p / 5) % 1;
      var size = 2 + Math.round(sph * 4);
      ctx.fillStyle = 'rgba(170,190,160,' + (0.5 * (1 - sph)).toFixed(2) + ')';
      ctx.fillRect(Math.round(84 + Math.sin(sph * 6 + p) * 3 + sph * 14 - size / 2), Math.round(46 - sph * 42), size, size);
    }

    // Kawazu + ombre (+ onde de choc éventuelle), ou Kawazu qui médite sur son nénuphar
    if (zen) drawZen(ctx, t, zen);
    else {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(HERO.x + 16, HERO.y + 31, 11, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (hero) ctx.drawImage(hero, HERO.x, HERO.y);
      if (fx) ctx.drawImage(fx, HERO.x + 28, HERO.y);
    }

    // ----- premier plan : roseaux, branche moussue, brume proche, lucioles -----
    ctx = L.front;
    ctx.clearRect(0, 0, W, H);
    fogBand(ctx, t, 136, 12, 0.08, 2, th.fog);
    reeds(ctx, 0, 40, t, stat.tint);
    reeds(ctx, 280, W, t, stat.tint);
    mossBranch(ctx, t, stat.tint);
    if (th.snow) { // flocons
      for (var sn = 0; sn < 70; sn++) {
        var fy = (sn * 37 + t * (10 + (sn % 5) * 4)) % H, fx2 = (sn * 53 + Math.sin(t + sn) * 6 + t * 4) % W;
        ctx.fillStyle = sn % 3 ? '#eef2f6' : '#ffffff';
        ctx.fillRect(Math.round(fx2), Math.round(fy), sn % 4 ? 1 : 2, 1);
      }
    }
    if (th.leaves) { // feuilles de saule qui tombent en tournoyant
      for (var lf = 0; lf < 18; lf++) {
        var ly2 = (lf * 41 + t * (8 + (lf % 4) * 3)) % (H + 10) - 5, lx2 = (lf * 67 + Math.sin(t * 1.3 + lf) * 10 + t * 3) % W;
        ctx.fillStyle = ['#c9702a', '#e0a040', '#8a4a1a'][lf % 3];
        ctx.fillRect(Math.round(lx2), Math.round(ly2), Math.sin(t * 3 + lf) > 0 ? 2 : 1, 1);
      }
    }
    if (th.cave) { // éclats des cristaux
      [[22, 93], [124, 92], [236, 91], [302, 93]].forEach(function (p, n) {
        var a = Math.sin(t * 2.4 + n * 1.7);
        if (a < 0.5) return;
        ctx.fillStyle = 'rgba(212,251,255,' + ((a - 0.5) * 1.6).toFixed(2) + ')';
        ctx.fillRect(p[0], p[1] - 3, 1, 7); ctx.fillRect(p[0] - 3, p[1], 7, 1);
      });
    }
    if (th.fire) FIREFLIES.slice(0, th.fires).forEach(function (fl) {
      var x = Math.round(fl.x + Math.sin(t * fl.sp + fl.ph) * 14);
      var yy = Math.round(fl.y + Math.cos(t * fl.sp * 1.3 + fl.ph) * 8);
      var g2 = Math.sin(t * 2.2 + fl.ph);
      if (g2 < -0.2) return;
      ctx.fillStyle = th.fire + '38';
      ctx.fillRect(x - 1, yy - 1, 3, 3);
      ctx.fillStyle = g2 > 0.6 ? '#ffffff' : th.fire;
      ctx.fillRect(x, yy, 1, 1);
    });
  }

  // bande de brume qui dérive
  function fogBand(ctx, t, fy, fh, alpha, f, rgb) {
    ctx.fillStyle = 'rgba(' + (rgb || '190,210,180') + ',' + alpha + ')';
    for (var seg = 0; seg < 7; seg++) {
      var sx = Math.round(((seg * 67 + t * (4 + f * 3)) % (W + 80)) - 40);
      var sw = 40 + Math.round(noise(seg + f * 11) * 30);
      var dy = Math.round(Math.sin(t * 0.5 + seg) * 2);
      ctx.fillRect(sx, fy + dy, sw, fh);
      ctx.fillRect(sx + 6, fy - 2 + dy, sw - 12, 2);
    }
  }

  // Logo emblème 64×64 : médaillon doré, marais sous la lune, kunaïs croisés, Kawazu sur un nénuphar
  function makeLogo(sp) {
    var c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    var ctx = c.getContext('2d');
    var px = function (x, y, col) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); };
    var dist = function (x, y) { return Math.hypot(x + 0.5 - 32, y + 0.5 - 32); };

    ditherFill(ctx, 0, 0, 64, 41, [[6, '#0f1f19'], [22, '#1f3a2c'], [34, '#4a6040'], [41, '#8a8a55']], function (x, y) { return dist(x, y) <= 26; });
    for (var y = 41; y < 64; y++) {
      for (var x = 0; x < 64; x++) {
        if (dist(x, y) > 26) continue;
        px(x, y, (y === 44 && x % 5 < 3) || (y === 49 && (x + 2) % 6 < 3) ? '#2f4a36' : '#1c2b20');
      }
    }
    for (var my = 8; my < 20; my++) {
      for (var mx = 38; mx < 52; mx++) {
        var d = Math.hypot(mx - 45, my - 14);
        if (d < 4.5) px(mx, my, '#e6e8c8'); else if (d < 6 && (mx + my) % 2 === 0) px(mx, my, '#3f5a44');
      }
    }
    [[20, 12], [29, 7], [15, 20]].forEach(function (s) { px(s[0], s[1], '#c8caa8'); });

    // kunaïs croisés
    var kunai = function (ax, ay, bx, by) {
      var steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
      var pts = [];
      for (var i = 0; i <= steps; i++) {
        var t = i / steps;
        pts.push([Math.round(ax + (bx - ax) * t), Math.round(ay + (by - ay) * t), t]);
      }
      pts.forEach(function (p) { for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 2; ox++) if (dist(p[0] + ox, p[1] + oy) <= 26) px(p[0] + ox, p[1] + oy, '#1a1c2c'); });
      pts.forEach(function (p) {
        if (dist(p[0], p[1]) > 25.5) return;
        var col = p[2] < 0.3 ? (Math.floor(p[2] * 30) % 2 ? '#4a3325' : '#2e2018') : (p[2] > 0.92 ? '#ffffff' : '#d9e1e6');
        px(p[0], p[1], col);
        px(p[0] + 1, p[1], p[2] < 0.3 ? '#4a3325' : '#a9b3bf');
      });
    };
    kunai(12, 52, 50, 14);
    kunai(51, 52, 13, 14);

    // nénuphar sous Kawazu
    for (var ly = -4; ly <= 4; ly++) {
      for (var lx = -16; lx <= 16; lx++) {
        var e = (lx * lx) / 256 + (ly * ly) / 16;
        if (e > 1) continue;
        px(32 + lx, 43 + ly, e > 0.7 ? '#1d3b24' : (ly < 0 ? '#6fae52' : '#4f8a3c'));
      }
    }
    // tête de Kawazu (lignes 3 à 21 du sprite de face)
    for (var gy = 3; gy <= 21; gy++) {
      for (var gx = 1; gx <= 30; gx++) {
        var ch = sp.main[gy][gx];
        if (ch === '.' || !sp.PAL[ch]) continue;
        px(16 + gx, 18 + gy, sp.PAL[ch]);
      }
    }
    // médaillon doré
    for (var ry = 0; ry < 64; ry++) {
      for (var rx = 0; rx < 64; rx++) {
        var dd = dist(rx, ry);
        if (dd > 30.6) continue;
        if (dd > 29.4 || (dd > 25.8 && dd <= 26.8)) px(rx, ry, '#1a1c2c');
        else if (dd > 26.8) px(rx, ry, rx + ry < 54 ? '#f3d27a' : (rx + ry > 76 ? '#a8801f' : '#e0b43a'));
      }
    }
    return c;
  }

  // La méditation : un grand nénuphar qui tangue doucement, des ronds dans l'eau, la grenouille assise les yeux
  // fermés, un souffle lumineux qui monte et des pétales de lotus qui s'envolent
  function drawZen(ctx, t, img) {
    var bob = Math.round(Math.sin(t * 1.3) * 1), px = PAD.x, py = PAD.y + bob;
    for (var k = 0; k < 3; k++) { // ronds dans l'eau
      var ph = (t * 0.25 + k / 3) % 1, rx = 22 + ph * 26, ry = 5 + ph * 6;
      ctx.strokeStyle = 'rgba(200,230,210,' + (0.35 * (1 - ph)).toFixed(2) + ')';
      ctx.beginPath(); ctx.ellipse(px, PAD.y + 2, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    }
    for (var y = -7; y <= 7; y++) for (var x = -24; x <= 24; x++) { // la feuille, avec son encoche
      var d = (x * x) / 576 + (y * y) / 49;
      if (d > 1 || (x > -3 && x < 3 && y > 0)) continue;
      ctx.fillStyle = d > 0.82 ? '#1f4a2a' : (y < -3 ? '#6fae4a' : (Math.abs(x + y * 2) % 9 === 0 ? '#3f7a3a' : '#4e9a45'));
      ctx.fillRect(px + x, py + y, 1, 1);
    }
    ctx.fillStyle = '#ff9ac0'; ctx.fillRect(px + 17, py - 4, 3, 2); ctx.fillStyle = '#ffd0e0'; ctx.fillRect(px + 18, py - 5, 1, 1); // une petite fleur
    var breath = 0.5 + 0.5 * Math.sin(t * 0.9); // le souffle qui monte et descend
    ctx.strokeStyle = 'rgba(243,210,122,' + (0.15 + breath * 0.2).toFixed(2) + ')';
    ctx.beginPath(); ctx.ellipse(px, py - 16, 15 + breath * 3, 17 + breath * 3, 0, 0, Math.PI * 2); ctx.stroke();
    if (img) ctx.drawImage(img, px - 16, py - 30);
    for (var p = 0; p < 6; p++) { // des pétales et des lucioles qui s'élèvent
      var q = (t * 0.12 + p / 6) % 1;
      ctx.fillStyle = p % 2 ? 'rgba(255,208,224,' + (0.8 * (1 - q)).toFixed(2) + ')' : 'rgba(243,226,138,' + (0.9 * (1 - q)).toFixed(2) + ')';
      ctx.fillRect(Math.round(px - 14 + (p * 7) % 28 + Math.sin(t * 1.5 + p) * 3), Math.round(py - 22 - q * 40), p % 2 ? 2 : 1, 1);
    }
  }

  return { W: W, H: H, HERO: HERO, PAD: PAD, buildStatic: buildStatic, draw: draw, makeLogo: makeLogo };
})();
