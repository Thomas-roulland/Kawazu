// Dessin des tuiles en pixel art (sol, murs, eau, obstacles, buissons) selon l'environnement.
// Sert de décor aux combats et aux cartes de donjon.

var TILE = 16;
var RT = { FLOOR: 0, WALL: 1, WATER: 2, BLOCK: 3, BUSH: 4, ALT: 6 };

// Hash déterministe par tuile : les variations de dessin restent stables
function hash(x, y, k) {
  var h = (x * 374761393 + y * 668265263 + (k || 0) * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// map = { biome, w, h, tiles (Uint8Array), seed }
function renderMap(map) {
  var c = document.createElement('canvas');
  c.width = map.w * TILE;
  c.height = map.h * TILE;
  var ctx = c.getContext('2d');
  for (var y = 0; y < map.h; y++) for (var x = 0; x < map.w; x++) drawMapTile(ctx, map, x, y);
  return c;
}

function drawMapTile(ctx, map, tx, ty) {
  var biome = map.biome, seed = map.seed;
  var P = biome.pal;
  var ox = tx * TILE, oy = ty * TILE;
  var at = function (x, y) { return x < 0 || y < 0 || x >= map.w || y >= map.h ? RT.WALL : map.tiles[y * map.w + x]; };
  var t = at(tx, ty);
  var h = function (k) { return hash(tx + seed, ty, k); };
  var p = function (x, y, col) { ctx.fillStyle = col; ctx.fillRect(ox + x, oy + y, 1, 1); };
  var rect = function (x, y, w, hh, col) { ctx.fillStyle = col; ctx.fillRect(ox + x, oy + y, w, hh); };

  var ground = function () {
    rect(0, 0, TILE, TILE, P.ground);
    if (biome.wall === 'ruins') {
      // dalles de pierre
      rect(0, 0, TILE, 1, P.groundDark);
      rect(0, 0, 1, TILE, P.groundDark);
      rect(1, 1, 6, 1, P.groundLight);
      if (h(3) < 0.3) { p(5 + Math.floor(h(4) * 6), 6 + Math.floor(h(5) * 6), P.groundDark); p(6 + Math.floor(h(4) * 6), 7 + Math.floor(h(5) * 6), P.groundDark); }
      return;
    }
    for (var i = 0; i < 6; i++) {
      var gx = Math.floor(h(i) * 15), gy = Math.floor(h(i + 9) * 14) + 1;
      p(gx, gy, P.groundLight);
      if (biome.wall === 'reeds' || biome.wall === 'trunks') p(gx, gy - 1, P.groundLight);
    }
    for (var j = 0; j < 4; j++) p(Math.floor(h(j + 20) * 16), Math.floor(h(j + 30) * 16), P.groundDark);
    if (biome.wall === 'rock' && h(40) < 0.25) {
      var cx = 3 + Math.floor(h(41) * 8), cy = 3 + Math.floor(h(42) * 8);
      for (var c2 = 0; c2 < 5; c2++) p(cx + c2, cy + (c2 % 2), P.groundDark);
    }
  };
  var shadowFromWall = function () {
    if (at(tx, ty - 1) === RT.WALL) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(ox, oy, TILE, 3); }
  };

  if (t === RT.FLOOR) {
    ground();
    shadowFromWall();
  } else if (t === RT.ALT) {
    ground();
    if (biome.id === 'marais') { // flaque de vase
      rect(3, 5, 10, 6, P.alt); rect(2, 6, 12, 4, P.alt); rect(4, 6, 4, 1, '#4a4a30');
    } else if (biome.id === 'saules') { // feuilles mortes
      for (var l = 0; l < 7; l++) { var lx = Math.floor(h(l + 50) * 14), ly = Math.floor(h(l + 60) * 14); p(lx, ly, l % 2 ? '#a8641e' : P.alt); p(lx + 1, ly, '#c9842a'); }
    } else if (biome.id === 'grottes') { // pierre bleutée
      rect(2, 3, 12, 10, P.alt); rect(3, 4, 4, 1, P.groundLight);
    } else { // mosaïque dorée
      rect(6, 6, 4, 4, P.accent); rect(7, 7, 2, 2, P.groundLight);
    }
    shadowFromWall();
  } else if (t === RT.WALL) {
    if (biome.wall === 'reeds') {
      rect(0, 0, TILE, TILE, P.wallDark);
      for (var s = 0; s < 6; s++) {
        var sx = s * 3 + Math.floor(h(s + 70) * 2), top = Math.floor(h(s + 80) * 4);
        rect(sx, top, 1, TILE - top, s % 2 ? P.wall : P.wallLight);
        if (h(s + 90) < 0.4) rect(sx, top, 1, 3, P.accent);
      }
    } else if (biome.wall === 'trunks') {
      rect(0, 0, TILE, TILE, P.wall);
      for (var b = 0; b < 4; b++) rect(1 + b * 4 + Math.floor(h(b + 70) * 2), 0, 1, TILE, P.wallDark);
      rect(0, 0, TILE, 2, P.accent);
      if (h(75) < 0.5) rect(Math.floor(h(76) * 10), 2, 4, 2, P.accent);
      rect(2, 5, 1, 4, P.wallLight);
    } else if (biome.wall === 'rock') {
      rect(0, 0, TILE, TILE, P.wall);
      rect(1, 1, 7, 6, P.wallLight); rect(2, 2, 5, 4, P.wall);
      rect(9, 8, 6, 7, P.wallLight); rect(10, 9, 4, 5, P.wall);
      rect(0, 7, TILE, 1, P.wallDark);
      if (h(77) < 0.2) { p(4, 11, '#5fd3e0'); p(5, 12, '#d4fbff'); }
    } else {
      rect(0, 0, TILE, TILE, P.wallDark);
      for (var row = 0; row < 4; row++) {
        var off = row % 2 ? 4 : 0;
        for (var bx = -off; bx < TILE; bx += 8) rect(Math.max(0, bx + 1), row * 4 + 1, Math.min(7, TILE - bx - 1), 3, (row + bx) % 3 ? P.wall : P.wallLight);
      }
    }
    // arête sombre côté sol
    if (at(tx, ty + 1) !== RT.WALL) rect(0, TILE - 1, TILE, 1, '#1a1c2c');
  } else if (t === RT.WATER) {
    rect(0, 0, TILE, TILE, P.water);
    for (var w = 0; w < 3; w++) rect(Math.floor(h(w + 100) * 12), Math.floor(h(w + 110) * 15), 4, 1, P.waterLight);
    var wet = function (x, y) { var v = at(x, y); return v === RT.WATER; };
    if (!wet(tx, ty - 1)) { rect(0, 0, TILE, 1, P.waterEdge); rect(0, 1, TILE, 1, P.waterLight); }
    if (!wet(tx - 1, ty)) rect(0, 0, 1, TILE, P.waterLight);
    if (!wet(tx + 1, ty)) rect(TILE - 1, 0, 1, TILE, P.waterLight);
    if (!wet(tx, ty + 1)) rect(0, TILE - 1, TILE, 1, '#0b120e');
    if (biome.id === 'marais' && h(120) < 0.3) { rect(4, 6, 5, 2, '#4f8a3c'); rect(5, 5, 3, 1, '#6fae52'); }
  } else if (t === RT.BLOCK) {
    ground();
    shadowFromWall();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(ox + 2, oy + 12, 12, 3);
    if (biome.block === 'stump') {
      rect(2, 4, 12, 10, '#1a1c2c'); rect(3, 5, 10, 8, P.block); rect(3, 5, 10, 3, P.blockLight);
      rect(5, 6, 6, 1, P.blockDark); rect(4, 9, 1, 4, P.blockDark); rect(9, 10, 1, 3, P.blockDark);
      rect(2, 12, 2, 2, '#3f5a34');
    } else if (biome.block === 'mushroom') {
      rect(6, 8, 4, 7, '#1a1c2c'); rect(7, 8, 2, 6, '#efe6a8');
      rect(1, 2, 14, 7, '#1a1c2c'); rect(2, 3, 12, 5, P.block); rect(3, 2, 10, 1, '#1a1c2c');
      p(4, 4, P.blockLight); p(5, 4, P.blockLight); p(9, 3, P.blockLight); p(11, 5, P.blockLight); p(7, 6, P.blockLight);
      rect(2, 7, 12, 1, P.blockDark);
    } else if (biome.block === 'crystal') {
      var shard = function (x0, w0, top0) {
        for (var yy = top0; yy < 14; yy++) {
          var half = Math.max(0, Math.round((yy - top0) * w0 / (14 - top0)));
          rect(x0 - half - 1, yy, half * 2 + 3, 1, '#1a1c2c');
          rect(x0 - half, yy, half * 2 + 1, 1, yy < top0 + 3 ? P.blockLight : P.block);
          p(x0 + half, yy, P.blockDark);
        }
      };
      shard(5, 2, 4); shard(10, 3, 1); shard(13, 1, 7);
    } else {
      rect(3, 2, 10, 13, '#1a1c2c'); rect(4, 3, 8, 11, P.block);
      rect(5, 3, 1, 11, P.blockDark); rect(8, 3, 1, 11, P.blockDark); rect(10, 3, 1, 11, P.blockDark);
      rect(3, 2, 10, 2, P.blockLight); rect(9, 1, 3, 1, P.blockLight);
    }
  } else if (t === RT.BUSH) {
    ground();
    shadowFromWall();
    if (biome.bush === 'reeds' || biome.bush === 'drygrass') {
      for (var r = 0; r < 5; r++) {
        var rx = 1 + r * 3 + Math.floor(h(r + 130) * 2), rtop = 1 + Math.floor(h(r + 140) * 5);
        rect(rx, rtop, 1, 16 - rtop, r % 2 ? P.bush : P.bushLight);
        if (biome.bush === 'reeds' && h(r + 150) < 0.5) rect(rx, rtop - 1, 1, 4, '#6e4a2a');
      }
    } else if (biome.bush === 'ferns') {
      for (var f = 0; f < 5; f++) {
        for (var fl = 0; fl < 7; fl++) {
          var fx = 8 + Math.round(Math.cos(-0.6 - f * 0.5) * fl * 1.1), fy = 14 - Math.round(Math.sin(0.6 + f * 0.5) * fl * 1.6);
          p(fx, fy, fl > 4 ? P.bushLight : P.bush);
          if (fl % 2) p(fx + 1, fy, P.bushDark);
        }
      }
    } else {
      rect(2, 7, 12, 8, '#1a1c2c'); rect(3, 8, 10, 6, P.bush); rect(4, 6, 8, 2, P.bush);
      p(5, 8, P.bushLight); p(9, 7, P.bushLight); p(11, 10, P.bushLight); p(7, 11, P.bushLight);
    }
  }
}
