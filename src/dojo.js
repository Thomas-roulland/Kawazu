// Le dojo du marais (pixel art 320×180) : parquet de tatamis, cloisons de papier éclairées par des lanternes,
// l'alcôve avec son rouleau à l'emblème de la grenouille, le râtelier d'armes et le grand tambour.
// Le même décor sert de fond à la page Dojo et d'arène aux duels et à l'entraînement (le sol commence en y = 104,
// les combattants se tiennent en y = 132).
var DojoScene = (function () {
  var W = 320, H = 180, FLOOR = 104;
  var cache = null;

  function build() {
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var r = function (x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    var px = function (x, y, col) { r(x, y, 1, 1, col); };

    // ---- le mur du fond : poutres sombres et cloisons de papier (shoji) ----
    r(0, 0, W, FLOOR, '#2a1c12');
    var panels = [[8, 92], [118, 196], [224, 312]]; // entre les piliers ; l'alcôve est au centre
    panels.forEach(function (p) {
      for (var x = p[0]; x < p[1]; x += 28) {
        var x1 = Math.min(p[1], x + 26);
        r(x, 14, x1 - x, 80, '#d8c49a');
        for (var yy = 14; yy < 94; yy++) for (var xx = x; xx < x1; xx++) if (hash(xx, yy, 21) < 0.05) px(xx, yy, '#cbb489'); // grain du papier
        for (var gx = x + 8; gx < x1; gx += 9) r(gx, 14, 1, 80, '#7a5634');   // croisillons
        for (var gy = 30; gy < 94; gy += 16) r(x, gy, x1 - x, 1, '#7a5634');
        r(x, 14, x1 - x, 1, '#5a3e25'); r(x, 93, x1 - x, 1, '#5a3e25');
      }
    });
    // la lumière chaude des lanternes à travers le papier
    [[60, 44], [260, 44]].forEach(function (l) {
      var g = ctx.createRadialGradient(l[0], l[1], 4, l[0], l[1], 70);
      g.addColorStop(0, 'rgba(255, 190, 110, 0.35)'); g.addColorStop(1, 'rgba(255, 190, 110, 0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR);
    });
    // poutres : linteau, piliers
    r(0, 0, W, 12, '#3e2a19'); r(0, 11, W, 2, '#1a1108'); r(0, 4, W, 1, '#5a3e25');
    [0, 100, 210, 314].forEach(function (x) { r(x, 0, 8, FLOOR, '#4a3220'); r(x + 1, 0, 2, FLOOR, '#6b4a2c'); r(x + 7, 0, 1, FLOOR, '#1a1108'); });
    // ---- l'alcôve (tokonoma) : un rouleau à l'emblème de la grenouille ----
    r(108, 12, 102, 82, '#3a2616'); r(110, 14, 98, 78, '#4a3220');
    r(147, 18, 24, 58, '#efe3c4'); r(146, 18, 26, 3, '#6e4a2a'); r(146, 74, 26, 3, '#6e4a2a'); r(148, 77, 2, 3, '#c9412f'); r(168, 77, 2, 3, '#c9412f');
    var frog = ['..kk...kk..', '.kwwk.kwwk.', '.kwkkkkkwk.', 'kgggggggggk', 'kgggggggggk', '.kgkkkkkgk.', '..kgggggk..', '.kgk...kgk.', 'kk.......kk'];
    frog.forEach(function (row, y) { row.split('').forEach(function (ch, x) { if (ch !== '.') px(154 + x, 34 + y * 2, { k: '#1a1c2c', w: '#f4f4e8', g: '#4e9a45' }[ch]); if (ch !== '.') px(154 + x, 35 + y * 2, { k: '#1a1c2c', w: '#f4f4e8', g: '#3e8a38' }[ch]); }); });
    r(151, 60, 16, 1, '#1a1c2c'); r(153, 64, 12, 1, '#1a1c2c'); r(155, 68, 8, 1, '#1a1c2c'); // quelques traits d'encre
    // l'estrade de l'alcôve, un bonsaï et un encensoir
    r(112, 84, 94, 8, '#6b4a2c'); r(112, 84, 94, 1, '#8d6a45'); r(112, 91, 94, 1, '#1a1108');
    r(124, 78, 10, 6, '#8a8f99'); r(125, 72, 8, 6, '#3e8a38'); r(123, 70, 5, 4, '#4e9a45'); r(129, 69, 5, 4, '#2e6b3d'); r(128, 74, 1, 4, '#4a3220');
    r(186, 80, 8, 4, '#b8902a'); r(188, 76, 1, 4, '#cfd8dc'); r(190, 73, 1, 3, 'rgba(207, 216, 220, 0.6)');
    // ---- râtelier d'armes, à gauche ----
    r(20, 40, 56, 3, '#5a3e25'); r(20, 70, 56, 3, '#5a3e25'); r(22, 40, 2, 52, '#3e2a19'); r(72, 40, 2, 52, '#3e2a19');
    [28, 36, 44].forEach(function (x, i) { r(x, 30 + i * 2, 2, 60 - i * 2, i === 1 ? '#8fce52' : '#b8a36a'); r(x, 30 + i * 2, 2, 2, '#e8dcb0'); }); // bâtons
    [54, 60, 66].forEach(function (x) { r(x, 46, 1, 10, '#cfd8dc'); r(x - 1, 56, 3, 1, '#1a1c2c'); r(x, 57, 1, 6, '#6b4a2c'); r(x - 1, 63, 3, 2, '#1a1c2c'); }); // kunaïs
    // ---- le grand tambour (taiko), à droite ----
    r(262, 60, 36, 4, '#3e2a19'); r(266, 64, 4, 28, '#3e2a19'); r(290, 64, 4, 28, '#3e2a19');
    for (var dy = -14; dy <= 14; dy++) {
      var half = Math.round(Math.sqrt(1 - (dy * dy) / 225) * 13);
      r(280 - half, 60 + dy, half * 2, 1, Math.abs(dy) > 11 ? '#6e4a2a' : (dy < -6 ? '#9a3a2a' : '#7a2a1f'));
    }
    r(274, 46, 12, 28, '#e8d8b0'); r(275, 47, 10, 26, '#f4e8c8'); r(279, 58, 2, 2, '#c9412f');
    [[244, 88], [248, 90]].forEach(function (s) { r(s[0], s[1], 12, 1, '#8d6a45'); }); // baguettes posées
    // ---- les lanternes de papier ----
    [60, 260].forEach(function (x) {
      r(x, 12, 1, 18, '#1a1108');
      r(x - 6, 30, 13, 3, '#1a1108'); r(x - 7, 33, 15, 16, '#d9542f'); r(x - 5, 33, 11, 16, '#f07a3a'); r(x - 2, 35, 5, 12, '#ffd08a');
      r(x - 7, 36, 15, 1, '#9a3a1f'); r(x - 7, 41, 15, 1, '#9a3a1f'); r(x - 7, 46, 15, 1, '#9a3a1f'); r(x - 6, 49, 13, 3, '#1a1108'); r(x, 52, 1, 5, '#e0b43a');
    });

    // ---- le sol : plinthe, puis tatamis bordés de vert ----
    r(0, FLOOR - 4, W, 4, '#1a1108'); r(0, FLOOR - 4, W, 1, '#5a3e25');
    for (var y = FLOOR; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var ty = y - FLOOR, band = ty < 30 ? 0 : 1, mw = band ? 88 : 64, off = band ? 30 : 0;
        var mx = ((x + off) % mw + mw) % mw, edge = mx < 3 || (ty === 0 || ty === 29 || ty === 30);
        var col;
        if (edge) col = (mx < 3 && (mx === 1)) || ty === 29 || ty === 30 ? '#2f3f22' : '#3e5230';
        else col = (x + (y >> 1)) % 3 === 0 ? '#b8a36a' : ((x * 7 + y) % 11 === 0 ? '#9a874f' : '#c9b47a');
        px(x, y, col);
      }
    }
    // le carré de combat, marqué de rouge
    r(70, 124, 180, 1, 'rgba(201, 65, 47, 0.55)'); r(70, 150, 180, 1, 'rgba(201, 65, 47, 0.55)');
    // l'ombre qui descend du plafond et la lumière au centre
    var g2 = ctx.createRadialGradient(W / 2, 130, 30, W / 2, 130, 230);
    g2.addColorStop(0, 'rgba(0, 0, 0, 0)'); g2.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
    return c;
  }

  return {
    W: W, H: H,
    backdrop: function () { return cache || (cache = build()); }
  };
})();
