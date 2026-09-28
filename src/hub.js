// Menu et pages du jeu : écran titre (création de la grenouille), Camp, Personnage (fiche façon Shakes & Fidget),
// Compétences (arbre + deck), Carte du monde, Monde (10 étapes : combat ou mission en temps réel) et Boutique.
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
    the: [['', '', '......k.k', '.......k.k', '...kkkkkkkkk', '..k111111111kk', '..k122222221k.k', '..k122222221k.k', '..k112222211kk', '...k1111111k', '....kkkkkkk', '..kkkkkkkkkkk'],
      { k: '#1a1c2c', 1: '#e8ecf0', 2: '#8fce52' }]
  };
  var ICON = {};
  Object.keys(ICONS16).forEach(function (k) { ICON[k] = stringsToCanvas(pad(ICONS16[k][0], 16), ICONS16[k][1]).toDataURL(); });
  Array.prototype.forEach.call(document.querySelectorAll('img[data-ico]'), function (img) { img.src = ICON[img.dataset.ico]; });
  var VOIE_ICON = { baton: iconUrls.baton_roseau, kunai: iconUrls.kunai_acier, ermite: ICON.paume };

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
      kunai: kunaiProjectileImgs(weaponOf(equip).blade).right
    };
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
    notice('Bienvenue, ' + name + ' ! Ouvre la Carte du monde pour commencer ta première aventure.');
  });

  function enterGame() {
    $('title').hidden = true;
    $('app').hidden = false;
    if (!save.shop.length) { refreshShop(save); persist(); }
    state.sheet = null;
    buildHero();
    renderAll();
    showPage('camp');
    startTick();
    if (save.notice) { notice(save.notice); delete save.notice; persist(); }
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
    CampScene.draw(layers, sceneStatic, t, set[Math.floor(now / 500) % set.length], null);
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
    if (isRanged(weaponOf(save.equip))) { if (step >= 2 && step < 8) pctx.drawImage(HERO_IMG.kunai, heroX + 22 + (step - 2) * 6, top + 14); }
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
    if (now - lastSecond > 500) { lastSecond = now; renderExpedition(); }
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
    $('sb-items').textContent = albumItemsFound(save) + ' / ' + ALBUM_ITEMS.length;
    var bp = $('badge-perso'), bs = $('badge-skills');
    bp.hidden = save.points <= 0; bp.textContent = save.points;
    bs.hidden = save.skillPoints <= 0; bs.textContent = save.skillPoints;
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

  function renderAdventure() {
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
      if (sl.id === 'arme' && playerHermit) {
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
  }

  // Icônes des caractéristiques (16×16) : cœur, patte palmée, impact, bulles
  var STAT_ICON = {};
  (function () {
    var G = {
      vitalite: [['', '...kkk...kkk', '..krrrk.krrrk', '.krwrrrkrrrrrk', '.krwrrrrrrrrrk', '.krrrrrrrrrrrk', '.krrrrrrrrrrdk', '..krrrrrrrrdk', '...krrrrrrdk', '....krrrrdk', '.....krrdk', '......kdk', '.......k'],
        { k: '#1a1c2c', r: '#e0584a', w: '#ffd0c8', d: '#a02a20' }],
      agilite: [['', '..k...k...k', '.klk.klk.klk', '.kgk.kgk.kgk', '..kgkkgkkgk', '..klggggggk', '...kgggggk', '....kgggk', '....kgggk', '.....kgk', '.....kgk', '.....kgk', '......k'],
        { k: '#1a1c2c', g: '#6fae3a', l: '#c8f08a' }],
      force: [['.......k', '......kyk', '.k....kyk....k', '.kyk..kyk..kyk', '..kyk.kyk.kyk', '...kykyyykyk', 'kkkkyywwwyykkkk', 'kyyyywwwwwyyyyk', 'kkkkyywwwyykkkk', '...kykyyykyk', '..kyk.kyk.kyk', '.kyk..kyk..kyk', '.k....kyk....k', '......kyk', '.......k'],
        { k: '#1a1c2c', y: '#f0c040', w: '#fff6c0' }],
      souffle: [['..........kkk', '.........kbbbk', '.........kbwbk', '.........kbbbk', '...kkk....kkk', '..kbbbk', '.kbwbbbk', '.kbbbbbk...kk', '.kbbbbbk..kbwk', '..kbbbk...kbbk', '...kkk.....kk', '......kk', '.....kbwk', '.....kbbk', '......kk'],
        { k: '#1a1c2c', b: '#7fa0f0', w: '#eef4ff' }]
    };
    Object.keys(G).forEach(function (k) { STAT_ICON[k] = stringsToCanvas(pad(G[k][0], 16), G[k][1]).toDataURL(); });
  })();
  var STAT_TIP = {
    vitalite: 'Chaque point : +6 points de vie.',
    agilite: 'Chaque point : +0,8 % de critique, +0,6 % d’esquive, et tu joues plus tôt.',
    force: 'Chaque point : +1,1 dégât à chaque coup.',
    souffle: 'Une bulle de souffle tous les 4 points ; +1 bulle récupérée par tour à partir de 14.'
  };
  var STAT_FX = {
    vitalite: function (cs, pas) { return '<b>' + Math.round(cs.maxHp * (1 + pas.hpMult)) + '</b> points de vie'; },
    agilite: function (cs, pas) { return '<b>' + Math.round((cs.crit + pas.crit) * 100) + ' %</b> critique · <b>' + Math.round(cs.dodge * 100) + ' %</b> esquive'; },
    force: function (cs) { return '<b>' + Math.round(cs.dmg) + '</b> dégâts par coup'; },
    souffle: function (cs, pas) { return '<b>' + cs.maxSouffle + '</b> bulles · <b>+' + (cs.regen + pas.regen) + '</b> par tour'; }
  };

  function renderStats() {
    var s = computeStats(save.equip), cs = combatStats(s), tb = treeBonuses(save), pas = tb.passives, tree = tb.stats;
    var scale = Math.max(STAT_MAX, Math.ceil(Math.max.apply(null, STATS.map(function (st) { return s[st.id]; })) / 10) * 10 + 10);
    $('stats').innerHTML = STATS.map(function (st) {
      var b = BASE_STATS[st.id], a = save.alloc[st.id] + (tree[st.id] || 0), total = s[st.id], gear = total - b - a;
      var ownW = Math.min(b + a, total) / scale * 100, gearW = Math.min(Math.abs(gear), Math.max(0, scale - b - a)) / scale * 100;
      return '<div class="scard" data-card="' + st.id + '" style="--c:' + st.color + '" title="Base ' + b + ' · niveaux et arbre ' + fmt(a) + ' · équipement ' + fmt(gear) + '. ' + STAT_TIP[st.id] + '">' +
        '<span class="scard-ico"><img src="' + STAT_ICON[st.id] + '" alt=""></span>' +
        '<span class="scard-name">' + st.name.toUpperCase() + '</span>' +
        '<span class="scard-val">' + total + (gear ? '<em class="' + (gear < 0 ? 'st-down' : 'st-up') + '">' + fmt(gear) + '</em>' : '') + '</span>' +
        '<button class="scard-plus" data-stat="' + st.id + '"' + (save.points > 0 ? '' : ' hidden') + ' aria-label="Ajouter un point en ' + st.name + '">+</button>' +
        '<span class="scard-bar"><span class="own" style="width:' + ownW + '%"></span><span class="' + (gear < 0 ? 'malus' : 'gear') + '" style="width:' + gearW + '%"></span></span>' +
        '<span class="scard-fx">' + STAT_FX[st.id](cs, pas) + '</span></div>';
    }).join('');
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
    var passives = save.tree.map(nodeById).filter(function (n) { return n && n.type === 'passive'; });
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
        passives.map(function (n) { return chip(VOIE_ICON[n.voie], nodeName(n), nodeDesc(n), '--voie:' + voieOf(n.voie).color, ' passive'); }).join('') + '</div>';
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
    var ids = save.owned.filter(function (id) { return ITEMS[id] && matchesFilter(ITEMS[id]); });
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
    var slotName = SLOTS.filter(function (s) { return s.id === it.slot; })[0].name + (it.kind ? ' · ' + (it.kind === 'kunai' ? 'kunaï' : 'bâton') : '');
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
      (it.kind ? '<p class="st-up">Attaque de base : ' + SKILLS.filter(function (s) { return s.base === it.kind; })[0].name + '.</p>' : '') +
      (diffs ? '<ul class="diff">' + diffs + '</ul>' : '') +
      '<div class="modal-actions">' +
      (it.slot === 'arme' && playerHermit ? '<p class="muted">Mode Ermite : pas d’arme, on se bat à mains nues. Quitte le mode Ermite pour reprendre une arme.</p>'
        : equipped && it.slot === 'arme' ? '<p class="muted">Arme en main : équipe-en une autre pour la changer.</p>'
        : '<button id="equip-btn" class="btn' + (equipped ? ' btn-ghost' : '') + '">' + (equipped ? 'Retirer' : 'Équiper') + '</button>') +
      (equipped ? '' : '<button id="sell-btn" class="btn btn-ghost">Vendre (' + sellPrice(id) + ' lucioles)</button>') + '</div>';
  }

  // ---------- Compétences : le Temple des voies ----------
  // Un temple en pixel art, plein écran. Tant qu'aucune voie n'est choisie, trois grandes flaques attendent au bout
  // de trois cours d'eau, une par voie : la grenouille plonge dans celle qu'elle choisit, et ressort dans le bassin,
  // dont l'eau a pris la couleur de sa voie. De là montent cinq cours d'eau : les 5 petits chemins de la voie,
  // chacun fait de 10 dalles. La grenouille avance de dalle en dalle, et l'eau du chemin appris prend la couleur de la voie.
  var TEMPLE_BIOME = BIOMES.filter(function (b) { return b.id === 'temple'; })[0];
  var WATER = { base: '#235a6a', deep: '#1a4452', light: '#3f8a98', dry: '#2c302b', baton: '#5fbf7a', kunai: '#7fc4f0', ermite: '#f0c24a' };
  var SLAB_R = 8; // demi-largeur d'une dalle, en pixels du décor
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
    var wide = W > 1000, s = H >= 960 ? 4 : 3;
    var rect = { l: 160, r: wide ? W - 400 : W - 30, t: 262, b: wide ? H - 18 : Math.round(H * 0.6) };
    var first = rect.b - 74, rowH = (first - rect.t) / (STEPS - 1);
    var colX = function (i, n) { return rect.l + (rect.r - rect.l) * (i + 0.5) / n; };
    return {
      W: W, H: H, s: s, rect: rect, first: first, rowH: rowH, colX: colX,
      rowY: function (step) { return first - (step - 1) * rowH; },
      pos: function (n) { return { x: colX(n.path, 5), y: first - (n.step - 1) * rowH }; },
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
    // les dalles de la voie choisie
    TREE.forEach(function (n) {
      if (n.voie !== voie) return;
      var p = sc(L.pos(n)), known = hasNode(save, n.id), can = canLearnNode(save, n);
      drawSlab(ctx, R(p.x), R(p.y), n.type, known ? 'known' : (can ? 'can' : 'locked'), voieOf(n.voie).color, SLAB_R);
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
      var p = temple.L.pos(n);
      tfx.strokeRect(R(p.x / s) - SLAB_R - 3.5, R(p.y / s) - SLAB_R - 3.5, SLAB_R * 2 + 7, SLAB_R * 2 + 7);
    });
  }

  function renderTree() {
    var pts = $('skill-points');
    pts.textContent = save.skillPoints > 0 ? save.skillPoints + (save.skillPoints > 1 ? ' points de compétence' : ' point de compétence') : 'Aucun point : monte de niveau';
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
      // en haut de chaque chemin, son nom et l'avancée
      PATHS[voie].forEach(function (p, i) {
        var done = save.tree.filter(function (id) { var n = nodeById(id); return n.path === i; }).length;
        html += '<div class="tpath" style="left:' + L.colX(i, 5) + 'px;top:' + (L.rect.t - 58) + 'px;--voie:' + voieOf(voie).color + '"><b>' + p.name + '</b><small>' + done + ' / ' + STEPS + '</small></div>';
      });
      // à gauche de chaque rangée : le niveau requis et le prix de l'étape
      for (var st = 1; st <= STEPS; st++) {
        html += '<span class="ttier' + (save.level >= STEP_LEVEL[st] ? ' reached' : '') + '" style="left:' + (L.rect.l - 150) + 'px;top:' + L.rowY(st) + 'px">NIV. ' + STEP_LEVEL[st] + ' · ' + st + ' PT' + (st > 1 ? 'S' : '') + '</span>';
      }
      TREE.forEach(function (n) {
        if (n.voie !== voie) return;
        var p = L.pos(n), known = hasNode(save, n.id), can = canLearnNode(save, n);
        var icon = n.type === 'skill' ? VOIE_ICON[n.voie] : (n.type === 'passive' ? PASSIVE_ICON[n.voie] : STAT_ICON[Object.keys(n.stats)[0]]);
        var badge = n.type === 'stat' ? '<i class="tbadge">+' + n.stats[Object.keys(n.stats)[0]] + '</i>' : (n.type === 'skill' ? '<i class="tbadge spell">SORT</i>' : '');
        var cls = 'tslab ' + n.type + (known ? ' known' : (can ? ' can' : ' locked')) + (state.node === n.id ? ' is-selected' : '') + (n.id === save.tree[save.tree.length - 1] ? ' has-frog' : '');
        html += '<button class="' + cls + '" data-node="' + n.id + '" title="' + nodeName(n) + ' — ' + nodeDesc(n) + '" style="left:' + p.x + 'px;top:' + p.y + 'px;--voie:' + voieOf(n.voie).color + '" aria-label="' + nodeName(n) + '">' +
          '<img src="' + icon + '" alt="">' + badge + '</button>';
      });
    }
    html += '<img id="temple-frog" class="temple-frog" src="' + $('sb-portrait').toDataURL() + '" alt="Ta grenouille">';
    $('tree-nodes').innerHTML = html;
    $('tree-nodes').style.setProperty('--slab', ((SLAB_R * 2 + 3) * L.s) + 'px');
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
        setPlayer(save); persist(); buildHero(); renderAll();
        diving = false;
        var f2 = $('temple-frog');
        f2.classList.add('emerging');
        temple.splash = { x: temple.L.gate.x, y: temple.L.gate.y, t0: performance.now(), color: voieOf(voieId).color };
        Sfx.play('levelup');
        notice(voieId === 'ermite' ? 'La grenouille ressort de la flaque dorée : mode Ermite ! Peau orange, yeux de crapaud, plus d’arme, elle frappe à mains nues avec l’onde de paume.'
          : 'Tu as plongé dans la ' + voieOf(voieId).name + ' : cinq chemins s’ouvrent devant toi.');
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
      $('node-info').innerHTML = '<p class="muted">' + (chosenVoie(save) ? 'Clique sur une dalle pour voir ce qu’elle apporte. Ronds : caractéristiques · losanges : passifs · carrés : sorts. Chaque étape coûte plus cher que la précédente.' : 'Plonge dans l’une des trois flaques pour choisir ta voie : ce choix est définitif.') + '</p>';
      return;
    }
    var known = hasNode(save, n.id), block = learnBlock(save, n), v = voieOf(n.voie);
    var types = { stat: 'CARACTÉRISTIQUE', passive: 'PASSIF', skill: 'SORT' };
    var extra = n.type === 'skill' ? (function (s) { return (s.cost ? s.cost + ' souffle' : 'gratuit') + (s.cd ? ' · recharge ' + s.cd + ' tours' : ''); })(skillById(n.skill)) : '';
    $('node-info').style.setProperty('--voie', v.color);
    $('node-info').innerHTML = '<span class="ni-type">' + types[n.type] + ' · ' + pathName(n.voie, n.path).toUpperCase() + ' · ÉTAPE ' + n.step + ' / ' + STEPS + '</span><h3>' + nodeName(n) + '</h3><span>' + nodeDesc(n) + '</span>' +
      (extra ? '<span class="muted">' + extra + '</span>' : '') +
      '<span class="ni-cost">Coût : <b>' + n.cost + ' point' + (n.cost > 1 ? 's' : '') + '</b> · niveau <b>' + n.level + '</b></span>' +
      (block ? '<span class="muted">' + block + '</span>' : '<button class="btn" data-learn="' + n.id + '">Apprendre (' + n.cost + ' point' + (n.cost > 1 ? 's' : '') + ')</button>');
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
    var v = pickedVoie(), tech = PATHS[v.id].filter(function (p) { return p.skills; })[0].skills;
    var pathIcon = function (p) { return p.stat ? STAT_ICON[p.stat] : (p.skills ? VOIE_ICON[v.id] : PASSIVE_ICON[v.id]); };
    box.style.setProperty('--voie', v.color);
    box.innerHTML = '<div class="vp-tabs" role="tablist" aria-label="Les trois voies">' + VOIES.map(function (o) {
      return '<button role="tab" data-pick-voie="' + o.id + '" aria-selected="' + (o.id === v.id) + '" style="--voie:' + o.color + '"><img src="' + VOIE_ICON[o.id] + '" alt="">' + o.short.toUpperCase() + '</button>';
    }).join('') + '</div>' +
      '<div class="vp-head"><img src="' + VOIE_ICON[v.id] + '" alt=""><h2>' + v.name.toUpperCase() + '</h2></div>' +
      '<p class="vp-desc">' + v.desc + '</p>' +
      (v.id === 'ermite' ? '<p class="ni-warn">Mode Ermite : peau orange, yeux de crapaud et plus d’arme. Tu te bats à mains nues.</p>' : '') +
      '<h3>SES 6 SORTS</h3><ul class="vp-spells">' + Object.keys(tech).map(function (st) {
        var s = skillById(tech[st]);
        return '<li><b>' + s.name + '</b><small>NIV. ' + STEP_LEVEL[st] + '</small><span>' + s.desc + '</span></li>';
      }).join('') + '</ul>' +
      '<h3>SES 5 CHEMINS</h3><ul class="vp-paths">' + PATHS[v.id].map(function (p) { return '<li><img src="' + pathIcon(p) + '" alt="">' + p.name + '</li>'; }).join('') + '</ul>' +
      '<button class="btn vp-dive" data-choose-voie="' + v.id + '"' + (diving ? ' disabled' : '') + '>Plonger dans cette voie ▶</button>' +
      '<p class="muted vp-note">Choix définitif. Plus tard, le ' + TEA.name + ' (' + TEA.price + ' lucioles) permet de tout recommencer.</p>';
  }

  function renderDeck() {
    var weapon = weaponOf(save.equip);
    var deck = deckSkills(save, weapon);
    var meta = function (s) { return s.base ? 'attaque de base · ' + ({ kunai: 'kunaï', baton: 'bâton', mains: 'mains nues' })[weapon.kind] : (s.cost ? s.cost + ' souffle' : 'gratuit') + (s.cd ? ' · recharge ' + s.cd : ''); };
    var card = function (s, removable) {
      var v = voieOf(s.voie);
      return '<div class="dcard2" style="--voie:' + v.color + '"><img class="dc-ico" src="' + VOIE_ICON[s.voie] + '" alt=""><span class="dc-name">' + s.name + '<br><span class="dc-meta">' + meta(s) + '</span></span>' +
        (removable ? '<button data-undeck="' + s.id + '">Retirer</button>' : '') + '</div>';
    };
    var learned = learnedSkills(save);
    var chosen = save.deck.map(skillById).filter(function (s) { return s && learned.indexOf(s) >= 0; });
    var html = card(deck[0], false);
    for (var i = 0; i < DECK_SIZE; i++) {
      var s = chosen[i];
      if (!s) { html += '<div class="dcard2 empty">Emplacement libre</div>'; continue; }
      html += skillUsable(s, weapon) ? card(s, true)
        : '<div class="dcard2 off" style="--voie:' + voieOf(s.voie).color + '"><img class="dc-ico" src="' + VOIE_ICON[s.voie] + '" alt=""><span class="dc-name">' + s.name + '<br><span class="dc-meta">Inutilisable en mode Ermite</span></span><button data-undeck="' + s.id + '">Retirer</button></div>';
    }
    var lhtml = learned.length ? learned.map(function (s) {
      var inDeck = save.deck.indexOf(s.id) >= 0, v = voieOf(s.voie);
      return '<div class="dcard2' + (inDeck ? ' in-deck' : '') + '" style="--voie:' + v.color + '"><img class="dc-ico" src="' + VOIE_ICON[s.voie] + '" alt=""><span class="dc-name">' + s.name + '<br><span class="dc-meta">' + s.desc + ' · ' + meta(s) + '</span></span>' +
        (inDeck ? '<button data-undeck="' + s.id + '">Retirer</button>' : '<button data-deck="' + s.id + '"' + (save.deck.length >= DECK_SIZE ? ' disabled' : '') + '>Ajouter</button>') + '</div>';
    }).join('') : '<p class="muted">Aucun sort appris. Les 6 sorts de ta voie sont sur le chemin des Techniques.</p>';
    $('deck').innerHTML = html;
    $('learned').innerHTML = lhtml;
  }

  // La voie choisie (définitive) et le bouton pour en changer : tout oublier contre le prix du Thé de l'oubli
  var resetArmed = 0;
  function renderVoie() {
    var v = voieOf(chosenVoie(save)), st = $('voie-status'), btn = $('tree-reset');
    st.innerHTML = v ? 'Voie choisie : <b style="color:' + v.color + '">' + v.short + '</b>' + (v.id === 'ermite' ? ' · mode Ermite' : '') + ' · ' + save.tree.length + ' / ' + (STEPS * 5) + ' dalles' : 'Choisis ta voie : ce choix est définitif';
    btn.hidden = !v;
    btn.disabled = save.gold < TEA.price;
    btn.textContent = resetArmed ? 'Confirmer : tout oublier (' + TEA.price + ' lucioles)' : 'Changer de voie (' + TEA.price + ' lucioles)';
    btn.classList.toggle('is-armed', !!resetArmed);
  }
  // Tout oublier : les points dépensés sont rendus et la voie redevient libre
  function forgetTree() {
    save.skillPoints += treeCost(save); save.tree = []; save.deck = []; save.voie = null;
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
    $('reroll').textContent = 'Nouvel arrivage · ' + SHOP_REROLL + ' lucioles';
    $('reroll').disabled = save.gold < SHOP_REROLL;
    var items = save.shop.filter(function (id) { return id === TEA_ID || !owns(id); });
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

  // La fiche de l'objet choisi : ce qu'il donne, comparé à ce que la grenouille porte, et le bouton d'achat
  function renderShopCard() {
    var id = state.ware, card = $('shop-card');
    card.hidden = !id;
    if (!id) return;
    var head = function (img, name, kind) { return '<div class="sc-id"><img src="' + img + '" alt=""><div><h3>' + name + '</h3><span class="sc-kind">' + kind + '</span></div></div>'; };
    if (id === TEA_ID) {
      var canTea = !!chosenVoie(save), refund = treeCost(save);
      card.innerHTML = head(ICON.the, TEA.name, 'Consommable') +
        '<div class="sc-body"><p>' + TEA.desc + '</p>' + (canTea ? '<span class="sc-cur">Ta voie redevient libre et tu récupères ' + refund + ' point' + (refund > 1 ? 's' : '') + ' de compétence.</span>' : '<span class="sc-miss">Tu n’as encore choisi aucune voie.</span>') + '</div>' +
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
    card.innerHTML = head(iconUrls[id], it.name, slot.name + (it.kind ? ' · ' + (it.kind === 'kunai' ? 'kunaï' : 'bâton') : '') + ' · ' + RARITIES[rarityOf(id)].name) +
      '<div class="sc-body"><p>' + it.desc + '</p>' + (rows ? '<ul class="sc-stats">' + rows + '</ul>' : '') +
      '<span class="sc-cur">' + (worn ? 'Remplace : ' + ITEMS[worn].name : 'Emplacement ' + slot.name.toLowerCase() + ' libre') + '</span></div>' +
      buyButton(id, price, true);
  }
  function buyButton(id, price, ok) {
    var miss = price - save.gold;
    return '<div class="sc-buy"><button class="btn" data-buy="' + id + '"' + (ok && miss <= 0 ? '' : ' disabled') + '>Acheter<br><span>' + price + ' lucioles</span></button>' +
      (miss > 0 ? '<span class="sc-miss">Il te manque ' + miss + ' lucioles.</span>' : '') + '</div>';
  }

  // ---------- Classement ----------
  // Une grande liste gravée dans la pierre : les 50 premières grenouilles, puis la suite à la demande. Cinq façons
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
  // La pierre du fond : des blocs gris, des joints sombres, un peu de mousse (dessinée une fois, en pixel art)
  (function stone() {
    var c = document.createElement('canvas'), x2 = c.getContext('2d');
    c.width = 48; c.height = 48;
    var greys = ['#5a6064', '#62686c', '#555b5f', '#6a7074', '#5e6468'];
    for (var row = 0; row < 4; row++) {
      for (var col = -1; col < 3; col++) {
        var bx = col * 24 + (row % 2 ? 12 : 0), by = row * 12, g = greys[Math.floor(hash(row, col + 1, 51) * greys.length)];
        x2.fillStyle = '#2e3234'; x2.fillRect(bx, by, 24, 12);
        x2.fillStyle = g; x2.fillRect(bx + 1, by + 1, 22, 10);
        x2.fillStyle = 'rgba(255, 255, 255, 0.1)'; x2.fillRect(bx + 1, by + 1, 22, 1);
        x2.fillStyle = 'rgba(0, 0, 0, 0.2)'; x2.fillRect(bx + 1, by + 10, 22, 1);
      }
    }
    for (var n = 0; n < 70; n++) { x2.fillStyle = hash(n, 2, 51) < 0.5 ? 'rgba(0, 0, 0, 0.18)' : 'rgba(255, 255, 255, 0.08)'; x2.fillRect(Math.floor(hash(n, 3, 51) * 48), Math.floor(hash(n, 4, 51) * 48), 1, 1); }
    for (var m = 0; m < 6; m++) { x2.fillStyle = '#4e7a4a'; x2.fillRect(Math.floor(hash(m, 5, 51) * 46), Math.floor(hash(m, 6, 51) * 4) * 12 + 11, 2, 1); }
    $('page-rank').style.setProperty('--stone', 'url(' + c.toDataURL() + ')');
  })();
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
      '<span>' + (e.dalles || 0) + ' / ' + (STEPS * 5) + ' dalles du temple' + (v.id === 'ermite' ? ' · mode Ermite' : '') + '</span>' +
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
  var dojo = { tab: null, data: null, foes: null, loading: false, error: '', riposte: false, last: null, fighters: {} };
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
      alloc: Object.assign({ vitalite: 0, agilite: 0, force: 0, souffle: 0 }, card.alloc),
      tree: (card.tree || []).filter(function (id) { var n = nodeById(id); return n && n.voie === card.voie; })
    };
    setPlayer(ps);
    try {
      var weapon = weaponOf(equip), cs = combatStats(computeStats(equip)), pas = treeBonuses(ps).passives;
      var anims = buildKawazuAnims(dressKawazu(sp, lookFor(equip))), pal = paletteFor(sp.PAL, equip);
      var imgs = function (frames) { return frames.map(function (g) { return g ? gridToCanvas(g, pal, true) : null; }); };
      var maxHp = Math.round(cs.maxHp * (1 + pas.hpMult));
      return (dojo.fighters[card.id] = {
        frog: true, name: card.nom, pseudo: card.pseudo, level: card.niveau, rank: 'duel',
        maxHp: maxHp, dmg: cs.dmg * (1 + pas.dmgMult), crit: cs.crit + pas.crit, dodge: Math.min(0.5, cs.dodge + pas.dodge), agi: cs.agi,
        size: 1 + pas.size, maxSouffle: cs.maxSouffle, regen: cs.regen + pas.regen, dmgReduce: pas.dmgReduce, poisonMult: pas.poisonMult,
        skills: deckSkills(ps, weapon), weaponKind: weapon.kind,
        imgs: {
          idle: imgs(anims.idleRight.frames), atk: imgs(anims.attack.frames), hurt: imgs(anims.hurt.frames),
          fx: imgs(buildFx(weapon.kind === 'kunai' ? { type: 'arc', radii: [5, 9, 13] } : weapon.attack.fx)),
          kunai: kunaiProjectileImgs(weapon.kind === 'kunai' ? weapon.blade : ITEMS.kunai_acier.blade).left
        }
      });
    } finally { setPlayer(save); }
  }
  // nos propres chiffres, pour comparer
  function myFight() {
    var cs = combatStats(computeStats(save.equip)), pas = treeBonuses(save).passives;
    return { maxHp: Math.round(cs.maxHp * (1 + pas.hpMult)), dmg: cs.dmg * (1 + pas.dmgMult), agi: cs.agi };
  }
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
      save.gifts.push(g.id);
      notice('Cadeau des duels pour ta ' + (g.rang === 1 ? '1re' : g.rang + 'e') + ' place de la semaine : ' + giftText(g) + ' !', true);
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
    dojo.foes = null; dojo.fighters = {};
    renderDojo();
    Cloud.flush().then(function () { return dojoApi('GET', '/adversaires'); }).then(function (d) { dojo.foes = d.adversaires; renderDojo(); },
      function (e) { dojo.foes = []; dojo.error = e.message; renderDojo(); });
  }
  // le décor de la page : la cascade, qui coule
  function drawCascade(now) {
    var cv = $('dojo-bg'), x2 = cv.getContext('2d');
    if (cv.width !== CascadeScene.W) { cv.width = CascadeScene.W; cv.height = CascadeScene.H; }
    x2.drawImage(CascadeScene.backdrop(), 0, 0);
    CascadeScene.fx(x2, now);
  }
  function openDojo() {
    drawCascade(performance.now());
    if (!dojo.tab || dojo.tab === 'top') dojo.tab = Cloud.id ? 'duels' : 'arbre';
    renderDojo();
    if (Cloud.id) { loadDojo(); if (!dojo.foes) loadFoes(); }
  }
  function dojoVoie(e) {
    var v = voieOf(e.voie);
    return v ? '<span class="rk-voie" style="--voie:' + v.color + '"><img src="' + VOIE_ICON[v.id] + '" alt="">' + v.short + '</span>' : '<span class="rk-voie none">Sans voie</span>';
  }
  function needAccount(what) {
    return '<div class="panel dojo-empty"><h2>JOUE AVEC UN COMPTE</h2><p>' + what + ' se jouent contre les grenouilles des autres joueurs : crée un compte depuis l’accueil pour y participer. L’arbre d’entraînement, lui, t’attend déjà.</p>' +
      '<div class="row"><a class="btn" href="/?connexion">Aller à l’accueil</a><button class="btn btn-ghost" data-dojo-tab="arbre">L’arbre d’entraînement</button></div></div>';
  }
  function renderDojo() {
    var tabs = [['duels', 'Duels'], ['arbre', 'Entraînement']];
    $('dojo-tabs').innerHTML = tabs.map(function (t) { return '<button role="tab" data-dojo-tab="' + t[0] + '" aria-selected="' + (dojo.tab === t[0]) + '">' + t[1] + '</button>'; }).join('');
    var body = $('dojo-body'), d = dojo.data;
    if (dojo.tab === 'arbre') { body.innerHTML = renderTraining(); return; }
    if (!Cloud.id) { body.innerHTML = needAccount('Les duels'); return; }
    if (!d) { body.innerHTML = '<p class="dojo-wait">' + (dojo.error ? escapeHtml(dojo.error) + ' <button class="btn btn-ghost" data-dojo-reload>Réessayer</button>' : 'On déroule les tatamis…') + '</p>'; return; }
    body.innerHTML = renderDuels(d);
  }
  // l'onglet Duels : notre carte, trois adversaires et le journal
  function renderDuels(d) {
    var me = myFight(), meRank = d.rang ? (d.rang === 1 ? '1re' : d.rang + 'e') + ' sur ' + d.classes : 'pas encore classée';
    var pips = Array.from({ length: d.max }, function (_, i) { return '<i' + (i < d.restants ? ' class="on"' : '') + '></i>'; }).join('');
    var myGift = d.rang && d.rang <= d.recompenses.length ? d.recompenses[d.rang - 1] : null;
    var html = '<div class="dojo-duels"><section class="panel dojo-me">' +
      '<div class="dm-head"><img class="px" src="' + $('sb-portrait').toDataURL() + '" alt=""><div><b>' + escapeHtml(save.hero.name) + '</b><span class="muted">Niveau ' + save.level + '</span>' + dojoVoie({ voie: save.voie }) + '</div></div>' +
      '<div class="dm-rep"><b>' + d.rep + '</b><span>réputation · ' + meRank + '</span></div>' +
      '<div class="dm-row"><span>Victoires <b>' + d.victoires + '</b></span><span>Défaites <b>' + d.defaites + '</b></span></div>' +
      '<div class="dm-duels"><span>Duels du jour : <b>' + d.restants + ' / ' + d.max + '</b></span><span class="pips">' + pips + '</span></div>' +
      '<p class="dm-gift">Cadeaux du lundi dans <b>' + untilMs(d.prochain) + '</b>' + (myGift ? ' · à ta place : ' + giftText(myGift) : ' · pour les 10 premières') + '</p>' +
      '<button class="btn btn-ghost" data-rank-duels>Classement des duels</button></section>';
    html += '<section class="dojo-foes"><div class="df-head"><h2>ADVERSAIRES</h2><button class="btn btn-ghost" data-dojo-foes' + (dojo.foes ? '' : ' disabled') + '>Nouveaux adversaires</button></div><div class="df-list">';
    if (!dojo.foes) html += '<p class="dojo-wait">Des grenouilles entrent dans le dojo…</p>';
    else if (!dojo.foes.length) html += '<p class="dojo-wait">Personne à défier pour l’instant : invite des amis à créer leur grenouille, ou crée-toi une deuxième grenouille pour l’affronter (une fois par jour).</p>';
    else html += dojo.foes.map(function (card) {
      var f = dojoFighter(card), st = repStakes(card.rep), cmp = function (a, b) { return a > b * 1.08 ? ' up' : (a < b * 0.92 ? ' down' : ''); };
      return '<article class="foe' + (card.soeur ? ' sister' : '') + '" style="--voie:' + (voieOf(card.voie) ? voieOf(card.voie).color : '#8a968a') + '">' +
        (card.soeur ? '<span class="foe-sister">TA GRENOUILLE · 1 DUEL PAR JOUR</span>' : '') +
        '<img class="px foe-frog" src="' + portraitOf(card) + '" alt="">' +
        '<b class="foe-name">' + escapeHtml(card.nom) + '</b><span class="muted">' + escapeHtml(card.pseudo) + ' · niv. ' + card.niveau + '</span>' + dojoVoie(card) +
        '<span class="foe-rep">' + card.rep + ' réputation</span>' +
        '<ul class="foe-stats"><li><span>PV</span><b class="' + cmp(f.maxHp, me.maxHp) + '">' + f.maxHp + '</b></li><li><span>Dégâts</span><b class="' + cmp(f.dmg, me.dmg) + '">' + Math.round(f.dmg) + '</b></li><li><span>Agilité</span><b class="' + cmp(f.agi, me.agi) + '">' + f.agi + '</b></li></ul>' +
        '<span class="foe-stakes">Victoire <b class="up">+' + st.win + '</b> · Défaite <b class="down">−' + st.lose + '</b></span>' +
        '<button class="btn" data-duel="' + card.id + '"' + (d.restants > 0 ? '' : ' disabled') + '>Défier ▶</button></article>';
    }).join('');
    html += '</div><div class="panel dojo-journal"><h2>JOURNAL DE LA CASCADE</h2>' + (d.journal.length ? '<ul>' + d.journal.map(function (j) {
      var who = '<b>' + escapeHtml(j.nom) + '</b> (' + escapeHtml(j.pseudo) + ')';
      var text = j.type === 'attaque' ? (j.victoire ? 'Tu as battu ' + who : 'Tu as perdu contre ' + who) : (j.victoire ? who + ' t’a défiée et a perdu' : who + ' t’a défiée et t’a battue');
      return '<li class="' + (j.delta >= 0 ? 'up' : 'down') + '"><span>' + text + '</span><b>' + (j.delta >= 0 ? '+' : '−') + Math.abs(j.delta) + '</b><small>' + agoMs(j.t) + '</small></li>';
    }).join('') + '</ul>' : '<p class="muted">Aucun duel pour l’instant. Les défis que tu lances, et ceux que tu reçois, s’afficheront ici.</p>') + '</div></section></div>';
    return html;
  }
  // l'onglet Entraînement : l'arbre, ses réglages, le dernier bilan
  function renderTraining() {
    var l = dojo.last;
    return '<div class="dojo-train"><section class="panel dt-tree"><img class="px" src="' + TREE_IMG + '" alt=""><div><h2>L’ARBRE D’ENTRAÎNEMENT</h2>' +
      '<p>Un vieux tronc cerclé de paille, qui en a vu d’autres. ' + DOJO_TURNS + ' tours pour frapper de toutes tes forces : essaie un équipement, une répartition de points ou un deck de sorts, puis compare le bilan. Pas de récompense, pas de limite.</p>' +
      '<div class="dt-opts" role="radiogroup" aria-label="L’arbre"><button role="radio" data-riposte="0" aria-checked="' + !dojo.riposte + '"><b>Immobile</b><small>il encaisse, rien de plus</small></button>' +
      '<button role="radio" data-riposte="1" aria-checked="' + dojo.riposte + '"><b>Il riposte</b><small>ses branches fouettent : teste ta défense et tes soins</small></button></div>' +
      '<button class="btn" data-train>Commencer l’entraînement ▶</button></div></section>' +
      (l ? '<section class="panel dt-last"><h2>DERNIER BILAN</h2><ul class="bt-bilan"><li><span>Dégâts en ' + l.turns + ' tours</span><b>' + l.total + '</b></li><li><span>Par tour</span><b>' + Math.round(l.total / Math.max(1, l.turns)) + '</b></li><li><span>Meilleur coup</span><b>' + l.best + '</b></li><li><span>Critiques</span><b>' + l.crits + ' / ' + l.hits + '</b></li>' + (l.riposte ? '<li><span>Dégâts reçus</span><b>' + l.taken + '</b></li>' : '') + '</ul></section>' : '') + '</div>';
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
    if (r.item && !owns(r.item)) save.owned.push(r.item);
    if (card.boss) albumKill(save, 's-' + f);
    persist();
    Sfx.play(levels ? 'levelup' : 'pickup');
    tower.sel = Math.min(TOWER_FLOORS, f + 1);
    return '<p>Étage ' + f + ' conquis ! +' + r.gold + ' lucioles · +' + r.xp + ' XP' + (levels ? ' · <b>Niveau ' + save.level + ' !</b>' : '') + '</p>' +
      (r.item ? '<p class="bt-loot" style="' + rarStyle(r.item) + '"><img src="' + iconUrls[r.item] + '" alt=""> Trésor du Grand Sage : <b>' + ITEMS[r.item].name + '</b></p>' : '') +
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
        (f === next && save.tower < TOWER_FLOORS ? '<img class="px tfl-frog" src="' + me + '" alt="Ta grenouille" style="width:' + 20 * S + 'px;height:' + 20 * S + 'px;top:' + 11 * S + 'px">' : '') + '</button>';
    });
    html += '<div class="tw-nav"><button data-tower-scroll="2" aria-label="Monter">▲</button><button data-tower-scroll="0" aria-label="Revenir à mon étage" title="Revenir à mon étage">◎</button><button data-tower-scroll="-2" aria-label="Descendre">▼</button></div>';
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
          '<p><span class="luciole"></span> ' + r.gold + ' lucioles · ' + r.xp + ' XP</p>' + (r.item ? '<p class="tw-prize" style="' + rarStyle(r.item) + '"><img class="px" src="' + iconUrls[r.item] + '" alt=""><b>' + ITEMS[r.item].name + '</b><small>' + statLine(ITEMS[r.item].stats) + '</small></p>' : '')) + '</div>' +
        '<button class="btn" data-tower-fight="' + f + '">' + (f <= save.tower ? 'Rejouer l’épreuve' : (boss ? 'Défier le Grand Sage ▶' : 'Affronter ▶')) + '</button></div>';
    }
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
  var album = { spread: 0, dir: 0 }, albumImgs = {};
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
    if (!ok) return '<div class="acard back"><img class="px ac-ghost" src="' + lockedUrls[e] + '" alt=""><small>' + itemHint(e) + '</small></div>';
    var slot = SLOTS.filter(function (s) { return s.id === it.slot; })[0].name;
    return '<div class="acard ' + (it.reward ? 'r-epique k-tresor' : 'r-commun') + '" title="' + it.desc + '"><div class="ac-in"><b class="ac-name">' + it.name + '</b>' +
      '<div class="ac-art item"><img class="px" src="' + iconUrls[e] + '" alt=""></div>' +
      '<span class="ac-sub">' + statLine(it.stats) + '</span><span class="ac-foot">' + slot.toUpperCase() + (it.reward ? ' · TRÉSOR' : ' · RANG ' + (ITEM_TIER[e] || 1)) + '</span></div></div>';
  }
  function renderAlbum() {
    var spreads = [null].concat(ALBUM_CHAPTERS), sp = album.spread = Math.max(0, Math.min(spreads.length - 1, album.spread)), ch = spreads[sp];
    var firstObj = 1 + ALBUM_CHAPTERS.map(function (c) { return c.cat; }).indexOf('objets'), ready = ALBUM_MILESTONES.some(function (m) { return milestoneReady(save, m); });
    $('book-tabs').innerHTML = [['Sommaire', 0, sp === 0], ['Bestiaire', 1, sp >= 1 && sp < firstObj], ['Objets', firstObj, sp >= firstObj]].map(function (t, i) {
      return '<button data-book-go="' + t[1] + '" aria-selected="' + t[2] + '" class="bt-' + i + '">' + t[0] + (i === 0 && ready ? ' <i class="badge-dot"></i>' : '') + '</button>';
    }).join('');
    var left, right;
    if (!ch) {
      var bar = function (cat, label) {
        var total = cat === 'monstres' ? ALBUM_MONSTERS.length : ALBUM_ITEMS.length, found = albumCount(save, cat);
        return '<div class="bk-prog"><span>' + label + ' <b>' + found + ' / ' + total + '</b></span><span class="al-bar"><i style="width:' + (found / total * 100) + '%"></i></span></div>';
      };
      var toc = function (cat) {
        return ALBUM_CHAPTERS.map(function (c, i) { return c.cat !== cat ? '' : '<button class="bk-toc" data-book-go="' + (i + 1) + '"><span>' + c.name + '</span><i></i><b>' + chapterFound(c) + ' / ' + c.list.length + '</b></button>'; }).join('');
      };
      left = '<h1 class="bk-title">ALBUM DU MARAIS</h1><p class="bk-intro">Chaque créature vaincue et chaque objet trouvé colle sa carte dans ce livre. Les cartes rares et épiques ont leur cadre bleu ou violet.</p>' +
        bar('monstres', 'Bestiaire') + bar('objets', 'Objets') +
        '<h2 class="bk-h">BESTIAIRE</h2><div class="bk-tocs">' + toc('monstres') + '</div><h2 class="bk-h">OBJETS</h2><div class="bk-tocs">' + toc('objets') + '</div>';
      right = '<h2 class="bk-h">RÉCOMPENSES</h2><p class="bk-intro">Remplis le livre pour gagner des lucioles, de l’expérience… et deux trésors.</p><div class="bk-miles">' +
        ALBUM_MILESTONES.map(function (m) {
          var done = albumOf(save).paliers.indexOf(m.id) >= 0, rdy = milestoneReady(save, m), have = albumCount(save, m.cat);
          return '<div class="bk-mile' + (done ? ' done' : (rdy ? ' ready' : '')) + '"><span class="bm-n">' + m.n + '</span><span class="bm-txt"><b>' + (m.cat === 'monstres' ? 'créatures' : 'objets') + '</b>' + m.gold + ' lucioles · ' + m.xp + ' XP' + (m.item ? ' · <em>' + ITEMS[m.item].name + '</em>' : '') + '</span>' +
            (done ? '<span class="bm-state">Reçu</span>' : (rdy ? '<button class="btn" data-claim="' + m.id + '">Réclamer</button>' : '<span class="bm-state">' + Math.min(have, m.n) + ' / ' + m.n + '</span>')) + '</div>';
        }).join('') + '</div>';
    } else {
      var found = chapterFound(ch), cards = ch.list.map(function (e) { return albumCard(ch, e); });
      left = '<div class="bk-chap"><span class="bk-kicker">' + (ch.cat === 'monstres' ? 'BESTIAIRE' : 'OBJETS') + '</span><h1 class="bk-title">' + ch.name.toUpperCase() + '</h1><p class="bk-intro">' + ch.desc + '</p>' +
        '<div class="bk-prog"><span>Cartes trouvées <b>' + found + ' / ' + ch.list.length + '</b></span><span class="al-bar"><i style="width:' + (found / ch.list.length * 100) + '%"></i></span></div></div>' +
        '<div class="bk-cards">' + cards.slice(0, 6).join('') + '</div>';
      right = '<div class="bk-cards">' + cards.slice(6).join('') + '</div>' + (cards.length <= 6 ? '<p class="bk-empty">La suite de ce chapitre reste à écrire…</p>' : '');
    }
    $('book-left').innerHTML = left;
    $('book-right').innerHTML = right;
    $('book-folio').textContent = sp === 0 ? 'Sommaire' : 'Chapitre ' + sp + ' / ' + ALBUM_CHAPTERS.length;
    $('book-prev').disabled = sp === 0;
    $('book-next').disabled = sp === spreads.length - 1;
    var book = $('book');
    book.classList.remove('flip-l', 'flip-r');
    if (album.dir) { void book.offsetWidth; book.classList.add(album.dir > 0 ? 'flip-r' : 'flip-l'); album.dir = 0; }
  }
  function turnPage(to) {
    if (to === album.spread) return;
    album.dir = to > album.spread ? 1 : -1;
    album.spread = to;
    Sfx.play('cut');
    renderAlbum();
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
    ['camp', 'perso', 'skills', 'map', 'shop', 'tower', 'dojo', 'album', 'rank'].forEach(function (p) { $('page-' + p).hidden = p !== page; });
    renderSidebar();
    if (page === 'camp') { campBiome(); layoutScene(); }
    if (page === 'skills') renderTree();
    if (page === 'map') renderWorldMap();
    if (page === 'rank') openRank();
    if (page === 'dojo') openDojo();
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
    showPage(fight.kind === 'tour' ? 'tower' : (atDojo ? 'dojo' : 'map'));
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
        if (n.type === 'skill' && save.deck.length < DECK_SIZE) save.deck.push(n.skill); // rangé tout seul dans le deck s'il reste de la place
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
    if (t.dataset.dojoTab) { dojo.tab = t.dataset.dojoTab; Sfx.play('click'); renderDojo(); return; }
    if (t.hasAttribute('data-dojo-reload')) { dojo.error = ''; openDojo(); return; }
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
      notice('Tout est oublié : tes points de compétence sont rendus. Choisis une nouvelle voie.');
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
    if (t.dataset.exp) { startExpedition(save, state.sheet.w, state.sheet.st, t.dataset.exp); persist(); renderStageSheet(); renderSidebar(); return; }
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
    if (t.id === 'reroll') { if (save.gold >= SHOP_REROLL) { save.gold -= SHOP_REROLL; refreshShop(save); persist(); gamakoSay('Un nouvel arrivage, tout frais de la vase !'); renderAll(); } return; }
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
      else { save = newSave(); save.hero = { name: frog.nom, skin: frog.peau }; refreshShop(save); } // grenouille toute neuve
      setPlayer(save); persist(); enterGame();
      loadDojo(); // les cadeaux du lundi, s'il y en a
    }, function (e) { location.href = e.message === 'connexion' ? '/?connexion' : '/?grenouilles'; });
  }

  renderMute();
  if (Cloud.id) bootOnline(); else showTitle();
})();
