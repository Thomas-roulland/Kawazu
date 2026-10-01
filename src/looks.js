// Équipement visible sur Kawazu, ondes de choc par arme, et sprites des monstres.

// Les calques utilisent des caractères propres : H/I/J = chapeau (principal, ombre, reflet),
// b/y/Y = ceinture, boucle et breloque, N = anneau ; E/Z = yeux et marques du mode Ermite. Leurs couleurs viennent de l'objet équipé.
// Les skins ont les leurs : e, U, O, D, V, W, T, G, K (voir paintSkin).
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
  // le bandeau des Légendaires : noué sous les yeux, une plaque au milieu, les pans qui flottent
  bandeau: {
    front: [9, [
      '..kHHHHHHHHHHkJJJJkHHHHHHHHHHk..',
      '..kIIIIIIIIIIkJPPJkIIIIIIIIIIk.H',
      '...............................H',
      '...............................I'
    ]],
    side: [9, [
      '.....HH..kHHHHHHHHHHJJJJk.......',
      '.......HIkIIIIIIIIIIJPPJk.......',
      '....HHI.........................',
      '...HI...........................'
    ]],
    // l'autre image : les pans soulevés par le vent
    wind: {
      front: [9, [
        '..kHHHHHHHHHHkJJJJkHHHHHHHHHHk..',
        '..kIIIIIIIIIIkJPPJkIIIIIIIIIIkHH',
        '...............................I'
      ]],
      side: [9, [
        '..HHH....kHHHHHHHHHHJJJJk.......',
        '.....HHHIkIIIIIIIIIIJPPJk.......',
        '.HHI............................'
      ]]
    }
  },
  // le heaume à cornes des casques du Continent
  cornes: {
    front: [1, [
      '.........kk..........kk.........',
      '.........kJk........kJk.........',
      '..........kJk......kJk..........',
      '............kkkkkkkk............',
      '...........kHHJJHHHHk...........',
      '..........kHJJHHHHHHIk..........',
      '..........kHHHHHHHHHIk..........',
      '..........kIIIIIIIIIIk..........',
      '..........kkkkkkkkkkkk..........'
    ]],
    side: [2, [
      '..........kk....................',
      '.........kJk....................',
      '.........kJk....................',
      '.........kkkkk..................',
      '........kHJJHHk.................',
      '........kHHHHIk.................',
      '........kIIIIIk.................',
      '........kkkkkkk.................'
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

// Les marques lumineuses de la mutation (M) : des taches sur la peau, plus nombreuses à chaque mutation
function paintMutation(g, n) {
  var spots = [];
  for (var y = 9; y < g.length - 3; y++) for (var x = 0; x < g[y].length; x++) if (g[y][x] === 'm' || g[y][x] === 'g') spots.push([y, x]);
  var count = Math.min(spots.length, 2 + 3 * n);
  spots.sort(function (a, b) { return hash(a[0], a[1], 91) - hash(b[0], b[1], 91); });
  for (var i = 0; i < count; i++) { // des taches de deux pixels, pour qu'elles se voient sur toutes les peaux
    var y2 = spots[i][0], x2 = spots[i][1];
    g[y2][x2] = 'M';
    if (g[y2][x2 + 1] === 'm' || g[y2][x2 + 1] === 'g' || g[y2][x2 + 1] === 'l') g[y2][x2 + 1] = 'M';
  }
}
// La cape des Légendaires (couleurs de l'écharpe, r et R) : dans le dos, elle couvre tout ; de profil, elle flotte
// derrière la grenouille ; de face, on n'en voit que les bords. phase 1 : l'autre image, quand le vent la soulève
// (le bas s'évase et ondule, les plis glissent, de profil elle file plus loin et remonte)
function paintCape(g, view, phase) {
  var W = g[0].length, at = function (y, x) { return g[y] && x >= 0 && x < W ? g[y][x] : ''; };
  var put = function (y, x, ch) { if (g[y] && x >= 0 && x < W) g[y][x] = ch; };
  var p = phase ? 1 : 0;
  if (view === 'back') {
    for (var y = 19; y <= 28; y++) {
      var x1 = 2 - (p && y >= 25 ? 1 : 0), x2 = 29 + (p && y >= 25 ? 1 : 0);
      for (var x = x1; x <= x2; x++) put(y, x, x === x1 || x === x2 ? 'k' : ((x + (y > 24 ? 1 : 0) + 2 * p) % 5 === 0 ? 'R' : 'r'));
    }
    for (var hx = 2 - p; hx <= 29 + p; hx++) put(29, hx, (hx + p) % 3 ? 'k' : at(29, hx));
  } else if (view === 'front') {
    for (var fy = 18 + p; fy <= 28 + p; fy++) [[0, 1], [31, 30]].forEach(function (q) { if (at(fy, q[1]) === '.') put(fy, q[1], 'R'); if (at(fy, q[0]) === '.') put(fy, q[0], 'k'); });
  } else {
    for (var sy = 16; sy <= 28 - p; sy++) {
      var x0 = 0; while (x0 < W && at(sy, x0) === '.') x0++;
      if (x0 >= W) continue;
      var from = Math.max(0, x0 - 2 - Math.floor((sy - 16) / 2) - p * (1 + Math.floor((sy - 16) / 3)) + (p && sy >= 26 ? 3 : 0));
      for (var sx = from; sx < x0; sx++) put(sy, sx, sx === from ? 'k' : ((sx + sy + p) % 4 === 0 ? 'R' : 'r'));
    }
  }
}
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

// Les signes d'un skin, peints sur la grenouille avant son équipement. fx : la liste de ses signes (voir PREMIUM_SKINS) ;
// view : 'front' (face), 'ko' (à terre), 'back' (dos), 'side' (profil) ou 'atk' (attaque, de profil).
// Les couleurs sont des lettres de la palette que le skin définit : e (blanc des yeux), U (marques), O (joues, doigt),
// D (sombre), V et W (vêtement et liseré), T (accessoire), G (fumée, reflet), K (cicatrice) ; S reste le blanc pur.
// De face, tout est symétrique (colonnes x et 31 - x), sauf ce qui ne l'est pas (la pipe, la cicatrice).
function paintSkin(g, fx, view) {
  var W = g[0].length, front = view === 'front' || view === 'ko' || view === 'back', face = view === 'front' || view === 'ko';
  var at = function (y, x) { return g[y] && x >= 0 && x < W ? g[y][x] : ''; };
  var put = function (y, x, ch) { if (g[y] && x >= 0 && x < W) g[y][x] = ch; };
  var isSkin = function (ch) { return ch === 'm' || ch === 'l' || ch === 'g'; };
  var onSkin = function (y, x, ch) { if (isSkin(at(y, x))) put(y, x, ch); };
  var onBody = function (y, x, ch) { var c = at(y, x); if (c && c !== '.' && c !== 'k') put(y, x, ch); };
  var onAir = function (y, x, ch) { if (at(y, x) === '.') put(y, x, ch); };
  var sym = function (fn) { return function (y, x, ch) { fn(y, x, ch); if (front) fn(y, W - 1 - x, ch); }; };
  var P = sym(put), S = sym(onSkin), B = sym(onBody), A = sym(onAir);
  var has = function (f) { return fx.indexOf(f) >= 0; };
  var each = function (list, fn) { list.forEach(function (p) { fn(p[0], p[1], p[2]); }); };
  var range = function (a, b) { var r = []; for (var i = a; i <= b; i++) r.push(i); return r; };

  // les yeux : le blanc prend la couleur « e » ; la pupille peut être blanche, ou avoir un reflet
  if (has('yeux')) for (var ey = 0; ey <= 9; ey++) for (var ex = 0; ex < W; ex++) if (at(ey, ex) === 'w') put(ey, ex, 'e');
  var pupil = view === 'front' ? [[6, 6], [6, 7], [7, 6], [7, 7]] : (view === 'side' || view === 'atk' ? [[5, 19], [5, 20], [6, 19], [6, 20]] : []);
  if (has('pupille-blanche')) pupil.slice(0, 2).forEach(function (p) { P(p[0], p[1], 'S'); });
  if (has('reflet') && pupil.length) P(pupil[0][0], pupil[0][1], 'S');
  if (has('colere') && view === 'front') each([[4, 6, 'k'], [4, 7, 'k'], [5, 8, 'k'], [5, 9, 'k']], P); // les sourcils froncés

  // les marques autour des yeux (U) : la peau qui touche le contour de l'œil
  if (has('cernes')) {
    var eye = function (ch) { return ch === 'w' || ch === 'e' || ch === 'E'; }, ring = [];
    for (var ry = 1; ry <= 10; ry++) for (var rx = 0; rx < W; rx++) {
      if (at(ry, rx) !== 'k') continue;
      if (eye(at(ry - 1, rx)) || eye(at(ry + 1, rx)) || eye(at(ry, rx - 1)) || eye(at(ry, rx + 1))) ring.push([ry, rx]);
    }
    var reach = has('masque') ? 2 : 1; // le masque : un large tour sombre
    ring.forEach(function (p) { for (var dy = -reach; dy <= reach; dy++) for (var dx = -reach; dx <= reach; dx++) if (p[0] + dy <= 11) onSkin(p[0] + dy, p[1] + dx, 'U'); });
    if (has('masque') && view !== 'back') { // et une tache sombre sous les yeux, jusqu'aux joues
      if (front) range(9, 11).forEach(function (y) { range(2, 10 - (y - 9)).forEach(function (x) { S(y, x, 'U'); }); });
      else range(8, 11).forEach(function (y) { range(14 + (y - 8), 23 - (y - 8)).forEach(function (x) { onSkin(y, x, 'U'); }); });
    }
  }
  // les lèvres (U), de part et d'autre du trait de la bouche
  if (has('levres')) {
    if (face) range(6, 25).forEach(function (x) { onSkin(16, x, 'U'); onSkin(18, x, 'U'); });
    else if (!front) range(21, 29).forEach(function (x) { onSkin(14, x, 'U'); onSkin(16, x, 'U'); });
  }
  // de grosses poches aux joues (O)
  if (has('poches')) {
    var cheek = function (y, x) { var c = at(y, x); if (isSkin(c) || c === 'h') put(y, x, 'O'); };
    if (face) [14, 15, 16].forEach(function (y) { [3, 4, 5].forEach(function (x) { cheek(y, x); cheek(y, W - 1 - x); }); });
    else if (!front) [13, 14, 15].forEach(function (y) { [26, 27, 28].forEach(function (x) { cheek(y, x); }); });
  }
  // le bas du visage clair (c)
  if (has('menton')) {
    var chin = function (y, x) { var c = at(y, x); if (isSkin(c) || c === 'h') put(y, x, 'c'); };
    if (face) range(14, 18).forEach(function (y) { range(2, 29).forEach(function (x) { chin(y, x); }); });
    else if (!front) range(13, 16).forEach(function (y) { range(19, 30).forEach(function (x) { chin(y, x); }); });
  }
  // une bande noire (D) puis une blanche (W) autour du torse
  if (has('bandes')) {
    if (front) range(2, 29).forEach(function (x) { onBody(22, x, 'D'); onBody(23, x, 'W'); });
    else range(10, 26).forEach(function (x) { onBody(20, x, 'D'); onBody(21, x, 'W'); });
  }
  // les mains et les pieds : sombres avec le doigt du milieu clair (doigts), couleur du ventre (mains-claires), gants (G)
  var hands = has('doigts') ? 'D' : (has('mains-claires') ? 'c' : (has('gants') ? 'G' : ''));
  if (hands) {
    if (front) { each([[24, 3], [24, 4]], function (y, x) { P(y, x, hands); }); if (has('gants')) each([[23, 3], [23, 4]], function (y, x) { P(y, x, 'G'); }); if (has('doigts')) P(24, 4, 'O'); }
    else if (view === 'side') { range(17, 21).forEach(function (x) { if (at(24, x) === 'l') put(24, x, hands); }); if (has('gants')) range(17, 20).forEach(function (x) { put(23, x, 'G'); }); if (has('doigts')) put(24, 19, 'O'); }
    else { [25, 26, 27].forEach(function (x) { if (isSkin(at(20, x))) put(20, x, hands); }); if (has('doigts')) put(20, 27, 'O'); }
    if (has('doigts')) for (var fx0 = 0; fx0 < W; fx0++) if (at(30, fx0) === 'l') put(30, fx0, 'D'); // et les orteils
  }
  // la spirale du ventre (U)
  if (has('spirale')) {
    if (face) { // sur tout le ventre, par-dessus la ceinture
      ['.UUUUUU.', 'U......U', 'U.UUUU.U', 'U.U.UU.U', 'U.U....U', '..UUUUUU'].forEach(function (row, i) {
        row.split('').forEach(function (ch, j) { onBody(22 + i, 12 + j, ch === 'U' ? 'U' : 'c'); });
      });
    } else if (!front) each([[21, 23], [21, 24], [22, 25], [23, 25], [24, 24], [23, 23], [25, 23], [26, 24]], function (y, x) { onBody(y, x, 'U'); });
  }
  // les taches du ventre (U) : deux petites, ou deux courbes tournées vers le milieu
  if (has('taches-ventre') && face) each([[25, 12], [26, 12], [26, 13], [27, 11]], function (y, x) { B(y, x, 'U'); });
  if (has('courbes-ventre') && face) each([[25, 11], [26, 12], [27, 12], [28, 11]], function (y, x) { B(y, x, 'U'); });

  // la pousse en vrille sur la tête (D)
  if (has('boucle')) {
    if (front) each([[7, 16], [6, 16], [5, 16], [4, 16], [3, 16], [2, 16], [1, 17], [0, 18], [0, 19], [1, 20], [2, 20], [3, 19], [2, 18]], function (y, x) { put(y, x, 'D'); });
    else each([[7, 12], [6, 12], [5, 12], [4, 12], [3, 12], [2, 11], [1, 10], [1, 9], [2, 8], [3, 8], [4, 9], [3, 10]], function (y, x) { put(y, x, 'D'); });
  }
  // la crête sur le haut de la tête (g, contour k)
  if (has('crete')) {
    if (front) { range(2, 7).forEach(function (y) { P(y, 15, 'g'); A(y, 14, 'k'); }); P(1, 15, 'k'); }
    else { each([[4, 12], [5, 12], [6, 12], [7, 12], [5, 11], [6, 11], [7, 11], [6, 10], [7, 10]], function (y, x) { put(y, x, 'g'); }); each([[3, 12], [4, 11], [5, 10], [6, 9], [7, 9], [4, 13], [5, 13], [6, 13], [7, 13]], function (y, x) { onAir(y, x, 'k'); }); }
  }
  // la raie sombre du front au nez (U)
  if (has('raie')) {
    if (front) range(9, 12).forEach(function (y) { S(y, 15, 'U'); });
    else range(13, 24).forEach(function (x) { onSkin(9, x, 'U'); });
  }
  // deux petites bulles sur le museau
  if (has('bulles-nez')) { if (face) { P(13, 13, 'S'); } else if (!front) put(13, 29, 'S'); }
  // la collerette de bulles, autour de l'écharpe
  if (has('bulles')) { // des bulles rondes (r, ombre R) au-dessus et au-dessous de l'écharpe, sans le pan qui flotte
    if (front) {
      each([[21, 29], [21, 30], [22, 30], [22, 31], [23, 30], [23, 31], [24, 30], [24, 31], [25, 30]], function (y, x) { if ('rRk'.indexOf(at(y, x)) >= 0) put(y, x, '.'); });
      range(3, 15).forEach(function (x) { if (x % 3 !== 2) P(18, x, 'r'); if (x % 3 === 2) P(20, x, 'R'); });
      range(5, 15).forEach(function (x) { if (x % 3 !== 0) B(22, x, 'r'); });
      each([[19, 1], [20, 1], [21, 1], [20, 0]], function (y, x) { P(y, x, 'r'); });
    } else {
      each([[18, 3], [18, 4], [18, 5], [19, 4], [19, 5], [19, 6], [19, 7], [19, 8], [19, 9]], function (y, x) { if ('rR'.indexOf(at(y, x)) >= 0) put(y, x, '.'); });
      range(11, 26).forEach(function (x) { if (x % 3 !== 2) put(16, x, 'r'); if (x % 3 === 2) put(18, x, 'R'); });
      range(11, 25).forEach(function (x) { if (x % 3 !== 0) onBody(20, x, 'r'); });
      each([[17, 9], [18, 9], [19, 10], [18, 8]], function (y, x) { put(y, x, 'r'); });
    }
  }
  // les triangles blancs au-dessus des yeux (S)
  if (has('triangles')) {
    if (face) { [5, 6, 7, 8].forEach(function (x) { P(2, x, 'S'); }); [6, 7].forEach(function (x) { P(1, x, 'S'); P(0, x, 'k'); }); each([[1, 5], [1, 8], [2, 4], [2, 9]], function (y, x) { P(y, x, 'k'); }); }
    else if (!front) { range(16, 21).forEach(function (x) { put(2, x, 'S'); }); range(17, 20).forEach(function (x) { put(1, x, 'S'); put(0, x, 'k'); }); each([[1, 16], [1, 21], [2, 15], [2, 22]], function (y, x) { put(y, x, 'k'); }); }
  }
  // la veste (V, liseré W) : un happi court, sur les épaules et les flancs
  if (has('veste')) {
    if (view === 'back') { range(22, 26).forEach(function (y) { range(1, 30).forEach(function (x) { onSkin(y, x, 'V'); }); }); range(2, 29).forEach(function (x) { if (at(26, x) === 'V') put(26, x, 'W'); }); }
    else if (front) { // ouverte devant : les pans couvrent les bras, les flancs et le bord du ventre
      [22, 23, 24, 25].forEach(function (y) {
        var last = -1;
        range(2, 11).forEach(function (x) { var c = at(y, x); if ((isSkin(c) && !(y === 24 && c === 'l')) || (c === 'c' && x <= 11)) { P(y, x, 'V'); last = x; } });
        if (last >= 0) P(y, last, 'W');
      });
    } else {
      range(20, 25).forEach(function (y) { range(9, 21).forEach(function (x) { if (!(y === 24 && at(y, x) === 'l')) onSkin(y, x, 'V'); }); });
      range(8, 21).forEach(function (x) { if (at(25, x) === 'V') put(25, x, 'W'); });
      if (view === 'atk') [22, 23, 24].forEach(function (x) { onSkin(20, x, 'V'); });
    }
  }
  // un signe blanc dans le dos de la veste
  if (has('signe-dos') && view === 'back') ['W.WW', 'WWW.', 'W.WW'].forEach(function (row, i) { row.split('').forEach(function (ch, j) { if (ch === 'W') put(23 + i, 14 + j, 'W'); }); });
  // la cape (V, liseré W) et son col montant
  if (has('cape')) {
    if (view === 'back') { // elle tombe des épaules jusqu'aux pieds, avec son col
      range(11, 28).forEach(function (y) { range(1, 30).forEach(function (x) { if (y >= 13 || (x >= 5 && x <= 26)) onBody(y, x, 'V'); }); });
      range(2, 29).forEach(function (x) { if (at(28, x) === 'V') put(28, x, 'W'); if (at(11, x) === 'V') put(11, x, 'W'); });
    }
    else if (front) { range(14, 18).forEach(function (y) { A(y, 1, 'V'); A(y, 0, 'k'); }); range(19, 27).forEach(function (y) { [1, 2].forEach(function (x) { B(y, x, 'V'); }); }); P(27, 1, 'W'); P(27, 2, 'W'); }
    else range(11, 27).forEach(function (y) { var x0 = 0; while (x0 < W && at(y, x0) === '.') x0++; for (var x = Math.max(3, x0 - 4); x < x0; x++) put(y, x, x === Math.max(3, x0 - 4) ? 'k' : (y === 27 ? 'W' : 'V')); });
  }
  // l'obi, une ceinture de tissu (W), par-dessus la ceinture portée
  if (has('obi')) {
    if (front) range(6, 25).forEach(function (x) { onBody(24, x, 'W'); });
    else range(10, 26).forEach(function (x) { onBody(23, x, 'W'); });
  }
  // les cornes (l, contour k)
  if (has('cornes')) {
    if (front) each([[2, 4, 'l'], [1, 3, 'l'], [2, 3, 'k'], [1, 2, 'k'], [0, 3, 'k'], [1, 4, 'k'], [2, 5, 'k']], function (y, x, ch) { A(y, x, ch); });
    else each([[2, 16, 'l'], [1, 15, 'l'], [2, 15, 'k'], [1, 14, 'k'], [0, 15, 'k'], [1, 16, 'k'], [2, 17, 'k']], function (y, x, ch) { onAir(y, x, ch); });
  }
  // le grand bouclier rond porté dans le dos (T, cerclé de G)
  if (has('bouclier')) {
    var disc = function (cy, cx, r, over) {
      for (var y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (var x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        var d = Math.sqrt((y - cy) * (y - cy) + (x - cx) * (x - cx));
        if (d > r || (!over && at(y, x) !== '.')) continue;
        put(y, x, d > r - 1 ? 'k' : (d > r - 2 ? 'G' : 'T'));
      }
    };
    if (view === 'back') disc(18, 15.5, 8.5, true);
    else if (!front) disc(15, 6, 6.5, false);
  }
  // la touffe, les sourcils épais et la barbiche blancs (T)
  if (has('touffe')) {
    // une touffe en flammèches : trois mèches, celle du milieu plus haute
    if (front) each([[4, 15, 'T'], [5, 15, 'T'], [6, 15, 'T'], [7, 15, 'T'], [3, 15, 'k'], [5, 13, 'T'], [6, 13, 'T'], [7, 13, 'T'], [7, 14, 'T'], [6, 14, 'T'], [4, 13, 'k'], [5, 12, 'k'], [6, 12, 'k'], [7, 12, 'k'], [4, 14, 'k']], function (y, x, ch) { P(y, x, ch); });
    else each([[5, 11, 'T'], [6, 11, 'T'], [7, 11, 'T'], [8, 11, 'T'], [6, 10, 'T'], [7, 10, 'T'], [8, 10, 'T'], [7, 9, 'T'], [8, 12, 'T'], [7, 12, 'T'],
      [4, 11, 'k'], [5, 10, 'k'], [6, 9, 'k'], [7, 8, 'k'], [5, 12, 'k'], [6, 12, 'k']], function (y, x, ch) { if (ch === 'T' || at(y, x) === '.') put(y, x, ch); });
  }
  if (has('sourcils')) {
    if (face) { range(4, 9).forEach(function (x) { P(2, x, 'T'); A(1, x, 'k'); }); P(3, 4, 'T'); P(3, 9, 'T'); }
    else if (!front) { range(15, 22).forEach(function (x) { put(2, x, 'T'); onAir(1, x, 'k'); }); }
  }
  if (has('barbiche')) {
    if (face) { range(13, 15).forEach(function (x) { P(18, x, 'T'); }); [14, 15].forEach(function (x) { P(19, x, 'T'); }); P(20, 15, 'T'); }
    else if (!front) each([[16, 26], [16, 27], [17, 26], [17, 27], [18, 27], [16, 28]], function (y, x) { put(y, x, 'T'); });
  }
  // la pipe (T), sa braise (O) et sa fumée (G) ; la cicatrice sur l'œil gauche (K)
  if (has('pipe')) {
    if (face) each([[17, 26, 'T'], [18, 27, 'T'], [18, 28, 'T'], [18, 29, 'T'], [17, 29, 'T'], [16, 29, 'T'], [15, 29, 'O'], [13, 30, 'G'], [12, 29, 'G'], [10, 30, 'G']], put);
    else if (!front) each([[16, 28, 'T'], [16, 29, 'T'], [16, 30, 'T'], [16, 31, 'T'], [15, 31, 'T'], [14, 31, 'O'], [12, 31, 'G'], [11, 30, 'G']], put);
  }
  if (has('cicatrice') && face) each([[4, 26], [5, 26], [9, 25], [10, 24], [11, 24]], function (y, x) { onBody(y, x, 'K'); });
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
  if (look.mutation) [main, back, ko, side, atk].forEach(function (g) { paintMutation(g, look.mutation); });
  if (look.skin) { paintSkin(main, look.skin, 'front'); paintSkin(ko, look.skin, 'ko'); paintSkin(back, look.skin, 'back'); paintSkin(side, look.skin, 'side'); paintSkin(atk, look.skin, 'atk'); }
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
  } else if (look.weapon === 'mains' && !look.hermit) {
    // à mains nues : le poing fermé au bout du bras, sans le kunaï
    stampPixels(atk, [[19, 29, '.'], [19, 30, '.'], [19, 31, '.'], [20, 29, '.'], [20, 30, '.'], [20, 31, '.'], [21, 29, '.'], [21, 30, '.'], [21, 31, '.'],
      [20, 28, 'l'], [19, 28, 'k'], [21, 28, 'k'], [20, 29, 'k']]);
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
  // les Légendaires flottent au vent : on garde la grenouille d'avant la cape et le bandeau pour une seconde image
  var windy = look.cape || look.hat === 'bandeau';
  var bare = windy ? { main: c(main), back: c(back), side: c(hermit ? hermit[0] : side) } : null;
  // la cape, le chapeau et la ceinture (phase 1 : l'image au vent) ; fronts : face, dos, à terre (sans la cape pour le dos)
  function finish(fronts, sides, phase) {
    var F = fronts.main, B = fronts.back, K = fronts.ko;
    if (look.cape) { paintCape(B, 'back', phase); paintCape(F, 'front', phase); if (K) paintCape(K, 'front', phase); sides.forEach(function (g) { paintCape(g, 'side', phase); }); }
    if (look.hat && HATS[look.hat]) {
      var h = phase && HATS[look.hat].wind ? HATS[look.hat].wind : HATS[look.hat];
      [F, B, K].forEach(function (g) { if (g) stampRows(g, h.front[0], h.front[1]); });
      sides.forEach(function (g) { stampRows(g, h.side[0], h.side[1]); });
    }
    var all = [F, B].concat(K ? [K] : [], sides);
    if (look.belt) {
      // breloque pendue sous la boucle (dent, perle, plume : couleur Y)
      if (look.charm) {
        [F, K].forEach(function (g) { if (g) stampPixels(g, [[25, 15, 'Y'], [25, 16, 'Y'], [26, 15, 'Y'], [27, 15, 'k']]); });
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
  }
  var sides = [side, atk].concat(hermit || []);
  finish({ main: main, back: back, ko: ko }, sides, 0);
  if (bare) { finish({ main: bare.main, back: bare.back }, [bare.side], 1); out.wind = bare; }
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
// ---------- Les espèces du Continent ----------
// Les nouvelles espèces du Continent (tournées vers la gauche, comme les autres). Une seule image par espèce
// quand anim vaut 'bob' : la seconde est calculée (le corps s'affaisse d'un pixel). Les volants ont deux images.
var NEW_SPECIES = {
  rat: {
    behavior: 'dasher', xp: 5, hp: 11, speed: 24, chase: 40, dash: 180, size: 16, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#4a3a3a', 2: '#7a6a6a', 3: '#b0a4a0', p: '#e8a0a8', r: '#e0402a', w: '#f4f4e8' },
    frames: [[
      '................',
      '................',
      '................',
      '....kk..........',
      '...kppk.........',
      '...kppkkkkkk....',
      '..k2222222222k..',
      '.k2r2222222222k.',
      'k22222222222222k',
      'kp222222222222k.',
      '.kkw22233332k2k.',
      '...kk2k33332kk.k',
      '....k2kk2kk2k.kp',
      '....kk..kk.kk.kp',
      '..............kk',
      '................'
    ]]
  },
  corbeau: {
    behavior: 'flyer', xp: 5, hp: 8, speed: 30, chase: 58, size: 16,
    pal: { k: '#1a1c2c', 1: '#22222e', 2: '#3a3a4a', 3: '#5a5a70', y: '#e0b43a', r: '#e0402a' },
    frames: [[
      '................',
      '........kkk.....',
      '.......k333k....',
      '......k3333k....',
      '....kk3333k.....',
      '...k1112kkkk....',
      '.kyk12r22222k...',
      'kyyk1222222222k.',
      '.kkk12222222222k',
      '....k1222222kkk.',
      '.....k11222k....',
      '......kk1kk.....',
      '.......kyk......',
      '......kykyk.....',
      '................',
      '................'
    ], [
      '................',
      '................',
      '................',
      '................',
      '....kk..........',
      '...k1112kkkk....',
      '.kyk12r22222k...',
      'kyyk1222222222k.',
      '.kkk12222222222k',
      '....k1233333kkk.',
      '.....k133333k...',
      '......k3333k....',
      '.......k33k.....',
      '.......kyk......',
      '......kykyk.....',
      '................'
    ]]
  },
  scarabee: {
    behavior: 'walker', xp: 6, hp: 13, speed: 16, chase: 26, size: 16, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#1f3a2a', 2: '#2f6a3a', 3: '#6ac05a', w: '#e8f7d0', h: '#3a2a1a', r: '#e0b43a' },
    frames: [[
      '................',
      '................',
      '................',
      '................',
      'kk..............',
      'khk....kkkkk....',
      '.khk.kk33222kk..',
      '..kkk3w3222222k.',
      '..kr2332222222k.',
      '.k2222322222221k',
      '.k2222k22222221k',
      '..k222k2222221k.',
      '...kkkkkkkkkkk..',
      '...k.k.k.k.k.k..',
      '..k.k.k..k.k..k.',
      '................'
    ]]
  },
  serpent: {
    behavior: 'dasher', xp: 6, hp: 11, speed: 20, chase: 34, dash: 190, size: 16, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#2a4a1a', 2: '#4a8a2a', 3: '#8ac050', y: '#e0d070', r: '#e0402a', w: '#f4f4e8' },
    frames: [[
      '................',
      '................',
      '...kkkk.........',
      '..k2222k........',
      '.k2r22y2k.......',
      'k222222y2k......',
      '.kkkk2222k......',
      'r.r..k222k......',
      '.....k2y2k......',
      '....k22y2k......',
      '...k2y22k..kkk..',
      '..k2y22kkkk222k.',
      '..k22y222222y22k',
      '..k1122222y2221k',
      '...kk11111111kk.',
      '.....kkkkkkkk...'
    ]]
  },
  scorpion: {
    behavior: 'walker', xp: 6, hp: 12, speed: 18, chase: 30, size: 16, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#6a3a1a', 2: '#a8641e', 3: '#e0a050', r: '#e0402a', w: '#f4f4e8' },
    frames: [[
      '.........kkk....',
      '........k332k...',
      '........kk.k2k..',
      '............k2k.',
      '............k2k.',
      '...........k22k.',
      '.kk.......k22k..',
      'k32k....kk22k...',
      'k2k.kkkk22222k..',
      '.kk2r3322222222k',
      '..k22222222222k.',
      '...k1122222221k.',
      '....kkkkkkkkkk..',
      '....k.k.kk.k.k..',
      '...k.k.k..k.k.k.',
      '................'
    ]]
  },
  squelette: {
    behavior: 'walker', xp: 6, hp: 12, speed: 16, chase: 28, size: 16, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#8a8478', 2: '#c8c2b0', 3: '#f0ecdc', r: '#e0402a', t: '#9a8a7a', o: '#5a3e25' },
    frames: [[
      '................',
      '....kkkkkk......',
      '...k333322k.....',
      '..k3kk33kk2k....',
      '..k3kr33kr2k....',
      '...k3333222k....',
      '..kk3k3k2kk.....',
      'kt..kk3kk.......',
      'kt.k3k2k2k......',
      'kt.kk3k2kk2k....',
      'ko.k3k3k2k.k....',
      '.kk2kk2kk2kk....',
      '...k2k..k2k.....',
      '...k2k..k2k.....',
      '..kk2k..k2kk....',
      '..kkkk..kkkk....'
    ]]
  },
  fantome: {
    behavior: 'flyer', xp: 5, hp: 9, speed: 26, chase: 50, size: 16,
    pal: { k: '#1a1c2c', 1: '#8a9ac8', 2: '#c0cce8', 3: '#eef2ff', r: '#3a2a6a', w: '#f4f4e8' },
    frames: [[
      '................',
      '.....kkkkk......',
      '....k33333k.....',
      '...k3333322k....',
      '..k3rr3rr322k...',
      '..k3rr3rr3222k..',
      '..k33333332222k.',
      '..k3333r3332222k',
      '..k33333332222k.',
      '..k3333322222k..',
      '..k33332222222k.',
      '..k3222222222k..',
      '..k2k22k22k22k..',
      '..kk.kk.kk.kkk..',
      '................',
      '................'
    ], [
      '................',
      '................',
      '.....kkkkk......',
      '....k33333k.....',
      '...k3333322k....',
      '..k3rr3rr322k...',
      '..k3rr3rr32222k.',
      '..k33333332222k.',
      '..k3333r33322k..',
      '..k33333332222k.',
      '..k33332222222k.',
      '..k3222222222k..',
      '..k22k22k22k2k..',
      '...kk.kk.kk.kk..',
      '................',
      '................'
    ]]
  },
  golem: {
    behavior: 'walker', xp: 7, hp: 16, speed: 12, chase: 20, size: 16, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#4a4a4a', 2: '#7a7a72', 3: '#a8a89a', g: '#5a8a3a', y: '#f0d040' },
    frames: [[
      '................',
      '.....kkkkkk.....',
      '....k3322g2k....',
      '....k3y22y2k....',
      '....k322222k....',
      '..kkkk2222kkkk..',
      '.k33k222222k22k.',
      '.k32k2g22222k2k.',
      '.k22k22222222k2k',
      '.k22k222222g2k2k',
      '..kkk22222221kk.',
      '....k22kk221k...',
      '....k21kk211k...',
      '...kk21k.k21kk..',
      '...kkkkk.kkkkk..',
      '................'
    ]]
  },
  salamandre: {
    behavior: 'dasher', xp: 6, hp: 11, speed: 22, chase: 36, dash: 200, size: 16, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#8a1a1a', 2: '#d0402a', 3: '#f08a4a', y: '#f0d040', o: '#ff9a2a', w: '#f4f4e8' },
    frames: [[
      '................',
      '................',
      '.........o..o...',
      '........oyo.oyo.',
      '.......oyyo.yyo.',
      '..kkkk..kook.kk.',
      '.k2w22kk22222k..',
      'k2222222222222k.',
      'k33322222222222k',
      '.kkk33332222222k',
      '...k2kk3333222k.',
      '...kk.k22kk22kkk',
      '......kkk..kkk2k',
      '..............kk',
      '................',
      '................'
    ]]
  },
  fee: {
    behavior: 'flyer', xp: 5, hp: 8, speed: 32, chase: 60, size: 16,
    pal: { k: '#1a1c2c', 1: '#c060c0', 2: '#f0a0e0', 3: '#fff0ff', a: '#a0f0e0', b: '#60c0b0', y: '#fff6a0', r: '#3a1a4a' },
    frames: [[
      '................',
      '..kk......kk....',
      '.kaak....kaak...',
      '.kaabk..kbaak...',
      '..kabbkkbbak....',
      '...kkk33kkk.....',
      '....k3333k......',
      '...k3r33r3k.....',
      '...k333333k.....',
      '....k2222k......',
      '...kaak2kaak....',
      '..kaak.k.kaak...',
      '..kkk..y..kkk...',
      '......yyy.......',
      '.......y........',
      '................'
    ], [
      '................',
      '................',
      '................',
      '....kk....kk....',
      '...kaabkkbaak...',
      '...kkk33kkk.....',
      '....k3333k......',
      '...k3r33r3k.....',
      '...k333333k.....',
      '..kkak2222kakk..',
      '.kaaak2kkkaaak..',
      '.kaak..k..kaak..',
      '.kkk...y...kkk..',
      '......yyy.......',
      '.......y........',
      '................'
    ]]
  },
  plante: {
    behavior: 'walker', xp: 6, hp: 12, speed: 10, chase: 22, size: 16, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#8a1a3a', 2: '#d04060', 3: '#f08aa0', w: '#f4f4e8', g: '#3a7a2a', G: '#6ac04a', d: '#1f4a1a' },
    frames: [[
      '................',
      '..kkkkkk........',
      '.k322223k.......',
      'k3wkwkw22k......',
      'k........k......',
      'kw.kw.kw.k......',
      '.k222222k.......',
      '..kk22kkk.......',
      '....kgk.........',
      '.kk.kGk.kk......',
      'kGGkkGkkGGk.....',
      'kGggkGkgGdk.....',
      '.kkkkGkkkk......',
      '....kGk.........',
      '...kdddk........',
      '..kkkkkkk.......'
    ]]
  },
  loup: {
    behavior: 'dasher', xp: 6, hp: 12, speed: 24, chase: 40, dash: 210, size: 16, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#3a3a4a', 2: '#6a6a7a', 3: '#b0b0c0', w: '#f4f4e8', y: '#f0d040' },
    frames: [[
      '................',
      '................',
      '....k.k.........',
      '...k2k2k........',
      '..k2y2222kkkkk..',
      'kk22222222222k..',
      'k3w22222222222k.',
      '.kkk3222222222kk',
      '...k33222222222k',
      '....k3322222k22k',
      '....k2kk222kk.kk',
      '....k2k.k2kk....',
      '....k2k.k2k.....',
      '...kkk..kkk.....',
      '................',
      '................'
    ]]
  },
  araignee: {
    behavior: 'walker', xp: 6, hp: 12, speed: 18, chase: 30, size: 16, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#1a1a24', 2: '#3a2a4a', 3: '#6a4a8a', r: '#e0402a', y: '#e0b43a' },
    frames: [[
      '................',
      '................',
      '................',
      '.....kkkkk......',
      '....k33322k.....',
      '...k3322222k....',
      '.kkk3y222y22kkk.',
      'k.kk22222222kk.k',
      '..kkrkr222222k..',
      '.k.k222222222k.k',
      'k..kkk22222kkk..',
      '..k..kkkkkk..k..',
      '.k..k..k.k..k.k.',
      'k..k..k...k..k.k',
      '................',
      '................'
    ]]
  },
  chevalier: {
    behavior: 'walker', xp: 7, hp: 15, speed: 14, chase: 24, size: 16, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#5a6070', 2: '#9aa0b0', 3: '#d8dce6', r: '#c9412f', y: '#e0b43a', o: '#6e4a2a' },
    frames: [[
      '.......rr.......',
      '......rrr.......',
      '.....kkkkk......',
      '....k33322k.....',
      '....kkkkk2k.....',
      '....k322222k....',
      '..kkkk2222kk....',
      '.kyyyk22222kk...',
      '.kyryk2222k2k...',
      '.kyyyk2222k2k...',
      '.kyryk2222kok...',
      '..kkk22222kok...',
      '....k22k22k.....',
      '....k2k.k2k.....',
      '...kk1k.k1kk....',
      '...kkkk.kkkk....'
    ]]
  }
};
// Le dragon (32 × 32) : le seigneur des dernières terres
NEW_SPECIES.dragon = {
  behavior: 'dasher', xp: 0, hp: 30, speed: 22, chase: 40, dash: 230, size: 32,
  pal: { k: '#1a1c2c', 1: '#1a3a6a', 2: '#2a6ab0', 3: '#6aa8f0', a: '#3a4a7a', b: '#6a7ab0', y: '#f0d040', w: '#f4f4e8', r: '#e0402a' },
  frames: [[
    '................................',
    '..................kk............',
    '.................kbak...........',
    '................kbbak.......kk..',
    '...............kbbaak......kbak.',
    '.......kk.....kbbaaak.....kbbak.',
    '......k3k....kbbbaaak....kbbaak.',
    '.....k33kk..kbbbbaaak...kbbaaak.',
    '....k3332kkkkbbbbaaaakkkbbbaaak.',
    '...k33222222kbbbbaaaaabbbbaaaak.',
    '..k3y22222222kkbbbaaaabbbaaakk..',
    '.k3222222w2222222kkbbbaaakkk....',
    'k32222222222222222222kkkkk......',
    'k2222kkk222222222222222k........',
    '.kkkk.kwk22222222222222k........',
    '......kk.k222233333222222k......',
    '..........k2233333333222222k....',
    '...........k233333333322222k....',
    '...........k2333333333222222k...',
    '............k233333333222222k...',
    '.............k2233332222222222k.',
    '..............k22222222k22222k..',
    '..............k222kk222kk22222k.',
    '.............k222k.k222k.kk222k.',
    '............kk22k...k22k...k222k',
    '...........kyykk...kyykk....kk2k',
    '...........kkkk....kkkk......kk.',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................'
  ]]
};
Object.keys(NEW_SPECIES).forEach(function (id) { SPECIES[id] = NEW_SPECIES[id]; });

// les grilles sont complétées avec des '.' à la bonne largeur
Object.keys(SPECIES).forEach(function (id) {
  var n = SPECIES[id].size;
  SPECIES[id].frames = SPECIES[id].frames.map(function (f) { return f.map(function (r) { return (r + '.'.repeat(n)).slice(0, n); }); });
});
// la seconde image des espèces qui n'en ont qu'une : le corps s'affaisse d'un pixel (les pattes restent)
Object.keys(SPECIES).forEach(function (id) {
  var s = SPECIES[id], f = s.frames[0], n = f.length;
  if (s.frames.length < 2) s.frames.push(f.map(function (r, y) { return y === 0 ? '.'.repeat(r.length) : (y < n - 3 ? f[y - 1] : r); }));
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
