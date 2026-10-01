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
  { id: 'ob-35', cat: 'objets', n: 30, gold: 600, xp: 600 },
  { id: 'ob-50', cat: 'objets', n: 40, gold: 1000, xp: 1000 },
  { id: 'ob-all', cat: 'objets', all: true, n: 0, gold: 1500, xp: 1500, item: 'echarpe_collection' } // tout, sauf l'écharpe qu'on gagne
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
// Les objets qu'une grenouille peut collectionner : tous, sauf les armes qui ne sont pas les siennes (et qu'elle n'a jamais eues)
function albumPool(save) { var found = albumSyncItems(save); return ALBUM_ITEMS.filter(function (id) { return itemAvailable(save, id) || found.indexOf(id) >= 0; }); }
// Le nombre à atteindre pour un palier (« tout » dépend des armes de la grenouille)
function milestoneTarget(save, ms) { return ms.all ? albumPool(save).length - 1 : ms.n; }
function albumMonstersFound(save) { var m = albumOf(save).monstres; return ALBUM_MONSTERS.filter(function (x) { return m[x.id]; }).length; }
function albumCount(save, cat) { return cat === 'monstres' ? albumMonstersFound(save) : albumItemsFound(save); }
function milestoneReady(save, ms) { return albumOf(save).paliers.indexOf(ms.id) < 0 && albumCount(save, ms.cat) >= milestoneTarget(save, ms); }
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
  if (f.dojo) return 'Cascade des duels : podium du lundi';
  if (f.album) return 'Album : tout découvrir';
  if (Object.keys(STARTER_WEAPON).some(function (k) { return STARTER_WEAPON[k] === id; })) return 'Donnée en choisissant cette arme au Temple';
  if (it.legend) return 'Légendaire : sur le Continent, très rarement';
  if (!it.drop) return 'Équipement de départ';
  return 'Butin ou boutique, dès ' + BIOMES[Math.min(BIOMES.length, ITEM_TIER[id] || 1) - 1].name;
}

// Les chapitres du livre : une famille par double page (les monstres par espèce, les objets par sorte)
var ALBUM_CHAPTERS = (function () {
  var mon = function (id, name, desc, pred) { return { id: id, cat: 'monstres', name: name, desc: desc, list: ALBUM_MONSTERS.filter(pred) }; };
  var obj = function (id, name, desc, pred) { return { id: id, cat: 'objets', name: name, desc: desc, list: ALBUM_ITEMS.filter(function (i) { return pred(ITEMS[i]); }).sort(function (a, b) { return (ITEM_TIER[a] || 0) - (ITEM_TIER[b] || 0); }) }; };
  var species = function (sp) { return function (m) { return m.kind === 'monstre' && m.species === sp && m.biome < ISLAND_WORLDS; }; };
  var isle = function (pred) { return function (it) { return !it.continent && !it.legend && pred(it); }; }; // les objets de l'île
  var chapters = [
    mon('limons', 'Les Limons', 'Des tas de vase vivante qui rampent, engluent et ne lâchent rien. Il y en a dans presque toutes les terres.', species('limon')),
    mon('moustiques', 'Les Moustiques', 'Des bestioles volantes et voraces. Certaines brillent, d’autres piquent comme des frelons.', species('moustique')),
    mon('champis', 'Les Champis', 'Des champignons qui se préparent, puis chargent tête baissée.', species('champi')),
    mon('chauves', 'Les Chauves-souris', 'Elles zigzaguent dans les grottes et aspirent la vie de qui s’approche.', species('chauvesouris')),
    mon('boss', 'Les Boss des terres', 'Un par terre de l’île, au bout de ses dix étapes. Les vaincre ouvre la suite du monde.', function (m) { return m.kind === 'boss' && m.biome < ISLAND_WORLDS; }),
    mon('sages', 'Les Grands Sages', 'Les dix gardiens de la Tour des Cent Sages, un tous les dix étages.', function (m) { return m.kind === 'sage'; }),
    obj('batons', 'Les Bâtons', 'Au corps à corps : chaque coup libère une onde de choc.', isle(function (it) { return it.slot === 'arme' && it.kind === 'baton' && it.look.weapon === 'baton' && !it.reward; })),
    obj('harpons', 'Les Harpons', 'Des coups d’estoc qui filent tout droit, très loin.', isle(function (it) { return it.slot === 'arme' && it.look.weapon === 'harpon' && !it.reward; })),
    obj('katanas', 'Les Katanas', 'Voie des Armes : des entailles vives qui font saigner.', isle(function (it) { return it.slot === 'arme' && it.wtype === 'katana' && !it.reward; })),
    obj('masses', 'Les Masses', 'Voie des Armes : lourdes, lentes, et le sol tremble.', isle(function (it) { return it.slot === 'arme' && it.wtype === 'masse' && !it.reward; })),
    obj('kunais', 'Les Kunaïs', 'À distance : lancés droit, ils ne ratent jamais.', isle(function (it) { return it.slot === 'arme' && it.kind === 'kunai' && it.wtype !== 'shuriken' && !it.reward; })),
    obj('shurikens', 'Les Shurikens', 'Voie du Lancer : des étoiles qui tournoient, parfois faites d’eau.', isle(function (it) { return it.slot === 'arme' && it.wtype === 'shuriken' && !it.reward; })),
    obj('tetes', 'Les Couvre-chefs', 'Chapeaux, feuilles et heaumes : ils se voient sur la tête.', isle(function (it) { return it.slot === 'tete' && !it.reward; })),
    obj('echarpes', 'Les Écharpes', 'Elles flottent au vent et changent de couleur sur la grenouille.', isle(function (it) { return it.slot === 'echarpe' && !it.reward; })),
    obj('ceintures', 'Les Ceintures', 'Nouées à la taille, parfois avec une breloque.', isle(function (it) { return it.slot === 'ceinture' && !it.reward; })),
    obj('anneaux', 'Les Anneaux', 'Petits, mais on les voit briller au doigt.', isle(function (it) { return it.slot === 'anneau' && !it.reward; })),
    obj('tresors', 'Les Trésors', 'Ni en boutique ni en butin : la tour, les duels de la cascade et l’album lui-même.', function (it) { return !!it.reward; }),
    obj('legendaires', 'Les Légendaires', 'Des bandeaux et des capes d’or, qu’on ne trouve que sur le Continent… très, très rarement.', function (it) { return !!it.legend; })
  ];
  // les îles suivantes (le Continent, les Colosses…) : pour chaque terre, son bestiaire, puis son butin (le sommaire
  // les regroupe par île)
  BIOMES.forEach(function (b, w) {
    if (w < ISLAND_WORLDS) return;
    var m = mon('c-' + b.id, b.name, b.tagline, function (x) { return x.biome === w; }); m.continent = true; m.isle = isleOf(w).id; chapters.push(m);
  });
  BIOMES.forEach(function (b, w) {
    if (w < ISLAND_WORLDS) return;
    var o = obj('o-' + b.id, 'Butin : ' + b.name, 'Les objets de cette terre de ' + isleOf(w).name + ', plus forts à chaque terre.', function (it) { return it.continent === w; }); o.continent = true; o.isle = isleOf(w).id; chapters.push(o);
  });
  // les bestiaires d'abord, puis les objets (les marque-pages du livre en dépendent)
  return chapters.filter(function (c) { return c.cat === 'monstres'; }).concat(chapters.filter(function (c) { return c.cat === 'objets'; }));
})();
