// Carte du monde (640×400, pixel art) : un continent entouré d'eau, découpé en six régions (une par biome),
// reliées par un chemin qui monte du Marais-Brume jusqu'au Sommet du Héron.
// Chaque région est peinte avec les tuiles de son biome, ses arbres, ses rochers et son monument.
// Les terres pas encore ouvertes restent sous la brume : on n'aperçoit qu'un bout de la prochaine,
// et la vue se recadre sur ce qui a été découvert.
var WorldMap = (function () {
  var W = 640, H = 400, YS = 1.15;
  var REGIONS = [
    { x: 120, y: 300 }, { x: 290, y: 322 }, { x: 196, y: 190 }, { x: 350, y: 176 }, { x: 490, y: 270 }, { x: 530, y: 96 }
  ];
  var BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  var K = '#10170f';

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function smooth(a, b, v) { var t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); }
  function vnoise(x, y, s, seed) {
    x /= s; y /= s;
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function sprite(rows, pal) {
    var w = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    return stringsToCanvas(rows.map(function (r) { return (r + '.'.repeat(w)).slice(0, w); }), pal);
  }

  // ---------- Géographie ----------
  var blobs = REGIONS.map(function (r) { return { x: r.x, y: r.y, r: 88 }; });
  for (var bi = 1; bi < REGIONS.length; bi++) {
    blobs.push({ x: (REGIONS[bi].x + REGIONS[bi - 1].x) / 2, y: (REGIONS[bi].y + REGIONS[bi - 1].y) / 2, r: 60 });
  }
  blobs.push({ x: 60, y: 230, r: 34 }, { x: 420, y: 350, r: 40 }, { x: 600, y: 190, r: 30 }, { x: 440, y: 60, r: 36 });
  function landField(x, y) {
    var best = 1e9;
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i], dd = Math.hypot(x - b.x, y - b.y) - b.r;
      if (dd < best) best = dd;
    }
    return best + (vnoise(x, y, 22, 5) - 0.5) * 22 + (vnoise(x, y, 7, 6) - 0.5) * 6;
  }
  function nearest(x, y) {
    var bi2 = 0, bd = 1e9;
    for (var k = 0; k < REGIONS.length; k++) {
      var r = REGIONS[k], dd = (x - r.x) * (x - r.x) + (y - r.y) * (y - r.y) * YS * YS;
      if (dd < bd) { bd = dd; bi2 = k; }
    }
    return bi2;
  }
  // Distance (positive) d'un point à la frontière entre la région a et la région b, côté b
  function pastBorder(x, y, a, b) {
    var A = REGIONS[a], B = REGIONS[b], ay = A.y * YS, by = B.y * YS, py = y * YS;
    var ab = Math.hypot(B.x - A.x, by - ay);
    return ((x - A.x) * (x - A.x) + (py - ay) * (py - ay) - (x - B.x) * (x - B.x) - (py - by) * (py - by)) / (2 * ab);
  }
  // ---------- Les sentiers ----------
  // Un sentier par région : il entre par la frontière de la région précédente (la plage pour le Marais),
  // serpente jusqu'à l'antre du boss et ressort vers la région suivante. Les 10 étapes sont posées dessus.
  var START = { x: 60, y: 318 }, NEST = { x: 548, y: 50 };
  var mid = function (a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  function onLand(p, toward) {
    for (var i = 0; i < 40 && landField(p.x, p.y) > -8; i++) { p.x += (toward.x - p.x) * 0.1; p.y += (toward.y - p.y) * 0.1; }
    return p;
  }
  // Courbe de Catmull-Rom échantillonnée tous les ~1,5 px
  function spline(pts) {
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      var n = Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 1.5);
      for (var s = 0; s < n; s++) {
        var t = s / n, t2 = t * t, t3 = t2 * t;
        var f = function (a, b, c, d) { return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3); };
        out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
      }
    }
    out.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
    return out;
  }
  var TRAILS = REGIONS.map(function (C, i) {
    var E = i === 0 ? START : mid(REGIONS[i - 1], C), X = i === REGIONS.length - 1 ? NEST : mid(C, REGIONS[i + 1]);
    var L = Math.hypot(X.x - E.x, X.y - E.y), px = -(X.y - E.y) / L, py = (X.x - E.x) / L, side = i % 2 ? 1 : -1;
    var off = function (p, w) { return onLand({ x: p.x + px * w, y: p.y + py * w }, C); };
    var lerp = function (a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; };
    var pts = spline([E, off(lerp(E, C, 0.45), 18 * side), off(C, -22 * side), off(lerp(C, X, 0.55), 16 * side), X]);
    var dist = [0];
    for (var k = 1; k < pts.length; k++) dist.push(dist[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
    var total = dist[dist.length - 1];
    // étape 0 = l'entrée ; étapes 1 à 10 réparties, le boss juste avant la sortie
    var stageDist = [0];
    for (var st = 1; st <= 10; st++) stageDist.push(total * (0.08 + (st - 1) * 0.82 / 9));
    var at = function (d) {
      var j = 0;
      while (j < dist.length - 2 && dist[j + 1] < d) j++;
      var t = (d - dist[j]) / Math.max(0.001, dist[j + 1] - dist[j]);
      return { x: pts[j].x + (pts[j + 1].x - pts[j].x) * Math.min(1, t), y: pts[j].y + (pts[j + 1].y - pts[j].y) * Math.min(1, t) };
    };
    return {
      pts: pts, dist: dist, total: total, stageDist: stageDist, at: at,
      stages: stageDist.map(at),
      // le monument est posé de l'autre côté du sentier
      landmark: onLand({ x: C.x + px * 20 * side, y: C.y + py * 20 * side }, C)
    };
  });
  var TRAIL_PAL = [
    { e: '#3a2c18', f: '#8a6a3a', l: '#b08a52' },
    { e: '#2a1c10', f: '#8a6038', l: '#b0844e', planks: true },
    { e: '#34240f', f: '#7a5a30', l: '#a07a44' },
    { e: '#23232e', f: '#6e6e80', l: '#9a9aac' },
    { e: '#2a3034', f: '#9a9680', l: '#c8c4aa', planks: true },
    { e: '#55544a', f: '#d8d4c8', l: '#f4f4ec' }
  ];
  function pathDist(x, y) {
    var d = 1e9;
    for (var i = 0; i < TRAILS.length; i++) {
      var pts = TRAILS[i].pts;
      for (var k = 0; k < pts.length; k += 3) { var dd = Math.abs(pts[k].x - x) + Math.abs(pts[k].y - y); if (dd < d) d = dd; }
    }
    return d;
  }
  // Sentier en terre battue (ou en planches sur l'eau et dans le temple), avec une clairière à chaque étape
  function drawTrail(ctx, i) {
    var tr = TRAILS[i], P = TRAIL_PAL[i], R = Math.round;
    tr.pts.forEach(function (p) { ctx.fillStyle = P.e; ctx.fillRect(R(p.x) - 3, R(p.y) - 2, 6, 5); });
    tr.stages.forEach(function (p, k) { if (k) { ctx.fillStyle = P.e; ctx.fillRect(R(p.x) - 6, R(p.y) - 3, 12, 7); } });
    tr.pts.forEach(function (p) { ctx.fillStyle = P.f; ctx.fillRect(R(p.x) - 2, R(p.y) - 1, 4, 3); });
    tr.stages.forEach(function (p, k) { if (k) { ctx.fillStyle = P.f; ctx.fillRect(R(p.x) - 5, R(p.y) - 2, 10, 5); ctx.fillStyle = P.l; ctx.fillRect(R(p.x) - 4, R(p.y) - 2, 8, 1); } });
    tr.pts.forEach(function (p, k) {
      if (P.planks && k % 3 === 0) { ctx.fillStyle = P.e; ctx.fillRect(R(p.x) - 2, R(p.y), 4, 1); }
      else if (k % 5 === 0) { ctx.fillStyle = P.l; ctx.fillRect(R(p.x) - 1 + (k % 3) - 1, R(p.y) - 1, 1, 1); }
      if (k % 9 === 4) { ctx.fillStyle = P.e; ctx.fillRect(R(p.x) + ((k >> 1) % 3) - 1, R(p.y) + 1, 1, 1); }
    });
  }

  // Sol de chaque biome : ses vraies tuiles, avec des mares et des bosquets groupés
  function biomeTexture(i) {
    // le Sommet : de la roche plutôt que des dalles
    var b = i === 5 ? Object.assign({}, BIOMES[i], { wall: 'rock' }) : BIOMES[i], w = W / TILE, h = Math.ceil(H / TILE), tiles = new Uint8Array(w * h);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var n = vnoise(x, y, 4, i * 31 + 3), r = hash(x, y, i * 13 + 1);
        tiles[y * w + x] = b.water && n < 0.26 ? RT.WATER : (r < 0.035 ? RT.BLOCK : (n > 0.66 && r < 0.55 ? RT.BUSH : (r < 0.22 ? RT.ALT : RT.FLOOR)));
      }
    }
    var c = renderMap({ biome: b, w: w, h: h, tiles: tiles, seed: i * 7 });
    return c.getContext('2d').getImageData(0, 0, W, H).data;
  }

  // ---------- Décors ----------
  var ROCK = { k: K, L: '#b0ae9e', l: '#85836f', s: '#5a594c' };
  var PINE = { k: K, g: '#3a6a4a', d: '#24452f', w: '#f4f4e8', b: '#4a3322' };
  function palOf(i) {
    var P = BIOMES[i].pal;
    return { k: K, g: P.bush, G: P.bushLight, d: P.bushDark, b: '#4a3322', c: '#7a4a2a', y: '#f3e27a', w: '#f4f4e8',
      B: P.block, L: P.blockLight, D: P.blockDark, R: '#c9412f' };
  }
  var SPR = {
    tree: ['...kkkk...', '..kGGggk..', '.kGGgggdk.', 'kGgggggddk', 'kggggggddk', '.kgggdddk.', '..kkdbkk..', '....kbk...', '...kbbbk..'],
    reeds: ['.c....', '.c..c.', '.g..c.', 'gg.gg.', '.gg.g.', '..ggg.', '..dd..'],
    willow: ['...kkkkkk...', '..kGGGgggk..', '.kGGggggggk.', 'kGgggggggddk', 'kgdggggggdgk', 'kgdgkbbkgdgk', 'kgd.kbbk.dgk', '.gd..bb..dg.', '.d...bb...d.', '.d...bb...d.', '....kbbbk...'],
    pine: ['...k...', '..kwk..', '..kgk..', '.kwggk.', '.kgggk.', 'kwgggdk', 'kgggddk', 'kkkbkkk', '...b...'],
    rock: ['..kkk..', '.kLLlk.', 'kLllllk', 'klllssk', '.kkkkk.'],
    crystal: ['..k..', '.kLk.', '.kLBk', 'kLBBk', 'kLBDk', 'kBBDk', '.kkk.'],
    pillar: ['kkkkk', 'kLLBk', '.kLk.', '.kLk.', '.kBk.', '.kLk.', '.kBk.', '.kLk.', 'kLBDk', 'kkkkk'],
    stub: ['.kk..', 'kLBk.', 'kLBk.', 'kLBDk', 'kkkkk'],
    mushroom: ['.kkk.', 'kRwRk', 'kRRRk', '.kwk.', '.kwk.'],
    glow: ['..y...', '.kgk.y', 'kgGgk.', 'kgggk.', '.kkk..'],
    grass: ['g.G.g', '.gGg.', '..d..']
  };
  var DECOR = [
    ['tree', 'tree', 'reeds', 'reeds', 'grass'],
    ['glow', 'reeds', 'glow', 'tree', 'grass'],
    ['willow', 'willow', 'mushroom', 'tree', 'grass'],
    ['rock', 'crystal', 'crystal', 'rock', 'stub'],
    ['pillar', 'stub', 'rock', 'glow', 'grass'],
    ['pine', 'pine', 'rock', 'rock', 'grass']
  ];
  var sprCache = {};
  function spr(name, i) {
    var key = name + i;
    if (!sprCache[key]) sprCache[key] = sprite(SPR[name], name === 'rock' ? ROCK : (name === 'pine' ? PINE : palOf(i)));
    return sprCache[key];
  }

  // Monuments : un par région
  var HUT = ['.......kk.......', '......kRRk......', '.....kRRRRk.....', '....kRRrRRRk....', '...kRRRRRrRRk...', '..kRRrRRRRRRRk..', '.kkkkkkkkkkkkkk.',
    '...kWWWWWWWWk...', '...kWkkWWyyWk...', '...kWkkWWyyWk...', '...kWkkWWWWWk...', '..kkkkkkkkkkkk..', '...k.k....k.k...', '...k.k....k.k...', '.~~~~~~~~~~~~~~.'];
  var CAVE = ['......kkkkk.......', '....kkLLLllkk.....', '...kLLllllllsk....', '..kLllkkkkllssk...', '.kLllkKKKKkllssk..', 'kLlllkKKKKklllssk.', 'kllllkKKKKkllsssk.', 'kkkkkkKKKKkkkkkkkk'];
  var TEMPLE = ['.........kkk.........', '........kLyLk........', '.......kkkkkkk.......', '.......kLlKlLk.......', '.....kkkkkkkkkkk.....', '.....kLlLlKlLlLk.....',
    '...kkkkkkkkkkkkkkk...', '...kLlLlLKKKlLlLlk...', '.kkkkkkkkkkkkkkkkkkk.', '.kLlLlLlLKKKLlLlLlLk.', 'kkkkkkkkkkkkkkkkkkkkk', '~~~~~~~~~~~~~~~~~~~~~'];
  var landmarks = null;
  function buildLandmarks() {
    var lag = palOf(1);
    var bigTree = document.createElement('canvas');
    bigTree.width = 20; bigTree.height = 18;
    var bt = bigTree.getContext('2d');
    bt.imageSmoothingEnabled = false;
    bt.drawImage(sprite(SPR.tree, lag), 0, 0, 20, 18);
    [[5, 4], [12, 3], [8, 8], [15, 9], [3, 10]].forEach(function (p) { bt.fillStyle = '#fff6b0'; bt.fillRect(p[0], p[1], 1, 1); });
    var bigWillow = document.createElement('canvas');
    bigWillow.width = 24; bigWillow.height = 22;
    var bw = bigWillow.getContext('2d');
    bw.imageSmoothingEnabled = false;
    bw.drawImage(sprite(SPR.willow, palOf(2)), 0, 0, 24, 22);
    landmarks = [
      sprite(HUT, { k: K, R: '#b08a3a', r: '#8a6f1f', W: '#7a5634', y: '#f3d27a', '~': '#4f7a5a' }),
      bigTree,
      bigWillow,
      sprite(CAVE, { k: K, L: '#6a6a80', l: '#4a4a5e', s: '#34344a', K: '#05070a' }),
      sprite(TEMPLE, { k: K, L: '#b8b49a', l: '#8a866e', K: '#1a1c2c', y: '#e0b43a', '~': '#5fb3a0' }),
      null
    ];
  }

  function drawMountains(ctx) {
    [[508, 92, 30], [548, 80, 40], [584, 102, 24], [486, 110, 20], [566, 124, 18]].forEach(function (m) {
      for (var yy = 0; yy < m[2]; yy++) {
        var half = Math.round(yy * 0.95), top = m[1] - m[2] + yy;
        ctx.fillStyle = K; ctx.fillRect(m[0] - half - 1, top, half * 2 + 3, 1);
        ctx.fillStyle = '#8a8578'; ctx.fillRect(m[0] - half, top, half + 1, 1);
        ctx.fillStyle = '#6b6556'; ctx.fillRect(m[0] + 1, top, half, 1);
        if (yy < m[2] * 0.32) {
          ctx.fillStyle = '#f4f4e8'; ctx.fillRect(m[0] - half, top, half + 1, 1);
          ctx.fillStyle = '#c8ccd6'; ctx.fillRect(m[0] + 1, top, half, 1);
        } else if (yy < m[2] * 0.42 && (yy + m[0]) % 2) {
          ctx.fillStyle = '#f4f4e8'; ctx.fillRect(m[0] - half + (yy % 3), top, 2, 1);
        }
      }
    });
    // le nid du Héron, sur le plus haut pic
    ctx.fillStyle = K; ctx.fillRect(543, 38, 11, 4);
    ctx.fillStyle = '#8a6f1f'; ctx.fillRect(544, 39, 9, 2);
    ctx.fillStyle = '#e8ecf0'; ctx.fillRect(548, 33, 2, 6); ctx.fillRect(549, 31, 3, 2);
    ctx.fillStyle = '#e0b43a'; ctx.fillRect(552, 32, 2, 1);
  }

  function drawCompass(ctx, cx, cy) {
    ctx.fillStyle = '#1a1c2c'; ctx.fillRect(cx - 1, cy - 12, 3, 25); ctx.fillRect(cx - 12, cy - 1, 25, 3);
    ctx.fillStyle = '#e0b43a'; ctx.fillRect(cx, cy - 11, 1, 23); ctx.fillRect(cx - 11, cy, 23, 1);
    ctx.fillStyle = '#f3e2a8'; ctx.fillRect(cx - 1, cy - 1, 3, 3);
    ctx.fillStyle = '#c9412f'; ctx.fillRect(cx, cy - 11, 1, 4);
  }

  // ---------- Rendu ----------
  var cache = null, texCache = null;
  function render(unlocked) {
    var key = unlocked.join(',');
    if (cache && cache.key === key) return cache;
    if (!texCache) texCache = BIOMES.map(function (_, i) { return biomeTexture(i); });
    if (!landmarks) buildLandmarks();
    var open = function (k) { return unlocked.indexOf(k) >= 0; };
    var peek = unlocked.length < REGIONS.length ? Math.max.apply(null, unlocked) + 1 : -1;

    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var img = ctx.createImageData(W, H), d = img.data;
    var field = new Float32Array(W * H), owner = new Uint8Array(W * H);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { field[y * W + x] = landField(x, y); owner[y * W + x] = nearest(x, y); }

    var put = function (p, rgb) { d[p] = rgb[0]; d[p + 1] = rgb[1]; d[p + 2] = rgb[2]; d[p + 3] = 255; };
    var SEA = [hex('#0f2430'), hex('#15323f')], SHALLOW = [hex('#1f4a55'), hex('#2a5d66')], FOAM = hex('#cfe8e0');
    var SAND = hex('#c9b47a'), SAND2 = hex('#a8925a');

    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        var i = y * W + x, p = i * 4, f = field[i], by = BAYER[y % 4][x % 4];
        if (f > 3) {
          if (f < 5 && (x + y * 3) % 7 < 4) { put(p, FOAM); continue; }
          if (f < 18) { put(p, (f - 3) / 15 * 16 > by ? SHALLOW[0] : SHALLOW[1]); continue; }
          put(p, Math.min(1, (f - 18) / 40) * 16 > by ? SEA[0] : SEA[1]);
          continue;
        }
        if (f > 0) { put(p, f > 1.6 ? SAND : SAND2); continue; }
        var k = owner[i], t = texCache[k];
        var rgb = [t[p], t[p + 1], t[p + 2]];
        // frontières entre régions : une lisière plus sombre
        if ((x + 1 < W && owner[i + 1] !== k) || (y + 1 < H && owner[i + W] !== k)) rgb = rgb.map(function (v) { return Math.round(v * 0.55); });
        // ombre de la côte
        if (f > -2.5) rgb = rgb.map(function (v) { return Math.round(v * 0.8); });
        put(p, rgb);
      }
    }
    ctx.putImageData(img, 0, 0);

    // vaguelettes et rochers en mer
    for (var n = 0; n < 160; n++) {
      var wx = Math.floor(hash(n, 1, 3) * W), wy = Math.floor(hash(n, 2, 3) * H), wf = landField(wx, wy);
      if (wf > 24) { ctx.fillStyle = '#2a5d66'; ctx.fillRect(wx, wy, 4, 1); ctx.fillRect(wx + 1, wy - 1, 2, 1); }
      else if (wf > 8 && wf < 14 && n % 5 === 0) ctx.drawImage(spr('rock', 0), wx - 3, wy - 4);
    }

    // les sentiers, sous les décors
    for (var tr = 0; tr < TRAILS.length; tr++) drawTrail(ctx, tr);

    // décors dispersés, rangés du fond vers l'avant
    var props = [];
    for (n = 0; n < 2600; n++) {
      var px = Math.floor(hash(n, 7, 91) * W), py = Math.floor(hash(n, 8, 91) * H);
      if (landField(px, py) > -5) continue;
      var k2 = nearest(px, py), lm2 = TRAILS[k2].landmark;
      if (pathDist(px, py) < 10) continue;
      if (Math.abs(px - lm2.x) < 26 && py > lm2.y - 30 && py < lm2.y + 22) continue; // place du monument et de son étiquette
      var list = DECOR[k2];
      props.push({ x: px, y: py, img: spr(list[Math.floor(hash(n, 9, 91) * list.length)], k2) });
    }
    props.sort(function (a, b) { return a.y - b.y; });
    props.forEach(function (o) { ctx.drawImage(o.img, o.x - (o.img.width >> 1), o.y - o.img.height); });

    // monuments
    drawMountains(ctx);
    TRAILS.forEach(function (t, k) {
      var lm = landmarks[k];
      if (lm) ctx.drawImage(lm, Math.round(t.landmark.x) - (lm.width >> 1), Math.round(t.landmark.y) + 4 - lm.height);
    });

    // ---------- La brume ----------
    img = ctx.getImageData(0, 0, W, H); d = img.data;
    // clear[i] > 0 : la brume est levée. On mesure la distance à la frontière des terres fermées,
    // déformée par du bruit pour que les nuages aient des bords ronds et irréguliers.
    var reach = function (o) { return o === peek ? 62 : 6; };
    var locked = REGIONS.map(function (_, k) { return k; }).filter(function (k) { return !open(k); });
    var clear = new Float32Array(W * H);
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        i = y * W + x;
        var o = owner[i], cl = 1e9;
        if (!locked.length) { clear[i] = cl; continue; }
        if (open(o)) locked.forEach(function (l) { cl = Math.min(cl, reach(l) - pastBorder(x, y, o, l)); });
        else { var dist = 1e9; unlocked.forEach(function (u) { dist = Math.min(dist, pastBorder(x, y, u, o)); }); cl = reach(o) - dist; }
        clear[i] = cl + (vnoise(x, y, 26, 77) - 0.5) * 44 + (vnoise(x, y, 9, 78) - 0.5) * 16;
      }
    }
    var CLOUD = [hex('#a2a8b8'), hex('#c4c8d3'), hex('#e0e3e9'), hex('#f3f4f6')], RIM = hex('#ffffff');
    var minX = W, minY = H, maxX = 0, maxY = 0;
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        i = y * W + x; p = i * 4;
        if (clear[i] > 0) {
          if (field[i] <= 0) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
          // ombre portée par les nuages (lumière venant du haut à gauche)
          var sx = x - 5, sy = y - 7;
          if (sx >= 0 && sy >= 0 && clear[sy * W + sx] <= 0) { d[p] *= 0.6; d[p + 1] *= 0.6; d[p + 2] *= 0.68; }
          continue;
        }
        // relief des nuages : pente du bruit éclairée depuis le haut à gauche
        var lvl = 2.5 + (vnoise(x, y, 28, 81) - vnoise(x + 5, y + 6, 28, 81)) * 8 + (vnoise(x, y, 70, 82) - 0.5) * 1.2;
        if (y + 4 < H && clear[i + 4 * W] > 0) lvl -= 1.6; // dessous des nuages plus sombre
        var col = CLOUD[Math.max(0, Math.min(3, Math.floor(lvl)))];
        if (y >= 2 && clear[i - 2 * W] > 0) col = RIM;
        put(p, col);
      }
    }
    ctx.putImageData(img, 0, 0);

    // cadrage : tout ce qui est découvert, au format de la carte
    var view = { x: 0, y: 0, w: W, h: H };
    if (peek >= 0) {
      var pad = 28, vw = Math.max(300, maxX - minX + pad * 2), vh = Math.max(maxY - minY + pad * 2, vw / 1.6);
      vw = Math.max(vw, vh * 1.6); vh = vw / 1.6;
      if (vw > W) { vw = W; vh = H; }
      var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      view = { w: Math.round(vw), h: Math.round(vh) };
      view.x = Math.round(Math.max(0, Math.min(W - view.w, cx - view.w / 2)));
      view.y = Math.round(Math.max(0, Math.min(H - view.h, cy - view.h / 2)));
    }
    var peekAt = null;
    if (peek >= 0) {
      var A = REGIONS[peek - 1], B = REGIONS[peek], L = Math.hypot(B.x - A.x, B.y - A.y), tt = 0.5 + 44 / L;
      peekAt = { x: A.x + (B.x - A.x) * tt, y: A.y + (B.y - A.y) * tt };
    }

    cache = { key: key, canvas: c, view: view, peek: peek, peekAt: peekAt };
    return cache;
  }

  return { W: W, H: H, REGIONS: REGIONS, TRAILS: TRAILS, render: render, drawCompass: drawCompass };
})();
