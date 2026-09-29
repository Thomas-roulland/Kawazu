// Duel au tour par tour : la grenouille du joueur contre un ennemi, dans le décor du biome.
// Chaque tour, on choisit un sort du deck. Plus de réserve à gérer : chaque sort a son temps de relance (en tours),
// que l'Esprit raccourcit. Les sorts posent des effets : saignement, poison, marque, étourdissement, affaiblissement,
// garde, ombre, bouclier… L'ennemi a ses tactiques (charge préparée, vol de vie, englue, rage du boss).
// Mode auto et vitesse ×1/×2/×4.
// BattleScene.start(save, fight, onEnd) ; onEnd(résultat, fight) avec résultat = 'win' | 'lose' | 'flee'.
// À la Cascade des Duels (fight.kind 'duel' ou 'arbre') et à la Tour : l'adversaire peut être la grenouille d'un
// autre joueur ou d'un sage (enemy.frog : mêmes règles et mêmes sorts que Kawazu, choisis par l'ordinateur), ou l'arbre
// d'entraînement (fight.turns tours, puis le bilan des dégâts). fight.settle(victoire) donne le texte du résultat.
var BattleScene = (function () {
  // L'arène fait 400×225 pixels et remplit tout l'écran ; les secousses restent douces.
  var W = 400, H = 225, GROUND = 165, MARGIN = 64;
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('bt-canvas');
  var ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;
  ctx.imageSmoothingEnabled = false;
  var sp = buildKawazu();
  var R = Math.round;

  var save, fight, onEnd, weapon, bg;
  var P, E; // combattants : P la grenouille du joueur (tournée vers la droite), E l'adversaire (vers la gauche)
  var busy = false, over = false, raf = 0, token = 0;
  var tweens = [], floaters = [], particles = [], shots = [], fxs = [], shake = 0;

  // Le décor remplit tout l'écran (quitte à rogner les bords), sans jamais couper les deux combattants ;
  // sur un écran très étroit, le décor flouté comble ce qui reste
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
  // interpolation d'une propriété numérique (rendu par la boucle d'animation) ; lin : sans accélération
  function tween(obj, key, to, ms, lin) {
    return new Promise(function (res) {
      tweens.push({ obj: obj, key: key, from: obj[key], to: to, t: 0, dur: ms, done: res, lin: lin });
    });
  }
  function sfx(name) { Sfx.play(name); }

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
  function heroImgs() {
    var anims = buildKawazuAnims(dressKawazu(sp, lookFor(save.equip)));
    var pal = paletteFor(sp.PAL, save.equip);
    var imgs = function (frames) { return frames.map(function (g) { return g ? gridToCanvas(g, pal) : null; }); };
    return { idle: imgs(anims.idleRight.frames), atk: imgs(anims.attack.frames), hurt: imgs(anims.hurt.frames), kick: imgs(anims.kick.frames), fx: imgs(buildFx(weaponFx(weapon))) };
  }
  function monsterImgs(e) {
    var s = SPECIES[e.species];
    var pal = rarityPal(Object.assign({}, s.pal, e.pal || {}), e.rarity);
    return { frames: s.frames.map(function (f) { return stringsToCanvas(f, pal, false); }), flash: s.frames.map(function (f) { return stringsToCanvas(f, pal, false, true); }) };
  }
  // Tout ce qu'un combattant porte d'effets et d'états (dir : 1 tourné vers la droite, -1 vers la gauche)
  function arm(f, dir, x) {
    return Object.assign(f, {
      dir: dir, x: x, homeX: x, y: 0, rot: 0, frame: 0, pose: null, fx: 0, palm: 0, hurt: 0, alpha: 1, dead: false,
      cds: {}, guard: 0, counter: 0, buff: 0, buffFresh: false, shadow: false, shadowCrit: false, poison: 0, poisonDmg: 0,
      bleed: 0, bleedDmg: 0, mark: 0, weaken: 0, stun: 0, shield: 0, riposteDue: false,
      pas: f.pas || emptyPassives(), spell: f.spell || 1, cdr: f.cdr || 0, critMult: f.critMult || 1.5,
      crit: f.crit == null ? 0.05 : f.crit, dmgReduce: f.dmgReduce || 0, knives: kunaiProjectileImgs(f.blade || ITEMS.kunai_acier.blade)
    });
  }
  function alive(f) { return f.hp > 0 && !f.dead; }
  function nameOf(f) { return f === P ? heroName() : E.name; }
  function heroName() { return save.hero ? save.hero.name : 'Kawazu'; }

  // Géométrie : taille du sprite, centre, poitrine, avant (là où frappe l'arme)
  function fsz(f) { return f === P ? R(64 * P.size) : enemySize(E); }
  function midX(f) { return f === P ? P.x + 32 : E.x + enemySize(E) / 2; }
  function homeMid(f) { return f === P ? P.homeX + 32 : E.homeX + enemySize(E) / 2; }
  function chestY(f) { return GROUND - fsz(f) * 0.42 + f.y + (f.behavior === 'flyer' ? -10 : 0); }
  function headY(f) { return GROUND - fsz(f) * 0.8 + f.y + (f.behavior === 'flyer' ? -10 : 0); }
  function frontX(f) { return midX(f) + f.dir * fsz(f) * 0.36; }
  // la place de l'attaquant quand il vient frapper au contact (dist : écart entre les deux centres)
  function near(att, def, dist) {
    var c = homeMid(def) - att.dir * dist * (1 + (fsz(def) / 64 - 1) * 0.4);
    return att === P ? c - 32 : c - enemySize(E) / 2;
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
  function tell(f, text) { log(text, f === P ? 'hero' : 'danger'); }

  function statusText(f) {
    var s = [];
    if (f.shield > 0) s.push('Bouclier ' + Math.ceil(f.shield));
    if (f.guard > 0) s.push('Garde ' + f.guard + (f.counter > 0 ? ' · riposte' : ''));
    if (f.buff > 0) s.push('Dégâts +40 % (' + f.buff + ')');
    if (f.shadow) s.push('Ombre');
    if (f.poison > 0) s.push('Poison ' + f.poison);
    if (f.bleed > 0) s.push('Saigne ' + f.bleed);
    if (f.mark > 0) s.push('Marqué ' + f.mark);
    if (f.weaken > 0) s.push('Affaibli ' + f.weaken);
    if (f.stun > 0) s.push('Étourdi');
    if (f.charging) s.push('Prépare une charge !');
    if (f.enraged) s.push('Enragé');
    return s.join(' · ');
  }

  function renderHud() {
    $('bt-hero-hp').style.width = Math.max(0, P.hp / P.maxHp * 100) + '%';
    $('bt-hero-hptext').textContent = Math.max(0, Math.ceil(P.hp)) + ' / ' + P.maxHp;
    $('bt-hero-status').textContent = statusText(P);
    $('bt-enemy-name').textContent = E.name;
    $('bt-enemy-name').style.color = E.rarity && E.rarity !== 'commun' ? RARITIES[E.rarity].color : '';
    if (fight.kind === 'arbre') {
      $('bt-enemy-lvl').textContent = 'Tour ' + Math.min(fight.turns, fight.done + 1) + ' / ' + fight.turns;
      $('bt-enemy-hp').style.width = '100%';
      $('bt-enemy-hptext').textContent = 'Dégâts : ' + fight.stats.total;
    } else {
      $('bt-enemy-lvl').textContent = fight.kind === 'raid' ? 'Niv. ' + E.level + ' · ALPHA · tour ' + Math.min(fight.turns, fight.done + 1) + ' / ' + fight.turns : 'Niv. ' + E.level + (E.rank === 'boss' ? ' · BOSS' : (E.rank === 'elite' ? ' · ÉLITE' : (E.frog ? (E.rank === 'sage' ? ' · SAGE' : (fight.kind === 'guerre' ? ' · GUERRE' : ' · DUEL')) : ''))) + (E.rarity && E.rarity !== 'commun' ? ' · ' + RARITIES[E.rarity].name.toUpperCase() : '');
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

  function ready(f, s) { return !(f.cds[s.id] > 0); }
  function renderSkills() {
    $('bt-skills').innerHTML = P.skills.map(function (s, i) {
      var left = P.cds[s.id] || 0, cd = skillCd(s, P.cdr);
      var meta = left ? 'prêt dans ' + left + ' tour' + (left > 1 ? 's' : '') : (s.base ? 'attaque de base' : 'relance ' + cd + ' tour' + (cd > 1 ? 's' : ''));
      return '<button class="bt-skill' + (left ? ' on-cd' : '') + '" data-skill="' + s.id + '"' + (!left && !busy && !over ? '' : ' disabled') +
        ' style="--voie:' + voieDef(s.voie).color + '" title="' + s.desc + '">' +
        '<span class="bt-key">' + (i + 1) + '</span><span class="bt-sname">' + s.name + '</span>' +
        '<span class="bt-smeta">' + meta + '</span>' + (left ? '<b class="bt-cd">' + left + '</b>' : '') + '</button>';
    }).join('');
  }

  // ---------- Petits effets ----------
  function floater(x, y, text, col) { floaters.push({ x: x, y: y, text: text, col: col, t: 0 }); }
  function burst(x, y, col, n, spread) {
    for (var i = 0; i < n; i++) {
      particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * (spread || 120), vy: -30 - Math.random() * 80, life: 0.5 + Math.random() * 0.4, c: col, g: 200 });
    }
  }
  // des éclats qui volent sans retomber (énergie, étincelles)
  function sparks(x, y, col, n, sp) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = (sp || 60) * (0.5 + Math.random());
      particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.3 + Math.random() * 0.3, c: col, g: 0 });
    }
  }
  // des cailloux qui jaillissent du sol
  function rocks(x, n) {
    for (var i = 0; i < n; i++) particles.push({ x: x + (Math.random() - 0.5) * 40, y: GROUND - 2, vx: (Math.random() - 0.5) * 140, vy: -60 - Math.random() * 110, life: 0.6 + Math.random() * 0.4, c: i % 3 ? '#6b5a3e' : '#b3a07a', g: 320, big: true });
  }
  // un effet dessiné pendant dur secondes ; draw(k de 0 à 1, now)
  function addFx(dur, draw) { var e = { t: 0, dur: dur, draw: draw }; fxs.push(e); return e; }
  function heal(f, n) {
    n = Math.max(0, Math.min(f.maxHp - f.hp, Math.round(n)));
    if (!n) return;
    f.hp += n;
    floater(midX(f), headY(f), '+' + n, '#8fce52');
  }

  // Dessin en pixels : arcs, anneaux, lignes (tout reste net, comme le reste du jeu)
  function pxArc(cx, cy, r, a0, a1, th, col) {
    var n = Math.max(6, Math.ceil(Math.abs(a1 - a0) * r * 1.2));
    ctx.fillStyle = col;
    for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; ctx.fillRect(R(cx + Math.cos(a) * r - th / 2), R(cy + Math.sin(a) * r - th / 2), th, th); }
  }
  function pxRing(cx, cy, rx, ry, th, col, dotted) {
    var n = Math.max(12, Math.ceil((rx + ry) * 3));
    ctx.fillStyle = col;
    for (var i = 0; i < n; i++) { if (dotted && i % 2) continue; var a = i / n * Math.PI * 2; ctx.fillRect(R(cx + Math.cos(a) * rx - th / 2), R(cy + Math.sin(a) * ry - th / 2), th, th); }
  }
  function pxLine(x0, y0, x1, y1, th, col) {
    var n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    ctx.fillStyle = col;
    for (var i = 0; i <= n; i++) ctx.fillRect(R(x0 + (x1 - x0) * i / n - th / 2), R(y0 + (y1 - y0) * i / n - th / 2), th, th);
  }
  function alpha(col, a) { ctx.globalAlpha = Math.max(0, Math.min(1, a)); return col; }

  // L'entaille d'un sabre : un croissant qui se dessine d'un coup puis s'efface (ang : sa direction)
  // Un croissant plein qui passe par (x, y) et s'y bombe dans la direction ang ; il ne couvre que les angles a0 → a1
  // du cercle (pour qu'il se dessine d'un coup) ; thick : son épaisseur au milieu
  function crescent(x, y, r, ang, a0, a1, thick, col, alpha) {
    var cx = x - Math.cos(ang) * r, cy = y - Math.sin(ang) * r;
    ctx.globalAlpha = Math.max(0, alpha); ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.arc(cx - Math.cos(ang) * thick, cy - Math.sin(ang) * thick, r, a1, a0, true); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // L'entaille d'une lame : un grand croissant qui se dessine d'un trait (lueur de la lame, cœur blanc), puis s'efface
  function slashFx(x, y, r, ang, col, dur) {
    addFx(dur || 0.42, function (k) {
      var grow = Math.min(1, k / 0.18), fade = k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65, h = 1.05, a0 = ang - h, a1 = ang - h + 2 * h * grow;
      crescent(x, y, r + 6, ang, a0, a1, 16, col, 0.22 * fade);   // le halo
      crescent(x, y, r, ang, a0, a1, 10, col, 0.7 * fade);        // la lueur de la lame
      crescent(x, y, r, ang, a0, a1, 4, '#ffffff', fade);         // le cœur blanc
    });
    sparks(x, y, '#ffffff', 10, 90);
    sparks(x, y, col, 6, 60);
  }
  // Une onde de choc au sol, qui s'élargit
  function shockFx(x, big, col) {
    addFx(0.45, function (k) {
      ctx.globalAlpha = 1 - k;
      pxRing(x, GROUND - 2, 10 + k * (big ? 70 : 38), 3 + k * (big ? 10 : 6), 2, col || '#e8e0c8');
      pxRing(x, GROUND - 2, 4 + k * (big ? 40 : 22), 2 + k * 5, 1, '#ffffff', true);
      ctx.globalAlpha = 1;
    });
  }
  // Des anneaux qui partent d'un point vers l'avant (cri, coassement)
  function ringsFx(f, col) {
    var x = frontX(f), y = GROUND - fsz(f) * 0.62, dir = f.dir;
    addFx(0.7, function (k) {
      for (var i = 0; i < 3; i++) {
        var kk = k * 1.4 - i * 0.2;
        if (kk <= 0 || kk >= 1) continue;
        ctx.globalAlpha = 1 - kk;
        pxArc(x + dir * kk * 120, y, 6 + kk * 22, dir > 0 ? -1 : Math.PI - 1, dir > 0 ? 1 : Math.PI + 1, 2, col);
      }
      ctx.globalAlpha = 1;
    });
  }
  // Des étoiles qui tournent autour de la tête d'un étourdi
  function starsAbove(f, now) {
    var cx = midX(f), cy = headY(f) - 8;
    for (var i = 0; i < 3; i++) {
      var a = now / 260 + i * 2.1, x = cx + Math.cos(a) * 11, y = cy + Math.sin(a) * 3;
      ctx.fillStyle = '#f3d27a'; ctx.fillRect(R(x) - 1, R(y), 3, 1); ctx.fillRect(R(x), R(y) - 1, 1, 3);
    }
  }
  // Une étoile de shuriken à 4 branches, qui tourne (s : rayon, col : lame, col2 : ombre)
  function drawStar(x, y, s, rot, col, col2) {
    for (var b = 0; b < 4; b++) {
      var a = rot + b * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
      for (var d = 1; d <= s; d++) {
        var w = Math.max(0, Math.round((s - d) * 0.45));
        for (var o = -w; o <= w; o++) {
          ctx.fillStyle = o < 0 ? col2 : col;
          ctx.fillRect(R(x + ca * d - sa * o), R(y + sa * d + ca * o), 1, 1);
        }
      }
    }
    ctx.fillStyle = '#1a1c2c'; ctx.fillRect(R(x), R(y), 1, 1);
  }

  // ---------- Projectiles ----------
  // Un projectile vole de from à to en ms ; h : hauteur de la parabole ; draw(shot, x, y, now) le dessine
  function fly(from, to, ms, draw, h) {
    var shot = { p: 0, x0: from.x, y0: from.y, x1: to.x, y1: to.y, h: h || 0, draw: draw };
    shots.push(shot);
    return tween(shot, 'p', 1, ms, true).then(function () { var i = shots.indexOf(shot); if (i >= 0) shots.splice(i, 1); });
  }
  function shotPos(s) { return { x: s.x0 + (s.x1 - s.x0) * s.p, y: s.y0 + (s.y1 - s.y0) * s.p - s.h * 4 * s.p * (1 - s.p) }; }
  function knifeDraw(f, dirName) { return function (s, x, y) { ctx.drawImage(f.knives[dirName || (f.dir > 0 ? 'right' : 'left')], R(x) - 12, R(y) - 12, 24, 24); }; }
  function starDraw(f, size, water) {
    var col = f.blade || '#d9e1e6', col2 = (f.wave && f.wave[1]) || '#7d8694';
    if (water) { col = '#9cd8f8'; col2 = '#3a7fc9'; }
    return function (s, x, y, now) {
      drawStar(x, y, size, now / 45, col, col2);
      if (water && Math.random() < 0.6) particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 20, life: 0.35, c: Math.random() < 0.5 ? '#bfe8ff' : '#5fa3e0', g: 160 });
    };
  }
  // ce que lance la grenouille : des étoiles pour un shuriken, des kunaïs sinon
  function thrownDraw(f, dirName) { return f.wtype === 'shuriken' ? starDraw(f, 5, /eau|rosee|maree/.test(f.weaponId || '')) : knifeDraw(f, dirName); }
  function from(f) { return { x: frontX(f), y: chestY(f) - 2 }; }
  function to(f, dy) { return { x: midX(f) - (f.dir < 0 ? 6 : -6), y: chestY(f) + (dy || 0) }; }

  // ---------- Les coups ----------
  // Un coup d'un combattant sur l'autre : esquive, critique, marque, garde, armure, bouclier, vol de vie, riposte
  async function strike(att, def, mult, opts) {
    opts = opts || {};
    var w = fight.weather || {}, cx = midX(def), cy = chestY(def);
    var dodge = def.dodge + (def === E ? (w.enemyDodge || 0) : 0);
    if (def.shadow) { def.shadow = false; dodge = 1; } // l'ombre esquive à coup sûr, même un kunaï
    else if (opts.sure) dodge = 0;
    if (Math.random() < dodge) {
      floater(cx, cy - 8, 'Esquive', '#c9d6e3');
      log(nameOf(def) + ' esquive !', def === P ? 'hero' : '');
      sfx('swing');
      var x0 = def.x; def.x -= def.dir * 10; tween(def, 'x', x0, 160);
      return 0;
    }
    var crit = opts.crit || Math.random() < att.crit + (w.crit || 0) + (opts.critBonus || 0);
    var dmg = att.dmg * mult * (att.buff > 0 ? 1.4 : 1) * (crit ? att.critMult : 1) * (0.9 + Math.random() * 0.2);
    if (att.weaken > 0) dmg *= 0.7;
    if (def.mark > 0) dmg *= 1.3;
    if (att.pas.execute && def.hp < def.maxHp * 0.3) dmg *= 1 + att.pas.execute;
    if (!opts.pierce) { if (def.guard > 0) dmg *= 0.5; dmg *= 1 - (def.dmgReduce || 0); }
    dmg = Math.max(1, Math.round(dmg));
    var taken = dmg;
    if (def.shield > 0) { var ab = Math.min(def.shield, dmg); def.shield -= ab; taken -= ab; if (ab) floater(cx + 10, cy - 18, '(' + ab + ')', '#9cd8f8'); }
    def.hp -= taken;
    if (att === P && fight.stats) { var st = fight.stats; st.total += dmg; st.hits++; if (crit) st.crits++; st.best = Math.max(st.best, dmg); }
    if (def === P && fight.stats) fight.stats.taken = (fight.stats.taken || 0) + taken;
    def.hurt = def === P ? 0.35 : 0.15;
    shake = Math.max(shake, opts.heavy ? 6 : (crit ? 4 : 2));
    burst(cx, cy, def === P ? '#e05a4a' : '#f4f4e8', crit ? 14 : 8);
    floater(cx, cy - 8, (crit ? 'CRIT ' : '') + dmg, def === P ? '#ff8a7a' : (crit ? '#f3d27a' : '#ffffff'));
    sfx(def === P ? 'hurt' : 'hit');
    var kb = -def.dir * (opts.heavy ? 10 : 6);
    def.x += kb; tween(def, 'x', def.x - kb, 160);
    if (att.pas.lifesteal) heal(att, dmg * att.pas.lifesteal);
    if (def.hp > 0 && !opts.noRiposte && (def.counter > 0 || Math.random() < def.pas.riposte)) def.riposteDue = true;
    return dmg;
  }
  // Après les coups d'un tour : celui qui a été frappé riposte, s'il le peut (une fois)
  async function ripostes(att, def) {
    if (!def.riposteDue || !alive(def) || !alive(att)) { def.riposteDue = false; return; }
    def.riposteDue = false;
    await wait(150);
    tell(def, nameOf(def) + ' riposte !');
    var d = def.dir, x0 = def.x;
    def.frame = 2; def.x += d * 10;
    slashFx(midX(att), chestY(att), 20, d > 0 ? 0 : Math.PI, (def.wave && def.wave[0]) || '#f3d27a', 0.28);
    sfx('slash');
    await strike(def, att, def.counter > 0 ? 0.8 : 0.5, { sure: true, noRiposte: true });
    await wait(120);
    def.frame = 0; tween(def, 'x', x0, 140);
  }

  // Les effets d'un sort qui touche : vol de vie, étourdissement, saignement, poison, marque, affaiblissement
  function afterHit(att, def, s, dealt) {
    if (s.drain) heal(att, dealt * s.drain);
    if (!alive(def)) return;
    if (s.stun && !def.stunImmune && Math.random() < s.stun + att.pas.stunChance) {
      if (!def.stun) floater(midX(def), headY(def) - 6, 'Étourdi !', '#f3d27a');
      def.stun = 1;
    }
    if (s.bleed) { if (!def.bleed) tell(att, nameOf(def) + ' saigne.'); def.bleed = s.bleed; def.bleedDmg = Math.max(1, Math.round(att.dmg * 0.3 * (1 + att.pas.bleedMult))); }
    if (s.poison) { if (!def.poison) tell(att, 'Le poison ronge ' + nameOf(def) + '.'); def.poison = s.poison; def.poisonDmg = Math.max(1, Math.round(att.dmg * 0.35 * (1 + att.pas.poisonMult))); }
    if (s.mark) { if (!def.mark) { tell(att, 'La marque est posée sur ' + nameOf(def) + ' : +30 % de dégâts reçus.'); floater(midX(def), headY(def) - 12, 'Marqué !', '#ff8a7a'); } def.mark = s.mark; }
    if (s.weaken) { if (!def.weaken) floater(midX(def), headY(def) - 18, 'Affaibli', '#9cc7e0'); def.weaken = s.weaken; }
  }
  // Fabrique le coup n°k d'un sort (k = 0 le premier ; extra : un multiplicateur en plus)
  function hitter(att, def, s, firstCrit) {
    var mult = s.power * (s.base ? 1 : att.spell), sure = s.voie === 'kunai' || !!s.sure;
    return async function (k, extra, heavy) {
      if (!alive(def)) return 0;
      var dealt = await strike(att, def, mult * (extra || 1), { sure: sure, pierce: s.pierce, crit: firstCrit && k === 0, critBonus: s.critBonus, heavy: heavy });
      if (dealt) afterHit(att, def, s, dealt);
      renderHud();
      return dealt;
    };
  }

  // ---------- L'arme en main ----------
  // Katana, bâton, masse, harpon : l'arme est dessinée dans la main de la grenouille et balaie un arc pendant le coup
  // (a : son angle, 0 = pointée devant, −2 = levée derrière la tête, +1 = baissée devant), avec une traînée de lumière.
  var HELD = { katana: 30, baton: 34, masse: 24, harpon: 36 };
  function holds(f) { return !!HELD[f.wtype]; }
  function raise(f, a) { if (holds(f)) f.sword = { a: a, trail: [] }; }
  function swingTo(f, a, ms) { return f.sword ? tween(f.sword, 'a', a, ms, true) : wait(ms); }
  function sheathe(f) { f.sword = null; }
  function drawSword(f) {
    var sw = f.sword;
    if (!sw) return;
    var s = fsz(f) / 64, d = f.dir, hx = midX(f) + d * 20 * s, hy = chestY(f) + 3 * s;
    var th = (d > 0 ? sw.a : Math.PI - sw.a) + f.rot, c = Math.cos(th), sn = Math.sin(th), len = HELD[f.wtype] * s;
    var at = function (k) { return { x: hx + c * k, y: hy + sn * k }; }, ln = function (p, q, t, col) { pxLine(p.x, p.y, q.x, q.y, t, col); };
    var tip = at(len), blade = f.blade || '#d9e1e6', glow = f.wtype === 'katana' ? '#ffffff' : ((f.wave && f.wave[0]) || '#ffffff');
    sw.trail.push(tip);
    if (sw.trail.length > 6) sw.trail.shift();
    if (sw.trail.length > 2 && Math.hypot(sw.trail[0].x - tip.x, sw.trail[0].y - tip.y) > 6) { // la traînée : un éventail de lumière
      ctx.globalAlpha = 0.45; ctx.fillStyle = glow;
      ctx.beginPath(); ctx.moveTo(hx, hy); sw.trail.forEach(function (p) { ctx.lineTo(p.x, p.y); }); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (f.wtype === 'katana') {
      ln(at(-7 * s), at(1 * s), 3, f.hilt || '#3e1a12');  // la poignée tressée
      ln({ x: hx + c * 2 * s - sn * 4 * s, y: hy + sn * 2 * s + c * 4 * s }, { x: hx + c * 2 * s + sn * 4 * s, y: hy + sn * 2 * s - c * 4 * s }, 2, '#e0b43a'); // la garde
      ln(at(3 * s), tip, 3, blade);                        // la lame
      ln(at(4 * s), at(len - 1), 1, '#ffffff');            // son fil, qui brille
    } else if (f.wtype === 'baton') {
      ln(at(-10 * s), tip, 3, '#8d6a45');
      ln(at(len - 4 * s), at(len + 2 * s), 5, blade);      // la pierre au bout
    } else if (f.wtype === 'masse') {
      ln(at(-5 * s), at(len - 8 * s), 3, '#6e4a2a');
      ln(at(len - 9 * s), at(len), 8, blade);              // la grosse tête
      ln(at(len - 8 * s), at(len - 1), 2, '#ffffff');
    } else {                                               // le harpon et ses dents
      ln(at(-12 * s), at(len - 6 * s), 2, '#8d6a45');
      ln(at(len - 7 * s), tip, 3, blade);
      var b0 = at(len - 6 * s);
      ln({ x: b0.x - sn * 4 * s, y: b0.y + c * 4 * s }, { x: b0.x + sn * 4 * s, y: b0.y - c * 4 * s }, 2, blade);
    }
  }

  // ---------- Les animations des sorts ----------
  // Chacune déplace l'attaquant, dessine ses effets et appelle hit(k) au moment de chaque coup.
  async function goTo(att, x, ms) { await tween(att, 'x', x, ms || 220); }
  async function goHome(att, ms) { att.frame = 0; att.pose = null; await tween(att, 'x', att.homeX, ms || 200); }
  function waveCol(f) { return (f.wave && f.wave[0]) || '#e8e0c8'; }
  // le coup d'arme de base : recul, coup, onde de l'arme (bâton, harpon, paume)
  async function swing(att, hit, k, palm) {
    att.frame = 1; raise(att, k % 2 ? 1.2 : -2.1); await wait(70);
    att.frame = 2; att.fx = att.imgs && att.imgs.fx[1] ? 1 : 0; if (palm) att.palm = 0.25;
    sfx(palm ? 'kick' : 'swing');
    await swingTo(att, k % 2 ? -1.2 : 0.9, 90);
    await hit(k);
    await wait(100);
    att.fx = 0; att.frame = 3; await wait(70); sheathe(att);
  }
  var ANIMS = {
    // bâton, harpon, mains nues : l'onde de l'arme au contact
    arc: async function (att, def, s, hit) {
      await goTo(att, near(att, def, 68));
      for (var k = 0; k < s.hits && alive(def); k++) await swing(att, hit, k, att.wtype === 'mains');
      await goHome(att);
    },
    // une grande onde qui part de l'arme et file jusqu'à l'ennemi
    wave: async function (att, def, s, hit) {
      await goTo(att, near(att, def, 120), 200);
      for (var k = 0; k < s.hits && alive(def); k++) {
        att.frame = 1; raise(att, -2.1); await wait(70); att.frame = 2; att.fx = att.imgs && att.imgs.fx[1] ? 1 : 0; sfx('swing');
        swingTo(att, 0.5, 90);
        var col = waveCol(att), col2 = (att.wave && att.wave[1]) || '#7d8694', d = att.dir;
        await fly(from(att), to(def), 190, function (sh, x, y) {
          pxArc(x - d * 10, y + 2, 16, d > 0 ? -1.2 : Math.PI - 1.2, d > 0 ? 1.2 : Math.PI + 1.2, 2, col);
          pxArc(x - d * 13, y + 2, 12, d > 0 ? -1 : Math.PI - 1, d > 0 ? 1 : Math.PI + 1, 1, col2);
        });
        att.fx = 0;
        await hit(k);
        await wait(90); att.frame = 0; sheathe(att);
      }
      await goHome(att);
    },
    // balayage : un coup au ras du sol, et la poussière vole
    sweep: async function (att, def, s, hit) {
      await goTo(att, near(att, def, 62));
      att.frame = 1; att.y = 3; raise(att, 2.3); await wait(80);
      att.frame = 2; sfx('swing'); swingTo(att, 0.5, 100);
      var x = midX(def), d = att.dir;
      addFx(0.3, function (k) { ctx.globalAlpha = 1 - k; pxArc(x - d * 18, GROUND - 4, 22, d > 0 ? -0.5 : Math.PI - 0.5, d > 0 ? 0.35 : Math.PI + 0.35, 2, '#ffffff'); ctx.globalAlpha = 1; });
      burst(x, GROUND - 3, '#b3a07a', 10, 160);
      await hit(0);
      await wait(150); att.y = 0; sheathe(att);
      await goHome(att);
    },
    // katana : on lève la lame derrière la tête, elle s'abat en diagonale (et remonte au coup suivant)
    slash: async function (att, def, s, hit) {
      await goTo(att, near(att, def, 56));
      for (var k = 0; k < s.hits && alive(def); k++) {
        var up = k % 2 === 1, base = att.dir > 0 ? 0 : Math.PI;
        att.frame = 1; raise(att, up ? 1.3 : -2.2); await wait(90);
        att.frame = 2; sfx('slash');
        await swingTo(att, up ? -1.5 : 1.0, 80);
        slashFx(midX(def), chestY(def), 26, base + (up ? 0.35 : -0.35) * att.dir, att.blade || '#d9e1e6');
        await hit(k);
        await wait(150); att.frame = 3; await wait(60); sheathe(att);
      }
      await goHome(att);
    },
    // deux entailles en croix : une qui descend, une qui remonte
    xslash: async function (att, def, s, hit) {
      await goTo(att, near(att, def, 54));
      var base = att.dir > 0 ? 0 : Math.PI;
      for (var k = 0; k < s.hits && alive(def); k++) {
        att.frame = 1; raise(att, k % 2 ? 1.4 : -2.3); await wait(70);
        att.frame = 2; sfx('slash');
        await swingTo(att, k % 2 ? -1.6 : 1.1, 70);
        slashFx(midX(def), chestY(def), 26, base + (k % 2 ? -0.75 : 0.75) * att.dir, att.blade || '#d9e1e6', 0.45);
        await hit(k);
        await wait(90);
      }
      att.frame = 3; await wait(100); sheathe(att);
      await goHome(att);
    },
    // iaï : la lame au fourreau, l'attaquant traverse l'ennemi en un éclair, puis la coupure apparaît
    dash: async function (att, def, s, hit) {
      att.frame = 1; raise(att, 2.6); sfx('glint'); sparks(frontX(att), chestY(att), '#ffffff', 6, 30);
      await wait(260);
      var x0 = att.x, x1 = att.x + att.dir * (Math.abs(homeMid(def) - homeMid(att)) + 44), trail = [];
      var img = attImg(att);
      var ghosts = addFx(0.5, function (k) {
        trail.forEach(function (gx, i) { ctx.globalAlpha = (1 - k) * 0.35 * (i + 1) / trail.length; drawSprite(att, img, gx); });
        ctx.globalAlpha = 1;
      });
      att.frame = 2; sfx('whoosh');
      for (var i = 1; i <= 5; i++) trail.push(x0 + (x1 - x0) * i / 6 + (att === P ? 32 : enemySize(E) / 2));
      swingTo(att, 0.05, 90);
      await tween(att, 'x', x1, 90, true);
      var ly = chestY(def), lx0 = homeMid(att) - 30, lx1 = midX(att);
      addFx(0.45, function (k) { ctx.globalAlpha = 1 - k; pxLine(Math.min(lx0, lx1), ly, Math.max(lx0, lx1), ly, 3, att.blade || '#d9e1e6'); pxLine(Math.min(lx0, lx1), ly, Math.max(lx0, lx1), ly, 1, '#ffffff'); ctx.globalAlpha = 1; });
      await wait(240);
      slashFx(midX(def), chestY(def), 32, att.dir > 0 ? 0.15 : Math.PI - 0.15, att.blade || '#d9e1e6', 0.45);
      sfx('slash'); shake = 5;
      await hit(0, 1, true);
      ghosts.t = ghosts.dur;
      await swingTo(att, 0.9, 120);
      await wait(120); sheathe(att);
      att.alpha = 0.3; att.x = x0 - att.dir * 20; att.frame = 0;
      await tween(att, 'alpha', 1, 180);
      await goHome(att, 140);
    },
    // danse des lames : des entailles dans tous les sens, en sautillant
    slashes: async function (att, def, s, hit) {
      await goTo(att, near(att, def, 54));
      var base = att.dir > 0 ? 0 : Math.PI;
      for (var k = 0; k < s.hits && alive(def); k++) {
        var up = k % 2 === 1;
        att.frame = up ? 3 : 2; att.y = up ? -6 : 0; raise(att, up ? 1.3 : -2.2); sfx('slash');
        await swingTo(att, up ? -1.5 : 1.0, 60);
        slashFx(midX(def) + (Math.random() - 0.5) * 8, chestY(def) + (Math.random() - 0.5) * 10, 22 + Math.random() * 6, base + (Math.random() - 0.5) * 1.6, att.blade || '#d9e1e6', 0.3);
        await hit(k);
        await wait(90);
      }
      att.y = 0; sheathe(att);
      await goHome(att);
    },
    // lune tranchante : un grand croissant qui file jusqu'à l'ennemi
    crescent: async function (att, def, s, hit) {
      att.frame = 1; raise(att, -2.3); sfx('glint'); await wait(240);
      att.frame = 2; sfx('whoosh');
      swingTo(att, 1.1, 90);
      var d = att.dir, col = att.blade || '#d9e1e6', ang = d > 0 ? 0 : Math.PI;
      await fly(from(att), to(def), 300, function (sh, x, y) {
        for (var t = 3; t >= 1; t--) crescent(x - d * t * 7, y, 30, ang, ang - 1.1, ang + 1.1, 7, col, 0.35 - t * 0.08);
        crescent(x, y, 30, ang, ang - 1.1, ang + 1.1, 9, col, 0.7);
        crescent(x, y, 30, ang, ang - 1.1, ang + 1.1, 3, '#ffffff', 1);
      });
      sheathe(att);
      sparks(midX(def), chestY(def), '#ffffff', 16, 90);
      await hit(0, 1, true);
      await wait(150); att.frame = 0;
    },
    // fracas, masse : un petit bond, l'arme s'abat, le sol tremble
    slam: async function (att, def, s, hit) {
      await goTo(att, near(att, def, 60));
      att.frame = 1; raise(att, -2.4);
      await tween(att, 'y', -18, 130); swingTo(att, 1.3, 90); await tween(att, 'y', 0, 90, true);
      att.frame = 2; att.fx = att.imgs && att.imgs.fx[1] ? 1 : 0; sfx('thud');
      shockFx(midX(def), false); rocks(midX(def), 6);
      await hit(0, 1, true);
      await wait(150); att.fx = 0; sheathe(att);
      await goHome(att);
    },
    // séisme : un saut immense, et la terre se fend
    quake: async function (att, def, s, hit) {
      await goTo(att, near(att, def, 66));
      att.frame = 1; raise(att, -2.6);
      await tween(att, 'y', -72, 230); await wait(90);
      swingTo(att, 1.4, 110); await tween(att, 'y', 0, 110, true);
      att.frame = 2; sfx('thud'); sfx('boss');
      shockFx(midX(def), true); shockFx(midX(att), false); rocks(midX(def), 16);
      await hit(0, 1, true);
      shake = 9;
      await wait(250); sheathe(att);
      await goHome(att);
    },
    // cri, coassement : des anneaux qui font trembler l'air
    roar: async function (att, def, s, hit) {
      att.frame = 1; sfx('croak');
      ringsFx(att, att.wtype === 'mains' ? '#f3d27a' : '#ffffff');
      shake = 3;
      await wait(320);
      if (s.power > 0) await hit(0);
      await wait(200); att.frame = 0;
    },
    // moulinet : l'arme tournoie, la grenouille avec
    spin: async function (att, def, s, hit) {
      await goTo(att, near(att, def, 56));
      var col = waveCol(att), f = att;
      var whirl = addFx(s.hits * 0.16 + 0.1, function (k) { ctx.globalAlpha = 0.8; pxRing(midX(f), chestY(f), 26, 10, 2, col, true); pxArc(midX(f), chestY(f), 24, k * 30, k * 30 + 1.4, 2, '#ffffff'); ctx.globalAlpha = 1; });
      att.frame = 2; raise(att, 0.1);
      var spin = tween(att, 'rot', att.dir * Math.PI * 2 * Math.ceil(s.hits / 2), s.hits * 160, true);
      for (var k = 0; k < s.hits && alive(def); k++) { sfx('swing'); await wait(140); await hit(k); }
      await spin; att.rot = 0; whirl.t = whirl.dur; sheathe(att);
      await goHome(att);
    },
    // tempête d'acier : la grenouille tourbillonne, les lames pleuvent autour de l'ennemi
    storm: async function (att, def, s, hit) {
      await goTo(att, near(att, def, 56));
      att.frame = 2; raise(att, 0.1);
      var spin = tween(att, 'rot', att.dir * Math.PI * 2 * 3, s.hits * 120, true);
      for (var k = 0; k < s.hits && alive(def); k++) {
        sfx(k % 2 ? 'slash' : 'swing');
        slashFx(midX(def) + (Math.random() - 0.5) * 16, chestY(def) + (Math.random() - 0.5) * 16, 20 + Math.random() * 8, Math.random() * Math.PI * 2, att.blade || '#d9e1e6', 0.3);
        await wait(100); await hit(k);
      }
      await spin; att.rot = 0; sheathe(att);
      await goHome(att);
    },
    // kunaïs : lancés un par un
    kunai: async function (att, def, s, hit) {
      for (var k = 0; k < s.hits && alive(def); k++) {
        att.frame = 1; sfx('throw');
        await fly(from(att), to(def, (k % 2) * -6), 200, thrownDraw(att));
        await hit(k);
        att.frame = 0;
        await wait(s.hits > 2 ? 90 : 150);
      }
    },
    // éventail : trois kunaïs à la fois, en éventail
    fan: async function (att, def, s, hit) {
      att.frame = 1; sfx('throw');
      var all = [];
      for (var k = 0; k < s.hits; k++) {
        (function (k) { all.push(wait(k * 60).then(function () { return fly(from(att), to(def, [-12, 0, 10, -4, 6][k % 5]), 210, thrownDraw(att), [8, 0, -6][k % 3]); }).then(function () { return hit(k); })); })(k);
      }
      await Promise.all(all);
      att.frame = 0;
    },
    // kunaï marqueur : un parchemin rouge accroché au kunaï
    marker: async function (att, def, s, hit) {
      att.frame = 1; sfx('throw');
      var knife = thrownDraw(att), d = att.dir;
      await fly(from(att), to(def), 230, function (sh, x, y) { ctx.fillStyle = '#f4ecd8'; ctx.fillRect(R(x - d * 12) - 2, R(y) - 1, 5, 6); ctx.fillStyle = '#c9412f'; ctx.fillRect(R(x - d * 12) - 1, R(y) + 1, 3, 2); knife(sh, x, y); });
      await hit(0);
      att.frame = 0;
    },
    // pluie de kunaïs : lancés vers le ciel, ils retombent sur l'ennemi
    rain: async function (att, def, s, hit) {
      att.frame = 1; sfx('throw');
      await tween(att, 'y', -16, 120);
      await fly(from(att), { x: frontX(att) + att.dir * 20, y: -20 }, 180, thrownDraw(att, 'up'));
      await tween(att, 'y', 0, 120); att.frame = 0;
      var all = [];
      for (var k = 0; k < s.hits; k++) {
        (function (k) {
          var x = midX(def) + (Math.random() - 0.5) * 30;
          all.push(wait(k * 80).then(function () { sfx('throw'); return fly({ x: x, y: -16 }, { x: x, y: chestY(def) }, 170, thrownDraw(att, 'down')); }).then(function () { return hit(k); }));
        })(k);
      }
      await Promise.all(all);
    },
    // shurikens : des étoiles qui tournoient
    shuriken: async function (att, def, s, hit) {
      var water = /eau|rosee|maree/.test(att.weaponId || ''); // les shurikens d'eau éclaboussent
      for (var k = 0; k < s.hits && alive(def); k++) {
        att.frame = 1; sfx('throw');
        await fly(from(att), to(def, k % 2 ? -8 : 0), 230, starDraw(att, 5, water), k % 2 ? 10 : 4);
        if (water) sfx('splash');
        await hit(k);
        att.frame = 0;
        await wait(80);
      }
    },
    // shuriken d'eau : une grande étoile d'eau qui éclabousse
    water: async function (att, def, s, hit) {
      att.frame = 1; sfx('throw');
      await fly(from(att), to(def), 280, starDraw(att, 8, true), 6);
      sfx('splash'); burst(midX(def), chestY(def), '#9cd8f8', 18, 150);
      await hit(0);
      att.frame = 0;
    },
    // prison d'eau : une bulle se referme sur l'ennemi, puis éclate
    bubble: async function (att, def, s, hit) {
      att.frame = 2; sfx('splash');
      await fly(from(att), to(def), 220, function (sh, x, y) { ctx.fillStyle = '#9cd8f8'; ctx.fillRect(R(x) - 2, R(y) - 2, 4, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(R(x) - 1, R(y) - 1, 1, 1); });
      var cx = midX(def), cy = chestY(def) - 2, r = fsz(def) * 0.5;
      addFx(0.75, function (k) {
        var rr = r * Math.min(1, k * 3) + Math.sin(k * 20) * 1.2;
        ctx.globalAlpha = 0.25; ctx.fillStyle = '#5fa3e0'; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.9; pxRing(cx, cy, rr, rr, 1, '#bfe8ff'); pxArc(cx, cy, rr - 3, -2.4, -1.6, 2, '#ffffff');
        ctx.globalAlpha = 1;
      });
      await wait(560);
      sfx('splash'); burst(cx, cy, '#9cd8f8', 20, 180);
      await hit(0);
      att.frame = 0;
    },
    // shuriken géant : il traverse l'ennemi, puis revient
    fuma: async function (att, def, s, hit) {
      att.frame = 2; sfx('whoosh');
      var draw = starDraw(att, 11, false), far = { x: midX(def) + att.dir * 40, y: chestY(def) - 4 };
      await fly(from(att), to(def), 240, draw);
      await hit(0);
      await fly(to(def), far, 160, draw);
      if (s.hits > 1) await hit(1);
      sfx('whoosh');
      await fly(far, from(att), 330, draw, -14);
      if (s.hits > 2) await hit(2);
      att.frame = 0;
    },
    // tourbillon d'eau : des shurikens tournent autour de l'ennemi et frappent tour à tour
    vortex: async function (att, def, s, hit) {
      att.frame = 2; sfx('splash');
      var cx = midX(def), cy = chestY(def), n = s.hits, water = starDraw(att, 5, true);
      var ring = addFx(n * 0.14 + 0.5, function (k, now) {
        var rr = 34 - k * 14;
        ctx.globalAlpha = 0.5; pxRing(cx, cy, rr + 4, (rr + 4) * 0.45, 1, '#5fa3e0', true); ctx.globalAlpha = 1;
        for (var i = 0; i < n; i++) { var a = now / 160 + i * Math.PI * 2 / n; water(null, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.45, now); }
      });
      await wait(300);
      for (var k = 0; k < n && alive(def); k++) { sfx('splash'); await hit(k); await wait(90); }
      ring.t = ring.dur;
      att.frame = 0;
    },
    // aiguille empoisonnée : fine et rapide, une traînée verte
    needle: async function (att, def, s, hit) {
      att.frame = 1; sfx('throw');
      var d = att.dir;
      await fly(from(att), to(def), 150, function (sh, x, y) { pxLine(x - d * 9, y, x, y, 1, '#e8f7a0'); ctx.globalAlpha = 0.5; pxLine(x - d * 16, y, x - d * 9, y, 1, '#6fae52'); ctx.globalAlpha = 1; });
      await hit(0);
      att.frame = 0;
    },
    // nuage toxique : une fiole qui éclate en nuage vert
    cloud: async function (att, def, s, hit) {
      att.frame = 1; sfx('throw');
      await fly(from(att), to(def), 260, function (sh, x, y) { ctx.fillStyle = '#6fae52'; ctx.fillRect(R(x) - 2, R(y) - 2, 4, 5); ctx.fillStyle = '#e8f7a0'; ctx.fillRect(R(x) - 1, R(y) - 3, 2, 1); }, 26);
      var cx = midX(def), cy = chestY(def);
      addFx(1.1, function (k) {
        for (var i = 0; i < 7; i++) {
          var a = i * 0.9, rr = 6 + k * 14 + (i % 3) * 3;
          ctx.globalAlpha = 0.45 * (1 - k); ctx.fillStyle = i % 2 ? '#8fce52' : '#4e7a2a';
          ctx.beginPath(); ctx.arc(cx + Math.cos(a) * k * 22, cy - 6 + Math.sin(a) * k * 10 - k * 8, rr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      });
      sfx('splash');
      await hit(0);
      att.frame = 0;
    },
    // clone d'ombre : une ombre surgit derrière l'ennemi ; kunaïs d'un côté, lame de l'autre
    clone: async function (att, def, s, hit) {
      var cx = homeMid(def) + att.dir * 46, img = attImg(att);
      sparks(cx, chestY(def), '#3a3a6b', 14, 70); sfx('whoosh');
      var ghost = addFx(s.hits * 0.3 + 0.8, function (k, now) {
        var g = shadowImg(img), sz = fsz(att);
        ctx.globalAlpha = k > 0.9 ? (1 - k) * 10 * 0.8 : 0.8;
        ctx.save(); ctx.translate(R(cx), 0); ctx.scale(-1, 1); ctx.drawImage(g, R(-sz / 2), R(GROUND - sz + Math.sin(now / 200) * 1), sz, sz); ctx.restore();
        ctx.globalAlpha = 1;
      });
      await wait(250);
      for (var k = 0; k < s.hits && alive(def); k++) {
        if (k % 2 === 0) { att.frame = 1; sfx('throw'); await fly(from(att), to(def), 170, thrownDraw(att)); att.frame = 0; }
        else { sfx('slash'); slashFx(midX(def) + att.dir * 4, chestY(def), 22, att.dir > 0 ? Math.PI : 0, '#8a78c0', 0.3); await wait(60); }
        await hit(k);
        await wait(80);
      }
      ghost.t = ghost.dur * 0.9;
      sparks(cx, chestY(def), '#3a3a6b', 10, 60);
      await wait(150);
    },
    // déluge de lames : kunaïs et shurikens tombent du ciel
    deluge: async function (att, def, s, hit) {
      att.frame = 1; sfx('throw');
      await tween(att, 'y', -22, 140);
      await fly(from(att), { x: frontX(att) + att.dir * 30, y: -20 }, 160, knifeDraw(att, 'up'));
      await tween(att, 'y', 0, 120); att.frame = 0;
      var all = [], star = starDraw(att, 5, true);
      for (var k = 0; k < s.hits; k++) {
        (function (k) {
          var x = midX(def) + (Math.random() - 0.5) * 36;
          all.push(wait(k * 70).then(function () { return fly({ x: x, y: -16 }, { x: x, y: chestY(def) }, 160, k % 2 ? star : knifeDraw(att, 'down')); }).then(function () { return hit(k); }));
        })(k);
      }
      await Promise.all(all);
    },
    // paume de l'ermite : l'énergie se concentre, puis la paume frappe
    palm: async function (att, def, s, hit) {
      await goTo(att, near(att, def, 58));
      att.frame = 1; sfx('energy'); gather(att, '#f3d27a', 0.25);
      await wait(200);
      att.frame = 2; att.palm = 0.25; att.fx = att.imgs && att.imgs.fx[1] ? 1 : 0; sfx('kick');
      var x = midX(def), y = chestY(def);
      addFx(0.35, function (k) { ctx.globalAlpha = 1 - k; pxRing(x, y, 6 + k * 22, 6 + k * 22, 2, '#f3d27a'); ctx.globalAlpha = 1; });
      await hit(0, 1, s.power >= 1.4);
      await wait(150); att.fx = 0;
      await goHome(att);
    },
    // paume du crapaud géant : une main d'énergie immense s'abat sur l'ennemi
    bigpalm: async function (att, def, s, hit) {
      att.frame = 1; sfx('energy'); gather(att, '#f3d27a', 0.4);
      await wait(320);
      att.frame = 2; sfx('whoosh');
      var d = att.dir;
      await fly({ x: frontX(att), y: chestY(att) - 10 }, { x: midX(def) - d * 8, y: chestY(def) - 4 }, 260, function (sh, x, y) { drawPalm(x, y, d, 1); });
      sfx('thud'); shake = 6;
      var x = midX(def), y = chestY(def);
      addFx(0.4, function (k) { ctx.globalAlpha = 1 - k; drawPalm(x - d * 8, y - 4, d, 1 + k * 0.3); pxRing(x, y, 10 + k * 30, 10 + k * 30, 2, '#f3d27a'); ctx.globalAlpha = 1; });
      await hit(0, 1, true);
      await wait(200); att.frame = 0;
    },
    // orbe du marais : une sphère d'énergie grandit, puis la grenouille l'enfonce dans l'ennemi
    orb: async function (att, def, s, hit) {
      att.frame = 1; sfx('energy');
      var f = att, o = { r: 1 };
      var orb = addFx(3, function (k, now) {
        var x = frontX(f) + f.dir * 4, y = chestY(f) - 2, r = o.r;
        ctx.globalAlpha = 0.35; ctx.fillStyle = '#f3d27a'; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        for (var i = 0; i < 3; i++) pxArc(x, y, r, now / 80 + i * 2.1, now / 80 + i * 2.1 + 1.2, 1, i ? '#f3d27a' : '#ffffff');
      });
      await tween(o, 'r', 9, 420);
      await goTo(att, near(att, def, 58), 180);
      att.frame = 2; sfx('thud'); shake = 7;
      var x = midX(def), y = chestY(def);
      orb.t = orb.dur;
      addFx(0.5, function (k) { ctx.globalAlpha = 1 - k; pxRing(x, y, 8 + k * 36, 8 + k * 30, 2, '#f3d27a'); pxRing(x, y, 4 + k * 20, 4 + k * 18, 1, '#ffffff', true); ctx.globalAlpha = 1; });
      sparks(x, y, '#fff6c0', 18, 110);
      await hit(0, 1, true);
      await wait(220);
      await goHome(att);
    },
    // coup de pied sauté
    kick: async function (att, def, s, hit) {
      await goTo(att, near(att, def, 50));
      for (var k = 0; k < s.hits && alive(def); k++) await kickOnce(att, def, hit, k);
      await goHome(att);
    },
    // coup de boule : élan, la tête en avant
    headbutt: async function (att, def, s, hit) {
      await goTo(att, near(att, def, 100));
      await headbuttOnce(att, def, hit, 0);
      await goHome(att);
    },
    // coup de pied retourné : une vrille en l'air, deux talons
    spinkick: async function (att, def, s, hit) {
      await goTo(att, near(att, def, 58));
      await spinKickOnce(att, def, hit, 0, s.hits);
      await goHome(att);
    },
    // chute du crapaud : un bond jusqu'au ciel, puis un coup de boule en piqué
    jump: async function (att, def, s, hit) {
      await goTo(att, near(att, def, 60));
      sfx('whoosh');
      await tween(att, 'y', -84, 240);
      await tween(att, 'rot', att.dir * Math.PI / 2, 120);
      await tween(att, 'y', 0, 120, true);
      sfx('thud'); shockFx(midX(def), true); rocks(midX(def), 12);
      await hit(0, 1, true);
      shake = 8;
      await wait(160);
      await tween(att, 'rot', 0, 140);
      await goHome(att);
    },
    // langue fouet : la langue file jusqu'à l'ennemi et revient
    tongue: async function (att, def, s, hit) {
      att.frame = 1; sfx('whoosh');
      var f = att, t = { k: 0 }, x0 = function () { return frontX(f) - f.dir * 4; }, y0 = function () { return GROUND - fsz(f) * 0.6; };
      var tip = function () { return { x: x0() + (midX(def) - x0()) * t.k, y: y0() + (chestY(def) - y0()) * t.k }; };
      var lick = addFx(3, function () { var p = tip(); pxLine(x0(), y0() + 1, p.x, p.y + 1, 2, '#86261c'); pxLine(x0(), y0(), p.x, p.y, 2, '#e8897a'); ctx.fillStyle = '#e8897a'; ctx.fillRect(R(p.x) - 2, R(p.y) - 2, 5, 5); });
      await tween(t, 'k', 1, 140, true);
      await hit(0);
      await tween(t, 'k', 0, 140, true);
      lick.t = lick.dur;
      att.frame = 0;
    },
    // kumite du sage : paume, pied, tête, pied retourné, paume
    combo: async function (att, def, s, hit) {
      await goTo(att, near(att, def, 58));
      for (var k = 0; k < s.hits && alive(def); k++) {
        var m = k % 5;
        if (m === 0 || m === 4) { att.frame = 2; att.palm = 0.25; sfx('kick'); sparks(midX(def), chestY(def), '#f3d27a', 8, 70); await hit(k, 1, m === 4); await wait(120); att.frame = 0; }
        else if (m === 1) await kickOnce(att, def, hit, k);
        else if (m === 2) await headbuttOnce(att, def, hit, k, true);
        else await spinKickOnce(att, def, hit, k, 1);
      }
      await goHome(att);
    }
  };
  // les briques des coups de l'Ermite
  async function kickOnce(att, def, hit, k) {
    att.pose = 'kick'; sfx('kick');
    await tween(att, 'y', -8, 80);
    var x = frontX(att) + att.dir * 8, y = GROUND - fsz(att) * 0.25 + att.y, d = att.dir;
    addFx(0.25, function (kk) { ctx.globalAlpha = 1 - kk; pxArc(x - d * 8, y, 12, d > 0 ? -1 : Math.PI - 0.4, d > 0 ? 0.4 : Math.PI + 1, 2, '#f3d27a'); ctx.globalAlpha = 1; });
    await hit(k);
    await wait(90);
    await tween(att, 'y', 0, 90);
    att.pose = null;
  }
  async function headbuttOnce(att, def, hit, k, short) {
    await tween(att, 'rot', att.dir * 0.5, 90);
    sfx('whoosh');
    await tween(att, 'x', near(att, def, 44), short ? 80 : 110, true);
    sfx('thud'); shake = 4;
    sparks(midX(def) - def.dir * 6, headY(def) + 6, '#f3d27a', 10, 80);
    await hit(k, 1, true);
    await wait(90);
    await tween(att, 'rot', 0, 110);
    await tween(att, 'x', near(att, def, 58), 100);
  }
  async function spinKickOnce(att, def, hit, k, n) {
    att.pose = 'kick'; sfx('whoosh');
    var f = att;
    await tween(att, 'y', -14, 90);
    var arc = addFx(n * 0.18 + 0.1, function (kk) { ctx.globalAlpha = 0.7; pxRing(midX(f), chestY(f) + 4, 22, 8, 1, '#f3d27a', true); ctx.globalAlpha = 1; });
    var spin = tween(att, 'rot', att.dir * Math.PI * 2 * n, n * 200, true);
    for (var i = 0; i < n && alive(def); i++) { await wait(130); sfx('kick'); await hit(k + i); }
    await spin; att.rot = 0; arc.t = arc.dur;
    await tween(att, 'y', 0, 90);
    att.pose = null;
  }
  // de l'énergie qui converge vers la main
  function gather(f, col, dur) {
    var x = frontX(f), y = chestY(f);
    addFx(dur, function (k) {
      for (var i = 0; i < 8; i++) { var a = i * 0.785 + k * 2, r = 24 * (1 - k); ctx.fillStyle = i % 2 ? col : '#ffffff'; ctx.fillRect(R(x + Math.cos(a) * r), R(y + Math.sin(a) * r), 2, 2); }
    });
  }
  // une grande main ouverte, dessinée en pixels (paume du crapaud géant)
  var PALM_ROWS = ['..kk.kk.kk....', '.kyykyykyyk...', '.kyykyykyyk.kk', '.kyykyykyykkyk', '.kyyyyyyyykyyk', '.kyyyyyyyyyyk.', '.kyyyyyyyyyk..', '..kyyyyyyyk...', '...kyyyyyk....', '....kkkkk.....'];
  var palmCache = {};
  function drawPalm(x, y, dir, sc) {
    var key = dir;
    if (!palmCache[key]) palmCache[key] = stringsToCanvas(PALM_ROWS, { k: '#9a4212', y: '#f3d27a' }, dir < 0);
    var w = 14 * 3 * sc, h = 10 * 3 * sc;
    ctx.save(); ctx.globalAlpha *= 0.85;
    ctx.drawImage(palmCache[key], R(x - w / 2), R(y - h / 2), R(w), R(h));
    ctx.restore();
  }
  // Une silhouette sombre d'un sprite (le clone d'ombre)
  var shadowCache = new WeakMap();
  function shadowImg(img) {
    if (shadowCache.has(img)) return shadowCache.get(img);
    var c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    var x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(40, 30, 80, 0.82)'; x.fillRect(0, 0, c.width, c.height);
    shadowCache.set(img, c);
    return c;
  }

  // ---------- Jouer un sort ----------
  async function perform(att, def, s) {
    var cd = skillCd(s, att.cdr);
    if (cd) att.cds[s.id] = cd + 1; // +1 : le tour en cours ne compte pas
    tell(att, nameOf(att) + ' utilise ' + s.name + '.');
    renderHud();
    var crit = false;
    if (att.shadowCrit && s.power > 0) { crit = true; att.shadowCrit = false; }
    var cx = midX(att), k = s.base ? 1 : att.spell;
    // les effets sur soi
    if (s.heal) {
      heal(att, att.maxHp * s.heal); // les soins ne profitent pas de la puissance des sorts
      burst(cx, GROUND - 40, '#8fce52', 16);
      addFx(0.8, function (kk) { ctx.fillStyle = '#c8f08a'; for (var i = 0; i < 5; i++) { var px = cx - 14 + i * 7, py = GROUND - 20 - kk * 40 - (i % 2) * 8; ctx.globalAlpha = 1 - kk; ctx.fillRect(R(px) - 1, R(py), 3, 1); ctx.fillRect(R(px), R(py) - 1, 1, 3); } ctx.globalAlpha = 1; });
      sfx('heart');
    }
    if (s.cleanse && (att.poison || att.bleed || att.stun)) { att.poison = 0; att.bleed = 0; att.stun = 0; floater(cx, headY(att) - 10, 'Purifié', '#e8f7a0'); }
    if (s.guard) { att.guard = s.guard; if (s.counter) att.counter = s.guard; burst(cx, GROUND - 40, '#c9e07a', 12); sfx('equip'); }
    if (s.shadow) { att.shadow = true; att.shadowCrit = true; att.alpha = 0.4; sfx('throw'); await wait(380); att.alpha = 1; }
    if (s.buff) { att.buff = s.buff; att.buffFresh = true; sparks(cx, chestY(att), '#ff9a3a', 18, 60); sfx('levelup'); }
    if (s.power > 0) {
      var anim = ANIMS[s.anim] || ANIMS.arc;
      await anim(att, def, s, hitter(att, def, s, crit));
      // Enchaînement, Lancer parfait : un coup simple peut en appeler un second
      if (s.hits === 1 && att.pas.multiHit && alive(def) && Math.random() < att.pas.multiHit) {
        await wait(80);
        floater(midX(att), headY(att) - 6, 'Encore !', '#f3d27a');
        if (KIND_VOIE[att.kind] === 'kunai') await fly(from(att), to(def), 160, thrownDraw(att));
        else sparks(midX(def), chestY(def), '#ffffff', 8, 60);
        await hitter(att, def, s, false)(1, 0.5);
      }
    } else if (s.anim && ANIMS[s.anim]) await ANIMS[s.anim](att, def, s, hitter(att, def, s, false));
    else await wait(420);
    if (s.weaken && s.power === 0 && alive(def)) { def.weaken = s.weaken; floater(midX(def), headY(def) - 18, 'Affaibli', '#9cc7e0'); }
    if (s.shadowAfter) { att.shadow = true; att.alpha = 0.55; setTimeout(function () { if (att) att.alpha = 1; }, 400); }
    renderHud();
  }

  // Choix de l'ordinateur (et du mode auto) : se soigner, se purifier, se protéger, se renforcer, marquer, puis frapper fort
  function aiPick(f, foe) {
    var list = f.skills.filter(function (s) { return ready(f, s); }), pick = function (fn) { return list.filter(fn)[0]; };
    if (f.hp < f.maxHp * 0.4) { var h = pick(function (s) { return s.heal; }); if (h) return h; }
    if ((f.poison || f.bleed) && f.hp < f.maxHp * 0.7) { var c = pick(function (s) { return s.cleanse; }); if (c) return c; }
    if (foe.charging || (f !== P && Math.random() < 0.2)) { var d = pick(function (s) { return (s.guard || s.shadow) && !f.guard && !f.shadow; }); if (d) return d; }
    if (!f.buff) { var b = pick(function (s) { return s.buff; }); if (b && foe.hp > f.dmg * 3) return b; }
    if (!foe.mark) { var m = pick(function (s) { return s.mark; }); if (m && foe.hp > f.dmg * 3) return m; }
    var score = function (s) { return s.power * s.hits * (s.base ? 1 : f.spell) * (1 + (s.stun || 0) * 0.3 + (s.bleed || s.poison ? 0.25 : 0) + (s.weaken && !foe.weaken ? 0.2 : 0)); };
    var attacks = list.filter(function (s) { return s.power > 0; }).sort(function (a, b) { return score(b) - score(a); });
    return attacks[0] || list[0];
  }

  // ---------- Déroulé des tours ----------
  // Début du tour d'un combattant : relances, Flux, régénération, poison et saignement, étourdissement
  async function turnStart(f) {
    Object.keys(f.cds).forEach(function (k) { if (f.cds[k] > 0) f.cds[k]--; });
    var flow = f.pas.flow + (f === P && fight.weather && fight.weather.flow || 0);
    if (flow && Math.random() < flow) {
      var any = false;
      Object.keys(f.cds).forEach(function (k) { if (f.cds[k] > 0) { f.cds[k]--; any = true; } });
      if (any) floater(midX(f), headY(f) - 4, 'Flux !', '#9cc7e0');
    }
    if (f.pas.regenHp && f.hp < f.maxHp) heal(f, f.maxHp * f.pas.regenHp);
    if (f.poison > 0) { f.poison--; await dot(f, f.poisonDmg, '#8fce52', '#6fae52'); }
    if (f.hp > 0 && f.bleed > 0) { f.bleed--; await dot(f, f.bleedDmg, '#ff6a5a', '#c9412f'); }
    renderHud();
    if (f.hp <= 0) return 'dead';
    if (f.stun > 0) {
      f.stun--; f.stunImmune = 2; // après un étourdissement, un tour sans pouvoir l'être à nouveau
      log('Étourdissement : ' + nameOf(f) + ' passe son tour.', f === P ? 'danger' : '');
      await wait(450);
      return 'stun';
    }
    return 'ok';
  }
  async function dot(f, n, col, col2) {
    f.hp -= n;
    if (f === E && fight.stats) fight.stats.total += n;
    floater(midX(f), headY(f), n + '', col);
    burst(midX(f), chestY(f), col2, 8);
    renderHud();
    await wait(320);
  }
  // Fin du tour de f : la garde de l'autre s'use, les effets posés sur f s'estompent
  function turnEnd(f, other) {
    if (other.guard > 0) other.guard--;
    if (other.counter > 0) other.counter--;
    if (f.weaken > 0) f.weaken--;
    if (f.mark > 0) f.mark--;
    if (f.buff > 0 && !f.buffFresh) f.buff--;
    if (f.stunImmune > 0) f.stunImmune--;
    f.buffFresh = false;
  }

  async function playerTurn() {
    if (over) return;
    var st = await turnStart(P);
    if (st === 'dead') return defeat();
    if (st === 'stun') { turnEnd(P, E); return enemyTurn(); }
    busy = false;
    renderHud();
    if (save.battle.auto) {
      await wait(380);
      if (!busy && !over && save.battle.auto) act(aiPick(P, E));
    }
  }

  async function act(skill) {
    if (busy || over || !skill || !ready(P, skill)) return;
    busy = true;
    renderHud();
    await perform(P, E, skill);
    await ripostes(P, E);
    if (fight.kind === 'arbre') { fight.done++; renderHud(); if (fight.done >= fight.turns) return trainingEnd(); }
    if (P.hp <= 0) return defeat();
    if (E.hp <= 0) return victory();
    if (fight.kind === 'raid') { fight.done++; renderHud(); if (fight.done >= fight.turns) return raidEnd(); } // l'assaut a ses tours comptés
    turnEnd(P, E);
    await wait(300);
    enemyTurn();
  }

  // ---------- Tour de l'ennemi ----------
  async function enemyTurn() {
    if (over) return;
    var st = await turnStart(E);
    if (st === 'dead') return victory();
    if (st !== 'stun') {
      if (E.frog) await frogTurn();
      else if (E.species === 'arbre') await treeTurn();
      else await monsterTurn();
      if (over) return;
      await ripostes(E, P);
    }
    renderHud();
    if (E.hp <= 0) return victory();
    if (P.hp <= 0) return defeat();
    turnEnd(E, P);
    await wait(200);
    playerTurn();
  }
  // Un monstre : il fonce, charge, aspire la vie ou englue
  async function monsterTurn() {
    E.turn++;
    if (E.rank === 'boss' && !E.enraged && E.hp < E.maxHp * 0.5) {
      E.enraged = true;
      log(E.name + ' entre dans une rage folle !', 'danger');
      sfx('boss');
      shake = 6;
      await wait(500);
    }
    var dmgMult = (E.enraged ? 1.3 : 1) * (fight.weather && fight.weather.enemyDmg || 1);
    var move = 'normal';
    if (E.charging) { move = 'charge'; E.charging = false; }
    else if ((E.behavior === 'dasher' || E.rank === 'boss') && E.turn % 3 === 0) {
      E.charging = true;
      log(E.name + ' se prépare à charger…', 'danger');
      sfx('boss');
      renderHud();
      await wait(550);
      return;
    } else if (E.behavior === 'flyer' && Math.random() < 0.3) move = 'drain';
    else if (E.behavior === 'walker' && E.turn % 3 === 0) move = 'glue';

    await tween(E, 'x', P.homeX + 60, move === 'charge' ? 180 : 240);
    var dmg = await strike(E, P, dmgMult * (move === 'charge' ? 1.8 : 1), { heavy: move === 'charge' });
    if (dmg) {
      var names = { normal: 'attaque', charge: 'charge de plein fouet', drain: 'aspire la vie de ' + heroName(), glue: 'englue ' + heroName() };
      log(E.name + ' ' + names[move] + ' : ' + dmg + ' dégâts.', 'danger');
      if (move === 'drain') heal(E, dmg * 0.5);
      if (move === 'glue') { // englué : les sorts en relance prennent un tour de plus
        var slowed = false;
        Object.keys(P.cds).forEach(function (k) { if (P.cds[k] > 0) { P.cds[k]++; slowed = true; } });
        floater(P.x + 32, GROUND - 64, slowed ? 'Englué : relances +1' : 'Englué', '#9cc7e0');
      }
    }
    await tween(E, 'x', E.homeX, 240);
  }
  // Une grenouille (duel, tour) : elle joue ses sorts comme Kawazu, choisis par l'ordinateur
  async function frogTurn() {
    renderHud();
    await wait(250);
    var s = aiPick(E, P);
    if (!s) { log(E.name + ' observe ' + heroName() + '.'); await wait(350); return; }
    await perform(E, P, s);
  }
  // L'arbre d'entraînement : il encaisse, ou fouette de ses branches si on l'a demandé
  async function treeTurn() {
    if (!fight.riposte) {
      log('L’arbre encaisse sans broncher.');
      await wait(300);
      return;
    }
    E.x -= 4; tween(E, 'x', E.homeX, 200);
    sfx('swing');
    await wait(120);
    var dmg = await strike(E, P, 1, { noRiposte: false });
    if (dmg) log('L’arbre fouette de ses branches : ' + dmg + ' dégâts.', 'danger');
  }
  // le bilan de l'entraînement
  async function trainingEnd() {
    over = true;
    renderHud();
    sfx('ladder');
    log('Fin de l’entraînement !', 'hero');
    await wait(600);
    var st = fight.stats, turns = Math.max(1, fight.done);
    var row = function (label, v) { return '<li><span>' + label + '</span><b>' + v + '</b></li>'; };
    showEnd(true, '<ul class="bt-bilan">' + row('Dégâts en ' + turns + ' tours', st.total) + row('Par tour', Math.round(st.total / turns)) +
      row('Meilleur coup', st.best) + row('Critiques', st.crits + ' / ' + st.hits + ' coups') +
      (fight.riposte ? row('Dégâts reçus', st.taken) + row('PV restants', Math.max(0, Math.ceil(P.hp)) + ' / ' + P.maxHp) : '') + '</ul>' +
      '<p class="muted">Change d’équipement, de caractéristiques ou de sorts au camp, puis reviens comparer.</p>', 'Entraînement terminé', [['again', 'Recommencer'], ['back', 'Retour à la cascade']]);
  }
  // la fin de l'assaut contre l'Alpha : les tours sont écoulés
  async function raidEnd() {
    over = true;
    renderHud();
    sfx('ladder');
    log('Fin de l’assaut !', 'hero');
    await wait(600);
    settle(true);
  }
  // la fin d'un combat du dojo, de la tour ou d'un clan : le texte vient de fight.settle (réputation, XP, dégâts…)
  async function settle(win) {
    fight.settled = true;
    var html;
    try { html = await fight.settle(win); } catch (e) { html = '<p>Le résultat n’a pas pu être enregistré : ' + (e.message || 'réessaie plus tard') + '.</p>'; }
    var title = fight.kind === 'raid' ? (E.hp <= 0 ? 'L’Alpha est tombé !' : (P.hp <= 0 ? 'Tu es à terre…' : 'Fin de l’assaut')) : null;
    showEnd(win, html, title, fight.kind === 'tour'
      ? (win ? (fight.next ? [['next', 'Étage suivant ▶'], ['back', 'Retour à la tour']] : [['back', 'Retour à la tour']]) : [['again', 'Réessayer'], ['back', 'Retour à la tour']])
      : [['back', fight.kind === 'raid' || fight.kind === 'guerre' ? 'Retour au clan' : 'Retour à la cascade']]);
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
    if (over) return;
    over = true;
    E.dead = true;
    sfx(E.rank === 'boss' ? 'bossDown' : 'kill');
    burst(midX(E), GROUND - 30, '#f4f4e8', 30);
    log(E.name + ' est à terre : victoire !', 'hero');
    renderHud();
    await wait(700);
    if (fight.settle) return settle(true);
    // récompenses
    var r = fight.rewards;
    var tier = fight.biomeIndex + 1;
    var loot = rollLoot(save, tier, r.itemChance, fight.luck);
    if (loot) save.owned.push(loot);
    if (fight.albumId) albumKill(save, fight.albumId);
    var xp = clanXp(r.xp), gold = clanGold(r.gold); // avec les bonus du clan
    var levels = gainXp(save, xp);
    save.gold += gold;
    var unlocked = null;
    if (save.progress[fight.biomeIndex] < fight.stage) {
      save.progress[fight.biomeIndex] = fight.stage;
      if (fight.stage === STAGES && BIOMES[fight.biomeIndex + 1]) unlocked = BIOMES[fight.biomeIndex + 1];
    }
    writeSave(save);
    if (levels) sfx('levelup'); else if (loot) sfx('pickup');
    showResult(true, { xp: xp, gold: gold, loot: loot, levels: levels, unlocked: unlocked });
  }

  async function defeat() {
    if (over) return;
    over = true;
    P.dead = true;
    sfx('ko');
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
      html += '<p>+' + info.xp + ' XP · +' + info.gold + ' lucioles' + (clanBonus.xp || clanBonus.lucioles ? ' <small class="bt-clan">(clan : +' + Math.round(clanBonus.xp * 100) + ' % XP, +' + Math.round(clanBonus.lucioles * 100) + ' % lucioles)</small>' : '') + (info.levels ? ' · <b>Niveau ' + save.level + ' !</b> +' + info.levels * POINTS_PER_LEVEL + ' points de caractéristique, +' + info.levels + ' point' + (info.levels > 1 ? 's' : '') + ' de voie' : '') + '</p>';
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
      var e = tw.lin ? p : (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
      tw.obj[tw.key] = tw.from + (tw.to - tw.from) * e;
      if (p >= 1) { tw.done(); return false; }
      return true;
    });
    floaters = floaters.filter(function (f) { f.t += dt; return f.t < 1.1; });
    particles = particles.filter(function (pt) { pt.life -= dt; pt.vy += pt.g * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; return pt.life > 0; });
    fxs = fxs.filter(function (e) { e.t += dt; return e.t < e.dur; });
    [P, E].forEach(function (f) { if (f.hurt > 0) f.hurt -= dt; if (f.palm > 0) f.palm -= dt; });
    shake = Math.max(0, shake - dt * 20);
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  // l'image d'une grenouille selon ce qu'elle fait
  function attImg(f) {
    var im = f.imgs;
    if (f.hurt > 0) return im.hurt[0];
    if (f.pose === 'kick' && im.kick) return im.kick[0];
    if (f.frame) return im.atk[f.frame] || im.atk[1];
    return im.idle[Math.floor(performance.now() / 500) % 2];
  }
  // une grenouille dessinée à la place cx (son centre), tournée de f.rot autour de son centre
  function drawSprite(f, img, cx) {
    var s = fsz(f), top = GROUND - s + f.y;
    if (f.rot) {
      ctx.save(); ctx.translate(R(cx), R(top + s / 2)); ctx.rotate(f.rot);
      ctx.drawImage(img, R(-s / 2), R(-s / 2), s, s);
      ctx.restore();
    } else ctx.drawImage(img, R(cx - s / 2), R(top), s, s);
  }
  function drawFrog(f, now) {
    var s = fsz(f), cx = midX(f);
    ctx.globalAlpha = f.alpha == null ? 1 : f.alpha;
    drawSprite(f, attImg(f), cx);
    ctx.globalAlpha = 1;
    drawSword(f);
    // l'onde de l'arme (bâton, harpon, paume)
    if (f.fx && f.imgs.fx[1]) {
      var fi = f.imgs.fx[f.frame] || f.imgs.fx[1];
      if (f === P) ctx.drawImage(fi, R(P.x) + 56, GROUND - 64 + R(P.y), 64, 64);
      else ctx.drawImage(fi, R(E.x - 56 * s / 64), GROUND - s + R(E.y), s, s);
    }
    if (f.palm > 0) {
      ctx.strokeStyle = 'rgba(243,210,122,' + (f.palm * 3).toFixed(2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(frontX(f) + f.dir * 12, GROUND - 28, 14 + (0.25 - f.palm) * 60, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // les états visibles : garde, bouclier, marque, force, étourdissement
  function drawStates(f, now) {
    if (f.dead) return;
    var s = fsz(f), cx = midX(f), cy = GROUND - s / 2 + f.y;
    if (f.guard > 0) { ctx.globalAlpha = 0.7; pxRing(cx, cy, s * 0.47, s * 0.56, 1, '#c9e07a', true); ctx.globalAlpha = 1; }
    if (f.shield > 0) { ctx.globalAlpha = 0.45 + 0.15 * Math.sin(now / 200); pxRing(cx, cy, s * 0.5, s * 0.6, 1, '#9cd8f8'); ctx.globalAlpha = 1; }
    if (f.mark > 0) { var my = headY(f) - 14, mx = cx; ctx.fillStyle = '#ff5a4a'; pxRing(mx, my, 4, 4, 1, '#ff5a4a'); ctx.fillRect(R(mx) - 6, R(my), 3, 1); ctx.fillRect(R(mx) + 4, R(my), 3, 1); ctx.fillRect(R(mx), R(my) - 6, 1, 3); ctx.fillRect(R(mx), R(my) + 4, 1, 3); }
    if (f.buff > 0 && Math.random() < 0.3) particles.push({ x: cx + (Math.random() - 0.5) * s * 0.5, y: GROUND - 6, vx: 0, vy: -40 - Math.random() * 30, life: 0.5, c: Math.random() < 0.5 ? '#ff9a3a' : '#f3d27a', g: 0 });
    if (f.stun > 0) starsAbove(f, now);
  }

  function draw(now) {
    var sx = Math.round((Math.random() - 0.5) * shake * 0.5), sy = Math.round((Math.random() - 0.5) * shake * 0.5); // des secousses douces
    ctx.save();
    ctx.translate(sx, sy);
    ctx.drawImage(bg, 0, 0, W, H, 0, 0, W, H);
    if (fight.bgFx) fight.bgFx(ctx, now); // un décor animé (l'eau de la cascade)
    if (fight.weather && fight.weather.id !== 'clair') drawWeather(now);

    // ombres
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(midX(P), GROUND - 2, 22 * P.size, 4, 0, 0, Math.PI * 2); ctx.fill();
    var es = enemySize(E);
    if (!E.dead) { ctx.beginPath(); ctx.ellipse(midX(E), GROUND - 2, es * 0.35, 4, 0, 0, Math.PI * 2); ctx.fill(); }

    // Kawazu
    if (!P.dead || Math.floor(now / 150) % 2) drawFrog(P, now);

    // l'ennemi
    if (!E.dead && E.frog) drawFrog(E, now);
    else if (!E.dead) {
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
      var mimg = (E.hurt > 0 ? E.monster.flash : E.monster.frames)[f];
      if (E.rot) { ctx.save(); ctx.translate(R(E.x + es / 2), R(GROUND - es / 2)); ctx.rotate(E.rot); ctx.drawImage(mimg, -es / 2, -es / 2 + hover, es, es); ctx.restore(); }
      else ctx.drawImage(mimg, Math.round(E.x) + shakeE, GROUND - es + hover + R(E.y), es, es);
      if (E.charging) { ctx.fillStyle = '#e05a4a'; ctx.fillRect(Math.round(E.x + es / 2) - 1, GROUND - es - 12 + hover, 2, 6); ctx.fillRect(Math.round(E.x + es / 2) - 1, GROUND - es - 4 + hover, 2, 2); }
    }
    drawStates(P, now); drawStates(E, now);

    // les effets, puis les projectiles en vol
    fxs.forEach(function (e) { e.draw(Math.min(1, e.t / e.dur), now); ctx.globalAlpha = 1; });
    shots.forEach(function (s) { var p = shotPos(s); if (s.draw) s.draw(s, p.x, p.y, now); ctx.globalAlpha = 1; });

    particles.forEach(function (pt) { ctx.fillStyle = pt.c; ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.big ? 3 : 2, pt.big ? 3 : 2); });

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
    var pr = combatProfile(save);
    P = arm({
      hp: pr.maxHp, maxHp: pr.maxHp, dmg: pr.dmg, crit: pr.crit, critMult: pr.critMult, dodge: pr.dodge, agi: pr.agi,
      spell: pr.spell, cdr: pr.cdr, size: pr.size, pas: pr.pas, dmgReduce: pr.dmgReduce,
      skills: deckSkills(save, weapon), kind: weapon.kind, wtype: weaponType(weapon), weapon: weapon, weaponId: baseOf(save.equip.arme || ''),
      blade: weapon.kind === 'mains' ? null : weapon.blade, wave: weapon.wave, hilt: weapon.colors && weapon.colors[4], imgs: heroImgs()
    }, 1, MARGIN);
    var en = f.enemy, size = enemySize(en);
    E = arm(Object.assign({}, en, { hp: en.hp0 != null ? en.hp0 : en.maxHp, turn: 0, charging: false, enraged: false, monster: en.frog ? null : monsterImgs(en) }), -1, W - MARGIN - size);
    [P, E].forEach(function (fi) {
      if (fi.pas.shield) fi.shield = Math.round(fi.maxHp * fi.pas.shield);
      if (fi === P && f.weather && f.weather.startCd) P.skills.forEach(function (s) { if (s.cd) P.cds[s.id] = f.weather.startCd + 1; }); // canicule : les sorts commencent en relance
    });
    tweens = []; floaters = []; particles = []; shots = []; fxs = []; shake = 0;
    busy = true; over = false;
    bg = f.backdrop || buildBackground(BIOMES[f.biomeIndex]);
    $('battle').style.background = f.backdrop ? '#1a1108' : BIOMES[f.biomeIndex].pal.groundDark;
    $('battle').style.setProperty('--bt-bg', 'url(' + bg.toDataURL() + ')');
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
    else if (f.intro) log(f.intro, 'danger');
    else log('Un ' + E.name + ' (niv. ' + E.level + ') barre la route !', 'danger');
    if (E.rarity === 'rare') log('Une créature rare : plus coriace, et un meilleur butin !', 'hero');
    if (E.rarity === 'epique') log('Une créature ÉPIQUE ! Rare de la croiser… son butin l’est aussi.', 'hero');
    if (P.shield) log('Peau de pierre : un bouclier de ' + P.shield + ' PV t’entoure.', 'hero');
    if (E.rank === 'boss') sfx('boss');
    renderHud();
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    // l'Agilité donne plus de chances de commencer (l'arbre d'entraînement laisse toujours la main)
    var t = token, a = Math.max(1, P.agi), b = Math.max(1, E.agi), first = E.agi < 0 || Math.random() < a / (a + b);
    setTimeout(function () {
      if (t !== token) return;
      if (first) { log(heroName() + ' a l’initiative : à toi de commencer.', 'hero'); playerTurn(); }
      else { log(E.name + ' a l’initiative et frappe en premier.', 'danger'); busy = true; renderHud(); enemyTurn(); }
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
      if (save.battle.auto && !busy && !over) act(aiPick(P, E));
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
