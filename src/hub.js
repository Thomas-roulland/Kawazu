// Menu et pages du jeu : écran titre (création de la grenouille), Camp, Personnage (fiche façon Shakes & Fidget),
// La Voie (le Temple : arbre + deck), Carte du monde, Monde (10 étapes : combat ou mission en temps réel) et Boutique.
(function () {
  var sp = buildKawazu();
  var save = loadSave();
  var $ = function (id) { return document.getElementById(id); };
  var state = { page: 'camp', view: 'face', filter: 'tout', selected: null, node: null, ware: null, sheet: null, pick: null };

  var owns = function (id) { return save.owned.indexOf(id) >= 0; };
  var statName = function (id) { return STATS.filter(function (s) { return s.id === id; })[0].name; };
  var fmt = function (v) { return (v > 0 ? '+' : '') + v; };
  var pad = function (rows, n) { return rows.map(function (r) { return (r + '.'.repeat(n)).slice(0, n); }); };
  var voieOf = function (id) { return VOIES.filter(function (v) { return v.id === id; })[0]; };
  var heroName = function () { return save.hero ? save.hero.name : 'Kawazu'; };
  var persist = function () { writeSave(save); };
  var mmss = function (ms) { var s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); };

  // Icônes des objets, dessinées à la première demande (un exemplaire a l'icône de son modèle)
  var lazyIcons = function (locked) {
    var cache = {};
    return new Proxy(cache, { get: function (t, id) { if (typeof id !== 'string') return undefined; var it = ITEMS[id] || ITEMS[baseOf(id)]; return it ? (t[id] || (t[id] = iconCanvas(it, locked).toDataURL())) : ''; } });
  };
  var iconUrls = lazyIcons(false), lockedUrls = lazyIcons(true);
  var rarStyle = function (id) { return '--rar:' + RARITIES[rarityOf(id)].color; };
  var rarTag = function (id) { var r = rarityOf(id); return '<span class="rar-tag" style="' + rarStyle(id) + '">' + (ITEMS[id] && ITEMS[id].reward ? 'Trésor' : RARITIES[r].name) + '</span>'; };
  var statLine = function (stats) { return Object.keys(stats).map(function (k) { return '<span class="' + (stats[k] < 0 ? 'st-down' : 'st-up') + '">' + statName(k) + ' ' + fmt(stats[k]) + '</span>'; }).join(' · '); };

  // ---------- Icônes (pixel art 16×16) ----------
  var ICONS16 = {
    camp: [['', '.......kk', '......k33k', '.....k3333k', '....k333333k', '...k33333333k', '..kkkkkkkkkkkk', '...k11111111k', '...k1kk11441k', '...k1kk11441k', '...k1kk11111k', '...k1kk11111k', '...kkkkkkkkkk'],
      { k: '#1a1c2c', 3: '#c9a24a', 1: '#7a5634', 4: '#f3d27a' }],
    perso: [['', '..kkkk....kkkk', '.kwwwwk..kwwwwk', '.kwwkwk..kwkwwk', '.kgwwgkkkkgwwgk', 'kggggggggggggggk', 'kgghgggggggghggk', 'kgggkkkkkkkkgggk', '.kggggggggggggk', '..krrrrrrrrrrk', '..kkkkkkkkkkkk'],
      { k: '#1a1c2c', w: '#f4f4e8', g: '#4e9a45', h: '#e8897a', r: '#c9412f' }],
    skills: [['', '......kkkk', '.....k3333k', '.....k3333k', '......kkkk', '.......kk', '......k..k', '.....k....k', '..kkkk....kkkk', '.k1111k..k2222k', '.k1111k..k2222k', '..kkkk....kkkk'],
      { k: '#1a1c2c', 1: '#8fce52', 2: '#9cc7e0', 3: '#e0b43a' }],
    donjons: [['', '..kk.kk..kk.kk', '..k1kk1kk1kk1k', '..k1111111111k', '..k1111111111k', '..k111kkkk111k', '..k11k2222k11k', '..k1k222222k1k', '..k1k222222k1k', '..k1k222222k1k', '..k1k222222k1k', '..kkkkkkkkkkkk'],
      { k: '#1a1c2c', 1: '#8a8f99', 2: '#1a2430' }],
    skins: [['.......kk', '......k..k', '.........k', '........k', '...kkkkkkkkkk', '..k2222ww2222k', '.k22222ww22222k', 'k222k2w22w2k222k', 'k22kk2w22w2kk22k', '.kk.k2w22w2k.kk', '....k2yyyy2k', '....k222222k', '....k222222k', '....k222222k', '....kkkkkkkk'],
      { k: '#1a1c2c', 2: '#c9412f', w: '#f4f4e8', y: '#e0b43a' }],
    shop: [['', '....kkkkkkkk', '...k........k', '...k........k', '..kkkkkkkkkkkk', '.k222222222222k', '.k233333333332k', '.k222222222222k', '.k222kkkkk2222k', '.k222k444k2222k', '.k222k444k2222k', '.kkkkkkkkkkkkkk'],
      { k: '#1a1c2c', 2: '#7a5634', 3: '#c9412f', 4: '#f3d27a' }],
    paume: [['', '....kk....kk', '...k33k..k33k', '...k33k..k33k', '....kk....kk', '.kk..........kk', 'k33k.kkkkkk.k33k', 'k33kk333333kk33k', '.kkk33333333kkk', '...k33333333k', '...k33333333k', '....k333333k', '.....kkkkkk'],
      { k: '#1a1c2c', 3: '#e0b43a' }],
    tour: [['.......kk.......', '......k33k......', '..kkkkkkkkkkkk..', '.k222222222222k.', '..kkk1kkkk1kkk..', '....k1k44k1k....', '....k1k44k1k....', '.kkkkkkkkkkkkkk.', 'k22222222222222k', '.kkk1kkkkkk1kkk.', '...k1k4444k1k...', '...k1k4444k1k...', '..kkkkkkkkkkkk..'],
      { k: '#1a1c2c', 2: '#1f9a8a', 1: '#c9412f', 3: '#f3d27a', 4: '#f4e8c8' }],
    album: [['', '..kkkkkkkkkkk...', '..k2222222221k..', '..k2kkkkkk221k..', '..k2k3333k221k..', '..k2k3kk3k221k..', '..k2k3333k221k..', '..k2kkkkkk221k..', '..k2222222221k..', '..k2222222221k..', '..kkkkkkkkkkkk..', '...k11111111k...', '...kkkkkkkkkk...'],
      { k: '#1a1c2c', 2: '#7a5634', 1: '#f4e8c8', 3: '#e0b43a' }],
    cascade: [['.kkkkk....kkkkk.', 'k3333kbbbbk3333k', 'k333kbwbbwbk333k', 'k33kbbwbbwbbk33k', 'k33kbbbbwbbbk33k', 'k3kbwbbbwbbwbk3k', 'k3kbwbbbbbbwbk3k', 'kkkbbwbbwbbbbkkk', '...kbbwbbwbbbk..', '..kwbbbbbbbbwk..', '.kwwwbwwwbwwwwk.', 'kwwwwwwwwwwwwwwk', '.kkkkkkkkkkkkkk.'],
      { k: '#1a1c2c', 3: '#5a6a60', b: '#4fb0d8', w: '#e8fbff' }],
    rank: [['', '...kkkkkkkkkk', '.kkk44333333kkk', 'k..k43333333k..k', 'k..k43333333k..k', '.k.k43333333k.k', '..kk43333333kk', '....k433333k', '.....k3333k', '......k33k', '......k33k', '.....k3333k', '....kkkkkkkk', '....k222222k', '....kkkkkkkk'],
      { k: '#1a1c2c', 3: '#e0b43a', 4: '#fff6b0', 2: '#7a5634' }],
    clan: [['...kk', '..kyyk', '...kkkkkkkkkkk', '...kpk22222222k', '...kpk2gg22gg2k', '...kpk2gwggwg2k', '...kpk2gggggg2k', '...kpk22gggg22k', '...kpk22222222k', '...kpk2k2222k2k', '...kpkk.k22k.kk', '...kpk...kk', '...kpk', '...kpk', '...kpk', '...kkk'],
      { k: '#1a1c2c', y: '#e0b43a', p: '#7a5634', 2: '#c9412f', g: '#4e9a45', w: '#f4f4e8' }],
    onde: [['....kkk', '...k333kk', '...kk1133k', '.....kk113k', '.......kk13k', '........k13k', '.........k13k', '.........k13k', '.........k13k', '........k13k', '.......kk13k', '.....kk113k', '...kk1133k', '...k333kk', '....kkk'],
      { k: '#1a1c2c', 1: '#3fbf8a', 3: '#c8f0d8' }],
    pied: [['', '......kkkk', '.....kmmmmk', '.....kmmmlk', '.....kmmmlk', '....kmmmmlk', '....kmmmmk', '...kmmmmmk', '..kmmmmmmk', '.kmlmmmmmmkkk', 'kmlmmmmmmmmmmk', 'kmmmlmmmlmmlmk', '.kkkkkkkkkkkkk'],
      { k: '#1a1c2c', m: '#e07a2a', l: '#f8b060' }],
    crapaud: [['', '..kkk......kkk', '.kEEEk....kEEEk', '.kEkEkkkkkkEkEk', 'kmmmmmmmmmmmmmmk', 'kmZmmmmmmmmmmZmk', 'kmmmmmmmmmmmmmmk', 'kmkkkkkkkkkkkkmk', '.kmmmmmmmmmmmmk', '..kkkkkkkkkkkk'],
      { k: '#1a1c2c', m: '#e07a2a', E: '#f3d23a', Z: '#b8321a' }],
    ombre: [['', '....kkkkkkkk', '...k22222222k', '..k2222222222k', '..k2kkkkkkkk2k', '..k2kwkkkkwk2k', '..k2kkkkkkkk2k', '..k2222222222k', '...k22222222k', '....k222222k', '.....kkkkkk'],
      { k: '#1a1c2c', 2: '#4a3a6b', w: '#b8e0ff' }],
    donjon: [['....kkkkkkkk', '..kk22222222kk', '.k222kkkkkk222k', '.k22k111111k22k', 'k22k11111111k22k', 'k22k11k11k11k22k', 'k22k11111111k22k', 'k22k11k11k11k22k', 'k22k11111111k22k', 'k22k111y1111k22k', 'k22k11111111k22k', 'k22k11111111k22k', 'kkkkkkkkkkkkkkkk'],
      { k: '#1a1c2c', 2: '#8a8478', 1: '#5a3e25', y: '#e0b43a' }],
    titan: [['', '....kkkkkkk', '...k1111111k', '..k111111111k', '.k11kkk1kkk11k', '.k11kyk1kyk11k', '.k11kkk1kkk11k', '.k11111111111k', '..k1k1k1k1k1k', '.k1kk1kk1kk1k', 'k1k.k1k.k1k.k1k', 'k1k.k1k.k1k.k1k', '.k...k...k...k'],
      { k: '#1a1c2c', 1: '#7a5ac8', y: '#ffe040' }],
    eclat: [['', '......kk', '.....k33k', '....k3113k', '....k3112k', '...k31112k', '...k31122k', '..k311122k', '..k311222k', '...k1122k', '...k1222k', '....k22k', '.....kk'],
      { k: '#1a1c2c', 1: '#4fd0a0', 2: '#1f8a6a', 3: '#c8fff0' }],
    coffre: [['', '', '..kkkkkkkkkkkk', '.k222222222222k', '.k2y22222222y2k', 'kkkkkkkkkkkkkkkk', 'k11111kyyk11111k', 'k11111kyyk11111k', 'k11111kkkk11111k', 'k11111111111111k', 'k22222222222222k', 'kkkkkkkkkkkkkkkk'],
      { k: '#1a1c2c', 1: '#a8642a', 2: '#7a4418', y: '#f3d27a' }],
    the: [['', '', '......k.k', '.......k.k', '...kkkkkkkkk', '..k111111111kk', '..k122222221k.k', '..k122222221k.k', '..k112222211kk', '...k1111111k', '....kkkkkkk', '..kkkkkkkkkkk'],
      { k: '#1a1c2c', 1: '#e8ecf0', 2: '#8fce52' }]
  };
  var ICON = {};
  Object.keys(ICONS16).forEach(function (k) { ICON[k] = stringsToCanvas(pad(ICONS16[k][0], 16), ICONS16[k][1]).toDataURL(); });
  Array.prototype.forEach.call(document.querySelectorAll('img[data-ico]'), function (img) { img.src = ICON[img.dataset.ico]; });
  var VOIE_ICON = { baton: iconUrls.baton_roseau, kunai: iconUrls.kunai_acier, ermite: ICON.paume };
  // l'icône de chaque branche : Bâton, Katana, Colosse · Kunaï, Shuriken, Ombre · Paume, Pieds et tête, Crapaud sage
  var BRANCH_ICON = { baton: [ICON.onde, iconUrls.katana_roseau, iconUrls.masse_fer], kunai: [iconUrls.kunai_acier, iconUrls.shuriken_eau, ICON.ombre], ermite: [ICON.paume, ICON.pied, ICON.crapaud] };
  // L'icône d'une voie : celle de l'arme choisie, pour sa propre voie (un katana, pas un bâton, si on a pris le katana)
  var ARME_ICON = { baton: 'baton_roseau', harpon: 'harpon_pecheur', katana: 'katana_roseau', masse: 'masse_fer', kunai: 'kunai_acier', shuriken: 'shuriken_eau' };
  function armeIcon(voie) { return voie === chosenVoie(save) && save.arme ? iconUrls[ARME_ICON[save.arme]] : VOIE_ICON[voie]; }
  // l'icône d'une branche (les rafales du Lancer lancent l'arme choisie)
  function branchIcon(voie, i) { return voie === 'kunai' && i === 0 ? armeIcon('kunai') : BRANCH_ICON[voie][i]; }
  // l'icône d'un sort : l'arme choisie (Armes, Lancer), ou sa branche (Ermite)
  function spellIcon(s) { if (s.base) return baseIcon(); var n = TREE.filter(function (x) { return x.skill === s.id; })[0]; return s.voie !== 'ermite' && save.arme && s.voie === chosenVoie(save) ? armeIcon(s.voie) : (n && !n.summit ? branchIcon(s.voie, n.path) : armeIcon(s.voie)); }
  var n1 = function (v) { return String(Math.round(v * 10) / 10).replace('.', ','); };
  var pc = function (v) { return Math.round(v * 100) + ' %'; };
  // L'endurance et l'armure d'une voie, s'il y en a : « , endurance ×1,1, armure 6 % (+0,04 % par niveau) »
  var voieTraits = function (v) {
    return (v.hp !== 1 ? ', endurance ×' + n1(v.hp) : '') + (v.armor ? ', armure ' + pc(v.armor + (v.armorL || 0) * save.level) + (v.armorL ? ' (elle grandit avec le niveau)' : '') : '');
  };
  // « Force ×2, Vitalité ×1,5 » : ce que vaut un point dans la voie
  var multText = function (v) { return Object.keys(v.mult).map(function (k) { return STAT_WORD[k] + ' ×' + n1(v.mult[k]); }).join(', '); };

  // Portrait d'un monstre
  var portraitCache = {};
  function monsterPortrait(enemy) {
    var key = enemy.species + ':' + enemy.name;
    if (!portraitCache[key]) {
      var s = SPECIES[enemy.species];
      portraitCache[key] = stringsToCanvas(s.frames[0], Object.assign({}, s.pal, enemy.pal || {})).toDataURL();
    }
    return portraitCache[key];
  }
  function drawPortrait(canvas, enemy) {
    var s = SPECIES[enemy.species];
    canvas.width = s.size; canvas.height = s.size;
    canvas.getContext('2d').drawImage(stringsToCanvas(s.frames[0], Object.assign({}, s.pal, enemy.pal || {})), 0, 0);
  }

  // ---------- Logo et favicon ----------
  var logo = CampScene.makeLogo(sp);
  ['logo', 'title-logo'].forEach(function (id) { $(id).width = 64; $(id).height = 64; $(id).getContext('2d').drawImage(logo, 0, 0); });
  var fav = document.createElement('link');
  fav.rel = 'icon';
  fav.href = logo.toDataURL();
  document.head.appendChild(fav);

  // ---------- La grenouille selon sa peau et son équipement ----------
  var HERO_IMG = null;
  function frogFrames(equip) {
    var anims = buildKawazuAnims(dressKawazu(sp, lookFor(equip)));
    var pal = paletteFor(sp.PAL, equip);
    var imgs = function (frames) { return frames.map(function (g) { return g ? gridToCanvas(g, pal) : null; }); };
    return {
      face: imgs(anims.idle.frames), profil: imgs(anims.idleRight.frames), dos: imgs(anims.idleUp.frames),
      atk: imgs(anims.attack.frames), fx: imgs(anims.attack.fx),
      zen: imgs([closedEyes(anims.idle.frames[0])])[0],
      kunai: weaponType(weaponOf(equip)) === 'shuriken' ? iconCanvas(weaponOf(equip)) : kunaiProjectileImgs(weaponOf(equip).blade).right
    };
  }
  // Les yeux fermés (méditation) : le blanc des yeux devient peau, et une paupière sombre les barre
  function closedEyes(g) {
    var out = g.map(function (r) { return r.slice(); }), eye = function (ch) { return ch === 'w' || ch === 'E'; };
    for (var y = 3; y <= 8; y++) for (var x = 1; x < out[y].length - 1; x++) {
      var ch = g[y][x], pupil = ch === 'k' && (y === 6 || y === 7) && (eye(g[y][x - 1]) || eye(g[y][x + 1]));
      if (eye(ch) || pupil) out[y][x] = y === 6 ? 'k' : 'm';
    }
    return out;
  }
  function buildHero() {
    HERO_IMG = frogFrames(save.equip);
    var p = $('sb-portrait');
    p.width = 32; p.height = 32;
    p.getContext('2d').clearRect(0, 0, 32, 32);
    p.getContext('2d').drawImage(HERO_IMG.face[0], 0, 0);
  }

  // ---------- Écran titre : continuer ou créer sa grenouille ----------
  var createSkin = 'marais', titleRaf = 0;
  function showTitle() {
    $('app').hidden = true;
    $('title').hidden = false;
    var cont = $('title-continue');
    if (save.hero) {
      cont.innerHTML = '<div class="continue-card"><canvas id="cont-frog"></canvas><div><b>' + escapeHtml(save.hero.name) + '</b><span>Niveau ' + save.level + ' · ' + save.gold + ' lucioles</span></div>' +
        '<button class="btn" id="continue">Continuer ▶</button></div><span class="or">ou recommence avec une nouvelle grenouille :</span>';
      var c = $('cont-frog');
      c.width = 32; c.height = 32;
      c.getContext('2d').drawImage(frogFrames(save.equip).face[0], 0, 0);
      $('continue').focus();
    } else {
      cont.innerHTML = '';
      $('create-name').focus();
    }
    $('create-skins').innerHTML = Object.keys(SKINS).map(function (k) {
      return '<button type="button" class="skin" role="radio" aria-checked="' + (k === createSkin) + '" data-skin="' + k + '"><i style="background:' + SKINS[k].m + '"></i>' + SKINS[k].name + '</button>';
    }).join('');
    cancelAnimationFrame(titleRaf);
    var cc = $('create-frog');
    cc.width = 32; cc.height = 32;
    var cctx = cc.getContext('2d');
    var saved = heroSkin;
    heroSkin = SKINS[createSkin];
    var savedHermit = playerHermit;
    playerHermit = false;
    var frames = frogFrames(DEFAULT_EQUIP).face; // images calculées une fois par couleur
    heroSkin = saved;
    playerHermit = savedHermit;
    (function loop(now) {
      if ($('title').hidden) return;
      cctx.clearRect(0, 0, 32, 32);
      cctx.drawImage(frames[Math.floor(now / 500) % 2], 0, 0);
      titleRaf = requestAnimationFrame(loop);
    })(performance.now());
  }
  // Le mot d'accueil d'une grenouille toute neuve : elle commence à mains nues
  function welcome(name) { return 'Bienvenue, ' + name + ' ! Tu commences à mains nues : choisis ta voie et ton arme à « La Voie », puis ouvre la Carte du monde pour ta première aventure.'; }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]; }); }

  $('title').addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.skin) { createSkin = t.dataset.skin; Sfx.play('click'); showTitle(); }
    if (t.id === 'continue') { Sfx.play('click'); enterGame(); }
  });
  $('create').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('create-name').value.trim().slice(0, 16) || 'Kawazu';
    save = newSave();
    save.hero = { name: name, skin: createSkin };
    refreshShop(save);
    setPlayer(save);
    persist();
    Sfx.play('levelup');
    enterGame();
    notice(welcome(name));
  });

  // ---------- Les nouveautés : une fenêtre, une fois par mise à jour (NEWS.id), pour celles qui ont déjà joué ----------
  var NEWS = {
    id: '2026-10',
    list: [
      ['coffre', 'camp', 'Les quêtes du jour', 'Trois quêtes chaque jour au camp, et un coffre quand elles sont faites : lucioles, XP, éclats et un objet Rare ou Épique.'],
      ['eclat', 'perso', 'La forge', 'Recycle les objets dont tu ne veux plus en éclats de jade, et renforce les autres jusqu’à +10 (+5 % de stats par niveau).'],
      ['donjon', 'donjons', 'Panoplies et compagnons', 'Les Uniques d’un même donjon forment une panoplie (bonus à 2, 3 et 4 pièces). Au fond des donjons, le petit du boss peut te suivre et se battre avec toi.'],
      ['titan', 'titan', 'Le Titan de la semaine', 'Un boss géant, le même pour tous les joueurs, aux PV partagés : 3 attaques par jour, une part pour chacun quand il tombe.'],
      ['rank', 'rank', 'Les saisons', 'Chaque mois, une saison de classement : les dix premières reçoivent un cadeau, les trois premières une peau de champion.'],
      ['camp', 'camp', 'Les événements', 'Le week-end, l’XP est doublée ; le mercredi, les objets tombent plus souvent.'],
      ['donjons', 'map', 'Le Royaume sous la Terre', 'Après l’Archipel des Brumes, six terres sous le monde et le Ver du Cœur du Monde.']
    ]
  };
  function showNews() {
    $('news-list').innerHTML = NEWS.list.map(function (n) {
      return '<div class="news-row"><img class="px" src="' + ICON[n[0]] + '" alt=""><div><b>' + n[2] + '</b><small>' + n[3] + '</small></div><button class="btn btn-ghost" data-news-go="' + n[1] + '">Voir ▶</button></div>';
    }).join('');
    $('news-modal').hidden = false;
  }
  $('news-modal').addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (e.target === $('news-modal') || (t && t.id === 'news-close')) { $('news-modal').hidden = true; Sfx.play('click'); return; }
    if (t && t.dataset.newsGo) { $('news-modal').hidden = true; Sfx.play('click'); showPage(t.dataset.newsGo); }
  });
  function enterGame() {
    $('title').hidden = true;
    $('app').hidden = false;
    if (!dailyShop(save)) tidyShop(save);
    questsToday(save, questCtx());
    persist();
    state.sheet = null;
    buildHero();
    renderAll();
    showPage('camp');
    startTick();
    if (save.notice) { notice(save.notice); delete save.notice; persist(); }
    // les nouveautés, une fois (une grenouille toute neuve les découvre en jouant)
    if (save.news !== NEWS.id) { var fresh = save.level <= 1 && !save.progress[0]; save.news = NEWS.id; persist(); if (!fresh) showNews(); }
    // de retour : ce que la grenouille a gagné en méditant pendant l'absence (et elle continue)
    if (save.meditation && meditationGain(save).ms >= 60000) endMeditation(true, 'Pendant ton absence');
  }

  // ---------- Page Camp : trois couches pour l'effet de profondeur ----------
  var layerIds = ['scene-back', 'scene-mid', 'scene-front'];
  var layers = {}, layerEls = {};
  ['back', 'mid', 'front'].forEach(function (k, i) {
    var el = $(layerIds[i]);
    el.width = CampScene.W; el.height = CampScene.H;
    layers[k] = el.getContext('2d');
    layers[k].imageSmoothingEnabled = false;
    layerEls[k] = el;
  });
  var sceneStatic = null;
  // le décor du camp prend l'ambiance du biome où l'on en est dans l'aventure
  function campBiome() {
    var id = BIOMES[currentWorld()].id;
    if (!sceneStatic || sceneStatic.biome !== id) sceneStatic = CampScene.buildStatic(id);
  }
  var DEPTH = { back: [-14, -8], mid: [-5, -3], front: [18, 10] };
  var base = { x: 0, y: 0 }, parallax = { x: 0, y: 0, tx: 0, ty: 0 };

  function layoutScene() {
    var page = $('page-camp');
    var W = page.clientWidth, H = page.clientHeight;
    if (!W || !H) return;
    var narrow = W <= 900, zone = narrow ? Math.max(200, $('adventure').offsetTop - 8) : H; // sur un téléphone : la bande au-dessus des panneaux
    var s = Math.max(narrow ? 2 : 1, Math.ceil(Math.max((W + 40) / CampScene.W, (zone + 24) / CampScene.H)));
    var cx = CampScene.HERO.x + 16, cy = CampScene.HERO.y + 20;
    base.x = Math.round(Math.min(20, Math.max(W - 20 - CampScene.W * s, W * (narrow ? 0.5 : 0.44) - cx * s)));
    base.y = Math.round(Math.min(12, Math.max(zone - 12 - CampScene.H * s, zone * (narrow ? 0.62 : 0.56) - cy * s)));
    Object.keys(layerEls).forEach(function (k) {
      layerEls[k].style.width = CampScene.W * s + 'px';
      layerEls[k].style.height = CampScene.H * s + 'px';
    });
    applyParallax();
  }
  function applyParallax() {
    Object.keys(layerEls).forEach(function (k) {
      var x = base.x + parallax.x * DEPTH[k][0], y = base.y + parallax.y * DEPTH[k][1];
      layerEls[k].style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    });
  }
  function syncChrome() { document.documentElement.style.setProperty('--sbh', $('sidebar').offsetHeight + 'px'); }
  syncChrome(); setTimeout(syncChrome, 300);
  window.addEventListener('resize', function () { syncChrome(); layoutScene(); if (state.page === 'skills') renderTree(); if (state.page === 'map') renderWorldMap(); if (state.page === 'tower') renderTower(); });
  $('page-camp').addEventListener('mousemove', function (e) {
    var r = this.getBoundingClientRect();
    parallax.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    parallax.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  $('page-camp').addEventListener('mouseleave', function () { parallax.tx = 0; parallax.ty = 0; });

  function drawCamp(now) {
    if (!sceneStatic) campBiome();
    var t = now / 1000, set = HERO_IMG.face;
    CampScene.draw(layers, sceneStatic, t, set[Math.floor(now / (1000 / set.length)) % set.length], null, save.meditation ? HERO_IMG.zen : null);
    var cpet = save.pet && petById(save.pet);
    if (cpet && petLevel(save, cpet.id)) { // le compagnon, sur le ponton à côté d'elle
      var pf = petFrames(cpet), ps = SPECIES[cpet.species].size === 32 ? 24 : 16, px = CampScene.HERO.x - ps + 2, py = CampScene.HERO.y + 31 - ps + Math.round(Math.sin(t * 2) * 0.6);
      layers.mid.fillStyle = 'rgba(0,0,0,0.3)'; layers.mid.fillRect(px + 2, CampScene.HERO.y + 30, ps - 4, 2);
      layers.mid.drawImage(pf[Math.floor(now / 450) % pf.length], px, py, ps, ps);
    }
    var tx = parallax.tx + Math.sin(t * 0.25) * 0.15, ty = parallax.ty + Math.cos(t * 0.2) * 0.1;
    parallax.x += (tx - parallax.x) * 0.06;
    parallax.y += (ty - parallax.y) * 0.06;
    applyParallax();
  }

  // ---------- Page Personnage : la grenouille seule, en grand, avec juste son ombre ----------
  var PV_W = 56, PV_H = 36, FEET = 33;
  var pv = $('preview'), pctx = pv.getContext('2d');
  pv.width = PV_W; pv.height = PV_H;
  var ATK_SEQ = [0, 0, 1, 2, 3, 3, 0, 0, 0, 0, 0, 0];
  function drawPreview(now) {
    pctx.imageSmoothingEnabled = false;
    pctx.clearRect(0, 0, PV_W, PV_H);
    var attacking = state.view === 'attaque', heroX = attacking ? 0 : 12, top = FEET - 31;
    pctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    pctx.beginPath(); pctx.ellipse(heroX + 16, FEET, 12, 2, 0, 0, Math.PI * 2); pctx.fill();
    if (!attacking) { var set = HERO_IMG[state.view]; pctx.drawImage(set[Math.floor(now / (1000 / set.length)) % set.length], heroX, top); return; }
    var step = Math.floor(now / 110) % ATK_SEQ.length, f = ATK_SEQ[step];
    pctx.drawImage(HERO_IMG.atk[f], heroX, top);
    if (isRanged(weaponOf(save.equip))) { if (step >= 2 && step < 8) pctx.drawImage(HERO_IMG.kunai, heroX + 22 + (step - 2) * 6, top + 14, HERO_IMG.kunai.width === 16 ? 8 : 12, HERO_IMG.kunai.width === 16 ? 8 : 12); }
    else if (HERO_IMG.fx[f]) pctx.drawImage(HERO_IMG.fx[f], heroX + 24, top);
  }

  // ---------- Boutique : la cabane de l'Aïeule Gamako ----------
  var shopEl = $('shop-scene'), shopCtx = shopEl.getContext('2d');
  shopEl.width = ShopScene.W * ShopScene.RES; shopEl.height = ShopScene.H * ShopScene.RES;
  var GAMAKO_SAYS = [
    'Approche, têtard. Mes marchandises ont vu plus de lunes que toi.',
    'Ce kunaï ? Je l’ai trouvé dans l’estomac d’un brochet. Il est comme neuf.',
    'Les lucioles, c’est la seule monnaie qui brille la nuit. Garde-les bien.',
    'Le Héron Ancestral ? J’ai croisé son regard une fois. Une seule.',
    'Un peu de thé de l’oubli ? Parfois, on grandit en désapprenant.',
    'Ne touche pas au bocal. Ces lucioles-là ne sont pas à vendre.',
    'Du temps de ma jeunesse, on chassait les moustiques à mains nues.'
  ];
  var shopGeo = null; // position du décor à l'écran, pour placer l'étal, la bulle et la fiche

  // Place le décor (couvre la page, calé en bas) puis l'étal et la bulle par-dessus
  function layoutShop() {
    var page = $('page-shop'), Wp = page.clientWidth, Hp = page.clientHeight;
    if (!Wp || !Hp) return;
    var wares = $('stock'), bubble = $('gamako-says');
    if (Wp <= 700) { // un téléphone : le décor en bandeau (Gamako au milieu), le reste s'empile dessous
      var sn = Wp / 170;
      shopEl.style.width = ShopScene.W * sn + 'px'; shopEl.style.height = ShopScene.H * sn + 'px';
      shopEl.style.transform = 'translate(' + Math.round(Wp / 2 - 128 * sn) + 'px,' + Math.round(-22 * sn) + 'px)';
      var ox = Math.round(Wp / 2 - 128 * sn), oy = Math.round(-22 * sn);
      shopGeo = { s: sn, narrow: true, W: Wp, H: Hp, sx: function (x) { return ox + x * sn; }, sy: function (y) { return oy + y * sn - $('page-shop').scrollTop; } };
      wares.style.left = wares.style.width = wares.style.top = '';
      bubble.style.right = bubble.style.top = '';
      placeShopCard();
      return;
    }
    var s = Math.max(Wp / ShopScene.W, Hp / ShopScene.H);
    var ox = Math.round((Wp - ShopScene.W * s) / 2), oy = Math.round(Hp - ShopScene.H * s);
    shopEl.style.width = ShopScene.W * s + 'px';
    shopEl.style.height = ShopScene.H * s + 'px';
    shopEl.style.transform = 'translate(' + ox + 'px,' + oy + 'px)';
    var sx = function (x) { return ox + x * s; }, sy = function (y) { return oy + y * s; };
    shopGeo = { s: s, sx: sx, sy: sy, W: Wp, H: Hp };
    var left = Math.max(16, sx(34)), right = Math.min(Wp - 16, sx(222));
    wares.style.left = left + 'px';
    wares.style.width = (right - left) + 'px';
    wares.style.top = (sy(ShopScene.COUNTER + 2) - 116) + 'px';
    bubble.style.right = (Wp - sx(ShopScene.GX + 6)) + 'px';
    bubble.style.top = Math.max(sy(ShopScene.GY + 4), 150) + 'px';
    placeShopCard();
  }
  // La fiche de l'objet se pose en bas, sur les planches du comptoir, sous l'objet choisi
  function placeShopCard() {
    var card = $('shop-card'), ware = document.querySelector('.ware2.is-selected');
    if (card.hidden || !ware || !shopGeo) return;
    card.classList.remove('aside');
    if (shopGeo.narrow) { card.style.left = card.style.top = ''; card.classList.remove('cramped'); return; }
    var page = $('page-shop').getBoundingClientRect(), wr = ware.getBoundingClientRect(), tag = ware.querySelector('.ware2-tag').getBoundingClientRect();
    var cw = card.offsetWidth, ch = card.offsetHeight, mid = wr.left - page.left + wr.width / 2;
    var left = Math.max(16, Math.min(shopGeo.W - cw - 16, mid - cw / 2));
    var top = Math.max(tag.bottom - page.top + 16, shopGeo.H - ch - 14), cramped = top + ch > shopGeo.H - 8;
    if (cramped) { // un petit écran : la fiche se range sur le mur de droite, au-dessus de l'étal ; sinon elle passe devant les étiquettes
      card.classList.add('aside');
      if (card.offsetHeight <= parseFloat($('stock').style.top) - 24) { cw = card.offsetWidth; left = shopGeo.W - cw - 16; top = 16; }
      else { card.classList.remove('aside'); top = Math.max(8, shopGeo.H - ch - 10); }
    }
    card.classList.toggle('cramped', cramped);
    card.style.left = left + 'px';
    card.style.top = top + 'px';
    card.style.setProperty('--arrow', Math.max(18, Math.min(cw - 18, mid - left)) + 'px');
  }
  window.addEventListener('resize', function () { if (state.page === 'shop') layoutShop(); });
  function drawShop(now) { ShopScene.draw(shopCtx, now / 1000); }

  // ---------- Gamako parle en « animalese », comme dans Animal Crossing ----------
  // Une voix de vieille grenouille (grave et un peu lente) ; la bulle s'écrit lettre par lettre en même temps.
  var gamakoVoice = null, gamakoTimers = [];
  function gamakoHush() {
    gamakoTimers.forEach(clearTimeout); gamakoTimers = [];
    if (gamakoVoice) gamakoVoice.stop();
    ShopScene.talk(false);
  }
  function gamakoSay(text) {
    gamakoHush();
    var b = $('gamako-says'), chars = Array.from(text);
    gamakoVoice = Sfx.animalese(text, { pitch: 190, gap: 0.042 });
    b.textContent = '';
    ShopScene.talk(true);
    gamakoVoice.times.forEach(function (ms, i) {
      gamakoTimers.push(setTimeout(function () { b.textContent = chars.slice(0, i + 1).join(''); }, ms));
    });
    gamakoTimers.push(setTimeout(function () { ShopScene.talk(false); }, gamakoVoice.times[chars.length - 1] + 150));
  }
  // Un clic sur Gamako : elle raconte autre chose
  shopEl.addEventListener('click', function (e) {
    if (!shopGeo) return;
    var r = $('page-shop').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    var gx = shopGeo.sx(ShopScene.GX), gy = shopGeo.sy(ShopScene.GY), size = 48 * shopGeo.s;
    if (x > gx && x < gx + size && y > gy && y < gy + size) gamakoSay(GAMAKO_SAYS[Math.floor(Math.random() * GAMAKO_SAYS.length)]);
  });
  // ---------- Boucle d'animation et minuteur de mission ----------
  var raf = 0, visible = true, lastSecond = 0;
  function tick(now) {
    if (!visible) return;
    if (state.page === 'camp') drawCamp(now);
    else if (state.page === 'perso') drawPreview(now);
    else if (state.page === 'shop') drawShop(now);
    else if (state.page === 'skills') drawTempleFx(now);
    else if (state.page === 'dojo') drawCascade(now);
    else if (state.page === 'tower') TowerPage.animate(now);
    else if (state.page === 'forge') drawForge(now);
    else if (state.page === 'titan') drawTitan(now);
    if (now - lastSecond > 500) { lastSecond = now; renderExpedition(); if (state.page === 'camp' && save.meditation) renderMeditation(); }
    raf = requestAnimationFrame(tick);
  }
  function startTick() { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); Sfx.ambient(state.page === 'camp'); }

  // ---------- Menu latéral ----------
  function renderSidebar() {
    var need = xpForLevel(save.level);
    $('sb-name').textContent = heroName();
    $('sb-level').textContent = save.level;
    var badges = ((save.cycle || 1) > 1 ? '<i class="sb-cyc" title="Cycle du monde">C' + romanCycle(save.cycle) + '</i>' : '') + (save.mutation && save.mutation.n ? '<i class="sb-mut" title="Mutations" style="--g:' + MUTATION_GLOW[Math.min(MUTATION_GLOW.length, save.mutation.n) - 1] + '">✦' + save.mutation.n + '</i>' : '');
    $('sb-badges').innerHTML = badges;
    $('sb-xp').style.width = Math.min(100, save.xp / need * 100) + '%';
    $('sb-gold').textContent = save.gold.toLocaleString('fr-FR');
    $('sb-eclats').textContent = (save.eclats || 0).toLocaleString('fr-FR');
    var evs = eventsNow(), sbe = $('sb-event');
    sbe.hidden = !evs.length;
    sbe.innerHTML = evs.map(function (k) { return '<b>' + EVENTS[k].short + '</b><span>' + EVENTS[k].name + '</span>'; }).join('');
    sbe.title = evs.map(function (k) { return EVENTS[k].desc; }).join(' ');
    var qc = questsClaimable(save), bc = $('badge-camp');
    bc.hidden = !qc; bc.textContent = qc;
    $('sb-items').textContent = albumItemsFound(save) + ' / ' + albumPool(save).length;
    var bp = $('badge-perso'), bs = $('badge-skills');
    bp.hidden = save.points <= 0; bp.textContent = save.points;
    var needArme = !save.arme && (save.voie === 'baton' || save.voie === 'kunai');
    bs.hidden = save.skillPoints <= 0 && !needArme; bs.textContent = save.skillPoints > 0 ? save.skillPoints : '!';
    Array.prototype.forEach.call(document.querySelectorAll('.menu-btn'), function (b) {
      b.classList.toggle('is-active', b.dataset.page === state.page);
    });
    renderExpedition();
  }

  function renderExpedition() {
    var box = $('sb-expedition'), e = save.expedition;
    box.hidden = !e;
    if (!e) return;
    var left = expeditionLeft(save), total = EXPEDITIONS.filter(function (x) { return x.id === e.id; })[0].secs * 1000;
    box.classList.toggle('done', left <= 0);
    box.innerHTML = '<b>' + e.name + '</b><span>' + (left > 0 ? 'Retour dans ' + mmss(left) : 'Terminée ! Clique pour récupérer') + '</span>' +
      '<span class="xp-track"><span style="width:' + Math.min(100, (1 - left / total) * 100) + '%"></span></span>';
    if (state.page === 'map' && state.sheet) {
      var run = $('exp-run');
      if (run) run.querySelector('.xp-track span').style.width = Math.min(100, (1 - left / total) * 100) + '%';
      var lbl = $('exp-left');
      if (lbl) {
        if (left <= 0 && !lbl.dataset.done) renderStageSheet();
        else lbl.textContent = left > 0 ? 'Retour dans ' + mmss(left) : 'Terminée !';
      }
    }
  }

  function claimExpedition() {
    var e = save.expedition;
    if (!e || expeditionLeft(save) > 0) return;
    var loot = rollLoot(save, lootTier(save, e.w), e.item);
    if (loot) save.owned.push(loot);
    e.gold = clanGold(e.gold); e.xp = clanXp(e.xp); // avec les bonus du clan
    save.gold += e.gold;
    var levels = gainXp(save, e.xp);
    save.expedition = null;
    var qd = track(save, 'mission').concat(trackLoot(save, [loot]));
    persist();
    quested(qd);
    Sfx.play(levels ? 'levelup' : 'pickup');
    notice(e.name + ' terminée : +' + e.gold + ' lucioles, +' + e.xp + ' XP' + (loot ? ', objet trouvé : ' + ITEMS[loot].name + ' (' + RARITIES[rarityOf(loot)].name + ')' : '') + (levels ? '. Niveau ' + save.level + ' !' : '.'));
    renderAll();
  }

  // ---------- Camp ----------
  function currentWorld() {
    var cur = 0;
    for (var i = 0; i < BIOMES.length; i++) if (worldUnlocked(save, i)) cur = i;
    return cur;
  }
  function nextStage(w) { return Math.min(STAGES, save.progress[w] + 1); }

  // ---------- Méditation au camp ----------
  var hmm = function (ms) { var m = Math.floor(ms / 60000); return m >= 60 ? Math.floor(m / 60) + ' h ' + ('0' + m % 60).slice(-2) : m + ' min'; };
  function renderMeditation() {
    var box = $('meditation'), r = meditationRates(save.level), g = meditationGain(save);
    if (!g) {
      box.innerHTML = '<div class="adv-kicker">MÉDITATION</div><p class="med-text">Assieds Kawazu sur le nénuphar : il médite et gagne un peu d’XP et de lucioles, même quand tu n’es pas là (' + r.xp + ' XP et ' + r.gold + ' lucioles par heure, ' + MEDITATION_MAX_H + ' h au plus).</p>' +
        (save.expedition ? '<p class="muted med-text">Il est en mission : il méditera à son retour.</p>' : '<button class="btn btn-ghost" id="med-start">Méditer sur le nénuphar</button>');
      return;
    }
    box.innerHTML = '<div class="adv-kicker">MÉDITATION · ' + hmm(g.ms) + (g.full ? ' (PLEIN)' : '') + '</div>' +
      '<p class="med-text"><b>+' + g.xp + ' XP</b> · <b>+' + g.gold + ' lucioles</b> en attente</p>' +
      '<p class="muted med-text">' + (g.full ? 'Il a médité ' + MEDITATION_MAX_H + ' h : il ne gagne plus rien de plus, récolte !' : r.xp + ' XP et ' + r.gold + ' lucioles par heure, ' + MEDITATION_MAX_H + ' h au plus. Un combat ou une mission le fait se lever.') + '</p>' +
      '<button class="btn" id="med-stop">Se lever et récolter</button>';
  }
  // Se lever (again : au retour, il reprend aussitôt sa méditation) ; annonce ce qui a été gagné
  function endMeditation(again, why) {
    var g = claimMeditation(save, again);
    if (!g) return;
    var qd = g.ms >= 3600e3 ? track(save, 'meditation') : [];
    persist();
    quested(qd);
    if (g.xp || g.gold) {
      Sfx.play(g.levels ? 'levelup' : 'pickup');
      notice((why || 'Méditation') + ' : ' + hmm(g.ms) + ' sur le nénuphar, +' + g.xp + ' XP et +' + g.gold + ' lucioles' + (g.levels ? '. Niveau ' + save.level + ' !' : '.'), true);
    }
    renderAll();
  }

  // Le donjon du moment : le plus haut ouvert pas encore vidé (sa prochaine salle), sinon un boss à redéfier aujourd'hui
  function dungeonHint() {
    var open = DUNGEONS.filter(function (d) { return dungeonOpen(save, d); });
    var todo = open.filter(function (d) { return dungeonState(save, d).room < DUNGEON_ROOMS; });
    if (todo.length) { var d = todo[todo.length - 1]; return { d: d, label: d.name + ' · salle ' + (dungeonState(save, d).room + 1) }; }
    var daily = open.filter(function (d) { return dungeonState(save, d).day !== todayKey(); });
    return daily.length ? { d: daily[daily.length - 1], label: daily[daily.length - 1].name + ' · boss du jour' } : null;
  }
  // ---------- Les quêtes du jour (quetes.js) ----------
  function questCtx() { return { online: !!(window.Cloud && Cloud.id), clan: !!save.inClan }; }
  function renderQuests() {
    var qs = questsToday(save, questCtx()), r = questReward(save), cr = chestReward(save), box = $('quests');
    var html = '<div class="adv-kicker">QUÊTES DU JOUR <small>· nouvelles dans ' + untilMidnight() + '</small></div><ul class="q-list">' + qs.list.map(function (q) {
      var d = questDef(q.id); if (!d) return '';
      var done = q.n >= d.n;
      return '<li class="q' + (q.got ? ' is-got' : (done ? ' is-done' : '')) + '"><div class="q-txt"><b>' + d.name + '</b><small>' + questText(d) + '</small>' +
        '<span class="q-bar"><i style="width:' + Math.min(100, q.n / d.n * 100) + '%"></i></span></div>' +
        (q.got ? '<span class="q-ok" aria-label="Reçue">✓</span>' : (done ? '<button class="btn q-claim" data-quest="' + q.id + '">Réclamer</button>' : '<span class="q-n">' + q.n + ' / ' + d.n + '</span>')) + '</li>';
    }).join('') + '</ul>' +
      '<p class="q-reward">Chacune : <b>' + r.gold.toLocaleString('fr-FR') + '</b> lucioles · <b>' + clanXp(r.xp).toLocaleString('fr-FR') + '</b> XP · <b>' + r.eclats + '</b> éclats</p>';
    var got = qs.list.filter(function (q) { return q.got; }).length;
    html += '<div class="q-chest' + (qs.chest ? ' is-open' : (chestReady(save) ? ' is-ready' : '')) + '"><img src="' + ICON.coffre + '" alt=""><div><b>' + (qs.chest ? 'Coffre ouvert' : 'Le coffre du jour') + '</b><small>' +
      (qs.chest ? 'Reviens demain pour trois nouvelles quêtes.' : 'Les trois quêtes faites (' + got + ' / 3) : un objet Rare ou Épique, ' + cr.eclats + ' éclats et ' + cr.gold.toLocaleString('fr-FR') + ' lucioles.') + '</small></div>' +
      (chestReady(save) ? '<button class="btn" data-quest-chest>Ouvrir</button>' : '') + '</div>';
    var evs = eventsNow(), nx = !evs.length && nextEvent();
    html += evs.length ? '<p class="q-event is-on">' + evs.map(function (k) { return '<b>' + EVENTS[k].name + '</b> : ' + EVENTS[k].desc.replace(/^[^,]*, /, ''); }).join(' ') + '</p>'
      : (nx ? '<p class="q-event">Prochain événement : <b>' + nx.ev.name + '</b> dans ' + (nx.ms > 86400e3 ? Math.round(nx.ms / 86400e3) + ' j' : Math.ceil(nx.ms / 3600e3) + ' h') + '.</p>' : '');
    box.innerHTML = html;
  }
  // annonce les quêtes tout juste faites (hors combat)
  function quested(done) {
    if (!done || !done.length) return;
    Sfx.play('glint');
    notice('Quête du jour accomplie : ' + done.map(function (d) { return d.name; }).join(', ') + ' ! Ta récompense t’attend au camp.', true);
  }
  function renderAdventure() {
    renderQuests();
    renderMeditation();
    var hint = dungeonHint();
    $('adv-dungeon').innerHTML = hint ? '<button class="adv-link adv-dj" data-page="donjons" data-dj-go="' + hint.d.id + '">Donjon : ' + hint.label + ' ▶</button>' : '';
    var w = currentWorld(), st = nextStage(w), done = save.progress[w] >= STAGES;
    var e = worldStages(w)[st - 1].enemy;
    $('adv-world').innerHTML = '<span><b>' + BIOMES[w].name + '</b></span>' +
      '<span>' + (done ? 'Terre conquise !' : 'Étape ' + st + ' / ' + STAGES + ' · ' + e.name + ' (niv. ' + e.level + ')') + '</span>' +
      '<span class="xp-track"><span style="width:' + (save.progress[w] / STAGES * 100) + '%"></span></span>';
  }

  // ---------- Personnage ----------
  function renderSlots() {
    $('sheet-name').textContent = heroName().toUpperCase();
    SLOTS.forEach(function (sl) {
      var el = $('slot-' + sl.id), id = save.equip[sl.id], it = ITEMS[id];
      if (sl.id === 'arme' && (playerHermit || !it)) {
        var hands = weaponOf(save.equip);
        el.className = 'dslot hermit-hands';
        el.title = hands.name + ' — ' + Object.keys(hands.stats).map(function (k) { return statName(k) + ' ' + fmt(hands.stats[k]); }).join(', ');
        el.innerHTML = '<img src="' + ICON.paume + '" alt=""><span class="dname">Mains nues</span>';
        return;
      }
      el.className = 'dslot' + (it ? ' has-rar' : ' is-empty') + (id && state.selected === id ? ' is-selected' : '');
      el.style.setProperty('--rar', it ? RARITIES[rarityOf(id)].color : '');
      el.title = it ? it.name + ' — ' + Object.keys(it.stats).map(function (k) { return statName(k) + ' ' + fmt(it.stats[k]); }).join(', ') : sl.name + ' : libre';
      el.innerHTML = it ? '<img src="' + iconUrls[id] + '" alt="">' + (it.forge ? '<i class="fg-badge">+' + it.forge + '</i>' : '') + '<span class="dname">' + it.name + '</span>' : '<span class="dlabel">' + sl.name.toUpperCase() + '</span>';
    });
    var pe = $('slot-pet'), pet = save.pet && petById(save.pet), pl = pet ? petLevel(save, pet.id) : 0;
    pe.className = 'dslot pet-slot' + (pet ? ' has-pet' : ' is-empty') + (state.filter === 'pet' ? ' is-selected' : '');
    pe.title = pet ? pet.name + ', niveau ' + pl + ' : ' + bonusText(petBonus(pet, pl)) : 'Compagnon : ' + (Object.keys(save.pets || {}).length ? 'aucun avec toi' : 'le petit d’un boss de donjon peut te suivre');
    pe.innerHTML = pet ? '<img src="' + petIcon(pet) + '" alt=""><span class="dname">' + pet.name + ' · niv. ' + pl + '</span>' : '<span class="dlabel">COMPAGNON</span>';
  }
  var petIcons = {};
  function petIcon(p) { return petIcons[p.id] || (petIcons[p.id] = petFrames(p)[0].toDataURL()); }

  function renderLevel() {
    var need = xpForLevel(save.level);
    $('lvl-num').textContent = save.level;
    $('xp-fill').style.width = Math.min(100, save.xp / need * 100) + '%';
    $('xp-text').textContent = save.xp + ' / ' + need + ' XP';
    var p = $('points');
    p.textContent = save.points > 0 ? save.points + (save.points > 1 ? ' points à répartir' : ' point à répartir') : 'Monte de niveau pour gagner des points';
    p.classList.toggle('has', save.points > 0);
    // répartir à nouveau : tous les points déjà placés reviennent (gratuit, confirmé d'un second clic)
    var spent = allocTotal(), rb = $('stats-reset');
    rb.hidden = !spent;
    rb.textContent = statsArmed ? 'Confirmer : récupérer ' + spent + ' point' + (spent > 1 ? 's' : '') : 'Répartir à nouveau';
    rb.classList.toggle('is-armed', !!statsArmed);
  }
  var statsArmed = 0;
  function allocTotal() { return Object.keys(save.alloc).reduce(function (s, k) { return s + save.alloc[k]; }, 0); }
  function resetStats() {
    var n = allocTotal();
    if (!n) return;
    Object.keys(save.alloc).forEach(function (k) { save.alloc[k] = 0; });
    save.points += n;
    setPlayer(save); persist(); Sfx.play('ladder'); renderAll();
    notice('Tes ' + n + ' points de caractéristique te sont rendus : répartis-les à nouveau avec les « + ».');
  }

  // Icônes des caractéristiques (16×16) : cœur, patte palmée, impact, lotus
  var STAT_ICON = {};
  (function () {
    var G = {
      vitalite: [['', '...kkk...kkk', '..krrrk.krrrk', '.krwrrrkrrrrrk', '.krwrrrrrrrrrk', '.krrrrrrrrrrrk', '.krrrrrrrrrrdk', '..krrrrrrrrdk', '...krrrrrrdk', '....krrrrdk', '.....krrdk', '......kdk', '.......k'],
        { k: '#1a1c2c', r: '#e0584a', w: '#ffd0c8', d: '#a02a20' }],
      agilite: [['', '..k...k...k', '.klk.klk.klk', '.kgk.kgk.kgk', '..kgkkgkkgk', '..klggggggk', '...kgggggk', '....kgggk', '....kgggk', '.....kgk', '.....kgk', '.....kgk', '......k'],
        { k: '#1a1c2c', g: '#6fae3a', l: '#c8f08a' }],
      force: [['.......k', '......kyk', '.k....kyk....k', '.kyk..kyk..kyk', '..kyk.kyk.kyk', '...kykyyykyk', 'kkkkyywwwyykkkk', 'kyyyywwwwwyyyyk', 'kkkkyywwwyykkkk', '...kykyyykyk', '..kyk.kyk.kyk', '.kyk..kyk..kyk', '.k....kyk....k', '......kyk', '.......k'],
        { k: '#1a1c2c', y: '#f0c040', w: '#fff6c0' }],
      esprit: [['', '.......kk', '......kppk', '.....kpwppk', '.....kpwppk', '.kk..kpwppk..kk', 'kppk.kpppdk.kppk', 'kpwpkkppppkkppdk', '.kpwppkppkppppk', '.kppppkddkpppdk', '..kppppkkppppk', '...kkkkkkkkkk', '..kggggggggggk', '...kkkkkkkkkk'],
        { k: '#1a1c2c', p: '#c8a0f8', w: '#f4ecff', d: '#8a5ac8', g: '#4e9a45' }]
    };
    Object.keys(G).forEach(function (k) { STAT_ICON[k] = stringsToCanvas(pad(G[k][0], 16), G[k][1]).toDataURL(); });
  })();
  // Ce que fait chaque caractéristique, selon la voie (l'attribut principal fait les dégâts)
  function statRule(id) {
    var voie = chosenVoie(save), main = mainStat(voie), v = voieDef(voie), top = 'Ton attribut principal : +' + n1(BAL.dmgMain) + ' dégât à chaque coup par point. ';
    if (id === 'vitalite') return 'Chaque point : +' + BAL.hpVit + ' points de vie' + (v && v.hp !== 1 ? ', ×' + n1(v.hp) + ' (l’endurance de ta voie)' : '') + '.';
    if (id === 'force') return main === 'force' ? top : 'Pour toi, la Force n’est qu’un bonus : +' + n1(BAL.offForce) + ' dégât par point, contre +' + n1(BAL.dmgMain * (v ? v.mult[main] : 1)) + ' par point placé en ' + STAT_NAME[main] + '.';
    if (id === 'agilite') return (main === 'agilite' ? top : '') + 'Critique, esquive et chances de jouer en premier, à rendement décroissant : il en faut plus à mesure que ton niveau monte.';
    return (main === 'esprit' ? top : '') + 'Puissance des sorts (jusqu’à +' + pc(BAL.spellMax) + ', à rendement décroissant) ; à ' + ESPRIT_STEPS.join(' et ') + ' points, les sorts se relancent un tour plus tôt.';
  }
  var STAT_FX = {
    vitalite: function (pr) { return '→ <b>' + pr.maxHp + '</b> points de vie'; },
    agilite: function (pr, main) { return '→ ' + (main === 'agilite' ? '<b>' + Math.round(pr.dmg) + '</b> dégâts par coup · ' : '') + '<b>' + pc(pr.crit) + '</b> de critique · <b>' + pc(pr.dodge) + '</b> d’esquive'; },
    force: function (pr, main, p) { return main === 'force' ? '→ <b>' + Math.round(pr.dmg) + '</b> dégâts par coup' : '→ <b>+' + Math.round(BAL.offForce * p.total) + '</b> dégâts par coup'; },
    esprit: function (pr, main) { return '→ ' + (main === 'esprit' ? '<b>' + Math.round(pr.dmg) + '</b> dégâts par coup · ' : '') + 'sorts <b>+' + pc(pr.spell - 1) + '</b>' + (pr.cdr ? ' · relance <b>−' + pr.cdr + ' tour' + (pr.cdr > 1 ? 's' : '') + '</b>' : ''); }
  };
  var STAT_NAME = { force: 'Force', agilite: 'Agilité', esprit: 'Esprit', vitalite: 'Vitalité' };

  // Une carte par caractéristique : sa valeur, d'où elle vient (base de la voie, points × la voie, temple, objets)
  // et ce qu'elle donne. Dessous, la fiche de combat : tout ce que ces chiffres deviennent, et pourquoi.
  function renderStats() {
    var parts = statParts(save.equip), pr = combatProfile(save), v = voieDef(chosenVoie(save));
    var max = Math.max.apply(null, STATS.map(function (st) { return parts[st.id].total; }));
    var scale = Math.max(STAT_MAX, Math.ceil(max / 10) * 10 + 10);
    var main = mainStat(chosenVoie(save));
    $('stat-voie').innerHTML = v ? '<img src="' + armeIcon(v.id) + '" alt=""><span><b style="color:' + v.color + '">' + v.name + '</b> · attribut principal : <b>' + STAT_NAME[v.main] + '</b> (il fait tes dégâts) · un point réparti vaut <b>' + multText(v) + '</b>, ×1 ailleurs' + voieTraits(v) + '.' + (VOIE_ARMES[v.id].length && !save.arme ? ' <b class="need-arme">Choisis ton arme au Temple !</b>' : '') + '</span>'
      : '<img src="' + ICON.skills + '" alt=""><span><b>Sans voie</b> · chaque point compte pour 1 et la Force fait tes dégâts. Choisis ta voie au Temple : elle te donne un attribut principal et multiplie tes points.</span>';
    $('stats-auto').hidden = !(save.points > 0); // répartir à sa place : l'attribut principal et la Vitalité
    // les cartes : l'attribut principal d'abord, puis la Vitalité, puis le reste
    var order = [main, 'vitalite'].concat(STATS.map(function (s) { return s.id; }).filter(function (k) { return k !== main && k !== 'vitalite'; }));
    $('stats').innerHTML = order.map(function (k) { return STATS.filter(function (s) { return s.id === k; })[0]; }).map(function (st) {
      var p = parts[st.id], seg = function (val, cls) { return val > 0 ? '<span class="' + cls + '" style="width:' + Math.min(100, val / scale * 100) + '%"></span>' : ''; };
      var bits = ['<span>Base <b>' + p.base + '</b></span>', '<span>Points <b>' + p.pts + (p.mult !== 1 ? ' ×' + n1(p.mult) + ' = ' + p.fromPts : '') + '</b></span>'];
      if (p.tree) bits.push('<span class="tree">Temple <b>+' + p.tree + '</b></span>');
      if (p.gear) bits.push('<span class="' + (p.gear < 0 ? 'st-down' : 'gear') + '">Objets <b>' + fmt(p.gear) + '</b></span>');
      if (p.mut) bits.push('<span class="mut">Mutation <b>+' + p.mut + '</b></span>');
      var role = st.id === main ? 'main' : (st.id === 'vitalite' ? 'reco' : 'minor');
      return '<div class="scard is-' + role + '" data-card="' + st.id + '" style="--c:' + st.color + '" title="' + statRule(st.id) + '">' +
        (role === 'main' ? '<span class="scard-ribbon">★ ATTRIBUT PRINCIPAL · TES DÉGÂTS</span>' : (role === 'reco' ? '<span class="scard-ribbon reco">CONSEILLÉ · TES PV</span>' : '<span class="scard-ribbon minor">BONUS</span>')) +
        '<span class="scard-ico"><img src="' + STAT_ICON[st.id] + '" alt=""></span>' +
        '<span class="scard-name">' + st.name.toUpperCase() + (p.mult !== 1 ? '<i class="scard-mult" title="Un point réparti vaut ' + n1(p.mult) + '">×' + n1(p.mult) + '</i>' : '') + '</span>' +
        '<span class="scard-val">' + p.total + '</span>' +
        '<button class="scard-plus' + (role === 'minor' ? ' quiet' : '') + '" data-stat="' + st.id + '"' + (save.points > 0 ? '' : ' hidden') + ' aria-label="Ajouter un point en ' + st.name + ' (+' + n1(p.mult) + ')">+</button>' +
        '<span class="scard-bar">' + seg(p.base, 'base') + seg(p.fromPts, 'own') + seg(p.tree, 'tree') + seg(p.gear, 'gear') + '</span>' +
        '<span class="scard-parts">' + bits.join('') + '</span>' +
        '<span class="scard-fx"><span>' + STAT_FX[st.id](pr, main, p) + '</span><small>' + statRule(st.id) + '</small></span></div>';
    }).join('');
    renderCombat(pr);
  }
  function renderCombat(pr) {
    var pas = pr.pas, rows = [];
    var row = function (ico, name, val, how) { rows.push('<li title="' + name + ' : ' + String(how).replace(/"/g, '&quot;') + '"><img src="' + ico + '" alt=""><span class="cs-name">' + name + '</span><b>' + val + '</b></li>'); };
    var temple = function (v, txt) { return v ? ', ' + (txt || '+' + pc(v)) + ' du temple' : ''; };
    var v = voieDef(chosenVoie(save)), main = mainStat(chosenVoie(save));
    row(STAT_ICON.vitalite, 'Points de vie', pr.maxHp, BAL.hpBase + ' + ' + BAL.hpVit + ' par Vitalité' + (v && v.hp !== 1 ? ', ×' + n1(v.hp) + ' (endurance de la voie)' : '') + temple(pas.hpMult));
    row(STAT_ICON[main], 'Dégâts par coup', Math.round(pr.dmg), '2 + ' + n1(BAL.dmgMain) + ' par ' + STAT_NAME[main] + (main !== 'force' ? ' + ' + n1(BAL.offForce) + ' par Force' : '') + temple(pas.dmgMult));
    row(STAT_ICON.agilite, 'Critique', pc(pr.crit), 'selon ton Agilité et ton niveau' + temple(pas.crit) + ' · un critique fait ×' + n1(pr.critMult));
    row(STAT_ICON.agilite, 'Esquive', pc(pr.dodge), 'selon ton Agilité et ton niveau' + temple(pas.dodge, '+' + n1(pas.dodge * 100) + ' %'));
    row(STAT_ICON.agilite, 'Initiative', pr.agi, 'plus d’Agilité que l’adversaire, plus de chances de jouer en premier');
    row(STAT_ICON.esprit, 'Puissance des sorts', '+' + pc(pr.spell - 1), 'selon ton Esprit (jusqu’à +' + pc(BAL.spellMax) + ')' + temple(pas.spellMult) + ' ; l’attaque de base et les soins n’en profitent pas');
    row(STAT_ICON.esprit, 'Relance des sorts', pr.cdr ? '−' + pr.cdr + ' tour' + (pr.cdr > 1 ? 's' : '') : 'normale', (pr.cdr >= ESPRIT_STEPS.length ? 'le plus court possible (jamais moins d’un tour)' : '−1 tour à ' + ESPRIT_STEPS.join(' et ') + ' d’Esprit · prochain palier : ' + ESPRIT_STEPS[pr.cdr]) + ' ; un soin ne gagne qu’un tour');
    if (pr.dmgReduce) row(PASSIVE_ICON[chosenVoie(save) || 'baton'], 'Dégâts reçus', '−' + pc(pr.dmgReduce), [pr.armor ? 'armure de la voie ' + pc(pr.armor) : '', pas.dmgReduce ? 'passifs du temple ' + pc(pas.dmgReduce) : ''].filter(Boolean).join(' + '));
    var others = ['riposte', 'lifesteal', 'shield', 'regenHp', 'flow', 'multiHit', 'execute', 'stunChance', 'bleedMult', 'poisonMult'].filter(function (k) { return pas[k]; });
    if (pr.mut && (pr.mut.hp || pr.mut.dmg || pr.mut.crit || pr.mut.dodge || pr.mut.spell)) row(STAT_ICON.vitalite, 'Mutation', [pr.mut.hp ? '+' + pc(pr.mut.hp) + ' PV' : '', pr.mut.dmg ? '+' + pc(pr.mut.dmg) + ' dégâts' : '', pr.mut.crit ? '+' + pc(pr.mut.crit) + ' critique' : '', pr.mut.dodge ? '+' + pc(pr.mut.dodge) + ' esquive' : '', pr.mut.spell ? '+' + pc(pr.mut.spell) + ' sorts' : ''].filter(Boolean).join(' · '), 'les traits choisis en mutant');
    var counts = setCounts(save.equip), sets = Object.keys(counts).map(dungeonById).filter(function (d) { return d && setTier(counts[d.id]); });
    if (sets.length) row(ICON.donjon, 'Panoplies', sets.map(function (d) { return counts[d.id] + ' / 4'; }).join(' · '), sets.map(function (d) { var b = {}; setOf(d).tiers.slice(0, setTier(counts[d.id])).forEach(function (t) { Object.keys(t).forEach(function (k) { b[k] = (b[k] || 0) + t[k]; }); }); return setName(d) + ' : ' + bonusText(b); }).join(' ; '));
    var cpet = save.pet && petById(save.pet), cpl = cpet ? petLevel(save, cpet.id) : 0;
    if (cpet && cpl) row(petIcon(cpet), 'Compagnon', cpet.name + ' · ' + cpl, bonusText(petBonus(cpet, cpl)) + ' ; il attaque tous les ' + PET_EVERY + ' tours (' + Math.round(petPower(cpl) * 100) + ' % de tes dégâts)');
    // les passifs des dalles apprises : leurs noms, et leurs effets en infobulle
    var passives = save.tree.map(nodeById).filter(function (n) { return n && n.passive; });
    $('combat-stats').innerHTML = '<h2>EN COMBAT <small>survole une case pour le détail</small></h2><ul class="cs-list">' + rows.join('') + '</ul>' +
      (others.length || passives.length ? '<p class="cs-pas"><b>Passifs :</b> ' + (others.length ? others.map(function (k) { return PASSIVE_TEXT[k](pas[k]); }).join(' · ') : passives.map(function (n) { return n.name; }).join(' · ')) + '.</p>' : '');
  }
  // ---------- La mutation ----------
  // Au niveau MUTATION_LEVEL, la grenouille peut muter : trois traits au choix, puis elle repart au niveau 1.
  var mutPick = null;
  function renderMutation() {
    var m = save.mutation || { n: 0, traits: {} }, box = $('mutation'), ready = canMutate(save), n = m.n;
    var traits = Object.keys(m.traits).filter(function (id) { return m.traits[id] > 0; });
    var html = '<h2>MUTATION' + (n ? ' · ' + n : '') + '</h2>';
    if (n) {
      html += '<p class="mu-sum"><span class="mu-glow" style="--g:' + MUTATION_GLOW[Math.min(MUTATION_GLOW.length, n) - 1] + '"></span>+' + (MUTATION_BASE * n) + ' à chaque caractéristique · +' + Math.round(MUTATION_XP * n * 100) + ' % d’XP</p>' +
        '<ul class="mu-traits">' + traits.map(function (id) { return '<li><b>' + MUTATIONS[id].name + (m.traits[id] > 1 ? ' ×' + m.traits[id] : '') + '</b><small>' + MUTATIONS[id].desc + (m.traits[id] > 1 ? ' (×' + m.traits[id] + ')' : '') + '</small></li>'; }).join('') + '</ul>';
    }
    if (!ready) {
      html += '<p class="mu-help">Au niveau ' + MUTATION_LEVEL + ', ta grenouille pourra muter : elle repart au niveau 1 (points et dalles remis à zéro ; elle garde sa voie, ses objets, ses lucioles et sa progression), mais gagne pour toujours +' + MUTATION_BASE + ' à chaque caractéristique, +' + Math.round(MUTATION_XP * 100) + ' % d’XP et un trait au choix. Et des marques lumineuses apparaissent sur sa peau.</p>' +
        '<span class="xp-track mu-track"><span style="width:' + Math.min(100, save.level / MUTATION_LEVEL * 100) + '%"></span></span><small class="mu-lvl">Niveau ' + save.level + ' / ' + MUTATION_LEVEL + '</small>';
    } else {
      var choices = mutationChoices(save);
      if (choices.indexOf(mutPick) < 0) mutPick = null;
      html += '<p class="mu-help"><b>Ta grenouille est prête à muter.</b> Choisis un trait : elle repartira au niveau 1 avec ce trait, +' + MUTATION_BASE + ' à chaque caractéristique et +' + Math.round(MUTATION_XP * 100) + ' % d’XP, pour toujours.</p>' +
        '<div class="mu-choices">' + choices.map(function (id) { return '<button class="mu-choice' + (mutPick === id ? ' is-picked' : '') + '" data-mut-pick="' + id + '"><b>' + MUTATIONS[id].name + '</b><small>' + MUTATIONS[id].desc + '</small></button>'; }).join('') + '</div>' +
        '<button class="btn mu-go" data-mutate' + (mutPick ? '' : ' disabled') + '>' + (mutPick ? 'Muter : repartir au niveau 1 avec « ' + MUTATIONS[mutPick].name + ' »' : 'Choisis un trait') + '</button>';
    }
    box.innerHTML = html;
    box.classList.toggle('is-ready', ready);
  }
  // Petit « +1 » qui remonte comme une bulle quand on ajoute un point
  function bumpStat(id) {
    var card = document.querySelector('.scard[data-card="' + id + '"]');
    if (!card) return;
    card.classList.add('bump');
    var f = document.createElement('span');
    f.className = 'float-up';
    f.textContent = '+1';
    card.appendChild(f);
  }

  // Les médailles des hauts faits (elles sont dans l'Album, sur leur double page)
  var medalUrls = {};
  function medalUrl(f) { return medalUrls[f.id] || (medalUrls[f.id] = medalCanvas(f).toDataURL()); }
  var FEAT_GROUPS = [['niveau', 'Niveaux'], ['combat', 'Combats'], ['boss', 'Boss et conquêtes'], ['arbre', 'La Voie'], ['objets', 'Objets']];
  // Annonce les hauts faits tout juste obtenus
  function checkFeats() {
    if (!save.hero) return;
    var had = Array.isArray(save.ach), fresh = claimFeats(save);
    if (!had || fresh.length) persist();
    if (!fresh.length) return;
    Sfx.play('heart');
    notice(fresh.length > 3 ? fresh.length + ' hauts faits débloqués : ' + fresh.slice(0, 2).map(function (f) { return f.name; }).join(', ') + '… (Album, Hauts faits)' : 'Haut fait débloqué : ' + fresh.map(function (f) { return f.name; }).join(', ') + ' !', true);
  }

  function matchesFilter(it) {
    if (state.filter === 'tout') return true;
    if (state.filter === 'pet') return false;
    if (state.filter === 'baton' || state.filter === 'kunai') return it.kind === state.filter;
    return it.slot === state.filter;
  }
  // les compagnons trouvés, à la place des objets (onglet Compagnons)
  function renderPets() {
    var own = PETS.filter(function (p) { return petLevel(save, p.id) > 0; });
    state.sellMode = false;
    $('inv-sell-mode').hidden = true; $('sell-bar').hidden = true;
    $('inventory').classList.remove('is-selling');
    $('inventory').innerHTML = own.map(function (p) {
      var on = save.pet === p.id;
      return '<button class="item pet-item' + (on ? ' is-equipped' : '') + (state.selected === 'pet:' + p.id ? ' is-selected' : '') + '" data-pet="' + p.id + '" title="' + p.name + ' : ' + bonusText(petBonus(p, petLevel(save, p.id))) + '">' +
        '<img src="' + petIcon(p) + '" alt=""><span>' + p.name + ' · niv. ' + petLevel(save, p.id) + '</span>' + (on ? '<b>AVEC TOI</b>' : '') + '</button>';
    }).join('') + '<p class="muted inv-empty">' + (own.length ? own.length + ' / ' + PETS.length + ' compagnons trouvés. ' : '<b>Aucun compagnon pour l’instant.</b> ') +
      'Au fond de chaque donjon, le petit du boss peut te suivre : ' + Math.round(PET_CHANCE.first * 100) + ' % la première fois, ' + Math.round(PET_CHANCE.daily * 100) + ' % au boss du jour. Le retrouver le fait grandir d’un niveau.</p>';
    Array.prototype.forEach.call(document.querySelectorAll('#filters button'), function (b) { b.classList.toggle('is-active', b.dataset.filter === state.filter); });
  }
  function renderInventory() {
    if (state.filter === 'pet') { renderPets(); return; }
    $('inv-sell-mode').hidden = false;
    var worn = function (id) { return save.equip[ITEMS[id].slot] === id ? 1 : 0; };
    var v = chosenVoie(save), fb = document.querySelector('#filters [data-filter="baton"]'), fk = document.querySelector('#filters [data-filter="kunai"]');
    fb.hidden = v === 'kunai' || v === 'ermite'; fk.hidden = v === 'baton' || v === 'ermite';
    fb.textContent = save.arme && v === 'baton' ? WEAPON_TYPES[save.arme].plural : 'Corps à corps';
    fk.textContent = save.arme && v === 'kunai' ? WEAPON_TYPES[save.arme].plural : 'Distance';
    if ((state.filter === 'baton' && fb.hidden) || (state.filter === 'kunai' && fk.hidden)) state.filter = 'tout';
    var ids = save.owned.filter(function (id) { return ITEMS[id] && itemAvailable(save, id) && matchesFilter(ITEMS[id]); });
    ids.sort(function (a, b) { return worn(b) - worn(a) || ITEM_RARITIES.indexOf(rarityOf(b)) - ITEM_RARITIES.indexOf(rarityOf(a)) || tierOf(b) - tierOf(a) || ITEMS[a].name.localeCompare(ITEMS[b].name); });
    var selling = !!state.sellMode;
    if (selling) state.sellSel = state.sellSel.filter(function (id) { return owns(id) && !worn(id); });
    $('inv-sell-mode').textContent = selling ? 'Annuler' : 'Vendre en masse';
    $('inv-sell-mode').classList.toggle('is-on', selling);
    $('sell-bar').hidden = !selling;
    if (selling) renderSellBar(ids.filter(function (id) { return !worn(id); }));
    $('inventory').classList.toggle('is-selling', selling);
    $('inventory').innerHTML = ids.length ? ids.map(function (id) {
      var it = ITEMS[id], equipped = worn(id), picked = selling && state.sellSel.indexOf(id) >= 0;
      return '<button class="item rar-' + rarityOf(id) + (equipped ? ' is-equipped' : '') + (!selling && state.selected === id ? ' is-selected' : '') + (picked ? ' is-picked' : '') + '" style="' + rarStyle(id) + '" data-item="' + id + '"' + (selling && equipped ? ' disabled' : '') + ' title="' + it.name + ' (' + RARITIES[rarityOf(id)].name + ')' + (selling ? (equipped ? ' : équipé, pas à vendre' : ' : ' + sellPrice(id) + ' lucioles') : '') + '">' +
        (selling && !equipped ? '<i class="pick" aria-hidden="true">' + (picked ? '✓' : '') + '</i>' : '') +
        '<img src="' + iconUrls[id] + '" alt="">' + (it.forge ? '<i class="fg-badge">+' + it.forge + '</i>' : '') + '<span>' + it.name + '</span>' + (equipped ? '<b>ÉQUIPÉ</b>' : '') + '</button>';
    }).join('') : '<p class="muted inv-empty">Rien ici pour l’instant. Le butin tombe en combat et en mission, et l’Aïeule Gamako vend aussi des trésors. L’Album montre tout ce qui reste à découvrir.</p>';
    Array.prototype.forEach.call(document.querySelectorAll('#filters button'), function (b) { b.classList.toggle('is-active', b.dataset.filter === state.filter); });
  }

  // La barre de la vente en masse : cocher par rareté, le total, et vendre (deux clics)
  function renderSellBar(sellable) {
    var n = state.sellSel.length, total = state.sellSel.reduce(function (s, id) { return s + sellPrice(id); }, 0), shards = state.sellSel.reduce(function (s, id) { return s + salvageValue(id); }, 0);
    var pick = function (key, label) { return '<button class="tab" data-sell-pick="' + key + '">' + label + '</button>'; };
    $('sell-bar').innerHTML = '<div class="sell-picks">' + pick('commun', 'Communs') + pick('rare', 'Rares') + pick('tout', 'Tout (' + sellable.length + ')') + pick('aucun', 'Aucun') + '</div>' +
      '<div class="sell-total"><span><b>' + n + '</b> objet' + (n > 1 ? 's' : '') + ' · <b>' + total + '</b> lucioles</span>' +
      '<span class="sell-go"><button class="btn' + (state.sellArmed ? ' is-armed' : '') + '" data-sell-go' + (n ? '' : ' disabled') + '>' + (state.sellArmed ? 'Confirmer la vente' : 'Vendre') + '</button>' +
      '<button class="btn btn-ghost' + (state.salvageArmed ? ' is-armed' : '') + '" data-salvage-go' + (n ? '' : ' disabled') + ' title="Recycler à la forge : des éclats de jade, pour renforcer tes objets">' + (state.salvageArmed ? 'Confirmer : recycler' : 'Recycler · ' + shards + ' éclats') + '</button></span></div>';
  }
  function sellSelected() {
    var sold = state.sellSel.filter(function (id) { return owns(id) && save.equip[ITEMS[id].slot] !== id; });
    var total = sold.reduce(function (s, id) { return s + sellPrice(id); }, 0);
    save.owned = save.owned.filter(function (x) { return sold.indexOf(x) < 0; });
    save.gold += total;
    if (sold.indexOf(state.selected) >= 0) state.selected = null;
    state.sellSel = []; state.sellMode = false; state.salvageArmed = false;
    persist(); Sfx.play('pickup'); renderAll();
    notice(sold.length + ' objet' + (sold.length > 1 ? 's' : '') + ' vendu' + (sold.length > 1 ? 's' : '') + ' : +' + total + ' lucioles.');
  }

  // La panoplie d'un Unique : ses trois paliers, et combien on en porte
  function setBlock(id) {
    var it = ITEMS[id], d = it && it.rarity === 'unique' && dungeonById(it.dungeon);
    if (!d) return '';
    var n = setCounts(save.equip)[d.id] || 0, k = setOf(d);
    return '<div class="set-info"><h3>' + setName(d).toUpperCase() + ' <small>· ' + k.name + ' · ' + n + ' portée' + (n > 1 ? 's' : '') + '</small></h3><ul>' +
      k.tiers.map(function (b, i) { return '<li class="' + (n >= SET_AT[i] ? 'on' : '') + '"><b>' + SET_AT[i] + ' pièces</b><span>' + bonusText(b) + '</span></li>'; }).join('') + '</ul></div>';
  }
  function renderPetDetails() {
    var pid = state.selected && String(state.selected).indexOf('pet:') === 0 ? state.selected.slice(4) : save.pet, p = pid && petById(pid), lv = p ? petLevel(save, p.id) : 0;
    if (!p || !lv) { $('details').innerHTML = '<p class="muted">Choisis un compagnon pour voir ce qu’il apporte.</p>'; return; }
    $('details').innerHTML = '<div class="det-head pet-head"><img class="px" src="' + petIcon(p) + '" alt=""><div><h3>' + p.name + '</h3><span class="muted">Compagnon · niveau ' + lv + ' / ' + PET_MAX_LEVEL + '</span></div></div>' +
      '<p>' + p.desc + '</p><ul class="pet-fx"><li><b>Bonus</b><span>' + bonusText(petBonus(p, lv)) + (lv < PET_MAX_LEVEL ? ' <small>(au niveau ' + (lv + 1) + ' : ' + bonusText(petBonus(p, lv + 1)) + ')</small>' : '') + '</span></li>' +
      '<li><b>En combat</b><span>tous les ' + PET_EVERY + ' tours, il bondit sur l’ennemi : ' + Math.round(petPower(lv) * 100) + ' % de tes dégâts (pas en duel ni à la guerre)</span></li></ul>' +
      (lv < PET_MAX_LEVEL ? '<p class="muted">Le retrouver au fond de ' + p.d.name + ' le fait grandir d’un niveau.</p>' : '<p class="muted">Il est au plus haut : le retrouver encore donne des éclats.</p>') +
      '<div class="modal-actions">' + (save.pet === p.id ? '<button class="btn btn-ghost" data-pet-off>Le laisser au camp</button>' : '<button class="btn" data-pet-on="' + p.id + '">L’emmener</button>') + '</div>';
  }
  function renderDetails() {
    if (state.filter === 'pet') { renderPetDetails(); return; }
    if (state.sellMode) { $('details').innerHTML = '<p class="muted">Touche les objets à vendre ou à recycler, ou coche-les par rareté. Les objets équipés restent.</p>'; return; }
    var id = state.selected, it = ITEMS[id];
    if (!it) { $('details').innerHTML = ''; return; }
    var slotName = SLOTS.filter(function (s) { return s.id === it.slot; })[0].name + (it.kind ? ' · ' + WEAPON_TYPES[weaponType(it)].name.toLowerCase() : '');
    if (!owns(id)) { $('details').innerHTML = '<div class="det2-head"><img class="px" src="' + lockedUrls[id] + '" alt=""><div><h3>Objet inconnu</h3><span>' + slotName + '</span></div></div>'; return; }
    var equipped = save.equip[it.slot] === id, rar = RARITIES[rarityOf(id)];
    // ses stats, et ce qu'elles changeraient par rapport à ce qu'on porte
    var now = computeStats(save.equip), tryEquip = Object.assign({}, save.equip);
    tryEquip[it.slot] = id;
    var after = computeStats(tryEquip), keys = STATS.map(function (s) { return s.id; }).filter(function (k) { return it.stats[k] || (!equipped && after[k] !== now[k]); });
    var rows = keys.map(function (k) {
      var dv = equipped ? 0 : after[k] - now[k];
      return '<li><span>' + statName(k) + '</span><b class="' + ((it.stats[k] || 0) < 0 ? 'st-down' : '') + '">' + fmt(it.stats[k] || 0) + '</b>' + (dv ? '<i class="' + (dv > 0 ? 'up' : 'down') + '">' + (dv > 0 ? '▲' : '▼') + Math.abs(dv) + '</i>' : '<i></i>') + '</li>';
    }).join('');
    var setD = it.rarity === 'unique' && dungeonById(it.dungeon), setN = setD ? (setCounts(save.equip)[setD.id] || 0) : 0;
    var chips = (it.forge ? '<span class="det2-chip fg">Forge +' + it.forge + '</span>' : '') + (setD ? '<span class="det2-chip set">Panoplie ' + setN + ' / 4</span>' : '') + (it.plus ? '<span class="det2-chip">Cycle +' + it.plus + '</span>' : '');
    var can = !(it.slot === 'arme' && (playerHermit || !weaponAllowed(save, it)));
    var main = !can ? '<p class="muted det2-why">' + (playerHermit ? 'Mode Ermite : on se bat à mains nues.' : 'Réservée à la ' + voieDef(it.kind).name + '.') + '</p>'
      : (equipped && it.slot === 'arme' ? '' : '<button id="equip-btn" class="btn' + (equipped ? ' btn-ghost' : '') + '">' + (equipped ? 'Retirer' : 'Équiper') + '</button>');
    $('details').innerHTML = '<div class="det2" style="--rar:' + rar.color + '">' +
      '<div class="det2-head"><img class="px" src="' + iconUrls[id] + '" alt=""><div><h3>' + it.name + '</h3><span><b>' + (it.reward ? 'Trésor' : rar.name) + '</b> · ' + slotName + (equipped ? ' · <b class="on">équipé</b>' : '') + '</span>' + (chips ? '<span class="det2-chips">' + chips + '</span>' : '') + '</div></div>' +
      '<ul class="det2-stats">' + rows + '</ul>' +
      '<div class="det2-actions">' + main + (forgeable(id) ? '<button class="btn btn-ghost" data-forge-go="' + id + '">Forger' + (it.forge ? ' (+' + it.forge + ')' : '') + '</button>' : '') +
      (equipped ? '' : '<button id="sell-btn" class="btn btn-ghost">Vendre · ' + sellPrice(id).toLocaleString('fr-FR') + '</button><button id="salvage-btn" class="btn btn-ghost">Recycler · +' + salvageValue(id) + ' éclats</button>') + '</div>' +
      '<details class="det2-more"><summary>En savoir plus</summary><p>' + it.desc + '</p>' + (it.kind ? '<p>Attaque de base : <b>' + baseSkill(it).name + '</b> — ' + baseSkill(it).desc + '</p>' : '') + setBlock(id) + '</details></div>';
  }

  // « katana (corps à corps) », « shuriken (distance) »
  function weaponLabel(it) { return WEAPON_TYPES[weaponType(it)].name.toLowerCase() + ' (' + (it.kind === 'kunai' ? 'distance' : 'corps à corps') + ')'; }

  // ---------- La Forge (forge.js) : l'atelier ----------
  // Au milieu, l'enclume et l'objet choisi : son niveau, ce que donne le suivant, la chance de réussir et ce que ça
  // coûte ; à gauche, les objets qu'on peut forger (ceux qu'on porte d'abord) ; à droite, le recyclage en masse.
  var forge = { sel: null, tab: 'portes', pick: [], armed: false, msg: null, sparks: [], strike: 0, bg: null };
  function forgeList() {
    var worn = SLOTS.map(function (s) { return save.equip[s.id]; });
    var ids = save.owned.filter(function (id) { return forgeable(id) && (forge.tab !== 'portes' || worn.indexOf(id) >= 0); });
    return ids.sort(function (a, b) { return (worn.indexOf(b) >= 0) - (worn.indexOf(a) >= 0) || ITEM_RARITIES.indexOf(rarityOf(b)) - ITEM_RARITIES.indexOf(rarityOf(a)) || forgeOf(b) - forgeOf(a) || tierOf(b) - tierOf(a); });
  }
  function openForge() {
    var list = forgeList();
    if (!list.length && forge.tab === 'portes') { forge.tab = 'tous'; list = forgeList(); }
    if (!forge.sel || !owns(forge.sel) || !forgeable(forge.sel)) forge.sel = list[0] || null;
    forge.pick = forge.pick.filter(function (id) { return owns(id); });
    renderForge();
  }
  function renderForge() {
    var list = forgeList(), worn = SLOTS.map(function (s) { return save.equip[s.id]; });
    $('fg-list').innerHTML = '<h2>À FORGER</h2><div class="tabs fg-tabs">' + [['portes', 'Portés'], ['tous', 'Tous']].map(function (t) { return '<button class="tab' + (forge.tab === t[0] ? ' is-active' : '') + '" data-forge-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      (list.length ? '<div class="fg-items">' + list.map(function (id) {
        return '<button class="fg-item' + (forge.sel === id ? ' is-on' : '') + '" style="' + rarStyle(id) + '" data-forge-pick="' + id + '" title="' + ITEMS[id].name + '"><img class="px" src="' + itemIconUrl(id) + '" alt=""><span>' + ITEMS[id].name + '</span><b>' + (forgeOf(id) ? '+' + forgeOf(id) : '') + '</b>' + (worn.indexOf(id) >= 0 ? '<i>porté</i>' : '') + '</button>';
      }).join('') + '</div>' : '<p class="muted">Rien à forger ici : les objets trouvés en combat, en mission ou à la boutique se forgent (pas les trésors).</p>');
    renderAnvil();
    renderRecycle();
  }
  function renderAnvil() {
    var id = forge.sel, it = ITEMS[id], box = $('fg-anvil');
    if (!it || !owns(id)) { box.innerHTML = '<div class="fg-card"><h2>LA FORGE</h2><p>Choisis un objet à gauche pour le renforcer, jusqu’à +' + FORGE_MAX + '.</p></div>'; return; }
    var k = forgeOf(id), pips = '', max = k >= FORGE_MAX, c = max ? null : forgeCost(id), rar = RARITIES[rarityOf(id)];
    for (var i = 0; i < FORGE_MAX; i++) pips += '<i' + (i < k ? ' class="on"' : (i === k ? ' class="next"' : '')) + '></i>';
    var rows = Object.keys(it.raw).filter(function (s) { return it.raw[s] > 0; }).map(function (s) {
      var nxt = Math.round(it.raw[s] * (1 + FORGE_STEP * (k + 1)));
      return '<li><span>' + statName(s) + '</span><b>' + it.stats[s] + '</b>' + (max ? '' : '<i>→ ' + nxt + '</i>') + '</li>';
    }).join('');
    var okE = c && (save.eclats || 0) >= c.eclats, okG = c && save.gold >= c.gold;
    box.innerHTML = '<div class="fg-card' + (forge.msg ? ' ' + forge.msg.kind : '') + '" style="--rar:' + rar.color + '">' +
      '<div class="fg-item-big' + (forge.strike ? ' strike' : '') + '"><img class="px" src="' + itemIconUrl(id) + '" alt="">' + (k ? '<b>+' + k + '</b>' : '') + '</div>' +
      '<h2>' + it.name + '</h2><div class="fg-pips">' + pips + '</div>' +
      (forge.msg ? '<p class="fg-msg">' + forge.msg.text + '</p>' : '') +
      (max ? '<p class="fg-max">Forgé au plus haut : +' + Math.round(k * FORGE_STEP * 100) + ' % de stats.</p>' :
        '<ul class="fg-stats">' + rows + '</ul>' +
        '<div class="fg-cost"><span class="' + (okE ? '' : 'miss') + '"><img class="px" src="' + ICON.eclat + '" alt=""><b>' + c.eclats.toLocaleString('fr-FR') + '</b> / ' + (save.eclats || 0).toLocaleString('fr-FR') + ' éclats</span>' +
        '<span class="' + (okG ? '' : 'miss') + '"><i class="luciole"></i><b>' + c.gold.toLocaleString('fr-FR') + '</b> lucioles</span>' +
        '<span class="fg-chance' + (c.chance < 1 ? ' risky' : '') + '">Réussite <b>' + Math.round(c.chance * 100) + ' %</b></span></div>' +
        '<button class="btn fg-strike" data-forge="' + id + '"' + (okE && okG ? '' : ' disabled') + '>Forger +' + (k + 1) + ' ⚒</button>' +
        (c.chance < 1 ? '<small class="fg-warn">Raté : les éclats et les lucioles sont perdus, l’objet garde son niveau.</small>' : '')) + '</div>';
  }
  function renderRecycle() {
    var worn = SLOTS.map(function (s) { return save.equip[s.id]; }), ids = save.owned.filter(function (id) { return ITEMS[id] && worn.indexOf(id) < 0; });
    ids.sort(function (a, b) { return ITEM_RARITIES.indexOf(rarityOf(a)) - ITEM_RARITIES.indexOf(rarityOf(b)) || tierOf(a) - tierOf(b); });
    forge.pick = forge.pick.filter(function (id) { return ids.indexOf(id) >= 0; });
    var total = forge.pick.reduce(function (s, id) { return s + salvageValue(id); }, 0), n = forge.pick.length;
    $('fg-recycle').innerHTML = '<h2>RECYCLER</h2><p class="muted">Les objets qu’on ne porte pas deviennent des éclats de jade.</p>' +
      '<div class="fg-picks">' + [['commun', 'Communs'], ['rare', 'Rares'], ['epique', 'Épiques'], ['tout', 'Tout'], ['aucun', 'Aucun']].map(function (p) { return '<button class="tab" data-recycle-pick="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>' +
      (ids.length ? '<div class="fg-grid">' + ids.map(function (id) {
        return '<button class="fg-cell' + (forge.pick.indexOf(id) >= 0 ? ' is-on' : '') + '" style="' + rarStyle(id) + '" data-recycle="' + id + '" title="' + ITEMS[id].name + ' · +' + salvageValue(id) + ' éclats"><img class="px" src="' + itemIconUrl(id) + '" alt="">' + (forgeOf(id) ? '<b>+' + forgeOf(id) + '</b>' : '') + '</button>';
      }).join('') + '</div>' : '<p class="muted">Rien à recycler : tout ce que tu as est porté.</p>') +
      '<div class="fg-total"><span><b>' + n + '</b> objet' + (n > 1 ? 's' : '') + ' · <b>+' + total.toLocaleString('fr-FR') + '</b> éclats</span>' +
      '<button class="btn' + (forge.armed ? ' is-armed' : '') + '" data-recycle-go' + (n ? '' : ' disabled') + '>' + (forge.armed ? 'Confirmer' : 'Recycler') + '</button></div>';
  }
  // l'atelier : les murs de pierre, le four, l'enclume (dessiné une fois), puis le feu et les étincelles
  function buildForgeBg() {
    var c = document.createElement('canvas'); c.width = 320; c.height = 180;
    var x = c.getContext('2d'), R = function (a, y, w, h, col) { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(y), Math.round(w), Math.round(h)); };
    for (var y = 0; y < 140; y += 6) for (var bx = (y / 6) % 2 ? -8 : 0; bx < 320; bx += 16) { R(bx, y, 15, 5, (bx + y) % 32 ? '#2a221e' : '#30261f'); R(bx, y, 15, 1, '#3a2e26'); }
    R(0, 138, 320, 42, '#1e1612'); for (var p = 0; p < 320; p += 20) { R(p, 140, 19, 40, p % 40 ? '#2a1e16' : '#261a12'); R(p, 140, 19, 1, '#3a2a1e'); }
    // le four
    R(118, 20, 84, 100, '#1a1412'); R(120, 22, 80, 98, '#4a3a30'); for (var fy = 24; fy < 118; fy += 6) R(120, fy, 80, 1, '#3a2e26');
    R(138, 52, 44, 52, '#0a0604'); R(136, 50, 48, 3, '#5a4a3e'); R(146, 0, 28, 22, '#3a2e26'); R(146, 0, 3, 22, '#2a2018');
    // l'enclume
    R(124, 120, 72, 10, '#1a1c2c'); R(126, 121, 68, 8, '#5a5e6a'); R(126, 121, 68, 2, '#8a8e9a'); R(150, 129, 20, 12, '#3a3e48'); R(140, 140, 40, 5, '#2a2e38');
    // les outils au mur, un tonneau
    [[40, 40], [56, 46], [72, 38]].forEach(function (t, k) { R(t[0], t[1], 2, 34, '#6b4a2a'); R(t[0] - 4, t[1] - 2, 10, 6, k === 1 ? '#8a8e9a' : '#5a5e6a'); });
    R(250, 104, 34, 38, '#1a1412'); R(252, 106, 30, 36, '#6b4a2a'); [112, 124, 136].forEach(function (yy) { R(252, yy, 30, 2, '#3a2a1e'); }); R(254, 104, 26, 3, '#2a5a7a');
    return c;
  }
  function drawForge(now) {
    var cv = $('forge-bg');
    if (cv.width !== 320) { cv.width = 320; cv.height = 180; }
    var x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
    if (!forge.bg) forge.bg = buildForgeBg();
    x.drawImage(forge.bg, 0, 0);
    var t = now / 1000;
    for (var f = 0; f < 18; f++) { var h = 12 + Math.abs(Math.sin(t * 6 + f)) * 26, fx = 140 + f * 2.3; x.fillStyle = f % 3 ? '#ff7a1a' : '#ffd040'; x.fillRect(Math.round(fx), Math.round(104 - h), 2, Math.round(h)); }
    var g = x.createRadialGradient(160, 90, 4, 160, 90, 110); g.addColorStop(0, 'rgba(255, 140, 50, ' + (0.2 + 0.05 * Math.sin(t * 7)) + ')'); g.addColorStop(1, 'rgba(255, 140, 50, 0)');
    x.fillStyle = g; x.fillRect(0, 0, 320, 180);
    for (var e = 0; e < 10; e++) { var ey = 104 - ((t * 20 + e * 13) % 90); x.fillStyle = e % 2 ? '#ffd040' : '#ff8a2a'; x.fillRect(Math.round(150 + Math.sin(t + e) * 14 + e * 2), Math.round(ey), 1, 1); }
    forge.sparks = forge.sparks.filter(function (s) { s.life -= 0.016; s.x += s.vx; s.y += s.vy; s.vy += 0.12; if (s.life > 0) { x.fillStyle = s.c; x.fillRect(Math.round(s.x), Math.round(s.y), 2, 2); } return s.life > 0; });
  }
  function forgeSparks(ok) {
    for (var i = 0; i < (ok ? 40 : 18); i++) forge.sparks.push({ x: 160, y: 118, vx: (Math.random() - 0.5) * 5, vy: -1 - Math.random() * 4, life: 0.6 + Math.random() * 0.6, c: ok ? (i % 2 ? '#ffd040' : '#fff6c0') : '#8a8e9a' });
  }

  // ---------- La Voie : le Temple des voies ----------
  // Un temple en pixel art, plein écran. Tant qu'aucune voie n'est choisie, trois grandes flaques attendent au bout
  // de trois cours d'eau, une par voie : la grenouille plonge dans celle qu'elle choisit, et ressort dans le bassin,
  // dont l'eau a pris la couleur de sa voie. De là montent trois cours d'eau : les 3 branches de la voie, chacune faite
  // de 10 dalles, qui se rejoignent tout en haut sur la dalle-sommet. La grenouille avance de dalle en dalle, et l'eau
  // de la branche apprise prend la couleur de la voie.
  var TEMPLE_BIOME = BIOMES.filter(function (b) { return b.id === 'temple'; })[0];
  var WATER = { base: '#235a6a', deep: '#1a4452', light: '#3f8a98', dry: '#2c302b', baton: '#5fbf7a', kunai: '#7fc4f0', ermite: '#f0c24a' };
  var SLAB_R = 7; // demi-largeur d'une dalle, en pixels du décor (la dalle-sommet est plus grande)
  var SUMMIT_R = SLAB_R + 4;
  var tBg = $('temple-bg'), tFx = $('temple-fx'), tfx = tFx.getContext('2d');
  var temple = null, templeFrog = null, templeFrogRaf = 0;
  // blason des passifs, aux couleurs de chaque voie
  var PASSIVE_ICON = {};
  VOIES.forEach(function (v) {
    PASSIVE_ICON[v.id] = stringsToCanvas(pad(['', '...kkkkkkkkkk', '..k1111111111k', '..k1331111111k', '..k1311111111k', '..k1111111112k', '..k1111111112k',
      '...k11111112k', '...k11111122k', '....k111122k', '.....k1122k', '......k22k', '.......kk'], 16), { k: '#1a1c2c', 1: v.color, 2: '#3a4a42', 3: '#ffffff' }).toDataURL();
  });

  // Mise en page (en px de la page) : la zone du temple laisse la place au titre en haut et au deck à droite
  function templeLayout() {
    var page = $('page-skills'), W = page.clientWidth, H = page.clientHeight;
    var wide = W > 1000, narrow = W <= 700, side = page.querySelector('.temple-side');
    var rect = { l: 160, r: wide ? W - 400 : W - 30, t: 262, b: wide ? H - 18 : Math.round(H * 0.6) };
    if (narrow) {
      var head = page.querySelector('.temple-head'), top0 = head.offsetTop + head.offsetHeight;
      H = top0 + 880;
      rect = { l: 52, r: W - 16, t: top0 + 96, b: H - 12 };
    }
    side.style.top = narrow ? H + 'px' : '';
    // la dalle-sommet tout en haut (rect.t), puis les 10 rangées des branches
    var first = rect.b - 74, top = rect.t + Math.max(64, (first - rect.t) * 0.14), rowH = (first - top) / (STEPS - 1);
    var s = narrow ? 3 : (H >= 960 ? 4 : (rowH >= 50 ? 3 : 2));
    var colX = function (i, n) { return rect.l + (rect.r - rect.l) * (i + 0.5) / n; };
    return {
      W: W, H: H, s: s, rect: rect, first: first, rowH: rowH, colX: colX, narrow: narrow,
      rowY: function (step) { return first - (step - 1) * rowH; },
      pos: function (n) { return n.summit ? { x: colX(1, 3), y: rect.t } : { x: colX(n.path, BRANCHES), y: first - (n.step - 1) * rowH }; },
      pool: function (i) { return { x: colX(i, 3), y: rect.t + 34 }; }, // les trois flaques du choix de la voie
      gate: { x: (rect.l + rect.r) / 2, y: rect.b - 10 }
    };
  }
  // Courbe d'un cours d'eau, échantillonnée (en px de la page)
  function stream(a, b) {
    var pts = [], my = (a.y + b.y) / 2, n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3));
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = 1 - t;
      pts.push({
        x: u * u * u * a.x + 3 * u * u * t * a.x + 3 * u * t * t * b.x + t * t * t * b.x,
        y: u * u * u * a.y + 3 * u * u * t * my + 3 * u * t * t * my + t * t * t * b.y
      });
    }
    return pts;
  }
  function templeLinks(L) {
    var voie = chosenVoie(save), links = [];
    if (!voie) {
      VOIES.forEach(function (v, i) { links.push({ from: null, to: null, pts: stream(L.gate, L.pool(i)), voie: v.id, on: false }); });
      return links;
    }
    TREE.filter(function (n) { return n.voie === voie; }).forEach(function (n) {
      if (n.summit) { // les trois branches se rejoignent sur la dalle-sommet
        n.reqAny.forEach(function (id) { var fr = nodeById(id); links.push({ from: fr, to: n, pts: stream(L.pos(fr), L.pos(n)), voie: voie, on: hasNode(save, n.id) && hasNode(save, id) }); });
        return;
      }
      var from = n.req.length ? nodeById(n.req[0]) : null;
      links.push({ from: from, to: n, pts: stream(from ? L.pos(from) : L.gate, L.pos(n)), voie: voie, on: hasNode(save, n.id), next: canLearnNode(save, n) });
    });
    return links;
  }

  // ---------- Le décor (redessiné quand l'arbre change) ----------
  function drawTempleBg(L, links) {
    var s = L.s, SW = Math.ceil(L.W / s), SH = Math.ceil(L.H / s), voie = chosenVoie(save);
    tBg.width = SW; tBg.height = SH; tFx.width = SW; tFx.height = SH;
    [tBg, tFx].forEach(function (c) { c.style.width = SW * s + 'px'; c.style.height = SH * s + 'px'; });
    var ctx = tBg.getContext('2d'), R = Math.round;
    var r = function (x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(R(x), R(y), w, h); };
    // sol de dalles et murs du Temple Englouti
    var tw = Math.ceil(SW / TILE), th = Math.ceil(SH / TILE), tiles = new Uint8Array(tw * th);
    for (var y = 0; y < th; y++) for (var x = 0; x < tw; x++) tiles[y * tw + x] = y < 3 || x === 0 ? RT.WALL : RT.FLOOR;
    ctx.drawImage(renderMap({ biome: TEMPLE_BIOME, w: tw, h: th, tiles: tiles, seed: 5 }), 0, 0);
    for (var px = 40; px < SW; px += 90) { // colonnes le long du mur du fond
      r(px - 6, 0, 12, 50, '#10181a'); r(px - 5, 0, 10, 49, '#6b7f86'); r(px - 5, 0, 3, 49, '#9ab0b6'); r(px + 3, 0, 2, 49, '#3e4e54');
      r(px - 8, 44, 16, 6, '#10181a'); r(px - 7, 45, 14, 4, '#9ab0b6'); r(px - 7, 0, 14, 4, '#9ab0b6');
    }
    var g = ctx.createRadialGradient(SW * 0.4, SH * 0.6, 20, SW * 0.4, SH * 0.6, Math.max(SW, SH) * 0.75);
    g.addColorStop(0, 'rgba(0, 0, 0, 0)'); g.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);

    // cours d'eau : un lit de pierre sombre, puis l'eau (couleur de la voie une fois le chemin appris)
    var sc = function (p) { return { x: p.x / s, y: p.y / s }; };
    links.forEach(function (l) { l.pts.forEach(function (p) { var q = sc(p); r(q.x - 4, q.y - 3, 8, 7, '#0e1517'); }); });
    links.forEach(function (l) { l.pts.forEach(function (p) { var q = sc(p); r(q.x - 3, q.y - 2, 6, 5, '#4a5a5e'); }); });
    links.forEach(function (l) {
      var col = l.on ? WATER[l.voie] : WATER.base;
      l.pts.forEach(function (p, i) {
        var q = sc(p);
        r(q.x - 2, q.y - 1, 4, 3, col);
        if (i % 4 === 0) r(q.x - 1, q.y - 1, 2, 1, l.on ? '#ffffff55' : WATER.light);
      });
    });
    // le bassin de l'entrée et ses marches
    var gx = L.gate.x / s, gy = L.gate.y / s;
    for (var dy = -9; dy <= 9; dy++) for (var dx = -18; dx <= 18; dx++) {
      var d = (dx * dx) / (18 * 18) + (dy * dy) / (9 * 9);
      if (d > 1) continue;
      r(gx + dx, gy + dy, 1, 1, d > 0.78 ? (dy < 0 ? '#9ab0b6' : '#4a5a5e') : (d > 0.62 ? '#0e1517' : ((dx + dy) % 5 === 0 ? (voie ? '#ffffff66' : WATER.light) : (voie ? WATER[voie] : WATER.deep))));
    }
    for (var st = 0; st < 3; st++) { r(gx - 20 + st * 3, gy + 10 + st * 3, 40 - st * 6, 3, st % 2 ? '#6b7f86' : '#9ab0b6'); r(gx - 20 + st * 3, gy + 12 + st * 3, 40 - st * 6, 1, '#3e4e54'); }

    if (!voie) { // trois grandes flaques, chacune de la couleur de sa voie
      VOIES.forEach(function (v, i) {
        var pp = sc(L.pool(i)), rx = 33, ry = 15;
        var gl = ctx.createRadialGradient(pp.x, pp.y, 6, pp.x, pp.y, 64);
        gl.addColorStop(0, v.color + '66'); gl.addColorStop(1, v.color + '00');
        ctx.fillStyle = gl; ctx.fillRect(pp.x - 64, pp.y - 64, 128, 128);
        for (var yy = -ry - 3; yy <= ry + 3; yy++) for (var xx = -rx - 4; xx <= rx + 4; xx++) {
          var e = (xx * xx) / ((rx + 4) * (rx + 4)) + (yy * yy) / ((ry + 3) * (ry + 3)), inner = (xx * xx) / (rx * rx) + (yy * yy) / (ry * ry);
          if (e > 1) continue;
          var col = inner > 1 ? (yy < 0 ? '#9ab0b6' : '#4a5a5e') : (inner > 0.86 ? '#0e1517' : (inner < 0.35 ? v.color : ((xx + yy * 2) % 7 === 0 ? '#ffffff55' : WATER.deep)));
          r(pp.x + xx, pp.y + yy, 1, 1, col);
        }
      });
      return;
    }
    // les dalles de la voie choisie ; la dalle-sommet, ronde et plus grande, baigne dans une lueur dorée
    TREE.forEach(function (n) {
      if (n.voie !== voie) return;
      var p = sc(L.pos(n)), known = hasNode(save, n.id), can = canLearnNode(save, n);
      if (n.summit) {
        var sg = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 46);
        sg.addColorStop(0, 'rgba(243, 210, 122, 0.45)'); sg.addColorStop(1, 'rgba(243, 210, 122, 0)');
        ctx.fillStyle = sg; ctx.fillRect(p.x - 46, p.y - 46, 92, 92);
      }
      drawSlab(ctx, R(p.x), R(p.y), n.summit ? 'stat' : n.type, known ? 'known' : (can ? 'can' : 'locked'), voieOf(n.voie).color, n.summit ? SUMMIT_R : SLAB_R);
    });
  }
  // Une dalle en relief : ronde (stats), en losange (passif) ou carrée (sort), gravée d'un anneau
  function drawSlab(ctx, cx, cy, type, st, glow, R) {
    var inside = function (dx, dy) {
      if (type === 'stat') return dx * dx + dy * dy <= R * R;
      if (type === 'passive') return Math.abs(dx) + Math.abs(dy) <= R + 2;
      return Math.abs(dx) <= R - 1 && Math.abs(dy) <= R - 1;
    };
    var ring = function (dx, dy) {
      if (type === 'stat') { var d = Math.sqrt(dx * dx + dy * dy); return d > R - 3 && d <= R - 2; }
      if (type === 'passive') { var m = Math.abs(dx) + Math.abs(dy); return m > R - 2 && m <= R - 1; }
      return Math.max(Math.abs(dx), Math.abs(dy)) === R - 3;
    };
    var base = { known: '#b8b49a', can: '#b0ac92', locked: '#7a7868' }[st];
    var light = { known: '#e8e4c8', can: '#d8d4b8', locked: '#9a9884' }[st];
    var dark = { known: '#6b6a58', can: '#6b6a58', locked: '#4a4a3e' }[st];
    if (st === 'known') {
      var g = ctx.createRadialGradient(cx, cy, 3, cx, cy, R * 2);
      g.addColorStop(0, glow + '88'); g.addColorStop(1, glow + '00');
      ctx.fillStyle = g; ctx.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);
    }
    for (var dy = -R - 3; dy <= R + 3; dy++) {
      for (var dx = -R - 3; dx <= R + 3; dx++) {
        var x = cx + dx, y = cy + dy;
        if (!inside(dx, dy)) {
          if (inside(dx - 1, dy - 2)) { ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'; ctx.fillRect(x, y, 1, 1); }
          continue;
        }
        var edge = !inside(dx - 1, dy) || !inside(dx + 1, dy) || !inside(dx, dy - 1) || !inside(dx, dy + 1);
        var col = base;
        if (edge) col = '#161a18';
        else if (!inside(dx - 1, dy - 1)) col = light;
        else if (!inside(dx + 1, dy + 1)) col = dark;
        else if (ring(dx, dy)) col = st === 'known' ? glow : (st === 'can' ? '#e0b43a' : dark);
        else if (hash(x, y, 4) < 0.08) col = dark;
        ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // ---------- Ce qui bouge : reflets de l'eau, torches, dalles à prendre ----------
  function drawTempleFx(now) {
    if (!temple) return;
    var t = now / 1000, s = temple.L.s, R = Math.round;
    tfx.clearRect(0, 0, tFx.width, tFx.height);
    temple.links.forEach(function (l, k) { // l'eau remonte le courant
      var n = l.pts.length, step = l.on ? 5 : 9;
      for (var i = 0; i < n; i += step) {
        var j = Math.floor((i + t * (l.on ? 14 : 6) + k * 3) % n), p = l.pts[j];
        tfx.fillStyle = l.on ? 'rgba(255, 255, 240, 0.75)' : 'rgba(170, 220, 230, 0.45)';
        tfx.fillRect(R(p.x / s) - 1 + (j % 2), R(p.y / s), 2, 1);
      }
    });
    for (var px = 85; px < tFx.width; px += 90) { // torches
      var fl = Math.sin(t * 13 + px) > 0 ? 1 : 0;
      var g = tfx.createRadialGradient(px, 30, 1, px, 30, 26);
      g.addColorStop(0, 'rgba(255, 190, 90, ' + (0.28 + fl * 0.05) + ')'); g.addColorStop(1, 'rgba(255, 190, 90, 0)');
      tfx.fillStyle = g; tfx.fillRect(px - 26, 4, 52, 52);
      tfx.fillStyle = '#3a2a18'; tfx.fillRect(px - 2, 34, 4, 6); tfx.fillRect(px - 3, 33, 6, 2);
      tfx.fillStyle = '#e07a2a'; tfx.fillRect(px - 2, 28 - fl, 4, 5);
      tfx.fillStyle = '#f3d27a'; tfx.fillRect(px - 1, 27 - fl, 2, 4);
      tfx.fillStyle = '#fff6c0'; tfx.fillRect(px, 29, 1, 2);
    }
    if (temple.splash) { // anneaux qui s'élargissent et gouttes qui retombent
      var spl = temple.splash, k = (now - spl.t0) / 900;
      if (k > 1) temple.splash = null;
      else {
        for (var ring = 0; ring < 3; ring++) {
          var rk = k - ring * 0.18;
          if (rk <= 0) continue;
          tfx.strokeStyle = 'rgba(255, 255, 255, ' + (0.7 * (1 - rk)).toFixed(2) + ')';
          tfx.beginPath(); tfx.ellipse(spl.x / s, spl.y / s, 6 + rk * 34, 2 + rk * 13, 0, 0, Math.PI * 2); tfx.stroke();
        }
        tfx.fillStyle = spl.color;
        for (var dr = 0; dr < 14; dr++) {
          var an = dr / 14 * Math.PI * 2, dist = k * (18 + (dr % 3) * 8);
          tfx.fillRect(R(spl.x / s + Math.cos(an) * dist), R(spl.y / s - Math.sin(k * Math.PI) * (14 + (dr % 4) * 5) + Math.sin(an) * dist * 0.35), 2, 2);
        }
      }
    }
    var a = 0.3 + 0.25 * Math.sin(t * 4);
    tfx.strokeStyle = 'rgba(243, 210, 122, ' + a.toFixed(2) + ')';
    tfx.lineWidth = 1;
    TREE.forEach(function (n) { // les dalles qu'on peut prendre respirent en doré
      if (n.voie !== chosenVoie(save) || !canLearnNode(save, n)) return;
      var p = temple.L.pos(n), rr = n.summit ? SUMMIT_R : SLAB_R;
      tfx.strokeRect(R(p.x / s) - rr - 3.5, R(p.y / s) - rr - 3.5, rr * 2 + 7, rr * 2 + 7);
    });
  }

  // Les Maîtrises : quand toutes les dalles de la voie sont apprises, les points de voie vont dans quatre pistes sans fin,
  // et tous les 10 rangs un sort du deck s'éveille (on le choisit ; un clic sur un sort éveillé le rendort)
  function renderMastery() {
    var box = $('mastery'), voie = chosenVoie(save);
    box.hidden = !voie;
    if (!voie) return;
    if (!treeComplete(save)) {
      box.innerHTML = '<p class="ms-tease">Les <b>Maîtrises</b> s’ouvrent quand toutes les dalles de ta voie sont apprises : tes points de voie iront alors dans quatre maîtrises sans fin, pour toujours (même après une mutation).</p>';
      return;
    }
    var m = save.mastery, total = masteryRanks(save), allowed = awakeningsAllowed(save), woke = save.awakened;
    var html = '<h2>MAÎTRISES <small>' + total + ' rang' + (total > 1 ? 's' : '') + '</small></h2><div class="ms-list">' + MASTERIES.map(function (x) {
      var r = m[x.id] || 0, cost = masteryCost(r), bonus = x.dmg ? Math.round(x.dmg * r * 100) + ' % de dégâts' : (x.hp ? Math.round(x.hp * r * 100) + ' % de PV' : (x.crit ? Math.round(x.crit * r * 100) + ' % de critique' : Math.round(x.spell * r * 100) + ' % de puissance des sorts'));
      return '<div class="ms-row" style="--ms:' + x.color + '"><span class="ms-name"><b>' + x.name + ' <i>' + r + '</i></b><small>+' + bonus + ' · ' + x.desc + '</small></span>' +
        '<button class="ms-up" data-mastery="' + x.id + '"' + (save.skillPoints >= cost ? '' : ' disabled') + ' title="Rang ' + (r + 1) + ' : ' + cost + ' point' + (cost > 1 ? 's' : '') + ' de voie">+' + cost + '</button></div>';
    }).join('') + '</div>';
    var deck = save.deck.map(skillById).filter(Boolean);
    html += '<div class="ms-awake"><h3>ÉVEILS <small>' + woke.length + ' / ' + allowed + (allowed < 1 || woke.length >= allowed ? ' · le prochain à ' + (allowed + 1) * AWAKEN_EVERY + ' rangs' : '') + '</small></h3>' +
      (deck.length ? deck.map(function (s) {
        var on = woke.indexOf(s.id) >= 0, can = on || woke.length < allowed;
        return '<button class="ms-spell' + (on ? ' on' : '') + '" data-awaken="' + s.id + '"' + (can ? '' : ' disabled') + ' title="' + (on ? 'Éveillé : ' + awakenDesc(s) + '. Clic pour le rendormir.' : 'Éveiller : ' + awakenDesc(s)) + '">' + s.name + (on ? ' ✦' : '') + '</button>';
      }).join('') : '<p class="muted">Ajoute des sorts à ton deck pour pouvoir les éveiller.</p>') + '</div>';
    box.innerHTML = html;
  }
  function renderTree() {
    renderMastery();
    var pts = $('skill-points');
    pts.textContent = save.skillPoints > 0 ? save.skillPoints + (save.skillPoints > 1 ? ' points de voie' : ' point de voie') : 'Aucun point : monte de niveau';
    pts.classList.toggle('has', save.skillPoints > 0);
    renderVoie();
    renderNodeInfo();
    renderDeck();
    renderVoiePick();
    if ($('page-skills').hidden) return;
    var L = templeLayout(), links = templeLinks(L), voie = chosenVoie(save);
    temple = { L: L, links: links };
    drawTempleBg(L, links);
    var html = '';

    if (!voie) {
      // les trois flaques : l'arme de la voie flotte au milieu ; on en choisit une, le détail est à droite
      VOIES.forEach(function (v, i) {
        var d = L.pool(i), on = pickedVoie().id === v.id;
        html += '<button class="tpool' + (on ? ' is-picked' : '') + '" data-pick-voie="' + v.id + '" aria-pressed="' + on + '" aria-label="' + v.name + '" style="left:' + d.x + 'px;top:' + d.y + 'px;--voie:' + v.color + ';--pw:' + (74 * L.s) + 'px;--ph:' + (36 * L.s) + 'px">' +
          '<img src="' + VOIE_ICON[v.id] + '" alt=""><b>' + v.name + '</b></button>';
      });
    } else {
      // à gauche du haut de chaque branche : son nom, ce qu'elle apporte et l'avancée ; au-dessus du sommet, son nom
      var col = voieOf(voie).color, sm = summitOf(voie), smp = L.pos(sm);
      PATHS[voie].forEach(function (p, i) {
        var done = save.tree.filter(function (id) { var n = nodeById(id); return n && n.path === i; }).length;
        html += '<div class="tpath' + (L.narrow ? ' mini' : '') + '" style="left:' + (L.narrow ? L.colX(i, BRANCHES) : L.colX(i, BRANCHES) - (SLAB_R + 6) * L.s) + 'px;top:' + (L.narrow ? L.first + 40 : L.rowY(STEPS)) + 'px;--voie:' + col + '" title="' + p.name + ' : ' + p.tag + '"><img src="' + branchIcon(voie, i) + '" alt=""><span><b>' + p.name.toUpperCase() + '</b><small>' + done + ' / ' + STEPS + ' dalles</small></span></div>';
      });
      html += '<div class="tsummit" style="left:' + smp.x + 'px;top:' + (smp.y - (SUMMIT_R + 3) * L.s) + 'px;--voie:' + col + '"><b>SOMMET · ' + sm.name.toUpperCase() + '</b><small>' + skillById(sm.skill).name + ' et un grand passif</small></div>';
      // à gauche de chaque rangée : le niveau requis et le prix de l'étape
      for (var st = 1; st <= STEPS; st++) {
        html += '<span class="ttier' + (save.level >= STEP_LEVEL[st] ? ' reached' : '') + '" style="left:' + (L.narrow ? 4 : L.rect.l - 150) + 'px;top:' + L.rowY(st) + 'px">NIV. ' + STEP_LEVEL[st] + (L.narrow ? '' : ' · ' + st + ' PT' + (st > 1 ? 'S' : '')) + '</span>';
      }
      html += '<span class="ttier' + (save.level >= SUMMIT.level ? ' reached' : '') + '" style="left:' + (L.narrow ? 4 : L.rect.l - 150) + 'px;top:' + L.rect.t + 'px">NIV. ' + SUMMIT.level + (L.narrow ? '' : ' · ' + SUMMIT.cost + ' PTS') + '</span>';
      TREE.forEach(function (n) {
        if (n.voie !== voie) return;
        var p = L.pos(n), known = hasNode(save, n.id), can = canLearnNode(save, n);
        var icon = n.summit ? armeIcon(n.voie) : (n.type === 'skill' ? spellIcon(skillById(n.skill)) : (n.type === 'passive' ? PASSIVE_ICON[n.voie] : STAT_ICON[Object.keys(n.stats)[0]]));
        var badge = n.type === 'stat' ? '<i class="tbadge">+' + n.stats[Object.keys(n.stats)[0]] + '</i>' : (n.type === 'skill' ? '<i class="tbadge spell">SORT</i>' : (n.summit ? '<i class="tbadge spell">ULTIME</i>' : ''));
        var cls = 'tslab ' + n.type + (known ? ' known' : (can ? ' can' : ' locked')) + (state.node === n.id ? ' is-selected' : '') + (n.id === save.tree[save.tree.length - 1] ? ' has-frog' : '');
        html += '<button class="' + cls + '" data-node="' + n.id + '" title="' + nodeName(n) + ' — ' + nodeDesc(n) + '" style="left:' + p.x + 'px;top:' + p.y + 'px;--voie:' + voieOf(n.voie).color + '" aria-label="' + nodeName(n) + '">' +
          '<img src="' + icon + '" alt="">' + badge + '</button>';
      });
    }
    html += '<img id="temple-frog" class="temple-frog" src="' + $('sb-portrait').toDataURL() + '" alt="Ta grenouille">';
    $('tree-nodes').innerHTML = html;
    $('tree-nodes').style.setProperty('--slab', ((SLAB_R * 2 + 3) * L.s) + 'px');
    $('tree-nodes').style.setProperty('--summit', ((SUMMIT_R * 2 + 3) * L.s) + 'px');
    placeTempleFrog(L, links);
  }

  // Le plongeon dans la flaque d'une voie : la grenouille remonte le ruisseau jusqu'à la flaque, y plonge
  // dans une gerbe d'éclaboussures, puis la voie est choisie et elle ressort dans le bassin, à sa couleur.
  var diving = false;
  function diveInto(voieId) {
    var L = temple.L, frog = $('temple-frog'), i = VOIES.map(function (v) { return v.id; }).indexOf(voieId);
    var path = temple.links[i].pts, t0 = performance.now(), hopDur = 300 + path.length * 6;
    diving = true;
    Array.prototype.forEach.call(document.querySelectorAll('.tpool, .vp-dive'), function (g) { g.classList.add('fading'); g.disabled = true; });
    Sfx.play('ladder');
    (function hop(now) {
      var k = Math.max(0, Math.min(1, (now - t0) / hopDur)), p = path[Math.min(path.length - 1, Math.floor(k * (path.length - 1)))];
      frog.style.left = p.x + 'px';
      frog.style.top = (p.y - Math.abs(Math.sin(k * Math.PI * Math.max(1, Math.round(path.length / 14)))) * 16) + 'px';
      if (k < 1) { requestAnimationFrame(hop); return; }
      // le plongeon
      var pool = L.pool(i);
      temple.splash = { x: pool.x, y: pool.y, t0: performance.now(), color: voieOf(voieId).color };
      frog.classList.add('diving');
      Sfx.play('drip'); Sfx.play('cut');
      setTimeout(function () {
        save.voie = voieId; state.node = null;
        ensureWeapon(save); // la Voie des Armes au corps à corps, la Voie du Lancer à distance
        setPlayer(save); persist(); buildHero(); renderAll();
        diving = false;
        var f2 = $('temple-frog');
        f2.classList.add('emerging');
        temple.splash = { x: temple.L.gate.x, y: temple.L.gate.y, t0: performance.now(), color: voieOf(voieId).color };
        Sfx.play('levelup');
        notice(voieId === 'ermite' ? 'La grenouille ressort de la flaque dorée : mode Ermite ! Peau orange, yeux de crapaud, plus d’arme, elle frappe à mains nues avec l’onde de paume.'
          : 'Tu as plongé dans la ' + voieOf(voieId).name + ' : trois branches s’ouvrent devant toi, et se rejoignent au sommet. Choisis maintenant ton arme, à droite.');
      }, 750);
    })(t0);
  }

  // La grenouille se tient sur la dernière dalle apprise (au bassin tant qu'aucune n'est prise).
  // Quand on apprend une nouvelle dalle, elle y saute en suivant le cours d'eau.
  function placeTempleFrog(L, links) {
    var frog = $('temple-frog'), last = save.tree.length ? nodeById(save.tree[save.tree.length - 1]) : null;
    var target = last ? last.id : 'gate';
    var spot = function (id) { return id === 'gate' ? L.gate : L.pos(nodeById(id)); };
    var put = function (p, hop) { frog.style.left = p.x + 'px'; frog.style.top = (p.y - hop) + 'px'; };
    cancelAnimationFrame(templeFrogRaf);
    var from = templeFrog;
    templeFrog = target;
    if (!from || from === target || save.tree.indexOf(target) < 0 || (from !== 'gate' && save.tree.indexOf(from) < 0)) { put(spot(target), 0); return; }
    var link = links.filter(function (l) { return l.to && l.to.id === target && ((l.from && l.from.id === from) || (!l.from && from === 'gate')); })[0];
    var path = link ? link.pts : stream(spot(from), spot(target));
    var t0 = performance.now(), dur = 300 + path.length * 12;
    (function step(now) {
      var k = Math.max(0, Math.min(1, (now - t0) / dur)), p = path[Math.min(path.length - 1, Math.floor(k * (path.length - 1)))];
      put(p, k < 1 ? Math.abs(Math.sin(k * Math.PI * Math.max(1, Math.round(path.length / 14)))) * 16 : 0);
      if (k < 1) templeFrogRaf = requestAnimationFrame(step);
    })(t0);
  }

  function renderNodeInfo() {
    var n = nodeById(state.node);
    if (!n || n.voie !== chosenVoie(save)) {
      $('node-info').innerHTML = '<p class="muted">' + (chosenVoie(save) ? 'Clique sur une dalle pour voir ce qu’elle apporte. Carrés : sorts · ronds : caractéristiques · losanges : passifs. Chaque étape coûte plus cher que la précédente, et les trois branches se rejoignent sur la dalle-sommet.' : 'Plonge dans l’une des trois flaques pour choisir ta voie : ce choix est définitif.') + '</p>';
      return;
    }
    var known = hasNode(save, n.id), block = learnBlock(save, n), v = voieOf(n.voie);
    var types = { stat: 'CARACTÉRISTIQUE', passive: 'PASSIF', skill: 'SORT', summit: 'DALLE-SOMMET' };
    var cdr = combatProfile(save).cdr, sk = n.skill && skillById(n.skill);
    var extra = sk ? 'Relance : ' + skillCd(sk, cdr) + ' tour' + (skillCd(sk, cdr) > 1 ? 's' : '') + (cdr && sk.cd > 1 ? ' (' + sk.cd + ', moins ' + Math.min(cdr, sk.cd - 1) + ' grâce à l’Esprit)' : '') : '';
    $('node-info').style.setProperty('--voie', v.color);
    $('node-info').innerHTML = '<span class="ni-type">' + types[n.type] + ' · ' + (n.summit ? 'OÙ SE REJOIGNENT LES TROIS BRANCHES' : pathName(n.voie, n.path).toUpperCase() + ' · ÉTAPE ' + n.step + ' / ' + STEPS) + '</span><h3>' + nodeName(n) + '</h3><span>' + nodeDesc(n) + '</span>' +
      (extra ? '<span class="muted">' + extra + '</span>' : '') +
      '<span class="ni-cost">Coût : <b>' + n.cost + ' point' + (n.cost > 1 ? 's' : '') + '</b> · niveau <b>' + n.level + '</b></span>' +
      (known ? '<span class="ni-known">Appris.</span>' : (block ? '<span class="muted">' + block + '</span>' : '<button class="btn" data-learn="' + n.id + '">Apprendre (' + n.cost + ' point' + (n.cost > 1 ? 's' : '') + ')</button>'));
  }

  // La voie sélectionnée dans le temple (avant le choix) : par défaut, celle de l'arme qu'on tient
  function pickedVoie() {
    if (!state.pick) state.pick = weaponOf(save.equip).kind === 'kunai' ? 'kunai' : 'baton';
    return voieOf(state.pick);
  }
  // À droite, tant qu'aucune voie n'est prise : le détail de la flaque sélectionnée (onglets pour passer de l'une
  // à l'autre) et le bouton pour y plonger. Une fois la voie prise : le deck.
  function renderVoiePick() {
    var voie = chosenVoie(save), box = $('voie-pick');
    box.hidden = !!voie; $('deck-side').hidden = !voie;
    if (voie) return;
    var v = pickedVoie(), sm = summitOf(v.id);
    box.style.setProperty('--voie', v.color);
    box.innerHTML = '<div class="vp-tabs" role="tablist" aria-label="Les trois voies">' + VOIES.map(function (o) {
      return '<button role="tab" data-pick-voie="' + o.id + '" aria-selected="' + (o.id === v.id) + '" style="--voie:' + o.color + '"><img src="' + VOIE_ICON[o.id] + '" alt="">' + o.short.toUpperCase() + '</button>';
    }).join('') + '</div>' +
      '<div class="vp-head"><img src="' + VOIE_ICON[v.id] + '" alt=""><h2>' + v.name.toUpperCase() + '</h2></div>' +
      '<p class="vp-desc">' + v.desc + '</p>' +
      (v.id === 'ermite' ? '<p class="ni-warn">Mode Ermite : peau orange, yeux de crapaud et plus d’arme. Tu te bats à mains nues.</p>' : '') +
      '<h3>TES CARACTÉRISTIQUES DE DÉPART</h3><div class="vp-stats">' + STATS.map(function (st) {
        return '<span style="--c:' + st.color + '"><img src="' + STAT_ICON[st.id] + '" alt=""><b>' + v.base[st.id] + '</b><small>' + st.name + '</small>' + (v.mult[st.id] ? '<i>1 pt = ' + n1(v.mult[st.id]) + '</i>' : '') + '</span>';
      }).join('') + '</div>' +
      '<p class="vp-desc small">Attribut principal : <b>' + STAT_NAME[v.main] + '</b>, qui fait tes dégâts. Chaque point de caractéristique réparti vaut ' + multText(v) + ' (×1 ailleurs)' + voieTraits(v) + '.' + (v.id === 'ermite' ? ' Sans arme : tu te bats à mains nues.' : ' Tu te bats ' + (v.id === 'kunai' ? 'à distance' : 'au corps à corps') + '.') + '</p>' +
      '<h3>TROIS BRANCHES, UN SOMMET</h3>' + PATHS[v.id].map(function (p, i) {
        return '<div class="vp-branch"><div class="vp-bhead"><img src="' + branchIcon(v.id, i) + '" alt=""><b>' + p.name + '</b><small>' + p.tag + '</small></div><ul class="vp-spells">' + p.skills.map(function (id, j) {
          var s = skillById(id);
          return '<li title="' + s.desc + '"><b>' + s.name + '</b><small>NIV. ' + STEP_LEVEL[1 + j * 3] + '</small><span>' + s.desc + '</span></li>';
        }).join('') + '</ul><p class="vp-pas">Passifs : ' + p.passives.map(function (ps) { return ps[0]; }).join(', ') + '</p></div>';
      }).join('') +
      '<div class="vp-branch summit"><div class="vp-bhead"><img src="' + VOIE_ICON[v.id] + '" alt=""><b>Sommet : ' + sm.name + '</b><small>NIV. ' + SUMMIT.level + '</small></div><p class="vp-pas">' + nodeDesc(sm) + '</p></div>' +
      '<button class="btn vp-dive" data-choose-voie="' + v.id + '"' + (diving ? ' disabled' : '') + '>Plonger dans cette voie ▶</button>' +
      '<p class="muted vp-note">Choix définitif. Plus tard, le ' + TEA.name + ' (' + TEA.price + ' lucioles) permet de tout recommencer.</p>';
  }

  // L'arme de la voie (Armes, Lancer) : à choisir une fois ; ensuite on ne manie, ne trouve et ne voit qu'elle
  function renderArmePick() {
    var voie = chosenVoie(save), box = $('arme-pick');
    box.hidden = !VOIE_ARMES[voie] || !VOIE_ARMES[voie].length;
    if (box.hidden) return;
    if (save.arme) {
      var t = WEAPON_TYPES[save.arme];
      box.innerHTML = '<h2>TON ARME</h2><div class="ap-cur"><img class="px" src="' + iconUrls[ARME_ICON[save.arme]] + '" alt=""><span><b>' + t.plural + '</b><small>Tu ne manies, ne trouves et ne vois plus que des ' + t.plural.toLowerCase() + '.</small></span></div>' +
        '<button class="btn btn-ghost ap-change" id="arme-change"' + (save.gold < ARME_PRICE ? ' disabled' : '') + '>Changer · ' + ARME_PRICE + ' lucioles</button>';
      return;
    }
    box.innerHTML = '<h2>CHOISIS TON ARME</h2><p class="muted ap-help">Ensuite, tu ne manieras, ne trouveras et ne verras plus qu’elle : butin, boutique et inventaire.</p><div class="ap-list">' +
      VOIE_ARMES[voie].map(function (id) {
        var b = SKILLS.filter(function (s) { return s.base === id; })[0];
        return '<button class="ap-opt" data-arme="' + id + '" title="' + b.name + ' : ' + b.desc + '"><img class="px" src="' + iconUrls[ARME_ICON[id]] + '" alt=""><b>' + WEAPON_TYPES[id].plural + '</b><small>' + WEAPON_TYPES[id].blurb + '</small></button>';
      }).join('') + '</div>';
  }
  function chooseArme(id) {
    save.arme = id;
    ensureWeapon(save); tidyShop(save);
    setPlayer(save); persist(); buildHero(); renderAll();
    Sfx.play('equip');
    notice('Ton arme : les ' + WEAPON_TYPES[id].plural.toLowerCase() + '. En main : ' + ITEMS[save.equip.arme].name + '. Tu ne trouveras plus que cette arme-là.');
  }

  // l'icône de l'attaque de base : l'arme en main (ou les mains nues)
  function baseIcon() { var w = weaponOf(save.equip); return w.kind === 'mains' ? ICON.paume : iconUrls[save.equip.arme]; }
  function renderDeck() {
    renderArmePick();
    var weapon = weaponOf(save.equip);
    var deck = deckSkills(save, weapon);
    var cdr = combatProfile(save).cdr;
    var meta = function (s) { var cd = skillCd(s, cdr); return s.base ? 'attaque de base · ' + WEAPON_TYPES[weaponType(weapon)].name.toLowerCase() : 'relance ' + cd + ' tour' + (cd > 1 ? 's' : ''); };
    var card = function (s, removable) {
      var v = voieOf(s.voie);
      return '<div class="dcard2" style="--voie:' + v.color + '"><img class="dc-ico" src="' + spellIcon(s) + '" alt=""><span class="dc-name">' + s.name + '<br><span class="dc-meta">' + meta(s) + '</span></span>' +
        (removable ? '<button data-undeck="' + s.id + '">Retirer</button>' : '') + '</div>';
    };
    var learned = learnedSkills(save);
    var chosen = save.deck.map(skillById).filter(function (s) { return s && learned.indexOf(s) >= 0; });
    var html = card(deck[0], false);
    for (var i = 0; i < DECK_SIZE; i++) {
      var s = chosen[i];
      if (!s) { html += '<div class="dcard2 empty">Emplacement libre</div>'; continue; }
      html += skillUsable(s, weapon) ? card(s, true)
        : '<div class="dcard2 off" style="--voie:' + voieOf(s.voie).color + '"><img class="dc-ico" src="' + spellIcon(s) + '" alt=""><span class="dc-name">' + s.name + '<br><span class="dc-meta">Inutilisable avec cette arme</span></span><button data-undeck="' + s.id + '">Retirer</button></div>';
    }
    var lhtml = learned.length ? learned.map(function (s) {
      var inDeck = save.deck.indexOf(s.id) >= 0, v = voieOf(s.voie);
      return '<div class="dcard2' + (inDeck ? ' in-deck' : '') + '" style="--voie:' + v.color + '"><img class="dc-ico" src="' + spellIcon(s) + '" alt=""><span class="dc-name">' + s.name + '<br><span class="dc-meta">' + s.desc + ' · ' + meta(s) + '</span></span>' +
        (inDeck ? '<button data-undeck="' + s.id + '">Retirer</button>' : '<button data-deck="' + s.id + '"' + (save.deck.length >= DECK_SIZE ? ' disabled' : '') + '>Ajouter</button>') + '</div>';
    }).join('') : '<p class="muted">Aucun sort appris. Chaque branche de ta voie commence par un sort : prends la première dalle d’une branche.</p>';
    $('deck').innerHTML = html;
    $('learned').innerHTML = lhtml;
    if (!$('build').hidden) renderBuild();
  }
  // ---------- Mon build : le deck en grand, et tous les sorts appris, d'un seul coup d'œil ----------
  function spellFacts(s, cdr) {
    var f = [], cd = skillCd(s, cdr);
    if (s.power > 0) f.push((s.hits > 1 ? s.hits + ' × ' : '') + Math.round(s.power * 100) + ' %');
    if (s.heal) f.push('soin ' + Math.round(s.heal * 100) + ' %');
    if (s.stun) f.push('étourdit'); if (s.bleed) f.push('saignement'); if (s.poison) f.push('poison'); if (s.guard) f.push('garde'); if (s.buff) f.push('+40 % dégâts'); if (s.mark) f.push('marque'); if (s.weaken) f.push('affaiblit');
    f.push(s.base ? 'chaque tour' : 'relance ' + cd);
    return f.join(' · ');
  }
  function renderBuild() {
    var weapon = weaponOf(save.equip), pr = combatProfile(save), learned = learnedSkills(save), deck = deckSkills(save, weapon), base = deck[0];
    var chosen = save.deck.map(skillById).filter(function (s) { return s && learned.indexOf(s) >= 0; });
    var slot = function (s, i) {
      if (!s) return '<div class="bd-slot empty"><span>' + (i + 1) + '</span><small>Libre</small></div>';
      var ok = skillUsable(s, weapon);
      return '<button class="bd-slot' + (ok ? '' : ' off') + '" style="--voie:' + voieOf(s.voie).color + '" data-undeck="' + s.id + '" title="Retirer du deck"><img class="px" src="' + spellIcon(s) + '" alt=""><b>' + s.name + '</b><small>' + (ok ? spellFacts(s, pr.cdr) : 'inutilisable avec cette arme') + '</small><i>✕</i></button>';
    };
    var html = '<header class="bd-head"><div><h2>MON BUILD</h2><p>Touche un sort pour l’ajouter à ton deck ou l’en retirer (4 au plus, plus l’attaque de base).</p></div>' +
      '<div class="bd-me"><span>Dégâts <b>' + Math.round(pr.dmg) + '</b></span><span>Sorts <b>+' + Math.round((pr.spell - 1) * 100) + ' %</b></span><span>Relance <b>' + (pr.cdr ? '−' + pr.cdr : 'normale') + '</b></span></div>' +
      '<button class="btn btn-ghost" data-build-close>Fermer ✕</button></header>';
    html += '<div class="bd-deck"><div class="bd-slot base" style="--voie:' + voieOf(base.voie).color + '"><img class="px" src="' + spellIcon(base) + '" alt=""><b>' + base.name + '</b><small>attaque de base · ' + WEAPON_TYPES[weaponType(weapon)].name.toLowerCase() + '</small></div>';
    for (var i = 0; i < DECK_SIZE; i++) html += slot(chosen[i], i);
    html += '</div><h3 class="bd-h">SORTS APPRIS · ' + learned.length + '</h3>';
    html += learned.length ? '<div class="bd-spells">' + learned.map(function (s) {
      var inDeck = save.deck.indexOf(s.id) >= 0, ok = skillUsable(s, weapon), full = save.deck.length >= DECK_SIZE;
      return '<button class="bd-spell' + (inDeck ? ' in' : '') + (ok ? '' : ' off') + '" style="--voie:' + voieOf(s.voie).color + '" ' + (inDeck ? 'data-undeck="' + s.id + '"' : (full ? 'disabled' : 'data-deck="' + s.id + '"')) + '>' +
        '<img class="px" src="' + spellIcon(s) + '" alt=""><span><b>' + s.name + '</b><small>' + spellFacts(s, pr.cdr) + '</small><em>' + s.desc + '</em></span><i>' + (inDeck ? '✓' : (full ? '' : '+')) + '</i></button>';
    }).join('') + '</div>' : '<p class="muted">Aucun sort appris pour l’instant : prends la première dalle d’une branche du Temple.</p>';
    $('build').innerHTML = '<div class="bd-card">' + html + '</div>';
  }

  // La voie choisie (définitive) et le bouton pour en changer : tout oublier contre le prix du Thé de l'oubli
  var resetArmed = 0;
  function renderVoie() {
    var v = voieOf(chosenVoie(save)), st = $('voie-status'), btn = $('tree-reset');
    st.innerHTML = v ? 'Voie choisie : <b style="color:' + v.color + '">' + v.short + '</b>' + (v.id === 'ermite' ? ' · mode Ermite' : '') + ' · ' + save.tree.length + ' / ' + (STEPS * BRANCHES + 1) + ' dalles' : 'Choisis ta voie : ce choix est définitif';
    btn.hidden = !v;
    btn.disabled = save.gold < TEA.price;
    btn.textContent = resetArmed ? 'Confirmer : tout oublier (' + TEA.price + ' lucioles)' : 'Changer de voie (' + TEA.price + ' lucioles)';
    btn.classList.toggle('is-armed', !!resetArmed);
  }
  // Tout oublier : les points dépensés sont rendus et la voie redevient libre
  function forgetTree() {
    save.skillPoints += treeCost(save); save.tree = []; save.deck = []; save.voie = null; save.arme = null;
    setPlayer(save); persist(); buildHero();
  }

  // ---------- Carte du monde : l'Île du départ et le Continent ----------
  function mapOf(view) { return isleById(view).map; }
  // la carte affichée : celle choisie (si son île est ouverte), sinon celle où l'on en est
  function mapView() {
    if (state.mapView && !isleOpen(save, isleById(state.mapView))) state.mapView = null;
    return state.mapView || isleOf(currentWorld()).id;
  }
  // ---------- La caméra de la carte ----------
  // cam.s : pixels d'écran par pixel de carte (fixe : la terre en cours remplit l'écran, la carte déborde et se promène) ;
  // cam.x, cam.y : où tombe le coin haut-gauche de la carte à l'écran. À l'ouverture, on se cale sur l'étape en cours.
  var cam = { s: 0, x: 0, y: 0, map: null, reset: true };
  function camLimits(M) {
    var vw = $('worldmap').clientWidth, vh = $('worldmap').clientHeight, s = Math.max(vw / M.W, vh / M.H, Math.min(vw, vh) / 340);
    return { vw: vw, vh: vh, min: s, max: s, focus: s };
  }
  // la partie de l'écran que le panneau d'une étape ne cache pas (à droite sur grand écran, en bas sur petit)
  function camFree(L) {
    if (!state.sheet) return { w: L.vw, h: L.vh };
    return L.vw > 900 ? { w: L.vw - 400, h: L.vh } : { w: L.vw, h: L.vh * 0.4 };
  }
  // (on peut dépasser un peu les bords, pour centrer une étape au bord de la mer)
  function camClamp(M, L) {
    cam.s = Math.max(L.min, Math.min(L.max, cam.s));
    var w = M.W * cam.s, h = M.H * cam.s, mx = L.vw * 0.3, my = L.vh * 0.3;
    cam.x = w <= L.vw ? (L.vw - w) / 2 : Math.max(L.vw - w - mx, Math.min(mx, cam.x));
    cam.y = h <= L.vh ? (L.vh - h) / 2 : Math.max(L.vh - h - my, Math.min(my, cam.y));
  }
  function camApply(M) {
    var el = $('wm-cam'), wm = $('worldmap'), T = SEA_TILE * cam.s;
    el.style.width = Math.round(M.W * cam.s) + 'px'; el.style.height = Math.round(M.H * cam.s) + 'px';
    el.style.transform = 'translate(' + Math.round(cam.x) + 'px,' + Math.round(cam.y) + 'px)';
    // la mer du dehors suit la carte, pixel pour pixel
    wm.style.backgroundSize = T + 'px ' + T + 'px';
    wm.style.backgroundPosition = Math.round(cam.x % T) + 'px ' + Math.round(cam.y % T) + 'px';
  }
  // Une tuile de haute mer, comme celle des cartes (map.js) : le bleu profond et ses vaguelettes, qui se répète sans fin
  // (une carte peut avoir son propre dehors, M.sea : le gouffre du Royaume sous la Terre)
  var SEA_TILE = 128, seaUrls = {};
  function seaTile(M) {
    var sc = (M && M.sea) || {}, deep = sc.deep || ['#0f2430', '#15323f'], key = deep[0];
    if (seaUrls[key]) return seaUrls[key];
    var t = document.createElement('canvas'); t.width = t.height = SEA_TILE;
    var x = t.getContext('2d');
    x.fillStyle = deep[0]; x.fillRect(0, 0, SEA_TILE, SEA_TILE);
    for (var n = 0; n < 11; n++) {
      var wx = 3 + Math.floor(hash(n, 11, 17) * (SEA_TILE - 8)), wy = 3 + Math.floor(hash(n, 12, 17) * (SEA_TILE - 6));
      x.fillStyle = sc.wave || '#2a5d66'; x.fillRect(wx, wy, 4, 1); x.fillRect(wx + 1, wy - 1, 2, 1);
    }
    for (var d = 0; d < 26; d++) { x.fillStyle = deep[1]; x.fillRect(Math.floor(hash(d, 13, 17) * SEA_TILE), Math.floor(hash(d, 14, 17) * SEA_TILE), 1, 1); }
    return (seaUrls[key] = t.toDataURL());
  }
  function camCenter(M, L, p, s) {
    var free = camFree(L);
    cam.s = Math.max(L.min, Math.min(L.max, s));
    cam.x = free.w / 2 - p.x * cam.s; cam.y = free.h / 2 - p.y * cam.s;
    camClamp(M, L);
  }
  // le point sur lequel se caler : l'étape ouverte, sinon la prochaine étape (ou la dernière réussie)
  function camTarget(M) {
    var T = M.TRAILS, n = T.length, s = state.sheet;
    if (s && s.w >= M.FIRST && s.w < M.FIRST + n) return T[s.w - M.FIRST].stages[s.st];
    var local = currentWorld() - M.FIRST;
    if (local >= n) return T[n - 1].stages[STAGES];
    local = Math.max(0, local);
    return T[local].stages[Math.min(STAGES, save.progress[M.FIRST + local] + 1)];
  }
  var cycleArmed = 0;
  function renderWorldMap() {
    // la première fois qu'une île s'ouvre : son film d'arrivée
    var arrival = ISLES.filter(function (s, i) { return i > 0 && isleOpen(save, s) && save.seenIsles.indexOf(s.id) < 0; })[0];
    if (arrival) { playArrival(arrival); return; }
    var view = mapView(), M = mapOf(view), off = M.FIRST, unlocked = [];
    for (var li = 0; li < M.REGIONS.length; li++) if (worldUnlocked(save, off + li)) unlocked.push(li);
    var m = M.render(unlocked), c = $('worldmap-canvas');
    if (c.width !== M.W || c.height !== M.H) { c.width = M.W; c.height = M.H; }
    c.getContext('2d').drawImage(m.canvas, 0, 0);
    $('worldmap').style.backgroundImage = 'url(' + seaTile(M) + ')'; // autour de la carte, la même mer (ou le même gouffre), à l'infini
    // la caméra : calée sur l'étape en cours quand on ouvre la carte ou qu'on change de carte, sinon elle reste où on l'a mise
    var L = camLimits(M);
    if (L.vw) {
      if (cam.reset || cam.map !== view || !cam.s) camCenter(M, L, camTarget(M), L.focus);
      else if (state.sheet) { // l'étape choisie doit rester visible, à côté du panneau
        var tp = camTarget(M), free = camFree(L), sx = cam.x + tp.x * cam.s, sy = cam.y + tp.y * cam.s;
        if (sx < 40 || sx > free.w - 40 || sy < 60 || sy > free.h - 40) camCenter(M, L, tp, cam.s); else camClamp(M, L);
      } else camClamp(M, L);
      cam.map = view; cam.reset = false;
      camApply(M);
    }
    var at = function (x, y) { return 'left:' + (x / M.W * 100) + '%;top:' + (y / M.H * 100) + '%'; };
    var cur = currentWorld(), html = '', ui = '';
    unlocked.forEach(function (li2) {
      var i = off + li2, tr = M.TRAILS[li2], prog = save.progress[i], stages = worldStages(i), b = BIOMES[i];
      // les 10 étapes, posées sur le sentier
      for (var k = 1; k <= STAGES; k++) {
        var p = tr.stages[k], s = stages[k - 1], cleared = k <= prog, next = k === prog + 1;
        var rank = s.rank === 'boss' ? ' boss' : (s.rank === 'gardien' ? ' guard' : '');
        var cls = 'wm-stage' + (cleared ? ' cleared' : (next ? ' next' : ' locked')) + rank + (state.sheet && state.sheet.w === i && state.sheet.st === k ? ' is-selected' : '');
        var inner = s.rank === 'boss' ? '<img src="' + monsterPortrait(s.enemy) + '" alt="">' : (next ? k : '');
        var tip = 'Étape ' + k + ' : ' + s.enemy.name + ' (niv. ' + s.enemy.level + ')' + (cleared ? ' — réussie' : '');
        html += cleared || next
          ? '<button class="' + cls + '" style="' + at(p.x, p.y) + '" data-world="' + i + '" data-st="' + k + '" title="' + tip + '" aria-label="' + tip + '">' + inner + '</button>'
          : '<span class="' + cls + '" style="' + at(p.x, p.y) + '" title="' + tip + '">' + inner + '</span>';
      }
      if (i === cur && prog < STAGES) {
        // la prochaine étape, bien lisible, au-dessus de son repère
        var np = tr.stages[prog + 1], ns = stages[prog];
        html += '<button class="wm-callout" style="' + at(np.x, np.y) + '" data-world="' + i + '" data-st="' + (prog + 1) + '">' +
          '<small>' + b.name.toUpperCase() + ' · ÉTAPE ' + (prog + 1) + ' / ' + STAGES + '</small>' +
          '<b>' + (ns.rank === 'boss' ? 'Boss : ' : (ns.rank === 'gardien' ? 'Gardien : ' : '')) + ns.enemy.name + '</b>' +
          '<span>Niveau ' + ns.enemy.level + ' · Voir l’étape ▶</span></button>';
      } else if (prog >= STAGES) {
        html += '<button class="region conquered" data-world="' + i + '" style="' + at(tr.landmark.x, tr.landmark.y - 34) + '"><b>' + b.name + '</b><small>CONQUISE</small></button>';
      }
    });
    if (m.peekAt) {
      html += '<div class="region fogged" style="' + at(m.peekAt.x, m.peekAt.y) + '"><b>Terre inconnue</b><small>BOSS À VAINCRE : ' + BIOMES[off + m.peek - 1].boss.name.toUpperCase() + '</small></div>';
    }
    // les deux cartes, une fois le Continent ouvert ; le cycle en cours ; la boussole et le zoom
    ui += '<canvas class="wm-compass" width="28" height="28" aria-hidden="true"></canvas>' +
      '<div class="wm-zoom"><button data-wm-zoom="me" title="Revenir à ma grenouille" aria-label="Revenir à ma grenouille"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M5 0h2v2.1A4 4 0 0 1 9.9 5H12v2H9.9A4 4 0 0 1 7 9.9V12H5V9.9A4 4 0 0 1 2.1 7H0V5h2.1A4 4 0 0 1 5 2.1zM6 4a2 2 0 1 0 0 4a2 2 0 0 0 0-4z" fill="currentColor"/></svg></button></div>';
    var opened = ISLES.filter(function (s) { return isleOpen(save, s); });
    if (opened.length > 1) {
      ui += '<div class="wm-switch">' + opened.map(function (s) { return '<button class="' + (view === s.id ? 'is-on' : '') + '" data-map-view="' + s.id + '">' + s.short + '</button>'; }).join('') + '</div>';
    }
    if ((save.cycle || 1) > 1) ui += '<div class="wm-cycle-tag">CYCLE ' + romanCycle(save.cycle) + '</div>';
    // le monde vaincu : le cycle suivant
    if (worldDone(save)) {
      var nc = (save.cycle || 1) + 1;
      ui += '<div class="wm-cycle panel"><h2>LE MONDE EST VAINCU</h2><p>' + BIOMES[BIOMES.length - 1].boss.name + ', le dernier boss du monde, est tombé. Le cycle ' + romanCycle(nc) + ' peut commencer : tout recommence au Marais-Brume, mais les monstres se mettent à ton niveau, et ils ont ' + Math.round((Math.pow(CYCLE.power, nc - 1) - 1) * 100) + ' % de PV et de dégâts en plus. En échange, tout ce que tu trouves devient « +' + (nc - 1) + ' » (+' + Math.round(CYCLE.loot * (nc - 1) * 100) + ' % de stats). Tu gardes ton niveau, tes objets et tes lucioles.</p>' +
        '<button class="btn' + (cycleArmed ? ' is-armed' : '') + '" data-next-cycle>' + (cycleArmed ? 'Confirmer : entrer dans le cycle ' + romanCycle(nc) : 'Entrer dans le cycle ' + romanCycle(nc) + ' ▶') + '</button></div>';
    }
    html += '<img id="wm-frog" class="wm-frog" src="' + $('sb-portrait').toDataURL() + '" alt="Ta grenouille">';
    $('worldmap-regions').innerHTML = html;
    $('wm-ui').innerHTML = ui;
    var cc = $('wm-ui').querySelector('.wm-compass');
    if (cc) M.drawCompass(cc.getContext('2d'), 14, 14);
    placeMapFrog(at, cur, M, view);
    renderStageSheet();
  }

  (function () {
    var wm = $('worldmap'), pts = {}, drag = null, moved = false, dragEnd = 0;
    var count = function () { return Object.keys(pts).length; };
    wm.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('#wm-ui')) { moved = false; return; } // les boutons fixes (zoom, cartes, cycle)
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (count() === 1) { drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; moved = false; }
    });
    window.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var M = mapOf(mapView()), L = camLimits(M);
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 6) return;
      moved = true; wm.classList.add('dragging');
      cam.x = drag.cx + dx; cam.y = drag.cy + dy;
      camClamp(M, L); camApply(M);
    });
    var up = function (e) {
      if (!pts[e.pointerId]) return;
      delete pts[e.pointerId];
      if (count() === 1) { var k = Object.keys(pts)[0]; drag = { x: pts[k].x, y: pts[k].y, cx: cam.x, cy: cam.y }; }
      if (!count()) { drag = null; wm.classList.remove('dragging'); if (moved) dragEnd = performance.now(); moved = false; }
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    // un glissé qui finit sur une étape ne l'ouvre pas
    wm.addEventListener('click', function (e) { if (performance.now() - dragEnd < 80) { e.stopPropagation(); e.preventDefault(); dragEnd = 0; } }, true);
  })();

  // La grenouille se tient sur la dernière étape réussie. Si elle a avancé depuis la dernière visite
  // de la carte, elle saute d'étape en étape le long du sentier jusqu'à sa nouvelle place.
  // (Sur l'Île, une fois partie pour le Continent, elle attend au bout du sentier, au nid du Héron.)
  var mapFrog = null, frogRaf = 0;
  function placeMapFrog(at, cur, M, view) {
    var frog = $('wm-frog'), T = M.TRAILS, n = T.length, local = cur - M.FIRST, target;
    if (local >= n) target = { map: view, w: n - 1, d: T[n - 1].total };
    else { local = Math.max(0, local); target = { map: view, w: local, d: T[local].stageDist[Math.min(save.progress[M.FIRST + local], STAGES)] }; }
    var put = function (p, hop) { frog.setAttribute('style', at(p.x, p.y) + ';transform:translateY(' + (-hop).toFixed(1) + 'px)'); };
    cancelAnimationFrame(frogRaf);
    var from = mapFrog;
    mapFrog = target;
    if (!from || from.map !== target.map || (from.w === target.w && from.d >= target.d) || from.w > target.w) { put(T[target.w].at(target.d), 0); return; }
    // trajet : la fin du sentier précédent si on a changé de région, puis le nouveau sentier
    var legs = from.w === target.w ? [{ w: target.w, a: from.d, b: target.d }] : [{ w: from.w, a: from.d, b: T[from.w].total }, { w: target.w, a: 0, b: target.d }];
    var total = legs.reduce(function (s, l) { return s + (l.b - l.a); }, 0), dur = Math.min(3200, 500 + total * 14), t0 = performance.now();
    (function step(now) {
      var k = Math.max(0, Math.min(1, (now - t0) / dur)), d = k * total, leg = legs[0];
      for (var i = 0; i < legs.length; i++) { leg = legs[i]; if (d <= leg.b - leg.a || i === legs.length - 1) break; d -= leg.b - leg.a; }
      var hop = k < 1 ? Math.abs(Math.sin(k * total / 11 * Math.PI)) * 14 : 0; // un bond tous les ~11 px de sentier
      put(T[leg.w].at(leg.a + Math.min(d, leg.b - leg.a)), hop);
      if (k < 1) frogRaf = requestAnimationFrame(step);
      else Sfx.play('point');
    })(t0);
  }

  // ---------- Les films d'arrivée sur chaque île (voir cinematic.js) ----------
  // Le Grand Plongeon (le Héron tombé, la grenouille plonge et ressort sur la plage du Continent), puis la Traversée
  // (le Dragon-Tempête tombé, une tortue géante la porte jusqu'à l'Île des Colosses). On peut les passer ; chacun ne se
  // joue qu'une fois (save.seenIsles).
  var FILMS = {
    continent: function () { return Cinematic.dive(HERO_IMG, ContinentMap); },
    colosses: function () { return Cinematic.crossing(HERO_IMG, ColossesMap); },
    archipel: function () { return Cinematic.mists(HERO_IMG, ArchipelMap); },
    royaume: function () { return Cinematic.descent(HERO_IMG, RoyaumeMap); }
  };
  function playArrival(isle) {
    var done = function () {
      if (save.seenIsles.indexOf(isle.id) < 0) save.seenIsles.push(isle.id);
      if (isle.id === 'continent') save.seenContinent = true;
      persist();
      state.mapView = isle.id;
      if (state.page === 'map') renderWorldMap(); else showPage('map');
    };
    if (!FILMS[isle.id]) { done(); return; }
    Sfx.music('calm');
    Cinematic.play(FILMS[isle.id](), done);
  }

  // ---------- Une étape : le panneau qui s'ouvre sur la carte ----------
  // Un clic sur une étape de la carte ouvre ce panneau : combattre tout de suite, ou partir en mission.
  function openStage(w, st) {
    state.sheet = { w: w, st: st };
    state.mapView = isleOf(w).id; // la carte de cette terre
    if (state.page !== 'map') showPage('map'); else renderWorldMap();
  }
  function renderStageSheet() {
    var box = $('stage-sheet');
    box.hidden = !state.sheet;
    if (!state.sheet) return;
    var w = state.sheet.w, s = worldStages(w)[state.sheet.st - 1], done = save.progress[w];
    var f = stageFight(save, w, s.stage), playable = s.stage <= done + 1, busy = !!save.expedition;
    var rankTxt = s.rank === 'boss' ? 'Grand boss' : (s.rank === 'gardien' ? 'Gardien' : 'Ennemi');
    var html = '<header class="sheet-top"><span>' + BIOMES[w].name.toUpperCase() + ' · ÉTAPE ' + s.stage + ' / ' + STAGES + '</span><button class="sheet-close" data-close-sheet aria-label="Fermer">×</button></header>' +
      '<div class="sp-head"><canvas id="sp-foe"></canvas><div><b>' + s.enemy.name + '</b><span>' + rankTxt + ' · niveau ' + s.enemy.level + ' · ' + s.enemy.maxHp + ' PV' + (s.stage <= done ? ' · déjà vaincu' : '') + '</span></div></div>';
    html += '<div class="sp-card fight"><h3>COMBAT</h3>' + (s.weather.id !== 'clair' ? '<span class="weather-tag">' + s.weather.name + ' : ' + s.weather.desc + '</span>' : '') +
      '<p>' + (s.stage <= done ? 'Tu peux rejouer ce combat pour gagner de l’XP et des lucioles.' : 'Un duel au tour par tour. Gagne-le pour avancer sur le sentier.') + '</p>' +
      '<span class="sp-reward"><b>' + f.rewards.xp + ' XP</b> · <b>' + f.rewards.gold + ' lucioles</b> · ' + Math.round(f.rewards.itemChance * 100) + ' % d’objet</span>' +
      '<button class="btn" data-fight="' + s.stage + '"' + (playable && !busy ? '' : ' disabled') + '>' + (!playable ? 'Étape verrouillée' : (busy ? 'En mission…' : 'Combattre ▶')) + '</button></div>';
    html += '<div class="sp-card"><h3>MISSIONS</h3><p>Envoie ' + escapeHtml(heroName()) + ' en mission ici : ça prend du temps réel, ça rapporte sans combattre, mais ça ne fait pas avancer.</p>';
    var e = save.expedition;
    if (e) {
      var left = expeditionLeft(save), here = e.w === w && e.st === s.stage;
      html += '<div class="exp-run" id="exp-run"><b>' + e.name + (here ? '' : ' (' + BIOMES[e.w].name + ', étape ' + e.st + ')') + '</b><span class="xp-track"><span style="width:0%"></span></span>' +
        '<span id="exp-left"' + (left <= 0 ? ' data-done="1"' : '') + '>' + (left > 0 ? 'Retour dans ' + mmss(left) : 'Terminée !') + '</span>' +
        (left > 0 ? '<button class="btn btn-ghost" id="exp-cancel">Abandonner</button>' : '<button class="btn" id="exp-claim">Récupérer ▶</button>') + '</div>';
    } else {
      html += EXPEDITIONS.map(function (x) {
        var r = expeditionRewards(w, s.stage, x);
        return '<div class="exp"><div class="exp-text"><b>' + x.name + '</b><span>' + mmss(x.secs * 1000) + ' · ' + r.gold + ' lucioles · ' + r.xp + ' XP' + (x.item ? ' · ' + Math.round(x.item * 100) + ' % d’objet' : '') + '</span></div>' +
          '<button class="btn" data-exp="' + x.id + '"' + (playable ? '' : ' disabled') + '>Partir</button></div>';
      }).join('');
    }
    html += '</div>';
    box.innerHTML = html;
    drawPortrait($('sp-foe'), s.enemy);
    renderExpedition();
  }

  // ---------- Boutique ----------
  function renderShop() {
    if (dailyShop(save)) persist(); // l'arrivage du jour
    var rr = rerollState(save), rb = $('reroll');
    rb.textContent = rr.left ? 'Nouvel arrivage · ' + rr.price + ' lucioles (' + rr.left + ' / ' + SHOP_REROLL_MAX + ')' : 'Plus d’arrivage aujourd’hui';
    rb.title = 'L’étal se renouvelle tout seul chaque jour. Tu peux le relancer ' + SHOP_REROLL_MAX + ' fois par jour, et chaque relance coûte le double de la précédente.';
    rb.disabled = !rr.left || save.gold < rr.price;
    var items = save.shop.filter(function (id) { return id === TEA_ID || (!owns(id) && itemAvailable(save, id)); });
    if (items.indexOf(state.ware) < 0) state.ware = items[0] || null;
    $('stock').innerHTML = items.length ? items.map(function (id) {
      var tea = id === TEA_ID, price = tea ? TEA.price : itemPrice(id);
      return '<button class="ware2' + (tea ? '' : ' rar-' + rarityOf(id)) + (state.ware === id ? ' is-selected' : '') + (save.gold < price ? ' is-poor' : '') + '"' + (tea ? '' : ' style="' + rarStyle(id) + '"') + ' data-ware="' + id + '">' +
        '<span class="ware2-icon"><img src="' + (tea ? ICON.the : iconUrls[id]) + '" alt=""></span>' +
        '<span class="ware2-tag"><b>' + (tea ? TEA.name : ITEMS[id].name) + '</b><span class="price">' + price.toLocaleString('fr-FR') + ' <small>lucioles</small></span></span></button>';
    }).join('') : '<p class="empty-stock">L’étal est vide. Paie un nouvel arrivage pour voir d’autres trésors.</p>';
    renderShopCard();
    layoutShop();
  }

  // ---------- Skins : la cabane de l'atelier ----------
  // Une cabane en plein écran : la grenouille au milieu, sur son tapis, essaie les skins. Trois skins du jour
  // (skinsOfDay, les mêmes pour tout le monde, renouvelés à minuit) s'achètent ; ceux qu'on a, et les couleurs de
  // départ, se portent depuis la garde-robe.
  var skinsBg = null, skinsRaf = 0, skinFrames = {};
  var SK_W = 320, SK_H = 180, SK_FLOOR = 132; // le décor, en pixels ; la grenouille a les pieds sur le tapis (SK_FLOOR)
  function ownsSkin(id) { return !!SKINS[id] || save.skins.indexOf(id) >= 0; }
  function wearSkin(id) { save.hero.skin = id; setPlayer(save); persist(); buildHero(); renderAll(); }
  var skinFaces = {};
  function skinFace(id) { // la petite image d'un skin, de face (sans ce que porte la grenouille)
    if (!skinFaces[id]) {
      var saved = [heroSkin, playerHermit];
      heroSkin = skinOf(id); playerHermit = false;
      skinFaces[id] = frogFrames(DEFAULT_EQUIP).face[0].toDataURL();
      heroSkin = saved[0]; playerHermit = saved[1];
    }
    return skinFaces[id];
  }
  // la grenouille dans un skin, avec ce qu'elle porte : face, profil et dos (deux images chacun)
  function tryOnFrames(id) { // (en mode Ermite aussi, la grenouille montre le skin : on voit ce qu'il donnera)
    var key = id + '|' + JSON.stringify(save.equip);
    if (!skinFrames[key]) {
      var saved = [heroSkin, playerHermit];
      heroSkin = skinOf(id); playerHermit = false;
      var f = frogFrames(save.equip);
      skinFrames[key] = { face: f.face, profil: f.profil, dos: f.dos };
      heroSkin = saved[0]; playerHermit = saved[1];
    }
    return skinFrames[key];
  }
  var lucioles = function (n) { return n.toLocaleString('fr-FR') + ' lucioles'; };
  // le décor : planches, poutre, fenêtre ronde sous la lune, lanternes, portants chargés de kimonos, tapis
  function buildSkinsBg() {
    var c = document.createElement('canvas'); c.width = SK_W; c.height = SK_H;
    var x = c.getContext('2d'), R = function (px, py, w, h, col) { x.fillStyle = col; x.fillRect(px, py, w, h); };
    for (var px = 0; px < SK_W; px += 16) { // les planches du mur
      R(px, 0, 16, SK_FLOOR, px % 32 ? '#4a2e1a' : '#553520');
      R(px, 0, 1, SK_FLOOR, '#2a180c');
      for (var k = 0; k < 3; k++) R(px + 4 + Math.round(hash(px, k, 3) * 8), Math.round(hash(px, k, 4) * SK_FLOOR), 2, 1, '#3a2212');
    }
    R(0, 0, SK_W, 12, '#2e1c0e'); R(0, 12, SK_W, 2, '#6b4424'); R(0, 14, SK_W, 1, '#1a1008'); // la poutre
    // la fenêtre ronde, la nuit et la lune
    var wx = 160, wy = 42, wr = 24;
    for (var yy = -wr - 3; yy <= wr + 3; yy++) for (var xx = -wr - 3; xx <= wr + 3; xx++) {
      var d = Math.sqrt(xx * xx + yy * yy);
      if (d <= wr) R(wx + xx, wy + yy, 1, 1, yy < -8 ? '#16203a' : (yy < 6 ? '#1e2c4a' : '#27385a'));
      else if (d <= wr + 3) R(wx + xx, wy + yy, 1, 1, d <= wr + 1 ? '#8a6a3a' : '#3a2412');
    }
    for (var s = 0; s < 14; s++) R(wx - 18 + Math.round(hash(s, 1, 8) * 36), wy - 18 + Math.round(hash(s, 2, 8) * 30), 1, 1, '#c8d8ff');
    for (var my = -6; my <= 6; my++) for (var mx = -6; mx <= 6; mx++) if (mx * mx + my * my <= 36 && (mx - 3) * (mx - 3) + (my + 1) * (my + 1) > 22) R(wx + 8 + mx, wy - 6 + my, 1, 1, '#f3e8b8');
    R(wx - wr, wy, wr * 2, 1, '#3a2412'); R(wx, wy - wr, 1, wr * 2, '#3a2412'); // les croisillons
    // deux portants de kimonos
    [[16, 104], [SK_W - 104, SK_W - 16]].forEach(function (rail, side) {
      R(rail[0], 34, rail[1] - rail[0], 2, '#8a6a3a'); R(rail[0], 36, rail[1] - rail[0], 1, '#3a2412');
      R(rail[0] + 2, 34, 2, 70, '#6b4a2a'); R(rail[1] - 4, 34, 2, 70, '#6b4a2a');
      ['#c9412f', '#3a7fc9', '#e0b43a', '#4e9a45', '#8a4ab0', '#e07a2a'].slice(side * 2, side * 2 + 4).forEach(function (col, i) {
        var kx = rail[0] + 10 + i * 20;
        R(kx + 7, 32, 2, 4, '#c3c9d1'); // le cintre
        R(kx, 37, 16, 3, col); R(kx - 3, 38, 22, 5, col); // les manches
        R(kx + 2, 40, 12, 26, col); R(kx + 2, 50, 12, 3, '#f3d27a'); // l'obi
        R(kx + 7, 40, 2, 10, '#f4f4e8'); R(kx + 2, 64, 12, 2, 'rgba(0, 0, 0, 0.25)');
        R(kx - 3, 43, 22, 1, 'rgba(0, 0, 0, 0.25)');
      });
    });
    // deux lanternes de papier
    [96, 224].forEach(function (lx) {
      R(lx, 14, 1, 14, '#1a1008');
      R(lx - 6, 28, 13, 2, '#3a2412'); R(lx - 7, 30, 15, 16, '#f0b060'); R(lx - 7, 30, 15, 2, '#ffd890'); R(lx - 7, 44, 15, 2, '#c87a30');
      [34, 38, 42].forEach(function (ry) { R(lx - 7, ry, 15, 1, '#d88a40'); });
      R(lx - 6, 46, 13, 2, '#3a2412');
    });
    // le plancher et le tapis rond
    for (var fy = SK_FLOOR; fy < SK_H; fy += 6) { R(0, fy, SK_W, 6, fy % 12 ? '#6b4a2a' : '#5e4024'); R(0, fy, SK_W, 1, '#3a2412'); }
    R(0, SK_FLOOR - 2, SK_W, 3, '#2e1c0e');
    for (var ry2 = -14; ry2 <= 14; ry2++) for (var rx2 = -66; rx2 <= 66; rx2++) {
      var e = (rx2 * rx2) / (66 * 66) + (ry2 * ry2) / (14 * 14);
      if (e > 1) continue;
      R(160 + rx2, SK_FLOOR + 6 + ry2, 1, 1, e > 0.82 ? '#e0b43a' : (e > 0.7 ? '#6a1a1a' : ((rx2 + ry2 * 3) % 9 === 0 && e > 0.3 ? '#a8342a' : '#8a2626')));
    }
    // la lumière chaude des lanternes
    var glow = x.createRadialGradient(160, 80, 10, 160, 80, 190);
    glow.addColorStop(0, 'rgba(255, 190, 110, 0.18)'); glow.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    x.fillStyle = glow; x.fillRect(0, 0, SK_W, SK_H);
    return c;
  }
  function openSkins() {
    if (!skinsBg) skinsBg = buildSkinsBg();
    if (!state.tryOn || !skinOf(state.tryOn) || (!ownsSkin(state.tryOn) && skinsOfDay().indexOf(state.tryOn) < 0)) state.tryOn = save.hero.skin;
    state.skinView = state.skinView || 'face';
    renderSkins();
    cancelAnimationFrame(skinsRaf);
    var cv = $('skins-scene'), ctx = cv.getContext('2d');
    cv.width = SK_W; cv.height = SK_H;
    ctx.imageSmoothingEnabled = false;
    (function loop(now) {
      if (state.page !== 'skins') return;
      ctx.drawImage(skinsBg, 0, 0);
      var frames = tryOnFrames(state.tryOn)[state.skinView], f = frames[Math.floor(now / (1040 / frames.length)) % frames.length], S = 2;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; ctx.fillRect(160 - 22, SK_FLOOR + 4, 44, 4); // l'ombre sur le tapis
      ctx.drawImage(f, 160 - 16 * S, SK_FLOOR + 6 - 32 * S, 32 * S, 32 * S);
      for (var i = 0; i < 12; i++) { // la poussière dans la lumière
        var t = now / 1000 + i * 7.3, mx = (40 + i * 23 + Math.sin(t * 0.4) * 10) % SK_W, my = (20 + ((t * 4 + i * 13) % 100));
        ctx.fillStyle = 'rgba(255, 230, 170, ' + (0.15 + 0.15 * Math.sin(t)) + ')'; ctx.fillRect(Math.round(mx), Math.round(my), 1, 1);
      }
      skinsRaf = requestAnimationFrame(loop);
    })(performance.now());
  }
  function untilMidnight() {
    var d = new Date(), m = new Date(d); m.setHours(24, 0, 0, 0);
    var min = Math.ceil((m - d) / 60000);
    return Math.floor(min / 60) + ' h ' + String(min % 60).padStart(2, '0');
  }
  function renderSkins() {
    var day = skinsOfDay(), id = state.tryOn, sk = skinOf(id), mine = ownsSkin(id), worn = save.hero.skin === id, today = day.indexOf(id) >= 0;
    var card = function (sid) {
      var s = PREMIUM_SKINS[sid], have = ownsSkin(sid), on = save.hero.skin === sid && !playerHermit;
      return '<button class="sk-day' + (state.tryOn === sid ? ' is-selected' : '') + (have ? ' is-mine' : '') + (!have && save.gold < s.price ? ' is-poor' : '') + '" data-skin-try="' + sid + '">' +
        '<img class="px" src="' + skinFace(sid) + '" alt=""><b>' + s.name + '</b><small>' + (on ? 'porté' : (have ? 'à toi' : lucioles(s.price))) + '</small></button>';
    };
    var tile = function (sid) {
      return '<button class="sk-own' + (state.tryOn === sid ? ' is-selected' : '') + (save.hero.skin === sid ? ' is-worn' : '') + '" data-skin-try="' + sid + '" title="' + skinOf(sid).name + '"><img class="px" src="' + skinFace(sid) + '" alt=""></button>';
    };
    var owned = save.skins.filter(function (sid) { return PREMIUM_SKINS[sid]; });
    var action = playerHermit ? '<p class="sk-miss">En mode Ermite, ta grenouille garde sa peau d’Ermite : pas de skin pour l’instant.</p>'
      : worn ? '<p class="sk-state">Tu le portes.</p>'
      : mine ? '<button class="btn" data-skin-wear="' + id + '">Porter</button>'
      : today ? '<button class="btn" data-skin-buy="' + id + '"' + (save.gold < sk.price ? ' disabled' : '') + '>Acheter · ' + lucioles(sk.price) + '</button>' + (save.gold < sk.price ? '<p class="sk-miss">Il te manque ' + lucioles(sk.price - save.gold) + '.</p>' : '')
      : '<p class="sk-state">Pas en vente aujourd’hui.</p>';
    $('skins-ui').innerHTML =
      '<header class="sk-head"><h1>SKINS</h1><p>Trois skins par jour · les suivants dans <b>' + untilMidnight() + '</b></p></header>' +
      '<aside class="sk-wardrobe"><h2>TA GARDE-ROBE</h2>' + (owned.length ? '<div class="sk-owns">' + owned.map(tile).join('') + '</div>' : '<p class="sk-empty">Tes skins achetés viendront ici.</p>') +
      '<h3>COULEURS DE DÉPART</h3><div class="sk-owns">' + Object.keys(SKINS).map(tile).join('') + '</div></aside>' +
      '<aside class="sk-card"><div class="views">' + [['face', 'Face'], ['profil', 'Profil'], ['dos', 'Dos']].map(function (v) { return '<button class="tab' + (state.skinView === v[0] ? ' is-active' : '') + '" data-skin-view="' + v[0] + '">' + v[1] + '</button>'; }).join('') + '</div>' +
      '<h2>' + sk.name + '</h2><span class="sk-kind">' + (PREMIUM_SKINS[id] ? (today ? 'Skin du jour' : 'Skin') : 'Couleur de départ · gratuite') + '</span>' +
      '<p>' + (sk.desc || 'Une des couleurs du marais, offerte à toutes les grenouilles.') + '</p>' + action + '</aside>' +
      '<div class="sk-days"><h2>LES SKINS DU JOUR</h2><div class="sk-row">' + day.map(card).join('') + '</div></div>';
  }

  // La fiche de l'objet choisi : ce qu'il donne, comparé à ce que la grenouille porte, et le bouton d'achat
  function renderShopCard() {
    var id = state.ware, card = $('shop-card');
    card.hidden = !id;
    if (!id) return;
    var head = function (img, name, kind) { return '<div class="sc-id"><img src="' + img + '" alt=""><div><h3>' + name + '</h3><span class="sc-kind">' + kind + '</span></div></div>'; };
    if (id === TEA_ID) {
      var canTea = !!chosenVoie(save), refund = treeCost(save);
      card.innerHTML = head(ICON.the, TEA.name, 'Consommable') +
        '<div class="sc-body"><p>' + TEA.desc + '</p>' + (canTea ? '<span class="sc-cur">Ta voie redevient libre et tu récupères ' + refund + ' point' + (refund > 1 ? 's' : '') + ' de voie.</span>' : '<span class="sc-miss">Tu n’as encore choisi aucune voie.</span>') + '</div>' +
        buyButton(id, TEA.price, canTea);
      return;
    }
    var it = ITEMS[id], price = itemPrice(id), slot = SLOTS.filter(function (s) { return s.id === it.slot; })[0];
    var worn = save.equip[it.slot], now = computeStats(save.equip), tryEquip = Object.assign({}, save.equip);
    tryEquip[it.slot] = id;
    var after = computeStats(tryEquip);
    var rows = STATS.map(function (st) {
      var own = it.stats[st.id] || 0, d = after[st.id] - now[st.id];
      if (!own && !d) return '';
      return '<li>' + st.name + ' ' + fmt(own) + (d ? ' <b class="' + (d > 0 ? 'sc-up' : 'sc-down') + '">' + (d > 0 ? '▲' : '▼') + fmt(d) + '</b>' : ' <b>=</b>') + '</li>';
    }).join('');
    card.innerHTML = head(iconUrls[id], it.name, slot.name + (it.kind ? ' · ' + weaponLabel(it) : '') + ' · ' + RARITIES[rarityOf(id)].name) +
      '<div class="sc-body"><p>' + it.desc + '</p>' + (rows ? '<ul class="sc-stats">' + rows + '</ul>' : '') +
      (it.slot === 'arme' && !weaponAllowed(save, it) ? '<span class="sc-miss">Réservée à la ' + voieDef(it.kind).name + '.</span>' : '') +
      '<span class="sc-cur">' + (worn ? 'Remplace : ' + ITEMS[worn].name : 'Emplacement ' + slot.name.toLowerCase() + ' libre') + '</span></div>' +
      buyButton(id, price, true);
  }
  function buyButton(id, price, ok) {
    var miss = price - save.gold;
    return '<div class="sc-buy"><button class="btn" data-buy="' + id + '"' + (ok && miss <= 0 ? '' : ' disabled') + '>Acheter<br><span>' + price.toLocaleString('fr-FR') + ' lucioles</span></button>' +
      (miss > 0 ? '<span class="sc-miss">Il te manque ' + miss.toLocaleString('fr-FR') + ' lucioles.</span>' : '') + '</div>';
  }

  // ---------- Classement ----------
  // Une liste simple et sobre : les 50 premières grenouilles, puis la suite à la demande. Cinq façons
  // de trier (aventure, niveau, succès, tour, duels), un filtre par voie, et un clic sur une ligne déplie sa fiche.
  var rank = { data: null, joueurs: 0, duels: null, loading: false, error: '', sort: 'aventure', voie: 'toutes', sel: null, limit: 50 };
  var RANK_PAGE = 50;
  var TOTAL_STAGES = BIOMES.length * STAGES;
  var RANK_SORTS = {
    aventure: { name: 'Aventure', cmp: function (a, b) { return b.conquis - a.conquis || b.niveau - a.niveau || b.xp - a.xp; },
      metric: function (e) { return ((e.cycle || 1) > 1 ? 'Cycle ' + romanCycle(e.cycle) + ' · ' : '') + ((e.conquis - ((e.cycle || 1) - 1) * TOTAL_STAGES) >= TOTAL_STAGES ? 'Monde vaincu !' : (BIOMES[e.monde] || BIOMES[0]).name + ' · ' + e.etape + '/' + STAGES); } },
    niveau: { name: 'Niveau', cmp: function (a, b) { return b.niveau - a.niveau || b.xp - a.xp || b.conquis - a.conquis; },
      metric: function (e) { return 'Niveau ' + e.niveau; } },
    succes: { name: 'Succès', cmp: function (a, b) { return b.succes - a.succes || b.niveau - a.niveau; },
      metric: function (e) { return e.succes + ' succès'; } },
    tour: { name: 'Tour', cmp: function (a, b) { return (b.tour || 0) - (a.tour || 0) || b.niveau - a.niveau; },
      metric: function (e) { return 'Étage ' + (e.tour || 0) + ' / ' + ((e.tour || 0) >= TOWER_FLOORS ? TOWER_TOP : TOWER_FLOORS); } },
    saison: { name: 'Saison', cmp: function (a, b) { return rankPts(b) - rankPts(a) || b.niveau - a.niveau; },
      metric: function (e) { return rankPts(e).toLocaleString('fr-FR') + ' pts'; } },
    clans: { name: 'Clans', cmp: function () { return 0; }, metric: function () { return ''; } },
    reputation: { name: 'Duels', cmp: function (a, b) { return (b.rep || 0) - (a.rep || 0) || b.niveau - a.niveau; },
      metric: function (e) { return (e.rep || 0) + ' réputation'; } }
  };
  function rankPts(e) { return e.saison === (rank.saison ? rank.saison.id : seasonId()) ? e.pts || 0 : 0; } // les points de la saison en cours
  var RANK_VOIES = [{ id: 'toutes', short: 'Toutes' }].concat(VOIES, [{ id: 'aucune', short: 'Sans voie' }]);
  var portraitCache = {};
  // La grenouille d'un autre joueur, avec sa peau et son équipement (et le mode Ermite)
  function portraitOf(e) {
    var equip = Object.assign({}, DEFAULT_EQUIP);
    Object.keys(e.equip || {}).forEach(function (slot) { var id = baseOf(e.equip[slot]), it = ITEMS[id]; if (it && it.slot === slot) equip[slot] = id; }); // l'apparence ne dépend que du modèle
    var hermit = e.voie === 'ermite', key = e.peau + '|' + hermit + '|' + (e.mutations || 0) + '|' + JSON.stringify(equip);
    if (!portraitCache[key]) {
      var saved = [heroSkin, playerHermit, playerMutation];
      heroSkin = skinOf(e.peau); playerHermit = hermit; playerMutation = { n: e.mutations || 0, traits: {} };
      portraitCache[key] = gridToCanvas(buildKawazuAnims(dressKawazu(sp, lookFor(equip))).idle.frames[0], paletteFor(sp.PAL, equip)).toDataURL();
      heroSkin = saved[0]; playerHermit = saved[1]; playerMutation = saved[2];
    }
    return portraitCache[key];
  }
  function ago(vu) {
    var h = Math.floor(Date.now() / 3600e3) - vu;
    return h <= 0 ? 'dans l’heure' : (h < 24 ? 'il y a ' + h + ' h' : 'il y a ' + Math.floor(h / 24) + ' j');
  }
  function openRank() {
    if (!Cloud.id) { rank.data = null; renderRank(); return; }
    rank.loading = true; rank.error = '';
    renderRank();
    // la dernière partie d'abord, pour que sa propre fiche soit à jour
    Cloud.flush().then(function () { return fetch('/api/classement', { credentials: 'same-origin' }); }).then(function (r) {
      if (!r.ok) throw new Error();
      return r.json();
    }).then(function (d) {
      rank.data = d.grenouilles; rank.joueurs = d.joueurs; rank.duels = d.duels; rank.saison = d.saison || null; rank.clans = d.clans || []; rank.loading = false;
      renderRank();
    }, function () { rank.loading = false; rank.error = 'Le classement n’a pas pu être chargé. Réessaie dans un instant.'; renderRank(); });
  }
  function rankedList() {
    var list = (rank.data || []).filter(function (e) { return rank.voie === 'toutes' || (rank.voie === 'aucune' ? !e.voie : e.voie === rank.voie); });
    if (rank.sort === 'saison') list = list.filter(function (e) { return rankPts(e) > 0; }); // (celles qui ont joué ce mois-ci)
    return list.sort(RANK_SORTS[rank.sort].cmp);
  }
  function voieChip(e) {
    var v = voieOf(e.voie);
    return v ? '<span class="rk-voie" style="--voie:' + v.color + '"><img src="' + VOIE_ICON[v.id] + '" alt="">' + v.short + '</span>' : '<span class="rk-voie none">Sans voie</span>';
  }
  // La voie d'une grenouille, dans sa fiche : son nom, son avancée dans le temple et les sorts qu'elle emporte
  function rcVoie(e) {
    var v = voieOf(e.voie);
    if (!v) return '<div class="rc-voie none"><b>PAS ENCORE DE VOIE</b><span>Elle n’a pas encore plongé dans une flaque du temple.</span></div>';
    var spells = (e.sorts || []).map(skillById).filter(Boolean);
    return '<div class="rc-voie" style="--voie:' + v.color + '"><img class="px" src="' + VOIE_ICON[v.id] + '" alt=""><div><b>' + v.name.toUpperCase() + '</b>' +
      '<span>' + (e.dalles || 0) + ' / ' + (STEPS * BRANCHES + 1) + ' dalles du temple' + (v.id === 'ermite' ? ' · mode Ermite' : '') + '</span>' +
      (spells.length ? '<span class="rc-spells">' + spells.map(function (s) { return '<i title="' + s.desc + '">' + s.name + '</i>'; }).join('') + '</span>' : '<span class="muted">Aucun sort équipé</span>') + '</div></div>';
  }
  // la fiche dépliée sous une ligne
  function rankDetail(e) {
    var lands = BIOMES.map(function (b, w) {
      var p = e.progres[w] || 0, seen = w === 0 || (e.progres[w - 1] || 0) >= STAGES;
      return '<li class="' + (seen ? '' : 'fog') + '"><span>' + (seen ? b.name : 'Terre inconnue') + '</span><span class="pips">' + Array.from({ length: STAGES }, function (_, k) { return '<i' + (k < p ? ' class="on"' : '') + '></i>'; }).join('') + '</span></li>';
    }).join('');
    var gear = SLOTS.map(function (s) { var id = e.equip && e.equip[s.id] && baseOf(e.equip[s.id]), it = ITEMS[id]; return it && it.slot === s.id && !(s.id === 'arme' && e.voie === 'ermite') ? '<img class="px" src="' + iconUrls[id] + '" alt="' + it.name + '" title="' + s.name + ' : ' + it.name + '">' : ''; }).join('');
    return '<div class="rk-detail"><div class="rd-col"><div class="rc-stats"><span><b>' + e.niveau + '</b>niveau</span><span><b>' + e.conquis + '/' + TOTAL_STAGES + '</b>étapes</span><span><b>' + (e.tour || 0) + '</b>étage de la tour</span><span><b>' + (e.rep || 0) + '</b>réputation</span></div>' +
      rcVoie(e) + '<div class="rc-gear"><span class="muted">' + (e.voie === 'ermite' ? 'Mains nues' : 'Équipement') + '</span>' + gear + '</div><span class="muted rc-seen">Dernière partie ' + ago(e.vu) + '</span></div>' +
      '<ul class="rc-lands">' + lands + '</ul></div>';
  }
  function renderRank() {
    var S = RANK_SORTS[rank.sort];
    $('rank-tabs').innerHTML = Object.keys(RANK_SORTS).map(function (k) { return '<button role="tab" data-rank-sort="' + k + '" aria-selected="' + (k === rank.sort) + '">' + RANK_SORTS[k].name + '</button>'; }).join('');
    $('rank-filters').innerHTML = RANK_VOIES.map(function (v) {
      return '<button data-rank-voie="' + v.id + '" aria-pressed="' + (v.id === rank.voie) + '"' + (v.color ? ' style="--voie:' + v.color + '"' : '') + '>' + (VOIE_ICON[v.id] ? '<img src="' + VOIE_ICON[v.id] + '" alt="">' : '') + v.short + '</button>';
    }).join('');
    var list = $('rank-list'), foot = $('rank-foot'), note = $('rank-note');
    note.hidden = true; foot.innerHTML = '';
    if (!Cloud.id) {
      $('rank-sub').textContent = 'Le classement réunit les grenouilles de tous les joueurs.';
      list.innerHTML = '<li class="rk-msg"><b>Joue avec un compte</b><span>Ta partie est gardée dans ce navigateur seulement. Crée un compte depuis l’accueil : ta grenouille rejoindra le classement.</span><a class="btn" href="/?connexion">Aller à l’accueil</a></li>';
      return;
    }
    if (rank.loading && !rank.data) { list.innerHTML = '<li class="rk-msg"><span>Les grenouilles se rassemblent…</span></li>'; return; }
    if (rank.error) { list.innerHTML = '<li class="rk-msg"><span>' + rank.error + '</span><button class="btn" data-rank-refresh>Réessayer</button></li>'; return; }
    $('rank-filters').hidden = rank.sort === 'clans';
    if (rank.sort === 'clans') { // les clans : leur renommée, leurs grenouilles, leur Alpha
      var cl = rank.clans || [], myClan = clans.data && clans.data.clan ? clans.data.clan.id : null;
      $('rank-sub').textContent = cl.length + ' clan' + (cl.length > 1 ? 's' : '') + ' · classés par renommée';
      list.innerHTML = cl.length ? cl.map(function (c, i) {
        return '<li class="rk-row rk-clan' + (i < 3 ? ' top' + (i + 1) : '') + (c.id === myClan ? ' is-current' : '') + '"><div class="rk-line"><span class="rk-pos">' + (i + 1) + '</span>' + emblem(c) +
          '<span class="rk-name"><b>' + escapeHtml(c.nom) + (c.id === myClan ? ' <i>TON CLAN</i>' : '') + (c.guerreFin > Date.now() ? ' <i class="war">⚔ en guerre</i>' : '') + '</b><small>Chef : ' + escapeHtml(c.chef || '?') + ' · ' + c.membres + ' / 10 grenouilles</small></span>' +
          '<span class="rk-metric">' + c.renommee + ' renommée</span><span class="rk-gift">Alpha n° ' + (c.rang + 1) + '</span></div></li>';
      }).join('') : '<li class="rk-msg"><span>Aucun clan pour l’instant : fondes-en un depuis la page Clans !</span></li>';
      foot.innerHTML = '<button class="btn btn-ghost" data-rank-refresh>Actualiser</button>';
      return;
    }
    var all = rank.data || [], ranked = rankedList(), mine = ranked.map(function (e) { return e.id; }).indexOf(Cloud.id), season = rank.sort === 'saison' && rank.saison;
    var gifts = rank.sort === 'reputation' && rank.duels ? rank.duels.recompenses : (season ? rank.saison.recompenses : null);
    $('rank-sub').textContent = all.length + ' grenouille' + (all.length > 1 ? 's' : '') + ' · ' + rank.joueurs + ' joueur' + (rank.joueurs > 1 ? 's' : '') +
      (mine >= 0 ? ' — la tienne est ' + (mine === 0 ? '1re' : (mine + 1) + 'e') + ' en ' + S.name.toLowerCase() : '');
    if (rank.sort === 'reputation' && rank.duels) { note.hidden = false; note.innerHTML = 'Chaque lundi à minuit, les dix premières des duels reçoivent un cadeau — prochain dans <b>' + untilMs(rank.duels.prochain) + '</b>.'; }
    if (season) { note.hidden = false; note.innerHTML = '<b>' + seasonName(rank.saison.id) + '</b> : quêtes, boss, donjons, étages de la tour, Titan… chaque exploit du mois rapporte des points (ta grenouille : <b>' + seasonPts(save).toLocaleString('fr-FR') + ' pts</b>). Fin dans <b>' + untilMs(rank.saison.fin) + '</b> : les dix premières reçoivent un cadeau, et les trois premières une peau qu’on ne trouve nulle part ailleurs.'; }
    list.innerHTML = ranked.slice(0, rank.limit).map(function (e, i) {
      var gift = gifts && i < gifts.length ? gifts[i] : null;
      return '<li class="rk-row' + (i < 3 ? ' top' + (i + 1) : '') + (e.moi ? ' is-me' : '') + (e.id === Cloud.id ? ' is-current' : '') + (rank.sel === e.id ? ' is-open' : '') + '">' +
        '<button class="rk-line" data-rank-frog="' + e.id + '" aria-expanded="' + (rank.sel === e.id) + '">' +
        '<span class="rk-pos">' + (i + 1) + '</span><img class="px" src="' + portraitOf(e) + '" alt="">' +
        '<span class="rk-name"><b>' + escapeHtml(e.nom) + (e.id === Cloud.id ? ' <i>TOI</i>' : '') + '</b><small>' + escapeHtml(e.pseudo) + ' · niv. ' + e.niveau + '</small></span>' +
        voieChip(e) + '<span class="rk-metric">' + S.metric(e) + '</span>' + (gifts ? '<span class="rk-gift">' + (gift ? giftText(gift) : '') + '</span>' : '') + '</button>' +
        (rank.sel === e.id ? rankDetail(e) : '') + '</li>';
    }).join('') || '<li class="rk-msg"><span>' + (season ? 'Personne n’a encore de points cette saison : chaque quête, boss, salle de donjon ou attaque du Titan en rapporte.' : 'Aucune grenouille ici pour l’instant.') + '</span></li>';
    foot.innerHTML = (ranked.length > rank.limit ? '<button class="btn" data-rank-more>Afficher la suite (' + (rank.limit + 1) + ' à ' + Math.min(ranked.length, rank.limit + RANK_PAGE) + ' sur ' + ranked.length + ')</button>' : '') +
      (mine >= rank.limit ? '<button class="btn btn-ghost" data-rank-mine>Aller à ma place (' + (mine + 1) + 'e)</button>' : '') +
      '<button class="btn btn-ghost" data-rank-refresh>Actualiser</button>';
  }

  // ---------- La Cascade des Duels (dans le code : « dojo ») ----------
  // Deux onglets : les duels contre les grenouilles des autres joueurs, et ses propres autres grenouilles une fois
  // par jour (réputation, 10 duels par jour, journal ; leur classement est dans la page Classement, onglet Duels),
  // et l'arbre d'entraînement pour essayer équipement et sorts.
  var dojo = { tab: null, data: null, foes: null, pick: 0, loading: false, error: '', riposte: false, last: null, fighters: {} };
  var DOJO_TURNS = 10;
  var TREE_IMG = stringsToCanvas(SPECIES.arbre.frames[0], SPECIES.arbre.pal).toDataURL();
  var dojoApi = function (method, path, body) {
    return fetch('/api/dojo/' + Cloud.id + path, { method: method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.erreur || 'erreur du serveur'); return d; }); });
  };
  function cleanEquip(e) {
    var equip = Object.assign({}, DEFAULT_EQUIP);
    Object.keys(e || {}).forEach(function (slot) { var id = ITEMS[e[slot]] ? e[slot] : baseOf(e[slot]), it = ITEMS[id]; if (it && it.slot === slot) equip[slot] = id; });
    return equip;
  }
  // Une grenouille d'un autre joueur, prête à combattre : ses stats (niveau, points, équipement, arbre) calculées
  // comme les nôtres, ses sorts, et ses images tournées vers la gauche
  function dojoFighter(card) {
    if (dojo.fighters[card.id]) return dojo.fighters[card.id];
    Object.keys(card.items || {}).forEach(function (id) { registerItem(id, card.items[id]); }); // ses exemplaires, avec leurs stats
    var equip = cleanEquip(card.equip);
    var ps = {
      level: card.niveau, voie: card.voie, deck: card.deck || [], equip: equip, hero: { name: card.nom, skin: card.peau },
      alloc: Object.assign({ vitalite: 0, agilite: 0, force: 0, esprit: 0 }, card.alloc),
      tree: (card.tree || []).filter(function (id) { var n = nodeById(id); return n && n.voie === card.voie; })
    };
    if (card.alloc && card.alloc.souffle && !card.alloc.esprit) ps.alloc.esprit = card.alloc.souffle; // une partie d'avant l'Esprit
    setPlayer(ps);
    try {
      var weapon = weaponOf(equip), pr = combatProfile(ps);
      var anims = buildKawazuAnims(dressKawazu(sp, lookFor(equip))), pal = paletteFor(sp.PAL, equip);
      var imgs = function (frames) { return frames.map(function (g) { return g ? gridToCanvas(g, pal, true) : null; }); };
      return (dojo.fighters[card.id] = {
        frog: true, name: card.nom, pseudo: card.pseudo, level: card.niveau, rank: 'duel',
        maxHp: pr.maxHp, dmg: pr.dmg, crit: pr.crit, critMult: pr.critMult, dodge: pr.dodge, agi: pr.agi, spell: pr.spell, cdr: pr.cdr,
        size: pr.size, pas: pr.pas, dmgReduce: pr.dmgReduce,
        skills: deckSkills(ps, weapon), kind: weapon.kind, wtype: weaponType(weapon), weaponId: baseOf(equip.arme || ''),
        blade: weapon.kind === 'mains' ? null : weapon.blade, wave: weapon.wave, hilt: weapon.colors && weapon.colors[4],
        imgs: { idle: imgs(anims.idleRight.frames), atk: imgs(anims.attack.frames), hurt: imgs(anims.hurt.frames), kick: imgs(anims.kick.frames), fx: imgs(buildFx(weaponFx(weapon))) }
      });
    } finally { setPlayer(save); }
  }
  // nos propres chiffres, pour comparer
  function myFight() { return combatProfile(save); }
  // la réputation en jeu, avant le duel (la même règle que le serveur)
  function repStakes(theirs) {
    var mine = dojo.data ? dojo.data.rep : 0, diff = theirs - mine, clampN = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    return { win: clampN(Math.round(12 + diff / 8), 4, 30), lose: clampN(Math.round(8 - diff / 10), 2, 15) };
  }
  function agoMs(t) {
    var m = Math.floor((Date.now() - t) / 60000);
    return m < 1 ? 'à l’instant' : (m < 60 ? 'il y a ' + m + ' min' : (m < 1440 ? 'il y a ' + Math.floor(m / 60) + ' h' : 'il y a ' + Math.floor(m / 1440) + ' j'));
  }
  function untilMs(t) {
    var h = Math.max(0, Math.floor((t - Date.now()) / 3600e3));
    return h >= 24 ? Math.floor(h / 24) + ' j ' + (h % 24) + ' h' : h + ' h';
  }
  function giftText(g) {
    if (!g) return '';
    return (g.lucioles || 0).toLocaleString('fr-FR') + ' lucioles' + (g.eclats ? ' · ' + g.eclats + ' éclats' : '') + (g.xpNiveau ? ' · ' + n1(g.xpNiveau) + ' niv. d’XP' : '') +
      (g.objet && ITEMS[g.objet] ? ' + ' + ITEMS[g.objet].name : '') + (g.peau && PREMIUM_SKINS[g.peau] ? ' + la peau « ' + PREMIUM_SKINS[g.peau].name + ' »' : '');
  }
  // Les cadeaux du lundi : ajoutés à la partie une seule fois, puis confirmés au serveur
  function applyGifts(list) {
    var fresh = (list || []).filter(function (g) { return save.gifts.indexOf(g.id) < 0; });
    fresh.forEach(function (g) {
      save.gold += g.lucioles || 0;
      save.eclats = (save.eclats || 0) + (g.eclats || 0);
      if (g.peau && PREMIUM_SKINS[g.peau] && save.skins.indexOf(g.peau) < 0) save.skins.push(g.peau);
      if (g.objet && ITEMS[g.objet]) { if (!owns(g.objet)) save.owned.push(g.objet); else save.gold += 150; }
      var xp = g.xpNiveau ? Math.round(xpForLevel(save.level) * g.xpNiveau) : 0, lv = xp ? gainXp(save, xp) : 0;
      save.gifts.push(g.id);
      if (g.source === 'guerre') notice('Guerre contre « ' + g.contre + ' » : ' + (g.resultat === 'victoire' ? 'victoire !' : (g.resultat === 'nulle' ? 'égalité.' : 'défaite…')) + ' Ta part de combattant : ' + g.lucioles + ' lucioles' + (xp ? ' et ' + xp + ' XP' : '') + (lv ? '. Niveau ' + save.level + ' !' : '.'), true);
      else if (g.source === 'titan') notice('Le ' + (g.titan || 'Titan') + ' est tombé sous les coups de toutes les grenouilles ! Ta part : ' + g.lucioles + ' lucioles' + (g.eclats ? ', ' + g.eclats + ' éclats' : '') + (xp ? ' et ' + xp + ' XP' : '') + (lv ? '. Niveau ' + save.level + ' !' : '.'), true);
      else if (g.source === 'titan-semaine') notice('Le Titan de la semaine passée : ' + (g.rang ? 'tu finis ' + (g.rang === 1 ? '1re' : g.rang + 'e') + ' en dégâts' : 'merci d’avoir combattu') + ' ! +' + g.lucioles + ' lucioles' + (g.eclats ? ', ' + g.eclats + ' éclats' : '') + (xp ? ', ' + xp + ' XP' : '') + (lv ? '. Niveau ' + save.level + ' !' : '.'), true);
      else if (g.source === 'saison') notice(seasonName(g.saison) + ' : tu finis ' + (g.rang === 1 ? '1re' : g.rang + 'e') + ' ! +' + g.lucioles + ' lucioles' + (g.eclats ? ', ' + g.eclats + ' éclats' : '') + (xp ? ', ' + xp + ' XP' : '') + (g.peau && PREMIUM_SKINS[g.peau] ? ', et la peau « ' + PREMIUM_SKINS[g.peau].name + ' » (page Skins)' : '') + (lv ? '. Niveau ' + save.level + ' !' : '.'), true);
      else if (g.source === 'clan') notice('L’Alpha n° ' + (g.rang + 1) + ' de ton clan « ' + g.clan + ' » est tombé ! Ta part : ' + g.lucioles + ' lucioles' + (xp ? ' et ' + xp + ' XP' : '') + (lv ? '. Niveau ' + save.level + ' !' : '.'), true);
      else notice('Cadeau des duels pour ta ' + (g.rang === 1 ? '1re' : g.rang + 'e') + ' place de la semaine : ' + giftText(g) + ' !', true);
    });
    if (fresh.length) { save.gifts = save.gifts.slice(-50); persist(); Sfx.play('levelup'); renderAll(); }
    if ((list || []).length) dojoApi('POST', '/cadeaux', { ids: list.map(function (g) { return g.id; }) }).catch(function () {});
  }
  function loadDojo() {
    if (!Cloud.id) return Promise.resolve();
    dojo.loading = true;
    return dojoApi('GET', '').then(function (d) {
      dojo.data = d; dojo.loading = false; dojo.error = '';
      applyGifts(d.cadeaux);
      if (state.page === 'dojo') renderDojo();
    }, function (e) { dojo.loading = false; dojo.error = e.message; if (state.page === 'dojo') renderDojo(); });
  }
  function loadFoes() {
    dojo.foes = null; dojo.fighters = {}; dojo.pick = 0;
    renderDojo();
    Cloud.flush().then(function () { return dojoApi('GET', '/adversaires'); }).then(function (d) { dojo.foes = d.adversaires; renderDojo(); },
      function (e) { dojo.foes = []; dojo.error = e.message; renderDojo(); });
  }
  // ---------- La scène de la cascade : les deux grenouilles sur leurs rochers ----------
  // Ta grenouille sur le rocher de gauche, l'adversaire choisi (ou l'arbre d'entraînement) sur celui de droite,
  // animées dans le décor. Au-dessus de chacune, une plaque à son nom ; en bas, sa fiche. Le journal est en haut.
  var CZ = { meX: 96, foeX: 304, rock: 161, K: 3 }; // K : le décor est dessiné en triple, les sprites au quadruple (2/3 de la taille des combats)
  var TREE_IMGS = SPECIES.arbre.frames.map(function (f) { return stringsToCanvas(f, SPECIES.arbre.pal); });
  function currentFoe() {
    var list = dojo.foes || [];
    if (!list.length) return null;
    dojo.pick = ((dojo.pick || 0) % list.length + list.length) % list.length;
    return list[dojo.pick];
  }
  function drawCascade(now) {
    var cv = $('dojo-bg'), x2 = cv.getContext('2d'), K = CZ.K;
    if (cv.width !== CascadeScene.W * K) { cv.width = CascadeScene.W * K; cv.height = CascadeScene.H * K; }
    x2.imageSmoothingEnabled = false;
    x2.setTransform(K, 0, 0, K, 0, 0);
    x2.drawImage(CascadeScene.backdrop(), 0, 0);
    CascadeScene.fx(x2, now);
    x2.setTransform(1, 0, 0, 1, 0, 0);
    // à partir d'ici, en pixels du canvas : un sprite de 32 px dessiné en 128 (= 2/3 de sa taille en combat)
    var f = Math.floor(now / 500) % 2, feet = CZ.rock * K;
    var shadow = function (cx, w) { x2.fillStyle = 'rgba(0, 0, 0, 0.3)'; x2.beginPath(); x2.ellipse(cx * K, feet - 3, w, 10, 0, 0, Math.PI * 2); x2.fill(); };
    var at = function (list) { return list[Math.floor(now / (1000 / list.length)) % list.length]; };
    if (HERO_IMG) { shadow(CZ.meX, 46); x2.drawImage(at(HERO_IMG.profil), CZ.meX * K - 64, feet - 128, 128, 128); }
    if (dojo.tab === 'arbre') { shadow(CZ.foeX, 64); x2.drawImage(TREE_IMGS[Math.floor(now / 700) % 2], CZ.foeX * K - 96, feet - 192, 192, 192); return; }
    var foe = currentFoe();
    if (foe) {
      var fg = dojoFighter(foe), sz = Math.round(128 * fg.size / 32) * 32 || 128;
      shadow(CZ.foeX, 46 * fg.size);
      x2.drawImage(at(fg.imgs.idle), CZ.foeX * K - sz / 2, feet - sz, sz, sz);
    }
  }
  // d'un point du décor (400×225, affiché « cover ») à la page
  function cascadeToPage(x, y) {
    var pg = $('page-dojo'), pw = pg.clientWidth, ph = pg.clientHeight, sc = Math.max(pw / CascadeScene.W, ph / CascadeScene.H);
    return { x: (pw - CascadeScene.W * sc) / 2 + x * sc, y: (ph - CascadeScene.H * sc) / 2 + y * sc };
  }
  function plate(cls, x, y, text) { var p = cascadeToPage(x, y); return '<div class="cz-plate ' + cls + '" style="left:' + Math.round(p.x) + 'px;top:' + Math.round(p.y) + 'px">' + text + '</div>'; }
  function openDojo() {
    drawCascade(performance.now());
    if (!dojo.tab || dojo.tab === 'top') dojo.tab = Cloud.id ? 'duels' : 'arbre';
    renderDojo();
    if (Cloud.id) { loadDojo(); if (!dojo.foes) loadFoes(); }
  }
  window.addEventListener('resize', function () { if (state.page === 'dojo') renderDojo(); });
  function dojoVoie(e) {
    var v = voieOf(e.voie);
    return v ? '<span class="rk-voie" style="--voie:' + v.color + '"><img src="' + VOIE_ICON[v.id] + '" alt="">' + v.short + '</span>' : '<span class="rk-voie none">Sans voie</span>';
  }
  function needAccount(what) {
    return '<div class="panel cz-center"><h2>JOUE AVEC UN COMPTE</h2><p>' + what + ' se jouent contre les grenouilles des autres joueurs : crée un compte depuis l’accueil pour y participer. L’arbre d’entraînement, lui, t’attend déjà.</p>' +
      '<div class="row"><a class="btn" href="/?connexion">Aller à l’accueil</a><button class="btn btn-ghost" data-dojo-tab="arbre">L’arbre d’entraînement</button></div></div>';
  }
  function renderDojo() {
    var tabs = [['duels', 'Duels'], ['arbre', 'Entraînement']];
    $('dojo-tabs').innerHTML = tabs.map(function (t) { return '<button role="tab" data-dojo-tab="' + t[0] + '" aria-selected="' + (dojo.tab === t[0]) + '">' + t[1] + '</button>'; }).join('');
    var body = $('dojo-body'), d = dojo.data, html = plate('me', CZ.meX, CZ.rock - 44, escapeHtml(save.hero.name) + ' · niv. ' + save.level);
    if (dojo.tab === 'arbre') html += plate('foe', CZ.foeX, CZ.rock - 66, 'Arbre d’entraînement') + renderTraining();
    else if (!Cloud.id) html += needAccount('Les duels');
    else if (!d) html += '<div class="panel cz-center"><p>' + (dojo.error ? escapeHtml(dojo.error) + ' <button class="btn btn-ghost" data-dojo-reload>Réessayer</button>' : 'Les grenouilles gagnent leurs rochers…') + '</p></div>';
    else html += renderDuels(d);
    body.innerHTML = html;
  }
  // ta fiche : réputation, place, bilan, duels du jour, cadeaux du lundi
  function myPanel(d) {
    var meRank = d.rang ? (d.rang === 1 ? '1re' : d.rang + 'e') + ' sur ' + d.classes : 'pas encore classée';
    var pips = Array.from({ length: d.max }, function (_, i) { return '<i' + (i < d.restants ? ' class="on"' : '') + '></i>'; }).join('');
    var myGift = d.rang && d.rang <= d.recompenses.length ? d.recompenses[d.rang - 1] : null;
    return '<section class="panel cz-me"><div class="cz-rep"><b>' + d.rep + '</b><span>réputation<br>' + meRank + '</span></div>' +
      '<div class="dm-row"><span>Victoires <b>' + d.victoires + '</b></span><span>Défaites <b>' + d.defaites + '</b></span></div>' +
      '<div class="dm-duels"><span>Duels du jour : <b>' + d.restants + ' / ' + d.max + '</b></span><span class="pips">' + pips + '</span></div>' +
      '<p class="dm-gift">Cadeaux du lundi dans <b>' + untilMs(d.prochain) + '</b>' + (myGift ? ' · à ta place : ' + giftText(myGift) : '') + '</p>' +
      '<button class="btn btn-ghost" data-rank-duels>Classement des duels</button></section>';
  }
  // le face-à-face : une ligne par stat, ta valeur à gauche, la sienne à droite, la barre partagée entre les deux
  function versus(me, them) {
    var row = function (label, a, b, fmtV) {
      var tot = a + b || 1, pa = Math.round(a / tot * 100);
      return '<div class="vs-row"><b class="' + (a >= b ? 'win' : '') + '">' + fmtV(a) + '</b><span class="vs-bar"><i class="a" style="width:' + pa + '%"></i><i class="b" style="width:' + (100 - pa) + '%"></i><em>' + label + '</em></span><b class="' + (b > a ? 'win' : '') + '">' + fmtV(b) + '</b></div>';
    };
    var n = function (v) { return Math.round(v); }, pc = function (v) { return Math.round(v * 100) + ' %'; };
    return '<div class="cz-vs"><div class="vs-head"><span>TOI</span><span>' + escapeHtml(them.name) + '</span></div>' +
      row('Points de vie', me.maxHp, them.maxHp, n) + row('Dégâts', me.dmg, them.dmg, n) + row('Agilité', me.agi, them.agi, n) +
      row('Critique', me.crit, them.crit, pc) + row('Esquive', me.dodge, them.dodge, pc) + '</div>';
  }
  function renderDuels(d) {
    var html = myPanel(d), foe = currentFoe(), n = (dojo.foes || []).length;
    // le journal, en haut
    html += '<section class="panel cz-journal"><h2>JOURNAL DE LA CASCADE</h2>' + (d.journal.length ? '<ul>' + d.journal.map(function (j) {
      var who = '<b>' + escapeHtml(j.nom) + '</b> (' + escapeHtml(j.pseudo) + ')';
      var text = j.type === 'attaque' ? (j.victoire ? 'Tu as battu ' + who : 'Tu as perdu contre ' + who) : (j.victoire ? who + ' t’a défiée et a perdu' : who + ' t’a défiée et t’a battue');
      return '<li class="' + (j.delta >= 0 ? 'up' : 'down') + '"><span>' + text + '</span><b>' + (j.delta >= 0 ? '+' : '−') + Math.abs(j.delta) + '</b><small>' + agoMs(j.t) + '</small></li>';
    }).join('') + '</ul>' : '<p class="muted">Aucun duel pour l’instant : les défis lancés et reçus s’afficheront ici.</p>') + '</section>';
    // l'adversaire choisi : sa plaque au-dessus de lui, sa fiche en bas à droite
    if (!dojo.foes) return html + '<section class="panel cz-foe"><p class="muted">Des grenouilles s’approchent de la cascade…</p></section>';
    if (!foe) return html + '<section class="panel cz-foe"><p class="muted">Personne à défier pour l’instant : invite des amis à créer leur grenouille, ou crée-toi une deuxième grenouille pour l’affronter (une fois par jour).</p><button class="btn btn-ghost" data-dojo-foes>Chercher encore</button></section>';
    var fg = dojoFighter(foe), st = repStakes(foe.rep), mine = myFight();
    html += plate('foe', CZ.foeX, CZ.rock - Math.round(43 * fg.size) - 1, escapeHtml(foe.nom) + ' · niv. ' + foe.niveau);
    html += '<section class="panel cz-foe' + (foe.soeur ? ' sister' : '') + '">' +
      '<div class="cz-nav"><button data-foe-step="-1" aria-label="Adversaire précédent"' + (n > 1 ? '' : ' disabled') + '>◀</button><span>ADVERSAIRE ' + (dojo.pick + 1) + ' / ' + n + '</span><button data-foe-step="1" aria-label="Adversaire suivant"' + (n > 1 ? '' : ' disabled') + '>▶</button><button class="link" data-dojo-foes>Nouveaux</button></div>' +
      '<div class="cz-who"><div><b>' + escapeHtml(foe.nom) + '</b><span>' + escapeHtml(foe.pseudo) + ' · niveau ' + foe.niveau + '</span></div>' + dojoVoie(foe) + '<span class="cz-foerep">' + foe.rep + ' rép.</span></div>' +
      (foe.soeur ? '<span class="foe-sister">TA GRENOUILLE · 1 DUEL PAR JOUR</span>' : '') +
      versus(mine, fg) +
      '<div class="cz-go"><span>Victoire <b class="up">+' + st.win + '</b> · Défaite <b class="down">−' + st.lose + '</b></span><button class="btn" data-duel="' + foe.id + '"' + (d.restants > 0 ? '' : ' disabled') + '>Défier ▶</button></div></section>';
    return html;
  }
  // l'onglet Entraînement : l'arbre sur le rocher d'en face, ses réglages et le dernier bilan
  function renderTraining() {
    var l = dojo.last;
    return '<section class="panel cz-foe cz-train"><h2>L’ARBRE D’ENTRAÎNEMENT</h2>' +
      '<p>' + DOJO_TURNS + ' tours pour frapper de toutes tes forces : essaie un équipement, une répartition de points ou un deck de sorts, puis compare le bilan. Pas de récompense, pas de limite.</p>' +
      '<div class="dt-opts" role="radiogroup" aria-label="L’arbre"><button role="radio" data-riposte="0" aria-checked="' + !dojo.riposte + '"><b>Immobile</b><small>il encaisse</small></button>' +
      '<button role="radio" data-riposte="1" aria-checked="' + dojo.riposte + '"><b>Il riposte</b><small>teste ta défense</small></button></div>' +
      (l ? '<ul class="bt-bilan"><li><span>Dégâts (' + l.turns + ' tours)</span><b>' + l.total + '</b></li><li><span>Par tour</span><b>' + Math.round(l.total / Math.max(1, l.turns)) + '</b></li><li><span>Meilleur coup</span><b>' + l.best + '</b></li><li><span>Critiques</span><b>' + l.crits + ' / ' + l.hits + '</b></li></ul>' : '') +
      '<button class="btn" data-train>Commencer l’entraînement ▶</button></section>';
  }
  function trainingFight() {
    return {
      kind: 'arbre', title: 'Cascade · entraînement', backdrop: CascadeScene.backdrop(), bgFx: CascadeScene.fx, turns: DOJO_TURNS, done: 0, riposte: dojo.riposte,
      stats: { total: 0, hits: 0, crits: 0, best: 0, taken: 0 },
      enemy: { species: 'arbre', name: 'Arbre d’entraînement', level: save.level, rank: 'arbre', behavior: 'arbre', scale: 1, maxHp: 1e9, dmg: dojo.riposte ? Math.round(2 + 0.95 * save.level) : 0, agi: -1, dodge: 0 },
      again: trainingFight
    };
  }
  function duelFight(card) {
    return {
      kind: 'duel', title: 'Cascade · duel contre ' + card.nom, backdrop: CascadeScene.backdrop(), bgFx: CascadeScene.fx, card: card, enemy: dojoFighter(card),
      settle: function (win) { return settleDuel(card, win); }
    };
  }
  // Le résultat d'un duel : la réputation (serveur) et, en cas de victoire, un peu d'XP
  function settleDuel(card, win) {
    return dojoApi('POST', '/duel', { adversaire: card.id, victoire: win }).then(function (r) {
      if (dojo.data) { dojo.data.rep = r.rep; dojo.data.restants = r.restants; dojo.data[win ? 'victoires' : 'defaites']++; }
      dojo.foes = (dojo.foes || []).filter(function (c) { return c.id !== card.id; });
      var xp = win ? clanXp(Math.max(5, Math.round(xpForLevel(save.level) * 0.1))) : 0, levels = xp ? gainXp(save, xp) : 0;
      var qd = track(save, 'duel');
      persist();
      if (levels) Sfx.play('levelup');
      return questLine(qd) + '<p class="bt-rep ' + (r.delta >= 0 ? 'up' : 'down') + '">' + (r.delta >= 0 ? '+' : '−') + Math.abs(r.delta) + ' réputation <span>(' + r.rep + ' en tout)</span></p>' +
        (xp ? '<p>+' + xp + ' XP' + (levels ? ' · <b>Niveau ' + save.level + ' !</b>' : '') + '</p>' : '<p>' + escapeHtml(card.nom) + ' garde sa place. Change d’équipement ou de sorts, et retente ta chance !</p>') +
        '<p class="muted">Duels restants aujourd’hui : ' + r.restants + '.</p>';
    });
  }

  // ---------- Les Clans : les guildes du marais ----------
  // Un clan réunit jusqu'à 10 grenouilles de joueurs, sous un blason que son chef compose (5 icônes, 8 fonds,
  // 6 couleurs). Ensemble, elles affrontent un Alpha aux PV partagés (deux assauts de 10 tours par jour chacune) ;
  // quand il tombe, chaque grenouille du clan qui l'a attaqué reçoit sa part, et un Alpha plus fort arrive.
  // Les guerres : un clan d'au moins 5 grenouilles déclare la guerre à un autre (son chef) ; pendant 24 h, chacune a
  // 3 combats contre les grenouilles d'en face, et le clan qui marque le plus de points gagne. Le chef peut aussi
  // exclure une grenouille. Tout passe par /api/clans/<grenouille>.
  var clans = { data: null, loading: false, error: '', blason: { icone: 0, fond: 0, motif: 0 }, leaving: 0, kicking: null, editing: false, declaring: null };
  var EMBLEMS = ['#c9412f', '#e0b43a', '#4e9a45', '#3a7fc9', '#8a4ab0', '#e07a2a', '#2aa090', '#3a3f4a'];
  var MOTIFS = ['#f4f4e8', '#f3d27a', '#1a1c2c', '#c9412f', '#8fe0ff', '#8fce52'];
  // les icônes du blason (x : la couleur du motif, k : le trait sombre)
  var BLASON_ICONS = [
    { name: 'Grenouille', rows: ['.xxx....xxx.', 'x...x..x...x', 'x.kkx..xkk.x', 'x.kkxxxxkk.x', '.xxxxxxxxxx.', 'xxxxxxxxxxxx', 'xxxxxxxxxxxx', 'xkxxxxxxxxkx', 'xxkkkkkkkkxx', '.xxxxxxxxxx.', '..xx....xx..', '.xxx....xxx.'] },
    { name: 'Nénuphar', rows: ['....x..x....', '...xkxxkx...', '....xxxx....', '.....kk.....', '..xxxxxxxx..', '.xxxxxxxxxx.', 'xxxxxxxxxxxx', 'xxxxxxx..xxx', 'xxxxxx....xx', '.xxxxx...xx.', '..xxxx..xx..', '............'] },
    { name: 'Shuriken', rows: ['.....x......', '....xx......', '....xxx.....', '....xxxx..xx', '.xxxxxxxxxx.', 'xxxxxkkxxx..', '..xxxkkxxxxx', '.xxxxxxxxxx.', 'xx..xxxx....', '.....xxx....', '......xx....', '......x.....'] },
    { name: 'Katanas', rows: ['x..........x', '.x........x.', '..x......x..', '...x....x...', '....x..x....', '.....xx.....', '.....xx.....', '....x..x....', '..kx....xk..', '.kk......kk.', 'kk........kk', 'k..........k'] },
    { name: 'Lune', rows: ['....xxxx....', '..xxxx......', '.xxxx.......', '.xxx........', 'xxxx......x.', 'xxxx.......x', 'xxxx......x.', 'xxxx........', '.xxxx.......', '.xxxxx...xx.', '..xxxxxxxx..', '....xxxx....'] }
  ];
  var CLAN_PRICE = 300;
  var fmtN = function (n) { return Math.max(0, Math.round(n)).toLocaleString('fr-FR'); };
  var nth = function (n) { return n === 1 ? '1er' : n + 'e'; };
  var fmtLeft = function (ms) { var min = Math.max(0, Math.ceil(ms / 60000)); return Math.floor(min / 60) + ' h ' + String(min % 60).padStart(2, '0'); };
  var clanApi = function (method, path, body) {
    return fetch('/api/clans/' + Cloud.id + path, { method: method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.erreur || 'erreur du serveur'); return d; }); });
  };
  // Le blason : un écu à la couleur du fond, son icône dans la couleur du motif
  var blasonCache = {};
  function blasonOf(m) { return m && m.blason ? m.blason : { icone: 0, fond: (m && m.embleme) || 0, motif: 0 }; }
  function blasonImg(b) {
    var key = b.icone + '-' + b.fond + '-' + b.motif;
    if (!blasonCache[key]) {
      var W = 20, H = 22, c = document.createElement('canvas'); c.width = W; c.height = H;
      var x = c.getContext('2d'), fond = EMBLEMS[b.fond] || EMBLEMS[0], inside = function (px, py) {
        if (px < 0 || py < 0 || px >= W || py >= H) return false;
        return py <= 12 || Math.abs(px - 9.5) <= 9.5 - (py - 12) * 1.05;
      };
      for (var py = 0; py < H; py++) for (var px = 0; px < W; px++) {
        if (!inside(px, py)) continue;
        var edge = !inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1);
        x.fillStyle = edge ? '#1a1c2c' : fond; x.fillRect(px, py, 1, 1);
        if (!edge && (py <= 2 || px <= 1)) { x.fillStyle = 'rgba(255, 255, 255, 0.22)'; x.fillRect(px, py, 1, 1); } // un reflet
        if (!edge && (px >= W - 2 || (py > 12 && !inside(px + 1, py + 1)))) { x.fillStyle = 'rgba(0, 0, 0, 0.25)'; x.fillRect(px, py, 1, 1); }
      }
      (BLASON_ICONS[b.icone] || BLASON_ICONS[0]).rows.forEach(function (row, iy) {
        row.split('').forEach(function (ch, ix) {
          if (ch === '.') return;
          x.fillStyle = ch === 'k' ? (b.motif === 2 ? '#f4f4e8' : '#1a1c2c') : MOTIFS[b.motif] || MOTIFS[0];
          x.fillRect(4 + ix, 4 + iy, 1, 1);
        });
      });
      blasonCache[key] = c.toDataURL();
    }
    return blasonCache[key];
  }
  function emblem(m, big) { return '<img class="clan-emb px' + (big ? ' big' : '') + '" src="' + blasonImg(blasonOf(m)) + '" alt="">'; }
  // l'atelier du blason : l'aperçu, puis l'icône, le fond et le motif
  function blasonEditor() {
    var b = clans.blason, pick = function (key, i, inner, label, on) { return '<button role="radio" aria-checked="' + on + '" aria-label="' + label + '" data-bl-' + key + '="' + i + '"' + inner + '</button>'; };
    return '<div class="cl-bl-preview"><img class="px" src="' + blasonImg(b) + '" alt="Le blason"></div><div class="cl-bl-rows">' +
      '<span class="cl-label">Icône · ' + BLASON_ICONS[b.icone].name + '</span><div class="cl-bl-icons" role="radiogroup">' + BLASON_ICONS.map(function (ic, i) { return pick('icone', i, '><img class="px" src="' + blasonImg({ icone: i, fond: b.fond, motif: b.motif }) + '" alt="">', ic.name, b.icone === i); }).join('') + '</div>' +
      '<span class="cl-label">Fond</span><div class="cl-embs" role="radiogroup">' + EMBLEMS.map(function (col, i) { return pick('fond', i, ' style="--e:' + col + '">', 'Fond ' + (i + 1), b.fond === i); }).join('') + '</div>' +
      '<span class="cl-label">Motif</span><div class="cl-embs" role="radiogroup">' + MOTIFS.map(function (col, i) { return pick('motif', i, ' style="--e:' + col + '">', 'Motif ' + (i + 1), b.motif === i); }).join('') + '</div></div>';
  }
  var alphaImgs = {};
  function alphaImg(rang) { // l'Alpha, en grand, dans ses couleurs
    var a = alphaOf(rang, save.level), key = rang % ALPHAS.length;
    if (!alphaImgs[key]) { var s = SPECIES[a.species]; alphaImgs[key] = stringsToCanvas(s.frames[0], Object.assign({}, s.pal, a.pal)).toDataURL(); }
    return alphaImgs[key];
  }
  // le décor : la mare où se réunissent les clans, la nuit, ses nénuphars et ses roseaux (dessiné une fois)
  function drawClansBg() {
    var c = $('clans-bg');
    if (c.width === 320) return;
    c.width = 320; c.height = 180;
    var x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 180);
    g.addColorStop(0, '#0b1a1c'); g.addColorStop(0.5, '#123034'); g.addColorStop(1, '#0a1618');
    x.fillStyle = g; x.fillRect(0, 0, 320, 180);
    for (var i = 0; i < 90; i++) { x.fillStyle = 'rgba(160, 220, 220, ' + (0.04 + hash(i, 3, 9) * 0.08) + ')'; x.fillRect(Math.round(hash(i, 1, 9) * 320), Math.round(hash(i, 2, 9) * 180), 2 + Math.round(hash(i, 4, 9) * 8), 1); }
    for (var p = 0; p < 22; p++) { // des nénuphars, grands et petits
      var px = Math.round(hash(p, 5, 7) * 320), py = Math.round(hash(p, 6, 7) * 180), r = 4 + Math.round(hash(p, 7, 7) * 9);
      for (var yy = -r; yy <= r; yy++) for (var xx = -r * 1.6; xx <= r * 1.6; xx++) {
        var d = (xx * xx) / (r * r * 2.56) + (yy * yy) / (r * r);
        if (d > 1 || (xx > 0 && Math.abs(yy) < xx * 0.28)) continue; // l'encoche en V
        x.fillStyle = d > 0.8 ? '#16341c' : (yy < -r * 0.3 ? '#3f7a3a' : '#2e6b3d');
        x.fillRect(px + Math.round(xx), py + yy, 1, 1);
      }
      if (hash(p, 8, 7) < 0.3) { x.fillStyle = '#ff9ac0'; x.fillRect(px - 1, py - 2, 3, 2); x.fillStyle = '#fff0f4'; x.fillRect(px, py - 3, 1, 1); }
    }
    for (var k = 0; k < 40; k++) { // les roseaux sur les bords
      var rx = k < 20 ? Math.round(hash(k, 9, 3) * 30) : 290 + Math.round(hash(k, 9, 3) * 30), h = 20 + Math.round(hash(k, 10, 3) * 40);
      x.fillStyle = k % 3 ? '#1f4a2a' : '#2e6b3d'; x.fillRect(rx, 180 - h, 1, h);
      if (k % 4 === 0) { x.fillStyle = '#5a3a1a'; x.fillRect(rx - 1, 180 - h, 3, 5); }
    }
  }
  function openClans() {
    drawClansBg();
    renderClans();
    if (Cloud.id) loadClans();
  }
  function loadClans() {
    clans.loading = true;
    Cloud.flush().then(function () { return clanApi('GET', ''); }).then(function (d) {
      clans.data = d; clans.loading = false; clans.error = '';
      setClanBonus(d.bonus); save.inClan = !!d.clan;
      if (d.exclu) notice('Ta grenouille a été exclue du clan « ' + d.exclu + ' » par son chef.', true);
      applyGifts(d.cadeaux);
      if (state.page === 'clans') { renderClans(); scrollChat(); }
    }, function (e) { clans.loading = false; clans.error = e.message; if (state.page === 'clans') renderClans(); });
  }
  // les bonus du clan, gardés dans la sauvegarde (le jeu les applique à ses gains, même hors ligne)
  function setClanBonus(b) {
    b = { xp: (b && b.xp) || 0, lucioles: (b && b.lucioles) || 0, butin: (b && b.butin) || 0, force: (b && b.force) || 0, vie: (b && b.vie) || 0 };
    var cur = save.clanBonus || {};
    if (['xp', 'lucioles', 'butin', 'force', 'vie'].every(function (k) { return (cur[k] || 0) === b[k]; })) return;
    save.clanBonus = b; clanBonus = b; persist();
  }
  function refreshClan() { // à l'arrivée en jeu : les bonus du clan à jour, et ses cadeaux
    if (!Cloud.id) return;
    clanApi('GET', '').then(function (d) { clans.data = d; setClanBonus(d.bonus); save.inClan = !!d.clan; applyGifts(d.cadeaux); }, function () {});
  }
  // le butin : le trésor, les deux bonus (le chef les améliore) et les dons
  var BONUS_INFO = {
    xp: { name: 'Savoir du clan', what: 'd’XP', ico: '★' }, lucioles: { name: 'Bourse du clan', what: 'de lucioles', ico: '◆' },
    butin: { name: 'Flair du clan', what: 'de chances d’objet', ico: '✚' }, force: { name: 'Force du clan', what: 'de dégâts', ico: '⚔' }, vie: { name: 'Carapace du clan', what: 'de PV', ico: '♥' }
  };
  var ROLE_NAME = { chef: 'CHEF', bras: 'BRAS DROIT', veteran: 'VÉTÉRAN' };
  function renderLoot(d, m, chief) {
    var b = d.butin, me = m.membres.filter(function (e) { return e.id === Cloud.id; })[0] || { don: 0 };
    var top = m.membres.filter(function (e) { return e.don > 0; }).sort(function (x, y) { return y.don - x.don; })[0];
    var row = function (k) {
      var lvl = m.bonus[k] || 0, cost = b.couts[k], pips = '', pas = (b.avances && b.avances[k]) || b.pas;
      for (var i = 0; i < b.max; i++) pips += '<i' + (i < lvl ? ' class="on"' : '') + '></i>';
      return '<div class="cl-bonus"><span class="cl-bonus-ico ' + k + '">' + BONUS_INFO[k].ico + '</span><div><b>' + BONUS_INFO[k].name + '</b>' +
        '<small>+' + Math.round(lvl * pas * 100) + ' % ' + BONUS_INFO[k].what + ' pour tout le clan · niveau ' + lvl + ' / ' + b.max + '</small><span class="cl-pips">' + pips + '</span></div>' +
        (lvl >= b.max ? '<span class="cl-bonus-max">MAX</span>' : (chief ? '<button class="btn" data-clan-bonus="' + k + '"' + (m.tresor < cost ? ' disabled' : '') + '>+' + Math.round(pas * 100) + ' % · ' + fmtN(cost) + '</button>' : '<span class="cl-bonus-cost">' + fmtN(cost) + '</span>')) + '</div>';
    };
    var adv = b.avances ? Object.keys(b.avances) : [];
    return '<section class="panel cl-loot"><h2>LE BUTIN DU CLAN</h2>' +
      '<p class="cl-treasure"><b>' + fmtN(m.tresor) + '</b> lucioles dans le trésor</p>' + row('xp') + row('lucioles') +
      (adv.length ? (b.ouverts ? '<h3 class="cl-adv-h">BONUS AVANCÉS</h3>' + adv.map(row).join('') : '<p class="cl-help cl-adv-tease">Une fois le Savoir et la Bourse au plus haut, trois bonus avancés s’ouvrent : le <b>Flair</b> (+2 % d’objets par niveau), la <b>Force</b> (+1 % de dégâts) et la <b>Carapace</b> (+1 % de PV) du clan.</p>') : '') +
      '<p class="cl-help">Le trésor se remplit de vos dons et du butin : l’Alpha en cours y versera ' + fmtN(b.alpha) + ' lucioles, une guerre gagnée ' + fmtN(b.guerre) + '. ' +
      (chief ? 'Tu peux améliorer les bonus (le chef et ses bras droits le peuvent).' : 'Le chef et ses bras droits s’en servent pour améliorer les bonus.') + '</p>' +
      '<div class="cl-don"><span class="cl-label">Donner</span>' + [100, 1000, 10000].map(function (n) { return '<button class="btn btn-ghost" data-clan-don="' + n + '"' + (save.gold < n ? ' disabled' : '') + '>' + fmtN(n) + '</button>'; }).join('') + '</div>' +
      '<p class="cl-help">Tes dons : ' + fmtN(me.don) + ' lucioles' + (top ? ' · le plus généreux : <b>' + escapeHtml(top.nom) + '</b> (' + fmtN(top.don) + ')' : '') + '</p></section>';
  }
  $('clans-body').addEventListener('change', function (e) {
    var sel = e.target.closest('select[data-clan-role]');
    if (!sel) return;
    var who = sel.dataset.clanRole, role = sel.value, d = clans.data, them = d && d.clan ? d.clan.membres.filter(function (x) { return x.id === who; })[0] : null;
    if (role === 'chef' && !window.confirm('Passer la main à ' + (them ? them.nom : 'cette grenouille') + ' ? Tu deviendras son bras droit.')) { renderClans(); return; }
    Sfx.play('click');
    clanAction(clanApi('POST', '/role', { membre: who, role: role }));
  });
  function renderClans() {
    var box = $('clans-body');
    if (!Cloud.id) {
      box.innerHTML = '<div class="panel cl-center"><h2>JOUE AVEC UN COMPTE</h2><p>Les clans réunissent les grenouilles des joueurs : crée un compte depuis l’accueil pour en fonder un ou en rejoindre un.</p><a class="btn" href="/?connexion">Aller à l’accueil</a></div>';
      return;
    }
    var d = clans.data;
    if (!d) { box.innerHTML = '<div class="panel cl-center"><p>' + (clans.error ? escapeHtml(clans.error) + ' <button class="btn btn-ghost" data-clans-reload>Réessayer</button>' : 'Les clans se rassemblent autour de la mare…') + '</p></div>'; return; }
    box.innerHTML = d.clan ? renderMyClan(d) : renderNoClan(d);
  }
  function clanList(d, mineId, limit) {
    return d.liste.length ? '<ul class="cl-list">' + d.liste.slice(0, limit).map(function (m, i) {
      return '<li class="' + (m.id === mineId ? 'is-mine' : '') + '"><span class="cl-pos">' + (i + 1) + '</span>' + emblem(m) +
        '<span class="cl-name"><b>' + escapeHtml(m.nom) + (m.guerreFin > Date.now() ? ' <i class="war" title="En guerre">⚔</i>' : '') + '</b><small>Chef : ' + escapeHtml(m.chef || '?') + ' · Alpha n° ' + (m.rang + 1) + '</small></span>' +
        '<span class="cl-meta">' + m.renommee + '<small>renommée</small></span><span class="cl-meta">' + m.membres + ' / ' + d.max + '<small>grenouilles</small></span>' +
        (mineId === undefined ? '<button class="btn btn-ghost" data-clan-join="' + m.id + '"' + (m.membres >= d.max ? ' disabled' : '') + '>Rejoindre</button>' : '') + '</li>';
    }).join('') + '</ul>' : '<p class="muted">Aucun clan pour l’instant : fonde le premier !</p>';
  }
  function renderNoClan(d) {
    return '<header class="panel cl-head"><div><h1>CLANS</h1><p>Fonde ton clan ou rejoins-en un : ensemble, abattez des Alphas géants et faites la guerre aux autres clans.</p></div></header>' +
      '<div class="cl-cols two">' +
      '<section class="panel cl-found"><h2>FONDER UN CLAN</h2><p>Jusqu’à ' + d.max + ' grenouilles par clan. Il en coûte ' + CLAN_PRICE + ' lucioles.</p>' +
      '<label class="cl-field"><span>Son nom</span><input id="clan-name" maxlength="24" placeholder="Le Clan des Roseaux" autocomplete="off"></label>' +
      '<span class="cl-label">Son blason</span><div id="blason-editor" class="cl-blason">' + blasonEditor() + '</div>' +
      '<button class="btn" data-clan-found' + (save.gold < CLAN_PRICE ? ' disabled' : '') + '>Fonder le clan · ' + CLAN_PRICE + ' lucioles</button>' +
      (save.gold < CLAN_PRICE ? '<p class="muted">Il te manque ' + (CLAN_PRICE - save.gold) + ' lucioles.</p>' : '') + '</section>' +
      '<section class="panel cl-all"><h2>CLASSEMENT DES CLANS</h2>' + clanList(d, undefined, 30) + '</section></div>';
  }
  var RESULT = { victoire: 'victoire', defaite: 'défaite', nulle: 'égalité' };
  function clanEvent(j) {
    var n = '<b>' + escapeHtml(j.nom || '?') + '</b>';
    if (j.type === 'fonde') return n + ' a fondé le clan.';
    if (j.type === 'arrivee') return n + ' a rejoint le clan.';
    if (j.type === 'depart') return n + ' a quitté le clan.';
    if (j.type === 'exclusion') return n + ' a exclu <b>' + escapeHtml(j.cible || '?') + '</b> du clan.';
    if (j.type === 'raid') return n + ' a infligé <b>' + fmtN(j.deg) + '</b> dégâts à l’Alpha.';
    if (j.type === 'alpha') return 'L’Alpha n° ' + (j.rang + 1) + ' est tombé ! Coup final : ' + n + (j.parts ? ' · ' + j.parts + ' part' + (j.parts > 1 ? 's' : '') : '') + (j.butin ? ' · +' + fmtN(j.butin) + ' au trésor' : '') + '.';
    if (j.type === 'guerre') return j.declaree ? n + ' a déclaré la guerre au clan <b>' + escapeHtml(j.contre) + '</b> !' : 'Le clan <b>' + escapeHtml(j.contre) + '</b> nous a déclaré la guerre !';
    if (j.type === 'guerre-fin') return 'Guerre contre <b>' + escapeHtml(j.contre) + '</b> : ' + RESULT[j.resultat] + ' (' + j.nous + ' à ' + j.eux + ')' + (j.butin ? ' · +' + fmtN(j.butin) + ' au trésor' : '') + '.';
    if (j.type === 'don') return n + ' a donné <b>' + fmtN(j.montant) + '</b> lucioles au trésor.';
    if (j.type === 'bonus') return BONUS_INFO[j.bonus] ? n + ' a amélioré le ' + BONUS_INFO[j.bonus].name + ' (niveau ' + j.niveau + ').' : '';
    if (j.type === 'role') return j.role === 'chef' ? n + ' a passé la main : <b>' + escapeHtml(j.cible || '?') + '</b> est le nouveau chef !' : (j.role === 'membre' ? n + ' a rendu <b>' + escapeHtml(j.cible || '?') + '</b> simple membre.' : n + ' a nommé <b>' + escapeHtml(j.cible || '?') + '</b> ' + (j.role === 'bras' ? 'bras droit' : 'vétéran') + '.');
    return '';
  }
  function warEvent(j) {
    if (j.type === 'declaration') return 'Le clan <b>' + escapeHtml(j.clan) + '</b> déclare la guerre !';
    return '<b>' + escapeHtml(j.nom) + '</b> (' + escapeHtml(j.clan) + ')' + (j.victoire ? ' a battu ' : ' a perdu contre ') + '<b>' + escapeHtml(j.adverse) + '</b>' + (j.pts ? ' · +' + j.pts : '') + '.';
  }
  // la guerre : le tableau des points, les grenouilles d'en face à attaquer, le journal
  function renderWar(d, m) {
    var w = d.guerre, left = w.fin - Date.now();
    return '<section class="panel cl-war"><div class="cl-war-score">' +
      '<div class="cl-war-side">' + emblem(m, true) + '<b>' + escapeHtml(m.nom) + '</b></div><div class="cl-war-pts"><b>' + w.nous + '</b><span>—</span><b>' + w.eux + '</b></div>' +
      '<div class="cl-war-side">' + emblem(w.contre, true) + '<b>' + escapeHtml(w.contre.nom) + '</b></div></div>' +
      '<p class="cl-war-info">⚔ GUERRE · fin dans <b>' + fmtLeft(left) + '</b> · ' + (w.engagee ? 'tes combats : <b>' + w.restants + ' / ' + w.max + '</b>' : 'arrivée après la déclaration, ta grenouille ne combat pas') + '</p>' +
      '<p class="cl-help">Une première victoire sur une grenouille rapporte 3 points si elle est au moins de ton niveau, 2 sinon ; les suivantes, 1 point. Le clan qui a le plus de points à la fin gagne : 30 renommée, et 400 lucioles et de l’XP pour ses combattants.</p>' +
      '<div class="cl-war-grid"><ul class="cl-foes">' + w.ennemis.map(function (e) {
        return '<li><img class="px" src="' + portraitOf(e) + '" alt=""><span class="cl-name"><b>' + escapeHtml(e.nom) + '</b><small>niv. ' + (e.niveau || 1) + (e.battue ? ' · battue ×' + e.battue : '') + '</small></span>' + dojoVoie(e) +
          '<button class="btn" data-war-attack="' + e.id + '"' + (w.engagee && w.restants > 0 ? '' : ' disabled') + '>Attaquer ▶</button></li>';
      }).join('') + '</ul>' +
      '<ul class="cl-war-log">' + (w.journal.length ? w.journal.map(function (j) { return '<li><span>' + warEvent(j) + '</span><small>' + agoMs(j.t) + '</small></li>'; }).join('') : '<li><span>Aucun combat pour l’instant.</span></li>') + '</ul></div></section>';
  }
  // pas de guerre : les clans qu'on peut défier (le chef déclare), ou ce qu'il manque
  function renderWarPick(d, m, chief) {
    var n = m.membres.length, need = d.guerreMin, last = m.derniereGuerre;
    var html = '<section class="panel cl-warpick"><h2>LA GUERRE</h2>';
    if (last) html += '<p class="cl-part' + (last.resultat === 'victoire' ? ' is-in' : '') + '">Dernière guerre contre ' + escapeHtml(last.contre) + ' : ' + RESULT[last.resultat] + ' (' + last.nous + ' à ' + last.eux + ').</p>';
    if (n < need) return html + '<p class="cl-help">Il faut au moins <b>' + need + ' grenouilles</b> dans le clan pour partir en guerre (' + n + ' / ' + need + '). Pendant 24 h, chacune a 3 combats contre les grenouilles d’en face.</p></section>';
    html += '<p class="cl-help">Pendant 24 h, chaque grenouille des deux clans a 3 combats contre celles d’en face. ' + (chief ? 'Choisis un clan d’au moins ' + need + ' grenouilles :' : 'Seul le chef peut déclarer une guerre.') + '</p>';
    if (!chief) return html + '</section>';
    return html + (d.cibles.length ? '<ul class="cl-list">' + d.cibles.map(function (c) {
      return '<li>' + emblem(c) + '<span class="cl-name"><b>' + escapeHtml(c.nom) + '</b><small>' + c.membres + ' grenouilles · ' + c.renommee + ' renommée</small></span>' +
        '<button class="btn' + (clans.declaring === c.id ? ' is-armed' : ' btn-ghost') + '" data-war-declare="' + c.id + '">' + (clans.declaring === c.id ? 'Confirmer ⚔' : 'Déclarer la guerre') + '</button></li>';
    }).join('') + '</ul>' : '<p class="muted">Aucun clan à défier pour l’instant : il leur faut aussi ' + need + ' grenouilles, et pas déjà de guerre.</p>') + '</section>';
  }
  function renderMyClan(d) {
    var m = d.clan, a = alphaOf(m.raid.rang, save.level), pct = Math.max(0, m.raid.pv / m.raid.pvMax * 100);
    var boss = m.chef === Cloud.id, chief = boss || m.monRole === 'bras', mine = m.membres.filter(function (e) { return e.id === Cloud.id; })[0] || { part: 0 }; // chief : chef ou bras droit
    var members = m.membres.slice().sort(function (x, y) { return y.part - x.part || y.contribution - x.contribution; });
    return '<header class="panel cl-head">' + emblem(m, true) + '<div><h1>' + escapeHtml(m.nom).toUpperCase() + '</h1>' +
      '<p>Chef : <b>' + escapeHtml(m.chefNom || '?') + '</b> · ' + m.membres.length + ' / ' + d.max + ' grenouilles · <b>' + m.renommee + '</b> renommée' + (m.place ? ' · ' + nth(m.place) + ' des clans' : '') + '</p></div>' +
      (chief ? '<button class="btn btn-ghost" data-blason-edit>Blason</button>' : '') + (m.monRole && m.monRole !== 'membre' && m.monRole !== 'chef' ? '<span class="cl-myrole">' + ROLE_NAME[m.monRole] + '</span>' : '') +
      '<button class="btn btn-ghost' + (clans.leaving ? ' is-armed' : '') + '" data-clan-leave>' + (clans.leaving ? 'Confirmer : quitter' : 'Quitter le clan') + '</button></header>' +
      (clans.editing ? '<section class="panel cl-bl-edit"><h2>LE BLASON DU CLAN</h2><div id="blason-editor" class="cl-blason">' + blasonEditor() + '</div><div class="row"><button class="btn" data-blason-save>Enregistrer</button><button class="btn btn-ghost" data-blason-cancel>Annuler</button></div></section>' : '') +
      (d.guerre ? renderWar(d, m) : '') +
      '<div class="cl-cols">' +
      '<section class="panel cl-alpha"><h2>L’ALPHA N° ' + (m.raid.rang + 1) + '</h2>' +
      '<div class="cl-alpha-art"><img class="px" src="' + alphaImg(m.raid.rang) + '" alt=""></div>' +
      '<b class="cl-alpha-name">' + a.name + '</b><small class="muted">' + m.raid.vaincus + ' Alpha' + (m.raid.vaincus > 1 ? 's' : '') + ' abattu' + (m.raid.vaincus > 1 ? 's' : '') + ' par le clan</small>' +
      '<div class="cl-hp"><i style="width:' + pct + '%"></i><em>' + fmtN(m.raid.pv) + ' / ' + fmtN(m.raid.pvMax) + ' PV</em></div>' +
      '<p class="cl-help">Ses PV sont partagés par tout le clan. Chaque grenouille l’attaque ' + d.raidsMax + ' fois par jour, pendant ' + d.tours + ' tours ; <b>chaque assaut rapporte</b> des lucioles, de l’XP (plus tu fais mal, plus il en rapporte) et une chance d’objet. Quand il tombe : ' + (300 + 200 * m.raid.rang) + ' lucioles et de l’XP en plus pour chaque grenouille qui l’a attaqué.</p>' +
      (mine.part ? '<p class="cl-part is-in">Ta part est assurée : ' + fmtN(mine.part) + ' dégâts sur cet Alpha.</p>' : '<p class="cl-part">Attaque cet Alpha au moins une fois pour avoir ta part quand il tombera.</p>') +
      '<button class="btn" data-clan-raid' + (d.raids > 0 ? '' : ' disabled') + '>' + (d.raids > 0 ? 'Attaquer l’Alpha ▶ · ' + d.raids + ' / ' + d.raidsMax : 'Reviens demain') + '</button>' +
      '<div class="cl-log cl-log-in"><h2>LE JOURNAL</h2><ul>' + (m.journal || []).slice(0, 10).map(function (j) { return '<li><span>' + clanEvent(j) + '</span><small>' + agoMs(j.t) + '</small></li>'; }).join('') + '</ul></div></section>' +
      '<div class="cl-mid"><section class="panel cl-members"><h2>LE CLAN · ' + m.membres.length + ' / ' + d.max + '</h2><ul' + (chief ? ' class="can-kick"' : '') + '>' + members.map(function (e) {
        var role = e.role || (e.id === m.chef ? 'chef' : 'membre'), canKick = chief && e.id !== Cloud.id && role !== 'chef' && (boss || role !== 'bras');
        var kick = canKick ? '<button class="cl-kick' + (clans.kicking === e.id ? ' is-armed' : '') + '" data-clan-kick="' + e.id + '" aria-label="Exclure ' + escapeHtml(e.nom) + '">' + (clans.kicking === e.id ? 'Exclure ?' : '✕') + '</button>' : (chief ? '<span></span>' : '');
        var pick = boss && e.id !== Cloud.id ? '<select class="cl-role-pick" data-clan-role="' + e.id + '" aria-label="Rôle de ' + escapeHtml(e.nom) + '">' + [['membre', 'Membre'], ['veteran', 'Vétéran'], ['bras', 'Bras droit'], ['chef', 'Passer la main…']].map(function (o) { return '<option value="' + o[0] + '"' + (role === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' : '';
        return '<li class="' + (e.id === Cloud.id ? 'is-me' : '') + '" title="' + fmtN(e.contribution) + ' dégâts sur les Alphas du clan"><img class="px" src="' + portraitOf(e) + '" alt=""><span class="cl-name"><b>' + escapeHtml(e.nom) + '</b><small>' + (ROLE_NAME[role] ? '<i class="cl-role ' + role + '">' + ROLE_NAME[role] + '</i> ' : '') + escapeHtml(e.pseudo || '') + ' · niv. ' + (e.niveau || 1) + '</small>' + pick + '</span>' +
          dojoVoie(e) + '<span class="cl-meta' + (e.part ? '' : ' is-zero') + '">' + (e.part ? fmtN(e.part) : '—') + '<small>' + (e.part ? 'sur cet Alpha' : 'pas de part') + '</small></span>' + kick + '</li>';
      }).join('') + '</ul>' + (boss ? '<p class="cl-help">Tu es le chef : donne des rôles (2 bras droits, qui peuvent exclure, déclarer la guerre et dépenser le trésor ; 3 vétérans, pour l’honneur) ou passe la main. ✕ exclut une grenouille, qui ne pourra pas revenir avant 3 jours.</p>' : (chief ? '<p class="cl-help">Tu es bras droit : tu peux exclure un membre, déclarer la guerre, changer le blason et dépenser le trésor.</p>' : '')) + '</section>' +
      renderChat(m) + '</div><div class="cl-side">' + renderLoot(d, m, chief) + (d.guerre ? '' : renderWarPick(d, m, chief)) +
      '</div></div>';
  }
  // ---------- Le chat du clan ----------
  function chatItems(m) {
    var list = m.chat || [];
    return list.length ? list.map(function (c) {
      return '<li class="' + (c.id === Cloud.id ? 'me' : '') + '"><b>' + escapeHtml(c.nom) + '</b><span>' + escapeHtml(c.texte) + '</span><small>' + agoMs(c.t) + '</small></li>';
    }).join('') : '<li class="cl-chat-empty">Personne n’a encore rien dit. Lance la conversation !</li>';
  }
  function renderChat(m) {
    return '<section class="panel cl-chat"><h2>LA MARE DU CLAN</h2><ul class="cl-chat-list" id="cl-chat-list">' + chatItems(m) + '</ul>' +
      '<form id="cl-chat-form" class="cl-chat-form" autocomplete="off"><input id="cl-chat-input" maxlength="200" placeholder="Écris à ton clan…"><button class="btn">Envoyer</button></form></section>';
  }
  function scrollChat() { var l = $('cl-chat-list'); if (l) l.scrollTop = l.scrollHeight; }
  function updateChat() { var l = $('cl-chat-list'); if (l && clans.data && clans.data.clan) { l.innerHTML = chatItems(clans.data.clan); scrollChat(); } }
  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'cl-chat-form') return;
    e.preventDefault();
    var inp = $('cl-chat-input'), texte = inp.value.trim();
    if (!texte || !clans.data || !clans.data.clan) return;
    inp.value = '';
    clanApi('POST', '/message', { texte: texte }).then(function (r) { clans.data.clan.chat = r.chat.slice(-40); updateChat(); Sfx.play('drip'); }, function (err) { inp.value = texte; notice(err.message); });
  });
  // le chat se met à jour tout seul sur la page des clans (sans effacer ce qu'on est en train d'écrire)
  setInterval(function () {
    if (state.page !== 'clans' || !Cloud.id || !clans.data || !clans.data.clan || $('app').hidden) return;
    clanApi('GET', '').then(function (d) {
      var typing = $('cl-chat-input') && (document.activeElement === $('cl-chat-input') || $('cl-chat-input').value);
      clans.data = d; setClanBonus(d.bonus);
      if (typing) updateChat(); else { renderClans(); scrollChat(); }
    }, function () {});
  }, 12000);

  // L'assaut contre l'Alpha : un combat de quelques tours contre ses PV partagés, dans son pays
  function raidFight(d) {
    var r = d.clan.raid, a = alphaOf(r.rang, save.level);
    var fight = {
      kind: 'raid', title: d.clan.nom + ' · assaut contre ' + a.name, biomeIndex: a.biome, turns: d.tours, done: 0,
      stats: { total: 0, hits: 0, crits: 0, best: 0, taken: 0 }, intro: a.name + ' se dresse devant toi : ' + d.tours + ' tours pour lui arracher le plus de PV possible !',
      enemy: Object.assign({}, a, { maxHp: r.pvMax, hp0: r.pv }),
      settle: function () {
        fight.settled = true;
        return clanApi('POST', '/raid', { degats: fight.stats.total }).then(function (res) {
          d.raids = res.restants; d.clan.raid.pv = res.pv; d.clan.raid.pvMax = res.pvMax; d.clan.raid.rang = res.rang;
          // la récompense de l'assaut : des lucioles, une part de niveau, et une chance d'objet
          var rc = res.recompense || { lucioles: 0, xpNiveau: 0 }, gold = clanGold(rc.lucioles), xp = clanXp(Math.round(xpForLevel(save.level) * rc.xpNiveau)), levels = xp ? gainXp(save, xp) : 0;
          var loot = rollLoot(save, lootTier(save, currentWorld()), 0.35, 1);
          save.gold += gold; if (loot) save.owned.push(loot);
          var qd = track(save, 'raid').concat(trackLoot(save, [loot]));
          persist(); Sfx.play(levels ? 'levelup' : (loot ? 'pickup' : 'point'));
          return '<p class="bt-rep up">' + fmtN(res.degats) + ' dégâts à l’Alpha</p>' + questLine(qd) +
            '<p>Pour ton assaut : +' + fmtN(gold) + ' lucioles · +' + fmtN(xp) + ' XP' + (levels ? ' · <b>Niveau ' + save.level + ' !</b>' : '') + '</p>' +
            (loot ? '<p class="bt-loot" style="' + rarStyle(loot) + '"><img src="' + itemIconUrl(loot) + '" alt=""> Butin de l’assaut : <b>' + ITEMS[loot].name + '</b> <em>' + RARITIES[rarityOf(loot)].name + '</em></p>' : '') +
            (res.vaincu !== null ? '<p class="bt-unlock">L’Alpha n° ' + (res.vaincu + 1) + ' est tombé ! Chaque grenouille du clan qui l’a attaqué reçoit sa part, et un Alpha plus fort arrive.</p>'
              : '<p>Il lui reste ' + fmtN(res.pv) + ' PV sur ' + fmtN(res.pvMax) + '.</p>') +
            '<p class="muted">Assauts restants aujourd’hui : ' + res.restants + '.</p>';
        });
      }
    };
    return fight;
  }
  // Un combat de la guerre, contre la grenouille d'un autre clan jouée par l'ordinateur
  function warFight(card) {
    return {
      kind: 'guerre', title: 'Guerre contre ' + card.clan + ' · ' + card.nom, backdrop: CascadeScene.backdrop(), bgFx: CascadeScene.fx, card: card, enemy: dojoFighter(card),
      intro: card.nom + ', du clan « ' + card.clan + ' », défend les couleurs de son clan !',
      settle: function (win) {
        return clanApi('POST', '/combat', { adversaire: card.id, victoire: win }).then(function (r) {
          var xp = win ? clanXp(Math.max(5, Math.round(xpForLevel(save.level) * 0.1))) : 0, levels = xp ? gainXp(save, xp) : 0;
          if (xp) persist();
          if (levels) Sfx.play('levelup');
          return '<p class="bt-rep ' + (win ? 'up' : 'down') + '">' + (win ? '+' + r.gain + ' point' + (r.gain > 1 ? 's' : '') + ' pour ton clan' : 'Aucun point cette fois') + '</p>' +
            '<p>Score de la guerre : <b>' + r.nous + '</b> à <b>' + r.eux + '</b>.</p>' + (xp ? '<p>+' + xp + ' XP' + (levels ? ' · <b>Niveau ' + save.level + ' !</b>' : '') + '</p>' : '') +
            '<p class="muted">Combats restants dans cette guerre : ' + r.restants + '.</p>';
        });
      }
    };
  }
  function clanAction(p) { // une action, puis on recharge le clan
    return p.then(function () { loadClans(); }, function (e) { notice(e.message); });
  }

  // ---------- Le Titan de la semaine (server/api.js : /api/titan) ----------
  // Le même Titan pour toutes les grenouilles, qui change chaque lundi : ses PV sont partagés. À gauche, le Titan dans sa
  // tempête ; à droite, ses PV, tes attaques du jour, et les plus grands coups de la semaine (leurs cadeaux du lundi).
  var titan = { data: null, loading: false, error: '', bg: -1 };
  var titanApi = function (method, path, body) {
    return fetch('/api/titan/' + Cloud.id + path, { method: method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.erreur || 'erreur du serveur'); return d; }); });
  };
  function openTitan() { renderTitan(); drawTitan(performance.now()); if (Cloud.id) loadTitan(); }
  function loadTitan() {
    if (!Cloud.id) return;
    titan.loading = true;
    Cloud.flush().then(function () { return titanApi('GET', ''); }).then(function (d) {
      titan.data = d; titan.loading = false; titan.error = '';
      applyGifts(d.cadeaux);
      $('badge-titan').hidden = !(d.restants > 0);
      if (state.page === 'titan') renderTitan();
    }, function (e) { titan.loading = false; titan.error = e.message; if (state.page === 'titan') renderTitan(); });
  }
  // le décor : la mer démontée sous l'orage (dessinée une fois), puis, à chaque image, le Titan qui respire en sortant
  // des flots, la pluie, les vagues devant lui, et un éclair de temps en temps
  function titanSky() {
    if (titan.sky) return titan.sky;
    var c = document.createElement('canvas'); c.width = 320; c.height = 180;
    var x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 180);
    g.addColorStop(0, '#0a0814'); g.addColorStop(0.55, '#1c1630'); g.addColorStop(1, '#0a1220');
    x.fillStyle = g; x.fillRect(0, 0, 320, 180);
    for (var i = 0; i < 60; i++) { x.fillStyle = 'rgba(90, 80, 140, ' + (0.08 + hash(i, 1, 21) * 0.12) + ')'; x.fillRect(Math.round(hash(i, 2, 21) * 320), Math.round(hash(i, 3, 21) * 90), 10 + Math.round(hash(i, 4, 21) * 30), 3); }
    x.fillStyle = 'rgba(14, 26, 48, 0.9)'; x.fillRect(0, 138, 320, 42);
    return (titan.sky = c);
  }
  function titanFrames(idx) {
    if (titan.framesIdx === idx && titan.frames) return titan.frames;
    var en = titanOf(idx, 0, save.level), s = SPECIES[en.species];
    titan.framesIdx = idx;
    return (titan.frames = s.frames.map(function (f) { return stringsToCanvas(f, Object.assign({}, s.pal, en.pal)); }));
  }
  function drawTitan(now) {
    var cv = $('titan-bg');
    if (cv.width !== 320) { cv.width = 320; cv.height = 180; }
    var x = cv.getContext('2d'), idx = titan.data ? titan.data.titan.idx : 0, fr = titanFrames(idx), size = 112, t = now / 1000;
    x.imageSmoothingEnabled = false;
    x.drawImage(titanSky(), 0, 0);
    var halo = x.createRadialGradient(160, 96, 10, 160, 96, 110); halo.addColorStop(0, 'rgba(140, 100, 220, ' + (0.28 + 0.08 * Math.sin(t * 1.3)) + ')'); halo.addColorStop(1, 'rgba(140, 100, 220, 0)');
    x.fillStyle = halo; x.fillRect(0, 0, 320, 180);
    var bob = Math.sin(t * 1.4) * 4, sway = Math.sin(t * 0.7) * 3, img = fr[Math.floor(now / 650) % fr.length];
    x.drawImage(img, Math.round(160 - size / 2 + sway), Math.round(150 - size + bob), size, size);
    // les vagues devant lui
    for (var y = 136; y < 180; y += 3) for (var k = 0; k < 7; k++) {
      var wx = ((hash(y, k, 23) * 360 + t * (12 + (y - 136) * 0.6) * (k % 2 ? 1 : -1)) % 360 + 360) % 360 - 20;
      x.fillStyle = y < 150 ? 'rgba(60, 84, 130, 0.75)' : 'rgba(30, 46, 80, 0.9)'; x.fillRect(Math.round(wx), y, 16 + Math.round(hash(y, k, 24) * 20), 2);
    }
    for (var w = 0; w < 26; w++) { var fx = ((hash(w, 5, 25) * 340 + t * 18) % 340) - 10; x.fillStyle = 'rgba(200, 220, 255, 0.35)'; x.fillRect(Math.round(fx), 140 + Math.round(hash(w, 6, 25) * 36), 4, 1); }
    // la pluie
    x.fillStyle = 'rgba(160, 180, 230, 0.3)';
    for (var r = 0; r < 70; r++) { var rx = ((hash(r, 7, 26) * 340 - t * 40) % 340 + 340) % 340, ry = ((hash(r, 8, 26) * 200 + t * 170) % 200) - 10; x.fillRect(Math.round(rx), Math.round(ry), 1, 5); }
    // un éclair toutes les cinq secondes environ
    var cyc = now % 5300;
    if (cyc < 180) {
      x.fillStyle = 'rgba(230, 236, 255, ' + (0.35 * (1 - cyc / 180)) + ')'; x.fillRect(0, 0, 320, 180);
      var bx = 60 + hash(Math.floor(now / 5300), 1, 27) * 200, by = 0; x.strokeStyle = '#f0f4ff'; x.lineWidth = 1; x.beginPath(); x.moveTo(bx, 0);
      for (var s2 = 0; s2 < 6; s2++) { bx += (hash(s2, Math.floor(now / 5300), 28) - 0.5) * 24; by += 16; x.lineTo(bx, by); }
      x.stroke();
    }
  }
  function renderTitan() {
    var box = $('titan-body');
    if (!Cloud.id) {
      box.innerHTML = '<div class="panel cl-center tt-center"><h2>JOUE AVEC UN COMPTE</h2><p>Le Titan de la semaine est le même pour toutes les grenouilles de tous les joueurs : crée un compte depuis l’accueil pour le combattre avec elles.</p><a class="btn" href="/?connexion">Aller à l’accueil</a></div>';
      return;
    }
    var d = titan.data;
    if (!d) { box.innerHTML = '<div class="panel cl-center tt-center"><p>' + (titan.error ? escapeHtml(titan.error) + ' <button class="btn btn-ghost" data-titan-reload>Réessayer</button>' : 'Le Titan sort des flots…') + '</p></div>'; return; }
    var t = d.titan, en = titanOf(t.idx, t.rang, save.level), pct = Math.max(0, t.pv / t.pvMax * 100), pips = '';
    for (var i = 0; i < d.max; i++) pips += '<i' + (i < d.restants ? ' class="on"' : '') + '></i>';
    var html = '<section class="panel tt-me2"><h2>TES ATTAQUES</h2><div class="tt-left"><b>' + d.restants + '</b><span>/ ' + d.max + ' aujourd’hui</span><span class="pips">' + pips + '</span></div>' +
      '<div class="tt-stats"><span><b>' + fmtN(d.mesDegats) + '</b>dégâts cette semaine</span><span><b>' + (d.place ? nth(d.place) : '—') + '</b>' + (d.place ? 'sur ' + d.classes : 'pas encore classée') + '</span></div>' +
      (d.maPart ? '<p class="cl-part is-in">Ta part est assurée : ' + fmtN(d.maPart) + ' dégâts sur ce Titan.</p>' : '<p class="cl-part">Frappe-le une fois pour avoir ta part quand il tombera.</p>') +
      '<button class="btn" data-titan-attack' + (d.restants > 0 ? '' : ' disabled') + '>' + (d.restants > 0 ? 'Attaquer ▶' : 'Reviens demain') + '</button></section>';
    html += '<section class="panel tt-top2"><h2>LES PLUS GRANDS COUPS</h2>' + (d.top.length ? '<ol class="tt-list">' + d.top.map(function (e, k) {
      return '<li class="' + (e.id === Cloud.id ? 'is-me' : '') + '" title="Lundi : ' + giftText(d.recompenses[k]) + '"><span class="tt-pos">' + (k + 1) + '</span><img class="px" src="' + portraitOf(e) + '" alt=""><span class="cl-name"><b>' + escapeHtml(e.nom) + '</b><small>niv. ' + (e.niveau || 1) + '</small></span><span class="tt-dmg">' + fmtN(e.degats) + '</span></li>';
    }).join('') + '</ol>' : '<p class="muted">Personne ne l’a encore frappé cette semaine : sois la première !</p>') +
      '<p class="tt-note">Lundi, les dix premières reçoivent un cadeau (survole une ligne), toutes les autres : ' + giftText(d.part) + '.</p></section>';
    html += '<div class="tt-bottom"><span class="tt-kicker">LE TITAN DE LA SEMAINE' + (t.vaincus ? ' · ' + t.vaincus + ' déjà tombé' + (t.vaincus > 1 ? 's' : '') : '') + ' · un autre dans ' + untilMs(d.fin) + '</span>' +
      '<h1>' + en.name.toUpperCase() + '</h1><div class="cl-hp tt-hp"><i id="tt-hp-fill" style="width:' + (titan.lastPct != null ? titan.lastPct : pct) + '%"></i><em>' + fmtN(t.pv) + ' / ' + fmtN(t.pvMax) + ' PV</em></div></div>';
    box.innerHTML = html;
    requestAnimationFrame(function () { var f = $('tt-hp-fill'); if (f) f.style.width = pct + '%'; }); // la barre descend jusqu'à ses PV
    titan.lastPct = pct;
  }
  // L'attaque : quelques tours contre ses PV partagés, dans son pays
  function titanFight(d) {
    var t = d.titan, en = titanOf(t.idx, t.rang, save.level);
    var fight = {
      kind: 'titan', title: 'Le Titan · ' + en.name, biomeIndex: en.biome, turns: d.tours, done: 0,
      stats: { total: 0, hits: 0, crits: 0, best: 0, taken: 0 }, intro: en.name + ' se dresse au-dessus de toi : ' + d.tours + ' tours pour lui arracher le plus de PV possible !',
      enemy: Object.assign({}, en, { maxHp: t.pvMax, hp0: t.pv }),
      settle: function () {
        fight.settled = true;
        return titanApi('POST', '/attaque', { degats: fight.stats.total }).then(function (res) {
          d.restants = res.restants; d.titan.pv = res.pv; d.titan.pvMax = res.pvMax; d.titan.rang = res.rang; d.mesDegats = res.total;
          var rc = res.recompense || { lucioles: 0, xpNiveau: 0, eclats: 0 }, gold = clanGold(rc.lucioles), xp = clanXp(Math.round(xpForLevel(save.level) * rc.xpNiveau)), levels = xp ? gainXp(save, xp) : 0;
          var loot = rollLoot(save, lootTier(save, currentWorld()), 0.4, 1);
          save.gold += gold; save.eclats = (save.eclats || 0) + (rc.eclats || 0); if (loot) save.owned.push(loot);
          var qd = track(save, 'titan').concat(trackLoot(save, [loot]));
          save.counts.titan = (save.counts.titan || 0) + 1;
          persist(); Sfx.play(levels ? 'levelup' : (loot ? 'pickup' : 'point'));
          return '<p class="bt-rep up">' + fmtN(res.degats) + ' dégâts au Titan</p>' + questLine(qd) +
            '<p>Pour ton attaque : +' + fmtN(gold) + ' lucioles · +' + fmtN(xp) + ' XP · +' + (rc.eclats || 0) + ' éclats' + (levels ? ' · <b>Niveau ' + save.level + ' !</b>' : '') + '</p>' +
            (loot ? '<p class="bt-loot" style="' + rarStyle(loot) + '"><img src="' + itemIconUrl(loot) + '" alt=""> Butin : <b>' + ITEMS[loot].name + '</b> <em>' + RARITIES[rarityOf(loot)].name + '</em></p>' : '') +
            (res.vaincu !== null ? '<p class="bt-unlock">Le Titan est tombé ! Chaque grenouille qui l’a frappé reçoit sa part, et un Titan plus fort se dresse.</p>' : '<p>Il lui reste ' + fmtN(res.pv) + ' PV sur ' + fmtN(res.pvMax) + '.</p>') +
            '<p class="muted">Attaques restantes aujourd’hui : ' + res.restants + '.</p>';
        });
      }
    };
    return fight;
  }

  // ---------- La Tour des Cent Sages ----------
  // La tour se dresse au milieu du mont Kaeru : un étage par sage, la grenouille sur le prochain à conquérir,
  // les étages du dessus perdus dans la brume. À droite, la fiche de l'étage choisi : le sage, sa force comparée
  // à la nôtre, ses sorts, et ce que rapporte la première victoire.
  // mode : 'sages' (étages 1 à 100) ou 'ancetres' (101 à 600, une fois les Cent Sages conquis)
  var tower = { sel: null, view: 0, mode: null };
  function towerTop() { return save.tower >= TOWER_FLOORS ? TOWER_TOP : TOWER_FLOORS; }
  function towerNext() { return Math.min(towerTop(), save.tower + 1); }
  function towerRange() { return tower.mode === 'ancetres' ? [TOWER_FLOORS + 1, TOWER_TOP] : [1, TOWER_FLOORS]; }
  // la force d'un gardien de la tour (les Grands Sages un peu plus, les Ancêtres bien plus)
  function towerFoe(card) {
    var en = Object.assign({}, dojoFighter(card), { rank: 'sage' }), bump = card.boss || (card.ancestor && card.major);
    en.maxHp = Math.round(en.maxHp * (bump ? 1.15 : 1) * card.power); en.dmg *= (bump ? 1.1 : 1) * card.power;
    return en;
  }
  function towerFight(f) {
    var card = towerCard(f), en = towerFoe(card);
    return {
      kind: 'tour', floor: f, card: card, enemy: en, title: (isAncestor(f) ? 'Tour des Ancêtres' : 'Tour des Cent Sages') + ' · étage ' + f, backdrop: TowerScene.arena(f), bgFx: TowerScene.arenaFx,
      intro: card.boss ? 'Étage ' + f + ' : ' + (card.ancestor ? 'le Grand Ancêtre ' : 'le Grand Sage ') + card.nom + ', ' + card.titre + ', t’attend (niv. ' + card.niveau + ') !' : 'Étage ' + f + ' : ' + card.nom + ' (niv. ' + card.niveau + ') t’attend pour son épreuve.',
      settle: function (win) { return Promise.resolve(settleTower(f, card, win)); },
      next: f < towerTop() && f !== TOWER_FLOORS ? function () { return towerFight(f + 1); } : null,
      again: function () { return towerFight(f); }
    };
  }
  // La victoire sur un étage : la première fois, ses récompenses (et le trésor d'un Grand Sage)
  function settleTower(f, card, win) {
    if (!win) return '<p>' + escapeHtml(card.nom) + ' reste debout. Monte de niveau, change d’équipement ou de sorts, et reviens !</p>';
    if (f <= save.tower) return '<p>Épreuve réussie à nouveau. L’étage était déjà conquis : pas de nouvelle récompense.</p>';
    var r = towerRewards(f), levels;
    r = Object.assign({}, r, { gold: clanGold(r.gold), xp: clanXp(r.xp) }); // avec les bonus du clan
    save.tower = f;
    save.gold += r.gold;
    levels = gainXp(save, r.xp);
    var swap = r.item && !itemAvailable(save, r.item) ? itemPrice(r.item) : 0; // pas ton arme : sa valeur en lucioles
    if (swap) save.gold += swap; else if (r.item && !owns(r.item)) save.owned.push(r.item);
    if (card.boss) albumKill(save, 's-' + f);
    var qd = track(save, 'tower').concat(card.boss ? track(save, 'boss') : []);
    persist();
    Sfx.play(levels ? 'levelup' : 'pickup');
    var skin = f === TOWER_TOP && save.skins.indexOf('ancetre') < 0; // au sommet des Ancêtres : la peau du Premier Crapaud
    if (skin) { save.skins.push('ancetre'); persist(); }
    tower.sel = Math.min(towerTop(), f + 1);
    if (f === TOWER_FLOORS) { tower.mode = 'ancetres'; tower.sel = TOWER_FLOORS + 1; tower.view = TOWER_FLOORS + 1; }
    return '<p>Étage ' + f + ' conquis ! +' + r.gold + ' lucioles · +' + r.xp + ' XP' + (levels ? ' · <b>Niveau ' + save.level + ' !</b>' : '') + '</p>' +
      (r.item ? '<p class="bt-loot" style="' + rarStyle(r.item) + '"><img src="' + iconUrls[r.item] + '" alt=""> ' + (isAncestor(f) ? 'Relique du Grand Ancêtre' : 'Trésor du Grand Sage') + ' : <b>' + ITEMS[r.item].name + '</b>' + (swap ? ' — ce n’est pas ton arme : les Sages te donnent <b>' + swap + ' lucioles</b> à la place.' : '') + '</p>' : '') +
      (f === TOWER_FLOORS ? '<p class="bt-unlock">Tu as conquis le sommet de la tour. Le Premier Sage s’incline… et montre le ciel : au-dessus, dans la nuit, la <b>Tour des Ancêtres</b> s’éveille. 500 étages.</p>' : '') +
      (f === TOWER_TOP ? '<p class="bt-unlock">Le Premier Crapaud s’incline devant toi. Tu as conquis la Tour des Ancêtres' + (skin ? ', et sa peau est à toi : <b>Premier Crapaud</b> (page Skins).' : '.') + '</p>' : '') + questLine(qd);
  }
  function openTower() {
    if (!tower.mode) tower.mode = save.tower >= TOWER_FLOORS ? 'ancetres' : 'sages';
    var rg = towerRange(), next = towerNext();
    if (!tower.sel || tower.sel < rg[0] || tower.sel > rg[1]) tower.sel = Math.max(rg[0], Math.min(rg[1], next));
    tower.view = Math.max(rg[0], Math.min(rg[1], next) - 2);
    renderTower();
  }
  // La tour dessinée (tower.js), et par-dessus un bouton par étage : son numéro, son sage devant la porte, le trésor
  // des Grands Sages, et ta grenouille sur le balcon de l'étage à conquérir. La molette fait monter et descendre.
  function renderTower() {
    var page = $('page-tower'), pw = page.clientWidth, ph = page.clientHeight, wide = pw > 1000, side = wide ? 400 : 0;
    var S = ph < 620 ? 2 : 3, next = towerNext(), rg = towerRange(), anc = tower.mode === 'ancetres';
    tower.view = Math.max(rg[0], Math.min(tower.view || rg[0], Math.min(rg[1], Math.max(rg[0], next) + 3) - 1));
    $('page-tower').classList.toggle('ancestral', anc);
    $('tower-title').textContent = anc ? 'LA TOUR DES ANCÊTRES' : 'LA TOUR DES CENT SAGES';
    $('tower-sub').textContent = anc ? 'Au-dessus des Sages, dans la nuit : cinq cents Ancêtres, un Grand Ancêtre et sa Relique tous les cinquante étages.' : 'Les Épreuves des Anciens Sages, au sommet du mont Kaeru : un sage par étage, un trésor tous les dix.';
    $('tower-modes').hidden = save.tower < TOWER_FLOORS;
    $('tower-modes').innerHTML = [['sages', 'Les Cent Sages'], ['ancetres', 'Les Ancêtres']].map(function (m) { return '<button data-tower-mode="' + m[0] + '"' + (tower.mode === m[0] ? ' class="is-on"' : '') + '>' + m[1] + '</button>'; }).join('');
    var lay = TowerPage.render($('tower-bg'), { w: pw, h: wide ? ph : Math.round(ph * 0.58), s: S, cx: (pw - side) / 2 / S, view: tower.view, next: Math.max(rg[0] - 1, next), base: rg[0], top: rg[1], sky: TowerScene.skyOf(Math.max(rg[0], Math.min(rg[1], next))) });
    var me = $('sb-portrait').toDataURL(), html = '';
    lay.floors.forEach(function (fl) {
      var f = fl.f, st = f <= save.tower ? 'done' : (f === next ? 'next' : 'locked'), boss = f % 10 === 0;
      var card = st !== 'locked' ? towerCard(f) : null, prize = boss ? towerTreasure(f) : null, dx = (fl.door.x - fl.x) * S;
      html += '<button class="tfl ' + st + (boss ? ' boss' : '') + (tower.sel === f ? ' is-selected' : '') + '" data-floor="' + f + '" aria-label="Étage ' + f + '" style="left:' + fl.x * S + 'px;top:' + fl.y * S + 'px;width:' + fl.w * S + 'px;height:' + fl.h * S + 'px">' +
        '<span class="tfl-num">' + f + '</span>' +
        (card ? '<img class="px tfl-sage" src="' + portraitOf(card) + '" alt="" style="left:' + (dx - 12 * S) + 'px;top:' + 8 * S + 'px;width:' + 24 * S + 'px;height:' + 24 * S + 'px">' : '<span class="tfl-q" style="left:' + (dx - 6 * S) + 'px;top:' + 16 * S + 'px;width:' + 12 * S + 'px">?</span>') +
        (prize ? '<img class="px tfl-prize" src="' + iconUrls[prize] + '" alt="" title="' + ITEMS[prize].name + '">' : '') +
        (f === next && save.tower < towerTop() ? '<span class="tfl-here">TU ES ICI</span>' : '') + '</button>';
    });
    $('tower-col').innerHTML = html;
    renderTowerSheet();
  }
  $('page-tower').addEventListener('wheel', function (e) {
    if (e.target.closest('#tower-side')) return;
    e.preventDefault();
    var v = Math.max(towerRange()[0], tower.view + (e.deltaY < 0 ? 1 : -1));
    if (v !== tower.view) { tower.view = v; renderTower(); }
  }, { passive: false });
  function renderTowerSheet() {
    var f = tower.sel, next = towerNext(), card = towerCard(f), boss = f % 10 === 0, r = towerRewards(f), me = myFight(), rg = towerRange(), anc = tower.mode === 'ancetres';
    var fighter = f <= next ? towerFoe(card) : null, hp = fighter ? fighter.maxHp : 0, dmg = fighter ? fighter.dmg : 0;
    var cmp = function (a, b) { return a > b * 1.08 ? 'down' : (a < b * 0.92 ? 'up' : ''); }; // plus fort que nous : rouge
    var done = Math.max(0, Math.min(rg[1], save.tower) - rg[0] + 1), grands = anc ? GRAND_ANCESTORS : GRAND_SAGES;
    var nextBoss = Math.min(rg[1], Math.ceil((Math.max(save.tower, rg[0] - 1) + 1) / (anc ? 50 : 10)) * (anc ? 50 : 10));
    var html = '<div class="tw-progress"><b>' + done + '</b><span>étages conquis sur ' + (rg[1] - rg[0] + 1) + '</span></div>';
    if (f > next) {
      html += '<div class="tw-sheet locked"><h2>ÉTAGE ' + f + '</h2><p class="muted">Cet étage est encore dans la brume : conquiers d’abord l’étage ' + next + '.</p></div>';
    } else {
      html += '<div class="tw-sheet' + (boss ? ' boss' : '') + '"><span class="tw-floor">' + (card.boss ? (anc ? 'GRAND ANCÊTRE · ' : 'GRAND SAGE · ') : (anc && boss ? 'ANCÊTRE MAJEUR · ' : '')) + 'ÉTAGE ' + f + '</span>' +
        '<div class="tw-sage"><img class="px" src="' + portraitOf(card) + '" alt=""><div><h3>' + escapeHtml(card.nom) + '</h3>' + (card.titre ? '<span class="muted">' + card.titre + '</span>' : '') +
        '<span class="muted">Niveau ' + card.niveau + '</span>' + dojoVoie(card) + '</div></div>' +
        '<ul class="foe-stats"><li><span>PV</span><b class="' + cmp(hp, me.maxHp) + '">' + hp + '</b></li><li><span>Dégâts</span><b class="' + cmp(dmg, me.dmg) + '">' + Math.round(dmg) + '</b></li><li><span>Agilité</span><b class="' + cmp(fighter.agi, me.agi) + '">' + fighter.agi + '</b></li></ul>' +
        (fighter.skills.length > 1 ? '<p class="tw-spells">Sorts : ' + fighter.skills.slice(1).map(function (s) { return '<i>' + s.name + '</i>'; }).join('') + '</p>' : '') +
        '<div class="tw-reward"><h2>' + (f <= save.tower ? 'DÉJÀ CONQUIS' : 'RÉCOMPENSE') + '</h2>' + (f <= save.tower ? '<p class="muted">Tu peux rejouer l’épreuve, sans récompense.</p>' :
          '<p><span class="luciole"></span> ' + r.gold + ' lucioles · ' + r.xp + ' XP</p>' + (r.item ? '<p class="tw-prize" style="' + rarStyle(r.item) + '"><img class="px" src="' + iconUrls[r.item] + '" alt=""><b>' + ITEMS[r.item].name + '</b><small>' + (itemAvailable(save, r.item) ? statLine(ITEMS[r.item].stats) : 'Pas ton arme : ' + itemPrice(r.item) + ' lucioles à la place') + '</small></p>' : '')) + '</div>' +
        '<button class="btn" data-tower-fight="' + f + '">' + (f <= save.tower ? 'Rejouer l’épreuve' : (card.boss ? (anc ? 'Défier le Grand Ancêtre ▶' : 'Défier le Grand Sage ▶') : 'Affronter ▶')) + '</button></div>';
    }
    // tout ce que la tour a déjà rapporté : lucioles, XP et les trésors des Grands Sages
    var won = { gold: 0, xp: 0 };
    for (var wf = rg[0]; wf <= Math.min(rg[1], save.tower); wf++) { var wr = towerRewards(wf); won.gold += wr.gold; won.xp += wr.xp; }
    var keys = Object.keys(grands), gotN = keys.filter(function (k) { return save.tower >= +k; }).length;
    var trs = keys.map(function (k) { var fl = +k, id = towerTreasure(fl), got = save.tower >= fl; return '<div class="tw-tr' + (got ? ' got' : '') + '" title="' + (got ? ITEMS[id].name : 'Étage ' + fl + ' : ' + grands[fl].nom) + '"><img class="px" src="' + (got ? iconUrls[id] : lockedUrls[id]) + '" alt=""><small>' + fl + '</small></div>'; }).join('');
    html += '<div class="tw-won"><h2>RÉCOMPENSES OBTENUES</h2><p>' + won.gold + ' lucioles · ' + won.xp + ' XP · ' + gotN + ' / ' + keys.length + (anc ? ' reliques' : ' trésors') + '</p><div class="tw-trs">' + trs + '</div></div>';
    if (save.tower < rg[1]) {
      var tp = towerTreasure(nextBoss);
      html += '<p class="tw-hint">Prochain ' + (anc ? 'Grand Ancêtre' : 'Grand Sage') + ' : étage <b>' + nextBoss + '</b>' + (tp ? ', qui garde <b style="color:' + RARITIES[rarityOf(tp)].color + '">' + ITEMS[tp].name + '</b>' : '') + '.</p>';
    }
    $('tower-side').innerHTML = html;
  }

  // ---------- Les Donjons (donjons.js) ----------
  // À gauche, une porte par donjon (ouverte ou non selon le niveau, sa progression) ; à droite, celui qu'on a choisi :
  // ses dix salles, l'ennemi de la prochaine (comparé à soi), ce qu'elle rapporte, et ses objets Uniques.
  var dj = { sel: null };
  // les donjons qu'on voit : ceux qui sont ouverts, et le suivant (fermé, en silhouette)
  function djVisible() { var list = []; for (var i = 0; i < DUNGEONS.length; i++) { list.push(DUNGEONS[i]); if (!dungeonOpen(save, DUNGEONS[i])) break; } return list; }
  function openDonjons() {
    var vis = djVisible(), open = vis.filter(function (d) { return dungeonOpen(save, d); });
    if (!dungeonById(dj.sel) || vis.indexOf(dungeonById(dj.sel)) < 0) {
      var todo = open.filter(function (d) { return !dungeonCleared(save, d); });
      dj.sel = (todo[0] || open[open.length - 1] || DUNGEONS[0]).id; // le premier pas encore vidé
    }
    renderDonjons();
  }
  function djCard(d) {
    var open = dungeonOpen(save, d), st = dungeonState(save, d), done = st.room >= DUNGEON_ROOMS, pips = '';
    for (var r = 1; r <= DUNGEON_ROOMS; r++) pips += '<i class="' + (r <= st.room ? 'on' : (r === st.room + 1 && open ? 'next' : '')) + (r === DUNGEON_ROOMS ? ' boss' : (r === 5 ? ' guard' : '')) + '"></i>';
    var uniq = save.owned.filter(function (id) { return ITEMS[id] && ITEMS[id].rarity === 'unique' && ITEMS[id].dungeon === d.id; }).length, pet = petById(d.id), pl = pet ? petLevel(save, pet.id) : 0;
    return '<article class="dj-card2' + (open ? '' : ' locked') + (done ? ' done' : '') + (d.id === dj.sel ? ' is-active' : '') + '" data-dj-card="' + d.id + '">' +
      '<div class="dj-c-art" style="background-image:url(' + DungeonArt.scene(d, open) + ')"><div class="dj-c-top"><span>DONJON ' + (d.n + 1) + '</span><span>' + (open ? 'Niv. ' + d.level + '–' + (d.level + DUNGEON_ROOMS + 1) : '') + '</span></div></div>' +
      '<div class="dj-c-body"><h2>' + (open ? d.name : '???') + '</h2>' +
      (open ? '<p>' + d.desc + '</p><div class="dj-c-rooms" title="' + st.room + ' / ' + DUNGEON_ROOMS + ' salles">' + pips + '</div>' +
        '<div class="dj-c-meta"><span>' + (done ? '<b class="ok">VIDÉ</b>' + (st.day === todayKey() ? ' · boss vaincu aujourd’hui' : ' · boss du jour à redéfier') : st.room + ' / ' + DUNGEON_ROOMS + ' salles') + '</span>' +
        '<span><b class="dj-unique">' + uniq + '</b> Unique' + (uniq > 1 ? 's' : '') + ' · ' + setName(d) + '</span>' +
        '<span>Compagnon : ' + (pl ? '<b>' + pet.name + '</b> niv. ' + pl : 'pas encore') + '</span></div>'
        : '<p class="dj-c-lock">🔒 ' + dungeonLock(save, d) + '</p>') + '</div></article>';
  }
  function renderDonjons() {
    var vis = djVisible(), cleared = DUNGEONS.filter(function (d) { return dungeonCleared(save, d); }).length;
    $('dj-count').textContent = cleared + ' / ' + DUNGEONS.length + ' vidés';
    $('dj-carousel').innerHTML = '<button class="dj-arrow prev" data-dj-step="-1" aria-label="Donjon précédent">◀</button><div class="dj-viewport"><div class="dj-track" id="dj-track">' + vis.map(djCard).join('') + '</div></div>' +
      '<button class="dj-arrow next" data-dj-step="1" aria-label="Donjon suivant">▶</button>';
    $('dj-dots').innerHTML = vis.map(function (d) { return '<button class="dj-dot' + (dungeonCleared(save, d) ? ' done' : '') + (dungeonOpen(save, d) ? '' : ' locked') + '" data-dj="' + d.id + '" aria-label="' + (dungeonOpen(save, d) ? d.name : 'Donjon fermé') + '"></button>'; }).join('');
    selectDungeon(dj.sel, true);
  }
  // choisir un donjon : la piste glisse jusqu'à sa carte, et le panneau montre son monstre
  function selectDungeon(id, instant) {
    var vis = djVisible(), d = dungeonById(id) || vis[0], idx = Math.max(0, vis.indexOf(d)), track = $('dj-track');
    dj.sel = d.id;
    Array.prototype.forEach.call(track.children, function (c) { c.classList.toggle('is-active', c.dataset.djCard === d.id); });
    Array.prototype.forEach.call(document.querySelectorAll('.dj-dot'), function (b) { b.classList.toggle('is-on', b.dataset.dj === d.id); });
    document.querySelector('.dj-arrow.prev').disabled = idx === 0;
    document.querySelector('.dj-arrow.next').disabled = idx >= vis.length - 1;
    var card = track.children[idx], vp = track.parentNode;
    if (card) {
      track.style.transition = instant ? 'none' : '';
      track.style.transform = 'translateX(' + Math.round(vp.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2)) + 'px)';
    }
    renderDjSide();
  }
  function djStep(n) {
    var vis = djVisible(), idx = vis.indexOf(dungeonById(dj.sel)), to = Math.max(0, Math.min(vis.length - 1, idx + n));
    if (to !== idx) { Sfx.play('page'); selectDungeon(vis[to].id); }
  }
  // à droite : seulement le monstre de la prochaine salle, sa force comparée à la tienne, et ce qu'il rapporte
  function renderDjSide() {
    var d = dungeonById(dj.sel), box = $('dj-side');
    if (!d) { box.innerHTML = ''; return; }
    if (!dungeonOpen(save, d)) {
      box.innerHTML = '<div class="dj-s-locked"><img class="px" src="' + DungeonArt.gate(d, false) + '" alt=""><h2>DONJON FERMÉ</h2><p>' + dungeonLock(save, d) + '.</p><p class="muted">Ses monstres et ses Uniques n’existent nulle part ailleurs.</p></div>';
      return;
    }
    var st = dungeonState(save, d), done = st.room >= DUNGEON_ROOMS, next = Math.min(DUNGEON_ROOMS, st.room + 1), daily = done && st.day !== todayKey();
    var foe = dungeonFoe(d, next), me = myFight(), rw = dungeonRewards(d, next, done), gap = xpGapMult(save.level, foe.level), boss = next === DUNGEON_ROOMS;
    var row = function (label, his, mine, f) { var worse = his > mine * 1.08, better = his < mine * 0.92; return '<li><span>' + label + '</span><b class="' + (worse ? 'down' : (better ? 'up' : '')) + '">' + f(his) + '</b><small>toi : ' + f(mine) + '</small></li>'; };
    var n = function (v) { return Math.round(v).toLocaleString('fr-FR'); }, p = function (v) { return Math.round(v * 100) + ' %'; };
    box.innerHTML = '<span class="dj-s-kicker">' + (done ? 'LE BOSS, À NOUVEAU' : 'SALLE ' + next + ' / ' + DUNGEON_ROOMS + (boss ? ' · BOSS' : (next === 5 ? ' · GARDIEN' : ''))) + '</span>' +
      '<div class="dj-s-foe' + (boss ? ' boss' : '') + '"><img class="px" src="' + monsterPortrait(foe) + '" alt=""></div>' +
      '<h2 class="dj-s-name">' + foe.name + '</h2><span class="dj-s-lvl">Niveau ' + foe.level + (foe.level > save.level ? ' · <b class="down">+' + (foe.level - save.level) + '</b>' : '') + '</span>' +
      '<ul class="dj-s-stats">' + row('PV', foe.maxHp, me.maxHp, n) + row('Dégâts', foe.dmg, me.dmg, n) + row('Esquive', foe.dodge, me.dodge, p) + '</ul>' +
      '<div class="dj-s-rew"><span><b>' + n(rw.xp * gap) + '</b> XP' + (gap < 1 ? ' <small>(réduite)</small>' : '') + '</span><span><b>' + n(rw.gold) + '</b> lucioles</span>' +
      '<span><b>' + (rw.item >= 1 ? '100 %' : p(rw.item)) + '</b> objet</span><span class="dj-unique"><b>' + p(rw.unique) + '</b> Unique</span>' +
      (boss ? '<span><b>' + p(done ? PET_CHANCE.daily : PET_CHANCE.first) + '</b> compagnon</span>' : '') + '</div>' +
      (done ? (daily ? '<button class="btn dj-go" data-dj-daily>Redéfier le boss ▶</button>' : '<button class="btn dj-go" disabled>Le boss se repose : reviens demain</button>')
        : '<button class="btn dj-go" data-dj-fight="' + next + '">' + (boss ? 'Affronter le boss ▶' : 'Entrer dans la salle ' + next + ' ▶') + '</button>');
  }
  // faire glisser les cartes (souris ou doigt), et les flèches du clavier
  (function () {
    var x0 = null, moved = false;
    $('dj-carousel').addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; x0 = e.clientX; moved = false; });
    window.addEventListener('pointermove', function (e) { if (x0 !== null && Math.abs(e.clientX - x0) > 8) moved = true; });
    window.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      if (moved && Math.abs(dx) > 50) djStep(dx < 0 ? 1 : -1);
      else if (!moved) { var card = e.target.closest && e.target.closest('[data-dj-card]'); if (card && card.dataset.djCard !== dj.sel) { Sfx.play('page'); selectDungeon(card.dataset.djCard); } }
    });
    window.addEventListener('keydown', function (e) {
      if (state.page !== 'donjons' || $('app').hidden || !$('battle').hidden) return;
      if (e.key === 'ArrowRight') djStep(1);
      if (e.key === 'ArrowLeft') djStep(-1);
    });
    window.addEventListener('resize', function () { if (state.page === 'donjons') selectDungeon(dj.sel, true); });
  })();
  function itemIconUrl(id) { return iconUrls[id] || iconUrls[baseOf(id)] || (iconUrls[id] = iconCanvas(ITEMS[id]).toDataURL()); }
  function donjonFight(d, r, daily) {
    return {
      kind: 'donjon', biomeIndex: d.biome, stage: r, dungeon: d.id, room: r, daily: daily, gloom: true, enemy: dungeonFoe(d, r),
      title: d.name + ' · salle ' + r + ' / ' + DUNGEON_ROOMS + (daily ? ' · le boss, à nouveau' : ''),
      intro: r === DUNGEON_ROOMS ? d.boss.name + ' (niv. ' + dungeonFoe(d, r).level + ') t’attend au fond du donjon !' : null,
      settle: function (win) { return Promise.resolve(settleDonjon(d, r, daily, win)); },
      next: !daily && r < DUNGEON_ROOMS ? function () { return donjonFight(d, r + 1, false); } : null,
      again: function () { return donjonFight(d, r, daily); }
    };
  }
  function settleDonjon(d, r, daily, win) {
    var st = dungeonState(save, d);
    if (!win) return '<p>Le donjon te recrache. Change d’équipement ou de sorts, monte un peu… et reviens : la salle ' + r + ' t’attend.</p>';
    if (!daily && r <= st.room) return '<p>Salle déjà vidée : pas de nouvelle récompense.</p>';
    var rw = dungeonRewards(d, r, daily), foe = dungeonFoe(d, r), gap = xpGapMult(save.level, foe.level);
    var xp = clanXp(rw.xp * gap), gold = clanGold(rw.gold), levels = gainXp(save, xp);
    save.gold += gold;
    var loot = Math.random() < rw.item ? rollLoot(save, dungeonTier(d), 1, rw.luck) : null;
    if (loot) save.owned.push(loot);
    var uq = Math.random() < rw.unique * (1 + playerMutBonus.loot) ? rollUnique(save, d) : null;
    if (uq) save.owned.push(uq);
    save.dungeons[d.id] = { room: daily ? st.room : r, day: daily ? todayKey() : st.day };
    var pet = r === DUNGEON_ROOMS ? petDrop(save, d, daily) : null;
    var qd = track(save, 'room').concat(r === DUNGEON_ROOMS || r === 5 ? track(save, 'boss') : [], trackLoot(save, [loot, uq]));
    setPlayer(save);
    persist();
    Sfx.play(uq ? 'glint' : (levels ? 'levelup' : 'pickup'));
    var line = function (id, label) { return '<p class="bt-loot" style="' + rarStyle(id) + '"><img src="' + itemIconUrl(id) + '" alt=""> ' + label + ' : <b>' + ITEMS[id].name + '</b> <em>' + RARITIES[rarityOf(id)].name + '</em></p>'; };
    var nd = r === DUNGEON_ROOMS && !daily ? DUNGEONS[d.n + 1] : null;
    return (nd ? '<p class="bt-unlock">' + (dungeonOpen(save, nd) ? 'Le donjon suivant s’ouvre : <b>' + nd.name + '</b> !' : 'Le donjon suivant, <b>' + nd.name + '</b>, s’ouvrira au niveau ' + nd.level + '.') + '</p>' : '') +
      '<p>' + (r === DUNGEON_ROOMS ? (daily ? 'Le boss tombe encore !' : '<b>Le donjon est vidé !</b> Son boss se redéfie une fois par jour.') : 'Salle ' + r + ' vidée !') + ' +' + xp + ' XP · +' + gold + ' lucioles' + (levels ? ' · <b>Niveau ' + save.level + ' !</b>' : '') + '</p>' +
      (gap < 1 ? '<p class="bt-gap">XP réduite à ' + Math.round(gap * 100) + ' % : tu es bien plus fort que ce donjon.</p>' : '') +
      (loot ? line(loot, 'Butin') : '') + (uq ? line(uq, 'OBJET UNIQUE') : '') +
      (pet ? '<p class="bt-loot bt-pet"><img src="' + petIcon(pet.pet) + '" alt=""> ' + (pet.max ? pet.pet.name + ' est déjà au plus haut : <b>+' + pet.eclats + ' éclats</b>.' : (pet.up ? '<b>' + pet.pet.name + '</b> grandit : niveau ' + pet.lvl + ' !' : 'Le petit du boss te suit : <b>' + pet.pet.name + '</b> devient ton compagnon !' + (save.pet === pet.pet.id ? ' Il est déjà à tes côtés.' : ' (page Personnage, case Compagnon)'))) + '</p>' : '') + questLine(qd);
  }

  // ---------- L'Album : un livre à feuilleter ----------
  // Une double page par famille (ALBUM_CHAPTERS) : la présentation de la famille à gauche, ses cartes à collectionner
  // sur les deux pages. Le sommaire ouvre le livre, avec les chapitres et les récompenses à réclamer. Une carte pas
  // encore trouvée montre son dos, avec un indice pour la trouver.
  var album = { spread: 0, flipping: false }, albumImgs = {};
  var BOOKMARK_MONSTER = stringsToCanvas(SPECIES.limon.frames[0], SPECIES.limon.pal).toDataURL();
  function monsterImg(m, found) {
    var key = m.id + (found ? '' : '-x');
    if (albumImgs[key]) return albumImgs[key];
    if (m.kind === 'sage') return (albumImgs[key] = found ? portraitOf(towerCard(m.floor)) : '');
    var s = SPECIES[m.species], pal = rarityPal(Object.assign({}, s.pal, m.pal || {}), m.rarity);
    return (albumImgs[key] = stringsToCanvas(s.frames[0], pal).toDataURL());
  }
  function chapterFound(ch) {
    return ch.cat === 'monstres' ? ch.list.filter(function (m) { return albumOf(save).monstres[m.id]; }).length : ch.list.filter(function (id) { return albumSyncItems(save).indexOf(id) >= 0; }).length;
  }
  // les cartes qui comptent pour cette grenouille (les armes des autres voies ou des autres types ne comptent pas)
  function chapterTotal(ch) {
    if (ch.cat === 'monstres') return ch.list.length;
    var pool = albumPool(save);
    return ch.list.filter(function (id) { return pool.indexOf(id) >= 0; }).length;
  }
  // une carte : cadre de la rareté, illustration, nom, et ce qu'on sait
  function albumCard(ch, e) {
    if (ch.cat === 'monstres') {
      var n = albumOf(save).monstres[e.id] || 0, biome = e.kind === 'sage' ? null : BIOMES[e.biome];
      if (!n) return '<div class="acard back"><span class="ac-q">?</span><small>' + (e.kind === 'sage' ? 'Tour, étage ' + e.floor : biome.name + (e.rarity !== 'commun' ? ' · ' + RARITIES[e.rarity].name : '')) + '</small></div>';
      var bg = biome ? 'linear-gradient(' + biome.pal.groundLight + ', ' + biome.pal.groundDark + ')' : 'linear-gradient(#ffb070, #7a2a1a)';
      return '<div class="acard r-' + e.rarity + ' k-' + e.kind + '"><div class="ac-in"><b class="ac-name">' + e.name + '</b>' +
        '<div class="ac-art" style="background:' + bg + '"><img class="px" src="' + monsterImg(e, true) + '" alt=""></div>' +
        '<span class="ac-sub">' + (e.kind === 'sage' ? 'Étage ' + e.floor : biome.name) + '</span><span class="ac-foot">' + (e.kind === 'boss' ? 'BOSS' : RARITIES[e.rarity].name.toUpperCase()) + ' · vaincu ×' + n + '</span></div></div>';
    }
    var it = ITEMS[e], ok = albumSyncItems(save).indexOf(e) >= 0;
    if (!ok && !itemAvailable(save, e)) return '<div class="acard back off"><img class="px ac-ghost" src="' + lockedUrls[e] + '" alt=""><small>Pas pour ton arme</small></div>';
    if (!ok) return '<div class="acard back"><img class="px ac-ghost" src="' + lockedUrls[e] + '" alt=""><small>' + itemHint(e) + '</small></div>';
    var slot = SLOTS.filter(function (s) { return s.id === it.slot; })[0].name;
    return '<div class="acard ' + (it.reward ? 'r-epique k-tresor' : 'r-commun') + '" title="' + it.desc + '"><div class="ac-in"><b class="ac-name">' + it.name + '</b>' +
      '<div class="ac-art item"><img class="px" src="' + iconUrls[e] + '" alt=""></div>' +
      '<span class="ac-sub">' + statLine(it.stats) + '</span><span class="ac-foot">' + slot.toUpperCase() + (it.reward ? ' · TRÉSOR' : ' · RANG ' + (ITEM_TIER[e] || 1)) + '</span></div></div>';
  }
  // la dernière double page du livre : les hauts faits (FEATS_SPREAD)
  var FEATS_SPREAD = { cat: 'hauts', name: 'Hauts faits' };
  function albumSpreads() { return [null].concat(ALBUM_CHAPTERS, [FEATS_SPREAD]); }
  function featsPage(groups) {
    return groups.map(function (g) {
      var list = FEATS.filter(function (f) { return (f.cat || 'boss') === g[0]; });
      if (!list.length) return '';
      return '<h2 class="bk-feat-h">' + g[1].toUpperCase() + '</h2><div class="bk-feats">' + list.map(function (f) {
        var got = save.ach && save.ach.indexOf(f.id) >= 0;
        return '<div class="bk-feat' + (got ? '' : ' locked') + '" title="' + f.desc + '"><img src="' + medalUrl(f) + '" alt=""><span><b>' + (got ? f.name : '???') + '</b><small>' + f.desc + '</small></span></div>';
      }).join('') + '</div>';
    }).join('');
  }
  function renderAlbum() {
    var spreads = albumSpreads(), sp = album.spread = Math.max(0, Math.min(spreads.length - 1, album.spread)), ch = spreads[sp], featsAt = spreads.length - 1;
    var firstObj = 1 + ALBUM_CHAPTERS.map(function (c) { return c.cat; }).indexOf('objets'), ready = ALBUM_MILESTONES.some(function (m) { return milestoneReady(save, m); });
    $('book-tabs').innerHTML = [['Sommaire', 0, sp === 0, ICON.album], ['Bestiaire', 1, sp >= 1 && sp < firstObj, BOOKMARK_MONSTER], ['Objets', firstObj, sp >= firstObj && sp < featsAt, iconUrls.lame_jade], ['Hauts faits', featsAt, sp === featsAt, medalUrl(FEATS[0])]].map(function (t, i) {
      return '<button data-book-go="' + t[1] + '" aria-selected="' + t[2] + '" class="bmark bm-' + i + '" title="' + t[0] + '"><img class="px" src="' + t[3] + '" alt=""><span>' + t[0] + '</span>' + (i === 0 && ready ? '<i class="badge-dot"></i>' : '') + '</button>';
    }).join('');
    var left, right;
    if (!ch) {
      var bar = function (cat, label) {
        var total = cat === 'monstres' ? ALBUM_MONSTERS.length : albumPool(save).length, found = albumCount(save, cat);
        return '<div class="bk-prog"><span>' + label + ' <b>' + found + ' / ' + total + '</b></span><span class="al-bar"><i style="width:' + (found / total * 100) + '%"></i></span></div>';
      };
      var toc = function (cat) {
        var groups = ISLES.slice(1).map(function (s) { return { isle: s, list: ALBUM_CHAPTERS.filter(function (c) { return c.cat === cat && c.isle === s.id; }) }; })
          .filter(function (gr) { return gr.list.length && isleOpen(save, gr.isle); });
        return ALBUM_CHAPTERS.map(function (c, i) { return c.cat !== cat || c.isle ? '' : '<button class="bk-toc" data-book-go="' + (i + 1) + '"><span>' + c.name + '</span><i></i><b>' + (chapterTotal(c) ? chapterFound(c) + ' / ' + chapterTotal(c) : '—') + '</b></button>'; }).join('') +
          groups.map(function (gr) {
            var first = ALBUM_CHAPTERS.indexOf(gr.list[0]), gf = gr.list.reduce(function (s, c) { return s + chapterFound(c); }, 0), gt = gr.list.reduce(function (s, c) { return s + chapterTotal(c); }, 0);
            return '<button class="bk-toc cont" data-book-go="' + (first + 1) + '"><span>' + gr.isle.short + ' · ' + gr.list.length + ' terres ▶</span><i></i><b>' + gf + ' / ' + gt + '</b></button>';
          }).join('');
      };
      left = '<h1 class="bk-title">ALBUM DU MARAIS</h1><p class="bk-intro">Chaque créature vaincue et chaque objet trouvé colle sa carte dans ce livre. Les cartes rares et épiques ont leur cadre bleu ou violet.</p>' +
        bar('monstres', 'Bestiaire') + bar('objets', 'Objets') +
        '<h2 class="bk-h">BESTIAIRE</h2><div class="bk-tocs">' + toc('monstres') + '</div><h2 class="bk-h">OBJETS</h2><div class="bk-tocs">' + toc('objets') + '</div>' +
        '<h2 class="bk-h">HAUTS FAITS</h2><div class="bk-tocs"><button class="bk-toc" data-book-go="' + (albumSpreads().length - 1) + '"><span>Les médailles</span><i></i><b>' + FEATS.filter(function (f) { return save.ach && save.ach.indexOf(f.id) >= 0; }).length + ' / ' + FEATS.length + '</b></button></div>';
      right = '<h2 class="bk-h">RÉCOMPENSES</h2><p class="bk-intro">Remplis le livre pour gagner des lucioles, de l’expérience… et deux trésors.</p><div class="bk-miles">' +
        ALBUM_MILESTONES.map(function (m) {
          var done = albumOf(save).paliers.indexOf(m.id) >= 0, rdy = milestoneReady(save, m), have = albumCount(save, m.cat), n = milestoneTarget(save, m);
          return '<div class="bk-mile' + (done ? ' done' : (rdy ? ' ready' : '')) + '"><span class="bm-n">' + n + '</span><span class="bm-txt"><b>' + (m.cat === 'monstres' ? 'créatures' : 'objets') + '</b>' + m.gold + ' lucioles · ' + m.xp + ' XP' + (m.item ? ' · <em>' + ITEMS[m.item].name + '</em>' : '') + '</span>' +
            (done ? '<span class="bm-state">Reçu</span>' : (rdy ? '<button class="btn" data-claim="' + m.id + '">Réclamer</button>' : '<span class="bm-state">' + Math.min(have, n) + ' / ' + n + '</span>')) + '</div>';
        }).join('') + '</div>';
    } else if (ch === FEATS_SPREAD) {
      var got = FEATS.filter(function (f) { return save.ach && save.ach.indexOf(f.id) >= 0; }).length;
      left = '<div class="bk-chap"><span class="bk-kicker">HAUTS FAITS</span><h1 class="bk-title">LES MÉDAILLES</h1><p class="bk-intro">Chaque exploit de ta grenouille lui vaut une médaille : bronze, argent ou or. Une fois gagnée, elle est à toi pour toujours.</p>' +
        '<div class="bk-prog"><span>Médailles gagnées <b>' + got + ' / ' + FEATS.length + '</b></span><span class="al-bar"><i style="width:' + (got / FEATS.length * 100) + '%"></i></span></div></div>' +
        featsPage(FEAT_GROUPS.filter(function (g) { return g[0] !== 'boss'; }));
      right = featsPage(FEAT_GROUPS.filter(function (g) { return g[0] === 'boss'; }));
    } else {
      var found = chapterFound(ch), total = chapterTotal(ch), cards = ch.list.map(function (e) { return albumCard(ch, e); });
      left = '<div class="bk-chap"><span class="bk-kicker">' + (ch.cat === 'monstres' ? 'BESTIAIRE' : 'OBJETS') + '</span><h1 class="bk-title">' + ch.name.toUpperCase() + '</h1><p class="bk-intro">' + ch.desc + '</p>' +
        (total ? '<div class="bk-prog"><span>Cartes trouvées <b>' + found + ' / ' + total + '</b></span><span class="al-bar"><i style="width:' + (found / total * 100) + '%"></i></span></div>' : '<p class="bk-intro"><b>Ce ne sont pas tes armes :</b> elles ne comptent pas dans ta collection.</p>') + '</div>' +
        '<div class="bk-cards">' + cards.slice(0, 6).join('') + '</div>';
      right = '<div class="bk-cards">' + cards.slice(6).join('') + '</div>' + (cards.length <= 6 ? '<p class="bk-empty">La suite de ce chapitre reste à écrire…</p>' : '');
    }
    $('book-left').innerHTML = left;
    $('book-right').innerHTML = right;
    $('book-folio').textContent = sp === 0 ? 'Sommaire' : (sp === featsAt ? 'Hauts faits' : 'Chapitre ' + sp + ' / ' + ALBUM_CHAPTERS.length);
    $('book-prev').disabled = sp === 0;
    $('book-next').disabled = sp === spreads.length - 1;
  }
  function turnPage(to) {
    if (to === album.spread || album.flipping) return;
    var fwd = to > album.spread, book = $('book'), L = $('book-left'), R = $('book-right');
    var oldL = L.innerHTML, oldR = R.innerHTML;
    album.spread = to;
    renderAlbum();
    var newL = L.innerHTML, newR = R.innerHTML, src = fwd ? R : L;
    // la page du dessous garde l'ancien contenu tant que la feuille ne s'est pas posée dessus
    if (fwd) L.innerHTML = oldL; else R.innerHTML = oldR;
    var b = book.getBoundingClientRect(), p = src.getBoundingClientRect(), leaf = document.createElement('div');
    leaf.className = 'book-leaf ' + (fwd ? 'to-left' : 'to-right');
    leaf.style.cssText = 'left:' + (p.left - b.left) + 'px;top:' + (p.top - b.top) + 'px;width:' + p.width + 'px;height:' + p.height + 'px';
    leaf.innerHTML = '<div class="leaf-face front book-page ' + (fwd ? 'right' : 'left') + '">' + (fwd ? oldR : oldL) + '</div>' +
      '<div class="leaf-face back book-page ' + (fwd ? 'left' : 'right') + '">' + (fwd ? newL : newR) + '</div>';
    book.appendChild(leaf);
    album.flipping = true;
    Sfx.play('page');
    setTimeout(function () {
      if (fwd) L.innerHTML = newL; else R.innerHTML = newR;
      leaf.remove();
      album.flipping = false;
    }, 700);
  }
  window.addEventListener('keydown', function (e) {
    if (state.page !== 'album' || $('app').hidden || !$('battle').hidden) return;
    if (e.key === 'ArrowRight') turnPage(Math.min(albumSpreads().length - 1, album.spread + 1));
    if (e.key === 'ArrowLeft') turnPage(Math.max(0, album.spread - 1));
  });

  // ---------- Rendu général ----------
  function renderAll() {
    albumSyncItems(save);
    $('badge-album').hidden = !ALBUM_MILESTONES.some(function (m) { return milestoneReady(save, m); });
    $('badge-donjons').hidden = !dungeonHint();
    checkFeats();
    renderSidebar();
    renderAdventure();
    renderLevel();
    renderSlots();
    renderStats();
    renderMutation();
    renderInventory();
    renderDetails();
    Array.prototype.forEach.call(document.querySelectorAll('#views button'), function (b) { b.classList.toggle('is-active', b.dataset.view === state.view); });
    if (state.page === 'skills') renderTree();
    if (state.page === 'map') renderWorldMap();
    if (state.page === 'shop') renderShop();
    if (state.page === 'album') renderAlbum();
  }

  function showPage(page) {
    state.page = page;
    ['camp', 'perso', 'forge', 'skills', 'map', 'shop', 'skins', 'tower', 'donjons', 'dojo', 'clans', 'titan', 'album', 'rank'].forEach(function (p) { $('page-' + p).hidden = p !== page; });
    renderSidebar();
    if (page === 'camp') { campBiome(); layoutScene(); }
    if (page === 'skills') renderTree();
    if (page === 'map') { cam.reset = true; renderWorldMap(); }
    if (page === 'donjons') openDonjons();
    if (page === 'rank') openRank();
    if (page === 'dojo') openDojo();
    if (page === 'clans') openClans();
    if (page === 'titan') openTitan();
    if (page === 'forge') openForge();
    if (page === 'skins') openSkins();
    if (page === 'tower') openTower();
    if (page === 'album') renderAlbum();
    if (page === 'shop') { state.ware = null; renderShop(); gamakoSay(GAMAKO_SAYS[Math.floor(Math.random() * GAMAKO_SAYS.length)]); } else gamakoHush();
    Sfx.ambient(page === 'camp' && visible);
  }

  function notice(text, append) {
    var n = $('notice');
    n.textContent = append && !n.hidden && n.textContent ? n.textContent + ' ' + text : text;
    n.hidden = false;
    clearTimeout(notice.timer);
    notice.timer = setTimeout(function () { n.hidden = true; }, 7000);
  }

  // ---------- Combats ----------
  function startFight(fight) {
    if (save.meditation) endMeditation(false, 'Kawazu se lève pour combattre');
    visible = false;
    cancelAnimationFrame(raf);
    Sfx.ambient(false);
    Sfx.music('battle');
    BattleScene.start(save, fight, afterFight);
  }
  function afterFight(result, fight) {
    visible = true;
    Sfx.music('calm');
    state.sheet = null;
    buildHero();
    renderAll();
    var atDojo = fight.kind === 'duel' || fight.kind === 'arbre';
    if (fight.kind === 'arbre' && fight.done > 0) dojo.last = Object.assign({ turns: fight.done, riposte: fight.riposte }, fight.stats);
    if (fight.kind === 'duel' && result === 'flee' && !fight.settled) {
      settleDuel(fight.card, false).then(function () { notice('Tu as quitté le duel : il compte comme une défaite.'); if (state.page === 'dojo') renderDojo(); }, function () {});
    }
    // quitter un assaut : ses dégâts comptent quand même (sans coup porté, l'assaut n'est pas perdu) ; quitter un combat de guerre : une défaite
    if (fight.kind === 'raid' && result === 'flee' && !fight.settled && fight.stats.total > 0) fight.settle(false).then(function () { notice('Tu as quitté l’assaut : tes dégâts comptent quand même.'); loadClans(); }, function () {});
    if (fight.kind === 'titan' && result === 'flee' && !fight.settled && fight.stats.total > 0) fight.settle(false).then(function () { notice('Tu as quitté l’attaque : tes dégâts comptent quand même.'); loadTitan(); }, function () {});
    if (fight.kind === 'titan') loadTitan();
    if (fight.kind === 'guerre' && result === 'flee' && !fight.settled) fight.settle(false).then(function () { notice('Tu as quitté le combat : il compte comme une défaite.'); loadClans(); }, function () {});
    var atClan = fight.kind === 'raid' || fight.kind === 'guerre';
    showPage(fight.kind === 'tour' ? 'tower' : (fight.kind === 'donjon' ? 'donjons' : (fight.kind === 'titan' ? 'titan' : (atDojo ? 'dojo' : (atClan ? 'clans' : 'map')))));
    startTick();
  }

  // ---------- Événements ----------
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t || !$('app').contains(t) || $('app').hidden) return;
    if (t.id === 'mute') { Sfx.toggle(); renderMute(); if (!Sfx.isMuted()) Sfx.play('click'); return; }
    if (t.id === 'open-save') { Sfx.play('click'); $('save-modal').hidden = false; $('save-msg').textContent = ''; $('reset-confirm').hidden = true; return; }
    if (t.dataset.stat) { if (save.points > 0) { var sid = t.dataset.stat; save.alloc[sid]++; save.points--; persist(); Sfx.play('point'); renderAll(); bumpStat(sid); } return; }
    if (t.dataset.learn) {
      var n = nodeById(t.dataset.learn);
      if (canLearnNode(save, n)) {
        save.tree.push(n.id); save.skillPoints -= n.cost;
        if (n.skill && save.deck.length < DECK_SIZE) save.deck.push(n.skill); // rangé tout seul dans le deck s'il reste de la place
        setPlayer(save); persist(); Sfx.play('levelup'); buildHero(); renderAll();
      }
      return;
    }
    // choisir sa voie : la grenouille plonge dans la flaque (définitif)
    if (t.dataset.towerScroll) { var sc = +t.dataset.towerScroll; tower.view = sc ? tower.view + sc : Math.max(1, towerNext() - 2); Sfx.play('click'); renderTower(); return; }
    if (t.dataset.floor) { tower.sel = +t.dataset.floor; Sfx.play('click'); renderTower(); return; }
    if (t.dataset.djGo) dj.sel = t.dataset.djGo; // depuis le camp : ce donjon-là (la page s'ouvre ensuite)
    if (t.dataset.dj) { Sfx.play('page'); selectDungeon(t.dataset.dj); return; }
    if (t.dataset.djStep) { djStep(+t.dataset.djStep); return; }
    if (t.dataset.djFight) { var djd = dungeonById(dj.sel), djr = +t.dataset.djFight; if (djd && dungeonOpen(save, djd) && djr === dungeonState(save, djd).room + 1) { Sfx.play('click'); startFight(donjonFight(djd, djr, false)); } return; }
    if (t.hasAttribute('data-dj-daily')) { var dd2 = dungeonById(dj.sel), st2 = dd2 && dungeonState(save, dd2); if (st2 && st2.room >= DUNGEON_ROOMS && st2.day !== todayKey()) { Sfx.play('click'); startFight(donjonFight(dd2, DUNGEON_ROOMS, true)); } return; }
    if (t.dataset.towerFight) { var tf = +t.dataset.towerFight; if (tf <= towerNext()) { Sfx.play('click'); startFight(towerFight(tf)); } return; }
    if (t.dataset.bookGo) { turnPage(+t.dataset.bookGo); return; }
    if (t.dataset.bookStep) { turnPage(Math.max(0, Math.min(ALBUM_CHAPTERS.length, album.spread + +t.dataset.bookStep))); return; }
    if (t.dataset.claim) {
      var ms = ALBUM_MILESTONES.filter(function (m) { return m.id === t.dataset.claim; })[0], got = ms && albumClaim(save, ms);
      if (got) {
        persist(); Sfx.play(got.levels ? 'levelup' : 'pickup');
        notice('Palier de l’album : +' + ms.gold + ' lucioles' + (ms.xp ? ', +' + ms.xp + ' XP' : '') + (ms.item ? ', et le trésor ' + ITEMS[ms.item].name : '') + (got.levels ? '. Niveau ' + save.level + ' !' : ' !'));
        renderAll();
      }
      return;
    }
    if (t.dataset.blIcone || t.dataset.blFond || t.dataset.blMotif) { // l'atelier du blason, sans redessiner la page : le nom tapé reste
      if (t.dataset.blIcone) clans.blason.icone = +t.dataset.blIcone;
      if (t.dataset.blFond) clans.blason.fond = +t.dataset.blFond;
      if (t.dataset.blMotif) clans.blason.motif = +t.dataset.blMotif;
      Sfx.play('click'); $('blason-editor').innerHTML = blasonEditor(); return;
    }
    if (t.hasAttribute('data-blason-edit')) { clans.editing = !clans.editing; clans.blason = Object.assign({}, blasonOf(clans.data.clan)); Sfx.play('click'); renderClans(); return; }
    if (t.hasAttribute('data-blason-cancel')) { clans.editing = false; renderClans(); return; }
    if (t.hasAttribute('data-blason-save')) { clans.editing = false; Sfx.play('pickup'); clanAction(clanApi('POST', '/blason', { blason: clans.blason })); return; }
    if (t.hasAttribute('data-clans-reload')) { clans.error = ''; loadClans(); return; }
    if (t.hasAttribute('data-clan-found')) {
      var cname = ($('clan-name').value || '').trim();
      if (cname.length < 3) { notice('Le nom du clan doit faire au moins 3 caractères.'); return; }
      if (save.gold < CLAN_PRICE) return;
      Sfx.play('click');
      clanApi('POST', '/fonder', { nom: cname, blason: clans.blason }).then(function () { save.gold -= CLAN_PRICE; persist(); renderSidebar(); Sfx.play('levelup'); notice('Le clan « ' + cname + ' » est fondé ! Invite tes amis à le rejoindre.'); loadClans(); }, function (err) { notice(err.message); });
      return;
    }
    if (t.dataset.clanJoin) { Sfx.play('click'); clanAction(clanApi('POST', '/rejoindre', { clan: t.dataset.clanJoin })); return; }
    if (t.hasAttribute('data-clan-leave')) {
      if (!clans.leaving) { clans.leaving = setTimeout(function () { clans.leaving = 0; renderClans(); }, 4000); renderClans(); return; }
      clearTimeout(clans.leaving); clans.leaving = 0;
      clanAction(clanApi('POST', '/quitter'));
      return;
    }
    if (t.dataset.clanKick) { // exclure : un premier clic arme le bouton, le second confirme
      var kid = t.dataset.clanKick;
      clearTimeout(clans.kickTimer);
      if (clans.kicking !== kid) { clans.kicking = kid; clans.kickTimer = setTimeout(function () { clans.kicking = null; renderClans(); }, 4000); Sfx.play('click'); renderClans(); return; }
      clans.kicking = null;
      clanAction(clanApi('POST', '/exclure', { membre: kid }));
      return;
    }
    if (t.hasAttribute('data-titan-attack')) { if (titan.data && titan.data.restants > 0) { Sfx.play('click'); startFight(titanFight(titan.data)); } return; }
    if (t.hasAttribute('data-titan-reload')) { titan.error = ''; loadTitan(); return; }
    if (t.hasAttribute('data-clan-raid')) { if (clans.data && clans.data.raids > 0) { Sfx.play('click'); startFight(raidFight(clans.data)); } return; }
    if (t.dataset.warDeclare) { // déclarer la guerre : un premier clic arme le bouton, le second confirme
      var cib = t.dataset.warDeclare;
      clearTimeout(clans.declareTimer);
      if (clans.declaring !== cib) { clans.declaring = cib; clans.declareTimer = setTimeout(function () { clans.declaring = null; renderClans(); }, 4000); Sfx.play('click'); renderClans(); return; }
      clans.declaring = null; Sfx.play('boss');
      clanAction(clanApi('POST', '/guerre', { cible: cib }));
      return;
    }
    if (t.dataset.clanDon) { // un don au trésor : le serveur le prend sur la sauvegarde, le jeu aussi
      var don = +t.dataset.clanDon;
      if (save.gold < don) return;
      Sfx.play('click');
      Cloud.flush().then(function () { return clanApi('POST', '/don', { montant: don }); }).then(function () {
        save.gold -= don; persist(); renderSidebar(); Sfx.play('pickup'); notice('Merci ! ' + fmtN(don) + ' lucioles versées au trésor du clan.'); loadClans();
      }, function (err) { notice(err.message); });
      return;
    }
    if (t.dataset.clanBonus) { Sfx.play('levelup'); clanAction(clanApi('POST', '/ameliorer', { bonus: t.dataset.clanBonus })); return; }
    if (t.dataset.warAttack) {
      Sfx.play('click');
      var foeId = t.dataset.warAttack;
      Cloud.flush().then(function () { return clanApi('POST', '/defi', { adversaire: foeId }); }).then(function (r) { startFight(warFight(r.adversaire)); }, function (err) { notice(err.message); });
      return;
    }
    if (t.dataset.dojoTab) { dojo.tab = t.dataset.dojoTab; Sfx.play('click'); renderDojo(); return; }
    if (t.hasAttribute('data-dojo-reload')) { dojo.error = ''; openDojo(); return; }
    if (t.dataset.foeStep) { dojo.pick += +t.dataset.foeStep; Sfx.play('click'); renderDojo(); return; }
    if (t.hasAttribute('data-dojo-foes')) { Sfx.play('click'); loadFoes(); return; }
    if (t.dataset.riposte) { dojo.riposte = t.dataset.riposte === '1'; Sfx.play('click'); renderDojo(); return; }
    if (t.hasAttribute('data-train')) { Sfx.play('click'); startFight(trainingFight()); return; }
    if (t.dataset.duel) {
      var foe = (dojo.foes || []).filter(function (x) { return x.id === t.dataset.duel; })[0];
      if (foe && dojo.data && dojo.data.restants > 0) { Sfx.play('click'); startFight(duelFight(foe)); }
      return;
    }
    if (t.dataset.rankSort) { rank.sort = t.dataset.rankSort; rank.limit = RANK_PAGE; rank.sel = null; Sfx.play('click'); renderRank(); return; }
    if (t.dataset.rankVoie) { rank.voie = t.dataset.rankVoie; rank.limit = RANK_PAGE; rank.sel = null; Sfx.play('click'); renderRank(); return; }
    if (t.dataset.rankFrog) { rank.sel = rank.sel === t.dataset.rankFrog ? null : t.dataset.rankFrog; Sfx.play('click'); renderRank(); return; }
    if (t.hasAttribute('data-rank-more')) { rank.limit += RANK_PAGE; Sfx.play('click'); renderRank(); return; }
    if (t.hasAttribute('data-rank-mine')) {
      var mi = rankedList().map(function (e) { return e.id; }).indexOf(Cloud.id);
      rank.limit = Math.ceil((mi + 1) / RANK_PAGE) * RANK_PAGE; rank.sel = Cloud.id; renderRank();
      var row = document.querySelector('.rk-row.is-current'); if (row) row.scrollIntoView({ block: 'center' });
      return;
    }
    if (t.hasAttribute('data-rank-duels')) { rank.sort = 'reputation'; rank.limit = RANK_PAGE; rank.sel = null; showPage('rank'); return; }
    if (t.hasAttribute('data-rank-refresh')) { Sfx.play('click'); openRank(); return; }
    if (t.dataset.pickVoie) { if (!diving && state.pick !== t.dataset.pickVoie) { state.pick = t.dataset.pickVoie; Sfx.play('drip'); renderTree(); } return; }
    if (t.dataset.chooseVoie) { if (!diving) diveInto(t.dataset.chooseVoie); return; }
    Sfx.play(t.id === 'equip-btn' ? 'equip' : 'click');
    if (t.dataset.page) { showPage(t.dataset.page); return; }
    if (t.id === 'tree-reset') {
      if (!resetArmed) { resetArmed = setTimeout(function () { resetArmed = 0; renderVoie(); }, 4000); renderVoie(); return; }
      clearTimeout(resetArmed); resetArmed = 0;
      if (save.gold < TEA.price) return;
      save.gold -= TEA.price; forgetTree(); state.node = null; renderAll();
      notice('Tout est oublié : tes points de voie sont rendus. Choisis une nouvelle voie.');
      return;
    }
    if (t.dataset.node) { state.node = t.dataset.node; renderTree(); return; }
    if (t.hasAttribute('data-build-open')) { $('build').hidden = false; renderBuild(); return; }
    if (t.hasAttribute('data-build-close')) { $('build').hidden = true; return; }
    if (t.dataset.deck) { if (save.deck.length < DECK_SIZE) { save.deck.push(t.dataset.deck); persist(); renderDeck(); } return; }
    if (t.dataset.undeck) { save.deck = save.deck.filter(function (id) { return id !== t.dataset.undeck; }); persist(); renderDeck(); return; }
    if (t.dataset.item) {
      if (state.sellMode) { // en mode vente : cocher / décocher, sans ouvrir la fiche
        var si = state.sellSel.indexOf(t.dataset.item);
        if (si >= 0) state.sellSel.splice(si, 1); else state.sellSel.push(t.dataset.item);
        state.sellArmed = false; state.salvageArmed = false; Sfx.play('click'); renderInventory(); return;
      }
      state.selected = t.dataset.item; renderAll(); return;
    }
    if (t.id === 'inv-sell-mode') { state.sellMode = !state.sellMode; state.sellSel = []; state.sellArmed = false; state.salvageArmed = false; Sfx.play('click'); renderInventory(); renderDetails(); return; }
    if (t.dataset.sellPick) {
      var key = t.dataset.sellPick, visible = Array.prototype.map.call(document.querySelectorAll('#inventory .item:not([disabled])'), function (b) { return b.dataset.item; });
      state.sellSel = key === 'aucun' ? [] : visible.filter(function (id) { return key === 'tout' || rarityOf(id) === key; });
      state.sellArmed = false; state.salvageArmed = false; Sfx.play('click'); renderInventory(); return;
    }
    if (t.hasAttribute('data-sell-go')) {
      if (!state.sellSel.length) return;
      if (!state.sellArmed) { state.sellArmed = true; state.salvageArmed = false; renderInventory(); return; }
      state.sellArmed = false; sellSelected(); return;
    }
    if (t.dataset.slot === 'pet') { state.filter = 'pet'; state.selected = save.pet ? 'pet:' + save.pet : null; renderAll(); return; }
    if (t.dataset.slot) { var sid = save.equip[t.dataset.slot]; if (sid) state.selected = sid; state.filter = t.dataset.slot; renderAll(); return; }
    if (t.dataset.pet) { state.selected = 'pet:' + t.dataset.pet; renderAll(); return; }
    if (t.dataset.petOn) { if (petLevel(save, t.dataset.petOn)) { save.pet = t.dataset.petOn; setPlayer(save); persist(); Sfx.play('pickup'); renderAll(); notice(petById(save.pet).name + ' te suit désormais, au camp comme au combat.'); } return; }
    if (t.hasAttribute('data-pet-off')) { save.pet = null; setPlayer(save); persist(); renderAll(); return; }
    if (t.dataset.quest) {
      var qg = claimQuest(save, t.dataset.quest);
      if (qg) { persist(); Sfx.play(qg.levels ? 'levelup' : 'pickup'); notice('Quête faite : +' + qg.gold.toLocaleString('fr-FR') + ' lucioles, +' + qg.xp.toLocaleString('fr-FR') + ' XP, +' + qg.eclats + ' éclats' + (qg.levels ? '. Niveau ' + save.level + ' !' : '.')); renderAll(); }
      return;
    }
    if (t.hasAttribute('data-quest-chest')) {
      var cg = claimChest(save);
      if (cg) { persist(); Sfx.play('levelup'); notice('Le coffre du jour : ' + ITEMS[cg.item].name + ' (' + RARITIES[rarityOf(cg.item)].name + '), +' + cg.gold.toLocaleString('fr-FR') + ' lucioles, +' + cg.xp.toLocaleString('fr-FR') + ' XP, +' + cg.eclats + ' éclats' + (cg.levels ? '. Niveau ' + save.level + ' !' : '.')); renderAll(); }
      return;
    }
    if (t.dataset.forgeGo) { forge.sel = t.dataset.forgeGo; forge.msg = null; forge.tab = SLOTS.some(function (s) { return save.equip[s.id] === forge.sel; }) ? 'portes' : 'tous'; showPage('forge'); return; }
    if (t.dataset.forgeTab) { forge.tab = t.dataset.forgeTab; Sfx.play('click'); renderForge(); return; }
    if (t.dataset.forgePick) { forge.sel = t.dataset.forgePick; forge.msg = null; Sfx.play('click'); renderForge(); return; }
    if (t.dataset.forge) {
      var fid = t.dataset.forge, wasOn = SLOTS.some(function (s) { return save.equip[s.id] === fid; }), res = forgeItem(save, fid);
      if (!res) return;
      var fq = track(save, 'forge');
      setPlayer(save); persist(); if (wasOn && res.ok) buildHero();
      Sfx.play(res.ok ? 'levelup' : 'hurt'); forgeSparks(res.ok);
      forge.msg = res.ok ? { kind: 'win', text: 'Réussi ! ' + ITEMS[fid].name.split(' ')[0] + ' passe à <b>+' + res.level + '</b>.' } : { kind: 'fail', text: 'Raté… le métal a cédé. Les éclats sont perdus.' };
      forge.strike = 1; renderAll(); renderForge(); setTimeout(function () { forge.strike = 0; }, 400);
      quested(fq);
      return;
    }
    if (t.dataset.recycle) { var ri = forge.pick.indexOf(t.dataset.recycle); if (ri >= 0) forge.pick.splice(ri, 1); else forge.pick.push(t.dataset.recycle); forge.armed = false; Sfx.play('click'); renderRecycle(); return; }
    if (t.dataset.recyclePick) {
      var rk = t.dataset.recyclePick, worn2 = SLOTS.map(function (s) { return save.equip[s.id]; });
      forge.pick = rk === 'aucun' ? [] : save.owned.filter(function (id) { return ITEMS[id] && worn2.indexOf(id) < 0 && (rk === 'tout' || rarityOf(id) === rk); });
      forge.armed = false; Sfx.play('click'); renderRecycle(); return;
    }
    if (t.hasAttribute('data-recycle-go')) {
      if (!forge.pick.length) return;
      if (!forge.armed) { forge.armed = true; renderRecycle(); return; }
      var sv3 = salvageItems(save, forge.pick);
      forge.pick = []; forge.armed = false;
      var sq3 = track(save, 'recycle', sv3.n);
      persist(); Sfx.play('pickup'); forgeSparks(true); renderAll(); renderForge();
      notice(sv3.n + ' objet' + (sv3.n > 1 ? 's' : '') + ' recyclé' + (sv3.n > 1 ? 's' : '') + ' : +' + sv3.eclats.toLocaleString('fr-FR') + ' éclats de jade.');
      quested(sq3);
      return;
    }
    if (t.id === 'salvage-btn') {
      var sv = salvageItems(save, [state.selected]);
      if (!sv.n) return;
      state.selected = null;
      var sq = track(save, 'recycle', sv.n);
      persist(); Sfx.play('pickup'); renderAll();
      notice('Recyclé à la forge : +' + sv.eclats + ' éclats de jade.');
      quested(sq);
      return;
    }
    if (t.hasAttribute('data-salvage-go')) {
      if (!state.sellSel.length) return;
      if (!state.salvageArmed) { state.salvageArmed = true; state.sellArmed = false; renderInventory(); return; }
      var sv2 = salvageItems(save, state.sellSel);
      state.salvageArmed = false; state.sellSel = []; state.sellMode = false; state.selected = null;
      var sq2 = track(save, 'recycle', sv2.n);
      persist(); Sfx.play('pickup'); renderAll();
      notice(sv2.n + ' objet' + (sv2.n > 1 ? 's' : '') + ' recyclé' + (sv2.n > 1 ? 's' : '') + ' : +' + sv2.eclats + ' éclats de jade.');
      quested(sq2);
      return;
    }
    if (t.dataset.filter) { // (l'onglet des compagnons montre le sien)
      state.filter = t.dataset.filter;
      var onPet = String(state.selected).indexOf('pet:') === 0;
      if (state.filter === 'pet' && !onPet) state.selected = save.pet ? 'pet:' + save.pet : null;
      else if (state.filter !== 'pet' && onPet) state.selected = null;
      renderAll(); return;
    }
    if (t.dataset.view) { state.view = t.dataset.view; renderAll(); return; }
    if (t.dataset.mastery) {
      var mx = t.dataset.mastery, mr = save.mastery[mx] || 0, mc = masteryCost(mr);
      if (!treeComplete(save) || save.skillPoints < mc) return;
      save.skillPoints -= mc; save.mastery[mx] = mr + 1;
      setPlayer(save); persist(); Sfx.play('point'); renderAll();
      return;
    }
    if (t.dataset.awaken) {
      var wid = t.dataset.awaken, wi = save.awakened.indexOf(wid);
      if (wi >= 0) save.awakened.splice(wi, 1);
      else if (save.awakened.length < awakeningsAllowed(save)) save.awakened.push(wid);
      else return;
      persist(); Sfx.play(wi >= 0 ? 'click' : 'levelup'); renderAll();
      return;
    }
    if (t.dataset.towerMode) { tower.mode = t.dataset.towerMode; tower.sel = null; Sfx.play('click'); openTower(); return; }
    if (t.dataset.mapView) { state.mapView = t.dataset.mapView; state.sheet = null; Sfx.play('click'); renderWorldMap(); return; }
    if (t.dataset.wmZoom) {
      var zM = mapOf(mapView()), zL = camLimits(zM), z = t.dataset.wmZoom;
      Sfx.play('click');
      camCenter(zM, zL, camTarget(zM), zL.focus); camApply(zM);
      return;
    }
    if (t.hasAttribute('data-next-cycle')) {
      if (!cycleArmed) { cycleArmed = setTimeout(function () { cycleArmed = 0; if (state.page === 'map') renderWorldMap(); }, 5000); renderWorldMap(); return; }
      clearTimeout(cycleArmed); cycleArmed = 0;
      if (nextCycle(save)) {
        setPlayer(save); persist(); Sfx.play('boss'); state.mapView = 'ile'; state.sheet = null; mapFrog = null;
        notice('Le cycle ' + romanCycle(save.cycle) + ' commence ! Le monde est plus dangereux, mais tout ce que tu trouveras sera « +' + (save.cycle - 1) + ' ».');
        renderAll();
      }
      return;
    }
    if (t.dataset.mutPick) { mutPick = t.dataset.mutPick; Sfx.play('click'); renderMutation(); return; }
    if (t.hasAttribute('data-mutate')) {
      if (!mutPick || !mutate(save, mutPick)) return;
      var picked = MUTATIONS[mutPick].name; mutPick = null;
      setPlayer(save); persist(); buildHero(); Sfx.play('levelup'); renderAll();
      $('sb-portrait').classList.remove('mutating'); void $('sb-portrait').offsetWidth; $('sb-portrait').classList.add('mutating');
      notice('Mutation ! Ta grenouille repart au niveau 1, plus forte pour toujours : ' + picked + '.');
      return;
    }
    if (t.dataset.world) { var ow = +t.dataset.world; openStage(ow, t.dataset.st ? +t.dataset.st : nextStage(ow)); return; }
    if (t.hasAttribute('data-close-sheet')) { state.sheet = null; renderWorldMap(); return; }
    if (t.dataset.fight) { startFight(stageFight(save, state.sheet.w, +t.dataset.fight)); return; }
    if (t.dataset.exp) { if (save.meditation) endMeditation(false, 'Kawazu se lève pour partir en mission'); startExpedition(save, state.sheet.w, state.sheet.st, t.dataset.exp); persist(); renderStageSheet(); renderSidebar(); return; }
    if (t.dataset.arme) { if (!save.arme && VOIE_ARMES[chosenVoie(save)].indexOf(t.dataset.arme) >= 0) chooseArme(t.dataset.arme); return; }
    if (t.id === 'arme-change') { if (save.gold >= ARME_PRICE && save.arme) { save.gold -= ARME_PRICE; save.arme = null; persist(); Sfx.play('pickup'); renderAll(); } return; }
    if (t.hasAttribute('data-auto-points')) {
      var am = mainStat(chosenVoie(save)), n = save.points, toMain = Math.ceil(n * 0.6);
      save.alloc[am] += toMain; save.alloc.vitalite += n - toMain; save.points = 0;
      persist(); Sfx.play('point'); renderAll();
      notice(toMain + ' points en ' + STAT_NAME[am] + ' et ' + (n - toMain) + ' en Vitalité.');
      return;
    }
    if (t.id === 'stats-reset') {
      if (!statsArmed) { statsArmed = setTimeout(function () { statsArmed = 0; renderLevel(); }, 4000); renderLevel(); return; }
      clearTimeout(statsArmed); statsArmed = 0; resetStats(); return;
    }
    if (t.id === 'med-start') { save.meditation = { since: Date.now() }; persist(); Sfx.play('drip'); renderMeditation(); return; }
    if (t.id === 'med-stop') { endMeditation(false); return; }
    if (t.id === 'exp-claim' || (t.id === 'sb-expedition' && expeditionLeft(save) <= 0)) { claimExpedition(); return; }
    if (t.id === 'sb-expedition') { openStage(save.expedition.w, save.expedition.st); return; }
    if (t.id === 'exp-cancel') { save.expedition = null; persist(); renderStageSheet(); renderSidebar(); return; }
    if (t.id === 'adv-go') { openStage(currentWorld(), nextStage(currentWorld())); return; }
    if (t.dataset.ware) { state.ware = t.dataset.ware; renderShop(); return; }
    if (t.dataset.buy) {
      var id = t.dataset.buy;
      if (id === TEA_ID) {
        if (save.gold < TEA.price) return;
        save.gold -= TEA.price; forgetTree();
        gamakoSay('Voilà… tout est oublié. Reconstruis ton chemin avec sagesse.');
      } else {
        var price = itemPrice(id);
        if (save.gold < price || owns(id)) return;
        save.gold -= price; save.owned.push(id);
        save.shop = save.shop.filter(function (x) { return x !== id; });
        gamakoSay('Bon choix. ' + ITEMS[id].name + ', ça te va à ravir.');
      }
      setPlayer(save); persist(); Sfx.play('pickup'); buildHero(); renderAll();
      return;
    }
    if (t.id === 'reroll') {
      var rr = rerollState(save);
      if (rr.left && save.gold >= rr.price) { save.gold -= rr.price; refreshShop(save); save.shopDay = dayKey(); save.rerolls = rr.n + 1; persist(); gamakoSay(rr.left > 1 ? 'Un nouvel arrivage, tout frais de la vase ! Le prochain te coûtera le double.' : 'C’est mon dernier arrivage de la journée, têtard. Reviens demain.'); renderAll(); }
      return;
    }
    if (t.dataset.skinTry) { state.tryOn = t.dataset.skinTry; Sfx.play('click'); renderSkins(); return; }
    if (t.dataset.skinView) { state.skinView = t.dataset.skinView; Sfx.play('click'); renderSkins(); return; }
    if (t.dataset.skinWear) { if (ownsSkin(t.dataset.skinWear) && !playerHermit) { wearSkin(t.dataset.skinWear); Sfx.play('pickup'); renderSkins(); } return; }
    if (t.dataset.skinBuy) { // seulement un skin du jour
      var sid = t.dataset.skinBuy, sk = PREMIUM_SKINS[sid];
      if (sk && !playerHermit && !ownsSkin(sid) && skinsOfDay().indexOf(sid) >= 0 && save.gold >= sk.price) {
        save.gold -= sk.price; save.skins.push(sid); Sfx.play('levelup'); wearSkin(sid); renderSkins();
        notice(sk.name + ' est à toi ! Tu le portes déjà : il se voit partout, en combat comme au classement.');
      }
      return;
    }
    if (t.id === 'sell-btn') {
      var sid2 = state.selected;
      save.gold += sellPrice(sid2);
      save.owned = save.owned.filter(function (x) { return x !== sid2; });
      state.selected = null;
      persist(); Sfx.play('pickup'); renderAll();
      return;
    }
    if (t.id === 'equip-btn') {
      var it = ITEMS[state.selected];
      if (it.slot === 'arme' && !weaponAllowed(save, it)) return;
      save.equip[it.slot] = save.equip[it.slot] === state.selected ? null : state.selected;
      setPlayer(save); persist(); buildHero();
      if (it.slot === 'arme') state.view = 'attaque'; else if (state.view === 'attaque') state.view = 'face';
      renderAll();
    }
  });

  // ---------- Sauvegarde : export, import, nouvelle partie ----------
  $('save-modal').addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (e.target === $('save-modal') || (t && t.id === 'save-close')) { $('save-modal').hidden = true; return; }
    if (!t) return;
    if (t.id === 'save-export') {
      var blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'kawazu-' + (heroName().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'partie') + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      $('save-msg').textContent = 'Fichier de sauvegarde téléchargé.';
    }
    if (t.id === 'logout') { // la dernière sauvegarde part d'abord, puis on ferme la session
      Cloud.flush().then(function () { return fetch('/api/deconnexion', { method: 'POST', credentials: 'same-origin' }); }).then(function () { location.href = '/'; }, function () { location.href = '/'; });
      return;
    }
    if (t.id === 'save-reset') $('reset-confirm').hidden = false;
    if (t.id === 'reset-no') $('reset-confirm').hidden = true;
    if (t.id === 'reset-yes') {
      try { localStorage.removeItem('kawazu.save'); } catch (err) { /* ignoré */ }
      save = newSave(); setPlayer(save);
      $('save-modal').hidden = true;
      visible = true;
      showTitle();
    }
  });
  $('save-import').addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!data || !data.equip) throw new Error('format');
        save = parseSave(data); setPlayer(save); persist();
        buildHero(); renderAll();
        $('save-msg').textContent = 'Sauvegarde importée : ' + heroName() + ', niveau ' + save.level + '.';
      } catch (err) {
        $('save-msg').textContent = 'Ce fichier n’est pas une sauvegarde de Kawazu.';
      }
    };
    reader.readAsText(file);
    this.value = '';
  });

  // Boutons son et sauvegarde
  function renderMute() {
    var m = Sfx.isMuted(), b = $('mute');
    b.setAttribute('aria-pressed', m ? 'true' : 'false');
    b.setAttribute('aria-label', m ? 'Remettre le son' : 'Couper le son');
    b.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 8h3l4-3v10l-4-3H3z" fill="currentColor" stroke="none"/>' +
      (m ? '<path d="M13 7l5 6M18 7l-5 6"/>' : '<path d="M13 7.5a3.5 3.5 0 0 1 0 5M15.5 5a7 7 0 0 1 0 10"/>') + '</svg>';
  }
  $('open-save').innerHTML = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 3h11l3 3v11H3z M6 4v4h7V4z M6 11v5h8v-5z" fill-rule="evenodd"/></svg>';
  var KEYS_SVG = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M1 5h18v11H1z M3 7v2h2V7z M6 7v2h2V7z M9 7v2h2V7z M12 7v2h2V7z M15 7v2h2V7z M3 10v2h2v-2z M6 10v2h8v-2z M15 10v2h2v-2z M5 13v1h10v-1z"/></svg>';
  $('open-keys').innerHTML = KEYS_SVG;
  $('bt-keys').innerHTML = KEYS_SVG;
  window.addEventListener('keydown', function (e) {
    if (!visible || !$('title').hidden) return;
    if ((e.key === 'm' || e.key === 'M') && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) { Sfx.toggle(); renderMute(); }
    if (e.code === 'Escape') { $('save-modal').hidden = true; $('news-modal').hidden = true; closeKeys(); }
  });

  // ---------- Touches du clavier : disposition QWERTY / AZERTY, ou une touche par action à la main ----------
  var keyWait = null; // l'action qui attend sa nouvelle touche
  var KEYS_HELP = 'Les chiffres 1 à 5 marchent toujours aussi. M coupe le son.';
  function renderKeys() {
    $('keys-presets').innerHTML = Object.keys(KEY_PRESETS).map(function (id) {
      var on = Keys.layout() === id;
      return '<button data-keys-preset="' + id + '"' + (on ? ' class="is-on"' : '') + ' aria-pressed="' + on + '">' + KEY_PRESETS[id].name + '</button>';
    }).join('') + (Keys.layout() === 'perso' ? '<button class="is-on" disabled>Perso</button>' : '');
    $('keys-list').innerHTML = KEY_ACTIONS.map(function (a) {
      var w = keyWait === a.id;
      return '<div class="keys-row"><span>' + a.name + '</span><button data-keys-bind="' + a.id + '"' + (w ? ' class="waiting"' : '') + '>' + (w ? 'Appuie sur une touche…' : Keys.label(a.id)) + '</button></div>';
    }).join('');
    window.dispatchEvent(new Event('kawazu-keys'));
  }
  function openKeys() { keyWait = null; $('keys-msg').textContent = KEYS_HELP; renderKeys(); $('keys-modal').hidden = false; }
  function closeKeys() { keyWait = null; $('keys-modal').hidden = true; }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (t && (t.id === 'open-keys' || t.id === 'bt-keys')) { Sfx.play('click'); openKeys(); }
  });
  $('keys-modal').addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (e.target === $('keys-modal') || (t && t.id === 'keys-close')) { closeKeys(); return; }
    if (!t) return;
    if (t.dataset.keysPreset) { Keys.usePreset(t.dataset.keysPreset); keyWait = null; $('keys-msg').textContent = KEYS_HELP; Sfx.play('click'); renderKeys(); return; }
    if (t.dataset.keysBind) { keyWait = keyWait === t.dataset.keysBind ? null : t.dataset.keysBind; Sfx.play('click'); renderKeys(); }
  });
  // la nouvelle touche, attrapée avant tout le reste (Échap annule)
  window.addEventListener('keydown', function (e) {
    if (!keyWait || $('keys-modal').hidden) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.key === 'Escape') { keyWait = null; renderKeys(); return; }
    var k = Keys.norm(e), was = keyWait;
    if (!k || ['shift', 'control', 'alt', 'meta', 'altgraph', 'capslock'].indexOf(k) >= 0) return; // une vraie touche, pas un modificateur
    if (KEYS_RESERVED.indexOf(k) >= 0) { $('keys-msg').textContent = '« ' + Keys.keyLabel(k) + ' » sert déjà au jeu : choisis-en une autre.'; return; }
    var other = KEY_ACTIONS.filter(function (a) { return a.id !== was && Keys.key(a.id) === k; })[0];
    Keys.set(was, k);
    keyWait = null;
    $('keys-msg').textContent = other ? '« ' + Keys.keyLabel(k) + ' » était prise par « ' + other.name + ' » : les deux ont échangé leurs touches.' : 'C’est noté.';
    Sfx.play('click');
    renderKeys();
  }, true);

  // ---------- Démarrage : la grenouille du compte (en ligne) ou la partie locale ----------
  function bootOnline() {
    $('save-intro').textContent = 'Ta grenouille est sauvegardée sur le serveur, dans ton compte : tu la retrouves depuis n’importe quel appareil. Tu peux aussi l’exporter dans un fichier.';
    $('save-local').hidden = true;
    $('save-online').hidden = false;
    Cloud.load().then(function (frog) {
      if (frog.save) save = parseSave(frog.save);
      else { save = newSave(); save.hero = { name: frog.nom, skin: frog.peau }; refreshShop(save); save.notice = welcome(frog.nom); } // grenouille toute neuve
      setPlayer(save); persist(); enterGame();
      loadDojo(); // les cadeaux du lundi, s'il y en a
      loadTitan(); // le Titan de la semaine (ses cadeaux, et s'il reste des attaques aujourd'hui)
      refreshClan(); // les bonus du clan à jour
    }, function (e) { location.href = e.message === 'connexion' ? '/?connexion' : '/?grenouilles'; });
  }

  renderMute();
  if (Cloud.id) bootOnline(); else showTitle();
})();
