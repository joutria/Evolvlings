/* Evolvlings RPG: types, grades, statuses and the skill cards. Pure data, also loaded by tools/check.js in Node.
   Part of the old rpg.js, now split. Classic scripts: top-level names are shared between the rpg/*.js files,
   which load in order (see index.html). */
"use strict";

/* ====================================================================== */
/* Types of the Glade: 12 in 4 circles of 3, plus Star (cards only)       */
/* ====================================================================== */
/* The one table for types: icon, circle (in order: each type beats the next one in its circle), day or night,
   card colour (col), opposite type (opp) and names. Everything else (BEATS, OPPOSITE, CIRCLE, TCOL, the Grimoire
   order) is derived from it, so a new type only needs a row here. */
const TYPES = {
  fire:   { icon: "🔥", circle: "sol",   day: true,  col: "#d9542c", opp: "water",  es: "Fuego",  en: "Fire" },
  plant:  { icon: "🌿", circle: "sol",   day: true,  col: "#4f9a3c", opp: "mush",   es: "Planta", en: "Plant" },
  light:  { icon: "☀️", circle: "sol",   day: true,  col: "#e2ae2e", opp: "shadow", es: "Luz",    en: "Light" },
  bolt:   { icon: "⚡", circle: "sky",   day: true,  col: "#d8b81c", opp: "ice",    es: "Rayo",   en: "Bolt" },
  air:    { icon: "🌬️", circle: "sky",   day: true,  col: "#6fb8d0", opp: "stone",  es: "Aire",   en: "Air" },
  music:  { icon: "🎵", circle: "sky",   day: true,  col: "#cf5f9f", opp: "dream",  es: "Música", en: "Music" },
  water:  { icon: "💧", circle: "lake",  day: false, col: "#3f7fc9", opp: "fire",   es: "Agua",   en: "Water" },
  stone:  { icon: "🪨", circle: "lake",  day: false, col: "#8a7a64", opp: "air",    es: "Piedra", en: "Stone" },
  shadow: { icon: "🌙", circle: "lake",  day: false, col: "#5b4b8e", opp: "light",  es: "Sombra", en: "Shadow" },
  ice:    { icon: "❄️", circle: "frost", day: false, col: "#8fcbe0", opp: "bolt",   es: "Hielo",  en: "Ice" },
  mush:   { icon: "🍄", circle: "frost", day: false, col: "#b0603c", opp: "plant",  es: "Seta",   en: "Mushroom" },
  dream:  { icon: "💤", circle: "frost", day: false, col: "#8a78d4", opp: "music",  es: "Sueño",  en: "Dream" },
  star:   { icon: "✦",  circle: null,    day: null,  col: "#e0b84a", opp: null,     es: "Estrella", en: "Star" },
};
const TYPE_ORDER = Object.keys(TYPES);
const CIRCLES = [...new Set(TYPE_ORDER.map((t) => TYPES[t].circle).filter(Boolean))]; // sol, sky, lake, frost
const circleTypes = (c) => TYPE_ORDER.filter((t) => TYPES[t].circle === c);
// each type beats the next one in its circle
const BEATS = {};
for (const c of CIRCLES) { const ts = circleTypes(c); ts.forEach((t, i) => { BEATS[t] = ts[(i + 1) % ts.length]; }); }
const OPPOSITE = {};
for (const t of TYPE_ORDER) if (TYPES[t].opp) OPPOSITE[t] = TYPES[t].opp;

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
  { id: "c",  mult: 1.00, dur: 0, cd: 0, trade: 1.0,  w: 80,  es: "Común",      en: "Common",     col: "#6b4a3a" },
  { id: "r",  mult: 1.20, dur: 0, cd: 0, trade: 0.9,  w: 15,  es: "Rara",       en: "Rare",       col: "#a3343b" },
  { id: "vr", mult: 1.40, dur: 1, cd: 1, trade: 0.8,  w: 4,   es: "Súper rara", en: "Super rare", col: "#6e6283" },
  { id: "sr", mult: 1.65, dur: 1, cd: 1, trade: 0.65, w: 0.8, es: "Épica",      en: "Epic",       col: "#2f5d96" },
  { id: "ep", mult: 1.95, dur: 2, cd: 2, trade: 0.5,  w: 0.18,es: "Mítica",     en: "Mythic",     col: "#c25e9a" },
  { id: "lg", mult: 2.30, dur: 2, cd: 2, trade: 0.4,  w: 0.02,es: "Legendaria", en: "Legendary",  col: "#e0603f" },
];
/* Rarity is read from the frame's material (Visual language of the Glade, section 7):
   wood, copper, silver, lake glass, nacre, root-light. Colours are Glimmer-32. */
const GRADE_VIS = [
  { mat: ["#6b4a3a", "#a07a55"], anim: null },    // Común: madera del Bosque Hondo
  { mat: ["#a3343b", "#f39a52"], anim: null },    // Rara: cobre del Gremio
  { mat: ["#9d93ad", "#fbf6ef"], anim: null },    // Súper rara: plata de Los Altos
  { mat: ["#3f93c4", "#c8eef5"], anim: "shine" }, // Épica: cristal del Lago Espejo
  { mat: ["#f4a6c4", "#c7a6ff"], anim: "irid" },  // Mítica: nácar del Fondo Blanco
  { mat: ["#ffd57a", "#fff0b8"], anim: "pulse" }, // Legendaria: luz de raíz
];
// The Black Sap keeps its own colours, outside Glimmer-32 on purpose; nothing else uses them
const SAP = { c0: "#0e0814", c1: "#241030", c2: "#3b1d4a", sheen: "#7dffb0" };
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
  hidden:  { neg: false, icon: "🌫️", v: 0,  es: "Escondido", en: "Hidden" },
  charge:  { neg: false, icon: "⚡", v: 80, es: "Carga",     en: "Charged" },
  taunt:   { neg: false, icon: "🛡️", v: 0,  es: "Desafío",   en: "Taunting" },
  evade:   { neg: false, icon: "💨", v: 10, es: "Esquivo",   en: "Evasive" },
  exposed: { neg: true,  icon: "🎯", v: 0,  es: "Expuesto",  en: "Exposed" },
  marked:  { neg: true,  icon: "📣", v: 20, es: "Señalado",  en: "Marked" },
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
  // Mecha
  street:   { type: "light", by: "mecha", p: { teamBlindShort: 1 }, a: { cd: 4, tgt: "foe", pow: 130, trueHit: 1 }, s: { on: "start", fx: { tgt: "self", noClockFoes: 1 } } },
  oil:      { type: "light", by: "mecha", pact: true, p: { dmg: 15, bleed: -2 }, a: { cd: 4, tgt: "lowOther", selfCost: -20, heal: 30 }, s: { on: "allyLow", pct: 20, fx: { tgt: "theAlly", give: 20 } } },
  ration:   { type: "light", by: "mecha", p: { healGive: 20, healRecv: -20 }, a: { cd: 4, tgt: "allies", heal: 10 }, s: { on: "every", n: 3, fx: { tgt: "lowAlly", heal: 8 } } },
  // Yunquerón
  temper:   { type: "fire", by: "yunqueron", p: { rage: 4 }, a: { cd: 5, tgt: "foe", pow: 170, st: ["slow", 1, 1] }, s: { on: "allyCrit", fx: { tgt: "theAlly", shield: [20, 2] } } },
  anvil:    { type: "fire", by: "yunqueron", p: { def: 15, spd: -10, onHitBy: ["burn", 2, 0.15] }, a: { cd: 4, tgt: "self", shield: [25, 2] }, s: { on: "start", fx: { tgt: "lowDefAlly", shield: [15, 2] } } },
  furnace:  { type: "fire", by: "yunqueron", p: { immune: "soak", weakWater: -10 }, a: { cd: 5, tgt: "foes", st: ["burn", 2, 1] }, s: { on: "allyKO", type: "fire", fx: { tgt: "allies", st: ["fury", 2, 1, 15] } } },
  // Espinardo
  inward:   { type: "plant", by: "espinardo", pact: true, p: { lifesteal: 10, healRecv: -30 }, a: { cd: 5, tgt: "foe", pow: 200, drain: 50, selfMaxDown: -10 }, s: { on: "foeKO", fx: { tgt: "lowAlly", heal: 10 } } },
  outward:  { type: "plant", by: "espinardo", p: { thorns: 15 }, a: { cd: 5, tgt: "allies", shield: [20, 2] }, s: { on: "allyBigHit", fx: { tgt: "attacker", st: ["trap", 1, 1] } } },
  hedge:    { type: "plant", by: "espinardo", p: { defNight: 20, defDay: -10 }, a: { cd: 5, tgt: "fastestFoe", st: ["trap", 1, 1] }, s: { on: "start", fx: { tgt: "foes", st: ["slow", 2, 1, 15] } } },
  // La Forja Despierta (guardian only)
  breath:   { type: "fire", by: "forja", boss: true, p: { immune: "soak" }, a: { cd: 4, tgt: "foes", pow: 90, st: ["burn", 2, 0.5] }, s: { on: "allyLow", pct: 50, fx: { tgt: "self", st: ["fury", 99, 1, 20] } } },
  blow:     { type: "fire", by: "forja", boss: true, p: { dmg: 10, def: 10 }, a: { cd: 3, tgt: "foe", pow: 130, st: ["burn", 2, 1] }, s: { on: "start", fx: { tgt: "foes", st: ["burn", 1, 1] } } },
  core:     { type: "fire", by: "forja", boss: true, p: { def: 15 }, a: { cd: 4, tgt: "self", shield: [15, 2] }, s: { on: "every", n: 3, fx: { tgt: "self", shield: [12, 2] } } },
  // El Seto Hambriento (guardian only)
  vine:     { type: "plant", by: "seto", boss: true, p: { thorns: 10 }, a: { cd: 4, tgt: "fastestFoe", pow: 80, st: ["trap", 1, 1] }, s: { on: "allyBigHit", fx: { tgt: "attacker", st: ["trap", 1, 1] } } },
  thorn:    { type: "plant", by: "seto", boss: true, p: { thorns: 15 }, a: { cd: 3, tgt: "foes", pow: 60, st: ["slow", 1, 1] }, s: { on: "start", fx: { tgt: "foes", st: ["slow", 2, 1, 15] } } },
  root:     { type: "plant", by: "seto", boss: true, p: { lifesteal: 10 }, a: { cd: 4, tgt: "self", heal: 15 }, s: { on: "start", fx: { tgt: "self", st: ["regen", 99, 1, 3] } } },
  // Nim
  night:    { type: "shadow", by: "nim", p: { nightAll: 10 }, a: { cd: 4, tgt: "self", st: ["hidden", 1, 1], selfSt: ["charge", 3, 1, 80] }, s: { on: "start", fx: { tgt: "allies", nightOnly: 1, st: ["evade", 2, 1, 10] } } },
  nohide:   { type: "shadow", by: "nim", p: { shade: 15 }, a: { cd: 3, tgt: "foe", pow: 140, selfSt: ["exposed", 1, 1] }, s: { on: "allyLow", pct: 30, fx: { tgt: "self", st: ["taunt", 1, 1] } } },
  truename: { type: "shadow", by: "nim", p: { immune: "blind" }, a: { cd: 4, tgt: "foe", st: ["blind", 2, 1], st2: ["slow", 1, 1] }, s: { on: "allyStatus", status: "blind", fx: { tgt: "theAlly", cleanse: "blind" } } },
  // Centinela de Bruma
  lance:    { type: "shadow", by: "centinela", p: { vsBlind: 10 }, a: { cd: 4, tgt: "foe", pow: 160, pierce: 1 }, s: { on: "foeShield" } },
  oath:     { type: "shadow", by: "centinela", pact: true, p: { oath: 25 }, a: { cd: 5, tgt: "self", st: ["taunt", 2, 1], selfSt: ["guard", 2, 1, 30] }, s: { on: "allyKO", fx: { tgt: "self", st: ["fury", 99, 1, 30] } } },
  veil:     { type: "shadow", by: "centinela", p: { def: 15 }, a: { cd: 4, tgt: "lowOther", st: ["hidden", 1, 1] }, s: { on: "allyBigHit", fx: { tgt: "self", st: ["taunt", 2, 1] } } },
  // Vidriela
  lostwave: { type: "water", by: "vidriela", p: { perFallen: 10 }, a: { cd: 4, tgt: "foe", pow: 120, splash: 40 }, s: { on: "allyKO", fx: { tgt: "allies", heal: 20 } } },
  truewater:{ type: "water", by: "vidriela", p: { immune: "blind", sight: 10 }, a: { cd: 4, tgt: "strongFoe", copyBuff: 1 }, s: { on: "allyStatus", status: "blind", fx: { tgt: "theAlly", cleanse: "blind" } } },
  reading:  { type: "water", by: "vidriela", p: { dodge: 8 }, a: { cd: 4, tgt: "self", foresight: 1 }, s: { on: "start", fx: { tgt: "allies", st: ["guard", 1, 1, 15] } } },
  // Ecolito
  echo:     { type: "stone", by: "ecolito", p: { echo: 15 }, a: { cd: 4, tgt: "self", echoLast: 60 }, s: { on: "start", fx: { tgt: "self", cdDown: 1 } } },
  miner:    { type: "stone", by: "ecolito", p: { desperate: 20 }, a: { cd: 5, tgt: "foes", pow: 90, st: ["slow", 1, 1] }, s: { on: "win", revive: 10 } },
  rockname: { type: "stone", by: "ecolito", p: { stoneDef: 10 }, a: { cd: 5, tgt: "foe", st: ["stun", 1, 1], selfSt: ["slow", 2, 1] }, s: { on: "allyKO", fx: { tgt: "fallenAlly", ifAbove: 50, revive: 15 } } },
  // El Trono Vacío (guardian only)
  court:    { type: "shadow", by: "trono", boss: true, p: { dodge: 12 }, a: { cd: 4, tgt: "foes", pow: 85, st: ["blind", 1, 0.6] }, s: { on: "every", n: 3, fx: { tgt: "self", st: ["hidden", 1, 1] } } },
  crown:    { type: "shadow", by: "trono", boss: true, p: { nightAll: 15 }, a: { cd: 3, tgt: "foe", pow: 130, pierce: 1 }, s: { on: "allyLow", pct: 50, fx: { tgt: "self", st: ["charge", 3, 1, 60] } } },
  // La Que Mira desde Abajo (guardian only)
  mirror:   { type: "water", by: "mira", boss: true, p: { resistAdv: 20 }, a: { cd: 4, tgt: "foes", pow: 90, st: ["soak", 2, 1] }, s: { on: "allyLow", pct: 50, fx: { tgt: "self", heal: 20 } } },
  gaze:     { type: "water", by: "mira", boss: true, p: { sight: 15 }, a: { cd: 3, tgt: "strongFoe", pow: 110, st: ["dull", 2, 1, 10] }, s: { on: "start", fx: { tgt: "foes", st: ["dull", 2, 1, 10] } } },
  // Grava (guardian only)
  cavein:   { type: "stone", by: "grava", boss: true, p: { def: 15, thorns: 5 }, a: { cd: 4, tgt: "foes", pow: 90, st: ["slow", 1, 1] }, s: { on: "every", n: 3, fx: { tgt: "self", shield: [15, 2] } } },
  song:     { type: "stone", by: "grava", boss: true, p: { echo: 20 }, a: { cd: 3, tgt: "foe", pow: 120, st: ["stun", 1, 0.3] }, s: { on: "allyLow", pct: 40, fx: { tgt: "self", heal: 15 } } },
  // El Gran Farol (guardian only, never drops)
  // Relampín (Los Altos)
  errand:   { type: "bolt", by: "relampin", p: { spd: 12 }, a: { cd: 3, tgt: "foe", pow: 130, selfSt: ["haste", 1, 1, 30] }, s: { on: "start", fx: { tgt: "slowAlly", st: ["haste", 1, 1, 40] } } },
  static:   { type: "bolt", by: "relampin", p: { onHit: ["stun", 1, 0.1], def: -10 }, a: { cd: 5, tgt: "allyOther", st: ["charge", 2, 1, 30] }, s: { on: "allyStatus", status: "stun", fx: { tgt: "randFoe", pow: 60 } } },
  news:     { type: "bolt", by: "relampin", p: { dodge: 10 }, a: { cd: 4, tgt: "foe", st: ["marked", 2, 1, 20] }, s: { on: "start", fx: { tgt: "allies", st: ["evade", 1, 1, 10] } } },
  // Trinilla (Los Altos)
  highnote: { type: "music", by: "trinilla", p: { vsHeld: 20 }, a: { cd: 4, tgt: "foe", pow: 110, st: ["stun", 1, 1] }, s: { on: "every", n: 4, fx: { tgt: "self", cdDown: 1 } } },
  deal:     { type: "music", by: "trinilla", p: { teamCrit: 8, frail: -10 }, a: { cd: 3, tgt: "foe", pow: 60, strip: 1 }, s: { on: "every", n: 3, fx: { tgt: "allies", heal: 5 } } },
  chorus:   { type: "music", by: "trinilla", p: { buffLong: 1 }, a: { cd: 4, tgt: "allies", st: ["fury", 3, 1, 10] }, s: { on: "every", n: 3, fx: { tgt: "allies", st: ["fury", 1, 1, 10] } } },
  // Carámbano (Fondo Blanco)
  frostslow:{ type: "ice", by: "carambano", p: { onHit: ["slow", 2, 0.15] }, a: { cd: 3, tgt: "foe", pow: 110, st: ["slow", 2, 1] }, s: { on: "start", fx: { tgt: "fastestFoe", st: ["slow", 1, 1] } } },
  tombquiet:{ type: "ice", by: "carambano", p: { def: 12, spd: -30 }, a: { cd: 4, tgt: "self", shield: [25, 2] }, s: { on: "allyStatus", status: "stun", fx: { tgt: "theAlly", cleanse: "stun" } } },
  vigil:    { type: "ice", by: "carambano", p: { immune: "stun" }, a: { cd: 4, tgt: "ally", st: ["regen", 3, 1, 6] }, s: { on: "every", n: 3, fx: { tgt: "lowAlly", shield: [10, 2] } } },
  // Capuchón (Fondo Blanco)
  harvest:  { type: "mush", by: "capuchon", pact: true, p: { hp: -15, perFoeFallen: 8 }, a: { cd: 5, tgt: "foe", pow: 180, teamDrain: 50, selfCost: -10 }, s: { on: "allyKO", fx: { tgt: "lowAlly", heal: 20 } } },
  stillgrow:{ type: "mush", by: "capuchon", p: { vsHeld: 20 }, a: { cd: 4, tgt: "foes", st: ["slow", 2, 1] }, s: { on: "every", n: 3, fx: { tgt: "foes", st: ["slow", 1, 1] } } },
  saprem:   { type: "mush", by: "capuchon", p: { healGive: 15, healRecv: -10 }, a: { cd: 5, tgt: "ally", heal: 25, cleanse: "all" }, s: { on: "allyStatus", status: "burn", fx: { tgt: "theAlly", cleanse: "longest" } } },
  // Guardatumba (Fondo Blanco)
  regent:   { type: "ice", by: "guardatumba", p: { perDebuff: 10 }, a: { cd: 5, tgt: "foe", pow: 180, st: ["slow", 2, 1] }, s: { on: "foeKO", fx: { tgt: "allies", st: ["fury", 2, 1, 20] } } },
  thousand: { type: "ice", by: "guardatumba", p: { def: 20, immune: "slow", spd: -15 }, a: { cd: 6, tgt: "allies", shield: [30, 2] }, s: { on: "allyLow", pct: 25, fx: { tgt: "theAlly", shield: [30, 2] } } },
  sealed:   { type: "ice", by: "guardatumba", p: { onHitBy: ["slow", 1, 0.2] }, a: { cd: 5, tgt: "foe", pow: 70, cdUp: 2 }, s: { on: "start", fx: { tgt: "foes", cdUp: 1 } } },
  // guardians of Los Altos and the Fondo Blanco
  gale:     { type: "air", by: "veleta", boss: true, p: { spd: 10 }, a: { cd: 4, tgt: "foes", pow: 85, st: ["slow", 1, 0.5] }, s: { on: "start", fx: { tgt: "foes", st: ["dull", 2, 1, 10] } } },
  voices:   { type: "air", by: "veleta", boss: true, p: { teamCrit: 6, dmg: 10 }, a: { cd: 3, tgt: "strongFoe", pow: 110, strip: 1 }, s: { on: "allyLow", pct: 50, fx: { tgt: "self", st: ["fury", 99, 1, 20] } } },
  spin:     { type: "air", by: "veleta", boss: true, p: { dodge: 12 }, a: { cd: 4, tgt: "self", st: ["evade", 2, 1, 20] }, s: { on: "every", n: 3, fx: { tgt: "self", st: ["evade", 1, 1, 15] } } },
  spores:   { type: "mush", by: "micelio", boss: true, p: { vsHeld: 15 }, a: { cd: 4, tgt: "foes", pow: 70, st: ["dull", 2, 1, 10] }, s: { on: "every", n: 3, fx: { tgt: "foes", st: ["slow", 1, 1] } } },
  threads:  { type: "mush", by: "micelio", boss: true, p: { lifesteal: 10 }, a: { cd: 3, tgt: "fastestFoe", pow: 90, st: ["trap", 1, 0.6] }, s: { on: "allyLow", pct: 50, fx: { tgt: "self", heal: 15 } } },
  sapbed:   { type: "mush", by: "micelio", boss: true, p: { def: 10 }, a: { cd: 4, tgt: "self", heal: 15 }, s: { on: "start", fx: { tgt: "self", st: ["regen", 99, 1, 3] } } },
  beam:     { type: "light", by: "farol", boss: true, p: { dmg: 10 }, a: { cd: 4, tgt: "foes", pow: 100, st: ["blind", 1, 1] }, s: { on: "start", fx: { tgt: "foes", st: ["slow", 2, 1, 10] } } },
  pride:    { type: "light", by: "farol", boss: true, p: { dmg: 15 }, a: { cd: 3, tgt: "foe", pow: 130 }, s: { on: "allyLow", pct: 50, fx: { tgt: "self", shield: [20, 2] } } },
  law:      { type: "light", by: "farol", boss: true, p: { spd: 10 }, a: { cd: 4, tgt: "foes", st: ["slow", 2, 1, 10] }, s: { on: "start", fx: { tgt: "foes", st: ["slow", 2, 1, 10] } } },
  // the Aching Root (final guardian, Star) and Unísona (story creature, Star: never from pulls)
  ache:     { type: "star", by: "raiz", boss: true, p: { dmg: 10 }, a: { cd: 4, tgt: "foes", pow: 90, st: ["dull", 2, 1, 10] }, s: { on: "start", fx: { tgt: "foes", st: ["slow", 1, 1, 10] } } },
  eight:    { type: "star", by: "raiz", boss: true, p: { teamCrit: 6, dmg: 10 }, a: { cd: 3, tgt: "strongFoe", pow: 120, strip: 1 }, s: { on: "allyLow", pct: 50, fx: { tgt: "self", st: ["fury", 99, 1, 20] } } },
  rootheart:{ type: "star", by: "raiz", boss: true, p: { def: 15 }, a: { cd: 5, tgt: "self", shield: [30, 2] }, s: { on: "allyLow", pct: 25, fx: { tgt: "theAlly", shield: [30, 2] } } },
  duet:     { type: "star", by: "unisona", story: true, p: { spd: 10 }, a: { cd: 3, tgt: "foe", pow: 120, st: ["blind", 1, 1] }, s: { on: "start", fx: { tgt: "fastestFoe", st: ["blind", 1, 1] } } },
  unison:   { type: "star", by: "unisona", story: true, p: { healGive: 15 }, a: { cd: 4, tgt: "allies", heal: 12 }, s: { on: "allyStatus", status: "blind", fx: { tgt: "theAlly", cleanse: "blind" } } },
  firstnote:{ type: "star", by: "unisona", story: true, p: { teamCrit: 6 }, a: { cd: 4, tgt: "allies", shield: [20, 2] }, s: { on: "allyLow", pct: 40, fx: { tgt: "theAlly", st: ["guard", 2, 1, 20] } } },
};
const DROP_POOL = Object.keys(CARDS).filter((k) => !CARDS[k].boss && !CARDS[k].story);
// Which card types each home creature can use: its own type, two from its circle or close to it,
// and one for coverage. Adults also learn their evolution's type, and a creature can always use its own signature cards.
const COMPAT = {
  lumo: ["light", "fire", "plant", "bolt"],
  fizz: ["air", "bolt", "music", "dream"],
  pebb: ["stone", "water", "shadow", "ice"],
};
function canUse(species, form, id) {
  const c = CARDS[id], list = COMPAT[species];
  if (!c || !list) return true;
  if (c.type === "star") return true; // Star cards fit every creature
  if (c.by === species || list.includes(c.type)) return true;
  const adult = MONS[species] && MONS[species].adult && form && MONS[species].adult[form];
  return adult === c.type;
}
const UPGRADE_N = 5; // 5 cards of one grade make 1 of the next

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
    else if (typeof v === "string") p[k] = v;
    else if (k === "teamBlindShort") p[k] = v + (g.dur > 0 ? 1 : 0);
    else if (k === "stShort" || k === "shieldLong" || k === "buffLong" || k === "critImmune") p[k] = v + (g.dur > 0 && k !== "critImmune" ? g.dur : 0);
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
  if (a.selfCost) a.selfCost = sv(a.selfCost, g);
  if (a.st2) a.st2 = scaleStatus(a.st2, g);
  if (a.splash) a.splash = sv(a.splash, g);
  if (a.teamDrain) a.teamDrain = sv(a.teamDrain, g);
  if (a.echoLast) a.echoLast = sv(a.echoLast, g);
  if (a.selfMaxDown) a.selfMaxDown = sv(a.selfMaxDown, g);
  const s = Object.assign({}, c.s);
  if (s.heal) s.heal = sv(s.heal, g);
  if (s.revive) s.revive = sv(s.revive, g);
  if (s.v) s.v = sv(s.v, g);
  if (s.n && s.on === "allyHitAdv") s.n = s.n + g.dur;
  if (s.n && s.on === "every") s.n = Math.max(2, s.n - g.cd);
  if (s.fx) {
    s.fx = Object.assign({}, s.fx);
    if (s.fx.st) s.fx.st = scaleStatus(s.fx.st, g);
    if (s.fx.shield) s.fx.shield = [sv(s.fx.shield[0], g), s.fx.shield[1] + g.dur];
    if (s.fx.heal) s.fx.heal = sv(s.fx.heal, g);
    if (s.fx.give) s.fx.give = sv(s.fx.give, g);
    if (s.fx.revive) s.fx.revive = sv(s.fx.revive, g);
  }
  return { id, type: c.type, grade: gi || 0, p, a, s };
}
