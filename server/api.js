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
//
// Les données passent par un petit magasin clé -> valeur :
//   - en ligne : Upstash Redis, par son API REST (variables KV_REST_API_URL et KV_REST_API_TOKEN, posées par
//     l'intégration Upstash de Vercel, ou UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN) ;
//   - sinon, en local : des fichiers JSON dans server/data/kv/.
// Clés : compte:<id>, pseudo:<pseudo en minuscules> -> id, session:<jeton> (expire toute seule), grenouille:<id>,
// essais:<adresse> (compteur des tentatives de connexion).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_FROGS = 5;
const SESSION_DAYS = 30;
const SKINS = ['marais', 'lagune', 'venin', 'soleil', 'orchidee', 'cendre'];
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
    incr: async (k, ttl) => { const n = await cmd(['INCR', k]); if (n === 1) await cmd(['EXPIRE', k, String(ttl)]); return n; }
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
    incr: async (k, ttl) => { const e = read(k), n = (e ? e.v : 0) + 1; write(k, n, e ? e.expire : Date.now() + ttl * 1000); return n; }
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
  return { id: id, nom: f.nom, peau: f.peau, niveau: s.level || 1, voie: s.voie || null, monde: monde, etape: progress[monde] || 0, modifie: f.modifie };
}
const summaries = async (account) => (await Promise.all(account.grenouilles.map(summary))).filter(Boolean);

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
    await store.set('grenouille:' + id, { id: id, compte: account.id, nom: nom, peau: peau, cree: Date.now(), modifie: Date.now(), save: null });
    account.grenouilles.push(id);
    await saveAccount(account);
    return send(res, 201, await summary(id));
  }
  const m = /^\/api\/grenouilles\/([0-9a-f-]{36})(\/sauver)?$/.exec(p);
  if (m) {
    const id = m[1], frog = account.grenouilles.indexOf(id) >= 0 ? await store.get('grenouille:' + id) : null;
    if (!frog) return send(res, 404, { erreur: 'Grenouille introuvable.' });
    if (method === 'GET' && !m[2]) return send(res, 200, frog);
    if ((method === 'PUT' && !m[2]) || (method === 'POST' && m[2])) {
      const b = await readBody(req, 256 * 1024);
      if (!b || typeof b.save !== 'object' || !b.save || Array.isArray(b.save)) return send(res, 400, { erreur: 'Sauvegarde invalide.' });
      frog.save = b.save;
      frog.modifie = Date.now();
      if (b.save.hero && typeof b.save.hero.name === 'string') frog.nom = b.save.hero.name.slice(0, 16);
      await store.set('grenouille:' + id, frog);
      return send(res, 200, { ok: true, modifie: frog.modifie });
    }
    if (method === 'DELETE' && !m[2]) {
      account.grenouilles = account.grenouilles.filter((g) => g !== id);
      await saveAccount(account);
      await store.del('grenouille:' + id);
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
