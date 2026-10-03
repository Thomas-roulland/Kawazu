// Les cinématiques : de petits films en pixel art (320 × 180, agrandis), joués par-dessus le jeu, qu'on peut passer.
// Un film = { dur, captions: [[ms, texte]], sounds: [[ms, son]], scenes: [{ from, to, draw(ctx, k, t, F) }] } :
// chaque scène dessine son image pour k de 0 à 1 (t : ms depuis le début du film, F : les outils ci-dessous).
// Le premier : le Grand Plongeon, de l'Île au Continent (Cinematic.dive). D'autres viendront à la fin de chaque île.
var Cinematic = (function () {
  var W = 320, H = 180, raf = 0;

  // ---------- Outils de dessin ----------
  function rgb(c) { var n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(a, b, t) { var A = rgb(a), B = rgb(b); return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(A[i] + (B[i] - A[i]) * t); }).join(',') + ')'; }
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function ease(x) { x = clamp(x); return x * x * (3 - 2 * x); }
  function rnd(i, j) { return hash(i, j, 7331); }
  function tools(ctx) {
    var F = {
      W: W, H: H, mix: mix, ease: ease, clamp: clamp, rnd: rnd,
      R: function (x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
      // un dégradé en bandes de pixels (stops : [[0..1, couleur], …])
      bands: function (y0, y1, stops, step) {
        step = step || 3;
        for (var y = Math.floor(y0); y < y1; y += step) {
          var p = clamp((y - y0) / Math.max(1, y1 - y0)), i = 0;
          while (i < stops.length - 2 && p > stops[i + 1][0]) i++;
          var a = stops[i], b = stops[i + 1], q = clamp((p - a[0]) / Math.max(0.0001, b[0] - a[0]));
          ctx.fillStyle = mix(a[1], b[1], Math.round(q * 6) / 6); ctx.fillRect(0, y, W, step);
        }
      },
      // une crête de montagnes (heights : hauteur par colonne), décalée de dx, avec neige et bord éclairé
      ridge: function (heights, dx, color, light, snow) {
        for (var x = 0; x < W; x++) {
          var hgt = heights[((x + Math.round(dx)) % heights.length + heights.length) % heights.length];
          F.R(x, hgt, 1, H - hgt, color);
          if (light) F.R(x, hgt, 1, 1, light);
          if (snow && hgt < snow[0]) F.R(x, hgt + 1, 1, Math.min(3, snow[0] - hgt), snow[1]);
        }
      },
      // la grenouille (une image 32 × 32), centrée en (x, y), à l'échelle s, tournée de rot, écrasée (sy < 1)
      frog: function (img, x, y, s, rot, sy) {
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (rot) ctx.rotate(rot);
        var h = 32 * s * (sy || 1); ctx.drawImage(img, -16 * s, 16 * s - h, 32 * s, h); ctx.restore();
      },
      fade: function (a, c) { if (a <= 0) return; ctx.globalAlpha = Math.min(1, a); F.R(0, 0, W, H, c || '#000000'); ctx.globalAlpha = 1; },
      alpha: function (a, fn) { ctx.globalAlpha = clamp(a); fn(); ctx.globalAlpha = 1; },
      ctx: ctx
    };
    return F;
  }
  // une crête : des sinus mêlés et un peu de bruit, entre top et top + amp
  function ridgeOf(seed, len, top, amp, rough) {
    var a = [];
    for (var x = 0; x < len; x++) {
      var v = 0.5 + 0.28 * Math.sin(x / 23 + seed) + 0.16 * Math.sin(x / 9.3 + seed * 2.1) + 0.06 * Math.sin(x / 3.1 + seed * 5.3);
      a.push(Math.round(top + amp * (1 - v) + (rough ? (rnd(seed, x) - 0.5) * rough : 0)));
    }
    return a;
  }

  // ---------- Le lecteur ----------
  function play(film, done) {
    var box = document.getElementById('cinematic'), cv = document.getElementById('cine-canvas'), cap = document.getElementById('cine-caption');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    var F = tools(ctx), t0 = performance.now(), shown = -1, played = {}, over = false;
    box.hidden = false;
    var end = function () {
      if (over) return; over = true;
      cancelAnimationFrame(raf); box.hidden = true; box.onclick = null; window.removeEventListener('keydown', key);
      if (done) done();
    };
    var key = function (e) { if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); end(); } };
    box.onclick = function (e) { if (e.target.closest('[data-cine-skip]')) end(); };
    window.addEventListener('keydown', key);
    (function frame(now) {
      if (over) return;
      var t = now - t0;
      for (var ci = film.captions.length - 1; ci >= 0; ci--) {
        if (t < film.captions[ci][0]) continue;
        if (ci !== shown) { shown = ci; cap.innerHTML = film.captions[ci][1].replace(/^([^·]+) · /, '<b>$1</b>'); cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in'); }
        break;
      }
      (film.sounds || []).forEach(function (s, i) { if (t >= s[0] && !played[i]) { played[i] = true; if (window.Sfx) Sfx.play(s[1]); } });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (var si = 0; si < film.scenes.length; si++) {
        var sc = film.scenes[si];
        if (t >= sc.from && (t < sc.to || si === film.scenes.length - 1)) { sc.draw(ctx, clamp((t - sc.from) / (sc.to - sc.from)), t, F); break; }
      }
      if (t >= film.dur) { end(); return; }
      raf = requestAnimationFrame(frame);
    })(t0);
    return end;
  }


  // ---------- Le final commun : on s'élève au-dessus d'une île, sa carte se découvre, et son nom s'écrit ----------
  function mapReveal(ctx, k, F, map, land, title, sub, size) {
    var r0 = map.REGIONS[0], z = 3.2 - ease(k * 1.3) * (3.2 - Math.max(W / map.W, H / map.H) * 1.02);
    var vw = W / z, vh = H / z, cx = r0.x + (map.W / 2 - r0.x) * ease(k * 1.3), cy = r0.y + (map.H / 2 - r0.y) * ease(k * 1.3);
    ctx.drawImage(land, Math.max(0, Math.min(map.W - vw, cx - vw / 2)), Math.max(0, Math.min(map.H - vh, cy - vh / 2)), vw, vh, 0, 0, W, H);
    F.alpha(0.3 + 0.25 * clamp((k - 0.1) / 0.3), function () { F.R(0, 0, W, H, '#0a0c1c'); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = size + 'px "Press Start 2P", monospace';
    var n = Math.floor(clamp((k - 0.12) / 0.4) * title.length + 0.001), txt = title.slice(0, n);
    [[2, 2, '#1a0c04'], [-1, 0, '#1a0c04'], [1, 0, '#1a0c04'], [0, -1, '#1a0c04'], [0, 1, '#1a0c04'], [0, 0, '#ffd870']].forEach(function (o) { ctx.fillStyle = o[2]; ctx.fillText(txt, 160 + o[0] - (title.length - n) * size / 2, 70 + o[1]); });
    if (k > 0.55) {
      ctx.font = '8px "Press Start 2P", monospace';
      F.alpha((k - 0.55) / 0.15, function () { ctx.fillStyle = '#1a0c04'; ctx.fillText(sub, 161, 97); ctx.fillStyle = '#fff6d8'; ctx.fillText(sub, 160, 96); });
    }
    F.fade(1 - k * 8, '#ffffff');
    F.fade((k - 0.9) / 0.1);
  }

  // ---------- Le Grand Plongeon ----------
  // hero : les images de la grenouille (face, profil : quelques images au repos, la cape y flotte) ; map : la carte du Continent
  function dive(hero, map) {
    var face = hero.face, side = hero.profil, at = function (list, t) { return list[Math.floor(t / (1000 / list.length)) % list.length]; };
    var far = ridgeOf(1.7, 400, 96, 16, 2), mid = ridgeOf(4.2, 420, 86, 40, 3), isle = ridgeOf(8.1, 120, 104, 6, 1);
    var land = null;
    // le pic où se tient la grenouille : une aiguille de roche qui sort du bas de l'image
    var PEAK = 118, peakTop = function (x) { var d = Math.abs(x - PEAK); return 86 + Math.pow(d, 1.18) * 0.62 + (d > 3 ? (rnd(3, x) - 0.5) * 3 : 0) + (d % 16 < 3 && d > 10 ? 2 : 0); };
    var feathers = []; for (var i = 0; i < 8; i++) feathers.push({ x: 60 + i * 26 + rnd(i, 1) * 20, y: -20 - i * 22, s: 0.6 + rnd(i, 2) * 0.6, p: rnd(i, 3) * 6 });
    var clouds = []; for (var c = 0; c < 14; c++) clouds.push({ x: rnd(c, 4) * W, y: rnd(c, 5) * 260, w: 18 + rnd(c, 6) * 46, v: 0.6 + rnd(c, 7) * 1.4 });
    var drops = []; for (var d = 0; d < 70; d++) { var an = -Math.PI / 2 + (rnd(d, 8) - 0.5) * 2.2, sp = 60 + rnd(d, 9) * 170; drops.push({ vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, s: rnd(d, 10) < 0.3 ? 2 : 1 }); }
    var fish = []; for (var f = 0; f < 12; f++) fish.push({ x: rnd(f, 11) * 380, y: 60 + rnd(f, 12) * 40, v: 14 + rnd(f, 13) * 10 });
    var title = 'LE CONTINENT';

    // ---- 1. Le sommet, à l'aube ; la grenouille regarde la mer, puis prend son élan ----
    // à gauche, les montagnes de l'île qui descendent vers la mer ; à droite, la mer, le soleil qui se lève, et au loin
    // la terre inconnue ; devant, l'aiguille de roche où se tient la grenouille, au-dessus d'une mer de nuages
    function summit(ctx, k, t, F) {
      var lift = -8 * (1 - ease(k * 1.4)), HZ = 106 + lift; // la caméra remonte doucement ; HZ : l'horizon
      F.bands(0, HZ, [[0, '#14173a'], [0.35, '#3a2f6a'], [0.68, '#b0587a'], [0.88, '#f09a6a'], [1, '#ffd88a']]);
      for (var s = 0; s < 40; s++) F.alpha(0.8 - k, function () { F.R(rnd(s, 20) * W, rnd(s, 21) * 50 + lift, 1, 1, '#fff6e0'); });
      // le soleil qui sort de la mer, et son reflet qui scintille
      var sx = 252, sy = HZ + 2;
      [[26, 'rgba(255,220,140,0.1)'], [18, 'rgba(255,220,140,0.18)'], [12, '#ffe8a8'], [9, '#fff6d8']].forEach(function (r) { ctx.fillStyle = r[1]; ctx.beginPath(); ctx.arc(sx, sy, r[0], Math.PI, 0); ctx.fill(); });
      F.bands(HZ, H, [[0, '#8a5a7a'], [0.3, '#4a3a6a'], [1, '#161a36']], 2);
      for (var r = 0; r < 30; r++) { var ry = HZ + 2 + r * 2.4, half = 8 + r * 1.5, wob = Math.sin(t / 160 + r) * 3; F.R(sx - half / 2 + wob + (r % 2) * 4, ry, half * (0.3 + 0.5 * rnd(r, Math.floor(t / 180))), 1, r < 9 ? '#ffe0a0' : '#c88a7a'); }
      for (var wv = 0; wv < 26; wv++) F.R((rnd(wv, 22) * W + t / 50) % W, HZ + 4 + rnd(wv, 23) * (H - HZ), 4, 1, '#6a5a8a');
      // au loin, sous le soleil, une terre inconnue (le Continent)
      for (var x = 0; x < 110; x++) { var lh = isle[x] - 100; F.R(196 + x, HZ - 6 + lh * 0.7, 1, 7 - lh * 0.7, '#5a3a6a'); }
      // les montagnes de l'île, qui descendent vers la mer (plus basses à mesure qu'on va vers la droite)
      for (var mx = 0; mx < 190; mx++) {
        var slope = mx / 190, fh = far[mx] - 20 + slope * 38 + lift, mh = mid[mx] - 6 + slope * 46 + lift;
        if (fh < HZ) { F.R(mx, fh, 1, HZ - fh + 1, '#4a3466'); F.R(mx, fh, 1, 1, '#a06a8a'); }
        if (mh < H) { F.R(mx, mh, 1, H - mh, '#2a2242'); F.R(mx, mh, 1, 1, '#c07a7a'); if (mh < 84 + lift) F.R(mx, mh + 1, 1, 2, '#d8c8e0'); }
      }
      // la mer de nuages, rose, au pied du pic
      for (var cl = 0; cl < 9; cl++) {
        var cx = ((rnd(cl, 24) * 360 + t / (60 + cl * 9)) % 380) - 40, cy = 124 + rnd(cl, 25) * 26 + lift, cw = 40 + rnd(cl, 26) * 50;
        F.alpha(0.75, function () { F.R(cx, cy, cw, 6, '#e8b0b8'); F.R(cx + 8, cy - 3, cw * 0.6, 3, '#f8d0c8'); F.R(cx + 3, cy + 6, cw - 6, 2, '#b07a98'); });
      }
      // l'aiguille de roche : la face au soleil (à droite) éclairée, des corniches, des strates, de la neige au sommet
      for (var px = 60; px < 186; px++) {
        var top = peakTop(px) + lift; if (top > H) continue;
        var lit = px >= PEAK;
        F.R(px, top, 1, H - top, lit ? '#5a4662' : '#2c2438');
        for (var sy2 = top + 6; sy2 < H; sy2 += 9) if ((px + sy2) % 7 < 4) F.R(px, sy2 + (px % 3), 1, 1, lit ? '#46364e' : '#221c2c');
        F.R(px, top, 1, 1, lit ? '#ffc890' : '#6a5a7a');
        if (top < 94 + lift) F.R(px, top + 1, 1, top < 89 + lift ? 3 : 1, lit ? '#fff0d8' : '#b8b8d0');
      }
      // les plumes du Héron vaincu, qui tombent en tournoyant
      feathers.forEach(function (fe, i) {
        var fy = fe.y + (t / 1000) * 26 * fe.s + lift, fx = fe.x + Math.sin(t / 500 + fe.p) * 8 + t / 1000 * 10;
        if (fy > -4 && fy < H) { F.R(fx, fy, 3, 1, '#eef0f6'); F.R(fx + (Math.sin(t / 300 + i) > 0 ? 3 : -1), fy, 1, 1, '#9aa0b0'); }
      });
      // le vent : des traits clairs
      for (var wl = 0; wl < 8; wl++) { var wx = ((t / 4 + rnd(wl, 30) * 400) % 420) - 60; F.alpha(0.35, function () { F.R(wx, 24 + rnd(wl, 31) * 80 + lift, 10 + rnd(wl, 32) * 14, 1, '#fff6e0'); }); }
      // la grenouille : debout face à la mer (sa cape flotte), puis elle se ramasse, et bondit
      var crouch = clamp((k - 0.78) / 0.07), leap = clamp((k - 0.85) / 0.15), feet = peakTop(PEAK) + lift;
      if (leap <= 0) F.frog(at(side, t), PEAK, feet - 13, 0.85, 0, 1 - crouch * 0.18);
      else {
        F.frog(at(side, t), PEAK + leap * 110, feet - 13 - leap * 120 + leap * leap * 60, 0.85, leap * 1.4);
        for (var pf = 0; pf < 6; pf++) F.alpha(1 - leap * 1.5, function () { F.R(PEAK - 8 + pf * 3 - leap * 6 * (pf - 2.5), feet - 2 - leap * 6 * rnd(pf, 40), 2, 2, '#d8c8c0'); });
      }
      F.fade(1 - k * 6); // ouverture au noir
    }

    // ---- 2. La chute : les nuages filent vers le haut, la mer approche ----
    function fall(ctx, k, t, F) {
      F.bands(0, H, [[0, '#2a3a7a'], [0.5, '#7a7ab0'], [1, '#f0b890']]);
      clouds.forEach(function (cl) {
        var cy = ((cl.y - (t - 4200) * 0.22 * cl.v) % 260 + 260) % 260 - 40;
        F.alpha(0.85, function () { F.R(cl.x, cy, cl.w, 6, '#f6eef0'); F.R(cl.x + 5, cy - 4, cl.w * 0.6, 4, '#ffffff'); F.R(cl.x + 2, cy + 6, cl.w - 4, 2, '#d8c8d8'); });
      });
      for (var sl = 0; sl < 22; sl++) { var lx = rnd(sl, 50) * W, ly = ((rnd(sl, 51) * H - (t - 4200) * 0.6) % H + H) % H; F.alpha(0.4, function () { F.R(lx, ly, 1, 10 + rnd(sl, 52) * 14, '#ffffff'); }); }
      // la mer qui monte du bas de l'image
      var seaY = H + 10 - ease((k - 0.45) / 0.55) * (H - 74);
      if (seaY < H) {
        F.bands(seaY, H, [[0, '#3a7aa0'], [1, '#12324e']], 2);
        for (var wv = 0; wv < 30; wv++) F.R((rnd(wv, 53) * W + t / 20) % W, seaY + rnd(wv, 54) * (H - seaY), 4, 1, '#7ab8d0');
        for (var cx = 0; cx < W; cx += 2) F.R(cx, seaY + Math.round(Math.sin(cx / 8 + t / 200)), 2, 1, '#e8f6ff');
      }
      // la grenouille : elle culbute, puis se met tête en bas, en piqué
      var tumble = clamp(k / 0.45), rot = tumble < 1 ? tumble * Math.PI * 3 : Math.PI / 2 + Math.sin(t / 120) * 0.08;
      F.frog(at(side, t), 160 + Math.sin(t / 260) * 6 * (1 - tumble), 64 + Math.sin(t / 400) * 4, 0.9, rot);
    }

    // ---- 3. Le plongeon : une gerbe d'eau, des cercles, un éclair ----
    function splash(ctx, k, t, F) {
      var shake = k < 0.3 ? (rnd(Math.floor(t / 40), 60) - 0.5) * 4 : 0;
      ctx.setTransform(1, 0, 0, 1, Math.round(shake), 0);
      F.bands(0, 74, [[0, '#7a7ab0'], [1, '#f0b890']]);
      F.bands(74, H, [[0, '#3a7aa0'], [1, '#12324e']], 2);
      for (var cx = 0; cx < W; cx += 2) F.R(cx, 74 + Math.round(Math.sin(cx / 8 + t / 200)), 2, 1, '#e8f6ff');
      // les cercles qui s'élargissent
      for (var ring = 0; ring < 3; ring++) {
        var rr = (k * 1.4 - ring * 0.18) * 120; if (rr <= 0) continue;
        ctx.strokeStyle = 'rgba(232,246,255,' + clamp(1 - rr / 140) + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(160, 76, rr, rr * 0.18, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // la colonne d'eau, et les gouttes qui retombent
      var col = Math.sin(Math.min(1, k * 1.6) * Math.PI) * 54;
      F.R(155, 74 - col, 10, col, '#d8f0ff'); F.R(157, 74 - col - 4, 6, 4, '#ffffff');
      var tt = k * 0.8;
      drops.forEach(function (dr, i) { var x = 160 + dr.vx * tt, y = 74 + dr.vy * tt + 300 * tt * tt; if (y < 76) F.R(x, y, dr.s, dr.s, i % 3 ? '#e8f6ff' : '#9ad0ea'); });
      F.fade(1 - k * 5, '#ffffff');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // ---- 4. Sous l'eau : les rayons, les poissons, les algues ; tout au fond, un tourbillon de lumière ----
    function vortex(ctx, F, cx, cy, R, t, a) {
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.6);
      g.addColorStop(0, 'rgba(255,250,220,' + 0.9 * a + ')'); g.addColorStop(1, 'rgba(120,220,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 0.6, 0, Math.PI * 2); ctx.fill();
      for (var arm = 0; arm < 4; arm++) for (var j = 0; j < 46; j++) {
        var q = j / 46, ang = arm * Math.PI / 2 + t / 260 + q * 5.2, r = R * Math.pow(q, 0.85);
        var x = cx + Math.cos(ang) * r * 1.5, y = cy + Math.sin(ang) * r * 0.62;
        F.alpha(a * (1 - q * 0.8), function () { F.R(x, y, q < 0.4 ? 2 : 1, q < 0.4 ? 2 : 1, (j + arm) % 3 ? '#8af0ff' : '#ffe08a'); });
      }
    }
    function deep(ctx, k, t, F) {
      F.bands(0, H, [[0, '#2a7a9a'], [0.45, '#0e3a5e'], [1, '#040c1c']]);
      for (var sx2 = 0; sx2 < W; sx2 += 2) F.R(sx2, 3 + Math.round(Math.sin(sx2 / 6 + t / 240) * 1.5), 2, 1, '#9ae0f0');
      for (var ray = 0; ray < 6; ray++) {
        var x0 = 20 + ray * 56 + Math.sin(t / 1300 + ray) * 12;
        ctx.fillStyle = 'rgba(170,230,255,0.06)'; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 14, 0); ctx.lineTo(x0 + 54, H); ctx.lineTo(x0 + 30, H); ctx.fill();
      }
      for (var pl = 0; pl < 40; pl++) F.R((rnd(pl, 70) * W + Math.sin(t / 900 + pl) * 4), (rnd(pl, 71) * H + t / 90) % H, 1, 1, 'rgba(200,240,255,0.5)');
      fish.forEach(function (fi, i) { var x = ((fi.x - (t / 1000) * fi.v) % 380 + 380) % 380 - 30, y = fi.y + Math.sin(t / 400 + i) * 3; F.R(x, y, 4, 2, '#0a2238'); F.R(x + 4, y - 1, 2, 4, '#0a2238'); });
      for (var kp = 0; kp < 14; kp++) {
        var kx = 8 + kp * 23 + rnd(kp, 72) * 8, kh = 20 + rnd(kp, 73) * 34;
        for (var seg = 0; seg < kh; seg += 2) F.R(kx + Math.sin(t / 700 + kp + seg / 9) * (seg / 10), H - seg, 2, 2, seg % 6 ? '#1a4a3a' : '#2a6a4a');
      }
      F.R(0, H - 6, W, 6, '#08140e');
      // le tourbillon grandit tout au fond
      var vk = clamp((k - 0.3) / 0.7), vy = 150 - vk * 20;
      if (vk > 0) vortex(ctx, F, 160, vy, 12 + vk * 70, t, vk);
      // la grenouille coule, tête en bas, en laissant des bulles, et file vers le cœur du tourbillon
      var sink = ease(k), fx = 160 + Math.sin(t / 500) * 10 * (1 - sink), fy = 26 + sink * (vy - 40), sc = 0.85 * (1 - sink * 0.45);
      for (var b = 0; b < 12; b++) { var age = ((t / 140 + b * 1.7) % 12) / 12; F.alpha(1 - age, function () { F.R(fx + Math.sin(age * 9 + b) * 4, fy - 8 - age * 50, age < 0.5 ? 2 : 1, age < 0.5 ? 2 : 1, '#c8f0ff'); }); }
      F.frog(at(side, t), fx, fy, sc, Math.PI / 2 + Math.sin(t / 300) * 0.15 + sink * sink * 4);
      F.fade(1 - k * 8, '#ffffff');
    }

    // ---- 5. Le tourbillon l'emporte : il remplit l'image, puis tout devient blanc ----
    function engulf(ctx, k, t, F) {
      F.bands(0, H, [[0, '#0e3a5e'], [1, '#040c1c']]);
      vortex(ctx, F, 160, 110 - k * 20, 82 + ease(k) * 240, t * (1 + k * 2), 1);
      F.frog(at(side, t), 160, 92 - k * 2, 0.47 * (1 - ease(k)), Math.PI / 2 + t / 90);
      F.fade((k - 0.55) / 0.45, '#ffffff');
    }

    // ---- 6. La plage du Continent : la grenouille jaillit de l'eau et pose le pied sur le sable ----
    function beach(ctx, k, t, F) {
      F.bands(0, 90, [[0, '#6ab0e0'], [0.6, '#bfe0f0'], [1, '#ffe8c0']]);
      ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(70, 70, 12, 0, Math.PI * 2); ctx.fill();
      // au loin, les herbes hautes de la Plaine des Vents, couchées par le vent
      for (var x = 0; x < W; x++) { var gh = 84 - Math.round(4 + 3 * Math.sin(x / 13) + 2 * Math.sin(x / 5.3)); F.R(x, gh, 1, 92 - gh, x > 150 ? '#8aa840' : '#6a8a3a'); if (x % 3 === 0) F.R(x + Math.round(Math.sin(t / 300 + x / 7)), gh - 2, 1, 2, '#c8d060'); }
      F.R(0, 90, W, H - 90, '#f0d498');
      // la mer arrive en biais sur la gauche, avec son écume
      for (var y = 92; y < H; y++) {
        var edge = 150 - (y - 92) * 1.2 + Math.sin(t / 500 + y / 6) * 4;
        F.R(0, y, edge, 1, y < 120 ? '#3a8ab0' : '#2a6a90');
        F.R(edge, y, 3, 1, '#ffffff'); F.R(edge + 3, y, 6, 1, '#d8c088');
      }
      for (var bd = 0; bd < 3; bd++) { var bx = ((t / 30 + bd * 70) % 380) - 30, by = 30 + bd * 9 + Math.sin(t / 300 + bd) * 2, wing = Math.sin(t / 120 + bd) > 0 ? -1 : 1; F.R(bx, by, 2, 1, '#3a3a4a'); F.R(bx - 2, by + wing, 2, 1, '#3a3a4a'); F.R(bx + 2, by + wing, 2, 1, '#3a3a4a'); }
      // la grenouille : elle jaillit (gerbe d'eau), retombe sur le sable (poussière), puis se tourne vers nous
      var jump = clamp((k - 0.08) / 0.42), jx = 96 + jump * 108, jy = 150 - Math.sin(jump * Math.PI) * 70 + (1 - jump) * 0;
      if (k < 0.08) { for (var sp = 0; sp < 12; sp++) F.R(96 + (rnd(sp, 80) - 0.5) * 20, 150 - rnd(sp, 81) * 30 * (k / 0.08), 2, 2, '#e8f6ff'); }
      else if (jump < 1) { F.frog(at(side, t), jx, jy - 14, 0.8, -0.4 + jump * 0.8); for (var dp = 0; dp < 5; dp++) F.alpha(1 - jump * 2, function () { F.R(96 + (rnd(dp, 82) - 0.5) * 18, 146 - jump * 60 * rnd(dp, 83), 2, 2, '#e8f6ff'); }); }
      else {
        var land2 = clamp((k - 0.5) / 0.1);
        F.frog(k < 0.62 ? at(side, t) : at(face, t), 204, 136, 0.8, 0, 1 - (1 - land2) * 0.2);
        for (var du = 0; du < 8; du++) F.alpha(1 - land2, function () { F.R(204 + (du - 4) * 4 * (1 + land2), 150 - land2 * 4 * rnd(du, 84), 2, 2, '#e0c890'); });
      }
      F.fade(1 - k * 4, '#ffffff');
    }

    // ---- 7. On s'élève au-dessus du Continent : sa carte se découvre, et son nom ----
    function reveal(ctx, k, t, F) {
      if (!land) { var all = []; for (var li = 0; li < map.REGIONS.length; li++) all.push(li); land = map.render(all).canvas; }
      mapReveal(ctx, k, F, map, land, title, 'SEIZE TERRES À CONQUÉRIR', 16);
    }

    return {
      dur: 17500,
      captions: [
        [0, 'Le Héron Ancestral est tombé. Du haut du sommet, on voit toute l’île… et, au loin, sous le soleil, une terre inconnue.'],
        [3700, 'Alors la grenouille prend son élan, et plonge.'],
        [6400, 'Tout au fond, un tourbillon d’eau et de lumière l’emporte…'],
        [10800, 'Elle ressort sur une plage où le vent couche les herbes.'],
        [13300, 'LE CONTINENT · Seize terres, plus vastes et plus dangereuses. Ici, il faudra se battre pour chaque objet.']
      ],
      sounds: [[3500, 'whoosh'], [4300, 'whoosh'], [5600, 'splash'], [5650, 'thud'], [7600, 'energy'], [9600, 'riser'], [10400, 'glint'], [11000, 'splash'], [12100, 'thud'], [13400, 'levelup']],
      scenes: [
        { from: 0, to: 4200, draw: summit },
        { from: 4200, to: 5600, draw: fall },
        { from: 5600, to: 6400, draw: splash },
        { from: 6400, to: 9900, draw: deep },
        { from: 9900, to: 10800, draw: engulf },
        { from: 10800, to: 13300, draw: beach },
        { from: 13300, to: 17500, draw: reveal }
      ]
    };
  }


  // ---------- La Traversée : du Trône de l'Orage à l'Île des Colosses ----------
  // Le Dragon-Tempête s'effondre dans l'orage ; à l'aube, des titans marchent sur la mer, une tortue géante se soulève
  // et prend la grenouille sur son dos ; un léviathan passe dessous ; sur le rivage, des arbres hauts comme le ciel, et
  // le pied d'un titan qui s'abat. Puis la carte de l'île et son nom.
  function crossing(hero, map) {
    var face = hero.face, side = hero.profil, at = function (list, t) { return list[Math.floor(t / (1000 / list.length)) % list.length]; };
    var dragon = null, land = null, sea = ridgeOf(2.3, 400, 0, 1, 0);
    var rain = []; for (var i = 0; i < 70; i++) rain.push({ x: rnd(i, 90) * 360, y: rnd(i, 91) * 200, v: 0.8 + rnd(i, 92) * 0.6 });
    var bolts = [[500, 620], [1700, 1780], [2900, 2970]];
    function bolt(F, x0, seed) { var x = x0, y = 0; while (y < 120) { var nx = x + (rnd(seed, y) - 0.5) * 14, ny = y + 6 + rnd(seed + 1, y) * 6; F.ctx.strokeStyle = '#e8f4ff'; F.ctx.lineWidth = 2; F.ctx.beginPath(); F.ctx.moveTo(x, y); F.ctx.lineTo(nx, ny); F.ctx.stroke(); x = nx; y = ny; } }
    // la mer, vue de côté : des bandes et des vaguelettes qui défilent (vitesse v)
    function waves(F, y0, t, v, stops) {
      F.bands(y0, F.H, stops, 2);
      for (var w = 0; w < 40; w++) { var wx = ((rnd(w, 93) * 400 - t * v) % 400 + 400) % 400 - 40, wy = y0 + 3 + rnd(w, 94) * (F.H - y0); F.R(wx, wy, 5 + rnd(w, 95) * 6, 1, 'rgba(230,245,255,0.5)'); }
      for (var x = 0; x < F.W; x += 2) F.R(x, y0 + Math.round(Math.sin((x + t * v) / 9) * 1.2), 2, 1, '#e8f6ff');
    }
    // la tortue, vue de côté : une carapace en écailles, de la mousse et un petit arbre dessus, la tête tendue
    function turtle(F, cx, cy, s, t, rise) {
      var ctx = F.ctx;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
      for (var fl = 0; fl < 2; fl++) { var a = Math.sin(t / 260 + fl * 2) * 0.5; ctx.save(); ctx.translate(-30 + fl * 50, 8); ctx.rotate(a); F.R(-4, 0, 22, 6, '#3a5a3a'); ctx.restore(); }
      F.R(54, -6, 18, 9, '#4a6a44'); F.R(66, -9, 10, 8, '#4a6a44'); F.R(72, -7, 2, 2, '#f0e060'); F.R(73, -7, 1, 1, '#101010'); // la tête
      ctx.fillStyle = '#1a2a18'; ctx.beginPath(); ctx.ellipse(0, 0, 62, 26, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#3a5a30'; ctx.beginPath(); ctx.ellipse(0, 0, 60, 24, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#4e7040'; ctx.beginPath(); ctx.ellipse(-6, -2, 50, 19, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#26401e'; ctx.lineWidth = 1.5;
      [[-34, -10], [-12, -16], [12, -16], [34, -10], [-22, -4], [0, -6], [22, -4]].forEach(function (p) { ctx.beginPath(); ctx.ellipse(p[0], p[1], 9, 5, 0, 0, Math.PI * 2); ctx.stroke(); });
      F.R(-58, -2, 116, 3, '#26401e');
      F.R(8, -40, 3, 16, '#5a3a20'); ctx.fillStyle = '#3a8a2a'; ctx.beginPath(); ctx.arc(9, -42, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#6ac04a'; ctx.beginPath(); ctx.arc(7, -44, 4, 0, Math.PI * 2); ctx.fill(); // le petit arbre
      [[-40, -14], [-20, -21], [30, -18], [44, -8]].forEach(function (p) { F.R(p[0], p[1], 5, 2, '#6aa04a'); }); // la mousse
      if (rise) for (var d = 0; d < 14; d++) { var dy = ((t / 4 + d * 17) % 40); F.alpha(1 - dy / 40, function () { F.R(-60 + d * 9, -6 + dy, 2, 3, '#e8f6ff'); }); } // l'eau qui ruisselle
      ctx.restore();
    }

    // ---- 1. Le Trône foudroyé : le Dragon-Tempête tombe, la pluie, les éclairs, puis la lumière ----
    function storm(ctx, k, t, F) {
      if (!dragon) { var p = {}; Object.keys(SPECIES.dragon.pal).forEach(function (c) { p[c] = '#0e1022'; }); p.y = '#6af0ff'; p.w = '#6af0ff'; dragon = stringsToCanvas(SPECIES.dragon.frames[0], p); }
      var dawn = clamp((k - 0.62) / 0.38);
      F.bands(0, F.H, [[0, mix('#101428', '#3a3a6a', dawn)], [0.55, mix('#262c50', '#b0707a', dawn)], [1, mix('#3a4064', '#f0b080', dawn)]]);
      // la mer, démontée, tout en bas
      waves(F, 142, t, 0.05, [[0, mix('#1a2440', '#5a6a90', dawn)], [1, mix('#060a16', '#1a2a48', dawn)]]);
      for (var c = 0; c < 9; c++) { var cx = ((rnd(c, 96) * 420 + t / (30 + c * 6)) % 440) - 60, cy = 10 + rnd(c, 97) * 60; F.alpha(0.9 - dawn * 0.5, function () { F.R(cx, cy, 70 + rnd(c, 98) * 50, 10, '#1e2240'); F.R(cx + 10, cy - 6, 40, 6, '#262a4c'); }); }
      // le dragon qui tombe en tournoyant, sous les éclairs
      var fall = ease(clamp((k - 0.12) / 0.6));
      ctx.save(); ctx.translate(230 + fall * 30, 30 + fall * 190); ctx.rotate(-0.4 + fall * 1.6); ctx.drawImage(dragon, -48, -48, 96, 96); ctx.restore();
      bolts.forEach(function (b, i) { if (t > b[0] && t < b[1]) { F.fade(0.55, '#ffffff'); bolt(F, 190 + i * 30, i * 7 + 3); } });
      // les rayons de l'aube qui percent
      if (dawn > 0) for (var r = 0; r < 5; r++) { ctx.fillStyle = 'rgba(255,220,150,' + 0.12 * dawn + ')'; ctx.beginPath(); ctx.moveTo(260 + r * 22, 0); ctx.lineTo(276 + r * 22, 0); ctx.lineTo(160 + r * 40, F.H); ctx.lineTo(130 + r * 40, F.H); ctx.fill(); }
      // le trône brisé : une plate-forme de pierre, deux piliers cassés
      F.R(0, 132, 176, 48, '#1a1c2c'); F.R(0, 130, 172, 3, '#3a3e58'); for (var px = 0; px < 172; px += 12) F.R(px, 133, 1, 47, '#14162a');
      F.R(20, 70, 14, 62, '#262a40'); F.R(20, 70, 3, 62, '#3a3e58'); F.R(18, 66, 18, 5, '#2e3250');
      F.R(140, 96, 12, 36, '#262a40'); F.R(140, 96, 3, 36, '#3a3e58'); F.R(138, 92, 10, 4, '#2e3250');
      F.frog(at(side, t), 104, 118, 0.85, 0);
      // la pluie, qui cesse à l'aube
      rain.forEach(function (d) { var y = (d.y + t * 0.35 * d.v) % 200 - 10, x = (d.x - t * 0.08) % 360; F.alpha(0.5 * (1 - dawn), function () { F.R(x, y, 1, 6, '#9ab0d0'); }); });
      F.fade(1 - k * 6);
    }

    // ---- 2. À l'aube : des titans marchent dans la brume, la tortue se soulève, la grenouille saute ----
    function rise(ctx, k, t, F) {
      F.bands(0, 100, [[0, '#3a4a7a'], [0.55, '#c88a8a'], [1, '#ffd8a0']]);
      ctx.fillStyle = '#fff0c8'; ctx.beginPath(); ctx.arc(250, 100, 14, Math.PI, 0); ctx.fill();
      // les titans, très loin
      var walk = t / 600;
      F.alpha(0.55, function () {
        var tx = 40 + t * 0.006;
        F.R(tx, 38, 16, 30, '#6a6a8a'); F.ctx.fillStyle = '#6a6a8a'; F.ctx.beginPath(); F.ctx.arc(tx + 8, 33, 7, 0, Math.PI * 2); F.ctx.fill();
        F.R(tx - 6, 42, 6, 20, '#6a6a8a'); F.R(tx + 16, 42, 6, 22, '#6a6a8a');
        F.R(tx + 2 + Math.sin(walk) * 3, 68, 5, 32, '#6a6a8a'); F.R(tx + 9 - Math.sin(walk) * 3, 68, 5, 32, '#6a6a8a');
        var gx = 168 - t * 0.003;
        F.R(gx, 58, 8, 42, '#5a6a6a'); F.ctx.beginPath(); F.ctx.ellipse(gx + 4, 52, 22, 13, 0, 0, Math.PI * 2); F.ctx.fillStyle = '#5a6a6a'; F.ctx.fill();
      });
      waves(F, 100, t, 0.01, [[0, '#8a8ab0'], [0.4, '#3a5a80'], [1, '#1a2a48']]);
      F.alpha(0.35, function () { F.R(0, 92, F.W, 12, '#f0e0e8'); }); // la brume
      // la tortue qui monte des profondeurs
      var up = ease(clamp((k - 0.15) / 0.45)), ty = 196 - up * 52;
      turtle(F, 150, ty, 1, t, up > 0 && up < 1 || k < 0.75);
      if (up < 1) for (var b = 0; b < 16; b++) F.R(90 + rnd(b, 99) * 120, ty + 4 - rnd(b, 100) * 10 * up, 2, 2, '#e8f6ff');
      // la grenouille sur son rocher, puis le saut sur la carapace
      F.R(236, 140, 60, 40, '#2a2a3a'); F.R(236, 140, 60, 2, '#4a4a5a');
      var jump = clamp((k - 0.62) / 0.2);
      if (jump <= 0) F.frog(at(face, t), 262, 127, 0.8, 0);
      else F.frog(at(side, t), 262 - jump * 104, 127 - Math.sin(jump * Math.PI) * 50 + (ty - 157) * jump, 0.8, -jump * 0.6);
      F.fade(1 - k * 6);
    }

    // ---- 3. La traversée : la tortue nage, la grenouille sur son dos ; un léviathan passe dessous ----
    function swim(ctx, k, t, F) {
      F.bands(0, 104, [[0, '#4a7ad0'], [1, '#d8eaf0']]);
      for (var c = 0; c < 6; c++) { var cx = ((rnd(c, 101) * 420 - t * 0.012 * (1 + c % 3)) % 440 + 440) % 440 - 60; F.alpha(0.8, function () { F.R(cx, 14 + c * 9, 50, 6, '#ffffff'); F.R(cx + 8, 10 + c * 9, 28, 4, '#ffffff'); }); }
      for (var bd = 0; bd < 3; bd++) { var bx = ((t / 25 + bd * 90) % 380) - 30, by = 40 + bd * 8, wg = Math.sin(t / 110 + bd) > 0 ? -1 : 1; F.R(bx, by, 2, 1, '#2a2a3a'); F.R(bx - 2, by + wg, 2, 1, '#2a2a3a'); F.R(bx + 2, by + wg, 2, 1, '#2a2a3a'); }
      F.alpha(0.5, function () { for (var x = 0; x < 160; x++) F.R(((x * 2 - t * 0.02) % 420 + 420) % 420 - 50, 98 - 4 - sea[x] * 0, 2, 6 + Math.round(3 * Math.sin(x / 7)), '#7a8aa0'); }); // une île qui défile au loin
      waves(F, 104, t, 0.06, [[0, '#4a8ab0'], [0.5, '#1a4a70'], [1, '#08182a']]);
      // le léviathan, une ombre immense qui ondule sous l'eau
      var lk = clamp((k - 0.2) / 0.65);
      if (lk > 0 && lk < 1) F.alpha(0.5 * Math.sin(lk * Math.PI), function () { for (var s = 0; s < 70; s++) { var lx = 380 - lk * 520 + s * 4, ly = 160 + Math.sin(s / 6 + t / 400) * 6; F.R(lx, ly, 5, 7 - Math.abs(s - 20) / 10, '#04101c'); } });
      // la tortue, qui monte et descend sur la houle, la grenouille dessus
      var bob = Math.sin(t / 500) * 3;
      turtle(F, 160, 132 + bob, 1, t, false);
      F.frog(at(side, t), 158, 92 + bob, 0.8, 0);
      for (var sp = 0; sp < 8; sp++) { var sa = ((t / 70 + sp * 13) % 30); F.R(228 + sa * 0.8, 128 + bob - sa * 0.4 + sa * sa * 0.02, 2, 2, '#e8f6ff'); } // l'écume à la proue
      F.fade(1 - k * 8);
    }

    // ---- 4. Le rivage des géants : des troncs qui touchent le ciel, et un pied de titan qui s'abat ----
    function shore(ctx, k, t, F) {
      var stomp = clamp((k - 0.5) / 0.12), shake = stomp > 0.9 && k < 0.75 ? (rnd(Math.floor(t / 40), 102) - 0.5) * 6 : 0;
      ctx.setTransform(1, 0, 0, 1, 0, Math.round(shake));
      F.bands(0, F.H, [[0, '#2a4a3a'], [0.6, '#6a9a6a'], [1, '#c8d8a0']]);
      // les troncs géants, de plus en plus près
      [[30, 46, '#2a1a10'], [118, 30, '#3a2414'], [206, 58, '#24160c'], [292, 40, '#3a2414']].forEach(function (tr, i) {
        F.R(tr[0], 0, tr[1], 150, tr[2]); F.R(tr[0], 0, 4, 150, '#5a3a20');
        for (var y = 6; y < 150; y += 11) F.R(tr[0] + 6 + (y * 7) % (tr[1] - 10), y, 3, 6, '#1a0e06');
        F.alpha(0.9, function () { F.R(tr[0] - 20, 0, tr[1] + 40, 14 + i * 3, '#1e4a1a'); F.R(tr[0] - 10, 12 + i * 3, tr[1] + 20, 4, '#2a6a24'); });
      });
      F.R(0, 150, F.W, 30, '#c8b07a'); F.R(0, 150, F.W, 2, '#e8d8a0');
      for (var y2 = 152; y2 < F.H; y2++) F.R(0, y2, 70 - (y2 - 152) * 1.5 + Math.sin(t / 400 + y2 / 4) * 3, 1, '#3a7a9a'); // la mer, à gauche
      turtle(F, 30, 166, 0.6, t, false);
      // la grenouille saute de la tortue, avance… et recule quand le pied tombe
      var hop = clamp(k / 0.25), fx = 40 + hop * 110 - stomp * 24, fy = 137 - Math.sin(hop * Math.PI) * 30 - (stomp > 0 && stomp < 1 ? Math.sin(stomp * Math.PI) * 14 : 0);
      F.frog(k < 0.6 ? at(side, t) : at(face, t), fx, fy, 0.8, 0);
      // le pied du titan : il descend du haut de l'image et s'écrase sur le sable
      if (k > 0.4) {
        var fyp = -120 + ease(stomp) * 270;
        F.R(214, fyp - 200, 52, 200, '#5a5a6e'); F.R(214, fyp - 200, 6, 200, '#7a7a90');
        F.R(196, fyp - 26, 90, 26, '#5a5a6e'); F.R(196, fyp - 26, 90, 4, '#7a7a90');
        for (var toe = 0; toe < 4; toe++) F.R(198 + toe * 22, fyp - 6, 18, 8, '#4a4a5a');
        if (stomp >= 1) for (var du = 0; du < 30; du++) { var dk = clamp((k - 0.62) / 0.3); F.alpha(1 - dk, function () { F.R(200 + (rnd(du, 103) - 0.5) * 160 * (0.3 + dk), 150 - rnd(du, 104) * 30 * dk, 3, 3, '#e0d0a0'); }); }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      F.fade(1 - k * 8);
      F.fade((k - 0.88) / 0.12, '#ffffff');
    }

    // ---- 5. Le nom de l'île, sur sa carte ----
    function title(ctx, k, t, F) {
      if (!land) { var all = []; for (var li = 0; li < map.REGIONS.length; li++) all.push(li); land = map.render(all).canvas; }
      mapReveal(ctx, k, F, map, land, 'L\'ILE DES COLOSSES', 'TROIS TERRES DE GÉANTS', 14);
    }

    return {
      dur: 17500,
      captions: [
        [0, 'Le Dragon-Tempête s’effondre dans les nuages. L’orage se tait, pour la première fois depuis toujours.'],
        [3800, 'À l’aube, dans la brume, des silhouettes immenses marchent sur la mer… et sous la grenouille, l’océan se soulève.'],
        [7500, 'Une tortue vieille comme le monde la prend sur son dos. Dessous, quelque chose de très grand nage dans le noir.'],
        [11300, 'Sur le rivage, les arbres touchent le ciel. Et le sol tremble à chaque pas d’un titan.'],
        [13500, 'L’ÎLE DES COLOSSES · Trois terres où tout est géant : les monstres, les boss… et le danger.']
      ],
      sounds: [[520, 'slam'], [1720, 'slam'], [2920, 'impact'], [4600, 'riser'], [6200, 'splash'], [6700, 'whoosh'], [9000, 'energy'], [12650, 'slam'], [12700, 'thud'], [13600, 'levelup']],
      scenes: [
        { from: 0, to: 3800, draw: storm },
        { from: 3800, to: 7500, draw: rise },
        { from: 7500, to: 11300, draw: swim },
        { from: 11300, to: 13500, draw: shore },
        { from: 13500, to: 17500, draw: title }
      ]
    };
  }


  // ---------- Le Passage des Brumes : de l'Abîme des Léviathans à l'Archipel des Brumes ----------
  // Le Léviathan sombre dans le noir ; à la surface, l'aube et une mer de brume ; une barque à lanterne glisse entre des
  // portes rouges qui sortent du brouillard, sous des pétales ; elle accoste dans une bambouseraie où une renarde
  // regarde ; puis la carte de l'archipel et son nom.
  function mists(hero, map) {
    var face = hero.face, side = hero.profil, at = function (list, t) { return list[Math.floor(t / (1000 / list.length)) % list.length]; };
    var serpent = null, fox = null, land = null;
    var petals = []; for (var i = 0; i < 40; i++) petals.push({ x: rnd(i, 120) * 360, y: rnd(i, 121) * 200, v: 0.5 + rnd(i, 122), p: rnd(i, 123) * 6 });
    // ---- 1. L'abîme : le Léviathan vaincu sombre, une lumière perce d'en haut ----
    function sink(ctx, k, t, F) {
      if (!serpent) { var p = {}; Object.keys(SPECIES.leviathan.pal).forEach(function (c) { p[c] = '#06101a'; }); p.y = '#ff4a4a'; serpent = stringsToCanvas(SPECIES.leviathan.frames[0], p); }
      F.bands(0, F.H, [[0, '#0e3a5a'], [0.5, '#06182a'], [1, '#020608']]);
      for (var r = 0; r < 5; r++) { var x0 = 120 + r * 26 + Math.sin(t / 900 + r) * 6; ctx.fillStyle = 'rgba(160,220,255,' + (0.05 + 0.05 * k) + ')'; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 10, 0); ctx.lineTo(x0 + 40, F.H); ctx.lineTo(x0 + 18, F.H); ctx.fill(); }
      ctx.save(); ctx.translate(170, 40 + ease(k) * 170); ctx.rotate(0.3 + k * 0.8); ctx.globalAlpha = 1 - k * 0.6; ctx.drawImage(serpent, -64, -64, 128, 128); ctx.restore(); ctx.globalAlpha = 1;
      for (var b = 0; b < 24; b++) { var by = F.H - ((t / 10 + rnd(b, 124) * F.H) % (F.H + 20)); F.R(rnd(b, 125) * F.W, by, 2, 2, 'rgba(200,240,255,0.5)'); }
      F.fade(1 - k * 6); F.fade((k - 0.85) / 0.15, '#e8eef4');
    }
    // ---- 2. La mer de brume : la barque, la lanterne, les portes rouges qui sortent du brouillard ----
    function boat(ctx, k, t, F) {
      F.bands(0, 104, [[0, '#a8b8d0'], [0.6, '#e8d8e0'], [1, '#f8e8e0']]);
      ctx.fillStyle = '#fff4e0'; ctx.beginPath(); ctx.arc(250, 70, 16, 0, Math.PI * 2); ctx.fill();
      F.bands(104, F.H, [[0, '#b8c8d8'], [1, '#5a6a8a']], 2);
      for (var w = 0; w < 30; w++) { var wx = ((rnd(w, 126) * 400 - t * 0.02) % 400 + 400) % 400 - 40; F.R(wx, 108 + rnd(w, 127) * 70, 6, 1, 'rgba(255,255,255,0.5)'); }
      // les portes rouges, de plus en plus près, qui passent
      for (var g = 0; g < 5; g++) {
        var gx = ((g * 110 + 360 - t * 0.035) % 550) - 120, sc = 0.5 + (g % 3) * 0.25, gy = 104 - 60 * sc, a = Math.min(1, 0.35 + sc * 0.5);
        F.alpha(a, function () { F.R(gx, gy, 70 * sc, 5 * sc, '#c9412f'); F.R(gx - 6 * sc, gy - 4 * sc, 82 * sc, 4 * sc, '#1a1a1a'); F.R(gx + 6 * sc, gy + 12 * sc, 58 * sc, 3 * sc, '#c9412f'); F.R(gx + 10 * sc, gy, 5 * sc, 64 * sc, '#c9412f'); F.R(gx + 55 * sc, gy, 5 * sc, 64 * sc, '#c9412f'); });
      }
      F.alpha(0.55, function () { for (var m = 0; m < 6; m++) F.R(0, 80 + m * 9 + Math.sin(t / 700 + m) * 2, F.W, 5, '#f4f0f4'); }); // la brume
      // la barque, sa lanterne, la grenouille debout à la proue
      var bx = 60 + ease(k) * 120, by = 132 + Math.sin(t / 500) * 2;
      F.R(bx - 40, by, 80, 6, '#5a3a20'); F.R(bx - 46, by - 4, 10, 6, '#5a3a20'); F.R(bx + 36, by - 4, 10, 6, '#5a3a20'); F.R(bx - 40, by + 6, 80, 2, '#3a2412');
      F.R(bx + 36, by - 22, 2, 18, '#3a2412'); F.R(bx + 32, by - 32, 10, 12, '#ff9a3a'); F.R(bx + 34, by - 30, 6, 8, '#ffe0a0');
      F.frog(at(side, t), bx + 6, by - 14, 0.8, 0);
      petals.forEach(function (p) { var px = (p.x - t * 0.02 * p.v) % 360, py = (p.y + t * 0.015 * p.v) % 200; F.R(px < 0 ? px + 360 : px, py, 2, 1, Math.sin(t / 300 + p.p) > 0 ? '#ffb0c8' : '#ffd0e0'); });
      F.fade(1 - k * 6, '#e8eef4');
    }
    // ---- 3. La bambouseraie : la barque accoste, une renarde regarde entre les bambous ----
    function shore(ctx, k, t, F) {
      if (!fox) { var fp = Object.assign({}, SPECIES.kitsune.pal); fox = stringsToCanvas(SPECIES.kitsune.frames[0], fp); }
      F.bands(0, F.H, [[0, '#c8d8c0'], [0.7, '#e8f0e0'], [1, '#d8d0b0']]);
      for (var b = 0; b < 16; b++) { var bx = b * 22 + rnd(b, 128) * 10, sway = Math.sin(t / 900 + b) * 2, col = b % 3 ? '#5a9a4a' : '#3a7a2a';
        F.alpha(0.5 + 0.5 * (b % 2), function () { for (var y = 0; y < 150; y += 2) F.R(bx + sway * y / 150, y, 4, 2, y % 24 === 0 ? '#2a5a20' : col); F.R(bx + sway + 3, 30 + (b % 4) * 20, 8, 2, '#6ab04a'); }); }
      F.alpha(0.4, function () { F.R(0, 90, F.W, 30, '#f4f8f0'); }); // la brume au ras du sol
      F.R(0, 150, F.W, 30, '#b8a878'); F.R(0, 150, F.W, 2, '#d8c898');
      for (var y2 = 152; y2 < F.H; y2++) F.R(0, y2, 60 - (y2 - 152), 1, '#7aa0b0');
      F.R(250, 118, 10, 32, '#8a8a80'); F.R(246, 112, 18, 8, '#a0a098'); F.R(250, 120, 10, 6, '#ffd070'); // une lanterne de pierre
      var step = clamp((k - 0.2) / 0.4), fx = 40 + step * 120;
      F.R(10, 148, 70, 6, '#5a3a20');
      F.frog(k < 0.65 ? at(side, t) : at(face, t), fx, 136 - Math.sin(step * Math.PI) * 18, 0.8, 0);
      var eyes = clamp((k - 0.5) / 0.2);
      if (eyes > 0) F.alpha(eyes, function () { ctx.drawImage(fox, 196, 96, 40, 40); });
      F.fade(1 - k * 8, '#e8eef4'); F.fade((k - 0.88) / 0.12, '#ffffff');
    }
    function title(ctx, k, t, F) {
      if (!land) { var all = []; for (var li = 0; li < map.REGIONS.length; li++) all.push(li); land = map.render(all).canvas; }
      mapReveal(ctx, k, F, map, land, 'L\'ARCHIPEL DES BRUMES', 'SIX TERRES DANS LE BROUILLARD', 12);
    }
    return {
      dur: 16000,
      captions: [
        [0, 'Le Léviathan Ancestral sombre dans le noir. Tout au-dessus, une lumière pâle.'],
        [3500, 'À l’aube, la mer est couverte de brume. Une barque attend, sa lanterne allumée, et des portes rouges sortent du brouillard.'],
        [8000, 'Elle accoste dans une forêt de bambous. Entre les tiges, quelqu’un regarde.'],
        [12000, 'L’ARCHIPEL DES BRUMES · Six terres de légende, reliées par des ponts dans le brouillard.']
      ],
      sounds: [[300, 'thud'], [3600, 'riser'], [6200, 'glint'], [9000, 'splash'], [10400, 'peep'], [12100, 'levelup']],
      scenes: [
        { from: 0, to: 3500, draw: sink },
        { from: 3500, to: 8000, draw: boat },
        { from: 8000, to: 12000, draw: shore },
        { from: 12000, to: 16000, draw: title }
      ]
    };
  }

  // ---------- La Descente : de l'Archipel des Brumes au Royaume sous la Terre ----------
  // Le Ryū vaincu s'enroule dans les nuages ; au pied du Mont, la terre se fend ; la grenouille tombe dans le noir, entre
  // des champignons qui s'allument un à un ; elle se pose au bord d'un lac noir, où une petite lumière l'attend ; puis la
  // carte du royaume et son nom.
  function descent(hero, map) {
    var face = hero.face, side = hero.profil, at = function (list, t) { return list[Math.floor(t / (1000 / list.length)) % list.length]; };
    var halo = function (F, cx, cy, r, col, a) { for (var k = 4; k >= 1; k--) { var rr = r * k / 4; F.alpha(a * (1 - k / 5), function () { for (var dy = -rr; dy <= rr; dy += 2) { var hw = Math.round(Math.sqrt(Math.max(0, rr * rr - dy * dy))); F.R(cx - hw, cy + dy, hw * 2, 2, col); } }); } };
    var dragon = null, fish = null, land = null;
    var spores = []; for (var i = 0; i < 46; i++) spores.push({ x: rnd(i, 130) * 360, y: rnd(i, 131) * 200, v: 0.4 + rnd(i, 132), p: rnd(i, 133) * 6 });
    // ---- 1. Le sommet : le Ryū s'enroule dans les nuages et s'en va ; la montagne tremble, la terre se fend ----
    function crack(ctx, k, t, F) {
      if (!dragon) dragon = stringsToCanvas(SPECIES.ryu.frames[0], SPECIES.ryu.pal, true);
      F.bands(0, F.H, [[0, '#2a2a4a'], [0.6, '#4a4a6a'], [1, '#2a2438']]);
      F.alpha(0.6, function () { for (var c = 0; c < 7; c++) F.R(((c * 70 - t * 0.02) % 420 + 420) % 420 - 60, 20 + (c % 3) * 16, 80, 8, '#8a8ab0'); });
      ctx.save(); ctx.translate(250 + k * 60, 60 - k * 70); ctx.rotate(-0.3 - k); ctx.globalAlpha = 1 - k * 0.7; ctx.drawImage(dragon, -40, -40, 80, 80); ctx.restore(); ctx.globalAlpha = 1;
      var sh = k > 0.5 ? Math.round(Math.sin(t / 30) * 2 * (k - 0.5) * 2) : 0;
      for (var mx = 0; mx < F.W; mx += 2) { var my = 150 - Math.round(Math.max(0, 40 - Math.abs(mx - 170) * 0.35) + Math.sin(mx / 9) * 2); F.R(mx + sh, my, 2, F.H - my, '#3a3a5a'); F.R(mx + sh, my, 2, 1, '#6a6a8a'); } // le sommet du mont
      F.R(0 + sh, 150, F.W, 50, '#3a3a5a'); F.R(0 + sh, 150, F.W, 2, '#5a5a7a');
      var open = clamp((k - 0.55) / 0.4);
      if (open > 0) { var cx = 170 + sh; for (var y = 150; y < F.H; y++) { var w = Math.max(0, Math.round((y - 150) * 0.3 * open + 6 * open)); F.R(cx - w, y, w * 2, 1, '#06040a'); if (y % 4 === 0) F.R(cx - w - 1, y, 1, 1, '#ff8a2a'); } }
      F.frog(at(face, t), 170 + sh, 137 + (k > 0.9 ? (k - 0.9) / 0.1 * 50 : 0), 0.8, 0); // (elle tombe dans la fissure)
      F.fade(1 - k * 6); F.fade((k - 0.9) / 0.1, '#000000');
    }
    // ---- 2. La chute : le noir, des champignons qui s'allument de part et d'autre, des spores qui montent ----
    function fall(ctx, k, t, F) {
      F.bands(0, F.H, [[0, '#06040a'], [1, '#120e1e']]);
      for (var m = 0; m < 10; m++) {
        var lit = clamp((k * 12 - m) / 2), my = ((m * 46 - k * 600) % 460 + 460) % 460 - 60, mx = m % 2 ? 20 + (m % 3) * 14 : 300 - (m % 3) * 14;
        F.R(mx - 2, my + 6, 5, 14, lit ? '#e8dcc8' : '#2a2430');
        if (lit) halo(F, mx, my + 6, 26, m % 3 ? '#a04ad0' : '#6af0d0', 0.5 * lit);
        F.alpha(0.3 + 0.7 * lit, function () { F.R(mx - 9, my, 19, 7, lit ? (m % 3 ? '#a04ad0' : '#6af0d0') : '#2a2430'); F.R(mx - 6, my - 2, 13, 2, lit ? '#d08af0' : '#2a2430'); [[-5, 2], [1, 1], [5, 3]].forEach(function (s) { F.R(mx + s[0], my + s[1], 2, 2, lit ? '#ffffff' : '#2a2430'); }); });
      }
      spores.forEach(function (p) { var py = ((p.y - t * 0.05 * p.v) % 200 + 200) % 200; F.R(p.x % 360, py, 1, 1, Math.sin(t / 300 + p.p) > 0 ? '#6af0d0' : '#c080ff'); });
      var fy = 86 + Math.sin(t / 200) * 6;
      F.frog(at(face, t), 160, fy, 0.8, 0);
      F.fade(1 - k * 8, '#000000'); F.fade((k - 0.9) / 0.1, '#000000');
    }
    // ---- 3. Le lac noir : elle se pose sur la rive, une petite lumière s'approche sur l'eau ----
    function lake(ctx, k, t, F) {
      if (!fish) fish = stringsToCanvas(SPECIES.baudroie.frames[0], SPECIES.baudroie.pal);
      F.bands(0, 110, [[0, '#05060c'], [1, '#0e1424']]);
      for (var s = 0; s < 9; s++) { var sx = s * 44 + 10; F.R(sx, 0, 6, 18 + (s % 3) * 12, '#1a1e2c'); F.R(sx + 2, 18 + (s % 3) * 12, 2, 6, '#1a1e2c'); } // les stalactites
      for (var c2 = 0; c2 < 14; c2++) F.R(rnd(c2, 140) * 360, 20 + rnd(c2, 141) * 60, 2, 2, c2 % 2 ? '#c080ff' : '#6af0d0'); // des cristaux dans la voûte
      F.bands(110, F.H, [[0, '#0e1a30'], [1, '#05080e']], 2);
      for (var w = 0; w < 24; w++) F.R(((rnd(w, 142) * 400 - t * 0.01) % 400 + 400) % 400 - 20, 116 + rnd(w, 143) * 60, 5, 1, 'rgba(120,150,210,0.4)');
      F.R(0, 150, 120, 4, '#2a2430'); F.R(0, 154, 110, 30, '#1a1620'); // la rive
      var fx = 300 - ease(k) * 140, glow = 0.55 + 0.15 * Math.sin(t / 200);
      halo(F, fx - 12, 123, 34, '#fff080', glow);
      F.alpha(glow * 0.6, function () { for (var rf = 0; rf < 6; rf++) F.R(fx - 22 + rf * 3, 152 + rf * 3, 18 - rf * 2, 1, '#fff080'); }); // son reflet sur l'eau
      F.alpha(0.9, function () { ctx.drawImage(fish, fx - 16, 118, 32, 32); });
      F.frog(k < 0.3 ? at(face, t) : at(side, t), 60, 137, 0.8, 0);
      F.fade(1 - k * 8, '#000000'); F.fade((k - 0.88) / 0.12, '#ffffff');
    }
    function title(ctx, k, t, F) {
      if (!land) { var all = []; for (var li = 0; li < map.REGIONS.length; li++) all.push(li); land = map.render(all).canvas; }
      mapReveal(ctx, k, F, map, land, 'LE ROYAUME SOUS LA TERRE', 'SIX TERRES SOUS LE MONDE', 12);
    }
    return {
      dur: 16000,
      captions: [
        [0, 'Le Ryū des Brumes s’enroule dans les nuages et disparaît. Sous les pattes de la grenouille, la montagne tremble.'],
        [3500, 'La terre se fend. Elle tombe dans le noir… et, un à un, des champignons s’allument autour d’elle.'],
        [8000, 'Elle se pose au bord d’un lac noir. Sur l’eau, une petite lumière s’approche.'],
        [12000, 'LE ROYAUME SOUS LA TERRE · Six terres sous le monde, et tout au fond, son cœur qui bat.']
      ],
      sounds: [[300, 'boss'], [3000, 'thud'], [3600, 'riser'], [5200, 'glint'], [8200, 'splash'], [10400, 'peep'], [12100, 'levelup']],
      scenes: [
        { from: 0, to: 3500, draw: crack },
        { from: 3500, to: 8000, draw: fall },
        { from: 8000, to: 12000, draw: lake },
        { from: 12000, to: 16000, draw: title }
      ]
    };
  }

  return { play: play, dive: dive, crossing: crossing, mists: mists, descent: descent };
})();
