// Les événements de la semaine, les quêtes du jour et les saisons de classement.

// ---------- Les événements de la semaine (à l'heure du joueur) ----------
// Le week-end, tout ce qui rapporte de l'XP en rapporte 50 % de plus ; le mercredi, les objets tombent plus souvent.
var EVENTS = {
  xp2: { name: 'Week-end de l’XP', short: 'XP ×1,5', desc: 'Du samedi au dimanche soir, tout ce qui rapporte de l’XP en rapporte 50 % de plus.', days: [6, 0], xp: 0.5 }, // (×2 jusqu'au 3 octobre 2026)
  butin: { name: 'Mercredi du butin', short: 'Butin +50 %', desc: 'Tout le mercredi, +50 % de chances de trouver un objet.', days: [3], loot: 0.5 }
};
function eventsNow(t) { var d = new Date(t || Date.now()).getDay(); return Object.keys(EVENTS).filter(function (k) { return EVENTS[k].days.indexOf(d) >= 0; }); }
function eventMult(key, t) { return 1 + eventsNow(t).reduce(function (s, k) { return s + (EVENTS[k][key] || 0); }, 0); }
// la fin de l'événement en cours : minuit après son dernier jour (le week-end s'arrête dimanche à minuit)
function eventEnds(k, t) {
  var d = new Date(t || Date.now()); d.setHours(0, 0, 0, 0);
  for (var i = 0; i < 8; i++) { d.setDate(d.getDate() + 1); if (EVENTS[k].days.indexOf(d.getDay()) < 0) return d.getTime(); }
  return null;
}
// sur une durée (une méditation, une mission) : seule la part passée pendant l'événement compte double
function eventMultOver(key, t0, t1) {
  if (!(t1 > t0)) return eventMult(key, t1 || undefined);
  var n = Math.min(400, Math.max(1, Math.ceil((t1 - t0) / 300000)) ), s = 0; // un point toutes les 5 minutes
  for (var i = 0; i < n; i++) s += eventMult(key, t0 + (i + 0.5) * (t1 - t0) / n);
  return s / n;
}
// « 1 j 4 h », « 3 h 20 », « 12 min »
function durText(ms) { var m = Math.max(1, Math.ceil(ms / 60000)), h = Math.floor(m / 60); return h >= 24 ? Math.floor(h / 24) + ' j ' + (h % 24) + ' h' : (h ? h + ' h ' + ('0' + m % 60).slice(-2) : m + ' min'); }
// Le prochain événement (quand aucun n'a lieu) : { ev, ms } d'ici son début (minuit)
function nextEvent() {
  var now = new Date();
  for (var i = 1; i <= 7; i++) {
    var d = new Date(now); d.setDate(d.getDate() + i); d.setHours(0, 0, 0, 0);
    var on = eventsNow(d.getTime());
    if (on.length) return { ev: EVENTS[on[0]], ms: d - now };
  }
  return null;
}

// ---------- Les quêtes du jour ----------
// Trois quêtes par jour (une de combat, une d'objets, une à part), tirées d'après la date et le nom de la grenouille.
// Chacune rapporte des lucioles, un peu d'XP et des éclats de jade ; les trois faites, un coffre en plus (un objet Rare
// ou Épique de sa terre). g : le groupe (0 combat, 1 objets, 2 le reste) ; ev : l'événement qui la fait avancer (track).
var QUESTS = [
  { id: 'sentier', g: 0, name: 'Le sentier', text: 'Gagner {n} combats sur la carte du monde', n: 8, ev: 'stage' },
  { id: 'chasseur', g: 0, name: 'Chasseuse de boss', text: 'Vaincre {n} gardiens ou boss (carte, donjons, tour)', n: 2, ev: 'boss' },
  { id: 'gibier', g: 0, name: 'Gibier de choix', text: 'Vaincre {n} monstres rares ou épiques', n: 2, ev: 'rareFoe' },
  { id: 'salles', g: 0, name: 'Les profondeurs', text: 'Vider {n} salles de donjon', n: 2, ev: 'room', need: function (s) { return s.level >= DUNGEON_EVERY && DUNGEONS.some(function (d) { return dungeonOpen(s, d) && !dungeonCleared(s, d); }); } },
  { id: 'ascension', g: 0, name: 'L’ascension', text: 'Conquérir {n} étages de la tour', n: 2, ev: 'tower', need: function (s) { return s.tower < TOWER_TOP; } },
  { id: 'fouine', g: 1, name: 'La fouine', text: 'Trouver {n} objets', n: 4, ev: 'loot' },
  { id: 'lynx', g: 1, name: 'L’œil de lynx', text: 'Trouver un objet Rare ou mieux', n: 1, ev: 'rare' },
  { id: 'forgeron', g: 1, name: 'À la forge', text: 'Renforcer un objet à la forge', n: 1, ev: 'forge', need: function (s) { return s.owned.some(forgeable); } },
  { id: 'recyclage', g: 1, name: 'Rien ne se perd', text: 'Recycler {n} objets à la forge', n: 4, ev: 'recycle' },
  { id: 'messager', g: 2, name: 'La messagère', text: 'Terminer {n} missions', n: 2, ev: 'mission' },
  { id: 'calme', g: 2, name: 'Le calme du nénuphar', text: 'Méditer au moins une heure, puis récolter', n: 1, ev: 'meditation' },
  { id: 'duelliste', g: 2, name: 'La duelliste', text: 'Livrer {n} duels à la Cascade', n: 2, ev: 'duel', online: true },
  { id: 'titan', g: 2, name: 'Contre le Titan', text: 'Attaquer le Titan de la semaine', n: 1, ev: 'titan', online: true },
  { id: 'alpha', g: 2, name: 'Pour le clan', text: 'Attaquer l’Alpha de ton clan', n: 1, ev: 'raid', clan: true }
];
function questDef(id) { return QUESTS.filter(function (q) { return q.id === id; })[0] || null; }
function questText(q) { return q.text.replace('{n}', q.n); }
// la terre où en est la grenouille, et le rang de son butin
function questTier(save) { var w = 0; for (var i = 0; i < BIOMES.length; i++) if (worldUnlocked(save, i)) w = i; return lootTier(save, w); }
// ctx : { online, clan } (ce que la grenouille peut faire aujourd'hui)
function questsToday(save, ctx) {
  var day = dayKey();
  if (save.quests && save.quests.day === day && save.quests.list.length) return save.quests;
  ctx = ctx || {};
  var seed = 11, key = day + '|' + ((save.hero && save.hero.name) || '');
  for (var i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) % 2147483647;
  var rnd = function () { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
  var list = [0, 1, 2].map(function (g) {
    var pool = QUESTS.filter(function (q) { return q.g === g && (!q.need || q.need(save)) && (!q.online || ctx.online) && (!q.clan || ctx.clan); });
    return { id: pool[Math.floor(rnd() * pool.length)].id, n: 0, got: false };
  });
  save.quests = { day: day, list: list, chest: false };
  return save.quests;
}
function questReward(save) {
  var lvl = save.level, u = eclatUnit(questTier(save));
  return { xp: Math.round(xpForLevel(lvl) * 0.15), gold: Math.round(40 + 12 * lvl), eclats: Math.round(2 * u), pts: 10 };
}
function chestReward(save) {
  var lvl = save.level, u = eclatUnit(questTier(save));
  return { xp: Math.round(xpForLevel(lvl) * 0.3), gold: Math.round((40 + 12 * lvl) * 2.5), eclats: Math.round(6 * u), pts: 25 };
}
// Une quête faite : sa récompense (une seule fois) ; renvoie ce qu'elle a donné, ou null
function claimQuest(save, id) {
  var qs = save.quests, q = qs && qs.list.filter(function (x) { return x.id === id; })[0], def = questDef(id);
  if (!q || !def || q.got || q.n < def.n || qs.day !== dayKey()) return null;
  q.got = true;
  var r = questReward(save), xp = clanXp(r.xp);
  save.gold += r.gold; save.eclats = (save.eclats || 0) + r.eclats;
  seasonAdd(save, r.pts);
  return { gold: r.gold, eclats: r.eclats, xp: xp, levels: gainXp(save, xp, 'quete') };
}
function chestReady(save) { var qs = save.quests; return !!qs && qs.day === dayKey() && !qs.chest && qs.list.length > 0 && qs.list.every(function (q) { return q.got; }); }
function claimChest(save) {
  if (!chestReady(save)) return null;
  save.quests.chest = true;
  save.counts = save.counts || {}; save.counts.coffres = (save.counts.coffres || 0) + 1;
  var r = chestReward(save), xp = clanXp(r.xp), rar = Math.random() < 0.3 ? 'epique' : 'rare';
  var item = rollItem(save, pickBase(questTier(save), save), rar);
  save.owned.push(item);
  save.gold += r.gold; save.eclats = (save.eclats || 0) + r.eclats;
  seasonAdd(save, r.pts);
  return { gold: r.gold, eclats: r.eclats, xp: xp, levels: gainXp(save, xp, 'coffre'), item: item };
}
// Ce qu'il y a à réclamer (pour le badge du camp)
function questsClaimable(save) {
  var qs = save.quests;
  if (!qs || qs.day !== dayKey()) return 0;
  return qs.list.filter(function (q) { var d = questDef(q.id); return d && !q.got && q.n >= d.n; }).length + (chestReady(save) ? 1 : 0);
}

// ---------- La saison de classement : un mois ----------
// Chaque exploit rapporte des points de saison (SEASON_PTS, et les quêtes) ; le classement « Saison » les compare, et
// au premier du mois suivant, les dix premières reçoivent un cadeau (le serveur), les trois premières une peau.
var SEASON_PTS = { stage: 1, boss: 3, rareFoe: 1, room: 3, tower: 3, mission: 1, duel: 3, titan: 10, raid: 5 };
function seasonId(t) { var d = new Date(t || Date.now()); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); }
function seasonPts(save) { return save.season && save.season.id === seasonId() ? save.season.pts : 0; }
function seasonAdd(save, n) {
  if (!n) return;
  if (!save.season || save.season.id !== seasonId()) save.season = { id: seasonId(), pts: 0 };
  save.season.pts += n;
}
// la fin de la saison : le premier du mois suivant, à minuit
function seasonEnd() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(); }
var MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function seasonName(id) { var p = String(id || seasonId()).split('-'); return 'Saison de ' + MONTHS[(+p[1] || 1) - 1] + ' ' + p[0]; }

// ---------- Ce qui fait avancer les quêtes et la saison ----------
// track(save, ev, n) : un exploit (ev : 'stage', 'boss', 'loot'…) ; renvoie les quêtes qui viennent d'être faites
function track(save, ev, n) {
  n = n == null ? 1 : n;
  seasonAdd(save, (SEASON_PTS[ev] || 0) * n);
  var qs = save.quests, done = [];
  if (!qs || qs.day !== dayKey()) return done;
  qs.list.forEach(function (q) {
    var d = questDef(q.id);
    if (!d || d.ev !== ev || q.n >= d.n) return;
    q.n = Math.min(d.n, q.n + n);
    if (q.n >= d.n) done.push(d);
  });
  return done;
}
// les objets trouvés : la quête des objets, et celle des Rares
function trackLoot(save, ids) {
  var done = [];
  ids.filter(Boolean).forEach(function (id) {
    done = done.concat(track(save, 'loot'));
    if (['rare', 'epique', 'unique', 'legendaire'].indexOf(rarityOf(id)) >= 0) done = done.concat(track(save, 'rare'));
  });
  return done;
}
// La ligne qui l'annonce, à la fin d'un combat
function questLine(done) {
  return done && done.length ? '<p class="bt-quest">Quête du jour accomplie : <b>' + done.map(function (d) { return d.name; }).join('</b>, <b>') + '</b> ! Ta récompense t’attend au camp.</p>' : '';
}
