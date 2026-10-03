// Le journal de la grenouille : chaque combat (l'adversaire, les tours, le plus gros coup, ses dégâts), chaque gain d'XP
// et d'où il vient, la forge, le recyclage, les achats, les mutations, les cycles… De quoi analyser l'équilibre du jeu
// et repérer ce qui est abusé (voir outils/journal-analyse.js).
// Avec un compte, les événements partent au serveur par paquets (POST /api/grenouilles/:id/journal) ; ils sont aussi
// gardés dans le navigateur (les JOURNAL_LOCAL derniers), et la fenêtre Sauvegarde permet d'exporter le tout.
var Journal = (function () {
  var JOURNAL_LOCAL = 2000, LOT = 100, queue = [], timer = 0, sending = false;
  function key() { return 'kawazu.journal.' + ((window.Cloud && Cloud.id) || 'local'); }
  function local() { try { return JSON.parse(localStorage.getItem(key()) || '[]'); } catch (e) { return []; } }
  function keep(e) {
    try { var l = local(); l.push(e); localStorage.setItem(key(), JSON.stringify(l.slice(-JOURNAL_LOCAL))); } catch (er) { /* navigateur plein ou privé : tant pis */ }
  }
  // un événement : son type (k), l'heure, le niveau de la grenouille, et ce qu'on veut en garder
  function add(k, data) {
    var e = Object.assign({ t: Date.now(), k: k, niv: typeof playerLevel === 'number' ? playerLevel : undefined }, data || {});
    keep(e);
    if (!(window.Cloud && Cloud.id)) return;
    queue.push(e);
    if (queue.length > 1000) queue.splice(0, queue.length - 1000);
    clearTimeout(timer);
    timer = setTimeout(flush, queue.length >= 40 ? 500 : 15000);
  }
  function flush() {
    clearTimeout(timer);
    if (sending || !queue.length || !(window.Cloud && Cloud.id)) return Promise.resolve();
    var batch = queue.splice(0, LOT);
    sending = true;
    return fetch('/api/grenouilles/' + Cloud.id + '/journal', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evenements: batch }) })
      .then(function (r) { if (!r.ok && r.status >= 500) throw new Error(); }, function () { throw new Error(); })
      .then(function () { sending = false; if (queue.length) timer = setTimeout(flush, 1000); },
        function () { sending = false; queue = batch.concat(queue); timer = setTimeout(flush, 30000); }); // réseau coupé : on réessaie
  }
  window.addEventListener('pagehide', function () {
    if (!queue.length || !(window.Cloud && Cloud.id) || !navigator.sendBeacon) return;
    navigator.sendBeacon('/api/grenouilles/' + Cloud.id + '/journal', new Blob([JSON.stringify({ evenements: queue.splice(0, LOT) })], { type: 'application/json' }));
  });
  // tout le journal (celui du serveur avec un compte, sinon celui du navigateur), à télécharger
  function exportFile(name) {
    var done = function (list) {
      var blob = new Blob([JSON.stringify({ grenouille: name, exporte: Date.now(), evenements: list }, null, 1)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kawazu-journal-' + String(name || 'grenouille').replace(/[^\w-]+/g, '_') + '.json';
      document.body.appendChild(a); a.click(); a.remove();
    };
    if (window.Cloud && Cloud.id) return flush().then(function () { return fetch('/api/grenouilles/' + Cloud.id + '/journal', { credentials: 'same-origin' }); })
      .then(function (r) { return r.json(); }).then(function (d) { done(d.evenements || []); }, function () { done(local().reverse()); });
    done(local().reverse());
    return Promise.resolve();
  }
  return { add: add, flush: flush, local: local, exportFile: exportFile };
})();
// pour les fichiers chargés sans le journal (simulateur) : un journal muet
function journal(k, data) { if (typeof Journal !== 'undefined') Journal.add(k, data); }
