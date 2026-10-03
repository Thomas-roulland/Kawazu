// La Voie : trois voies exclusives (Armes, Lancer, Ermite). Chacune a ses caractéristiques de départ et multiplie
// certains points de caractéristique ; elle offre trois branches de 10 dalles qui se rejoignent au sommet sur une
// dernière dalle commune, la dalle-sommet. Les dalles donnent des sorts, des caractéristiques ou des passifs.
// On compose ensuite son deck : l'attaque de base de l'arme + DECK_SIZE sorts choisis parmi ceux appris.
//
// Plus de réserve à gérer : chaque sort a un temps de relance (cd, en tours), que l'Esprit raccourcit.
// power = multiplicateur de dégâts par coup, hits = nombre de coups, anim = son animation en combat.

var DECK_SIZE = 4;

// base : les caractéristiques de départ de la voie ; main : son attribut principal (celui qui fait les dégâts) ;
// mult : ce que vaut un point réparti dans chaque caractéristique ; hp : son endurance ; armor : les dégâts qu'elle encaisse en moins
var VOIES = [
  { id: 'baton', name: 'Voie des Armes', short: 'Armes', color: '#8fce52', family: 'corps à corps',
    desc: 'Corps à corps : bâtons, katanas et masses. Des ondes qui étourdissent, des entailles qui saignent et une force de colosse.',
    base: { vitalite: 9, agilite: 6, force: 8, esprit: 4 }, main: 'force', mult: { force: 2, vitalite: 1.5 }, hp: 1.1, armor: 0.06, armorL: 0.0004, pveHp: 0.5 },
  { id: 'kunai', name: 'Voie du Lancer', short: 'Lancer', color: '#9cc7e0', family: 'distance',
    desc: 'À distance : kunaïs et shurikens d’eau. Des lancers qui ne ratent jamais, des marques, du poison et une ombre insaisissable.',
    base: { vitalite: 8, agilite: 9, force: 5, esprit: 5 }, main: 'agilite', mult: { agilite: 1.85, vitalite: 1.5 }, hp: 1.06, armor: 0, pveHp: 0.3 }, // (1,85 : ses coups sûrs, ses critiques et son esquive le rendaient trop fort en duel)
  { id: 'ermite', name: 'Voie de l’Ermite', short: 'Ermite', color: '#e0b43a', family: 'mains nues',
    desc: 'Mains nues : paumes d’énergie, coups de pied et coups de boule. L’énergie de la nature frappe, soigne et protège.',
    base: { vitalite: 8, agilite: 5, force: 3, esprit: 11 }, main: 'esprit', mult: { esprit: 2, vitalite: 1.5 }, hp: 1.05, armor: 0.05,
    lateFrom: 150, lateDmg: 0.002, lateDuel: 0.012 }
    // (au-delà du niveau 150, ses coups uniques rattrapent les sorts à coups multiples des deux autres voies : +0,2 % de dégâts
    // par niveau contre les monstres, où ses soins le portent déjà, +1,2 % en duel et à la guerre ; les Armes et le Lancer
    // ont en fin de jeu plus de PV contre les monstres, pveHp (items.js). Réglé au simulateur : duels à 48-52 % pour chaque
    // voie sur tout le jeu ; combats durs de la fin à 70-78 % pour chacune ; l'Ermite un peu plus lent, plus sûr)
];
function voieDef(id) { return VOIES.filter(function (v) { return v.id === id; })[0] || null; }
// ce que rapporte un point réparti dans une caractéristique, selon la voie (1 sans voie)
function allocMult(voie, stat) { var v = voieDef(voie); return (v && v.mult[stat]) || 1; }

// Les types d'armes : leur famille (kind : 'baton' = corps à corps, 'kunai' = distance) et leur attaque de base
var WEAPON_TYPES = {
  baton: { name: 'Bâton', plural: 'Bâtons', kind: 'baton', blurb: 'Onde de choc · 100 %' }, harpon: { name: 'Harpon', plural: 'Harpons', kind: 'baton', blurb: 'Estoc · 105 %' },
  katana: { name: 'Katana', plural: 'Katanas', kind: 'baton', blurb: 'Entaille · 90 %, critique +10 %' }, masse: { name: 'Masse', plural: 'Masses', kind: 'baton', blurb: 'Coup lourd · 110 %' },
  kunai: { name: 'Kunaï', plural: 'Kunaïs', kind: 'kunai', blurb: 'Un lancer sûr · 95 %' }, shuriken: { name: 'Shuriken', plural: 'Shurikens', kind: 'kunai', blurb: 'Deux étoiles · 2 × 50 %' },
  mains: { name: 'Mains nues', plural: 'Mains nues', kind: 'mains' }
};
// Les armes qu'une voie peut choisir (save.arme) : une fois choisie, on ne manie, ne trouve et ne voit qu'elle
var VOIE_ARMES = { baton: ['baton', 'harpon', 'katana', 'masse'], kunai: ['kunai', 'shuriken'], ermite: [] };
var ARME_PRICE = 40; // changer d'arme, au Temple
// La voie qui manie une famille d'armes
var KIND_VOIE = { baton: 'baton', kunai: 'kunai', mains: 'ermite' };

var SKILLS = [
  // attaques de base (selon le type d'arme), toujours dans le deck, sans relance
  { id: 'coup_baton', voie: 'baton', base: 'baton', name: 'Coup de bâton', cd: 0, power: 1, hits: 1, anim: 'arc', desc: 'Frappe simple : une onde grise en demi-cercle, 100 % des dégâts.' },
  { id: 'estoc', voie: 'baton', base: 'harpon', name: 'Coup d’estoc', cd: 0, power: 1.05, hits: 1, anim: 'arc', desc: 'Le harpon file tout droit : 105 % des dégâts.' },
  { id: 'entaille', voie: 'baton', base: 'katana', name: 'Entaille', cd: 0, power: 0.9, hits: 1, critBonus: 0.1, anim: 'slash', desc: 'Un coup de sabre vif : 90 % des dégâts, +10 % de chances de critique.' },
  { id: 'coup_masse', voie: 'baton', base: 'masse', name: 'Coup de masse', cd: 0, power: 1.1, hits: 1, anim: 'slam', desc: 'Lourd et puissant : 110 % des dégâts.' },
  { id: 'lancer', voie: 'kunai', base: 'kunai', name: 'Lancer de kunaï', cd: 0, power: 0.95, hits: 1, anim: 'kunai', desc: 'Un kunaï qui ne rate jamais : 95 % des dégâts.' },
  { id: 'shuriken', voie: 'kunai', base: 'shuriken', name: 'Lancer de shurikens', cd: 0, power: 0.5, hits: 2, anim: 'shuriken', desc: 'Deux étoiles tournoyantes qui ne ratent jamais : 2 × 50 % des dégâts.' },
  { id: 'frappe', voie: 'ermite', base: 'mains', name: 'Frappe du crapaud', cd: 0, power: 1.1, hits: 1, anim: 'arc', desc: 'Un coup de paume à mains nues : 110 % des dégâts.' },

  // ----- Voie des Armes -----
  // Bâton de jade
  { id: 'onde', voie: 'baton', name: 'Onde de choc', cd: 1, power: 1.5, hits: 1, anim: 'wave', desc: 'Une grande onde en demi-cercle : 150 % des dégâts.' },
  { id: 'balayage', voie: 'baton', name: 'Balayage', cd: 3, power: 1.2, hits: 1, stun: 0.5, anim: 'sweep', desc: 'Fauche les pattes : 120 % des dégâts, 50 % de chances d’étourdir un tour.' },
  { id: 'garde', voie: 'baton', name: 'Garde du roseau', cd: 4, power: 0, hits: 0, guard: 2, counter: true, desc: 'Pendant 2 tours ennemis : dégâts reçus divisés par deux, et tu ripostes à chaque coup encaissé.' },
  { id: 'tempete', voie: 'baton', name: 'Tempête de jade', cd: 5, power: 1.05, hits: 3, stun: 0.25, anim: 'wave', desc: 'Trois ondes d’affilée : 3 × 105 % des dégâts, chacune peut étourdir (25 %).' },
  // Katana
  { id: 'croix', voie: 'baton', name: 'Coupe croisée', cd: 2, power: 0.7, hits: 2, bleed: 3, anim: 'xslash', desc: 'Deux entailles en croix : 2 × 70 % des dégâts, et l’ennemi saigne 3 tours.' },
  { id: 'iai', voie: 'baton', name: 'Iaï éclair', cd: 3, power: 2, hits: 1, critBonus: 0.5, anim: 'dash', desc: 'Dégaine et traverse l’ennemi en un éclair : 200 % des dégâts, +50 % de chances de critique.' },
  { id: 'danse', voie: 'baton', name: 'Danse des lames', cd: 4, power: 0.72, hits: 4, bleed: 3, anim: 'slashes', desc: 'Quatre entailles tourbillonnantes : 4 × 72 % des dégâts, et l’ennemi saigne.' },
  { id: 'lune', voie: 'baton', name: 'Lune tranchante', cd: 5, power: 3, hits: 1, pierce: true, bleed: 3, anim: 'crescent', desc: 'Un croissant de lune géant fend l’air : 300 % des dégâts, ignore la garde et l’armure, saignement.' },
  // Colosse
  { id: 'fracas', voie: 'baton', name: 'Fracas', cd: 2, power: 1.5, hits: 1, stun: 0.25, anim: 'slam', desc: 'Un bond, puis l’arme s’abat : 150 % des dégâts, 25 % de chances d’étourdir.' },
  { id: 'cri', voie: 'baton', name: 'Cri de guerre', cd: 5, power: 0, hits: 0, buff: 3, weaken: 2, anim: 'roar', desc: '+40 % de dégâts pendant 3 tours, et l’ennemi effrayé fait 30 % de dégâts en moins pendant 2 tours.' },
  { id: 'moulinet', voie: 'baton', name: 'Moulinet', cd: 3, power: 0.65, hits: 4, anim: 'spin', desc: 'L’arme tournoie autour de toi : 4 × 65 % des dégâts.' },
  { id: 'seisme', voie: 'baton', name: 'Séisme', cd: 5, power: 3.2, hits: 1, stun: 0.5, anim: 'quake', desc: 'Un saut immense et une chute qui fend la terre : 320 % des dégâts, 50 % de chances d’étourdir.' },
  // la dalle-sommet
  { id: 'acier', voie: 'baton', name: 'Tempête d’acier', cd: 6, power: 0.85, hits: 6, bleed: 3, anim: 'storm', desc: 'Toutes tes armes à la fois : 6 × 85 % des dégâts, et l’ennemi saigne.' },

  // ----- Voie du Lancer -----
  // Kunaï
  { id: 'double', voie: 'kunai', name: 'Double lancer', cd: 1, power: 0.75, hits: 2, anim: 'kunai', desc: 'Deux lancers qui ne ratent jamais : 2 × 75 % des dégâts.' },
  { id: 'eventail', voie: 'kunai', name: 'Éventail', cd: 3, power: 0.75, hits: 3, anim: 'fan', desc: 'Trois lancers en éventail : 3 × 75 % des dégâts.' },
  { id: 'marque', voie: 'kunai', name: 'Lancer marqueur', cd: 4, power: 0.8, hits: 1, mark: 3, anim: 'marker', desc: '80 % des dégâts, et le parchemin marque l’ennemi : il subit +30 % de dégâts pendant 3 tours.' },
  { id: 'pluie', voie: 'kunai', name: 'Pluie de lames', cd: 5, power: 0.6, hits: 6, anim: 'rain', desc: 'Six lames tombées du ciel : 6 × 60 % des dégâts.' },
  // Shuriken d'eau
  { id: 'mizu', voie: 'kunai', name: 'Shuriken d’eau', cd: 2, power: 1.5, hits: 1, pierce: true, anim: 'water', desc: 'Une étoile d’eau tournoyante : 150 % des dégâts, traverse la garde et l’armure.' },
  { id: 'prison', voie: 'kunai', name: 'Prison d’eau', cd: 4, power: 0.8, hits: 1, stun: 0.6, anim: 'bubble', desc: 'Enferme l’ennemi dans une bulle : 80 % des dégâts, 60 % de chances de l’étourdir.' },
  { id: 'fuma', voie: 'kunai', name: 'Shuriken géant', cd: 4, power: 0.85, hits: 3, anim: 'fuma', desc: 'Un grand shuriken qui fait l’aller-retour : 3 × 85 % des dégâts.' },
  { id: 'tourbillon', voie: 'kunai', name: 'Tourbillon d’eau', cd: 5, power: 0.65, hits: 5, weaken: 2, anim: 'vortex', desc: 'Cinq shurikens d’eau tournent autour de l’ennemi : 5 × 65 % des dégâts ; trempé, il fait 30 % de dégâts en moins 2 tours.' },
  // Ombre
  { id: 'aiguille', voie: 'kunai', name: 'Aiguille empoisonnée', cd: 2, power: 0.4, hits: 1, poison: 4, anim: 'needle', desc: '40 % des dégâts et un poison tenace pendant 4 tours.' },
  { id: 'ombre', voie: 'kunai', name: 'Pas de l’ombre', cd: 4, power: 0, hits: 0, shadow: true, desc: 'Tu esquives à coup sûr la prochaine attaque, et ton coup suivant est critique.' },
  { id: 'nuage', voie: 'kunai', name: 'Nuage toxique', cd: 4, power: 0.3, hits: 1, poison: 5, weaken: 2, anim: 'cloud', desc: '30 % des dégâts, poison pendant 5 tours, et l’ennemi étouffé fait 30 % de dégâts en moins 2 tours.' },
  { id: 'clone', voie: 'kunai', name: 'Clone d’ombre', cd: 5, power: 0.75, hits: 4, shadowAfter: true, anim: 'clone', desc: 'Ton ombre surgit derrière l’ennemi : 4 × 75 % des dégâts, puis tu esquives la prochaine attaque.' },
  // la dalle-sommet
  { id: 'deluge', voie: 'kunai', name: 'Déluge de lames', cd: 6, power: 0.45, hits: 8, mark: 2, anim: 'deluge', desc: 'Les lames pleuvent du ciel : 8 × 45 % des dégâts, et l’ennemi est marqué.' },

  // ----- Voie de l'Ermite -----
  // Paume
  { id: 'paume', voie: 'ermite', name: 'Paume de l’ermite', cd: 1, power: 1.6, hits: 1, anim: 'palm', desc: 'Un coup de paume chargé d’énergie : 160 % des dégâts.' },
  { id: 'coassement', voie: 'ermite', name: 'Coassement du sage', cd: 4, power: 1.45, hits: 1, stun: 0.5, anim: 'roar', desc: 'Un cri qui fait trembler l’air : 145 % des dégâts, 50 % de chances d’étourdir.' },
  { id: 'grande_paume', voie: 'ermite', name: 'Paume du crapaud géant', cd: 4, power: 2.2, hits: 1, pierce: true, anim: 'bigpalm', desc: 'Une paume d’énergie géante s’abat : 220 % des dégâts, ignore la garde et l’armure.' },
  { id: 'orbe', voie: 'ermite', name: 'Orbe du marais', cd: 5, power: 3, hits: 1, anim: 'orb', desc: 'Une sphère d’énergie tournoyante, enfoncée à bout de bras : 300 % des dégâts.' },
  // Pieds et tête
  { id: 'pied', voie: 'ermite', name: 'Coup de pied', cd: 1, power: 1.5, hits: 1, anim: 'kick', desc: 'Un coup de pied sauté : 150 % des dégâts.' },
  { id: 'boule', voie: 'ermite', name: 'Coup de boule', cd: 3, power: 1.75, hits: 1, stun: 0.5, anim: 'headbutt', desc: 'Tête la première : 175 % des dégâts, 50 % de chances d’étourdir.' },
  { id: 'retourne', voie: 'ermite', name: 'Coup de pied retourné', cd: 3, power: 0.9, hits: 2, anim: 'spinkick', desc: 'Une vrille en l’air, deux talons : 2 × 90 % des dégâts.' },
  { id: 'chute', voie: 'ermite', name: 'Chute du crapaud', cd: 5, power: 2.8, hits: 1, stun: 0.4, anim: 'jump', desc: 'Un bond jusqu’au ciel, puis un coup de boule en piqué : 280 % des dégâts, 40 % de chances d’étourdir.' },
  // Crapaud sage
  { id: 'langue', voie: 'ermite', name: 'Langue fouet', cd: 2, power: 1.3, hits: 1, drain: 0.5, anim: 'tongue', desc: '130 % des dégâts, et la langue te rend la moitié en PV.' },
  { id: 'respiration', voie: 'ermite', name: 'Respiration du marais', cd: 4, power: 0, hits: 0, heal: 0.3, cleanse: true, desc: 'Soigne 30 % des PV maximum et chasse poison, saignement et étourdissement.' },
  { id: 'peau', voie: 'ermite', name: 'Peau de rosée', cd: 5, power: 0, hits: 0, buff: 3, desc: '+40 % de dégâts pendant 3 tours.' },
  { id: 'huile', voie: 'ermite', name: 'Huile du mont Kaeru', cd: 6, power: 0, hits: 0, heal: 0.25, guard: 2, desc: 'Soigne 25 % des PV maximum et divise par deux les dégâts reçus pendant 2 tours ennemis.' },
  // la dalle-sommet
  { id: 'kumite', voie: 'ermite', name: 'Kumite du Sage', cd: 5, power: 0.7, hits: 5, anim: 'combo', desc: 'Paume, pied, tête, pied retourné, paume : 5 coups à 70 % des dégâts.' }
];

// ---------- L'arbre : 3 branches de 10 dalles par voie, puis la dalle-sommet ----------
// Une dalle s'apprend quand la précédente de la même branche est apprise ; l'étape n coûte n points et demande
// un niveau. Aux étapes 1, 4, 7 et 10 : un sort ; 2, 5 et 8 : une caractéristique ; 3, 6 et 9 : un passif.
// La dalle-sommet s'ouvre dès qu'une branche est terminée : un sort ultime et un grand passif.
var MAX_LEVEL = 300;
var STEPS = 10;
var BRANCHES = 3;
var STEP_LEVEL = [0, 1, 3, 6, 10, 16, 24, 34, 46, 60, 75]; // niveau requis pour l'étape n
var SUMMIT = { level: 90, cost: 15 };
var STAT_STEP = { 2: 3, 5: 5, 8: 8 };                      // gain des étapes de caractéristique
var ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
var STAT_WORD = { force: 'Force', vitalite: 'Vitalité', agilite: 'Agilité', esprit: 'Esprit' };

var PATHS = {
  baton: [
    { name: 'Onde de jade', tag: 'ondes, contrôle', skills: ['onde', 'balayage', 'garde', 'tempete'], stats: ['vitalite', 'force', 'vitalite'],
      passives: [['Roseau qui plie', { stunChance: 0.05, hpMult: 0.04 }], ['Garde de fer', { dmgReduce: 0.06 }], ['Contre-attaque', { riposte: 0.15 }]] },
    { name: 'Lames', tag: 'saignement, critiques', skills: ['croix', 'iai', 'danse', 'lune'], stats: ['force', 'agilite', 'force'],
      passives: [['Fil du sabre', { crit: 0.05, bleedMult: 0.25 }], ['Lame affûtée', { critDmg: 0.3 }], ['Coup de grâce', { execute: 0.4 }]] },
    { name: 'Colosse', tag: 'masse, force brute', skills: ['fracas', 'cri', 'moulinet', 'seisme'], stats: ['vitalite', 'force', 'vitalite'],
      passives: [['Croissance', { size: 0.05, hpMult: 0.06 }], ['Peau de pierre', { shield: 0.12 }], ['Colosse', { size: 0.08, hpMult: 0.08, dmgMult: 0.06 }]] }
  ],
  kunai: [
    { name: 'Rafales', tag: 'lancers en rafale, précision', skills: ['double', 'eventail', 'marque', 'pluie'], stats: ['agilite', 'vitalite', 'agilite'],
      passives: [['Œil du héron', { crit: 0.06 }], ['Lancer parfait', { multiHit: 0.2 }], ['Rafale', { critDmg: 0.3 }]] },
    { name: 'Shuriken d’eau', tag: 'eau, contrôle', skills: ['mizu', 'prison', 'fuma', 'tourbillon'], stats: ['agilite', 'vitalite', 'esprit'],
      passives: [['Eau vive', { spellMult: 0.1 }], ['Marée montante', { regenHp: 0.02 }], ['Courant rapide', { flow: 0.25 }]] },
    { name: 'Ombre', tag: 'poison, esquive', skills: ['aiguille', 'ombre', 'nuage', 'clone'], stats: ['agilite', 'vitalite', 'agilite'],
      passives: [['Pas de loup', { dodge: 0.04 }], ['Venin des marais', { poisonMult: 0.5 }], ['Insaisissable', { dodge: 0.05, crit: 0.03 }]] }
  ],
  ermite: [
    { name: 'Paume', tag: 'énergie', skills: ['paume', 'coassement', 'grande_paume', 'orbe'], stats: ['esprit', 'vitalite', 'esprit'],
      passives: [['Paume chargée', { spellMult: 0.1 }], ['Énergie naturelle', { flow: 0.2 }], ['Sagesse', { spellMult: 0.15 }]] },
    { name: 'Pieds et tête', tag: 'coups de pied, coups de boule', skills: ['pied', 'boule', 'retourne', 'chute'], stats: ['esprit', 'vitalite', 'force'],
      passives: [['Front de pierre', { stunChance: 0.05, hpMult: 0.04 }], ['Enchaînement', { multiHit: 0.2 }], ['Corps d’acier', { dmgReduce: 0.06, riposte: 0.1 }]] },
    { name: 'Crapaud sage', tag: 'soins, vol de vie', skills: ['langue', 'respiration', 'peau', 'huile'], stats: ['vitalite', 'esprit', 'vitalite'],
      passives: [['Peau épaisse', { dmgReduce: 0.05 }], ['Sang du crapaud', { lifesteal: 0.06 }], ['Croissance du sage', { size: 0.08, hpMult: 0.1 }]] }
  ]
};
var SUMMITS = {
  baton: { name: 'Maître d’armes', skill: 'acier', passive: { dmgMult: 0.2, crit: 0.08 } },
  kunai: { name: 'Œil du tireur', skill: 'deluge', passive: { crit: 0.08, critDmg: 0.2 } },
  ermite: { name: 'Mode Sage', skill: 'kumite', passive: { dmgMult: 0.12, hpMult: 0.1, regenHp: 0.02 } }
};

var PASSIVE_TEXT = {
  hpMult: function (v) { return '+' + Math.round(v * 100) + ' % de PV maximum'; },
  size: function (v) { return 'la grenouille grandit (+' + Math.round(v * 100) + ' %)'; },
  dmgMult: function (v) { return '+' + Math.round(v * 100) + ' % de dégâts'; },
  crit: function (v) { return '+' + Math.round(v * 100) + ' % de chances de critique'; },
  critDmg: function (v) { return 'critiques +' + Math.round(v * 100) + ' % plus forts'; },
  dodge: function (v) { return '+' + (Math.round(v * 1000) / 10) + ' % d’esquive'; },
  riposte: function (v) { return Math.round(v * 100) + ' % de chances de riposter quand on te frappe'; },
  dmgReduce: function (v) { return '−' + Math.round(v * 100) + ' % de dégâts reçus'; },
  poisonMult: function (v) { return 'le poison fait +' + Math.round(v * 100) + ' % de dégâts'; },
  bleedMult: function (v) { return 'le saignement fait +' + Math.round(v * 100) + ' % de dégâts'; },
  stunChance: function (v) { return '+' + Math.round(v * 100) + ' % de chances d’étourdir'; },
  execute: function (v) { return '+' + Math.round(v * 100) + ' % de dégâts contre un ennemi sous 30 % de PV'; },
  shield: function (v) { return 'un bouclier de ' + Math.round(v * 100) + ' % des PV au début du combat'; },
  multiHit: function (v) { return Math.round(v * 100) + ' % de chances de refrapper après un coup simple'; },
  spellMult: function (v) { return '+' + Math.round(v * 100) + ' % de puissance des sorts'; },
  regenHp: function (v) { return 'récupère ' + Math.round(v * 100) + ' % des PV à chaque tour'; },
  flow: function (v) { return Math.round(v * 100) + ' % de chances par tour qu’un tour de relance saute'; },
  lifesteal: function (v) { return 'vole ' + Math.round(v * 100) + ' % des dégâts infligés en PV'; }
};
var PASSIVE_KEYS = Object.keys(PASSIVE_TEXT);
function emptyPassives() { var o = {}; PASSIVE_KEYS.forEach(function (k) { o[k] = 0; }); return o; }
function passiveDesc(p) { var t = Object.keys(p).map(function (k) { return PASSIVE_TEXT[k](p[k]); }).join(', ') + '.'; return t.charAt(0).toUpperCase() + t.slice(1); }

// Les identifiants : « b:0.4 » = voie Armes, branche 0, étape 4 ; « b:S » = la dalle-sommet de la voie
var TREE = [];
VOIES.forEach(function (v) {
  var L = v.id[0];
  PATHS[v.id].forEach(function (path, pi) {
    var si = 0, ti = 0, pa = 0;
    for (var n = 1; n <= STEPS; n++) {
      var node = { id: L + ':' + pi + '.' + n, voie: v.id, path: pi, step: n, cost: n, level: STEP_LEVEL[n], req: n > 1 ? [L + ':' + pi + '.' + (n - 1)] : [] };
      if (n % 3 === 1) { node.type = 'skill'; node.skill = path.skills[si++]; }
      else if (n % 3 === 2) {
        var stat = path.stats[ti++];
        node.type = 'stat'; node.stats = {}; node.stats[stat] = STAT_STEP[n];
        node.name = STAT_WORD[stat] + ' ' + ROMAN[n]; node.desc = '+' + STAT_STEP[n] + ' ' + STAT_WORD[stat] + '.';
      } else {
        var ps = path.passives[pa++];
        node.type = 'passive'; node.passive = ps[1]; node.name = ps[0]; node.desc = passiveDesc(ps[1]);
      }
      TREE.push(node);
    }
  });
  var sm = SUMMITS[v.id];
  TREE.push({ id: L + ':S', voie: v.id, path: -1, step: STEPS + 1, cost: SUMMIT.cost, level: SUMMIT.level, summit: true, type: 'summit',
    reqAny: [0, 1, 2].map(function (pi) { return L + ':' + pi + '.' + STEPS; }), req: [],
    skill: sm.skill, passive: sm.passive, name: sm.name, desc: passiveDesc(sm.passive) });
});

function skillById(id) { return SKILLS.filter(function (s) { return s.id === id; })[0]; }
function nodeById(id) { return TREE.filter(function (n) { return n.id === id; })[0]; }
function summitOf(voie) { return nodeById(voie[0] + ':S'); }
function nodeName(n) { return n.type === 'skill' ? skillById(n.skill).name : n.name; }
function nodeDesc(n) { return n.type === 'skill' ? skillById(n.skill).desc : (n.type === 'summit' ? 'Sort ultime : ' + skillById(n.skill).name + '. ' + skillById(n.skill).desc + ' Passif : ' + n.desc : n.desc); }
function hasNode(save, id) { return save.tree.indexOf(id) >= 0; }
function pathName(voie, pi) { return pi < 0 ? 'Sommet' : PATHS[voie][pi].name; }

// Les trois voies sont exclusives : on en choisit une pour de bon (save.voie).
// Pour en changer, il faut tout oublier (Thé de l'oubli, ou « Changer de voie » au Temple).
function chosenVoie(save) { return save.voie || null; }
function voieClosed(save, n) { var v = chosenVoie(save); return !!v && n.voie !== v; }
function treeCost(save) { return save.tree.reduce(function (s, id) { var n = nodeById(id); return s + (n ? n.cost : 0); }, 0); }

// Pourquoi une dalle ne s'apprend pas encore (chaîne vide = elle s'apprend)
function learnBlock(save, n) {
  if (hasNode(save, n.id)) return 'Appris.';
  if (!chosenVoie(save)) return 'Choisis d’abord ta voie.';
  if (voieClosed(save, n)) return 'Voie fermée.';
  if (n.req.length && !hasNode(save, n.req[0])) return 'Apprends d’abord l’étape précédente de cette branche.';
  if (n.reqAny && !n.reqAny.some(function (id) { return hasNode(save, id); })) return 'Termine d’abord l’une des trois branches.';
  if (save.level < n.level) return 'Niveau ' + n.level + ' requis.';
  if (save.skillPoints < n.cost) return 'Il te faut ' + n.cost + ' point' + (n.cost > 1 ? 's' : '') + ' de voie.';
  return '';
}
function canLearnNode(save, n) { return !learnBlock(save, n); }

// Bonus de l'arbre : caractéristiques ajoutées et passifs de combat
function treeBonuses(save) {
  var out = { stats: {}, passives: emptyPassives() };
  (save.tree || []).forEach(function (id) {
    var n = nodeById(id);
    if (!n) return;
    if (n.stats) Object.keys(n.stats).forEach(function (k) { out.stats[k] = (out.stats[k] || 0) + n.stats[k]; });
    if (n.passive) Object.keys(n.passive).forEach(function (k) { out.passives[k] += n.passive[k]; });
  });
  return out;
}

// Sorts appris (hors attaques de base)
function learnedSkills(save) {
  return save.tree.map(nodeById).filter(function (n) { return n && n.skill; }).map(function (n) { return skillById(n.skill); });
}

// Deck de combat : l'attaque de base de l'arme + les sorts choisis. Un sort ne s'utilise qu'avec les armes de sa voie.
function weaponType(weapon) { return weapon.wtype || weapon.kind; }
function skillUsable(s, weapon) { return KIND_VOIE[weapon.kind] === s.voie; }
function baseSkill(weapon) { return SKILLS.filter(function (s) { return s.base === weaponType(weapon); })[0] || SKILLS[0]; }
function deckSkills(save, weapon) {
  var known = learnedSkills(save).map(function (s) { return s.id; });
  var woke = save.awakened || [];
  return [baseSkill(weapon)].concat(save.deck.filter(function (id) { return known.indexOf(id) >= 0; }).slice(0, DECK_SIZE).map(skillById)
    .filter(function (s) { return skillUsable(s, weapon); }).map(function (s) { return woke.indexOf(s.id) >= 0 ? awaken(s) : s; }));
}
// ---------- Les Maîtrises : une fois toutes les dalles de sa voie apprises (les trois branches et le sommet) ----------
// Les points de voie suivants vont dans quatre maîtrises sans fin ; le rang r d'une maîtrise coûte 1 + r / 4 points
// (1 point pour les quatre premiers, 2 pour les quatre suivants…). Elles restent pour toujours, même après une mutation.
// Tous les 10 rangs (en tout), un sort du deck peut s'éveiller : un coup de plus s'il frappe plusieurs fois, sinon un
// tour de relance en moins (ou +30 % de puissance s'il n'en a presque pas) ; il porte alors une étoile (✦).
var MASTERIES = [
  { id: 'force', name: 'Force', desc: '+2 % de dégâts par rang', dmg: 0.02, color: '#e0603a' },
  { id: 'carapace', name: 'Carapace', desc: '+2 % de PV par rang', hp: 0.02, color: '#4ab06a' },
  { id: 'instinct', name: 'Instinct', desc: '+1 % de critique par rang', crit: 0.01, color: '#e0b43a' },
  { id: 'souffle', name: 'Souffle', desc: '+3 % de puissance des sorts par rang', spell: 0.03, color: '#8a6af0' }
];
var AWAKEN_EVERY = 10;
function masteryCost(rank) { return 1 + Math.floor(rank / 4); }
function treeComplete(save) {
  var v = chosenVoie(save);
  return !!v && TREE.every(function (n) { return n.voie !== v || save.tree.indexOf(n.id) >= 0; });
}
function masteryRanks(save) { var m = save.mastery || {}; return MASTERIES.reduce(function (s, x) { return s + (m[x.id] || 0); }, 0); }
function masteryBonus(save) {
  var m = (save && save.mastery) || {}, b = { dmg: 0, hp: 0, crit: 0, spell: 0 };
  MASTERIES.forEach(function (x) { Object.keys(b).forEach(function (k) { if (x[k]) b[k] += x[k] * (m[x.id] || 0); }); });
  return b;
}
function awakeningsAllowed(save) { return Math.floor(masteryRanks(save) / AWAKEN_EVERY); }
// un sort éveillé : la même chose, en mieux (et marqué d'une étoile)
function awaken(s) {
  var a = Object.assign({}, s, { awakened: true, name: s.name + ' ✦' });
  if (s.hits > 1) a.hits = s.hits + 1;
  else if (s.cd >= 2) a.cd = s.cd - 1;
  else a.power = s.power * 1.3;
  return a;
}
function awakenDesc(s) { return s.hits > 1 ? 'un coup de plus (' + (s.hits + 1) + ' au lieu de ' + s.hits + ')' : (s.cd >= 2 ? 'un tour de relance en moins (' + (s.cd - 1) + ' au lieu de ' + s.cd + ')' : '+30 % de puissance'); }

// Les meilleurs sorts d'une liste, pour une grenouille jouée par l'ordinateur (les sages de la tour) : les dégâts par
// tour d'abord (étourdissement, saignement, poison, marque compris), puis un soin, un renfort ou une garde
function skillValue(s) {
  return s.power * s.hits * (1 + (s.stun || 0) * 0.4 + (s.bleed || s.poison ? 0.3 : 0) + (s.mark ? 0.4 : 0) + (s.weaken ? 0.25 : 0)) / Math.max(1, s.cd) * 3 +
    (s.heal ? 1.6 : 0) + (s.buff ? 1.2 : 0) + (s.guard ? 0.8 : 0) + (s.shadow ? 0.5 : 0);
}
function bestDeck(ids) { return ids.map(skillById).sort(function (a, b) { return skillValue(b) - skillValue(a); }).slice(0, DECK_SIZE).map(function (s) { return s.id; }); }
// Le temps de relance réel d'un sort, raccourci par l'Esprit (cdr), jamais sous 1 tour ; un soin ne gagne qu'un tour au plus
function skillCd(s, cdr) { return s.cd ? Math.max(s.heal ? s.cd - 1 : 1, s.cd - (cdr || 0)) : 0; }
