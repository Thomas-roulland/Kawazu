// Analyse des journaux des grenouilles (voir src/journal.js et le journal du serveur).
//   node outils/journal-analyse.js kawazu-journal-Kaisho.json      un journal exporté depuis le jeu (fenêtre Sauvegarde)
//   KAWAZU_ADMIN=… node outils/journal-analyse.js https://kawazu-psi.vercel.app [id]   tous les journaux du serveur
// Pour chaque grenouille : le rythme des niveaux, l'XP par source, les combats (gagnés en un tour, écarts de niveau,
// plus gros coups), la forge, et les signaux à regarder de près (sauts de niveau ou de lucioles, coups démesurés).
const fs = require('fs');
const arg = process.argv[2];
if (!arg) { console.log('usage : node outils/journal-analyse.js <journal.json | https://site [id]>'); process.exit(1); }

const fmt = (n) => Math.round(n).toLocaleString('fr-FR'), pc = (x) => (Math.round(x * 100) + ' %').padStart(6), day = (t) => new Date(t).toISOString().slice(0, 10);
const median = (a) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

function analyse(name, evs) {
  evs = evs.filter((e) => e && e.t).sort((a, b) => a.t - b.t);
  console.log('\n══════ ' + name + ' — ' + evs.length + ' événements' + (evs.length ? ', du ' + day(evs[0].t) + ' au ' + day(evs[evs.length - 1].t) : '') + ' ══════');
  if (!evs.length) return;
  const xp = evs.filter((e) => e.k === 'xp'), fights = evs.filter((e) => e.k === 'combat'), snaps = evs.filter((e) => e.k === 'sauvegarde');
  // ---- le rythme ----
  const lv = evs.map((e) => e.apres || e.niv).filter(Boolean), days = Math.max(1 / 24, (evs[evs.length - 1].t - evs[0].t) / 86400e3);
  if (lv.length) console.log('Niveau : ' + lv[0] + ' → ' + lv[lv.length - 1] + ' (' + (lv[lv.length - 1] - lv[0]) + ' niveaux en ' + days.toFixed(1) + ' j, ' + ((lv[lv.length - 1] - lv[0]) / days).toFixed(1) + ' par jour)');
  // ---- l'XP, par source (en « niveaux » : l'XP rapportée à ce qu'il fallait pour passer le niveau) ----
  const bySrc = {};
  xp.forEach((e) => { const s = bySrc[e.src] = bySrc[e.src] || { n: 0, xp: 0, niv: 0, max: 0 }; s.n++; s.xp += e.xp; const r = e.besoin ? e.xp / e.besoin : 0; s.niv += r; s.max = Math.max(s.max, r); });
  const totN = Object.values(bySrc).reduce((a, s) => a + s.niv, 0);
  if (xp.length) {
    console.log('\nXP par source                 fois       XP         en niveaux   part   plus gros gain');
    Object.keys(bySrc).sort((a, b) => bySrc[b].niv - bySrc[a].niv).forEach((k) => { const s = bySrc[k]; console.log('  ' + k.padEnd(26) + String(s.n).padStart(5) + fmt(s.xp).padStart(14) + s.niv.toFixed(1).padStart(12) + pc(s.niv / (totN || 1)) + s.max.toFixed(2).padStart(10) + ' niv'); });
  }
  // ---- les combats ----
  if (fights.length) {
    console.log('\nCombats par type      nb   gagnés  tours moy.  en 1 tour  écart de niveau  coup max / PV ennemi');
    const byType = {};
    fights.forEach((e) => { (byType[e.type] = byType[e.type] || []).push(e); });
    Object.keys(byType).forEach((k) => {
      const l = byType[k], w = l.filter((e) => e.issue === 'victoire'), one = w.filter((e) => e.tours <= 1);
      const gap = median(l.map((e) => (e.heros && e.ennemi ? e.heros.niv - e.ennemi.niv : 0))), ratio = median(l.map((e) => (e.ennemi && e.ennemi.pv ? e.max / e.ennemi.pv : 0)));
      console.log('  ' + k.padEnd(16) + String(l.length).padStart(6) + pc(w.length / l.length) + (w.length ? (w.reduce((a, e) => a + e.tours, 0) / w.length).toFixed(1) : '-').padStart(11) + pc(w.length ? one.length / w.length : 0).padStart(11) + ((gap >= 0 ? '+' : '') + gap + ' niv').padStart(17) + (Math.round(ratio * 100) + ' %').padStart(20));
    });
    // les combats de la carte, terre par terre : combien sont gagnés d'un seul tour
    const stage = fights.filter((e) => e.type === 'stage' && e.terre != null), byLand = {};
    stage.forEach((e) => { (byLand[e.terre] = byLand[e.terre] || []).push(e); });
    if (stage.length) {
      console.log('\nCarte, terre par terre   combats   gagnés en 1 tour   écart de niveau   dégâts de base de la grenouille');
      Object.keys(byLand).sort((a, b) => a - b).forEach((t) => { const l = byLand[t], one = l.filter((e) => e.issue === 'victoire' && e.tours <= 1); console.log('  terre ' + String(+t + 1).padEnd(17) + String(l.length).padStart(7) + pc(one.length / l.length).padStart(16) + ('+' + median(l.map((e) => e.heros.niv - e.ennemi.niv))).padStart(15) + fmt(median(l.map((e) => e.heros.deg))).padStart(22)); });
    }
  }
  // ---- la forge ----
  const fo = evs.filter((e) => e.k === 'forge');
  if (fo.length) {
    const ok = fo.filter((e) => e.reussi), top = {};
    fo.forEach((e) => { const k = e.objet + ' (' + e.rar + ', rang ' + e.rang + ')'; top[k] = Math.max(top[k] || 0, e.apres); });
    console.log('\nForge : ' + fo.length + ' essais, ' + ok.length + ' réussis ; ' + fmt(fo.reduce((a, e) => a + (e.eclats || 0), 0)) + ' éclats et ' + fmt(fo.reduce((a, e) => a + (e.lucioles || 0), 0)) + ' lucioles dépensés');
    Object.keys(top).sort((a, b) => top[b] - top[a]).slice(0, 8).forEach((k) => console.log('  +' + top[k] + '  ' + k));
  }
  // ---- l'équipement porté (le dernier instantané du serveur) ----
  const last = snaps[snaps.length - 1];
  if (last) {
    console.log('\nDernier instantané (' + new Date(last.t).toLocaleString('fr-FR') + ') : niveau ' + last.niv + ', tour ' + last.tour + ', ' + last.conquis + ' étapes, cycle ' + last.cycle + ', ' + last.mut + ' mutation(s), maîtrises ' + JSON.stringify(last.maitrises));
    Object.keys(last.equipement || {}).forEach((s) => { const g = last.equipement[s]; console.log('  ' + s.padEnd(9) + (g && typeof g === 'object' ? g.base + ' · ' + g.rar + (g.forge ? ' +' + g.forge : '') + ' · ' + JSON.stringify(g.stats) : String(g))); });
  }
  // ---- les signaux à regarder ----
  const flags = [];
  snaps.filter((e) => e.saut).forEach((e) => flags.push(day(e.t) + ' sauvegarde : ' + e.saut.join(', ')));
  xp.filter((e) => e.besoin && e.xp / e.besoin >= 2).forEach((e) => flags.push(day(e.t) + ' XP « ' + e.src + ' » : ' + (e.xp / e.besoin).toFixed(1) + ' niveaux d’un coup'));
  fights.filter((e) => e.ennemi && e.ennemi.pv && e.max >= 3 * e.ennemi.pv).forEach((e) => flags.push(day(e.t) + ' ' + e.type + ' : un coup de ' + fmt(e.max) + ' sur ' + fmt(e.ennemi.pv) + ' PV (' + (e.max / e.ennemi.pv).toFixed(1) + '×)'));
  console.log('\nSignaux : ' + (flags.length ? flags.length : 'aucun'));
  flags.slice(0, 25).forEach((f) => console.log('  ⚠ ' + f));
  if (flags.length > 25) console.log('  … et ' + (flags.length - 25) + ' de plus');
}

(async () => {
  let data;
  if (/^https?:\/\//.test(arg)) {
    if (!process.env.KAWAZU_ADMIN) { console.log('Il faut la variable KAWAZU_ADMIN (la même que sur Vercel).'); process.exit(1); }
    const r = await fetch(arg.replace(/\/$/, '') + '/api/admin/journaux?n=5000' + (process.argv[3] ? '&id=' + process.argv[3] : ''), { headers: { 'x-kawazu-admin': process.env.KAWAZU_ADMIN } });
    if (!r.ok) { console.log('Le serveur refuse (' + r.status + ') : KAWAZU_ADMIN est-il défini sur Vercel ?'); process.exit(1); }
    data = await r.json();
  } else data = JSON.parse(fs.readFileSync(arg, 'utf8'));
  if (Array.isArray(data.grenouilles)) data.grenouilles.forEach((g) => analyse(g.nom + ' (' + g.pseudo + ', niv. ' + g.niveau + ')', g.evenements || []));
  else analyse(data.grenouille || data.nom || 'grenouille', data.evenements || []);
})();
