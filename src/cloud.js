// Liaison avec le serveur du jeu (server/server.js) : charge la grenouille choisie sur la page d'accueil
// (jeu.html?grenouille=<id>) et renvoie la partie au serveur après chaque changement.
// Sans grenouille dans l'adresse (fichier ouvert en double-clic, ou partie hors ligne), le jeu reste
// entièrement local : Cloud.id vaut null et la sauvegarde ne quitte pas le navigateur.
// Un mot dans la console du navigateur : quelqu'un qui demande d'y coller un code veut prendre la partie de celui qui le fait
if (typeof console !== 'undefined' && console.log) {
  console.log('%cStop !', 'color:#e0402a;font-size:32px;font-weight:bold');
  console.log('%cNe colle ici aucun code qu’on t’a donné (« pour avoir des lucioles », « pour débloquer un skin »…) : c’est une arnaque, qui agit sur ta partie et ton compte à ta place. Et une partie trafiquée est corrigée par le serveur, puis mise de côté.', 'font-size:14px');
}
var Cloud = (function () {
  var param = new URLSearchParams(location.search).get('grenouille') || '';
  var id = /^[0-9a-f-]{36}$/.test(param) ? param : null;
  var url = id ? '/api/grenouilles/' + id : null;
  var pending = null, timer = 0, reloading = false;

  // La grenouille et sa partie ({ nom, peau, save }), ou une erreur (pas connecté, grenouille inconnue…)
  function load() {
    return fetch(url, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error(r.status === 401 ? 'connexion' : 'introuvable');
      return r.json();
    });
  }
  function flush() {
    clearTimeout(timer);
    if (!pending) return Promise.resolve();
    var body = JSON.stringify({ save: pending });
    pending = null;
    return fetch(url, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: body })
      .then(function (r) {
        // le serveur a corrigé une sauvegarde impossible (server/arbitre.js) : on reprend la sienne
        return r.json().then(function (d) { if (d && d.corrige && !reloading) { reloading = true; console.warn('Kawazu : sauvegarde corrigée par le serveur', d.corrige); setTimeout(function () { location.reload(); }, 1200); } }, function () {});
      }, function () { pending = pending || JSON.parse(body).save; timer = setTimeout(flush, 10000); }); // réseau coupé : on réessaie
  }
  // Les changements s'enchaînent vite (combat, boutique…) : on attend un court instant avant d'envoyer
  function push(save) {
    if (!id) return;
    pending = save;
    clearTimeout(timer);
    timer = setTimeout(flush, 1500);
  }
  // Page fermée avant l'envoi : dernier envoi par « balise », qui survit à la fermeture
  window.addEventListener('pagehide', function () {
    if (id && pending && navigator.sendBeacon) {
      navigator.sendBeacon(url + '/sauver', new Blob([JSON.stringify({ save: pending })], { type: 'application/json' }));
      pending = null;
    }
  });
  return { id: id, load: load, push: push, flush: flush };
})();
