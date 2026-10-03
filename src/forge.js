// La Forge, les Panoplies d'Uniques et les Compagnons : de quoi faire grandir son équipement au-delà du butin.

// ---------- La Forge ----------
// Recycler un objet donne des éclats de jade, selon sa rareté et son rang (et une part de ce qu'on a mis dans sa forge) ;
// renforcer un exemplaire (+1 à +FORGE_MAX, voir items.js) coûte des éclats, de plus en plus, et un peu de lucioles.
// L'unité : un objet Commun du rang t vaut eclatUnit(t) éclats ; passer de +k à +k+1 en coûte (k + 1) unités.
// De +0 à +10 : 55 unités, une cinquantaine de Communs ou une dizaine d'Épiques du même rang.
var SALVAGE_RAR = { commun: 1, rare: 2.5, epique: 6, unique: 15, legendaire: 15 };
function eclatUnit(tier) { return 1 + 0.5 * Math.max(1, tier); }
function forgeOf(id) { var it = ITEMS[id]; return (it && it.forge) || 0; }
function forgeable(id) { return String(id).indexOf('#') > 0 && !!ITEMS[id] && !!ITEMS[id].raw; } // un exemplaire trouvé (pas un trésor fixe)
function forgeCost(id) {
  var k = forgeOf(id), u = eclatUnit(tierOf(id));
  return { eclats: Math.round(u * (k + 1)), gold: Math.round((20 + 6 * tierOf(id) * tierOf(id)) * RARITIES[rarityOf(id)].price * 0.15 * (k + 1)) };
}
function salvageValue(id) {
  var it = ITEMS[id];
  if (!it) return 0;
  var u = eclatUnit(tierOf(id)), k = forgeOf(id), r = it.reward ? 4 : (SALVAGE_RAR[rarityOf(id)] || 1);
  return Math.max(1, Math.round(u * r + u * k * (k + 1) / 4)); // (la moitié des éclats mis dans sa forge reviennent)
}
// Renforce un exemplaire d'un niveau ; renvoie vrai si c'est fait
function forgeItem(save, id) {
  if (!forgeable(id) || forgeOf(id) >= FORGE_MAX || !save.items[id]) return false;
  var c = forgeCost(id);
  if ((save.eclats || 0) < c.eclats || save.gold < c.gold) return false;
  save.eclats -= c.eclats; save.gold -= c.gold;
  save.items[id].forge = forgeOf(id) + 1;
  registerItem(id, save.items[id]);
  return true;
}
// Recycle des objets (jamais ceux qu'on porte) ; renvoie les éclats gagnés et combien d'objets
function salvageItems(save, ids) {
  var worn = SLOTS.map(function (s) { return save.equip[s.id]; }), n = 0, total = 0;
  ids.forEach(function (id) {
    if (save.owned.indexOf(id) < 0 || worn.indexOf(id) >= 0) return;
    total += salvageValue(id); n++;
    save.owned.splice(save.owned.indexOf(id), 1);
  });
  save.eclats = (save.eclats || 0) + total;
  return { eclats: total, n: n };
}

// ---------- Les Panoplies d'Uniques ----------
// Les Uniques d'un même donjon forment une panoplie : en porter 2, 3 ou 4 donne un bonus de plus à chaque palier.
// Six sortes de panoplies, une par donjon à tour de rôle.
var SET_AT = [2, 3, 4];
var SET_KINDS = [
  { id: 'colosse', name: 'du Colosse', tiers: [{ hp: 0.1 }, { reduce: 0.05 }, { hp: 0.1, dmg: 0.06 }] },
  { id: 'fauve', name: 'du Fauve', tiers: [{ dmg: 0.08 }, { crit: 0.04 }, { critDmg: 0.25 }] },
  { id: 'ombre', name: 'de l’Ombre', tiers: [{ dodge: 0.03 }, { crit: 0.03 }, { dmg: 0.1 }] },
  { id: 'sage', name: 'du Sage', tiers: [{ spell: 0.1 }, { hp: 0.08 }, { spell: 0.12 }] },
  { id: 'fortune', name: 'de Fortune', tiers: [{ xp: 0.1 }, { gold: 0.15 }, { loot: 0.2 }] },
  { id: 'sang', name: 'du Sang', tiers: [{ lifesteal: 0.04 }, { hp: 0.08 }, { dmg: 0.08 }] }
];
function setOf(d) { return SET_KINDS[d.n % SET_KINDS.length]; }
function setName(d) { return 'Panoplie ' + d.of; }
// Les Uniques portés, rangés par donjon : { d3: 2, … }
function setCounts(equip) {
  var c = {};
  Object.keys(equip || {}).forEach(function (slot) { var it = ITEMS[equip[slot]]; if (it && it.rarity === 'unique' && it.dungeon) c[it.dungeon] = (c[it.dungeon] || 0) + 1; });
  return c;
}
// Les paliers atteints d'une panoplie (0 à 3)
function setTier(n) { return SET_AT.filter(function (k) { return n >= k; }).length; }
var BONUS_WORDS = {
  hp: function (v) { return '+' + Math.round(v * 100) + ' % de PV'; }, dmg: function (v) { return '+' + Math.round(v * 100) + ' % de dégâts'; },
  crit: function (v) { return '+' + Math.round(v * 100) + ' % de critique'; }, critDmg: function (v) { return '+' + Math.round(v * 100) + ' % de dégâts critiques'; },
  dodge: function (v) { return '+' + Math.round(v * 100) + ' % d’esquive'; }, spell: function (v) { return '+' + Math.round(v * 100) + ' % de puissance des sorts'; },
  reduce: function (v) { return '−' + Math.round(v * 100) + ' % de dégâts reçus'; }, lifesteal: function (v) { return Math.round(v * 100) + ' % de vol de vie'; },
  xp: function (v) { return '+' + Math.round(v * 100) + ' % d’XP'; }, gold: function (v) { return '+' + Math.round(v * 100) + ' % de lucioles'; },
  loot: function (v) { return '+' + Math.round(v * 100) + ' % de chances d’objet'; }
};
function bonusText(b) { return Object.keys(b).filter(function (k) { return b[k]; }).map(function (k) { return BONUS_WORDS[k](b[k]); }).join(', '); }

// ---------- Les Compagnons ----------
// Le petit d'un boss de donjon peut suivre la grenouille (au fond du donjon : 50 % la première fois, 20 % au boss du
// jour). Un compagnon donne un petit bonus, et en combat (sauf en duel et à la guerre), il attaque tous les PET_EVERY
// tours de la grenouille. Le retrouver une nouvelle fois le fait grandir d'un niveau, jusqu'à PET_MAX_LEVEL.
var PET_EVERY = 2;
var PET_CHANCE = { first: 0.5, daily: 0.2 };
var PET_NAMES = ['Glouton', 'Spore', 'Écho', 'Gloubi', 'Farine', 'Boulon', 'Brindille', 'Dardinet', 'Frimas', 'Braisillon',
  'Osselet', 'Paillette', 'Plumeau', 'Bobine', 'Cadenas', 'Pupille', 'Zigzag', 'Bourgeon', 'Monocle', 'Ventouse',
  'Flammèche', 'Pénombre', 'Tison', 'Nuage', 'Glaçon', 'Caillou', 'Pince', 'Enclume', 'Tourbillon', 'Miette'];
var PET_KINDS = [
  { id: 'vie', key: 'hp', base: 0.04 }, { id: 'force', key: 'dmg', base: 0.04 }, { id: 'flair', key: 'loot', base: 0.08 },
  { id: 'savoir', key: 'xp', base: 0.06 }, { id: 'bourse', key: 'gold', base: 0.08 }
];
var PETS = DUNGEONS.map(function (d, i) {
  return { id: d.id, d: d, name: PET_NAMES[i] || d.boss.name, species: d.boss.species, pal: d.boss.pal, kind: PET_KINDS[i % PET_KINDS.length],
    desc: 'Le petit de ' + d.boss.name + ' : il a quitté ' + d.name.charAt(0).toLowerCase() + d.name.slice(1) + ' pour te suivre.' };
});
function petById(id) { return PETS.filter(function (p) { return p.id === id; })[0] || null; }
function petLevel(save, id) { return (save.pets && save.pets[id]) || 0; }
function petBonus(pet, lvl) { var o = {}; o[pet.kind.key] = pet.kind.base * (1 + 0.15 * (Math.max(1, lvl) - 1)); return o; }
function petPower(lvl) { return 0.3 + 0.03 * (Math.max(1, lvl) - 1); } // la part des dégâts de la grenouille à chaque attaque
// Au fond d'un donjon : le petit du boss suit peut-être la grenouille ; renvoie { pet, lvl, up } ou null
function petDrop(save, d, daily) {
  var pet = petById(d.id);
  if (!pet || Math.random() > (daily ? PET_CHANCE.daily : PET_CHANCE.first)) return null;
  save.pets = save.pets || {};
  var had = petLevel(save, pet.id);
  if (had >= PET_MAX_LEVEL) { var e = Math.round(eclatUnit(dungeonTier(d)) * 10); save.eclats = (save.eclats || 0) + e; return { pet: pet, lvl: had, max: true, eclats: e }; }
  save.pets[pet.id] = had + 1;
  if (!save.pet) save.pet = pet.id; // le premier compagnon suit la grenouille tout de suite
  return { pet: pet, lvl: had + 1, up: had > 0 };
}
// Ses images, tournées vers la droite (il se bat aux côtés de la grenouille)
var petImgCache = {};
function petFrames(pet) {
  if (!petImgCache[pet.id]) { var s = SPECIES[pet.species]; petImgCache[pet.id] = s.frames.map(function (f) { return stringsToCanvas(f, Object.assign({}, s.pal, pet.pal), true); }); }
  return petImgCache[pet.id];
}

// ---------- Tout ce que donnent les panoplies et le compagnon ----------
// { hp, dmg, crit, critDmg, dodge, spell, reduce, lifesteal, xp, gold, loot } (combatProfile, clanXp, clanGold, rollLoot)
function gearBonus(save) {
  var out = {}, add = function (b) { Object.keys(b).forEach(function (k) { out[k] = (out[k] || 0) + b[k]; }); };
  var counts = setCounts(save.equip);
  Object.keys(counts).forEach(function (id) { var d = dungeonById(id); if (d) setOf(d).tiers.slice(0, setTier(counts[id])).forEach(add); });
  var pet = save.pet && petById(save.pet), lvl = pet ? petLevel(save, pet.id) : 0;
  if (pet && lvl) add(petBonus(pet, lvl));
  return out;
}
