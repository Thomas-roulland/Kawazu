// Hauts faits : des défis calculés à partir de la sauvegarde. Une fois obtenu, un haut fait est rangé
// dans save.ach et reste acquis (même si on dépense ses lucioles ou qu'on oublie son arbre).
// cat donne la couleur du ruban de la médaille, tier son métal (0 bronze, 1 argent, 2 or).
var FEATS = [
  { id: 'premier_bond', name: 'Premier bond', desc: 'Gagner ton premier combat.', cat: 'combat', tier: 0,
    test: function (s) { return s.progress.some(function (p) { return p >= 1; }); } },
  { id: 'gardien', name: 'Briseur de gardiens', desc: 'Vaincre un gardien de monde.', cat: 'combat', tier: 1,
    test: function (s) { return s.progress.some(function (p) { return p >= GUARDIAN_STAGES[0]; }); } }
].concat(BIOMES.map(function (b, i) {
  return { id: 'boss_' + b.id, name: b.boss.name + ' vaincu', desc: 'Conquérir ' + b.name + '.', cat: 'boss', tier: 2,
    test: function (s) { return s.progress[i] >= STAGES; } };
})).concat([
  { id: 'niv5', name: 'Têtard devenu grand', desc: 'Atteindre le niveau 5.', cat: 'niveau', tier: 0, test: function (s) { return s.level >= 5; } },
  { id: 'niv10', name: 'Grenouille aguerrie', desc: 'Atteindre le niveau 10.', cat: 'niveau', tier: 1, test: function (s) { return s.level >= 10; } },
  { id: 'niv20', name: 'Ancien du marais', desc: 'Atteindre le niveau 20.', cat: 'niveau', tier: 2, test: function (s) { return s.level >= 20; } },
  { id: 'pare', name: 'Paré au combat', desc: 'Remplir tous les emplacements d’équipement.', cat: 'objets', tier: 1,
    test: function (s) { return SLOTS.every(function (sl) { return s.equip[sl.id]; }); } },
  { id: 'pie', name: 'Pie des marais', desc: 'Posséder 10 objets.', cat: 'objets', tier: 0, test: function (s) { return s.owned.length >= 10; } },
  { id: 'tresor', name: 'Trésor complet', desc: 'Posséder tous les objets du jeu.', cat: 'objets', tier: 2,
    test: function (s) { return s.owned.filter(collectible).length >= Object.keys(ITEMS).filter(collectible).length; } },
  { id: 'lucioles', name: 'Pluie de lucioles', desc: 'Avoir 300 lucioles en poche.', cat: 'objets', tier: 1, test: function (s) { return s.gold >= 300; } },
  { id: 'eleve', name: 'Élève du temple', desc: 'Prendre 5 dalles au Temple des voies.', cat: 'arbre', tier: 0, test: function (s) { return s.tree.length >= 5; } },
  { id: 'main', name: 'Main pleine', desc: 'Remplir les 3 emplacements du deck.', cat: 'arbre', tier: 1, test: function (s) { return s.deck.length >= DECK_SIZE; } },
  { id: 'maitre', name: 'Maître d’un chemin', desc: 'Atteindre la 10e dalle d’un chemin.', cat: 'arbre', tier: 2,
    test: function (s) { return s.tree.some(function (id) { var n = nodeById(id); return n && n.step === STEPS; }); } }
]);

// Médaille en pixel art : un ruban et une pièce frappée d'une tête de grenouille
var FEAT_RIBBON = { combat: '#c9412f', boss: '#8a4ab0', niveau: '#4e9a45', objets: '#3a7ac0', arbre: '#2aa090' };
var FEAT_METAL = [
  { m: '#c97a3a', M: '#f0b070', d: '#8a4a1a' },
  { m: '#b8c0c8', M: '#f4f8fc', d: '#6a7078' },
  { m: '#e0b43a', M: '#fff0a0', d: '#8a6f1f' }
];
var MEDAL_ROWS = [
  '..kkk......kkk..', '..krrk....krrk..', '...krrk..krrk...', '....krrkkrrk....', '.....krrrrk.....', '....kkkkkkkk....',
  '...kMMmmmmmmk...', '..kMMmmmmmmmdk..', '..kMmmwmmwmmdk..', '..kmmmkmmkmmdk..', '..kmmmmmmmmmdk..', '..kmmkmmmmkmdk..',
  '..kmmmkkkkmddk..', '...kmmmmmmddk...', '....kddddddk....', '.....kkkkkk.....'
];
function medalCanvas(feat) {
  var metal = FEAT_METAL[feat.tier];
  return stringsToCanvas(MEDAL_ROWS, { k: '#1a1c2c', r: FEAT_RIBBON[feat.cat], w: '#f4f4e8', m: metal.m, M: metal.M, d: metal.d });
}

// Range les hauts faits nouvellement obtenus ; renvoie ceux-là (pour les annoncer)
function claimFeats(save) {
  if (!Array.isArray(save.ach)) {
    // ancienne partie : on range ce qui est déjà mérité, sans fanfare
    save.ach = FEATS.filter(function (f) { return f.test(save); }).map(function (f) { return f.id; });
    return [];
  }
  var fresh = FEATS.filter(function (f) { return save.ach.indexOf(f.id) < 0 && f.test(save); });
  fresh.forEach(function (f) { save.ach.push(f.id); });
  return fresh;
}
