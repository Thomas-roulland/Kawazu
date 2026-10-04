// L'arbitre : les vraies règles du jeu (src/*.js, chargées telles quelles dans un bac à sable), pour que le serveur ne
// croie plus le navigateur sur parole. Tout le jeu tourne dans le navigateur : n'importe qui peut y changer sa
// sauvegarde (la console, le localStorage, un fichier exporté) ou envoyer un faux résultat. Le serveur vérifie donc :
//   - chaque sauvegarde (checkSave) : rien au-delà de ce que le jeu peut donner (des objets plus forts que leur
//     modèle et leur rareté, des points de caractéristique ou de voie en trop, plus de 10 mutations, un cycle sauté,
//     des terres conquises dans le désordre, le bonus d'un clan qu'on n'a pas…) est remis d'aplomb ; et ce qui monte
//     bien plus vite que le jeu ne le permet (niveau, étapes, tour, points de saison, lucioles) est signalé ;
//   - un duel ou un combat de guerre gagné (duelOdds) : il rejoue le combat (les deux grenouilles jouées par
//     l'ordinateur, DUEL_SIMS fois) ; une victoire que l'ordinateur n'obtient presque jamais n'est pas crue ;
//   - les dégâts sur le Titan ou l'Alpha (raidCap) : au plus ce que la grenouille peut faire en ses tours comptés.
// Les règles de combat ci-dessous sont celles de src/battle.js (la même copie que le simulateur d'équilibrage) : si
// battle.js change, les reporter ici (les seuils sont larges, un petit écart ne gêne pas).
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const FILES = ['biomes', 'tiles', 'looks', 'colosses', 'archipel', 'royaume', 'eclipse', 'skills', 'items', 'worlds', 'tower', 'donjons', 'forge'];
const DUEL_SIMS = 60, DUEL_MIN = 0.03; // une victoire que l'ordinateur obtient moins de 3 fois sur 100 n'est pas crue
const RAID_SIMS = 30, RAID_MARGE = 1.3; // les dégâts d'un assaut : au plus 1,3 fois le meilleur des assauts rejoués

// ---------- Le jeu, dans un bac à sable (sans page : les dessins vont dans le vide) ----------
// (KAWAZU_ARBITRE=0 le coupe : les tests de concurrence, qui envoient des chiffres inventés, ou un souci en ligne)
let G = null, loadError = process.env.KAWAZU_ARBITRE === '0' ? 'coupé (KAWAZU_ARBITRE=0)' : null;
function load() {
  const fakeCtx = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {}, data: [] })), set: (t, k, v) => { t[k] = v; return true; } });
  const doc = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx(), toDataURL: () => '' }) };
  const quiet = { log() {}, warn() {}, error() {} };
  const ctx = vm.createContext({ document: doc, Math: Math, console: quiet, localStorage: { getItem() { return null; }, setItem() {} }, setTimeout: () => 0, clearTimeout() {} });
  ctx.window = ctx;
  FILES.forEach((f) => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx, { filename: f + '.js' }));
  return ctx;
}
if (!loadError) try { G = load(); } catch (e) { loadError = e.message; console.error('arbitre : le jeu ne se charge pas :', e); }
const ready = () => !!G;

// Les exemplaires d'objets enregistrés le temps d'un calcul (parseSave les ajoute au catalogue ITEMS) : retirés ensuite,
// pour que le catalogue ne grossisse pas d'une requête à l'autre
function withItems(fn) {
  const before = new Set(Object.keys(G.ITEMS).filter((k) => k.indexOf('#') >= 0));
  try { return fn(); } finally { Object.keys(G.ITEMS).forEach((k) => { if (k.indexOf('#') >= 0 && !before.has(k)) delete G.ITEMS[k]; }); }
}
const copy = (o) => JSON.parse(JSON.stringify(o));
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

// ---------- Les objets : le plus fort que chaque exemplaire peut être ----------
// (le tirage du jeu, rollItem : stat du modèle × rareté × « + » du cycle × 1,2 au mieux ; un Légendaire ne vient que
// d'un modèle légendaire ; les stats en plus restent petites, sauf celles d'un Unique : un quart de sa plus forte)
function itemCaps(inst, cycle) {
  const b = G.ITEMS[inst.base];
  if (!b || !inst.stats || typeof inst.stats !== 'object') return null;
  const plus = Math.max(0, Math.min(Math.floor(num(inst.plus)), cycle - 1)), boost = 1 + G.CYCLE.loot * plus, caps = {};
  let rar = inst.rar;
  if (rar === 'legendaire' && !b.legend) rar = 'epique';
  if (!G.RARITIES[rar]) rar = 'commun';
  if (rar === 'legendaire') { // ses poids × la force d'un accessoire de la terre la plus haute
    const unit = G.continentAcc(G.BIOMES.length - 1) * boost;
    Object.keys(b.weights).forEach((k) => { caps[k] = Math.ceil(b.weights[k] * unit * 1.08) + 1; });
    return { rar: rar, plus: plus, caps: caps, extra: 0 };
  }
  const R = G.RARITIES[rar];
  let top = 1;
  Object.keys(b.stats).forEach((k) => {
    const v = b.stats[k];
    caps[k] = v < 0 ? Math.round(v / 2) : Math.ceil(v * R.mult * boost * 1.2 * 1.02) + 1; // (une stat négative peut s'adoucir un peu avec les recalculs)
    if (caps[k] > top) top = caps[k];
  });
  return { rar: rar, plus: plus, caps: caps, extra: rar === 'unique' ? Math.ceil(top * 0.26) + 1 : Math.max(4, Math.ceil(top * 0.1)) };
}
// un exemplaire remis dans les bornes ; renvoie vrai s'il a fallu le corriger
function fixItem(inst, cycle) {
  const c = itemCaps(inst, cycle);
  if (!c) return false;
  let fixed = false;
  if (inst.rar !== c.rar) { inst.rar = c.rar; fixed = true; }
  if (num(inst.plus) !== c.plus) { if (c.plus) inst.plus = c.plus; else delete inst.plus; fixed = fixed || num(inst.plus) !== 0; }
  if (inst.forge != null && (num(inst.forge) < 0 || num(inst.forge) > G.FORGE_MAX)) { inst.forge = Math.max(0, Math.min(G.FORGE_MAX, Math.floor(num(inst.forge)))); fixed = true; }
  Object.keys(inst.stats).forEach((k) => {
    const v = num(inst.stats[k]), cap = c.caps[k] != null ? c.caps[k] : c.extra;
    if (v > cap) { inst.stats[k] = cap; fixed = true; }
  });
  return fixed;
}

// ---------- Une sauvegarde : ce qui est impossible est corrigé, ce qui va trop vite est signalé ----------
// prev : la sauvegarde d'avant (celle du serveur), ou null ; next : celle qui arrive ; ctx : { dt (ms depuis la
// précédente), clanBonus (le vrai bonus du clan de la grenouille) }. Renvoie { save, fixes, flags } : la sauvegarde à
// garder (next, corrigée), les corrections (impossible : la sauvegarde a été trafiquée) et les signaux (trop rapide :
// { r: la raison, p: son poids }).
function checkSave(prev, next, ctx) {
  if (!G) return { save: next, fixes: [], flags: [] };
  return withItems(() => {
    const raw = copy(next), fixes = [], flags = [], dt = Math.max(0, num(ctx.dt)) / 1000;
    const before = prev && typeof prev === 'object' ? G.parseSave(copy(prev)) : G.newSave();
    const fresh = !prev || typeof prev !== 'object';
    // le niveau, les points
    const MAXL = G.MAX_LEVEL;
    if (!(num(raw.level) >= 1)) raw.level = 1;
    if (raw.level > MAXL) { fixes.push('niveau ' + raw.level); raw.level = MAXL; }
    raw.level = Math.floor(raw.level);
    // les mutations : dix au plus, une à la fois, seulement depuis le niveau de mutation
    const mut = raw.mutation && typeof raw.mutation === 'object' ? raw.mutation : (raw.mutation = { n: 0, traits: {} });
    let n = Math.max(0, Math.floor(num(mut.n))), nPrev = (before.mutation && before.mutation.n) || 0;
    if (n > G.MUTATION_MAX) { fixes.push('mutations ' + n); n = G.MUTATION_MAX; }
    if (n > nPrev + 1 || (n > nPrev && before.level < G.MUTATION_LEVEL && !fresh)) { fixes.push('mutation sautée ' + nPrev + '→' + n); n = nPrev; mut.traits = copy((before.mutation && before.mutation.traits) || {}); }
    if (fresh && n > 0) { fixes.push('mutations sans partie ' + n); n = 0; mut.traits = {}; }
    mut.n = n;
    mut.traits = mut.traits && typeof mut.traits === 'object' ? mut.traits : {};
    let traits = 0;
    Object.keys(mut.traits).forEach((k) => { const v = Math.max(0, Math.floor(num(mut.traits[k]))); const keep = Math.min(v, n - traits); if (keep !== v) fixes.push('trait ' + k); if (keep > 0) mut.traits[k] = keep; else delete mut.traits[k]; traits += keep; });
    // le cycle : un à la fois, et seulement une fois le monde vaincu
    let cyc = Math.max(1, Math.floor(num(raw.cycle) || 1)), cPrev = before.cycle || 1;
    if (cyc > cPrev + 1 || (cyc > cPrev && !G.worldDone(before))) { fixes.push('cycle ' + cPrev + '→' + cyc); cyc = cPrev; }
    raw.cycle = cyc;
    // les terres : chacune s'ouvre quand la précédente est finie
    if (Array.isArray(raw.progress)) {
      let open = true;
      raw.progress = raw.progress.slice(0, G.BIOMES.length).map((p, i) => {
        let v = Math.max(0, Math.min(G.STAGES, Math.floor(num(p))));
        if (!open && v > 0) { fixes.push('terre ' + (i + 1) + ' sans la précédente'); v = 0; }
        open = v >= G.STAGES;
        return v;
      });
    }
    // les points de caractéristique (3 par niveau gagné) et de voie (1 par niveau)
    const alloc = raw.alloc && typeof raw.alloc === 'object' ? raw.alloc : (raw.alloc = {});
    let spent = 0;
    Object.keys(alloc).forEach((k) => { alloc[k] = Math.max(0, Math.floor(num(alloc[k]))); spent += alloc[k]; });
    raw.points = Math.max(0, Math.floor(num(raw.points)));
    const allowed = (raw.level - 1) * G.POINTS_PER_LEVEL;
    if (spent + raw.points > allowed) {
      fixes.push('points ' + (spent + raw.points) + ' / ' + allowed);
      raw.points = Math.max(0, allowed - spent);
      if (spent > allowed) { const k = allowed / spent; let left = allowed; Object.keys(alloc).forEach((s) => { alloc[s] = Math.min(left, Math.floor(alloc[s] * k)); left -= alloc[s]; }); }
    }
    raw.skillPoints = Math.max(0, Math.floor(num(raw.skillPoints)));
    if (Array.isArray(raw.tree)) {
      const tree = raw.tree.filter((id) => typeof id === 'string'), cost = () => tree.reduce((s, id) => { const nd = G.nodeById(id); return s + (nd ? nd.cost : 0); }, 0);
      if (cost() + raw.skillPoints > raw.level - 1) {
        fixes.push('points de voie ' + (cost() + raw.skillPoints) + ' / ' + (raw.level - 1));
        while (tree.length && cost() > raw.level - 1) tree.pop(); // les dernières dalles apprises s'en vont
        raw.skillPoints = Math.max(0, raw.level - 1 - cost());
      }
      raw.tree = tree;
    }
    // les objets
    const items = raw.items && typeof raw.items === 'object' ? raw.items : {};
    let badItems = 0;
    Object.keys(items).forEach((id) => { if (items[id] && typeof items[id] === 'object' && fixItem(items[id], cyc)) badItems++; });
    if (badItems) fixes.push(badItems + ' objet' + (badItems > 1 ? 's' : '') + ' trop fort' + (badItems > 1 ? 's' : ''));
    // le bonus du clan : celui du vrai clan de la grenouille
    if (ctx.clanBonus) {
      const cb = raw.clanBonus || {}, real = ctx.clanBonus;
      if (Object.keys(real).some((k) => num(cb[k]) > num(real[k]) + 1e-9)) fixes.push('bonus de clan');
      raw.clanBonus = copy(real);
    }
    // ce qui monte trop vite (signalé, pas corrigé : un oubli de l'arbitre ne doit pas coûter sa partie à personne)
    // (une grenouille toute neuve part d'une partie neuve, dt depuis sa création : envoyer d'emblée une partie avancée,
    // c'est la triche la plus simple ; chaque signal pèse 1, ou 3 quand il dépasse dix fois ce que le jeu permet)
    const after = G.parseSave(copy(raw)), conq = (s) => s.progress.reduce((a, p) => a + p, 0), secs = Math.round(dt) + ' s';
    const rate = (label, delta, allowed) => { if (delta > allowed) flags.push({ r: label + ' +' + delta + ' en ' + secs, p: delta > allowed * 10 ? 3 : 1 }); };
    if (after.mutation.n === nPrev && after.cycle === cPrev) rate('niveau', after.level - before.level, 5 + dt / 15);
    if (after.cycle === cPrev) rate('étapes', conq(after) - conq(before), 5 + dt / 2);
    rate('tour', after.tower - before.tower, 5 + dt / 2);
    if (after.season && after.season.id === ((before.season && before.season.id) || after.season.id)) rate('saison', after.season.pts - ((before.season && before.season.id === after.season.id && before.season.pts) || 0), 500 + dt * 5);
    rate('lucioles', after.gold - before.gold, 1e7 + dt * 1e4);
    rate('éclats', after.eclats - before.eclats, 1e5 + dt * 100);
    return { save: raw, fixes: fixes, flags: flags };
  });
}

// ---------- Les combats rejoués (la copie des règles de src/battle.js) ----------
const R = Math.random;
const alive = (f) => f.hp > 0;
const heal = (f, n) => { f.hp = Math.min(f.maxHp, f.hp + Math.max(0, Math.round(n))); };
const fresh = () => ({ cds: {}, guard: 0, counter: 0, buff: 0, buffFresh: false, shadow: false, shadowCrit: false, poison: 0, poisonDmg: 0, bleed: 0, bleedDmg: 0, mark: 0, weaken: 0, stun: 0, shield: 0, riposteDue: false });
// une grenouille prête à combattre, à partir d'une sauvegarde déjà lue par le jeu (parseSave)
function frogFighter(save, duel) {
  G.setPlayer(save);
  const w = G.weaponOf(save.equip), pr = G.combatProfile(save, duel);
  const f = Object.assign(fresh(), { hp: pr.maxHp, maxHp: pr.maxHp, dmg: pr.dmg, crit: pr.crit, critMult: pr.critMult, dodge: pr.dodge, agi: pr.agi,
    spell: pr.spell, cdr: pr.cdr, pas: pr.pas, dmgReduce: pr.dmgReduce, skills: G.deckSkills(save, w), frog: true });
  if (f.pas.shield) f.shield = Math.round(f.maxHp * f.pas.shield);
  return f;
}
// la grenouille d'en face, telle que le jeu la monte à partir de sa fiche de combat (dojoFighter, src/hub.js)
function cardSave(card) {
  Object.keys(card.items || {}).forEach((id) => { G.registerItem(id, card.items[id]); });
  const s = G.newSave();
  const equip = Object.assign({}, G.DEFAULT_EQUIP); // (cleanEquip, src/hub.js : chaque objet à sa place, sinon son modèle)
  Object.keys(card.equip || {}).forEach((slot) => { const v = card.equip[slot], id = G.ITEMS[v] ? v : G.baseOf(v), it = G.ITEMS[id]; if (it && it.slot === slot) equip[slot] = id; });
  s.level = card.niveau; s.voie = card.voie; s.deck = (card.deck || []).slice(); s.equip = equip;
  s.hero = { name: card.nom, skin: card.peau };
  s.alloc = Object.assign({ vitalite: 0, agilite: 0, force: 0, esprit: 0 }, card.alloc);
  s.tree = (card.tree || []).filter((id) => { const nd = G.nodeById(id); return nd && nd.voie === card.voie; });
  return s;
}
function monster(en) { return Object.assign(fresh(), en, { hp: en.hp0 != null ? en.hp0 : en.maxHp, crit: 0.05, critMult: 1.5, spell: 1, cdr: 0, pas: G.emptyPassives(), dmgReduce: en.dmgReduce || 0, turn: 0, frog: false }); }
function strike(att, def, mult, o) {
  o = o || {};
  let dodge = def.dodge;
  if (def.shadow) { def.shadow = false; dodge = 1; } else if (o.sure) dodge = 0;
  if (R() < dodge) return 0;
  const crit = o.crit || R() < att.crit + (o.critBonus || 0);
  let dmg = att.dmg * mult * (att.buff > 0 ? 1.4 : 1) * (crit ? att.critMult : 1) * (0.9 + R() * 0.2);
  if (att.weaken > 0) dmg *= 0.7;
  if (def.mark > 0) dmg *= 1.3;
  if (att.pas.execute && def.hp < def.maxHp * 0.3) dmg *= 1 + att.pas.execute;
  if (!o.pierce) { if (def.guard > 0) dmg *= 0.5; dmg *= 1 - (def.dmgReduce || 0); }
  dmg = Math.max(1, Math.round(dmg));
  let taken = dmg;
  if (def.shield > 0) { const ab = Math.min(def.shield, dmg); def.shield -= ab; taken -= ab; }
  def.hp -= taken;
  if (att.pas.lifesteal) heal(att, dmg * att.pas.lifesteal);
  if (def.hp > 0 && !o.noRiposte && (def.counter > 0 || R() < def.pas.riposte)) def.riposteDue = true;
  return dmg;
}
function afterHit(att, def, s, dealt) {
  if (s.drain) heal(att, dealt * s.drain);
  if (!alive(def)) return;
  if (s.stun && !def.stunImmune && R() < s.stun + att.pas.stunChance) def.stun = 1;
  if (s.bleed) { def.bleed = s.bleed; def.bleedDmg = Math.max(1, Math.round(att.dmg * 0.3 * (1 + att.pas.bleedMult))); }
  if (s.poison) { def.poison = s.poison; def.poisonDmg = Math.max(1, Math.round(att.dmg * 0.35 * (1 + att.pas.poisonMult))); }
  if (s.mark) def.mark = s.mark;
  if (s.weaken) def.weaken = s.weaken;
}
function perform(att, def, s) {
  const cd = G.skillCd(s, att.cdr);
  if (cd) att.cds[s.id] = cd + 1;
  let crit = false;
  if (att.shadowCrit && s.power > 0) { crit = true; att.shadowCrit = false; }
  const k = s.base ? 1 : att.spell;
  if (s.heal) heal(att, att.maxHp * s.heal);
  if (s.cleanse) { att.poison = 0; att.bleed = 0; att.stun = 0; }
  if (s.guard) { att.guard = s.guard; if (s.counter) att.counter = s.guard; }
  if (s.shadow) { att.shadow = true; att.shadowCrit = true; }
  if (s.buff) { att.buff = s.buff; att.buffFresh = true; }
  const mult = s.power * k, sure = s.voie === 'kunai' || !!s.sure;
  const hit = (i, extra) => { if (!alive(def)) return 0; const d = strike(att, def, mult * (extra || 1), { sure: sure, pierce: s.pierce, crit: crit && i === 0, critBonus: s.critBonus }); if (d) afterHit(att, def, s, d); return d; };
  if (s.power > 0) {
    for (let i = 0; i < s.hits && alive(def); i++) hit(i);
    if (s.hits === 1 && att.pas.multiHit && alive(def) && R() < att.pas.multiHit) hit(1, 0.5);
  }
  if (s.weaken && s.power === 0 && alive(def)) def.weaken = s.weaken;
  if (s.shadowAfter) att.shadow = true;
}
function ripostes(att, def) {
  if (!def.riposteDue || !alive(def) || !alive(att)) { def.riposteDue = false; return; }
  def.riposteDue = false;
  strike(def, att, def.counter > 0 ? 0.8 : 0.5, { sure: true, noRiposte: true });
}
function aiPick(f, foe, isHero) {
  const list = f.skills.filter((s) => !(f.cds[s.id] > 0)), pick = (fn) => list.filter(fn)[0];
  if (f.hp < f.maxHp * 0.4) { const h = pick((s) => s.heal); if (h) return h; }
  if ((f.poison || f.bleed) && f.hp < f.maxHp * 0.7) { const c = pick((s) => s.cleanse); if (c) return c; }
  if (foe.charging || (!isHero && R() < 0.2)) { const d = pick((s) => (s.guard || s.shadow) && !f.guard && !f.shadow); if (d) return d; }
  if (!f.buff) { const b = pick((s) => s.buff); if (b && foe.hp > f.dmg * 3) return b; }
  if (!foe.mark) { const m = pick((s) => s.mark); if (m && foe.hp > f.dmg * 3) return m; }
  const score = (s) => s.power * s.hits * (s.base ? 1 : f.spell) * (1 + (s.stun || 0) * 0.3 + (s.bleed || s.poison ? 0.25 : 0) + (s.weaken && !foe.weaken ? 0.2 : 0));
  const atk = list.filter((s) => s.power > 0).sort((a, b) => score(b) - score(a));
  return atk[0] || list[0];
}
function turnStart(f) {
  Object.keys(f.cds).forEach((k) => { if (f.cds[k] > 0) f.cds[k]--; });
  if (f.pas.flow && R() < f.pas.flow) Object.keys(f.cds).forEach((k) => { if (f.cds[k] > 0) f.cds[k]--; });
  if (f.pas.regenHp && f.hp < f.maxHp) heal(f, f.maxHp * f.pas.regenHp);
  if (f.poison > 0) { f.poison--; f.hp -= f.poisonDmg; }
  if (f.hp > 0 && f.bleed > 0) { f.bleed--; f.hp -= f.bleedDmg; }
  if (f.hp <= 0) return 'dead';
  if (f.stun > 0) { f.stun--; f.stunImmune = 2; return 'stun'; }
  return 'ok';
}
function turnEnd(f, other) {
  if (other.guard > 0) other.guard--;
  if (other.counter > 0) other.counter--;
  if (f.weaken > 0) f.weaken--;
  if (f.mark > 0) f.mark--;
  if (f.buff > 0 && !f.buffFresh) f.buff--;
  if (f.stunImmune > 0) f.stunImmune--;
  f.buffFresh = false;
}
function monsterAct(E, P) {
  E.turn++;
  const LP = G.LORD_PHASES;
  if (E.lord) {
    if (!E.lordShield && E.hp < E.maxHp * LP.shield) { E.lordShield = true; E.shield = Math.round(E.maxHp * LP.shieldPart); }
    if (!E.enraged && E.hp < E.maxHp * LP.total) E.enraged = true;
  } else if (E.rank === 'boss' && !E.enraged && E.hp < E.maxHp * 0.5) E.enraged = true;
  const dmgMult = E.enraged ? (E.lord ? LP.totalDmg : 1.3) : 1;
  let move = 'normal';
  if (E.charging) { move = 'charge'; E.charging = false; }
  else if ((E.behavior === 'dasher' || E.rank === 'boss') && E.turn % 3 === 0) { E.charging = true; return; }
  else if (E.behavior === 'flyer' && R() < 0.3) move = 'drain';
  else if (E.behavior === 'walker' && E.turn % 3 === 0) move = 'glue';
  const d = strike(E, P, dmgMult * (move === 'charge' ? 1.8 : 1), {});
  if (d && move === 'drain') heal(E, d * 0.5);
  if (d && E.lord && E.enraged) heal(E, d * LP.drain);
  if (d && move === 'glue') Object.keys(P.cds).forEach((k) => { if (P.cds[k] > 0) P.cds[k]++; });
}
// un combat ; heroTurns : le nombre de tours de la grenouille (un assaut aux tours comptés) ; renvoie { win, dealt }
function fight(P, E, heroTurns) {
  const hp0 = E.hp, a = Math.max(1, P.agi), b = Math.max(1, E.agi);
  let pTurn = R() < a / (a + b), turn = 0, mine = 0;
  const out = (win) => ({ win: win, dealt: hp0 - Math.max(0, E.hp) + (E.hp < 0 ? -E.hp : 0) });
  while (turn++ < 200) {
    if (pTurn) {
      const st = turnStart(P);
      if (st === 'dead') return out(false);
      if (st === 'ok') { perform(P, E, aiPick(P, E, true)); ripostes(P, E); if (P.hp <= 0) return out(false); if (E.hp <= 0) return out(true); }
      turnEnd(P, E);
      if (heroTurns && ++mine >= heroTurns) return out(false);
    } else {
      const st = turnStart(E);
      if (st === 'dead') return out(true);
      if (st === 'ok') {
        if (E.frog) perform(E, P, aiPick(E, P, false)); else monsterAct(E, P);
        ripostes(E, P);
        if (E.hp <= 0) return out(true);
        if (P.hp <= 0) return out(false);
      }
      turnEnd(E, P);
    }
    pTurn = !pTurn;
  }
  return out(false);
}

// La part de duels que la grenouille (sa sauvegarde) gagne contre celle d'en face (sa fiche de combat), l'ordinateur
// jouant les deux, ou null si l'arbitre ne peut pas juger
function duelOdds(mySave, oppCard) {
  if (!G) return null;
  try {
    return withItems(() => {
      const me = G.parseSave(copy(mySave)), opp = cardSave(oppCard);
      let wins = 0;
      for (let i = 0; i < DUEL_SIMS; i++) if (fight(frogFighter(me, true), frogFighter(opp, true)).win) wins++;
      return wins / DUEL_SIMS;
    });
  } catch (e) { console.error('arbitre (duel) :', e.message); return null; }
}
// Les dégâts au plus qu'une grenouille fait en ses tours comptés contre le Titan ou l'Alpha (enemy : titanOf ou alphaOf
// à son niveau, par le nom de la fonction et ses arguments), ou null
function raidCap(mySave, kind, args, turns) {
  if (!G) return null;
  try {
    return withItems(() => {
      const me = G.parseSave(copy(mySave)), en = (kind === 'titan' ? G.titanOf : G.alphaOf).apply(null, args.concat([me.level]));
      let best = 0;
      for (let i = 0; i < RAID_SIMS; i++) {
        const E = monster(Object.assign({}, en, { maxHp: 1e12, hp0: 1e12 }));
        best = Math.max(best, fight(frogFighter(me, false), E, turns).dealt);
      }
      return Math.ceil(best * RAID_MARGE) + 100;
    });
  } catch (e) { console.error('arbitre (assaut) :', e.message); return null; }
}

module.exports = { ready: ready, loadError: () => loadError, checkSave: checkSave, duelOdds: duelOdds, raidCap: raidCap, itemCaps: (inst, cycle) => (G ? withItems(() => itemCaps(inst, cycle || 1)) : null) };
