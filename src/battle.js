// Duel au tour par tour : la grenouille du joueur contre un ennemi, dans le décor du biome.
// Chaque tour, on choisit une compétence du deck (coût en Souffle, temps de recharge) ; l'ennemi a ses tactiques
// (charge préparée, vol de vie, englue, rage du boss). Mode auto et vitesse ×1/×2/×4.
// BattleScene.start(save, fight, onEnd) ; onEnd(résultat, fight) avec résultat = 'win' | 'lose' | 'flee'.
// À la Cascade des Duels (fight.kind 'duel' ou 'arbre') : l'adversaire peut être la grenouille d'un autre joueur (enemy.frog :
// ses sorts, son souffle, ses coups au corps à corps ou au kunaï, choisis par l'ordinateur), ou l'arbre
// d'entraînement (fight.turns tours, puis le bilan des dégâts). fight.settle(victoire) donne le texte du résultat.
var BattleScene = (function () {
  // L'arène fait 400×225 pixels et les combattants gardent leur taille : la caméra est plus reculée, on voit
  // plus de décor. Au début du combat, elle recule encore un peu depuis un plan serré (effet de dézoom).
  var W = 400, H = 225, GROUND = 165, MARGIN = 64, introT = 0;
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('bt-canvas');
  var ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;
  ctx.imageSmoothingEnabled = false;
  var sp = buildKawazu();
  function heroName() { return save.hero ? save.hero.name : 'Kawazu'; }

  var save, fight, onEnd, weapon, bg;
  var P, E; // combattants
  var HERO = null, ENEMY = null, KUNAI = null;
  var busy = false, over = false, raf = 0, token = 0;
  var tweens = [], floaters = [], particles = [], shots = [], shake = 0;

  // Le décor remplit tout l'écran (quitte à rogner les bords), sans jamais couper les deux combattants
  function resize() {
    var box = $('battle'), bw = box.clientWidth, bh = box.clientHeight;
    var s = Math.min(Math.max(bw / W, bh / H), bw / 360);
    canvas.style.width = W * s + 'px';
    canvas.style.height = H * s + 'px';
    canvas.style.left = Math.round((bw - W * s) / 2) + 'px';
    canvas.style.top = Math.round((bh - H * s) / 2) + 'px';
  }
  window.addEventListener('resize', function () { if (!$('battle').hidden) resize(); });

  // ---------- Temps : tout est accéléré selon la vitesse choisie ----------
  function speed() { return save.battle.speed; }
  function wait(ms) {
    var t = token;
    return new Promise(function (res) { setTimeout(function () { if (t === token) res(); }, ms / speed()); });
  }
  // interpolation d'une propriété numérique (rendu par la boucle d'animation)
  function tween(obj, key, to, ms) {
    return new Promise(function (res) {
      tweens.push({ obj: obj, key: key, from: obj[key], to: to, t: 0, dur: ms, done: res });
    });
  }

  // ---------- Décor ----------
  function buildBackground(biome) {
    var w = 25, h = 15, tiles = new Uint8Array(w * h);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var v = y < 5 ? RT.WALL : RT.FLOOR;
        if (y >= 5 && hash(x, y, biome.id.length) < 0.08) v = RT.ALT;
        tiles[y * w + x] = v;
      }
    }
    [[1, 6, RT.BLOCK], [23, 6, RT.BUSH], [0, 10, RT.BUSH], [24, 11, RT.BLOCK], [2, 13, biome.water ? RT.WATER : RT.BUSH], [3, 13, biome.water ? RT.WATER : RT.ALT], [22, 14, RT.BUSH], [12, 5, RT.BUSH]]
      .forEach(function (d) { tiles[d[1] * w + d[0]] = d[2]; });
    var map = { biome: biome, w: w, h: h, tiles: tiles, seed: biome.id.length * 97 };
    var c = renderMap(map);
    // assombrit le fond et éclaire le centre (effet d'arène)
    var cx = c.getContext('2d');
    var g = cx.createRadialGradient(W / 2, GROUND - 20, 20, W / 2, GROUND - 20, 220);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    cx.fillStyle = g;
    cx.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // ---------- Combattants ----------
  function buildHero() {
    var anims = buildKawazuAnims(dressKawazu(sp, lookFor(save.equip)));
    var pal = paletteFor(sp.PAL, save.equip);
    var imgs = function (frames, flip) { return frames.map(function (g) { return g ? gridToCanvas(g, pal, flip) : null; }); };
    HERO = {
      idle: imgs(anims.idleRight.frames), atk: imgs(anims.attack.frames), hurt: imgs(anims.hurt.frames),
      fx: imgs(buildFx(weapon.kind === 'kunai' ? { type: 'arc', radii: [5, 9, 13] } : weapon.attack.fx))
    };
    KUNAI = kunaiProjectileImgs(ITEMS.kunai_acier.blade).right;
    if (weapon.kind === 'kunai') KUNAI = kunaiProjectileImgs(weapon.blade).right;
  }
  function buildEnemyImgs(e) {
    if (e.frog) { ENEMY = e.imgs; return; } // une grenouille du dojo : ses images sont prêtes (tournées vers la gauche)
    var s = SPECIES[e.species];
    var pal = rarityPal(Object.assign({}, s.pal, e.pal || {}), e.rarity);
    ENEMY = {
      frames: s.frames.map(function (f) { return stringsToCanvas(f, pal, false); }),
      flash: s.frames.map(function (f) { return stringsToCanvas(f, pal, false, true); })
    };
  }

  // ---------- Interface (DOM) ----------
  function log(text, cls) {
    var el = document.createElement('div');
    el.className = 'bt-line' + (cls ? ' ' + cls : '');
    el.textContent = text;
    var box = $('bt-log');
    box.appendChild(el);
    while (box.children.length > 5) box.removeChild(box.firstChild);
  }

  function statusText(f) {
    var s = [];
    if (f.guard > 0) s.push('Garde ' + f.guard);
    if (f.buff > 0) s.push('Rosée ' + f.buff);
    if (f.shadow) s.push('Ombre');
    if (f.poison > 0) s.push('Poison ' + f.poison);
    if (f.stun > 0) s.push('Étourdi');
    if (f.charging) s.push('Prépare une charge !');
    if (f.enraged) s.push('Enragé');
    return s.join(' · ');
  }

  function renderHud() {
    $('bt-hero-hp').style.width = Math.max(0, P.hp / P.maxHp * 100) + '%';
    $('bt-hero-hptext').textContent = Math.max(0, Math.ceil(P.hp)) + ' / ' + P.maxHp;
    $('bt-souffle').innerHTML = Array.apply(null, Array(P.maxSouffle)).map(function (_, i) {
      return '<span class="pip' + (i < P.souffle ? ' on' : '') + '"></span>';
    }).join('');
    $('bt-hero-status').textContent = statusText(P);
    $('bt-enemy-name').textContent = E.name;
    $('bt-enemy-name').style.color = E.rarity && E.rarity !== 'commun' ? RARITIES[E.rarity].color : '';
    if (fight.kind === 'arbre') {
      $('bt-enemy-lvl').textContent = 'Tour ' + Math.min(fight.turns, fight.done + 1) + ' / ' + fight.turns;
      $('bt-enemy-hp').style.width = '100%';
      $('bt-enemy-hptext').textContent = 'Dégâts : ' + fight.stats.total;
    } else {
      $('bt-enemy-lvl').textContent = 'Niv. ' + E.level + (E.rank === 'boss' ? ' · BOSS' : (E.rank === 'elite' ? ' · ÉLITE' : (E.frog ? (E.rank === 'sage' ? ' · SAGE' : ' · DUEL') : ''))) + (E.rarity && E.rarity !== 'commun' ? ' · ' + RARITIES[E.rarity].name.toUpperCase() : '');
      $('bt-enemy-hp').style.width = Math.max(0, E.hp / E.maxHp * 100) + '%';
      $('bt-enemy-hptext').textContent = Math.max(0, Math.ceil(E.hp)) + ' / ' + E.maxHp;
    }
    $('bt-enemy-status').textContent = statusText(E);
    renderSkills();
    $('bt-auto').classList.toggle('is-on', save.battle.auto);
    $('bt-auto').setAttribute('aria-pressed', save.battle.auto ? 'true' : 'false');
    Array.prototype.forEach.call(document.querySelectorAll('[data-speed]'), function (b) {
      b.classList.toggle('is-on', +b.dataset.speed === save.battle.speed);
    });
  }

  function skillState(s) {
    if (P.cds[s.id] > 0) return { ok: false, why: 'Recharge ' + P.cds[s.id] };
    if (P.souffle < s.cost) return { ok: false, why: 'Souffle ' + s.cost };
    return { ok: true };
  }

  function renderSkills() {
    var voieColor = function (s) { return VOIES.filter(function (v) { return v.id === s.voie; })[0].color; };
    $('bt-skills').innerHTML = P.skills.map(function (s, i) {
      var st = skillState(s);
      return '<button class="bt-skill" data-skill="' + s.id + '"' + (st.ok && !busy && !over ? '' : ' disabled') +
        ' style="--voie:' + voieColor(s) + '" title="' + s.desc + '">' +
        '<span class="bt-key">' + (i + 1) + '</span><span class="bt-sname">' + s.name + '</span>' +
        '<span class="bt-smeta">' + (st.ok ? (s.cost ? s.cost + ' souffle' : 'gratuit') + (s.cd ? ' · recharge ' + s.cd : '') : st.why) + '</span></button>';
    }).join('');
  }

  // ---------- Règles ----------
  function heroDamage(mult, forceCrit) {
    var crit = forceCrit || Math.random() < P.crit + (fight.weather && fight.weather.crit || 0);
    var dmg = P.dmg * mult * (P.buff > 0 ? 1.4 : 1) * (crit ? 1.6 : 1) * (0.9 + Math.random() * 0.2);
    return { dmg: Math.max(1, Math.round(dmg)), crit: crit };
  }

  function floater(x, y, text, col) {
    floaters.push({ x: x, y: y, text: text, col: col, t: 0 });
  }
  function burst(x, y, col, n) {
    for (var i = 0; i < n; i++) {
      particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 120, vy: -30 - Math.random() * 80, life: 0.5 + Math.random() * 0.4, c: col });
    }
  }

  function enemyBox() { var s = enemySize(E); return { x: E.x, y: GROUND - s, w: s, h: s }; }

  // un coup de Kawazu sur l'ennemi
  async function hitEnemy(mult, opts) {
    opts = opts || {};
    var box = enemyBox(), cx = box.x + box.w / 2, cy = box.y + box.h * 0.4;
    var dodge = E.dodge + (fight.weather && fight.weather.enemyDodge || 0);
    if (E.shadow) { E.shadow = false; dodge = 1; opts.sure = false; } // une grenouille dans l'ombre esquive le coup
    if (!opts.sure && Math.random() < dodge) {
      floater(cx, cy, 'Esquive', '#c9d6e3');
      log(E.name + ' esquive !');
      Sfx.play('swing');
      return 0;
    }
    var r = heroDamage(mult, opts.crit);
    if (E.guard > 0) r.dmg = Math.max(1, Math.round(r.dmg * 0.5));
    if (E.dmgReduce) r.dmg = Math.max(1, Math.round(r.dmg * (1 - E.dmgReduce)));
    E.hp -= r.dmg;
    if (fight.stats) { var st = fight.stats; st.total += r.dmg; st.hits++; if (r.crit) st.crits++; st.best = Math.max(st.best, r.dmg); }
    E.flash = 0.15;
    shake = r.crit ? 4 : 2;
    burst(cx, cy, '#f4f4e8', r.crit ? 14 : 8);
    floater(cx, cy, (r.crit ? 'CRIT ' : '') + r.dmg, r.crit ? '#f3d27a' : '#ffffff');
    Sfx.play('hit');
    E.x += 6;
    tween(E, 'x', E.homeX, 160);
    return r.dmg;
  }

  // ---------- Actions de Kawazu ----------
  async function useSkill(s) {
    P.souffle -= s.cost;
    if (s.cd) P.cds[s.id] = s.cd + 1; // +1 : le tour en cours ne compte pas
    log(heroName() + ' utilise ' + s.name + '.', 'hero');
    renderHud();
    var sure = s.voie === 'kunai';
    var crit = false;
    if (P.shadowCrit && s.power > 0) { crit = true; P.shadowCrit = false; }

    if (s.heal) {
      var amount = Math.round(P.maxHp * s.heal);
      P.hp = Math.min(P.maxHp, P.hp + amount);
      burst(P.x + 32, GROUND - 40, '#8fce52', 16);
      floater(P.x + 32, GROUND - 50, '+' + amount, '#8fce52');
      Sfx.play('heart');
      await wait(450);
    } else if (s.guard) {
      P.guard = s.guard;
      burst(P.x + 32, GROUND - 40, '#c9e07a', 12);
      Sfx.play('equip');
      await wait(400);
    } else if (s.shadow) {
      P.shadow = true; P.shadowCrit = true;
      P.alpha = 0.4;
      Sfx.play('throw');
      await wait(400);
      P.alpha = 1;
    } else if (s.buff) {
      P.buff = s.buff;
      burst(P.x + 32, GROUND - 40, '#9cc7e0', 16);
      Sfx.play('levelup');
      await wait(450);
    } else if (s.voie === 'kunai') {
      for (var k = 0; k < s.hits && E.hp > 0; k++) {
        P.frame = 1;
        Sfx.play('throw');
        var shot = { x: P.x + 50, y: GROUND - 34 - (k % 2) * 6 };
        shots.push(shot);
        await tween(shot, 'x', enemyBox().x + 10, 220);
        shots.splice(shots.indexOf(shot), 1);
        await hitEnemy(s.power, { sure: sure, crit: crit && k === 0 });
        P.frame = 0;
        await wait(s.hits > 2 ? 90 : 160);
      }
    } else {
      // corps à corps : bâton (onde) ou paume de l'ermite
      var jump = s.id === 'saut';
      await tween(P, 'x', E.homeX - (jump ? 60 : 78), 220);
      if (jump) { await tween(P, 'y', -60, 200); Sfx.play('swing'); await tween(P, 'y', 0, 140); shake = 6; }
      for (var h = 0; h < s.hits && E.hp > 0; h++) {
        P.frame = 1;
        await wait(60);
        P.frame = 2;
        P.fx = s.voie === 'baton' || weapon.kind === 'mains' ? 1 : 0;
        P.palm = s.voie === 'ermite' ? 0.25 : 0;
        if (s.voie === 'baton') Sfx.play('swing');
        var dealt = await hitEnemy(s.power, { crit: crit && h === 0 });
        if (s.drain && dealt) {
          var heal = Math.round(dealt * s.drain);
          P.hp = Math.min(P.maxHp, P.hp + heal);
          floater(P.x + 32, GROUND - 50, '+' + heal, '#8fce52');
        }
        if (s.stun && dealt && Math.random() < s.stun) { E.stun = 1; floater(E.x + 20, GROUND - 70, 'Étourdi !', '#f3d27a'); }
        await wait(120);
        P.fx = 0; P.frame = 3;
        await wait(90);
      }
      P.frame = 0;
      await tween(P, 'x', P.homeX, 200);
    }
    if (s.poison && E.hp > 0) { E.poison = s.poison; E.poisonDmg = Math.max(1, Math.round(P.dmg * 0.35 * (1 + P.poisonMult))); log(E.name + ' est empoisonné.'); }
    renderHud();
  }

  // Choix automatique : se soigner si besoin, se protéger d'une charge, sinon le plus de dégâts possible
  function autoPick() {
    var ready = P.skills.filter(function (s) { return skillState(s).ok; });
    var pick = function (fn) { return ready.filter(fn)[0]; };
    if (P.hp < P.maxHp * 0.35) { var heal = pick(function (s) { return s.heal; }); if (heal) return heal; }
    if (E.charging) { var def = pick(function (s) { return s.guard || s.shadow; }); if (def) return def; }
    if (!P.buff) { var buff = pick(function (s) { return s.buff; }); if (buff && E.hp > P.dmg * 3) return buff; }
    var attacks = ready.filter(function (s) { return s.power > 0; });
    attacks.sort(function (a, b) { return b.power * b.hits - a.power * a.hits; });
    return attacks[0] || ready[0];
  }

  async function playerTurn() {
    if (over) return;
    // début de tour : recharges, Souffle, effets qui s'estompent
    Object.keys(P.cds).forEach(function (k) { if (P.cds[k] > 0) P.cds[k]--; });
    P.souffle = Math.min(P.maxSouffle, P.souffle + P.regen + (fight.weather && fight.weather.regen || 0));
    if (P.buff > 0) P.buff--;
    if (E.guard > 0) E.guard--;
    if (P.poison > 0) {
      P.poison--;
      P.hp -= P.poisonDmg;
      floater(P.x + 32, GROUND - 60, P.poisonDmg + '', '#8fce52');
      burst(P.x + 32, GROUND - 40, '#6fae52', 8);
      renderHud();
      await wait(350);
      if (P.hp <= 0) return defeat();
    }
    if (P.stun > 0) {
      P.stun--;
      log(heroName() + ' est étourdi et ne bouge pas.', 'danger');
      renderHud();
      await wait(450);
      return enemyTurn();
    }
    busy = false;
    renderHud();
    if (save.battle.auto) {
      await wait(380);
      if (!busy && !over && save.battle.auto) act(autoPick());
    }
  }

  async function act(skill) {
    if (busy || over || !skill || !skillState(skill).ok) return;
    busy = true;
    renderHud();
    await useSkill(skill);
    if (fight.kind === 'arbre') { fight.done++; renderHud(); if (fight.done >= fight.turns) return trainingEnd(); }
    if (E.hp <= 0) return victory();
    await wait(300);
    enemyTurn();
  }

  // ---------- Tour de l'ennemi ----------
  async function enemyTurn() {
    if (over) return;
    if (P.guard > 0) P.guard--;
    if (E.poison > 0) {
      E.poison--;
      E.hp -= E.poisonDmg;
      if (fight.stats) fight.stats.total += E.poisonDmg;
      floater(E.x + 24, GROUND - 60, E.poisonDmg + '', '#8fce52');
      burst(E.x + 24, GROUND - 40, '#6fae52', 8);
      renderHud();
      await wait(350);
      if (E.hp <= 0) return victory();
    }
    if (E.stun > 0) {
      E.stun--;
      log(E.name + ' est étourdi et ne bouge pas.');
      await wait(450);
      return playerTurn();
    }
    if (E.frog) return frogTurn();
    if (E.species === 'arbre') return treeTurn();
    E.turn++;
    if (E.rank === 'boss' && !E.enraged && E.hp < E.maxHp * 0.5) {
      E.enraged = true;
      log(E.name + ' entre dans une rage folle !', 'danger');
      Sfx.play('boss');
      shake = 6;
      await wait(500);
    }
    var dmgMult = (E.enraged ? 1.3 : 1) * (fight.weather && fight.weather.enemyDmg || 1);
    var move = 'normal';
    if (E.charging) { move = 'charge'; E.charging = false; }
    else if ((E.behavior === 'dasher' || E.rank === 'boss') && E.turn % 3 === 0) {
      E.charging = true;
      log(E.name + ' se prépare à charger…', 'danger');
      Sfx.play('boss');
      renderHud();
      await wait(550);
      return playerTurn();
    } else if (E.behavior === 'flyer' && Math.random() < 0.3) move = 'drain';
    else if (E.behavior === 'walker' && E.turn % 3 === 0) move = 'glue';

    // l'ennemi se jette sur Kawazu
    await tween(E, 'x', P.homeX + 60, move === 'charge' ? 180 : 240);
    var dodge = P.shadow || Math.random() < P.dodge;
    if (dodge) {
      P.shadow = false;
      floater(P.x + 32, GROUND - 50, 'Esquive', '#c9d6e3');
      log(heroName() + ' esquive !', 'hero');
      Sfx.play('swing');
      P.x -= 10;
      tween(P, 'x', P.homeX, 160);
    } else {
      var crit = Math.random() < 0.05 + (fight.weather && fight.weather.crit || 0);
      var dmg = E.dmg * dmgMult * (move === 'charge' ? 1.8 : 1) * (crit ? 1.5 : 1) * (0.9 + Math.random() * 0.2);
      if (P.guard > 0) dmg *= 0.5;
      dmg *= 1 - P.dmgReduce;
      dmg = Math.max(1, Math.round(dmg));
      P.hp -= dmg;
      P.hurt = 0.35;
      shake = move === 'charge' ? 6 : 3;
      burst(P.x + 32, GROUND - 40, '#e05a4a', 10);
      floater(P.x + 32, GROUND - 50, (crit ? 'CRIT ' : '') + dmg, '#ff8a7a');
      Sfx.play('hurt');
      var names = { normal: 'attaque', charge: 'charge de plein fouet', drain: 'aspire la vie de ' + heroName(), glue: 'englue ' + heroName() };
      log(E.name + ' ' + names[move] + ' : ' + dmg + ' dégâts.', 'danger');
      if (move === 'drain') { var h = Math.round(dmg * 0.5); E.hp = Math.min(E.maxHp, E.hp + h); floater(E.x + 24, GROUND - 70, '+' + h, '#8fce52'); }
      if (move === 'glue') { P.souffle = Math.max(0, P.souffle - 1); floater(P.x + 32, GROUND - 64, '-1 souffle', '#9cc7e0'); }
      P.x -= 8;
      tween(P, 'x', P.homeX, 160);
      // passif Contre-attaque : riposte immédiate
      if (P.hp > 0 && Math.random() < P.riposte) {
        await wait(120);
        log(heroName() + ' riposte !', 'hero');
        await hitEnemy(0.5, { sure: true });
        if (E.hp <= 0) { await tween(E, 'x', E.homeX, 200); return victory(); }
      }
    }
    await tween(E, 'x', E.homeX, 240);
    renderHud();
    if (P.hp <= 0) return defeat();
    await wait(200);
    playerTurn();
  }

  // ---------- Au dojo : la grenouille adverse joue ses sorts comme Kawazu, choisis par l'ordinateur ----------
  function frogReady(s) { return !(E.cds[s.id] > 0) && E.souffle >= s.cost; }
  function frogPick() {
    var ready = E.skills.filter(frogReady), pick = function (fn) { return ready.filter(fn)[0]; };
    if (E.hp < E.maxHp * 0.35) { var heal = pick(function (s) { return s.heal; }); if (heal) return heal; }
    if (!E.buff) { var buff = pick(function (s) { return s.buff; }); if (buff && P.hp > E.dmg * 3) return buff; }
    if (!E.guard && !E.shadow && Math.random() < 0.25) { var def = pick(function (s) { return s.guard || s.shadow; }); if (def) return def; }
    var attacks = ready.filter(function (s) { return s.power > 0; });
    attacks.sort(function (a, b) { return b.power * b.hits - a.power * a.hits; });
    return attacks[0] || ready[0];
  }
  // un coup de la grenouille adverse sur Kawazu
  async function hitHero(mult, opts) {
    opts = opts || {};
    if (!opts.sure && (P.shadow || Math.random() < P.dodge)) {
      P.shadow = false;
      floater(P.x + 32, GROUND - 50, 'Esquive', '#c9d6e3');
      log(heroName() + ' esquive !', 'hero');
      Sfx.play('swing');
      P.x -= 10; tween(P, 'x', P.homeX, 160);
      return 0;
    }
    var crit = opts.crit || Math.random() < E.crit;
    var dmg = E.dmg * mult * (E.buff > 0 ? 1.4 : 1) * (crit ? 1.6 : 1) * (0.9 + Math.random() * 0.2);
    if (P.guard > 0) dmg *= 0.5;
    dmg = Math.max(1, Math.round(dmg * (1 - P.dmgReduce)));
    P.hp -= dmg;
    P.hurt = 0.35;
    shake = crit ? 4 : 2;
    burst(P.x + 32, GROUND - 40, '#e05a4a', 10);
    floater(P.x + 32, GROUND - 50, (crit ? 'CRIT ' : '') + dmg, '#ff8a7a');
    Sfx.play('hurt');
    P.x -= 8; tween(P, 'x', P.homeX, 160);
    return dmg;
  }
  async function frogTurn() {
    Object.keys(E.cds).forEach(function (k) { if (E.cds[k] > 0) E.cds[k]--; });
    E.souffle = Math.min(E.maxSouffle, E.souffle + E.regen);
    if (E.buff > 0) E.buff--;
    renderHud();
    await wait(250);
    var s = frogPick();
    if (!s) { log(E.name + ' reprend son souffle.'); await wait(350); return playerTurn(); }
    E.souffle -= s.cost;
    if (s.cd) E.cds[s.id] = s.cd + 1;
    log(E.name + ' utilise ' + s.name + '.', 'danger');
    var crit = false;
    if (E.shadowCrit && s.power > 0) { crit = true; E.shadowCrit = false; }
    var cx = E.x + enemySize(E) / 2;
    if (s.heal) {
      var amount = Math.round(E.maxHp * s.heal);
      E.hp = Math.min(E.maxHp, E.hp + amount);
      burst(cx, GROUND - 40, '#8fce52', 16); floater(cx, GROUND - 50, '+' + amount, '#8fce52');
      Sfx.play('heart'); await wait(450);
    } else if (s.guard) {
      E.guard = s.guard; burst(cx, GROUND - 40, '#c9e07a', 12); Sfx.play('equip'); await wait(400);
    } else if (s.shadow) {
      E.shadow = true; E.shadowCrit = true; E.alpha = 0.4; Sfx.play('throw'); await wait(400); E.alpha = 1;
    } else if (s.buff) {
      E.buff = s.buff; burst(cx, GROUND - 40, '#9cc7e0', 16); Sfx.play('levelup'); await wait(450);
    } else if (s.voie === 'kunai') {
      for (var k = 0; k < s.hits && P.hp > 0; k++) {
        E.frame = 1;
        Sfx.play('throw');
        var shot = { x: E.x + 6, y: GROUND - 34 - (k % 2) * 6, img: ENEMY.kunai };
        shots.push(shot);
        await tween(shot, 'x', P.x + 44, 220);
        shots.splice(shots.indexOf(shot), 1);
        await hitHero(s.power, { sure: true, crit: crit && k === 0 });
        E.frame = 0;
        await wait(s.hits > 2 ? 90 : 160);
      }
    } else {
      // corps à corps, en miroir de Kawazu
      var jump = s.id === 'saut';
      await tween(E, 'x', P.homeX + 78, 220);
      if (jump) { await tween(E, 'y', -60, 200); Sfx.play('swing'); await tween(E, 'y', 0, 140); shake = 6; }
      for (var h = 0; h < s.hits && P.hp > 0; h++) {
        E.frame = 1;
        await wait(60);
        E.frame = 2;
        E.fx = s.voie === 'baton' || E.weaponKind === 'mains' ? 1 : 0;
        E.palm = s.voie === 'ermite' ? 0.25 : 0;
        if (s.voie === 'baton') Sfx.play('swing');
        var dealt = await hitHero(s.power, { crit: crit && h === 0 });
        if (s.drain && dealt) { var heal = Math.round(dealt * s.drain); E.hp = Math.min(E.maxHp, E.hp + heal); floater(cx, GROUND - 60, '+' + heal, '#8fce52'); }
        if (s.stun && dealt && Math.random() < s.stun) { P.stun = 1; floater(P.x + 32, GROUND - 70, 'Étourdi !', '#f3d27a'); }
        await wait(120);
        E.fx = 0; E.frame = 3;
        await wait(90);
      }
      E.frame = 0;
      await tween(E, 'x', E.homeX, 200);
    }
    if (s.poison && P.hp > 0) { P.poison = s.poison; P.poisonDmg = Math.max(1, Math.round(E.dmg * 0.35 * (1 + E.poisonMult))); log(heroName() + ' est empoisonné.', 'danger'); }
    renderHud();
    if (P.hp <= 0) return defeat();
    await wait(200);
    playerTurn();
  }

  // ---------- L'arbre d'entraînement : il encaisse, ou fouette de ses branches si on l'a demandé ----------
  async function treeTurn() {
    if (!fight.riposte) {
      log('L’arbre encaisse sans broncher.');
      await wait(300);
      return playerTurn();
    }
    E.x -= 4; tween(E, 'x', E.homeX, 200);
    Sfx.play('swing');
    await wait(120);
    var dmg = await hitHero(1, {});
    if (dmg) { fight.stats.taken += dmg; log('L’arbre fouette de ses branches : ' + dmg + ' dégâts.', 'danger'); }
    renderHud();
    if (P.hp <= 0) return defeat();
    await wait(200);
    playerTurn();
  }
  // le bilan de l'entraînement
  async function trainingEnd() {
    over = true;
    renderHud();
    Sfx.play('ladder');
    log('Fin de l’entraînement !', 'hero');
    await wait(600);
    var st = fight.stats, turns = Math.max(1, fight.done);
    var row = function (label, v) { return '<li><span>' + label + '</span><b>' + v + '</b></li>'; };
    showEnd(true, '<ul class="bt-bilan">' + row('Dégâts en ' + turns + ' tours', st.total) + row('Par tour', Math.round(st.total / turns)) +
      row('Meilleur coup', st.best) + row('Critiques', st.crits + ' / ' + st.hits + ' coups') +
      (fight.riposte ? row('Dégâts reçus', st.taken) + row('PV restants', Math.max(0, Math.ceil(P.hp)) + ' / ' + P.maxHp) : '') + '</ul>' +
      '<p class="muted">Change d’équipement, de caractéristiques ou de sorts au camp, puis reviens comparer.</p>', 'Entraînement terminé', [['again', 'Recommencer'], ['back', 'Retour à la cascade']]);
  }
  // la fin d'un combat du dojo : le texte vient de fight.settle (réputation, XP…)
  async function settle(win) {
    fight.settled = true;
    var html;
    try { html = await fight.settle(win); } catch (e) { html = '<p>Le résultat n’a pas pu être enregistré : ' + (e.message || 'réessaie plus tard') + '.</p>'; }
    showEnd(win, html, null, fight.kind === 'tour'
      ? (win ? (fight.next ? [['next', 'Étage suivant ▶'], ['back', 'Retour à la tour']] : [['back', 'Retour à la tour']]) : [['again', 'Réessayer'], ['back', 'Retour à la tour']])
      : [['back', 'Retour à la cascade']]);
  }
  // la fin d'un combat du dojo ou de la tour ; buttons : [[action, libellé], …], le premier est le principal
  function showEnd(win, html, title, buttons) {
    var box = $('bt-result');
    box.innerHTML = '<h2>' + (title || (win ? 'Victoire !' : 'Défaite…')) + '</h2>' + html +
      '<div class="bt-result-actions">' + buttons.map(function (b, i) { return '<button class="btn' + (i ? ' btn-ghost' : '') + '" data-result="' + b[0] + '">' + b[1] + '</button>'; }).join('') + '</div>';
    box.hidden = false;
    box.dataset.win = win ? '1' : '0';
    box.querySelector('button').focus();
  }

  // ---------- Fin du combat ----------
  async function victory() {
    over = true;
    E.dead = true;
    Sfx.play(E.rank === 'boss' ? 'bossDown' : 'kill');
    burst(E.x + 24, GROUND - 30, '#f4f4e8', 30);
    log(E.name + ' est vaincu !', 'hero');
    renderHud();
    await wait(700);
    if (fight.settle) return settle(true);
    // récompenses
    var r = fight.rewards;
    var tier = fight.biomeIndex + 1;
    var loot = rollLoot(save, tier, r.itemChance, fight.luck);
    if (loot) save.owned.push(loot);
    if (fight.albumId) albumKill(save, fight.albumId);
    var levels = gainXp(save, r.xp);
    save.gold += r.gold;
    var unlocked = null;
    if (save.progress[fight.biomeIndex] < fight.stage) {
      save.progress[fight.biomeIndex] = fight.stage;
      if (fight.stage === STAGES && BIOMES[fight.biomeIndex + 1]) unlocked = BIOMES[fight.biomeIndex + 1];
    }
    writeSave(save);
    if (levels) Sfx.play('levelup'); else if (loot) Sfx.play('pickup');
    showResult(true, { xp: r.xp, gold: r.gold, loot: loot, levels: levels, unlocked: unlocked });
  }

  async function defeat() {
    over = true;
    P.dead = true;
    Sfx.play('ko');
    log(heroName() + ' est à terre…', 'danger');
    renderHud();
    await wait(900);
    if (fight.kind === 'arbre') return trainingEnd();
    if (fight.settle) return settle(false);
    showResult(false, {});
  }

  function showResult(win, info) {
    var box = $('bt-result');
    var html = '<h2>' + (win ? 'Victoire !' : 'Défaite…') + '</h2>';
    if (win) {
      html += '<p>+' + info.xp + ' XP · +' + info.gold + ' lucioles' + (info.levels ? ' · <b>Niveau ' + save.level + ' !</b> +' + info.levels * POINTS_PER_LEVEL + ' points de caractéristique, +' + info.levels + ' point de compétence' : '') + '</p>';
      if (info.loot) { var lr = RARITIES[rarityOf(info.loot)]; html += '<p class="bt-loot" style="--rar:' + lr.color + '"><img src="' + iconCanvas(ITEMS[info.loot]).toDataURL() + '" alt=""> Objet trouvé : <b>' + ITEMS[info.loot].name + '</b> <em>' + lr.name + '</em></p>'; }
      if (info.unlocked) html += '<p class="bt-unlock">Nouveau monde ouvert : <b>' + info.unlocked.name + '</b> !</p>';
    } else {
      html += '<p>' + heroName() + ' retourne au camp soigner ses blessures. Répartis tes points ou change d’équipement, puis réessaie !</p>';
    }
    var hasNext = win && fight.kind === 'stage' && fight.stage < STAGES;
    html += '<div class="bt-result-actions">' +
      (hasNext ? '<button class="btn" data-result="next">Étape suivante ▶</button>' : '') +
      '<button class="btn' + (hasNext ? ' btn-ghost' : '') + '" data-result="back">Retour</button></div>';
    box.innerHTML = html;
    box.hidden = false;
    box.dataset.win = win ? '1' : '0';
    box.querySelector('button').focus();
  }

  // ---------- Boucle d'animation ----------
  var last = 0;
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000) * speed();
    last = now;
    tweens = tweens.filter(function (tw) {
      tw.t += dt * 1000;
      var p = Math.min(1, tw.t / tw.dur);
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      tw.obj[tw.key] = tw.from + (tw.to - tw.from) * e;
      if (p >= 1) { tw.done(); return false; }
      return true;
    });
    floaters = floaters.filter(function (f) { f.t += dt; return f.t < 1.1; });
    particles = particles.filter(function (pt) { pt.life -= dt; pt.vy += 200 * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; return pt.life > 0; });
    if (E.flash > 0) E.flash -= dt;
    if (E.palm > 0) E.palm -= dt;
    if (P.hurt > 0) P.hurt -= dt;
    if (P.palm > 0) P.palm -= dt;
    shake = Math.max(0, shake - dt * 20);
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  function draw(now) {
    var sx = Math.round((Math.random() - 0.5) * shake), sy = Math.round((Math.random() - 0.5) * shake);
    ctx.save();
    ctx.translate(sx, sy);
    var zi = Math.max(0, 1 - (now - introT) / 800); // le dézoom d'ouverture
    if (zi > 0) { var zz = 1 + 0.22 * zi * zi; ctx.translate(W / 2, GROUND - 30); ctx.scale(zz, zz); ctx.translate(-W / 2, -(GROUND - 30)); }
    ctx.drawImage(bg, 0, 0, W, H, 0, 0, W, H);
    if (fight.bgFx) fight.bgFx(ctx, now); // un décor animé (l'eau de la cascade)
    if (fight.weather && fight.weather.id !== 'clair') drawWeather(now);

    // ombres
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(P.x + 32, GROUND - 2, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
    var es = enemySize(E);
    if (!E.dead) { ctx.beginPath(); ctx.ellipse(E.x + es / 2, GROUND - 2, es * 0.35, 4, 0, 0, Math.PI * 2); ctx.fill(); }

    // Kawazu (sprite 32 px dessiné ×2)
    if (!P.dead || Math.floor(now / 150) % 2) {
      var img = P.hurt > 0 ? HERO.hurt[0] : (P.frame ? HERO.atk[P.frame] || HERO.atk[1] : HERO.idle[Math.floor(now / 500) % 2]);
      ctx.globalAlpha = P.alpha == null ? 1 : P.alpha;
      var hs = Math.round(64 * P.size);
      ctx.drawImage(img, Math.round(P.x + 32 - hs / 2), Math.round(GROUND - hs + P.y), hs, hs);
      ctx.globalAlpha = 1;
      if (P.fx && HERO.fx[1]) ctx.drawImage(HERO.fx[P.frame] || HERO.fx[1], Math.round(P.x) + 56, GROUND - 64, 64, 64);
      if (P.palm > 0) {
        ctx.strokeStyle = 'rgba(243,210,122,' + (P.palm * 3).toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(P.x + 76, GROUND - 28, 14 + (0.25 - P.palm) * 60, 0, Math.PI * 2); ctx.stroke();
      }
      if (P.guard > 0) {
        ctx.strokeStyle = 'rgba(201,224,122,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(P.x + 32, GROUND - 32, 30, 36, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // ennemi
    if (!E.dead && E.frog) {
      var fimg = E.flash > 0 ? ENEMY.hurt[0] : (E.frame ? ENEMY.atk[E.frame] || ENEMY.atk[1] : ENEMY.idle[Math.floor(now / 500) % 2]);
      ctx.globalAlpha = E.alpha == null ? 1 : E.alpha;
      ctx.drawImage(fimg, Math.round(E.x), Math.round(GROUND - es + E.y), es, es);
      ctx.globalAlpha = 1;
      if (E.fx && ENEMY.fx[1]) ctx.drawImage(ENEMY.fx[E.frame] || ENEMY.fx[1], Math.round(E.x - 56 * es / 64), GROUND - es, es, es);
      if (E.palm > 0) {
        ctx.strokeStyle = 'rgba(243,210,122,' + (E.palm * 3).toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(E.x + es / 2 - 44, GROUND - 28, 14 + (0.25 - E.palm) * 60, 0, Math.PI * 2); ctx.stroke();
      }
      if (E.guard > 0) {
        ctx.strokeStyle = 'rgba(201,224,122,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(E.x + es / 2, GROUND - es / 2, es * 0.47, es * 0.56, 0, 0, Math.PI * 2); ctx.stroke();
      }
    } else if (!E.dead) {
      if (E.rarity && E.rarity !== 'commun') { // l'aura d'un monstre rare ou épique
        var ac = RARITIES[E.rarity].color, pulse = 0.25 + 0.12 * Math.sin(now / 250), acx = E.x + es / 2, acy = GROUND - es / 2;
        var ag = ctx.createRadialGradient(acx, acy, 2, acx, acy, es * 0.75);
        ag.addColorStop(0, ac + Math.round(pulse * 255).toString(16).padStart(2, '0')); ag.addColorStop(1, ac + '00');
        ctx.fillStyle = ag; ctx.fillRect(acx - es, acy - es, es * 2, es * 2);
        ctx.fillStyle = ac;
        for (var sp2 = 0; sp2 < (E.rarity === 'epique' ? 6 : 3); sp2++) { var an = now / 600 + sp2 * 2.1; ctx.fillRect(Math.round(acx + Math.cos(an) * es * 0.55), Math.round(acy + Math.sin(an * 1.3) * es * 0.45), 2, 2); }
      }
      var f = Math.floor(now / (E.behavior === 'flyer' ? 90 : 400)) % 2;
      var hover = E.behavior === 'flyer' ? -10 + Math.round(Math.sin(now / 200) * 3) : 0;
      var shakeE = E.charging ? Math.round(Math.sin(now / 25) * 1.5) : 0;
      ctx.drawImage((E.flash > 0 ? ENEMY.flash : ENEMY.frames)[f], Math.round(E.x) + shakeE, GROUND - es + hover, es, es);
      if (E.charging) { ctx.fillStyle = '#e05a4a'; ctx.fillRect(Math.round(E.x + es / 2) - 1, GROUND - es - 12 + hover, 2, 6); ctx.fillRect(Math.round(E.x + es / 2) - 1, GROUND - es - 4 + hover, 2, 2); }
    }

    // kunaïs en vol
    shots.forEach(function (s) { ctx.drawImage(s.img || KUNAI, Math.round(s.x) - 12, Math.round(s.y) - 12, 24, 24); });

    particles.forEach(function (pt) { ctx.fillStyle = pt.c; ctx.fillRect(Math.round(pt.x), Math.round(pt.y), 2, 2); });

    // chiffres qui montent
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    floaters.forEach(function (fl) {
      var y = fl.y - fl.t * 26;
      ctx.globalAlpha = Math.min(1, 2 - fl.t * 1.8);
      ctx.fillStyle = '#1a1c2c';
      ctx.fillText(fl.text, fl.x + 1, y + 1);
      ctx.fillStyle = fl.col;
      ctx.fillText(fl.text, fl.x, y);
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawWeather(now) {
    var id = fight.weather.id;
    if (id === 'averse') {
      ctx.fillStyle = 'rgba(160,190,220,0.45)';
      for (var i = 0; i < 60; i++) {
        var x = (i * 53 + now * 0.25) % W, y = (i * 97 + now * 0.5) % H;
        ctx.fillRect(Math.round(x), Math.round(y), 1, 4);
      }
    } else if (id === 'brume') {
      ctx.fillStyle = 'rgba(200,215,200,0.12)';
      for (var b = 0; b < 5; b++) ctx.fillRect(Math.round(((b * 90 + now * 0.01) % (W + 80)) - 60), 60 + b * 18, 110, 14);
    } else if (id === 'lune') {
      ctx.fillStyle = 'rgba(230,232,200,0.9)';
      ctx.beginPath(); ctx.arc(W - 50, 26, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(120,130,200,0.08)'; ctx.fillRect(0, 0, W, H);
    } else if (id === 'nuit') {
      ctx.fillStyle = 'rgba(0,0,20,0.35)'; ctx.fillRect(0, 0, W, H);
    } else if (id === 'canicule') {
      ctx.fillStyle = 'rgba(255,160,60,0.1)'; ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------- Démarrage ----------
  function start(gameSave, f, callback) {
    save = gameSave; fight = f; onEnd = callback;
    token++;
    weapon = weaponOf(save.equip);
    var cs = combatStats(computeStats(save.equip));
    var pas = treeBonuses(save).passives;
    var maxHp = Math.round(cs.maxHp * (1 + pas.hpMult));
    P = {
      x: MARGIN, homeX: MARGIN, y: 0, frame: 0, fx: 0, palm: 0, hurt: 0, alpha: 1, dead: false,
      hp: maxHp, maxHp: maxHp, dmg: cs.dmg * (1 + pas.dmgMult), crit: cs.crit + pas.crit, dodge: Math.min(0.5, cs.dodge + pas.dodge), agi: cs.agi,
      size: 1 + pas.size, // la Croissance fait grandir la grenouille
      souffle: f.weather && f.weather.noStartSouffle ? 0 : 1, maxSouffle: cs.maxSouffle, regen: cs.regen + pas.regen,
      dmgReduce: pas.dmgReduce, riposte: pas.riposte, poisonMult: pas.poisonMult,
      cds: {}, guard: 0, buff: 0, shadow: false, shadowCrit: false, poison: 0, poisonDmg: 0, stun: 0,
      skills: deckSkills(save, weapon)
    };
    var en = f.enemy;
    var size = enemySize(en);
    E = Object.assign({}, en, { hp: en.maxHp, x: W - MARGIN - size, homeX: W - MARGIN - size, flash: 0, turn: 0, stun: 0, poison: 0, poisonDmg: 0, charging: false, enraged: false, dead: false,
      y: 0, frame: 0, fx: 0, palm: 0, alpha: 1, cds: {}, souffle: 1, guard: 0, buff: 0, shadow: false, shadowCrit: false });
    tweens = []; floaters = []; particles = []; shots = []; shake = 0;
    busy = true; over = false; introT = performance.now();
    bg = f.backdrop || buildBackground(BIOMES[f.biomeIndex]);
    $('battle').style.background = f.backdrop ? '#1a1108' : BIOMES[f.biomeIndex].pal.groundDark;
    buildHero();
    buildEnemyImgs(E);
    $('bt-log').innerHTML = '';
    $('bt-result').hidden = true;
    $('bt-title').textContent = f.title || BIOMES[f.biomeIndex].name + ' · étape ' + f.stage + ' / ' + STAGES;
    $('bt-hero-name').textContent = heroName();
    $('bt-weather').textContent = f.weather && f.weather.id !== 'clair' ? f.weather.name + ' : ' + f.weather.desc : '';
    $('bt-weather').hidden = !(f.weather && f.weather.id !== 'clair');
    $('battle').hidden = false;
    resize();
    if (f.kind === 'duel') log('Duel à la cascade contre ' + E.name + ', la grenouille de ' + E.pseudo + ' (niv. ' + E.level + ') !', 'danger');
    else if (f.kind === 'arbre') log('L’arbre d’entraînement t’attend : ' + f.turns + ' tours pour tout essayer.', 'hero');
    else if (f.kind === 'tour') log(f.intro, 'danger');
    else log('Un ' + E.name + ' (niv. ' + E.level + ') barre la route !', 'danger');
    if (E.rarity === 'rare') log('Une créature rare : plus coriace, et un meilleur butin !', 'hero');
    if (E.rarity === 'epique') log('Une créature ÉPIQUE ! Rare de la croiser… son butin l’est aussi.', 'hero');
    if (E.rank === 'boss') Sfx.play('boss');
    renderHud();
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    // l'Agilité décide qui commence
    var t = token;
    setTimeout(function () {
      if (t !== token) return;
      if (P.agi >= E.agi) { log(heroName() + ' est plus vif : à toi de commencer.', 'hero'); playerTurn(); }
      else { log(E.name + ' est plus vif : il attaque le premier.', 'danger'); busy = true; renderHud(); enemyTurn(); }
    }, 700 / speed());
  }

  function close(result) {
    token++;
    cancelAnimationFrame(raf);
    $('battle').hidden = true;
    if (onEnd) onEnd(result, fight);
  }

  // ---------- Contrôles ----------
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t || $('battle').hidden) return;
    if (!$('battle').contains(t)) return;
    if (t.dataset.skill) { Sfx.play('click'); act(skillById(t.dataset.skill)); return; }
    if (t.id === 'bt-auto') {
      save.battle.auto = !save.battle.auto; writeSave(save); renderHud(); Sfx.play('click');
      if (save.battle.auto && !busy && !over) act(autoPick());
      return;
    }
    if (t.dataset.speed) { save.battle.speed = +t.dataset.speed; writeSave(save); renderHud(); Sfx.play('click'); return; }
    if (t.id === 'bt-flee') { if (!over) { Sfx.play('click'); close('flee'); } return; }
    if (t.dataset.result) {
      var win = $('bt-result').dataset.win === '1';
      if (t.dataset.result === 'again') { start(save, fight.again(), onEnd); return; }
      if (t.dataset.result === 'next') {
        var nf = fight.next ? fight.next() : stageFight(save, fight.biomeIndex, fight.stage + 1);
        start(save, nf, onEnd);
      } else close(win ? 'win' : 'lose');
    }
  });
  window.addEventListener('keydown', function (e) {
    if ($('battle').hidden || over) return;
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9 && P.skills[n - 1]) act(P.skills[n - 1]);
    if (e.code === 'KeyA') { $('bt-auto').click(); }
  });

  return { start: start };
})();
