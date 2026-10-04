// L'Île de l'Éclipse : six terres de l'autre côté du monde, après le Royaume sous la Terre. Le Ver vaincu, la grenouille
// remonte par une cheminée de lave et débouche sur une île où le soleil ne se lève plus : une éclipse sans fin, et sur
// la plus haute tour, Lord Bufo, le Seigneur de l'Éclipse. C'est la terre la plus dure du jeu : ses monstres dépassent
// le niveau maximum (297 à 346), ils portent une cuirasse (ECLIPSE_ARMOR : une part des dégâts reçus en moins), et le
// Lord se bat en trois temps (battle.js). On y avance à l'équipement : ses objets sont les plus forts du monde.
// Ses créatures sont sculptées comme celles du Royaume (sculpt, colosses.js), en 32 × 32 de taille normale.

// ---------- Les créatures ----------
var ECLIPSE_SPECIES = {
  // le crabe d'os : une carapace de côtes blanchies, une grosse pince, des yeux rouges au bout des tiges
  crabeos: {
    behavior: 'walker', xp: 9, hp: 17, speed: 14, chase: 22, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#6a6458', 2: '#c8c0a8', 3: '#f0ecdc', d: '#2a2218', r: '#ff3a3a', R: '#a01a1a' },
    frames: [sculpt(32, function (S) {
      [[12, 22, 8, 29], [15, 23, 13, 29], [21, 23, 23, 29], [24, 22, 28, 29]].forEach(function (l) { S.line(l[0], l[1], l[2], l[3], '2', 0.7, 0.5); }); // les pattes
      S.ell(18, 18, 10, 6, '2'); // la carapace
      [13, 16, 19, 22].forEach(function (x) { S.line(x, 14, x + 1, 22, 'd', 0.3); }); // ses côtes
      S.line(12, 13, 11, 8, '2', 0.6); S.line(16, 12, 16, 7, '2', 0.6); S.px(11, 7, 'r'); S.px(16, 6, 'r'); // les yeux sur leurs tiges
      S.path([[10, 20], [6, 19], [4, 16]], '2', 1.4, 1.3); // le bras de la grosse pince
      S.ell(4, 15, 2.6, 2.2, '2'); S.path([[3, 14], [1, 10], [3, 8]], '2', 1.3, 0.5); S.path([[5, 14], [7, 11], [6, 9]], '2', 1.1, 0.4); // la pince ouverte
      S.path([[11, 21], [7, 22], [5, 20]], '2', 1, 0.7); // la petite pince
    }, { 2: ['3', '1'], r: [null, 'R'] })]
  },
  // la méduse noire : une cloche sombre qui luit par taches, et ses longs filaments
  meduse: {
    behavior: 'flyer', xp: 8, hp: 13, speed: 18, chase: 40, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#140c22', 2: '#3a2a5a', 3: '#6a5a9a', g: '#ff4a8a', G: '#a01a5a', w: '#f4f4e8' },
    frames: [sculpt(32, function (S) {
      S.ell(16, 11, 11, 8, '2'); S.erase(3, 15, 26, 6); S.rect(5, 13, 22, 2, '1'); // la cloche et son bord
      [7, 11, 15, 19, 23].forEach(function (x, i) { S.path([[x, 14], [x - 1 + (i % 2) * 2, 20], [x + 1, 24], [x - 1, 29]], '2', 0.9, 0.4); }); // les filaments
      [[11, 8, 1.6], [17, 6, 1.6], [22, 10, 1.2], [14, 11, 1]].forEach(function (p) { S.ell(p[0], p[1], p[2], p[2], 'g'); }); // les taches qui luisent
      S.px(8, 11, 'w'); S.px(11, 12, 'w'); // les yeux
    }, { 2: ['3', '1'], g: [null, 'G'] })]
  },
  // le revenant : une grenouille d'os en armure rouillée, une épée ébréchée, une cape en lambeaux, des yeux de glace
  revenant: {
    behavior: 'walker', xp: 9, hp: 16, speed: 12, chase: 20, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#5a5448', 2: '#c8c0a8', 3: '#f0ecdc', c: '#5a1a2a', C: '#2a0a14', s: '#8a8a90', S: '#d0d4dc', d: '#1a1410', r: '#6af0ff' },
    frames: [sculpt(32, function (S) {
      S.path([[19, 12], [24, 20], [27, 29]], 'c', 2.5, 4); [[25, 29], [28, 27]].forEach(function (p) { S.px(p[0], p[1], '.'); }); // la cape en lambeaux
      S.line(13, 22, 11, 29, '2', 0.9); S.line(19, 22, 21, 29, '2', 0.9); S.rect(9, 29, 4, 1, '2'); S.rect(20, 29, 4, 1, '2'); // les jambes d'os
      S.ell(16, 18, 6, 5, '2'); [16, 18, 20].forEach(function (y) { S.line(12, y, 20, y, 'd', 0.3); }); // la cage d'os
      S.ell(15, 9, 8, 5.5, '2'); S.ell(11, 8, 2, 2, 'd'); S.ell(18, 7, 2, 2, 'd'); S.px(11, 8, 'r'); S.px(18, 7, 'r'); // le crâne, ses yeux de glace
      S.line(9, 12, 21, 12, 'd', 0.3); // la mâchoire
      S.line(12, 17, 7, 21, '2', 0.6); S.line(5, 25, 5, 8, 's', 0.7, 0.5); S.rect(3, 22, 5, 1, 'S'); S.line(5, 23, 5, 27, 'd', 0.4); // le bras, l'épée et sa garde
      S.px(5, 13, '.'); S.px(4, 17, '.'); // ses brèches
    }, { 2: ['3', '1'], c: [null, 'C'], s: ['S', null] })]
  },
  // la sangsue géante : un long corps annelé, rouge sang, une ventouse ronde pleine de dents
  sangsue: {
    behavior: 'dasher', xp: 8, hp: 15, speed: 20, chase: 36, dash: 210, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#4a0a14', 2: '#8a1a2a', 3: '#c84a5a', b: '#1a0408', w: '#f4e8e0', s: '#ff8a5a' },
    frames: [sculpt(32, function (S) {
      S.ell(18, 29, 12, 1.2, '1'); // la bave
      S.path([[29, 27], [23, 24], [16, 21], [10, 19]], '2', 3.6, 5); // le corps
      [[25, 21, 23, 28], [20, 18, 18, 26], [15, 16, 14, 25]].forEach(function (l) { S.line(l[0], l[1], l[2], l[3], '1', 0.4); }); // les anneaux
      S.path([[27, 24], [20, 20], [13, 17]], 's', 0.5); // la ligne qui brille sur le dos
      S.ell(6, 18, 4.5, 5.2, '2'); S.ell(4, 18, 2.6, 3.4, 'b'); // la ventouse
      [[3, 15], [5, 15], [2, 17], [2, 19], [3, 21], [5, 21]].forEach(function (p) { S.px(p[0], p[1], 'w'); }); // les dents
    }, { 2: ['3', '1'] })]
  },
  // la dionée : une plante carnivore qui marche sur ses racines, deux mâchoires bordées de crocs
  dionee: {
    behavior: 'walker', xp: 8, hp: 16, speed: 10, chase: 18, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#1a3a14', 2: '#3a7a2a', 3: '#7ac04a', m: '#c82a3a', M: '#ff6a6a', w: '#f4f4e8', b: '#5a3a1a' },
    frames: [sculpt(32, function (S) {
      [[13, 26, 9, 30], [16, 27, 16, 30], [19, 26, 23, 30]].forEach(function (l) { S.line(l[0], l[1], l[2], l[3], 'b', 0.7, 0.4); }); // les racines
      S.path([[16, 26], [9, 22], [4, 24]], '2', 1.8, 0.5); S.path([[16, 26], [24, 21], [29, 23]], '2', 1.8, 0.5); // les feuilles
      S.ell(16, 26, 5, 2.5, '2'); S.path([[16, 25], [18, 20], [15, 15]], '2', 1.4, 1.2); // le pied, la tige
      S.ell(11, 9, 9, 4, '2'); S.ell(11, 15, 9, 3.4, '2'); S.ell(9, 12, 7.5, 2, 'm'); // les deux mâchoires, la gueule
      [4, 7, 10, 13, 16].forEach(function (x) { S.px(x, 10, 'w'); S.px(x + 1, 14, 'w'); }); // les crocs
      [[6, 6], [12, 5], [17, 7]].forEach(function (p) { S.px(p[0], p[1], 'M'); }); // les poils rouges du dessus
    }, { 2: ['3', '1'], m: ['M', null] })]
  },
  // le molosse pétrifié : un chien de pierre au large poitrail, fendu de lave, la gueule ouverte
  molosse: {
    behavior: 'dasher', xp: 9, hp: 17, speed: 22, chase: 40, dash: 220, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#3a3a3e', 2: '#7a7a80', 3: '#b0b0b8', l: '#ff4a2a', L: '#ffd040', w: '#f4f4e8', b: '#141418' },
    frames: [sculpt(32, function (S) {
      S.path([[27, 15], [29, 11], [31, 9]], '2', 1.2, 0.5); // la queue
      S.rect(9, 22, 3, 8, '2'); S.rect(13, 23, 3, 7, '2'); S.rect(21, 22, 3, 8, '2'); S.rect(25, 22, 3, 8, '2'); // les pattes
      S.ell(18, 18, 10, 6, '2'); S.ell(11, 18, 5, 6, '2'); // le corps, le poitrail
      S.ell(8, 12, 5.5, 4.5, '2'); S.ell(3, 14, 3, 2.4, '2'); S.rect(0, 16, 6, 1, 'b'); // la tête, le museau, la gueule
      [[1, 15], [3, 15], [2, 17], [4, 17]].forEach(function (p) { S.px(p[0], p[1], 'w'); }); // les crocs
      S.path([[9, 8], [11, 3]], '2', 1.2, 0.4); // l'oreille
      S.px(7, 11, 'L'); // l'œil de braise
      S.path([[14, 14], [17, 18], [15, 22]], 'l', 0.4); S.path([[22, 13], [24, 17], [23, 20]], 'l', 0.4); S.path([[10, 16], [12, 20]], 'l', 0.4); // les fentes de lave
    }, { 2: ['3', '1'], l: ['L', null] })]
  },
  // le freux de l'éclipse : un corbeau noir aux ailes levées, l'œil rouge, une plume d'argent
  freux: {
    behavior: 'flyer', xp: 8, hp: 13, speed: 26, chase: 48, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#0a0a12', 2: '#26263c', 3: '#4e4e6e', y: '#c8a03a', Y: '#8a6a1a', r: '#ff3a3a', s: '#c0c8e0' },
    frames: [sculpt(32, function (S) {
      S.path([[18, 14], [23, 6], [29, 2]], '2', 2.6, 1); S.path([[18, 15], [25, 9], [31, 8]], '2', 2.2, 0.8); S.path([[16, 14], [16, 6], [19, 1]], '2', 2, 0.7); // les ailes levées
      S.path([[22, 19], [28, 23], [31, 22]], '2', 2, 1); // la queue
      S.ell(17, 17, 7, 5, '2'); S.ell(10, 13, 4.5, 4, '2'); // le corps, la tête
      S.path([[6, 13], [1, 15]], 'y', 1, 0.3); S.px(9, 12, 'r'); // le bec, l'œil
      S.line(15, 22, 14, 27, 'y', 0.4); S.line(18, 22, 19, 27, 'y', 0.4); // les serres
      S.line(22, 8, 27, 4, 's', 0.3); // la plume d'argent
    }, { 2: ['3', '1'], y: [null, 'Y'] })]
  },
  // le crapaud-paladin : un chevalier-crapaud en armure noire, un pavois doré, une hallebarde et son panache rouge
  paladin: {
    behavior: 'walker', xp: 10, hp: 19, speed: 10, chase: 18, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#16161e', 2: '#3a3a4e', 3: '#6a6a84', g: '#e0b43a', G: '#8a6a1a', s: '#b0b4c0', S: '#e8ecf4', r: '#ff3a3a', R: '#a01a1a', h: '#5a3a1a' },
    frames: [sculpt(32, function (S) {
      S.line(26, 30, 26, 3, 'h', 0.5); S.path([[24, 3], [29, 5], [26, 9]], 's', 1.2, 0.8); S.line(26, 3, 26, 0, 's', 0.4); // la hallebarde
      S.rect(10, 24, 5, 6, '2'); S.rect(18, 24, 5, 6, '2'); // les jambes
      S.ell(16, 18, 8, 7, '2'); S.rect(9, 21, 15, 1, 'g'); // la cuirasse, sa ceinture dorée
      S.ell(15, 9, 7, 5, '2'); S.rect(9, 9, 9, 1, '1'); S.px(10, 9, 'r'); S.px(13, 9, 'r'); // le heaume, sa visière, les yeux
      S.path([[15, 4], [20, 2], [24, 4]], 'r', 1.1, 0.5); // le panache
      S.line(22, 16, 26, 14, '2', 0.8); // le bras qui tient la hallebarde
      S.rect(3, 13, 7, 12, 's'); S.rect(5, 16, 3, 5, 'g'); S.rect(4, 14, 5, 1, 'g'); // le pavois et son blason
    }, { 2: ['3', '1'], g: [null, 'G'], s: ['S', null], r: [null, 'R'] })]
  },
  // la phalène de l'éclipse : de grandes ailes marquées de deux soleils noirs cerclés d'or, un corps velu
  phalene: {
    behavior: 'flyer', xp: 9, hp: 14, speed: 24, chase: 44, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#2a1a3a', 2: '#5a3a7a', 3: '#9a7ac0', e: '#ffd040', E: '#140a1e', f: '#d8c8e8', F: '#9a8ab0' },
    frames: [sculpt(32, function (S) {
      S.ell(20, 9, 10, 7, '2'); S.ell(21, 20, 8, 5, '2'); // les ailes
      S.ell(21, 9, 3.6, 3.6, 'e'); S.ell(21, 9, 2.2, 2.2, 'E'); S.ell(22, 20, 2.6, 2.6, 'e'); S.ell(22, 20, 1.3, 1.3, 'E'); // les soleils noirs
      S.path([[8, 14], [14, 16], [20, 19]], 'f', 2.6, 1.6); S.ell(7, 13, 3, 3, 'f'); S.ell(6, 13, 1.4, 1.4, 'E'); // le corps velu, la tête, l'œil
      S.path([[6, 10], [3, 5], [1, 4]], '1', 0.4); S.path([[8, 10], [8, 4], [10, 2]], '1', 0.4); // les antennes
      [[10, 17, 8, 23], [13, 18, 12, 24], [16, 19, 16, 25]].forEach(function (l) { S.line(l[0], l[1], l[2], l[3], '1', 0.3); }); // les pattes
    }, { 2: ['3', '1'], f: [null, 'F'] })]
  },
  // Lord Bufo, le Seigneur de l'Éclipse : un crapaud immense en armure noire, couronné d'or, sa cape rouge sang, et une
  // épée longue comme lui dont le fil brûle
  lord: {
    behavior: 'walker', xp: 0, hp: 34, speed: 12, chase: 24, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#0e0a14', 2: '#2a2238', 3: '#4a3e5e', t: '#3a5a2a', T: '#6a8a3a', c: '#8a0a1a', C: '#4a0410', g: '#e0b43a', G: '#8a6a10', r: '#ff2a2a', s: '#c8ccd8', S: '#f4f4ff', b: '#08040a' },
    frames: [sculpt(32, function (S) {
      S.path([[17, 10], [25, 18], [30, 30]], 'c', 4, 7); S.path([[19, 10], [27, 15], [31, 23]], 'c', 3, 4); // la cape
      S.ell(10, 28, 4.5, 2.2, '2'); S.ell(22, 28, 4.5, 2.2, '2'); S.ell(11, 25, 4, 3, '2'); S.ell(21, 25, 4, 3, '2'); // les cuissots, les pieds
      S.ell(16, 19, 10, 8, '2'); S.rect(7, 22, 19, 2, 'g'); S.line(16, 13, 16, 21, '1', 0.3); // la cuirasse, la ceinture, l'arête
      S.ell(7, 15, 3.6, 2.6, '2'); S.ell(25, 15, 3.6, 2.6, '2'); // les épaulières
      S.ell(16, 10, 9.5, 5, 't'); S.ell(9, 6, 3.2, 2.8, 't'); S.ell(22, 6, 3.2, 2.8, 't'); // la tête de crapaud, ses yeux saillants
      S.ell(9, 6, 1.7, 1.5, 'r'); S.ell(22, 6, 1.7, 1.5, 'r'); S.px(8, 6, 'b'); S.px(21, 6, 'b'); // les yeux rouges, les pupilles
      S.rect(13, 3, 6, 2, 'g'); [[13, 1], [13, 2], [16, 0], [16, 1], [16, 2], [18, 1], [18, 2]].forEach(function (p) { S.px(p[0], p[1], 'g'); }); // la couronne
      S.line(8, 12, 24, 12, '1', 0.35); S.px(9, 11, '1'); // la large bouche
      S.line(9, 20, 2, 3, 's', 1.3, 0.6); S.line(8, 19, 1, 2, 'r', 0.3); // la lame et son fil brûlant
      S.line(6, 22, 12, 18, 'g', 0.7); S.line(10, 21, 12, 25, 'G', 0.6); // la garde, la poignée
      S.path([[13, 16], [10, 20]], '2', 2); // le bras
    }, { 2: ['3', '1'], t: ['T', null], c: [null, 'C'], g: [null, 'G'], s: ['S', null] })]
  }
};
Object.keys(ECLIPSE_SPECIES).forEach(function (id) {
  SPECIES[id] = ECLIPSE_SPECIES[id];
  var s = SPECIES[id], f = s.frames[0], n = f.length;
  if (s.frames.length < 2) s.frames.push(f.map(function (r, y) { return y === 0 ? '.'.repeat(r.length) : (y < n - 3 ? f[y - 1] : r); }));
});

// ---------- Les six terres de l'Éclipse ----------
// (eclipse : la cuirasse de leurs monstres, et le soleil noir au-dessus du camp, scene.js)
var ECLIPSE_FROM = BIOMES.length;
BIOMES.push(
  {
    id: 'greve', name: 'La Grève aux Ossements', eclipse: true, monsterScale: 0.8, tagline: 'Une plage grise où la mer rejette des os. Sous le soleil noir, ils se relèvent.',
    wall: 'rock', block: 'skull', bush: 'drygrass', alt: 'bones', ground: 'sand', water: true,
    pal: {
      ground: '#7a7268', groundLight: '#9a9288', groundDark: '#5a544c', alt: '#d8d0bc',
      wall: '#2a2428', wallLight: '#4a4248', wallDark: '#161216', accent: '#ff3a3a',
      water: '#1a1a2e', waterLight: '#2a2a46', waterEdge: '#8a8aa8',
      block: '#c8c0a8', blockLight: '#f0ecdc', blockDark: '#6a6458',
      bush: '#5a5448', bushLight: '#8a8270', bushDark: '#3a362e', door: '#161216'
    },
    monsters: [{ species: 'crabeos', name: 'Crabe d’os' }, { species: 'meduse', name: 'Méduse noire' }, { species: 'revenant', name: 'Revenant' }],
    boss: { species: 'crabeos', name: 'Le Crabe-Roi des Ossements', pal: { 2: '#e0d8c0', 3: '#ffffff', 1: '#8a8270', r: '#ffd040', R: '#a87a10', d: '#4a1a1a' } }
  },
  {
    id: 'ecarlate', name: 'Les Marais Écarlates', eclipse: true, monsterScale: 0.8, tagline: 'Une eau rouge et tiède, des fleurs qui mordent. Les sangsues y ont la taille d’une barque.',
    wall: 'reeds', block: 'stump', bush: 'thorns', alt: 'puddle', water: true,
    pal: {
      ground: '#4a2a2a', groundLight: '#6a3e3a', groundDark: '#341c1c', alt: '#8a2a2a',
      wall: '#3a4a2a', wallLight: '#5a6a3a', wallDark: '#1e2a14', accent: '#ff4a6a',
      water: '#5a0a1a', waterLight: '#8a1a2a', waterEdge: '#c84a5a',
      block: '#4a3a2a', blockLight: '#6a5a3a', blockDark: '#2a1e14',
      bush: '#3a5a2a', bushLight: '#6a8a3a', bushDark: '#1e3014', door: '#1e1010'
    },
    monsters: [{ species: 'sangsue', name: 'Sangsue géante' }, { species: 'dionee', name: 'Dionée' }, { species: 'meduse', name: 'Méduse de sang', pal: { 2: '#7a1a2a', 3: '#b84a5a', 1: '#3a0a12', g: '#ffd040', G: '#a87a10' } }],
    boss: { species: 'sangsue', name: 'La Mère des Sangsues', pal: { 2: '#5a0a3a', 3: '#a03a6a', 1: '#2a0418', s: '#ffd040' } }
  },
  {
    id: 'petrifiee', name: 'La Forêt Pétrifiée', eclipse: true, monsterScale: 0.8, tagline: 'Des arbres changés en pierre le jour où le soleil s’est éteint. Ses chiens de garde aussi.',
    wall: 'trunks', block: 'boulder', bush: 'drygrass', alt: 'stone', water: false,
    pal: {
      ground: '#5a5a5e', groundLight: '#7a7a80', groundDark: '#424246', alt: '#9a9aa2',
      wall: '#8a8a90', wallLight: '#b0b0b8', wallDark: '#4a4a50', accent: '#ff4a2a',
      water: '#2a2a3a', waterLight: '#3a3a4e', waterEdge: '#7a7a90',
      block: '#7a7a80', blockLight: '#a0a0a8', blockDark: '#4a4a50',
      bush: '#6a6a6a', bushLight: '#9a9a9a', bushDark: '#3a3a3a', door: '#2a2a2e'
    },
    monsters: [{ species: 'molosse', name: 'Molosse pétrifié' }, { species: 'dionee', name: 'Dionée de pierre', pal: { 2: '#7a7a80', 3: '#b0b0b8', 1: '#3a3a3e', m: '#ff4a2a', M: '#ffd040' } }, { species: 'freux', name: 'Freux de l’éclipse' }],
    boss: { species: 'molosse', name: 'Le Grand Molosse de Pierre', pal: { 2: '#5a5a62', 3: '#8a8a94', 1: '#2a2a30', l: '#6af0ff', L: '#e0ffff' } }
  },
  {
    id: 'remparts', name: 'Les Remparts Noirs', eclipse: true, monsterScale: 0.8, tagline: 'La muraille du Lord, gardée par ses chevaliers-crapauds. Personne ne l’a jamais franchie.',
    wall: 'ruins', block: 'banner', bush: 'swords', alt: 'stone', ground: 'slabs', water: false,
    pal: {
      ground: '#3a3a46', groundLight: '#52525e', groundDark: '#2a2a34', alt: '#6a6a78',
      wall: '#1e1e28', wallLight: '#3a3a46', wallDark: '#0e0e14', accent: '#e0b43a',
      water: '#1a1a2a', waterLight: '#2a2a3e', waterEdge: '#6a6a88',
      block: '#8a0a1a', blockLight: '#c83a3a', blockDark: '#4a0410',
      bush: '#6a6a78', bushLight: '#a0a0b0', bushDark: '#3a3a46', door: '#0e0e14'
    },
    monsters: [{ species: 'paladin', name: 'Crapaud-paladin' }, { species: 'freux', name: 'Freux des remparts', pal: { 2: '#3a2a2a', 3: '#6a4a4a', 1: '#140a0a', r: '#ffd040' } }, { species: 'revenant', name: 'Revenant cuirassé', pal: { 2: '#8a8a9a', 3: '#c0c0d0', 1: '#3a3a4a', r: '#ff3a3a', c: '#2a2a4a', C: '#14142a' } }],
    boss: { species: 'paladin', name: 'Le Capitaine des Remparts', pal: { 2: '#6a5a2a', 3: '#a0904a', 1: '#2a2410', s: '#e0b43a', S: '#fff0a0', g: '#ffffff', G: '#b0b4c0' } }
  },
  {
    id: 'nocturne', name: 'Le Jardin des Éclipses', eclipse: true, monsterScale: 0.8, bossPower: 0.8, tagline: 'Le jardin secret du Lord : des fleurs qui ne s’ouvrent que dans le noir, et les phalènes qui les butinent.',
    wall: 'hedge', block: 'crystal', bush: 'flowers', alt: 'flowers', water: true,
    pal: {
      ground: '#2a2440', groundLight: '#3e3658', groundDark: '#1e1a30', alt: '#ffd040',
      wall: '#1a2a2a', wallLight: '#2a4a4a', wallDark: '#0e1a1a', accent: '#ffd040',
      water: '#140e2a', waterLight: '#241a44', waterEdge: '#6a5a9a',
      block: '#9a7ac0', blockLight: '#d8c8e8', blockDark: '#5a3a7a',
      bush: '#5a3a7a', bushLight: '#9a7ac0', bushDark: '#2a1a3a', door: '#0e0a1a'
    },
    monsters: [{ species: 'phalene', name: 'Phalène de l’éclipse' }, { species: 'dionee', name: 'Dionée nocturne', pal: { 2: '#5a3a7a', 3: '#9a7ac0', 1: '#2a1a3a', m: '#ffd040', M: '#fff0a0' } }, { species: 'molosse', name: 'Molosse d’ombre', pal: { 2: '#2a2440', 3: '#4a3e6a', 1: '#100c1c', l: '#c080ff', L: '#f0d0ff' } }],
    boss: { species: 'phalene', name: 'La Reine-Phalène', pal: { 2: '#2a1a3a', 3: '#5a3a7a', 1: '#100818', e: '#ff3a3a', f: '#ffd040', F: '#a87a10' } }
  },
  {
    id: 'citadelle', name: 'La Citadelle du Lord', eclipse: true, monsterScale: 0.8, bossScale: 1.3, tagline: 'Tout en haut, sous le soleil noir, Lord Bufo attend sur son trône. Il n’a jamais perdu un duel.',
    wall: 'ruins', block: 'tomb', bush: 'flames', alt: 'embers', ground: 'slabs', water: false,
    pal: {
      ground: '#2a2230', groundLight: '#3e3446', groundDark: '#1e1824', alt: '#ff3a3a',
      wall: '#140e1a', wallLight: '#2a2234', wallDark: '#08060c', accent: '#ff2a2a',
      water: '#4a0410', waterLight: '#8a0a1a', waterEdge: '#ff4a4a',
      block: '#3a3046', blockLight: '#5a4e66', blockDark: '#1e1826',
      bush: '#ff2a2a', bushLight: '#ffd040', bushDark: '#8a0a1a', door: '#08060c'
    },
    monsters: [{ species: 'paladin', name: 'Garde noire', pal: { 2: '#1e1e28', 3: '#3a3a4e', 1: '#0a0a10', g: '#ff2a2a', G: '#8a0a1a', r: '#e0b43a', R: '#8a6a1a' } }, { species: 'revenant', name: 'Chevalier revenant', pal: { 2: '#5a4e66', 3: '#8a7e9a', 1: '#2a2234', r: '#ff2a2a', c: '#8a0a1a', C: '#4a0410' } }, { species: 'freux', name: 'Freux du Lord', pal: { 2: '#3a0a14', 3: '#6a1a2a', 1: '#14040a', r: '#ffd040', s: '#ffd040' } }],
    boss: { species: 'lord', name: 'Lord Bufo, Seigneur de l’Éclipse', lord: true }
  }
);
ISLES.push({ id: 'eclipse', name: 'l’Île de l’Éclipse', short: 'L’Éclipse', from: ECLIPSE_FROM, to: BIOMES.length });
// la cuirasse des monstres de l'Éclipse : la part des dégâts qu'elle arrête (les ordinaires, les gardiens, les boss)
var ECLIPSE_ARMOR = { normal: 0.08, gardien: 0.12, boss: 0.15 };
// Lord Bufo se bat en trois temps : sous LORD_PHASES.shield de ses PV, il se couvre d'un bouclier d'ombre (une part de ses
// PV) ; sous LORD_PHASES.total, c'est l'éclipse totale : il frappe plus fort et chaque coup lui rend une part des dégâts
var LORD_PHASES = { shield: 0.66, shieldPart: 0.15, total: 0.33, totalDmg: 1.35, drain: 0.35 };

// ---------- Son butin : ses propres armes et ses propres formes (le générateur du Continent, items.js) ----------
var ECLIPSE_NAMES = { baton: 'Sceptre', harpon: 'Hallebarde', katana: 'Estoc', masse: 'Fléau', kunai: 'Dague', shuriken: 'Croissant', echarpe: 'Manteau', ceinture: 'Ceinturon', anneau: 'Sceau', tete: 'Heaume' };
var ECLIPSE_GEAR = {
  greve: { de: 'des ossements', c: ['#e0d8c0', '#8a8270', '#ffffff', '#ff3a3a', '#8a1a1a'], wave: ['#ffffff', '#ff3a3a'], focus: 'vitalite', hat: 'ecorce', set: 'l', names: ECLIPSE_NAMES },
  ecarlate: { de: 'écarlate', c: ['#c82a3a', '#6a0a1a', '#ff8a8a', '#3a5a2a', '#1e3014'], wave: ['#ff8a8a', '#c82a3a'], focus: 'agilite', hat: 'ecorce', set: 'l', names: ECLIPSE_NAMES },
  petrifiee: { de: 'de pierre morte', c: ['#a0a0a8', '#5a5a62', '#e0e0e8', '#ff4a2a', '#8a1a0a'], wave: ['#ffd040', '#ff4a2a'], focus: 'force', hat: 'ecorce', set: 'l', names: ECLIPSE_NAMES },
  remparts: { de: 'des remparts', c: ['#4a4a5e', '#1e1e28', '#9a9ab0', '#e0b43a', '#8a6a10'], wave: ['#fff0a0', '#e0b43a'], focus: 'vitalite', hat: 'ecorce', set: 'l', names: ECLIPSE_NAMES },
  nocturne: { de: 'de l’éclipse', c: ['#7a5aa0', '#2a1a3a', '#d8c8e8', '#ffd040', '#a87a10'], wave: ['#ffd040', '#7a5aa0'], focus: 'esprit', hat: 'ecorce', set: 'l', names: ECLIPSE_NAMES },
  citadelle: { de: 'du Lord', c: ['#2a2238', '#0e0a14', '#6a5a7e', '#ff2a2a', '#8a0a1a'], wave: ['#ff2a2a', '#e0b43a'], focus: 'force', hat: 'ecorce', set: 'l', names: ECLIPSE_NAMES }
};
var ECLIPSE_ICONS = {
  // un sceptre : une hampe et une orbe couronnée
  baton_l: sculpt(16, function (S) { S.line(3, 15, 10, 6, '4', 0.6); S.ell(11, 4, 2.6, 2.6, '1'); [[11, 0], [14, 3], [8, 2]].forEach(function (p) { S.px(p[0], p[1], '1'); }); S.px(11, 4, 'k'); }, ICON_SHADES),
  // une hallebarde : une lame de hache, une pointe et un crochet au bout d'une longue hampe
  harpon_l: sculpt(16, function (S) { S.line(1, 15, 12, 4, '4', 0.5); S.ell(13, 6, 2.4, 3, '1'); S.line(12, 3, 15, 0, '1', 0.5); S.line(10, 4, 8, 2, '1', 0.4); }, ICON_SHADES),
  // un estoc : une lame longue et fine, une garde en croix
  katana_l: sculpt(16, function (S) { S.line(5, 11, 15, 1, '1', 0.7, 0.3); S.line(3, 9, 7, 13, '4', 0.6); S.line(1, 15, 4, 12, '4', 0.7); }, ICON_SHADES),
  // un fléau : un manche, une chaîne, une boule hérissée
  masse_l: sculpt(16, function (S) { S.line(1, 15, 5, 11, '4', 0.7); [[6, 10], [7, 9], [8, 8]].forEach(function (p) { S.px(p[0], p[1], '4'); }); S.ell(11, 5, 3, 3, '1'); [[11, 1], [15, 5], [14, 2], [8, 2]].forEach(function (p) { S.px(p[0], p[1], '1'); }); }, ICON_SHADES),
  // une dague : une lame courbe, une garde droite
  kunai_l: sculpt(16, function (S) { S.path([[8, 10], [8, 6], [10, 2], [12, 0]], '1', 1.1, 0.3); S.rect(5, 10, 7, 1, '4'); S.line(8, 11, 8, 15, '4', 0.7); }, ICON_SHADES),
  // un croissant : une lune tranchante, comme l'éclipse
  shuriken_l: sculpt(16, function (S) { S.ell(8, 8, 6.5, 6.5, '1'); S.ell(10.5, 5.5, 5, 5, '.'); S.px(3, 12, '4'); }, ICON_SHADES),
  // un manteau : long, au col dressé
  echarpe_l: sculpt(16, function (S) { S.path([[8, 3], [2, 15]], '1', 2, 3.5); S.path([[8, 3], [14, 15]], '1', 2, 3.5); S.rect(5, 1, 7, 3, '4'); }, ICON_SHADES),
  // un ceinturon : une sangle et sa grosse boucle
  ceinture_l: sculpt(16, function (S) { S.rect(0, 6, 16, 4, '1'); S.rect(5, 4, 6, 8, '4'); S.rect(7, 6, 2, 4, '.'); }, ICON_SHADES),
  // un sceau : un anneau et son croissant
  anneau_l: sculpt(16, function (S) { S.ell(8, 10, 5, 4, '4'); S.ell(8, 10, 2.6, 1.8, '.'); S.ell(8, 4, 3, 3, '1'); S.ell(9.5, 3, 2, 2, '.'); }, ICON_SHADES),
  // un heaume : un grand casque fermé, sa visière et sa couronne de pointes
  casque_l: sculpt(16, function (S) { S.rect(3, 5, 10, 9, '1'); S.rect(4, 9, 8, 1, '.'); S.px(8, 11, '.'); [[4, 3], [4, 4], [8, 2], [8, 3], [8, 4], [12, 3], [12, 4]].forEach(function (p) { S.px(p[0], p[1], '4'); }); }, ICON_SHADES)
};
