/* Evolvlings: expeditions and skill cards (RPG mode, part A).
   Loaded after the main game script, which exposes window.EV.
   The battle engine at the top has no DOM dependencies so it can be tested in Node. */
(function (root) {
"use strict";

/* ====================================================================== */
/* Types of the Glade: 12 in 4 circles of 3, plus Star (cards only)       */
/* ====================================================================== */
const TYPES = {
  fire:   { icon: "🔥", circle: "sol",  day: true,  es: "Fuego",  en: "Fire" },
  plant:  { icon: "🌿", circle: "sol",  day: true,  es: "Planta", en: "Plant" },
  light:  { icon: "☀️", circle: "sol",  day: true,  es: "Luz",    en: "Light" },
  bolt:   { icon: "⚡", circle: "sky",  day: true,  es: "Rayo",   en: "Bolt" },
  air:    { icon: "🌬️", circle: "sky",  day: true,  es: "Aire",   en: "Air" },
  music:  { icon: "🎵", circle: "sky",  day: true,  es: "Música", en: "Music" },
  water:  { icon: "💧", circle: "lake", day: false, es: "Agua",   en: "Water" },
  stone:  { icon: "🪨", circle: "lake", day: false, es: "Piedra", en: "Stone" },
  shadow: { icon: "🌙", circle: "lake", day: false, es: "Sombra", en: "Shadow" },
  ice:    { icon: "❄️", circle: "frost", day: false, es: "Hielo", en: "Ice" },
  mush:   { icon: "🍄", circle: "frost", day: false, es: "Seta",  en: "Mushroom" },
  dream:  { icon: "💤", circle: "frost", day: false, es: "Sueño", en: "Dream" },
  star:   { icon: "✦",  circle: null,   day: null,  es: "Estrella", en: "Star" },
};
// each type beats the next one in its circle
const BEATS = { fire: "plant", plant: "light", light: "fire", bolt: "air", air: "music", music: "bolt",
  water: "stone", stone: "shadow", shadow: "water", ice: "mush", mush: "dream", dream: "ice" };
const OPPOSITE = { light: "shadow", shadow: "light", fire: "water", water: "fire", plant: "mush", mush: "plant",
  air: "stone", stone: "air", bolt: "ice", ice: "bolt", music: "dream", dream: "music" };

function typeMult(atk, def) {
  if (!TYPES[atk] || atk === "star" || def === "star") return 1;
  if (BEATS[atk] === def) return 1.5;
  if (BEATS[def] === atk) return 0.75;
  if (OPPOSITE[atk] === def) return 1.25;
  if (atk === def) return 0.75;
  return 1;
}
function isDayNow(d) { const h = (d || new Date()).getHours(); return h >= 7 && h < 19; }

/* ====================================================================== */
/* Grades                                                                 */
/* ====================================================================== */
const GRADES = [
  { id: "c",  mult: 1.00, dur: 0, cd: 0, trade: 1.0,  w: 55,  es: "Común",      en: "Common",     col: "#8a9580" },
  { id: "r",  mult: 1.20, dur: 0, cd: 0, trade: 0.9,  w: 25,  es: "Rara",       en: "Rare",       col: "#3f8fc9" },
  { id: "vr", mult: 1.40, dur: 1, cd: 1, trade: 0.8,  w: 12,  es: "Muy rara",   en: "Very rare",  col: "#4c9a3c" },
  { id: "sr", mult: 1.65, dur: 1, cd: 1, trade: 0.65, w: 5,   es: "Súper rara", en: "Super rare", col: "#8a55d6" },
  { id: "ep", mult: 1.95, dur: 2, cd: 2, trade: 0.5,  w: 2.5, es: "Épica",      en: "Epic",       col: "#d0612c" },
  { id: "lg", mult: 2.30, dur: 2, cd: 2, trade: 0.4,  w: 0.5, es: "Legendaria", en: "Legendary",  col: "#d4a017" },
];
function rollGrade(minIdx, rnd) {
  rnd = rnd || Math.random;
  const pool = GRADES.slice(minIdx || 0);
  const tot = pool.reduce((a, g) => a + g.w, 0);
  let r = rnd() * tot;
  for (const g of pool) { r -= g.w; if (r <= 0) return GRADES.indexOf(g); }
  return GRADES.indexOf(pool[pool.length - 1]);
}

/* ====================================================================== */
/* Statuses                                                               */
/* ====================================================================== */
// neg: negative statuses (cleansable). v: default value.
const STATUS = {
  burn:    { neg: true,  icon: "🔥", v: 6,  es: "Quemado",   en: "Burned" },
  soak:    { neg: true,  icon: "💧", v: 30, es: "Empapado",  en: "Soaked" },
  trap:    { neg: true,  icon: "🌿", v: 0,  es: "Atrapado",  en: "Trapped" },
  stun:    { neg: true,  icon: "💫", v: 0,  es: "Aturdido",  en: "Stunned" },
  blind:   { neg: true,  icon: "✴️", v: 50, es: "Cegado",    en: "Blinded" },
  slow:    { neg: true,  icon: "🐌", v: 30, es: "Lento",     en: "Slowed" },
  dull:    { neg: true,  icon: "☁️", v: 10, es: "Adormilado", en: "Drowsy" },
  cheer:   { neg: false, icon: "✨", v: 20, es: "Ánimo",     en: "Cheer" },
  guard:   { neg: false, icon: "🛡️", v: 20, es: "Guardia",   en: "Guard" },
  fury:    { neg: false, icon: "💢", v: 10, es: "Brío",      en: "Vigor" },
  might:   { neg: false, icon: "💪", v: 10, es: "Empuje",    en: "Boost" },
  regen:   { neg: false, icon: "🌱", v: 8,  es: "Siembra",   en: "Sprout" },
  haste:   { neg: false, icon: "💨", v: 20, es: "Prisa",     en: "Haste" },
  cushion: { neg: false, icon: "☁️", v: 50, es: "Mullido",   en: "Cushioned" },
};

/* ====================================================================== */
/* Cards. Values are for grade Común; the grade scales them.              */
/*  p: passive mods  a: active  s: support trigger                         */
/*  Positive numbers scale with value mult, negative ones with tradeoff.   */
/* ====================================================================== */
const CARDS = {
  // Lumo
  flash:    { type: "light", by: "lumo", p: { spd: 10 }, a: { cd: 3, tgt: "foe", pow: 110, st: ["blind", 1, 1] }, s: { on: "start", fx: { tgt: "fastestFoe", st: ["blind", 1, 1] } } },
  lantern:  { type: "light", by: "lumo", p: { crit: 12, lowFun: -12 }, a: { cd: 3, tgt: "ally", heal: 15, cleanse: "blind" }, s: { on: "allyStatus", status: "blind", fx: { tgt: "theAlly", cleanse: "blind" } } },
  spark:    { type: "light", by: "lumo", p: { critSpark: 5 }, a: { cd: 3, tgt: "allyOther", st: ["cheer", 2, 1] }, s: { on: "allyLow", pct: 50, fx: { tgt: "theAlly", st: ["cheer", 2, 1] } } },
  // Fizz
  gust:     { type: "air", by: "fizz", p: { spd: 10, str: -5 }, a: { cd: 3, tgt: "rand", hits: 3, pow: 40, st: ["slow", 1, 0.2] }, s: { on: "start", fx: { tgt: "slowAlly", st: ["haste", 1, 1] } } },
  cloud:    { type: "air", by: "fizz", p: { dodge: 12 }, a: { cd: 3, tgt: "ally", st: ["cushion", 2, 1] }, s: { on: "allyLethal" } },
  rain:     { type: "air", by: "fizz", p: { stShort: 1 }, a: { cd: 5, tgt: "allies", cleanse: "one" }, s: { on: "every", n: 4, fx: { tgt: "debuffedAlly", cleanse: "longest" } } },
  // Pebb
  throw:    { type: "stone", by: "pebb", p: { vsShield: 10 }, a: { cd: 3, tgt: "foe", pow: 120, breakShield: 1 }, s: { on: "foeShield" } },
  stubborn: { type: "stone", by: "pebb", p: { hp: 12, spd: -8 }, a: { cd: 3, tgt: "foe", pow: 100, selfSt: ["guard", 2, 1, 10] }, s: { on: "allyLow", pct: 40, fx: { tgt: "theAlly", st: ["guard", 2, 1, 20] } } },
  promise:  { type: "stone", by: "pebb", p: { shieldLong: 1 }, a: { cd: 4, tgt: "selfAlly", shield: [20, 2] }, s: { on: "start", fx: { tgt: "lowAlly", shield: [15, 2] } } },
  // Fuellito
  bellows:  { type: "fire", by: "fuellito", p: { onHit: ["burn", 2, 0.1] }, a: { cd: 3, tgt: "foe", pow: 80, st: ["burn", 3, 1] }, s: { on: "start", fx: { tgt: "fireAlly", st: ["fury", 3, 1, 10] } } },
  bread:    { type: "fire", by: "fuellito", p: { hp: 10 }, a: { cd: 4, tgt: "allies", heal: 12, cleanse: "soak" }, s: { on: "win", heal: 5 } },
  piece:    { type: "fire", by: "fuellito", p: { firstHit: 30 }, a: { cd: 4, tgt: "foe", pow: 140 }, s: { on: "start", fx: { tgt: "wildAllies", st: ["might", 99, 1, 10] } } },
  // Brotín
  acorn:    { type: "plant", by: "brotin", p: { vsHigher: 10 }, a: { cd: 3, tgt: "foe", pow: 120, drain: 20 }, s: { on: "allyStatus", status: "trap", fx: { tgt: "theAlly", cleanse: "trap" } } },
  rings:    { type: "plant", by: "brotin", p: { defRound: 3 }, a: { cd: 3, tgt: "foe", pow: 70, st: ["slow", 2, 1] }, s: { on: "round", n: 6, fx: { tgt: "allies", st: ["fury", 99, 1, 10] } } },
  seedling: { type: "plant", by: "brotin", p: { def: 5, healRecv: 5 }, a: { cd: 3, tgt: "ally", st: ["regen", 3, 1, 8] }, s: { on: "start", fx: { tgt: "allies", shield: [5, 3] } } },
  // Remolín
  whirl:    { type: "water", by: "remolin", p: { spd: 8 }, a: { cd: 3, tgt: "foe", pow: 90, st: ["soak", 2, 1] }, s: { on: "start", fx: { tgt: "fireFoe", st: ["soak", 2, 1] } } },
  vessel:   { type: "water", by: "remolin", p: { resistAdv: 15 }, a: { cd: 4, tgt: "foes", pow: 60 }, s: { on: "allyHitAdv", n: 2, v: 15 } },
  guest:    { type: "water", by: "remolin", p: { healRecv: 10 }, a: { cd: 3, tgt: "ally", heal: 18 }, s: { on: "allyStatus", status: "burn", fx: { tgt: "theAlly", cleanse: "burn" } } },
  // Bostezo
  yawn:     { type: "dream", by: "bostezo", p: { onHitBy: ["slow", 1, 0.1] }, a: { cd: 4, tgt: "foe", st: ["stun", 1, 1], skipNext: 1 }, s: { on: "start", fx: { tgt: "randFoe", st: ["slow", 2, 1] } } },
  pillow:   { type: "dream", by: "bostezo", p: { critImmune: 1 }, a: { cd: 3, tgt: "foe", pow: 100, st: ["dull", 2, 1, 10] }, s: { on: "allyCrit", fx: { tgt: "theAlly", st: ["cushion", 2, 1, 30] } } },
  tale:     { type: "dream", by: "bostezo", p: { hp: 15, spd: -10 }, a: { cd: 4, tgt: "allies", heal: 10 }, s: { on: "start", fx: { tgt: "lowAlly", heal: 15 } } },
  // El Gran Farol (guardian only, never drops)
  beam:     { type: "light", by: "farol", boss: true, p: { dmg: 10 }, a: { cd: 4, tgt: "foes", pow: 100, st: ["blind", 1, 1] }, s: { on: "start", fx: { tgt: "foes", st: ["slow", 2, 1, 10] } } },
  pride:    { type: "light", by: "farol", boss: true, p: { dmg: 15 }, a: { cd: 3, tgt: "foe", pow: 130 }, s: { on: "allyLow", pct: 50, fx: { tgt: "self", shield: [20, 2] } } },
  law:      { type: "light", by: "farol", boss: true, p: { spd: 10 }, a: { cd: 4, tgt: "foes", st: ["slow", 2, 1, 10] }, s: { on: "start", fx: { tgt: "foes", st: ["slow", 2, 1, 10] } } },
};
const DROP_POOL = Object.keys(CARDS).filter((k) => !CARDS[k].boss);

// scale a numeric spec value by grade (positive → value mult, negative → tradeoff)
function sv(v, g) { return v >= 0 ? Math.round(v * g.mult) : Math.round(v * g.trade); }
function scaleStatus(st, g) {
  if (!st) return null;
  const [name, turns, chance, val] = st;
  return [name, turns >= 99 ? 99 : turns + g.dur, Math.min(1, chance * (chance < 1 ? g.mult : 1)), val != null ? sv(val, g) : STATUS[name].v];
}
function scaled(id, gi) {
  const c = CARDS[id], g = GRADES[gi || 0];
  const p = {};
  for (const k in c.p) {
    const v = c.p[k];
    if (Array.isArray(v)) p[k] = scaleStatus(v, g);
    else if (k === "stShort" || k === "shieldLong" || k === "critImmune") p[k] = v + (g.dur > 0 && k !== "critImmune" ? g.dur : 0);
    else p[k] = sv(v, g);
  }
  const a = Object.assign({}, c.a);
  a.cd = Math.max(1, c.a.cd - g.cd);
  if (a.pow) a.pow = sv(a.pow, g);
  if (a.heal) a.heal = sv(a.heal, g);
  if (a.drain) a.drain = sv(a.drain, g);
  if (a.shield) a.shield = [sv(a.shield[0], g), a.shield[1] + g.dur];
  if (a.st) a.st = scaleStatus(a.st, g);
  if (a.selfSt) a.selfSt = scaleStatus(a.selfSt, g);
  const s = Object.assign({}, c.s);
  if (s.heal) s.heal = sv(s.heal, g);
  if (s.v) s.v = sv(s.v, g);
  if (s.n && s.on === "allyHitAdv") s.n = s.n + g.dur;
  if (s.n && s.on === "every") s.n = Math.max(2, s.n - g.cd);
  if (s.fx) {
    s.fx = Object.assign({}, s.fx);
    if (s.fx.st) s.fx.st = scaleStatus(s.fx.st, g);
    if (s.fx.shield) s.fx.shield = [sv(s.fx.shield[0], g), s.fx.shield[1] + g.dur];
    if (s.fx.heal) s.fx.heal = sv(s.fx.heal, g);
  }
  return { id, type: c.type, grade: gi || 0, p, a, s };
}

/* ====================================================================== */
/* Creatures for battle (stats at level 1 before care; from the cards doc) */
/* hp = Vida, str = Fuerza, def = Defensa, spd = Velocidad, cr = Ánimo     */
/* ====================================================================== */
const MONS = {
  lumo:     { types: ["light"], rar: 0, st: { hp: 38, str: 40, def: 32, spd: 50, cr: 40 }, cards: ["flash", "lantern", "spark"], adult: { bright: "air", scruffy: "shadow" } },
  fizz:     { types: ["air"],   rar: 0, st: { hp: 36, str: 34, def: 30, spd: 56, cr: 44 }, cards: ["gust", "cloud", "rain"],      adult: { bright: "light", scruffy: "water" } },
  pebb:     { types: ["stone"], rar: 0, st: { hp: 50, str: 40, def: 52, spd: 24, cr: 34 }, cards: ["throw", "stubborn", "promise"], adult: { bright: "plant", scruffy: "shadow" } },
  fuellito: { types: ["fire"],  rar: 0, st: { hp: 38, str: 48, def: 30, spd: 46, cr: 38 }, cards: ["bellows", "bread", "piece"] },
  brotin:   { types: ["plant"], rar: 0, st: { hp: 46, str: 36, def: 42, spd: 34, cr: 42 }, cards: ["acorn", "rings", "seedling"] },
  remolin:  { types: ["water"], rar: 0, st: { hp: 44, str: 40, def: 36, spd: 44, cr: 36 }, cards: ["whirl", "vessel", "guest"] },
  bostezo:  { types: ["dream"], rar: 0, st: { hp: 52, str: 34, def: 40, spd: 30, cr: 44 }, cards: ["yawn", "pillow", "tale"] },
  farol:    { types: ["light"], rar: 3, st: { hp: 150, str: 42, def: 40, spd: 34, cr: 30 }, cards: ["beam", "pride", "law"], boss: true },
};
const lvlScale = (lvl) => 1 + 0.1 * (lvl - 1);
const xpNeed = (lvl) => 20 + 15 * lvl;
const SLOT_LVL = { a: 1, p: 4, s: 8 };

/* Build a battle unit.
   o: { kind, lvl, side, name, own, wild, hollow, care: {full,fun,energy,clean,health}, stage, form, cards: {a,p,s} (scaled), hpPct, boss } */
function makeUnit(o) {
  const m = MONS[o.kind];
  const sc = lvlScale(o.lvl);
  const careF = (k) => (o.care ? 0.75 + 0.5 * (o.care[k] || 0) / 100 : 1);
  const stageF = o.stage === 2 ? (o.form === "bright" ? 1.15 : 1.1) : 1;
  const hollowF = o.hollow ? 0.8 : 1;
  const base = {
    hp: m.st.hp * 3 * sc * careF("health") * stageF * hollowF,
    str: m.st.str * sc * careF("full") * stageF * hollowF,
    def: m.st.def * sc * careF("clean") * stageF * hollowF,
    spd: m.st.spd * sc * careF("energy") * stageF,
    cr: m.st.cr * careF("fun"),
  };
  const types = m.types.slice();
  if (o.stage === 2 && m.adult && o.form && m.adult[o.form]) types.push(m.adult[o.form]);
  const pm = (o.cards && o.cards.p && o.cards.p.p) || {};
  const maxHp = Math.round(base.hp * (1 + (pm.hp || 0) / 100));
  const u = {
    uid: Math.random().toString(36).slice(2, 9), kind: o.kind, name: o.name, side: o.side, own: !!o.own, wild: !!o.wild, hollow: !!o.hollow, boss: !!o.boss,
    lvl: o.lvl, types, stage: o.stage == null ? 1 : o.stage, form: o.form || "bright",
    base, maxHp, hp: Math.max(1, Math.round(maxHp * (o.hpPct == null ? 1 : o.hpPct))),
    crit: Math.min(40, base.cr / 4) + (pm.crit || 0) + (o.lowFun && pm.lowFun ? pm.lowFun : 0),
    dodge: Math.max(0, base.spd / 20 + (pm.dodge || 0)),
    mods: pm, cards: o.cards || {}, cd: 0, st: {}, shield: 0, shieldT: 0, hitOnce: false, skip: 0, sUsed: false, sCount: 0, hitsTaken: 0,
  };
  if (u.cards.a) u.cd = Math.ceil(u.cards.a.a.cd / 2);
  if (o.hpPct === 0) { u.hp = 0; }
  return u;
}

/* ====================================================================== */
/* Battle engine                                                          */
/* ====================================================================== */
function Battle(allies, foes, opt) {
  opt = opt || {};
  this.units = allies.concat(foes);
  this.round = 0;
  this.rnd = opt.rnd || Math.random;
  this.day = opt.day != null ? opt.day : isDayNow();
  this.zone = opt.zone || null;
  this.events = [];          // presentation queue: {k:'act'|'dmg'|'heal'|'miss'|'st'|'log'|'ko'|'shield'|'cleanse', ...}
  this.side = { ally: { lastType: null, spark: 0, breakNext: false, cloud: 0, vessel: 0, vesselV: 0 }, foe: { lastType: null, spark: 0, breakNext: false, cloud: 0, vessel: 0, vesselV: 0 } };
  for (const u of this.units) {
    const s = u.cards.s;
    if (!s) continue;
    if (s.s.on === "allyLethal") this.side[u.side].cloud += 1;
    if (s.s.on === "allyHitAdv") { this.side[u.side].vessel += s.s.n; this.side[u.side].vesselV = Math.max(this.side[u.side].vesselV, s.s.v); }
  }
  this.over = null;
}
const B = Battle.prototype;
B.alive = function (side) { return this.units.filter((u) => u.side === side && u.hp > 0); };
B.other = (side) => (side === "ally" ? "foe" : "ally");
B.emit = function (e) { this.events.push(e); };
B.stVal = function (u, name) { const s = u.st[name]; return s ? s.v : 0; };
B.eff = function (u, k) {
  let pct = (u.mods[k] || 0);
  if (k === "spd") pct += this.stVal(u, "haste") - this.stVal(u, "slow") + this.stVal(u, "might");
  if (k === "def") { pct += this.stVal(u, "guard") + this.stVal(u, "might"); if (u.mods.defRound) pct += Math.min(15 * (u.mods.defRound / 3), u.mods.defRound * this.round); }
  if (k === "str") pct += this.stVal(u, "might");
  return Math.max(1, u.base[k] * (1 + pct / 100));
};
B.typeOf = function (u, card) {
  let ty = card ? card.type : u.types[0];
  if (ty === "star") ty = this.side[u.side].lastType || u.types[0];
  return ty;
};
B.addStatus = function (src, tgt, st, cardType) {
  if (!st || tgt.hp <= 0) return false;
  let [name, turns, chance, val] = st;
  if (this.rnd() > chance) return false;
  if (tgt.mods.immune === name) return false;
  if (STATUS[name].neg) {
    // winning type: statuses last +1 turn
    if (cardType && tgt.types.some((d) => BEATS[cardType] === d)) turns += 1;
    // card vs card: if the target's passive card type beats the incoming type, the effect is halved
    const pc = tgt.cards.p;
    if (cardType && pc && BEATS[pc.type] === cardType) turns = Math.floor(turns / 2);
    if (tgt.mods.stShort) turns -= tgt.mods.stShort;
    if (turns <= 0) { this.emit({ k: "resist", u: tgt.uid }); return false; }
  }
  const cur = tgt.st[name];
  tgt.st[name] = { t: Math.max(cur ? cur.t : 0, turns), v: Math.max(cur ? cur.v : 0, val != null ? val : STATUS[name].v) };
  this.emit({ k: "st", u: tgt.uid, st: name });
  if (STATUS[name].neg) this.trigger("allyStatus", tgt, { status: name });
  return true;
};
B.cleanse = function (u, what) {
  const negs = Object.keys(u.st).filter((k) => STATUS[k].neg);
  let rm = [];
  if (what === "one" || what === "longest") { negs.sort((a, b) => u.st[b].t - u.st[a].t); rm = negs.slice(0, 1); }
  else if (what === "all") rm = negs;
  else if (u.st[what]) rm = [what];
  for (const k of rm) delete u.st[k];
  if (rm.length) this.emit({ k: "cleanse", u: u.uid, st: rm });
  return rm.length;
};
B.addShield = function (src, tgt, pct, turns) {
  const amt = Math.round(tgt.maxHp * pct / 100);
  tgt.shield = Math.max(tgt.shield, amt);
  tgt.shieldT = Math.max(tgt.shieldT, turns + (src.mods.shieldLong || 0));
  this.emit({ k: "shield", u: tgt.uid, n: amt });
  const foeSide = this.side[this.other(tgt.side)];
  for (const w of this.alive(this.other(tgt.side))) if (w.cards.s && w.cards.s.s.on === "foeShield" && !w.sUsed) { w.sUsed = true; foeSide.breakNext = true; this.emit({ k: "support", u: w.uid, card: w.cards.s.id }); }
};
B.heal = function (src, tgt, pct) {
  if (tgt.hp <= 0) return 0;
  let amt = tgt.maxHp * pct / 100;
  amt *= 1 + ((src && src.mods.healGive) || 0) / 100 + (tgt.mods.healRecv || 0) / 100;
  amt = Math.round(amt);
  const before = tgt.hp; tgt.hp = Math.min(tgt.maxHp, tgt.hp + amt);
  const got = tgt.hp - before;
  if (got > 0) this.emit({ k: "heal", u: tgt.uid, n: got });
  return got;
};

// one hit of damage. Returns damage dealt (0 = miss).
B.hit = function (src, tgt, pow, card, extra) {
  extra = extra || {};
  if (tgt.hp <= 0) return 0;
  const ty = this.typeOf(src, card);
  // blinded: 50% to miss; dodge
  if (src.st.blind && this.rnd() < src.st.blind.v / 100) { this.emit({ k: "miss", u: tgt.uid, by: src.uid, blind: true }); return 0; }
  if (this.rnd() * 100 < Math.min(35, tgt.dodge)) { this.emit({ k: "miss", u: tgt.uid, by: src.uid }); return 0; }
  let d = this.eff(src, "str") * pow / 100;
  let tm = 1; for (const dt of tgt.types) tm *= typeMult(ty, dt);
  d *= tm;
  if (card && src.types.includes(card.type)) d *= 1.15;               // resonance
  if (TYPES[ty] && TYPES[ty].day != null && TYPES[ty].day === this.day) d *= 1.1; // clock of the glade
  if (this.zone && this.zone.bonus && this.zone.bonus[ty]) d *= 1 + this.zone.bonus[ty] / 100;
  let pct = (src.mods.dmg || 0) + this.stVal(src, "fury") + this.stVal(src, "cheer");
  if (!src.hitOnce && src.mods.firstHit) pct += src.mods.firstHit;
  if (tgt.shield > 0 && src.mods.vsShield) pct += src.mods.vsShield;
  if (src.mods.vsHigher && tgt.hp > src.hp) pct += src.mods.vsHigher;
  const side = this.side[src.side];
  if (side.spark) { pct += side.spark; side.spark = 0; }
  d *= 1 + pct / 100;
  if (src.st.soak && ty === "fire") d *= 1 - src.st.soak.v / 100;
  let crit = false;
  const cc = src.crit + (src.st.cheer ? 10 : 0) - this.stVal(src, "dull");
  if (this.rnd() * 100 < cc) { crit = true; if (!tgt.mods.critImmune) d *= 1.5; }
  d *= 60 / (60 + this.eff(tgt, "def"));
  d *= 0.92 + this.rnd() * 0.16;
  if (tm > 1) {
    if (tgt.mods.resistAdv) d *= 1 - tgt.mods.resistAdv / 100;
    const ts = this.side[tgt.side];
    if (ts.vessel > 0) { ts.vessel--; d *= 1 - ts.vesselV / 100; }
  }
  if (tgt.st.cushion) { d *= 1 - tgt.st.cushion.v / 100; delete tgt.st.cushion; }
  d = Math.max(1, Math.round(d));
  // break shield
  if ((extra.breakShield || side.breakNext) && tgt.shield > 0) { tgt.shield = 0; tgt.shieldT = 0; side.breakNext = false; this.emit({ k: "break", u: tgt.uid }); }
  // shield absorbs
  let absorbed = 0;
  if (tgt.shield > 0) { absorbed = Math.min(tgt.shield, d); tgt.shield -= absorbed; if (tgt.shield <= 0) tgt.shieldT = 0; }
  let left = d - absorbed;
  const ts = this.side[tgt.side];
  if (left >= tgt.hp && ts.cloud > 0) { ts.cloud--; left = Math.round(left / 2); this.emit({ k: "save", u: tgt.uid }); }
  tgt.hp = Math.max(0, tgt.hp - left);
  src.hitOnce = true; tgt.hitsTaken++;
  this.emit({ k: "dmg", u: tgt.uid, by: src.uid, n: d, crit, eff: tm > 1 ? "up" : tm < 1 ? "down" : "", ty });
  if (crit && src.mods.critSpark) side.spark = src.mods.critSpark;
  if (crit) this.trigger("allyCrit", tgt, {});
  if (src.mods.onHit) this.addStatus(src, tgt, src.mods.onHit, card ? card.type : null);
  if (tgt.mods.onHitBy && tgt.hp > 0) this.addStatus(tgt, src, tgt.mods.onHitBy, null);
  if (extra.drain && src.hp > 0) { const g = Math.round(left * extra.drain / 100); const bf = src.hp; src.hp = Math.min(src.maxHp, src.hp + g); if (src.hp > bf) this.emit({ k: "heal", u: src.uid, n: src.hp - bf }); }
  if (tgt.hp <= 0) { tgt.st = {}; tgt.shield = 0; this.emit({ k: "ko", u: tgt.uid }); }
  else this.trigger("allyLow", tgt, {});
  return d;
};

// choose targets
B.targets = function (spec, src, ctx) {
  const foes = this.alive(this.other(src.side)), allies = this.alive(src.side);
  const byHpPct = (a, b) => a.hp / a.maxHp - b.hp / b.maxHp;
  switch (spec) {
    case "foe": {
      if (!foes.length) return [];
      const ty = ctx && ctx.card ? this.typeOf(src, ctx.card) : this.typeOf(src, null);
      const score = (u) => u.types.reduce((m, d) => m * typeMult(ty, d), 1) * 10 - u.hp / u.maxHp;
      return [foes.slice().sort((a, b) => score(b) - score(a))[0]];
    }
    case "foes": return foes;
    case "rand": case "randFoe": return foes.length ? [foes[Math.floor(this.rnd() * foes.length)]] : [];
    case "fastestFoe": return foes.length ? [foes.slice().sort((a, b) => this.eff(b, "spd") - this.eff(a, "spd"))[0]] : [];
    case "fireFoe": { const f = foes.filter((u) => u.types.includes("fire")); const l = f.length ? f : foes; return l.length ? [l.slice().sort((a, b) => this.eff(b, "str") - this.eff(a, "str"))[0]] : []; }
    case "self": return [src];
    case "ally": return allies.length ? [allies.slice().sort(byHpPct)[0]] : [];
    case "allyOther": { const o = allies.filter((u) => u !== src); const l = o.length ? o : allies; return [l.slice().sort((a, b) => this.eff(b, "str") - this.eff(a, "str"))[0]]; }
    case "lowAlly": return allies.length ? [allies.slice().sort(byHpPct)[0]] : [];
    case "allies": return allies;
    case "selfAlly": { const o = allies.filter((u) => u !== src).sort(byHpPct); return o.length ? [src, o[0]] : [src]; }
    case "slowAlly": return allies.length ? [allies.slice().sort((a, b) => this.eff(a, "spd") - this.eff(b, "spd"))[0]] : [];
    case "fireAlly": { const f = allies.filter((u) => u.types.includes("fire")); const l = f.length ? f : allies; return [l.slice().sort((a, b) => this.eff(b, "str") - this.eff(a, "str"))[0]]; }
    case "wildAllies": return allies.filter((u) => u.wild);
    case "debuffedAlly": { const d = allies.filter((u) => Object.keys(u.st).some((k) => STATUS[k].neg)); return d.length ? [d[0]] : []; }
    case "theAlly": return ctx && ctx.ally ? [ctx.ally] : [];
  }
  return [];
};

// apply an effect spec (from an active or a support)
B.apply = function (src, fx, card, ctx) {
  const list = this.targets(fx.tgt, src, Object.assign({ card }, ctx));
  if (!list.length) return false;
  const ty = card ? card.type : null;
  if (fx.pow) {
    const hits = fx.hits || 1;
    for (let i = 0; i < hits; i++) {
      const tg = fx.tgt === "rand" ? this.targets("rand", src)[0] : null;
      const tl = tg ? [tg] : list;
      for (const t of tl) {
        if (!t || t.hp <= 0) continue;
        const d = this.hit(src, t, fx.pow, card, { breakShield: fx.breakShield, drain: fx.drain });
        if (d > 0 && fx.st) this.addStatus(src, t, fx.st, ty);
      }
      if (!tg) break;
      if (!this.alive(this.other(src.side)).length) break;
    }
  } else if (fx.st) for (const t of list) this.addStatus(src, t, fx.st, ty);
  if (fx.heal) for (const t of list) this.heal(src, t, fx.heal);
  if (fx.shield) for (const t of list) this.addShield(src, t, fx.shield[0], fx.shield[1]);
  if (fx.cleanse) for (const t of list) this.cleanse(t, fx.cleanse);
  if (fx.selfSt) this.addStatus(src, src, fx.selfSt, null);
  if (fx.skipNext) src.skip = 1;
  if (card) this.side[src.side].lastType = card.type;
  return true;
};

// fire support cards for an event that happened to `who` (an ally of the support holder)
B.trigger = function (on, who, info) {
  if (this.inTrigger) return; this.inTrigger = true;
  try {
    for (const u of this.alive(who.side)) {
      const c = u.cards.s; if (!c || u.sUsed || c.s.on !== on) continue;
      if (on === "allyStatus" && c.s.status !== info.status) continue;
      if (on === "allyLow" && !(who.hp > 0 && who.hp / who.maxHp < c.s.pct / 100)) continue;
      u.sUsed = true;
      this.emit({ k: "support", u: u.uid, card: c.id });
      if (c.s.fx) this.apply(u, c.s.fx, c, { ally: who });
    }
  } finally { this.inTrigger = false; }
};
B.start = function () {
  for (const u of this.units) {
    const c = u.cards.s; if (!c || u.hp <= 0 || c.s.on !== "start") continue;
    u.sUsed = true; this.emit({ k: "support", u: u.uid, card: c.id }); this.apply(u, c.s.fx, c, {});
  }
};
B.roundStart = function () {
  this.round++;
  this.emit({ k: "round", n: this.round });
  for (const u of this.units) {
    const c = u.cards.s; if (!c || u.hp <= 0) continue;
    if (c.s.on === "every" && this.round > 1 && (this.round - 1) % c.s.n === 0) { this.emit({ k: "support", u: u.uid, card: c.id }); this.apply(u, c.s.fx, c, {}); }
    if (c.s.on === "round" && this.round === c.s.n && !u.sUsed) { u.sUsed = true; this.emit({ k: "support", u: u.uid, card: c.id }); this.apply(u, c.s.fx, c, {}); }
  }
  const order = this.units.filter((u) => u.hp > 0).map((u) => ({ u, s: this.eff(u, "spd") * (0.95 + this.rnd() * 0.1) }));
  order.sort((a, b) => b.s - a.s);
  return order.map((o) => o.u);
};
// returns false if the unit can't act this turn
B.turnStart = function (u) {
  if (u.hp <= 0) return false;
  if (u.st.burn) { const d = Math.max(1, Math.round(u.maxHp * u.st.burn.v / 100)); u.hp = Math.max(0, u.hp - d); this.emit({ k: "dmg", u: u.uid, n: d, dot: "burn" }); if (u.hp <= 0) { u.st = {}; this.emit({ k: "ko", u: u.uid }); return false; } }
  if (u.st.regen) this.heal(u, u, u.st.regen.v);
  if (u.cd > 0) u.cd--;
  if (u.st.stun || u.st.trap) { this.emit({ k: "skip", u: u.uid, why: u.st.stun ? "stun" : "trap" }); this.turnEnd(u); return false; }
  if (u.skip) { u.skip = 0; this.emit({ k: "skip", u: u.uid, why: "tired" }); this.turnEnd(u); return false; }
  return true;
};
B.turnEnd = function (u) {
  for (const k of Object.keys(u.st)) { if (u.st[k].t >= 99) continue; u.st[k].t--; if (u.st[k].t <= 0) delete u.st[k]; }
  if (u.shieldT > 0) { u.shieldT--; if (u.shieldT <= 0) u.shield = 0; }
  this.checkOver();
};
B.canPlay = function (u) { return !!(u.cards.a && u.cd <= 0); };
// would the auto mode use the active card now?
B.wantPlay = function (u) {
  if (!this.canPlay(u)) return false;
  const a = u.cards.a.a;
  if (!a.pow && a.heal && !a.st) {
    const allies = this.alive(u.side);
    const hurt = allies.some((x) => x.hp / x.maxHp < 0.7) || (a.cleanse && allies.some((x) => Object.keys(x.st).some((k) => STATUS[k].neg)));
    return hurt;
  }
  if (!a.pow && a.cleanse && !a.heal) return this.alive(u.side).some((x) => Object.keys(x.st).some((k) => STATUS[k].neg));
  return true;
};
B.act = function (u, useCard) {
  if (this.over || u.hp <= 0) return;
  if (useCard && this.canPlay(u)) {
    const c = u.cards.a;
    this.emit({ k: "act", u: u.uid, card: c.id });
    this.apply(u, c.a, c, {});
    u.cd = c.a.cd;
  } else {
    const t = this.targets("foe", u)[0];
    this.emit({ k: "act", u: u.uid, card: null });
    if (t) this.hit(u, t, 80, null, {});
  }
  this.turnEnd(u);
};
B.checkOver = function () {
  if (this.over) return this.over;
  if (!this.alive("foe").length) this.over = "win";
  else if (!this.alive("ally").length) this.over = "lose";
  return this.over;
};
// synchronous full simulation (used by tests and auto-resolve)
B.runAll = function (maxRounds) {
  this.start();
  while (!this.checkOver() && this.round < (maxRounds || 40)) {
    for (const u of this.roundStart()) {
      if (this.over) break;
      if (!this.turnStart(u)) { this.checkOver(); continue; }
      this.act(u, this.wantPlay(u));
    }
  }
  return this.over || "lose";
};

/* ====================================================================== */
/* Zone: Prado Aurora                                                     */
/* ====================================================================== */
const ZONES = {
  aurora: {
    type: "light", bonus: { light: 10, shadow: -10 }, sections: 4,
    foes: ["lumo", "fuellito", "brotin", "lumo"], allies: ["brotin", "remolin", "fuellito", "bostezo", "lumo", "fizz", "pebb"],
    boss: "farol", sky: ["#ffe9b8", "#f6c97a"], skyN: ["#2b2f5c", "#57508a"], ground: "#9cc46a", groundN: "#4f6b47",
  },
};
const EVENTS = ["farol", "patrol", "tila", "well"];

const api = { TYPES, BEATS, OPPOSITE, typeMult, GRADES, rollGrade, STATUS, CARDS, DROP_POOL, scaled, MONS, makeUnit, Battle, lvlScale, xpNeed, SLOT_LVL, ZONES, EVENTS, isDayNow };
if (typeof module !== "undefined" && module.exports) module.exports = api;
if (!root || !root.EV) return;

/* ====================================================================== */
/* ====================  Browser part: UI and text  ===================== */
/* ====================================================================== */
const EV = root.EV;
const $ = EV.$;
const L = () => EV.LANG;
const esc = EV.escapeHtml;

/* ---------- Text ---------- */
const TX = {
  es: {
    "nav.cards": "Cartas", "act.exp": "🗺️ Expedición",
    "exp.need.stage": "Tu criatura podrá salir de expedición cuando sea joven.",
    "exp.need.sleep": "Está dormida. Despiértala para salir.", "exp.need.sick": "Está pachucha. Cúrala antes de salir.",
    "exp.need.energy": "Le falta energía (necesita 30).", "exp.cost": "Cuesta 25 de energía",
    "exp.title": "Prado Aurora", "exp.zoneSub": "Ladera del Día · zona de Luz",
    "exp.zoneDesc": "Hierba dorada y faroles que no se apagan nunca. Últimamente algunos parpadean, y por las raíces sube una savia oscura. Aquí la Luz pega un 10 % más fuerte y la Sombra un 10 % menos.",
    "exp.pick": "Elige dos compañeros salvajes para el viaje", "exp.pickSub": "Te acompañan solo en esta expedición. Mira sus tipos: la Luz pierde contra el Fuego, y el Fuego contra el Agua.",
    "load.title": "Tu mazo para el viaje", "load.sub": "Llevas como máximo 3 cartas, una por hueco. Elige cuál va en cada uno: el mismo efecto cambia según el hueco. Durante la expedición no se puede cambiar.", "load.lock": "Se desbloquea en el nivel {n}",
    "exp.go": "Partir", "exp.cancel": "Volver a casa", "exp.party": "Tu equipo",
    "exp.section": "Tramo {n} de {m}", "exp.choose": "¿Por dónde sigues?", "exp.bossNext": "Al final del camino brilla una luz enorme. El equipo toma aire antes de acercarse (+30 % de vida).",
    "node.fight": "Combate", "node.event": "Encuentro", "node.chest": "Cofre", "node.rest": "Descanso", "node.boss": "Guardián",
    "node.fight.d": "Criaturas apagadas por la Savia Negra. XP y Chispas.", "node.event.d": "Algo pasa en el camino. Tú decides.",
    "node.chest.d": "Elige una carta de tres.", "node.rest.d": "El equipo recupera un 35 % de vida.", "node.boss.d": "El Gran Farol guarda el prado.",
    "b.round": "Ronda {n}", "b.auto": "Auto", "b.manual": "Manual", "b.speed": "Velocidad",
    "b.yourTurn": "Turno de {name}. ¿Qué hace?", "b.play": "Jugar {card}", "b.basic": "Ataque básico", "b.cd": "lista en {n}",
    "b.noCard": "Sin carta activa",
    "b.win": "¡Victoria!", "b.lose": "El equipo se retira…",
    "log.act": "{name} juega {card}.", "log.basic": "{name} ataca.", "log.dmg": "{name} recibe {n}{crit}{eff}.", "log.crit": " (¡crítico!)",
    "log.up": " · es muy eficaz", "log.down": " · no es muy eficaz", "log.miss": "{name} esquiva.", "log.blindMiss": "{name} falla: no ve nada.",
    "log.heal": "{name} recupera {n}.", "log.st": "{name}: {st}.", "log.ko": "{name} cae.", "log.skip.stun": "{name} está aturdido.",
    "log.skip.trap": "{name} está atrapado.", "log.skip.tired": "{name} se toma un respiro.", "log.support": "Soporte de {name}: {card}.",
    "log.shield": "{name} gana un escudo de {n}.", "log.break": "¡Escudo roto!", "log.cleanse": "{name} se libra de {st}.",
    "log.resist": "{name} resiste el estado.", "log.save": "¡Una nube amortigua el golpe!", "log.burn": "{name} se quema: {n}.",
    "r.title": "Botín", "r.xp": "+{n} XP", "r.coins": "+{n} Chispas", "r.pick": "Elige una carta", "r.skip": "No quiero ninguna",
    "r.card": "Carta nueva: {card}", "r.continue": "Seguir",
    "end.win": "¡El Gran Farol vuelve a brillar limpio!", "end.winText": "La savia oscura se escurre de su cristal y el prado se ilumina. {name} vuelve a casa orgullosa.",
    "end.lose": "Vuelta a casa", "end.loseText": "El equipo no pudo seguir. {name} se trae la mitad de lo ganado y todas las cartas.",
    "end.hurt": "{name} vuelve con heridas: −{e} de energía y −{h} de salud.", "end.unhurt": "{name} vuelve sin un rasguño.",
    "recharge": "⚡ Recargar energía (+{n}) · {c} Chispas", "recharge.done": "¡Energía recargada!", "recharge.full": "Ya tiene la energía casi llena.",
    "end.quit": "Te retiras", "end.home": "Volver a casa", "end.lvl": "¡{name} sube a nivel {n}!", "end.slot": "Hueco desbloqueado: {slot}",
    "end.lvlPick": "Por subir de nivel, elige una carta", "quit": "Retirarse",
    "slot.a": "Activa", "slot.p": "Pasiva", "slot.s": "Soporte", "slot.lock": "Nivel {n}",
    "cards.title": "Cartas", "cards.lvl": "Nivel {n}", "cards.xp": "{x} / {y} XP", "cards.equip": "Equipar en", "cards.empty": "Hueco vacío",
    "cards.owned": "Tu colección ({n})", "cards.fuse": "Fusionar 3 → {g}", "cards.fused": "¡Fusión! {card} ahora es {g}.",
    "cards.desc": "Cada carta trae tres efectos; solo funciona el del hueco donde la pongas. Si el tipo de la carta coincide con el de tu criatura, resuena (+15 %).",
    "cards.noCreature": "Ten una criatura joven para usar cartas.", "cards.stats": "Vida {hp} · Fuerza {str} · Defensa {def} · Velocidad {spd} · Crítico {cr} %",
    "cards.unequip": "Quitar", "cards.inUse": "En uso", "cards.mode": "Modo de combate",
    "log.expGo": "{name} sale de expedición al Prado Aurora.", "log.expWin": "{name} volvió del Prado Aurora con el Gran Farol en paz.",
    "log.expLose": "{name} volvió del Prado Aurora un poco magullada.",
    "ach.exp1": ["Primer paso", "Gana tu primer combate de expedición."], "ach.guard1": ["Luz limpia", "Calma al Gran Farol del Prado Aurora."],
    "ach.cards10": ["Coleccionista", "Reúne 10 cartas."], "ach.fuse1": ["Tres en una", "Fusiona una carta."],
    "foe.hollow": "{name} apagado", "boss.farol": "El Gran Farol",
  },
  en: {
    "nav.cards": "Cards", "act.exp": "🗺️ Expedition",
    "exp.need.stage": "Your creature can go on expeditions once it's a kid.",
    "exp.need.sleep": "It's asleep. Wake it up to set out.", "exp.need.sick": "It's unwell. Heal it before setting out.",
    "exp.need.energy": "Not enough energy (needs 30).", "exp.cost": "Costs 25 energy",
    "exp.title": "Aurora Meadow", "exp.zoneSub": "Dayside slope · Light zone",
    "exp.zoneDesc": "Golden grass and lanterns that never go out. Lately a few of them flicker, and a dark sap is creeping up through the roots. Here Light hits 10% harder and Shadow 10% softer.",
    "exp.pick": "Pick two wild companions for the trip", "exp.pickSub": "They only travel with you on this expedition. Check their types: Light loses to Fire, and Fire loses to Water.",
    "load.title": "Your deck for the trip", "load.sub": "You carry up to 3 cards, one per slot. Choose which goes where: the same card does something different in each slot. It can't be changed during the expedition.", "load.lock": "Unlocks at level {n}",
    "exp.go": "Set out", "exp.cancel": "Back home", "exp.party": "Your team",
    "exp.section": "Leg {n} of {m}", "exp.choose": "Which way now?", "exp.bossNext": "A huge light shines at the end of the path. The team catches its breath before going closer (+30% health).",
    "node.fight": "Battle", "node.event": "Encounter", "node.chest": "Chest", "node.rest": "Rest", "node.boss": "Guardian",
    "node.fight.d": "Creatures dimmed by the Black Sap. XP and Chispas.", "node.event.d": "Something happens on the path. You decide.",
    "node.chest.d": "Pick one card out of three.", "node.rest.d": "The team recovers 35% health.", "node.boss.d": "The Great Lantern guards the meadow.",
    "b.round": "Round {n}", "b.auto": "Auto", "b.manual": "Manual", "b.speed": "Speed",
    "b.yourTurn": "{name}'s turn. What does it do?", "b.play": "Play {card}", "b.basic": "Basic attack", "b.cd": "ready in {n}",
    "b.noCard": "No active card",
    "b.win": "Victory!", "b.lose": "The team pulls back…",
    "log.act": "{name} plays {card}.", "log.basic": "{name} attacks.", "log.dmg": "{name} takes {n}{crit}{eff}.", "log.crit": " (critical!)",
    "log.up": " · super effective", "log.down": " · not very effective", "log.miss": "{name} dodges.", "log.blindMiss": "{name} misses: it can't see.",
    "log.heal": "{name} recovers {n}.", "log.st": "{name}: {st}.", "log.ko": "{name} is down.", "log.skip.stun": "{name} is stunned.",
    "log.skip.trap": "{name} is trapped.", "log.skip.tired": "{name} takes a breather.", "log.support": "{name}'s support: {card}.",
    "log.shield": "{name} gains a {n} shield.", "log.break": "Shield broken!", "log.cleanse": "{name} shakes off {st}.",
    "log.resist": "{name} resists the status.", "log.save": "A cloud cushions the blow!", "log.burn": "{name} burns: {n}.",
    "r.title": "Loot", "r.xp": "+{n} XP", "r.coins": "+{n} Chispas", "r.pick": "Pick a card", "r.skip": "None for me",
    "r.card": "New card: {card}", "r.continue": "Continue",
    "end.win": "The Great Lantern shines clean again!", "end.winText": "The dark sap drains from its glass and the meadow lights up. {name} heads home proud.",
    "end.lose": "Back home", "end.loseText": "The team couldn't go on. {name} brings back half the loot and every card.",
    "end.hurt": "{name} comes back hurt: −{e} energy and −{h} health.", "end.unhurt": "{name} comes back without a scratch.",
    "recharge": "⚡ Recharge energy (+{n}) · {c} Chispas", "recharge.done": "Energy recharged!", "recharge.full": "Its energy is already almost full.",
    "end.quit": "You turn back", "end.home": "Back home", "end.lvl": "{name} reached level {n}!", "end.slot": "Slot unlocked: {slot}",
    "end.lvlPick": "For levelling up, pick a card", "quit": "Turn back",
    "slot.a": "Active", "slot.p": "Passive", "slot.s": "Support", "slot.lock": "Level {n}",
    "cards.title": "Cards", "cards.lvl": "Level {n}", "cards.xp": "{x} / {y} XP", "cards.equip": "Equip as", "cards.empty": "Empty slot",
    "cards.owned": "Your collection ({n})", "cards.fuse": "Fuse 3 → {g}", "cards.fused": "Fusion! {card} is now {g}.",
    "cards.desc": "Each card carries three effects; only the one for the slot you put it in works. If the card's type matches your creature's, it resonates (+15%).",
    "cards.noCreature": "Raise a creature to kid stage to use cards.", "cards.stats": "Health {hp} · Strength {str} · Defence {def} · Speed {spd} · Crit {cr}%",
    "cards.unequip": "Remove", "cards.inUse": "In use", "cards.mode": "Battle mode",
    "log.expGo": "{name} set out for the Aurora Meadow.", "log.expWin": "{name} came back from the Aurora Meadow with the Great Lantern at peace.",
    "log.expLose": "{name} came back from the Aurora Meadow a bit bruised.",
    "ach.exp1": ["First step", "Win your first expedition battle."], "ach.guard1": ["Clean light", "Calm the Great Lantern of the Aurora Meadow."],
    "ach.cards10": ["Collector", "Gather 10 cards."], "ach.fuse1": ["Three in one", "Fuse a card."],
    "foe.hollow": "Dimmed {name}", "boss.farol": "The Great Lantern",
  },
};
const tx = (k, v) => { let s = TX[L()][k]; if (s == null) s = TX.en[k]; if (s == null) return k; if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => (v[n] != null ? v[n] : m)); return s; };

const MON_NAMES = {
  lumo: "Lumo", fizz: "Fizz", pebb: "Pebb", fuellito: "Fuellito", brotin: "Brotín", remolin: "Remolín", bostezo: "Bostezo",
};
const MON_DESC = {
  es: { lumo: "Chispa juguetona de las Casas del Farol", fizz: "Nube dormilona de los Altos", pebb: "Comilón tozudo de la Hondura", fuellito: "Aprendiz del Gremio de la Brasa", brotin: "Bellota paciente del Bosque Hondo", remolin: "Nutria viajera de las Mareas", bostezo: "Ovejita-polilla del Fondo Blanco" },
  en: { lumo: "Playful spark from the Lantern Houses", fizz: "Sleepy cloud from the Heights", pebb: "Stubborn glutton from the Deep", fuellito: "Apprentice of the Ember Guild", brotin: "Patient acorn from the Deep Wood", remolin: "Wandering otter of the Tides", bostezo: "Woolly moth-lamb from the White Hollow" },
};

/* ---------- Card names, lore and effect text ---------- */
const pc = (n) => n + " %";
const pcE = (n) => n + "%";
const turnsEs = (n) => (n >= 99 ? "todo el combate" : n === 1 ? "1 turno" : n + " turnos");
const turnsEn = (n) => (n >= 99 ? "the whole battle" : n === 1 ? "1 turn" : n + " turns");
const stN = (st) => STATUS[st][L()];
const CT = {
  flash:    { es: ["Destello Travieso", "Una chispa que se escapó del farol y nunca quiso volver."], en: ["Mischief Flash", "A spark that slipped out of its lantern and never wanted to go back."] },
  lantern:  { es: ["Farolillo de Bolsillo", "Cabe en la mano. Alumbra justo lo que necesitas ver."], en: ["Pocket Lantern", "Fits in a hand. Lights exactly what you need to see."] },
  spark:    { es: ["Chispa Prestada", "En las Casas, cada niño recibe una chispa. Algunas se prestan."], en: ["Borrowed Spark", "In the Lantern Houses every child gets a spark. Some get lent."] },
  gust:     { es: ["Ráfaga Dormilona", "Tres soplos medio dormidos. Ninguno sabe adónde va."], en: ["Drowsy Gust", "Three half-asleep puffs. None knows where it's going."] },
  cloud:    { es: ["Nube Mullida", "Las nubes no tienen dueño, pero esta tiene almohada."], en: ["Fluffy Cloud", "Clouds have no owner, but this one has a pillow."] },
  rain:     { es: ["Lluvia Limpia", "Cae despacio y se lleva lo que sobra."], en: ["Clean Rain", "It falls slowly and washes away what doesn't belong."] },
  throw:    { es: ["Pedrada", "En la Hondura una piedra bien lanzada vale por un discurso."], en: ["Stone Toss", "In the Deep, a well-thrown stone is worth a speech."] },
  stubborn: { es: ["Guijarro Terco", "No se mueve. No es que no pueda: es que no quiere."], en: ["Stubborn Pebble", "It won't move. Not that it can't: it just won't."] },
  promise:  { es: ["Promesa de Dos Piedras", "Dos piedras juntas, dos que se cuidan."], en: ["Two-Stone Promise", "Two stones together, two that look after each other."] },
  bellows:  { es: ["Soplo de Fuelle", "Todos empiezan avivando fuelles en el Gremio."], en: ["Bellows Puff", "Everyone in the Guild starts out working the bellows."] },
  bread:    { es: ["Pan de Forja", "Cocido sobre el yunque, todavía caliente."], en: ["Forge Bread", "Baked on the anvil, still warm."] },
  piece:    { es: ["Primera Pieza", "Lo primero que forja un aprendiz nunca sale recto. Se guarda igual."], en: ["First Piece", "An apprentice's first piece is never straight. It's kept anyway."] },
  acorn:    { es: ["Bellotazo", "Pequeña, dura y con mucha paciencia acumulada."], en: ["Acorn Smack", "Small, hard and full of stored-up patience."] },
  rings:    { es: ["Anillo de Paciencia", "En el Bosque Hondo la edad se cuenta por anillos."], en: ["Patience Ring", "In the Deep Wood, age is counted in rings."] },
  seedling: { es: ["Semilla de Saludo", "Se planta al conocer a alguien. Si brota, es amistad."], en: ["Greeting Seed", "Planted when you meet someone. If it sprouts, it's friendship."] },
  whirl:    { es: ["Remolino", "El agua que gira siempre vuelve al mismo sitio."], en: ["Whirlpool", "Water that spins always comes back to the same place."] },
  vessel:   { es: ["La Forma del Vaso", "El agua no pelea con el vaso: toma su forma."], en: ["Shape of the Cup", "Water doesn't fight the cup: it takes its shape."] },
  guest:    { es: ["Agua al Invitado", "En las Mareas, al que llega se le ofrece agua antes que preguntas."], en: ["Water for the Guest", "On the Tides, newcomers get water before questions."] },
  yawn:     { es: ["Bostezo Contagioso", "Nadie ha resistido nunca un bostezo de oveja-polilla."], en: ["Catching Yawn", "Nobody has ever resisted a moth-lamb yawn."] },
  pillow:   { es: ["Almohada", "Lana tibia del Fondo Blanco. Amortigua casi todo."], en: ["Pillow", "Warm wool from the White Hollow. It softens almost anything."] },
  tale:     { es: ["Sueño Contado", "Cada familia cuenta sus sueños al despertar."], en: ["Told Dream", "Every family tells its dreams on waking."] },
  beam:     { es: ["Haz del Umbral", "La luz que marca hasta dónde se puede ir de noche."], en: ["Threshold Beam", "The light that marks how far you may go at night."] },
  pride:    { es: ["Cristal Altivo", "Nunca se ha apagado. Eso pesa."], en: ["Proud Glass", "It has never gone out. That weighs on it."] },
  law:      { es: ["Ley del Umbral", "Después del ocaso, nadie cruza. Ni siquiera la luz."], en: ["Threshold Law", "After dusk, nobody crosses. Not even light."] },
};
const cardName = (id) => CT[id][L()][0];
const cardLore = (id) => CT[id][L()][1];

function stTextEs(st, who) {
  const [n, tt, ch, v] = st;
  const chance = ch < 1 ? Math.round(ch * 100) + " % de " : "";
  const base = { burn: "Quemar", soak: "Empapar", trap: "Atrapar", stun: "Aturdir", blind: "Cegar", slow: "dejar Lento", dull: "Adormilar" }[n];
  if (STATUS[n].neg) return `${chance}${base}${who ? " " + who : ""} ${turnsEs(tt)}`;
  const pos = { cheer: "Ánimo", guard: `+${v} % de defensa`, fury: `+${v} % de daño`, might: `+${v} % a sus estadísticas`, regen: `recupera ${v} % por turno`, haste: `+${v} % de velocidad`, cushion: `el próximo golpe le hace ${v} % menos` }[n];
  return `${pos} ${turnsEs(tt)}`;
}
function stTextEn(st, who) {
  const [n, tt, ch, v] = st;
  const chance = ch < 1 ? Math.round(ch * 100) + "% chance to " : "";
  const base = { burn: "Burn", soak: "Soak", trap: "Trap", stun: "Stun", blind: "Blind", slow: "Slow", dull: "make Drowsy" }[n];
  if (STATUS[n].neg) return `${chance}${ch < 1 ? base.toLowerCase() : base}${who ? " " + who : ""} for ${turnsEn(tt)}`;
  const pos = { cheer: "Cheer", guard: `+${v}% defence`, fury: `+${v}% damage`, might: `+${v}% to all stats`, regen: `recovers ${v}% per turn`, haste: `+${v}% speed`, cushion: `the next hit deals ${v}% less` }[n];
  return `${pos} for ${turnsEn(tt)}`;
}
const TGT = {
  es: { foe: "al enemigo", foes: "a todos los enemigos", rand: "a enemigos al azar", randFoe: "a un enemigo al azar", fastestFoe: "al enemigo más rápido", fireFoe: "al enemigo de Fuego más fuerte", self: "a sí mismo", ally: "al aliado más herido", allyOther: "a un aliado", lowAlly: "al aliado más herido", allies: "a todo el equipo", selfAlly: "a sí mismo y a un aliado", slowAlly: "al aliado más lento", fireAlly: "al aliado de Fuego más fuerte", wildAllies: "a los aliados salvajes", debuffedAlly: "a un aliado", theAlly: "a ese aliado" },
  en: { foe: "the enemy", foes: "all enemies", rand: "random enemies", randFoe: "a random enemy", fastestFoe: "the fastest enemy", fireFoe: "the strongest Fire enemy", self: "itself", ally: "the most hurt ally", allyOther: "an ally", lowAlly: "the most hurt ally", allies: "the whole team", selfAlly: "itself and an ally", slowAlly: "the slowest ally", fireAlly: "the strongest Fire ally", wildAllies: "wild allies", debuffedAlly: "an ally", theAlly: "that ally" },
};
function fxText(fx) {
  const es = L() === "es", T = TGT[L()], out = [];
  const tg = T[fx.tgt] || "";
  if (fx.pow) {
    if (fx.hits > 1) out.push(es ? `${fx.hits} golpes de ${pc(fx.pow)} ${tg}` : `${fx.hits} hits of ${pcE(fx.pow)} to ${tg}`);
    else out.push(es ? `${pc(fx.pow)} de daño ${tg}` : `${pcE(fx.pow)} damage to ${tg}`);
    if (fx.st) out.push(es ? stTextEs(fx.st) : stTextEn(fx.st).replace(/^./, (m) => m.toLowerCase()));
    if (fx.breakShield) out.push(es ? "rompe su Escudo" : "breaks its Shield");
    if (fx.drain) out.push(es ? `se cura el ${pc(fx.drain)} del daño` : `heals ${pcE(fx.drain)} of the damage`);
  } else if (fx.st) out.push(es ? `${stTextEs(fx.st)} ${STATUS[fx.st[0]].neg ? tg : tg}` : `${stTextEn(fx.st)} (${tg})`);
  if (fx.heal) out.push(es ? `cura ${pc(fx.heal)} ${tg}` : `heals ${pcE(fx.heal)} to ${tg}`);
  if (fx.shield) out.push(es ? `Escudo del ${pc(fx.shield[0])} ${tg} ${turnsEs(fx.shield[1])}` : `${pcE(fx.shield[0])} Shield to ${tg} for ${turnsEn(fx.shield[1])}`);
  if (fx.cleanse) {
    const what = fx.cleanse === "one" ? (es ? "un estado negativo" : "one negative status") : fx.cleanse === "longest" ? (es ? "el estado negativo más largo" : "the longest negative status") : stN(fx.cleanse);
    out.push(es ? `quita ${what} ${fx.tgt === "allies" ? "de cada aliado" : ""}`.trim() : `removes ${what}${fx.tgt === "allies" ? " from each ally" : ""}`);
  }
  if (fx.selfSt) out.push(es ? `y gana ${stTextEs(fx.selfSt)}` : `and gains ${stTextEn(fx.selfSt)}`);
  if (fx.skipNext) out.push(es ? "pero pierde su siguiente turno" : "but loses its next turn");
  let s = out.join(es ? "; " : "; ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function passiveText(p) {
  const es = L() === "es", out = [];
  const sign = (v) => (v > 0 ? "+" : "−") + Math.abs(v);
  const lab = es ? { spd: "velocidad", str: "fuerza", def: "defensa", hp: "vida máxima", crit: "crítico", dodge: "esquiva", dmg: "daño", healRecv: "curación recibida" }
    : { spd: "speed", str: "strength", def: "defence", hp: "max health", crit: "crit", dodge: "dodge", dmg: "damage", healRecv: "healing received" };
  for (const k of ["hp", "str", "def", "spd", "crit", "dodge", "dmg", "healRecv"]) if (p[k]) out.push(es ? `${sign(p[k])} % de ${lab[k]}` : `${sign(p[k])}% ${lab[k]}`);
  if (p.lowFun) out.push(es ? `pero ${p.lowFun} % de crítico si su Diversión baja de 30` : `but ${p.lowFun}% crit if its Fun is under 30`);
  if (p.critSpark) out.push(es ? `cada crítico da +${p.critSpark} % de daño al siguiente aliado que golpee` : `each crit gives +${p.critSpark}% damage to the next ally hit`);
  if (p.stShort) out.push(es ? `sus estados negativos duran ${p.stShort} turno${p.stShort > 1 ? "s" : ""} menos` : `its negative statuses last ${p.stShort} turn${p.stShort > 1 ? "s" : ""} less`);
  if (p.vsShield) out.push(es ? `+${p.vsShield} % de daño contra enemigos con Escudo` : `+${p.vsShield}% damage against shielded enemies`);
  if (p.shieldLong) out.push(es ? `sus Escudos duran ${p.shieldLong} turno${p.shieldLong > 1 ? "s" : ""} más` : `its Shields last ${p.shieldLong} more turn${p.shieldLong > 1 ? "s" : ""}`);
  if (p.onHit) out.push(es ? `sus golpes tienen ${stTextEs(p.onHit)}` : `its hits have a ${stTextEn(p.onHit)}`);
  if (p.firstHit) out.push(es ? `su primer golpe del combate hace +${p.firstHit} %` : `its first hit of the battle deals +${p.firstHit}%`);
  if (p.vsHigher) out.push(es ? `+${p.vsHigher} % de daño contra enemigos con más vida` : `+${p.vsHigher}% damage against enemies with more health`);
  if (p.defRound) out.push(es ? `+${p.defRound} % de defensa por ronda (hasta +${Math.round(15 * p.defRound / 3)} %)` : `+${p.defRound}% defence per round (up to +${Math.round(15 * p.defRound / 3)}%)`);
  if (p.resistAdv) out.push(es ? `recibe ${p.resistAdv} % menos de los tipos con ventaja sobre él` : `takes ${p.resistAdv}% less from types with an edge on it`);
  if (p.onHitBy) out.push(es ? `quien lo golpea tiene ${Math.round(p.onHitBy[2] * 100)} % de quedar Lento ${turnsEs(p.onHitBy[1])}` : `attackers have a ${Math.round(p.onHitBy[2] * 100)}% chance to be Slowed for ${turnsEn(p.onHitBy[1])}`);
  if (p.critImmune) out.push(es ? "los críticos contra él hacen daño normal" : "critical hits against it deal normal damage");
  const s = out.join(es ? ", " : ", ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function supportText(s) {
  const es = L() === "es";
  const when = {
    start: es ? "Al empezar" : "At the start",
    every: es ? `Cada ${s.n} rondas` : `Every ${s.n} rounds`,
    round: es ? `Si el combate llega a la ronda ${s.n}` : `If the battle reaches round ${s.n}`,
    allyStatus: es ? `La primera vez que un aliado queda ${s.status ? stN(s.status) : ""}` : `The first time an ally is ${s.status ? stN(s.status) : ""}`,
    allyLow: es ? `Cuando un aliado baja del ${s.pct} % de vida (1 vez)` : `When an ally drops below ${s.pct}% health (once)`,
    allyCrit: es ? "Si un aliado recibe un crítico (1 vez)" : "If an ally takes a crit (once)",
  }[s.on];
  if (s.on === "allyLethal") return es ? "Si un aliado va a caer de un golpe, ese golpe hace la mitad (1 vez)" : "If an ally would fall from one hit, that hit deals half (once)";
  if (s.on === "foeShield") return es ? "Cuando un enemigo se pone Escudo, el siguiente golpe del equipo lo rompe (1 vez)" : "When an enemy gains a Shield, the team's next hit breaks it (once)";
  if (s.on === "allyHitAdv") return es ? `Cuando un aliado recibe un golpe con ventaja de tipo, hace ${s.v} % menos (${s.n} veces)` : `When an ally takes a hit with type advantage, it deals ${s.v}% less (${s.n} times)`;
  if (s.on === "win") return es ? `Tras cada combate ganado en expedición, el equipo recupera ${s.heal} % de vida` : `After each expedition battle won, the team recovers ${s.heal}% health`;
  return `${when}: ${fxText(s.fx).replace(/^./, (m) => m.toLowerCase())}`;
}
function slotText(sc, slot) {
  if (slot === "p") return passiveText(sc.p);
  if (slot === "a") return fxText(sc.a) + (L() === "es" ? ` (enfr. ${sc.a.cd})` : ` (cd ${sc.a.cd})`);
  return supportText(sc.s);
}
const typeChip = (ty) => `<span class="ty ty-${ty}" title="${esc(TYPES[ty][L()])}">${TYPES[ty].icon} ${esc(TYPES[ty][L()])}</span>`;
const gradeChip = (gi) => `<span class="gr" style="--g:${GRADES[gi].col}">${esc(GRADES[gi][L()])}</span>`;
function cardHtml(id, gi, opts) {
  opts = opts || {};
  const sc = scaled(id, gi);
  const rows = ["a", "p", "s"].map((sl) => `<li class="${opts.slot === sl ? "on" : ""}"><b>${esc(tx("slot." + sl))}</b> ${esc(slotText(sc, sl))}</li>`).join("");
  return `<div class="rcard" style="--g:${GRADES[gi].col}"><div class="rc-top"><strong>${esc(cardName(id))}</strong>${opts.count > 1 ? `<span class="cnt">×${opts.count}</span>` : ""}</div>
  <div class="rc-tags">${typeChip(CARDS[id].type)}${gradeChip(gi)}</div>
  <ul class="rc-fx">${rows}</ul><p class="rc-lore">${esc(cardLore(id))}</p>${opts.foot || ""}</div>`;
}

/* ---------- Saved data ---------- */
function rpgState() {
  const S = EV.S, P = EV.P;
  if (!P.cards) P.cards = [];
  if (!P.cardSeq) P.cardSeq = 1;
  if (!P.rpgMode) P.rpgMode = "auto";
  if (!P.c.expWins) P.c.expWins = 0;
  if (!P.c.guard) P.c.guard = 0;
  if (!P.c.fused) P.c.fused = 0;
  if (!S || S.phase !== "alive") return null;
  if (!S.rpg) S.rpg = { lvl: 1, xp: 0, eq: { a: null, p: null, s: null } };
  if (!P.sigGiven) P.sigGiven = {};
  if (!P.sigGiven[S.species] && MONS[S.species]) {
    P.sigGiven[S.species] = 1;
    const sig = MONS[S.species].cards.map((id) => giveCard(id, 0));
    if (!S.rpg.eq.a) S.rpg.eq.a = sig[0].uid;
  }
  // drop equipped uids that no longer exist
  for (const k of ["a", "p", "s"]) if (S.rpg.eq[k] && !P.cards.some((c) => c.uid === S.rpg.eq[k])) S.rpg.eq[k] = null;
  return S.rpg;
}
function giveCard(id, gi) { const P = EV.P; const c = { uid: "c" + P.cardSeq++, id, g: gi }; P.cards.push(c); return c; }
function cardByUid(uid) { return EV.P.cards.find((c) => c.uid === uid); }
function ownUnitOpts(hpPct) {
  const S = EV.S, R = rpgState();
  const cards = {};
  for (const k of ["a", "p", "s"]) { const c = R.eq[k] && cardByUid(R.eq[k]); if (c && R.lvl >= SLOT_LVL[k]) cards[k] = scaled(c.id, c.g); }
  return { kind: S.species, lvl: R.lvl, side: "ally", name: S.name, own: true, care: S.stats, stage: S.stage, form: S.form, cards, hpPct, lowFun: S.stats.fun < 30 };
}
function expCheck() {
  const S = EV.S;
  if (!S || S.phase !== "alive") return "stage";
  if (S.stage < 1) return "stage";
  if (S.sleeping) return "sleep";
  if (S.sick) return "sick";
  if (S.stats.energy < 30) return "energy";
  return null;
}

/* ---------- Styles ---------- */
const css = `
.exp-go { width: 100%; margin-top: 10px; }
.exp-why { font-size: 12px; color: var(--muted); margin: 6px 2px 0; text-align: center; }
.exp { display: flex; flex-direction: column; gap: 12px; }
.exp .panel { gap: 10px; }
.exp h2 { font-family: var(--font-display); font-size: 22px; margin: 0; }
.exp .sub { font: 700 12px var(--font-mono); text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
.exp .lead { margin: 0; color: var(--muted); }
.ty { display: inline-flex; align-items: center; gap: 3px; font: 600 12px var(--font-body); padding: 2px 8px; border-radius: 999px; background: var(--surface-2, var(--bg)); border: 1px solid var(--line); white-space: nowrap; }
.gr { font: 600 11px var(--font-mono); text-transform: uppercase; letter-spacing: .06em; color: var(--g); border: 1px solid var(--g); border-radius: 999px; padding: 1px 7px; white-space: nowrap; }
.mons { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.mon { border: 2px solid var(--line); border-radius: 16px; background: var(--bg); padding: 8px; display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; cursor: pointer; font: inherit; color: inherit; }
.mon[aria-pressed="true"] { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent); }
.mon canvas { width: 96px; height: 80px; }
.mon strong { font-family: var(--font-display); font-size: 16px; }
.mon small { color: var(--muted); font-size: 12px; line-height: 1.3; }
.party { display: flex; gap: 8px; flex-wrap: wrap; }
.pm { flex: 1 1 140px; border: 1px solid var(--line); border-radius: 12px; padding: 6px 10px; background: var(--bg); font-size: 13px; }
.pm strong { font-family: var(--font-display); font-size: 15px; display: block; }
.pm .bar { height: 8px; margin-top: 4px; }
.pm.down { opacity: .5; }
.nodes { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.node { border: 2px solid var(--line); border-radius: 16px; background: var(--bg); padding: 12px; text-align: left; cursor: pointer; font: inherit; color: inherit; display: flex; flex-direction: column; gap: 4px; min-height: 96px; }
.node:hover { border-color: var(--accent); }
.node .ic { font-size: 26px; line-height: 1; }
.node strong { font-family: var(--font-display); font-size: 17px; }
.node small { color: var(--muted); font-size: 13px; line-height: 1.35; }
.node.boss { border-color: color-mix(in srgb, var(--warn) 60%, var(--line)); }
.trail { display: flex; gap: 6px; align-items: center; }
.trail i { flex: 1; height: 6px; border-radius: 3px; background: var(--line); }
.trail i.done { background: var(--moss); }
.trail i.now { background: var(--accent); }
.bstage { width: 100%; max-width: 620px; margin: 0 auto; position: relative; border-radius: 16px; overflow: hidden; border: 1px solid var(--line); background: #000; }
.bstage canvas { display: block; width: 100%; height: auto; }
.bbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.bbar .grow { flex: 1; }
.blog { list-style: none; margin: 0; padding: 0; font-size: 13px; color: var(--muted); min-height: 5.6em; display: flex; flex-direction: column; gap: 2px; }
.blog li:first-child { color: var(--ink); font-weight: 600; }
.bctl { display: flex; gap: 8px; flex-wrap: wrap; }
.bctl .btn { flex: 1 1 160px; }
.bturn { font-weight: 700; margin: 0; }
.rcards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.rcard { border: 2px solid color-mix(in srgb, var(--g) 55%, var(--line)); border-radius: 14px; background: var(--bg); padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
.rc-top { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.rc-top strong { font-family: var(--font-display); font-size: 16px; line-height: 1.2; }
.rc-top .cnt { font: 600 12px var(--font-mono); color: var(--muted); }
.rc-tags { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.rc-fx { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; font-size: 13px; line-height: 1.35; }
.rc-fx li { color: var(--muted); }
.rc-fx li b { font: 700 11px var(--font-mono); text-transform: uppercase; letter-spacing: .06em; color: var(--ink); margin-right: 4px; }
.rc-fx li.on { color: var(--ink); background: color-mix(in srgb, var(--accent) 10%, transparent); border-radius: 6px; padding: 2px 4px; margin: 0 -4px; }
.rc-lore { margin: 0; font-size: 12px; font-style: italic; color: var(--muted); }
.rc-btns { display: flex; gap: 6px; flex-wrap: wrap; margin-top: auto; }
.rc-btns .btn { padding: 6px 10px; font-size: 12px; min-height: 34px; }
.slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
.slotbox { border: 1px dashed var(--line); border-radius: 14px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.slotbox > .sub { margin: 0; }
.slotbox .muted { font-size: 13px; margin: 0; }
.slotbox select { font: 600 14px var(--font-body); padding: 8px 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); min-height: 40px; width: 100%; }
.rstats { font: 500 12px var(--font-mono); color: var(--muted); margin: 0; }
.xpbar { height: 8px; }
.evt-text { margin: 0; font-size: 15px; line-height: 1.55; }
.evt-out { margin: 0; font-weight: 600; }
.choices { display: flex; flex-direction: column; gap: 8px; }
.choices .btn { text-align: left; justify-content: flex-start; }
.loot { display: flex; gap: 10px; flex-wrap: wrap; font: 600 14px var(--font-mono); }
.loot span { background: var(--bg); border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; }
@media (max-width: 520px) { .mons { grid-template-columns: repeat(2, minmax(0, 1fr)); } .rcards { grid-template-columns: 1fr; } }
`;
const styleEl = document.createElement("style"); styleEl.textContent = css; document.head.appendChild(styleEl);

/* ---------- Extra sounds ---------- */
const tone = EV.tone;
Object.assign(EV.SFX, {
  hit: () => tone(180, 0.08, { type: "square", vol: 0.05, slide: -60 }),
  crit: () => { tone(260, 0.06, { type: "square", vol: 0.06 }); tone(520, 0.12, { type: "square", vol: 0.05, delay: 0.05, slide: -200 }); },
  card: () => { tone(660, 0.07, { type: "triangle", vol: 0.06 }); tone(990, 0.12, { type: "triangle", vol: 0.05, delay: 0.06 }); },
  miss: () => tone(900, 0.08, { vol: 0.03, slide: 400 }),
  ko: () => tone(300, 0.35, { type: "sawtooth", vol: 0.035, slide: -220 }),
  win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, { type: "triangle", vol: 0.06, delay: i * 0.09 })); },
});

/* ---------- Achievements ---------- */
EV.ACH.push(["exp1", 15, (p) => (p.c.expWins || 0) >= 1], ["guard1", 40, (p) => (p.c.guard || 0) >= 1], ["cards10", 20, (p) => (p.cards || []).length >= 10], ["fuse1", 15, (p) => (p.c.fused || 0) >= 1]);
for (const lg of ["es", "en"]) {
  for (const id of ["exp1", "guard1", "cards10", "fuse1"]) EV.STR[lg].ach[id] = TX[lg]["ach." + id];
  EV.STR[lg]["nav.cards"] = TX[lg]["nav.cards"];
}
EV.applyStatic();

/* ---------- Drawing other creatures (simple originals) ---------- */
const MONCOL = {
  fuellito: { body: "#e8743b", belly: "#ffd29a", line: "#8a3a17", cheek: "#ffb3a0" },
  brotin:   { body: "#b5814a", belly: "#e8cfa2", line: "#5e3d1c", cheek: "#f0a58a" },
  remolin:  { body: "#5aa6c9", belly: "#d4eef7", line: "#2c5f78", cheek: "#f4a6c4" },
  bostezo:  { body: "#efe7f7", belly: "#ffffff", line: "#7d6c98", cheek: "#f6b5cf" },
  farol:    { body: "#3c3a4a", belly: "#ffe9a6", line: "#1d1b26", cheek: "#f4a6a0" },
};
function drawMon(c, kind, o) {
  const ell = EV.ell;
  if (kind === "lumo" || kind === "fizz" || kind === "pebb") {
    EV.drawCreature(c, 0, 0, { kind, stage: o.stage, form: o.hollow ? "scruffy" : o.form, t: o.t, mood: o.hp < 0.35 ? 20 : 60, sleeping: o.ko, sick: false, blink: o.ko, eat: false, jump: 0 });
  } else if (MONCOL[kind]) {
    const col = MONCOL[kind];
    const br = Math.sin(o.t * 3) * 0.03;
    c.save(); c.scale(1 + br, 1 - br);
    c.save(); c.globalAlpha = 0.18; c.fillStyle = "#000"; ell(c, 0, 40, 40, 7); c.fill(); c.restore();
    c.lineWidth = 3; c.strokeStyle = col.line;
    if (kind === "farol") {
      // a great lantern on legs
      c.fillStyle = col.body; c.fillRect(-6, -78, 12, 14);
      c.beginPath(); c.moveTo(-34, -64); c.lineTo(34, -64); c.lineTo(26, -54); c.lineTo(-26, -54); c.closePath(); c.fill(); c.stroke();
      const glow = 0.6 + Math.sin(o.t * 4) * 0.2;
      c.save(); c.shadowColor = "#ffd35a"; c.shadowBlur = 30 * glow;
      c.fillStyle = `rgba(255, 226, 122, ${0.75 + glow * 0.25})`; c.beginPath(); c.moveTo(-26, -54); c.lineTo(26, -54); c.lineTo(32, 20); c.lineTo(-32, 20); c.closePath(); c.fill(); c.restore();
      c.stroke();
      c.fillStyle = col.body; for (const x of [-12, 12]) c.fillRect(x - 2, -54, 4, 74);
      c.beginPath(); c.moveTo(-36, 20); c.lineTo(36, 20); c.lineTo(30, 30); c.lineTo(-30, 30); c.closePath(); c.fill(); c.stroke();
      for (const x of [-20, 20]) { c.fillRect(x - 4, 30, 8, 12); }
      // eyes inside the glass
      c.fillStyle = "#3a2a10"; for (const x of [-10, 10]) { ell(c, x, -18, 5, o.ko ? 1 : 6); c.fill(); }
    } else {
      // round body
      const g = c.createRadialGradient(-14, -18, 6, 0, 0, 60); g.addColorStop(0, col.belly); g.addColorStop(0.45, col.body); g.addColorStop(1, col.body);
      c.fillStyle = g;
      if (kind === "bostezo") { c.beginPath(); for (const [px, py, r] of [[-26, 8, 18], [-14, -18, 20], [10, -22, 20], [28, -2, 18], [24, 22, 16], [0, 24, 22], [-24, 26, 14]]) { c.moveTo(px + r, py); c.arc(px, py, r, 0, 7); } c.stroke(); c.fill(); }
      else { ell(c, 0, 0, 38, kind === "brotin" ? 40 : 36); c.fill(); c.stroke(); c.fillStyle = col.belly; ell(c, 0, 14, 22, 18); c.fill(); }
      if (kind !== "bostezo") { c.fillStyle = col.body; c.lineWidth = 2.5; for (const fx of [-16, 16]) { ell(c, fx, 36, 10, 6); c.fill(); c.stroke(); } }
      // features
      if (kind === "brotin") {
        c.fillStyle = "#7a5228"; c.beginPath(); c.moveTo(-36, -14); c.quadraticCurveTo(0, -52, 36, -14); c.quadraticCurveTo(0, -30, -36, -14); c.fill();
        c.fillStyle = "#6aa84f"; c.strokeStyle = "#3e6e2c"; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -38); c.quadraticCurveTo(-6, -58, -18, -60); c.quadraticCurveTo(-6, -46, 0, -38); c.fill(); c.stroke();
      } else if (kind === "fuellito") {
        const fl = Math.sin(o.t * 9) * 3;
        c.save(); c.shadowColor = "#ffb347"; c.shadowBlur = 12; c.fillStyle = "#ffb347"; c.beginPath(); c.moveTo(30, 10); c.quadraticCurveTo(60, 0 + fl, 52, -26 + fl); c.quadraticCurveTo(48, -6, 34, -2); c.fill(); c.fillStyle = "#ffe27a"; c.beginPath(); c.moveTo(34, 6); c.quadraticCurveTo(50, 0, 48, -14 + fl); c.quadraticCurveTo(42, -2, 34, 0); c.fill(); c.restore();
        c.strokeStyle = col.line; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-14, 6 + i * 7); c.lineTo(14, 6 + i * 7); c.stroke(); }
      } else if (kind === "remolin") {
        c.fillStyle = col.body; c.strokeStyle = col.line; c.lineWidth = 2.5; for (const s of [-1, 1]) { ell(c, s * 26, -30, 8, 8); c.fill(); c.stroke(); }
        c.strokeStyle = col.line; c.lineWidth = 3; c.beginPath(); c.arc(42, 18, 10, Math.PI * 0.6, Math.PI * 2.1); c.stroke();
      } else if (kind === "bostezo") {
        c.fillStyle = "#cbbbe0"; c.strokeStyle = col.line; c.lineWidth = 2; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 40, -10, 16, 9, s * 0.5, 0, 7); c.fill(); c.stroke(); }
        c.strokeStyle = col.line; c.lineWidth = 2; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 8, -38); c.quadraticCurveTo(s * 14, -54, s * 22, -54); c.stroke(); }
      }
      // face
      const ey = -6;
      c.fillStyle = "#2a2230"; c.strokeStyle = "#2a2230"; c.lineWidth = 2.6; c.lineCap = "round";
      for (const s of [-1, 1]) {
        const ex = s * 13;
        if (o.ko || (kind === "bostezo" && Math.sin(o.t * 0.7) > 0.6)) { c.beginPath(); c.arc(ex, ey, 5, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
        else { ell(c, ex, ey, 5, 6); c.fill(); c.fillStyle = "#fff"; ell(c, ex - 1.6, ey - 2.2, 1.8, 1.8); c.fill(); c.fillStyle = "#2a2230"; }
      }
      c.fillStyle = col.cheek; c.globalAlpha = 0.7; for (const s of [-1, 1]) { ell(c, s * 23, ey + 8, 5.5, 3.2); c.fill(); } c.globalAlpha = 1;
      c.beginPath(); if (o.hp < 0.35) c.arc(0, ey + 18, 5, 1.15 * Math.PI, 1.85 * Math.PI); else c.arc(0, ey + 9, 6, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    }
    c.restore();
  }
  if (o.hollow) {
    // the Black Sap: dark drips and a dim violet haze
    c.save(); c.globalAlpha = 0.28; c.fillStyle = "#3b1d4a"; ell(c, 0, 0, 42, 42); c.fill(); c.restore();
    c.fillStyle = "#24122e";
    for (let i = 0; i < 3; i++) { const dy = (o.t * 18 + i * 17) % 30; c.globalAlpha = 1 - dy / 30; EV.ell(c, -18 + i * 18, 26 + dy, 3, 5); c.fill(); }
    c.globalAlpha = 1;
  }
}
function monName(kind, hollow) {
  if (kind === "farol") return tx("boss.farol");
  const n = MON_NAMES[kind];
  return hollow ? tx("foe.hollow", { name: n }) : n;
}

/* ====================================================================== */
/* Expedition state (memory only: leaving the page abandons the trip)     */
/* ====================================================================== */
let X = null;           // current expedition
let view = null;        // current view name
let battle = null;      // current battle presentation state
const rnd = Math.random;
const pickN = (arr, n) => { const a = arr.slice(); const out = []; while (a.length && out.length < n) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]); return out; };

function startExpedition() {
  const why = expCheck(); if (why) { EV.toast(tx("exp.need." + why)); EV.sfx("deny"); return; }
  rpgState();
  const S = EV.S;
  const z = ZONES.aurora;
  const offer = pickN(z.allies.filter((k) => k !== S.species), 3);
  X = { zone: "aurora", step: "pick", offer, chosen: [], party: [], section: 0, nodes: [], loot: { xp: 0, coins: 0, cards: [] }, nextFoeBuff: 0, wins: 0 };
  show("pick");
}
function setOut() {
  const S = EV.S;
  S.stats.energy = Math.max(0, S.stats.energy - 25);
  const R = rpgState();
  X.party = [{ own: true, kind: S.species, hp: 1 }].concat(X.chosen.map((k) => ({ own: false, kind: k, hp: 1, lvl: R.lvl })));
  EV.addLog(tx("log.expGo", { name: S.name }));
  EV.save();
  nextSection();
}
function nextSection() {
  const z = ZONES[X.zone];
  X.section++;
  if (X.section > z.sections) { X.nodes = ["boss"]; healParty(0.3); show("map"); return; }
  const types = ["fight", "fight", "event", "chest", "rest", "event", "fight"];
  let n = X.section === 1 ? ["fight", "event"] : pickN(types, 3);
  n = Array.from(new Set(n));
  if (n.length < 2) n.push(n[0] === "fight" ? "event" : "fight");
  if (X.section === 1 && rnd() < 0.5) n.push("chest");
  X.nodes = n.slice(0, 3);
  show("map");
}
function partyUnits() {
  return X.party.map((m) => {
    if (m.own) return makeUnit(ownUnitOpts(m.hp));
    const cards = { a: scaled(MONS[m.kind].cards[0], 0), p: scaled(MONS[m.kind].cards[1], 0) };
    if (m.lvl >= SLOT_LVL.s) cards.s = scaled(MONS[m.kind].cards[2], 0);
    return makeUnit({ kind: m.kind, lvl: m.lvl, side: "ally", name: monName(m.kind), wild: true, cards, hpPct: m.hp, stage: 1, form: "bright" });
  });
}
function foeUnits(boss) {
  const z = ZONES[X.zone], R = rpgState();
  if (boss) {
    const lvl = Math.max(1, R.lvl);
    const m = MONS.farol;
    const cards = { a: scaled(m.cards[0], 0), p: scaled(m.cards[1], 0), s: scaled(m.cards[2], 0) };
    return [makeUnit({ kind: "farol", lvl, side: "foe", name: monName("farol"), boss: true, cards, stage: 1 })];
  }
  const count = X.section <= 1 ? 2 : rnd() < 0.5 ? 3 : 2;
  const lvl = Math.max(1, Math.round(R.lvl * 0.8 + (X.section - 1) * 0.25));
  return pickN(z.foes.concat(z.foes), count).map((k) => {
    const cs = MONS[k].cards;
    const cards = { a: scaled(cs[Math.floor(rnd() * 2)], 0) };
    if (X.section >= 4) cards.p = scaled(cs[1], 0);
    const u = makeUnit({ kind: k, lvl, side: "foe", name: monName(k, true), hollow: true, cards, stage: 1 });
    if (X.nextFoeBuff) { u.base.str *= 1 + X.nextFoeBuff / 100; }
    return u;
  });
}

/* ---------- Views ---------- */
function show(v) { view = v; render(); const el = $("scrExp"); if (el && !el.hidden) el.scrollIntoView({ behavior: "smooth", block: "start" }); }
function partyHtml() {
  return `<div class="party">${X.party.map((m) => {
    const nm = m.own ? EV.S.name : monName(m.kind);
    const ty = MONS[m.kind].types[0];
    return `<div class="pm${m.hp <= 0 ? " down" : ""}"><strong>${esc(nm)}</strong>${typeChip(ty)} <span class="progress">${Math.round(m.hp * 100)} %</span><div class="bar"><i style="width:${Math.round(m.hp * 100)}%"></i></div></div>`;
  }).join("")}</div>`;
}
function trailHtml() {
  const z = ZONES[X.zone], out = [];
  for (let i = 1; i <= z.sections + 1; i++) out.push(`<i class="${i < X.section ? "done" : i === X.section ? "now" : ""}"></i>`);
  return `<div class="trail" aria-hidden="true">${out.join("")}</div>`;
}
function render() {
  const el = $("scrExp"); if (!el) return;
  if (!X) { el.innerHTML = ""; return; }
  const z = ZONES[X.zone];
  const head = `<div class="panel"><div class="panel-head"><div><div class="sub">${esc(tx("exp.zoneSub"))}</div><h2>${esc(tx("exp.title"))}</h2></div>${view !== "pick" && view !== "end" && view !== "battle" ? `<button class="btn ghost" type="button" data-x="quit">${esc(tx("quit"))}</button>` : ""}</div>${view !== "pick" ? trailHtml() : ""}</div>`;
  let body = "";
  if (view === "pick") {
    body = `<div class="panel"><p class="lead">${esc(tx("exp.zoneDesc"))}</p>
      <h3>${esc(tx("exp.pick"))}</h3><p class="muted" style="margin:0">${esc(tx("exp.pickSub"))}</p>
      <div class="mons">${X.offer.map((k) => `<button type="button" class="mon" data-pick="${k}" aria-pressed="${X.chosen.includes(k)}"><canvas width="96" height="80" data-mon="${k}"></canvas><strong>${esc(monName(k))}</strong>${typeChip(MONS[k].types[0])}<small>${esc(MON_DESC[L()][k])}</small></button>`).join("")}</div>
      </div>${loadoutHtml()}<div class="panel">
      <div class="bctl"><button class="btn" type="button" data-x="go" ${X.chosen.length === 2 ? "" : "disabled"}>${esc(tx("exp.go"))} · ${esc(tx("exp.cost"))}</button><button class="btn ghost" type="button" data-x="cancel">${esc(tx("exp.cancel"))}</button></div></div>`;
  } else if (view === "map") {
    const icons = { fight: "⚔️", event: "❓", chest: "🎁", rest: "🔥", boss: "🏮" };
    body = `<div class="panel"><div class="sub">${esc(X.nodes[0] === "boss" ? tx("node.boss") : tx("exp.section", { n: X.section, m: z.sections }))}</div>
      <h3>${esc(X.nodes[0] === "boss" ? tx("exp.bossNext") : tx("exp.choose"))}</h3>
      <div class="nodes">${X.nodes.map((n) => `<button type="button" class="node${n === "boss" ? " boss" : ""}" data-node="${n}"><span class="ic" aria-hidden="true">${icons[n]}</span><strong>${esc(tx("node." + n))}</strong><small>${esc(tx("node." + n + ".d"))}</small></button>`).join("")}</div></div>
      <div class="panel"><h3>${esc(tx("exp.party"))}</h3>${partyHtml()}${lootHtml()}</div>`;
  } else if (view === "battle") {
    body = `<div class="panel"><div class="bbar"><span class="sub grow" id="bRound"></span>
        <div class="seg" id="bMode"><button type="button" data-m="auto" aria-pressed="${EV.P.rpgMode === "auto"}">${esc(tx("b.auto"))}</button><button type="button" data-m="manual" aria-pressed="${EV.P.rpgMode === "manual"}">${esc(tx("b.manual"))}</button></div>
        <div class="seg" id="bSpeed">${[1, 2, 4].map((s) => `<button type="button" data-s="${s}" aria-pressed="${(EV.P.rpgSpeed || 1) === s}">×${s}</button>`).join("")}</div></div>
      <div class="bstage"><canvas id="bCanvas" role="img" aria-label="${esc(tx("exp.title"))}"></canvas></div>
      <div id="bTurn"></div>
      <ul class="blog" id="bLog" aria-live="polite"></ul></div>`;
  } else if (view === "event") {
    body = eventHtml();
  } else if (view === "reward") {
    body = rewardHtml();
  } else if (view === "end") {
    body = endHtml();
  }
  el.innerHTML = head + body;
  if (view === "pick") el.querySelectorAll("canvas[data-mon]").forEach((cv) => { const c = EV.setupCanvas(cv, 96, 80); c.translate(48, 44); c.scale(0.62, 0.62); drawMon(c, cv.dataset.mon, { t: 0.5, stage: 1, form: "bright", hp: 1 }); });
  if (view === "battle") battleMount();
}
// pre-trip loadout: up to 3 cards, one per slot, chosen before setting out
function loadoutHtml() {
  const R = rpgState(), P = EV.P; if (!R) return "";
  const eqIds = {};
  for (const k of ["a", "p", "s"]) { const c = R.eq[k] && cardByUid(R.eq[k]); if (c) eqIds[k] = c.id; }
  // one option per distinct card (best grade first)
  const best = {};
  for (const c of P.cards) if (!best[c.id] || c.g > best[c.id].g) best[c.id] = c;
  const opts = Object.values(best).sort((a, b) => b.g - a.g || cardName(a.id).localeCompare(cardName(b.id)));
  const slots = ["a", "p", "s"].map((k) => {
    const locked = R.lvl < SLOT_LVL[k];
    const cur = R.eq[k] && cardByUid(R.eq[k]);
    const sel = `<select data-load="${k}" ${locked ? "disabled" : ""} aria-label="${esc(tx("slot." + k))}"><option value="">${esc(tx("cards.empty"))}</option>${opts.map((c) => {
      const other = Object.keys(eqIds).find((s) => s !== k && eqIds[s] === c.id);
      const uid = cur && cur.id === c.id ? cur.uid : c.uid;
      return `<option value="${uid}" ${cur && cur.id === c.id ? "selected" : ""}>${esc(cardName(c.id))} · ${esc(GRADES[c.g][L()])} · ${TYPES[CARDS[c.id].type].icon}${other ? " (" + esc(tx("slot." + other)) + ")" : ""}</option>`;
    }).join("")}</select>`;
    const fx = cur && !locked ? `<p class="muted">${esc(slotText(scaled(cur.id, cur.g), k))}</p>` : locked ? `<p class="muted">🔒 ${esc(tx("load.lock", { n: SLOT_LVL[k] }))}</p>` : "";
    return `<div class="slotbox"><p class="sub">${esc(tx("slot." + k))}</p>${sel}${fx}</div>`;
  }).join("");
  return `<div class="panel"><h3>${esc(tx("load.title"))}</h3><p class="muted" style="margin:0">${esc(tx("load.sub"))}</p><div class="slots">${slots}</div></div>`;
}
function setLoad(slot, uid) {
  const R = rpgState(); if (!R) return;
  const c = uid && cardByUid(uid);
  if (c) for (const k of ["a", "p", "s"]) { const o = R.eq[k] && cardByUid(R.eq[k]); if (k !== slot && o && o.id === c.id) R.eq[k] = null; }
  R.eq[slot] = c ? c.uid : null;
  EV.sfx("card"); EV.save(); render();
}
function lootHtml() {
  const l = X.loot;
  return `<div class="loot"><span>${esc(tx("r.xp", { n: l.xp }))}</span><span>✦ ${l.coins}</span><span>🃏 ${l.cards.length}</span></div>`;
}

/* ---------- Battle presentation ---------- */
const BW = 360, BH = 240;
const POS = { ally: [[96, 92], [56, 148], [116, 196]], foe: [[264, 92], [304, 148], [244, 196]] };
function startBattle(boss) {
  const allies = partyUnits().filter((u) => u.hp > 0);
  const foes = foeUnits(boss);
  X.nextFoeBuff = 0;
  const b = new Battle(allies, foes, { zone: ZONES[X.zone], day: isDayNow() });
  const all = b.units;
  const anim = {};
  ["ally", "foe"].forEach((side) => all.filter((u) => u.side === side).forEach((u, i) => { anim[u.uid] = { x: POS[side][i][0], y: POS[side][i][1], lunge: 0, flash: 0, shownHp: u.hp }; }));
  battle = { b, boss, anim, floats: [], log: [], waiting: null, done: false, cv: null, c: null, raf: 0 };
  show("battle");
  runBattle();
}
function battleMount() {
  const cv = $("bCanvas"); if (!cv || !battle) return;
  battle.cv = cv; battle.c = EV.setupCanvas(cv, BW, BH);
  cv.style.aspectRatio = BW + " / " + BH;
  if (!battle.raf) battle.raf = requestAnimationFrame(drawBattle);
  renderBLog(); renderTurn();
}
const speed = () => EV.P.rpgSpeed || 1;
const wait = (ms) => new Promise((r) => setTimeout(r, ms / speed()));
function uName(uid) { const u = battle.b.units.find((x) => x.uid === uid); return u ? u.name : ""; }
function blog(s) { battle.log.unshift(s); battle.log = battle.log.slice(0, 5); renderBLog(); }
function renderBLog() { const el = $("bLog"); if (el && battle) el.innerHTML = battle.log.map((s) => `<li>${esc(s)}</li>`).join(""); const r = $("bRound"); if (r && battle) r.textContent = tx("b.round", { n: Math.max(1, battle.b.round) }); }
function flushEvents() {
  const b = battle.b, ev = b.events.splice(0);
  let hitSfx = null;
  for (const e of ev) {
    const a = e.u && battle.anim[e.u];
    switch (e.k) {
      case "act": { const u = b.units.find((x) => x.uid === e.u); if (a) a.lunge = 1; if (e.card) { blog(tx("log.act", { name: u.name, card: cardName(e.card) })); EV.sfx("card"); } else blog(tx("log.basic", { name: u.name })); break; }
      case "support": blog(tx("log.support", { name: uName(e.u), card: cardName(e.card) })); if (a) battle.floats.push({ x: a.x, y: a.y - 44, text: "★ " + cardName(e.card), col: "#ffe27a", life: 1.4, small: true }); break;
      case "dmg":
        if (a) { a.flash = 1; battle.floats.push({ x: a.x + (Math.random() * 16 - 8), y: a.y - 34, text: (e.crit ? "¡" : "") + e.n + (e.crit ? "!" : ""), col: e.dot ? "#ff9a4a" : e.crit ? "#ffd35a" : e.eff === "up" ? "#ff7a6a" : "#ffffff", life: 1.1, big: e.crit }); }
        if (e.dot) blog(tx("log.burn", { name: uName(e.u), n: e.n }));
        else blog(tx("log.dmg", { name: uName(e.u), n: e.n, crit: e.crit ? tx("log.crit") : "", eff: e.eff ? tx("log." + e.eff) : "" }));
        hitSfx = e.crit ? "crit" : hitSfx || "hit"; break;
      case "miss": if (a) battle.floats.push({ x: a.x, y: a.y - 34, text: e.blind ? "✴" : "~", col: "#cfe8ff", life: 1 }); blog(e.blind ? tx("log.blindMiss", { name: uName(e.by) }) : tx("log.miss", { name: uName(e.u) })); hitSfx = hitSfx || "miss"; break;
      case "heal": if (a) battle.floats.push({ x: a.x, y: a.y - 34, text: "+" + e.n, col: "#8fe08a", life: 1.1 }); blog(tx("log.heal", { name: uName(e.u), n: e.n })); break;
      case "st": if (a) battle.floats.push({ x: a.x, y: a.y - 48, text: STATUS[e.st].icon + " " + STATUS[e.st][L()], col: STATUS[e.st].neg ? "#ffb0c8" : "#bfe8ff", life: 1.3, small: true }); blog(tx("log.st", { name: uName(e.u), st: STATUS[e.st][L()] })); break;
      case "shield": blog(tx("log.shield", { name: uName(e.u), n: e.n })); break;
      case "break": blog(tx("log.break")); break;
      case "cleanse": blog(tx("log.cleanse", { name: uName(e.u), st: e.st.map((s) => STATUS[s][L()]).join(", ") })); break;
      case "resist": blog(tx("log.resist", { name: uName(e.u) })); break;
      case "save": blog(tx("log.save")); break;
      case "ko": blog(tx("log.ko", { name: uName(e.u) })); EV.sfx("ko"); EV.buzz(40); break;
      case "skip": blog(tx("log.skip." + e.why, { name: uName(e.u) })); break;
      case "round": renderBLog(); break;
    }
  }
  if (hitSfx) { EV.sfx(hitSfx); if (hitSfx === "crit") EV.buzz(25); }
}
function askPlayer(u) {
  return new Promise((resolve) => { battle.waiting = { u, resolve }; renderTurn(); });
}
function renderTurn() {
  const el = $("bTurn"); if (!el || !battle) return;
  const w = battle.waiting;
  if (!w) { el.innerHTML = ""; return; }
  const u = w.u, a = u.cards.a;
  const can = battle.b.canPlay(u);
  el.innerHTML = `<p class="bturn">${esc(tx("b.yourTurn", { name: u.name }))}</p><div class="bctl">
    <button class="btn" type="button" data-b="card" ${can ? "" : "disabled"}>${a ? esc(tx("b.play", { card: cardName(a.id) })) + (can ? "" : " · " + esc(tx("b.cd", { n: u.cd }))) : esc(tx("b.noCard"))}</button>
    <button class="btn ghost" type="button" data-b="basic">${esc(tx("b.basic"))}</button></div>`;
}
async function runBattle() {
  const bt = battle, b = bt.b;
  await wait(400);
  b.start(); flushEvents(); await wait(500);
  while (!b.checkOver() && b.round < 40) {
    const order = b.roundStart(); flushEvents();
    for (const u of order) {
      if (bt !== battle) return;
      if (b.over) break;
      if (!b.turnStart(u)) { flushEvents(); b.checkOver(); await wait(450); continue; }
      flushEvents();
      let use;
      if (u.side === "ally" && EV.P.rpgMode === "manual") use = await askPlayer(u);
      else use = b.wantPlay(u);
      if (bt !== battle) return;
      b.act(u, use); flushEvents();
      await wait(use ? 900 : 700);
    }
  }
  const res = b.over || "lose";
  bt.done = true;
  blog(res === "win" ? tx("b.win") : tx("b.lose"));
  if (res === "win") EV.sfx("win");
  await wait(1100);
  if (bt !== battle) return;
  cancelAnimationFrame(bt.raf); bt.raf = 0;
  endBattle(res);
}
function endBattle(res) {
  const b = battle.b, boss = battle.boss;
  // carry health back to the party
  const allies = b.units.filter((u) => u.side === "ally");
  let i = 0;
  for (const m of X.party) {
    if (m.hp <= 0) continue;
    const u = allies[i++]; if (!u) continue;
    m.hp = u.hp / u.maxHp;
  }
  battle = null;
  for (const m of X.party) if (m.own && m.hp <= 0) X.ownFalls = (X.ownFalls || 0) + 1;
  if (res !== "win") { finish("lose"); return; }
  // revive the fallen with a little health, apply after-battle supports
  const winHeal = allies.filter((u) => u.hp > 0 && u.cards.s && u.cards.s.s.on === "win").reduce((a, u) => a + u.cards.s.s.heal, 0) / 100;
  for (const m of X.party) m.hp = m.hp <= 0 ? 0.3 : Math.min(1, m.hp + 0.25 + winHeal);
  X.wins++; EV.P.c.expWins = (EV.P.c.expWins || 0) + 1;
  const foes = b.units.filter((u) => u.side === "foe");
  const xp = foes.reduce((a, u) => a + 8 + 4 * u.lvl, 0) * (boss ? 2 : 1);
  const coins = boss ? 30 : 3 + Math.floor(rnd() * 4) + foes.length;
  X.loot.xp += xp; X.loot.coins += coins;
  const offer = boss ? offerCards(3, 3) : rnd() < 0.3 ? offerCards(3, 0) : null;
  X.reward = { xp, coins, offer, after: boss ? "win" : "next" };
  EV.checkAch();
  show("reward");
}
function offerCards(n, minGrade) {
  const z = ZONES[X.zone];
  const weighted = [];
  for (const id of DROP_POOL) { const w = CARDS[id].type === z.type ? 3 : 1; for (let i = 0; i < w; i++) weighted.push(id); }
  const ids = [];
  while (ids.length < n) { const id = weighted[Math.floor(rnd() * weighted.length)]; if (!ids.includes(id)) ids.push(id); }
  return ids.map((id) => ({ id, g: rollGrade(minGrade) }));
}
function rewardHtml() {
  const r = X.reward;
  const parts = [];
  if (r.xp) parts.push(`<span>${esc(tx("r.xp", { n: r.xp }))}</span>`);
  if (r.coins) parts.push(`<span>✦ ${esc(tx("r.coins", { n: r.coins }))}</span>`);
  let html = `<div class="panel"><h3>${esc(r.title || tx("r.title"))}</h3>${r.text ? `<p class="evt-out">${esc(r.text)}</p>` : ""}${parts.length ? `<div class="loot">${parts.join("")}</div>` : ""}`;
  if (r.offer) {
    html += `<h3>${esc(tx("r.pick"))}</h3><div class="rcards">${r.offer.map((o, i) => cardHtml(o.id, o.g, { foot: `<div class="rc-btns"><button class="btn" type="button" data-take="${i}">${esc(tx("r.pick"))}</button></div>` })).join("")}</div>
      <div class="bctl"><button class="btn ghost" type="button" data-take="-1">${esc(tx("r.skip"))}</button></div>`;
  } else html += `<div class="bctl"><button class="btn" type="button" data-x="continue">${esc(tx("r.continue"))}</button></div>`;
  return html + `</div><div class="panel"><h3>${esc(tx("exp.party"))}</h3>${partyHtml()}${lootHtml()}</div>`;
}
function afterReward() {
  const a = X.reward && X.reward.after;
  X.reward = null;
  if (a === "win") finish("win"); else nextSection();
}

/* ---------- Battle drawing ---------- */
function drawBattle(now) {
  if (!battle || !battle.c) return;
  const c = battle.c, b = battle.b, t = now / 1000, z = ZONES[X.zone];
  const day = b.day;
  const sky = c.createLinearGradient(0, 0, 0, BH);
  const sk = day ? z.sky : z.skyN;
  sky.addColorStop(0, sk[1]); sky.addColorStop(0.6, sk[0]); sky.addColorStop(1, sk[0]);
  c.fillStyle = sky; c.fillRect(0, 0, BW, BH);
  // distant lanterns
  for (let i = 0; i < 6; i++) { const x = 20 + i * 64, y = 44 + (i % 2) * 8; c.save(); c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2 + i); c.shadowColor = "#ffd35a"; c.shadowBlur = 10; c.fillStyle = "#ffe27a"; c.fillRect(x - 3, y - 6, 6, 9); c.restore(); c.fillStyle = "#00000033"; c.fillRect(x - 1, y + 3, 2, 26); }
  c.fillStyle = day ? z.ground : z.groundN; c.beginPath(); c.moveTo(0, 70); c.quadraticCurveTo(BW / 2, 52, BW, 70); c.lineTo(BW, BH); c.lineTo(0, BH); c.fill();
  c.fillStyle = "#00000014"; for (let i = 0; i < 40; i++) { const x = (i * 97) % BW, y = 80 + ((i * 53) % 140); c.fillRect(x, y, 2, 5); }
  // units
  const order = b.units.slice().sort((p, q) => battle.anim[p.uid].y - battle.anim[q.uid].y);
  for (const u of order) {
    const a = battle.anim[u.uid];
    a.lunge = Math.max(0, a.lunge - 0.06); a.flash = Math.max(0, a.flash - 0.07);
    a.shownHp += (u.hp - a.shownHp) * 0.15;
    const dir = u.side === "ally" ? 1 : -1;
    const lx = Math.sin(a.lunge * Math.PI) * 18 * dir;
    const ko = u.hp <= 0;
    c.save(); c.translate(a.x + lx, a.y + (ko ? 8 : 0));
    const sc = u.boss ? 0.62 : 0.4;
    c.save(); if (u.side === "foe" && !u.boss) c.scale(-1, 1); c.scale(sc, sc);
    if (ko) c.globalAlpha = 0.35;
    drawMon(c, u.kind, { t: t + a.x, stage: u.own ? u.stage : 1, form: u.form, hollow: u.hollow, hp: u.hp / u.maxHp, ko });
    c.restore();
    if (a.flash > 0) { c.save(); c.globalAlpha = a.flash * 0.6; c.fillStyle = "#ffffff"; EV.ell(c, 0, -4, 22 * (u.boss ? 1.5 : 1), 22 * (u.boss ? 1.8 : 1)); c.fill(); c.restore(); }
    // shield ring
    if (u.shield > 0) { c.save(); c.strokeStyle = "#8fd3ff"; c.lineWidth = 2; c.globalAlpha = 0.8; c.beginPath(); c.arc(0, -4, u.boss ? 40 : 24, 0, Math.PI * 2); c.stroke(); c.restore(); }
    // hp bar + name
    const bw = u.boss ? 80 : 54, by = u.boss ? 30 : 22;
    c.fillStyle = "#00000088"; c.fillRect(-bw / 2 - 1, by - 1, bw + 2, 7);
    const pct = Math.max(0, a.shownHp / u.maxHp);
    c.fillStyle = pct > 0.5 ? "#6fd06a" : pct > 0.25 ? "#f2b632" : "#ef6a5a"; c.fillRect(-bw / 2, by, bw * pct, 5);
    if (u.shield > 0) { c.fillStyle = "#8fd3ff"; c.fillRect(-bw / 2, by, Math.min(bw, bw * u.shield / u.maxHp), 2); }
    c.font = "700 9px Nunito, system-ui, sans-serif"; c.textAlign = "center"; c.fillStyle = "#ffffff"; c.strokeStyle = "#00000099"; c.lineWidth = 3;
    const label = u.name.length > 14 ? u.name.slice(0, 13) + "…" : u.name;
    c.strokeText(label + " · " + u.lvl, 0, by + 15); c.fillText(label + " · " + u.lvl, 0, by + 15);
    const icons = Object.keys(u.st).map((k) => STATUS[k].icon).join("") + TYPES[u.types[0]].icon;
    c.font = "10px system-ui"; c.fillText(icons, 0, -(u.boss ? 56 : 30));
    // card ready marker
    if (u.cards.a && u.cd <= 0 && !ko) { c.fillStyle = "#ffe27a"; c.beginPath(); c.arc(bw / 2 + 5, by + 2, 3, 0, 7); c.fill(); }
    c.restore();
  }
  // floating texts
  for (const f of battle.floats) {
    f.life -= 0.016; f.y -= 0.45;
    c.save(); c.globalAlpha = Math.max(0, Math.min(1, f.life)); c.textAlign = "center";
    c.font = f.big ? "800 16px Grandstander, system-ui" : f.small ? "700 9px Nunito, system-ui" : "800 13px Grandstander, system-ui";
    c.lineWidth = 3; c.strokeStyle = "#000000aa"; c.strokeText(f.text, f.x, f.y); c.fillStyle = f.col; c.fillText(f.text, f.x, f.y); c.restore();
  }
  battle.floats = battle.floats.filter((f) => f.life > 0);
  battle.raf = requestAnimationFrame(drawBattle);
}

/* ---------- Events on the path ---------- */
function rollEvent() { return EVENTS[Math.floor(rnd() * EVENTS.length)]; }
const EVT = {
  es: {
    farol: { t: "Un farol del camino está tirado en la hierba. De su base gotea una savia negra y espesa, y la llama tiembla como si tuviera frío.", c: ["Levantarlo y limpiarle la savia", "Quitarle el aceite que le queda", "Dejarlo y seguir"],
      o: ["Os manchas las patas, pero la llama vuelve a crecer. El equipo pierde un poco de vida y gana experiencia.", "Te llevas un frasquito de aceite que vale unas Chispas. Las criaturas apagadas de delante parecen más enfadadas.", "Sigues adelante. El farol se queda parpadeando a tu espalda."] },
    patrol: { t: "Dos guardas del Farol cortan el paso. «Ley del Umbral: después del ocaso nadie cruza hacia el Envés. ¿Adónde vais?»", c: ["Explicarles que vas al Gran Farol", "Escabullirse entre la hierba", "Ofrecerles 8 Chispas por el paso"],
      o: ["Te miran de arriba abajo y te dejan pasar. Uno susurra: «Si llegas, dile que no todos le tenemos miedo».", "", "Se guardan las Chispas sin mirarte y se apartan."] },
    tila: { t: "En una esquina del camino, Tila, del Barrio Apagado, rellena faroles con una aceitera casi vacía. «¿Te sobra algo? En mi calle hoy no habrá luz.»", c: ["Darle 10 Chispas", "Preguntarle por qué su barrio está apagado", "Seguir tu camino"],
      o: ["Tila sonríe y comparte contigo una infusión tibia. El equipo recupera vida.", "«Porque la luz cuesta, y no a todos nos la regalan.» Te quedas pensando. Ganas experiencia.", "Tila no dice nada. Sigue rellenando faroles."] },
    well: { t: "Entre las raíces de un roble hay un pozo pequeño que brilla desde dentro, como si alguien hubiera dejado caer un trozo de amanecer.", c: ["Beber un sorbo", "Asomarse al fondo", "Llenar un frasco"],
      o: ["El agua sabe a mañana de verano. El equipo recupera mucha vida.", "Abajo, muy abajo, la luz se vuelve negra y se mueve sola. Mejor no mirar más. Ganas experiencia.", "El frasco brilla en tu mochila. Dentro hay algo con forma de carta."] },
  },
  en: {
    farol: { t: "A wayside lantern lies in the grass. A thick black sap drips from its base, and the flame shivers as if it were cold.", c: ["Stand it up and wipe off the sap", "Take the oil it has left", "Leave it and move on"],
      o: ["Your paws get sticky, but the flame grows again. The team loses a little health and gains experience.", "You pocket a little flask of oil worth some Chispas. The dimmed creatures ahead seem angrier.", "You move on. The lantern keeps flickering behind you."] },
    patrol: { t: "Two Lantern wardens block the path. \"Threshold Law: after dusk nobody crosses to the Underside. Where are you going?\"", c: ["Tell them you're going to the Great Lantern", "Sneak through the grass", "Offer them 8 Chispas to pass"],
      o: ["They look you up and down and let you through. One whispers: \"If you get there, tell it not all of us are afraid of it.\"", "", "They pocket the Chispas without looking at you and step aside."] },
    tila: { t: "At a bend in the path, Tila from the Dim Quarter is refilling lanterns from an almost empty oil can. \"Got anything to spare? My street won't have light tonight.\"", c: ["Give her 10 Chispas", "Ask her why her quarter is dark", "Keep walking"],
      o: ["Tila smiles and shares a warm herbal drink with you. The team recovers health.", "\"Because light costs, and not everyone gets it for free.\" It stays with you. You gain experience.", "Tila says nothing. She keeps refilling lanterns."] },
    well: { t: "Among the roots of an oak there's a small well glowing from inside, as if someone had dropped a piece of sunrise.", c: ["Drink a sip", "Peer down to the bottom", "Fill a flask"],
      o: ["The water tastes like a summer morning. The team recovers a lot of health.", "Down, far down, the light turns black and moves on its own. Better not to look any longer. You gain experience.", "The flask glows in your bag. There's something card-shaped inside."] },
  },
};
const sneakTx = { es: ["Te cuelas sin que te vean. Al otro lado encuentras algo que se les cayó.", "Te pillan. «¡Alto ahí!» Los guardas llaman a unas criaturas apagadas…"], en: ["You slip past unseen. On the other side you find something they dropped.", "They spot you. \"Halt!\" The wardens call in some dimmed creatures…"] };
function eventHtml() {
  const E = EVT[L()][X.event];
  if (X.eventOut == null) {
    return `<div class="panel"><div class="sub">${esc(tx("node.event"))}</div><p class="evt-text">${esc(E.t)}</p><div class="choices">${E.c.map((c, i) => {
      const poor = (X.event === "patrol" && i === 2 && EV.P.coins < 8) || (X.event === "tila" && i === 0 && EV.P.coins < 10);
      return `<button class="btn ghost" type="button" data-ev="${i}" ${poor ? "disabled" : ""}>${esc(c)}</button>`;
    }).join("")}</div></div><div class="panel"><h3>${esc(tx("exp.party"))}</h3>${partyHtml()}</div>`;
  }
  return `<div class="panel"><div class="sub">${esc(tx("node.event"))}</div><p class="evt-text">${esc(X.eventOut)}</p><div class="bctl"><button class="btn" type="button" data-x="${X.eventFight ? "evfight" : "evnext"}">${esc(tx("r.continue"))}</button></div></div><div class="panel"><h3>${esc(tx("exp.party"))}</h3>${partyHtml()}${lootHtml()}</div>`;
}
const healParty = (f) => { for (const m of X.party) if (m.hp > 0) m.hp = Math.min(1, m.hp + f); };
function chooseEvent(i) {
  const E = EVT[L()][X.event];
  X.eventFight = false; X.eventCard = null;
  let out = E.o[i];
  switch (X.event) {
    case "farol":
      if (i === 0) { for (const m of X.party) if (m.hp > 0) m.hp = Math.max(0.05, m.hp - 0.1); X.loot.xp += 15; }
      if (i === 1) { X.loot.coins += 12; X.nextFoeBuff = 15; }
      break;
    case "patrol":
      if (i === 0) X.loot.xp += 8;
      if (i === 1) { if (rnd() < 0.5) { out = sneakTx[L()][0]; X.eventCard = true; } else { out = sneakTx[L()][1]; X.eventFight = true; } }
      if (i === 2) { EV.spendCoins(8); X.loot.xp += 4; }
      break;
    case "tila":
      if (i === 0) { EV.spendCoins(10); healParty(0.4); X.loot.xp += 10; }
      if (i === 1) X.loot.xp += 12;
      break;
    case "well":
      if (i === 0) healParty(0.5);
      if (i === 1) X.loot.xp += 14;
      if (i === 2) X.eventCard = true;
      break;
  }
  X.eventOut = out;
  EV.sfx("tap");
  render();
}

/* ---------- Ending the trip ---------- */
function finish(res) {
  const S = EV.S, P = EV.P;
  const R = rpgState();
  const l = X.loot;
  const xp = res === "win" ? l.xp : Math.floor(l.xp / 2);
  const coins = res === "win" ? l.coins : Math.floor(l.coins / 2);
  const before = R ? R.lvl : 1;
  const unlocked = [];
  if (R) {
    R.xp += xp;
    while (R.xp >= xpNeed(R.lvl)) { R.xp -= xpNeed(R.lvl); R.lvl++; for (const k of ["p", "s"]) if (SLOT_LVL[k] === R.lvl) unlocked.push(k); }
  }
  if (coins > 0) EV.addCoins(coins, true);
  if (res === "win") P.c.guard = (P.c.guard || 0) + 1;
  if (S && S.phase === "alive") {
    S.stats.fun = Math.min(100, S.stats.fun + 10); S.stats.full = Math.max(0, S.stats.full - 15); S.stats.clean = Math.max(0, S.stats.clean - 20);
    // wounds: the more health the creature lost on the trip, the more energy and health it loses at home
    const w = woundsOf();
    const dEnergy = Math.round(30 * w), dHealth = Math.round(35 * w) + 5 * (X.ownFalls || 0);
    S.stats.energy = Math.max(0, S.stats.energy - dEnergy);
    S.stats.health = Math.max(10, S.stats.health - dHealth); // never so low that it wanders off
    X.hurt = { energy: dEnergy, health: dHealth };
    EV.addLog(tx(res === "win" ? "log.expWin" : "log.expLose", { name: S.name }));
  }
  // a card for every two levels gained
  let lvlPick = null;
  if (R) for (let lv = before + 1; lv <= R.lvl; lv++) if (lv % 2 === 0) { lvlPick = offerCards(3, 0); break; }
  X.end = { res, xp, coins, before, after: R ? R.lvl : 1, unlocked, lvlPick, cards: l.cards.slice() };
  EV.save(); EV.checkAch();
  show("end");
}
function woundsOf() {
  const own = X && X.party && X.party.find((m) => m.own);
  return own ? Math.max(0, Math.min(1, 1 - own.hp)) : 0;
}
function endHtml() {
  const e = X.end, S = EV.S;
  const nm = S && S.name ? S.name : "";
  const title = e.res === "win" ? tx("end.win") : e.res === "quit" ? tx("end.quit") : tx("end.lose");
  const text = e.res === "win" ? tx("end.winText", { name: nm }) : tx("end.loseText", { name: nm });
  let html = `<div class="panel"><h3>${esc(title)}</h3><p class="evt-text">${esc(text)}</p>
    <div class="loot"><span>${esc(tx("r.xp", { n: e.xp }))}</span><span>✦ ${esc(tx("r.coins", { n: e.coins }))}</span><span>🃏 ${e.cards.length}</span></div>`;
  if (X.hurt && (X.hurt.energy || X.hurt.health)) html += `<p class="evt-out">${esc(tx("end.hurt", { name: nm, e: X.hurt.energy, h: X.hurt.health }))}</p>`;
  else html += `<p class="evt-out">${esc(tx("end.unhurt", { name: nm }))}</p>`;
  if (e.after > e.before) html += `<p class="evt-out">${esc(tx("end.lvl", { name: nm, n: e.after }))}</p>`;
  for (const k of e.unlocked) html += `<p class="evt-out">${esc(tx("end.slot", { slot: tx("slot." + k) }))}</p>`;
  if (e.cards.length) html += `<div class="rcards">${e.cards.map((c) => cardHtml(c.id, c.g)).join("")}</div>`;
  if (e.lvlPick) {
    html += `<h3>${esc(tx("end.lvlPick"))}</h3><div class="rcards">${e.lvlPick.map((o, i) => cardHtml(o.id, o.g, { foot: `<div class="rc-btns"><button class="btn" type="button" data-lvlpick="${i}">${esc(tx("r.pick"))}</button></div>` })).join("")}</div>`;
  } else html += `<div class="bctl"><button class="btn" type="button" data-x="home">${esc(tx("end.home"))}</button></div>`;
  return html + "</div>";
}
function goHome() {
  if (battle) { cancelAnimationFrame(battle.raf); battle = null; }
  X = null; view = null;
  EV.showScreen(); EV.renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Event wiring ---------- */
function onExpClick(e) {
  const t = e.target.closest("button"); if (!t || !X) return;
  const d = t.dataset;
  if (d.pick) {
    const k = d.pick, i = X.chosen.indexOf(k);
    if (i >= 0) X.chosen.splice(i, 1); else { if (X.chosen.length >= 2) X.chosen.shift(); X.chosen.push(k); }
    EV.sfx("tap"); render(); return;
  }
  if (d.node) {
    EV.sfx("tap");
    const n = d.node;
    if (n === "fight") startBattle(false);
    else if (n === "boss") startBattle(true);
    else if (n === "rest") { healParty(0.35); for (const m of X.party) if (m.hp <= 0) m.hp = 0.2; EV.sfx("heal"); X.reward = { title: tx("node.rest"), text: tx("node.rest.d"), after: "next" }; show("reward"); }
    else if (n === "chest") { X.reward = { title: tx("node.chest"), offer: offerCards(3, 0), after: "next" }; show("reward"); }
    else if (n === "event") { X.event = rollEvent(); X.eventOut = null; show("event"); }
    return;
  }
  if (d.ev != null) { chooseEvent(+d.ev); return; }
  if (d.take != null) {
    const i = +d.take, r = X.reward;
    if (i >= 0 && r && r.offer) { const o = r.offer[i]; giveCard(o.id, o.g); X.loot.cards.push(o); EV.toast(tx("r.card", { card: cardName(o.id) }), GRADES[o.g][L()]); EV.sfx("card"); EV.save(); EV.checkAch(); }
    afterReward(); return;
  }
  if (d.lvlpick != null) { const o = X.end.lvlPick[+d.lvlpick]; giveCard(o.id, o.g); X.end.cards.push(o); X.end.lvlPick = null; EV.toast(tx("r.card", { card: cardName(o.id) }), GRADES[o.g][L()]); EV.sfx("card"); EV.save(); EV.checkAch(); render(); return; }
  if (d.b) { if (battle && battle.waiting) { const w = battle.waiting; battle.waiting = null; renderTurn(); EV.sfx("tap"); w.resolve(d.b === "card"); } return; }
  if (d.m) { EV.P.rpgMode = d.m; EV.saveProfile(); t.parentNode.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === t))); if (d.m === "auto" && battle && battle.waiting) { const w = battle.waiting; battle.waiting = null; renderTurn(); w.resolve(battle.b.wantPlay(w.u)); } return; }
  if (d.s) { EV.P.rpgSpeed = +d.s; EV.saveProfile(); t.parentNode.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === t))); return; }
  switch (d.x) {
    case "go": EV.sfx("tap"); setOut(); break;
    case "cancel": X = null; goHome(); break;
    case "quit": finish("quit"); break;
    case "continue": afterReward(); break;
    case "evnext":
      if (X.eventCard) { X.eventCard = null; X.reward = { title: tx("node.chest"), offer: offerCards(3, 0), after: "next" }; show("reward"); }
      else nextSection();
      break;
    case "evfight": X.eventFight = false; startBattle(false); break;
    case "home": goHome(); break;
  }
}

/* ====================================================================== */
/* Cards panel                                                            */
/* ====================================================================== */
function renderCards() {
  const el = $("cardsPanel"); if (!el) return;
  const R = rpgState(), P = EV.P, S = EV.S;
  let html = `<div class="panel-head"><h2>${esc(tx("cards.title"))}</h2><span class="progress">${esc(tx("cards.owned", { n: P.cards.length }))}</span></div><p class="muted" style="margin:0">${esc(tx("cards.desc"))}</p>`;
  if (R) {
    const u = makeUnit(ownUnitOpts(1));
    const need = xpNeed(R.lvl);
    html += `<div class="slotbox" style="border-style:solid"><div class="panel-head"><strong style="font-family:var(--font-display);font-size:18px">${esc(S.name)} · ${esc(tx("cards.lvl", { n: R.lvl }))}</strong><span>${u.types.map(typeChip).join(" ")}</span></div>
      <div class="bar xpbar"><i style="width:${Math.round(100 * R.xp / need)}%"></i></div><p class="rstats">${esc(tx("cards.xp", { x: R.xp, y: need }))} · ${esc(tx("cards.stats", { hp: u.maxHp, str: Math.round(u.base.str), def: Math.round(u.base.def), spd: Math.round(u.base.spd), cr: Math.round(u.crit) }))}</p></div>`;
    html += `<div class="slots">${["a", "p", "s"].map((k) => {
      const locked = R.lvl < SLOT_LVL[k];
      const c = R.eq[k] && cardByUid(R.eq[k]);
      return `<div class="slotbox"><p class="sub">${esc(tx("slot." + k))}${locked ? " · 🔒 " + esc(tx("slot.lock", { n: SLOT_LVL[k] })) : ""}</p>${c ? cardHtml(c.id, c.g, { slot: k, foot: `<div class="rc-btns"><button class="btn ghost" type="button" data-unequip="${k}">${esc(tx("cards.unequip"))}</button></div>` }) : `<p class="muted">${esc(tx("cards.empty"))}</p>`}</div>`;
    }).join("")}</div>`;
  } else html += `<p class="muted">${esc(tx("cards.noCreature"))}</p>`;
  // collection grouped by id+grade
  const groups = {};
  for (const c of P.cards) { const k = c.id + ":" + c.g; (groups[k] = groups[k] || []).push(c); }
  const keys = Object.keys(groups).sort((a, b) => { const [ia, ga] = a.split(":"), [ib, gb] = b.split(":"); return gb - ga || cardName(ia).localeCompare(cardName(ib)); });
  const eqSet = R ? new Set(Object.values(R.eq).filter(Boolean)) : new Set();
  html += `<div class="rcards">${keys.map((k) => {
    const list = groups[k], c0 = list[0];
    const free = list.filter((c) => !eqSet.has(c.uid));
    const btns = [];
    if (R && free.length) for (const s of ["a", "p", "s"]) btns.push(`<button class="btn ghost" type="button" data-equip="${free[0].uid}" data-slot="${s}" ${R.lvl < SLOT_LVL[s] ? "disabled" : ""}>${esc(tx("slot." + s))}</button>`);
    if (free.length < list.length && !free.length) btns.push(`<span class="progress">${esc(tx("cards.inUse"))}</span>`);
    if (free.length >= 3 && c0.g < GRADES.length - 1) btns.push(`<button class="btn" type="button" data-fuse="${k}">${esc(tx("cards.fuse", { g: GRADES[c0.g + 1][L()] }))}</button>`);
    return cardHtml(c0.id, c0.g, { count: list.length, foot: btns.length ? `<div class="rc-btns">${btns.join("")}</div>` : "" });
  }).join("")}</div>`;
  el.innerHTML = html;
}
function onCardsClick(e) {
  const t = e.target.closest("button"); if (!t) return;
  const R = rpgState(); const P = EV.P;
  if (t.dataset.equip && R) {
    const uid = t.dataset.equip, slot = t.dataset.slot;
    const c = cardByUid(uid);
    // no duplicate card on one creature: remove the same card id from other slots
    for (const k of ["a", "p", "s"]) { const o = R.eq[k] && cardByUid(R.eq[k]); if (o && (o.uid === uid || o.id === c.id)) R.eq[k] = null; }
    R.eq[slot] = uid; EV.sfx("card"); EV.save(); renderCards(); return;
  }
  if (t.dataset.unequip && R) { R.eq[t.dataset.unequip] = null; EV.sfx("tap"); EV.save(); renderCards(); return; }
  if (t.dataset.fuse) {
    const [id, g] = t.dataset.fuse.split(":"); const gi = +g;
    const eqSet = R ? new Set(Object.values(R.eq).filter(Boolean)) : new Set();
    const free = P.cards.filter((c) => c.id === id && c.g === gi && !eqSet.has(c.uid)).slice(0, 3);
    if (free.length < 3) return;
    P.cards = P.cards.filter((c) => !free.includes(c));
    giveCard(id, gi + 1); P.c.fused = (P.c.fused || 0) + 1;
    EV.toast(tx("cards.fused", { card: cardName(id), g: GRADES[gi + 1][L()] })); EV.sfx("grow"); EV.save(); EV.checkAch(); renderCards();
  }
}

/* ====================================================================== */
/* Hooks into the main game                                               */
/* ====================================================================== */
function refreshHome() {
  const S = EV.S, btn = $("aExp"), chip = $("btnCards");
  const alive = S && S.phase === "alive";
  chip.hidden = !(alive && S.stage >= 1) && !(EV.P.cards && EV.P.cards.length);
  if (!alive) { btn.hidden = true; return; }
  btn.hidden = false;
  const why = expCheck();
  btn.textContent = tx("act.exp") + (why ? "" : " · " + tx("exp.cost"));
  btn.disabled = !!why;
  btn.title = why ? tx("exp.need." + why) : "";
  let w = $("aExpWhy");
  if (!w) { w = document.createElement("p"); w.id = "aExpWhy"; w.className = "exp-why"; btn.after(w); }
  w.textContent = why ? tx("exp.need." + why) : "";
  let r = $("aRecharge");
  if (!r) { r = document.createElement("button"); r.id = "aRecharge"; r.type = "button"; r.className = "btn ghost exp-go"; w.after(r); r.addEventListener("click", recharge); }
  r.textContent = tx("recharge", { n: RECHARGE.amount, c: RECHARGE.price });
  r.hidden = S.stats.energy >= 70;
  r.disabled = EV.P.coins < RECHARGE.price;
}
// pay Chispas for an energy boost (energy otherwise only refills slowly while sleeping)
const RECHARGE = { amount: 40, price: 12 };
function recharge() {
  const S = EV.S; if (!S || S.phase !== "alive") return;
  if (S.stats.energy >= 90) { EV.toast(tx("recharge.full")); return; }
  if (!EV.spendCoins(RECHARGE.price)) { EV.toast(EV.t("toast.poor")); EV.sfx("deny"); return; }
  S.stats.energy = Math.min(100, S.stats.energy + RECHARGE.amount);
  EV.sfx("heal"); EV.buzz(20); EV.toast(tx("recharge.done"), "+" + RECHARGE.amount);
  EV.save(); EV.renderStats(); refreshHome();
}
EV.HOOKS.showScreen = function () {
  const S = EV.S;
  const inExp = !!X && S && S.phase === "alive";
  if (X && (!S || S.phase !== "alive")) { if (battle) { cancelAnimationFrame(battle.raf); battle = null; } X = null; }
  $("scrExp").hidden = !inExp;
  if (inExp) { $("scrGame").hidden = true; render(); }
  refreshHome();
  if (!$("cardsPanel").hidden) renderCards();
};
EV.HOOKS.renderCards = renderCards;
$("aExp").addEventListener("click", () => { EV.sfx("tap"); startExpedition(); EV.showScreen(); });
$("btnCards").addEventListener("click", () => { EV.sfx("tap"); EV.togglePanel("cards"); });
$("scrExp").addEventListener("click", onExpClick);
$("scrExp").addEventListener("change", (e) => { const s = e.target.closest("select[data-load]"); if (s && X && view === "pick") setLoad(s.dataset.load, s.value); });
$("cardsPanel").addEventListener("click", onCardsClick);
setInterval(refreshHome, 1000);
rpgState(); EV.showScreen();
EV.RPG = Object.defineProperties(Object.assign(api, { renderCards, startExpedition }), { X: { get: () => X }, battle: { get: () => battle } });
})(typeof window !== "undefined" ? window : null);
