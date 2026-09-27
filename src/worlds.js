// Mondes (un par biome) : 10 étapes, dont 3 boss (gardiens aux étapes 4 et 7, grand boss à l'étape 10).
// À chaque étape : un combat (fait avancer, meilleures récompenses) ou une mission en temps réel
// (rapporte des lucioles et de l'XP sans combattre, sans faire avancer).
// Et la boutique de l'Aïeule Gamako.

var STAGES = 10;
var GUARDIAN_STAGES = [4, 7];

// Niveau d'un ennemi : chaque monde commence 8 niveaux après le précédent (léger chevauchement)
function stageLevel(w, st) { return w * 8 + st; }

// Taille d'un ennemi dans l'arène de combat (px) : 48 pour un monstre, ~70 pour un gardien, ~96 pour un boss
function enemySize(e) { return Math.round((SPECIES[e.species].size === 32 ? 96 : 48) * e.scale); }

function makeEnemy(w, level, variant, rank, title) {
  var b = BIOMES[w];
  var isBoss = rank === 'boss', isGuard = rank === 'gardien';
  var v = isBoss ? { species: b.boss.species, name: b.boss.name, pal: b.boss.pal } : variant;
  var s = SPECIES[v.species];
  return {
    name: isGuard ? v.name + ' ' + title : v.name, species: v.species, pal: v.pal, level: level,
    rank: rank || 'normal', behavior: s.behavior,
    scale: isBoss ? (s.size === 32 ? 1 : 1.9) : (isGuard ? 1.45 : 1),
    maxHp: Math.round(s.hp * 2.4 * (1 + 0.2 * (level - 1)) * (isBoss ? 2.4 : (isGuard ? 1.8 : 1))),
    dmg: Math.round((2 + 0.95 * level) * (isBoss || isGuard ? 1.1 : 1)),
    agi: 6 + level * 0.6,
    dodge: s.behavior === 'flyer' ? 0.18 : 0.05
  };
}

// ---------- Météo du marais : certaines étapes se combattent sous un ciel particulier ----------
var WEATHERS = [
  { id: 'clair', name: 'Temps clair', desc: 'Aucun effet.', xp: 1 },
  { id: 'lune', name: 'Pleine lune', desc: 'Ennemi +25 % de dégâts, XP ×1,5.', enemyDmg: 1.25, xp: 1.5 },
  { id: 'brume', name: 'Brume épaisse', desc: 'L’ennemi esquive +15 % (les kunaïs ne ratent jamais).', enemyDodge: 0.15, xp: 1.2 },
  { id: 'averse', name: 'Averse', desc: 'Récupère +1 Souffle par tour.', regen: 1, xp: 1 },
  { id: 'nuit', name: 'Nuit sans lune', desc: 'Coups critiques +15 % pour tout le monde.', crit: 0.15, xp: 1.2 },
  { id: 'canicule', name: 'Canicule', desc: 'Commence sans Souffle, mais XP ×1,3.', noStartSouffle: true, xp: 1.3 }
];

function worldStages(w) {
  var b = BIOMES[w], list = [];
  for (var st = 1; st <= STAGES; st++) {
    var rank = st === STAGES ? 'boss' : (GUARDIAN_STAGES.indexOf(st) >= 0 ? 'gardien' : 'normal');
    var variant = b.monsters[(st * 7 + w) % b.monsters.length];
    var r = hash(w, st, 5);
    var weather = rank === 'boss' || r < 0.55 ? WEATHERS[0] : WEATHERS[1 + Math.floor(hash(w, st, 9) * (WEATHERS.length - 1))];
    list.push({
      stage: st, rank: rank, weather: weather,
      enemy: makeEnemy(w, stageLevel(w, st), variant, rank, st === 4 ? 'colossal' : 'ancestral')
    });
  }
  return list;
}

function worldUnlocked(save, w) { return w === 0 || save.progress[w - 1] >= STAGES; }

function stageFight(save, w, st) {
  var s = worldStages(w)[st - 1], lvl = s.enemy.level;
  var mult = s.rank === 'boss' ? 3 : (s.rank === 'gardien' ? 1.8 : 1);
  return {
    kind: 'stage', biomeIndex: w, stage: st, enemy: s.enemy, weather: s.weather,
    rewards: {
      xp: Math.round((10 + 5 * lvl) * mult * s.weather.xp),
      gold: Math.round((6 + 3 * lvl) * mult),
      itemChance: s.rank === 'boss' ? 1 : (s.rank === 'gardien' ? 0.5 : 0.15)
    }
  };
}

// ---------- Missions en temps réel (comme la taverne de Shakes & Fidget) ----------
var EXPEDITIONS = [
  { id: 'cueillette', name: 'Cueillette de lucioles', secs: 30, gold: 1, xp: 0.3, item: 0,
    flavor: 'Kawazu remplit sa besace de lucioles au bord de l’eau.' },
  { id: 'patrouille', name: 'Patrouille des roseaux', secs: 90, gold: 1.8, xp: 0.9, item: 0.05,
    flavor: 'Faire le tour des roseaux et chasser les petits nuisibles.' },
  { id: 'tresor', name: 'Chasse au trésor', secs: 240, gold: 3.5, xp: 1.8, item: 0.3,
    flavor: 'Une vieille carte griffonnée promet un butin quelque part dans les parages.' }
];

function expeditionRewards(w, st, e) {
  var lvl = stageLevel(w, st);
  return { gold: Math.round((5 + 2 * lvl) * e.gold), xp: Math.round((6 + 3 * lvl) * e.xp), item: e.item };
}

function startExpedition(save, w, st, id) {
  var e = EXPEDITIONS.filter(function (x) { return x.id === id; })[0];
  var r = expeditionRewards(w, st, e);
  save.expedition = { w: w, st: st, id: id, name: e.name, endsAt: Date.now() + e.secs * 1000, gold: r.gold, xp: r.xp, item: r.item };
}

function expeditionLeft(save) { return save.expedition ? Math.max(0, save.expedition.endsAt - Date.now()) : 0; }

// ---------- Boutique de l'Aïeule Gamako ----------
var TEA_ID = 'the_oubli';
var TEA = { name: 'Thé de l’oubli', price: 80, desc: 'Une tisane amère : oublie tout l’arbre de compétences et rend les points.' };
var SHOP_SIZE = 5, SHOP_REROLL = 25;

function refreshShop(save) {
  var maxTier = 1;
  for (var w = 0; w < BIOMES.length; w++) if (worldUnlocked(save, w)) maxTier = w + 2;
  var pool = Object.keys(ITEMS).filter(function (id) { return ITEMS[id].drop > 0 && save.owned.indexOf(id) < 0 && (ITEM_TIER[id] || 1) <= maxTier; });
  var stock = [];
  while (stock.length < SHOP_SIZE && pool.length) stock.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  save.shop = stock.concat([TEA_ID]);
}
