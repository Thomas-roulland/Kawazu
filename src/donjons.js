// Les Donjons, comme ceux de Shakes & Fidget : trente donjons, un tous les 10 niveaux de la grenouille (le premier au
// niveau 10, le trentième au niveau 300), qu'on ouvre l'un après l'autre (le suivant s'ouvre quand le précédent est
// vidé, et qu'on a son niveau). Dix salles chacun, des monstres qui montent d'un niveau à chaque salle (un gardien à la
// 5e) et un boss au fond. Leurs créatures n'existent nulle part ailleurs (DUNGEON_SPECIES), et leurs objets Uniques non
// plus : une rareté vert rayonnant, plus forte qu'un Épique, aux formes et aux noms de leur donjon.
var DUNGEON_ROOMS = 10, DUNGEON_EVERY = 10;
var DUNGEON_LOOT = { room: 0.3, unique: 0.18, guardUnique: 0.35, bossUnique: 1 };
// Un donjon se nettoie une fois : un monstre vaincu ne revient pas. Après une défaite, on le retente au bout d'une heure.
var DUNGEON_RETRY_MS = 3600e3;

// ---------- Les créatures des donjons (sculptées comme celles des îles : sculpt, colosses.js) ----------
var DUNGEON_SPECIES = {
  // la gargouille : accroupie, des ailes de pierre, des cornes, un œil de braise
  gargouille: {
    behavior: 'dasher', xp: 8, hp: 15, speed: 20, chase: 34, dash: 200, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#3a3a44', 2: '#7a7a86', 3: '#a8a8b4', w: '#5a5a66', W: '#2a2a34', e: '#ff5a3a', b: '#14141a' },
    frames: [sculpt(32, function (S) {
      S.path([[18, 14], [24, 4], [30, 2]], 'w', 1, 0.6); S.path([[18, 15], [27, 8], [31, 10]], 'w', 1, 0.6); S.ell(25, 10, 5, 5, 'w'); // les ailes
      S.rect(10, 24, 4, 6, '2'); S.rect(19, 24, 4, 6, '2'); S.line(10, 28, 6, 30, '2', 1, 0.5); // les pattes, les griffes
      S.ell(16, 20, 9, 6, '2'); // le corps accroupi
      S.ell(9, 13, 6, 5, '2'); S.rect(2, 14, 5, 3, '2'); S.px(3, 16, 'b'); // la tête, le museau
      S.path([[9, 9], [8, 4], [10, 2]], '3', 0.8, 0.3); S.path([[13, 9], [14, 4], [16, 3]], '3', 0.8, 0.3); // les cornes
      S.px(7, 12, 'e'); S.px(6, 12, 'e'); // l'œil de braise
    }, { 2: ['3', '1'], w: [null, 'W'] })]
  },
  // le mimique : un coffre qui ouvre la gueule, des crocs, une langue, deux yeux dans le noir
  mimique: {
    behavior: 'dasher', xp: 8, hp: 15, speed: 18, chase: 30, dash: 180, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#4a2a10', 2: '#8a5a2a', 3: '#b8864a', g: '#e0b43a', G: '#8a6a1a', r: '#c9412f', w: '#f4f4e8', b: '#1a0808', y: '#fff060' },
    frames: [sculpt(32, function (S) {
      S.rect(4, 19, 24, 10, '2'); S.rect(4, 19, 24, 2, 'g'); S.rect(14, 21, 4, 4, 'g'); // le coffre, son bandeau, la serrure
      S.rect(4, 28, 4, 3, '2'); S.rect(24, 28, 4, 3, '2'); // les pieds
      S.rect(5, 12, 22, 7, 'b'); // la gueule ouverte
      S.line(4, 11, 27, 4, '2', 2.4); S.line(4, 9, 27, 2, 'g', 0.5); // le couvercle levé, son bandeau
      [7, 11, 15, 19, 23].forEach(function (x) { S.px(x, 18, 'w'); S.px(x + 1, 17, 'w'); S.px(x, 12 - Math.round((x - 4) * 0.3), 'w'); }); // les crocs
      S.path([[12, 17], [8, 22], [11, 26]], 'r', 1.4, 1); // la langue
      S.px(14, 14, 'y'); S.px(20, 13, 'y'); // les yeux
    }, { 2: ['3', '1'], g: [null, 'G'] })]
  },
  // le spectre : une capuche vide, deux yeux de glace, une robe déchirée qui flotte, une main d'os
  spectre: {
    behavior: 'flyer', xp: 8, hp: 13, speed: 24, chase: 46, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#2a2a4a', 2: '#5a5a8a', 3: '#9a9ac8', e: '#6af0ff', b: '#08080e', h: '#e0e0f0' },
    frames: [sculpt(32, function (S) {
      S.path([[16, 13], [14, 22], [18, 30]], '2', 6.5, 3); // la robe
      [[11, 29, 2], [16, 31, 2], [21, 28, 2]].forEach(function (t) { S.erase(t[0], t[1], t[2], 3); }); // les déchirures
      S.ell(16, 10, 7, 7, '2'); S.ell(15, 11, 4, 4, 'b'); S.px(13, 11, 'e'); S.px(17, 11, 'e'); // la capuche, le vide, les yeux
      S.path([[11, 16], [6, 20], [3, 18]], '2', 1.6, 1); S.px(2, 18, 'h'); S.px(3, 19, 'h'); S.px(2, 17, 'h'); // le bras, la main d'os
    }, { 2: ['3', '1'] })]
  },
  // la liche : un crâne couronné, une robe de mage, un bâton et son orbe
  liche: {
    behavior: 'walker', xp: 9, hp: 14, speed: 12, chase: 22, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#3a1a4a', 2: '#6a3a8a', 3: '#9a6ab8', s: '#e8e4d0', S: '#a8a490', g: '#e0b43a', o: '#6af0d0', b: '#0a0a10' },
    frames: [sculpt(32, function (S) {
      S.line(4, 7, 4, 31, 'S', 0.6); S.ell(4, 4, 2.6, 2.6, 'o'); // le bâton et son orbe
      S.path([[15, 14], [14, 22], [16, 30]], '2', 5, 7); // la robe
      S.ell(15, 9, 5, 5, 's'); S.px(13, 9, 'o'); S.px(17, 9, 'o'); S.rect(13, 12, 5, 1, 'b'); // le crâne, les yeux, les dents
      S.rect(11, 3, 9, 2, 'g'); [11, 15, 19].forEach(function (x) { S.px(x, 2, 'g'); }); // la couronne
      S.line(10, 16, 5, 13, 's', 0.6); S.line(20, 16, 24, 21, 's', 0.6); // les bras d'os
    }, { 2: ['3', '1'], s: [null, 'S'] })]
  },
  // le golem runique : des blocs de pierre, des runes qui brillent
  golemrune: {
    behavior: 'walker', xp: 9, hp: 18, speed: 10, chase: 18, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#2a3a3a', 2: '#5a6a6a', 3: '#8a9a9a', r: '#6af0ff', R: '#2a8ab0' },
    frames: [sculpt(32, function (S) {
      S.rect(9, 24, 6, 7, '2'); S.rect(18, 24, 6, 7, '2'); // les jambes
      S.rect(7, 11, 19, 14, '2'); S.rect(2, 12, 5, 13, '2'); S.rect(26, 12, 5, 11, '2'); // le torse, les bras
      S.rect(11, 3, 10, 8, '2'); S.rect(13, 6, 2, 2, 'r'); S.rect(17, 6, 2, 2, 'r'); // la tête, les yeux
      S.rect(12, 15, 1, 6, 'r'); S.rect(12, 15, 4, 1, 'r'); S.rect(19, 14, 1, 5, 'r'); S.rect(17, 18, 4, 1, 'r'); S.px(4, 16, 'r'); S.px(28, 15, 'r'); // les runes
    }, { 2: ['3', '1'], r: [null, 'R'] })]
  },
  // le minotaure : une tête de taureau, des cornes, une hache
  minotaure: {
    behavior: 'dasher', xp: 9, hp: 17, speed: 18, chase: 30, dash: 210, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#3a1a0a', 2: '#7a4a2a', 3: '#a87a4a', h: '#e8e0c8', a: '#8a8a9a', A: '#4a4a5a', n: '#c9a0a0', b: '#140808', r: '#ff4a2a' },
    frames: [sculpt(32, function (S) {
      S.line(5, 5, 5, 30, '1', 0.6); S.ell(3, 8, 3, 4.5, 'a'); // la hache
      S.rect(11, 24, 4, 7, '2'); S.rect(18, 24, 4, 7, '2'); // les jambes
      S.ell(16, 18, 8, 7, '2'); S.rect(9, 22, 14, 2, '1'); // le torse, la ceinture
      S.line(10, 15, 6, 12, '2', 1.6, 1.2); S.line(23, 15, 26, 21, '2', 1.6, 1.2); // les bras
      S.ell(13, 8, 5, 5, '2'); S.ell(10, 11, 3, 2, 'n'); S.px(9, 11, 'b'); S.px(11, 11, 'b'); // la tête, le mufle
      S.path([[10, 5], [6, 2], [4, 4]], 'h', 1, 0.4); S.path([[16, 5], [20, 1], [22, 3]], 'h', 1, 0.4); // les cornes
      S.px(12, 7, 'r'); // l'œil
    }, { 2: ['3', '1'], a: [null, 'A'] })]
  },
  // la chimère : un corps de lion, une crinière rouge, des ailes, et un serpent pour queue
  chimere: {
    behavior: 'dasher', xp: 9, hp: 16, speed: 22, chase: 38, dash: 220, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#6a3a10', 2: '#c8862a', 3: '#f0c06a', m: '#8a2a1a', M: '#5a1a0a', s: '#3a8a3a', w: '#e8e0d0', b: '#140808', y: '#fff060' },
    frames: [sculpt(32, function (S) {
      S.path([[24, 18], [29, 14], [30, 8], [27, 6]], 's', 1, 0.8); S.ell(27, 5, 2, 1.5, 's'); // la queue-serpent
      S.rect(8, 24, 3, 6, '2'); S.rect(12, 24, 3, 6, '2'); S.rect(19, 24, 3, 6, '2'); S.rect(23, 23, 3, 7, '2'); // les pattes
      S.ell(17, 19, 9, 6, '2'); S.path([[16, 14], [20, 6], [25, 8]], 'w', 1.3, 0.6); // le corps, l'aile
      S.ell(9, 14, 7, 7, 'm'); S.ell(7, 15, 4, 4, '2'); S.px(5, 14, 'y'); S.rect(3, 17, 3, 1, 'b'); // la crinière, la tête
    }, { 2: ['3', '1'], m: [null, 'M'] })]
  },
  // le basilic : un lézard-serpent, une crête rouge, un œil qui pétrifie
  basilic: {
    behavior: 'walker', xp: 8, hp: 15, speed: 14, chase: 24, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#1a4a2a', 2: '#3a8a4a', 3: '#7ac87a', c: '#c9412f', C: '#7a1a0a', y: '#fff060', b: '#081008' },
    frames: [sculpt(32, function (S) {
      S.path([[22, 24], [28, 26], [31, 22]], '2', 2.4, 0.6); // la queue
      S.ell(17, 23, 8, 5, '2'); S.rect(11, 26, 3, 4, '2'); S.rect(20, 26, 3, 4, '2'); // le corps, les pattes
      S.path([[12, 21], [8, 15], [6, 12]], '2', 3, 3.5); S.rect(1, 12, 5, 3, '2'); // le cou, la tête
      S.path([[8, 9], [11, 6], [14, 9], [16, 6], [18, 11]], 'c', 0.8, 0.8); [[16, 18], [20, 18], [24, 20]].forEach(function (p) { S.px(p[0], p[1], 'c'); }); // la crête, les épines
      S.ell(6, 11, 1.4, 1.4, 'y'); S.px(6, 11, 'b'); // l'œil
    }, { 2: ['3', '1'], c: [null, 'C'] })]
  },
  // le feu-follet : une flamme bleue qui flotte, un visage dedans
  follet: {
    behavior: 'flyer', xp: 7, hp: 11, speed: 28, chase: 52, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#2a5a8a', 2: '#4a9ad8', 3: '#a0e0ff', b: '#081428' },
    frames: [sculpt(32, function (S) {
      S.path([[12, 26], [10, 30]], '2', 1.2, 0.4); S.path([[20, 26], [22, 30]], '2', 1.2, 0.4); // les traînées
      S.ell(16, 19, 8, 8, '2'); S.path([[16, 12], [13, 5], [16, 1]], '2', 4, 1); S.path([[12, 14], [8, 8], [9, 4]], '2', 2.4, 0.6); S.path([[20, 14], [24, 9], [23, 5]], '2', 2.4, 0.6); // la flamme
      S.ell(16, 20, 5, 5, '3'); S.px(13, 18, 'b'); S.px(18, 18, 'b'); S.rect(14, 22, 4, 1, 'b'); // le cœur, le visage
    }, { 2: ['3', '1'] })]
  },
  // le crâne flottant : un crâne énorme, des flammes qui en sortent
  crane: {
    behavior: 'flyer', xp: 8, hp: 12, speed: 24, chase: 44, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#a8a490', 2: '#e8e4d0', 3: '#ffffff', f: '#ff8a2a', F: '#ffd040', b: '#140808' },
    frames: [sculpt(32, function (S) {
      S.path([[16, 12], [12, 4], [15, 0]], 'f', 5, 1); S.path([[22, 12], [25, 5], [24, 1]], 'f', 3, 0.6); S.path([[10, 12], [7, 6], [8, 2]], 'f', 3, 0.6); // les flammes
      S.ell(16, 17, 9, 8, '2'); S.rect(11, 23, 10, 4, '2'); // le crâne, la mâchoire
      S.ell(12, 17, 2.4, 2.4, 'b'); S.ell(20, 17, 2.4, 2.4, 'b'); S.px(12, 17, 'F'); S.px(20, 17, 'F'); S.px(16, 20, 'b'); // les orbites, le nez
      [12, 14, 16, 18, 20].forEach(function (x) { S.rect(x, 24, 1, 2, 'b'); }); // les dents
    }, { 2: ['3', '1'], f: ['F', null] })]
  },
  // l'hydre : trois têtes de serpent sur un seul corps
  hydre: {
    behavior: 'walker', xp: 9, hp: 18, speed: 12, chase: 22, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#1a3a4a', 2: '#3a7a8a', 3: '#7ac0c8', y: '#fff060', b: '#081418', w: '#f4f4e8' },
    frames: [sculpt(32, function (S) {
      S.ell(20, 25, 10, 5, '2'); // le corps
      S.path([[16, 23], [10, 15], [5, 13]], '2', 2.6, 2); S.path([[19, 22], [17, 12], [14, 6]], '2', 2.6, 2); S.path([[23, 22], [25, 13], [22, 8]], '2', 2.6, 2); // les cous
      S.ell(4, 13, 3, 2.5, '2'); S.ell(13, 5, 3, 2.5, '2'); S.ell(21, 7, 3, 2.5, '2'); // les têtes
      S.px(3, 12, 'y'); S.px(12, 4, 'y'); S.px(20, 6, 'y'); S.px(1, 15, 'w'); S.px(10, 7, 'w'); S.px(18, 9, 'w'); // les yeux, les crocs
    }, { 2: ['3', '1'] })]
  },
  // l'œil flottant : un grand œil, des tentacules, un petit œil au bout d'une tige
  oeil: {
    behavior: 'flyer', xp: 9, hp: 14, speed: 20, chase: 40, size: 32, anim: 'bob',
    pal: { k: '#1a1c2c', 1: '#4a1a3a', 2: '#8a3a6a', 3: '#c06aa0', w: '#f4f4e8', W: '#c8c0b8', i: '#e0b43a', b: '#080408', r: '#c9412f' },
    frames: [sculpt(32, function (S) {
      [[[11, 21], [8, 26], [6, 31]], [[14, 23], [14, 28], [12, 31]], [[19, 23], [20, 28], [22, 31]], [[22, 21], [26, 25], [27, 30]]].forEach(function (p) { S.path(p, '2', 1.4, 0.5); }); // les tentacules
      S.ell(16, 14, 11, 10, '2'); S.path([[18, 5], [20, 1]], '2', 0.8, 0.6); S.ell(21, 1, 1.5, 1.5, 'w'); // le corps, la tige
      S.ell(14, 14, 7, 6, 'w'); S.ell(13, 14, 3.5, 3.5, 'i'); S.ell(12, 14, 1.4, 2.6, 'b'); // l'œil
      S.line(19, 10, 21, 8, 'r', 0.3); S.line(20, 17, 22, 19, 'r', 0.3); // les veines
    }, { 2: ['3', '1'], w: [null, 'W'] })]
  }
};
Object.keys(DUNGEON_SPECIES).forEach(function (id) {
  SPECIES[id] = DUNGEON_SPECIES[id];
  var s = SPECIES[id], f = s.frames[0], n = f.length;
  if (s.frames.length < 2) s.frames.push(f.map(function (r, y) { return y === 0 ? '.'.repeat(r.length) : (y < n - 3 ? f[y - 1] : r); }));
});
var DUNGEON_SPECIES_IDS = Object.keys(DUNGEON_SPECIES);
var DUNGEON_SPECIES_NAMES = { gargouille: 'Gargouille', mimique: 'Mimique', spectre: 'Spectre', liche: 'Liche', golemrune: 'Golem runique', minotaure: 'Minotaure', chimere: 'Chimère', basilic: 'Basilic', follet: 'Feu-follet', crane: 'Crâne flottant', hydre: 'Hydre', oeil: 'Œil flottant' };
var DUNGEON_ROOM_TAGS = ['des profondeurs', 'de l’ombre', 'des ruines', 'du gouffre', 'des cendres', 'du néant'];

// ---------- Les trente donjons ----------
// nom, décor du combat (une terre), boss (espèce, nom), épithète des objets Uniques, présentation, nom du compagnon
var DUNGEONS = [
  ['La Crypte des Gargouilles', 'grottes', 'gargouille', 'La Gargouille Aînée', 'des Gargouilles', 'Des statues ailées sur chaque tombe. Elles tournent la tête quand on passe.', 'Caillou'],
  ['Le Trésor Maudit', 'temple', 'mimique', 'Le Grand Mimique', 'du Trésor maudit', 'Une salle pleine d’or. Les coffres ont des dents, et faim.', 'Coffret'],
  ['Le Couloir des Spectres', 'cimetiere', 'spectre', 'Le Spectre Pleureur', 'des Spectres', 'Un couloir sans fin où l’on entend pleurer. Les voix n’ont pas de corps.', 'Soupir'],
  ['Le Labyrinthe du Minotaure', 'bataille', 'minotaure', 'Le Minotaure Enchaîné', 'du Labyrinthe', 'Des murs qui changent de place, et au centre, quelqu’un qui tire sur ses chaînes.', 'Cornichon'],
  ['L’Antre du Basilic', 'epines', 'basilic', 'Le Basilic au Regard de Pierre', 'du Basilic', 'Des grenouilles de pierre partout. Elles ont croisé son regard.', 'Lézardin'],
  ['La Bibliothèque de la Liche', 'temple', 'liche', 'La Liche Bibliothécaire', 'de la Bibliothèque', 'Des livres qui chuchotent des sorts. Leur gardienne n’a pas fermé l’œil depuis mille ans.', 'Grimoire'],
  ['La Forge des Runes', 'mines', 'golemrune', 'Le Gardien des Runes', 'des Runes', 'Des enclumes qui gravent toutes seules des runes sur des géants de pierre.', 'Galet'],
  ['Le Marais des Follets', 'marais', 'follet', 'La Mère des Follets', 'des Follets', 'Des lumières bleues qui dansent sur la vase et attirent les imprudents.', 'Lueur'],
  ['Le Puits aux Crânes', 'cimetiere', 'crane', 'Le Crâne Hurlant', 'des Crânes', 'Un puits rempli de crânes qui brûlent sans se consumer. L’un d’eux crie.', 'Osselet'],
  ['La Fosse de l’Hydre', 'lagune', 'hydre', 'L’Hydre des Profondeurs', 'de l’Hydre', 'Une eau noire, et trois têtes qui en sortent. Puis six.', 'Trio'],
  ['L’Œil du Gouffre', 'abysse', 'oeil', 'L’Œil qui ne dort pas', 'du Gouffre', 'Tout en bas, un œil immense regarde vers le haut. Il t’attendait.', 'Pupille'],
  ['La Ménagerie de la Chimère', 'jungle', 'chimere', 'La Chimère Royale', 'de la Ménagerie', 'Des cages ouvertes, des bêtes cousues ensemble, et leur reine.', 'Grigri'],
  ['Le Cloître Pétrifié', 'temple', 'gargouille', 'Le Gardien Pétrifié', 'du Cloître', 'Un cloître où même la pluie s’est changée en pierre.', 'Granit'],
  ['Les Coffres du Roi Avide', 'dunes', 'mimique', 'Le Coffre du Roi Avide', 'du Roi avide', 'Le roi voulait tout garder. Son trésor l’a gardé, lui.', 'Pépite'],
  ['Le Manoir des Lamentations', 'saules', 'spectre', 'La Dame Blanche', 'des Lamentations', 'Un manoir englouti par les saules. Une dame y attend un bal qui ne viendra pas.', 'Voile'],
  ['L’Arène de Bronze', 'canyon', 'minotaure', 'Le Champion de Bronze', 'de l’Arène', 'Des gradins vides qui acclament encore. Le champion n’a jamais perdu.', 'Bronzé'],
  ['Les Serres Venimeuses', 'jungle', 'basilic', 'Le Basilic Émeraude', 'des Serres', 'Des serres de verre pleines de plantes qui mordent, et de ce qui les arrose.', 'Émeraude'],
  ['La Tour du Nécromant', 'orage', 'liche', 'Le Nécromant Couronné', 'du Nécromant', 'Une tour frappée par la foudre, où les morts montent la garde.', 'Fantôme'],
  ['Le Cœur Runique', 'forge', 'golemrune', 'Le Colosse Runique', 'du Cœur runique', 'Au cœur de la montagne, une rune géante qui bat comme un cœur.', 'Rune'],
  ['Le Bal des Feux-Follets', 'feerique', 'follet', 'Le Feu-Follet Couronné', 'du Bal', 'Un bal de lumières où l’on danse jusqu’à disparaître.', 'Étincelle'],
  ['L’Ossuaire Infini', 'cimetiere', 'crane', 'Le Roi des Crânes', 'de l’Ossuaire', 'Des galeries d’os rangés avec soin. Il en manque toujours un.', 'Tibia'],
  ['Le Lac aux Sept Têtes', 'leviathans', 'hydre', 'L’Hydre aux Sept Têtes', 'des Sept Têtes', 'Un lac souterrain qui siffle à sept voix.', 'Sifflet'],
  ['Le Regard du Néant', 'abysse', 'oeil', 'L’Œil du Néant', 'du Regard', 'Rien n’échappe à ce regard. Pas même la lumière.', 'Iris'],
  ['Le Zoo des Dieux Fous', 'dragons', 'chimere', 'La Chimère Primordiale', 'des Dieux fous', 'Les dieux s’ennuyaient : ils ont mélangé leurs bêtes. Celle-ci est la première.', 'Bazar'],
  ['Le Beffroi des Gargouilles', 'mont', 'gargouille', 'La Reine du Beffroi', 'du Beffroi', 'En haut d’un clocher sans cloche, des ailes de pierre attendent l’orage.', 'Gargouillou'],
  ['La Salle des Mille Coffres', 'cristaux', 'mimique', 'Le Mimique Impérial', 'des Mille Coffres', 'Mille coffres, mille trésors… et mille gueules.', 'Cadenas'],
  ['Le Royaume des Ombres', 'lac', 'spectre', 'La Reine des Ombres', 'des Ombres', 'Un royaume entier sans lumière. Sa reine n’en a jamais vu.', 'Pénombre'],
  ['Le Labyrinthe sans Fin', 'cite', 'minotaure', 'Le Minotaure Éternel', 'du Dédale', 'Personne n’en est sorti. Lui non plus, d’ailleurs.', 'Dédale'],
  ['La Bibliothèque Interdite', 'coeur', 'liche', 'La Liche Première', 'de l’Interdit', 'Les livres qu’on ne doit pas lire, et la première à les avoir lus.', 'Parchemin'],
  ['Le Néant', 'abysse', 'oeil', 'Le Dévoreur de Mondes', 'du Néant', 'Le dernier donjon. Il n’y a rien au fond, sauf ce qui a tout mangé.', 'Miette']
].map(function (d, i) {
  var w = BIOMES.map(function (b) { return b.id; }).indexOf(d[1]), sp = SPECIES[d[2]];
  // le boss : son espèce, en grand ; les douze premiers dans leurs couleurs, les suivants recolorés
  var shift = i < DUNGEON_SPECIES_IDS.length ? 0 : (i * 47) % 360, pal = {};
  Object.keys(sp.pal).forEach(function (c) { pal[c] = !shift || c === 'k' || !/^#[0-9a-f]{6}$/i.test(sp.pal[c]) ? sp.pal[c] : hueShift(sp.pal[c], shift, 1.15); });
  // les monstres des salles : trois autres espèces des donjons, recolorées à la façon de celui-ci
  var others = DUNGEON_SPECIES_IDS.filter(function (s) { return s !== d[2]; }), rooms = [0, 3, 7].map(function (k) { return others[(i * 5 + k) % others.length]; });
  var monsters = rooms.map(function (s, k) {
    var p = {}, rs = SPECIES[s], h = (i * 61 + k * 97) % 360;
    Object.keys(rs.pal).forEach(function (c) { p[c] = c === 'k' || !/^#[0-9a-f]{6}$/i.test(rs.pal[c]) ? rs.pal[c] : hueShift(rs.pal[c], h, 1); });
    return { species: s, name: DUNGEON_SPECIES_NAMES[s] + ' ' + DUNGEON_ROOM_TAGS[(i + k) % DUNGEON_ROOM_TAGS.length], pal: p };
  });
  return { id: 'd' + (i + 1), n: i, level: DUNGEON_EVERY * (i + 1), name: d[0], biome: Math.max(0, w), boss: { name: d[3], species: d[2], pal: pal }, of: d[4], desc: d[5], petName: d[6], monsters: monsters };
});
function dungeonById(id) { return DUNGEONS.filter(function (d) { return d.id === id; })[0] || null; }
function dungeonState(save, d) { return (save.dungeons && save.dungeons[d.id]) || { room: 0, day: '', lost: 0 }; }
// le temps avant de pouvoir retenter le monstre qui nous a battus (0 : on peut y aller)
function dungeonRetryIn(save, d) { return Math.max(0, (dungeonState(save, d).lost || 0) + DUNGEON_RETRY_MS - Date.now()); }
function dungeonCleared(save, d) { return dungeonState(save, d).room >= DUNGEON_ROOMS; }
// Un donjon s'ouvre quand on a son niveau et que le précédent est vidé ; un donjon où l'on est déjà entré (ou nettoyé)
// reste ouvert, même après une mutation qui ramène la grenouille au niveau 1
function dungeonOpen(save, d) { return dungeonState(save, d).room > 0 || (save.level >= d.level && (d.n === 0 || dungeonCleared(save, DUNGEONS[d.n - 1]))); }
// ce qui manque pour l'ouvrir
function dungeonLock(save, d) {
  if (dungeonOpen(save, d)) return '';
  if (d.n > 0 && !dungeonCleared(save, DUNGEONS[d.n - 1])) return 'Vide d’abord ' + DUNGEONS[d.n - 1].name;
  return 'Au niveau ' + d.level;
}
// le rang des objets qui y tombent : celui des terres de son niveau
function dungeonTier(d) { return Math.max(1, Math.min(CYCLE_TIER, Math.floor((d.level - 1) / 8) + 1)); } // (jamais celui de l'Éclipse)
// L'ennemi d'une salle (r de 1 à 10) : un niveau de plus par salle, un gardien à la 5e, le boss à la 10e (+2 niveaux).
// Sa force est celle des terres de son niveau (la terre « w » dont les étapes ont ce niveau), bien plus coriace (DUNGEON_POWER).
function dungeonFoe(d, r) {
  var boss = r === DUNGEON_ROOMS, guard = r === 5, lvl = d.level + r - 1 + (boss ? 2 : 0);
  var w = Math.max(0, Math.min(CYCLE_TIER - 1, Math.floor((lvl - 1) / 8))); // (les terres d'avant l'Éclipse : le dernier donjon dépasse le niveau 300)
  var variant = d.monsters[(r * 2 + d.n) % d.monsters.length], sp = SPECIES[boss ? d.boss.species : variant.species];
  var e = makeEnemy(w, lvl, variant, boss ? 'boss' : 'normal', 'des profondeurs');
  if (guard) { e.name = DUNGEON_SPECIES_NAMES[variant.species] + ' de garde'; e.rank = 'gardien'; e.maxHp = Math.round(e.maxHp * DUNGEON_POWER.guardHp); e.dmg = Math.round(e.dmg * DUNGEON_POWER.guardDmg); } // le gardien de la 5e salle
  e.level = lvl; // (pas de calage de cycle dans les donjons)
  if (boss) { e.name = d.boss.name; e.species = d.boss.species; e.pal = d.boss.pal; e.behavior = sp.behavior; }
  e.scale = boss ? 1.25 : (guard ? 0.95 : 0.8); // (des créatures 32 × 32 : un peu plus petites que nature, le boss plus grand)
  var deep = boss ? 1 : r - 1; // de salle en salle, un peu plus coriace
  e.maxHp = Math.round(e.maxHp * DUNGEON_POWER.hp * (1 + DUNGEON_POWER.roomHp * deep) * (boss ? (w < ISLAND_WORLDS ? DUNGEON_POWER.isleBoss : DUNGEON_POWER.boss) : (w < ISLAND_WORLDS ? DUNGEON_POWER.isleRoom : 1)));
  e.dmg = Math.round(e.dmg * DUNGEON_POWER.dmg * (1 + DUNGEON_POWER.roomDmg * deep) * (boss ? DUNGEON_POWER.bossDmg : 1));
  // (les donjons de l'Archipel et du Royaume étaient relevés à part avant que leurs terres le soient, LATE_POWER, worlds.js :
  // on retire ce renfort des terres pour garder leur force d'avant)
  var lp = playerCycle > 1 ? null : LATE_POWER[isleOf(w).id], lk = boss ? 1 : 0.5;
  if (lp) { e.maxHp = Math.round(e.maxHp / Math.pow(lp.hp, lk)); e.dmg = Math.round(e.dmg / Math.pow(lp.dmg, lk)); }
  var ib = DUNGEON_ISLE[isleOf(w).id]; // (l'Archipel, plus doux que ses voisines : ses donjons sont relevés)
  if (ib) { e.maxHp = Math.round(e.maxHp * ib.hp); e.dmg = Math.round(e.dmg * ib.dmg); }
  e.dungeon = d.id; e.room = r;
  return e;
}
// réglé au simulateur : en arrivant à son niveau avec des objets Rares, les salles du milieu se perdent souvent et le
// boss ne tombe qu'une fois sur trois ou quatre ; il faut monter, s'équiper, et revenir (une heure après une défaite)
// (isleRoom, isleBoss : les donjons de l'île, dont les monstres ordinaires sont plus doux ; guard : le gardien de la 5e salle)
var DUNGEON_ISLE = { archipel: { hp: 1.35, dmg: 1.15 }, royaume: { hp: 1.3, dmg: 1.12 } };
var DUNGEON_POWER = { hp: 1.04, dmg: 1.02, boss: 0.98, bossDmg: 1.03, isleBoss: 0.8, isleRoom: 1.75, guardHp: 1.14, guardDmg: 1.07, roomHp: 0.025, roomDmg: 0.02 };
// ce que rapporte une salle (une seule fois : un monstre vaincu ne revient pas) : une part d'un niveau
// (un donjon est dur et ne se fait qu'une fois : il paie bien, et son boss donne toujours un Unique)
function dungeonRewards(d, r) {
  var boss = r === DUNGEON_ROOMS, guard = r === 5, lvl = d.level + r - 1 + (boss ? 2 : 0);
  return { xp: Math.round(xpForLevel(lvl) * (boss ? 0.9 : (guard ? 0.3 : 0.18))), gold: Math.round((30 + 8 * lvl) * (boss ? 5 : (guard ? 2 : 1.5))), item: boss || guard ? 1 : DUNGEON_LOOT.room, luck: boss ? 1 : 0,
    unique: boss ? DUNGEON_LOOT.bossUnique : (guard ? DUNGEON_LOOT.guardUnique : DUNGEON_LOOT.unique) };
}

// ---------- Les objets Uniques des donjons : leurs propres modèles ----------
// Dix modèles par donjon (les six armes, écharpe, ceinture, anneau, couvre-chef), qu'on ne trouve que là : leurs formes
// (icônes « _d »), leurs couleurs (une teinte par donjon) et leurs noms (selon la sorte de panoplie du donjon, forge.js).
// Ils ne tombent jamais ailleurs (drop 0) ; leur force est celle des objets de leur rang.
var DUNGEON_NOUNS = [
  { baton: 'Gourdin', harpon: 'Pique', katana: 'Couperet', masse: 'Brise-crâne', kunai: 'Dague', shuriken: 'Roue', echarpe: 'Fourrure', ceinture: 'Ceinturon', anneau: 'Sceau', tete: 'Heaume', hat: 'cornes' },
  { baton: 'Bâton-griffe', harpon: 'Croc-lance', katana: 'Griffe', masse: 'Patte', kunai: 'Croc', shuriken: 'Griffe-étoile', echarpe: 'Crinière', ceinture: 'Lanière', anneau: 'Anneau-croc', tete: 'Masque', hat: 'ecorce' },
  { baton: 'Sceptre', harpon: 'Faux', katana: 'Fil', masse: 'Fléau', kunai: 'Stylet', shuriken: 'Croissant', echarpe: 'Voile', ceinture: 'Cordelière', anneau: 'Bague', tete: 'Capuche', hat: 'kasa' },
  { baton: 'Crosse', harpon: 'Hallebarde', katana: 'Épée-rune', masse: 'Maillet', kunai: 'Plume', shuriken: 'Sceau-étoile', echarpe: 'Étole', ceinture: 'Cordon', anneau: 'Anneau runique', tete: 'Mitre', hat: 'kasa' },
  { baton: 'Canne', harpon: 'Lance d’apparat', katana: 'Sabre', masse: 'Masse d’or', kunai: 'Lancette', shuriken: 'Écu', echarpe: 'Manteau', ceinture: 'Bourse', anneau: 'Chevalière', tete: 'Couronne', hat: 'bandeau' },
  { baton: 'Verge', harpon: 'Épieu', katana: 'Écorcheuse', masse: 'Étoile du matin', kunai: 'Saignoir', shuriken: 'Rasoir', echarpe: 'Linceul', ceinture: 'Garrot', anneau: 'Anneau de sang', tete: 'Casque à pointe', hat: 'cornes' }
];
var DUNGEON_ICONS = {
  // un sceptre coiffé d'un crâne
  baton_d: sculpt(16, function (S) { S.line(3, 15, 10, 6, '1', 0.6); S.ell(12, 4, 3, 3, '4'); S.px(11, 4, 'k'); S.px(13, 4, 'k'); S.line(9, 7, 7, 5, '1', 0.4); }, ICON_SHADES),
  // une faux
  harpon_d: sculpt(16, function (S) { S.line(3, 15, 9, 2, '4', 0.6); S.path([[9, 2], [13, 3], [15, 7]], '1', 1.2, 0.3); }, ICON_SHADES),
  // une lame dentelée
  katana_d: sculpt(16, function (S) { S.line(4, 12, 14, 1, '1', 1.3, 0.6); [[7, 8], [10, 5], [12, 3]].forEach(function (p) { S.px(p[0] + 1, p[1] + 1, '.'); }); S.rect(2, 11, 4, 3, '4'); S.line(1, 15, 3, 13, '4', 0.6); }, ICON_SHADES),
  // un fléau : une boule hérissée au bout d'une chaîne
  masse_d: sculpt(16, function (S) { S.line(2, 15, 6, 11, '4', 0.7); [[7, 10], [8, 8], [9, 7]].forEach(function (p) { S.px(p[0], p[1], 'b'); }); S.ell(12, 5, 3, 3, '1'); [[12, 1], [16, 5], [12, 9], [8, 4]].forEach(function (p) { S.px(Math.min(15, p[0]), p[1], '1'); }); }, ICON_SHADES),
  // une dague courbe et sa gemme
  kunai_d: sculpt(16, function (S) { S.path([[8, 10], [10, 5], [9, 0]], '1', 1.2, 0.3); S.rect(5, 10, 7, 2, '4'); S.line(8, 12, 8, 15, '4', 0.7); S.px(8, 11, '3'); }, ICON_SHADES),
  // une étoile à six branches
  shuriken_d: sculpt(16, function (S) { [[8, 0], [15, 4], [15, 11], [8, 15], [1, 11], [1, 4]].forEach(function (p) { S.line(8, 8, p[0], p[1], '1', 1.2, 0.3); }); S.ell(8, 8, 1.4, 1.4, '4'); }, ICON_SHADES),
  // une cape en lambeaux
  echarpe_d: sculpt(16, function (S) { S.rect(4, 2, 8, 11, '1'); S.path([[4, 2], [1, 13]], '1', 1, 1.5); S.path([[11, 2], [14, 13]], '1', 1, 1.5); [[3, 14], [7, 14], [11, 14]].forEach(function (p) { S.px(p[0], p[1], '1'); }); S.ell(8, 2, 2, 1.4, '4'); }, ICON_SHADES),
  // une ceinture et sa boucle en crâne
  ceinture_d: sculpt(16, function (S) { S.rect(0, 6, 16, 4, '1'); S.ell(8, 8, 3, 3, '4'); S.px(7, 8, 'k'); S.px(9, 8, 'k'); }, ICON_SHADES),
  // un anneau et sa grosse gemme
  anneau_d: sculpt(16, function (S) { S.ell(8, 11, 5, 3.5, '1'); S.ell(8, 11, 2.6, 1.6, '.'); S.ell(8, 5, 3.4, 3, '4'); S.px(7, 4, '3'); }, ICON_SHADES),
  // un heaume à crête, une fente pour les yeux
  casque_d: sculpt(16, function (S) { S.ell(8, 9, 6, 6, '1'); S.rect(4, 8, 9, 2, 'k'); S.path([[8, 3], [11, 0], [14, 2]], '4', 0.8, 0.5); }, ICON_SHADES)
};
Object.assign(ICONS, DUNGEON_ICONS);
// la force d'un objet de rang t (comme celle des objets des terres ; plus douce pour ceux de l'île)
function dungeonMain(t) { var w = t - 1; return w >= ISLAND_WORLDS ? continentMain(w) : 3 + 2.5 * w; }
(function () {
  var R = Math.round, SECOND = { echarpe: 'vitalite', ceinture: 'agilite', anneau: 'esprit', tete: 'vitalite' }, FOCUS = ['vitalite', 'force', 'agilite', 'esprit', 'agilite', 'force'];
  DUNGEONS.forEach(function (d) {
    var t = dungeonTier(d), nouns = DUNGEON_NOUNS[d.n % DUNGEON_NOUNS.length], focus = FOCUS[d.n % FOCUS.length], hue = (d.n * 47) % 360;
    var c = ['#9a6ad0', '#4a2a7a', '#e0c8ff', '#e0b43a', '#8a6a1a'].map(function (x, k) { return k < 3 ? hueShift(x, hue, 1.1) : x; }), wave = [c[2], c[0]];
    var cm = dungeonMain(t), main = R(cm), second = R(0.27 * cm), acc = R(0.33 * cm), accMain = Math.ceil(acc * 0.6), from = 'Unique de ' + d.name + '.';
    var pair = function (a, va, b, vb) { var o = {}; o[a] = va; o[b] = (o[b] || 0) + vb; return o; };
    var sec = function (not) { return focus !== not ? focus : 'vitalite'; };
    var accStats = function (slot) { var s2 = SECOND[slot] === focus ? 'force' : SECOND[slot]; return pair(focus, accMain, s2, acc - accMain); };
    var nm = function (k) { return nouns[k] + ' ' + d.of; }, add = {}, pre = 'u_' + d.id + '_';
    add[pre + 'baton'] = mkStaff(nm('baton'), pair('force', main, sec('force'), second), c, wave, 'Chaque coup libère une onde de choc. ' + from, 2);
    add[pre + 'harpon'] = mkStaff(nm('harpon'), pair('force', main, 'agilite', second), c, wave, 'Un coup d’estoc qui file très loin. ' + from, 0, 'harpon');
    add[pre + 'katana'] = mkKatana(nm('katana'), pair('force', main, sec('force'), second), c, wave, 'Des entailles vives qui font saigner. ' + from);
    add[pre + 'masse'] = mkMasse(nm('masse'), { force: R(main * 1.18), vitalite: second, agilite: -(1 + Math.floor(t / 5)) }, c, wave, 'Lourde, et le sol tremble. ' + from);
    add[pre + 'kunai'] = mkKunai(nm('kunai'), pair('agilite', main, sec('agilite'), second), c, wave, 'Lancée droit, elle traverse tout. ' + from, 200, true);
    add[pre + 'shuriken'] = mkShuriken(nm('shuriken'), pair('agilite', main, sec('agilite'), second), c, wave, 'Elle tournoie en sifflant. ' + from);
    add[pre + 'echarpe'] = mkScarf(nm('echarpe'), accStats('echarpe'), [c[0], c[1]], 'Elle flotte, même sans vent. ' + from);
    add[pre + 'ceinture'] = mkBelt(nm('ceinture'), accStats('ceinture'), [c[3], c[4], c[1], c[0]], c[2], 'Nouée serré. ' + from);
    add[pre + 'anneau'] = mkRing(nm('anneau'), accStats('anneau'), [c[0], c[1], c[2], c[3]], 'Sa gemme brille dans le noir. ' + from);
    add[pre + 'tete'] = mkHat(nm('tete'), accStats('tete'), nouns.hat === 'cornes' ? 'ecorce' : nouns.hat, [c[0], c[1], c[2], c[3]], 'Pour garder la tête froide. ' + from);
    if (nouns.hat === 'cornes') add[pre + 'tete'].look = { hat: 'cornes' };
    ['baton', 'harpon', 'katana', 'masse', 'kunai', 'shuriken', 'echarpe', 'ceinture', 'anneau'].forEach(function (s) { add[pre + s].icon = s + '_d'; });
    add[pre + 'tete'].icon = 'casque_d';
    Object.keys(add).forEach(function (id) { add[id].drop = 0; add[id].dungeon = d.id; ITEMS[id] = add[id]; ITEM_TIER[id] = t; });
    d.gear = Object.keys(add);
  });
})();
// Un objet Unique du donjon : un de ses modèles (que la grenouille peut porter), à la rareté Unique
function rollUnique(save, d) {
  var pool = d.gear.filter(function (id) { return itemAvailable(save, id); });
  if (!pool.length) return null;
  var base = pool[Math.floor(Math.random() * pool.length)], id = rollItem(save, base, 'unique');
  save.items[id].from = d.id;
  registerItem(id, save.items[id]);
  return id;
}
function todayKey() { var t = new Date(); return t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate(); }

// ---------- Les images des donjons ----------
var DungeonArt = (function () {
  var cache = {};
  // la petite porte (vignettes)
  function gate(d, lit) {
    var key = d.id + (lit ? 'l' : 'd');
    if (cache[key]) return cache[key];
    var b = BIOMES[d.biome], P = b.pal, W = 48, H = 40, c = document.createElement('canvas');
    c.width = W; c.height = H;
    var x = c.getContext('2d'), R = function (a, y, w, h, col) { x.fillStyle = col; x.fillRect(a, y, w, h); };
    R(0, 0, W, H, P.wallDark); for (var i = 0; i < 18; i++) R(hash(i, d.n, 3) * W, hash(i, d.n, 4) * 20, 3, 2, P.wall);
    R(0, 32, W, 8, P.groundDark);
    for (var y = 6; y < 33; y++) for (var a = 8; a < 40; a++) {
      var dx = (a - 23.5) / 16, dy = (y - 18) / 14, inArch = y >= 18 ? Math.abs(a - 23.5) < 16 : dx * dx + dy * dy < 1;
      var inDoor = y >= 18 ? Math.abs(a - 23.5) < 10 : ((a - 23.5) / 10) * ((a - 23.5) / 10) + ((y - 18) / 9) * ((y - 18) / 9) < 1;
      if (inArch && !inDoor) R(a, y, 1, 1, (Math.floor(y / 4) + Math.floor(a / 6)) % 2 ? '#7a7a84' : '#6a6a74');
      else if (inDoor) R(a, y, 1, 1, lit ? ((y + a) % 7 === 0 ? P.accent : '#140a1e') : '#0a0a10');
    }
    return (cache[key] = c.toDataURL());
  }
  // la grande illustration d'une carte : la salle du donjon, sa porte, ses torches et son boss qui attend.
  // Le décor et le voile sont dessinés une fois (layers) ; draw() y ajoute à chaque image ce qui bouge.
  var W = 240, H = 135, CX = 120;
  function layers(d, lit) {
    var key = 'L' + d.id + (lit ? 'l' : 'd');
    if (cache[key]) return cache[key];
    var b = BIOMES[d.biome], P = b.pal, mk = function () { var cv = document.createElement('canvas'); cv.width = W; cv.height = H; return cv; };
    var bg = mk(), fg = mk(), x = bg.getContext('2d'), R = function (a, y, w, h, col) { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(y), Math.round(w), Math.round(h)); };
    // le fond : les murs de la salle, des briques, des colonnes
    for (var yy = 0; yy < H; yy += 3) R(0, yy, W, 3, yy < 95 ? (yy % 6 ? P.wallDark : P.wall) : P.groundDark);
    for (var i = 0; i < 60; i++) R(hash(i, d.n, 11) * W, hash(i, d.n, 12) * 90, 6 + hash(i, d.n, 13) * 8, 2, i % 3 ? P.wall : '#000000');
    [24, 72, 168, 216].forEach(function (px, k) { R(px - 7, 10, 14, 86, '#1a1c2c'); R(px - 6, 10, 12, 86, k % 2 ? '#6a6a74' : '#5a5a64'); R(px - 6, 10, 3, 86, '#8a8a94'); R(px - 9, 8, 18, 5, '#1a1c2c'); R(px - 8, 9, 16, 3, '#7a7a84'); });
    // le sol en dalles
    for (var gy = 96; gy < H; gy += 6) for (var gx = (gy / 6) % 2 ? 0 : 8; gx < W; gx += 16) { R(gx, gy, 15, 5, P.ground); R(gx, gy, 15, 1, P.groundLight); }
    // la grande porte
    var top = 26;
    for (var y = top; y < 97; y++) {
      var ry = y - (top + 24), half = y < top + 24 ? Math.round(Math.sqrt(Math.max(0, 1 - (ry / 24) * (ry / 24))) * 34) : 34;
      R(CX - half - 6, y, 6, 1, '#1a1c2c'); R(CX + half, y, 6, 1, '#1a1c2c'); R(CX - half - 5, y, 4, 1, '#7a7a84'); R(CX + half + 1, y, 4, 1, '#6a6a74');
      R(CX - half, y, half * 2, 1, lit ? '#120818' : '#060608');
    }
    // les manches des torches, des os, des chaînes
    [[CX - 52, 52], [CX + 50, 52]].forEach(function (t) { R(t[0], t[1], 3, 14, '#5a3a20'); });
    for (var k2 = 0; k2 < 7; k2++) { var bx = hash(k2, d.n, 21) * W, by = 100 + hash(k2, d.n, 22) * 30; R(bx, by, 5, 2, '#d8d4c0'); R(bx + 1, by - 1, 1, 4, '#d8d4c0'); }
    [[46, 0], [194, 0]].forEach(function (ch) { for (var cy = 0; cy < 30; cy += 3) R(ch[0] + (cy % 6 ? 1 : 0), ch[1] + cy, 2, 2, '#4a4a54'); });
    // le voile : l'obscurité d'un donjon fermé, puis une vignette sombre
    var v = fg.getContext('2d');
    if (!lit) { v.fillStyle = 'rgba(4, 4, 8, 0.55)'; v.fillRect(0, 0, W, H); }
    var g = v.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 150); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.7)');
    v.fillStyle = g; v.fillRect(0, 0, W, H);
    // le boss (ses images), en couleurs ou en silhouette
    var sp = SPECIES[d.boss.species], pal = lit ? d.boss.pal : (function () { var p = {}; Object.keys(sp.pal).forEach(function (cc) { p[cc] = cc === 'k' ? '#000000' : '#16141c'; }); return p; })();
    var frames = sp.frames.map(function (f) { return stringsToCanvas(f, pal); });
    return (cache[key] = { bg: bg, fg: fg, frames: frames, glow: hueShift('#9a6ad0', (d.n * 47) % 360, 1.2) });
  }
  // une image de la carte au temps t (en secondes)
  function draw(x, d, lit, t) {
    var L = layers(d, lit), R = function (a, y, w, h, col) { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(y), Math.round(w), Math.round(h)); };
    x.imageSmoothingEnabled = false;
    x.drawImage(L.bg, 0, 0);
    if (lit) { // la lumière qui sort de la porte, qui respire
      var a = 0.55 + 0.2 * Math.sin(t * 1.7 + d.n), g = x.createRadialGradient(CX, 80, 4, CX, 80, 70);
      g.addColorStop(0, L.glow + Math.round(a * 255).toString(16).padStart(2, '0')); g.addColorStop(1, L.glow + '00');
      x.fillStyle = g; x.fillRect(CX - 70, 20, 140, 90);
      // les flammes des torches, qui vacillent
      [[CX - 52, 52], [CX + 50, 52]].forEach(function (tc, i) {
        var f = Math.sin(t * 11 + i * 2.1) + Math.sin(t * 17.3 + i), hgt = 6 + Math.round(f), sway = Math.round(Math.sin(t * 7 + i * 3) * 0.8);
        R(tc[0] - 2 + sway * 0.5, tc[1] - hgt, 7, hgt, '#ff8a2a'); R(tc[0] + sway, tc[1] - hgt - 3, 3, 4 + (f > 0.8 ? 1 : 0), '#ffe060');
        x.globalAlpha = 0.18 + 0.06 * f; x.fillStyle = '#ffb060'; x.beginPath(); x.arc(tc[0] + 1, tc[1] - 4, 13, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
      });
      // des braises qui montent de la porte
      for (var e = 0; e < 7; e++) {
        var life = (t * 0.35 + hash(e, d.n, 31)) % 1, ex = CX - 26 + hash(e, d.n, 32) * 52 + Math.sin(t * 1.3 + e) * 4, ey = 92 - life * 70;
        x.globalAlpha = Math.sin(life * Math.PI) * 0.85; R(ex, ey, e % 3 ? 1 : 2, e % 3 ? 1 : 2, e % 2 ? L.glow : '#ffd08a'); x.globalAlpha = 1;
      }
    }
    // le boss : il respire, et passe d'une image à l'autre
    var fr = L.frames[Math.floor(t * 1.6) % L.frames.length], bob = Math.round(Math.sin(t * 2.1) * 1.4);
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(CX - 22 + Math.abs(bob), 94, 44 - 2 * Math.abs(bob), 3);
    x.drawImage(fr, CX - 32, 32 + bob, 64, 64);
    if (!lit) { // fermé : deux yeux qui s'allument de temps en temps dans le noir
      var blink = (t + d.n * 1.7) % 5;
      if (blink < 1.2) { x.globalAlpha = Math.sin(blink / 1.2 * Math.PI) * 0.9; R(CX - 9, 52 + bob, 3, 2, '#ff4a3a'); R(CX + 6, 52 + bob, 3, 2, '#ff4a3a'); x.globalAlpha = 1; }
    }
    x.drawImage(L.fg, 0, 0);
  }
  function scene(d, lit) { // (une image fixe, pour ce qui n'est pas animé)
    var key = 's' + d.id + (lit ? 'l' : 'd');
    if (cache[key]) return cache[key];
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    draw(cv.getContext('2d'), d, lit, 0);
    return (cache[key] = cv.toDataURL());
  }
  return { gate: gate, scene: scene, draw: draw, W: W, H: H };
})();
