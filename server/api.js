// API des comptes et des grenouilles, partagée par le serveur local (server/server.js) et par Vercel (api/index.js).
// Node pur, aucune dépendance.
//
//   POST /api/inscription   { pseudo, motdepasse }      crée le compte et ouvre la session
//   POST /api/connexion     { pseudo, motdepasse }      ouvre la session
//   POST /api/deconnexion                              ferme la session
//   GET  /api/moi                                       le compte connecté et ses grenouilles (résumé)
//   POST /api/grenouilles   { nom, peau }               crée une grenouille (5 au plus par compte)
//   GET  /api/grenouilles/:id                           la sauvegarde complète d'une grenouille
//   PUT  /api/grenouilles/:id   { save }                enregistre la partie
//   POST /api/grenouilles/:id/sauver { save }           idem, pour navigator.sendBeacon à la fermeture de la page
//   DELETE /api/grenouilles/:id                         supprime une grenouille
//   GET  /api/classement                                les fiches publiques de toutes les grenouilles
//   GET  /api/dojo/:id                                  le dojo d'une grenouille : réputation, duels du jour, journal,
//                                                       top 10, cadeaux à recevoir
//   GET  /api/dojo/:id/adversaires                      trois adversaires proches en réputation (fiches de combat)
//   POST /api/dojo/:id/duel { adversaire, victoire }    le résultat d'un duel : réputation des deux grenouilles
//   POST /api/dojo/:id/cadeaux { ids }                  les cadeaux du lundi reçus par le jeu
//
// Les données passent par un petit magasin clé -> valeur :
//   - en ligne : Upstash Redis, par son API REST (variables KV_REST_API_URL et KV_REST_API_TOKEN, posées par
//     l'intégration Upstash de Vercel, ou UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN) ;
//   - sinon, en local : des fichiers JSON dans server/data/kv/.
// Clés : compte:<id>, pseudo:<pseudo en minuscules> -> id, session:<jeton> (expire toute seule), grenouille:<id>,
// essais:<adresse> (compteur des tentatives de connexion), les tableaux classement (id -> fiche) et reputation
// (id -> points), dojo:<id> (duels du jour, journal), cadeaux:<id>, dojo-semaine (la semaine en cours).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_FROGS = 5;
const SESSION_DAYS = 30;
const SKINS = ['marais', 'lagune', 'venin', 'soleil', 'orchidee', 'cendre'];
// avec les peaux de la garde-robe (achetées dans le jeu)
const ALL_SKINS = SKINS.concat(['cradopaud', 'fraise', 'dendrobate', 'tigre', 'amphinobi', 'sakura', 'verre', 'lune', 'braise', 'or']);
// la peau portée : celle de la sauvegarde si elle est connue, sinon celle de la création
const skinOfFrog = (f) => { const k = f.save && f.save.hero && f.save.hero.skin; return ALL_SKINS.indexOf(k) >= 0 ? k : f.peau; };
const ON_VERCEL = !!process.env.VERCEL;
const SECURE = ON_VERCEL || process.env.COOKIE_SECURE === '1'; // cookie réservé à HTTPS
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const DATA = path.join(__dirname, 'data');

// Une erreur qu'on peut montrer au joueur
const fail = (status, message) => Object.assign(new Error(message), { status: status, public: true });

// ---------- Magasins ----------
function redisStore(url, token) {
  async function cmd(args) {
    let d;
    try {
      const r = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: JSON.stringify(args) });
      d = await r.json();
    } catch (e) { throw fail(502, 'Le serveur n’arrive pas à joindre sa base de données.'); }
    if (d.error) { console.error('Upstash :', d.error); throw fail(502, 'La base de données a refusé la demande.'); }
    return d.result;
  }
  return {
    get: async (k) => { const v = await cmd(['GET', k]); return v == null ? null : JSON.parse(v); },
    set: (k, v, ttl) => cmd(ttl ? ['SET', k, JSON.stringify(v), 'EX', String(ttl)] : ['SET', k, JSON.stringify(v)]),
    setNew: async (k, v) => (await cmd(['SET', k, JSON.stringify(v), 'NX'])) === 'OK',
    del: (k) => cmd(['DEL', k]),
    incr: async (k, ttl) => { const n = await cmd(['INCR', k]); if (n === 1) await cmd(['EXPIRE', k, String(ttl)]); return n; },
    hset: (k, field, v) => cmd(['HSET', k, field, JSON.stringify(v)]),
    hincr: (k, field, n) => cmd(['HINCRBY', k, field, String(n)]),
    hdel: (k, field) => cmd(['HDEL', k, field]),
    hgetall: async (k) => {
      const flat = (await cmd(['HGETALL', k])) || [], out = {};
      for (let i = 0; i + 1 < flat.length; i += 2) out[flat[i]] = JSON.parse(flat[i + 1]);
      return out;
    }
  };
}
function fileStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = (k) => path.join(dir, k.replace(/:/g, '.').replace(/[^A-Za-z0-9_.-]/g, '_') + '.json');
  const read = (k) => {
    try {
      const e = JSON.parse(fs.readFileSync(file(k), 'utf8'));
      if (e.expire && e.expire < Date.now()) { fs.unlinkSync(file(k)); return null; }
      return e;
    } catch (err) { return null; }
  };
  const write = (k, v, expire) => { // écriture atomique : un fichier temporaire, puis on le renomme
    const f = file(k), tmp = f + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ v: v, expire: expire || 0 }));
    fs.renameSync(tmp, f);
  };
  return {
    get: async (k) => { const e = read(k); return e ? e.v : null; },
    set: async (k, v, ttl) => write(k, v, ttl ? Date.now() + ttl * 1000 : 0),
    setNew: async (k, v) => { if (read(k)) return false; write(k, v); return true; },
    del: async (k) => { try { fs.unlinkSync(file(k)); } catch (e) { /* déjà parti */ } },
    incr: async (k, ttl) => { const e = read(k), n = (e ? e.v : 0) + 1; write(k, n, e ? e.expire : Date.now() + ttl * 1000); return n; },
    hset: async (k, field, v) => { const e = read(k), o = e ? e.v : {}; o[field] = v; write(k, o); },
    hincr: async (k, field, n) => { const e = read(k), o = e ? e.v : {}; o[field] = (+o[field] || 0) + n; write(k, o); return o[field]; },
    hdel: async (k, field) => { const e = read(k); if (e && e.v[field]) { delete e.v[field]; write(k, e.v); } },
    hgetall: async (k) => { const e = read(k); return e ? e.v : {}; }
  };
}
// Sur Vercel, le disque est en lecture seule : sans Upstash, pas de comptes
const store = REDIS_URL && REDIS_TOKEN ? redisStore(REDIS_URL, REDIS_TOKEN) : (ON_VERCEL ? null : fileStore(path.join(DATA, 'kv')));

// ---------- Mots de passe (scrypt + sel) et sessions ----------
function hashPassword(password, salt) { return crypto.scryptSync(password, salt, 64).toString('hex'); }
function checkPassword(account, password) {
  const a = Buffer.from(hashPassword(password, account.sel), 'hex'), b = Buffer.from(account.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
async function openSession(res, accountId) {
  const token = crypto.randomBytes(32).toString('hex');
  await store.set('session:' + token, { compte: accountId }, SESSION_DAYS * 86400);
  res.setHeader('Set-Cookie', 'kawazu=' + token + '; HttpOnly; SameSite=Lax; Path=/; Max-Age=' + SESSION_DAYS * 86400 + (SECURE ? '; Secure' : ''));
}
async function sessionOf(req) {
  const m = /(?:^|;\s*)kawazu=([a-f0-9]{64})/.exec(req.headers.cookie || '');
  const s = m && await store.get('session:' + m[1]);
  const account = s && await store.get('compte:' + s.compte);
  return account ? { token: m[1], compte: account } : null;
}
// Freine les essais de mot de passe : 10 tentatives par adresse et par tranche de 10 minutes
async function tooManyAttempts(req) {
  const ip = ON_VERCEL ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : req.socket.remoteAddress;
  return (await store.incr('essais:' + (ip || 'inconnue'), 600)) > 10;
}
const saveAccount = (account) => store.set('compte:' + account.id, account);

// ---------- Outils HTTP ----------
function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
function readBody(req, limit) {
  // sur Vercel, le corps arrive déjà lu (req.body) ; en local, on lit le flux
  if (req.body !== undefined) {
    const b = req.body, text = typeof b === 'string' ? b : (Buffer.isBuffer(b) ? b.toString('utf8') : JSON.stringify(b || {}));
    if (text.length > limit) return Promise.reject(fail(413, 'Données trop volumineuses.'));
    try { return Promise.resolve(text ? JSON.parse(text) : {}); } catch (e) { return Promise.reject(fail(400, 'Requête invalide.')); }
  }
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size <= limit) chunks.push(c); }); // au-delà, on laisse filer sans garder
    req.on('end', () => {
      if (size > limit) return reject(fail(413, 'Données trop volumineuses.'));
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(fail(400, 'Requête invalide.')); }
    });
    req.on('error', () => reject(fail(400, 'Requête invalide.')));
  });
}
// Résumé d'une grenouille pour la liste du compte
async function summary(id) {
  const f = await store.get('grenouille:' + id);
  if (!f) return null;
  const s = f.save || {};
  const progress = Array.isArray(s.progress) ? s.progress : [];
  let monde = 0;
  progress.forEach((p, i) => { if (i === 0 || progress[i - 1] >= 10) monde = i; });
  return { id: id, nom: f.nom, peau: skinOfFrog(f), niveau: s.level || 1, voie: s.voie || null, monde: monde, etape: progress[monde] || 0, modifie: f.modifie };
}
const summaries = async (account) => (await Promise.all(account.grenouilles.map(summary))).filter(Boolean);

// ---------- Classement ----------
// La fiche publique d'une grenouille : ce que tout le monde voit dans le classement (jamais l'id du compte).
// vu : l'heure (arrondie) de la dernière partie, pour ne pas réécrire la fiche à chaque sauvegarde.
const RANK = 'classement';
const num = (v, max) => Math.max(0, Math.min(max, Math.floor(+v) || 0));
function rankEntry(frog, pseudo) {
  const s = frog.save || {}, progress = Array.isArray(s.progress) ? s.progress.slice(0, 6).map((p) => num(p, 10)) : [];
  let monde = 0;
  progress.forEach((p, i) => { if (i === 0 || progress[i - 1] >= 10) monde = i; });
  const equip = {};
  if (s.equip && typeof s.equip === 'object') Object.keys(s.equip).slice(0, 8).forEach((slot) => { if (typeof s.equip[slot] === 'string') equip[slot.slice(0, 16)] = s.equip[slot].slice(0, 32); });
  return {
    id: frog.id, nom: frog.nom, peau: skinOfFrog(frog), pseudo: pseudo,
    niveau: num(s.level || 1, 999), xp: num(s.xp, 1e9), voie: typeof s.voie === 'string' ? s.voie.slice(0, 12) : null,
    progres: progress, monde: monde, etape: progress[monde] || 0, conquis: progress.reduce((a, p) => a + p, 0),
    succes: Array.isArray(s.ach) ? s.ach.length : 0, equip: equip, vu: Math.floor((frog.modifie || Date.now()) / 3600e3),
    sorts: Array.isArray(s.deck) ? s.deck.filter((d) => typeof d === 'string').slice(0, 4).map((d) => d.slice(0, 24)) : [],
    dalles: Array.isArray(s.tree) ? Math.min(s.tree.length, 999) : 0, tour: num(s.tower, 100)
  };
}
// Met la fiche à jour si elle a changé (compare à l'ancienne version de la grenouille, déjà lue)
async function publish(frog, pseudo, before) {
  const entry = rankEntry(frog, pseudo);
  if (before && JSON.stringify(rankEntry(before, pseudo)) === JSON.stringify(entry)) return;
  await store.hset(RANK, frog.id, entry);
}

// ---------- La Cascade des Duels (dans le code : « dojo ») ----------
// Des duels entre les grenouilles des joueurs (le combat se joue dans le navigateur, contre la fiche de combat
// de l'adversaire) : la victoire rapporte de la réputation, d'autant plus que l'adversaire est mieux classé.
// Chaque lundi à minuit (heure de Paris), les dix premières en réputation reçoivent un cadeau.
// On peut aussi affronter ses propres grenouilles (les « sœurs ») : chacune une fois par jour.
const REP = 'reputation';
const DUELS_PAR_JOUR = 10;
const CADEAUX = [
  { lucioles: 400, objet: 'ceinture_champion' }, { lucioles: 250, objet: 'ceinture_dojo' }, { lucioles: 250, objet: 'ceinture_dojo' },
  { lucioles: 150 }, { lucioles: 150 }, { lucioles: 100 }, { lucioles: 100 }, { lucioles: 100 }, { lucioles: 100 }, { lucioles: 100 }
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const parisDay = (t) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
function mondayOf(day) { // le lundi de la semaine d'un jour 'AAAA-MM-JJ'
  const [y, m, d] = day.split('-').map(Number), t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(d - (t.getUTCDay() + 6) % 7);
  return t.toISOString().slice(0, 10);
}
function nextMonday(now) { // l'instant (ms) du prochain lundi minuit, heure de Paris
  const t = new Date(mondayOf(parisDay(now)) + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + 7);
  const h = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(t); // Paris a 1 ou 2 h d'avance
  return t.getTime() - h * 3600e3;
}
// Une nouvelle semaine : les cadeaux de la précédente vont aux dix premières (une seule fois, même si plusieurs
// requêtes arrivent en même temps)
async function weeklyGifts() {
  const week = mondayOf(parisDay(new Date())), last = await store.get('dojo-semaine');
  if (last === week) return;
  if (last && await store.setNew('dojo-distribue:' + last, 1)) {
    const top = Object.entries(await store.hgetall(REP)).filter((e) => +e[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, CADEAUX.length);
    for (let i = 0; i < top.length; i++) {
      const key = 'cadeaux:' + top[i][0], list = (await store.get(key)) || [];
      list.push(Object.assign({ id: last + '-' + (i + 1), semaine: last, rang: i + 1 }, CADEAUX[i]));
      await store.set(key, list);
    }
  }
  await store.set('dojo-semaine', week);
}
async function dojoRecord(id) { // les duels du jour repartent à zéro chaque jour
  const r = (await store.get('dojo:' + id)) || { v: 0, d: 0, jour: '', n: 0, offerts: [], journal: [] };
  const today = parisDay(new Date());
  if (r.jour !== today) { r.jour = today; r.n = 0; }
  return r;
}
// Les exemplaires portés (leurs stats tirées au hasard), pour qu'un adversaire combatte avec son vrai équipement
function equippedItems(s, equip) {
  const out = {}, all = s.items && typeof s.items === 'object' ? s.items : {};
  Object.keys(equip).forEach((slot) => {
    const id = equip[slot], it = all[id];
    if (!it || typeof it.base !== 'string' || typeof it.stats !== 'object' || !it.stats) return;
    const stats = {};
    // le Souffle d'avant est devenu l'Esprit
    ['vitalite', 'agilite', 'force', 'esprit', 'souffle'].forEach((k) => { if (typeof it.stats[k] === 'number') { const key = k === 'souffle' ? 'esprit' : k; stats[key] = clamp((stats[key] || 0) + Math.round(it.stats[k]), -99, 999); } });
    out[id] = { base: it.base.slice(0, 32), rar: ['commun', 'rare', 'epique'].indexOf(it.rar) >= 0 ? it.rar : 'commun', stats: stats };
  });
  return out;
}
// La fiche de combat d'une grenouille : ce qu'il faut au jeu pour la faire combattre
function combatCard(frog, entry, points) {
  const s = frog.save || {}, strs = (a, n) => Array.isArray(a) ? a.filter((x) => typeof x === 'string').slice(0, n).map((x) => x.slice(0, 32)) : [];
  const alloc = {};
  ['vitalite', 'agilite', 'force', 'esprit'].forEach((k) => { alloc[k] = num(s.alloc && s.alloc[k], 999); });
  if (!alloc.esprit && s.alloc) alloc.esprit = num(s.alloc.souffle, 999); // une partie d'avant l'Esprit
  return {
    id: frog.id, nom: frog.nom, peau: skinOfFrog(frog), pseudo: entry.pseudo, niveau: num(s.level || 1, 999), rep: points,
    voie: entry.voie, equip: entry.equip, alloc: alloc, tree: strs(s.tree, 80), deck: strs(s.deck, 4), items: equippedItems(s, entry.equip)
  };
}
async function dojoRoute(req, res, account, id, action, method) {
  await weeklyGifts();
  if (!action && method === 'GET') {
    const [rec, reps, fiches, gifts] = await Promise.all([dojoRecord(id), store.hgetall(REP), store.hgetall(RANK), store.get('cadeaux:' + id)]);
    const mine = +reps[id] || 0, ranked = Object.keys(reps).filter((k) => +reps[k] > 0 && fiches[k]).sort((a, b) => reps[b] - reps[a]);
    return send(res, 200, {
      rep: mine, victoires: rec.v, defaites: rec.d, restants: DUELS_PAR_JOUR - rec.n, max: DUELS_PAR_JOUR, journal: rec.journal,
      rang: mine > 0 ? ranked.indexOf(id) + 1 : 0, classes: ranked.length, prochain: nextMonday(new Date()), recompenses: CADEAUX, cadeaux: gifts || [],
      top: ranked.slice(0, 10).map((k) => Object.assign({}, fiches[k], { rep: +reps[k] }))
    });
  }
  if (action === 'adversaires' && method === 'GET') {
    const [rec, reps, fiches] = await Promise.all([dojoRecord(id), store.hgetall(REP), store.hgetall(RANK)]);
    const mine = +reps[id] || 0, me = fiches[id] || { niveau: 1 };
    const pool = Object.values(fiches).filter((e) => account.grenouilles.indexOf(e.id) < 0).map((e) => Object.assign({ rep: +reps[e.id] || 0 }, e));
    const fought = rec.soeurs || {};
    const sisters = Object.values(fiches).filter((e) => e.id !== id && account.grenouilles.indexOf(e.id) >= 0 && fought[e.id] !== rec.jour).map((e) => Object.assign({ rep: +reps[e.id] || 0, soeur: true }, e));
    const near = (a, b) => Math.abs(a.rep - mine) - Math.abs(b.rep - mine) || Math.abs(a.niveau - me.niveau) - Math.abs(b.niveau - me.niveau);
    // une plus forte, une plus faible, et la plus proche, au hasard parmi les ex æquo
    pool.sort(() => Math.random() - 0.5);
    const above = pool.filter((e) => e.rep > mine).sort((a, b) => a.rep - b.rep)[0], below = pool.filter((e) => e.rep < mine).sort((a, b) => b.rep - a.rep)[0];
    const picked = [above, below].filter(Boolean);
    pool.slice().sort(near).forEach((e) => { if (picked.length < 3 && picked.indexOf(e) < 0) picked.push(e); });
    const all = picked.concat(sisters.slice(0, 4));
    const cards = (await Promise.all(all.map((e) => store.get('grenouille:' + e.id)))).map((frog, i) => frog && Object.assign(combatCard(frog, all[i], all[i].rep), all[i].soeur ? { soeur: true } : {})).filter(Boolean);
    cards.sort((a, b) => (a.soeur ? 1 : 0) - (b.soeur ? 1 : 0) || b.rep - a.rep);
    rec.offerts = cards.map((k) => ({ id: k.id, nom: k.nom, pseudo: k.pseudo, soeur: !!k.soeur }));
    await store.set('dojo:' + id, rec);
    return send(res, 200, { adversaires: cards });
  }
  if (action === 'duel' && method === 'POST') {
    const b = await readBody(req, 4096), rec = await dojoRecord(id);
    const opp = rec.offerts.filter((o) => o.id === b.adversaire)[0];
    if (!opp) return send(res, 400, { erreur: 'Cet adversaire n’est plus proposé : choisis-en un autre.' });
    if (rec.n >= DUELS_PAR_JOUR) return send(res, 429, { erreur: 'Plus de duels aujourd’hui : reviens demain !' });
    if (opp.soeur) {
      rec.soeurs = rec.soeurs || {};
      if (rec.soeurs[opp.id] === rec.jour) return send(res, 400, { erreur: 'Tu as déjà affronté cette grenouille aujourd’hui.' });
      rec.soeurs[opp.id] = rec.jour;
    }
    const reps = await store.hgetall(REP), mine = +reps[id] || 0, theirs = +reps[opp.id] || 0, diff = theirs - mine, win = !!b.victoire;
    const myDelta = win ? clamp(Math.round(12 + diff / 8), 4, 30) : -clamp(Math.round(8 - diff / 10), 2, 15);
    const oppDelta = win ? -Math.ceil(myDelta / 2) : Math.ceil(-myDelta / 2);
    const apply = async (fid, delta) => { const n = await store.hincr(REP, fid, delta); if (n < 0) { await store.hset(REP, fid, 0); return 0; } return n; };
    const [newMine] = await Promise.all([apply(id, myDelta), apply(opp.id, oppDelta)]);
    const me = (await store.hgetall(RANK))[id] || { nom: 'Une grenouille' };
    rec.n++; rec[win ? 'v' : 'd']++;
    rec.offerts = rec.offerts.filter((o) => o.id !== opp.id);
    rec.journal = [{ t: Date.now(), type: 'attaque', nom: opp.nom, pseudo: opp.pseudo, victoire: win, delta: myDelta }].concat(rec.journal).slice(0, 12);
    const theirRec = await dojoRecord(opp.id);
    theirRec.journal = [{ t: Date.now(), type: 'defense', nom: me.nom, pseudo: account.pseudo, victoire: !win, delta: oppDelta }].concat(theirRec.journal).slice(0, 12);
    await Promise.all([store.set('dojo:' + id, rec), store.set('dojo:' + opp.id, theirRec)]);
    return send(res, 200, { delta: myDelta, rep: newMine, restants: DUELS_PAR_JOUR - rec.n });
  }
  if (action === 'cadeaux' && method === 'POST') {
    const b = await readBody(req, 4096), ids = Array.isArray(b.ids) ? b.ids : [];
    const left = ((await store.get('cadeaux:' + id)) || []).filter((g) => ids.indexOf(g.id) < 0);
    if (left.length) await store.set('cadeaux:' + id, left); else await store.del('cadeaux:' + id);
    return send(res, 200, { ok: true });
  }
  return send(res, 404, { erreur: 'Route inconnue.' });
}

// ---------- Routes ----------
async function route(req, res, p) {
  const method = req.method, me = await sessionOf(req);

  if (p === '/api/inscription' && method === 'POST') {
    if (await tooManyAttempts(req)) return send(res, 429, { erreur: 'Trop d’essais. Réessaie dans quelques minutes.' });
    const b = await readBody(req, 4096);
    const pseudo = String(b.pseudo || '').trim(), pass = String(b.motdepasse || '');
    if (!/^[A-Za-z0-9_-]{3,20}$/.test(pseudo)) return send(res, 400, { erreur: 'Le pseudo doit faire 3 à 20 caractères : lettres, chiffres, - ou _.' });
    if (pass.length < 8) return send(res, 400, { erreur: 'Le mot de passe doit faire au moins 8 caractères.' });
    const id = crypto.randomUUID(), sel = crypto.randomBytes(16).toString('hex');
    if (!(await store.setNew('pseudo:' + pseudo.toLowerCase(), id))) return send(res, 409, { erreur: 'Ce pseudo est déjà pris.' });
    await saveAccount({ id: id, pseudo: pseudo, sel: sel, hash: hashPassword(pass, sel), cree: Date.now(), grenouilles: [] });
    await openSession(res, id);
    return send(res, 201, { pseudo: pseudo, grenouilles: [] });
  }
  if (p === '/api/connexion' && method === 'POST') {
    if (await tooManyAttempts(req)) return send(res, 429, { erreur: 'Trop d’essais. Réessaie dans quelques minutes.' });
    const b = await readBody(req, 4096);
    const id = await store.get('pseudo:' + String(b.pseudo || '').trim().toLowerCase());
    const account = id && await store.get('compte:' + id);
    if (!account || !checkPassword(account, String(b.motdepasse || ''))) return send(res, 401, { erreur: 'Pseudo ou mot de passe incorrect.' });
    await openSession(res, account.id);
    return send(res, 200, { pseudo: account.pseudo, grenouilles: await summaries(account) });
  }
  if (p === '/api/deconnexion' && method === 'POST') {
    if (me) await store.del('session:' + me.token);
    res.setHeader('Set-Cookie', 'kawazu=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' + (SECURE ? '; Secure' : ''));
    return send(res, 200, { ok: true });
  }

  if (p === '/api/classement' && method === 'GET') {
    const [fiches, reps] = await Promise.all([store.hgetall(RANK), store.hgetall(REP)]);
    const all = Object.values(fiches), mine = me ? me.compte.grenouilles : [];
    all.forEach((e) => { e.moi = mine.indexOf(e.id) >= 0; e.rep = +reps[e.id] || 0; });
    return send(res, 200, { grenouilles: all, joueurs: new Set(all.map((e) => e.pseudo)).size, duels: { prochain: nextMonday(new Date()), recompenses: CADEAUX } });
  }

  // tout le reste demande d'être connecté
  if (!me) return send(res, 401, { erreur: 'Connecte-toi d’abord.' });
  const account = me.compte;
  if (p === '/api/moi' && method === 'GET') {
    return send(res, 200, { pseudo: account.pseudo, grenouilles: await summaries(account), max: MAX_FROGS });
  }
  if (p === '/api/grenouilles' && method === 'POST') {
    if (account.grenouilles.length >= MAX_FROGS) return send(res, 400, { erreur: 'Tu as déjà ' + MAX_FROGS + ' grenouilles : supprimes-en une pour en créer une autre.' });
    const b = await readBody(req, 4096);
    const nom = String(b.nom || '').trim().slice(0, 16) || 'Kawazu', peau = SKINS.indexOf(b.peau) >= 0 ? b.peau : 'marais';
    const id = crypto.randomUUID();
    const frog = { id: id, compte: account.id, nom: nom, peau: peau, cree: Date.now(), modifie: Date.now(), save: null };
    await store.set('grenouille:' + id, frog);
    account.grenouilles.push(id);
    await saveAccount(account);
    await publish(frog, account.pseudo);
    return send(res, 201, await summary(id));
  }
  const dj = /^\/api\/dojo\/([0-9a-f-]{36})(?:\/(adversaires|duel|cadeaux))?$/.exec(p);
  if (dj) {
    if (account.grenouilles.indexOf(dj[1]) < 0) return send(res, 404, { erreur: 'Grenouille introuvable.' });
    return dojoRoute(req, res, account, dj[1], dj[2], method);
  }
  const m = /^\/api\/grenouilles\/([0-9a-f-]{36})(\/sauver)?$/.exec(p);
  if (m) {
    const id = m[1], frog = account.grenouilles.indexOf(id) >= 0 ? await store.get('grenouille:' + id) : null;
    if (!frog) return send(res, 404, { erreur: 'Grenouille introuvable.' });
    if (method === 'GET' && !m[2]) { await publish(frog, account.pseudo); return send(res, 200, frog); } // la partie reprend : la fiche est à jour
    if ((method === 'PUT' && !m[2]) || (method === 'POST' && m[2])) {
      const b = await readBody(req, 256 * 1024);
      if (!b || typeof b.save !== 'object' || !b.save || Array.isArray(b.save)) return send(res, 400, { erreur: 'Sauvegarde invalide.' });
      const before = JSON.parse(JSON.stringify(frog));
      frog.save = b.save;
      frog.modifie = Date.now();
      if (b.save.hero && typeof b.save.hero.name === 'string') frog.nom = b.save.hero.name.slice(0, 16);
      await store.set('grenouille:' + id, frog);
      await publish(frog, account.pseudo, before);
      return send(res, 200, { ok: true, modifie: frog.modifie });
    }
    if (method === 'DELETE' && !m[2]) {
      account.grenouilles = account.grenouilles.filter((g) => g !== id);
      await saveAccount(account);
      await store.del('grenouille:' + id);
      await Promise.all([store.hdel(RANK, id), store.hdel(REP, id), store.del('dojo:' + id), store.del('cadeaux:' + id)]);
      return send(res, 200, { ok: true });
    }
  }
  return send(res, 404, { erreur: 'Route inconnue.' });
}

// Point d'entrée : pathname commence par /api/
async function handle(req, res, pathname) {
  if (!store) return send(res, 503, { erreur: 'La base de données du jeu n’est pas branchée : ajoute Upstash Redis au projet Vercel.' });
  try { await route(req, res, pathname); } catch (e) {
    if (!e.public) console.error(e);
    if (!res.headersSent) send(res, e.status || 500, { erreur: e.public ? e.message : 'Erreur du serveur.' });
  }
}

module.exports = { handle: handle, store: store };
