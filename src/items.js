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
  { id: 'esprit', name: 'Esprit', color: '#b08af0', hint: 'sorts' }
];
// Les caractéristiques de départ sans voie (chaque voie a les siennes : VOIES[].base)
var BASE_STATS = { vitalite: 6, agilite: 9, force: 5, esprit: 7 };
var STAT_MAX = 30;

// Niveaux : l'XP des combats fait monter de niveau ; chaque niveau donne 3 points de caractéristique
// et 1 point de voie, à dépenser au camp. playerAlloc pointe sur les points répartis de la sauvegarde chargée ;
// selon la voie, un point vaut plus dans certaines caractéristiques (×2 dans celle de la voie, ×1,5 dans la seconde).
var POINTS_PER_LEVEL = 3;
function xpForLevel(level) { return Math.round(20 * Math.pow(level, 1.5)); }
var playerAlloc = { vitalite: 0, agilite: 0, force: 0, esprit: 0 };
var playerVoie = null;    // la voie de la grenouille chargée
var playerTreeStats = {}; // stats données par les dalles du Temple
var playerHermit = false; // mode Ermite : mains nues, peau orange, yeux de crapaud
var playerLevel = 1;
// Les bonus du clan (le butin : +2 % par niveau) sur l'XP et les lucioles gagnées ; gardés dans la sauvegarde,
// mis à jour chaque fois que le jeu lit le clan
var clanBonus = { xp: 0, lucioles: 0, butin: 0, force: 0, vie: 0 };
// (et ceux de la mutation : voir mutationBonus ; des panoplies et du compagnon : voir gearBonus dans forge.js ; et les
// événements de la semaine, le week-end de l'XP : voir eventMult dans quetes.js)
var playerGearBonus = { xp: 0, gold: 0, loot: 0 };
function eventBoost(key) { return typeof eventMult === 'function' ? eventMult(key) : 1; }
function clanXp(n, ev) { return Math.round(n * (1 + clanBonus.xp + playerMutBonus.xp + playerGearBonus.xp) * (ev === undefined ? eventBoost('xp') : ev)); }
function eventBoostOver(key, t0, t1) { return typeof eventMultOver === 'function' ? eventMultOver(key, t0, t1) : 1; }
function clanGold(n) { return Math.round(n * (1 + clanBonus.lucioles + playerMutBonus.gold + playerGearBonus.gold)); }

// ---------- Le cycle (NG+) : une fois le dernier boss du monde vaincu, le monde recommence, plus fort ----------
// Au cycle c, les monstres se calent sur le niveau de la grenouille (jamais sous celui de leur étape), leurs PV et dégâts
// sont multipliés par CYCLE.power par cycle, et le butin est du plus haut rang, « +c-1 » : ses stats × (1 + CYCLE.loot
// par +). Sans fin (réglé au simulateur).
var CYCLE = { power: 1.25, loot: 0.2 };
var playerCycle = 1;
function romanCycle(n) { var r = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']; return n <= 10 ? r[n] : String(n); }

// ---------- La mutation : à partir du niveau MUTATION_LEVEL, la grenouille peut muter ----------
// Elle repart au niveau 1 (caractéristiques et dalles rendues à zéro ; elle garde sa voie, ses objets, ses lucioles
// et sa progression), mais pour toujours : +MUTATION_BASE à chaque caractéristique, +10 % d'XP, et un trait choisi
// parmi trois (ils se cumulent). Sa peau ne change pas : une aura l'entoure (drawAura, looks.js), plus présente à chaque
// mutation, qu'on peut masquer (save.auraOff) ; et elle gagne des titres (MUTATION_TITLES), un au choix (save.titre).
var MUTATION_LEVEL = 100, MUTATION_BASE = 3, MUTATION_XP = 0.1;
var MUTATIONS = {
  ecorce: { name: 'Peau d’écorce', desc: '+8 % de PV', hp: 0.08 },
  crocs: { name: 'Crocs', desc: '+8 % de dégâts', dmg: 0.08 },
  nuit: { name: 'Œil de nuit', desc: '+3 % de critique', crit: 0.03 },
  ressort: { name: 'Pattes-ressorts', desc: '+3 % d’esquive', dodge: 0.03 },
  troisieme: { name: 'Troisième œil', desc: '+10 % de puissance des sorts', spell: 0.1 },
  memoire: { name: 'Mémoire ancestrale', desc: '+15 % d’XP', xp: 0.15 },
  flair: { name: 'Flair', desc: '+15 % de lucioles', gold: 0.15 },
  trefle: { name: 'Trèfle de mare', desc: '+20 % de chances de trouver un objet', loot: 0.2 }
};
var MUTATION_GLOW = ['#5afff0', '#fff05a', '#ff5ae0', '#b8ff4a', '#ffffff']; // la couleur de l'aura, selon le nombre de mutations
var MUTATION_TITLES = ['l’Éveillée', 'la Transfigurée', 'la Lumineuse', 'l’Ancestrale', 'l’Éternelle'];
function mutationTitle(n) { return n ? MUTATION_TITLES[Math.min(MUTATION_TITLES.length, n) - 1] : ''; }
// le titre choisi (save.titre : son rang, -1 pour aucun ; par défaut le plus haut gagné)
function chosenTitle(save) { var n = (save.mutation && save.mutation.n) || 0, i = typeof save.titre === 'number' ? save.titre : n - 1; return i >= 0 && i < Math.min(n, MUTATION_TITLES.length) ? MUTATION_TITLES[i] : ''; }
var playerMutation = { n: 0, traits: {} }, playerMutBonus = { hp: 0, dmg: 0, crit: 0, dodge: 0, spell: 0, xp: 0, gold: 0, loot: 0, base: 0 };
function mutationBonus(m) {
  var b = { hp: 0, dmg: 0, crit: 0, dodge: 0, spell: 0, xp: 0, gold: 0, loot: 0, base: 0 };
  if (!m || !m.n) return b;
  b.base = MUTATION_BASE * m.n; b.xp = MUTATION_XP * m.n;
  Object.keys(m.traits || {}).forEach(function (id) { var t = MUTATIONS[id], k = m.traits[id]; if (t) Object.keys(b).forEach(function (s) { if (t[s]) b[s] += t[s] * k; }); });
  return b;
}
// Les trois traits proposés à la prochaine mutation (toujours les mêmes tant qu'on n'a pas muté)
function mutationChoices(save) {
  var n = (save.mutation && save.mutation.n) || 0;
  return Object.keys(MUTATIONS).map(function (id, i) { return { id: id, r: hash(n, i, 77) }; }).sort(function (a, b) { return a.r - b.r; }).slice(0, 3).map(function (o) { return o.id; });
}
function canMutate(save) { return save.level >= MUTATION_LEVEL; }
function mutate(save, trait) {
  if (!canMutate(save) || mutationChoices(save).indexOf(trait) < 0) return false;
  save.mutation.n++;
  save.mutation.traits[trait] = (save.mutation.traits[trait] || 0) + 1;
  save.level = 1; save.xp = 0; save.points = 0; save.skillPoints = 0; save.tree = []; save.deck = [];
  Object.keys(save.alloc).forEach(function (k) { save.alloc[k] = 0; });
  save.meditation = null;
  return true;
}

// À appeler quand la sauvegarde change (chargement, arbre, création) : met à jour les bonus globaux
function setPlayer(save) {
  playerAlloc = save.alloc;
  playerVoie = chosenVoie(save);
  playerTreeStats = treeBonuses(save).stats;
  heroSkin = skinOf(save.hero && save.hero.skin);
  clanBonus = Object.assign({ xp: 0, lucioles: 0, butin: 0, force: 0, vie: 0 }, save.clanBonus || {});
  playerCycle = save.cycle || 1;
  playerMutation = save.mutation || { n: 0, traits: {} }; playerMutBonus = mutationBonus(playerMutation);
  playerHermit = chosenVoie(save) === 'ermite'; // la voie de l'Ermite met la grenouille en mode Ermite
  playerLevel = save.level;
  var gb = typeof gearBonus === 'function' ? gearBonus(save) : {};
  playerGearBonus = { xp: gb.xp || 0, gold: gb.gold || 0, loot: gb.loot || 0 };
}

// Ajoute de l'XP ; renvoie le nombre de niveaux gagnés
function gainXp(save, amount, src) {
  var gained = 0, from = save.level;
  if (typeof journal === 'function' && amount > 0) setTimeout(function () { journal('xp', { src: src || '?', xp: Math.round(amount), avant: from, apres: save.level, besoin: xpForLevel(from) }); }, 0); // (le journal : après le calcul des niveaux)
  save.xp += Math.round(amount);
  while (save.level < MAX_LEVEL && save.xp >= xpForLevel(save.level)) {
    save.xp -= xpForLevel(save.level);
    save.level++;
    save.points += POINTS_PER_LEVEL;
    save.skillPoints += 1;
    gained++;
  }
  if (save.level >= MAX_LEVEL) save.xp = 0; // niveau maximum atteint
  if (gained) playerLevel = save.level;
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
  katana: [
    '..............kk', '.............k3k', '............k31k', '...........k31k.',
    '..........k31k..', '.........k31k...', '........k31k....', '.......k32k.....',
    '...k..k32k......', '...kkk22k.......', '....k4kk........', '...kbk4k........',
    '..kbbkkk........', '.kbbk...........', '.kkk............', '................'
  ],
  masse: [
    '.........kkkk...', '........k3311k..', '.......k3k11k1k.', '.......k311112k.',
    '......k1k1112k..', '......k31112k...', '.....k1k112k....', '.....k3112k.....',
    '......kk2k......', '.....k4bk.......', '....k4bk........', '...k4bk.........',
    '..k4bk..........', '.k4bk...........', '.kkk............', '................'
  ],
  shuriken: [
    '.......kk.......', '......k31k......', '......k31k......', '.....k3112k.....',
    '.....k3112k.....', '..kkkk3112kkkk..', '.k3333k44k1111k.', 'k33331k..k11122k',
    'k33311k..k11222k', '.k1111k44k2222k.', '..kkkk1122kkkk..', '.....k1122k.....',
    '.....k1122k.....', '......k12k......', '......k12k......', '.......kk.......'
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

// Les formes des objets du Continent, et celles des Légendaires (bandeau, cape)
Object.assign(ICONS, {'harpon_c':['...k...k...k....','..k3k.k3k.k3k...','..k1k.k1k.k1k...','..k1k.k1k.k1k...','..k1kkk1kkk1k...','..k111111111k...','...kk21112kk....','.....k414k......','......k4k.......','......kbk.......','......k4k.......','......kbk.......','......k4k.......','......kbk.......','......k4k.......','.......k........'],
  'masse_c':['......k..k......','...k.k1kk1k.k...','....k311111k....','..kk31111112kk..','...k31k11k12k...','..kk11111112kk..','....k111122k....','...k.k1kk2k.k...','......kk4k......','.......k4bk.....','.......k4bk.....','........k4bk....','........k4bk....','.........k4bk...','.........kkkk...','................'],
  'katana_c':['.............kk.','............k3k.','...........k31k.','..........k31k..','.........k312k..','........k312k...','.......k312k....','......k312k.....','..kk.k312k......','.k44kk22k.......','.k4bk4kk........','..kkbk4k........','...kbkk.........','..kbk...........','.kbk............','.kk.............'],
  'baton_c':['.....kkkk.......','....k3311k......','...k331112k.....','...k311112k.....','...k111122k.....','..k4k1122k4k....','...k4kkkk4k.....','....k4bb4k......','.....k4bk.......','.....k4bk.......','.....k4bk.......','.....k4bk.......','.....k4bk.......','.....k4bk.......','.....k4bk.......','......kk........'],
  'kunai_c':['.......k........','......k3k.......','......k31k......','.....k31k.......','.....k312k......','......k12k......','.....k312k......','.....k12k.......','....kkkkkkk.....','....k4bbb4k.....','....kkk4kkk.....','......k4k.......','......kbk.......','......k4k.......','.....k444k......','......kkk.......'],
  'shuriken_c':['kk............kk','k3k..........k2k','.k31k......k12k.','..k31k....k12k..','...k31k..k12k...','....k31kk12k....','.....k1441k.....','......k44k......','......k44k......','.....k1441k.....','....k21kk12k....','...k21k..k12k...','..k21k....k12k..','.k21k......k22k.','k22k........k22k','kk............kk'],
  'echarpe_c':['................','.kkkkkkkkkkkk...','k111111111111k..','k1222222222221k.','.kkkk1k1kkkkkk..','....k121k.......','....k121k.......','...k1221k.......','...k121k........','..k1221k........','..k121k.........','..k121k.........','..k3k3k.........','..k.k.k.........','...k.k..........','................'],
  'ceinture_c':['................','................','................','................','....kkkkkkkk....','kkkk44444444kkkk','k333k4k33k4k333k','k111k4k31k4k111k','k111k4k11k4k111k','k222k4kkkk4k222k','kkkk44444444kkkk','....kkkkkkkk....','................','................','................','................'],
  'anneau_c':['................','................','......kkkk......','.....k3311k.....','....k331112k....','....k311122k....','.....k1122k.....','....kk4kk4kk....','...k44k..k44k...','..k4k......k4k..','..k4k......k4k..','..k44k....k44k..','...k44kkkk44k...','....kk4444kk....','......kkkk......','................'],
  'casque_c':['................','k..............k','k3k..........k2k','.k3k..kkkk..k2k.','..k3kk3311kk2k..','...k33111111k...','..k3311111112k..','..k3111111122k..','..k1111111122k..','..kkkkkkkkkkkk..','..k4444444444k..','..k4kk4444kk4k..','..kkkkkkkkkkkk..','................','................','................'],
  'kasa_c':['................','................','................','................','.......kk.......','......k33k......','....kk3311kk....','..kk33111111kk..','kk331111111122kk','kkkkkkkkkkkkkkkk','.k4k4k4k4k4k4k4.','.k4k4k4k4k4k4k4.','..k.k.k.k.k.k.k.','................','................','................'],
  'bandeau':['................','................','................','................','................','..kkkkkkkkkkkk..','.k111k4444k111k.','k1111k4334k1111k','k2222k4444k2222k','.kkkkkkkkkkkk2k.','............k2k.','...........k21k.','...........k2k..','..........k21k..','..........kkk...','................'],
  'cape':['................','.....kkkkkk.....','....k3k44k2k....','...k31k44k12k...','...k31111112k...','..k3111111122k..','..k3111111122k..','.k311111111222k.','.k311111111222k.','.k311111112222k.','k31111111122222k','k31111111122222k','k1k111k111k222kk','kk.k1k.k1k.k2k..','....k...k...k...','................']});

// Deux familles d'armes (kind) : 'baton' au corps à corps (bâtons, harpons, katanas, masses) et 'kunai' à distance
// (kunaïs, shurikens). wtype dit le type exact (voir WEAPON_TYPES) : il choisit l'attaque de base et son animation.
// Une voie ne manie que sa famille : la Voie des Armes le corps à corps, la Voie du Lancer la distance.
// look : ce qui se voit sur Kawazu. attack.fx : l'onde du coup (bâton, harpon) ; attack.durations : durée des 4 images.
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
    slot: 'arme', kind: 'kunai', name: 'Kunaï d’acier', icon: 'kunai', stats: { force: 3 }, drop: 1,
    desc: 'Le kunaï fidèle de Kawazu, lancé droit et loin.',
    colors: { 1: '#d9e1e6', 2: '#a9b3bf', 3: '#ffffff', 4: '#4a3325', b: '#2e2018' },
    blade: '#d9e1e6', wave: ['#c3c9d1', '#7d8694'],
    look: { weapon: 'kunai' },
    attack: { range: 140, speed: 250, durations: [0.08, 0.06, 0.06, 0.12] }
  },
  lame_jade: {
    slot: 'arme', kind: 'baton', name: 'Bâton de jade', icon: 'baton', stats: { force: 4, esprit: 1 }, drop: 2,
    desc: 'Surmonté d’une pierre de jade. Grande onde verte doublée d’un écho, mais plus lente.',
    colors: { 1: '#7fd6a0', 2: '#3f9a6a', 3: '#d4f7e0', 4: '#5a3e25', b: '#3e2a19' },
    blade: '#7fd6a0', wave: ['#bff0cf', '#3f9a6a'],
    look: { weapon: 'baton' },
    attack: { fx: { type: 'arc', radii: [6, 11, 15], echo: true }, reach: 28, durations: [0.12, 0.08, 0.08, 0.18] }
  },
  harpon_pecheur: {
    slot: 'arme', kind: 'baton', wtype: 'harpon', name: 'Harpon du pêcheur', icon: 'harpon', stats: { force: 2, agilite: 1 }, drop: 3,
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
    slot: 'echarpe', name: 'Écharpe de brume', icon: 'echarpe', stats: { esprit: 2, vitalite: 1 }, drop: 2,
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
  // récompenses des duels de la cascade (jamais en boutique ni en butin)
  ceinture_champion: {
    slot: 'ceinture', name: 'Ceinture du champion', icon: 'ceinture', stats: { force: 2, agilite: 2, vitalite: 2 }, drop: 0, reward: true,
    desc: 'Remise chaque lundi à la première grenouille des duels de la cascade. Soie noire, boucle d’or en forme de grenouille.',
    colors: { 1: '#1a1c2c', 2: '#0b0c14', 3: '#3a3c4c', 4: '#f3d27a' }, belt: ['#22243a', '#f3d27a'], charm: '#f3d27a', look: { belt: true, charm: true }
  },
  ceinture_dojo: {
    slot: 'ceinture', name: 'Ceinture de la cascade', icon: 'ceinture', stats: { force: 1, agilite: 2 }, drop: 0, reward: true,
    desc: 'Pour les grenouilles du podium des duels : une ceinture pourpre, trempée dans l’eau de la cascade.',
    colors: { 1: '#7a2a4a', 2: '#4a1a2e', 3: '#a84a6a', 4: '#cfd8dc' }, belt: ['#7a2a4a', '#cfd8dc'], look: { belt: true }
  },
  perle_rosee: {
    slot: 'ceinture', name: 'Ceinture de rosée', icon: 'ceinture', stats: { esprit: 3 }, drop: 2,
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
    slot: 'tete', name: 'Chapeau de paille', icon: 'kasa', stats: { agilite: 1, esprit: 1 }, drop: 3,
    desc: 'Un grand chapeau conique de pêcheur. Protège du soleil du marais.',
    colors: { 1: '#d6b45a', 2: '#9a7a32', 3: '#f0d88a' }, look: { hat: 'kasa' }
  },
  feuille_nenuphar: {
    slot: 'tete', name: 'Feuille de nénuphar', icon: 'nenuphar', stats: { vitalite: 1, esprit: 1 }, drop: 3,
    desc: 'Posée entre les deux yeux, avec sa petite fleur rose.',
    colors: { 1: '#5d9a4a', 2: '#2f6b3d', 3: '#8fce52', 4: '#e8897a' }, look: { hat: 'nenuphar' }
  },
  casque_ecorce: {
    slot: 'tete', name: 'Casque d’écorce', icon: 'casque', stats: { vitalite: 3, agilite: -1 }, drop: 1,
    desc: 'Taillé dans un vieux saule. Très solide, un peu lourd.',
    colors: { 1: '#8d6a45', 2: '#5a3e25', 3: '#b38a5e', 4: '#3e2a19' }, look: { hat: 'ecorce' }
  }
};

// On commence sans arme : elle vient quand on choisit sa voie et son arme au Temple
var STARTER_ITEMS = ['echarpe_rouge', 'ceinture_corde'];
var DEFAULT_EQUIP = { tete: null, arme: null, echarpe: 'echarpe_rouge', ceinture: 'ceinture_corde', anneau: null };

// Les objets à collectionner (sans les récompenses du dojo, réservées au podium)
function collectible(id) { return ITEMS[id] && !ITEMS[id].reward; }

// D'où vient chaque caractéristique : base de la voie, points répartis (× la voie), dalles du temple, équipement
function statParts(equip) {
  var v = voieDef(playerVoie), out = {};
  STATS.forEach(function (st) {
    var k = st.id, pts = playerAlloc[k] || 0, mult = allocMult(playerVoie, k);
    out[k] = { base: (v ? v.base : BASE_STATS)[k], pts: pts, mult: mult, fromPts: Math.floor(pts * mult), tree: playerTreeStats[k] || 0, gear: 0, mut: playerMutBonus.base };
  });
  Object.keys(equip).forEach(function (slot) {
    var it = slot === 'arme' ? weaponOf(equip) : ITEMS[equip[slot]];
    if (!it) return;
    Object.keys(it.stats).forEach(function (k) { if (out[k]) out[k].gear += it.stats[k]; });
  });
  Object.keys(out).forEach(function (k) { var p = out[k]; p.total = p.base + p.fromPts + p.tree + p.gear + p.mut; });
  return out;
}
function computeStats(equip) {
  var parts = statParts(equip), s = {};
  Object.keys(parts).forEach(function (k) { s[k] = parts[k].total; });
  return s;
}

// En mode Ermite, pas d'arme : les mains nues frappent au corps à corps avec une onde de paume
var HERMIT_SKIN = { name: 'Mode Ermite', g: '#9a4212', m: '#e07a2a', l: '#f8b060', c: '#fff0c8' };
// Les mains de l'Ermite grandissent comme une arme : leur Esprit est celui d'une arme du rang de ses autres objets portés
// (le plus haut), à la même rareté et à la même forge (le rapport moyen entre leurs stats et celles de leur modèle),
// fois HERMIT_HANDS. Sans cela, l'Ermite décrochait dès le niveau 80 (0 à 7 % de duels gagnés contre les autres voies
// au-delà du niveau 110, des boss trois fois plus longs à tomber) : réglé au simulateur, voies à égalité.
var HERMIT_HANDS = 0.95, weaponMainByTier = null;
function weaponMainOf(tier) {
  if (!weaponMainByTier) {
    weaponMainByTier = {};
    BASE_IDS.forEach(function (id) { var it = ITEMS[id], t = ITEM_TIER[id]; if (!it || it.slot !== 'arme' || it.reward || !t) return; weaponMainByTier[t] = Math.max(weaponMainByTier[t] || 0, it.stats.force || 0, it.stats.agilite || 0, it.stats.esprit || 0); });
  }
  for (var t = tier; t >= 1; t--) if (weaponMainByTier[t]) return weaponMainByTier[t];
  return 0;
}
// un exemplaire comparé à son modèle : sa rareté, sa forge, le « + » des cycles
function gearRatio(id) {
  var it = ITEMS[id], b = it && ITEMS[it.base || baseOf(id)], s = 0, s0 = 0;
  if (!it || !b) return 1;
  Object.keys(b.stats).forEach(function (k) { if (b.stats[k] > 0) { s0 += b.stats[k]; s += Math.max(0, it.stats[k] || 0); } });
  return s0 ? Math.max(1, s / s0) : 1;
}
function hermitHands(equip) {
  var worn = ['tete', 'echarpe', 'ceinture', 'anneau'].map(function (sl) { return equip && equip[sl]; }).filter(function (id) { return id && ITEMS[id]; });
  var tier = worn.reduce(function (t, id) { return Math.max(t, tierOf(id)); }, 1);
  var ratio = worn.length ? worn.reduce(function (a, id) { return a + gearRatio(id); }, 0) / worn.length : 1;
  return {
    slot: 'arme', kind: 'mains', wtype: 'mains', name: 'Mains de l’ermite', icon: 'baton', drop: 0,
    stats: { esprit: 3 + Math.floor(playerLevel / 4) + Math.round(HERMIT_HANDS * weaponMainOf(tier) * ratio), force: 2 },
    desc: 'Mode Ermite : pas d’arme, que la paume. Elles grandissent avec tes objets : leur force est celle d’une arme de leur rang, de leur rareté et de leur forge.',
    blade: '#f3d27a', wave: ['#fff0a0', '#e07a2a'],
    look: { weapon: 'mains' },
    attack: { fx: { type: 'palm' }, reach: 20, durations: [0.1, 0.06, 0.06, 0.14] }
  };
}
// Sans arme (au tout début, avant de choisir sa voie et son arme) : les poings, avec une petite onde de paume
function bareHands() {
  return {
    slot: 'arme', kind: 'mains', wtype: 'mains', name: 'Mains nues', icon: 'baton', drop: 0, stats: {},
    desc: 'Pas encore d’arme : on se bat à mains nues. Choisis ta voie et ton arme au Temple pour en recevoir une.',
    blade: '#d9e1e6', wave: ['#fff0c8', '#c9a24a'], look: { weapon: 'mains' },
    attack: { fx: { type: 'palm' }, reach: 20, durations: [0.1, 0.06, 0.06, 0.14] }
  };
}
function weaponOf(equip) {
  if (playerHermit) return hermitHands(equip);
  return ITEMS[equip.arme] || bareHands();
}
function isRanged(weapon) { return weapon.kind === 'kunai'; }
// L'onde dessinée au bout de l'arme (un kunaï, qu'on lance, reçoit celle d'un bâton pour ses coups au contact)
function weaponFx(weapon) { return weapon.kind === 'kunai' ? { type: 'arc', radii: [5, 9, 13] } : weapon.attack.fx; }
// Une voie choisie ne manie que sa famille d'armes (l'Ermite, aucune) ; une fois l'arme choisie (save.arme), que celle-là
function weaponAllowed(save, it) {
  var v = chosenVoie(save);
  if (!v) return true;
  return v !== 'ermite' && it.kind === v && (!save.arme || weaponType(it) === save.arme);
}
// Un objet qu'on peut trouver, garder et voir : les armes des autres voies (ou des autres types) n'apparaissent pas
function itemAvailable(save, id) { var it = ITEMS[id] || ITEMS[baseOf(id)]; return !!it && (it.slot !== 'arme' || weaponAllowed(save, it)); }
// L'arme de départ de chaque type, donnée si on n'en possède aucune
var STARTER_WEAPON = { baton: 'baton_roseau', harpon: 'harpon_roseau', katana: 'katana_bambou', masse: 'masse_racine', kunai: 'kunai_rouille', shuriken: 'shuriken_bois' };
// Après un changement de voie ou d'arme (ou une ancienne partie) : la meilleure arme possédée qui convient, en main
function ensureWeapon(save) {
  var v = chosenVoie(save);
  if (!v || v === 'ermite') return;
  var cur = ITEMS[save.equip.arme];
  if (cur && weaponAllowed(save, cur)) return;
  var mine = save.owned.filter(function (id) { return ITEMS[id] && ITEMS[id].slot === 'arme' && weaponAllowed(save, ITEMS[id]); });
  if (!mine.length) {
    if (!save.arme) { save.equip.arme = null; return; } // l'arme viendra avec le choix, au Temple
    var starter = STARTER_WEAPON[save.arme]; if (save.owned.indexOf(starter) < 0) save.owned.push(starter); mine = [starter];
  }
  mine.sort(function (a, b) { return tierOf(b) - tierOf(a) || ITEM_RARITIES.indexOf(rarityOf(b)) - ITEM_RARITIES.indexOf(rarityOf(a)); });
  save.equip.arme = mine[0];
}

// Ce qui se voit sur Kawazu (calques + onde de l'arme ; un kunaï lancé n'a pas d'onde)
function lookFor(equip) {
  var look = {};
  ['tete', 'echarpe', 'ceinture', 'anneau'].forEach(function (slot) {
    var it = ITEMS[equip[slot]];
    if (it && it.look) Object.assign(look, it.look);
  });
  var w = weaponOf(equip);
  look.weapon = w.look.weapon;
  look.hermit = playerHermit;
  look.skin = !playerHermit && heroSkin.fx || null; // les signes du skin (pas en mode Ermite, pour l'instant)
  look.mutation = 0; // (l'aura de mutation n'est plus dans l'image : drawAura, autour de la grenouille)
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
// Les skins : chers, et vendus trois par jour (voir skinsOfDay). Leurs couleurs de peau (g, m, l, c), la palette de
// leurs signes (pal, voir paintSkin dans looks.js), leurs signes (fx) et, pour certains, l'écharpe qu'ils imposent
// (scarf : la collerette d'Écumette, le long foulard d'Ombre-Lame). Très chers : autour de 50 000 lucioles.
// Pas en mode Ermite pour l'instant : l'Ermite garde sa peau orange et ne peut pas changer de skin.
var PREMIUM_SKINS = {
  // la peau du sommet de la Tour des Ancêtres : jamais en boutique (reward), donnée au 600e étage
  // les peaux des saisons de classement (quetes.js, server/api.js) : les trois premières d'un mois les reçoivent
  saison_or: { name: 'Champion d’or', price: 0, reward: true, g: '#6a4a0a', m: '#d8a42a', l: '#f8d870', c: '#fff6d0', scarf: ['#c9412f', '#7a1a1a'],
    pal: { e: '#fff6a0' }, desc: 'Une peau d’or massif, qui brille au soleil comme une médaille. Elle va à la grenouille arrivée première d’une saison de classement.' },
  saison_argent: { name: 'Champion d’argent', price: 0, reward: true, g: '#4a5260', m: '#a8b2c0', l: '#dce4ee', c: '#ffffff', scarf: ['#3a7fc9', '#1a3a6a'],
    desc: 'Une peau d’argent poli, froide comme la lune. Elle va à la grenouille arrivée deuxième d’une saison de classement.' },
  saison_bronze: { name: 'Champion de bronze', price: 0, reward: true, g: '#4a2410', m: '#a8622a', l: '#e09a5a', c: '#ffe0b8', scarf: ['#4e9a45', '#1f4a1a'],
    desc: 'Une peau de bronze patiné, chaude comme une braise. Elle va à la grenouille arrivée troisième d’une saison de classement.' },
  ancetre: { name: 'Premier Crapaud', price: 0, reward: true, g: '#14121e', m: '#2e2a44', l: '#4a4468', c: '#8a84b0',
    pal: { e: '#6af0ff', U: '#0a0a14', G: '#e0b43a', D: '#e0b43a', W: '#e0b43a' }, fx: ['yeux', 'cernes', 'bandes'],
    desc: 'La peau d’obsidienne du tout premier crapaud ninja, striée d’or, les yeux pleins de la lumière des esprits. On ne l’achète pas : on la mérite, au sommet de la Tour des Ancêtres.' },
  gloupoison: { name: 'Gloupoison', price: 50000, g: '#4a1a7a', m: '#7a3ab8', l: '#a86ae0', c: '#c89ae8',
    pal: { e: '#f3d23a', U: '#14141f', O: '#9ae03a', D: '#1a1c2c' }, fx: ['yeux', 'cernes', 'masque', 'poches', 'doigts'],
    desc: 'Violet vénéneux, les joues gonflées de jus de mousse et le bout des doigts qui luit. Personne ne lui serre la main.' },
  ecumette: { name: 'Écumette', price: 45000, g: '#2a8a7a', m: '#4ac0a8', l: '#9ae8d8', c: '#e8fff8', scarf: ['#f4fffc', '#b0e0d8'],
    pal: { U: '#1f6a6a' }, fx: ['reflet', 'raie', 'bulles', 'bulles-nez'],
    desc: 'Couleur d’eau claire, emmitouflée dans une collerette d’écume qui ne crève jamais.' },
  poussemare: { name: 'Pousse-Mare', price: 45000, g: '#3a7a1a', m: '#7ac83a', l: '#b8f07a', c: '#fff0c0',
    pal: { O: '#f8a0b8', D: '#2e6a1a' }, fx: ['poches', 'boucle', 'mains-claires'],
    desc: 'Vert tendre comme une jeune pousse, et une vrille lui a poussé sur la tête. Elle dit que ça porte bonheur.' },
  cogneur: { name: 'Cogneur', price: 50000, g: '#3a4a5a', m: '#6a7a8a', l: '#a0b0c0', c: '#d8dde2',
    pal: { G: '#d8342a', D: '#c9412f', W: '#f4f4e8' }, fx: ['gants', 'colere', 'bandes'],
    desc: 'Gris comme un galet de rivière, gants rouges et ceinture de champion. Il ne recule jamais.' },
  ombrelame: { name: 'Ombre-Lame', price: 55000, g: '#1a1a24', m: '#3e3e50', l: '#5a5a70', c: '#8a8aa0', scarf: ['#7a4ab0', '#4a2a70'],
    pal: { e: '#f0c040', U: '#0e0e16' }, fx: ['yeux', 'cernes', 'masque'],
    desc: 'Gris de cendre, masque de nuit et long foulard violet. On ne l’entend pas arriver.' },
  grignote: { name: 'Grignote', price: 45000, g: '#a87a1a', m: '#f0c050', l: '#ffe08a', c: '#fff2c8',
    pal: { U: '#8a4a1a', V: '#3a7a3a', W: '#1f4a1f' }, fx: ['cernes', 'levres', 'courbes-ventre', 'veste'],
    desc: 'Jaune et tout rond, dans son gilet vert. Il a toujours une libellule de côté pour le goûter.' },
  rouquin: { name: 'Rouquin', price: 50000, g: '#a8480a', m: '#f07a1a', l: '#ffb050', c: '#ffd8a8',
    pal: { U: '#4a2410', V: '#a8201a', W: '#e0b43a' }, fx: ['cernes', 'levres', 'taches-ventre', 'veste'],
    desc: 'Orange flamboyant, gilet rouge liseré d’or. Grande gueule, grand cœur.' },
  rempart: { name: 'Rempart', price: 55000, g: '#1f5a6a', m: '#3a8aa0', l: '#7ac0d0', c: '#c8e8ee',
    pal: { U: '#10202a', V: '#5a3a22', W: '#e0b43a', T: '#b8a878', G: '#6a5a3a' }, fx: ['cernes', 'cornes', 'veste', 'obi', 'bouclier'],
    desc: 'Bleu d’étang profond, cornes courtes, obi doré et grand bouclier de bronze dans le dos. Rien ne passe.' },
  maitremousse: { name: 'Maître Mousse', price: 60000, g: '#2e5a2a', m: '#5a9a4a', l: '#8ac070', c: '#dce4b0',
    pal: { e: '#f3d23a', T: '#f4f4ee', V: '#2a3a6a', W: '#a0a8c0' }, fx: ['yeux', 'touffe', 'sourcils', 'barbiche', 'cape'],
    desc: 'Le plus vieux sage de la mare : touffe blanche, sourcils broussailleux et cape bleu nuit. Il en sait plus qu’il n’en dit.' },
  parrain: { name: 'Parrain Vasard', price: 60000, g: '#3a3a1a', m: '#6a6a2a', l: '#9a9a4a', c: '#c8c08a',
    pal: { U: '#d8a030', V: '#7a1a1a', W: '#e0b43a', T: '#3a2412', O: '#ff8a2a', G: '#c0c0cc', K: '#2a1a0a' }, fx: ['cernes', 'levres', 'veste', 'signe-dos', 'pipe', 'cicatrice'],
    desc: 'Le patron de la vase : peau d’olive, gilet bordeaux, pipe au bec et une vieille cicatrice. Il ne se déplace pas pour rien.' }
};
// Vingt de plus : la boutique en tire trois par jour parmi tous
Object.assign(PREMIUM_SKINS, {
  braise: { name: "Braise", price: 50000, g: '#7a1a0a', m: '#d8481a', l: '#ff8a3a', c: '#ffd0a0',
    pal: { 'e': '#ffe060', 'D': '#3a0a04', 'W': '#ff6a1a' }, fx: ['yeux', 'bandes', 'colere'],
    desc: "Rouge comme un tison, zébrée de cendre, les yeux d’or. Elle sort du volcan et elle a chaud." },
  givrette: { name: "Givrette", price: 45000, g: '#3a6a9a', m: '#8ac8f0', l: '#d8f0ff', c: '#ffffff', scarf: ['#ffffff','#b0d8f0'],
    pal: { 'U': '#5a8ab8', 'S': '#ffffff' }, fx: ['reflet', 'raie', 'taches-ventre'],
    desc: "Bleu glacier, le ventre semé de flocons. Ses pas laissent du givre sur les nénuphars." },
  nenuphette: { name: "Nénuphette", price: 40000, g: '#a83a6a', m: '#f07aa8', l: '#ffb8d0', c: '#fff0f4',
    pal: { 'O': '#ff5a8a', 'D': '#3a8a3a' }, fx: ['poches', 'boucle', 'mains-claires'],
    desc: "Rose comme une fleur de nénuphar, avec une vrille verte sur la tête. Tout le monde l’aime, elle le sait." },
  tourbe: { name: "Tourbe", price: 35000, g: '#3a2a14', m: '#6a4a26', l: '#8a6a3a', c: '#c8a878',
    pal: { 'U': '#2a1a0a' }, fx: ['cernes', 'taches-ventre', 'menton'],
    desc: "Brune comme la tourbe des marais, le ventre moucheté. Elle sent un peu la vase, et elle en est fière." },
  orchidee2: { name: "Orchidée", price: 50000, g: '#5a1a6a', m: '#a04ac0', l: '#d08ae8', c: '#f4e0ff',
    pal: { 'U': '#f4f4ff', 'S': '#ffffff' }, fx: ['spirale', 'reflet'],
    desc: "Violette, une spirale blanche peinte sur le ventre. Elle danse au lieu de marcher." },
  cuivre: { name: "Cuivre", price: 55000, g: '#5a2a10', m: '#b0602a', l: '#e09a5a', c: '#f0c8a0',
    pal: { 'D': '#3a1a08', 'W': '#ffd08a', 'G': '#3a1a08' }, fx: ['bandes', 'gants'],
    desc: "Couleur de vieux cuivre, cerclée de bandes sombres, des gants de forgeron. Elle sonne quand on la frappe." },
  nuitetoilee: { name: "Nuit étoilée", price: 60000, g: '#0a0e2a', m: '#1e2a5a', l: '#3a4a8a', c: '#6a7ab0', scarf: ['#3a4a8a','#1e2a5a'],
    pal: { 'e': '#e8f0ff', 'U': '#fff6c0' }, fx: ['yeux', 'taches-ventre', 'cernes'],
    desc: "Bleu de minuit, le ventre semé d’étoiles. Elle ne sort qu’à la nuit tombée." },
  citronnelle: { name: "Citronnelle", price: 40000, g: '#6a8a0a', m: '#b8e03a', l: '#e0ff8a', c: '#fffff0',
    pal: { 'S': '#ffffff' }, fx: ['triangles', 'pupille-blanche'],
    desc: "Vert acide et piquant, des triangles sur le dos. Elle réveille tout le marais." },
  corsaire: { name: "Corsaire", price: 55000, g: '#0e4a4a', m: '#2a8a80', l: '#5ac0b0', c: '#d0f0e8',
    pal: { 'V': '#a8201a', 'W': '#e0b43a', 'U': '#0a2a2a' }, fx: ['veste', 'signe-dos', 'cicatrice'],
    desc: "Vert d’eau de mer, gilet rouge de capitaine et une cicatrice de sabre. Il a pillé tous les étangs du coin." },
  ronin: { name: "Rōnin des Joncs", price: 60000, g: '#1a2a3a', m: '#3a5a7a', l: '#6a8aa8', c: '#c8d0d8',
    pal: { 'V': '#2a2a34', 'W': '#c9412f', 'T': '#e8e0c8' }, fx: ['veste', 'obi', 'cornes', 'sourcils'],
    desc: "Bleu ardoise, kimono sombre et obi rouge. Il n’a plus de maître, seulement son chemin." },
  lavande: { name: "Lavande", price: 40000, g: '#5a4a8a', m: '#9a8ad0', l: '#c8b8f0', c: '#f4f0ff',
    pal: { 'U': '#6a4aa8' }, fx: ['cernes', 'levres', 'courbes-ventre'],
    desc: "Mauve et douce comme un champ de lavande. Elle sent bon, ce qui est rare pour une grenouille." },
  cendrillard: { name: "Cendrillard", price: 45000, g: '#2a2a2a', m: '#5a5a5a', l: '#8a8a8a', c: '#c8c8c8',
    pal: { 'e': '#ff7a1a' }, fx: ['yeux', 'crete'],
    desc: "Gris cendre, une crête sur le crâne et des yeux de braise. Il couve quelque chose." },
  arlequin: { name: "Arlequin", price: 50000, g: '#3a2a5a', m: '#e0b43a', l: '#ffe080', c: '#ffffff',
    pal: { 'U': '#1a1a2a', 'S': '#c9412f' }, fx: ['triangles', 'masque'],
    desc: "Losanges, masque noir et sourire en coin. Personne ne sait jamais s’il plaisante." },
  dune: { name: "Dune", price: 35000, g: '#8a6a3a', m: '#d8b878', l: '#f0dca8', c: '#fff6e0',
    pal: { 'U': '#a87a3a' }, fx: ['raie', 'taches-ventre'],
    desc: "Couleur sable, tachetée comme un caillou du désert. Elle disparaît dès qu’elle s’assoit." },
  moussaillon: { name: "Moussaillon", price: 40000, g: '#1a3a6a', m: '#3a6ab0', l: '#7aa8e0', c: '#ffffff', scarf: ['#c9412f','#8a1a1a'],
    pal: { 'D': '#f4f4ff', 'W': '#ffffff' }, fx: ['bandes', 'menton'],
    desc: "Rayé bleu et blanc comme une vareuse de marin. Il a le mal de mer, mais ne le dit à personne." },
  ecorce2: { name: "Écorce", price: 45000, g: '#2a1a0a', m: '#5a3e20', l: '#7a5a34', c: '#b8946a',
    pal: { 'T': '#5aa03a' }, fx: ['crete', 'sourcils', 'taches-ventre'],
    desc: "Brune et rugueuse comme l’écorce d’un saule, une feuille plantée sur le crâne. Les oiseaux s’y trompent." },
  perle: { name: "Perle des mers", price: 55000, g: '#a88a9a', m: '#f0dce4', l: '#ffffff', c: '#fff8fc', scarf: ['#ffe0f0','#e0b0c8'],
    pal: { 'S': '#ffffff', 'U': '#e0b0c8' }, fx: ['reflet', 'bulles', 'cernes'],
    desc: "Nacrée comme une perle, des bulles autour du cou. Elle brille sous la lune." },
  dardnoir: { name: "Dard noir", price: 55000, g: '#0a0a0e', m: '#1e1e26', l: '#3a3a46', c: '#2a2a34',
    pal: { 'e': '#ffe020', 'U': '#ffd020', 'D': '#ffd020', 'W': '#ffe060' }, fx: ['yeux', 'taches-ventre', 'bandes'],
    desc: "Noire, tachée de jaune vif : la couleur qui veut dire « ne me mange pas ». Ça marche." },
  feufollet: { name: "Feu follet", price: 50000, g: '#2a8a8a', m: '#7af0e0', l: '#c8fff8', c: '#ffffff',
    pal: { 'S': '#ffffff', 'U': '#2ad0c0' }, fx: ['pupille-blanche', 'spirale', 'reflet'],
    desc: "Pâle et lumineuse, comme ces lueurs qui flottent sur les marais la nuit. On la suit sans savoir pourquoi." },
  tonnerre: { name: "Tonnerre", price: 60000, g: '#3a3a0a', m: '#e0d020', l: '#fff080', c: '#fffff0',
    pal: { 'D': '#1a1a1a', 'W': '#ffffff', 'S': '#1a1a1a' }, fx: ['bandes', 'triangles', 'colere', 'crete'],
    desc: "Jaune éclair zébré de noir, la crête en pointe. Quand il est en colère, l’air sent l’orage." }
});
// Les skins renommés (la sauvegarde garde ceux qu'on a achetés, sous leur nouveau nom)
var RENAMED_SKINS = { cradopaud: 'gloupoison', grenousse: 'ecumette', tarpaud: 'poussemare', tartard: 'cogneur', amphinobi: 'ombrelame',
  gamatatsu: 'grignote', gamakichi: 'rouquin', gamaken: 'rempart', fukasaku: 'maitremousse', gamabunta: 'parrain' };
var skinId = function (id) { return RENAMED_SKINS[id] || id; };
// Les skins d'avant (retirés) : ceux qu'on avait achetés sont remboursés
var RETIRED_SKINS = { fraise: 1000, dendrobate: 1200, tigre: 1400, sakura: 1600, verre: 1800, lune: 2200, braise: 2500, or: 4000 };
function skinOf(id) { return SKINS[id] || PREMIUM_SKINS[id] || EXTRA_SKINS[id] || SKINS.marais; }

// Couleurs du héros selon sa peau et son équipement
function paletteFor(basePal, equip) {
  var skin = playerHermit ? HERMIT_SKIN : heroSkin; // l'Ermite garde sa peau orange (les skins viendront plus tard pour lui)
  var pal = Object.assign({}, basePal, { g: skin.g, m: skin.m, l: skin.l, c: skin.c }, skin.pal || {});
  // Ermite : iris jaune (E), pupille en barre, marques rouge-orangé autour des yeux (Z)
  if (playerHermit) { pal.E = '#f3d23a'; pal.Z = '#b8321a'; }
  var scarf = ITEMS[equip.echarpe];
  if (scarf) { pal.r = scarf.scarf[0]; pal.R = scarf.scarf[1]; }
  if (skin.scarf) { pal.r = skin.scarf[0]; pal.R = skin.scarf[1]; } // la langue, la collerette de bulles : pas d'écharpe par-dessus
  var weapon = weaponOf(equip);
  pal.t = weapon.blade; pal.a = weapon.wave[0]; pal.A = weapon.wave[1];
  var hat = ITEMS[equip.tete];
  if (hat) { pal.H = hat.colors[1]; pal.I = hat.colors[2]; pal.J = hat.colors[3]; pal.P = hat.colors[4] || hat.colors[3]; }
  var belt = ITEMS[equip.ceinture];
  if (belt) { pal.b = belt.belt[0]; pal.y = belt.belt[1]; pal.Y = belt.charm || belt.belt[1]; }
  var ring = ITEMS[equip.anneau];
  if (ring) pal.N = ring.colors[1];
  if (playerMutation.n) pal.M = MUTATION_GLOW[Math.min(MUTATION_GLOW.length, playerMutation.n) - 1];
  return pal;
}

// Stats de combat au tour par tour, tirées des caractéristiques. Tous les réglages de l'équilibre sont dans BAL.
// - Vitalité → PV (+6 par point, × l'endurance de la voie) ;
// - l'attribut principal de la voie (Force pour les Armes, Agilité pour le Lancer, Esprit pour l'Ermite) → dégâts
//   (+1,1 par point) ; hors Voie des Armes, la Force ajoute encore 0,5 dégât par point ;
// - Agilité → critique, esquive et initiative, à rendement décroissant (il en faut plus quand le niveau monte) ;
// - Esprit → puissance des sorts (à rendement décroissant) et tours de relance (−1 à 50 points, −2 à 150, −3 à 300).
var BAL = {
  critBase: 0.05, critMax: 0.4, critK: 30, critL: 2.5,
  dodgeMax: 0.35, dodgeK: 40, dodgeL: 3,
  offForce: 0.4, spellMax: 0.4, spellK: 120,
  hpBase: 40, hpVit: 14, dmgMain: 0.9
};
var ESPRIT_STEPS = [60, 200];
function mainStat(voie) { var v = voieDef(voie); return v ? v.main : 'force'; }
function combatStats(stats, voie, level) {
  var v = voieDef(voie), main = mainStat(voie), L = level || 1;
  var A = Math.max(0, stats.agilite), E = Math.max(0, stats.esprit);
  return {
    maxHp: Math.round((BAL.hpBase + stats.vitalite * BAL.hpVit) * (v ? v.hp : 1)),
    dmg: 2 + BAL.dmgMain * Math.max(0, stats[main]) + (main === 'force' ? 0 : BAL.offForce * Math.max(0, stats.force)),
    crit: BAL.critBase + BAL.critMax * A / (A + BAL.critK + BAL.critL * L),
    dodge: BAL.dodgeMax * A / (A + BAL.dodgeK + BAL.dodgeL * L),
    agi: stats.agilite,
    spell: 1 + BAL.spellMax * E / (E + BAL.spellK),
    cdr: ESPRIT_STEPS.filter(function (t) { return E >= t; }).length,
    armor: v ? v.armor + (v.armorL || 0) * L : 0
  };
}
// Tout ce qui compte en combat, caractéristiques et passifs de l'arbre réunis (pour la grenouille chargée par setPlayer)
// (gb : les panoplies d'Uniques et le compagnon, voir forge.js)
function combatProfile(save, duel) { // (duel : contre une autre grenouille, en duel ou à la guerre)
  var cs = combatStats(computeStats(save.equip), chosenVoie(save), save.level), pas = treeBonuses(save).passives, mb = mutationBonus(save.mutation), ms = masteryBonus(save), cb = save.clanBonus || {};
  var gb = typeof gearBonus === 'function' ? gearBonus(save) : {}, g = function (k) { return gb[k] || 0; };
  var vd = voieDef(chosenVoie(save)), late = vd && vd.lateFrom ? Math.max(0, (save.level || 1) - vd.lateFrom) * ((duel ? vd.lateDuel : vd.lateDmg) || 0) : 0; // (le rattrapage de fin de jeu d'une voie)
  if (g('lifesteal')) pas = Object.assign({}, pas, { lifesteal: (pas.lifesteal || 0) + g('lifesteal') });
  return {
    maxHp: Math.round(cs.maxHp * (1 + pas.hpMult + mb.hp + ms.hp + (cb.vie || 0) + g('hp'))), dmg: cs.dmg * (1 + pas.dmgMult + mb.dmg + ms.dmg + (cb.force || 0) + g('dmg') + late),
    crit: Math.min(0.75, cs.crit + pas.crit + mb.crit + ms.crit + g('crit')), critMult: 1.6 + pas.critDmg + g('critDmg'), dodge: Math.min(0.5, cs.dodge + pas.dodge + mb.dodge + g('dodge')),
    agi: cs.agi, spell: cs.spell + pas.spellMult + mb.spell + ms.spell + g('spell'), cdr: cs.cdr, size: 1 + pas.size, pas: pas, mut: mb, mastery: ms, gear: gb,
    armor: cs.armor, dmgReduce: Math.min(0.6, cs.armor + pas.dmgReduce + g('reduce'))
  };
}

// Objets des environnements avancés
Object.assign(ITEMS, {
  lame_cristal: {
    slot: 'arme', kind: 'kunai', name: 'Kunaï de cristal', icon: 'kunai', stats: { force: 6, esprit: 1 }, drop: 2,
    desc: 'Taillé dans les Grottes Luisantes. Il file très loin et traverse les ennemis.',
    colors: { 1: '#b8e8ff', 2: '#5fa3c0', 3: '#ffffff', 4: '#2c3f73', b: '#1d2a52' },
    blade: '#b8e8ff', wave: ['#e0f7ff', '#5fa3c0'],
    look: { weapon: 'kunai' },
    attack: { range: 180, speed: 300, pierce: true, durations: [0.07, 0.05, 0.05, 0.1] }
  },
  couronne_mousse: {
    slot: 'tete', name: 'Couronne de mousse', icon: 'casque', stats: { vitalite: 2, esprit: 2 }, drop: 2,
    desc: 'Tressée par les saules eux-mêmes. Elle repousse un peu chaque matin.',
    colors: { 1: '#4f7a36', 2: '#2f4a2a', 3: '#8fce52', 4: '#e0b43a' }, look: { hat: 'ecorce' }
  },
  plume_heron: {
    slot: 'ceinture', name: 'Ceinture de plumes du héron', icon: 'ceinture', stats: { force: 3, esprit: 2 }, drop: 1,
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
    slot: 'arme', kind: 'baton', wtype: look || 'baton', name: name, icon: look === 'harpon' ? 'harpon' : 'baton', stats: stats, drop: 2, desc: desc,
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
function mkKatana(name, stats, c, wave, desc) {
  return {
    slot: 'arme', kind: 'baton', wtype: 'katana', name: name, icon: 'katana', stats: stats, drop: 2, desc: desc,
    colors: { 1: c[0], 2: c[1], 3: c[2], 4: c[3] || '#c9412f', b: c[4] || '#3e1a12' }, blade: c[0], wave: wave, look: { weapon: 'katana' },
    attack: { fx: { type: 'arc', radii: [5, 9, 13] }, reach: 22, durations: [0.08, 0.06, 0.06, 0.12] }
  };
}
function mkMasse(name, stats, c, wave, desc) {
  return {
    slot: 'arme', kind: 'baton', wtype: 'masse', name: name, icon: 'masse', stats: stats, drop: 2, desc: desc,
    colors: { 1: c[0], 2: c[1], 3: c[2], 4: c[3] || '#8d6a45', b: c[4] || '#5a3e25' }, blade: c[0], wave: wave, look: { weapon: 'masse' },
    attack: { fx: { type: 'arc', radii: [6, 11, 15] }, reach: 24, durations: [0.12, 0.08, 0.08, 0.16] }
  };
}
function mkShuriken(name, stats, c, wave, desc) {
  return {
    slot: 'arme', kind: 'kunai', wtype: 'shuriken', name: name, icon: 'shuriken', stats: stats, drop: 2, desc: desc,
    colors: { 1: c[0], 2: c[1], 3: c[2], 4: c[3] || '#3a4a54', b: c[3] || '#3a4a54' }, blade: c[0], wave: wave, look: { weapon: 'shuriken' },
    attack: { range: 140, speed: 260, durations: [0.07, 0.05, 0.05, 0.1] }
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
  echarpe_algue: mkScarf('Écharpe d’algues', { vitalite: 1, esprit: 1 }, ['#3a8a5a', '#1f5a3a'], 'Encore humide. Elle sent la vase, et c’est rassurant.'),
  ceinture_lianes: mkBelt('Ceinture de lianes', { vitalite: 1, agilite: 1 }, ['#4e7a2a', '#2f4a1a', '#8fce52', '#8fce52'], null, 'Trois lianes tressées, nouées sur le côté.'),
  anneau_os: mkRing('Anneau d’os', { force: 1, vitalite: 1 }, ['#e8e0c8', '#a89a7a', '#ffffff', '#6e5a3a'], 'Taillé dans l’os d’un vieux brochet.'),
  kasa_voyageur: mkHat('Kasa du voyageur', { vitalite: 1, agilite: 1 }, 'kasa', ['#b8a36a', '#7a6a3a', '#e0d0a0'], 'Le chapeau des grenouilles qui partent loin.'),
  // Lagune des Lucioles
  kunai_os: mkKunai('Kunaï d’os', { force: 3, agilite: 1 }, ['#e8e0c8', '#a89a7a', '#ffffff'], ['#fff8e8', '#a89a7a'], 'Pointu et léger, il file sans bruit.', 130),
  baton_saule: mkStaff('Canne de saule', { force: 3, vitalite: 1 }, ['#9ac06a', '#5e8a3a', '#d4f0a0'], ['#d4f0b0', '#5e8a3a'], 'Souple : elle plie, mais ne rompt jamais.'),
  echarpe_luciole: mkScarf('Écharpe des lucioles', { agilite: 2, esprit: 1 }, ['#c9f07a', '#5a8a2a'], 'Elle brille doucement la nuit.'),
  ceinture_ecailles: mkBelt('Ceinture d’écailles', { vitalite: 2, esprit: 1 }, ['#2f6a6a', '#1a3a3a', '#5fb3a0', '#5fb3a0'], '#c9f07a', 'Des écailles de carpe, cousues une à une.'),
  anneau_rosee: mkRing('Anneau de rosée', { esprit: 2, vitalite: 1 }, ['#9cc7e0', '#3a7fc9', '#e8f4ff', '#3a7fc9'], 'Une goutte d’eau figée qui ne sèche jamais.'),
  feuille_lotus: mkHat('Feuille de lotus', { esprit: 2, agilite: 1 }, 'nenuphar', ['#ff9ac0', '#c95a8a', '#ffd0e0'], 'Rose et parfumée. Les moustiques l’évitent.'),
  // Forêt des Saules
  baton_ferre: mkStaff('Bâton ferré', { force: 5, vitalite: 1 }, ['#9aa8b8', '#5a6a7a', '#d9e1e6'], ['#d9e1e6', '#5a6a7a'], 'Cerclé de fer aux deux bouts. Chaque coup résonne.', 1),
  harpon_corail: mkStaff('Harpon de corail', { force: 4, agilite: 2 }, ['#ff8a7a', '#b84a3a', '#ffd0c8', '#8d6a45', '#5a3e25'], ['#ffd0c8', '#b84a3a'], 'Une pointe de corail rouge, très tranchante.', 0, 'harpon'),
  kunai_obsidienne: mkKunai('Kunaï d’obsidienne', { force: 5, agilite: 1 }, ['#5a4a6a', '#2a2a3a', '#a89ac0'], ['#a89ac0', '#3a3a4a'], 'Noir et luisant. Il coupe l’air.', 150),
  echarpe_automne: mkScarf('Écharpe d’automne', { force: 2, vitalite: 2 }, ['#e07a2a', '#9a4a1a'], 'La couleur des saules en octobre.'),
  ceinture_cuir: mkBelt('Ceinture de cuir clouté', { force: 2, vitalite: 2 }, ['#5a3e25', '#3e2a19', '#8d6a45', '#cfd8dc'], '#cfd8dc', 'Des clous d’argent tout le long. Sérieuse.'),
  anneau_braise: mkRing('Anneau de braise', { force: 3 }, ['#ff6a3a', '#b8321a', '#ffd08a', '#5a2a12'], 'Il reste chaud, même au fond de l’eau.'),
  feuille_automne: mkHat('Feuille d’automne', { vitalite: 2, agilite: 1 }, 'nenuphar', ['#e0a03a', '#9a6a1a', '#f8d08a'], 'Une large feuille rousse, tombée d’un vieux saule.'),
  // Grottes Luisantes
  kunai_givre: mkKunai('Kunaï de givre', { force: 6, esprit: 1 }, ['#bff0ff', '#5fa3c0', '#ffffff'], ['#e8fbff', '#5fa3c0'], 'Il laisse une traînée de buée derrière lui.', 160),
  baton_lune: mkStaff('Bâton de lune', { force: 6, esprit: 2 }, ['#d8e0f8', '#8a9ac8', '#ffffff', '#3a4a6b', '#1f2a4a'], ['#f4f6ff', '#8a9ac8'], 'Pâle comme la lune des grottes, avec un écho argenté.', 2),
  echarpe_nuit: mkScarf('Écharpe de nuit', { agilite: 3, esprit: 1 }, ['#3a3a6b', '#1a1a3a'], 'Noire comme les galeries. On ne te voit pas venir.'),
  ceinture_cristal: mkBelt('Ceinture de cristal', { esprit: 3, vitalite: 1 }, ['#5fa3c0', '#2c5a73', '#bff0ff', '#e0f7ff'], '#bff0ff', 'Des éclats de cristal qui tintent à chaque pas.'),
  anneau_lune: mkRing('Anneau de lune', { agilite: 2, esprit: 2 }, ['#d8e0f8', '#8a9ac8', '#ffffff', '#3a4a6b'], 'Il luit faiblement dans le noir.'),
  heaume_cristal: mkHat('Heaume de cristal', { vitalite: 3, esprit: 1 }, 'ecorce', ['#5fa3c0', '#2c5a73', '#bff0ff', '#ffffff'], 'Taillé d’un seul bloc. Un peu froid aux oreilles.'),
  // Temple Englouti
  trident_englouti: mkStaff('Trident englouti', { force: 6, agilite: 2 }, ['#7af0d0', '#3a9a8a', '#d0fff4', '#3e4e54', '#243238'], ['#d0fff4', '#3a9a8a'], 'Remonté des ruines, couvert de runes qui luisent.', 0, 'harpon'),
  kunai_venin: mkKunai('Kunaï venimeux', { force: 6, agilite: 2 }, ['#8fce52', '#3a7a2a', '#e8f7a0'], ['#c9f07a', '#3a7a2a'], 'Sa lame est enduite d’un poison vert du temple.', 170),
  baton_corail: mkStaff('Bâton de corail', { force: 7, vitalite: 2 }, ['#ff8a9a', '#c94a6a', '#ffd0d8'], ['#ffe0e6', '#c94a6a'], 'Du corail rose pétrifié. Lourd, mais quelle onde !', 1),
  echarpe_marees: mkScarf('Écharpe des marées', { vitalite: 3, esprit: 2 }, ['#2f8fa0', '#1a4a5a'], 'Elle ondule même quand il n’y a pas de vent.'),
  ceinture_coquillages: mkBelt('Ceinture de coquillages', { agilite: 3, vitalite: 2 }, ['#e8d8c8', '#a8988a', '#fff0f4', '#ff9ac0'], '#fff0f4', 'Des coquillages nacrés qui s’entrechoquent doucement.'),
  anneau_corail: mkRing('Anneau de corail', { vitalite: 3, agilite: 1 }, ['#ff8a9a', '#c94a6a', '#ffd0d8', '#7af0d0'], 'Il sent encore la mer.'),
  // Sommet du Héron
  baton_braise: mkStaff('Bâton de braise', { force: 9, esprit: 2 }, ['#ff7a3a', '#c9412f', '#ffd08a', '#3e1a0a', '#1a0a04'], ['#ffd08a', '#e05a2a'], 'Il fume encore. Son onde brûle deux fois.', 2),
  kunai_tempete: mkKunai('Kunaï de tempête', { force: 9, agilite: 3 }, ['#e8f0ff', '#8aa8d8', '#ffffff'], ['#ffffff', '#8aa8d8'], 'Lancé du sommet, il traverse tout ce qu’il croise.', 200, true),
  echarpe_givre: mkScarf('Écharpe de givre', { agilite: 3, vitalite: 3 }, ['#e8f7ff', '#8ab8d8'], 'Tissée de neige du sommet. Elle ne fond jamais.'),
  ceinture_jade: mkBelt('Ceinture de jade', { force: 3, esprit: 3 }, ['#3fa68a', '#1f6a5a', '#8fe0c0', '#e0b43a'], '#8fe0c0', 'Des plaques de jade reliées par un fil d’or.'),
  anneau_givre: mkRing('Anneau de givre', { esprit: 3, vitalite: 2 }, ['#bff0ff', '#5fa3c0', '#ffffff', '#2c5a73'], 'Il givre les doigts, et l’esprit s’éclaircit.'),
  kasa_noir: mkHat('Kasa noir', { agilite: 3, force: 2 }, 'kasa', ['#3a3a4a', '#1a1a24', '#6a6a7a'], 'Le chapeau des ninjas du sommet. Personne ne sait qui est dessous.')
});
// Les armes de la Voie des Armes (katanas, masses) et de la Voie du Lancer (shurikens), du marais au sommet
Object.assign(ITEMS, {
  harpon_roseau: mkStaff('Harpon de roseau', { force: 2, agilite: 1 }, ['#c9e07a', '#8aa84a', '#f0f8c8', '#8d6a45', '#5a3e25'], ['#e8f0c8', '#8aa84a'], 'Une pointe de roseau taillée en biseau. Les grenouilles pêcheuses l’adorent.', 0, 'harpon'),
  harpon_cristal: mkStaff('Harpon de cristal', { force: 6, agilite: 2 }, ['#b8e8ff', '#5fa3c0', '#ffffff', '#2c3f73', '#1d2a52'], ['#e0f7ff', '#5fa3c0'], 'Une longue pointe de cristal : elle file tout droit, sans jamais trembler.', 0, 'harpon'),
  harpon_foudre: mkStaff('Harpon de foudre', { force: 9, agilite: 3 }, ['#fff6b0', '#e0b43a', '#ffffff', '#3a1a5a', '#1a0a2a'], ['#fff6b0', '#b86ae8'], 'Forgé au sommet, les soirs d’orage. Il vibre avant de frapper.', 0, 'harpon'),
  katana_bambou: mkKatana('Sabre de bambou', { force: 2, agilite: 1 }, ['#d8e0b0', '#9aa86a', '#ffffff', '#6e4a2a', '#3e2a19'], ['#ffffff', '#b8c96a'], 'Pour s’entraîner. Il ne coupe pas grand-chose, mais il siffle joliment.'),
  katana_roseau: mkKatana('Katana du roseau', { force: 3, agilite: 1 }, ['#d9e1e6', '#a9b3bf', '#ffffff', '#4e9a45', '#2e6b3d'], ['#ffffff', '#8fce52'], 'Une lame fine, une poignée tressée de roseau vert.'),
  katana_saule: mkKatana('Wakizashi d’écorce', { force: 4, agilite: 2 }, ['#e8e0d0', '#a89a8a', '#ffffff', '#5a3e25', '#3e2a19'], ['#fff8e8', '#a89a7a'], 'Court et vif : il sort du fourreau avant qu’on l’ait vu bouger.'),
  katana_lune: mkKatana('Katana de lune', { force: 6, esprit: 2 }, ['#d8e0f8', '#8a9ac8', '#ffffff', '#3a4a6b', '#1f2a4a'], ['#f4f6ff', '#8a9ac8'], 'Forgé sous la lune des grottes : sa lame laisse un reflet argenté.'),
  katana_maree: mkKatana('Katana des marées', { force: 7, agilite: 2 }, ['#bff0ff', '#3a9a8a', '#ffffff', '#1f4a5a', '#12303a'], ['#d0fff4', '#3a9a8a'], 'Remonté du temple englouti. Chaque entaille sent l’embrun.'),
  katana_foudre: mkKatana('Katana de foudre', { force: 9, agilite: 3 }, ['#fff6b0', '#e0b43a', '#ffffff', '#3a1a5a', '#1a0a2a'], ['#fff6b0', '#b86ae8'], 'Frappé par l’orage au sommet du héron. Il crépite encore.'),
  masse_racine: mkMasse('Massue de racine', { force: 3, agilite: -1 }, ['#8d6a45', '#5a3e25', '#b38a5e', '#6e4a2a', '#3e2a19'], ['#d8c8a8', '#8a7a5a'], 'Une grosse racine noueuse. Personne n’a dit que ce serait élégant.'),
  masse_galet: mkMasse('Maillet de galet', { force: 4, vitalite: 1, agilite: -1 }, ['#a3abb6', '#6b7280', '#d9e1e6'], ['#e6e8e8', '#8a9098'], 'Un galet de rivière lié à un manche de saule.'),
  masse_fer: mkMasse('Kanabō de fer', { force: 6, vitalite: 2, agilite: -1 }, ['#7a8290', '#4a5260', '#b8c0c8', '#3e2a19', '#241810'], ['#d9e1e6', '#5a6a7a'], 'Hérissé de clous de fer. Chaque coup fait trembler le sol.'),
  masse_cristal: mkMasse('Masse de cristal', { force: 7, vitalite: 2 }, ['#9cd8f0', '#5fa3c0', '#e0f7ff', '#2c3f73', '#1d2a52'], ['#e0f7ff', '#5fa3c0'], 'Un bloc de cristal des grottes, qui chante quand il frappe.'),
  masse_corail: mkMasse('Masse de corail', { force: 8, vitalite: 3, agilite: -1 }, ['#ff8a9a', '#c94a6a', '#ffd0d8', '#5a3e25', '#3e2a19'], ['#ffe0e6', '#c94a6a'], 'Du corail pétrifié, lourd comme un rocher du temple.'),
  masse_volcan: mkMasse('Kanabō du volcan', { force: 11, vitalite: 2, agilite: -2 }, ['#5a3a3a', '#2a1a1a', '#ff7a3a', '#3e1a0a', '#1a0a04'], ['#ffd08a', '#e05a2a'], 'De la roche du volcan, encore rouge entre les fissures.'),
  shuriken_bois: mkShuriken('Shuriken de bois', { force: 1, agilite: 1 }, ['#c9a36a', '#8a6a3a', '#f0d8a8', '#4a3325'], ['#f0d8a8', '#8a6a3a'], 'Taillé au couteau dans une écorce dure. Il tourne un peu de travers.'),
  shuriken_eau: mkShuriken('Shuriken d’eau', { force: 2, esprit: 1 }, ['#7fc4f0', '#3a7fc9', '#e8f4ff', '#1f4a6b'], ['#e8f4ff', '#3a7fc9'], 'Une étoile d’eau durcie par un vieux ninja du marais. Elle éclabousse en frappant.'),
  shuriken_rosee: mkShuriken('Shuriken de rosée', { force: 4, esprit: 1 }, ['#9cf0d0', '#3fa68a', '#ffffff', '#1f6a5a'], ['#d0fff4', '#3fa68a'], 'Des gouttes de rosée figées en étoile. Elles brillent au soleil.'),
  shuriken_givre: mkShuriken('Shuriken de givre', { force: 5, agilite: 2 }, ['#e8fbff', '#8ab8d8', '#ffffff', '#2c5a73'], ['#ffffff', '#8ab8d8'], 'Si froid qu’il fume. On le lance avec des gants.'),
  shuriken_maree: mkShuriken('Grand shuriken des marées', { force: 6, esprit: 2 }, ['#5fd0e0', '#2f8fa0', '#e0ffff', '#1a4a5a'], ['#e0ffff', '#2f8fa0'], 'Large comme une assiette : il revient toujours, comme la marée.'),
  fuma_tempete: mkShuriken('Fūma de la tempête', { force: 8, agilite: 3 }, ['#e8f0ff', '#8aa8d8', '#ffffff', '#3a4a6b'], ['#ffffff', '#8aa8d8'], 'Le grand shuriken pliant des ninjas du sommet. Il hurle en tournant.')
});

// Trésors de la Tour des Cent Sages (un par Grand Sage, tous les 10 étages) et de l'album : jamais en boutique
// ni en butin. from dit où les trouver (tour : l'étage ; album : le palier).
Object.assign(ITEMS, {
  anneau_sages: {
    slot: 'anneau', name: 'Anneau des Sages', icon: 'anneau', stats: { esprit: 2, agilite: 2 }, drop: 0, reward: true, from: { tour: 10 },
    desc: 'Un anneau d’ambre chaude, remis par la Doyenne Hasuno à qui atteint le 10e étage.',
    colors: { 1: '#f07a3a', 2: '#9a4212', 3: '#ffd08a', 4: '#4e9a45' }, look: { ring: true }
  },
  echarpe_sages: {
    slot: 'echarpe', name: 'Écharpe des Sages', icon: 'echarpe', stats: { esprit: 2, force: 2, vitalite: 1 }, drop: 0, reward: true, from: { tour: 20 },
    desc: 'Orange vif, comme le ciel du mont Kaeru au couchant.',
    colors: { 1: '#f07a3a', 2: '#9a3a1f' }, scarf: ['#f07a3a', '#9a3a1f']
  },
  kasa_sages: {
    slot: 'tete', name: 'Kasa des Sages', icon: 'kasa', stats: { vitalite: 2, agilite: 2, esprit: 1 }, drop: 0, reward: true, from: { tour: 30 },
    desc: 'Le grand chapeau laqué des ermites du mont Kaeru. La pluie d’huile glisse dessus.',
    colors: { 1: '#e05a2a', 2: '#9a3a1f', 3: '#ffb070' }, look: { hat: 'kasa' }
  },
  corde_sacree: {
    slot: 'ceinture', name: 'Corde sacrée', icon: 'ceinture', stats: { vitalite: 3, esprit: 3 }, drop: 0, reward: true, from: { tour: 40 },
    desc: 'Une corde de paille tressée, comme celles qui ceignent les rochers sacrés, avec ses rubans de papier.',
    colors: { 1: '#f4ecd8', 2: '#b8a36a', 3: '#ffffff', 4: '#c9412f' }, belt: ['#f4ecd8', '#c9412f'], charm: '#f4f4e8', look: { belt: true, charm: true }
  },
  baton_anciens: {
    slot: 'arme', kind: 'baton', name: 'Bâton des Anciens', icon: 'baton', stats: { force: 6, esprit: 2 }, drop: 0, reward: true, from: { tour: 50 },
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
    slot: 'echarpe', name: 'Écharpe du crépuscule', icon: 'echarpe', stats: { agilite: 3, esprit: 3, vitalite: 2 }, drop: 0, reward: true, from: { tour: 80 },
    desc: 'Teinte du violet des soirs de la tour, quand les lanternes s’allument une à une.',
    colors: { 1: '#b84aa0', 2: '#6a2a6b' }, scarf: ['#b84aa0', '#6a2a6b']
  },
  couronne_crapaud: {
    slot: 'tete', name: 'Couronne du Crapaud-Roi', icon: 'casque', stats: { vitalite: 3, esprit: 3, force: 2 }, drop: 0, reward: true, from: { tour: 90 },
    desc: 'Une couronne d’écorce dorée, que seuls les ermites les plus anciens ont portée.',
    colors: { 1: '#e0b43a', 2: '#8a6f1f', 3: '#fff0a8', 4: '#c9412f' }, look: { hat: 'ecorce' }
  },
  ceinture_premier_sage: {
    slot: 'ceinture', name: 'Ceinture du Premier Sage', icon: 'ceinture', stats: { force: 4, vitalite: 4, agilite: 3, esprit: 3 }, drop: 0, reward: true, from: { tour: 100 },
    desc: 'Au sommet de la tour, le Premier Sage la dénoue et te la tend. Tout le mont Kaeru s’incline.',
    colors: { 1: '#e07a2a', 2: '#9a3a1f', 3: '#f3d27a', 4: '#fff6b0' }, belt: ['#e07a2a', '#f3d27a'], charm: '#fff6b0', look: { belt: true, charm: true }
  },
  anneau_naturaliste: {
    slot: 'anneau', name: 'Anneau du naturaliste', icon: 'anneau', stats: { agilite: 3, esprit: 2 }, drop: 0, reward: true, from: { album: 'monstres' },
    desc: 'Pour qui a croisé toutes les bêtes du marais… et tous les Grands Sages de la tour.',
    colors: { 1: '#8fce52', 2: '#4e9a45', 3: '#e8f7a0', 4: '#7a5634' }, look: { ring: true }
  },
  echarpe_collection: {
    slot: 'echarpe', name: 'Écharpe du collectionneur', icon: 'echarpe', stats: { vitalite: 2, agilite: 2, force: 2, esprit: 2 }, drop: 0, reward: true, from: { album: 'objets' },
    desc: 'Un patchwork de toutes les étoffes du marais. Unique, forcément.',
    colors: { 1: '#9cc7e0', 2: '#c9412f' }, scarf: ['#9cc7e0', '#c9412f']
  }
});
ITEMS.ceinture_champion.from = ITEMS.ceinture_dojo.from = { dojo: true };

// Les armes de jet se manient à l'Agilité (l'attribut principal de la Voie du Lancer) : leur bonus de Force devient
// de l'Agilité, et leur petite Agilité devient de la Force.
function swapThrown(st) { var o = Object.assign({}, st), f = st.force || 0, a = st.agilite || 0; delete o.force; delete o.agilite; if (f) o.agilite = f; if (a) o.force = a; return o; }
Object.keys(ITEMS).forEach(function (id) { if (ITEMS[id].kind === 'kunai') ITEMS[id].stats = swapThrown(ITEMS[id].stats); });

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
Object.assign(ITEM_TIER, {
  harpon_roseau: 1, harpon_cristal: 4, harpon_foudre: 6,
  katana_bambou: 1, masse_racine: 1, shuriken_bois: 1,
  katana_roseau: 2, masse_galet: 2, shuriken_eau: 2,
  katana_saule: 3, masse_fer: 3, shuriken_rosee: 3,
  katana_lune: 4, masse_cristal: 4, shuriken_givre: 4,
  katana_maree: 5, masse_corail: 5, shuriken_maree: 5,
  katana_foudre: 6, masse_volcan: 6, fuma_tempete: 6
});

// ---------- Les objets du Continent : dix par terre (une arme de chaque type, et de quoi s'habiller) ----------
// Tirés de la matière de leur terre (ses couleurs, son nom). Leur force part de celle des meilleurs objets de l'île et
// monte en douceur de terre en terre (voir continentMain) : sur le Continent, c'est le butin qui fait avancer.
// Rang d'un objet = rang de sa terre (7 pour la Plaine des Vents… 22 pour l'Orage).
// continentMain(w) : l'attribut principal d'une arme commune de la terre w (≈ 13 à la Plaine des Vents, ≈ 130 à l'Orage) ;
// les accessoires en valent le tiers. GEAR_VERSION : quand la courbe change, les exemplaires déjà trouvés sont recalculés.
var GEAR_VERSION = 3;
// les courbes successives (la force d'une arme commune de la terre w) : 1 = 1,1 × L (le saut de l'île au Continent),
// 2 = en pente douce mais trop plate (les trouvailles ne changeaient presque rien), 3 = celle d'aujourd'hui
var GEAR_CURVES = {
  1: function (w) { return 1.1 * (8 * w + 5); },
  2: function (w) { return (8 * w + 5) * (0.24 + 0.035 * (w - ISLAND_WORLDS)); },
  3: function (w) { return (8 * w + 5) * (0.4 + 0.045 * (w - ISLAND_WORLDS)); }
};
// les multiplicateurs des raretés à chaque version (les Rares et les Épiques pèsent plus depuis la 3)
var RARITY_MULTS = { 1: { rare: 1.35, epique: 1.75 }, 2: { rare: 1.35, epique: 1.75 }, 3: { rare: 1.5, epique: 2.1 } };
function continentMain(w) { return GEAR_CURVES[GEAR_VERSION](w); }
function continentAcc(w) { return 0.33 * continentMain(w); }
var CONTINENT_GEAR = {
  plaine: { de: 'des Vents', c: ['#e0c050', '#a8882a', '#fff0a0', '#6e4a2a', '#4a3018'], wave: ['#fff0a0', '#a8882a'], focus: 'agilite', hat: 'kasa' },
  bataille: { de: 'de guerre', c: ['#b0b4bc', '#6a6e78', '#e8ecf4', '#6a1a1a', '#3a0a0a'], wave: ['#e8ecf4', '#c9412f'], focus: 'force', hat: 'ecorce' },
  epines: { de: 'd’épines', c: ['#8a2a4a', '#5a1a2e', '#d06a8a', '#3a4a2a', '#1e2a14'], wave: ['#d06a8a', '#3a4a2a'], focus: 'agilite', hat: 'kasa' },
  dunes: { de: 'des dunes', c: ['#f0d498', '#b8985a', '#fff6d8', '#7a5028', '#4a2e14'], wave: ['#fff6d8', '#d8a468'], focus: 'vitalite', hat: 'kasa' },
  canyon: { de: 'de grès rouge', c: ['#d8744a', '#9a4a2a', '#f0a878', '#4a2e1a', '#2a1a0c'], wave: ['#f0a878', '#9a4a2a'], focus: 'force', hat: 'ecorce' },
  toundra: { de: 'des glaces', c: ['#a0d8f0', '#4a8ab0', '#e8f8ff', '#3a5a7a', '#1e3a5a'], wave: ['#e8f8ff', '#6ab0e0'], focus: 'vitalite', hat: 'ecorce' },
  volcan: { de: 'de braise vive', c: ['#ff6a1a', '#a82a0a', '#ffd040', '#2a2230', '#120e18'], wave: ['#ffd040', '#e0402a'], focus: 'force', hat: 'ecorce' },
  cimetiere: { de: 'des rois morts', c: ['#8af0c0', '#3a8a6a', '#d0fff0', '#4a4a52', '#2a2a32'], wave: ['#d0fff0', '#3a8a6a'], focus: 'esprit', hat: 'kasa' },
  feerique: { de: 'féerique', c: ['#f0a0e0', '#a040c0', '#fff0ff', '#4a8a8a', '#2a4a5a'], wave: ['#fff0ff', '#a0f0e0'], focus: 'esprit', hat: 'kasa' },
  ciel: { de: 'céleste', c: ['#e8ecf4', '#a0a4b4', '#ffffff', '#e0b43a', '#8a6f1f'], wave: ['#ffffff', '#8ab0e0'], focus: 'agilite', hat: 'kasa' },
  jungle: { de: 'de la jungle', c: ['#6ae060', '#2a8a2a', '#c0ffb0', '#e04a8a', '#8a1a4a'], wave: ['#c0ffb0', '#e04a8a'], focus: 'vitalite', hat: 'kasa' },
  mines: { de: 'd’obsidienne', c: ['#8a6ab0', '#3a2a4a', '#e0c0ff', '#4a4a3a', '#2a2a22'], wave: ['#e0c0ff', '#3a2a4a'], focus: 'force', hat: 'ecorce' },
  forteresse: { de: 'de fer noir', c: ['#9aa0b0', '#5a6070', '#d8dce6', '#2a4a8a', '#1a2a5a'], wave: ['#d8dce6', '#2a4a8a'], focus: 'vitalite', hat: 'ecorce' },
  abysse: { de: 'du vide', c: ['#c080ff', '#6a3aa8', '#f0d8ff', '#241a34', '#0e0818'], wave: ['#f0d8ff', '#6a3aa8'], focus: 'esprit', hat: 'kasa' },
  dragons: { de: 'draconique', c: ['#f0d060', '#c08a1a', '#fff6c0', '#8a2a1a', '#4a0a0a'], wave: ['#fff6c0', '#e0402a'], focus: 'force', hat: 'ecorce' },
  orage: { de: 'de l’orage', c: ['#6af0ff', '#2a6ab0', '#e0ffff', '#343a50', '#1e2230'], wave: ['#e0ffff', '#f0f040'], focus: 'esprit', hat: 'ecorce' }
};
// (les îles suivantes ajoutent les leurs : COLOSSUS_GEAR, et ses icônes, dans colosses.js)
if (typeof COLOSSUS_GEAR !== 'undefined') Object.assign(CONTINENT_GEAR, COLOSSUS_GEAR);
if (typeof COLOSSUS_ICONS !== 'undefined') Object.assign(ICONS, COLOSSUS_ICONS);
if (typeof ARCHIPEL_GEAR !== 'undefined') Object.assign(CONTINENT_GEAR, ARCHIPEL_GEAR);
if (typeof ARCHIPEL_ICONS !== 'undefined') Object.assign(ICONS, ARCHIPEL_ICONS);
if (typeof ROYAUME_GEAR !== 'undefined') Object.assign(CONTINENT_GEAR, ROYAUME_GEAR);
if (typeof ROYAUME_ICONS !== 'undefined') Object.assign(ICONS, ROYAUME_ICONS);
(function () {
  var SECOND = { echarpe: 'vitalite', ceinture: 'agilite', anneau: 'esprit', tete: 'vitalite' };
  var R = Math.round;
  BIOMES.forEach(function (b, w) {
    var g = CONTINENT_GEAR[b.id];
    if (!g) return;
    var t = w + 1, k = t - 6, col = g.c, from = 'Butin : ' + b.name + '.', add = {};
    var nm = function (type, def) { return ((g.names && g.names[type]) || def) + ' '; };
    var sec = function (not) { return g.focus !== not ? g.focus : 'vitalite'; };
    var cm = continentMain(w), main = R(cm), second = R(0.27 * cm), acc = R(continentAcc(w)), accMain = Math.ceil(acc * 0.6);
    var pair = function (a, va, bb, vb) { var o = {}; o[a] = va; o[bb] = (o[bb] || 0) + vb; return o; };
    var accStats = function (slot) { var s2 = SECOND[slot] === g.focus ? 'force' : SECOND[slot]; return pair(g.focus, accMain, s2, acc - accMain); };
    add['c_' + b.id + '_baton'] = mkStaff(nm('baton', 'Bâton') + g.de, pair('force', main, sec('force'), second), col, g.wave, 'Chaque coup libère une large onde de choc. ' + from, 2);
    add['c_' + b.id + '_harpon'] = mkStaff(nm('harpon', 'Harpon') + g.de, pair('force', main, 'agilite', second), col, g.wave, 'Un coup d’estoc qui file très loin. ' + from, 0, 'harpon');
    add['c_' + b.id + '_katana'] = mkKatana(nm('katana', 'Katana') + g.de, pair('force', main, sec('force'), second), col, g.wave, 'Des entailles vives qui font saigner. ' + from);
    add['c_' + b.id + '_masse'] = mkMasse(nm('masse', 'Masse') + g.de, { force: R(main * 1.18), vitalite: second, agilite: -(2 + Math.floor(k / 5)) }, col, g.wave, 'Lourde, et le sol tremble. ' + from);
    add['c_' + b.id + '_kunai'] = mkKunai(nm('kunai', 'Kunaï') + g.de, pair('agilite', main, sec('agilite'), second), col, g.wave, 'Lancé droit, il traverse tout. ' + from, 200, true);
    add['c_' + b.id + '_shuriken'] = mkShuriken(nm('shuriken', 'Shuriken') + g.de, pair('agilite', main, sec('agilite'), second), col, g.wave, 'Une étoile qui tournoie en sifflant. ' + from);
    add['c_' + b.id + '_echarpe'] = mkScarf(nm('echarpe', 'Écharpe') + g.de, accStats('echarpe'), [col[0], col[1]], 'Elle flotte au vent de sa terre. ' + from);
    add['c_' + b.id + '_ceinture'] = mkBelt(nm('ceinture', 'Ceinture') + g.de, accStats('ceinture'), [col[3], col[4], col[1], col[0]], col[2], 'Nouée serré, pour les longs combats. ' + from);
    add['c_' + b.id + '_anneau'] = mkRing(nm('anneau', 'Anneau') + g.de, accStats('anneau'), [col[0], col[1], col[2], col[3]], 'Il brille au doigt. ' + from);
    add['c_' + b.id + '_tete'] = mkHat((g.names ? nm('tete', 'Heaume') : (g.hat === 'kasa' ? 'Kasa ' : 'Heaume ')) + g.de, accStats('tete'), g.hat, [col[0], col[1], col[2], col[3]], 'Pour garder la tête froide. ' + from);
    // leurs propres formes (icônes), et un heaume à cornes pour les casques
    var sf = '_' + (g.set || 'c'), shapes = { baton: 'baton' + sf, harpon: 'harpon' + sf, katana: 'katana' + sf, masse: 'masse' + sf, kunai: 'kunai' + sf, shuriken: 'shuriken' + sf, echarpe: 'echarpe' + sf, ceinture: 'ceinture' + sf, anneau: 'anneau' + sf, tete: g.hat === 'kasa' ? 'kasa' + sf : 'casque' + sf };
    Object.keys(shapes).forEach(function (s) { add['c_' + b.id + '_' + s].icon = shapes[s]; });
    if (g.hat !== 'kasa') add['c_' + b.id + '_tete'].look = { hat: 'cornes' };
    Object.keys(add).forEach(function (id) { add[id].continent = w; ITEMS[id] = add[id]; ITEM_TIER[id] = t; });
  });
})();

// ---------- Raretés : chaque objet trouvé est un exemplaire unique ----------
// Commun, Rare ou Épique : la bordure change de couleur, et les stats sont tirées au hasard à la création
// (plus fortes, avec des stats en plus, pour les raretés hautes). Un exemplaire a pour identifiant
// « modèle#code » ; ses données (modèle, rareté, stats) sont gardées dans save.items, et il est enregistré
// dans ITEMS comme n'importe quel objet : tout le reste du jeu (équipement, stats, apparence) le traite pareil.
// Les trésors (tour, dojo, album) ont des stats fixes et comptent comme Épiques.
var RARITIES = {
  commun: { name: 'Commun', color: '#b8c0b0', mult: 1, extra: 0, price: 1 },
  rare: { name: 'Rare', color: '#4f9ae8', mult: 1.5, extra: 1, price: 1.8 },
  epique: { name: 'Épique', color: '#b86ae8', mult: 2.1, extra: 2, price: 3 }
};
var RARITY_IDS = ['commun', 'rare', 'epique'];
// Légendaire : une rareté à part, dorée, réservée à quelques modèles (bandeaux et capes) qu'on ne trouve que sur le
// Continent, très rarement (LEGEND_CHANCE). Leurs stats suivent le rang de la terre où ils tombent.
RARITIES.legendaire = { name: 'Légendaire', color: '#ff8c1a', mult: 1, extra: 0, price: 6 };
// Unique : une rareté vert rayonnant, plus forte qu'un Épique, qu'on ne trouve que dans les Donjons (donjons.js) ;
// chaque exemplaire porte le nom de son donjon
RARITIES.unique = { name: 'Unique', color: '#3aff7a', mult: 2.3, extra: 3, price: 5 }; // (×2,6 jusqu'au 4 octobre 2026 : avec la forge, ils écrasaient le jeu)
var UNIQUE_VERSION = 2, UNIQUE_OLD = 2.6; // les Uniques tirés avant ce changement sont recalculés une fois (save.uniq)
var ITEM_RARITIES = RARITY_IDS.concat(['unique', 'legendaire']); // pour ranger les objets
var LEGEND_CHANCE = { 0: 0.003, 1: 0.008, 2: 0.02 }; // par victoire sur le Continent : monstre commun, boss ou rare, épique
function mkLegend(slot, name, stats, accent, desc) {
  var gold = ['#f0c040', '#b08a1a', '#fff6c0'], dark = accent[1];
  // weights : le poids de chaque caractéristique ; stats : celles d'un exemplaire tombé dans la première terre du Continent
  var st = {}; Object.keys(stats).forEach(function (k) { st[k] = Math.max(1, Math.round(stats[k] * continentAcc(ISLAND_WORLDS))); });
  var it = { slot: slot, name: name, stats: st, weights: stats, drop: 0, legend: true, desc: desc, colors: { 1: gold[0], 2: gold[1], 3: gold[2], 4: accent[0], b: dark } };
  if (slot === 'tete') { it.icon = 'bandeau'; it.look = { hat: 'bandeau' }; it.colors = { 1: gold[0], 2: gold[1], 3: accent[0], 4: gold[2] }; }
  else { it.icon = 'cape'; it.scarf = [gold[0], accent[0]]; it.look = { cape: true }; }
  return it;
}
// stats : le poids de chaque caractéristique (× la force d'un accessoire de la terre où il tombe)
var LEGENDS = {
  leg_bandeau_soleil: mkLegend('tete', 'Bandeau du Soleil Levant', { force: 1.3, vitalite: 0.6, agilite: 0.4 }, ['#c9412f', '#6a1a1a'], 'Un bandeau d’or noué serré. On dit qu’il a vu mille aubes de combat.'),
  leg_bandeau_tonnerre: mkLegend('tete', 'Bandeau du Tonnerre', { agilite: 1.3, esprit: 0.6, force: 0.4 }, ['#6af0ff', '#2a6ab0'], 'Sa plaque crépite encore. Qui le porte frappe avant qu’on l’ait vu bouger.'),
  leg_bandeau_lune: mkLegend('tete', 'Bandeau de la Lune Noire', { esprit: 1.3, vitalite: 0.6, agilite: 0.4 }, ['#8a5ad0', '#3a1a6a'], 'Tissé une nuit sans lune, brodé de fil d’or. Les sorts y puisent leur force.'),
  leg_bandeau_gardien: mkLegend('tete', 'Bandeau du Gardien', { vitalite: 1.3, force: 0.6, esprit: 0.4 }, ['#3aa05a', '#1a5a2a'], 'Celui des gardiens du Continent : il tient debout ceux qui devraient tomber.'),
  leg_cape_aurore: mkLegend('echarpe', 'Cape de l’Aurore', { force: 1.3, agilite: 0.6, vitalite: 0.4 }, ['#e0602a', '#8a2a0a'], 'Une cape d’or et de feu, qui claque au vent comme un drapeau.'),
  leg_cape_etoiles: mkLegend('echarpe', 'Cape d’Étoiles', { esprit: 1.3, agilite: 0.6, vitalite: 0.4 }, ['#3a4aa8', '#1a2260'], 'Sa doublure est un ciel de nuit. On y voit parfois filer une étoile.'),
  leg_cape_dragon: mkLegend('echarpe', 'Cape du Dragon', { vitalite: 1.3, force: 0.6, esprit: 0.4 }, ['#a81a2a', '#4a0a12'], 'Taillée dans une aile de dragon. Rien ne la perce.'),
  leg_cape_jade: mkLegend('echarpe', 'Cape de Jade', { agilite: 1.3, vitalite: 0.6, force: 0.4 }, ['#2aa07a', '#0a4a3a'], 'Légère comme une feuille, verte comme la mare au printemps.')
};
Object.keys(LEGENDS).forEach(function (id) { ITEMS[id] = LEGENDS[id]; });
// Un Légendaire tombe : un exemplaire dont les stats suivent le rang de la terre (et le cycle)
function rollLegend(save, tier) {
  var ids = Object.keys(LEGENDS).filter(function (id) { return itemAvailable(save, id); }), base = ids[Math.floor(Math.random() * ids.length)];
  var unit = continentAcc(Math.max(ISLAND_WORLDS, tier - 1)) * (1 + CYCLE.loot * Math.max(0, (save.cycle || 1) - 1)), stats = {};
  Object.keys(LEGENDS[base].weights).forEach(function (k) { stats[k] = Math.max(1, Math.round(LEGENDS[base].weights[k] * unit * (0.95 + Math.random() * 0.1))); });
  var id = base + '#' + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 6);
  save.items[id] = { base: base, rar: 'legendaire', stats: stats };
  if ((save.cycle || 1) > 1) save.items[id].plus = save.cycle - 1;
  registerItem(id, save.items[id]);
  return id;
}
var BASE_IDS = Object.keys(ITEMS); // les modèles (les exemplaires s'ajoutent à ITEMS ensuite)
function baseOf(id) { return String(id).split('#')[0]; }
function rarityOf(id) { var it = ITEMS[id]; return !it ? 'commun' : (it.rarity || (it.reward ? 'epique' : 'commun')); }
function tierOf(id) { return ITEM_TIER[baseOf(id)] || 1; }
function registerItem(id, inst) {
  var b = inst && ITEMS[inst.base];
  if (!b || id.indexOf('#') < 0 || !RARITIES[inst.rar] || !inst.stats || typeof inst.stats !== 'object') return false;
  var stats = {};
  Object.keys(inst.stats).forEach(function (k) {
    var key = k === 'souffle' ? 'esprit' : k;
    if (BASE_STATS[key] !== undefined && typeof inst.stats[k] === 'number') stats[key] = (stats[key] || 0) + Math.round(inst.stats[k]);
  });
  var plus = Math.max(0, Math.min(99, Math.floor(+inst.plus || 0))); // le « + » des objets trouvés dans les cycles suivants
  var nm = typeof inst.name === 'string' && inst.name ? inst.name.slice(0, 48) : b.name; // (un Unique a le nom de son donjon)
  // la forge : chaque niveau ajoute FORGE_STEP des stats positives (les stats tirées restent dans raw)
  var forge = Math.max(0, Math.min(FORGE_MAX, Math.floor(+inst.forge || 0))), forged = {};
  Object.keys(stats).forEach(function (k) { forged[k] = stats[k] > 0 ? Math.round(stats[k] * (1 + FORGE_STEP * forge)) : stats[k]; });
  ITEMS[id] = Object.assign({}, b, { stats: forged, raw: stats, forge: forge, rarity: inst.rar, base: inst.base, plus: plus, name: plus ? nm + ' +' + plus : nm });
  if (inst.from) ITEMS[id].dungeon = String(inst.from).slice(0, 8);
  if (inst.investi && typeof inst.investi === 'object') ITEMS[id].investi = { e: Math.max(0, Math.round(+inst.investi.e || 0)), g: Math.max(0, Math.round(+inst.investi.g || 0)) }; // (ce qu'on a mis dans sa forge)
  return true;
}
// La forge (forge.js) : un exemplaire se renforce de +1 à +FORGE_MAX, chaque niveau ajoutant FORGE_STEP de ses stats
var FORGE_MAX = 10, FORGE_STEP = 0.03; // (+3 % par niveau, +30 % à +10 ; c'était +5 % : la forge s'empilait avec la rareté)
// Un nouvel exemplaire d'un modèle : ses stats tirées selon la rareté
function rollItem(save, base, rar) {
  var b = ITEMS[base], R = RARITIES[rar], stats = {}, plus = Math.max(0, (save.cycle || 1) - 1), boost = 1 + CYCLE.loot * plus;
  Object.keys(b.stats).forEach(function (k) {
    var v = b.stats[k];
    stats[k] = v < 0 ? v : Math.max(1, Math.round(v * R.mult * boost * (0.8 + Math.random() * 0.4)));
  });
  var others = Object.keys(BASE_STATS).filter(function (k) { return stats[k] === undefined; });
  for (var i = 0; i < R.extra && others.length; i++) {
    if (rar === 'rare' && Math.random() < 0.5) break; // un Rare a une chance sur deux d'avoir une stat de plus
    var k = others.splice(Math.floor(Math.random() * others.length), 1)[0];
    stats[k] = rar === 'unique' ? Math.max(2, Math.round(Math.max.apply(null, Object.keys(stats).map(function (s) { return stats[s]; })) * (0.15 + Math.random() * 0.1))) : 1 + Math.floor(Math.random() * (rar === 'epique' ? 3 : 2));
  }
  var id = base + '#' + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 6);
  save.items[id] = { base: base, rar: rar, stats: stats };
  if (plus) save.items[id].plus = plus;
  registerItem(id, save.items[id]);
  return id;
}
// La rareté d'une trouvaille : luck 0 (normal), 1 (boss, monstre rare), 2 (monstre épique), 'shop' (boutique)
function rollRarity(luck) {
  var p = { 0: [0.72, 0.24, 0.04], 1: [0.45, 0.4, 0.15], 2: [0.2, 0.45, 0.35], shop: [0.6, 0.3, 0.1] }[luck || 0], r = Math.random();
  return r < p[0] ? 'commun' : (r < p[0] + p[1] ? 'rare' : 'epique');
}
// Les modèles qu'on peut trouver jusqu'à un rang (ceux du rang atteint un peu plus souvent)
// (save : seulement ce que la grenouille peut porter — pas d'armes d'une autre voie ou d'un autre type)
function lootPool(maxTier, save) {
  return BASE_IDS.filter(function (id) { return ITEMS[id].drop > 0 && (ITEM_TIER[id] || 1) <= maxTier && (!save || itemAvailable(save, id)); });
}
function pickBase(maxTier, save) {
  var pool = lootPool(maxTier, save), weight = function (id) { return ITEMS[id].drop * ((ITEM_TIER[id] || 1) === maxTier ? 2 : 1); };
  if (maxTier > 6) {
    pool = pool.filter(function (id) { return (ITEM_TIER[id] || 1) >= maxTier - 2; });
    weight = function (id) { return ITEMS[id].drop * ((ITEM_TIER[id] || 1) === maxTier ? 3 : 1); };
  }
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
function lootBoost() { return 1 + playerMutBonus.loot + (clanBonus.butin || 0) + playerGearBonus.loot + (eventBoost('loot') - 1); }
function rollLoot(save, maxTier, chance, luck) {
  if (maxTier > 6 && Math.random() < (LEGEND_CHANCE[luck || 0] || 0) * (1 + playerMutBonus.loot)) return rollLegend(save, maxTier); // ultra rare
  if (Math.random() > chance * lootBoost()) return null;
  return rollItem(save, pickBase(maxTier, save), rollRarity(luck));
}

// ---------- Sauvegarde ----------
// Enregistrée automatiquement dans le navigateur (localStorage), et exportable dans un fichier.
// Attention : le navigateur range la sauvegarde par adresse (fichier ouvert en double-clic ≠ http://localhost),
// d'où l'export / import pour la retrouver partout.
var SAVE_VERSION = 6;
var PET_MAX_LEVEL = 10; // le niveau le plus haut d'un compagnon (forge.js)

function newSave() {
  return {
    v: SAVE_VERSION, hero: null, // hero = { name, skin } une fois la grenouille créée
    equip: Object.assign({}, DEFAULT_EQUIP), owned: STARTER_ITEMS.slice(),
    level: 1, xp: 0, points: 0, alloc: { vitalite: 0, agilite: 0, force: 0, esprit: 0 },
    skillPoints: 0, voie: null, arme: null, tree: [], deck: [], gold: 30,
    progress: BIOMES.map(function () { return 0; }), expedition: null, shop: [],
    cycle: 1, // le cycle du monde (NG+) : 1, puis 2 une fois le dernier boss du monde vaincu, etc.
    seenContinent: false, // le Grand Plongeon (la cinématique du passage vers le Continent) a été vu
    seenIsles: [], // les îles dont le film d'arrivée a été vu ('continent', 'colosses'…)
    mutation: { n: 0, traits: {} }, // les mutations : combien, et les traits choisis (id -> fois)
    mastery: { force: 0, carapace: 0, instinct: 0, souffle: 0 }, // les Maîtrises (après l'arbre), pour toujours
    awakened: [], // les sorts éveillés (un tous les 10 rangs de maîtrise)
    dungeons: {}, // les Donjons : id -> { room: salles vidées, lost: l'heure de la dernière défaite }
    eclats: 0, // les éclats de jade, le métal de la forge (forge.js)
    pets: {}, pet: null, // les compagnons : id du donjon -> niveau ; celui qui accompagne la grenouille
    quests: null, // les quêtes du jour (quetes.js) : { day, list: [{ id, n, got }], chest }
    season: null, // la saison de classement en cours : { id: 'AAAA-MM', pts }
    counts: { coffres: 0, titan: 0 }, // des compteurs pour les hauts faits : coffres des quêtes ouverts, attaques du Titan
    news: '', // la dernière fenêtre des nouveautés vue (voir NEWS dans hub.js)
    inClan: false, // dans un clan (vu la dernière fois que le jeu l'a lu : pour les quêtes)
    ach: [], // hauts faits obtenus (voir feats.js)
    items: {}, // les exemplaires d'objets : id -> { base, rar, stats }
    gifts: [], // cadeaux du dojo déjà reçus (leur identifiant, pour ne jamais les compter deux fois)
    tower: 0, // le plus haut étage vaincu de la Tour des Cent Sages
    meditation: null, // { since } : la grenouille médite au camp depuis ce moment
    shopDay: '', rerolls: 0, // le jour du dernier arrivage de l'étal, et les relances payées ce jour-là
    skins: [], // les skins achetés
    clanBonus: { xp: 0, lucioles: 0, butin: 0, force: 0, vie: 0 }, // les bonus de son clan
    album: { monstres: {}, objets: [], paliers: [] }, // bestiaire (id -> victoires), objets découverts, paliers réclamés
    battle: { auto: false, speed: 1 },
    gear: GEAR_VERSION, // la version de la courbe des objets du Continent (voir rescaleGear)
    uniq: UNIQUE_VERSION // la version de la force des Uniques
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
  if (data.alloc && data.alloc.souffle && !data.alloc.esprit) save.alloc.esprit = int(data.alloc.souffle, 0) || 0; // le Souffle est devenu l'Esprit
  save.level = Math.min(MAX_LEVEL, save.level);
  if (data.v === SAVE_VERSION || data.v === 5) {
    save.skillPoints = int(data.skillPoints, 0) || 0;
    save.voie = VOIES.some(function (v) { return v.id === data.voie; }) ? data.voie : null;
    if (Array.isArray(data.tree)) save.tree = data.tree.filter(function (id) { var n = nodeById(id); return n && n.voie === save.voie; });
    if (Array.isArray(data.deck)) save.deck = data.deck.filter(function (id) { return skillById(id); }).slice(0, DECK_SIZE);
    if (data.v === 5) { // l'équilibre des voies a changé (attribut principal, Vitalité ×1,5 pour toutes) : les points sont rendus
      Object.keys(save.alloc).forEach(function (k) { save.points += save.alloc[k]; save.alloc[k] = 0; });
      if (save.hero && save.points) save.notice = 'Les voies ont été rééquilibrées : chacune a maintenant son attribut principal (Force, Agilité ou Esprit), qui fait ses dégâts. Tes ' + save.points + ' points de caractéristique te sont rendus : répartis-les entre ton attribut principal et ta Vitalité !';
    }
  } else {
    // l'arbre a changé : on rend 1 point par niveau déjà gagné (la voie choisie est gardée)
    save.skillPoints = save.level - 1;
    save.voie = data.v === 4 && VOIES.some(function (v) { return v.id === data.voie; }) ? data.voie : null;
    if (data.v === 4) { // les points répartis valent désormais plus ou moins selon la voie : ils sont rendus aussi
      Object.keys(save.alloc).forEach(function (k) { save.points += save.alloc[k]; save.alloc[k] = 0; });
      if (save.hero) save.notice = 'Les voies ont été refaites : trois branches de sorts, de caractéristiques et de passifs qui se rejoignent au sommet, et le Souffle a laissé place à l’Esprit. Tes ' + save.skillPoints + ' points de voie et tes ' + save.points + ' points de caractéristique te sont rendus : ta voie les multiplie désormais !';
    }
    else if (data.v === 3) save.notice = 'Le Temple des voies a été refait. Tes ' + save.skillPoints + ' points de voie te sont rendus : choisis ta voie !';
  }
  // les exemplaires d'abord, pour que l'inventaire, l'étal et l'équipement les reconnaissent
  // avant la version 6, les armes de jet donnaient de la Force : leurs exemplaires passent à l'Agilité
  if (data.items && typeof data.items === 'object' && data.v < 6) Object.keys(data.items).forEach(function (id) { var it = data.items[id], b = it && ITEMS[it.base]; if (b && b.kind === 'kunai' && it.stats) it.stats = swapThrown(it.stats); });
  if (data.items && typeof data.items === 'object' && (data.gear || 1) < GEAR_VERSION) {
    var rescaled = 0, from = data.gear || 1;
    Object.keys(data.items).forEach(function (id) { if (rescaleGear(data.items[id], from)) rescaled++; });
    if (rescaled && save.hero && !save.notice) save.notice = 'Les objets ont été rééquilibrés : chaque nouvelle terre du Continent et chaque rareté (Rare, Épique) donnent maintenant de vrais gains. ' + (rescaled > 1 ? 'Tes ' + rescaled + ' objets ont été recalculés' : 'Ton objet a été recalculé') + ' à la hausse.';
  }
  // les Uniques tirés quand ils valaient ×2,6 : leurs stats passent à ×2,3, une fois
  if (data.items && typeof data.items === 'object' && (data.uniq || 1) < UNIQUE_VERSION) {
    var uniqs = 0;
    Object.keys(data.items).forEach(function (id) {
      var it = data.items[id];
      if (!it || it.rar !== 'unique' || !it.stats || typeof it.stats !== 'object') return;
      Object.keys(it.stats).forEach(function (k) { if (typeof it.stats[k] === 'number' && it.stats[k] > 0) it.stats[k] = Math.max(1, Math.round(it.stats[k] * RARITIES.unique.mult / UNIQUE_OLD)); });
      uniqs++;
    });
    if (uniqs && save.hero && !save.notice) save.notice = 'Rééquilibrage : les Uniques valent ×2,3 au lieu de ×2,6 (' + (uniqs > 1 ? 'tes ' + uniqs + ' Uniques ont été recalculés' : 'ton Unique a été recalculé') + '), et la forge donne +3 % de stats par niveau au lieu de +5 %. Avec la rareté, elles s’empilaient au point de tuer tout d’un seul coup.';
  }
  if (data.items && typeof data.items === 'object') Object.keys(data.items).forEach(function (id) {
    var di = data.items[id];
    if (!registerItem(id, di)) return;
    save.items[id] = { base: di.base, rar: di.rar, stats: ITEMS[id].stats };
    save.items[id].stats = ITEMS[id].raw; // (sans la forge)
    if (ITEMS[id].plus) save.items[id].plus = ITEMS[id].plus;
    if (ITEMS[id].forge) save.items[id].forge = ITEMS[id].forge;
    if (typeof di.name === 'string' && di.name) save.items[id].name = di.name.slice(0, 48);
    if (di.from) save.items[id].from = String(di.from).slice(0, 8);
    if (ITEMS[id].investi) save.items[id].investi = ITEMS[id].investi;
  });
  if (Array.isArray(data.shop)) save.shop = data.shop.filter(function (id) { return ITEMS[id] || id === TEA_ID; });
  if (data.auraOff) save.auraOff = true; // l'aura de mutation masquée
  if (typeof data.titre === 'number' && data.titre >= -1 && data.titre < MUTATION_TITLES.length) save.titre = Math.floor(data.titre);
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
  if (typeof data.arme === 'string' && WEAPON_TYPES[data.arme] && WEAPON_TYPES[data.arme].kind === save.voie) save.arme = data.arme;
  ensureWeapon(save); // et une arme de sa voie
  // hauts faits : null = partie d'avant les hauts faits, ils seront rangés sans être annoncés
  save.ach = Array.isArray(data.ach) ? data.ach.filter(function (id) { return typeof id === 'string'; }) : null;
  save.gifts = Array.isArray(data.gifts) ? data.gifts.filter(function (id) { return typeof id === 'string'; }).slice(-50) : [];
  save.tower = Math.min(TOWER_TOP, int(data.tower, 0) || 0);
  if (typeof data.shopDay === 'string') { save.shopDay = data.shopDay.slice(0, 12); save.rerolls = Math.min(SHOP_REROLL_MAX, int(data.rerolls, 0) || 0); }
  if (data.hero) data.hero.skin = skinId(data.hero.skin);
  if (Array.isArray(data.skins)) {
    data.skins = data.skins.map(skinId);
    save.skins = data.skins.filter(function (id, i) { return PREMIUM_SKINS[id] && data.skins.indexOf(id) === i; });
    var back = data.skins.filter(function (id) { return RETIRED_SKINS[id]; }), refund = back.reduce(function (s, id) { return s + RETIRED_SKINS[id]; }, 0);
    if (refund) { save.gold += refund; if (save.hero) save.notice = 'Les skins ont été refaits : ' + (back.length > 1 ? 'tes anciens skins te sont remboursés' : 'ton ancien skin t’est remboursé') + ' (' + refund + ' lucioles). Trois nouveaux skins t’attendent chaque jour !'; }
  }
  if (data.hero && PREMIUM_SKINS[data.hero.skin] && save.skins.indexOf(data.hero.skin) >= 0) save.hero.skin = data.hero.skin; // une peau achetée
  save.cycle = Math.max(1, Math.min(999, int(data.cycle, 1) || 1));
  save.seenContinent = !!data.seenContinent;
  save.seenIsles = Array.isArray(data.seenIsles) ? data.seenIsles.filter(function (id, i) { return ISLES.some(function (s) { return s.id === id; }) && data.seenIsles.indexOf(id) === i; }) : [];
  if (save.seenContinent && save.seenIsles.indexOf('continent') < 0) save.seenIsles.push('continent');
  if (data.mutation && typeof data.mutation === 'object') {
    save.mutation.n = Math.min(999, int(data.mutation.n, 0) || 0);
    Object.keys(data.mutation.traits || {}).forEach(function (id) { if (MUTATIONS[id]) save.mutation.traits[id] = Math.min(999, int(data.mutation.traits[id], 0) || 0); });
  }
  if (data.dungeons && typeof data.dungeons === 'object') Object.keys(data.dungeons).forEach(function (id) {
    var dd = data.dungeons[id];
    if (/^d\d{1,2}$/.test(id) && dd && typeof dd === 'object') save.dungeons[id] = { room: Math.min(10, int(dd.room, 0) || 0), day: typeof dd.day === 'string' ? dd.day.slice(0, 12) : '', lost: int(dd.lost, 0) || 0 };
  });
  save.eclats = Math.min(1e9, int(data.eclats, 0) || 0);
  save.inClan = !!data.inClan;
  if (typeof data.news === 'string') save.news = data.news.slice(0, 12);
  if (data.counts && typeof data.counts === 'object') Object.keys(save.counts).forEach(function (k) { save.counts[k] = Math.min(1e7, int(data.counts[k], 0) || 0); });
  if (data.pets && typeof data.pets === 'object') Object.keys(data.pets).forEach(function (id) { if (/^d\d{1,2}$/.test(id)) save.pets[id] = Math.min(PET_MAX_LEVEL, int(data.pets[id], 1) || 0); });
  if (typeof data.pet === 'string' && save.pets[data.pet]) save.pet = data.pet;
  if (data.quests && typeof data.quests === 'object' && typeof data.quests.day === 'string' && Array.isArray(data.quests.list)) {
    save.quests = { day: data.quests.day.slice(0, 12), chest: !!data.quests.chest, list: data.quests.list.slice(0, 5).filter(function (q) { return q && typeof q.id === 'string'; }).map(function (q) { return { id: q.id.slice(0, 16), n: Math.min(9999, int(q.n, 0) || 0), got: !!q.got }; }) };
  }
  if (data.season && typeof data.season.id === 'string') save.season = { id: data.season.id.slice(0, 8), pts: Math.min(1e7, int(data.season.pts, 0) || 0) };
  if (data.mastery && typeof data.mastery === 'object') MASTERIES.forEach(function (x) { save.mastery[x.id] = Math.min(9999, int(data.mastery[x.id], 0) || 0); });
  if (Array.isArray(data.awakened)) save.awakened = data.awakened.filter(function (id, i) { return skillById(id) && data.awakened.indexOf(id) === i; }).slice(0, awakeningsAllowed(save));
  if (data.clanBonus) { var cb = data.clanBonus, cl = function (v, mx) { return Math.min(mx, Math.max(0, +v || 0)); }; save.clanBonus = { xp: cl(cb.xp, 0.2), lucioles: cl(cb.lucioles, 0.2), butin: cl(cb.butin, 0.2), force: cl(cb.force, 0.1), vie: cl(cb.vie, 0.1) }; }
  if (data.meditation && typeof data.meditation.since === 'number') save.meditation = { since: Math.min(Date.now(), data.meditation.since) };
  var al = data.album && typeof data.album === 'object' ? data.album : {};
  save.album = { monstres: {}, objets: [], paliers: [] };
  if (al.monstres && typeof al.monstres === 'object') Object.keys(al.monstres).forEach(function (k) { var n = int(al.monstres[k], 1); if (n && k.length < 12) save.album.monstres[k] = n; });
  if (Array.isArray(al.objets)) save.album.objets = al.objets.filter(function (id) { return ITEMS[id]; });
  if (Array.isArray(al.paliers)) save.album.paliers = al.paliers.filter(function (id) { return typeof id === 'string'; });
  return save;
}

// Un exemplaire du Continent tiré avec l'ancienne courbe : ses stats ramenées sur la nouvelle (même rareté, même tirage)
// Un exemplaire tiré avec une ancienne version (from) : ses stats ramenées sur la version d'aujourd'hui (même tirage)
function rescaleGear(inst, from) {
  var b = inst && ITEMS[inst.base];
  if (!b || !inst.stats || typeof inst.stats !== 'object' || !GEAR_CURVES[from]) return false;
  var ratio = 1, now = GEAR_CURVES[GEAR_VERSION], old = GEAR_CURVES[from];
  if (b.continent != null) ratio = now(b.continent) / old(b.continent);
  else if (b.legend) {
    // la terre où il est tombé : celle dont l'unité (la force d'un accessoire) colle le mieux à ses stats
    var wsum = 0, ssum = 0, unit = function (v, w) { return v === 1 ? 0.36 * (8 * w + 5) : 0.33 * GEAR_CURVES[v](w); };
    Object.keys(b.weights).forEach(function (k) { wsum += b.weights[k]; ssum += Math.max(0, inst.stats[k] || 0); });
    var u = ssum / wsum / (1 + CYCLE.loot * (+inst.plus || 0)), best = ISLAND_WORLDS;
    for (var w = ISLAND_WORLDS; w < BIOMES.length; w++) if (Math.abs(unit(from, w) - u) < Math.abs(unit(from, best) - u)) best = w;
    ratio = unit(GEAR_VERSION, best) / unit(from, best);
  }
  var rm = RARITY_MULTS[GEAR_VERSION][inst.rar], ro = RARITY_MULTS[from] && RARITY_MULTS[from][inst.rar];
  if (rm && ro && !b.legend) ratio *= rm / ro;
  if (Math.abs(ratio - 1) < 0.001) return false;
  Object.keys(inst.stats).forEach(function (k) { var v = inst.stats[k]; if (typeof v === 'number' && v > 0) inst.stats[k] = Math.max(1, Math.round(v * ratio)); });
  return true;
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
