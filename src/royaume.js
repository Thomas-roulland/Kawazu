// Le Royaume sous la Terre : six terres sous le monde, après l'Archipel des Brumes. Une fissure s'ouvre au pied du Mont
// aux Mille Tempêtes : en dessous, des cavernes qui murmurent, une forêt de champignons géants, un lac où le soleil n'a
// jamais brillé, des mines de cristal, la cité engloutie d'un peuple disparu, et le cœur brûlant du monde. Ses créatures
// sont sculptées comme celles de l'Archipel (sculpt, colosses.js), en 32 × 32 de taille normale, et la force y suit la
// pente douce du Continent.

// ---------- Les créatures ----------
var ROYAUME_SPECIES = {
  // la taupe mineuse : ronde, le museau rose, de grosses griffes, un casque et sa lampe
  taupe: {
    behavior: 'walker', xp: 8, hp: 15, speed: 14, chase: 24, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#241c24', 2: '#5a4a52', 3: '#8a7a82', p: '#f0a0b0', P: '#b86a7a', h: '#e0b43a', H: '#8a6a1a', y: '#fff080', w: '#f4f4e8', b: '#100c10' },
    frames: [sculpt(32, function (S) {
      S.path([[27, 21], [30, 24]], '2', 1.2, 0.5); // la queue
      S.rect(20, 25, 4, 5, '2'); S.rect(13, 26, 4, 4, '2'); // les pattes arrière
      S.ell(17, 20, 10, 8, '2'); // le corps
      S.ell(9, 16, 7, 6, '2'); S.ell(3, 17, 2.5, 1.8, 'p'); S.rect(6, 15, 2, 1, 'b'); S.px(7, 14, 'w'); // la tête, le museau, l'œil plissé
      S.ell(9, 10, 6, 3, 'h'); S.rect(3, 11, 12, 2, 'h'); S.rect(8, 5, 3, 3, 'y'); // le casque et sa lampe
      S.ell(5, 24, 3.5, 2.5, 'p'); [[3, 26], [5, 27], [7, 27]].forEach(function (c) { S.line(c[0], c[1], c[0] - 2, c[1] + 2, 'p', 0.6, 0.4); }); // la grosse patte griffue
    }, { 2: ['3', '1'], p: [null, 'P'], h: [null, 'H'] })]
  },
  // le ver des galeries : un anneau après l'autre, il sort de terre, la gueule ronde pleine de dents
  ver: {
    behavior: 'dasher', xp: 8, hp: 14, speed: 20, chase: 34, dash: 190, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#6a2a3a', 2: '#c06a7a', 3: '#f0a0a8', s: '#8a3a4a', g: '#5a4a3a', G: '#3a2e22', w: '#f4f4e8', b: '#200810' },
    frames: [sculpt(32, function (S) {
      S.ell(20, 29, 10, 2, 'g'); // le monticule de terre
      S.path([[22, 29], [25, 22], [21, 15], [13, 11], [8, 10]], '2', 4.2, 3.4); // le corps
      [[24, 25], [23, 19], [17, 13], [12, 11]].forEach(function (p) { S.line(p[0] - 3, p[1] - 2, p[0] + 2, p[1] + 3, 's', 0.4); }); // les anneaux
      S.ell(6, 10, 4.2, 4.2, '2'); S.ell(5, 10, 2.6, 2.6, 'b'); // la gueule
      [[3, 8], [5, 7], [7, 8], [3, 12], [5, 13], [7, 12]].forEach(function (p) { S.px(p[0], p[1], 'w'); }); // les dents
    }, { 2: ['3', '1'], g: [null, 'G'] })]
  },
  // le champignon errant : un grand chapeau aux taches qui brillent, deux petits pieds, des yeux sous le bord
  myco: {
    behavior: 'walker', xp: 7, hp: 13, speed: 12, chase: 20, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#3a1a5a', 2: '#7a3ab0', 3: '#b07ae0', s: '#6af0d0', S: '#2a9a8a', t: '#e8dcc8', T: '#a89a80', b: '#140a1e' },
    frames: [sculpt(32, function (S) {
      S.rect(11, 18, 10, 9, 't'); S.rect(11, 27, 3, 3, 't'); S.rect(18, 27, 3, 3, 't'); // le pied, les petits pieds
      S.px(13, 21, 'b'); S.px(17, 21, 'b'); S.rect(14, 24, 3, 1, 'T'); // les yeux, la bouche
      S.ell(16, 12, 14, 7, '2'); S.rect(3, 15, 26, 2, '1'); // le chapeau, ses lamelles
      [[9, 9, 2], [17, 7, 2.4], [23, 11, 1.8], [13, 13, 1.4], [26, 14, 1]].forEach(function (p) { S.ell(p[0], p[1], p[2], p[2], 's'); }); // les taches qui brillent
    }, { 2: ['3', '1'], t: [null, 'T'], s: [null, 'S'] })]
  },
  // l'escargot luisant : une coquille en spirale qui éclaire la caverne, deux yeux au bout des cornes
  escargot: {
    behavior: 'walker', xp: 7, hp: 14, speed: 10, chase: 18, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#2a3a3a', 2: '#5a8a8a', 3: '#9ad0c8', c: '#e0b43a', C: '#8a6a1a', g: '#ffe080', b: '#0a1414' },
    frames: [sculpt(32, function (S) {
      S.ell(16, 27, 14, 3, '2'); S.ell(5, 23, 4, 3.5, '2'); // le pied, la tête
      S.line(3, 21, 1, 15, '2', 0.7, 0.5); S.line(7, 21, 7, 15, '2', 0.7, 0.5); S.px(1, 14, 'b'); S.px(7, 14, 'b'); // les cornes, les yeux
      S.ell(19, 16, 10, 9, 'c'); S.ell(19, 16, 6.5, 5.5, 'C'); S.ell(19, 16, 4, 3.4, 'c'); S.ell(19, 16, 1.4, 1.4, 'g'); // la coquille en spirale
    }, { 2: ['3', '1'], c: ['g', 'C'] })]
  },
  // l'axolotl : rose, la peau lisse, des branchies en plumeaux et un sourire
  axolotl: {
    behavior: 'dasher', xp: 8, hp: 13, speed: 22, chase: 38, dash: 200, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#a84a6a', 2: '#f08aa8', 3: '#ffc0d0', g: '#c82a5a', G: '#ff6a8a', b: '#1a0a10' },
    frames: [sculpt(32, function (S) {
      S.path([[18, 22], [25, 21], [31, 16]], '2', 3, 0.7); // la queue
      S.ell(16, 22, 8, 5, '2'); S.rect(10, 25, 3, 5, '2'); S.rect(19, 25, 3, 5, '2'); // le corps, les pattes
      S.ell(8, 17, 7, 5, '2'); // la tête
      S.line(12, 14, 16, 9, 'g', 0.9, 0.5); S.line(10, 13, 11, 7, 'g', 0.9, 0.5); S.line(13, 16, 18, 13, 'g', 0.9, 0.5); // les branchies
      S.px(5, 16, 'b'); S.px(9, 16, 'b'); S.line(3, 19, 8, 20, '1', 0.3); // les yeux, le sourire
    }, { 2: ['3', '1'], g: ['G', null] })]
  },
  // la baudroie : un poisson rond et noir, une gueule de crocs, et une lumière au bout d'une tige
  baudroie: {
    behavior: 'flyer', xp: 8, hp: 13, speed: 24, chase: 46, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#14182a', 2: '#2a3a5a', 3: '#4a5a8a', w: '#f4f4e8', y: '#fff080', Y: '#ffd040', b: '#05060a' },
    frames: [sculpt(32, function (S) {
      S.path([[24, 15], [28, 11], [31, 7]], '2', 1.4, 0.5); S.path([[24, 19], [28, 23], [31, 27]], '2', 1.4, 0.5); // la queue
      S.ell(15, 17, 11, 9, '2'); S.path([[16, 23], [14, 28]], '3', 1.1, 0.4); // le corps, la nageoire
      S.ell(6, 20, 5, 4, 'b'); [[3, 17], [5, 17], [7, 17], [4, 23], [6, 23], [8, 23]].forEach(function (p) { S.px(p[0], p[1], 'w'); }); // la gueule et ses crocs
      S.ell(11, 13, 1.6, 1.6, 'w'); S.px(11, 13, 'b'); // l'œil
      S.path([[13, 8], [9, 3], [5, 4]], '1', 0.5, 0.4); S.ell(4, 5, 2, 2, 'y'); // la tige et sa lumière
    }, { 2: ['3', '1'], y: [null, 'Y'] })]
  },
  // le golem de cristal : un rocher qui marche, des cristaux plantés dans le dos, un cœur qui brille
  geode: {
    behavior: 'walker', xp: 9, hp: 17, speed: 12, chase: 20, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#3a3440', 2: '#6a6070', 3: '#9a90a0', c: '#c080ff', C: '#7a3ab0', l: '#f0d0ff', y: '#ff80ff' },
    frames: [sculpt(32, function (S) {
      [[[16, 12], [14, 3]], [[20, 13], [23, 4]], [[24, 15], [29, 9]], [[12, 13], [9, 6]]].forEach(function (c) { S.path(c, 'c', 1.9, 0.4); }); // les cristaux du dos
      S.rect(8, 25, 5, 5, '2'); S.rect(19, 25, 5, 5, '2'); // les jambes
      S.ell(16, 19, 11, 8, '2'); S.ell(4, 21, 3, 4, '2'); S.ell(28, 20, 2.5, 3, '2'); // le corps, les bras
      S.ell(7, 12, 5, 4, '2'); S.px(4, 12, 'y'); S.px(5, 12, 'y'); // la tête, l'œil
      S.ell(16, 20, 3, 3, 'c'); // le cœur de cristal
    }, { 2: ['3', '1'], c: ['l', 'C'] })]
  },
  // le scarabée-rhinocéros : une carapace qui luit, une grande corne recourbée, six pattes
  scarabee: {
    behavior: 'dasher', xp: 8, hp: 15, speed: 20, chase: 34, dash: 200, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#1a3a2a', 2: '#2a7a5a', 3: '#6ad0a0', h: '#3a2a1a', H: '#6a4a2a', w: '#e0fff0' },
    frames: [sculpt(32, function (S) {
      [[10, 22, 6, 28], [14, 23, 12, 29], [19, 23, 20, 29], [23, 22, 27, 28]].forEach(function (l) { S.line(l[0], l[1], l[2], l[3], 'h', 0.6, 0.5); }); // les pattes
      S.ell(18, 17, 11, 8, '2'); S.line(18, 10, 20, 24, '1', 0.3); // la carapace, sa fente
      S.ell(7, 18, 4, 4, '2'); S.px(6, 17, 'w'); // la tête, l'œil
      S.path([[5, 16], [2, 10], [4, 4]], 'h', 1.5, 0.5); // la corne
    }, { 2: ['3', '1'], h: ['H', null] })]
  },
  // le gardien de pierre : une statue qui marche, une lance, des runes qui brillent et de la mousse
  gardien: {
    behavior: 'walker', xp: 9, hp: 18, speed: 10, chase: 18, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#4a4a42', 2: '#8a8a7a', 3: '#b8b8a8', g: '#4a8a4a', r: '#6af0ff', R: '#2a8ab0', s: '#a88a4a' },
    frames: [sculpt(32, function (S) {
      S.line(5, 4, 5, 30, 's', 0.6); S.path([[5, 1], [3, 5], [7, 5]], '3', 0.9, 0.9); // la lance
      S.rect(11, 24, 4, 6, '2'); S.rect(18, 24, 4, 6, '2'); // les jambes
      S.rect(10, 13, 13, 12, '2'); S.rect(6, 14, 5, 4, '2'); S.rect(23, 14, 3, 7, '2'); // le torse, les bras
      S.rect(12, 4, 9, 9, '2'); S.rect(13, 7, 2, 2, 'r'); S.rect(18, 7, 2, 2, 'r'); // la tête, les yeux
      S.rect(14, 17, 5, 1, 'r'); S.rect(16, 16, 1, 4, 'r'); // la rune
      [[11, 13], [20, 4], [19, 24], [10, 21], [22, 14]].forEach(function (p) { S.px(p[0], p[1], 'g'); }); // la mousse
    }, { 2: ['3', '1'], r: [null, 'R'] })]
  },
  // le ver du cœur du monde : une tête à cornes, une gueule de feu, un corps de roche fendu de lave
  wyrm: {
    behavior: 'dasher', xp: 0, hp: 30, speed: 22, chase: 40, dash: 230, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#2a0a08', 2: '#5a1e14', 3: '#8a3a24', l: '#ff8a2a', L: '#ffd040', y: '#fff080', w: '#f4f4e8', b: '#0a0204' },
    frames: [sculpt(32, function (S) {
      S.path([[30, 30], [24, 28], [20, 23], [24, 17], [28, 12], [24, 7]], '2', 3.6, 2.6); // le corps enroulé
      S.path([[24, 7], [17, 6], [11, 9]], '2', 2.8, 4.2); // le cou
      S.ell(8, 13, 7, 6, '2'); S.ell(3, 17, 3, 2.2, 'b'); [[1, 15], [3, 15], [5, 15]].forEach(function (p) { S.px(p[0], p[1], 'w'); }); // la tête, la gueule, les crocs
      S.path([[10, 8], [13, 3], [17, 1]], '3', 1, 0.4); S.path([[6, 8], [5, 3], [7, 1]], '3', 0.9, 0.3); // les cornes
      S.ell(6, 11, 1.6, 1, 'y'); // l'œil
      S.path([[22, 26], [24, 21], [23, 18]], 'l', 0.6); S.path([[26, 14], [25, 9]], 'l', 0.5); S.path([[16, 7], [13, 10]], 'l', 0.5); S.px(10, 16, 'l'); // les fentes de lave
    }, { 2: ['3', '1'], l: ['L', null] })]
  }
};
Object.keys(ROYAUME_SPECIES).forEach(function (id) {
  SPECIES[id] = ROYAUME_SPECIES[id];
  var s = SPECIES[id], f = s.frames[0], n = f.length;
  if (s.frames.length < 2) s.frames.push(f.map(function (r, y) { return y === 0 ? '.'.repeat(r.length) : (y < n - 3 ? f[y - 1] : r); }));
});

// ---------- Les six terres du Royaume ----------
var ROYAUME_FROM = BIOMES.length;
BIOMES.push(
  {
    id: 'cavernes', name: 'Les Cavernes Murmurantes', royaume: true, monsterScale: 0.8, tagline: 'Sous la fissure, des galeries à perte de vue. Les murs y chuchotent, et quelqu’un creuse encore.',
    wall: 'rock', block: 'boulder', bush: 'drygrass', alt: 'stone', water: true,
    pal: {
      ground: '#4a4048', groundLight: '#6a5e66', groundDark: '#352d34', alt: '#8a7e86',
      wall: '#2a2228', wallLight: '#4a3e46', wallDark: '#161216', accent: '#6af0d0',
      water: '#2a3a4a', waterLight: '#3a5a6a', waterEdge: '#6a9aa8',
      block: '#6a5e66', blockLight: '#8a7e86', blockDark: '#3a3036',
      bush: '#5a5040', bushLight: '#8a7a5a', bushDark: '#3a3228', door: '#3a2a1a'
    },
    monsters: [{ species: 'taupe', name: 'Taupe mineuse' }, { species: 'ver', name: 'Ver des galeries' }, { species: 'escargot', name: 'Escargot luisant' }],
    boss: { species: 'taupe', name: 'La Reine-Taupe', pal: { 2: '#3a3038', 3: '#6a5a62', 1: '#140c12', h: '#ffd040', H: '#a87a10', y: '#ff5a5a' } }
  },
  {
    id: 'champignons', name: 'La Forêt de Champignons géants', royaume: true, monsterScale: 0.8, tagline: 'Des champignons hauts comme des arbres, qui éclairent la nuit éternelle. Leurs spores font rêver.',
    wall: 'trunks', block: 'mushroom', bush: 'ferns', alt: 'puddle', water: true,
    pal: {
      ground: '#3a2a4a', groundLight: '#5a4a6a', groundDark: '#2a1e38', alt: '#4a6a7a',
      wall: '#c8b8d8', wallLight: '#e8dcf0', wallDark: '#8a7a9a', accent: '#6af0d0',
      water: '#2a3a5a', waterLight: '#4a5a8a', waterEdge: '#8ab0d0',
      block: '#a04ad0', blockLight: '#d08af0', blockDark: '#5a2a7a',
      bush: '#3a6a6a', bushLight: '#6ab0a0', bushDark: '#1e3a3a', door: '#2a1e38'
    },
    monsters: [{ species: 'myco', name: 'Champignon errant' }, { species: 'escargot', name: 'Escargot des spores', pal: { c: '#b07ae0', C: '#5a2a8a', g: '#6af0d0' } }, { species: 'scarabee', name: 'Scarabée des spores', pal: { 2: '#7a3ab0', 3: '#c07af0', 1: '#3a1a5a' } }],
    boss: { species: 'myco', name: 'Le Champignon-Roi', pal: { 2: '#c83a3a', 3: '#ff7a6a', 1: '#6a1010', s: '#ffffff', S: '#d8d0c8' } }
  },
  {
    id: 'lac', name: 'Le Lac sans Soleil', royaume: true, monsterScale: 0.8, tagline: 'Une mer sous la terre, noire et immobile. Tout ce qui y vit a oublié la lumière, sauf une.',
    wall: 'rock', block: 'crystal', bush: 'reeds', alt: 'puddle', water: true,
    pal: {
      ground: '#2a3448', groundLight: '#3a4a62', groundDark: '#1e2636', alt: '#4a6a8a',
      wall: '#141c2a', wallLight: '#2a3448', wallDark: '#0a0e16', accent: '#fff080',
      water: '#0e1a30', waterLight: '#1e2e4a', waterEdge: '#4a6a9a',
      block: '#4a8ab0', blockLight: '#8ac8e8', blockDark: '#2a4a6a',
      bush: '#2a4a5a', bushLight: '#4a7a8a', bushDark: '#162a34', door: '#0a0e16'
    },
    monsters: [{ species: 'axolotl', name: 'Axolotl des eaux noires' }, { species: 'baudroie', name: 'Poisson-lanterne' }, { species: 'escargot', name: 'Escargot des rives', pal: { 2: '#3a5a8a', 3: '#6a8ac0', 1: '#1a2a4a', c: '#a0c0e0', C: '#4a6a9a', g: '#e0f0ff' } }],
    boss: { species: 'baudroie', name: 'La Baudroie des Abîmes', pal: { 2: '#1a1a2a', 3: '#3a3a5a', 1: '#08080e', y: '#6af0ff', Y: '#2a9ab0' } }
  },
  {
    id: 'cristaux', name: 'Les Mines de Cristal', royaume: true, monsterScale: 0.8, tagline: 'Des galeries tapissées de cristaux qui chantent quand on les frôle. Les golems n’aiment pas la musique.',
    wall: 'rock', block: 'crystal', bush: 'drygrass', alt: 'rails', water: false,
    pal: {
      ground: '#4a3a5a', groundLight: '#6a5a7a', groundDark: '#382a46', alt: '#a07ac0',
      wall: '#2a1e3a', wallLight: '#4a3a5a', wallDark: '#160e22', accent: '#ff80ff',
      water: '#3a2a5a', waterLight: '#5a4a7a', waterEdge: '#a08ac0',
      block: '#c080ff', blockLight: '#f0d0ff', blockDark: '#7a3ab0',
      bush: '#6a5a7a', bushLight: '#9a8ab0', bushDark: '#3a2e4a', door: '#160e22'
    },
    monsters: [{ species: 'geode', name: 'Golem de cristal' }, { species: 'taupe', name: 'Taupe des cristaux', pal: { h: '#c080ff', H: '#7a3ab0', y: '#f0d0ff' } }, { species: 'scarabee', name: 'Scarabée de quartz', pal: { 2: '#a8a0c8', 3: '#e8e0ff', 1: '#5a5078' } }],
    boss: { species: 'geode', name: 'Le Colosse de Quartz', pal: { 2: '#a8a0b8', 3: '#e0d8f0', 1: '#5a5068', c: '#6af0ff', C: '#2a8ab0', l: '#e0ffff', y: '#ffffff' } }
  },
  {
    id: 'cite', name: 'La Cité Engloutie', royaume: true, monsterScale: 0.8, tagline: 'Les ruines d’un peuple qui vivait sous la terre. Ses statues montent encore la garde.',
    wall: 'ruins', block: 'tomb', bush: 'round', alt: 'stone', ground: 'slabs', water: true,
    pal: {
      ground: '#4a5a52', groundLight: '#6a7a72', groundDark: '#36443e', alt: '#8aa098',
      wall: '#2a3a34', wallLight: '#4a5a52', wallDark: '#18241f', accent: '#e0b43a',
      water: '#1a3a3a', waterLight: '#2a5a5a', waterEdge: '#6aa0a0',
      block: '#8a8a7a', blockLight: '#b8b8a8', blockDark: '#4a4a42',
      bush: '#3a6a4a', bushLight: '#5a8a6a', bushDark: '#1e3a28', door: '#18241f'
    },
    monsters: [{ species: 'gardien', name: 'Statue animée' }, { species: 'axolotl', name: 'Axolotl doré', pal: { 2: '#e0b43a', 3: '#fff0a0', 1: '#8a6a10', g: '#6af0ff', G: '#c8ffff' } }, { species: 'ver', name: 'Ver des ruines', pal: { 2: '#8a8a6a', 3: '#b8b89a', 1: '#4a4a3a', s: '#5a5a4a' } }],
    boss: { species: 'gardien', name: 'Le Dernier Gardien', pal: { 2: '#c8a040', 3: '#f0d070', 1: '#6a5010', r: '#ff5a5a', R: '#a01a1a', s: '#3a2a1a' } }
  },
  {
    id: 'coeur', name: 'Le Cœur de la Terre', royaume: true, monsterScale: 0.8, bossScale: 1.25, tagline: 'Tout au fond, la roche fond et le monde bat comme un cœur. Quelque chose s’y enroule depuis toujours.',
    wall: 'rock', block: 'boulder', bush: 'flames', alt: 'embers', ground: 'ash', water: false,
    pal: {
      ground: '#3a2a26', groundLight: '#5a3e34', groundDark: '#2a1e1a', alt: '#ff8a2a',
      wall: '#1e1210', wallLight: '#3a2420', wallDark: '#0e0806', accent: '#ffd040',
      water: '#a83a0a', waterLight: '#ff7a2a', waterEdge: '#ffd040',
      block: '#4a3430', blockLight: '#6a4a44', blockDark: '#2a1a16',
      bush: '#ff7a2a', bushLight: '#ffd040', bushDark: '#a83a0a', door: '#0e0806'
    },
    monsters: [{ species: 'geode', name: 'Golem de magma', pal: { 2: '#3a2a2a', 3: '#6a4a40', 1: '#1a0e0e', c: '#ff8a2a', C: '#a83a0a', l: '#ffd040', y: '#ffd040' } }, { species: 'ver', name: 'Ver de lave', pal: { 2: '#5a1e14', 3: '#8a3a24', 1: '#2a0a08', s: '#ff8a2a', g: '#2a1a16', G: '#140a08' } }, { species: 'scarabee', name: 'Scarabée de braise', pal: { 2: '#a83a1a', 3: '#ff7a3a', 1: '#4a1008' } }],
    boss: { species: 'wyrm', name: 'Le Ver du Cœur du Monde' }
  }
);
ISLES.push({ id: 'royaume', name: 'le Royaume sous la Terre', short: 'Le Royaume', from: ROYAUME_FROM, to: BIOMES.length });

// ---------- Son butin : ses propres armes et ses propres formes (le générateur du Continent, items.js) ----------
var ROYAUME_NAMES = { baton: 'Pic', harpon: 'Trident', katana: 'Lame', masse: 'Marteau', kunai: 'Poinçon', shuriken: 'Disque', echarpe: 'Cape', ceinture: 'Baudrier', anneau: 'Chevalière', tete: 'Casque' };
var ROYAUME_GEAR = {
  cavernes: { de: 'des cavernes', c: ['#8a7e86', '#4a3e46', '#c8bcc4', '#6af0d0', '#2a9a8a'], wave: ['#6af0d0', '#4a3e46'], focus: 'vitalite', hat: 'ecorce', set: 'r', names: ROYAUME_NAMES },
  champignons: { de: 'des spores', c: ['#b07ae0', '#5a2a8a', '#e8d0ff', '#6af0d0', '#2a9a8a'], wave: ['#6af0d0', '#b07ae0'], focus: 'esprit', hat: 'ecorce', set: 'r', names: ROYAUME_NAMES },
  lac: { de: 'du lac noir', c: ['#4a6a9a', '#1e2e4a', '#a0c0e0', '#fff080', '#c8a020'], wave: ['#fff080', '#4a6a9a'], focus: 'agilite', hat: 'ecorce', set: 'r', names: ROYAUME_NAMES },
  cristaux: { de: 'de cristal', c: ['#c080ff', '#7a3ab0', '#f0d0ff', '#4a3a5a', '#2a1e3a'], wave: ['#f0d0ff', '#c080ff'], focus: 'force', hat: 'ecorce', set: 'r', names: ROYAUME_NAMES },
  cite: { de: 'des anciens', c: ['#e0b43a', '#8a6a10', '#fff0a0', '#2a5a5a', '#163a3a'], wave: ['#fff0a0', '#2a8a8a'], focus: 'vitalite', hat: 'ecorce', set: 'r', names: ROYAUME_NAMES },
  coeur: { de: 'du cœur du monde', c: ['#ff7a2a', '#a83a0a', '#ffd040', '#3a2420', '#1e1210'], wave: ['#ffd040', '#ff4a1a'], focus: 'force', hat: 'ecorce', set: 'r', names: ROYAUME_NAMES }
};
var ROYAUME_ICONS = {
  // un pic : une hampe et une tête de pioche
  baton_r: sculpt(16, function (S) { S.line(3, 14, 11, 4, '4', 0.7); S.path([[6, 2], [11, 4], [15, 9]], '1', 1, 0.5); }, ICON_SHADES),
  // un trident : trois dents au bout d'une hampe
  harpon_r: sculpt(16, function (S) { S.line(2, 15, 10, 6, '4', 0.6); S.line(9, 7, 13, 3, '1', 0.6); S.path([[10, 6], [9, 2], [10, 0]], '1', 0.5, 0.3); S.path([[11, 8], [15, 7], [15, 6]], '1', 0.5, 0.3); S.line(13, 3, 15, 1, '1', 0.5); }, ICON_SHADES),
  // une lame : large et droite, une garde carrée
  katana_r: sculpt(16, function (S) { S.line(5, 10, 14, 1, '1', 1.2, 0.7); S.rect(3, 9, 4, 4, '4'); S.line(1, 15, 4, 12, '4', 0.8); }, ICON_SHADES),
  // un marteau : une tête de fer carrée sur un manche
  masse_r: sculpt(16, function (S) { S.line(3, 15, 9, 7, '4', 0.7); S.rect(7, 1, 7, 6, '1'); S.rect(9, 7, 3, 2, '4'); }, ICON_SHADES),
  // un poinçon : une longue pointe et un manche rond
  kunai_r: sculpt(16, function (S) { S.line(8, 0, 8, 9, '1', 0.4, 1); S.ell(8, 11, 2, 2, '4'); S.line(8, 13, 8, 15, '4', 0.8); }, ICON_SHADES),
  // un disque : une roue tranchante, crantée
  shuriken_r: sculpt(16, function (S) { S.ell(8, 8, 6.5, 6.5, '1'); S.ell(8, 8, 2, 2, '.'); [[8, 1], [15, 8], [8, 15], [1, 8]].forEach(function (p) { S.px(p[0], p[1], '.'); }); }, ICON_SHADES),
  // une cape : longue, une agrafe au col
  echarpe_r: sculpt(16, function (S) { S.path([[8, 2], [3, 14]], '1', 1.5, 3); S.path([[8, 2], [13, 14]], '1', 1.5, 3); S.ell(8, 2, 2, 1.5, '4'); }, ICON_SHADES),
  // un baudrier : une sangle en travers et ses poches
  ceinture_r: sculpt(16, function (S) { S.line(2, 2, 14, 14, '1', 1.4); S.rect(3, 6, 3, 3, '4'); S.rect(9, 9, 3, 3, '4'); }, ICON_SHADES),
  // une chevalière : un anneau épais et son sceau
  anneau_r: sculpt(16, function (S) { S.ell(8, 10, 5, 4, '4'); S.ell(8, 10, 2.6, 1.8, '.'); S.rect(5, 2, 6, 4, '1'); }, ICON_SHADES),
  // un casque de mineur : rond, et sa lampe
  casque_r: sculpt(16, function (S) { S.ell(8, 9, 6, 5, '1'); S.rect(1, 11, 14, 2, '1'); S.ell(8, 4, 2, 2, '4'); }, ICON_SHADES)
};
