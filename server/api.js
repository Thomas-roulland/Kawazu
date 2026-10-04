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
//   POST /api/grenouilles/:id/journal { evenements }    le journal de la grenouille (combats, XP et sa source, forge…)
//   GET  /api/grenouilles/:id/journal                   son journal (le plus récent d'abord), pour l'analyser
//   GET  /api/admin/journaux?n=&id=                     tous les journaux (en-tête x-kawazu-admin = KAWAZU_ADMIN)
//   GET  /api/classement                                les fiches publiques de toutes les grenouilles
//   GET  /api/dojo/:id                                  le dojo d'une grenouille : réputation, duels du jour, journal,
//                                                       top 10, cadeaux à recevoir
//   GET  /api/dojo/:id/adversaires                      trois adversaires proches en réputation (fiches de combat)
//   POST /api/dojo/:id/duel { adversaire, victoire }    le résultat d'un duel : réputation des deux grenouilles
//   POST /api/dojo/:id/cadeaux { ids }                  les cadeaux reçus par le jeu (lundi, Alphas des clans)
//   GET  /api/clans/:id                                 le clan d'une grenouille (membres, Alpha, journal), la liste des
//                                                       clans, ses attaques du jour contre l'Alpha, ses cadeaux
//                                                       (et sa guerre, ou les clans à qui la déclarer)
//   POST /api/clans/:id/fonder { nom, blason }          fonde un clan ; POST .../rejoindre { clan } ; POST .../quitter
//   POST /api/clans/:id/blason { blason }               le chef change le blason (icône, fond, motif)
//   POST /api/clans/:id/don { montant }                 un don au trésor du clan (pris sur les lucioles de la grenouille)
//   POST /api/clans/:id/ameliorer { bonus }             le chef améliore un bonus du clan (xp ou lucioles) avec le trésor
//   POST /api/clans/:id/exclure { membre }              le chef (ou un bras droit) exclut une grenouille (3 jours sans revenir)
//   POST /api/clans/:id/role { membre, role }           le chef donne un rôle : bras droit, vétéran, membre, ou lui passe la main (chef)
//   POST /api/clans/:id/raid { degats }                 une attaque contre l'Alpha de son clan
//   POST /api/clans/:id/guerre { cible }                le chef déclare la guerre à un autre clan (5 grenouilles au moins)
//   POST /api/clans/:id/defi { adversaire }             un combat de la guerre : la fiche de la grenouille d'en face
//   POST /api/clans/:id/combat { adversaire, victoire } son résultat : des points pour son clan
//   POST /api/clans/:id/message { texte }               un message dans le chat du clan
//   GET  /api/titan/:id                                 le Titan de la semaine (PV partagés par toutes les grenouilles),
//                                                       ses attaques du jour, le classement des dégâts, ses cadeaux
//   POST /api/titan/:id/attaque { degats }              une attaque contre le Titan
//
// Les données passent par un petit magasin clé -> valeur :
//   - en ligne : Upstash Redis, par son API REST (variables KV_REST_API_URL et KV_REST_API_TOKEN, posées par
//     l'intégration Upstash de Vercel, ou UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN) ;
//   - sinon, en local : des fichiers JSON dans server/data/kv/.
// Clés : compte:<id>, pseudo:<pseudo en minuscules> -> id, session:<jeton> (expire toute seule), grenouille:<id>,
// essais:<adresse> (compteur des tentatives de connexion), les tableaux classement (id -> fiche) et reputation
// (id -> points), dojo:<id> (duels du jour, journal), cadeaux:<id>, dojo-semaine (la semaine en cours),
// clan:<id>, clans (id -> résumé), clan-de:<grenouille>, clan-jour:<grenouille>, clan-exclu:<grenouille>, guerre:<id>
// (voir « Les Clans »), titan (le Titan de la semaine), titan-degats:<semaine> (id -> dégâts), titan-pv:<semaine>, titan-parts:<semaine>:<rang>, titan-n:<grenouille>:<jour>,
// saison-courante (la saison en cours, pour distribuer les cadeaux de la précédente).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_FROGS = 5;
const SESSION_DAYS = 30;
const SKINS = ['marais', 'lagune', 'venin', 'soleil', 'orchidee', 'cendre'];
// avec les peaux de la garde-robe (achetées dans le jeu)
const ALL_SKINS = SKINS.concat(['saison_or', 'saison_argent', 'saison_bronze', 'braise', 'givrette', 'nenuphette', 'tourbe', 'orchidee2', 'cuivre', 'nuitetoilee', 'citronnelle', 'corsaire', 'ronin', 'lavande', 'cendrillard', 'arlequin', 'dune', 'moussaillon', 'ecorce2', 'perle', 'dardnoir', 'feufollet', 'tonnerre', 'ancetre', 'gloupoison', 'ecumette', 'poussemare', 'cogneur', 'ombrelame', 'grignote', 'rouquin', 'rempart', 'maitremousse', 'parrain']);
// les skins renommés : une sauvegarde pas encore relue par le jeu les porte encore sous leur ancien nom
const RENAMED_SKINS = { cradopaud: 'gloupoison', grenousse: 'ecumette', tarpaud: 'poussemare', tartard: 'cogneur', amphinobi: 'ombrelame',
  gamatatsu: 'grignote', gamakichi: 'rouquin', gamaken: 'rempart', fukasaku: 'maitremousse', gamabunta: 'parrain' };
// la peau portée : celle de la sauvegarde si elle est connue, sinon celle de la création
const skinOfFrog = (f) => { const s = f.save && f.save.hero && f.save.hero.skin, k = RENAMED_SKINS[s] || s; return ALL_SKINS.indexOf(k) >= 0 ? k : f.peau; };
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
    lock: async (k, token, ttl) => (await cmd(['SET', k, token, 'NX', 'EX', String(ttl)])) === 'OK',
    unlock: async (k, token) => { if ((await cmd(['GET', k])) === token) await cmd(['DEL', k]); },
    del: (k) => cmd(['DEL', k]),
    incr: async (k, ttl) => { const n = await cmd(['INCR', k]); if (n === 1) await cmd(['EXPIRE', k, String(ttl)]); return n; },
    hset: (k, field, v) => cmd(['HSET', k, field, JSON.stringify(v)]),
    hincr: (k, field, n) => cmd(['HINCRBY', k, field, String(n)]),
    hdel: (k, field) => cmd(['HDEL', k, field]),
    lpush: (k, values) => cmd(['LPUSH', k].concat(values)),
    ltrim: (k, a, b) => cmd(['LTRIM', k, String(a), String(b)]),
    lrange: async (k, a, b) => (await cmd(['LRANGE', k, String(a), String(b)])) || [],
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
    lock: async (k, token, ttl) => { if (read(k)) return false; write(k, token, Date.now() + ttl * 1000); return true; },
    unlock: async (k, token) => { const e = read(k); if (e && e.v === token) { try { fs.unlinkSync(file(k)); } catch (er) { /* déjà parti */ } } },
    del: async (k) => { try { fs.unlinkSync(file(k)); } catch (e) { /* déjà parti */ } },
    incr: async (k, ttl) => { const e = read(k), n = (e ? e.v : 0) + 1; write(k, n, e ? e.expire : Date.now() + ttl * 1000); return n; },
    hset: async (k, field, v) => { const e = read(k), o = e ? e.v : {}; o[field] = v; write(k, o); },
    hincr: async (k, field, n) => { const e = read(k), o = e ? e.v : {}; o[field] = (+o[field] || 0) + n; write(k, o); return o[field]; },
    hdel: async (k, field) => { const e = read(k); if (e && e.v[field]) { delete e.v[field]; write(k, e.v); } },
    hgetall: async (k) => { const e = read(k); return e ? e.v : {}; },
    lpush: async (k, values) => { const e = read(k), l = e && Array.isArray(e.v) ? e.v : []; values.forEach((v) => l.unshift(v)); write(k, l); return l.length; },
    ltrim: async (k, a, b) => { const e = read(k); if (e && Array.isArray(e.v)) write(k, e.v.slice(a, b + 1)); },
    lrange: async (k, a, b) => { const e = read(k); return e && Array.isArray(e.v) ? e.v.slice(a, b < 0 ? undefined : b + 1) : []; }
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
const MUTATION_MAX = 10; // (comme src/items.js) : dix mutations, donc dix titres et dix couleurs d'aura
const TERRES = 37; // les terres du monde (l'île, le Continent, les Colosses, l'Archipel, le Royaume) ; à suivre quand une île s'ajoute
function rankEntry(frog, pseudo) {
  const s = frog.save || {}, progress = Array.isArray(s.progress) ? s.progress.slice(0, TERRES).map((p) => num(p, 10)) : [];
  const cycle = Math.max(1, num(s.cycle || 1, 999)), mutations = num(s.mutation && s.mutation.n, 999);
  let monde = 0;
  progress.forEach((p, i) => { if (i === 0 || progress[i - 1] >= 10) monde = i; });
  const equip = {};
  if (s.equip && typeof s.equip === 'object') Object.keys(s.equip).slice(0, 8).forEach((slot) => { if (typeof s.equip[slot] === 'string') equip[slot.slice(0, 16)] = s.equip[slot].slice(0, 32); });
  return {
    id: frog.id, nom: frog.nom, peau: skinOfFrog(frog), pseudo: pseudo,
    niveau: num(s.level || 1, 999), xp: num(s.xp, 1e9), voie: typeof s.voie === 'string' ? s.voie.slice(0, 12) : null,
    // l'aventure : les étapes conquises, et chaque cycle (NG+) terminé compte pour tout le monde (TERRES × 10 étapes)
    progres: progress, monde: monde, etape: progress[monde] || 0, conquis: progress.reduce((a, p) => a + p, 0) + (cycle - 1) * TERRES * 10, cycle: cycle, mutations: mutations, titre: mutations ? (typeof s.titre === 'number' && s.titre >= -1 && s.titre < Math.min(mutations, MUTATION_MAX) ? Math.floor(s.titre) : Math.min(mutations, MUTATION_MAX) - 1) : -1,
    aura: mutations ? (typeof s.auraColor === 'number' && s.auraColor >= 0 && s.auraColor < Math.min(mutations, MUTATION_MAX) ? Math.floor(s.auraColor) : Math.min(mutations, MUTATION_MAX) - 1) : -1, // la couleur d'aura choisie
    succes: Array.isArray(s.ach) ? s.ach.length : 0, equip: equip, vu: Math.floor((frog.modifie || Date.now()) / 3600e3),
    sorts: Array.isArray(s.deck) ? s.deck.filter((d) => typeof d === 'string').slice(0, 4).map((d) => d.slice(0, 24)) : [],
    dalles: Array.isArray(s.tree) ? Math.min(s.tree.length, 999) : 0, tour: num(s.tower, 600),
    // la saison de classement (un mois) : son id ('AAAA-MM') et les points gagnés pendant
    saison: s.season && typeof s.season.id === 'string' ? s.season.id.slice(0, 8) : '', pts: num(s.season && s.season.pts, 1e7)
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
      await addGift(top[i][0], Object.assign({ id: last + '-' + (i + 1), semaine: last, rang: i + 1 }, CADEAUX[i]));
    }
  }
  await store.set('dojo-semaine', week);
}
// Un verrou court (SET NX EX) : ce qui relit puis réécrit un même objet passe l'un après l'autre, pour que deux joueurs
// qui agissent au même instant ne s'effacent pas (un don, un message, un coup sur l'Alpha, un cadeau...)
async function withLock(key, fn) {
  const token = crypto.randomUUID();
  for (let i = 0; i < 80; i++) {
    if (await store.lock(key, token, 10)) {
      try { return await fn(); } finally { await store.unlock(key, token); }
    }
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 60));
  }
  throw fail(503, 'Beaucoup de monde en même temps : réessaie dans un instant.');
}
// plusieurs verrous, toujours pris dans le même ordre : deux joueurs qui se défient l'un l'autre ne s'attendent pas sans fin
function withLocks(keys, fn) {
  const ks = Array.from(new Set(keys)).sort();
  const take = (i) => (i >= ks.length ? fn() : withLock(ks[i], () => take(i + 1)));
  return take(0);
}
const CLAN_LOCK = 'verrou-clans'; // toutes les écritures des clans (une guerre touche deux clans à la fois)
async function editGifts(frogId, fn) {
  return withLock('verrou-cadeaux:' + frogId, async () => {
    const key = 'cadeaux:' + frogId, list = fn((await store.get(key)) || []);
    if (list.length) await store.set(key, list); else await store.del(key);
    return list;
  });
}
// ---------- Le journal des grenouilles : de quoi analyser l'équilibre, et repérer ce qui est abusé ----------
// journal:<grenouille> : une liste (la plus récente d'abord, JOURNAL_MAX au plus). Le jeu y envoie ses événements (chaque
// combat, chaque gain d'XP et sa source, la forge, le recyclage, les achats, les mutations…) ; le serveur y ajoute un
// instantané à chaque sauvegarde qui change le niveau, l'équipement, la mutation ou le cycle, avec un signal « saut »
// quand le niveau, les lucioles ou les éclats bondissent d'un coup (à regarder de près).
const JOURNAL_MAX = 5000, JOURNAL_LOT = 100, JOURNAL_EVENT = 2000;
async function journalPush(id, events) {
  if (!events.length) return;
  await store.lpush('journal:' + id, events.map((e) => JSON.stringify(e)));
  await store.ltrim('journal:' + id, 0, JOURNAL_MAX - 1);
}
async function journalRead(id, n) { return (await store.lrange('journal:' + id, 0, Math.max(1, Math.min(JOURNAL_MAX, n)) - 1)).map((s) => { try { return typeof s === 'string' ? JSON.parse(s) : s; } catch (e) { return null; } }).filter(Boolean); }
// ce qui compte d'une partie, pour la suivre : niveau, avancée, monnaies, et chaque objet porté (rareté, forge, stats)
function snapshotOf(s) {
  s = s || {};
  const items = s.items && typeof s.items === 'object' ? s.items : {}, equip = s.equip && typeof s.equip === 'object' ? s.equip : {}, gear = {};
  Object.keys(equip).forEach((slot) => { const id = equip[slot], it = typeof id === 'string' && items[id]; gear[slot] = it ? { base: String(it.base).slice(0, 40), rar: it.rar, forge: num(it.forge, 10), stats: it.stats } : (typeof id === 'string' ? id.slice(0, 40) : null); });
  return { niv: num(s.level || 1, 999), xp: num(s.xp, 1e12), conquis: Array.isArray(s.progress) ? s.progress.reduce((a, n) => a + (+n || 0), 0) : 0, tour: num(s.tower, 999),
    or: num(s.gold, 1e15), eclats: num(s.eclats, 1e12), cycle: num(s.cycle || 1, 999), mut: num(s.mutation && s.mutation.n, 999), dalles: Array.isArray(s.tree) ? s.tree.length : 0,
    maitrises: s.mastery && typeof s.mastery === 'object' ? s.mastery : {}, compagnon: typeof s.pet === 'string' ? s.pet : null, objets: Array.isArray(s.owned) ? s.owned.length : 0, equipement: gear };
}
async function journalSnapshot(id, before, after) {
  const a = snapshotOf(before), b = snapshotOf(after), sig = (x) => JSON.stringify(x.equipement) + '|' + x.mut + '|' + x.cycle;
  if (a.niv === b.niv && sig(a) === sig(b)) return;
  const saut = [];
  if (b.niv - a.niv >= 5) saut.push('niveau +' + (b.niv - a.niv));
  if (b.or - a.or >= Math.max(200000, 3000 * b.niv)) saut.push('lucioles +' + (b.or - a.or));
  if (b.eclats - a.eclats >= 5000) saut.push('éclats +' + (b.eclats - a.eclats));
  await journalPush(id, [Object.assign({ t: Date.now(), k: 'sauvegarde', serveur: true }, b, saut.length ? { saut: saut } : {})]);
}

async function addGift(frogId, gift) { await editGifts(frogId, (list) => list.filter((g) => g.id !== gift.id).concat([gift])); }
// ---------- Les saisons de classement : un mois (heure de Paris) ----------
// Les points de saison sont gagnés dans le jeu (quêtes, boss, donjons, Titan…) et publiés avec la fiche. Le premier du
// mois, les dix premières de la saison passée reçoivent un cadeau ; les trois premières, une peau qu'on ne trouve pas
// ailleurs.
const SAISON_CADEAUX = [
  { lucioles: 10000, eclats: 300, xpNiveau: 2, peau: 'saison_or' }, { lucioles: 7000, eclats: 200, xpNiveau: 1.5, peau: 'saison_argent' },
  { lucioles: 5000, eclats: 150, xpNiveau: 1, peau: 'saison_bronze' }
].concat(Array.from({ length: 7 }, () => ({ lucioles: 2500, eclats: 80, xpNiveau: 0.5 })));
const seasonOf = (t) => parisDay(t).slice(0, 7);
function nextSeason(now) { // le premier du mois suivant, minuit heure de Paris
  const [y, m] = seasonOf(now).split('-').map(Number), t = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1));
  const h = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(t);
  return t.getTime() - h * 3600e3;
}
async function seasonGifts() {
  const cur = seasonOf(new Date()), last = await store.get('saison-courante');
  if (last === cur) return;
  if (last && await store.setNew('saison-distribuee:' + last, 1)) {
    const top = Object.values(await store.hgetall(RANK)).filter((e) => e.saison === last && e.pts > 0).sort((a, b) => b.pts - a.pts).slice(0, SAISON_CADEAUX.length);
    for (let i = 0; i < top.length; i++) await addGift(top[i].id, Object.assign({ id: 'saison-' + last + '-' + (i + 1), source: 'saison', saison: last, rang: i + 1 }, SAISON_CADEAUX[i]));
  }
  await store.set('saison-courante', cur);
}

// ---------- Le Titan de la semaine (le boss mondial) ----------
// Un Titan géant, le même pour toutes les grenouilles, qui change chaque lundi (heure de Paris). Ses PV sont partagés :
// chaque grenouille l'attaque TITAN_PAR_JOUR fois par jour (TITAN_TOURS tours ; le combat se joue dans le navigateur et
// envoie ses dégâts). Chaque attaque rapporte (lucioles, XP, éclats, selon les dégâts). Quand il tombe, chaque grenouille
// qui l'a frappé reçoit sa part, et un Titan plus fort se dresse (rang + 1). Chaque lundi, les dix premières en dégâts
// de la semaine reçoivent un cadeau, et toutes celles qui ont combattu une part. Ses PV s'ajustent d'une semaine à
// l'autre : ×1,35 si le Titan est tombé, ×0,85 sinon (jamais sous TITAN_PV_MIN).
const TITAN_PAR_JOUR = 3, TITAN_TOURS = 10, TITAN_PV = 600000, TITAN_PV_MIN = 300000;
const TITAN_NOMS = ['le Kraken des Tempêtes', 'le Léviathan d’Écume', 'le Cyclope Sans-Sommeil', 'le Ryū Céleste', 'le Sylvain Colérique']; // (les mêmes que le jeu, src/worlds.js)
const TITAN_CADEAUX = [{ lucioles: 3000, eclats: 120, xpNiveau: 1 }, { lucioles: 2200, eclats: 90, xpNiveau: 0.8 }, { lucioles: 1600, eclats: 70, xpNiveau: 0.6 }]
  .concat(Array.from({ length: 7 }, () => ({ lucioles: 900, eclats: 40, xpNiveau: 0.4 })));
const TITAN_PART = { lucioles: 400, eclats: 15, xpNiveau: 0.2 }; // pour chaque grenouille qui l'a frappé, au-delà des dix premières
const titanHp = (base, rang) => Math.round(base * Math.pow(1.5, rang));
// Les coups sont comptés à part, de façon atomique (HINCRBY), pour qu'aucun ne se perde quand beaucoup de joueurs
// frappent en même temps : titan-pv:<semaine> (r<rang> -> dégâts reçus par ce Titan-là) et
// titan-parts:<semaine>:<rang> (grenouille -> ses dégâts sur ce Titan-là). Le Titan debout est le premier pas encore abattu.
async function titanLive(t) {
  const hp = await store.hgetall('titan-pv:' + t.semaine);
  let rang = 0;
  while ((+hp['r' + rang] || 0) >= titanHp(t.base, rang)) rang++;
  const pvMax = titanHp(t.base, rang);
  return { rang: rang, vaincus: rang, pvMax: pvMax, pv: Math.max(0, pvMax - (+hp['r' + rang] || 0)) };
}
// un Titan de la version d'avant (ses PV dans l'objet) : ses coups passent une fois dans les compteurs
async function titanMigrate(t) {
  if (await store.setNew('titan-migre:' + t.semaine, 1)) {
    const rang = t.rang || 0;
    for (let r = 0; r < rang; r++) await store.hincr('titan-pv:' + t.semaine, 'r' + r, titanHp(t.base, r));
    if ((t.pvMax || 0) > (t.pv || 0)) await store.hincr('titan-pv:' + t.semaine, 'r' + rang, t.pvMax - t.pv);
    await Promise.all(Object.keys(t.parts || {}).map((fr) => store.hincr('titan-parts:' + t.semaine + ':' + rang, fr, t.parts[fr])));
  }
  t = { semaine: t.semaine, idx: t.idx, base: t.base, v2: true };
  await store.set('titan', t);
  return t;
}
// la part d'une grenouille quand un Titan tombe (une seule fois par grenouille et par Titan)
async function titanPart(t, rang, frogId) {
  if (+(await store.hincr('titan-donnees:' + t.semaine + ':' + rang, frogId, 1)) !== 1) return;
  await addGift(frogId, { id: 'titan-' + t.semaine + '-r' + rang, source: 'titan', titan: TITAN_NOMS[t.idx], rang: rang, lucioles: 600 + 300 * rang, eclats: 25 + 10 * rang, xpNiveau: 0.5 });
}
async function titanState() {
  const week = mondayOf(parisDay(new Date()));
  let t = await store.get('titan');
  if (t && t.semaine === week) return t.v2 ? t : titanMigrate(t);
  let base = TITAN_PV;
  if (t) { // une nouvelle semaine : les cadeaux de la précédente (une seule fois), puis un nouveau Titan
    const vaincus = t.v2 ? (await titanLive(t)).vaincus : t.vaincus;
    base = Math.max(TITAN_PV_MIN, Math.round(t.base * (vaincus > 0 ? 1.35 : 0.85)));
    if (await store.setNew('titan-distribue:' + t.semaine, 1)) {
      const deg = await store.hgetall('titan-degats:' + t.semaine), ranked = Object.keys(deg).filter((k) => +deg[k] > 0).sort((a, b) => deg[b] - deg[a]);
      for (let i = 0; i < ranked.length; i++) {
        await addGift(ranked[i], Object.assign({ id: 'titan-' + t.semaine + '-' + ranked[i].slice(0, 8), source: 'titan-semaine', semaine: t.semaine, rang: i < TITAN_CADEAUX.length ? i + 1 : 0, degats: +deg[ranked[i]] }, i < TITAN_CADEAUX.length ? TITAN_CADEAUX[i] : TITAN_PART));
      }
    }
  }
  const idx = Math.floor(new Date(week + 'T00:00:00Z').getTime() / (7 * 86400e3)) % TITAN_NOMS.length;
  t = { semaine: week, idx: idx, base: base, v2: true };
  await store.set('titan', t);
  return t;
}
// les attaques du jour : un compteur par grenouille et par jour (INCR, atomique : un double clic ne passe pas) ;
// titan-jour:<grenouille> est celui de la version d'avant, encore compté le jour du changement
const titanDayKey = (frogId) => 'titan-n:' + frogId + ':' + parisDay(new Date());
async function titanUsed(frogId) {
  const [old, n] = await Promise.all([store.get('titan-jour:' + frogId), store.get(titanDayKey(frogId))]);
  return (old && old.jour === parisDay(new Date()) ? old.n : 0) + (+n || 0);
}
async function titanRoute(req, res, account, id, action, method) {
  await seasonGifts();
  const t = await titanState();
  if (!action && method === 'GET') {
    const live = await titanLive(t);
    const [used, deg, fiches, gifts, parts] = await Promise.all([titanUsed(id), store.hgetall('titan-degats:' + t.semaine), store.hgetall(RANK), store.get('cadeaux:' + id), store.hgetall('titan-parts:' + t.semaine + ':' + live.rang)]);
    const ranked = Object.keys(deg).filter((k) => +deg[k] > 0 && fiches[k]).sort((a, b) => deg[b] - deg[a]);
    return send(res, 200, {
      semaine: t.semaine, fin: nextMonday(new Date()), titan: { idx: t.idx, rang: live.rang, pv: live.pv, pvMax: live.pvMax, vaincus: live.vaincus, nom: TITAN_NOMS[t.idx] },
      restants: Math.max(0, TITAN_PAR_JOUR - used), max: TITAN_PAR_JOUR, tours: TITAN_TOURS, mesDegats: +deg[id] || 0, place: ranked.indexOf(id) + 1, classes: ranked.length,
      maPart: +parts[id] || 0,
      top: ranked.slice(0, 10).map((k) => Object.assign({}, fiches[k], { degats: +deg[k] })), recompenses: TITAN_CADEAUX, part: TITAN_PART, cadeaux: gifts || []
    });
  }
  if (action === 'attaque' && method === 'POST') {
    const b = await readBody(req, 4096), old = await store.get('titan-jour:' + id);
    const n = (await store.incr(titanDayKey(id), 2 * 86400)) + (old && old.jour === parisDay(new Date()) ? old.n : 0);
    if (n > TITAN_PAR_JOUR) return send(res, 429, { erreur: 'Plus d’attaque contre le Titan aujourd’hui : reviens demain !' });
    const frog = await store.get('grenouille:' + id), lvl = num((frog && frog.save && frog.save.level) || 1, 999);
    const deg = clamp(Math.round(+b.degats || 0), 0, TITAN_TOURS * (60 + 30 * lvl) * 3); // au-delà, ce n'est pas un vrai combat
    const total = await store.hincr('titan-degats:' + t.semaine, id, deg);
    // le coup frappe le Titan debout ; s'il vient de tomber sous les coups d'une autre, il frappe le suivant
    let rang = (await titanLive(t)).rang, vaincu = null;
    for (let k = 0; k < 4; k++) {
      const max = titanHp(t.base, rang);
      await store.hincr('titan-parts:' + t.semaine + ':' + rang, id, deg);
      const dealt = await store.hincr('titan-pv:' + t.semaine, 'r' + rang, deg);
      if (dealt - deg < max) { if (dealt >= max) vaincu = rang; break; } // un seul coup franchit la barre : c'est lui qui l'abat
      await titanPart(t, rang, id); // touché au moment où il tombait : la part quand même
      rang++;
    }
    if (vaincu !== null) { // le Titan tombe : une part pour chaque grenouille qui l'a frappé, et un Titan plus fort se dresse
      const parts = await store.hgetall('titan-parts:' + t.semaine + ':' + vaincu);
      await Promise.all(Object.keys(parts).filter((fr) => +parts[fr] > 0).map((fr) => titanPart(t, vaincu, fr)));
    }
    const live = await titanLive(t);
    // la récompense de l'attaque elle-même (le jeu l'applique) : selon les dégâts
    const recompense = { lucioles: Math.round(200 + Math.min(1500, deg / 100)), eclats: Math.round(5 + Math.min(40, deg / 2500)), xpNiveau: Math.round((0.06 + Math.min(0.14, deg / Math.max(1, live.pvMax) * 4)) * 1000) / 1000 };
    return send(res, 200, { degats: deg, total: total, pv: live.pv, pvMax: live.pvMax, rang: live.rang, vaincu: vaincu, restants: Math.max(0, TITAN_PAR_JOUR - n), recompense: recompense });
  }
  return send(res, 404, { erreur: 'Route inconnue.' });
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
    out[id] = { base: it.base.slice(0, 32), rar: ['commun', 'rare', 'epique', 'unique', 'legendaire'].indexOf(it.rar) >= 0 ? it.rar : 'commun', stats: stats };
    if (it.forge) out[id].forge = num(it.forge, 10);
    if (typeof it.from === 'string') out[id].from = it.from.slice(0, 8);
    if (typeof it.name === 'string') out[id].name = it.name.slice(0, 48);
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
async function dojoDuel(res, account, id, b) {
  const rec = await dojoRecord(id);
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
async function dojoRoute(req, res, account, id, action, method) {
  await weeklyGifts();
  await seasonGifts();
  if (!action && method === 'GET') {
    const [rec, reps, fiches, gifts] = await Promise.all([dojoRecord(id), store.hgetall(REP), store.hgetall(RANK), store.get('cadeaux:' + id)]);
    const mine = +reps[id] || 0, ranked = Object.keys(reps).filter((k) => +reps[k] > 0 && fiches[k]).sort((a, b) => reps[b] - reps[a]);
    return send(res, 200, {
      rep: mine, victoires: rec.v, defaites: rec.d, restants: DUELS_PAR_JOUR - rec.n, max: DUELS_PAR_JOUR, journal: rec.journal,
      rang: mine > 0 ? ranked.indexOf(id) + 1 : 0, classes: ranked.length, prochain: nextMonday(new Date()), recompenses: CADEAUX, cadeaux: gifts || [],
      top: ranked.slice(0, 10).map((k) => Object.assign({}, fiches[k], { rep: +reps[k] }))
    });
  }
  if (action === 'adversaires' && method === 'GET') return withLock('verrou-dojo:' + id, async () => {
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
  });
  // un duel : le carnet de la grenouille et celui de son adversaire, sous leurs deux verrous (un double clic ne compte
  // qu'une fois, et plusieurs défis à la même grenouille au même instant gardent tous leur ligne de journal)
  if (action === 'duel' && method === 'POST') {
    const b = await readBody(req, 4096);
    return withLocks(['verrou-dojo:' + id, 'verrou-dojo:' + String(b.adversaire || '').slice(0, 64)], () => dojoDuel(res, account, id, b));
  }
  if (action === 'cadeaux' && method === 'POST') {
    const b = await readBody(req, 4096), ids = Array.isArray(b.ids) ? b.ids : [];
    await editGifts(id, (list) => list.filter((g) => ids.indexOf(g.id) < 0));
    return send(res, 200, { ok: true });
  }
  return send(res, 404, { erreur: 'Route inconnue.' });
}

// ---------- Les Clans (les guildes du marais) ----------
// Un clan réunit jusqu'à CLAN_MAX grenouilles, sous un blason (une icône, un fond, une couleur de motif). Ensemble,
// elles affrontent un Alpha : une créature géante aux PV partagés ; chaque grenouille l'attaque RAIDS_PAR_JOUR fois
// par jour (le combat se joue dans le navigateur, pendant RAID_TOURS tours, et envoie ses dégâts). Quand il tombe,
// chaque grenouille du clan qui l'a attaqué reçoit sa part (raid.parts), et un Alpha plus fort arrive.
// Les guerres : un clan d'au moins GUERRE_MIN grenouilles la déclare (son chef) à un autre qui en a autant. Pendant
// GUERRE_DUREE, chaque grenouille des deux camps (ceux du jour de la déclaration) a GUERRE_ATTAQUES combats contre
// les grenouilles d'en face ; chaque victoire rapporte des points à son clan. À la fin, le clan qui en a le plus
// gagne de la renommée, et ceux qui ont combattu reçoivent leur part. Deux clans attendent GUERRE_REPOS avant de se
// refaire la guerre. Une guerre se termine quand quelqu'un la regarde après sa fin (settleWar).
// Le chef peut exclure une grenouille : elle ne peut pas revenir avant EXCLU_JOURS jours.
// Le butin : un trésor, rempli par les dons des membres et par une part du butin (chaque Alpha abattu, chaque guerre
// gagnée) ; le chef s'en sert pour améliorer deux bonus, l'XP et les lucioles gagnées par tout le clan (BONUS_PAS par
// niveau, BONUS_MAX niveaux ; un niveau coûte bonusCost). Le jeu applique ces bonus (voir clanBonus dans items.js).
// Clés : clan:<id> (le clan), clans (tableau id -> résumé public), clan-de:<grenouille> -> id de son clan,
// clan-jour:<grenouille> (ses attaques du jour contre l'Alpha), clan-exclu:<grenouille> (le nom du clan qui l'a
// exclue, pour le lui dire une fois), guerre:<id> (une guerre et son journal).
const CLANS = 'clans';
const CLAN_MAX = 10, RAIDS_PAR_JOUR = 2, RAID_TOURS = 10, EXCLU_JOURS = 3;
const BLASON = { icone: 5, fond: 8, motif: 6 }; // le nombre d'icônes, de fonds et de couleurs de motif (voir le jeu)
const BONUS_MAX = 10, BONUS_PAS = 0.02, DON_MAX = 100000;
const bonusCost = (n) => 1000 * (n + 1) * (n + 2); // 2 000, 6 000, 12 000… 110 000 pour le dixième niveau
// Les bonus avancés, ouverts une fois l'XP et les lucioles au plus haut : le butin (chance d'objet), la force (dégâts)
// et la carapace (PV) de tout le clan ; un peu plus chers
const BONUS_AVANCES = { butin: 0.02, force: 0.01, vie: 0.01 };
const bonusCost2 = (n) => 1500 * (n + 1) * (n + 2);
// Les rôles : le chef nomme des bras droits (ils excluent, déclarent la guerre, dépensent le trésor, changent le blason)
// et des vétérans (un titre d'honneur) ; il peut aussi passer la main
const ROLES = { bras: { nom: 'Bras droit', max: 2 }, veteran: { nom: 'Vétéran', max: 3 } };
const roleOf = (m, f) => (m.chef === f ? 'chef' : ((m.roles || {})[f] || 'membre'));
const canManage = (m, f) => m.chef === f || (m.roles || {})[f] === 'bras';
const bonusLvl = (m, k) => (m.bonus && m.bonus[k]) || 0;
const alphaLoot = (rang) => 500 + 300 * rang, GUERRE_BUTIN = { victoire: 2000, nulle: 500, defaite: 0 };
const GUERRE_MIN = 5, GUERRE_DUREE = +process.env.KAWAZU_GUERRE_MS || 24 * 3600e3, GUERRE_ATTAQUES = 3, GUERRE_REPOS = 3 * 86400e3; // (une guerre plus courte pour les tests)
const alphaHp = (rang) => Math.round(20000 * Math.pow(1.6, rang)); // la même règle que le jeu (src/worlds.js)
const parseBlason = (v) => { v = v && typeof v === 'object' ? v : {}; return { icone: num(v.icone, BLASON.icone - 1), fond: num(v.fond, BLASON.fond - 1), motif: num(v.motif, BLASON.motif - 1) }; };
const clanSummary = (m) => ({ id: m.id, nom: m.nom, blason: m.blason, membres: m.membres.length, renommee: m.renommee, rang: m.raid.rang, chef: m.chefNom, guerreFin: m.guerre ? m.guerreFin : 0 });
async function saveClan(m) { await Promise.all([store.set('clan:' + m.id, m), store.hset(CLANS, m.id, clanSummary(m))]); }
async function loadClan(id) {
  const m = id ? await store.get('clan:' + id) : null;
  if (m) {
    m.blason = m.blason || { icone: 0, fond: num(m.embleme, BLASON.fond - 1), motif: 0 }; m.repos = m.repos || {}; m.guerre = m.guerre || null;
    m.tresor = m.tresor || 0; m.bonus = m.bonus || { xp: 0, lucioles: 0 }; m.dons = m.dons || {};
  }
  return m;
}
async function clanOf(frogId) { return loadClan(await store.get('clan-de:' + frogId)); }
async function clanDay(frogId) { // les attaques contre l'Alpha repartent à zéro chaque jour
  const r = (await store.get('clan-jour:' + frogId)) || { jour: '', raids: 0 }, today = parisDay(new Date());
  if (r.jour !== today) { r.jour = today; r.raids = 0; }
  return r;
}
function clanLog(m, entry) { m.journal = [Object.assign({ t: Date.now() }, entry)].concat(m.journal || []).slice(0, 20); }
// Une grenouille sort de son clan (elle part, elle est exclue ou elle disparaît) : un clan vide disparaît, un chef
// qui part laisse sa place
async function leaveClan(frogId) {
  const m = await clanOf(frogId);
  await store.del('clan-de:' + frogId);
  if (!m) return null;
  m.membres = m.membres.filter((x) => x !== frogId);
  delete m.raid.parts[frogId];
  if (m.roles) delete m.roles[frogId];
  if (!m.membres.length) { await Promise.all([store.del('clan:' + m.id), store.hdel(CLANS, m.id)]); return null; }
  if (m.chef === frogId) { // un bras droit prend la suite, sinon la première grenouille
    m.chef = m.membres.filter((f) => (m.roles || {})[f] === 'bras')[0] || m.membres[0];
    if (m.roles) delete m.roles[m.chef];
    const f = (await store.hgetall(RANK))[m.chef]; m.chefNom = f ? f.nom : '';
  }
  await saveClan(m);
  return m;
}
// La fin d'une guerre : renommée, parts pour ceux qui ont combattu, repos entre les deux clans
async function settleWar(w) {
  if (!w || w.finie || Date.now() < w.fin) return w;
  w.finie = true;
  const score = (side) => w.scores[w[side].id] || 0, other = (side) => (side === 'a' ? 'b' : 'a');
  const winner = score('a') > score('b') ? 'a' : (score('b') > score('a') ? 'b' : null);
  w.resultat = winner ? w[winner].id : 'nul';
  for (const side of ['a', 'b']) {
    const c = await loadClan(w[side].id), o = w[other(side)];
    if (!c) continue;
    const res = !winner ? 'nulle' : (winner === side ? 'victoire' : 'defaite');
    c.renommee += res === 'victoire' ? 30 : (res === 'nulle' ? 10 : 0);
    c.tresor += GUERRE_BUTIN[res];
    if (c.guerre === w.id) c.guerre = null;
    c.repos[o.id] = Date.now();
    c.derniereGuerre = { contre: o.nom, resultat: res, nous: score(side), eux: score(other(side)), t: Date.now() };
    clanLog(c, { type: 'guerre-fin', contre: o.nom, resultat: res, nous: score(side), eux: score(other(side)), butin: GUERRE_BUTIN[res] });
    const gift = { id: 'guerre-' + w.id.slice(0, 8) + '-' + side, source: 'guerre', clan: c.nom, contre: o.nom, resultat: res,
      lucioles: res === 'victoire' ? 400 : (res === 'nulle' ? 200 : 100), xpNiveau: res === 'victoire' ? 0.25 : 0 };
    const fought = w[side].membres.filter((f) => (w.attaques[f] || 0) > 0);
    await Promise.all(fought.map((f) => addGift(f, gift)));
    await saveClan(c);
  }
  await store.set('guerre:' + w.id, w);
  return w;
}
function warView(w, m, id, fiches) { // la guerre, vue d'un camp
  const us = w.a.id === m.id ? 'a' : 'b', them = us === 'a' ? 'b' : 'a';
  return {
    id: w.id, contre: { id: w[them].id, nom: w[them].nom, blason: w[them].blason }, debut: w.debut, fin: w.fin,
    nous: w.scores[w[us].id] || 0, eux: w.scores[w[them].id] || 0, max: GUERRE_ATTAQUES,
    engagee: w[us].membres.indexOf(id) >= 0, restants: w[us].membres.indexOf(id) >= 0 ? GUERRE_ATTAQUES - (w.attaques[id] || 0) : 0,
    ennemis: w[them].membres.filter((f) => fiches[f]).map((f) => Object.assign({ battue: w.battus[f] || 0 }, fiches[f])),
    journal: (w.journal || []).slice(0, 12)
  };
}
async function clanRoute(req, res, account, id, action, method) {
  const fiches = await store.hgetall(RANK), me = fiches[id] || { nom: 'Une grenouille', niveau: 1 };
  if (!action && method === 'GET') {
    let m = await clanOf(id);
    if (m && m.guerre) {
      let w = await store.get('guerre:' + m.guerre);
      if (w && !w.finie && Date.now() >= w.fin) w = await withLock(CLAN_LOCK, async () => settleWar(await store.get('guerre:' + m.guerre)));
      if (!w || w.finie) m = await clanOf(id);
    }
    const [day, all, gifts, exclu] = await Promise.all([clanDay(id), store.hgetall(CLANS), store.get('cadeaux:' + id), store.get('clan-exclu:' + id)]);
    const liste = Object.values(all).sort((a, b) => b.renommee - a.renommee || b.rang - a.rang);
    const out = {
      clan: null, liste: liste.slice(0, 30), max: CLAN_MAX, tours: RAID_TOURS, cadeaux: gifts || [], exclu: exclu || null,
      raids: RAIDS_PAR_JOUR - day.raids, raidsMax: RAIDS_PAR_JOUR, guerreMin: GUERRE_MIN, guerre: null, cibles: [],
      bonus: { xp: 0, lucioles: 0, butin: 0, force: 0, vie: 0 }, roles: ROLES,
      butin: { max: BONUS_MAX, pas: BONUS_PAS, avances: BONUS_AVANCES, alpha: m ? alphaLoot(m.raid.rang) : alphaLoot(0), guerre: GUERRE_BUTIN.victoire }
    };
    if (exclu) await store.del('clan-exclu:' + id); // on ne le dit qu'une fois
    if (m) {
      out.clan = Object.assign({}, m, {
        bannis: undefined, repos: undefined, chatDernier: undefined, chat: (m.chat || []).slice(-40),
        membres: m.membres.map((f) => Object.assign({ contribution: (m.contributions || {})[f] || 0, part: m.raid.parts[f] || 0, don: m.dons[f] || 0, role: roleOf(m, f) }, fiches[f] || { id: f, nom: '?' })),
        bonus: { xp: bonusLvl(m, 'xp'), lucioles: bonusLvl(m, 'lucioles'), butin: bonusLvl(m, 'butin'), force: bonusLvl(m, 'force'), vie: bonusLvl(m, 'vie') },
        monRole: roleOf(m, id),
        place: liste.findIndex((x) => x.id === m.id) + 1
      });
      out.bonus = { xp: bonusLvl(m, 'xp') * BONUS_PAS, lucioles: bonusLvl(m, 'lucioles') * BONUS_PAS }; // ce que le jeu applique
      Object.keys(BONUS_AVANCES).forEach((k) => { out.bonus[k] = bonusLvl(m, k) * BONUS_AVANCES[k]; });
      out.butin.couts = { xp: bonusLvl(m, 'xp') < BONUS_MAX ? bonusCost(bonusLvl(m, 'xp')) : 0, lucioles: bonusLvl(m, 'lucioles') < BONUS_MAX ? bonusCost(bonusLvl(m, 'lucioles')) : 0 };
      Object.keys(BONUS_AVANCES).forEach((k) => { out.butin.couts[k] = bonusLvl(m, k) < BONUS_MAX ? bonusCost2(bonusLvl(m, k)) : 0; });
      out.butin.ouverts = bonusLvl(m, 'xp') >= BONUS_MAX && bonusLvl(m, 'lucioles') >= BONUS_MAX;
      if (m.guerre) { const w = await store.get('guerre:' + m.guerre); if (w) out.guerre = warView(w, m, id, fiches); }
      else out.cibles = liste.filter((c) => c.id !== m.id && c.membres >= GUERRE_MIN && !(c.guerreFin > Date.now()) && !((m.repos[c.id] || 0) + GUERRE_REPOS > Date.now()))
        .map((c) => ({ id: c.id, nom: c.nom, blason: c.blason, membres: c.membres, renommee: c.renommee }));
    }
    return send(res, 200, out);
  }
  if (action === 'fonder' && method === 'POST') {
    const b = await readBody(req, 4096), nom = String(b.nom || '').trim().replace(/\s+/g, ' ').slice(0, 24);
    if (nom.length < 3) return send(res, 400, { erreur: 'Le nom du clan doit faire au moins 3 caractères.' });
    if (await store.get('clan-de:' + id)) return send(res, 400, { erreur: 'Ta grenouille est déjà dans un clan.' });
    const all = await store.hgetall(CLANS);
    if (Object.values(all).some((x) => x.nom.toLowerCase() === nom.toLowerCase())) return send(res, 409, { erreur: 'Un clan porte déjà ce nom.' });
    const m = {
      id: crypto.randomUUID(), nom: nom, blason: parseBlason(b.blason), chef: id, chefNom: me.nom, membres: [id],
      cree: Date.now(), renommee: 0, raid: { rang: 0, pv: alphaHp(0), pvMax: alphaHp(0), vaincus: 0, parts: {} }, contributions: {}, bannis: {}, repos: {}, guerre: null,
      tresor: 0, bonus: { xp: 0, lucioles: 0 }, dons: {}, journal: []
    };
    clanLog(m, { type: 'fonde', nom: me.nom });
    await saveClan(m);
    await store.set('clan-de:' + id, m.id);
    return send(res, 201, { ok: true, id: m.id });
  }
  if (action === 'rejoindre' && method === 'POST') {
    const b = await readBody(req, 4096);
    if (await store.get('clan-de:' + id)) return send(res, 400, { erreur: 'Ta grenouille est déjà dans un clan : quitte-le d’abord.' });
    const m = await loadClan(String(b.clan || '').slice(0, 64));
    if (!m) return send(res, 404, { erreur: 'Ce clan n’existe plus.' });
    const ban = (m.bannis || {})[id];
    if (ban && ban > Date.now()) return send(res, 403, { erreur: 'Ta grenouille a été exclue de ce clan : elle pourra y revenir dans ' + Math.ceil((ban - Date.now()) / 3600e3) + ' h.' });
    if (m.membres.length >= CLAN_MAX) return send(res, 400, { erreur: 'Ce clan est complet (' + CLAN_MAX + ' grenouilles).' });
    m.membres.push(id);
    clanLog(m, { type: 'arrivee', nom: me.nom });
    await saveClan(m);
    await store.set('clan-de:' + id, m.id);
    return send(res, 200, { ok: true });
  }
  if (action === 'quitter' && method === 'POST') {
    const m = await leaveClan(id);
    if (m) { clanLog(m, { type: 'depart', nom: me.nom }); await saveClan(m); }
    return send(res, 200, { ok: true });
  }
  const m = await clanOf(id);
  if (!m) return send(res, 400, { erreur: 'Ta grenouille n’est dans aucun clan.' });
  if (action === 'message' && method === 'POST') { // le chat du clan : les 60 derniers messages, un toutes les 3 secondes au plus
    const b = await readBody(req, 4096), texte = String(b.texte || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200);
    if (!texte) return send(res, 400, { erreur: 'Le message est vide.' });
    m.chatDernier = m.chatDernier || {};
    if (Date.now() - (m.chatDernier[id] || 0) < 3000) return send(res, 429, { erreur: 'Doucement : un message toutes les 3 secondes.' });
    m.chatDernier[id] = Date.now();
    m.chat = (m.chat || []).concat([{ t: Date.now(), id: id, nom: me.nom, texte: texte }]).slice(-60);
    await saveClan(m);
    return send(res, 200, { ok: true, chat: m.chat });
  }
  if (action === 'blason' && method === 'POST') {
    const b = await readBody(req, 4096);
    if (!canManage(m, id)) return send(res, 403, { erreur: 'Seuls le chef et ses bras droits peuvent changer le blason.' });
    m.blason = parseBlason(b.blason);
    await saveClan(m);
    return send(res, 200, { ok: true, blason: m.blason });
  }
  if (action === 'exclure' && method === 'POST') {
    const b = await readBody(req, 4096), target = String(b.membre || '');
    if (!canManage(m, id)) return send(res, 403, { erreur: 'Seuls le chef et ses bras droits peuvent exclure une grenouille.' });
    if (target === id) return send(res, 400, { erreur: 'Pour partir, quitte le clan.' });
    if (m.membres.indexOf(target) < 0) return send(res, 404, { erreur: 'Cette grenouille n’est pas dans ton clan.' });
    if (m.chef !== id && (target === m.chef || (m.roles || {})[target] === 'bras')) return send(res, 403, { erreur: 'Un bras droit ne peut pas exclure le chef ni un autre bras droit.' });
    const left = await leaveClan(target), them = (fiches[target] || {}).nom || '?';
    left.bannis = left.bannis || {};
    Object.keys(left.bannis).forEach((f) => { if (left.bannis[f] < Date.now()) delete left.bannis[f]; }); // les exclusions passées
    left.bannis[target] = Date.now() + EXCLU_JOURS * 86400e3;
    clanLog(left, { type: 'exclusion', nom: me.nom, cible: them });
    await Promise.all([saveClan(left), store.set('clan-exclu:' + target, left.nom)]);
    return send(res, 200, { ok: true });
  }
  if (action === 'role' && method === 'POST') { // le chef donne un rôle, ou passe la main
    const b = await readBody(req, 4096), target = String(b.membre || ''), role = ['bras', 'veteran', 'membre', 'chef'].indexOf(b.role) >= 0 ? b.role : null;
    if (m.chef !== id) return send(res, 403, { erreur: 'Seul le chef du clan donne les rôles.' });
    if (!role) return send(res, 400, { erreur: 'Ce rôle n’existe pas.' });
    if (target === id) return send(res, 400, { erreur: 'Tu es déjà le chef.' });
    if (m.membres.indexOf(target) < 0) return send(res, 404, { erreur: 'Cette grenouille n’est pas dans ton clan.' });
    m.roles = m.roles || {};
    const them = (fiches[target] || {}).nom || '?';
    if (role === 'chef') { // passer la main : l'ancien chef devient bras droit
      m.chef = target; m.chefNom = them; delete m.roles[target]; m.roles[id] = 'bras';
    } else if (role === 'membre') delete m.roles[target];
    else {
      const n = m.membres.filter((f) => f !== target && m.roles[f] === role).length;
      if (n >= ROLES[role].max) return send(res, 400, { erreur: 'Le clan a déjà ' + ROLES[role].max + ' ' + ROLES[role].nom.toLowerCase() + 's.' });
      m.roles[target] = role;
    }
    clanLog(m, { type: 'role', nom: me.nom, cible: them, role: role });
    await saveClan(m);
    return send(res, 200, { ok: true });
  }
  if (action === 'don' && method === 'POST') { // un don au trésor : pris sur les lucioles de la grenouille
    const b = await readBody(req, 4096), montant = Math.floor(+b.montant || 0), frog = await store.get('grenouille:' + id);
    if (!(montant >= 1 && montant <= DON_MAX)) return send(res, 400, { erreur: 'Un don va de 1 à ' + DON_MAX.toLocaleString('fr-FR') + ' lucioles.' });
    if (!frog || !frog.save || (frog.save.gold || 0) < montant) return send(res, 400, { erreur: 'Ta grenouille n’a pas assez de lucioles.' });
    frog.save.gold -= montant; frog.modifie = Date.now();
    m.tresor += montant; m.dons[id] = (m.dons[id] || 0) + montant;
    if (montant >= 1000) clanLog(m, { type: 'don', nom: me.nom, montant: montant });
    await Promise.all([store.set('grenouille:' + id, frog), saveClan(m)]);
    return send(res, 200, { ok: true, tresor: m.tresor, or: frog.save.gold });
  }
  if (action === 'ameliorer' && method === 'POST') { // le chef (ou un bras droit) améliore un bonus avec le trésor
    const b = await readBody(req, 4096), k = ['xp', 'lucioles'].concat(Object.keys(BONUS_AVANCES)).indexOf(b.bonus) >= 0 ? b.bonus : null;
    if (!canManage(m, id)) return send(res, 403, { erreur: 'Seuls le chef et ses bras droits peuvent dépenser le trésor.' });
    if (!k) return send(res, 400, { erreur: 'Ce bonus n’existe pas.' });
    const avance = !!BONUS_AVANCES[k];
    if (avance && !(bonusLvl(m, 'xp') >= BONUS_MAX && bonusLvl(m, 'lucioles') >= BONUS_MAX)) return send(res, 400, { erreur: 'Ce bonus s’ouvre une fois l’XP et les lucioles au plus haut.' });
    if (bonusLvl(m, k) >= BONUS_MAX) return send(res, 400, { erreur: 'Ce bonus est déjà au plus haut.' });
    const cost = avance ? bonusCost2(bonusLvl(m, k)) : bonusCost(bonusLvl(m, k));
    if (m.tresor < cost) return send(res, 400, { erreur: 'Il manque ' + (cost - m.tresor).toLocaleString('fr-FR') + ' lucioles au trésor.' });
    m.tresor -= cost; m.bonus[k] = bonusLvl(m, k) + 1;
    clanLog(m, { type: 'bonus', nom: me.nom, bonus: k, niveau: m.bonus[k] });
    await saveClan(m);
    return send(res, 200, { ok: true, tresor: m.tresor, bonus: m.bonus });
  }
  if (action === 'raid' && method === 'POST') {
    const b = await readBody(req, 4096), day = await clanDay(id);
    if (day.raids >= RAIDS_PAR_JOUR) return send(res, 429, { erreur: 'Plus d’attaque contre l’Alpha aujourd’hui : reviens demain !' });
    const frog = await store.get('grenouille:' + id), lvl = num((frog && frog.save && frog.save.level) || 1, 999);
    const deg = clamp(Math.round(+b.degats || 0), 0, RAID_TOURS * (60 + 30 * lvl) * 3); // au-delà, ce n'est pas un vrai combat
    const r = m.raid;
    day.raids++;
    r.pv -= deg;
    r.parts[id] = (r.parts[id] || 0) + deg;
    m.contributions = m.contributions || {};
    m.contributions[id] = (m.contributions[id] || 0) + deg;
    clanLog(m, { type: 'raid', nom: me.nom, deg: deg });
    let vaincu = null;
    if (r.pv <= 0) { // l'Alpha tombe : une part pour chaque grenouille du clan qui l'a attaqué, et un Alpha plus fort arrive
      vaincu = r.rang;
      const gift = { id: 'alpha-' + m.id.slice(0, 8) + '-' + r.rang, source: 'clan', clan: m.nom, rang: r.rang, lucioles: 300 + 200 * r.rang, xpNiveau: 0.3 };
      const share = m.membres.filter((f) => r.parts[f] > 0);
      await Promise.all(share.map((f) => addGift(f, gift)));
      m.renommee += 25 + 15 * r.rang;
      m.tresor += alphaLoot(r.rang);
      clanLog(m, { type: 'alpha', rang: r.rang, nom: me.nom, parts: share.length, butin: alphaLoot(r.rang) });
      r.rang++; r.vaincus++; r.pv = alphaHp(r.rang); r.pvMax = alphaHp(r.rang); r.parts = {};
    }
    await Promise.all([saveClan(m), store.set('clan-jour:' + id, day)]);
    // la récompense de l'assaut lui-même (le jeu l'applique) : des lucioles et une part de niveau, selon les dégâts
    const recompense = { lucioles: Math.round(150 + 50 * r.rang + Math.min(800 + 200 * r.rang, deg / 150)), xpNiveau: Math.round((0.05 + Math.min(0.1, deg / Math.max(1, r.pvMax) * 2)) * 1000) / 1000 };
    return send(res, 200, { degats: deg, pv: r.pv, pvMax: r.pvMax, rang: r.rang, vaincu: vaincu, restants: RAIDS_PAR_JOUR - day.raids, recompense: recompense });
  }
  if (action === 'guerre' && method === 'POST') { // le chef déclare la guerre à un autre clan
    const b = await readBody(req, 4096);
    if (!canManage(m, id)) return send(res, 403, { erreur: 'Seuls le chef et ses bras droits peuvent déclarer une guerre.' });
    if (m.guerre) { const cur = await settleWar(await store.get('guerre:' + m.guerre)); if (cur && !cur.finie) return send(res, 400, { erreur: 'Ton clan est déjà en guerre.' }); m.guerre = null; }
    if (m.membres.length < GUERRE_MIN) return send(res, 400, { erreur: 'Il faut au moins ' + GUERRE_MIN + ' grenouilles dans le clan pour partir en guerre.' });
    const o = await loadClan(String(b.cible || '').slice(0, 64));
    if (!o || o.id === m.id) return send(res, 404, { erreur: 'Ce clan n’existe plus.' });
    if (o.membres.length < GUERRE_MIN) return send(res, 400, { erreur: 'Ce clan n’a pas encore ' + GUERRE_MIN + ' grenouilles : pas de guerre contre lui.' });
    if (o.guerre) { const cur = await settleWar(await store.get('guerre:' + o.guerre)); if (cur && !cur.finie) return send(res, 400, { erreur: 'Ce clan est déjà en guerre.' }); o.guerre = null; }
    if ((m.repos[o.id] || 0) + GUERRE_REPOS > Date.now()) return send(res, 400, { erreur: 'Vos deux clans se sont fait la guerre il y a peu : attendez encore un peu.' });
    const now = Date.now(), side = (c) => ({ id: c.id, nom: c.nom, blason: c.blason, membres: c.membres.slice() });
    const w = { id: crypto.randomUUID(), a: side(m), b: side(o), debut: now, fin: now + GUERRE_DUREE, scores: {}, attaques: {}, battus: {}, offres: {}, journal: [], finie: false };
    w.journal.unshift({ t: now, type: 'declaration', nom: me.nom, clan: m.nom });
    m.guerre = o.guerre = w.id; m.guerreFin = o.guerreFin = w.fin;
    clanLog(m, { type: 'guerre', nom: me.nom, contre: o.nom, declaree: true });
    clanLog(o, { type: 'guerre', nom: me.nom, contre: m.nom, declaree: false });
    await Promise.all([store.set('guerre:' + w.id, w), saveClan(m), saveClan(o)]);
    return send(res, 201, { ok: true, id: w.id });
  }
  if ((action === 'defi' || action === 'combat') && method === 'POST') { // un combat de la guerre : l'adversaire, puis le résultat
    const b = await readBody(req, 4096), w = m.guerre ? await settleWar(await store.get('guerre:' + m.guerre)) : null;
    if (!w || w.finie) return send(res, 400, { erreur: 'Ton clan n’est pas en guerre.' });
    const us = w.a.id === m.id ? 'a' : 'b', them = us === 'a' ? 'b' : 'a', target = String(b.adversaire || '');
    if (w[us].membres.indexOf(id) < 0) return send(res, 403, { erreur: 'Ta grenouille est arrivée après la déclaration : elle ne combat pas dans cette guerre.' });
    if ((w.attaques[id] || 0) >= GUERRE_ATTAQUES) return send(res, 429, { erreur: 'Tu as déjà livré tes ' + GUERRE_ATTAQUES + ' combats de cette guerre.' });
    if (w[them].membres.indexOf(target) < 0 || !fiches[target]) return send(res, 404, { erreur: 'Cette grenouille ne combat pas dans cette guerre.' });
    if (action === 'defi') {
      const frog = await store.get('grenouille:' + target);
      if (!frog) return send(res, 404, { erreur: 'Cette grenouille a disparu.' });
      w.offres[id] = target;
      await store.set('guerre:' + w.id, w);
      return send(res, 200, { adversaire: Object.assign(combatCard(frog, fiches[target], 0), { clan: w[them].nom, blason: w[them].blason }) });
    }
    if (w.offres[id] !== target) return send(res, 400, { erreur: 'Ce combat n’est plus proposé.' });
    delete w.offres[id];
    w.attaques[id] = (w.attaques[id] || 0) + 1;
    const win = !!b.victoire, first = !w.battus[target];
    // une première victoire sur une grenouille vaut 3 points si elle est au moins de ton niveau, 2 sinon ; les suivantes, 1
    const pts = !win ? 0 : (!first ? 1 : ((fiches[target].niveau || 1) >= (me.niveau || 1) ? 3 : 2));
    if (win) { w.battus[target] = (w.battus[target] || 0) + 1; w.scores[m.id] = (w.scores[m.id] || 0) + pts; }
    w.journal.unshift({ t: Date.now(), type: 'combat', nom: me.nom, clan: m.nom, adverse: fiches[target].nom, victoire: win, pts: pts });
    w.journal = w.journal.slice(0, 40);
    await store.set('guerre:' + w.id, w);
    return send(res, 200, { gain: pts, restants: GUERRE_ATTAQUES - w.attaques[id], nous: w.scores[m.id] || 0, eux: w.scores[w[them].id] || 0 });
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
    await seasonGifts();
    const [fiches, reps, clans] = await Promise.all([store.hgetall(RANK), store.hgetall(REP), store.hgetall(CLANS)]);
    const all = Object.values(fiches), mine = me ? me.compte.grenouilles : [];
    all.forEach((e) => { e.moi = mine.indexOf(e.id) >= 0; e.rep = +reps[e.id] || 0; });
    const clanList = Object.values(clans).sort((a, b) => b.renommee - a.renommee || b.rang - a.rang).slice(0, 100);
    return send(res, 200, { grenouilles: all, clans: clanList, joueurs: new Set(all.map((e) => e.pseudo)).size, duels: { prochain: nextMonday(new Date()), recompenses: CADEAUX }, saison: { id: seasonOf(new Date()), fin: nextSeason(new Date()), recompenses: SAISON_CADEAUX } });
  }

  // tout le reste demande d'être connecté
  if (p === '/api/admin/journaux' && method === 'GET') {
    const secret = process.env.KAWAZU_ADMIN || '', given = String(req.headers['x-kawazu-admin'] || '');
    const ok = secret.length >= 16 && given.length === secret.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret));
    if (!ok) return send(res, 404, { erreur: 'Route inconnue.' });
    const q = new URL(req.url, 'http://x').searchParams, n = num(+q.get('n') || 500, JOURNAL_MAX), only = q.get('id');
    const fiches = await store.hgetall(RANK), ids = Object.keys(fiches).filter((k) => !only || k === only);
    const out = [];
    for (const k of ids) out.push({ id: k, nom: fiches[k].nom, pseudo: fiches[k].pseudo, niveau: fiches[k].niveau, evenements: await journalRead(k, n) });
    return send(res, 200, { genere: Date.now(), grenouilles: out });
  }
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
  const cl = /^\/api\/clans\/([0-9a-f-]{36})(?:\/(fonder|rejoindre|quitter|exclure|role|blason|don|ameliorer|raid|guerre|defi|combat|message))?$/.exec(p);
  if (cl) {
    if (account.grenouilles.indexOf(cl[1]) < 0) return send(res, 404, { erreur: 'Grenouille introuvable.' });
    return method === 'GET' ? clanRoute(req, res, account, cl[1], cl[2], method) : withLock(CLAN_LOCK, () => clanRoute(req, res, account, cl[1], cl[2], method));
  }
  const ti = /^\/api\/titan\/([0-9a-f-]{36})(?:\/(attaque))?$/.exec(p);
  if (ti) {
    if (account.grenouilles.indexOf(ti[1]) < 0) return send(res, 404, { erreur: 'Grenouille introuvable.' });
    return titanRoute(req, res, account, ti[1], ti[2], method);
  }
  const m = /^\/api\/grenouilles\/([0-9a-f-]{36})(\/sauver|\/journal)?$/.exec(p);
  if (m) {
    const id = m[1], frog = account.grenouilles.indexOf(id) >= 0 ? await store.get('grenouille:' + id) : null;
    if (!frog) return send(res, 404, { erreur: 'Grenouille introuvable.' });
    if (method === 'GET' && !m[2]) { await publish(frog, account.pseudo); return send(res, 200, frog); } // la partie reprend : la fiche est à jour
    if (m[2] === '/journal') {
      if (method === 'GET') return send(res, 200, { id: id, nom: frog.nom, evenements: await journalRead(id, JOURNAL_MAX) });
      if (method !== 'POST') return send(res, 404, { erreur: 'Route inconnue.' });
      const b = await readBody(req, 256 * 1024), list = b && Array.isArray(b.evenements) ? b.evenements : null;
      if (!list || list.length > JOURNAL_LOT) return send(res, 400, { erreur: 'Journal invalide.' });
      const now = Date.now(), ok = list.filter((e) => e && typeof e === 'object' && !Array.isArray(e) && typeof e.k === 'string' && JSON.stringify(e).length <= JOURNAL_EVENT)
        .map((e) => Object.assign({}, e, { k: e.k.slice(0, 24), t: num(e.t, now + 60000) || now, arrive: now }));
      await journalPush(id, ok); // (envoyés du plus ancien au plus récent : la liste garde le plus récent en tête)
      return send(res, 200, { ok: true, gardes: ok.length });
    }
    if ((method === 'PUT' && !m[2]) || (method === 'POST' && m[2] === '/sauver')) {
      const b = await readBody(req, 256 * 1024);
      if (!b || typeof b.save !== 'object' || !b.save || Array.isArray(b.save)) return send(res, 400, { erreur: 'Sauvegarde invalide.' });
      const before = JSON.parse(JSON.stringify(frog));
      frog.save = b.save;
      frog.modifie = Date.now();
      if (b.save.hero && typeof b.save.hero.name === 'string') frog.nom = b.save.hero.name.slice(0, 16);
      await store.set('grenouille:' + id, frog);
      await publish(frog, account.pseudo, before);
      try { await journalSnapshot(id, before.save, frog.save); } catch (e) { console.error('journal :', e.message); } // (le journal ne bloque jamais une sauvegarde)
      return send(res, 200, { ok: true, modifie: frog.modifie });
    }
    if (method === 'DELETE' && !m[2]) {
      account.grenouilles = account.grenouilles.filter((g) => g !== id);
      await saveAccount(account);
      await store.del('grenouille:' + id);
      await withLock(CLAN_LOCK, () => leaveClan(id)); // elle quitte son clan
      await Promise.all([store.hdel(RANK, id), store.hdel(REP, id), store.del('dojo:' + id), store.del('cadeaux:' + id), store.del('clan-jour:' + id), store.del('clan-exclu:' + id), store.del('titan-jour:' + id), store.del(titanDayKey(id)), store.del('journal:' + id)]);
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
