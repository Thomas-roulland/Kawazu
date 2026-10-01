// Sprites de Kawazu : repris tels quels de la maquette Claude Design (fiche héros + animations).
// Chaque sprite est une grille de caractères ; chaque caractère est une couleur de PAL ('.' = transparent).

function buildKawazu() {
  var PAL = { k: '#1a1c2c', g: '#2e6b3d', m: '#4e9a45', l: '#8fce52', c: '#efe6a8', w: '#f4f4e8', h: '#e8897a', r: '#c9412f', R: '#86261c', b: '#6e4a2a', y: '#e0b43a', o: '#4a3325', t: '#d9e1e6', S: '#ffffff', a: '#c3c9d1', A: '#7d8694' };
  var ROLES = { k: 'Contour', g: 'Vert ombre', m: 'Vert peau', l: 'Vert lumière', c: 'Ventre', w: 'Œil', h: 'Joues', r: 'Écharpe', R: 'Écharpe ombre', b: 'Ceinture', y: 'Boucle', o: 'Manche kunaï', t: 'Lame', S: 'Éclat', a: 'Onde claire', A: 'Onde sombre' };
  var FL = [
    '................',
    '................',
    '................',
    '.....kkkk.......',
    '....kwwwwk......',
    '...kwwwwwwk.....',
    '...kwwkkwwk.....',
    '..kmwwkkwwmk....',
    '..kmmwwwwmmkkkkk',
    '..kmmmmmmmmmmlll',
    '.kgmmmmmmmmmmmmm',
    '.kgmmmmmmmmmmmmm',
    '.kgmmmmmmmmmmmmm',
    '.kgmmmmmmmmmmmmm',
    '.kgmmmmmmmmmmmmm',
    '.kgmhhmmmmmmmmmm',
    '.kgmmkmmmmmmmmmm',
    '.kggmmkkkkkkkkkk',
    '..kgmmmmmmmmmmmm',
    '..krrrrrrrrrrrrr',
    '..kRrrrrrrrrrrrr',
    '...kRRRRRRRRRRRR',
    '..kmmkkgmmcccccc',
    '..kmmkgmmccccccc',
    '..kllkbbbbbbbbby',
    '...kkkgmmccccccc',
    '...kmmmkmccccccc',
    '..kmmmmmkccccccc',
    '..kmmmmmmkkkkkkk',
    '..kgmmmmmk......',
    '.kllkllkllk.....',
    '.kkkkkkkkkk.....'
  ];
  var SIDE = [
    '', '', '',
    '................kkkkkk',
    '...............kwwwwwwk',
    '..............kwwwwkkwk',
    '..............kwwwwkkwk',
    '.............kmwwwwwwmk',
    '..........kkkmmmwwwwmmkkk',
    '.........kmmmmmmmlllmmmmk',
    '.........kgmmmmmmmmmmmmmmmk',
    '.........kgmmmmmmmmmmmmmmmmk',
    '.........kgmmmmmmmmmmmmmmmmmk',
    '.........kgmmmmmmmmmmmmmmmmmmk',
    '.........kggmmmmmmmmmmmmmmmhmmk',
    '.........kggmmmmmmmmmkkkkkkkkkk',
    '..........kgmmmmmmmmmmmlllllk',
    '..........krrrrrrrrrrrrrrrrk',
    '...RRr...kRrrrrrrrrrrrrrRk',
    '....RRrrrRkRRRRRRRRRRRRRRk',
    '.........kgmmmmmkmmmmkcccck',
    '.........kggmmmmkmmmmkccccck',
    '.........kggmmmmkmmmmkccccck',
    '.........kbbbbbbkmmmmkbbbbyk',
    '........kmmmmmmmklllllkccccck',
    '.......kmmmmmmmmmkkkkkkcccck',
    '......kgmmmmmmmmmmkccccccck',
    '......kggmmmmmmmmkcccccck',
    '.......kgggmmmmmkkkkkkkk',
    '......kmmmmkkk..kmmmk',
    '.....kllklllk...kllllk',
    '.....kkkkkkkk...kkkkkk'
  ];
  var pad = function (r, n) { return (r + '.'.repeat(n)).slice(0, n).split(''); };
  var front = function (ov) {
    var L = FL.map(function (r) { return pad(r, 16); });
    ov.forEach(function (o) { L[o[0]][o[1]] = o[2]; });
    return L.map(function (a) { return a.concat(a.slice().reverse()); });
  };
  var put = function (g, ov, under) {
    ov.forEach(function (o) { if (!under || g[o[0]][o[1]] === '.') g[o[0]][o[1]] = o[2]; });
    return g;
  };
  var flip = function (ov) { return ov.map(function (o) { return [o[0], 31 - o[1], o[2]]; }); };
  var tail = [[21, 29, 'R'], [21, 30, 'k'], [22, 30, 'r'], [22, 31, 'k'], [23, 30, 'r'], [23, 31, 'k'], [24, 30, 'R'], [24, 31, 'k'], [25, 30, 'k']];

  var main = put(front([]), tail, true);

  var back = front([[6, 6, 'm'], [6, 7, 'm'], [7, 6, 'm'], [7, 7, 'm'], [16, 5, 'm']]);
  for (var y = 0; y < 32; y++) {
    for (var x = 0; x < 32; x++) {
      var c = back[y][x];
      if (y <= 8 && c === 'w') back[y][x] = 'm';
      if (c === 'h') back[y][x] = 'm';
      if (y === 17 && x >= 6 && x <= 25) back[y][x] = 'm';
      if (y >= 22 && c === 'c') back[y][x] = 'm';
      if (c === 'y') back[y][x] = 'b';
    }
  }
  put(back, flip(tail), true);

  var side = SIDE.map(function (r) { return pad(r, 32); });
  var atk = side.map(function (r) { return r.slice(); });
  for (var ay = 20; ay <= 22; ay++) { atk[ay][16] = 'm'; atk[ay][21] = 'm'; }
  for (var ax = 16; ax <= 21; ax++) { atk[23][ax] = 'b'; atk[24][ax] = 'm'; }
  atk[24][22] = 'c';
  for (var bx = 17; bx <= 21; bx++) atk[25][bx] = 'm';
  atk[25][22] = 'c';
  for (var kx = 22; kx <= 31; kx++) { atk[19][kx] = 'k'; atk[21][kx] = 'k'; }
  put(atk, [[20, 22, 'm'], [20, 23, 'm'], [20, 24, 'm'], [20, 25, 'm'], [20, 26, 'l'], [20, 27, 'l'], [20, 28, 'o'], [20, 29, 't'], [20, 30, 't'], [20, 31, 'S']], false);

  var joie = front([[6, 6, 'w'], [6, 7, 'w'], [7, 6, 'w'], [7, 7, 'w'], [6, 4, 'k'], [5, 5, 'k'], [4, 6, 'k'], [4, 7, 'k'], [5, 8, 'k'], [6, 9, 'k'],
    [17, 8, 'R'], [17, 9, 'R'], [17, 10, 'R'], [17, 11, 'R'], [17, 12, 'R'], [17, 13, 'R'], [17, 14, 'R'], [17, 15, 'R'],
    [18, 9, 'k'], [18, 10, 'k'], [18, 11, 'k'], [18, 12, 'k'], [18, 13, 'k'], [18, 14, 'k'], [18, 15, 'k']]);
  var colere = front([[4, 6, 'k'], [4, 7, 'k'], [5, 8, 'k'], [5, 9, 'k'], [16, 5, 'm'], [17, 6, 'm']]);
  var ko = front([[6, 6, 'w'], [6, 7, 'w'], [7, 6, 'w'], [7, 7, 'w'],
    [4, 5, 'k'], [5, 6, 'k'], [6, 7, 'k'], [7, 8, 'k'], [4, 8, 'k'], [5, 7, 'k'], [6, 6, 'k'], [7, 5, 'k'],
    [16, 5, 'm'], [16, 7, 'k'], [16, 9, 'k'], [16, 11, 'k'], [16, 13, 'k'], [16, 15, 'k'],
    [17, 7, 'm'], [17, 9, 'm'], [17, 11, 'm'], [17, 13, 'm'], [17, 15, 'm']]);

  var shadow = function (g, s, y0, y1) {
    var out = [];
    for (var yy = y0; yy <= y1; yy++) {
      for (var xx = 0; xx < g[yy].length; xx++) {
        var ch = g[yy][xx];
        if (ch !== '.' && PAL[ch]) out.push(((xx + 1) * s) + 'px ' + ((yy - y0 + 1) * s) + 'px 0 0 ' + PAL[ch]);
      }
    }
    return out.join(', ');
  };

  // Onde de choc : demi-cercle non rempli, centre (2, 18) = pointe du kunaï
  var arc = function (r, dotted, bright) {
    var g = [];
    for (var i = 0; i < 32; i++) g.push(pad('', 32));
    for (var yy = 0; yy < 32; yy++) {
      for (var xx = 2; xx < 32; xx++) {
        var d = Math.sqrt((xx - 2) * (xx - 2) + (yy - 18) * (yy - 18));
        if (d < r - 1.5 || d >= r + 0.5) continue;
        if (dotted && (xx + yy) % 2) continue;
        g[yy][xx] = d >= r - 0.5 ? 'A' : (bright ? 'S' : 'a');
      }
    }
    return g;
  };
  var fx = [arc(5, false, true), arc(9, false, false), arc(13, true, false)];

  return { PAL: PAL, ROLES: ROLES, shadow: shadow, put: put, main: main, side: side, back: back, atk: atk, joie: joie, colere: colere, ko: ko, blank: front([]), fx: fx, pad: pad };
}

// Animations du héros, identiques à la planche « Animations » de la maquette.
function buildKawazuAnims(sp) {
  var clone = function (g) { return g.map(function (r) { return r.slice(); }); };
  // Déplace une zone de pixels (utilisé pour lever un pied, tasser le corps…)
  var move = function (g, r0, r1, c0, c1, dx, dy) {
    var out = clone(g), buf = [];
    for (var y = r0; y <= r1; y++) {
      for (var x = c0; x <= c1; x++) {
        if (g[y][x] !== '.') buf.push([y, x, g[y][x]]);
        out[y][x] = '.';
      }
    }
    buf.forEach(function (p) {
      var ny = p[0] + dy, nx = p[1] + dx;
      if (ny >= 0 && ny < 32 && nx >= 0 && nx < 32) out[ny][nx] = p[2];
    });
    return out;
  };
  var flash = function (g) { return g.map(function (r) { return r.map(function (c) { return c === '.' || c === 'k' ? c : 'w'; }); }); };

  // les Légendaires : la cape et le bandeau flottent (4 images au repos : respiration × vent)
  var W = sp.wind, stance = sp.hermitStance || sp.side;
  var breathe = function (g, gw) { return W ? [g, gw, move(g, 0, 27, 0, 31, 0, 1), move(gw, 0, 27, 0, 31, 0, 1)] : [g, move(g, 0, 27, 0, 31, 0, 1)]; };
  return {
    idle: { fps: W ? 4 : 2, frames: breathe(sp.main, W && W.main) },
    down: { fps: 8, frames: [sp.main, move(sp.main, 29, 31, 0, 11, 0, -1), sp.main, move(sp.main, 29, 31, 20, 31, 0, -1)] },
    right: { fps: 8, frames: [sp.side, move(sp.side, 29, 31, 15, 22, 1, -1), sp.side, move(sp.side, 29, 31, 4, 13, 1, -1)] },
    up: { fps: 8, frames: [sp.back, move(sp.back, 29, 31, 0, 11, 0, -1), sp.back, move(sp.back, 29, 31, 20, 31, 0, -1)] },
    idleUp: { fps: W ? 4 : 2, frames: breathe(sp.back, W && W.back) },
    // mode Ermite : posture de garde, paume ouverte
    idleRight: { fps: W ? 4 : 2, frames: breathe(stance, W && W.side) },
    // Attaque : recul, coup + onde de choc (sprite séparé, posé 28 px devant l'origine du héros)
    // mode Ermite : le souffle se concentre devant la poitrine, puis coup de paume, bras tendu
    attack: {
      frames: sp.hermitAtk ? [move(sp.hermitAtk[1], 0, 28, 0, 31, -1, 0), sp.hermitAtk[2], sp.hermitAtk[2], sp.hermitAtk[0]]
        : [move(sp.side, 0, 28, 0, 31, -1, 0), sp.atk, sp.atk, sp.atk],
      fx: [null, sp.fx[0], sp.fx[1], sp.fx[2]],
      durations: [0.09, 0.07, 0.07, 0.14]
    },
    hurt: { fps: 8, frames: [flash(sp.main), move(sp.ko, 0, 31, 0, 31, -1, 0)] },
    // coup de pied (Voie de l'Ermite) : la jambe tendue
    kick: { frames: [sp.kick || sp.atk] }
  };
}

// Grille de pixels -> canvas (pal : palette à utiliser, flip : miroir horizontal)
function gridToCanvas(g, pal, flip) {
  var w = g[0].length, h = g.length;
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  var ctx = c.getContext('2d');
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var ch = g[y][x];
      if (ch === '.' || !pal[ch]) continue;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  }
  return c;
}
