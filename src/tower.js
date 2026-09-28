// La Tour des Cent Sages, au sommet du mont Kaeru : « les Épreuves des Anciens Sages ».
// Un monde de couleurs vives (ciel orange et rose, pics de jade, feuilles géantes, cascades d'huile dorée,
// statues de grenouilles) où Kawazu monte étage par étage. Chaque étage est gardé par un ancien sage grenouille :
// un vrai combattant (niveau, points, voie, dalles du temple, sorts, équipement) qui monte en puissance.
// Tous les 10 étages, un Grand Sage garde un trésor. Les récompenses ne se gagnent qu'une fois par étage.
var TOWER_FLOORS = 100;

// Les dix Grands Sages
var GRAND_SAGES = {
  10: { nom: 'Doyenne Hasuno', titre: 'gardienne des nénuphars', voie: 'baton', peau: 'corail' },
  20: { nom: 'Maître Iwagama', titre: 'le roc du mont Kaeru', voie: 'ermite', peau: 'mousse' },
  30: { nom: 'Ermite Kiriboshi', titre: 'la brume qui frappe', voie: 'kunai', peau: 'azur' },
  40: { nom: 'Vénérable Shunrai', titre: 'le tonnerre de printemps', voie: 'baton', peau: 'ocre' },
  50: { nom: 'Grande Aïeule Mizuha', titre: 'la source d’huile', voie: 'ermite', peau: 'jade' },
  60: { nom: 'Maître Kagerō', titre: 'l’ombre des pics', voie: 'kunai', peau: 'nuit' },
  70: { nom: 'Doyen Tetsugama', titre: 'le crapaud de fer', voie: 'baton', peau: 'cendre' },
  80: { nom: 'Sage Hotarubi', titre: 'la luciole éternelle', voie: 'kunai', peau: 'soleil' },
  90: { nom: 'Ermite Oborozuki', titre: 'la lune voilée', voie: 'ermite', peau: 'orchidee' },
  100: { nom: 'Le Premier Sage', titre: 'celui qui attend au sommet', voie: 'ermite', peau: 'mousse' }
};
var SAGE_TITLES = ['Maître', 'Aïeul', 'Aïeule', 'Vénérable', 'Doyen', 'Doyenne', 'Ermite', 'Sage'];
var SAGE_NAMES = ['Kerokichi', 'Gamaru', 'Tsuyu', 'Hasuke', 'Amagaeru', 'Kajika', 'Tonosama', 'Ukiha', 'Mokuren', 'Hotaru', 'Kawabe', 'Numa',
  'Ashibe', 'Sazanami', 'Kiri', 'Take', 'Yuzu', 'Iwa', 'Mizore', 'Kaede', 'Suisen', 'Tanuki', 'Hakuro', 'Enishi'];
var SAGE_SKINS = ['mousse', 'jade', 'ocre', 'azur', 'corail', 'nuit', 'marais', 'soleil'];

// Niveau d'un sage : il monte vite (au 35e étage, il dépasse le boss du Temple Englouti)
function towerLevel(f) { return 2 + Math.round(f * 1.4) + (f % 10 === 0 ? 3 : 0); }
// Le trésor d'un étage (tous les 10), d'après ITEMS[...].from.tour
function towerTreasure(f) { return BASE_IDS.filter(function (id) { return ITEMS[id].from && ITEMS[id].from.tour === f; })[0] || null; }
function towerRewards(f) {
  var boss = f % 10 === 0, lvl = towerLevel(f);
  return { gold: Math.round((15 + f * 6) * (boss ? 3 : 1)), xp: Math.round((10 + 5 * lvl) * (boss ? 2.2 : 0.8)), item: boss ? towerTreasure(f) : null };
}

// La fiche de combat d'un sage (même format que celles du dojo) : tout est tiré de l'étage, donc toujours pareil
function towerCard(f) {
  var boss = GRAND_SAGES[f], r = function (k) { return hash(f, k, 77); };
  var voie = boss ? boss.voie : VOIES[Math.floor(r(1) * 3)].id, lvl = towerLevel(f);
  // ses points, répartis comme un joueur de sa voie le ferait
  var pts = Math.round((lvl - 1) * POINTS_PER_LEVEL * (boss ? 1 : 0.9)), share = {
    baton: { force: 0.4, vitalite: 0.35, agilite: 0.15, souffle: 0.1 },
    kunai: { agilite: 0.4, force: 0.35, vitalite: 0.15, souffle: 0.1 },
    ermite: { souffle: 0.3, vitalite: 0.35, force: 0.25, agilite: 0.1 }
  }[voie], alloc = {};
  Object.keys(share).forEach(function (k) { alloc[k] = Math.floor(pts * share[k]); });
  // ses dalles du temple : étape par étape, les Techniques d'abord, tant que ses points de compétence le permettent
  var left = lvl - 1, tree = [];
  for (var st = 1; st <= STEPS; st++) [3, 0, 1, 2, 4].forEach(function (p) {
    var n = TREE.filter(function (x) { return x.voie === voie && x.path === p && x.step === st; })[0];
    if (n && n.level <= lvl && n.cost <= left && n.req.every(function (q) { return tree.indexOf(q) >= 0; })) { tree.push(n.id); left -= n.cost; }
  });
  var deck = tree.map(nodeById).filter(function (n) { return n.type === 'skill'; }).map(function (n) { return n.skill; }).slice(-DECK_SIZE);
  // son équipement : ce qu'on trouve à cette hauteur (les objets de rang plus élevé en montant)
  var maxTier = 1 + Math.floor(f / 20), equip = {};
  SLOTS.forEach(function (s, i) {
    var pool = BASE_IDS.filter(function (id) {
      var it = ITEMS[id];
      return it.slot === s.id && !it.reward && (ITEM_TIER[id] || 1) <= maxTier && (s.id !== 'arme' || voie === 'ermite' || it.kind === voie);
    });
    if (s.id === 'arme' && voie !== 'ermite') pool.sort(function (a, b) { return (ITEM_TIER[b] || 1) - (ITEM_TIER[a] || 1); }); // sa meilleure arme
    else if (r(10 + i) < 0.25) return; // parfois rien à cet emplacement
    if (pool.length) equip[s.id] = s.id === 'arme' && voie !== 'ermite' ? pool[0] : pool[Math.floor(r(20 + i) * pool.length)];
  });
  return {
    id: 'tour-' + f, etage: f, boss: !!boss,
    nom: boss ? boss.nom : SAGE_TITLES[Math.floor(r(2) * SAGE_TITLES.length)] + ' ' + SAGE_NAMES[Math.floor(r(3) * SAGE_NAMES.length)],
    titre: boss ? boss.titre : null, pseudo: 'étage ' + f,
    peau: boss ? boss.peau : SAGE_SKINS[Math.floor(r(4) * SAGE_SKINS.length)],
    niveau: lvl, voie: voie, equip: equip, alloc: alloc, tree: tree, deck: deck
  };
}

// ---------- Le décor : le mont Kaeru ----------
var TowerScene = (function () {
  var W = 320, H = 180, FLOOR = 104;
  // quatre ciels, qui changent tous les dix étages : aube, plein jour, couchant, nuit aux lanternes
  var SKIES = [
    { top: '#ff7aa8', mid: '#ffb070', low: '#ffe3a0', sun: '#fff6c8', spire: '#3fa68a', spireL: '#7fd6b0', far: '#e0879a' },
    { top: '#3fb8e8', mid: '#8fdcf0', low: '#e8f7d0', sun: '#fffbe0', spire: '#2f8f6a', spireL: '#6fd0a0', far: '#7ab8c8' },
    { top: '#ff6a3a', mid: '#ffa03a', low: '#ffd870', sun: '#fff0a0', spire: '#3a7a5a', spireL: '#e0a050', far: '#d0604a' },
    { top: '#241a4a', mid: '#4a3a8a', low: '#b86aa0', sun: '#f4f0d0', spire: '#2a4a5a', spireL: '#5a8aa0', far: '#5a4a8a' }
  ];
  var cache = {};

  function scene(skyIndex, arena) {
    var S = SKIES[skyIndex % SKIES.length];
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var r = function (x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    // ciel en bandes, soleil (ou lune) énorme
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, S.top); g.addColorStop(0.45, S.mid); g.addColorStop(0.75, S.low);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (var by = 8; by < 90; by += 7) if (hash(by, skyIndex, 3) < 0.5) r(0, by, W, 1, 'rgba(255, 255, 255, 0.07)');
    var sx = 236, sy = 50;
    var halo = ctx.createRadialGradient(sx, sy, 10, sx, sy, 80);
    halo.addColorStop(0, S.sun + 'aa'); halo.addColorStop(1, S.sun + '00');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
    for (var y = -22; y <= 22; y++) { var hw = Math.round(Math.sqrt(22 * 22 - y * y)); r(sx - hw, sy + y, hw * 2, 1, S.sun); }
    if (skyIndex % 4 === 3) for (var s = 0; s < 50; s++) r(hash(s, 1, 9) * W, hash(s, 2, 9) * 70, 1, 1, '#fff6d8'); // étoiles
    // nuages roses en ruban
    [[30, 34, 90], [150, 22, 70], [250, 80, 60]].forEach(function (cl, i) {
      r(cl[0], cl[1], cl[2], 5, 'rgba(255, 240, 245, 0.55)'); r(cl[0] + 10, cl[1] - 4, cl[2] - 30, 4, 'rgba(255, 240, 245, 0.45)'); r(cl[0] + 6, cl[1] + 5, cl[2] - 12, 2, 'rgba(255, 200, 220, 0.4)');
    });
    // pics de roche lointains, puis plus proches (les pics de jade du mont Kaeru)
    function spires(base, col, colL, seed, count, hmin, hmax) {
      for (var i = 0; i < count; i++) {
        var x = hash(i, seed, 5) * W, w = 10 + hash(i, seed, 6) * 18, h = hmin + hash(i, seed, 7) * (hmax - hmin), top = base - h;
        r(x - w / 2, top + 4, w, h, col); r(x - w / 2 + 2, top, w - 4, 5, col);
        r(x - w / 2, top + 4, 3, h, colL); r(x - w / 2 + 2, top, w - 4, 2, colL); // arête éclairée
        r(x - w / 2 + 1, top - 3, w - 2, 3, '#3fbf5a'); r(x - w / 2 + 4, top - 5, w - 8, 2, '#6fd07a'); // mousse sur le sommet
      }
    }
    spires(110, S.far, S.far, 1, 9, 30, 60);
    spires(118, S.spire, S.spireL, 2, 7, 40, 80);
    // la cascade d'huile dorée, d'une falaise à droite
    r(286, 40, 34, 80, '#4a6a4a'); r(286, 40, 34, 3, '#6fd07a');
    for (var wy = 43; wy < 120; wy++) for (var wx = 292; wx < 304; wx++) r(wx, wy, 1, 1, (wx + wy * 2) % 7 === 0 ? '#fff6c0' : ((wx + wy) % 3 ? '#ffd24a' : '#f0b030'));
    // une statue de grenouille en pierre sur son rocher, à gauche
    r(8, 72, 44, 40, '#6a7a70'); r(8, 72, 44, 3, '#8a9a90');
    var frog = ['....kkk....kkk....', '...kwwwk..kwwwk...', '...kwkwkkkkwkwk...', '..kssssssssssssk..', '.kssssssssssssssk.', '.ksskkkkkkkkksssk.', '.kssssssssssssssk.', 'kssssssssssssssssk', 'kssssmssssssmssssk', '.kkkkkkkkkkkkkkkk.'];
    frog.forEach(function (row, yy) { row.split('').forEach(function (ch, xx) { if (ch !== '.') { r(12 + xx * 2, 50 + yy * 2, 2, 2, { k: '#3a4440', w: '#d8e0d8', s: '#9aa8a0', m: '#5fbf6a' }[ch]); } }); });
    // feuilles géantes et fleurs de lotus, au premier plan des côtés
    function leaf(cx, cy, rw, rh, col, colD) {
      for (var yy = -rh; yy <= rh; yy++) { var hw = Math.round(rw * Math.sqrt(1 - (yy * yy) / (rh * rh))); r(cx - hw, cy + yy, hw * 2, 1, yy > rh / 3 ? colD : col); }
      r(cx - rw + 2, cy, rw * 2 - 4, 1, colD); r(cx, cy - rh + 1, 1, rh * 2 - 2, colD);
    }
    leaf(18, 118, 26, 7, '#3fbf5a', '#2a8a44'); leaf(300, 112, 24, 6, '#4fd06a', '#2a8a44'); leaf(60, 124, 16, 4, '#6fd07a', '#3a9a54');
    [[48, 106], [276, 100]].forEach(function (fl) { r(fl[0] - 5, fl[1], 11, 5, '#ff6aa0'); r(fl[0] - 3, fl[1] - 4, 7, 5, '#ff9ac0'); r(fl[0] - 1, fl[1] - 1, 3, 2, '#ffe070'); });
    if (!arena) { // la page : au pied de la tour, un étang d'huile dorée semé de lotus, entre deux rives d'herbe
      for (var py = FLOOR - 6; py < H; py++) {
        var k2 = (py - FLOOR + 6) / (H - FLOOR + 6);
        r(0, py, W, 1, py % 3 === 0 ? '#ffe07a' : (k2 < 0.3 ? '#f0b030' : (k2 < 0.7 ? '#d89a28' : '#b87a1f')));
      }
      for (var rp = 0; rp < 40; rp++) r(hash(rp, 5, 13) * W, FLOOR + hash(rp, 6, 13) * (H - FLOOR), 8 + hash(rp, 7, 13) * 10, 1, 'rgba(255, 250, 200, 0.55)'); // reflets
      [[40, 130, 12], [96, 160, 9], [210, 140, 11], [262, 166, 13], [150, 172, 8], [300, 126, 7]].forEach(function (lp) { leaf(lp[0], lp[1], lp[2], Math.round(lp[2] / 3), '#4fd06a', '#2a8a44'); });
      [[96, 154], [262, 159]].forEach(function (fl) { r(fl[0] - 4, fl[1], 9, 4, '#ff6aa0'); r(fl[0] - 2, fl[1] - 3, 5, 4, '#ff9ac0'); r(fl[0] - 1, fl[1] - 1, 2, 2, '#ffe070'); });
      for (var gx = 0; gx < W; gx++) { var gh = 3 + Math.round(hash(gx, 8, 13) * 4); r(gx, FLOOR - 8 - gh, 1, gh + 3, gx % 5 ? '#3fbf5a' : '#6fd07a'); } // la rive
      var vg0 = ctx.createRadialGradient(W / 2, 110, 60, W / 2, 110, 230);
      vg0.addColorStop(0, 'rgba(0, 0, 0, 0)'); vg0.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      ctx.fillStyle = vg0; ctx.fillRect(0, 0, W, H);
      return c;
    }
    // le sol : la terrasse de bois laqué d'un étage de la tour
    r(0, FLOOR - 10, W, 3, '#9a2a1f'); r(0, FLOOR - 7, W, 7, 'rgba(0, 0, 0, 0.15)');
    for (var px = 4; px < W; px += 22) { r(px, FLOOR - 22, 3, 22, '#c9412f'); r(px, FLOOR - 24, 5, 3, '#e0b43a'); } // balustrade
    r(0, FLOOR - 22, W, 3, '#c9412f'); r(0, FLOOR - 23, W, 1, '#ff7a5a');
    for (var fy = FLOOR; fy < H; fy++) {
      var plank = Math.floor((fy - FLOOR) / 9), shade = plank % 2 ? '#a8602a' : '#b8703a';
      r(0, fy, W, 1, (fy - FLOOR) % 9 === 0 ? '#6a3a1a' : shade);
    }
    for (var k = 0; k < 90; k++) r(hash(k, 3, 11) * W, FLOOR + hash(k, 4, 11) * (H - FLOOR), 6, 1, 'rgba(90, 40, 15, 0.35)'); // veines du bois
    if (arena) { // le cercle d'épreuve, peint sur la terrasse
      ctx.strokeStyle = 'rgba(255, 240, 180, 0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(W / 2, 136, 120, 16, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // des lanternes flottantes le soir
    if (skyIndex % 4 >= 2) [[80, 30], [120, 58], [200, 36], [170, 70]].forEach(function (l) { r(l[0], l[1], 5, 7, '#ff9a3a'); r(l[0] + 1, l[1] + 1, 3, 5, '#ffd08a'); });
    var vg = ctx.createRadialGradient(W / 2, 110, 60, W / 2, 110, 230);
    vg.addColorStop(0, 'rgba(0, 0, 0, 0)'); vg.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    return c;
  }
  function skyOf(f) { return Math.floor((Math.max(1, f) - 1) / 10) % SKIES.length; }
  return {
    W: W, H: H, SKIES: SKIES, skyOf: skyOf,
    backdrop: function (f) { var k = 'b' + skyOf(f); return cache[k] || (cache[k] = scene(skyOf(f), false)); },
    arena: function (f) { var k = 'a' + skyOf(f); return cache[k] || (cache[k] = scene(skyOf(f), true)); }
  };
})();
