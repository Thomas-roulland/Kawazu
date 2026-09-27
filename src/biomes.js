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
