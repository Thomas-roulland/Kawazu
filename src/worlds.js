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

// La force des monstres, réglée pour que les voies (qui multiplient les points) trouvent encore du répondant
var MONSTER_POWER = { hp: 2.2, dmg: 2.6 };
// Le Continent est plus dur : ses monstres ont plus de PV et frappent plus fort, à niveau égal. On y avance en
// farmant et en trouvant de meilleurs objets (réglé au simulateur, voir sim.js).
// hp, dmg : au début du Continent ; hpK, dmgK : ce qui s'ajoute à chaque terre suivante (la grenouille y gagne plus vite en force)
var CONTINENT_POWER = { hp: 2.15, dmg: 1.75, hpK: 0.045, dmgK: 0.04, normal: 1.5 }; // normal : les monstres des étapes ordinaires, un peu plus coriaces
// L'île, terre par terre : la force de ses monstres ordinaires, de ses gardiens et de son boss (PV × s, dégâts
// × (1 + (s − 1) / 2)), réglée au simulateur (calib.js) : il faut un peu farmer — quelques niveaux, ou un meilleur
// objet — avant chaque boss, de plus en plus en montant vers le Héron ; le Marais-Brume reste doux pour débuter.
// (les ordinaires, le gibier du farm, montent doucement : ce sont les gardiens et les boss qui demandent de farmer)
var ISLAND_POWER = [
  { normal: 1, gardien: 1.8, boss: 1.6 },
  { normal: 1.15, gardien: 2.6, boss: 2.4 },
  { normal: 1.3, gardien: 3, boss: 2.1 },
  { normal: 1.45, gardien: 2.8, boss: 2.5 },
  { normal: 1.6, gardien: 2.7, boss: 2.5 },
  { normal: 1.75, gardien: 2.8, boss: 1.3 }
];
// l'entrée du Continent : sa force (CONTINENT_POWER) part de CONTINENT_RAMP à la Plaine des Vents et monte en pente
// douce, entière à partir du boss de la Forêt d'Épines (le premier boss du Continent reprend là où le Héron s'arrêtait)
var CONTINENT_RAMP = 0.8;
// dans un cycle (NG+), toutes les terres ont la force de la toute dernière à niveau égal : on y revient avec l'équipement
// de la fin du monde, et les monstres doivent tenir tête dès la première terre (réglé au simulateur)
// (la force d'avant l'Île de l'Éclipse, CYCLE_TIER : l'Éclipse est à part, plus dure, dans les cycles aussi ; et le butin
// d'un cycle reste du rang du Cœur de la Terre, sauf sur l'Éclipse, qui donne le sien)
var CYCLE_TIER = typeof ECLIPSE_FROM !== 'undefined' ? ECLIPSE_FROM : BIOMES.length;
var CYCLE_FLOOR = CYCLE_TIER - 1 - ISLAND_WORLDS, CYCLE_GEAR = 0.25;
// L'Archipel et le Royaume : leur force suit la pente du Continent, mais l'équipement grandit bien plus vite ; sans ce
// renfort, leurs boss tombaient presque à coup sûr (77 à 97 %, contre 37 à 80 % ailleurs) ; avec, 25 à 60 % (les Armes et le Lancer
// ayant en fin de jeu plus de PV contre les monstres, pveHp). Réglé au
// simulateur (terres.js) ; pas dans les cycles, réglés à part.
// L'Île de l'Éclipse, la plus dure : son renfort vaut aussi dans les cycles (always), en plus de la cuirasse de ses monstres
// (ECLIPSE_ARMOR, eclipse.js), et la grenouille n'y monte plus de niveau (300 au plus) : seul l'équipement la fait avancer.
// Réglé au simulateur : avec les Rares de la terre, ses boss tombent 23 à 37 % du temps et Lord Bufo 11 % (le Royaume :
// 37 à 62 %) ; à moitié Épique (ou forgée), 71 à 88 % et 42 % pour le Lord.
var LATE_POWER = { archipel: { hp: 1.6, dmg: 1.3 }, royaume: { hp: 1.6, dmg: 1.3 }, eclipse: { hp: 1.55, dmg: 1.28, always: true } }, CYCLE_LATE = { hp: 1.45, dmg: 1.22 };
// L'Île des Colosses : plus coriace encore que le Continent à force égale (des géants, et des boss très durs)
var COLOSSUS_POWER = { hp: 1.22, dmg: 1.12, boss: 1.25 };
function makeEnemy(w, level, variant, rank, title) {
  var b = BIOMES[w], cyc = Math.max(1, playerCycle) - 1, st = level - stageLevel(w, 0);
  // dans un cycle (NG+), les monstres se mettent à la hauteur de la grenouille (étape 1 : 6 niveaux de moins, boss : 3 de
  // plus), sans descendre sous le niveau de leur étape (une grenouille qui vient de muter refait son chemin)
  // (et sur son équipement : une grenouille qui porte des objets d'un rang bien plus haut que son niveau, après une
  // mutation par exemple, voit les monstres monter d'une part CYCLE_GEAR de l'écart, sinon elle tuait tout d'un coup)
  // (jamais sous le niveau de leur étape : ceux de l'Éclipse, au-delà du niveau maximum, gardent le leur)
  if (cyc) { var eff = playerLevel + CYCLE_GEAR * Math.max(0, playerGearLevel - playerLevel); level = Math.max(level, Math.min(MAX_LEVEL + 20, Math.round(eff) - 7 + st)); }
  // la force des terres : k = 0 à la Plaine des Vents, 15 au Trône de l'Orage (l'île en dessous) ; dans un cycle, toutes
  // les terres ont la force de la dernière (CYCLE_FLOOR : on y revient avec l'équipement de la fin),
  // et chaque cycle multiplie en plus PV et dégâts par CYCLE.power
  var k = cyc ? Math.max(w - ISLAND_WORLDS, CYCLE_FLOOR) : w - ISLAND_WORLDS, boost = Math.pow(CYCLE.power, cyc), CP = CONTINENT_POWER;
  var ramp = k < 0 ? 1 : Math.min(1, CONTINENT_RAMP + (1 - CONTINENT_RAMP) * (k * STAGES + st) / (2 * STAGES));
  var up = function (x) { return 1 + (x - 1) * ramp; };
  var ip = k < 0 ? (ISLAND_POWER[w] || {})[rank || 'normal'] || 1 : 1;
  var hpX = (k >= 0 ? up(CP.hp * (1 + CP.hpK * k)) : ip) * boost, dmgX = (k >= 0 ? up(CP.dmg * (1 + CP.dmgK * k)) : 1 + (ip - 1) / 2) * boost;
  if (k >= 0 && (rank || 'normal') === 'normal') { hpX *= up(CP.normal); dmgX *= Math.sqrt(up(CP.normal)); }
  var isBoss = rank === 'boss', isGuard = rank === 'gardien';
  if (b.giant) { var GP = COLOSSUS_POWER, bb = isBoss ? GP.boss : 1, gk = cyc ? 0.5 : 1; hpX *= Math.pow(GP.hp * bb, gk); dmgX *= Math.pow(GP.dmg * Math.sqrt(bb), gk); } // (dans un cycle, déjà au plus fort : le surplus des géants est adouci)
  var lp = LATE_POWER[isleOf(w).id];
  if (cyc && !(lp && lp.always)) lp = CYCLE_LATE; // (dans un cycle, sa part à lui : CYCLE_LATE ; sauf l'Éclipse, qui garde la sienne)
  if (lp) { var lk = (rank || 'normal') === 'normal' ? 0.5 : 1; hpX *= Math.pow(lp.hp, lk); dmgX *= Math.pow(lp.dmg, lk); } // (les ordinaires, le gibier du farm, la moitié du renfort)
  if (isBoss && b.bossPower) hpX *= b.bossPower; // certains boss, durs par nature (esquive…), ont un peu moins de PV
  var v = isBoss ? { species: b.boss.species, name: b.boss.name, pal: b.boss.pal } : variant;
  var s = SPECIES[v.species];
  return {
    name: isGuard ? v.name + ' ' + title : v.name, species: v.species, pal: v.pal, level: level,
    rank: rank || 'normal', behavior: s.behavior,
    // (chez les Colosses, tout est géant : ~110 px, les gardiens ~126, les boss ~140, quelle que soit l'espèce)
    // (dans l'Archipel, les créatures 32 × 32 gardent une taille normale : monsterScale ; son dernier boss est plus grand : bossScale)
    scale: b.giant ? (isBoss ? 140 : (isGuard ? 126 : 110)) / (s.size === 32 ? 96 : 48) : (isBoss ? (s.size === 32 ? (b.bossScale || 1) : 1.9) : (isGuard ? 1.45 : 1)) * (s.size === 32 && !isBoss && b.monsterScale ? b.monsterScale : 1),
    // (sur le Continent, les espèces ont toutes la même base de PV : c'est la terre qui fait la force, et le dragon un peu plus)
    maxHp: Math.round((k >= 0 ? (s.size === 32 ? 16 : 13) : s.hp) * 2.4 * MONSTER_POWER.hp * (1 + 0.2 * (level - 1)) * (isBoss ? 2.4 : (isGuard ? 1.8 : 1)) * hpX),
    dmg: Math.round((2 + 0.95 * level) * MONSTER_POWER.dmg * (isBoss || isGuard ? 1.1 : 1) * dmgX),
    agi: 6 + level * 0.6,
    dodge: s.behavior === 'flyer' ? 0.18 : 0.05,
    // l'Éclipse : la cuirasse de ses monstres (une part des dégâts reçus en moins), et Lord Bufo et ses trois temps (battle.js)
    dmgReduce: b.eclipse ? ECLIPSE_ARMOR[rank || 'normal'] || 0 : 0, lord: !!(isBoss && b.boss.lord)
  };
}

// ---------- Météo du marais : certaines étapes se combattent sous un ciel particulier ----------
var WEATHERS = [
  { id: 'clair', name: 'Temps clair', desc: 'Aucun effet.', xp: 1 },
  { id: 'lune', name: 'Pleine lune', desc: 'Ennemi +25 % de dégâts, XP ×1,5.', enemyDmg: 1.25, xp: 1.5 },
  { id: 'brume', name: 'Brume épaisse', desc: 'L’ennemi esquive +15 % (les kunaïs ne ratent jamais).', enemyDodge: 0.15, xp: 1.2 },
  { id: 'averse', name: 'Averse', desc: 'Tes sorts ont 30 % de chances par tour de se relancer un tour plus tôt.', flow: 0.3, xp: 1 },
  { id: 'nuit', name: 'Nuit sans lune', desc: 'Coups critiques +15 % pour tout le monde.', crit: 0.15, xp: 1.2 },
  { id: 'canicule', name: 'Canicule', desc: 'Tes sorts commencent en relance (1 tour), mais XP ×1,3.', startCd: 1, xp: 1.3 }
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

// L'XP fond quand la grenouille est bien plus forte que le monstre : au-delà de XP_GAP niveaux d'avance, −12 % par
// niveau, et jamais moins de 10 %. On ne monte pas au niveau 100 en farmant le Sommet du Héron.
var XP_GAP = 5;
function xpGapMult(heroLevel, foeLevel) { var gap = heroLevel - foeLevel - XP_GAP; return gap <= 0 ? 1 : Math.max(0.1, 1 - 0.12 * gap); }

function worldUnlocked(save, w) { return w === 0 || save.progress[w - 1] >= STAGES; }
// Le Continent s'ouvre quand le Héron Ancestral est vaincu ; le monde est achevé quand le boss de la toute dernière terre
// l'est (celui de la dernière île : Lord Bufo, en haut de la Citadelle de l'Île de l'Éclipse, pour l'instant)
function continentOpen(save) { return worldUnlocked(save, ISLAND_WORLDS); }
// une île est ouverte quand le boss de la dernière terre de la précédente est tombé
function isleOpen(save, isle) { return worldUnlocked(save, isle.from); }
function worldDone(save) { return save.progress[BIOMES.length - 1] >= STAGES; }
// Le cycle suivant : tout recommence au Marais-Brume, en plus dur, et avec un meilleur butin
function nextCycle(save) {
  if (!worldDone(save)) return false;
  save.cycle = (save.cycle || 1) + 1;
  if (typeof journal === 'function') journal('cycle', { cycle: save.cycle, niveau: save.level });
  save.progress = BIOMES.map(function () { return 0; });
  save.expedition = null;
  return true;
}

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

// L'XP d'un combat : une part d'un niveau du monstre (un ordinaire à ton niveau ≈ un quart de niveau, un gardien ×1,8,
// un boss ×3). Finir une terre une fois fait gagner ~3,5 niveaux ; une vingtaine de combats en plus font le reste.
var STAGE_XP = 0.25;
function stageFight(save, w, st) {
  var s = worldStages(w)[st - 1], lvl = s.enemy.level;
  var mult = s.rank === 'boss' ? 3 : (s.rank === 'gardien' ? 1.8 : 1);
  var rar = s.rank === 'normal' ? rollMonsterRarity() : 'commun', R = MONSTER_RARITY[rar];
  var enemy = Object.assign({}, s.enemy, { rarity: rar, maxHp: Math.round(s.enemy.maxHp * R.hp), dmg: Math.round(s.enemy.dmg * R.dmg), name: s.enemy.name + (rar === 'rare' ? ' rare' : (rar === 'epique' ? ' épique' : '')) });
  return {
    kind: 'stage', biomeIndex: w, stage: st, enemy: enemy, weather: s.weather, luck: s.rank === 'normal' ? R.luck : 1,
    albumId: monsterAlbumId(w, st, s.rank, rar),
    rewards: {
      xp: Math.round(xpForLevel(playerCycle > 1 ? Math.min(lvl, playerLevel + XP_GAP) : lvl) * STAGE_XP * mult * s.weather.xp * R.reward),
      gold: Math.round((6 + 3 * lvl) * mult * R.reward),
      itemChance: Math.min(1, (s.rank === 'boss' ? 1 : (s.rank === 'gardien' ? 0.5 : 0.15)) + R.item)
    }
  };
}

// ---------- Les Alphas des clans : des créatures géantes aux PV partagés par tout un clan ----------
// Cinq Alphas qui reviennent, de plus en plus forts (rang : combien le clan en a déjà abattu). biome : le décor du combat.
var ALPHAS = [
  { species: 'limon', name: 'Limon Alpha', scale: 2.6, biome: 0, pal: { 1: '#1a1a2a', 2: '#3a2a4a', 3: '#6a4a8a', g: '#ff4a4a', w: '#ffe0e0' } },
  { species: 'moustique', name: 'Frelon Alpha', scale: 3.6, biome: 1, pal: { a: '#ffb040', 2: '#3a1a0a', 3: '#e07a1a', r: '#ff2a2a' } },
  { species: 'champi', name: 'Champi Titan', scale: 2.8, biome: 2, pal: { 1: '#2a1a4a', w: '#ff4a8a', 2: '#b8a8c8' } },
  { species: 'chauvesouris', name: 'Chauve-souris Alpha', scale: 2.8, biome: 3, pal: { 1: '#1a0a1a', 2: '#4a1a3a', r: '#ffd040' } },
  { species: 'heron', name: 'Héron Alpha', scale: 1.3, biome: 5, pal: { w: '#3a3a4a', g: '#1a1a2a', G: '#0a0a14', y: '#ff4a2a' } }
];
// Les PV d'un Alpha (la même règle que le serveur, server/api.js)
function alphaHp(rang) { return Math.round(20000 * Math.pow(1.6, rang)); }
// Sa force de frappe suit le niveau de la grenouille qui l'attaque (un clan mêle petits et grands niveaux), un peu plus
// à chaque Alpha abattu ; seuls ses PV, partagés par le clan, sont les mêmes pour tous.
var ALPHA_DMG = 1.6; // réglé au simulateur : on tient les 10 tours contre le premier Alpha, moins face à un Alpha enragé (sous la moitié de ses PV)
function alphaOf(rang, heroLevel) {
  var a = ALPHAS[rang % ALPHAS.length], cycle = Math.floor(rang / ALPHAS.length), lvl = Math.max(1, heroLevel || 1);
  return {
    name: a.name + (cycle ? ' ' + ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Math.min(9, cycle)] : ''), species: a.species, pal: a.pal, scale: a.scale, biome: a.biome,
    level: lvl, rank: 'boss', behavior: SPECIES[a.species].behavior, maxHp: alphaHp(rang),
    dmg: Math.round((2 + 0.95 * lvl) * MONSTER_POWER.dmg * ALPHA_DMG * (1 + 0.06 * Math.min(10, rang))), agi: 6 + lvl * 0.6, dodge: 0.05
  };
}

// ---------- Le Titan de la semaine : le boss mondial, le même pour toutes les grenouilles (server/api.js) ----------
// Cinq Titans qui reviennent à tour de rôle, un par semaine (idx, donné par le serveur) ; rang : combien sont déjà tombés
// cette semaine. Comme l'Alpha, sa force de frappe suit le niveau de la grenouille qui l'attaque ; ses PV viennent du serveur.
var TITANS = [
  { name: 'Kraken des Tempêtes', species: 'kraken', biome: 'leviathans', hue: 200 },
  { name: 'Léviathan d’Écume', species: 'leviathan', biome: 'leviathans', hue: 0 },
  { name: 'Cyclope Sans-Sommeil', species: 'cyclope', biome: 'forge', hue: 300 },
  { name: 'Ryū Céleste', species: 'ryu', biome: 'mont', hue: 180 },
  { name: 'Sylvain Colérique', species: 'sylvain', biome: 'geants', hue: 90 }
];
var TITAN_DMG = 1.5;
function titanOf(idx, rang, heroLevel) {
  var t = TITANS[(idx || 0) % TITANS.length], s = SPECIES[t.species], lvl = Math.max(1, heroLevel || 1), pal = {};
  Object.keys(s.pal).forEach(function (k) { pal[k] = k === 'k' || !/^#[0-9a-f]{6}$/i.test(s.pal[k]) ? s.pal[k] : hueShift(s.pal[k], t.hue, 1.15); });
  var w = Math.max(0, BIOMES.map(function (b) { return b.id; }).indexOf(t.biome));
  return {
    name: t.name + (rang ? ' ' + ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Math.min(9, rang)] : ''), species: t.species, pal: pal, biome: w,
    scale: 140 / (s.size === 32 ? 96 : 48), level: lvl, rank: 'boss', behavior: s.behavior,
    dmg: Math.round((2 + 0.95 * lvl) * MONSTER_POWER.dmg * TITAN_DMG * (1 + 0.05 * Math.min(10, rang || 0))), agi: 6 + lvl * 0.6, dodge: 0.05
  };
}

// ---------- Méditation au camp : la grenouille médite sur un nénuphar, même quand on n'est pas là ----------
// Un petit plus, pas un raccourci : par heure, environ la moitié de l'XP d'un combat de son niveau et un peu de
// lucioles, jusqu'à MEDITATION_MAX_H heures (au-delà, elle médite pour rien). On récolte en se levant, ou en revenant.
var MEDITATION_MAX_H = 10;
// par heure : ~1/8 de niveau, calé sur la terre où l'on en est (le niveau de ses monstres) ; une grenouille qui la
// dépasse de loin gagne bien moins, comme contre ses monstres (sinon elle montait de 1,2 niveau par jour sans jouer)
function frontierLevel(save) {
  var cur = 0;
  for (var i = 0; i < BIOMES.length; i++) if (worldUnlocked(save, i)) cur = i;
  return (save.cycle || 1) > 1 ? save.level : stageLevel(cur, Math.min(STAGES, (save.progress[cur] || 0) + 1)); // (dans un cycle, les monstres sont à son niveau)
}
function meditationRates(save) {
  var f = frontierLevel(save);
  return { xp: Math.round(xpForLevel(Math.min(save.level, f)) * 0.12 * xpGapMult(save.level, f)), gold: Math.round(0.6 * (6 + 3 * save.level)) };
}
function meditationGain(save, now) {
  var m = save.meditation;
  if (!m) return null;
  var ms = Math.max(0, Math.min(MEDITATION_MAX_H * 3600e3, (now || Date.now()) - m.since)), h = ms / 3600e3, r = meditationRates(save);
  return { ms: ms, full: ms >= MEDITATION_MAX_H * 3600e3, xp: clanXp(Math.floor(r.xp * h), eventBoostOver('xp', m.since, m.since + ms)), gold: clanGold(Math.floor(r.gold * h)) }; // avec les bonus du clan (et l'XP double pour les heures du week-end seulement)
}
// Récolte ce qui a été gagné ; again : elle continue de méditer (au retour), sinon elle se lève
function claimMeditation(save, again) {
  var g = meditationGain(save);
  if (!g) return null;
  save.gold += g.gold;
  g.levels = g.xp ? gainXp(save, g.xp, 'meditation') : 0;
  save.meditation = again ? { since: Date.now() } : null;
  return g;
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
  return { gold: Math.round((5 + 2 * lvl) * e.gold), xp: Math.round(xpForLevel(lvl) * 0.06 * e.xp), item: e.item };
}

function startExpedition(save, w, st, id) {
  var e = EXPEDITIONS.filter(function (x) { return x.id === id; })[0];
  var r = expeditionRewards(w, st, e);
  save.expedition = { w: w, st: st, id: id, name: e.name, start: Date.now(), endsAt: Date.now() + e.secs * 1000, gold: r.gold, xp: r.xp, item: r.item };
}

function expeditionLeft(save) { return save.expedition ? Math.max(0, save.expedition.endsAt - Date.now()) : 0; }

// ---------- Boutique de l'Aïeule Gamako ----------
var TEA_ID = 'the_oubli';
var TEA = { name: 'Thé de l’oubli', price: 80, desc: 'Une tisane amère : oublie ta voie et tout le Temple, et rend les points.' };
var SHOP_SIZE = 5, SHOP_REROLL = 25, SHOP_REROLL_MAX = 5;
// Le jour du joueur (« 2026-9-29 ») : l'étal se renouvelle tout seul chaque jour
function dayKey(t) { var d = t ? new Date(t) : new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
// Les trois skins en vente aujourd'hui : tirés au sort d'après la date, les mêmes pour toutes les grenouilles
var SKINS_PER_DAY = 3;
function skinsOfDay(t) {
  var ids = Object.keys(PREMIUM_SKINS).filter(function (id) { return !PREMIUM_SKINS[id].reward; }), key = dayKey(t), seed = 7, out = [];
  for (var i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) % 2147483647;
  while (out.length < Math.min(SKINS_PER_DAY, ids.length)) {
    seed = (seed * 48271) % 2147483647;
    var id = ids[seed % ids.length];
    if (out.indexOf(id) < 0) out.push(id);
  }
  return out;
}
// Les relances du jour : SHOP_REROLL_MAX au plus, et chacune coûte le double de la précédente (le prix suit le niveau)
function rerollState(save) {
  var n = save.shopDay === dayKey() ? (save.rerolls || 0) : 0;
  return { n: n, left: Math.max(0, SHOP_REROLL_MAX - n), price: Math.round((SHOP_REROLL + 4 * save.level) * Math.pow(2, n)) };
}
// Un nouvel arrivage chaque jour (gratuit) ; renvoie vrai s'il vient d'arriver
function dailyShop(save) {
  if (save.shopDay === dayKey() && save.shop.length) return false;
  refreshShop(save); save.shopDay = dayKey(); save.rerolls = 0;
  return true;
}

// Le rang de l'étal : sur l'île, un rang d'avance (jusqu'au 6) ; sur le Continent, celui de la terre atteinte
// Le rang du butin d'une terre : le sien, et dans un cycle le plus haut (avec son « + »)
function lootTier(save, w) { return (save.cycle || 1) > 1 ? Math.max(CYCLE_TIER, w + 1) : w + 1; }
function shopTier(save) {
  var maxTier = 1;
  for (var w = 0; w < BIOMES.length; w++) if (worldUnlocked(save, w)) maxTier = w < ISLAND_WORLDS ? Math.min(6, w + 2) : w + 1;
  return (save.cycle || 1) > 1 ? Math.max(CYCLE_TIER, maxTier) : maxTier; // (dans un cycle, le rang du Cœur de la Terre, ou de l'Éclipse atteinte)
}
function refreshShop(save) {
  var stock = [];
  while (stock.length < SHOP_SIZE) stock.push(rollItem(save, pickBase(shopTier(save), save), rollRarity('shop')));
  save.shop = stock.concat([TEA_ID]);
}
// L'étal ne garde que ce que la grenouille peut porter : chaque objet qui ne lui sert plus est remplacé
function tidyShop(save) {
  var stock = save.shop.filter(function (id) { return id !== TEA_ID; }), kept = stock.filter(function (id) { return itemAvailable(save, id); });
  for (var i = kept.length; i < stock.length; i++) kept.push(rollItem(save, pickBase(shopTier(save), save), rollRarity('shop')));
  save.shop = kept.concat([TEA_ID]);
}
