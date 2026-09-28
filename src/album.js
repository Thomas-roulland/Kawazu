// L'Album du marais : le bestiaire (chaque monstre dans ses trois raretés, les boss des biomes, les Grands Sages
// de la tour) et tous les modèles d'objets. Une case se remplit à la première victoire (monstres) ou au premier
// exemplaire trouvé (objets) ; des paliers de découvertes donnent des récompenses à réclamer.
// Pensé pour grandir : chaque nouveau monstre ou objet ajouté au jeu y apparaît tout seul.
var ALBUM_MONSTERS = (function () {
  var list = [], suffix = { commun: '', rare: ' rare', epique: ' épique' };
  BIOMES.forEach(function (b, w) {
    b.monsters.forEach(function (v, i) {
      RARITY_IDS.forEach(function (rar) {
        list.push({ id: 'm-' + w + '-' + i + (rar === 'rare' ? '-r' : (rar === 'epique' ? '-e' : '')), kind: 'monstre', biome: w, name: v.name + suffix[rar], species: v.species, pal: v.pal, rarity: rar });
      });
    });
    list.push({ id: 'b-' + w, kind: 'boss', biome: w, name: b.boss.name, species: b.boss.species, pal: b.boss.pal, rarity: 'commun' });
  });
  Object.keys(GRAND_SAGES).forEach(function (f) { list.push({ id: 's-' + f, kind: 'sage', floor: +f, name: GRAND_SAGES[f].nom, rarity: 'epique' }); });
  return list;
})();
var ALBUM_ITEMS = BASE_IDS.slice();

// Les paliers : à réclamer quand on a assez découvert
var ALBUM_MILESTONES = [
  { id: 'mo-5', cat: 'monstres', n: 5, gold: 60, xp: 40 },
  { id: 'mo-10', cat: 'monstres', n: 10, gold: 150, xp: 100 },
  { id: 'mo-20', cat: 'monstres', n: 20, gold: 300, xp: 250 },
  { id: 'mo-30', cat: 'monstres', n: 30, gold: 500, xp: 500 },
  { id: 'mo-45', cat: 'monstres', n: 45, gold: 900, xp: 900 },
  { id: 'mo-all', cat: 'monstres', n: ALBUM_MONSTERS.length, gold: 1500, xp: 1500, item: 'anneau_naturaliste' },
  { id: 'ob-5', cat: 'objets', n: 5, gold: 60, xp: 40 },
  { id: 'ob-10', cat: 'objets', n: 10, gold: 150, xp: 100 },
  { id: 'ob-20', cat: 'objets', n: 20, gold: 300, xp: 250 },
  { id: 'ob-35', cat: 'objets', n: 35, gold: 600, xp: 600 },
  { id: 'ob-50', cat: 'objets', n: 50, gold: 1000, xp: 1000 },
  { id: 'ob-all', cat: 'objets', n: ALBUM_ITEMS.length - 1, gold: 1500, xp: 1500, item: 'echarpe_collection' } // tout, sauf l'écharpe qu'on gagne
];

function albumOf(save) {
  if (!save.album) save.album = { monstres: {}, objets: [], paliers: [] };
  return save.album;
}
// Une victoire sur un monstre (ou un Grand Sage) : sa case se remplit, le compteur monte
function albumKill(save, id) { var a = albumOf(save); a.monstres[id] = (a.monstres[id] || 0) + 1; }
// Les objets déjà trouvés : ceux qu'on a eus un jour (même vendus), par modèle
function albumSyncItems(save) {
  var a = albumOf(save);
  save.owned.forEach(function (id) { var b = baseOf(id); if (ITEMS[b] && a.objets.indexOf(b) < 0) a.objets.push(b); });
  return a.objets;
}
function albumItemsFound(save) { return albumSyncItems(save).length; }
function albumMonstersFound(save) { var m = albumOf(save).monstres; return ALBUM_MONSTERS.filter(function (x) { return m[x.id]; }).length; }
function albumCount(save, cat) { return cat === 'monstres' ? albumMonstersFound(save) : albumItemsFound(save); }
function milestoneReady(save, ms) { return albumOf(save).paliers.indexOf(ms.id) < 0 && albumCount(save, ms.cat) >= ms.n; }
// Réclame un palier : lucioles, XP, et parfois un trésor
function albumClaim(save, ms) {
  if (!milestoneReady(save, ms)) return null;
  var a = albumOf(save);
  a.paliers.push(ms.id);
  save.gold += ms.gold;
  var levels = ms.xp ? gainXp(save, ms.xp) : 0;
  if (ms.item && save.owned.indexOf(ms.item) < 0) save.owned.push(ms.item);
  return { levels: levels };
}
// Où trouver un objet pas encore découvert
function itemHint(id) {
  var it = ITEMS[id], f = it.from || {};
  if (f.tour) return 'Tour des Cent Sages, étage ' + f.tour;
  if (f.dojo) return 'Dojo : podium du lundi';
  if (f.album) return 'Album : tout découvrir';
  if (!it.drop) return 'Équipement de départ';
  return 'Butin ou boutique, dès ' + BIOMES[Math.min(BIOMES.length, ITEM_TIER[id] || 1) - 1].name;
}
