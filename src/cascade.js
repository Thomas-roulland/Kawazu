// La Cascade des Duels (pixel art 320×180) : une gorge de jade, une grande cascade au centre qui tombe dans un
// bassin, et deux rochers moussus de part et d'autre, où les deux grenouilles se font face (elles se tiennent
// en y = 132, la cascade entre elles). Le même décor sert de fond à la page et d'arène aux duels et à
// l'entraînement ; fx() anime l'eau par-dessus (écume qui descend, remous du bassin).
var CascadeScene = (function () {
  var W = 320, H = 180, FALL = { x0: 124, x1: 196, top: 8, bottom: 122 };
  var cache = null;

  function build() {
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var r = function (x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    // le ciel du matin, au fond de la gorge
    var g = ctx.createLinearGradient(0, 0, 0, 110);
    g.addColorStop(0, '#6cc8e0'); g.addColorStop(0.55, '#bfeee0'); g.addColorStop(1, '#fff0c8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 120);
    // pics lointains, bleutés par la brume
    for (var i = 0; i < 12; i++) {
      var px = hash(i, 1, 41) * W, pw = 14 + hash(i, 2, 41) * 20, ph = 30 + hash(i, 3, 41) * 40;
      r(px - pw / 2, 96 - ph, pw, ph + 20, '#8cc8c0'); r(px - pw / 2 + 2, 92 - ph, pw - 4, 5, '#a8dcd0'); r(px - pw / 2 + 1, 90 - ph, pw - 2, 3, '#7fcf9a');
    }
    // la falaise du fond, d'où tombe la cascade
    for (var x = 88; x < 232; x++) {
      var top = Math.round(4 + Math.abs(x - 160) * 0.12 + hash(x, 4, 41) * 3);
      r(x, top, 1, 124 - top, (x + top) % 9 === 0 ? '#2f5a4a' : '#3f6a5a');
      r(x, top, 1, 2, '#5fbf6a');
    }
    // la cascade : des colonnes d'eau claire et d'écume
    for (var fx = FALL.x0; fx < FALL.x1; fx++) {
      var edge = fx < FALL.x0 + 3 || fx > FALL.x1 - 4, col = hash(fx, 5, 41);
      for (var fy = FALL.top; fy < FALL.bottom; fy++) {
        var v = (fy + Math.floor(col * 40)) % 17;
        r(fx, fy, 1, 1, edge ? '#4fa8c8' : (v < 2 ? '#e8fbff' : (col < 0.3 ? '#9ee0f4' : (col < 0.7 ? '#7fd0ec' : '#62bfe0'))));
      }
    }
    r(FALL.x0 - 2, FALL.top - 2, FALL.x1 - FALL.x0 + 4, 3, '#dff8ff'); // la lèvre d'eau en haut
    // les deux falaises qui encadrent la gorge, couvertes de mousse et de lianes
    function cliff(fromX, toX, dir) {
      for (var x = fromX; x !== toX; x += dir) {
        var d = Math.abs(x - fromX), top = Math.round(10 + d * 0.9 + Math.sin(d * 0.3) * 4 + hash(x, 6, 41) * 3);
        r(x, top, 1, 140 - top, d > 60 ? '#2f5a4a' : (d % 7 === 0 ? '#244a3c' : '#355f4e'));
        r(x, top, 1, 3, '#6fd07a'); r(x, top + 3, 1, 2, '#3f9a4a');
        if (hash(x, 7, 41) < 0.18) r(x, top + 4, 1, 8 + Math.floor(hash(x, 8, 41) * 22), '#3f9a4a'); // lianes
      }
    }
    cliff(0, 92, 1); cliff(W - 1, 227, -1);
    // de fins filets d'eau sur les falaises
    [[36, 30, 70], [288, 26, 76]].forEach(function (s) { for (var yy = s[1]; yy < s[1] + s[2]; yy++) r(s[0] + Math.round(Math.sin(yy * 0.2)), yy, 2, 1, yy % 5 ? '#9ee0f4' : '#e8fbff'); });
    // le bassin
    var bg = ctx.createLinearGradient(0, 118, 0, H);
    bg.addColorStop(0, '#4fb0d0'); bg.addColorStop(0.5, '#2f8fb0'); bg.addColorStop(1, '#1f6a8a');
    ctx.fillStyle = bg; ctx.fillRect(0, 118, W, H - 118);
    for (var rp = 0; rp < 50; rp++) r(hash(rp, 9, 41) * W, 124 + hash(rp, 10, 41) * 54, 6 + hash(rp, 11, 41) * 12, 1, 'rgba(232, 251, 255, 0.45)');
    // l'écume au pied de la cascade
    for (var e = 0; e < 5; e++) { var ew = 44 - e * 7; r(160 - ew, 118 + e * 2, ew * 2, 2, e < 2 ? '#ffffff' : 'rgba(232, 251, 255, 0.7)'); }
    // la brume qui monte du bassin
    var mist = ctx.createLinearGradient(0, 96, 0, 136);
    mist.addColorStop(0, 'rgba(255, 255, 255, 0)'); mist.addColorStop(0.6, 'rgba(255, 255, 255, 0.35)'); mist.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = mist; ctx.fillRect(0, 96, W, 40);
    // les deux rochers des duellistes
    function rock(cx, w) {
      for (var yy = 128; yy < H; yy++) {
        var k = (yy - 128) / (H - 128), half = Math.round(w / 2 * (1 - k * 0.25) + Math.sin(yy * 0.7) * 1.5);
        r(cx - half, yy, half * 2, 1, yy < 131 ? '#9fb0a0' : (yy < 136 ? '#7a8c7e' : (k > 0.6 ? '#3a4a42' : '#56685c')));
      }
      for (var m = 0; m < 26; m++) r(cx - w / 2 + hash(m, cx, 43) * w, 128 + hash(m, cx, 44) * 6, 3 + hash(m, cx, 45) * 5, 1, '#5fbf6a'); // mousse
      r(cx - w / 2 + 4, 127, w - 8, 1, '#c0d0c0');
    }
    rock(64, 118); rock(W - 64, 118);
    // nénuphars et roseaux
    [[150, 160, 8], [178, 170, 6], [120, 174, 7], [206, 150, 5]].forEach(function (lp) {
      for (var yy = -2; yy <= 2; yy++) r(lp[0] - lp[2] + Math.abs(yy), lp[1] + yy, (lp[2] - Math.abs(yy)) * 2, 1, yy < 0 ? '#5fbf6a' : '#3f9a4a');
    });
    r(149, 157, 3, 2, '#ff9ac0');
    [4, 8, 12, 308, 313].forEach(function (x, i) { r(x, 108 - i % 2 * 6, 1, 24, '#3f9a4a'); r(x - 1, 106 - i % 2 * 6, 3, 4, '#8a6a3a'); });
    // rayons de soleil
    ctx.fillStyle = 'rgba(255, 250, 220, 0.08)';
    [[40, 0], [90, 0], [230, 0]].forEach(function (s) { ctx.beginPath(); ctx.moveTo(s[0], 0); ctx.lineTo(s[0] + 26, 0); ctx.lineTo(s[0] + 90, 130); ctx.lineTo(s[0] + 60, 130); ctx.fill(); });
    var vg = ctx.createRadialGradient(W / 2, 110, 70, W / 2, 110, 240);
    vg.addColorStop(0, 'rgba(0, 0, 0, 0)'); vg.addColorStop(1, 'rgba(0, 20, 20, 0.35)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    return c;
  }
  // l'eau qui bouge : de l'écume qui descend la cascade, des remous au pied
  function fx(ctx, now, ox, oy, s) {
    ox = ox || 0; oy = oy || 0; s = s || 1;
    var t = now / 1000;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    for (var i = 0; i < 26; i++) {
      var x = FALL.x0 + 3 + hash(i, 12, 41) * (FALL.x1 - FALL.x0 - 6), y = FALL.top + ((t * (60 + hash(i, 13, 41) * 50) + hash(i, 14, 41) * 200) % (FALL.bottom - FALL.top));
      ctx.fillRect(Math.round(ox + x * s), Math.round(oy + y * s), Math.max(1, Math.round(s)), Math.max(2, Math.round(4 * s)));
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (var k = 0; k < 8; k++) {
      var a = t * 1.5 + k, rx = 160 + Math.cos(a) * (20 + k * 4), ry = 124 + (k % 3) * 2;
      ctx.fillRect(Math.round(ox + rx * s), Math.round(oy + ry * s), Math.max(2, Math.round(6 * s)), Math.max(1, Math.round(s)));
    }
  }
  return { W: W, H: H, backdrop: function () { return cache || (cache = build()); }, fx: fx };
})();
