// Vercel : toutes les adresses /api/... arrivent ici (voir vercel.json) et passent à l'API du jeu (server/api.js).
'use strict';
const { handle } = require('../server/api');

module.exports = (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let p = url.pathname;
  const route = url.searchParams.get('route'); // posé par la réécriture de vercel.json
  if (!p.startsWith('/api/') && route) p = '/api/' + route;
  return handle(req, res, p);
};
