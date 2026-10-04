// Page d'accueil : le jeu présenté sur un fond animé (les vrais camps du jeu, d'une île à l'autre, en fondu, chacun avec
// sa grenouille), et le compte toujours à portée : connexion ou inscription, puis ses grenouilles, pour reprendre une
// partie ou en créer une. (La cinématique du Héron d'avant n'est plus là.)
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var W = 320, H = 180;
  var sp = buildKawazu();
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]; }); };
  var mk = function (w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // ---------- La grenouille, dans ses différents habits ----------
  function frogSet(skin, equip, hermit) {
    var saved = [heroSkin, playerHermit];
    heroSkin = skinOf(skin); playerHermit = !!hermit;
    var an = buildKawazuAnims(dressKawazu(sp, lookFor(equip))), pal = paletteFor(sp.PAL, equip);
    var imgs = function (frames) { return frames.map(function (g) { return g ? gridToCanvas(g, pal) : null; }); };
    var set = { face: imgs(an.idle.frames) };
    heroSkin = saved[0]; playerHermit = saved[1];
    return set;
  }
  var gear = function (o) { return Object.assign({}, DEFAULT_EQUIP, o); };

  // ---------- Le fond : un camp par île, en fondu, chacun avec sa grenouille (et son aura, plus haut dans le monde) ----------
  var SHOWCASE = [
    { biome: 'marais', set: frogSet('marais', DEFAULT_EQUIP, false) },
    { biome: 'lagune', set: frogSet('lagune', gear({ arme: 'kunai_acier' }), false) },
    { biome: 'toundra', set: frogSet('cendre', gear({ tete: 'c_toundra_tete', echarpe: 'leg_cape_etoiles' }), false), aura: { n: 2, c: 4 } },
    { biome: 'torii', set: frogSet('soleil', gear({ arme: 'c_torii_katana', tete: 'c_torii_tete' }), false), aura: { n: 4, c: 1 } },
    { biome: 'champignons', set: frogSet('orchidee', gear({ echarpe: 'leg_cape_jade' }), true), aura: { n: 7, c: 7 } },
    { biome: 'citadelle', set: frogSet('venin', gear({ arme: 'c_citadelle_katana', tete: 'c_citadelle_tete', echarpe: 'leg_cape_lord' }), false), aura: { n: 10, c: 9 } }
  ].filter(function (s) { return BIOMES.some(function (b) { return b.id === s.biome; }); });
  var SCENE_MS = 8000, FADE_MS = 1600;
  var camps = {};
  function campFrame(s, t) {
    if (!camps[s.biome]) {
      var L = {}, cv = {};
      ['back', 'mid', 'front'].forEach(function (k) { cv[k] = mk(W, H); L[k] = cv[k].getContext('2d'); });
      camps[s.biome] = { stat: CampScene.buildStatic(s.biome), L: L, cv: cv, out: mk(W, H) };
    }
    var c = camps[s.biome], hero = s.set.face[Math.floor(t * 2) % s.set.face.length], HX = CampScene.HERO.x, HY = CampScene.HERO.y;
    CampScene.draw(c.L, c.stat, t, hero, null);
    if (s.aura) { // l'aura derrière elle (on la redessine par-dessus), puis devant
      drawAura(c.L.mid, 'back', HX + 16, HY + 31, 1, s.aura, t);
      c.L.mid.drawImage(hero, HX, HY);
      drawAura(c.L.mid, 'front', HX + 16, HY + 31, 1, s.aura, t);
    }
    var o = c.out.getContext('2d');
    o.clearRect(0, 0, W, H);
    ['back', 'mid', 'front'].forEach(function (k) { o.drawImage(c.cv[k], 0, 0); });
    return c.out;
  }
  var bg = $('bg'), ctx = bg.getContext('2d'), still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize() { bg.width = Math.round(innerWidth); bg.height = Math.round(innerHeight); ctx.imageSmoothingEnabled = false; }
  window.addEventListener('resize', resize);
  resize();
  // la scène à l'échelle de l'écran (elle le couvre), avec un lent travelling ; sur un grand écran, la grenouille entre
  // la présentation et le compte (la scène un peu plus grande, et décalée d'autant)
  function blit(src, t, alpha) {
    var wide = bg.width > 860, shift = wide ? 0.055 * bg.width : 0;
    var s = Math.max(bg.width / W, bg.height / H) * (wide ? 1.3 : 1) * (still ? 1 : 1.04 + 0.03 * Math.sin(t * 0.13));
    var dw = W * s, dh = H * s, dx = (bg.width - dw) / 2 + shift + (still ? 0 : Math.sin(t * 0.09) * W * s * 0.012), dy = (bg.height - dh) / 2;
    ctx.globalAlpha = alpha; ctx.drawImage(src, dx, dy, dw, dh); ctx.globalAlpha = 1;
  }
  var shownLand = -1;
  function landName(s) { var w = BIOMES.map(function (b) { return b.id; }).indexOf(s.biome), b = BIOMES[w], isle = isleOf(w); return b.name + ' · ' + (isle.short || isle.name); }
  function frame(ms) {
    var t = ms / 1000, n = SHOWCASE.length, i = Math.floor(ms / SCENE_MS) % n, k = ms % SCENE_MS;
    blit(campFrame(SHOWCASE[i], t), t, 1);
    if (k > SCENE_MS - FADE_MS) blit(campFrame(SHOWCASE[(i + 1) % n], t), t, (k - (SCENE_MS - FADE_MS)) / FADE_MS);
    if (i !== shownLand) { shownLand = i; var l = $('bg-land'); l.classList.remove('on'); void l.offsetWidth; l.textContent = landName(SHOWCASE[i]); l.classList.add('on'); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  var logo = $('title-logo');
  logo.width = 64; logo.height = 64;
  logo.getContext('2d').drawImage(CampScene.makeLogo(sp), 0, 0);

  // ---------- Le son ----------
  // Le navigateur ne laisse jouer le son qu'après un clic : la musique attend, et le bouton la lance ou la coupe.
  var wasLive = false;
  function renderSound() {
    var on = Sfx.running() && !Sfx.isMuted(), b = $('bg-sound');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.textContent = on ? 'Couper le son' : 'Activer le son';
  }
  ['pointerdown', 'keydown'].forEach(function (ev) { window.addEventListener(ev, function () { wasLive = Sfx.running(); }, true); });
  Sfx.music('calm', true);
  renderSound();

  // ---------- Le compte ----------
  var me = null, serverUp = true, tab = 'connexion', creating = false, confirmDelete = null, createSkin = 'marais';
  function api(method, url, body) {
    return fetch(url, { method: method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.erreur || 'Erreur du serveur.'); return d; }); });
  }
  function portrait(frog) { return frogSet(frog.peau, DEFAULT_EQUIP, frog.voie === 'ermite').face[0].toDataURL(); }
  function render() {
    var box = $('account-body'), html = '';
    if (!serverUp) {
      html = '<h2>Le serveur du jeu ne répond pas</h2><p>Les comptes ont besoin du serveur du jeu. Dans le dossier du jeu, lance :</p><pre>node server/server.js</pre><p>puis ouvre <b>http://localhost:8765</b>.</p>' +
        '<a class="btn btn-ghost" href="jeu.html">Jouer sans compte</a>';
    } else if (!me) {
      html = '<h2>' + (tab === 'inscription' ? 'Crée ton compte' : 'Reprends ta partie') + '</h2>' +
        '<div class="tabs2" role="tablist"><button role="tab" data-tab="connexion" aria-selected="' + (tab === 'connexion') + '">Connexion</button><button role="tab" data-tab="inscription" aria-selected="' + (tab === 'inscription') + '">Inscription</button></div>' +
        '<form id="auth-form" class="auth" autocomplete="on">' +
        '<label for="auth-pseudo">Pseudo</label><input id="auth-pseudo" name="username" autocomplete="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_\\-]+">' +
        '<label for="auth-pass">Mot de passe</label><input id="auth-pass" name="password" type="password" autocomplete="' + (tab === 'inscription' ? 'new-password' : 'current-password') + '" required minlength="' + (tab === 'inscription' ? 8 : 1) + '">' +
        (tab === 'inscription' ? '<label for="auth-pass2">Confirme le mot de passe</label><input id="auth-pass2" type="password" autocomplete="new-password" required minlength="8"><p class="hint">3 à 20 caractères pour le pseudo (lettres, chiffres, - ou _), 8 au moins pour le mot de passe.</p>' : '') +
        '<p id="auth-error" class="error" role="alert"></p>' +
        '<button class="btn" type="submit">' + (tab === 'inscription' ? 'Créer mon compte ▶' : 'Se connecter ▶') + '</button></form>' +
        '<p class="hint">Un compte garde tes grenouilles (cinq au plus) sur le serveur : tu les retrouves partout.</p>';
    } else if (creating) {
      html = '<h2>Nouvelle grenouille</h2><form id="frog-form" class="auth" autocomplete="off">' +
        '<div class="frog-preview"><img id="frog-preview" class="px" alt=""></div>' +
        '<label for="frog-name">Son nom</label><input id="frog-name" maxlength="16" placeholder="Kawazu" required>' +
        '<span class="lbl">Sa couleur</span><div class="skins2" role="radiogroup" aria-label="Couleur">' +
        Object.keys(SKINS).map(function (k) { return '<button type="button" role="radio" data-skin="' + k + '" aria-checked="' + (k === createSkin) + '"><i style="background:' + SKINS[k].m + '"></i>' + SKINS[k].name + '</button>'; }).join('') + '</div>' +
        '<p id="auth-error" class="error" role="alert"></p>' +
        '<div class="row"><button class="btn" type="submit">Créer et jouer ▶</button>' + (me.grenouilles.length ? '<button class="btn btn-ghost" type="button" data-cancel>Annuler</button>' : '') + '</div></form>';
    } else {
      var frogs = me.grenouilles.slice().sort(function (a, b) { return (b.modifie || 0) - (a.modifie || 0); });
      html = '<h2>Bonjour, ' + esc(me.pseudo) + '</h2>' + (frogs.length ? '<p class="hint">Tes grenouilles, la dernière jouée en premier.</p>' : '') + '<div class="frogs">' + frogs.map(function (g, i) {
        var voie = g.voie ? (VOIES.filter(function (v) { return v.id === g.voie; })[0] || { short: g.voie }).short : 'pas encore de voie';
        var where = BIOMES[g.monde] ? BIOMES[g.monde].name + ' · étape ' + g.etape + ' / 10' : '';
        return '<div class="frog' + (i ? '' : ' is-last') + '"><img class="px" src="' + portrait(g) + '" alt=""><div class="frog-info"><b>' + esc(g.nom) + '</b><span>Niveau ' + g.niveau + ' · ' + voie + '</span><span>' + where + '</span></div>' +
          '<div class="frog-actions"><a class="btn" href="jeu.html?grenouille=' + g.id + '">' + (i ? 'Jouer ▶' : 'Reprendre ▶') + '</a>' +
          (confirmDelete === g.id ? '<span class="confirm">Supprimer pour de bon ? <button class="link danger" data-delete="' + g.id + '">Oui</button> <button class="link" data-keep>Non</button></span>' : '<button class="link" data-ask-delete="' + g.id + '">Supprimer</button>') + '</div></div>';
      }).join('') + '</div>' +
        (me.grenouilles.length < (me.max || 5) ? '<button class="btn btn-ghost new-frog" data-new>+ Nouvelle grenouille</button>' : '<p class="hint">Tu as atteint le maximum de ' + me.max + ' grenouilles.</p>') +
        '<p id="auth-error" class="error" role="alert"></p><button class="link logout" data-logout>Se déconnecter</button>';
    }
    box.innerHTML = html;
    if (creating) updatePreview();
  }
  function updatePreview() {
    var img = $('frog-preview');
    if (img) img.src = frogSet(createSkin, DEFAULT_EQUIP, false).face[0].toDataURL();
  }
  function showError(msg) { var e = $('auth-error'); if (e) e.textContent = msg; }

  document.addEventListener('submit', function (e) {
    e.preventDefault();
    if (e.target.id === 'auth-form') {
      var pseudo = $('auth-pseudo').value.trim(), pass = $('auth-pass').value;
      if (tab === 'inscription' && pass !== $('auth-pass2').value) return showError('Les deux mots de passe ne sont pas les mêmes.');
      api('POST', '/api/' + tab, { pseudo: pseudo, motdepasse: pass }).then(function (d) {
        me = { pseudo: d.pseudo, grenouilles: d.grenouilles || [], max: 5 };
        creating = !me.grenouilles.length; // premier passage : on crée tout de suite sa grenouille
        render();
      }, function (err) { showError(err.message); });
    }
    if (e.target.id === 'frog-form') {
      var name = $('frog-name').value.trim();
      api('POST', '/api/grenouilles', { nom: name, peau: createSkin }).then(function (g) { location.href = 'jeu.html?grenouille=' + g.id; }, function (err) { showError(err.message); });
    }
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button, a');
    if (!t) return;
    // le clic qui a lancé le son ne doit pas le couper aussitôt
    if (t.id === 'bg-sound') { if (Sfx.isMuted() || wasLive) Sfx.toggle(); renderSound(); return; }
    if (t.dataset.tab) { tab = t.dataset.tab; render(); var f = $('auth-pseudo'); if (f) f.focus(); return; }
    if (t.dataset.skin) { createSkin = t.dataset.skin; Array.prototype.forEach.call(document.querySelectorAll('[data-skin]'), function (b) { b.setAttribute('aria-checked', b.dataset.skin === createSkin); }); updatePreview(); return; }
    if (t.hasAttribute('data-new')) { creating = true; render(); return; }
    if (t.hasAttribute('data-cancel')) { creating = false; render(); return; }
    if (t.dataset.askDelete) { confirmDelete = t.dataset.askDelete; render(); return; }
    if (t.hasAttribute('data-keep')) { confirmDelete = null; render(); return; }
    if (t.dataset.delete) {
      api('DELETE', '/api/grenouilles/' + t.dataset.delete).then(function () {
        me.grenouilles = me.grenouilles.filter(function (g) { return g.id !== t.dataset.delete; });
        confirmDelete = null; render();
      }, function (err) { showError(err.message); });
      return;
    }
    if (t.hasAttribute('data-logout')) { api('POST', '/api/deconnexion').then(function () { me = null; tab = 'connexion'; render(); }); }
  });

  // Qui est connecté ? (et le serveur est-il là ?)
  if (location.protocol === 'file:') { serverUp = false; render(); }
  else {
    render();
    fetch('/api/moi', { credentials: 'same-origin' }).then(function (r) {
      if (r.status === 401) return null;
      if (!r.ok) throw new Error('serveur');
      return r.json();
    }).then(function (d) { me = d; render(); }, function () { serverUp = false; render(); });
  }
})();
