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
      var r0 = map.REGIONS[0], z = 3.2 - ease(k * 1.3) * (3.2 - Math.max(W / map.W, H / map.H) * 1.02);
      var vw = W / z, vh = H / z, cx = r0.x + (map.W / 2 - r0.x) * ease(k * 1.3), cy = r0.y + (map.H / 2 - r0.y) * ease(k * 1.3);
      ctx.drawImage(land, Math.max(0, Math.min(map.W - vw, cx - vw / 2)), Math.max(0, Math.min(map.H - vh, cy - vh / 2)), vw, vh, 0, 0, W, H);
      F.alpha(0.3 + 0.25 * clamp((k - 0.1) / 0.3), function () { F.R(0, 0, W, H, '#0a0c1c'); });
      // le titre, lettre après lettre, puis la ligne du dessous
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '16px "Press Start 2P", monospace';
      var n = Math.floor(clamp((k - 0.12) / 0.4) * title.length + 0.001), txt = title.slice(0, n);
      [[2, 2, '#1a0c04'], [-1, 0, '#1a0c04'], [1, 0, '#1a0c04'], [0, -1, '#1a0c04'], [0, 1, '#1a0c04'], [0, 0, '#ffd870']].forEach(function (o) { ctx.fillStyle = o[2]; ctx.fillText(txt, 160 + o[0] - (title.length - n) * 8, 70 + o[1]); });
      if (k > 0.55) {
        ctx.font = '8px "Press Start 2P", monospace';
        F.alpha((k - 0.55) / 0.15, function () { ctx.fillStyle = '#1a0c04'; ctx.fillText('SEIZE TERRES À CONQUÉRIR', 161, 97); ctx.fillStyle = '#fff6d8'; ctx.fillText('SEIZE TERRES À CONQUÉRIR', 160, 96); });
      }
      F.fade(1 - k * 8, '#ffffff');
      F.fade((k - 0.9) / 0.1);
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

  return { play: play, dive: dive };
})();
