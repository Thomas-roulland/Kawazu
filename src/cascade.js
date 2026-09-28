// La Cascade des Duels (pixel art 400×225, la taille des combats) : une gorge de jade, une grande cascade au centre
// qui tombe dans un bassin, et deux rochers moussus de part et d'autre, où les deux grenouilles se font face (elles
// se tiennent en y = 165, la cascade entre elles). Le même décor sert de fond à la page et d'arène aux duels et à
// l'entraînement ; fx() anime l'eau par-dessus (écume qui descend, remous du bassin).
var CascadeScene = (function () {
  var W = 400, H = 225, POOL = 150, ROCK = 161, FALL = { x0: 158, x1: 242, top: 10, bottom: 154 };
  var cache = null;

  function build() {
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var r = function (x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    // le ciel du matin, au fond de la gorge
    var g = ctx.createLinearGradient(0, 0, 0, 140);
    g.addColorStop(0, '#6cc8e0'); g.addColorStop(0.55, '#bfeee0'); g.addColorStop(1, '#fff0c8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, POOL);
    // pics lointains, bleutés par la brume
    for (var i = 0; i < 15; i++) {
      var px = hash(i, 1, 41) * W, pw = 14 + hash(i, 2, 41) * 22, ph = 36 + hash(i, 3, 41) * 50;
      r(px - pw / 2, 122 - ph, pw, ph + 24, '#8cc8c0'); r(px - pw / 2 + 2, 118 - ph, pw - 4, 5, '#a8dcd0'); r(px - pw / 2 + 1, 116 - ph, pw - 2, 3, '#7fcf9a');
    }
    // la falaise du fond, d'où tombe la cascade
    for (var x = 112; x < 290; x++) {
      var top = Math.round(5 + Math.abs(x - W / 2) * 0.12 + hash(x, 4, 41) * 3);
      r(x, top, 1, POOL + 6 - top, (x + top) % 9 === 0 ? '#2f5a4a' : '#3f6a5a');
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
        var d = Math.abs(x - fromX), top = Math.round(12 + d * 0.95 + Math.sin(d * 0.3) * 4 + hash(x, 6, 41) * 3);
        r(x, top, 1, POOL + 26 - top, d > 75 ? '#2f5a4a' : (d % 7 === 0 ? '#244a3c' : '#355f4e'));
        r(x, top, 1, 3, '#6fd07a'); r(x, top + 3, 1, 2, '#3f9a4a');
        if (hash(x, 7, 41) < 0.18) r(x, top + 4, 1, 8 + Math.floor(hash(x, 8, 41) * 26), '#3f9a4a'); // lianes
      }
    }
    cliff(0, 116, 1); cliff(W - 1, 284, -1);
    // de fins filets d'eau sur les falaises
    [[44, 36, 90], [358, 32, 96]].forEach(function (s) { for (var yy = s[1]; yy < s[1] + s[2]; yy++) r(s[0] + Math.round(Math.sin(yy * 0.2)), yy, 2, 1, yy % 5 ? '#9ee0f4' : '#e8fbff'); });
    // le bassin
    var bg = ctx.createLinearGradient(0, POOL, 0, H);
    bg.addColorStop(0, '#4fb0d0'); bg.addColorStop(0.5, '#2f8fb0'); bg.addColorStop(1, '#1f6a8a');
    ctx.fillStyle = bg; ctx.fillRect(0, POOL, W, H - POOL);
    for (var rp = 0; rp < 70; rp++) r(hash(rp, 9, 41) * W, POOL + 6 + hash(rp, 10, 41) * (H - POOL - 8), 6 + hash(rp, 11, 41) * 14, 1, 'rgba(232, 251, 255, 0.45)');
    // l'écume au pied de la cascade
    for (var e = 0; e < 5; e++) { var ew = 52 - e * 8; r(W / 2 - ew, POOL + e * 2, ew * 2, 2, e < 2 ? '#ffffff' : 'rgba(232, 251, 255, 0.7)'); }
    // la brume qui monte du bassin
    var mist = ctx.createLinearGradient(0, POOL - 28, 0, POOL + 22);
    mist.addColorStop(0, 'rgba(255, 255, 255, 0)'); mist.addColorStop(0.6, 'rgba(255, 255, 255, 0.35)'); mist.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = mist; ctx.fillRect(0, POOL - 28, W, 50);
    // les deux rochers des duellistes
    function rock(cx, w) {
      for (var yy = ROCK - 4; yy < H; yy++) {
        var k = (yy - ROCK) / (H - ROCK), half = Math.round(w / 2 * (1 - Math.max(0, k) * 0.25) + Math.sin(yy * 0.7) * 1.5);
        r(cx - half, yy, half * 2, 1, yy < ROCK - 1 ? '#9fb0a0' : (yy < ROCK + 4 ? '#7a8c7e' : (k > 0.6 ? '#3a4a42' : '#56685c')));
      }
      for (var m = 0; m < 30; m++) r(cx - w / 2 + hash(m, cx, 43) * w, ROCK - 4 + hash(m, cx, 44) * 6, 3 + hash(m, cx, 45) * 5, 1, '#5fbf6a'); // mousse
      r(cx - w / 2 + 4, ROCK - 5, w - 8, 1, '#c0d0c0');
    }
    rock(96, 150); rock(W - 96, 150);
    // nénuphars et roseaux
    [[186, 202, 9], [222, 214, 7], [150, 218, 8], [258, 192, 6]].forEach(function (lp) {
      for (var yy = -2; yy <= 2; yy++) r(lp[0] - lp[2] + Math.abs(yy), lp[1] + yy, (lp[2] - Math.abs(yy)) * 2, 1, yy < 0 ? '#5fbf6a' : '#3f9a4a');
    });
    r(185, 199, 3, 2, '#ff9ac0');
    [4, 9, 14, 386, 392].forEach(function (x, i) { r(x, 136 - i % 2 * 6, 1, 28, '#3f9a4a'); r(x - 1, 134 - i % 2 * 6, 3, 4, '#8a6a3a'); });
    // rayons de soleil
    ctx.fillStyle = 'rgba(255, 250, 220, 0.08)';
    [[50, 0], [110, 0], [290, 0]].forEach(function (s) { ctx.beginPath(); ctx.moveTo(s[0], 0); ctx.lineTo(s[0] + 30, 0); ctx.lineTo(s[0] + 110, 160); ctx.lineTo(s[0] + 76, 160); ctx.fill(); });
    var vg = ctx.createRadialGradient(W / 2, 140, 90, W / 2, 140, 300);
    vg.addColorStop(0, 'rgba(0, 0, 0, 0)'); vg.addColorStop(1, 'rgba(0, 20, 20, 0.35)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    return c;
  }
  // l'eau qui bouge : de l'écume qui descend la cascade, des remous au pied
  function fx(ctx, now) {
    var t = now / 1000;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    for (var i = 0; i < 30; i++) {
      var x = FALL.x0 + 3 + hash(i, 12, 41) * (FALL.x1 - FALL.x0 - 6), y = FALL.top + ((t * (60 + hash(i, 13, 41) * 50) + hash(i, 14, 41) * 200) % (FALL.bottom - FALL.top));
      ctx.fillRect(Math.round(x), Math.round(y), 1, 4);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (var k = 0; k < 9; k++) {
      var a = t * 1.5 + k, rx = W / 2 + Math.cos(a) * (24 + k * 5), ry = POOL + 4 + (k % 3) * 2;
      ctx.fillRect(Math.round(rx), Math.round(ry), 6, 1);
    }
  }
  return { W: W, H: H, backdrop: function () { return cache || (cache = build()); }, fx: fx };
})();
