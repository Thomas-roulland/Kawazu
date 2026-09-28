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
  heroSkin = skinOf(save.hero && save.hero.skin);
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
// Peaux des anciens sages de la tour : la vieille mousse, le jade, l'ocre, la cendre bleue, le corail, la nuit
var EXTRA_SKINS = {
  mousse: { name: 'Vieille mousse', g: '#4a5a3a', m: '#7a8a5a', l: '#b3c08a', c: '#e8e4c8' },
  jade: { name: 'Jade', g: '#1f6a5a', m: '#3fa68a', l: '#8fe0c0', c: '#eaf7ee' },
  ocre: { name: 'Ocre', g: '#8a4a1a', m: '#c9782a', l: '#f0b060', c: '#fff0d0' },
  azur: { name: 'Cendre bleue', g: '#3a4a6b', m: '#5f7aa8', l: '#a8c0e8', c: '#eef2fa' },
  corail: { name: 'Corail', g: '#9a3a4a', m: '#e0607a', l: '#ffa8b8', c: '#fff0f2' },
  nuit: { name: 'Nuit', g: '#241a3a', m: '#4a3a6b', l: '#8a78c0', c: '#e6e0f7' }
};
function skinOf(id) { return SKINS[id] || EXTRA_SKINS[id] || SKINS.marais; }

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
// ---------- Le grand catalogue : des modèles pour chaque biome ----------
// Chaque modèle peut tomber Commun, Rare ou Épique (voir rollItem) : ses stats ci-dessous sont celles d'un Commun.
function mkStaff(name, stats, c, wave, desc, big, look) {
  return {
    slot: 'arme', kind: 'baton', name: name, icon: look === 'harpon' ? 'harpon' : 'baton', stats: stats, drop: 2, desc: desc,
    colors: { 1: c[0], 2: c[1], 3: c[2], 4: c[3] || '#5a3e25', b: c[4] || '#3e2a19' }, blade: c[0], wave: wave, look: { weapon: look || 'baton' },
    attack: look === 'harpon' ? { fx: { type: 'thrust' }, reach: 36, narrow: true, durations: [0.11, 0.06, 0.06, 0.12] }
      : { fx: { type: 'arc', radii: big ? [6, 11, 15] : [5, 9, 13], echo: big === 2 }, reach: big ? 26 : 20, durations: [0.1, 0.07, 0.07, 0.15] }
  };
}
function mkKunai(name, stats, c, wave, desc, range, pierce) {
  return {
    slot: 'arme', kind: 'kunai', name: name, icon: 'kunai', stats: stats, drop: 2, desc: desc,
    colors: { 1: c[0], 2: c[1], 3: c[2], 4: '#4a3325', b: '#2e2018' }, blade: c[0], wave: wave, look: { weapon: 'kunai' },
    attack: { range: range, speed: 200 + range / 2, pierce: !!pierce, durations: [0.07, 0.05, 0.05, 0.1] }
  };
}
function mkScarf(name, stats, c, desc) { return { slot: 'echarpe', name: name, icon: 'echarpe', stats: stats, drop: 2, desc: desc, colors: { 1: c[0], 2: c[1] }, scarf: [c[0], c[1]] }; }
function mkBelt(name, stats, c, charm, desc) {
  return { slot: 'ceinture', name: name, icon: 'ceinture', stats: stats, drop: 2, desc: desc, colors: { 1: c[0], 2: c[1], 3: c[2], 4: c[3] }, belt: [c[0], c[3]], charm: charm, look: charm ? { belt: true, charm: true } : { belt: true } };
}
function mkRing(name, stats, c, desc) { return { slot: 'anneau', name: name, icon: 'anneau', stats: stats, drop: 2, desc: desc, colors: { 1: c[0], 2: c[1], 3: c[2], 4: c[3] }, look: { ring: true } }; }
function mkHat(name, stats, hat, c, desc) {
  return { slot: 'tete', name: name, icon: { kasa: 'kasa', nenuphar: 'nenuphar', ecorce: 'casque' }[hat], stats: stats, drop: 2, desc: desc, colors: { 1: c[0], 2: c[1], 3: c[2], 4: c[3] || c[1] }, look: { hat: hat } };
}
Object.assign(ITEMS, {
  // Marais-Brume
  baton_bambou: mkStaff('Bâton de bambou', { force: 2, agilite: 1 }, ['#b8c96a', '#7a8a3a', '#e8f0b0'], ['#e0e8c0', '#8a9a5a'], 'Léger et creux : il siffle quand on le fait tourner.'),
  kunai_bronze: mkKunai('Kunaï de bronze', { force: 2 }, ['#c98a4a', '#8a5a2a', '#f0c08a'], ['#f0d0a8', '#8a6a4a'], 'Un peu mou, mais il ne rouille jamais.', 110),
  echarpe_algue: mkScarf('Écharpe d’algues', { vitalite: 1, souffle: 1 }, ['#3a8a5a', '#1f5a3a'], 'Encore humide. Elle sent la vase, et c’est rassurant.'),
  ceinture_lianes: mkBelt('Ceinture de lianes', { vitalite: 1, agilite: 1 }, ['#4e7a2a', '#2f4a1a', '#8fce52', '#8fce52'], null, 'Trois lianes tressées, nouées sur le côté.'),
  anneau_os: mkRing('Anneau d’os', { force: 1, vitalite: 1 }, ['#e8e0c8', '#a89a7a', '#ffffff', '#6e5a3a'], 'Taillé dans l’os d’un vieux brochet.'),
  kasa_voyageur: mkHat('Kasa du voyageur', { vitalite: 1, agilite: 1 }, 'kasa', ['#b8a36a', '#7a6a3a', '#e0d0a0'], 'Le chapeau des grenouilles qui partent loin.'),
  // Lagune des Lucioles
  kunai_os: mkKunai('Kunaï d’os', { force: 3, agilite: 1 }, ['#e8e0c8', '#a89a7a', '#ffffff'], ['#fff8e8', '#a89a7a'], 'Pointu et léger, il file sans bruit.', 130),
  baton_saule: mkStaff('Canne de saule', { force: 3, vitalite: 1 }, ['#9ac06a', '#5e8a3a', '#d4f0a0'], ['#d4f0b0', '#5e8a3a'], 'Souple : elle plie, mais ne rompt jamais.'),
  echarpe_luciole: mkScarf('Écharpe des lucioles', { agilite: 2, souffle: 1 }, ['#c9f07a', '#5a8a2a'], 'Elle brille doucement la nuit.'),
  ceinture_ecailles: mkBelt('Ceinture d’écailles', { vitalite: 2, souffle: 1 }, ['#2f6a6a', '#1a3a3a', '#5fb3a0', '#5fb3a0'], '#c9f07a', 'Des écailles de carpe, cousues une à une.'),
  anneau_rosee: mkRing('Anneau de rosée', { souffle: 2, vitalite: 1 }, ['#9cc7e0', '#3a7fc9', '#e8f4ff', '#3a7fc9'], 'Une goutte d’eau figée qui ne sèche jamais.'),
  feuille_lotus: mkHat('Feuille de lotus', { souffle: 2, agilite: 1 }, 'nenuphar', ['#ff9ac0', '#c95a8a', '#ffd0e0'], 'Rose et parfumée. Les moustiques l’évitent.'),
  // Forêt des Saules
  baton_ferre: mkStaff('Bâton ferré', { force: 5, vitalite: 1 }, ['#9aa8b8', '#5a6a7a', '#d9e1e6'], ['#d9e1e6', '#5a6a7a'], 'Cerclé de fer aux deux bouts. Chaque coup résonne.', 1),
  harpon_corail: mkStaff('Harpon de corail', { force: 4, agilite: 2 }, ['#ff8a7a', '#b84a3a', '#ffd0c8', '#8d6a45', '#5a3e25'], ['#ffd0c8', '#b84a3a'], 'Une pointe de corail rouge, très tranchante.', 0, 'harpon'),
  kunai_obsidienne: mkKunai('Kunaï d’obsidienne', { force: 5, agilite: 1 }, ['#5a4a6a', '#2a2a3a', '#a89ac0'], ['#a89ac0', '#3a3a4a'], 'Noir et luisant. Il coupe l’air.', 150),
  echarpe_automne: mkScarf('Écharpe d’automne', { force: 2, vitalite: 2 }, ['#e07a2a', '#9a4a1a'], 'La couleur des saules en octobre.'),
  ceinture_cuir: mkBelt('Ceinture de cuir clouté', { force: 2, vitalite: 2 }, ['#5a3e25', '#3e2a19', '#8d6a45', '#cfd8dc'], '#cfd8dc', 'Des clous d’argent tout le long. Sérieuse.'),
  anneau_braise: mkRing('Anneau de braise', { force: 3 }, ['#ff6a3a', '#b8321a', '#ffd08a', '#5a2a12'], 'Il reste chaud, même au fond de l’eau.'),
  feuille_automne: mkHat('Feuille d’automne', { vitalite: 2, agilite: 1 }, 'nenuphar', ['#e0a03a', '#9a6a1a', '#f8d08a'], 'Une large feuille rousse, tombée d’un vieux saule.'),
  // Grottes Luisantes
  kunai_givre: mkKunai('Kunaï de givre', { force: 6, souffle: 1 }, ['#bff0ff', '#5fa3c0', '#ffffff'], ['#e8fbff', '#5fa3c0'], 'Il laisse une traînée de buée derrière lui.', 160),
  baton_lune: mkStaff('Bâton de lune', { force: 6, souffle: 2 }, ['#d8e0f8', '#8a9ac8', '#ffffff', '#3a4a6b', '#1f2a4a'], ['#f4f6ff', '#8a9ac8'], 'Pâle comme la lune des grottes, avec un écho argenté.', 2),
  echarpe_nuit: mkScarf('Écharpe de nuit', { agilite: 3, souffle: 1 }, ['#3a3a6b', '#1a1a3a'], 'Noire comme les galeries. On ne te voit pas venir.'),
  ceinture_cristal: mkBelt('Ceinture de cristal', { souffle: 3, vitalite: 1 }, ['#5fa3c0', '#2c5a73', '#bff0ff', '#e0f7ff'], '#bff0ff', 'Des éclats de cristal qui tintent à chaque pas.'),
  anneau_lune: mkRing('Anneau de lune', { agilite: 2, souffle: 2 }, ['#d8e0f8', '#8a9ac8', '#ffffff', '#3a4a6b'], 'Il luit faiblement dans le noir.'),
  heaume_cristal: mkHat('Heaume de cristal', { vitalite: 3, souffle: 1 }, 'ecorce', ['#5fa3c0', '#2c5a73', '#bff0ff', '#ffffff'], 'Taillé d’un seul bloc. Un peu froid aux oreilles.'),
  // Temple Englouti
  trident_englouti: mkStaff('Trident englouti', { force: 6, agilite: 2 }, ['#7af0d0', '#3a9a8a', '#d0fff4', '#3e4e54', '#243238'], ['#d0fff4', '#3a9a8a'], 'Remonté des ruines, couvert de runes qui luisent.', 0, 'harpon'),
  kunai_venin: mkKunai('Kunaï venimeux', { force: 6, agilite: 2 }, ['#8fce52', '#3a7a2a', '#e8f7a0'], ['#c9f07a', '#3a7a2a'], 'Sa lame est enduite d’un poison vert du temple.', 170),
  baton_corail: mkStaff('Bâton de corail', { force: 7, vitalite: 2 }, ['#ff8a9a', '#c94a6a', '#ffd0d8'], ['#ffe0e6', '#c94a6a'], 'Du corail rose pétrifié. Lourd, mais quelle onde !', 1),
  echarpe_marees: mkScarf('Écharpe des marées', { vitalite: 3, souffle: 2 }, ['#2f8fa0', '#1a4a5a'], 'Elle ondule même quand il n’y a pas de vent.'),
  ceinture_coquillages: mkBelt('Ceinture de coquillages', { agilite: 3, vitalite: 2 }, ['#e8d8c8', '#a8988a', '#fff0f4', '#ff9ac0'], '#fff0f4', 'Des coquillages nacrés qui s’entrechoquent doucement.'),
  anneau_corail: mkRing('Anneau de corail', { vitalite: 3, agilite: 1 }, ['#ff8a9a', '#c94a6a', '#ffd0d8', '#7af0d0'], 'Il sent encore la mer.'),
  // Sommet du Héron
  baton_braise: mkStaff('Bâton de braise', { force: 9, souffle: 2 }, ['#ff7a3a', '#c9412f', '#ffd08a', '#3e1a0a', '#1a0a04'], ['#ffd08a', '#e05a2a'], 'Il fume encore. Son onde brûle deux fois.', 2),
  kunai_tempete: mkKunai('Kunaï de tempête', { force: 9, agilite: 3 }, ['#e8f0ff', '#8aa8d8', '#ffffff'], ['#ffffff', '#8aa8d8'], 'Lancé du sommet, il traverse tout ce qu’il croise.', 200, true),
  echarpe_givre: mkScarf('Écharpe de givre', { agilite: 3, vitalite: 3 }, ['#e8f7ff', '#8ab8d8'], 'Tissée de neige du sommet. Elle ne fond jamais.'),
  ceinture_jade: mkBelt('Ceinture de jade', { force: 3, souffle: 3 }, ['#3fa68a', '#1f6a5a', '#8fe0c0', '#e0b43a'], '#8fe0c0', 'Des plaques de jade reliées par un fil d’or.'),
  anneau_givre: mkRing('Anneau de givre', { souffle: 3, vitalite: 2 }, ['#bff0ff', '#5fa3c0', '#ffffff', '#2c5a73'], 'Il givre les doigts, et l’esprit s’éclaircit.'),
  kasa_noir: mkHat('Kasa noir', { agilite: 3, force: 2 }, 'kasa', ['#3a3a4a', '#1a1a24', '#6a6a7a'], 'Le chapeau des ninjas du sommet. Personne ne sait qui est dessous.')
});

// Trésors de la Tour des Cent Sages (un par Grand Sage, tous les 10 étages) et de l'album : jamais en boutique
// ni en butin. from dit où les trouver (tour : l'étage ; album : le palier).
Object.assign(ITEMS, {
  anneau_sages: {
    slot: 'anneau', name: 'Anneau des Sages', icon: 'anneau', stats: { souffle: 2, agilite: 2 }, drop: 0, reward: true, from: { tour: 10 },
    desc: 'Un anneau d’ambre chaude, remis par la Doyenne Hasuno à qui atteint le 10e étage.',
    colors: { 1: '#f07a3a', 2: '#9a4212', 3: '#ffd08a', 4: '#4e9a45' }, look: { ring: true }
  },
  echarpe_sages: {
    slot: 'echarpe', name: 'Écharpe des Sages', icon: 'echarpe', stats: { souffle: 2, force: 2, vitalite: 1 }, drop: 0, reward: true, from: { tour: 20 },
    desc: 'Orange vif, comme le ciel du mont Kaeru au couchant.',
    colors: { 1: '#f07a3a', 2: '#9a3a1f' }, scarf: ['#f07a3a', '#9a3a1f']
  },
  kasa_sages: {
    slot: 'tete', name: 'Kasa des Sages', icon: 'kasa', stats: { vitalite: 2, agilite: 2, souffle: 1 }, drop: 0, reward: true, from: { tour: 30 },
    desc: 'Le grand chapeau laqué des ermites du mont Kaeru. La pluie d’huile glisse dessus.',
    colors: { 1: '#e05a2a', 2: '#9a3a1f', 3: '#ffb070' }, look: { hat: 'kasa' }
  },
  corde_sacree: {
    slot: 'ceinture', name: 'Corde sacrée', icon: 'ceinture', stats: { vitalite: 3, souffle: 3 }, drop: 0, reward: true, from: { tour: 40 },
    desc: 'Une corde de paille tressée, comme celles qui ceignent les rochers sacrés, avec ses rubans de papier.',
    colors: { 1: '#f4ecd8', 2: '#b8a36a', 3: '#ffffff', 4: '#c9412f' }, belt: ['#f4ecd8', '#c9412f'], charm: '#f4f4e8', look: { belt: true, charm: true }
  },
  baton_anciens: {
    slot: 'arme', kind: 'baton', name: 'Bâton des Anciens', icon: 'baton', stats: { force: 6, souffle: 2 }, drop: 0, reward: true, from: { tour: 50 },
    desc: 'Laqué de vermillon, cerclé d’or. Son onde orange revient en écho, comme un second coup.',
    colors: { 1: '#e07a2a', 2: '#9a3a1f', 3: '#ffd08a', 4: '#e0b43a', b: '#5a2a12' },
    blade: '#e07a2a', wave: ['#ffd08a', '#e07a2a'],
    look: { weapon: 'baton' },
    attack: { fx: { type: 'arc', radii: [6, 11, 16], echo: true }, reach: 28, durations: [0.1, 0.07, 0.07, 0.15] }
  },
  kunai_huile: {
    slot: 'arme', kind: 'kunai', name: 'Kunaï d’huile sacrée', icon: 'kunai', stats: { force: 7, agilite: 2 }, drop: 0, reward: true, from: { tour: 60 },
    desc: 'Trempé dans les cascades d’huile du mont Kaeru : il file loin et traverse tout.',
    colors: { 1: '#f3c23a', 2: '#c98a1a', 3: '#fff0a8', 4: '#5a2a12', b: '#3e1a0a' },
    blade: '#f3c23a', wave: ['#fff0a8', '#c98a1a'],
    look: { weapon: 'kunai' },
    attack: { range: 180, speed: 300, pierce: true, durations: [0.07, 0.05, 0.05, 0.1] }
  },
  anneau_mont: {
    slot: 'anneau', name: 'Anneau du mont Kaeru', icon: 'anneau', stats: { vitalite: 3, force: 3 }, drop: 0, reward: true, from: { tour: 70 },
    desc: 'Taillé dans le jade des pics sacrés. Il pèse lourd, et c’est rassurant.',
    colors: { 1: '#3fbf8a', 2: '#1f7a5a', 3: '#bff0cf', 4: '#e0b43a' }, look: { ring: true }
  },
  echarpe_crepuscule: {
    slot: 'echarpe', name: 'Écharpe du crépuscule', icon: 'echarpe', stats: { agilite: 3, souffle: 3, vitalite: 2 }, drop: 0, reward: true, from: { tour: 80 },
    desc: 'Teinte du violet des soirs de la tour, quand les lanternes s’allument une à une.',
    colors: { 1: '#b84aa0', 2: '#6a2a6b' }, scarf: ['#b84aa0', '#6a2a6b']
  },
  couronne_crapaud: {
    slot: 'tete', name: 'Couronne du Crapaud-Roi', icon: 'casque', stats: { vitalite: 3, souffle: 3, force: 2 }, drop: 0, reward: true, from: { tour: 90 },
    desc: 'Une couronne d’écorce dorée, que seuls les ermites les plus anciens ont portée.',
    colors: { 1: '#e0b43a', 2: '#8a6f1f', 3: '#fff0a8', 4: '#c9412f' }, look: { hat: 'ecorce' }
  },
  ceinture_premier_sage: {
    slot: 'ceinture', name: 'Ceinture du Premier Sage', icon: 'ceinture', stats: { force: 4, vitalite: 4, agilite: 3, souffle: 3 }, drop: 0, reward: true, from: { tour: 100 },
    desc: 'Au sommet de la tour, le Premier Sage la dénoue et te la tend. Tout le mont Kaeru s’incline.',
    colors: { 1: '#e07a2a', 2: '#9a3a1f', 3: '#f3d27a', 4: '#fff6b0' }, belt: ['#e07a2a', '#f3d27a'], charm: '#fff6b0', look: { belt: true, charm: true }
  },
  anneau_naturaliste: {
    slot: 'anneau', name: 'Anneau du naturaliste', icon: 'anneau', stats: { agilite: 3, souffle: 2 }, drop: 0, reward: true, from: { album: 'monstres' },
    desc: 'Pour qui a croisé toutes les bêtes du marais… et tous les Grands Sages de la tour.',
    colors: { 1: '#8fce52', 2: '#4e9a45', 3: '#e8f7a0', 4: '#7a5634' }, look: { ring: true }
  },
  echarpe_collection: {
    slot: 'echarpe', name: 'Écharpe du collectionneur', icon: 'echarpe', stats: { vitalite: 2, agilite: 2, force: 2, souffle: 2 }, drop: 0, reward: true, from: { album: 'objets' },
    desc: 'Un patchwork de toutes les étoffes du marais. Unique, forcément.',
    colors: { 1: '#9cc7e0', 2: '#c9412f' }, scarf: ['#9cc7e0', '#c9412f']
  }
});
ITEMS.ceinture_champion.from = ITEMS.ceinture_dojo.from = { dojo: true };

var ITEM_TIER = {
  echarpe_roseaux: 1, dent_brochet: 1, anneau_vase: 1, chapeau_paille: 1, feuille_nenuphar: 1,
  harpon_pecheur: 2, perle_rosee: 2, anneau_nenuphar: 2, echarpe_brume: 2, couronne_mousse: 2,
  lame_jade: 3, casque_ecorce: 3, lame_cristal: 3,
  plume_heron: 4, echarpe_ancestrale: 4
};
Object.assign(ITEM_TIER, {
  baton_bambou: 1, kunai_bronze: 1, echarpe_algue: 1, ceinture_lianes: 1, anneau_os: 1, kasa_voyageur: 1,
  kunai_os: 2, baton_saule: 2, echarpe_luciole: 2, ceinture_ecailles: 2, anneau_rosee: 2, feuille_lotus: 2,
  baton_ferre: 3, harpon_corail: 3, kunai_obsidienne: 3, echarpe_automne: 3, ceinture_cuir: 3, anneau_braise: 3, feuille_automne: 3,
  kunai_givre: 4, baton_lune: 4, echarpe_nuit: 4, ceinture_cristal: 4, anneau_lune: 4, heaume_cristal: 4,
  trident_englouti: 5, kunai_venin: 5, baton_corail: 5, echarpe_marees: 5, ceinture_coquillages: 5, anneau_corail: 5,
  baton_braise: 6, kunai_tempete: 6, echarpe_givre: 6, ceinture_jade: 6, anneau_givre: 6, kasa_noir: 6
});

// ---------- Raretés : chaque objet trouvé est un exemplaire unique ----------
// Commun, Rare ou Épique : la bordure change de couleur, et les stats sont tirées au hasard à la création
// (plus fortes, avec des stats en plus, pour les raretés hautes). Un exemplaire a pour identifiant
// « modèle#code » ; ses données (modèle, rareté, stats) sont gardées dans save.items, et il est enregistré
// dans ITEMS comme n'importe quel objet : tout le reste du jeu (équipement, stats, apparence) le traite pareil.
// Les trésors (tour, dojo, album) ont des stats fixes et comptent comme Épiques.
var RARITIES = {
  commun: { name: 'Commun', color: '#b8c0b0', mult: 1, extra: 0, price: 1 },
  rare: { name: 'Rare', color: '#4f9ae8', mult: 1.35, extra: 1, price: 1.8 },
  epique: { name: 'Épique', color: '#b86ae8', mult: 1.75, extra: 2, price: 3 }
};
var RARITY_IDS = ['commun', 'rare', 'epique'];
var BASE_IDS = Object.keys(ITEMS); // les modèles (les exemplaires s'ajoutent à ITEMS ensuite)
function baseOf(id) { return String(id).split('#')[0]; }
function rarityOf(id) { var it = ITEMS[id]; return !it ? 'commun' : (it.rarity || (it.reward ? 'epique' : 'commun')); }
function tierOf(id) { return ITEM_TIER[baseOf(id)] || 1; }
function registerItem(id, inst) {
  var b = inst && ITEMS[inst.base];
  if (!b || id.indexOf('#') < 0 || !RARITIES[inst.rar] || !inst.stats || typeof inst.stats !== 'object') return false;
  var stats = {};
  Object.keys(inst.stats).forEach(function (k) { if (BASE_STATS[k] !== undefined && typeof inst.stats[k] === 'number') stats[k] = Math.round(inst.stats[k]); });
  ITEMS[id] = Object.assign({}, b, { stats: stats, rarity: inst.rar, base: inst.base });
  return true;
}
// Un nouvel exemplaire d'un modèle : ses stats tirées selon la rareté
function rollItem(save, base, rar) {
  var b = ITEMS[base], R = RARITIES[rar], stats = {};
  Object.keys(b.stats).forEach(function (k) {
    var v = b.stats[k];
    stats[k] = v < 0 ? v : Math.max(1, Math.round(v * R.mult * (0.8 + Math.random() * 0.4)));
  });
  var others = Object.keys(BASE_STATS).filter(function (k) { return stats[k] === undefined; });
  for (var i = 0; i < R.extra && others.length; i++) {
    if (rar === 'rare' && Math.random() < 0.5) break; // un Rare a une chance sur deux d'avoir une stat de plus
    var k = others.splice(Math.floor(Math.random() * others.length), 1)[0];
    stats[k] = 1 + Math.floor(Math.random() * (rar === 'epique' ? 3 : 2));
  }
  var id = base + '#' + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 6);
  save.items[id] = { base: base, rar: rar, stats: stats };
  registerItem(id, save.items[id]);
  return id;
}
// La rareté d'une trouvaille : luck 0 (normal), 1 (boss, monstre rare), 2 (monstre épique), 'shop' (boutique)
function rollRarity(luck) {
  var p = { 0: [0.72, 0.24, 0.04], 1: [0.45, 0.4, 0.15], 2: [0.2, 0.45, 0.35], shop: [0.6, 0.3, 0.1] }[luck || 0], r = Math.random();
  return r < p[0] ? 'commun' : (r < p[0] + p[1] ? 'rare' : 'epique');
}
// Les modèles qu'on peut trouver jusqu'à un rang (ceux du rang atteint un peu plus souvent)
function lootPool(maxTier) {
  return BASE_IDS.filter(function (id) { return ITEMS[id].drop > 0 && (ITEM_TIER[id] || 1) <= maxTier; });
}
function pickBase(maxTier) {
  var pool = lootPool(maxTier), weight = function (id) { return ITEMS[id].drop * ((ITEM_TIER[id] || 1) === maxTier ? 2 : 1); };
  var total = pool.reduce(function (s, id) { return s + weight(id); }, 0), r = Math.random() * total;
  for (var i = 0; i < pool.length; i++) { r -= weight(pool[i]); if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}
// On ne garde dans save.items que les exemplaires qu'on possède, qu'on porte ou qui sont à l'étal
function pruneItems(save) {
  var keep = {};
  save.owned.concat(save.shop || [], Object.keys(save.equip).map(function (k) { return save.equip[k]; })).forEach(function (id) { if (id && save.items[id]) keep[id] = save.items[id]; });
  save.items = keep;
}


// ---------- Lucioles (monnaie) et prix ----------
function itemPrice(id) {
  var it = ITEMS[id], t = tierOf(id);
  var power = Object.keys(it.stats).reduce(function (s, k) { return s + Math.abs(it.stats[k]); }, 0);
  return Math.round((20 + t * t * 30 + power * 12) * RARITIES[rarityOf(id)].price);
}
function sellPrice(id) { return Math.max(3, Math.floor(itemPrice(id) / 4)); }

// Butin : un nouvel exemplaire d'un modèle de rang autorisé, de rareté tirée au sort (luck : voir rollRarity)
function rollLoot(save, maxTier, chance, luck) {
  if (Math.random() > chance) return null;
  return rollItem(save, pickBase(maxTier), rollRarity(luck));
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
    items: {}, // les exemplaires d'objets : id -> { base, rar, stats }
    gifts: [], // cadeaux du dojo déjà reçus (leur identifiant, pour ne jamais les compter deux fois)
    tower: 0, // le plus haut étage vaincu de la Tour des Cent Sages
    album: { monstres: {}, objets: [], paliers: [] }, // bestiaire (id -> victoires), objets découverts, paliers réclamés
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
  // les exemplaires d'abord, pour que l'inventaire, l'étal et l'équipement les reconnaissent
  if (data.items && typeof data.items === 'object') Object.keys(data.items).forEach(function (id) { if (registerItem(id, data.items[id])) save.items[id] = { base: data.items[id].base, rar: data.items[id].rar, stats: ITEMS[id].stats }; });
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
  save.tower = Math.min(100, int(data.tower, 0) || 0);
  var al = data.album && typeof data.album === 'object' ? data.album : {};
  save.album = { monstres: {}, objets: [], paliers: [] };
  if (al.monstres && typeof al.monstres === 'object') Object.keys(al.monstres).forEach(function (k) { var n = int(al.monstres[k], 1); if (n && k.length < 12) save.album.monstres[k] = n; });
  if (Array.isArray(al.objets)) save.album.objets = al.objets.filter(function (id) { return ITEMS[id]; });
  if (Array.isArray(al.paliers)) save.album.paliers = al.paliers.filter(function (id) { return typeof id === 'string'; });
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
  if (save.items) pruneItems(save);
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
