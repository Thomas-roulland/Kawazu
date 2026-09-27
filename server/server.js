// Serveur local du jeu Kawazu : sert les pages et l'API des comptes (server/api.js).
// Node pur, aucune dépendance. Lancer depuis le dossier du jeu :  node server/server.js
// (port 8765 par défaut, ou la variable d'environnement PORT). Les données vivent dans server/data/kv/,
// ou dans Upstash Redis si ses variables sont définies (voir server/api.js). En ligne, c'est Vercel qui sert
// les pages et appelle la même API (api/index.js).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { handle, store } = require('./api');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(__dirname, 'data');
const PORT = +process.env.PORT || 8765;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml'
};

// Ancien format (comptes.json, sessions.json, grenouilles/*.json) : on le verse une fois dans le magasin
async function migrateOldData() {
  const old = path.join(DATA, 'comptes.json');
  if (!store || !fs.existsSync(old)) return;
  const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch (e) { return null; } };
  const comptes = read('comptes.json') || {}, sessions = read('sessions.json') || {};
  for (const c of Object.values(comptes)) {
    await store.set('compte:' + c.id, c);
    await store.setNew('pseudo:' + c.pseudo.toLowerCase(), c.id);
    for (const id of c.grenouilles) { const f = read(path.join('grenouilles', id + '.json')); if (f) await store.set('grenouille:' + id, f); }
  }
  for (const [token, s] of Object.entries(sessions)) {
    const left = Math.round((s.expire - Date.now()) / 1000);
    if (left > 0) await store.set('session:' + token, { compte: s.compte }, left);
  }
  fs.renameSync(old, old + '.migre'); // gardé en sauvegarde, et on ne recommence pas
  console.log('Anciennes données reprises : ' + Object.keys(comptes).length + ' compte(s).');
}

// ---------- Fichiers du jeu ----------
function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  if (rel === '/jeu') rel = '/jeu.html';
  const file = path.join(ROOT, rel);
  // jamais en dehors du dossier du jeu, jamais les données du serveur
  if (!file.startsWith(ROOT + path.sep) || file.startsWith(DATA + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Introuvable'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

migrateOldData().then(() => {
  http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) handle(req, res, url.pathname);
    else serveStatic(req, res, url);
  }).listen(PORT, () => console.log('Kawazu : http://localhost:' + PORT));
});
