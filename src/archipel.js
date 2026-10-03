// L'Archipel des Brumes : six îles reliées par des ponts, dans le brouillard, après l'Île des Colosses. Des légendes
// du bout du monde : bambouseraies, rizières en terrasses, portes rouges sans fin, sources chaudes, jardin de pierre
// et la montagne des tempêtes. Ses créatures sont sculptées comme celles des Colosses (sculpt, colosses.js), en
// 32 × 32 mais de taille normale (ARCHIPEL_SCALE), et l'île laisse souffler après les géants : la force y reprend
// celle du Continent, sans le surplus des Colosses, en pente douce.

// ---------- Les créatures ----------
var ARCHIPEL_SPECIES = {
  // le tanuki : rond, le masque sombre autour des yeux, la queue rayée, le ventre-tambour
  tanuki: {
    behavior: 'walker', xp: 8, hp: 14, speed: 16, chase: 26, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#3a2a1a', 2: '#8a6a40', 3: '#b8946a', 4: '#e8d8b8', m: '#2a1e14', w: '#f4f4e8', b: '#140c08' },
    frames: [sculpt(32, function (S) {
      S.path([[24, 22], [28, 18], [30, 12]], '2', 2.6, 2); [[27, 19], [29, 14]].forEach(function (p) { S.ell(p[0], p[1], 2, 1, 'm'); }); // la queue rayée
      S.rect(10, 26, 5, 4, '2'); S.rect(19, 26, 5, 4, '2'); // les pattes
      S.ell(16, 21, 9, 7, '2'); S.ell(15, 23, 6, 5, '4'); // le corps, le ventre-tambour
      S.ell(11, 11, 7, 6, '2'); S.ell(6, 6, 2, 2, '2'); S.ell(15, 6, 2, 2, '2'); // la tête, les oreilles
      S.ell(8, 11, 3, 2, 'm'); S.ell(14, 11, 3, 2, 'm'); S.px(8, 11, 'w'); S.px(14, 11, 'w'); // le masque, les yeux
      S.ell(10, 14, 2, 1, '4'); S.px(9, 14, 'b'); // le museau
      S.ell(5, 21, 2, 2, '2'); S.ell(26, 21, 2, 2, '2'); // les bras
    }, { 2: ['3', '1'] })]
  },
  // la renarde aux queues multiples : longue, les oreilles en pointe, trois queues en éventail
  kitsune: {
    behavior: 'dasher', xp: 8, hp: 13, speed: 26, chase: 44, dash: 220, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#8a3a0a', 2: '#e07a2a', 3: '#ffb070', 4: '#fff4e0', r: '#c9412f', y: '#f0d040', b: '#140808' },
    frames: [sculpt(32, function (S) {
      [[[22, 17], [27, 10], [30, 4]], [[23, 18], [29, 15], [31, 10]], [[22, 19], [28, 21], [31, 17]]].forEach(function (p) { S.path(p, '2', 2.4, 1.6); S.px(p[2][0], p[2][1], '4'); S.px(p[2][0] - 1, p[2][1] + 1, '4'); }); // les queues
      [9, 13, 19, 23].forEach(function (lx) { S.line(lx, 21, lx, 29, '2', 0.9, 0.7); }); // les pattes
      S.ell(16, 19, 9, 4, '2'); S.ell(15, 21, 6, 2, '4'); // le corps
      S.line(9, 17, 7, 11, '2', 2.3, 1.8); S.ell(6, 10, 4, 3, '2'); S.rect(0, 10, 4, 2, '2'); S.px(0, 10, 'b'); // le cou, la tête, le museau
      S.line(5, 7, 4, 3, '2', 0.9, 0.4); S.line(8, 7, 9, 3, '2', 0.9, 0.4); // les oreilles
      S.px(5, 9, 'y'); S.px(4, 9, 'b'); S.px(7, 12, 'r'); // l'œil, une marque rouge
    }, { 2: ['3', '1'] })]
  },
  // la mante : fine et dressée, les bras-faux repliés, la tête en triangle
  mante: {
    behavior: 'dasher', xp: 7, hp: 11, speed: 22, chase: 36, dash: 200, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#1e4a1a', 2: '#4a9a3a', 3: '#8ad06a', y: '#f0e060', b: '#0a140a' },
    frames: [sculpt(32, function (S) {
      [[14, 22, 9, 30], [16, 22, 15, 30], [19, 22, 23, 30], [21, 22, 27, 29]].forEach(function (l) { S.line(l[0], l[1], l[2], l[3], '2', 0.6, 0.5); }); // les pattes
      S.ell(21, 22, 7, 3, '2'); S.path([[14, 21], [12, 15], [11, 10]], '2', 1.6, 1.2); // l'abdomen, le corselet
      S.path([[11, 12], [6, 15], [3, 11]], '2', 1.2, 0.8); S.path([[3, 11], [5, 7]], '2', 0.8, 0.5); // le bras-faux
      S.ell(10, 7, 3, 3, '2'); S.px(8, 6, 'y'); S.px(12, 6, 'y'); S.px(8, 7, 'b'); S.line(9, 4, 7, 0, '1', 0.4); S.line(11, 4, 13, 0, '1', 0.4); // la tête, les antennes
      S.ell(22, 18, 6, 2, '3'); // les ailes repliées
    }, { 2: ['3', '1'] })]
  },
  // la carpe koï : elle bondit hors de l'eau, blanche et orange, la nageoire en éventail
  koi: {
    behavior: 'flyer', xp: 7, hp: 11, speed: 28, chase: 52, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#a8401a', 2: '#f07a2a', 3: '#ffb06a', 4: '#f4f4ee', w: '#ffffff', b: '#101418', g: '#e0b43a' },
    frames: [sculpt(32, function (S) {
      S.path([[24, 18], [28, 14], [31, 10]], '2', 1.4, 0.6); S.path([[24, 19], [29, 22], [31, 26]], '2', 1.4, 0.6); // la queue
      S.ell(14, 17, 11, 6, '4'); [[10, 15, 4, 3], [17, 18, 4, 3], [21, 14, 3, 2]].forEach(function (p) { S.ell(p[0], p[1], p[2], p[3], '2'); }); // le corps tacheté
      S.path([[13, 11], [16, 6], [20, 9]], '2', 1.2, 0.8); S.path([[12, 22], [10, 26]], '2', 1, 0.6); // les nageoires
      S.px(5, 15, 'b'); S.px(5, 14, 'w'); S.line(3, 18, 0, 21, '1', 0.4); S.line(4, 19, 2, 23, '1', 0.4); // l'œil, les barbillons
      [[8, 19], [12, 20], [16, 13]].forEach(function (p) { S.px(p[0], p[1], 'g'); }); // des écailles d'or
    }, { 4: [null, '3'], 2: ['3', '1'] })]
  },
  // l'épouvantail : un chapeau de paille, une perche en croix, des haillons qui flottent
  epouvantail: {
    behavior: 'walker', xp: 7, hp: 13, speed: 12, chase: 20, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#5a3e25', 2: '#8a6a3a', 3: '#c8a060', p: '#e8c870', P: '#a8883a', r: '#a8301a', R: '#6a1a0a', w: '#f4f4e8', b: '#140c08' },
    frames: [sculpt(32, function (S) {
      S.line(15, 14, 15, 31, '1', 0.8); // la perche
      S.rect(10, 14, 11, 10, 'r'); S.rect(10, 22, 2, 3, 'r'); S.rect(14, 22, 2, 4, 'r'); S.rect(18, 22, 3, 3, 'r'); // les haillons
      S.line(2, 15, 28, 15, '1', 0.8); S.rect(1, 13, 5, 4, 'r'); S.rect(25, 13, 5, 4, 'r'); [[1, 17], [3, 17], [27, 17], [29, 17]].forEach(function (p) { S.line(p[0], p[1], p[0], p[1] + 3, 'p', 0.4); }); // les bras, la paille
      S.ell(15, 8, 5, 4, '3'); S.px(13, 8, 'b'); S.px(17, 8, 'b'); S.line(13, 10, 17, 10, 'b', 0.3); // la tête de toile, le sourire cousu
      S.ell(15, 4, 10, 2, 'p'); S.ell(15, 2, 4, 2, 'p'); // le chapeau de paille
    }, { r: [null, 'R'], p: [null, 'P'] })]
  },
  // la lanterne hantée : du papier tendu sur des côtes, un œil, une langue, une flamme au sommet
  lanterne: {
    behavior: 'flyer', xp: 7, hp: 10, speed: 24, chase: 46, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#a83a2a', 2: '#f0dcb0', 3: '#fff6e0', r: '#c9412f', y: '#ffd040', o: '#ff8a2a', w: '#ffffff', b: '#101010' },
    frames: [sculpt(32, function (S) {
      S.ell(16, 16, 9, 10, '2'); [9, 13, 17, 21].forEach(function (yy) { S.line(8, yy, 24, yy, '1', 0.3); }); // le papier, ses côtes
      S.rect(10, 4, 12, 3, 'k'); S.rect(10, 26, 12, 3, 'k'); // le bois haut et bas
      S.ell(13, 13, 3, 2, 'w'); S.ell(13, 13, 1, 1, 'b'); // l'œil unique
      S.ell(16, 20, 4, 2, 'b'); S.path([[16, 21], [18, 25], [16, 29]], 'r', 1.2, 0.8); // la bouche, la langue
      S.ell(16, 2, 1.5, 2, 'o'); S.px(16, 1, 'y'); // la flamme
    }, { 2: ['3', '1'] })]
  },
  // l'oni : des cornes, la peau rouge, un pagne de tigre et une massue cloutée
  oni: {
    behavior: 'walker', xp: 9, hp: 17, speed: 14, chase: 22, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#6a1a0a', 2: '#c83a1a', 3: '#f07a4a', t: '#e0b43a', T: '#3a2a10', m: '#5a5a6a', M: '#2a2a34', y: '#ece2c8', w: '#f4f4e8', b: '#140808' },
    frames: [sculpt(32, function (S) {
      S.rect(11, 23, 4, 7, '2'); S.rect(18, 23, 4, 7, '2'); // les jambes
      S.ell(16, 17, 8, 7, '2'); S.rect(10, 20, 13, 4, 't'); [11, 14, 17, 20].forEach(function (x) { S.rect(x, 20, 1, 4, 'T'); }); // le torse, le pagne de tigre
      S.line(23, 13, 27, 20, '2', 1.8, 1.4); S.ell(27, 21, 2, 2, '2'); // le bras droit
      S.ell(15, 7, 5, 5, '2'); S.line(12, 3, 10, 0, 'y', 0.6); S.line(18, 3, 20, 0, 'y', 0.6); // la tête, les cornes
      S.px(13, 7, 'y'); S.px(17, 7, 'y'); S.px(13, 7, 'y'); S.rect(12, 10, 6, 1, 'b'); S.px(13, 11, 'w'); S.px(16, 11, 'w'); // les yeux, les crocs
      S.line(9, 13, 5, 19, '2', 1.8, 1.4); S.line(4, 13, 4, 29, 'm', 1.6, 2.2); [[3, 16], [5, 20], [3, 24], [5, 27]].forEach(function (p) { S.px(p[0], p[1], 'w'); }); // le bras gauche, la massue cloutée
    }, { 2: ['3', '1'], m: [null, 'M'] })]
  },
  // le macaque des neiges : la face rouge, une fourrure épaisse, assis dans la vapeur
  singe: {
    behavior: 'dasher', xp: 8, hp: 14, speed: 22, chase: 36, dash: 190, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#5a5a62', 2: '#a8a8b0', 3: '#e0e0e8', f: '#e05a5a', F: '#a83a3a', w: '#ffffff', b: '#140c0c' },
    frames: [sculpt(32, function (S) {
      S.ell(17, 22, 10, 8, '2'); S.ell(10, 27, 4, 3, '2'); S.ell(23, 27, 4, 3, '2'); // le corps assis, les pattes
      S.ell(10, 13, 7, 6, '2'); S.ell(9, 14, 4, 4, 'f'); S.px(7, 13, 'b'); S.px(10, 13, 'b'); S.rect(7, 16, 4, 1, 'F'); // la tête, la face rouge
      S.ell(4, 22, 2, 3, '2'); S.ell(28, 20, 2, 3, '2'); // les bras
      [[13, 6], [16, 8], [5, 8], [20, 16], [24, 19]].forEach(function (p) { S.px(p[0], p[1], '3'); }); // la neige sur la fourrure
    }, { 2: ['3', '1'], f: [null, 'F'] })]
  },
  // le tengu : un bec, des ailes noires, une robe de moine et un éventail de plumes
  tengu: {
    behavior: 'flyer', xp: 9, hp: 14, speed: 26, chase: 50, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#14141c', 2: '#3a3a4a', 3: '#6a6a7a', r: '#c9412f', R: '#8a2a1a', y: '#f0c040', w: '#f4f4e8', b: '#101010' },
    frames: [sculpt(32, function (S) {
      S.path([[18, 12], [26, 6], [31, 8]], '2', 2.4, 1); S.path([[19, 14], [28, 13], [31, 16]], '2', 2, 0.8); // l'aile
      S.rect(11, 15, 10, 13, 'r'); S.rect(13, 28, 2, 2, 'k'); S.rect(18, 28, 2, 2, 'k'); // la robe, les pieds
      S.ell(14, 9, 5, 5, '2'); S.path([[10, 9], [5, 11], [2, 13]], 'y', 1.2, 0.5); S.px(12, 8, 'w'); S.px(12, 8, 'w'); S.px(11, 8, 'b'); // la tête, le bec, l'œil
      S.rect(10, 4, 8, 2, '1'); S.rect(12, 2, 4, 2, '1'); // le petit bonnet
      S.line(10, 18, 6, 22, 'r', 1.2); S.path([[6, 22], [3, 18], [6, 17], [8, 20]], 'w', 1.4, 1.4); // le bras, l'éventail de plumes
    }, { 2: ['3', '1'], r: [null, 'R'] })]
  },
  // le dragon des brumes : un long corps qui ondule, une crinière, des moustaches qui flottent
  ryu: {
    behavior: 'dasher', xp: 0, hp: 30, speed: 22, chase: 40, dash: 230, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#0e3a4a', 2: '#2a8a8a', 3: '#6ad0c0', 4: '#e0fff0', m: '#e8e0ff', y: '#f0d040', r: '#c9412f', w: '#ffffff', b: '#081418' },
    frames: [sculpt(32, function (S) {
      S.path([[30, 28], [24, 30], [18, 27], [16, 22], [20, 17], [26, 15], [26, 10], [20, 7], [13, 8]], '2', 1.8, 3.2); // le corps qui ondule
      [[19, 29], [16, 23], [23, 16], [24, 9]].forEach(function (p) { S.px(p[0], p[1], '4'); S.px(p[0] + 1, p[1], '4'); }); // le ventre
      S.ell(8, 9, 5, 3, '2'); S.rect(1, 9, 5, 2, '2'); S.px(1, 9, 'b'); // la tête, le museau
      S.path([[11, 6], [14, 3], [18, 4], [21, 2]], 'm', 1.3, 0.6); // la crinière
      S.path([[3, 11], [1, 15], [3, 18]], 'y', 0.4, 0.4); S.path([[5, 11], [6, 15], [4, 19]], 'y', 0.4, 0.4); // les moustaches
      S.px(8, 8, 'r'); S.px(7, 8, 'w'); S.line(9, 5, 11, 1, 'y', 0.5); // l'œil, la corne
      [[18, 19], [25, 12]].forEach(function (p) { S.line(p[0], p[1], p[0] - 2, p[1] + 3, '2', 0.6); }); // les griffes
    }, { 2: ['3', '1'] })]
  }
};
Object.keys(ARCHIPEL_SPECIES).forEach(function (id) {
  SPECIES[id] = ARCHIPEL_SPECIES[id];
  var s = SPECIES[id], f = s.frames[0], n = f.length;
  if (s.frames.length < 2) s.frames.push(f.map(function (r, y) { return y === 0 ? '.'.repeat(r.length) : (y < n - 3 ? f[y - 1] : r); }));
});

// ---------- Les six terres de l'Archipel ----------
// monsterScale : ses créatures (32 × 32) gardent une taille normale en combat (un peu plus petites que des boss)
var ARCHIPEL_FROM = BIOMES.length;
BIOMES.push(
  {
    id: 'bambous', name: 'Bambouseraie des Brumes', archipel: true, monsterScale: 0.8, tagline: 'Des bambous à perte de vue dans un brouillard tiède. On y entend rire quelque chose qui n’est pas là.',
    wall: 'reeds', block: 'stump', bush: 'ferns', alt: 'leaves', water: true,
    pal: {
      ground: '#4a6a3a', groundLight: '#6a8a4a', groundDark: '#38522c', alt: '#a8c870',
      wall: '#3a7a2a', wallLight: '#6ab04a', wallDark: '#1e4a16', accent: '#c8f0a0',
      water: '#4a7a6a', waterLight: '#6a9a8a', waterEdge: '#a8c8b8',
      block: '#6a5a3a', blockLight: '#8a7a50', blockDark: '#3a301e',
      bush: '#4a8a3a', bushLight: '#8ac06a', bushDark: '#2a5a20', door: '#5a3e25'
    },
    monsters: [{ species: 'tanuki', name: 'Tanuki farceur' }, { species: 'mante', name: 'Mante des bambous' }, { species: 'kitsune', name: 'Renarde des brumes' }],
    boss: { species: 'kitsune', name: 'Renarde aux Neuf Queues', pal: { 1: '#a8a8b8', 2: '#f4f4ff', 3: '#ffffff', 4: '#ffe8a0', r: '#c9412f', y: '#6af0ff' } }
  },
  {
    id: 'rizieres', name: 'Rizières en terrasses', archipel: true, monsterScale: 0.8, tagline: 'Des marches d’eau qui descendent jusqu’à la mer. Les épouvantails y bougent quand on ne regarde pas.',
    wall: 'hedge', block: 'boulder', bush: 'reeds', alt: 'puddle', water: true,
    pal: {
      ground: '#5a7a3a', groundLight: '#7a9a4a', groundDark: '#466230', alt: '#8ac0c8',
      wall: '#4a6a2a', wallLight: '#6a8a3a', wallDark: '#2a4a1a', accent: '#f0e08a',
      water: '#5a9ab0', waterLight: '#8ac0d0', waterEdge: '#c8e8f0',
      block: '#7a7a6a', blockLight: '#a0a090', blockDark: '#4a4a40',
      bush: '#8ab04a', bushLight: '#c8e07a', bushDark: '#5a7a2a', door: '#5a3e25'
    },
    monsters: [{ species: 'koi', name: 'Carpe des rizières' }, { species: 'epouvantail', name: 'Épouvantail errant' }, { species: 'mante', name: 'Mante des épis', pal: { 2: '#a8a83a', 3: '#e0e07a', 1: '#5a5a1a' } }],
    boss: { species: 'koi', name: 'La Carpe d’Or', pal: { 2: '#e0b43a', 1: '#8a6a10', 3: '#fff0a0', 4: '#fff6d8', g: '#ffffff' } }
  },
  {
    id: 'torii', name: 'Le Chemin des Mille Portes', archipel: true, monsterScale: 0.8, tagline: 'Des portes rouges, l’une derrière l’autre, jusqu’au sommet. On ne les compte pas : on s’y perd.',
    wall: 'palisade', block: 'pillar', bush: 'flowers', alt: 'mosaic', ground: 'slabs', water: false,
    pal: {
      ground: '#6a5a4a', groundLight: '#8a7a6a', groundDark: '#524436', alt: '#c9412f',
      wall: '#a8301a', wallLight: '#d8502a', wallDark: '#6a1a0a', accent: '#ffd040',
      water: '#3a5a6a', waterLight: '#5a7a8a', waterEdge: '#8aa0aa',
      block: '#c9412f', blockLight: '#f07a4a', blockDark: '#7a1a0a',
      bush: '#d86a8a', bushLight: '#ffb0c8', bushDark: '#8a3a5a', door: '#3a1a0a'
    },
    monsters: [{ species: 'lanterne', name: 'Lanterne hantée' }, { species: 'kitsune', name: 'Renarde gardienne', pal: { 2: '#c9412f', 3: '#f07a4a', 1: '#6a1a0a', 4: '#fff0e0' } }, { species: 'oni', name: 'Oni des portes' }],
    boss: { species: 'oni', name: 'Oni Rouge', pal: { 2: '#e0201a', 3: '#ff6a4a', 1: '#6a0a0a', t: '#1a1a1a', T: '#ffd040', m: '#3a3a44' } }
  },
  {
    id: 'onsen', name: 'Les Sources fumantes', archipel: true, monsterScale: 0.8, tagline: 'Des bassins d’eau chaude au milieu de la neige. Les singes y règnent, et ils ne partagent pas.',
    wall: 'rock', block: 'boulder', bush: 'round', alt: 'snow', ground: 'snow', water: true,
    pal: {
      ground: '#c8d0d8', groundLight: '#e8eef4', groundDark: '#a8b0b8', alt: '#ffffff',
      wall: '#5a6068', wallLight: '#7a8088', wallDark: '#3a4048', accent: '#ffb070',
      water: '#6aa8b8', waterLight: '#a0d0d8', waterEdge: '#e0f4f8',
      block: '#7a7a80', blockLight: '#a0a0a8', blockDark: '#4a4a52',
      bush: '#4a6a4a', bushLight: '#7a9a7a', bushDark: '#2a4a2a', door: '#5a3e25'
    },
    monsters: [{ species: 'singe', name: 'Macaque des sources' }, { species: 'tanuki', name: 'Tanuki des neiges', pal: { 2: '#c8c0b0', 3: '#f0e8d8', 1: '#6a6050' } }, { species: 'koi', name: 'Carpe des bains', pal: { 2: '#c9412f', 3: '#f07a5a', 1: '#6a1a0a' } }],
    boss: { species: 'singe', name: 'Singe-Roi des Sources', pal: { 2: '#e8e0d0', 3: '#ffffff', 1: '#a89a80', f: '#c9201a', F: '#6a0a0a' } }
  },
  {
    id: 'jardin', name: 'Le Jardin de Pierre', archipel: true, monsterScale: 0.8, tagline: 'Du sable ratissé, des pierres posées, la lune. Tout y est calme, sauf ceux qui le gardent.',
    wall: 'ruins', block: 'pillar', bush: 'round', alt: 'stone', ground: 'slabs', water: true,
    pal: {
      ground: '#7a7a80', groundLight: '#9a9aa0', groundDark: '#5a5a62', alt: '#c8c8d0',
      wall: '#3a3a44', wallLight: '#5a5a66', wallDark: '#22222a', accent: '#e8e0ff',
      water: '#2a3a5a', waterLight: '#4a5a7a', waterEdge: '#8a9ab8',
      block: '#8a8a90', blockLight: '#b0b0b8', blockDark: '#4a4a52',
      bush: '#3a5a3a', bushLight: '#5a7a5a', bushDark: '#1e3a1e', door: '#22222a'
    },
    monsters: [{ species: 'tengu', name: 'Tengu des pins' }, { species: 'lanterne', name: 'Lanterne de pierre', pal: { 2: '#c8c8d0', 3: '#e8e8f0', 1: '#5a5a62', r: '#6af0ff' } }, { species: 'epouvantail', name: 'Gardien de paille', pal: { r: '#3a3a6a', R: '#1a1a3a' } }],
    boss: { species: 'tengu', name: 'Grand Tengu', pal: { 2: '#c9412f', 3: '#f07a4a', 1: '#6a1a0a', r: '#1a1a24', R: '#0a0a10', y: '#ffd040' } }
  },
  {
    id: 'mont', name: 'Le Mont aux Mille Tempêtes', archipel: true, monsterScale: 0.8, bossScale: 1.25, tagline: 'Au sommet de l’archipel, la foudre ne s’arrête jamais. Un dragon de brume y dort dans les nuages.',
    wall: 'rock', block: 'crystal', bush: 'drygrass', alt: 'stone', water: false,
    pal: {
      ground: '#3a3a5a', groundLight: '#5a5a7a', groundDark: '#2a2a44', alt: '#8a8ab0',
      wall: '#22223a', wallLight: '#3a3a5a', wallDark: '#12121e', accent: '#6af0ff',
      water: '#1a2a4a', waterLight: '#2a4a6a', waterEdge: '#6af0ff',
      block: '#4a6a8a', blockLight: '#8ab0d0', blockDark: '#2a3a5a',
      bush: '#5a5a7a', bushLight: '#8a8ab0', bushDark: '#3a3a5a', door: '#12121e'
    },
    monsters: [{ species: 'oni', name: 'Oni de l’orage', pal: { 2: '#3a5aa8', 3: '#6a8ad0', 1: '#1a2a5a' } }, { species: 'tengu', name: 'Tengu des cimes' }, { species: 'kitsune', name: 'Renarde-foudre', pal: { 2: '#f0d040', 3: '#fff080', 1: '#8a6a10', 4: '#ffffff' } }],
    boss: { species: 'ryu', name: 'Ryū des Brumes' }
  }
);
ISLES.push({ id: 'archipel', name: 'l’Archipel des Brumes', short: 'L’Archipel', from: ARCHIPEL_FROM, to: BIOMES.length });

// ---------- Son butin : ses propres armes et ses propres formes (le générateur du Continent, items.js) ----------
var ARCHIPEL_NAMES = { baton: 'Bō', harpon: 'Naginata', katana: 'Tachi', masse: 'Kanabō', kunai: 'Tantō', shuriken: 'Senban', echarpe: 'Haori', ceinture: 'Obi', anneau: 'Bague', tete: 'Kabuto' };
var ARCHIPEL_GEAR = {
  bambous: { de: 'des bambous', c: ['#8ac06a', '#4a8a3a', '#d0f0a0', '#6a5a3a', '#3a301e'], wave: ['#d0f0a0', '#4a8a3a'], focus: 'agilite', hat: 'ecorce', set: 'a', names: ARCHIPEL_NAMES },
  rizieres: { de: 'des rizières', c: ['#e0d08a', '#a89a4a', '#fff6c8', '#4a7a9a', '#2a4a6a'], wave: ['#fff6c8', '#4a7a9a'], focus: 'vitalite', hat: 'ecorce', set: 'a', names: ARCHIPEL_NAMES },
  torii: { de: 'des mille portes', c: ['#e0402a', '#8a1a0a', '#ff9a7a', '#2a2a2a', '#141414'], wave: ['#ffd040', '#e0402a'], focus: 'force', hat: 'ecorce', set: 'a', names: ARCHIPEL_NAMES },
  onsen: { de: 'des sources', c: ['#a0d0e0', '#5a8aa0', '#ffffff', '#c8a878', '#7a6040'], wave: ['#ffffff', '#5a8aa0'], focus: 'vitalite', hat: 'ecorce', set: 'a', names: ARCHIPEL_NAMES },
  jardin: { de: 'du jardin de pierre', c: ['#c8c8d0', '#6a6a78', '#ffffff', '#3a5a3a', '#1e3a1e'], wave: ['#ffffff', '#6a6a78'], focus: 'esprit', hat: 'ecorce', set: 'a', names: ARCHIPEL_NAMES },
  mont: { de: 'des tempêtes', c: ['#6af0ff', '#2a6ab0', '#e0ffff', '#3a3a5a', '#1a1a2e'], wave: ['#e0ffff', '#f0f040'], focus: 'force', hat: 'ecorce', set: 'a', names: ARCHIPEL_NAMES }
};
var ARCHIPEL_ICONS = {
  // un bō : un long bâton cerclé de métal aux deux bouts
  baton_a: sculpt(16, function (S) { S.line(3, 13, 13, 2, '4', 0.8); S.line(2, 14, 4, 12, '1', 1); S.line(12, 3, 14, 1, '1', 1); S.line(7, 9, 9, 7, '1', 0.8); }, ICON_SHADES),
  // une naginata : une lame courbe au bout d'une hampe
  harpon_a: sculpt(16, function (S) { S.line(2, 14, 10, 6, '4', 0.6); S.path([[10, 6], [12, 3], [15, 0]], '1', 1.2, 0.4); S.line(9, 7, 11, 5, 'k', 0.6); }, ICON_SHADES),
  // un tachi : une lame très courbe, une garde ronde
  katana_a: sculpt(16, function (S) { S.path([[5, 11], [8, 6], [12, 2], [15, 1]], '1', 0.9, 0.5); S.ell(5, 11, 2, 2, '4'); S.line(1, 15, 4, 12, '4', 0.8); }, ICON_SHADES),
  // un kanabō : une massue de fer hérissée de clous
  masse_a: sculpt(16, function (S) { S.line(3, 15, 6, 11, '4', 0.7); S.path([[6, 11], [10, 6], [13, 2]], '1', 2, 2.6); [[8, 7], [11, 4], [10, 9], [13, 6], [7, 10]].forEach(function (p) { S.px(p[0], p[1], '4'); }); }, ICON_SHADES),
  // un tantō : une lame courte et droite, une poignée tressée
  kunai_a: sculpt(16, function (S) { S.line(8, 0, 8, 9, '1', 1.1, 0.6); S.rect(5, 9, 7, 1, '4'); S.line(8, 10, 8, 15, '4', 0.9); [11, 13].forEach(function (y) { S.px(8, y, 'b'); }); }, ICON_SHADES),
  // un senban : une étoile carrée à quatre pointes
  shuriken_a: sculpt(16, function (S) { S.rect(4, 4, 8, 8, '1'); S.line(8, 0, 8, 15, '1', 0.8); S.line(0, 8, 15, 8, '1', 0.8); S.ell(8, 8, 1.2, 1.2, '.'); }, ICON_SHADES),
  // un haori : une veste courte aux manches larges, un lien au milieu
  echarpe_a: sculpt(16, function (S) { S.rect(4, 2, 8, 12, '1'); S.rect(0, 2, 4, 7, '1'); S.rect(12, 2, 4, 7, '1'); S.line(8, 2, 8, 13, 'k', 0.3); S.px(7, 7, '4'); S.px(9, 7, '4'); }, ICON_SHADES),
  // un obi : une large ceinture et son nœud
  ceinture_a: sculpt(16, function (S) { S.rect(0, 6, 16, 5, '1'); S.ell(8, 8, 2.5, 3, '4'); S.path([[8, 10], [6, 14]], '4', 1, 0.6); S.path([[8, 10], [10, 14]], '4', 1, 0.6); }, ICON_SHADES),
  // une bague de jade
  anneau_a: sculpt(16, function (S) { S.ell(8, 10, 5, 4, '4'); S.ell(8, 10, 2.6, 1.8, '.'); S.ell(8, 5, 3, 2, '1'); }, ICON_SHADES),
  // un kabuto : un casque à larges ailes et son croissant doré
  casque_a: sculpt(16, function (S) { S.ell(8, 9, 5, 4, '1'); S.rect(1, 10, 14, 3, '1'); S.path([[3, 5], [5, 1], [8, 4], [11, 1], [13, 5]], '4', 0.6, 0.6); }, ICON_SHADES)
};
