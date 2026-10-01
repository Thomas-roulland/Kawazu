// La Tour des Cent Sages, au sommet du mont Kaeru : « les Épreuves des Anciens Sages ».
// Un monde de couleurs vives (ciel orange et rose, pics de jade, feuilles géantes, cascades d'huile dorée,
// statues de grenouilles) où Kawazu monte étage par étage. Chaque étage est gardé par un ancien sage grenouille :
// un vrai combattant (niveau, points, voie, dalles du temple, sorts, équipement) qui monte en puissance.
// Tous les 10 étages, un Grand Sage garde un trésor. Les récompenses ne se gagnent qu'une fois par étage.
var TOWER_FLOORS = 100;
// Au-dessus, la Tour des Ancêtres : 500 étages de plus, de nuit. Ses gardiens, les Ancêtres, montent jusqu'au niveau
// maximum et frappent de plus en plus fort (ancestorPower) ; tous les 10 étages un Ancêtre majeur, tous les 50 un Grand
// Ancêtre qui garde une Relique (un Légendaire) ; au sommet, le Premier Crapaud, et son skin.
var ANCESTOR_FLOORS = 500, TOWER_TOP = TOWER_FLOORS + ANCESTOR_FLOORS;
function isAncestor(f) { return f > TOWER_FLOORS; }
function ancestorPower(f) { return isAncestor(f) ? 1 + (f - TOWER_FLOORS) * 0.004 : 1; }
var GRAND_ANCESTORS = {
  150: { nom: 'Aïeul Kurogane', titre: 'le fer qui ne rouille pas', voie: 'baton', peau: 'cendre' },
  200: { nom: 'Ancêtre Yamikawa', titre: 'la rivière de nuit', voie: 'kunai', peau: 'nuit' },
  250: { nom: 'Aïeule Shiranui', titre: 'le feu sur la mer', voie: 'ermite', peau: 'orchidee' },
  300: { nom: 'Ancêtre Raigama', titre: 'le crapaud du tonnerre', voie: 'baton', peau: 'azur' },
  350: { nom: 'Aïeule Kagehime', titre: 'la princesse des ombres', voie: 'kunai', peau: 'nuit' },
  400: { nom: 'Ancêtre Tsukimori', titre: 'celui qui garde la lune', voie: 'ermite', peau: 'jade' },
  450: { nom: 'Aïeul Ōnamazu', titre: 'le séisme endormi', voie: 'baton', peau: 'ocre' },
  500: { nom: 'Aïeule Hoshikuzu', titre: 'la poussière d’étoiles', voie: 'kunai', peau: 'soleil' },
  550: { nom: 'Ancêtre Yomotsu', titre: 'le gardien des morts', voie: 'ermite', peau: 'cendre' },
  600: { nom: 'Le Premier Crapaud', titre: 'l’ancêtre de tous les ancêtres', voie: 'ermite', peau: 'ancetre' }
};
var ANCESTOR_TITLES = ['Ancêtre', 'Aïeul', 'Aïeule', 'Esprit', 'Ombre', 'Mânes de'];
var ANCESTOR_SKINS = ['nuit', 'cendre', 'orchidee', 'azur'];
function grandOf(f) { return f > TOWER_FLOORS ? GRAND_ANCESTORS[f] : GRAND_SAGES[f]; }
// les Reliques des Grands Ancêtres : des Légendaires qu'on ne trouve que là (stats fixes, de plus en plus fortes)
function mkRelic(f, slot, name, w, accent, desc) {
  var k = 70 + (f - 150) * 0.24, stats = {};
  Object.keys(w).forEach(function (s) { stats[s] = Math.round(w[s] * k); });
  var gold = ['#ff8c1a', '#a8501a', '#ffe0a0'], it = { slot: slot, name: name, stats: stats, drop: 0, reward: true, rarity: 'legendaire', relic: true, from: { tour: f }, desc: desc };
  if (slot === 'tete') { it.icon = 'bandeau'; it.look = { hat: 'bandeau' }; it.colors = { 1: accent[0], 2: accent[1], 3: gold[2], 4: gold[0] }; }
  else if (slot === 'echarpe') { it.icon = 'cape'; it.scarf = [accent[0], gold[0]]; it.look = { cape: true }; it.colors = { 1: accent[0], 2: accent[1], 3: gold[2], 4: gold[0], b: accent[1] }; }
  else if (slot === 'anneau') { it.icon = 'anneau_t'; it.colors = { 1: accent[0], 2: accent[1], 3: gold[2], 4: gold[0], b: gold[1] }; it.look = { ring: true }; }
  else { it.icon = 'ceinture_t'; it.colors = { 1: accent[0], 2: accent[1], 3: gold[2], 4: gold[0], b: gold[1] }; it.belt = [accent[0], gold[0]]; it.charm = gold[2]; it.look = { belt: true, charm: true }; }
  return it;
}
Object.assign(ITEMS, {
  relique_kurogane: mkRelic(150, 'tete', 'Bandeau de Kurogane', { force: 1, vitalite: 0.6 }, ['#5a5a6e', '#2a2a36'], 'Une plaque de fer noir, chaude comme une forge. Relique de l’étage 150.'),
  relique_yamikawa: mkRelic(200, 'echarpe', 'Cape de la Rivière de nuit', { agilite: 1, esprit: 0.5 }, ['#1a2a5a', '#0a1430'], 'Elle coule plus qu’elle ne flotte. Relique de l’étage 200.'),
  relique_shiranui: mkRelic(250, 'anneau', 'Anneau de Shiranui', { esprit: 1, force: 0.5 }, ['#ff6a3a', '#a82a1a'], 'Un feu y brûle, qui ne s’éteint pas sous l’eau. Relique de l’étage 250.'),
  relique_raigama: mkRelic(300, 'ceinture', 'Ceinture du Tonnerre ancestral', { force: 1, agilite: 0.5 }, ['#6af0ff', '#2a6ab0'], 'La boucle grésille. Relique de l’étage 300.'),
  relique_kagehime: mkRelic(350, 'tete', 'Bandeau des Ombres', { agilite: 1, vitalite: 0.6 }, ['#3a2a5a', '#14102a'], 'Qui le noue disparaît un peu. Relique de l’étage 350.'),
  relique_tsukimori: mkRelic(400, 'echarpe', 'Cape de la Lune gardée', { esprit: 1, vitalite: 0.6 }, ['#c8c8f0', '#6a6aa8'], 'Un tissu pâle qui brille la nuit. Relique de l’étage 400.'),
  relique_onamazu: mkRelic(450, 'anneau', 'Anneau du Séisme', { vitalite: 1, force: 0.6 }, ['#a8844a', '#5a3e1e'], 'Lourd comme une montagne, et elle tremble. Relique de l’étage 450.'),
  relique_hoshikuzu: mkRelic(500, 'echarpe', 'Cape de Poussière d’étoiles', { agilite: 0.8, esprit: 0.8, force: 0.4 }, ['#2a1a5a', '#0e0a2a'], 'On y voit tomber des étoiles. Relique de l’étage 500.'),
  relique_yomotsu: mkRelic(550, 'ceinture', 'Ceinture des Morts', { vitalite: 1, esprit: 0.6 }, ['#8af0c0', '#3a8a6a'], 'Froide, et pourtant elle tient chaud. Relique de l’étage 550.'),
  relique_premier: mkRelic(600, 'tete', 'Bandeau du Premier Crapaud', { force: 0.8, agilite: 0.8, vitalite: 0.8, esprit: 0.8 }, ['#e0b43a', '#8a6f1f'], 'Celui du tout premier ninja des mares. Relique du sommet.')
});
// (ce sont des modèles comme les autres : la liste des modèles, les icônes et towerTreasure les trouvent)
Object.keys(ITEMS).forEach(function (id) { if (ITEMS[id].relic && BASE_IDS.indexOf(id) < 0) BASE_IDS.push(id); });

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
function towerLevel(f) {
  if (isAncestor(f)) return Math.min(MAX_LEVEL, 150 + Math.round((f - TOWER_FLOORS) * 0.3)) + (f % 10 === 0 ? 3 : 0); // les Ancêtres : jusqu'au niveau maximum
  return 2 + Math.round(f * 1.4) + (f % 10 === 0 ? 3 : 0);
}
// Le trésor d'un étage (tous les 10), d'après ITEMS[...].from.tour
function towerTreasure(f) { return BASE_IDS.filter(function (id) { return ITEMS[id].from && ITEMS[id].from.tour === f; })[0] || null; }
function towerRewards(f) {
  var boss = f % 10 === 0, lvl = towerLevel(f), anc = isAncestor(f);
  // (chez les Ancêtres : bien plus de lucioles et d'XP, et une Relique tous les 50 étages)
  return { gold: Math.round((anc ? 60 + f * 14 : 15 + f * 6) * (boss ? 3 : 1)), xp: Math.round((10 + 5 * lvl) * (boss ? 2.2 : 0.8) * (anc ? 1.6 : 1)), item: boss ? towerTreasure(f) : null };
}

// La fiche de combat d'un sage (même format que celles du dojo) : tout est tiré de l'étage, donc toujours pareil
function towerCard(f) {
  var anc = isAncestor(f), boss = grandOf(f), r = function (k) { return hash(f, k, 77); };
  var voie = boss ? boss.voie : VOIES[Math.floor(r(1) * 3)].id, lvl = towerLevel(f);
  // ses points, répartis comme un joueur de sa voie le ferait
  var pts = Math.round((lvl - 1) * POINTS_PER_LEVEL * (boss ? 1 : 0.9)), share = {
    baton: { force: 0.45, vitalite: 0.4, agilite: 0.15, esprit: 0 },
    kunai: { agilite: 0.45, vitalite: 0.4, force: 0.15, esprit: 0 },
    ermite: { esprit: 0.45, vitalite: 0.4, force: 0.15, agilite: 0 }
  }[voie], alloc = {};
  Object.keys(share).forEach(function (k) { alloc[k] = Math.floor(pts * share[k]); });
  // ses dalles du temple : étape par étape dans ses trois branches (sa préférée d'abord), puis le sommet
  var left = lvl - 1, tree = [], fav = Math.floor(r(5) * BRANCHES), order = [fav, (fav + 1) % BRANCHES, (fav + 2) % BRANCHES];
  var take = function (n) { if (n && n.level <= lvl && n.cost <= left && n.req.every(function (q) { return tree.indexOf(q) >= 0; }) && (!n.reqAny || n.reqAny.some(function (q) { return tree.indexOf(q) >= 0; }))) { tree.push(n.id); left -= n.cost; } };
  for (var st = 1; st <= STEPS; st++) order.forEach(function (p) { take(TREE.filter(function (x) { return x.voie === voie && x.path === p && x.step === st; })[0]); });
  take(summitOf(voie));
  var deck = bestDeck(tree.map(nodeById).filter(function (n) { return n.skill; }).map(function (n) { return n.skill; }));
  // son équipement : ce qu'on trouve à cette hauteur (les objets de rang plus élevé en montant)
  var maxTier = anc ? Math.min(BIOMES.length, 7 + Math.floor((f - TOWER_FLOORS) / 28)) : 1 + Math.floor(f / 20), equip = {};
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
    id: 'tour-' + f, etage: f, boss: !!boss, major: f % 10 === 0, ancestor: anc, power: ancestorPower(f),
    nom: boss ? boss.nom : (anc ? ANCESTOR_TITLES[Math.floor(r(2) * ANCESTOR_TITLES.length)] : SAGE_TITLES[Math.floor(r(2) * SAGE_TITLES.length)]) + ' ' + SAGE_NAMES[Math.floor(r(3) * SAGE_NAMES.length)],
    titre: boss ? boss.titre : null, pseudo: 'étage ' + f,
    peau: boss ? boss.peau : (anc ? ANCESTOR_SKINS : SAGE_SKINS)[Math.floor(r(4) * (anc ? ANCESTOR_SKINS : SAGE_SKINS).length)],
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
    { top: '#241a4a', mid: '#4a3a8a', low: '#b86aa0', sun: '#f4f0d0', spire: '#2a4a5a', spireL: '#5a8aa0', far: '#5a4a8a' },
    // la Tour des Ancêtres : quatre nuits (crépuscule violet, encre, lune rouge, aurore des esprits)
    { top: '#0e0a1e', mid: '#2a1a44', low: '#5a3a6a', sun: '#e0d8ff', spire: '#1a1428', spireL: '#4a3a6a', far: '#2a2040', dark: true },
    { top: '#04040c', mid: '#0e1024', low: '#22243e', sun: '#c8d0f0', spire: '#10121e', spireL: '#2e3248', far: '#1a1c30', dark: true },
    { top: '#140408', mid: '#3a0e18', low: '#6a2a2a', sun: '#ff5a4a', spire: '#1e0c10', spireL: '#5a2420', far: '#2e1418', dark: true },
    { top: '#041418', mid: '#0e3a3a', low: '#2a6a5a', sun: '#a0fff0', spire: '#0a1e1e', spireL: '#2a6a5a', far: '#143030', dark: true }
  ];
  var cache = {};

  function scene(skyIndex, arena) {
    var W = arena ? 400 : 320, H = arena ? 225 : 180, FLOOR = arena ? 137 : 104; // l'arène a la taille des combats
    var S = SKIES[skyIndex % SKIES.length], D = !!S.dark;
    // la nuit des Ancêtres : la mousse violette, l'huile spectrale, le bois laqué de noir
    var C = D ? { moss: '#5a3a8a', mossL: '#8a6ac0', oil: ['#b0a0f0', '#8a7ad0', '#6a5ab0'], oilHi: '#e8e0ff', leaf: '#3a2a5a', leafD: '#24183a', lotus: ['#8a4ab0', '#b07ad0', '#6af0ff'], rail: '#3a1a3a', railL: '#6a2a5a', post: '#5a2a4a', postTop: '#c080ff', wood: ['#2a1e2e', '#34263a'], woodLine: '#14101a', lantern: ['#6af0ff', '#c8fff8'], cliff: '#3a3048', cliffTop: '#5a4a6a', statue: ['#3a3448', '#5a5068', '#1a1828', '#9aa0c0', '#6af0ff'] }
      : { moss: '#3fbf5a', mossL: '#6fd07a', oil: ['#ffd24a', '#f0b030', '#d89a28'], oilHi: '#fff6c0', leaf: '#3fbf5a', leafD: '#2a8a44', lotus: ['#ff6aa0', '#ff9ac0', '#ffe070'], rail: '#9a2a1f', railL: '#ff7a5a', post: '#c9412f', postTop: '#e0b43a', wood: ['#a8602a', '#b8703a'], woodLine: '#6a3a1a', lantern: ['#ff9a3a', '#ffd08a'], cliff: '#4a6a4a', cliffTop: '#6fd07a', statue: ['#6a7a70', '#8a9a90', '#3a4440', '#d8e0d8', '#5fbf6a'] };
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
    if (D || skyIndex % 4 === 3) for (var s = 0; s < (D ? 90 : 50); s++) r(hash(s, 1, 9) * W, hash(s, 2, 9) * 70, 1, 1, '#fff6d8'); // étoiles
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
        r(x - w / 2 + 1, top - 3, w - 2, 3, C.moss); r(x - w / 2 + 4, top - 5, w - 8, 2, C.mossL); // mousse sur le sommet
      }
    }
    spires(FLOOR + 6, S.far, S.far, 1, 11, 30, 60);
    spires(FLOOR + 14, S.spire, S.spireL, 2, 9, 40, 80);
    // la cascade d'huile dorée, d'une falaise à droite
    r(W - 34, 40, 34, FLOOR - 24, C.cliff); r(W - 34, 40, 34, 3, C.cliffTop);
    for (var wy = 43; wy < FLOOR - 16; wy++) for (var wx = W - 28; wx < W - 16; wx++) r(wx, wy, 1, 1, (wx + wy * 2) % 7 === 0 ? C.oilHi : ((wx + wy) % 3 ? C.oil[0] : C.oil[1]));
    // une statue de grenouille en pierre sur son rocher, à gauche
    r(8, 72, 44, 40, C.statue[0]); r(8, 72, 44, 3, C.statue[1]);
    var frog = ['....kkk....kkk....', '...kwwwk..kwwwk...', '...kwkwkkkkwkwk...', '..kssssssssssssk..', '.kssssssssssssssk.', '.ksskkkkkkkkksssk.', '.kssssssssssssssk.', 'kssssssssssssssssk', 'kssssmssssssmssssk', '.kkkkkkkkkkkkkkkk.'];
    frog.forEach(function (row, yy) { row.split('').forEach(function (ch, xx) { if (ch !== '.') { r(12 + xx * 2, 50 + yy * 2, 2, 2, { k: C.statue[2], w: C.statue[3], s: C.statue[1], m: C.statue[4] }[ch]); } }); });
    // feuilles géantes et fleurs de lotus, au premier plan des côtés
    function leaf(cx, cy, rw, rh, col, colD) {
      for (var yy = -rh; yy <= rh; yy++) { var hw = Math.round(rw * Math.sqrt(1 - (yy * yy) / (rh * rh))); r(cx - hw, cy + yy, hw * 2, 1, yy > rh / 3 ? colD : col); }
      r(cx - rw + 2, cy, rw * 2 - 4, 1, colD); r(cx, cy - rh + 1, 1, rh * 2 - 2, colD);
    }
    leaf(18, FLOOR + 14, 26, 7, C.leaf, C.leafD); leaf(W - 20, FLOOR + 8, 24, 6, C.leaf, C.leafD); leaf(60, FLOOR + 20, 16, 4, C.leaf, C.leafD);
    [[48, FLOOR + 2], [W - 44, FLOOR - 4]].forEach(function (fl) { r(fl[0] - 5, fl[1], 11, 5, C.lotus[0]); r(fl[0] - 3, fl[1] - 4, 7, 5, C.lotus[1]); r(fl[0] - 1, fl[1] - 1, 3, 2, C.lotus[2]); });
    if (!arena) { // la page : au pied de la tour, un étang d'huile dorée semé de lotus, entre deux rives d'herbe
      for (var py = FLOOR - 6; py < H; py++) {
        var k2 = (py - FLOOR + 6) / (H - FLOOR + 6);
        r(0, py, W, 1, py % 3 === 0 ? C.oilHi : (k2 < 0.3 ? C.oil[0] : (k2 < 0.7 ? C.oil[1] : C.oil[2])));
      }
      for (var rp = 0; rp < 40; rp++) r(hash(rp, 5, 13) * W, FLOOR + hash(rp, 6, 13) * (H - FLOOR), 8 + hash(rp, 7, 13) * 10, 1, 'rgba(255, 250, 200, 0.55)'); // reflets
      [[40, 130, 12], [96, 160, 9], [210, 140, 11], [262, 166, 13], [150, 172, 8], [300, 126, 7]].forEach(function (lp) { leaf(lp[0], lp[1], lp[2], Math.round(lp[2] / 3), C.leaf, C.leafD); });
      [[96, 154], [262, 159]].forEach(function (fl) { r(fl[0] - 4, fl[1], 9, 4, C.lotus[0]); r(fl[0] - 2, fl[1] - 3, 5, 4, C.lotus[1]); r(fl[0] - 1, fl[1] - 1, 2, 2, C.lotus[2]); });
      for (var gx = 0; gx < W; gx++) { var gh = 3 + Math.round(hash(gx, 8, 13) * 4); r(gx, FLOOR - 8 - gh, 1, gh + 3, gx % 5 ? C.moss : C.mossL); } // la rive
      var vg0 = ctx.createRadialGradient(W / 2, 110, 60, W / 2, 110, 230);
      vg0.addColorStop(0, 'rgba(0, 0, 0, 0)'); vg0.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      ctx.fillStyle = vg0; ctx.fillRect(0, 0, W, H);
      return c;
    }
    // le sol : la terrasse de bois laqué d'un étage de la tour
    r(0, FLOOR - 10, W, 3, C.rail); r(0, FLOOR - 7, W, 7, 'rgba(0, 0, 0, 0.15)');
    for (var px = 4; px < W; px += 22) { r(px, FLOOR - 22, 3, 22, C.post); r(px, FLOOR - 24, 5, 3, C.postTop); } // balustrade
    r(0, FLOOR - 22, W, 3, C.post); r(0, FLOOR - 23, W, 1, C.railL);
    for (var fy = FLOOR; fy < H; fy++) {
      var plank = Math.floor((fy - FLOOR) / 9), shade = plank % 2 ? C.wood[0] : C.wood[1];
      r(0, fy, W, 1, (fy - FLOOR) % 9 === 0 ? C.woodLine : shade);
    }
    for (var k = 0; k < 90; k++) r(hash(k, 3, 11) * W, FLOOR + hash(k, 4, 11) * (H - FLOOR), 6, 1, 'rgba(90, 40, 15, 0.35)'); // veines du bois
    if (arena) { // le cercle d'épreuve, peint sur la terrasse
      ctx.strokeStyle = 'rgba(255, 240, 180, 0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(W / 2, FLOOR + 32, 150, 18, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // des lanternes flottantes le soir
    if (D || skyIndex % 4 >= 2) [[80, 30], [120, 58], [200, 36], [170, 70]].forEach(function (l) { r(l[0], l[1], 5, 7, C.lantern[0]); r(l[0] + 1, l[1] + 1, 3, 5, C.lantern[1]); });
    var vg = ctx.createRadialGradient(W / 2, 110, 60, W / 2, 110, 230);
    vg.addColorStop(0, 'rgba(0, 0, 0, 0)'); vg.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    return c;
  }
  function skyOf(f) { return isAncestor(f) ? 4 + Math.floor((f - TOWER_FLOORS - 1) / 50) % 4 : Math.floor((Math.max(1, f) - 1) / 10) % 4; }
  return {
    W: W, H: H, SKIES: SKIES, skyOf: skyOf,
    backdrop: function (f) { var k = 'b' + skyOf(f); return cache[k] || (cache[k] = scene(skyOf(f), false)); },
    arena: function (f) { var k = 'a' + skyOf(f); return cache[k] || (cache[k] = scene(skyOf(f), true)); }
  };
})();

// ---------- La page de la tour : une pagode entre deux cascades ----------
// La tour est dessinée étage par étage en pixel art (toit de tuiles de jade aux coins relevés, murs de papier
// aux fenêtres allumées, piliers laqués, balcon et lanternes ; les Grands Sages ont un toit d'or), au milieu d'une
// gorge : deux falaises en gradins d'où tombent des cascades, un bassin au pied, la brume, et les étages du haut
// qui se perdent dans les nuages. render() compose l'image fixe et renvoie la place de chaque étage (pour les
// boutons de la page) ; animate() la redessine avec l'eau qui coule.
var TowerPage = (function () {
  var TW = 88, TH = 36, state = null, bgCache = {};

  // le décor, qui ne dépend que de la taille et du ciel
  function background(W, H, cx, sky) {
    var key = W + 'x' + H + ':' + Math.round(cx) + ':' + sky;
    if (bgCache[key]) return bgCache[key];
    var S = TowerScene.SKIES[sky], c = document.createElement('canvas'), D = !!S.dark;
    var C = D ? { cliff: ['#1e1828', '#261e32', '#2e263c'], top: '#5a3a8a', topD: '#3a2a5a', fall: ['#4a3a7a', '#e8e0ff', '#9a8ad0', '#7a6ab0'], foam: '#d0c8ff', pool: ['#2a2244', '#120e22'], mist: '255, 240, 255', leaf: ['#5a3a8a', '#3a2a5a'], peak: '#4a3a6a' }
      : { cliff: ['#2f5a4a', '#3a6655', '#447360'], top: '#6fd07a', topD: '#3f9a4a', fall: ['#4fa8c8', '#e8fbff', '#8ed8f0', '#6cc4e4'], foam: '#dff8ff', pool: ['#5fbad8', '#2f8fb0'], mist: '255, 255, 255', leaf: ['#5fbf6a', '#3f9a4a'], peak: '#7fcf9a' };
    c.width = W; c.height = H;
    var ctx = c.getContext('2d'), falls = [];
    var r = function (x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, S.top); g.addColorStop(0.5, S.mid); g.addColorStop(0.85, S.low);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // le soleil (ou la lune), un peu à droite de la tour
    var sx = cx + 70, sy = H * 0.2, halo = ctx.createRadialGradient(sx, sy, 8, sx, sy, 90);
    halo.addColorStop(0, S.sun + 'aa'); halo.addColorStop(1, S.sun + '00');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
    for (var y = -20; y <= 20; y++) { var hw = Math.round(Math.sqrt(400 - y * y)); r(sx - hw, sy + y, hw * 2, 1, S.sun); }
    if (sky === 3 || D) for (var st = 0; st < 80; st++) r(hash(st, 1, 61) * W, hash(st, 2, 61) * H * 0.5, 1, 1, '#fff6d8');
    // des pics lointains
    for (var i = 0; i < 16; i++) {
      var px = hash(i, 3, 61) * W, pw = 12 + hash(i, 4, 61) * 22, ph = 40 + hash(i, 5, 61) * 70, base = H * 0.72;
      if (Math.abs(px - cx) < 80) continue; // la pagode se détache sur le ciel
      r(px - pw / 2, base - ph, pw, ph + 40, S.far); r(px - pw / 2 + 2, base - ph - 4, pw - 4, 5, S.far); r(px - pw / 2 + 1, base - ph - 6, pw - 2, 3, C.peak);
    }
    // des nuages en ruban
    for (var k = 0; k < 7; k++) { var cy2 = H * (0.1 + hash(k, 6, 61) * 0.45), cx2 = hash(k, 7, 61) * W, cw = 40 + hash(k, 8, 61) * 70; r(cx2, cy2, cw, 4, 'rgba(255, 245, 250, 0.55)'); r(cx2 + 8, cy2 - 3, cw - 24, 3, 'rgba(255, 245, 250, 0.45)'); }
    // deux falaises en gradins, avec leurs cascades
    function cliff(side) {
      var inner = side < 0 ? cx - 70 : cx + 70, outer = side < 0 ? 0 : W, steps = [0.22, 0.42, 0.62];
      steps.forEach(function (sy2, n) {
        var top = Math.round(H * sy2), from = inner + side * (n * 26), to = outer;
        var x0 = Math.min(from, to), x1 = Math.max(from, to);
        for (var x = x0; x < x1; x++) {
          var t2 = top + Math.round(Math.sin(x * 0.21 + n) * 2 + hash(x, n + 10, 61) * 2);
          r(x, t2, 1, H - t2, C.cliff[n]);
          r(x, t2, 1, 3, C.top); r(x, t2 + 3, 1, 2, C.topD);
          if (hash(x, n + 20, 61) < 0.08) r(x, t2 + 5, 1, 6 + hash(x, n + 30, 61) * 14, C.topD);
        }
        // la cascade qui tombe de ce gradin
        var fw = 10 + n * 3, fx = from + side * (8 + n * 4) - (side < 0 ? fw : 0), fTop = top + 1;
        if (fx > 2 && fx + fw < W - 2) {
          for (var xx = fx; xx < fx + fw; xx++) for (var yy = fTop; yy < H - 18; yy++) {
            var edge = xx === fx || xx === fx + fw - 1, v = (yy + Math.floor(hash(xx, 40, 61) * 30)) % 13;
            r(xx, yy, 1, 1, edge ? C.fall[0] : (v < 2 ? C.fall[1] : (hash(xx, 41, 61) < 0.5 ? C.fall[2] : C.fall[3])));
          }
          r(fx - 1, fTop - 1, fw + 2, 2, C.foam);
          falls.push({ x: fx, w: fw, top: fTop, bottom: H - 18 });
        }
      });
    }
    cliff(-1); cliff(1);
    // le bassin au pied de la tour
    var bg = ctx.createLinearGradient(0, H - 22, 0, H);
    bg.addColorStop(0, C.pool[0]); bg.addColorStop(1, C.pool[1]);
    ctx.fillStyle = bg; ctx.fillRect(0, H - 22, W, 22);
    for (var rp = 0; rp < 60; rp++) r(hash(rp, 50, 61) * W, H - 20 + hash(rp, 51, 61) * 20, 5 + hash(rp, 52, 61) * 10, 1, 'rgba(232, 251, 255, 0.5)');
    falls.forEach(function (f) { for (var e = 0; e < 3; e++) r(f.x - 6 + e * 2, H - 20 + e * 2, f.w + 12 - e * 4, 2, e ? 'rgba(255, 255, 255, 0.7)' : '#ffffff'); });
    [[0.12, 10], [0.3, 8], [0.7, 9], [0.88, 11]].forEach(function (lp) { var lx = lp[0] * W; for (var yy2 = -2; yy2 <= 2; yy2++) r(lx - lp[1] + Math.abs(yy2) * 2, H - 10 + yy2, (lp[1] - Math.abs(yy2) * 2) * 2, 1, yy2 < 0 ? C.leaf[0] : C.leaf[1]); });
    // la brume des cascades
    var mist = ctx.createLinearGradient(0, H - 70, 0, H - 10);
    mist.addColorStop(0, 'rgba(' + C.mist + ', 0)'); mist.addColorStop(0.7, 'rgba(' + C.mist + ', ' + (D ? 0.12 : 0.3) + ')'); mist.addColorStop(1, 'rgba(' + C.mist + ', 0)');
    ctx.fillStyle = mist; ctx.fillRect(0, H - 70, W, 60);
    return (bgCache[key] = { canvas: c, falls: falls });
  }

  // un étage de la pagode ; y = le haut du toit
  function tier(ctx, cx, y, opts) {
    var r = function (x, yy, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(yy), Math.round(w), Math.round(h)); };
    var boss = opts.boss, D = opts.dark, roofA = boss ? (D ? '#c8a050' : '#f3a04a') : (D ? '#4a3a6e' : '#26b8a4'), roofB = boss ? (D ? '#8a6a2a' : '#e07a2a') : (D ? '#2e2448' : '#1a8a7a'), ridge = boss ? '#fff0a0' : (D ? '#c080ff' : '#e0b43a');
    var paper = D ? '#2a2238' : '#f4e0b8', lath = D ? '#1a1424' : '#c8a06a', pillar = D ? '#5a2a4a' : '#c9412f', pillarL = D ? '#8a4a7a' : '#e0604a', lamp = D ? '#6af0ff' : '#ffd070', lampOff = D ? '#3a3a5a' : '#e8c890';
    // le toit : des rangées de tuiles qui s'élargissent, les coins qui se relèvent
    for (var i = 0; i < 12; i++) {
      var w = TW - 34 + i * 4.4;
      r(cx - w / 2, y + i, w, 1, i === 0 ? ridge : (i % 2 ? roofA : roofB));
    }
    r(cx - TW / 2 - 11, y + 9, 4, 1, roofA); r(cx + TW / 2 + 7, y + 9, 4, 1, roofA); // les coins relevés
    r(cx - TW / 2 - 12, y + 8, 2, 1, ridge); r(cx + TW / 2 + 10, y + 8, 2, 1, ridge);
    r(cx - TW / 2 - 6, y + 12, TW + 12, 2, '#0f3a34');
    if (opts.spire) { r(cx - 1, y - 12, 2, 12, ridge); r(cx - 3, y - 6, 6, 2, ridge); r(cx - 2, y - 14, 4, 3, '#ff9a3a'); }
    // le mur : piliers laqués, papier, fenêtres allumées, la porte au milieu
    var wy = y + 14, wh = 16, ww = TW - 14;
    r(cx - ww / 2, wy, ww, wh, paper);
    for (var lx = cx - ww / 2 + 3; lx < cx + ww / 2; lx += 5) r(lx, wy, 1, wh, lath);
    r(cx - ww / 2, wy + 7, ww, 1, lath);
    [-1, 1].forEach(function (sd) { r(cx + sd * 22 - 5, wy + 3, 10, 8, opts.lit ? lamp : lampOff); r(cx + sd * 22 - 5, wy + 7, 10, 1, lath); r(cx + sd * 22, wy + 3, 1, 8, lath); });
    r(cx - ww / 2, wy, 5, wh, pillar); r(cx + ww / 2 - 5, wy, 5, wh, pillar); r(cx - ww / 2 + 1, wy, 1, wh, pillarL);
    r(cx - 8, wy + 1, 16, wh - 1, D ? '#0a0612' : '#3a1a0a'); r(cx - 9, wy, 1, wh, pillar); r(cx + 8, wy, 1, wh, pillar); r(cx - 9, wy, 18, 1, ridge);
    // les lanternes sous l'avant-toit
    [-1, 1].forEach(function (sd) { var lxx = cx + sd * (TW / 2 + 2); r(lxx - 1, y + 13, 1, 2, '#3a1a0a'); r(lxx - 2, y + 15, 3, 4, D ? '#3a8aa0' : '#ff6a3a'); r(lxx - 1, y + 16, 1, 2, D ? '#c8fff8' : '#ffd08a'); });
    // le balcon
    var by = wy + wh;
    r(cx - TW / 2 - 4, by, TW + 8, 3, D ? '#2a1a2e' : '#6a3418'); r(cx - TW / 2 - 4, by + 3, TW + 8, 2, D ? '#0e0a14' : '#3a1a0a');
    for (var p = cx - TW / 2 - 3; p < cx + TW / 2 + 4; p += 6) r(p, by - 4, 1, 4, pillar);
    r(cx - TW / 2 - 4, by - 5, TW + 8, 1, ridge);
    if (opts.locked) { ctx.fillStyle = 'rgba(60, 60, 90, 0.4)'; ctx.fillRect(cx - TW / 2 - 12, y, TW + 24, TH); }
  }

  function render(canvas, o) {
    var W = Math.ceil(o.w / o.s), H = Math.ceil(o.h / o.s), cx = Math.round(o.cx);
    var bgd = background(W, H, cx, o.sky), base = document.createElement('canvas');
    base.width = W; base.height = H;
    var ctx = base.getContext('2d');
    ctx.drawImage(bgd.canvas, 0, 0);
    var r = function (x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    // la base de pierre, posée dans le bassin (quand on regarde le bas de la tour)
    var B0 = o.base || 1, TOP = o.top || TOWER_FLOORS, dark = !!TowerScene.SKIES[o.sky].dark;
    var yBase = o.view === B0 ? H - 30 : H + Math.round(TH * 0.4);
    if (o.view === B0) {
      for (var s = 0; s < 3; s++) { var sw = TW + 40 - s * 12; r(cx - sw / 2, yBase + s * 5, sw, 5, s % 2 ? '#7a8a80' : '#8a9a90'); r(cx - sw / 2, yBase + s * 5, sw, 1, '#b0c0b4'); }
      r(cx - 14, yBase - 2, 28, 18, '#9aaa9e'); for (var st = 0; st < 5; st++) r(cx - 14, yBase + st * 3, 28, 1, '#6a7a70'); // l'escalier
      r(cx - TW / 2 - 26, yBase + 14, TW + 52, 4, '#ffffff'); // l'écume au pied
    }
    var floors = [], topShown = Math.min(TOP, o.next + 3);
    // les étages, du bas vers le haut
    for (var f = Math.max(B0, o.view - 1); f <= TOP; f++) {
      var y = yBase - (f - o.view + 1) * TH;
      if (y + TH < 0) break;
      if (f > topShown + 1) break;
      tier(ctx, cx, y, { boss: f % 10 === 0, locked: f > o.next, lit: f <= o.next, spire: f === TOP, dark: dark });
      floors.push({ f: f, x: cx - TW / 2 - 12, y: y, w: TW + 24, h: TH, door: { x: cx, y: y + 14 }, balcony: y + 30 });
    }
    // au-dessus, la tour se perd dans les nuages
    var cloudY = yBase - (topShown - o.view + 1) * TH;
    if (topShown < TOP && cloudY > -20) {
      // des boules de nuage, pixel par pixel : le dessous un peu rosé, le dessus bien blanc
      var puff = function (px0, py0, rad) {
        for (var dy = -rad; dy <= rad; dy++) {
          var hw = Math.round(Math.sqrt(rad * rad - dy * dy) * 1.4);
          r(px0 - hw, py0 + dy, hw * 2, 1, dark ? (dy > rad * 0.35 ? '#2a2240' : (dy < -rad * 0.5 ? '#5a4a7a' : '#3e3458')) : (dy > rad * 0.35 ? '#f0dce4' : (dy < -rad * 0.5 ? '#ffffff' : '#fbf4f6')));
        }
      };
      for (var cyy = cloudY + 10, row = 0; cyy > -24; cyy -= 11, row++) {
        for (var n = 0; n < 6; n++) puff(cx - 78 + hash(n, row, 63) * 156, cyy + hash(n, row + 7, 63) * 6, 7 + Math.round(hash(n, row + 3, 63) * 7));
      }
      var fade = ctx.createLinearGradient(0, cloudY + 20, 0, cloudY - 20);
      fade.addColorStop(0, dark ? 'rgba(42, 34, 64, 0)' : 'rgba(255, 248, 250, 0)'); fade.addColorStop(1, dark ? 'rgba(42, 34, 64, 0.95)' : 'rgba(255, 248, 250, 0.95)');
      ctx.fillStyle = fade; ctx.fillRect(cx - 90, cloudY - 20, 180, 40);
    }
    canvas.width = W; canvas.height = H;
    canvas.style.width = W * o.s + 'px'; canvas.style.height = H * o.s + 'px';
    state = { canvas: canvas, base: base, falls: bgd.falls, W: W, H: H };
    animate(performance.now());
    return { s: o.s, floors: floors, cloudY: cloudY };
  }
  // l'eau qui coule, par-dessus l'image fixe
  function animate(now) {
    if (!state) return;
    var ctx = state.canvas.getContext('2d'), t = now / 1000;
    ctx.drawImage(state.base, 0, 0);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    state.falls.forEach(function (f, i) {
      for (var k = 0; k < Math.ceil((f.bottom - f.top) / 14); k++) {
        var x = f.x + 1 + hash(i, k, 64) * (f.w - 2), len = f.bottom - f.top, y = f.top + ((t * (50 + hash(i, k + 9, 64) * 40) + hash(i, k + 3, 64) * len) % len);
        ctx.fillRect(Math.round(x), Math.round(y), 1, 3);
      }
    });
  }
  return { TW: TW, TH: TH, render: render, animate: animate };
})();

// l'eau dorée qui coule dans l'arène de la tour
TowerScene.arenaFx = function (ctx, now) {
  var t = now / 1000;
  ctx.fillStyle = 'rgba(255, 250, 200, 0.85)';
  for (var i = 0; i < 12; i++) ctx.fillRect(372 + Math.round(hash(i, 1, 65) * 11), 43 + Math.round((t * (40 + hash(i, 2, 65) * 30) + hash(i, 3, 65) * 76) % 76), 1, 3);
};
