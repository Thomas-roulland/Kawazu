// Compétences : trois voies exclusives (Bâton, Kunaï, Ermite), chacune faite de 5 petits chemins de 10 étapes.
// Les étapes donnent des caractéristiques, des passifs, ou l'un des 6 sorts de la voie. On compose ensuite son deck :
// l'attaque de base de l'arme + DECK_SIZE sorts choisis parmi ceux appris.
//
// Compétences : cost = Souffle, cd = tours de recharge, power = multiplicateur de dégâts par coup, hits = nombre de coups.

var DECK_SIZE = 3;

var VOIES = [
  { id: 'baton', name: 'Voie du Bâton', short: 'Bâton', color: '#8fce52', desc: 'Corps à corps : ondes de choc, étourdissements et une garde solide.' },
  { id: 'kunai', name: 'Voie du Kunaï', short: 'Kunaï', color: '#9cc7e0', desc: 'Distance : critiques, poison, esquive et rafales de kunaïs.' },
  { id: 'ermite', name: 'Force de l’Ermite', short: 'Ermite', color: '#e0b43a', desc: 'Mains nues : souffle, soins, vol de vie et coups dévastateurs.' }
];

var SKILLS = [
  // attaques de base (selon l'arme), toujours dans le deck
  { id: 'coup_baton', voie: 'baton', base: 'baton', name: 'Coup de bâton', cost: 0, cd: 0, power: 1, hits: 1, desc: 'Frappe simple avec l’onde grise du bâton.' },
  { id: 'frappe', voie: 'ermite', base: 'mains', name: 'Frappe du crapaud', cost: 0, cd: 0, power: 1.05, hits: 1, desc: 'Mode Ermite : un coup de paume à mains nues, 105 % des dégâts.' },
  { id: 'lancer', voie: 'kunai', base: 'kunai', name: 'Lancer de kunaï', cost: 0, cd: 0, power: 0.85, hits: 1, desc: 'Un kunaï qui ne rate jamais : 85 % des dégâts.' },
  // Bâton
  { id: 'onde', voie: 'baton', name: 'Onde de choc', cost: 2, cd: 0, power: 1.6, hits: 1, desc: 'Une grande onde en demi-cercle : 160 % des dégâts.' },
  { id: 'balayage', voie: 'baton', name: 'Balayage', cost: 2, cd: 3, power: 1.1, hits: 1, stun: 0.6, desc: '110 % des dégâts, 60 % de chances d’étourdir un tour.' },
  { id: 'garde', voie: 'baton', name: 'Garde du roseau', cost: 1, cd: 4, power: 0, hits: 0, guard: 2, desc: 'Divise par deux les dégâts reçus pendant 2 tours.' },
  { id: 'moulinet', voie: 'baton', name: 'Moulinet', cost: 3, cd: 3, power: 0.6, hits: 4, desc: 'Le bâton tournoie : 4 × 60 % des dégâts.' },
  { id: 'fracas', voie: 'baton', name: 'Fracas de la terre', cost: 4, cd: 4, power: 2.2, hits: 1, stun: 0.35, desc: '220 % des dégâts, 35 % de chances d’étourdir.' },
  { id: 'tempete', voie: 'baton', name: 'Tempête de jade', cost: 5, cd: 4, power: 0.85, hits: 3, desc: 'Trois ondes d’affilée : 3 × 85 % des dégâts.' },
  // Kunaï
  { id: 'double', voie: 'kunai', name: 'Double lancer', cost: 2, cd: 0, power: 0.7, hits: 2, desc: 'Deux kunaïs qui ne ratent jamais : 2 × 70 %.' },
  { id: 'poison', voie: 'kunai', name: 'Kunaï empoisonné', cost: 2, cd: 3, power: 0.7, hits: 1, poison: 3, desc: '70 % des dégâts puis poison pendant 3 tours.' },
  { id: 'ombre', voie: 'kunai', name: 'Pas de l’ombre', cost: 1, cd: 4, power: 0, hits: 0, shadow: true, desc: 'Esquive à coup sûr la prochaine attaque ; le coup suivant est critique.' },
  { id: 'aiguille', voie: 'kunai', name: 'Aiguille empoisonnée', cost: 1, cd: 2, power: 0.4, hits: 1, poison: 4, desc: '40 % des dégâts et un poison tenace pendant 4 tours.' },
  { id: 'eventail', voie: 'kunai', name: 'Éventail de kunaïs', cost: 3, cd: 2, power: 0.55, hits: 3, desc: 'Trois kunaïs en éventail : 3 × 55 % des dégâts.' },
  { id: 'pluie', voie: 'kunai', name: 'Pluie de kunaïs', cost: 5, cd: 4, power: 0.5, hits: 5, desc: 'Cinq kunaïs d’un coup : 5 × 50 % des dégâts.' },
  // Ermite
  { id: 'paume', voie: 'ermite', name: 'Paume de l’ermite', cost: 1, cd: 0, power: 1.25, hits: 1, desc: 'Un coup de paume chargé de souffle : 125 % des dégâts.' },
  { id: 'langue', voie: 'ermite', name: 'Langue fouet', cost: 2, cd: 2, power: 1, hits: 1, drain: 0.5, desc: '100 % des dégâts et rend la moitié en PV.' },
  { id: 'peau', voie: 'ermite', name: 'Peau de rosée', cost: 2, cd: 5, power: 0, hits: 0, buff: 3, desc: '+40 % de dégâts pendant 3 tours.' },
  { id: 'respiration', voie: 'ermite', name: 'Respiration du marais', cost: 1, cd: 4, power: 0, hits: 0, heal: 0.3, desc: 'Soigne 30 % des PV maximum.' },
  { id: 'coassement', voie: 'ermite', name: 'Coassement du sage', cost: 3, cd: 4, power: 1.4, hits: 1, stun: 0.7, desc: 'Un cri qui fait trembler l’air : 140 % des dégâts, 70 % de chances d’étourdir.' },
  { id: 'saut', voie: 'ermite', name: 'Saut du sage', cost: 6, cd: 5, power: 2.8, hits: 1, desc: 'Un bond jusqu’au ciel puis une chute écrasante : 280 % des dégâts.' }
];

// L'arbre : dans chaque voie, 5 petits chemins de 10 étapes. Une étape s'apprend quand la précédente du même
// chemin est apprise ; plus on avance, plus elle coûte cher (l'étape n coûte n points) et plus elle demande de niveau.
// Tout prendre coûterait 5 × 55 = 275 points pour 199 gagnés d'ici le niveau 200 : il faut choisir.
// type : stat (caractéristique), passive (bonus de combat) ou skill (un des 6 sorts de la voie).
var MAX_LEVEL = 200;
var STEPS = 10;
var STEP_LEVEL = [0, 1, 3, 8, 15, 25, 38, 55, 75, 100, 130]; // niveau requis pour l'étape n
var STAT_RAMP = [0, 1, 1, 2, 2, 2, 3, 3, 3, 4, 5];          // gain d'une étape de caractéristique
var ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
var STAT_WORD = { force: 'Force', vitalite: 'Vitalité', agilite: 'Agilité', souffle: 'Souffle' };

// Un chemin : son nom, et ce que donne chacune de ses 10 étapes
var PATHS = {
  baton: [
    { name: 'Force du roseau', stat: 'force' },
    { name: 'Écorce', stat: 'vitalite' },
    { name: 'Croissance', grow: true },
    { name: 'Techniques du bâton', skills: { 1: 'onde', 3: 'balayage', 5: 'garde', 7: 'moulinet', 9: 'fracas', 10: 'tempete' }, between: { dmgMult: 0.05 }, betweenName: 'Maîtrise du bâton' },
    { name: 'Voie du guerrier', steps: function (n) { return n % 2 ? { riposte: 0.04 } : { dmgReduce: 0.02 }; }, stepName: function (n) { return n % 2 ? 'Contre-attaque' : 'Garde de fer'; } }
  ],
  kunai: [
    { name: 'Agilité', stat: 'agilite' },
    { name: 'Force de lancer', stat: 'force' },
    { name: 'Œil du héron', steps: function () { return { crit: 0.02 }; }, stepName: function () { return 'Œil du héron'; } },
    { name: 'Techniques du kunaï', skills: { 1: 'double', 3: 'aiguille', 5: 'poison', 7: 'ombre', 9: 'eventail', 10: 'pluie' }, between: { poisonMult: 0.15, dmgMult: 0.03 }, betweenName: 'Venin des marais' },
    { name: 'Pas de l’ombre', steps: function () { return { dodge: 0.015 }; }, stepName: function () { return 'Pas de l’ombre'; } }
  ],
  ermite: [
    { name: 'Souffle', stat: 'souffle' },
    { name: 'Vitalité du crapaud', stat: 'vitalite' },
    { name: 'Croissance du sage', grow: true },
    { name: 'Techniques de l’ermite', skills: { 1: 'paume', 3: 'langue', 5: 'respiration', 7: 'peau', 9: 'coassement', 10: 'saut' }, between: { dmgMult: 0.05 }, betweenName: 'Paume chargée' },
    { name: 'Méditation', steps: function (n) { return n % 5 === 0 ? { regen: 1 } : { dmgReduce: 0.02 }; }, stepName: function (n) { return n % 5 === 0 ? 'Souffle profond' : 'Peau épaisse'; } }
  ]
};
var PASSIVE_TEXT = {
  hpMult: function (v) { return '+' + Math.round(v * 100) + ' % de PV maximum'; },
  size: function (v) { return 'la grenouille grandit (+' + Math.round(v * 100) + ' %)'; },
  dmgMult: function (v) { return '+' + Math.round(v * 100) + ' % de dégâts'; },
  crit: function (v) { return '+' + Math.round(v * 100) + ' % de critique'; },
  dodge: function (v) { return '+' + (Math.round(v * 1000) / 10) + ' % d’esquive'; },
  riposte: function (v) { return '+' + Math.round(v * 100) + ' % de chances de riposter'; },
  dmgReduce: function (v) { return '−' + Math.round(v * 100) + ' % de dégâts reçus'; },
  regen: function (v) { return '+' + v + ' Souffle récupéré par tour'; },
  poisonMult: function (v) { return 'le poison fait +' + Math.round(v * 100) + ' % de dégâts'; }
};
function passiveDesc(p) { return Object.keys(p).map(function (k) { return PASSIVE_TEXT[k](p[k]); }).join(', ') + '.'; }

var TREE = [];
VOIES.forEach(function (v) {
  PATHS[v.id].forEach(function (path, pi) {
    for (var n = 1; n <= STEPS; n++) {
      var node = { id: v.id[0] + pi + '-' + n, voie: v.id, path: pi, step: n, cost: n, level: STEP_LEVEL[n], req: n > 1 ? [v.id[0] + pi + '-' + (n - 1)] : [] };
      if (path.stat) {
        node.type = 'stat'; node.stats = {}; node.stats[path.stat] = STAT_RAMP[n];
        node.name = path.name + ' ' + ROMAN[n]; node.desc = '+' + STAT_RAMP[n] + ' ' + STAT_WORD[path.stat] + '.';
      } else if (path.grow) {
        node.type = 'passive'; node.passive = { size: 0.05, hpMult: 0.03 };
        node.name = path.name + ' ' + ROMAN[n]; node.desc = 'Ta grenouille grandit : +5 % de taille et +3 % de PV maximum.';
      } else if (path.skills && path.skills[n]) {
        node.type = 'skill'; node.skill = path.skills[n];
      } else {
        node.type = 'passive'; node.passive = path.skills ? path.between : path.steps(n);
        node.name = (path.skills ? path.betweenName : path.stepName(n)) + ' ' + ROMAN[n]; node.desc = passiveDesc(node.passive).replace(/^./, function (ch) { return ch.toUpperCase(); });
      }
      TREE.push(node);
    }
  });
});

function skillById(id) { return SKILLS.filter(function (s) { return s.id === id; })[0]; }
function nodeById(id) { return TREE.filter(function (n) { return n.id === id; })[0]; }
function nodeName(n) { return n.type === 'skill' ? skillById(n.skill).name : n.name; }
function nodeDesc(n) { return n.type === 'skill' ? skillById(n.skill).desc : n.desc; }
function hasNode(save, id) { return save.tree.indexOf(id) >= 0; }
function pathName(voie, pi) { return PATHS[voie][pi].name; }

// Les trois voies sont exclusives : on en choisit une pour de bon (save.voie).
// Pour en changer, il faut tout oublier (Thé de l'oubli, ou « Changer de voie » dans les Compétences).
function chosenVoie(save) { return save.voie || null; }
function voieClosed(save, n) { var v = chosenVoie(save); return !!v && n.voie !== v; }
function treeCost(save) { return save.tree.reduce(function (s, id) { var n = nodeById(id); return s + (n ? n.cost : 0); }, 0); }

// Pourquoi une étape ne s'apprend pas encore (chaîne vide = elle s'apprend)
function learnBlock(save, n) {
  if (hasNode(save, n.id)) return 'Appris.';
  if (!chosenVoie(save)) return 'Choisis d’abord ta voie.';
  if (voieClosed(save, n)) return 'Voie fermée.';
  if (n.req.length && !hasNode(save, n.req[0])) return 'Apprends d’abord l’étape précédente de ce chemin.';
  if (save.level < n.level) return 'Niveau ' + n.level + ' requis.';
  if (save.skillPoints < n.cost) return 'Il te faut ' + n.cost + ' point' + (n.cost > 1 ? 's' : '') + ' de compétence.';
  return '';
}
function canLearnNode(save, n) { return !learnBlock(save, n); }

// Bonus de l'arbre : stats ajoutées et passifs de combat
function treeBonuses(save) {
  var out = { stats: {}, passives: { hpMult: 0, crit: 0, regen: 0, dmgReduce: 0, riposte: 0, poisonMult: 0, dmgMult: 0, dodge: 0, size: 0 } };
  (save.tree || []).forEach(function (id) {
    var n = nodeById(id);
    if (!n) return;
    if (n.stats) Object.keys(n.stats).forEach(function (k) { out.stats[k] = (out.stats[k] || 0) + n.stats[k]; });
    if (n.passive) Object.keys(n.passive).forEach(function (k) { out.passives[k] += n.passive[k]; });
  });
  return out;
}

// Compétences apprises (hors attaques de base)
function learnedSkills(save) {
  return save.tree.map(nodeById).filter(function (n) { return n && n.type === 'skill'; }).map(function (n) { return skillById(n.skill); });
}

// Deck de combat : l'attaque de base de l'arme + les compétences choisies.
// En mode Ermite (weapon.kind 'mains'), seuls les sorts de l'Ermite restent utilisables : pas de bâton ni de kunaï.
function skillUsable(s, weapon) { return weapon.kind !== 'mains' || s.voie === 'ermite'; }
function deckSkills(save, weapon) {
  var baseAtk = SKILLS.filter(function (s) { return s.base === weapon.kind; })[0];
  var known = learnedSkills(save).map(function (s) { return s.id; });
  return [baseAtk].concat(save.deck.filter(function (id) { return known.indexOf(id) >= 0; }).slice(0, DECK_SIZE).map(skillById)
    .filter(function (s) { return skillUsable(s, weapon); }));
}
