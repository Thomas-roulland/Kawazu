// Les grenouilles mises de côté pour triche (voir server/arbitre.js et l'en-tête de server/api.js).
//   KAWAZU_ADMIN=… node outils/triche.js https://kawazu-psi.vercel.app                 la liste, avec leurs raisons
//   KAWAZU_ADMIN=… node outils/triche.js https://kawazu-psi.vercel.app effacer <id>    la grenouille revient (une partie
//                                                                                      importée, un faux signal…)
// (KAWAZU_ADMIN : le même secret que la variable d'environnement du serveur, 16 caractères au moins)
const [site, action, id] = process.argv.slice(2), secret = process.env.KAWAZU_ADMIN || '';
if (!site || secret.length < 16) { console.log('usage : KAWAZU_ADMIN=… node outils/triche.js <https://site> [effacer <id>]'); process.exit(1); }
const day = (t) => new Date(t).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
(async () => {
  const url = site.replace(/\/$/, '') + '/api/admin/triche', headers = { 'x-kawazu-admin': secret, 'Content-Type': 'application/json' };
  if (action === 'effacer') {
    const r = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify({ id: id }) });
    console.log(r.ok ? 'Signalement effacé : la grenouille revient dans le classement.' : 'Refusé (' + r.status + ') : ' + (await r.text()));
    return;
  }
  const r = await fetch(url, { headers: headers });
  if (!r.ok) { console.log('Refusé (' + r.status + ') : le secret est-il le bon ?'); return; }
  const d = await r.json();
  console.log(d.mises.length + ' grenouille(s) mise(s) de côté (seuil : ' + d.seuil + ' points sur ' + d.jours + ' jours).');
  d.mises.forEach((m) => {
    console.log('\n' + m.nom + ' — ' + m.id + ' — ' + m.points + ' points, depuis le ' + day(m.depuis));
    m.journal.slice(0, 12).forEach((e) => console.log('   ' + day(e.t) + '  +' + e.p + '  ' + e.r));
  });
})();
