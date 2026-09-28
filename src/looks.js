// Équipement visible sur Kawazu, ondes de choc par arme, et sprites des monstres.

// Les calques utilisent des caractères propres : H/I/J = chapeau (principal, ombre, reflet),
// b/y/Y = ceinture, boucle et breloque, N = anneau ; E/Z = yeux et marques du mode Ermite. Leurs couleurs viennent de l'objet équipé.
var HATS = {
  kasa: {
    front: [0, [
      '............kkkkkkkk............',
      '........kkkkJJJHHHHHkkkk........',
      '.....kkkJJJJHHHHHHHHHIIIkkk.....',
      '...kkIIIIIIIIIIIIIIIIIIIIIIkk...',
      '....kkkkkkkkkkkkkkkkkkkkkkkk....'
    ]],
    side: [0, [
      '..............kkkkkk............',
      '...........kkkJJHHHHkkk.........',
      '.........kkJJJHHHHHHHIIkk.......',
      '.......kkIIIIIIIIIIIIIIIIIkk....',
      '........kkkkkkkkkkkkkkkkkk......'
    ]]
  },
  nenuphar: {
    front: [5, [
      '............kkkkkkkk............',
      '...........kHHJJHHHHk...........',
      '..........kHHHHHHPHHHk..........',
      '..........kIIIIIIIIIIk..........',
      '...........kkkkkkkkkk...........'
    ]],
    side: [6, [
      '........kkkkk...................',
      '.......kHHJPHk..................',
      '.......kIIIIIk..................',
      '........kkkkk...................'
    ]]
  },
  ecorce: {
    front: [4, [
      '............kkkkkkkk............',
      '...........kHHJJHHHHk...........',
      '..........kHJJHHHHHHIk..........',
      '..........kHHHHHHHHHIk..........',
      '..........kIIIIIIIIIIk..........',
      '..........kkkkkkkkkkkk..........'
    ]],
    side: [5, [
      '.........kkkkk..................',
      '........kHJJHHk.................',
      '........kHHHHIk.................',
      '........kIIIIIk.................',
      '........kkkkkkk.................'
    ]]
  }
};

function stampRows(g, r0, rows) {
  rows.forEach(function (row, i) {
    var y = r0 + i;
    if (y < 0 || y >= g.length) return;
    for (var x = 0; x < row.length && x < g[y].length; x++) if (row[x] !== '.') g[y][x] = row[x];
  });
}
function stampPixels(g, list) {
  list.forEach(function (p) { if (g[p[0]] && p[1] < g[p[0]].length) g[p[0]][p[1]] = p[2]; });
}
function emptyGrid() {
  var g = [];
  for (var i = 0; i < 32; i++) g.push('.'.repeat(32).split(''));
  return g;
}

// Ondes de choc, placées 28 px devant l'origine du héros : demi-cercle (arc) ou chevrons (thrust)
function arcFx(r, dotted, bright) {
  var g = emptyGrid();
  for (var y = 0; y < 32; y++) {
    for (var x = 2; x < 32; x++) {
      var d = Math.sqrt((x - 2) * (x - 2) + (y - 18) * (y - 18));
      if (d < r - 1.5 || d >= r + 0.5) continue;
      if (dotted && (x + y) % 2) continue;
      g[y][x] = d >= r - 0.5 ? 'A' : (bright ? 'S' : 'a');
    }
  }
  return g;
}
function thrustFx(xs, dotted) {
  var g = emptyGrid();
  xs.forEach(function (bx, n) {
    for (var dy = -4; dy <= 4; dy++) {
      if (dotted && (dy + n) % 2) continue;
      var x = bx + (4 - Math.abs(dy));
      if (x >= 0 && x < 31) { g[20 + dy][x] = n === 0 ? 'a' : 'A'; g[20 + dy][x + 1] = 'A'; }
    }
  });
  return g;
}
function buildFx(spec) {
  if (spec.type === 'none') return [null, null, null];
  if (spec.type === 'palm') return [palmFx(4, true, 0, false), palmFx(8, false, 3, false), palmFx(12, false, 4, true)];
  if (spec.type === 'thrust') return [thrustFx([2], false), thrustFx([10, 2], false), thrustFx([18, 10], true)];
  var r = spec.radii;
  var last = arcFx(r[2], true, false);
  if (spec.echo) {
    var inner = arcFx(r[1], true, false);
    inner.forEach(function (row, y) { row.forEach(function (c, x) { if (c !== '.') last[y][x] = 'a'; }); });
  }
  return [arcFx(r[0], false, true), arcFx(r[1], false, false), last];
}

// Onde de paume de l'Ermite : un éclat plein, puis un anneau avec des rayons, puis un anneau en pointillés.
// Centre (3, 19) : juste au bout de la paume tendue.
function palmFx(r, filled, rays, dotted) {
  var g = emptyGrid();
  for (var y = 0; y < 32; y++) {
    for (var x = 0; x < 32; x++) {
      var d = Math.sqrt((x - 3) * (x - 3) + (y - 19) * (y - 19));
      if (filled && d < r - 1.5) { g[y][x] = 'S'; continue; }
      if (d < r - 1.5 || d >= r + 0.5) continue;
      if (dotted && (x + y) % 2) continue;
      g[y][x] = d >= r - 0.5 ? 'A' : 'a';
    }
  }
  if (rays) {
    [[1, 0], [0.7, -0.7], [0.7, 0.7], [0, -1], [0, 1]].forEach(function (v) {
      for (var k = r + 2; k < r + 2 + rays; k++) {
        var px = Math.round(3 + v[0] * k), py = Math.round(19 + v[1] * k);
        if (px >= 0 && px < 32 && py >= 0 && py < 32) g[py][px] = 'a';
      }
    });
  }
  return g;
}

// Coup de pied : la jambe avant se lève et se tend à hauteur de hanche, le pied en avant (orteils relevés)
function kickPose(g) {
  var a = g.map(function (r) { return r.slice(); });
  for (var y = 29; y < 32; y++) for (var x = 15; x <= 22; x++) a[y][x] = '.';
  for (var lx = 20; lx <= 28; lx++) { a[23][lx] = 'k'; a[24][lx] = 'l'; a[25][lx] = 'm'; a[26][lx] = 'g'; a[27][lx] = 'k'; }
  [[21, 29, 'k'], [21, 30, 'k'], [22, 29, 'l'], [22, 30, 'l'], [22, 31, 'k'], [23, 29, 'l'], [23, 30, 'l'], [23, 31, 'k'], [24, 29, 'l'], [24, 30, 'l'], [24, 31, 'k'],
    [25, 29, 'm'], [25, 30, 'm'], [25, 31, 'k'], [26, 29, 'g'], [26, 30, 'k'], [27, 29, 'k']].forEach(function (p) { a[p[0]][p[1]] = p[2]; });
  return a;
}

// look = { hat, belt, charm, ring, hermit, weapon: 'kunai' | 'shuriken' | 'baton' | 'harpon' | 'katana' | 'masse' | 'mains', fx: { type: 'arc' | 'thrust' | 'palm' | 'none', radii, echo } }
function dressKawazu(sp, look) {
  var c = function (g) { return g.map(function (r) { return r.slice(); }); };
  var out = Object.assign({}, sp);
  var main = c(sp.main), side = c(sp.side), back = c(sp.back), atk = c(sp.atk), ko = c(sp.ko);
  var set = function (g, y, x, ch) { if (g[y] && x >= 0 && x < g[y].length) g[y][x] = ch; };
  var hermit = null;

  if (look.hermit) {
    // yeux de crapaud : iris jaune (E), pupille en barre horizontale, marques rouge-orangé (Z) autour
    var irises = function (g) { for (var y = 0; y <= 8; y++) for (var x = 0; x < 32; x++) if (g[y][x] === 'w') g[y][x] = 'E'; };
    [main, ko].forEach(function (g) {
      irises(g);
      [0, 1].forEach(function (m) {
        var X = function (x) { return m ? 31 - x : x; };
        if (g === main) for (var py = 6; py <= 7; py++) for (var px = 4; px <= 9; px++) set(g, py, X(px), px >= 5 && px <= 8 ? 'k' : 'E');
        [[7, 3], [7, 10], [8, 3], [8, 4], [8, 9], [8, 10], [9, 5], [9, 6], [9, 7], [9, 8]].forEach(function (p) { set(g, p[0], X(p[1]), 'Z'); });
      });
    });
    [side, atk].forEach(function (g) {
      irises(g);
      for (var py = 5; py <= 6; py++) for (var px = 15; px <= 21; px++) set(g, py, px, px >= 17 && px <= 20 ? 'k' : 'E');
      [[7, 14], [7, 21], [8, 14], [8, 15], [8, 20], [8, 21]].forEach(function (p) { set(g, p[0], p[1], 'Z'); });
    });
    // posture de combat : le bras qui pendait se replie, l'autre se tend en garde, paume ouverte
    var armless = function (g) {
      var a = c(g);
      for (var ay = 20; ay <= 22; ay++) { a[ay][16] = 'm'; a[ay][21] = 'm'; }
      for (var ax = 16; ax <= 21; ax++) { a[23][ax] = 'b'; a[24][ax] = 'm'; }
      a[24][22] = 'c';
      for (var bx = 17; bx <= 21; bx++) a[25][bx] = 'm';
      a[25][22] = 'c';
      return a;
    };
    // paume ouverte (3 × 5 px) : deux doigts séparés en haut, ombre sur le bord, contour autour
    var palm = function (g, x0, y0) {
      for (var y = y0; y < y0 + 5; y++) { set(g, y, x0, 'l'); set(g, y, x0 + 1, 'l'); set(g, y, x0 + 2, 'm'); set(g, y, x0 - 1, 'k'); set(g, y, x0 + 3, 'k'); }
      set(g, y0, x0 + 1, 'k');
      for (var x = x0; x <= x0 + 2; x++) { set(g, y0 - 1, x, 'k'); set(g, y0 + 5, x, 'k'); }
    };
    // avant-bras épais (2 px) à hauteur de poitrine
    var forearm = function (g, x0, x1) {
      for (var x = x0; x <= x1; x++) {
        set(g, 20, x, 'l'); set(g, 21, x, 'm'); set(g, 22, x, 'k');
        if (g[19][x] === '.' || g[19][x] === 'c') set(g, 19, x, 'k');
      }
    };
    var stance = armless(side);
    forearm(stance, 21, 26);
    palm(stance, 27, 16);
    var windup = armless(side);
    [[16, 28, 'a'], [17, 29, 'A'], [18, 30, 'A'], [19, 30, 'S'], [20, 30, 'A'], [21, 29, 'A'], [22, 28, 'a'], [19, 28, 'S'], [18, 28, 'a'], [20, 28, 'a']]
      .forEach(function (p) { set(windup, p[0], p[1], p[2]); }); // le souffle se concentre devant la poitrine
    var strike = armless(side);
    forearm(strike, 21, 28);
    palm(strike, 29, 17);
    hermit = [stance, windup, strike];
  }

  if (look.ring) {
    stampPixels(main, [[24, 28, 'N']]);
    stampPixels(ko, [[24, 28, 'N']]);
    stampPixels(back, [[24, 3, 'N']]);
    stampPixels(side, [[24, 19, 'N']]);
    stampPixels(atk, [[20, 27, 'N']]);
  }
  if (look.weapon === 'baton') {
    // bâton tendu : manche en bois, pierre (couleur de « t ») au bout
    stampPixels(atk, [[20, 28, 'o'], [20, 29, 'o'], [20, 30, 't'], [20, 31, 't'], [19, 30, 't'], [19, 31, 'S'], [21, 30, 't'], [21, 31, 't']]);
  } else if (look.weapon === 'harpon') {
    stampPixels(atk, [[20, 28, 'o'], [20, 29, 'o'], [20, 30, 't'], [20, 31, 'S'], [19, 30, 't'], [21, 30, 't'], [18, 29, 'k'], [22, 29, 'k']]);
  } else if (look.weapon === 'katana') {
    // katana : poignée, garde sombre, lame fine qui file vers le haut ; au repos, la poignée dépasse derrière le dos
    stampPixels(atk, [[20, 28, 'o'], [19, 29, 'k'], [20, 29, 'k'], [21, 29, 'k'], [19, 30, 't'], [18, 30, 't'], [18, 31, 'S'], [17, 31, 't'], [20, 30, 'k'], [20, 31, '.']]);
    stampPixels(side, [[9, 6, 'k'], [10, 6, 'o'], [10, 7, 'k'], [11, 7, 'o'], [11, 8, 'k'], [12, 7, 'k'], [12, 8, 'o'], [13, 8, 'k']]);
  } else if (look.weapon === 'masse') {
    // masse : un manche court et une grosse tête cerclée
    stampPixels(atk, [[20, 28, 'o'], [20, 29, 'o'], [17, 30, 'k'], [17, 31, 'k'], [18, 29, 'k'], [18, 30, 't'], [18, 31, 't'], [19, 29, 'k'], [19, 30, 'S'], [19, 31, 't'],
      [20, 30, 't'], [20, 31, 't'], [21, 29, 'k'], [21, 30, 't'], [21, 31, 't'], [22, 29, 'k'], [22, 30, 't'], [22, 31, 't'], [23, 30, 'k'], [23, 31, 'k']]);
  } else if (look.weapon === 'shuriken') {
    // shuriken : une étoile entre les doigts
    stampPixels(atk, [[20, 28, 't'], [20, 29, 'S'], [20, 30, 't'], [20, 31, '.'], [19, 29, 't'], [18, 29, 'k'], [21, 29, 't'], [22, 29, 'k'], [20, 27, 'k']]);
  }
  var sides = [side, atk].concat(hermit || []);
  if (look.hat && HATS[look.hat]) {
    var h = HATS[look.hat];
    [main, back, ko].forEach(function (g) { stampRows(g, h.front[0], h.front[1]); });
    sides.forEach(function (g) { stampRows(g, h.side[0], h.side[1]); });
  }
  var all = [main, back, ko].concat(sides);
  if (look.belt) {
    // breloque pendue sous la boucle (dent, perle, plume : couleur Y)
    if (look.charm) {
      [main, ko].forEach(function (g) { stampPixels(g, [[25, 15, 'Y'], [25, 16, 'Y'], [26, 15, 'Y'], [27, 15, 'k']]); });
      sides.forEach(function (g) { stampPixels(g, [[24, 25, 'Y'], [25, 25, 'Y']]); });
    }
  } else {
    // pas de ceinture : la peau (ou le ventre) reprend sa place
    all.forEach(function (g) {
      for (var y = 1; y < 32; y++) for (var x = 0; x < 32; x++) {
        if (g[y][x] !== 'b' && g[y][x] !== 'y') continue;
        var up = g[y - 1][x];
        g[y][x] = up === 'k' || up === '.' || up === 'b' || up === 'y' ? 'm' : up;
      }
    });
  }
  out.main = main; out.side = side; out.back = back; out.atk = atk; out.ko = ko;
  if (hermit) { out.hermitStance = hermit[0]; out.hermitAtk = hermit; }
  out.kick = kickPose(hermit ? hermit[0] : side);
  if (look.fx) out.fx = buildFx(look.fx);
  return out;
}

// ---------- Espèces de monstres ----------
// behavior : walker (marche et fonce), flyer (vole en zigzag, passe au-dessus de l'eau),
// dasher (s'approche, se prépare puis charge en ligne droite). size : 16, ou 32 pour le héron.
var SPECIES = {
  limon: {
    behavior: 'walker', xp: 4, hp: 10, speed: 18, chase: 34, size: 16,
    pal: { k: '#1a1c2c', 1: '#4a3a26', 2: '#6b5a3e', 3: '#8d7a58', w: '#f4f4e8', p: '#1a1c2c', g: '#4f8a3c' },
    frames: [
      ['................', '................', '................', '................',
       '......kkkk......', '....kk33g2kk....', '...k33222222k...', '..k3222222222k..',
       '..k22wwk2wwk2k..', '..k22wpk2wpk2k..', '.k222222222222k.', '.k222111111222k.',
       '.k211111111112k.', '.k111111111111k.', '..kkkkkkkkkkkk..', '................'],
      ['................', '................', '................', '................',
       '................', '......kkkk......', '....kk33g2kk....', '..kk3222222222k.',
       '.k322wwk2wwk22k.', '.k222wpk2wpk22k.', 'k22222222222222k', 'k22221111112222k',
       'k21111111111112k', '.k111111111111k.', '..kkkkkkkkkkkk..', '................']
    ]
  },
  moustique: {
    behavior: 'flyer', xp: 3, hp: 6, speed: 26, chase: 50, size: 16,
    pal: { k: '#1a1c2c', a: '#c9d6e3', 2: '#3b3f52', 3: '#5b6078', r: '#e05a4a' },
    frames: [
      ['................', '....aa...aa.....', '...aaaa.aaaa....', '...aaaaaaaaa....',
       '....aaakaaa.....', '......kkk.......', '.....k3r2k......', 'kkkkk22222kk....',
       '.....k2222k3k...', '......k22k222k..', '.....k.kk.k22k..', '....k..k...kk...',
       '...k...k........', '................', '................', '................'],
      ['................', '................', '................', '..aaaa...aaaa...',
       '.aaaaaakaaaaaa..', '......kkk.......', '.....k3r2k......', 'kkkkk22222kk....',
       '.....k2222k3k...', '......k22k222k..', '.....k.kk.k22k..', '....k..k...kk...',
       '...k...k........', '................', '................', '................']
    ]
  },
  champi: {
    behavior: 'dasher', xp: 6, hp: 12, speed: 16, chase: 26, dash: 165, size: 16,
    pal: { k: '#1a1c2c', 1: '#c9412f', w: '#f4f4e8', 2: '#efe6a8', p: '#1a1c2c' },
    frames: [
      ['................', '................', '.....kkkkkk.....', '...kk1111w1kk...',
       '..k11w1111111k..', '.k1111111w1111k.', '.k1w11111111w1k.', '.kkkkkkkkkkkkkk.',
       '....k222222k....', '...k2wk22wk2k...', '...k2kk22kk2k...', '...k22222222k...',
       '....k222222k....', '...kk2k..k2kk...', '...kkk....kkk...', '................'],
      ['................', '................', '................', '.....kkkkkk.....',
       '...kk1111w1kk...', '..k11w1111111k..', '.k1111111w1111k.', '.k1w11111111w1k.',
       '.kkkkkkkkkkkkkk.', '...k2wk22wk2k...', '...k2kk22kk2k...', '...k22222222k...',
       '....k222222k....', '...kk2k..k2kk...', '...kkk....kkk...', '................']
    ]
  },
  chauvesouris: {
    behavior: 'flyer', xp: 5, hp: 8, speed: 30, chase: 62, size: 16,
    pal: { k: '#1a1c2c', 1: '#4a3a5a', 2: '#6b5a7a', r: '#f3c27a', w: '#f4f4e8' },
    frames: [
      ['................', '................', 'k......kk......k', 'kk....k22k....kk',
       'k1k..k2222k..k1k', 'k11kk2r22r2kk11k', 'k111k222222k111k', '.k11k222222k11k.',
       '..k1kk2222kk1k..', '...k..k22k..k...', '......kwwk......', '.......kk.......',
       '................', '................', '................', '................'],
      ['................', '................', '................', '......kkkk......',
       '.....k2222k.....', '....k2r22r2k....', '...kk222222kk...', '..k1k222222k1k..',
       '.k11kk2222kk11k.', 'k111k.k22k.k111k', 'k11k..kwwk..k11k', 'k1k....kk....k1k',
       'kk............kk', '................', '................', '................']
    ]
  },
  heron: {
    behavior: 'dasher', xp: 0, hp: 30, speed: 22, chase: 40, dash: 230, size: 32,
    pal: { k: '#1a1c2c', w: '#e8ecf0', g: '#9aa8b8', G: '#6b7a8e', y: '#e0b43a' },
    frames: [
      ['................................', '...............kkkk.............', '..............kwwwwk............', '..............kwkwwwk...........',
       '..kkkkkkkkkkkkyywwwwk...........', '.kyyyyyyyyyyyyyywwwwkk..........', '..kkkkkkkkkkkkkkwwwwwk..........', '...............kwwwwk...........',
       '................kwwwk...........', '................kwwk............', '...............kwwk.............', '..............kwwk..............',
       '..............kwwwk.............', '..............kwwwwkkkk.........', '.............kwwgggggggkk.......', '............kwggggggggggggk.....',
       '............kgggggGGGGggggggk...', '............kggggGGGGGGGgggggk..', '............kgggGGGGGGGGGGgggk..', '.............kggGGGGGGGGGGGGgk..',
       '..............kggGGGGGGGGGGGGk..', '...............kkggGGGGGGGGGGGk.', '.................kkkggGGGGGkkkk.', '....................kykk........',
       '....................ky.k........', '....................ky..k.......', '....................ky..ky......', '....................ky...ky.....',
       '....................ky....ky....', '...................kyyk...kyk...', '..................kyyyyk.kyyyk..', '................................']
    ]
  }
};
// deuxième image du héron : il abaisse la tête
SPECIES.heron.frames.push(SPECIES.heron.frames[0].map(function (r, y) {
  if (y < 2) return '................................';
  return y < 14 ? SPECIES.heron.frames[0][y - 2] : r;
}));
// les grilles sont complétées avec des '.' à la bonne largeur
Object.keys(SPECIES).forEach(function (id) {
  var n = SPECIES[id].size;
  SPECIES[id].frames = SPECIES[id].frames.map(function (f) { return f.map(function (r) { return (r + '.'.repeat(n)).slice(0, n); }); });
});

// L'arbre d'entraînement du dojo (32×32) : un tronc cerclé de paille, une cible peinte, deux moignons de branches
// et une touffe de feuilles qui ondule d'une image à l'autre.
SPECIES.arbre = {
  behavior: 'arbre', xp: 0, hp: 1, speed: 0, chase: 0, size: 32,
  pal: { k: '#1a1c2c', 1: '#3e2a19', 2: '#6e4a2a', 3: '#8d6a45', s: '#d9c07a', S: '#a8904a', r: '#c9412f', w: '#f4f4e8', g: '#4e9a45', G: '#2e6b3d', l: '#8fce52' },
  frames: [0, 1].map(function (sway) {
    var rows = [];
    for (var y = 0; y < 32; y++) {
      var row = '';
      for (var x = 0; x < 32; x++) {
        var ch = '.';
        var left = y >= 27 ? 8 + (30 - y) : 10, right = y >= 27 ? 23 - (30 - y) : 21; // les racines s'évasent
        if (y >= 9 && y <= 30 && x >= left && x <= right) {
          if (x === left || x === right || y === 30) ch = 'k';
          else if ((y === 12 || y === 13 || y === 25 || y === 26)) ch = x % 2 ? 's' : 'S';       // cordes de paille
          else {
            var d = Math.hypot(x - 15.5, y - 19);
            if (d <= 1.3) ch = 'r'; else if (d <= 2.6) ch = 'w'; else if (d <= 3.9) ch = 'r'; else if (d <= 4.8) ch = 'w';
            else ch = x === left + 1 ? '3' : (x === right - 1 ? '1' : ((x + y * 3) % 7 === 0 ? '1' : '2'));
          }
        }
        // moignons de branches, avec une feuille au bout
        if (y >= 15 && y <= 17 && x >= 4 && x < 10) ch = y === 16 ? (x === 4 ? 'k' : '2') : 'k';
        if (y >= 21 && y <= 23 && x > 21 && x <= 27) ch = y === 22 ? (x === 27 ? 'k' : '2') : 'k';
        if (Math.hypot(x - 3 - sway, y - 13.5) < 2.2) ch = 'g';
        if (Math.hypot(x - 28 + sway, y - 19.5) < 2.2) ch = 'l';
        // la touffe de feuilles au sommet
        var e = Math.pow((x - 15.5 - sway) / 9.5, 2) + Math.pow((y - 5) / 4.6, 2);
        if (e <= 1) ch = e > 0.78 ? 'k' : ((x * 3 + y * 5 + sway) % 7 === 0 ? 'l' : (y > 6 ? 'G' : 'g'));
        row += ch;
      }
      rows.push(row);
    }
    return rows;
  })
};

// Grille de chaînes -> canvas (pour les monstres et les icônes)
function stringsToCanvas(rows, pal, flip, flash) {
  var h = rows.length, w = rows[0].length;
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  var ctx = c.getContext('2d');
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var ch = rows[y][x];
      if (!ch || ch === '.' || !pal[ch]) continue;
      ctx.fillStyle = flash && ch !== 'k' ? '#ffffff' : pal[ch];
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  }
  return c;
}

// Kunaï lancé (12×12, pointe vers la droite), puis tourné pour les 4 directions
var KUNAI_PROJECTILE = [
  '............',
  '............',
  '............',
  '.k....kkkk..',
  'k.kkkkktttk.',
  'k.oooookttSk',
  'k.kkkkktttk.',
  '.k....kkkk..',
  '............',
  '............',
  '............',
  '............'
];
function kunaiProjectileImgs(bladeCol) {
  var base = stringsToCanvas(KUNAI_PROJECTILE, { k: '#1a1c2c', o: '#4a3325', t: bladeCol, S: '#ffffff' });
  var rotated = function (quarter) {
    var c = document.createElement('canvas');
    c.width = 12; c.height = 12;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.translate(6, 6);
    ctx.rotate(quarter * Math.PI / 2);
    ctx.drawImage(base, -6, -6);
    return c;
  };
  return { right: base, down: rotated(1), left: rotated(2), up: rotated(3) };
}
