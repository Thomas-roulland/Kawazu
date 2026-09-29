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

  function enterGame() {
    $('title').hidden = true;
    $('app').hidden = false;
    if (!dailyShop(save)) tidyShop(save);
    persist();
    state.sheet = null;
    buildHero();
    renderAll();
    showPage('camp');
    startTick();
    if (save.notice) { notice(save.notice); delete save.notice; persist(); }
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
    var s = Math.max(1, Math.ceil(Math.max((W + 40) / CampScene.W, (H + 24) / CampScene.H)));
    var cx = CampScene.HERO.x + 16, cy = CampScene.HERO.y + 20;
    base.x = Math.round(Math.min(20, Math.max(W - 20 - CampScene.W * s, W * 0.44 - cx * s)));
    base.y = Math.round(Math.min(12, Math.max(H - 12 - CampScene.H * s, H * 0.56 - cy * s)));
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
  window.addEventListener('resize', function () { layoutScene(); if (state.page === 'skills') renderTree(); if (state.page === 'map') renderWorldMap(); if (state.page === 'tower') renderTower(); });
  $('page-camp').addEventListener('mousemove', function (e) {
    var r = this.getBoundingClientRect();
    parallax.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    parallax.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  $('page-camp').addEventListener('mouseleave', function () { parallax.tx = 0; parallax.ty = 0; });

  function drawCamp(now) {
    if (!sceneStatic) campBiome();
    var t = now / 1000, set = HERO_IMG.face;
    CampScene.draw(layers, sceneStatic, t, set[Math.floor(now / 500) % set.length], null, save.meditation ? HERO_IMG.zen : null);
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
    if (!attacking) { var set = HERO_IMG[state.view]; pctx.drawImage(set[Math.floor(now / 500) % set.length], heroX, top); return; }
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
    var s = Math.max(Wp / ShopScene.W, Hp / ShopScene.H);
    var ox = Math.round((Wp - ShopScene.W * s) / 2), oy = Math.round(Hp - ShopScene.H * s);
    shopEl.style.width = ShopScene.W * s + 'px';
    shopEl.style.height = ShopScene.H * s + 'px';
    shopEl.style.transform = 'translate(' + ox + 'px,' + oy + 'px)';
    var sx = function (x) { return ox + x * s; }, sy = function (y) { return oy + y * s; };
    shopGeo = { s: s, sx: sx, sy: sy, W: Wp, H: Hp };
    var wares = $('stock'), left = Math.max(16, sx(34)), right = Math.min(Wp - 16, sx(222));
    wares.style.left = left + 'px';
    wares.style.width = (right - left) + 'px';
    wares.style.top = (sy(ShopScene.COUNTER + 2) - 116) + 'px';
    var bubble = $('gamako-says');
    bubble.style.right = (Wp - sx(ShopScene.GX + 6)) + 'px';
    bubble.style.top = Math.max(sy(ShopScene.GY + 4), 150) + 'px';
    placeShopCard();
  }
  // La fiche de l'objet se pose en bas, sur les planches du comptoir, sous l'objet choisi
  function placeShopCard() {
    var card = $('shop-card'), ware = document.querySelector('.ware2.is-selected');
    if (card.hidden || !ware || !shopGeo) return;
    var page = $('page-shop').getBoundingClientRect(), wr = ware.getBoundingClientRect(), tag = ware.querySelector('.ware2-tag').getBoundingClientRect();
    var cw = card.offsetWidth, ch = card.offsetHeight, mid = wr.left - page.left + wr.width / 2;
    var left = Math.max(16, Math.min(shopGeo.W - cw - 16, mid - cw / 2));
    var top = Math.max(tag.bottom - page.top + 16, shopGeo.H - ch - 14);
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
    if (now - lastSecond > 500) { lastSecond = now; renderExpedition(); if (state.page === 'camp' && save.meditation) renderMeditation(); }
    raf = requestAnimationFrame(tick);
  }
  function startTick() { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); Sfx.ambient(state.page === 'camp'); }

  // ---------- Menu latéral ----------
  function renderSidebar() {
    var need = xpForLevel(save.level);
    $('sb-name').textContent = heroName();
    $('sb-level').textContent = save.level;
    $('sb-xp').style.width = Math.min(100, save.xp / need * 100) + '%';
    $('sb-gold').textContent = save.gold;
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
    var loot = rollLoot(save, e.w + 1, e.item);
    if (loot) save.owned.push(loot);
    save.gold += e.gold;
    var levels = gainXp(save, e.xp);
    save.expedition = null;
    persist();
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
    persist();
    if (g.xp || g.gold) {
      Sfx.play(g.levels ? 'levelup' : 'pickup');
      notice((why || 'Méditation') + ' : ' + hmm(g.ms) + ' sur le nénuphar, +' + g.xp + ' XP et +' + g.gold + ' lucioles' + (g.levels ? '. Niveau ' + save.level + ' !' : '.'), true);
    }
    renderAll();
  }

  function renderAdventure() {
    renderMeditation();
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
      el.innerHTML = it ? '<img src="' + iconUrls[id] + '" alt=""><span class="dname">' + it.name + '</span>' : '<span class="dlabel">' + sl.name.toUpperCase() + '</span>';
    });
  }

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
    // le conseil : l'attribut principal et la Vitalité d'abord ; un bouton pour répartir à sa place
    var guide = 'Mets tes points surtout en <b>' + STAT_NAME[main] + '</b> (ton attribut principal : il fait tes dégâts' + (v ? ', ×2' : '') + ') et en <b>Vitalité</b> (tes PV' + (v ? ', ×1,5' : '') + '). ' +
      (main === 'force' ? 'L’Agilité et l’Esprit sont des bonus.' : 'La Force ne donne presque rien pour toi' + (main === 'esprit' ? ' ; l’Agilité est un bonus.' : ' ; l’Esprit est un bonus.'));
    $('stat-guide').innerHTML = '<span class="sg-ico">★</span><span>' + guide + '</span>' + (save.points > 0 ? '<button class="btn sg-auto" data-auto-points>Répartir pour moi</button>' : '');
    // les cartes : l'attribut principal d'abord, puis la Vitalité, puis le reste
    var order = [main, 'vitalite'].concat(STATS.map(function (s) { return s.id; }).filter(function (k) { return k !== main && k !== 'vitalite'; }));
    $('stats').innerHTML = order.map(function (k) { return STATS.filter(function (s) { return s.id === k; })[0]; }).map(function (st) {
      var p = parts[st.id], seg = function (val, cls) { return val > 0 ? '<span class="' + cls + '" style="width:' + Math.min(100, val / scale * 100) + '%"></span>' : ''; };
      var bits = ['<span>Base <b>' + p.base + '</b></span>', '<span>Points <b>' + p.pts + (p.mult !== 1 ? ' ×' + n1(p.mult) + ' = ' + p.fromPts : '') + '</b></span>'];
      if (p.tree) bits.push('<span class="tree">Temple <b>+' + p.tree + '</b></span>');
      if (p.gear) bits.push('<span class="' + (p.gear < 0 ? 'st-down' : 'gear') + '">Objets <b>' + fmt(p.gear) + '</b></span>');
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
    var row = function (ico, name, val, how) { rows.push('<li><img src="' + ico + '" alt=""><span class="cs-name">' + name + '<small>' + how + '</small></span><b>' + val + '</b></li>'); };
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
    $('combat-stats').innerHTML = '<h2>EN COMBAT</h2><ul class="cs-list">' + rows.join('') + '</ul>' +
      (others.length ? '<p class="cs-pas"><b>Passifs :</b> ' + others.map(function (k) { return PASSIVE_TEXT[k](pas[k]); }).join(' · ') + '.</p>' : '');
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

  // Hauts faits et passifs : l'encart n'apparaît que s'il y a quelque chose à montrer
  var medalUrls = {};
  function renderFeats() {
    var feats = FEATS.filter(function (f) { return save.ach && save.ach.indexOf(f.id) >= 0; });
    var passives = save.tree.map(nodeById).filter(function (n) { return n && n.passive; });
    var box = $('feats');
    box.hidden = !feats.length && !passives.length;
    if (box.hidden) return;
    var chip = function (img, name, desc, style, cls) {
      return '<div class="feat' + (cls || '') + '"' + (style ? ' style="' + style + '"' : '') + ' title="' + desc + '"><img src="' + img + '" alt=""><span><b>' + name + '</b><small>' + desc + '</small></span></div>';
    };
    var html = '';
    if (feats.length) {
      html += '<div class="feats-head"><h2>HAUTS FAITS</h2><span class="muted">' + feats.length + ' / ' + FEATS.length + '</span></div><div class="feats">' +
        feats.map(function (f) { if (!medalUrls[f.id]) medalUrls[f.id] = medalCanvas(f).toDataURL(); return chip(medalUrls[f.id], f.name, f.desc); }).join('') + '</div>';
    }
    if (passives.length) {
      html += '<div class="feats-head"><h2>PASSIFS ACTIFS</h2></div><div class="feats">' +
        passives.map(function (n) { return chip(n.summit ? armeIcon(n.voie) : branchIcon(n.voie, n.path), n.name, n.desc, '--voie:' + voieOf(n.voie).color, ' passive'); }).join('') + '</div>';
    }
    box.innerHTML = html;
  }
  // Annonce les hauts faits tout juste obtenus
  function checkFeats() {
    if (!save.hero) return;
    var had = Array.isArray(save.ach), fresh = claimFeats(save);
    if (!had || fresh.length) persist();
    if (!fresh.length) return;
    Sfx.play('heart');
    notice('Haut fait débloqué : ' + fresh.map(function (f) { return f.name; }).join(', ') + ' !', true);
  }

  function matchesFilter(it) {
    if (state.filter === 'tout') return true;
    if (state.filter === 'baton' || state.filter === 'kunai') return it.kind === state.filter;
    return it.slot === state.filter;
  }
  function renderInventory() {
    var worn = function (id) { return save.equip[ITEMS[id].slot] === id ? 1 : 0; };
    var v = chosenVoie(save), fb = document.querySelector('#filters [data-filter="baton"]'), fk = document.querySelector('#filters [data-filter="kunai"]');
    fb.hidden = v === 'kunai' || v === 'ermite'; fk.hidden = v === 'baton' || v === 'ermite';
    fb.textContent = save.arme && v === 'baton' ? WEAPON_TYPES[save.arme].plural : 'Corps à corps';
    fk.textContent = save.arme && v === 'kunai' ? WEAPON_TYPES[save.arme].plural : 'Distance';
    if ((state.filter === 'baton' && fb.hidden) || (state.filter === 'kunai' && fk.hidden)) state.filter = 'tout';
    var ids = save.owned.filter(function (id) { return ITEMS[id] && itemAvailable(save, id) && matchesFilter(ITEMS[id]); });
    ids.sort(function (a, b) { return worn(b) - worn(a) || RARITY_IDS.indexOf(rarityOf(b)) - RARITY_IDS.indexOf(rarityOf(a)) || tierOf(b) - tierOf(a) || ITEMS[a].name.localeCompare(ITEMS[b].name); });
    $('inventory').innerHTML = ids.length ? ids.map(function (id) {
      var it = ITEMS[id], equipped = worn(id);
      return '<button class="item rar-' + rarityOf(id) + (equipped ? ' is-equipped' : '') + (state.selected === id ? ' is-selected' : '') + '" style="' + rarStyle(id) + '" data-item="' + id + '" title="' + it.name + ' (' + RARITIES[rarityOf(id)].name + ')">' +
        '<img src="' + iconUrls[id] + '" alt=""><span>' + it.name + '</span>' + (equipped ? '<b>ÉQUIPÉ</b>' : '') + '</button>';
    }).join('') : '<p class="muted inv-empty">Rien ici pour l’instant. Le butin tombe en combat et en mission, et l’Aïeule Gamako vend aussi des trésors. L’Album montre tout ce qui reste à découvrir.</p>';
    Array.prototype.forEach.call(document.querySelectorAll('#filters button'), function (b) { b.classList.toggle('is-active', b.dataset.filter === state.filter); });
  }

  function renderDetails() {
    var id = state.selected, it = ITEMS[id];
    if (!it) { $('details').innerHTML = '<p class="muted">Choisis un objet pour voir ses effets. Les objets « ??? » se gagnent en combat, en mission ou à la boutique.</p>'; return; }
    var slotName = SLOTS.filter(function (s) { return s.id === it.slot; })[0].name + (it.kind ? ' · ' + weaponLabel(it) : '');
    if (!owns(id)) {
      var where = BIOMES[Math.min(BIOMES.length, ITEM_TIER[id] || 1) - 1];
      $('details').innerHTML = '<div class="det-head"><img src="' + lockedUrls[id] + '" alt=""><div><h3>Objet inconnu</h3><span class="muted">' + slotName + '</span></div></div>' +
        '<p class="muted">Pas encore trouvé. Peut tomber à partir de : <b>' + where.name + '</b>, ou apparaître chez l’Aïeule Gamako.</p>';
      return;
    }
    var equipped = save.equip[it.slot] === id;
    var now = computeStats(save.equip), tryEquip = Object.assign({}, save.equip);
    tryEquip[it.slot] = equipped ? null : id;
    var after = computeStats(tryEquip);
    var diffs = equipped && it.slot === 'arme' ? '' : STATS.map(function (st) {
      var d = after[st.id] - now[st.id];
      return d ? '<li><span>' + st.name + '</span><span class="' + (d > 0 ? 'st-up' : 'st-down') + '">' + fmt(d) + '</span></li>' : '';
    }).join('');
    $('details').innerHTML = '<div class="det-head rar-frame" style="' + rarStyle(id) + '"><img src="' + iconUrls[id] + '" alt=""><div><h3>' + it.name + '</h3><span class="muted">' + slotName + '</span>' + rarTag(id) + '</div></div>' +
      '<p class="det-stats">' + statLine(it.stats) + '</p><p>' + it.desc + '</p>' +
      (it.kind ? '<p class="st-up">Attaque de base : <b>' + baseSkill(it).name + '</b> — ' + baseSkill(it).desc + '</p>' : '') +
      (diffs ? '<ul class="diff">' + diffs + '</ul>' : '') +
      '<div class="modal-actions">' +
      (it.slot === 'arme' && playerHermit ? '<p class="muted">Mode Ermite : pas d’arme, on se bat à mains nues. Quitte le mode Ermite pour reprendre une arme.</p>'
        : equipped && it.slot === 'arme' ? '<p class="muted">Arme en main : équipe-en une autre pour la changer.</p>'
        : it.slot === 'arme' && !weaponAllowed(save, it) ? '<p class="muted">Réservée à la ' + voieDef(it.kind).name + ' : la ' + voieDef(chosenVoie(save)).name + ' se bat ' + (chosenVoie(save) === 'kunai' ? 'à distance' : 'au corps à corps') + '.</p>'
        : '<button id="equip-btn" class="btn' + (equipped ? ' btn-ghost' : '') + '">' + (equipped ? 'Retirer' : 'Équiper') + '</button>') +
      (equipped ? '' : '<button id="sell-btn" class="btn btn-ghost">Vendre (' + sellPrice(id) + ' lucioles)</button>') + '</div>';
  }

  // « katana (corps à corps) », « shuriken (distance) »
  function weaponLabel(it) { return WEAPON_TYPES[weaponType(it)].name.toLowerCase() + ' (' + (it.kind === 'kunai' ? 'distance' : 'corps à corps') + ')'; }

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
    var wide = W > 1000;
    var rect = { l: 160, r: wide ? W - 400 : W - 30, t: 262, b: wide ? H - 18 : Math.round(H * 0.6) };
    // la dalle-sommet tout en haut (rect.t), puis les 10 rangées des branches
    var first = rect.b - 74, top = rect.t + Math.max(64, (first - rect.t) * 0.14), rowH = (first - top) / (STEPS - 1);
    var s = H >= 960 ? 4 : (rowH >= 50 ? 3 : 2);
    var colX = function (i, n) { return rect.l + (rect.r - rect.l) * (i + 0.5) / n; };
    return {
      W: W, H: H, s: s, rect: rect, first: first, rowH: rowH, colX: colX,
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

  function renderTree() {
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
        html += '<div class="tpath" style="left:' + (L.colX(i, BRANCHES) - (SLAB_R + 6) * L.s) + 'px;top:' + L.rowY(STEPS) + 'px;--voie:' + col + '" title="' + p.name + ' : ' + p.tag + '"><img src="' + branchIcon(voie, i) + '" alt=""><span><b>' + p.name.toUpperCase() + '</b><small>' + done + ' / ' + STEPS + ' dalles</small></span></div>';
      });
      html += '<div class="tsummit" style="left:' + smp.x + 'px;top:' + (smp.y - (SUMMIT_R + 3) * L.s) + 'px;--voie:' + col + '"><b>SOMMET · ' + sm.name.toUpperCase() + '</b><small>' + skillById(sm.skill).name + ' et un grand passif</small></div>';
      // à gauche de chaque rangée : le niveau requis et le prix de l'étape
      for (var st = 1; st <= STEPS; st++) {
        html += '<span class="ttier' + (save.level >= STEP_LEVEL[st] ? ' reached' : '') + '" style="left:' + (L.rect.l - 150) + 'px;top:' + L.rowY(st) + 'px">NIV. ' + STEP_LEVEL[st] + ' · ' + st + ' PT' + (st > 1 ? 'S' : '') + '</span>';
      }
      html += '<span class="ttier' + (save.level >= SUMMIT.level ? ' reached' : '') + '" style="left:' + (L.rect.l - 150) + 'px;top:' + L.rect.t + 'px">NIV. ' + SUMMIT.level + ' · ' + SUMMIT.cost + ' PTS</span>';
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

  // ---------- Carte du monde ----------
  // Étire le cadrage de la carte au format de l'écran (en restant dans la carte)
  function fitView(v, aspect) {
    var w = v.w, h = v.h;
    if (w / h < aspect) w = h * aspect; else h = w / aspect;
    if (w > WorldMap.W) { w = WorldMap.W; h = w / aspect; }
    if (h > WorldMap.H) { h = WorldMap.H; w = h * aspect; }
    w = Math.round(w); h = Math.round(h);
    var cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    return { w: w, h: h, x: Math.round(Math.max(0, Math.min(WorldMap.W - w, cx - w / 2))), y: Math.round(Math.max(0, Math.min(WorldMap.H - h, cy - h / 2))) };
  }
  function renderWorldMap() {
    var unlocked = BIOMES.map(function (_, i) { return i; }).filter(function (i) { return worldUnlocked(save, i); });
    var m = WorldMap.render(unlocked), c = $('worldmap-canvas');
    var v = fitView(m.view, $('page-map').clientWidth / Math.max(1, $('page-map').clientHeight));
    c.width = v.w; c.height = v.h;
    var ctx = c.getContext('2d');
    ctx.drawImage(m.canvas, v.x, v.y, v.w, v.h, 0, 0, v.w, v.h);
    WorldMap.drawCompass(ctx, 18, 18);
    var at = function (x, y) { return 'left:' + ((x - v.x) / v.w * 100) + '%;top:' + ((y - v.y) / v.h * 100) + '%'; };
    var cur = currentWorld(), html = '';
    unlocked.forEach(function (i) {
      var tr = WorldMap.TRAILS[i], prog = save.progress[i], stages = worldStages(i), b = BIOMES[i];
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
      html += '<div class="region fogged" style="' + at(m.peekAt.x, m.peekAt.y) + '"><b>Terre inconnue</b><small>BATS LE BOSS DE ' + BIOMES[m.peek - 1].name.toUpperCase() + '</small></div>';
    }
    html += '<img id="wm-frog" class="wm-frog" src="' + $('sb-portrait').toDataURL() + '" alt="Ta grenouille">';
    $('worldmap-regions').innerHTML = html;
    placeMapFrog(at, cur);
    renderStageSheet();
  }

  // La grenouille se tient sur la dernière étape réussie. Si elle a avancé depuis la dernière visite
  // de la carte, elle saute d'étape en étape le long du sentier jusqu'à sa nouvelle place.
  var mapFrog = null, frogRaf = 0;
  function placeMapFrog(at, cur) {
    var frog = $('wm-frog'), prog = save.progress[cur], T = WorldMap.TRAILS;
    var target = { w: cur, d: T[cur].stageDist[Math.min(prog, STAGES)] };
    var put = function (p, hop) { frog.setAttribute('style', at(p.x, p.y) + ';transform:translateY(' + (-hop).toFixed(1) + 'px)'); };
    cancelAnimationFrame(frogRaf);
    var from = mapFrog;
    mapFrog = target;
    if (!from || (from.w === target.w && from.d >= target.d) || from.w > target.w) { put(T[cur].at(target.d), 0); return; }
    // trajet : la fin du sentier précédent si on a changé de région, puis le nouveau sentier
    var legs = from.w === target.w ? [{ w: cur, a: from.d, b: target.d }] : [{ w: from.w, a: from.d, b: T[from.w].total }, { w: cur, a: 0, b: target.d }];
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

  // ---------- Une étape : le panneau qui s'ouvre sur la carte ----------
  // Un clic sur une étape de la carte ouvre ce panneau : combattre tout de suite, ou partir en mission.
  function openStage(w, st) {
    state.sheet = { w: w, st: st };
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
    var tab = state.shopTab || 'etal';
    Array.prototype.forEach.call(document.querySelectorAll('[data-shop-tab]'), function (b) { b.setAttribute('aria-selected', b.dataset.shopTab === tab); });
    var rr = rerollState(save), rb = $('reroll');
    rb.hidden = tab !== 'etal';
    rb.textContent = rr.left ? 'Nouvel arrivage · ' + rr.price + ' lucioles (' + rr.left + ' / ' + SHOP_REROLL_MAX + ')' : 'Plus d’arrivage aujourd’hui';
    rb.title = 'L’étal se renouvelle tout seul chaque jour. Tu peux le relancer ' + SHOP_REROLL_MAX + ' fois par jour, et chaque relance coûte le double de la précédente.';
    rb.disabled = !rr.left || save.gold < rr.price;
    $('wardrobe').hidden = tab !== 'peaux'; $('stock').hidden = tab === 'peaux';
    if (tab === 'peaux') return renderWardrobe();
    var items = save.shop.filter(function (id) { return id === TEA_ID || (!owns(id) && itemAvailable(save, id)); });
    if (items.indexOf(state.ware) < 0) state.ware = items[0] || null;
    $('stock').innerHTML = items.length ? items.map(function (id) {
      var tea = id === TEA_ID, price = tea ? TEA.price : itemPrice(id);
      return '<button class="ware2' + (tea ? '' : ' rar-' + rarityOf(id)) + (state.ware === id ? ' is-selected' : '') + (save.gold < price ? ' is-poor' : '') + '"' + (tea ? '' : ' style="' + rarStyle(id) + '"') + ' data-ware="' + id + '">' +
        '<span class="ware2-icon"><img src="' + (tea ? ICON.the : iconUrls[id]) + '" alt=""></span>' +
        '<span class="ware2-tag"><b>' + (tea ? TEA.name : ITEMS[id].name) + '</b><span class="price">' + price + ' lucioles</span></span></button>';
    }).join('') : '<p class="empty-stock">L’étal est vide. Paie un nouvel arrivage pour voir d’autres trésors.</p>';
    renderShopCard();
    layoutShop();
  }

  // ---------- La garde-robe : les peaux (celles du départ, gratuites, et celles de Gamako, chères) ----------
  var skinFaces = {};
  function skinFace(id) { // la grenouille de face, dans cette peau (sans ce qu'elle porte)
    if (!skinFaces[id]) {
      var saved = [heroSkin, playerHermit];
      heroSkin = skinOf(id); playerHermit = false;
      skinFaces[id] = frogFrames(DEFAULT_EQUIP).face[0].toDataURL();
      heroSkin = saved[0]; playerHermit = saved[1];
    }
    return skinFaces[id];
  }
  function ownsSkin(id) { return !!SKINS[id] || save.skins.indexOf(id) >= 0; }
  function renderWardrobe() {
    var ids = Object.keys(PREMIUM_SKINS).concat(Object.keys(SKINS));
    if (!state.skin || ids.indexOf(state.skin) < 0) state.skin = Object.keys(PREMIUM_SKINS)[0];
    var tile = function (id) {
      var sk = skinOf(id), mine = ownsSkin(id), worn = save.hero.skin === id;
      return '<button class="wr-skin' + (PREMIUM_SKINS[id] ? ' premium' : '') + (state.skin === id ? ' is-selected' : '') + (worn ? ' is-worn' : '') + (!mine && save.gold < sk.price ? ' is-poor' : '') + '" data-skin-pick="' + id + '" title="' + sk.name + '">' +
        '<img class="px" src="' + skinFace(id) + '" alt=""><b>' + sk.name + '</b><small>' + (worn ? 'portée' : (mine ? 'à toi' : sk.price + ' lucioles')) + '</small></button>';
    };
    $('shop-card').hidden = true;
    var id = state.skin, sk = skinOf(id), mine = ownsSkin(id), worn = save.hero.skin === id;
    $('wardrobe').innerHTML = '<div class="wr-main"><h2>LA GARDE-ROBE DE GAMAKO</h2><div class="wr-grid">' + Object.keys(PREMIUM_SKINS).map(tile).join('') + '</div>' +
      '<h3>COULEURS DE DÉPART · GRATUITES</h3><div class="wr-base">' + Object.keys(SKINS).map(tile).join('') + '</div></div><div class="wr-detail">' + '<div class="sc-id"><img class="px" src="' + skinFace(id) + '" alt=""><div><h3>' + sk.name + '</h3><span class="sc-kind">' + (PREMIUM_SKINS[id] ? 'Peau de la garde-robe' : 'Peau de départ') + '</span></div></div>' +
      '<div class="sc-body"><p>' + (sk.desc || 'Une des couleurs du marais, gratuite.') + '</p><span class="sc-cur">' + (playerHermit ? 'En mode Ermite, la peau reste orange : elle se verra si tu quittes la voie de l’Ermite.' : 'Elle se voit partout : au camp, en combat, au classement et à la cascade.') + '</span></div>' +
      (worn ? '<div class="sc-buy"><span class="sc-cur">Tu la portes.</span></div>'
        : mine ? '<div class="sc-buy"><button class="btn" data-skin-wear="' + id + '">Porter</button></div>'
        : '<div class="sc-buy"><button class="btn" data-skin-buy="' + id + '"' + (save.gold < sk.price ? ' disabled' : '') + '>Acheter<br><span>' + sk.price + ' lucioles</span></button>' + (save.gold < sk.price ? '<span class="sc-miss">Il te manque ' + (sk.price - save.gold) + ' lucioles.</span>' : '') + '</div>') + '</div>';
    layoutShop();
  }
  function wearSkin(id) {
    save.hero.skin = id; setPlayer(save); persist(); buildHero(); renderAll();
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
    return '<div class="sc-buy"><button class="btn" data-buy="' + id + '"' + (ok && miss <= 0 ? '' : ' disabled') + '>Acheter<br><span>' + price + ' lucioles</span></button>' +
      (miss > 0 ? '<span class="sc-miss">Il te manque ' + miss + ' lucioles.</span>' : '') + '</div>';
  }

  // ---------- Classement ----------
  // Une liste simple et sobre : les 50 premières grenouilles, puis la suite à la demande. Cinq façons
  // de trier (aventure, niveau, succès, tour, duels), un filtre par voie, et un clic sur une ligne déplie sa fiche.
  var rank = { data: null, joueurs: 0, duels: null, loading: false, error: '', sort: 'aventure', voie: 'toutes', sel: null, limit: 50 };
  var RANK_PAGE = 50;
  var TOTAL_STAGES = BIOMES.length * STAGES;
  var RANK_SORTS = {
    aventure: { name: 'Aventure', cmp: function (a, b) { return b.conquis - a.conquis || b.niveau - a.niveau || b.xp - a.xp; },
      metric: function (e) { return e.conquis >= TOTAL_STAGES ? 'Sommet conquis !' : (BIOMES[e.monde] || BIOMES[0]).name + ' · ' + e.etape + '/' + STAGES; } },
    niveau: { name: 'Niveau', cmp: function (a, b) { return b.niveau - a.niveau || b.xp - a.xp || b.conquis - a.conquis; },
      metric: function (e) { return 'Niveau ' + e.niveau; } },
    succes: { name: 'Succès', cmp: function (a, b) { return b.succes - a.succes || b.niveau - a.niveau; },
      metric: function (e) { return e.succes + ' succès'; } },
    tour: { name: 'Tour', cmp: function (a, b) { return (b.tour || 0) - (a.tour || 0) || b.niveau - a.niveau; },
      metric: function (e) { return 'Étage ' + (e.tour || 0) + ' / ' + TOWER_FLOORS; } },
    reputation: { name: 'Duels', cmp: function (a, b) { return (b.rep || 0) - (a.rep || 0) || b.niveau - a.niveau; },
      metric: function (e) { return (e.rep || 0) + ' réputation'; } }
  };
  var RANK_VOIES = [{ id: 'toutes', short: 'Toutes' }].concat(VOIES, [{ id: 'aucune', short: 'Sans voie' }]);
  var portraitCache = {};
  // La grenouille d'un autre joueur, avec sa peau et son équipement (et le mode Ermite)
  function portraitOf(e) {
    var equip = Object.assign({}, DEFAULT_EQUIP);
    Object.keys(e.equip || {}).forEach(function (slot) { var id = baseOf(e.equip[slot]), it = ITEMS[id]; if (it && it.slot === slot) equip[slot] = id; }); // l'apparence ne dépend que du modèle
    var hermit = e.voie === 'ermite', key = e.peau + '|' + hermit + '|' + JSON.stringify(equip);
    if (!portraitCache[key]) {
      var saved = [heroSkin, playerHermit];
      heroSkin = skinOf(e.peau); playerHermit = hermit;
      portraitCache[key] = gridToCanvas(buildKawazuAnims(dressKawazu(sp, lookFor(equip))).idle.frames[0], paletteFor(sp.PAL, equip)).toDataURL();
      heroSkin = saved[0]; playerHermit = saved[1];
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
      rank.data = d.grenouilles; rank.joueurs = d.joueurs; rank.duels = d.duels; rank.loading = false;
      renderRank();
    }, function () { rank.loading = false; rank.error = 'Le classement n’a pas pu être chargé. Réessaie dans un instant.'; renderRank(); });
  }
  function rankedList() {
    var list = (rank.data || []).filter(function (e) { return rank.voie === 'toutes' || (rank.voie === 'aucune' ? !e.voie : e.voie === rank.voie); });
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
    var all = rank.data || [], ranked = rankedList(), mine = ranked.map(function (e) { return e.id; }).indexOf(Cloud.id), gifts = rank.sort === 'reputation' && rank.duels;
    $('rank-sub').textContent = all.length + ' grenouille' + (all.length > 1 ? 's' : '') + ' · ' + rank.joueurs + ' joueur' + (rank.joueurs > 1 ? 's' : '') +
      (mine >= 0 ? ' — la tienne est ' + (mine === 0 ? '1re' : (mine + 1) + 'e') + ' en ' + S.name.toLowerCase() : '');
    if (gifts) { note.hidden = false; note.innerHTML = 'Chaque lundi à minuit, les dix premières des duels reçoivent un cadeau — prochain dans <b>' + untilMs(rank.duels.prochain) + '</b>.'; }
    list.innerHTML = ranked.slice(0, rank.limit).map(function (e, i) {
      var gift = gifts && i < rank.duels.recompenses.length ? rank.duels.recompenses[i] : null;
      return '<li class="rk-row' + (i < 3 ? ' top' + (i + 1) : '') + (e.moi ? ' is-me' : '') + (e.id === Cloud.id ? ' is-current' : '') + (rank.sel === e.id ? ' is-open' : '') + '">' +
        '<button class="rk-line" data-rank-frog="' + e.id + '" aria-expanded="' + (rank.sel === e.id) + '">' +
        '<span class="rk-pos">' + (i + 1) + '</span><img class="px" src="' + portraitOf(e) + '" alt="">' +
        '<span class="rk-name"><b>' + escapeHtml(e.nom) + (e.id === Cloud.id ? ' <i>TOI</i>' : '') + '</b><small>' + escapeHtml(e.pseudo) + ' · niv. ' + e.niveau + '</small></span>' +
        voieChip(e) + '<span class="rk-metric">' + S.metric(e) + '</span>' + (gifts ? '<span class="rk-gift">' + (gift ? giftText(gift) : '') + '</span>' : '') + '</button>' +
        (rank.sel === e.id ? rankDetail(e) : '') + '</li>';
    }).join('') || '<li class="rk-msg"><span>Aucune grenouille ici pour l’instant.</span></li>';
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
  function giftText(g) { return g ? g.lucioles + ' lucioles' + (g.objet && ITEMS[g.objet] ? ' + ' + ITEMS[g.objet].name : '') : ''; }
  // Les cadeaux du lundi : ajoutés à la partie une seule fois, puis confirmés au serveur
  function applyGifts(list) {
    var fresh = (list || []).filter(function (g) { return save.gifts.indexOf(g.id) < 0; });
    fresh.forEach(function (g) {
      save.gold += g.lucioles || 0;
      if (g.objet && ITEMS[g.objet]) { if (!owns(g.objet)) save.owned.push(g.objet); else save.gold += 150; }
      var xp = g.xpNiveau ? Math.round(xpForLevel(save.level) * g.xpNiveau) : 0, lv = xp ? gainXp(save, xp) : 0;
      save.gifts.push(g.id);
      if (g.source === 'clan') notice('L’Alpha n° ' + (g.rang + 1) + ' de ton clan « ' + g.clan + ' » est tombé ! Ta part : ' + g.lucioles + ' lucioles' + (xp ? ' et ' + xp + ' XP' : '') + (lv ? '. Niveau ' + save.level + ' !' : '.'), true);
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
    if (HERO_IMG) { shadow(CZ.meX, 46); x2.drawImage(HERO_IMG.profil[f], CZ.meX * K - 64, feet - 128, 128, 128); }
    if (dojo.tab === 'arbre') { shadow(CZ.foeX, 64); x2.drawImage(TREE_IMGS[Math.floor(now / 700) % 2], CZ.foeX * K - 96, feet - 192, 192, 192); return; }
    var foe = currentFoe();
    if (foe) {
      var fg = dojoFighter(foe), sz = Math.round(128 * fg.size / 32) * 32 || 128;
      shadow(CZ.foeX, 46 * fg.size);
      x2.drawImage(fg.imgs.idle[f], CZ.foeX * K - sz / 2, feet - sz, sz, sz);
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
      var xp = win ? Math.max(5, Math.round(xpForLevel(save.level) * 0.1)) : 0, levels = xp ? gainXp(save, xp) : 0;
      if (xp) persist();
      if (levels) Sfx.play('levelup');
      return '<p class="bt-rep ' + (r.delta >= 0 ? 'up' : 'down') + '">' + (r.delta >= 0 ? '+' : '−') + Math.abs(r.delta) + ' réputation <span>(' + r.rep + ' en tout)</span></p>' +
        (xp ? '<p>+' + xp + ' XP' + (levels ? ' · <b>Niveau ' + save.level + ' !</b>' : '') + '</p>' : '<p>' + escapeHtml(card.nom) + ' garde sa place. Change d’équipement ou de sorts, et retente ta chance !</p>') +
        '<p class="muted">Duels restants aujourd’hui : ' + r.restants + '.</p>';
    });
  }

  // ---------- Les Clans : les guildes du marais ----------
  // Un clan réunit jusqu'à 10 grenouilles de joueurs. Ensemble, elles affrontent un Alpha aux PV partagés (deux assauts
  // de 10 tours par jour chacune) ; quand il tombe, chaque grenouille du clan qui l'a attaqué reçoit sa part, et un
  // Alpha plus fort arrive. Les joutes opposent une grenouille à celle d'un autre clan, pour la renommée. Le chef peut
  // exclure une grenouille. Tout passe par /api/clans/<grenouille>.
  var clans = { data: null, loading: false, error: '', foe: null, emb: 0, leaving: 0, kicking: null };
  var EMBLEMS = ['#c9412f', '#e0b43a', '#4e9a45', '#3a7fc9', '#8a4ab0', '#e07a2a', '#2aa090', '#d9e1e6'];
  var CLAN_PRICE = 300;
  var fmtN = function (n) { return Math.max(0, Math.round(n)).toLocaleString('fr-FR'); };
  var nth = function (n) { return n === 1 ? '1er' : n + 'e'; };
  var clanApi = function (method, path, body) {
    return fetch('/api/clans/' + Cloud.id + path, { method: method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.erreur || 'erreur du serveur'); return d; }); });
  };
  function emblem(m, big) { return '<span class="clan-emb' + (big ? ' big' : '') + '" style="--e:' + EMBLEMS[m.embleme || 0] + '">' + escapeHtml((m.nom || '?').charAt(0).toUpperCase()) + '</span>'; }
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
      if (d.exclu) notice('Ta grenouille a été exclue du clan « ' + d.exclu + ' » par son chef.', true);
      applyGifts(d.cadeaux);
      if (state.page === 'clans') renderClans();
    }, function (e) { clans.loading = false; clans.error = e.message; if (state.page === 'clans') renderClans(); });
  }
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
        '<span class="cl-name"><b>' + escapeHtml(m.nom) + '</b><small>Chef : ' + escapeHtml(m.chef || '?') + ' · Alpha n° ' + (m.rang + 1) + '</small></span>' +
        '<span class="cl-meta">' + m.renommee + '<small>renommée</small></span><span class="cl-meta">' + m.membres + ' / ' + d.max + '<small>grenouilles</small></span>' +
        (mineId === undefined ? '<button class="btn btn-ghost" data-clan-join="' + m.id + '"' + (m.membres >= d.max ? ' disabled' : '') + '>Rejoindre</button>' : '') + '</li>';
    }).join('') + '</ul>' : '<p class="muted">Aucun clan pour l’instant : fonde le premier !</p>';
  }
  function renderNoClan(d) {
    return '<header class="panel cl-head"><div><h1>CLANS</h1><p>Fonde ton clan ou rejoins-en un : ensemble, abattez des Alphas géants et affrontez les autres clans.</p></div></header>' +
      '<div class="cl-cols two">' +
      '<section class="panel cl-found"><h2>FONDER UN CLAN</h2><p>Jusqu’à ' + d.max + ' grenouilles par clan. Il en coûte ' + CLAN_PRICE + ' lucioles.</p>' +
      '<label class="cl-field"><span>Son nom</span><input id="clan-name" maxlength="24" placeholder="Le Clan des Roseaux" autocomplete="off"></label>' +
      '<span class="cl-label">Son emblème</span><div class="cl-embs" role="radiogroup" aria-label="Son emblème">' + EMBLEMS.map(function (c, i) { return '<button role="radio" aria-checked="' + (clans.emb === i) + '" aria-label="Couleur ' + (i + 1) + '" data-clan-emb="' + i + '" style="--e:' + c + '"></button>'; }).join('') + '</div>' +
      '<button class="btn" data-clan-found' + (save.gold < CLAN_PRICE ? ' disabled' : '') + '>Fonder le clan · ' + CLAN_PRICE + ' lucioles</button>' +
      (save.gold < CLAN_PRICE ? '<p class="muted">Il te manque ' + (CLAN_PRICE - save.gold) + ' lucioles.</p>' : '') + '</section>' +
      '<section class="panel cl-all"><h2>CLASSEMENT DES CLANS</h2>' + clanList(d, undefined, 30) + '</section></div>';
  }
  function clanEvent(j) {
    var n = '<b>' + escapeHtml(j.nom || '?') + '</b>';
    if (j.type === 'fonde') return n + ' a fondé le clan.';
    if (j.type === 'arrivee') return n + ' a rejoint le clan.';
    if (j.type === 'depart') return n + ' a quitté le clan.';
    if (j.type === 'exclusion') return n + ' a exclu <b>' + escapeHtml(j.cible || '?') + '</b> du clan.';
    if (j.type === 'raid') return n + ' a infligé <b>' + fmtN(j.deg) + '</b> dégâts à l’Alpha.';
    if (j.type === 'alpha') return 'L’Alpha n° ' + (j.rang + 1) + ' est tombé ! Coup final : ' + n + (j.parts ? ' · ' + j.parts + ' part' + (j.parts > 1 ? 's' : '') : '') + '.';
    if (j.type === 'joute') return n + (j.victoire ? ' a battu ' : ' a perdu contre ') + escapeHtml(j.adverse) + ' (' + escapeHtml(j.clanAdverse) + ') : +' + j.gain + ' renommée.';
    if (j.type === 'joute-subie') return j.victoire ? n + ' a repoussé ' + escapeHtml(j.adverse) + ' (' + escapeHtml(j.clanAdverse) + ').' : escapeHtml(j.adverse) + ' (' + escapeHtml(j.clanAdverse) + ') a battu ' + n + '.';
    return '';
  }
  function renderMyClan(d) {
    var m = d.clan, a = alphaOf(m.raid.rang, save.level), pct = Math.max(0, m.raid.pv / m.raid.pvMax * 100), foe = clans.foe;
    var chief = m.chef === Cloud.id, mine = m.membres.filter(function (e) { return e.id === Cloud.id; })[0] || { part: 0 };
    var members = m.membres.slice().sort(function (x, y) { return y.part - x.part || y.contribution - x.contribution; });
    return '<header class="panel cl-head">' + emblem(m, true) + '<div><h1>' + escapeHtml(m.nom).toUpperCase() + '</h1>' +
      '<p>Chef : <b>' + escapeHtml(m.chefNom || '?') + '</b> · ' + m.membres.length + ' / ' + d.max + ' grenouilles · <b>' + m.renommee + '</b> renommée' + (m.place ? ' · ' + nth(m.place) + ' des clans' : '') + '</p></div>' +
      '<button class="btn btn-ghost' + (clans.leaving ? ' is-armed' : '') + '" data-clan-leave>' + (clans.leaving ? 'Confirmer : quitter' : 'Quitter le clan') + '</button></header>' +
      '<div class="cl-cols">' +
      '<section class="panel cl-alpha"><h2>L’ALPHA N° ' + (m.raid.rang + 1) + '</h2>' +
      '<div class="cl-alpha-art"><img class="px" src="' + alphaImg(m.raid.rang) + '" alt=""></div>' +
      '<b class="cl-alpha-name">' + a.name + '</b><small class="muted">' + m.raid.vaincus + ' Alpha' + (m.raid.vaincus > 1 ? 's' : '') + ' abattu' + (m.raid.vaincus > 1 ? 's' : '') + ' par le clan</small>' +
      '<div class="cl-hp"><i style="width:' + pct + '%"></i><em>' + fmtN(m.raid.pv) + ' / ' + fmtN(m.raid.pvMax) + ' PV</em></div>' +
      '<p class="cl-help">Ses PV sont partagés par tout le clan. Chaque grenouille l’attaque ' + d.raidsMax + ' fois par jour, pendant ' + d.tours + ' tours. Quand il tombe : ' + (300 + 200 * m.raid.rang) + ' lucioles et de l’XP pour chaque grenouille qui l’a attaqué.</p>' +
      (mine.part ? '<p class="cl-part is-in">Ta part est assurée : ' + fmtN(mine.part) + ' dégâts sur cet Alpha.</p>' : '<p class="cl-part">Attaque cet Alpha au moins une fois pour avoir ta part quand il tombera.</p>') +
      '<button class="btn" data-clan-raid' + (d.raids > 0 ? '' : ' disabled') + '>' + (d.raids > 0 ? 'Attaquer l’Alpha ▶ · ' + d.raids + ' / ' + d.raidsMax : 'Reviens demain') + '</button></section>' +
      '<section class="panel cl-members"><h2>LE CLAN · ' + m.membres.length + ' / ' + d.max + '</h2><ul' + (chief ? ' class="can-kick"' : '') + '>' + members.map(function (e) {
        var kick = chief && e.id !== m.chef ? '<button class="cl-kick' + (clans.kicking === e.id ? ' is-armed' : '') + '" data-clan-kick="' + e.id + '" aria-label="Exclure ' + escapeHtml(e.nom) + '">' + (clans.kicking === e.id ? 'Exclure ?' : '✕') + '</button>' : (chief ? '<span></span>' : '');
        return '<li class="' + (e.id === Cloud.id ? 'is-me' : '') + '" title="' + fmtN(e.contribution) + ' dégâts sur les Alphas du clan"><img class="px" src="' + portraitOf(e) + '" alt=""><span class="cl-name"><b>' + escapeHtml(e.nom) + '</b><small>' + (e.id === m.chef ? '<i>CHEF</i> ' : '') + escapeHtml(e.pseudo || '') + ' · niv. ' + (e.niveau || 1) + '</small></span>' +
          dojoVoie(e) + '<span class="cl-meta' + (e.part ? '' : ' is-zero') + '">' + (e.part ? fmtN(e.part) : '—') + '<small>' + (e.part ? 'sur cet Alpha' : 'pas de part') + '</small></span>' + kick + '</li>';
      }).join('') + '</ul>' + (chief ? '<p class="cl-help">Tu es le chef : ✕ exclut une grenouille, qui ne pourra pas revenir avant 3 jours.</p>' : '') + '</section>' +
      '<div class="cl-side">' +
      '<section class="panel cl-joute"><h2>LES JOUTES · ' + d.joutes + ' / ' + d.joutesMax + '</h2><p class="cl-help">Défie une grenouille d’un autre clan : +6 renommée pour ton clan si tu gagnes, +1 sinon.</p>' +
      (foe ? '<div class="cl-foe"><img class="px" src="' + portraitOf(foe) + '" alt=""><span class="cl-name"><b>' + escapeHtml(foe.nom) + '</b><small>' + escapeHtml(foe.clan) + ' · niv. ' + foe.niveau + '</small></span>' + dojoVoie(foe) + '</div><button class="btn" data-clan-joute' + (d.joutes > 0 ? '' : ' disabled') + '>Jouter ▶</button>' : '') +
      '<button class="btn btn-ghost" data-clan-foe' + (d.joutes > 0 ? '' : ' disabled') + '>' + (d.joutes > 0 ? (foe ? 'Un autre adversaire' : 'Chercher un adversaire') : 'Plus de joute aujourd’hui') + '</button></section>' +
      '<section class="panel cl-rank"><h2>CLASSEMENT DES CLANS</h2>' + clanList(d, m.id, 8) + '</section>' +
      '<section class="panel cl-log"><h2>LE JOURNAL</h2><ul>' + (m.journal || []).slice(0, 10).map(function (j) { return '<li><span>' + clanEvent(j) + '</span><small>' + agoMs(j.t) + '</small></li>'; }).join('') + '</ul></section>' +
      '</div></div>';
  }
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
          return '<p class="bt-rep up">' + fmtN(res.degats) + ' dégâts à l’Alpha</p>' +
            (res.vaincu !== null ? '<p class="bt-unlock">L’Alpha n° ' + (res.vaincu + 1) + ' est tombé ! Chaque grenouille du clan qui l’a attaqué reçoit sa part, et un Alpha plus fort arrive.</p>'
              : '<p>Il lui reste ' + fmtN(res.pv) + ' PV sur ' + fmtN(res.pvMax) + '.</p>') +
            '<p class="muted">Assauts restants aujourd’hui : ' + res.restants + '.</p>';
        });
      }
    };
    return fight;
  }
  function jouteFight(card) {
    return {
      kind: 'joute', title: 'Joute contre ' + card.nom + ' (' + card.clan + ')', backdrop: CascadeScene.backdrop(), bgFx: CascadeScene.fx, card: card, enemy: dojoFighter(card),
      intro: card.nom + ', du clan « ' + card.clan + ' », accepte la joute !',
      settle: function (win) {
        return clanApi('POST', '/joute', { adversaire: card.id, victoire: win }).then(function (r) {
          if (clans.data) clans.data.joutes = r.restants;
          var xp = win ? Math.max(5, Math.round(xpForLevel(save.level) * 0.1)) : 0, levels = xp ? gainXp(save, xp) : 0;
          if (xp) persist();
          if (levels) Sfx.play('levelup');
          return '<p class="bt-rep ' + (win ? 'up' : 'down') + '">+' + r.gain + ' renommée pour ton clan</p>' + (xp ? '<p>+' + xp + ' XP' + (levels ? ' · <b>Niveau ' + save.level + ' !</b>' : '') + '</p>' : '') +
            '<p class="muted">Joutes restantes aujourd’hui : ' + r.restants + '.</p>';
        });
      }
    };
  }
  function clanAction(p) { // une action, puis on recharge le clan
    return p.then(function () { loadClans(); }, function (e) { notice(e.message); });
  }

  // ---------- La Tour des Cent Sages ----------
  // La tour se dresse au milieu du mont Kaeru : un étage par sage, la grenouille sur le prochain à conquérir,
  // les étages du dessus perdus dans la brume. À droite, la fiche de l'étage choisi : le sage, sa force comparée
  // à la nôtre, ses sorts, et ce que rapporte la première victoire.
  var tower = { sel: null, view: 0 };
  function towerNext() { return Math.min(TOWER_FLOORS, save.tower + 1); }
  function towerFight(f) {
    var card = towerCard(f), en = Object.assign({}, dojoFighter(card), { rank: 'sage' });
    if (card.boss) { en.maxHp = Math.round(en.maxHp * 1.15); en.dmg *= 1.1; }
    return {
      kind: 'tour', floor: f, card: card, enemy: en, title: 'Tour des Cent Sages · étage ' + f, backdrop: TowerScene.arena(f), bgFx: TowerScene.arenaFx,
      intro: card.boss ? 'Étage ' + f + ' : le Grand Sage ' + card.nom + ', ' + card.titre + ', t’attend (niv. ' + card.niveau + ') !' : 'Étage ' + f + ' : ' + card.nom + ' (niv. ' + card.niveau + ') t’attend pour son épreuve.',
      settle: function (win) { return Promise.resolve(settleTower(f, card, win)); },
      next: f < TOWER_FLOORS ? function () { return towerFight(f + 1); } : null,
      again: function () { return towerFight(f); }
    };
  }
  // La victoire sur un étage : la première fois, ses récompenses (et le trésor d'un Grand Sage)
  function settleTower(f, card, win) {
    if (!win) return '<p>' + escapeHtml(card.nom) + ' reste debout. Monte de niveau, change d’équipement ou de sorts, et reviens !</p>';
    if (f <= save.tower) return '<p>Épreuve réussie à nouveau. L’étage était déjà conquis : pas de nouvelle récompense.</p>';
    var r = towerRewards(f), levels;
    save.tower = f;
    save.gold += r.gold;
    levels = gainXp(save, r.xp);
    var swap = r.item && !itemAvailable(save, r.item) ? itemPrice(r.item) : 0; // pas ton arme : sa valeur en lucioles
    if (swap) save.gold += swap; else if (r.item && !owns(r.item)) save.owned.push(r.item);
    if (card.boss) albumKill(save, 's-' + f);
    persist();
    Sfx.play(levels ? 'levelup' : 'pickup');
    tower.sel = Math.min(TOWER_FLOORS, f + 1);
    return '<p>Étage ' + f + ' conquis ! +' + r.gold + ' lucioles · +' + r.xp + ' XP' + (levels ? ' · <b>Niveau ' + save.level + ' !</b>' : '') + '</p>' +
      (r.item ? '<p class="bt-loot" style="' + rarStyle(r.item) + '"><img src="' + iconUrls[r.item] + '" alt=""> Trésor du Grand Sage : <b>' + ITEMS[r.item].name + '</b>' + (swap ? ' — ce n’est pas ton arme : les Sages te donnent <b>' + swap + ' lucioles</b> à la place.' : '') + '</p>' : '') +
      (f === TOWER_FLOORS ? '<p class="bt-unlock">Tu as conquis le sommet de la tour. Le Premier Sage s’incline devant toi.</p>' : '');
  }
  function openTower() {
    if (!tower.sel) tower.sel = towerNext();
    tower.view = Math.max(1, towerNext() - 2);
    renderTower();
  }
  // La tour dessinée (tower.js), et par-dessus un bouton par étage : son numéro, son sage devant la porte, le trésor
  // des Grands Sages, et ta grenouille sur le balcon de l'étage à conquérir. La molette fait monter et descendre.
  function renderTower() {
    var page = $('page-tower'), pw = page.clientWidth, ph = page.clientHeight, wide = pw > 1000, side = wide ? 400 : 0;
    var S = ph < 620 ? 2 : 3, next = towerNext();
    tower.view = Math.max(1, Math.min(tower.view || 1, Math.min(TOWER_FLOORS, next + 3) - 1));
    var lay = TowerPage.render($('tower-bg'), { w: pw, h: wide ? ph : Math.round(ph * 0.58), s: S, cx: (pw - side) / 2 / S, view: tower.view, next: next, sky: TowerScene.skyOf(next) });
    var me = $('sb-portrait').toDataURL(), html = '';
    lay.floors.forEach(function (fl) {
      var f = fl.f, st = f <= save.tower ? 'done' : (f === next ? 'next' : 'locked'), boss = f % 10 === 0;
      var card = st !== 'locked' ? towerCard(f) : null, prize = boss ? towerTreasure(f) : null, dx = (fl.door.x - fl.x) * S;
      html += '<button class="tfl ' + st + (boss ? ' boss' : '') + (tower.sel === f ? ' is-selected' : '') + '" data-floor="' + f + '" aria-label="Étage ' + f + '" style="left:' + fl.x * S + 'px;top:' + fl.y * S + 'px;width:' + fl.w * S + 'px;height:' + fl.h * S + 'px">' +
        '<span class="tfl-num">' + f + '</span>' +
        (card ? '<img class="px tfl-sage" src="' + portraitOf(card) + '" alt="" style="left:' + (dx - 12 * S) + 'px;top:' + 8 * S + 'px;width:' + 24 * S + 'px;height:' + 24 * S + 'px">' : '<span class="tfl-q" style="left:' + (dx - 6 * S) + 'px;top:' + 16 * S + 'px;width:' + 12 * S + 'px">?</span>') +
        (prize ? '<img class="px tfl-prize" src="' + iconUrls[prize] + '" alt="" title="' + ITEMS[prize].name + '">' : '') +
        (f === next && save.tower < TOWER_FLOORS ? '<span class="tfl-here">TU ES ICI</span>' : '') + '</button>';
    });
    $('tower-col').innerHTML = html;
    renderTowerSheet();
  }
  $('page-tower').addEventListener('wheel', function (e) {
    if (e.target.closest('#tower-side')) return;
    e.preventDefault();
    var v = tower.view + (e.deltaY < 0 ? 1 : -1);
    if (v !== tower.view) { tower.view = v; renderTower(); }
  }, { passive: false });
  function renderTowerSheet() {
    var f = tower.sel, next = towerNext(), card = towerCard(f), boss = f % 10 === 0, r = towerRewards(f), me = myFight();
    var fighter = f <= next ? dojoFighter(card) : null, hp = fighter ? Math.round(fighter.maxHp * (boss ? 1.15 : 1)) : 0, dmg = fighter ? fighter.dmg * (boss ? 1.1 : 1) : 0;
    var cmp = function (a, b) { return a > b * 1.08 ? 'down' : (a < b * 0.92 ? 'up' : ''); }; // plus fort que nous : rouge
    var nextBoss = Math.min(TOWER_FLOORS, Math.ceil((save.tower + 1) / 10) * 10);
    var html = '<div class="tw-progress"><b>' + save.tower + '</b><span>étages conquis sur ' + TOWER_FLOORS + '</span></div>';
    if (f > next) {
      html += '<div class="tw-sheet locked"><h2>ÉTAGE ' + f + '</h2><p class="muted">Cet étage est encore dans la brume : conquiers d’abord l’étage ' + next + '.</p></div>';
    } else {
      html += '<div class="tw-sheet' + (boss ? ' boss' : '') + '"><span class="tw-floor">' + (boss ? 'GRAND SAGE · ' : '') + 'ÉTAGE ' + f + '</span>' +
        '<div class="tw-sage"><img class="px" src="' + portraitOf(card) + '" alt=""><div><h3>' + escapeHtml(card.nom) + '</h3>' + (card.titre ? '<span class="muted">' + card.titre + '</span>' : '') +
        '<span class="muted">Niveau ' + card.niveau + '</span>' + dojoVoie(card) + '</div></div>' +
        '<ul class="foe-stats"><li><span>PV</span><b class="' + cmp(hp, me.maxHp) + '">' + hp + '</b></li><li><span>Dégâts</span><b class="' + cmp(dmg, me.dmg) + '">' + Math.round(dmg) + '</b></li><li><span>Agilité</span><b class="' + cmp(fighter.agi, me.agi) + '">' + fighter.agi + '</b></li></ul>' +
        (fighter.skills.length > 1 ? '<p class="tw-spells">Sorts : ' + fighter.skills.slice(1).map(function (s) { return '<i>' + s.name + '</i>'; }).join('') + '</p>' : '') +
        '<div class="tw-reward"><h2>' + (f <= save.tower ? 'DÉJÀ CONQUIS' : 'RÉCOMPENSE') + '</h2>' + (f <= save.tower ? '<p class="muted">Tu peux rejouer l’épreuve, sans récompense.</p>' :
          '<p><span class="luciole"></span> ' + r.gold + ' lucioles · ' + r.xp + ' XP</p>' + (r.item ? '<p class="tw-prize" style="' + rarStyle(r.item) + '"><img class="px" src="' + iconUrls[r.item] + '" alt=""><b>' + ITEMS[r.item].name + '</b><small>' + (itemAvailable(save, r.item) ? statLine(ITEMS[r.item].stats) : 'Pas ton arme : ' + itemPrice(r.item) + ' lucioles à la place') + '</small></p>' : '')) + '</div>' +
        '<button class="btn" data-tower-fight="' + f + '">' + (f <= save.tower ? 'Rejouer l’épreuve' : (boss ? 'Défier le Grand Sage ▶' : 'Affronter ▶')) + '</button></div>';
    }
    // tout ce que la tour a déjà rapporté : lucioles, XP et les trésors des Grands Sages
    var won = { gold: 0, xp: 0 };
    for (var wf = 1; wf <= save.tower; wf++) { var wr = towerRewards(wf); won.gold += wr.gold; won.xp += wr.xp; }
    var trs = Object.keys(GRAND_SAGES).map(function (k) { var fl = +k, id = towerTreasure(fl), got = save.tower >= fl; return '<div class="tw-tr' + (got ? ' got' : '') + '" title="' + (got ? ITEMS[id].name : 'Étage ' + fl + ' : ' + GRAND_SAGES[fl].nom) + '"><img class="px" src="' + (got ? iconUrls[id] : lockedUrls[id]) + '" alt=""><small>' + fl + '</small></div>'; }).join('');
    html += '<div class="tw-won"><h2>RÉCOMPENSES OBTENUES</h2><p>' + won.gold + ' lucioles · ' + won.xp + ' XP · ' + Math.floor(save.tower / 10) + ' / 10 trésors</p><div class="tw-trs">' + trs + '</div></div>';
    if (save.tower < TOWER_FLOORS) {
      var tp = towerTreasure(nextBoss);
      html += '<p class="tw-hint">Prochain Grand Sage : étage <b>' + nextBoss + '</b>' + (tp ? ', qui garde <b style="color:' + RARITIES.epique.color + '">' + ITEMS[tp].name + '</b>' : '') + '.</p>';
    }
    $('tower-side').innerHTML = html;
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
  function renderAlbum() {
    var spreads = [null].concat(ALBUM_CHAPTERS), sp = album.spread = Math.max(0, Math.min(spreads.length - 1, album.spread)), ch = spreads[sp];
    var firstObj = 1 + ALBUM_CHAPTERS.map(function (c) { return c.cat; }).indexOf('objets'), ready = ALBUM_MILESTONES.some(function (m) { return milestoneReady(save, m); });
    $('book-tabs').innerHTML = [['Sommaire', 0, sp === 0, ICON.album], ['Bestiaire', 1, sp >= 1 && sp < firstObj, BOOKMARK_MONSTER], ['Objets', firstObj, sp >= firstObj, iconUrls.lame_jade]].map(function (t, i) {
      return '<button data-book-go="' + t[1] + '" aria-selected="' + t[2] + '" class="bmark bm-' + i + '" title="' + t[0] + '"><img class="px" src="' + t[3] + '" alt=""><span>' + t[0] + '</span>' + (i === 0 && ready ? '<i class="badge-dot"></i>' : '') + '</button>';
    }).join('');
    var left, right;
    if (!ch) {
      var bar = function (cat, label) {
        var total = cat === 'monstres' ? ALBUM_MONSTERS.length : albumPool(save).length, found = albumCount(save, cat);
        return '<div class="bk-prog"><span>' + label + ' <b>' + found + ' / ' + total + '</b></span><span class="al-bar"><i style="width:' + (found / total * 100) + '%"></i></span></div>';
      };
      var toc = function (cat) {
        return ALBUM_CHAPTERS.map(function (c, i) { return c.cat !== cat ? '' : '<button class="bk-toc" data-book-go="' + (i + 1) + '"><span>' + c.name + '</span><i></i><b>' + (chapterTotal(c) ? chapterFound(c) + ' / ' + chapterTotal(c) : '—') + '</b></button>'; }).join('');
      };
      left = '<h1 class="bk-title">ALBUM DU MARAIS</h1><p class="bk-intro">Chaque créature vaincue et chaque objet trouvé colle sa carte dans ce livre. Les cartes rares et épiques ont leur cadre bleu ou violet.</p>' +
        bar('monstres', 'Bestiaire') + bar('objets', 'Objets') +
        '<h2 class="bk-h">BESTIAIRE</h2><div class="bk-tocs">' + toc('monstres') + '</div><h2 class="bk-h">OBJETS</h2><div class="bk-tocs">' + toc('objets') + '</div>';
      right = '<h2 class="bk-h">RÉCOMPENSES</h2><p class="bk-intro">Remplis le livre pour gagner des lucioles, de l’expérience… et deux trésors.</p><div class="bk-miles">' +
        ALBUM_MILESTONES.map(function (m) {
          var done = albumOf(save).paliers.indexOf(m.id) >= 0, rdy = milestoneReady(save, m), have = albumCount(save, m.cat), n = milestoneTarget(save, m);
          return '<div class="bk-mile' + (done ? ' done' : (rdy ? ' ready' : '')) + '"><span class="bm-n">' + n + '</span><span class="bm-txt"><b>' + (m.cat === 'monstres' ? 'créatures' : 'objets') + '</b>' + m.gold + ' lucioles · ' + m.xp + ' XP' + (m.item ? ' · <em>' + ITEMS[m.item].name + '</em>' : '') + '</span>' +
            (done ? '<span class="bm-state">Reçu</span>' : (rdy ? '<button class="btn" data-claim="' + m.id + '">Réclamer</button>' : '<span class="bm-state">' + Math.min(have, n) + ' / ' + n + '</span>')) + '</div>';
        }).join('') + '</div>';
    } else {
      var found = chapterFound(ch), total = chapterTotal(ch), cards = ch.list.map(function (e) { return albumCard(ch, e); });
      left = '<div class="bk-chap"><span class="bk-kicker">' + (ch.cat === 'monstres' ? 'BESTIAIRE' : 'OBJETS') + '</span><h1 class="bk-title">' + ch.name.toUpperCase() + '</h1><p class="bk-intro">' + ch.desc + '</p>' +
        (total ? '<div class="bk-prog"><span>Cartes trouvées <b>' + found + ' / ' + total + '</b></span><span class="al-bar"><i style="width:' + (found / total * 100) + '%"></i></span></div>' : '<p class="bk-intro"><b>Ce ne sont pas tes armes :</b> elles ne comptent pas dans ta collection.</p>') + '</div>' +
        '<div class="bk-cards">' + cards.slice(0, 6).join('') + '</div>';
      right = '<div class="bk-cards">' + cards.slice(6).join('') + '</div>' + (cards.length <= 6 ? '<p class="bk-empty">La suite de ce chapitre reste à écrire…</p>' : '');
    }
    $('book-left').innerHTML = left;
    $('book-right').innerHTML = right;
    $('book-folio').textContent = sp === 0 ? 'Sommaire' : 'Chapitre ' + sp + ' / ' + ALBUM_CHAPTERS.length;
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
    if (e.key === 'ArrowRight') turnPage(Math.min(ALBUM_CHAPTERS.length, album.spread + 1));
    if (e.key === 'ArrowLeft') turnPage(Math.max(0, album.spread - 1));
  });

  // ---------- Rendu général ----------
  function renderAll() {
    albumSyncItems(save);
    $('badge-album').hidden = !ALBUM_MILESTONES.some(function (m) { return milestoneReady(save, m); });
    checkFeats();
    renderSidebar();
    renderAdventure();
    renderLevel();
    renderSlots();
    renderStats();
    renderInventory();
    renderDetails();
    renderFeats();
    Array.prototype.forEach.call(document.querySelectorAll('#views button'), function (b) { b.classList.toggle('is-active', b.dataset.view === state.view); });
    if (state.page === 'skills') renderTree();
    if (state.page === 'map') renderWorldMap();
    if (state.page === 'shop') renderShop();
    if (state.page === 'album') renderAlbum();
  }

  function showPage(page) {
    state.page = page;
    ['camp', 'perso', 'skills', 'map', 'shop', 'tower', 'dojo', 'clans', 'album', 'rank'].forEach(function (p) { $('page-' + p).hidden = p !== page; });
    renderSidebar();
    if (page === 'camp') { campBiome(); layoutScene(); }
    if (page === 'skills') renderTree();
    if (page === 'map') renderWorldMap();
    if (page === 'rank') openRank();
    if (page === 'dojo') openDojo();
    if (page === 'clans') openClans();
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
    // quitter un assaut : ses dégâts comptent quand même (sans coup porté, l'assaut n'est pas perdu) ; quitter une joute : une défaite
    if (fight.kind === 'raid' && result === 'flee' && !fight.settled && fight.stats.total > 0) fight.settle(false).then(function () { notice('Tu as quitté l’assaut : tes dégâts comptent quand même.'); loadClans(); }, function () {});
    if (fight.kind === 'joute' && result === 'flee' && !fight.settled) fight.settle(false).then(function () { notice('Tu as quitté la joute : elle compte comme une défaite.'); loadClans(); }, function () {});
    var atClan = fight.kind === 'raid' || fight.kind === 'joute';
    showPage(fight.kind === 'tour' ? 'tower' : (atDojo ? 'dojo' : (atClan ? 'clans' : 'map')));
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
    if (t.dataset.clanEmb) { clans.emb = +t.dataset.clanEmb; Sfx.play('click'); document.querySelectorAll('[data-clan-emb]').forEach(function (e) { e.setAttribute('aria-checked', String(e === t)); }); return; } // sans redessiner : le nom tapé reste
    if (t.hasAttribute('data-clans-reload')) { clans.error = ''; loadClans(); return; }
    if (t.hasAttribute('data-clan-found')) {
      var cname = ($('clan-name').value || '').trim();
      if (cname.length < 3) { notice('Le nom du clan doit faire au moins 3 caractères.'); return; }
      if (save.gold < CLAN_PRICE) return;
      Sfx.play('click');
      clanApi('POST', '/fonder', { nom: cname, embleme: clans.emb }).then(function () { save.gold -= CLAN_PRICE; persist(); renderSidebar(); Sfx.play('levelup'); notice('Le clan « ' + cname + ' » est fondé ! Invite tes amis à le rejoindre.'); loadClans(); }, function (err) { notice(err.message); });
      return;
    }
    if (t.dataset.clanJoin) { Sfx.play('click'); clanAction(clanApi('POST', '/rejoindre', { clan: t.dataset.clanJoin })); return; }
    if (t.hasAttribute('data-clan-leave')) {
      if (!clans.leaving) { clans.leaving = setTimeout(function () { clans.leaving = 0; renderClans(); }, 4000); renderClans(); return; }
      clearTimeout(clans.leaving); clans.leaving = 0; clans.foe = null;
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
    if (t.hasAttribute('data-clan-raid')) { if (clans.data && clans.data.raids > 0) { Sfx.play('click'); startFight(raidFight(clans.data)); } return; }
    if (t.hasAttribute('data-clan-foe')) {
      Sfx.play('click');
      Cloud.flush().then(function () { return clanApi('GET', '/joute'); }).then(function (r) { clans.foe = r.adversaire; if (!r.adversaire) notice('Aucune grenouille d’un autre clan à défier pour l’instant.'); renderClans(); }, function (err) { notice(err.message); });
      return;
    }
    if (t.hasAttribute('data-clan-joute')) { if (clans.foe) { var jf = jouteFight(clans.foe); clans.foe = null; startFight(jf); } return; }
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
    if (t.dataset.deck) { if (save.deck.length < DECK_SIZE) { save.deck.push(t.dataset.deck); persist(); renderDeck(); } return; }
    if (t.dataset.undeck) { save.deck = save.deck.filter(function (id) { return id !== t.dataset.undeck; }); persist(); renderDeck(); return; }
    if (t.dataset.item) { state.selected = t.dataset.item; renderAll(); return; }
    if (t.dataset.slot) { var sid = save.equip[t.dataset.slot]; if (sid) state.selected = sid; state.filter = t.dataset.slot; renderAll(); return; }
    if (t.dataset.filter) { state.filter = t.dataset.filter; renderInventory(); return; }
    if (t.dataset.view) { state.view = t.dataset.view; renderAll(); return; }
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
    if (t.dataset.shopTab) { state.shopTab = t.dataset.shopTab; if (state.shopTab === 'peaux') gamakoSay('Ma garde-robe… des peaux rares, cousues sous la lune. Elles ne sont pas données.'); renderShop(); return; }
    if (t.dataset.skinPick) { state.skin = t.dataset.skinPick; renderShop(); return; }
    if (t.dataset.skinWear) { if (ownsSkin(t.dataset.skinWear)) { wearSkin(t.dataset.skinWear); gamakoSay('Elle te va comme une seconde peau. Forcément.'); } return; }
    if (t.dataset.skinBuy) {
      var sid = t.dataset.skinBuy, sk = PREMIUM_SKINS[sid];
      if (sk && !ownsSkin(sid) && save.gold >= sk.price) { save.gold -= sk.price; save.skins.push(sid); Sfx.play('pickup'); wearSkin(sid); gamakoSay(sk.name + ' ! Fais-la briller, et n’en parle à personne.'); }
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
      persist(); buildHero();
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
  window.addEventListener('keydown', function (e) {
    if (!visible || !$('title').hidden) return;
    if (e.code === 'KeyM' && e.target.tagName !== 'INPUT') { Sfx.toggle(); renderMute(); }
    if (e.code === 'Escape') $('save-modal').hidden = true;
  });

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
    }, function (e) { location.href = e.message === 'connexion' ? '/?connexion' : '/?grenouilles'; });
  }

  renderMute();
  if (Cloud.id) bootOnline(); else showTitle();
})();
