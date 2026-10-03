// Les Donjons, comme ceux de Shakes & Fidget : un tous les 10 niveaux de la grenouille (le premier au niveau 10, le
// trentième au niveau 300), dix salles chacun, des monstres qui montent d'un niveau à chaque salle (un gardien à la 5e)
// et un boss au fond. On avance salle par salle. La première victoire dans une salle rapporte beaucoup d'XP et de
// lucioles, une chance d'objet, et une chance d'objet Unique : une rareté vert rayonnant, plus forte qu'un Épique,
// qui porte le nom du donjon (« Katana de la Crypte »). Un donjon vidé, son boss se redéfie une fois par jour.
var DUNGEON_ROOMS = 10, DUNGEON_EVERY = 10;
var DUNGEON_LOOT = { room: 0.3, unique: 0.12, bossUnique: 0.25, dailyUnique: 0.15 };
// nom, terre (décor et monstres), boss (nom, espèce), épithète des objets Uniques, présentation
var DUNGEONS = [
  ['La Mare aux Têtards', 'lagune', 'Grand Têtard Glouton', 'limon', 'des Têtards', 'Une mare sans fond où grouillent des têtards qui n’ont jamais grandi. Sauf un.'],
  ['Le Saule Creux', 'saules', 'Champi Pourrissant', 'champi', 'du Saule creux', 'Dans le tronc d’un saule mort, une ville de champignons qui respire.'],
  ['La Gueule aux Échos', 'grottes', 'Matriarche des Échos', 'chauvesouris', 'des Échos', 'Chaque cri y revient cent fois. Le dernier n’est jamais le tien.'],
  ['Le Sanctuaire Noyé', 'temple', 'Grand Prêtre Limon', 'limon', 'du Sanctuaire', 'Les prières de ce temple se disent sous l’eau, et elles sont gluantes.'],
  ['Le Moulin Hanté', 'plaine', 'Corbeau-Meunier', 'corbeau', 'du Moulin', 'Ses ailes tournent sans vent. Le meunier, lui, a des plumes.'],
  ['La Fosse aux Armures', 'bataille', 'Capitaine Sans-Repos', 'chevalier', 'des Armures', 'Un charnier d’armures vides qui se relèvent quand on passe.'],
  ['Le Cœur de Ronce', 'epines', 'Ronce-Mère Aînée', 'plante', 'de Ronce', 'Au centre de la forêt d’épines, la première ronce. Elle a faim depuis toujours.'],
  ['Le Tombeau des Sables', 'dunes', 'Pharaon-Scorpion', 'scorpion', 'des Sables', 'Un roi enterré avec ses scorpions. Il n’a pas fini de régner.'],
  ['La Grotte de Givre', 'toundra', 'Loup des Neiges éternelles', 'loup', 'de Givre', 'Une grotte de glace bleue où l’on voit son souffle, et celui des loups.'],
  ['La Chaudière', 'volcan', 'Golem de Lave ancien', 'golem', 'de la Chaudière', 'Une salle de magma qui bout depuis mille ans, et un gardien qui fond sans jamais s’éteindre.'],
  ['La Crypte des Rois', 'cimetiere', 'Roi-Liche Crapaud', 'squelette', 'de la Crypte', 'Les rois-crapauds y dorment avec leurs trésors. Pas tous très bien.'],
  ['Le Cercle des Fées', 'feerique', 'Fée des Ronces noires', 'fee', 'des Fées', 'Qui entre dans le cercle danse jusqu’à l’aube. Ou jusqu’à la fin.'],
  ['Le Temple des Lianes', 'jungle', 'Serpent à plumes', 'serpent', 'des Lianes', 'Un temple dévoré par la jungle, où un serpent se fait adorer.'],
  ['Les Galeries oubliées', 'mines', 'Araignée des profondeurs', 'araignee', 'des Galeries', 'Des mines si profondes qu’on y a oublié le soleil. Quelque chose y tisse.'],
  ['Les Oubliettes de Fer', 'forteresse', 'Geôlier de Fer', 'chevalier', 'des Oubliettes', 'Sous la forteresse, des cachots dont personne n’a jamais eu la clé.'],
  ['Le Puits sans fond', 'abysse', 'Œil du Vide', 'fantome', 'du Puits', 'On y jette une pierre, on ne l’entend jamais tomber. Quelque chose la rattrape.'],
  ['La Tour foudroyée', 'orage', 'Corbeau-Tonnerre', 'corbeau', 'de la Foudre', 'Une tour que la foudre frappe sans arrêt. Ses habitants aiment ça.'],
  ['Les Racines du Monde', 'geants', 'Sylvain millénaire', 'sylvain', 'des Racines', 'Sous la Forêt des Géants, les racines descendent jusqu’au cœur du monde.'],
  ['L’Enclume des Dieux', 'forge', 'Cyclope primordial', 'cyclope', 'de l’Enclume', 'Le premier cyclope y forge encore, sur une enclume grande comme une montagne.'],
  ['La Fosse des Léviathans', 'leviathans', 'Kraken ancestral', 'kraken', 'des Abysses', 'Le fond de l’abîme. Il y fait noir, froid, et rien n’y est petit.'],
  ['Le Nid des Wyvernes', 'dragons', 'Wyverne écarlate', 'dragon', 'des Wyvernes', 'Des œufs gros comme des maisons, et des mères qui veillent.'],
  ['Le Royaume des Ombres', 'cimetiere', 'Reine des Ombres', 'fantome', 'des Ombres', 'Un royaume entier, mais sans lumière. Sa reine n’en a jamais vu.'],
  ['Le Cœur du Volcan', 'volcan', 'Salamandre primordiale', 'salamandre', 'du Cœur ardent', 'Là où naît la lave, la première salamandre se baigne.'],
  ['Le Palais des Nuées', 'ciel', 'Roc céleste', 'corbeau', 'des Nuées', 'Un palais de marbre perdu au-dessus des nuages, gardé par un oiseau immense.'],
  ['Le Glacier éternel', 'toundra', 'Golem de glace', 'golem', 'du Glacier', 'Un glacier qui avance d’un pas par siècle, et son gardien avec lui.'],
  ['La Forêt pétrifiée', 'geants', 'Cerf de pierre', 'cerf', 'de Pierre', 'Une forêt de géants changée en pierre. Un cerf, seul, bouge encore.'],
  ['Le Gouffre des Marées', 'leviathans', 'Crabe abyssal', 'crabe', 'des Marées', 'La marée s’y retire une fois par an, et laisse ce qui vit au fond.'],
  ['La Forge primordiale', 'forge', 'Titan forgeron', 'cyclope', 'de la Forge primordiale', 'Là fut forgée la première arme. Le forgeron l’a gardée.'],
  ['L’Œil du Cyclone', 'orage', 'Dragon-Cyclone', 'dragon', 'du Cyclone', 'Au centre de la plus grande tempête du monde, le calme… et un dragon.'],
  ['Le Néant', 'abysse', 'Le Dévoreur de mondes', 'leviathan', 'du Néant', 'Le dernier donjon. Il n’y a rien au fond, sauf ce qui a tout mangé.']
].map(function (d, i) {
  var w = BIOMES.map(function (b) { return b.id; }).indexOf(d[1]), sp = SPECIES[d[3]];
  // le boss : son espèce, recolorée à sa façon (une teinte par donjon)
  var pal = {}; Object.keys(sp.pal).forEach(function (c) { pal[c] = c === 'k' || !/^#[0-9a-f]{6}$/i.test(sp.pal[c]) ? sp.pal[c] : hueShift(sp.pal[c], (i * 47) % 360, 1.15); });
  return { id: 'd' + (i + 1), n: i, level: DUNGEON_EVERY * (i + 1), name: d[0], biome: Math.max(0, w), boss: { name: d[2], species: d[3], pal: pal }, of: d[4], desc: d[5] };
});
function dungeonById(id) { return DUNGEONS.filter(function (d) { return d.id === id; })[0] || null; }
function dungeonOpen(save, d) { return save.level >= d.level; }
// le rang des objets qui y tombent : celui des terres de son niveau
function dungeonTier(d) { return Math.max(1, Math.min(BIOMES.length, Math.floor((d.level - 1) / 8) + 1)); }
function dungeonState(save, d) { return (save.dungeons && save.dungeons[d.id]) || { room: 0, day: '' }; }
// les monstres d'un donjon : ceux de sa terre, assombris (le noir des couloirs, une lueur violette)
function gloomPal(pal) {
  var out = {};
  Object.keys(pal || {}).forEach(function (c) {
    var v = pal[c];
    if (c === 'k' || !/^#[0-9a-f]{6}$/i.test(v)) { out[c] = v; return; }
    var n = parseInt(v.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    out[c] = '#' + [r * 0.72 + 42 * 0.28, g * 0.72 + 22 * 0.28, b * 0.72 + 62 * 0.28].map(function (x) { return ('0' + Math.round(x).toString(16)).slice(-2); }).join('');
  });
  return out;
}
// L'ennemi d'une salle (r de 1 à 10) : un niveau de plus par salle, un gardien à la 5e, le boss à la 10e (+2 niveaux).
// Sa force est celle des terres de son niveau (la terre « w » dont les étapes ont ce niveau), son allure celle du donjon.
function dungeonFoe(d, r) {
  var boss = r === DUNGEON_ROOMS, guard = r === 5, lvl = d.level + r - 1 + (boss ? 2 : 0);
  var w = Math.max(0, Math.min(BIOMES.length - 1, Math.floor((lvl - 1) / 8))), home = BIOMES[d.biome];
  var variant = home.monsters[(r * 3 + d.n) % home.monsters.length], sp = SPECIES[boss ? d.boss.species : variant.species];
  var e = makeEnemy(w, lvl, variant, boss ? 'boss' : 'normal', 'des profondeurs');
  if (guard) { e.name = variant.name + ' gardien'; e.rank = 'gardien'; e.maxHp = Math.round(e.maxHp * 1.15); } // le gardien de la 5e salle : un ordinaire, en plus coriace
  e.level = lvl; // (pas de calage de cycle dans les donjons)
  if (boss) { e.name = d.boss.name; e.species = d.boss.species; e.pal = d.boss.pal; e.behavior = sp.behavior; }
  else e.pal = gloomPal(Object.assign({}, sp.pal, variant.pal || {}));
  e.scale = BIOMES[w].giant ? (boss ? 140 : (guard ? 126 : 110)) / (sp.size === 32 ? 96 : 48) : (boss ? (sp.size === 32 ? 1.15 : 2.1) : (guard ? 1.45 : 1));
  var deep = boss ? 1 : r - 1; // de salle en salle, un peu plus coriace
  e.maxHp = Math.round(e.maxHp * DUNGEON_POWER.hp * (1 + DUNGEON_POWER.roomHp * deep) * (boss ? (w < ISLAND_WORLDS ? DUNGEON_POWER.isleBoss : DUNGEON_POWER.boss) : 1)); e.dmg = Math.round(e.dmg * DUNGEON_POWER.dmg * (1 + DUNGEON_POWER.roomDmg * deep));
  e.dungeon = d.id; e.room = r;
  return e;
}
// réglé au simulateur : à son niveau, on passe les premières salles sans peine, la fin et le boss demandent un effort
// (les boss des donjons de l'île : sans le surplus des boss de l'île, déjà calibrés pour leur terre)
var DUNGEON_POWER = { hp: 0.88, dmg: 0.9, boss: 0.85, isleBoss: 0.72, roomHp: 0.02, roomDmg: 0.015 };
// ce que rapporte une salle la première fois (daily : le boss redéfié, une fois par jour)
function dungeonRewards(d, r, daily) {
  var boss = r === DUNGEON_ROOMS, lvl = d.level + r - 1 + (boss ? 2 : 0);
  if (daily) return { xp: Math.round(xpForLevel(lvl) * 0.4), gold: Math.round((30 + 8 * lvl) * 2), item: 1, luck: 1, unique: DUNGEON_LOOT.dailyUnique };
  return { xp: Math.round(xpForLevel(lvl) * (boss ? 1.2 : 0.4)), gold: Math.round((30 + 8 * lvl) * (boss ? 4 : 1)), item: boss ? 1 : DUNGEON_LOOT.room, luck: boss ? 1 : 0, unique: boss ? DUNGEON_LOOT.bossUnique : DUNGEON_LOOT.unique };
}
// Un objet Unique du donjon : un modèle de son rang (que la grenouille peut porter), à la rareté Unique, au nom du donjon
function rollUnique(save, d) {
  var base = pickBase(dungeonTier(d), save);
  if (!base) return null;
  var id = rollItem(save, base, 'unique'), noun = ITEMS[base].name.split(' ')[0];
  save.items[id].name = noun + ' ' + d.of;
  save.items[id].from = d.id;
  registerItem(id, save.items[id]);
  return id;
}
function todayKey() { var t = new Date(); return t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate(); }

// ---------- La porte d'un donjon (pixel art, pour sa carte) ----------
var DungeonArt = (function () {
  var cache = {};
  function gate(d, lit) {
    var key = d.id + (lit ? 'l' : 'd');
    if (cache[key]) return cache[key];
    var b = BIOMES[d.biome], P = b.pal, W = 48, H = 40, c = document.createElement('canvas');
    c.width = W; c.height = H;
    var x = c.getContext('2d'), R = function (a, y, w, h, col) { x.fillStyle = col; x.fillRect(a, y, w, h); };
    R(0, 0, W, H, P.wallDark); for (var i = 0; i < 18; i++) R(hash(i, d.n, 3) * W, hash(i, d.n, 4) * 20, 3, 2, P.wall);
    R(0, 32, W, 8, P.groundDark); for (var j = 0; j < 12; j++) R(hash(j, d.n, 5) * W, 33 + hash(j, d.n, 6) * 6, 2, 1, P.ground);
    // l'arche de pierre
    for (var y = 6; y < 33; y++) for (var a = 8; a < 40; a++) {
      var dx = (a - 23.5) / 16, dy = (y - 18) / 14, inArch = y >= 18 ? Math.abs(a - 23.5) < 16 : dx * dx + dy * dy < 1;
      var inDoor = y >= 18 ? Math.abs(a - 23.5) < 10 : ((a - 23.5) / 10) * ((a - 23.5) / 10) + ((y - 18) / 9) * ((y - 18) / 9) < 1;
      if (inArch && !inDoor) R(a, y, 1, 1, (a + y) % 5 === 0 ? '#3a3a44' : ((Math.floor(y / 4) + Math.floor(a / 6)) % 2 ? '#7a7a84' : '#6a6a74'));
      else if (inDoor) R(a, y, 1, 1, lit ? ((y + a) % 7 === 0 ? P.accent : '#140a1e') : '#0a0a10');
    }
    R(23, 4, 2, 3, P.accent); // la clé de voûte
    if (lit) [[6, 16], [40, 16]].forEach(function (t) { R(t[0], t[1], 2, 8, '#5a3a20'); R(t[0] - 1, t[1] - 4, 4, 4, '#ff9a3a'); R(t[0], t[1] - 6, 2, 2, '#ffe060'); }); // les torches
    return (cache[key] = c.toDataURL());
  }
  return { gate: gate };
})();
