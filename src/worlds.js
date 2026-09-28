// Mondes (un par biome) : 10 étapes, dont 3 boss (gardiens aux étapes 4 et 7, grand boss à l'étape 10).
// À chaque étape : un combat (fait avancer, meilleures récompenses) ou une mission en temps réel
// (rapporte des lucioles et de l'XP sans combattre, sans faire avancer).
// Et la boutique de l'Aïeule Gamako.

var STAGES = 10;
var GUARDIAN_STAGES = [4, 7];

// Niveau d'un ennemi : chaque monde commence 8 niveaux après le précédent (léger chevauchement)
function stageLevel(w, st) { return w * 8 + st; }

// Taille d'un ennemi dans l'arène de combat (px) : 48 pour un monstre, ~70 pour un gardien, ~96 pour un boss
function enemySize(e) {
  if (e.frog) return Math.round(64 * (e.size || 1)); // une grenouille du dojo : la même taille que Kawazu
  return Math.round((SPECIES[e.species].size === 32 ? 96 : 48) * e.scale);
}

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

// ---------- Monstres rares et épiques ----------
// Un combat normal peut tomber sur une variante rare (16 %) ou épique (4 %) : recolorée, entourée d'une aura,
// plus coriace, et bien mieux récompensée (meilleur butin). Chacune a sa case dans l'album.
var MONSTER_RARITY = {
  commun: { hp: 1, dmg: 1, reward: 1, item: 0, luck: 0, shift: 0 },
  rare: { hp: 1.35, dmg: 1.2, reward: 1.6, item: 0.3, luck: 1, shift: 150, sat: 1.05 },
  epique: { hp: 1.8, dmg: 1.45, reward: 2.5, item: 0.7, luck: 2, shift: 250, sat: 1.2 }
};
function rollMonsterRarity() { var r = Math.random(); return r < 0.8 ? 'commun' : (r < 0.96 ? 'rare' : 'epique'); }
function hueShift(hex, deg, sat) {
  var n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : (mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
    h /= 6;
  }
  h = ((h + deg / 360) % 1 + 1) % 1; s = Math.min(1, s * (sat || 1));
  var q = (1 - Math.abs(2 * l - 1)) * s, x = q * (1 - Math.abs((h * 6) % 2 - 1)), m = l - q / 2, rgb;
  var i = Math.floor(h * 6);
  rgb = [[q, x, 0], [x, q, 0], [0, q, x], [0, x, q], [x, 0, q], [q, 0, x]][i % 6];
  return '#' + rgb.map(function (v) { return ('0' + Math.round((v + m) * 255).toString(16)).slice(-2); }).join('');
}
// La palette d'une variante : les couleurs tournent, le contour et les yeux restent
function rarityPal(pal, rar) {
  var R = MONSTER_RARITY[rar];
  if (!R || !R.shift) return pal;
  var out = {};
  Object.keys(pal).forEach(function (k) { out[k] = k === 'k' || k === 'p' || !/^#[0-9a-f]{6}$/i.test(pal[k]) ? pal[k] : hueShift(pal[k], R.shift, R.sat); });
  return out;
}
// L'id de l'album d'un monstre : m-monde-variante(-r|-e), b-monde pour un boss
function monsterAlbumId(w, st, rank, rar) {
  if (rank === 'boss') return 'b-' + w;
  var idx = (st * 7 + w) % BIOMES[w].monsters.length;
  return 'm-' + w + '-' + idx + (rar === 'rare' ? '-r' : (rar === 'epique' ? '-e' : ''));
}

function stageFight(save, w, st) {
  var s = worldStages(w)[st - 1], lvl = s.enemy.level;
  var mult = s.rank === 'boss' ? 3 : (s.rank === 'gardien' ? 1.8 : 1);
  var rar = s.rank === 'normal' ? rollMonsterRarity() : 'commun', R = MONSTER_RARITY[rar];
  var enemy = Object.assign({}, s.enemy, { rarity: rar, maxHp: Math.round(s.enemy.maxHp * R.hp), dmg: Math.round(s.enemy.dmg * R.dmg), name: s.enemy.name + (rar === 'rare' ? ' rare' : (rar === 'epique' ? ' épique' : '')) });
  return {
    kind: 'stage', biomeIndex: w, stage: st, enemy: enemy, weather: s.weather, luck: s.rank === 'normal' ? R.luck : 1,
    albumId: monsterAlbumId(w, st, s.rank, rar),
    rewards: {
      xp: Math.round((10 + 5 * lvl) * mult * s.weather.xp * R.reward),
      gold: Math.round((6 + 3 * lvl) * mult * R.reward),
      itemChance: Math.min(1, (s.rank === 'boss' ? 1 : (s.rank === 'gardien' ? 0.5 : 0.15)) + R.item)
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
  var stock = [];
  while (stock.length < SHOP_SIZE) stock.push(rollItem(save, pickBase(Math.min(maxTier, 6)), rollRarity('shop')));
  save.shop = stock.concat([TEA_ID]);
}
