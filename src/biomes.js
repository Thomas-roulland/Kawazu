// Biomes : chacun a son donjon de 10 étapes, sa palette de décor, ses monstres et son boss.
// L'ordre du tableau est l'ordre de progression (battre le boss d'un donjon ouvre le suivant).

var BIOMES = [
  {
    id: 'marais', name: 'Marais-Brume', tagline: 'Là où tout commence : vase tiède et moustiques voraces.',
    wall: 'reeds', block: 'stump', bush: 'reeds', water: true,
    pal: {
      ground: '#2d4a34', groundLight: '#3f6644', groundDark: '#243c2b', alt: '#3a3a26',
      wall: '#1e3a26', wallLight: '#2f5a36', wallDark: '#0f1f15', accent: '#6e4a2a',
      water: '#1f3a2e', waterLight: '#2f5a44', waterEdge: '#4f7a5a',
      block: '#5e4228', blockLight: '#7a5634', blockDark: '#3e2a19',
      bush: '#5e8a3a', bushLight: '#8aa84a', bushDark: '#2f4a2a', door: '#4a3325'
    },
    monsters: [
      { species: 'limon', name: 'Limon de vase' },
      { species: 'moustique', name: 'Moustique géant' }
    ],
    boss: { species: 'limon', name: 'Roi Limon', scale: 2, pal: { 1: '#3a2e1e', 2: '#5a4a30', 3: '#8d7a58', g: '#e0b43a' } }
  },
  {
    id: 'lagune', name: 'Lagune des Lucioles', tagline: 'Des eaux noires qui brillent la nuit. Rien n’y est aussi doux qu’il en a l’air.',
    wall: 'reeds', block: 'stump', bush: 'glowmoss', water: true,
    pal: {
      ground: '#23383a', groundLight: '#2f4c4a', groundDark: '#1a2b2c', alt: '#1f3a44',
      wall: '#12262a', wallLight: '#1f3f3e', wallDark: '#0a1618', accent: '#c9f07a',
      water: '#0f2a36', waterLight: '#1f4a5a', waterEdge: '#5fb3a0',
      block: '#3e4a3a', blockLight: '#5a6a52', blockDark: '#242e22',
      bush: '#2f7a5a', bushLight: '#c9f07a', bushDark: '#1a4a3a', door: '#1f3f3e'
    },
    monsters: [
      { species: 'moustique', name: 'Luciole piquante', pal: { a: '#e8f7a0', 2: '#2f4a3a', 3: '#c9f07a', r: '#f3d27a' } },
      { species: 'limon', name: 'Limon des profondeurs', pal: { 1: '#1a3a44', 2: '#2f5a64', 3: '#5fb3a0', g: '#c9f07a' } }
    ],
    boss: { species: 'moustique', name: 'Reine des Lucioles', scale: 3, pal: { a: '#fff6b0', 2: '#3a4a2a', 3: '#f3d27a', r: '#e05a4a' } }
  },
  {
    id: 'saules', name: 'Forêt des Saules', tagline: 'Les saules pleurent, les champignons chargent.',
    wall: 'trunks', block: 'mushroom', bush: 'ferns', water: false,
    pal: {
      ground: '#3a3a22', groundLight: '#56562f', groundDark: '#2a2a18', alt: '#6b4a24',
      wall: '#3e2a19', wallLight: '#5a3e25', wallDark: '#20150d', accent: '#4f6b3a',
      water: '#2a3a2a', waterLight: '#3a5238', waterEdge: '#4f6b3a',
      block: '#c9412f', blockLight: '#f4f4e8', blockDark: '#86261c',
      bush: '#4f7a36', bushLight: '#7aa84a', bushDark: '#2a4a20', door: '#5a3e25'
    },
    monsters: [
      { species: 'champi', name: 'Champi furieux' },
      { species: 'moustique', name: 'Moucheron des saules', pal: { a: '#d6e8b0', 2: '#2f4a2a', 3: '#4f6b3a', r: '#e0b43a' } }
    ],
    boss: { species: 'champi', name: 'Grand Champi', scale: 2, pal: { 1: '#7a3aa0', w: '#e0b43a', 2: '#d6c8a8' } }
  },
  {
    id: 'grottes', name: 'Grottes Luisantes', tagline: 'Des cristaux qui chantent et des ailes dans le noir.',
    wall: 'rock', block: 'crystal', bush: 'glowmoss', water: true,
    pal: {
      ground: '#2a2a36', groundLight: '#3a3a4a', groundDark: '#1e1e28', alt: '#22303a',
      wall: '#16161f', wallLight: '#2e2e3e', wallDark: '#0b0b12', accent: '#3a3a4a',
      water: '#101a2a', waterLight: '#1c2c44', waterEdge: '#2c4a6a',
      block: '#5fd3e0', blockLight: '#d4fbff', blockDark: '#2a7a90',
      bush: '#3a8a6a', bushLight: '#8af0c0', bushDark: '#1c4a3a', door: '#2e2e3e'
    },
    monsters: [
      { species: 'chauvesouris', name: 'Chauve-souris' },
      { species: 'limon', name: 'Limon de cristal', pal: { 1: '#2c4a86', 2: '#4f7fc9', 3: '#9cc7e0', g: '#bff0ff' } }
    ],
    boss: { species: 'chauvesouris', name: 'Reine Chauve-souris', scale: 2, pal: { 1: '#6a2a3a', 2: '#9a4a5a', r: '#ff6a4a' } }
  },
  {
    id: 'temple', name: 'Temple Englouti', tagline: 'Un sanctuaire noyé où dorment les gardiens de pierre.',
    wall: 'ruins', block: 'pillar', bush: 'glowmoss', water: true,
    pal: {
      ground: '#3a4a50', groundLight: '#4a5e66', groundDark: '#2a383e', alt: '#2f5a64',
      wall: '#243238', wallLight: '#34464e', wallDark: '#141e22', accent: '#5fb3a0',
      water: '#0f2a3a', waterLight: '#1f4a5e', waterEdge: '#5fa3c0',
      block: '#6b7f86', blockLight: '#9ab0b6', blockDark: '#3e4e54',
      bush: '#2f7a6a', bushLight: '#7af0d0', bushDark: '#1a4a44', door: '#34464e'
    },
    monsters: [
      { species: 'limon', name: 'Golem de vase', pal: { 1: '#3e4e54', 2: '#6b7f86', 3: '#9ab0b6', g: '#5fb3a0', w: '#7af0d0' } },
      { species: 'chauvesouris', name: 'Gargouille ailée', pal: { 1: '#3e4e54', 2: '#6b7f86', r: '#7af0d0' } },
      { species: 'champi', name: 'Champi corail', pal: { 1: '#e8897a', w: '#fff0f4', 2: '#9ab0b6' } }
    ],
    boss: { species: 'limon', name: 'Gardien Englouti', scale: 2, pal: { 1: '#243238', 2: '#4a5e66', 3: '#9ab0b6', g: '#7af0d0', w: '#7af0d0' } }
  },
  {
    id: 'sommet', name: 'Sommet du Héron', tagline: 'Tout en haut, le Héron Ancestral attend la grenouille qui osera monter.',
    wall: 'ruins', block: 'pillar', bush: 'drygrass', water: false,
    pal: {
      ground: '#6b6a5e', groundLight: '#85846f', groundDark: '#55544a', alt: '#7a7560',
      wall: '#3e3c36', wallLight: '#5a5750', wallDark: '#26241f', accent: '#e0b43a',
      water: '#3a4a5a', waterLight: '#5a6a7a', waterEdge: '#8a9aaa',
      block: '#a9a390', blockLight: '#d6d0b8', blockDark: '#6b6556',
      bush: '#a89a5a', bushLight: '#d6c87a', bushDark: '#6b6034', door: '#5a5750'
    },
    monsters: [
      { species: 'champi', name: 'Champi doré', pal: { 1: '#e0b43a', w: '#fff6d8', 2: '#d9e1e6' } },
      { species: 'chauvesouris', name: 'Chauve-souris des cimes', pal: { 1: '#8a9aa8', 2: '#d9e1e6', r: '#e05a4a' } },
      { species: 'moustique', name: 'Frelon des ruines', pal: { a: '#f3e2a8', 2: '#6b4a1a', 3: '#e0b43a', r: '#1a1c2c' } }
    ],
    boss: { species: 'heron', name: 'Héron Ancestral', scale: 1 }
  }
];

// ---------- Le Continent : seize terres de plus, au-delà du Sommet du Héron ----------
// L'île du départ (les six premières terres) n'était qu'un début : une fois le Héron Ancestral vaincu, la grenouille
// traverse la mer. Moins de marais, plus de champs de bataille et de terres fantastiques. Plus dur aussi : il faut
// y farmer et y chercher de meilleurs objets pour avancer (voir CONTINENT_POWER dans worlds.js).
// Styles de tuiles en plus (tiles.js) : ground (sol : sand, snow, ash, slabs, cloud, void), alt (flaques, fleurs, os…).
var ISLAND_WORLDS = BIOMES.length; // les terres de l'île ; les suivantes sont celles du Continent
BIOMES.forEach(function (b, i) { b.alt = ['puddle', 'mosaic', 'leaves', 'stone', 'mosaic', 'mosaic'][i]; }); // les taches des terres de l'île, comme avant
BIOMES.push(
  {
    id: 'plaine', name: 'Plaine des Vents', continent: true, tagline: 'Des blés à perte de vue et des moulins en ruine. Les bêtes d’ici ne sont pas là pour la moisson.',
    wall: 'hedge', block: 'boulder', bush: 'drygrass', alt: 'flowers', water: false,
    pal: {
      ground: '#5a7a3a', groundLight: '#7a9a4a', groundDark: '#4a6a2e', alt: '#e0c050',
      wall: '#2e5a24', wallLight: '#4a7a30', wallDark: '#1a3a14', accent: '#e0b43a',
      water: '#3a6a8a', waterLight: '#5a8aaa', waterEdge: '#8ab0c8',
      block: '#8a8a7a', blockLight: '#b0b0a0', blockDark: '#5a5a4e',
      bush: '#d0b050', bushLight: '#f0d878', bushDark: '#8a7030', door: '#5a3e25'
    },
    monsters: [
      { species: 'rat', name: 'Rat des moissons' },
      { species: 'corbeau', name: 'Corbeau pillard' },
      { species: 'scarabee', name: 'Scarabée des blés', pal: { 1: '#5a4a1a', 2: '#a8882a', 3: '#e0c050', w: '#fff6d0' } }
    ],
    boss: { species: 'scarabee', name: 'Scarabée Colosse', scale: 2.4, pal: { 1: '#6a4a0a', 2: '#c08a1a', 3: '#f0c040', w: '#fff6d0', r: '#e0402a' } }
  },
  {
    id: 'bataille', name: 'Champ de Bataille', continent: true, tagline: 'Des épées plantées, des bannières en lambeaux, et des soldats qui ne savent pas que la guerre est finie.',
    wall: 'palisade', block: 'banner', bush: 'swords', alt: 'crater', water: false,
    pal: {
      ground: '#4a4032', groundLight: '#5e5242', groundDark: '#3a3226', alt: '#2e2820',
      wall: '#5a3e25', wallLight: '#7a5634', wallDark: '#2e1e10', accent: '#c9412f',
      water: '#3a3a3a', waterLight: '#5a5a5a', waterEdge: '#7a7a7a',
      block: '#c9412f', blockLight: '#e0b43a', blockDark: '#6a1a1a',
      bush: '#8a8a90', bushLight: '#d0d4dc', bushDark: '#4a4a50', door: '#3a2a1a'
    },
    monsters: [
      { species: 'squelette', name: 'Soldat oublié' },
      { species: 'corbeau', name: 'Corbeau des charniers', pal: { 1: '#141414', 2: '#262626', 3: '#444444', y: '#c0a060' } },
      { species: 'chevalier', name: 'Chevalier errant', pal: { 1: '#4a4a3a', 2: '#7a7a6a', 3: '#b0b0a0', r: '#6a2a1a' } }
    ],
    boss: { species: 'chevalier', name: 'Général Sans-Visage', scale: 2.2, pal: { 1: '#2a2a3a', 2: '#4a4a6a', 3: '#8a8aa8', r: '#c9412f' } }
  },
  {
    id: 'epines', name: 'Forêt d’Épines', continent: true, tagline: 'Des ronces grosses comme des arbres. Tout ici pique, mord ou s’accroche.',
    wall: 'trunks', block: 'stump', bush: 'thorns', alt: 'leaves', water: false,
    pal: {
      ground: '#2e2a22', groundLight: '#44402e', groundDark: '#221e18', alt: '#5a2a3a',
      wall: '#2a1e18', wallLight: '#443024', wallDark: '#140e0a', accent: '#6a2a4a',
      water: '#1a2a22', waterLight: '#2a3a30', waterEdge: '#3a4a3a',
      block: '#4a3226', blockLight: '#6a4a36', blockDark: '#2a1a12',
      bush: '#3a4a2a', bushLight: '#8a2a4a', bushDark: '#1e2a14', door: '#2a1e18'
    },
    monsters: [
      { species: 'araignee', name: 'Araignée des ronces', pal: { 2: '#3a3a1a', 3: '#6a6a2a' } },
      { species: 'plante', name: 'Ronce dévoreuse' },
      { species: 'loup', name: 'Loup des fourrés', pal: { 1: '#3a2a1a', 2: '#6a4a2a', 3: '#a8845a' } }
    ],
    boss: { species: 'plante', name: 'Mère-Ronce', scale: 2.2, pal: { 1: '#4a1a3a', 2: '#8a2a6a', 3: '#c86aa8', g: '#2a5a1a', G: '#4a8a2a' } }
  },
  {
    id: 'dunes', name: 'Désert des Os', continent: true, tagline: 'Du sable, des os blanchis et un soleil qui ne se couche jamais vraiment.',
    wall: 'sandstone', block: 'cactus', bush: 'drygrass', alt: 'bones', ground: 'sand', water: false,
    pal: {
      ground: '#d8b878', groundLight: '#f0d498', groundDark: '#b8985a', alt: '#f4ecd8',
      wall: '#b8844a', wallLight: '#d8a468', wallDark: '#7a5028', accent: '#e0b43a',
      water: '#3a8aa0', waterLight: '#6ab0c0', waterEdge: '#a0d8e0',
      block: '#4a8a3a', blockLight: '#8ac060', blockDark: '#2a5a22',
      bush: '#a89050', bushLight: '#d8c078', bushDark: '#6a5a30', door: '#7a5028'
    },
    monsters: [
      { species: 'scorpion', name: 'Scorpion des dunes' },
      { species: 'serpent', name: 'Serpent des sables', pal: { 1: '#8a6a2a', 2: '#c8a050', 3: '#f0d890', y: '#6a4a1a' } },
      { species: 'squelette', name: 'Pilleur desséché', pal: { 1: '#a89060', 2: '#d8c090', 3: '#f8ecc8' } }
    ],
    boss: { species: 'scorpion', name: 'Scorpion Empereur', scale: 2.3, pal: { 1: '#1a1a2a', 2: '#3a3a5a', 3: '#7a7aa8', r: '#e0b43a' } }
  },
  {
    id: 'canyon', name: 'Canyon Rouge', continent: true, tagline: 'Des falaises couleur de braise, où le vent siffle entre les pierres.',
    wall: 'rock', block: 'boulder', bush: 'drygrass', alt: 'stone', water: false,
    pal: {
      ground: '#a8583a', groundLight: '#c8744a', groundDark: '#8a4428', alt: '#7a3a22',
      wall: '#6a2a18', wallLight: '#9a4a2a', wallDark: '#3a140a', accent: '#e0a050',
      water: '#3a5a7a', waterLight: '#5a7a9a', waterEdge: '#8aa0b8',
      block: '#b0603a', blockLight: '#d88a5a', blockDark: '#6a3018',
      bush: '#8a7a3a', bushLight: '#b0a050', bushDark: '#5a4a22', door: '#6a2a18'
    },
    monsters: [
      { species: 'golem', name: 'Golem de grès', pal: { 1: '#6a3a22', 2: '#a8643a', 3: '#d8905a', g: '#8a6a3a' } },
      { species: 'corbeau', name: 'Vautour du canyon', pal: { 1: '#3a2a1a', 2: '#5a4a3a', 3: '#d8c8a8', y: '#e0a050' } },
      { species: 'serpent', name: 'Crotale rouge', pal: { 1: '#6a1a1a', 2: '#b03a2a', 3: '#e08a5a', y: '#f0d890' } }
    ],
    boss: { species: 'golem', name: 'Titan de Grès', scale: 2.4, pal: { 1: '#5a2a12', 2: '#9a4a2a', 3: '#d07a4a', g: '#e0a050', y: '#ff6a2a' } }
  },
  {
    id: 'toundra', name: 'Toundra Gelée', continent: true, tagline: 'Un désert blanc où même le souffle gèle. Les loups y chassent en silence.',
    wall: 'ice', block: 'crystal', bush: 'round', alt: 'snow', ground: 'snow', water: true,
    pal: {
      ground: '#d8e4ee', groundLight: '#f4f8fc', groundDark: '#b0c0d0', alt: '#ffffff',
      wall: '#7aa0c0', wallLight: '#b0d0e8', wallDark: '#3a5a7a', accent: '#a0d0f0',
      water: '#8ab0d0', waterLight: '#c8e0f4', waterEdge: '#ffffff',
      block: '#a0d8f0', blockLight: '#e8f8ff', blockDark: '#4a8ab0',
      bush: '#e8f0f4', bushLight: '#ffffff', bushDark: '#9ab0c0', door: '#3a5a7a'
    },
    monsters: [
      { species: 'loup', name: 'Loup des neiges', pal: { 1: '#8a9aa8', 2: '#c8d4de', 3: '#f4f8fc', y: '#6ac0f0' } },
      { species: 'fantome', name: 'Esprit du blizzard', pal: { 1: '#6a9ac8', 2: '#a8d0f0', 3: '#eef8ff', r: '#1a3a6a' } },
      { species: 'golem', name: 'Golem de glace', pal: { 1: '#4a7aa0', 2: '#8ab8d8', 3: '#d0ecf8', g: '#ffffff', y: '#6af0ff' } }
    ],
    boss: { species: 'loup', name: 'Croc-Blanc Ancestral', scale: 2.2, pal: { 1: '#a8b8c8', 2: '#e0e8f0', 3: '#ffffff', y: '#e0402a' } }
  },
  {
    id: 'volcan', name: 'Volcan de Braise', continent: true, tagline: 'La terre y saigne du feu. Il fait trop chaud pour avoir peur, presque.',
    wall: 'rock', block: 'crystal', bush: 'flames', alt: 'embers', ground: 'ash', water: true,
    pal: {
      ground: '#3a2a26', groundLight: '#5a3a30', groundDark: '#241a18', alt: '#ff6a1a',
      wall: '#241818', wallLight: '#3a2624', wallDark: '#100a0a', accent: '#ff8a2a',
      water: '#c83a0a', waterLight: '#ff8a2a', waterEdge: '#ffd040',
      block: '#2a2230', blockLight: '#6a5a7a', blockDark: '#120e18',
      bush: '#e0402a', bushLight: '#ffd040', bushDark: '#8a1a0a', door: '#241818'
    },
    monsters: [
      { species: 'salamandre', name: 'Salamandre de braise' },
      { species: 'golem', name: 'Golem de lave', pal: { 1: '#2a1a18', 2: '#4a3028', 3: '#6a4a3a', g: '#ff6a1a', y: '#ffd040' } },
      { species: 'fantome', name: 'Feu follet', pal: { 1: '#c83a0a', 2: '#ff8a2a', 3: '#ffd878', r: '#6a1a0a' } }
    ],
    boss: { species: 'salamandre', name: 'Salamandre Reine', scale: 2.4, pal: { 1: '#5a0a1a', 2: '#a01a2a', 3: '#e0402a', y: '#fff0a0', o: '#ffd040' } }
  },
  {
    id: 'cimetiere', name: 'Cimetière des Rois', continent: true, tagline: 'Ici dorment les rois-crapauds d’autrefois. Ils ne dorment pas tous très bien.',
    wall: 'ruins', block: 'tomb', bush: 'round', alt: 'bones', water: false,
    pal: {
      ground: '#3a3e3a', groundLight: '#4e544e', groundDark: '#2a2e2a', alt: '#d8d4c8',
      wall: '#2a2a34', wallLight: '#44444e', wallDark: '#16161c', accent: '#8af0c0',
      water: '#1a2a2a', waterLight: '#2a3a3a', waterEdge: '#4a6a6a',
      block: '#7a7a82', blockLight: '#a8a8b0', blockDark: '#4a4a52',
      bush: '#3a4a3a', bushLight: '#6a8a6a', bushDark: '#1e2a1e', door: '#2a2a34'
    },
    monsters: [
      { species: 'squelette', name: 'Roi déchu', pal: { r: '#8af0c0', t: '#e0b43a' } },
      { species: 'fantome', name: 'Âme errante', pal: { 1: '#5a8a7a', 2: '#8ac0b0', 3: '#d0f0e8', r: '#1a3a34' } },
      { species: 'araignee', name: 'Araignée des cryptes', pal: { 2: '#2a2a34', 3: '#5a5a6a', r: '#8af0c0' } }
    ],
    boss: { species: 'fantome', name: 'Spectre Couronné', scale: 2.4, pal: { 1: '#3a6a5a', 2: '#6ab0a0', 3: '#c0f8e8', r: '#0a2a24' } }
  },
  {
    id: 'feerique', name: 'Bois Féerique', continent: true, tagline: 'Des champignons hauts comme des maisons et des lumières qui dansent. N’écoute pas ce qu’elles chantent.',
    wall: 'trunks', block: 'mushroom', bush: 'flowers', alt: 'flowers', water: false,
    pal: {
      ground: '#3a3a5a', groundLight: '#5a5a8a', groundDark: '#2a2a44', alt: '#f0a0e0',
      wall: '#2a2a4a', wallLight: '#44447a', wallDark: '#16162a', accent: '#a0f0e0',
      water: '#2a3a6a', waterLight: '#4a5a9a', waterEdge: '#8aa0e0',
      block: '#a040c0', blockLight: '#f0c0ff', blockDark: '#5a1a7a',
      bush: '#4a8a8a', bushLight: '#f0a0e0', bushDark: '#2a4a5a', door: '#2a2a4a'
    },
    monsters: [
      { species: 'fee', name: 'Fée malicieuse' },
      { species: 'plante', name: 'Fleur-piège', pal: { 1: '#6a2a8a', 2: '#a060d0', 3: '#e0b0ff', g: '#2a6a6a', G: '#4aa0a0' } },
      { species: 'champi', name: 'Champi féerique', pal: { 1: '#a040c0', w: '#a0f0e0', 2: '#f0e0ff' } }
    ],
    boss: { species: 'fee', name: 'Reine des Fées', scale: 3, pal: { 1: '#e0b43a', 2: '#fff0a0', 3: '#ffffff', a: '#f0a0e0', b: '#c060c0', y: '#a0f0e0' } }
  },
  {
    id: 'ciel', name: 'Îles Célestes', continent: true, tagline: 'Des ruines posées sur les nuages. On y respire mal, et on y tombe de haut.',
    wall: 'cloud', block: 'pillar', bush: 'round', alt: 'mosaic', ground: 'slabs', water: false,
    pal: {
      ground: '#c8ccd8', groundLight: '#e8ecf4', groundDark: '#a0a4b4', alt: '#e0b43a',
      wall: '#8ab0e0', wallLight: '#ffffff', wallDark: '#5a80b8', accent: '#e0b43a',
      water: '#6a90c8', waterLight: '#a0c0e8', waterEdge: '#ffffff',
      block: '#e8e4d8', blockLight: '#ffffff', blockDark: '#a8a498',
      bush: '#f4f8ff', bushLight: '#ffffff', bushDark: '#b8c8e0', door: '#5a80b8'
    },
    monsters: [
      { species: 'corbeau', name: 'Aigle des nuées', pal: { 1: '#6a5a4a', 2: '#a8906a', 3: '#f4f4e8', y: '#e0b43a' } },
      { species: 'fee', name: 'Étincelle', pal: { 1: '#e0b43a', 2: '#fff0a0', 3: '#ffffff', a: '#a0d0ff', b: '#6aa0e0' } },
      { species: 'chevalier', name: 'Gardien ailé', pal: { 1: '#a8a8c0', 2: '#d8d8e8', 3: '#ffffff', r: '#6aa0e0' } }
    ],
    boss: { species: 'corbeau', name: 'Roc des Nuées', scale: 2.8, pal: { 1: '#4a3a2a', 2: '#8a6a4a', 3: '#f4f4e8', y: '#e0b43a', r: '#e0402a' } }
  },
  {
    id: 'jungle', name: 'Jungle Carnivore', continent: true, tagline: 'Tout y pousse, tout y mange. Même les fleurs ont faim.',
    wall: 'trunks', block: 'stump', bush: 'ferns', alt: 'leaves', water: true,
    pal: {
      ground: '#2a4a22', groundLight: '#3e6a2e', groundDark: '#1e3a18', alt: '#6a8a2a',
      wall: '#1e3a18', wallLight: '#2e5a24', wallDark: '#0e1e0a', accent: '#e04a8a',
      water: '#1a3a2a', waterLight: '#2a5a3a', waterEdge: '#4a8a4a',
      block: '#5a3a22', blockLight: '#7a5a32', blockDark: '#3a2414',
      bush: '#3a8a2a', bushLight: '#e04a8a', bushDark: '#1e4a14', door: '#1e3a18'
    },
    monsters: [
      { species: 'plante', name: 'Gueule-verte', pal: { 1: '#2a5a1a', 2: '#4a9a2a', 3: '#8ae060' } },
      { species: 'serpent', name: 'Boa émeraude', pal: { 1: '#1a4a3a', 2: '#2a8a6a', 3: '#6ae0b0', y: '#e0d070' } },
      { species: 'araignee', name: 'Mygale', pal: { 2: '#4a2a1a', 3: '#8a5a3a', y: '#e04a8a' } }
    ],
    boss: { species: 'serpent', name: 'Boa Titanesque', scale: 2.4, pal: { 1: '#1a3a1a', 2: '#3a7a2a', 3: '#8ad060', y: '#e0b43a', r: '#e04a8a' } }
  },
  {
    id: 'mines', name: 'Mines Noires', continent: true, tagline: 'Des galeries sans fin, des rails rouillés et des cristaux noirs qui boivent la lumière.',
    wall: 'rock', block: 'crystal', bush: 'round', alt: 'rails', water: true,
    pal: {
      ground: '#2a2622', groundLight: '#3e3830', groundDark: '#1a1714', alt: '#6a5a4a',
      wall: '#1a1714', wallLight: '#2e2a24', wallDark: '#0a0908', accent: '#e0b43a',
      water: '#101418', waterLight: '#20283a', waterEdge: '#3a4a6a',
      block: '#3a2a4a', blockLight: '#8a6ab0', blockDark: '#1a1024',
      bush: '#4a4a3a', bushLight: '#8a7a5a', bushDark: '#2a2a22', door: '#1a1714'
    },
    monsters: [
      { species: 'golem', name: 'Golem de charbon', pal: { 1: '#1a1a1a', 2: '#3a3a3a', 3: '#5a5a5a', g: '#8a6ab0', y: '#ff8a2a' } },
      { species: 'araignee', name: 'Araignée des galeries', pal: { 2: '#3a3028', 3: '#6a5a4a', r: '#e0b43a' } },
      { species: 'rat', name: 'Rat mineur', pal: { 1: '#2a2a2a', 2: '#4a4a4a', 3: '#8a8a8a', r: '#e0b43a' } }
    ],
    boss: { species: 'rat', name: 'Rat-Roi des Mines', scale: 2.4, pal: { 1: '#3a2a1a', 2: '#6a5a3a', 3: '#b0a07a', r: '#e0402a', p: '#e0b43a' } }
  },
  {
    id: 'forteresse', name: 'Forteresse de Fer', continent: true, tagline: 'Des remparts, des herses et une armée de fer qui garde un trône vide.',
    wall: 'ruins', block: 'banner', bush: 'swords', alt: 'mosaic', water: false,
    pal: {
      ground: '#5a5a60', groundLight: '#74747c', groundDark: '#46464c', alt: '#c9412f',
      wall: '#3a3a44', wallLight: '#54545e', wallDark: '#22222a', accent: '#c9412f',
      water: '#2a3a4a', waterLight: '#3a4a5a', waterEdge: '#5a6a7a',
      block: '#2a4a8a', blockLight: '#e0b43a', blockDark: '#1a2a5a',
      bush: '#8a8a90', bushLight: '#d0d4dc', bushDark: '#4a4a50', door: '#3a3a44'
    },
    monsters: [
      { species: 'chevalier', name: 'Garde de fer', pal: { 1: '#3a3a44', 2: '#6a6a78', 3: '#a8a8b8', r: '#2a4a8a' } },
      { species: 'squelette', name: 'Arbalétrier squelette', pal: { t: '#8a8a90', o: '#3a2a1a' } },
      { species: 'rat', name: 'Rat d’armes', pal: { 1: '#3a3a44', 2: '#6a6a78', 3: '#a8a8b8' } }
    ],
    boss: { species: 'chevalier', name: 'Seigneur de Fer', scale: 2.3, pal: { 1: '#1a1a22', 2: '#3a3a48', 3: '#7a7a90', r: '#e0b43a', y: '#c9412f' } }
  },
  {
    id: 'abysse', name: 'Marches de l’Abysse', continent: true, tagline: 'Le monde s’effrite en morceaux qui flottent au-dessus du vide. Quelque chose y tisse sa toile.',
    wall: 'void', block: 'crystal', bush: 'round', alt: 'stone', ground: 'void', water: true,
    pal: {
      ground: '#241a34', groundLight: '#3a2a54', groundDark: '#160e22', alt: '#4a2a6a',
      wall: '#0e0818', wallLight: '#2a1a44', wallDark: '#050208', accent: '#c080ff',
      water: '#050208', waterLight: '#1a0e2a', waterEdge: '#6a3aa8',
      block: '#6a3aa8', blockLight: '#e0b0ff', blockDark: '#2a0e5a',
      bush: '#4a2a7a', bushLight: '#c080ff', bushDark: '#20104a', door: '#0e0818'
    },
    monsters: [
      { species: 'fantome', name: 'Ombre', pal: { 1: '#2a1a44', 2: '#5a4a8a', 3: '#9a88c8', r: '#e0b0ff' } },
      { species: 'araignee', name: 'Tisseuse du vide', pal: { 2: '#4a2a7a', 3: '#8a5ad0', r: '#e0b0ff', y: '#c080ff' } },
      { species: 'scarabee', name: 'Scarabée du néant', pal: { 1: '#1a0e2a', 2: '#3a1a5a', 3: '#8a4ad0', w: '#e0b0ff', h: '#0e0818' } }
    ],
    boss: { species: 'araignee', name: 'Reine du Vide', scale: 2.5, pal: { 1: '#0a0612', 2: '#2a1044', 3: '#8a4ad0', r: '#ff4af0', y: '#e0b0ff' } }
  },
  {
    id: 'dragons', name: 'Terres des Dragons', continent: true, tagline: 'Des ossements géants, de l’or partout, et des ailes qui cachent le soleil.',
    wall: 'rock', block: 'skull', bush: 'drygrass', alt: 'bones', water: false,
    pal: {
      ground: '#6a5230', groundLight: '#8a6c40', groundDark: '#523e22', alt: '#e8e0c8',
      wall: '#4a321a', wallLight: '#6a4a26', wallDark: '#2a1a0c', accent: '#e0b43a',
      water: '#3a5a6a', waterLight: '#5a7a8a', waterEdge: '#8aa0aa',
      block: '#e8e0c8', blockLight: '#ffffff', blockDark: '#a89a7a',
      bush: '#c0902a', bushLight: '#f0d060', bushDark: '#7a5a1a', door: '#4a321a'
    },
    monsters: [
      { species: 'salamandre', name: 'Dragonnet', pal: { 1: '#1a4a2a', 2: '#2a8a4a', 3: '#6ad08a', y: '#e0b43a', o: '#a0f0c0' } },
      { species: 'loup', name: 'Loup d’écailles', pal: { 1: '#5a3a1a', 2: '#a8741e', 3: '#e0b43a', y: '#e0402a' } },
      { species: 'chevalier', name: 'Chasseur de dragons', pal: { 1: '#5a3a2a', 2: '#8a6a4a', 3: '#c8a47a', r: '#2a8a4a' } }
    ],
    boss: { species: 'dragon', name: 'Wyverne d’Or', scale: 1, pal: { 1: '#6a4a0a', 2: '#c08a1a', 3: '#f0d060', a: '#8a5a1a', b: '#c0902a', y: '#e0402a' } }
  },
  {
    id: 'orage', name: 'Trône de l’Orage', continent: true, tagline: 'Tout au bout du monde, sous un ciel qui gronde, le Dragon-Tempête attend sur son trône.',
    wall: 'ruins', block: 'pillar', bush: 'round', alt: 'mosaic', ground: 'slabs', water: false,
    pal: {
      ground: '#3a4050', groundLight: '#50586c', groundDark: '#2a2e3a', alt: '#6af0ff',
      wall: '#1e2230', wallLight: '#343a50', wallDark: '#0e1018', accent: '#6af0ff',
      water: '#1a2a4a', waterLight: '#2a4a6a', waterEdge: '#6af0ff',
      block: '#4a5068', blockLight: '#8a94b0', blockDark: '#2a2e40',
      bush: '#3a4a6a', bushLight: '#6af0ff', bushDark: '#1e2a44', door: '#1e2230'
    },
    monsters: [
      { species: 'fantome', name: 'Esprit de foudre', pal: { 1: '#2a6ab0', 2: '#6aa8f0', 3: '#d0f0ff', r: '#f0f040' } },
      { species: 'golem', name: 'Colosse d’orage', pal: { 1: '#2a2e40', 2: '#4a5068', 3: '#8a94b0', g: '#6af0ff', y: '#f0f040' } },
      { species: 'corbeau', name: 'Oiseau-tonnerre', pal: { 1: '#1a2a4a', 2: '#2a4a8a', 3: '#6aa8f0', y: '#f0f040', r: '#f0f040' } }
    ],
    boss: { species: 'dragon', name: 'Dragon-Tempête', scale: 1.25 }
  }
);
var CONTINENT_END = BIOMES.length; // les terres du Continent s'arrêtent ici

// ---------- Les îles du monde ----------
// Dans l'ordre où on les découvre : leurs terres vont de BIOMES[from] à BIOMES[to - 1]. La carte de chacune (map) est
// posée par map.js, son film d'arrivée par hub.js. Les îles suivantes s'ajoutent à la suite (colosses.js…), et le cycle
// suivant (NG+) ne s'ouvre qu'au bout de la dernière.
var ISLES = [
  { id: 'ile', name: 'L’Île du départ', short: 'L’Île', from: 0, to: ISLAND_WORLDS },
  { id: 'continent', name: 'le Continent', short: 'Le Continent', from: ISLAND_WORLDS, to: CONTINENT_END }
];
function isleOf(w) { for (var i = ISLES.length - 1; i > 0; i--) if (w >= ISLES[i].from) return ISLES[i]; return ISLES[0]; }
function isleById(id) { return ISLES.filter(function (s) { return s.id === id; })[0] || ISLES[0]; }
