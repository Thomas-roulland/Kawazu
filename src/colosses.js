// L'Île des Colosses : trois terres où tout est gigantesque (la Forêt des Géants, la Forge des Titans, l'Abîme des
// Léviathans). Ses espèces font 32 × 32 et sont sculptées en code (sculpt) : des formes pleines (ellipses, traits
// épais, rectangles), puis un ombrage (bord éclairé en haut à gauche, ombre en bas à droite) et un contour sombre
// posés tout seuls. Elles regardent vers la gauche, comme les autres, les pattes sur la dernière ligne utile.

// ---------- L'outil de sculpture ----------
// draw(S) remplit une grille de size × size ; shades : { lettre: [clair, sombre] } ; renvoie les lignes de la grille
function sculpt(size, draw, shades) {
  var g = [], y, x;
  for (y = 0; y < size; y++) { g.push([]); for (x = 0; x < size; x++) g[y].push('.'); }
  var inside = function (xx, yy) { return xx >= 0 && yy >= 0 && xx < size && yy < size; };
  var S = {
    px: function (xx, yy, ch) { xx = Math.round(xx); yy = Math.round(yy); if (inside(xx, yy)) g[yy][xx] = ch; },
    ell: function (cx, cy, rx, ry, ch) {
      for (var yy = Math.floor(cy - ry); yy <= Math.ceil(cy + ry); yy++) for (var xx = Math.floor(cx - rx); xx <= Math.ceil(cx + rx); xx++) {
        var dx = (xx - cx) / (rx + 0.35), dy = (yy - cy) / (ry + 0.35);
        if (dx * dx + dy * dy <= 1) S.px(xx, yy, ch);
      }
    },
    rect: function (x0, y0, w, h, ch) { for (var yy = y0; yy < y0 + h; yy++) for (var xx = x0; xx < x0 + w; xx++) S.px(xx, yy, ch); },
    // un trait épais : des disques le long du segment (r0 au départ, r1 à l'arrivée)
    line: function (x0, y0, x1, y1, ch, r0, r1) {
      r0 = r0 == null ? 0.5 : r0; r1 = r1 == null ? r0 : r1;
      var n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
      for (var i = 0; i <= n; i++) { var t = i / n, r = r0 + (r1 - r0) * t; S.ell(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, ch); }
    },
    // une courbe (liste de points), d'épaisseur r0 → r1 (r0 tout du long si r1 manque : avant, la courbe disparaissait)
    path: function (pts, ch, r0, r1) {
      r1 = r1 == null ? r0 : r1;
      var total = 0, i, acc = 0;
      for (i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      for (i = 1; i < pts.length; i++) {
        var len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        S.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], ch, r0 + (r1 - r0) * acc / total, r0 + (r1 - r0) * (acc + len) / total);
        acc += len;
      }
    },
    erase: function (x0, y0, w, h) { S.rect(x0, y0, w, h, '.'); },
    at: function (xx, yy) { return inside(xx, yy) ? g[yy][xx] : '.'; }
  };
  draw(S);
  // l'ombrage : bord éclairé là où le vide est au-dessus ou à gauche, ombre là où il est en dessous ou à droite
  var out = g.map(function (r) { return r.slice(); });
  for (y = 0; y < size; y++) for (x = 0; x < size; x++) {
    var sh = shades && shades[g[y][x]];
    if (!sh) continue;
    var up = S.at(x, y - 1) === '.', left = S.at(x - 1, y) === '.', down = S.at(x, y + 1) === '.', right = S.at(x + 1, y) === '.';
    if ((up || left) && sh[0]) out[y][x] = sh[0];
    else if ((down || right) && sh[1]) out[y][x] = sh[1];
  }
  // le contour
  var res = out.map(function (r) { return r.slice(); });
  for (y = 0; y < size; y++) for (x = 0; x < size; x++) {
    if (out[y][x] !== '.') continue;
    var near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { var v = (out[y + d[1]] || [])[x + d[0]]; return v && v !== '.' && v !== 'k'; });
    if (near) res[y][x] = 'k';
  }
  return res.map(function (r) { return r.join(''); });
}

// ---------- Les espèces des Colosses ----------
var COLOSSUS_SPECIES = {
  // l'arbre-qui-marche : une couronne de feuilles, un tronc qui a un visage, des racines pour pieds
  sylvain: {
    behavior: 'walker', xp: 8, hp: 16, speed: 10, chase: 18, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', G: '#3a7a2a', L: '#7ac04a', g: '#22501a', 1: '#3a2414', 2: '#6a4a2a', 3: '#9a7444', y: '#f0e060', m: '#5a8a3a' },
    frames: [sculpt(32, function (S) {
      S.line(12, 26, 10, 30, '2', 1.5, 1.2); S.line(20, 26, 23, 30, '2', 1.5, 1.2); // les jambes-racines
      S.line(10, 30, 6, 30, '1', 0.6); S.line(23, 30, 27, 30, '1', 0.6); S.line(16, 28, 16, 30, '1', 0.6);
      S.rect(10, 12, 13, 16, '2'); // le tronc
      S.line(11, 18, 3, 23, '2', 1.6, 1); S.line(4, 22, 2, 19, '2', 0.6); S.line(4, 23, 1, 24, '2', 0.6); // un bras-branche
      S.line(22, 17, 28, 21, '2', 1.5, 0.9); S.line(27, 20, 29, 17, '2', 0.6);
      S.ell(16, 8, 13, 6, 'G'); S.ell(7, 10, 6, 4, 'G'); S.ell(25, 10, 6, 4, 'G'); S.ell(16, 3, 7, 3, 'G'); // la couronne
      [[9, 5], [12, 3], [15, 6], [20, 4], [6, 8], [23, 7], [18, 9], [11, 9]].forEach(function (p) { S.px(p[0], p[1], 'L'); });
      [[8, 12], [14, 12], [21, 12], [26, 12], [17, 11], [4, 11]].forEach(function (p) { S.px(p[0], p[1], 'g'); });
      for (var by = 14; by < 27; by += 1) { if (by % 3) S.px(12, by, '3'); if ((by + 1) % 4) S.px(19, by, '1'); }
      S.rect(12, 15, 3, 2, '1'); S.rect(17, 15, 3, 2, '1'); S.px(13, 16, 'y'); S.px(18, 16, 'y'); S.px(12, 16, 'y'); S.px(17, 16, 'y'); // les yeux
      S.rect(13, 20, 6, 2, '1'); S.px(14, 20, 'g'); // la bouche, moussue
      [[11, 24], [20, 22], [22, 25], [10, 14]].forEach(function (p) { S.px(p[0], p[1], 'm'); });
    }, { 2: ['3', '1'], G: ['L', 'g'] })]
  },
  // le cerf-titan : des bois immenses, une encolure puissante
  cerf: {
    behavior: 'dasher', xp: 8, hp: 15, speed: 26, chase: 44, dash: 220, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#3a2010', 2: '#8a5a2a', 3: '#c8a070', y: '#ece2c8', Y: '#b8a888', w: '#f4f4e8', b: '#2a1a0a' },
    frames: [sculpt(32, function (S) {
      [12, 15, 23, 26].forEach(function (lx, i) { S.line(lx, 21, lx + (i % 2 ? 0 : -1), 29, '2', 1.1, 0.8); S.px(lx + (i % 2 ? 0 : -1), 30, 'b'); S.px(lx + (i % 2 ? 0 : -1) + 1, 30, 'b'); });
      S.ell(19, 17, 10, 5, '2'); S.ell(18, 20, 7, 2, '3'); // le corps et le ventre
      S.line(10, 16, 9, 10, '2', 2.6, 1.8); // l'encolure
      S.ell(7, 9, 4, 3, '2'); S.rect(2, 9, 5, 3, '2'); S.px(2, 9, '1'); S.px(2, 10, 'b'); // la tête et le museau
      S.px(7, 8, 'w'); S.px(8, 8, 'b');
      S.line(6, 6, 3, 1, 'y', 0.6); S.line(5, 4, 1, 3, 'y', 0.5); S.line(4, 2, 4, 0, 'y', 0.5); // les bois
      S.line(9, 6, 13, 0, 'y', 0.6); S.line(11, 3, 15, 3, 'y', 0.5); S.line(12, 1, 15, 0, 'y', 0.5); S.line(10, 5, 8, 2, 'Y', 0.5);
      S.px(29, 14, '3'); S.px(30, 13, '3'); // la queue
    }, { 2: ['3', '1'], y: [null, 'Y'] })]
  },
  // l'ours des cimes : une montagne de fourrure
  ours: {
    behavior: 'walker', xp: 8, hp: 18, speed: 14, chase: 24, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#2a1a12', 2: '#5a3e2a', 3: '#8a6448', 4: '#c8a070', w: '#f4f4e8', b: '#140c08' },
    frames: [sculpt(32, function (S) {
      S.rect(8, 24, 5, 6, '2'); S.rect(15, 25, 4, 5, '2'); S.rect(22, 24, 5, 6, '2'); S.rect(26, 25, 3, 5, '2'); // les pattes
      S.ell(19, 18, 11, 7, '2'); S.ell(18, 12, 7, 4, '2'); // le corps et la bosse
      S.ell(8, 15, 6, 5, '2'); S.ell(3, 17, 3, 2, '4'); S.px(1, 16, 'b'); S.px(1, 17, 'b'); // la tête, le museau
      S.ell(6, 10, 2, 2, '2'); S.ell(11, 10, 2, 2, '2'); S.px(6, 10, '1'); S.px(11, 10, '1'); // les oreilles
      S.px(7, 14, 'w'); S.px(8, 14, 'b'); S.rect(3, 19, 4, 1, '1'); // l'œil, la gueule
      [8, 10, 12, 15, 17, 22, 24, 26, 28].forEach(function (cx) { S.px(cx, 30, 'w'); }); // les griffes
      [[14, 16], [20, 14], [25, 17], [16, 21], [22, 20]].forEach(function (p) { S.px(p[0], p[1], '3'); });
    }, { 2: ['3', '1'] })]
  },
  // le cyclope forgeron : un œil, une corne, un tablier de cuir et un marteau de forge
  cyclope: {
    behavior: 'walker', xp: 9, hp: 18, speed: 12, chase: 20, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#3a3a4a', 2: '#7a7a9a', 3: '#a8a8c8', a: '#6a3a1a', A: '#4a2410', m: '#9aa0b0', M: '#5a6070', o: '#8a5a2a', y: '#ece2c8', w: '#f4f4e8', r: '#c9412f', e: '#ff8a2a' },
    frames: [sculpt(32, function (S) {
      S.rect(11, 23, 4, 7, '2'); S.rect(18, 23, 4, 7, '2'); S.rect(10, 29, 6, 1, '1'); S.rect(17, 29, 6, 1, '1'); // les jambes
      S.ell(16, 17, 8, 7, '2'); // le torse
      S.rect(12, 17, 9, 8, 'a'); S.rect(10, 16, 13, 1, 'A'); S.px(16, 16, 'm'); // le tablier, la ceinture
      S.line(23, 13, 27, 20, '2', 1.8, 1.4); S.ell(27, 21, 2, 2, '2'); // le bras droit
      S.ell(15, 7, 5, 5, '2'); S.line(15, 2, 15, 0, 'y', 0.6); // la tête, la corne
      S.ell(14, 7, 2, 2, 'w'); S.px(13, 7, 'r'); S.px(13, 6, 'k'); S.rect(12, 4, 5, 1, '1'); // l'œil unique, le sourcil
      S.rect(12, 10, 5, 1, '1'); S.px(13, 11, 'w'); S.px(15, 11, 'w'); // la bouche, les crocs
      S.line(9, 13, 5, 19, '2', 1.8, 1.4); // le bras gauche, qui tient le marteau
      S.line(4, 17, 4, 27, 'o', 0.6); S.rect(0, 25, 9, 5, 'm'); S.rect(0, 25, 9, 1, '3'); S.px(8, 27, 'e'); S.px(0, 27, 'e'); // le marteau, rougi
    }, { 2: ['3', '1'], m: ['3', 'M'], a: [null, 'A'] })]
  },
  // le kraken : un manteau énorme, deux yeux d'or, des tentacules partout
  kraken: {
    behavior: 'flyer', xp: 9, hp: 16, speed: 20, chase: 40, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#3a1030', 2: '#8a2a5a', 3: '#c8608a', 4: '#f0a0c0', y: '#f0d040', b: '#140814' },
    frames: [sculpt(32, function (S) {
      var tent = [[[11, 18], [8, 22], [9, 26], [6, 29], [3, 28]], [[14, 19], [13, 24], [14, 28], [12, 30]], [[18, 20], [18, 25], [20, 29], [22, 30]],
        [[22, 19], [24, 23], [24, 27], [27, 29]], [[25, 17], [28, 20], [30, 24], [30, 28]], [[10, 16], [6, 15], [3, 11], [4, 8], [6, 8]]];
      tent.forEach(function (p) { S.path(p, '2', 1.6, 0.6); });
      S.ell(18, 9, 10, 8, '2'); S.ell(18, 15, 8, 4, '2'); // le manteau
      [[14, 5], [20, 4], [23, 9], [16, 9], [25, 6]].forEach(function (p) { S.px(p[0], p[1], '4'); });
      S.ell(13, 13, 2, 2, 'y'); S.ell(21, 13, 2, 2, 'y'); S.px(13, 13, 'b'); S.px(21, 13, 'b'); S.px(13, 12, 'b'); S.px(21, 12, 'b'); // les yeux
      [[8, 22], [9, 26], [13, 24], [18, 25], [24, 23], [28, 20], [5, 13]].forEach(function (p) { S.px(p[0], p[1], '4'); }); // les ventouses
    }, { 2: ['3', '1'] })]
  },
  // le crabe-titan : une carapace hérissée et une pince plus grosse qu'une maison
  crabe: {
    behavior: 'dasher', xp: 8, hp: 17, speed: 18, chase: 32, dash: 190, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#5a1a0a', 2: '#c04a2a', 3: '#f08a5a', 4: '#ffd0a0', w: '#f4f4e8', b: '#140808' },
    frames: [sculpt(32, function (S) {
      [[10, 22, 6, 29], [13, 23, 11, 30], [23, 23, 26, 30], [26, 22, 30, 28]].forEach(function (l) { S.line(l[0], l[1], l[2], l[3], '2', 0.9, 0.6); }); // les pattes
      S.ell(18, 18, 11, 6, '2'); // la carapace
      [[11, 12], [15, 11], [20, 11], [25, 12]].forEach(function (p) { S.line(p[0], p[1] + 2, p[0], p[1], '2', 0.6); }); // les piquants
      S.line(14, 13, 14, 8, '1', 0.5); S.line(19, 13, 19, 8, '1', 0.5); S.ell(14, 7, 1, 1, 'w'); S.ell(19, 7, 1, 1, 'w'); S.px(14, 7, 'b'); S.px(19, 7, 'b'); // les yeux
      S.line(9, 19, 5, 14, '2', 1.4, 1.2); S.ell(4, 10, 4, 4, '2'); S.erase(0, 9, 4, 2); S.px(4, 9, '.'); // la grande pince, ouverte
      S.line(27, 18, 30, 15, '2', 1, 0.8); S.ell(30, 13, 1, 2, '2'); // la petite
      [[14, 16], [19, 15], [23, 17], [17, 19]].forEach(function (p) { S.px(p[0], p[1], '4'); });
    }, { 2: ['3', '1'] })]
  },
  // le léviathan : un serpent de mer qui sort de l'eau, la gueule ouverte, des nageoires le long du cou
  leviathan: {
    behavior: 'dasher', xp: 9, hp: 18, speed: 22, chase: 40, dash: 230, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#0a2a3a', 2: '#1a6a7a', 3: '#4ab0b0', 4: '#a0f0e0', r: '#e0402a', w: '#f4f4e8', y: '#f0d040', b: '#081418' },
    frames: [sculpt(32, function (S) {
      S.ell(24, 27, 5, 3, '2'); S.ell(30, 25, 2, 3, '2'); // les anneaux qui sortent de l'eau
      S.path([[19, 30], [17, 24], [15, 17], [12, 12], [9, 9]], '2', 3.2, 2.2); // le cou
      [[16, 22], [14, 16], [11, 11]].forEach(function (p, i) { S.line(p[0] + 2, p[1], p[0] + 5, p[1] - 3 + i, 'r', 0.6, 0.3); }); // les nageoires
      S.ell(6, 8, 5, 3, '2'); S.rect(0, 9, 6, 2, '2'); S.rect(0, 12, 6, 1, '2'); S.erase(0, 11, 5, 1); // la tête, la gueule ouverte
      S.px(1, 10, 'w'); S.px(3, 10, 'w'); S.px(2, 12, 'w'); S.px(4, 12, 'w'); // les crocs
      S.px(6, 6, 'y'); S.px(7, 6, 'b'); S.line(8, 5, 11, 3, 'r', 0.5); // l'œil, la crête
      [[15, 20], [13, 15], [17, 26], [22, 28]].forEach(function (p) { S.px(p[0], p[1], '4'); });
    }, { 2: ['3', '1'] })]
  }
};
Object.keys(COLOSSUS_SPECIES).forEach(function (id) { SPECIES[id] = COLOSSUS_SPECIES[id]; });
// la seconde image (le corps s'affaisse d'un pixel, les pattes restent), comme pour les espèces de looks.js
Object.keys(COLOSSUS_SPECIES).forEach(function (id) {
  var s = SPECIES[id], f = s.frames[0], n = f.length;
  if (s.frames.length < 2) s.frames.push(f.map(function (r, y) { return y === 0 ? '.'.repeat(r.length) : (y < n - 3 ? f[y - 1] : r); }));
});


// ---------- Les trois terres des Colosses ----------
// giant : tout y est géant (voir makeEnemy : les monstres y font ~110 px, les gardiens ~126, les boss ~140, et ils
// frappent plus fort, voir COLOSSUS_POWER dans worlds.js)
var COLOSSES_FROM = BIOMES.length;
BIOMES.push(
  {
    id: 'geants', name: 'Forêt des Géants', giant: true, tagline: 'Des arbres plus hauts que des montagnes, et des bêtes à leur taille. Ici, une grenouille n’est qu’un caillou qui marche.',
    wall: 'trunks', block: 'stump', bush: 'ferns', alt: 'leaves', water: true,
    pal: {
      ground: '#2e4a22', groundLight: '#456a30', groundDark: '#1e3216', alt: '#8ab040',
      wall: '#3a2414', wallLight: '#5a3a20', wallDark: '#1e120a', accent: '#c8f070',
      water: '#1e4a3a', waterLight: '#3a6a54', waterEdge: '#7aa86a',
      block: '#5a3a20', blockLight: '#8a6a3a', blockDark: '#2e1c0e',
      bush: '#2a6a2a', bushLight: '#5ab04a', bushDark: '#16401a', door: '#3a2414'
    },
    monsters: [
      { species: 'sylvain', name: 'Sylvain des cimes' },
      { species: 'cerf', name: 'Cerf-Titan' },
      { species: 'ours', name: 'Ours des cimes' }
    ],
    boss: { species: 'sylvain', name: 'Le Roi-Chêne', pal: { G: '#a8541a', L: '#f0a040', g: '#6a2a0a', 2: '#4a3020', 3: '#7a5434', 1: '#24140a', y: '#ff5a1a', m: '#c8a030' } }
  },
  {
    id: 'forge', name: 'Forge des Titans', giant: true, tagline: 'Un volcan creusé en forge. Les cyclopes y martèlent des armes pour des dieux qui ne viennent plus.',
    wall: 'rock', block: 'pillar', bush: 'flames', alt: 'embers', ground: 'ash', water: true,
    pal: {
      ground: '#3a2622', groundLight: '#56362c', groundDark: '#24160f', alt: '#ff7a1a',
      wall: '#2a1610', wallLight: '#46281c', wallDark: '#120806', accent: '#ffb040',
      water: '#ff5a10', waterLight: '#ffb040', waterEdge: '#ffe08a',
      block: '#5a4a44', blockLight: '#8a7a70', blockDark: '#2e2420',
      bush: '#ff6a1a', bushLight: '#ffd040', bushDark: '#a02a0a', door: '#2a1610'
    },
    monsters: [
      { species: 'cyclope', name: 'Cyclope forgeron' },
      { species: 'golem', name: 'Colosse de magma', pal: { 1: '#2a1410', 2: '#5a2a1a', 3: '#a84a1a', y: '#ffd040', o: '#ff6a1a' } },
      { species: 'salamandre', name: 'Salamandre-titan', pal: { 1: '#5a1a0a', 2: '#c84a1a', 3: '#ff9a3a', y: '#ffe060', o: '#ffd040' } }
    ],
    boss: { species: 'cyclope', name: 'Le Titan de Braise', pal: { 2: '#a8402a', 3: '#e07a4a', 1: '#4a1a10', a: '#2a2a34', A: '#14141c', m: '#ffb040', M: '#c0501a', e: '#ffe060', r: '#ffe060', y: '#ffd040' } }
  },
  {
    id: 'leviathans', name: 'Abîme des Léviathans', giant: true, tagline: 'La mer s’ouvre sur un gouffre sans fond. Dans le noir, des yeux grands comme des lunes s’allument un à un.',
    wall: 'ruins', block: 'crystal', bush: 'glowmoss', alt: 'mosaic', ground: 'slabs', water: true,
    pal: {
      ground: '#16303a', groundLight: '#244a54', groundDark: '#0c1e26', alt: '#4ab0b0',
      wall: '#0a1a22', wallLight: '#1a3440', wallDark: '#040c10', accent: '#6af0e0',
      water: '#06141c', waterLight: '#123040', waterEdge: '#4ab0b0',
      block: '#2a7a8a', blockLight: '#8af0f0', blockDark: '#0e3a44',
      bush: '#1a5a5a', bushLight: '#6af0e0', bushDark: '#0a2a2a', door: '#0a1a22'
    },
    monsters: [
      { species: 'kraken', name: 'Kraken des profondeurs' },
      { species: 'crabe', name: 'Crabe-Titan', pal: { 1: '#2a1a4a', 2: '#5a3a9a', 3: '#9a7ad0', 4: '#e0c8ff' } },
      { species: 'leviathan', name: 'Serpent des abysses' }
    ],
    boss: { species: 'leviathan', name: 'Le Léviathan Ancestral', pal: { 1: '#140a2a', 2: '#3a2a7a', 3: '#7a6ad0', 4: '#e0d8ff', r: '#f0d040', y: '#ff4a4a' } }
  }
);
ISLES.push({ id: 'colosses', name: 'l’Île des Colosses', short: 'Les Colosses', from: COLOSSES_FROM, to: BIOMES.length });

// ---------- Leur butin : les armes des Titans (voir le générateur du Continent, items.js) ----------
// set 't' : leurs propres formes (les icônes *_t ci-dessous) ; names : leurs propres noms d'armes
var COLOSSUS_NAMES = { baton: 'Bourdon', harpon: 'Trident', katana: 'Ōdachi', masse: 'Marteau', kunai: 'Coutelas', shuriken: 'Étoile', echarpe: 'Mante', ceinture: 'Baudrier', anneau: 'Chevalière', tete: 'Heaume' };
var COLOSSUS_GEAR = {
  geants: { de: 'des géants', c: ['#8ac04a', '#4a7a2a', '#d0f080', '#6a4a2a', '#3a2414'], wave: ['#d0f080', '#4a7a2a'], focus: 'vitalite', hat: 'ecorce', set: 't', names: COLOSSUS_NAMES },
  forge: { de: 'de titan', c: ['#ff8a3a', '#a8401a', '#ffe08a', '#3a3440', '#1e1a24'], wave: ['#ffe08a', '#ff5a1a'], focus: 'force', hat: 'ecorce', set: 't', names: COLOSSUS_NAMES },
  leviathans: { de: 'des abysses', c: ['#6af0e0', '#2a8a9a', '#e0fff8', '#3a2a7a', '#1a1044'], wave: ['#e0fff8', '#2a8a9a'], focus: 'agilite', hat: 'ecorce', set: 't', names: COLOSSUS_NAMES }
};
// les icônes, sculptées comme les colosses (1 couleur, 2 ombre, 3 reflet, 4 manche ou métal, b son ombre)
var ICON_SHADES = { 1: ['3', '2'], 4: [null, 'b'] };
var COLOSSUS_ICONS = {
  // un bourdon : une pierre ronde, cornue, au bout d'un manche cerclé
  baton_t: sculpt(16, function (S) { S.line(8, 6, 8, 15, '4', 0.6); S.ell(8, 4, 3, 3, '1'); S.px(8, 4, 'k'); S.line(5, 2, 4, 0, '1', 0.4); S.line(11, 2, 12, 0, '1', 0.4); S.rect(6, 8, 5, 1, '4'); }, ICON_SHADES),
  // un trident aux dents larges
  harpon_t: sculpt(16, function (S) { S.line(8, 6, 8, 15, '4', 0.6); S.rect(3, 5, 11, 2, '1'); S.line(3, 5, 2, 0, '1', 0.6); S.line(8, 5, 8, 0, '1', 0.6); S.line(13, 5, 14, 0, '1', 0.6); }, ICON_SHADES),
  // un ōdachi : une lame immense, à peine courbe
  katana_t: sculpt(16, function (S) { S.path([[4, 12], [8, 7], [12, 3], [15, 0]], '1', 1, 0.5); S.line(1, 11, 5, 15, '4', 0.9); S.line(0, 15, 2, 13, '4', 0.6); }, ICON_SHADES),
  // un marteau de forge, la tête carrée
  masse_t: sculpt(16, function (S) { S.line(9, 7, 4, 15, '4', 0.7); S.rect(6, 1, 9, 6, '1'); S.rect(5, 2, 1, 4, '1'); S.rect(15, 2, 1, 4, '1'); S.px(10, 3, '4'); S.px(11, 4, '4'); }, ICON_SHADES),
  // un coutelas à lame large et à anneau
  kunai_t: sculpt(16, function (S) { S.path([[8, 0], [6, 4], [6, 8], [8, 10], [10, 8], [10, 4], [8, 0]], '1', 1.2, 1.2); S.line(8, 10, 8, 13, '4', 0.6); S.ell(8, 14, 1.5, 1.5, '4'); S.px(8, 14, '.'); }, ICON_SHADES),
  // une étoile à huit branches
  shuriken_t: sculpt(16, function (S) { S.line(1, 1, 14, 14, '1', 1); S.line(14, 1, 1, 14, '1', 1); S.line(7.5, 0, 7.5, 15, '1', 0.7); S.line(0, 7.5, 15, 7.5, '1', 0.7); S.ell(7.5, 7.5, 2.5, 2.5, '4'); S.ell(7.5, 7.5, 0.6, 0.6, '.'); }, ICON_SHADES),
  // une mante : un col épais et deux pans
  echarpe_t: sculpt(16, function (S) { S.rect(1, 2, 13, 4, '1'); S.path([[4, 6], [5, 10], [4, 14]], '1', 1.4, 1); S.path([[8, 6], [9, 11], [10, 15]], '1', 1.2, 0.8); S.rect(1, 3, 13, 1, '4'); }, ICON_SHADES),
  // un baudrier à boucle de tête de titan
  ceinture_t: sculpt(16, function (S) { S.rect(0, 6, 16, 4, '1'); S.ell(8, 8, 3.5, 3.5, '4'); S.px(7, 7, 'k'); S.px(9, 7, 'k'); S.rect(7, 9, 3, 1, 'k'); }, ICON_SHADES),
  // une chevalière, la pierre énorme
  anneau_t: sculpt(16, function (S) { S.ell(8, 10, 5, 4, '4'); S.ell(8, 10, 2.6, 1.8, '.'); S.ell(8, 4, 3, 3, '1'); S.px(7, 3, '3'); }, ICON_SHADES),
  // un heaume de titan, fermé, à cornes
  casque_t: sculpt(16, function (S) { S.ell(8, 8, 6, 6, '1'); S.rect(2, 9, 13, 5, '1'); S.rect(4, 9, 9, 1, 'k'); S.rect(7, 9, 3, 4, 'k'); S.line(2, 6, 0, 1, '4', 0.7); S.line(14, 6, 16, 1, '4', 0.7); }, ICON_SHADES)
};
