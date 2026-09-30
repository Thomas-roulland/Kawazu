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
    var gs = biome.ground;
    if (gs === 'sand') { // des rides de sable
      for (var sr = 0; sr < 3; sr++) { var sy = 2 + sr * 5 + Math.floor(h(sr + 200) * 2), sx = Math.floor(h(sr + 210) * 6); rect(sx, sy, 6 + Math.floor(h(sr + 220) * 5), 1, P.groundLight); rect(sx + 2, sy + 1, 4, 1, P.groundDark); }
      return;
    }
    if (gs === 'snow') { // la neige, des éclats et quelques creux bleutés
      for (var sn = 0; sn < 5; sn++) p(Math.floor(h(sn + 230) * 16), Math.floor(h(sn + 240) * 16), P.groundLight);
      if (h(250) < 0.4) rect(3 + Math.floor(h(251) * 8), 5 + Math.floor(h(252) * 8), 4, 1, P.groundDark);
      return;
    }
    if (gs === 'ash') { // la cendre, et des braises
      for (var as = 0; as < 5; as++) p(Math.floor(h(as + 260) * 16), Math.floor(h(as + 270) * 16), P.groundDark);
      for (var ae = 0; ae < 2; ae++) p(Math.floor(h(ae + 280) * 16), Math.floor(h(ae + 290) * 16), h(ae + 295) < 0.5 ? P.accent : P.groundLight);
      return;
    }
    if (gs === 'void') { // des dalles qui flottent sur des étoiles
      rect(0, 0, TILE, 1, P.groundDark); rect(0, 0, 1, TILE, P.groundDark); rect(1, 1, 5, 1, P.groundLight);
      if (h(300) < 0.35) p(4 + Math.floor(h(301) * 8), 4 + Math.floor(h(302) * 8), P.accent);
      return;
    }
    if (biome.wall === 'ruins' || gs === 'slabs') {
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
    var alt = biome.alt || 'mosaic';
    if (alt === 'puddle') { // flaque de vase
      rect(3, 5, 10, 6, P.alt); rect(2, 6, 12, 4, P.alt); rect(4, 6, 4, 1, biome.id === 'marais' ? '#4a4a30' : P.groundLight);
    } else if (alt === 'leaves') { // feuilles mortes
      for (var l = 0; l < 7; l++) { var lx = Math.floor(h(l + 50) * 14), ly = Math.floor(h(l + 60) * 14); p(lx, ly, l % 2 ? '#a8641e' : P.alt); p(lx + 1, ly, '#c9842a'); }
    } else if (alt === 'stone') { // une grande pierre plate
      rect(2, 3, 12, 10, P.alt); rect(3, 4, 4, 1, P.groundLight);
    } else if (alt === 'flowers') { // des fleurs
      for (var fl2 = 0; fl2 < 5; fl2++) { var fx2 = 1 + Math.floor(h(fl2 + 310) * 13), fy2 = 2 + Math.floor(h(fl2 + 320) * 12); p(fx2, fy2 + 1, P.groundDark); p(fx2, fy2, P.alt); p(fx2 + 1, fy2, P.alt); p(fx2, fy2 - 1, P.alt); p(fx2 - 1, fy2, P.alt); p(fx2, fy2, '#fff6d0'); }
    } else if (alt === 'bones') { // des os blanchis
      rect(3, 9, 8, 1, P.alt); p(2, 8, P.alt); p(2, 10, P.alt); p(11, 8, P.alt); p(11, 10, P.alt);
      rect(8, 4, 1, 4, P.alt); p(7, 3, P.alt); p(9, 3, P.alt); rect(3, 10, 8, 1, P.groundDark);
    } else if (alt === 'crater') { // un cratère
      rect(3, 5, 10, 7, P.groundDark); rect(4, 6, 8, 5, P.alt); rect(4, 5, 8, 1, P.groundLight); p(6, 8, P.groundDark);
    } else if (alt === 'snow') { // un tas de neige
      rect(3, 7, 10, 5, P.alt); rect(5, 5, 6, 2, P.alt); rect(3, 11, 10, 1, P.groundDark);
    } else if (alt === 'embers') { // une fissure de lave
      for (var ek = 0; ek < 10; ek++) p(3 + ek, 8 + Math.round(Math.sin(ek * 1.3 + h(330) * 6) * 2), ek % 3 ? P.alt : '#ffd040');
    } else if (alt === 'rails') { // des rails rouillés
      rect(0, 5, TILE, 1, P.alt); rect(0, 10, TILE, 1, P.alt);
      for (var rk = 1; rk < TILE; rk += 4) rect(rk, 4, 2, 8, P.groundDark);
      rect(0, 5, TILE, 1, P.alt); rect(0, 10, TILE, 1, P.alt);
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
    } else if (biome.wall === 'hedge') { // une haie épaisse
      rect(0, 0, TILE, TILE, P.wallDark);
      for (var hg = 0; hg < 14; hg++) { var hx = Math.floor(h(hg + 340) * 14), hy = Math.floor(h(hg + 350) * 14); rect(hx, hy, 3, 2, hg % 3 ? P.wall : P.wallLight); }
      if (h(360) < 0.4) { p(4 + Math.floor(h(361) * 8), 3 + Math.floor(h(362) * 8), P.accent); }
    } else if (biome.wall === 'palisade') { // des pieux taillés en pointe
      rect(0, 0, TILE, TILE, P.wallDark);
      for (var pk = 0; pk < 4; pk++) {
        var px2 = pk * 4, top2 = 1 + Math.floor(h(pk + 370) * 2);
        rect(px2, top2 + 2, 3, TILE - top2 - 2, P.wall); rect(px2, top2 + 2, 1, TILE - top2 - 2, P.wallLight); rect(px2 + 1, top2, 1, 2, P.wallLight);
      }
      rect(0, 10, TILE, 1, '#1a1c2c'); rect(0, 9, TILE, 1, P.accent);
    } else if (biome.wall === 'sandstone') { // du grès en couches
      rect(0, 0, TILE, TILE, P.wall);
      for (var ss = 0; ss < 4; ss++) { rect(0, ss * 4, TILE, 1, P.wallDark); rect(Math.floor(h(ss + 380) * 8), ss * 4 + 1, 6, 1, P.wallLight); }
      if (h(385) < 0.3) rect(3 + Math.floor(h(386) * 8), 6, 2, 2, P.wallDark);
    } else if (biome.wall === 'ice') { // des blocs de glace
      rect(0, 0, TILE, TILE, P.wall);
      rect(0, 0, TILE, 1, P.wallLight); rect(0, 8, TILE, 1, P.wallDark); rect(7, 0, 1, 8, P.wallDark); rect(3, 8, 1, 8, P.wallDark); rect(11, 8, 1, 8, P.wallDark);
      for (var ic = 0; ic < 4; ic++) p(2 + ic, 5 - ic, P.wallLight);
      for (var ic2 = 0; ic2 < 3; ic2++) p(6 + ic2, 14 - ic2, P.wallLight);
    } else if (biome.wall === 'cloud') { // des nuages sur le ciel
      rect(0, 0, TILE, TILE, P.wallDark);
      for (var cl = 0; cl < 4; cl++) { var cx3 = Math.floor(h(cl + 390) * 12), cy3 = Math.floor(h(cl + 395) * 10); rect(cx3, cy3 + 2, 7, 3, P.wall); rect(cx3 + 1, cy3 + 1, 5, 1, P.wallLight); rect(cx3 + 2, cy3, 3, 1, P.wallLight); }
    } else if (biome.wall === 'void') { // le vide et ses étoiles
      rect(0, 0, TILE, TILE, P.wallDark);
      for (var vs = 0; vs < 3; vs++) p(Math.floor(h(vs + 400) * 16), Math.floor(h(vs + 405) * 16), vs ? P.wallLight : P.accent);
      if (h(410) < 0.3) rect(Math.floor(h(411) * 10), Math.floor(h(412) * 14), 5, 1, P.wall);
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
    } else if (biome.block === 'boulder') { // un rocher rond
      rect(3, 4, 10, 10, '#1a1c2c'); rect(2, 6, 12, 7, '#1a1c2c');
      rect(4, 5, 8, 8, P.block); rect(3, 7, 10, 5, P.block); rect(4, 5, 4, 2, P.blockLight); rect(10, 10, 2, 2, P.blockDark); rect(3, 11, 10, 1, P.blockDark);
    } else if (biome.block === 'banner') { // une bannière de guerre
      rect(3, 1, 2, 14, '#1a1c2c'); rect(3, 2, 1, 13, '#6e4a2a');
      rect(5, 2, 8, 8, '#1a1c2c'); rect(5, 3, 7, 6, P.block); rect(5, 3, 7, 1, P.blockLight); rect(7, 5, 3, 2, P.blockLight);
      p(6, 9, P.block); p(8, 9, P.block); p(10, 9, P.block); p(12, 3, P.blockDark); p(12, 5, P.blockDark);
    } else if (biome.block === 'cactus') { // un cactus
      rect(6, 2, 4, 13, '#1a1c2c'); rect(7, 3, 2, 12, P.block); rect(7, 3, 1, 12, P.blockLight);
      rect(2, 6, 4, 2, '#1a1c2c'); rect(2, 4, 2, 4, '#1a1c2c'); rect(3, 5, 1, 2, P.block); rect(4, 6, 2, 1, P.block);
      rect(10, 8, 4, 2, '#1a1c2c'); rect(12, 5, 2, 5, '#1a1c2c'); rect(12, 6, 1, 3, P.block); rect(10, 8, 2, 1, P.block);
      p(8, 5, P.blockDark); p(8, 9, P.blockDark); p(7, 12, P.blockDark);
    } else if (biome.block === 'tomb') { // une pierre tombale
      rect(3, 3, 10, 12, '#1a1c2c'); rect(4, 2, 8, 1, '#1a1c2c');
      rect(4, 3, 8, 11, P.block); rect(5, 2, 6, 1, P.blockLight); rect(4, 3, 1, 11, P.blockLight);
      rect(7, 5, 2, 6, P.blockDark); rect(6, 7, 4, 1, P.blockDark); rect(3, 14, 10, 1, P.blockDark);
    } else if (biome.block === 'skull') { // un crâne géant
      rect(2, 3, 12, 9, '#1a1c2c'); rect(4, 11, 8, 4, '#1a1c2c');
      rect(3, 4, 10, 7, P.block); rect(5, 11, 6, 3, P.block); rect(3, 4, 10, 1, P.blockLight);
      rect(4, 6, 3, 3, '#1a1c2c'); rect(9, 6, 3, 3, '#1a1c2c'); p(8, 9, '#1a1c2c'); p(6, 12, P.blockDark); p(8, 12, P.blockDark); p(10, 12, P.blockDark);
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
    } else if (biome.bush === 'swords') { // des épées plantées
      [[3, 3], [8, 1], [12, 4]].forEach(function (sw, k) {
        var sx2 = sw[0], st2 = sw[1];
        rect(sx2, st2 + 3, 1, 14 - st2 - 3, P.bushLight); rect(sx2 + 1, st2 + 3, 1, 14 - st2 - 3, P.bush);
        rect(sx2 - 1, st2 + 2, 4, 1, k === 1 ? P.accent : '#6e4a2a'); rect(sx2, st2, 2, 2, '#6e4a2a');
      });
      rect(1, 14, 14, 1, P.bushDark);
    } else if (biome.bush === 'thorns') { // des ronces
      for (var th = 0; th < 5; th++) {
        for (var tl = 0; tl < 12; tl++) {
          var tx2 = 2 + th * 3 + Math.round(Math.sin(tl * 0.8 + th) * 1.5), ty2 = 14 - tl;
          p(tx2, ty2, tl % 3 ? P.bush : P.bushDark);
          if (tl % 4 === 2) p(tx2 + 1, ty2 - 1, P.bushLight);
        }
      }
    } else if (biome.bush === 'flames') { // des flammes
      [[3, 6], [8, 3], [12, 7]].forEach(function (fm) {
        var fx3 = fm[0], ft = fm[1];
        for (var fy3 = ft; fy3 < 15; fy3++) { var fw = Math.min(2, Math.floor((fy3 - ft) / 2)); rect(fx3 - fw, fy3, fw * 2 + 1, 1, fy3 < ft + 3 ? P.bushLight : (fy3 < ft + 6 ? P.bush : P.bushDark)); }
      });
    } else if (biome.bush === 'flowers') { // un bouquet de fleurs
      rect(3, 9, 10, 6, P.bushDark); rect(4, 8, 8, 1, P.bush);
      [[5, 6], [9, 5], [7, 9], [11, 8], [3, 10]].forEach(function (fw2, k) { var c2 = k % 2 ? P.bushLight : P.accent; p(fw2[0], fw2[1], c2); p(fw2[0] - 1, fw2[1] + 1, c2); p(fw2[0] + 1, fw2[1] + 1, c2); p(fw2[0], fw2[1] + 2, c2); p(fw2[0], fw2[1] + 1, '#fff6d0'); });
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
