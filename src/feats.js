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
  { id: 'niv100', name: 'Centenaire', desc: 'Atteindre le niveau 100.', cat: 'niveau', tier: 2, test: function (s) { return s.level >= 100; } },
  { id: 'mutant', name: 'Mutant', desc: 'Muter une première fois.', cat: 'niveau', tier: 1, test: function (s) { return s.mutation && s.mutation.n >= 1; } },
  { id: 'mutant5', name: 'D’un autre monde', desc: 'Muter cinq fois.', cat: 'niveau', tier: 2, test: function (s) { return s.mutation && s.mutation.n >= 5; } },
  { id: 'colosses', name: 'Parmi les géants', desc: 'Poser le pied sur l’Île des Colosses.', cat: 'boss', tier: 2, test: function (s) { return isleOpen(s, isleById('colosses')); } },
  { id: 'leviathan', name: 'Tueuse de Léviathan', desc: 'Vaincre le Léviathan Ancestral, au fond de l’Abîme.', cat: 'boss', tier: 2, test: function (s) { return s.progress[isleById('colosses').to - 1] >= STAGES; } },
  { id: 'maitrise', name: 'Maître de sa voie', desc: 'Prendre un premier rang de Maîtrise.', cat: 'arbre', tier: 2, test: function (s) { return masteryRanks(s) >= 1; } },
  { id: 'eveil', name: 'Éveil', desc: 'Éveiller un sort.', cat: 'arbre', tier: 2, test: function (s) { return (s.awakened || []).length >= 1; } },
  { id: 'donjon', name: 'Pilleuse de donjon', desc: 'Vider un donjon jusqu’à son boss.', cat: 'combat', tier: 1, test: function (s) { return Object.keys(s.dungeons || {}).some(function (k) { return s.dungeons[k].room >= DUNGEON_ROOMS; }); } },
  { id: 'donjon10', name: 'Dix portes', desc: 'Vider dix donjons.', cat: 'combat', tier: 2, test: function (s) { return Object.keys(s.dungeons || {}).filter(function (k) { return s.dungeons[k].room >= DUNGEON_ROOMS; }).length >= 10; } },
  { id: 'unique', name: 'Unique en son genre', desc: 'Trouver un objet Unique dans un donjon.', cat: 'objets', tier: 2, test: function (s) { return s.owned.some(function (id) { return rarityOf(id) === 'unique'; }); } },
  { id: 'ancetres', name: 'Plus haut que les Sages', desc: 'Conquérir un étage de la Tour des Ancêtres.', cat: 'boss', tier: 2, test: function (s) { return s.tower > TOWER_FLOORS; } },
  { id: 'premier', name: 'Le Premier Crapaud', desc: 'Conquérir les 600 étages des deux tours.', cat: 'boss', tier: 2, test: function (s) { return s.tower >= TOWER_TOP; } },
  { id: 'archipel', name: 'Dans les brumes', desc: 'Accoster sur l’Archipel des Brumes.', cat: 'boss', tier: 2, test: function (s) { return isleOpen(s, isleById('archipel')); } },
  { id: 'ryu', name: 'Dompteuse de dragon', desc: 'Vaincre le Ryū des Brumes, au sommet du Mont aux Mille Tempêtes.', cat: 'boss', tier: 2, test: function (s) { return s.progress[isleById('archipel').to - 1] >= STAGES; } },
  { id: 'royaume', name: 'Sous la terre', desc: 'Descendre dans le Royaume sous la Terre.', cat: 'boss', tier: 2, test: function (s) { return isleOpen(s, isleById('royaume')); } },
  { id: 'coeur', name: 'Le cœur du monde', desc: 'Vaincre le Ver du Cœur du Monde, tout au fond du Royaume.', cat: 'boss', tier: 2, test: function (s) { return s.progress[isleById('royaume').to - 1] >= STAGES; } },
  { id: 'forge5', name: 'Forgé dans le jade', desc: 'Renforcer un objet jusqu’à +5 à la forge.', cat: 'objets', tier: 1, test: function (s) { return s.owned.some(function (id) { return forgeOf(id) >= 5; }); } },
  { id: 'forge10', name: 'Chef-d’œuvre', desc: 'Renforcer un objet jusqu’à +10.', cat: 'objets', tier: 2, test: function (s) { return s.owned.some(function (id) { return forgeOf(id) >= FORGE_MAX; }); } },
  { id: 'panoplie', name: 'Panoplie complète', desc: 'Porter quatre Uniques du même donjon.', cat: 'objets', tier: 2, test: function (s) { var c = setCounts(s.equip); return Object.keys(c).some(function (k) { return c[k] >= 4; }); } },
  { id: 'compagnon', name: 'Une amie fidèle', desc: 'Être suivie par un premier compagnon.', cat: 'combat', tier: 1, test: function (s) { return Object.keys(s.pets || {}).length >= 1; } },
  { id: 'menagerie', name: 'La ménagerie', desc: 'Trouver dix compagnons.', cat: 'combat', tier: 2, test: function (s) { return Object.keys(s.pets || {}).length >= 10; } },
  { id: 'coffre', name: 'Une journée bien remplie', desc: 'Ouvrir le coffre des quêtes du jour.', cat: 'niveau', tier: 0, test: function (s) { return (s.counts && s.counts.coffres) >= 1; } },
  { id: 'coffre30', name: 'Un mois sans relâche', desc: 'Ouvrir trente coffres des quêtes du jour.', cat: 'niveau', tier: 2, test: function (s) { return (s.counts && s.counts.coffres) >= 30; } },
  { id: 'titan', name: 'Contre le Titan', desc: 'Attaquer le Titan de la semaine.', cat: 'combat', tier: 1, test: function (s) { return (s.counts && s.counts.titan) >= 1; } },
  { id: 'cycle2', name: 'Nouvelle lune', desc: 'Entrer dans le cycle II.', cat: 'boss', tier: 2, test: function (s) { return (s.cycle || 1) >= 2; } },
  { id: 'cycle5', name: 'Éternel retour', desc: 'Entrer dans le cycle V.', cat: 'boss', tier: 2, test: function (s) { return (s.cycle || 1) >= 5; } },
  { id: 'legende', name: 'Légende vivante', desc: 'Trouver un objet légendaire.', cat: 'objets', tier: 2, test: function (s) { return s.owned.some(function (id) { return rarityOf(id) === 'legendaire'; }); } },
  { id: 'pare', name: 'Paré au combat', desc: 'Remplir tous les emplacements d’équipement.', cat: 'objets', tier: 1,
    test: function (s) { return SLOTS.every(function (sl) { return s.equip[sl.id]; }); } },
  { id: 'pie', name: 'Pie des marais', desc: 'Posséder 10 objets.', cat: 'objets', tier: 0, test: function (s) { return s.owned.length >= 10; } },
  { id: 'tresor', name: 'Trésor complet', desc: 'Posséder tous les objets du jeu.', cat: 'objets', tier: 2,
    test: function (s) { return albumItemsFound(s) >= albumPool(s).length; } },
  { id: 'lucioles', name: 'Pluie de lucioles', desc: 'Avoir 300 lucioles en poche.', cat: 'objets', tier: 1, test: function (s) { return s.gold >= 300; } },
  { id: 'eleve', name: 'Élève du temple', desc: 'Prendre 5 dalles au Temple des voies.', cat: 'arbre', tier: 0, test: function (s) { return s.tree.length >= 5; } },
  { id: 'main', name: 'Main pleine', desc: 'Remplir les ' + DECK_SIZE + ' emplacements du deck.', cat: 'arbre', tier: 1, test: function (s) { return s.deck.length >= DECK_SIZE; } },
  { id: 'maitre', name: 'Maître d’une branche', desc: 'Atteindre la 10e dalle d’une branche.', cat: 'arbre', tier: 2,
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
