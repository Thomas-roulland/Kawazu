// Les cartes du monde, en pixel art : des terres entourées d'eau, découpées en régions (une par biome), reliées par
// un sentier. Chaque région est peinte avec les tuiles de son biome, ses décors et son monument. Les terres pas encore
// ouvertes restent sous la brume : on n'aperçoit qu'un bout de la prochaine, et la vue se recadre sur ce qui a été
// découvert. Deux cartes : l'Île du départ (six régions, du Marais-Brume au Sommet du Héron) et le Continent (seize
// régions, de la Plaine des Vents au Trône de l'Orage). makeWorldMap fabrique l'une ou l'autre à partir de sa description.
var MAP_K = '#10170f';
var MAP_SPR = {
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
  grass: ['g.G.g', '.gGg.', '..d..'],
  // le Continent
  cactus: ['..kk...', '.kgGk..', 'kkgGk..', 'kGgGkkk', 'kkgGkGk', '.kgGggk', '.kgGkkk', '.kgGk..', '.kkkk..'],
  bones: ['k.....k', 'wk...kw', '.wkkkw.', '..www..', '.wkkkw.', 'wk...kw'],
  tomb: ['.kkk.', 'kLLLk', 'kLkLk', 'kkkkk', 'kLLDk', 'kLLDk', 'kkkkk'],
  banner: ['kk....', 'kbkkkk', 'kbRRRk', 'kbRyRk', 'kbRRRk', 'kbkRkR', 'kb....', 'kb....', 'kk....'],
  deadtree: ['k..k..k', '.k.k.k.', '..kbk..', '.k.bk..', '...bk..', '...bk..', '..kbbk.'],
  lavarock: ['..kkk..', '.kDLDk.', 'kDyDDDk', 'kDDyLDk', '.kkkkk.'],
  flower: ['.R.R.', 'RRyRR', '.RRR.', '..g..', '.gg..', '..gg.', '..g..'],
  cloudp: ['...wwww..', '.wwwwwwww', 'wwwwwwwww', '.kkkkkkk.'],
  palm: ['gg.k.gg', '.ggkgg.', 'gg.b.gg', '...b...', '...b...', '...bk..', '..kbbk.'],
  thorn: ['.d..d.', 'dRd.dR', '.ddRd.', 'd.dd.d', '.dRdd.', '..dd..'],
  sword: ['..k..', '.kLk.', '.kLk.', '.kLk.', '.kLk.', 'kyyyk', '..b..', '..b..']
};
var MAP_FIXED = { // les décors qui gardent leurs couleurs, quelle que soit la région
  rock: { k: MAP_K, L: '#b0ae9e', l: '#85836f', s: '#5a594c' },
  pine: { k: MAP_K, g: '#3a6a4a', d: '#24452f', w: '#f4f4e8', b: '#4a3322' },
  cactus: { k: MAP_K, g: '#3a7a2a', G: '#6ab04a' },
  bones: { k: MAP_K, w: '#f0ecdc' },
  tomb: { k: MAP_K, L: '#9a9aa2', D: '#5a5a62' },
  banner: { k: MAP_K, b: '#6e4a2a', R: '#c9412f', y: '#e0b43a' },
  deadtree: { k: MAP_K, b: '#5a4a3a' },
  lavarock: { k: MAP_K, D: '#2a2230', L: '#4a3a50', y: '#ff8a2a' },
  flower: { k: MAP_K, R: '#f0a0e0', y: '#fff6a0', g: '#3a8a4a' },
  cloudp: { k: '#a8b8d0', w: '#ffffff' },
  palm: { k: MAP_K, g: '#3a9a3a', b: '#6e4a2a' },
  thorn: { k: MAP_K, d: '#3a2a2a', R: '#c0406a' },
  sword: { k: MAP_K, L: '#d0d4dc', y: '#e0b43a', b: '#6e4a2a' }
};

function makeWorldMap(cfg) {
  var W = cfg.W, H = cfg.H, YS = 1.15, REGIONS = cfg.regions, FIRST = cfg.first;
  var BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  var K = MAP_K;
  var biomeOf = function (i) { return BIOMES[FIRST + i]; };

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
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
  var blobs = REGIONS.map(function (r) { return { x: r.x, y: r.y, r: cfg.radius || 88 }; });
  for (var bi = 1; bi < REGIONS.length; bi++) {
    blobs.push({ x: (REGIONS[bi].x + REGIONS[bi - 1].x) / 2, y: (REGIONS[bi].y + REGIONS[bi - 1].y) / 2, r: cfg.bridge || 60 });
  }
  (cfg.blobs || []).forEach(function (b) { blobs.push(b); });
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
  // Un sentier par région : il entre par la frontière de la région précédente (la plage pour la première),
  // serpente jusqu'à l'antre du boss et ressort vers la région suivante. Les 10 étapes sont posées dessus.
  var START = cfg.start, NEST = cfg.nest;
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
  function pathDist(x, y) {
    var d = 1e9;
    for (var i = 0; i < TRAILS.length; i++) {
      var pts = TRAILS[i].pts;
      for (var k = 0; k < pts.length; k += 3) { var dd = Math.abs(pts[k].x - x) + Math.abs(pts[k].y - y); if (dd < d) d = dd; }
    }
    return d;
  }
  // Sentier en terre battue (ou en planches), avec une clairière à chaque étape
  function drawTrail(ctx, i) {
    var tr = TRAILS[i], P = cfg.trailPal[i], R = Math.round;
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
    var b = cfg.texture ? cfg.texture(i, biomeOf(i)) : biomeOf(i), w = W / TILE, h = Math.ceil(H / TILE), tiles = new Uint8Array(w * h);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var n = vnoise(x, y, 4, (FIRST + i) * 31 + 3), r = hash(x, y, (FIRST + i) * 13 + 1);
        tiles[y * w + x] = b.water && n < 0.26 ? RT.WATER : (r < 0.035 ? RT.BLOCK : (n > 0.66 && r < 0.55 ? RT.BUSH : (r < 0.22 ? RT.ALT : RT.FLOOR)));
      }
    }
    var c = renderMap({ biome: b, w: w, h: h, tiles: tiles, seed: (FIRST + i) * 7 });
    return c.getContext('2d').getImageData(0, 0, W, H).data;
  }

  // ---------- Décors ----------
  function palOf(i) {
    var P = biomeOf(i).pal;
    return { k: K, g: P.bush, G: P.bushLight, d: P.bushDark, b: '#4a3322', c: '#7a4a2a', y: '#f3e27a', w: '#f4f4e8',
      B: P.block, L: P.blockLight, D: P.blockDark, R: '#c9412f' };
  }
  var sprCache = {};
  function spr(name, i) {
    var key = name + i;
    if (!sprCache[key]) sprCache[key] = sprite(MAP_SPR[name], MAP_FIXED[name] || palOf(i));
    return sprCache[key];
  }
  var landmarks = null;

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
    if (!texCache) texCache = REGIONS.map(function (_, i) { return biomeTexture(i); });
    if (!landmarks) landmarks = cfg.landmarks ? cfg.landmarks({ sprite: sprite, palOf: palOf }) : [];
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
    for (var n = 0; n < 160 * (W * H) / 256000; n++) {
      var wx = Math.floor(hash(n, 1, 3) * W), wy = Math.floor(hash(n, 2, 3) * H), wf = landField(wx, wy);
      if (wf > 24) { ctx.fillStyle = '#2a5d66'; ctx.fillRect(wx, wy, 4, 1); ctx.fillRect(wx + 1, wy - 1, 2, 1); }
      else if (wf > 8 && wf < 14 && n % 5 === 0) ctx.drawImage(spr('rock', 0), wx - 3, wy - 4);
    }

    // les sentiers, sous les décors
    for (var tr = 0; tr < TRAILS.length; tr++) drawTrail(ctx, tr);

    // décors dispersés, rangés du fond vers l'avant
    var props = [];
    for (n = 0; n < 2600 * (cfg.density || 1) * (W * H) / 256000; n++) {
      var px = Math.floor(hash(n, 7, 91) * W), py = Math.floor(hash(n, 8, 91) * H);
      if (landField(px, py) > -5) continue;
      var k2 = nearest(px, py), lm2 = TRAILS[k2].landmark;
      if (pathDist(px, py) < 10) continue;
      if (Math.abs(px - lm2.x) < 26 && py > lm2.y - 30 && py < lm2.y + 22) continue; // place du monument et de son étiquette
      var list = cfg.decor[k2];
      props.push({ x: px, y: py, img: spr(list[Math.floor(hash(n, 9, 91) * list.length)], k2) });
    }
    props.sort(function (a, b) { return a.y - b.y; });
    props.forEach(function (o) { ctx.drawImage(o.img, o.x - (o.img.width >> 1), o.y - o.img.height); });

    // reliefs et monuments
    if (cfg.mountains) cfg.mountains(ctx, TRAILS);
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
    if (peek > 0) {
      var A = REGIONS[peek - 1], B = REGIONS[peek], L = Math.hypot(B.x - A.x, B.y - A.y), tt = 0.5 + 44 / L;
      peekAt = { x: A.x + (B.x - A.x) * tt, y: A.y + (B.y - A.y) * tt };
    }

    cache = { key: key, canvas: c, view: view, peek: peek, peekAt: peekAt };
    return cache;
  }

  return { W: W, H: H, FIRST: FIRST, REGIONS: REGIONS, TRAILS: TRAILS, render: render, drawCompass: drawCompass };
}

// ---------- L'Île du départ ----------
var WorldMap = makeWorldMap({
  W: 640, H: 400, first: 0,
  regions: [{ x: 120, y: 300 }, { x: 290, y: 322 }, { x: 196, y: 190 }, { x: 350, y: 176 }, { x: 490, y: 270 }, { x: 530, y: 96 }],
  blobs: [{ x: 60, y: 230, r: 34 }, { x: 420, y: 350, r: 40 }, { x: 600, y: 190, r: 30 }, { x: 440, y: 60, r: 36 }],
  start: { x: 60, y: 318 }, nest: { x: 548, y: 50 },
  trailPal: [
    { e: '#3a2c18', f: '#8a6a3a', l: '#b08a52' },
    { e: '#2a1c10', f: '#8a6038', l: '#b0844e', planks: true },
    { e: '#34240f', f: '#7a5a30', l: '#a07a44' },
    { e: '#23232e', f: '#6e6e80', l: '#9a9aac' },
    { e: '#2a3034', f: '#9a9680', l: '#c8c4aa', planks: true },
    { e: '#55544a', f: '#d8d4c8', l: '#f4f4ec' }
  ],
  decor: [
    ['tree', 'tree', 'reeds', 'reeds', 'grass'],
    ['glow', 'reeds', 'glow', 'tree', 'grass'],
    ['willow', 'willow', 'mushroom', 'tree', 'grass'],
    ['rock', 'crystal', 'crystal', 'rock', 'stub'],
    ['pillar', 'stub', 'rock', 'glow', 'grass'],
    ['pine', 'pine', 'rock', 'rock', 'grass']
  ],
  // le Sommet : de la roche plutôt que des dalles
  texture: function (i, b) { return i === 5 ? Object.assign({}, b, { wall: 'rock' }) : b; },
  landmarks: function (m) {
    var K = MAP_K, lag = m.palOf(1);
    var bigTree = document.createElement('canvas');
    bigTree.width = 20; bigTree.height = 18;
    var bt = bigTree.getContext('2d');
    bt.imageSmoothingEnabled = false;
    bt.drawImage(m.sprite(MAP_SPR.tree, lag), 0, 0, 20, 18);
    [[5, 4], [12, 3], [8, 8], [15, 9], [3, 10]].forEach(function (p) { bt.fillStyle = '#fff6b0'; bt.fillRect(p[0], p[1], 1, 1); });
    var bigWillow = document.createElement('canvas');
    bigWillow.width = 24; bigWillow.height = 22;
    var bw = bigWillow.getContext('2d');
    bw.imageSmoothingEnabled = false;
    bw.drawImage(m.sprite(MAP_SPR.willow, m.palOf(2)), 0, 0, 24, 22);
    var HUT = ['.......kk.......', '......kRRk......', '.....kRRRRk.....', '....kRRrRRRk....', '...kRRRRRrRRk...', '..kRRrRRRRRRRk..', '.kkkkkkkkkkkkkk.',
      '...kWWWWWWWWk...', '...kWkkWWyyWk...', '...kWkkWWyyWk...', '...kWkkWWWWWk...', '..kkkkkkkkkkkk..', '...k.k....k.k...', '...k.k....k.k...', '.~~~~~~~~~~~~~~.'];
    var CAVE = ['......kkkkk.......', '....kkLLLllkk.....', '...kLLllllllsk....', '..kLllkkkkllssk...', '.kLllkKKKKkllssk..', 'kLlllkKKKKklllssk.', 'kllllkKKKKkllsssk.', 'kkkkkkKKKKkkkkkkkk'];
    var TEMPLE = ['.........kkk.........', '........kLyLk........', '.......kkkkkkk.......', '.......kLlKlLk.......', '.....kkkkkkkkkkk.....', '.....kLlLlKlLlLk.....',
      '...kkkkkkkkkkkkkkk...', '...kLlLlLKKKlLlLlk...', '.kkkkkkkkkkkkkkkkkkk.', '.kLlLlLlLKKKLlLlLlLk.', 'kkkkkkkkkkkkkkkkkkkkk', '~~~~~~~~~~~~~~~~~~~~~'];
    return [
      m.sprite(HUT, { k: K, R: '#b08a3a', r: '#8a6f1f', W: '#7a5634', y: '#f3d27a', '~': '#4f7a5a' }),
      bigTree,
      bigWillow,
      m.sprite(CAVE, { k: K, L: '#6a6a80', l: '#4a4a5e', s: '#34344a', K: '#05070a' }),
      m.sprite(TEMPLE, { k: K, L: '#b8b49a', l: '#8a866e', K: '#1a1c2c', y: '#e0b43a', '~': '#5fb3a0' }),
      null
    ];
  },
  mountains: function (ctx) {
    var K = MAP_K;
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
});

// ---------- Le Continent ----------
// Seize régions en lacets, du rivage de la Plaine des Vents (en bas à gauche) au Trône de l'Orage (en haut à gauche).
var ContinentMap = makeWorldMap({
  W: 960, H: 624, first: ISLAND_WORLDS, radius: 89, bridge: 60, density: 1.35,
  regions: [
    { x: 134, y: 538 }, { x: 334, y: 554 }, { x: 542, y: 528 }, { x: 754, y: 547 },
    { x: 840, y: 403 }, { x: 648, y: 384 }, { x: 446, y: 403 }, { x: 235, y: 384 },
    { x: 132, y: 245 }, { x: 324, y: 228 }, { x: 528, y: 247 }, { x: 734, y: 235 },
    { x: 840, y: 98 }, { x: 638, y: 84 }, { x: 432, y: 101 }, { x: 223, y: 84 }
  ],
  blobs: [{ x: 48, y: 456, r: 41 }, { x: 924, y: 300, r: 36 }, { x: 36, y: 156, r: 38 }, { x: 924, y: 504, r: 31 }],
  start: { x: 36, y: 569 }, nest: { x: 96, y: 53 },
  trailPal: [
    { e: '#3a2c18', f: '#a88a4a', l: '#d0b070' }, { e: '#2a2018', f: '#6a5a44', l: '#8a7a60' },
    { e: '#221810', f: '#5a4430', l: '#7a6044' }, { e: '#8a6a3a', f: '#f0dcb0', l: '#fff4d8' },
    { e: '#4a1a0c', f: '#b06a44', l: '#d08a60' }, { e: '#5a7a9a', f: '#e8f0f8', l: '#ffffff' },
    { e: '#100808', f: '#4a3430', l: '#6a4a40' }, { e: '#16161c', f: '#6a6a72', l: '#8a8a92' },
    { e: '#1a1a3a', f: '#6a6aa0', l: '#9a9ad0' }, { e: '#8a9ab8', f: '#ffffff', l: '#ffffff', planks: true },
    { e: '#1a2a12', f: '#6a5a32', l: '#8a7a44' }, { e: '#0a0908', f: '#4a4038', l: '#6a5a4a', planks: true },
    { e: '#22222a', f: '#8a8a94', l: '#b0b0b8' }, { e: '#050208', f: '#4a2a7a', l: '#8a5ad0', planks: true },
    { e: '#2a1a0c', f: '#a8844a', l: '#d0a860' }, { e: '#0e1018', f: '#5a6078', l: '#8a94b0' }
  ],
  decor: [
    ['tree', 'grass', 'grass', 'rock', 'flower'], ['sword', 'banner', 'rock', 'deadtree', 'grass'],
    ['deadtree', 'thorn', 'thorn', 'tree', 'grass'], ['cactus', 'cactus', 'bones', 'rock', 'grass'],
    ['rock', 'rock', 'cactus', 'bones', 'grass'], ['pine', 'pine', 'rock', 'crystal', 'grass'],
    ['lavarock', 'lavarock', 'rock', 'deadtree', 'grass'], ['tomb', 'tomb', 'deadtree', 'glow', 'grass'],
    ['mushroom', 'mushroom', 'flower', 'glow', 'willow'], ['cloudp', 'cloudp', 'pillar', 'stub', 'grass'],
    ['palm', 'palm', 'tree', 'flower', 'grass'], ['rock', 'crystal', 'crystal', 'stub', 'rock'],
    ['banner', 'pillar', 'stub', 'rock', 'sword'], ['crystal', 'crystal', 'glow', 'rock', 'stub'],
    ['bones', 'bones', 'rock', 'lavarock', 'grass'], ['pillar', 'stub', 'crystal', 'rock', 'glow']
  ],
  // les monuments : un moulin, une tour brisée, une pyramide, un château, un crâne de dragon, la flèche de l'orage
  landmarks: function (m) {
    var K = MAP_K, out = [];
    out[0] = m.sprite(['......k.....', '..k...k...k.', '...k..k..k..', '....k.k.k...', 'kkkkkkWkkkkk', '....kWWWk...', '...kWWWWWk..', '...kWkkWWk..', '...kWkkWWk..', '..kkWWWWWkk.', '..kWWWWWWWk.', '..kkkkkkkkk.'],
      { k: K, W: '#d8cfb0' });
    out[1] = m.sprite(['..k.kk.k..', '..kkLLkk..', '..kLLlLk..', '..kLlLLk..', '..kLKKLk..', '..kLKKLk..', '..kLllLk..', '.kkLLLlkk.', '.kLlLLllk.', 'kkkkkkkkkk'],
      { k: K, L: '#8a8478', l: '#6a6458', K: '#1a1c2c' });
    out[3] = m.sprite(['.......kk.......', '......kLlk......', '.....kLLllk.....', '....kLLLlllk....', '...kLLLLllllk...', '..kLLLKKKllllk..', '.kLLLLKKKlllllk.', 'kkkkkkkkkkkkkkkk'],
      { k: K, L: '#f0d498', l: '#c8a468', K: '#3a2410' });
    out[12] = m.sprite(['k.k.......k.k', 'kkk..kkk..kkk', 'kLk.kLlLk.kLk', 'kLkkkLlLkkkLk', 'kLLLLlKlLLLLk', 'kLLlLKKKLlLLk', 'kLLLLKKKLLLLk', 'kkkkkkkkkkkkk'],
      { k: K, L: '#8a8a94', l: '#6a6a74', K: '#1a1c2c' });
    out[14] = m.sprite(['..kkkkkk.....', '.kwwwwwwk....', 'kwwkkwwwwkk..', 'kwwkkwwwwwwk.', 'kwwwwwwwkwwwk', '.kwwwwwkwkwk.', '..kkwwk.k.k..', '....kk.......'],
      { k: K, w: '#f0ecdc' });
    out[15] = m.sprite(['.....y.....', '....kyk....', '....kLk....', '...kLlLk...', '...kLlLk...', '..kLLlLLk..', '..kLlKlLk..', '.kLLlKlLLk.', '.kLllKllLk.', 'kkkkkkkkkkk'],
      { k: K, L: '#4a5068', l: '#343a50', K: '#6af0ff', y: '#f0f040' });
    return out;
  },
  // un volcan qui fume au-dessus de sa région, et les pics gelés de la toundra
  mountains: function (ctx, T) {
    var K = MAP_K, cone = function (mx, my, hgt, lit, dark, snow) {
      for (var yy = 0; yy < hgt; yy++) {
        var half = Math.round(yy * 0.9), top = my - hgt + yy;
        ctx.fillStyle = K; ctx.fillRect(mx - half - 1, top, half * 2 + 3, 1);
        ctx.fillStyle = lit; ctx.fillRect(mx - half, top, half + 1, 1);
        ctx.fillStyle = dark; ctx.fillRect(mx + 1, top, half, 1);
        if (snow && yy < hgt * 0.3) { ctx.fillStyle = '#f4f4e8'; ctx.fillRect(mx - half, top, half * 2 + 1, 1); }
      }
    };
    var v = T[6].landmark;
    cone(Math.round(v.x), Math.round(v.y) + 2, 26, '#5a3a30', '#3a2420', false);
    ctx.fillStyle = '#ff6a1a'; ctx.fillRect(Math.round(v.x) - 2, Math.round(v.y) - 24, 5, 2);
    ctx.fillStyle = '#ffd040'; ctx.fillRect(Math.round(v.x) - 1, Math.round(v.y) - 25, 3, 1);
    [[-6, -30], [-3, -34], [1, -38], [-2, -42]].forEach(function (s, k) { ctx.fillStyle = k % 2 ? '#8a8a8a' : '#6a6a6a'; ctx.fillRect(Math.round(v.x) + s[0], Math.round(v.y) + s[1], 4, 3); });
    var t = T[5].landmark;
    [[-14, 6, 22], [0, 0, 30], [14, 8, 20]].forEach(function (p) { cone(Math.round(t.x) + p[0], Math.round(t.y) + p[1], p[2], '#9ab0c0', '#6a8098', true); });
  }
});

// ---------- L'Île des Colosses ----------
// Trois régions immenses : la Forêt des Géants (au sud-ouest, où l'on débarque), la Forge des Titans (au nord, sous
// son volcan) et l'Abîme des Léviathans (à l'est, autour d'un tourbillon).
var ColossesMap = makeWorldMap({
  W: 720, H: 448, first: COLOSSES_FROM, radius: 138, bridge: 84, density: 1.4,
  regions: [{ x: 178, y: 300 }, { x: 372, y: 150 }, { x: 566, y: 292 }],
  blobs: [{ x: 60, y: 120, r: 34 }, { x: 680, y: 90, r: 30 }, { x: 360, y: 400, r: 38 }],
  start: { x: 54, y: 404 }, nest: { x: 600, y: 330 },
  trailPal: [
    { e: '#2a1c10', f: '#7a5a34', l: '#a8844e' },
    { e: '#1a0c08', f: '#5a3a30', l: '#ff8a3a' },
    { e: '#0a1a22', f: '#c8d8d0', l: '#ffffff', planks: true }
  ],
  decor: [
    ['tree', 'tree', 'pine', 'willow', 'grass'],
    ['lavarock', 'lavarock', 'rock', 'pillar', 'stub'],
    ['crystal', 'bones', 'glow', 'rock', 'stub']
  ],
  // les monuments : l'arbre-roi, la tête du titan forgeron, le crâne du léviathan
  landmarks: function (m) {
    var K = MAP_K;
    return [
      m.sprite(['.......kkkkkk.......', '....kkkGGLLGGkkk....', '..kkGGLLLGGGGGGGkk..', '.kGGGLLGGGGgGGGGGGk.', 'kGGGGGGGGGGGGGgGGGGk', 'kGgGGGGGGLGGGGGGGgGk', 'kGGGGgGGGGGGGgGGGGGk',
        '.kGGGGGGGGgGGGGGGGk.', '..kkgGGGGGGGGGGgkk..', '....kkkk2222kkkk....', '.......k2322k.......', '.......k2222k.......', '.......k2322k.......', '......k223222k......', '....kk22222222kk....', '...k22k2k22k2k22k...'],
        { k: K, G: '#3a7a2a', L: '#7ac04a', g: '#22501a', 2: '#6a4a2a', 3: '#9a7444' }),
      m.sprite(['....kkkkkkkk....', '...kMMMMMMMMk...', '..kMMMkkkkMMMk..', '..kMMkwwwwkMMk..', '..kMMkwrrwkMMk..', '..kMMkwwwwkMMk..', '..kMMMkkkkMMMk..', '..kMMMMMMMMMMk..', '..kMkkkkkkkkMk..', '..kMkwkwkwkkMk..', '...kMMMMMMMMk...', '..kkkkkkkkkkkk..'],
        { k: K, M: '#7a7a9a', w: '#f4f4e8', r: '#ff5a1a' }),
      m.sprite(['..kkkkkkk...........', '.kwwwwwwwkk.........', 'kwwkkwwwwwwkkkkkkk..', 'kwwkkwwwwwwwwwwwwwk.', 'kwwwwwwwkkwwwwwwwwwk', '.kwwwwwk..kkwkwkwkwk', '..kkwwk....k.k.k.k.k', '....kk..............'],
        { k: K, w: '#e8e4d0' })
    ];
  },
  // des arbres géants autour de la forêt, le cône de la forge qui crache du feu, et le tourbillon de l'abîme
  mountains: function (ctx, T) {
    var K = MAP_K, R = function (x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    var bigTree = function (x, y, s) {
      R(x - 2 * s, y - 2, 4 * s, 10 * s, K); R(x - 2 * s + 1, y - 2, 4 * s - 2, 10 * s - 1, '#5a3a20');
      for (var dy = -7 * s; dy <= 3 * s; dy++) { var hw = Math.round(Math.sqrt(Math.max(0, 1 - Math.pow(dy / (7 * s), 2))) * 8 * s); R(x - hw - 1, y - 6 * s + dy, hw * 2 + 2, 1, K); }
      for (var dy2 = -7 * s + 1; dy2 <= 3 * s - 1; dy2++) { var hw2 = Math.round(Math.sqrt(Math.max(0, 1 - Math.pow(dy2 / (7 * s), 2))) * 8 * s) - 1; R(x - hw2, y - 6 * s + dy2, hw2 * 2, 1, dy2 < -3 * s ? '#5aa03a' : (dy2 < 0 ? '#3a7a2a' : '#2a5a1e')); }
    };
    var f = T[0].landmark;
    [[-62, -30, 2], [58, -40, 2], [-40, 44, 2], [70, 36, 1], [-90, 10, 1], [10, -70, 1]].forEach(function (p) { bigTree(f.x + p[0], f.y + p[1], p[2]); });
    var v = T[1].landmark, vx = Math.round(v.x), vy = Math.round(v.y) - 26;
    for (var yy = 0; yy < 40; yy++) {
      var half = Math.round(6 + yy * 1.1), top = vy - 40 + yy;
      R(vx - half - 1, top, half * 2 + 3, 1, K); R(vx - half, top, half + 1, 1, '#5a3a30'); R(vx + 1, top, half, 1, '#3a2420');
      if (yy < 4) R(vx - 5, top, 11, 1, yy < 2 ? '#ffd040' : '#ff6a1a');
      if (yy > 4 && yy % 7 === 0) R(vx - half + 4 + (yy * 3) % (half * 2 - 6), top, 2, 4, '#ff5a1a'); // des coulées de lave
    }
    [[-6, -48], [-2, -54], [3, -60], [-1, -66]].forEach(function (s, k) { R(vx + s[0], vy + s[1], 6, 4, k % 2 ? '#8a8a8a' : '#5a5a5a'); });
    var n = T[2].stages[STAGES] || T[2].landmark, nx = Math.round(n.x) + 30, ny = Math.round(n.y) + 18;
    for (var a = 0; a < 3; a++) {
      ctx.strokeStyle = ['#4ab0b0', '#2a7a8a', '#a0f0e0'][a]; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(nx, ny, 22 - a * 6, 9 - a * 2.5, 0, 0, Math.PI * 2); ctx.stroke();
    }
    R(nx - 2, ny - 1, 4, 2, '#e0fff8');
  }
});

// la carte de chaque île
ISLES.forEach(function (s) { s.map = { ile: WorldMap, continent: ContinentMap, colosses: ColossesMap }[s.id]; });
