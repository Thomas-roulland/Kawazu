// Les touches du combat : une par case du deck (l'attaque de base, puis les 4 sorts) et une pour le mode auto.
// Deux dispositions toutes prêtes (QWERTY et AZERTY) ; chaque touche se change à la main. Le réglage est propre à
// l'appareil (localStorage), comme le son. Les chiffres 1 à 5 de la rangée du haut ou du pavé marchent toujours en plus.
var KEY_ACTIONS = [
  { id: 's1', name: 'Attaque de base' },
  { id: 's2', name: 'Sort 1' },
  { id: 's3', name: 'Sort 2' },
  { id: 's4', name: 'Sort 3' },
  { id: 's5', name: 'Sort 4' },
  { id: 'auto', name: 'Combat auto' }
];
var KEY_PRESETS = {
  qwerty: { name: 'QWERTY', keys: { s1: 'q', s2: 'w', s3: 'e', s4: 'r', s5: 't', auto: 'a' } },
  azerty: { name: 'AZERTY', keys: { s1: 'a', s2: 'z', s3: 'e', s4: 'r', s5: 't', auto: 'q' } }
};
var KEYS_RESERVED = ['escape', 'm', 'tab', 'enter']; // fermer, couper le son, naviguer, valider

var Keys = (function () {
  var STORE = 'kawazu.keys';
  var state = null; // { layout: 'qwerty' | 'azerty' | 'perso', keys: { s1: 'q', … } }

  function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
  function fromPreset(id) { return { layout: id, keys: copy(KEY_PRESETS[id].keys) }; }
  // La disposition par défaut, d'après la langue (fr → AZERTY) ; load() la corrige si le navigateur connaît le clavier
  function guess() { return /^fr\b/i.test(navigator.language || '') && !/^fr-CA/i.test(navigator.language) ? 'azerty' : 'qwerty'; }

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (raw && raw.keys) {
        state = { layout: raw.layout || 'perso', keys: copy(KEY_PRESETS.qwerty.keys) };
        KEY_ACTIONS.forEach(function (a) { if (typeof raw.keys[a.id] === 'string') state.keys[a.id] = raw.keys[a.id]; });
        return;
      }
    } catch (e) { /* ignoré */ }
    state = fromPreset(guess());
    // Chrome sait dire ce qu'imprime la touche à la place du Q : « a » sur un AZERTY
    try {
      if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
        navigator.keyboard.getLayoutMap().then(function (map) {
          var q = map.get('KeyQ');
          if (!q || saved()) return;
          state = fromPreset(q === 'a' ? 'azerty' : 'qwerty');
        }, function () { /* ignoré */ });
      }
    } catch (e) { /* ignoré */ }
  }
  function saved() { try { return !!localStorage.getItem(STORE); } catch (e) { return false; } }
  function persist() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* ignoré */ } }

  // La touche d'un événement, sous la forme qu'on enregistre : la lettre en minuscule, sinon son nom (« ArrowUp », « F2 »…)
  function norm(e) {
    var k = e.key || '';
    if (k === ' ' || k === 'Spacebar') return 'space';
    if (k === 'Dead' || k === 'Unidentified' || k === 'Process') return '';
    return k.toLowerCase();
  }
  function label(k) {
    if (!k) return '—';
    var names = { space: 'Espace', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→', backspace: 'Retour', shift: 'Maj', control: 'Ctrl', alt: 'Alt', capslock: 'Verr. maj', ',': ',', ';': ';' };
    if (names[k]) return names[k];
    return k.length === 1 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1);
  }

  load();
  return {
    layout: function () { return state.layout; },
    key: function (id) { return state.keys[id]; },
    label: function (id) { return label(state.keys[id]); },
    keyLabel: label,
    norm: norm,
    usePreset: function (id) { if (KEY_PRESETS[id]) { state = fromPreset(id); persist(); } },
    // Changer une touche ; si une autre action l'avait, elles échangent leurs touches
    set: function (id, k) {
      if (!k || KEYS_RESERVED.indexOf(k) >= 0) return false;
      var old = state.keys[id];
      KEY_ACTIONS.forEach(function (a) { if (a.id !== id && state.keys[a.id] === k) state.keys[a.id] = old; });
      state.keys[id] = k;
      var p = null;
      for (var pid in KEY_PRESETS) {
        if (KEY_ACTIONS.every(function (a) { return KEY_PRESETS[pid].keys[a.id] === state.keys[a.id]; })) p = pid;
      }
      state.layout = p || 'perso';
      persist();
      return true;
    },
    // L'action d'un appui : 's1'…'s5', 'auto' ou null. Sinon, les chiffres (rangée du haut ou pavé) restent les cases du deck.
    actionOf: function (e) {
      if (e.ctrlKey || e.altKey || e.metaKey) return null;
      var k = norm(e);
      for (var i = 0; i < KEY_ACTIONS.length; i++) if (state.keys[KEY_ACTIONS[i].id] === k) return KEY_ACTIONS[i].id;
      var d = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || '');
      return d ? 's' + d[1] : null;
    }
  };
})();
