// Objets, emplacements d'équipement, stats, butin et sauvegarde.

var SLOTS = [
  { id: 'tete', name: 'Tête' },
  { id: 'arme', name: 'Arme' },
  { id: 'echarpe', name: 'Écharpe' },
  { id: 'ceinture', name: 'Ceinture' },
  { id: 'anneau', name: 'Anneau' }
];

var STATS = [
  { id: 'vitalite', name: 'Vitalité', color: '#c9412f', hint: 'cœurs' },
  { id: 'agilite', name: 'Agilité', color: '#8fce52', hint: 'vitesse' },
  { id: 'force', name: 'Force', color: '#e0b43a', hint: 'dégâts' },
  { id: 'souffle', name: 'Souffle', color: '#6f8fe0', hint: 'vitesse d’attaque' }
];
var BASE_STATS = { vitalite: 6, agilite: 9, force: 5, souffle: 7 };
var STAT_MAX = 30;

// Niveaux : l'XP des combats fait monter de niveau ; chaque niveau donne 3 points de caractéristique
// et 1 point de compétence, à dépenser au camp. playerAlloc pointe sur les points répartis de la sauvegarde chargée.
var POINTS_PER_LEVEL = 3;
function xpForLevel(level) { return Math.round(20 * Math.pow(level, 1.5)); }
var playerAlloc = { vitalite: 0, agilite: 0, force: 0, souffle: 0 };
var playerTreeStats = {}; // stats données par l'arbre de compétences
var playerHermit = false; // mode Ermite : mains nues, peau orange, yeux de crapaud
var playerLevel = 1;

// À appeler quand la sauvegarde change (chargement, arbre, création) : met à jour les bonus globaux
function setPlayer(save) {
  playerAlloc = save.alloc;
  playerTreeStats = treeBonuses(save).stats;
  heroSkin = SKINS[save.hero && save.hero.skin] || SKINS.marais;
  playerHermit = chosenVoie(save) === 'ermite'; // la voie de l'Ermite met la grenouille en mode Ermite
  playerLevel = save.level;
}

// Ajoute de l'XP ; renvoie le nombre de niveaux gagnés
function gainXp(save, amount) {
  var gained = 0;
  save.xp += Math.round(amount);
  while (save.level < MAX_LEVEL && save.xp >= xpForLevel(save.level)) {
    save.xp -= xpForLevel(save.level);
    save.level++;
    save.points += POINTS_PER_LEVEL;
    save.skillPoints += 1;
    gained++;
  }
  if (save.level >= MAX_LEVEL) save.xp = 0; // niveau maximum atteint
  return gained;
}

// Icônes 16×16 : k = contour, 1 = couleur principale, 2 = ombre, 3 = reflet, 4 = secondaire, b = secondaire sombre
var ICONS = {
  kunai: [
    '.......kk.......', '......k31k......', '......k31k......', '.....k3312k.....',
    '.....k3112k.....', '.....k3112k.....', '......k12k......', '.....kkkkkk.....',
    '......k44k......', '......k4bk......', '......k44k......', '......k4bk......',
    '......k44k......', '.....kk..kk.....', '.....k....k.....', '......kkkk......'
  ],
  baton: [
    '......kkkk......', '.....k3311k.....', '.....k3112k.....', '......k12k......',
    '.......kk.......', '......k44k......', '......k4bk......', '......k44k......',
    '......k4bk......', '......k44k......', '......k4bk......', '......k44k......',
    '......k4bk......', '......k44k......', '......k4bk......', '.......kk.......'
  ],
  harpon: [
    '.......k........', '......k3k.......', '.....k331k......', '....kk312kk.....',
    '...k1kk1kk1k....', '....k.k12k.k....', '......k12k......', '.......kk.......',
    '......k44k......', '......k4bk......', '......k44k......', '......k4bk......',
    '......k44k......', '......k4bk......', '......k44k......', '.......kk.......'
  ],
  echarpe: [
    '................', '..kkkkkkkkkkk...', '.k11111111111k..', '.k12222222221k..',
    '..kkkkk1kkkkk...', '......k1k.......', '.....k121k......', '.....k121k......',
    '....k1221k......', '....k121k.......', '...k1221k.......', '...k121k........',
    '...k1k1k........', '...kk.kk........', '................', '................'
  ],
  ceinture: [
    '................', '................', '................', '................',
    '.....kkkkkkk....', 'kkkkk4444444kkkk', 'k3333k4kkk4k333k', 'k1111k4k1k4k111k',
    'k1111k4k1k4k111k', 'k2222k4kkk4k222k', 'kkkkk4444444kkkk', '.....kkkkkkk....',
    '................', '................', '................', '................'
  ],
  anneau: [
    '................', '................', '.......kk.......', '......k33k......',
    '.....k3113k.....', '....kk1112kk....', '...k44k22k44k...', '..k44kkkkkk44k..',
    '..k4k......k4k..', '..k4k......k4k..', '..k44k....k44k..', '...k44kkkk44k...',
    '....kk4444kk....', '......kkkk......', '................', '................'
  ],
  kasa: [
    '................', '................', '................', '................',
    '.......kk.......', '......k33k......', '.....k3311k.....', '....k331111k....',
    '...k33111111k...', '..k3111111122k..', '.k111111112222k.', 'kkkkkkkkkkkkkkkk',
    '.k2222222222222k', '..kkkkkkkkkkkkk.', '................', '................'
  ],
  nenuphar: [
    '................', '................', '.....kkkkkk.....', '...kk331111kk...',
    '..k3311111111k..', '.k31111kk11111k.', '.k3111k44k1111k.', '.k1111k44k1111k.',
    '.k11111kk11122k.', '..k1111111222k..', '...kk1112..kk...', '.....kkkk.k.....',
    '................', '................', '................', '................'
  ],
  casque: [
    '................', '................', '................', '.....kkkkkk.....',
    '....k331111k....', '...k33111111k...', '..k3311111112k..', '..k3111111122k..',
    '..k1111111122k..', '..kkkkkkkkkkkk..', '..k4444444444k..', '..kkkkkkkkkkkk..',
    '................', '................', '................', '................'
  ]
};

// Deux familles d'armes :
// - kind 'baton' : corps à corps, onde de choc devant Kawazu (attack.fx, attack.reach en px) ;
// - kind 'kunai' : à distance, le kunaï est lancé dans la direction du regard
//   (attack.range en px, attack.speed en px/s, attack.pierce : traverse les ennemis).
// look : ce qui se voit sur Kawazu. attack.durations : durée des 4 images de l'attaque.
var ITEMS = {
  baton_roseau: {
    slot: 'arme', kind: 'baton', name: 'Bâton de roseau', icon: 'baton', stats: { force: 3 }, drop: 0,
    desc: 'Un roseau durci au feu. Chaque coup libère une onde de choc grise en demi-cercle.',
    colors: { 1: '#8aa84a', 2: '#5e8a3a', 3: '#c9e07a', 4: '#b8ad6e', b: '#8a7f4a' },
    blade: '#8aa84a', wave: ['#c3c9d1', '#7d8694'],
    look: { weapon: 'baton' },
    attack: { fx: { type: 'arc', radii: [5, 9, 13] }, reach: 20, durations: [0.09, 0.07, 0.07, 0.14] }
  },
  kunai_rouille: {
    slot: 'arme', kind: 'kunai', name: 'Kunaï rouillé', icon: 'kunai', stats: { force: 1 }, drop: 0,
    desc: 'Trouvé dans la vase. Se lance vite, mais ne va pas bien loin.',
    colors: { 1: '#9a8a7a', 2: '#6e5f52', 3: '#c4b8a8', 4: '#4a3325', b: '#2e2018' },
    blade: '#9a8a7a', wave: ['#b5aa9c', '#6e6559'],
    look: { weapon: 'kunai' },
    attack: { range: 90, speed: 200, durations: [0.06, 0.05, 0.05, 0.08] }
  },
  kunai_acier: {
    slot: 'arme', kind: 'kunai', name: 'Kunaï d’acier', icon: 'kunai', stats: { force: 3 }, drop: 0,
    desc: 'Le kunaï fidèle de Kawazu, lancé droit et loin.',
    colors: { 1: '#d9e1e6', 2: '#a9b3bf', 3: '#ffffff', 4: '#4a3325', b: '#2e2018' },
    blade: '#d9e1e6', wave: ['#c3c9d1', '#7d8694'],
    look: { weapon: 'kunai' },
    attack: { range: 140, speed: 250, durations: [0.08, 0.06, 0.06, 0.12] }
  },
  lame_jade: {
    slot: 'arme', kind: 'baton', name: 'Bâton de jade', icon: 'baton', stats: { force: 4, souffle: 1 }, drop: 2,
    desc: 'Surmonté d’une pierre de jade. Grande onde verte doublée d’un écho, mais plus lente.',
    colors: { 1: '#7fd6a0', 2: '#3f9a6a', 3: '#d4f7e0', 4: '#5a3e25', b: '#3e2a19' },
    blade: '#7fd6a0', wave: ['#bff0cf', '#3f9a6a'],
    look: { weapon: 'baton' },
    attack: { fx: { type: 'arc', radii: [6, 11, 15], echo: true }, reach: 28, durations: [0.12, 0.08, 0.08, 0.18] }
  },
  harpon_pecheur: {
    slot: 'arme', kind: 'baton', name: 'Harpon du pêcheur', icon: 'harpon', stats: { force: 2, agilite: 1 }, drop: 3,
    desc: 'Coup d’estoc : des chevrons filent tout droit, très loin, mais sur une ligne étroite.',
    colors: { 1: '#b8c4cc', 2: '#7d8694', 3: '#ffffff', 4: '#8d6a45', b: '#5a3e25' },
    blade: '#b8c4cc', wave: ['#d4ecf7', '#5d8fb0'],
    look: { weapon: 'harpon' },
    attack: { fx: { type: 'thrust' }, reach: 36, narrow: true, durations: [0.11, 0.06, 0.06, 0.12] }
  },
  echarpe_rouge: {
    slot: 'echarpe', name: 'Écharpe rouge', icon: 'echarpe', stats: { vitalite: 1 }, drop: 0,
    desc: 'Celle qu’il ne quitte jamais.',
    colors: { 1: '#c9412f', 2: '#86261c' }, scarf: ['#c9412f', '#86261c']
  },
  echarpe_roseaux: {
    slot: 'echarpe', name: 'Écharpe des roseaux', icon: 'echarpe', stats: { agilite: 2 }, drop: 3,
    desc: 'Tissée en fibres de roseau, légère comme le vent.',
    colors: { 1: '#d6b43f', 2: '#8a6f1f' }, scarf: ['#d6b43f', '#8a6f1f']
  },
  echarpe_brume: {
    slot: 'echarpe', name: 'Écharpe de brume', icon: 'echarpe', stats: { souffle: 2, vitalite: 1 }, drop: 2,
    desc: 'Toujours un peu humide. On respire mieux avec.',
    colors: { 1: '#4f7fc9', 2: '#2c4a86' }, scarf: ['#4f7fc9', '#2c4a86']
  },
  ceinture_corde: {
    slot: 'ceinture', name: 'Ceinture de corde', icon: 'ceinture', stats: { agilite: 1 }, drop: 0,
    desc: 'Une corde de chanvre nouée à la taille, avec une boucle de laiton.',
    colors: { 1: '#6e4a2a', 2: '#4a3325', 3: '#8d6a45', 4: '#e0b43a' }, belt: ['#6e4a2a', '#e0b43a'], look: { belt: true }
  },
  dent_brochet: {
    slot: 'ceinture', name: 'Ceinture à dent de brochet', icon: 'ceinture', stats: { force: 1, agilite: 1 }, drop: 3,
    desc: 'Cuir sombre et, pendue à la boucle, la dent d’un brochet vaincu.',
    colors: { 1: '#3e2a19', 2: '#241810', 3: '#5a3e25', 4: '#efe6a8' }, belt: ['#3e2a19', '#b8ad6e'], charm: '#efe6a8', look: { belt: true, charm: true }
  },
  // récompenses du dojo (jamais en boutique ni en butin)
  ceinture_champion: {
    slot: 'ceinture', name: 'Ceinture du champion', icon: 'ceinture', stats: { force: 2, agilite: 2, vitalite: 2 }, drop: 0, reward: true,
    desc: 'Remise chaque lundi à la première grenouille du dojo. Soie noire, boucle d’or en forme de grenouille.',
    colors: { 1: '#1a1c2c', 2: '#0b0c14', 3: '#3a3c4c', 4: '#f3d27a' }, belt: ['#22243a', '#f3d27a'], charm: '#f3d27a', look: { belt: true, charm: true }
  },
  ceinture_dojo: {
    slot: 'ceinture', name: 'Ceinture du dojo', icon: 'ceinture', stats: { force: 1, agilite: 2 }, drop: 0, reward: true,
    desc: 'Pour les grenouilles du podium du dojo : une ceinture pourpre nouée à la façon des maîtres.',
    colors: { 1: '#7a2a4a', 2: '#4a1a2e', 3: '#a84a6a', 4: '#cfd8dc' }, belt: ['#7a2a4a', '#cfd8dc'], look: { belt: true }
  },
  perle_rosee: {
    slot: 'ceinture', name: 'Ceinture de rosée', icon: 'ceinture', stats: { souffle: 3 }, drop: 2,
    desc: 'Tressée d’algues bleues, fermée par une perle de rosée qui ne s’évapore jamais.',
    colors: { 1: '#3a7fc9', 2: '#1f4a6b', 3: '#8fc6f0', 4: '#e8f4ff' }, belt: ['#3a7fc9', '#e8f4ff'], charm: '#9cc7e0', look: { belt: true, charm: true }
  },
  anneau_nenuphar: {
    slot: 'anneau', name: 'Anneau de nénuphar', icon: 'anneau', stats: { agilite: 2 }, drop: 3,
    desc: 'On a les pieds plus légers en le portant.',
    colors: { 1: '#e8897a', 2: '#b85a4c', 3: '#ffd1c8', 4: '#4f8a3c' }, look: { ring: true }
  },
  anneau_vase: {
    slot: 'anneau', name: 'Anneau de vase', icon: 'anneau', stats: { vitalite: 2 }, drop: 3,
    desc: 'Lourd, pas très joli, mais solide.',
    colors: { 1: '#8d7a58', 2: '#54462f', 3: '#b3a07a', 4: '#54462f' }, look: { ring: true }
  },
  chapeau_paille: {
    slot: 'tete', name: 'Chapeau de paille', icon: 'kasa', stats: { agilite: 1, souffle: 1 }, drop: 3,
    desc: 'Un grand chapeau conique de pêcheur. Protège du soleil du marais.',
    colors: { 1: '#d6b45a', 2: '#9a7a32', 3: '#f0d88a' }, look: { hat: 'kasa' }
  },
  feuille_nenuphar: {
    slot: 'tete', name: 'Feuille de nénuphar', icon: 'nenuphar', stats: { vitalite: 1, souffle: 1 }, drop: 3,
    desc: 'Posée entre les deux yeux, avec sa petite fleur rose.',
    colors: { 1: '#5d9a4a', 2: '#2f6b3d', 3: '#8fce52', 4: '#e8897a' }, look: { hat: 'nenuphar' }
  },
  casque_ecorce: {
    slot: 'tete', name: 'Casque d’écorce', icon: 'casque', stats: { vitalite: 3, agilite: -1 }, drop: 1,
    desc: 'Taillé dans un vieux saule. Très solide, un peu lourd.',
    colors: { 1: '#8d6a45', 2: '#5a3e25', 3: '#b38a5e', 4: '#3e2a19' }, look: { hat: 'ecorce' }
  }
};

var STARTER_ITEMS = ['baton_roseau', 'kunai_rouille', 'kunai_acier', 'echarpe_rouge', 'ceinture_corde'];
var DEFAULT_EQUIP = { tete: null, arme: 'baton_roseau', echarpe: 'echarpe_rouge', ceinture: 'ceinture_corde', anneau: null };

// Les objets à collectionner (sans les récompenses du dojo, réservées au podium)
function collectible(id) { return ITEMS[id] && !ITEMS[id].reward; }

function computeStats(equip) {
  var s = Object.assign({}, BASE_STATS);
  Object.keys(playerAlloc).forEach(function (k) { s[k] += playerAlloc[k]; });
  Object.keys(playerTreeStats).forEach(function (k) { s[k] += playerTreeStats[k]; });
  Object.keys(equip).forEach(function (slot) {
    var it = slot === 'arme' ? weaponOf(equip) : ITEMS[equip[slot]];
    if (!it) return;
    Object.keys(it.stats).forEach(function (k) { s[k] += it.stats[k]; });
  });
  return s;
}

// En mode Ermite, pas d'arme : les mains nues frappent au corps à corps avec une onde de paume
var HERMIT_SKIN = { name: 'Mode Ermite', g: '#9a4212', m: '#e07a2a', l: '#f8b060', c: '#fff0c8' };
function hermitHands() {
  return {
    slot: 'arme', kind: 'mains', name: 'Mains de l’ermite', icon: 'baton', drop: 0,
    stats: { force: 2 + Math.floor(playerLevel / 2), souffle: 2 },
    desc: 'Mode Ermite : pas d’arme, que la paume. Plus fortes à chaque niveau.',
    blade: '#f3d27a', wave: ['#fff0a0', '#e07a2a'],
    look: { weapon: 'mains' },
    attack: { fx: { type: 'palm' }, reach: 20, durations: [0.1, 0.06, 0.06, 0.14] }
  };
}
function weaponOf(equip) {
  if (playerHermit) return hermitHands();
  return ITEMS[equip.arme] || ITEMS.baton_roseau;
}
function isRanged(weapon) { return weapon.kind === 'kunai'; }

// Ce qui se voit sur Kawazu (calques + onde de l'arme ; un kunaï lancé n'a pas d'onde)
function lookFor(equip) {
  var look = {};
  ['tete', 'ceinture', 'anneau'].forEach(function (slot) {
    var it = ITEMS[equip[slot]];
    if (it && it.look) Object.assign(look, it.look);
  });
  var w = weaponOf(equip);
  look.weapon = w.look.weapon;
  look.hermit = playerHermit;
  look.fx = isRanged(w) ? { type: 'none' } : w.attack.fx;
  return look;
}

// Couleurs de peau au choix à la création de la grenouille
var SKINS = {
  marais: { name: 'Vert marais', g: '#2e6b3d', m: '#4e9a45', l: '#8fce52', c: '#efe6a8' },
  lagune: { name: 'Bleu lagune', g: '#1f4a6b', m: '#3a7fc9', l: '#8fc6f0', c: '#e8f0f7' },
  venin: { name: 'Rouge venin', g: '#86261c', m: '#c9412f', l: '#f08a6a', c: '#f3d27a' },
  soleil: { name: 'Or soleil', g: '#8a6f1f', m: '#d6a82a', l: '#f3e28a', c: '#fff6d8' },
  orchidee: { name: 'Violet orchidée', g: '#4a2a6b', m: '#7a4aa8', l: '#b88ae0', c: '#f0e0ff' },
  cendre: { name: 'Gris cendre', g: '#3e434b', m: '#6b7280', l: '#a3abb6', c: '#e6e8c8' }
};
var heroSkin = SKINS.marais;

// Couleurs du héros selon sa peau et son équipement
function paletteFor(basePal, equip) {
  var skin = playerHermit ? HERMIT_SKIN : heroSkin;
  var pal = Object.assign({}, basePal, { g: skin.g, m: skin.m, l: skin.l, c: skin.c });
  // Ermite : iris jaune (E), pupille en barre, marques rouge-orangé autour des yeux (Z)
  if (playerHermit) { pal.E = '#f3d23a'; pal.Z = '#b8321a'; }
  var scarf = ITEMS[equip.echarpe];
  if (scarf) { pal.r = scarf.scarf[0]; pal.R = scarf.scarf[1]; }
  var weapon = weaponOf(equip);
  pal.t = weapon.blade; pal.a = weapon.wave[0]; pal.A = weapon.wave[1];
  var hat = ITEMS[equip.tete];
  if (hat) { pal.H = hat.colors[1]; pal.I = hat.colors[2]; pal.J = hat.colors[3]; pal.P = hat.colors[4] || hat.colors[3]; }
  var belt = ITEMS[equip.ceinture];
  if (belt) { pal.b = belt.belt[0]; pal.y = belt.belt[1]; pal.Y = belt.charm || belt.belt[1]; }
  var ring = ITEMS[equip.anneau];
  if (ring) pal.N = ring.colors[1];
  return pal;
}

// Stats de combat au tour par tour, tirées des caractéristiques
// Vitalité → PV, Force → dégâts, Agilité → critique, esquive et initiative, Souffle → réserve et récupération
function combatStats(stats) {
  return {
    maxHp: 20 + stats.vitalite * 6,
    dmg: 2 + stats.force * 1.1,
    crit: Math.min(0.4, 0.05 + stats.agilite * 0.008),
    dodge: Math.min(0.3, stats.agilite * 0.006),
    agi: stats.agilite,
    maxSouffle: 3 + Math.floor(stats.souffle / 4),
    regen: 1 + (stats.souffle >= 14 ? 1 : 0)
  };
}

// Objets des environnements avancés
Object.assign(ITEMS, {
  lame_cristal: {
    slot: 'arme', kind: 'kunai', name: 'Kunaï de cristal', icon: 'kunai', stats: { force: 6, souffle: 1 }, drop: 2,
    desc: 'Taillé dans les Grottes Luisantes. Il file très loin et traverse les ennemis.',
    colors: { 1: '#b8e8ff', 2: '#5fa3c0', 3: '#ffffff', 4: '#2c3f73', b: '#1d2a52' },
    blade: '#b8e8ff', wave: ['#e0f7ff', '#5fa3c0'],
    look: { weapon: 'kunai' },
    attack: { range: 180, speed: 300, pierce: true, durations: [0.07, 0.05, 0.05, 0.1] }
  },
  couronne_mousse: {
    slot: 'tete', name: 'Couronne de mousse', icon: 'casque', stats: { vitalite: 2, souffle: 2 }, drop: 2,
    desc: 'Tressée par les saules eux-mêmes. Elle repousse un peu chaque matin.',
    colors: { 1: '#4f7a36', 2: '#2f4a2a', 3: '#8fce52', 4: '#e0b43a' }, look: { hat: 'ecorce' }
  },
  plume_heron: {
    slot: 'ceinture', name: 'Ceinture de plumes du héron', icon: 'ceinture', stats: { force: 3, souffle: 2 }, drop: 1,
    desc: 'Des plumes grises tombées du Sommet, cousues sur une large ceinture. On frappe sans hésiter.',
    colors: { 1: '#d9e1e6', 2: '#9aa8b8', 3: '#ffffff', 4: '#e0b43a' }, belt: ['#d9e1e6', '#e0b43a'], charm: '#9aa8b8', look: { belt: true, charm: true }
  },
  echarpe_ancestrale: {
    slot: 'echarpe', name: 'Écharpe ancestrale', icon: 'echarpe', stats: { vitalite: 3, force: 2, agilite: 1 }, drop: 1,
    desc: 'Brodée d’or, portée jadis par le premier ninja du marais.',
    colors: { 1: '#e0b43a', 2: '#8a6f1f' }, scarf: ['#e0b43a', '#8a6f1f']
  }
});

// Rang de chaque objet : un objet n'apparaît qu'à partir de l'environnement correspondant
// (rang ≤ numéro du donjon dans BIOMES, en partant de 1)
var ITEM_TIER = {
  echarpe_roseaux: 1, dent_brochet: 1, anneau_vase: 1, chapeau_paille: 1, feuille_nenuphar: 1,
  harpon_pecheur: 2, perle_rosee: 2, anneau_nenuphar: 2, echarpe_brume: 2, couronne_mousse: 2,
  lame_jade: 3, casque_ecorce: 3, lame_cristal: 3,
  plume_heron: 4, echarpe_ancestrale: 4
};

// ---------- Lucioles (monnaie) et prix ----------
function itemPrice(id) {
  var it = ITEMS[id], t = ITEM_TIER[id] || 1;
  var power = Object.keys(it.stats).reduce(function (s, k) { return s + Math.abs(it.stats[k]); }, 0);
  return 20 + t * t * 30 + power * 12;
}
function sellPrice(id) { return Math.max(3, Math.floor(itemPrice(id) / 4)); }

// Butin : un objet pas encore trouvé et de rang autorisé (pondéré par « drop »)
function rollLoot(owned, maxTier, chance) {
  if (Math.random() > chance) return null;
  var pool = Object.keys(ITEMS).filter(function (id) {
    return ITEMS[id].drop > 0 && owned.indexOf(id) < 0 && (ITEM_TIER[id] || 1) <= maxTier;
  });
  var total = pool.reduce(function (s, id) { return s + ITEMS[id].drop; }, 0);
  if (!total) return null;
  var r = Math.random() * total;
  for (var i = 0; i < pool.length; i++) {
    r -= ITEMS[pool[i]].drop;
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// ---------- Sauvegarde ----------
// Enregistrée automatiquement dans le navigateur (localStorage), et exportable dans un fichier.
// Attention : le navigateur range la sauvegarde par adresse (fichier ouvert en double-clic ≠ http://localhost),
// d'où l'export / import pour la retrouver partout.
var SAVE_VERSION = 4;

function newSave() {
  return {
    v: SAVE_VERSION, hero: null, // hero = { name, skin } une fois la grenouille créée
    equip: Object.assign({}, DEFAULT_EQUIP), owned: STARTER_ITEMS.slice(),
    level: 1, xp: 0, points: 0, alloc: { vitalite: 0, agilite: 0, force: 0, souffle: 0 },
    skillPoints: 0, voie: null, tree: [], deck: [], gold: 30,
    progress: [0, 0, 0, 0, 0, 0], expedition: null, shop: [],
    ach: [], // hauts faits obtenus (voir feats.js)
    gifts: [], // cadeaux du dojo déjà reçus (leur identifiant, pour ne jamais les compter deux fois)
    battle: { auto: false, speed: 1 }
  };
}

// Construit une sauvegarde propre à partir de données lues (localStorage ou fichier importé)
function parseSave(data) {
  var save = newSave();
  if (!data || typeof data !== 'object') return save;
  var int = function (v, min) { return typeof v === 'number' && v >= min ? Math.floor(v) : null; };
  if (data.hero && typeof data.hero.name === 'string') {
    save.hero = { name: data.hero.name.slice(0, 16) || 'Kawazu', skin: SKINS[data.hero.skin] ? data.hero.skin : 'marais' };
  } else if (int(data.level, 2)) {
    save.hero = { name: 'Kawazu', skin: 'marais' }; // ancienne partie : on garde Kawazu
  }
  save.level = int(data.level, 1) || 1;
  save.xp = int(data.xp, 0) || 0;
  save.points = int(data.points, 0) || 0;
  save.gold = int(data.gold, 0) != null ? int(data.gold, 0) : 30;
  if (data.alloc) Object.keys(save.alloc).forEach(function (k) { save.alloc[k] = int(data.alloc[k], 0) || 0; });
  save.level = Math.min(MAX_LEVEL, save.level);
  if (data.v === SAVE_VERSION) {
    save.skillPoints = int(data.skillPoints, 0) || 0;
    save.voie = VOIES.some(function (v) { return v.id === data.voie; }) ? data.voie : null;
    if (Array.isArray(data.tree)) save.tree = data.tree.filter(function (id) { var n = nodeById(id); return n && n.voie === save.voie; });
    if (Array.isArray(data.deck)) save.deck = data.deck.filter(function (id) { return skillById(id); }).slice(0, DECK_SIZE);
  } else {
    // l'arbre de compétences a changé : on rend 1 point par niveau déjà gagné
    save.skillPoints = save.level - 1;
    if (data.v === 3) save.notice = 'Le Temple des voies a été refait : 5 chemins de 10 étapes par voie. Tes ' + save.skillPoints + ' points de compétence te sont rendus : choisis ta voie !';
  }
  if (Array.isArray(data.shop)) save.shop = data.shop.filter(function (id) { return ITEMS[id] || id === TEA_ID; });
  if (data.expedition && data.expedition.endsAt) save.expedition = data.expedition;
  if (Array.isArray(data.progress)) data.progress.forEach(function (n, i) { if (i < save.progress.length) save.progress[i] = Math.min(10, int(n, 0) || 0); });
  if (data.battle) save.battle = { auto: !!data.battle.auto, speed: [1, 2, 4].indexOf(data.battle.speed) >= 0 ? data.battle.speed : 1 };
  if (Array.isArray(data.owned)) data.owned.forEach(function (id) { if (ITEMS[id] && save.owned.indexOf(id) < 0) save.owned.push(id); });
  if (data.equip && !('ceinture' in data.equip)) {
    // ancienne partie : l'amulette devient la ceinture ; sans amulette, la ceinture de corde d'origine
    data.equip.ceinture = data.equip.amulette || 'ceinture_corde';
  }
  SLOTS.forEach(function (sl) {
    var id = data.equip && data.equip[sl.id];
    if (id === null || (ITEMS[id] && ITEMS[id].slot === sl.id && save.owned.indexOf(id) >= 0)) save.equip[sl.id] = id;
  });
  if (!save.equip.arme) save.equip.arme = DEFAULT_EQUIP.arme; // toujours une arme en main
  // hauts faits : null = partie d'avant les hauts faits, ils seront rangés sans être annoncés
  save.ach = Array.isArray(data.ach) ? data.ach.filter(function (id) { return typeof id === 'string'; }) : null;
  save.gifts = Array.isArray(data.gifts) ? data.gifts.filter(function (id) { return typeof id === 'string'; }).slice(-50) : [];
  return save;
}

// En ligne, chaque grenouille a sa propre copie locale (la partie hors ligne n'est jamais écrasée)
function saveKey() { return 'kawazu.save' + (window.Cloud && Cloud.id ? '.' + Cloud.id : ''); }

function loadSave() {
  var data = null;
  try {
    var raw = localStorage.getItem(saveKey());
    if (raw) data = JSON.parse(raw);
  } catch (e) { /* stockage indisponible : nouvelle partie */ }
  var save = parseSave(data);
  setPlayer(save);
  return save;
}

function writeSave(save) {
  try { localStorage.setItem(saveKey(), JSON.stringify(save)); } catch (e) { /* ignoré */ }
  if (window.Cloud && Cloud.id) Cloud.push(save); // partie en ligne : envoyée au serveur
}

function iconCanvas(item, locked) {
  var grid = ICONS[item.icon];
  var c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  var ctx = c.getContext('2d');
  for (var y = 0; y < 16; y++) {
    for (var x = 0; x < 16; x++) {
      var ch = grid[y][x];
      if (!ch || ch === '.') continue;
      ctx.fillStyle = locked ? (ch === 'k' ? '#0f1512' : '#2a3a31') : (ch === 'k' ? '#1a1c2c' : item.colors[ch] || item.colors[1]);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}
